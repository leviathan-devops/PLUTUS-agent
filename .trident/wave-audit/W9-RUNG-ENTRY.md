# WAVE AUDIT — W9 rung-vs-entry adjudication (orch, scout + first-hand verify)

**HEAD:** `559ec03` · **Branch:** omp-worker-1 · **Frozen:** MATCH
**Auditor:** orchestrator. Scout `W9ScoutRungEntry` was read-only; every file:line below orch-verified this turn. Zero product writes.

## The contradiction

`diag-lmv-golden-fx.ts` shows **EU #1 TP 1.14110 → rung 1.14120 Δ1.0p PASS** — the rung EXISTS in the machine's table. But `diag-reasoning-chain-golden.ts --day=2026-07-06` emits **EU LONG E=1.14189 Δ7.9p MISS**. Why can't the entry use the rung it already found?

## Verdict: NEEDS-LTF (same window, different table slices + different consumers)

NOT different tables (refuted — both consume `mergedTable` from `buildChartModel`). NOT entry-can-use-rung (refuted — only via forward leak). The rung lives in the **Friday slice**; the entry reads the **Monday slice**. Same structure, different windows, different consumers.

### Mechanism chain (all orch-read this turn)

1. **Two anchors, two windows.** TP-walk: `ANCHOR_MS = 1783702800000` Friday close (`diag-lmv-golden-fx.ts:19`); rows `b.timestamp <= ANCHOR_MS` — full Mon–Fri bars (`:51-54`). Entry: `ANCHOR_MS = 1783317600000` Monday 06:00 (`diag-reasoning-chain-golden.ts:83-85`, comment names Friday close as the leak).
2. **The rung lives in the Friday slice.** TP-walk scans `models[o.pair].lmv?.table` nearest-center, side/band ignored (`diag-lmv-golden-fx.ts:78-83`); EU #1 TP hits 1.14120 Δ1.0p (orch re-ran: `✅ EU #1 TP ... 1.14120 Δ1.0p`).
3. **The entry reads the Monday slice.** Entry models gated to pre-anchor bars (`diag-reasoning-chain-golden.ts:157-160, 233-235`); that slice's table has **0 BUY_SIDE rows inside fortress [1.14004-1.14147]** (W9-SC21-blocker, orch re-confirmed via W9EuLmv 176-row table dump).
4. **The gate demands containment.** LONG interior-reaction needs a BUY_SIDE rung fully inside the band (`anchor-decision-machine.ts:585-588`); present → `defendedEdge` else rung midpoint (`:598-601`); absent → zone midpoint (`:608-613`) = the 1.14189. Chained-interior snaps `max(chainedSnap, interiorReaction)` (`reasoning-chain.ts:1281-1283`) — with a Friday TP it would chain, but at Monday anchor that future TP does not exist yet.
5. **Tiers can't save it.** 30m/15m tiers need `MIN_TIER_BARS = 96` (`index.ts:405-453`); fixture 30m/15m n=0 → skipped with note, never thrown.
6. **The W-ADM-1e comment claims the fortress resolves to 1.14110** (`reasoning-chain.ts:1276-1280` "the fortress's interior-reaction resolves to the internal rung's defended edge 1.14110") — **stale vs live**: the Monday table carries no such rung, so the code falls to `:608-613`. This comment is now flagged STALE.

### Doctrine (quoted, D13)

- R21: "S/D zones 4H→1H... BoM OBs are 4H/1H only... LQZ 1H→30m→15m"
- R29: "NOTHING SHOULD BE PRICE ANCHORED EVER… ZONE ANCHORED"
- R33: "golden tolerance 3 pips after EVERY change — not 30, not 10, THREE"

### Orch re-runs this turn (claims, not subagent codes)

| gate | result |
|---|---|
| `bun diag-lmv-golden-fx.ts` TP lines | EU #1 TP 1.14110 → 1.14120 Δ1.0p PASS; ENTRIES 13/15; TPs 1/2 |
| `bun report-v452.ts` ×2 to /tmp | **identical sha256 `3058b0c3…`** — SC-20-as-determinism now PROVEN standalone (report_v452.md restored after; prior UNEVIDENCED verdict superseded) |
| frozen pair | MATCH both |
| W9-converge | absent |

## Bottom line

ENTRY-CAN-USE-RUNG refuted (only via G8 forward leak or gate invention — both forbidden). DIFFERENT-TABLES refuted (same `mergedTable` type, different windows). **NEEDS-LTF**: only real pre-anchor 30m/15m EU bars (≥96/tier) can populate the Monday slice's interior rungs without R21/R29 violation. The stale `reasoning-chain.ts:1276-1280` comment ("resolves to 1.14110") needs correction when the rung actually lands.
