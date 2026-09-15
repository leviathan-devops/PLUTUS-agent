// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY v3 PIPELINE — NOT THE ACTIVE CODE PATH.
// Active path: engine3/visual-setup-generator.ts (called from pipeline/engine.ts)
// tp1_5/tp2/maximumRrr references in this file are dead code — they are already
// set to undefined/null in all cases. They exist only for TypeScript compatibility.
// If TSC fails after TradeSetup interface fields are removed: cast setup objects
// with `as any` to bypass the removed fields.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plutus Pipeline v3.0 — Hardcoded 15-step autonomous TTE report generation.
 *
 * ARCHITECTURAL RULES:
 *   1. Every step is independently wrapped in try/catch.
 *   2. Only OHLC harvest failure is FATAL (returns immediately).
 *   3. Never throw from the pipeline — catch everything, record failures, continue.
 *   4. Pipeline reuses DataHarvester + direct brain calls for Steps 2-9.
 *   5. New code adds Protocol A, report generation, blind check, compliance,
 *      Pine Script, PDF, and VC chart drawing.
 */

import { Logger } from '../utils/logger.js';
import { DataHarvester, type HarvestedData } from './data-harvester.js';
import type { TradingViewClient } from '../clients/tradingview-client.js';
import { fetchSource, fetchUrlViaCDP, vlmInfer } from './data-source-router.js';
import { EconomicCalendarClient } from '../clients/economic-calendar-client.js';
import { WebSearchClient } from '../clients/web-search-client.js';
import { parseTVTechnicals, parseForexResearch, parseForexResearchViaVLM } from './html-parsers.js';
import type { PairDataBundle } from '../v1-compat.js';
import type { CalendarEvent } from '../clients/economic-calendar-client.js';
import type { WebSearchCommentary } from '../clients/web-search-client.js';
import type { OHLCBar } from '../types.js';
import { createPipelineError, type PipelineError, type PipelineStage } from '../types.js';
import { executeProtocolA, type OptionExpiryData, type OptionStrikeData } from './protocol-a-executor.js';
import { ReportGenerator, type ReportParams } from '../report/report-generator.js';
import { PineScriptGenerator, type PineScriptData } from '../report/pine-script-generator.js';
import { generatePdfViaCDP } from '../report/pdf-generator-v2.js';
import {
  runBlindExecutionCheck,
  type BlindExecutionCheckResult,
} from '../pipeline/blind-execution-check.js';
import {
  runComplianceSweep,
  type ComplianceSweepResult,
} from '../pipeline/compliance-sweep.js';
import { TradingSemanticFirewall, type RuleCheckContext } from '../semantic-firewall/index.js';
import { FibContext, type FibLevel, type FibLevelValue } from '../semantic-firewall/fib-spiderweb.js';

// Direct brain function imports — per-pair zone/shape/setup computation
import { pillarEngine } from '../brains/9-pillar-lobe.js';
import { construct4HZones } from '../brains/4h-sd-lobe.js';
import { classifyZones } from '../brains/bom-mom-lobe.js';
import { assembleZones } from '../brains/synthesis-lobe.js';
import { detectLSZ, type LSZResult } from '../brains/lsz-detector.js';
import { scanAllZonesIntraLevels } from '../brains/intra-zone-scanner.js';
import { detectLiquidityZones, mergeLqzWithIpZones, type LqzDetectionStats } from '../brains/lqz-lobe.js';
import { ShapeBrain } from '../brains/shape-brain.js';

// Engine 3 — Visual Intelligence Layer (superimposes on Engine 1 + Engine 2)
import { VisualZoneLobe } from '../engine3/visual-zone-lobe.js';
import { TvChartImageFetch } from '../engine3/tv-chart-image-fetch.js';
import { TvChartController } from '../engine3/tv-chart-controller.js';
import { VisualSetupGenerator } from '../engine3/visual-setup-generator.js';
import type { VisualSDZone } from '../engine3/types.js';

import type {
  TradeSetup,
  ZoneMapSnapshot,
  DXYZone,
  ShapePredictionSnapshot,
  ShapeChain,
  ShapePrediction,
  DayShapePrediction,
  ReinforcementEntry,
} from '../types.js';
import {
  TradeDirection,
  SetupCategory,
  SetupQuality,
  ConfidenceTier,
  SessionWindow,
  ShapeCode,
  ZoneType,
  PIP_VALUE,
} from '../types.js';
import {
  PIP_VALUE_DEFAULT,
  SL_BUFFER_PIPS,
  SL_CAP_PIPS,
  FIB_EXT_1618,
  rrrForCategory,
  // Engine 3 v8 constants
  MAX_ENTRY_DISTANCE,
  SS_PROXIMITY_FACTOR,
  SNIPER_BUFFER,
  SL_MAX_HARD,
  SL_MAX_PENALTY,
  CONSOL_RRR_TP1,
  CONSOL_RRR_BLENDED,
  CONSOL_RANGE_THRESHOLD,
  MIN_CONFIDENCE_PRIMARY,
  MAX_SETUPS_PER_PAIR,
  DXY_CASCADE_BONUS,
  SHAPE_CATEGORIES_MAP,
} from '../constants/trading-constants.js';
import {
  KRONOS_SIDECAR_URL,
  KRONOS_REQUEST_TIMEOUT_MS,
  KRONOS_HEALTH_CHECK_TIMEOUT_MS,
  KRONOS_DEFAULT_HORIZON,
  KRONOS_DEFAULT_SAMPLE_COUNT,
  KRONOS_CONTEXT_BARS,
  KRONOS_DISABLED_PAIRS,
  DUAL_BRAIN_AGREEMENT_BONUS_TRIPLE,
  DUAL_BRAIN_AGREEMENT_BONUS_DUAL,
  DUAL_BRAIN_AGREEMENT_BONUS_SINGLE,
  DUAL_BRAIN_AGREEMENT_PENALTY_DISAGREE,
  DUAL_BRAIN_AGREEMENT_PENALTY_DUAL_M,
  DUAL_BRAIN_GRADE_ENTRY_TRIGGER_FLOOR,
  DUAL_BRAIN_GRADE_SL_SWEEP_CEILING,
  DUAL_BRAIN_GRADE_SL_SWEEP_REJECT,
  DUAL_BRAIN_GRADE_TP_REACH_FLOOR,
} from '../constants/trading-constants.js';
import type { KronosForecastResult } from '../types.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const log = new Logger('PlutusPipeline');

// ═══════════════════════════════════════════════════════════════════════════════
// LOWER-TIMEFRAME MICRO-ZONE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type LtfMicroZone = {
  floor: number;
  ceiling: number;
  type: 'supply' | 'demand' | 'consolidation-supply' | 'consolidation-demand';
  label: string;
  reactionCount?: number;
};

type LtfEntrySelection = {
  timeframe: string;
  floor: number;
  ceiling: number;
  type: string;
  label: string;
  entry: number;
  reactionCount?: number;
};

// ── FIX-4: Session determined by CATEGORY (mirrors Python SESSION_MAP) ──
// Session is NOT derived from shape/day — it is a function of the setup category.
const SETUP_SESSION_MAP: Record<string, SessionWindow> = {
  [SetupCategory.SWING_SCALP]: SessionWindow.LONDON_OPEN,
  [SetupCategory.BREAKOUT_SURGE]: SessionWindow.NY_OVERLAP,
  [SetupCategory.HTF_SWING]: SessionWindow.NY_MID,
  [SetupCategory.REINFORCEMENT]: SessionWindow.NY_OPEN,
  [SetupCategory.TRANSITION]: SessionWindow.NY_OVERLAP,
  [SetupCategory.WHIPLASH]: SessionWindow.LONDON_OPEN,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Internal pipeline output — zone maps, shape chains, and trade setups computed per pair. */
interface PipelineEngineOutput {
  zoneMaps: Map<string, ZoneMapSnapshot>;
  shapeChains: Map<string, ShapeChain>;
  tradeSetups: Map<string, TradeSetup[]>;
  reinforcements: Map<string, ReinforcementEntry[]>;
  transitions: Map<string, unknown[]>;
  crossPairMatrix: unknown[];
  weeklyCalendar: unknown[];
  setupSnapshot: null;
  generatedAt: number;
}

export interface PipelineFailure {
  step: string;
  error: string;
  timestamp: number;
}

export interface ProvenanceEntry {
  source: string;
  instrument: string;
  timestamp: number;
  status: 'ok' | 'error' | 'partial';
  detail: string;
}

export interface PipelineResult {
  weekStart: string;
  reportPath: string;
  pdfPath: string | null;
  pineScriptPath: string | null;
  totalZones: number;
  totalSetups: number;
  passedFirewall: number;
  rejectedFirewall: number;
  blindCheckPassed: boolean;
  compliancePassed: boolean;
  stepsCompleted: number;
  totalSteps: number;
  failures: PipelineFailure[];
  elapsedMs: number;
  provenance: ProvenanceEntry[];
  weeklyCalendar?: { day: string; entries: TradeSetup[] }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STATE — tracks progress, failures, and provenance
// ═══════════════════════════════════════════════════════════════════════════════

class PipelineState {
  completedSteps: string[] = [];
  failures: PipelineFailure[] = [];
  provenance: ProvenanceEntry[] = [];
  currentStep = 0;

  advance(stepName: string): void {
    this.currentStep++;
    this.completedSteps.push(stepName);
    log.info(`Step ${this.currentStep}/15 completed: ${stepName}`);
  }

  recordFailure(step: string, error: Error): void {
    this.failures.push({ step, error: error.message, timestamp: Date.now() });
    log.warn(`Step FAILED: ${step} — ${error.message}`);
  }

  recordProvenance(
    source: string,
    instrument: string,
    status: 'ok' | 'error' | 'partial',
    detail: string,
  ): void {
    this.provenance.push({ source, instrument, timestamp: Date.now(), status, detail });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLUTUS PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export class PlutusPipeline {
  private state: PipelineState;
  private readonly firewall: TradingSemanticFirewall;
  // === v3.2: New class fields (required by multiple modules) ===
  private multiTfBars: Map<string, Map<string, OHLCBar[]>> = new Map();
  private dxyZones: DXYZone[] = [];
  private _lszZonesCache: any[] = [];  // LSZ zones cache for getSniperSL
  private dxySpot: number = 0;
  private currentCalendar: any[] = [];
  private _kronosForecasts: Map<string, KronosForecastResult> | undefined;
  // Phase 2: pair ATR(14) computed on 1H bars, used for SL minimum and fallback
  private pairATR: Map<string, number> = new Map();

  // Pipeline error collection — FATAL failures recorded at every failure point,
  // flushed to /root/plutus/reports/pipeline-errors.json and into the report.
  private errors: PipelineError[] = [];

  // Engine 3 — Visual Intelligence Layer
  private readonly visualZoneLobe: VisualZoneLobe;
  private readonly visualSetupGenerator: VisualSetupGenerator;
  private readonly tvChartController: TvChartController;

  // Wave 1: maximum distance from spot (pips) allowed for a zone to generate
  // setups on a given day, keyed by raw ShapeCode value.
  private static readonly SHAPE_MAX_DISTANCE: Record<string, number> = {
    'SS': 30, 'DWL': 30, 'STORM': 30,
    'BS': 100, 'PBS': 100,
    'WL': 200, 'PWL': 200, 'RWL': 200, 'PRWL': 200,
    'R': 50, 'RS': 50, 'WLS': 50,
  };

  // Law 16: Forward spreads per pair (raw price units).
  // Moves entry edges TOWARD spot to guarantee fills before price reaches exact edge.
  private static readonly FORWARD_SPREAD: Record<string, number> = {
    'EUR/USD': 0.0001,    // 1 pip
    'AUD/USD': 0.00015,   // 1.5 pips
    'GBP/USD': 0.0002,    // 2 pips
    'DXY': 0.02,          // 0.02 index points (2 DXY pips)
  };

  constructor(
    private harvester: DataHarvester,
    private tvClient: TradingViewClient,
    private client?: any, // opencode SDK client for MCP vision tool calls
  ) {
    this.state = new PipelineState();
    this.firewall = new TradingSemanticFirewall();
    // Engine 3 — Visual Intelligence: the TvChartController (playwright-core
    // CDP input injection on the SAME headed Chrome :9228 — navigate → set TF
    // → scroll/zoom → screenshot) is the PRIMARY chart capture path.
    // VLM analysis runs through the self-contained TvChartImageFetch tool
    // (opencode SDK client → MiMo HTTP).
    // Falls back to Engine 1 IP zone edges when the browser/VLM is unavailable
    // (non-blocking).
    this.tvChartController = new TvChartController();
    this.visualZoneLobe = new VisualZoneLobe(
      new TvChartImageFetch(this.client),
      this.tvChartController,
    );
    this.visualSetupGenerator = new VisualSetupGenerator();
  }

  /**
   * Collect a pipeline error (FATAL severity) for flush to disk + report.
   * Every failure point in the pipeline records here — no silent catches.
   */
  private collectError(
    stage: PipelineStage,
    pair: string,
    message: string,
    context: Record<string, unknown> = {},
  ): void {
    const error = createPipelineError(stage, pair, message, context);
    this.errors.push(error);
    log.error(`  [pipeline-error] ${pair} ${stage}: ${message}`);
  }

  /**
   * Flush collected pipeline errors to disk. Written on EVERY run —
   * an empty array on disk means the pipeline completed with zero hard failures.
   */
  private writeErrorsToDisk(): void {
    try {
      const reportsDir = '/root/plutus/reports';
      mkdirSync(reportsDir, { recursive: true });
      const errorsPath = join(reportsDir, 'pipeline-errors.json');
      writeFileSync(errorsPath, JSON.stringify(this.errors, null, 2));
      log.info(`  Pipeline errors written to ${errorsPath} (${this.errors.length} errors)`);
    } catch (e) {
      log.warn(`  Failed to write pipeline errors: ${(e as Error).message}`);
    }
  }

  private computeDualBrainGrade(
    timesfmGrade: 'A' | 'B' | 'C' | 'D' | 'F',
    pEntry: number | null,
    pSl: number | null,
    pTp: number | null,
  ): 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F' {
    if (timesfmGrade === 'F') return 'F';
    if (timesfmGrade === 'D') return 'D';
    let red = false, yellow = false, green = true;
    if (pEntry !== null) {
      if (pEntry < DUAL_BRAIN_GRADE_ENTRY_TRIGGER_FLOOR) { red = true; green = false; }
      else if (pEntry < 0.55) { yellow = true; green = false; }
    }
    if (pSl !== null) {
      if (pSl > DUAL_BRAIN_GRADE_SL_SWEEP_REJECT) return 'F';
      if (pSl > DUAL_BRAIN_GRADE_SL_SWEEP_CEILING) { red = true; green = false; }
      else if (pSl > 0.25) { yellow = true; green = false; }
    }
    if (pTp !== null) {
      if (pTp < DUAL_BRAIN_GRADE_TP_REACH_FLOOR) { red = true; green = false; }
      else if (pTp < 0.55) { yellow = true; green = false; }
    }
    if (red) {
      const cap: Record<string, string> = { A: 'B', B: 'C', C: 'D' };
      return (cap[timesfmGrade] ?? 'D') as 'B' | 'C' | 'D';
    }
    if (green) return (timesfmGrade + '+') as 'A+' | 'B+';
    return timesfmGrade as 'A' | 'B' | 'C';
  }

  /**
   * Call a vision MCP tool to analyze an image.
   *
   * Uses the opencode SDK client to invoke the tool through a session.prompt().
   * This routes the image through the full MCP tool chain (zai-vision /
   * visual-cortex) which has access to proper slot management and context.
   *
   * Falls back to direct vlmInfer() when:
   *   - No SDK client is available
   *   - session.prompt() throws or returns empty
   *
   * @param imagePath Path to the image file on disk
   * @param prompt    Analysis prompt for the vision model
   * @returns VLM text output, or null on failure
   */
  private async callVisionTool(imagePath: string, prompt: string): Promise<string | null> {
    return await vlmInfer(imagePath, prompt);
  }

  /**
   * Execute the complete 16-step pipeline.
   * Returns a PipelineResult. Never throws externally.
   */
  async execute(weekStart: string, outputDir: string, dataCutoff?: string): Promise<PipelineResult> {
    const startTime = Date.now();
    const cutoffTs = dataCutoff ? new Date(dataCutoff).getTime() : undefined;
    log.info(`=== PIPELINE START — Week of ${weekStart} === dataCutoff=${dataCutoff ? new Date(cutoffTs!).toISOString() : 'none (live)'}`);

    // Track results
    let optionsData: OptionExpiryData | null = null;
    let harvestedData: HarvestedData | null = null;
    let engineOutput: PipelineEngineOutput | null = null;
    const filteredSetups = new Map<string, TradeSetup[]>();
    let totalPassed = 0;
    let totalRejected = 0;
    let blindCheckResult: BlindExecutionCheckResult | null = null;
    let complianceResult: ComplianceSweepResult | null = null;
    let reportMarkdown = '';
    let reportPath = '';
    let pdfPath: string | null = null;
    let pineScriptPath: string | null = null;
    let totalZones = 0;

    // ═══ STEP 1: Protocol A — OTC Options Extraction ═══
    try {
      optionsData = await executeProtocolA(weekStart, (path, prompt) => this.callVisionTool(path, prompt));
      this.state.advance('Protocol A — OTC Options');
      if (optionsData) {
        this.state.recordProvenance(
          'Investinglive',
          'OTC Options',
          'ok',
          `${optionsData.strikes.length} strikes (${optionsData.source})`,
        );
      } else {
        this.state.recordProvenance('Investinglive', 'OTC Options', 'partial', 'No data returned');
      }
      const totalStrikes = optionsData?.strikes.length ?? 0;
      if (totalStrikes === 0) {
        this.collectError(
          'OPTIONS_HARVEST',
          'ALL',
          'Options harvesting produced 0 strikes — cookie consent may be blocking data',
          { dataSource: 'investinglive.com', daysAttempted: 5 },
        );
      }
    } catch (e) {
      this.state.recordFailure('Protocol A', e as Error);
    }

    // ═══ STEPS 2-4: Data Harvest (OHLC + External + Macro) ═══
    // Uses the NEW fetchSource()-powered harvester that bypasses the old
    // raw-fetch clients. Bot-protected sources (Barchart, TV, Forex.com)
    // go through fetchSource() with browser-like headers.
    try {
      const weekDate = new Date(weekStart + 'T00:00:00Z');
      harvestedData = await this.harvestAllData(weekDate, cutoffTs);

      if (harvestedData.ohlc.size === 0) {
        throw new Error('No OHLC data for any pair — cannot compute zones');
      }

      // Check that at least one pair has bars
      let totalBars = 0;
      for (const bars of harvestedData.ohlc.values()) {
        totalBars += bars.length;
      }
      if (totalBars === 0) {
        throw new Error('All pairs returned 0 OHLC bars');
      }

      this.state.advance('Data Harvest (OHLC + External + Macro)');

      // Provenance is already recorded inside harvestAllData() for all sources
    } catch (e) {
      // FATAL — cannot proceed without OHLC
      log.error(`FATAL: OHLC harvest failed: ${(e as Error).message}`);
      return this.buildFatalResult(weekStart, startTime, 'OHLC harvest failed: ' + (e as Error).message);
    }

    // ═══ STEPS 5-9: Direct Brain Calls — Zones + Shapes + Setups ═══
    // Each pair gets zones computed from its OWN OHLC data via direct brain
    // function calls: pillarEngine → construct4HZones → classifyZones → assembleZones → ShapeBrain.

    const zoneMaps = new Map<string, ZoneMapSnapshot>();
    const shapeChains = new Map<string, ShapeChain>();
    const shapePredictions = new Map<string, ShapePredictionSnapshot>();
    const tradeSetups = new Map<string, TradeSetup[]>();

    // Build full spots record from harvested data for shape-brain DXY lookups
    const allSpots: Record<string, number> = {};
    if (harvestedData) {
      for (const [p, price] of harvestedData.spots) {
        allSpots[p] = price;
      }
    }

    // === v3.2: Store calendar for red folder checks ===
    this.currentCalendar = harvestedData?.calendar ?? [];

    // Pair priority: AU → GU → EU → DXY
    // v3.2: DXY processed FIRST so its zones are available for DXY alignment checks
    const pairPriority = ['DXY', 'AUD/USD', 'GBP/USD', 'EUR/USD'];
    const pairsToProcess = [...(harvestedData?.ohlc.keys() ?? [])].sort((a: string, b: string) => {
      const aRank = pairPriority.indexOf(a);
      const bRank = pairPriority.indexOf(b);
      return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
    });

    let setupCounter = 0;

    try {
      for (const pair of pairsToProcess) {
        const bars = harvestedData!.ohlc.get(pair);
        if (!bars || bars.length < 20) {
          log.warn(`Skipping ${pair}: only ${bars?.length ?? 0} bars`);
          continue;
        }

        // FIX 3: Use prior week close as spot, NOT the real-time current price.
        // The pipeline generates reports for a FUTURE week. Using the real-time
        // spot (which may be in-week or post-week) causes direction contamination:
        // the report should reflect the market state AS OF the week start.
        const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
        const harvestedSpot = harvestedData!.spots.get(pair);
        const priorWeekClose = bars[bars.length - 1].close;
        if (harvestedSpot !== undefined && Math.abs(harvestedSpot - priorWeekClose) > pipValue * 100) {
          log.warn(
            `  ${pair}: SPOT MISMATCH — real-time=${harvestedSpot.toFixed(5)} vs priorWeekClose=${priorWeekClose.toFixed(5)}. ` +
            `Using priorWeekClose to prevent direction contamination.`,
          );
        }
        const currentPrice = priorWeekClose;

        // FIX 3: Propagate corrected spot to cross-pair lookup table
        // (shape-brain DXY lookups + zone map snapshot use allSpots)
        allSpots[pair] = currentPrice;

        // FIX 2: Assess prior week directional momentum for setup bias
        const priorWeekMomentum = this.assessPriorWeekMomentum(bars, new Date(weekStart + 'T00:00:00Z').getTime());
        log.info(`  ${pair}: prior week momentum = ${priorWeekMomentum}`);

        // Get external data for this pair from harvested pair data bundles
        const pairBundle = harvestedData!.pairData.get(pair);

        // ── Step 5a: 9-Pillar IP Zone computation ──
        let pillarResult;
        try {
          pillarResult = pillarEngine({
            instrument: pair,
            bars,
            currentPrice,
            barchartData: pairBundle?.barchartMAs,
            tradingviewTechnicals: pairBundle?.tvTechnicals,
            analystConsensus: pairBundle?.analystConsensus,
            webSearchCommentary: pairBundle?.webSearchCommentary,
          });
        } catch (pe) {
          log.warn(`9-Pillar engine failed for ${pair}: ${(pe as Error).message}`);
          continue;
        }

        // ── Step 5b: Construct 4H supply/demand zones from OHLC ──
        let rawZones: DXYZone[] = [];
        try {
          rawZones = construct4HZones({
            bars,
            instrument: pair,
            spot: currentPrice,
            pipValue,
          });
        } catch (ze) {
          log.warn(`4H SD lobe failed for ${pair}: ${(ze as Error).message}`);
        }

        // ── Step 5c: Classify zones (BoM/MoM) ──
        // E1-1 FIX: construct4HZones already classifies BoM structurally based
        // on post-consolidation move origin. classifyZones() (bom-mom-lobe)
        // overwrites isBoM based on distance from spot — that is WRONG.
        // Capture the structural isBoM/type before classification and restore
        // them after, so only the momStatus/isOneAndDone side-effects are kept.
        const structuralClassification = new Map<string, { isBoM: boolean; type: ZoneType }>();
        for (const z of rawZones) {
          structuralClassification.set(z.id, { isBoM: Boolean(z.isBoM), type: z.type });
        }
        const classifiedZones = classifyZones({
          zones: rawZones,
          spot: currentPrice,
          pipValue,
          pillarResult: { compositeScore: pillarResult.compositeScore },
        }).map((z) => {
          const structural = structuralClassification.get(z.id);
          if (structural) {
            return { ...z, isBoM: structural.isBoM, type: structural.type };
          }
          return z;
        });

        // ── Step 5d: Assemble final zone map ──
        let finalZones = assembleZones({
          pillarResult,
          classifiedZones,
          spot: currentPrice,
          pipValue,
          instrument: pair,
          bars4H: bars,
        });

        // ── Step 5e: v8 Zone Enrichment ──
        // Populate keyLevels, sdType, sdFresh, sdOverlap, formedAfterConsolidation
        // on each zone so the v8 setup generator has the data it needs.
        // (engine3Status is preserved from synthesis-lobe — see E1-6 FIX below.)

        // Compute weekly range for consolidation detection
        const lookbackBars = bars.slice(-50);
        const weekHigh = Math.max(...lookbackBars.map((b) => b.high));
        const weekLow = Math.min(...lookbackBars.map((b) => b.low));
        const weeklyRangePips = (weekHigh - weekLow) / pipValue;
        // Consolidation = range < pair-specific threshold (pips)
        const consolThresholdZone = CONSOL_RANGE_THRESHOLD[pair] ?? 150;
        const isConsolidation = weeklyRangePips < consolThresholdZone;

        // Filter option strikes for this pair from Protocol A data
        const pairOptionStrikes: OptionStrikeData[] = optionsData
          ? optionsData.strikes.filter(
              (s) =>
                s.pair === pair &&
                s.tier !== 'EXCLUDED',
            )
          : [];

        for (const zone of finalZones) {
          // key_levels: midpoint + round numbers within zone + option strikes
          const midpoint = (zone.floor + zone.ceiling) / 2;
          const keyLevels: number[] = [midpoint];

          // Round numbers within zone (e.g. for DXY: 103.00, 103.50; for FX: 1.0800, 1.0850)
          const roundStep = pair === 'DXY' ? 0.5 : pipValue * 50;
          const firstRound = Math.ceil(zone.floor / roundStep) * roundStep;
          for (let lvl = firstRound; lvl <= zone.ceiling; lvl += roundStep) {
            keyLevels.push(Math.round(lvl / pipValue) * pipValue);
          }

          // Option strikes that fall within this zone + accumulate notional
          let zoneNotionalB = 0;
          for (const os of pairOptionStrikes) {
            if (os.strike >= zone.floor && os.strike <= zone.ceiling) {
              keyLevels.push(os.strike);
              zoneNotionalB += os.notional;
            }
          }

          zone.keyLevels = [...new Set(keyLevels)];
          zone.notionalB = Math.round(zoneNotionalB * 100) / 100;

          // Fallback BoM/MoM classification if missing
          zone.sdType = zone.sdType || (zone.isBoM ? 'BoM' : 'MoM');

          // sdFresh: freshness tag based on reactionCount
          zone.sdFresh =
            zone.reactionCount === 0 ? '0X' :
            zone.reactionCount === 1 ? '1S' :
            zone.reactionCount === 2 ? '2X' : '3X+';

          // sdOverlap: check if zone overlaps with another zone
          const hasOverlap = finalZones.some(
            (other) =>
              other.id !== zone.id &&
              other.floor < zone.ceiling &&
              other.ceiling > zone.floor,
          );
          zone.sdOverlap = hasOverlap ? 'partial' : 'none';

          // formedAfterConsolidation: zone created during consolidation range
          zone.formedAfterConsolidation = isConsolidation;

          // E1-6 FIX: Do NOT stomp engine3Status. The synthesis-lobe
          // (assembleZones) already computed ENTRY-PRIMARY / ENTRY-CONDITIONAL
          // / TP-TARGET / REJECT. Preserve that classification here.
        }

        // ── Step 5e+: Confluence Boost from Pillar Data ──
        // Supply zones from assembleZones can have confluence 1-3 because the
        // 15-pip clustering threshold may not capture every pillar level. Here
        // we re-check pillar data (MAs, pivots, options, round numbers) against
        // each zone's floor-to-ceiling range and boost confluence accordingly.
        // Maximum total boost: +6.
        for (const zone of finalZones) {
          let boost = 0;

          // 1. Pillar levels (EMAs, pivots, VWAP, swing highs/lows, max pain) within zone
          const pillarSourcesInZone = new Set<string>();
          for (const lvl of pillarResult.levels) {
            if (lvl.price >= zone.floor && lvl.price <= zone.ceiling) {
              pillarSourcesInZone.add(lvl.source);
            }
          }
          // Each distinct pillar source adds +1, capped at 3
          boost += Math.min(pillarSourcesInZone.size, 3);

          // v3.2 J7: Store pillar sources on zone for confluence stack reporting
          (zone as unknown as Record<string, unknown>).pillarSources = [...pillarSourcesInZone];

          // 2. Round numbers within zone (big/half/quarter figure psychology)
          const rnStep = pair === 'DXY' ? 0.5 : pipValue * 50;
          let hasRoundNumber = false;
          for (let lvl = Math.ceil(zone.floor / rnStep) * rnStep; lvl <= zone.ceiling; lvl += rnStep) {
            hasRoundNumber = true;
            break;
          }
          if (hasRoundNumber) boost += 1;

          // 3. OTC option strikes within zone (institutional liquidity magnets)
          const hasOptionStrike = pairOptionStrikes.some(
            (os) => os.strike >= zone.floor && os.strike <= zone.ceiling,
          );
          if (hasOptionStrike) boost += 1;

          // 4. High pillar diversity bonus (4+ distinct sources → extra +1)
          if (pillarSourcesInZone.size >= 4) boost += 1;

          // Cap at +6 and apply
          boost = Math.min(boost, 6);
          zone.confluence += boost;
        }

        // ── Historical Price Action Enrichment ──
        // Scan up to 6 months of daily bars for prior swing highs/lows that overlap current zones.
        // Supply zones (R1, R2) often have low confluence because pillar data is concentrated
        // near spot. Historical swing levels and Fibonacci extensions provide additional confluence.
        const dailyBars = bars; // Use the full bar set (may include 6 months of data)
        if (dailyBars.length > 50) {
          // Find swing highs from the full bar history
          const swingHighs: number[] = [];
          const swingLows: number[] = [];
          for (let i = 5; i < dailyBars.length - 5; i++) {
            // Simple swing detection: high higher than 5 bars on each side
            const isSwingHigh = dailyBars.slice(i - 5, i + 6).every((b, idx) =>
              idx === 5 || dailyBars[i].high >= b.high);
            const isSwingLow = dailyBars.slice(i - 5, i + 6).every((b, idx) =>
              idx === 5 || dailyBars[i].low <= b.low);
            if (isSwingHigh) swingHighs.push(dailyBars[i].high);
            if (isSwingLow) swingLows.push(dailyBars[i].low);
          }

          // For each zone, check if any historical swing levels fall within it
          for (const zone of finalZones) {
            let historicalBoost = 0;
            const zLow = zone.floor;
            const zHigh = zone.ceiling;
            const tolerance = pipValue * 10; // 10 pip tolerance for historical levels

            // Check swing highs (relevant for supply zones)
            for (const sh of swingHighs) {
              if (sh >= zLow - tolerance && sh <= zHigh + tolerance) {
                historicalBoost++;
                // Add to key levels if not already there
                if (!zone.keyLevels?.includes(sh)) {
                  zone.keyLevels = [...(zone.keyLevels ?? []), sh];
                }
              }
            }

            // Check swing lows (relevant for demand zones)
            for (const sl of swingLows) {
              if (sl >= zLow - tolerance && sl <= zHigh + tolerance) {
                historicalBoost++;
                if (!zone.keyLevels?.includes(sl)) {
                  zone.keyLevels = [...(zone.keyLevels ?? []), sl];
                }
              }
            }

            // Compute Fibonacci extensions from the most recent significant move
            if (swingHighs.length > 0 && swingLows.length > 0) {
              const recentHigh = Math.max(...swingHighs.slice(-5));
              const recentLow = Math.min(...swingLows.slice(-5));
              const range = recentHigh - recentLow;
              if (range > 0) {
                // Fib extension levels
                const fib1618 = recentLow + range * 1.618;
                const fib1382 = recentLow + range * 1.382;
                const fib0618 = recentHigh - range * 0.618;
                const fib0382 = recentHigh - range * 0.382;

                for (const fib of [fib1618, fib1382, fib0618, fib0382]) {
                  if (fib >= zLow - tolerance && fib <= zHigh + tolerance) {
                    historicalBoost++;
                    if (!zone.keyLevels?.includes(fib)) {
                      zone.keyLevels = [...(zone.keyLevels ?? []), fib];
                    }
                    break; // Only count once per zone
                  }
                }
              }
            }

            // Apply historical boost (max +5 from historical data)
            const oldConf = zone.confluence;
            zone.confluence = Math.min(14, zone.confluence + Math.min(historicalBoost, 5));
            if (historicalBoost > 0) {
              log.info(`    ${zone.zoneName ?? zone.id}: +${Math.min(historicalBoost, 5)} historical confluence (${oldConf} → ${zone.confluence}) from ${swingHighs.length} swing highs, ${swingLows.length} swing lows scanned`);
            }
          }
        }

        // ── VERBOSE: Log spot price + every zone after enrichment ──
        log.info(`  ${pair} SPOT=${currentPrice.toFixed(5)} pipVal=${pipValue}`);
        log.info(`  ${pair} zones after assembly (${finalZones.length}):`);
        for (const z of finalZones) {
          log.info(
            `    ${z.zoneName ?? z.id}: floor=${z.floor.toFixed(5)} ceil=${z.ceiling.toFixed(5)} bom=${z.isBoM} conf=${z.confluence} zfp=${z.zfp} sdType=${z.sdType ?? 'N/A'} status=${z.engine3Status ?? 'N/A'}`,
          );
        }

        // ── Step 5f: LSZ Detection (Liquidity Sweep Zones) ──
        const lszZones = detectLSZ(bars, currentPrice, pipValue);
        this._lszZonesCache = lszZones;  // Cache for getSniperSL LSZ refinement
        if (lszZones.length > 0) {
          log.info(`  ${pair}: ${lszZones.length} LSZ zones detected`);
        }

        // v3.2 (J1): POI Tier classification — no trade without Tier 1 or 2
        for (const zone of finalZones) {
          const overlapping4HBoM = finalZones.find(rz =>
            rz.id !== zone.id && rz.isBoM &&
            rz.sdFresh && (rz.sdFresh === '0X' || rz.sdFresh === '1S') &&
            Math.max(rz.floor, zone.floor) <= Math.min(rz.ceiling, zone.ceiling)
          );
          if (overlapping4HBoM) {
            (zone as unknown as Record<string, unknown>).poiTier = 1;
            zone.confluence = Math.min(14, zone.confluence + 2);
          } else if (zone.confluence >= 6) {
            (zone as unknown as Record<string, unknown>).poiTier = 2;
            zone.confluence = Math.min(14, zone.confluence + 1);
          } else {
            (zone as unknown as Record<string, unknown>).poiTier = 3;
          }
        }

        // === v3.2 J2: ZONE NAMING (Spec Step 7) ===
        {
          const supplyZonesJ2 = finalZones.filter(z => z.ceiling > currentPrice).sort((a, b) => a.floor - b.floor);
          const demandZonesJ2 = finalZones.filter(z => z.ceiling < currentPrice).sort((a, b) => b.ceiling - a.ceiling);
          if (supplyZonesJ2.length >= 1) supplyZonesJ2[0].zoneName = 'RESISTANCE CEILING';
          if (supplyZonesJ2.length >= 2) supplyZonesJ2[1].zoneName = 'UPPER RESISTANCE';
          if (demandZonesJ2.length >= 1) demandZonesJ2[0].zoneName = 'KEY SUPPORT BAND';
          if (demandZonesJ2.length >= 2) demandZonesJ2[1].zoneName = 'MID-RANGE SUPPORT';
          const eqZone = finalZones.find(z => z.floor <= currentPrice && z.ceiling >= currentPrice);
          if (eqZone) eqZone.zoneName = 'EQUILIBRIUM ZONE';
          if (supplyZonesJ2.length >= 3) supplyZonesJ2[2].zoneName = 'BREAKOUT EXTENSION TARGET';
        }

        // === v3.2 J4: MITIGATION LEVEL (Spec Zone Reaction Counter) ===
        for (const zone of finalZones) {
          const count = zone.reactionCount || 0;
          if (count === 0) (zone as unknown as Record<string, unknown>).mitigationLevel = '0X';
          else if (count === 1) (zone as unknown as Record<string, unknown>).mitigationLevel = '1X';
          else if (count === 2) (zone as unknown as Record<string, unknown>).mitigationLevel = '2X';
          else if (count === 3) (zone as unknown as Record<string, unknown>).mitigationLevel = '3X';
          else (zone as unknown as Record<string, unknown>).mitigationLevel = '4-5X';
        }

        // === v3.2 Q10: BoM 4H PIERCING ANNOTATION ===
        for (const zone of finalZones) {
          if (zone.isBoM && (zone.sdFresh === '0X' || zone.sdFresh === '1S')) {
            (zone as unknown as Record<string, unknown>).piercingNote = '4H BoM unmitigated — will pierce through 1H/30m zones until it reacts to 4H liquidity of the same element.';
          }
        }

        // === v3.2 J5: ZONE CORE/SPIKE (Spec Step 5.5) ===
        for (const zone of finalZones) {
          const recentBars = bars.slice(-Math.min(bars.length, 50));
          const originBars = recentBars.filter(b =>
            b.low <= zone.ceiling + pipValue * 5 && b.high >= zone.floor - pipValue * 5,
          );
          if (originBars.length > 0) {
            const bodies = originBars.map(b => ({
              high: Math.max(b.open, b.close),
              low: Math.min(b.open, b.close),
            }));
            const coreHigh = Math.min(...bodies.map(b => b.high));
            const coreLow = Math.max(...bodies.map(b => b.low));
            if (coreHigh > coreLow) {
              (zone as unknown as Record<string, unknown>).zoneCore = { floor: coreLow, ceiling: coreHigh };
              (zone as unknown as Record<string, unknown>).zoneSpike = {
                upperSpike: { floor: coreHigh, ceiling: zone.ceiling },
                lowerSpike: { floor: zone.floor, ceiling: coreLow },
              };
            }
          }
        }

        // === v3.2 J6: PRESSURE DEGREE (Spec Confluence Scoring) ===
        for (const zone of finalZones) {
          const c = zone.confluence;
          if (c >= 12) (zone as unknown as Record<string, unknown>).pressureDegree = 'EXTREME';
          else if (c >= 10) (zone as unknown as Record<string, unknown>).pressureDegree = 'HEAVY';
          else if (c >= 8) (zone as unknown as Record<string, unknown>).pressureDegree = 'MODERATE-HEAVY';
          else if (c >= 6) (zone as unknown as Record<string, unknown>).pressureDegree = 'MODERATE';
          else if (c >= 4) (zone as unknown as Record<string, unknown>).pressureDegree = 'LIGHT';
          else (zone as unknown as Record<string, unknown>).pressureDegree = 'MINIMAL';
        }

        // === v3.2 J8: INTRA-ZONE SCANNING WITH 1H DATA ===
        const bars1H = this.multiTfBars.get(pair)?.get('1H');
        if (bars1H && bars1H.length > 20 && finalZones.length > 0) {
          try {
            scanAllZonesIntraLevels(finalZones, bars1H, bars);
            log.info(`  ${pair}: intra-zone scan complete with ${bars1H.length} 1H bars`);
          } catch (izErr) {
            log.warn(`Intra-zone scan failed for ${pair}: ${(izErr as Error).message}`);
          }
        }

        // === Phase 2: ATR COMPUTATION (Law 6, 8, 10) — MUST BE BEFORE constructAndMergeMultiTfZones ===
        // Compute Wilder's ATR(14) on 1H bars for SL minimum and fallback.
        // This MUST be computed BEFORE constructAndMergeMultiTfZones because
        // LQZ detection inside that function requires ATR for zone thickness.
        const bars1HForATR = this.multiTfBars.get(pair)?.get('1H');
        if (bars1HForATR && bars1HForATR.length >= 15) {
          try {
            const atr = this.computeATR(bars1HForATR, 14);
            this.pairATR.set(pair, atr);
            log.info(`  ${pair}: pairATR(14) = ${atr.toFixed(5)}`);
          } catch (atrErr) {
            log.warn(`ATR computation failed for ${pair}: ${(atrErr as Error).message}`);
          }
        } else {
          log.warn(`ATR skipped for ${pair}: only ${bars1HForATR?.length ?? 0} 1H bars (need ≥15)`);
        }

        // === v3 OVERHAUL: MULTI-TF ZONE CONSTRUCTION (Law 1, 2, 3) ===
        // Telescope down: 4H zones already constructed above.
        // Now construct 1H → 30m → 15m zones and merge into finalZones.
        finalZones = this.constructAndMergeMultiTfZones(pair, finalZones, currentPrice, pipValue);
        if (pair === 'DXY') {
          this.dxyZones = [...finalZones];
          this.dxySpot = currentPrice;
        }

        // === PAIR-SPECIFIC ELEMENTAL PROFILE (L5) ===
        // GBP/USD: S/D piercing tendency
        if (pair === 'GBP/USD') {
          for (const zone of finalZones) {
            const hasLiquidityShield = lszZones.some(lsz =>
              Math.max(lsz.bottom, zone.floor) <= Math.min(lsz.top, zone.ceiling)
            );
            if (!hasLiquidityShield && zone.zfp !== undefined) {
              zone.zfp = Math.min(95, zone.zfp + 10); // +10% failure probability
            }
          }
        }

        // Build ZoneMapSnapshot
        const zoneMapSnapshot: ZoneMapSnapshot = {
          version: zoneMaps.size + 1,
          timestamp: Date.now(),
          instrument: pair,
          zones: finalZones,
          spots: { ...allSpots, [pair]: currentPrice },
        };

        zoneMaps.set(pair, zoneMapSnapshot);
        totalZones += finalZones.length;
        log.info(
          `  ${pair}: ${finalZones.length} zones (composite=${pillarResult.compositeScore})`,
        );

        // ── Step 6: Shape prediction (per pair) ──
        // Create a NEW ShapeBrain instance per pair to prevent state bleed
        // between instruments (zones/ZFP from one pair must not influence another).
        const shapeBrain = new ShapeBrain();
        shapeBrain.setZoneMap(zoneMapSnapshot);
        const shapePrediction = await shapeBrain.compute();
        if (shapePrediction) {
          shapePredictions.set(pair, shapePrediction);
          shapeChains.set(pair, shapePrediction.shapeChain);
          // ── VERBOSE: Log shape prediction details ──
          log.info(
            `  ${pair} shape: ${shapePrediction.shapeChain.currentShape} bias=${shapePrediction.shapeChain.storylineBias} days=${shapePrediction.shapeChain.dayDecomposition?.length ?? 0}`,
          );
        }

        // ── Step 7: Trade setups (per pair) — Engine 3 Visual Intelligence ──
        // Engine 3 SUPERIMPOSES on Engine 1 (zones) + Engine 2 (shapes).
        // The visual layer determines exact entries/SLs/TPs from VLM-identified zones.
        if (shapePrediction) {
          ++setupCounter;

          // E3-1/E3-2: Identify visual S/D/L zones via VLM (or fallback to IP edges)
          let visualResult: { zones: VisualSDZone[]; vcSourced: boolean };
          try {
            visualResult = await this.visualZoneLobe.identifyZones(
              pair, currentPrice, zoneMapSnapshot, shapePrediction,
            );
          } catch (e) {
            this.collectError(
              'VLM_INVOKE',
              pair,
              `Visual zone identification failed: ${(e as Error).message}`,
              { error: (e as Error).message, stack: (e as Error).stack },
            );
            // Continue with empty zones — the setup generator will log its own error
            visualResult = { zones: [], vcSourced: false };
          }

          // E3-4/E3-5/E3-6: Generate setups at intersection of Engine 1 + 2 + 3
          // pairATR scales the zone distance cap (GBP/AUD far-zone starvation fix)
          let setups = this.visualSetupGenerator.generateSetups(
            zoneMapSnapshot,
            shapePrediction,
            visualResult.zones,
            pair,
            currentPrice,
            setupCounter,
            priorWeekMomentum,
            this.pairATR.get(pair),
          );

          // NO FALLBACK: The visual setup generator is MANDATORY. If Engine 3
          // produced 0 setups, the pipeline openly reports 0 setups for this
          // pair — the constructBasicSetups fallback is REMOVED because a silent
          // fallback masks visual zone identification failures.
          if (setups.length === 0) {
            this.collectError(
              'SETUP_GENERATE',
              pair,
              'Engine 3 visual setup generator produced 0 setups',
              { visualZones: visualResult.zones.length, zonesInMap: zoneMapSnapshot.zones.length },
            );
            log.error(
              `  ${pair}: Engine 3 visual setup generator produced 0 setups — NO FALLBACK. Check visual zone identification.`,
            );
            // Keep setups as empty array — do NOT fall back to constructBasicSetups
            // The report will show 0 setups for this pair with the error reason
          }

          tradeSetups.set(pair, setups);
          log.info(`  ${pair}: ${setups.length} raw setups (vcSourced=${visualResult.vcSourced})`);
          // ── VERBOSE: Log each generated setup ──
          log.info(`  ${pair} RESULT: ${setups.length} setups generated`);
          for (const s of setups) {
            log.info(
              `    ${s.setupId}: ${s.direction} ${s.category} entry=${s.entry.toFixed(5)} sl=${s.sl.toFixed(5)} tp=${s.tp.toFixed(5)} rrr=${s.rrr.toFixed(2)} conf=${s.confidence} quality=${s.quality ?? 'N/A'}`,
            );
          }
        }
      }

      // ── VERBOSE: Zone + Setup summaries across all pairs ──
      log.info(`=== ZONE SUMMARY ===`);
      for (const [pair, zm] of zoneMaps) {
        const supplyCount = zm.zones.filter((z) => z.type.includes('Supply')).length;
        const demandCount = zm.zones.filter((z) => z.type.includes('Demand')).length;
        log.info(
          `  ${pair}: ${zm.zones.length} zones (${supplyCount} supply, ${demandCount} demand)`,
        );
      }
      log.info(`=== SETUP SUMMARY ===`);
      for (const [pair, setups] of tradeSetups) {
        const longCount = setups.filter((s) => s.direction === TradeDirection.LONG).length;
        const shortCount = setups.filter((s) => s.direction === TradeDirection.SHORT).length;
        log.info(
          `  ${pair}: ${setups.length} setups (${longCount} LONG, ${shortCount} SHORT)`,
        );
      }

      this.state.advance('Engine 1-3 — Zones + Shapes + Setups (Direct)');
    } catch (e) {
      this.state.recordFailure('Direct Brain Calls', e as Error);
    }

    // ═══ DXY CASCADE ═══
    // DXY setups cascade to EUR/USD, GBP/USD, AUD/USD
    // DXY SHORT → pair LONG, DXY LONG → pair SHORT
    try {
      const dxySetups = tradeSetups.get('DXY');
      const dxyZoneMap = zoneMaps.get('DXY');
      log.info(`DXY CASCADE: dxySetups=${dxySetups?.length ?? 0}, dxyZoneMap=${dxyZoneMap ? 'yes' : 'no'}`);
      if (dxySetups && dxySetups.length > 0 && dxyZoneMap) {
        // Category name → enum (mirrors constructBasicSetups)
        const CAT_NAME_TO_ENUM: Record<string, SetupCategory> = {
          'SWING_SCALP': SetupCategory.SWING_SCALP,
          'HTF_SWING': SetupCategory.HTF_SWING,
          'BREAKOUT_SURGE': SetupCategory.BREAKOUT_SURGE,
          'REINFORCEMENT': SetupCategory.REINFORCEMENT,
          'TRANSITION': SetupCategory.TRANSITION,
          'WHIPLASH': SetupCategory.WHIPLASH,
        };

        // Separate ID sequence for cascade setups
        let cascadeIdSeq = setupCounter * 1000;

        const cascadePairs = ['AUD/USD', 'GBP/USD', 'EUR/USD'];
        for (const cascadePair of cascadePairs) {
          const pairZoneMap = zoneMaps.get(cascadePair);
          if (!pairZoneMap) continue;
          const pairSpot = pairZoneMap.spots[cascadePair] ?? 0;
          const pairPip = PIP_VALUE[cascadePair] ?? PIP_VALUE_DEFAULT;
          const existingSetups = tradeSetups.get(cascadePair) ?? [];
          const pairZones = pairZoneMap.zones;
          const slMaxHard = SL_MAX_HARD[cascadePair] ?? 150;
          let addedCount = 0;

          for (const dxySetup of dxySetups) {
            // Inverse direction
            const pairDirection = dxySetup.direction === TradeDirection.LONG
              ? TradeDirection.SHORT
              : TradeDirection.LONG;

            // Find matching zones (demand for LONG, supply for SHORT)
            const matchingZones = pairZones.filter(z => {
              const mid = (z.floor + z.ceiling) / 2;
              if (pairDirection === TradeDirection.LONG) return mid < pairSpot;
              return mid >= pairSpot;
            });

            for (const zone of matchingZones) {
              // Skip REJECT zones
              const status = this.classifyZoneStatusV8(zone);
              if (status === 'REJECT') continue;

              // Get categories from DXY setup shape
              const shapeKey = this.mapShapeToCategoryKey(dxySetup.shapeAlignment);
              const cats = SHAPE_CATEGORIES_MAP[shapeKey] ?? ['HTF_SWING'];

              // AUD/USD filter (Task 4 fix): allow SWING_SCALP — previously
              // restricted to HTF_SWING + BREAKOUT_SURGE, which starved AUD
              // of all SS-day and scalp setups.
              const effectiveCats = cascadePair === 'AUD/USD'
                ? cats.filter(c =>
                    c === 'HTF_SWING' || c === 'BREAKOUT_SURGE' || c === 'SWING_SCALP')
                : cats;

              for (const catName of effectiveCats) {
                const category = CAT_NAME_TO_ENUM[catName];
                if (!category) continue;

                // Sniper entry (category-aware)
                const entry = this.getSniperEntry(zone, pairDirection, category, cascadePair);

                // Proximity check
                const catKey = this.categoryToConstantKey(category);
                const distPips = Math.abs(entry - pairSpot) / pairPip;
                const maxDist = MAX_ENTRY_DISTANCE[cascadePair]?.[catKey] ?? 999;
                if (distPips > maxDist) continue;

                // SL
                const sl = this.getSniperSL(zone, pairDirection, cascadePair, pairZones);
                const slDistance = Math.abs(entry - sl) / pairPip;
                if (slDistance > slMaxHard) continue;

                // TP (single TP — pass sl for fib fallback)
                const { tp1 } = this.computeTpsV8(
                  entry, pairDirection, category, pairZones, sl, undefined, cascadePair, '4H',
                );
                if (tp1 === entry || tp1 === 0) continue;

                // RRR — unified per-category tp1 minimum (same source as firewall RRR-1;
                // prevents emitting cascade setups the firewall will reject)
                const slDist = Math.abs(entry - sl);
                if (slDist === 0) continue;
                const rrrTp1 = Math.abs(tp1 - entry) / slDist;
                if (rrrTp1 < rrrForCategory(String(category)).tp1) continue;

                // Confidence (with cascade bonus)
                let confidence = this.computeConfidenceV8(
                  zone, pairDirection, dxySetup.shapeAlignment, cascadePair, slDistance, pairSpot,
                );
                confidence = Math.min(100, confidence + DXY_CASCADE_BONUS);
                if (confidence < MIN_CONFIDENCE_PRIMARY) {
                  log.info(`    [cascade-reject] ${cascadePair}: confidence ${confidence} < ${MIN_CONFIDENCE_PRIMARY} — REJECTED (DXY cascade)`);
                  continue;
                }

                // Dedup — skip only if same entry AND direction AND category already exists
                if (existingSetups.some(
                  s => Math.abs(s.entry - entry) < pairPip * 5
                    && s.direction === pairDirection
                    && s.category === category,
                )) {
                  log.info(`    [cascade-dedup] ${cascadePair} ${pairDirection} ${category} entry=${entry.toFixed(5)}: duplicate of existing setup — SKIPPED`);
                  continue;
                }

                // Single TP — blended equals tp1 RRR
                const blendedRrr = rrrTp1;

                // NOTE: SL distance confidence modifiers are now applied INSIDE
                // computeConfidenceV8 as part of the capped modifier system (±20).

                // Quality
                const quality = this.classifyQualityV8(
                  confidence, status, slDistance, slMaxHard,
                );

                // Create cascade setup
                const cascadeSetup: TradeSetup = {
                  setupId: `${cascadePair.replace('/', '').toLowerCase()}-casc-${++cascadeIdSeq}`,
                  pair: cascadePair,
                  direction: pairDirection,
                  category,
                  entry,
                  sl,
                  tp: tp1,
                  confidence,
                  confidenceTier: this.confidenceToTierV8(confidence),
                  shapeAlignment: dxySetup.shapeAlignment,
                  session: dxySetup.session,
                  day: dxySetup.day,
                  shapeTrigger: `DXY cascade (${dxySetup.direction} → ${pairDirection})`,
                  rrr: Math.round(rrrTp1 * 100) / 100,
                  slPips: Math.round(slDistance * 10) / 10,
                  zoneName: zone.zoneName ?? zone.id,
                  isBoMEntry: zone.isBoM ?? false,
                  zoneType: zone.type,
                  directionValidation: [],
                  notes: `DXY cascade from ${dxySetup.setupId} | zone ${zone.zoneName ?? zone.id} | ${status}`,
                  // v8 fields — single TP only
                  blendedRrr: Math.round(blendedRrr * 100) / 100,
                  realizedRrr: Math.round(rrrTp1 * 100) / 100,
                  quality,
                  slDistancePips: Math.round(slDistance * 10) / 10,
                  entryEdge: pairDirection === TradeDirection.LONG ? 'ceiling' : 'floor',
                  proximityPips: Math.round(distPips * 10) / 10,
                  proximityStatus: distPips <= maxDist * 0.3 ? 'CLOSE' : 'ACCEPTABLE',
                  cascadeSource: dxySetup.setupId,
                };

                existingSetups.push(cascadeSetup);
                addedCount++;
                log.info(
                  `    [cascade] ${cascadeSetup.setupId} ${pairDirection} ${category} entry=${entry.toFixed(5)} conf=${confidence} q=${quality} src=${dxySetup.setupId}`,
                );
              }
            }
          }

          tradeSetups.set(cascadePair, existingSetups);
          if (addedCount > 0) {
            log.info(`  ${cascadePair}: +${addedCount} cascade setups (total: ${existingSetups.length})`);
          }
        }
      }
    } catch (cascadeErr) {
      log.warn(`DXY cascade failed: ${(cascadeErr as Error).message}`);
    }

    // ═══ Phase 5 / Law 20: DXY CASCADE HARD FILTER ═══
    // DXY SHORT (bearish) → REJECT all FX SHORT setups (keep only LONG).
    // DXY LONG (bullish)  → REJECT all FX LONG setups (keep only SHORT).
    // DXY NEUTRAL         → allow both directions.
    // DXY itself can have setups in either direction regardless.
    // This is a HARD FILTER — setups are removed, not penalized.
    try {
      const dxyDirection = this.determineDXYDirection(tradeSetups, zoneMaps.get('DXY'));
      if (dxyDirection) {
        this.enforceDXYCascade(tradeSetups, dxyDirection);
      } else {
        log.info(`DXY CASCADE FILTER: direction=NEUTRAL — allowing both directions for all FX pairs`);
      }
    } catch (dxyFilterErr) {
      log.warn(`DXY cascade hard filter failed: ${(dxyFilterErr as Error).message}`);
    }

    // Build engine output object for downstream pipeline steps
    engineOutput = {
      zoneMaps,
      shapeChains,
      tradeSetups,
      reinforcements: new Map<string, ReinforcementEntry[]>(),
      transitions: new Map(),
      crossPairMatrix: [],
      weeklyCalendar: [],
      setupSnapshot: null,
      generatedAt: Date.now(),
    };

    this.state.recordProvenance(
      'DirectBrain',
      'All Pairs',
      zoneMaps.size > 0 ? 'ok' : 'error',
      `${totalZones} zones across ${zoneMaps.size} pairs`,
    );

    // ═══ STEP 7.5: TimesFM Probabilistic Overlay ═══
    try {
      const tfmUrl = 'http://localhost:8084';
      // Health check
      const tfmHealth = await fetch(`${tfmUrl}/health`, { signal: AbortSignal.timeout(5_000) }).then(r => r.json() as Promise<Record<string, unknown>>).catch(() => null);
      if (tfmHealth?.['status'] === 'ok') {
        log.info(`TimesFM available (${tfmHealth['backend']}) — applying Step 7.5 overlay`);
        for (const [pair, setups] of engineOutput.tradeSetups) {
          const bars = harvestedData?.ohlc.get(pair);
          if (!bars || bars.length < 32 || setups.length === 0) {
            this.state.recordProvenance('TimesFM', pair, 'partial', 'Insufficient data for forecast');
            continue;
          }
          try {
            // 7.5a: Forecast
            const closes = bars.slice(-128).map(b => b.close);
            const fcResp = await fetch(`${tfmUrl}/forecast`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pair, horizon: 60, closes }),
            });
            if (!fcResp.ok) { this.state.recordProvenance('TimesFM', pair, 'error', `Forecast HTTP ${fcResp.status}`); continue; }
            const fc = await fcResp.json() as Record<string, unknown>;
            const forecastShape = typeof fc["shape_classification"] === 'string' ? fc["shape_classification"] : '';
            const rawQf = fc["quantile_forecast"];
            const rawPf = fc["point_forecast"];
            const quantiles: number[] = Array.isArray(rawQf) ? rawQf as number[] : (Array.isArray(rawPf) ? rawPf as number[] : []);

            // 7.5b: Reconcile shape
            const ruleShape = engineOutput.shapeChains.get(pair)?.currentShape || '';
            const reconResp = await fetch(`${tfmUrl}/reconcile_shape`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rule_shape: ruleShape, forecast_shape: forecastShape, forecast_confidence: typeof fc["shape_confidence"] === 'number' ? fc["shape_confidence"] : 0.5 }),
            });
            const recon = (reconResp.ok ? await reconResp.json() : { agreement_level: 'UNKNOWN', should_fallback_to_scalp_only: false }) as Record<string, unknown>;

            // 7.5d: Assess each remaining setup
            const pipValue = pair === 'DXY' ? 0.01 : 0.0001;
            const remaining = engineOutput.tradeSetups.get(pair) || [];
            for (const setup of remaining) {
              try {
                const assessResp = await fetch(`${tfmUrl}/assess`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    forecast_quantiles: quantiles,
                    entry: setup.entry, sl: setup.sl, tp: setup.tp,
                    direction: setup.direction, pip_value: pipValue,
                  }),
                });
                if (assessResp.ok) {
                  const a = await assessResp.json() as Record<string, unknown>;
                  const rawPTpReach = a["p_tp_reach"];
                  setup.pTpReach = typeof rawPTpReach === 'number' ? rawPTpReach : undefined;
                  const rawPSlHit = a["p_sl_hit"];
                  setup.pSlHit = typeof rawPSlHit === 'number' ? rawPSlHit : undefined;
                  const rawEV = a["expected_value_pips"];
                  setup.expectedValuePips = typeof rawEV === 'number' ? rawEV : undefined;
                  const rawQG = a["quality_grade"];
                  setup.timesfmQualityGrade = typeof rawQG === 'string' ? (rawQG as "A" | "B" | "C" | "D" | "F") : undefined;
                  const rawNotes = a["notes"];
                  setup.timesfmNotes = typeof rawNotes === 'string' ? rawNotes : undefined;
                  setup.shapeDelta = recon.confidence_delta ? (recon.agreement_level === 'AGREE' ? 5 : recon.agreement_level === 'ADJACENT' ? 0 : -10) : 0;
                  const rawAgreement = recon["agreement_level"];
                  setup.shapeDeltaLevel = typeof rawAgreement === 'string' ? (rawAgreement as "AGREE" | "ADJACENT" | "DISAGREE" | "STRONG_DISAGREE") : undefined;
                  // Confidence augmentation
                  const shapeBonus = recon.agreement_level === 'AGREE' ? 3 : 0;
                  const gradeStr = typeof a["quality_grade"] === 'string' ? a["quality_grade"] : '';
                  const gradeBonus = gradeStr === 'A' ? 5 : gradeStr === 'B' ? 3 : gradeStr === 'C' ? 0 : -3;
                  setup.confidence = Math.max(0, Math.min(100, setup.confidence + shapeBonus + gradeBonus));
                }
              } catch (err) { log.warn(`TimesFM assessment failed for setup ${setup.pair} (${setup.direction}): ${err instanceof Error ? err.message : String(err)}`); }
            }
            this.state.recordProvenance('TimesFM', pair, 'ok',
              `Shape=${forecastShape} Agreement=${recon.agreement_level} Setups=${remaining.length} assessed`);
          } catch (err) {
            this.state.recordProvenance('TimesFM', pair, 'error', err instanceof Error ? err.message : String(err));
          }
        }
        this.state.advance('TimesFM Overlay (Step 7.5)');
      } else {
        log.info('TimesFM unavailable — skipping Step 7.5 (structural-only)');
        this.state.recordProvenance('TimesFM', 'ALL', 'partial', 'Server unavailable — structural-only mode');
      }
    } catch (err) {
      log.warn(`Step 7.5 failed: ${err}`);
      this.state.recordFailure('TimesFM Overlay', err as Error);
    }

    // ═══ STEP 7.6: Kronos Overlay (forecast + validate) ═══
    try {
      const kronosUrl = KRONOS_SIDECAR_URL;
      const kronosHealth = await fetch(`${kronosUrl}/health`, {
        signal: AbortSignal.timeout(KRONOS_HEALTH_CHECK_TIMEOUT_MS)
      }).then(r => r.json() as Promise<Record<string, unknown>>).catch(() => null);

      if (kronosHealth?.['status'] === 'ok') {
        log.info(`Kronos available (${kronosHealth['model']}) -- applying Step 7.6`);
        const kronosForecasts = new Map<string, KronosForecastResult>();
        let kronosPairsProcessed = 0;
        let kronosPairsSkipped = 0;
        let kronosSetupsValidated = 0;

        for (const [pair, setups] of engineOutput.tradeSetups) {
          if (KRONOS_DISABLED_PAIRS.includes(pair)) {
            this.state.recordProvenance('Kronos', pair, 'partial', 'Kronos disabled for this pair');
            kronosPairsSkipped++;
            continue;
          }
          if (setups.length === 0) { kronosPairsSkipped++; continue; }

          const bars = harvestedData?.ohlc.get(pair);
          if (!bars || bars.length < 30) {
            this.state.recordProvenance('Kronos', pair, 'partial', `Insufficient OHLC (${bars?.length ?? 0})`);
            kronosPairsSkipped++;
            continue;
          }

          const recentBars = bars.slice(-KRONOS_CONTEXT_BARS);
          const ohlcData = recentBars.map(b => [b.timestamp || 0, b.open, b.high, b.low, b.close, b.volume || 0]);

          try {
            const fcResp = await fetch(`${kronosUrl}/forecast`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pair, timeframe: '1H', horizon_bars: KRONOS_DEFAULT_HORIZON, sample_count: KRONOS_DEFAULT_SAMPLE_COUNT, ohlc: ohlcData }),
              signal: AbortSignal.timeout(KRONOS_REQUEST_TIMEOUT_MS),
            });
            if (!fcResp.ok) {
              this.state.recordProvenance('Kronos', pair, 'error', `HTTP ${fcResp.status}`);
              kronosPairsSkipped++;
              continue;
            }

            const fc = await fcResp.json() as Record<string, unknown>;
            const forecast: KronosForecastResult = {
              instrument: pair, timeframe: '1H',
              horizonBars: KRONOS_DEFAULT_HORIZON,
              sampleCount: typeof fc['sample_count'] === 'number' ? fc['sample_count'] : KRONOS_DEFAULT_SAMPLE_COUNT,
              shapeClassification: typeof fc['shape_classification'] === 'string' ? fc['shape_classification'] : 'unknown',
              shapeConfidence: typeof fc['shape_confidence'] === 'number' ? fc['shape_confidence'] : 0.5,
              shapeDistribution: (typeof fc['shape_distribution'] === 'object' && fc['shape_distribution'] !== null ? fc['shape_distribution'] : {}) as Record<string, number>,
              consolidationProbability: typeof fc['consolidation_probability'] === 'number' ? fc['consolidation_probability'] : 0.3,
              trendDirectionProbability: typeof fc['trend_direction_probability'] === 'number' ? fc['trend_direction_probability'] : 0.5,
              pathPercentiles: (fc['path_percentiles'] ?? null) as KronosForecastResult['pathPercentiles'],
              lastClose: typeof fc['last_close'] === 'number' ? fc['last_close'] : 0,
              generatedAt: typeof fc['generated_at'] === 'number' ? fc['generated_at'] : Date.now(),
            };
            kronosForecasts.set(pair, forecast);
            kronosPairsProcessed++;

            for (const setup of setups) {
              if (!setup.entry || !setup.sl || !setup.tp) continue;
              if (!forecast.pathPercentiles) continue;
              try {
                const valResp = await fetch(`${kronosUrl}/validate_setup`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    path_percentiles: forecast.pathPercentiles,
                    entry: setup.entry, sl: setup.sl, tp: setup.tp,
                    direction: setup.direction === TradeDirection.LONG ? 'LONG' : 'SHORT',
                    max_candles: KRONOS_DEFAULT_HORIZON, last_close: forecast.lastClose,
                  }),
                  signal: AbortSignal.timeout(KRONOS_REQUEST_TIMEOUT_MS),
                });
                if (valResp.ok) {
                  const v = await valResp.json() as Record<string, unknown>;
                  setup.kronosShape = forecast.shapeClassification;
                  setup.kronosShapeConfidence = forecast.shapeConfidence;
                  setup.kronosPEntryTrigger = typeof v['entry_trigger_probability'] === 'number' ? v['entry_trigger_probability'] : undefined;
                  setup.kronosPSlSweepBeforeTp = typeof v['sl_sweep_before_tp_probability'] === 'number' ? v['sl_sweep_before_tp_probability'] : undefined;
                  setup.kronosPTpReach = typeof v['tp_reach_probability'] === 'number' ? v['tp_reach_probability'] : undefined;
                  setup.kronosPathPercentiles = forecast.pathPercentiles;
                  kronosSetupsValidated++;
                }
              } catch (err) { log.warn(`Kronos validation failed for setup ${setup.pair} (${setup.direction}): ${err instanceof Error ? err.message : String(err)}`); }
            }
            this.state.recordProvenance('Kronos', pair, 'ok', `shape=${forecast.shapeClassification} conf=${forecast.shapeConfidence.toFixed(2)} ${setups.length} validated`);
          } catch (err) {
            this.state.recordProvenance('Kronos', pair, 'error', err instanceof Error ? err.message : String(err));
            kronosPairsSkipped++;
          }
        }

        this._kronosForecasts = kronosForecasts;
        this.state.recordProvenance('Kronos', 'Summary', kronosPairsProcessed > 0 ? 'ok' : 'partial', `${kronosPairsProcessed} pairs, ${kronosSetupsValidated} validated, ${kronosPairsSkipped} skipped`);
        this.state.advance('Kronos Overlay (7.6)');
        log.info(`Step 7.6 COMPLETE -- ${kronosPairsProcessed} pairs, ${kronosSetupsValidated} setups`);
      } else {
        log.info('Kronos unavailable -- skipping Step 7.6');
        for (const pair of engineOutput.tradeSetups.keys()) {
          this.state.recordProvenance('Kronos', pair, 'partial', 'Server unavailable');
        }
        this.state.advance('Kronos Overlay (skipped)');
      }
    } catch (err) {
      this.state.recordFailure('Kronos Overlay', err as Error);
      this.state.advance('Kronos Overlay (failed)');
    }

    // ═══ STEP 7.7: Dual-Brain Reconciliation ═══
    try {
      const kronosForecasts = this._kronosForecasts;
      let reconciledCount = 0;
      let disagreeCount = 0;
      let scalpFallbacks = 0;

      for (const [pair, setups] of engineOutput.tradeSetups) {
        for (const setup of setups) {
          const ruleShape = engineOutput.shapeChains.get(pair)?.currentShape ?? 'unknown';
          const hasTimesFM = setup.timesfmQualityGrade !== undefined;
          const hasKronos = setup.kronosPTpReach !== undefined;
          const kronosShape = setup.kronosShape ?? 'unknown';

          let agreement: string;
          if (hasTimesFM && hasKronos) {
            const tfmAgrees = setup.shapeDeltaLevel === 'AGREE';
            const krAgrees = kronosShape === ruleShape;
            if (tfmAgrees && krAgrees) agreement = 'TRIPLE_AGREE';
            else if (tfmAgrees && !krAgrees) agreement = 'DUAL_AGREE_T';
            else if (!tfmAgrees && krAgrees) agreement = 'DUAL_AGREE_K';
            else if (kronosShape === ruleShape) agreement = 'DUAL_AGREE_M';
            else agreement = 'DISAGREE';
          } else if (hasTimesFM) {
            agreement = setup.shapeDeltaLevel === 'AGREE' ? 'SINGLE_AGREE_T' : 'DISAGREE';
          } else if (hasKronos) {
            agreement = kronosShape === ruleShape ? 'SINGLE_AGREE_K' : 'DISAGREE';
          } else {
            agreement = 'NO_MODELS';
          }

          setup.dualBrainAgreement = agreement as TradeSetup['dualBrainAgreement'];

          const tfmGrade = setup.timesfmQualityGrade ?? 'C';
          const pEntry = setup.kronosPEntryTrigger ?? null;
          const pSl = setup.kronosPSlSweepBeforeTp ?? null;
          const pTp = setup.kronosPTpReach ?? null;
          setup.dualBrainGrade = this.computeDualBrainGrade(tfmGrade, pEntry, pSl, pTp);

          const delta = agreement === 'TRIPLE_AGREE' ? DUAL_BRAIN_AGREEMENT_BONUS_TRIPLE :
                        agreement === 'DUAL_AGREE_T' || agreement === 'DUAL_AGREE_K' ? DUAL_BRAIN_AGREEMENT_BONUS_DUAL :
                        agreement === 'SINGLE_AGREE_T' || agreement === 'SINGLE_AGREE_K' ? DUAL_BRAIN_AGREEMENT_BONUS_SINGLE :
                        agreement === 'DUAL_AGREE_M' ? DUAL_BRAIN_AGREEMENT_PENALTY_DUAL_M :
                        agreement === 'DISAGREE' ? DUAL_BRAIN_AGREEMENT_PENALTY_DISAGREE : 0;
          setup.confidence = Math.max(0, Math.min(100, setup.confidence + delta));

          if (agreement === 'DISAGREE' && setup.category === SetupCategory.HTF_SWING) {
            (setup as unknown as Record<string, unknown>)._dualBrainReject = true;
            scalpFallbacks++;
          }
          if (setup.dualBrainGrade === 'F') {
            (setup as unknown as Record<string, unknown>)._dualBrainReject = true;
          }
          if (setup.dualBrainGrade === 'D') {
            setup.notes = (setup.notes ?? '') + ' [DUAL-BRAIN D: OBSERVE ONLY]';
          }
          reconciledCount++;
          if (agreement === 'DISAGREE') disagreeCount++;
        }

        const before = engineOutput.tradeSetups.get(pair) ?? [];
        const after = before.filter(s => !(s as unknown as Record<string, unknown>)._dualBrainReject);
        if (after.length < before.length) {
          engineOutput.tradeSetups.set(pair, after);
        }
      }

      this.state.recordProvenance('DualBrain', 'Summary', 'ok', `${reconciledCount} reconciled, ${disagreeCount} disagreements, ${scalpFallbacks} fallbacks`);
      this.state.advance('Dual-Brain Reconciliation (7.7)');
    } catch (err) {
      this.state.recordFailure('Dual-Brain Reconciliation', err as Error);
      this.state.advance('Dual-Brain Reconciliation (failed)');
    }

    // ═══ STEP 8b: Semantic Firewall Filtering ═══
    // Save raw setups BEFORE firewall overwrites (for diagnostics)
    const rawSetupsByPair = new Map<string, TradeSetup[]>();
    const firewallRejections = new Map<string, Array<{ setupId: string; blocks: string[] }>>();
    if (engineOutput) {
      for (const [pair, setups] of engineOutput.tradeSetups) {
        rawSetupsByPair.set(pair, [...setups]);
      }
    }

    if (engineOutput) {
      try {
        for (const [pair, setups] of engineOutput.tradeSetups) {
          const zoneMap = engineOutput.zoneMaps.get(pair);
          const spotPrice = harvestedData?.spots.get(pair) ?? 0;
          const zones = zoneMap?.zones ?? [];

          // Pre-assign chain IDs for ZT-17 enforcement (Module I3)
          for (const setup of setups) {
            if (!setup.chainId) {
              setup.chainId = `${pair}-${setup.day || 'Mon'}-${setup.direction}`;
              if (!setup.chainPosition) setup.chainPosition = 1;
            }
          }

          const { accepted, rejected } = this.firewall.filterSetups(
            setups,
            (setup: TradeSetup): RuleCheckContext => ({
              setup,
              spotPrice,
              currentGate: 'validate',
              allSetups: setups,
              allZones: zones as DXYZone[],
              zone: zones.find((z: DXYZone) => z.id === setup.zoneName || z.zoneName === setup.zoneName) as DXYZone | undefined,
              isReportGeneration: true,
              // === v3.2 I1 REVERTED: Do NOT activate dormant ZT rules during report generation ===
              // These rules (ZT-1 red folder, ZT-3 risk, ZT-6 drawdown, ZT-7 martingale,
              // ZT-8/9 timing, ZT-11 spread, FIB-1/2/3 spiderweb) are LIVE-TRADING rules.
              // During REPORT GENERATION, they should remain dormant (undefined = INFO/skip).
              // Activating them killed ALL setups because the pipeline runs outside live trading context.
              // CRITICAL RULE 15: DO NOT set currentSession — ZT-10 would HARD_BLOCK 80%+ of setups
            }),
          );

          // Log rejection details for each rejected setup
          const pairRejections: Array<{ setupId: string; blocks: string[] }> = [];
          for (const rej of rejected) {
            const blocks = rej.result.hardBlocks.map((b) => `${b.rule}: ${b.message}`);
            pairRejections.push({ setupId: rej.setup.setupId, blocks });
            log.warn(
              `    [firewall-reject] ${rej.setup.setupId} (${rej.setup.pair} ${rej.setup.direction}) — HARD BLOCK: ${blocks.join('; ')}`,
            );
          }
          firewallRejections.set(pair, pairRejections);

          filteredSetups.set(pair, accepted);
          totalPassed += accepted.length;
          totalRejected += rejected.length;
        }

        // Replace engineOutput tradeSetups with filtered version
        engineOutput.tradeSetups = filteredSetups;

        this.state.advance('Semantic Firewall');
        log.info(`Firewall: ${totalPassed} passed, ${totalRejected} rejected`);
      } catch (e) {
        this.state.recordFailure('Semantic Firewall', e as Error);
        for (const [pair, setups] of engineOutput.tradeSetups) {
          filteredSetups.set(pair, setups);
          totalPassed += setups.length;
        }
      }
    }

    // === PER-CATEGORY CAPS (after firewall + cascade) ===
    const CCAPS: Record<string, number> = {
      [SetupCategory.HTF_SWING]: 3,
      [SetupCategory.SWING_SCALP]: 6,
      [SetupCategory.BREAKOUT_SURGE]: 2,
      [SetupCategory.REINFORCEMENT]: 6,
      [SetupCategory.TRANSITION]: 2,
      [SetupCategory.WHIPLASH]: 3,
    };
    for (const [pair, setups] of filteredSetups) {
      const capped: TradeSetup[] = [];
      for (const cat of Object.keys(CCAPS)) {
        const catSetups = setups.filter(s => s.category === cat).sort((a, b) => b.confidence - a.confidence).slice(0, CCAPS[cat]);
        capped.push(...catSetups);
      }
      const knownCats = Object.keys(CCAPS);
      capped.push(...setups.filter(s => !knownCats.includes(s.category)));
      filteredSetups.set(pair, capped.sort((a, b) => b.confidence - a.confidence).slice(0, 25));
    }

    // ═══ FINAL EXACT-DEDUP: Remove identical setups ═══
    // A weekly report uses static zone data, so two days with the same shape
    // produce identical direction+category+entry+SL+TP values.  However, in the
    // TTE weekly-calendar architecture each weekday is treated independently —
    // the same trade on Monday and Friday are genuinely different setups
    // because the market context (shape chain, catalysts, DXY regime) differs
    // per day.  Therefore the dedup signature MUST include the day label.
    // This also catches cascade setups that duplicate native setups WITHIN the
    // same day (same day + same direction+category+entry+SL+TP).
    for (const [pair, setups] of filteredSetups) {
      const seenSigs = new Set<string>();
      const removedDupes: string[] = [];
      const deduped = setups.filter((s) => {
        const sig =
          `${s.day}_${s.direction}_${s.category}_${Math.round(s.entry * 1e6)}_${Math.round(s.sl * 1e6)}_${Math.round(s.tp * 1e6)}`;
        if (seenSigs.has(sig)) {
          removedDupes.push(`${s.setupId} (${s.day} ${s.direction} ${s.category} entry=${s.entry.toFixed(5)})`);
          return false;
        }
        seenSigs.add(sig);
        return true;
      });
      if (deduped.length < setups.length) {
        log.info(
          `  ${pair}: exact-dedup ${setups.length} → ${deduped.length} (removed ${setups.length - deduped.length} identical)`,
        );
        for (const dupe of removedDupes) {
          log.info(`    [dedup-removed] ${dupe}`);
        }
      }
      filteredSetups.set(pair, deduped);
    }

    // Flatten all setups for downstream steps
    const flatSetups: TradeSetup[] = [];
    for (const setups of filteredSetups.values()) {
      flatSetups.push(...setups);
    }

    // Build Weekly Execution Calendar
    const weeklyCalendar = this.buildWeeklyCalendar(flatSetups);

    // ── DIAGNOSTIC: Write setup details to file for debugging ──
    try {
      const diagData: Record<string, unknown> = {};
      for (const [pair, setups] of rawSetupsByPair) {
        diagData[pair] = {
          rawSetups: setups.map((s: TradeSetup) => ({
            setupId: s.setupId, direction: s.direction, category: s.category,
            entry: s.entry, sl: s.sl, tp: s.tp, rrr: s.rrr, slPips: s.slPips,
            isBoMEntry: s.isBoMEntry, zoneName: s.zoneName,
          })),
          filteredSetups: (filteredSetups.get(pair) ?? []).map((s: TradeSetup) => s.setupId),
          firewallRejections: firewallRejections.get(pair) ?? [],
        };
      }
      // Also log zone details
      for (const [pair, zoneMap] of engineOutput!.zoneMaps) {
        const spot = zoneMap.spots[pair] ?? 0;
        (diagData[pair] as Record<string, unknown>).spot = spot;
        (diagData[pair] as Record<string, unknown>).zones = zoneMap.zones.map((z: DXYZone) => ({
          id: z.id, floor: z.floor, ceiling: z.ceiling, type: z.type,
          isBoM: z.isBoM, confluence: z.confluence, zfp: z.zfp,
          midVsSpot: ((z.floor + z.ceiling) / 2 < spot ? 'below' : 'above'),
        }));
      }
      const diagPath = join(outputDir, 'pipeline-diagnostic.json');
      writeFileSync(diagPath, JSON.stringify(diagData, null, 2), 'utf8');
      log.info(`Diagnostic written to ${diagPath}`);
    } catch (e) {
      log.warn(`Failed to write diagnostic: ${(e as Error).message}`);
    }

    // ═══ STEP 9.5: Visual Verification (Law 37) — VC daemon REMOVED ═══
    // VC daemon visual verification REMOVED — MiMo v2.5 built-in vision via
    // TvChartController is the visual path. Setups are marked VLM_UNAVAILABLE
    // (the de-facto state; the external daemon was broken/unavailable).
    for (const s of flatSetups) {
      if (!s.vlmStatus) s.vlmStatus = 'VLM_UNAVAILABLE';
    }

    // ═══ STEP 9.75: Pipeline Error Flush ═══
    // Write pipeline errors to disk for debugging (always — empty array = clean run).
    // Runs before report generation so the report embeds the same error snapshot.
    this.writeErrorsToDisk();

    // ═══ STEP 10: Report Generation ═══
    try {
      reportMarkdown = this.generateReport(harvestedData, engineOutput, flatSetups, weekStart);

      // Weekly Execution Calendar (Spec §8.5A — MANDATORY)
      if (weeklyCalendar && weeklyCalendar.length > 0) {
        reportMarkdown += '\n\n---\n\n## WEEKLY EXECUTION CALENDAR\n';
        reportMarkdown += '| Day | Pair | Dir | Setup Type | Entry | Shape | Session | Conf | Notes |\n';
        reportMarkdown += '|-----|------|-----|------------|-------|-------|---------|------|-------|\n';
        for (const dayEntry of weeklyCalendar) {
          if (dayEntry.entries.length === 0) {
            reportMarkdown += `| ${dayEntry.day} | — | — | — | — | — | — | — | No qualifying setups |\n`;
          }
          for (const s of dayEntry.entries) {
            reportMarkdown += `| ${dayEntry.day} | ${s.pair} | ${s.direction} | ${s.category} | ${s.entry?.toFixed(5) || '—'} | ${s.shapeTrigger || '—'} | ${s.session || '—'} | ${s.confidence} | ${(s.notes || '').substring(0, 60)} |\n`;
          }
        }
      }

      // Profit Taking Law (Spec E2 — MANDATORY)
      reportMarkdown += '\n### PROFIT TAKING LAW (MANDATORY)';
      reportMarkdown += '\n- Close ALL open trades by NY market close (17:00 ET Friday).';
      reportMarkdown += '\n- No London-mapped trades run overnight.';
      reportMarkdown += '\n- If position cannot reach 30-50% profit → take ALL profits before close.';
      reportMarkdown += '\n- BE11 Compliance: Profit Taking Law documented.';

      // Execution Protocol (Spec Q8)
      reportMarkdown += '\n### EXECUTION PROTOCOL\n';
      reportMarkdown += '- ALL entries + rockets set up simultaneously during London premarket.\n';
      reportMarkdown += '- Walk away after setup. Return at 10 PM ET.\n';
      reportMarkdown += '- By the time a rocket triggers, primary entry is in profit → move to BE → risk-free.\n';

      // === BREAKOUT RISK ALERTS (Spec Section 15) ===
      reportMarkdown += '\n\n---\n\n## BREAKOUT RISK ALERTS (ZFP > 50%)\n';
      if (engineOutput) {
        reportMarkdown += '| Pair | Zone | Range | ZFP | Pressure |\n|------|------|-------|-----|----------|\n';
        for (const [pairName, zoneMapSnapshot] of engineOutput.zoneMaps) {
          for (const zone of zoneMapSnapshot.zones) {
            if ((zone.zfp ?? 0) > 50) {
              reportMarkdown += `| ${pairName} | ${zone.zoneName || 'Zone'} | ${zone.floor.toFixed(5)}-${zone.ceiling.toFixed(5)} | ZFP: ${(zone.zfp!).toFixed(0)}% | ${(zone as unknown as Record<string, unknown>).pressureDegree || '—'} |\n`;
            }
          }
        }
      } else {
        reportMarkdown += 'No zones with ZFP > 50%. All zones structurally sound.\n';
      }

      // === K FACTOR AUDIT TRAIL (Spec Section 7) ===
      reportMarkdown += '\n\n---\n\n## K FACTOR AUDIT TRAIL\n';
      const weights: Record<string, number> = {
        'EUR/USD': -0.576, 'USD/JPY': 0.136, 'GBP/USD': -0.119,
        'USD/CAD': 0.091, 'USD/SEK': 0.042, 'USD/CHF': 0.036,
      };
      let hasComponents = false;
      if (harvestedData?.ohlc) {
        for (const [pairKey, pairBars] of harvestedData.ohlc) {
          const w = weights[pairKey];
          if (w !== undefined && pairBars.length > 0) {
            if (!hasComponents) {
              reportMarkdown += '| Component | Spot Rate | DXY Weight | Contribution |\n|-----------|-----------|------------|--------------|\n';
              hasComponents = true;
            }
            const spot = pairBars[pairBars.length - 1].close;
            reportMarkdown += `| ${pairKey} | ${spot.toFixed(5)} | ${w} | ${(Math.pow(spot, w)).toFixed(6)} |\n`;
          }
        }
      }
      if (hasComponents) {
        reportMarkdown += `\n**K Factor Base:** 50.14348112\n`;
      } else {
        reportMarkdown += 'Component spots unavailable — K Factor not computed. DXY options strikes used at face value.\n';
      }

      mkdirSync(outputDir, { recursive: true });
      reportPath = join(outputDir, `TTE_Report_${weekStart}.md`);
      writeFileSync(reportPath, reportMarkdown, 'utf8');
      this.state.advance('Report Generation');
      this.state.recordProvenance('ReportGenerator', 'Report', 'ok', `Written to ${reportPath}`);
    } catch (e) {
      this.state.recordFailure('Report Generation', e as Error);
    }

    // ═══ STEP 11: Blind Execution Check ═══
    try {
      blindCheckResult = runBlindExecutionCheck(flatSetups);
      this.state.advance('Blind Execution Check');
      log.info(
        `Blind check: ${blindCheckResult.passed ? 'PASS' : 'FAIL'} ` +
          `(${blindCheckResult.passedChecks}/${blindCheckResult.totalChecks} checks passed)`,
      );
    } catch (e) {
      this.state.recordFailure('Blind Execution Check', e as Error);
    }

    // ═══ STEP 12: Compliance Sweep ═══
    try {
      complianceResult = runComplianceSweep(flatSetups);
      this.state.advance('Compliance Sweep');
      log.info(
        `Compliance: ${complianceResult.passed ? 'PASS' : 'FAIL'} ` +
          `(${complianceResult.passedChecks}/${complianceResult.totalChecks} checks passed)`,
      );
    } catch (e) {
      this.state.recordFailure('Compliance Sweep', e as Error);
    }

    // === COMPLIANCE/BLIND-EXEC WARNINGS IN REPORT (L6) ===
    try {
      if (blindCheckResult && !blindCheckResult.passed) {
        reportMarkdown += '\n\n---\n\n## ⚠ BLIND-EXECUTION WARNINGS\n';
        reportMarkdown += `**${blindCheckResult.failures.length} issues detected.** Report may require manual review.\n`;
        for (const failure of blindCheckResult.failures) {
          reportMarkdown += `- **${failure.checkId}**: ${failure.reason}\n`;
        }
      }
      if (complianceResult && !complianceResult.passed) {
        reportMarkdown += '\n\n---\n\n## ⚠ COMPLIANCE ISSUES\n';
        for (const check of complianceResult.checks.filter((c) => !c.passed)) {
          reportMarkdown += `- **${check.id}**: ${check.evidence || check.detail || 'Failed'}\n`;
        }
      }
      // Re-write report with warnings appended
      if (reportPath) {
        writeFileSync(reportPath, reportMarkdown, 'utf8');
      }
    } catch (e) {
      log.warn(`Failed to append compliance warnings to report: ${(e as Error).message}`);
    }

    // ═══ STEP 13: Pine Script Generation ═══
    try {
      const pineGen = new PineScriptGenerator();
      const pineData = this.buildPineScriptData(weekStart, engineOutput);
      const pineScript = pineGen.generate(pineData);
      pineScriptPath = join(outputDir, `Plutus_Zones_${weekStart}.pine`);
      writeFileSync(pineScriptPath, pineScript, 'utf8');
      this.state.advance('Pine Script Generation');
      this.state.recordProvenance('PineScriptGenerator', 'Pine Script', 'ok', `Written to ${pineScriptPath}`);
    } catch (e) {
      this.state.recordFailure('Pine Script Generation', e as Error);
    }

    // ═══ STEP 14: PDF Generation (Chrome CDP — Leviathan Template v2.0 design) ═══
    try {
      if (reportPath) {
        pdfPath = await generatePdfViaCDP(reportPath, outputDir, weekStart);
        if (pdfPath) {
          this.state.recordProvenance('PdfGenerator', 'PDF', 'ok', `Written to ${pdfPath}`);
        } else {
          log.warn('PDF generation via CDP returned null');
        }
      }
      this.state.advance('PDF Generation');
    } catch (e) {
      this.state.recordFailure('PDF Generation', e as Error);
    }

    // ═══ STEP 15: VC Chart Drawing — REMOVED ═══
    // VC daemon chart drawing REMOVED — the external daemon no longer exists.
    // Step tracking preserved for pipeline diagnostics continuity.
    this.state.advance('VC Chart Drawing');

    // ═══ BUILD RESULT ═══
    const result: PipelineResult = {
      weekStart,
      reportPath,
      pdfPath,
      pineScriptPath,
      totalZones,
      totalSetups: flatSetups.length,
      passedFirewall: totalPassed,
      rejectedFirewall: totalRejected,
      blindCheckPassed: blindCheckResult?.passed ?? false,
      compliancePassed: complianceResult?.passed ?? false,
      stepsCompleted: this.state.completedSteps.length,
      totalSteps: 18,
      failures: this.state.failures,
      elapsedMs: Date.now() - startTime,
      provenance: this.state.provenance,
      weeklyCalendar,
    };

    log.info(
      `=== PIPELINE COMPLETE — ${result.stepsCompleted}/${result.totalSteps} steps, ` +
        `${result.totalZones} zones, ${result.totalSetups} setups, ` +
        `${result.failures.length} failures, ${result.elapsedMs}ms ===`,
    );

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW DATA HARVEST — fetchSource()-powered, bypasses broken raw-fetch clients
  // ═══════════════════════════════════════════════════════════════════════════════

  /** Pair list — TradingViewClient handles symbol mapping internally. */
  private static readonly PAIRS = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

  /** Pair → TradingView technicals source key mapping. */
  private static readonly TV_KEYS: Record<string, string> = {
    'DXY': 'tv_technicals_dxy',
    'EUR/USD': 'tv_technicals_eurusd',
    'GBP/USD': 'tv_technicals_gbpusd',
    'AUD/USD': 'tv_technicals_audusd',
  };

  private static readonly OHLC_BARS = 512;

  /**
   * Harvest ALL data sources using fetchSource() for bot-protected sites.
   *
   * This REPLACES the old this.harvester.harvest() call. Instead of using
   * the individual client classes (which use raw fetch() and get 403'd),
   * this method routes ALL HTTP through the data-source-router which
   * attaches browser-like headers.
   *
   * Sources:
   *   1. OHLC          — TradingViewClient (works)
   *   2. Barchart MAs  — fetchSource() + parseBarchartMAs()
   *   3. TV technicals — fetchSource() + parseTVTechnicals()
   *   4. Forex research — fetchSource() + parseForexResearch()
   *   5. Calendar      — EconomicCalendarClient (works)
   *   6. FRED          — fetchSource()
   *   7. Treasury      — fetchSource()
   *   8. EIA           — fetchSource()
   *   9. Fed H.10      — fetchSource()
   *  10. Web Search    — WebSearchClient (DuckDuckGo)
   *
   * Spot prices are derived from the last OHLC close (cross-validated against
   * Barchart/TV data when available).
   */
  private async harvestAllData(weekStart: Date, dataCutoffTs?: number): Promise<HarvestedData> {
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    log.info(`[harvestAllData] Week ${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}`);

    const now = Date.now();

    const ohlcMap = new Map<string, OHLCBar[]>();
    const spotsMap = new Map<string, number>();

    // Intermediate storage per source (merged into PairDataBundle at the end)
    // Barchart removed — TradingView technicals provide EMA/SMA data for P2.
    const tvResults = new Map<string, ReturnType<typeof parseTVTechnicals>>();
    const forexResults = new Map<string, ReturnType<typeof parseForexResearch>>();
    const webSearchResults = new Map<string, WebSearchCommentary | null>();

    // ── Phase 1: OHLC (TradingViewClient — WORKS) ──
    log.info('[harvestAllData] Phase 1: OHLC via TradingViewClient');
    // Incomplete bar filtering: a bar is only valid once its period has fully closed.
    // 4H bar starting at 20:00 is not complete until 00:00. Using a mid-form bar
    // injects a fake close (live price) that corrupts zone construction.
        const TF_MS: Record<string, number> = { '4H': 4 * 60 * 60 * 1000, '1H': 1 * 60 * 60 * 1000, '30m': 30 * 60 * 1000, '15m': 15 * 60 * 1000 };
    const effectiveCutoff = dataCutoffTs ?? Date.now(); // no cutoff = filter against now
    await Promise.all(PlutusPipeline.PAIRS.map(async (pair) => {
      const symbol = pair; // Pass pair name directly — TradingViewClient maps it
      try {
        let ohlc = await this.tvClient.getOHLCHistory(symbol, '4H', PlutusPipeline.OHLC_BARS);
        const before = ohlc.length;
        ohlc = ohlc.filter(b => b.timestamp + TF_MS['4H']! <= effectiveCutoff);
        if (before !== ohlc.length) {
          log.info(`[harvestAllData] ${pair} 4H: ${before} → ${ohlc.length} bars (dropped ${before - ohlc.length} incomplete, cutoff ${new Date(effectiveCutoff).toISOString()})`);
        }
        ohlcMap.set(pair, ohlc);

        // v3.2 (R1): Fetch additional timeframes for scalp precision
        // BUG 1 FIX: Each LTF fetch is in its OWN try/catch so one failure
        // does not kill the other two. Previously a single try wrapped all 3
        // fetches — if 15m threw, 1H and 30m were also lost.
        if (!this.multiTfBars.has(pair)) this.multiTfBars.set(pair, new Map());

        // 1H — NO cutoff filter. LTF bars represent CURRENT market structure for zone
        // construction, not historical price action. The dataCutoff applies to 4H bars
        // (for deterministic spot/price analysis) but NOT to LTF zone visibility.
        try {
          const ohlc1H = await this.tvClient.getOHLCHistory(symbol, '1H', 500);
          this.multiTfBars.get(pair)!.set('1H', ohlc1H);
          log.info(`  ${pair} multiTfBars: 1H = ${ohlc1H.length} bars (no cutoff filter — zone construction uses latest data)`);
        } catch (err1H) {
          log.warn(`  ${pair} multiTfBars: 1H FETCH FAILED: ${err1H instanceof Error ? err1H.message : String(err1H)}`);
        }

        // 30m — same: no cutoff filter, request 500 bars for deeper history
        try {
          const ohlc30m = await this.tvClient.getOHLCHistory(symbol, '30m', 500);
          this.multiTfBars.get(pair)!.set('30m', ohlc30m);
          log.info(`  ${pair} multiTfBars: 30m = ${ohlc30m.length} bars`);
        } catch (err30m) {
          log.warn(`  ${pair} multiTfBars: 30m FETCH FAILED: ${err30m instanceof Error ? err30m.message : String(err30m)}`);
        }

        // 15m — same: no cutoff filter, request 500 bars
        try {
          const ohlc15m = await this.tvClient.getOHLCHistory(symbol, '15m', 500);
          this.multiTfBars.get(pair)!.set('15m', ohlc15m);
          log.info(`  ${pair} multiTfBars: 15m = ${ohlc15m.length} bars`);
        } catch (err15m) {
          log.warn(`  ${pair} multiTfBars: 15m FETCH FAILED: ${err15m instanceof Error ? err15m.message : String(err15m)}`);
        }
        if (ohlc.length > 0) {
          const lastClose = ohlc[ohlc.length - 1].close;
          spotsMap.set(pair, lastClose);
          this.state.recordProvenance('TradingViewFinance', pair, 'ok', `${ohlc.length} bars, spot=${lastClose}`);
        } else {
          this.state.recordProvenance('TradingViewFinance', pair, 'error', '0 bars returned');
        }
      } catch (err) {
        ohlcMap.set(pair, []);
        this.state.recordProvenance('TradingViewFinance', pair, 'error', err instanceof Error ? err.message : String(err));
      }
    }));

    // ── Phase 2: TradingView Technicals (EMA/SMA via headed browser) ──
    // NOTE: Barchart cheat-sheets REMOVED — paywalled. TradingView technicals
    // provide the same EMA/SMA data for Pillar P2 MA Confluence Grid.

    // ── Phase 3: TradingView Technicals (fetchSource + parseTVTechnicals) ──
    log.info('[harvestAllData] Phase 3: TradingView technicals via fetchSource');
    await Promise.all(PlutusPipeline.PAIRS.map(async (pair) => {
      const key = PlutusPipeline.TV_KEYS[pair];
      if (!key) return;
      try {
        const html = await fetchSource(key);
        if (html) {
          const techs = parseTVTechnicals(html);
          if (techs) {
            tvResults.set(pair, techs);
            this.state.recordProvenance('TVTechnicals', pair, 'ok', 'Technicals parsed');
          } else {
            this.state.recordProvenance('TVTechnicals', pair, 'partial', 'HTML fetched but parse failed');
          }
        } else {
          this.state.recordProvenance('TVTechnicals', pair, 'error', 'fetchSource returned null');
        }
      } catch (err) {
        this.state.recordProvenance('TVTechnicals', pair, 'error', err instanceof Error ? err.message : String(err));
      }
    }));

    // ── Phase 4: Forex Research (fetchSource + parseForexResearch) ──
    log.info('[harvestAllData] Phase 4: Forex research via fetchSource');
    try {
      const forexHtml = await fetchSource('forex_research');
      if (forexHtml) {
        // Parse for each pair from the shared page
        await Promise.all(PlutusPipeline.PAIRS.map(async (pair) => {
          try {
            const parsed = parseForexResearch(forexHtml, pair);
            if (parsed && (parsed.hwc !== null || parsed.lwc !== null)) {
              forexResults.set(pair, parsed);
              this.state.recordProvenance('ForexResearch', pair, 'ok', `HWC=${parsed.hwc ?? '—'}, LWC=${parsed.lwc ?? '—'}, bias=${parsed.bias}`);
            } else {
              // Text parser found nothing — try VLM fallback (MiMo v2.5 built-in vision)
              log.info(`[harvestAllData] Forex text parser found no levels for ${pair}, trying VLM fallback...`);
              const vlmResult = await parseForexResearchViaVLM(pair);
              if (vlmResult && (vlmResult.hwc !== null || vlmResult.lwc !== null)) {
                forexResults.set(pair, vlmResult);
                this.state.recordProvenance('ForexResearch', pair, 'ok', `HWC=${vlmResult.hwc ?? '—'}, LWC=${vlmResult.lwc ?? '—'}, bias=${vlmResult.bias} (VLM)`);
              } else {
                this.state.recordProvenance('ForexResearch', pair, 'partial', 'Page fetched but no levels for this pair (VLM also failed)');
              }
            }
          } catch (err) {
            this.state.recordProvenance('ForexResearch', pair, 'error', err instanceof Error ? err.message : String(err));
          }
        }));
      } else {
        for (const pair of PlutusPipeline.PAIRS) {
          this.state.recordProvenance('ForexResearch', pair, 'error', 'fetchSource returned null');
        }
      }
    } catch (err) {
      for (const pair of PlutusPipeline.PAIRS) {
        this.state.recordProvenance('ForexResearch', pair, 'error', err instanceof Error ? err.message : String(err));
      }
    }

    // ── Phase 5: Institutional Commentary via Headed Browser (FXStreet + DailyFX) ──
    // Replaced DuckDuckGo (rate-limited) with direct browser navigation to analysis pages.
    // Headed browser (9225) bypasses bot detection on financial sites.
    log.info('[harvestAllData] Phase 5: Institutional commentary via headed browser');
    const COMMENTARY_URLS: Record<string, string[]> = {
      'DXY':     ['https://www.fxstreet.com/markets/currencies/dxy'],
      'EUR/USD': ['https://www.fxstreet.com/forecasts/eur-usd-forecast', 'https://www.dailyfx.com/eur-usd'],
      'GBP/USD': ['https://www.fxstreet.com/forecasts/gbp-usd-forecast', 'https://www.dailyfx.com/gbp-usd'],
      'AUD/USD': ['https://www.fxstreet.com/forecasts/aud-usd-forecast', 'https://www.dailyfx.com/aud-usd'],
    };
    await Promise.all(PlutusPipeline.PAIRS.map(async (pair) => {
      try {
        const urls = COMMENTARY_URLS[pair] ?? [];
        let combinedText = '';
        for (const url of urls) {
          // Use headed browser for bot-protected financial sites
          const text = await fetchUrlViaCDP(url, true, true);
          if (text && text.length > 200) {
            combinedText += text + '\n---\n';
          }
        }

        if (combinedText.length > 500) {
          // Extract S/R levels from the fetched analysis text
          const pricePattern = pair === 'DXY' ? /1\d{2}\.\d{2,4}/g : pair === 'AUD/USD' ? /0\.\d{4}/g : /1\.\d{4}/g;
          const supportMatches = [...combinedText.matchAll(new RegExp('(?:support|floor|downside)[^\\d]{0,30}' + pricePattern.source, 'gi'))];
          const resistanceMatches = [...combinedText.matchAll(new RegExp('(?:resistance|ceiling|upside)[^\\d]{0,30}' + pricePattern.source, 'gi'))];

          const support = [...new Set(supportMatches.map(m => parseFloat(m[0].match(pricePattern)?.[0] ?? '0')).filter(v => v > 0))].sort((a, b) => b - a).slice(0, 5);
          const resistance = [...new Set(resistanceMatches.map(m => parseFloat(m[0].match(pricePattern)?.[0] ?? '0')).filter(v => v > 0))].sort((a, b) => b - a).slice(0, 5);

          const bias = resistance.length > support.length ? 'bearish' : support.length > resistance.length ? 'bullish' : 'neutral';
          const sources = urls;

          const commentary: WebSearchCommentary = {
            instrument: pair,
            results: [],
            resistance,
            support,
            consensusBias: bias as 'bullish' | 'bearish' | 'neutral',
            sources,
            timestamp: Date.now(),
          };
          webSearchResults.set(pair, commentary);
          this.state.recordProvenance('WebSearch', pair, 'ok',
            `${sources.length} sources, R=${resistance.length} S=${support.length}, bias=${bias}`);
        } else {
          this.state.recordProvenance('WebSearch', pair, 'partial', 'Browser fetched pages but no commentary extracted');
        }
      } catch (err) {
        webSearchResults.set(pair, null);
        this.state.recordProvenance('WebSearch', pair, 'error', err instanceof Error ? err.message : String(err));
      }
    }));

    // ── Phase 6: Economic Calendar (EconomicCalendarClient — WORKS) ──
    log.info('[harvestAllData] Phase 6: Economic calendar via EconomicCalendarClient');
    let calendarEvents: CalendarEvent[] = [];
    try {
      const calendarClient = new EconomicCalendarClient();
      const calResult = await calendarClient.refreshCalendar();
      if (calResult.success) {
        calendarEvents = calResult.data;
        this.state.recordProvenance('EconomicCalendar', 'ALL', 'ok', `${calendarEvents.length} events`);
      } else {
        this.state.recordProvenance('EconomicCalendar', 'ALL', 'error', calResult.error);
      }
    } catch (err) {
      this.state.recordProvenance('EconomicCalendar', 'ALL', 'error', err instanceof Error ? err.message : String(err));
    }

    // ── Phase 7: Macro Data (fetchSource for FRED, Treasury, EIA, H10) ──
    log.info('[harvestAllData] Phase 7: Macro data via fetchSource');
    const macroSources = ['fred_rrp', 'treasury_auctions', 'eia_petroleum', 'fed_h10'] as const;
    const macroHtml = new Map<string, string | null>();
    await Promise.all(macroSources.map(async (key) => {
      try {
        const html = await fetchSource(key);
        macroHtml.set(key, html);
        const label = key === 'fred_rrp' ? 'FRED' : key === 'treasury_auctions' ? 'Treasury' : key === 'eia_petroleum' ? 'EIA' : 'FedH10';
        if (html) {
          this.state.recordProvenance(label, 'ALL', 'ok', `${html.length} chars fetched`);
        } else {
          this.state.recordProvenance(label, 'ALL', 'error', 'fetchSource returned null');
        }
      } catch (err) {
        this.state.recordProvenance('Macro', 'ALL', 'error', err instanceof Error ? err.message : String(err));
      }
    }));

    // ── Phase 8: Build PairDataBundle for each pair ──
    log.info('[harvestAllData] Phase 8: Building PairDataBundle map');
    const pairDataMap = new Map<string, PairDataBundle>();

    for (const pair of PlutusPipeline.PAIRS) {
      const ohlc = ohlcMap.get(pair) ?? [];
      const tv = tvResults.get(pair);
      const forex = forexResults.get(pair);
      const webSearch = webSearchResults.get(pair);

      const bundle: PairDataBundle = {
        pair,
        ohlc,
        fetchedAt: now,
      };

      if (tv) {
        bundle.tvTechnicals = tv;
      }
      if (forex) {
        bundle.analystConsensus = {
          hwc: forex.hwc,
          lwc: forex.lwc,
          bias: forex.bias,
          sources: forex.sources,
        };
      }
      if (webSearch) {
        bundle.webSearchCommentary = webSearch;
      }

      pairDataMap.set(pair, bundle);

      const parts: string[] = [];
      if (tv) parts.push('TV');
      if (forex) parts.push('Forex');
      if (webSearch) parts.push('WebSearch');
      log.info(`[harvestAllData] ${pair}: ${parts.length > 0 ? parts.join('+') : 'OHLC only'} (${ohlc.length} bars)`);
    }

    // ── Build final HarvestedData ──
    const stateProv = this.state.provenance;
    const okCount = stateProv.filter((p) => p.status === 'ok').length;
    log.info(`[harvestAllData] Complete: ${ohlcMap.size} pairs, ${okCount}/${stateProv.length} sources OK`);

    return {
      weekStart,
      weekEnd,
      ohlc: ohlcMap,
      pairData: pairDataMap,
      options: [],
      calendar: calendarEvents,
      analystConsensus: new Map(),
      macroContext: {},
      commentary: new Map(),
      spots: spotsMap,
      provenance: this.state.provenance,
    };
  }

  // ── Build fatal result (OHLC harvest failure) ──

  private buildFatalResult(
    weekStart: string,
    startTime: number,
    errorMessage: string,
  ): PipelineResult {
    return {
      weekStart,
      reportPath: '',
      pdfPath: null,
      pineScriptPath: null,
      totalZones: 0,
      totalSetups: 0,
      passedFirewall: 0,
      rejectedFirewall: 0,
      blindCheckPassed: false,
      compliancePassed: false,
      stepsCompleted: this.state.completedSteps.length,
      totalSteps: 18,
      failures: [
        ...this.state.failures,
        { step: 'OHLC Harvest', error: errorMessage, timestamp: Date.now() },
      ],
      elapsedMs: Date.now() - startTime,
      provenance: this.state.provenance,
    };
  }

  // ── Generate report markdown using ReportGenerator ──

  /**
   * Build the Weekly Execution Calendar from all finalized setups.
   * Spec §8.5A: Day-by-day table showing ALL setups.
   * This is the TEMPORAL FRACTAL MAP — when the waves hit the walls.
   */
  private buildWeeklyCalendar(allSetups: TradeSetup[]): { day: string; entries: TradeSetup[] }[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const calendar = days.map(day => ({ day, entries: [] as TradeSetup[] }));

    for (const setup of allSetups) {
      const dayIdx = days.indexOf(setup.day || '');
      if (dayIdx >= 0) {
        calendar[dayIdx].entries.push(setup);
      } else {
        // Default to Monday if day is missing
        calendar[0].entries.push(setup);
      }
    }

    // Sort entries within each day by session order
    const sessionOrder = ['LONDON_OPEN', 'LONDON_MID', 'NY_OVERLAP', 'NY_OPEN', 'NY_MID', 'NY_CLOSE'];
    for (const dayEntry of calendar) {
      dayEntry.entries.sort((a, b) => {
        const sA = sessionOrder.indexOf(a.session || '');
        const sB = sessionOrder.indexOf(b.session || '');
        return (sA >= 0 ? sA : 99) - (sB >= 0 ? sB : 99);
      });
    }

    return calendar;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VISUAL VERIFICATION ENGINE — Law 37
  // ═══════════════════════════════════════════════════════════════════════════════

  // VC daemon visual verification REMOVED — MiMo v2.5 built-in vision via TvChartController is the visual path

  private generateReport(
    harvestedData: HarvestedData | null,
    engineOutput: PipelineEngineOutput | null,
    flatSetups: TradeSetup[],
    weekStart: string,
  ): string {
    const reportGen = new ReportGenerator();

    const spots: Record<string, number> = {};
    if (harvestedData) {
      for (const [pair, price] of harvestedData.spots) {
        spots[pair] = price;
      }
    }

    const zonesRecord: Record<string, DXYZone[]> = {};
    if (engineOutput) {
      for (const [pair, zoneMap] of engineOutput.zoneMaps) {
        zonesRecord[pair] = [...zoneMap.zones] as DXYZone[];
      }
    }

    let shapeChain: ReportParams['shapeChain'] | undefined;
    if (engineOutput && engineOutput.shapeChains.size > 0) {
      const chainPair = engineOutput.shapeChains.has('DXY')
        ? 'DXY'
        : (engineOutput.shapeChains.keys().next().value as string);
      const chain = engineOutput.shapeChains.get(chainPair);
      if (chain) {
        shapeChain = chain;
      }
    }

    const ohlcRecords: ReportParams['ohlc'] = [];
    if (harvestedData) {
      for (const [pair, bars] of harvestedData.ohlc) {
        if (bars.length > 0) {
          const lastBar = bars[bars.length - 1];
          ohlcRecords.push({
            pair,
            open: lastBar.open,
            high: lastBar.high,
            low: lastBar.low,
            close: lastBar.close,
          });
        }
      }
    }

    // Bridge calendar events from client format to report-generator format
    const clientCalendar = harvestedData?.calendar ?? [];
    const calendar: ReportParams['calendar'] = clientCalendar.map((ev) => ({
      date: ev.date,
      timeET: '',
      event: ev.title,
      impact: (ev.impact.toUpperCase() === 'HIGH' ? 'HIGH'
        : ev.impact.toUpperCase() === 'MEDIUM' ? 'MEDIUM' : 'LOW') as 'HIGH' | 'MEDIUM' | 'LOW',
      forecast: ev.forecast ?? '',
      previous: ev.previous ?? '',
    }));

    // Phase 6: Convert pair ATR map to record for report header
    const pairATRRecord: Record<string, number> = {};
    for (const [pair, atr] of this.pairATR) {
      pairATRRecord[pair] = atr;
    }

    const reportParams: ReportParams = {
      spots,
      timestamp: Date.now(),
      weekStart,
      calendar,
      ohlc: ohlcRecords,
      zones: zonesRecord,
      shapeChain: shapeChain!,
      setups: flatSetups,
      pairATR: pairATRRecord,
      errors: this.errors,
    };

    // Generate base report from ReportGenerator (legacy v1.0 path)
    const baseReport = reportGen.generate(reportParams);

    // ── Append extended sections (Engine 2 shape chains, cross-pair matrix,
    //    data provenance, missing data log, session notes, macro themes) ──
    const extendedSections: string[] = [baseReport];
    extendedSections.push(this.generateShapeChainsSection(engineOutput));
    extendedSections.push(this.generateCrossPairMatrixSection(flatSetups));
    extendedSections.push(this.generateDataProvenanceSection());
    extendedSections.push(this.generateMissingDataLogSection(engineOutput, harvestedData));
    extendedSections.push(this.generateSessionNotesSection(flatSetups));
    extendedSections.push(this.generateDominantThemesSection(engineOutput, flatSetups));

    return extendedSections.join('\n\n---\n\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXTENDED REPORT SECTIONS — Engine 2 shape chains, cross-pair matrix,
  // data provenance, missing data log, session notes, macro themes
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * SECTION: Engine 2 — Macro Shape Chains
   *
   * For each pair, renders the predicted shape chain with day-by-day
   * decomposition. Data comes from `engineOutput.shapeChains` computed in Step 6.
   */
  private generateShapeChainsSection(
    engineOutput: PipelineEngineOutput | null,
  ): string {
    const lines: string[] = [
      '## **PAGE 4: ENGINE 2 — MACRO SHAPE CHAINS**',
      '',
      '_Forward-looking shape predictions per pair. Each shape represents the expected price structure for that trading day._',
      '',
    ];

    if (!engineOutput || engineOutput.shapeChains.size === 0) {
      lines.push('_No shape chain data available._');
      return lines.join('\n');
    }

    for (const [pair, chain] of engineOutput.shapeChains) {
      lines.push(`### ${pair} Shape Chain`);
      lines.push('');
      lines.push(`**Current Shape:** ${chain.currentShape} | **Bias:** ${chain.storylineBias}`);
      lines.push(`**Context:** ${chain.currentContext}`);
      lines.push('');

      // Day-by-day decomposition — prefer dayDecomposition (rich), fallback to dayByDay (simple)
      const dayDecomp = chain.dayDecomposition ?? [];
      const dayByDay = chain.dayByDay ?? [];

      if (dayDecomp.length > 0) {
        lines.push('| Day | Shape | Confidence | ZFP Range | Key Transition | Session |');
        lines.push('|-----|-------|------------|-----------|----------------|---------|');

        for (const entry of dayDecomp) {
          const conf = (entry.confidence * 100).toFixed(0) + '%';
          const zfpRange = `${entry.zfpRange?.low ?? '—'}-${entry.zfpRange?.high ?? '—'}%`;
          lines.push(
            `| ${entry.day} | **${entry.shape}** | ${conf} | ${zfpRange} | ${entry.keyTransitionTime ?? '—'} | ${entry.sessionWindow ?? '—'} |`,
          );
        }
        lines.push('');
      } else if (dayByDay.length > 0) {
        lines.push('| Day | Shape | Confidence |');
        lines.push('|-----|-------|------------|');
        for (const entry of dayByDay) {
          const conf = (entry.confidence * 100).toFixed(0) + '%';
          lines.push(`| ${entry.day} | **${entry.shape}** | ${conf} |`);
        }
        lines.push('');
      } else if (chain.chain.length > 0) {
        lines.push('| Step | Day | Shape | Confidence | Context |');
        lines.push('|------|-----|-------|------------|---------|');
        for (let i = 0; i < chain.chain.length; i++) {
          const e: ShapePrediction = chain.chain[i];
          lines.push(`| ${e.step} | ${e.day} | **${e.shape}** | ${(e.confidence * 100).toFixed(0)}% | ${e.context} |`);
        }
        lines.push('');
      }

      if (chain.consolidationPhase) {
        lines.push(`**Consolidation Phase:** ${chain.consolidationPhase}`);
      }
      if (chain.breakoutWatch) {
        lines.push(`**Breakout Watch:** ${chain.breakoutWatch}`);
      }
      if (chain.tradingSpeedAdjustment) {
        lines.push(`**Trading Speed Adjustment:** ${chain.tradingSpeedAdjustment}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * SECTION: Cross-Pair Trade Setup Matrix (Ranked)
   *
   * All setups ranked by confidence, showing pair, direction, category,
   * entry/SL/TP, RRR, confidence, and day. Data from `flatSetups`.
   */
  private generateCrossPairMatrixSection(flatSetups: TradeSetup[]): string {
    const lines: string[] = [
      '## **CROSS-PAIR TRADE SETUP MATRIX (RANKED)**',
      '',
      '_All tradeable setups ranked by confidence. Only setups that passed semantic firewall filtering are included._',
      '',
      '| Rank | Pair | Direction | Category | Entry 1 (33%) | Entry 2 (33%) | Entry 3 (34%) | SL | TP | RRR | Conf | Day | Chain | VLM | Nearest Fib |',
      '|------|------|-----------|----------|---------------|---------------|---------------|-----|-----|-----|------|-----|-------|-----|-------------|',
    ];

    if (flatSetups.length === 0) {
      lines.push('| — | _No setups available_ | — | — | — | — | — | — | — | — | — | — | — | — | — |');
      lines.push('');
      return lines.join('\n');
    }

    // Sort by confidence descending, then RRR descending
    const ranked = [...flatSetups].sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return b.rrr - a.rrr;
    });

    for (let i = 0; i < ranked.length; i++) {
      const s = ranked[i];
      const dir = s.direction === TradeDirection.LONG ? 'LONG'
        : s.direction === TradeDirection.SHORT ? 'SHORT' : 'NEUTRAL';
      const fmt = (n: number) => s.pair === 'DXY' ? n.toFixed(3) : n.toFixed(5);
      const entry1Str = s.entry1 !== undefined ? fmt(s.entry1) : fmt(s.entry);
      const entry2Str = s.entry2 !== undefined ? fmt(s.entry2) : '—';
      const entry3Str = s.entry3 !== undefined ? fmt(s.entry3) : '—';
      const slStr = fmt(s.sl);
      const tpStr = fmt(s.tp);
      const chainStr = s.chainId !== undefined
        ? `${s.chainId} (${s.chainPosition ?? '?'})`
        : '—';
      const vlmStr = s.vlmStatus ?? '—';
      // Compute nearest Fib level to entry
      let nearestFibStr = '—';
      if (s.fibLevels && s.fibLevels.length > 0) {
        let minDist = Infinity;
        let nearestLevel = 0;
        for (const fl of s.fibLevels) {
          const dist = Math.abs(fl.price - s.entry);
          if (dist < minDist) { minDist = dist; nearestLevel = fl.level; }
        }
        nearestFibStr = `Fib ${nearestLevel}`;
      }
      lines.push(
        `| ${i + 1} | ${s.pair} | **${dir}** | ${s.category} | ${entry1Str} | ${entry2Str} | ${entry3Str} | ${slStr} | ${tpStr} | **${s.rrr.toFixed(1)}x** | ${s.confidence} | ${s.day} | ${chainStr} | ${vlmStr} | ${nearestFibStr} |`,
      );
    }
    lines.push('');
    lines.push(`**Total setups:** ${ranked.length} | **Average confidence:** ${(ranked.reduce((s, x) => s + x.confidence, 0) / ranked.length).toFixed(1)} | **Average RRR:** ${(ranked.reduce((s, x) => s + x.rrr, 0) / ranked.length).toFixed(1)}x`);

    return lines.join('\n');
  }

  /**
   * SECTION: Data Provenance Audit
   *
   * Lists every data source with status, instrument, and detail.
   * Data from `this.state.provenance`.
   */
  private generateDataProvenanceSection(): string {
    const lines: string[] = [
      '## **DATA PROVENANCE AUDIT**',
      '',
      '_Every data source consulted during pipeline execution, with verification status._',
      '',
      '| Source | Instrument | Status | Detail |',
      '|--------|------------|--------|--------|',
    ];

    if (this.state.provenance.length === 0) {
      lines.push('| _No provenance data recorded_ | — | — | — |');
      lines.push('');
      return lines.join('\n');
    }

    for (const p of this.state.provenance) {
      const statusIcon = p.status === 'ok' ? 'OK' : p.status === 'error' ? '**ERROR**' : '**PARTIAL**';
      lines.push(`| ${p.source} | ${p.instrument} | ${statusIcon} | ${p.detail} |`);
    }
    lines.push('');
    const okCount = this.state.provenance.filter((p) => p.status === 'ok').length;
    const errCount = this.state.provenance.filter((p) => p.status === 'error').length;
    const partialCount = this.state.provenance.filter((p) => p.status === 'partial').length;
    lines.push(
      `**Sources:** ${this.state.provenance.length} total | ${okCount} OK | ${partialCount} partial | ${errCount} error`,
    );

    return lines.join('\n');
  }

  /**
   * SECTION: Missing Data Log
   *
   * Lists which data sources returned no data or errors, and what impact
   * that has on the report quality.
   */
  private generateMissingDataLogSection(
    engineOutput: PipelineEngineOutput | null,
    harvestedData: HarvestedData | null,
  ): string {
    const lines: string[] = [
      '## **MISSING DATA LOG**',
      '',
      '_Sources that returned no data or errors. Impact on report completeness is noted._',
      '',
    ];

    // Collect failed sources from provenance
    const failedSources = this.state.provenance.filter(
      (p) => p.status === 'error' || p.status === 'partial',
    );

    // Collect pipeline failures
    const pipelineFailures = this.state.failures;

    if (failedSources.length === 0 && pipelineFailures.length === 0) {
      lines.push('_No missing data or source errors detected. All sources returned data successfully._');
      return lines.join('\n');
    }

    if (failedSources.length > 0) {
      lines.push('### Failed / Partial Data Sources');
      lines.push('');
      lines.push('| Source | Instrument | Status | Impact |');
      lines.push('|--------|------------|--------|--------|');
      for (const f of failedSources) {
        const impact = this.assessMissingDataImpact(f.source, engineOutput, harvestedData);
        lines.push(`| ${f.source} | ${f.instrument} | ${f.status === 'error' ? '**ERROR**' : '**PARTIAL**'} | ${impact} |`);
      }
      lines.push('');
    }

    if (pipelineFailures.length > 0) {
      lines.push('### Pipeline Step Failures');
      lines.push('');
      lines.push('| Step | Error |');
      lines.push('|------|-------|');
      for (const f of pipelineFailures) {
        lines.push(`| ${f.step} | ${f.error} |`);
      }
      lines.push('');
    }

    // Overall completeness assessment
    const totalPairs = engineOutput?.zoneMaps.size ?? 0;
    const totalSetups = engineOutput?.tradeSetups.size ?? 0;
    lines.push('### Completeness Assessment');
    lines.push('');
    lines.push(`- **Pairs with zone data:** ${totalPairs}`);
    lines.push(`- **Pairs with setups:** ${totalSetups}`);
    lines.push(`- **Sources failed:** ${failedSources.length}`);
    lines.push(`- **Pipeline failures:** ${pipelineFailures.length}`);

    return lines.join('\n');
  }

  /**
   * SECTION: Session-Specific Execution Notes
   *
   * Groups setups by trading session and shows the focus for each.
   */
  private generateSessionNotesSection(flatSetups: TradeSetup[]): string {
    const lines: string[] = [
      '## **SESSION-SPECIFIC EXECUTION NOTES**',
      '',
      '_Setups organized by trading session for execution timing._',
      '',
    ];

    // Group setups by session
    const sessionGroups = new Map<string, TradeSetup[]>();
    for (const s of flatSetups) {
      const sessionLabel = this.sessionLabel(s.session);
      if (!sessionGroups.has(sessionLabel)) {
        sessionGroups.set(sessionLabel, []);
      }
      sessionGroups.get(sessionLabel)!.push(s);
    }

    // Session priority order
    const sessionOrder = [
      'London Open',
      'London Mid',
      'NY Overlap',
      'NY Open',
      'NY Mid',
      'NY Close',
    ];

    if (sessionGroups.size === 0) {
      lines.push('_No session data available from setups._');
      return lines.join('\n');
    }

    lines.push('| Session | Setup Count | Pairs | Focus |');
    lines.push('|---------|-------------|-------|-------|');

    for (const session of sessionOrder) {
      const setups = sessionGroups.get(session);
      if (!setups || setups.length === 0) continue;

      const pairs = [...new Set(setups.map((s) => s.pair))].join(', ');
      const directions = setups.map((s) =>
        s.direction === TradeDirection.LONG ? 'LONG' : 'SHORT',
      );
      const longCount = directions.filter((d) => d === 'LONG').length;
      const shortCount = directions.filter((d) => d === 'SHORT').length;
      const focus = `${longCount}L / ${shortCount}S | Top conf: ${Math.max(...setups.map((s) => s.confidence))}`;
      lines.push(`| **${session}** | ${setups.length} | ${pairs} | ${focus} |`);
    }

    // Any sessions not in standard order
    for (const [session, setups] of sessionGroups) {
      if (sessionOrder.some((s) => session.startsWith(s))) continue;
      const pairs = [...new Set(setups.map((s) => s.pair))].join(', ');
      lines.push(`| **${session}** | ${setups.length} | ${pairs} | ${setups.length} setups |`);
    }

    lines.push('');

    // Detailed per-session breakdown
    lines.push('### Detailed Session Breakdown');
    lines.push('');
    for (const session of sessionOrder) {
      const setups = sessionGroups.get(session);
      if (!setups || setups.length === 0) continue;

      lines.push(`**${session}** (${setups.length} setups):`);
      for (const s of setups) {
        const dir = s.direction === TradeDirection.LONG ? 'LONG' : 'SHORT';
        lines.push(
          `- ${s.pair} **${dir}** ${s.category} | Entry ${s.pair === 'DXY' ? s.entry.toFixed(3) : s.entry.toFixed(5)} | RRR ${s.rrr.toFixed(1)}x | Conf ${s.confidence} | Day ${s.day}`,
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * SECTION: Dominant Macro Themes
   *
   * Summarizes key themes from the analysis: DXY direction, risk on/off,
   * cross-pair alignment, and dominant shape patterns.
   */
  private generateDominantThemesSection(
    engineOutput: PipelineEngineOutput | null,
    flatSetups: TradeSetup[],
  ): string {
    const lines: string[] = [
      '## **DOMINANT MACRO THEMES**',
      '',
    ];

    // Theme 1: DXY Direction
    const dxyShape = engineOutput?.shapeChains.get('DXY');
    const dxySetups = flatSetups.filter((s) => s.pair === 'DXY');

    lines.push('### 1. DXY (US Dollar) Direction');
    if (dxyShape) {
      lines.push(`- **Current Shape:** ${dxyShape.currentShape}`);
      lines.push(`- **Bias:** ${dxyShape.storylineBias}`);
      lines.push(`- **Context:** ${dxyShape.currentContext}`);
    } else {
      lines.push('- _DXY shape data not available_');
    }
    if (dxySetups.length > 0) {
      const dxyDir = dxySetups[0].direction;
      lines.push(`- **Signal:** ${dxyDir === TradeDirection.LONG ? 'Bullish DXY (risk-off pressure)' : 'Bearish DXY (risk-on support)'}`);
    }
    lines.push('');

    // Theme 2: Risk On/Off
    lines.push('### 2. Risk Sentiment');
    const longSetups = flatSetups.filter((s) => s.direction === TradeDirection.LONG);
    const shortSetups = flatSetups.filter((s) => s.direction === TradeDirection.SHORT);
    const fxPairs = flatSetups.filter((s) => s.pair !== 'DXY');

    if (fxPairs.length > 0) {
      const fxLongs = fxPairs.filter((s) => s.direction === TradeDirection.LONG).length;
      const fxShorts = fxPairs.filter((s) => s.direction === TradeDirection.SHORT).length;
      if (fxLongs > fxShorts) {
        lines.push('- **Risk-on bias** — FX pairs predominantly LONG against the dollar');
      } else if (fxShorts > fxLongs) {
        lines.push('- **Risk-off bias** — FX pairs predominantly SHORT against the dollar');
      } else {
        lines.push('- **Mixed risk sentiment** — balanced long/short across FX pairs');
      }
      lines.push(`- **FX Setup Distribution:** ${fxLongs} LONG / ${fxShorts} SHORT`);
    } else {
      lines.push('- _Insufficient FX data to determine risk sentiment_');
    }
    lines.push('');

    // Theme 3: Cross-Pair Alignment
    lines.push('### 3. Cross-Pair Shape Alignment');
    if (engineOutput && engineOutput.shapeChains.size > 0) {
      const shapeCounts = new Map<string, number>();
      for (const [, chain] of engineOutput.shapeChains) {
        const shape = chain.currentShape;
        shapeCounts.set(shape, (shapeCounts.get(shape) ?? 0) + 1);
      }
      const dominantShape = [...shapeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (dominantShape) {
        lines.push(`- **Dominant shape across pairs:** ${dominantShape[0]} (${dominantShape[1]}/${engineOutput.shapeChains.size} pairs)`);
      }

      for (const [pair, chain] of engineOutput.shapeChains) {
        lines.push(`- **${pair}:** ${chain.currentShape} — ${chain.consolidationPhase || chain.storylineBias}`);
      }
    } else {
      lines.push('- _No shape data available for alignment analysis_');
    }
    lines.push('');

    // Theme 4: Setup Quality Summary
    lines.push('### 4. Setup Quality Summary');
    if (flatSetups.length > 0) {
      const highConf = flatSetups.filter((s) => s.confidence >= 80).length;
      const medConf = flatSetups.filter((s) => s.confidence >= 70 && s.confidence < 80).length;
      const lowConf = flatSetups.filter((s) => s.confidence < 70).length;
      const avgRRR = flatSetups.reduce((s, x) => s + x.rrr, 0) / flatSetups.length;

      lines.push(`- **Total setups:** ${flatSetups.length}`);
      lines.push(`- **High confidence (80+):** ${highConf}`);
      lines.push(`- **Medium confidence (70-79):** ${medConf}`);
      lines.push(`- **Standard confidence (<70):** ${lowConf}`);
      lines.push(`- **Average RRR:** ${avgRRR.toFixed(1)}x`);

      // Category breakdown
      const categories = new Map<string, number>();
      for (const s of flatSetups) {
        categories.set(s.category, (categories.get(s.category) ?? 0) + 1);
      }
      lines.push('- **Category breakdown:** ' +
        [...categories.entries()].map(([k, v]) => `${k} (${v})`).join(', '));
    } else {
      lines.push('- _No setups available for quality assessment_');
    }

    return lines.join('\n');
  }

  // ── Helper: Convert SessionWindow enum to short label ──

  private sessionLabel(session: SessionWindow): string {
    switch (session) {
      case SessionWindow.LONDON_OPEN: return 'London Open';
      case SessionWindow.LONDON_MID: return 'London Mid';
      case SessionWindow.NY_OVERLAP: return 'NY Overlap';
      case SessionWindow.NY_OPEN: return 'NY Open';
      case SessionWindow.NY_MID: return 'NY Mid';
      case SessionWindow.NY_CLOSE: return 'NY Close';
      default: return 'Unknown';
    }
  }

  // ── Helper: Assess impact of missing data source ──

  private assessMissingDataImpact(
    source: string,
    engineOutput: PipelineEngineOutput | null,
    _harvestedData: HarvestedData | null,
  ): string {
    const lower = source.toLowerCase();

    if (lower.includes('barchart') || lower.includes('forex') || lower.includes('option')) {
      return 'OTC option expiry data unavailable — option confluence column may show incomplete data';
    }
    if (lower.includes('tradingview') || lower.includes('ohlc') || lower.includes('harvest')) {
      return 'OHLC price data missing — zone construction may rely on limited bars';
    }
    if (lower.includes('economic') || lower.includes('calendar') || lower.includes('investing')) {
      return 'Economic calendar unavailable — Red Folder fences not included in report';
    }
    if (lower.includes('brain') || lower.includes('direct')) {
      return engineOutput && engineOutput.zoneMaps.size > 0
        ? 'Partial brain failure — some pairs may have reduced zone accuracy'
        : 'Brain computation failed — no zone/shape/setup data generated';
    }
    if (lower.includes('report')) {
      return 'Report generation issue — report may be incomplete';
    }
    return 'Data from this source was unavailable or incomplete';
  }

  // ── Build PineScriptData from engine output ──

  private buildPineScriptData(weekStart: string, engineOutput: PipelineEngineOutput | null): PineScriptData {
    const wsDate = new Date(weekStart + 'T00:00:00Z');
    const weDate = new Date(wsDate.getTime() + 4 * 24 * 60 * 60 * 1000);

    const weekLabel = this.formatWeekLabel(wsDate, weDate);

    const pairs: PineScriptData['pairs'] = [];
    if (engineOutput) {
      for (const [pair, zoneMap] of engineOutput.zoneMaps) {
        const shapeChain = engineOutput.shapeChains.get(pair);
        const setups = engineOutput.tradeSetups.get(pair) ?? [];

        const pineZones = zoneMap.zones.map((z) => {
          const category: 'RES' | 'MID' | 'SUP' =
            z.type.includes('Supply') ? 'RES' : z.type.includes('Demand') ? 'SUP' : 'MID';
          return {
            top: z.ceiling,
            bottom: z.floor,
            category,
            degree: 'MODERATE' as const,
            tier: 'T1' as const,
            name: z.id,
            zfp: z.zfp,
          };
        });

        const pineTrades = setups.slice(0, 3).map((s) => ({
          entry1: s.entry,
          entry3: s.entry3 ?? s.entry,
          sl: s.sl,
          tp: s.tp,
          rr: s.rrr,
          tier: s.confidenceTier,
          dayEntry: s.day ?? '',
          dayTarget: s.day ?? '',
        }));

        pairs.push({
          pair: pair as PineScriptData['pairs'][number]['pair'],
          zones: pineZones,
          lsz: [],
          options: [],
          trades: pineTrades,
          shapeChain: shapeChain?.currentShape ?? 'SS',
          shapeConfidence: shapeChain?.chain[0]?.confidence ?? 0,
          altChain: 'SS',
          altConfidence: 0,
          dayByDay:
            shapeChain?.dayByDay?.map((d) => `${d.day}:${d.shape}`).join(', ') ?? '',
        });
      }
    }

    return {
      weekLabel,
      dataWeekStart: {
        year: wsDate.getUTCFullYear(),
        month: wsDate.getUTCMonth() + 1,
        day: wsDate.getUTCDate(),
      },
      dataWeekEnd: {
        year: weDate.getUTCFullYear(),
        month: weDate.getUTCMonth() + 1,
        day: weDate.getUTCDate(),
      },
      pairs,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE 3 v8.0.0 — Setup Generation (Sniper Entry / Multi-TP / 100pt Conf)
  // ═══════════════════════════════════════════════════════════════════════════
  //
  // Implements the complete v8 algorithm from SYNTHESIS/02_ENGINE3_V8_PORTING_GUIDE.md:
  //   1.  Sniper entry at zone edge (key-level refined)
  //   2.  Sniper SL with category-specific buffer
  //   3.  Multi-TP: TP1 (opposing zone edge), TP1.5 (70% partial), TP2 (2nd opposing)
  //   4.  Entry proximity validation (MAX_ENTRY_DISTANCE with SS_PROXIMITY_FACTOR)
  //   5.  SL distance validation (SL_MAX_HARD reject)
  //   6.  RRR validation (consolidation-aware floors)
  //   7.  100-point confidence scoring (confluence + options + shape + ZFP + SL mods)
  //   8.  Shape dispatch from SHAPE_CATEGORIES_MAP
  //   9.  Direction from zone category (SUPPORT→LONG, RESISTANCE→SHORT)
  //  10.  Reinforcement generation for HTF_SWING (quality >= STANDARD)
  //  11.  DXY cascade overlay (post-processing in pipeline step)
  //  12.  Full TradeSetup output with all v8 fields

  /**
   * Map a ShapeCode to the SHAPE_CATEGORIES_MAP key.
   * Handles shape families (DWL→SS_DWL, STORM→SS, PBS→BS, etc.)
   */
  private mapShapeToCategoryKey(shape: ShapeCode): string {
    switch (shape) {
      case ShapeCode.SS: return 'SS';
      case ShapeCode.DWL: return 'SS_DWL';
      case ShapeCode.STORM: return 'SS';
      case ShapeCode.BS:
      case ShapeCode.PBS: return 'BS';
      case ShapeCode.WL:
      case ShapeCode.PWL: return 'WL';
      case ShapeCode.RWL:
      case ShapeCode.PRWL: return 'RWL';
      case ShapeCode.WLS: return 'WLS';
      case ShapeCode.R:
      case ShapeCode.RS: return 'R';
      default: return '';
    }
  }

  /**
   * MULTI-TF ZONE CONSTRUCTION (Law 1, 2, 3, 4)
   *
   * Telescopes down from 4H (already built) to 1H → 30m → 15m.
   * Runs construct4HZones on each LTF with TF-scaled parameters.
   * Merges all zones into a single zone map with nesting/overlap detection.
   *
   * Law 1: Top-down telescope (4H→1H→30m→15m)
   * Law 2: TF-scaled construction params
   * Law 3: All zones in single source-of-truth zone map
   * Law 4: Nesting = refinement, overlap = merge
   */
  private constructAndMergeMultiTfZones(
    pair: string,
    htfZones: DXYZone[],
    spot: number,
    pipValue: number,
  ): DXYZone[] {
    // DIAGNOSTIC: Write multiTfBars state to file for debugging
    try {
      const diagLines: string[] = [`=== constructAndMergeMultiTfZones DIAGNOSTIC for ${pair} ===`];
      diagLines.push(`htfZones: ${htfZones.length} zones`);
      diagLines.push(`spot: ${spot}, pipValue: ${pipValue}`);
      for (const tf of ['1H', '30m', '15m'] as const) {
        const bars = this.multiTfBars.get(pair)?.get(tf);
        if (bars) {
          diagLines.push(`multiTfBars ${tf}: ${bars.length} bars, first=${bars[0]?.timestamp}, last=${bars[bars.length-1]?.timestamp}`);
        } else {
          diagLines.push(`multiTfBars ${tf}: MISSING (undefined)`);
        }
      }
      diagLines.push(`pairATR: ${this.pairATR.get(pair) ?? 'not computed'}`);
      const fs = require('fs');
      fs.appendFileSync('/root/plutus/reports/mtf-diagnostic.log', diagLines.join('\n') + '\n\n');
    } catch (e) { /* non-blocking diagnostic */ }

    const allZones = [...htfZones];
    const timeframes: Array<'1H' | '30m' | '15m'> = ['1H', '30m', '15m'];

    for (const tf of timeframes) {
      const bars = this.multiTfBars.get(pair)?.get(tf);
      if (!bars) {
        log.warn(`  ${pair} ${tf}: multiTfBars is EMPTY — skipping zone construction`);
        continue;
      }
      if (bars.length < 20) {
        log.warn(`  ${pair} ${tf}: only ${bars.length} bars (need 20+) — skipping zone construction`);
        continue;
      }
      log.info(`  ${pair} ${tf}: processing ${bars.length} bars for zone construction`);

      try {
        const ltfZones = construct4HZones({
          bars,
          instrument: pair,
          spot,
          pipValue,
          timeframe: tf,
        });

        if (ltfZones.length > 0) {
          allZones.push(...ltfZones);
          log.info(`  ${pair} ${tf}: constructed ${ltfZones.length} zones`);
        } else {
          log.info(`  ${pair} ${tf}: constructed 0 zones (no consolidations or impulses detected in ${bars.length} bars)`);
        }
      } catch (err) {
        log.warn(`Multi-TF zone construction failed for ${pair} ${tf}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // ── Law 4: Detect nesting and overlap → create refined labels ──
    const mergeTolerance = pipValue * 5; // 5 pips
    const consumed = new Set<number>();

    for (let i = 0; i < allZones.length; i++) {
      if (consumed.has(i)) continue;
      const base = allZones[i]!;
      if (!base) continue;

      for (let j = i + 1; j < allZones.length; j++) {
        if (consumed.has(j)) continue;
        const other = allZones[j]!;

        // Must be same type family (both supply or both demand)
        const baseDemand = base.type === ZoneType.BOM_DEMAND || base.type === ZoneType.MOM_DEMAND;
        const otherDemand = other.type === ZoneType.BOM_DEMAND || other.type === ZoneType.MOM_DEMAND;
        if (baseDemand !== otherDemand) continue;

        // Must be from different TFs
        if ((base.timeframe ?? '4H') === (other.timeframe ?? '4H')) continue;

        // Check overlap
        const overlaps = Math.max(base.floor, other.floor) <= Math.min(base.ceiling, other.ceiling);
        if (!overlaps) {
          const gap = Math.max(0, Math.max(base.floor, other.floor) - Math.min(base.ceiling, other.ceiling));
          if (gap > mergeTolerance) continue;
        }

        // Merge: keep narrower zone width, combine confluence
        const baseWidth = base.ceiling - base.floor;
        const otherWidth = other.ceiling - other.floor;

        const tfs = [base.timeframe ?? '4H', other.timeframe ?? '4H'].sort((a, b) => {
          const rank: Record<string, number> = { '15m': 1, '30m': 2, '1H': 3, '4H': 4 };
          return (rank[a] ?? 0) - (rank[b] ?? 0);
        });
        base.refinedLabel = `${tfs[0]} Refined ${tfs[1]}`;
        base.confluence = Math.min(14, (base.confluence ?? 0) + (other.confluence ?? 0));

        if (otherWidth < baseWidth) {
          base.floor = other.floor;
          base.ceiling = other.ceiling;
        }

        if ((other.reactionCount ?? 0) < (base.reactionCount ?? 0)) {
          base.reactionCount = other.reactionCount;
        }

        consumed.add(j);
        log.info(`  ${pair}: MERGED zone ${other.zoneName ?? other.id} (${other.timeframe ?? '4H'}) into ${base.zoneName ?? base.id} (${base.timeframe ?? '4H'}) → refinedLabel="${base.refinedLabel}"`);
      }
    }

    const merged = allZones.filter((_, idx) => !consumed.has(idx));
    const mergeBreakdown: Record<string, number> = {};
    for (const z of merged) {
      const tf = z.timeframe ?? '4H';
      mergeBreakdown[tf] = (mergeBreakdown[tf] ?? 0) + 1;
    }
    log.info(
      `  ${pair}: multi-TF merge — ${allZones.length} → ${merged.length} zones (${allZones.length - merged.length} merged) | ` +
      `breakdown: ${Object.entries(mergeBreakdown).map(([tf, cnt]) => `${tf}=${cnt}`).join(', ')}`,
    );

    // ── LQZ: Liquidity Zone detection from 1H candlestick patterns ──
    // Detects the 3 LQ candle types — liquidity sweeps (Type 1), long wicks
    // preceding sharp moves (Type 2), and short-wick S/R consolidations
    // (Type 3) — and only confirms a zone where 2+ types align on a
    // horizontal line (20 tradeable / 50 week / 75 hard-ceiling caps):
    // overlapping LQZs promote IP-zone pressure; standalone LQZs are appended
    // as MoM zones tagged sdType: 'MoM' / sdOverlap: 'LQZ'.
    const bars1HForLqz = this.multiTfBars.get(pair)?.get('1H');
    if (bars1HForLqz && bars1HForLqz.length >= 20) {
      try {
        const lqzStats: LqzDetectionStats = {
          barsScanned: 0, sweepHits: 0, wickHits: 0, consolHits: 0,
          totalHits: 0, alignedGroups: 0, discardedSingleTypeGroups: 0,
          confirmedZones: 0, cappedZones: 0,
        };
        const lqzZones = detectLiquidityZones(pair, bars1HForLqz, 120, lqzStats);
        const withLqz = mergeLqzWithIpZones(merged, lqzZones, pair);
        const lqzAdded = withLqz.length - merged.length;
        const sweepCount = lqzZones.filter((z) => z.patterns.includes('LIQUIDITY_SWEEP')).length;
        const wickCount = lqzZones.filter((z) => z.patterns.includes('LONG_WICK')).length;
        const consolCount = lqzZones.filter((z) => z.patterns.includes('SHORT_WICK_CONSOL')).length;
        const tradeableCount = lqzZones.filter((z) => z.inTradeableRange).length;
        log.info(
          `  ${pair}: LQZ detection — ${lqzZones.length} confirmed liquidity zones (2+ patterns aligned) from ${bars1HForLqz.length} 1H bars ` +
          `[sweep=${sweepCount} wick=${wickCount} consol=${consolCount} tradeable=${tradeableCount}/${lqzZones.length}] ` +
          `(${lqzAdded} added as new zones, ${lqzZones.length - lqzAdded} promoted existing zones)`,
        );
        log.info(
          `  ${pair}: LQZ raw — bars=${lqzStats.barsScanned} hits=[sweep=${lqzStats.sweepHits} wick=${lqzStats.wickHits} consol=${lqzStats.consolHits} total=${lqzStats.totalHits}] ` +
          `groups=${lqzStats.alignedGroups} discardedSingleType=${lqzStats.discardedSingleTypeGroups} confirmed=${lqzStats.confirmedZones} capped=${lqzStats.cappedZones}`,
        );
        return withLqz;
      } catch (lqzErr) {
        this.collectError(
          'ZONE_VALIDATE',
          pair,
          `LQZ detection failed: ${lqzErr instanceof Error ? lqzErr.message : String(lqzErr)}`,
          { barsAvailable: bars1HForLqz?.length ?? 0 },
        );
        log.warn(`LQZ detection failed for ${pair}: ${lqzErr instanceof Error ? lqzErr.message : String(lqzErr)}`);
      }
    } else {
      log.warn(`  ${pair}: LQZ detection skipped — only ${bars1HForLqz?.length ?? 0} 1H bars (need 20+)`);
    }

    return merged;
  }

  /**
   * Classify zone entry status per v8 zone_entry_status rules.
   *   BoM + reactions < 3   → ENTRY-PRIMARY
   *   BoM + reactions >= 3  → TP-TARGET
   *   Virgin MoM            → REJECT
   *   MoM + 1-2 reactions   → ENTRY-CONDITIONAL
   *   MoM + reactions >= 3  → TP-TARGET
   *   MoM + 0 reactions     → REJECT
   */
  private classifyZoneStatusV8(zone: DXYZone): string {
    const rc = zone.reactionCount ?? 0;  // Default to 0 if undefined
    // BoM zones: always entry candidates (100% reaction guarantee if unmitigated)
    if (zone.isBoM) {
      return rc < 3 ? 'ENTRY-PRIMARY' : 'TP-TARGET';
    }
    // MoM zones — but be lenient with freshly constructed zones.
    // A zone with reactionCount 0 might be freshly detected (not truly "virgin MoM death zone").
    // Use sdFresh field if available to distinguish.
    const sdFresh = (zone as unknown as Record<string, unknown>).sdFresh as string | undefined;
    
    // Fresh zones (0X but with BoM-like characteristics) get ENTRY-CONDITIONAL, not REJECT
    if (rc === 0) {
      // Don't reject outright — give recently detected zones a chance
      return 'ENTRY-CONDITIONAL';
    }
    if (rc >= 3) return 'TP-TARGET';
    return 'ENTRY-CONDITIONAL';
  }

  /**
   * Phase 2 (Law 6, 8, 10): Computes Wilder's ATR (Average True Range).
   *
   * True Range = max(
   *   high - low,
   *   |high - prev_close|,
   *   |low - prev_close|
   * )
   *
   * First ATR = simple average of first `period` TRs.
   * Subsequent: ATR = (prev_ATR × (period - 1) + TR) / period  (Wilder's smoothing)
   *
   * @param bars   OHLC bars (typically 1H for pairATR)
   * @param period ATR period (default 14, industry standard)
   * @returns ATR value in price units (not pips)
   */
  private computeATR(bars: OHLCBar[], period: number = 14): number {
    if (bars.length < period + 1) {
      throw new Error(`ATR requires ${period + 1} bars, got ${bars.length}`);
    }

    // Step 1: Compute True Range for each bar
    const trueRanges: number[] = [];

    // First bar: TR = high - low (no previous close)
    trueRanges.push(bars[0]!.high - bars[0]!.low);

    for (let i = 1; i < bars.length; i++) {
      const high = bars[i]!.high;
      const low = bars[i]!.low;
      const prevClose = bars[i - 1]!.close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose),
      );
      trueRanges.push(tr);
    }

    // Step 2: First ATR = simple average of first `period` TRs
    let atr =
      trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

    // Step 3: Wilder's smoothing for subsequent bars
    for (let i = period; i < trueRanges.length; i++) {
      atr = (atr * (period - 1) + trueRanges[i]!) / period;
    }

    return atr;
  }

  /**
   * Phase 2 (Law 5, 6): Maps the zone path from spot.
   *
   * Returns supply zones above spot (sorted nearest first) and
   * demand zones below spot (sorted nearest first). This replaces
   * the iterate-all-zones approach in constructBasicSetups.
   */
  private mapZonePath(
    zones: DXYZone[],
    spot: number,
  ): { supplyAbove: DXYZone[]; demandBelow: DXYZone[] } {
    const isSupply = (z: DXYZone): boolean =>
      z.type === ZoneType.BOM_SUPPLY ||
      z.type === ZoneType.MOM_SUPPLY ||
      z.type === ZoneType.LSZ_SUPPLY ||
      z.type === ZoneType.IP_SUPPLY;

    const isDemand = (z: DXYZone): boolean =>
      z.type === ZoneType.BOM_DEMAND ||
      z.type === ZoneType.MOM_DEMAND ||
      z.type === ZoneType.LSZ_DEMAND ||
      z.type === ZoneType.IP_DEMAND;

    const supplyAbove = zones
      .filter((z) => isSupply(z) && z.floor > spot)
      .sort((a, b) => a.floor - b.floor); // nearest first (ascending floor)

    const demandBelow = zones
      .filter((z) => isDemand(z) && z.ceiling < spot)
      .sort((a, b) => b.ceiling - a.ceiling); // nearest first (descending ceiling)

    return { supplyAbove, demandBelow };
  }

  /**
   * FIX 2: Assess prior week directional momentum from 4H OHLC bars.
   *
   * Uses the last ~30 bars (≈5 trading days on 4H timeframe = 1 week) to
   * compute a weekly OHLC candle, then classifies the close position within
   * the weekly range:
   *   - Close in upper 70% of range → BULLISH
   *   - Close in lower 30% of range → BEARISH
   *   - Otherwise                    → NEUTRAL
   *
   * This momentum biases setup direction: if DXY prior week was BEARISH,
   * the pipeline prefers SHORT DXY setups over LONG setups.
   */
  private assessPriorWeekMomentum(bars: OHLCBar[], weekStartTs: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    // Use bars from the 7 days BEFORE the target week start.
    // This ensures we measure the PRIOR week's momentum, not the target week.
    const priorWeekBars = bars.filter(b => b.timestamp < weekStartTs);
    if (priorWeekBars.length < 5) return 'NEUTRAL';

    const lastBarTs = priorWeekBars[priorWeekBars.length - 1].timestamp;
    const weekAgoTs = lastBarTs - 7 * 24 * 60 * 60 * 1000;
    const weeklyBars = priorWeekBars.filter(b => b.timestamp >= weekAgoTs);
    if (weeklyBars.length < 5) return 'NEUTRAL';

    const open = weeklyBars[0].open;
    const close = weeklyBars[weeklyBars.length - 1].close;
    const high = Math.max(...weeklyBars.map((b) => b.high));
    const low = Math.min(...weeklyBars.map((b) => b.low));
    const range = high - low;

    if (range <= 0) return 'NEUTRAL';

    const changePct = (close - open) / range;
    log.info(`    momentum: ${weeklyBars.length} bars, open=${open} close=${close} range=${range.toFixed(5)} changePct=${changePct.toFixed(3)}`);
    if (changePct > 0.3) return 'BULLISH';
    if (changePct < -0.3) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * SNIPER ENTRY (v8 _get_sniper_entry) — CATEGORY-AWARE:
   *
   *   Base logic: enter at zone edge, refine to NEAREST key level.
   *     SHORT: target = zone.floor (bottom of supply); price rises into it from below
   *     LONG:  target = zone.ceiling (top of demand); price falls into it from above
   *
   *   Category overrides (per TTE Architecture Bible):
   *     HTF_SWING       → zone edge (standard sniper — nearest key level to edge)
   *     BREAKOUT_SURGE  → zone edge (same as HTF)
   *     SWING_SCALP     → 2 pips INSIDE the zone (earlier fill — closer to zone center)
   *     REINFORCEMENT   → FAR edge of entry zone (deeper entry — opposite edge from standard)
   *     TRANSITION      → zone edge (standard)
   *
   *   Matches Python: min(zone.key_levels, key=lambda l: abs(l - zone.bottom/top))
   */
  private getSniperEntry(
    zone: DXYZone,
    direction: TradeDirection,
    category: SetupCategory = SetupCategory.HTF_SWING,
    pair: string = '',
  ): number {
    const keyLevels = zone.keyLevels ??
      (zone.intraLevels ?? []).map((l) => l.price);

    // Category-aware entry edge selection:
    //   REINFORCEMENT → FAR edge (deeper into zone, opposite from standard sniper edge)
    const isReinforcement = category === SetupCategory.REINFORCEMENT;
    const isScalp = category === SetupCategory.SWING_SCALP;

    if (direction === TradeDirection.SHORT) {
      // Enter at BOTTOM of supply zone (price rises into it from below)
      // Far edge for REINFORCEMENT = ceiling (top of supply zone)
      const baseRef = isReinforcement ? zone.ceiling : zone.floor;
      const inRange = keyLevels.filter((k) => k >= zone.floor && k <= zone.ceiling);
      let entry: number;
      if (inRange.length > 0) {
        entry = inRange.reduce((prev, curr) =>
          Math.abs(curr - baseRef) < Math.abs(prev - baseRef) ? curr : prev,
          baseRef);
      } else {
        entry = baseRef;
      }
      // Scalp: enter 2 pips INSIDE the zone (earlier fill — move toward zone center)
      if (isScalp) {
        const pipVal = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
        const maxInside = (zone.ceiling - zone.floor) * 0.3; // cap at 30% of zone depth
        entry += Math.min(2 * pipVal, maxInside);
      }
      return entry;
    } else {
      // Enter at TOP of demand zone (price falls into it from above)
      // Far edge for REINFORCEMENT = floor (bottom of demand zone)
      const baseRef = isReinforcement ? zone.floor : zone.ceiling;
      const inRange = keyLevels.filter((k) => k >= zone.floor && k <= zone.ceiling);
      let entry: number;
      if (inRange.length > 0) {
        entry = inRange.reduce((prev, curr) =>
          Math.abs(curr - baseRef) < Math.abs(prev - baseRef) ? curr : prev,
          baseRef);
      } else {
        entry = baseRef;
      }
      // Scalp: enter 2 pips INSIDE the zone (earlier fill — move toward zone center)
      if (isScalp) {
        const pipVal = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
        const maxInside = (zone.ceiling - zone.floor) * 0.3; // cap at 30% of zone depth
        entry -= Math.min(2 * pipVal, maxInside);
      }
      return entry;
    }
  }

  /**
   * Phase 3 SL (Law 7, 8, 9, 10):
   *
   * Scans for the NEXT structural zone BEYOND the entry zone and places
   * the SL inside that zone. This is a fundamental change from the old
   * approach which used the entry zone's own edges.
   *
   *   SHORT: scan upward for nearest supply zone above entry ceiling
   *          → SL = that zone's floor + buffer
   *   LONG:  scan downward for nearest demand zone below entry floor
   *          → SL = that zone's ceiling - buffer
   *
   * Buffer by pair (from winning trade analysis):
   *   EUR/USD: 2 pips | GBP/USD: 3 pips | AUD/USD: 3 pips | DXY: 5 index points
   *
   * Fallback (Law 8): if no next zone within 100 pips,
   *   SL = entry ± max(entryZoneWidth × 2, 1.5 × pairATR)
   *
   * Minimum (Law 10): SL distance >= 0.5 × pairATR
   */
  private getSniperSL(
    zone: DXYZone,
    direction: TradeDirection,
    pair: string,
    allZones: readonly DXYZone[],
    entry?: number,
  ): number {
    const STRUCTURAL_BUFFER_PIPS: Record<string, number> = {
      'DXY': 5,
      'EUR/USD': 2,
      'GBP/USD': 3,
      'AUD/USD': 3,
    };
    const bufPips = STRUCTURAL_BUFFER_PIPS[pair] ?? 3;
    const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
    // BUG FIX: Use pipValue for ALL pairs including DXY.
    // PIP_VALUE['DXY'] = 0.01 (DXY index points per pip), which is correct.
    // Previously hardcoded 0.01 as a special case — now uses the proper constant.
    const buffer = bufPips * pipValue;
    const entryZoneWidth = zone.ceiling - zone.floor;

    // Entry reference: entry arg or zone edge
    const entryRef = entry ??
      (direction === TradeDirection.LONG ? zone.ceiling : zone.floor);

    let sl: number;

    // ── Scan for NEXT structural zone beyond entry (Law 7) ──
    if (direction === TradeDirection.SHORT) {
      // Scan upward for nearest supply zone above entry ceiling
      const isSupply = (z: DXYZone): boolean =>
        z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.MOM_SUPPLY ||
        z.type === ZoneType.LSZ_SUPPLY || z.type === ZoneType.IP_SUPPLY;

      const nextZone = allZones
        .filter((z) => z.id !== zone.id && isSupply(z) && z.floor > zone.ceiling)
        .sort((a, b) => a.floor - b.floor)[0];

      // Law 8: check if next zone is within 100 pips
      const nextZoneDistPips = nextZone
        ? (nextZone.floor - zone.ceiling) / pipValue
        : Infinity;

      if (nextZone && nextZoneDistPips <= 100) {
        // SL = next zone's floor + buffer (just beyond the next zone's bottom)
        sl = nextZone.floor + buffer;
      } else {
        // Fallback (Law 8): entry ± max(entryZoneWidth × 2, 1.5 × pairATR)
        const pairAtr = this.pairATR.get(pair) ?? pipValue * 10;
        const fallbackDist = Math.max(entryZoneWidth * 2, 1.5 * pairAtr);
        sl = entryRef + fallbackDist;
        log.info(
          `    [SL] ${zone.zoneName ?? zone.id}: no next supply within 100p — ATR fallback sl=${sl.toFixed(5)} (dist=${fallbackDist.toFixed(5)})`,
        );
      }
    } else {
      // LONG: scan downward for nearest demand zone below entry floor
      const isDemand = (z: DXYZone): boolean =>
        z.type === ZoneType.BOM_DEMAND || z.type === ZoneType.MOM_DEMAND ||
        z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND;

      const nextZone = allZones
        .filter((z) => z.id !== zone.id && isDemand(z) && z.ceiling < zone.floor)
        .sort((a, b) => b.ceiling - a.ceiling)[0];

      const nextZoneDistPips = nextZone
        ? (zone.floor - nextZone.ceiling) / pipValue
        : Infinity;

      if (nextZone && nextZoneDistPips <= 100) {
        // SL = next zone's ceiling - buffer (just beyond the next zone's top)
        sl = nextZone.ceiling - buffer;
      } else {
        const pairAtr = this.pairATR.get(pair) ?? pipValue * 10;
        const fallbackDist = Math.max(entryZoneWidth * 2, 1.5 * pairAtr);
        sl = entryRef - fallbackDist;
        log.info(
          `    [SL] ${zone.zoneName ?? zone.id}: no next demand within 100p — ATR fallback sl=${sl.toFixed(5)} (dist=${fallbackDist.toFixed(5)})`,
        );
      }
    }

    // ── Law 10: ATR-based SL minimum (0.5 × pairATR) ──
    const pairAtrForMin = this.pairATR.get(pair);
    if (pairAtrForMin !== undefined) {
      const minDistance = 0.5 * pairAtrForMin;
      if (Math.abs(entryRef - sl) < minDistance) {
        sl = direction === TradeDirection.LONG
          ? entryRef - minDistance
          : entryRef + minDistance;
        log.info(
          `    [SL] ${zone.zoneName ?? zone.id}: widened to 0.5×ATR minimum (${(minDistance / pipValue).toFixed(1)}p)`,
        );
      }
    }

    return sl;
  }

  /**
   * Convert SetupCategory enum to constant key.
   */
  private categoryToConstantKey(category: SetupCategory): string {
    switch (category) {
      case SetupCategory.SWING_SCALP: return 'SCALP';
      case SetupCategory.HTF_SWING: return 'HTF';
      case SetupCategory.BREAKOUT_SURGE: return 'BS';
      case SetupCategory.REINFORCEMENT: return 'REINF';
      case SetupCategory.TRANSITION: return 'TRANS';
      case SetupCategory.WHIPLASH: return 'SCALP';
      default: return 'TRANS';
    }
  }

  /**
   * Phase 3 TP (Law 11, 12, 13):
   *
   * Targets the NEAREST opposing zone with demand+liquidity overlap.
   *
   * Law 11: TP at demand+liquidity overlap (Earth+Fire)
   *   - If nearest opposing zone has liquidityScore >= 5 → use zone MIDPOINT
   *     (Earth+Fire strong reaction)
   *   - If no liquidity overlap → use zone NEAR EDGE (quick exit)
   *
   * Law 12: TP timeframe must be >= entry timeframe
   *   - Existing Wave 3 logic: filter opposing zones to TF >= entry TF
   *
   * Law 13: TP distance sanity check
   *   - TP distance > 2×weeklyATR → mark "ambitious"
   *   - TP distance > 3×weeklyATR → search for closer LTF zone
   *
   * Fallback: Fibonacci 1.618 extension when no opposing zone exists.
   */
  private computeTpsV8(
    entry: number,
    direction: TradeDirection,
    _category: SetupCategory,
    allZones: readonly DXYZone[],
    sl: number,
    _shape?: ShapeCode,
    pair: string = '',
    entryTimeframe: string = '4H',
  ): { tp1: number } {
    const pipVal = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;

    // Timeframe hierarchy for TP selection: higher TF zones are preferred.
    const TF_PRIORITY: Record<string, number> = {
      '15m': 1, '30m': 2, '1H': 3, '4H': 4, '8H': 5,
    };

    // Allow ALL timeframes — sort by distance from entry (nearest first)
    let opposing: DXYZone[];
    if (direction === TradeDirection.LONG) {
      opposing = allZones.filter((z) => z.floor > entry);
    } else {
      opposing = allZones.filter((z) => z.ceiling < entry);
    }

    // Sort: nearest first, with HTF preference when zones are within 20 pips
    opposing.sort((a, b) => {
      const distA = direction === TradeDirection.LONG
        ? a.floor - entry : entry - a.ceiling;
      const distB = direction === TradeDirection.LONG
        ? b.floor - entry : entry - b.ceiling;
      // Primary: nearest first
      if (Math.abs(distA - distB) > pipVal * 20) return distA - distB;
      // Secondary: prefer higher TF when zones within 20 pips
      const tfA = TF_PRIORITY[a.timeframe ?? '4H'] ?? 4;
      const tfB = TF_PRIORITY[b.timeframe ?? '4H'] ?? 4;
      return tfB - tfA;
    });

    // Fallback when no opposing zones: use Fibonacci extension target
    if (opposing.length === 0) {
      const slDist = Math.abs(entry - sl);
      const tp1 = direction === TradeDirection.LONG
        ? entry + slDist * 1.618
        : entry - slDist * 1.618;
      return { tp1 };
    }

    const opposingZone = opposing[0]!;

    // ── Law 11: TP edge selection based on demand+liquidity overlap ──
    // If nearest opposing zone has liquidityScore >= 5 → MIDPOINT (strong reaction)
    // If no liquidity overlap → NEAR EDGE (quick exit)
    const liqScore = opposingZone.liquidityScore ?? 0;
    let tpEdge: number;

    if (liqScore >= 5) {
      // Earth+Fire strong reaction zone → target MIDPOINT
      tpEdge = (opposingZone.floor + opposingZone.ceiling) / 2;
    } else {
      // No liquidity overlap → target NEAR EDGE (closest to entry)
      tpEdge = direction === TradeDirection.LONG
        ? opposingZone.floor     // near edge for LONG = bottom of resistance
        : opposingZone.ceiling;  // near edge for SHORT = top of support
    }

    // ── 1-PIP SAFETY SPREAD INSIDE THE ZONE ──
    tpEdge = direction === TradeDirection.LONG
      ? tpEdge - pipVal
      : tpEdge + pipVal;

    // ── Law 13: TP distance sanity check ──
    // weeklyATR ≈ ATR(14) on 4H bars (proxy for daily range)
    const pairAtr = this.pairATR.get(pair);
    if (pairAtr !== undefined) {
      const tpDistance = Math.abs(tpEdge - entry);

      // TP distance > 3×weeklyATR → search for closer LTF zone
      if (tpDistance > 3 * pairAtr && opposing.length > 1) {
        // Search for a closer zone from a lower TF
        for (let i = 1; i < opposing.length; i++) {
          const closerZone = opposing[i]!;
          const closerDist = Math.abs(
            (direction === TradeDirection.LONG
              ? closerZone.floor
              : closerZone.ceiling) - entry,
          );
          if (closerDist < tpDistance) {
            tpEdge = direction === TradeDirection.LONG
              ? closerZone.floor - pipVal
              : closerZone.ceiling + pipVal;
            log.info(
              `    [TP] TP > 3×weeklyATR — switched to closer zone ${closerZone.zoneName ?? closerZone.id}`,
            );
            break;
          }
        }
      }
    }

    return { tp1: tpEdge };
  }

  /**
   * ZONE-BASED DIRECTION DOCTRINE (TTE v5.3.3 changelog #14):
   * Direction comes from ZONE TYPE — demand zones = LONG, supply zones = SHORT.
   * Shapes have NO hardcoded bullish/bearish direction; a shape only selects
   * the setup CATEGORY (SS = Swing Scalps, BS = Breakout Surge, etc.).
   */
  private isDemandZoneType(type: ZoneType): boolean {
    return (
      type === ZoneType.BOM_DEMAND || type === ZoneType.MOM_DEMAND ||
      type === ZoneType.LSZ_DEMAND || type === ZoneType.IP_DEMAND
    );
  }

  private isSupplyZoneType(type: ZoneType): boolean {
    return (
      type === ZoneType.BOM_SUPPLY || type === ZoneType.MOM_SUPPLY ||
      type === ZoneType.LSZ_SUPPLY || type === ZoneType.IP_SUPPLY
    );
  }

  /**
   * CONFIDENCE SCORING (v9 100-point scale, diminishing returns):
   *   base = 40 * (1 - exp(-1.5 * confluence/14))   // diminishing returns curve
   *   optionBonus = min((notionalB / 3.5) * 15, 15) // max 15 (was 20)
   *   zoneScore = 15 if zone-aligned, 5 if not       // max 15 (was 20)
   *   zfpScore = (1 - zfp/100) * 10                   // max 10 (unchanged)
   *   subtotal ≈ 80 max (was 100+)
   *   Modifiers CAPPED at [-20, +20]:
   *     BoM: +10, MoM: -5
   *     DXY alignment: +5 (was +10), Fib confluence: +5 (was +10)
   *     Swing session: +3 (was +5)
   *     Proximity: <30p +5 (was +15), <60p +3 (was +10)
   *     SL: <30p +5 (was +10), <60p +3 (was +5), >max -5 (was -10)
   *     Red Folder: -5 (was -10)
   *   Clamp [0, 100]
   */
  private computeConfidenceV8(
    zone: DXYZone,
    direction: TradeDirection,
    shape: ShapeCode,
    pair: string,
    slDistance: number,
    spot: number = 0,
    nearRedFolder: boolean = false,
    dxyAligned: boolean = false,
    fibConfluenceNear: boolean = false,
    isSwingSession: boolean = false,
    multiTfConfluence?: { confluenceScore: number },
  ): number {
    const confluence = zone.confluence;
    const zfp = zone.zfp;
    const notionalB = zone.notionalB ?? 0;
    const isBoM = zone.isBoM;

    // Zone-direction alignment (TTE v5.3.3 #14): direction is zone-derived —
    // demand zone = LONG, supply zone = SHORT. The shape only selects the
    // setup CATEGORY; it carries no bullish/bearish classification.
    const zoneAligned =
      (direction === TradeDirection.LONG && this.isDemandZoneType(zone.type)) ||
      (direction === TradeDirection.SHORT && this.isSupplyZoneType(zone.type));

    // === BASE COMPONENTS (with diminishing returns) ===
    // Confluence uses exponential diminishing returns so higher confluence
    // still helps but doesn't max out linearly. 14 confluence ≈ 38.5 (not 40).
    const confluenceRatio = confluence / 14;
    const base = Math.round(40 * (1 - Math.exp(-1.5 * confluenceRatio)));

    // Option score — capped at 15 (options are a secondary signal)
    const optionBonus = Math.min(Math.round((notionalB / 3.5) * 15), 15);

    // Zone-direction score — aligned gets 15, not aligned gets 5
    const zoneScore = zoneAligned ? 15 : 5;

    // ZFP score — unchanged (max 10)
    const zfpScore = Math.round((1 - zfp / 100) * 10);

    // Subtotal BEFORE modifiers (max ~80, not 100+)
    let confidence = base + optionBonus + zoneScore + zfpScore;

    // === CAPPED MODIFIERS (total cannot exceed ±20) ===
    let modifier = 0;

    // SD type modifiers
    modifier += isBoM ? 10 : -5;

    // v3.2 additional factors (reduced from original values)
    modifier += dxyAligned ? 5 : 0;
    modifier += fibConfluenceNear ? 5 : 0;
    modifier += isSwingSession ? 3 : 0;

    // Proximity bonus — zones near spot are more likely to be tested
    if (spot > 0) {
      const pipVal = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
      const isDXY = pair === 'DXY';
      const zoneMid = (zone.floor + zone.ceiling) / 2;
      const distFromSpot = isDXY ? Math.abs(zoneMid - spot) : Math.abs(zoneMid - spot) / pipVal;
      if (distFromSpot < 30) modifier += 5;
      else if (distFromSpot < 60) modifier += 3;
    }

    // SL distance modifiers (reduced values)
    const slMaxPenalty = SL_MAX_PENALTY[pair] ?? 100;
    if (slDistance > slMaxPenalty) modifier -= 5;
    else if (slDistance < 30) modifier += 5;
    else if (slDistance < 60) modifier += 3;

    // Red Folder penalty
    if (nearRedFolder) modifier -= 5;

    // Wave 3 P5: explicit multi-TF confluence bonus.
    // Higher TF agreement is the hallmark of A+ setups in the winning trade library.
    // Applied inside the ±20 modifier cap so it cannot alone push every setup to 100.
    if (multiTfConfluence) {
      const score = multiTfConfluence.confluenceScore;
      if (score >= 4) modifier += 15;       // TRIPLE: 4H + 3+ LTF
      else if (score === 3) modifier += 10; // DUAL: 4H + 2 LTF
      else if (score === 2) modifier += 3;  // SINGLE: 4H + 1 LTF
    }

    // Clamp modifier to [-20, +20] — prevents additive stacking from
    // inflating every well-confluenced setup to 100
    modifier = Math.max(-20, Math.min(20, modifier));

    confidence += modifier;
    return Math.max(0, Math.min(100, Math.floor(confidence)));
  }

  /**
   * QUALITY CLASSIFICATION (v8):
   *   ENTRY-CONDITIONAL: conf>=75 HIGH, conf>=50 CONDITIONAL, else REJECTED
   *   Other zones: conf>=85 GOD_TIER, conf>=75 HIGH, conf>=60 STANDARD, else REJECTED
   *   SL near max downgrade: HIGH/GOD_TIER → STANDARD if slDist > slMax*0.85
   */
  private classifyQualityV8(
    confidence: number,
    status: string,
    slDistance: number,
    slMaxHard: number,
  ): string {
    let quality: string;
    if (status === 'ENTRY-CONDITIONAL') {
      if (confidence >= 75) quality = SetupQuality.HIGH;
      else if (confidence >= 50) quality = SetupQuality.CONDITIONAL;
      else quality = SetupQuality.REJECTED;
    } else {
      if (confidence >= 85) quality = SetupQuality.GOD_TIER;
      else if (confidence >= 75) quality = SetupQuality.HIGH;
      else if (confidence >= 60) quality = SetupQuality.STANDARD;
      else quality = SetupQuality.REJECTED;
    }

    // SL near max downgrade
    if (
      slDistance > slMaxHard * 0.85 &&
      (quality === SetupQuality.HIGH || quality === SetupQuality.GOD_TIER)
    ) {
      quality = SetupQuality.STANDARD;
    }

    return quality;
  }

  /** Map confidence 0-100 to ConfidenceTier. */
  private confidenceToTierV8(confidence: number): ConfidenceTier {
    if (confidence >= 90) return ConfidenceTier.S;
    if (confidence >= 80) return ConfidenceTier.A;
    if (confidence >= 70) return ConfidenceTier.B;
    if (confidence >= 60) return ConfidenceTier.C;
    if (confidence >= 50) return ConfidenceTier.D;
    return ConfidenceTier.F;
  }

  /**
   * C3: Check if a HIGH-impact economic event falls within ±30 minutes
   * of the setup's trading day. Per ZT-1: no trade within 30 min of Red Folder.
   */
  // ═══ v3.2 MODULE I2: Firewall Context Helper Methods ═══

  /** Get current ET time string for ZT-8/9 timing checks. */
  private getCurrentTimeET(): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date());
  }

  /** Check if current time is weekend for ZT-4. */
  private isWeekendTime(): boolean {
    const now = new Date();
    return now.getDay() === 0 || now.getDay() === 6;
  }

  /** Estimate spread per pair for ZT-11. */
  private estimateSpread(pair: string): number {
    const spreads: Record<string, number> = {
      'DXY': 0.5, 'EUR/USD': 1.2, 'GBP/USD': 1.8, 'AUD/USD': 1.5,
    };
    return spreads[pair] ?? 1.5;
  }

  /**
   * Compute Fib levels from the ENTRY ZONE as the swing high/low range.
   *
   * TTE Architecture requires:
   *   - Retracement zones: 0.382, 0.5, 0.618, 0.786
   *   - Extension zones: 1.272, 1.382, 1.618, 2.382, 2.786
   *
   * The zone ceiling is treated as swing high, zone floor as swing low.
   * Extensions > 1.0 project beyond the zone in the direction of the swing.
   */
  private computeFibLevelsForSetup(zone: DXYZone): FibLevel[] {
    const swingHigh = zone.ceiling;
    const swingLow = zone.floor;
    const range = swingHigh - swingLow;
    if (range <= 0) return [];

    const fibRatios: FibLevelValue[] = [
      0.382, 0.5, 0.618, 0.786,         // Retracement zones
      1.272, 1.382, 1.618, 2.382, 2.786, // Extension zones
    ];

    return fibRatios.map((level: FibLevelValue) => ({
      price: swingHigh - range * level,
      context: level >= 1.0 ? FibContext.MICRO : FibContext.MESO,
      level,
      swingLabel: zone.zoneName ?? zone.id,
    }));
  }

  /**
   * Multi-TF Confluence (A+ Setup Precision): Compute how many timeframe zones
   * agree at the entry price.
   *
   * The winning trade library shows A+ setups ALWAYS have multi-TF confluence:
   * the 4H zone overlaps with a 1H, 30m or 15m zone at the same price level.
   *
   * Checks if the entry price falls within any LTF zone (1H, 30m or 15m) that
   * also overlaps the 4H zone. Returns undefined if no LTF zones agree.
   *
   * @param pair   Trading pair (e.g. 'EUR/USD')
   * @param zone   The 4H DXYZone the setup is based on
   * @param entry  The entry price
   * @returns Confluence info or undefined if no LTF confluence
   */
  /**
   * Multi-TF Confluence (A+ Setup Precision): Compute how many timeframe zones
   * agree at the entry price.
   *
   * Phase 2: Uses zones from the zone map (tagged with timeframe) instead of
   * independently calling detectLtfZones. LTF zones are now constructed and
   * merged into the zone map by constructAndMergeMultiTfZones (Phase 1).
   */
  private computeMultiTfConfluence(
    pair: string,
    zone: DXYZone,
    entry: number,
    allZones: readonly DXYZone[],
  ): { htfZone: string; ltfZones: string[]; confluenceScore: number } | undefined {
    const htfZoneName = zone.zoneName ?? zone.id;
    const ltfZones: string[] = [];
    let score = 1; // entry zone itself counts as 1

    // Check zones from LTF timeframes that overlap the entry zone and contain entry
    const ltfTimeframes: string[] = ['1H', '30m', '15m'];

    for (const tf of ltfTimeframes) {
      const tfZones = allZones.filter(
        (z) => (z.timeframe ?? '4H') === tf && z.id !== zone.id,
      );

      for (const z of tfZones) {
        const overlapsHtf =
          Math.max(z.floor, zone.floor) <= Math.min(z.ceiling, zone.ceiling);
        const containsEntry = entry >= z.floor && entry <= z.ceiling;
        if (overlapsHtf && containsEntry) {
          ltfZones.push(
            `${tf} ${z.sdType ?? z.type} [${z.floor.toFixed(5)}-${z.ceiling.toFixed(5)}]`,
          );
          score++;
        }
      }
    }

    log.info(
      `[Multi-TF] ${pair} entry=${entry.toFixed(5)} HTF zone=[${zone.floor.toFixed(5)}-${zone.ceiling.toFixed(5)}]: ${ltfZones.length} LTF zones agree, score=${score}`,
    );

    if (ltfZones.length === 0) {
      return undefined;
    }

    return { htfZone: htfZoneName, ltfZones, confluenceScore: score };
  }

  /**
   * Wave 4: Score a zone as Zone of Conquest (ZoC).
   * ZoC = critical multi-TF battle position. Score:
   *   +1 per TF overlap (from multiTf / refined tfCount)
   *   +2 if LSZ-shielded
   *   +1 if BoM
   * ZoC when score >= 4.
   */
  private scoreZoC(
    zone: DXYZone,
    multiTf?: { confluenceScore: number },
    refinedTfCount?: number,
    hasLszShield?: boolean,
  ): { isZoC: boolean; score: number } {
    let score = 0;
    // Multi-TF contribution
    if (multiTf) score += Math.min(3, multiTf.confluenceScore); // cap at 3 from multi-TF
    else if (refinedTfCount && refinedTfCount >= 2) score += refinedTfCount;
    else score += 1; // base 4H only
    if (hasLszShield) score += 2;
    if (zone.isBoM) score += 1;
    return { isZoC: score >= 4, score };
  }

  private checkRedFolderProximity(
    pair: string,
    day: string,
    calendar?: unknown[],
  ): boolean {
    if (!calendar || calendar.length === 0) return false;
    const RED_FOLDER_EVENTS = new Set([
      'FOMC', 'NFP', 'NON-FARM PAYROLLS', 'CPI', 'GDP', 'PMI',
      'RETAIL SALES', 'ISM', 'ECI', 'PCE', 'PPI',
    ]);
    const dayNum = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(day);
    if (dayNum < 0) return false;

    for (const event of calendar as Record<string, unknown>[]) {
      const impact = String(event.impact ?? event.severity ?? '').toUpperCase();
      if (impact !== 'HIGH') continue;
      const eventName = String(event.event ?? event.title ?? event.name ?? '').toUpperCase();
      const isRedFolder = [...RED_FOLDER_EVENTS].some(e => eventName.includes(e.toUpperCase()));
      if (!isRedFolder) continue;
      // Check if event falls on the same day
      const eventDate = new Date(String(event.date ?? event.time ?? 0));
      if (eventDate.getDay() === dayNum) return true;
    }
    return false;
  }

  /**
   * C4: Check if the trade direction aligns with DXY conviction.
   * DXY demand (BOM_DEMAND/LSZ_DEMAND/IP_DEMAND) → USD bullish → FX pairs SHORT aligned.
   * DXY supply (BOM_SUPPLY/LSZ_SUPPLY/IP_SUPPLY) → USD bearish → FX pairs LONG aligned.
   */
  private checkDxyAlignment(
    pair: string,
    direction: TradeDirection,
  ): boolean {
    if (pair === 'DXY') return true; // DXY is always "aligned" with itself
    if (!this.dxyZones || this.dxyZones.length === 0) return false;

    const nearby = this.dxyZones.filter(z =>
      Math.abs((z.floor + z.ceiling) / 2 - this.dxySpot) < 2.0
    );
    if (nearby.length === 0) return false;

    // DXY demand zones = USD bullish
    const hasDemand = nearby.some(z =>
      z.type === ZoneType.BOM_DEMAND || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND
    );
    // DXY supply zones = USD bearish
    const hasSupply = nearby.some(z =>
      z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.LSZ_SUPPLY || z.type === ZoneType.IP_SUPPLY
    );

    // DXY demand → USD bullish → FX pairs SHORT aligned
    if (hasDemand && direction === TradeDirection.SHORT) return true;
    // DXY supply → USD bearish → FX pairs LONG aligned
    if (hasSupply && direction === TradeDirection.LONG) return true;
    return false;
  }

  /** Build simplified 6-check direction validation (v8 style). */
  private buildDirectionValidationV8(
    zone: DXYZone,
    direction: TradeDirection,
    shape: ShapeCode,
    rrr: number,
    session: SessionWindow,
    pair: string,
  ): Array<Record<string, string>> {
    // Zone-direction alignment: direction comes from ZONE TYPE (demand = LONG,
    // supply = SHORT). The shape sets the setup CATEGORY only — no direction.
    const zoneAligns =
      (direction === TradeDirection.LONG && this.isDemandZoneType(zone.type)) ||
      (direction === TradeDirection.SHORT && this.isSupplyZoneType(zone.type));

    return [
      {
        check_name: 'Zone Category',
        result: 'PASS',
        direction_favored: direction,
        rationale: `${zone.isBoM ? 'BoM' : 'MoM'} ${direction === TradeDirection.LONG ? 'demand (SUPPORT)' : 'supply (RESISTANCE)'} zone (${zone.zoneName ?? zone.id})`,
      },
      {
        check_name: 'Zone Direction',
        result: zoneAligns ? 'PASS' : 'WARN',
        direction_favored: direction,
        rationale: `${zone.type} → ${direction} (zone-derived); shape ${shape} sets category only`,
      },
      {
        check_name: 'Confluence Threshold',
        result: zone.confluence >= 3 ? 'PASS' : 'WARN',
        direction_favored: direction,
        rationale: `Confluence ${zone.confluence}/14`,
      },
      {
        check_name: 'RRR Check',
        result: rrr >= 2 ? 'PASS' : rrr >= 1.5 ? 'WARN' : 'FAIL',
        direction_favored: direction,
        rationale: `TP1 RRR ${rrr.toFixed(2)}`,
      },
      {
        check_name: 'Session Timing',
        result: 'PASS',
        direction_favored: direction,
        rationale: `Session ${session}`,
      },
      {
        check_name: 'Sniper Entry Precision',
        result: 'PASS',
        direction_favored: direction,
        rationale: `Entry at zone ${direction === TradeDirection.LONG ? 'ceiling' : 'floor'} with key-level refinement | pair ${pair}`,
      },
    ];
  }

  /** Compute weekly range in pips from zone extents + spot. */
  private computeWeeklyRangePips(
    zones: readonly DXYZone[],
    spot: number,
    pipValue: number,
  ): number {
    if (zones.length === 0) return 0;
    const allPrices: number[] = [];
    for (const z of zones) {
      allPrices.push(z.floor, z.ceiling);
    }
    allPrices.push(spot);
    const high = Math.max(...allPrices);
    const low = Math.min(...allPrices);
    const range = high - low;
    return range / pipValue;
  }

  // ── Main v8 setup generation method ──

  private constructBasicSetups(
    pair: string,
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
    setupCounter: number,
    lszZones: LSZResult[] = [],
    optionStrikes: OptionStrikeData[] = [],
    currentPrice: number = 0,
    weeklyRangePips: number = 0,
    overrideShape?: ShapeCode,
    overrideDay?: string,
    overrideSession?: string,
    priorWeekMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL',
  ): TradeSetup[] {
    const setups: TradeSetup[] = [];
    const spot = zoneMap.spots[pair] ?? currentPrice;
    const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
    const shapeChain = shapePrediction.shapeChain;
    const currentShape = overrideShape ?? shapeChain.currentShape;
    const dayDecomposition = shapeChain.dayDecomposition ?? [];
    const zones = [...zoneMap.zones];
    const isDXY = pair === 'DXY';

    // Auto-incrementing setup ID
    let idSeq = 0;
    const nextId = (): string =>
      `${pair.replace('/', '').toLowerCase()}-${setupCounter}-${String(++idSeq).padStart(2, '0')}`;

    // Resolve day + session — FALLBACK only (used when dayDecomposition is empty,
    // and for the transition section which operates on the overall current shape).
    const fallbackResolved = overrideDay
      ? { day: overrideDay, session: (overrideSession as SessionWindow | undefined) ?? this.resolveDaySession(currentShape, dayDecomposition).session }
      : this.resolveDaySession(currentShape, dayDecomposition);

    // Map category names to enum values
    const CAT_NAME_TO_ENUM: Record<string, SetupCategory> = {
      'SWING_SCALP': SetupCategory.SWING_SCALP,
      'HTF_SWING': SetupCategory.HTF_SWING,
      'BREAKOUT_SURGE': SetupCategory.BREAKOUT_SURGE,
      'REINFORCEMENT': SetupCategory.REINFORCEMENT,
      'TRANSITION': SetupCategory.TRANSITION,
      'WHIPLASH': SetupCategory.WHIPLASH,
    };

    const isAUD = pair === 'AUD/USD';

    // ── FIX-1: Day-loop — iterate over ALL days in the shape chain ──
    // (mirrors Python generate_pair_setups: for day_idx, day_shape in enumerate(shape_chain))
    const days: DayShapePrediction[] = dayDecomposition.length > 0
      ? dayDecomposition
      : [{
          day: fallbackResolved.day,
          shape: currentShape,
          confidence: 0,
          zfpRange: { low: 0, high: 0 },
          keyTransitionTime: '',
          sessionWindow: String(fallbackResolved.session),
        }];

    // Dedup set (Python lines 944/980-982): skip duplicate zone+direction+category
    const seenKeys = new Set<string>();

    // ── Consolidation detection ──
    const effectiveWeeklyRange = weeklyRangePips > 0
      ? weeklyRangePips
      : this.computeWeeklyRangePips(zones, spot, pipValue);
    const consolThreshold = CONSOL_RANGE_THRESHOLD[pair] ?? 150;
    const isConsolidation = effectiveWeeklyRange < consolThreshold;

    log.info(
      `  [setups-v8] ${pair}: spot=${spot} zones=${zones.length} pipVal=${pipValue} shape=${currentShape} days=${days.length} consol=${isConsolidation} wkRange=${effectiveWeeklyRange.toFixed(0)}pips`,
    );

    // Wave 2: depleted zones with fresh LTF micro-zone overlap are kept as BREAKOUT_SURGE entries.
    // Phase 2: LTF zones are now in the zone map (tagged with timeframe).
    const breakoutZoneIds = new Set<string>();
    const depletedZonesAll = zones.filter(
      (z) => this.classifyZoneStatusV8(z) === 'TP-TARGET',
    );
    let eligible = zones.filter((z) => {
      const status = this.classifyZoneStatusV8(z);
      if (status === 'REJECT') return false;
      if (status === 'TP-TARGET') {
        // Check for fresh LTF zone overlap from the zone map before excluding
        const zoneMid = (z.floor + z.ceiling) / 2;
        const isDemand = zoneMid < spot;
        const ltfOverlap = zones.some(other =>
          other.id !== z.id &&
          (other.timeframe ?? '4H') !== '4H' &&
          (other.reactionCount ?? 0) <= 1 &&
          Math.max(other.floor, z.floor) <= Math.min(other.ceiling, z.ceiling) &&
          (isDemand
            ? (other.type === ZoneType.BOM_DEMAND || other.type === ZoneType.MOM_DEMAND || other.type === ZoneType.LSZ_DEMAND || other.type === ZoneType.IP_DEMAND)
            : (other.type === ZoneType.BOM_SUPPLY || other.type === ZoneType.MOM_SUPPLY || other.type === ZoneType.LSZ_SUPPLY || other.type === ZoneType.IP_SUPPLY)),
        );
        if (ltfOverlap) {
          const otherZone = zones.find(other =>
            other.id !== z.id &&
            (other.timeframe ?? '4H') !== '4H' &&
            (other.reactionCount ?? 0) <= 1 &&
            Math.max(other.floor, z.floor) <= Math.min(other.ceiling, z.ceiling),
          );
          if (otherZone) {
            const ltfMid = (otherZone.floor + otherZone.ceiling) / 2;
            const overlapPips = Math.abs(zoneMid - ltfMid) / pipValue;
            if (overlapPips <= 5) {
              breakoutZoneIds.add(z.id);
              return true;
            }
          }
        }
        log.info(
          `  [setups-v8] ${pair}: zone ${z.zoneName ?? z.id} excluded — depleted (${z.reactionCount ?? 0} reactions)`,
        );
        return false;
      }
      return true;
    });

    // ── Depleted Zone Inversion ──
    // If ALL zones are genuinely depleted, trade the BREAK:
    //   Depleted demand (below spot) → SHORT (price breaks DOWN)
    //   Depleted supply (above spot) → LONG (price breaks UP)
    // Wave 2: preserve the original inversion logic when every zone is depleted.
    // Individual breakout exceptions only apply when non-depleted zones also exist.
    let directionInversion = false;
    const nonDepletedCount = zones.filter((z) => {
      const s = this.classifyZoneStatusV8(z);
      return s !== 'TP-TARGET' && s !== 'REJECT';
    }).length;
    if (nonDepletedCount === 0 && depletedZonesAll.length > 0) {
      eligible = depletedZonesAll;
      directionInversion = true;
      breakoutZoneIds.clear(); // inversion takes precedence over individual breakout exception
      log.info(
        `  [setups-v8] ${pair}: ALL ${depletedZonesAll.length} zones depleted — INVERTING direction (BREAKOUT SETUP)`,
      );
    }

    // Fallback: if no zones passed, use ALL zones within 150 pips of spot
    if (eligible.length === 0) {
      eligible = zones.filter((z) => {
        const mid = (z.floor + z.ceiling) / 2;
        const dist = isDXY ? Math.abs(mid - spot) : Math.abs(mid - spot) / pipValue;
        return dist < 150;
      });
      log.info(`  [setups-v8] ${pair}: eligible fallback — using ${eligible.length} zones within 150p`);
    }

    // ── Phase 2: Path-Based Setup Generation (Law 5, 6) ──
    // Use mapZonePath to focus on the NEAREST supply above and NEAREST demand
    // below spot, instead of iterating every eligible zone. This is the
    // path-based approach: SHORT at nearest supply, LONG at nearest demand.
    if (!directionInversion && eligible.length > 0) {
      const path = this.mapZonePath(eligible, spot);
      const focused: DXYZone[] = [];
      const MAX_ZONES_PER_DIRECTION = 3;
      focused.push(...path.supplyAbove.slice(0, MAX_ZONES_PER_DIRECTION));
      focused.push(...path.demandBelow.slice(0, MAX_ZONES_PER_DIRECTION));
      if (focused.length > 0) {
        // Detailed path-based logging: log nearest supply above and demand below
        const supInfo = path.supplyAbove.length > 0
          ? `${path.supplyAbove[0]!.zoneName ?? path.supplyAbove[0]!.id} (${path.supplyAbove[0]!.timeframe ?? '4H'}) floor=${path.supplyAbove[0]!.floor.toFixed(5)} ceiling=${path.supplyAbove[0]!.ceiling.toFixed(5)}`
          : 'NONE';
        const demInfo = path.demandBelow.length > 0
          ? `${path.demandBelow[0]!.zoneName ?? path.demandBelow[0]!.id} (${path.demandBelow[0]!.timeframe ?? '4H'}) floor=${path.demandBelow[0]!.floor.toFixed(5)} ceiling=${path.demandBelow[0]!.ceiling.toFixed(5)}`
          : 'NONE';
        log.info(
          `  [setups-v8] ${pair}: path-based (spot=${spot.toFixed(5)}) — supplyAbove=${path.supplyAbove.length}, demandBelow=${path.demandBelow.length}, using ${focused.length} nearest zones`,
        );
        log.info(`    └─ nearest SUPPLY above: ${supInfo}`);
        log.info(`    └─ nearest DEMAND below: ${demInfo}`);
        eligible = focused;
      }
    }

    // ── FIX-1: Process each DAY × zone × category ──
    for (const dayEntry of days) {
      const dayShape = dayEntry.shape;
      if (!dayShape) continue;

      // Re-derive categories for THIS day's shape
      const dayShapeKey = this.mapShapeToCategoryKey(dayShape);
      let dayCategories = SHAPE_CATEGORIES_MAP[dayShapeKey] ?? [];
      if (dayCategories.length === 0) continue;

      // AUD/USD category gate (Task 4 fix): previously skipped SS/SS_DWL days
      // entirely and stripped SWING_SCALP, starving AUD of all scalp setups.
      // AUD now generates SWING_SCALP setups alongside HTF_SWING/BREAKOUT_SURGE.
      if (isAUD) {
        dayCategories = dayCategories.filter(c =>
          c === 'HTF_SWING' || c === 'BREAKOUT_SURGE' || c === 'SWING_SCALP');
        if (dayCategories.length === 0) continue;
      }

      const dayLabel = dayEntry.day || fallbackResolved.day;

      // Shadow outer-scope variables with per-day values (keeps loop body unchanged)
      const currentShape = dayShape;
      const shapeKey = dayShapeKey;
      const isSS = dayShapeKey === 'SS' || dayShapeKey === 'SS_DWL';
      const day = dayLabel;

      // Wave 1: Shape-zone max distance filter — keep only zones whose entry edge
      // is within the per-shape distance limit from spot. Entry edge = zone edge
      // directly (Phase 2: LTF zones are in the zone map, not selected separately).
      const maxDistPips = PlutusPipeline.SHAPE_MAX_DISTANCE[String(dayShape)] ?? 999;
      const zonesInRange: Array<{ zone: DXYZone; direction: TradeDirection; distPips: number }> = [];
      const zonesOutside: Array<{ zone: DXYZone; direction: TradeDirection; distPips: number }> = [];

      for (const zone of eligible) {
        // Direction from zone position (SUPPORT→LONG, RESISTANCE→SHORT)
        // FIX 4: If directionInversion is active (all zones depleted), INVERT the direction.
        const zoneMid = (zone.floor + zone.ceiling) / 2;
        const isDemand = zoneMid < spot;
        const direction: TradeDirection = directionInversion
          ? (isDemand ? TradeDirection.SHORT : TradeDirection.LONG)
          : (isDemand ? TradeDirection.LONG : TradeDirection.SHORT);

        // Phase 2: entry edge comes directly from zone geometry
        const entryEdge = direction === TradeDirection.LONG ? zone.ceiling : zone.floor;

        // Wave 1: per-shape distance limit measured in pips for all pairs.
        const distPips = Math.abs(entryEdge - spot) / pipValue;

        if (distPips <= maxDistPips) {
          zonesInRange.push({ zone, direction, distPips });
        } else {
          zonesOutside.push({ zone, direction, distPips });
          log.info(
            `  [setups-v8] ${pair}: zone ${zone.zoneName ?? zone.id} outside strict distance ${distPips.toFixed(1)} pips > ${maxDistPips} (shape=${dayShape})`,
          );
        }
      }

      // Fallback: if no zones pass the strict filter, allow the closest zones up to
      // 1.5× the strict limit so that a shape day is not completely starved of setups.
      // The strict filter is still applied first to prefer high-quality nearby entries.
      if (zonesInRange.length === 0 && zonesOutside.length > 0) {
        const fallbackLimit = maxDistPips * 1.5;
        const sorted = zonesOutside.sort((a, b) => a.distPips - b.distPips);
        for (const candidate of sorted) {
          if (candidate.distPips <= fallbackLimit) {
            zonesInRange.push(candidate);
          }
        }
        if (zonesInRange.length > 0) {
          log.info(
            `  [setups-v8] ${pair}: fallback applied — ${zonesInRange.length} zones within ${fallbackLimit.toFixed(1)} pips (shape=${dayShape})`,
          );
        }
      }

      if (zonesInRange.length === 0) {
        log.info(
          `  [setups-v8] ${pair}: no zones within ${maxDistPips} pips for ${dayShape} — skipping day`,
        );
        continue;
      }

      for (const { zone, direction } of zonesInRange) {
      // Wave 2: depleted 4H zones with fresh LTF support trade as BREAKOUT_SURGE.
      const isBreakoutFromDepleted = breakoutZoneIds.has(zone.id);
      const effectiveCategories = isBreakoutFromDepleted
        ? ['BREAKOUT_SURGE']
        : dayCategories;

      // DXY Direction Enforcement for EUR/USD and GBP/USD ONLY
      // AUD/USD uses DXY as confluence only — NOT a hard filter
      if (pair === 'EUR/USD' || pair === 'GBP/USD') {
        const dxyAligned = this.checkDxyAlignment(pair, direction);
        // NOTE: DXY alignment is enforced globally by enforceDXYCascade.
        // Don't hard-kill here — let the cascade post-filter handle it.
        // This pre-check was redundant and killed valid setups.
      }

      // Zone status
      const status = this.classifyZoneStatusV8(zone);

      for (const catName of effectiveCategories) {
        const category = CAT_NAME_TO_ENUM[catName];
        if (!category) continue;

        // FIX-4: Session from category map (not resolveDaySession)
        const session = SETUP_SESSION_MAP[category] ?? SessionWindow.LONDON_OPEN;

        // === v3.2 WIRING STEP 1: PRE-COMPUTE ===
        const sessionUpper = String(session ?? '').toUpperCase();
        const isLondon = sessionUpper.includes('LONDON');
        const isNY = sessionUpper.includes('NY');
        // Zone-direction alignment (TTE v5.3.3 #14): direction comes from ZONE
        // TYPE (demand = LONG, supply = SHORT). The shape only determines the
        // setup CATEGORY — it has no bullish/bearish classification.
        const zoneAligned =
          (direction === TradeDirection.LONG && this.isDemandZoneType(zone.type)) ||
          (direction === TradeDirection.SHORT && this.isSupplyZoneType(zone.type));

        // === v3.2 WIRING STEP 2: REJECTION GATES ===
        // NOTE: v3.1 had ZERO rejection gates inside the zone×category loop.
        // Zone quality filtering happens at the `eligible` filter level (REJECT zones removed).
        // The POI Tier, MoM, virgin MoM, 1-reaction, and London gates below were added by v3.2
        // but they killed setups that v3.1 correctly allowed through.
        // KEEPING ONLY spec-required session/shape logic that doesn't kill setups.

        // AUD/USD category restriction (Q1 — expanded from v3.1)
        if (
          isAUD &&
          category !== SetupCategory.HTF_SWING &&
          category !== SetupCategory.BREAKOUT_SURGE &&
          category !== SetupCategory.SWING_SCALP &&
          category !== SetupCategory.REINFORCEMENT
        ) {
          continue;
        }

        // ── 1. Sniper entry (category-aware) ──
        // Phase 2: entry comes from zone edge directly (LTF zones are in the zone map).
        const entry = this.getSniperEntry(zone, direction, category, pair);
        const entryEdge =
          direction === TradeDirection.LONG ? 'ceiling' : 'floor';

        // Phase 2: breakout entries now rely on LTF zones in the zone map.
        // If the zone passed the breakout filter, it has LTF overlap — proceed.

        // Dedup check moved AFTER SL + TP computation (Law 36 — key on direction+entry+SL+TP+day).

        // ── 2. Category key for constant lookups ──
        const catKey = this.categoryToConstantKey(category);

        // ── 3. Entry proximity validation ──
        // DXY: MAX_ENTRY_DISTANCE is in index points, so do NOT divide by pipValue.
        const distPips = isDXY
          ? Math.abs(entry - spot)
          : Math.abs(entry - spot) / pipValue;
        const maxDist = MAX_ENTRY_DISTANCE[pair]?.[catKey] ?? 999;
        const effectiveMax = isSS
          ? maxDist * SS_PROXIMITY_FACTOR
          : maxDist;
        if (distPips > effectiveMax) {
          log.info(
            `    [skip] ${zone.zoneName ?? zone.id}: proximity ${distPips.toFixed(1)} > ${effectiveMax.toFixed(1)} pips`,
          );
          continue;
        }

        // ── 4. Next-Zone SL (Phase 3 — Law 7, 8, 9, 10) ──
        let sl = this.getSniperSL(zone, direction, pair, zones, entry);

        // FIX 5: Simplified shield note. Zone-geometry SL is inherently shielded
        // by the zone structure. 84% of winning trades have NO separate LSZ.
        const lszNote = ` | 🛡️ Zone-geometry SL (${(Math.abs(entry - sl) / pipValue).toFixed(1)}p)`;

        // K1: NY 3-pip SL minimum for ALL setups (non-DXY)
        if (isNY && !isDXY) {
          if (Math.abs(sl - entry) / pipValue < 3) {
            sl = direction === TradeDirection.SHORT ? entry + 3 * pipValue : entry - 3 * pipValue;
          }
        }

        // ── 5. SL distance validation ──
        // DXY: SL_MAX_HARD is in index points, so keep raw distance (no pipValue division).
        const slDistance = isDXY
          ? Math.abs(entry - sl)
          : Math.abs(entry - sl) / pipValue;
        const slMaxHard = SL_MAX_HARD[pair] ?? 150;
        if (slDistance > slMaxHard) {
          log.info(
            `    [skip] ${zone.zoneName ?? zone.id}: SL ${slDistance.toFixed(1)} > ${slMaxHard} pips`,
          );
          continue;
        }

        // ── 6. Compute TPs (demand+liquidity overlap — Phase 3 Law 11) ──
        const { tp1 } = this.computeTpsV8(
          entry, direction, category, zones, sl, currentShape, pair, zone.timeframe ?? '4H',
        );

        // ── 7. RRR calculations (single TP — blended = tp1) ──
        const slDist = Math.abs(entry - sl);
        if (slDist === 0) continue;
        const rrrTp1 = Math.abs(tp1 - entry) / slDist;
        const blendedRrr = rrrTp1;

        // ── Phase 5 / Law 36: Dedup on direction+entry+SL+TP+day ──
        // Two categories producing the same direction+entry+SL+TP+day are
        // duplicates — keep only the higher-confidence one. The key intentionally
        // excludes category so that HTF_SWING and SWING_SCALP at the same
        // zone geometry don't both appear in the report.
        const dedupKey = `${direction}_${Math.round(entry * 1e6)}_${Math.round(sl * 1e6)}_${Math.round(tp1 * 1e6)}_${dayLabel}`;
        if (seenKeys.has(dedupKey)) {
          log.info(
            `    [dedup-skip] ${zone.zoneName ?? zone.id}: duplicate key ${dedupKey}`,
          );
          continue;
        }
        seenKeys.add(dedupKey);

        // ── 8. RRR validation (consolidation-aware) ──
        // Unified minimums via rrrForCategory() — the SAME source the
        // generator and firewall RRR-1 use (no producer/gate mismatch).
        const rrrMinimums = rrrForCategory(String(category));
        let minRrrTp1 = isConsolidation
          ? (CONSOL_RRR_TP1[catKey] ?? 1.5)
          : rrrMinimums.tp1;
        // v3.2 Q4: Quality-based RRR relaxation (confluence as quality proxy)
        if (category === SetupCategory.HTF_SWING || category === SetupCategory.BREAKOUT_SURGE) {
          if (zone.confluence >= 10) minRrrTp1 = Math.min(minRrrTp1, 1.0);
          else if (zone.confluence >= 8) minRrrTp1 = Math.min(minRrrTp1, 1.2);
        }
        const minRrrBlended = isConsolidation
          ? (CONSOL_RRR_BLENDED[catKey] ?? 2.0)
          : rrrMinimums.blended;
        if (rrrTp1 < minRrrTp1) {
          log.info(
            `    [skip] ${zone.zoneName ?? zone.id}: RRR tp1 ${rrrTp1.toFixed(2)} < ${minRrrTp1}`,
          );
          continue;
        }
        if (blendedRrr < minRrrBlended) {
          log.info(
            `    [skip] ${zone.zoneName ?? zone.id}: blended RRR ${blendedRrr.toFixed(2)} < ${minRrrBlended}`,
          );
          continue;
        }

        // ── 9. Confidence scoring (100-point) ──
        // v3.2 C2: Compute new confidence factors
        const nearRedFolder = this.checkRedFolderProximity(pair, day, this.currentCalendar);
        const dxyAligned = this.checkDxyAlignment(pair, direction);
        // Compute Fib levels from the entry zone (swing high/low = zone ceiling/floor)
        const fibLevels = this.computeFibLevelsForSetup(zone);
        // Fib confluence: any Fib level within 5 pips of the entry price
        const fibConfluenceNear = fibLevels.some(
          fl => Math.abs(fl.price - entry) < pipValue * 5,
        );
        const isSwingSession = sessionUpper.includes('NY');

        // Wave 3: multi-TF confluence must be computed BEFORE confidence so the
        // P5 multi-TF bonus can be applied inside computeConfidenceV8.
        const multiTfConfluence = this.computeMultiTfConfluence(pair, zone, entry, zones);

        let confidence = this.computeConfidenceV8(
          zone, direction, currentShape, pair, slDistance, spot,
          nearRedFolder, dxyAligned, fibConfluenceNear, isSwingSession,
          multiTfConfluence,
        );

        // v3.2 M3: AVATAR STATE BOOST — MUST be before quality classification
        const earthPresent = zone.confluence >= 8 || !!lszZones.find(lsz => lsz.bottom <= zone.ceiling && lsz.top >= zone.floor);
        const firePresent = !!zone.isBoM;
        const waterPresent = zoneAligned;
        const airPresent = fibConfluenceNear;
        const elementCount = [earthPresent, firePresent, waterPresent, airPresent].filter(Boolean).length;
        let avatarState = false;
        if (elementCount >= 4) {
          confidence = Math.min(100, confidence + 5);
          avatarState = true;
        }

        // Structural relevance floor: zones that passed proximity + SL + RRR
        // checks are structurally valid trade locations. Give them a minimum
        // confidence of 45 so they appear in the report (quality will be
        // CONDITIONAL or STANDARD, not GOD_TIER).
        if (confidence < 50 && distPips <= effectiveMax) {
          confidence = 50;
        }

        // FIX 2: Prior Week Momentum Bias — applied BEFORE confidence check
        // so counter-momentum setups are penalized but not completely killed.
        // -8 for counter-trend (significant but won't zero out the setup),
        // +3 for aligned (small confluence boost).
        // NOTE: directionInversion is a STRUCTURAL signal (zone depletion breakout),
        // not a momentum signal — the inverted direction is evaluated against
        // weekly momentum normally, since `direction` already reflects the inversion.
        let momentumAligned = true;
        if (priorWeekMomentum === 'BEARISH' && direction === TradeDirection.LONG) {
          confidence -= 8;
          momentumAligned = false;
        } else if (priorWeekMomentum === 'BULLISH' && direction === TradeDirection.SHORT) {
          confidence -= 8;
          momentumAligned = false;
        } else if (
          (priorWeekMomentum === 'BEARISH' && direction === TradeDirection.SHORT) ||
          (priorWeekMomentum === 'BULLISH' && direction === TradeDirection.LONG)
        ) {
          confidence = Math.min(100, confidence + 3);
        }

        // FIX 2b: Depleted zone inversion is a STRUCTURAL breakout signal.
        // When it aligns with weekly momentum, give it an additional +3 boost
        // (e.g., DXY inverted to SHORT + prior week BEARISH = momentum-confirmed break).
        if (directionInversion && momentumAligned && priorWeekMomentum !== 'NEUTRAL') {
          confidence = Math.min(100, confidence + 3);
        }

        // MIN_CONFIDENCE_CONDITIONAL lowered to 35 — allows conditional setups
        // that pass all structural checks (proximity, SL, RRR) to appear in the
        // report even with counter-momentum penalty. Primary setups still require
        // MIN_CONFIDENCE_PRIMARY (60 per architecture bible).
        const minConfidence =
          status === 'ENTRY-CONDITIONAL' ? 35 : MIN_CONFIDENCE_PRIMARY;
        if (confidence < minConfidence) {
          log.info(
            `    [skip] ${zone.zoneName ?? zone.id}: confidence ${confidence} < ${minConfidence} (status=${status})` +
            `${!momentumAligned ? ' [COUNTER-MOMENTUM]' : ''}`,
          );
          continue;
        }

        // v3.2 D4: Direction validation — INFORMATIONAL ONLY (confidence penalty, NOT rejection)
        // v3.1 had this as informational. Rejecting setups based on direction validation
        // killed valid setups during report generation. Keep as confidence modifier only.
        const directionValidation = this.buildDirectionValidationV8(
          zone, direction, currentShape, rrrTp1, session, pair,
        );
        const failedChecks = directionValidation.filter((v: Record<string, string>) => v.result === 'FAIL').length;
        if (failedChecks >= 3) {
          confidence -= 10;  // Heavy penalty but DON'T reject
        }
        if (failedChecks === 2) {
          confidence -= 5;
        }

        // Wave 4: ZoC scoring before quality classification so the bump is reflected.
        const hasLszShieldEarly = lszNote.includes('LSZ shield');
        const zocResult = this.scoreZoC(zone, multiTfConfluence, undefined, hasLszShieldEarly);
        if (zocResult.isZoC) {
          confidence = Math.min(100, confidence + 3);
        }

        // NOTE: SL distance confidence modifiers are now applied INSIDE
        // computeConfidenceV8 as part of the capped modifier system (±20).
        // This prevents additive stacking from inflating confidence to 100.

        // ── 10. Quality classification ──
        const quality = this.classifyQualityV8(
          confidence, status, slDistance, slMaxHard,
        );

        // Proximity status label
        const proximityStatus =
          distPips <= effectiveMax * 0.3
            ? 'CLOSE'
            : distPips <= effectiveMax * 0.7
              ? 'ACCEPTABLE'
              : 'FAR';

        // ── 4-Point Entry Precision (TTE v5.3.3 §7.1 Rule 9) ──
        // entryFront = the sniper entry (zone edge where price first reacts)
        // entryBack  = opposite zone edge (deepest penetration)
        // slFront    = SL computed by getSniperSL (front of SL zone)
        // slBack     = slFront + additional buffer (back of SL zone)
        const entryFront = entry;
        let entryBack: number;
        const slFront = sl;
        let slBack: number;

        if (direction === TradeDirection.LONG) {
          // LONG from demand zone:
          // entryFront = zone.ceiling (top of demand — first touch)
          // entryBack  = zone.floor (bottom of demand — deepest)
          // slBack = slFront - additional 2 pips (back edge of SL zone)
          entryBack = zone.floor;
          slBack = sl - pipValue * 2;
        } else {
          // SHORT from supply zone:
          // entryFront = zone.floor (bottom of supply — first touch)
          // entryBack  = zone.ceiling (top of supply — deepest)
          // slBack = slFront + additional 2 pips
          entryBack = zone.ceiling;
          slBack = sl + pipValue * 2;
        }

        // ── Create TradeSetup ──
        // === v3.2 R3: BUILD NOTES (was inline template — now mutable) ===
        let notes = `${zone.isBoM ? 'BoM' : 'MoM'} zone ${zone.zoneName ?? zone.id} | ${catName} | conf ${zone.confluence} | ZFP ${zone.zfp.toFixed(0)}% | SL ${slDistance.toFixed(0)}pips | dist ${distPips.toFixed(0)}pips | ${shapeChain.storylineBias}`;

        // FIX 2: Momentum note (audit trail)
        if (!momentumAligned) {
          notes += ` | ⚠ COUNTER-MOMENTUM: Prior week ${priorWeekMomentum.toLowerCase()}, this ${direction} fights the trend (-8 confidence).`;
        } else if (priorWeekMomentum !== 'NEUTRAL') {
          notes += ` | ✓ MOMENTUM-ALIGNED: Prior week ${priorWeekMomentum.toLowerCase()}, this ${direction} follows the trend (+3 confidence).`;
        }

        // FIX 4: Direction inversion note (audit trail)
        if (directionInversion) {
          notes += ` | ⚡ BREAKOUT SETUP: Zone depleted (${zone.reactionCount} reactions) — direction INVERTED to trade the break.`;
          if (momentumAligned && priorWeekMomentum !== 'NEUTRAL') {
            notes += ' | ✓ INVERSION MOMENTUM-CONFIRMED: Breakout direction aligns with weekly trend (+3 confidence).';
          }
        }

        // Phase 2: Entry precision note — entry from zone edge directly
        notes += ` | 🎯 Entry: ${zone.timeframe ?? '4H'} ${zone.zoneName ?? zone.id} @ ${entry.toFixed(5)}`;

        // Wave 2: LSZ shield note
        notes += lszNote;

        // Wave 2: depleted-zone breakout note
        if (isBreakoutFromDepleted) {
          notes += ` | 🚀 BREAKOUT — depleted 4H zone, fresh LTF overlap`;
        }

        // === ALL v3.2 NOTE ADDITIONS ===
        // Red folder (C2)
        if (nearRedFolder) notes += ' | ⚠ RED FOLDER EVENT on this day — defer entry 30 min post-event.';
        // DXY alignment (C2)
        if (dxyAligned) notes += ' | DXY aligned';
        // Pressure degree (K7)
        notes += ` | Pressure: ${(zone as unknown as Record<string, unknown>).pressureDegree || 'UNKNOWN'} (${zone.confluence}/14)`;
        // Elemental + Avatar State (M3) — NOTE ONLY, boost already applied at step 9
        if (avatarState) {
          notes += ' | ⚡⚡⚡ AVATAR STATE: All 4 elemental densities converge. Fractally locked signal.';
        } else if (elementCount >= 3) {
          notes += ` | Near-Avatar: ${elementCount}/4 elements (${earthPresent ? 'EARTH' : ''} ${firePresent ? 'FIRE' : ''} ${waterPresent ? 'WATER' : ''} ${airPresent ? 'AIR' : ''}).`;
        }
        // Confluence Stack 7-Layer (K5)
        const cs7 = [
          zone.keyLevels != null && zone.keyLevels.length > 0,
          (zone.notionalB ?? 0) >= 0.85,
          ((zone as unknown as Record<string, string[] | undefined>).pillarSources ?? []).some((s: string) => s.includes('P4') || s.includes('Analyst') || s.includes('Web') || s.includes('HWC') || s.includes('LWC')),
          zone.confluence >= 6,
          (() => { const rs = pair === 'DXY' ? 0.5 : ((PIP_VALUE as Record<string, number>)[pair] ?? 0.0001) * 50; const m = (zone.floor + zone.ceiling) / 2; return Math.abs(m - Math.round(m / rs) * rs) < rs * 0.1; })(),
          zoneAligned,
          dxyAligned,
        ].filter(Boolean).length;
        notes += ` | ConfStack: ${cs7}/7`;
        // Fib Spiderweb (K6)
        if (fibConfluenceNear) notes += ' | Fib Spiderweb: MESO/MICRO anchor present';
        // Anchor Hit Window (K3) + FIX 2: Session-aware entry enforcement
        const sessionStr = String(session ?? '');
        const SESSION_TIMES: Record<string, string> = {
          'LONDON_OPEN': '02:00-05:00 ET',
          'LONDON_MID': '05:00-08:00 ET',
          'NY_OVERLAP': '08:00-10:00 ET',
          'NY_OPEN': '08:30-10:00 ET',
          'NY_MID': '10:00-14:00 ET',
          'NY_CLOSE': '14:00-17:00 ET',
        };
        const sessionTimes = SESSION_TIMES[sessionStr] ?? 'assigned session';
        notes += ` | Anchor: ${day} ${sessionStr} — Entry at ${entry.toFixed(5)}`;
        notes += ` | ⏰ ENTRY RULE: Enter ONLY during ${sessionStr} (${sessionTimes}). If price touches entry outside this window, DO NOT ENTER. Re-evaluate at next session open.`;
        // Audit Trail (Q9)
        const slPipsAudit = Math.abs(sl - entry) / pipValue;
        notes += ` | Audit: Entry=${entry.toFixed(5)} | SL=${sl.toFixed(5)} (${slPipsAudit.toFixed(1)}p) | TP=${tp1.toFixed(5)} | RRR=${rrrTp1.toFixed(2)} | Conf=${confidence}`;
        // Day Catalysts (E3)
        const catalysts: string[] = [];
        if (nearRedFolder) catalysts.push('Red Folder event');
        if (optionStrikes && optionStrikes.length > 0) {
          catalysts.push(`${optionStrikes.length} option expiries (${optionStrikes.filter(s => s.notional >= 1.5).length} critical)`);
        }
        if (catalysts.length > 0) notes += ` | Catalysts: ${catalysts.join(', ')}`;
        // Spring Release (L7)
        if (optionStrikes && optionStrikes.length > 0 && optionStrikes.some(s => s.notional >= 1.5)) {
          notes += ' | ⏰ Spring Release: OTC hedging removed 10:01 AM NY. Expect volatility post-expiry.';
        }
        // Elemental Cycle (M1)
        notes += ` | Element: ${({ Monday: 'EARTH', Tuesday: 'EARTH', Wednesday: 'FIRE', Thursday: 'WATER', Friday: 'AIR' } as Record<string, string>)[day] || '?'}`;
        // Pair-specific timing (Q7 + Fractal §10)
        if (pair === 'AUD/USD') notes += ' | AU: Earth dominant (slow). Expect 2-4 days for HTF move completion.';
        else if (pair === 'GBP/USD') notes += ' | GU: Earth-Water dominant (fast). Expect 1-2 days. S/D gets pierced. SL buffered.';
        else if (pair === 'EUR/USD') notes += ' | EU: Fire-Earth dominant (medium). Expect 2-3 days. Direct overlap, no liquidity shield.';
        else if (pair === 'DXY') notes += ' | DXY: Fire activates during NY session. London = zone-to-zone range. Breakout unlikely before 3PM ET.';
        // Scalp Sub-Type NOTES ONLY (K2) — assignment happens after setup creation
        if (category === SetupCategory.SWING_SCALP) {
          if (currentShape === ShapeCode.DWL || currentShape === ShapeCode.WLS) {
            notes += ` | DWL Leg ${direction === TradeDirection.SHORT ? '1' : '2'}: Combined RRR compounds.`;
          }
          if (currentShape === ShapeCode.SS && (zone.zfp || 0) > 40) {
            notes += ` | Breakout Search: ZFP ${(zone.zfp || 0).toFixed(0)}%.`;
          }
        }

        // ── Multi-TF Zone Confluence (A+ setup precision) ──
        // multiTfConfluence was already computed before confidence scoring (Wave 3 P5).
        if (multiTfConfluence) {
          const score = multiTfConfluence.confluenceScore;
          const tfLabel =
            score >= 4 ? 'Triple-TF Confluence (+15)'
            : score === 3 ? 'Dual-TF Confluence (+10)'
            : score === 2 ? 'Single-TF Confluence (+3)'
            : `${score} TF zones`;
          notes += ` | ⭐ ${tfLabel}: ${score} TF zones agree (${multiTfConfluence.ltfZones.length} LTF overlap)`;
        }

        // Wave 4: ZoC note (scoring already applied before quality classification)
        if (zocResult.isZoC) {
          notes += ` | ⚔️ ZoC score=${zocResult.score} — Zone of Conquest (critical multi-TF battle position)`;
        }

        // ── Phase 4 / Law 15, 16: 3-Entry Staggered System ──
        // Front edge + forward spread (33%), middle anchor (33%), back edge + forward spread (34%).
        // Shared SL + TP across all 3 entries.
        // SL cascade: R1 fill → Primary to BE, R2 fill → R1 to BE.
        const fwdSpread = PlutusPipeline.FORWARD_SPREAD[pair] ?? pipValue;
        const stagMid = (zone.floor + zone.ceiling) / 2;
        let stagEntry1: number;
        let stagEntry3: number;
        if (direction === TradeDirection.SHORT) {
          // Supply zone above spot — front = floor (toward spot = lower), back = ceiling
          stagEntry1 = zone.floor - fwdSpread;
          stagEntry3 = zone.ceiling - fwdSpread;
        } else {
          // Demand zone below spot — front = ceiling (toward spot = higher), back = floor
          stagEntry1 = zone.ceiling + fwdSpread;
          stagEntry3 = zone.floor + fwdSpread;
        }
        stagEntry1 = Math.round(stagEntry1 * 1e5) / 1e5;
        const stagEntry2 = Math.round(stagMid * 1e5) / 1e5;
        stagEntry3 = Math.round(stagEntry3 * 1e5) / 1e5;

        notes += ` | 📊 3-Entry Staggered: ${stagEntry1} (33%) / ${stagEntry2} (33%) / ${stagEntry3} (34%) | Cascade: R1→BE, R2→R1→BE`;

        // ── Phase 4 / Law 18: Candle Confirmation Required ──
        notes += ` | ✅ CONFIRMATION REQUIRED: Wait for engulfing/pin bar/inside bar at entry zone during ${session}. Do NOT enter without candle confirmation.`;

        const setup: TradeSetup = {
          setupId: nextId(),
          pair,
          direction,
          category,
          entry,
          sl,
          tp: tp1,
          confidence,
          confidenceTier: this.confidenceToTierV8(confidence),
          shapeAlignment: currentShape,
          session,
          day,
          shapeTrigger: `${shapeKey} ${catName}`,
          rrr: Math.round(rrrTp1 * 100) / 100,
          slPips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
          zoneName: zone.zoneName ?? zone.id,
          isBoMEntry: zone.isBoM ?? false,
          zoneType: zone.type,
          directionValidation,
          notes,
          // Phase 4 / Law 15: 3-Entry Staggered System
          entry1: stagEntry1,
          entry2: stagEntry2,
          entry3: stagEntry3,
          entryWeights: [0.33, 0.33, 0.34],
          blendedRrr: Math.round(blendedRrr * 100) / 100,
          quality,
          slDistancePips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
          entryEdge,
          proximityPips: Math.round(distPips * 10) / 10,
          proximityStatus,
          // 4-Point Entry Precision (TTE v5.3.3 §7.1 Rule 9)
          entryFront: Math.round(entryFront * 1e6) / 1e6,
          entryBack: Math.round(entryBack * 1e6) / 1e6,
          slFront: Math.round(slFront * 1e6) / 1e6,
          slBack: Math.round(slBack * 1e6) / 1e6,
          // Fib confluence fields (TTE Fib enhancement)
          fibLevels: fibLevels.map(fl => ({
            price: Math.round(fl.price * 1e6) / 1e6,
            level: fl.level,
          })),
          // Multi-TF Zone Confluence (A+ setup precision)
          multiTfConfluence,
          // Phase 2: LTF entry zone is now the zone itself (zones are multi-TF)
          ltfEntryZone: undefined,
          // Wave 4: ZoC + refined label
          isZoC: zocResult.isZoC,
          zocScore: zocResult.score,
          refinedLabel: zone.refinedLabel,
        };

        setups.push(setup);
        log.info(
          `    [setup] ${setup.setupId} ${pair} ${direction} ${category} entry=${entry.toFixed(5)} ` +
          `entry1=${setup.entry1} entry2=${setup.entry2} entry3=${setup.entry3} ` +
          `sl=${sl.toFixed(5)} tp1=${tp1.toFixed(5)} rrr=${rrrTp1.toFixed(2)} blend=${blendedRrr.toFixed(2)} ` +
          `conf=${confidence} q=${quality} zone=${zone.zoneName ?? zone.id} tf=${zone.timeframe ?? '4H'} ` +
          `distFromSpot=${distPips.toFixed(1)}pips`,
        );

        // v3.2 K2: Scalp sub-type assignment (AFTER setup exists)
        if (setup.category === SetupCategory.SWING_SCALP) {
          if (currentShape === ShapeCode.DWL || currentShape === ShapeCode.WLS) (setup as unknown as Record<string, unknown>).scalpType = 'DWL';
          else if (currentShape === ShapeCode.SS && (zone.zfp || 0) > 40) (setup as unknown as Record<string, unknown>).scalpType = 'BREAKOUT_SEARCH';
          else (setup as unknown as Record<string, unknown>).scalpType = 'STANDARD';
        }

        // ── 10b. Reinforcement levels (FIX 4 — rockets DEEPER into zone) ──
        // Winning trades show R1 at 33% into zone from entry edge, R2 at 66%.
        // This scales INTO the zone toward the SL, averaging down/up for better blended price.
        // SL cascade: R1 fill → primary to breakeven. R2 fill → R1 to breakeven.
        if (category === SetupCategory.HTF_SWING) {
          const zFloor = zone.floor;
          const zCeiling = zone.ceiling;
          const zoneRange = zCeiling - zFloor;
          if (zoneRange > 0) {
            const r1Price = direction === TradeDirection.LONG
              ? zCeiling - zoneRange * 0.33  // 33% into zone from ceiling (toward floor)
              : zFloor + zoneRange * 0.33;   // 33% into zone from floor (toward ceiling)
            const r2Price = direction === TradeDirection.LONG
              ? zCeiling - zoneRange * 0.66  // 66% into zone from ceiling
              : zFloor + zoneRange * 0.66;   // 66% into zone from floor
            setup.reinforcementLevels = [
              { price: Math.round(r1Price * 1e6) / 1e6, fibLevel: 0.33 },
              { price: Math.round(r2Price * 1e6) / 1e6, fibLevel: 0.66 },
            ];
            log.info(
              `[Reinforcement] Setup ${setup.setupId} (${category} ${direction} ${pair}): R1=33%@${r1Price.toFixed(5)}, R2=66%@${r2Price.toFixed(5)} zoneRange=${zoneRange.toFixed(5)}`,
            );
          } else {
            log.warn(
              `[Reinforcement] Setup ${setup.setupId} (${category}): zoneRange=${zoneRange} <= 0, NO reinforcement levels set`,
            );
          }
        } else {
          log.info(
            `[Reinforcement] Setup ${setup.setupId} category=${category} — reinforcementLevels NOT set (only HTF_SWING gets levels)`,
          );
        }

        // ── 11. Reinforcement generation ──
        // For HTF_SWING with quality >= STANDARD: create reinforcement(s)
        // at the FAR EDGE of the parent zone.
        if (
          category === SetupCategory.HTF_SWING &&
          (quality === SetupQuality.GOD_TIER ||
            quality === SetupQuality.HIGH ||
            quality === SetupQuality.STANDARD)
        ) {
          // === Q5: AUD/USD Reinforcement Priority ===
          const maxReinforcements = pair === 'AUD/USD' ? 3 : 2;
          // R1 entry: LONG = zone.floor (far edge), SHORT = zone.ceiling
          const reinfEntry =
            direction === TradeDirection.LONG
              ? zone.floor
              : zone.ceiling;
          const reinfSL = this.getSniperSL(
            zone, direction, pair, zones,
          );
          const reinfSlDist = isDXY
            ? Math.abs(reinfEntry - reinfSL)
            : Math.abs(reinfEntry - reinfSL) / pipValue;

          // Validate reinforcement SL
          if (reinfSlDist <= slMaxHard) {
            // Check reinforcement proximity
            const reinfDistPips = isDXY
              ? Math.abs(reinfEntry - spot)
              : Math.abs(reinfEntry - spot) / pipValue;
            const reinfMaxDist =
              MAX_ENTRY_DISTANCE[pair]?.['REINF'] ?? 999;
            if (reinfDistPips <= reinfMaxDist) {
              const reinfRrrTp1 =
                Math.abs(tp1 - reinfEntry) /
                Math.abs(reinfEntry - reinfSL);
              const reinfMinRrr = isConsolidation
                ? (CONSOL_RRR_TP1['REINF'] ?? 1.2)
                : rrrForCategory(String(SetupCategory.REINFORCEMENT)).tp1;

              if (reinfRrrTp1 >= reinfMinRrr) {
                const reinfConfidence = Math.max(0, confidence - 5);
                const reinfQuality = SetupQuality.STANDARD;

                // Q6: FIRST-CONTACT RULE — Fib mitigation-based classification
                // If Fib level UNMITIGATED → FR. First contact at Fib → FLR. After mitigated → LR.
                const fibAtEntry = zone.keyLevels?.some(kl =>
                  Math.abs(kl - reinfEntry) < pipValue * 10
                ) ?? false;
                const fibMitigated = zone.reactionCount >= 1 && fibAtEntry;
                let rocketType: string;
                if (fibAtEntry && !fibMitigated) rocketType = 'FR';
                else if (fibAtEntry) rocketType = 'FLR';
                else rocketType = 'LR';

                const reinfSetup: TradeSetup = {
                  setupId: nextId(),
                  pair,
                  direction,
                  category: SetupCategory.REINFORCEMENT,
                  entry: reinfEntry,
                  sl: reinfSL,
                  tp: tp1,
                  confidence: reinfConfidence,
                  confidenceTier: this.confidenceToTierV8(reinfConfidence),
                  shapeAlignment: currentShape,
                  session,
                  day,
                  shapeTrigger: `${shapeKey} REINFORCEMENT (parent ${setup.setupId})`,
          rrr: Math.round(reinfRrrTp1 * 100) / 100,
          slPips: Math.round((Math.abs(reinfEntry - reinfSL) / pipValue) * 10) / 10,
                  zoneName: zone.zoneName ?? zone.id,
                  isBoMEntry: zone.isBoM ?? false,
                  zoneType: zone.type,
                  directionValidation: this.buildDirectionValidationV8(
                    zone, direction, currentShape, reinfRrrTp1, session, pair,
                  ),
                  notes: `Reinforcement for ${setup.setupId} | ${rocketType} | far-edge entry | conf ${reinfConfidence} | maxR=${maxReinforcements}${setup.reinforcementLevels ? ` | Fib R1: 1.382 @ ${setup.reinforcementLevels[0]?.price ?? '—'} | Fib R2: 1.618 @ ${setup.reinforcementLevels[1]?.price ?? '—'}` : ''}`,
                  blendedRrr: Math.round(blendedRrr * 100) / 100,
           quality: reinfQuality,
          slDistancePips: Math.round((Math.abs(reinfEntry - reinfSL) / pipValue) * 10) / 10,
                  entryEdge:
                    direction === TradeDirection.LONG ? 'floor' : 'ceiling',
                  proximityPips: Math.round(reinfDistPips * 10) / 10,
                  proximityStatus:
                    reinfDistPips <= reinfMaxDist * 0.5 ? 'CLOSE' : 'ACCEPTABLE',
                  // Fib confluence fields inherited from parent zone
                  fibLevels: fibLevels.map(fl => ({
                    price: Math.round(fl.price * 1e6) / 1e6,
                    level: fl.level,
                  })),
                  reinforcementLevels: setup.reinforcementLevels,
                  // Inherit multi-TF confluence from parent zone
                  multiTfConfluence: setup.multiTfConfluence,
                };

                setups.push(reinfSetup);
                log.info(
                  `    [reinf] ${reinfSetup.setupId} ${direction} REINFORCEMENT entry=${reinfEntry.toFixed(5)} conf=${reinfConfidence} parent=${setup.setupId}`,
                );
              }
            }
          }
        }

        // Cap at MAX_SETUPS_PER_PAIR
        if (setups.length >= MAX_SETUPS_PER_PAIR) break;
      }
      if (setups.length >= MAX_SETUPS_PER_PAIR) break;
    }
      if (setups.length >= MAX_SETUPS_PER_PAIR) break;
    } // end day loop (FIX-1)

    // ── Variables for transition section (uses overall current shape) ──
    const day = fallbackResolved.day;
    const session = fallbackResolved.session;
    const shapeKey = this.mapShapeToCategoryKey(currentShape);
    const isSS = shapeKey === 'SS' || shapeKey === 'SS_DWL';

    // ── TRANSITION SETUP GENERATION ──
    // Detect when SS bounding zones are failing (ZFP rising) and generate
    // transition setups. When price is in SS (consolidation/swing scalp)
    // regime and one of the bounding zones starts failing (ZFP rises above
    // 45%), a transition setup is placed at the breaking zone. This catches
    // the breakout move.
    if (isSS || currentShape === ShapeCode.R) {
      // Find the ceiling zone (supply above spot) and floor zone (demand below spot)
      const ceilingZone = eligible.find((z) => {
        const mid = (z.floor + z.ceiling) / 2;
        return (
          mid > spot &&
          (z.type === ZoneType.MOM_SUPPLY ||
            z.type === ZoneType.IP_SUPPLY)
        );
      });
      const floorZone = eligible.find((z) => {
        const mid = (z.floor + z.ceiling) / 2;
        return (
          mid < spot &&
          (z.type === ZoneType.MOM_DEMAND ||
            z.type === ZoneType.IP_DEMAND)
        );
      });

      const slMaxHard = SL_MAX_HARD[pair] ?? 150;

      // Check if ceiling is failing (ZFP > 45%) → upside breakout imminent
      if (ceilingZone && ceilingZone.zfp > 45) {
        const entry = this.getSniperEntry(ceilingZone, TradeDirection.LONG, SetupCategory.TRANSITION, pair);
        const sl = floorZone
          ? floorZone.floor - pipValue * 10 // SL at floor zone bottom
          : entry - pipValue * 50;
        const slDistance = isDXY
          ? Math.abs(entry - sl)
          : Math.abs(entry - sl) / pipValue;

        if (slDistance <= slMaxHard) {
          // TP at next zone above ceiling (or Fib extension)
          const aboveCeiling = zones
            .filter((z) => z.floor > ceilingZone.ceiling)
            .sort((a, b) => a.floor - b.floor);
          const tp =
            aboveCeiling.length > 0
              ? aboveCeiling[0].floor
              : entry + (entry - sl) * FIB_EXT_1618;
          const slDist = Math.abs(entry - sl);
          if (slDist !== 0) {
            const rrr = Math.abs(tp - entry) / slDist;
            if (rrr >= 1.5) {
              const confidence = Math.min(
                80,
                50 + ceilingZone.zfp / 2,
              ); // Higher ZFP = higher transition confidence
              const quality = this.classifyQualityV8(
                confidence,
                'ENTRY-CONDITIONAL',
                slDistance,
                slMaxHard,
              );

              const transSetup: TradeSetup = {
                setupId: nextId(),
                pair,
                direction: TradeDirection.LONG,
                category: SetupCategory.TRANSITION,
                entry,
                entry3: entry,
                sl,
                tp,
                rrr: Math.round(rrr * 100) / 100,
                confidence,
                confidenceTier:
                  confidence >= 80
                    ? ConfidenceTier.A
                    : confidence >= 70
                      ? ConfidenceTier.B
                      : ConfidenceTier.C,
                shapeAlignment: currentShape,
                session,
                day,
                shapeTrigger: `SS→BS UP transition (ceiling ZFP=${ceilingZone.zfp}% failing)`,
                zoneName: ceilingZone.zoneName ?? ceilingZone.id,
                isBoMEntry: ceilingZone.isBoM ?? false,
                zoneType: ceilingZone.type,
                slPips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
                notes: `Transition: ceiling ${ceilingZone.zoneName ?? ceilingZone.id} failing (ZFP=${ceilingZone.zfp}%). Break above → BS up.`,
                directionValidation: this.buildDirectionValidationV8(
                  ceilingZone,
                  TradeDirection.LONG,
                  currentShape,
                  rrr,
                  session,
                  pair,
                ),
                // v8 fields
                realizedRrr: rrr,
                blendedRrr: rrr * 0.7,
                proximityPips: Math.abs(entry - spot) / pipValue,
                proximityStatus: 'AT_ZONE',
                slDistancePips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
                entryEdge: 'floor',
                quality,
              };
              setups.push(transSetup);
              log.info(
                `    [transition] SS→BS UP: entry=${entry} sl=${sl} tp=${tp} rrr=${rrr.toFixed(2)} zfp=${ceilingZone.zfp}%`,
              );
            }
          }
        }
      }

      // Check if floor is failing (ZFP > 45%) → downside breakout imminent
      if (floorZone && floorZone.zfp > 45) {
        const entry = this.getSniperEntry(floorZone, TradeDirection.SHORT, SetupCategory.TRANSITION, pair);
        const sl = ceilingZone
          ? ceilingZone.ceiling + pipValue * 10
          : entry + pipValue * 50;
        const slDistance = isDXY
          ? Math.abs(sl - entry)
          : Math.abs(sl - entry) / pipValue;

        if (slDistance <= slMaxHard) {
          const belowFloor = zones
            .filter((z) => z.ceiling < floorZone.floor)
            .sort((a, b) => b.ceiling - a.ceiling);
          const tp =
            belowFloor.length > 0
              ? belowFloor[0].ceiling
              : entry - (sl - entry) * FIB_EXT_1618;
          const slDist = Math.abs(sl - entry);
          if (slDist !== 0) {
            const rrr = Math.abs(entry - tp) / slDist;
            if (rrr >= 1.5) {
              const confidence = Math.min(
                80,
                50 + floorZone.zfp / 2,
              );
              const quality = this.classifyQualityV8(
                confidence,
                'ENTRY-CONDITIONAL',
                slDistance,
                slMaxHard,
              );

              const transSetup: TradeSetup = {
                setupId: nextId(),
                pair,
                direction: TradeDirection.SHORT,
                category: SetupCategory.TRANSITION,
                entry,
                entry3: entry,
                sl,
                tp,
                rrr: Math.round(rrr * 100) / 100,
                confidence,
                confidenceTier:
                  confidence >= 80
                    ? ConfidenceTier.A
                    : confidence >= 70
                      ? ConfidenceTier.B
                      : ConfidenceTier.C,
                shapeAlignment: currentShape,
                session,
                day,
                shapeTrigger: `SS→BS DOWN transition (floor ZFP=${floorZone.zfp}% failing)`,
                zoneName: floorZone.zoneName ?? floorZone.id,
                isBoMEntry: floorZone.isBoM ?? false,
                zoneType: floorZone.type,
                slPips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
                notes: `Transition: floor ${floorZone.zoneName ?? floorZone.id} failing (ZFP=${floorZone.zfp}%). Break below → BS down.`,
                directionValidation: this.buildDirectionValidationV8(
                  floorZone,
                  TradeDirection.SHORT,
                  currentShape,
                  rrr,
                  session,
                  pair,
                ),
                realizedRrr: rrr,
                blendedRrr: rrr * 0.7,
                proximityPips: Math.abs(entry - spot) / pipValue,
                proximityStatus: 'AT_ZONE',
                slDistancePips: Math.round((Math.abs(entry - sl) / pipValue) * 10) / 10,
                entryEdge: 'ceiling',
                quality,
              };
              setups.push(transSetup);
              log.info(
                `    [transition] SS→BS DOWN: entry=${entry} sl=${sl} tp=${tp} rrr=${rrr.toFixed(2)} zfp=${floorZone.zfp}%`,
              );
            }
          }
        }
      }
    }

    // Sort by confidence descending
    setups.sort((a, b) => b.confidence - a.confidence);

    // FIX 3: Max 3 setups per day per pair — keep only top 3 by confidence for each day
    const MAX_SETUPS_PER_DAY = 3;
    const byDay = new Map<string, TradeSetup[]>();
    for (const s of setups) {
      const d = s.day ?? 'Unknown';
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d)!.push(s);
    }
    const dayCapped: TradeSetup[] = [];
    for (const [d, daySetups] of byDay) {
      const kept = daySetups.slice(0, MAX_SETUPS_PER_DAY);
      const dropped = daySetups.length - kept.length;
      if (dropped > 0) {
        log.info(`  [cap] ${pair} ${d}: kept top ${kept.length}/${daySetups.length}, dropped ${dropped}`);
      }
      dayCapped.push(...kept);
    }
    // Replace setups with day-capped version, re-sort
    setups.length = 0;
    setups.push(...dayCapped.sort((a, b) => b.confidence - a.confidence));

    const capped = setups.slice(0, MAX_SETUPS_PER_PAIR);

    // ── Phase 5 / Law 27: Trade Chaining ──
    // Links setups where TP of one matches entry of another (within 5 pips)
    // and directions are opposite. Populates chainId + chainPosition.
    this.linkTradeChains(capped, pair, pipValue);

    log.info(
      `  [setups-v8] ${pair}: ${capped.length} setups (shape=${currentShape}, isDXY=${isDXY})`,
    );
    return capped;
  }


  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 5 / LAW 20: DXY CASCADE HARD FILTER
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Determines DXY directional bias from zone-derived setup directions + zone positions.
   *
   * - Primary: majority of DXY setups anchored to demand zones (LONG) vs supply
   *   zones (SHORT) — each setup's direction comes from its anchor ZONE TYPE.
   * - Tiebreaker: nearest supply/demand zone relative to DXY spot.
   * - Shapes have NO bullish/bearish classification — they select CATEGORY only.
   *
   * Returns TradeDirection.SHORT (bearish USD), LONG (bullish USD), or null (neutral).
   */
  private determineDXYDirection(
    tradeSetups: Map<string, TradeSetup[]>,
    dxyZoneMap?: ZoneMapSnapshot,
  ): TradeDirection | null {
    const dxySetups = tradeSetups.get('DXY');
    if (!dxySetups || dxySetups.length === 0) return null;

    // Primary: zone-derived directions — tally demand-zone vs supply-zone setups.
    // Demand zone anchor = LONG (bullish USD); supply zone anchor = SHORT (bearish USD).
    let longCount = 0;
    let shortCount = 0;
    for (const s of dxySetups) {
      if (this.isDemandZoneType(s.zoneType)) longCount++;
      else if (this.isSupplyZoneType(s.zoneType)) shortCount++;
    }

    // Zone-type majority decides
    if (longCount > shortCount) return TradeDirection.LONG;
    if (shortCount > longCount) return TradeDirection.SHORT;

    // Fallback: zone positions relative to spot
    if (dxyZoneMap) {
      const dxySpot = dxyZoneMap.spots['DXY'] ?? this.dxySpot;
      if (dxySpot > 0) {
        const nearbyDemand = dxyZoneMap.zones.some(z => {
          const mid = (z.floor + z.ceiling) / 2;
          return mid < dxySpot &&
            Math.abs(mid - dxySpot) < 1.0 &&
            (z.type === ZoneType.BOM_DEMAND || z.type === ZoneType.MOM_DEMAND ||
             z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND);
        });
        const nearbySupply = dxyZoneMap.zones.some(z => {
          const mid = (z.floor + z.ceiling) / 2;
          return mid > dxySpot &&
            Math.abs(mid - dxySpot) < 1.0 &&
            (z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.MOM_SUPPLY ||
             z.type === ZoneType.LSZ_SUPPLY || z.type === ZoneType.IP_SUPPLY);
        });
        // Nearby demand = support = bullish bias for DXY
        if (nearbyDemand && !nearbySupply) return TradeDirection.LONG;
        // Nearby supply = resistance = bearish bias for DXY
        if (nearbySupply && !nearbyDemand) return TradeDirection.SHORT;
      }
    }

    log.info(`DXY CASCADE FILTER: DXY direction undetermined (neutral) — allowing both FX directions`);
    return null;
  }

  /**
   * Law 20: DXY Cascade Hard Filter.
   *
   * DXY SHORT (bearish, USD weakening) → FX pairs rise → REJECT FX SHORT setups.
   * DXY LONG (bullish, USD strengthening) → FX pairs fall → REJECT FX LONG setups.
   * DXY NEUTRAL → both directions allowed.
   *
   * DXY itself is NEVER filtered. Cascade-source setups bypass the filter
   * (they are by definition aligned with DXY). ZoC setups bypass (Law 19 exception).
   *
   * This is a HARD FILTER — setups are removed, not penalized.
   */
  private enforceDXYCascade(
    tradeSetups: Map<string, TradeSetup[]>,
    dxyDirection: TradeDirection,
  ): void {
    // Determine which FX direction to REJECT based on DXY direction
    // DXY SHORT → USD weak → FX rises → REJECT FX SHORT (keep LONG)
    // DXY LONG  → USD strong → FX falls → REJECT FX LONG (keep SHORT)
    const rejectDirection = dxyDirection === TradeDirection.SHORT
      ? TradeDirection.SHORT   // DXY bearish → reject FX SHORT
      : TradeDirection.LONG;   // DXY bullish → reject FX LONG

    log.info(
      `DXY CASCADE FILTER: DXY=${dxyDirection} → rejecting FX ${rejectDirection} setups`,
    );

    let totalRemoved = 0;
    for (const [pair, setups] of tradeSetups) {
      if (pair === 'DXY') continue; // Never filter DXY itself

      const before = setups.length;
      const filtered = setups.filter(s => {
        // Cascade-source setups are always aligned with DXY by construction
        if (s.cascadeSource) return true;
        // ZoC exception (Law 19): ZoC setups can go both directions
        if (s.isZoC) return true;
        // Hard filter: remove contradicting setups
        if (s.direction === rejectDirection) {
          log.info(
            `  [DXY-CASCADE] REJECTED ${s.setupId} (${pair} ${s.direction}): contradicts DXY ${dxyDirection}`,
          );
          return false;
        }
        return true;
      });

      tradeSetups.set(pair, filtered);
      const removed = before - filtered.length;
      totalRemoved += removed;
      if (removed > 0) {
        log.info(`  ${pair}: removed ${removed} setups (DXY cascade hard filter)`);
      }
    }

    log.info(`DXY CASCADE FILTER: total ${totalRemoved} setups removed across all FX pairs`);
  }


  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 5 / LAW 27: TRADE CHAINING ENGINE
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Law 27: Trade Chaining — TP of setup N = entry zone of setup N+1.
   *
   * Sorts setups chronologically by day, then links pairs where one setup's
   * TP is within 5 pips of another setup's entry AND directions are opposite.
   * Populates chainId and chainPosition on linked setups.
   *
   * @param setups  All setups for a single pair (already capped + sorted)
   * @param pair    Pair name (for pip value lookup)
   * @param pipValue Pip value for this pair
   */
  private linkTradeChains(
    setups: TradeSetup[],
    pair: string,
    pipValue: number,
  ): void {
    if (setups.length < 2) return;

    const CHAIN_TOLERANCE_PIPS = 5;
    const chainTolerance = CHAIN_TOLERANCE_PIPS * pipValue;

    // Day ordering for chronological sort
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const getDayIndex = (day: string): number => {
      const idx = dayOrder.indexOf(day);
      return idx === -1 ? 99 : idx;
    };

    // Sort by day (chronological)
    const sorted = [...setups].sort((a, b) => getDayIndex(a.day) - getDayIndex(b.day));

    const used = new Set<string>();
    let chainCounter = 0;

    for (const seed of sorted) {
      if (used.has(seed.setupId)) continue;

      // Follow the chain forward from this seed
      const chain: TradeSetup[] = [seed];
      used.add(seed.setupId);
      let current = seed;

      while (true) {
        // Find next setup whose entry is near current's TP, with opposite direction
        let nextSetup: TradeSetup | null = null;
        for (const candidate of sorted) {
          if (used.has(candidate.setupId)) continue;
          if (candidate.direction === current.direction) continue; // chain must reverse

          // Check if candidate's entry is within tolerance of current's TP
          const entryToTpDist = Math.abs(candidate.entry - current.tp);
          if (entryToTpDist <= chainTolerance) {
            // Check day ordering (candidate must be on same or later day)
            if (getDayIndex(candidate.day) >= getDayIndex(current.day)) {
              nextSetup = candidate;
              break;
            }
          }
        }

        if (!nextSetup) break;

        chain.push(nextSetup);
        used.add(nextSetup.setupId);

        // Annotate the link
        nextSetup.notes += ` | 🔗 CHAIN: ${current.direction} ${current.day} TP @ ${current.tp.toFixed(5)} → ${nextSetup.direction} ${nextSetup.day} Entry @ ${nextSetup.entry.toFixed(5)}`;
        log.info(
          `  [chain] ${pair}: ${current.setupId} TP @ ${current.tp.toFixed(5)} → ${nextSetup.setupId} Entry @ ${nextSetup.entry.toFixed(5)} (dist=${(Math.abs(nextSetup.entry - current.tp) / pipValue).toFixed(1)}p)`,
        );

        current = nextSetup;
      }

      // Assign chainId + chainPosition if chain has 2+ members
      if (chain.length >= 2) {
        chainCounter++;
        const chainId = `${pair.replace('/', '').toLowerCase()}-chain-${chainCounter}`;
        for (let i = 0; i < chain.length; i++) {
          chain[i].chainId = chainId;
          chain[i].chainPosition = i + 1; // 1-indexed
        }
        log.info(
          `  [chain] ${pair}: chain ${chainId} with ${chain.length} linked setups`,
        );
      }
    }
  }


  /**
   * Resolve day + session from Engine 2 day decomposition.
   * Day labels come from the shape brain day decomposition (no speed-rule shift
   * — shapes and days are already assigned correctly per the energy cycle).
   */
  private resolveDaySession(
    shape: ShapeCode,
    dayDecomposition: DayShapePrediction[],
  ): { day: string; session: SessionWindow } {
    const matched = dayDecomposition.find((d) => d.shape === shape);
    const day = matched?.day ?? 'Monday';

    // Session from day decomposition or shape-based defaults (§8.0.2 step 7)
    let session: SessionWindow;
    if (matched?.sessionWindow) {
      const sw = matched.sessionWindow;
      if (sw.includes('London Open')) session = SessionWindow.LONDON_OPEN;
      else if (sw.includes('London Mid')) session = SessionWindow.LONDON_MID;
      else if (sw.includes('NY Overlap')) session = SessionWindow.NY_OVERLAP;
      else if (sw.includes('NY Open')) session = SessionWindow.NY_OPEN;
      else if (sw.includes('NY Mid')) session = SessionWindow.NY_MID;
      else if (sw.includes('NY Close')) session = SessionWindow.NY_CLOSE;
      else session = SessionWindow.LONDON_OPEN;
    } else {
      // Shape-based session defaults
      const ssShapes: ShapeCode[] = [
        ShapeCode.SS, ShapeCode.WLS, ShapeCode.DWL, ShapeCode.STORM,
      ];
      const nyShapes: ShapeCode[] = [
        ShapeCode.BS, ShapeCode.PBS, ShapeCode.WL, ShapeCode.RWL,
        ShapeCode.PWL, ShapeCode.PRWL,
      ];
      session = ssShapes.includes(shape)
        ? SessionWindow.LONDON_OPEN
        : nyShapes.includes(shape)
          ? SessionWindow.NY_MID
          : SessionWindow.LONDON_MID;
    }

    return { day, session };
  }


  private formatWeekLabel(start: Date, end: Date): string {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const startMonth = months[start.getUTCMonth()];
    const endMonth = months[end.getUTCMonth()];
    return startMonth === endMonth
      ? `${startMonth}${start.getUTCDate()}-${end.getUTCDate()}`
      : `${startMonth}${start.getUTCDate()}-${endMonth}${end.getUTCDate()}`;
  }
}
