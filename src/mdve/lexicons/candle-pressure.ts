/**
 * candle-pressure.ts — LEXICON 1: the per-candle battle semantics.
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 1 — the design authority.)
 *
 * Decode WHO won each battle from the candle's wick/body/close anatomy — the
 * defend/reject/sweep/dwell/pass state that feeds the zone's pressure lifecycle.
 * The operator's doctrine (verbatim): "the rendered artifacts are the candles...
 * you must see what GENERATED the rendered artifact" — the candle is the TRIGGER;
 * the pressure state is the GENERATOR.
 *
 * THE MPSE FORM (the exhaustiveness invariant): the classifyTouch piecewise-total
 * predicate (lqz-matrix.ts:196-241) — ∀ candle: EXACTLY ONE branch fires (the
 * families' suggestive predicates are the canonical branch conditions, mutually
 * exclusive by construction — reproduced here deterministically, never imported,
 * so the lexicon is self-contained). The recurrence: reactionCountₙ₊₁ =
 * reactionCountₙ + [sweep]. The wick-mass sums (the linear combination).
 *
 * THE PREDICATES (each the canonical condition, deterministic — a numeric
 * comparison / a set membership / a piecewise branch):
 *   BODY_DEFEND  — body entered the band + the next bar turned ≥ max(2p, 0.5×ATR)
 *                  against the approach (the defended-edge accumulator).
 *   WICK_REJECT  — a ≥2p wick INTO the band + the body reversed + retreated to
 *                  the approach side (the side-vote input: THE SWEPT-SIDE LAW —
 *                  an upper wick → SELL_SIDE / a lower wick → BUY_SIDE).
 *   SWEEP        — the wick crossed the ENTIRE bucket ≥2p AND the body closed
 *                  back (the consumption — the reactionCount += 1).
 *   CONSOL_DWELL — ≥3 consecutive bars intersecting, span ≤ 2 bucket widths.
 *   PASS_THROUGH — the traversal without a reaction (the anti-noise exclusion).
 *
 * THE SIDE VOTE (the lmv.ts:618-645 consumer): the winning intent = the touch
 * kind; the reject family's WICK_REJECT maps to the side vote by the swept-side
 * anatomy (an upper wick → SELL_SIDE / a lower wick → BUY_SIDE; the approach is
 * the tie-break only) — the lexicon feeds the LMV's side determination.
 */
import {
  classifyByFamilies,
  confidenceOf,
  scoreFamily,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';

// ── the canon anchors (lqz-matrix.ts:164/173 — cited, never imported — the
//    lexicon is self-contained; a change to the canon MUST be ported here) ──
const MIN_TOUCH_DEPTH_PIPS = 2;
const REVERSAL_ATR_FRACTION = 0.5;
const CONSOL_DWELL_BARS = 3;
const CONSOL_DWELL_SPAN_BUCKETS = 2;

/** The candle's body/wick anatomy (barAnatomy — util.ts:63, cited). */
function anatomy(d: LexiconData): { bodyTop: number; bodyBottom: number; upperWick: number; lowerWick: number } {
  const open = d.open ?? 0;
  const close = d.close ?? 0;
  const high = d.high ?? 0;
  const low = d.low ?? 0;
  const bodyTop = Math.max(open, close);
  const bodyBottom = Math.min(open, close);
  return {
    bodyTop,
    bodyBottom,
    upperWick: high - bodyTop,
    lowerWick: bodyBottom - low,
  };
}

/** The min-depth anchor — max(2p, 0.5×ATR) in price units (lqz-matrix.ts:211-212). */
function revMin(d: LexiconData): number {
  const minDepth = MIN_TOUCH_DEPTH_PIPS * (d.pipValue ?? 0);
  return Math.max(minDepth, REVERSAL_ATR_FRACTION * (d.atr ?? 0));
}

/** The reference close — the previous bar's close (the approach side). */
function refCloseOf(d: LexiconData): number {
  return d.refClose ?? d.open ?? 0;
}

/** fromAbove / fromBelow — the approach side vs the widened bucket. */
function approachOf(d: LexiconData): { fromAbove: boolean; fromBelow: boolean } {
  const ref = refCloseOf(d);
  const hi = d.hi ?? 0;
  const lo = d.lo ?? 0;
  return { fromAbove: ref >= hi, fromBelow: ref <= lo };
}

// ── THE CANONICAL PREDICATES (the piecewise-total branches — exactly one fires) ──

/** BODY_DEFEND (lqz-matrix.ts:233-237): the body entered the band + the next
 *  bar turned ≥ revMin against the approach (the defended-edge accumulator). */
const predBodyDefend = (d: LexiconData): boolean => {
  const { bodyBottom, bodyTop } = anatomy(d);
  const hi = d.hi ?? 0;
  const lo = d.lo ?? 0;
  const { fromAbove, fromBelow } = approachOf(d);
  const bodyEnters = bodyBottom < hi && bodyTop > lo;
  if (!bodyEnters || (!fromAbove && !fromBelow)) return false;
  const next = d.next;
  if (!next) return false;
  const barClose = d.close ?? 0;
  const min = revMin(d);
  if (fromAbove && next.close !== undefined && next.close > barClose && next.close - hi >= min) return true;
  if (fromBelow && next.close !== undefined && next.close < barClose && lo - next.close >= min) return true;
  return false;
};

/** WICK_REJECT (lqz-matrix.ts:224-231): a ≥2p wick INTO the band + the body
 *  reversed + retreated to the approach side (the side-vote SELL/BUY input). */
const predWickReject = (d: LexiconData): boolean => {
  const { bodyTop, bodyBottom, lowerWick, upperWick } = anatomy(d);
  const hi = d.hi ?? 0;
  const lo = d.lo ?? 0;
  const { fromAbove, fromBelow } = approachOf(d);
  const minDepth = MIN_TOUCH_DEPTH_PIPS * (d.pipValue ?? 0);
  const close = d.close ?? 0;
  const open = d.open ?? 0;
  const lowerWickEnters = (d.low ?? 0) < hi && bodyBottom > lo;
  const upperWickEnters = bodyTop < hi && (d.high ?? 0) > lo;
  const wickThroughDown = (d.low ?? 0) < lo;
  const wickThroughUp = (d.high ?? 0) > hi;
  if (
    fromAbove && lowerWickEnters && !wickThroughDown &&
    lowerWick >= minDepth && close > open && close >= hi
  ) return true;
  if (
    fromBelow && upperWickEnters && !wickThroughUp &&
    upperWick >= minDepth && close < open && close <= lo
  ) return true;
  return false;
};

/** SWEEP (lqz-matrix.ts:221-222): the wick crossed the ENTIRE bucket ≥2p AND
 *  the body closed back — the consumption (the reactionCount += 1). */
const predSweep = (d: LexiconData): boolean => {
  const hi = d.hi ?? 0;
  const lo = d.lo ?? 0;
  const { fromAbove, fromBelow } = approachOf(d);
  const minDepth = MIN_TOUCH_DEPTH_PIPS * (d.pipValue ?? 0);
  const close = d.close ?? 0;
  const beyondDown = lo - (d.low ?? 0);
  const beyondUp = (d.high ?? 0) - hi;
  if (fromAbove && (d.low ?? 0) < lo && beyondDown >= minDepth && close >= lo) return true;
  if (fromBelow && (d.high ?? 0) > hi && beyondUp >= minDepth && close <= hi) return true;
  return false;
};

/** CONSOL_DWELL (lqz-matrix.ts:239/262-279): ≥3 consecutive bars intersecting
 *  the band, span ≤ 2 bucket widths (the level was occupied, not attacked). */
const predConsolDwell = (d: LexiconData): boolean => {
  const bars = d.bars;
  const index = d.index ?? 0;
  const hi = d.hi ?? 0;
  const lo = d.lo ?? 0;
  if (!bars || index < CONSOL_DWELL_BARS - 1) return false;
  const width = hi - lo;
  let spanTop = -Infinity;
  let spanBottom = Infinity;
  for (let j = index - (CONSOL_DWELL_BARS - 1); j <= index; j++) {
    const b = bars[j];
    if (!b) return false;
    if (b.low > hi || b.high < lo) return false;
    if (b.high > spanTop) spanTop = b.high;
    if (b.low < spanBottom) spanBottom = b.low;
  }
  return spanTop - spanBottom <= CONSOL_DWELL_SPAN_BUCKETS * width;
};

/** PASS_THROUGH — the traversal without a reaction (the anti-noise exclusion):
 *  NONE of the four reaction branches fires. The exhaustiveness complement. */
const predPassThrough = (d: LexiconData): boolean =>
  !predBodyDefend(d) && !predWickReject(d) && !predSweep(d) && !predConsolDwell(d);

// ── THE FAMILIES (the spec's table — the predicates reproduced verbatim) ──

/** defend — the body defended the level (BODY_DEFEND). */
const defendFamily = {
  id: 'BODY_DEFEND',
  group: 'candle-predicate' as const,
  // suggestive: the body closed against the approach + the next bar turned
  //             ≥ max(2p, 0.5×ATR) against (the defended-edge accumulator)
  suggestive: [predBodyDefend],
  // descriptive: the body closed THROUGH the level (no defense)
  descriptive: [
    (d: LexiconData): boolean => {
      const { bodyTop, bodyBottom } = anatomy(d);
      const hi = d.hi ?? 0;
      const lo = d.lo ?? 0;
      return bodyBottom < hi && bodyTop > lo && ((d.close ?? 0) >= hi || (d.close ?? 0) <= lo);
    },
  ],
  // substitute: the wick touched the band (a touch ≠ a defense) — pos +2
  substitute: [
    (d: LexiconData): boolean => {
      const { bodyTop, bodyBottom } = anatomy(d);
      const hi = d.hi ?? 0;
      const lo = d.lo ?? 0;
      return bodyTop >= hi && bodyBottom <= lo && !predBodyDefend(d);
    },
  ],
  // use: the PASS_THROUGH (the traversal — excluded, the anti-noise gate)
  use: [predPassThrough],
};

/** reject — the wick rejected the level (WICK_REJECT — the side vote). */
const rejectFamily = {
  id: 'WICK_REJECT',
  group: 'candle-predicate' as const,
  suggestive: [predWickReject],
  // descriptive: the wick crossed the ENTIRE band (a sweep, not a reject!)
  descriptive: [
    (d: LexiconData): boolean => {
      const lo = d.lo ?? 0;
      const hi = d.hi ?? 0;
      return (d.low ?? 0) < lo || (d.high ?? 0) > hi;
    },
  ],
  // substitute: the long-wick candle WITHOUT the body reversal (the wick ≠
  //             the rejection) — pos +2
  substitute: [
    (d: LexiconData): boolean => {
      const { lowerWick, upperWick } = anatomy(d);
      const close = d.close ?? 0;
      const open = d.open ?? 0;
      // a long wick that did NOT reverse the body back to the approach side
      const reversed = close > open || close < open;
      return (lowerWick >= MIN_TOUCH_DEPTH_PIPS * (d.pipValue ?? 0) ||
              upperWick >= MIN_TOUCH_DEPTH_PIPS * (d.pipValue ?? 0)) &&
        !predWickReject(d) && reversed;
    },
  ],
  // use: the sweep-with-close-back (the consumption, not the rejection)
  use: [predSweep],
};

/** sweep — the level was consumed (SWEEP — the reactionCount event). */
const sweepFamily = {
  id: 'SWEEP',
  group: 'candle-predicate' as const,
  suggestive: [predSweep],
  // descriptive: the wick stopped short of the far edge (a partial probe)
  descriptive: [
    (d: LexiconData): boolean => {
      const lo = d.lo ?? 0;
      const hi = d.hi ?? 0;
      return (d.low ?? 0) >= lo && (d.high ?? 0) <= hi && !predSweep(d);
    },
  ],
  // substitute: the deep-wick-close-through (a break, not a sweep) — pos +2
  substitute: [
    (d: LexiconData): boolean => {
      const lo = d.lo ?? 0;
      const hi = d.hi ?? 0;
      const close = d.close ?? 0;
      return ((d.low ?? 0) < lo || (d.high ?? 0) > hi) && (close < lo || close > hi);
    },
  ],
  // use: the WICK_REJECT (the reversal — the liquidity was NOT taken)
  use: [predWickReject],
};

/** dwell — the level was occupied, not attacked (CONSOL_DWELL). */
const dwellFamily = {
  id: 'CONSOL_DWELL',
  group: 'candle-predicate' as const,
  suggestive: [predConsolDwell],
  // descriptive: the bars crossing the band (an attack)
  descriptive: [
    (d: LexiconData): boolean => {
      const hi = d.hi ?? 0;
      const lo = d.lo ?? 0;
      return (d.high ?? 0) > hi || (d.low ?? 0) < lo;
    },
  ],
  // substitute: the single-bar touch (a touch ≠ a dwell) — pos +2
  substitute: [
    (d: LexiconData): boolean => !predConsolDwell(d) && !predPassThrough(d),
  ],
  // use: the ≥3-reaction count (the battle's ammunition exhausted → the
  //      depletion feed)
  use: [
    (d: LexiconData): boolean => (d.reactionCount ?? 0) >= 3,
  ],
};

/** pass — the level was traversed (PASS_THROUGH — the anti-noise). */
const passFamily = {
  id: 'PASS_THROUGH',
  group: 'candle-predicate' as const,
  suggestive: [predPassThrough],
  descriptive: [
    (d: LexiconData): boolean => !predPassThrough(d),
  ],
};

export const candlePressureLexicon: TradingLexiconRule = {
  id: 'candle-pressure',
  families: [defendFamily, rejectFamily, sweepFamily, dwellFamily, passFamily],
  escapeHatchTool: 'probe-vote-window',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    // THE CANONICAL TOUCH KIND IS THE DECISION (the spec's "the winning intent
    // = the touch kind" + the MPSE exhaustiveness invariant: ∀ candle EXACTLY
    // one branch — the piecewise-TOTAL). When the LMV supplies its own
    // classifyTouch output (input.touchKind — the reaction extraction,
    // lqz-matrix.ts:196-241), that IS the authoritative intent — BY CONSTRUCTION
    // byte-identical to the LMV's reaction set (the W4 lmv wiring's contract:
    // a reaction's kind and the lexicon's intent are the SAME machine output).
    // Without the canonical kind (a standalone diag call), the deterministic
    // predicates reproduce classifyTouch's branch order (SWEEP → WICK_REJECT →
    // BODY_DEFEND → CONSOL_DWELL → PASS_THROUGH). The family scoring supplies
    // the CONFIDENCE + the semantic evidence record — it never overrides the
    // canonical kind (a substitute surface-trap may inflate a family's score,
    // but the intent stays the machine truth).
    let intent: string = input.touchKind ?? 'PASS_THROUGH';
    if (!input.touchKind) {
      if (predSweep(input)) intent = 'SWEEP';
      else if (predWickReject(input)) intent = 'WICK_REJECT';
      else if (predBodyDefend(input)) intent = 'BODY_DEFEND';
      else if (predConsolDwell(input)) intent = 'CONSOL_DWELL';
      else intent = 'PASS_THROUGH';
    }
    const evidence = classifyByFamilies(candlePressureLexicon.families, input);
    const family = candlePressureLexicon.families.find((f) => f.id === intent);
    const { pos, neg } = family
      ? scoreFamily(family, input)
      : { pos: 0, neg: 0 };
    return {
      intent,
      confidence: confidenceOf(pos, neg),
      action: pos > neg ? 'classify' : 'reject',
      pos,
      neg,
      scores: evidence.scores,
      evidence: evidence.evidence,
    };
  },
  enforce(result: LexiconResult, phase: 'A' | 'B'): void {
    if (phase === 'A') {
      // Phase A — the boundary THROW: a candle classified PASS_THROUGH that the
      // LMV counts as a reaction → the piecewise-TOTAL violation (the LMV's
      // reaction extraction MUST agree with the lexicon's touch kind).
      if (result.intent === 'PASS_THROUGH') {
        throw new Error(
          `[CANDLE-PRESSURE PHASE-A] PASS_THROUGH counted as a reaction — ` +
          `the piecewise-TOTAL violation (pos ${result.pos} / neg ${result.neg}). ` +
          `Escape: ${candlePressureLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    // Phase B — the OUTPUT MUTATION: the touch-kind demand appended to the LMV
    // table's row (the audit trail).
    result.demand = `candle-pressure: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};

/** The reject family's side-vote mapping — THE SWEPT-SIDE LAW (Bible 4.0 §4.16 —
 *  the side is the SWEPT side, NEVER the approach): an upper wick = buy stops
 *  swept above → SELL_SIDE (the supply side); a lower wick = sell stops swept
 *  below → BUY_SIDE (the demand side); the approach (fromAbove/fromBelow) is the
 *  TIE-BREAK ONLY (an equal-wick reject keeps the fromAbove → BUY_SIDE /
 *  fromBelow → SELL_SIDE fallback) — the LMV side-vote input (lmv.ts:618-645).
 *  The INTENT is the machine truth (the canonical touch kind — the
 *  exhaustiveness invariant); the action reflects the confidence semantics
 *  only (a WICK_REJECT with pos ≤ neg is still a genuine reject for the side
 *  vote). */
export function candleSideVote(input: LexiconData): 'BUY_SIDE' | 'SELL_SIDE' | null {
  const r = candlePressureLexicon.classify(input);
  if (r.intent !== 'WICK_REJECT') return null;
  const an = anatomy(input);
  const { fromAbove } = approachOf(input);
  return an.upperWick > an.lowerWick ? 'SELL_SIDE'   // buy stops swept above → supply
       : an.lowerWick > an.upperWick ? 'BUY_SIDE'    // sell stops swept below → demand
       : fromAbove ? 'BUY_SIDE' : 'SELL_SIDE';       // the approach = the tie-break only
}
