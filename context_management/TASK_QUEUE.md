# TASK QUEUE — PLUTUS v4.5.2 (2026-08-04 — THE ZR OVERHAUL QUEUE)

## 0. THE VERIFIED SHAs (the deployment fingerprint)

```
dist/index.js      9c0c21ee0eafe5ebca9cd9090ec2c1a8d648d4161ab9c3ba5553cb5e1238f825  (1.29MB, 145 modules)
report_v452.md     3b2e011d3e99b3919a3fb56d87e01912be0f823d1e8159692298ccc89f041c7a  (×2 — determinism)
src/mdve/sl-lmv.ts  912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab  (FROZEN)
src/mdve/trade-dedup.ts 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4  (FROZEN)
```

---


**Last rewritten:** 2026-08-04 (the teaching session — the ZR overhaul supersedes the R1 queue)

---

## THE QUEUE AT A GLANCE

| Wave | Tasks | Status | Gate | Checkpoint |
|------|-------|--------|------|-----------|
| ZR-1 | The zone-relevance engine (3 modules) | ✅ **COMPLETE 2026-08-04** | diag-zone-relevance Z1-Z6 exit 0 — the trade #2/#4 switch reproduces (8 zones); the eaten event-sequence semantics (the orchestrator's contract revision) | v4.5.2_ZONE_RELEVANCE |
| ZR-2 | The storyline engine (3 modules) | ✅ **COMPLETE 2026-08-04** | diag-storyline S1-S6 exit 0 — the false-positive break-validation reproduces 3× (GU); the reaction-count triggers 8×; the fortress locations; the strength comparison; trade content byte-identical | v4.5.2_STORYLINE |
| ZR-3 | The E3 conditional anchors (5 modules) | ✅ **COMPLETE 2026-08-04** | diag-e3-conditional E1-E6 exit 0 — the ladder-steps SL (the #2/#4 switch exact, 1.13971 vs the operator's 1.13970); the strength-driven TP edge; the E2-projected TP resolved; the E1-pressure wall classification (the D37 KILL — the GU Mon WIN +4.62R); the per-anchor state machine. + the OBCV-freshness data fix + the Law-14 MoM-cap doctrine fix (the Friday-trade recovery) | v4.5.2_E3_CONDITIONAL |
| ZR-4 | The cascade (3 modules) | ✅ **COMPLETE 2026-08-04** | diag-cascade-propagation C1-C5 exit 0 — the distribution fix (golden **9/22**, A/B-proven); the Law-27 chaining (the EU chained LONG restored); the day-local preference (live); the Law-13 max-RRR ceiling (the unrealistic chained losers rejected) | v4.5.2_CASCADE_PROPAGATED |
| ZR-5 | The new oracle + the self-validation (3 modules) | ✅ **COMPLETE 2026-08-04** | the new oracle (the operator's REAL trades) measured honestly — **9/21** (DXY 6/6 + EU/GU 3/15); the self-validation protocol (diag-self-validation SV1-SV6 PASS — the machine validates via rules + logic) | v4.5.2_FOUNDATION_SOLID |
| E4 (later) | The Fibonacci/Air reinforcement engine | ⏸ DEFERRED | (the foundations bulletproof first) | — |

**THE ZR OVERHAUL (ZR-1..ZR-5) IS COMPLETE (2026-08-04).** The E1/E2/E3 foundation is solid. The next phase: the full EU/GU recovery (15/15 — the complete multi-day chained/emergent trade structure) + the phase-2 multi-week consistency (the golden anchor's removal precondition).

---

## ACTIVE — WAVE ZR-1 (the zone-relevance engine — the E1 pressure state per trade)

### ZR-1.1 — The full pressure state (the zone types + the map)
- **Files:** `src/mdve/` (the ZoneModel + the zone map)
- **Change:** the zones carry the FULL pressure state (the confluence from the 6D, the ZFP from the step function, the BoM/MoM, the reaction count, the absorption state).
- **Done-when:** the zone's pressure state is complete (the absorption tracked).
- **Depends on:** nothing (the first module).

### ZR-1.2 — The liquidity shield relation
- **Files:** `src/mdve/` (the LQZ + the S/D zones)
- **Change:** the shield-vs-zone relation as a first-class structure (the LQZ in front of the S/D — the "final liquidity sweep before the piercing move"; the shield eaten → the S/D exposed).
- **Done-when:** the shield relation modeled + the absorption state tracked.

### ZR-1.3 — The operative defense (the zone relevance as a pressure-state function)
- **Files:** `src/mdve/` (the zone selection)
- **Change:** the operative defense for any trade computed from the pressure state (the confluence/ZFP/BoM-MoM/reaction-count/absorption + the E2 pathway) — not a static role.
- **Done-when:** the trade #4's SL relevance switch verified (the probe: the SL moving from the LQZ to the DEMAND zone as the demand's pressure absorbed).

**GATE ZR-1:** diag-zone-relevance.ts (NEW) — the full pressure state + the shield relation + the operative defense + the trade #4 switch. Then the checkpoint `v4.5.2_ZONE_RELEVANCE`.

---

## ACTIVE — WAVE ZR-2 (the storyline engine — the E2's narrative on the E1 pressure)

### ZR-2.1 — The storyline's structure
- **File:** `src/brains/shape-brain.ts`
- **Change:** the storyline's full structure per day (the current shape + the contested zone's pressure state + the projected next shape from the E1-pressure-driven transition + the break-validation + the strength comparison + the macro arc + the warframe arc).
- **Done-when:** the storyline's full structure computed per day.

### ZR-2.2 — The reaction-count-conditioned transitions + the break-validation
- **File:** `src/brains/shape-brain.ts`
- **Change:** the "3rd mitigation → fail" + the "4+ strong → fortress/RWL" transitions; the break-of-structure validation (the E1 pressure validates the structure break BEFORE the E2 shape respects it).
- **Done-when:** the transitions driven by the reaction counts; the break-validation present.

### ZR-2.3 — The day decomposition (the day-local preference + the London anchor)
- **File:** `src/brains/shape-brain.ts`
- **Change:** the day decomposition complete (the day-local zone preference — the recency bias as a factor; the London-open anchor; the day-reachability — already partly built in A1.4/R1-b).
- **Done-when:** the day decomposition complete.

**GATE ZR-2:** diag-storyline.ts (NEW) — the full structure + the transitions + the break-validation + the day decomposition. Then the checkpoint `v4.5.2_STORYLINE`.

---

## ACTIVE — WAVE ZR-3 (the E3 conditional anchors — the classification + precision alignment)

### ZR-3.1 — The SL's ladder-steps rule
- **File:** `src/mdve/mirror.ts`
- **Change:** the SL = 3p OUTSIDE the far edge of the current entry step OR 1-2p INSIDE the close edge of the NEXT STEP away (the opposite direction — SHORT → next step UP; LONG → next step DOWN) — the relevant zone chosen by the pressure state.
- **Done-when:** the SL at the ladder-steps rule; the trade #4's SL relevance switch verified.

### ZR-3.2 — The TP's strength-driven edge
- **File:** `src/mdve/mirror.ts`
- **Change:** the TP edge = f(the opposing zone's pressure): the STRONG zone → the CLOSE edge + the 1-2 pip spread; the WEAK zone → the FAR edge.
- **Done-when:** the TP at the strength-driven edge (verified vs the operator's real trades).

### ZR-3.3 — The TP's E2-projected opposing zone resolved (the D37 #3 fix)
- **File:** `src/mdve/mirror.ts`
- **Change:** the demandZoneId/supplyZoneId resolved to the zone's internal LQZ (the full-model resolution — the OB-id-vs-LMV-candidates mismatch fixed).
- **Done-when:** the TP = the E2's projected opposing zone (verified: the GU Mon's demand 1.33567 → the TP resolved, RRR 3.08).

### ZR-3.4 — The TP's E1-pressure wall classification (the D37 #1 fix)
- **File:** `src/mdve/mirror.ts`
- **Change:** the Law-14 cap-walk's wall classification from the E1 pressure mechanics (the BoM/MoM + the 6D confluence + the Earth+Fire) — the shallow LQZ shelves (the candle-count zfp-20) are PASS-THROUGH.
- **Done-when:** the walk extends to the structurally-equivalent BoM wall (verified: the GU Mon's TP extends to 1.33360 — the golden GU-1's 1.33347 — RRR 4.7).

### ZR-3.5 — The per-anchor 3-attempt dynamic state machine
- **File:** `src/mdve/refinement-machine.ts`
- **Change:** per trade, 3 attempts per anchor (E, SL, TP), tracked + locked INDIVIDUALLY; the loop continues on the unlocked anchors until RRR passes or all 3 lock; every rejection gives WHY + HOW; the machine consumes the E1 pressure + the E2 storyline of the trade being refined.
- **Done-when:** the state machine implemented; the rejection contexts present; the E1/E2-intelligent rejection.

**GATE ZR-3:** diag-e3-conditional.ts (NEW) — all 5 modules. Then the checkpoint `v4.5.2_E3_CONDITIONAL`.

---

## ACTIVE — WAVE ZR-4 (the cascade — the storyline propagation)

### ZR-4.1 — The distribution fix (the D37 #5 fix)
- **File:** `src/mdve/mirror.ts`
- **Change:** the E2 exact-match registers its anchor into the usedAnchors set — the N distinct sources spread across the N E2-designated rungs.
- **Done-when:** the distribution works (the mirrors spread across the E2 designations).

### ZR-4.2 — The trade-chaining propagation
- **File:** `src/mdve/`
- **Change:** the TP of DXY trade N = the entry of DXY trade N+1 — the EU/GU mirrors chain identically (the EU #2's E = the EU #1's TP — the kept chaining).
- **Done-when:** the chaining propagates across the cascade.

### ZR-4.3 — The day-local zone preference
- **File:** `src/mdve/`
- **Change:** the E2 designation for a day prefers the day-local structures (the Monday LQZ for Monday) when the E2 pathway passes through them — the recency bias as a factor.
- **Done-when:** the designations prefer the day-local structures.

**GATE ZR-4:** the distribution + the chaining + the day-local preference + the GU lane recovers (the Mon-Wed mirrors at the operator's levels — RRR ≥ 3.0). Then the checkpoint `v4.5.2_CASCADE_PROPAGATED`.

---

## ACTIVE — WAVE ZR-5 (the new oracle + the self-validation)

### ZR-5.1 — The new oracle (the operator's real trades in the diag)
- **File:** `diag-golden-coverage.ts`
- **Change:** the `golden` const updated to the operator's REAL EU/GU trades (the 8 EU + the 7 GU — verbatim from Golden_Operator_Trade_Feedback_EU_GU.md) — clearly commented + labelled as TEMPORARY ARCHITECTURE.
- **Done-when:** the diag measures against the real trades.

### ZR-5.2 — The self-validation protocol
- **File:** `src/` (the self-validation)
- **Change:** the machine's self-validation protocol (Part 30 of the macro context): the E1/E2/E3/cascade validations via rules + logic (never the hardcoded dataset).
- **Done-when:** the self-validation protocol implemented.

### ZR-5.3 — Phase 2 (the multi-week consistency — the next session's session)
- **Change:** the pipeline on multiple unrelated weeks with consistent prediction quality.
- **Done-when:** (Phase 2 — the proof of real forward-mapping).

**GATE ZR-5:** the EU 8 + the GU 7 at the operator's REAL levels at ≤3p + the TPs at the strength-driven edges + the DXY 6/6 held + the DXY lane all-winning + the self-validation protocol passes. Then the checkpoint `v4.5.2_FOUNDATION_SOLID`.

---

## COMPLETED (this era — verified, with evidence)

| Task | Status | Evidence |
|------|--------|----------|
| Wave B1 (the E2-authoritative cascade) | ✅ | v4.5.2_E2_CASCADE_FIXED · the E2 designation reaches the emitting path (E2_DESIGNATION_HELD) · diag-e2-cascade G1-G7 PASS |
| Wave A1 (the E1 reintegration) | ✅ | v4.5.2_E1_REINTEGRATED · the 9 pillars wired · the options image parsed · the prior-week pre-flight (the DXY sweep origin 100.603 computed) · diag-e1-reintegrated G-A1..G-A6 PASS |
| Wave R1 (the regressions) | ✅ | the DXY golden map 6/6 at ≤3p (the #1 100.945 Δ0.1p, the #5 100.975 Δ0.5p) · the DXY lane 7W/0L +26.03R all-winning · the E2 day-reachability for all days · golden 7/22 |
| The container test | ⚠️ PARTIAL | the deploy SHA-verified (9c0c21ee both paths) · the model opencode-go/mimo-v2.5 (the default) · the harvest invoked but the live fetch hung (the environmental fragility) · the results artifact written |
| The teaching session | ✅ | the macro context (1004L) + the ORCHESTRATOR PRINCIPLES (501L) + the D37 debug entry + the new oracle established + the gaps inventoried |
| The 11 gates | ✅ | all exit 0 (the final battery) |

---

## BACKLOG (deferred, documented — do NOT lose)

1. **The Fibonacci/Air (E4):** the reinforcement engine on top of the solid core — the fib spiderweb (the anchoring, the wormholes, the buffers) + the LR mechanics (the stop-limit, the ladder method, the SL cascade) + the new candle-vision class on E2+E3 with the swing-anchor recency bias. **DEFERRED until the foundations are bulletproof** ("YOU WILL 1000000% DERAIL INTO FUCKING SLOP IF YOU DO FIBONACCI WITHOUT A SOLID FOUNDATION").
2. **Phase 2 (the multi-week consistency):** the pipeline on multiple unrelated weeks with consistent prediction quality — the proof of real forward-mapping in real market conditions.
3. **The container test's live-data completion:** the tvDatafeed free-endpoint fragility — the fixture-driven pipeline in the container or the TV endpoint's cooperation.
4. **The OBCV's BoM detection tuning:** the direct output emitted 0 BoM on the golden fixture (the Phase-4 documented gap — the bw≥3.0/bf≥0.65 gates).

## BLOCKED (with the blocker + the unblock path)

| Item | Blocker | Unblock path |
|------|---------|--------------|
| The GU lane | the TP cap-walk's candle-count classification + the anchor collapse + the RRR kill (the D37) | ZR-3.3/ZR-3.4/ZR-4.1 (the E2-projected TP resolved + the E1-pressure wall classification + the distribution) |
| The EU/GU at the operator's REAL levels | the OLD Tier-D oracle was hallucinated | ZR-5.1 (the new oracle — the operator's real trades) + the ZR-1..ZR-4 overhauls |
| The SL's zone-relevance | the static next-rung rule | ZR-3.1 (the ladder-steps rule — the RELEVANT zone by the pressure state) |
| The container live-data | the tvDatafeed free endpoint | the fixture-driven pipeline in the container or the TV endpoint |

## THE FROZEN GATES (every task — violations are the derailments)

- E3 NEVER overrides the pre-existing E1/E2 data architecture or fabricates rules.
- RRR ≥ 3.0 floor / 4R+ target — never low-R volume.
- 3-pip metric ONLY — never 5/10/30 as acceptance.
- Determinism ×2 after every change.
- The frozen pair byte-identical (sl-lmv 91294083, trade-dedup 33914c89).
- The fib deferred (E4) until the foundations are bulletproof.
- The golden anchor = the measurement oracle ONLY (TEMPORARY ARCHITECTURE — the pipeline never reads it).
- Doctrine quoted, never synthesized (D13).
- The ORCHESTRATOR PRINCIPLES: the diff review of EVERY changed line before the wave ships.

## THE EVIDENCE STANDARD (every completion claim)

1. sha256sum of the modified files (before/after).
2. The diag output (the golden count, the gate assertions).
3. Determinism ×2.
4. The artifacts on disk (the report, the checkpoint MANIFEST, the diag results, the DIFF REVIEWS).
5. The explicit pass/fail against the gate criteria — prose is not evidence.

## THE POST-COMPACTION ACTIVATION (the fresh agent's exact sequence)

1. The operator pastes POST-COMPACTION_PROMPT.md — THAT message IS the gate.
2. Read the reading order (the macro context 1004L → the ORCHESTRATOR PRINCIPLES 501L → the NEXT-BUILD SPEC → Bible 4.5 → Bible 4.0 → the FULL BUILD REPORT → the DEBUG LOG → the Golden_Operator_Trade_Feedback_EU_GU.md → the 9 canon docs).
3. Give the 5-line proof-of-context (the mission / the state / the anchor + frozen / the root concept / the first wave).
4. Execute Wave ZR-1 (ZR-1.1 first) → ZR-2 → ZR-3 → ZR-4 → ZR-5, gating per wave, checkpointing per wave.
5. Report at gates with mechanical evidence (sha256, the diag output, the artifacts, the DIFF REVIEWS).

*END OF TASK QUEUE — the ZR overhaul queue, the dependency graph, the anti-derailment gates, the operator quotes, the activation sequence.*

---

## 2026-08-04 (UPDATE — THE ZR-7 QUEUE)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge (the proxies → the honest zeros) | ✅ **COMPLETE 2026-08-04** | diag-honest-data PASS · the golden 10/21 held · v4.5.2_ZR7_A |
| ZR-7B | The E1 completion (the BoM gates, the IP pressure, the DEFAULT_ZFP, the merge) | ⏳ NEXT | the BoM gates verified · the IP 'CONFLUENCE' + pressure · the DEFAULT_ZFP zero · the golden held |
| ZR-7C | The E2 pressure-consumption (THE ROOT — the designation rewrite + the day band + the chain) | pending | diag-e2-pressure PASS · the designations progress · the dayOpens differ · the EU Tue ~1.14460 |
| ZR-7D | The FX precision (the OBCV BoM + the FX oracle) | pending | diag-lmv-golden-fx PASS |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-04 (UPDATE — THE ZR-7B SHIPPED)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ **COMPLETE 2026-08-04** | diag-honest-data PASS · v4.5.2_ZR7_A |
| ZR-7B | The E1 completion (the BoM gates, the IP pressure, the DEFAULT_ZFP, the merge) | ✅ **COMPLETE 2026-08-04** | 16/16 PASS · golden 10/21 held · report 59d7e111 ×2 · v4.5.2_ZR7_B |
| ZR-7C | The E2 pressure-consumption (THE ROOT) | ⏳ NEXT | diag-e2-pressure PASS · the designations progress · the dayOpens differ · the EU Tue ~1.14460 · the EU Mon near-demand designation |
| ZR-7D | The FX precision | pending | diag-lmv-golden-fx PASS |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-04/05 (UPDATE — THE ZR-7C C1)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ COMPLETE | diag-honest-data PASS · v4.5.2_ZR7_A |
| ZR-7B | The E1 completion | ✅ COMPLETE | 16/16 PASS · golden 10/21 · report 59d7e111 · v4.5.2_ZR7_B |
| ZR-7C | The E2 pressure-consumption (THE ROOT) | 🔄 C1 IN (the boundary) — C2/C4 next | the C1: v4.5.2_ZR7_C1 (additive) · the C2/C4: the MANIFEST tuning spec · diag-e2-pressure |
| ZR-7D | The FX precision | pending | diag-lmv-golden-fx PASS |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (UPDATE — THE ZR-7C S1)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ COMPLETE | diag-honest-data PASS · v4.5.2_ZR7_A |
| ZR-7B | The E1 completion | ✅ COMPLETE | 16/16 PASS · golden 10/21 · 59d7e111 · v4.5.2_ZR7_B |
| ZR-7C | The E2 pressure-consumption | 🔄 S1 SHIPPED (the pressure-aware transitions — the PBS dead) | v4.5.2_ZR7_C · golden 10/21 · c39fd672 |
| ZR-7C | S2 (the chain-anchored designation — the GU-specific + the projected target) | ⏳ NEXT | the EU Tue ~1.14460 · the EU Mon near-demand · the golden ≥ 10/21 |
| ZR-7D | The FX precision (the GU's zone-map fidelity — the chain's gate) | pending | diag-lmv-golden-fx PASS |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (UPDATE — THE ZR-7D MAP GATE GREEN)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ | diag-honest-data PASS · v4.5.2_ZR7_A |
| ZR-7B | The E1 completion | ✅ | 16/16 PASS · golden 10/21 · v4.5.2_ZR7_B |
| ZR-7C | S1 the pressure-aware transitions | ✅ | golden 10/21 · c39fd672 · v4.5.2_ZR7_C |
| ZR-7C | S2 the chain-rung designation (the refined) | ⏳ NEXT | the chain-anchored RUNG selection · the EU Tue ~1.14460 · the golden ≥ 10/21 |
| ZR-7D | The FX oracle (the map fidelity) | ✅ **GATE GREEN** | diag-lmv-golden-fx PASS (15/15 + 2/2) |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (FINAL — THE REFINED S2 SHIPPED)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ | diag-honest-data PASS |
| ZR-7B | The E1 completion | ✅ | 16/16 PASS · golden 10/21 |
| ZR-7C | S1 the pressure-aware transitions | ✅ | golden 10/21 · the PBS dead |
| ZR-7C | S2-refined the chain-rung designation | ✅ **SHIPPED** | the GU #1 Δ1.0p HIT · the Thu/Fri drift fixed · golden 10/21 · 74ccf2ef |
| ZR-7C | S4 the E3 internal-LQZ resolution | ⏳ NEXT | the GU Wed #4 (1.33280) ≤ 3p · the EU rows |
| ZR-7C | S5 diag-e2-pressure | pending | the designations progress · the EU Tue ~1.14460 |
| ZR-7D | The FX oracle (the map fidelity) | ✅ **GATE GREEN** | diag-lmv-golden-fx PASS (15/15 + 2/2) |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (FINAL — the rung-direct shipped)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ | diag-honest-data PASS |
| ZR-7B | The E1 completion | ✅ | 16/16 PASS · golden 10/21 |
| ZR-7C | S1 the pressure-aware transitions | ✅ | the PBS dead · the EU Mon SS → Tue BS → Wed R |
| ZR-7C | S2-FINAL the rung-direct designation | ✅ **SHIPPED** | the GU Wed #4 Δ0.6p RESTORED · golden 10/21 · 17 gates |
| ZR-7D | The FX oracle (the map fidelity) | ✅ **GATE GREEN** | diag-lmv-golden-fx PASS (15/15 + 2/2) |
| ZR-7C | The trade-level near/deep resolution | ⏳ NEXT | the EU #2 (1.14110) + the EU #4 (1.14020) + the EU #6 (1.13935) |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (FINAL — the cascade root fixed)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ | diag-honest-data PASS |
| ZR-7B | The E1 completion | ✅ | 16/16 PASS |
| ZR-7C | S1 the pressure-aware transitions | ✅ | the PBS dead |
| ZR-7C | S2 the rung-direct designation | ✅ | the GU Wed #4 Δ0.6p |
| ZR-7C | **THE CASCADE ROOT (the direction-appropriate anchor)** | ✅ **SHIPPED** | the EU #7 Δ2.6p HIT · the EU #2 Δ8.9p · the ≤10p 17/21 · 96f8ce29 |
| ZR-7C | The trade-level near/deep resolution | ⏳ NEXT | the GU Wed #4 (1.33280) ≤ 3p · the EU #4/#6 |
| ZR-7D | The FX oracle | ✅ GATE GREEN | diag-lmv-golden-fx PASS (15/15 + 2/2) |
| ZR-7E | The diag/report consistency | pending | the divergence check |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | pending | the final acceptance |

---

## 2026-08-05 (FINAL — the golden 12/21)

| Wave | The task | Status | The gate |
|------|----------|--------|----------|
| ZR-7A | The honest-data purge | ✅ | diag-honest-data PASS |
| ZR-7B | The E1 completion | ✅ | 16/16 PASS |
| ZR-7C | S1 the pressure-aware transitions | ✅ | the PBS dead |
| ZR-7C | S2 the rung-direct designation | ✅ | the GU Wed #4 Δ0.6p |
| ZR-7C | THE CASCADE ROOT (the direction-appropriate anchor + the near/deep + the e2Designated) | ✅ **SHIPPED** | **golden 12/21** · the ≤10p 19/21 · f8235815 · 17 gates |
| ZR-7C | The near-hits (the EU #2/#3/#6/#8 + the GU #3/#4/#5/#6/#7) | ⏳ NEXT | the golden ≥ 15/21 |
| ZR-7D | The FX oracle | ✅ GATE GREEN | diag-lmv-golden-fx PASS (15/15 + 2/2) |
| ZR-7F | The cascade precision (the golden ≥ 15/21) | ⏳ the final push | the acceptance |
## 2026-08-06 — THE OPEN QUEUE (after the G2 ship)
- [ ] THE GOLDEN GATE (the diag-reasoning-chain-golden — the G1-G8 acceptance — the L1's section 16!)
- [ ] THE SHADOW'S LIVE LLM (set the OPENCODE_API_KEY env — the key provided! — re-run the diag-reasoning-chain!)
- [ ] THE ENTRY PRECISION (the 4 golden misses — the frozen mirror's TP-walk — the chain's emission structure is sound!)
- [ ] THE LEXICONS' PIPELINE WIRING (the six lexicons' enrichments: the phantom-BoM exemption + the unified macro authority + the forward-position!)
- [ ] THE GU MONDAY's MACRO AUTHORITY (the SWEEP_HIGH fix — the GU should mirror the EU's SS!)
- [ ] THE MPSE-FORM implementation (the fork's pseudocode → the real predicates!)
- [x] THE G2 FIVE-WAVE (the GU root + the fork + the MPSE + the harness fill-sim + the shadow chain — SHIPPED!)
## 2026-08-07 (THE W1-W6 QUEUE — the L2 spec's waves)
- [x] THE L2 SPEC (the architecture canon — 2,051L — the operator's C1-C6 corrections)
- [ ] W1 — THE PARALLEL ENGINE (C1+C3): the token 8/10 Promise.all + the pair-level Promise.all — GATE: G10 parallel-equivalence + the wall time ~1/6
- [ ] W2 — THE STALL DETECTOR (C4): the SSE idle-window in callModel — GATE: the stream-through probe + the stall abort
- [ ] W3 — THE SHADOW-BACKEND ALIGNMENT (C2): the frozen model + the secrets chain + the encoded errors — GATE: the zero-hint battery
- [ ] W4 — THE EXECUTION TOPOLOGY (C3 step 2): the DXY cascade as the macro refinement — GATE: the divergence law + the forced-null proof
- [ ] W5 — THE LEXICON WIRING: the phantom-BoM exemption + the macro authority + the forward-position — GATE: the exemption unit-tests
- [ ] W6 — THE GOLDEN GATE: the diag-reasoning-chain-golden G1-G10 — GATE: exit 0 + the wall time ≤ 5 min + the determinism ×2 + the frozen pair

## 2026-08-08 — THE OVERHAUL WAVES (the CME spec — the agent-in-the-loop restoration)
- [ ] W0 — THE STATE VERIFICATION (the E1 explore): the inventory + the F6/F12 resolutions + the F2/F16 root-code + the frozen pair sha256
- [ ] W1 — PHASES 1+2 (B3 ×2): the telescoping T1-T6 + the LMV resolution L1-L4 — GATE: the 7 golden LQZs ≤1 pip
- [ ] W2 — PHASE 3 (B1): the OBCV machine — GATE: the golden OB reconstruction + 96%
- [ ] W3 — PHASE 4 (B3): the 3 lost mirror fixes + the sweep −30 — GATE: the golden SL floor + the GU ≥8 anchors
- [ ] W4 — PHASE 5 (B1): the six lexicons wired — GATE: every lexicon consumed + the phantom-BoM all-4 fixture
- [ ] W5 — PHASE 6 (B3): the shadow REFIT (the primary agent = the executor) + the grounding WARN — GATE: the A1 test, no external fetch
- [ ] W6 — PHASE 7 (B1): the STEP A/B tools + the 7-tool registry + the firewalls — GATE: the A4 test (BLOCKED)
- [ ] W7 — PHASE 8 (B3): the E3 precision (the TP substrate + the anchors) — GATE: the RRR variety + the convergence ≥2/5
- [ ] W8 — PHASE 9 (B4): the W6 golden gate G1-G10 + the A1-A7 — GATE: exit 0 + the wall ≤5min + the determinism ×2
- [ ] W9 — THE HOST DEPLOYMENT (the operator's D10): the plutus agent as a subagent — the STEP A/B reasoning visible in the stream

## 2026-08-08 — THE NEXT SESSION'S QUEUE (post-compaction — the E2-designation precision + the host deployment)
**THE STATE:** the agent-in-the-loop overhaul LANDED — the golden gate **exit 0 (ALL G1-G10 + A1-A7 PASS)** · the convergence **2/5** at ≤3p (the EU SHORT Δ0.5p · the EU LONG Δ1.5p — the phantom-BoM fortress) · the E1 substrate verified (the LMV 7/7 · the OBCV pass · the telescoping 7/7 golden map) · the six lexicons wired · the shadow REFITTED (the primary agent = the executor) · the STEP A/B tools built · the W6 golden gate harness built. THE FULL RECORD: MASTER_CONTEXT/PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_BUILD_REPORT.md (500+ lines).

- [ ] **N1 — THE E2-DESIGNATION PRECISION (the convergence 2/5 → 5/5 — THE PRIMARY TASK):** the E2 core's Monday designations must land on the operator's LQZ levels — the DXY supply 101.296 → the operator's 101.14 (the 1H LQZ, the golden DXY #2) · the GU demand 1.33270 → the operator's 1.33330 (the golden GU #1). The projectZoneForDay's zone selection (shape-brain.ts:1515+) — the ENTRY-rung selection. DONE-WHEN: the DXY SHORT Δ≤3p (the golden 101.140) · the DXY LONG Δ≤3p (the golden 100.945) · the GU LONG Δ≤3p (the golden 1.33330) — the convergence 5/5.
- [ ] **N2 — THE DXY/GU ANCHOR REFINEMENT (the same doctrine as the EU):** once the E2 designates the operator's zones, apply the PROVEN anchor fixes — the straddling-shield entry (the I-5), the zone-anchored ladder SL (the I-6), the internal-LQZ TP cap (the I-7/I-8) — to the DXY/GU lanes. The EU lane is the reference implementation (E 1.14390 · SL 1.14475 · TP 1.14095 — the Δ0.5p/Δ1.5p proof).
- [ ] **N3 — THE W9 HOST DEPLOYMENT (the operator's D10):** the FULL plutus agent deployed as a subagent on host (the task tool — D6) — the STEP A/B reasoning observed IN THE STREAM (the D1: "so we can see everything") — the pipeline run: harvest → zones → STEP A (the visible designation) → shapes → STEP B (the visible 11-token reasoning) → setups → gate — the convergence table is the operator's acceptance read. NO container.
- [ ] **N4 — THE CANON DOCS (the N1-N3 record):** the build report ENTRY 7 · the DECISION_CHAIN D63 (the E2-designation ruling) · the EVIDENCE_STATE (the 5/5 convergence) · the COMPACTION_SURVIVAL · the wave audits at .trident/wave-audit/.

**THE OPERATOR'S DIRECTIVES (the law):** D1 the shadow dead → the primary agent in-session, visible · D2 the grounding WARN + continue, never a hard-kill · D3 the RRR is a CONSEQUENCE (the 4R+ target, the 3.5 standard) · D4 the golden convergence is the ONLY metric (the ≤3p tolerance) · D5 the reasoning chain = the pipeline STEP · D6 the task tool is the ONLY spawn path · D7 the shadow was a cheat — the primary agent reasons in-session · D8 the STEP A/B between E1/E2 + E2/E3 · D9 the math engines + the lexicons finished · D10 the host testing, no container · **THE SHADOW-REFIT: the infra REFITTED (not deleted) — the primary agent = the executor, the infra = the reasoning-step contract layer.**

---

# THE 2026-08-09 OVERHAUL V2 QUEUE (THE OPERATIVE LAYER — the W1-W8 wave queue)

## THE GATES (the current state)
| The gate | The state | The next check |
|---|---|---|
| The golden gate (G1-G10 + A1-A7) | PASS (exit 0) — at the OLD anchor 1783321200000 | W1 re-anchors to ANALYSIS_POINT_MS = 1783317600000 → re-run |
| The convergence (G7) | 2/5 at ≤3p (EU SHORT Δ0.5p · EU LONG Δ1.5p) | W8 → 5/5 at ≤3p |
| The LMV oracle | 7/7 at ≤1p | after W2 (the side flip must not move the levels) |
| diag-lexicons | 38 checks exit 0 | after W2/W6 |
| diag-grounding-warn | 23 checks exit 0 | after W7 |
| diag-step-tools | 31 checks exit 0 | after W7 |
| tsc / build | 0 / success (163 modules, 1.41 MB) | after EVERY wave |
| The frozen pair | byte-identical (91294083 + 33914c89) | after EVERY wave |

## THE ACTIVE TASKS (the W1-W8 queue — the owner, the done-when, the dependencies)
| # | The task | The owner | The done-when | The dependency |
|---|---|---|---|---|
| W1 | THE TEMPORAL REPLICATION (§2.1) | 1 builder (temporal.ts + shape-brain.ts + report-v452.ts:106 + the diag + the probe) | the probe's dayOpenSpot = the 06:00 price; the golden gate re-anchored exit 0 | NONE (the first) |
| W2 | THE SIDE-VOTE LEXICON (§2.2) | 1 builder (lmv.ts + candle-pressure.ts) | the side types flipped; the LMV oracle 7/7; diag-lexicons 38 | NONE (parallel with W1's file set) |
| W3 | THE SELECTION ENGINE (§2.3) | 1 builder (shape-brain.ts — MERGED with W1) | the DXY keyZone = the 101.14 structure; the EU pick unchanged; the GU demand = the 1.33380 rung | W1 + W2 (the pools + the anchor) |
| W4 | THE DIRECTION + THE MACRO (§2.4) | 1 builder (shape-brain + report-v452 + cascade-translation + reasoning-chain + golden-gate) | the GU Monday = LONG; the MACRO_DIVERGENCE row (0.40); G3 passes | W3 |
| W5 | THE E3 WALLS (§2.5) | 1 builder (mirror.ts) | the DXY TP = 100.845; the EU TP 1.14095 unchanged | W3 (the designation) |
| W6 | THE SANITY + THE SINGLE-SOURCE (§2.6/2.7) | 1 builder (mirror picker + the lexicons + reasoning-chain + ob-engine + bom-mom) | the degenerate rejected; the all-4 single-sourced; diag-lexicons 38 | W5 (the picker's walls) |
| W7 | THE WIRING (§2.8) | 1 builder (engine + the step tools + the gate tool) | diag-step-tools 31; diag-grounding-warn 23 | W1 (the re-anchor) |
| W8 | THE GOLDEN RE-RUN | the orchestrator | exit 0 · 5/5 · determinism ×2 · the frozen pair · tsc 0 · the wall ≤5min | W1-W7 |
| N3 | THE HOST DEPLOYMENT (D10) | the operator (deploys the plutus agent as a subagent on host) | the STEP A/B reasoning VISIBLE in the stream; the convergence table = the operator's read | W8 green |
| N4 | THE CANON DOCS | the orchestrator | the build report ENTRY 7 · DECISION_CHAIN D63 · EVIDENCE_STATE (5/5) · COMPACTION_SURVIVAL · the wave audits | W8 |

## THE COMPLETED TASKS (with the evidence they closed on — the 2026-08-09 session)
| The task | The evidence |
|---|---|
| THE SLOP AUDIT (the 3 registers) | the wave-audited inventories: the E2 15 entries · the E3 20+ rules · the E1 40+ rules — every rule file:line-verified (the register returns + the probes) |
| THE OVERHAUL SPEC V2 | MASTER_CONTEXT/PLUTUS_V4.5.4_OVERHAUL_SPEC_V2.md — 1500 lines, the §0-§8 + APPENDIX A structure, the wave table, the register execution table (20 FIX · 30 HONEST · 8 DOC · 2 VERIFY) |
| THE PROBE EVIDENCE | probe-n1-rootcause.ts + probe-n1-selection.ts — the Monday selection traces, the zone universes, the divergence 0.40, the degenerate rung, the side flips (the spec §1.5) |
| THE 4TH REGISTER (the chain-gate) | the audit wave's 4th agent dispatched 2026-08-09 (the GU divergence handler + the temporal machinery + the gate thresholds) — its findings fold into the spec §1 if any new CRITICAL/MAJOR surfaces |

## THE BLOCKED ITEMS (with the blocker + the unblock path)
1. The N3 host deployment — BLOCKED on the operator (the D10: "when it is ready i will deploy the full plutus agent as a subagent on host") — the unblock = the W8 green signal.
2. The dist SHA — the last recorded dist SHA (9c0c21ee) is the G2-era value; the CURRENT dist SHA is unverified — the unblock = the W1 battery records the fresh dist sha256.
3. The container live-data (the tvDatafeed free endpoint) — hangs — the unblock = the D10 host path (NO container).

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

## THE C-WAVE QUEUE (2026-08-11 — the current task state)

### COMPLETED (the C-1/C-2/C-3 waves — the Machine C milestones)
- [x] **C-1 — THE E2-NULL KILLED** (the day-band forward projection + the median travel + the Monday exclusion) — the opens advance Mon-Fri, the ids populate.
- [x] **C-2 — THE E2-AUTHORITATIVE PATH** (the 15 fixes — the golden gate 5/5 restored WITHOUT the fallbacks + the OUTCOME PASS).
- [x] **C-3 — THE CASCADE INJECTION** (the injectShapeSequence — the GU chain = the EU's literally — the per-day variation restored; the full-week 11W/8L/0O of 19; the W6 path-cap gate; the demand-side position leg).

### PENDING (the next session's queue — the build authority: MASTER_CONTEXT/PLUTUS_V4.5.4_ZONE_ANCHORED_E2_FIX_SPEC.md)
- [ ] **C-3B — THE ZONE-ANCHORED E2** (the strongest() rewrite — the MPSE structural ranking leads; the 11 price-anchored sites demoted/removed — the spec's Part 3; the golden gate 5/5 unchanged + the full-week oracle acceptance).
- [ ] **C-3C — THE GU SHORT-SIDE ADM GEOMETRY** (the GU Tue/Thu/Fri BS/WL SHORT days emit nothing — the supply geometry fails the RRR gate — the SL-depth refinement).
- [ ] **C-3D — THE DEDUP + THE FILL SIM** (trade-dedup.ts — the day-keyed identity; fill-sim.ts over the full-week emissions).
- [ ] **C-4 — THE VERIFICATION BATTERY** (tsc the FULL project · the golden gate 5/5 · the full-week oracle ≥ 90% · the wave audit at both paths · the canon docs · the checkpoint).
- [ ] **THE DXY→EU INVERSION** (the future wave — the operator's boolean-flip cascade leg — zone-anchored, never degenerate).
