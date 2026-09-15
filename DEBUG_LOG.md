# DEBUG_LOG — Plutus V5 omp-worker-1

## 2026-09-15 W0

No defect. Overlay S-files already matched V5 §8 W0 table; no rewrite. Known-bad 40/13 CONTRADICTS (not PASS). Lesson: git show per-file, never checkout overlay onto omp-worker-1.

## 2026-09-15 W9 SC-21

Symptom: golden 2/5 exit 1. EU LONG E=1.14189 Δ7.9p vs 1.14110.
Mechanism: fortress DEMAND [1.14004-1.14147] exists; lmv.table has 0 BUY_SIDE rows inside it; interior-reaction falls to [1.14150-1.14189]. Nested LQZ needs 30m/15m (R21). Fixture 30m/15m n=0 GAP.
Tried: W9EuLmv (no rungs); W9LqzNest (reaction gate BODY_DEFEND only / SELL_SIDE vote). Stopped — no lmv.ts/lqz-matrix.ts edit (R29).
Verification: rebuild-fixture 6 GAP; golden G7 2/5; frozen MATCH; Checkpoints/v5-W9-converge absent.
Lesson: do not mint v5-W9-converge on a red SC-21. Do not harvest live TV into the 2026-07-06 fixture.

## 2026-09-15 F4 (supersedes the W9-era "do not harvest" lesson)

Symptom: fixture 30m/15m n=0 across all pairs; lmv-fx 13/15, Monday 2/5 attributed to NEEDS-LTF.
Mechanism of the old blocker: bars fixture was a pointer doc (`barsPointer`) with the harvest named as the F4 fix but never run — the earlier "do not harvest live TV" lesson feared fabricated/misaligned candles derailing golden. F4 disproved the fear mechanism: real broker-corrected bars + anchor slice (`ts <= 1783317600000`) keep gate0, SC-20 determinism (`677c4b23…` ×2) and the G8 forward-read control all green.
Broker-map gotcha (the real trap): overlay's documented map was WRONG at runtime — `EURUSD/ICE` and `ICEMARKETS:EURUSD` return zero bars; the live ICE composite is `FX_IDC:EURUSD`. Measure the exchange list on first live use, never assert the doc.
LTF data is NOT monotone-positive: filling the slots improved lmv-fx (13→14, TP 2/2) but Monday went 2/5 → 1/5 (DXY SHORT flipped HIT→NONE; GU LONG Δ84.4p). Data absence was masking a real pipeline delta.
Lesson: an A/B fixture diff (bak-f4 vs current) through the golden diag is the required next evidence before any entry-selection fix — never tune against a fixture whose input just changed under it.

## 2026-09-15 F4B (forensics) + F4C (outcome-window) — two lessons

Lesson 1 — fixture slicing scope: "slice to the anchor" is an ANALYSIS-consumption rule (`barsFor` filters at `report-v452.ts:327`), NOT a storage rule. Pre-slicing the fixture starved the outcome sim (`simBarsFor` reads 1H unsliced, `:329-331`) and vacuated G8's negative control (golden-gate.ts:322-333: vacuous iff no beyond-bars). The canon fixture spans 04-30→07-10T17:00; post-anchor bars in storage are REQUIRED and leak-safe because consumers self-slice. Never re-slice at storage.
Lesson 2 — fixture invariance proof pattern: after any fixture change, diff the analysis outputs (Monday convergence lines byte-identical + anchor digests + negative control UNCHANGED) BEFORE reading any new gate numbers. F4C moved G8 7/10→8/10 and OUTCOME 0/0→0/4 with analysis byte-identical — that ordering is what makes the new numbers trustworthy.
Both audits: `.trident/wave-audit/F4B.md`, `.trident/wave-audit/F4C.md`.

## 2026-09-15 WK2 (per-day runner) — two lessons

Lesson 1 — complete the loop before judging the machines: WK1 blamed "week-frozen projections" on the chain; WK2's per-day loop (built strictly per machine contracts) reproduced the score pip-for-pip, relocating the cause: zones carry the single ≤anchor context (no per-day zone contract exists) and the B.W3.1 dayTable cannot walk [SS,BS,R,BS,WL] past Wed (R→BS / BS→WL absent — test-pinned "the documented gap" with the exact guard fields attempted). A harness gap and a machine/spec gap were one symptom; only completing the loop separated them.
Lesson 2 — verify the "missing edge" claim against the FULL table before elevating to doctrine: near-miss edges (R→WL, BS→RWL) look like the missing ones but target different states; the pinning tests record the absence as deliberate ("documented gap"), which is D13-compliant machine authorship — the unquotable part is genuinely the operator's (which side of the B.W3.1-vs-B.W3.5 contradiction is canonical).
Decision sheet for the operator: `Checkpoints/v5-W9-open-doctrine/RULINGS-REQUESTED.md` (4 rulings + 2 data asks).
