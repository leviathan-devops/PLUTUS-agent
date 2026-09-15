# THE W8B ADVANCEMENT SPEC — THE CHAIN'S NATIVE E3 ENTRY-RESOLUTION + THE FULL GAP INVENTORY (the 5/5 convergence)
**Version:** 1.0 · **Date:** 2026-08-10 · **Status:** THE NEXT SESSION'S WORK ORDER — the W1-W7 fix waves LANDED but the golden convergence stayed 2/5 because the waves fixed the REPORT-path machinery while the golden diag measures the REASONING CHAIN's NATIVE lane — a DIFFERENT E3 resolution path. This spec names EVERY gap + the exact fix + the file targets + the gates to make all 5 golden trades hit.

# §0 THE ROOT CAUSE (why 2/5 did not move)

**THE ONE-SENTENCE ANSWER:** the golden diag (diag-reasoning-chain-golden.ts) measures the REASONING CHAIN's NATIVE lane (resolveOperativeZone → the T1-T7 ledger → the STEP B decisions → the assembleProjection → the anchors) — the W4/W5/W6 waves fixed the REPORT/MIRROR machinery (report-v452.ts + mirror.ts's selectPairNativeZone + the picker) — the chain's native E3 resolution was NEVER TOUCHED. THE PROOF: (a) the W6 audit's honest note — "the golden diag's GU LONG is the reasoning chain's NATIVE lane — it does NOT consume selectPairNativeZone's admission gate"; (b) the diag's own NEXT STEPS — "Refine the operative-zone selection for EUR/USD Monday SHORT — 3 refinements failed to satisfy the RRR 2.5 gate / the anchor trace" — the EU SHORT is RRR-REJECTED, not direction-missing; (c) the W1+W3 selection DID move the diag's rows (the DXY SHORT Δ14.9p→Δ6.9p, the DXY LONG Δ16.5p→Δ2.7p HIT) because the diag consumes the E2 designation — the W4/W5/W6 (the direction/walls/sanity) are the report-path, invisible to the diag's native anchor resolution.

# §1 THE 5-ROW MECHANICAL GAP TABLE (the convergence blockers — each with the fix target)

| # | The row | The machine's emission | The golden | The delta | THE ROOT MECHANISM (verified) | THE FIX |
|---|---|---|---|---|---|---|
| G-1 | DXY SHORT | E 101.071 | 101.140 | Δ6.9p | the designation IS the operator's [101.027-101.153] zone (correct — the W3 selection); the chain's ENTRY resolution picks the ZONE's raw internal edge (101.071) — the I-5 STRADDLING-SHIELD ENTRY (E = the internal SELL_SIDE shield rung [101.12-101.154]'s NEAR EDGE = 101.140) is NOT applied in the chain's native DXY resolution | the chain's entry = the designation's internal LQZ rung near edge — the `internalLqzNearEdge` precedent (shape-brain.ts:1477-1487) consumed by the chain's entry construction |
| G-2 | GU LONG | E 1.33263 | 1.33330 | Δ6.7p | the native `resolveOperativeZone` resolves the BRIDGED `LMV|GBP/USD|1.33370` zone (E = 1.33263) instead of the GOLDEN-CONTAINING `1.33380` rung [1.33306-1.33343] (its near edge = 1.33330); the W6 isValidRung gate is in the MIRROR picker — the native lane's operative-zone preference never sees it | the chain's operative-zone resolution must prefer the designation's demandZoneId INTERNAL rung whose near edge lands the operator's level — the internalLqzNearEdge again |
| G-3 | EU SHORT | NONE (MISSING) | 1.14395 | — | the STEP B projection for the EU Monday SHORT FAILS the RRR 2.5 gate + the e1ZoneId/e2ProjectionId anchor trace after 3 refinements — the chain's anchors (the SL + the TP) don't produce RRR ≥ 2.5. The REFERENCE anchors (the report path, verified): E 1.14390 (the shield rung [1.1439-1.14415]'s near edge) · SL 1.14475 (the supply [1.14460-1.14530] + the buffer) · TP 1.14095 (the demand nested LQZ 1.14120 [1.14095]) — RRR 3.18 | the chain's EU SHORT anchor construction must implement the SAME anchor doctrine: the E = the shield rung's near edge, the SL = the supply zone's relevant edge + the Law-7 buffer, the TP = the demand nested LQZ's near edge — the exact I-5/I-6/I-7/I-8 mechanics that produce the report-path's Δ0.5p hit |
| G-4 | DXY LONG | E 100.918 | 100.945 | Δ2.7p HIT | HELD — the W3 selection's fix | — (do NOT regress) |
| G-5 | EU LONG | E 1.14095 | 1.14110 | Δ1.5p HIT | HELD — the phantom-BoM fortress + the W1+W3 | — (do NOT regress) |

**THE INTERACTION NOTE:** the G-1/G-2/G-3 fixes share ONE root: the chain's native anchor construction (the assembleProjection in the STEP B) does NOT implement the report path's anchor doctrine. THE FIX IS ONE MECHANISM, THREE APPLICATIONS: the chain's entry = the internal shield rung's near edge (the I-5), the SL = the relevant zone's edge + the buffer (the I-6), the TP = the internal LQZ near edge (the I-7/I-8) — for the DXY, the GU, and the EU SHORT.

# §2 THE W8B WAVE TABLE (the fix waves — the disjoint file sets + the gates)

**THE PRIMARY FILE SET (the chain's native E3 resolution):**
| The wave | The file | The exact change | The gate |
|---|---|---|---|
| W8B-1 | src/mdve/reasoning-chain.ts — READ THE FILE FIRST (1757L): the resolveOperativeZone + the assembleProjection + the operative-zone resolution + the anchor construction + the RRR 2.5 gate | (a) the entry construction: consume the designation's internal LQZ rung near edge (the internalLqzNearEdge pattern — import or replicate from shape-brain.ts:1477-1487) — the DXY SHORT's E → 101.140, the GU LONG's E → 1.33330; (b) the operative-zone preference: the designation's demandZoneId internal rung wins over the bridged-zone fallback (the G-2); (c) the SL construction: the relevant zone's edge + the Law-7 buffer (the EU SHORT's SL 1.14475); (d) the TP construction: the opposing demand's internal LQZ near edge (the EU SHORT's TP 1.14095) | the diag's convergence: the DXY SHORT ≤3p · the GU LONG ≤3p · the EU SHORT EMITTED ≤3p |
| W8B-2 | src/pipeline/reason-step-b.ts — the STEP B decisions' assembly + the validateAgentDecisions + the RRR gate | the anchor trace: the assembleProjection must produce the E/SL/TP from the chain's operative-zone + the internal rungs (NOT the raw zone edges); the RRR 2.5 gate stays (the D2 law) but the anchors must PASS it with the doctrine geometry | diag-step-tools 31/31 · the EU SHORT projection present with RRR ≥ 2.5 (target ≥ 3.0) |
| W8B-3 | The probe + the diag lockstep | probe-e2-designation.ts's re-walk copy: verify the chain's operative-zone + the anchor resolution in lockstep (the FAITHFULNESS — the chain's E must trace to the same designation) | the probe FAITHFULNESS holds |

**THE GATE (the W8B done-when):** the golden gate exit 0 · the convergence table 5/5 at ≤3p (DXY SHORT 101.140 · DXY LONG 100.945 · EU SHORT 1.14395 · EU LONG 1.14110 · GU LONG 1.33330) · the determinism ×2 · the frozen pair byte-identical · tsc 0 · the wall ≤5min.

# §3 THE FULL GAP INVENTORY (ALL the gaps the session identified — the hygiene wave after the 5/5)

| # | The gap | The class | The fix | The priority |
|---|---|---|---|---|
| H-1 | the hardcoded API key ×2 (tools/plutus-omni-vision.ts:24 + engine/data-source-router.ts:1119 — the same key) | SECURITY | the redaction — the key moves to the env (OPENCODE_API_KEY) + the sources read it; the ship package must NOT carry it (the audit's zero-secrets check is the gate) | HIGH (the ship is the operator's manual deploy) |
| H-2 | the if(false) BoM gate (4h-sd-lobe.ts:414 — "A/B NEUTERED") | THEATER | remove the dead branch + restore the live gate or delete it deliberately | HIGH |
| H-3 | the autoEvaluateChecklist 14/14 true + the applyVlmVerification never rejects + the refinedCount > 0 || true | THEATER | the honest evaluation paths (the loud-fail law) | HIGH |
| H-4 | the dead-wiring (the merkle-chain 0 callers · the identity canon discarded · the temporal lock never called in the pipeline · the storyline-engine 0 consumers · the VLD/VTM 0 instantiations) | DEAD-CODE | delete or wire — the register's F-class | MEDIUM |
| H-5 | the LSP-vs-tsc coverage hole (the diag/probe harnesses OUTSIDE the tsconfig — ~27 type errors) | COVERAGE | the tsconfig include fix + the harness type fixes (the probe ×4, report-v452 ×5, the diags ×18) | MEDIUM |
| H-6 | the legacy trees (plutus-tte-pipeline 5,567L 0 imports + src_OLD_STALE_LINEAGE + src_V42_DERAILMENT_BACKUP) | LEGACY | the quarantine + the deletion (the wave-0 hygiene) | MEDIUM |
| H-7 | the wave generator's pollution (the drafting scratchpad + the placeholder paths + the abort) | INFRA | the failure log's fix work order (context_management/Debug_Logs/WAVE_GENERATOR_FAILURE_LOG_2026-08-10.md — the post-composition validator + the shadow-composition boundary + the loud-fail) | MEDIUM |
| H-8 | the ship tool's sticky dist-copy cache (the first-call snapshot persists — the package got the stale dist) | INFRA | the corrected dist copied manually after the tool's run (the documented pattern) | LOW |
| H-9 | the two measurement paths disagree (the diag's NATIVE lane vs the report's MIRROR lane — the same E1 map, different E3 resolutions) | CONSISTENCY | the ZR-7E class — after the W8B, the report's emission table must agree with the diag's convergence table (the same anchors) | MEDIUM (the W8B's real test) |

# §4 THE NEXT SESSION'S TASK LIST (the ordered execution — the operator's "make all 5 hit")

1. READ the W8B spec (THIS file) + the POST-COMPACTION_PROMPT.md + the OVERHAUL SPEC V2 §4's worked examples (the expected 5/5 table) + the wave audits (wave-w6-sanity-singlesource — the native-lane note) + the diag-reasoning-chain-golden.ts (the NEXT STEPS output — the refinement failures).
2. RUN the zero-trust battery (tsc · build · the frozen pair · the golden gate ×2) — the baseline.
3. EXECUTE W8B-1 (reasoning-chain.ts — the chain's native anchor construction): read the file, find the resolveOperativeZone + the assembleProjection, apply the internal-rung near-edge entry + the demandZoneId preference + the SL/TP doctrine. The G-1/G-2/G-3 fixes.
4. EXECUTE W8B-2 (reason-step-b.ts — the assembly + the RRR gate): the anchors pass with the doctrine geometry.
5. RUN the golden gate — measure the convergence table. The rows must move: 101.071→101.140 · 1.33263→1.33330 · NONE→1.14390. A row that does not move: REPORT the mechanism (the chain's resolution trace) — never fit.
6. THE 5/5 GATE: the convergence 5/5 at ≤3p · the determinism ×2 · the frozen pair · tsc 0 · the wall ≤5min.
7. THE HYGIENE WAVE (the §3 table — the H-1 security redaction FIRST, then the theater/dead-code/coverage): each gated + audited.
8. THE CANON DOCS: the build report ENTRY 7 · the DECISION_CHAIN D66 (the W8B record) · the EVIDENCE_STATE (the 5/5) · the COMPACTION_SURVIVAL.
9. THE N3: the operator's manual deploy of the ship package (Ship_Packages/plutus-v4.5.4-overhaul-v2/) — the STEP A/B reasoning visible in the stream.

# §5 THE ANTI-PATTERNS (the W8B-specific traps)

- AP-1 the fitted anchors: a builder tunes the chain's constants to clear the RRR gate — BANNED (the anchors must EMERGE from the zone geometry — the I-5/I-6/I-7/I-8 doctrine).
- AP-2 the report-path re-fix: a builder "fixes" the convergence by editing the mirror again — BANNED (the diag measures the NATIVE lane — the reason-chain.ts + reason-step-b.ts are the targets).
- AP-3 the regression: the EU LONG + the DXY LONG HITs must hold (the G-4/G-5 — the F-8 control) — a change that breaks them is REVERTED.
- AP-4 the 0.35 re-declaration: the divergence threshold stays imported (CASCADE_DIVERGENCE_VALIDATED).
- AP-5 the frozen pair + the canon docs: NEVER touched by the subagents.
- AP-6 the theatrical convergence: a 5/5 claim without the measured emission rows = CRITICAL.

# §6 THE OPERATING RULES (the same discipline)

The zero-trust battery after every change · the wave audits at BOTH .trident/wave-audit/ paths · the subagent dispatch: the prompts at 140+ physical lines (the runtime's counter runs low) + the preflight READY + ALL the task calls in ONE message for a wave · the self-execution for the surgical edits (the dispatch is flaky) · NO container (D10) — the host diag harnesses are the runtime; the golden gate IS the acceptance.

<!-- DOC-COMPLETE -->
# §7 THE CHAIN-ASSEMBLY DEGENERATE INVENTORY (the code-verified defects — the exact sites + the exact fixes)

**THE ONE ROOT:** the reasoning chain's native E3 assembly (src/mdve/reasoning-chain.ts) implements the PRE-I-fix anchor mechanics — the raw zone edges + the near-rung designations — while the operator's 3.18R anchors (the shield-rung entry, the supply+Law-7 SL, the fortress internal-LQZ TP) exist ONLY in the report path (mirror.ts + setup-gen.ts). The golden diag measures the CHAIN — so it sees the degeneracy, not the doctrine. Each defect below is code-verified 2026-08-10.

## THE DEGENERATE SITES (each with the mechanism + the fix)

**D-1 — resolveOperativeZone (reasoning-chain.ts:382) — the GU LONG eats the bridged zone.**
THE DEFECT: the operative-zone resolution for the GU Monday LONG resolves the BRIDGED `LMV|GBP/USD|1.33370` zone (E = 1.33263) instead of the golden-containing `1.33380` rung [1.33306-1.33343] (its near edge = 1.33330). The W6 isValidRung gate is in the MIRROR picker (mirror.ts:1549-1573) — the chain's operative-zone preference never sees it. THE Δ6.7p.
THE FIX: the operative-zone resolution must prefer the designation's demandZoneId's INTERNAL LQZ rung whose near edge lands the operator's level — the `internalLqzNearEdge` pattern (shape-brain.ts:1477-1487): find the demand zone's internal rungs, pick the one whose near edge is the designation's level. The bridged-zone fallback is the LAST resort, never the primary. THE EXPECTED: the GU LONG E → 1.33330 (Δ≤3p).

**D-2 — the entry = internalNearEdge (reasoning-chain.ts:776) — the DXY SHORT eats the raw zone edge.**
THE DEFECT: the entry construction calls `internalNearEdge(zone, lmvTable, side)` — for the DXY SHORT, the operative zone [101.027-101.153]'s internal-rung selection resolves to the zone's raw internal edge (E = 101.071) instead of the SHIELD rung [101.12-101.154]'s near edge (101.140). The I-5 STRADDLING-SHIELD entry (the report path's mechanism — the EU lane's E = the shield rung [1.1439-1.14415]'s near edge 1.14390) is NOT implemented in the chain. THE Δ6.9p.
THE FIX: the entry = the internal SELL_SIDE shield rung's NEAR EDGE (the first contact the sweep hits) — the internal-rung selection must prefer the rung whose near edge matches the designation's structural level, NOT the zone's raw edge. THE EXPECTED: the DXY SHORT E → 101.140 (Δ≤3p).

**D-3 — the E2 demand designation feeds a DEGENERATE TP (reasoning-chain.ts:1018-1034).**
THE DEFECT (the code's own comment at :1030-1034, verbatim): "when the resolved TP is DEGENERATE (below the RRR gate — e.g., the EU Monday's E2 demandZoneId = 1.14370, a rung right below the entry → RRR 0.42)". The chain's E2 day designation for the EU Monday SHORT carries the demandZoneId = **1.14370** (a rung right below the entry) instead of the FORTRESS DEMAND [1.14149-1.14000] with the internal LQZ [1.14110-1.14020] — the operator's EU #1 TP zone. computeLmvTP with that e2Day returns the degenerate TP → the RRR 0.42. THE 6R TRADE EATEN.
THE FIX (TWO parts): (a) the E2 demand designation for the EU Monday SHORT must resolve the FORTRESS DEMAND [1.14149-1.14000] (the W3 selection's demand-side pick — the same as the report path — the [1.14149-1.14000] zone with the zfp 65 fortress + the phantom-BoM exemption is IN the map — the probe verified); (b) the rescue cap (:480-515 capTpAtNearestOpposingSd) must ACTUALLY land the fortress demand's internal LQZ near edge 1.14110 — the cap's filter (z.top < entry − max(2×risk, 4p)) + the internal-rung containment + the near-edge check must resolve the fortress demand; if the cap returns null, the chain MUST log the DEGENERATE_TP_CAP_FAILED verdict (the loud-fail law) — never a silent drop. THE EXPECTED: the EU SHORT EMITTED with E 1.14390 / SL 1.14475 / TP 1.14095 (RRR 3.18 — the Δ0.5p row).

**D-4 — the SL selection (reasoning-chain.ts:985-1003) — the tigher-first may undercut the doctrine.**
THE DEFECT: the SL picks the TIGHTER candidate (the max RRR) from slCandidates, then the computeMirrorSL fallback, then the zone-far-edge+Law-7-buffer. The EU SHORT's reference SL 1.14475 (the supply [1.14460-1.14530]'s relevant edge + the buffer — the I-6 zone-anchored ladder) must be the target. THE FIX: the SL = the RELEVANT ZONE's edge + the Law-7 buffer per the ladder-steps doctrine (the 3p-outside-back-edge OR the 1-2p-inside-close-edge-of-the-next-step) — the operative zone chosen by the pressure state; the tighter-first ranking is the TIEBREAK at the equal doctrine, never the primary. THE EXPECTED: the EU SHORT SL 1.14475.

**D-5 — the TP's full-model resolution (reasoning-chain.ts:1018-1043) — the e2Day path + the structural extension.**
THE DEFECT: computeLmvTP's shape-day path falls through to the nearest-first when the e2Day's projected zone is the degenerate rung (the OB-id-vs-LMV-candidates mismatch class — the D37 #3). THE FIX: the shape-day path must resolve the demandZoneId to the ZONE's internal LQZ near edge (the ZR-3.3 full-model resolution) — the fortress demand's internal LQZ [1.14110-1.14020]'s near edge 1.14110 — BEFORE the nearest-first fallback. THE EXPECTED: the EU SHORT TP 1.14095 (the internal LQZ rung 1.14120 [1.14095]'s near edge — the I-8 pathCap).

**D-6 — the RRR gate + the refinement exhaustion (reasoning-chain.ts:63/:1036/:1272/:1386/:1726) — the executioner, not the cause.**
THE DEFECT: the RRR_GATE 2.5 + the 3-refinement loop are CORRECT (the D2 law) — the problem is they execute on the degenerate anchors from D-1/D-2/D-3/D-5. After the D-fixes, the anchors pass (3.18R) WITHOUT the gate changing. THE FIX: NO gate change — the anchor doctrine is the fix. THE VERIFICATION: the EU SHORT projection present with RRR 3.18 (the measured, never the fitted).

## THE FIX EXECUTION ORDER (the next session's surgical sequence)

1. READ the chain's assembly region (reasoning-chain.ts:382-1064 — the resolveOperativeZone, the internalNearEdge, the anchor construction) + the cap (reasoning-chain.ts:480-515) + the shape-brain's internalLqzNearEdge (shape-brain.ts:1477-1487 — the pattern to import/replicate).
2. FIX D-3a (the E2 demand designation → the fortress demand for the EU Monday SHORT): the W3 selection's demand-side pick must resolve the fortress [1.14149-1.14000] — verify the chain's e2Day source (the shape-brain's projectZoneForDay output) and the demand-side pool composition after the W2 flip.
3. FIX D-5 (the TP's full-model resolution → the internal LQZ near edge).
4. FIX D-1 (the operative-zone preference → the demandZoneId's internal rung near edge — the GU).
5. FIX D-2 (the entry → the internal shield rung's near edge — the DXY).
6. FIX D-4 (the SL → the relevant zone + the Law-7 buffer).
7. RUN the golden gate — measure the convergence: the DXY SHORT 101.140 · the GU LONG 1.33330 · the EU SHORT 1.14395 — the 5/5 at ≤3p. A row that does not move: report the chain's resolution trace (the operative zone, the internal rung, the anchors) — never fit.
8. THE GATES: the golden gate exit 0 · the determinism ×2 · the frozen pair · tsc 0 · the wall ≤5min · the diff review of every changed line · the wave audit at BOTH .trident/wave-audit/ paths.

## THE VERIFICATION TOKENS (the pass/fail per row)

- THE DXY SHORT: passToken "E 101.140 ± 3p" · failToken "101.071" in the emission.
- THE GU LONG: passToken "E 1.33330 ± 3p" · failToken "1.33263" in the emission.
- THE EU SHORT: passToken "E 1.14395 ± 3p AND RRR 3.18" · failToken "REFINEMENT_EXHAUSTED" for the EU SHORT row / the row NONE.
- THE CONTROL: the DXY LONG 100.945 + the EU LONG 1.14110 HITs HOLD (failToken: any regression past 3p).

<!-- DOC-COMPLETE -->
