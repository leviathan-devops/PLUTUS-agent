// Plutus V5 E1 — src/e1/machines/zone-pressure.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/zone-pressure.md)
// LEXICON 4 — ZONE-PRESSURE-LEXICON machine skeleton.
// The lifecycle/mitigation/freshness states + the fortress detection + the operator's
// doctrine: "zones usually fail on the THIRD mitigation" + the fortress "not pierced
// or broken in 4 prior mitigations... likely to become a fortress zone and NOT get
// pierced" (#8).
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 4 — the
// family table lines 162-173). The MPSE form: the recurrence relation (stateₙ₊₁ =
// f(stateₙ, touchEventₙ)) + the inequalities (reactionCount ≥ 3 → TP-only; ≥ 4
// strong → FORTRESS) + the linear combination (the pressureScore = Σ weights).

import type { LexiconData, MachineRule, PatternFamily, ZoneModel } from '../core/types';
import { classify, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, DEATH_SCOPE_TFS, operativeZone, zoneWidth, reactionCount } from '../core/engine';

const zone = (data: LexiconData): ZoneModel | undefined => operativeZone(data);
const rc = (data: LexiconData): number => {
  const z = zone(data);
  return z ? z.reactionCount ?? reactionCount(data, z) : 0;
};
const ztf = (data: LexiconData): string | undefined => zone(data)?.tf ?? data.meta.tf;

// ── the VIRGIN family — the untested zone ─────────────────────────────────────
function virginZone(data: LexiconData): boolean {
  // reactionCount = 0 ∧ the type = BoM (the ENTRY-PRIMARY +40!)
  const z = zone(data);
  return z ? rc(data) === 0 && z.classification === 'BoM' : false;
}
function momType(data: LexiconData): boolean {
  // the type = MoM (the DEATH ZONE — the E2-5 reject — the descriptive)
  const z = zone(data);
  return z ? z.classification === 'MoM' : false;
}
function zeroTouchWideBand(data: LexiconData): boolean {
  // the zero-touch with the wide band (no reaction != virgin — the formation's own
  // candles! — the substitute)
  const z = zone(data);
  return z ? rc(data) === 0 && zoneWidth(z) >= 1.5 * data.meta.atr14 : false;
}
function phantomBomExempt(data: LexiconData): boolean {
  // the phantom BoM (the type-2 — the fortress — the virgin-MoM exemption! — the exemptor)
  const z = zone(data);
  return z ? z.classification === 'PHANTOM_BOM' : false;
}

// ── the VIRGIN-DEATH-SCOPE family — THE REFINED DEATH RULE (the operator's Q3!) ─
function deathRuleScope(data: LexiconData): boolean {
  // the death rule applies to the 30m virgin MoM zones + the 1H TYPE-1 virgin MoMs —
  // the operator verbatim: "the 'virgin MoM zones = death' applies largely to 30m
  // virgin MoM zones and 1H type 1 virgin MoMs"
  const z = zone(data);
  if (!z) return false;
  const tf = ztf(data);
  return tf !== undefined && DEATH_SCOPE_TFS.includes(tf) && z.classification === 'MoM' && rc(data) === 0;
}
function fourHVirginMoM(data: LexiconData): boolean {
  // the 4H virgin MoMs — the operator verbatim: "ALL 4H zones WILL have at least 1
  // reaction before mitigation so even though this is MoM on the 4H it is still a
  // valid reaction point" — the 4H zones are NEVER death zones! (the descriptive)
  const z = zone(data);
  return z ? ztf(data) === '4H' && z.classification === 'MoM' && rc(data) === 0 : false;
}
function oneHPhantomBom(data: LexiconData): boolean {
  // the 1H phantom BoM (the type-2 — the exemption! — the substitute)
  const z = zone(data);
  return z ? ztf(data) === '1H' && z.classification === 'PHANTOM_BOM' : false;
}

// ── the TF-HIERARCHY family — THE KING/GENERAL/CAPTAIN (the operator's Q3/Q4!) ─
function htfSetsLtf(data: LexiconData): boolean {
  // 4H = the King (the E2 shape chain — the war strategy!) · 1H = the General (the E3
  // trade setups — the battles!) · 30m = the Captain (the per-trade context within the
  // 1H-mapped E3 constraints!) — the pressure mechanics SET by the HTF, CASCADED DOWN
  // to the LTFs — "HTF > LTF"
  if (data.meta.tf !== '30m') return false;
  return data.zones.some((z) => z.tf === '1H' || z.tf === '4H');
}
function equalWeightReadings(data: LexiconData): boolean {
  // the equal-weight readings (the LTF overruling the HTF! — the descriptive)
  return data.meta.tf === '4H' && data.zones.some((z) => z.tf === '30m');
}
function singleTfStatic(data: LexiconData): boolean {
  // the single-TF static reading (the charts require the multi-TF analysis — the
  // telescoping! — the substitute)
  if (data.meta.tf === undefined) return false;
  return !data.zones.some((z) => z.tf !== data.meta.tf);
}
function fourHZone(data: LexiconData): boolean {
  // the 4H zones (the King's structures — the ≥1 reaction guaranteed! — the exemptor)
  const z = zone(data);
  return z ? ztf(data) === '4H' : false;
}

// ── the ACTIVE family — the tested zone ───────────────────────────────────────
function activeZone(data: LexiconData): boolean {
  // reactionCount ∈ {1, 2} → the ~80% / ~50% reaction rates
  const n = rc(data);
  return n === 1 || n === 2;
}
function virginCount(data: LexiconData): boolean {
  // reactionCount = 0 (virgin! — the descriptive)
  return rc(data) === 0;
}
function consolidationDwells(data: LexiconData): boolean {
  // the consolidation dwells (the occupied != tested! — the substitute)
  const z = zone(data);
  return z ? rc(data) === 0 && z.pressure === 'VIRGIN' && zoneWidth(z) >= 0.8 * data.meta.atr14 : false;
}
function depletedCount(data: LexiconData): boolean {
  // the ≥3 count (depleted! — the exemptor)
  return rc(data) >= 3;
}

// ── the DEPLETED family — the failing zone ────────────────────────────────────
function depletedZone(data: LexiconData): boolean {
  // reactionCount ≥ 3 → the TP-target-ONLY — "zones usually fail on the THIRD
  // mitigation" (the operator verbatim — #4!)
  return rc(data) >= 3;
}
function strongCountOneTwo(data: LexiconData): boolean {
  // the strong reactionCount 1-2 (the descriptive)
  const n = rc(data);
  return n === 1 || n === 2;
}
function fortressHolds(data: LexiconData): boolean {
  // the FORTRESS (the 4+ holds with the STRONG reactions! — the exemptor)
  const z = zone(data);
  return z ? (z.reactionCount ?? 0) >= 4 && z.pressure === 'FORTRESS' : false;
}

// ── the FORTRESS family — the zone that holds ─────────────────────────────────
function fortressZone(data: LexiconData): boolean {
  // 4+ holds with the STRONG reactions → the phase transition Fire→Earth — the 95%
  // direction flip (E1/E2/E3-MACRO:165-167) — "has not been pierced or broken in 4
  // prior mitigations" (#8!)
  const z = zone(data);
  return z ? (z.reactionCount ?? 0) >= 4 && z.pressure === 'FORTRESS' : false;
}
function weakMitigations(data: LexiconData): boolean {
  // the weak mitigations (the "barely touching the close edge" — the #8's mitigations
  // 3+4! — the descriptive)
  const z = zone(data);
  return z ? (z.reactionCount ?? 0) >= 4 && z.pressure !== 'FORTRESS' : false;
}
function depletedLabel(data: LexiconData): boolean {
  // the depleted-label (the 4 touches != the 4 strong holds! — the substitute)
  const z = zone(data);
  return z ? z.pressure === 'DEPLETED' && (z.reactionCount ?? 0) < 4 : false;
}

// ── the BROKEN family — the violated zone ─────────────────────────────────────
function brokenZone(data: LexiconData): boolean {
  // the pierce with a battle → VIOLATED — the role reversal (the broken support = the
  // new resistance!)
  const z = zone(data);
  return z ? z.pressure === 'BROKEN' : false;
}
function gapThrough(data: LexiconData): boolean {
  // the gap-through (the gap != a battle — the pierce requires the battle, src/e1/lexicons/zone-pressure.md
  // — the descriptive)
  const z = zone(data);
  if (!z) return false;
  const b = data.bars.filter((x) => x.t <= data.meta.anchorMs).slice(-2);
  return b.length === 2 && (b[0].H < z.bottom && b[1].L > z.top || b[0].L > z.top && b[1].H < z.bottom);
}
function wickThrough(data: LexiconData): boolean {
  // the wick-through (the sweep != the break! — the substitute)
  const z = zone(data);
  return z ? rc(data) >= 1 && z.pressure !== 'BROKEN' : false;
}

export const ZONE_PRESSURE_FAMILIES: PatternFamily[] = [
  { group: 'zone-predicate', descriptive: [momType], suggestive: [virginZone], substitute: [zeroTouchWideBand], use: [phantomBomExempt] },
  { group: 'zone-predicate', descriptive: [fourHVirginMoM], suggestive: [deathRuleScope], substitute: [oneHPhantomBom], use: [] },
  { group: 'zone-predicate', descriptive: [equalWeightReadings], suggestive: [htfSetsLtf], substitute: [singleTfStatic], use: [fourHZone] },
  { group: 'zone-predicate', descriptive: [virginCount], suggestive: [activeZone], substitute: [consolidationDwells], use: [depletedCount] },
  { group: 'zone-predicate', descriptive: [strongCountOneTwo], suggestive: [depletedZone], substitute: [], use: [fortressHolds] },
  { group: 'zone-predicate', descriptive: [weakMitigations], suggestive: [fortressZone], substitute: [depletedLabel], use: [brokenWithBattle] },
  { group: 'zone-predicate', descriptive: [gapThrough], suggestive: [brokenZone], substitute: [wickThrough], use: [] },
];

// the BROKEN exemptor reused above (declared after the family list to keep the flow)
function brokenWithBattle(data: LexiconData): boolean {
  const z = zone(data);
  return z ? z.pressure === 'BROKEN' : false;
}

export const zonePressureMachine: MachineRule = {
  id: 'zone-pressure',
  families: ZONE_PRESSURE_FAMILIES,
  classify: (input) => classify(input, ZONE_PRESSURE_FAMILIES),
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        throw buildBlock('zone-pressure', result.evidence || 'rejected pressure state', '3 failed refinements → the problem-solving dispatch. The failure data is stored + synthesized at the pipeline end.', phase);
      }
      throw buildRefineWarning('zone-pressure', result.evidence || 'rejected pressure state', `Refine/retry (${used}/3): the lifecycle = the recurrence state (stateₙ₊₁ = f(stateₙ, the touch event)) — re-run with the reaction events + the freshness state context.`, used);
    }
    if (phase === 'B') st.auditTrail.push(`zone-pressure: ${result.intent} conf ${result.confidence.toFixed(2)} — the lifecycle demand appended to the zone's pressure state`);
  },
  escapeHatchTool: 'probe-resting-side',   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
