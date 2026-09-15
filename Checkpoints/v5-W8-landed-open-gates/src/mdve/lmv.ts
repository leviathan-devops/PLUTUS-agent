/**
 * MDVE LMV — the Liquidity Matrix Vision engine (PLUTUS_V4.5_SPEC §2, EXACT).
 *
 * ═══════════════════════════════════════════════════════════════
 * "Create a matrix data set based on linear algebra or other MPSE
 * concepts that groups ALL visible ranges of LQZs from candlestick
 * data (the OHLC of several if not dozens of candles across the last
 * 1-6 weeks all reacting to the same price range = clear liquidity
 * zone). Group all of these into matrices so each zone's OHLC data
 * from X number of candles = 1 matrix. We will have a table of
 * matrices denoting exactly what are all the LQZ ranges."
 *                                                          — the operator (§2.1)
 *
 * LMV formalizes the v4.4 LQZ-detection into a FIRST-CLASS MATRIX
 * DATASET: one LqzZoneMatrix per LQZ, holding the OHLC of the X
 * candles that reacted to that range, plus the matrix reductions
 * (reactionExtreme = the SL anchor, defendedEdge = the entry anchor)
 * that every v4.5 E/SL fix consumes (§2.4, Appendix C).
 *
 * THE ALGORITHM (§2.3):
 *   Stage 1 — REACTION EXTRACTION: every bar's interaction with each
 *             candidate level is classified by the canon piecewise-
 *             TOTAL predicate classifyTouch (imported from lqz-matrix
 *             — SWEEP / WICK_REJECT / BODY_DEFEND / CONSOL_DWELL;
 *             PASS_THROUGH is NOT a touch, excluded).
 *   Stage 2 — SWING-POINT CLUSTERING: the v4.4 validated core,
 *             re-implemented BY CITATION (byte-identical point
 *             selection + clustering behavior — lqz-matrix.ts is
 *             FROZEN, its extractor is not exported, so the exact
 *             logic is reproduced here with line citations).
 *   Stage 3 — ZONE-MATRIX ASSEMBLY (NEW — the LMV formalization):
 *             each candidate cluster's reaction candles → the candles
 *             matrix; the canon confirmation gate (≥3 candles, ≥2
 *             distinct kinds); the column reductions (reactionExtreme,
 *             defendedEdge, sweepCount, touchKinds, weekSpan, zfp).
 *             L1 (2026-07-31) — MODAL-CLUSTER EMISSION: zone-matrices
 *             are emitted one per MODAL bodyClose cluster (1-pip
 *             quantum), not one per swing-point cluster — a cluster may
 *             emit MULTIPLE rungs, and center/defendedEdge = the modal
 *             level (not the prominence-weighted mean). The
 *             100.945/100.975 and 101.235/101.240 pairs emit distinct.
 *   Stage 4 — COMPLETENESS (MPSE Structure 9): the coverage record
 *             spans the observed price range at the canon 0.25×ATR
 *             bucket width — the model is total over price × time.
 *
 * RELATIONSHIP TO THE v4.4 MATRIX (§2.3): the v4.4 LqzMatrixEntry
 * (priceCenter, top, bottom, touchEvents, zfp) is the coarse form.
 * The LMV LqzZoneMatrix ADDS the candles matrix (the raw OHLC per
 * zone) + the derived reactionExtreme / defendedEdge (the E/SL
 * anchors). The clustering (Stage 2) is unchanged (proven); Stage 3
 * is the LMV formalization.
 *
 * DETERMINISM + TOTALITY LAWS (§2.5):
 *   1. Same bars → byte-identical LmvTable. No wall-clock, no randomness.
 *   2. Total: empty bars → empty table; flat bars → no reactions →
 *      empty table. Never throws on data shape.
 *   3. Every constant has a BECAUSE (§12 Law 5).
 *   4. No hardcoded levels — every zone's range emerges from the bars.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { LQZ_LOOKBACK_BARS } from '../brains/lqz-lobe.js';
import { classifyTouch } from './lqz-matrix.js';
import type { TouchContext, Timeframe } from './lqz-matrix.js';
import type { TouchKind } from './types.js';
import { barAnatomy, computeAtr, isoWeekKey } from './util.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE TYPES (§2.2/§2.4 — EXACT; consumers depend on them)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * One row of a zone's candle matrix (§2.4 — the 8 columns).
 * Rows are chronological (deterministic order); the derived anatomy
 * columns (touchKind, wickTip, bodyClose) are the reduction inputs.
 */
export interface OhlcRow {
  timestamp: number; // col 0 — the candle's ms
  open: number;      // col 1
  high: number;      // col 2
  low: number;       // col 3
  close: number;     // col 4
  /** col 5 — the row's reaction anatomy (SWEEP/REJECT/DEFEND/DWELL). */
  touchKind: Exclude<TouchKind, 'PASS_THROUGH'>;
  /** col 6 — the extreme that did the work (low tip / high tip). */
  wickTip: number;
  /** col 7 — the close (the auction's verdict). */
  bodyClose: number;
}

/**
 * One LQZ = one matrix of the candles that reacted to its price range
 * (§2.2 the core object). The matrix reductions (§2.4) yield the exact
 * E/SL anchors — computed, never assumed.
 */
export interface LqzZoneMatrix {
  /** The range [bottom, top] of the zone (the cluster extremes). */
  bottom: number;
  top: number;
  /**
   * The MODAL rung level (L1 modal-cluster emission, 2026-07-31): the 1-pip
   * quantum bucket price of the modal bodyClose cluster — the operator's
   * drawn rung ("any price where ≥2 candles' wicks/bodies align within
   * ~1-2 pips = a rung" — ANCHOR_DOCTRINE §5.3). NOT the prominence-
   * weighted mean.
   */
  center: number;
  /**
   * The DEFENDING side (LMV semantics — §2.4, §5.3):
   *   BUY_SIDE  = demand — buyers defend the lows (the LONG-entry side);
   *               reactionExtreme = min(wickTip).
   *   SELL_SIDE = supply — sellers defend the highs (the SHORT-entry side);
   *               reactionExtreme = max(wickTip).
   * Derived from the candles' approach direction (which side probed the
   * zone and was turned), NOT from spot position: a demand shelf above a
   * depressed spot is still demand (the golden 100.845 case — §2.4).
   */
  side: 'BUY_SIDE' | 'SELL_SIDE';
  /** THE MATRIX — chronological reaction candles (|candles| = X). */
  candles: OhlcRow[];
  /** THE SL ANCHOR — BUY_SIDE: min(wickTip); SELL_SIDE: max(wickTip). */
  reactionExtreme: number;
  /**
   * THE ENTRY ANCHOR — the MODAL bodyClose level (the rung's own price):
   * the 1-pip quantum bucket where ≥ MIN_REACTION_CANDLES bodyCloses
   * aligned (L1 modal-cluster emission — not the weighted mean).
   */
  defendedEdge: number;
  /** count(touchKind == SWEEP) — sweeps consume liquidity. */
  sweepCount: number;
  /** Distinct kinds present, canon dominance order (strongest first). */
  touchKinds: TouchKind[];
  /** Distinct ISO weeks touched. */
  weekSpan: number;
  /** Canon ladder: min(60, 20 + floor((|candles| − 3) / 2) × 5). */
  zfp: number;
  /** The tier this zone-matrix was built from (default '1H' — Phase 2 T5b
   *  telescoped runs: 30m/15m rows carry their tier so provenance is
   *  unambiguous and the model's refinement pass can read parent/child
   *  relationships). */
  timeframe: Timeframe;
  /** Nested-refinement stamp (Phase 2 T5b): set when this zone-matrix's
   *  [bottom, top] is CONTAINED in a same-side HIGHER-tier zone-matrix —
   *  '30m Refined 1H' / '15m Refined 30m'. The row is KEPT (never merged
   *  into the parent) — the label records the parent it refines. Absent
   *  for 1H rows and for lower-TF rows the higher tiers cannot see (the
   *  fine rungs — exactly the telescope's purpose). */
  refinedLabel?: string;
}

/** The LMV dataset = the table of all LQZ zone-matrices, price-ordered. */
export type LmvTable = LqzZoneMatrix[];

export interface LmvResult {
  table: LmvTable;
  /**
   * Completeness (MPSE Structure 9 — §2.3 Stage 4): the observed price
   * range at the canon bucket width (0.25×ATR, floored at 1 pip) —
   * every 0.25×ATR bucket in the observed range is examined, zero-filled
   * where untouched. The model is total over price × time.
   */
  coverage: { minPrice: number; maxPrice: number; bucketWidth: number };
  /** Phase 2 T5b completeness notes: lower-TF tier runs skipped for too
   *  few bars are recorded here (never thrown — totality §2.5 Law 2).
   *  Absent when every requested tier ran (the 1H-only path omits it —
   *  byte-identical shape). */
  completenessNotes?: string[];
}

export interface LmvInput {
  pair: string;
  spot: number;
  pipValue: number;
  bars1H: OHLCBar[];
  /** Canon lookback (default 720 = 6 weeks, lqz-lobe.ts:119). */
  lookbackBars?: number;
  /** The tier's timeframe (default '1H'). BECAUSE: the emitted zone-
   *  matrices carry it — the telescoped runs' provenance (Phase 2 T5b).
   *  The matrix math is TF-agnostic (this change is plumbing only). */
  timeframe?: Timeframe;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Swing neighborhood half-width = 1 bar.
 * BECAUSE (canon — lqz-matrix.ts:58): a liquidity reaction on the 1H is
 * visible as a one-bar turn; k=2 misses the sharpest single-bar probes
 * (a wick into the level between two larger bars), which are exactly the
 * sweep/reject events the matrix exists to capture.
 */
const SWING_NEIGHBORHOOD_BARS = 1;

/**
 * Minimum swing prominence = 1 pip.
 * BECAUSE (canon — lqz-matrix.ts:69): below 1 pip the "turn" is inside
 * the spread/noise floor of the instrument (sub-pip wiggle is quoting
 * noise, not an auction reversal). Plateau leaders (prominence 0) are
 * kept — the shelf's leading edge is the structural point.
 */
const MIN_PROMINENCE_PIPS = 1;

/**
 * Cluster linkage tolerance ε = 2 pips — ALSO the band-widening for
 * reaction extraction (§2.3 Stage 3: touch price ∈ [bottom−ε, top+ε]).
 * BECAUSE (canon — lqz-matrix.ts:78): two swing points within 2 pips
 * reacted to the SAME level (the operator's rung labels sit 4-10 pips
 * apart; a 2-pip linkage resolves them while absorbing the 1-2 pip
 * auction noise around a level). The same tolerance widens the zone for
 * candle collection: a reaction candle's touch may sit up to ε beyond
 * the cluster's swing-point extremes (the wicks that formed the points).
 */
const CLUSTER_TOLERANCE_PIPS = 2;

/**
 * Maximum cluster span = 4 pips.
 * BECAUSE (canon — lqz-matrix.ts:88): single-linkage clustering must not
 * CHAIN through a staircase of swing points 2 pips apart (the mega-bucket
 * failure in miniature). At 4 pips the band is already wider than the
 * tightest labeled rungs, so the cap splits staircases into discrete steps.
 */
const CLUSTER_MAX_SPAN_PIPS = 4;

/**
 * Minimum reaction candles per zone-matrix = 3.
 * BECAUSE (§2.3 Stage 3 — the canon confirmation gate): a zone is a
 * level the market RETURNED to — 3 reactions (origin + 2 returns) is the
 * minimum that distinguishes a level from a single battle and its echo
 * (the v4.4 MIN_CLUSTER_POINTS doctrine applied to the candle matrix).
 */
const MIN_REACTION_CANDLES = 3;

/**
 * Minimum distinct touch kinds = 2.
 * BECAUSE (§2.3 Stage 3): a one-anatomy cluster is one kind of battle
 * re-measured; the canon ≥2-confirmation doctrine (§6.2.1 Stage 4)
 * requires TWO independent reaction signatures (e.g. a sweep AND a
 * defend) before a level is a confirmed LQZ.
 */
const MIN_DISTINCT_KINDS = 2;

/**
 * ATR period = 14.
 * BECAUSE (canon — lqz-lobe.ts:209 ATR_PERIOD): the adaptive-threshold
 * lookback shared by every LQZ computation.
 */
const ATR_PERIOD = 14;

/**
 * Bucket width = 0.25 × ATR(14, 1H), floored at 1 pip.
 * BECAUSE (canon §6.2.1 — lqz-matrix.ts:112): the rungs are 4-10 pips
 * apart; the bucket must resolve them (2-4 buckets per inter-rung gap).
 */
const EPSILON_ATR_FRACTION = 0.25;

/**
 * Defended-edge mode quantum = 1 pip.
 * BECAUSE: body closes are continuous — a literal mode would almost never
 * repeat. The quantum must be the instrument's noise floor (canon
 * MIN_PROMINENCE_PIPS = 1 pip, lqz-matrix.ts:69): closes within 1 pip of
 * each other are the SAME defended level; closes 1+ pip apart are
 * distinct auctions. The modal bucket's member mean is the level price
 * consistently turned at (§2.4 defendedEdge).
 */
const DEFENDED_EDGE_QUANTUM_PIPS = 1;

/**
 * Canon LQZ zfp ladder: base 20 (a CONFIRMED LQZ is a Hard Wall when
 * fresh), +5 per 2 touches beyond 3 (exhaustion), capped 60.
 * BECAUSE (canon — §6.2.1 Stage 4 = lqz-lobe.ts:392 EXACTLY).
 */
const ZFP_BASE = 20;
const ZFP_CAP = 60;
const ZFP_TOUCH_BASE = 3;
const ZFP_STEP_TOUCHES = 2;
const ZFP_STEP_POINTS = 5;

/**
 * Battle-kind dominance ordering (strongest first).
 * BECAUSE (canon — lqz-matrix.ts:141): §8.1's battled predicate ranks
 * sweep anatomy as the strongest liquidity signal; dwell is the weakest.
 * The zone's touchKinds list reports in this order (deterministic).
 */
const KIND_DOMINANCE: readonly Exclude<TouchKind, 'PASS_THROUGH'>[] = [
  'SWEEP', 'WICK_REJECT', 'BODY_DEFEND', 'CONSOL_DWELL',
];

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — SWING-POINT EXTRACTION + CLUSTERING (the v4.4 validated core,
// re-implemented BY CITATION: point selection and clustering are
// byte-identical in behavior to lqz-matrix.ts:299-341 / 470-485. The
// swing-anatomy field is omitted — LMV classifies candles via the canon
// classifyTouch predicate (Stage 1), not via swing anatomy.)
// ═══════════════════════════════════════════════════════════════════════════════

interface LmvSwingPoint {
  /** The extreme price (the swing bar's high or low). */
  price: number;
  barIndex: number;
  ms: number;
  /** How far the extreme stands out from its neighbors (price). */
  prominence: number;
}

/**
 * extractSwingPoints — strict local extremes with earliest-bar tiebreak
 * (cited: lqz-matrix.ts extractSwingPoints, byte-identical selection).
 *
 * A swing high at i: high[i] exceeds every high in the ±1-bar
 * neighborhood; on an exact tie the EARLIEST bar owns the point (plateau
 * leading edge). Same for swing lows. Total: flat input yields zero
 * points (no strict extreme exists), never a flood.
 *
 * Prominence: swing high → high[i] − max(neighboring highs); swing low →
 * min(neighboring lows) − low[i]. Points below the noise floor
 * (MIN_PROMINENCE_PIPS) are quoting wiggle — BUT a zero-prominence
 * plateau LEADER is kept (the shelf case: 3+ bars pinned at one extreme
 * IS a liquidity signature).
 */
function extractSwingPoints(bars: OHLCBar[], pipValue: number): LmvSwingPoint[] {
  const k = SWING_NEIGHBORHOOD_BARS;
  const minProm = MIN_PROMINENCE_PIPS * pipValue;
  const points: LmvSwingPoint[] = [];
  for (let i = k; i < bars.length - k; i++) {
    const bar = bars[i]!;
    let isHigh = true;
    let isLow = true;
    let secondHigh = -Infinity;
    let secondLow = Infinity;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      const n = bars[j]!;
      if (n.high > bar.high || (n.high === bar.high && j < i)) isHigh = false;
      if (n.low < bar.low || (n.low === bar.low && j < i)) isLow = false;
      if (n.high > secondHigh) secondHigh = n.high;
      if (n.low < secondLow) secondLow = n.low;
    }
    if (isHigh) {
      const prom = bar.high - secondHigh;
      const plateauEcho = prom === 0; // plateau leader — the shelf's leading edge
      if (prom >= minProm || plateauEcho) {
        points.push({
          price: bar.high, barIndex: i, ms: bar.timestamp,
          prominence: Math.max(prom, 0),
        });
      }
    }
    if (isLow) {
      const prom = secondLow - bar.low;
      const plateauEcho = prom === 0;
      if (prom >= minProm || plateauEcho) {
        points.push({
          price: bar.low, barIndex: i, ms: bar.timestamp,
          prominence: Math.max(prom, 0),
        });
      }
    }
  }
  return points;
}

/**
 * clusterSwingPoints — single-linkage, span-capped (cited: lqz-matrix.ts
 * Stage 3 clustering, byte-identical behavior). Points are sparse, so
 * linkage never floods; the 4-pip span cap is the anti-chaining guard
 * (splits staircases into their discrete steps).
 */
function clusterSwingPoints(
  points: LmvSwingPoint[],
  pipValue: number,
): LmvSwingPoint[][] {
  const sorted = [...points].sort((a, b) => (a.price - b.price) || (a.ms - b.ms));
  const tol = CLUSTER_TOLERANCE_PIPS * pipValue;
  const maxSpan = CLUSTER_MAX_SPAN_PIPS * pipValue;
  const clusters: LmvSwingPoint[][] = [];
  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (
      last &&
      p.price - last[last.length - 1]!.price <= tol &&
      p.price - last[0]!.price <= maxSpan
    ) {
      last.push(p);
    } else {
      clusters.push([p]);
    }
  }
  return clusters;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 HELPERS — the matrix reductions (§2.4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * modalBodyClose — the defended edge (§2.4): the modal bodyClose of the
 * DEFENDING candles (BUY_SIDE: closed back UP, close ≥ open; SELL_SIDE:
 * closed back DOWN, close ≤ open). The mode is taken at the 1-pip
 * quantum (DEFENDED_EDGE_QUANTUM_PIPS); ties break toward the bucket
 * nearest the zone center, then the lower bucket (deterministic). The
 *  edge is the MEAN of the modal bucket's member closes — the level price
 *  consistently turned at, not a grid point. Total: if no candle closed
 *  with the defense (a pure sweep-shelf), the full matrix votes.
 *
 *  RETENTION NOTE (L1 modal-cluster emission, 2026-07-31): the emission
 *  path now derives the rung's defendedEdge directly as the modal bucket
 *  price (the operator's drawn rung); this helper is retained as the §2.4
 *  reduction definition (the mean of the modal bucket's member closes).
 */
function modalBodyClose(
  candles: OhlcRow[],
  side: 'BUY_SIDE' | 'SELL_SIDE',
  center: number,
  pipValue: number,
): number {
  const defenders = candles.filter((c) =>
    side === 'BUY_SIDE' ? c.close >= c.open : c.close <= c.open,
  );
  const pool = defenders.length > 0 ? defenders : candles;
  const quantum = DEFENDED_EDGE_QUANTUM_PIPS * pipValue;
  const buckets = new Map<number, number[]>();
  for (const c of pool) {
    const key = Math.round(c.bodyClose / quantum);
    const members = buckets.get(key) ?? [];
    members.push(c.bodyClose);
    buckets.set(key, members);
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  let bestKey = keys[0]!;
  for (const k of keys) {
    const count = buckets.get(k)!.length;
    const bestCount = buckets.get(bestKey)!.length;
    if (count > bestCount) {
      bestKey = k;
    } else if (count === bestCount) {
      const dK = Math.abs(k * quantum - center);
      const dBest = Math.abs(bestKey * quantum - center);
      // Strictly nearer the center wins; equal distance keeps the lower
      // bucket (keys ascend — deterministic).
      if (dK < dBest - 1e-9) bestKey = k;
    }
  }
  const members = buckets.get(bestKey)!;
  let sum = 0;
  for (const m of members) sum += m;
  return sum / members.length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE LMV BUILD (§2.3 — the total function LMV: OHLC → LmvTable)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildLmvTable — the LMV total function (Appendix C Losslessness:
 * |I(S_math)| = 1 — every input bar set yields exactly one table).
 *
 * Total: empty bars → empty table + degenerate coverage; flat bars → no
 * swing points → empty table. Deterministic: no wall-clock, no
 * randomness — same bars → byte-identical LmvTable (§2.5 Law 1).
 */
export function buildLmvTable(input: LmvInput): LmvResult {
  const { pipValue, spot } = input;
  const tf = input.timeframe ?? '1H';
  const lookback = input.lookbackBars ?? LQZ_LOOKBACK_BARS;
  const bars =
    input.bars1H.length > lookback
      ? input.bars1H.slice(input.bars1H.length - lookback)
      : input.bars1H;

  // ── Totality: empty input → defined empty result (§2.5 Law 2). ──
  if (bars.length === 0) {
    return {
      table: [],
      coverage: { minPrice: 0, maxPrice: 0, bucketWidth: pipValue },
    };
  }

  // ── The noise-floor unit + the completeness grid (Stage 4) ──
  const atr = computeAtr(bars, ATR_PERIOD);
  const bucketWidth = Math.max(EPSILON_ATR_FRACTION * atr, pipValue);
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const b of bars) {
    if (b.low < minPrice) minPrice = b.low;
    if (b.high > maxPrice) maxPrice = b.high;
  }

  const ctx: TouchContext = { atr, pipValue };
  const eps = CLUSTER_TOLERANCE_PIPS * pipValue;

  // ── Stage 2: swing-point clustering (the v4.4 validated core, cited) ──
  const points = extractSwingPoints(bars, pipValue);
  const clusters = clusterSwingPoints(points, pipValue);

  const table: LqzZoneMatrix[] = [];

  for (const cluster of clusters) {
    // Cluster range + the prominence-weighted center (cited: lqz-matrix
    // Stage 4 center doctrine — the level is where the SHARPEST turns
    // happened; every point's weight is floored at 1 pip so a defended
    // shelf still votes).
    let bottom = Infinity;
    let top = -Infinity;
    let weightedSum = 0;
    let weightTotal = 0;
    for (const p of cluster) {
      if (p.price < bottom) bottom = p.price;
      if (p.price > top) top = p.price;
      const w = Math.max(p.prominence, pipValue);
      weightedSum += p.price * w;
      weightTotal += w;
    }
    const center = weightTotal > 0 ? weightedSum / weightTotal : cluster[0]!.price;

    // ── Stage 1 + 3: REACTION EXTRACTION against the ε-widened band
    //    [bottom−ε, top+ε] (§2.3 Stage 3). A "reaction candle" is any
    //    non-PASS_THROUGH touch (canon classifyTouch — the piecewise-
    //    TOTAL predicate; every bar classifies to exactly one branch).
    //    The band is widened by the canon ε BECAUSE the cluster extremes
    //    are swing-point prices and a reacting candle's touch may sit up
    //    to ε beyond them; the sweep wicks that probed DEEP past the
    //    level (the liquidity grabs) are kept — their wickTips define
    //    the reactionExtreme (§2.4 worked example: the 100.803 probe). ──
    const lo = bottom - eps;
    const hi = top + eps;
    interface RawReaction {
      bar: OHLCBar;
      kind: Exclude<TouchKind, 'PASS_THROUGH'>;
      fromAbove: boolean;
      fromBelow: boolean;
    }
    const reactions: RawReaction[] = [];
    for (let i = 0; i < bars.length; i++) {
      const kind = classifyTouch(bars, i, lo, hi, ctx);
      if (kind === 'PASS_THROUGH') continue;
      const bar = bars[i]!;
      const refClose = i > 0 ? bars[i - 1]!.close : bar.open;
      reactions.push({
        bar,
        kind,
        fromAbove: refClose >= hi,
        fromBelow: refClose <= lo,
      });
    }

    // ── The canon confirmation gate (§2.3 Stage 3): ≥3 reaction candles
    //    AND ≥2 distinct touch kinds. Below the gate the cluster is one
    //    battle (or one kind of battle), not a confirmed LQZ — discarded. ──
    const distinctKinds = new Set<string>();
    for (const r of reactions) distinctKinds.add(r.kind);
    if (reactions.length < MIN_REACTION_CANDLES || distinctKinds.size < MIN_DISTINCT_KINDS) {
      continue;
    }

    // ── The DEFENDING side (§2.4 semantics — demand vs supply, NOT the
    //    v4.4 spot-relative liquidity-resting side): a candle that
    //    approached the band from ABOVE probed the lows and was turned →
    //    buyers defended → BUY_SIDE vote; from BELOW → sellers defended →
    //    SELL_SIDE vote. A candle that was already INSIDE the band (the
    //    dwell case — refClose within [lo, hi]) votes by wick dominance
    //    (the side that did the work); an exact wick tie votes by which
    //    side of the center it closed. Majority wins; ties break on total
    //    wick mass, then spot-relative (§5.3: supply above / demand
    //    below). Every branch is deterministic. ──
    let buyVotes = 0;
    let sellVotes = 0;
    let lowerWickMass = 0;
    let upperWickMass = 0;
    for (const r of reactions) {
      const an = barAnatomy(r.bar);
      lowerWickMass += an.lowerWick;
      upperWickMass += an.upperWick;
      if (r.fromAbove && !r.fromBelow) buyVotes++;
      else if (r.fromBelow && !r.fromAbove) sellVotes++;
      else if (an.lowerWick > an.upperWick) buyVotes++;
      else if (an.upperWick > an.lowerWick) sellVotes++;
      else if (r.bar.close >= center) buyVotes++;
      else sellVotes++;
    }
    const side: 'BUY_SIDE' | 'SELL_SIDE' =
      buyVotes > sellVotes
        ? 'BUY_SIDE'
        : sellVotes > buyVotes
          ? 'SELL_SIDE'
          : lowerWickMass > upperWickMass
            ? 'BUY_SIDE'
            : upperWickMass > lowerWickMass
              ? 'SELL_SIDE'
              : center >= spot
                ? 'SELL_SIDE'
                : 'BUY_SIDE';

    // ── THE MATRIX (§2.4): rows chronological (extraction iterates the
    //    bars ascending — deterministic order). The wickTip column is
    //    uniform per zone: BUY_SIDE → the low column (the probe depth);
    //    SELL_SIDE → the high column — exactly the spec's "min(wick-low
    //    col) / max(wick-high col)" reduction substrate. ──
    const candles: OhlcRow[] = reactions.map((r) => ({
      timestamp: r.bar.timestamp,
      open: r.bar.open,
      high: r.bar.high,
      low: r.bar.low,
      close: r.bar.close,
      touchKind: r.kind,
      wickTip: side === 'BUY_SIDE' ? r.bar.low : r.bar.high,
      bodyClose: r.bar.close,
    }));

    // ── The cluster week span (shared by every rung — §2.4). ──
    const weeks = new Set<string>();
    for (const c of candles) weeks.add(isoWeekKey(c.timestamp));

    // ── L1: MODAL-CLUSTER EMISSION (operator 2026-07-31) — one rung per
    //    modal bodyClose cluster.
    //    The operator's drawn rungs are the MODAL reaction levels ("any
    //    price where ≥2 candles' wicks/bodies align within ~1-2 pips = a
    //    rung" — ANCHOR_DOCTRINE §5.3), NOT the prominence-weighted mean.
    //    The 100.945/100.975 pair (3.0p) and the 101.235/101.240 pair
    //    (0.5p) must emit as DISTINCT rungs. The ε=2-pip band still
    //    COLLECTS the reactions (unchanged); the emission re-splits them
    //    at the 1-pip quantum so each modal level becomes its own
    //     zone-matrix. A cluster may now emit MULTIPLE rungs — one per
    //     modal bucket of ≥ MIN_REACTION_CANDLES candles. ──
    // TIER-SCALED QUANTUM (2026-07-31): the 1H tier keeps the canon 1-pip quantum
    // (its candle granularity — the golden 101.235/101.240 pair is ONE 1H reaction
    // zone [wick tip 101.239]; both levels land ≤1 pip of the 101.240 rung). The
    // 0.5p pair separation is the FINE TIERS' job (spec §2.7: "101.235 vs 101.240
    // (0.5p) resolves on 15m") — 30m → 0.5-pip, 15m → 0.25-pip. Weeks WITH 30m/15m
    // bars get the sub-pip rungs; the golden fixture has no 30m/15m lanes (0 bars).
    const quantum =
      (tf === '15m' ? DEFENDED_EDGE_QUANTUM_PIPS / 4
        : tf === '30m' ? DEFENDED_EDGE_QUANTUM_PIPS / 2
        : DEFENDED_EDGE_QUANTUM_PIPS) * pipValue;
    const modalBuckets = new Map<number, OhlcRow[]>();
    for (const c of candles) {
      const q = Math.round(c.bodyClose / quantum) * quantum;
      (modalBuckets.get(q) ?? modalBuckets.set(q, []).get(q)!).push(c);
    }

    // The operator's RUNG rule (ANCHOR_DOCTRINE §5.3): "any price where ≥2 candles'
    // wicks/bodies align within ~1-2 pips = a rung" — the per-rung gate is 2, NOT the
    // cluster-wide MIN_REACTION_CANDLES=3 (which would starve clusters whose candles
    // spread across 1-pip buckets — the GU regression 2026-07-31: 13→4 unique trades).
    const MIN_RUNG_CANDLES = 2;
    // Fallback: a confirmed cluster (≥3 candles, ≥2 kinds — already gated above) must
    // NEVER emit zero rungs; if no bucket reaches the rung gate, emit the DENSEST
    // bucket as a single rung (the modal level).
    let densest: [number, OhlcRow[]] | null = null;
    for (const [price, group] of modalBuckets) {
      if (!densest || group.length > densest[1].length) densest = [price, group];
    }
    const emitRungs = [...modalBuckets.entries()].filter(([, g]) => g.length >= MIN_RUNG_CANDLES);
    const rungsToEmit = emitRungs.length > 0 ? emitRungs : (densest ? [densest] : []);

    for (const [rungPrice, group] of rungsToEmit) {

      // ── The per-rung matrix reductions (§2.4 — the E/SL anchors): the
      //    group's OWN reactionExtreme (min/max wickTip) + sweepCount +
      //    distinct kinds. The defendedEdge is the MODAL level price (the
      //    operator's drawn rung) — NOT the prominence-weighted mean. ──
      let rungExtreme = side === 'BUY_SIDE' ? Infinity : -Infinity;
      let rungSweeps = 0;
      const rungKinds = new Set<string>();
      for (const c of group) {
        if (side === 'BUY_SIDE') {
          if (c.wickTip < rungExtreme) rungExtreme = c.wickTip;
        } else {
          if (c.wickTip > rungExtreme) rungExtreme = c.wickTip;
        }
        if (c.touchKind === 'SWEEP') rungSweeps++;
        rungKinds.add(c.touchKind);
      }
      const rungTouchKinds = KIND_DOMINANCE.filter((k) => rungKinds.has(k));
      // Canon LQZ zfp ladder (§2.3 Stage 3 = lqz-lobe.ts:392 EXACTLY),
      // applied to the RUNG's own candle count.
      const rungZfp = Math.min(
        ZFP_CAP,
        ZFP_BASE + Math.max(0, Math.floor((group.length - ZFP_TOUCH_BASE) / ZFP_STEP_TOUCHES)) * ZFP_STEP_POINTS,
      );

      table.push({
        bottom,
        top,
        center: rungPrice,
        side,
        candles: group,
        reactionExtreme: rungExtreme,
        defendedEdge: rungPrice,
        sweepCount: rungSweeps,
        touchKinds: rungTouchKinds,
        weekSpan: weeks.size,
        zfp: rungZfp,
        timeframe: tf,
      });
    }
  }

  // ── Price-ordered (§2.2). Total comparator — deterministic. ──
  table.sort((a, b) => (a.center - b.center) || (a.bottom - b.bottom) || (a.top - b.top));

  // ── Stage 4: COMPLETENESS (MPSE Structure 9) — the coverage record
  //    spans the observed price range at the canon bucket width. ──
  return { table, coverage: { minPrice, maxPrice, bucketWidth } };
}
