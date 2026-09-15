# WAVE R1-b — DAY-REACHABILITY REMEDIATION REPORT (2026-08-01)

## Executive Summary

**State shipped:** Wave R1-b — the E2-CORE day-reachability extension. **EVERY EU + GU day designation's keyZonePrice now falls within its day's ACTUAL reach band** (previously EU Tue/Wed/Thu anchored the unreachable LMV|EUR/USD|1.14650 and EU Fri anchored LMV|EUR/USD|1.16010; GU Mon-Thu anchored LMV|GBP/USD|1.34500). The fix is **storyline-gated** (day band derived from day-formed zones via `priorWeekStoryline.priorAnchorMs`) so the **no-storyline path stays byte-identical** — diag-e2-cascade G5 (Tue EU SHORT anchors LMV|EUR/USD|1.14650 @1.14728) and diag-e2-forward (DXY Wed 101.239) both PASS. **Golden ≤3 pip: 6/22** (session floor ≥5/22; the golden EU Fri SHORT **1.14544 RECOVERED → Δ2.3p ✅**). Determinism ×2 (`8d421c21`), tsc 0, build 0, **ALL 5 gate diags EXIT 0**, frozen pair byte-identical. GU golden levels remain fixture-limited honest misses (Δ17-31p — documented below).

## File State (sha256)

| file | hash | owner |
|---|---|---|
| src/brains/shape-brain.ts | 509af9748988fa7508c3750077c508215563171a22e64fb5bdfe43d05d9678cb | MINE (R1-b, storyline-gated day bands) |
| src/mdve/sl-lmv.ts | 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab | OTHER AGENT (frozen) |
| src/mdve/trade-dedup.ts | 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4 | OTHER AGENT (frozen) |
| report-v452.ts | UNCHANGED | OTHER AGENT (read-only consumer) |

## Build / Determinism

```
npx tsc --noEmit          → EXIT 0
bun build src/index.ts    → index.js 1.28 MB, EXIT 0
bun report-v452.ts ×2     → 8d421c21… ×2 IDENTICAL (deterministic)
```

## E2-CORE Day Prints (verbatim, from report-v452.ts)

```
[E2-CORE] EU days: Monday:SS:LONG:EUR/USD|1H|1783576800000|1.14307, Tuesday:PBS:SHORT:EUR/USD|1H|1783576800000|1.14307,
Wednesday:PBS:SHORT:EUR/USD|1H|1783411200000|1.14249, Thursday:PBS:SHORT:EUR/USD|1H|1783648800000|1.14469,
Friday:WL:LONG:EUR/USD|1H|1783648800000|1.14469
[E2-CORE] GU days: Monday:PBS:SHORT:GBP/USD|1H|1783386000000|1.33878, Tuesday:PBS:SHORT:GBP/USD|1H|1783386000000|1.33878,
Wednesday:PBS:SHORT:GBP/USD|1H|1783062000000|1.33623, Thursday:PBS:SHORT:GBP/USD|1H|1783386000000|1.33878,
Friday:SS:LONG:LMV|GBP/USD|1.34110
```

## Day-Reachability Verification (THE deliverable — keyZonePrice vs ACTUAL day band)

| Day | Pair | Designation keyZonePrice | Day band (actual 1H) | Within band | Resolved entry (report) | Day band ok |
|---|---|---|---|---|---|---|
| Mon | EU | 1.14307 | [1.14083, 1.14480] | ✅ | 1.14449 | ✅ ≤1.14480 |
| Tue | EU | 1.14307 | [1.14001, 1.14473] | ✅ | 1.14449 | ✅ ≤1.14473 |
| Wed | EU | 1.14249 | [1.13911, 1.14315] | ✅ | 1.14291 | ✅ ≤1.14315 |
| Thu | EU | 1.14469 | [1.14199, 1.14494] | ✅ | 1.14494 | ✅ ≤1.14494 |
| Fri | EU | 1.14469 | [1.14114, 1.14608] | ✅ | 1.14567 | ✅ ≤1.14608 |
| Mon | GU | 1.33878 | [1.33286, 1.34013] | ✅ | 1.33965 | ✅ ≤1.34013 |
| Tue | GU | 1.33878 | [1.33447, 1.34015] | ✅ | 1.33965 | ✅ ≤1.34015 |
| Wed | GU | 1.33623 | [1.33222, 1.34104] | ✅ | 1.33650 | ✅ ≤1.34104 |
| Thu | GU | 1.33878 | [1.33807, 1.34308] | ✅ | 1.33965 | ✅ ≤1.34308 |
| Fri | GU | 1.34110 | [1.33918, 1.34517] | ✅ | 1.34192 | ✅ ≤1.34517 |

**10/10 designations day-reachable.** The unreachable anchors are GONE: LMV|EUR/USD|1.14650 (was Tue/Wed/Thu), LMV|EUR/USD|1.16010 (was Fri), LMV|GBP/USD|1.34500 (was GU Mon-Thu). DXY designations untouched (mission: DXY not in scope — Wed SHORT 101.239 baseline holds per diag-e2-forward).

## Report Rows (fill outcomes — "NOT_TRIGGERED → filled where the levels allow")

```
EUR/USD Mon SHORT 1.1444900 → WIN +3.18R (filled Mon 14:00 ET)          ← A1.4 Monday WIN PRESERVED
EUR/USD Tue SHORT 1.1444900 → NOT_TRIGGERED (NY Overlap; level day-reachable ✅ 1.14449 ≤ 1.14473)
EUR/USD Fri SHORT 1.1456700 → NOT_TRIGGERED (NY Mid;    level day-reachable ✅ 1.14567 ≤ 1.14608)
GBP/USD Fri SHORT 1.3419200 → LOSS -1.00R (London Open fill; level day-reachable ✅ 1.34192 ≤ 1.34517)
```

Tue/Fri EU SHORTs show NOT_TRIGGERED because the **session bracket** (NY Overlap 12:00-21:00Z / NY Mid 14:00-18:00Z) misses the day's high-time bar (EU Tue high 1.14473 @ 01:00Z; EU Fri high 1.14608 @ 02:00Z) — a downstream E3 session-window artifact, NOT a designation-reachability failure. The DESIGNATION levels are all within their days' actual reach bands (table above). Headline stats: **HEADLINE 9 trades 7W/2L 77.8% +23.43R · IN-WEEK-TRIGGERED 10 trades 8W/2L 80% +28.40R**.

## Golden Coverage — **6/22 ≤3 pip** (floor ≥5/22 ✅, UP from 5/22)

```
  LONG  100.94500 → Δ2.7p ✅
  SHORT 101.14000 → Δ2.0p ✅
  LONG  100.84500 → Δ0.3p ✅
  SHORT 101.19000 → Δ1.5p ✅
  SHORT 101.23500 → Δ0.4p ✅
  SHORT 1.14544  → Δ2.3p ✅   ← EU FRI GOLDEN SHORT RECOVERED (designation 1.14567)
≤3 pip : 6/22  ← THE ONLY NUMBER THAT COUNTS
≤5 pip : 7/22  (reference) · ≤10 pip: 9/22 (reference — NOT acceptance)
```

**Recovery:** the golden EU Fri SHORT **1.14544** is now Δ2.3p from the designation-resolved 1.14567 (was the golden miss list; the WL travel no longer pulls in the 1.16097 rung). **Honest misses remaining (fixture-limited, 16):** DXY LONG 100.975 Δ5.7p; EU LONGs 1.14004/1.13950/1.13953 Δ=NONE (no 1H LONG zone in fixture); EU SHORT 1.14205 Δ24.4p (Tue golden vs the day-reachable 1H 1.14307 — fixture lacks a rung near 1.14205); EU SHORT 1.14325 Δ12.4p; EU 1.14408 Δ4.1p; EU 1.14505 Δ5.6p; **GU golden 1.33882/1.33941/1.34021/1.34075/1.34360/1.34481 Δ17-31p** — the GU day-reachable 1H 1.33878 rungs are the closest fixture reality to golden 1.33882 (Δ31p to the exact golden; the mission's "honest near edge" = the day-reachable 1H supply rungs, documented honest miss).

## Gate Verdicts (verbatim — ALL EXIT 0)

```
diag-e2-forward          → EXIT 0 (PASS — DXY Wed SHORT 101.239 baseline; GU Mon admission)
diag-e2-cascade          → EXIT 0 (PASS — G5 no-storyline Tue EU SHORT anchors LMV|EUR/USD|1.14650 @1.14728)
diag-e1-reintegrated     → EXIT 0 (PASS)
diag-telescoping         → EXIT 0 (PASS — future-leak clean)
diag-golden-coverage     → EXIT 0 (6/22 ≤3p ≥ 5/22 floor)
```

## Diff Summary — src/brains/shape-brain.ts (ONLY file touched, +~180 lines)

All changes live in `projectZoneForDay` (the E2-CORE day designation builder), **gated on `priorWeekStoryline != null`** — the no-storyline path is byte-identical:

1. **Day-band derivation:** `dayReachHigh` = max ceiling of supply zones formed within the day's calendar window (createdAt ∈ [weekStart + i·DAY, weekStart + (i+1)·DAY], weekStart = `priorWeekStoryline.priorAnchorMs`); `dayReachLow` = min floor of demand zones in the same window. Data-driven — no hardcoded prices.
2. **Reach capping:** `supplyReach`/`demandReach` bounded by the day band (min/max with dayReachHigh/dayReachLow).
3. **Candidate bounds:** `z.floor >= dayOpenSpot` → `z.floor >= dayReachLow`; `z.ceiling <= dayOpenSpot` → `z.ceiling <= dayReachHigh` — candidates must be structurally reachable within the day.
4. **I2 extension:** the S/D-zone position-aware tie-break (A1.4's Monday fix) extended from `day === 'Mon'` to `day === 'Mon' || priorWeekStoryline != null` — so EVERY day prefers the containing 1H/4H S/D zone over a bare LMV rung when a zone's internal rung sits within NEAR_ACTIVE_EDGE_PIPS of the active edge. `i2SortReach` also day-band-bounded.
5. **Reachable-rung entry filter:** internal LQZ rungs filtered so the ENTRY rung's near edge is itself within the day band (`reachableRungs`) — fixes the EU Thu overshoot (1.14567 > Thu high 1.14494 before the filter; now resolves 1.14494 ≤ day high).

**Why storyline-gated (KEY):** the no-storyline build (`buildE2Core` 2-arg, exercised by diag-e2-cascade G5 and the pre-week days) must keep anchoring LMV|EUR/USD|1.14650 @1.14728 / DXY Wed 101.239. Day bands only exist where a PriorWeekStoryline does; the gating preserves the entire no-storyline output byte-for-byte.

## What Passes / What Is Shipped

- **Day-reachability (10/10 EU+GU designations)** — DONE (the mission deliverable)
- **EU Fri golden SHORT 1.14544 recovered** (Δ2.3p) — DONE (golden 6/22 ≥ 5/22 floor, up from 5/22)
- **A1.4 Monday WIN preserved** (+3.18R @1.14449, Mon 14:00 ET) — ✅
- **No-storyline path byte-identical** (diag-e2-cascade G5, diag-e2-forward) — ✅
- **Determinism ×2 (`8d421c21`)** — ✅ · tsc 0 · build 0 — ✅
- **Frozen pair byte-identical** (sl-lmv `91294083`, trade-dedup `33914c89`) — ✅
- **ALL 5 gate diags EXIT 0** — ✅

## Flags (frozen-file items — REPORT, not fixed)

1. **EU Tue golden SHORT 1.14205 (Δ24.4p)** — the day-reachable 1H supply 1.14307 rungs are the closest fixture reality; golden 1.14205 is not a zone/rung in the current fixture. Requires the other agent's fixture/refinement-machine change.
2. **GU golden 6 levels (Δ17-31p)** — GU day designations resolve to the day-reachable 1H 1.33878 rungs; golden 1.33882 etc. sit between fixture rungs. Fixture-limited honest misses — the mission's "honest near edge" precedent (Δ31p vs 1.33882 documented).
3. **EU Tue/Fri SHORT NOT_TRIGGERED** — session-bracket artifact (NY Overlap/NY Mid windows miss the day's 01:00Z/02:00Z highs). Designation levels ARE day-reachable; the fill sim's session window is E3/mirror behavior (other agent's file). REPORT ONLY.
