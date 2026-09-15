/**
 * OBCV — Order Block Candle Vision (PLUTUS_V4.5.2_OVERHAUL_ENGINEERING_SPEC §4.2-4.7).
 *
 * ═══════════════════════════════════════════════════════════════
 * "We should also build an OBCV (order block candle vision) machine on the
 *  same principles that finds all the OBs using its own MPSE function. I
 *  dont think matrices apply here like they do with LQZ since there arent
 *  dozens of candles reacting to the same level." — the operator
 *
 * LMV finds levels that DOZENS of candles react to (clustering matrix). An
 * order block is the OPPOSITE shape of evidence: ONE candle that a big move
 * started from (singular event). The impulse candle is the sprinter
 * exploding out of the blocks; the order block is the blocks themselves —
 * the candle right before. OBCV finds every explosion, looks one candle
 * back, and classifies the block. Matrices apply to OBs as ORIGIN-CANDLE
 * FEATURE ROWS, not reaction-clustering (§4.2).
 *
 * Sub-engines (each a pure total function of its inputs):
 *   O1 The Displacement Field  — ATR-normalized impulse detection (§4.3)
 *   O2 Origin-Candle Features  — bw/bf/rng/dir/prior row + the width gate (§4.4)
 *   O3 Prior-Move Classifier   — piecewise-total BoM/MoM/REJECT (§4.5)
 *   O4 Telescoping Incidence   — 30m→1H (required), 1H→4H (optional) nesting (§4.6)
 *   O5 Firewall + zfp          — partition/nesting/width asserts; canon zfp (§4.7)
 *
 * Phase 4 invariants (§4.8): singular-origin law (zone range == the origin
 * candle's [low, high] — NEVER the impulse candle); BoM-origin law (BoM
 * exists ONLY at 4H/1H — 30m is MoM-only); orphan law (every 30m has a 1H
 * parent); partition law (each origin candle → exactly one of {BoM, MoM,
 * REJECT} — no overlaps, no gaps); rolling-ATR law (ATR14(i) NEVER includes
 * bar i — v4.4 Bug-3).
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { barAnatomy } from './util.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC CONTRACT — Phase 4 (wired by ob-engine.ts buildZoneMap; EXACT)
// ═══════════════════════════════════════════════════════════════════════════════

/** The OBCV timeframes (§4.1 — 4H + 1H + 30m; 30m is NOT an origin TF). */
export type ObcvTf = '4H' | '1H' | '30m';

/** An order block zone — the FULL range of the singular origin candle. */
export interface ObZone {
  id: string;                 // `OB|${pair}|${tf}|${originMs}|${floor.toFixed(5)}`
  type: 'SUPPLY' | 'DEMAND';
  top: number;                // origin.high — the FULL origin-candle range (Bible L1146)
  bottom: number;             // origin.low
  timeframe: ObcvTf;
  classification: 'BoM' | 'MoM';
  formationMs: number;        // the origin candle's timestamp
  originIdx: number;          // the origin candle's bar index in the INPUT bar array
  bw: number;                 // body-to-wick ratio
  bf: number;                 // body fraction (body / range)
  prior: 'NONE' | 'OPPOSITE' | 'SAME';
  parent?: string;            // the telescoping parent zone id (O4 sets it; absent = top-level)
  zfp: number;                // canon ladder: BoM 10/18/32/65 · MoM 65/22/38/70 by freshness (0x here = 10/65)
}

export interface ObcvInput {
  barsByTf: Partial<Record<ObcvTf, OHLCBar[]>>;
  anchorMs: number;           // NO bars after this (the temporal anchor)
  pair: string;
  pipValue: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/** The TF order for deterministic output (4H → 1H → 30m, §12 Law 2). */
const OBCV_TIMEFRAMES: readonly ObcvTf[] = ['4H', '1H', '30m'];

/**
 * k = moveWindowBars(t) — the O1 forward-confirmation window (§4.3, verbatim):
 *   { 4H: 18, 1H: 36, 30m: 24 }.
 * BECAUSE: 4H 18 bars = 3 trading days (canon MIN_MOVE_TRADING_DAYS=3 × 6
 * bars/day — the strong-move qualification window); 1H 36 bars = 1.5 trading
 * days (MDVE_TF_OB_PARAMS['1H'].moveWindowBars = 36); 30m 24 bars = half a
 * trading day (the session-scale leg — the OBCV 30m re-scaling doctrine).
 */
const MOVE_WINDOW_BARS: Record<ObcvTf, number> = { '4H': 18, '1H': 36, '30m': 24 };

/**
 * θ_t — the O1 forward-displacement floor, in PIPS (§4.3: θ_4H=50, θ_1H=30,
 * θ_30m=20, "pips / ATR").
 * BECAUSE: the spec's D_t(i,k) ≥ θ_t with θ_t = THETA_PIPS[t] / ATR14_t(i)
 * reduces algebraically to displacementPips ≥ THETA_PIPS[t] — both sides are
 * scaled by the SAME rolling ATR (the "per ATR" context at bar i), so the
 * ATR denominators cancel. The pip values are canon: 50 =
 * SINGULAR_CANDLE.MIN_MOVE_PIPS (4H; Bible ≥0.5 DXY pts / 3 days); 30 =
 * MDVE_TF_OB_PARAMS['1H'].minMovePips (the golden 1H moves are 30-46 pips,
 * NOT 50 — v4.4 Bug-1 proof: bodyFail=32, moveFail=13, detected=0); 20 =
 * MDVE_TF_OB_PARAMS['30m'].minMovePips.
 */
const THETA_PIPS: Record<ObcvTf, number> = { '4H': 50, '1H': 30, '30m': 20 };

/** O1 condition (1): body[i] ≥ 1.5 × μ_body(i−4..i−1) — canon SINGULAR_CANDLE.BODY_MULTIPLIER (4h-sd-lobe.ts:908). */
const BODY_MULTIPLIER = 1.5;
/** O1 condition (1) lookback — canon SINGULAR_CANDLE.LOOKBACK = 4 preceding bars (4h-sd-lobe.ts:910). */
const BODY_LOOKBACK = 4;
/** O1 condition (2): body[i] ≥ 1.5 × ATR14_t(i) — the operator canon: ≥1.5×ATR(14), rolling (§4.3). */
const ATR_BODY_MULTIPLIER = 1.5;
/** Wilder's ATR period (§4.3 — ATR14). */
const ATR_PERIOD = 14;
/** O1 condition (4): N = moveWindowBars × this — the prior-extreme horizon for structureBroken (§4.3). */
const STRUCTURE_BREAK_HALF = 0.5;

/**
 * O2 width-gate floors — the operator's OBCV floors (2026-07-31), in pips
 * (§4.4): { 4H: 15, 1H: 8, 30m: 5 }. The doctrine; the CODE_MIN is the
 * SL-safety floor; the effective floor = max(OPERATOR_FLOOR, CODE_MIN).
 */
const OPERATOR_FLOOR: Record<ObcvTf, number> = { '4H': 15, '1H': 8, '30m': 5 };
/** O2 SL-safety floor, DXY (4h-sd-lobe.ts:228 — min 0.10 index points = 10 pips). */
const CODE_MIN_DXY = 10;
/** O2 SL-safety floor, FX (4h-sd-lobe.ts:228 — min 0.0020 = 20 pips). */
const CODE_MIN_FX = 20;
/** O2 width-gate ceilings (canon TF_CONSTRUCTION_PARAMS maxZoneWidthPips, 4h-sd-lobe.ts:65-67 + ob-engine.ts): { 4H: 40, 1H: 25, 30m: 15 }. */
const CODE_MAX: Record<ObcvTf, number> = { '4H': 40, '1H': 25, '30m': 15 };

/** O3 BoM body-to-wick floor — bw ≥ 3.0 (Bible L1157). */
const BW_BOM_MIN = 3.0;
/** O3 BoM body-fraction floor — bf ≥ 0.65 (Bible L1159). */
const BF_BOM_MIN = 0.65;
/** O3 prior-move NONE branch: prior range ≤ 0.5 × ATR14 (consolidation, §4.5). */
const PRIOR_RANGE_FRACTION = 0.5;
/** O3 prior-move NONE branch: |Σ body·dir/ATR14| < 0.25 (near-zero net push, §4.5). */
const PRIOR_NET_ABS_MIN = 0.25;

/** O5 zfp at 0x freshness (formation-time zones have NO retests — §4.7 canon ladders). */
const ZFP_BOM_0X = 10;
const ZFP_MOM_0X = 65;

// ═══════════════════════════════════════════════════════════════════════════════
// O1 — THE DISPLACEMENT FIELD
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wilder TR prefix sums over the whole array. TR[j] (j ≥ 1) = the Wilder
 * true range of bar j vs bar j−1; TR[0] ≡ 0; prefix[k] = Σ TR[1..k].
 * BECAUSE: the spec's Bug-3 fix is "TR prefix sums" (§4.3) — O(1) rolling
 * ATR queries that NEVER include the candidate bar.
 */
function buildAtrPrefix(bars: OHLCBar[]): number[] {
  const prefix = new Array<number>(bars.length).fill(0);
  let acc = 0;
  for (let j = 1; j < bars.length; j++) {
    const cur = bars[j]!;
    const prev = bars[j - 1]!;
    acc += Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
    prefix[j] = acc;
  }
  return prefix;
}

/**
 * ATR14_t(i) — the rolling ATR over bars [i−14, i−1], simple mean of Wilder
 * TRs via prefix sums (the seed value of the Wilder recurrence; matches
 * util.computeAtr's simple-mean semantics and the spec's "TR prefix sums").
 *
 * ROLLING-ATR LAW (§4.8 #5): NEVER includes bar i — the impulse bar would
 * inflate ATR and blind the detector (v4.4 Bug-3). Returns 0 when no prior
 * bar exists (degenerate — total).
 */
function atrAt(prefix: number[], i: number): number {
  const lo = Math.max(1, i - ATR_PERIOD);
  const hi = i - 1; // the last bar BEFORE i — never i itself
  if (hi < lo) return 0;
  return (prefix[hi]! - prefix[lo - 1]!) / (hi - lo + 1);
}

/**
 * μ_body(a..b) — mean body size (|close−open|) over [a, b], clamped to the
 * array head. Returns 0 when the window is empty or every body is zero
 * (canon 4h-sd-lobe.ts:317: avgBody === 0 → skip — avoids div-by-zero).
 */
function meanBody(bars: OHLCBar[], from: number, to: number): number {
  const lo = Math.max(0, from);
  if (to < lo) return 0;
  let sum = 0;
  for (let j = lo; j <= to; j++) sum += Math.abs(bars[j]!.close - bars[j]!.open);
  return sum / (to - lo + 1);
}

/**
 * structureBroken(i, t) — O1 condition (4): the impulse CLOSES beyond the
 * prior N-bar extreme, N = moveWindowBars/2 (§4.3). Bull (dir +1):
 * close[i] > max(high[i−N..i−1]); bear: close[i] < min(low[i−N..i−1]). An
 * empty prior window → false (no extreme to break — total).
 */
function structureBroken(bars: OHLCBar[], i: number, nBars: number, dir: 1 | -1): boolean {
  const s = Math.max(0, i - nBars);
  if (s >= i) return false;
  let extreme = dir === 1 ? -Infinity : Infinity;
  for (let j = s; j < i; j++) {
    extreme = dir === 1
      ? Math.max(extreme, bars[j]!.high)
      : Math.min(extreme, bars[j]!.low);
  }
  if (extreme === -Infinity || extreme === Infinity) return false;
  const close = bars[i]!.close;
  return dir === 1 ? close > extreme : close < extreme;
}

/**
 * O1 — isImpulse(i, t) ⟺ ALL FOUR conditions (§4.3):
 *   (1) body[i] ≥ 1.5 × μ_body(i−4..i−1)          — relative displacement
 *   (2) body[i] ≥ 1.5 × ATR14_t(i)                — operator canon (rolling)
 *   (3) D_t(i,k) ≥ θ_t                            — forward confirmation
 *   (4) structureBroken(i, t)                     — close beyond the prior N-bar extreme
 * where D_t(i,k) = (max close − min close over [i+1, i+k]) / ATR14_t(i) and the
 * θ comparison reduces to displacementPips ≥ THETA_PIPS[t] (see THETA_PIPS BECAUSE).
 * Total: any bar (including the array head/tail) returns a boolean.
 */
function isImpulse(
  bars: OHLCBar[],
  atrPrefix: number[],
  i: number,
  tf: ObcvTf,
  pipValue: number,
): boolean {
  const bar = bars[i]!;
  const body = Math.abs(bar.close - bar.open);

  // (1) relative displacement — body vs the mean of the prior BODY_LOOKBACK bodies
  const avgBody = meanBody(bars, i - BODY_LOOKBACK, i - 1);
  if (avgBody <= 0 || body < BODY_MULTIPLIER * avgBody) return false;

  // (2) the operator canon — ≥ 1.5×ATR(14), ROLLING (never includes bar i — Bug-3)
  const atr = atrAt(atrPrefix, i);
  if (atr <= 0 || body < ATR_BODY_MULTIPLIER * atr) return false;

  // (3) forward confirmation — the [i+1, i+k] close-range must span ≥ θ pips
  const k = MOVE_WINDOW_BARS[tf];
  const end = Math.min(bars.length, i + 1 + k);
  if (end <= i + 1) return false; // no forward bars — cannot confirm
  let maxClose = -Infinity;
  let minClose = Infinity;
  for (let j = i + 1; j < end; j++) {
    const c = bars[j]!.close;
    if (c > maxClose) maxClose = c;
    if (c < minClose) minClose = c;
  }
  if ((maxClose - minClose) / pipValue < THETA_PIPS[tf]) return false;

  // (4) structural break — close beyond the prior (k/2)-bar extreme
  // body > 0 is guaranteed here (avgBody > 0 passed), so close ≠ open.
  const dir: 1 | -1 = bar.close > bar.open ? 1 : -1;
  return structureBroken(bars, i, Math.floor(k * STRUCTURE_BREAK_HALF), dir);
}

// ═══════════════════════════════════════════════════════════════════════════════
// O2 — THE ORIGIN-CANDLE WIDTH GATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The width gate — dual-source reconciliation (§4.4, audit finding #5):
 *   widthGate(o, t) = (max(OPERATOR_FLOOR[t], CODE_MIN[pair]) ≤ rng ≤ CODE_MAX[t])
 * The operator's floors are the doctrine; the code min is the SL-safety
 * floor (prevents 0-pip SLs); the effective floor is the MAX of the two —
 * both must hold.
 */
function widthGate(tf: ObcvTf, pair: string, rngPips: number): boolean {
  const floor = Math.max(OPERATOR_FLOOR[tf], pair === 'DXY' ? CODE_MIN_DXY : CODE_MIN_FX);
  return floor <= rngPips && rngPips <= CODE_MAX[tf];
}

/** The effective width floor in pips — max(OPERATOR_FLOOR[t], CODE_MIN[pair]). */
function minWidthPips(tf: ObcvTf, pair: string): number {
  return Math.max(OPERATOR_FLOOR[tf], pair === 'DXY' ? CODE_MIN_DXY : CODE_MIN_FX);
}

// ═══════════════════════════════════════════════════════════════════════════════
// O3 — THE PRIOR-MOVE CLASSIFIER (piecewise-total)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * priorMove(o, L) — the prior-move class over the L bars before the origin
 * (L = moveWindowBars(t) — §4.5, verbatim). Piecewise-TOTAL: every input
 * maps to EXACTLY ONE of {NONE, OPPOSITE, SAME} — no gaps (§4.5 totality).
 *
 *   NONE     if range(o−L..o−1) ≤ 0.5×ATR14 ∧ |Σ body[j]·dir[j]/ATR14| < 0.25  (consolidation)
 *   OPPOSITE if sign(Σ body[j]·dir[j]/ATR14) == −dir(o)  (the prior leg moved AGAINST)
 *   SAME     if sign(Σ body[j]·dir[j]/ATR14) == +dir(o)  (mid-move shelf)
 *
 * A doji origin (dir 0) or a zero-net prior window → NONE (no directional
 * context — canon "no prior window → treat as the origin of the move",
 * 4h-sd-lobe.ts:397-398).
 */
function priorMove(
  bars: OHLCBar[],
  atrPrefix: number[],
  o: number,
  tf: ObcvTf,
  pipValue: number,
): 'NONE' | 'OPPOSITE' | 'SAME' {
  const L = MOVE_WINDOW_BARS[tf];
  const from = Math.max(0, o - L);
  if (from >= o) return 'NONE'; // no prior bars — the move ORIGINATES here

  const atr = atrAt(atrPrefix, o); // ATR context at the origin (over [o−14, o−1])
  const atrPips = atr / pipValue;

  let rangeHigh = -Infinity;
  let rangeLow = Infinity;
  let net = 0; // Σ body[j]·dir[j] over the prior window (price units)
  for (let j = from; j < o; j++) {
    const b = bars[j]!;
    if (b.high > rangeHigh) rangeHigh = b.high;
    if (b.low < rangeLow) rangeLow = b.low;
    const dj = b.close > b.open ? 1 : b.close < b.open ? -1 : 0;
    net += Math.abs(b.close - b.open) * dj;
  }
  const rangePips = (rangeHigh - rangeLow) / pipValue;

  // NONE — consolidation: tight range ∧ near-zero net directional impulse
  if (atr > 0 && rangePips <= PRIOR_RANGE_FRACTION * atrPips
      && Math.abs(net) / atr < PRIOR_NET_ABS_MIN) {
    return 'NONE';
  }

  const dirO = bars[o]!.close > bars[o]!.open ? 1 : bars[o]!.close < bars[o]!.open ? -1 : 0;
  if (dirO === 0) return 'NONE'; // doji origin — no directional context (totality)
  if (net > 0) return dirO === 1 ? 'SAME' : 'OPPOSITE';
  if (net < 0) return dirO === -1 ? 'SAME' : 'OPPOSITE';
  return 'NONE'; // zero net impulse — no prior move (totality)
}

// ═══════════════════════════════════════════════════════════════════════════════
// O2 + O3 — THE ORIGIN-CANDLE CLASSIFIER (assembles an ObZone)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * classifyOrigin — the origin-candle feature row and the piecewise-total
 * classifier (§4.4-4.5). Returns an ObZone for {BoM, MoM}, or null for
 * REJECT (the mandatory honesty branch — a marginal candle is NOT downgraded
 * to MoM, it is rejected; the empty set is fine, §4.5).
 *
 *   F[o] = [bw, bf, rng, dir, prior]; zone range = [o.low, o.high] (singular-origin law)
 *   BoM   if prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate(o, t)
 *   MoM   if prior == SAME ∧ validOrigin(o) ∧ widthGate(o, t)
 *   REJECT otherwise                                  // totality: no undefined inputs
 *   validOrigin(o) = body(o) > 0 ∧ rng(o) ≥ minWidth(t)
 *
 * Direction → zone type (boolean implication): dir(o) = + → DEMAND;
 * dir(o) = − → SUPPLY (§4.5). BoM-origin law (§4.8 #2): BoM exists ONLY at
 * 4H/1H — a 30m BoM is forced to MoM at assembly (belt + suspenders with the
 * ob-engine T4 gate).
 *
 * @param originIdxInInput the origin candle's index in the CALLER's bar
 *        array (the anchor-filtered input's ORIGINAL index — reported so the
 *        wiring can index barsByTf[tf][originIdx] and recover the candle).
 */
function classifyOrigin(
  bars: OHLCBar[],
  atrPrefix: number[],
  o: number,
  tf: ObcvTf,
  pair: string,
  pipValue: number,
  originIdxInInput: number,
): ObZone | null {
  const ob = bars[o]!;
  const an = barAnatomy(ob);
  const rng = (ob.high - ob.low) / pipValue;
  const gate = widthGate(tf, pair, rng);
  const body = an.bodySize;
  // bw = body / max(wickTop, wickBottom) — a full-body candle (zero wicks) → Infinity, passes.
  const bw = an.bodySize / Math.max(an.upperWick, an.lowerWick);
  // bf = body / (high − low) — a flat bar (range 0) → NaN, fails every floor (total).
  const bf = an.bodySize / (ob.high - ob.low);
  const prior = priorMove(bars, atrPrefix, o, tf, pipValue);

  let classification: 'BoM' | 'MoM' | null = null;
  if ((prior === 'NONE' || prior === 'OPPOSITE') && bw >= BW_BOM_MIN && bf >= BF_BOM_MIN && gate) {
    classification = 'BoM';
  } else if (prior === 'SAME' && body > 0 && rng >= minWidthPips(tf, pair) && gate) {
    classification = 'MoM'; // validOrigin(o) = body > 0 ∧ rng ≥ minWidth(t)
  }
  if (classification === null) return null; // REJECT — totality (no undefined path)

  // body > 0 is guaranteed by either branch above, so close ≠ open.
  const type: 'SUPPLY' | 'DEMAND' = ob.close > ob.open ? 'DEMAND' : 'SUPPLY';

  // BoM-origin law (§4.8 #2): 30m is NEVER a BoM origin — 30m is MoM-only
  // (a session-scale candle cannot evidence the multi-session displacement a
  // BoM origin requires; redundant with the ob-engine T4 gate).
  if (tf === '30m' && classification === 'BoM') classification = 'MoM';

  // zfp at formation = 0x freshness (no retests exist yet — §4.7 canon
  // ladders: BoM 0x → 10 (Hard Wall); MoM 0x → 65 (virgin MoM pierces —
  // death zone per canon). The wiring min's a nested 30m against its parent.
  const zone: ObZone = {
    id: `OB|${pair}|${tf}|${ob.timestamp}|${ob.low.toFixed(5)}`,
    type,
    top: ob.high,      // the FULL origin-candle range (Bible L1146)
    bottom: ob.low,
    timeframe: tf,
    classification,
    formationMs: ob.timestamp,
    originIdx: originIdxInInput,
    bw,
    bf,
    prior,
    zfp: classification === 'BoM' ? ZFP_BOM_0X : ZFP_MOM_0X,
  };
  // `parent` is deliberately ABSENT — O4 links telescoping below.
  return zone;
}

// ═══════════════════════════════════════════════════════════════════════════════
// O4 — THE TELESCOPING INCIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

/** O4 containment: child ⊆ parent (price range), same type (§4.6). */
function containedIn(child: ObZone, parent: ObZone): boolean {
  return child.type === parent.type && child.bottom >= parent.bottom && child.top <= parent.top;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE DRIVER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build every BoM/MoM order block from raw bars, via the O1→O5 MPSE pipeline.
 *
 *   O1  anchor-filter → impulse scan (displacement field)
 *   O2  origin = i−1 → feature row + width gate
 *   O3  prior-move classifier → {BoM, MoM} | REJECT
 *   O4  30m→1H telescoping (orphans rejected); 1H→4H optional nesting
 *   O5  firewall asserts (partition / nesting / width canon) — THROW on failure
 *
 * TEMPORAL ANCHOR: every bar with timestamp > anchorMs is excluded BEFORE
 * detection (§ the ObcvInput.anchorMs contract — the model never sees the
 * future). originIdx is reported against the caller's ORIGINAL bar array.
 * Total: any input (including empty/missing TF arrays) yields a list
 * (possibly empty) — flat data has zero displacement, so zero impulses.
 */
export function buildObcv(input: ObcvInput): ObZone[] {
  const { barsByTf, anchorMs, pair, pipValue } = input;
  const zones: ObZone[] = [];

  // ── O1: per-TF anchor filter + displacement-field scan ──
  for (const tf of OBCV_TIMEFRAMES) {
    const raw = barsByTf[tf] ?? [];
    // The working array keeps each bar's index in the CALLER's array, so
    // originIdx stays valid for barsByTf[tf][originIdx] downstream.
    const working: Array<{ bar: OHLCBar; idx: number }> = [];
    for (let idx = 0; idx < raw.length; idx++) {
      const bar = raw[idx]!;
      if (bar.timestamp <= anchorMs) working.push({ bar, idx }); // NO bars after the anchor
    }
    if (working.length === 0) continue;

    const bars = working.map((w) => w.bar);
    const atrPrefix = buildAtrPrefix(bars);

    for (let i = 0; i < bars.length; i++) {
      if (!isImpulse(bars, atrPrefix, i, tf, pipValue)) continue;
      const o = i - 1; // the ORDER BLOCK is the candle IMMEDIATELY BEFORE the impulse
      if (o < 0) continue; // degenerate: an impulse at index 0 has no origin (total)
      const zone = classifyOrigin(bars, atrPrefix, o, tf, pair, pipValue, working[o]!.idx);
      if (zone !== null) zones.push(zone); // REJECT is dropped — the honesty rule (§4.5)
    }
  }

  // ── O4: the telescoping incidence (§4.6) ──
  //   30m REQUIRES a 1H parent (orphan → REJECT — 30m is not an origin TF);
  //   1H MAY refine a 4H zone (optional nesting — no rejection);
  //   never skip a level; same-TF siblings are SEPARATE zones (each origin
  //   candle is singular — no same-TF merging, §4.6).
  const oneH = zones.filter((z) => z.timeframe === '1H');
  const fourH = zones.filter((z) => z.timeframe === '4H');
  const nested: ObZone[] = [];
  for (const z30 of zones.filter((z) => z.timeframe === '30m')) {
    const parent = oneH.find((z1) => containedIn(z30, z1)); // first containing parent — deterministic
    if (!parent) continue; // ORPHAN 30m → REJECTED (the operator's rule: 30m is not an origin TF)
    z30.parent = parent.id;
    nested.push(z30);
  }
  for (const z1 of oneH) {
    const parent = fourH.find((z4) => containedIn(z1, z4));
    if (parent) z1.parent = parent.id; // optional nesting — the 1H keeps its own identity
    nested.push(z1);
  }
  nested.push(...fourH);

  // ── O5: the firewall — a HARD gate ("work or fail" doctrine, §4.7) ──
  const boM = nested.filter((z) => z.classification === 'BoM').length;
  const moM = nested.filter((z) => z.classification === 'MoM').length;
  if (boM + moM !== nested.length) {
    throw new Error(`OBCV firewall: partition law violated (BoM ${boM} + MoM ${moM} != ${nested.length} zones)`);
  }
  for (const z of nested) {
    if (z.timeframe === '30m' && z.parent === undefined) {
      throw new Error(`OBCV firewall: nesting law violated — orphan 30m zone ${z.id}`);
    }
    if (!widthGate(z.timeframe, pair, (z.top - z.bottom) / pipValue)) {
      throw new Error(`OBCV firewall: width canon violated for ${z.id}`);
    }
  }

  // Deterministic output order (same bars → byte-identical list, §12 Law 2):
  // timeframe (4H → 1H → 30m), then price ascending, then formation time.
  const tfOrder: Record<ObcvTf, number> = { '4H': 0, '1H': 1, '30m': 2 };
  return nested.sort(
    (a, b) =>
      (tfOrder[a.timeframe]! - tfOrder[b.timeframe]!) ||
      (a.bottom - b.bottom) ||
      (a.formationMs - b.formationMs),
  );
}
