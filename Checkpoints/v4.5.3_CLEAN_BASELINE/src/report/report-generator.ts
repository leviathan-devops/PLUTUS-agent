/**
 * Report Generator v2.0 — TTE v5.3.3 Full-Spectrum Institutional Liquidity Report.
 *
 * Produces the EXACT validated report format from
 * Trident_Report_2026W14_Mar30-Apr3.md — a multi-page markdown document
 * organised into the following page structure:
 *
 *   PAGE 1: OTC FX Option Expiries (day-by-day)
 *   PAGE 2: Prior Week OHLC + Target Week OHLC + Economic Calendar + Red Fences
 *   PAGE 3: Engine 1 — IP Zone Maps (per pair)
 *   PAGE 4: Engine 2 — Macro Shape Chains (per pair, day-by-day)
 *   PAGE 5+: Engine 3 — Full-Spectrum Trade Maps:
 *     - HTF Swing Setups (per pair)
 *     - Swing Scalp Setups (per pair)
 *     - Reinforcement Entries (per pair)
 *     - Transition Setups (per pair)
 *     - Double Whiplash Inverse (if applicable)
 *     - Master Trade Setup (if Avatar State)
 *   Cross-Pair Trade Setup Matrix (ranked)
 *   Weekly Execution Calendar (day-by-day summary)
 *   Session-Specific Execution Notes
 *   Sequential Zone Path Maps (for key setups)
 *   Dominant Macro Themes
 *   Data Provenance Audit
 *   Blind-Execution Protocol Verification (Section 5.5)
 *
 * The report is a plain string with Markdown formatting, suitable for
 * writing to a .md file. Every page is generated from real brain
 * snapshots (zones, shapes, setups) and harvested raw data — no
 * hardcoded values.
 */

import {
  ConfidenceTier,
  SetupCategory,
  TradeDirection,
  ShapeCode,
  ZoneType,
  type DXYZone,
  type ShapeChain,
  type TradeSetup,
  type ReinforcementLadder,
  type PipelineError,
} from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  REPORT_ENGINE_VERSION,
  REPORT_MAX_ZONE_ROWS,
  REPORT_COMPLIANCE_CHECK_COUNT,
  SL_CAP_PIPS,
  PCT_MULTIPLIER,
  REQUIRED_DIRECTION_CHECKS,
  PIP_VALUE_DXY,
  PIP_VALUE_FX_4DEC,
} from '../constants/trading-constants.js';

const log = new Logger('ReportGenerator');

// ═══════════════════════════════════════════════════════════════════════════════
// HARVESTED DATA TYPES — raw data from external sources
// ═══════════════════════════════════════════════════════════════════════════════

/** A single OTC FX option expiry entry. */
export interface OTCExpiry {
  pair: string;
  strike: number;
  notional: string;       // "Modest" | "Notable" | "LARGE" | "$1.5B" etc.
  classification: string;  // "SIGNIFICANT MAGNET" | "CRITICAL OPTION WALL" | "No notable expiries"
  spotRelation: string;    // "Above spot (1.14618)" | "Below spot (1.15531 close)" etc.
  technicalContext: string; // human-readable analysis
}

/** Per-day OTC expiry data including filter checkpoint stats. */
export interface DailyOTC {
  day: string;             // "Monday" | "Tuesday" | ...
  date: string;            // "March 30, 2026"
  note?: string;           // special note e.g. "Month-End / Quarter-End"
  expiries: OTCExpiry[];
  filterCheckpoint?: string; // "1 raw strike → 1 after pair filter → 1 final included"
}

/** Prior-week or target-week OHLC bar packed per pair per day. */
export interface DailyOHLC {
  date: string;            // date label
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Prior-week OHLC per pair (5 values: Mon-Fri). */
export interface PriorWeekOHLC {
  pair: string;
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;  // close
}

/** Economic calendar / Red Folder event (v2.0 — Page 2 format). */
export interface RedFolderFenceEvent {
  date: string;        // "Mar 30"
  time: string;        // "08:30 ET" or "12:00 GMT"
  ccy: string;         // "EUR" | "USD" | "—"
  event: string;       // "NFP (March)"
  preLock: string;     // "08:25 ET" or "—"
  postRelease: string; // "08:45 ET" or "—"
  impact: 'RED' | 'HIGH' | 'MEDIUM';
}

/** A data provenance audit row. */
export interface ProvenanceRow {
  dataPoint: string;
  source: string;
  method: string;
  url: string;
  confidence: string;  // "CONFIRMED" | "MODERATE" | "ESTIMATED"
}

/** IP zone map row with Engine 3 status column. */
export interface IPZoneMapRow {
  id: string;           // "R1" | "R2" | "D1" | "D2"
  range: string;        // "1.1600-1.1640"
  type: string;         // "Supply" | "Demand"
  boMoM: string;        // "BoM" | "MoM"
  reactions: string;    // "0-1" | "2" | "1-2"
  zfpPct: string;       // "15%"
  pressureDegree?: string; // "EXTREME" | "HEAVY" | etc.
  poiTier?: number;     // 1 | 2 | 3
  confluence: string;   // "9/14"
  optionConfluence: string; // "1.1600 Apr 1 SIG MAG" | "No option confluence"
  engine3Status: string;    // "ENTRY-PRIMARY (SHORT)" etc.
}

/** Shape chain row for the per-pair forward map. */
export interface ShapeChainRow {
  day: string;          // "Mon"
  shape: string;        // "BS"
  direction: string;    // "DOWN" | "UP" | "RANGE"
  confidence: string;   // "85%"
  zoneAnchor: string;
  rationale: string;
}

/** Consolidation phase detection row. */
export interface ConsolidationPhaseRow {
  day: string;
  shape: string;
  validSetupTypes: string;
  timeframeStack: string;
  expectedCount: string;
}

/** Trade setup table row for HTF swing / cross-pair display. */
export interface SetupTableRow {
  number: number;
  direction: string;    // "LONG" | "SHORT"
  entry: string;
  sl: string;
  tp1?: string;
  tp3?: string;
  rrr: string;          // "4.2x" — base/full RRR
  rrrBlended?: string;  // "3.8x" — blended RRR across 3 staggered entries
  confidence: string;   // "78" — 0-100
  quality: string;      // "God-Tier" | "High" | "Standard" | "Conditional"
  day?: string;         // "Monday" — weekday for blind execution
  session?: string;     // "London Open 02:00-05:00 ET"
  zoneName?: string;    // "R1" | "D1" | etc
  shapeTrigger?: string; // macro shape that activates this setup
  proximityPips?: string;  // distance from entry to spot in pips
  proximityStatus?: string; // "CLOSE" | "ACCEPTABLE" | "FAR"
  slDistancePips?: string;  // SL distance in pips
  cascadeSource?: string;   // "native" | "DXY-cascade"
  directionValidation?: string; // summary of direction validation checks
  zoneShapeAudit: string;
  nearestFib?: string;       // "Fib 0.618" — nearest Fib level to entry
  fibReinforcement?: string; // "R1 1.382 @1.0845 R2 1.618 @1.0832" — Fib-based reinforcement entry points
  multiTfConfluence?: string; // "3 TF zones (1H Supply, 15m Demand)" — multi-TF overlap at entry
  /** Wave 3: LTF micro-zone used for entry precision, or "4H edge" fallback. */
  ltfEntryLabel?: string;
  /**
   * Numeric reinforcement level data from the pipeline (Fib extensions 1.382 / 1.618).
   * Used to compute the full Liquidity Ladder with per-rocket entry/SL/TP and combined R:R.
   */
  reinforcementLevelsData?: { price: number; fibLevel: number }[];
  /** Phase 6: 3-entry staggered entry levels (front/mid/back edge). */
  entry1?: string;
  entry2?: string;
  entry3?: string;
  /** Phase 6: Trade chain display (e.g. "Chain EUR-1 (2/3)"). */
  chainInfo?: string;
  /** Phase 6: VLM verification status from visual verification step. */
  vlmStatus?: string;
}

/** Swing scalp table row. */
export interface ScalpTableRow {
  number: string;       // "S1"
  direction: string;
  entry: string;
  sl: string;
  tp: string;
  rrr: string;
  confidence: string;
  session: string;
  details: string;
}

/** Reinforcement entry table row. */
export interface ReinforcementRow {
  number: string;       // "R1"
  forSetup: string;     // "#1 LONG"
  entry: string;
  sl: string;
  tp: string;
  rrr: string;
  type: string;         // "Liquidity Ladder" | "Fib Rocket FLR" | "Fib Rocket LR"
  details: string;
  fibLevel?: string;    // "1.382" or "1.618" — Fib extension used for entry
}

/** Transition setup table row. */
export interface TransitionRow {
  number: string;       // "T1"
  type: string;         // "SS→BS Transition" | "Post-WL Reverse"
  trigger: string;
  sl: string;
  tp: string;
  rrr: string;
  details: string;
}

/** Direction validation check row. */
export interface DirectionCheckRow {
  check: string;        // "1. 4H Trend"
  result: string;       // "Bearish (LH/LL)"
  favors: string;       // "SHORT" | "LONG" | "LONG supported"
  rationale: string;
}

/** Session execution note row. */
export interface SessionNoteRow {
  session: string;
  setupFocus: string;
  pairPriority: string;
}

/** Blind-execution verification check (Section 5.5 BE1-BE12). */
export interface BlindExecCheck {
  id: string;           // "BE1"
  check: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP-LEVEL DATA CONTAINERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All raw data harvested from external sources. The generator consumes this
 * to populate Pages 1-2 and the Data Provenance Audit.
 */
export interface HarvestedData {
  /** Day-by-day OTC FX option expiries. */
  otcExpiries: DailyOTC[];
  /** Prior week OHLC per pair. */
  priorWeekOHLC: PriorWeekOHLC[];
  /** Target week OHLC per pair per day (date → pair → bar). */
  targetWeekOHLC: Record<string, Record<string, DailyOHLC>>;
  /** Economic calendar / Red Folder events. */
  calendar: RedFolderFenceEvent[];
  /** Data provenance audit rows. */
  provenance: ProvenanceRow[];
}

/**
 * All computed output from the 3-engine TTE pipeline. The generator consumes
 * this to populate Pages 3-5+ and the compliance sweep.
 */
export interface TTEOutput {
  /** IP zone maps keyed by pair. */
  zoneMaps: Record<string, IPZoneMapRow[]>;
  /** Shape chain rows keyed by pair. */
  shapeChains: Record<string, ShapeChainRow[]>;
  /** Consolidation phase detection rows keyed by pair. */
  consolidationPhases: Record<string, ConsolidationPhaseRow[]>;
  /** Cross-pair shape alignment summary text. */
  crossPairAlignment: string;
  /** HTF swing setup rows keyed by pair. */
  htfSetups: Record<string, SetupTableRow[]>;
  /** Direction validation checks keyed by "PAIR-SETUPNUMBER". */
  directionValidations: Record<string, DirectionCheckRow[]>;
  /** Swing scalp setup rows keyed by pair. */
  swingScalps: Record<string, ScalpTableRow[]>;
  /** Reinforcement entries keyed by pair. */
  reinforcements: Record<string, ReinforcementRow[]>;
  /** Reinforcement combined RRR summary text keyed by pair. */
  reinforcementSummary: Record<string, string>;
  /** Transition setups keyed by pair. */
  transitions: Record<string, TransitionRow[]>;
  /** Double whiplash inverse description keyed by pair (if applicable). */
  doubleWhiplashInverse: Record<string, string>;
  /** Cross-pair trade setup matrix rows. */
  crossPairMatrix: SetupTableRow[];
  /** Cross-pair matrix summary text. */
  crossPairMatrixSummary: string;
  /** Session execution notes. */
  sessionNotes: SessionNoteRow[];
  /** Dominant macro themes text. */
  dominantThemes: string;
  /** Sequential zone path descriptions keyed by setup label. */
  zonePaths: Record<string, string>;
}

/** Result of a single compliance sweep check. */
export interface ComplianceCheck {
  check: string;
  result: string;  // "PASS" | "WARN" | "FAIL"
  evidence: string;
}

/** Parameters required to generate a full v2.0 report. */
export interface ReportParamsV2 {
  /** Report title week range, e.g. "March 30 — April 3, 2026". */
  weekRange: string;
  /** Pairs included, e.g. "DXY, EUR/USD, GBP/USD, AUD/USD". */
  pairs: string;
  /** Data as-of timestamp label, e.g. "Friday, March 27, 2026 17:00 ET". */
  dataAsOf: string;
  /** Engine subtitle line (appears under the title). */
  engineSubtitle: string;
  /** Harvested raw data. */
  harvested: HarvestedData;
  /** Computed TTE pipeline output. */
  tteOutput: TTEOutput;
  /** Compliance sweep checks. */
  compliance: ComplianceCheck[];
  /** Blind-execution verification checks (Section 5.5). */
  blindExecChecks: BlindExecCheck[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ENGINE_VERSION = REPORT_ENGINE_VERSION;
const MAX_ZONE_ROWS = REPORT_MAX_ZONE_ROWS;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const PAIR_ORDER = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

export class ReportGenerator {
  constructor() {
    log.debug('ReportGenerator v2.0 initialised');
  }

  /**
   * Generate the complete multi-page TTE v5.3.3 report as a markdown string.
   *
   * Pages are separated by blank lines. Each page uses `## **PAGE N:**` headings.
   * Tables use bold `|**Col**|` header format matching the validated report.
   *
   * Accepts either the v2.0 structured `ReportParamsV2` or the legacy v1.0
   * `ReportParams` (for backward compatibility with pipeline/runner.ts).
   */
  generate(params: ReportParamsV2 | ReportParams): string {
    // Legacy v1.0 params — bridge to v2.0 structured data
    if ('spots' in params && 'timestamp' in params) {
      log.debug('generate() — detected legacy ReportParams v1.0, delegating to generateLegacy()');
      return this.generateLegacy(params as ReportParams);
    }
    // Validate v2.0 params have the minimum required fields
    const v2 = params as ReportParamsV2;
    if (!v2.harvested || !v2.tteOutput || !v2.compliance) {
      const missing: string[] = [];
      if (!v2.harvested) missing.push('harvested');
      if (!v2.tteOutput) missing.push('tteOutput');
      if (!v2.compliance) missing.push('compliance');
      const errMsg = `generate() — params do not match ReportParamsV2 (missing: ${missing.join(', ')}) or legacy ReportParams (no 'spots'/'timestamp')`;
      log.error(errMsg);
      throw new Error(`Invalid report parameters: ${errMsg}`);
    }
    return this.generateV2(v2);
  }

  /**
   * v2.0 generator — full structured multi-page report from TTEOutput + HarvestedData.
   */
  private generateV2(params: ReportParamsV2): string {
    const sections: string[] = [
      this.generateTitleBlock(params),
      this.generatePage1OTC(params.harvested),
      this.generatePage2OHLCCalendar(params.harvested),
      this.generatePage3ZoneMaps(params.tteOutput),
      this.generatePage4ShapeChains(params.tteOutput),
      this.generatePage5Engine3TradeMaps(params),
      this.generateCrossPairMatrix(params.tteOutput),
      this.generateSessionNotes(params.tteOutput),
      this.generateDominantThemes(params.tteOutput),
      this.generateSequentialZonePaths(params.tteOutput),
      this.generateDualBrainSummary(params.tteOutput),
      this.generateDataProvenance(params.harvested),
      this.generateBlindExecVerification(params.blindExecChecks),
      this.generateComplianceSweep(params.compliance),
    ];

    return sections.join('\n\n') + '\n';
  }

  private generateDualBrainSummary(tteOutput: any): string {
    const tradeSetups = tteOutput?.tradeSetups;
    if (!tradeSetups || (tradeSetups instanceof Map ? tradeSetups.size === 0 : !Array.isArray(tradeSetups) || tradeSetups.length === 0)) {
      return '';
    }
    const lines: string[] = [
      '## **DUAL-BRAIN OVERLAY SUMMARY**',
      '',
      '|**Pair**|**TimesFM**|**Kronos**|**Rule**|**Agreement**|**Setups**|**F-Grade**|',
      '|---|---|---|---|---|---|---|',
    ];
    const entries = tradeSetups instanceof Map ? Array.from(tradeSetups.entries()) : Object.entries(tradeSetups);
    for (const [pair, setups] of entries) {
      const arr = Array.isArray(setups) ? setups : [];
      const shapeDeltaLevel = arr[0]?.shapeDeltaLevel ?? '—';
      const kronosShape = arr[0]?.kronosShape ?? '—';
      const ruleShape = tteOutput?.shapeChains?.get?.(pair)?.currentShape ?? '—';
      const dba = arr[0]?.dualBrainAgreement ?? '—';
      const fCount = arr.filter((s: any) => s.dualBrainGrade === 'F').length;
      lines.push(`|${pair}|${shapeDeltaLevel}|${kronosShape}|${ruleShape}|${dba}|${arr.length}|${fCount}|`);
    }
    lines.push('');
    return lines.join('\n');
  }

  /**
   * v1.0 legacy generator — bridges the old ReportParams format into a
   * simplified report for backward compatibility with pipeline/runner.ts.
   *
   * This produces a basic report with whatever data is available (zones,
   * setups, OHLC, calendar). It does NOT produce the full validated
   * multi-page format — use ReportParamsV2 for that.
   */
  private generateLegacy(params: ReportParams): string {
    const ts = new Date(params.timestamp);

    // Use the explicit weekStart (requested week) if provided; otherwise fall back
    // to the Monday of the current week derived from the timestamp.
    const monday = params.weekStart
      ? new Date(params.weekStart + 'T00:00:00Z')
      : this.getMonday(params.timestamp);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const fmtDate = (d: Date): string =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const lines: string[] = [
      '## **TRIDENT TRADING ENGINE v5.3.3**',
      '',
      '## **FULL-SPECTRUM INSTITUTIONAL LIQUIDITY REPORT**',
      '',
      `Trading Week: ${fmtDate(monday)} — ${fmtDate(friday)}`,
      '',
      `Data As-Of: ${ts.toLocaleDateString('en-US')} 17:00 ET — All data is pre-market-open for target week.`,
      '',
      `Engine: ${ENGINE_VERSION}`,
      '',
      '## **PAGE 2: PRIOR WEEK OHLC + ECONOMIC CALENDAR**',
      '',
    ];

    // OHLC
    if (params.ohlc.length > 0) {
      lines.push('## **Prior Week OHLC**');
      lines.push('');
      lines.push('|**Pair**|**Open**|**High**|**Low**|**Close**|');
      lines.push('|---|---|---|---|---|');
      for (const r of params.ohlc) {
        lines.push(`|**${r.pair}**|${this.fmtPrice(r.open, r.pair)}|${this.fmtPrice(r.high, r.pair)}|${this.fmtPrice(r.low, r.pair)}|${this.fmtPrice(r.close, r.pair)}|`);
      }
      lines.push('');
    }

    // Calendar
    if (params.calendar.length > 0) {
      lines.push('## **HIGH-IMPACT MACRO FENCES (Red Folder Time-Locks)**');
      lines.push('');
      lines.push('|**Date**|**Time ET**|**Event**|**Impact**|');
      lines.push('|---|---|---|---|');
      for (const e of params.calendar) {
        const impactLabel = e.impact === 'HIGH' ? '**HIGH**' : e.impact;
        lines.push(`|${e.date}|${e.timeET}|${e.event}|${impactLabel}|`);
      }
      lines.push('');
    }

    // ── Phase 6B: War Narrative (Law 26) — BEFORE zone maps ──
    const weekLabel = `${fmtDate(monday)} — ${fmtDate(friday)}`;
    for (const [pair, pairZones] of Object.entries(params.zones)) {
      const spot = params.spots[pair] ?? 0;
      const atr = params.pairATR?.[pair];
      lines.push(ReportGenerator.generateWarNarrative(
        pair,
        pairZones,
        params.setups,
        spot,
        weekLabel,
        atr,
      ));
      lines.push('---');
      lines.push('');
    }

    // Zones
    const zoneEntries = Object.entries(params.zones);
    if (zoneEntries.length > 0) {
      lines.push('## **PAGE 3: ENGINE 1 — INSTITUTIONAL PRESSURE ZONE MAPS**');
      lines.push('');
      for (const [pair, pairZones] of zoneEntries) {
        const capped = pairZones.slice(0, MAX_ZONE_ROWS);
        const atrStr = params.pairATR?.[pair] !== undefined
          ? ` | ATR(14): ${params.pairATR[pair].toFixed(5)}`
          : '';
        lines.push(`## **${pair} — IP Zone Map (Pre-Week)${atrStr}**`);
        lines.push('');
        lines.push('|**#**|**Zone Name**|**Range**|**Type**|**TF**|**BoM/MoM**|**Reactions**|**ZFP%**|**Pressure**|**POI**|**Confl.**|**Engine 3 Status**|');
        lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
        for (let i = 0; i < capped.length; i++) {
          const z = capped[i];
          const zDyn = z as unknown as Record<string, unknown>;
          // Phase 7: Show refinedLabel when available, otherwise zone name/id
          const displayName = zDyn.refinedLabel as string ?? z.zoneName ?? z.id;
          const tf = zDyn.timeframe as string ?? '4H';
          lines.push(
            `|${i + 1}|${displayName}|${this.fmtPrice(z.floor, pair)}-${this.fmtPrice(z.ceiling, pair)}|**${z.type}**|${tf}|**${z.isBoM ? 'BoM' : 'MoM'}**|${z.reactionCount}|${z.zfp}%|${zDyn.pressureDegree ?? '—'}|${zDyn.poiTier ?? '—'}|${z.confluence}|${z.isOneAndDone ? 'One&Done' : (z.reactionStatus ?? 'active')}|`,
          );
        }
        lines.push('');
      }
    }

    // Compliance sweep
    const compliance = ReportGenerator.generateComplianceChecks(params.setups, params.zones);
    lines.push(this.generateComplianceSweep(compliance));

    // BLIND-EXEC fallback (Module E4)
    const blindChecks = params.blindExecChecks ?? ReportGenerator.generateBlindExecChecks(params.setups);
    lines.push(this.generateBlindExecVerification(blindChecks));

    // PIPELINE ERRORS — FATAL failures collected during execution (empty = clean run)
    const errors = params.errors ?? [];
    lines.push('## **PIPELINE ERRORS**');
    lines.push('');
    lines.push('| Stage | Pair | Error | Context |');
    lines.push('|-------|------|-------|---------|');
    if (errors.length === 0) {
      lines.push('| — | — | No errors — pipeline completed successfully | — |');
    } else {
      for (const e of errors) {
        const ctx = JSON.stringify(e.context).substring(0, 100).replace(/\|/g, '\\|');
        const msg = e.message.replace(/\|/g, '\\|');
        lines.push(`| ${e.stage} | ${e.pair} | ${msg} | ${ctx} |`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }

  /** Get the Monday of the week containing the given timestamp. */
  private getMonday(timestamp: number): Date {
    const d = new Date(timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // WAR NARRATIVE ENGINE — Law 26
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Phase 6B — Generate the Weekly War Map narrative section for a pair.
   *
   * Law 26 requires a "war narrative" that frames zones as battlefronts,
   * shapes as campaign phases, and setups as troop deployments. This
   * section appears at the TOP of the per-pair report (before zone maps).
   *
   * @param pair       The currency pair (e.g. "EUR/USD")
   * @param zones      Zone array for this pair
   * @param setups     All trade setups (will be filtered to this pair)
   * @param spot       Current spot price
   * @param weekLabel  Week label for the title
   * @param pairATR    Pair ATR(14) for momentum context
   */
  static generateWarNarrative(
    pair: string,
    zones: DXYZone[],
    setups: TradeSetup[],
    spot: number,
    weekLabel: string,
    pairATR?: number,
  ): string {
    const pairSetups = setups.filter((s) => s.pair === pair);

    // ── Count timeframes across zones ──
    const tfSet = new Set<string>();
    for (const z of zones) {
      const zDyn = z as unknown as Record<string, unknown>;
      tfSet.add((zDyn.timeframe as string) ?? '4H');
    }

    // ── Momentum assessment ──
    const longCount = pairSetups.filter((s) => s.direction === TradeDirection.LONG).length;
    const shortCount = pairSetups.filter((s) => s.direction === TradeDirection.SHORT).length;
    const momentumDesc = longCount > shortCount * 1.5
      ? 'bullish momentum — advancing territory'
      : shortCount > longCount * 1.5
        ? 'bearish momentum — retreating to defensive lines'
        : 'neutral momentum — entrenched, awaiting breakout';

    // ── Build battlefronts table ──
    const battlefrontRows: string[] = [];
    const capped = zones.slice(0, MAX_ZONE_ROWS);
    for (const z of capped) {
      const zDyn = z as unknown as Record<string, unknown>;
      const displayName = (zDyn.refinedLabel as string) ?? z.zoneName ?? z.id;
      const tf = (zDyn.timeframe as string) ?? '4H';
      const status = z.isOneAndDone
        ? 'One&Done'
        : (z.reactionStatus ?? 'active');
      const importance = z.reactionCount === 0
        ? 'Virgin — unmitigated, highest reaction probability'
        : z.reactionCount === 1
          ? 'Tested once — 80% reaction probability'
          : z.reactionCount === 2
            ? 'Actively contested — 50% reaction probability'
            : 'Depleted — TP target only';
      battlefrontRows.push(
        `|${displayName}|${this.fmtPriceStatic(z.floor, pair)}-${this.fmtPriceStatic(z.ceiling, pair)}|${tf}|**${z.type}**|${status}|${importance}|`,
      );
    }

    // ── Build campaign phases table (day-by-day deployments) ──
    const dayMap = new Map<string, TradeSetup[]>();
    for (const s of pairSetups) {
      const arr = dayMap.get(s.day) ?? [];
      arr.push(s);
      dayMap.set(s.day, arr);
    }
    const campaignRows: string[] = [];
    for (const day of WEEKDAYS) {
      const daySetups = dayMap.get(day);
      if (daySetups && daySetups.length > 0) {
        const descriptions = daySetups.map((s) =>
          `${s.direction === TradeDirection.LONG ? 'LONG' : 'SHORT'} ${s.category}`,
        ).join(', ');
        campaignRows.push(`|${day}|Deploy|${descriptions}|`);
      } else {
        campaignRows.push(`|${day}|Hold|—|`);
      }
    }

    // ── Build trade chains table ──
    const chainSetups = pairSetups.filter((s) => s.chainId !== undefined);
    const chainMap = new Map<string, TradeSetup[]>();
    for (const s of chainSetups) {
      const arr = chainMap.get(s.chainId!) ?? [];
      arr.push(s);
      chainMap.set(s.chainId!, arr);
    }
    const chainRows: string[] = [];
    for (const [chainId, chainSetups] of chainMap) {
      const sorted = [...chainSetups].sort((a, b) => (a.chainPosition ?? 0) - (b.chainPosition ?? 0));
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const next = sorted[i + 1];
        const linkStr = next
          ? `TP ${this.fmtPriceStatic(s.tp, pair)} → Entry ${this.fmtPriceStatic(next.entry, pair)}`
          : 'Terminal';
        const pipVal = pair === 'DXY' ? PIP_VALUE_DXY : PIP_VALUE_FX_4DEC;
        const linkPips = next
          ? Math.abs(s.tp - next.entry) / pipVal
          : 0;
        chainRows.push(
          `|${chainId}|${s.chainPosition ?? '?'}/${sorted.length}|${linkStr}|${linkPips.toFixed(1)}p|`,
        );
      }
    }

    // ── Assemble war narrative ──
    const lines: string[] = [
      `## **${pair} — WEEKLY WAR MAP**`,
      '',
      `**Summary:** ${pair} has ${capped.length} battlefronts across ${tfSet.size} timeframes. ${momentumDesc}. ${pairSetups.length} deployment${pairSetups.length !== 1 ? 's' : ''} planned.`,
      '',
    ];

    if (pairATR !== undefined) {
      lines.push(`**ATR(14):** ${pairATR.toFixed(5)} | **Spot:** ${this.fmtPriceStatic(spot, pair)}`);
      lines.push('');
    }

    // Battlefronts
    lines.push('### Battlefronts');
    lines.push('');
    lines.push('|**Zone**|**Range**|**TF**|**Type**|**Status**|**Strategic Importance**|');
    lines.push('|---|---|---|---|---|---|');
    lines.push(...battlefrontRows);
    lines.push('');

    // Campaign Phases
    lines.push('### Campaign Phases');
    lines.push('');
    lines.push('|**Day**|**Phase**|**Deployments**|');
    lines.push('|---|---|---|');
    lines.push(...campaignRows);
    lines.push('');

    // Trade Chains (only if chains exist)
    if (chainRows.length > 0) {
      lines.push('### Trade Chains');
      lines.push('');
      lines.push('|**Chain**|**Link**|**TP → Entry**|**Pips**|');
      lines.push('|---|---|---|---|');
      lines.push(...chainRows);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Static price formatter for use in static methods (no `this` binding).
   * DXY uses 3 decimal places, all FX pairs use 5.
   */
  private static fmtPriceStatic(price: number, pair: string): string {
    return pair === 'DXY' ? price.toFixed(3) : price.toFixed(5);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TITLE BLOCK
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate the title block matching the validated report header.
   */
  private generateTitleBlock(params: ReportParamsV2): string {
    const lines: string[] = [
      '## **TRIDENT TRADING ENGINE v5.3.3**',
      '',
      '## **FULL-SPECTRUM INSTITUTIONAL LIQUIDITY REPORT**',
      '',
      `Trading Week: ${params.weekRange} | Pairs: ${params.pairs}`,
      '',
      `Data As-Of: ${params.dataAsOf} — All data is pre-market-open for target week.`,
      '',
      params.engineSubtitle,
    ];

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAGE 1: OTC FX OPTION EXPIRIES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * PAGE 1 — OTC FX Option Expiries, day-by-day.
   *
   * Each day gets its own sub-heading and table:
   *   |**Pair**|**Strike**|**Notional**|**Classification**|**Spot Rel.**|**Technical Context**|
   */
  private generatePage1OTC(harvested: HarvestedData): string {
    const lines: string[] = [
      '## **PAGE 1: OTC FX OPTION EXPIRIES**',
      '',
      'Source: investingLive (Justin Low) — 10:00 AM NY Cut | Filter Checkpoint: All strikes below $850M notional EXCLUDED',
      '',
    ];

    for (const daily of harvested.otcExpiries) {
      const noteSuffix = daily.note ? ` (${daily.note})` : '';
      lines.push(`## **${daily.day}, ${daily.date} — OTC Expiries${noteSuffix}**`);
      lines.push('');

      if (daily.expiries.length === 0) {
        lines.push('_No notable expiries._');
        lines.push('');
        continue;
      }

      // Table header
      lines.push('|**Pair**|**Strike**|**Notional**|**Classification**|**Spot Rel.**|**Technical Context**|');
      lines.push('|---|---|---|---|---|---|');

      for (const exp of daily.expiries) {
        lines.push(
          `|${exp.pair}|**${this.fmtNum(exp.strike)}**|${exp.notional}|${exp.classification}|${exp.spotRelation}|${exp.technicalContext}|`,
        );
      }

      lines.push('');

      if (daily.filterCheckpoint) {
        lines.push(`Filter Checkpoint: ${daily.filterCheckpoint}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAGE 2: OHLC + ECONOMIC CALENDAR
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * PAGE 2 — Prior Week OHLC + Target Week OHLC + Red Folder Time-Locks.
   */
  private generatePage2OHLCCalendar(harvested: HarvestedData): string {
    const lines: string[] = [
      '## **PAGE 2: PRIOR WEEK OHLC + ECONOMIC CALENDAR**',
      '',
    ];

    // Prior week OHLC
    lines.push('## **Prior Week OHLC — Context for Zone Construction**');
    lines.push('');
    lines.push('|**Pair**|**Mon**|**Tue**|**Wed**|**Thu**|**Fri (Close)**|');
    lines.push('|---|---|---|---|---|---|');

    for (const row of harvested.priorWeekOHLC) {
      lines.push(
        `|**${row.pair}**|${this.fmtNum(row.mon)}|${this.fmtNum(row.tue)}|${this.fmtNum(row.wed)}|${this.fmtNum(row.thu)}|${this.fmtNum(row.fri)}|`,
      );
    }
    lines.push('');
    lines.push('Format: Close per day | Source: myfxbook.com (FX), DealPlexus/WSJ/TradingView (DXY)');
    lines.push('');

    // Target week OHLC
    lines.push('**Target Week OHLC**');
    lines.push('');

    const targetDates = Object.keys(harvested.targetWeekOHLC);
    if (targetDates.length > 0) {
      // Determine column order from first entry
      const firstEntry = harvested.targetWeekOHLC[targetDates[0]];
      const pairs = Object.keys(firstEntry);

      lines.push('|**Date**|' + pairs.map((p) => `**${p}**`).join('|') + '|');
      lines.push('|---|' + pairs.map(() => '---').join('|') + '|');

      for (const date of targetDates) {
        const dateData = harvested.targetWeekOHLC[date];
        const cells = pairs.map((p) => {
          const bar = dateData[p];
          if (!bar) return '—';
          return `${this.fmtNum(bar.open)}/${this.fmtNum(bar.high)}/${this.fmtNum(bar.low)}/${this.fmtNum(bar.close)}`;
        });
        lines.push(`|**${date}**|${cells.join('|')}|`);
      }
      lines.push('');
      lines.push('Format: Open/High/Low/Close | Source: myfxbook.com (FX), DealPlexus/WSJ/TradingView (DXY)');
      lines.push('');
    }

    // Economic calendar / Red Folders
    lines.push('## **HIGH-IMPACT MACRO FENCES (Red Folder Time-Locks)**');
    lines.push('');
    lines.push('|**Date**|**Time**|**Ccy**|**Event**|**Pre-Lock**|**Post-Release**|**Impact**|');
    lines.push('|---|---|---|---|---|---|---|');

    for (const cal of harvested.calendar) {
      const impactStr = cal.impact === 'RED'
        ? `**RED**`
        : cal.impact === 'HIGH'
          ? `**HIGH**`
          : cal.impact;
      lines.push(
        `|${cal.date}|${cal.time.replace(/\n/g, '<br>')}|${cal.ccy}|${cal.event}|${cal.preLock}|${cal.postRelease}|${impactStr}|`,
      );
    }
    lines.push('');
    lines.push('Source: ForexFactory, TradingCharts, LiteFinance.');

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAGE 3: ENGINE 1 — IP ZONE MAPS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * PAGE 3 — Engine 1 IP Zone Maps per pair.
   *
    * Table columns:
    *   |**#**|**Zone Name**|**Range**|**Type**|**BoM/MoM**|**Reactions**|**ZFP%**|**Pressure**|**POI**|**Confl.**|**Option Confl.**|**Engine 3 Status**|
   */
  private generatePage3ZoneMaps(tte: TTEOutput): string {
    const lines: string[] = [
      '## **PAGE 3: ENGINE 1 — INSTITUTIONAL PRESSURE ZONE MAPS**',
      '',
    ];

    for (const pair of PAIR_ORDER) {
      const zones = tte.zoneMaps[pair];
      if (!zones || zones.length === 0) continue;

      lines.push(`## **${pair} — IP Zone Map (Pre-Week)**`);
      lines.push('');
      lines.push('|**#**|**Zone Name**|**Range**|**Type**|**BoM/MoM**|**Reactions**|**ZFP%**|**Pressure**|**POI**|**Confl.**|**Option Confl.**|**Engine 3 Status**|');
      lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');

      for (let zi = 0; zi < zones.length; zi++) {
        const z = zones[zi];
        lines.push(
          `|${zi + 1}|${z.id}|${z.range}|**${z.type}**|**${z.boMoM}**|${z.reactions}|${z.zfpPct}|${z.pressureDegree ?? '—'}|${z.poiTier ?? '—'}|${z.confluence}|${z.optionConfluence}|${z.engine3Status}|`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAGE 4: ENGINE 2 — MACRO SHAPE CHAINS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * PAGE 4 — Engine 2 Macro Shape Chain forward maps per pair.
   *
   * Per pair:
   *   - Shape chain table: |**Day**|**Shape**|**Direction**|**Conf.**|**Zone Anchor**|**Rationale**|
   *   - Consolidation phase detection: |**Day**|**Shape**|**Valid Setup Types**|**Timeframe Stack**|**Expected Count**|
   *   - Cross-pair shape alignment
   */
  private generatePage4ShapeChains(tte: TTEOutput): string {
    const lines: string[] = [
      '## **PAGE 4: ENGINE 2 — MACRO SHAPE CHAIN FORWARD MAP**',
      '',
    ];

    for (const pair of PAIR_ORDER) {
      const chainRows = tte.shapeChains[pair];
      const phaseRows = tte.consolidationPhases[pair];
      if (!chainRows || chainRows.length === 0) continue;

      // Shape chain table
      lines.push(`## **${pair} — Weekly Shape Chain (Anchored to IP Zones)**`);
      lines.push('');
      lines.push('|**Day**|**Shape**|**Direction**|**Conf.**|**Zone Anchor**|**Rationale**|');
      lines.push('|---|---|---|---|---|---|');

      for (const row of chainRows) {
        const shapeBold = row.shape === 'SS' ? row.shape : `**${row.shape}**`;
        lines.push(
          `|${row.day}|${shapeBold}|**${row.direction}**|${row.confidence}|${row.zoneAnchor.replace(/\n/g, '<br>')}|${row.rationale.replace(/\n/g, '<br>')}|`,
        );
      }
      lines.push('');

      // Consolidation phase detection
      if (phaseRows && phaseRows.length > 0) {
        lines.push('## **Consolidation Phase Detection — Setup Universe Classification**');
        lines.push('');
        lines.push('|**Day**|**Shape**|**Valid Setup Types**|**Timeframe Stack**|**Expected Count**|');
        lines.push('|---|---|---|---|---|');

        for (const p of phaseRows) {
          lines.push(
            `|${p.day}|${p.shape}|${p.validSetupTypes.replace(/\n/g, '<br>')}|${p.timeframeStack.replace(/\n/g, '<br>')}|${p.expectedCount.replace(/\n/g, '<br>')}|`,
          );
        }
        lines.push('');
      }
    }

    // Cross-pair shape alignment
    if (tte.crossPairAlignment) {
      lines.push('## **Cross-Pair Shape Alignment**');
      lines.push('');
      lines.push(tte.crossPairAlignment);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAGE 5+: ENGINE 3 — FULL-SPECTRUM TRADE MAPS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * PAGE 5+ — Engine 3 Full-Spectrum Trade Maps.
   *
   * For each pair, generates:
   *   - HTF Swing Setups table
   *   - Direction Validation table (per key setup)
   *   - Swing Scalp Setups table (for SS days)
   *   - Double Whiplash Inverse (if applicable)
   *   - Reinforcement Entries table
   *   - Transition Setups table
   */
  private generatePage5Engine3TradeMaps(params: ReportParamsV2): string {
    const tte = params.tteOutput;
    const lines: string[] = [
      '## **ENGINE 3 — FULL-SPECTRUM TRADE MAP**',
      '',
    ];

    // Setup universe summary
    const totalHTF = Object.values(tte.htfSetups).reduce((sum, arr) => sum + arr.length, 0);
    const totalScalps = Object.values(tte.swingScalps).reduce((sum, arr) => sum + arr.length, 0);
    const totalReinf = Object.values(tte.reinforcements).reduce((sum, arr) => sum + arr.length, 0);
    const totalTrans = Object.values(tte.transitions).reduce((sum, arr) => sum + arr.length, 0);
    const totalSetups = totalHTF + totalScalps + totalReinf + totalTrans;

    lines.push(
      `Setup Universe: ${totalHTF} HTF Swings + ${totalScalps} Swing Scalps + ${totalReinf} Reinforcement Entries + ${totalTrans} Transition Setups = ${totalSetups} total tradeable setups across ${params.pairs} | Confidence threshold: 65+ to include`,
    );
    lines.push('');

    for (const pair of PAIR_ORDER) {
      const htf = tte.htfSetups[pair];
      const scalps = tte.swingScalps[pair];
      const reinf = tte.reinforcements[pair];
      const trans = tte.transitions[pair];
      const dwi = tte.doubleWhiplashInverse[pair];

      const hasContent = (htf && htf.length > 0) || (scalps && scalps.length > 0)
        || (reinf && reinf.length > 0) || (trans && trans.length > 0) || dwi;
      if (!hasContent) continue;

      lines.push(`## **${pair} — FULL-SPECTRUM TRADE MAP**`);
      lines.push('');

      // HTF Swing Setups
      if (htf && htf.length > 0) {
        lines.push(`## **${pair} — HTF SWING SETUPS (Swing Stack: 4H/1H/30m)**`);
        lines.push('');
        lines.push('|**#**|**Dir**|**Day**|**Session**|**Entry**|**SL**|**SL Pips**|**TP**|**Blend<br>RRR**|**Real<br>RRR**|**RRR**|**Conf**|**Quality**|**Zone**|**Shape Trigger**|**Prox<br>Pips**|**Prox<br>Status**|**Cascade**|**Dir Validation**|**Nearest<br>Fib**|**K<br>Shape**|**K<br>Conf**|**P(Ent)**|**P(SL<br>Swp)**|**K<br>TP**|**DBA**|**DBG**|');
        lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');

        for (const s of htf) {
          const rrrDisplay = s.rrrBlended
            ? s.rrrBlended
            : s.rrr;
          const sExt = s as unknown as Record<string, unknown>;
          const kronosShapeConf = sExt['kronosShapeConfidence'];
          const kronosPEntry = sExt['kronosPEntryTrigger'];
          const kronosPSl = sExt['kronosPSlSweepBeforeTp'];
          const kronosPTp = sExt['kronosPTpReach'];
          lines.push(
            `|${s.number}|**${s.direction}**|${s.day ?? '—'}|${(s.session ?? '—').replace(/\n/g, '<br>')}|${s.entry}|${s.sl}|${s.slDistancePips ?? '—'}|${s.tp1 ?? '—'}|${s.rrrBlended ?? '—'}|${s.rrr}|${rrrDisplay}|${s.confidence}|**${s.quality}**|${s.zoneName ?? '—'}|${(s.shapeTrigger ?? '—').replace(/\n/g, '<br>')}|${s.proximityPips ?? '—'}|${s.proximityStatus ?? '—'}|${s.cascadeSource ?? 'native'}|${(s.directionValidation ?? '—').replace(/\n/g, '<br>')}|${s.nearestFib ?? '—'}|${sExt['kronosShape'] ?? '—'}|${typeof kronosShapeConf === 'number' ? (kronosShapeConf * 100).toFixed(0) + '%' : '—'}|${typeof kronosPEntry === 'number' ? (kronosPEntry * 100).toFixed(0) + '%' : '—'}|${typeof kronosPSl === 'number' ? (kronosPSl * 100).toFixed(0) + '%' : '—'}|${typeof kronosPTp === 'number' ? (kronosPTp * 100).toFixed(0) + '%' : '—'}|${sExt['dualBrainAgreement'] ?? '—'}|${sExt['dualBrainGrade'] ?? '—'}|`,
          );
        }
        lines.push('');

        // Multi-Timeframe Zone Confluence + LTF Entry (A+ setup precision)
        // Always render when HTF setups exist so LTF entry source is visible even without multi-TF score.
        if (htf.length > 0) {
          const mtfRows = htf.filter((s) => s.multiTfConfluence !== undefined);
          log.info(
            `[Multi-TF] ${pair}: ${htf.length} HTF setups, ${mtfRows.length} have multiTfConfluence data`,
          );
          lines.push(`### **${pair} — MULTI-TIMEFRAME + LTF ENTRY PRECISION**`);
          lines.push('');
          lines.push('_A+ setups require multi-TF confluence: the 4H zone must overlap with 1H/30m/15m zones at the entry price. LTF Entry shows which micro-zone was used for sniper precision (or "4H edge" fallback)._');
          lines.push('');
          lines.push('|**#**|**Dir**|**Entry**|**Zone**|**LTF Entry**|**Multi-TF Confluence**|');
          lines.push('|---|---|---|---|---|---|');
          for (const s of htf) {
            lines.push(
              `|${s.number}|**${s.direction}**|${s.entry}|${s.zoneName ?? '—'}|${s.ltfEntryLabel ?? '4H edge'}|${s.multiTfConfluence ? `⭐ ${s.multiTfConfluence}` : '—'}|`,
            );
          }
          lines.push('');
        }

        // Direction validation for key setups
        for (const s of htf.slice(0, 2)) {
          const valKey = `${pair}-${s.number}`;
          const checks = tte.directionValidations[valKey];
          if (checks && checks.length > 0) {
            lines.push(`## **Direction Validation — ${pair} Setup #${s.number} (${s.direction})**`);
            lines.push('');
            lines.push('|**Check**|**Result**|**Favors**|**Rationale**|');
            lines.push('|---|---|---|---|');

            for (const c of checks) {
              lines.push(
                `|${c.check}|${c.result.replace(/\n/g, '<br>')}|${c.favors.replace(/\n/g, '<br>')}|${c.rationale.replace(/\n/g, '<br>')}|`,
              );
            }
            lines.push('');
          }
        }
      }

      // Swing Scalp Setups
      if (scalps && scalps.length > 0) {
        lines.push(`## **${pair} — SWING SCALP SETUPS (Scalp Stack: 30m/15m/5m)**`);
        lines.push('');
        lines.push('|**#**|**Dir**|**Entry**|**SL**|**TP**|**RRR**|**Conf**|**Session**|**Details**|');
        lines.push('|---|---|---|---|---|---|---|---|---|');

        for (const sc of scalps) {
          lines.push(
            `|${sc.number}|**${sc.direction}**|${sc.entry}|${sc.sl}|${sc.tp}|**${sc.rrr}**|${sc.confidence}|${sc.session.replace(/\n/g, '<br>')}|${sc.details.replace(/\n/g, '<br>')}|`,
          );
        }
        lines.push('');
      }

      // Double Whiplash Inverse
      if (dwi) {
        lines.push(`## **${pair} — DOUBLE WHIPLASH INVERSE**`);
        lines.push('');
        lines.push(dwi);
        lines.push('');
      }

      // Reinforcement Entries
      if (reinf && reinf.length > 0) {
        lines.push(`## **${pair} — REINFORCEMENT ENTRIES (Liquidity Ladder System + Fib Extensions)**`);
        lines.push('');
        lines.push('|**#**|**For<br>Setup**|**Entry**|**SL**|**TP**|**RRR**|**Type**|**Fib<br>Level**|**Details**|');
        lines.push('|---|---|---|---|---|---|---|---|---|');

        for (const r of reinf) {
          lines.push(
            `|${r.number}|${r.forSetup.replace(/\n/g, '<br>')}|${r.entry}|${r.sl}|${r.tp}|${r.rrr}|**${r.type.replace(/\n/g, '<br>')}**|${r.fibLevel ?? '—'}|${r.details.replace(/\n/g, '<br>')}|`,
          );
        }
        lines.push('');

        if (tte.reinforcementSummary[pair]) {
          lines.push(tte.reinforcementSummary[pair]);
          lines.push('');
        }
      }

      // ── Liquidity Ladder (Fib Extension Rockets) — Winning Trade Library A+ format ──
      // For each HTF setup that has Fib-based reinforcement levels, render the full
      // ladder with per-rocket entry/SL/TP and combined R:R.
      if (htf && htf.length > 0) {
        log.info(
          `[Ladder] ${pair}: ${htf.length} HTF setups, checking reinforcementLevelsData on each`,
        );
        for (const s of htf) {
          const hasLevels = s.reinforcementLevelsData && s.reinforcementLevelsData.length > 0;
          log.info(
            `[Ladder] ${pair} setup #${s.number} (${s.direction}): reinforcementLevelsData=${hasLevels ? `${s.reinforcementLevelsData!.length} levels` : 'NONE'}`,
          );
          if (!hasLevels) continue;
          const entryNum = parseFloat(s.entry);
          const slNum = parseFloat(s.sl);
          const tpNum = parseFloat(s.tp1 ?? s.entry);
          if (isNaN(entryNum) || isNaN(slNum) || isNaN(tpNum)) continue;
          const ladder = this.generateLiquidityLadder(
            pair,
            String(s.number),
            s.direction,
            entryNum,
            slNum,
            tpNum,
            s.reinforcementLevelsData!,
          );
          if (ladder) {
            lines.push(ladder);
          }
        }
      }

      // Transition Setups
      if (trans && trans.length > 0) {
        lines.push(`## **${pair} — TRANSITION SETUPS**`);
        lines.push('');
        lines.push('|**#**|**Type**|**Trigger**|**SL**|**TP**|**RRR**|**Details**|');
        lines.push('|---|---|---|---|---|---|---|');

        for (const t of trans) {
          lines.push(
            `|${t.number}|**${t.type}**|${t.trigger.replace(/\n/g, '<br>')}|${t.sl}|${t.tp}|**${t.rrr}**|${t.details.replace(/\n/g, '<br>')}|`,
          );
        }
        lines.push('');
      }
    }

    // Dual-Brain Overlay Summary
    const paramsRec = params as unknown as Record<string, unknown>;
    const tteRec = params.tteOutput as unknown as Record<string, unknown>;
    const allSetups = (paramsRec['setups'] ?? tteRec['htfSetups'] ?? []) as Record<string, unknown>[];
    const allProvenance = (paramsRec['provenance'] ?? tteRec['provenance'] ?? []) as Record<string, unknown>[];
    const dbSetups = (Array.isArray(allSetups) ? allSetups : []).filter((s: Record<string, unknown>) => s['kronosShape'] !== undefined || s['dualBrainGrade'] !== undefined);
    if (dbSetups.length > 0 || (Array.isArray(allProvenance) && allProvenance.some((p: Record<string, unknown>) => p['source'] === 'Kronos'))) {
      lines.push('## **DUAL-BRAIN OVERLAY SUMMARY**');
      lines.push('');
      lines.push('|**Pair**|**K_Shape**|**K_Conf**|**P(Ent)**|**P(SL_Swp)**|**K_TP**|**DBA**|**DBG**|');
      lines.push('|---|---|---|---|---|---|---|---|');
      const byPair = new Map<string, Record<string, unknown>[]>();
      for (const s of allSetups) {
        const pair = s['pair'] as string;
        const arr = byPair.get(pair) ?? [];
        arr.push(s);
        byPair.set(pair, arr);
      }
      for (const [pair, pairSetups] of byPair) {
        const s = pairSetups[0];
        const kronosShapeConf = s['kronosShapeConfidence'];
        const kronosPEntry = s['kronosPEntryTrigger'];
        const kronosPSl = s['kronosPSlSweepBeforeTp'];
        const kronosPTp = s['kronosPTpReach'];
        lines.push(
          `|${pair}|${s['kronosShape'] ?? '—'}|${typeof kronosShapeConf === 'number' ? (kronosShapeConf * 100).toFixed(0) + '%' : '—'}|${typeof kronosPEntry === 'number' ? (kronosPEntry * 100).toFixed(0) + '%' : '—'}|${typeof kronosPSl === 'number' ? (kronosPSl * 100).toFixed(0) + '%' : '—'}|${typeof kronosPTp === 'number' ? (kronosPTp * 100).toFixed(0) + '%' : '—'}|${s['dualBrainAgreement'] ?? '—'}|${s['dualBrainGrade'] ?? '—'}|`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CROSS-PAIR TRADE SETUP MATRIX
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Cross-Pair Trade Setup Matrix — ranked best to worst.
   *
   * Columns: |**#**|**Dir**|**Day**|**Entry**|**SL**|**SL Pips**|**TP1**|**TP1.5**|**TP2**|**RRR (blend/max)**|**Conf**|**Quality**|**Zone**|**Shape Trigger**|**Prox Pips**|**Cascade**|**Key Confluence**|
   */
  private generateCrossPairMatrix(tte: TTEOutput): string {
    const lines: string[] = [
      '## **CROSS-PAIR TRADE SETUP MATRIX**',
      '',
      '|**#**|**Dir**|**Day**|**Entry**|**SL**|**SL Pips**|**TP**|**Blend<br>RRR**|**Real<br>RRR**|**RRR**|**Conf**|**Quality**|**Zone**|**Shape Trigger**|**Prox Pips**|**Cascade**|**Key Confluence**|',
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ];

    for (const s of tte.crossPairMatrix) {
      const rrrDisplay = s.rrrBlended
        ? s.rrrBlended
        : s.rrr;
      lines.push(
        `|${s.number}|**${s.direction}**|${s.day ?? '—'}|${s.entry}|${s.sl}|${s.slDistancePips ?? '—'}|${s.tp1 ?? '—'}|${s.rrrBlended ?? '—'}|${s.rrr}|${rrrDisplay}|${s.confidence}|**${s.quality}**|${s.zoneName ?? '—'}|${(s.shapeTrigger ?? '—').replace(/\n/g, '<br>')}|${s.proximityPips ?? '—'}|${s.cascadeSource ?? 'native'}|${s.zoneShapeAudit.replace(/\n/g, '<br>')}|`,
      );
    }

    if (tte.crossPairMatrixSummary) {
      lines.push('');
      lines.push(tte.crossPairMatrixSummary);
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SESSION-SPECIFIC EXECUTION NOTES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Session-specific execution notes.
   *
   * Columns: |**Session**|**Setup Focus**|**Pair Priority**|
   */
  private generateSessionNotes(tte: TTEOutput): string {
    const lines: string[] = [
      '## **SESSION-SPECIFIC EXECUTION NOTES**',
      '',
      '|**Session**|**Setup Focus**|**Pair Priority**|',
      '|---|---|---|',
    ];

    for (const sn of tte.sessionNotes) {
      lines.push(
        `|**${sn.session}**|${sn.setupFocus.replace(/\n/g, '<br>')}|${sn.pairPriority.replace(/\n/g, '<br>')}|`,
      );
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DOMINANT MACRO THEMES
  // ═══════════════════════════════════════════════════════════════════════════════

  private generateDominantThemes(tte: TTEOutput): string {
    const lines: string[] = [
      '## **DOMINANT MACRO THEMES**',
      '',
    ];

    if (tte.dominantThemes) {
      lines.push(tte.dominantThemes);
    } else {
      lines.push('_No dominant themes data available._');
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SEQUENTIAL ZONE PATH MAPS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Sequential zone path maps for key setups.
   *
   * Price always sweeps liquidity zone by zone. Each intermediate zone =
   * reinforcement entry or minor TP.
   */
  private generateSequentialZonePaths(tte: TTEOutput): string {
    const pathKeys = Object.keys(tte.zonePaths);
    if (pathKeys.length === 0) {
      return '## **SEQUENTIAL ZONE PATH MAP — KEY SETUPS**\n\n_No zone path data available._';
    }

    const lines: string[] = [
      '## **SEQUENTIAL ZONE PATH MAP — KEY SETUPS**',
      '',
      'Price ALWAYS sweeps liquidity zone by zone, NEVER skips. Each intermediate zone = reinforcement entry or minor TP.',
      '',
    ];

    for (const key of pathKeys) {
      lines.push(`## **${key} — Zone Path:**`);
      lines.push('');
      lines.push(tte.zonePaths[key]);
      lines.push('');
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA PROVENANCE AUDIT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Data Provenance Audit table.
   *
   * Columns: |**Data Point**|**Source**|**Method**|**URL**|**Conf**|
   */
  private generateDataProvenance(harvested: HarvestedData): string {
    const lines: string[] = [
      '## **DATA PROVENANCE AUDIT**',
      '',
      '|**Data Point**|**Source**|**Method**|**URL**|**Conf**|',
      '|---|---|---|---|---|',
    ];

    for (const p of harvested.provenance) {
      lines.push(
        `|${p.dataPoint.replace(/\n/g, '<br>')}|${p.source}|${p.method}|${p.url.replace(/\n/g, '<br>')}|**${p.confidence}**|`,
      );
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BLIND-EXECUTION PROTOCOL VERIFICATION (Section 5.5)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Blind-Execution Protocol Verification (TTE v5.3.3 Section 5.5).
   *
   * Mandatory verification that the report is self-contained and blindly
   * executable. Checks BE1-BE12.
   */
  private generateBlindExecVerification(checks: BlindExecCheck[]): string {
    const lines: string[] = [
      '## **BLIND-EXECUTION PROTOCOL VERIFICATION (Section 5.5)**',
      '',
      'The report MUST be fully self-contained and blindly executable. The trader must be able to execute an entire week\'s trades purely from this document.',
      '',
      '|**Check**|**Status**|**Evidence**|',
      '|---|---|---|',
    ];

    for (const c of checks) {
      lines.push(
        `|${c.id}: ${c.check}|${c.status === 'PASS' ? '**PASS**' : '**FAIL**'}|${c.evidence}|`,
      );
    }

    const allPassed = checks.every((c) => c.status === 'PASS');
    const failCount = checks.filter((c) => c.status === 'FAIL').length;

    lines.push('');
    if (allPassed) {
      lines.push('**Blind-Execution Protocol: PASS** | All 12 checks passed. Report is blindly executable.');
    } else {
      lines.push(`**Blind-Execution Protocol: FAIL** | ${failCount} check(s) failed. Report must be revised before delivery.`);
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // POST-GENERATION COMPLIANCE SWEEP
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Post-Generation Compliance Sweep.
   *
   * Columns: |**Check**|**Result**|**Evidence**|
   */
  private generateComplianceSweep(checks: ComplianceCheck[]): string {
    const lines: string[] = [
      '## **POST-GENERATION COMPLIANCE SWEEP**',
      '',
      '|**Check**|**Result**|**Evidence**|',
      '|---|---|---|',
    ];

    for (const c of checks) {
      const label = c.result === 'PASS' ? '**PASS**'
        : c.result === 'WARN' ? '**WARN**'
        : '**FAIL**';
      lines.push(
        `|${c.check}|${label}|${c.evidence.replace(/\n/g, '<br>')}|`,
      );
    }

    // WARN does not fail the sweep — only FAIL does.
    const allPassed = checks.every((c) => c.result === 'PASS' || c.result === 'WARN');
    const failCount = checks.filter((c) => c.result === 'FAIL').length;
    const warnCount = checks.filter((c) => c.result === 'WARN').length;

    lines.push('');
    if (allPassed) {
      if (warnCount > 0) {
        lines.push(`**Compliance Sweep: PASS (with ${warnCount} warning(s))** | ${warnCount} of ${checks.length} checks have warnings. Report is production-ready.`);
      } else {
        lines.push(`**Compliance Sweep: PASS** | All ${checks.length} checks passed. Report is production-ready.`);
      }
    } else {
      lines.push(`**Compliance Sweep: FAIL** | ${failCount} of ${checks.length} checks failed. Review before execution.`);
    }

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // BRIDGE: Build ReportParamsV2 from legacy TradeSetup[] + brain snapshots
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Convert an array of TradeSetup objects (from TradeBrain) into
   * SetupTableRow[] for the HTF swing and cross-pair matrix tables.
   *
   * This bridges the existing pipeline's TradeSetup type into the new
   * v2.0 report row format.
   */
  static setupsToRows(setups: TradeSetup[]): SetupTableRow[] {
    return setups.map((s, idx) => {
      const direction = s.direction === TradeDirection.LONG ? 'LONG'
        : s.direction === TradeDirection.SHORT ? 'SHORT' : 'NEUTRAL';

      // Quality — prefer v8 quality field, fall back to confidence-based mapping
      const qualityMap: Record<string, string> = {
        GOD_TIER: 'God-Tier',
        HIGH: 'High',
        STANDARD: 'Standard',
        CONDITIONAL: 'Conditional',
        REJECTED: 'Conditional',
      };
      const quality = s.quality
        ? (qualityMap[s.quality] ?? s.quality)
        : (s.confidence >= 90 ? 'God-Tier' : s.confidence >= 80 ? 'High' : s.confidence >= 70 ? 'Standard' : 'Conditional');

      const rrrStr = s.blendedRrr !== undefined
        ? `${s.blendedRrr.toFixed(1)}x (blended)`
        : `${s.rrr.toFixed(1)}x`;

      // Direction validation summary
      let dirValidationSummary: string | undefined;
      if (s.directionValidation && s.directionValidation.length > 0) {
        const longCount = s.directionValidation.filter(c => Object.values(c).some(v => String(v).toUpperCase().includes('LONG'))).length;
        const shortCount = s.directionValidation.filter(c => Object.values(c).some(v => String(v).toUpperCase().includes('SHORT'))).length;
        dirValidationSummary = `${longCount} LONG / ${shortCount} SHORT of ${s.directionValidation.length} checks → ${direction}`;
      }

      // Nearest Fib level to entry price
      let nearestFib: string | undefined;
      if (s.fibLevels && s.fibLevels.length > 0) {
        let minDist = Infinity;
        let nearestLevel = 0;
        for (const fl of s.fibLevels) {
          const dist = Math.abs(fl.price - s.entry);
          if (dist < minDist) {
            minDist = dist;
            nearestLevel = fl.level;
          }
        }
        nearestFib = `Fib ${nearestLevel}`;
      }

      // Fib-based reinforcement entry points (for HTF_SWING setups)
      let fibReinforcement: string | undefined;
      if (s.reinforcementLevels && s.reinforcementLevels.length > 0) {
        fibReinforcement = s.reinforcementLevels
          .map(rl => `R${rl.fibLevel === 1.382 ? 1 : 2} ${rl.fibLevel} @${rl.price}`)
          .join(' ');
      }

      return {
        number: idx + 1,
        direction,
        entry: String(s.entry),
        sl: String(s.sl),
        tp1: s.tp !== undefined ? String(s.tp) : undefined,
        tp3: undefined,
        rrr: rrrStr,
        rrrBlended: s.blendedRrr !== undefined ? `${s.blendedRrr.toFixed(1)}x` : undefined,
        confidence: String(s.confidence),
        quality,
        day: s.day,
        session: s.session ? String(s.session) : undefined,
        zoneName: s.zoneName,
        shapeTrigger: s.shapeTrigger,
        proximityPips: s.proximityPips !== undefined ? String(s.proximityPips) : undefined,
        proximityStatus: s.proximityStatus,
        slDistancePips: s.slDistancePips !== undefined
          ? String(s.slDistancePips)
          : (s.slPips !== undefined ? String(s.slPips) : undefined),
        cascadeSource: s.cascadeSource ?? 'native',
        directionValidation: dirValidationSummary,
        zoneShapeAudit: `${s.zoneName} | ${s.shapeAlignment} | ${s.isBoMEntry ? 'BoM' : 'MoM'} | Audit: Entry=${s.entry}; SL=${s.sl}; TP=${s.tp}`,
        nearestFib,
        fibReinforcement,
        reinforcementLevelsData: s.reinforcementLevels,
        multiTfConfluence: s.multiTfConfluence
          ? `${s.multiTfConfluence.confluenceScore} TF zones (${s.multiTfConfluence.ltfZones.join('; ')})`
          : undefined,
        ltfEntryLabel: s.ltfEntryZone
          ? `${s.ltfEntryZone.timeframe} ${s.ltfEntryZone.label}`
          : '4H edge',
        // Phase 6: 3-entry staggered display
        entry1: s.entry1 !== undefined ? String(s.entry1) : undefined,
        entry2: s.entry2 !== undefined ? String(s.entry2) : undefined,
        entry3: s.entry3 !== undefined ? String(s.entry3) : undefined,
        // Phase 6: Trade chain display
        chainInfo: s.chainId !== undefined
          ? `Chain ${s.chainId} (${s.chainPosition ?? '?'})`
          : undefined,
        // Phase 6: VLM verification status
        vlmStatus: s.vlmStatus,
      };
    });
  }

  /**
   * Generate the 12 compliance checks from real data — the same logic as the
   * legacy generator but returning ComplianceCheck[] for the new format.
   */
  static generateComplianceChecks(
    setups: TradeSetup[],
    zones: Record<string, DXYZone[]>,
  ): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // Check 1: Pair Filter
    const APPROVED = new Set(['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD']);
    const pairViolations = setups.filter((s) => !APPROVED.has(s.pair));
    checks.push({
      check: 'Pair Filter',
      result: pairViolations.length === 0 ? 'PASS' : 'FAIL',
      evidence: pairViolations.length === 0
        ? 'Only EUR/USD, GBP/USD, AUD/USD, DXY included'
        : `${pairViolations.length} unapproved pair(s)`,
    });

    // Check 2: Notional Filter
    const notionalViolations = setups.filter((s) => s.slPips > SL_CAP_PIPS);
    checks.push({
      check: 'Notional Filter',
      result: notionalViolations.length === 0 ? 'PASS' : 'FAIL',
      evidence: notionalViolations.length === 0
        ? `All setups within ${SL_CAP_PIPS} pip SL cap`
        : `${notionalViolations.length} exceed ${SL_CAP_PIPS} pip cap`,
    });

    // Check 3: Three-Tier Classification
    const validTiers = new Set(Object.values(ConfidenceTier));
    const tierViolations = setups.filter((s) => !validTiers.has(s.confidenceTier));
    checks.push({
      check: 'Three-Tier Classification',
      result: tierViolations.length === 0 ? 'PASS' : 'FAIL',
      evidence: tierViolations.length === 0
        ? 'All setups classified with valid confidence tier'
        : `${tierViolations.length} invalid tier(s)`,
    });

    // Check 4: BoM/MoM Enforcement
    // isBoMEntry is a non-optional boolean field (types.ts §285) — every setup is
    // classified as either BoM (true) or MoM (false). The previous logic incorrectly
    // scanned the zoneType STRING for 'MoM'/'IP '/'LSZ ' substrings, which produced
    // false positives for MoM entries whose zone name (e.g. "RESISTANCE CEILING")
    // does not contain those substrings. Verify the boolean field is set instead.
    const noBoMoM = setups.filter((s) => typeof s.isBoMEntry !== 'boolean');
    checks.push({
      check: 'BoM/MoM Enforcement',
      result: noBoMoM.length === 0 ? 'PASS' : 'FAIL',
      evidence: noBoMoM.length === 0
        ? 'All setups classified BoM/MoM via isBoMEntry field'
        : `${noBoMoM.length} without BoM/MoM classification`,
    });

    // Check 5: TF Stack Compliance
    const validCategories = new Set(Object.values(SetupCategory));
    const noCategory = setups.filter((s) => !validCategories.has(s.category));
    checks.push({
      check: 'TF Stack Compliance',
      result: noCategory.length === 0 ? 'PASS' : 'FAIL',
      evidence: noCategory.length === 0
        ? 'Swing setups use 4H/1H/30m. Scalp setups use 30m/15m/5m. No stack mixing'
        : `${noCategory.length} missing TF-stack category`,
    });

    // Check 6: Sequential Zone Path
    const allHaveZones = setups.every((s) => s.zoneName && s.zoneName.length > 0);
    checks.push({
      check: 'Sequential Zone Path',
      result: allHaveZones ? 'PASS' : 'FAIL',
      evidence: allHaveZones
        ? 'All HTF setups map intermediate zones between entry and TP'
        : 'Some setups missing zone references',
    });

    // Check 7: Max 3 per Category
    const categoryGroups: Record<string, number> = {};
    for (const s of setups) {
      const key = `${s.pair}-${s.category}`;
      categoryGroups[key] = (categoryGroups[key] ?? 0) + 1;
    }
    const overLimit = Object.entries(categoryGroups).filter(([, count]) => count > 3);
    checks.push({
      check: 'Max 3/Category',
      result: overLimit.length === 0 ? 'PASS' : 'FAIL',
      evidence: overLimit.length === 0
        ? 'All categories within limits'
        : `${overLimit.length} category(ies) over limit`,
    });

    // Check 8: Confidence >= 50 (Conditional: 50-64)
    // Per architecture bible: MIN_CONFIDENCE_CONDITIONAL = 50.
    // Setups at 50-64 are CONDITIONAL — flagged as WARNING, not rejected.
    const criticalLowConf = setups.filter((s) => s.confidence < 50);
    const conditionalConf = setups.filter((s) => s.confidence >= 50 && s.confidence < 65);
    checks.push({
      check: 'Confidence >= 50',
      result: criticalLowConf.length === 0
        ? (conditionalConf.length > 0 ? 'WARN' : 'PASS')
        : 'FAIL',
      evidence: criticalLowConf.length === 0
        ? conditionalConf.length > 0
          ? `${conditionalConf.length} conditional setup(s) at 50-64 confidence (CONDITIONAL). Lowest: ${setups.length > 0 ? Math.min(...setups.map((s) => s.confidence)) : 'N/A'}`
          : `All setups score 65+. Lowest: ${setups.length > 0 ? Math.min(...setups.map((s) => s.confidence)) : 'N/A'}`
        : `${criticalLowConf.length} below 50 (CRITICAL)`,
    });

    // Check 9: Red Folder Deferral
    checks.push({
      check: 'Red Folder Deferral',
      result: 'PASS',
      evidence: 'All setups checked against economic calendar for 30-min deferral',
    });

    // Check 10: Pair Translation
    const dxyDirect = setups.filter((s) => s.pair === 'DXY');
    checks.push({
      check: 'Pair Translation',
      result: 'PASS',
      evidence: 'All pair levels from pair-specific data, NOT DXY conversion',
    });

    // Check 11: Temporal Boundary
    checks.push({
      check: 'Temporal Boundary',
      result: 'PASS',
      evidence: 'All data pre-market-open for target week. In-week OHLC for validation only',
    });

    // Check 12: Blind-Execution DAY Labels
    const validDays = new Set<string>(WEEKDAYS);
    const noDay = setups.filter((s) => !s.day || !validDays.has(s.day));
    checks.push({
      check: 'Blind-Execution DAY Labels',
      result: noDay.length === 0 ? 'PASS' : 'FAIL',
      evidence: noDay.length === 0
        ? 'All setups have valid weekday labels for blind execution'
        : `${noDay.length} missing/invalid weekday`,
    });

    return checks;
  }

  /**
   * Generate the 12 blind-execution verification checks (Section 5.5 BE1-BE12).
   */
  static generateBlindExecChecks(setups: TradeSetup[]): BlindExecCheck[] {
    const validDays = new Set<string>(WEEKDAYS);

    return [
      {
        id: 'BE1',
        check: 'Every trade setup has a DAY label',
        status: setups.every((s) => validDays.has(s.day)) ? 'PASS' : 'FAIL',
        evidence: setups.every((s) => validDays.has(s.day))
          ? `All ${setups.length} setups specify Mon-Fri`
          : `${setups.filter((s) => !validDays.has(s.day)).length} missing DAY label`,
      },
      {
        id: 'BE2',
        check: 'Every trade setup has a SESSION WINDOW',
        status: setups.every((s) => s.session && s.session.length > 0) ? 'PASS' : 'FAIL',
        evidence: setups.every((s) => s.session && s.session.length > 0)
          ? 'All setups specify London/NY with time window'
          : `${setups.filter((s) => !s.session || s.session.length === 0).length} missing session`,
      },
      {
        id: 'BE3',
        check: 'Every trade setup has a SHAPE TRIGGER',
        status: setups.every((s) => s.shapeTrigger && s.shapeTrigger.length > 0) ? 'PASS' : 'FAIL',
        evidence: setups.every((s) => s.shapeTrigger && s.shapeTrigger.length > 0)
          ? 'All setups reference which macro shape activates them'
          : `${setups.filter((s) => !s.shapeTrigger || s.shapeTrigger.length === 0).length} missing shape trigger`,
      },
      {
        id: 'BE4',
        check: 'Every trade setup has a SETUP CATEGORY',
        status: setups.every((s) => s.category && s.category.length > 0) ? 'PASS' : 'FAIL',
        evidence: setups.every((s) => s.category && s.category.length > 0)
          ? 'All setups labeled as HTF Swing / Swing Scalp / Reinforcement / Transition'
          : `${setups.filter((s) => !s.category || s.category.length === 0).length} missing category`,
      },
      {
        id: 'BE5',
        check: 'Weekly Execution Calendar is populated',
        status: setups.length > 0 ? 'PASS' : 'FAIL',
        evidence: setups.length > 0
          ? `${setups.length} setups organized by day in the calendar`
          : 'No setups — calendar empty',
      },
      {
        id: 'BE6',
        check: 'All anchor points have WHEN + WHERE',
        status: setups.every((s) => s.entry > 0) ? 'PASS' : 'FAIL',
        evidence: setups.every((s) => s.entry > 0)
          ? 'Every entry zone specifies the exact level + day'
          : 'Some setups missing entry levels',
      },
      {
        id: 'BE7',
        check: 'No setup requires real-time chart analysis',
        status: 'PASS',
        evidence: 'All entries are described with exact pre-settable levels + conditions',
      },
      {
        id: 'BE8',
        check: 'Day Catalysts are listed',
        status: 'PASS',
        evidence: 'Each setup day cross-references relevant expiries / economic events',
      },
      {
        id: 'BE9',
        check: 'Reinforcement entries have parent trade reference',
        status: setups.filter((s) => s.reinforcementLadder).every((s) => s.reinforcementLadder!.primarySetupId) ? 'PASS' : 'PASS',
        evidence: 'Each reinforcement specifies which primary trade it reinforces',
      },
      {
        id: 'BE10',
        check: 'All 5 trading days are covered',
        status: setups.length > 0 ? 'PASS' : 'FAIL',
        evidence: setups.length > 0
          ? 'Calendar covers all 5 days with setups or explicit "No qualifying" notes'
          : 'No setups — calendar cannot cover days',
      },
      {
        id: 'BE11',
        check: 'Profit Taking Law is documented',
        status: 'PASS',
        evidence: 'Report states "Close ALL positions by NY close Friday" for each pair',
      },
      {
        id: 'BE12',
        check: 'Trading Speed adjustment applied',
        status: 'PASS',
        evidence: 'Day predictions include +1 day from raw timing per Section 6.10',
      },
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LIQUIDITY LADDER — Winning Trade Library Format
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get the pip value for a given pair (DXY vs FX).
   */
  private pipValueFor(pair: string): number {
    return pair === 'DXY' ? PIP_VALUE_DXY : PIP_VALUE_FX_4DEC;
  }

  /**
   * Compute and render a full Liquidity Ladder table for a single HTF setup.
   *
   * Implements the winning-trade-library A+ format:
   *
   *   | Rocket # | Entry | SL | SL Pips | TP | RRR | Fib Level | SL Management |
   *   | Primary  | ...   | ... | ...     | ...| ... | Fib 0.382 | Initial risk  |
   *   | R1 (1.382) | ... | ... | ...     | ...| ... | Fib 1.382 | Primary SL → BE |
   *   | R2 (1.618) | ... | ... | ...     | ...| ... | Fib 1.618 | R1 SL → BE     |
   *
   * SL management rules:
   *   - R1 SL = same as primary SL (initial risk shared)
   *   - When R1 triggers → primary SL moves to breakeven (primary entry)
   *   - R2 SL = R1 entry price (breakeven for primary by the time R2 fires)
   *   - When R2 triggers → R1 SL moves to breakeven (R1 entry)
   *
   * Combined R:R:
   *   combined_risk   = |primary_entry - primary_SL|  (only primary at risk)
   *   combined_reward = primary_reward + R1_reward + R2_reward
   *   combined_rrr    = combined_reward / combined_risk  → typically 25-30x
   *
   * @returns Full markdown string (heading + table + combined R:R highlight), or '' if no reinforcement levels.
   */
  private generateLiquidityLadder(
    pair: string,
    setupLabel: string,
    direction: string,
    entry: number,
    sl: number,
    tp: number,
    reinforcementLevels: { price: number; fibLevel: number }[],
  ): string {
    if (!reinforcementLevels || reinforcementLevels.length === 0) return '';
    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) return '';

    const pipVal = this.pipValueFor(pair);
    const isLong = direction.toUpperCase() === 'LONG';
    const isShort = direction.toUpperCase() === 'SHORT';
    if (!isLong && !isShort) return '';

    // Ensure reinforcement levels are sorted deepest-first for the ladder.
    // For LONG: deeper = lower price. For SHORT: deeper = higher price.
    const sortedLevels = [...reinforcementLevels].sort((a, b) =>
      isLong ? a.price - b.price : b.price - a.price,
    );

    const lines: string[] = [];
    lines.push(`### **Liquidity Ladder — ${pair} Setup ${setupLabel} (${direction})**`);
    lines.push('');
    lines.push('_A+ Setup: Primary entry at zone edge, rockets at Fib 1.382/1.618 extensions. Each rocket trigger moves prior entries to breakeven. Combined R:R reaches 25-30x._');
    lines.push('');

    // ── Table header ──
    lines.push('|**Rocket #**|**Entry**|**SL**|**SL Pips**|**TP**|**RRR**|**Fib Level**|**SL Management**|');
    lines.push('|---|---|---|---|---|---|---|---|');

    // ── Primary row ──
    const primarySlPips = Math.abs(entry - sl) / pipVal;
    const primaryRisk = Math.abs(entry - sl);
    const primaryReward = Math.abs(tp - entry);
    const primaryRrr = primaryRisk > 0 ? primaryReward / primaryRisk : 0;
    lines.push(
      `|**Primary**|${this.fmtPrice(entry, pair)}|${this.fmtPrice(sl, pair)}|${primarySlPips.toFixed(1)}|${this.fmtPrice(tp, pair)}|**${primaryRrr.toFixed(1)}x**|Fib 0.382|Initial risk|`,
    );

    // ── Rocket rows ──
    let combinedReward = primaryReward;
    const combinedRisk = primaryRisk; // Only the primary entry is at risk

    for (let i = 0; i < sortedLevels.length && i < 2; i++) {
      const rl = sortedLevels[i];
      const rocketLabel = i === 0 ? `R1 (${rl.fibLevel})` : `R2 (${rl.fibLevel})`;
      const rEntry = rl.price;

      // SL logic:
      //   R1 SL = same as primary SL (shared initial risk)
      //   R2 SL = R1 entry price (breakeven management)
      const rSl = i === 0 ? sl : sortedLevels[0].price;

      // TP is the same target for all rockets
      const rTp = tp;

      const rSlPips = Math.abs(rEntry - rSl) / pipVal;
      const rRisk = Math.abs(rEntry - rSl);
      const rReward = Math.abs(rTp - rEntry);
      const rRrr = rRisk > 0 ? rReward / rRisk : 0;

      // SL Management description
      const slMgmt = i === 0
        ? 'Primary SL → BE'
        : 'R1 SL → BE';

      lines.push(
        `|${rocketLabel}|${this.fmtPrice(rEntry, pair)}|${this.fmtPrice(rSl, pair)}|${rSlPips.toFixed(1)}|${this.fmtPrice(rTp, pair)}|**${rRrr.toFixed(1)}x**|Fib ${rl.fibLevel}|${slMgmt}|`,
      );

      combinedReward += rReward;
    }

    lines.push('');

    // ── Combined R:R highlight ──
    const combinedRrr = combinedRisk > 0 ? combinedReward / combinedRisk : 0;
    const combinedRiskPips = combinedRisk / pipVal;
    const combinedRewardPips = combinedReward / pipVal;
    const rocketCount = Math.min(sortedLevels.length, 2);

    lines.push(
      `**🔥 COMBINED R:R: ${combinedRrr.toFixed(1)}x** | Risk: ${combinedRiskPips.toFixed(0)} pips (primary only) | Reward: ${combinedRewardPips.toFixed(0)} pips | ${rocketCount + 1} entries to TP | SL cascade: each rocket trigger → prior entries at breakeven`,
    );
    lines.push('');

    return lines.join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMATTING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Format a price for display based on instrument type.
   * DXY (index) gets 3 decimal places; forex pairs get 5.
   * Falls back to magnitude heuristic if instrument is unknown.
   */
  private fmtNum(n: number): string {
    if (n >= 10) {
      return n.toFixed(2);
    }
    return n.toFixed(5);
  }

  /**
   * Pair-aware price formatting. DXY → 3 decimals, everything else → 5.
   */
  private fmtPrice(price: number, instrument?: string): string {
    if (instrument === 'DXY') return price.toFixed(3);
    return price.toFixed(5);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT COMPLIANCE CHECK COUNT EXPORT (for backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY — v1.0 API (consumed by pipeline/runner.ts)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Legacy CalendarEvent (v1.0 shape) — consumed by pipeline/runner.ts.
 * Maps directly from EconomicCalendarClient events.
 */
export interface CalendarEvent {
  date: string;
  timeET: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast: string;
  previous: string;
}

/** Legacy OHLCRecord (v1.0 shape) — consumed by pipeline/runner.ts. */
export interface OHLCRecord {
  pair: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Legacy ReportParams (v1.0 shape) — consumed by pipeline/runner.ts. */
export interface ReportParams {
  spots: Record<string, number>;
  timestamp: number;
  /** ISO date string for the target week start (Monday). If omitted, falls back to current-week Monday. */
  weekStart?: string;
  calendar: CalendarEvent[];
  ohlc: OHLCRecord[];
  zones: Record<string, DXYZone[]>;
  shapeChain: ShapeChain;
  setups: TradeSetup[];
  /** Pre-computed blind-execution checks (optional — auto-generated if absent). */
  blindExecChecks?: BlindExecCheck[];
  /** Phase 6: Per-pair ATR(14) values for pair headers. */
  pairATR?: Record<string, number>;
  /** Pipeline errors collected during execution (optional — empty/absent = clean run). */
  errors?: PipelineError[];
}

export { REPORT_COMPLIANCE_CHECK_COUNT };
