// Plutus V5 E1 — src/e1/machines/obvious-trades.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/obvious-trades.md)
// LEXICON 6 — OBVIOUS-TRADES-LEXICON machine skeleton.
// The forward-reasoning baseline — the operator's #1/#2 logic: "the short is halfway
// to the demand — the TP is AT the demand — the demand's pressure will react — the
// LONG from its internal liquidity." The reasoning-token baseline = the operator's
// EU analyses in the golden doc — VERBATIM. THIS lexicon is the agent-in-the-loop
// reasoning chain's deterministic core.
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 6 — the
// family table lines 236-247). The MPSE form: the forward-reasoning state machine
// (the E3's read → project → anchor → validate sequence!) + the inequalities (the RRR
// gate! the N-pips-from-zone predicate!) + the logical implication (the chain step →
// the trade direction!).

import type { LexiconData, MachineRule, PatternFamily, ZoneModel } from '../core/types';
import { classifyAggregate, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, operativeZone, zoneWidth } from '../core/engine';

const zone = (data: LexiconData): ZoneModel | undefined => operativeZone(data);
const z = (data: LexiconData): ZoneModel | undefined => zone(data);

// ── the ZONE-IDENTIFICATION family — the trade's zone ─────────────────────────
function e1ZoneWithPressureRead(data: LexiconData): boolean {
  // the E1 designated zone with the pressure read: "the 1H Unmitigated MoM Demand zone
  // at 1.14145 - 1.14000 from Thursday's Breakout Surge" (the #2!)
  const a = z(data);
  return a ? a.pressure !== undefined : false;
}
function zoneWithoutPressure(data: LexiconData): boolean {
  // the zone without the pressure context (the bare level! — the descriptive)
  const a = z(data);
  return a ? a.pressure === undefined : false;
}
function labelAlone(data: LexiconData): boolean {
  // the label alone ("a demand zone" — the regex without the psychology! — the substitute)
  const a = z(data);
  return a ? a.classification === 'MoM' && a.pressure === undefined : false;
}
function phantomBomFlag(data: LexiconData): boolean {
  // the PHANTOM_BOM flag (the fortress — the strongest! — the exemptor)
  const a = z(data);
  return a ? a.classification === 'PHANTOM_BOM' : false;
}

// ── the PRESSURE-MECHANICS family — the zone's reaction certainty ─────────────
function strongPressureLiquidity(data: LexiconData): boolean {
  // "This is clearly an area of strong pressure + bullish liquidity... the opposing
  // bearish pressure is not yet strong enough to pierce it" (the #2!)
  const a = z(data);
  return a ? a.pressure === 'VIRGIN' || a.pressure === 'FORTRESS' : false;
}
function contestedZone(data: LexiconData): boolean {
  // the contested zone (the WLS — the #6's "HEAVILY CONTESTING all breaks"! — the descriptive)
  const a = z(data);
  return a ? a.pressure === 'ACTIVE-2' || a.pressure === 'DEPLETED' : false;
}
function zfpAlone(data: LexiconData): boolean {
  // the zfp alone (the number without the lifecycle! — the substitute)
  const a = z(data);
  return a ? a.pressure === undefined && a.zfp > 0 : false;
}
function fortressStrong(data: LexiconData): boolean {
  // the fortress (the 4+ strong holds! — the exemptor)
  const a = z(data);
  return a ? a.pressure === 'FORTRESS' : false;
}

// ── the SHAPE-CHAIN-CONTEXT family — the chain's position ─────────────────────
function chainNextStepMatches(data: LexiconData): boolean {
  // "This follows the shape chain forming of SS → BS" (the #2!) — the chain's next
  // step = the trade's direction!
  const last = data.shapeChain[data.shapeChain.length - 1];
  if (!last) return false;
  const dir = data.e1 && typeof data.e1 === 'object' && 'direction' in data.e1 ? String(data.e1.direction) : '';
  return dir !== '' && (dir === 'LONG' ? last === 'SS' || last === 'BS' : last === 'R' || last === 'WL');
}
function chainConflict(data: LexiconData): boolean {
  // the chain's conflicting step (the divergence! — the descriptive)
  const last = data.shapeChain[data.shapeChain.length - 1];
  if (!last) return false;
  const dir = data.e1 && typeof data.e1 === 'object' && 'direction' in data.e1 ? String(data.e1.direction) : '';
  return dir !== '' && (dir === 'LONG' ? last === 'R' || last === 'WL' : last === 'SS' || last === 'BS');
}
function singleDayShape(data: LexiconData): boolean {
  // the single-day shape (the chain != the day! — the substitute)
  return data.shapeChain.length === 1;
}
function macroAuthorityUse(data: LexiconData): boolean {
  // the unified macro authority (the exemptor)
  return data.e2 !== undefined && typeof data.e2 === 'object' && 'macroDirection' in data.e2;
}

// ── the FORWARD-POSITION family — THE MISSING PREDICATE ───────────────────────
function priceHalfwayToDesignation(data: LexiconData): boolean {
  // the price's CURRENT position between the shape's start and its designated target:
  // "the short is halfway to the demand" (the operator's directive!) — the price is N
  // pips from the designated zone with the move's momentum toward it (PROPOSED: the
  // N-pips bound = ratio-based — the forward distance vs the zone width, REASONING_CHAIN_L1_SPEC §10.3)
  const a = z(data); if (!a) return false;
  const dist = Math.abs(data.meta.spot - (a.type === 'DEMAND' ? a.bottom : a.top));
  const width = zoneWidth(a);
  return dist >= 0.5 * width && dist <= 3 * width; // PROPOSED: the "halfway" band (ratio-anchored, never fixed pips)
}
function priceMovingAway(data: LexiconData): boolean {
  // the price moving AWAY from the designation (the rejection! — the descriptive)
  const a = z(data); if (!a) return false;
  const dist = Math.abs(data.meta.spot - (a.type === 'DEMAND' ? a.bottom : a.top));
  return dist > 3 * zoneWidth(a);
}
function priceAtZone(data: LexiconData): boolean {
  // the price AT the zone (the reaction already happened! — the substitute)
  const a = z(data);
  return a ? data.meta.spot >= a.bottom && data.meta.spot <= a.top : false;
}
function zoneReactionState(data: LexiconData): boolean {
  // the zone's reaction state (the virgin/fortress = the reaction probability! — the exemptor)
  const a = z(data);
  return a ? a.pressure === 'VIRGIN' || a.pressure === 'FORTRESS' : false;
}

// ── the ANCHOR-CONSTRUCTION family — the E/SL/TP ──────────────────────────────
function anchorsTraceable(data: LexiconData): boolean {
  // "Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested
  // liquidity zone... and set TP at the near edge of the supply zone" (the #2 — THE
  // reasoning token!) — the anchors must trace to a specific E1 zone + the E2 projection
  const a = z(data); if (!a) return false;
  const hasE1 = data.e1 !== undefined && typeof data.e1 === 'object' && Array.isArray(data.e1.zoneIds) && (data.e1.zoneIds as string[]).includes(a.id);
  const hasE2 = data.e2 !== undefined && typeof data.e2 === 'object' && Array.isArray(data.e2.projectionIds) && (data.e2.projectionIds as unknown[]).length >= 1;
  return hasE1 && hasE2;
}
function fabricatedLevels(data: LexiconData): boolean {
  // the anchors without the zone geometry (the fabricated levels! — the descriptive)
  const a = z(data);
  return a ? a.zfp > 0 && (data.e1 === undefined || !Array.isArray(data.e1.zoneIds)) : false;
}
function roundedLevels(data: LexiconData): boolean {
  // the rounded levels (the "nice number" — the regex without the structure! — the substitute)
  const a = z(data); if (!a) return false;
  return Math.round(a.top * 100) === a.top * 100 || Math.round(a.bottom * 100) === a.bottom * 100;
}
function rrrGate(data: LexiconData): boolean {
  // the RRR gate (|TP−E|/|E−SL| ≥ 2.5 — the consequence, not the input! — the exemptor)
  return data.e2 !== undefined && typeof data.e2 === 'object' && 'rrr' in data.e2 && Number(data.e2.rrr) >= 2.5;
}

// ── the VALIDATION family — the confluence check ──────────────────────────────
function confluenceAligned(data: LexiconData): boolean {
  // "all the macro storyline confluences align" (the #2!) — the E1 pressure + the E2
  // chain + the E3 geometry ALL agree
  const a = z(data);
  return a ? a.pressure !== undefined && data.shapeChain.length >= 1 && data.e3 !== undefined : false;
}
function layerDivergence(data: LexiconData): boolean {
  // any layer contradicts (the divergence! — the descriptive)
  const a = z(data);
  return a ? a.pressure === undefined || data.shapeChain.length === 0 : false;
}
function singleConfluence(data: LexiconData): boolean {
  // the single-confluence agreement (one signal != the alignment! — the substitute)
  const a = z(data);
  return a ? a.pressure !== undefined && data.shapeChain.length === 0 : false;
}
function breakValidation(data: LexiconData): boolean {
  // the break-validation (the #6's "this ZONE has not yet been broken" — the E1
  // pressure validates the structure break! — the exemptor)
  const a = z(data);
  return a ? a.pressure !== 'BROKEN' && a.pressure !== undefined : false;
}

// ── the STRENGTH-COMPARISON family — the opposing force ───────────────────────
function comparativeImpulse(data: LexiconData): boolean {
  // "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from
  // Thursday" (the #6!) — the comparative impulse strengths
  return data.e2 !== undefined && typeof data.e2 === 'object' && 'strengthDelta' in data.e2 && Number(data.e2.strengthDelta) > 0;
}
function equalStrengths(data: LexiconData): boolean {
  // the equal strengths (the WLS! — the descriptive)
  return data.e2 !== undefined && typeof data.e2 === 'object' && 'strengthDelta' in data.e2 && Number(data.e2.strengthDelta) === 0;
}

// ── the REACTION-COUNT-STATE family — the mitigation math ─────────────────────
function mitigationMath(data: LexiconData): boolean {
  // "zones usually fail on the THIRD mitigation" (#4!) · "has not been pierced or
  // broken in 4 prior mitigations... likely to become a fortress zone" (#8!)
  const a = z(data);
  return a ? (a.reactionCount ?? 0) >= 3 : false;
}
function freshZone(data: LexiconData): boolean {
  // the fresh zone (the virgin — the FIRST test! — the descriptive)
  const a = z(data);
  return a ? (a.reactionCount ?? 0) === 0 && a.pressure === 'VIRGIN' : false;
}
function touchCount(data: LexiconData): boolean {
  // the touch count (the touches != the mitigations! — the substitute)
  const a = z(data);
  return a ? (a.reactionCount ?? 0) >= 3 && a.pressure === undefined : false;
}
function fortressExemption(data: LexiconData): boolean {
  // the FORTRESS (the #8's exemption — the 5th mitigation predicted to hold! — the exemptor)
  const a = z(data);
  return a ? a.pressure === 'FORTRESS' : false;
}

export const OBVIOUS_TRADES_FAMILIES: PatternFamily[] = [
  { group: 'projection-predicate', descriptive: [zoneWithoutPressure], suggestive: [e1ZoneWithPressureRead], substitute: [labelAlone], use: [phantomBomFlag] },
  { group: 'projection-predicate', descriptive: [contestedZone], suggestive: [strongPressureLiquidity], substitute: [zfpAlone], use: [fortressStrong] },
  { group: 'projection-predicate', descriptive: [chainConflict], suggestive: [chainNextStepMatches], substitute: [singleDayShape], use: [macroAuthorityUse] },
  { group: 'projection-predicate', descriptive: [priceMovingAway], suggestive: [priceHalfwayToDesignation], substitute: [priceAtZone], use: [zoneReactionState] },
  { group: 'projection-predicate', descriptive: [fabricatedLevels], suggestive: [anchorsTraceable], substitute: [roundedLevels], use: [rrrGate] },
  { group: 'projection-predicate', descriptive: [layerDivergence], suggestive: [confluenceAligned], substitute: [singleConfluence], use: [breakValidation] },
  { group: 'projection-predicate', descriptive: [equalStrengths], suggestive: [comparativeImpulse], substitute: [], use: [] },
  { group: 'projection-predicate', descriptive: [freshZone], suggestive: [mitigationMath], substitute: [touchCount], use: [fortressExemption] },
];

export const obviousTradesMachine: MachineRule = {
  id: 'obvious-trades',
  families: OBVIOUS_TRADES_FAMILIES,
  classify: (input) => classifyAggregate(input, OBVIOUS_TRADES_FAMILIES), // the AGGREGATE form (the spec line 249)
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        throw buildBlock('obvious-trades', result.evidence || 'rejected projection', '3 failed refinements → the problem-solving dispatch (the operator\'s reasoning-chain retry). The failure data is stored + synthesized at the pipeline end.', phase);
      }
      throw buildRefineWarning('obvious-trades', result.evidence || 'rejected projection', `Refine/retry (${used}/3): a trade projection fires when the families' aggregate pos > neg; the RRR gate (≥ 2.5) is the FINAL filter — re-run with the E1 zone map + the E2 storyline context.`, used);
    }
    if (phase === 'B') st.auditTrail.push(`obvious-trades: ${result.intent} conf ${result.confidence.toFixed(2)} — the projection demand appended to the E3 setup output`);
  },
  escapeHatchTool: 'diag-monday',   // the harness — the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
