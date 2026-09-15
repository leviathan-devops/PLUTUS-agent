/**
 * MDVE LQZ Matrix — the liquidity matrix vision (PLUTUS_V4.4_MDVE_SPEC §6.2).
 *
 * ═══════════════════════════════════════════════════════════════
 * "This should be extremely easy to see in data since dozens of candles
 * across multiple weeks all react to the same price range — a liquidity
 * matrix vision that uses matrices to find all the LQZs in the data."
 *                                                          — the operator
 *
 * DETECTION DOCTRINE (v4.4.1 — swing-point clustering):
 * A liquidity zone is a price where the auction REVERSED, repeatedly,
 * across distinct participation windows. The observable signature of a
 * reversal is a SWING POINT — a bar whose extreme is the strict local
 * maximum/minimum of its neighborhood. Swing points are SPARSE (a ranging
 * week prints dozens, not thousands), so clustering them never chains
 * through the whole range the way bucketing every bar's RANGE did (the
 * v4.4.0 failure mode: a ranging week filled every bucket, the
 * equivalence-class merge collapsed the range into one mega-bucket, and
 * the discrete rungs — 4-10 pips apart — were destroyed).
 *
 * The matrix: M[priceBucket][isoWeek] = swingReactionEvents — still a
 * literal liquidity matrix over price × time (MPSE Structure 9), still
 * zero-filled over the full observed range (the completeness invariant:
 * the model is total over price × time — no unexamined region).
 *
 * The entry gate (replaces v4.4.0's kind-count gate):
 *   ≥ 3 swing points at the level ∧ recurrence across ≥ 2 distinct
 *   (day, session) participation windows — the §8.4 dedup doctrine
 *   (same day + same session = DUPLICATE; different session = DISTINCT)
 *   applied to level confirmation: a level only one participation window
 *   reacted to is one battle, not a zone.
 *
 * Relationship to the canon lqz-lobe (§6.2): the lobe's 3-pattern
 * confirmation remains the PER-PATTERN detector; canon zones overlapping
 * a cluster within the canon 3-pip alignment tolerance
 * (LQZ_ALIGN_TOLERANCE_PIPS, lqz-lobe.ts:185) contribute their pattern
 * names to the entry's confirmationPatterns.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { detectLiquidityZones, LQZ_LOOKBACK_BARS } from '../brains/lqz-lobe.js';
import type { LqzMatrixEntry, ReactionEvent, TouchKind } from './types.js';
import { barAnatomy, computeAtr, isoWeekKey, sessionOf } from './util.js';

/**
 * The matrix tier's timeframe — the bars' native resolution.
 * BECAUSE (Phase 2 T5b — the telescoped runs): the matrix math is
 * TF-AGNOSTIC (it reads only the bars array — the TF is data, not
 * behavior), but every EMITTED artifact must be stamped with the tier so
 * the 1H → 30m → 15m telescope stays provenance-clean: the ladder rungs
 * carry it, the LMV rows carry it, and the model's nested-refinement pass
 * reads it to decide parent/child relationships. '15m' is FIRST-CLASS —
 * the golden 101.235/101.240 pair resolves only on the 15m tier (the fine
 * rungs the 1H run cannot see).
 */
export type Timeframe = '4H' | '1H' | '30m' | '15m';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Swing neighborhood half-width = 1 bar.
 * BECAUSE: a liquidity reaction on the 1H is visible as a one-bar turn —
 * the reaction bar's extreme exceeds both immediate neighbors. k=2 (the
 * v4.4.1 prototype's starting point) misses the sharpest single-bar
 * probes (a wick into the level between two larger bars), which are
 * exactly the sweep/reject events the matrix exists to capture.
 */
const SWING_NEIGHBORHOOD_BARS = 1;

/**
 * Minimum swing prominence = 1 pip.
 * BECAUSE: prominence measures how far the extreme stands out from its
 * neighbors; below 1 pip the "turn" is inside the spread/noise floor of
 * the instrument (sub-pip wiggle is quoting noise, not an auction
 * reversal). Plateau shelves (repeated identical extremes) report
 * prominence 0 for all but the FIRST bar of the plateau — the plateau's
 * leading edge is the structural point; its echoes add no information.
 */
const MIN_PROMINENCE_PIPS = 1;

/**
 * Cluster linkage tolerance = 2 pips.
 * BECAUSE: two swing points within 2 pips reacted to the SAME level
 * (the operator's rung labels sit 4-10 pips apart on the gold-standard
 * chart; a 2-pip linkage resolves them — 2-4 gaps per inter-rung
 * distance — while absorbing the 1-2 pip auction noise around a level).
 */
const CLUSTER_TOLERANCE_PIPS = 2;

/**
 * Maximum cluster span = 4 pips.
 * BECAUSE: single-linkage clustering must not CHAIN through a staircase
 * of swing points 2 pips apart (the mega-bucket failure in miniature).
 * A liquidity zone's traded band is a few pips; at 4 pips the band is
 * already wider than the tightest labeled rungs, so the cap splits
 * staircases into their discrete steps.
 */
const CLUSTER_MAX_SPAN_PIPS = 4;

/**
 * Minimum swing points per confirmed cluster = 3.
 * BECAUSE: canon 2+ confirmation (§6.2.1 Stage 4) counts EVENTS; a zone
 * is a level the market returned to — 3 reactions (origin + 2 returns)
 * is the minimum that distinguishes a level from a single battle and
 * its immediate echo.
 */
const MIN_CLUSTER_POINTS = 3;

/**
 * Minimum distinct (day, session) participation windows = 2.
 * BECAUSE: §8.4 dedup doctrine — same day + same session = DUPLICATE,
 * different session = DISTINCT. A level whose reactions all live in one
 * participation window is one battle re-measured, not a recurring zone.
 */
const MIN_RECURRENCE_WINDOWS = 2;

/**
 * Bucket half-width = 0.25 × ATR(14, 1H) in pips (the matrix's price grid).
 * BECAUSE (§6.2.1): the rungs are 4-10 pips apart; the bucket must
 * resolve them (2-4 buckets per inter-rung gap).
 */
const EPSILON_ATR_FRACTION = 0.25;

/**
 * ATR period = 14.
 * BECAUSE: canon ATR_PERIOD (lqz-lobe.ts:209) — the adaptive-threshold
 * lookback shared by every LQZ computation.
 */
const ATR_PERIOD = 14;

/**
 * Prior-extreme lookback for sweep anatomy = 24 bars (1 trading day).
 * BECAUSE: canon sweep lookback (lqz-lobe's 24-bar sweep window — a
 * sweep takes out the prior SESSION-DAY's extreme, not the all-time
 * loaded history).
 */
const SWING_SWEEP_LOOKBACK_BARS = 24;

/**
 * Canon alignment tolerance for absorbing lqz-lobe zones = 3 pips.
 * BECAUSE: canon LQZ_ALIGN_TOLERANCE_PIPS (lqz-lobe.ts:185) — two hits
 * align when their intervals overlap within this gap.
 */
const CANON_ALIGN_TOLERANCE_PIPS = 3;

/**
 * Battle-kind dominance ordering (strongest first).
 * BECAUSE: §8.1's battled predicate ranks sweep anatomy as the strongest
 * liquidity signal; dwell is the weakest battle (a shelf, not a fight).
 */
const KIND_DOMINANCE: readonly Exclude<TouchKind, 'PASS_THROUGH'>[] = [
  'SWEEP', 'WICK_REJECT', 'BODY_DEFEND', 'CONSOL_DWELL',
];

/**
 * Minimum touch depth / wick significance = 2 pips.
 * BECAUSE: canon SWEEP_MIN_BEYOND_PIPS = 2 (lqz-lobe.ts:140) — the minimum
 * stop-grab depth. Sub-2-pip wiggles through a level are traversal noise,
 * not a battle (the matrix's signal is REACTION, not coverage).
 */
const MIN_TOUCH_DEPTH_PIPS = 2;

/**
 * Reversal magnitude floor = 0.5 × ATR (floored at 2 pips).
 * BECAUSE: a BODY_DEFEND is a TURN at the level, not trend continuation —
 * the counter-move must exceed the noise floor (½ the ATR unit the
 * buckets are derived from), floored at the canon 2-pip stop-grab
 * minimum (lqz-lobe.ts:140).
 */
const REVERSAL_ATR_FRACTION = 0.5;

/** The touch context — precomputed once per matrix build. */
export interface TouchContext {
  /** ATR(14, 1H) in price — the noise-floor unit. */
  atr: number;
  pipValue: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// classifyTouch — the piecewise-TOTAL per-bar predicate (§6.2.1 Stage 1).
// Retained as the public anatomy predicate: every (bar, level) interaction
// classifies to EXACTLY ONE branch, with the explicit OTHERWISE branch =
// PASS_THROUGH (NOT a touch — excluded from the matrix).
// ═══════════════════════════════════════════════════════════════════════════════

/** Body-defend reversal window = 1 bar (the turn must be IMMEDIATE). */
const BODY_DEFEND_WINDOW_BARS = 1;
/** Dwell span ceiling = 2 level widths (a dwell is compressed action). */
const CONSOL_DWELL_SPAN_BUCKETS = 2;
/** Dwell cluster size = 3 bars (canon SHORT_WICK_CLUSTER_MIN_BARS). */
const CONSOL_DWELL_BARS = 3;

export function classifyTouch(
  bars: OHLCBar[],
  i: number,
  lo: number,
  hi: number,
  ctx: TouchContext,
): TouchKind {
  const bar = bars[i]!;
  const an = barAnatomy(bar);
  const prev = i > 0 ? bars[i - 1]! : null;
  const refClose = prev ? prev.close : bar.open;
  const fromAbove = refClose >= hi;
  const fromBelow = refClose <= lo;
  const prevDidNotDwell = prev === null || prev.low > hi || prev.high < lo;

  const minDepth = MIN_TOUCH_DEPTH_PIPS * ctx.pipValue;
  const revMin = Math.max(minDepth, REVERSAL_ATR_FRACTION * ctx.atr);

  const lowerWickEnters = bar.low < hi && an.bodyBottom > lo;
  const upperWickEnters = an.bodyTop < hi && bar.high > lo;
  const wickThroughDown = bar.low < lo;
  const wickThroughUp = bar.high > hi;
  const beyondDown = lo - bar.low;
  const beyondUp = bar.high - hi;

  if (fromAbove && wickThroughDown && beyondDown >= minDepth && bar.close >= lo && prevDidNotDwell) return 'SWEEP';
  if (fromBelow && wickThroughUp && beyondUp >= minDepth && bar.close <= hi && prevDidNotDwell) return 'SWEEP';

  if (
    fromAbove && lowerWickEnters && !wickThroughDown &&
    an.lowerWick >= minDepth && bar.close > bar.open && bar.close >= hi
  ) return 'WICK_REJECT';
  if (
    fromBelow && upperWickEnters && !wickThroughUp &&
    an.upperWick >= minDepth && bar.close < bar.open && bar.close <= lo
  ) return 'WICK_REJECT';

  const bodyEnters = an.bodyBottom < hi && an.bodyTop > lo;
  if (bodyEnters && (fromAbove || fromBelow) &&
      nextBarsReverse(bars, i, lo, hi, fromAbove, revMin)) {
    return 'BODY_DEFEND';
  }

  if (barInConsolidationCluster(bars, i, lo, hi)) return 'CONSOL_DWELL';

  return 'PASS_THROUGH';
}

function nextBarsReverse(
  bars: OHLCBar[],
  i: number,
  lo: number,
  hi: number,
  fromAbove: boolean,
  revMin: number,
): boolean {
  const bar = bars[i]!;
  const end = Math.min(bars.length, i + 1 + BODY_DEFEND_WINDOW_BARS);
  for (let j = i + 1; j < end; j++) {
    const next = bars[j]!;
    if (fromAbove && next.close > bar.close && next.close - hi >= revMin) return true;
    if (!fromAbove && next.close < bar.close && lo - next.close >= revMin) return true;
  }
  return false;
}

function barInConsolidationCluster(
  bars: OHLCBar[],
  i: number,
  lo: number,
  hi: number,
): boolean {
  if (i < CONSOL_DWELL_BARS - 1) return false;
  const width = hi - lo;
  let spanTop = -Infinity;
  let spanBottom = Infinity;
  for (let j = i - (CONSOL_DWELL_BARS - 1); j <= i; j++) {
    const b = bars[j]!;
    if (b.low > hi || b.high < lo) return false;
    spanTop = Math.max(spanTop, b.high);
    spanBottom = Math.min(spanBottom, b.low);
  }
  return (spanTop - spanBottom) <= CONSOL_DWELL_SPAN_BUCKETS * width;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWING-POINT EXTRACTION (the reaction signature)
// ═══════════════════════════════════════════════════════════════════════════════

interface SwingPoint {
  /** The extreme price (the swing bar's high or low). */
  price: number;
  /** Which extreme turned: 'H' = swing high, 'L' = swing low. */
  side: 'H' | 'L';
  barIndex: number;
  ms: number;
  /** How far the extreme stands out from its neighbors (price). */
  prominence: number;
  anatomy: Exclude<TouchKind, 'PASS_THROUGH'>;
}

/**
 * extractSwingPoints — strict local extremes with earliest-bar tiebreak.
 *
 * A swing high at i: high[i] exceeds every high in the neighborhood; on
 * an exact tie the EARLIEST bar owns the point (plateau leading edge —
 * its echoes add no information). Total: flat input yields zero points
 * (no strict extreme exists), never a flood.
 *
 * Prominence: for a swing high, high[i] − max(neighboring highs); for a
 * swing low, min(neighboring lows) − low[i]. Points below the noise
 * floor (MIN_PROMINENCE_PIPS) are quoting wiggle, not reversals — BUT a
 * zero-prominence plateau LEADER is kept when its echo bars prove the
 * level was defended (the shelf case: 3+ bars pinned at one extreme IS
 * a liquidity signature — CONSOL_DWELL anatomy).
 */
function extractSwingPoints(bars: OHLCBar[], pipValue: number): SwingPoint[] {
  const k = SWING_NEIGHBORHOOD_BARS;
  const minProm = MIN_PROMINENCE_PIPS * pipValue;
  const points: SwingPoint[] = [];
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
          price: bar.high, side: 'H', barIndex: i, ms: bar.timestamp,
          prominence: Math.max(prom, 0),
          anatomy: swingAnatomy(bars, i, 'H', pipValue),
        });
      }
    }
    if (isLow) {
      const prom = secondLow - bar.low;
      const plateauEcho = prom === 0;
      if (prom >= minProm || plateauEcho) {
        points.push({
          price: bar.low, side: 'L', barIndex: i, ms: bar.timestamp,
          prominence: Math.max(prom, 0),
          anatomy: swingAnatomy(bars, i, 'L', pipValue),
        });
      }
    }
  }
  return points;
}

/**
 * swingAnatomy — the battle kind of one swing point.
 *   SWEEP:       the extreme took out the prior day's extreme and the
 *                bar closed BACK through it (the grab failed) — canon
 *                sweep semantics at swing granularity.
 *   WICK_REJECT: the extreme is wick-dominant (the probe was refused).
 *   BODY_DEFEND: the extreme is body-dominant (the auction sat at the
 *                level and turned).
 *   CONSOL_DWELL: plateau leader (zero prominence — pinned shelf).
 */
function swingAnatomy(
  bars: OHLCBar[],
  i: number,
  side: 'H' | 'L',
  pipValue: number,
): Exclude<TouchKind, 'PASS_THROUGH'> {
  const bar = bars[i]!;
  const an = barAnatomy(bar);
  const minDepth = MIN_TOUCH_DEPTH_PIPS * pipValue;
  const start = Math.max(0, i - SWING_SWEEP_LOOKBACK_BARS);
  if (start < i) {
    if (side === 'L') {
      let priorLow = Infinity;
      for (let j = start; j < i; j++) if (bars[j]!.low < priorLow) priorLow = bars[j]!.low;
      if (bar.low < priorLow && bar.close > priorLow) return 'SWEEP';
    } else {
      let priorHigh = -Infinity;
      for (let j = start; j < i; j++) if (bars[j]!.high > priorHigh) priorHigh = bars[j]!.high;
      if (bar.high > priorHigh && bar.close < priorHigh) return 'SWEEP';
    }
  }
  if (side === 'L' && an.lowerWick >= minDepth && an.lowerWick >= an.upperWick) return 'WICK_REJECT';
  if (side === 'H' && an.upperWick >= minDepth && an.upperWick >= an.lowerWick) return 'WICK_REJECT';
  return 'BODY_DEFEND';
}

/** Participation-window key — the §8.4 dedup granularity (day + session). */
function participationKey(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 10)}|${sessionOf(ms)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MATRIX BUILD
// ═══════════════════════════════════════════════════════════════════════════════

export interface LqzMatrixResult {
  /** Confirmed LQZ entries (the swing-cluster gate passed), price-ascending. */
  entries: LqzMatrixEntry[];
  /**
   * The COMPLETE matrix (completeness invariant): every bucket in the
   * observed range exists, zero-filled where untouched. Keys ascend.
   * M[bucketKey][isoWeek] = reaction events.
   */
  matrix: ReadonlyMap<number, ReadonlyMap<string, ReactionEvent[]>>;
  /** Bucket width in price (ε = 0.25 × ATR(14,1H) — floored at 1 pip). */
  bucketWidth: number;
  /** The tier this matrix was built from (default '1H' — Phase 2 T5b:
   *  the telescoped runs' provenance; the caller merges tiers by it). */
  timeframe: Timeframe;
}

export interface LqzMatrixInput {
  pair: string;
  spot: number;
  pipValue: number;
  bars1H: OHLCBar[];
  /** Canon lookback (default 720 = 6 weeks, lqz-lobe.ts:119). */
  lookbackBars?: number;
  /** The tier's timeframe (default '1H'). BECAUSE: the matrix math is
   *  TF-agnostic, but the emitted result carries the tier so the
   *  telescoped runs stay provenance-clean (Phase 2 T5b). */
  timeframe?: Timeframe;
}

/**
 * Build the LQZ matrix vision. Total: any bar set (including empty) yields
 * a complete (possibly zero-bucket) matrix and an entry list.
 */
export function buildLqzMatrix(input: LqzMatrixInput): LqzMatrixResult {
  const { pair, spot, pipValue } = input;
  const tf = input.timeframe ?? '1H';
  const lookback = input.lookbackBars ?? LQZ_LOOKBACK_BARS;
  const bars = bars1HSlice(input.bars1H, lookback);

  if (bars.length === 0) {
    return { entries: [], matrix: new Map(), bucketWidth: pipValue, timeframe: tf };
  }

  // ── ε (bucket width) — the matrix's price grid (completeness invariant) ──
  const atr = computeAtr(bars, ATR_PERIOD);
  const bucketWidth = Math.max(EPSILON_ATR_FRACTION * atr, pipValue);
  const keyOf = (price: number): number => Math.round(price / bucketWidth);
  const bucketLo = (k: number): number => (k - 0.5) * bucketWidth;
  const bucketHi = (k: number): number => (k + 0.5) * bucketWidth;

  let minLow = Infinity;
  let maxHigh = -Infinity;
  for (const b of bars) {
    if (b.low < minLow) minLow = b.low;
    if (b.high > maxHigh) maxHigh = b.high;
  }
  const minKey = keyOf(minLow);
  const maxKey = keyOf(maxHigh);

  // ── Stage 1: swing-point extraction (the reaction signature) ──
  const points = extractSwingPoints(bars, pipValue);

  // ── Stage 2: the matrix (zero-filled — every bucket exists) + swing
  //    events placed at their price bucket × ISO week. ──
  const matrix = new Map<number, Map<string, ReactionEvent[]>>();
  for (let k = minKey; k <= maxKey; k++) {
    matrix.set(k, new Map());
  }
  const eventOf = (p: SwingPoint): ReactionEvent => ({
    firstTouchMs: p.ms,
    lastTouchMs: p.ms,
    price: p.price,
    anatomy: p.anatomy,
    session: sessionOf(p.ms),
    isoWeek: isoWeekKey(p.ms),
    bars: 1, // a swing point is a single-bar turn — the atomic reaction
    pierced: false, // pierce is a zone-level concept (§6.4), not a swing property
  });
  for (const p of points) {
    const k = keyOf(p.price);
    const weeks = matrix.get(k);
    if (!weeks) continue; // point outside the observed grid — impossible by construction, guarded for totality
    const ev = eventOf(p);
    const list = weeks.get(ev.isoWeek) ?? [];
    list.push(ev);
    weeks.set(ev.isoWeek, list);
  }

  // ── Stage 3: price clustering (single-linkage, span-capped — the
  //    anti-chaining guard). Points are sparse, so linkage never floods. ──
  const sorted = [...points].sort((a, b) => (a.price - b.price) || (a.ms - b.ms));
  const tol = CLUSTER_TOLERANCE_PIPS * pipValue;
  const maxSpan = CLUSTER_MAX_SPAN_PIPS * pipValue;
  const clusters: SwingPoint[][] = [];
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

  // ── Canon absorption: the lqz-lobe's 3-pattern detector stays the
  //    PER-PATTERN evidence layer (§6.2). ──
  const canonZones = detectLiquidityZones(pair, bars, lookback);

  // ── Stage 4: the confirmation gate (≥3 swing points ∧ recurrence
  //    across ≥2 distinct participation windows). ──
  const entries: LqzMatrixEntry[] = [];
  for (const cluster of clusters) {
    if (cluster.length < MIN_CLUSTER_POINTS) continue;
    const windows = new Set(cluster.map((p) => participationKey(p.ms)));
    if (windows.size < MIN_RECURRENCE_WINDOWS) continue;

    const events = cluster
      .map(eventOf)
      .sort((a, b) => (a.firstTouchMs - b.firstTouchMs) || (a.price - b.price));
    const touchCount = events.length;

    // Center = prominence-weighted mean: the level is where the SHARPEST
    // turns happened (a week-high reversal outweighs a noise-floor wiggle).
    let weightedSum = 0;
    let weightTotal = 0;
    for (const p of cluster) {
      // Plateau leaders carry prominence 0; floor every point's weight at
      // 1 pip so a defended shelf still votes (its defense IS the signal).
      const w = Math.max(p.prominence, pipValue);
      weightedSum += p.price * w;
      weightTotal += w;
    }
    const center = weightTotal > 0 ? weightedSum / weightTotal : cluster[0]!.price;

    let bottom = Infinity;
    let top = -Infinity;
    for (const p of cluster) {
      if (p.price < bottom) bottom = p.price;
      if (p.price > top) top = p.price;
    }

    const weekSpan = new Set(events.map((e) => e.isoWeek)).size;

    const distinctKinds = new Set<string>();
    for (const ev of events) distinctKinds.add(ev.anatomy);
    const tolerance = CANON_ALIGN_TOLERANCE_PIPS * pipValue;
    const canonPatterns: string[] = [];
    for (const cz of canonZones) {
      if (cz.bottom <= top + tolerance && cz.top >= bottom - tolerance) {
        for (const p of cz.patterns) {
          if (!canonPatterns.includes(p)) canonPatterns.push(p);
        }
      }
    }
    const confirmationPatterns = [
      ...KIND_DOMINANCE.filter((kind) => distinctKinds.has(kind)),
      ...canonPatterns,
    ];

    entries.push({
      priceCenter: center,
      top,
      bottom,
      side: center > spot ? 'BUY_SIDE' : 'SELL_SIDE',
      touchEvents: events,
      weekSpan,
      confirmationPatterns,
      // Canon LQZ zfp ladder (§6.2.1 Stage 4 = lqz-lobe.ts:392 EXACTLY):
      // a CONFIRMED LQZ is a Hard Wall when fresh (20); +5 per 2 touches
      // beyond 3 (exhaustion); capped 60.
      zfp: Math.min(60, 20 + Math.max(0, Math.floor((touchCount - 3) / 2)) * 5),
    });
  }

  entries.sort((a, b) => a.priceCenter - b.priceCenter);
  return { entries, matrix, bucketWidth, timeframe: tf };
}

/** Slice to the canon lookback window (deterministic — last N bars). */
function bars1HSlice(bars: OHLCBar[], lookback: number): OHLCBar[] {
  return bars.length > lookback ? bars.slice(bars.length - lookback) : bars;
}

// ═══════════════════════════════════════════════════════════════════════════════
// §6.2 → §7 BRIDGE — the matrix as discrete ladder rungs (v4.4.0c)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * matrixLadderRungs — project the §6.2 matrix entries onto §7 ScaffoldRung
 * shape so the model's ladder carries the REFINED discrete rungs (the
 * operator's drawn rungs: 100.849, 100.909, 100.949, 101.000, 101.054,
 * 101.130, 101.208, 101.253…) alongside the canon lqz-lobe's coarse merged
 * zones. The §7 ladder is "the v4.3 scaffold, now model-fed" (§5) — the
 * matrix IS the model's liquidity vision; without this bridge the ladder
 * sees only the merged canon blobs (e.g. one [100.566,101.572] rung) and
 * the next-rung SL / Law-14 TP walks starve.
 *
 * FIELD DOCTRINE (each with a BECAUSE, §12 Law 5):
 *   type 'LIQUIDITY', timeframe = the tier's (threaded — '1H' default;
 *     '30m'/'15m' on the telescoped runs, Phase 2 T5b). The rung's
 *     timeframe is the tier whose bars produced its matrix.
 *   classification 'MoM' — a liquidity shelf is mid-structure, never a BoM.
 *   reactionCount = SWEEP-count, NOT total touches — for a LIQUIDITY level
 *     the consumption event is the SWEEP (resting orders TAKEN); a
 *     WICK_REJECT / BODY_DEFEND is the level DEFENDED — the liquidity is
 *     still resting behind it (that is precisely why price returns to it,
 *     and why the operator draws it as a target). Total-touch counting
 *     would mark every confirmed rung depleted (≥3 touches is the entry
 *     gate) and the Law-14 walk would exclude the entire matrix as
 *     targets — vacuous doctrine.
 *   liquidityScore = zfp — the canon LQZ zfp ladder (§6.2.1 Stage 4) is
 *     the level's resting-order score; the Law-14 significance tier
 *     "liquidityScore ≥ 5" (Earth+Fire) reads it directly (zfp ≥ 20 for
 *     every confirmed entry → all matrix rungs carry the tier).
 *   id namespace `LQZ_M` — distinct from the scaffold's own LQZ rungs
 *     (merged canon zones) so provenance is unambiguous and ids never
 *     collide. Non-1H tiers EXTEND the namespace with the tier
 *     (`LQZ_M|30m|<price>`, `LQZ_M|15m|<price>`): the telescoped tiers'
 *     nested rungs must stay DISTINCT across tiers (the Phase 2 T5b
 *     "kept, never merged" invariant), and the ladder's dedup keys on id.
 */
export function matrixLadderRungs(
  pair: string,
  entries: LqzMatrixEntry[],
  timeframe?: Timeframe,
): import('../engines/ladder-scaffold.js').ScaffoldRung[] {
  const tf = timeframe ?? '1H';
  const dec = pair === 'DXY' ? 3 : 5;
  const rungs: import('../engines/ladder-scaffold.js').ScaffoldRung[] = [];
  for (const e of entries) {
    const sweeps = e.touchEvents.filter((t) => t.anatomy === 'SWEEP').length;
    rungs.push({
      // 1H keeps the legacy id byte-identical; lower tiers namespace by tf
      // so ids never collide across tiers (the kept-rungs invariant).
      id: tf === '1H'
        ? `${pair}|LQZ_M|${e.priceCenter.toFixed(dec)}`
        : `${pair}|LQZ_M|${tf}|${e.priceCenter.toFixed(dec)}`,
      pair,
      price: e.priceCenter,
      type: 'LIQUIDITY',
      top: e.top,
      bottom: e.bottom,
      timeframe: tf,
      classification: 'MoM',
      source: 'LQZ',
      confluence: 0,
      zfp: e.zfp,
      reactionCount: sweeps,
      liquidityScore: e.zfp,
      side: e.side === 'BUY_SIDE' ? 'ABOVE' : 'BELOW',
      evidence: `§6.2 matrix rung: ${e.touchEvents.length} touches (${sweeps} sweeps), wk=${e.weekSpan}, patterns=${e.confirmationPatterns.join('+')}`,
    });
  }
  return rungs;
}
