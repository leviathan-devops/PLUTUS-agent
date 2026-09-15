# BUILD_REPORT — Plutus V5 omp-worker-1

## 2026-09-15 W0 spec corpus

**Commit:** 2fa34c5 on omp-worker-1  
**What landed:** S-1..S-7, battery.json fp 8acfe74f… 46/46, d17, golden-week, 9 mutants, calibrate/compile/jspec/oracle-registry.  
**Architecture:** math corpus before jesl/e1. Two-machine split unchanged. Frozen pair untouched.  
**Verification (orchestrator):** 7 S-files; jspec 7×PASS; calibrate CALIBRATE_OK; 40/13 CONTRADICTED; frozen MATCH.  
**Residual:** W1 jesl/scripts/harness absent.
