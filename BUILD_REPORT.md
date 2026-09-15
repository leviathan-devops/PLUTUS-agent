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
