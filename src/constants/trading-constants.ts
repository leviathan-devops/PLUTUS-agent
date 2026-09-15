/**
 * PLUTUS TRADING CONSTANTS — Single Source of Truth
 *
 * Every numeric literal used across the trading engine is defined here.
 * Source files import from this module instead of hardcoding values.
 *
 * Organized by domain category. Each constant has a descriptive name
 * and is grouped under a section header.
 *
 * ═══════════════════════════════════════════════════════════════
 * INDEX
 *   1. Fibonacci Levels
 *   2. Camarilla Pivot Constants
 *   3. Pip Values
 *   4. Risk Limits
 *   5. Zone Construction
 *   6. Pillar Thresholds
 *   7. Session Hours (ET / UTC)
 *   8. Firewall Thresholds
 *   9. Confidence Values
 *  10. Distance / Proximity Thresholds
 *  11. EMA / SMA Periods
 *  12. Bar Counts / Lookback Windows
 *  13. HP Filter Constants
 *  14. DXY Formula Constants
 *  15. Options OI Score Tiers
 *  16. Confidence Formula Weights
 *  17. Confidence Tier Thresholds
 *  18. Minimum Confidence by Category
 *  19. Tick Intervals / Gate Timeouts
 *  20. TimesFM Config
 *  21. VLM Verification Limits
 *  22. Stop-Limit Order Parameters
 *  23. Presentation / Rounding
 *  24. Score Values / Multipliers
 *  25. Round Number / Structural
 *  26. Convergence / Tolerance
 *  27. Firewall — Zero-Tolerance & Extended Rules
 *  28. Report Generator — Formatting & Display
 *  29. Pine Script Generator — v6 Constants
 *  30. PDF Generator — Subprocess & HTML Constants
 *  31. Backtest Harness — Replay Backtest Constants
 *  32. Tools — MCP Tool Constants
 *  33. Pipeline Runner — Report Generation & Pine Script Constants
 *  34. Object Constants — Brain / Zone / Reinforcement Config Groups
 *  35. TimesFM Client
 *  36. Investinglive Client
 *  37. VLM Extraction
 *  38. Risk Engine
 *  39. Engine 3 v8 — Entry / SL / RRR / Confidence / Shape Constants
 * ═══════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════
// 1. FIBONACCI LEVELS
// ═══════════════════════════════════════════════════════════════

export const FIB_RATIO_382 = 0.382;
export const FIB_RATIO_500 = 0.5;
export const FIB_RATIO_618 = 0.618;
export const FIB_RATIO_786 = 0.786;
export const FIB_RATIO_1000 = 1.0;
export const FIB_EXT_1272 = 1.272;
export const FIB_EXT_1382 = 1.382;
export const FIB_EXT_1618 = 1.618;

// ═══════════════════════════════════════════════════════════════
// 2. CAMARILLA PIVOT CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const CAMARILLA_MULTIPLIER = 1.1;
export const CAMARILLA_DIV_R1_S1 = 12;
export const CAMARILLA_DIV_R2_S2 = 6;
export const CAMARILLA_DIV_R3_S3 = 4;

// ═══════════════════════════════════════════════════════════════
// 3. PIP VALUES
// ═══════════════════════════════════════════════════════════════

export const PIP_VALUE_DXY = 0.01;
export const PIP_VALUE_FX_4DEC = 0.0001;
export const PIP_VALUE_DEFAULT = 0.0001;

// ═══════════════════════════════════════════════════════════════
// 4. RISK LIMITS
// ═══════════════════════════════════════════════════════════════

export const SL_CAP_PIPS = 150;
export const MAX_ACCOUNT_RISK_PCT = 2.0;
export const MAX_DAILY_DRAWDOWN_PCT = 5;
export const MAX_RISK_PER_PAIR_PCT = 3;
export const MAX_SPREAD_TO_TP_PCT = 20;
export const MAX_RISK_PER_TRADE_PCT = 1;
export const SL_BUFFER_PIPS = 15;
export const NEAR_ZONE_PIP_TOLERANCE = 20;
export const SNIPER_ENTRY_MAX_EDGE_DISTANCE_PIPS = 10;
export const MAX_CORRELATED_SETUPS = 5;
export const MIN_ENTRY_GAP_MINUTES = 15;
export const MIN_TIMEFRAMES_REFERENCED = 2;
export const MIN_REINFORCEMENT_ENTRIES = 2;
export const POST_STOPOUT_COOLDOWN_HOURS = 1;

// ═══════════════════════════════════════════════════════════════
// 5. ZONE CONSTRUCTION
// ═══════════════════════════════════════════════════════════════

export const MIN_CONFLUENCE_BOM = 3;
export const MIN_CONFLUENCE_MOM = 4;
export const MIN_IL_CONFLUENCE = 6;
export const MAX_SETUPS_PER_CATEGORY_PER_PAIR = 3;
export const REQUIRED_DIRECTION_CHECKS = 6;
export const DIRECTION_VAL_MIN_CONFLUENCE = 3;
export const DIRECTION_VAL_RRR_PASS = 2;
// Operator ruling (2026-08-04, SUPERSEDING the 2026-07-31 "MINIMUM 3 RRR"):
//   "anything that is 2.5 RR or above is valid as long as it is high
//    probability. However the TARGET is always 4R+ i dont want the machine
//    optimizing everything for low R just to pass the filter and leaving
//    money on the table."
// Construction requires >= 2.5 RRR — the flat doctrine floor.
export const MIN_RRR_CONSTRUCTION = 2.5;
export const MAX_SETUPS_TOTAL_PER_TICK = 3;

// Trade Flow Continuity (TTE v5.3.3 Section 7.4)
// A trade chain links setups whose entry is the TP of the prior trade.
// Direction flips at each zone boundary. After 3 trades, reassess macro.
export const MAX_TRADES_PER_CHAIN = 3;
export const CHAIN_ENTRY_TOLERANCE_PCT = 0.001; // 0.1% — entry must be within this of prior TP
export const CHAIN_MIN_RRR_SUPPLEMENTARY = 2.5;  // supplementary (chained) setups need >= 2.5x RRR — the flat 2026-08-04 doctrine

// ── RRR minimums by category — SINGLE SOURCE OF TRUTH ─────────────────────
// Generator, pipeline, and semantic firewall ALL resolve RRR minimums via
// rrrForCategory(). Never hardcode per-category RRR values in consumers.
//
//   tp1     — minimum RRR to the primary target (setup.rrr / rrrTp1 checks)
//   blended — minimum blended RRR across all targets (pipeline blended checks)
//
// Keys are canonical UPPER_SNAKE category identifiers. rrrForCategory()
// normalizes any representation: SetupCategory enum values ('HTF Swing'),
// abbreviated constant keys ('HTF', 'SCALP', 'BS', 'REINF', 'TRANS'),
// and case/separator variants all resolve to the canonical entry.
export interface RrrMinimums {
  tp1: number;
  blended: number;
}

// OPERATOR RULING (2026-08-04) — the flat floor is 2.5, SUPERSEDING the
// 2026-07-31 "MINIMUM 3 RRR" ruling:
//   "anything that is 2.5 RR or above is valid as long as it is high
//    probability. However the TARGET is always 4R+ i dont want the machine
//    optimizing everything for low R just to pass the filter and leaving
//    money on the table."
// Every category's tp1 AND blended floor is therefore 2.5 — a setup below
// 2.5 RRR is not tradeable. The 4R+ TARGET drives the quality (the machine's
// refinement RRR_TARGET stays 4.0 — the floor admits valid geometry, the
// target keeps the machine from optimizing for low R just to pass).
export const RRR_BY_CATEGORY: Record<string, RrrMinimums> = {
  HTF_SWING:      { tp1: 2.5, blended: 2.5 },
  SWING_SCALP:    { tp1: 2.5, blended: 2.5 },
  BREAKOUT_SURGE: { tp1: 2.5, blended: 2.5 },
  REINFORCEMENT:  { tp1: 2.5, blended: 2.5 },
  TRANSITION:     { tp1: 2.5, blended: 2.5 },
  WHIPLASH:       { tp1: 2.5, blended: 2.5 },
};

/**
 * Fallback RRR minimums for unrecognized categories (conservative default).
 * Operator ruling (2026-08-04): the flat floor is 2.5 — the same doctrine as
 * RRR_BY_CATEGORY (the 2026-07-31 3.0 ruling is superseded).
 */
export const DEFAULT_RRR_MINIMUMS: RrrMinimums = { tp1: 2.5, blended: 2.5 };

/** Abbreviated / legacy constant keys → canonical RRR_BY_CATEGORY key. */
const RRR_CATEGORY_ALIASES: Record<string, string> = {
  HTF: 'HTF_SWING',
  SCALP: 'SWING_SCALP',
  BS: 'BREAKOUT_SURGE',
  REINF: 'REINFORCEMENT',
  TRANS: 'TRANSITION',
  WL: 'WHIPLASH',
};

/**
 * Resolve the unified RRR minimums for a setup category.
 * Accepts SetupCategory enum values ('HTF Swing'), canonical keys
 * ('HTF_SWING'), abbreviated constant keys ('HTF', 'SCALP', ...), and
 * case/separator variants ('htf-swing'). Unknown categories receive
 * DEFAULT_RRR_MINIMUMS. Treat the returned object as read-only.
 */
export function rrrForCategory(category: string): RrrMinimums {
  const normalized = category.trim().toUpperCase().replace(/[\s-]+/g, '_');
  const canonical = RRR_CATEGORY_ALIASES[normalized] ?? normalized;
  return RRR_BY_CATEGORY[canonical] ?? DEFAULT_RRR_MINIMUMS;
}

// Legacy per-category scalars — DERIVED from RRR_BY_CATEGORY. Do not edit
// these directly; change RRR_BY_CATEGORY above and these follow.
export const MIN_RRR_HTF_SWING = RRR_BY_CATEGORY.HTF_SWING.tp1;
export const MIN_RRR_SWING_SCALP = RRR_BY_CATEGORY.SWING_SCALP.tp1;
export const MIN_RRR_BREAKOUT_SURGE = RRR_BY_CATEGORY.BREAKOUT_SURGE.tp1;
export const MIN_RRR_REINFORCEMENT = RRR_BY_CATEGORY.REINFORCEMENT.tp1;
export const MIN_RRR_TRANSITION = RRR_BY_CATEGORY.TRANSITION.tp1;
export const MIN_RRR_WHIPLASH = RRR_BY_CATEGORY.WHIPLASH.tp1;

// ATR guardrails
export const MIN_TP_ATR_MULTIPLE = 0.5;
export const MAX_SL_ATR_MULTIPLE = 2;
export const LOW_PROB_PTP_THRESHOLD = 0.4;
export const MIN_RRR_FOR_LOW_PROB = 3.0;

// ═══════════════════════════════════════════════════════════════
// 6. PILLAR THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const DOMINANT_PILLAR_THRESHOLD = 1.5;
export const PILLAR_SCORE_MAX = 2;
export const PILLAR_CRITICAL_NOTIONAL_B = 1.5;
export const PILLAR_SIGNIFICANT_NOTIONAL_B = 0.85;
export const OPTION_CRITICAL_NOTIONAL_B = 1.5;
export const OPTION_SIGNIFICANT_NOTIONAL_B = 0.85;
export const P1_RECENT_DAYS = 5;
export const P1_TREND_BONUS_PIPS = 30;
export const PIVOT_LEVELS_PER_SET = 7;
export const LEGACY_CONFIDENCE_BONUS = 0.5;
export const LEGACY_LEVEL_TOLERANCE_PIPS = 5;
export const CURRENT_RANGE_BUFFER_PCT = 0.005;
export const P3_CLUSTER_PROXIMITY_PCT = 0.003;
export const P3_PROXY_LOOKBACK = 30;
export const P3_HISTOGRAM_BUCKETS = 8;
export const P3_TOP_BUCKETS = 2;
export const P5_MAX_LOOKBACK = 500;
export const P5_MIN_LOOKBACK = 5;
export const P5_FALLBACK_MIN_BARS = 40;
export const P5_FALLBACK_SLICE = 40;
export const P5_EXTREME_PROXIMITY_PCT = 0.005;
export const P5_MODERATE_PROXIMITY_PCT = 0.01;
export const P5_EXTREME_CONFIDENCE = 2;
export const EXTREME_BONUS_LONG_BARS = 500;
export const EXTREME_BONUS_MED_BARS = 250;
export const NORMAL_STRENGTH_BARS = 60;
export const STRENGTH_LONG = 3;
export const STRENGTH_MED = 2;
export const EXTREME_STRENGTH_MIN = 2;
export const P7_MIN_BARS = 5;
export const P8_PROXY_LOOKBACK = 40;
export const P8_PROXY_HISTOGRAM_BUCKETS = 12;
export const P9_SHORT_TREND_LOOKBACK = 5;
export const P9_MIN_TREND_BARS = 3;
export const MAX_WEB_LEVELS = 3;
export const SWING_BOUNDARY_OFFSET = 2;
export const SWING_CONFIRMATION_BARS = 2;
export const SWING_RESULTS_LIMIT = 8;
export const RECAPTURE_MIN_DAILY = 4;
export const RECAPTURE_LOOKBACK_SESSIONS = 3;
export const RECAPTURE_BONUS = 2;
export const RECAPTURE_CONFIDENCE = 0.85;
export const HIST_PIVOT_MIN_DAILY = 50;
export const HISTORICAL_PIVOT_START_IDX = 42;
export const HISTORICAL_PIVOT_END_IDX = 88;
export const MAXPAIN_MAX_CONFIDENCE = 0.95;
export const MAXPAIN_BASE_CONFIDENCE = 0.5;
export const MAXPAIN_NOTIONAL_CAP = 0.45;
export const MAXPAIN_NOTIONAL_SCALE = 0.05;
export const MAXPAIN_CLOSE_PCT = 0.002;
export const MAXPAIN_CLOSE_NOTIONAL_PCT = 0.004;
export const MAXPAIN_MODERATE_PCT = 0.005;
export const STRONG_NOTIONAL_STRENGTH = 0.5;
export const WEAK_NOTIONAL_STRENGTH = 0.3;
export const SECONDARY_BUCKET_DENSITY = 0.7;
export const NOTIONAL_NORMALIZATION_B = 10;
export const P8_PROXY_CLOSE_PCT = 0.002;
export const P8_PROXY_MODERATE_PCT = 0.005;
export const P8_DENSITY_STRONG = 0.2;
export const P8_DENSITY_MODERATE = 0.15;
export const P8_PROXY_CONFIDENCE = 0.7;
export const P8_SECONDARY_CONFIDENCE = 0.5;
export const OPTION_CRITICAL_CONFIDENCE = 0.95;
export const OPTION_SIGNIFICANT_CONFIDENCE = 0.8;
export const GAMMA_PROXY_BASE_CONFIDENCE = 0.5;
export const GAMMA_PROXY_STEP = 0.2;
export const VWAP_CONFIDENCE = 0.85;
export const VWAP_SIGMA_CONFIDENCE = 0.5;
export const VWAP_CLOSE_PCT = 0.002;
export const VWAP_MODERATE_PCT = 0.005;
export const REGIME_MA_CONFIDENCE = 0.6;
export const ROUND_NUMBER_PRIMARY_CONF = 0.9;
export const ROUND_NUMBER_NEIGHBOR_CONF = 0.7;
export const ROUND_NUMBER_CLOSE_PCT = 0.1;
export const ROUND_NUMBER_MODERATE_PCT = 0.25;
export const ROUND_NUMBER_RANGE = 3;
export const DXY_ROUND_STEP = 1.0;
export const FX_ROUND_STEP = 0.01;

// ═══════════════════════════════════════════════════════════════
// 7. SESSION HOURS (ET / UTC)
// ═══════════════════════════════════════════════════════════════

export const ET_UTC_OFFSET = 4;
export const HOURS_PER_DAY = 24;
export const LONDON_OPEN_START_ET = 2;
export const LONDON_OPEN_END_ET = 5;
export const LONDON_MID_END_ET = 8;
export const NY_OVERLAP_END_ET = 10;
export const NY_MID_END_ET = 14;
export const NY_CLOSE_END_ET = 17;
export const LONDON_HALF_DAY_UTC = 11;
export const NY_OVERLAP_MID_BOUNDARY_ET = 10;
export const NY_MID_CLOSE_BOUNDARY_ET = 14;
export const RED_FOLDER_DEFERRAL_MIN = 30;
export const ILLIQUID_HOURS_START_ET = 3;
export const ILLIQUID_HOURS_END_ET = 6;

// ═══════════════════════════════════════════════════════════════
// 8. FIREWALL THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_SPREAD_PIPS = 1.5;
export const MIN_P_TP_REACH = 0.45;

// Entry distance limits (pips from spot) — per instrument
export const ENTRY_DISTANCE_DXY_SWING_SCALP = 500;
export const ENTRY_DISTANCE_DXY_HTF_SWING = 500;
export const ENTRY_DISTANCE_DXY_BREAKOUT_SURGE = 500;
export const ENTRY_DISTANCE_EURUSD_SWING_SCALP = 500;
export const ENTRY_DISTANCE_EURUSD_HTF_SWING = 500;
export const ENTRY_DISTANCE_EURUSD_BREAKOUT_SURGE = 500;
export const ENTRY_DISTANCE_GBPUSD_SWING_SCALP = 500;
export const ENTRY_DISTANCE_GBPUSD_HTF_SWING = 500;
export const ENTRY_DISTANCE_GBPUSD_BREAKOUT_SURGE = 500;
export const ENTRY_DISTANCE_AUDUSD_SWING_SCALP = 500;
export const ENTRY_DISTANCE_AUDUSD_HTF_SWING = 500;
export const ENTRY_DISTANCE_AUDUSD_BREAKOUT_SURGE = 500;

// Spread costs per pair (pips)
export const SPREAD_DXY = 0.5;
export const SPREAD_EURUSD = 1.2;
export const SPREAD_GBPUSD = 1.8;
export const SPREAD_AUDUSD = 1.5;

// ═══════════════════════════════════════════════════════════════
// 9. CONFIDENCE VALUES
// ═══════════════════════════════════════════════════════════════

export const PP_BASE_CONFIDENCE = 0.6;
export const R1_S1_BASE_CONFIDENCE = 0.9;
export const R2_S2_BASE_CONFIDENCE = 0.8;
export const R3_S3_BASE_CONFIDENCE = 0.7;
export const DEFAULT_CONFIDENCE = 0.5;
export const EMA20_CONFIDENCE = 0.8;
export const EMA50_CONFIDENCE = 0.7;
export const EMA200_CONFIDENCE = 0.6;
export const TV_CONFIRMATION_BOOST = 0.15;
export const WEB_LEVEL_CONFIDENCE = 0.85;
export const ANALYST_HWC_CONFIDENCE = 0.9;
export const ANALYST_LWC_CONFIDENCE = 0.9;
export const HP_TREND_STRONG_CONFIDENCE = 2;
export const TRANSLATION_CONF_STRONG = 0.7;
export const TRANSLATION_CONF_WEAK = 0.3;
export const AVATAR_MIN_CONFIDENCE = 95;
export const DXY_BOOST_STRONG = 5;
export const DXY_PENALTY_WEAK = 10;

// ═══════════════════════════════════════════════════════════════
// 10. DISTANCE / PROXIMITY THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const PROXIMITY_HIGH_PIPS = 10;
export const PROXIMITY_MED_PIPS = 25;
export const PROXIMITY_CLOSE_PCT = 0.005;
export const PROXIMITY_MODERATE_PCT = 0.02;
export const EMA_PROXIMITY_PCT = 0.005;
export const TV_CROSS_VALIDATION_TOLERANCE = 0.002;
export const FIB_TOLERANCE = 0.002;
export const TREND_SLOPE_LOOKBACK_FACTOR = 0.8;
export const CYCLE_EXTREME_ZSCORE = 2;
export const CYCLE_REVERSION_FACTOR = 0.5;

// ═══════════════════════════════════════════════════════════════
// 11. EMA / SMA PERIODS
// ═══════════════════════════════════════════════════════════════

export const EMA_SHORT_PERIOD = 20;
export const EMA_MID_PERIOD = 50;
export const EMA_LONG_PERIOD = 200;
export const REGIME_SMA_PERIOD = 200;

// ═══════════════════════════════════════════════════════════════
// 12. BAR COUNTS / LOOKBACK WINDOWS
// ═══════════════════════════════════════════════════════════════

export const ENGINE_MIN_BARS = 30;
export const PREV_DAY_OFFSET = 2;
export const BARS_PER_DAY_4H = 6;

// ═══════════════════════════════════════════════════════════════
// 13. HP FILTER CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const HP_LAMBDA_4H = 1600;
export const HP_LAMBDA_DAILY = 14400;
export const HP_DAILY_BAR_THRESHOLD = 100;
export const HP_MAX_ITERATIONS = 100;
export const HP_CONVERGENCE_THRESHOLD = 0.0001;
export const HP_MIN_DATA_POINTS = 4;

// ═══════════════════════════════════════════════════════════════
// 14. DXY FORMULA CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const DXY_BASE = 50.14348112;
export const DXY_WEIGHT_EUR_USD = -0.576;
export const DXY_WEIGHT_USD_JPY = 0.136;
export const DXY_WEIGHT_GBP_USD = -0.119;
export const DXY_WEIGHT_USD_CAD = 0.091;
export const DXY_WEIGHT_USD_SEK = 0.042;
export const DXY_WEIGHT_USD_CHF = 0.036;

// ═══════════════════════════════════════════════════════════════
// 15. OPTIONS OI SCORE TIERS
// ═══════════════════════════════════════════════════════════════

export const OI_NOTIONAL_CRITICAL = 3.0;
export const OI_NOTIONAL_MAGNET = 1.5;
export const OI_NOTIONAL_MODERATE = 0.85;
export const OI_NOTIONAL_LIGHT = 0.4;
export const OI_SCORE_MAX = 20;
export const OI_SCORE_MAGNET = 15;
export const OI_SCORE_MODERATE = 10;
export const OI_SCORE_LIGHT = 5;
export const OI_SCORE_MIN = 2;

// ═══════════════════════════════════════════════════════════════
// 16. CONFIDENCE FORMULA WEIGHTS
// ═══════════════════════════════════════════════════════════════

export const CONF_MAX_CONFLUENCE = 14;
export const BASE_SCORE_MAX = 40;
export const OPTION_SCORE_MAX = 20;
export const SHAPE_SCORE = 20;
export const REDFOLDER_PENALTY = -10;
export const ZFP_SCORE_MAX = 10;
export const ZFP_PCT_DENOMINATOR = 100;
export const BOM_BONUS = 10;
export const MOM_PENALTY = -10;
export const DXY_SCORE = 10;
export const FIB_SCORE_PER_HIT = 3;
export const FIB_SCORE_MAX = 10;
export const SESSION_SCORE = 5;
export const CONFIDENCE_CEILING = 100;

// ═══════════════════════════════════════════════════════════════
// 17. CONFIDENCE TIER THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const TIER_S_MIN = 90;
export const TIER_A_MIN = 80;
export const TIER_B_MIN = 70;
export const TIER_C_MIN = 60;
export const TIER_D_MIN = 50;

// ═══════════════════════════════════════════════════════════════
// 18. MINIMUM CONFIDENCE BY CATEGORY
// ═══════════════════════════════════════════════════════════════

export const MIN_CONF_HTF_SWING = 65;
export const MIN_CONF_SWING_SCALP = 55;
export const MIN_CONF_REINFORCEMENT = 50;
export const MIN_CONF_BREAKOUT_SURGE = 60;
export const MIN_CONF_TRANSITION = 55;
export const MIN_CONF_DEFAULT = 55;

// ═══════════════════════════════════════════════════════════════
// 19. TICK INTERVALS / GATE TIMEOUTS
// ═══════════════════════════════════════════════════════════════

export const TV_MCD_CDP_PORT = 9222;
export const BRAIN_TICK_MS = 200;
export const ZONE_BRAIN_TICK_MS = 200;
export const SHAPE_BRAIN_TICK_MS = 200;
export const TRADE_BRAIN_TICK_MS = 200;
export const SYSTEM_BRAIN_TICK_MS = 500;

export const GATE_TIMEOUT_ANALYZE_MS = 60_000;
export const GATE_TIMEOUT_VERIFY_ZONES_MS = 30_000;
export const GATE_TIMEOUT_PREDICT_MS = 60_000;
export const GATE_TIMEOUT_SCORE_MS = 30_000;
export const GATE_TIMEOUT_VALIDATE_MS = 15_000;
export const GATE_TIMEOUT_EXECUTE_MS = 120_000;
export const GATE_TIMEOUT_AUDIT_MS = 15_000;
export const GATE_TIMEOUT_TIMEOUT_MS = 5_000;

// ═══════════════════════════════════════════════════════════════
// 20. TIMESFM CONFIG
// ═══════════════════════════════════════════════════════════════

export const TIMESFM_MAX_CONTEXT = 1024;
export const TIMESFM_MIN_OHLC_BARS = 30;
export const TIMESFM_FORECAST_HORIZON = 60;
export const OHLC_HISTORY_BARS = 1024;

// TimesFM horizons per setup category
export const TIMESFM_HORIZON_HTF_SWING = 60;
export const TIMESFM_HORIZON_SWING_SCALP = 18;
export const TIMESFM_HORIZON_BREAKOUT_SURGE = 30;
export const TIMESFM_HORIZON_REINFORCEMENT = 18;
export const TIMESFM_HORIZON_TRANSITION = 30;

// ═══════════════════════════════════════════════════════════════
// 20b. KRONOS CONFIG
// ═══════════════════════════════════════════════════════════════

export const KRONOS_SIDECAR_URL = 'http://localhost:7090';
export const KRONOS_REQUEST_TIMEOUT_MS = 90_000;
export const KRONOS_HEALTH_CHECK_TIMEOUT_MS = 5_000;
export const KRONOS_DEFAULT_HORIZON = 24;
export const KRONOS_DEFAULT_SAMPLE_COUNT = 5;
export const KRONOS_CONTEXT_BARS = 100;
export const KRONOS_TEMPERATURE = 0.8;
export const KRONOS_TOP_P = 0.85;
export const KRONOS_CLIP = 3.0;

export const KRONOS_ENABLED_PAIRS = [
  'EUR/USD', 'GBP/USD', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'BTC/USD', 'ETH/USD',
];
export const KRONOS_DISABLED_PAIRS = [
  'USD/JPY', 'NZD/USD', 'GBP/JPY', 'SOL/USD', 'DXY',
];

// ═══════════════════════════════════════════════════════════════
// 20c. DUAL-BRAIN CONFIG
// ═══════════════════════════════════════════════════════════════

export const DUAL_BRAIN_AGREEMENT_BONUS_TRIPLE = 15;
export const DUAL_BRAIN_AGREEMENT_BONUS_DUAL = 5;
export const DUAL_BRAIN_AGREEMENT_BONUS_SINGLE = 10;
export const DUAL_BRAIN_AGREEMENT_PENALTY_DISAGREE = -20;
export const DUAL_BRAIN_AGREEMENT_PENALTY_DUAL_M = -10;

export const DUAL_BRAIN_GRADE_ENTRY_TRIGGER_FLOOR = 0.40;
export const DUAL_BRAIN_GRADE_SL_SWEEP_CEILING = 0.35;
export const DUAL_BRAIN_GRADE_SL_SWEEP_REJECT = 0.50;
export const DUAL_BRAIN_GRADE_TP_REACH_FLOOR = 0.40;

export const DUAL_BRAIN_SIZE_A_PLUS = 1.0;
export const DUAL_BRAIN_SIZE_A = 1.0;
export const DUAL_BRAIN_SIZE_B_PLUS = 0.90;
export const DUAL_BRAIN_SIZE_B = 0.85;
export const DUAL_BRAIN_SIZE_C_PLUS = 0.75;
export const DUAL_BRAIN_SIZE_C = 0.65;
export const DUAL_BRAIN_SIZE_D = 0.50;
export const DUAL_BRAIN_SIZE_F = 0.0;

export const CONVICTION_DEFAULT_MODE = 'high';

// ═══════════════════════════════════════════════════════════════
// 21. VLM VERIFICATION LIMITS
// ═══════════════════════════════════════════════════════════════

export const VLM_VERIFY_PER_TICK = 2;
export const VLM_LOG_SUBSTRING_REJECT = 120;
export const VLM_LOG_SUBSTRING_VERIFY = 80;
export const VLM_CACHE_MAX_SIZE = 200;

// ═══════════════════════════════════════════════════════════════
// 22. STOP-LIMIT ORDER PARAMETERS
// ═══════════════════════════════════════════════════════════════

export const STOP_LIMIT_ZONE_LOOKAHEAD = 2;
export const STOP_LIMIT_BUFFER_DXY = 1;
export const STOP_LIMIT_BUFFER_FX = 2;
export const STOP_LIMIT_SL_BUFFER_DXY = 1;
export const STOP_LIMIT_SL_BUFFER_FX = 2;
export const STOP_LIMIT_SIZE_OFFSET = 2;

// ═══════════════════════════════════════════════════════════════
// 23. PRESENTATION / ROUNDING
// ═══════════════════════════════════════════════════════════════

export const PCT_MULTIPLIER = 100;
export const RRR_ROUND_PRECISION = 100;
export const SL_PIPS_ROUND_PRECISION = 10;
export const AVG_CONF_DISPLAY_PRECISION = 2;

// ═══════════════════════════════════════════════════════════════
// 24. SCORE VALUES / MULTIPLIERS
// ═══════════════════════════════════════════════════════════════

export const HISTOGRAM_MIDPRICE_OFFSET = 0.5;

// ═══════════════════════════════════════════════════════════════
// 25. ROUND NUMBER / STRUCTURAL
// ═══════════════════════════════════════════════════════════════

// (See Section 6 for round-number thresholds)

// ═══════════════════════════════════════════════════════════════
// 26. CONVERGENCE / TOLERANCE
// ═══════════════════════════════════════════════════════════════

export const PIVOT_EPSILON = 1e-9;

// ═══════════════════════════════════════════════════════════════
// 27. FIREWALL — Zero-Tolerance & Extended Rules
// ═══════════════════════════════════════════════════════════════

/** Minutes per hour (time conversion) */
export const MINUTES_PER_HOUR = 60;
/** NFP/FOMC news exclusion window (minutes before and after) */
export const NEWS_EXCLUSION_MIN = 30;
/** Max spread-to-TP ratio (fraction, not percentage) */
export const MAX_SPREAD_TP_RATIO = 0.2;
/** Minutes in a day — used for overnight wrap in time calculations */
export const MINUTES_PER_DAY = 1440;
/** Revenge trading cooldown (minutes after stop-out) */
export const REVENGE_COOLDOWN_MIN = 60;
/** Illiquid hours start (HH:MM ET string) */
export const ILLIQUID_START_ET_STR = '03:00';
/** Illiquid hours end (HH:MM ET string) */
export const ILLIQUID_END_ET_STR = '06:00';
/** SL pips threshold for "large SL" warning in RRR checks */
export const LARGE_SL_WARNING_PIPS = 100;
/** Display precision: 1 decimal place */
export const TO_FIXED_1 = 1;
/** Display precision: 2 decimal places */
export const TO_FIXED_2 = 2;

// ── Fib Spiderweb ──
/** Fibonacci ratio 0.236 */
export const FIB_RATIO_236 = 0.236;
/** Extended Fibonacci level 1.786 */
export const FIB_EXT_1786 = 1.786;
/** Extended Fibonacci level 2.382 */
export const FIB_EXT_2382 = 2.382;
/** Extended Fibonacci level 2.618 */
export const FIB_EXT_2618 = 2.618;
/** Extended Fibonacci level 2.786 */
export const FIB_EXT_2786 = 2.786;
/** Full Fibonacci level set including extensions */
export const FIB_LEVELS_FULL = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.382, 1.618, 1.786, 2.382, 2.618, 2.786] as const;
/** Fibonacci entry confluence levels for TS-7 check */
export const FIB_ENTRY_LEVELS = [0.236, 0.382, 0.5, 0.618, 0.786] as const;
/** Max distance in pips for fib levels to be considered clustered */
export const FIB_CLUSTER_RADIUS_PIPS = 15;
/** Minimum fib confluence count for confirmed status */
export const MIN_FIB_CONFLUENCE = 2;
/** Minimum distinct contexts for spiderweb confirmation */
export const MIN_SPIDERWEB_CONTEXTS = 2;
/** Spiderweb: full spiderweb base score */
export const SPIDERWEB_FULL_SCORE_BASE = 9;
/** Spiderweb: bonus for high confluence count */
export const SPIDERWEB_FULL_SCORE_BONUS = 1;
/** Spiderweb: confluence count threshold for bonus */
export const SPIDERWEB_HIGH_CONFLUENCE = 5;
/** Spiderweb: multi-context base score */
export const SPIDERWEB_MULTI_SCORE_BASE = 7;
/** Spiderweb: single-context base score */
export const SPIDERWEB_SINGLE_SCORE_BASE = 4;
/** Spiderweb: score bonus cap */
export const SPIDERWEB_SCORE_CAP = 3;
/** Spiderweb: full context count (MACRO+MESO+MICRO) */
export const SPIDERWEB_FULL_CONTEXTS = 3;

// ── Entry Precision Rules (TS-1 through TS-9) ──
/** TS-1: Zone bounce entry buffer tolerance (pips) */
export const ZONE_BOUNCE_BUFFER_PIPS = 3;
/** TS-2: BOS retest max distance from spot (pips) */
export const BOS_RETEST_MAX_DISTANCE_PIPS = 20;
/** TS-3: Pattern completion minimum RRR
 *  Operator ruling (2026-07-31): "NOT A SINGLE ONE OF MY TRADES IS BELOW
 *  RRR = 3.5" — floor is 3.0, nothing less is acceptable. */
export const PATTERN_MIN_RRR = 3.0;
/** TS-4: Exhaustion max distance from zone edge (pips) */
export const EXHAUSTION_MAX_DISTANCE_PIPS = 5;
/** TS-5: Momentum continuation max SL (pips) */
export const MOMENTUM_MAX_SL_PIPS = 150;
/** TS-6: Range breakout minimum SL (pips) */
export const RANGE_BREAKOUT_MIN_SL_PIPS = 10;
/** TS-6: Range breakout minimum RRR
 *  Operator ruling (2026-07-31): "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE
 *  ... ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM". */
export const RANGE_BREAKOUT_MIN_RRR = 3.0;
/** TS-7: Fib deviation threshold for confluence check */
export const FIB_DEVIATION_THRESHOLD = 0.05;
/** TS-8: MTF alignment minimum confidence */
export const MTF_MIN_CONFIDENCE = 70;

// ── Liquidity Sweep ──
/** CS18: Max allowed gap between consecutive zone edges (pips).
 *  Set to 100 for basic pipeline compatibility (4-5 zones per pair);
 *  the full tick architecture uses denser zone maps. */
export const MAX_LIQUIDITY_GAP_PIPS = 500;

// ── Shape Variant Detection (TTE v5.3.3 §6.1.3-6.1.4) ──
/** PWL/PRWL: Minimum zones pierced to classify as "piercing" variant */
export const PIERCE_MULTI_ZONE_THRESHOLD = 2;
/** RS: Minimum retrace fraction of prior swing to classify as "recovery surge" (≥50%) */
export const RETRACE_DEEP_THRESHOLD = 0.50;
/** RS: Minimum failed-zone count on trailing side to detect deep pullback */
export const RS_MIN_FAILED_ZONES = 2;

// ── Swing Scalp Type Parameters (TTE v5.3.3 §7S.2) ──
/** Type 3 Liquidity Snipe: Tight SL buffer in pips (3-6 pip range) */
export const LIQUIDITY_SNIPE_SL_BUFFER_PIPS = 3;
/** Type 3 Liquidity Snipe: Target TP in pips (15-30 pip range) */
export const LIQUIDITY_SNIPE_TP_PIPS = 20;
/** Type 4 SS→BS Transition: Breakout confirmation buffer in pips */
export const SS_BS_TRANSITION_BUFFER_PIPS = 3;

// ═══════════════════════════════════════════════════════════════
// 28. REPORT GENERATOR — Formatting & Display
// ═══════════════════════════════════════════════════════════════

/** Engine version string for report header */
export const REPORT_ENGINE_VERSION = 'Plutus Agent v1.0 (TTE v5.3.3)';
/** Maximum zone rows per table in report */
export const REPORT_MAX_ZONE_ROWS = 15;
/** Number of compliance checks in sweep */
export const REPORT_COMPLIANCE_CHECK_COUNT = 12;
/** RRR minimum for notional threshold compliance check */
export const REPORT_NOTIONAL_MIN_RRR = 1.0;
/** Notional max risk percentage for compliance */
export const REPORT_NOTIONAL_MAX_RISK_PCT = 2.0;
/** High ZFP threshold for zone pressure compliance check */
export const REPORT_HIGH_ZFP_THRESHOLD = 75;

// ═══════════════════════════════════════════════════════════════
// 29. PINE SCRIPT GENERATOR — v6 Constants
// ═══════════════════════════════════════════════════════════════

/** Pine Script version */
export const PINE_VERSION = 6;
/** Max boxes count for indicator declaration */
export const PINE_MAX_BOXES_COUNT = 2000;
/** Max labels count for indicator declaration */
export const PINE_MAX_LABELS_COUNT = 2000;
/** Max lines count for indicator declaration */
export const PINE_MAX_LINES_COUNT = 2000;
/** Fill opacity for zone fills (Pine transparency value) */
export const PINE_FILL_OPACITY = 70;
/** Border opacity (fully opaque) */
export const PINE_BORDER_OPACITY = 0;
/** Info table columns (PG5) */
export const PINE_TABLE_COLS = 2;
/** Info table rows (PG5) */
export const PINE_TABLE_ROWS = 17;
/** Total table cell count (2 × 17) */
export const PINE_TABLE_CELL_COUNT = 34;
/** Table background opacity */
export const PINE_TABLE_BG_OPACITY = 80;
/** Table border width */
export const PINE_TABLE_BORDER_WIDTH = 1;
/** Table frame width */
export const PINE_TABLE_FRAME_WIDTH = 1;
/** Box border width for zone drawing */
export const PINE_BOX_BORDER_WIDTH = 2;
/** Line width for option strikes */
export const PINE_LINE_WIDTH = 1;
/** Timestamp: days before week start */
export const PINE_TS_DAYS_BEFORE = -14;
/** Timestamp: days after week end */
export const PINE_TS_DAYS_AFTER = 21;
/** Noon hour for date calculations */
export const PINE_NOON_HOUR = 12;
/** Price sanity check threshold (fraction) */
export const PINE_PRICE_SANITY_THRESHOLD = 0.03;
/** Option strike proximity threshold (fraction) */
export const PINE_OPTION_PROXIMITY = 0.005;
/** LSZ width minimum ratio vs IP median */
export const PINE_LSZ_WIDTH_MIN_RATIO = 0.3;
/** LSZ width maximum ratio vs IP median */
export const PINE_LSZ_WIDTH_MAX_RATIO = 3;
/** DXY ZFP reference range */
export const PINE_DXY_REF_RANGE = 1.60;
/** EUR/USD ZFP reference range */
export const PINE_EURUSD_REF_RANGE = 0.0200;
/** GBP/USD ZFP reference range */
export const PINE_GBPUSD_REF_RANGE = 0.0200;
/** AUD/USD ZFP reference range */
export const PINE_AUDUSD_REF_RANGE = 0.0150;
/** ZFP percentage multiplier */
export const PINE_ZFP_MULTIPLIER = 100.0;
/** Amber RGB for option strikes */
export const PINE_AMBER_RGB: readonly [number, number, number] = [255, 200, 60];
/** LSZ standard RGB */
export const PINE_LSZ_STD_RGB: readonly [number, number, number] = [40, 180, 80];
/** LSZ active RGB */
export const PINE_LSZ_ACT_RGB: readonly [number, number, number] = [80, 230, 100];
/** Red gradient stops (EXTREME → MINIMAL) — Resistance / Supply (R1, R2) */
export const PINE_RED_STOPS: ReadonlyArray<readonly [number, number, number]> = [[180, 40, 30], [192, 64, 42], [204, 88, 54], [216, 112, 66], [228, 136, 78], [240, 160, 90]];
/** Blue gradient stops (EXTREME → MINIMAL) — Equilibrium (EQ) */
export const PINE_BLUE_STOPS: ReadonlyArray<readonly [number, number, number]> = [[30, 80, 200], [50, 100, 210], [70, 120, 220], [90, 140, 230], [110, 160, 240], [130, 180, 250]];
/** Green gradient stops (EXTREME → MINIMAL) — Support / Demand (D1, D2) */
export const PINE_GREEN_STOPS: ReadonlyArray<readonly [number, number, number]> = [[20, 130, 40], [36, 145, 52], [52, 160, 64], [68, 175, 76], [84, 190, 88], [100, 205, 100]];
/** Formula remnants that must never appear (PG2) */
export const PINE_FORMULA_REMNANTS: readonly string[] = ['1.7361', '0.576', '50.14348112'];
/** Minimum zones for price sanity check */
export const PINE_MIN_ZONES_FOR_SANITY = 3;

// ═══════════════════════════════════════════════════════════════
// 30. PDF GENERATOR — Subprocess & HTML Constants
// ═══════════════════════════════════════════════════════════════

/** Pandoc subprocess timeout (ms) */
export const PDF_PANDOC_TIMEOUT_MS = 30_000;
/** Weasyprint subprocess timeout (ms) */
export const PDF_WEASYPRINT_TIMEOUT_MS = 60_000;
/** PDF top/bottom margin (mm) */
export const PDF_MARGIN_TB = 20;
/** PDF left/right margin (mm) */
export const PDF_MARGIN_LR = 15;
/** Markdown heading slice depth for h1 */
export const PDF_H1_SLICE = 2;
/** Markdown heading slice depth for h2 */
export const PDF_H2_SLICE = 3;
/** Markdown heading slice depth for h3 */
export const PDF_H3_SLICE = 4;

// ═══════════════════════════════════════════════════════════════
// 31. BACKTEST HARNESS — Replay Backtest Constants
//     (Consumed by src/backtest/harness.ts)
// ═══════════════════════════════════════════════════════════════

/** Months of history to pick random backtest weeks from. */
export const BACKTEST_HISTORY_MONTHS = 8;
/** Minimum age (days) a picked week must have to ensure it is complete. */
export const BACKTEST_MIN_WEEK_AGE_DAYS = 14;
/** Seconds in one hour (time conversion). */
export const SECONDS_PER_HOUR = 3600;
/** Milliseconds in one second (time conversion). */
export const MS_PER_SECOND = 1000;
/** UTC day-of-week offset to snap from Sunday (0) to previous Monday. */
export const SUNDAY_TO_MONDAY_OFFSET = -6;
/** Days from Monday to Friday (trading week length). */
export const BACKTEST_FRIDAY_OFFSET_DAYS = 4;
/** UTC hour at which the trading week closes (Friday 22:00). */
export const BACKTEST_WEEK_CLOSE_HOUR = 22;
/** Minimum bars required to run a replay backtest. */
export const BACKTEST_MIN_BARS = 50;
/** Delay (ms) between bars in visible backtest mode. */
export const BACKTEST_VISIBLE_DELAY_MS = 500;
/** Numeric base for random ID generation (toString base). */
export const RANDOM_BASE_RADIX = 36;
/** Start index for slicing Math.random().toString() output (skips "0." prefix). */
export const RANDOM_STRING_START_INDEX = 2;
/** Length of random suffix in TV-derived setup IDs. */
export const BACKTEST_TV_SETUPID_RAND_LEN = 8;
/** Confidence assigned to TV (VLM-derived) backtest setups. */
export const BACKTEST_TV_CONFIDENCE = 60;
/** Max characters of VLM narrative to include in setup notes. */
export const BACKTEST_TV_NARRATIVE_SLICE = 150;
/** Decimal places for price display in backtest rationales. */
export const BACKTEST_PRICE_DECIMALS = 5;
/** Length of random suffix in replay-derived setup IDs. */
export const BACKTEST_SETUPID_RAND_LEN = 6;
/** Confidence assigned to TradingView-derived replay setups. */
export const BACKTEST_REPLAY_CONFIDENCE = 50;

// ═══════════════════════════════════════════════════════════════
// 32. TOOLS — MCP Tool Constants
//     (Consumed by src/tools/index.ts)
// ═══════════════════════════════════════════════════════════════

/** UTC day-of-week value for Saturday (used in weekend check). */
export const SATURDAY_UTCDAY = 6;
/** Number of recent evidence records returned by the audit tool. */
export const TOOLS_AUDIT_RECENT_EVIDENCE_LIMIT = 10;
/** Default limit for evidence query tool. */
export const TOOLS_EVIDENCE_DEFAULT_LIMIT = 20;
/** Default TimesFM forecast horizon (bars) in the timesfm tool. */
export const TOOLS_TIMESFM_DEFAULT_HORIZON = 30;
/** Multiplier applied to VLM confidence for setup confidence boost. */
export const TOOLS_VLM_CONFIDENCE_MULTIPLIER = 10;

// ═══════════════════════════════════════════════════════════════
// 33. PIPELINE RUNNER — Report Generation & Pine Script Constants
//     (Consumed by src/pipeline/runner.ts)
// ═══════════════════════════════════════════════════════════════

/** OHLC bars fetched per pair for report generation (≈ 1 week of 4H). */
export const PIPELINE_OHLC_BARS = 42;
/** Days in a trading week (for Pine Script date range). */
export const PIPELINE_WEEK_DAYS = 7;
/** Default probability string for alternative shape chains. */
export const PIPELINE_ALT_CHAIN_DEFAULT_PCT = 30;
/** Default confidence for alternative shape chains. */
export const PIPELINE_ALT_CHAIN_DEFAULT_CONF = 0.3;
/** Character length of an ISO timestamp (yyyy-mm-ddTHH-MM-SS). */
export const ISO_TIMESTAMP_SLICE_LENGTH = 19;
/** Character length of an ISO date string (yyyy-mm-dd). */
export const ISO_DATE_SLICE_LENGTH = 10;
/** Pad length for zero-prefixed hour/minute strings. */
export const TIME_FORMAT_PAD = 2;
/** Minimum confluence for EXTREME zone degree. */
export const DEGREE_EXTREME_MIN = 8;
/** Minimum confluence for HEAVY zone degree. */
export const DEGREE_HEAVY_MIN = 6;
/** Minimum confluence for MODERATE-HEAVY zone degree. */
export const DEGREE_MODERATE_HEAVY_MIN = 5;
/** Minimum confluence for MODERATE zone degree. */
export const DEGREE_MODERATE_MIN = 4;
/** Minimum confluence for LIGHT zone degree. */
export const DEGREE_LIGHT_MIN = 2;

// ═══════════════════════════════════════════════════════════════
// 34. OBJECT CONSTANTS — Brain / Zone / Reinforcement Config Groups
//     (Consumed by 4h-sd-lobe, bom-mom-lobe, synthesis-lobe,
//      reinforcement-lobe, elemental-lobe, zone-brain, brain-messenger,
//      backtest/harness, tools/index, pipeline/runner)
// ═══════════════════════════════════════════════════════════════

/** Consolidation detection parameters (4H supply/demand lobe). */
export const CONSOLIDATION = {
  /** Minimum total bars required to run zone construction. */
  MIN_BARS_REQUIRED: 20,
  /** Initial reaction count for newly-formed zones — 0 (virgin = never tested). */
  INITIAL_REACTION_COUNT: 0,
  /** Sliding-window size (bars) for consolidation scanning. */
  SCAN_WINDOW: 4,
  /** Max price-range fraction (0.2 %) for a window to qualify as consolidated. */
  MAX_RANGE_FRACTION: 0.002,
  /** Minimum consecutive consolidated bars to form a zone. */
  MIN_BARS: 4,
} as const;

/** Singular origin candle (order block) detection (4H supply/demand lobe).
 *  Detects the SINGLE candle immediately before a strong breakout and uses
 *  that candle — never the impulse candle — as the zone origin.
 *  TTE Step 0f (ZERO TOLERANCE): strong move = ≥ 0.5 DXY over ≥ 3 trading days. */
export const SINGULAR_CANDLE = {
  /** Breakout body must exceed this multiple of the avg body of the preceding 4 bars. */
  BODY_MULTIPLIER: 1.5,
  /** Number of preceding bars to average for body comparison. */
  LOOKBACK: 4,
  /** Minimum bar index (0-based) to start scanning (need LOOKBACK preceding bars). */
  START_INDEX: 4,
  /** Strong directional move threshold in pips: ≥ 0.5 DXY points = 50 pips. */
  MIN_MOVE_PIPS: 50,
  /** Strong directional move minimum duration: ≥ 3 trading days. */
  MIN_MOVE_TRADING_DAYS: 3,
  /** Trading bars per day per timeframe (24h ÷ bar duration). */
  BARS_PER_DAY: {
    '4H': 6,
    '1H': 24,
    '30m': 48,
    '15m': 96,
  } as Record<string, number>,
} as const;

/** Zone width / edge / cluster thresholds. */
export const ZONE_WIDTH = {
  /** Padding (pips) added around consolidation low/high to form zone edges. */
  EDGE_PADDING_PIPS: 10,
  /** Distance (pips) threshold for classifying a zone as Break-of-Market. */
  BOM_DISTANCE_PIPS: 15,
  /** Zones narrower than this (pips) are "thin liquidity" — never entry/SL. */
  THIN_ZONE_THRESHOLD_PIPS: 15,
  /** Pip value for DXY. */
  PIP_DXY: 0.01,
  /** Pip value for 5-digit FX pairs. */
  PIP_5DIGIT: 0.0001,
  /** Max distance (pips) for two zones to be clustered together. */
  CLUSTER_THRESHOLD_PIPS: 10,
  /** Half-width (pips) for pillar-derived zones (± from level price). */
  HALF_WIDTH_PIPS: 5,
} as const;

/** Reinforcement ladder parameters (TTE v5.3.3 Section 7.3 + 8R.7). */
export const REINFORCEMENT = {
  /** Minimum confluence (≥ MODERATE) for a MoM zone to be promoted to BoM. */
  PROMOTION_CONFLUENCE: 6,
  /** FLR (First Line) thick buffer — London session (pips). */
  FLR_THICK_PIPS: 3,
  /** FLR thin buffer — NY session (pips). */
  FLR_THIN_PIPS: 2,
  /** FR (Follow-up) thick buffer — London (pips). */
  FR_THICK_PIPS: 2,
  /** FR thin buffer — NY (pips). */
  FR_THIN_PIPS: 2,
  /** LR (Last) thick buffer — London (pips). */
  LR_THICK_PIPS: 2,
  /** LR thin buffer — NY (pips). */
  LR_THIN_PIPS: 1,
  /** Base zone-offset for trigger zone selection (2-3 zones ahead). */
  TRIGGER_OFFSET_BASE: 2,
  /** Pips inside target liquidity zone for LR type. */
  LR_INSIDE_PIPS: 1,
  /** Standard pips inside target liquidity zone for FLR/FR types. */
  STANDARD_INSIDE_PIPS: 2,
  /** Maximum reinforcement entries per setup. */
  MAX_ENTRIES: 3,
  /** Recommended reinforcement entries (minimum for HTF swings). */
  RECOMMENDED_ENTRIES: 2,
  /**
   * H-06: Maximum rockets in a Master Trade composite (Section 8R.9).
   * "Total active rockets: Up to 7 with hardwired safety."
   */
  MAX_ROCKETS: 7,
  /** Quantity for the primary (first) rocket — full size. */
  PRIMARY_ROCKET_QTY: 1.0,
  /** Quantity for secondary rockets — half size. */
  SECONDARY_ROCKET_QTY: 0.5,
} as const;

/** Brain infrastructure constants. */
export const BRAIN = {
  /** Max EventEmitter listeners (BrainMessenger). */
  MAX_LISTENERS: 50,
  /** Supported trading instruments. */
  INSTRUMENTS: ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as readonly string[],
} as const;

/**
 * Pair priority order for instrument processing (TTE v5.3.3 spec H-03).
 * Instruments are processed in this order: AUD/USD > GBP/USD > EUR/USD.
 * DXY (not a tradeable pair) is processed last.
 */
export const PAIR_PRIORITY = ['AUD/USD', 'GBP/USD', 'EUR/USD'] as const;

/** Timing constants (ms / ticks) used across brain modules. */
export const TIME = {
  /** Reaction cooldown: minimum ms between consecutive reactions at same zone. */
  REACTION_COOLDOWN_MS: 60_000,
  /** Data fetch interval (1 minute). */
  DATA_FETCH_MS: 60_000,
  /** VLM capture interval in ticks (450 ticks × 200 ms ≈ 90 s). */
  VLM_CAPTURE_INTERVAL_TICKS: 450,
  /** Two hours in milliseconds. */
  TWO_HOURS_MS: 7_200_000,
  /** Brain tick interval (ms). */
  TICK_INTERVAL_MS: 200,
  /** Ideal tick execution time (ms). */
  TICK_IDEAL_MS: 50,
  /** Hard-limit tick execution time (ms). */
  TICK_HARD_LIMIT_MS: 200,
} as const;

/** Confluence scoring parameters. */
export const CONFLUENCE = {
  /** Reaction count indicating a virgin (untested) zone. */
  VIRGIN_REACTION: 0,
  /** Maximum reactions for a zone to still be "active" (3+ = depleted). */
  ACTIVE_MAX_REACTIONS: 2,
  /** Minimum pillar score (≥) for a pillar to count toward confluence. */
  ACTIVE_PILLAR_THRESHOLD: 1,
  /** Multiplier mapping 0-1 confidence to 0-10 confluence score. */
  CONFIDENCE_MULTIPLIER: 10,
} as const;

/** Zone Failure Probability (ZFP) parameters. */
export const ZFP = {
  /** ZFP reduction per confluence point. */
  PER_CONFLUENCE_REDUCTION: 10,
  /** Bonus ZFP reduction for BoM zones. */
  BOM_BONUS: 10,
  /** Minimum clamped ZFP value. */
  MIN_CLAMP: 5,
  /** Maximum clamped ZFP value. */
  MAX_CLAMP: 95,
  /** Default ZFP placeholder (before synthesis computation). */
  DEFAULT: 50,
} as const;

/** General-purpose conversion constants. */
export const GENERAL = {
  /** Multiply a 0-1 fraction by this to get a percentage. */
  FRACTION_TO_PERCENT: 100,
} as const;

/** Pair-specific ZFP reference ranges (TTE v5.3.3 Section 6).
 *  DXY moves in ~1.60 point ranges; FX pairs in 0.0150-0.0200 ranges. */
export const DXY = {
  /** DXY ZFP base reference range. */
  ZFP_BASE_RANGE: 1.60,
  /** EUR/USD ZFP reference range. */
  EURUSD_ZFP_RANGE: 0.0150,
  /** GBP/USD ZFP reference range. */
  GBPUSD_ZFP_RANGE: 0.0200,
  /** AUD/USD ZFP reference range. */
  AUDUSD_ZFP_RANGE: 0.0150,
  /** Fallback ZFP reference range. */
  DEFAULT_ZFP_RANGE: 0.0150,
} as const;

// ═══════════════════════════════════════════════════════════════
// 32. TIMESFM CLIENT
// ═══════════════════════════════════════════════════════════════

/** Init handshake timeout — model download on first run can be slow (ms). */
export const TIMESFM_INIT_HANDSHAKE_TIMEOUT_MS = 180_000;
/** Poll interval for checking whether init resolved (ms). */
export const TIMESFM_INIT_POLL_INTERVAL_MS = 100;
/** Per-request timeout sent to the Python bridge (ms). */
export const TIMESFM_REQUEST_TIMEOUT_MS = 60_000;
/** Default forecast horizon passed via PLUTUS_TIMESFM_HORIZON env var. */
export const TIMESFM_BRIDGE_DEFAULT_HORIZON = 64;

// ═══════════════════════════════════════════════════════════════
// 33. INVESTINGLIVE CLIENT
// ═══════════════════════════════════════════════════════════════

/** Cache time-to-live for options expiry data (ms = 1 hour). */
export const INVESTINGLIVE_CACHE_TTL_MS = 3_600_000;
/** Milliseconds in one minute — used for cache age display. */
export const INVESTINGLIVE_MS_PER_MINUTE = 60_000;
/** Divisor to convert notional in millions to billions (1 B = 1000 M). */
export const INVESTINGLIVE_MILLIONS_TO_BILLIONS = 1000;
/** Length of an ISO date prefix (YYYY-MM-DD = 10 chars). */
export const INVESTINGLIVE_ISO_DATE_LENGTH = 10;
/** TTE critical option-wall threshold (billions USD). */
export const TTE_CRITICAL_NOTIONAL_B = 1.5;
/** TTE significant magnet threshold (billions USD). */
export const TTE_SIGNIFICANT_NOTIONAL_B = 0.85;
/** Zero-pad length for date string components (DD, MM). */
export const INVESTINGLIVE_DATE_PAD_LENGTH = 2;

// ═══════════════════════════════════════════════════════════════
// 34. VLM EXTRACTION
// ═══════════════════════════════════════════════════════════════

/** Notional agreement tolerance: +/- 5% of the larger value. */
export const VLM_NOTIONAL_TOLERANCE_PCT = 0.05;
/** Strike agreement tolerance: +/- 0.0005 price units (~5 pips on FX). */
export const VLM_STRIKE_TOLERANCE = 0.0005;
/** Agreement count required for a strike to be ACCEPTED (2 of 3 passes). */
export const VLM_AGREEMENT_ACCEPT_THRESHOLD = 2;
/** Agreement count that marks a strike as DISPUTED (exactly 1 pass). */
export const VLM_AGREEMENT_DISPUTE_THRESHOLD = 1;
/** Maximum number of extraction passes in the 3-pass pipeline. */
export const VLM_MAX_EXTRACTION_PASSES = 3;
/** Decimal places for strike key rounding in reconciliation. */
export const VLM_STRIKE_KEY_PRECISION = 5;

// ═══════════════════════════════════════════════════════════════
// 35. RISK ENGINE
// ═══════════════════════════════════════════════════════════════

/** Maximum total portfolio exposure as percentage of account (default 25%). */
export const RISK_DEFAULT_MAX_TOTAL_EXPOSURE_PCT = 25;
/** Maximum concurrent positions per individual pair (default 2). */
export const RISK_DEFAULT_MAX_POSITIONS_PER_PAIR = 2;
/** Maximum positions in the same direction across all pairs (default 3). */
export const RISK_DEFAULT_MAX_POSITIONS_PER_DIRECTION = 3;
/** Maximum daily drawdown in pips before hard block (default 200). */
export const RISK_DEFAULT_MAX_DAILY_DRAWDOWN_PIPS = 200;
/** Maximum correlated positions in same direction (default 2). */
export const RISK_DEFAULT_MAX_CORRELATED_POSITIONS = 2;
/** UTC hour on Friday after which no new positions are opened (default 20). */
export const RISK_DEFAULT_WEEKEND_PROHIBITION_HOUR_UTC = 20;
/** Fallback pip value used when pair-specific value is unavailable. */
export const RISK_FALLBACK_PIP_VALUE = 0.0001;
/** JavaScript getUTCDay() value for Friday. */
export const FRIDAY_DAY_OF_WEEK = 5;
/** JavaScript getUTCDay() value for Saturday. */
export const SATURDAY_DAY_OF_WEEK = 6;
/** JavaScript getUTCDay() value for Sunday. */
export const SUNDAY_DAY_OF_WEEK = 0;

// ═══════════════════════════════════════════════════════════════
// 32. SHAPE BRAIN — Macro Shape Chain Prediction
//     (Consumed by src/brains/shape-brain.ts)
// ═══════════════════════════════════════════════════════════════

// ZFP thresholds (Zone Failure Probability) — <20 FORTRESS, 20-40 STRONG,
// 40-60 MODERATE/ELEVATED, >60 HIGH/CRITICAL
/** ZFP threshold for FORTRESS classification (< this = zone holds). */
export const ZFP_FORTRESS_THRESHOLD = 20;
/** ZFP threshold for STRONG classification. */
export const ZFP_STRONG_THRESHOLD = 40;
/** ZFP threshold for MODERATE/ELEVATED classification. */
export const ZFP_MODERATE_THRESHOLD = 60;
/** ZFP threshold for CRITICAL/HIGH classification (zone likely fails). */
export const ZFP_CRITICAL_THRESHOLD = 60;
/** Default ZFP when no zones are present. */
export const ZFP_DEFAULT = 50;
/** ZFP threshold for LOW classification. */
export const ZFP_LOW_THRESHOLD = 30;
/** ZFP threshold for HIGH classification. */
export const ZFP_HIGH_THRESHOLD = 60;
/** Minimum zone count for balanced consolidation classification. */
export const CONSOLIDATION_BALANCED_ZONE_THRESHOLD = 4;
/** Maximum zone imbalance (above vs below spot) for consolidation. */
export const CONSOLIDATION_MAX_ZONE_IMBALANCE = 2;
/** Low confidence threshold (floor for timing-adjusted predictions). */
export const CONFIDENCE_LOW = 0.3;
/** Number of trading days per week (Mon–Fri). */
export const TRADING_DAYS_PER_WEEK = 5;
/** Breakout watch proximity threshold in DXY points. */
export const BREAKOUT_WATCH_DISTANCE_DXY = 0.20;
/** Absolute percentage cap (ZFP can never exceed 100%). */
export const MAX_ZFP_PERCENT = 100;
/** FIX-012 Trading Speed Rule: base timing confidence reduction (Mon→Tue). */
export const TIMING_CONFIDENCE_REDUCTION_BASE = 0.20;
/** FIX-012 Trading Speed Rule: per-day confidence reduction step. */
export const TIMING_CONFIDENCE_REDUCTION_STEP = 0.05;
/** Shape chain confidence: floor value regardless of forecast distance. Per spec §6.4.1 = 25%. */
export const CHAIN_CONFIDENCE_FLOOR = 0.25;
/** Shape chain confidence: initial confidence for step 0. */
export const CHAIN_CONFIDENCE_INITIAL = 0.9;
/** Shape chain confidence: decay per forecast step. */
export const CHAIN_CONFIDENCE_DECAY = 0.1;
/** ZFP ceiling projection: offset above average ZFP. */
export const ZFP_CEILING_OFFSET = 15;
/** ZFP ceiling projection: per-step increase. */
export const ZFP_CEILING_STEP = 3;
/** ZFP floor projection: offset below average ZFP. */
export const ZFP_FLOOR_OFFSET = 10;
/** ZFP floor projection: per-step increase. */
export const ZFP_FLOOR_STEP = 5;
/** Transition probability: decay per forecast step. */
export const TRANSITION_PROB_DECAY = 0.15;

// ═══════════════════════════════════════════════════════════════
// 33. DXY PRIMACY — Cross-Pair Directional Conviction
//     (Consumed by src/brains/dxy-primacy.ts)
// ═══════════════════════════════════════════════════════════════

/** Typical EUR/USD move duration in days (TTE v5.3.3 Section 2.0.4). */
export const MOVE_DURATION_EURUSD_DAYS = 2;
/** Typical GBP/USD move duration in days. */
export const MOVE_DURATION_GBPUSD_DAYS = 1;
/** Typical AUD/USD move duration in days. */
export const MOVE_DURATION_AUDUSD_DAYS = 3;
/** Confidence threshold for high-conviction directional signal. */
export const CONFIDENCE_HIGH = 0.7;
/** Pillar composite max (0-18 scale from 9-pillar engine, 2 points each). */
export const PILLAR_COMPOSITE_MAX = 18;
/** Nearby-zone distance threshold in DXY points for directional pressure signals. */
export const NEARBY_ZONE_DISTANCE_DXY = 2.0;
/** Minimum excess zone count for directional pressure (demand vs supply). */
export const MIN_PRESSURE_EXCESS = 1;
/** Pillar composite "strong" threshold (half of max 18 = avg ≥1.0 per pillar). */
export const PILLAR_COMPOSITE_STRONG = 9;
/** Bullish conviction ratio (≈ 2/3 of directional signals). */
export const BULLISH_CONVICTION_RATIO = 0.67;
/** Bearish conviction ratio (≈ 1/3 of directional signals). */
export const BEARISH_CONVICTION_RATIO = 0.33;
/** Pair-profile penalty: category mismatch during pair's optimal session. */
export const PAIR_CATEGORY_MISMATCH_PENALTY = 15;
/** Pair-profile penalty: general category mismatch (any session). */
export const PAIR_GENERAL_MISMATCH_PENALTY = 5;
/** AUD/USD minimum confluence required (slow mover needs more confirmation). */
export const AUDUSD_MIN_CONFLUENCE = 4;
/** AUD/USD penalty: low-confluence setup. */
export const AUDUSD_LOW_CONFLUENCE_PENALTY = 10;
/** AUD/USD penalty: scalp generated against HTF-only nature. */
export const AUDUSD_SCALP_PENALTY: number = 12;

// ═══════════════════════════════════════════════════════════════
// 34. ENGINE 3 v8 — Entry / SL / RRR / Confidence / Shape Constants
//     (Ported from Python BUILD_SPEC.md for TypeScript engine)
// ═══════════════════════════════════════════════════════════════

/**
 * Maximum entry distance from spot, per instrument and setup category.
 * If the setup's entry is farther than this, the setup is rejected.
 */
export const MAX_ENTRY_DISTANCE: Record<string, Record<string, number>> = {
  'DXY': { SCALP: 0.40, HTF: 0.70, BS: 0.55, REINF: 0.55, TRANS: 0.55 },
  'EUR/USD': { SCALP: 70, HTF: 150, BS: 100, REINF: 100, TRANS: 100 },
  'GBP/USD': { SCALP: 100, HTF: 200, BS: 150, REINF: 150, TRANS: 150 },
  'AUD/USD': { SCALP: 70, HTF: 150, BS: 100, REINF: 100, TRANS: 100 },
};

/**
 * Bible §8.2 — category-specific maximum entry distance from spot (pips).
 * Different categories have different structural reach: scalps hunt near zones,
 * HTF swings anchor deeper. Flat caps either starve swings or admit far-zone slop.
 * Keys: pair → category (SWING_SCALP / HTF_SWING / REVERSAL / REINFORCEMENT).
 * Generator-side gate lands in Phase 4 — this table is the constants source of truth.
 */
export const MAX_ENTRY_DISTANCE_PIPS: Record<string, Record<string, number>> = {
  'DXY':     { SWING_SCALP: 30, HTF_SWING: 50, REVERSAL: 40, REINFORCEMENT: 40 },
  'EUR/USD': { SWING_SCALP: 50, HTF_SWING: 80, REVERSAL: 60, REINFORCEMENT: 60 },
  'GBP/USD': { SWING_SCALP: 80, HTF_SWING: 120, REVERSAL: 100, REINFORCEMENT: 100 },
  'AUD/USD': { SWING_SCALP: 50, HTF_SWING: 80, REVERSAL: 60, REINFORCEMENT: 60 },
};

/** Swing-Scalp proximity factor — fraction of entry distance for SS qualification. */
export const SS_PROXIMITY_FACTOR: number = 0.60;

/**
 * Sniper entry buffer per instrument and setup category.
 * Defines the acceptable edge tolerance for sniper entries.
 */
export const SNIPER_BUFFER: Record<string, Record<string, number>> = {
  'DXY': { SCALP: 0.03, BS: 0.04, HTF: 0.05, REINF: 0.025, TRANS: 0.04 },
  'EUR/USD': { SCALP: 10, BS: 12, HTF: 15, REINF: 8, TRANS: 12 },
  'GBP/USD': { SCALP: 15, BS: 18, HTF: 20, REINF: 12, TRANS: 18 },
  'AUD/USD': { SCALP: 10, BS: 12, HTF: 15, REINF: 8, TRANS: 12 },
};

/** Hard stop-loss cap per instrument (pips for FX, points for DXY). */
export const SL_MAX_HARD: Record<string, number> = {
  'DXY': 50, 'EUR/USD': 150, 'GBP/USD': 180, 'AUD/USD': 150,
};

/** Stop-loss penalty zone — setups with SL beyond this incur a confidence penalty. */
export const SL_MAX_PENALTY: Record<string, number> = {
  'DXY': 30, 'EUR/USD': 100, 'GBP/USD': 120, 'AUD/USD': 100,
};

/** Minimum RRR for TP1 in normal (non-consolidation) market conditions.
 *  DERIVED from RRR_BY_CATEGORY — do not edit here; edit RRR_BY_CATEGORY. */
export const MIN_RRR_TP1_NORMAL: Record<string, number> = {
  SCALP: RRR_BY_CATEGORY.SWING_SCALP.tp1,
  BS: RRR_BY_CATEGORY.BREAKOUT_SURGE.tp1,
  HTF: RRR_BY_CATEGORY.HTF_SWING.tp1,
  REINF: RRR_BY_CATEGORY.REINFORCEMENT.tp1,
  TRANS: RRR_BY_CATEGORY.TRANSITION.tp1,
};

/** Minimum blended RRR (all targets) in normal market conditions.
 *  DERIVED from RRR_BY_CATEGORY — do not edit here; edit RRR_BY_CATEGORY. */
export const MIN_RRR_BLENDED_NORMAL: Record<string, number> = {
  SCALP: RRR_BY_CATEGORY.SWING_SCALP.blended,
  BS: RRR_BY_CATEGORY.BREAKOUT_SURGE.blended,
  HTF: RRR_BY_CATEGORY.HTF_SWING.blended,
  REINF: RRR_BY_CATEGORY.REINFORCEMENT.blended,
  TRANS: RRR_BY_CATEGORY.TRANSITION.blended,
};

/** Minimum RRR for TP1 during consolidation phase. The operator's flat 2026-08-04
 *  2.5 doctrine SUPERSEDES the old era's consolidation relaxation ("i dont want
 *  the machine optimizing everything for low R just to pass the filter"). */
export const CONSOL_RRR_TP1: Record<string, number> = {
  SCALP: 2.5, BS: 2.5, HTF: 2.5, REINF: 2.5, TRANS: 2.5,
};

/** Minimum blended RRR during consolidation phase — flat 2.5 (same doctrine). */
export const CONSOL_RRR_BLENDED: Record<string, number> = {
  SCALP: 2.5, BS: 2.5, HTF: 2.5, REINF: 2.5, TRANS: 2.5,
};

/** Consolidation range threshold per instrument — range below this = consolidating. */
export const CONSOL_RANGE_THRESHOLD: Record<string, number> = {
  'DXY': 120, 'EUR/USD': 150, 'GBP/USD': 200, 'AUD/USD': 120,
};

/** Minimum confidence for a primary (non-reinforcement) setup. */
export const MIN_CONFIDENCE_PRIMARY: number = 60;

/** Maximum setups allowed per pair per generation cycle. */
export const MAX_SETUPS_PER_PAIR: number = 10;

/** Maximum reinforcement setups per swing leg. */
export const MAX_REINFORCEMENTS_PER_SWING: number = 2;

/** Confidence bonus when a DXY cascade alignment is present.
 *  Reduced from 10 to 5 — cascaded setups should have LOWER confidence
 *  than native setups, not equal. */
export const DXY_CASCADE_BONUS: number = 5;

/** Gap between entry and spot that cancels a setup (too far from current price). */
export const GAP_CANCEL_THRESHOLD: Record<string, number> = {
  'DXY': 0.15, 'EUR/USD': 20, 'GBP/USD': 15, 'AUD/USD': 30,
};

/**
 * Maps shape codes to the setup categories they are permitted to generate.
 * A shape that maps to an empty array cannot produce any setups.
 */
export const SHAPE_CATEGORIES_MAP: Record<string, string[]> = {
  'SS': ['SWING_SCALP'],
  'SS_DWL': ['SWING_SCALP', 'WHIPLASH'],
  // V4.3 §8.1 amendment: golden Wednesday BS Short (101.235, 4H BoM, 55.5-pip TP)
  // is HTF-swing-class — BS may emit HTF swings as well as breakout surges.
  'BS': ['HTF_SWING', 'BREAKOUT_SURGE'],
  'WL': ['WHIPLASH'],
  // V4.3 §8.1 amendment: RWL trades are REVERSAL-class (was emitted as HTF_SWING).
  'RWL': ['REVERSAL', 'HTF_SWING'],
  'WLS': ['SWING_SCALP', 'HTF_SWING'],
  'R': ['REINFORCEMENT', 'SWING_SCALP'],
};

// ═══════════════════════════════════════════════════════════════
// 35. V4.3 UNIFIED SESSION MAPS (§8.2) — Single Source of Truth
//     Imported by BOTH visual-setup-generator and shape-brain.
// ═══════════════════════════════════════════════════════════════
//
// Golden + 38-trade forensic truth: London Open = scalps (22/38),
// London/NY Overlap = BS (15/38), NY Mid = HTF swings (18/38),
// NY Open = reinforcements (8/38).
//
// NOTE: values are SessionWindow enum STRING VALUES duplicated as literals —
// types.ts imports from this module, so importing the enum here would be a
// circular dependency. These literals MUST stay in sync with SessionWindow
// in src/types.ts. Known pre-existing gap: no Tokyo variant exists in the
// enum (Phase 4 AUD profile work handles session logic — do NOT add here).

/** Shape code → session window (SessionWindow enum value). */
export const SHAPE_SESSION_MAP: Record<string, string> = {
  'SS': 'London Open 02:00-05:00 ET',     // SessionWindow.LONDON_OPEN
  'SS_DWL': 'London Open 02:00-05:00 ET', // SessionWindow.LONDON_OPEN
  'WLS': 'London Open 02:00-05:00 ET',    // SessionWindow.LONDON_OPEN
  'BS': 'NY Overlap 08:00-10:00 ET',      // SessionWindow.NY_OVERLAP
  'PBS': 'NY Overlap 08:00-10:00 ET',     // SessionWindow.NY_OVERLAP
  'WL': 'NY Mid 10:00-14:00 ET',          // SessionWindow.NY_MID
  'RWL': 'NY Mid 10:00-14:00 ET',         // SessionWindow.NY_MID
  'R': 'NY Open 08:30-10:00 ET',          // SessionWindow.NY_OPEN
  'RS': 'NY Open 08:30-10:00 ET',         // SessionWindow.NY_OPEN
  // Shape variants — family-consistent (both legacy maps agreed on DWL/STORM/
  // PRWL; PWL follows its unified WL family → NY_MID).
  'DWL': 'London Open 02:00-05:00 ET',    // SessionWindow.LONDON_OPEN
  'STORM': 'London Open 02:00-05:00 ET',  // SessionWindow.LONDON_OPEN
  'PWL': 'NY Mid 10:00-14:00 ET',         // SessionWindow.NY_MID
  'PRWL': 'NY Mid 10:00-14:00 ET',        // SessionWindow.NY_MID
} as const;

/** Setup category → session window (SessionWindow enum value). */
export const CATEGORY_SESSION_MAP: Record<string, string> = {
  'SWING_SCALP': 'London Open 02:00-05:00 ET',   // SessionWindow.LONDON_OPEN
  'BREAKOUT_SURGE': 'NY Overlap 08:00-10:00 ET', // SessionWindow.NY_OVERLAP
  'HTF_SWING': 'NY Mid 10:00-14:00 ET',          // SessionWindow.NY_MID
  'REVERSAL': 'NY Mid 10:00-14:00 ET',           // SessionWindow.NY_MID
  'WHIPLASH': 'NY Mid 10:00-14:00 ET',           // SessionWindow.NY_MID
  'REINFORCEMENT': 'NY Open 08:30-10:00 ET',     // SessionWindow.NY_OPEN
  'TRANSITION': 'NY Overlap 08:00-10:00 ET',     // SessionWindow.NY_OVERLAP (enum completeness)
} as const;
