# PLUTUS v4.5.3 — THE BUILD SPEC (what is ABOUT TO START — the cascade precision)

**Date:** 2026-08-05 · **Status: THE v4.5.3 BUILD AUTHORITY** — the 4.5.3 is about to START building on the 4.5.2 foundation (the conclusive root macro bug FIXED — documented in `MASTER_CONTEXT/PLUTUS_V4.5.2_BUILD_REPORT.md`). This spec is the execution plan for the 4.5.3 iteration.

**The 4.5.2 → 4.5.3 differentiator (bolded, underlined):**
> **THE CASCADE'S SIDE-INVERSION HONORED AT EVERY LAYER — the direction-appropriate designation consumption (the LONG → demandZoneId, the SHORT → supplyZoneId) + the shape-driven near/deep entry resolution. The 4.5.2's core macro architecture bug — the EU/GU mirrors anchoring the SUPPLY for the entire iteration — is FIXED and VERIFIED (the golden 10 → 12/21, the ≤10p 19/21). The 4.5.3 DRIVES the golden to ≥ 15/21 and beyond.**

---

# PART 1 — THE STARTING STATE (the verified fingerprint — zero-trust re-verify)

```
report_v452.md     f82358156329b07751777ee3a9354ae2832cf3b2488ee3c05acfc85280404314  (×2 — determinism)
golden ≤3p: 12/21  (the DXY 6/6 + the EU Mon SHORT Δ0.5p + the EU Wed #5 Δ0.4p + the EU #4 1.14020 Δ0.7p
                   + the EU #7 1.14225 Δ2.6p + the GU #1 1.33330 Δ0.7p + the GU Tue #2 Δ0.0p)
≤5p: 16/21 · ≤10p: 19/21
all 17 gates: PASS (incl. diag-lmv-golden-fx — 15/15 + 2/2 — the map fidelity PROVEN)
frozen: sl-lmv 91294083 · trade-dedup 33914c89 (byte-identical)
anchor: Checkpoints/v4.5.3_CLEAN_BASELINE/
```

**The shipped foundation (the 4.5.2's end state):**
1. The C1 boundary — the FULL pressure state crosses into the E2 (257/257 zones populated).
2. The S1 pressure-aware transitions (predictNextShapePressureAware — the DEPLETED/BROKEN/FORTRESS/VIRGIN laws — the stuck-PBS DEAD — the EU chain Mon SS → Tue BS → Wed R).
3. The S2-rung-direct designation (the E2's picks at the LMV rungs — the operator's entry structures).
4. **THE ROOT FIX — the direction-appropriate designation consumption:** the selectPairNativeZone's exact-match + the e2Designated gate now use the direction-appropriate designation (the LONG → demandZoneId!) + the e2ZoneResolvedEntry's shape-driven entry (the zone-top for the SS/BS/WL; the deep rung for the RWL/R).
5. The FX oracle gate (diag-lmv-golden-fx — the map HAS the operator's levels at Δ0.5-1.0p!).

---

# PART 2 — THE NEAR-HITS (the exact rows + the exact mechanisms — the golden ≥ 15/21)

## STEP 1 — THE DEMAND PICK AT THE OPERATOR'S EXACT LQZ (the EU #2 Δ4.4)

**The file:** src/brains/shape-brain.ts (the projectZoneForDay's demandRungs selection).

**The mechanism (measured):** the E2's Mon demand designation = the rung 1.14120 (its top 1.14154!) vs the operator's LQZ [1.14110-1.14020] — the pick should prefer the rung 1.14100 (its top 1.14120 — Δ1.0p of the operator's 1.14110! — the FX-proven!). The rung-selection's sort: the zfp-first + the proximity to the demandReachRef (the LOW!) picks the 1.14120.

**The fix:** the demandRungs' sort gains the near-edge-aware preference — the rung whose TOP lands at the day's expected entry (the demandCeiling-proximity for the near-side!). CAREFUL — the measured trap: the earlier near-side experiment (the demandCeiling proximity!) broke the GU Wed #4 (the deep-demand trade — the operator's #4 IS the deep!) — the shape-driven gating MUST accompany: the RWL/R/RS/PRWL shapes → the DEEP rung (the demandReachRef proximity!); the SS/BS/WL shapes → the NEAR (the demandCeiling proximity!).

**The gate:** the EU #2 (1.14110) ≤ 3p · the GU Wed #4 (1.33280) NOT regressed · the golden ≥ 12/21.

## STEP 2 — THE SUPPLY-SIDE SYMMETRY (the EU #3 Δ3.4 + the EU #8 Δ6.1 + the GU #3 Δ8.9 + the GU #5 Δ17.9 + the GU #7 Δ41.9)

**The file:** src/mdve/mirror.ts (the e2ZoneResolvedEntry's SHORT branch).

**The mechanism (measured):** the SHORT mirrors' entry resolution — the same near-edge mechanics on the supply side (the entry = the LQZ's floor!). The GU #7's FX-proven rung at Δ0.0p of the operator's 1.34500! — the SELL_SIDE rung designation (the ZR-6D keyZoneType contract!).

**The fix:** the SHORT branch's shape-driven resolution — the RWL/R shapes → the deep internal rung's floor; the SS/BS/WL → the supply zone's bottom (the near edge!). The GU #7: the Fri's SELL_SIDE rung at the operator's level.

**The gate:** the EU #3 (1.14460) ≤ 3p · the GU #7 (1.34500) ≤ 3p · the golden ≥ 13/21.

## STEP 3 — THE DEEP-DEMAND ANCHORS (the EU #6 Δ7.8 + the GU #4 Δ4.3)

**The file:** src/mdve/mirror.ts (the e2ZoneResolvedEntry's deep resolution) + src/brains/shape-brain.ts (the deepDemandZoneId).

**The mechanism (measured):** the operator's #6 (verbatim): "Looking left to see what relevant LQZs exist beneath this demand, one is clearly visible at 1.13935 - 1.13875... this LQZ is the LQ shield of the BoM 4H bullish OB" — the deep rung 1.13950's ceiling 1.13937 — Δ0.2p of the operator's 1.13935!! The deepDemandZoneId contract exists (the ZR-6D!).

**The fix:** the deep-demand resolution — the RWL/BS shape's designation should resolve the DEEP demand (the deepDemandZoneId's zone!) — the entry at the deep rung's near edge.

**The gate:** the EU #6 (1.13935) ≤ 3p · the GU #4 (1.33280) ≤ 3p · the golden ≥ 14/21.

## STEP 4 — THE STALE-10 HYGIENE

**The file:** report-v452.ts (the sessionBracketOf).

**The mechanism (measured):** the fill model's expiry classification shifted with the anchor fix — the STALE bucket grew 3 → 10 — the STALE trades' classification audit.

**The fix:** the expiry's classification verified against the operator's fill doctrine (the activation at the E2-designated session + the expiry at the next day's session start + the weekend close).

## STEP 5 — THE GOLDEN ≥ 15/21 (the acceptance)

- The full measurement: the EU 8 + the GU 7 at the operator's levels at ≤3p (toward 15/15!).
- The DXY 6/6 held + the DXY lane all-winning.
- Then the phase-2 multi-week validation (the operator's Part 30 — the pipeline on MULTIPLE unrelated weeks with the consistent prediction quality!).

---

# PART 3 — THE OPERATING RULES (the frameworks enforced — the mistakes never repeated)

1. **THE SIDE-INVERSION INVARIANT** — the LONG mirror's anchor MUST be the DEMAND-side (the D50 ruling!) — the wrong side = a hard error, never a silent emission.
2. **THE PROBE-FIRST DISCIPLINE** — the metric flat after 2-3 iterations → STOP tuning + TRACE the full path end-to-end (the 15-iteration lesson — the E2-side tuning was orthogonal to the E3 mirror's root!).
3. **THE BOTH-SIDES TEST** — every mechanic asserted on BOTH directions (the SHORT side worked while the LONG side was broken!).
4. **THE CONTRACT-DRIFT DETECTOR** — after ANY data-model expansion, audit EVERY consumer (the ShapeDayZone's dual-side expansion went un-audited — the root-of-root!).
5. **THE GATE-AS-CONTRACT** — the diags assert the direction-appropriate contracts.
6. The gate protocol after EVERY change: tsc 0 → build → report → the golden → the wave gate → determinism ×2 → the frozen hashes · the diff review of EVERY changed line · the honest-data law · the 200+ line DP L1 dispatch briefs.

---

# PART 4 — THE DO-NOTs

- NO keyZoneId-only checks for the cascade mirrors (the D50 ruling!).
- NO fabricated data — the correct data or the thrown error.
- NO hardcoded levels — the operator's levels = the MEASUREMENT oracle, never the computation input.
- NO re-opening the frozen pair (sl-lmv 91294083 · trade-dedup 33914c89).
- NO fib (E4 — deferred — the reinforcement engine on top of the solid core).
- NO output-only audit — the diff review of EVERY changed line.
- NO E2-side tuning without the E3 mirror's full-path probe.

---

# PART 5 — THE CHECKPOINTS (per step)

- Step 1: `Checkpoints/v4.5.3_S1/` (the demand pick's rung selection — the EU #2 ≤ 3p)
- Step 2: `Checkpoints/v4.5.3_S2/` (the supply-side symmetry — the EU #3 + the GU #7)
- Step 3: `Checkpoints/v4.5.3_S3/` (the deep-demand anchors — the EU #6 + the GU #4)
- Step 4: `Checkpoints/v4.5.3_S4/` (the STALE hygiene)
- Step 5: `Checkpoints/v4.5.3_FINAL/` (the golden ≥ 15/21 — the v4.5.3 shipped!)

Each checkpoint: the MANIFEST + the report + the gate outputs + the DIFF REVIEWS (the ORCHESTRATOR PRINCIPLES).

*END OF THE PLUTUS v4.5.3 BUILD SPEC — the 4.5.3 is ABOUT TO START. The foundation: the 4.5.2's conclusive root fixed (the direction-appropriate designation consumption + the shape-driven near/deep — the golden 12/21). The near-hits' exact mechanisms measured. The operating rules enforced. The golden ≥ 15/21 is the acceptance. Doctrine is QUOTED, never synthesized.*
