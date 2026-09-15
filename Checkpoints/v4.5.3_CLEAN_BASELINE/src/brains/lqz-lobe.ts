/**
 * LQZ Lobe — Liquidity Zone (LQZ) detection from candlestick patterns (1H canon,
 * TF-parameterized via detectLiquidityZones' timeframe param — 30m/15m scaled).
 *
 * ═══════════════════════════════════════════════════════════════
 * Purpose:
 *   Identifies resting-liquidity pools (stop clusters) from raw 1H OHLC
 *   data and merges them into the Engine 1 zone map. Liquidity zones act
 *   as magnets for price and as confluence boosters when they overlap
 *   existing IP zones.
 *
 * THE 3 TYPES OF LQ CANDLES (user analysis — replaces the old 4-pattern
 * TIGHT_CONSOL / WICK_CLUSTER / BODY_EDGE / REACTION model):
 *
 *   Type 1 — LIQUIDITY_SWEEP (the main pattern):
 *     2 back-to-back THICK candle bodies that BREAK a support/resistance
 *     level with EXTENDED wicks beyond it, then price REVERSES back
 *     through the level. Very distinct visual stop-hunt signature.
 *
 *   Type 2 — LONG_WICK (long wick immediately preceding a sharp move):
 *     A wick ≥ 2.5× body length (and ≥ 5 pips) that grabs liquidity,
 *     followed within 3 bars by a SHARP directional move
 *     (≥ max(15 pips, 1.5×ATR)) away from the wick.
 *
 *   Type 3 — SHORT_WICK_CONSOL (S/R consolidation, repeated short wicks):
 *     3+ candles in a compressed range (span ≤ 25 pips) whose SHORT
 *     wick tips (≤ 3 pips) align at the same level within 2 pips.
 *     Smaller and less obvious, but maps zone EDGES precisely.
 *
 * CONFIRMATION RULE (critical):
 *   A liquidity zone is only emitted when 2 or all 3 pattern types
 *   align on a HORIZONTAL LINE (same side, zone intervals overlapping
 *   within 3 pips) across the multi-day lookback. Single-pattern hits
 *   are discarded — this is the anti-noise filter that separates LQ
 *   zones from simple S/D zone detection.
 *
 * ZONE COUNT CONTROL:
 *   - Max 20 zones inside the tradeable range (±clamp(4×ATR, 25-100 pips)
 *     around current price).
 *   - Max 50 zones across the entire week of bars.
 *   - 75 hard ceiling (defensive backstop).
 *
 * Merge rule:
 *   - LQZ overlapping an IP zone within 5 pips → promote the IP zone's
 *     pressure (confluence +2, zfp −5, liquidityScore raised, tagged
 *     sdOverlap: 'LQZ', LQZ level added to keyLevels).
 *   - Non-overlapping LQZ → appended as a new MoM zone tagged
 *     sdType: 'MoM' / sdOverlap: 'LQZ'.
 *
 * Side convention (matches lsz-detector):
 *   BUY_SIDE  — liquidity resting ABOVE price (buy stops) → supply zone.
 *   SELL_SIDE — liquidity resting BELOW price (sell stops) → demand zone.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar, DXYZone } from '../types.js';
import { ZoneType, PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** The 3 LQ candle patterns from the user's analysis. */
export type LqzPatternType = 'LIQUIDITY_SWEEP' | 'LONG_WICK' | 'SHORT_WICK_CONSOL';

/**
 * Detection timeframes supported by the LQZ detector. Default '1H' (canon).
 * 4H is accepted (canon-parameter fallback — no 4H scaling table in Phase 2
 * T1); 30m/15m use their TF-scaled parameter sets from LQZ_TF_PARAMS.
 */
export type LqzTimeframe = '4H' | '1H' | '30m' | '15m';

/**
 * The 14 canon LQZ thresholds for one timeframe (§2.3 Phase 2 T1).
 * Named after the module constants they replace inside the pattern detectors;
 * the 1H entry of LQZ_TF_PARAMS references those constants verbatim.
 */
export interface LqzTfParams {
  /** SWEEP_LEVEL_LOOKBACK_BARS — bars of prior history used to fix the S/R level. */
  sweepLevelLookbackBars: number;
  /** SWEEP_THICK_BODY_MULT — a "thick" body is ≥ mult × avg body over the window. */
  sweepThickBodyMult: number;
  /** SWEEP_MIN_BEYOND_PIPS — wick tip must extend this far beyond the broken level. */
  sweepMinBeyondPips: number;
  /** SWEEP_REVERSAL_WINDOW_BARS — bars after the pair within which price must reverse. */
  sweepReversalWindowBars: number;
  /** LONG_WICK_BODY_MULT — long wick = ≥ mult × body length (2-3× spec; 2.5 midpoint). */
  longWickBodyMult: number;
  /** LONG_WICK_MIN_PIPS — absolute floor on a long wick (anti-noise). */
  longWickMinPips: number;
  /** SHARP_MOVE_WINDOW_BARS — bars after the wick within which the sharp move must occur. */
  sharpMoveWindowBars: number;
  /** SHARP_MOVE_MIN_PIPS — sharp move floor in pips. */
  sharpMoveMinPips: number;
  /** SHARP_MOVE_ATR_MULT — sharp move must also exceed mult × ATR (larger applies). */
  sharpMoveAtrMult: number;
  /** SHORT_WICK_MAX_PIPS — a "short" wick is ≤ this many pips. */
  shortWickMaxPips: number;
  /** SHORT_WICK_CLUSTER_MIN_BARS — min bars whose short-wick tips align at the level. */
  shortWickClusterMinBars: number;
  /** SHORT_WICK_CLUSTER_TOL_PIPS — max spread between aligned short-wick tips. */
  shortWickClusterTolPips: number;
  /** CONSOL_MAX_SPAN_PIPS — max total price span of the clustered bars. */
  consolMaxSpanPips: number;
  /** LQZ_ALIGN_TOLERANCE_PIPS — horizontal-line alignment gap for confirmation. */
  lqzAlignTolerancePips: number;
}

export interface LiquidZone {
  /** Zone midpoint (price). */
  level: number;
  /** Zone upper bound. */
  top: number;
  /** Zone lower bound. */
  bottom: number;
  /** BUY_SIDE = liquidity above price (supply). SELL_SIDE = liquidity below price (demand). */
  side: 'BUY_SIDE' | 'SELL_SIDE';
  /** Timeframe the zone was detected on. detectLiquidityZones tags every emitted
   *  zone; optional so pre-T1/externally-constructed zones stay assignable. */
  timeframe?: LqzTimeframe;
  /** Distinct pattern types confirming this zone on the horizontal line (≥ 2). */
  patterns: LqzPatternType[];
  /** Total bars contributing to the confirming patterns. */
  touch_count: number;
  /** Strongest rejection / sharp move produced at the level, in pips. */
  reaction_pips: number;
  /** unix ms of first pattern occurrence. */
  first_seen: number;
  /** unix ms of most recent pattern occurrence. */
  last_seen: number;
  /** THICK if width > 15 pips, else THIN (mirrors LSZ thickness rule). */
  quality: 'THICK' | 'THIN';
  /** True when the zone sits inside the tradeable range around current price. */
  inTradeableRange: boolean;
  /** Bar-span between oldest and newest confirming hit (reaction-age weighting). */
  confirmationSpanBars?: number;
  /** Age-derived confidence boost applied to this zone (0-100 scale, one decimal). */
  ageConfidenceBoost?: number;
  /** Zone confidence after age weighting (base 50 + boost, capped at 100). */
  confidence?: number;
}

/** A single raw pattern occurrence before horizontal-alignment confirmation. */
interface PatternHit {
  type: LqzPatternType;
  level: number;
  top: number;
  bottom: number;
  side: 'BUY_SIDE' | 'SELL_SIDE';
  touch_count: number;
  reaction_pips: number;
  first_seen: number;
  last_seen: number;
  /** Bar index of oldest contributing candle (for confirmation-span weighting). */
  firstIdx?: number;
  /** Bar index of newest contributing candle (for confirmation-span weighting). */
  lastIdx?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// 6 weeks of 1H at 120 bars/week. Operator-ruled sweet spot 3-6 weeks, max 1440.
export const LQZ_LOOKBACK_BARS = 720;

export const LQZ_AGE_CONFIDENCE_MAX = 1.0;
// Reaction-age weighting: same level reacted across 6+ weeks = max-validity LQZ (operator doctrine).
// span = bar-span between oldest and newest confirming hit.
// ageMultiplier = span >= LQZ_LOOKBACK_BARS ? LQZ_AGE_CONFIDENCE_MAX : span / LQZ_LOOKBACK_BARS.
// boost = min(10, span / 144) * ageMultiplier.
// confidence = min(100, confidence + round(boost * 10)).

/** Minimum bars required before any pattern can be detected. */
const LQZ_MIN_BARS = 20;

// ── Type 1: LIQUIDITY_SWEEP ──────────────────────────────────────────────────

/** Bars before the pair used to establish the S/R level (24 × 1H ≈ 1 day). */
const SWEEP_LEVEL_LOOKBACK_BARS = 24;

/** A "thick" candle body is ≥ 1.5× the average body over the window. */
const SWEEP_THICK_BODY_MULT = 1.5;

/** Wick tip must extend at least this far beyond the broken level (stop grab). */
const SWEEP_MIN_BEYOND_PIPS = 2;

/** Bars after the pair within which price must reverse back through the level. */
const SWEEP_REVERSAL_WINDOW_BARS = 6;

/** Tolerance for counting prior touches of the level being swept. */
const SWEEP_PRIOR_TOUCH_TOL_PIPS = 2;

/** Minimum history bars before a sweep pair can be evaluated. */
const SWEEP_MIN_HISTORY_BARS = 5;

// ── Type 2: LONG_WICK ────────────────────────────────────────────────────────

/** Long wick = ≥ 2.5× body length (user spec: 2-3×; midpoint used). */
const LONG_WICK_BODY_MULT = 2.5;

/** Long wick absolute floor — 2.5× body alone is never sufficient (anti-noise). */
const LONG_WICK_MIN_PIPS = 5;

/** Bars after the wick within which the sharp move must occur. */
const SHARP_MOVE_WINDOW_BARS = 3;

/** Sharp move floor in pips. */
const SHARP_MOVE_MIN_PIPS = 15;

/** Sharp move ATR multiple — the larger of the two thresholds applies. */
const SHARP_MOVE_ATR_MULT = 1.5;

// ── Type 3: SHORT_WICK_CONSOL ────────────────────────────────────────────────

/** A "short" wick is ≤ 3 pips. */
const SHORT_WICK_MAX_PIPS = 3;

/** Minimum bars whose short-wick tips align at the level. */
const SHORT_WICK_CLUSTER_MIN_BARS = 3;

/** Max spread between aligned short-wick tips, in pips. */
const SHORT_WICK_CLUSTER_TOL_PIPS = 2;

/** Max total price span of the clustered bars — proves consolidation. */
const CONSOL_MAX_SPAN_PIPS = 25;

// ── Horizontal-line confirmation ─────────────────────────────────────────────

/** Two pattern hits align when their intervals overlap within this gap (pips). */
const LQZ_ALIGN_TOLERANCE_PIPS = 3;

// ── Per-timeframe parameter sets (§2.3 Phase 2 T1) ───────────────────────────

/**
 * Sweep lookback per VISUAL_TELESCOPE_CHARTING_T2 §3.5 (1H=12/30m=20/15m=30)
 * — TF-scaled per SINGULAR_CANDLE.BARS_PER_DAY.
 *
 * The 1H entry references the canon module constants EXACTLY (single source of
 * truth — byte-identical to the pre-T1 detector). 30m/15m entries carry the
 * TF-scaled §2.3 values: pips scale with the bar-count ratio (24/48/96 bars
 * per day), lookbacks per the telescope sweepLookback, and the TF-invariant
 * event-structure params (body/wick multipliers, window/count sizes) stay at
 * canon. 4H falls back to canon (no 4H scaling table in Phase 2 T1 — a coarser
 * TF keeps the 1H-calibrated thresholds rather than inventing values).
 */
const LQZ_CANON_PARAMS: LqzTfParams = {
  sweepLevelLookbackBars: SWEEP_LEVEL_LOOKBACK_BARS,
  sweepThickBodyMult: SWEEP_THICK_BODY_MULT,
  sweepMinBeyondPips: SWEEP_MIN_BEYOND_PIPS,
  sweepReversalWindowBars: SWEEP_REVERSAL_WINDOW_BARS,
  longWickBodyMult: LONG_WICK_BODY_MULT,
  longWickMinPips: LONG_WICK_MIN_PIPS,
  sharpMoveWindowBars: SHARP_MOVE_WINDOW_BARS,
  sharpMoveMinPips: SHARP_MOVE_MIN_PIPS,
  sharpMoveAtrMult: SHARP_MOVE_ATR_MULT,
  shortWickMaxPips: SHORT_WICK_MAX_PIPS,
  shortWickClusterMinBars: SHORT_WICK_CLUSTER_MIN_BARS,
  shortWickClusterTolPips: SHORT_WICK_CLUSTER_TOL_PIPS,
  consolMaxSpanPips: CONSOL_MAX_SPAN_PIPS,
  lqzAlignTolerancePips: LQZ_ALIGN_TOLERANCE_PIPS,
};

const LQZ_TF_PARAMS: Record<LqzTimeframe, LqzTfParams> = {
  '4H': { ...LQZ_CANON_PARAMS }, // canon fallback (Phase 2 T1: no 4H table)
  '1H': { ...LQZ_CANON_PARAMS }, // canon — byte-identical to pre-T1 behavior
  '30m': {
    sweepLevelLookbackBars: 20,
    sweepThickBodyMult: 1.5,
    sweepMinBeyondPips: 1.5,
    sweepReversalWindowBars: 5,
    longWickBodyMult: 2.5,
    longWickMinPips: 3,
    sharpMoveWindowBars: 3,
    sharpMoveMinPips: 10,
    sharpMoveAtrMult: 1.5,
    shortWickMaxPips: 2,
    shortWickClusterMinBars: 3,
    shortWickClusterTolPips: 1.5,
    consolMaxSpanPips: 15,
    lqzAlignTolerancePips: 2,
  },
  '15m': {
    sweepLevelLookbackBars: 30,
    sweepThickBodyMult: 1.5,
    sweepMinBeyondPips: 1,
    sweepReversalWindowBars: 4,
    longWickBodyMult: 2.5,
    longWickMinPips: 2,
    sharpMoveWindowBars: 3,
    sharpMoveMinPips: 6,
    sharpMoveAtrMult: 1.5,
    shortWickMaxPips: 1.5,
    shortWickClusterMinBars: 3,
    shortWickClusterTolPips: 1,
    consolMaxSpanPips: 8,
    lqzAlignTolerancePips: 1,
  },
};

/** Canonical pattern ordering for zone tags (strongest/most distinct first). */
const PATTERN_ORDER: readonly LqzPatternType[] = ['LIQUIDITY_SWEEP', 'LONG_WICK', 'SHORT_WICK_CONSOL'];

// ── Zone count control ───────────────────────────────────────────────────────

/** Max zones inside the tradeable range around current price. */
const LQZ_TRADEABLE_MAX_ZONES = 20;

/** Max zones across the entire week of bars. */
const LQZ_WEEK_MAX_ZONES = 50;

/** Absolute defensive ceiling on emitted zones. */
const LQZ_HARD_CEILING = 75;

/** Tradeable range = 4×ATR, clamped to [25, 100] pips. */
const TRADEABLE_RANGE_ATR_MULT = 4;
const TRADEABLE_RANGE_MIN_PIPS = 25;
const TRADEABLE_RANGE_MAX_PIPS = 100;

// ── Shared ───────────────────────────────────────────────────────────────────

/** ATR lookback for adaptive thresholds. */
const ATR_PERIOD = 14;

/** Forward window (bars) used to measure post-consolidation excursion. */
const REJECTION_WINDOW_BARS = 12;

/** Zones wider than this (pips) are THICK, else THIN (mirrors LSZ detector). */
const THICK_THRESHOLD_PIPS = 15;

/** Minimum zone width so floor/ceiling never collapse to a line. */
const LQZ_MIN_WIDTH_PIPS = 1;

/** Merge rule: LQZ within this many pips of an IP zone promotes that zone. */
const LQZ_IP_MERGE_TOLERANCE_PIPS = 5;

/** Confluence cap (matches multi-TF merge cap in the pipeline). */
const CONFLUENCE_CAP = 14;

/** Liquidity score cap (0-10 scale per DXYZone.liquidityScore). */
const LIQUIDITY_SCORE_CAP = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect liquidity zones from OHLC candles.
 *
 * Runs the 3 LQ-candle detectors over the last `lookbackBars` candles using
 * the thresholds for `timeframe` (1H canon by default), keeps only levels
 * where 2+ pattern types align on a horizontal line, applies the 20/50/75
 * zone-count caps, and returns zones sorted by reaction_pips descending
 * (strongest proven liquidity first). Every emitted zone is tagged with the
 * `timeframe` it was detected on.
 *
 * When the scanned bars fall below the timeframe's minimum window
 * (sweepLevelLookbackBars + sharpMoveWindowBars + 20) the result is an EMPTY
 * array carrying a `completeness` note — never a throw. An unsupported
 * timeframe value IS a throw (TypeError, totality).
 *
 * @param pair         Instrument key (e.g. 'EUR/USD', 'DXY') for pip scaling
 * @param candles      OHLC bars (any length; truncated to lookback)
 * @param lookbackBars Max bars to scan (default LQZ_LOOKBACK_BARS = 720 ≈ 6 weeks)
 * @param stats        Optional runtime observability (hit counts, caps, completeness)
 * @param timeframe    Detection timeframe: '4H' | '1H' (default) | '30m' | '15m'
 * @returns Confirmed, capped liquidity zones (strongest reaction first);
 *          an empty array with `.completeness` when data is insufficient
 */
/**
 * Runtime observability for LQZ detection. The lobe is a pure module with no
 * logger — the caller passes this stats object to see per-detector hit counts,
 * alignment groups, and how many single-type groups the confirmation rule
 * discarded (the silent killer: buildConfirmedZone returns null for them).
 */
export interface LqzDetectionStats {
  barsScanned: number;
  sweepHits: number;
  wickHits: number;
  consolHits: number;
  totalHits: number;
  alignedGroups: number;
  discardedSingleTypeGroups: number;
  confirmedZones: number;
  cappedZones: number;
  /** Set when the scan could not run to full depth — e.g. fewer bars than the
   *  timeframe's minimum window. Explains WHY an empty/short result was
   *  returned instead of throwing. */
  completeness?: string;
}

/**
 * LQZ detection result — a LiquidZone[] that may carry a `completeness` note
 * describing why the scan could not run to full depth (insufficient bars for
 * the timeframe's minimum window). The note rides on the array itself, so
 * callers iterating or passing the result onward are completely unaffected.
 */
export interface LqzDetectionResult extends Array<LiquidZone> {
  completeness?: string;
}

export function detectLiquidityZones(
  pair: string,
  candles: OHLCBar[],
  lookbackBars: number = LQZ_LOOKBACK_BARS,
  stats?: LqzDetectionStats,
  timeframe: LqzTimeframe = '1H',
): LqzDetectionResult {
  const params = LQZ_TF_PARAMS[timeframe];
  if (params === undefined) {
    // Totality: an unsupported timeframe is a hard contract violation, never a
    // silent empty result — invalid input must not masquerade as "no zones".
    throw new TypeError(
      `detectLiquidityZones: unsupported timeframe '${String(timeframe)}' — expected one of 4H/1H/30m/15m`,
    );
  }

  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const result: LqzDetectionResult = [];
  if (candles.length < LQZ_MIN_BARS) {
    const message = `insufficient bars (${candles.length}) for LQZ detection (minimum ${LQZ_MIN_BARS})`;
    result.completeness = message;
    if (stats) stats.completeness = message;
    return result;
  }

  const bars = candles.length > lookbackBars
    ? candles.slice(candles.length - lookbackBars)
    : candles;

  // Timeframe minimum window: sweep level lookback + sharp-move window + 20
  // (20 = LQZ_MIN_BARS floor for stable avg-body/ATR baselines). Below it the
  // detectors cannot see a full event horizon — return an empty result with a
  // completeness note instead of silently scanning noise (never throw).
  const minWindow = params.sweepLevelLookbackBars + params.sharpMoveWindowBars + 20;
  if (bars.length < minWindow) {
    const message =
      `insufficient bars (${bars.length}) for ${timeframe} minimum window (${minWindow})`;
    result.completeness = message;
    if (stats) stats.completeness = message;
    return result;
  }

  const avgBody = computeAvgBody(bars);
  const atr = computeAtr(bars, ATR_PERIOD);

  const sweepHits = detectLiquiditySweeps(bars, pipValue, avgBody, params);
  const wickHits = detectLongWickSharpMoves(bars, pipValue, atr, params);
  const consolHits = detectShortWickConsolidations(bars, pipValue, params);
  const hits: PatternHit[] = [...sweepHits, ...wickHits, ...consolHits];

  const groups = groupAlignedHits(hits, pipValue, params);
  const zones: LiquidZone[] = [];
  let discardedSingleType = 0;
  for (const members of groups) {
    const zone = buildConfirmedZone(members, pipValue);
    if (zone) {
      zone.timeframe = timeframe;
      zones.push(zone);
    } else discardedSingleType++;
  }

  const lastClose = bars[bars.length - 1]!.close;
  const tradeableRange = clamp(
    TRADEABLE_RANGE_ATR_MULT * atr,
    TRADEABLE_RANGE_MIN_PIPS * pipValue,
    TRADEABLE_RANGE_MAX_PIPS * pipValue,
  );

  const capped: LqzDetectionResult = applyZoneCaps(zones, lastClose, tradeableRange);
  capped.sort((a, b) => b.reaction_pips - a.reaction_pips);

  if (stats) {
    stats.barsScanned = bars.length;
    stats.sweepHits = sweepHits.length;
    stats.wickHits = wickHits.length;
    stats.consolHits = consolHits.length;
    stats.totalHits = hits.length;
    stats.alignedGroups = groups.length;
    stats.discardedSingleTypeGroups = discardedSingleType;
    stats.confirmedZones = zones.length;
    stats.cappedZones = capped.length;
  }

  return capped;
}

/**
 * Merge detected liquidity zones into the Engine 1 IP zone map.
 *
 * @param ipZones Existing zones (BoM/MoM S/D zones from multi-TF merge)
 * @param lqzList Liquidity zones from detectLiquidityZones()
 * @param pair    Instrument key for pip scaling
 * @returns The zone array with promoted IP zones and appended LQZ zones
 */
export function mergeLqzWithIpZones(
  ipZones: DXYZone[],
  lqzList: LiquidZone[],
  pair: string,
): DXYZone[] {
  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const tolerance = LQZ_IP_MERGE_TOLERANCE_PIPS * pipValue;
  const now = Date.now();
  const pairKey = pair.replace('/', '').toLowerCase();
  const result = [...ipZones];

  for (let i = 0; i < lqzList.length; i++) {
    const lqz = lqzList[i]!;
    const lqzLiquidity = liquidityScoreFor(lqz);

    // Side-compatible overlap test: zones overlap (gap ≤ 5 pips) AND the
    // liquidity side matches the zone's order flow — BUY_SIDE liquidity
    // strengthens supply zones only, SELL_SIDE strengthens demand only.
    const isBuySide = lqz.side === 'BUY_SIDE';
    const match = result.find((z) => {
      const zIsSupply = z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.BOM_SUPPLY;
      if (isBuySide !== zIsSupply) return false;
      const gap = Math.max(lqz.bottom, z.floor) - Math.min(lqz.top, z.ceiling);
      return gap <= tolerance;
    });

    if (match) {
      // ── Promote pressure: LQZ confluence strengthens the existing IP zone ──
      match.confluence = Math.min(CONFLUENCE_CAP, (match.confluence ?? 0) + 2);
      // The honest-data law (the operator, 2026-08-04): "GET THE CORRECT
      // FUCKING DATA OR THROW ERROR... NO FALLBACK FABRICATED BULLSHIT" — the
      // zfp promotion runs ONLY on a zone with a computed zfp (the report path
      // always carries the 6D-confluence zfp); a zfp-less zone is NEVER given
      // a fabricated placeholder — the arithmetic is skipped (the LQZ×IP
      // overlap evidence is real regardless; only the zfp needs the value).
      if (match.zfp !== undefined) {
        match.zfp = Math.max(0, match.zfp - 5);
      }
      match.sdOverlap = 'LQZ';
      match.liquidityScore = Math.min(
        LIQUIDITY_SCORE_CAP,
        Math.max(match.liquidityScore ?? 0, lqzLiquidity),
      );
      match.keyLevels = match.keyLevels ?? [];
      if (!match.keyLevels.some((k) => Math.abs(k - lqz.level) <= pipValue)) {
        match.keyLevels.push(lqz.level);
        match.keyLevels.sort((a, b) => a - b);
      }
      continue;
    }

    // ── No overlap → standalone MoM zone tagged LQZ ──
    // BUY_SIDE liquidity above price = supply zone; SELL_SIDE below = demand.
    result.push({
      id: `${pairKey}-lqz-${lqz.side.toLowerCase()}-${i}-${now}`,
      timeframe: lqz.timeframe ?? '1H',
      floor: lqz.bottom,
      ceiling: lqz.top,
      type: isBuySide ? ZoneType.MOM_SUPPLY : ZoneType.MOM_DEMAND,
      isBoM: false,
      sdType: 'MoM',
      sdOverlap: 'LQZ',
      reactionCount: lqz.touch_count,
      confluence: 1,
      pillars: [0],
      // LQZ-specific zfp (the canon ladder — never a placeholder; the old
      // the old placeholder zfp killed every LQZ entry at the
      // SS/WL filters, and the golden entries were AT fresh LQZ rungs).
      // LQZ semantics differ from MoM depletion: a CONFIRMED LQZ (2+ pattern
      // types) is a STRONG liquidity level by construction — repeated sweeps
      // that HOLD prove the liquidity, they don't deplete it (the operator's
      // rungs are multi-week shelves). Only heavy exhaustion (many touches)
      // raises zfp. Base = 20 (Hard Wall — the golden LQZ rungs are Hard Walls
      // when fresh); +5 per 2 touches beyond 3 (exhaustion).
      zfp: Math.min(60, 20 + Math.max(0, Math.floor((lqz.touch_count - 3) / 2)) * 5),
      createdAt: lqz.first_seen > 0 ? lqz.first_seen : now,
      lastTested: lqz.last_seen > 0 ? lqz.last_seen : null,
      sdFresh: computeSdFresh(lqz.touch_count),
      keyLevels: [lqz.level],
      formedAfterConsolidation: lqz.patterns.includes('SHORT_WICK_CONSOL'),
      liquidityScore: lqzLiquidity,
      zoneName: `LQZ-${lqz.patterns.join('+')}`,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE 1: LIQUIDITY SWEEP CANDLES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find 2 back-to-back thick-body candle pairs that BREAK a prior
 * support/resistance level with an extended wick beyond it, followed by
 * price REVERSING back through the level within 6 bars.
 *
 *   Upward sweep   — bullish pair closes above the 24-bar high, wick tip
 *                    extends ≥ 2 pips beyond it, then low trades back below
 *                    the level. Buy stops above resistance were swept
 *                    (BUY_SIDE liquidity → supply).
 *   Downward sweep — mirror image through the 24-bar low (SELL_SIDE → demand).
 */
function detectLiquiditySweeps(
  bars: OHLCBar[],
  pipValue: number,
  avgBody: number,
  params: LqzTfParams,
): PatternHit[] {
  const hits: PatternHit[] = [];
  if (avgBody <= 0) return hits;

  const minBody = params.sweepThickBodyMult * avgBody;
  const beyondTol = params.sweepMinBeyondPips * pipValue;
  const priorTouchTol = SWEEP_PRIOR_TOUCH_TOL_PIPS * pipValue;

  for (let i = SWEEP_MIN_HISTORY_BARS; i + 2 < bars.length; i++) {
    const a = bars[i]!;
    const b = bars[i + 1]!;
    const aa = barAnatomy(a);
    const ab = barAnatomy(b);

    // Both candles must be thick-bodied.
    if (aa.bodySize < minBody || ab.bodySize < minBody) continue;

    const lookStart = Math.max(0, i - params.sweepLevelLookbackBars);
    const revEnd = Math.min(bars.length, i + 2 + params.sweepReversalWindowBars);

    // ── Upward sweep: bullish pair breaking resistance ──
    if (a.close > a.open && b.close > b.open) {
      let level = -Infinity;
      for (let j = lookStart; j < i; j++) level = Math.max(level, bars[j]!.high);

      const wickTip = Math.max(a.high, b.high);
      const breaksLevel = a.close > level || b.close > level;
      const wickBeyond = wickTip >= level + beyondTol;
      const hasExtendedWick = aa.upperWick > 0 || ab.upperWick > 0;

      if (breaksLevel && wickBeyond && hasExtendedWick) {
        // Reversal proof: price trades back through the broken level.
        let minLow = Infinity;
        for (let j = i + 2; j < revEnd; j++) minLow = Math.min(minLow, bars[j]!.low);

        if (minLow < level) {
          hits.push({
            type: 'LIQUIDITY_SWEEP',
            level: (level + wickTip) / 2,
            top: wickTip,
            bottom: level,
            side: 'BUY_SIDE',
            touch_count: 2 + countPriorTouches(bars, lookStart, i, level, priorTouchTol, 'high'),
            reaction_pips: round1((wickTip - minLow) / pipValue),
            first_seen: a.timestamp,
            last_seen: b.timestamp,
            firstIdx: i,
            lastIdx: i + 1,
          });
          continue; // a pair is never both an up and down sweep
        }
      }
    }

    // ── Downward sweep: bearish pair breaking support ──
    if (a.close < a.open && b.close < b.open) {
      let level = Infinity;
      for (let j = lookStart; j < i; j++) level = Math.min(level, bars[j]!.low);

      const wickTip = Math.min(a.low, b.low);
      const breaksLevel = a.close < level || b.close < level;
      const wickBeyond = wickTip <= level - beyondTol;
      const hasExtendedWick = aa.lowerWick > 0 || ab.lowerWick > 0;

      if (breaksLevel && wickBeyond && hasExtendedWick) {
        // Reversal proof: price trades back up through the broken level.
        let maxHigh = -Infinity;
        for (let j = i + 2; j < revEnd; j++) maxHigh = Math.max(maxHigh, bars[j]!.high);

        if (maxHigh > level) {
          hits.push({
            type: 'LIQUIDITY_SWEEP',
            level: (level + wickTip) / 2,
            top: level,
            bottom: wickTip,
            side: 'SELL_SIDE',
            touch_count: 2 + countPriorTouches(bars, lookStart, i, level, priorTouchTol, 'low'),
            reaction_pips: round1((maxHigh - wickTip) / pipValue),
            first_seen: a.timestamp,
            last_seen: b.timestamp,
            firstIdx: i,
            lastIdx: i + 1,
          });
        }
      }
    }
  }

  return hits;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE 2: LONG WICKS IMMEDIATELY PRECEDING A SHARP MOVE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find bars with a dominant wick ≥ 2.5× body (and ≥ 5 pips absolute)
 * immediately followed (≤ 3 bars) by a SHARP move of
 * ≥ max(15 pips, 1.5×ATR) away from the wick. The wick grabs liquidity,
 * the sharp move proves the grab worked.
 *
 *   Lower wick → sell stops swept → SELL_SIDE liquidity (demand).
 *   Upper wick → buy stops swept  → BUY_SIDE liquidity (supply).
 */
function detectLongWickSharpMoves(
  bars: OHLCBar[],
  pipValue: number,
  atr: number,
  params: LqzTfParams,
): PatternHit[] {
  const hits: PatternHit[] = [];
  const minWick = params.longWickMinPips * pipValue;
  const sharpMin = Math.max(params.sharpMoveMinPips * pipValue, params.sharpMoveAtrMult * atr);

  for (let i = 0; i + 1 < bars.length; i++) {
    const bar = bars[i]!;
    const an = barAnatomy(bar);
    const end = Math.min(bars.length, i + 1 + params.sharpMoveWindowBars);

    // ── Lower long wick → sharp upward move ──
    if (
      an.lowerWick >= minWick &&
      an.lowerWick >= params.longWickBodyMult * an.bodySize &&
      an.lowerWick >= an.upperWick
    ) {
      let maxHigh = -Infinity;
      for (let j = i + 1; j < end; j++) maxHigh = Math.max(maxHigh, bars[j]!.high);
      const move = maxHigh - bar.low;

      if (move >= sharpMin) {
        hits.push({
          type: 'LONG_WICK',
          level: (bar.low + an.bodyBottom) / 2,
          top: an.bodyBottom,
          bottom: bar.low,
          side: 'SELL_SIDE',
          touch_count: 1,
          reaction_pips: round1(move / pipValue),
          first_seen: bar.timestamp,
          last_seen: bar.timestamp,
          firstIdx: i,
          lastIdx: i,
        });
        continue;
      }
    }

    // ── Upper long wick → sharp downward move ──
    if (
      an.upperWick >= minWick &&
      an.upperWick >= params.longWickBodyMult * an.bodySize &&
      an.upperWick > an.lowerWick
    ) {
      let minLow = Infinity;
      for (let j = i + 1; j < end; j++) minLow = Math.min(minLow, bars[j]!.low);
      const move = bar.high - minLow;

      if (move >= sharpMin) {
        hits.push({
          type: 'LONG_WICK',
          level: (an.bodyTop + bar.high) / 2,
          top: bar.high,
          bottom: an.bodyTop,
          side: 'BUY_SIDE',
          touch_count: 1,
          reaction_pips: round1(move / pipValue),
          first_seen: bar.timestamp,
          last_seen: bar.timestamp,
          firstIdx: i,
          lastIdx: i,
        });
      }
    }
  }

  return hits;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE 3: S/R CONSOLIDATION WITH REPEATED SHORT WICKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find 3+ bars whose SHORT wick tips (≤ 3 pips) align within 2 pips while
 * the clustered bars span ≤ 25 pips total — a consolidation repeatedly
 * probing the same level. Smaller and less obvious than sweeps, but these
 * map the zone EDGES precisely.
 *
 *   Aligned upper tips at the range top → BUY_SIDE liquidity (supply).
 *   Aligned lower tips at the range bottom → SELL_SIDE liquidity (demand).
 */
function detectShortWickConsolidations(
  bars: OHLCBar[],
  pipValue: number,
  params: LqzTfParams,
): PatternHit[] {
  const hits: PatternHit[] = [];
  const maxWick = params.shortWickMaxPips * pipValue;
  const tolerance = params.shortWickClusterTolPips * pipValue;

  const upperTips: Array<{ price: number; idx: number }> = [];
  const lowerTips: Array<{ price: number; idx: number }> = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]!;
    const an = barAnatomy(bar);
    if (an.upperWick <= maxWick) upperTips.push({ price: bar.high, idx: i });
    if (an.lowerWick <= maxWick) lowerTips.push({ price: bar.low, idx: i });
  }

  for (const cluster of clusterByPrice(upperTips, tolerance, params.shortWickClusterMinBars)) {
    const hit = buildShortWickHit(bars, cluster, 'BUY_SIDE', pipValue, params);
    if (hit) hits.push(hit);
  }
  for (const cluster of clusterByPrice(lowerTips, tolerance, params.shortWickClusterMinBars)) {
    const hit = buildShortWickHit(bars, cluster, 'SELL_SIDE', pipValue, params);
    if (hit) hits.push(hit);
  }

  return hits;
}

function buildShortWickHit(
  bars: OHLCBar[],
  cluster: Array<{ price: number; idx: number }>,
  side: 'BUY_SIDE' | 'SELL_SIDE',
  pipValue: number,
  params: LqzTfParams,
): PatternHit | null {
  // Require 3+ DISTINCT bars (one bar contributes at most one tip per side).
  const distinctBars = new Set(cluster.map((t) => t.idx));
  if (distinctBars.size < params.shortWickClusterMinBars) return null;

  let tipMin = Infinity;
  let tipMax = -Infinity;
  let firstIdx = cluster[0]!.idx;
  let lastIdx = cluster[0]!.idx;
  for (const tip of cluster) {
    if (tip.price < tipMin) tipMin = tip.price;
    if (tip.price > tipMax) tipMax = tip.price;
    if (tip.idx < firstIdx) firstIdx = tip.idx;
    if (tip.idx > lastIdx) lastIdx = tip.idx;
  }

  // Consolidation proof: the clustered bars must span a compressed range.
  let spanTop = -Infinity;
  let spanBottom = Infinity;
  for (const idx of distinctBars) {
    const bar = bars[idx]!;
    if (bar.high > spanTop) spanTop = bar.high;
    if (bar.low < spanBottom) spanBottom = bar.low;
  }
  if ((spanTop - spanBottom) / pipValue > params.consolMaxSpanPips) return null;

  const level = cluster.reduce((sum, t) => sum + t.price, 0) / cluster.length;
  const bounds = enforceMinWidth(tipMin, tipMax, level, pipValue);

  return {
    type: 'SHORT_WICK_CONSOL',
    level,
    top: bounds.top,
    bottom: bounds.bottom,
    side,
    touch_count: distinctBars.size,
    reaction_pips: measurePostTouchExcursion(bars, lastIdx, level, pipValue),
    first_seen: bars[firstIdx]!.timestamp,
    last_seen: bars[lastIdx]!.timestamp,
    firstIdx,
    lastIdx,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HORIZONTAL-LINE CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Group pattern hits that sit on the same horizontal line: same side, and
 * their [bottom, top] intervals overlap within LQZ_ALIGN_TOLERANCE_PIPS.
 * Sorted single-pass interval grouping; group envelopes expand as members
 * join, so a wide sweep zone links to a thin consol-edge zone on the line.
 */
function groupAlignedHits(
  hits: PatternHit[],
  pipValue: number,
  params: LqzTfParams,
): PatternHit[][] {
  const tolerance = params.lqzAlignTolerancePips * pipValue;
  const sorted = [...hits].sort((a, b) => {
    if (a.side !== b.side) return a.side < b.side ? -1 : 1;
    return a.bottom - b.bottom;
  });

  const groups: Array<{ side: 'BUY_SIDE' | 'SELL_SIDE'; top: number; bottom: number; members: PatternHit[] }> = [];

  for (const hit of sorted) {
    const group = groups.find(
      (g) => g.side === hit.side && hit.bottom <= g.top + tolerance && hit.top >= g.bottom - tolerance,
    );
    if (group) {
      group.members.push(hit);
      if (hit.top > group.top) group.top = hit.top;
      if (hit.bottom < group.bottom) group.bottom = hit.bottom;
    } else {
      groups.push({ side: hit.side, top: hit.top, bottom: hit.bottom, members: [hit] });
    }
  }

  return groups.map((g) => g.members);
}

/**
 * Build a confirmed LiquidZone from an aligned group. The CRITICAL rule:
 * the group must contain ≥ 2 DISTINCT pattern types — the user maps an LQ
 * zone only where 2 or all 3 LQ candle types line up horizontally.
 */
function buildConfirmedZone(members: PatternHit[], pipValue: number): LiquidZone | null {
  const distinctTypes = new Set(members.map((m) => m.type));
  if (distinctTypes.size < 2) return null;

  let top = -Infinity;
  let bottom = Infinity;
  let firstSeen = Infinity;
  let lastSeen = -Infinity;
  let firstIdx: number | undefined;
  let lastIdx: number | undefined;
  let touchCount = 0;
  let reactionPips = 0;

  for (const m of members) {
    if (m.top > top) top = m.top;
    if (m.bottom < bottom) bottom = m.bottom;
    if (m.first_seen < firstSeen) firstSeen = m.first_seen;
    if (m.last_seen > lastSeen) lastSeen = m.last_seen;
    if (m.firstIdx !== undefined && (firstIdx === undefined || m.firstIdx < firstIdx)) firstIdx = m.firstIdx;
    if (m.lastIdx !== undefined && (lastIdx === undefined || m.lastIdx > lastIdx)) lastIdx = m.lastIdx;
    touchCount += m.touch_count;
    if (m.reaction_pips > reactionPips) reactionPips = m.reaction_pips;
  }

  const level = (top + bottom) / 2;

  // Reaction-age weighting (operator doctrine): a level confirmed across a
  // wide bar-span is a max-validity LQZ. Bar indices preferred; fall back to
  // a timestamp-derived span (1H bars) when indices are absent — NEVER read
  // an unpopulated field without a guard.
  const span = firstIdx !== undefined && lastIdx !== undefined
    ? lastIdx - firstIdx + 1
    : Math.max(1, Math.round((lastSeen - firstSeen) / 3_600_000) + 1);
  const ageMultiplier = span >= LQZ_LOOKBACK_BARS ? LQZ_AGE_CONFIDENCE_MAX : span / LQZ_LOOKBACK_BARS;
  const boost = Math.min(10, span / 144) * ageMultiplier;
  const confirmationSpanBars = span;
  const ageConfidenceBoost = Math.round(boost * 10) / 10;
  const confidence = Math.min(100, 50 + Math.round(boost * 10));

  return {
    level,
    top,
    bottom,
    side: members[0]!.side,
    patterns: PATTERN_ORDER.filter((p) => distinctTypes.has(p)),
    touch_count: touchCount,
    reaction_pips: reactionPips,
    first_seen: firstSeen,
    last_seen: lastSeen,
    quality: thickness(bottom, top, pipValue),
    inTradeableRange: false, // set by applyZoneCaps
    confirmationSpanBars,
    ageConfidenceBoost,
    confidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE COUNT CONTROL (20 tradeable / 50 week / 75 hard ceiling)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rank zones by strength and apply the count caps:
 *   - ≤ 20 zones inside the tradeable range around current price,
 *   - ≤ 50 zones total across the week,
 *   - ≤ 75 as an absolute defensive ceiling.
 * Strength = reaction_pips + 2×touches + 10×pattern-diversity, so
 * multi-pattern zones with proven reactions survive the cut.
 */
function applyZoneCaps(zones: LiquidZone[], lastClose: number, tradeableRange: number): LiquidZone[] {
  const score = (z: LiquidZone): number =>
    z.reaction_pips + 2 * z.touch_count + 10 * z.patterns.length;

  for (const z of zones) {
    z.inTradeableRange = Math.abs(z.level - lastClose) <= tradeableRange;
  }

  const ranked = [...zones].sort((a, b) => score(b) - score(a));
  const selected = ranked.filter((z) => z.inTradeableRange).slice(0, LQZ_TRADEABLE_MAX_ZONES);

  for (const z of ranked) {
    if (selected.length >= LQZ_WEEK_MAX_ZONES) break;
    if (!z.inTradeableRange) selected.push(z);
  }

  return selected.slice(0, LQZ_HARD_CEILING);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Decompose a bar into body / wick anatomy. */
function barAnatomy(bar: OHLCBar): {
  bodyTop: number;
  bodyBottom: number;
  bodySize: number;
  upperWick: number;
  lowerWick: number;
} {
  const bodyTop = Math.max(bar.open, bar.close);
  const bodyBottom = Math.min(bar.open, bar.close);
  return {
    bodyTop,
    bodyBottom,
    bodySize: bodyTop - bodyBottom,
    upperWick: bar.high - bodyTop,
    lowerWick: bodyBottom - bar.low,
  };
}

/** Mean absolute body size over the window (adaptive thick-body baseline). */
function computeAvgBody(bars: OHLCBar[]): number {
  if (bars.length === 0) return 0;
  let sum = 0;
  for (const bar of bars) sum += Math.abs(bar.close - bar.open);
  return sum / bars.length;
}

/** Simple average true range over the last `period` bars. */
function computeAtr(bars: OHLCBar[], period: number): number {
  if (bars.length < 2) return 0;
  const start = Math.max(1, bars.length - period);
  let sum = 0;
  let count = 0;
  for (let i = start; i < bars.length; i++) {
    const cur = bars[i]!;
    const prev = bars[i - 1]!;
    sum += Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
    count++;
  }
  return count > 0 ? sum / count : 0;
}

/** Count bars in [startIdx, endIdx) whose `field` extreme sits within tol of level. */
function countPriorTouches(
  bars: OHLCBar[],
  startIdx: number,
  endIdx: number,
  level: number,
  tolerance: number,
  field: 'high' | 'low',
): number {
  let count = 0;
  for (let j = startIdx; j < endIdx; j++) {
    if (Math.abs(bars[j]![field] - level) <= tolerance) count++;
  }
  return count;
}

/**
 * Greedy min-anchored clustering over price-tagged points.
 * Points are sorted by price; a point joins the current cluster only while
 * the full cluster span stays within `tolerance` (prevents chain-merging).
 */
function clusterByPrice(
  points: Array<{ price: number; idx: number }>,
  tolerance: number,
  minSize: number,
): Array<Array<{ price: number; idx: number }>> {
  if (points.length < minSize) return [];

  const sorted = [...points].sort((a, b) => a.price - b.price);
  const clusters: Array<Array<{ price: number; idx: number }>> = [];
  let current: Array<{ price: number; idx: number }> = [sorted[0]!];

  for (let i = 1; i <= sorted.length; i++) {
    const point = i < sorted.length ? sorted[i]! : undefined;
    if (point !== undefined && point.price - current[0]!.price <= tolerance) {
      current.push(point);
      continue;
    }
    if (current.length >= minSize) clusters.push(current);
    current = point !== undefined ? [point] : [];
  }

  return clusters;
}

/**
 * Max excursion away from `level` in the REJECTION_WINDOW_BARS after
 * `fromIdx`, in pips. Used for short-wick consolidations where the
 * rejection direction is not known in advance.
 */
function measurePostTouchExcursion(
  bars: OHLCBar[],
  fromIdx: number,
  level: number,
  pipValue: number,
): number {
  let best = 0;
  const end = Math.min(bars.length, fromIdx + 1 + REJECTION_WINDOW_BARS);
  for (let i = fromIdx + 1; i < end; i++) {
    const bar = bars[i]!;
    const up = (bar.high - level) / pipValue;
    const down = (level - bar.low) / pipValue;
    const excursion = Math.max(up, down);
    if (excursion > best) best = excursion;
  }
  return round1(best);
}

/** Ensure a zone is at least LQZ_MIN_WIDTH_PIPS wide, centered on level. */
function enforceMinWidth(
  bottom: number,
  top: number,
  level: number,
  pipValue: number,
): { bottom: number; top: number } {
  const minWidth = LQZ_MIN_WIDTH_PIPS * pipValue;
  if (top - bottom >= minWidth) return { bottom, top };
  return { bottom: level - minWidth / 2, top: level + minWidth / 2 };
}

/** THICK if wider than THICK_THRESHOLD_PIPS, else THIN. */
function thickness(bottom: number, top: number, pipValue: number): 'THICK' | 'THIN' {
  return (top - bottom) / pipValue > THICK_THRESHOLD_PIPS ? 'THICK' : 'THIN';
}

/** Freshness tag (mirrors 4h-sd-lobe computeSdFresh). */
function computeSdFresh(reactionCount: number): string {
  if (reactionCount === 0) return '0X';
  if (reactionCount === 1) return '1S';
  if (reactionCount === 2) return '2X';
  return '3X+';
}

/** Liquidity score 0-10: touches plus pattern-diversity bonus. */
function liquidityScoreFor(lqz: LiquidZone): number {
  return Math.min(LIQUIDITY_SCORE_CAP, lqz.touch_count + 3 * lqz.patterns.length);
}

/** Round to 1 decimal (pip measurements). */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Clamp value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
