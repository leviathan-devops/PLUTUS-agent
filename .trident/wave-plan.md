WAVES: 4

# Plutus V5 — grok-prototype hydra wave plan
# cwd: PLUTUS/agent/.worktrees/grok-prototype
# parent: plutus/main @ e99377f (do not write)
# baseline: 5cd7af1 LIVE import
# START NOW = WAVE 1a only. Do not rewrite this file after cycle 0 except GATE lines.

## WAVE 1a — temporal OHLC lock (OPEN INNER)
- owner: orch + 1 bars desk
- files: scripts that rebuild /tmp/opencode/bars_raw.json · FutureBarLeak sites · NOT src/mdve/sl-lmv.ts
- deliverable: bars_raw from Vibe 4H+1H + Air 1H weeks 2026-07-06 (all bars t<=1783317600000)
- GATE: FutureBarLeak throws on t>anchor; frozen pair sha match; bun test src/jesl/ HELLO-GATE ALL GREEN
- OCR: skip (no product kernel rewrite yet)

## WAVE 1b — W0 spec corpus
- owner: spec desk
- files: specs/mpse/** specs/fixtures/** (disjoint from src/e1 src/e2 src/kernel)
- deliverable: S-1..S-7 compiled battery + D17 calibration
- GATE: predicates CALIBRATED or born-off; founding oracle discharges
- OCR: ocr delegate preview --from plutus/main --to HEAD --repo $PWD ; if reviewable_count>=6 then /workflow open-code-review

## WAVE 2 — Card Generator + Kernel in parallel (W1–W6)
- plans: E1 src/e1/** · E2 src/e2/** · card src/card/** · kernel src/kernel/** · substrate already present
- disjoint write-sets; cap 4 product-file writers; min 5 desks (snipers extra)
- GATE per plan: that plan's SC row + ripwire --for on each new module first-touch (hook enforces kernel)
- OCR: per-plan after audit, delegate; workflow if >=6 files in that plan's diff

## WAVE 3 — converge + review fusion (W7–W8 wiring)
- files: report-v452.ts rewrite-as-JESL-graph ONLY if write-set disjoint from frozen pair; golden-gate stays measurement
- GATE: bun report-v452.ts + bun diag-reasoning-chain-golden.ts --day=2026-07-06 on REAL bars_raw
- OCR: /workflow open-code-review args from=plutus/main to=HEAD repo=$PWD
- ripwire --test-gate --quality-delta vs plutus/main
- NOT /goal complete

## WAVE 4 — legal stop (PR vs main)
- deliverable: commits on plutus/grok-prototype + request-pull / PR text vs plutus/main
- GATE: Monday 5/5 ≤3p as E1+E2 storyline (R1: 5/5 without storyline = fail) · RRR≥3.0 except documented residuals · D13 grep-gate · determinism sha×2 · frozen pair · OCR zero open critical/high · classifier may not weaken
- bundled /review only if a GitHub PR exists; this repo has no origin yet
