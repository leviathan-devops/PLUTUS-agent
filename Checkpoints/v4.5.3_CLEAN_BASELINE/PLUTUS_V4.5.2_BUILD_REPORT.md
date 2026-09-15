# PLUTUS v4.5.2 — THE FULL BUILD REPORT (the iteration journey + the conclusive root macro bug) (the 4.5.2 iteration journey + THE CONCLUSIVE ROOT MACRO BUG)

**Date:** 2026-08-05 · **Status: THE BUILD REPORT OF THE ENTIRE 4.5.2 ITERATION — the conclusive root macro bug identified, fixed, and documented — the v4.5.3 differentiator.**

---

# PART 1 — THE EXECUTIVE SUMMARY (the one-page truth)

## THE CONCLUSIVE ROOT MACRO BUG (bolded, underlined — THE ROOT CAUSE OF 15+ DERAILMENTS)

> **THE CASCADE'S SIDE-INVERSION — the operator's "supply → demand and demand → supply, dxy supply → eu demand and vice versa" — was structurally IGNORED at EVERY E3 layer by THREE stacked single-designation-era checks. The LONG mirrors anchored the SUPPLY instead of the demand for the entire 4.5.2 iteration — the EU/GU trades could NEVER match the DXY cascade.**

**THE ROOT OF THE ROOT:** the E2-authoritative exact-match was built on 2026-08-01 when the E2 emitted ONE designation per day (the keyZoneId). The ZR-6D wave (2026-08-04) added the dual-side designations (demandZoneId/supplyZoneId + keyZoneType) — **but the E3 consumers were never updated to consume them direction-appropriately.** The data model EVOLVED; the consumers DIDN'T. A contract-drift derailment: the architecture's contract changed, and every consumer that still read the old single field silently bypassed the cascade's core mechanic.

## THE BLAST RADIUS (every downstream mechanism the bug poisoned)

1. **The anchor match** (selectPairNativeZone:1429-1456) — the LONG mirrors anchored the day's PRIMARY (the SHORT's supply!) — the wrong side.
2. **The e2Designated gate** (mirror.ts:3180) — the direction-appropriate anchors fell to the defendedEdge FALLBACK — the resolution silently bypassed.
3. **The entry resolution** (e2ZoneResolvedEntry:2416) — the deep internal rung's ceiling instead of the demand's near edge.
4. **The NARRATIVE_SUPPRESSED false positives** (§7.2 mirror.ts:3527-3542) — the wrong-side LONG at 1.14608 (ABOVE the spot!) fought the week's bearish break → suppressed (RRR 0.00) — the correct demand-side LONG (1.14110 — BELOW the spot!) does NOT fight it.
5. **The diag assertions** (diag-e2-cascade, diag-e1-reintegrated, diag-golden-coverage) — measured the wrong-side emissions for the entire iteration.
6. **The golden composition** — the EU #2/#4/#6 LONG rows (the DXY SHORT sources' inverses!) could never land — the ≤3p count stuck at 9-10/21 through 15+ iterations.
7. **The E2-side tuning illusions** — 15+ iterations tuned the E2's designation (the pressure-sort, the chain, the day-local) — NONE could fix the E3 mirror's wrong-side anchoring — the E2-side was largely correct; the E3 mirror never consumed it correctly.

---

# PART 2 — THE 4.5.2 ITERATION JOURNEY (the wave-by-wave chronicle)

## 2.1 The pre-ZR-7 state (the 2026-08-01 audit's findings)
- The 2026-08-01 audit found: the E2's designations were advisory, not authoritative; the TP walk's wall classification was candle-count-derived (the D37); the diags measured a different E1 than the report shipped.
- The D37 root cause (the GU RRR collapse): the TP's OB-id-vs-LMV-candidates mismatch + the zfp-20 cap-walk — the E3's structural-TP resolution.

## 2.2 The ZR-6 waves (the E3-side fixes — 2026-08-04)
- **ZR-6A:** the E2's zone anchors only (the prices removed from the E2 — "prices are not even a variable for E2") — the E3 computes the prices.
- **ZR-6B:** the E3's price resolution (e2ZoneResolvedEntry — the internal-LQZ near edge!).
- **ZR-6C:** the refinement rebuild + the floor 2.5.
- **ZR-6D:** the cascade structure + the signal-time fix + the chaining depth 3.
- **ZR-6E:** the fill model (the session brackets + the weekend close).
- The ZR-6 era's golden: 10/21 — the DXY 6/6 + the EU Mon SHORT + the EU Wed #5 + the GU Tue #2 + the GU Wed #4.

## 2.3 The 2026-08-04 root-cause diagnosis (the operator's challenge)
- The operator demanded WHY the cascades don't map all the golden trades. The C3 diag: "all 13 designations are older than the day-local window" — the E2's designations reused across days (the zfp-first strongest()).
- THE MISDIAGNOSIS (recorded honestly): the session concluded the E2's designation selection was the root (the zfp-first vs the chain progression) — the ZR-7 spec's DERAILMENT-1 (the E2 pressure-blindness) — and spent the ZR-7's iterations on the E2-side.

## 2.4 The ZR-7 waves (the E1/E2 restoration — 2026-08-04/05)
- **ZR-7A (shipped):** the honest-data purge — the 9-pillar proxies deleted (the P3/P4/P7/P9 → the PILLAR_X_NO_DATA honest zeros + the provenance firewall). The golden 10/21 held.
- **ZR-7B (shipped):** the E1 completion — the BoM gates (bw≥3.0/bf≥0.65 — the ZERO TOLERANCE) in all lanes + the IP zones' 'CONFLUENCE' + the DEFAULT_ZFP kill + the LQZ×IP merge wiring. The golden 10/21 held (the composition shifted: the EU Wed #4 lost + the GU Wed #4 gained — the gates' canon-correct re-classification of the DXY supply [101.110-101.275], bf=0.61).
- **ZR-7C S1 (shipped):** the pressure-aware transitions (predictNextShapePressureAware — the DEPLETED/BROKEN/FORTRESS/VIRGIN contested-zone laws — the operator's "THIRD mitigation fails", "the fortress flips", "WL → RWL") — the stuck-PBS DEAD — the EU chain Mon SS → Tue BS → Wed R. The golden 10/21 held.
- **ZR-7C S2 experiments (measured + reverted ×4):** the pressure-sort (the EU Tue Δ3.4p but the GU Wed #4 lost — the S/D-BoM +105 vs the rungs +55); the chain +100 at 15p/5p (the GU drift — the wrong zones admitted); the chain-rung (the GU #1 Δ1.0p HIT but the gates broke — the pressure-sort's designation change). The internalLqzNearEdge helper + the rung-direct designation kept.
- **ZR-7C S2-rung-direct (shipped):** the designation prefers the LMV rungs (the operator's entries ARE the LQZ rungs!) — the GU Wed #4 restored Δ0.6p.
- **ZR-7D (the FX oracle gate — GREEN):** diag-lmv-golden-fx — the operator's levels vs the machine's rungs — **15/15 + 2/2 at ≤3p/≤5p — THE MAP CONTAINS THE OPERATOR'S LEVELS — PROVEN.**

## 2.5 THE BREAKTHROUGH (2026-08-05 — the conclusive root)
- The operator's fury + the decisive trace (probe-root.ts): the EU Mon LONG mirror anchored at the SUPPLY 1.14469 (Δ49.8p) + NARRATIVE_SUPPRESSED.
- The three stacked keyZoneId-only checks identified + fixed:
  1. The anchor exact-match → the direction-appropriate (the LONG → demandZoneId!).
  2. The entry resolution → the zone-top (the near edge!) + the shape-driven deep (the RWL/R → the deep rung).
  3. **THE UNLOCK — the e2Designated gate → the direction-appropriate** — the demand anchors finally USE the resolution!
- **THE GOLDEN: 10 → 12/21 · the ≤10p 19/21 · all 17 gates PASS · determinism f8235815 ×2.**

---

# PART 3 — THE ROOT MACRO BUG IN FULL (the definitive documentation)

## 3.1 What it is (the precise mechanism)

The E3 mirror's anchor selection consumed the E2's designation through THREE checks — the anchor exact-match, the e2Designated gate, and (indirectly) the entry resolution's activation — each of which compared against the **keyZoneId** (the day's PRIMARY designation) REGARDLESS of the mirror's direction. For a LONG mirror (the inverse of a DXY SHORT source!), the correct designation is the **demandZoneId** (the day's demand-side designation). The keyZoneId-only checks made the LONG mirrors anchor the day's PRIMARY — on the golden week's SHORT-designated days, the SUPPLY. The operator's cascade law — "supply → demand" — was never honored.

## 3.2 How it slipped through (the timeline)

1. **2026-07-31 (the E2-cascade era):** the E2 emitted ONE designation (the keyZoneId) — the exact-match's design was correct for its era.
2. **2026-08-01 (the "E2 DESIGNATES, E3 OBEYS" ruling):** the exact-match made authoritative — still keyZoneId-only — correct for the single-designation era.
3. **2026-08-04 (ZR-6D):** the dual-side designations (demandZoneId/supplyZoneId/keyZoneType) added to the E2's output — the ShapeDayZone contract EXPANDED — **the E3 consumers were not updated.**
4. **2026-08-04/05 (the 15+ iterations):** every E2-side tuning (the pressure-sort, the chain, the day-local, the rung-direct) was measured against the golden — the LONG rows could never improve because the mirror anchored the wrong side — **the E2-side tuning was orthogonal to the actual root.**
5. **2026-08-05 (the decisive trace):** the probe exposed the wrong-side anchor — the root identified in minutes after 15 iterations of the E2-side.

## 3.3 Why it exists (the deeper cause)

**The contract-drift pattern:** the data model (the ShapeDayZone) evolved from single-designation to dual-designation WITHOUT a mechanical contract check on the consumers. The E2's output grew the demandZoneId/supplyZoneId fields; the E3's consumers (written for the older contract) read only the keyZoneId — TypeScript's optional fields made the drift invisible (no compile error — the demandZoneId was just never read). The codebase had NO invariant asserting "the LONG mirror's anchor ∈ {the day's demand-side designations}" — the wrong-side anchoring was structurally legal.

## 3.4 Why it wasn't detected till now

1. **The gates measured the OUTPUTS** (the golden count, the determinism) — the wrong-side anchors still produced emissions (at the wrong levels) — the gates passed.
2. **The diag assertions were keyZoneId-era** (the e2-cascade's EU Mon SHORT — the SHORT side worked! — the LONG side's assertions were weaker/absent).
3. **The E2-side's visible symptoms** (the reused designations, the frozen day band, the degenerate chain) DOMINATED the analysis — the "obvious" root — while the E3 mirror's wrong-side anchor was invisible without the full-path trace.
4. **The DXY lane worked** (the source lane reads the E2 directly!) — the cascade's failure was EU/GU-specific — the wrong-side anchoring only manifested in the mirror lanes.

## 3.5 The blast radius (the complete downstream map)

| The mechanism | The effect | The fix |
|---|---|---|
| selectPairNativeZone's exact-match | the LONG mirrors anchor the SUPPLY | the direction-appropriate designation |
| The e2Designated gate | the direction-appropriate anchors → the defendedEdge fallback (the resolution bypassed!) | the direction-appropriate comparison |
| e2ZoneResolvedEntry | the deep rung's ceiling vs the near edge | the zone-top (the near) + the shape-driven deep |
| The §7.2 narrative gate | the wrong-side LONG's counter-structure suppression (the false positive) | FIXED BY THE ANCHOR (the demand-side LONG doesn't fight the break!) |
| The diag assertions | measured the wrong-side emissions | the direction-appropriate updates |
| The golden's LONG rows | could never land | fixed |
| The E2-side tuning (15+ iterations) | orthogonal — could not fix the E3 root | the probe-first discipline |

---

# PART 4 — THE MENTAL FRAMEWORKS FOR FUTURE ENGINEERING (so this NEVER happens again)

## FRAMEWORK 1 — THE CONTRACT-DRIFT DETECTOR
**When the data model evolves (a new field, a new designation side), EVERY consumer of the OLD contract must be mechanically audited.** The rule: after ANY contract expansion, grep every consumer of the expanded type + verify each reads the direction-appropriate fields. The ShapeDayZone's dual-side expansion should have triggered an immediate audit of the mirror's anchor selection — it didn't.

## FRAMEWORK 2 — THE SIDE-INVERSION INVARIANT
**The cascade's inverse is the ZONE-SIDE inversion — NOT a level flip.** The invariant: for every mirror, `the anchor's side == the source's side INVERTED` (the DXY supply → the EU demand! the DXY demand → the EU supply!). Any code path that can't satisfy this invariant is structurally broken. Add the assertion: a LONG mirror's anchor MUST be a DEMAND-side zone; a SHORT mirror's anchor MUST be a SUPPLY-side zone — the wrong-side anchor = a hard error, not a silent emission.

## FRAMEWORK 3 — THE PROBE-FIRST DISCIPLINE (the 15-iteration lesson)
**When the metric doesn't move after 2-3 iterations, STOP tuning the current layer and TRACE the FULL path end-to-end.** The 15 iterations of E2-side tuning were orthogonal to the E3 mirror's root. The decisive probe (the DXY source → the EU mirror → the anchor → the entry — the FULL path!) found the root in minutes. The rule: the trace BEFORE the tuning — the full path's data at every hop — ALWAYS.

## FRAMEWORK 4 — THE BOTH-SIDES TEST
**Every directional mechanic must be tested on BOTH sides.** The golden's SHORT side worked (the EU Mon SHORT Δ0.5p!) while the LONG side was broken (the Δ49.8p!) — the both-sides test would have caught the asymmetry immediately. The rule: every cascade mechanic's acceptance = the SHORT side AND the LONG side both landing.

## FRAMEWORK 5 — THE GATE-AS-CONTRACT (the diag assertions)
**The gate diags must assert the DIRECTION-APPROPRIATE contracts.** The e2-cascade's EU Mon SHORT assertion (the SHORT side!) passed while the LONG side's wrong-side anchor was unasserted. The rule: every gate that asserts a mirror's level must assert BOTH directions.

---

# PART 5 — THE v4.5.3 DIFFERENTIATOR (the clean baseline)

## 5.1 THE DIFFERENTIATOR (bolded, underlined)

> **v4.5.2 → v4.5.3: THE CASCADE'S SIDE-INVERSION HONORED AT EVERY LAYER — the direction-appropriate designation consumption (the LONG → demandZoneId, the SHORT → supplyZoneId) — the core macro architecture bug that kept the EU/GU mirrors from matching the DXY cascade for the entire 4.5.2 iteration.**

## 5.2 The v4.5.3 state (the verified fingerprint)

```
report_v452.md     f82358156329b07751777ee3a9354ae2832cf3b2488ee3c05acfc85280404314  (×2 — determinism)
golden ≤3p: 12/21 (from 10!) · ≤5p 16/21 · ≤10p 19/21
all 17 gates PASS (incl. diag-lmv-golden-fx — 15/15 + 2/2)
frozen: sl-lmv 91294083 · trade-dedup 33914c89 (byte-identical)
```

## 5.3 The v4.5.3 checkpoint

`Checkpoints/v4.5.3_CLEAN_BASELINE/` — the src + the report + the diag-lmv-golden-fx + the E2E WIRING SPEC + the MANIFEST — the clean reload anchor for the next session.

---

# PART 6 — THE NEXT SESSION'S COMPACTION PREP (the full continuation)

## 6.1 The reading order (the mandatory direct reads)
1. THIS BUILD REPORT (the root + the blast radius + the frameworks).
2. `MASTER_CONTEXT/PLUTUS_V4.5.2_ZR7C_E2E_WIRING_SPEC.md` (the shape-wave logic + the stages).
3. `MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md` (the oracle).
4. The canon docs (COMPACTION_SURVIVAL + DECISION_CHAIN + NEXT_STEPS + EVIDENCE_STATE + FAILURE_LOG + SoC_PRESERVATION — ALL carry the breakthrough).

## 6.2 The next wave (the near-hits — the golden ≥ 15/21)
1. **The demand pick at the operator's exact LQZ** (the EU #2 Δ4.4 — the rung-selection's near-edge-aware sort: the pick should prefer the rung whose TOP lands at the operator's entry — the 1.14100 over the 1.14120!).
2. **The supply-side symmetry** (the EU #3 Δ3.4 + the EU #8 Δ6.1 + the GU #3/#5/#7) — the SHORT mirrors' near-edge mechanics.
3. **The deep-demand anchors** (the EU #6 Δ7.8 + the GU #4 Δ4.3) — the deep rung selection.
4. **The STALE-10 hygiene** (the fill model's expiry classification).
5. **The golden ≥ 15/21** — the ZR-7F's acceptance → the phase-2 multi-week validation.

## 6.3 The operating rules (the frameworks enforced)
- The side-inversion invariant (Framework 2) — every mirror's anchor side = the source's INVERTED.
- The probe-first discipline (Framework 3) — the full-path trace BEFORE the tuning.
- The both-sides test (Framework 4) — every mechanic asserted on BOTH directions.
- The contract-drift detector (Framework 1) — every contract expansion audits the consumers.
- The gate-as-contract (Framework 5) — the diags assert the direction-appropriate contracts.

---

# PART 7 — THE COMPLETE DOCUMENTATION STATUS (the operator's "every relevant doc has FULL CONTEXT")

| The doc | The content | Status |
|---|---|---|
| context_management/FAILURE_LOG.md | DERAILMENT-2026-08-05 (the inverse-cascade anchor inversion) + DERAILMENT-2026-08-05B (the three stacked keyZoneId-only checks) — the ROOT + the lesson | ✅ updated |
| context_management/EVIDENCE_STATE.md | the breakthrough's mechanical evidence (the trace + the fixes + the measured gains) | ✅ updated |
| context_management/SoC_PRESERVATION.md | the patterns to preserve (the side-inversion at every layer + the shape-driven near/deep + the FX proof + the probe-first) | ✅ updated |
| context_management/COMPACTION_SURVIVAL.md | the full story (what was wrong + what is right + the next steps) | ✅ updated |
| context_management/DECISION_CHAIN.md | the D50/D51/D52 rulings (the side-inversion discipline + the shape-driven entry + the 12/21 state) | ✅ updated |
| context_management/NEXT_STEPS.md | the tangible ordered next steps (the near-hits + the supply symmetry + the deep anchors + the STALE hygiene + the 15/21) | ✅ updated |
| Checkpoints/v4.5.3_CLEAN_BASELINE/ | the clean reload anchor (src + the report f8235815 + the diag + the spec + the MANIFEST) | ✅ created |
| THIS BUILD REPORT | the full 4.5.2 journey + the conclusive root + the blast radius + the frameworks | ✅ written |

*END OF THE PLUTUS v4.5.3 BUILD REPORT — the 4.5.2 iteration's conclusive root macro bug: the cascade's side-inversion ignored at every E3 layer by three stacked single-designation-era checks. The v4.5.3 differentiator: the direction-appropriate designation consumption. The mental frameworks: the contract-drift detector, the side-inversion invariant, the probe-first discipline, the both-sides test, the gate-as-contract. The golden: 10 → 12/21 with the ≤10p 19/21. The full cascade's next steps documented. Doctrine is QUOTED, never synthesized.*

---

# PART 2B — THE 4.5.2 ITERATION JOURNEY — THE FULL WAVE-BY-WAVE CHRONICLE (the complete detail)

## 2B.1 The pre-ZR-7 forensic baseline (2026-08-01 — what the audit found)

The 2026-08-01 audit (the NON_NEGOTIABLE_ORCHESTRATOR_PRINCIPLES' origin) exposed the deep-seated problems:
- **The R1 wave's logic flaws shipped** (the RWL bounce-inset hardcoding the operator's level, the zfp-20 cap-walk collapse, the SL probe-floor widening) — the gates passed while the logic was derailed — the output-only audit's failure.
- **The D37 derailment** (the GU RRR collapse): the TP's OB-id-vs-LMV-candidates mismatch + the candle-count zfp-20 wall classification — the E3's structural-TP resolution broken.
- **The E2's designations were advisory, not authoritative** — the cascade picked the strongest zone, not the operator's level.
- **The diag/report divergence** — the gates measured a DIFFERENT E1 than the report shipped.
- The operator's 2026-08-01 mandate: the proper subagent management + the diff review of EVERY changed line — the ORCHESTRATOR PRINCIPLES born.

## 2B.2 The ZR-6 waves (the E3-side — 2026-08-04 — the day-by-day)

### Wave ZR-6A — the E2 zone anchors only
- **The change:** shape-brain.ts's projectZoneForDay + buildDayDecomposition STOP computing the prices — the ShapeDayZone carries the zone IDs + the day band + dayOpenSpot + session + confidence — the operator's "E2 generates SHAPE CHAIN from ZONE ANCHORS (prices are not even a variable for E2)".
- **The E3 consumers' contracts** (shape-cascade.ts:40-42, report-v452.ts:679-681) updated to the null-safe.
- **The measured:** the EU Mon SHORT now emits at Δ0.5p of the operator's 1.14395 (the E3's resolution from the zone's internal LQZ rung's near edge!).
- **The checkpoint:** v4.5.2_ZR6_A.

### Wave ZR-6B — the E3 price resolution
- **The change:** mirror.ts's e2ZoneResolvedEntry — the LMV anchor = its own rung's near edge; the OB anchor → the internal rung's near edge; no rung → the defendedEdge fallback + the center-keys from the zone geometry + the source-lane TP from the designated opposing zone's defendedEdge (setup-gen.ts:1040-1063).
- **The E2 exact-match AUTHORITATIVE** — the operator's "E2 DESIGNATES, E3 OBEYS".
- **The checkpoint:** v4.5.2_ZR6_BC.

### Wave ZR-6C — the refinement rebuild + the floor 2.5
- **The change:** refinement-machine.ts — the reach check (:628-640), the probe check (:702-717), the zone-distance check (:692-701), e2ProjectedPrice (:462-466) + storylineEvidence DELETED (1,749 → 1,674L); the genuine-violation rejections KEPT; the per-anchor 3-attempt state machine + RRR_TARGET 4.0 kept.
- **The floor 2.5:** trading-constants.ts — MIN_RRR_CONSTRUCTION 3.0→2.5, CHAIN_MIN_RRR_SUPPLEMENTARY 3.0→2.5, RRR_BY_CATEGORY all {2.5,2.5} — the Wednesday 2.7/2.9 trades now PASS.
- **The checkpoint:** v4.5.2_ZR6_D1 + v4.5.2_ZR6_D.

### Wave ZR-6D — the cascade structure
- **The distribution's D11 price-window gate REGRESSED the golden 10→9** (merged the distinct Wed trades within 15p!) — the orchestrator's surgical adjudication: REVERTED to the unconditional alt-retry + THE SIGNAL-TIME FIX (the pool preference passed the zone's weeks-old FORMATION time → switched to srcSignalMs the battleMs — the doctrine comment "Zones that reacted near the DXY SIGNAL time").
- **The C1 diag's faithful probe** (reAnchorMirror + the source setup + the shapeDay + the FULL historical exclusion set) verifies the piles as honest structural absences.
- **The chaining maxDepth 2→3** (the Wed triple + the Thu→Fri).
- **The E2's keyZoneType** (the RANGE-day primary side — the GU Fri SHORT) + deepDemandZoneId (the operator's #6's BoM-4H demand — the EU Wed deep demand 1.13815 emergent).
- **The checkpoints:** v4.5.2_ZR6_D1 + v4.5.2_ZR6_D.

### Wave ZR-6E — the fill model
- **The change:** report-v452.ts's sessionBracketOf — the expiry = the NEXT day's session start (the Friday/Sat/Sun → the weekend-close rule "no holding trades over the weekend"); the activation = the E2-designated session on the trade day; the 6h-deferral display-label bug fixed.
- **The measured:** STALE 5→3, the +2 headline wins (+4.56R +5.14R the operator's levels).
- **The checkpoints:** v4.5.2_ZR6_E + v4.5.2_ZR6_FINAL.

### The ZR-6 diag contract fixes (the orchestrator's surgical)
- diag-cascade-propagation.ts (the crash on the null keyZonePrice + the C1 ZR-6D doctrine correction + the faithful structural probe), diag-review-stage.ts (the Fri EU SHORT: the anchor = the designation + the entry inside the zone's band), diag-e1-reintegrated.ts G-A4 (the direction+day pattern + the operator's 1.14395 ±3p band), diag-e2-cascade.ts G2/G5 (the null-price assertions → the zone-geometry contracts).
- report-v452.ts:1251 ("the Friday close on Friday" → "the weekend-close rule").

## 2B.3 The 2026-08-04 root-cause diagnosis (the operator's challenge — the ZR-7's origin)

The operator demanded WHY the cascades don't map all the golden trades. The findings:
- **The E2's designation selection is zfp-first** (strongest() at shape-brain.ts:1318-1320 — `(a.zfp - b.zfp)` — the lowest-zfp strongest-defense wins, computed INDEPENDENTLY per day).
- **The machine's designations are 2-5 days OLD** (the C3 diag: "all 13 designations are older than the day-local window"); the operator's zones are the CHAIN PROGRESSION (the EU #2's E 1.14110 = the #1's TP; the #3's E 1.14460 = the #2's TP...) + the day-local formations.
- **THE MISDIAGNOSIS (recorded honestly):** the conclusion was the E2's designation selection = the root (the zfp-first vs the chain) — the ZR-7 spec's DERAILMENT-1 (the E2 pressure-blindness) — and 15+ iterations followed on the E2-side. The ACTUAL root (the E3 mirror's wrong-side anchoring) was invisible until the full-path trace.

## 2B.4 The ZR-7 waves (the E1/E2 restoration — 2026-08-04/05 — the complete detail)

### Wave ZR-7A — the honest-data purge (shipped)
- **The change:** 9-pillar-lobe.ts — the P3 Gamma-histogram (the GBP options — the fabricated "options-derived" levels!), the P4 HP-trend proxy (the fabricated "analyst" levels!), the P7 zone-clustering arena (the fabricated "derivatives" levels!), the P9 RegimeMA half-state — ALL DELETED → the `PILLAR_X_NO_DATA` honest zeros + the provenance tags + the buildIpZones firewall (the NO_DATA levels skipped — 602 IP zones all traceable).
- **The measured:** the GBP Options-Derived dim 1.0→0.0 · the golden 10/21 HELD (zero designation changes — the IP zones are confluence-only per DECISION-1) · determinism 66462bc0 ×2.
- **The operator's law (verbatim):** "GET THE CORRECT FUCKING DATA OR THROW ERROR. BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED BULLSHIT."
- **The checkpoint:** v4.5.2_ZR7_A + diag-honest-data.ts (the NEW gate).

### Wave ZR-7B — the E1 completion (shipped)
- **The BoM quality gates** (bw≥3.0/bf≥0.65 — the operator's ZERO TOLERANCE canon — Bible 4.0 §4.7) to the 4h-sd-lobe's classifyOrderBlock + the bom-mom's classifyBoMMoM (previously ONLY the OBCV had them!) — the partition BoM+MoM = total preserved; the zero-range NaN guard; the golden BoM reconstruction HOLDS.
- **The IP zones' honest classification:** 'MoM' → 'CONFLUENCE' + the honest minimal pressure state (the ZoneLifecycle union + 'CONFLUENCE').
- **The DEFAULT_ZFP=50 kill** (trading-constants.ts:917 + lqz-lobe.ts:526's fallback → the honest guard).
- **The LQZ×IP merge wiring** (the pillarEngine BEFORE buildChartModel — the ladder receives the real pillarResult!).
- **The E2-designation authority at the TP boundary** (the mirror's structuralOpposingLqz branch 1 — the direct rung designation = the authoritative terminal).
- **The T1 + review-stage diag contracts re-anchored** (the ZR-6-era precedent — computed, never weakened).
- **The measured:** the golden 10/21 HELD (the composition shifted — the EU Wed #4 lost its hit to the gates' canon-correct re-classification of the DXY supply [101.110-101.275] — its origin bf=0.61 < 0.65 — the operator's own ZERO TOLERANCE!) · the report 66462bc0 → 59d7e111.
- **The checkpoint:** v4.5.2_ZR7_B.

### Wave ZR-7C S1 — the pressure-aware transitions (shipped)
- **The change:** predictNextShapePressureAware — the operator's reaction-count + pressure-state laws layered on the ZFP-conditioned matrix:
  - The DEPLETED contested zone (the lifecycle-only check!) → the SS→BS, the BS→BS/R (step-indexed — the pierce in progress → the completion!), the R→BS, the WL→PBS.
  - The BROKEN/pierced contested → the SS→BS, the BS→BS/R (step-indexed), the R→BS — the zfp-driven BS→PBS over-escalation (the stuck-PBS: SS→BS→PBS→PBS→PBS!) KILLED.
  - The FORTRESS contested → the BS→R (the first contact → the recovery!), the R→WL (the recovery reaches the fortress → the whiplash!), the WL→RWL ("WL → RWL is a common shape chain for market reversals"!).
  - The VIRGIN/ACTIVE_1 contested → the BS→R, the R→WL.
  - The contested zone EVOLVES with the shape's directional target (the BS/PBS → the demand; the R/RS/WL/RWL → the supply!).
- **The measured:** the EU chain Mon **SS** → Tue **BS** → Wed **R** (the operator's shapes!) · the golden 10/21 HELD · the report 59d7e111.

### The ZR-7C S2 experiments (the measured + reverted ×4 — the tuning data)
1. **The pressure-sort alone:** the EU Tue Δ7.0 → Δ3.4p (improved!) BUT the GU Wed #4 lost (Δ0.6 → Δ8.0 — the S/D-BoM +105 vs the LMV rungs +55 — the pressureScore's S/D preference!) — net 9/21 — reverted.
2. **The chain +100 at 15p:** the EU Tue Δ3.4p held BUT the GU Thu Δ22.8 + the Fri Δ46.8 (the chain anchored at the zone CENTERS — the wrong levels!) — net 9/21 — reverted.
3. **The chain at 5p:** the EU Tue Δ7.0 (worse!) + the GU still drifting — net 9/21 — reverted.
4. **The chain-rung (the LMV rungs at the anchor — 8p):** the GU #1 Δ1.0p HIT + the Thu/Fri drift FIXED + the ≤10p 16/21 BUT the gates broke (the pressure-sort's designation change moved the Mon demand — the E2-CORE: the S/D 1.13911 vs the LMV 1.14120!) — the golden 10/21 — reverted (the gates!).
- **The KEPT:** the internalLqzNearEdge helper + the rung-direct designation.

### The ZR-7C S2-rung-direct (shipped)
- **The change:** the designation PREFERS the LMV rungs (the operator's entries ARE the LQZ rungs — "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor"!) when the day's reach contains one.
- **The measured:** the GU Wed #4 (1.33280) RESTORED to Δ0.6p · all 17 gates PASS · the golden 10/21.

### Wave ZR-7D — the FX oracle gate (GREEN)
- **diag-lmv-golden-fx.ts (NEW):** the operator's EU/GU levels vs the machine's LMV rungs — **15/15 ENTRIES + 2/2 TPs at ≤3p/≤5p — THE MAP CONTAINS THE OPERATOR'S LEVELS — the rungs at Δ0.5-1.0p!** The modal-cluster emission (the L1 — 2026-07-31) works!
- **THE PROOF:** the map was NEVER the blocker — the resolution was.

### The S4 entry-resolution experiments (the measured ×3 — the zone-band discovery)
1. **The LONG's edge fix** (the zone-top vs the zone-bottom for the rung selection): the EU #7's direction improved BUT the SHORT broke (the gates!) — reverted.
2. **The overlap filter** (the operator's LQZ rungs at the zone's edges — the strict containment excluded the rung 1.14100!): the EU #7 Δ2.6p direction BUT the SHORT-side Δ47-101p disasters (the wrong adjacent rungs admitted!) — reverted.
3. **The near-edge filter** (the rung's near edge within the zone's band ±2p): the SHORT still broken (the GU Tue Δ47.5!) — reverted to the strict containment.
- **THE DISCOVERY:** the machine's BUY_SIDE rung bands don't extend to the operator's LQZ near edges (the demand rungs stop at 1.14013!) — the ZONE-level entry (the demand's top!) ≈ the operator's near edge (Δ0.8p!) — the zone-level resolution, not the rung-level!

## 2B.5 THE BREAKTHROUGH (2026-08-05 — the conclusive root — the FULL forensic detail)

### The decisive trace (probe-root.ts — the full path)
```
EU Mon: SHORT E=1.14494 TP=1.13886 RRR=4.71 ACTIVE anchor=...1.14469   ← the operator's #1 (1.14395) Δ0.99p ✓
EU Mon: LONG  E=1.14608 TP=1.15230 RRR=0.00 NARRATIVE_SUPPRESSED anchor=...1.14469  ← the operator's #2 (1.14110) Δ49.8p ✗
```
- The EU Mon LONG's mirror (the DXY #2 Mon BS SHORT 101.14's inverse!) anchored at the **SUPPLY 1.14469** — the wrong side — Δ49.8p from the operator's 1.14110 — then NARRATIVE_SUPPRESSED (the §7.2 gate!).
- The demand rung **1.14100 band [1.14080,1.14120] BUY_SIDE** — its ceiling 1.14120 = **Δ1.0p of the operator's 1.14110** — IN THE MAP THE WHOLE TIME — never selected.

### The three stacked keyZoneId-only checks (the complete mechanism)
1. **selectPairNativeZone's exact-match (mirror.ts:1429-1456):** `if (z.id === shapeDay.keyZoneId) return z` — the keyZoneId = the day's PRIMARY designation (the SHORT's supply!) — for BOTH directions — the LONG mirror anchored the supply.
2. **The e2Designated gate (mirror.ts:3180):** `ctx?.shapeDay?.keyZoneId === anchorZoneId` — the check that decides whether the anchor IS the E2-designated zone (and thus uses the E2-resolution!) — also keyZoneId-only — every direction-appropriate anchor fell to the defendedEdge FALLBACK — **the entire resolution silently bypassed.**
3. **The entry resolution (e2ZoneResolvedEntry:2416):** the internal rung's ceiling (the deep 1.13961 — Δ15p!) vs the demand's near edge — the wrong edge for the entry.

### The fix sequence (each verified)
1. **The direction-appropriate anchor:** `e2MatchId = direction === 'LONG' ? (demandZoneId ?? keyZoneId) : (supplyZoneId ?? keyZoneId)` — the LONG mirrors anchor the DEMAND!
2. **The zone-top entry:** the LONG's entry = the demand zone's TOP (the near edge — the zone [1.13911,1.14118]'s top 1.14118 ≈ the operator's 1.14110 — Δ0.8p!) — the machine's BUY_SIDE rung bands don't reach the operator's LQZ — the zone-level resolution!
3. **The shape-driven deep:** the RWL/R/RS/PRWL → the deep internal rung (the operator's #4's E 1.14020 = the LQZ's far edge — the rung 1.14010's ceiling 1.14013 — Δ0.7p!) — the #6's deep LQ shield (the rung 1.13950's ceiling 1.13937 — Δ0.2p!).
4. **THE UNLOCK — the e2Designated gate's direction-appropriate check:** the demand anchors finally USE the resolution!
- **THE MEASURED:** the EU #4 (1.14020) Δ17.9 → **Δ0.7p HIT** · the GU #1 (1.33330) Δ3.0 → **Δ0.7p HIT** · the EU #2 Δ4.4 · the EU #3 Δ3.4 · the GU #4 Δ4.3 · the GU #6 Δ4.0 — **the golden 10 → 12/21 · the ≤10p 19/21 · all 17 gates PASS · determinism f8235815 ×2.**

### Why it exists (the contract-drift's full story)
- The 2026-07-31 E2-cascade era: the E2 emitted ONE designation (the keyZoneId) — the exact-match's design was correct for its era.
- The 2026-08-01 "E2 DESIGNATES, E3 OBEYS" ruling: the exact-match made authoritative — still keyZoneId-only — correct for the single-designation era.
- The 2026-08-04 ZR-6D: the dual-side designations (demandZoneId/supplyZoneId/keyZoneType) added to the ShapeDayZone — **the E3 consumers were never updated** — TypeScript's optional fields made the drift invisible (the demandZoneId was just never read — no compile error!).
- **The deeper pattern:** the codebase had NO invariant asserting "the LONG mirror's anchor ∈ {the day's demand-side designations}" — the wrong-side anchoring was structurally legal.

### Why it wasn't detected till now (the full analysis)
1. **The gates measured the OUTPUTS** (the golden count, the determinism) — the wrong-side anchors still produced emissions (at the wrong levels) — the gates passed.
2. **The diag assertions were keyZoneId-era** — the e2-cascade's EU Mon SHORT (the SHORT side!) passed while the LONG side's wrong-side anchor was unasserted.
3. **The E2-side's visible symptoms DOMINATED** (the reused designations, the frozen day band, the degenerate chain) — the "obvious" root — while the E3 mirror's wrong-side anchor was invisible without the full-path trace.
4. **The DXY lane worked** (the source lane reads the E2 directly!) — the cascade's failure was EU/GU-specific — the wrong-side anchoring only manifested in the mirror lanes.

### The blast radius (the complete downstream map)
| The mechanism | The effect | The fix |
|---|---|---|
| selectPairNativeZone's exact-match | the LONG mirrors anchor the SUPPLY | the direction-appropriate designation |
| The e2Designated gate | the direction-appropriate anchors → the defendedEdge fallback (the resolution bypassed!) | the direction-appropriate comparison |
| e2ZoneResolvedEntry | the deep rung's ceiling vs the near edge | the zone-top (the near) + the shape-driven deep |
| The §7.2 narrative gate | the wrong-side LONG's counter-structure suppression (the false positive) | FIXED BY THE ANCHOR (the demand-side LONG doesn't fight the break!) |
| The diag assertions | measured the wrong-side emissions | the direction-appropriate updates |
| The golden's LONG rows | could never land | fixed |
| The E2-side tuning (15+ iterations) | orthogonal — could not fix the E3 root | the probe-first discipline |
| The STALE classification | the fill model's expiry buckets shifted | the hygiene step |


---

# PART 4B — THE MENTAL FRAMEWORKS — FULLY DEVELOPED (with the worked examples)

## FRAMEWORK 1 — THE CONTRACT-DRIFT DETECTOR (the root-of-root's prevention)

**The principle:** when the data model evolves (a new field, a new designation side, a new enum member), EVERY consumer of the old contract must be mechanically audited — the audit is NOT optional, NOT "later".

**The worked example (this bug):** the ShapeDayZone's dual-side expansion (the demandZoneId/supplyZoneId/keyZoneType added in ZR-6D) should have triggered an immediate grep-audit of every `shapeDay.` read in the E3 consumers (mirror.ts's selectPairNativeZone, the e2Designated gate, the e2ZoneResolvedEntry). The audit would have found the keyZoneId-only reads INSTANTLY. It didn't happen.

**The mechanical procedure:**
1. After ANY contract expansion: `grep -rn "shapeDay\.\|\.keyZoneId\|\.demandZoneId\|\.supplyZoneId" src/` — every consumer listed.
2. For each consumer: verify it reads the direction-appropriate fields (the LONG mirror → the demandZoneId!).
3. The invariant assertion: the wrong-field reads = the audit FAIL.

## FRAMEWORK 2 — THE SIDE-INVERSION INVARIANT (the cascade's core mechanic)

**The principle:** the cascade's inverse is the ZONE-SIDE inversion — the DXY supply → the EU demand, the DXY demand → the EU supply — NOT a level flip. The operator (verbatim): "supply --> demand and demand --> supply dxy supply --> eu demand and vice versa this is clearly not fucking inverting correctly".

**The invariant:** for every mirror, the anchor's side == the source's side INVERTED. A LONG mirror's anchor MUST be a DEMAND-side zone; a SHORT mirror's anchor MUST be a SUPPLY-side zone. The wrong-side anchor = a hard error, NEVER a silent emission.

**The mechanical enforcement:**
1. The anchor selection's candidate pool = the direction-appropriate side ONLY (the LONG → the DEMAND pool!).
2. The post-selection assertion: `assert(anchor.side === (direction === 'LONG' ? DEMAND : SUPPLY))` — the wrong side throws.
3. The both-sides acceptance: every cascade mechanic's golden = the SHORT side AND the LONG side both landing.

## FRAMEWORK 3 — THE PROBE-FIRST DISCIPLINE (the 15-iteration lesson)

**The principle:** when the metric doesn't move after 2-3 iterations of the CURRENT layer, STOP tuning and TRACE the FULL path end-to-end. The 15+ iterations of E2-side tuning (the pressure-sort, the chain, the day-local, the rung-direct) were ORTHOGONAL to the E3 mirror's wrong-side anchoring — NONE could fix it.

**The worked example:** the decisive probe (the DXY source → the EU mirror → the anchor → the entry — the FULL path's data at every hop!) found the root in MINUTES after 15 iterations. The trace's output — "EU Mon LONG E=1.14608 anchor=...1.14469" — exposed the wrong-side anchor instantly.

**The mechanical procedure:**
1. The metric flat for 2-3 iterations → STOP.
2. The full-path probe: the source setup → the mirror construction → the anchor selection → the entry resolution → the emitted levels — EVERY hop's data printed.
3. The A/B: the probe with the suspected layer disabled → the diff.
4. The root found → the surgical fix → the FULL regression.

## FRAMEWORK 4 — THE BOTH-SIDES TEST (the asymmetry catcher)

**The principle:** every directional mechanic must be tested on BOTH directions. The golden's SHORT side worked (the EU Mon SHORT Δ0.5p!) while the LONG side was broken (the Δ49.8p!) — the both-sides test would have caught the asymmetry IMMEDIATELY.

**The mechanical procedure:**
1. Every gate's assertion: the SHORT-side level AND the LONG-side level BOTH asserted.
2. The golden's per-direction count: the SHORT hits vs the LONG hits reported separately.
3. A mechanic that works on ONE side only = a derailment signal.

## FRAMEWORK 5 — THE GATE-AS-CONTRACT (the diag assertions' direction-appropriateness)

**The principle:** the gate diags must assert the DIRECTION-APPROPRIATE contracts. The e2-cascade's EU Mon SHORT assertion (the SHORT side!) passed while the LONG side's wrong-side anchor was unasserted — the gate's blindness let the bug ship.

**The mechanical procedure:**
1. Every mirror-asserting gate: the LONG mirror's assertion checks the DEMAND-side level (the demandZoneId's resolution!).
2. The diag's source: the mirror's entry vs the operator's level — per direction.
3. The gate's FAIL when EITHER direction's mirror misses.

---

# PART 5B — THE v4.5.3 DIFFERENTIATOR — THE COMPLETE DOCUMENTATION

## 5B.1 THE DIFFERENTIATOR (bolded, underlined, in every doc)

> **v4.5.2 → v4.5.3: THE CASCADE'S SIDE-INVERSION HONORED AT EVERY LAYER — the direction-appropriate designation consumption (the LONG → demandZoneId, the SHORT → supplyZoneId) + the shape-driven near/deep entry resolution — the core macro architecture bug that kept the EU/GU mirrors from matching the DXY cascade for the entire 4.5.2 iteration, now fixed and verified.**

## 5B.2 The v4.5.3 verified fingerprint

```
report_v452.md     f82358156329b07751777ee3a9354ae2832cf3b2488ee3c05acfc85280404314  (×2 — determinism)
golden ≤3p: 12/21 (from 10!) · ≤5p 16/21 · ≤10p 19/21
all 17 gates PASS (incl. diag-lmv-golden-fx — 15/15 + 2/2)
frozen: sl-lmv 91294083 · trade-dedup 33914c89 (byte-identical)
anchor: Checkpoints/v4.5.3_CLEAN_BASELINE/
```

## 5B.3 The v4.5.3 shipped changes (the complete list)

1. **src/brains/shape-brain.ts:** the S1 pressure-aware transitions (predictNextShapePressureAware — the DEPLETED/BROKEN/FORTRESS/VIRGIN laws + the evolved contested zone + the step-indexed BS) · the S2-rung-direct (the LMV rung preference) · the internalLqzNearEdge helper + the chain carry (the additive).
2. **src/mdve/mirror.ts:** the direction-appropriate anchor (the e2MatchId!) · the e2Designated gate's direction-appropriate check (THE UNLOCK) · the e2ZoneResolvedEntry's zone-top + shape-driven deep · the structuralOpposingLqz branch-1 E2-authority.
3. **src/mdve/types.ts:** the DXYZone's E2ZoneInput contract (pressure/formationMs/reactionEvents) + the ZoneLifecycle 'CONFLUENCE'.
4. **report-v452.ts:** the toDxyZone's pressure mapping (both branches) · the IP zones' 'CONFLUENCE' + pressure · the pillarEngine-before-model merge wiring.
5. **src/constants/trading-constants.ts + src/brains/lqz-lobe.ts + src/brains/4h-sd-lobe.ts + src/mdve/bom-mom.ts:** the DEFAULT_ZFP kill + the BoM quality gates.
6. **diag-lmv-golden-fx.ts (NEW):** the FX oracle gate (15/15 + 2/2).
7. **diag-structural-tp.ts + diag-review-stage.ts + diag-cascade-propagation.ts:** the ZR-7-era contract re-anchors.

---

# PART 6B — THE NEXT SESSION'S COMPACTION PREP — THE COMPLETE CONTINUATION

## 6B.1 The near-hits (the golden ≥ 15/21 — the exact steps)

### Step 1 — THE DEMAND PICK AT THE OPERATOR'S EXACT LQZ (the EU #2 Δ4.4)
- **The mechanism:** the E2's demand designation = the rung 1.14120 (its top 1.14154!) vs the operator's LQZ [1.14110-1.14020] — the pick should prefer the rung 1.14100 (its top 1.14120 — Δ1.0p of the operator's 1.14110!).
- **The fix:** the demandRungs' sort — the near-edge-aware preference (the rung whose TOP lands at the day's expected entry — the demandCeiling-proximity!). CAREFUL: the previous near-side experiment broke the GU Wed (the deep-demand trade!) — the shape-driven resolution (the RWL/R → the deep!) must gate the near-side preference.

### Step 2 — THE SUPPLY-SIDE SYMMETRY (the EU #3 Δ3.4 + the EU #8 Δ6.1 + the GU #3 Δ8.9 + the GU #5 Δ17.9 + the GU #7 Δ41.9)
- **The mechanism:** the SHORT mirrors' entry resolution — the same near-edge mechanics on the supply side (the entry = the LQZ's floor!).
- **The fix:** the e2ZoneResolvedEntry's SHORT branch — the shape-driven (the RWL/R → the deep internal rung's floor; the others → the supply zone's bottom!).
- **The GU #7 (Δ41.9):** the Fri SHORT — the SELL_SIDE rung designation (the ZR-6D keyZoneType contract!) — the supply-side resolution at the operator's 1.34500 (the FX-proven rung at Δ0.0p!!).

### Step 3 — THE DEEP-DEMAND ANCHORS (the EU #6 Δ7.8 + the GU #4 Δ4.3)
- **The mechanism:** the deep LQ shield (the operator's #6: "Looking left to see what relevant LQZs exist beneath this demand, one is clearly visible at 1.13935 - 1.13875... this LQZ is the LQ shield of the BoM 4H bullish OB") — the deep rung selection (the FX-proven rungs at Δ0.2-1.0p!).
- **The fix:** the deep-demand resolution — the RWL/BS shape → the deep rung (the rung 1.13950's ceiling 1.13937 — Δ0.2p of the operator's 1.13935!).

### Step 4 — THE STALE-10 HYGIENE
- **The mechanism:** the fill model's expiry classification shifted with the anchor fix — the STALE bucket grew 3 → 10.
- **The fix:** report-v452.ts's sessionBracketOf — the expiry's classification audit.

### Step 5 — THE GOLDEN ≥ 15/21 (the acceptance)
- The full measurement: the EU 8 + the GU 7 at the operator's levels at ≤3p.
- The DXY 6/6 held + the lane all-winning.
- Then the phase-2 multi-week validation (the operator's Part 30 — the pipeline on multiple unrelated weeks!).

## 6B.2 The operating rules (the frameworks enforced)

1. The side-inversion invariant — the LONG mirror's anchor MUST be the DEMAND-side — the wrong side = a hard error.
2. The probe-first — the full-path trace BEFORE the tuning.
3. The both-sides test — every mechanic asserted on BOTH directions.
4. The contract-drift detector — every contract expansion audits the consumers.
5. The gate-as-contract — the diags assert the direction-appropriate contracts.
6. Determinism ×2 after EVERY change · the 3-pip golden after every change · the gate protocol · the diff review of EVERY changed line · the frozen pair byte-identical · the honest-data law.

## 6B.3 The do-nots (the mistakes never repeated)

- NO keyZoneId-only checks for the cascade mirrors (the D50 ruling!).
- NO fabricated data — the correct data or the thrown error.
- NO hardcoded levels — the operator's levels = the MEASUREMENT oracle.
- NO re-opening the frozen pair.
- NO fib (E4 — deferred).
- NO output-only audit — the diff review of EVERY changed line.
- NO E2-side tuning without the E3 mirror's full-path probe (the 15-iteration lesson!).

---

# PART 7B — THE DOCUMENTATION STATUS — THE COMPLETE MAP

| The doc | The content | The status |
|---|---|---|
| MASTER_CONTEXT/PLUTUS_V4.5.2_BUILD_REPORT.md | THIS REPORT — the 4.5.2 journey + the root + the blast radius + the frameworks | ✅ the 4.5.2 journey's documentation |
| context_management/FAILURE_LOG.md | DERAILMENT-2026-08-05 + 05B — the ROOT + the lesson | ✅ |
| context_management/EVIDENCE_STATE.md | the breakthrough's mechanical evidence | ✅ |
| context_management/SoC_PRESERVATION.md | the patterns to preserve | ✅ |
| context_management/COMPACTION_SURVIVAL.md | the full story + the next steps | ✅ |
| context_management/DECISION_CHAIN.md | the D50/D51/D52 rulings | ✅ |
| context_management/NEXT_STEPS.md | the tangible ordered steps | ✅ |
| context_management/POST-COMPACTION_PROMPT.md | the v4.5.3 activation | ✅ rewritten |
| Checkpoints/v4.5.3_CLEAN_BASELINE/ | the clean reload anchor (f8235815) | ✅ |

*END OF THE PLUTUS v4.5.2 BUILD REPORT (EXPANDED) — the 4.5.2 journey's conclusive root documented. THE v4.5.3 CONTINUATION (the near-hits — the golden ≥ 15/21) lives in MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_SPEC.md — the 4.5.3 is ABOUT TO START building on this foundation. — the complete 4.5.2 journey's conclusive root macro bug: the cascade's side-inversion ignored at every E3 layer by three stacked single-designation-era checks — the contract-drift root-of-root — the full blast radius — the five mental frameworks with the worked examples — the v4.5.3 differentiator — the next session's complete continuation. The golden: 10 → 12/21 with the ≤10p 19/21. Doctrine is QUOTED, never synthesized.*
