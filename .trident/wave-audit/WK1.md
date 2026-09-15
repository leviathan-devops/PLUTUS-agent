# WAVE AUDIT — full-week V5 golden measurement (orch audit of WkMeasure desk, 2026-09-15)

**Base:** `6ca3825` · **Branch:** omp-worker-1 · **Frozen:** MATCH · **Harness walls:** specs/harness 46/0, tsc clean
**Desk:** 2m15s. One-line path fix (real-week-runner.ts:309 stale old-workspace absolute path → repo fixture) + /tmp bars derivation from the canon fixture (1H slots fed VERBATIM incl. outcome bars; the runner enforces its own temporal gate: ctx 1121/1118/1118 ≤ anchor).

## The measurement (D13 ORACLE_ISOLATION held — oracle read only after output)

**V5 full-chain golden score: 1/17 HIT ≤3p · 1/17 ≤5p · 4/17 ≤10p · 13 MISS · 0 NO_COVERAGE.**

| Verdict | Rows |
|---|---|
| HIT (≤3p) | EUR/USD-Wed-Short (Δ3p, ST-EUR/USD-0-SHORT) |
| NEAR (4-10p) | EUR/USD-Mon-Short Δ7p · GBP/USD-Tue-Short Δ9p |
| MISS worst | GBP/USD-Thu-Long Δ120p · EUR/USD-Thu-Long Δ75p |

## The structural finding

The V5 chain emits only 2-4 **Monday-anchored** projections per pair (ST-*-0/1) and holds them across the whole week — Tue-Fri oracle rows score only when levels coincide with those frozen Monday levels. The v4.5.3 regime re-designated per day (its 12/21 ≤3p fingerprint came from day-native chains). The V5 chain's week-frozen projection set is the accuracy gap.

## Honest framing

- **Denominator seam:** the baseline's /21 counted rows this harness does not define (17 scored here: 8 EU + 7 GU + 2 DXY-Monday). Any "x/21" restatement of the V5 score would be fabrication — framings kept separate.
- **Ship-bar consequence:** SC-25's ≥15/21 leg through the V5 chain measures **1/17 — NOT met**. The named residual grows a second item: per-day designation coverage in the V5 chain (candidate owners: e2 freshness/workflow machines or the runner's shapeChains input feeding only Monday shapes — runner :110 takes fixture shapeChains as INPUT, "the operator's read, an input not oracle").
- The path-fix diff is self-containment only; comparator logic untouched; score untuned (R14/R28).

## Consequence for the doctrine questions

This reframes F4B's two Monday questions: even if both were ruled for SC-21 (Monday 5/5), the WEEK-scope gap (SC-10 ≥12/21, SC-18 ≥14/21, SC-25 ≥15/21 through the V5 chain) needs per-day designation coverage — a third, larger question for the operator: does the V5 chain re-designate per day (v4.5.3 regime) or designate once per week?
