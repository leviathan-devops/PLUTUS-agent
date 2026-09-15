# RULINGS REQUESTED — the operator decision sheet (v5-W9-open-doctrine)

**Date:** 2026-09-15 · **HEAD:** `cd88e1b` (omp-worker-1) · **Frozen:** MATCH · **All walls green** (src 1195/0 · e1 398/0 · enforcement 77/0 · harness 46/0 · tsc clean)
**Context:** every SC is measured at this HEAD; every remaining ship-bar red decomposes to one of the four rulings below. Each has a pre-scoped mechanical fix path that fires the moment you rule. Nothing will be built without your word (D13: "Anything that can't be quoted doesn't get built").

---

## Ruling 1 — EU #2 slot: chained-interior vs the fortress rung

**The collision:** the golden EU LONG 1.14110 is the `LMV|EUR/USD|1.14200` fortress rung; the landed chain produces Law-27 chained-interior E 1.14222 from the Mon SHORT's TP via the 30m receiver (`reasoning-chain.ts:2185-2192` containment law). Δ7.9p (fortress-era) vs Δ11.2p (chained-era).
**Unblocks:** SC-21 EU LONG leg.
**Options:** (a) chained-interior owns the slot (current behavior; golden row stays MISS at Δ11.2p unless the golden level is re-measured) · (b) the fortress rung owns it (chain skips the 30m receiver when the LMV fortress contains the golden-adjacent rung — needs a containment-preference rule quoted by you).

## Ruling 2 — diverged-lane chaining guard

**The collision:** the GU LONG golden HIT (1.3p) became Δ84.4p because a newly-enabled, individually-valid E2-native SHORT (R-day, macro-diverged 0.40) chains its TP 1.32485 into the macro WL LONG's entry via `receivingDemandForChained` (`reasoning-chain.ts:2152-2159` lanes + `:2185-2192` receiving). The output records: "[MACRO_DIVERGENCE] the unified macro authority wins the emission — record the divergence, never suppress it". The code obeyed Law 27 as written; the collision is between chaining (Law 27) and macro authority.
**Unblocks:** SC-21 GU LONG leg (the single lost golden HIT).
**Options:** (a) diverged lanes may chain (status quo; GU LONG stays Δ84.4p) · (b) macro-authority bounds the chain: a lane diverging from the unified macro may not donate its TP to the macro lane's anchor (fix at `reasoning-chain.ts:2152-2159/2185-2192`) · (c) diverged lanes chain but the macro lane anchors from its own WL structure when the donated TP falls outside the macro zone.

## Ruling 3a — the B.W3.1 dayTable vs the B.W3.5 shape sequence

**The contradiction:** the fixture's shapeChains input (B.W3.5 injectShapeSequence law) carries [SS,BS,R,BS,WL] × 5 days; the B.W3.1 day-transition table (10 DAY_OPEN edges, inventoried in `.trident/wave-audit/WK2.md`) cannot walk it — **R→BS and BS→WL do not exist** (near-misses R→WL / BS→RWL target different states). The absence is deliberate and test-pinned: `shape-chain-golden.test.ts:84,90` — "the documented gap", attempted with the exact guard fields (`reverseContinuation`, `recoveryToStructure`) and pinned UNCHANGED.
**Consequence today:** Thu/Fri lawfully EMPTY; V5 full-week golden = 1/17 ≤3p (v4.5.3 regime: 12/21).
**Options:** (a) canonicalize the 5-token read → add R→BS / BS→WL edges (you define the lawful guard evidence for each) · (b) canonicalize the table → correct the fixture's token chain to a walkable path (e.g. the live R→WL→SS route — but note that changes the operator's day-shape read) · (c) accept the Wed-terminal walk → Thu/Fri permanently empty, week-scope SCs carry the residual.

## Ruling 3b — per-day zone/session contract (R17 "day native")

**The gap:** "spot price is practically irrelevant... day native" (Bible4.5:607,612) needs day-windowed zone detection; no e1/e2 machine takes a day window (zones re-detect ONCE from the ≤anchor context; WK2 proved day-tagged setups reuse Monday's geometry — 17/17 deltas pip-identical).
**Unblocks:** real per-day price levels for SC-10/SC-18/SC-25 (with 3a).
**Options:** (a) add a day-window parameter to the OBCV zone detection + e2 designation inputs (an E1/E2 architecture extension — R3-checked: it extends, never overrides) · (b) keep week-context zones and accept Monday-geometry levels for all days.

---

## Also awaiting operator input (data, not rulings)

- **SC-25 coverage leg:** a second week's oracle fixtures (rows in the golden-week.json shape) — R14 forbids fabricating them. The harness (multiweek.ts) is ready; coverage FAILs only on 1 < 2 weeks.
- **SC-11 (off ship bar):** 12 headed-TV screenshot grades — the W4 honest residual ("stub FAIL default; no headed TV"). Say the word and a headed desk runs it.

## What is already green at this HEAD

frozen MATCH · GATE-CLASS 0/1/3 · SC-1..SC-9 · SC-11 machinery (SC-12 PASS) · SC-13..SC-20 · **SC-24 CONFORMANT (0 earned)** · SC-22 · SC-23 · SC-26 strict zero · SC-27 zero · SC-25 ratio+floor (15/15 golden week) · Checkpoints/v5-W9-open-doctrine · BR/DL current · product_tui ready to fire the moment GATE-CLASS gate 2 turns green (i.e. after Rulings 1-3).
