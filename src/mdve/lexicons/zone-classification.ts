/**
 * zone-classification.ts — LEXICON 3: the zone-identity semantics + THE
 * PHANTOM BoM (the operator's fortress-zone concept).
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 3 — the design authority.)
 *
 * THE PURPOSE: the BoM/MoM/IP/LSZ identity + the PHANTOM BoM — a type-2 virgin
 * MoM that FUNCTIONS as a BoM. THE most important lexicon of the six — the
 * blanket virgin-MoM death rule (shape-brain.ts:1150, the W0-verified line)
 * rejected the operator's #2 demand and caused the EU LONG's Δ19.4p miss.
 *
 * THE PHANTOM-BoM ALL-4 PREDICATE (the operator's criteria — HARD):
 *   PHANTOM_BOM ⟺ (1) the LARGE-OB width predicate
 *                ∧ (2) the mid-swing-recovery + the FAKEOUT predicate
 *                ∧ (3) the pre-formation opposing-BoM reaction predicate
 *                ∧ (4) the macro-origin continuation (the KCE-Telescoping)
 *   3-of-4 → the DEATH rule stands (the conservative default — a 3-of-4 is
 *   NOT exempted: the type-1 virgin MoM's full signature → DEATH always).
 *   The boolean algebra: PHANTOM ∧ DEATH_TYPE1 → DEATH ·
 *   PHANTOM ∧ ¬DEATH_TYPE1 → FORTRESS.
 *
 * THE FAMILIES:
 *   bom          — prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate
 *   mom          — prior == SAME ∧ validOrigin ∧ widthGate
 *   phantom-bom  — THE FORTRESS (the all-4 predicate — the operator's criteria)
 *   fortress-bom — a plain BoM that held 4+ mitigations ("not pierced or broken
 *                  in 4 prior mitigations... likely to become a fortress zone")
 *   ip           — the 9-pillar confluence (source='PILLAR')
 *
 * THE ENFORCEMENT: Phase A — a phantom-BoM-classified zone that the virgin-MoM
 *   rule rejects → THROW at the E2 boundary (the death-rule exemption demand);
 *   Phase B — the PHANTOM_BOM flag appended to the zone's classification.
 */
import {
  classifyByFamilies,
  confidenceOf,
  scoreFamily,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';

// ── the canon gates (obcv.ts:597-610 — the width gate; cited) ──
const BOM_MIN_BW = 3.0;
const BOM_MIN_BF = 0.65;
/** the SMC ratio-based large-OB threshold (the L1 §11.3 — the zone width ≥
 *  1.5 × the ATR proxy — the ratio doctrine, never a fixed pip number). */
export const LARGE_OB_RATIO = 1.5;
/** THE OPPOSING-PROXIMITY RATIO (the §2.7.3 — the M-3 kill): 3.0 × the ATR
 *  proxy pips — the SMC ratio doctrine's concrete form (the register: "the
 *  opposing structure sits at/above the zone — the ELEMENT match, never the
 *  price level"). The old fixed 60-pip window (OPPOSING_PROXIMITY_PIPS) is a
 *  PRICE LEVEL — DEAD (the DXY inverse supply is ~12p from the EU's structure
 *  in the ELEMENT space; the fixed 60-pip window either admits everything or
 *  nothing). */
export const OPPOSING_PROXIMITY_RATIO = 3.0;
/** The opposing-proximity band in pips — 3 × the ATR proxy, never the fixed
 *  60 (the pair's volatility adapts the reach — the SMC ratio doctrine). */
export function opposingProximityPips(atrPips: number): number {
  return OPPOSING_PROXIMITY_RATIO * atrPips;
}
/** THE OPPOSING-EDGE TOLERANCE RATIO (the §2.7.3 — the ±3p mechanical-band
 *  tolerances become the ATR-proxy band): 0.25 × the ATR proxy — the near-edge
 *  band the §2.3 STAGE-5 nesting uses (dataDerivedTravel nearEdge — ONE canon
 *  fraction, never a new fixed pip ladder). */
const OPPOSING_EDGE_TOLERANCE_RATIO = 0.25;
const FORTRESS_MIN_HOLDS = 4;

/** The zone band width in pips. */
function widthPipsOf(d: LexiconData): number {
  const pip = d.pipValue ?? 0;
  if (pip <= 0) return 0;
  return ((d.zoneCeiling ?? 0) - (d.zoneFloor ?? 0)) / pip;
}

/** The zone's timeframe read (the zone-context field). */
function tfOfZone(d: LexiconData): LexiconData['zoneTimeframe'] {
  return d.zoneTimeframe ?? (d.timeframe as LexiconData['zoneTimeframe'] | undefined) ?? '1H';
}

// ── (1) THE LARGE-OB WIDTH PREDICATE — the SMC ratio-based width (the OB's
//    size is a function of the move it precedes — never a fixed pip number) ──
export const predLargeOb = (d: LexiconData): boolean => {
  const atr = d.atrPips ?? 0;
  if (atr <= 0) return false;
  return widthPipsOf(d) >= LARGE_OB_RATIO * atr;
};

// ── (2) THE MID-SWING-RECOVERY + THE FAKEOUT PREDICATE — "clearly breaks
//    (temporarily for only a couple of candles) the actual swing move
//    structure and is clearly a 'fake RWL' type or 'correction' fakeout
//    candle" (the operator verbatim). The type-2 virgin MoM is a 1H/30m LTF
//    structure; the virgin truth is the E1 freshness machine: FRESH = untouched
//    at the anchor. ──
export const predMidSwingFakeout = (d: LexiconData): boolean => {
  const tf = d.zoneTimeframe;
  if (tf !== '1H' && tf !== '30m') return false;
  const reaction = d.reactionCount ?? 0;
  const virginFresh = d.freshness === 'FRESH' || reaction === 0;
  if (!virginFresh) return false;
  // the fakeout = the correction broke the swing structure for only a couple
  // of candles — the mid-swing position (the formation within the leg, not
  // at the origin) + the bounded recovery. The mid ∈ (0,0.9) is the KEPT
  // definition (the §2.7.1 reconciled decision — the loose no-mid variant of
  // the reasoning-chain's old phantomBoMExemption is SUPERSEDED).
  const mid = d.midSwingPosition ?? 0;
  return mid > 0 && mid < 0.9;
};

// ── (3) THE PRE-FORMATION OPPOSING-BoM REACTION PREDICATE — "there is an UM
//    1H BoM supply zone ... that this correction instantly reacts to before
//    forming the big OB" (the operator verbatim — the reaction PRECEDES the
//    formation). The opposing structure sits at/above the zone (the ELEMENT
//    match, never the price level). The predicate scans the model's zone list
//    (the phantomBoMExemption model.zones equivalent — reasoning-chain.ts:453-
//    460) when present, else the single opposingZone element. ──
export const predOpposingBoMReaction = (d: LexiconData): boolean => {
  const opposingType = d.zoneType === 'DEMAND' ? 'SUPPLY' : 'DEMAND';
  const formationMs = d.zoneFormationMs ?? Infinity;
  const pip = d.pipValue ?? 0;
  // THE ELEMENT MATCH (the §2.7.3 — the M-3 kill): the proximity window + the
  // ±3p mechanical-band tolerances derive from the ATR proxy (the ratio × atr,
  // the near-edge × atr) — NEVER the fixed 60-pip window / the fixed ±3p.
  const atrPips = d.atrPips ?? 0;
  const proximity = opposingProximityPips(atrPips) * pip;
  const edgeTolerance = OPPOSING_EDGE_TOLERANCE_RATIO * atrPips * pip;
  const check = (o: NonNullable<LexiconData['opposingZone']>): boolean => {
    if (o.classification !== 'BoM') return false;
    if (o.type !== opposingType) return false;
    if ((o.formationMs ?? -Infinity) >= formationMs) return false;
    if (d.zoneType === 'DEMAND') {
      // the supply above the demand's floor: o.bottom ≥ floor − tol ∧ ≤ ceiling + proximity
      return (o.bottom ?? 0) >= (d.zoneFloor ?? 0) - edgeTolerance &&
        (o.bottom ?? 0) <= (d.zoneCeiling ?? 0) + proximity;
    }
    // the demand below the supply's ceiling
    return (o.top ?? 0) <= (d.zoneCeiling ?? 0) + edgeTolerance &&
      (o.top ?? 0) >= (d.zoneFloor ?? 0) - proximity;
  };
  if (d.zones && d.zones.length > 0) {
    return d.zones.some((z) => check({
      type: z.type, classification: z.classification,
      formationMs: z.formationMs, top: z.top, bottom: z.bottom,
    }));
  }
  return d.opposingZone ? check(d.opposingZone) : false;
};

// ── (4) THE MACRO-ORIGIN CONTINUATION — the KCE-Telescoping: the move
//    completes the FULL swing from the macro origin element. The zone's
//    center nests in a same-type 4H origin structure. The predicate scans the
//    model's zone list (the phantomBoMExemption model.zones scan —
//    reasoning-chain.ts:466-471) when present, else the single macroOrigin. ──
export const predMacroOriginContinuation = (d: LexiconData): boolean => {
  if (d.parentZoneId || d.nestedWithin) return true;
  const center = ((d.zoneFloor ?? 0) + (d.zoneCeiling ?? 0)) / 2;
  const contains = (bottom: number | undefined, top: number | undefined, type: string | undefined): boolean =>
    type === d.zoneType && (bottom ?? 0) <= center && (top ?? 0) >= center;
  if (d.zones && d.zones.length > 0) {
    return d.zones.some((z) => z.timeframe === '4H' && contains(z.bottom, z.top, z.type));
  }
  const m = d.macroOrigin;
  if (!m) return false;
  if (m.timeframe !== '4H') return false;
  return contains(m.bottom, m.top, m.type);
};

// ── THE ALL-4 (the operator's criteria — the HARD conjunction) ──
export const predPhantomBomAll4 = (d: LexiconData): boolean =>
  predLargeOb(d) && predMidSwingFakeout(d) && predOpposingBoMReaction(d) && predMacroOriginContinuation(d);

// ── THE TYPE-1 SIGNATURE (the use-exemptor — the DEATH ZONE stands): the
//    small OB + the uninterrupted BS/WL + the mid-move position. When the
//    phantom-bom suggestive fires AND this fires, the boolean algebra gives
//    DEATH (PHANTOM ∧ DEATH_TYPE1 → DEATH). ──
const predType1Signature = (d: LexiconData): boolean => {
  const atr = d.atrPips ?? 0;
  const smallOb = atr <= 0 || widthPipsOf(d) < LARGE_OB_RATIO * atr;
  const uninterrupted = (d.midSwingPosition ?? 0) > 0 && (d.midSwingPosition ?? 0) < 0.5;
  const midMove = (d.midSwingPosition ?? 0) >= 0.2;
  return smallOb && uninterrupted && midMove;
};

/** The prior-move gate — prior ∈ {NONE, OPPOSITE} (the reversal origin → BoM). */
const predPriorNotSame = (d: LexiconData): boolean =>
  d.priorMove !== 'SAME';

/** The width gate (obcv.ts:597-610 — the bw ≥ 3.0 ∧ bf ≥ 0.65 construction
 *  gates, ported as the deterministic comparisons). */
const predWidthGate = (d: LexiconData): boolean => {
  if ((d.bw ?? 0) > 0 && (d.bw ?? 0) < BOM_MIN_BW) return false;
  if ((d.bandFraction ?? 0) > 0 && (d.bandFraction ?? 0) < BOM_MIN_BF) return false;
  return true;
};

// ── THE FAMILIES ──

/** bom — the true BoM (prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate). */
const bomFamily = {
  id: 'BoM',
  group: 'zone-predicate' as const,
  suggestive: [
    predPriorNotSame,
    (d: LexiconData): boolean => (d.bw ?? 0) >= BOM_MIN_BW,
    (d: LexiconData): boolean => (d.bandFraction ?? 0) >= BOM_MIN_BF,
    predWidthGate,
  ],
  descriptive: [
    // prior == SAME (the continuation — a MoM!)
    (d: LexiconData): boolean => d.priorMove === 'SAME',
  ],
  substitute: [
    // the wide-OB in the middle of the move (the width alone ≠ a BoM — the
    // prior matters!)
    (d: LexiconData): boolean => (d.midSwingPosition ?? 0) >= 0.3 && (d.bw ?? 0) >= BOM_MIN_BW,
  ],
  use: [
    // the REJECT (the totality: every origin → exactly one of {BoM, MoM, REJECT})
    (d: LexiconData): boolean => d.priorMove === undefined,
  ],
};

/** mom — the true MoM (prior == SAME ∧ validOrigin ∧ widthGate). */
const momFamily = {
  id: 'MoM',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => d.priorMove === 'SAME',
    predWidthGate,
  ],
  descriptive: [
    // prior ∈ {NONE, OPPOSITE} (the reversal origin — a BoM!)
    predPriorNotSame,
  ],
  substitute: [
    // the phantom BoM (the type-2 virgin MoM — the MoM-label that FUNCTIONS
    // as a BoM!) — pos +2 (the surface trap)
    (d: LexiconData): boolean => predPhantomBomAll4(d),
  ],
  use: [
    // the REJECT
    (d: LexiconData): boolean => d.priorMove === undefined,
  ],
};

/** phantom-bom — THE FORTRESS (the operator's all-4 predicate — HARD). */
const phantomBomFamily = {
  id: 'PHANTOM_BOM',
  group: 'zone-predicate' as const,
  suggestive: [
    predLargeOb,
    predMidSwingFakeout,
    predOpposingBoMReaction,
    predMacroOriginContinuation,
  ],
  descriptive: [
    // the small-OB width ∧ the mid-uninterrupted-move position (the type-1
    // signature!)
    (d: LexiconData): boolean => {
      const atr = d.atrPips ?? 0;
      return (atr > 0 && widthPipsOf(d) < LARGE_OB_RATIO * atr) &&
        (d.midSwingPosition ?? 0) >= 0.2;
    },
  ],
  substitute: [
    // the virgin-MoM label ALONE (the surface — "it's a MoM so it's a death
    // zone" = the regex without the psychology — THE derailment!)
    (d: LexiconData): boolean => d.zoneClassification === 'MoM' && !predPhantomBomAll4(d),
  ],
  use: [
    // the type-1 virgin MoM's FULL signature (the small OB + the uninterrupted
    // BS/WL + the mid-move → the DEATH ZONE stands!) — neg +3
    predType1Signature,
  ],
};

/** fortress-bom — the PROVEN BoM (the operator's Q2 correction). */
const fortressBomFamily = {
  id: 'FORTRESS_BOM',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => d.zoneClassification === 'BoM',
    (d: LexiconData): boolean => (d.strongHoldCount ?? 0) >= FORTRESS_MIN_HOLDS,
  ],
  descriptive: [
    // the phantom BoM (the type-2 virgin — a DIFFERENT category — the fortress
    // BoM is a VISIBLE obvious BoM, never disguised!)
    (d: LexiconData): boolean => d.zoneClassification === 'MoM',
  ],
  substitute: [
    // the depletion (the 3+ mitigations ≠ the fortress — the FORTRESS needs
    // the STRONG holds!)
    (d: LexiconData): boolean => (d.strongHoldCount ?? 0) < FORTRESS_MIN_HOLDS && (d.reactionCount ?? 0) >= 3,
  ],
  use: [
    // the broken (the pierced with a battle!)
    (d: LexiconData): boolean => d.pierced === true,
  ],
};

/** ip — the IP zone (the 9-pillar confluence). */
const ipFamily = {
  id: 'IP',
  group: 'zone-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => (d.zoneConfluence ?? 0) >= 9,
    (d: LexiconData): boolean => (d.zoneConfluence ?? 0) >= 6 && (d.zoneZfp ?? 0) <= 40,
  ],
  descriptive: [
    // a canonical S/D origin
    (d: LexiconData): boolean => (d.zoneClassification === 'BoM' || d.zoneClassification === 'MoM') && (d.zoneConfluence ?? 0) < 6,
  ],
};

export const zoneClassificationLexicon: TradingLexiconRule = {
  id: 'zone-classification',
  families: [bomFamily, momFamily, phantomBomFamily, fortressBomFamily, ipFamily],
  escapeHatchTool: 'probe-resting-side',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    // THE ALL-4 IS THE DECISION (the operator's boolean algebra is a hard
    // CONJUNCTION — the set-theory membership test: zone ∈ {the LARGE-OB set}
    // ∩ {the recovery-base set} ∩ {the opposing-BoM-reaction set} ∩ {the
    // macro-origin set}). The family scoring below is the evidence RECORD; the
    // classification itself is decided by the conjunction — a 3-of-4 is NOT a
    // member, period. This is the HARD all-4 the mission mandates (AP-14).
    if (predPhantomBomAll4(input)) {
      // the phantom-bom family's OWN evidence (its 4 suggestives fire → pos 4;
      // the type-1 use-exemptor → neg 3) — the confidence is the fortress's,
      // never the argmax's (the mom substitute could otherwise inflate it).
      const ph = scoreFamily(phantomBomFamily, input);
      const evidence = classifyByFamilies(zoneClassificationLexicon.families, input);
      // PHANTOM ∧ DEATH_TYPE1 → DEATH (the operator's boolean algebra): the
      // type-1 virgin MoM's full signature stands — never a silent exemption.
      if (predType1Signature(input)) {
        return {
          ...evidence, intent: 'DEATH', action: 'reject',
          pos: ph.pos, neg: ph.neg, confidence: confidenceOf(ph.pos, ph.neg),
        };
      }
      // PHANTOM ∧ ¬DEATH_TYPE1 → FORTRESS (the exemption is REAL).
      return {
        ...evidence, intent: 'PHANTOM_BOM', action: 'classify',
        pos: ph.pos, neg: ph.neg, confidence: confidenceOf(ph.pos, ph.neg),
      };
    }
    // The all-4 fails → the phantom family is DEAD (the type-1 virgin MoM's
    // full signature → DEATH always). The remaining families classify normally.
    const base = classifyByFamilies(zoneClassificationLexicon.families, input);
    if (base.intent === 'PHANTOM_BOM') {
      return { ...base, intent: 'DEATH', action: 'reject' };
    }
    // THE CONSERVATIVE DEATH DEFAULT (the operator's Q3 answer — the mission's
    // "3-of-4 → DEATH"): a 1H/30m VIRGIN MoM whose phantom all-4 fails is NOT
    // exempted — the virgin-MoM death rule STANDS (the type-2 that could not
    // prove the fortress). The 4H zones are NEVER death zones (the operator:
    // "ALL 4H zones WILL have at least 1 reaction before mitigation") — the
    // tf-hierarchy exemptor. The BoM (prior OPPOSITE/NONE) is not a death zone.
    if (
      input.zoneClassification === 'MoM' &&
      (input.reactionCount ?? 0) === 0 &&
      (tfOfZone(input) === '1H' || tfOfZone(input) === '30m') &&
      input.priorMove === 'SAME'
    ) {
      return { ...base, intent: 'DEATH', action: 'reject' };
    }
    return base;
  },
  enforce(result: LexiconResult, phase: 'A' | 'B'): void {
    if (phase === 'A') {
      // Phase A — the boundary THROW: a phantom-BoM-classified zone that the
      // virgin-MoM death rule would reject → the death-rule exemption demand.
      if (result.intent === 'PHANTOM_BOM') {
        throw new Error(
          `[ZONE-CLASSIFICATION PHASE-A] PHANTOM-BoM classified (all-4 holds — ` +
          `pos ${result.pos} / neg ${result.neg}) but the virgin-MoM death rule ` +
          `rejects it — the death-rule exemption demand (the operator's fortress). ` +
          `Escape: ${zoneClassificationLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    // Phase B — the PHANTOM_BOM flag appended to the zone's classification (the
    // E1 pool + the E3's demand pick read it).
    result.demand = result.intent === 'PHANTOM_BOM'
      ? `zone-classification: PHANTOM_BOM (the fortress — the all-4 holds, conf ${result.confidence.toFixed(3)})`
      : `zone-classification: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};

/** The phantom-BoM exemption predicate — the all-4 hard conjunction, exposed
 *  for the E2 death-rule exemption (shape-brain.ts:1150) + the diag fixture. */
export function isPhantomBoM(input: LexiconData): boolean {
  const r = zoneClassificationLexicon.classify(input);
  return r.intent === 'PHANTOM_BOM' && r.action === 'classify';
}
