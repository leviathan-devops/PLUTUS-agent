# DEBUG_LOG — Plutus V5 omp-worker-1

## 2026-09-15 W0

No defect. Overlay S-files already matched V5 §8 W0 table; no rewrite. Known-bad 40/13 CONTRADICTS (not PASS). Lesson: git show per-file, never checkout overlay onto omp-worker-1.

## 2026-09-15 W9 SC-21

Symptom: golden 2/5 exit 1. EU LONG E=1.14189 Δ7.9p vs 1.14110.
Mechanism: fortress DEMAND [1.14004-1.14147] exists; lmv.table has 0 BUY_SIDE rows inside it; interior-reaction falls to [1.14150-1.14189]. Nested LQZ needs 30m/15m (R21). Fixture 30m/15m n=0 GAP.
Tried: W9EuLmv (no rungs); W9LqzNest (reaction gate BODY_DEFEND only / SELL_SIDE vote). Stopped — no lmv.ts/lqz-matrix.ts edit (R29).
Verification: rebuild-fixture 6 GAP; golden G7 2/5; frozen MATCH; Checkpoints/v5-W9-converge absent.
Lesson: do not mint v5-W9-converge on a red SC-21. Do not harvest live TV into the 2026-07-06 fixture.
