/**
 * Pipeline Runner — Automated gate-sequence driver for the full TTE analysis pipeline.
 *
 * Executes the 7-gate sequence (ANALYZE → VERIFY_ZONES → PREDICT → SCORE →
 * VALIDATE → EXECUTE → AUDIT) by sending events to the GateEngine, waiting for
 * each gate to complete, then collecting brain snapshots to compile a full
 * TTE v5.3.3 report.
 *
 * This is the "run the whole thing" entry point — exposed to the agent via the
 * `plutus-run-report` MCP tool.
 */

import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import type { BrainMessenger } from '../v1-compat.js';
import type { GateEngine } from '../v1-compat.js';
import type { ReportGenerator, ReportParams, CalendarEvent, OHLCRecord } from '../report/report-generator.js';
import type { EconomicCalendarClient, CalendarEvent as EconomicCalendarEvent } from '../clients/economic-calendar-client.js';
import type { TradingViewClient } from '../clients/tradingview-client.js';
import type { ZoneBrain } from '../brains/zone-brain.js';
import {
  PineScriptGenerator,
  type PineScriptData,
  type PinePairData,
  type PineZone,
  type PineTrade,
} from '../report/pine-script-generator.js';
import { ZoneType } from '../types.js';
import {
  BrainChannel,
  GateState,
  type DXYZone,
  type ShapeChain,
  type ShapePrediction,
  type ShapePredictionSnapshot,
  type TradeSetup,
  type TradeSetupMapSnapshot,
  type ZoneMapSnapshot,
  type OHLCBar,
  type Result,
} from '../types.js';
import { Logger } from '../utils/logger.js';
import { TemporalBoundary, type TemporalResult, type TemporalWindow } from './temporal-boundary.js';
import { contextBloatGuard } from './context-bloat-guard.js';
import { runComplianceSweep } from './compliance-sweep.js';
import {
  GATE_TIMEOUT_TIMEOUT_MS,
  PCT_MULTIPLIER,
  DEFAULT_CONFIDENCE,
  PIPELINE_OHLC_BARS,
  PIPELINE_WEEK_DAYS,
  PIPELINE_ALT_CHAIN_DEFAULT_PCT,
  PIPELINE_ALT_CHAIN_DEFAULT_CONF,
  ISO_TIMESTAMP_SLICE_LENGTH,
  ISO_DATE_SLICE_LENGTH,
  TIME_FORMAT_PAD,
  DEGREE_EXTREME_MIN,
  DEGREE_HEAVY_MIN,
  DEGREE_MODERATE_HEAVY_MIN,
  DEGREE_MODERATE_MIN,
  DEGREE_LIGHT_MIN,
} from '../constants/trading-constants.js';

const log = new Logger('PipelineRunner');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Snapshot bundle collected from all three brains. */
interface CollectedSnapshots {
  spots: Record<string, number>;
  zones: Record<string, DXYZone[]>;
  shapeChain: ShapeChain;
  setups: TradeSetup[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export class PipelineRunner {
  /** FIX-003: Temporal boundary — target week enforcement. */
  private temporalBoundary = new TemporalBoundary();
  /** FIX-003: Stored audit results for compliance sweep. */
  lastTemporalAudit: TemporalResult | null = null;

  constructor(
    private gateEngine: GateEngine,
    private messenger: BrainMessenger,
    private reportGenerator: ReportGenerator,
    private economicCalendar?: EconomicCalendarClient,
    private tvClient?: TradingViewClient,
    private zoneBrain?: ZoneBrain,
  ) {
    log.debug('PipelineRunner initialised');
  }

  /**
   * Execute the full TTE analysis pipeline and generate the weekly report.
   *
   * Sequence:
   *   1. ANALYZE      — Collect OHLC, compute zones
   *   2. VERIFY_ZONES — Validate zone structure
   *   3. PREDICT      — Shape chain from zones
   *   4. SCORE        — Trade setups from zones + shapes
   *   5. VALIDATE     — Firewall evaluation
   *   6. AUDIT        — Compliance sweep + Merkle chain
   *   7. Generate report → save to outputDir
   *   8. Return report path
   *
   * Note: EXECUTE gate is intentionally skipped — report generation is
   * read-only and does not place trades.
   */
  async runWeeklyReport(outputDir: string = 'reports'): Promise<Result<string>> {
    log.info('Starting full TTE pipeline run...');

    // FIX-020: Context bloat guard — check before generating report
    const bloatWarning = contextBloatGuard.beforeReport();
    if (bloatWarning.shouldRereadSpec) {
      log.warn(`[ContextBloatGuard] ${bloatWarning.message}`);
    }

    // ── Step 1: ANALYZE ──
    log.info('Gate 1/6: ANALYZE — collecting OHLC, computing zones');
    if (!await this.runGate(GateState.ANALYZE, 'DXY_READY')) {
      return { success: false, error: 'Pipeline failed at ANALYZE gate' };
    }

    // ── Step 2: VERIFY_ZONES ──
    log.info('Gate 2/6: VERIFY_ZONES — validating zone structure');
    if (!await this.runGate(GateState.VERIFY_ZONES, 'ZONES_VERIFIED')) {
      return { success: false, error: 'Pipeline failed at VERIFY_ZONES gate' };
    }

    // ── Step 3: PREDICT ──
    log.info('Gate 3/6: PREDICT — constructing shape chain');
    if (!await this.runGate(GateState.PREDICT, 'SHAPES_PREDICTED')) {
      return { success: false, error: 'Pipeline failed at PREDICT gate' };
    }

    // ── Step 4: SCORE ──
    log.info('Gate 4/6: SCORE — generating trade setups');
    if (!await this.runGate(GateState.SCORE, 'SETUPS_SCORED')) {
      return { success: false, error: 'Pipeline failed at SCORE gate' };
    }

    // ── Step 5: VALIDATE ──
    log.info('Gate 5/6: VALIDATE — running firewall evaluation');
    if (!await this.runGate(GateState.VALIDATE, 'VALIDATION_PASSED')) {
      return { success: false, error: 'Pipeline failed at VALIDATE gate (firewall rejected setups)' };
    }

    // ── Step 6: AUDIT (skip EXECUTE — report is read-only) ──
    log.info('Gate 6/6: AUDIT — compliance sweep + Merkle chain');
    // For report generation we jump from VALIDATE to AUDIT directly
    this.gateEngine.send({ type: 'VALIDATION_PASSED' });

    // Collect snapshots from all brains
    const snapshots = this.collectSnapshots();
    if (!snapshots) {
      return { success: false, error: 'Failed to collect brain snapshots — ensure all brains have published to their channels' };
    }

    // Fetch OHLC history for each pair with a spot price
    this.cachedOHLC = [];
    if (this.tvClient) {
      const ohlcPairs = Object.keys(snapshots.spots);
      for (const pair of ohlcPairs) {
        try {
          const bars: OHLCBar[] = await this.tvClient.getOHLCHistory(pair, '4H', PIPELINE_OHLC_BARS);
          if (bars.length > 0) {
            const open = bars[0].open;
            const high = Math.max(...bars.map((b: OHLCBar) => b.high));
            const low = Math.min(...bars.map((b: OHLCBar) => b.low));
            const close = bars[bars.length - 1].close;
            this.cachedOHLC.push({ pair, open, high, low, close });
          }
        } catch (e) {
          log.warn(`OHLC fetch failed for ${pair}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } else {
      log.debug('No TradingViewClient injected — OHLC records omitted');
    }

    // Generate the report
    log.info('Generating TTE v5.3.3 report...');
    const reportParams: ReportParams = {
      spots: snapshots.spots,
      timestamp: Date.now(),
      calendar: this.getCalendarEvents(),
      ohlc: this.getOHLCRecords(snapshots.spots),
      zones: snapshots.zones,
      shapeChain: snapshots.shapeChain,
      setups: snapshots.setups,
    };

    const reportContent = this.reportGenerator.generate(reportParams);

    // Generate Pine Script v6 indicator from the same verified data
    const pineScript = this.generatePineScript(snapshots);

    // Save report to disk
    const reportPath = await this.saveReport(reportContent, outputDir);

    // Run compliance sweep on the report's setups
    const compliance = runComplianceSweep(snapshots.setups);
    if (compliance.failedChecks > 0) {
      log.warn(`Compliance sweep: ${compliance.failedChecks}/${compliance.totalChecks} checks failed`);
    }

    // Save Pine Script alongside the report
    if (pineScript) {
      await this.savePineScript(pineScript, outputDir);
    }

    // Publish audit-complete event to close the cycle
    this.messenger.publish(
      BrainChannel.AUDIT_COMPLETE,
      { reportPath, timestamp: Date.now(), setupCount: snapshots.setups.length },
      'PipelineRunner',
    );

    // FIX-020: Record report for context bloat tracking
    contextBloatGuard.afterReport(reportContent);

    log.info(`Pipeline complete. Report saved to ${reportPath}`);
    return { success: true, data: reportPath };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // GATE EXECUTION
  // ═══════════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIX-003: TEMPORAL BOUNDARY
  // Temporal audit getters remain for compliance reporting.
  // (FIX-002 filter checkpoint + applyDataCheckpoint removed — referenced
  //  non-existent plutus-options-scoring tool.)
  // ═══════════════════════════════════════════════════════════════════════════════

  /** Get the FIX-003 temporal audit result for compliance reporting. Exposed to tools via ToolContext.pipelineRunner. */
  getTemporalAudit(): TemporalResult | null {
    return this.lastTemporalAudit;
  }

  /** Get the FIX-003 temporal window for the current target week. Exposed to tools via ToolContext.pipelineRunner. */
  getTemporalWindow(): TemporalWindow {
    return this.temporalBoundary.computeWindow();
  }

  /**
   * Send a gate event and wait for the pipeline to advance past the target gate.
   * Returns false on timeout.
   */
  private async runGate(targetGate: GateState, event: string): Promise<boolean> {
    try {
      // Map event string to gate event
      const gateEvents: Record<string, 'DXY_READY' | 'ZONES_VERIFIED' | 'SHAPES_PREDICTED' | 'SETUPS_SCORED' | 'VALIDATION_PASSED'> = {
        'DXY_READY': 'DXY_READY',
        'ZONES_VERIFIED': 'ZONES_VERIFIED',
        'SHAPES_PREDICTED': 'SHAPES_PREDICTED',
        'SETUPS_SCORED': 'SETUPS_SCORED',
        'VALIDATION_PASSED': 'VALIDATION_PASSED',
      };

      const gateEvent = gateEvents[event];
      if (!gateEvent) {
        log.error(`Unknown gate event: ${event}`);
        return false;
      }

      this.gateEngine.send({ type: gateEvent });

      // Wait for the gate to be reached (short timeout — brains are in-process)
      await this.gateEngine.waitForGate(targetGate, GATE_TIMEOUT_TIMEOUT_MS);

      log.debug(`Gate ${targetGate} reached successfully`);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log.error(`Gate ${targetGate} failed: ${msg}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SNAPSHOT COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Collect the latest snapshots from all three brain channels.
   * Returns null if any required channel has no data yet.
   */
  private collectSnapshots(): CollectedSnapshots | null {
    // Zone snapshot
    const zoneEnvelope = this.messenger.getLatest<ZoneMapSnapshot>(BrainChannel.ZONE_MAPPED);
    if (!zoneEnvelope) {
      log.warn('No ZoneMapSnapshot available on ZONE_MAPPED channel');
      return null;
    }

    // Shape snapshot
    const shapeEnvelope = this.messenger.getLatest<ShapePredictionSnapshot>(BrainChannel.SHAPE_PREDICTED);
    if (!shapeEnvelope) {
      log.warn('No ShapePredictionSnapshot available on SHAPE_PREDICTED channel');
      return null;
    }

    // Setup snapshot
    const setupEnvelope = this.messenger.getLatest<TradeSetupMapSnapshot>(BrainChannel.SETUP_READY);
    if (!setupEnvelope) {
      log.warn('No TradeSetupMapSnapshot available on SETUP_READY channel');
      return null;
    }

    // Build zone maps keyed by pair from all available sources.
    // ZoneBrain publishes per-instrument, so getLatest only returns the last one.
    // When zoneBrain is available, query all 4 instruments directly.
    const ALL_INSTRUMENTS = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
    const spots: Record<string, number> = {};
    const zones: Record<string, DXYZone[]> = {};

    if (this.zoneBrain) {
      // Query each instrument's zones + spot directly from the zone brain cache
      for (const instrument of ALL_INSTRUMENTS) {
        const instrZones = this.zoneBrain.getZones(instrument);
        const instrSpot = this.zoneBrain.getSpot(instrument);
        zones[instrument] = [...instrZones];
        if (instrSpot > 0) {
          spots[instrument] = instrSpot;
        }
      }
    }

    // Always include the latest envelope's data (may fill gaps)
    spots[zoneEnvelope.data.instrument] = zoneEnvelope.data.spots[zoneEnvelope.data.instrument] ?? spots[zoneEnvelope.data.instrument];
    if (!zones[zoneEnvelope.data.instrument] || zones[zoneEnvelope.data.instrument].length === 0) {
      zones[zoneEnvelope.data.instrument] = [...zoneEnvelope.data.zones];
    }
    // Merge remaining spots from envelope
    for (const [key, value] of Object.entries(zoneEnvelope.data.spots)) {
      if (!(key in spots)) {
        spots[key] = value as number;
      }
    }

    // Also add zones for each pair that has setups
    for (const setup of setupEnvelope.data.setups) {
      if (!zones[setup.pair] && setup.pair !== zoneEnvelope.data.instrument) {
        zones[setup.pair] = [];
      }
    }

    return {
      spots,
      zones,
      shapeChain: shapeEnvelope.data.shapeChain,
      setups: [...setupEnvelope.data.setups],
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALENDAR + OHLC (placeholder until clients are built)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get economic calendar events from the EconomicCalendarClient.
   * Converts the client's event format to the report generator's format.
   * Returns an empty array if no client is injected or no events are cached.
   */
  private getCalendarEvents(): CalendarEvent[] {
    if (!this.economicCalendar) {
      log.debug('No EconomicCalendarClient injected — calendar events omitted');
      return [];
    }

    const rawEvents = this.economicCalendar.getEvents();
    if (rawEvents.length === 0) {
      log.debug('EconomicCalendarClient has no cached events');
      return [];
    }

    return rawEvents.map((ev: EconomicCalendarEvent) => {
      // Parse the ISO date to extract date + time components
      const parsed = new Date(ev.date);
      const dateStr = Number.isNaN(parsed.getTime())
        ? ev.date.slice(0, ISO_DATE_SLICE_LENGTH)
        : parsed.toISOString().slice(0, ISO_DATE_SLICE_LENGTH);
      const timeStr = Number.isNaN(parsed.getTime())
        ? 'All Day'
        : `${String(parsed.getUTCHours()).padStart(TIME_FORMAT_PAD, '0')}:${String(parsed.getUTCMinutes()).padStart(TIME_FORMAT_PAD, '0')} ET`;

      const impactMap: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
        high: 'HIGH',
        medium: 'MEDIUM',
        low: 'LOW',
      };

      return {
        date: dateStr,
        timeET: timeStr,
        event: ev.title,
        impact: impactMap[ev.impact] ?? 'LOW',
        forecast: ev.forecast ?? '—',
        previous: ev.previous ?? '—',
      };
    });
  }

  /**
   * Get prior-week OHLC records per pair from the TradingViewClient.
   * Fetches the latest 42 bars (≈ 1 week of 4H) for each pair and packs
   * them into OHLCRecord format. Returns an empty array if no client is injected.
   */
  private getOHLCRecords(spots: Record<string, number>): OHLCRecord[] {
    // This is synchronous from the report's perspective — returns prior fetch results.
    // The actual async fetch happens in runWeeklyReport() via this.tvClient.getOHLCHistory.
    if (!this.cachedOHLC) return [];
    return this.cachedOHLC;
  }

  /** Cached OHLC records from the async fetch in runWeeklyReport. */
  private cachedOHLC: OHLCRecord[] | null = null;

  // ═══════════════════════════════════════════════════════════════════════════════
  // PINE SCRIPT GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Build PineScriptData from collected snapshots and generate a Pine v6 indicator.
   * Returns null if insufficient data is available.
   */
  private generatePineScript(snapshots: CollectedSnapshots): string | null {
    try {
      const pineGen = new PineScriptGenerator();

      // Compute week date range
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - PIPELINE_WEEK_DAYS);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const weekLabel = `${monthNames[weekStart.getMonth()]}${weekStart.getDate()}-${monthNames[now.getMonth()]}${now.getDate()}`;

      // Build pair data for each instrument that has zones
      const pinePairs: PinePairData[] = [];
      const validPairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

      for (const pair of validPairs) {
        const pairZones = snapshots.zones[pair];
        if (!pairZones || pairZones.length === 0) continue;

        // Convert DXYZone[] → PineZone[]
        const pineZones: PineZone[] = pairZones.map((z: DXYZone) => {
          const isSupply = z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.MOM_SUPPLY
            || z.type === ZoneType.IP_SUPPLY || z.type === ZoneType.LSZ_SUPPLY;
          return {
            top: z.ceiling,
            bottom: z.floor,
            category: isSupply ? 'RES' : 'SUP',
            degree: this.confluenceToDegree(z.confluence),
            tier: z.isBoM ? 'T1' : 'T2',
            name: z.id,
            zfp: z.zfp,
          };
        });

        // Convert setups for this pair → PineTrade[]
        // H-05: Use real multi-point scaled entries (33/33/33) when available,
        // falling back to the single entry field for legacy setups.
        const pairSetups = snapshots.setups.filter((s: TradeSetup) => s.pair === pair);
        const pineTrades: PineTrade[] = pairSetups.map((s: TradeSetup) => ({
          entry1: s.entry1 ?? s.entry,
          entry3: s.entry3 ?? s.entry,
          sl: s.sl,
          tp: s.tp,
          rr: s.rrr,
          tier: s.confidenceTier,
          dayEntry: s.day,
          dayTarget: s.day,
        }));

        // Build shape chain string from the chain predictions
        const chainStr = snapshots.shapeChain.chain
          .map((c: ShapePrediction) => `${c.day.split(' ')[0]}=${c.shape}`)
          .join(' → ');
        const firstConfidence = snapshots.shapeChain.chain[0]?.confidence ?? DEFAULT_CONFIDENCE;
        const altChains = snapshots.shapeChain.alternativeChains ?? [];
        const altChainStr = altChains
          .map((c: Record<string, unknown>) => `${String(c.scenario ?? '')}(${String(c.probability ?? '')})`)
          .join('; ');
        const altConfidence = altChains[0]
          ? parseFloat(String(altChains[0].probability ?? `${PIPELINE_ALT_CHAIN_DEFAULT_PCT}%`)) / PCT_MULTIPLIER
          : PIPELINE_ALT_CHAIN_DEFAULT_CONF;

        pinePairs.push({
          pair,
          zones: pineZones,
          lsz: [],
          options: [],
          trades: pineTrades,
          shapeChain: chainStr,
          shapeConfidence: firstConfidence,
          altChain: altChainStr,
          altConfidence: altConfidence,
          dayByDay: snapshots.shapeChain.weeklyVisualization ?? '',
        });
      }

      if (pinePairs.length === 0) {
        log.warn('No pairs with zone data — skipping Pine Script generation');
        return null;
      }

      const pineData: PineScriptData = {
        weekLabel,
        dataWeekStart: { year: weekStart.getFullYear(), month: weekStart.getMonth() + 1, day: weekStart.getDate() },
        dataWeekEnd: { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() },
        pairs: pinePairs,
      };

      const pineCode = pineGen.generate(pineData);
      log.info(`Pine Script v6 generated (${pineCode.length} chars, ${pinePairs.length} pairs)`);
      return pineCode;
    } catch (e) {
      log.warn(`Pine Script generation failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /** Map confluence score to Pine zone degree. */
  private confluenceToDegree(confluence: number): PineZone['degree'] {
    if (confluence >= DEGREE_EXTREME_MIN) return 'EXTREME';
    if (confluence >= DEGREE_HEAVY_MIN) return 'HEAVY';
    if (confluence >= DEGREE_MODERATE_HEAVY_MIN) return 'MODERATE-HEAVY';
    if (confluence >= DEGREE_MODERATE_MIN) return 'MODERATE';
    if (confluence >= DEGREE_LIGHT_MIN) return 'LIGHT';
    return 'MINIMAL';
  }

  /** Save Pine Script to a timestamped .pine file. */
  private async savePineScript(content: string, outputDir: string): Promise<void> {
    const dir = outputDir.startsWith('/')
      ? outputDir
      : join(process.cwd(), outputDir);
    await fs.mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, ISO_TIMESTAMP_SLICE_LENGTH);
    const filepath = join(dir, `plutus-indicator-${timestamp}.pine`);
    await fs.writeFile(filepath, content, 'utf-8');
    log.debug(`Pine Script saved: ${filepath}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // REPORT I/O
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Save the report content to a timestamped file in the output directory.
   * Creates the directory if it does not exist.
   */
  private async saveReport(content: string, outputDir: string): Promise<string> {
    const dir = outputDir.startsWith('/')
      ? outputDir
      : join(process.cwd(), outputDir);

    // Ensure the directory exists
    await fs.mkdir(dir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, ISO_TIMESTAMP_SLICE_LENGTH);
    const filename = `plutus-report-${timestamp}.md`;
    const filepath = join(dir, filename);

    await fs.writeFile(filepath, content, 'utf-8');

    log.debug(`Report saved: ${filepath} (${content.length} chars)`);
    return filepath;
  }
}
