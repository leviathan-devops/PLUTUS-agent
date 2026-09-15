# WAVE 1b audit — W0 spec corpus (cycle-v5-t2, this turn)

WAVE 1a remains CLOSED (bars_raw sha bd09f2b8 max_t===anchor; not reopened).
Do not stamp Achieved. Legal stop is WAVE 4.

## L0 preflight (orch, before dispatch)
- cwd-check WAVE_GATE_OK grok-prototype
- frozen MATCH 91294083… / 33914c89…
- wave-plan.md WAVES: 4
- bun test src/jesl/ HELLO-GATE ALL GREEN
- FutureBarLeak 4/4 still green (hygiene)
- bars_raw still bd09f2b88ccaffd66a1f034c1c05147703ab98cf8bf40fcd8ea1b37965cfeb5c max 1783317600000
- HEAD c7b91cd · plutus/main e99377f

## Desks (5, disjoint)
1. compile S-1..S-7 — CLAIM COMPILE_OK 46/46 fp 8acfe74f… ; orch re-ran MATCH
2. D17 calibrate — CLAIM 20 calibrated 0 born-off 26 evidence-only ; orch re-ran MATCH
3. jspec-check — 7/7 PASS 0 PROPOSED; known-bad missing quote EXIT 1
4. D13 isolation — runPipeline takes no golden-week.json; emission imports 0; literal grep MIXED comments/TVI examples residual WAVE 3
5. OCR preview — reviewable_count 443 vs main; WAVE 1b specs/mpse harness 6 reviewable (LIVE import 5cd7af1); S-*.md + fixtures excluded (unsupported_ext / default_path)

## Mechanical gates (orch, not desk word)
```
COMPILE_OK: 46 blocks → 46 predicates, fingerprint 8acfe74f272bf736de101e297b731cfa97c9fdd4a1684e63363489f116af7b7e
battery.json sha256 ×2 588e2aa17901327324ea2c0f58e62cb6f98aeb8d2c0c381af5bb735fb1639664 MATCH
COMPILE_FAIL D13_VIOLATION known-bad missing quote EXIT 1
CALIBRATE_OK: 20 calibrated, 0 born-off, 26 evidence-only, 1 founding control (mirror-floor-24 VALID)
jspec 46 quote+anchor blocks, 0 PROPOSED; known-bad EXIT 1
git status specs/mpse specs/fixtures: clean (rewrites byte-identical)
```

## OCR this wave
- preview: `{SCRATCH}/w1b/ocr-preview.json` reviewable_count=443 merge_base e99377f
- WAVE 1b reviewable files (6): compile.ts calibrate.ts oracle-registry.ts jspec-check.ts battery.json d17-report.json
- workflow wave4-ocr-priority-3 COMPLETE: 6 desks, reviewed=6 skipped=0 findings=[] open_critical=0 open_high=0
- S-*.md + fixtures excluded by OCR (unsupported_ext / default_path) — not invented as reviewed
- vs-main 443 remainder is WAVE 3/SC-7 residual (not this inner)
- no this-cycle spec edits vs HEAD — corpus is LIVE import 5cd7af1

## D13 (WAVE 1b scope)
- golden-week.json: evidence-only in calibrate (51 EVIDENCE verdicts, never gating)
- runPipeline(orchestrator.ts:226) args: weekStart, tools, agentInvoke — no oracle file
- kernel/run-from-bars.ts: "No golden-week.json"
- src/ literal hits MIXED: comments + TVI example strings + golden-gate.ts GOLDEN_ORACLE (measurement). Residual for WAVE 3/SC-6. No src edits this wave.

## Frozen / main
unchanged. classifier: WAVE 1b inner PASS is not /goal done.
