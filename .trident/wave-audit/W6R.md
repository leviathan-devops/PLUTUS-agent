# WAVE AUDIT — W6R journal legs (orch audit of W6RLegs desk)

**HEAD at desk return:** `883f705` · **Branch:** omp-worker-1 · **Frozen:** MATCH (both SHAs re-run by orch)
**Auditor:** orchestrator. Every line below verified first-hand this turn. Zero orch product writes.

## Hunk verdicts

| hunk | verdict | evidence |
|---|---|---|
| `src/kernel/trade-computer.ts` +47 (leg-append block) | CORRECT | Doctrine header quotes D13/R3/R29/R33 verbatim with anchors (`trade-computer.ts:292-297`, orch-read). Six `journal.append` per link with shared causationId + injected timestampMs under the existing guard — same shape as the `trade-computer.emit` block. Payloads are ID-references only (setup/zone/designation/telescope/pressure/fib-trade/dxy-inverse + l5 tradeValid/score) — observe already-validated l1..l5 + link fields, recompute nothing. Zero price constants (orch grep on `+` lines: 0). No edits to linking/selection/gating/refuse. |
| `src/kernel/trade-computer.test.ts` +85/-2 | CORRECT | One pre-existing happy-path assertion updated rows 1→7 with ordered kind list (required by the behavior change — desk disclosed, orch confirms the old assertion is incompatible with the new legs). All other cases preserved. Appended SC-16 describe: chain-order/resolve/integrity + no-journal-identical-projections, reusing baseCard()/baseVerdicts() (no parallel fixture). |
| Write-set discipline | CORRECT | `git status`: only the two write-set files modified. No mdve, no overlay checkout, no commit by desk. |

NOT FITTED-TO-GOLDEN (journal appends only; R33 correctly honored by reference). NOT SCOPE-CREEP (kernel write set). FLAWED: none.

## Gate evidence (orch re-runs, not desk claims)

| gate | result |
|---|---|
| `bun test ./src/kernel/trade-computer.test.ts` | **PASS 15/0, 75 expects** |
| `-t SC-16` filter | 2 pass incl. chain test (13 filtered, 0 fail) |
| `bun run typecheck` | **PASS** (`$ tsc --noEmit` empty) |
| R29 grep on added lines | 0 hits |
| Frozen pair | MATCH both |
| SC-16-as-named | **CLOSED**: `journal.query(causationId)` now carries `trade-computer.leg.{card,l1,l2,l3,l4,l5}` in order per setup + `trade-computer.emit` last, integrity-checked. The W9-LMVFX "UNPROVEN-as-journal-chain" verdict is superseded for the journal-rows half (provenance object still also present — both halves now true) |

## Ship-bar effect

SC-16 moves PASS-side. Ship bar still red: SC-21 2/5, lmv-fx 13/15 NEEDS-LTF, SC-24 not runnable. W9 `v5-W9-converge` still absent — correctly.
