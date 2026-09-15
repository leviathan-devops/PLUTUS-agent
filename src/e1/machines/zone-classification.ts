// Plutus V5 E1 — src/e1/machines/zone-classification.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/zone-classification.md)
// LEXICON 3 — ZONE-CLASSIFICATION-LEXICON machine skeleton.
// The BoM/MoM/IP/LSZ identity + THE PHANTOM BoM — the operator's fortress-zone
// concept: a type-2 virgin MoM that FUNCTIONS as a BoM. THE most important lexicon
// of the six — the virgin-MoM death rule (src/e1/lexicons/zone-classification.md) is the blanket
// regex that rejected the operator's #2 demand and caused the EU LONG's Δ19.4p miss.
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 3 — the
// family table lines 124-132). The operator's doctrine VERBATIM: "a phantom BoM
// zone... a MoM-disguised BoM... functions as a BoM zone" (the type-2 virgin MoM).
// The MPSE form: the set theory (the phantom-BoM membership test: zone ∈ {the
// LARGE-OB set} ∩ {the recovery-base set} ∩ {the opposing-BoM-reaction set}) +
// the boolean algebra (the exemption: PHANTOM ∧ DEATH_TYPE1 → DEATH; PHANTOM ∧
// ¬DEATH_TYPE1 → FORTRESS).

import type { LexiconData, MachineRule, PatternFamily, ZoneModel } from '../core/types';
import { classify, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, largeOb, operativeZone, zoneWidth, candlesTouching, windowBars } from '../core/engine';

const zone = (data: LexiconData): ZoneModel | undefined => operativeZone(data);

// ── the BOM family — the true BoM ─────────────────────────────────────────────
function priorOppositeOrNone(data: LexiconData): boolean {
  // prior ∈ {NONE, OPPOSITE} — the reversal origin
  const z = zone(data);
  return z ? z.prior === 'NONE' || z.prior === 'OPPOSITE' : false;
}
function obcvQualityGates(data: LexiconData): boolean {
  // bw >= 3.0 ∧ bf >= 0.65 (src/e1/lexicons/zone-classification.md)
  const z = zone(data);
  return z ? z.bw >= 3.0 && z.bf >= 0.65 : false;
}
function widthGatePass(data: LexiconData): boolean {
  // the width gate — the ratio-based width anchored to the context (the SMC doctrine)
  const z = zone(data);
  return z ? zoneWidth(z) >= 0.5 * data.meta.atr14 : false; // PROPOSED: the width-gate ratio
}
function priorContinuationSame(data: LexiconData): boolean {
  // prior == SAME (the continuation — a MoM!)
  const z = zone(data);
  return z ? z.prior === 'SAME' : false;
}
function wideObMidMove(data: LexiconData): boolean {
  // the wide-OB in the middle of the move (the width alone != a BoM — the substitute)
  const z = zone(data);
  return z ? z.prior === 'SAME' && z.bw >= 3.0 : false;
}
function rejectTotality(data: LexiconData): boolean {
  // the REJECT (the totality: every origin → exactly one of {BoM, MoM, REJECT} — the exemptor)
  const z = zone(data);
  return z ? z.classification === 'REJECT' : false;
}

// ── the MOM family — the true MoM ─────────────────────────────────────────────
function validOrigin(data: LexiconData): boolean {
  // the valid origin (the formation has a real origin candle)
  const z = zone(data);
  return z ? z.originIdx >= 0 : false;
}
function phantomBomSurface(data: LexiconData): boolean {
  // the phantom BoM (the type-2 virgin MoM — the MoM-label that FUNCTIONS as a BoM — the substitute)
  const z = zone(data);
  return z ? z.classification === 'MoM' && z.pressure === 'VIRGIN' && largeOb(data, z) : false;
}

// ── the PHANTOM-BoM family — THE FORTRESS (the operator's concept!) ───────────
function largeObRatio(data: LexiconData): boolean {
  // the LARGE-OB width predicate — the SMC ratio-based width (the OB's size is a
  // function of the move it precedes — never a fixed pip number). PROPOSED: >= 1.5 x ATR14.
  return largeOb(data, zone(data));
}
function fakeout(data: LexiconData): boolean {
  // the FAKEOUT predicate — the formation at the base of a recovery whose candles
  // TEMPORARILY broke the swing move structure (the "fake RWL" / correction fakeout —
  // the operator verbatim: "clearly breaks (temporarily for only a couple of candles)
  // the actual swing move structure"). PROPOSED: <= 3 structure-break candles + the immediate reclaim.
  const z = zone(data); if (!z) return false;
  const pre = windowBars(data).filter((b) => b.t < z.formationMs);
  if (pre.length < 2) return false;
  const swingHigh = Math.max(...pre.map((b) => b.H));
  const swingLow = Math.min(...pre.map((b) => b.L));
  const breaks = pre.filter((b) => b.H > swingHigh || b.L < swingLow).length;
  return breaks >= 1 && breaks <= 3; // PROPOSED: the "couple of candles" bound (2-3)
}
function preFormationReaction(data: LexiconData): boolean {
  // the PRE-FORMATION opposing-BoM reaction predicate — the correction INSTANTLY
  // reacted to an opposing UM BoM structure BEFORE forming the big OB (the operator
  // verbatim: "this correction instantly reacts to before forming the big OB").
  const z = zone(data); if (!z) return false;
  const side = z.type === 'DEMAND' ? 'SUPPLY' : 'DEMAND';
  return data.zones.some((o) => o.id !== z.id && o.type === side && o.classification === 'BoM' && o.formationMs < z.formationMs && candlesTouching(data, o).length >= 1);
}
function macroOriginContinuation(data: LexiconData): boolean {
  // the macro-origin continuation (the KCE-Telescoping: the move completes the FULL
  // swing from the macro origin element — the containing 4H structure + the
  // post-formation continuation past the zone).
  const z = zone(data); if (!z) return false;
  if (!z.parent) return false;
  const post = windowBars(data).filter((b) => b.t >= z.formationMs);
  if (post.length === 0) return false;
  const from = post[0].O, to = post[post.length - 1].C;
  const continuation = z.type === 'DEMAND' ? to > from : to < from; // the macro direction continues
  return continuation;
}
function smallObWidth(data: LexiconData): boolean {
  // the small-OB width (the type-1 signature — the descriptive)
  const z = zone(data);
  return z ? zoneWidth(z) < SMC_RATIO(data) : false;
}
function midMoveUninterrupted(data: LexiconData): boolean {
  // the mid-uninterrupted-move position (the type-1 signature — the descriptive)
  const z = zone(data);
  return z ? z.prior === 'SAME' : false;
}
function virginMomLabelAlone(data: LexiconData): boolean {
  // the virgin-MoM label ALONE (the surface — "it's a MoM so it's a death zone" =
  // the regex without the psychology — THE derailment — the substitute!)
  const z = zone(data);
  return z ? z.classification === 'MoM' && z.pressure === 'VIRGIN' : false;
}
function type1FullSignature(data: LexiconData): boolean {
  // the type-1 virgin MoM's FULL signature (the small OB + the uninterrupted BS/WL +
  // the mid-move → the DEATH ZONE stands — the exemptor!)
  const z = zone(data);
  return z ? z.prior === 'SAME' && zoneWidth(z) < SMC_RATIO(data) && z.bw < 3.0 : false;
}

// ── the FORTRESS-BoM family — the PROVEN BoM (the operator's Q2 correction!) ──
function plainProvenBomHolds(data: LexiconData): boolean {
  // the plain BoM that has held the mitigations — "has not been pierced or broken in
  // 4 prior mitigations... likely to become a fortress zone and NOT get pierced"
  // (the #8 — the 1H Refined 4H supply [1.14475-1.14625] anchored to the Jun 22 OB!)
  const z = zone(data);
  return z ? z.classification === 'BoM' && (z.reactionCount ?? 0) >= 4 && z.pressure !== 'BROKEN' : false;
}
function phantomBomCategory(data: LexiconData): boolean {
  // the phantom BoM (the type-2 virgin — a DIFFERENT category — the fortress BoM is
  // a VISIBLE obvious BoM, never disguised — the descriptive)
  const z = zone(data);
  return z ? z.classification === 'PHANTOM_BOM' : false;
}
function depletionCount(data: LexiconData): boolean {
  // the depletion (the 3+ mitigations != the fortress — the FORTRESS needs the
  // STRONG holds — the substitute)
  const z = zone(data);
  return z ? (z.reactionCount ?? 0) >= 3 && z.pressure !== 'FORTRESS' : false;
}
function brokenWithBattle(data: LexiconData): boolean {
  // the broken (the pierced with a battle — the exemptor)
  const z = zone(data);
  return z ? z.pressure === 'BROKEN' : false;
}

// ── the IP family — the IP zone ───────────────────────────────────────────────
function ninePillarConfluence(data: LexiconData): boolean {
  // the 9-pillar confluence (source='PILLAR')
  const z = zone(data);
  return z ? z.classification === 'IP' && z.source === 'PILLAR' : false;
}
function canonicalSDOrigin(data: LexiconData): boolean {
  // a canonical S/D origin (the descriptive)
  const z = zone(data);
  return z ? z.classification === 'BoM' || z.classification === 'MoM' : false;
}

// the SMC ratio helper (PROPOSED — the operator's pending ruling, REASONING_CHAIN_L1_SPEC §11.3)
const SMC_RATIO = (data: LexiconData): number => 1.5 * data.meta.atr14;

export const ZONE_CLASSIFICATION_FAMILIES: PatternFamily[] = [
  {
    group: 'zone-predicate',
    descriptive: [priorContinuationSame],
    suggestive: [priorOppositeOrNone, obcvQualityGates, widthGatePass],
    substitute: [wideObMidMove],
    use: [rejectTotality],
  },
  {
    group: 'zone-predicate',
    descriptive: [priorOppositeOrNone],
    suggestive: [priorContinuationSame, validOrigin, widthGatePass],
    substitute: [phantomBomSurface],
    use: [rejectTotality],
  },
  {
    group: 'zone-predicate',
    // the phantom-bom family: the operator's type-2 criteria — the all-4 predicate
    descriptive: [smallObWidth, midMoveUninterrupted],
    suggestive: [largeObRatio, fakeout, preFormationReaction, macroOriginContinuation],
    substitute: [virginMomLabelAlone],
    use: [type1FullSignature],
  },
  {
    group: 'zone-predicate',
    descriptive: [phantomBomCategory],
    suggestive: [plainProvenBomHolds],
    substitute: [depletionCount],
    use: [brokenWithBattle],
  },
  {
    group: 'zone-predicate',
    descriptive: [canonicalSDOrigin],
    suggestive: [ninePillarConfluence],
  },
];

export const zoneClassificationMachine: MachineRule = {
  id: 'zone-classification',
  families: ZONE_CLASSIFICATION_FAMILIES,
  classify: (input) => classify(input, ZONE_CLASSIFICATION_FAMILIES),
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        // the hard-throw ONLY after 3 failed refinements — the ENFORCEMENT LAW: the
        // hard-throw is data (the failure store), never a crash.
        throw buildBlock('zone-classification', result.evidence || 'rejected zone', '3 failed refinements → the problem-solving dispatch. The failure data is stored + synthesized at the pipeline end.', phase);
      }
      // Phase A = the refine/retry warning WITH the context (never a bare hard-throw)
      throw buildRefineWarning('zone-classification', result.evidence || 'rejected zone', `Refine/retry (${used}/3): the phantom-BoM exemption needs ALL-4 operator criteria (large-OB + fakeout + pre-formation opposing-BoM reaction + macro-origin continuation) — 3-of-4 falls through to the death rule (the conservative default).`, used);
    }
    // Phase B = the classification demand appended to the stage output (mutation — never throw)
    if (phase === 'B') st.auditTrail.push(`zone-classification: ${result.intent} conf ${result.confidence.toFixed(2)} — the PHANTOM_BOM/DEATH_ZONE flag demand appended to the zone's classification`);
  },
  escapeHatchTool: 'probe-resting-side',   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
