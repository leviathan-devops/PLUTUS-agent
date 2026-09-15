/**
 * obvious-trades.ts — LEXICON 6: the forward-reasoning baseline — THE MISSING
 * LAYER.
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 6 — the design authority.)
 *
 * THE PURPOSE: the forward-reasoning baseline — the operator's #1/#2 logic:
 * "the short is halfway to the demand — the TP is AT the demand — the demand's
 * pressure will react — the LONG from its internal liquidity." The reasoning-
 * token baseline = the operator's EU analyses in the golden doc — VERBATIM.
 *
 * THE INPUTS: the E1 zone map (the pressure state per zone!) + the E2 storyline
 *   (the day shapes + the chain!) + the trade-chaining state (the TP of N = the
 *   entry of N+1 — Law 27!) + the price's CURRENT POSITION relative to the
 *   designations (the "halfway to the demand" predicate!).
 *
 * THE OUTPUTS: the trade projections + the E/SL/TP anchors + the confidence —
 *   the reasoning chain's output schema (the TradeProjection interface).
 *
 * THE FAMILIES (the reasoning tokens — the operator's golden-doc analysis as
 *   the baseline):
 *   zone-identification   — the E1 designated zone with the pressure read
 *   pressure-mechanics   — the zone's reaction certainty ("clearly an area of
 *                          strong pressure + bullish liquidity... the opposing
 *                          bearish pressure is not yet strong enough to pierce")
 *   shape-chain-context  — the chain's position ("This follows the shape chain
 *                          forming of SS → BS")
 *   forward-position     — THE MISSING PREDICATE: the price's CURRENT position
 *                          between the shape's start and its target ("the short
 *                          is halfway to the demand")
 *   anchor-construction  — the E/SL/TP ("Set E at the TP level of trade #1, SL
 *                          3 pips outside the far edge of the nested liquidity
 *                          zone..., set TP at the near edge of the supply zone")
 *   validation           — the confluence check ("all the macro storyline
 *                          confluences align")
 *   strength-comparison  — the opposing force ("the Bearish BS from Tuesday was
 *                          extremely weak compared to the Bullish BS from
 *                          Thursday")
 *   reaction-count-state — the mitigation math ("zones usually fail on the
 *                          THIRD mitigation")
 *
 * THE SCORING + THE DECISION: the trade projection fires when the families'
 *   aggregate pos > neg; the RRR gate (≥ 2.5) as the FINAL filter (the
 *   consequence — never the target).
 *
 * THE ENFORCEMENT: Phase A — a projection whose E/SL/TP are not traceable to a
 *   specific E1 zone + the E2 projection → THROW (the E3-NEVER — never a
 *   fabricated level!); Phase B — the projection demand appended to the E3's
 *   setup output. The escape hatch: the diag-monday harness.
 *
 * THE WIRING NOTE (2026-08-08): this module is REGISTERED + unit-tested
 *   standalone this wave; the reasoning-chain wiring (the STEP-B token baseline)
 *   is the W5-W7 wave's file (reasoning-chain.ts — FROZEN this wave).
 */
import {
  classifyByFamilies,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';

/** The RRR gate — the operator's "NOT A SINGLE ONE OF MY TRADES IS BELOW
 *  RRR = 3.5" (D3); the lexicon's FINAL filter = ≥ 2.5 (the consequence, never
 *  the target — the LEXICON_SPEC's "the RRR gate (≥ 2.5) as the FINAL filter"). */
export const RRR_GATE = 2.5;

// ── THE FAMILIES (the reasoning tokens — the operator's golden doc, quoted) ──

/** zone-identification — the trade's zone + the pressure read. */
const zoneIdentificationFamily = {
  id: 'ZONE_IDENTIFICATION',
  group: 'projection-predicate' as const,
  suggestive: [
    // the E1 designated zone with the pressure read ("the 1H Unmitigated MoM
    // Demand zone at 1.14145 - 1.14000 from Thursday's Breakout Surge")
    (d: LexiconData): boolean => !!d.e1ZoneId,
    (d: LexiconData): boolean => !!d.zoneLifecycle && d.zoneLifecycle !== 'BROKEN',
  ],
  descriptive: [
    // the zone without the pressure context (the bare level!)
    (d: LexiconData): boolean => !!d.e1ZoneId && !d.zoneLifecycle,
  ],
  substitute: [
    // the label alone ("a demand zone" — the regex without the psychology!)
    (d: LexiconData): boolean => !!d.e1ZoneId && !d.zoneLifecycle && !d.zoneZfp,
  ],
  use: [
    // the PHANTOM_BOM flag (the fortress — the strongest!)
    (d: LexiconData): boolean => d.phantomBom === true,
  ],
};

/** pressure-mechanics — the zone's reaction certainty. */
const pressureMechanicsFamily = {
  id: 'PRESSURE_MECHANICS',
  group: 'projection-predicate' as const,
  suggestive: [
    // "This is clearly an area of strong pressure + bullish liquidity... the
    // opposing bearish pressure is not yet strong enough to pierce it" — the
    // virgin/fortress lifecycle + the INTACT absorption = the strong pressure
    (d: LexiconData): boolean => d.zoneLifecycle === 'VIRGIN' || d.zoneLifecycle === 'ACTIVE_1',
    (d: LexiconData): boolean => d.zoneLifecycle === 'FORTRESS',
    (d: LexiconData): boolean => d.absorption === 'INTACT',
  ],
  descriptive: [
    // the contested zone (the WLS — the #6's "HEAVILY CONTESTING all breaks")
    (d: LexiconData): boolean => d.zoneLifecycle === 'DEPLETED' || d.zoneLifecycle === 'BROKEN',
  ],
  substitute: [
    // the zfp alone (the number without the lifecycle!)
    (d: LexiconData): boolean => !!d.zoneZfp && !d.zoneLifecycle,
  ],
  use: [
    // the fortress (the 4+ strong holds!)
    (d: LexiconData): boolean => d.zoneLifecycle === 'FORTRESS',
  ],
};

/** shape-chain-context — the chain's position. */
const shapeChainContextFamily = {
  id: 'SHAPE_CHAIN_CONTEXT',
  group: 'projection-predicate' as const,
  suggestive: [
    // "This follows the shape chain forming of SS → BS" — the chain's next step
    // = the trade's direction
    (d: LexiconData): boolean => d.currentShape === 'BS' && d.direction === 'SHORT',
    (d: LexiconData): boolean => d.currentShape === 'R' && d.direction === 'LONG',
  ],
  descriptive: [
    // the chain's conflicting step (the divergence!)
    (d: LexiconData): boolean => d.currentShape === 'BS' && d.direction === 'LONG',
  ],
  substitute: [
    // the single-day shape (the chain ≠ the day!)
    (d: LexiconData): boolean => !!d.currentShape && !d.chainingTp,
  ],
  use: [
    // the unified macro authority
    (d: LexiconData): boolean => d.confluenceAligned === true,
  ],
};

/** forward-position — THE MISSING PREDICATE (the price's position relative to
 *  the designation). */
const forwardPositionFamily = {
  id: 'FORWARD_POSITION',
  group: 'projection-predicate' as const,
  suggestive: [
    // "the short is halfway to the demand" — the price is N pips from the
    // designated zone with the momentum toward it (between the shape's start
    // and the target, closer to neither extreme)
    (d: LexiconData): boolean => {
      if (d.currentPrice == null || d.designatedLevel == null || d.E == null) return false;
      const dist = Math.abs(d.currentPrice - d.designatedLevel);
      const span = Math.abs((d.E ?? 0) - d.designatedLevel);
      if (span <= 0) return false;
      const ratio = dist / span;
      return ratio > 0 && ratio < 1;
    },
  ],
  descriptive: [
    // the price moving AWAY from the designation (the rejection!)
    (d: LexiconData): boolean => {
      if (d.currentPrice == null || d.designatedLevel == null) return false;
      return d.direction === 'LONG' ? d.currentPrice < d.designatedLevel : d.currentPrice > d.designatedLevel;
    },
  ],
  substitute: [
    // the price AT the zone (the reaction already happened!)
    (d: LexiconData): boolean => {
      if (d.currentPrice == null || d.designatedLevel == null) return false;
      return Math.abs(d.currentPrice - d.designatedLevel) < (d.pipValue ?? 0) * 2;
    },
  ],
  use: [
    // the zone's reaction state (the virgin/fortress = the reaction probability!)
    (d: LexiconData): boolean => d.zoneLifecycle === 'VIRGIN' || d.zoneLifecycle === 'FORTRESS',
  ],
};

/** anchor-construction — the E/SL/TP (the checkable numbers, traceable). */
const anchorConstructionFamily = {
  id: 'ANCHOR_CONSTRUCTION',
  group: 'projection-predicate' as const,
  suggestive: [
    // "Set E at the TP level of trade #1" — the chaining (the TP of N = the
    // entry of N+1!)
    (d: LexiconData): boolean => d.chainingTp != null && d.E != null,
    // the E/SL/TP all present + the traceability (the E1 zone + the E2
    // projection ids)
    (d: LexiconData): boolean => d.E != null && d.SL != null && d.TP != null && !!d.e1ZoneId && !!d.e2ProjectionId,
  ],
  descriptive: [
    // the anchors without the zone geometry (the fabricated levels!)
    (d: LexiconData): boolean => d.E != null && d.SL != null && d.TP != null && !d.e1ZoneId,
  ],
  substitute: [
    // the rounded levels (the "nice number" — the regex without the structure!)
    (d: LexiconData): boolean => d.E != null && (d.E * 10) % 1 === 0,
  ],
  use: [
    // the RRR gate (|TP−E|/|E−SL| ≥ 2.5 — the consequence, not the input!)
    (d: LexiconData): boolean => {
      if (d.E == null || d.SL == null || d.TP == null) return false;
      const denom = Math.abs(d.E - d.SL);
      if (denom <= 0) return false;
      return Math.abs(d.TP - d.E) / denom >= RRR_GATE;
    },
  ],
};

/** validation — the confluence check. */
const validationFamily = {
  id: 'VALIDATION',
  group: 'projection-predicate' as const,
  suggestive: [
    // "all the macro storyline confluences align" — the E1 pressure + the E2
    // chain + the E3 geometry ALL agree
    (d: LexiconData): boolean => d.confluenceAligned === true,
  ],
  descriptive: [
    // any layer contradicts (the divergence!)
    (d: LexiconData): boolean => (d.layerDivergence?.length ?? 0) > 0,
  ],
  substitute: [
    // the single-confluence agreement (one signal ≠ the alignment!)
    (d: LexiconData): boolean => d.confluenceAligned !== true && !d.layerDivergence,
  ],
  use: [
    // the break-validation (the #6's "this ZONE has not yet been broken" — the
    // E1 pressure validates the structure break!)
    (d: LexiconData): boolean => d.breakValidated === true,
  ],
};

/** strength-comparison — the opposing force. */
const strengthComparisonFamily = {
  id: 'STRENGTH_COMPARISON',
  group: 'projection-predicate' as const,
  suggestive: [
    // "the Bearish BS from Tuesday was extremely weak compared to the Bullish
    // BS from Thursday" — the comparative impulse strengths
    (d: LexiconData): boolean => {
      if (d.buyImpulse == null || d.sellImpulse == null) return false;
      return d.buyImpulse > d.sellImpulse * 1.5 || d.sellImpulse > d.buyImpulse * 1.5;
    },
  ],
  descriptive: [
    // the equal strengths (the WLS!)
    (d: LexiconData): boolean => {
      if (d.buyImpulse == null || d.sellImpulse == null) return false;
      const max = Math.max(d.buyImpulse, d.sellImpulse);
      return max > 0 && Math.abs(d.buyImpulse - d.sellImpulse) / max < 0.1;
    },
  ],
};

/** reaction-count-state — the mitigation math. */
const reactionCountStateFamily = {
  id: 'REACTION_COUNT_STATE',
  group: 'projection-predicate' as const,
  suggestive: [
    // "has not been pierced or broken in 4 prior mitigations... likely to
    // become a fortress zone and NOT get pierced" (#8)
    (d: LexiconData): boolean => (d.reactionCountState ?? 0) >= 4,
    // the zone "usually fail[s] on the THIRD mitigation" — the ≤2 count = the
    // zone still holds (the reaction probability)
    (d: LexiconData): boolean => (d.reactionCountState ?? 0) <= 2,
  ],
  descriptive: [
    // the fresh zone (the virgin — the FIRST test!)
    (d: LexiconData): boolean => (d.reactionCountState ?? 1) === 0,
  ],
  substitute: [
    // the touch count (the touches ≠ the mitigations!) — pos +2
    (d: LexiconData): boolean => (d.reactionCount ?? 0) > (d.reactionCountState ?? 0),
  ],
  use: [
    // the FORTRESS (the #8's exemption — the 5th mitigation predicted to hold!)
    (d: LexiconData): boolean => d.zoneLifecycle === 'FORTRESS',
  ],
};

export const obviousTradesLexicon: TradingLexiconRule = {
  id: 'obvious-trades',
  families: [
    zoneIdentificationFamily,
    pressureMechanicsFamily,
    shapeChainContextFamily,
    forwardPositionFamily,
    anchorConstructionFamily,
    validationFamily,
    strengthComparisonFamily,
    reactionCountStateFamily,
  ],
  escapeHatchTool: 'diag-monday-harness',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    const base = classifyByFamilies(obviousTradesLexicon.families, input);
    // THE E3-NEVER HARD GATE (the operator's "never a fabricated level" — the
    // spec's Phase-A contract): a projection carrying E/SL/TP that are NOT
    // traceable to a specific E1 zone + the E2 projection is REJECTED outright
    // — the anchor-construction demand — regardless of the other families'
    // aggregate (a pressure-mechanics win can never dress an untraceable
    // level as a valid setup).
    if (input.E != null && input.SL != null && input.TP != null && (!input.e1ZoneId || !input.e2ProjectionId)) {
      return {
        ...base,
        intent: 'ANCHOR_CONSTRUCTION',
        action: 'reject',
        violation: 'the projection\'s E/SL/TP are not traceable to a specific E1 zone + the E2 projection (the E3-NEVER rule — never a fabricated level)',
      };
    }
    // THE RRR GATE (the FINAL filter — the consequence, never the target): a
    // projection whose RRR < the gate is REJECTED regardless of the families'
    // aggregate (the operator: "RRR is a CONSEQUENCE, not a target. Let zone
    // structure determine RR" — the gate only FILTERS, it never extends).
    if (base.action === 'classify' && input.rrr != null && input.rrr < RRR_GATE) {
      return { ...base, action: 'reject' };
    }
    return base;
  },
  enforce(result: LexiconResult, phase: 'A' | 'B'): void {
    if (phase === 'A') {
      // Phase A — the boundary THROW: a trade projection whose E/SL/TP are not
      // traceable to a specific E1 zone + the E2 projection → the E3-NEVER rule
      // (never a fabricated level!).
      if (result.intent === 'ANCHOR_CONSTRUCTION' && result.action !== 'classify') {
        throw new Error(
          `[OBVIOUS-TRADES PHASE-A] the projection's E/SL/TP are not traceable ` +
          `to a specific E1 zone + the E2 projection (the E3-NEVER rule — never ` +
          `a fabricated level). Escape: ${obviousTradesLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    // Phase B — the projection demand appended to the E3's setup output.
    result.demand = `obvious-trades: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};
