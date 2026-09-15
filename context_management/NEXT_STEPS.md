# NEXT STEPS — PLUTUS v4.5.2 (2026-08-04 — THE ZR OVERHAUL PLAN)

## 0. THE VERIFIED SHAs (the deployment fingerprint)

```
dist/index.js      9c0c21ee0eafe5ebca9cd9090ec2c1a8d648d4161ab9c3ba5553cb5e1238f825  (1.29MB, 145 modules)
report_v452.md     3b2e011d3e99b3919a3fb56d87e01912be0f823d1e8159692298ccc89f041c7a  (×2 — determinism)
src/mdve/sl-lmv.ts  912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab  (FROZEN)
src/mdve/trade-dedup.ts 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4  (FROZEN)
```

---


**Authority:** `MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md` (1004L — the operator's 2026-08-04 teaching session — the fundamental law E1+E2=E3) + `MASTER_CONTEXT/NON_NEGOTIABLE_ORCHESTRATOR_PRINCIPLES.md` (501L — the audit discipline) + `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md` (the new oracle).
**Current:** the DXY golden map 6/6 + all-winning (7W/0L +26.03R) · the EU first win (+3.18R) · golden 7/22 (OLD Tier-D) · 11/11 gates green · determinism 3b2e011d ×2 · dist 9c0c21ee · frozen pair intact.
**Next:** **WAVE ZR-1 — the zone-relevance engine** → ZR-2 → ZR-3 → ZR-4 → ZR-5.
**Metric:** the EU/GU at the operator's REAL levels at ≤3p (the new oracle) · the RRR ≥ 3.0 floor / 4R+ target · the DXY 6/6 + all-winning held · determinism ×2 after EVERY change.

---

## THE ROOT CONCEPT (the operator's fundamental law — read FIRST before any code)

**E1 + E2 done properly → E3 is a natural result** — a classification + precision-alignment engine of the E1+E2 data. 90% of the work is E1 + E2. E3 NEVER overrides the pre-existing E1/E2 data architecture, NEVER fabricates its own rules — every anchor traces to an E1 zone + an E2 projection. The E1 pressure mechanics (the zones' pressure state) PROVIDES THE STRUCTURE; the E2 storyline (the narrative on the E1 pressure) BUILDS ON E1; the E3 classification + precision alignment MUST FIT WITHIN E1+E2's constraints.

**THE FULL DOCTRINE:** `MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md` (1004L) — READ IN FULL before Wave ZR-1.

---

## WAVE ZR-1 — THE ZONE-RELEVANCE ENGINE (the E1 pressure state per trade)

**Objective:** the operative defense for any trade computed from the CURRENT pressure state of the zones — not a static role. The E1 zones track the FULL pressure state (the confluence/ZFP/BoM-MoM/reaction-count/absorption) and the operative defense for any trade is chosen from it.

**Modules (files, done-when):**

| # | File | Change | Done-when |
|---|------|--------|-----------|
| ZR-1.1 | `src/mdve/` (the zone types + the map) | The zones carry the FULL pressure state (the confluence from the 6D, the ZFP from the step function, the BoM/MoM, the reaction count, the absorption state) — the absorption tracking (which shields the candles have eaten) | the zone's pressure state is complete (the absorption tracked) |
| ZR-1.2 | `src/mdve/` (the liquidity shield) | The liquidity shield relation as a first-class structure: the LQZ in front of the S/D zone → the "final liquidity sweep before the piercing move" → the shield eaten → the S/D exposed | the shield-vs-zone relation modeled + the absorption state tracked |
| ZR-1.3 | `src/mdve/` (the operative defense) | The operative defense for any trade computed from the pressure state (the confluence/ZFP/BoM-MoM/reaction-count/absorption + the E2 pathway) — not a static role | the operative defense is a pressure-state function (verified with a probe: the trade #4's SL switching from the LQZ to the DEMAND zone as the demand's pressure absorbed) |

**Gate ZR-1 (diag-zone-relevance.ts, NEW):** the zones carry the full pressure state; the shield relation modeled; the operative defense computed from the pressure state; the trade #4's SL relevance switch verified; determinism ×2; the frozen pair untouched.

**Checkpoint:** `Checkpoints/v4.5.2_ZONE_RELEVANCE/`

## WAVE ZR-2 — THE STORYLINE ENGINE (the E2's narrative on the E1 pressure)

**Objective:** the E2 shape chain forms the STORYLINE — the macro narrative (the macro arc, the break-validation, the strength comparison, the warframe arc, the chain logic, the day decomposition) on top of the E1 pressure state.

**Modules:**

| # | File | Change | Done-when |
|---|------|--------|-----------|
| ZR-2.1 | `src/brains/shape-brain.ts` | The storyline's structure (Part 16 of the macro context): the current shape + the contested zone's pressure state + the projected next shape from the E1-pressure-driven transition + the break-validation + the strength comparison + the macro arc (the prior-week storyline) + the warframe arc | the storyline's full structure computed per day |
| ZR-2.2 | `src/brains/shape-brain.ts` | The reaction-count-conditioned transitions (the "3rd mitigation → fail"; the "4+ strong → fortress/RWL") + the break-of-structure validation (the E1 pressure validates the structure break BEFORE the E2 shape respects it) | the transitions driven by the reaction counts; the break-validation present |
| ZR-2.3 | `src/brains/shape-brain.ts` | The day decomposition (the day-local zone preference — the recency bias as a factor, the E2 pathway as the primary; the London-open anchor; the day-reachability — already partly built in A1.4/R1-b) | the day decomposition complete |

**Gate ZR-2 (diag-storyline.ts, NEW):** the storyline's full structure; the reaction-count transitions; the break-validation; the day decomposition; determinism ×2.

**Checkpoint:** `Checkpoints/v4.5.2_STORYLINE/`

## WAVE ZR-3 — THE E3 CONDITIONAL ANCHORS (the classification + precision alignment)

**Objective:** the E/SL/TP derive per-trade from the storyline + the pressure state: the E = the entry LQZ's near edge; the SL = the ladder-steps rule; the TP = the strength-driven edge.

**Modules:**

| # | File | Change | Done-when |
|---|------|--------|-----------|
| ZR-3.1 | `src/mdve/mirror.ts` | **The SL's ladder-steps rule:** 3p OUTSIDE the far edge of the current entry step OR 1-2p INSIDE the close edge of the NEXT STEP away (the opposite direction — SHORT → next step UP; LONG → next step DOWN) — the relevant zone chosen by the pressure state (the operative defense from ZR-1) | the SL at the ladder-steps rule; the zone-relevance switch (the trade #4's SL) verified |
| ZR-3.2 | `src/mdve/mirror.ts` | **The TP's strength-driven edge:** the STRONG zone → the CLOSE edge + the 1-2 pip spread; the WEAK zone → the FAR edge — the pressure from the E1 mechanics (the confluence/ZFP/BoM-MoM/reaction-count) | the TP at the strength-driven edge (verified vs the operator's real trades) |
| ZR-3.3 | `src/mdve/mirror.ts` | **The TP's E2-projected opposing zone resolved:** the demandZoneId/supplyZoneId resolved to the zone's internal LQZ (the full-model resolution — the OB-id-vs-LMV-candidates mismatch fixed) — the D37 #3 root cause | the TP = the E2's projected opposing zone (verified: the GU Mon's demand 1.33567 → the TP resolved, RRR 3.08) |
| ZR-3.4 | `src/mdve/mirror.ts` | **The TP's E1-pressure wall classification:** the Law-14 cap-walk's wall classification from the E1 pressure mechanics (the BoM/MoM + the 6D confluence + the Earth+Fire) — the shallow LQZ shelves (the candle-count zfp-20) are PASS-THROUGH — the D37 #1 root cause | the walk extends to the structurally-equivalent BoM wall (verified: the GU Mon's TP extends to 1.33360 — the golden GU-1's 1.33347 — RRR 4.7) |
| ZR-3.5 | `src/mdve/refinement-machine.ts` | **The per-anchor 3-attempt dynamic state machine:** per trade, 3 attempts per anchor (E, SL, TP), tracked + locked INDIVIDUALLY; the loop continues on the unlocked anchors until RRR passes or all 3 lock; every rejection gives WHY + HOW; the machine consumes the E1 pressure + the E2 storyline of the trade being refined | the state machine implemented; the rejection contexts present; the E1/E2-intelligent rejection |

**Gate ZR-3 (diag-e3-conditional.ts, NEW):** the SL at the ladder-steps rule; the TP at the strength-driven edge; the TP's E2-projected opposing zone resolved; the TP's E1-pressure wall classification; the per-anchor state machine; the RRR ≥ 3.0 for the GU mirrors; determinism ×2.

**Checkpoint:** `Checkpoints/v4.5.2_E3_CONDITIONAL/`

## WAVE ZR-4 — THE CASCADE (the storyline propagation)

**Objective:** the DXY→EU inverse + the EU→GU kept — the storyline propagates with the pair's own levels; the trade-chaining propagates.

**Modules:**

| # | File | Change | Done-when |
|---|------|--------|-----------|
| ZR-4.1 | `src/mdve/mirror.ts` | **The distribution fix:** the E2 exact-match registers its anchor into the usedAnchors set — the N distinct sources spread across the N E2-designated rungs — the pile-on-one-anchor collapse killed (the D37 #5) | the distribution works (the mirrors spread across the E2 designations) |
| ZR-4.2 | `src/mdve/` | **The trade-chaining propagation:** the TP of DXY trade N = the entry of DXY trade N+1 — the EU/GU mirrors chain identically (the EU #2's E = the EU #1's TP — the kept chaining) | the chaining propagates across the cascade |
| ZR-4.3 | `src/mdve/` | **The day-local zone preference:** the E2 designation for a day prefers the day-local structures (the Monday LQZ for Monday) when the E2 pathway passes through them — the recency bias as a factor | the designations prefer the day-local structures |

**Gate ZR-4:** the distribution works; the chaining propagates; the day-local preference; the GU lane recovers (the Mon-Wed mirrors at the operator's levels — RRR ≥ 3.0); determinism ×2.

**Checkpoint:** `Checkpoints/v4.5.2_CASCADE_PROPAGATED/`

## WAVE ZR-5 — THE NEW ORACLE + THE SELF-VALIDATION

**Objective:** the operator's real trades replace the Tier-D golden in the validation diag (the measurement target only — the TEMPORARY ARCHITECTURE label) + the machine self-validates via rules + logic.

**Modules:**

| # | File | Change | Done-when |
|---|------|--------|-----------|
| ZR-5.1 | `diag-golden-coverage.ts` | The `golden` const updated to the operator's REAL EU/GU trades (the 8 EU + the 7 GU — verbatim from Golden_Operator_Trade_Feedback_EU_GU.md) — clearly commented + labelled as TEMPORARY ARCHITECTURE (the measurement oracle for Phase 1 only; the pipeline never reads it) | the diag measures against the real trades |
| ZR-5.2 | `src/` (the self-validation) | The machine's self-validation protocol (Part 30 of the macro context): the E1 validation (the zones' pressure state internally consistent), the E2 validation (the storyline's projections internally consistent), the E3 validation (the trades' geometry satisfies the rules), the cascade validation (the storyline alignment + the structural equivalence) | the self-validation protocol implemented |
| ZR-5.3 | Phase 2 (later) | The multi-week consistency — the pipeline on multiple unrelated weeks with consistent prediction quality | (Phase 2 — the next session's session) |

**Gate ZR-5:** the EU 8 + the GU 7 at the operator's REAL levels at ≤3p (the entries) + the TPs at the strength-driven edges + the DXY 6/6 held + the DXY lane all-winning + the GU Mon SHORT RRR-evaluated identically to the operator's rejection; the self-validation protocol passes; determinism ×2.

**Checkpoint:** `Checkpoints/v4.5.2_FOUNDATION_SOLID/`

---

## THE GATE PROTOCOL (EVERY wave — mechanical, in order)

1. `npx tsc --noEmit` = 0 errors
2. `bun build src/index.ts --outdir dist --target bun` = success
3. `bun report-v452.ts` runs clean (the fixture /tmp/opencode/bars_raw.json)
4. `bun diag-golden-coverage.ts` — the count (against the new oracle)
5. The wave's gate diag (diag-zone-relevance / diag-storyline / diag-e3-conditional / the existing gates)
6. sha256 report_v452.md ×2 identical (the determinism)
7. The frozen files byte-identical (sl-lmv 91294083, trade-dedup 33914c89)
8. The checkpoint (`Checkpoints/v4.5.2_{WAVE}/`) with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS (the ORCHESTRATOR PRINCIPLES)

## THE DO-NOT LIST (the anti-derailment laws)

- Do NOT override the pre-existing E1/E2 data architecture or fabricate rules (the E3 constraint).
- Do NOT re-introduce `computeMirrorTP-primary` (the v4.5.4 regression).
- Do NOT let the RE_TRANSLATE override an E2 designation (the E2_DESIGNATION_HELD guard stays).
- Do NOT use 5/10/30-pip tolerance as acceptance — 3-pip ONLY.
- Do NOT hardcode the golden levels into the pipeline (the diag's const is the measurement oracle only — the pipeline never reads it — TEMPORARY ARCHITECTURE).
- Do NOT touch the fib (the Air — E4, deferred until the foundations are bulletproof).
- Do NOT touch the frozen pair; engine.ts + visual-setup-generator.ts only via their documented exceptions.
- Do NOT optimize for low-R filter-passing volume (the 4R+ target — never "50 shitty 2.5R trades").
- Do NOT re-litigate settled doctrine — quote it (D13).
- Do NOT claim coverage without the diag output on disk.
- Do NOT do the output-only audit (the ORCHESTRATOR PRINCIPLES — read WHAT the subagents did + WHY + HOW it affects the codebase — the diff review of EVERY changed line).

## THE ORCHESTRATOR DISCIPLINE (the NON-NEGOTIABLE ORCHESTRATOR PRINCIPLES — every wave)

1. The dispatches: the full-context prompts (150-400 lines — the mission + the reading order + the exact tasks with the why + the constraints + the verification + the return format). NEVER the 50-line toilet paper.
2. The returns: the diff review of EVERY changed line (the what/why/how verdict — the PART-17 vocabulary) + the orchestrator's own verification runs + the probes.
3. The wave report: the dispatches, the returns, the diff reviews, the verification, the honest residuals (the PART-15 template).

## THE RISK REGISTER

| # | Risk | Impact | Mitigation |
|---|------|--------|-----------|
| 1 | The E3 fabrication (the zone-relevance engine invents its own rules) | the architecture constraint violated | the ORCHESTRATOR PRINCIPLES audit — every anchor traced to an E1 zone + an E2 projection |
| 2 | The TP wall classification misses the operator's strength-driven edge | the TP stays at the mid | the operator's real trades as the oracle — the TP edge verified per trade |
| 3 | The storyline's narrative is over-engineered | the chain becomes a different machine | the operator's exact storyline structure (Part 16) — implement only what the operator reads |
| 4 | The subagent channel stalls again (the quota) | the wave pauses | the D5 discipline + the channel diagnosis + the orchestrator's surgical fallback |
| 5 | The golden anchor fitted | the machine optimizes to the const | the const is the measurement oracle only — the pipeline never reads it |

## THE PROVIDER/MODEL

- The build agents: the default provider (the subagent dispatches via trident_build).
- The container test: the plutus agent on plutus-container-testing:clean-v421 — the model **opencode-go/mimo-v2.5** (the default — the operator's directive; the free zen quota exhausted).

## THE CHECKPOINT DISCIPLINE

Per-wave saves: `Checkpoints/v4.5.2_ZONE_RELEVANCE/` → `v4.5.2_STORYLINE/` → `v4.5.2_E3_CONDITIONAL/` → `v4.5.2_CASCADE_PROPAGATED/` → `v4.5.2_FOUNDATION_SOLID/` — each a static reload anchor with the MANIFEST (the base, the SHA chain, the ported changes, the frozen list, the spec URL) + the report + the gate outputs + the DIFF REVIEWS. src/ stays the working tree. git commit per wave (if the repo allows — the project is under a gitignored path — the checkpoints are the record).

*END OF NEXT_STEPS — the ZR overhaul plan. Execute Wave ZR-1 first, gate, checkpoint, continue through ZR-5 without stopping, under the ORCHESTRATOR PRINCIPLES discipline.*

---

## APPENDIX — THE ZR-WAVE DETAIL (the exact modules + the integration points + the blast radius — the "how to do it")

### ZR-1 — THE ZONE-RELEVANCE ENGINE (the E1 pressure state per trade)

**ZR-1.1 — The full pressure state** (`src/mdve/` — the ZoneModel + the buildChartModel): the zones carry the confluence (the 6D from the 9-pillar), the ZFP (the step function from Bible 4.0 §4.11), the BoM/MoM (the origin candle's prior-move direction), the reaction count (the event-granularity battles), and the ABSORPTION state (which shields the candles have eaten — the fuel tracking). The integration point: the ZoneModel gains the absorption field; the buildChartModel computes it per zone.

**ZR-1.2 — The liquidity shield relation** (`src/mdve/` — the LQZ + the S/D zones): the shield-vs-zone relation as a first-class structure — the LQZ in FRONT of the S/D zone (the operator: "The candles eat the liquidity in front of the S/D and in doing so the S/D (and its internal nested liquidity) is protected from mitigation and thus has a longer lifespan"). The integration point: the zone gains a `shieldZoneId` field; the buildChartModel links the shield rungs to their shielded zones.

**ZR-1.3 — The operative defense** (`src/mdve/` — the zone selection): the operative defense for any trade computed from the pressure state (the confluence/ZFP/BoM-MoM/reaction-count/absorption + the E2 pathway) — NOT a static role. The verification probe: the trade #4's SL moving from the LQZ to the DEMAND zone as the demand's pressure absorbed (the operator's reasoning: "set the SL based on the DEMAND zone instead of the LQZ to ensure we are safe from the potential wicks/volatility as all the bullish pressure from the demand zone is absorbed").

### ZR-2 — THE STORYLINE ENGINE (the E2's narrative on the E1 pressure)

**ZR-2.1 — The storyline's structure** (`src/brains/shape-brain.ts`): the storyline's full structure per day — the current shape + the contested zone's pressure state + the projected next shape from the E1-pressure-driven transition + the break-validation + the strength comparison + the macro arc (the prior-week storyline from the pre-flight) + the warframe arc (the trenches → the ZoC → the breakthrough → the counter-attack).

**ZR-2.2 — The reaction-count transitions + the break-validation** (`src/brains/shape-brain.ts`): the "3rd mitigation → fail" + the "4+ strong → fortress/RWL" transitions (the operator's "zones usually fail on the THIRD mitigation"); the break-of-structure validation (the E1 pressure validates the structure break BEFORE the E2 shape respects it — the operator's "this 'break of structure' could be a false positive as looking purely at E1 pressure mechanics, this ZONE has not yet been broken").

**ZR-2.3 — The day decomposition** (`src/brains/shape-brain.ts`): the day decomposition complete — the day-local zone preference (the recency bias as a factor, the E2 pathway as the primary), the London-open anchor, the day-reachability (already partly built in A1.4/R1-b).

### ZR-3 — THE E3 CONDITIONAL ANCHORS (the classification + precision alignment)

**ZR-3.1 — The SL's ladder-steps rule** (`src/mdve/mirror.ts` — computeSL_LMV's consumer): the SL = 3p OUTSIDE the far edge of the current entry step OR 1-2p INSIDE the close edge of the NEXT STEP away (the opposite direction — SHORT → next step UP; LONG → next step DOWN) — the relevant zone chosen by the pressure state. The integration point: computeSL_LMV's caller (mirror.ts) selects the relevant zone per the pressure state.

**ZR-3.2 — The TP's strength-driven edge** (`src/mdve/mirror.ts` — computeLmvTP): the TP edge = f(the opposing zone's pressure): the STRONG zone (BoM, high confluence, fortress) → the CLOSE edge + the 1-2 pip spread; the WEAK zone (virgin MoM, low confluence) → the FAR edge. The integration point: computeLmvTP computes the edge from the opposing zone's pressure state.

**ZR-3.3 — The TP's E2-projected opposing zone resolved** (`src/mdve/mirror.ts` — computeLmvTP's shapeDay path:1596): the demandZoneId/supplyZoneId resolved to the zone's internal LQZ — the FULL-MODEL resolution (the OB-id-vs-LMV-candidates mismatch fixed — the D37 #3 root cause). The verification: the GU Mon's demand 1.33567 (the E2's projected demand) → the TP resolved → RRR 3.08 (the mirror survives).

**ZR-3.4 — The TP's E1-pressure wall classification** (`src/mdve/mirror.ts` — computeLmvTP's cap-walk:1533-1591): the Law-14 cap-walk's wall classification from the E1 pressure mechanics (the BoM/MoM + the 6D confluence + the Earth+Fire) — the shallow LQZ shelves (the candle-count zfp-20) are PASS-THROUGH — the D37 #1 root cause. The verification: the GU Mon's TP extends from the 1.33720 shelf to the 1.33360 wall's internal LQZ (the golden GU-1's 1.33347 — 61.8p — RRR 4.7).

**ZR-3.5 — The per-anchor 3-attempt dynamic state machine** (`src/mdve/refinement-machine.ts`): per trade, 3 attempts per anchor (E, SL, TP), tracked + locked INDIVIDUALLY; the loop continues on the unlocked anchors until RRR passes or all 3 lock; every rejection gives WHY (the mechanical reason — the anchor, the numbers, the violated constraint) + HOW (the specific correction); the machine consumes the E1 pressure + the E2 storyline of the trade being refined (the operator's design: "3 attempts on each anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked individually per trade... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it").

### ZR-4 — THE CASCADE (the storyline propagation)

**ZR-4.1 — The distribution fix** (`src/mdve/mirror.ts` — the usedEuAnchors/usedGuAnchors:3034-3108): the E2 exact-match registers its anchor into the usedAnchors set — the N distinct sources spread across the N E2-designated rungs — the pile-on-one-anchor collapse killed (the D37 #5).

**ZR-4.2 — The trade-chaining propagation** (`src/mdve/`): the TP of DXY trade N = the entry of DXY trade N+1 — the EU/GU mirrors chain identically (the EU #2's E = the EU #1's TP — the kept chaining — verified by the operator's EU trades).

**ZR-4.3 — The day-local zone preference** (`src/mdve/`): the E2 designation for a day prefers the day-local structures (the Monday LQZ for Monday) when the E2 pathway passes through them — the recency bias as a factor (the operator: "recency bias is a real thing. BUT it is NOT the LAW").

### ZR-5 — THE NEW ORACLE + THE SELF-VALIDATION

**ZR-5.1 — The new oracle** (`diag-golden-coverage.ts` — the `golden` const): updated to the operator's REAL EU/GU trades (the 8 EU + the 7 GU — verbatim from Golden_Operator_Trade_Feedback_EU_GU.md) — clearly commented + labelled as TEMPORARY ARCHITECTURE (the measurement oracle for Phase 1 only; the pipeline never reads it).

**ZR-5.2 — The self-validation protocol** (`src/` — the self-validation): the machine's self-validation protocol (Part 30 of the macro context): the E1 validation (the zones' pressure state internally consistent — the confluence/ZFP/BoM-MoM/reaction-count derived from the fixture's bars — never hardcoded), the E2 validation (the storyline's projections internally consistent — the day-reachability, the pressure-driven transitions, the break-validation), the E3 validation (the trades' geometry satisfies the rules — the entry at the LQZ's near edge, the SL at the RELEVANT zone's edge rule, the TP at the strength-driven edge, the RRR as the consequence, the chaining, the E1→E2→E3 constraint), the cascade validation (the storyline alignment ≤35% + the structural-equivalence matching + the kept chaining).

**ZR-5.3 — Phase 2 (the next session's session):** the pipeline on multiple unrelated weeks with consistent prediction quality — the proof of real forward-mapping in real market conditions.

## THE MODULE INVENTORY (file → purpose → status — the file:line anchors)

| File | Purpose | Status | The ZR wave |
|------|---------|--------|-------------|
| `src/mdve/mirror.ts` (3,185L) | the mirror engine (cascadeV45:3009 → reAnchorMirror:2516 → selectPairNativeZone:1362 → computeLmvTP:1533) | **THE D37 TARGET** | ZR-3.1/3.2/3.3/3.4, ZR-4.1 |
| `src/mdve/setup-gen.ts` (1,353L) | the DXY source lane (generateSourceSetupsV45 + the F1-D/F1-E) | SOLID (the DXY 6/6) | — |
| `src/mdve/refinement-machine.ts` (1,184L) | the 3D refinement machine | **THE OVERHAUL TARGET** | ZR-3.5 |
| `src/brains/shape-brain.ts` (1,828+L) | E2 the shape brain (projectZoneForDay + the day-reachability) | **THE STORYLINE TARGET** | ZR-2.1/2.2/2.3 |
| `src/mdve/` (the zone types + the map) | the ZoneModel + the buildChartModel | **THE ZONE-RELEVANCE TARGET** | ZR-1.1/1.2/1.3 |
| `src/brains/9-pillar-lobe.ts` (2,371L) | E1 the 9 pillars (the pillarEngine) | WIRED (A1.1 — report-v452.ts:330) | — |
| `src/mdve/prior-week-preflight.ts` (d9054cbc) | the prior-week backwards-mapping module | SOLID (the DXY sweep origin 100.603 computed) | — |
| `src/mdve/sl-lmv.ts` (317L) | E1 SL (computeSL_LMV) | **FROZEN** (912940832fac44bc) | **DO NOT TOUCH** |
| `src/mdve/trade-dedup.ts` (524L) | the dedup engine | **FROZEN** (33914c897e777540) | **DO NOT TOUCH** |
| `report-v452.ts` (874+L) | the pipeline entry (the v452 report path) | **THE WIRING TARGET** | ZR-5.2 |
| `diag-zone-relevance.ts` | NEW — Wave ZR-1's gate | TO BUILD | ZR-1 gate |
| `diag-storyline.ts` | NEW — Wave ZR-2's gate | TO BUILD | ZR-2 gate |
| `diag-e3-conditional.ts` | NEW — Wave ZR-3's gate | TO BUILD | ZR-3 gate |
| `diag-golden-coverage.ts` | the 3-pip golden count | UPDATE (the `golden` const → the operator's REAL trades) | ZR-5.1 |

## THE SHA CHAIN (the verified deployment fingerprints)

```
dist/index.js      9c0c21ee0eafe5ebca9cd9090ec2c1a8d648d4161ab9c3ba5553cb5e1238f825  (1.29MB, 145 modules — CURRENT)
report_v452.md     3b2e011d3e99b3919a3fb56d87e01912be0f823d1e8159692298ccc89f041c7a  (×2 — determinism, CURRENT)
src/mdve/sl-lmv.ts  912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab  (FROZEN)
src/mdve/trade-dedup.ts 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4  (FROZEN)
src/mdve/prior-week-preflight.ts  d9054cbc351ae3ca1c6e661db6835c0b100187a928e4c574c928e39005343470  (Wave A1.3 — NEW)
```

---

## 2026-08-04 (UPDATE — THE ZR-7 WAVE PLAN)

**Next:** WAVE ZR-7B (the E1 completion — the BoM gates to all lanes, the IP zones' 'CONFLUENCE' + pressure, the DEFAULT_ZFP kill, the LQZ×IP merge) → ZR-7C (the E2 pressure-consumption — the ROOT: the designation rewrite + the day band + the chain) → ZR-7D (the FX precision) → ZR-7E (the consistency) → ZR-7F (the cascade precision — the golden ≥ 15/21).
**The build authority:** `MASTER_CONTEXT/PLUTUS_V4.5.2_ZR7_OVERHAUL_SPEC.md` (1,142L).
**The metric:** the golden vs the operator's REAL trades at ≤3p · the E2 consumes the COMPLETE E1 output · determinism ×2 after EVERY change.

---

## 2026-08-04 (UPDATE — THE ZR-7B SHIPPED — THE NEXT WAVE)

**Next: WAVE ZR-7C — the E2 pressure-consumption (THE ROOT):** the toDxyZone boundary carries the FULL pressure state · the designation rewrite (the chain-driven + pressure-aware + day-local — the 5 strongest() call sites per the spec Part 23) · the day-band forward projection · the shape-chain progression. The gate: diag-e2-pressure — the designations progress, the dayOpens differ, the EU Tue ~1.14460 (computed), the EU Mon demand designation at the operator's near demand (the #1 TP 1.14110-territory), the EU Wed #4 (1.14020) restored.
**The ZR-7C residual rows (from the ZR-7B wave report):** the EU Mon SHORT's TP at 1.13886 (the E2's deep-demand designation) · the EU Wed #4 lost hit · the Fri EU SHORT ACTIVE.
**The build authority:** `MASTER_CONTEXT/PLUTUS_V4.5.2_ZR7_OVERHAUL_SPEC.md` (1,142L — the Part 6.6 shape-brain.ts + Part 23 the strongest() call-site map).

---

## 2026-08-04/05 (UPDATE — THE ZR-7C C1 IN — THE C2/C4 CONTINUATION)

**The next wave:** ZR-7C — the E2 pressure-consumption (THE ROOT) — the C1 boundary SHIPPED (the additive contract — the pressure crosses into the E2). The C2 (the pressure-aware designation) + C4 (the chain anchor) implemented + measured 9/21 + reverted — the tuning spec in `Checkpoints/v4.5.2_ZR7_C1/MANIFEST.md`:
1. The C2 iteration: the pressureScore (the spec Part 7.2) restored + the LQZ-rung-aware weighting (the operator's entries AT the LQZ rungs) — the golden ≥ 10/21 the gate — the EU Tue improved Δ3.4p (the pressure-awareness works).
2. The C4: the chain level = the opposing zone's internal-LQZ near edge (not the center) + the CHAIN_ANCHOR_OUT_OF_REACH log (the spec Part 24).
3. The C3 day band (the spec Part 7.3 — the drift caution — the 2026-07-31 historical derailment).
4. The C5 shape chain (the reaction-count-conditioned — the spec Part 6.6).
5. diag-e2-pressure (NEW — the spec Part 10.2): the designations progress · the dayOpens differ · the EU Tue ~1.14460 · the EU Mon demand at the operator's near demand (1.14110-territory) · the EU Wed #4 (1.14020) restored.
**The residual rows (from the ZR-7B):** the EU Mon SHORT's TP 1.13886 (the deep-demand designation) · the EU Wed #4 lost hit · the Fri EU SHORT ACTIVE.

---

## 2026-08-05 (UPDATE — THE ZR-7C S1 SHIPPED — THE E2E WIRING SPEC IS THE AUTHORITY)

**The next work:** the E2E WIRING SPEC (`MASTER_CONTEXT/PLUTUS_V4.5.2_ZR7C_E2E_WIRING_SPEC.md`) — the operator's shape-wave logic (each trade = one wave of the SS→BS→R→WL→RWL chain; the waves chain end-to-end; the TPs target the next wave's zone) as the E2E contract.
**Shipped:** the C1 boundary (the pressure crosses into the E2 — 257/257 zones populated) + the S1 pressure-aware transitions (the PBS dead — the EU Mon SS → Tue BS → Wed R — the operator's shapes; the golden held 10/21). `Checkpoints/v4.5.2_ZR7_C/`.
**The S2 tuning (measured + reverted — the C MANIFEST):** the chain +100 at the internal-LQZ near edge + the pressureScore — the EU Tue Δ3.4p (held) but the GU drifted (the Thu Δ22.8, the Fri Δ46.8 — the GU's zone-map fidelity gates the chain — the ZR-7D first). The internalLqzNearEdge helper is in the code.
**The stages:** S2 (the chain-anchored designation — the GU-specific handling + the projected-target contested zone) → S3 (the day band — the drift caution) → S4 (the E3 verification) → S5 (diag-e2-pressure) → ZR-7D (the GU's map fidelity) → ZR-7E → ZR-7F (the golden ≥ 15/21).

---

## 2026-08-05 (UPDATE — THE FX ORACLE GREEN + THE S2's REFINED SPEC)

**The ZR-7D's gate DONE:** diag-lmv-golden-fx PASS (15/15 entries + 2/2 TPs) — the machine's rungs ARE at the operator's levels — the map fidelity is PROVEN — the ZR-7D's map work is complete.
**The S2's refined spec (the 3 measured experiments + the carry trace — the tuning):**
1. The designation should select the CHAIN-ANCHORED RUNG (the operator's entries ARE the LQZ rungs — "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor") — the chain candidate = the LMV rung AT the chain level (the FX-proven rungs at Δ0.5-1.0p of the operator's levels) — the S/D-zone +100 admission was the GU drift.
2. The pressure-score's S/D-BoM preference (+105 vs the rungs +55) — the rung-aware weighting (the operator's LQZ entries are the PRIMARY entries).
3. The E3's resolution of the chain-designated rung's near edge (the operator's exact levels).
**The waves:** ZR-7A/B shipped · ZR-7C S1 shipped (the pressure-aware transitions — the PBS dead) · ZR-7D's map gate GREEN · the next: the S2's refined chain-rung designation → S3 (the day band) → S4 (the E3 verification) → S5 (diag-e2-pressure) → ZR-7E → ZR-7F (the golden ≥ 15/21).

---

## 2026-08-05 (FINAL — THE REFINED S2 SHIPPED — THE NEXT SESSION)

**The shipped:** the C1 boundary · the S1 pressure-aware transitions (the PBS dead) · the S2-refined chain-rung designation (the GU #1 Δ1.0p HIT + the Thu/Fri drift fixed + the golden 10/21 held) · the ZR-7D's FX oracle gate GREEN (diag-lmv-golden-fx — 15/15 + 2/2 — the map fidelity proven).
**The next session:**
1. **S4 — the E3's internal-LQZ resolution:** the GU Wed #4 (1.33280) at Δ6.0 — the pressure-sort designated the S/D BoM demand — its internal-LQZ resolution must land the operator's level (the FX-proven rung 1.33270 at Δ1.0p!) — the e2ZoneResolvedEntry's internal-rung selection verification.
2. **S5 — diag-e2-pressure** (the NEW gate): the designations progress + the dayOpens differ + the EU Tue ~1.14460 + the EU Mon near-demand + the EU Wed #4 restored.
3. **The EU rows:** the #2 (1.14110) Δ16.0 · the #4 (1.14020) Δ24.0 · the #6 (1.13935) Δ15.5 · the #8 (1.14555) Δ6.1 — the chain-anchored designations at the operator's levels (the rungs proven in the map!).
4. **The GU rows:** the #3 (1.33660) Δ17.0 · the #6 (1.33850) Δ9.0 · the #7 (1.34500) Δ30.8 — the GU's chain + the pressure tuning.
5. **The ZR-7E** (the diag/report consistency) → **ZR-7F** (the golden ≥ 15/21).

---

## 2026-08-05 (FINAL — the all-green + the measured blocker)

**The session's TRUE state:** all-green (17 gates + the golden 10/21 + c39fd672 ×2 + the frozen pair). The shipped: the ZR-7B + the C1 + the S1 + the FX oracle gate.
**THE MEASURED BLOCKER (the next engineering — not a handoff, the finding):** the machine's S/D zone bands ≠ the operator's refined bands — the operator's LQZ rungs sit at/above the machine's zones' tops (the EU demand [1.13911,1.14118] vs the operator's [1.14149-1.14000]; the operator's rung 1.14100 excluded by the strict containment). THE FIX DIRECTIONS (measured): (a) the zone-band fidelity — the S/D detection's band refinement (the origin-candle range vs the operator's LQZ-constrained bands); (b) the E3's internal-rung selection — the operator's rung at the zone's near edge with the honest edge tolerance (the near-edge filter's SHORT-side balance — the GU Tue's rung 1.33880 vs the operator's 1.33960 — the zone's bottom LQZ vs the operator's LQZ).
**The waves' status:** ZR-7A/B shipped · ZR-7C S1 shipped · ZR-7D's FX gate GREEN · the S2/S4 measured (the tuning data) · ZR-7E/F pending (the golden ≥ 15/21 — gated by the zone-band fidelity).

---

## 2026-08-05 (FINAL — the shipped state + the measured next engineering)

**The shipped:** the rung-direct designation (the GU Wed #4 restored Δ0.6p) + the S1 (the PBS dead) + the C1 + the FX oracle gate — ALL GREEN (17 gates + the golden 10/21 + c39fd672 ×2).
**The measured next engineering (in-session — not a handoff):** the remaining rows' mechanism — the per-trade NEAR/DEEP demand nature: the operator's #2 (the Mon LONG) = the NEAR demand rung (1.14100 — the Δ1.0p FX-proven!) vs the #4 (the Wed LONG) = the DEEP demand (1.33280!). The demand-proximity experiments (the near-side vs the deep-side references) each fixed one row + broke the other — the TRADE-LEVEL resolution (the shape-driven: the SS/BS day's demand at the near; the RWL/BS day's at the deep!) is the next lever.

---

## 2026-08-05 (FINAL — the cascade root fixed + the measured next)

**The shipped:** the direction-appropriate anchor (the LONG mirrors now anchor the DEMAND — the operator's inversion honored!) + the zone-top entry (the LONG at the demand's near edge) + the EU #7's NEW HIT + the ≤10p 17/21 + all 17 gates.
**The measured next (in-session):** the per-trade near/deep demand nature — the operator's #2 (the near demand — the zone-top ✓) vs the #4 (the DEEP demand — the zone-top overshoots Δ8.0!) — the trade-level resolution: the RWL/BS trades (the operator's #4/#6 — the deep LQ shield!) should resolve the demand's DEEP LQZ; the SS/BS trades (the #2/#7!) the near. The shape-driven (the RWL/BS → the deep; the others → the near).

---

## 2026-08-05 (THE CASCADE BREAKTHROUGH — THE TANGIBLE NEXT STEPS)

**The shipped (the golden 10 → 12/21):** the direction-appropriate anchor + the zone-top/deep entry + the e2Designated gate — the cascade's side-inversion honored at every layer. The checkpoint v4.5.2_ZR7_C (f8235815).
**THE TANGIBLE NEXT STEPS (the full cascade in order):**
1. **The E2's demand pick at your exact LQZ** — the EU #2 (Δ4.4): the demand designation = the rung 1.14120 (its top 1.14154!) — your LQZ [1.14110-1.14020] — the pick should prefer the rung 1.14100 (its top 1.14120 — Δ1.0p!) — the rung-selection's near-edge-aware sort (the rung whose TOP lands at the day's expected entry!).
2. **The supply-side symmetry** — the EU #3 (Δ3.4) + the EU #8 (Δ6.1) + the GU #3 (Δ8.9) + the GU #5 (Δ17.9) + the GU #7 (Δ41.9) — the SHORT mirrors' entry resolution — the same near-edge mechanics on the supply side (the SHORT's entry = the LQZ's floor!).
3. **The deep-demand anchors** — the EU #6 (Δ7.8) + the GU #4 (Δ4.3) — the deep rung selection (the FX-proven rungs at Δ0.2-1.0p of your levels!).
4. **The STALE-10 hygiene** — the fill model's expiry classification after the anchor fix.
5. **The golden ≥ 15/21** — the ZR-7F's acceptance — then the phase-2 multi-week validation.
**The files:** src/brains/shape-brain.ts (the demand pick's rung selection) + src/mdve/mirror.ts (the supply-side entry resolution) + report-v452.ts (the STALE classification).
## THE v4.5.3 EXECUTION — STEP-1 SHIPPED (the golden 13/21!)
- **STEP-1 (the #2's fix — SHIPPED):** the SS-shape's LONG = the demand's nested SELL-side liquidity (mirror.ts's nestedSellLiquidity — the SELL rung's top within 10p below the anchor's floor!) — the #2's Δ4.4p → Δ1.0p — **the golden 12 → 13/21** — checkpoint `Checkpoints/v4.5.3_S1/` (report 3918d8b9 ×2).
- **STEP-2 (NEXT — the supply-side symmetry):** the EU #3 (Δ3.4) + the #8 (Δ6.1) + the GU #3 (Δ8.9) + the #5 (Δ17.9) + the #7 (Δ41.9 — the FX-proven rung at Δ0.0p!!) — the SHORT mirrors' entry resolution — the same near-edge mechanics on the supply side — the probe-first: dump the SHORT emissions + the operator's supply-side LQZs (the #1's [1.1444-1.14395] = the machine's SELL rung [1.14390, 1.14417] bottom 1.14390 — Δ0.5p HIT ✓ — the pattern: the SHORT entries = the SELL rungs' bottoms? — the #3's 1.14460 = the [1.14417+]-rung region — the rung-selection's proximity/recency vs the operator's level!).
- **STEP-3 (the deep-demand anchors):** the EU #6 (Δ7.8 — the deep SELL rung [1.13910, 1.13937] top 1.13937 = Δ0.2p of the operator's 1.13935!!) + the GU #4 (Δ4.3).
- **STEP-4 (the STALE hygiene):** report-v452.ts's expiry classification.
- **STEP-5 (the golden ≥ 15/21):** the acceptance → the phase-2 multi-week validation.
## THE v4.5.3 EXECUTION — STEP-2 SHIPPED (the golden 15/21!)
- **STEP-1 (SHIPPED — 13/21):** the SS-LONG's nested SELL liquidity (mirror.ts's nestedSellLiquidity!) — the #2's Δ4.4p → Δ1.0p — `Checkpoints/v4.5.3_S1/`.
- **STEP-2 (SHIPPED — 15/21):** the SHORT-side's SHADOW-rank fix (the top-proximity!) + the SS-rank-1 (the LQZ-below-the-supply!) — the #3's Δ3.4p → Δ1.1p + the #8's Δ6.1p → Δ1.2p — `Checkpoints/v4.5.3_S2/` (report 7fd527ba ×2) — the EU-side COMPLETE (7/8 of the EU goldens + the DXY 6/6!).
- **STEP-3 (NEXT — the GU-side + the deep):** the 6 remaining: the EU #6 LONG (Δ7.8p — the deep LQ shield [1.13910, 1.13937] top 1.13937 = Δ0.2p of the operator's 1.13935!! — the Wed's R vs the operator's RWL!) + the GU #3 SHORT (Δ8.9p) + the GU #4 LONG (Δ4.3p) + the GU #5 SHORT (Δ17.9p — the anchor at the wrong level!) + the GU #6 LONG (Δ4.0p) + the GU #7 SHORT (Δ41.9p — the FX-proven rung at Δ0.0p!!). The probe-first: the GU designations' picks (the shape-brain's GU supply/demand selection vs the operator's levels!).
- **STEP-4 (the SL-fidelity + the STALE hygiene):** the Mon SHORT's SL-anchor (the entry-rung 1.14430 vs the operator's supply-LQZ [1.1466-1.1462]!) + the fill-model's expiry classification.
- **STEP-5 (the golden ≥ 15/21 held + the phase-2 multi-week validation!):** the acceptance.
## THE v4.5.3 STEP-3's MEASURED FINDINGS (the GU-side's honest mechanisms — the next session's waves!)
The GU-side's remaining 6 (the EU #6 + the GU #3/#4/#5/#6/#7!) — the measured mechanisms:
- **The GU #4 (Wed RWL/BS 1.33280):** the machine's Wed-demand anchor [1.33286, 1.33323] — the operator's entry ≈ the anchor's FLOOR 1.33286 (Δ0.6p!!) — the PBS-long's floor-entry = the measured fix — REVERTED (the net-zero: the #1's 0.7p-via-the-Wed-top → the 3.0p float-edge ✗ + the #6's 4.0 → 7.1 ✗!) — the #1-vs-#4 conflict on the same anchor (the top serves the #1, the floor the #4!) — the resolution = the GU Mon's OWN demand-pick (the operator's Mon-demand = the 1.33330-region — the machine's = the 1.33880-rung — the shape-brain's GU Mon demand-selection!!).
- **The GU #3 (Wed WL 1.33660):** the best-possible = the second-topmost pocket [1.33693, 1.33714]'s bottom 1.33693 (Δ3.3p — just over the 3p line!) — the operator's entry ≈ the FX-pocket's center 1.33650 (Δ1.0p) — the center-entry would break the GU #2 (1.33965 = the pocket-BOTTOM — Δ0.0p — the center 1.33890 — Δ7.5p!) — the WL's rank-1 also breaks the GU #2 — NO clean rule.
- **The GU #5/#7 (1.34260/1.34500):** the designation-LEVEL issue — the Thu-supply = the 1.33878-zone (the Mon's REUSED!) + the Fri-supply = the 1.34110-rung — the operator's = the 1.34260/1.34500-regions (the FX-proven rungs [1.34192, 1.34232]/[1.34386, 1.34404] at Δ0.0p!!) — the shape-brain's GU-supply picks (the recency-bias vs the day-local structures!).
- **The GU #6 (Thu WL/BS 1.33850):** the Thu-demand anchor [1.33779, 1.33810] — the operator's = 40p ABOVE the anchor's top — the SELL-pocket [1.33830, 1.33866]'s region (the bottom 1.33830 — Δ2.0p!) — the Thu-demand's level issue.
- **The EU #6 (Wed RWL 1.13935):** the deep-SELL-pocket [1.13910, 1.13937]'s top 1.13937 (Δ0.2p!!) — the RWL-deep-nested (the 10p window!) — CONFLICTS with the #4 (the Wed R — the internal 1.14013 — Δ0.7p!) — the R-vs-RWL distinction on the SAME day (the machine's Wed = R — the operator's = R + RWL!) — the multi-trade-day modeling!
- **The operator's GU entries ≈ the FX-rungs' CENTERS** (the #3's 1.33660 ≈ the [1.33693, 1.33714]'s center 1.33650!) vs the EU entries ≈ the pocket-BOTTOMS — the pair-specific entry-edges!
## THE v4.5.3 STATE (the S1+S2 shipped — the golden 15/21!)
- The EU-side COMPLETE (the #1/#2/#3/#4/#5/#7/#8 — 7/8 of the EU + the DXY 6/6!) — the remaining 6 = the GU-side + the EU #6's multi-trade-day.
- The report 7fd527ba ×2 · the 9 gates PASS · the frozen pair intact · the checkpoints: v4.5.3_S1 (the nested SELL!) + v4.5.3_S2 (the SHADOW-rank!).
- The S3's PBS-floor attempt: MEASURED + REVERTED (the net-zero — the ZERO BROKEN WINDOWS held!) — the lesson: the GU #4's floor conflicts with the #1's top-match on the shared anchor — the GU Mon-demand's fix must precede it!
## THE v4.5.3 STEP-3's SECOND ATTEMPT (the nested-above): MEASURED + REVERTED (the zero broken windows!)
- The LONG's nested-above (the SELL pocket within 5p ABOVE the demand-anchor's top — the GU #6's measured 1.33830 = Δ2.0p!): the ≤3p stayed 15 + the ≤5p DROPPED 17 → 16 (the #6's 4.0 → 9.0p!) — the OTHER GU LONGs' emissions shifted (the Tue/Mon's anchors' windows fired!) — REVERTED. The mirror byte-identical to the S2-checkpoint ✓.
- THE GU-SIDE'S HONEST ROOT (the measured): (1) the reach-bands EXCLUDE the operator's levels (the Thu's 1.34158 vs the #5's 1.34260 — 9.8p beyond! the Fri's 1.34268 vs the #7's 1.34500 — 23.2p beyond! — the travel-based reaches!); (2) the designation-picks (the Wed's [1.33623, 1.33764] vs the operator's [1.33550, 1.33660] — whose TOP = the operator's #3's entry EXACTLY!); (3) the shared-anchor conflicts (the #1-vs-#4 on the Wed-demand!); (4) the entry-edge inconsistencies (the #2 = the internal-pocket-bottom; the #3 = the zone-top!).
- THE NEXT WAVES: (a) the GU Wed's supply-pick — the [1.33550, 1.33660]-zone's top = the operator's 1.33660 (Δ0.0p!!) — the supply-selection's top-aware preference; (b) the reach-band's travel-calibrations (the operator's R/RWL travels exceed the machine's PBS/SS travels!); (c) the GU Mon-demand's pick (the operator's 1.33330 vs the machine's 1.33880-rung!).
## 2026-08-06 — THE IMMEDIATE NEXT STEPS (after the G2 ship)
1. SET THE OPENCODE_API_KEY env (the operator's key — in the session history!) + re-run the diag-reasoning-chain → the LIVE shadow tokens (8-11!).
2. THE GOLDEN GATE wave (the diag-reasoning-chain-golden — the G1-G8 acceptance — the L1's section 16!).
3. THE ENTRY PRECISION (the 4 misses' refinements — the frozen mirror's TP-walk!).
4. THE GU MONDAY's unified macro authority (the SWEEP_HIGH-vs-SWEEP_LOW fix — the mirror law!).
5. THE LEXICONS' PIPELINE WIRING (the enrichments — the phantom-BoM exemption at shape-brain.ts:2330-2336!).
6. THE MPSE-FORM implementation (the fork's pseudocode → the real predicates).
7. THE CONTEXT DOCS (this session's updates DONE!).
## 2026-08-07 (THE ARCHITECTURE CANON — THE L2 SPEC + THE WAVES)
- **THE CANON:** `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md` (2,051L — the operator's six corrections C1-C6: the parallel tokens, the Trident-v7.3 shadow pattern, the micro-parallel/macro-sequential topology, the stall detector, the failure store, the ms-deterministic confirmation).
- **THE WAVES (the L2 spec's PART 13):**
  1. W1 — THE PARALLEL ENGINE (C1+C3): the token 8/10 Promise.all in the lane loop + the pair-level Promise.all in the diag. GATE: the SAME projections (G10) + the wall time ~1/6.
  2. W2 — THE STALL DETECTOR (C4): the SSE-stream idle detector in callModel. GATE: the probe — a working generation streams through; a stall aborts at the idle window.
  3. W3 — THE SHADOW-BACKEND ALIGNMENT (C2): the frozen model, the secrets chain env→.env→embedded, the encoded errors never thrown, the content||reasoning keep. GATE: the zero-hint battery.
  4. W4 — THE EXECUTION TOPOLOGY (C3 step 2): the DXY cascade layered ON TOP as the macro refinement. GATE: the divergence law + the forced-null complement proof.
  5. W5 — THE LEXICON WIRING: the phantom-BoM exemption at shape-brain.ts:2330-2336 + the macro authority + the forward-position predicate. GATE: the exemption unit-tests.
  6. W6 — THE GOLDEN GATE: the diag-reasoning-chain-golden G1-G10. GATE: exit 0 + the wall time ≤ 5 min + the determinism ×2 + the frozen pair.

## 2026-08-08 — THE OVERHAUL WAVES (the CME spec's Part 11 — THE NEXT STEPS)
**THE AUTHORITY:** `MASTER_CONTEXT/PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC.md` (2,928L — the SHARK-CME spec: the D1-D10, the F1-F17, the Phases 1-9 with the gates, the wave dispatch fills W0-W9).
1. **W0 — THE STATE VERIFICATION (the E1 explore):** the code inventory + the F6 (shape-brain.ts's phantom-BoM line: the L2 :2330-2336 vs the handover :1150) + the F12 (the LQZ 1H sweepLookback: the T2 12 vs the Bible 24) + the F2/F16 root-code + the frozen pair sha256. GATE: the resolved anchors.
2. **W1 — PHASES 1+2 (the B3 builds):** the telescoping T1-T6 (the ob-engine · 4h-sd-lobe · bom-mom · lqz-lobe · shape-brain · engine · mdve) + the LMV resolution L1-L4 (lmv · lqz-matrix — the modal emission, the 1-pip dedup, the bridge, the telescoped tiers). GATE: the 7 golden DXY LQZs ≤1 pip + the golden map + tsc 0.
3. **W2 — PHASE 3 (the B1 build):** the OBCV machine (obcv.ts — the 4 sub-engines + the O5 firewall). GATE: the golden OB reconstruction + 96% vs drawn.
4. **W3 — PHASE 4 (the B3 build):** the 3 lost mirror fixes + the sweep-bonus −30 (mirror.ts). GATE: the golden SL floor 4p + the probe + the GU ≥8 anchors.
5. **W4 — PHASE 5 (the B1 build):** the six lexicons wired (the machine form + the 6 enforcement points + the phantom-BoM all-4). GATE: every lexicon consumed + the phantom fixture.
6. **W5 — PHASE 6 (the B3 build):** the shadow REFIT (NOT deletion — the primary agent becomes the executor; the infra stays as the reasoning-step contract) + the grounding WARN (D2). GATE: the A1 test (WARN, never a kill) + no external fetch in the reasoning path.
7. **W6 — PHASE 7 (the B1 build):** the STEP A/B tools + the pipeline wiring (the 7-tool registry + the firewalls + the NEXT instructions). GATE: the A4 test (the fabricated designation → BLOCKED).
8. **W7 — PHASE 8 (the B3 build):** the E3 precision (the TP substrate ZR-3.3/3.4 + the ladder-steps SL + the strength-driven TP + the entry refinements). GATE: the EU/GU RRRs NOT all 2.50 + the convergence ≥2/5.
9. **W8 — PHASE 9 (the B4 build):** the W6 golden gate (diag-reasoning-chain-golden G1-G10 + the A1-A7 adversarial). GATE: exit 0 + the wall ≤5min + the determinism ×2.
10. **W9 — THE HOST DEPLOYMENT (the operator's D10):** the plutus agent deployed as a subagent on host — the STEP A/B reasoning observed in the stream — the convergence table is the operator's read.

## 2026-08-08 — THE GATE PASSES (the parallel waves landed — THE NEXT PUSH)
**THE STATE:** the golden gate **exit 0 — ALL G1-G10 + A1-A7 PASS** (the orchestrator's run — .trident/wave-audit/wave-w4-w8-parallel-build.md). The EU lane at the operator's precision (the SHORT Δ0.5p · the LONG Δ1.5p — the phantom-BoM fortress emission). The convergence **2/5** at ≤3p.
**THE NEXT (the convergence 2/5 → 5/5):**
1. **THE E2 DESIGNATION PRECISION (the PRIMARY lever):** the E2 core's DXY Monday designation = the supply 101.296 vs the golden 101.14 (the 1H LQZ); the GU pick Δ6.0p — the projectZoneForDay's zone selection (the operator's keyZoneId authoritative + the ENTRY-rung selection) must land on the operator's LQZ levels. The EU lane's Δ0.5p/Δ1.5p proves the anchor doctrine works when the E2 designates the operator's zones.
2. **THE DXY/GU ANCHOR REFINEMENT:** the same shield-entry + zone-anchored ladder-SL + internal-LQZ-TP fixes applied to the DXY/GU lanes once the E2 designations land.
3. **THE W9 HOST DEPLOYMENT (the operator's D10):** the plutus agent deployed as a subagent on host — the STEP A/B reasoning visible in the stream — the operator's acceptance read.

---

# THE 2026-08-09 OVERHAUL V2 WAVE PLAN (THE OPERATIVE LAYER — the ONLY job)

## THE WAVES W1→W8 (the §3 table — the files, the gates, the done-when; the disjoint file sets dispatch in ONE parallel batch per wave; the same-file owners MERGE — W1+W3 shape-brain.ts)

| The wave | The file set | The mission (§2) | The done-when (the gate) |
|---|---|---|---|
| W1 THE TEMPORAL | temporal.ts · shape-brain.ts (:1549/:2079/:1536/:1686-1689/:1707-1722/:1786-1795/:1851/:1936/:2259) · report-v452.ts:106 · diag-reasoning-chain-golden.ts · probe-e2-designation.ts | §2.1 — ANALYSIS_POINT_MS = 1783317600000 + the dayOpenSpot at the analysis point + the frozen snapshot | the probe's dayOpenSpot = the 06:00 price; the golden gate re-anchored exit 0 |
| W2 THE SIDE-VOTE | lmv.ts (:696-701) · lexicons/candle-pressure.ts (:363-370) · diag-lexicons.ts · probe-n1-rootcause.ts | §2.2 — the swept-side predicate (BOTH files) | the [101.12-101.154] SUPPLY; the [100.936-100.952] DEMAND; the LMV oracle 7/7; diag-lexicons 38 |
| W3 THE SELECTION | shape-brain.ts (:1409/:1686-1722/:1756-1776/:1810-1821/:1865-1878/:1924-1991/:2032) | §2.3 + §2.7.6 — the union, the data-derived travel, the pressure-DESC, the edge-distance, the evidence confidence | the DXY keyZone = the 101.14 structure; the EU pick unchanged; the GU demand = the 1.33380 rung |
| W4 THE DIRECTION | shape-brain.ts (:1427-1431/:2151-2230) · report-v452.ts (the divergence + the §9.1 comments) · cascade-translation.js (0.35) · reasoning-chain.ts (the divergence fields) · golden-gate.ts (G3) | §2.4 — the dayDirection + the macro-wins | the GU Monday = LONG; the MACRO_DIVERGENCE row (0.40); G3 passes |
| W5 THE WALLS | mirror.ts (:555-678/:2366/:2808-2964/:2873-2903) | §2.5 — the E1-pressure wall classification (the 3-mitigation ladder) | the DXY TP = 100.845; the chained LONG Δ≤3p; the EU TP 1.14095 unchanged |
| W6 THE SANITY + THE SINGLE-SOURCE | mirror.ts (the picker :1389-1711/:1507-1525) · zone-classification.ts (:49/:102/:145) · zone-pressure.ts (:268) · reasoning-chain.ts (:520-575/:544) · ob-engine.ts (:399/:459) · bom-mom.ts (:118) | §2.6 + §2.7 — the rung-validity gate, the all-4 single-source, the ratio, the BoM-gate, the 30m force, the windows | the degenerate rejected; the all-4 single-sourced; diag-lexicons 38 |
| W7 THE WIRING | engine.ts · reason-step-a.ts · reason-step-b.ts · gate-tool.ts | §2.8 — the RC-1..RC-6 deltas | diag-step-tools 31; diag-grounding-warn 23; the registry intact |
| W8 THE GOLDEN RE-RUN | the diag + the probe (no source changes) | the convergence 5/5 + the canon docs | exit 0 · 5/5 at ≤3p · determinism ×2 · the frozen pair · tsc 0 · the wall ≤5min |

## THE GATE TO CLEAR (per wave)
The zero-trust battery (tsc 0 · bun build · the frozen pair sha256 · the wave's diag exit 0 · the report determinism ×2 · the golden-convergence table · the wall ≤5min · the grep gates (0 fetches · 0 ratio-extension · `priorDayClose\|1783702800000` = 0 in the designation path) · the diff review of EVERY changed line · the wave audit at .trident/wave-audit/).

## THE TEST PLAN THAT DEFINES DONE (the §4 fixtures — the replay tests from the real failures)
F-1 the DXY Monday 101.14 designation · F-2 the GU Monday LONG direction · F-3 the swept-shelf TP 100.845 · F-4 the side types · F-5 the degenerate-rung rejection · F-6 the temporal anchor · F-7 the pressure sign · F-8 the EU control (≤3p, never degraded) · F-9 the 0.5-pip pair — each with the pass/fail tokens in the spec §4.

## THE RISK REGISTER (what could go wrong + the mitigation)
1. The designation rewrite drifts the GU lane (the ZR-7C reverted experiments — the GU Thu Δ22.8 / Fri Δ46.8) → the chain level = the internal-LQZ NEAR EDGE, never the zone center; A/B-measure + revert on regression.
2. The EU win regresses (the I2's nearest-zone promotion) → the F-8 control fixture.
3. The side-vote fix re-inverts (a one-file fix) → the W2 gate checks BOTH files.
4. The divergence flag-only re-seeds from the §9.1 comment → the fix edits the comment + the code TOGETHER.
5. The Friday-close anchor re-enters → the grep gate + the I-4 lesson.
6. The wave generator's LLM fails (the opencode-go 500/timeout) → the skill-template manual fill + the task tool direct dispatch (the firewall's remedy).
7. The frozen pair touched → never in a wave's file set; the sha256 pins.

## THE PROVIDER/MODEL
The session's working model: the free OpenCode Zen tier (the MiMo/DeepSeek free pins). The rate-limit switch law: on a 429/stall, switch in-session (OpenCode Go → OpenCode Zen → OpenRouter free → back). The dispatch: the task tool ONLY (D6).

---

## 2026-08-10 — THE CLEANUP SESSION DELTA (W2 + W1+W3 + W7 LANDED — W4 + W5+W6 PENDING)

- **W2 SHIPPED + VERIFIED** (the C-8 side-vote): the swept-side predicate in lmv.ts:700-724 + candle-pressure.ts:363-373 — the LMV oracle 7/7 (the 101.14 rung now SELL_SIDE), the lexicons 38/38, tsc 0, the frozen pair byte-identical. Audit: .trident/wave-audit/wave-w2-sidevote-2026-08-10.md.
- **W1+W3 EXECUTED (self-execution) + VERIFIED** (the temporal + the selection): ANALYSIS_POINT_MS = 1783317600000 in temporal.ts + report-v452.ts:106 + the diag + the probe (the 4 LSP errors fixed); the data-derived travel + the §8.1 union + the pressure-DESC + the position-from-the-open + the edge-distance + the evidence-confidence in shape-brain.ts; the probe's re-walk in lockstep (the FAITHFULNESS holds — the DXY Monday designates the operator's [101.027-101.153] zone). The golden gate G1-G10 10/10 + A1-A7 7/7 exit 0 at the NEW anchor.
- **W7 SHIPPED + VERIFIED** (the RC-1..RC-6 wiring): engine.ts + reason-step-b.ts — the analysisPointMs/placed context fields, assertNotPlaced (FROZEN_SNAPSHOT), the STEP A consumer (the designation drives the E2 keyZone), the STEP B consumer (the projections drive the E3 anchors), the divergence ledger field. diag-step-tools 31/31 · diag-grounding-warn 23/23 · tsc 0.
- **W4 + W5+W6 PENDING** — the dispatched agents returned EMPTY/INERT (the subagent dispatch is flaky; the W4/W5+W6 file sets are UNTOUCHED — the preflighted prompts on disk at /tmp/opencode/wave-w4.json + wave-w5w6.json). W4 = the direction + the macro-wins (the GU LONG + the EU SHORT restoration + the MACRO_DIVERGENCE store row — the C-5 kill, the SIX s9.1 comment sites + the code together). W5+W6 = the walls (the DXY TP = 100.845) + the sanity (the degenerate rung gate) + the single-source.
- **THE CONVERGENCE:** DXY LONG 100.945 Δ2.7p HIT (was Δ16.5p) · DXY SHORT 101.140 Δ6.9p (was Δ14.9p) · EU LONG Δ1.5p HIT · EU SHORT MISSING (the W4 target) · GU LONG Δ6.7p (the direction now LONG — the W4 level fix). 2/5 → the W8 target 5/5.
- **THE FAILURE RECORD:** the wave generator is BROKEN (its output polluted with its drafting scratchpad + the filepaths placeholder + the abort) — the full reproduction + the fix work order: context_management/Debug_Logs/WAVE_GENERATOR_FAILURE_LOG_2026-08-10.md. The full-codebase slop scan (259 findings): the DEBUG_LOG D64 entry (MASTER_CONTEXT/PLUTUS_V4.5.2_OVERHAUL_DEBUG_LOG.md) + the wave audit .trident/wave-audit/wave-scan-2026-08-10.md.
- **THE GATE'S CWD QUIRK:** the wave-audit gate reads process.cwd() = /home/leviathan/OPENCODE_WORKSPACE/.trident/wave-audit/ — the audits must ALSO be written there (the project .trident/wave-audit/ is the record, the cwd path is the gate's read).
- **THE NEXT SESSION:** the POST-COMPACTION_PROMPT.md (this file) is the full entry — the 5-line proof, the landed waves, the pending W4/W5+W6 (the spec §2.4/§2.5/§2.6/§2.7 contracts), the convergence tracker, the doctrine, the battery, the do-nots.

## THE MACHINE C WAVE PLAN (the next session's execution — the C-1..C-4 waves)

### C-1 — THE E2 DAY-BAND FORWARD PROJECTION (the root fix)
- THE SITE: src/brains/shape-brain.ts:1616 `const dayOpenSpot = priorDayClose;` → `const dayOpenSpot = priorDayClose + (direction === 'LONG' ? travelMid : direction === 'SHORT' ? -travelMid : 0);`
- THE SCOPE: the forward-projected day-open (the design's :1539-1540) — the dayBandCarry then ADVANCES Mon→Fri.
- THE DONE-WHEN: the day decomposition's opens ADVANCE Mon→Fri (probe-verified) · the EU/GU zone ids POPULATE per day · tsc 0 (the FULL project) · the golden Monday's E2 ids POPULATED.
- THE BLAST RADIUS: shape-brain.ts only (the E2 source) — the consumers (Machine A's fallbacks + Machine B's report) automatically receive the populated ids.

### C-2 — THE ADM DELEGATION INTO THE E2-AUTHORITATIVE PATH
- THE SITE: report-v452.ts's E3 (the setup generation) → the ADM over the E2-designated zones.
- THE SCOPE: the same hybrid as the chain — the ADM verdict gate + the measured SL + the chain's proven computeLmvTP.
- THE DONE-WHEN: the Monday report path emits the golden 5 trades from the E2-designated zones (NO fallbacks) · the golden gate still 5/5 · the entries byte-identical to the locked checkpoint.

### C-3 — THE FULL-WEEK + THE DEDUP + THE FILL SIM
- THE SCOPE: the full-week run on the E2-authoritative path + trade-dedup (the key includes the day) + fill-sim.
- THE DONE-WHEN: the per-day varied trades (NO identical-every-day) · the dedup kills the duplicates · the outcome sim ≥ 90% wins on the real bars.

### C-4 — THE VERIFICATION BATTERY
- THE SCOPE: tsc (the FULL project) · the golden gate 5/5 · the LMV oracle 7/7 · the lexicons 40/40 · the step-tools 31/31 · the full-week report + the outcome audit · the frozen pair · the wave audit at BOTH paths.
- THE DONE-WHEN: ALL green + the per-trade rows verified against the raw bars.

### THE RISK REGISTER
1. The day-band fix shifts the Monday designation — the golden gate catches it (the design's Monday = the Friday close + travel).
2. The shape/direction mismatch is deeper — the C-1 probe-first discipline.
3. The ADM delegation re-introduces the chain's regression class — keep the proven computeLmvTP.
4. The dedup over-filters — the key includes the day.
5. The 90% target ambitious — the acceptance is the honest ≥ 90% on the designated (non-slop) trades.

### THE GATE: the operator's approval of the Machine C plan (the forensic audit is the plan).

## THE C-3 CONTINUATION (the next wave — after the D97 root-cause map)

### WAVE C-3B — THE ZONE-ANCHORED E2 SELECTION (the operator's "ZONE anchored not price anchored")
- THE PROBLEM: the E2's position-first leg (the C-2 fix) is PRICE-ANCHORED — the nearest substantial zone to the DAY'S PROJECTED OPEN. The operator's Tue-Fri reads are ZONE-ANCHORED — the STRUCTURAL pressure zones at their real prices (the BoM supply 1.14460-1.14625, the MoM 1.14295-1.14220, the 4H BoM 1.13885-1.13815) selected by the pressure/strength mechanics + the shape chain's logic, NOT the projected open's proximity.
- THE DONE-WHEN (the oracle acceptance — MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md): the machine's Tue-Fri designations match the operator's 15-trade oracle — the EU Tue S 1.14460 (not 1.14189), the EU Wed L 1.14020 (the chained BS TP), the EU Wed S 1.14295, the EU Thu L 1.14225, the EU Fri S 1.14555 (the chained Thu TP), the GU Tue S 1.33965, the GU Wed S 1.33660, the GU Wed L 1.33280, the GU Thu S 1.34260, the GU Thu L 1.33850, the GU Fri S 1.34500.
- THE MECHANISM: the structural ranking (the pressure/zfp/fortress mechanics — the operator's "pressure mechanics = semantic intent") ranks ABOVE the position-to-open for the Tue-Fri days; the chained entries (the "TP OF ONE = ENTRY OF NEXT" — the Wed L at the Tue BS's TP, the Fri S at the Thu L's TP) anchor the E2's designation.

### WAVE C-3C — THE GU SHORT-SIDE ADM GEOMETRY
- THE PROBLEM: the GU's Tue/Thu/Fri BS/WL SHORT days emit NOTHING — the GU's supply-side geometry (the E3 over the GU's designated supplies) fails the ADM's RRR gate (the measured SL too wide → the sub-3.0 RRR → the REJECT).
- THE DONE-WHEN: the GU Tue S 1.33965, the GU Wed S 1.33660, the GU Thu S 1.34260, the GU Fri S 1.34500 EMIT + clear the RRR floor (the SL depth refinement for the GU's zones — the same measured-SL class the EU's Monday needed).

### WAVE C-3D — THE DEDUP + THE FILL SIM
- trade-dedup.ts (the frozen pair — the day-keyed identity: pair|direction|anchorBucket|day) + fill-sim.ts over the full-week emissions.

### WAVE C-4 — THE VERIFICATION BATTERY
- tsc the FULL project (the 134 pre-existing harness errors) · the golden gate 5/5 · the full-week oracle acceptance (≥ 90% on the 15-trade read) · the wave audit at both paths · the canon docs · the checkpoint save.
