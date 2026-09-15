# BUILD_REPORT — Plutus V5 omp-worker-1

## 2026-09-15 W0 spec corpus

**Commit:** 2fa34c5 on omp-worker-1  
**What landed:** S-1..S-7, battery.json fp 8acfe74f… 46/46, d17, golden-week, 9 mutants, calibrate/compile/jspec/oracle-registry.  
**Architecture:** math corpus before jesl/e1. Two-machine split unchanged. Frozen pair untouched.  
**Verification (orchestrator):** 7 S-files; jspec 7×PASS; calibrate CALIBRATE_OK; 40/13 CONTRADICTED; frozen MATCH.  
**Residual:** W1 jesl/scripts/harness later landed a1cdd4f.

## 2026-09-15 W1 jesl + scripts + harness

**Commit:** a1cdd4f  
**Verification:** test -x run-battery.sh; bun test src/jesl 1/0 HELLO-GATE ALL GREEN; harness 2 files exist, 2 fail (missing e2/kernel). Frozen MATCH.  
**Residual:** harness red until W3/W6; src/runtime tsc 118 vs effect 4.0.0-beta.74.

## 2026-09-15 W2 e1 lexicons

**Commits:** ee32611 + f775d10 tsc-fix  
**Verification:** bun test src/e1 199/0; FUTURE_BAR_LEAK token; src/e1 tsc errors 0. Frozen MATCH.  
**Residual:** GATE-W3 blocked on src/runtime tsc (118). W3 not dispatched.

## 2026-09-15 W3–W8 landed (not ship)

**HEAD now:** 7a13674 omp-worker-1. Checkpoint on disk: `Checkpoints/v5-W8-landed-open-gates` only. Named v5-W0..W6 tokens were never minted.
**What landed:** src/e1 29 ts, e2 29, card 6, visual 7, aether 2, kernel 21, jesl 8, substrate 140, runtime 10, enforcement 4, mdve 36. Total src .ts = 419.
**Verification (orchestrator this turn):** `bun run typecheck` tsc --noEmit empty; `bun test` 1220 pass / 0 fail / 86 files; frozen MATCH 91294083 / 33914c89.
**Residual:** BUILD_REPORT was stale at W2 until this entry. Suite green is not GATE-CLASS green.

## 2026-09-15 W9 blocked — no v5-W9-converge

**Command:** `python3 scripts/rebuild-fixture.py --verify` PASS with 6 GAP slots; `bun diag-reasoning-chain-golden.ts --day=2026-07-06` exit 1.
**Golden:** 2/5 ≤3p — DXY LONG HIT Δ2.7p; GBP/USD LONG HIT Δ1.3p; DXY SHORT Δ20.4p MISS; EUR/USD SHORT NONE; EUR/USD LONG Δ7.9p MISS (1.14189 vs 1.14110).
**G FAIL:** G1 phantom-BoM fortress token; G3 GU divergence-record; G4 EU/DXY element oppose; G8 temporal vacuous.
**Why no nested LQZ:** all 30m/15m n=0 in /tmp/opencode/bars_raw.json. R21 forbids 1H→30m aggregate. R29 forbids hardcoding 1.14110. Air_Agent week 2026-07-06 has only 1H CSVs.
**Ship bar:** NOT MET. Do not stamp COMPLETE. Nested plutus/main and grok-prototype untouched.

## 2026-09-15 SC EVIDENCE (isolated gates, orch runs, HEAD 34b9ed2)

| gate | result |
|---|---|
| SC-1 tsc --noEmit | PASS (empty) |
| SC-7 designation price fields | PASS — `DesignationEmission` zone-IDs only (designation-machine.ts:20-25) |
| SC-26/27 anchors/killed | PASS — 0 price-anchor hits in src/e2 + src/kernel (tests excluded) |
| e2 totality | PASS 18/0 |
| mirror-floor | PASS 28/0 |
| side-inversion v452 FIRE / v453 SILENT | PASS 14/0 (isolated) |
| card zod schema + assembler | PASS 24/0 + 26/0 |
| kernel journal + card-loader | PASS 16/0 |
| trade-computer | PASS 26/0; L1-L5 PASS 94/0 |
| enforcement | PASS 66/0 |
| FUTURE_BAR_LEAK token | PASS 10/10 |
| CARD_INVALID token | PASS 6/6 |
| GATE-CLASS 1 report-v452 | NOT EVIDENCED — run prints ShapeBrain INFO lines + 0W/0L week; report_v452.md diff reverted |
| diag-lmv-golden-fx | **FAIL** — ENTRIES 13/15 ≤3p; EU #2 TP Δ9.0p; EU #3 Tue SHORT Δ9.0p; GU #1 Mon LONG Δ4.0p |
| SC-21 Monday | **FAIL 2/5** (proven, same run line as before) |
| e1 properties.ts 500-run | FILE NOT FOUND by bun filter (`src/e1/tests/properties.ts` not a *.test.ts name) |

Not ship. All of the above leave W9 blocked. Nested main/grok untouched.

## 2026-09-15 SC EVIDENCE round 2 (isolated gates, HEAD 481b54e, orch runs)

| gate | result |
|---|---|
| SC-2 e1 properties.test.ts | PASS 24/0, 115494 expects |
| SC-3 fixture journals snapshot | PASS 130/0 (golden-fixture.test.ts) |
| SC-4 verdict triplets | PASS by type — `LexiconVerdict` + `ZoneMapSnapshot.verdicts` (`e1/core/types.ts:186-197`) |
| SC-6 totality | PASS 18/0, 96 expects |
| SC-7 no designation price | PASS — `designation-machine.ts:15` "zone IDs only", 0 price-field grep hits |
| SC-8 side-inversion | PASS 42/0 (incl. mirrorFloor) |
| SC-10 E2 golden hold | NOT re-runnable standalone — stands on 2026-09-14 audit |
| SC-11 visual PNG | PASS 102/0 (8 files); chart-verifier GRADE:FAIL token present (`chart-verifier.test.ts:130-132`) |
| SC-12 junk PNG | GAP — no junk/corrupt fixture on disk (`find` empty) |
| SC-13 card zod | PASS 50/0 (schema+assembler rerun) |
| SC-15 W-1 non-numeric | PASS present (`schema.test.ts:105-110`, armed assertion) |
| SC-16 journal provenance | UNPROVEN-as-journal-chain (W9-LMVFX.md: emit rows carry only `{causationId, kind}` + payload; L-legs in `projection.metaLayerVerdicts/provenance`) |
| SC-17/18/21 golden | **FAIL 2/5** (diag G7 verbatim, exit 1) |
| SC-20 report sha | UNEVIDENCED standalone (ShapeBrain INFO + 0W/0L week) |
| SC-22 f(T)=24 | PASS-by-vendor — `oracles.ts:1-11` vendored MIRROR_FLOOR N×(1+P)=24 + e2 computations 102/0 |
| SC-24 conformance | NOT runnable (missing `../graph/client.js`, W8.md residual) |
| SC-26 anchors | PASS in product locks — 0 hits in `src/e2/machines` + `src/kernel`; 3 hits harness-only (`diag-reasoning-chain-golden.ts:94-96`) |
| SC-27 killed patterns | NOT re-grepped this round |
| L4 no-DXY adversarial | PASS 2/2 (`-t L4` across kernel) |

Not ship. W9 stays blocked on SC-21 2/5 + lmv-fx 13/15 NEEDS-LTF. Nested main/grok untouched.

## 2026-09-15 SC EVIDENCE round 3 (isolated gates, HEAD 3a49723, orch runs)

| gate | result |
|---|---|
| SC-1 boundary tsc | PASS — `bun run typecheck` → `$ tsc --noEmit` empty |
| SC-3 run-fixture live | PASS — `bun src/e1/run-fixture.ts` → pairs=3 zones=6 verdicts=18 zonesWithoutVerdicts=0 chainValid=true |
| SC-5 FUTURE_BAR_LEAK | PASS 16/0 (future-bar-leak.test.ts) |
| SC-14 orphans | PASS 26/0 (assembler.test.ts incl. ORPHAN_ID + CARD_ORPHAN_ID rows) |
| SC-23 validator | **MISSING-FILE** — `src/kernel/report-validator.ts` absent; W7 landed `src/report/` + `src/kernel/report-{render,model,rules}.ts` instead (PASS 70/0 across render/rules/model suites). SC-23-as-named NOT evidenced |
| SC-24 conformance | NOT runnable (missing `../graph/client.js`) |
| SC-27 killed patterns | BENIGN — only `killedDuplicates`/`killed` cascade-loop guards (`cascade-machine.ts:21,127-138`, `l4-cascade.ts:124`); no decommissioned-heuristic residue found |
| SC-21 Monday | **FAIL 2/5** (unchanged) |

Not ship. W9 stays blocked. Nested main/grok untouched.

## 2026-09-15 SC-2 runner verdict (orch, HEAD 0806ac9)

**Command:** `bun test src/e1/tests/properties.test.ts` → **24 pass / 0 fail / 115494 expects / 235ms.**
**File:** `src/e1/tests/properties.test.ts:28` `const RUNS = 500` — six properties (P1 classification, P2 pressure, P3 temporal gate, P4 determinism, P5 confidence, P6 intents) each loop 500 seeded runs (`:57-90`).
**Spec text** says `npx vitest run tests/properties.ts` (SPEC.md:255, wave table :1801-1803) but **vitest is not installed in this tree** (`which vitest` empty, no `node_modules/.bin/vitest`, no package.json entry). The `bun:test` file is the ported battery the W2 desk landed; SCOPE-e1's own gate line allows it: "`npx vitest ...` 500-run green OR bun test src/e1" (SCOPE-e1.md:16). OR-branch taken honestly.
**Verdict:** SC-2 PASS **under the bun-native runner** (the only runner on disk). The "FILE NOT FOUND" line in round 1 is superseded — that probe passed a non-test path (`properties.ts`) to bun's filter; the real file is `properties.test.ts`.
**SC-23 line in round 3** ("MISSING-FILE") is superseded by W7R (`src/kernel/report-validator.ts` landed + 5/0 @ `68440de`).

Not ship. W9 stays blocked (SC-21 2/5, lmv-fx 13/15 NEEDS-LTF). Nested main/grok untouched.

## 2026-09-15 SC-27 verdict (orch, HEAD 3d4ece8)

**Command:** `grep -rn "TODO|FIXME|HACK|XXX|heuristic" src/e1 src/e2 src/card src/kernel src/enforcement src/visual src/aether --include='*.ts'` (non-test) → **zero hits.** Prior round's `killedDuplicates`/`killed` hits are now confirmed absent from this grep set (earlier sightings were in cascade-loop dedup guards; the current tree's non-test lock code carries no TODO/FIXME/HACK/XXX/heuristic markers).
**Verdict:** SC-27 PASS-side as **zero killed-heuristic residue** in non-test lock code. (Test files excluded by construction — fixtures name mutants deliberately.)

Not ship. W9 stays blocked (SC-21 2/5, lmv-fx 13/15 NEEDS-LTF). Nested main/grok untouched.
