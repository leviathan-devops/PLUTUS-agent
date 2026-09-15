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
