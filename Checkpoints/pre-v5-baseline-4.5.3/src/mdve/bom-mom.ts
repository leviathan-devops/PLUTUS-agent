/**
 * MDVE BoM/MoM — the anatomy classifier (PLUTUS_V4.4_MDVE_SPEC §6.3).
 *
 * ═══════════════════════════════════════════════════════════════
 * "Which S/D zones are BoM vs MoM (discernible from the candle body data
 * of BS/WL before/after the OB candle)" — the operator.
 *
 * The piecewise-TOTAL classifier (every input → exactly one branch):
 *
 *   classifyRole(ob, barsBefore, barsAfter) =
 *     { BoM,  if ∃ sweepEvent(barsBefore, ob) within SWEEP_LOOKBACK bars
 *               ∧ displacement after ob ≥ θ        // the OB ORIGINATED the leg
 *     { MoM,  if legEstablished(barsBefore)        // price was already moving
 *               ∧ consolidationAnatomy(ob)         // the OB is a mid-leg shelf
 *     { MoM,  otherwise }                          // exhaustiveness: default weaker
 *
 * Predicates (§6.3):
 *   sweepEvent: a candle whose wick exceeds the prior N-bar extreme and
 *     whose body closes back inside (sweep anatomy — pure OHLC).
 *   legEstablished: the move direction was already in force before the OB
 *     (prior displacement in the same direction) — this is canon
 *     classifyOrderBlock (4h-sd-lobe.ts:383-409) formalized.
 *   consolidationAnatomy: the OB sits inside a tight multi-candle range
 *     (body overlap ≥ 50% across 2-4 candles).
 *
 * SWEEP WINDOW (deviation note): §6.3's text says "barsBefore", but the
 * golden trace (Appendix A.1) has the sweep candle as the DISPLACEMENT
 * ORIGIN immediately AFTER the OB ("The sweep origin candle (Jul 6 ~06:00)
 * IS the displacement origin; the candle before it = the OB → BoM"). The
 * sweep window therefore covers [obIndex − SWEEP_LOOKBACK, obIndex + 1] —
 * the OB's own breakout candle may BE the sweep candle. This is the only
 * reading that reproduces the golden trace.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { barAnatomy } from './util.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sweep lookback (bars before the OB). = 24 (1H ≈ 1 trading day).
 * BECAUSE: canon SWEEP_LEVEL_LOOKBACK_BARS = 24 (lqz-lobe.ts:134) — the
 * established window for "the prior extreme a sweep pierces". TF-scaled by
 * the caller via the move-window (the OB detection already uses TF-scaled
 * windows); at 1H the canon value applies directly.
 */
export const SWEEP_LOOKBACK_BARS = 24;

/**
 * Sweep wick-close fraction: the sweep candle's closing body must sit in
 * the half of its range AWAY from the pierced extreme ((close − low) /
 * (high − low) ≥ 0.5 for a sweep low).
 * BECAUSE: §6.5.1 findSweepOrigin uses the identical 0.5 sweep-anatomy
 * threshold ("lower-wick ≥ 50% of range — sweep anatomy") — one canon
 * anatomy constant shared by the narrative and the role classifier.
 */
const SWEEP_CLOSE_FRACTION = 0.5;

/**
 * Consolidation body-overlap floor: the common body intersection of the
 * window candles must be ≥ 50% of the smallest body in the window.
 * BECAUSE: §6.3 verbatim — "body overlap ≥ 50% across 2-4 candles".
 */
const CONSOL_BODY_OVERLAP_FRACTION = 0.5;

/**
 * Consolidation window size (candles ending at the OB).
 * BECAUSE: §6.3 verbatim — "across 2-4 candles".
 */
const CONSOL_WINDOW_MAX = 4;

// ═══════════════════════════════════════════════════════════════════════════════
// THE CLASSIFIER (piecewise-total)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BoMMoMInput {
  /** The TF bars in the SAME window the OB detector scanned (recent bars). */
  bars: OHLCBar[];
  /** Index of the ORDER BLOCK candle (the candle immediately before the breakout). */
  obIndex: number;
  /** Breakout direction ('bull' → demand zone, 'bear' → supply zone). */
  direction: 'bull' | 'bear';
  /**
   * Move window in bars (≥ 3 trading days, TF-scaled).
   * BECAUSE: canon SINGULAR_CANDLE.MIN_MOVE_TRADING_DAYS × BARS_PER_DAY[tf]
   * (4h-sd-lobe.ts:120-121) — the strong-move qualification window.
   */
  moveWindowBars: number;
  /**
   * Strong-move threshold in price (θ).
   * BECAUSE: canon SINGULAR_CANDLE.MIN_MOVE_PIPS × pipValue
   * (4h-sd-lobe.ts:122) — ≥ 0.5 DXY points over ≥ 3 trading days.
   */
  minMovePrice: number;
  /**
   * Source timeframe of the scanned bars (optional). The operator's
   * BoM-origin law (2026-07-31): 30m/15m are NEVER BoM origins — 30m is
   * valid for MoM only (E2 reaction points for SS/R shapes) and only
   * refines 1H origins. When present and '30m'/'15m', classifyBoMMoM
   * returns 'MoM' unconditionally. When absent/'4H'/'1H', the piecewise
   * anatomy classifier runs unchanged (byte-identical behavior).
   */
  timeframe?: '4H' | '1H' | '30m' | '15m';
}

/**
 * Classify an order block as BoM (Beginning of Move) or MoM (Middle of
 * Move) from pure candle anatomy. Piecewise-TOTAL: every input maps to
 * exactly one branch; the explicit OTHERWISE branch defaults to MoM (the
 * weaker class — §6.3 exhaustiveness rule).
 */
export function classifyBoMMoM(input: BoMMoMInput): 'BoM' | 'MoM' {
  // The operator's BoM-origin law (2026-07-31): 30m/15m are NEVER BoM origins.
  // 30m is valid for MoM only (E2 reaction points for SS/R shapes); 30m only refines 1H origins.
  if (input.timeframe === '30m' || input.timeframe === '15m') return 'MoM';

  const { bars, obIndex, direction, moveWindowBars, minMovePrice } = input;
  const ob = bars[obIndex];
  if (!ob) return 'MoM'; // degenerate input → weaker class (totality)

  // ── THE BoM QUALITY GATES (Bible 4.0 §4.7 — the ZERO TOLERANCE canon) ──
  // "Body-to-wick ratio: ≥ 3.0 for BoM classification... Origin body ratio:
  // ≥ 0.65 for BoM. The body must cover at least 65% of the candle's total
  // range (body / (high - low) ≥ 0.65). This ensures the candle is
  // institutionally sourced." A candle failing the gates is NOT a valid BoM —
  // it returns the weaker class 'MoM' (the §6.3 exhaustiveness rule: the
  // piecewise-TOTAL contract — every input maps to exactly one branch).
  const body = Math.abs(ob.close - ob.open);
  const upperWick = ob.high - Math.max(ob.open, ob.close);
  const lowerWick = Math.min(ob.open, ob.close) - ob.low;
  const bodyToWick = body / Math.max(upperWick, lowerWick);
  const bodyFraction = body / (ob.high - ob.low);
  // NaN (a zero-range candle) fails the gate — NaN comparisons are false, so
  // the finite check is explicit: a candle with no range has no displacement.
  if (!Number.isFinite(bodyToWick) || !Number.isFinite(bodyFraction) || bodyToWick < 3.0 || bodyFraction < 0.65) {
    return 'MoM'; // the institutional body proof is absent → the weaker class
  }

  // ── Branch 1: BoM — sweep event near the OB ∧ displacement after ≥ θ ──
  const displaced = displacementAfter(bars, obIndex, direction, moveWindowBars) >= minMovePrice;
  if (displaced && sweepEventNear(bars, obIndex, direction)) {
    return 'BoM';
  }

  // ── Branch 2: MoM — leg already established ∧ the OB is a mid-leg shelf ──
  if (
    legEstablished(bars, obIndex, direction, moveWindowBars, minMovePrice) &&
    consolidationAnatomy(bars, obIndex)
  ) {
    return 'MoM';
  }

  // ── Branch 3: OTHERWISE → MoM (exhaustiveness: default to the weaker class) ──
  return 'MoM';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREDICATES (§6.3 — pure OHLC)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * displacementAfter — the max travel from the OB's close in the breakout
 * direction over the move window following the breakout candle.
 * Mirrors the canon strong-move confirmation (4h-sd-lobe.ts:322-336).
 */
export function displacementAfter(
  bars: OHLCBar[],
  obIndex: number,
  direction: 'bull' | 'bear',
  moveWindowBars: number,
): number {
  const ob = bars[obIndex]!;
  const start = obIndex + 1; // the breakout candle
  const end = Math.min(bars.length, start + moveWindowBars);
  let extreme = direction === 'bull' ? -Infinity : Infinity;
  for (let k = start; k < end; k++) {
    extreme = direction === 'bull'
      ? Math.max(extreme, bars[k]!.high)
      : Math.min(extreme, bars[k]!.low);
  }
  if (extreme === -Infinity || extreme === Infinity) return 0;
  return direction === 'bull' ? extreme - ob.close : ob.close - extreme;
}

/**
 * sweepEventNear — ∃ a candle in [obIndex − SWEEP_LOOKBACK, obIndex + 1]
 * whose wick exceeds the prior N-bar extreme and whose body closes back
 * inside (sweep anatomy — §6.3).
 *
 * Direction binding: a BULL breakout's BoM is born from a SWEEP LOW (the
 * manipulation leg swept sell-side liquidity before the rally); a BEAR
 * breakout's BoM from a SWEEP HIGH. The prior extreme is computed over the
 * SWEEP_LOOKBACK bars before the candidate candle (canon 24-bar level
 * lookback, lqz-lobe.ts:134).
 */
function sweepEventNear(
  bars: OHLCBar[],
  obIndex: number,
  direction: 'bull' | 'bear',
): boolean {
  const from = Math.max(1, obIndex - SWEEP_LOOKBACK_BARS);
  const to = Math.min(bars.length - 1, obIndex + 1); // incl. the breakout candle
  for (let i = from; i <= to; i++) {
    const bar = bars[i]!;
    const range = bar.high - bar.low;
    if (range <= 0) continue;

    // Prior extreme over the lookback window BEFORE the candidate candle.
    let priorLow = Infinity;
    let priorHigh = -Infinity;
    const lookStart = Math.max(0, i - SWEEP_LOOKBACK_BARS);
    for (let j = lookStart; j < i; j++) {
      priorLow = Math.min(priorLow, bars[j]!.low);
      priorHigh = Math.max(priorHigh, bars[j]!.high);
    }
    if (priorLow === Infinity || priorHigh === -Infinity) continue;

    if (direction === 'bull') {
      // SWEEP LOW: wick pierced the prior extreme low, body closed back above.
      const pierced = bar.low < priorLow && bar.close > priorLow;
      const wickDominant = (bar.close - bar.low) / range >= SWEEP_CLOSE_FRACTION;
      if (pierced && wickDominant) return true;
    } else {
      // SWEEP HIGH: mirror image.
      const pierced = bar.high > priorHigh && bar.close < priorHigh;
      const wickDominant = (bar.high - bar.close) / range >= SWEEP_CLOSE_FRACTION;
      if (pierced && wickDominant) return true;
    }
  }
  return false;
}

/**
 * legEstablished — the move direction was already in force before the OB:
 * price had already traveled ≥ minMovePrice in the breakout direction over
 * the preceding move window. This IS canon classifyOrderBlock
 * (4h-sd-lobe.ts:383-409 — replicated verbatim, cited, not imported: the
 * helper is not exported and the canon lobes must not be modified).
 */
export function legEstablished(
  bars: OHLCBar[],
  obIndex: number,
  direction: 'bull' | 'bear',
  moveWindowBars: number,
  minMovePrice: number,
): boolean {
  const start = obIndex - moveWindowBars;
  // No prior window available — canon treats this as the ORIGIN (not established).
  if (start < 0) return false;

  const originClose = bars[obIndex]!.close;
  let priorExtreme = direction === 'bull' ? Infinity : -Infinity;
  for (let k = start; k < obIndex; k++) {
    priorExtreme = direction === 'bull'
      ? Math.min(priorExtreme, bars[k]!.low)
      : Math.max(priorExtreme, bars[k]!.high);
  }
  if (priorExtreme === Infinity || priorExtreme === -Infinity) return false;

  const priorMove = direction === 'bull'
    ? originClose - priorExtreme
    : priorExtreme - originClose;

  return priorMove >= minMovePrice;
}

/**
 * consolidationAnatomy — the OB sits inside a tight multi-candle range:
 * the common body intersection of the window (2-4 candles ending at the
 * OB) covers ≥ 50% of the smallest body in the window (§6.3 verbatim).
 */
export function consolidationAnatomy(bars: OHLCBar[], obIndex: number): boolean {
  const from = Math.max(0, obIndex - (CONSOL_WINDOW_MAX - 1));
  if (obIndex - from < 1) return false; // need ≥ 2 candles ("2-4 candles")

  let commonTop = Infinity;    // min of body tops
  let commonBottom = -Infinity; // max of body bottoms
  let minBody = Infinity;
  for (let i = from; i <= obIndex; i++) {
    const an = barAnatomy(bars[i]!);
    commonTop = Math.min(commonTop, an.bodyTop);
    commonBottom = Math.max(commonBottom, an.bodyBottom);
    minBody = Math.min(minBody, an.bodySize);
  }
  if (minBody <= 0 || minBody === Infinity) return false;

  const overlap = Math.max(0, commonTop - commonBottom);
  return overlap >= CONSOL_BODY_OVERLAP_FRACTION * minBody;
}
