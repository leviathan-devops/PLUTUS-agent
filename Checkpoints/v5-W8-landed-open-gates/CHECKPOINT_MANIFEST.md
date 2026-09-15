# CHECKPOINT MANIFEST — v5-W8-landed-open-gates

**Token:** `v5-W8-landed-open-gates`  
**Date:** 2026-09-15  
**Branch:** omp-worker-1  
**HEAD at snapshot:** after W8 `b7e87f3` + docs (see git log)  
**Not ship.** Not v5-W9-converge.

## Frozen pair (verified)

```
src/mdve/sl-lmv.ts       912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab
src/mdve/trade-dedup.ts  33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4
```

## What landed (orch re-ran)

- W0 specs/mpse S-1..S-7 battery fp 8acfe74f 46/46; 40/13 CONTRADICTED
- W1 jesl HELLO 1/0; run-battery.sh +x; harness 2 fail until e2/kernel (later landed)
- W2 e1 bun test 199/0 FUTURE_BAR_LEAK
- GATE-W3 tsc EXIT 0 after runtime Effect Service() fix
- W3 e2 bun test 138/0 SIDE_INVERSION FIRE/SILENT
- W4 visual/aether 51/0 GRADE:FAIL junk PNG
- W5 card 25/0 schema.ts on disk
- W6 kernel 68/0 L4 CASCADE_NO_INVERSE
- W7 report-* 35/0
- W8 enforcement 33/0 (no conformance.ts)

## Counts

- src .ts in checkpoint ≈ 405
- files ≈ 491
- dist ABSENT
- node_modules NOT copied

## Honest gaps (ship bar NOT met)

1. GATE-CLASS golden-gate day=2026-07-06 NOT run as green 5/5 this snapshot.
2. report-v452.ts ran exit 0 with **0 headline trades** — not acceptance.
3. SC-6 90-row totality test is 30/60 not 90.
4. SC-11 12 live TV screenshots not taken (stub FAIL).
5. SC-17/21/25 golden pips NOT RUN.
6. SC-24 conformanceZero not runnable (conformance not ported).
7. product_tui container-testing NOT RUN.
8. Nested plutus/main and grok-prototype untouched (correct).

## Next

Do not stamp COMPLETE. Remaining: golden-gate fixture path, SC-21 Monday 5/5, SC-25 ≥15/21, container TUI, W9-converge checkpoint.

## Lock

MODE B mutable. No chattr.
