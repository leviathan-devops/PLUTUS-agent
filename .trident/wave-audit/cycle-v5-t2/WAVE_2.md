# WAVE 2 audit — Card Generator + Kernel (cycle-v5-t2)

WAVE 1a/1b CLOSED. Do not stamp Achieved. Legal stop WAVE 4.

## L0
- cwd-check OK · frozen MATCH · bars_raw bd09f2b8 max_t===anchor
- Date.now in e1/e2/card/kernel: comment-only denial in run-from-bars.ts:4

## Desks (5, cap 4 writers)
| desk | write-set | wrote | orch re-verify |
|---|---|---|---|
| e1 | src/e1/** | run-fixture.ts + tests/run-fixture-real-bars.test.ts | bun test src/e1 **197/0** |
| e2 | src/e2/** | no (sniper; TEST_SPOT already) | bun test src/e2 **139/0** |
| card | src/card/** | no (sniper; no golden-week import) | bun test src/card **25/0** |
| kernel | src/kernel/** | run-from-bars.ts + .test.ts | bun test src/kernel **110/0** |
| sniper | none | no | ripwire --test-gate kernel/run-from-bars.ts tests=1 untested=0; OCR workspace |

SC-4 this cycle: 5 desks, 2 writers, disjoint paths. e2/card idle writers because batteries green (not skip of desks).

## Kernel pickOriented
OBCV-first (phase 1) → mixed one ENV side (phase 2) → pure envelope last-resort (phase 3).
fibAccepts wraps shipped `computeFib` (not a copy of the cascade).
Orch runV5FromBarsRaw:
- DXY rr 10.1 zones all OBCV (no ENV)
- EUR/USD rr 98.6 mixed ENV supply + OBCV demand
- GBP/USD rr 73.7 mixed ENV supply + OBCV demand (0 pure OBCV oriented pairs)
- week file throws FutureBarLeak t=1783321200000

## Ripwire
- `--for="edit kernel/run-from-bars.ts"` ran before kernel writes
- RIPWIRE_GATE deny-once did **not** fire on this desk's first search_replace (session already spent deny-once on kernel/run-from-bars.ts earlier this session). Honest residual, not a silent skip of the hook.

## OCR
- vs plutus/main: reviewable_count=443 (LIVE import); WAVE2 dirs 55 added files
- this-cycle workspace preview: reviewable_count=**2** (`src/e1/run-fixture.ts`, `src/kernel/run-from-bars.ts`); tests excluded
- workflow not launched (2 < 6)
- both reviewable files reviewed; 0 open critical/high
- `{SCRATCH}/w2/ocr-file-actions.json`

## Out of write-set
`specs/e1-snapshot.json` dirtied by fixture default path — **reverted**. Not committed.

## Frozen / main
91294083… / 33914c89… · plutus/main e99377f · HEAD still c7b91cd (WAVE 2 uncommitted)
