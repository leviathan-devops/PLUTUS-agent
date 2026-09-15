/**
 * 9-Pillar Lobe — Full P1-P9 zone computation engine.
 *
 * E1-5 FIX: Now spec-compliant.
 *   P1: Classic/Fibonacci/Camarilla pivots — daily AND weekly
 *   P2: 12 MAs (EMA+SMA × 9,10,20,50,100,200) weighted + cluster detection
 *   P3: Options Open Interest / Gamma levels — REAL OTC walls only (ZR-7A:
 *       the Gamma-histogram proxy DELETED — the honest zero when absent)
 *   P4: Analyst consensus / COT data — REAL commentary only (ZR-7A: the
 *       HP-trend proxy DELETED — the honest zero when absent)
 *   P5: Prior swing highs/lows (structural levels)
 *   P6: Round numbers (big figure psychology)
 *   P7: Derivatives arena boundary — REAL ICE/CME OI only (ZR-7A: the
 *       zone-clustering arena DELETED — contributes nothing when absent)
 *   P8: Strike→DXY conversion via ICE geometric mean formula
 *   P9: Regime dynamics (DXY regime filter) — the RegimeMA level gated on
 *       the real regime data (ZR-7A: the honest zero when absent)
 *
 * Confluence: 6-dimension scoring (Tech/Options/Analyst/Structural/Psych/Regime)
 * Max: 12 base + 2 structural extreme bonus = 14 total.
 */

import { OHLCBar, PriceLevel } from '../types.js';
import type { OptionsExpiryData, OptionStrike } from '../clients/investinglive-client.js';
import type { WebSearchCommentary } from '../clients/web-search-client.js';
import { Logger } from '../utils/logger.js';
import { detectRepeatedExtremes, magnetsToPriceLevels, maxMagnetBonus } from './extreme-magnet-lobe.js';
import {
  // Pip values
  PIP_VALUE_DXY,
  PIP_VALUE_FX_4DEC,
  // Pillar / proximity
  PROXIMITY_HIGH_PIPS,
  PROXIMITY_MED_PIPS,
  DOMINANT_PILLAR_THRESHOLD,
  PILLAR_SCORE_MAX,
  // Bar counts
  ENGINE_MIN_BARS,
  PREV_DAY_OFFSET,
  BARS_PER_DAY_4H,
  // Fibonacci
  FIB_RATIO_382,
  FIB_RATIO_618,
  FIB_RATIO_1000,
  // Camarilla
  CAMARILLA_MULTIPLIER,
  CAMARILLA_DIV_R1_S1,
  CAMARILLA_DIV_R2_S2,
  CAMARILLA_DIV_R3_S3,
  // Confidence values
  PP_BASE_CONFIDENCE,
  R1_S1_BASE_CONFIDENCE,
  R2_S2_BASE_CONFIDENCE,
  R3_S3_BASE_CONFIDENCE,
  DEFAULT_CONFIDENCE,
  EMA20_CONFIDENCE,
  EMA50_CONFIDENCE,
  EMA200_CONFIDENCE,
  TV_CONFIRMATION_BOOST,
  RECAPTURE_CONFIDENCE,
  OPTION_CRITICAL_CONFIDENCE,
  OPTION_SIGNIFICANT_CONFIDENCE,
  GAMMA_PROXY_BASE_CONFIDENCE,
  GAMMA_PROXY_STEP,
  WEB_LEVEL_CONFIDENCE,
  ANALYST_HWC_CONFIDENCE,
  ANALYST_LWC_CONFIDENCE,
  P5_EXTREME_CONFIDENCE,
  ROUND_NUMBER_PRIMARY_CONF,
  ROUND_NUMBER_NEIGHBOR_CONF,
  VWAP_CONFIDENCE,
  VWAP_SIGMA_CONFIDENCE,
  REGIME_MA_CONFIDENCE,
  P8_PROXY_CONFIDENCE,
  P8_SECONDARY_CONFIDENCE,
  HP_TREND_STRONG_CONFIDENCE,
  // Distance / proximity
  PROXIMITY_CLOSE_PCT,
  PROXIMITY_MODERATE_PCT,
  EMA_PROXIMITY_PCT,
  P3_CLUSTER_PROXIMITY_PCT,
  TV_CROSS_VALIDATION_TOLERANCE,
  TREND_SLOPE_LOOKBACK_FACTOR,
  CYCLE_EXTREME_ZSCORE,
  CYCLE_REVERSION_FACTOR,
  CURRENT_RANGE_BUFFER_PCT,
  P5_EXTREME_PROXIMITY_PCT,
  P5_MODERATE_PROXIMITY_PCT,
  ROUND_NUMBER_CLOSE_PCT,
  ROUND_NUMBER_MODERATE_PCT,
  VWAP_CLOSE_PCT,
  VWAP_MODERATE_PCT,
  MAXPAIN_CLOSE_PCT,
  MAXPAIN_CLOSE_NOTIONAL_PCT,
  MAXPAIN_MODERATE_PCT,
  STRONG_NOTIONAL_STRENGTH,
  WEAK_NOTIONAL_STRENGTH,
  P8_PROXY_CLOSE_PCT,
  P8_PROXY_MODERATE_PCT,
  P8_DENSITY_STRONG,
  P8_DENSITY_MODERATE,
  // EMA / SMA periods
  EMA_SHORT_PERIOD,
  EMA_MID_PERIOD,
  EMA_LONG_PERIOD,
  REGIME_SMA_PERIOD,
  // Pillar-specific bar counts
  P1_RECENT_DAYS,
  P1_TREND_BONUS_PIPS,
  PIVOT_LEVELS_PER_SET,
  LEGACY_CONFIDENCE_BONUS,
  LEGACY_LEVEL_TOLERANCE_PIPS,
  HIST_PIVOT_MIN_DAILY,
  HISTORICAL_PIVOT_START_IDX,
  HISTORICAL_PIVOT_END_IDX,
  RECAPTURE_MIN_DAILY,
  RECAPTURE_LOOKBACK_SESSIONS,
  RECAPTURE_BONUS,
  P3_PROXY_LOOKBACK,
  P3_HISTOGRAM_BUCKETS,
  P3_TOP_BUCKETS,
  P5_MAX_LOOKBACK,
  P5_MIN_LOOKBACK,
  P5_FALLBACK_MIN_BARS,
  P5_FALLBACK_SLICE,
  EXTREME_BONUS_LONG_BARS,
  EXTREME_BONUS_MED_BARS,
  NORMAL_STRENGTH_BARS,
  STRENGTH_LONG,
  STRENGTH_MED,
  EXTREME_STRENGTH_MIN,
  P7_MIN_BARS,
  P8_PROXY_LOOKBACK,
  P8_PROXY_HISTOGRAM_BUCKETS,
  P9_SHORT_TREND_LOOKBACK,
  P9_MIN_TREND_BARS,
  MAX_WEB_LEVELS,
  SWING_BOUNDARY_OFFSET,
  SWING_CONFIRMATION_BARS,
  SWING_RESULTS_LIMIT,
  // HP filter
  HP_LAMBDA_4H,
  HP_LAMBDA_DAILY,
  HP_DAILY_BAR_THRESHOLD,
  HP_MAX_ITERATIONS,
  HP_CONVERGENCE_THRESHOLD,
  HP_MIN_DATA_POINTS,
  // Max-pain / options
  MAXPAIN_MAX_CONFIDENCE,
  MAXPAIN_BASE_CONFIDENCE,
  MAXPAIN_NOTIONAL_CAP,
  MAXPAIN_NOTIONAL_SCALE,
  NOTIONAL_NORMALIZATION_B,
  SECONDARY_BUCKET_DENSITY,
  OPTION_CRITICAL_NOTIONAL_B,
  OPTION_SIGNIFICANT_NOTIONAL_B,
  // Round numbers
  DXY_ROUND_STEP,
  FX_ROUND_STEP,
  ROUND_NUMBER_RANGE,
  // DXY formula
  DXY_BASE,
  DXY_WEIGHT_EUR_USD,
  DXY_WEIGHT_USD_JPY,
  DXY_WEIGHT_GBP_USD,
  DXY_WEIGHT_USD_CAD,
  DXY_WEIGHT_USD_SEK,
  DXY_WEIGHT_USD_CHF,
  // Pivot tolerance
  PIVOT_EPSILON,
  // Histogram
  HISTOGRAM_MIDPRICE_OFFSET,
} from '../constants/trading-constants.js';

const log = new Logger('NinePillarLobe');

// ═══════════════════════════════════════════════════════════════════════════════
// ZR-7A: THE HONEST-DATA PROVENANCE TAG (the firewall integration — spec 6.1)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ZR-7A: the honest-data provenance tag every PriceLevel carries.
 *   - pillar: 'P1'..'P9'
 *   - source: 'P1_REAL'..'P9_REAL' | 'P1_NO_DATA'..'P9_NO_DATA'
 *   - evidence: the level's own source string (fully traceable)
 *
 * The anti-fabrication firewall (report-v452.ts's buildIpZones) SKIPS any
 * level whose provenance.source is a NO_DATA tag — the zone map contains
 * ZERO fabricated levels. The honest pillars return `levels: []` when their
 * real data is absent, so a NO_DATA-provenance level never exists in
 * practice — the filter is the defense-in-depth layer (spec 1.3 + 6.1).
 */
export interface PriceLevelProvenance {
  pillar: string;
  source: string;   // 'REAL' | 'P1_NO_DATA'..'P9_NO_DATA'
  evidence: string;
}

/**
 * ZR-7A: module augmentation — the PriceLevel (src/types.ts) gains the
 * OPTIONAL provenance field (additive contract — every existing consumer
 * compiles unchanged; risk register #6). The type definition stays in
 * src/types.ts; only the optional metadata is declared here.
 */
declare module '../types.js' {
  interface PriceLevel {
    /** ZR-7A: the honest-data provenance tag (the anti-fabrication firewall's input). */
    provenance?: PriceLevelProvenance;
  }
}

/** ZR-7A: the 6D dimension name per pillar (the honest-absence log lines). */
const HONEST_DIMENSION: Record<string, string> = {
  P3: 'Options-Derived',
  P4: 'Analyst',
  P7: 'Derivatives',
  P9: 'Regime',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PillarInput {
  instrument: string;
  bars: OHLCBar[];
  currentPrice: number;
  dxyRegime?: 'risk_on' | 'risk_off' | 'transition' | 'chop';
  // External MA data (P2 cross-validation)
  barchartData?: {
    ema9: number; ema20: number; ema50: number; ema100: number; ema200: number;
    sma9: number; sma20: number; sma50: number; sma100: number; sma200: number;
  };
  tradingviewTechnicals?: {
    ema: Record<string, number>;
    sma: Record<string, number>;
  };
  // External analyst consensus (P4 override)
  analystConsensus?: {
    hwc: number | null;
    lwc: number | null;
    bias: 'bullish' | 'bearish' | 'neutral';
    sources: string[];
  };
  // External OTC FX options data (P3 + P8 override)
  optionsData?: OptionsExpiryData;
  // FIX-011: DXY component spot rates for option strike → DXY conversion
  componentSpots?: Record<string, number>;
  // FIX-019: Web search institutional commentary (P4 — highest priority override)
  webSearchCommentary?: WebSearchCommentary;
  // E1-5 FIX P7: ICE/CME derivatives Open Interest data for arena boundary detection.
  // If provided, P7 uses these OI concentrations as price magnets.
  // ZR-7A: if absent, P7 contributes NOTHING (the P7_NO_DATA honest zero —
  // Bible 4.0 §4.9: blocked sources "contribute nothing... degrade gracefully";
  // the zone-clustering arena is DELETED).
  derivativesData?: DerivativesArenaLevel[];
}

/**
 * E1-5 FIX P7: Derivatives Arena Level from ICE/CME futures and options.
 * These are institutional positioning data that reveal where large players
 * have built positions. OI concentrations act as price magnets.
 */
export interface DerivativesArenaLevel {
  source: 'ICE_FUTURES' | 'CME_FUTURES' | 'CME_OPTIONS';
  instrument: string;
  openInterest: number;          // contracts
  notionalUSD: number;           // total notional in USD
  priceLevel: number;            // the strike/expiry price level
  netPositioning: 'LONG' | 'SHORT' | 'NEUTRAL';
}

/**
 * E1-5 FIX: 6-dimension confluence scoring.
 * Each dimension is 0-2 points, max 12 base + 2 structural extreme bonus = 14 total.
 */
export interface ConfluenceDimensions {
  technical: number;      // P1 + P2: 0-2 points
  options: number;        // P3 + P8: 0-2 points
  analyst: number;        // P4: 0-2 points
  structural: number;     // P5: 0-2 points
  psychological: number;  // P6: 0-2 points
  regime: number;         // P7 + P9: 0-2 points
  structuralExtreme: number; // P5 extreme bonus: 0-2 bonus points
}

export interface PillarResult {
  levels: PriceLevel[];
  scores: Record<string, number>;  // pillar name → 0-2
  /** E1-5 FIX: 6-dimension confluence score (max 14) */
  compositeScore: number;          // 0-14
  /** E1-5 FIX: Per-dimension breakdown of the confluence score */
  confluenceDimensions: ConfluenceDimensions;
  dominantPillars: string[];       // pillars with score ≥ 1.5
  /**
   * FIX-018: Calculation audit trail for each pillar.
   * Records the formula, inputs, and computation string for every computed level.
   */
  pillarAudits: Record<string, PillarAudit>;
}

/**
 * FIX-018: Audit trail for a single pillar computation.
 * Every computed level must include this metadata showing how the value was derived.
 */
export interface PillarAudit {
  pillar: string;
  formula: string;
  inputs: Record<string, number | string>;
  computation: string;
  levels: PillarLevelWithAudit[];
}

/** FIX-018: A price level with its full audit trail. */
export interface PillarLevelWithAudit {
  level: number;
  score: number;
  auditTrail: {
    formula: string;
    inputs: Record<string, number | string>;
    computation: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PILLAR_NAMES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run the full 9-pillar engine.
 * Returns price levels, per-pillar scores (0-2), composite (0-18), and dominant pillars.
 */
export function pillarEngine(input: PillarInput): PillarResult {
  const { instrument, bars, currentPrice, dxyRegime } = input;

  if (bars.length < ENGINE_MIN_BARS) {
    const emptyScores: Record<string, number> = {};
    for (const name of PILLAR_NAMES) emptyScores[name] = 0;
    return {
      levels: [],
      scores: emptyScores,
      compositeScore: 0,
      confluenceDimensions: {
        technical: 0, options: 0, analyst: 0,
        structural: 0, psychological: 0, regime: 0,
        structuralExtreme: 0,
      },
      dominantPillars: [],
      pillarAudits: {},
    };
  }

  const levels: PriceLevel[] = [];
  const scores: Record<string, number> = {};

  // ── ZR-7A: THE PROVENANCE STAMP (the firewall integration — spec 6.1) ──
  // Every level carries { pillar, source, evidence }. A NO_DATA pillar emits
  // NO levels AND logs the honest absence — the dimension scores 0 (the
  // operator's honest-data law: the honest zero, never the proxy).
  const stamp = (pillar: string, output: PillarOutput): void => {
    const source = output.source ?? `${pillar}_REAL`;
    for (const lvl of output.levels) {
      lvl.provenance = { pillar, source, evidence: lvl.source };
    }
    if (source.endsWith('_NO_DATA')) {
      log.info(`[honest-data] ${source} — the ${HONEST_DIMENSION[pillar] ?? pillar} dimension scores 0 (the ${instrument} lane)`);
    }
  };

  // Compute each pillar
  const p1 = computeP1(bars, currentPrice, instrument);
  stamp('P1', p1);
  levels.push(...p1.levels);
  scores['P1'] = p1.score;

  const p2 = computeP2(bars, currentPrice, instrument, input.barchartData, input.tradingviewTechnicals);
  stamp('P2', p2);
  levels.push(...p2.levels);
  scores['P2'] = p2.score;

  const p3 = computeP3(bars, currentPrice, input.optionsData, input.componentSpots);
  stamp('P3', p3);
  levels.push(...p3.levels);
  scores['P3'] = p3.score;

  const p4 = computeP4(bars, currentPrice, input.analystConsensus, input.webSearchCommentary);
  stamp('P4', p4);
  levels.push(...p4.levels);
  scores['P4'] = p4.score;

  const p5 = computeP5(bars, currentPrice, instrument);

  // ── Step 0.5: Repeated Extreme Magnet Detection (MANDATORY — runs after P5) ──
  // Detects price levels that appear as swing extremes on 2+ separate dates.
  // These magnets feed into Pillar 5 as bonus price levels with confidence escalation.
  const magnets = detectRepeatedExtremes([], bars);
  if (magnets.length > 0) {
    const magnetLevels = magnetsToPriceLevels(magnets);
    p5.levels.push(...magnetLevels);
    p5.extremeBonus = Math.max(p5.extremeBonus ?? 0, maxMagnetBonus(magnets));
  }

  stamp('P5', p5);
  levels.push(...p5.levels);
  scores['P5'] = p5.score;

  const p6 = computeP6(currentPrice, instrument, bars);
  stamp('P6', p6);
  levels.push(...p6.levels);
  scores['P6'] = p6.score;

  const p7 = computeP7(bars, currentPrice, input.derivativesData, instrument);
  stamp('P7', p7);
  levels.push(...p7.levels);
  scores['P7'] = p7.score;

  const p8 = computeP8(bars, currentPrice, input.optionsData, input.componentSpots, instrument);
  stamp('P8', p8);
  levels.push(...p8.levels);
  scores['P8'] = p8.score;

  const p9 = computeP9(bars, currentPrice, dxyRegime);
  stamp('P9', p9);
  levels.push(...p9.levels);
  scores['P9'] = p9.score;

  // FIX-018: Generate audit trails for each pillar based on computation results.
  // The audit trail records the formula, inputs, and computation string so that
  // every computed level can be traced back to its source data.
  const pillarAudits: Record<string, PillarAudit> = generatePillarAudits(
    instrument, bars, currentPrice, input, scores,
    { p1, p2, p3, p4, p5, p6, p7, p8, p9 },
  );

  // E1-5 FIX: 6-dimension confluence scoring (replaces pillar sum).
  // Technical (P1+P2): 0-2, Options (P3+P8): 0-2, Analyst (P4): 0-2,
  // Structural (P5): 0-2, Psychological (P6): 0-2, Regime (P7+P9): 0-2.
  // Max: 12 base + 2 structural extreme bonus = 14 total.
  const confluenceDimensions: ConfluenceDimensions = {
    technical:     Math.min(2, (scores['P1'] + scores['P2']) / 2),
    options:       Math.min(2, (scores['P3'] + scores['P8']) / 2),
    analyst:       Math.min(2, scores['P4']),
    structural:    Math.min(2, scores['P5']),
    psychological: Math.min(2, scores['P6']),
    regime:        Math.min(2, (scores['P7'] + scores['P9']) / 2),
    structuralExtreme: p5.extremeBonus ?? 0,
  };

  const baseConfluence =
    confluenceDimensions.technical +
    confluenceDimensions.options +
    confluenceDimensions.analyst +
    confluenceDimensions.structural +
    confluenceDimensions.psychological +
    confluenceDimensions.regime;
  const compositeScore = baseConfluence + confluenceDimensions.structuralExtreme;

  const dominantPillars = Object.entries(scores)
    .filter(([, v]: [string, number]) => v >= DOMINANT_PILLAR_THRESHOLD)
    .map(([k]: [string, number]) => k);

  // FIX-018: Composite audit trail
  pillarAudits['COMPOSITE'] = {
    pillar: 'COMPOSITE',
    formula: 'E1-5 FIX: 6-dim confluence = Tech(P1+P2) + Options(P3+P8) + Analyst(P4) + Struct(P5) + Psych(P6) + Regime(P7+P9) + P5.extremeBonus',
    inputs: {
      ...scores,
      dim_technical: confluenceDimensions.technical,
      dim_options: confluenceDimensions.options,
      dim_analyst: confluenceDimensions.analyst,
      dim_structural: confluenceDimensions.structural,
      dim_psychological: confluenceDimensions.psychological,
      dim_regime: confluenceDimensions.regime,
      dim_structuralExtreme: confluenceDimensions.structuralExtreme,
    },
    computation: `Tech=${confluenceDimensions.technical.toFixed(1)} + Opt=${confluenceDimensions.options.toFixed(1)} + Anal=${confluenceDimensions.analyst.toFixed(1)} + Struct=${confluenceDimensions.structural.toFixed(1)} + Psych=${confluenceDimensions.psychological.toFixed(1)} + Regime=${confluenceDimensions.regime.toFixed(1)} (base=${baseConfluence.toFixed(1)}) + StructExtreme=${confluenceDimensions.structuralExtreme} = ${compositeScore.toFixed(1)}`,
    levels: [],
  };

  return { levels, scores, compositeScore, confluenceDimensions, dominantPillars, pillarAudits };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX-018: PILLAR AUDIT TRAIL GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIX-018: Generate audit trails for all 9 pillars.
 *
 * Each audit trail records:
 *   - formula: The mathematical formula or method used
 *   - inputs: The specific input values fed into the formula
 *   - computation: A human-readable string showing the actual calculation
 *   - levels: Per-level audit data (level price, score, and its own trail)
 *
 * This metadata is attached to PillarResult and can be included in the report
 * so every computed level can be traced back to its source.
 */
function generatePillarAudits(
  instrument: string,
  bars: OHLCBar[],
  currentPrice: number,
  input: PillarInput,
  scores: Record<string, number>,
  outputs: Record<string, PillarOutput>,
): Record<string, PillarAudit> {
  const audits: Record<string, PillarAudit> = {};
  const daily = aggregateToDaily(bars);

  // H-07: Compute daily pivots for EACH of the last 5 trading days for the
  // audit trail (TTE v5.3.3 Pillar 1 Step 2 + FIX-007). The score engine
  // (computeP1) already processes all 5 days × 3 variants; this surfaces
  // the per-day H/L/C that produces the 5 × 7 = 35 daily Classic levels.
  const p1DayCount = Math.min(P1_RECENT_DAYS, Math.max(0, daily.length - 1));
  const p1DailySummaries: Array<{ dayOffset: number; high: number; low: number; close: number; pp: number }> = [];
  for (let dayOffset = 0; dayOffset < p1DayCount; dayOffset++) {
    const dayBar = daily[daily.length - 2 - dayOffset];
    const pp = (dayBar.high + dayBar.low + dayBar.close) / 3;
    p1DailySummaries.push({
      dayOffset,
      high: dayBar.high,
      low: dayBar.low,
      close: dayBar.close,
      pp,
    });
  }
  const lastDaily = daily[daily.length - 2] ?? { high: 0, low: 0, close: 0 };

  // P1: Classic Pivot Points — 5-Day × 3-Variant Multi-Timeframe Engine
  audits['P1'] = {
    pillar: 'P1',
    formula: 'PP=(H+L+C)/3, R1=2PP-L, S1=2PP-H, R2=PP+(H-L), S2=PP-(H-L) [Classic + Fibonacci + Camarilla × 5 days + 3 weekly variants]',
    inputs: {
      dayCount: p1DayCount,
      variants: 3,
      prevHigh: lastDaily.high,
      prevLow: lastDaily.low,
      prevClose: lastDaily.close,
      currentPrice,
      ...Object.fromEntries(
        p1DailySummaries.flatMap((d) => [
          [`day${d.dayOffset}_H`, d.high],
          [`day${d.dayOffset}_L`, d.low],
          [`day${d.dayOffset}_C`, d.close],
        ]),
      ),
    },
    computation: `5-day pivot engine: ${p1DayCount} days × 3 variants = ${p1DayCount * 3} daily pivot sets (${p1DayCount * 3 * 7} levels) + 3 weekly variants (21 levels). ` +
      `D0(PP)=${p1DailySummaries[0]?.pp.toFixed(5) ?? 'N/A'}, ` +
      `D1(PP)=${p1DailySummaries[1]?.pp.toFixed(5) ?? 'N/A'}, ` +
      `D2(PP)=${p1DailySummaries[2]?.pp.toFixed(5) ?? 'N/A'}, ` +
      `D3(PP)=${p1DailySummaries[3]?.pp.toFixed(5) ?? 'N/A'}, ` +
      `D4(PP)=${p1DailySummaries[4]?.pp.toFixed(5) ?? 'N/A'}, score=${scores['P1']}`,
    levels: outputs['p1']?.levels.map((l: PriceLevel, i: number) => ({
      level: l.price,
      score: scores['P1'],
      auditTrail: {
        formula: `P1 pivot level ${i + 1}`,
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (confidence=${l.confidence})`,
      },
    })) ?? [],
  };

  // P2: Moving Average Confluence Grid (E1-5 FIX: 12 MAs weighted + clusters)
  const p2Levels = outputs['p2']?.levels ?? [];
  audits['P2'] = {
    pillar: 'P2',
    formula: 'E1-5 FIX: 12 MAs (EMA+SMA × 9,10,20,50,100,200) with weights 200=3.0,100=2.0,50=1.5,20=1.0,9/10=0.5 + cluster detection',
    inputs: {
      currentPrice,
      barchartProvided: input.barchartData ? 1 : 0,
      tvProvided: input.tradingviewTechnicals ? 1 : 0,
      maCount: 12,
    },
    computation: `12 MAs computed ${input.barchartData ? 'from Barchart data' : 'from OHLC'}, ${input.tradingviewTechnicals ? 'TradingView cross-validated' : 'no TV validation'}, ${p2Levels.filter((l: PriceLevel) => l.source.includes('CLUSTER')).length} clusters detected, score=${scores['P2']}`,
    levels: p2Levels.map((l: PriceLevel, i: number) => ({
      level: l.price,
      score: scores['P2'],
      auditTrail: {
        formula: l.source.includes('CLUSTER') ? 'MA Cluster (3+ MAs)' : l.source.includes('DOUBLE') ? 'MA Double (2 MAs)' : l.source.includes('RECAPTURE') ? 'MA Recapture' : l.source.includes('EMA') || l.source.includes('SMA') ? 'Moving Average' : 'MA',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P3: Options Open Interest / Gamma
  const p3Levels = outputs['p3']?.levels ?? [];
  audits['P3'] = {
    pillar: 'P3',
    formula: input.optionsData
      ? 'OTC option strikes filtered: >=$1.5B=CRITICAL(2pts), >=$850M=SIGNIFICANT(1pt)'
      : 'ZR-7A HONEST ZERO: no options walls — P3_NO_DATA (the Options-Derived dimension scores 0 — NEVER the histogram)',
    inputs: {
      currentPrice,
      hasOptionsData: input.optionsData ? 1 : 0,
      optionStrikeCount: input.optionsData?.strikes.length ?? 0,
    },
    computation: input.optionsData
      ? `${input.optionsData.strikes.length} option strikes processed, ${p3Levels.length} levels generated, score=${scores['P3']}`
      : `P3_NO_DATA — no options walls, 0 levels, score=0 (the honest absence)`,
    levels: p3Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P3'],
      auditTrail: {
        formula: l.source.startsWith('P3-OTC') ? 'OTC option strike' : 'Histogram density peak',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P4: Analyst Consensus / COT (Web Search / Analyst — ZR-7A: NO HP proxy)
  const p4Levels = outputs['p4']?.levels ?? [];
  const p4Formula = input.webSearchCommentary && input.webSearchCommentary.results.length > 0
    ? 'Web search institutional S/R levels (ING, FXStreet, etc.) + consensus bias'
    : input.analystConsensus
      ? 'HWC/LWC from analyst consensus + bias alignment'
      : 'ZR-7A HONEST ZERO: no analyst commentary — P4_NO_DATA (the Analyst dimension scores 0 — NEVER the HP proxy)';
  audits['P4'] = {
    pillar: 'P4',
    formula: p4Formula,
    inputs: {
      currentPrice,
      hasWebSearch: input.webSearchCommentary ? input.webSearchCommentary.results.length : 0,
      hasAnalystData: input.analystConsensus ? 1 : 0,
      analystBias: input.analystConsensus
        ? (input.analystConsensus.bias === 'bullish' ? 1 : input.analystConsensus.bias === 'bearish' ? -1 : 0)
        : 0,
    },
    computation: input.webSearchCommentary && input.webSearchCommentary.results.length > 0
      ? `Web search: ${input.webSearchCommentary.sources.length} sources, ${p4Levels.length} S/R levels, bias=${input.webSearchCommentary.consensusBias}, score=${scores['P4']}`
      : input.analystConsensus
        ? `Analyst bias=${input.analystConsensus.bias}, ${p4Levels.length} levels from HWC/LWC, score=${scores['P4']}`
        : `P4_NO_DATA — no analyst commentary, 0 levels, score=0 (the honest absence)`,
    levels: p4Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P4'],
      auditTrail: {
        formula: l.source.includes('HWC') || l.source.includes('LWC') ? 'Analyst consensus level' : 'HP trend/cycle',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P5: Prior Swing Highs/Lows
  const p5Levels = outputs['p5']?.levels ?? [];
  const p5Bonus = outputs['p5']?.extremeBonus ?? 0;
  audits['P5'] = {
    pillar: 'P5',
    formula: 'Swing detection (bar.high>neighbors), recency weighting: >500bars=+2, >250bars=+1',
    inputs: {
      currentPrice,
      barsAnalyzed: Math.min(bars.length, P5_MAX_LOOKBACK),
      swingLevelCount: p5Levels.length,
    },
    computation: `${p5Levels.length} swing levels detected, extremeBonus=${p5Bonus}, score=${scores['P5']}`,
    levels: p5Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P5'],
      auditTrail: {
        formula: 'Swing high/low with recency strength',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P6: Round Numbers
  const p6Levels = outputs['p6']?.levels ?? [];
  audits['P6'] = {
    pillar: 'P6',
    formula: `Round figure psychology: ${instrument === 'DXY' ? 'whole numbers' : 'big figure'} near current price`,
    inputs: { currentPrice, barCount: bars.length },
    computation: `${p6Levels.length} round-number levels near ${currentPrice}, score=${scores['P6']}`,
    levels: p6Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P6'],
      auditTrail: {
        formula: 'Round number / big figure',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)}`,
      },
    })),
  };

  // P7: Derivatives Arena (E1-5 FIX: NOT VWAP — ZR-7A: NO zone clustering)
  const p7Levels = outputs['p7']?.levels ?? [];
  audits['P7'] = {
    pillar: 'P7',
    formula: input.derivativesData && input.derivativesData.length > 0
      ? 'E1-5 FIX: ICE/CME derivatives OI arena — notional ≥ $500M levels as price magnets'
      : 'ZR-7A HONEST ZERO: no derivatives data — P7_NO_DATA (Bible 4.0 §4.9: contributes nothing — NEVER the arena)',
    inputs: {
      currentPrice,
      barsAnalyzed: bars.length,
      hasDerivativesData: input.derivativesData ? input.derivativesData.length : 0,
    },
    computation: input.derivativesData && input.derivativesData.length > 0
      ? `Derivatives arena from ${input.derivativesData.length} OI levels, ${p7Levels.length} arena levels, score=${scores['P7']}`
      : `P7_NO_DATA — no derivatives data, 0 levels, score=0 (Bible 4.0 §4.9: degrades gracefully)`,
    levels: p7Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P7'],
      auditTrail: {
        formula: l.source.includes('Arena') ? 'Zone clustering arena boundary' : l.source.includes('ICE') || l.source.includes('CME') ? 'Derivatives OI magnet' : 'Arena level',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P8: Strike→DXY Conversion (E1-5 FIX: NOT Max Pain)
  const p8Levels = outputs['p8']?.levels ?? [];
  audits['P8'] = {
    pillar: 'P8',
    formula: input.optionsData && input.componentSpots
      ? 'E1-5 FIX: Strike→DXY conversion via ICE DXY geometric mean (NOT max pain). >=$500M strikes converted with ±0.07/0.10/0.15 bands'
      : 'E1-5 FIX: No options/component data — P8 returns empty',
    inputs: {
      currentPrice,
      hasOptionsData: input.optionsData ? 1 : 0,
      hasComponentSpots: input.componentSpots ? Object.keys(input.componentSpots).length : 0,
      strikeCount: input.optionsData?.strikes.length ?? 0,
    },
    computation: input.optionsData && input.componentSpots
      ? `Strike to DXY from ${input.optionsData.strikes.length} strikes, ${p8Levels.length} DXY levels, score=${scores['P8']}`
      : `No data for conversion, ${p8Levels.length} levels, score=${scores['P8']}`,
    levels: p8Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P8'],
      auditTrail: {
        formula: 'ICE DXY geometric mean: DXY = 50.14348112 * EURUSD^(-0.576) * ...',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  // P9: Regime Dynamics
  const p9Levels = outputs['p9']?.levels ?? [];
  audits['P9'] = {
    pillar: 'P9',
    formula: `DXY regime filter (${input.dxyRegime ?? 'chop'}): trend slope + momentum → support/resistance`,
    inputs: { currentPrice, dxyRegime: input.dxyRegime ? 1 : 0 },
    computation: `Regime=${input.dxyRegime ?? 'chop'}, ${p9Levels.length} regime levels, score=${scores['P9']}`,
    levels: p9Levels.map((l: PriceLevel) => ({
      level: l.price,
      score: scores['P9'],
      auditTrail: {
        formula: 'Regime-conditioned level',
        inputs: { price: l.price, confidence: l.confidence },
        computation: `${l.source}=${l.price.toFixed(5)} (conf=${l.confidence.toFixed(2)})`,
      },
    })),
  };

  return audits;
}
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIX-007: Compute Classic pivot set from a day's H/L/C.
 *
 * PP = (H + L + C) / 3
 * R1 = 2×PP − L    S1 = 2×PP − H
 * R2 = PP + (H − L)  S2 = PP − (H − L)
 * R3 = H + 2×(PP − L) S3 = L − 2×(H − PP)
 */
function computeClassicPivots(h: number, l: number, c: number): Omit<DayPivotSet, 'dayIndex' | 'period' | 'variant' | 'isLegacy' | 'confidenceBonus'> {
  const pp = (h + l + c) / 3;
  const range = h - l;
  return {
    high: h, low: l, close: c,
    pp,
    r1: 2 * pp - l,
    r2: pp + range,
    r3: h + 2 * (pp - l),
    s1: 2 * pp - h,
    s2: pp - range,
    s3: l - 2 * (h - pp),
  };
}

/**
 * FIX-007: Compute Fibonacci pivot set from a day's H/L/C.
 *
 * PP = (H + L + C) / 3
 * R1 = PP + 0.382×(H−L)  S1 = PP − 0.382×(H−L)
 * R2 = PP + 0.618×(H−L)  S2 = PP − 0.618×(H−L)
 * R3 = PP + 1.000×(H−L)  S3 = PP − 1.000×(H−L)
 */
function computeFibonacciPivots(h: number, l: number, c: number): Omit<DayPivotSet, 'dayIndex' | 'period' | 'variant' | 'isLegacy' | 'confidenceBonus'> {
  const pp = (h + l + c) / 3;
  const range = h - l;
  return {
    high: h, low: l, close: c,
    pp,
    r1: pp + FIB_RATIO_382 * range,
    r2: pp + FIB_RATIO_618 * range,
    r3: pp + FIB_RATIO_1000 * range,
    s1: pp - FIB_RATIO_382 * range,
    s2: pp - FIB_RATIO_618 * range,
    s3: pp - FIB_RATIO_1000 * range,
  };
}

/**
 * FIX-007: Compute Camarilla pivot set from a day's H/L/C.
 *
 * PP = (H + L + C) / 3
 * R1 = C + 1.1×(H−L)/12  S1 = C − 1.1×(H−L)/12
 * R2 = C + 1.1×(H−L)/6   S2 = C − 1.1×(H−L)/6
 * R3 = C + 1.1×(H−L)/4   S3 = C − 1.1×(H−L)/4
 */
function computeCamarillaPivots(h: number, l: number, c: number): Omit<DayPivotSet, 'dayIndex' | 'period' | 'variant' | 'isLegacy' | 'confidenceBonus'> {
  const pp = (h + l + c) / 3;
  const range = h - l;
  return {
    high: h, low: l, close: c,
    pp,
    r1: c + (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R1_S1,
    r2: c + (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R2_S2,
    r3: c + (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R3_S3,
    s1: c - (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R1_S1,
    s2: c - (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R2_S2,
    s3: c - (CAMARILLA_MULTIPLIER * range) / CAMARILLA_DIV_R3_S3,
  };
}

/**
 * Compute a full DayPivotSet for a given variant.
 */
function computePivotSet(
  h: number, l: number, c: number,
  dayIndex: number,
  variant: PivotVariant,
  isLegacy: boolean,
  confidenceBonus: number,
  period: 'DAILY' | 'WEEKLY' = 'DAILY',
): DayPivotSet {
  let base: Omit<DayPivotSet, 'dayIndex' | 'period' | 'variant' | 'isLegacy' | 'confidenceBonus'>;
  switch (variant) {
    case 'classic':   base = computeClassicPivots(h, l, c); break;
    case 'fibonacci': base = computeFibonacciPivots(h, l, c); break;
    case 'camarilla': base = computeCamarillaPivots(h, l, c); break;
  }
  return { ...base, dayIndex, period, variant, isLegacy, confidenceBonus };
}

/**
 * FIX-008: Mandatory pivot arithmetic verification.
 *
 * Checks:
 *   1. Formula check (Classic): R1 + L = 2×PP, S1 + H = 2×PP
 *   2. Symmetry check (Fibonacci): R1−PP = PP−S1
 *   3. Sanity check: R1 > PP > S1
 *   4. Range consistency (Classic): R2 − S2 = 2×(H−L)
 *
 * Tolerance: 1e-9 for floating-point safety.
 */
function verifyPivotSet(pivots: DayPivotSet): PivotVerificationResult {
  const failures: string[] = [];
  const { high: h, low: l, pp, r1, r2, s1, s2, variant } = pivots;

  // 1. Formula check (all variants use PP = (H+L+C)/3, so R1+L should still relate)
  //    For Classic: R1 = 2×PP − L → R1 + L = 2×PP
  if (variant === 'classic') {
    if (Math.abs((r1 + l) - 2 * pp) > PIVOT_EPSILON) {
      failures.push(`Formula fail: R1(${r1}) + L(${l}) ≠ 2×PP(${2 * pp})`);
    }
    if (Math.abs((s1 + h) - 2 * pp) > PIVOT_EPSILON) {
      failures.push(`Formula fail: S1(${s1}) + H(${h}) ≠ 2×PP(${2 * pp})`);
    }
    // 4. Range consistency (Classic): R2 − S2 = 2×(H−L)
    if (Math.abs((r2 - s2) - 2 * (h - l)) > PIVOT_EPSILON) {
      failures.push(`Range consistency fail: R2(${r2}) − S2(${s2}) ≠ 2×(H−L)(${2 * (h - l)})`);
    }
  }

  // 2. Symmetry check (Fibonacci only): R1−PP = PP−S1
  if (variant === 'fibonacci') {
    if (Math.abs((r1 - pp) - (pp - s1)) > PIVOT_EPSILON) {
      failures.push(`Symmetry fail: R1−PP(${r1 - pp}) ≠ PP−S1(${pp - s1})`);
    }
  }

  // 3. Sanity check: R1 > PP > S1
  if (!(r1 > pp && pp > s1)) {
    failures.push(`Sanity fail: R1(${r1}) > PP(${pp}) > S1(${s1}) violated`);
  }

  return { passed: failures.length === 0, failures };
}

/**
 * FIX-006: Extended Historical Pivot Lookup.
 *
 * Per TTE v5.3.3 Pillar 1 Step 3: Check if the current DXY range overlaps
 * with a historical range from 2-4 months ago. If overlap found, retrieve
 * that period's OHLC for additional pivot calculations and add a LEGACY
 * BONUS of +0.5 to levels that coincide with current levels.
 *
 * @param dailyBars  All aggregated daily bars
 * @param currentRange  Current spot ± buffer (the "current range")
 * @returns Array of historical DayPivotSets with legacy bonuses applied
 */
function computeExtendedHistoricalPivots(
  dailyBars: OHLCBar[],
  currentRange: { high: number; low: number },
): DayPivotSet[] {
  if (dailyBars.length < HIST_PIVOT_MIN_DAILY) return [];

  // Historical window: 2-4 months ago ≈ 42-88 trading days back from the most recent day
  const recentDayCount = dailyBars.length;

  if (recentDayCount <= HISTORICAL_PIVOT_END_IDX) return [];

  // Extract the historical window (2-4 months back)
  const histStart = recentDayCount - HISTORICAL_PIVOT_END_IDX;
  const histEnd = recentDayCount - HISTORICAL_PIVOT_START_IDX;
  const histWindow = dailyBars.slice(histStart, histEnd);

  if (histWindow.length === 0) return [];

  // Compute the historical period's high/low/close range
  const histHigh = Math.max(...histWindow.map((b: OHLCBar) => b.high));
  const histLow = Math.min(...histWindow.map((b: OHLCBar) => b.low));
  const histClose = histWindow[histWindow.length - 1].close;

  // Check for range overlap: [histLow, histHigh] ∩ [currentLow, currentHigh]
  const overlaps = histLow <= currentRange.high && histHigh >= currentRange.low;

  if (!overlaps) {
    log.debug(`FIX-006: No historical range overlap (hist [${histLow}-${histHigh}] vs current [${currentRange.low}-${currentRange.high}])`);
    return [];
  }

  log.info(`FIX-006: Historical range overlap detected! Computing legacy pivots from ${histWindow.length} bars (hist [${histLow.toFixed(4)}-${histHigh.toFixed(4)}])`);

  // Compute 3 pivot variants from the historical period
  const legacyPivots: DayPivotSet[] = [];
  for (const variant of ['classic', 'fibonacci', 'camarilla'] as PivotVariant[]) {
    legacyPivots.push(computePivotSet(
      histHigh, histLow, histClose,
      -1,                    // special index for historical period
      variant,
      true,                  // isLegacy
      LEGACY_CONFIDENCE_BONUS, // LEGACY BONUS: +0.5 confidence to all historical levels
    ));
  }

  return legacyPivots;
}

/**
 * FIX-006: Check if a historical pivot level coincides with a current pivot level.
 * Two levels "coincide" if they are within 0.5 pip (DXY) or 5 pips (FX).
 */
function levelCoincides(
  legacyPrice: number,
  currentPrices: number[],
  pipValue: number,
): boolean {
  return currentPrices.some((curr: number) =>
    Math.abs(legacyPrice - curr) / pipValue < LEGACY_LEVEL_TOLERANCE_PIPS,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILLAR COMPUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface PillarOutput {
  levels: PriceLevel[];
  score: number;
  extremeBonus?: number;  // P5 structural extreme bonus (0-2)
  /**
   * ZR-7A: the honest-data provenance tag — 'P1_REAL'..'P9_REAL' when the
   * real data produced the result, 'P1_NO_DATA'..'P9_NO_DATA' when the
   * pillar's data is absent (the honest zero — the spec 8.2 contract).
   * P1/P2/P5/P6/P8 default to `${pillar}_REAL` in the engine (their data is
   * the bars themselves — always real).
   */
  source?: string;
  /** ZR-7A: the honest-absence note (the spec 8.2 contract). */
  note?: string;
  /**
   * FIX-018: Audit trail for this pillar's computation.
   * Records the formula applied, input values, and human-readable computation.
   */
  audit?: PillarAudit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIVOT TYPES (FIX-006, FIX-007, FIX-008)
// ═══════════════════════════════════════════════════════════════════════════════

/** Pivot computation variant (TTE v5.3.3 Pillar 1 Step 7). */
type PivotVariant = 'classic' | 'fibonacci' | 'camarilla';

/**
 * A complete pivot set computed from a single day's H/L/C.
 * FIX-007: computed for EACH of the last 5 trading days × 3 variants.
 */
interface DayPivotSet {
  dayIndex: number;           // 0 = most recent completed day (or week for WEEKLY)
  period: 'DAILY' | 'WEEKLY'; // E1-5 FIX: distinguish weekly vs daily pivots
  variant: PivotVariant;
  high: number;
  low: number;
  close: number;
  pp: number;                 // Pivot Point
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  isLegacy: boolean;          // FIX-006: from extended historical lookup
  confidenceBonus: number;    // FIX-006: +0.5 if legacy overlap coincides
}

/**
 * FIX-008: Pivot arithmetic verification result.
 */
interface PivotVerificationResult {
  passed: boolean;
  failures: string[];
}

/** A structural extreme level with recency weighting */
interface ExtremeLevel {
  price: number;
  source: string;
  lastTestedBar: number;  // bars ago when last tested
  strength: number;        // 1-3 based on age
}

// ── FIX-011: ICE US Dollar Index official formula constants ──

const DXY_WEIGHTS: Record<string, number> = {
  'EUR/USD': DXY_WEIGHT_EUR_USD,
  'USD/JPY': DXY_WEIGHT_USD_JPY,
  'GBP/USD': DXY_WEIGHT_GBP_USD,
  'USD/CAD': DXY_WEIGHT_USD_CAD,
  'USD/SEK': DXY_WEIGHT_USD_SEK,
  'USD/CHF': DXY_WEIGHT_USD_CHF,
};

/**
 * P1: Classic Pivot Points — Multi-Day × Multi-Variant (FIX-006, FIX-007, FIX-008).
 *
 * FIX-007: Computes daily pivots for EACH of the last 5 trading days,
 *          not just the last day. Each day's H/L/C produces distinct levels
 *          in 3 variants: Classic, Fibonacci, Camarilla.
 *
 * FIX-006: Checks for range overlap with historical period 2-4 months back.
 *          If overlap found, adds legacy pivots with +0.5 confidence bonus
 *          to levels that coincide with current levels.
 *
 * FIX-008: Runs mandatory arithmetic verification on ALL computed pivots
 *          and logs failures.
 *
 * Score = how many pivot levels are within proximity of current price.
 */
function computeP1(bars: OHLCBar[], currentPrice: number, instrument: string): PillarOutput {
  const daily = aggregateToDaily(bars);
  if (daily.length < PREV_DAY_OFFSET) return { levels: [], score: 0 };

  const pipValue = instrument === 'DXY' ? PIP_VALUE_DXY : PIP_VALUE_FX_4DEC;

  // ── FIX-007: Compute pivots for the last 5 trading days × 3 variants ──
  const variants: PivotVariant[] = ['classic', 'fibonacci', 'camarilla'];
  const allPivotSets: DayPivotSet[] = [];
  const verificationFailures: string[] = [];

  const dayCount = Math.min(P1_RECENT_DAYS, daily.length - 1);
  for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
    // dayIdx=0 → most recent completed day (daily[len-2] since len-1 is forming)
    const dayBar = daily[daily.length - 2 - dayIdx];
    for (const variant of variants) {
      const pivotSet = computePivotSet(
        dayBar.high, dayBar.low, dayBar.close,
        dayIdx, variant, false, 0,
      );

      // FIX-008: Verify pivot arithmetic
      const verification = verifyPivotSet(pivotSet);
      if (!verification.passed) {
        for (const fail of verification.failures) {
          verificationFailures.push(`[Day-${dayIdx} ${variant}] ${fail}`);
        }
      }

      allPivotSets.push(pivotSet);
    }
  }

  // ── E1-5 FIX P1: Compute WEEKLY pivots from the prior week's H/L/C ──
  // The prior week = the last 5 completed trading days (5 × BARS_PER_DAY_4H 4H bars).
  // Compute all 3 variants (Classic, Fibonacci, Camarilla) from the prior week's OHLC.
  const WEEKLY_TRADING_DAYS = 5;
  const weeklyDaysAvailable = daily.length >= 2
    ? Math.min(WEEKLY_TRADING_DAYS, daily.length - 1)
    : 0;

  if (weeklyDaysAvailable >= 2) {
    // Use the prior week's completed daily bars (excluding today's forming bar).
    // weeklyStart = daily.length - 1 (forming) - 1 (today's completed) - weeklyDaysAvailable
    const weekEnd = daily.length - 2;      // last fully-completed day of the prior week
    const weekStart = weekEnd - weeklyDaysAvailable + 1;
    const weekBars = daily.slice(weekStart, weekEnd + 1);

    if (weekBars.length >= 2) {
      const weekHigh = Math.max(...weekBars.map((b: OHLCBar) => b.high));
      const weekLow = Math.min(...weekBars.map((b: OHLCBar) => b.low));
      const weekClose = weekBars[weekBars.length - 1].close;

      for (const variant of variants) {
        const weeklyPivotSet = computePivotSet(
          weekHigh, weekLow, weekClose,
          0,          // weekIndex = 0 (most recent prior week)
          variant,
          false,
          0,
          'WEEKLY',   // E1-5 FIX: mark as weekly
        );

        // FIX-008: Verify weekly pivot arithmetic too
        const verification = verifyPivotSet(weeklyPivotSet);
        if (!verification.passed) {
          for (const fail of verification.failures) {
            verificationFailures.push(`[Weekly ${variant}] ${fail}`);
          }
        }

        allPivotSets.push(weeklyPivotSet);
      }

      log.debug(`E1-5 FIX P1: Computed ${variants.length} weekly pivot variants from prior week H=${weekHigh.toFixed(5)} L=${weekLow.toFixed(5)} C=${weekClose.toFixed(5)}`);
    }
  }
  // Current range = spot ± 0.5% buffer
  const currentRangeBuffer = currentPrice * CURRENT_RANGE_BUFFER_PCT;
  const currentRange = {
    high: currentPrice + currentRangeBuffer,
    low: currentPrice - currentRangeBuffer,
  };
  const legacyPivots = computeExtendedHistoricalPivots(daily, currentRange);
  allPivotSets.push(...legacyPivots);

  // ── Build PriceLevel[] from all pivot sets ──
  const levels: PriceLevel[] = [];
  const currentLevelPrices = allPivotSets
    .filter((p: DayPivotSet) => !p.isLegacy)
    .flatMap(p => [p.r1, p.r2, p.r3, p.pp, p.s1, p.s2, p.s3]);

  for (const pivotSet of allPivotSets) {
    const dayLabel = pivotSet.isLegacy
      ? 'LEGACY'
      : pivotSet.period === 'WEEKLY'
        ? `W${pivotSet.dayIndex}`
        : `D${pivotSet.dayIndex}`;
    const baseConfidence: Record<string, number> = {
      pp: PP_BASE_CONFIDENCE, r1: R1_S1_BASE_CONFIDENCE, r2: R2_S2_BASE_CONFIDENCE, r3: R3_S3_BASE_CONFIDENCE, s1: R1_S1_BASE_CONFIDENCE, s2: R2_S2_BASE_CONFIDENCE, s3: R3_S3_BASE_CONFIDENCE,
    };

    // FIX-006: Add legacy confidence bonus to coinciding levels
    let legacyBonus = 0;
    if (pivotSet.isLegacy) {
      // Check each level for coincidence with current levels
      const allLegacyPrices = [pivotSet.r1, pivotSet.r2, pivotSet.r3, pivotSet.pp, pivotSet.s1, pivotSet.s2, pivotSet.s3];
      const coincides = allLegacyPrices.some((price: number) =>
        levelCoincides(price, currentLevelPrices, pipValue),
      );
      legacyBonus = coincides ? pivotSet.confidenceBonus : 0;
      if (coincides) {
        log.debug(`FIX-006: Legacy ${pivotSet.variant} pivot coincides with current levels → +${pivotSet.confidenceBonus} bonus`);
      }
    }

    const confidenceCap = (key: string): number =>
      Math.min(1.0, (baseConfidence[key] ?? DEFAULT_CONFIDENCE) + legacyBonus);

    levels.push(
      { price: pivotSet.r3, source: `P1-R3-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('r3') },
      { price: pivotSet.r2, source: `P1-R2-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('r2') },
      { price: pivotSet.r1, source: `P1-R1-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('r1') },
      { price: pivotSet.pp, source: `P1-PP-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('pp') },
      { price: pivotSet.s1, source: `P1-S1-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('s1') },
      { price: pivotSet.s2, source: `P1-S2-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('s2') },
      { price: pivotSet.s3, source: `P1-S3-${dayLabel}-${pivotSet.variant}`, confidence: confidenceCap('s3') },
    );
  }

  // ── FIX-008: Log verification failures ──
  if (verificationFailures.length > 0) {
    for (const fail of verificationFailures) {
      log.warn(`FIX-008 Pivot Verification FAIL: ${fail}`);
    }
  } else {
    log.debug(`FIX-008: All ${allPivotSets.length} pivot sets passed arithmetic verification`);
  }

  // ── Score: count levels within proximity of current price ──
  const nearCount = levels.filter((l: PriceLevel) => {
    const distPips = Math.abs(l.price - currentPrice) / pipValue;
    return distPips < PROXIMITY_MED_PIPS;
  }).length;

  // Trend strength: how far is the close of the most recent completed bar from its PP
  const lastCompleted = daily[daily.length - 2];
  const lastPP = (lastCompleted.high + lastCompleted.low + lastCompleted.close) / 3;
  const trendStrength = Math.abs(lastCompleted.close - lastPP) / pipValue;
  const trendBonus = trendStrength > P1_TREND_BONUS_PIPS ? 1 : 0;

  let score = Math.min(2, Math.floor(nearCount / PIVOT_LEVELS_PER_SET) + trendBonus);
  score = Math.max(0, Math.min(2, score));

  // Legacy overlap adds a sub-score boost (max +1 but still capped at 2)
  if (legacyPivots.length > 0) {
    const legacyNear = legacyPivots.some((p: DayPivotSet) => {
      return [p.r1, p.s1, p.pp].some((price: number) =>
        Math.abs(price - currentPrice) / pipValue < PROXIMITY_HIGH_PIPS,
      );
    });
    if (legacyNear) score = Math.min(2, score + 1);
  }

  return { levels, score };
}

/** External MA data shape for P2 cross-validation. */
interface BarchartMAInput {
  ema9: number; ema20: number; ema50: number; ema100: number; ema200: number;
  sma9: number; sma20: number; sma50: number; sma100: number; sma200: number;
}

interface TradingViewTechnicalInput {
  ema: Record<string, number>;
  sma: Record<string, number>;
}

interface AnalystConsensusInput {
  hwc: number | null;
  lwc: number | null;
  bias: 'bullish' | 'bearish' | 'neutral';
  sources: string[];
}

/**
 * E1-5 FIX P2: MA weights — longer periods weighted higher (per spec).
 * 200=3.0, 100=2.0, 50=1.5, 20=1.0, 9/10=0.5
 */
const MA_WEIGHTS: Record<number, number> = {
  200: 3.0,
  100: 2.0,
  50:  1.5,
  20:  1.0,
  9:   0.5,
  10:  0.5,
};

/** E1-5 FIX P2: MA cluster threshold (15 pips for all instruments). */
const MA_CLUSTER_THRESHOLD_PIPS = 15;

/** A computed MA level with type, period, value, and weight. */
interface MAConfluenceLevel {
  type: 'EMA' | 'SMA';
  period: number;
  value: number;
  weight: number;
}

/**
 * P2: Moving Average Confluence Grid (E1-5 FIX: 12 MAs weighted + cluster detection).
 *
 * Computes EMA 9, 10, 20, 50, 100, 200 AND SMA 9, 10, 20, 50, 100, 200.
 * Each MA carries a weight: 200=3.0, 100=2.0, 50=1.5, 20=1.0, 9/10=0.5.
 * Detects confluence clusters (3+ MAs within threshold) and doubles (2 MAs).
 *
 * FIX-009: Retains MA recapture detection (50, 100, 200 cross-up within 3 sessions).
 */
function computeP2(
  bars: OHLCBar[],
  currentPrice: number,
  instrument: string,
  barchartData?: BarchartMAInput,
  tradingviewTechnicals?: TradingViewTechnicalInput,
): PillarOutput {
  const closes = bars.map((b: OHLCBar) => b.close);
  const maPeriods = [9, 10, 20, 50, 100, 200];
  const pipValue = instrument === 'DXY' ? PIP_VALUE_DXY : PIP_VALUE_FX_4DEC;
  const clusterThreshold = MA_CLUSTER_THRESHOLD_PIPS * pipValue;

  // ── E1-5 FIX P2: Build the full 12-MA confluence grid (6 EMA + 6 SMA) ──
  const maLevels: MAConfluenceLevel[] = [];

  for (const period of maPeriods) {
    const weight = MA_WEIGHTS[period] ?? 1.0;

    // EMA: prefer external barchart data, fall back to computed from OHLC
    // (period 10 is not in barchartData, so it's always computed from closes)
    let emaValue: number;
    if (barchartData && period !== 10) {
      emaValue = period === 9   ? barchartData.ema9
               : period === 20  ? barchartData.ema20
               : period === 50  ? barchartData.ema50
               : period === 100 ? barchartData.ema100
               : period === 200 ? barchartData.ema200
               : 0;
    } else {
      emaValue = computeEMA(closes, period);
    }
    if (emaValue > 0) maLevels.push({ type: 'EMA', period, value: emaValue, weight });

    // SMA: prefer external barchart data, fall back to computed from OHLC
    let smaValue: number;
    if (barchartData && period !== 10) {
      smaValue = period === 9   ? barchartData.sma9
               : period === 20  ? barchartData.sma20
               : period === 50  ? barchartData.sma50
               : period === 100 ? barchartData.sma100
               : period === 200 ? barchartData.sma200
               : 0;
    } else {
      smaValue = computeSMA(closes, period);
    }
    if (smaValue > 0) maLevels.push({ type: 'SMA', period, value: smaValue, weight });
  }

  // Build PriceLevels with confidence based on period significance
  const levels: PriceLevel[] = [];
  for (const ma of maLevels) {
    const baseConfidence = ma.period >= 200 ? EMA200_CONFIDENCE
      : ma.period >= 100 ? EMA50_CONFIDENCE
      : ma.period >= 50  ? EMA50_CONFIDENCE
      : EMA20_CONFIDENCE;
    levels.push({
      price: ma.value,
      source: `P2-${ma.type}${ma.period}`,
      confidence: baseConfidence,
    });
  }

  // Cross-validate ALL MAs with TradingView technicals if available
  if (tradingviewTechnicals) {
    for (const ma of maLevels) {
      const tvMap = ma.type === 'EMA' ? tradingviewTechnicals.ema : tradingviewTechnicals.sma;
      const tvVal = tvMap[String(ma.period)];
      if (tvVal !== undefined && Math.abs(tvVal - ma.value) / Math.max(ma.value, 1) < TV_CROSS_VALIDATION_TOLERANCE) {
        const levelKey = `P2-${ma.type}${ma.period}`;
        const level = levels.find((l: PriceLevel) => l.source === levelKey);
        if (level) level.confidence = Math.min(1.0, level.confidence + TV_CONFIRMATION_BOOST);
      }
    }
  }

  // ── E1-5 FIX P2: Detect confluence clusters (3+ MAs within threshold) ──
  const sortedMA = [...maLevels].sort((a: MAConfluenceLevel, b: MAConfluenceLevel) => a.value - b.value);
  const clusterUsed = new Set<number>();
  const clusters: MAConfluenceLevel[][] = [];
  const doubles: MAConfluenceLevel[][] = [];

  for (let i = 0; i < sortedMA.length; i++) {
    if (clusterUsed.has(i)) continue;
    const group: MAConfluenceLevel[] = [sortedMA[i]];
    for (let j = i + 1; j < sortedMA.length; j++) {
      if (clusterUsed.has(j)) continue;
      const distance = Math.abs(sortedMA[i].value - sortedMA[j].value);
      if (distance <= clusterThreshold) {
        group.push(sortedMA[j]);
        clusterUsed.add(j);
      }
    }
    clusterUsed.add(i);
    if (group.length >= 3) clusters.push(group);
    else if (group.length === 2) doubles.push(group);
  }

  // Add cluster boundary levels (strong institutional magnet zones)
  for (const cluster of clusters) {
    const avgValue = cluster.reduce((sum: number, m: MAConfluenceLevel) => sum + m.value, 0) / cluster.length;
    levels.push({
      price: avgValue,
      source: `P2-CLUSTER(${cluster.length}MAs)`,
      confidence: 1.0,
    });
    log.debug(`E1-5 FIX P2: MA cluster — ${cluster.length} MAs at ~${avgValue.toFixed(5)} (${cluster.map((m: MAConfluenceLevel) => `${m.type}${m.period}`).join(', ')})`);
  }

  for (const dbl of doubles) {
    const avgValue = dbl.reduce((sum: number, m: MAConfluenceLevel) => sum + m.value, 0) / dbl.length;
    levels.push({
      price: avgValue,
      source: `P2-DOUBLE(${dbl.map((m: MAConfluenceLevel) => `${m.type}${m.period}`).join('+')})`,
      confidence: 0.8,
    });
  }

  // ── FIX-009: MA Recapture Detection (retained from original) ──
  const daily = aggregateToDaily(bars);
  let recaptureBonus = 0;
  const recaptureMAs: string[] = [];

  if (daily.length >= RECAPTURE_MIN_DAILY) {
    for (const [maName, maValue] of [
      ['EMA50', maLevels.find((m: MAConfluenceLevel) => m.type === 'EMA' && m.period === 50)?.value ?? 0],
      ['EMA100', maLevels.find((m: MAConfluenceLevel) => m.type === 'EMA' && m.period === 100)?.value ?? 0],
      ['EMA200', maLevels.find((m: MAConfluenceLevel) => m.type === 'EMA' && m.period === 200)?.value ?? 0],
    ] as Array<[string, number]>) {
      if (maValue <= 0) continue;

      let crossedUp = false;
      for (let i = 1; i <= Math.min(RECAPTURE_LOOKBACK_SESSIONS, daily.length - 1); i++) {
        const todayBar = daily[daily.length - i];
        const prevBar = daily[daily.length - i - 1];
        if (prevBar.close <= maValue && todayBar.close > maValue) {
          crossedUp = true;
          break;
        }
      }

      if (crossedUp) {
        recaptureMAs.push(maName);
        levels.push({
          price: maValue,
          source: `P2-${maName}-RECAPTURE`,
          confidence: RECAPTURE_CONFIDENCE,
        });
        log.info(`FIX-009: ${maName} recapture detected — price crossed above ${maValue} within 3 sessions → RECAPTURE ZONE +2 bonus`);
      }
    }
  }

  if (recaptureMAs.length > 0) {
    recaptureBonus = RECAPTURE_BONUS;
  }

  // Score: weighted proximity + cluster presence + recapture
  let weightedNearCount = 0;
  for (const ma of maLevels) {
    const distPct = Math.abs(ma.value - currentPrice) / currentPrice;
    if (distPct < EMA_PROXIMITY_PCT) {
      weightedNearCount += ma.weight >= 3.0 ? 1.0 : ma.weight >= 1.5 ? 0.75 : 0.5;
    }
  }
  const clusterBonus = clusters.length > 0 ? 1 : 0;

  let score = Math.floor(weightedNearCount) + clusterBonus + recaptureBonus;
  score = Math.max(0, Math.min(2, score));

  return { levels, score };
}

/**
 * FIX-011: Convert an option strike on a forex pair to its equivalent DXY level.
 *
 * Uses the official ICE DXY geometric-mean formula:
 *   DXY = 50.14348112 × EURUSD^(-0.576) × USDJPY^(0.136) × GBPUSD^(-0.119)
 *         × USDCAD^(0.091) × USDSEK^(0.042) × USDCHF^(0.036)
 *
 * The strike replaces the component spot for the given pair. All other
 * components use their current spot values from componentSpots.
 *
 * @param strike          The option strike price on the forex pair
 * @param pair            The pair code ('EUR/USD', 'USD/JPY', 'GBP/USD', etc.)
 * @param componentSpots  Current spot rates for all 6 DXY components
 * @returns Equivalent DXY level, or null if the pair is not a DXY component
 */
export function convertOptionStrikeToDXY(
  strike: number,
  pair: string,
  componentSpots: Record<string, number>,
): number | null {
  const weight = DXY_WEIGHTS[pair];
  if (weight === undefined) {
    // Pair is not a DXY component (e.g., AUD/USD) — cannot convert
    return null;
  }

  let product = DXY_BASE;
  for (const [componentPair, w] of Object.entries(DXY_WEIGHTS)) {
    const value = componentPair === pair ? strike : (componentSpots[componentPair] ?? 0);
    if (value <= 0) return null;  // missing component data
    product *= Math.pow(value, w);
  }

  return product;
}

/**
 * P3: Options Open Interest / Gamma with DXY conversion (FIX-011).
 * Uses the REAL OTC option walls when present (converted via the ICE
 * K-factor when the strikes are on forex pairs).
 *
 * ZR-7A (the honest-data purge): when the pair has NO options walls, the
 * Options-Derived dimension scores 0 — the Gamma-HISTOGRAM proxy is DELETED
 * (the operator's law, 2026-08-04: "NO FABRICATED DATA ANYWHERE. GET THE
 * CORRECT FUCKING DATA OR THROW ERROR.").
 */
function computeP3(
  bars: OHLCBar[],
  currentPrice: number,
  optionsData?: OptionsExpiryData,
  componentSpots?: Record<string, number>,
): PillarOutput {
  // ── REAL OTC Option Data Path ──
  if (optionsData && optionsData.strikes.length > 0) {
    // TTE thresholds
    const CRITICAL_THRESHOLD = OPTION_CRITICAL_NOTIONAL_B;    // >= $1.5B
    const SIGNIFICANT_THRESHOLD = OPTION_SIGNIFICANT_NOTIONAL_B; // >= $850M

    // Filter to significant+ strikes only
    const significantStrikes = optionsData.strikes.filter((s: OptionStrike) => s.notional >= SIGNIFICANT_THRESHOLD);

    if (significantStrikes.length > 0) {
      const levels: PriceLevel[] = [];
      let score = 0;

      for (const strike of significantStrikes) {
        // FIX-011: Convert forex pair strikes to DXY equivalent if component spots available
        let effectivePrice = strike.strike;
        let sourceSuffix = strike.pair;
        if (componentSpots && strike.pair !== 'DXY') {
          const dxyEquivalent = convertOptionStrikeToDXY(strike.strike, strike.pair, componentSpots);
          if (dxyEquivalent !== null) {
            effectivePrice = dxyEquivalent;
            sourceSuffix = `${strike.pair}→DXY`;
            log.debug(`FIX-011: ${strike.pair} strike ${strike.strike} → DXY ${dxyEquivalent.toFixed(4)}`);
          }
        }

        if (strike.notional >= CRITICAL_THRESHOLD) {
          // CRITICAL option wall
          levels.push({
            price: effectivePrice,
            source: `P3-OTC-Option-CRITICAL-${sourceSuffix}`,
            confidence: OPTION_CRITICAL_CONFIDENCE,
          });
          score = Math.min(2, score + 2);
        } else {
          // SIGNIFICANT magnet
          levels.push({
            price: effectivePrice,
            source: `P3-OTC-Option-${sourceSuffix}`,
            confidence: OPTION_SIGNIFICANT_CONFIDENCE,
          });
          score = Math.min(2, score + 1);
        }
      }

      return { levels, score, source: 'P3_REAL' };
    }
  }

  // ── ZR-7A: THE HONEST ZERO — the Gamma-histogram proxy DELETED. When the
  //    pair has no options walls, the Options-Derived dimension scores 0 —
  //    the level list is empty — NEVER the price-history-derived "gamma"
  //    fabrication (the spec 6.1 computeP3 AFTER; the operator's law:
  //    BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT).
  log.info('[honest-data] P3_NO_DATA — the component-pair options data is absent — the Options-Derived dimension scores 0 (the honest absence, NEVER a proxy)');
  return {
    levels: [],
    score: 0,
    source: 'P3_NO_DATA',
    note: 'the component-pair options data is absent — the Options-Derived dimension scores 0 (the honest absence, NEVER a proxy)',
  };
}

/**
 * P4: Analyst Consensus / COT — Web Search Institutional Commentary
 *
 * FIX-019: Per TTE v5.3.3 Pillar 4 spec, uses real analyst commentary from
 * institutional sources (ING, FXStreet, VT Markets, forex.com, Continuum
 * Economics) as the primary data source.
 *
 * Priority:
 *   1. Web search commentary (real institutional S/R levels) — FIX-019
 *   2. Analyst consensus (HWC/LWC from forex.com research)
 *   3. ZR-7A: THE HONEST ZERO — the HP-filter trend/cycle proxy is DELETED.
 *      When NO commentary exists, the Analyst dimension scores 0 (the
 *      operator's honest-data law — NEVER a price-history-derived "analyst"
 *      fabrication).
 */
function computeP4(
  bars: OHLCBar[],
  currentPrice: number,
  analystConsensus?: AnalystConsensusInput,
  webSearchCommentary?: WebSearchCommentary,
): PillarOutput {
  // FIX-019: Web search institutional commentary — highest priority
  if (webSearchCommentary && webSearchCommentary.results.length > 0) {
    const levels: PriceLevel[] = [];
    let score = 0;

    // Extract resistance levels from institutional commentary
    for (const r of webSearchCommentary.resistance.slice(0, MAX_WEB_LEVELS)) {
      const dist = Math.abs(r - currentPrice) / currentPrice;
      levels.push({
        price: r,
        source: `P4-Resistance (Web: ${webSearchCommentary.sources.length} sources)`,
        confidence: WEB_LEVEL_CONFIDENCE,
      });
      if (dist < PROXIMITY_CLOSE_PCT) score = Math.max(score, 2);
      else if (dist < PROXIMITY_MODERATE_PCT) score = Math.max(score, 1);
    }

    // Extract support levels from institutional commentary
    for (const s of webSearchCommentary.support.slice(0, MAX_WEB_LEVELS)) {
      const dist = Math.abs(s - currentPrice) / currentPrice;
      levels.push({
        price: s,
        source: `P4-Support (Web: ${webSearchCommentary.sources.length} sources)`,
        confidence: WEB_LEVEL_CONFIDENCE,
      });
      if (dist < PROXIMITY_CLOSE_PCT) score = Math.max(score, 2);
      else if (dist < PROXIMITY_MODERATE_PCT) score = Math.max(score, 1);
    }

    // Consensus bias alignment with price action
    if (webSearchCommentary.consensusBias === 'bullish' && currentPrice > bars[bars.length - 1].close) {
      score = Math.min(2, score + 1);
    } else if (webSearchCommentary.consensusBias === 'bearish' && currentPrice < bars[bars.length - 1].close) {
      score = Math.min(2, score + 1);
    }

    score = Math.max(0, Math.min(2, score));
    // ZR-7A: the web commentary is PRESENT — the REAL extraction's result
    // stands (even an empty near-level set is the REAL outcome — the honest
    // data was consumed; NEVER a proxy substitute).
    return { score, levels, source: 'P4_REAL' };
  }

  // If external analyst consensus is available, use it directly
  if (analystConsensus) {
    const levels: PriceLevel[] = [];
    let score = 0;

    if (analystConsensus.hwc !== null) {
      const hwcDist = Math.abs(analystConsensus.hwc - currentPrice) / currentPrice;
      levels.push({ price: analystConsensus.hwc, source: 'P4-HWC (Analyst)', confidence: ANALYST_HWC_CONFIDENCE });
      if (hwcDist < PROXIMITY_CLOSE_PCT) score = Math.max(score, 2);
      else if (hwcDist < PROXIMITY_MODERATE_PCT) score = Math.max(score, 1);
    }

    if (analystConsensus.lwc !== null) {
      const lwcDist = Math.abs(analystConsensus.lwc - currentPrice) / currentPrice;
      levels.push({ price: analystConsensus.lwc, source: 'P4-LWC (Analyst)', confidence: ANALYST_LWC_CONFIDENCE });
      if (lwcDist < PROXIMITY_CLOSE_PCT) score = Math.max(score, 2);
      else if (lwcDist < PROXIMITY_MODERATE_PCT) score = Math.max(score, 1);
    }

    // Bias alignment with price action
    if (analystConsensus.bias === 'bullish' && currentPrice > bars[bars.length - 1].close) {
      score = Math.min(2, score + 1);
    } else if (analystConsensus.bias === 'bearish' && currentPrice < bars[bars.length - 1].close) {
      score = Math.min(2, score + 1);
    }

    score = Math.max(0, Math.min(2, score));
    return { score, levels, source: 'P4_REAL' };
  }

  // ── ZR-7A: THE HONEST ZERO — the HP-trend proxy DELETED. When the analyst
  //    commentary is ABSENT, the Analyst dimension scores 0 — NEVER the
  //    HP-filter trend/cycle fabrication from the price history (the spec
  //    6.1 computeP4 AFTER; the operator's law: the fabricated analyst
  //    levels are FORBIDDEN).
  log.info('[honest-data] P4_NO_DATA — the analyst commentary is absent — the Analyst dimension scores 0 (the honest absence)');
  return {
    levels: [],
    score: 0,
    source: 'P4_NO_DATA',
    note: 'the analyst commentary is absent — the Analyst dimension scores 0 (the honest absence)',
  };
}

/**
 * Hodrick-Prescott Filter — decomposes price into trend (τ) and cycle (c).
 * λ = 1600 for 4H data, 14400 for daily.
 *
 * minimize: Σ(y_t - τ_t)² + λ * Σ((τ_{t+1} - τ_t) - (τ_t - τ_{t-1}))²
 */
function hpFilter(data: number[], lambda: number): number[] {
  const n = data.length;
  if (n < HP_MIN_DATA_POINTS) return data.slice(); // Need at least 4 points

  // Use a simplified HP filter: 2nd difference penalty matrix
  // For production, use a proper tridiagonal solver
  // For now, use a practical approximation

  // Build the trend component using a smoothing approach
  const trend = new Array(n).fill(0);
  const cycle = new Array(n).fill(0);

  // Initial estimate: simple moving average
  let sum = 0;
  for (let i = 0; i < n; i++) sum += data[i];
  const mean = sum / n;
  for (let i = 0; i < n; i++) trend[i] = mean;

  // Iterative refinement (simplified HP)
  for (let iter = 0; iter < HP_MAX_ITERATIONS; iter++) {
    let maxChange = 0;
    for (let i = SWING_BOUNDARY_OFFSET; i < n - SWING_BOUNDARY_OFFSET; i++) {
      const old = trend[i];
      // HP first-order condition approximation
      trend[i] = (data[i] + lambda * (trend[i - 1] + trend[i + 1]) / (1 + 2 * lambda));
      maxChange = Math.max(maxChange, Math.abs(trend[i] - old));
    }
    if (maxChange < HP_CONVERGENCE_THRESHOLD) break;
  }

  return trend;
}

/**
 * Standard deviation of a numeric array.
 */
function stdDev(values: number[]): number {
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const sqDiffs = values.map((v: number) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a: number, b: number) => a + b, 0) / values.length);
}

/**
 * P5: Prior Swing Highs/Lows — Structural Extreme Bonus
 * Detects swing highs/lows from OHLC data and assigns recency-weighted strength.
 * Levels not tested in months are stronger (extreme bonus) than recently tested ones.
 *
 * Returns:
 *   score: 0-2 based on proximity of swing levels to current price
 *   levels: PriceLevel[] with confidence ratings
 *   extremeBonus: 0-2 bonus for structural extremes near price
 */
function computeP5(bars: OHLCBar[], currentPrice: number, instrument?: string): PillarOutput {
  const lookback = Math.min(bars.length, P5_MAX_LOOKBACK);
  if (lookback < P5_MIN_LOOKBACK) return { levels: [], score: 0 };

  // Find swing highs and lows
  const swingHighs: ExtremeLevel[] = [];
  const swingLows: ExtremeLevel[] = [];

  for (let i = SWING_BOUNDARY_OFFSET; i < lookback - SWING_BOUNDARY_OFFSET; i++) {
    const bar = bars[i];
    const prevBar = bars[i - 1];
    const nextBar = bars[i + 1];

    // Swing high: higher than neighbors
    if (bar.high > prevBar.high && bar.high > nextBar.high) {
      // Check if it's a significant swing (higher than 2 bars back too)
      if (i > 1 && i < lookback - 1 && bar.high > bars[i - SWING_CONFIRMATION_BARS].high && bar.high > bars[i + SWING_CONFIRMATION_BARS].high) {
        swingHighs.push({
          price: bar.high,
          source: `P5-SwingHigh @ bar -${lookback - i}`,
          lastTestedBar: lookback - i,
          strength: 0, // computed below
        });
      }
    }

    // Swing low: lower than neighbors
    if (bar.low < prevBar.low && bar.low < nextBar.low) {
      if (i > 1 && i < lookback - 1 && bar.low < bars[i - SWING_CONFIRMATION_BARS].low && bar.low < bars[i + SWING_CONFIRMATION_BARS].low) {
        swingLows.push({
          price: bar.low,
          source: `P5-SwingLow @ bar -${lookback - i}`,
          lastTestedBar: lookback - i,
          strength: 0, // computed below
        });
      }
    }
  }

  // Compute strength based on age (recency = weaker, old = stronger)
  for (const level of [...swingHighs, ...swingLows]) {
    // Bars since formation = how "old" this level is
    const barsSince = level.lastTestedBar;

    // Structural Extreme Bonus:
    // Not tested in 6+ months (est. ~500 4H bars) → +2
    // Not tested in 3-6 months (est. ~250 4H bars) → +1
    // Tested within 3 months → +0
    if (barsSince > EXTREME_BONUS_LONG_BARS) {
      level.strength = STRENGTH_LONG;  // +2 extreme bonus
    } else if (barsSince > EXTREME_BONUS_MED_BARS) {
      level.strength = STRENGTH_MED;  // +1 extreme bonus
    } else if (barsSince > NORMAL_STRENGTH_BARS) {
      level.strength = 1;  // normal strength
    } else {
      level.strength = 0;  // recently tested, weak
    }
  }

  // Score based on proximity to current price
  let score = 0;
  let extremeBonus = 0;
  const levels: PriceLevel[] = [];

  for (const level of [...swingHighs, ...swingLows]) {
    const distPct = Math.abs(level.price - currentPrice) / currentPrice;

    if (distPct < P5_EXTREME_PROXIMITY_PCT && level.strength >= EXTREME_STRENGTH_MIN) {
      score = 2;
      extremeBonus = Math.max(extremeBonus, level.strength - 1);
      levels.push({ price: level.price, source: level.source + ' (EXTREME)', confidence: P5_EXTREME_CONFIDENCE });
    } else if (distPct < P5_MODERATE_PROXIMITY_PCT && level.strength >= 1) {
      score = Math.max(score, 1);
      levels.push({ price: level.price, source: level.source, confidence: 1 });
    }
  }

  // If no swing levels near price, use wider lookback
  if (levels.length === 0 && bars.length > P5_FALLBACK_MIN_BARS) {
    // Fallback: use the highest high and lowest low of the lookback period
    const periodHigh = Math.max(...bars.slice(-P5_FALLBACK_SLICE).map((b: OHLCBar) => b.high));
    const periodLow = Math.min(...bars.slice(-P5_FALLBACK_SLICE).map((b: OHLCBar) => b.low));

    const highDist = Math.abs(periodHigh - currentPrice) / currentPrice;
    const lowDist = Math.abs(currentPrice - periodLow) / currentPrice;

    if (highDist < P5_MODERATE_PROXIMITY_PCT) {
      levels.push({ price: periodHigh, source: 'P5-PeriodHigh (40)', confidence: 1 });
      score = Math.max(score, 1);
    }
    if (lowDist < P5_MODERATE_PROXIMITY_PCT) {
      levels.push({ price: periodLow, source: 'P5-PeriodLow (40)', confidence: 1 });
      score = Math.max(score, 1);
    }
  }

  // === P5 STEP 0: DAILY STRUCTURAL EXTREME SCAN ===
  // Spec: 90-day D1 scan for rejection-wick swing levels
  const dailyBars = aggregateToDaily(bars);
  const pipScale = instrument === 'DXY' ? 0.15 : 0.0015;
  const dailyMax = Math.min(dailyBars.length, 90);

  for (let i = 2; i < dailyMax - 2; i++) {
    const bar = dailyBars[i];
    const prev = dailyBars[i - 1];
    const next = dailyBars[i + 1];
    const range = bar.high - bar.low;
    if (range <= 0) continue;

    // Swing LOW detection (lower than both neighbor)
    if (bar.low < prev.low && bar.low < next.low) {
      const lowerWick = Math.min(bar.open, bar.close) - bar.low;
      const closePct = (bar.close - bar.low) / range; // 0=bottom, 1=top
      if (lowerWick >= pipScale && closePct >= 0.5) {
        // Rejection wick: price swept liquidity then closed higher = demand won
        levels.push({ price: bar.low, source: 'P5-LiquiditySweepTarget', confidence: 2 });
      } else {
        levels.push({ price: bar.low, source: 'P5-SwingLow', confidence: 1 });
      }
    }

    // Swing HIGH detection (higher than both neighbor)
    if (bar.high > prev.high && bar.high > next.high) {
      const upperWick = bar.high - Math.max(bar.open, bar.close);
      const closePct = (bar.close - bar.low) / range;
      if (upperWick >= pipScale && closePct <= 0.5) {
        // Rejection wick: price pushed up then closed lower = supply won
        levels.push({ price: bar.high, source: 'P5-SupplyCeilingTarget', confidence: 2 });
      } else {
        levels.push({ price: bar.high, source: 'P5-SwingHigh', confidence: 1 });
      }
    }
  }

  // === 180-DAY CONDITIONAL EXTENSION ===
  if (dailyBars.length > 90) {
    const slice90 = dailyBars.slice(0, 90);
    const p90H = Math.max(...slice90.map(b => b.high));
    const p90L = Math.min(...slice90.map(b => b.low));
    const distToRange = Math.min(Math.abs(currentPrice - p90H), Math.abs(currentPrice - p90L));
    if (distToRange < (instrument === 'DXY' ? 1.0 : 0.01)) {
      for (let i = 90; i < Math.min(dailyBars.length, 180) - 2; i++) {
        const bar = dailyBars[i];
        if (bar.low < dailyBars[i-1].low && bar.low < dailyBars[i+1].low) {
          levels.push({ price: bar.low, source: 'P5-LegacySweepTarget', confidence: 1.5 });
        }
        if (bar.high > dailyBars[i-1].high && bar.high > dailyBars[i+1].high) {
          levels.push({ price: bar.high, source: 'P5-LegacyCeilingTarget', confidence: 1.5 });
        }
      }
    }
  }

  // === DE-DUPLICATION ===
  // Remove levels within pipScale of each other, keep highest confidence
  const seen: PriceLevel[] = [];
  for (const lvl of levels) {
    const dup = seen.find(s => Math.abs(s.price - lvl.price) < pipScale);
    if (dup) {
      if (lvl.confidence > dup.confidence) Object.assign(dup, lvl);
    } else {
      seen.push(lvl);
    }
  }
  levels.length = 0;
  levels.push(...seen);

  return { score, levels, extremeBonus };
}

/**
 * P6: Round Numbers
 * Big figure psychology: 1.0000 for FX, 100.00 for DXY.
 */
function computeP6(currentPrice: number, instrument: string, bars?: OHLCBar[]): PillarOutput {
  // Round number step: DXY rounds at 0.50/1.00, FX at 0.01
  const roundStep = instrument === 'DXY' ? DXY_ROUND_STEP : FX_ROUND_STEP;
  const halfStep = roundStep / 2;

  const roundBase = Math.floor(currentPrice / roundStep) * roundStep;

  const levels: PriceLevel[] = [];
  // Generate ±3 round numbers around current price
  for (let i = -ROUND_NUMBER_RANGE; i <= ROUND_NUMBER_RANGE; i++) {
    const level = roundBase + i * roundStep;
    if (level > 0) {
      levels.push({
        price: level,
        source: i === 0 ? 'P6-RoundNumber' : `P6-RoundNumber${i > 0 ? '+R' : '-R'}${Math.abs(i)}`,
        confidence: i === 0 ? ROUND_NUMBER_PRIMARY_CONF : ROUND_NUMBER_NEIGHBOR_CONF,
      });
    }
  }

  // Score: closeness to nearest round number
  const distToNearestRound = Math.abs(currentPrice - roundBase);
  const distToNextRound = Math.abs(currentPrice - (roundBase + roundStep));
  const minDist = Math.min(distToNearestRound, distToNextRound);
  const pctDist = minDist / roundStep;

  let score: number;
  if (pctDist < ROUND_NUMBER_CLOSE_PCT) {
    score = 2;   // Very close to a round number
  } else if (pctDist < ROUND_NUMBER_MODERATE_PCT) {
    score = 1;   // Moderately close
  } else {
    score = 0;   // Far from round numbers
  }

  // === FIBONACCI RETRACEMENT (Spec P6) ===
  // Fractal Architecture §2.4: Air density = Fibonacci trajectory prediction
  if (bars && bars.length >= 30) {
    const weekBars = bars.slice(-30); // ~5 trading days of 4H
    const wH = Math.max(...weekBars.map(b => b.high));
    const wL = Math.min(...weekBars.map(b => b.low));
    const range = wH - wL;
    if (range > 0) {
      // Retracement levels from the week high
      const retrace = [0.236, 0.382, 0.5, 0.618, 0.786];
      for (const r of retrace) {
        const price = wH - range * r;
        const pctDist = Math.abs(currentPrice - price) / currentPrice * 100;
        if (pctDist < 2.0) {
          levels.push({ price, source: `P6-Fib${(r * 100).toFixed(1)}Retrace`, confidence: 1.5 });
        }
      }
      // Extension levels
      for (const r of [1.272, 1.618]) {
        const price = wL + range * r;
        const pctDist = Math.abs(currentPrice - price) / currentPrice * 100;
        if (pctDist < 2.0) {
          levels.push({ price, source: `P6-Fib${r.toFixed(3)}Extension`, confidence: 1.5 });
        }
      }
    }
  }

  // === FIB + ROUND NUMBER CONFLUENCE ===
  // When Air (Fib) anchors to Earth (round numbers), confluence is strongest
  const fibLvls = levels.filter(l => l.source.startsWith('P6-Fib'));
  const rndLvls = levels.filter(l => l.source.startsWith('P6-Round'));
  const pipVal = instrument === 'DXY' ? 0.01 : 0.0001;
  for (const fib of fibLvls) {
    for (const rnd of rndLvls) {
      if (Math.abs(fib.price - rnd.price) < pipVal * 10) {
        levels.push({ price: (fib.price + rnd.price) / 2, source: 'P6-FibRoundConfluence', confidence: 2.0 });
        if (score < 2) score = 2;
      }
    }
  }

  return { levels, score };
}

/**
 * P7: Derivatives Arena Boundary (E1-5 FIX: NOT VWAP).
 *
 * The derivatives arena pulls Open Interest from ICE/CME futures and options.
 * These institutional positioning data reveal where large players have built
 * positions. OI concentrations act as price magnets (institutions defend their
 * positions).
 *
 * ZR-7A (the honest-data purge): when the CME/ICE data is ABSENT, the
 * ZONE-CLUSTERING arena is DELETED — the Derivatives dimension contributes
 * NOTHING (Bible 4.0 §4.9: blocked sources → "contributes nothing... degrades
 * gracefully"). VWAP was NEVER used.
 */
function computeP7(
  bars: OHLCBar[],
  currentPrice: number,
  derivativesData?: DerivativesArenaLevel[],
  instrument?: string,
): PillarOutput {
  const levels: PriceLevel[] = [];

  // ── PRIMARY: ICE/CME Derivatives OI Arena ──
  if (derivativesData && derivativesData.length > 0) {
    let score = 0;
    for (const d of derivativesData) {
      // Only include levels with significant OI (≥ $500M institutional threshold)
      if (d.notionalUSD < 500_000_000) continue;

      const weight = d.notionalUSD >= 2_000_000_000 ? 2.0 :   // Very Strong
                     d.notionalUSD >= 1_000_000_000 ? 1.5 :   // Strong
                     1.0;                                       // Moderate (500M-1B)

      levels.push({
        price: d.priceLevel,
        source: `P7-${d.source}-${d.instrument}-OI${d.openInterest}`,
        confidence: Math.min(1.0, weight / 2.0),
      });
      score = Math.max(score, weight >= 2.0 ? 2 : weight >= 1.5 ? 1.5 : 1);

      log.debug(`E1-5 FIX P7: Derivatives arena — ${d.source} ${d.instrument} OI=${d.openInterest} notional=$${(d.notionalUSD / 1e9).toFixed(2)}B at ${d.priceLevel.toFixed(5)} (${d.netPositioning})`);
    }

    if (levels.length > 0) {
      return { levels, score: Math.max(0, Math.min(2, score)), source: 'P7_REAL' };
    }
  }

  // ── ZR-7A: THE HONEST ZERO — the zone-clustering arena DELETED. When the
  //    CME/ICE data is absent, the Derivatives dimension contributes NOTHING
  //    (Bible 4.0 §4.9: blocked sources → "contributes nothing... degrades
  //    gracefully") — NEVER the price-density "arena" fabrication (the spec
  //    6.1 computeP7 AFTER; the operator's honest-data law).
  log.info('[honest-data] P7_NO_DATA — the derivatives arena is blocked — contributes nothing (Bible 4.0 §4.9: degrades gracefully)');
  return {
    levels: [],
    score: 0,
    source: 'P7_NO_DATA',
    note: 'the derivatives arena is blocked — contributes nothing (Bible 4.0 §4.9: degrades gracefully)',
  };
}

/**
 * P8: Strike→DXY Conversion (E1-5 FIX: NOT Max Pain).
 *
 * Replaces max pain estimation with EUR/USD (and other DXY component) option
 * strike-to-DXY level conversion using the full ICE DXY geometric mean formula.
 *
 * For each option strike ≥ $500M on a DXY component pair, the strike is
 * converted to its equivalent DXY level. Confidence bands represent conversion
 * uncertainty: ±0.07 (high), ±0.10 (medium), ±0.15 (low).
 */
function computeP8(
  bars: OHLCBar[],
  currentPrice: number,
  optionsData?: OptionsExpiryData,
  componentSpots?: Record<string, number>,
  _instrument?: string,
): PillarOutput {
  // E1-5 FIX P8: Strike→DXY conversion (NOT max pain)
  if (!optionsData || !optionsData.strikes || optionsData.strikes.length === 0) {
    log.debug('E1-5 FIX P8: No options strikes available for DXY conversion.');
    return { levels: [], score: 0 };
  }

  if (!componentSpots || Object.keys(componentSpots).length === 0) {
    log.debug('E1-5 FIX P8: No DXY component spot rates available for conversion.');
    return { levels: [], score: 0 };
  }

  const levels: PriceLevel[] = [];
  let score = 0;

  for (const strike of optionsData.strikes) {
    const notionalB = strike.notional; // already in billions

    // Only convert strikes ≥ $500M (institutional threshold per spec)
    if (notionalB < 0.5) continue;

    // Convert FX option strike to DXY equivalent level
    const dxyLevel = convertOptionStrikeToDXY(
      strike.strike,
      strike.pair,
      componentSpots,
    );

    if (dxyLevel === null) continue; // pair not in DXY basket (e.g. AUD/USD)

    // Confidence bands based on notional tier
    // ±0.07 (high), ±0.10 (medium), ±0.15 (low)
    let confidenceBand: number;
    let bandLabel: string;
    let confidenceVal: number;
    if (notionalB >= 1.5) {
      confidenceBand = 0.07;
      bandLabel = 'HIGH';
      confidenceVal = 1.0;
    } else if (notionalB >= 0.85) {
      confidenceBand = 0.10;
      bandLabel = 'MED';
      confidenceVal = 0.75;
    } else {
      confidenceBand = 0.15;
      bandLabel = 'LOW';
      confidenceVal = 0.5;
    }

    levels.push({
      price: dxyLevel,
      source: `P8-StrikeDXY-${strike.pair}@${strike.strike.toFixed(5)}→DXY${dxyLevel.toFixed(3)}(±${confidenceBand},${bandLabel},$${notionalB.toFixed(2)}B)`,
      confidence: confidenceVal,
    });

    // Score based on proximity of current price to the converted DXY level
    const distPct = Math.abs(currentPrice - dxyLevel) / currentPrice;
    if (distPct < 0.003 || (distPct < 0.005 && notionalB >= 1.5)) {
      score = Math.max(score, 2);
    } else if (distPct < 0.008 || notionalB >= 0.85) {
      score = Math.max(score, 1);
    }

    log.debug(`E1-5 FIX P8: ${strike.pair} strike ${strike.strike.toFixed(5)} → DXY ${dxyLevel.toFixed(3)} (±${confidenceBand} ${bandLabel}, $${notionalB.toFixed(2)}B)`);
  }

  score = Math.max(0, Math.min(2, score));
  return { levels, score };
}

/**
 * P9: Regime Dynamics
 * Uses DXY regime to score the current environment.
 * risk_on / risk_off imply directional clarity, transition/chop imply uncertainty.
 *
 * ZR-7A (the honest-data purge): when the dxyRegime is ABSENT, the Regime
 * dimension scores 0 AND the RegimeMA level is NOT emitted (the incoherent
 * half-state — score 0 + a live level — is fixed: the level must not exist
 * without the data). The honest zero, never the half-state.
 */
function computeP9(
  bars: OHLCBar[],
  currentPrice: number,
  dxyRegime?: 'risk_on' | 'risk_off' | 'transition' | 'chop',
): PillarOutput {
  // ── ZR-7A: THE HONEST ZERO — when the dxyRegime is absent, the Regime
  //    dimension scores 0 + no RegimeMA level (the honest zero — the spec
  //    6.1 computeP9 AFTER).
  if (!dxyRegime) {
    log.info('[honest-data] P9_NO_DATA — the regime data is absent — the Regime dimension scores 0 + no RegimeMA level (the honest zero)');
    return {
      levels: [],
      score: 0,
      source: 'P9_NO_DATA',
      note: 'the regime data is absent — the Regime dimension scores 0 + no RegimeMA level (the honest zero)',
    };
  }

  // Short-term trend as additional signal
  const recent = bars.slice(-P9_SHORT_TREND_LOOKBACK);
  const trendDirection = recent.length >= P9_MIN_TREND_BARS
    ? (recent[recent.length - 1].close > recent[0].close ? 1 : -1)
    : 0;

  const levels: PriceLevel[] = [];

  // Level: the 200-period moving average acts as regime filter level
  const closes = bars.map((b: OHLCBar) => b.close);
  const sma200 = computeSMA(closes, REGIME_SMA_PERIOD);
  if (sma200 > 0) {
    levels.push({ price: sma200, source: 'P9-RegimeMA', confidence: REGIME_MA_CONFIDENCE });
  }

  // Score based on regime clarity
  let score: number;
  if (dxyRegime === 'chop') {
    score = 0;  // No clear regime or choppy
  } else if (dxyRegime === 'transition') {
    score = 1;  // Transitioning — some clarity but not full
  } else {
    // risk_on or risk_off — check alignment with trend
    if ((dxyRegime === 'risk_on' && trendDirection > 0) ||
        (dxyRegime === 'risk_off' && trendDirection < 0)) {
      score = 2;  // Regime aligns with trend
    } else {
      score = 1;  // Regime active but not aligned with short-term trend
    }
  }

  // === VOLATILITY EXPANSION (Spec P9) ===
  // Conservation of Energy: after high-energy output, system MUST recover
  if (bars.length >= 40) {
    // Inline ATR computation (computeATR does NOT exist in v3.1)
    const computeATRInline = (b: OHLCBar[]): number => {
      if (b.length < 2) return 0;
      let trSum = 0;
      for (let i = 1; i < b.length; i++) {
        const tr = Math.max(
          b[i].high - b[i].low,
          Math.abs(b[i].high - b[i - 1].close),
          Math.abs(b[i].low - b[i - 1].close),
        );
        trSum += tr;
      }
      return trSum / (b.length - 1);
    };
    const recentATR = computeATRInline(bars.slice(-20));
    const olderATR = computeATRInline(bars.slice(-40, -20));
    if (recentATR > 0 && olderATR > 0) {
      const volExpansion = recentATR / olderATR;
      // NOTE: v3.1 computeP9 has `trendDirection` (1 or -1), NOT `momentum`
      if (volExpansion > 1.5 && trendDirection !== 0) {
        // Breakout regime: project 61.8% of 20-bar range in trend direction
        const range20 = Math.max(...bars.slice(-20).map(b => b.high)) - Math.min(...bars.slice(-20).map(b => b.low));
        levels.push({
          price: currentPrice + trendDirection * range20 * 0.618,
          source: 'P9-BreakoutProjection',
          confidence: 1,
        });
      }
      if (volExpansion < 0.8 && trendDirection === 0) {
        // Compressed: chop override
        if (score > 1) score = 1;
      }
    }
  }

  return { levels, score, source: 'P9_REAL' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate 4H bars into daily bars (6 bars per day for 24/5 markets).
 */
function aggregateToDaily(bars4h: OHLCBar[]): OHLCBar[] {
  if (bars4h.length === 0) return [];
  const daily: OHLCBar[] = [];
  for (let i = 0; i < bars4h.length; i += BARS_PER_DAY_4H) {
    const group = bars4h.slice(i, i + BARS_PER_DAY_4H);
    if (group.length === 0) continue;
    daily.push({
      timestamp: group[0].timestamp,
      open: group[0].open,
      high: Math.max(...group.map((b: OHLCBar) => b.high)),
      low: Math.min(...group.map((b: OHLCBar) => b.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum: number, b: OHLCBar) => sum + b.volume, 0),
    });
  }
  return daily;
}

/**
 * Compute Exponential Moving Average.
 */
function computeEMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  const k = 2 / (period + 1);
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Compute Simple Moving Average.
 */
function computeSMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a: number, b: number) => a + b, 0) / period;
}

/**
 * Find swing highs and lows in OHLC data.
 * A swing high is a bar whose high exceeds neighbors on both sides.
 */
function findSwingHighsLows(
  bars: OHLCBar[],
  lookback: number,
): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = lookback; i < bars.length - lookback; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (bars[i].high <= bars[i - j].high || bars[i].high <= bars[i + j].high) {
        isHigh = false;
      }
      if (bars[i].low >= bars[i - j].low || bars[i].low >= bars[i + j].low) {
        isLow = false;
      }
    }
    if (isHigh) highs.push(bars[i].high);
    if (isLow) lows.push(bars[i].low);
  }

  return {
    highs: [...new Set(highs)].slice(-SWING_RESULTS_LIMIT),
    lows: [...new Set(lows)].slice(-SWING_RESULTS_LIMIT),
  };
}

/**
 * Create a price histogram: divide the price range into `bucketCount` equal
 * buckets, count how many bars fall into each bucket by closing price.
 * Returns a Map of bucketMidPrice → count.
 */
function createPriceHistogram(
  bars: OHLCBar[],
  bucketCount: number,
): Map<number, number> {
  if (bars.length === 0) return new Map();

  const prices = bars.map((b: OHLCBar) => b.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice;

  if (range === 0) return new Map();

  const bucketWidth = range / bucketCount;
  const histogram = new Map<number, number>();

  for (const bar of bars) {
    const idx = Math.min(bucketCount - 1, Math.floor((bar.close - minPrice) / bucketWidth));
    const midPrice = minPrice + (idx + HISTOGRAM_MIDPRICE_OFFSET) * bucketWidth;
    histogram.set(midPrice, (histogram.get(midPrice) ?? 0) + 1);
  }

  return histogram;
}

/**
 * Compute the slope of a linear regression over an array of values.
 * Returns the slope coefficient (change per step).
 */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const indices = Array.from({ length: n }, (_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a: number, b: number) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = values[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  return den > 0 ? num / den : 0;
}
