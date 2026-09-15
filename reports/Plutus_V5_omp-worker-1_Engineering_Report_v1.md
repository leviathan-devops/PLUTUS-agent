# PLUTUS V5 omp-worker-1 — ENGINEERING REPORT v1
**Series:** Plutus_V5_omp-worker-1 (nested V5 hydra on omp-worker-1; the parent/base series is Plutus_MIMOCODE_Engineering_Report)
**Project:** Plutus V5 two-machine card+kernel
**Date:** 2026-09-15
**Author:** orch (OMP goal loop; no product writes this report)
**Baseline:** omp-worker-1 @ 56b142d
**Commit:** 56b142d docs: record W3-W8 landed and W9 SC-21 2/5 30m/15m GAP (not ship)
**Container:** none · **Image:** none (product_tui NOT RUN)

## ONE-PARAGRAPH SUMMARY

Plutus V5 on nested git `omp-worker-1` is a two-machine trading stack (E1/E2/cardvis generate a card; kernel consumes it) vendored onto a frozen 4.5.3 line whose `src/mdve/sl-lmv.ts` and `src/mdve/trade-dedup.ts` stay byte-identical (`91294083…` / `33914c89…`). Waves W0–W8 left 419 `src/**/*.ts` files, `tsc --noEmit` exit 0, and `bun test` 1220 pass / 0 fail / 86 files. The ship bar is red: GATE-CLASS golden `bun diag-reasoning-chain-golden.ts --day=2026-07-06` exits 1 at **2/5 ≤3p**, because `/tmp/opencode/bars_raw.json` has **30m/15m n=0** for DXY/EUR/USD/GBP/USD and nested BUY LQZ at 1.14110 cannot be emitted without R29. `Checkpoints/v5-W9-converge` is absent. This is not ship.

## THE LIFECYCLE MAP

```
┌──────────────────────────────────────────┐
│ /tmp/opencode/bars_raw.json              │
│ 1H+4H present · 30m/15m n=0 GAP (R21)    │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ E1 lexicon + LMV (src/e1, src/mdve/lmv)  │
│ confirmation: ≥3 rxn AND ≥2 kinds :554   │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ E2 designate / cascade (src/e2)          │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ card vis + zod (src/card visual aether)  │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ kernel L1-L5 (src/kernel)                │
└────────────────────┬─────────────────────┘
                     ▼
┌──────────────────────────────────────────┐
│ GATE-CLASS golden 2026-07-06             │
│ MEASURED: 2/5 · exit 1 · W9-converge NO  │
└──────────────────────────────────────────┘
```

Ruler: every line ≤76. Box content width 42. Frozen pair is firewall, not in this flow.

## THE ARCHITECTURE

Machine 1 CARD GENERATOR = `src/e1` (29 ts) + `src/e2` (29 ts) + `src/card` (6) + `src/visual` (7) + `src/aether` (2).
Machine 2 KERNEL = `src/kernel` (21 ts) + `src/enforcement` (4). Coupling = card schema only (R3).
Substrate = `src/jesl` (8) + `src/substrate` (140) + `src/runtime` (10).
MDVE live line = `src/mdve` (36 ts) including editable `lmv.ts`; frozen = `sl-lmv.ts` + `trade-dedup.ts` only.

LMV confirmation gate (first-hand `src/mdve/lmv.ts:234-243,549-556`):

```
234: const MIN_REACTION_CANDLES = 3;
243: const MIN_DISTINCT_KINDS = 2;
554: if (reactions.length < MIN_REACTION_CANDLES
      || distinctKinds.size < MIN_DISTINCT_KINDS) { continue; }
```

Failure mode: 1H-only fixture cannot form nested BUY LQZ inside fortress [1.14004-1.14147]; interior-reaction emits 1.14189 (Δ7.9p vs golden 1.14110). Hardcoding 1.14110 = R29. Aggregating 1H→30m = R21.

context_management/ CURRENT_STATE.md BUILD_STATE.md EVIDENCE_STATE.md CHANGELOG.md = **MISSING**.
`.trident/container-test-results.json` = **MISSING**.

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| 1 | SC-21 2/5 | 30m/15m n=0; nested BUY LQZ absent | none (R29/R21) | G7 this turn; rebuild-fixture 6 GAP |
| 2 | G1 fortress token | no token-1 PHANTOM_BOM on EU LONG | none (no fake phantom) | G1 FAIL verbatim |
| 3 | G3 divergence-record | GU LONG exists; R-div NO + NO store row | geometry pick 6cca6a0; G7 HIT Δ1.3 still G3 FAIL | G3 this turn |
| 4 | G4 element oppose | G1 fortress token absent | blocked on #1/#2 | G4 FAIL |
| 5 | G8 FORWARD READ | no bars after Monday anchor | fixture control vacuous | G8 FAIL |
| 6 | DXY S Δ20.4 EU S NONE | SHORT path / LTF missing | blocked on #1 | G7 |
| 7 | SC-24 not runnable | overlay `../graph/client.js` missing | residual W8.md | W8.md |
| 8 | Named W0–W6 checkpoints missing | orch never minted | only v5-W8-landed-open-gates | ls Checkpoints |

No product fix this report. Tried-and-rejected: W9EuLmv (0 rungs), W9LqzNest (no edit).

## THE TESTING LEDGER

| test | scope | how | result |
|---|---|---|---|
| rebuild-fixture --verify | GATE-CLASS 0 | python3 this turn | PASS + 6 GAP; 4568 bars; 30m/15m n=0 |
| diag-reasoning-chain-golden --day=2026-07-06 | GATE-CLASS 2 / SC-21 | bun this turn | exit 1; 2/5; G1/G3/G4/G8 FAIL; G2/G5/G6/G7/G9 PASS |
| tsc --noEmit | SC-1 | bun run typecheck this turn | empty (exit 0) |
| bun test | suite | this turn | 1220 pass / 0 fail / 86 files / 119272 expect |
| frozen sha256 | SC-19 | sha256sum this turn | MATCH both |
| product_tui container | ship | — | NOT RUN |
| QC named tokens | FUTURE_BAR / SIDE_INVERSION / CARD_INVALID | QC.md | STALE vs 56b142d; suite 1220/0 does not isolate tokens this turn |

## THE SPEC MANDATE → ENGINEERING MAP

| the operator said | what was built | evidence |
|---|---|---|
| ORCHESTRATOR only | orch did not write src this report | docs-only 56b142d |
| frozen pair firewall | MATCH | sha this turn |
| W0–W8 lock trees | 419 ts on disk | find src -name '*.ts' |
| SC-21 Monday 5/5 | FAIL 2/5 | G7 |
| Checkpoints/v5-W9-converge | ABSENT | test -d W9N |
| product_tui after GATE-CLASS | not started | no-ct |
| BUILD_REPORT current | appended at 56b142d | BUILD_REPORT.md:23-36 |
| never stamp COMPLETE on red | goal still active | W9 todo blocked |

## THE NUMBERS

```
┌────────────────────────┬─────────────────────────────┐
│ metric                 │ value (this turn)           │
├────────────────────────┼─────────────────────────────┤
│ HEAD                   │ omp-worker-1 @ 56b142d      │
│ src/**/*.ts            │ 419                         │
│ bun test               │ 1220/0 / 86 files           │
│ tsc --noEmit           │ exit 0                      │
│ golden ≤3p             │ 2/5  exit 1                 │
│ fixture bars           │ 4568; 30m/15m n=0 x6        │
│ checkpoints v5-W*      │ 1 (W8-landed-open-gates)    │
│ wave-audit files       │ 15                          │
│ container results      │ 0                           │
│ BUILD_REPORT lines     │ 36                          │
│ SC PROVEN this turn    │ 2 pass (SC-1, SC-19)        │
│ SC FAIL this turn      │ 1 (SC-21)                   │
│ SC UNVERIFIED          │ 24/27                       │
└────────────────────────┴─────────────────────────────┘
```

Monday G7 verbatim: `DXY LONG 100.94500 -> Δ2.7p (HIT) · DXY SHORT 101.14000 -> Δ20.4p (MISS) · EUR/USD SHORT 1.14395 -> NONE (MISS) · EUR/USD LONG 1.14110 -> Δ7.9p (MISS) · GBP/USD LONG 1.33330 -> Δ1.3p (HIT)`

## THE FILE MANIFEST (lock trees)

```
PLUTUS/agent/  (nested git omp-worker-1)
├── src/e1 (29 ts) e2 (29) card (6) visual (7) aether (2)
├── src/kernel (21) enforcement (4) jesl (8) substrate (140)
├── src/runtime (10) mdve (36; sl-lmv+trade-dedup FROZEN)
├── specs/mpse S-1..S-7 + battery.json
├── scripts/ rebuild-fixture.py run-battery.sh check-frozen.sh
├── Checkpoints/ v5-W8-landed-open-gates · v4.5.3_CLEAN_BASELINE
├── .trident/wave-audit/ W0..W8 + W9-SC21-blocker + GATE-CLASS-golden
├── hydra/ MASTER_PROMPT PATHS SCOPE-*
├── BUILD_REPORT.md DEBUG_LOG.md
└── reports/ Plutus_V5_omp-worker-1_Engineering_Report_v1.md  NEW
```

Dirty uncommitted: `M report_v452.md` `?? Visual_Evals/` `?? specs/harness/.captures/` — not part of this report.

## WHAT'S NEEDED FROM THE OPERATOR

1. **P0:** provide 2026-07-06 **30m and 15m** OHLC for DXY, EUR/USD, GBP/USD (not live TV n_bars; not 1H-aggregated). Until then SC-21 cannot be honest.
2. Do not authorize hardcoding 1.14110.
3. Do not harvest current TV into bars_raw.json.
4. product_tui container is gated on GATE-CLASS green — do not order it while golden exit 1.
5. Optional: mint missing v5-W0..W6 checkpoint names later; they are not ship.

Open: G1 token vs zone-present contradiction; G3 record vs GU HIT; G8 vacuous temporal; SC-24 missing graph client.
