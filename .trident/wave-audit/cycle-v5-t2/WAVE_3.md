# WAVE 3 audit — golden + D13 + OCR (cycle-v5-t2)

Not /goal complete. WAVE 4 legal stop remains.

## L0
cwd-check OK · frozen MATCH 91294083… / 33914c89… · plutus/main e99377f
decision bars_raw sha bd09f2b88ccaffd66a1f034c1c05147703ab98cf8bf40fcd8ea1b37965cfeb5c max_t=1783317600000 le_anchor
week bars_raw.week.json sha 24fe22c837abbd8649b291ffe499395e56113fd69e6a5ad301d371a2aa2380b8 max_t=1783702800000 gt_anchor (outcome only)

## Golden (orch sequential pair ×2, not the racing desks)
`bun report-v452.ts` then `bun diag-reasoning-chain-golden.ts --day=2026-07-06`
- report sha ×2 `9689cd8a1237fe1f65af40d764dc8397a04fabf77641d2309cbd10c5bd282637` MATCH
- FEED-SPLIT: decision le_anchor=true · week FutureBarLeak THROW
- Monday 5/5 ≤3p NATIVE (E2 Monday SS storyline in report_v452.md THE STORYLINE):
  DXY LONG Δ2.7p HIT · DXY SHORT Δ2.0p HIT · EU SHORT Δ0.5p HIT · EU LONG Δ1.5p HIT (G1 ±2p) · GU LONG Δ1.3p HIT
  RRR 4.12 / 3.00 / 3.14 / 3.00 / 3.00
- G1-G10 8/10; FAIL G1 fortress token + G4 zone-element — documented residuals; DIAG_EXIT=1 by design
- PLAYED:YES this cycle. honest-watch: orch re-ran SC-5 and read report_v452.md storyline section.

## D13
- mutate-oracle NONCONSUME: in-tree golden-week.json unread by report-v452.ts; sha unchanged 9689cd8a after two runs
- runPipeline(orchestrator.ts:226) no oracle arg
- grep MIXED: executable comparators only in golden-gate.ts; comments + TVI example strings elsewhere
- multiweek.ts HIGH (OCR confirmed): zone type from row.dir → orientationOk tautology. FIXED: type from synth last C vs O; test proves orientationOk can fail. bun test specs/harness/multiweek.test.ts 13/0

## OCR
- preview vs plutus/main reviewable_count=443 excluded=712
- 431 skipped reason=LIVE import 5cd7af1 vs empty main; not grok-delta
- 12 grok-delta reviewable → workflow wave4-ocr-priority-4: reviewed=12 skipped=0
- open_critical=0; 1 confirmed high (multiweek.ts) **fixed this cycle**; 1 medium (synth bars in multiweek, honest harness class)
- tests/md excluded by OCR, not invented

## Desks
golden-1, golden-2, D13, OCR ledger, ripwire/jesl sniper (5). Orch re-ran golden sequentially.

classifier: WAVE 3 inner is not WAVE 4 PR / not /goal done.
