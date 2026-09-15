# WAVE AUDIT — F4C outcome-window harvest (orch audit of F4COutcome desk, 2026-09-15)

**HEAD at desk return:** `f8d9dca` · **Branch:** omp-worker-1 · **Frozen:** MATCH (orch re-run)
**Desk:** 21m33s. Write set respected: `M scripts/fetch-bars.ts` (+`--until` param, F4C addendum, smoke-tested ×3) + /tmp fixture. No src edits, no commits by desk.
**Auditor:** orchestrator — every gate below re-run first-hand this turn.

## Hunk verdicts

| Cell | Verdict | Evidence |
|---|---|---|
| `--until=<iso\|ms>` parameterization | CORRECT | `CliOptions.untilMs` + `parseUntil()` + post-fetch until-filter with counted drops + honest `[UNTIL]` FAIL; smoke: iso form, ms form, garbage-ignored all exit 0 |
| Outcome-window harvest (12 slots) | CORRECT | Orch jq: all slots `last=1783702800000` (2026-07-10T17:00Z); beyond-anchor bars present every slot (1H +107h); DXY 1H n=1228, 4H n=428 — **matches the canon skill's fixture guard ranges (~1225-1228 / ~428-432) exactly** |
| Merge discipline | CORRECT | APPEND-ONLY past existing tip; existing wins on conflict; preservation lost=0 changed=0; backup `.bak-f4c` md5-matches pre-merge |
| No anchor-slice (the F4 mistake, undone) | CORRECT | The canon contract (skill PREREQUISITE) spans to 07-10T17:00; `barsFor` self-slices at consumption (`report-v452.ts:327`), `simBarsFor` reads unsliced (`:329-331`) — quoted by desk, verified by orch |
| gate0 rebuild-fixture | PASS (orch re-run) | exit 0, 12 slots, post-anchor accepted (verifier never enforced ≤ anchor — desk quoted, orch confirmed no defect) |
| Analysis invariance | **PROVEN** | Desk: Monday convergence lines 90-92 BYTE-IDENTICAL (`cmp` clean), anchor digests `0f38c626…` unchanged with 107h later bars present; orch re-run: `golden hits: 1/5` unchanged. Negative control held — **no leak** |
| G8 temporal gate | **FAIL→PASS** (orch re-run) | `[G8] … PASS — max bar read 1783317600000 ≤ anchor (YES) · fixture bars beyond the anchor exist: YES (107h past)` |
| G-count | 7/10 → **8/10** (orch re-run) | Failing only pre-existing G1 (EU LONG fortress absent) + G4 (mirror elements n/a) |
| OUTCOME gate | Now RESOLVES (orch: FAIL is TRUE count) | 0/4 wins: DXY LONG −1.00R (SL-hit, MAE 32.0p) · EU SHORT −1.00R (same-bar) · EU LONG −1.00R (same-bar) · GU SHORT −1.00R · GU LONG not-triggered (not counted); acceptance ≥4/6 — FAIL, honestly measured (was 0/0 unresolvable) |
| SC-20 report determinism | PASS — NEW baseline | `53d7f9d8cfff…` ×2 identical (desk) + orch re-run identical; input data changed → new baseline recorded (A18-adjacent), never litigated |
| Frozen firewall | PASS | `91294083…` / `33914c89…` MATCH after desk + orch runs |
| V5 walls | GREEN (orch, pre-F4C run @ f8d9dca) | `bun test src/` 1184/0 · `bun test specs/harness/` 46/0 |

## D13 mechanism quotes (desk-provided, orch-verified)

`report-v452.ts:327` barsFor filters ts≤ANCHOR_MS (analysis gate) · `:329-331` simBarsFor reads 1H UNSLICED · `diag:673` simulateOutcome skips ts≤ANCHOR_MS (strictly post-anchor) · `golden-gate.ts:322-333` gateG8 vacuous iff no beyond-bars · `rebuild-fixture.py` has no ≤anchor enforcement.

## Doctrine note for question #2

The diag output itself carries: `[MACRO_DIVERGENCE] the unified macro authority wins the emission — record the divergence, never suppress it` — the divergence IS recorded today; whether diverged lanes may CHAIN (reasoning-chain.ts:2152-2159/2185-2192) stays operator-owned.

## Ship-bar effect

GATE-CLASS gate-2 components: G-count 8/10 (≥8 met), A1-A7 7/7, determinism ×2, frozen MATCH — remaining reds: Monday 1/5 (SC-21), OUTCOME 0/4 (both measured TRUE), G1/G4 (fortress/mirror — doctrine-owned). SC-25's multi-week ≥15/21 measure still open. W9-converge stays forbidden; v5-W9-open-doctrine checkpoint mints the honest state.
