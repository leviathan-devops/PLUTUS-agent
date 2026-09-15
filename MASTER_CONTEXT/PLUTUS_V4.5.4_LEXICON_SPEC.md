# PLUTUS v4.5.4 — THE SIX LEXICON SPEC (the OHLC-Intelligence-Lexicon design)

**Author:** the orchestrator (the operator's design authority) · **Date:** 2026-08-06
**Foundation:** the IntelligenceLexicon-Edition-v1.0 architecture (the MachineRule/PatternFamily/semantic-scoring/two-phase-enforcement) + the MPSE math-logic + the LMV/OBCV data contracts + the operator's doctrine (the phantom BoM, the fractal chains, the recency law).
**The operator's law:** "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs" — the lexicons are the SEMANTIC INTENT layer between the mechanical detection (the regex) and the algorithmic systems (the shape chains).

## THE MACHINE FORM (every lexicon registers as an IntelligenceLexicon machine)

```typescript
interface TradingLexiconRule {
  id: 'candle-pressure' | 'candle-shape' | 'zone-classification' | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
  families: TradingPatternFamily[];
  classify(input: LexiconInput): LexiconResult;   // {intent, confidence, action: 'classify'|'reject'|'escalate'}
  enforce(result: LexiconResult, phase: 'A' | 'B'): void;
  // Phase A = the E1/E2/E3 boundary THROW (a hard violation — e.g. the phantom-BoM reversal)
  // Phase B = the OUTPUT MUTATION (the classification demand appended to the pipeline stage's output)
  escapeHatchTool: string;   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: number; // 3 — three rejected classifications → the problem-solving dispatch
}

interface TradingPatternFamily {
  group: 'candle-predicate' | 'zone-predicate' | 'chain-predicate' | 'projection-predicate';
  descriptive: Predicate[];   // the EVIDENCE AGAINST the semantic intent (neg weight +1)
  suggestive: Predicate[];    // the EVIDENCE FOR the semantic intent (pos weight +1, some +2)
  substitute?: Predicate[];   // the MISLEADING SURFACE patterns (pos +2 — the "regex without the psychology"!)
  use?: Predicate[];          // the LEGITIMATE EXEMPTORS (neg +3 — short-circuit: the classification is REAL)
}
// Predicate = a deterministic function over the OHLC/zone data: (data: LexiconData) => boolean
// The confidence = pos/(pos+neg+1) · the decision = pos > neg ? 'classify' : 'reject'
// The MPSE law: every predicate is a deterministic expression (a numeric comparison / a set membership / a piecewise branch) — fuzzy prose is the derailment (the Losslessness Theorem).
```

---

# LEXICON 1 — CANDLE-PRESSURE-LEXICON (the per-candle battle semantics)

## THE PURPOSE
Decode WHO won each battle from the candle's wick/body/close anatomy — the defend/reject/sweep/dwell state that feeds the zone's pressure lifecycle. The operator's doctrine: "the rendered artifacts are the candles... you must see what GENERATED the rendered artifact" — the candle is the TRIGGER; the pressure state is the GENERATOR.

## THE INPUTS (the existing foundation — NEVER re-derived)
- The OHLC bar (the 1H window) · the widened bucket [lo−ε, hi+ε] · the ATR14 · the approach direction (fromAbove/fromBelow/dwell) · the run anchor (the temporal gate).

## THE OUTPUTS
- The touch kind: SWEEP / WICK_REJECT / BODY_DEFEND / CONSOL_DWELL / PASS_THROUGH (the existing classifyTouch — lqz-matrix.ts:196-241 — the piecewise-TOTAL predicate).
- The battle side vote (the lmv.ts side-vote input — the 3-day window!) · the wick-mass · the defended-edge · the consumption event (the SWEEP = the reactionCount!).

## THE E1/E2/E3 POSITION
Feeds the LMV side vote (lmv.ts:618-645) + the zone-pressure-lexicon's lifecycle transitions (the consumption = the SWEEP — lqz-matrix.ts:606-608).

## THE FAMILIES (the PatternFamily entries)

| Family | suggestive (FOR the intent) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **defend** — the body defended the level | the body closed against the approach + the next bar turned ≥ max(2p, 0.5×ATR) against (the BODY_DEFEND predicate — the defended-edge accumulator!) | the body closed THROUGH the level (no defense) | the wick touched the band (a touch ≠ a defense!) | the PASS_THROUGH (the traversal — excluded, the anti-noise gate) |
| **reject** — the wick rejected the level | the WICK_REJECT predicate: a ≥2p wick INTO the band + the body reversed + retreated to the approach side (lqz-matrix.ts:227-231) → the side vote SELL (fromAbove) / BUY (fromBelow) | the wick crossed the ENTIRE band (a sweep, not a reject!) | the long-wick candle WITHOUT the body reversal (the wick ≠ the rejection) | the sweep-with-close-back (the consumption, not the rejection) |
| **sweep** — the level was consumed | the SWEEP predicate: the wick crossed the ENTIRE bucket ≥2p AND the body closed back (lqz-matrix.ts:221-222) → the reactionCount += 1 (the consumption!) | the wick stopped short of the far edge (a partial probe) | the deep-wick-close-through (a break, not a sweep) | the WICK_REJECT (the reversal — the liquidity was NOT taken) |
| **dwell** — the level was occupied, not attacked | the CONSOL_DWELL predicate: ≥3 consecutive bars intersecting, span ≤ 2 bucket widths (lqz-matrix.ts:239) | the bars crossing the band (an attack) | the single-bar touch (a touch ≠ a dwell) | the ≥3-reaction count (the battle's ammunition exhausted → the depletion feed) |
| **pass** — the level was traversed | the PASS_THROUGH (the traversal without a reaction — the anti-noise!) | a reaction kind (a touch) | — | — |

## THE SCORING + THE DECISION
For each candle: score the families over the 3-day window (the recency law!); the winning intent = the touch kind; the confidence = pos/(pos+neg+1); the zero-window fallback = the spot-relative side (the lmv.ts existing final else).

## THE ENFORCEMENT
Phase A: a candle classified as PASS_THROUGH that the LMV counts as a reaction → THROW at the lmv.ts boundary (the piecewise-TOTAL violation). Phase B: the touch-kind demand appended to the LMV table's row (the audit trail).

## THE ESCAPE + THE ESCALATION
escapeHatch = the probe-vote-window · escalation = 3 misclassifications → the zone-pressure-lexicon's problem-solving dispatch.

## THE MPSE FORM
The piecewise-total predicate (the classifyTouch — the exhaustiveness invariant: ∀ candle: exactly one piece) + the recurrence (the reactionCountₙ₊₁ = reactionCountₙ + [sweep]) + the wick-mass sums (the linear combination).

---

# LEXICON 2 — CANDLE-SHAPE-LEXICON (the per-candle shape signatures)

## THE PURPOSE
The impulse/reversal/consolidation candle signatures that feed the E2 shape classification — the SS/BS/R/WL/RWL/WLS anatomy. The shape is the CANDLE-LEVEL grammar; the chain (Lexicon 5) is the SENTENCE.

## THE INPUTS
The candle anatomy tokens (the L2-spec:861-864): body_fraction (bf), body_to_wick, wick_ratio, total_range_ratio, color_consistency, candle_progression, retracement_size — over the 3-day window.

## THE OUTPUTS
The shape code (SS/BS/R/WL/RWL/WLS/PBS) + the confidence — the input to the E2's identifyCurrentShape/classifyShape (shape-brain.ts:331/890).

## THE E1/E2/E3 POSITION
Feeds the E2's per-day shape classification — the unified macro authority (the DXY's chain for the EU, the EU core's for the GU!).

## THE FAMILIES (the canon anatomy — Bible 4.5 §14 + the TTE shape zones)

| Family | suggestive (FOR) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **ss** — the scalp/consolidation | bf 0.10-0.30 · range 0.2-0.5× context · the alternating colors · BOTH bounding zones' zfp < 30% (shape-brain.ts:905-907) | a directional thrust (bf > 0.6) | the narrow-range candle in a trend (the range ≠ the consolidation!) | the WLS signature (the 14-15+ candle storm — the ss-lookalike that is a WLS!) |
| **bs** — the breakout surge | the thrust bf 0.65-0.95 · minimal wicks < 0.2 · the PROGRESSION small→MASSIVE · the retracements < 30% · the bounding zone's zfp > 45% (shape-brain.ts:909-915) | the moderate bf (0.30-0.60 — a recovery, not a breakout!) | the single big candle (one candle ≠ a BS — the BS is the PROGRESSION!) | the R/RWL's big-candle open (the reversal's first candle) |
| **wl** — the whiplash | 3 same-color candles · the long wicks ~1× the body (the grab→momentum→grab — TTE:177-179) | the sustained momentum (a BS!) | the BS's middle candles (the whiplash-lookalike!) | the RWL (the instant reversal — no recovery period!) |
| **rwl** — the reversal whiplash | 6+ candles · bf 0.30-0.50 · the mixed reverse-dominant | the one-directional thrust | — | the WL-then-R sequence (the two-shape composite) |
| **r** — the recovery | 6-24 candles · bf 0.40-0.60 · the V-shape | the impulsive move (a BS!) | the WLS's recovery leg | — |
| **wls** — the whiplash storm | 14-15+ candles · the both-side wicks · 3+ moderate-zfp zones in a narrow band (shape-brain.ts:393-422) | the clean consolidation (a SS!) | the SS with the wide range (the storm-lookalike!) | the SS (when the zone-spread < the WLS threshold) |

## THE SCORING + THE DECISION
The shape = argmax over the families' pos−neg scores; the confidence = pos/(pos+neg+1); the tie → the zone-interaction classifyShape (the E2's existing refinement).

## THE ENFORCEMENT
Phase A: a day whose shape the candle-shape lexicon classifies as BS but the E2 classifies as PBS (the divergence!) → THROW at the E2 boundary (the unified macro check). Phase B: the shape demand appended to the E2's day decomposition.

## THE MPSE FORM
The piecewise-total classifier (the shape = the piece over the anatomy-token space — the exhaustiveness invariant) + the linear combination (the shapeScore = Σ wᵢ×tokenᵢ).

---

# LEXICON 3 — ZONE-CLASSIFICATION-LEXICON (the zone-identity semantics + THE PHANTOM BoM)

## THE PURPOSE
The BoM/MoM/IP/LSZ identity + the PHANTOM BoM — the operator's fortress-zone concept: a type-2 virgin MoM that FUNCTIONS as a BoM. THE most important lexicon of the six — the virgin-MoM death rule (shape-brain.ts:2330-2336) is the blanket regex that rejected the operator's #2 demand and caused the EU LONG's Δ19.4p miss.

## THE INPUTS
The ObZone (obcv.ts:45-59: id/type/top/bottom/classification/formationMs/originIdx/bw/bf/prior/parent/zfp) + the prior-move classifier output (NONE/OPPOSITE/SAME) + the width-gate verdict + the macro-origin element (the containing 4H structure!) + the mid-swing position (the zone's formation position relative to the current swing leg!).

## THE OUTPUTS
The classification: BoM / MoM / IP / LSZ / REJECT + the PHANTOM_BOM flag + the DEATH_ZONE flag (the type-1 virgin MoM) — the inputs to the E1's isDemandZone/isSupplyZone + the E2's death-rule exemption.

## THE E1/E2/E3 POSITION
Feeds the E1's zone pool typing (the isDemandZone/isSupplyZone filters!) + the E2's virgin-MoM death-rule decision (the phantom-BoM exemption!) + the E3's demand-pick weight (the fortress pressure!).

## THE FAMILIES

| Family | suggestive (FOR) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **bom** — the true BoM | prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate (obcv.ts:597-610) | prior == SAME (the continuation — a MoM!) | the wide-OB in the middle of the move (the width alone ≠ a BoM — the prior matters!) | the REJECT (the totality: every origin → exactly one of {BoM, MoM, REJECT}) |
| **mom** — the true MoM | prior == SAME ∧ validOrigin ∧ widthGate | prior ∈ {NONE, OPPOSITE} (the reversal origin — a BoM!) | the phantom BoM (the type-2 virgin MoM — the MoM-label that FUNCTIONS as a BoM!) | the REJECT |
| **phantom-bom** — THE FORTRESS (the operator's concept!) | the LARGE-OB width predicate (the SMC ratio-based width — the OB's size is a function of the move it precedes!) ∧ the mid-swing-recovery + the FAKEOUT predicate (the formation at the base of a recovery whose candles TEMPORARILY broke the swing structure — the "fake RWL" / correction fakeout — the operator verbatim: "clearly breaks (temporarily for only a couple of candles) the actual swing move structure") ∧ the PRE-FORMATION opposing-BoM reaction predicate (the correction INSTANTLY reacted to an opposing UM BoM structure BEFORE forming the big OB — the operator verbatim: "this correction instantly reacts to before forming the big OB") ∧ the macro-origin continuation (the KCE-Telescoping: the move completes the FULL swing from the macro origin element!) | the small-OB width ∧ the mid-uninterrupted-move position (the type-1 signature!) | the virgin-MoM label ALONE (the surface — "it's a MoM so it's a death zone" = the regex without the psychology — THE derailment!) | the type-1 virgin MoM's FULL signature (the small OB + the uninterrupted BS/WL + the mid-move → the DEATH ZONE stands!) |
| **fortress-bom** — the PROVEN BoM (the operator's Q2 correction!) | the plain BoM that has held the mitigations — "has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone and NOT get pierced" (the #8 — the 1H Refined 4H supply [1.14475-1.14625] anchored to the Jun 22 OB!) | the phantom BoM (the type-2 virgin — a DIFFERENT category — the fortress BoM is a VISIBLE obvious BoM, never disguised!) | the depletion (the 3+ mitigations ≠ the fortress — the FORTRESS needs the STRONG holds!) | the broken (the pierced with a battle!) |
| **ip** — the IP zone | the 9-pillar confluence (source='PILLAR') | a canonical S/D origin | — | — |

## THE SCORING + THE DECISION
The classification = the highest-scoring family; the PHANTOM_BOM intent fires when the suggestive (the width + the position + the reaction + the continuation) > the descriptive (the type-1 signature); the confidence = pos/(pos+neg+1). The DEATH_ZONE flag = the type-1 signature's use-exemptor (the negative short-circuit).

## THE ENFORCEMENT
Phase A: a phantom-BoM-classified zone that the E2's virgin-MoM rule rejects → THROW at the E2 boundary (the death-rule exemption demand). Phase B: the PHANTOM_BOM flag appended to the zone's classification (the E1 pool + the E3's demand pick read it).

## THE ESCAPE + THE ESCALATION
escapeHatch = the probe-resting-side · escalation = 3 rejected phantom-BoM classifications → the problem-solving dispatch.

## THE MPSE FORM
The set theory (the phantom-BoM membership test: zone ∈ {the LARGE-OB set} ∩ {the recovery-base set} ∩ {the opposing-BoM-reaction set}) + the boolean algebra (the exemption: PHANTOM ∧ DEATH_TYPE1 → DEATH; PHANTOM ∧ ¬DEATH_TYPE1 → FORTRESS) + the Losslessness (every predicate is deterministic — the operator's exact criteria from the #2 analysis!).

---

# LEXICON 4 — ZONE-PRESSURE-LEXICON (the zone-pressure lifecycle semantics)

## THE PURPOSE
The lifecycle/mitigation/freshness states + the fortress detection + the operator's doctrine: "zones usually fail on the THIRD mitigation" + the fortress "not pierced or broken in 4 prior mitigations... likely to become a fortress zone and NOT get pierced" (#8).

## THE INPUTS
The reactionEvents (the battle counts — the SWEEP consumption events!) + the freshness state (freshness.ts: the FRESH→TESTED→DEPLETED|VIOLATED machine) + the absorption state + the liquidity links (the nested/shield rungs).

## THE OUTPUTS
The lifecycle state: VIRGIN / ACTIVE-1 / ACTIVE-2 / DEPLETED / FORTRESS / BROKEN (E1/E2/E3-MACRO:551-562) + the ZFP + the absorption + the FORTRESS flag.

## THE E1/E2/E3 POSITION
Feeds the E2's pressure-aware designation (the pressureScore: +40 VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS, ZR7-spec:991-992!) + the E3's SL-relevance switch (the operative defense — the SHIELD_FUEL vs the PRESSURE_STRUCTURE!).

## THE FAMILIES

| Family | suggestive (FOR) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **virgin** — the untested zone | reactionCount = 0 ∧ the type = BoM (the ENTRY-PRIMARY +40!) | the type = MoM (the DEATH ZONE — the E2-5 reject — the PHANTOM_BOM exemption from Lexicon 3!) | the zero-touch with the wide band (no reaction ≠ virgin — the formation's own candles!) | the phantom BoM (the type-2 — the fortress — the virgin-MoM exemption!) |
| **virgin-death-scope** — THE REFINED DEATH RULE (the operator's Q3 answer!) | the death rule applies to the 30m virgin MoM zones + the 1H TYPE-1 virgin MoMs — the operator verbatim: "the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and 1H type 1 virgin MoMs" | the 4H virgin MoMs — the operator verbatim: "ALL 4H zones WILL have at least 1 reaction before mitigation so even though this is MoM on the 4H it is still a valid reaction point" — the 4H zones are NEVER death zones! | the 1H phantom BoM (the type-2 — the exemption!) | — |
| **tf-hierarchy** — THE KING/GENERAL/CAPTAIN (the operator's Q3/Q4 answers!) | 4H = the King (the E2 shape chain — the war strategy!) · 1H = the General (the E3 trade setups — the battles!) · 30m = the Captain (the per-trade context within the 1H-mapped E3 constraints!) — the pressure mechanics SET by the HTF, CASCADED DOWN to the LTFs — "HTF > LTF" | the equal-weight readings (the LTF overruling the HTF!) | the single-TF static reading (the charts require the multi-TF analysis — the telescoping!) | the 4H zones (the King's structures — the ≥1 reaction guaranteed!) |

| **active** — the tested zone | reactionCount ∈ {1, 2} → the ~80% / ~50% reaction rates | reactionCount = 0 (virgin!) | the consolidation dwells (the occupied ≠ tested!) | the ≥3 count (depleted!) |
| **depleted** — the failing zone | reactionCount ≥ 3 → the TP-target-ONLY — "zones usually fail on the THIRD mitigation" (the operator verbatim — #4!) | the strong reactionCount 1-2 | — | the FORTRESS (the 4+ holds with the STRONG reactions!) |
| **fortress** — the zone that holds | 4+ holds with the STRONG reactions → the phase transition Fire→Earth — the 95% direction flip (E1/E2/E3-MACRO:165-167) — "has not been pierced or broken in 4 prior mitigations" (#8!) | the weak mitigations (the "barely touching the close edge" — the #8's mitigations 3+4!) | the depleted-label (the 4 touches ≠ the 4 strong holds!) | the broken (the pierced with a battle!) |
| **broken** — the violated zone | the pierce with a battle → VIOLATED — the role reversal (the broken support = the new resistance!) | the gap-through (the gap ≠ a battle — the pierce requires the battle, freshness.ts!) | the wick-through (the sweep ≠ the break!) | — |

## THE SCORING + THE DECISION
The lifecycle = the recurrence state (stateₙ₊₁ = f(stateₙ, the touch event)); the FORTRESS flag = the 4+ strong holds; the ZFP = the state's ladder (the existing zfpFromState!).

## THE ENFORCEMENT
Phase A: a DEPLETED zone that the E2's designation treats as the ENTRY-PRIMARY → THROW (the TP-target-ONLY rule!). Phase B: the lifecycle demand appended to the zone's pressure state.

## THE MPSE FORM
The recurrence relation (stateₙ₊₁ = f(stateₙ, touchEventₙ)) + the inequalities (reactionCount ≥ 3 → TP-only; ≥ 4 strong → FORTRESS) + the linear combination (the pressureScore = Σ weights).

---

# LEXICON 5 — SHAPE-CHAIN-LEXICON (the fractal chain semantics + the unified macro authority)

## THE PURPOSE
The chain semantics — the operator's fractal doctrine: "everything is fractal... BS/R/WL --> WLS --> SS (micro, 30m) and BS/R/WL --> SS (macro, 4H). Both are valid." + the unified macro authority (the operator's law: "they ARE allowed to have their own mechanics but unified macro signal has authority" — the GU Monday R divergence!).

## THE INPUTS
The per-day shapes (the E2's decomposition!) + the contested zone's pressure state + the ZFP-conditioned transition matrix (shape-brain.ts:874-888) + the chain state (the prior days' shapes).

## THE OUTPUTS
The chain (max 5 — the day decomposition) + the UNIFIED MACRO AUTHORITY (the authoritative shape per day across the 3 pairs!) + the fractal-validity flags (the micro/macro both-valid!).

## THE E1/E2/E3 POSITION
Feeds the E2's buildDayDecomposition (the unified authority override!) + the E3's forward projection (the chain's next step!).

## THE FAMILIES

| Family | suggestive (FOR) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **ss-to-bs** | the marubozu breakout (3-5× the SS body, bf > 0.65, minimal wicks) → BS · the ZFP-conditioned: SS + the bounding zone > 45% → BS (shape-brain.ts:880) | the exhaustion pin bar (the R!) | the BS's single candle (one candle ≠ the chain step!) | the SS (when the bounding zfp < 30%) |
| **bs-to-r** | the exhaustion pin bar → R · BS + the target 20-40% → R (shape-brain.ts:877) | the hard wall (the RWL!) | — | — |
| **bs-to-rwl** | the shooting star / engulfing at the top → RWL · BS + the target < 20% → RWL (the hard wall!) | the moderate retrace (the R!) | — | — |
| **r-to-wl** | the long-wick liquidity grab at the recovery extreme → WL | the continuation (the BS!) | — | — |
| **wl-to-ss** | the IMMEDIATE consolidation after the lash → SS | the further lash (the RWL!) | — | — |
| **micro-vs-macro** — THE FRACTAL | the SAME chain valid at the 30m micro AND the 4H macro — both valid (the operator's fractal doctrine!) | the chains contradicting (the micro and the macro disagree!) | the micro-only reading (the 30m precision ≠ the 4H macro!) | the unified macro authority (the DXY's chain for the EU, the EU core's for the GU — the divergence = the per-pair mechanics WITHOUT the macro override!) |

## THE SCORING + THE DECISION
The chain = the recurrence (nextShape = predictNextShapePressureAware — the S1 transitions!); the UNIFIED MACRO AUTHORITY = the source chain's shape for the day (the DXY's SS = the EU's SS = the GU's SS!) — the per-pair divergence (the GU Monday R vs the DXY/EU SS) = the AUTHORITY OVERRIDE fires (the GU Monday becomes the SS — the operator's WL LONG becomes possible!).

## THE ENFORCEMENT
Phase A: a day whose per-pair shape diverges from the macro authority without a documented per-pair mechanic → THROW at the E2 boundary (the divergence is the bug!). Phase B: the authority-override demand appended to the day decomposition.

## THE MPSE FORM
The recurrence relation (the chain) + the composition operator (g∘f over the day decomposition — the fractal layers!) + the set membership (the shape ∈ the chain's domain).

---

# LEXICON 6 — OBVIOUS-TRADES-LEXICON (the forward-reasoning semantics — THE MISSING LAYER)

## THE PURPOSE
The forward-reasoning baseline — the operator's #1/#2 logic: "the short is halfway to the demand — the TP is AT the demand — the demand's pressure will react — the LONG from its internal liquidity." The reasoning-token baseline = the operator's EU analyses in the golden doc — VERBATIM. THIS lexicon is the agent-in-the-loop reasoning chain's deterministic core.

## THE INPUTS
The E1 zone map (the pressure state per zone!) + the E2 storyline (the day shapes + the chain!) + the trade-chaining state (the TP of N = the entry of N+1 — Law 27!) + the price's CURRENT POSITION relative to the designations (the "halfway to the demand" predicate!).

## THE OUTPUTS
The trade projections + the E/SL/TP anchors + the confidence — the reasoning chain's output schema (the TradeProjection interface — Section 6 of the synthesis!).

## THE E1/E2/E3 POSITION
Feeds the E3's forward-projection reasoning chain — THE MISSING LAYER the overhaul adds. The E2 projects the shape chain; this lexicon projects the TRADES.

## THE FAMILIES (the reasoning tokens — the operator's golden-doc analysis as the baseline!)

| Family | suggestive (FOR the trade) | descriptive (AGAINST) | substitute (the surface trap) | use (the exemptor) |
|---|---|---|---|---|
| **zone-identification** — the trade's zone | the E1 designated zone with the pressure read: "the 1H Unmitigated MoM Demand zone at 1.14145 - 1.14000 from Thursday's Breakout Surge" (the #2!) | the zone without the pressure context (the bare level!) | the label alone ("a demand zone" — the regex without the psychology!) | the PHANTOM_BOM flag (the fortress — the strongest!) |
| **pressure-mechanics** — the zone's reaction certainty | "This is clearly an area of strong pressure + bullish liquidity... the opposing bearish pressure is not yet strong enough to pierce it" (the #2!) | the contested zone (the WLS — the #6's "HEAVILY CONTESTING all breaks"!) | the zfp alone (the number without the lifecycle!) | the fortress (the 4+ strong holds!) |
| **shape-chain-context** — the chain's position | "This follows the shape chain forming of SS → BS" (the #2!) — the chain's next step = the trade's direction! | the chain's conflicting step (the divergence!) | the single-day shape (the chain ≠ the day!) | the unified macro authority |
| **forward-position** — THE MISSING PREDICATE | the price's CURRENT position between the shape's start and its designated target: "the short is halfway to the demand" (the operator's directive!) — the price is N pips from the designated zone with the move's momentum toward it | the price moving AWAY from the designation (the rejection!) | the price AT the zone (the reaction already happened!) | the zone's reaction state (the virgin/fortress = the reaction probability!) |
| **anchor-construction** — the E/SL/TP | "Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110 - 1.14020, and set TP at the near edge of the supply zone" (the #2 — THE reasoning token!) — the chaining (the TP of N = the entry of N+1!) + the SL ladder-steps rule (3p-outside-back-edge / 1-2p-inside-close-edge!) + the TP strength-driven edge (the virgin MoM's far edge / the fortress's far edge / the hard wall!) | the anchors without the zone geometry (the fabricated levels!) | the rounded levels (the "nice number" — the regex without the structure!) | the RRR gate (|TP−E|/|E−SL| ≥ 2.5 — the consequence, not the input!) |
| **validation** — the confluence check | "all the macro storyline confluences align" (the #2!) — the E1 pressure + the E2 chain + the E3 geometry ALL agree | any layer contradicts (the divergence!) | the single-confluence agreement (one signal ≠ the alignment!) | the break-validation (the #6's "this ZONE has not yet been broken" — the E1 pressure validates the structure break!) |
| **strength-comparison** — the opposing force | "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday" (the #6!) — the comparative impulse strengths | the equal strengths (the WLS!) | — | — |
| **reaction-count-state** — the mitigation math | "zones usually fail on the THIRD mitigation" (#4!) · "has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone and NOT get pierced" (#8!) | the fresh zone (the virgin — the FIRST test!) | the touch count (the touches ≠ the mitigations!) | the FORTRESS (the #8's exemption — the 5th mitigation predicted to hold!) |

## THE SCORING + THE DECISION
The trade projection fires when the families' aggregate pos > neg — the confidence = pos/(pos+neg+1); the RRR gate (≥ 2.5) as the FINAL filter (the consequence!). The output = the TradeProjection (the E/SL/TP as CHECKABLE numbers + the pressure read + the chain context + the validation signals).

## THE ENFORCEMENT
Phase A: a trade projection whose E/SL/TP are not traceable to a specific E1 zone + the E2 projection → THROW (the E3-NEVER rule — never a fabricated level!). Phase B: the projection demand appended to the E3's setup output (the audit trail).

## THE ESCAPE + THE ESCALATION
escapeHatch = the diag-monday harness · escalation = 3 rejected projections → the problem-solving dispatch (the operator's reasoning-chain retry!).

## THE MPSE FORM
The forward-reasoning state machine (the E3's read → project → anchor → validate sequence!) + the inequalities (the RRR gate! the N-pips-from-zone predicate!) + the logical implication (the chain step → the trade direction!).

---

# THE REASONING-CHAIN CONTRACT (the agent-in-the-loop — what the lexicons feed)

**The operator's law:** "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference."

## THE CHAIN (the token sequence — from the golden doc's #1/#2/#4/#6 + the E1/E2/E3-MACRO Parts 22-24)
1. **ZONE IDENTIFICATION** — the E1 zone + the pressure read (Lexicon 1+3+4 outputs!).
2. **PRESSURE-STATUS READ** — the lifecycle/zfp/fortress/absorption (Lexicon 4!).
3. **LIQUIDITY READ** — the nested LQZ + the shield rungs (the LMV table!).
4. **BREAK-VALIDATION** — the E1 pressure validates the structure break (the #6's "this ZONE has not yet been broken"!).
5. **STRENGTH COMPARISON** — the opposing impulses (the #6's "extremely weak compared to"!).
6. **REACTION-COUNT STATE** — the mitigation math (the #4's "third mitigation" + the #8's fortress!).
7. **THE CHAIN PROGRESS** — the shape chain's position (Lexicon 5!).
8. **THE FORWARD PROJECTION** — the price's position relative to the designation + the reaction probability (Lexicon 6's forward-position!).
9. **THE CHAINING** — the TP of N = the entry of N+1 (Law 27!).
10. **THE ANCHOR CONSTRUCTION** — the E/SL/TP (the checkable numbers!).
11. **THE VALIDATION** — the confluence alignment (Lexicon 6's validation!).

## THE OUTPUT (the TradeProjection — data, never prose)
```typescript
interface TradeProjection {
  pair: string; day: string; shape: ShapeCode; direction: 'LONG' | 'SHORT';
  entryZoneId: string; entryLqzId: string;
  E: number; SL: number; TP: number; RRR: number;   // the checkable anchors!
  pressureRead: ZonePressureState;                   // the lifecycle/zfp/fortress/absorption
  chainContext: string;                              // the shape-chain position
  validation: ValidationSignal;                      // the break-validation + the strength + the confluence
  confidence: number;                                // pos/(pos+neg+1)
}
```

## THE PIPELINE POSITION (the agent-in-the-loop)
- The E1 computes the zones (the lexicons 1+3+4 enrich them!).
- The E2 computes the shape chain (the lexicons 2+5 + the unified macro authority!).
- **THE REASONING CHAIN (NEW — the agent-in-the-loop)**: reads the E1/E2 outputs + the lexicons' classifications → runs the 11-token sequence → produces the TradeProjections → VALIDATES + REFINES/RETRIES the E2 (the forward projection vs the E2's chain!) BEFORE the E3.
- The E3 resolves the projections' entries (the anchors already constructed!).
- The cascade on top (the DXY's projections + the pair-native!).
- The harness validates (the diag-monday + the day-end fast-forward!).

*END OF THE SIX LEXICON SPEC — the design authority: the operator. The foundations: the LMV/OBCV data contracts (the regex layer). The semantic layer: these six lexicons. The algorithmic systems: the E1/E2/E3 with the reasoning chain. The doctrine: QUOTED, never synthesized.*
