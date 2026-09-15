// Plutus V5 E1 — src/e1/machines/candle-pressure.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/candle-pressure.md)
// LEXICON 1 — CANDLE-PRESSURE-LEXICON machine skeleton.
// Decode WHO won each battle from the candle's wick/body/close anatomy — the
// defend/reject/sweep/dwell state that feeds the zone's pressure lifecycle.
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 1 — the
// family table lines 50-58). Doctrine: the operator's semantics law — "the rendered
// artifacts are the candles... you must see what GENERATED the rendered artifact.
// The artifact itself is just the trigger." The candle is the TRIGGER; the pressure
// state is the GENERATOR. The MPSE form: the piecewise-total predicate (the
// classifyTouch exhaustiveness: exactly one piece per candle) + the recurrence
// (reactionCountₙ₊₁ = reactionCountₙ + [sweep]).
//
// THE SKELETON: every predicate is a REAL deterministic expression over LexiconData
// (the MPSE law). PROPOSED thresholds are marked PROPOSED — the build agent wires
// the exact ratio bands on the operator's ruling.

import type { LexiconData, MachineRule, OHLCBar, PatternFamily, ZoneModel } from '../core/types';
import { classify, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, approachSide, bucket, candlesTouching, operativeZone, reactionCount, windowBars } from '../core/engine';

const zone = (data: LexiconData): ZoneModel | undefined => operativeZone(data);

const touches = (data: LexiconData): OHLCBar[] => {
  const z = zone(data);
  return z ? candlesTouching(data, z).sort((a, b) => a.t - b.t) : [];
};

// ── the DEFEND family — the body defended the level ──────────────────────────
function bodyDefended(data: LexiconData): boolean {
  // the BODY_DEFEND predicate: the body closed against the approach + the next bar
  // turned >= max(2p, 0.5 x ATR) against (the defended-edge accumulator, src/e1/lexicons/candle-pressure.md)
  const z = zone(data); if (!z) return false;
  const ts = touches(data);
  if (ts.length === 0) return false;
  const last = ts[ts.length - 1];
  const side = approachSide(data, z);
  const closedAgainst = side === 'fromAbove' ? last.C > last.O : side === 'fromBelow' ? last.C < last.O : last.C > last.O;
  const after = windowBars(data).filter((x) => x.t > last.t).sort((a, b) => a.t - b.t)[0];
  const minTurn = Math.max(2 * data.meta.pip, 0.5 * data.meta.atr14);
  const turned = after ? (side === 'fromAbove' ? after.C - after.O >= minTurn : after.O - after.C >= minTurn) : false;
  return closedAgainst && turned;
}
function bodyClosedThrough(data: LexiconData): boolean {
  // the body closed THROUGH the level (no defense) — the last touch's body crossed the far edge
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  return last.C < b.lo || last.C > b.hi;
}
function wickTouchedBand(data: LexiconData): boolean {
  // the wick touched the band (a touch != a defense — the substitute trap)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  const bodyMin = Math.min(last.O, last.C), bodyMax = Math.max(last.O, last.C);
  return (last.H > b.lo && bodyMax <= b.lo) || (last.L < b.hi && bodyMin >= b.hi);
}
function passThroughTraversal(data: LexiconData): boolean {
  // the PASS_THROUGH (the traversal without a reaction — the anti-noise gate, the exemptor)
  return touches(data).length === 0;
}

// ── the REJECT family — the wick rejected the level ──────────────────────────
function wickRejected(data: LexiconData): boolean {
  // the WICK_REJECT predicate: a >=2p wick INTO the band + the body reversed +
  // retreated to the approach side -> the side vote SELL (fromAbove) / BUY (fromBelow)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  const wickInto = last.L < b.hi && last.L > b.lo - 2 * data.meta.pip && last.L < last.O; // PROPOSED: the 2p wick depth
  const bodyReversed = approachSide(data, z) === 'fromAbove' ? last.C > last.O : last.C < last.O;
  const retreated = approachSide(data, z) === 'fromAbove' ? last.C > z.top : last.C < z.bottom;
  return wickInto && bodyReversed && retreated;
}
function wickCrossedEntireBand(data: LexiconData): boolean {
  // the wick crossed the ENTIRE band (a sweep, not a reject — the descriptive)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  return last.H > b.hi && last.L < b.lo;
}
function longWickWithoutReversal(data: LexiconData): boolean {
  // the long-wick candle WITHOUT the body reversal (the wick != the rejection — the substitute)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  const wickInto = last.L < b.hi;
  const bodyReversed = approachSide(data, z) === 'fromAbove' ? last.C > last.O : last.C < last.O;
  return wickInto && !bodyReversed;
}
function sweepWithCloseBack(data: LexiconData): boolean {
  // the sweep-with-close-back (the consumption, not the rejection — the exemptor)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  return last.H > b.hi && last.L < b.lo && (last.C > last.L && last.C < b.lo || last.C < last.H && last.C > b.hi);
}

// ── the SWEEP family — the level was consumed ────────────────────────────────
function sweptBucket(data: LexiconData): boolean {
  // the SWEEP predicate: the wick crossed the ENTIRE bucket >=2p AND the body closed back
  // (src/e1/lexicons/candle-pressure.md) -> the reactionCount += 1 (the consumption!)
  const z = zone(data); if (!z) return false;
  return reactionCount(data, z) >= 1;
}
function wickStoppedShort(data: LexiconData): boolean {
  // the wick stopped short of the far edge (a partial probe — the descriptive)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  return last.H > b.lo && last.H < b.hi && last.L > b.lo;
}
function deepWickCloseThrough(data: LexiconData): boolean {
  // the deep-wick-close-through (a break, not a sweep — the substitute)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  const last = touches(data)[touches(data).length - 1];
  if (!last) return false;
  return last.H > b.hi && last.L < b.lo && (last.C < b.lo || last.C > b.hi);
}
function wickRejectExempt(data: LexiconData): boolean {
  // the WICK_REJECT (the reversal — the liquidity was NOT taken — the exemptor)
  return wickRejected(data);
}

// ── the DWELL family — the level was occupied, not attacked ──────────────────
function consolidatedDwell(data: LexiconData): boolean {
  // the CONSOL_DWELL predicate: >=3 consecutive bars intersecting, span <= 2 bucket widths (src/e1/lexicons/candle-pressure.md)
  const z = zone(data); if (!z) return false;
  const ts = touches(data);
  if (ts.length < 3) return false;
  const b = bucket(data, z);
  const span = (ts[ts.length - 1].t - ts[0].t) / 3600_000; // PROPOSED: hours
  return span <= 2 * ((b.hi - b.lo) / data.meta.atr14) && ts.slice(-3).every((c) => c.L < b.hi && c.H > b.lo);
}
function barsCrossingBand(data: LexiconData): boolean {
  // the bars crossing the band (an attack — the descriptive)
  const z = zone(data); if (!z) return false;
  const b = bucket(data, z);
  return touches(data).some((c) => c.H > b.hi && c.L < b.lo);
}
function singleBarTouch(data: LexiconData): boolean {
  // the single-bar touch (a touch != a dwell — the substitute)
  return touches(data).length === 1;
}
function threeReactionCount(data: LexiconData): boolean {
  // the >=3-reaction count (the battle's ammunition exhausted -> the depletion feed — the exemptor)
  const z = zone(data);
  return z ? reactionCount(data, z) >= 3 : false;
}

// ── the PASS family — the level was traversed ─────────────────────────────────
function passedThrough(data: LexiconData): boolean {
  // the PASS_THROUGH (the traversal without a reaction — the anti-noise!)
  return touches(data).length === 0;
}
function reactionKindPresent(data: LexiconData): boolean {
  // a reaction kind (a touch — the descriptive)
  return touches(data).length > 0;
}

export const CANDLE_PRESSURE_FAMILIES: PatternFamily[] = [
  {
    group: 'candle-predicate',
    descriptive: [bodyClosedThrough],
    suggestive: [bodyDefended],
    substitute: [wickTouchedBand],
    use: [passThroughTraversal],
  },
  {
    group: 'candle-predicate',
    descriptive: [wickCrossedEntireBand],
    suggestive: [wickRejected],
    substitute: [longWickWithoutReversal],
    use: [sweepWithCloseBack],
  },
  {
    group: 'candle-predicate',
    descriptive: [wickStoppedShort],
    suggestive: [sweptBucket],
    substitute: [deepWickCloseThrough],
    use: [wickRejectExempt],
  },
  {
    group: 'candle-predicate',
    descriptive: [barsCrossingBand],
    suggestive: [consolidatedDwell],
    substitute: [singleBarTouch],
    use: [threeReactionCount],
  },
  {
    group: 'candle-predicate',
    descriptive: [reactionKindPresent],
    suggestive: [passedThrough],
  },
];

export const candlePressureMachine: MachineRule = {
  id: 'candle-pressure',
  families: CANDLE_PRESSURE_FAMILIES,
  classify: (input) => classify(input, CANDLE_PRESSURE_FAMILIES),
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        // the hard-throw ONLY after 3 failed refinements (the ENFORCEMENT LAW — data, never a crash)
        throw buildBlock('candle-pressure', result.evidence || 'rejected touch classification', '3 failed refinements → the zone-pressure problem-solving dispatch. The failure data is stored + synthesized at the pipeline end.', phase);
      }
      throw buildRefineWarning('candle-pressure', result.evidence || 'rejected touch classification', `Refine/retry (${used}/3): the touch-kind must be one piece of the piecewise-TOTAL classifyTouch — re-run with the widened bucket + the approach side context.`, used);
    }
    if (phase === 'B') st.auditTrail.push(`candle-pressure: ${result.intent} conf ${result.confidence.toFixed(2)} — the touch-kind demand appended to the LMV table row`);
  },
  escapeHatchTool: 'probe-vote-window',   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
