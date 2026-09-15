/**
 * zone-pressure.ts — LEXICON 4: the zone-pressure lifecycle semantics.
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 4 — the design authority.)
 *
 * The lifecycle/mitigation/freshness states + the fortress detection + the
 * operator's doctrine: "zones usually fail on the THIRD mitigation" + the
 * fortress "not pierced or broken in 4 prior mitigations... likely to become a
 * fortress zone and NOT get pierced" (#8).
 *
 * THE INPUTS: the reactionEvents (the SWEEP consumption events) + the
 * freshness state (the FRESH→TESTED→DEPLETED|VIOLATED machine) + the
 * absorption state + the liquidity links.
 *
 * THE OUTPUTS: the lifecycle state VIRGIN / ACTIVE-1 / ACTIVE-2 / DEPLETED /
 *   FORTRESS / BROKEN + the ZFP + the absorption + the FORTRESS flag.
 *
 * THE CONSUMERS: the E2's pressure-aware designation (the pressureScore +40
 *   VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS) + the E3's SL-relevance switch
 *   (the operative defense — the SHIELD_FUEL vs the PRESSURE_STRUCTURE).
 *
 * THE MPSE FORM: the recurrence relation (stateₙ₊₁ = f(stateₙ, touchEventₙ))
 *   + the inequalities (reactionCount ≥ 3 → TP-only; ≥ 4 strong → FORTRESS)
 *   + the linear combination (the pressureScore = Σ weights).
 *
 * THE ENFORCEMENT: Phase A — a DEPLETED zone the E2's designation treats as
 *   the ENTRY-PRIMARY → THROW (the TP-target-ONLY rule!); Phase B — the
 *   lifecycle demand appended to the zone's pressure state.
 */
import {
  classifyByFamilies,
  confidenceOf,
  scoreFamily,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';
// W6 (the §2.7.4 — the M-5 kill): THE BoM-GATED +40 — the gate reads the
// phantom/fortress classification (the single-source isPhantomBoM) so the
// fortress-exempted virgin MoM (the EU case) keeps the ENTRY-PRIMARY +40 while
// the bare virgin MoM (the death-zone candidate) keeps the −20 penalty.
import { isPhantomBoM } from './zone-classification.js';

// ── the canon thresholds (the ZR-7 spec 991-992 + the operator's doctrine) ──
const DEPLETED_COUNT = 3;      // "zones usually fail on the THIRD mitigation"
const FORTRESS_HOLDS = 4;      // "not pierced or broken in 4 prior mitigations"
const VIRGIN_PRESSURE = 40;    // the ENTRY-PRIMARY +40
const DEPLETED_PRESSURE = -30; // the TP-target-ONLY −30
const FORTRESS_PRESSURE = 20;  // the fortress +20

/** The battle count — the reactionEvents length (the recurrence state). */
function battleCountOf(d: LexiconData): number {
  return d.reactionEvents?.length ?? d.mitigationCount ?? d.reactionCount ?? 0;
}

/** The timeframe read — the hierarchy field (the diag/consumers may pass the
 *  zone-context's zoneTimeframe instead of the lifecycle's timeframe). */
function tfOf(d: LexiconData): LexiconData['timeframe'] {
  return d.timeframe ?? d.zoneTimeframe;
}

// ── THE FAMILIES (the lifecycle semantics — each predicate a deterministic
//    comparison over the battle/freshness data) ──

/** virgin — the untested zone (reactionCount = 0 ∧ BoM — the ENTRY-PRIMARY +40). */
const virginFamily = {
  id: 'VIRGIN',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => battleCountOf(d) === 0,
    (d: LexiconData): boolean => d.zoneClassification === 'BoM',
  ],
  descriptive: [
    // the type = MoM (the DEATH ZONE — the E2-5 reject)
    (d: LexiconData): boolean => d.zoneClassification === 'MoM',
  ],
  substitute: [
    // the zero-touch with the wide band (no reaction ≠ virgin — the
    // formation's own candles!) — pos +2
    (d: LexiconData): boolean => battleCountOf(d) === 0 && (d.bw ?? 0) >= 3,
  ],
  use: [
    // the phantom BoM (the type-2 — the fortress — the virgin-MoM exemption!)
    (d: LexiconData): boolean => d.phantomBom === true,
  ],
};

/** virgin-death-scope — THE REFINED DEATH RULE (the operator's Q3 answer). */
const virginDeathScopeFamily = {
  id: 'VIRGIN_DEATH_SCOPE',
  group: 'zone-predicate' as const,
  suggestive: [
    // the 30m virgin MoM zones + the 1H TYPE-1 virgin MoMs
    (d: LexiconData): boolean => tfOf(d) === '30m' && d.zoneClassification === 'MoM' && battleCountOf(d) === 0,
    (d: LexiconData): boolean => tfOf(d) === '1H' && d.zoneClassification === 'MoM' && battleCountOf(d) === 0 && !d.phantomBom,
  ],
  descriptive: [
    // the 4H virgin MoMs — the operator: "ALL 4H zones WILL have at least 1
    // reaction before mitigation" — the 4H zones are NEVER death zones!
    (d: LexiconData): boolean => tfOf(d) === '4H',
  ],
  substitute: [
    // the 1H phantom BoM (the type-2 — the exemption!) — pos +2
    (d: LexiconData): boolean => tfOf(d) === '1H' && d.phantomBom === true,
  ],
};

/** tf-hierarchy — THE KING/GENERAL/CAPTAIN (the operator's Q3/Q4 answers). */
const tfHierarchyFamily = {
  id: 'TF_HIERARCHY',
  group: 'zone-predicate' as const,
  suggestive: [
    // 4H = the King (the E2 shape chain — the war strategy!)
    (d: LexiconData): boolean => tfOf(d) === '4H',
    // 1H = the General (the E3 trade setups — the battles!)
    (d: LexiconData): boolean => tfOf(d) === '1H',
    // 30m = the Captain (the per-trade context within the 1H-mapped E3)
    (d: LexiconData): boolean => tfOf(d) === '30m',
  ],
  descriptive: [
    // the equal-weight readings (the LTF overruling the HTF!)
    (d: LexiconData): boolean => tfOf(d) === '15m',
  ],
  substitute: [
    // the single-TF static reading (the charts require the multi-TF analysis
    // — the telescoping!) — pos +2
    (d: LexiconData): boolean => tfOf(d) === undefined,
  ],
  use: [
    // the 4H zones (the King's structures — the ≥1 reaction guaranteed!)
    (d: LexiconData): boolean => tfOf(d) === '4H' && battleCountOf(d) >= 1,
  ],
};

/** active — the tested zone (reactionCount ∈ {1, 2} — ~80% / ~50%). */
const activeFamily = {
  id: 'ACTIVE',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => battleCountOf(d) === 1,
    (d: LexiconData): boolean => battleCountOf(d) === 2,
  ],
  descriptive: [
    (d: LexiconData): boolean => battleCountOf(d) === 0,
  ],
  substitute: [
    // the consolidation dwells (the occupied ≠ tested!) — pos +2
    (d: LexiconData): boolean => battleCountOf(d) === 0 && (d.freshness === 'TESTED_1X' || d.freshness === 'TESTED_2X'),
  ],
  use: [
    // the ≥3 count (depleted!)
    (d: LexiconData): boolean => battleCountOf(d) >= DEPLETED_COUNT,
  ],
};

/** depleted — the failing zone (reactionCount ≥ 3 — the TP-target-ONLY). */
const depletedFamily = {
  id: 'DEPLETED',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => battleCountOf(d) >= DEPLETED_COUNT,
  ],
  descriptive: [
    // the strong reactionCount 1-2
    (d: LexiconData): boolean => battleCountOf(d) >= 1 && battleCountOf(d) <= 2,
  ],
  use: [
    // the FORTRESS (the 4+ holds with the STRONG reactions!)
    (d: LexiconData): boolean => (d.strongHoldCount ?? 0) >= FORTRESS_HOLDS,
  ],
};

/** fortress — the zone that holds (4+ strong holds — the 95% direction flip). */
const fortressFamily = {
  id: 'FORTRESS',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => (d.strongHoldCount ?? 0) >= FORTRESS_HOLDS,
  ],
  descriptive: [
    // the weak mitigations (the "barely touching the close edge" — the #8's
    // mitigations 3+4!)
    (d: LexiconData): boolean => battleCountOf(d) >= DEPLETED_COUNT && (d.strongHoldCount ?? 0) < FORTRESS_HOLDS,
  ],
  substitute: [
    // the depleted-label (the 4 touches ≠ the 4 strong holds!) — pos +2
    (d: LexiconData): boolean => battleCountOf(d) >= FORTRESS_HOLDS && (d.strongHoldCount ?? 0) < FORTRESS_HOLDS,
  ],
  use: [
    // the broken (the pierced with a battle!)
    (d: LexiconData): boolean => d.pierced === true,
  ],
};

/** broken — the violated zone (the pierce with a battle — the role reversal). */
const brokenFamily = {
  id: 'BROKEN',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => d.pierced === true,
  ],
  descriptive: [
    // the gap-through (the gap ≠ a battle — the pierce requires the battle!)
    (d: LexiconData): boolean => d.freshness === 'VIOLATED' && (d.reactionEvents?.length ?? 0) === 0,
  ],
  substitute: [
    // the wick-through (the sweep ≠ the break!) — pos +2
    (d: LexiconData): boolean => d.freshness === 'VIOLATED' && (d.reactionEvents?.length ?? 0) > 0 && !(d.pierced === true),
  ],
};

export const zonePressureLexicon: TradingLexiconRule = {
  id: 'zone-pressure',
  families: [virginFamily, virginDeathScopeFamily, tfHierarchyFamily, activeFamily, depletedFamily, fortressFamily, brokenFamily],
  escapeHatchTool: 'probe-monday-daily',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    // THE LIFECYCLE IS THE RECURRENCE (the spec's MPSE form: stateₙ₊₁ =
    // f(stateₙ, touchEventₙ) — the operator's battle machine). The recurrence
    // IS the decision, reproduced deterministically — the SAME states the
    // proven classifyLifecycle (zone-pressure.ts:73-85) produces: BROKEN (any
    // pierce — the terminal) → FORTRESS (4+ holds, zero pierces) → DEPLETED
    // (3+ — the third mitigation) → ACTIVE (1-2) → VIRGIN (0). The family
    // scoring supplies the CONFIDENCE + the evidence record; the death-scope +
    // tf-hierarchy families are the semantic MODIFIERS (the operator's Q3/Q4
    // answers), never competing lifecycle intents.
    const battles = battleCountOf(input);
    let intent: string;
    if (input.pierced === true) intent = 'BROKEN';
    else if ((input.strongHoldCount ?? 0) >= FORTRESS_HOLDS) intent = 'FORTRESS';
    else if (battles >= DEPLETED_COUNT) intent = 'DEPLETED';
    else if (battles === 1 || battles === 2) intent = 'ACTIVE';
    else intent = 'VIRGIN';
    const evidence = classifyByFamilies(zonePressureLexicon.families, input);
    const family = zonePressureLexicon.families.find((f) => f.id === intent);
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
      // Phase A — the boundary THROW: a DEPLETED zone the E2's designation
      // treats as the ENTRY-PRIMARY → the TP-target-ONLY rule (the operator's
      // "zones usually fail on the THIRD mitigation").
      if (result.intent === 'DEPLETED') {
        throw new Error(
          `[ZONE-PRESSURE PHASE-A] DEPLETED zone (${result.pos} holds / ${result.neg}) ` +
          `treated as the ENTRY-PRIMARY — the TP-target-ONLY rule (the third ` +
          `mitigation!). Escape: ${zonePressureLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    // Phase B — the lifecycle demand appended to the zone's pressure state.
    result.demand = `zone-pressure: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};

/** The E2 pressureScore — the designation's lifecycle weight (ZR7-spec:991-992):
 *  +40 VIRGIN-BoM (the ENTRY-PRIMARY) / −30 DEPLETED (the TP-target-ONLY) /
 *  +20 FORTRESS. The linear combination the E2 designation consumes. */
export function pressureScoreOf(input: LexiconData): number {
  const r = zonePressureLexicon.classify(input);
  switch (r.intent) {
    // THE BoM-GATED +40 (the §2.7.4 — the M-5 kill): the +40 ENTRY-PRIMARY is
    // the VIRGIN state's privilege — a fortress-exempted virgin MoM (the
    // phantom — isPhantomBoM) KEEPS the +40; the bare virgin MoM (the death-zone
    // candidate) keeps the −20 penalty.
    case 'VIRGIN': return (input.zoneClassification === 'BoM' || isPhantomBoM(input)) ? VIRGIN_PRESSURE : VIRGIN_PRESSURE - 20;
    case 'FORTRESS': return FORTRESS_PRESSURE;
    case 'DEPLETED': return DEPLETED_PRESSURE;
    default: return 0;
  }
}
