# WAVE AUDIT — F4B PRE-vs-POST causal diff (orch audit of F4BDiff desk, 2026-09-15)

**HEAD at desk return:** `ac32ded` · **Branch:** omp-worker-1 · **Frozen:** MATCH
**Desk:** read-only forensics, 11m. Zero repo writes (verified: only /tmp captures + fixture swap/restore with md5 proofs).
**Auditor:** orchestrator. Md5 proofs re-checked from the desk's quotes; diag lines cross-checked against orch's own POST runs this turn.

## Correction to the orch's own F4 log (D13 — quoted, not paraphrased)

BUILD_REPORT's F4 entry said "DXY SHORT flipped HIT→NONE". **Refuted by captures.** PRE `golden hits: 2/5` = DXY LONG HIT + **GU LONG HIT** (`/tmp/f4b_pre_diag.txt:68,89-94`: `GBP/USD LONG E 1.33343 Δ1.3p (HIT)`); POST 1/5 = DXY LONG only (`/tmp/f4b_post_diag.txt:93`). DXY SHORT was **MISS Δ20.4p PRE → MISSING POST** (emission loss, not a lost hit). The degraded slot is **GU LONG**.

## Per-level verdicts (all five (b) operator-owned — no LTF-gating defect found)

| Level | PRE | POST | Cause (quoted) | Verdict |
|---|---|---|---|---|
| DXY LONG 100.945 | E 100.91800 Δ2.7p HIT | E 100.91800 Δ2.7p HIT | Stable; POST SL refined via new 30m walk-up (`DXY\|30m\|1782981000000\|100.922`) | (b) no action |
| DXY SHORT 101.140 | E 100.93600 Δ20.4p MISS | NONE (honest absence) | E2 redesignation 100.945 BoM → 100.913 MoM on corrected bars; new geometry RRR 2.60 < 3.0 floor → ADM lawfully refuses (`anchor-decision-machine.ts:932-942` via `reasoning-chain.ts:1233-1256` → `2214-2228`) | (b) operator-owned |
| EU SHORT 1.14395 | NONE | E 1.14334 Δ6.1p MISS | Redesignation 1H-1.14463 (RRR 2.11 REJECT) → LMV-1.14340 (EMIT) — corrected bars working as designed; golden 1.14395 sits 5.6p above the band ceiling | (b) absorb |
| EU LONG 1.14110 | E 1.14189 Δ7.9p MISS | E 1.14222 Δ11.2p MISS | Law-27 chained-interior: SHORT TP 1.14222 chains into 30m-MoM receiver `EUR/USD\|30m\|1783036800000\|1.14202` (B-3 clean); containment gate moved the anchor | (b) + DOCTRINE QUESTION #1: chained-interior vs LMV-fortress for the #2 slot |
| GU LONG 1.33330 | E 1.33343 Δ1.3p **HIT** | E 1.32486 Δ84.4p MISS | Newly-enabled valid GU SHORT (PRE refused DEGENERATE_PAIR; POST EMITs E 1.33557 TP 1.32485) chains via `receivingDemandForChained` into the 30m receiver 1.32442, abandoning the WL 1.33380 that HIT | (b) + DOCTRINE QUESTION #2 (fix-desk flag) |

## Doctrine question #2 — the candidate-(a) ruling (currently law-abiding, so NOT a defect)

`src/mdve/reasoning-chain.ts:2152-2159` (lanes) + `:2185-2192` (receiving re-resolution) chain across a macro-diverged R day (`GBP/USD Monday: E2-native SHORT (R) vs macro LONG`, divergence 0.40 DIVERGED — unchanged PRE/POST) with **no divergence guard** — the counter-macro SHORT's TP corrupts the macro WL LONG's entry. The code obeyed Law 27 as written. If the operator rules diverged lanes must not chain, the fix belongs at those lines. D13: unquotable → not built; parked for the operator.

## Supporting measurements

- **L4 mirror (R12/D98):** cascade divergence 0.00 both runs (clean); lane-level 1:1 violated (POST DXY 1 projection vs EU 2). Each pair consumes its OWN LTF bars — the doctrine 1:1 is macro/cascade-level only.
- **15m caps EXCULPATORY:** EU first 15m bar 2026-06-30T22:00Z, GU 2026-06-30T21:00Z; decision window [Mon 00:00, 06:00] ⊂ coverage with ~5.3d prior context; all load-bearing formation stamps (07-01/07-02/07-03) inside coverage. Depth asymmetry (DXY 35d vs EU/GU 5.3d) ≠ window cut.
- **LMV counts:** DXY 188→673 · EU 176→476 · GU 138→382. Native setups: DXY 1→5 · GU 1→4 · EU 3→3.
- **Honest gap:** SC-16 journal legs absent from the harness output (diag doesn't print them); C2_DEBUG lane traces + isolated `anchorTrade` probes substituted.
- **Harness side-effects flagged:** the diag appends to `MASTER_CONTEXT/plutus-reasoning-failures.db` and writes `Visual_Evals/` reports — store growth ≠ pipeline change.

## Ship-bar effect

SC-21 red at 1/5 with REAL data present and every miss attributed: two doctrine questions own the path to 5/5 (EU #2 slot rule; diverged-lane chaining guard). lmv-fx 14/15 + TP 2/2 (GU #1 Δ4.0p the hold-out). W9-converge stays forbidden. Goal active.
