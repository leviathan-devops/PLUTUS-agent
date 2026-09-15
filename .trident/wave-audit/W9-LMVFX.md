# WAVE AUDIT — W9 lmv-fx three-miss adjudication (orch, read-only + gate re-runs)

**HEAD:** `93f6178` · **Branch:** omp-worker-1 · **Frozen:** MATCH
**Auditor:** orchestrator. Scout `W9ScoutLmvFx` was read-only; every file:line below re-read by orch this turn. No product writes.

## Verdicts (per miss)

| miss | verdict | mechanism (file:line, orch-verified) | evidence |
|---|---|---|---|
| EU #2 TP 1.14460 → 1.14370 Δ9.0p | NEEDS-LTF | diag reads `lmv.table` nearest-center only, side/band ignored (`diag-lmv-golden-fx.ts:78-82`); table = 1H-only merge (`index.ts:217-221`) because 30m/15m tiers null on empty bars (`index.ts:200-206`); 1H build confirmation gate ≥3 reactions ∧ ≥2 kinds (`lmv.ts:549-556`) | diag T1-T6 loop + mergedTable + gate comment, all read this turn |
| EU #3 Tue SHORT E 1.14460 → 1.14370 Δ9.0p | NEEDS-LTF (same missing rung) | same chain; ENTRY tol 3p (`diag:24,89-90`); TP-walk/side-vote off-path (diag never calls them) | same as above; one rung explains both |
| GU #1 Mon LONG E 1.33330 → 1.33370 Δ4.0p | NEEDS-LTF (borderline, 1p over) | 1-pip modal quantum on 1H (`lmv.ts:633-636` per scout; orch cites scout + gate, table dump still a gap); R33 keeps tol 3p | scout payload + gate; band-coverage sub-case undecided |

## Off-path (do not chase)

Side vote (labels only), `lqz-matrix.ts:515-518` (feeds ladder, not `lmv.table`), OBCV gates (feed `model.zones`), TP reductions (diag never calls them).

## Doctrine (quoted, D13)

- R21: "S/D zones 4H→1H... BoM OBs are 4H/1H only... LQZ 1H→30m→15m"
- R29: "NOTHING SHOULD BE PRICE ANCHORED EVER… ZONE ANCHORED"
- R33: "golden tolerance 3 pips after EVERY change — not 30, not 10, THREE"

## Gates re-run by orch this turn (claims, not subagent codes)

| gate | result |
|---|---|
| SC-1 `bun run typecheck` | PASS (empty `$ tsc --noEmit`) |
| SC-6 totality `bun test src/e2/tests/designation-totality.test.ts` | PASS 18/0, 96 expects |
| SC-13 card zod `bun test src/card/schema.test.ts src/card/assembler.test.ts` | PASS 50/0, 114 expects (golden-card.json parses clean) |
| SC-16 journal provenance `bun test src/kernel/journal.ts src/kernel/card-loader.test.ts` | PASS 16/0 — BUT the L1→L5 trace claim is honest-gap: `trade-computer.emit` journal row (`trade-computer.ts:292-295`) carries only `{causationId, kind}` + projection payload; per-layer L-legs live in `projection.metaLayerVerdicts/provenance` (test asserts `cardSetupId/cardZoneId/cardDesignationId/l1TelescopeZoneId/l2PressureZoneId/l3FibTradeId/l4DxyInverseZoneId/l5Score` all present, `trade-computer.test.ts:124-133`), NOT as five journal appends. SC-16 stays UNPROVEN-as-journal-chain |
| diag-lmv-golden-fx | FAIL 13/15 (BUILD_REPORT SC-evidence; EU #2 TP Δ9.0, EU #3 Δ9.0, GU #1 Δ4.0) |
| SC-21 Monday | FAIL 2/5 |

## Bottom line

All three lmv-fx misses are NEEDS-LTF with the same named blocker (30m/15m GAP + R21 no-aggregation + R29 no-anchor + R33 tol intact). No map work on 1H/4H-only data legally closes them. SC-16 journal-chain wording needs a correction: provenance object ≠ journal rows.
