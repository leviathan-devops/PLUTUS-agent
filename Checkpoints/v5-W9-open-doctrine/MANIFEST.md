# CHECKPOINT v5-W9-open-doctrine — MANIFEST

**Date:** 2026-09-15 · **Branch:** omp-worker-1 @ `028408a` · **Honest state:** OPEN — two operator doctrine rulings own the path to SC-21; `v5-W9-converge` stays correctly FORBIDDEN (SC-21 red).

## What is real (all first-hand re-run this checkpoint)

```
frozen pair   sl-lmv.ts 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab
              trade-dedup.ts 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4
fixture       /tmp/opencode/bars_raw.json — 12 slots, span 2026-04-30 → 2026-07-10T17:00Z (canon);
              backups .bak-f4 (md5 2b34f038…), .bak-f4c (md5 2c05a921…); raws /tmp/opencode/f4_full.json + f4c_full.json
golden diag   G1-G10 8/10 (fails: G1 EU-long fortress absent, G4 mirror elements — pre-existing, doctrine-owned)
              A1-A7 7/7 · G8 PASS (beyond-bars non-vacuous) · analysis invariance PROVEN (byte-identical)
lmv-fx        ENTRIES 14/15 ≤3p · TPs 2/2 ≤5p (GU #1 Δ4.0p the hold-out) — was 13/15 + 1/2 pre-F4
Monday        1/5 ≤3p: DXY L Δ2.7p HIT · DXY S lawful-refused (RRR 2.60<3.0) · EU S Δ6.1p · EU L Δ11.2p · GU L Δ84.4p
OUTCOME       0/4 wins (all SL-hit, TRUE count) — now measurable post-F4C (was 0/0 unresolvable)
report        baseline sha 53d7f9d8cfff1d3026a0f1e860c9c95a13b73f26fba13c21fdab89131e6d1b79 ×2 deterministic
V5 walls      bun test src/ 1184/0 · bun test specs/harness/ 46/0 (measured @ f8d9dca)
V5 kernel     SC-16 journal legs card→L1..L5 @ ed4533d · SC-23 validator 5/0 @ W7R · SC-2 24/0 (500-run) · SC-27 zero-residue
```

## The two operator doctrine questions (D13: unquotable → not built)

1. **EU #2 slot rule** — golden EU LONG 1.14110 = the LMV-1.14200 fortress rung; the chain produces Law-27 chained-interior E 1.14222 (Δ11.2p) from the SHORT TP via the 30m receiver (`reasoning-chain.ts:2185-2192`). Which owns the #2 slot: chained-interior or the fortress rung?
2. **Diverged-lane chaining guard** — the GU LONG 84.4p miss: a newly-enabled valid E2-native SHORT (R day, macro-diverged 0.40) chains its TP 1.32485 into the macro WL LONG's entry via `receivingDemandForChained` (`reasoning-chain.ts:2152-2159/2185-2192`). The output records `[MACRO_DIVERGENCE] the unified macro authority wins the emission — record the divergence, never suppress it`. Do diverged lanes chain, or does the macro authority bound the chain?

## Wave chain this checkpoint carries

F4 (712c3de): LTF harvest, slots filled, lmv-fx 13→14 · F4B (f8d9dca): causal diff, 5× operator-owned verdicts · F4C (028408a): outcome-window canon span, G8 PASS, G 8/10, OUTCOME TRUE. Audits: `.trident/wave-audit/F4{,B,C}.md`.

## Honest gaps

- SC-21 5/5 NOT met (1/5) — blocked on the two rulings above; R29 forbids hardcoding the Monday levels.
- SC-25: ratio+floor legs PASS on the golden week (multiweek harness 15/15 wins, `MW-ROW|2026-07-06|…|FLOOR_OK`); multi-week coverage leg data-blocked (1 < 2 weeks — non-golden week oracle fixtures are operator-owned); comparator is the harness's documented E1-convergence seam, not ≤3p. Named residual: the two doctrine questions above.
- Harness side-effects: `MASTER_CONTEXT/plutus-reasoning-failures.db` appends + `Visual_Evals/` reports on every diag run — store growth ≠ pipeline change.
- 15m depth: DXY ~35d vs EU/GU ~5.3d (server-capped, exculpatory — decision window fully covered).

## Restore

`git -C . checkout 028408a` (this tree) · fixture: current /tmp file is the canon-span one; pre-F4 = `.bak-f4`, post-F4/pre-F4C = `.bak-f4c` · venv: /tmp/opencode/f4venv (tvdatafeed-2.1.0 fork).
