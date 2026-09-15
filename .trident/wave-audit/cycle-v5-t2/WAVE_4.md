# WAVE 4 audit — request-pull vs plutus/main (cycle-v5-t2)

Not stamped on jesl / WAVE 1a / WAVE 3 alone. This is the legal-stop pack.

## L0
cwd-check OK · frozen MATCH
- sl-lmv.ts `912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab`
- trade-dedup.ts `33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4`
plutus/main `e99377f` CLEAN (parent worktree `## plutus/main`). Never committed there.

## Commit
`52a310d feat(w4): OBCV-first kernel pick, real-bars e1 fixture, multiweek D13`
on `plutus/grok-prototype` only. Generated `report_v452.md` / Visual_Evals untracked, not committed.

## vs-main / GROK_PROTOTYPE compare (green)
`git log --oneline plutus/main..HEAD` — 14 commits (5cd7af1 … 52a310d)
Parent: `git -C PLUTUS/agent log --oneline plutus/main..plutus/grok-prototype` same tip 52a310d
`git diff --stat plutus/main...HEAD` — 1159 files (LIVE import dominates)
Evidence: `{SCRATCH}/vs-main.txt` `{SCRATCH}/w4/grok-prototype-compare.txt`

## request-pull
`git request-pull e99377f .` EXIT 0
Full text: `{SCRATCH}/pr.txt` — do not merge to plutus/main.

## Golden / D13 (this cycle, WAVE 3 evidence reused)
Monday 5/5 ≤3p NATIVE + E2 SS storyline. report sha 9689cd8a ×2.
DIAG_EXIT=1 G1 fortress + G4 zone-element residuals documented.
D13: runPipeline no oracle; grep MIXED comments/TVI; multiweek dir-tautology fixed in 52a310d.

## OCR
preview vs plutus/main reviewable_count=443. 431 skipped LIVE import. 12 grok-delta → wave4-ocr-priority-5 (this turn).
See ocr-file-actions.json. Zero open critical/high required after that workflow.

## Desks (5)
vs-main · frozen/jesl sniper · OCR · request-pull · orch commit
PLAYED:YES WAVE 3 harness. honest-watch: report_v452.md storyline read WAVE 3.

Do not merge plutus/main.
