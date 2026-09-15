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
- GATE: PASS f0f790a — FutureBarLeak throws on t>anchor; frozen pair sha match; bun test src/jesl/ HELLO-GATE ALL GREEN; bars_raw sha bd09f2b88ccaffd66a1f034c1c05147703ab98cf8bf40fcd8ea1b37965cfeb5c dual-match max t===1783317600000
- OCR: skip (no product kernel rewrite yet)

## WAVE 1b — W0 spec corpus
- owner: spec desk
- files: specs/mpse/** specs/fixtures/** (disjoint from src/e1 src/e2 src/kernel)
- deliverable: S-1..S-7 compiled battery + D17 calibration
- GATE: PASS — COMPILE_OK 46/46 fp 8acfe74f…; CALIBRATE_OK 20 calibrated 0 born-off
- OCR: ocr delegate preview --from plutus/main --to HEAD --repo $PWD ; if reviewable_count>=6 then /workflow open-code-review

## WAVE 2 — Card Generator + Kernel in parallel (W1–W6)
- plans: E1 src/e1/** · E2 src/e2/** · card src/card/** · kernel src/kernel/** · substrate already present
- disjoint write-sets; cap 4 product-file writers; min 5 desks (snipers extra)
- GATE: PASS batteries e1=197 e2=139 card=25 kernel=110 (this cycle); 5 desks (e1 writer, kernel writer, e2 sniper, card sniper, ripwire/OCR sniper); pickOriented OBCV-first envelope last-resort; e2/card wrote=no (green)
- OCR: per-plan after audit, delegate; workflow if >=6 files in that plan's diff

## WAVE 3 — converge + review fusion (W7–W8 wiring)
- files: report-v452.ts rewrite-as-JESL-graph ONLY if write-set disjoint from frozen pair; golden-gate stays measurement
- GATE: PASS 5/5 ≤3p on real bars (G1 EU LONG Δ1.5p); G1/G4 fortress residuals FAIL documented; report sha 9689cd8a ×2 + D13 mutate-oracle identical; OCR grok-delta 12 reviewed 0 crit; 1 high multiweek.ts dir-tautology FIXED this cycle
- OCR: /workflow open-code-review args from=plutus/main to=HEAD repo=$PWD
- ripwire --test-gate --quality-delta vs plutus/main
- NOT /goal complete

## WAVE 4 — legal stop (PR vs main)
- deliverable: commits on plutus/grok-prototype + request-pull / PR text vs plutus/main
- GATE: PASS request-pull vs e99377f (pr.txt); 14 commits 5cd7af1..52a310d on grok-prototype; OCR 443 vs-main 431 LIVE-skip + 12 grok-delta workflow; 5/5 storyline + frozen + D13; G1/G4 residuals still FAIL (DIAG_EXIT=1, not silent); main untouched
- bundled /review only if a GitHub PR exists; this repo has no origin yet
