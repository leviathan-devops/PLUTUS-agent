# WAVE 4 legal-stop pack (cycle-v5-t2) — current HEAD

Do not stamp on jesl / WAVE 1a. Do not merge plutus/main.

## Refs
- Branch `plutus/grok-prototype`
- HEAD: see `git log -1` on this branch (pressure-actor hyphen fix + prior V5 list)
- Parent `plutus/main` `e99377f155c357f87c33082ce4efff6a37d5371a` CLEAN
- Frozen MATCH `912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab` / `33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4`

## Captures (`{SCRATCH}`)
- `vs-main.txt` — `git log --oneline plutus/main..HEAD` + `git diff --stat plutus/main...HEAD` + GROK_PROTOTYPE parent compare
- `pr.txt` — `git request-pull e99377f .` EXIT 0; **do not merge**
- `ocr-preview.json` — reviewable_count=443 merge_base e99377f
- `ocr-file-actions.json` — 431 skipped LIVE import; 12 grok-delta reviewed
- `w4/hygiene.txt` — jesl HELLO-GATE, frozen
- `w4/played.txt` — PLAYED=YES (Monday 5/5 on clipped bd09 this cycle, report sha 9689cd8a)

## OCR zero open critical/high
wave4-ocr-priority-6: 12/12 reviewed, 0 critical.
Confirmed high: pressure-actor `ACTIVE_1` vs PressureState `ACTIVE-1`.
Fixed: context.state emits `ACTIVE-1`/`ACTIVE-2`; XState node ids unchanged; bun test src/e1 197/0.
Open critical/high after fix: **0**. Mediums (CSV host paths, multiweek synth) not highs.

## Five desks
vs-main · request-pull · OCR preview · frozen/jesl · PLAYED recapture. Orch re-ran log/diff/request-pull/preview.

G1/G4 DIAG_EXIT=1 remain documented SC-5 residuals (not RRR). Named live bars_raw still clipped bd09.
