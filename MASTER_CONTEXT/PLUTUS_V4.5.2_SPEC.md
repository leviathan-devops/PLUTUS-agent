# PLUTUS V4.5.2 — THE STATS-INTEGRITY + EU/GU REFINEMENT SPEC (FULL SPEC)

**Version:** 2.0 (FULL SPEC — supersedes v1.0's 309-line weak draft)
**Date:** 2026-07-29
**Status:** DESIGN LOCKED — build target v4.5.2. **DO NOT BUILD without the operator's go-ahead (GATE-1, the blast-radius report under review).**
**Baseline:** `Checkpoints/v4.5.1_LIVE_MARKET_CAPABLE/` @ SHA `d6457756afd5f080f092a635309cdf1c8939feea03991737f4fc06f75f1e6aea` (the v4.5 + v4.5.x state — code is sound, the REPORTING is embellished 2.8×)
**Authority:** the independent audit (`Visual_Evals/v4.5.1/INDEPENDENT_AUDIT_v452.md`) — the stats are embellished 2.8× by duplicates; the reporting must count UNIQUE trades.

---

# TABLE OF CONTENTS

0. The Audit Verdict (the embellished stats — what v4.5.2 fixes)
1. The Dedup Identity (the core fix — the exact algorithm)
2. The Staggered-Entry Merge (E1/E2/E3 as ONE trade's legs — the exact semantics)
3. The Outcome Simulation for Staggered Trades (the exact model)
4. The EU/GU Anchor Dedup + the Emission Cap (the mirror over-emission fix)
5. The EU/GU E/SL/TP Refinement (the exact wall-map + the port)
6. The Accurate Clean Reporting (the stats engine + the mandatory fields)
7. The Stale-Fill Honesty (triggered_in_week / resolved_in_week + the session-label rule)
8. The Build Plan (waves, exact files, line budgets, done-when criteria)
9. The Integration Points (how the dedup + reporting wire into the pipeline)
10. The Verification Plan (the 5 adversarial tests + the regression gates + the harness structure)
11. Anti-Goals + Frozen Constraints
Appendix A — The audit's confirmed fuck-ups (the full evidence)
Appendix B — The dedup identity pseudocode (the exact algorithm, normative)
Appendix C — The EU/GU wall-map (the exact weekly wall levels + the computation)
Appendix D — The TRUE stats (the deduplicated baseline, verified against the bars)
Appendix E — The frozen machinery list (the exact file:line locations)

---

# 0. THE AUDIT VERDICT (THE EMBELLISHED STATS — WHAT V4.5.2 FIXES)

## 0.1 The independent audit's verdict (verbatim)

> *"The orchestrator's per-row simulations are real — I reproduced their exact claimed outcomes to the cent. The fraud is duplication + framing, not fabrication."*

The v4.5.1 reported "36 setups, 83.3% win rate, +73.05R." The TRUE stats (deduplicated by zone+dir+entry+SL+TP, verified against the bars):

| Pair | Rows→Unique | W/L | Win rate | True R | Claimed R | Count inflation |
|---|---|---|---|---|---|---|
| DXY | 13→7 | 6W/1L | 85.7% | +22.32R | +35.56R | 1.86× |
| EU | 13→5 | 4W/1L | 80.0% | +7.06R | +19.01R | 2.60× |
| GU | 10→1 | 1W/0L | n=1 | +1.85R | +18.48R | **10×** |
| **TOTAL** | **36→13** | **11W/2L** | **84.6%** | **+31.23R** | +73.05R | **2.77× count / 2.34× R** |

## 0.2 The v4.5.2 thesis

The CODE is sound (the per-row simulations reproduce to the cent). The REPORTING is embellished (duplicates inflate the count 2.77× and the total R 2.34×). **v4.5.2 is:**
1. **A stats-integrity fix** — the correct dedup identity (zone+day) + the staggered-entry merge + the accurate clean reporting (unique-set stats + the STALE bucket + the session-label honesty).
2. **An EU/GU refinement** — port the DXY TP-wall + SL-tightening refinements to EU/GU (the EU/GU RRR is too small because the refinements weren't applied to them).
3. **A GU over-emission fix** — the per-anchor emission cap (the GU ×10 is dead).

**The DXY lane is solid** (its duplicates are session-variants, not fabrication — the correct dedup merges them into 7 unique trades). **The EU/GU lanes have anchor duplicates + the GU over-emission + the RRR asymmetry.**

---

# 1. THE DEDUP IDENTITY (THE CORE FIX — THE EXACT ALGORITHM)

## 1.1 The defect

The v4.5.1 dedup used `(pair, dir, day, session, entry-bucket)` — so:
- The same zone reacting in London AND NY on the same day counted as TWO trades (the session component made them "distinct").
- The staggered entries (E1/E2/E3 legs) were emitted as separate setups (each leg a separate "trade").
- The EU/GU mirror mapping multiple DXY sources to the SAME anchor produced N identical trades (each DXY source a separate "mirror").

## 1.2 The correct identity (the operator's doctrine, canon 2026-07-29)

**The trade identity is `(pair, dir, zone_anchor ± tolerance, day)`.** NO session component — the zone+day IS the trade.

```
identity = `${pair}|${direction}|${anchorBucket}|${day}`
anchorBucket = round(anchorPrice / (ANCHOR_TOLERANCE_PIPS[pair] × PIP[pair]))
anchorPrice = setup.entryZone?.defendedEdge ?? setup.entry   // the LMV defendedEdge, or the entry
ANCHOR_TOLERANCE_PIPS = { 'DXY': 3, 'EUR/USD': 3, 'GBP/USD': 3, 'AUD/USD': 3 }
```

**The rules:**
1. **The staggered entries (E1/E2/E3) of ONE trade are ONE trade** — the 3 entry legs (front/mid/back) are ONE trade's fills, not 3 trades.
2. **Same zone + same day = ONE trade** — the zone reacts once that day; session variants are the SAME trade (the staggered entries are its E1/E2/E3 legs).
3. **EU/GU keyed on the FX anchor, NOT the DXY source** — multiple DXY sources mapping to the SAME EU/GU anchor+day produce ONE EU/GU mirror trade.
4. **Different days = DISTINCT** — the range top reacting Jul 8 AND Jul 9 = two trades (multi-day is legitimate; the zone+day identity differs).

## 1.3 The anchor tolerance (why 3 pips)

The anchor tolerance (3 pips) groups entries that are at the SAME structural zone but slightly different prices (e.g., the staggered entries at 100.869 vs 100.871 vs 100.874 — all within the 100.845 shelf's ~4-pip width). 3 pips is the canonical zone-alignment tolerance (the scaffold's dedup tolerance + the LQZ align tolerance, canon lqz-lobe.ts:185). It groups the staggered entries of one zone into one anchor bucket without over-merging adjacent zones (the golden rungs are 4-10 pips apart, so a 3-pip tolerance keeps them distinct).

## 1.4 The CI assertion (the regression guard)

```
assert |output.rows| == |output.uniqueTrades|   for every (pair, day)
// If a session-variant or anchor-duplicate produces a second row for the same
// trade_id+day, the assertion FAILS the build — catches all 23 duplicate rows
// the audit found (6 DXY + 7 EU + 10 GU).
```

---

# 2. THE STAGGERED-ENTRY MERGE (E1/E2/E3 AS ONE TRADE'S LEGS — THE EXACT SEMANTICS)

## 2.1 The defect

The v4.5.1 counted each session-variant of a zone as a separate setup (e.g., DXY LONG 100.869 ×3 = Mon London Open + Tue London Open + Tue London Mid → counted as 3 trades). These are really the SAME zone's reaction with multiple entries (the stagger).

## 2.2 The merge (the stagger as legs, not trades)

A zone reacting multiple times on the same day = ONE trade with **staggered entries** (the frozen 0.33/0.33/0.34 ladder):

```
fn mergeGroup(group: Setup[]) -> UniqueTrade:
  sorted = group.sort(by triggerTime ascending)   // chronological
  legs = sorted.map((s, i) => ({
    leg: `E${i+1}`,
    entry: s.entry,                    // each leg's actual entry price
    weight: [0.33, 0.33, 0.34][i] ?? 0.34,   // the frozen stagger weights
    session: s.session,                // provenance: which session this leg came from
    triggerMs: s.triggerMs,
  }))
  return {
    ...sorted[0],                      // the first leg's setup as the base
    is_staggered: legs.length > 1,
    staggeredEntries: legs,
    entry: weightedMean(legs.map(l => l.entry), legs.map(l => l.weight)),   // the blended entry
    sl: sorted[0].sl,                  // ONE SL (the first leg's SL — the structural SL)
    tp: sorted[0].tp,                  // ONE TP (the Law-14 walk target)
    provenance: group.map(s => s.setupId).join(' + '),   // the merged sources
  }
```

**The merge semantics:**
- **ONE SL, ONE TP, ONE trade.** The SL/TP come from the FIRST leg (the structural anchor — the zone's defendedEdge + reactionExtreme). All legs share them.
- **The blended entry** = the weighted mean of the legs' entries (the frozen 0.33/0.33/0.34 ladder). This is the trade's reported entry.
- **The legs are the fill ladder** — E1 (front, 0.33), E2 (mid, 0.33), E3 (back, 0.34). These are the staggered fills of the ONE trade (the frozen entry-stagger machinery, which already exists).

## 2.3 When to merge vs keep distinct

- **MERGE (same zone+day, different sessions):** the zone reacts in London AND NY on the same day → ONE trade with E1 = London entry, E2 = NY entry. The reaction is ONE move that day.
- **KEEP DISTINCT (same zone, different days):** the zone reacts Jul 8 AND Jul 9 → TWO trades (the zone+day identity differs). The range top reacting twice on different days = two legitimate trades (the operator's multi-day doctrine).

**The edge case (the phantom losses):** the v4.5.1's session re-emissions "re-triggered" AFTER a trade closed → 2 fake LOSSES. The merge fixes this: the zone+day is ONE trade, so there's no second "re-trigger" after the close. The outcome is computed ONCE on the merged trade.

---

# 3. THE OUTCOME SIMULATION FOR STAGGERED TRADES (THE EXACT MODEL)

## 3.1 The trigger model

A staggered trade triggers when the FIRST entry leg fills (E1). The SL/TP apply to the whole trade (one SL, one TP).

```
fn simulateStaggered(trade: UniqueTrade, bars: OHLCBar[]) -> Outcome:
  start = sessionStartMs(trade.day, trade.legs[0].session)
  triggered = false
  for bar in bars from start:
    if !triggered:
      if trade.direction === 'LONG' && bar.low <= trade.legs[0].entry: triggered = true
      else if trade.direction === 'SHORT' && bar.high >= trade.legs[0].entry: triggered = true
      else: continue
    // after trigger: first TP hit = WIN, first SL hit = LOSS (same-bar both = conservative LOSS)
    hitSL = trade.direction === 'LONG' ? bar.low <= trade.sl : bar.high >= trade.sl
    hitTP = trade.direction === 'LONG' ? bar.high >= trade.tp : bar.low <= trade.tp
    if hitSL && hitTP: return LOSS(-1)
    if hitSL: return LOSS(-1)
    if hitTP: return WIN(blendedRrr(trade))
  return triggered ? OPEN : NOT_TRIGGERED
```

## 3.2 The blended RRR (the staggered trade's R-multiple)

The staggered trade's R-multiple is the **blended RRR across the legs** (the frozen `computeBlendRrr`):

```
blendedRrr(trade) = Σ_i (leg.weight × rrr_i)
rrr_i = |trade.tp − leg.entry| / |leg.entry − trade.sl|   // each leg's RRR from its own entry
```

This is the frozen blend (0.33/0.33/0.34 weights). A staggered trade with legs at 100.869/100.871/100.874, SL 100.811, TP 101.207 → blended RRR = 0.33×rrr(100.869) + 0.33×rrr(100.871) + 0.34×rrr(100.874) ≈ the weighted average.

## 3.3 The triggered_in_week / resolved_in_week semantics

- `triggered_in_week = (the first leg's triggerMs ≤ anchorMs)` — did the trade trigger within the golden week?
- `resolved_in_week = (the outcome's exitMs ≤ anchorMs)` — did it resolve within the golden week?

A trade that triggers post-week (the order lives past Friday) is STALE (not an in-week setup). A trade that triggers in-week but resolves post-week is IN-WEEK-TRIGGERED but POST-WEEK-RESOLVED (the headline counts it if the operator wants in-week-triggered, or the STALE bucket if the operator wants in-week-resolved).

---

# 4. THE EU/GU ANCHOR DEDUP + THE EMISSION CAP (THE MIRROR OVER-EMISSION FIX)

## 4.1 The defect (the GU ×10)

The GU mirror mapped 10 DXY sources to the SAME GU anchor (1.34337) → 10 IDENTICAL trades (all SHORT at e=1.34337 sl=1.34567 tp=1.33912). The "100% win rate" is 1 trade × 10.

## 4.2 The per-anchor emission cap

```
MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1
// A mirror anchor (an EU/GU zone) produces AT MOST ONE mirror trade per day.
// Additional DXY sources mapping to the same anchor+day are MERGED (provenance:
// "GU mirror of DXY-T1 + DXY-T2 + ..."), not emitted as separate trades.
```

## 4.3 The EU anchor dedup

Same rule for EU: the EU floor (13 ACTIVE mirrors) has anchor duplicates (SHORT 1.14572 ×4, LONG 1.14082 ×3). These merge to ONE EU trade per anchor+day. **The EU floor becomes ~5-6 unique trades.**

## 4.4 The consumed-pool re-admission qualifier

The GU re-anchor pool-loosening (v4.5.x R2) allowed consumed-but-recently-battled supply (1.34337, battled 3×). The re-admission must ALSO:
1. **Cap the emission:** a consumed-but-reactive anchor emits AT MOST ONE mirror per day.
2. **Require the battle evidence:** the anchor must have a rejection-anatomy battle within the week (not just be "consumed" — it must be REACTIVE). The 1.34337 supply battled 3× this week → reactive → admitted (but capped at 1 emission/day).
3. **The emission must be vol-cleared:** the re-anchored SL must clear the anchor's wick range (the volatilityClear check).

## 4.5 The upstream zone-pool dedup

The audit found the v4.4 zone pool itself is undeduped (the same zone listed up to 3×). The upstream zone pool (the LmvTable + the OB zones) must be deduplicated BEFORE the mirror + setup generation consume them (the same zone listed 3× would produce 3 setups). The dedup: merge zones within the 3-pip tolerance (the scaffold's dedup rule) at the zone-pool stage.

---

# 5. THE EU/GU E/SL/TP REFINEMENT (THE EXACT WALL-MAP + THE PORT)

## 5.1 The asymmetry (the audit's root cause)

The DXY TP-wall refinement (TPs → range-top 101.207) was applied to DXY but NOT to EU/GU:
- **EU:** the SHORT TPs target the mid-range 1.14082 (literally the LONG entry, a mid-range level, not a wall). The LONG TPs should target the weekly supply wall.
- **GU:** the SHORT TPs target Friday's session low 1.33912 (not the weekly demand wall ~1.3342, proven Jul 13). **Wall-mapping GU's TP → 1.3350 takes RRR 1.85 → ~3.6.**
- **EU SLs:** 16-33 pips vs DXY's 5.8-8.9 (the golden range).

## 5.2 Port the TP-wall refinement to EU/GU

Apply `isWeakTpWall` + the strong-opposing-rung cap to the mirror's TP walk on EU/GU:

```
fn mirrorTP_EU_GUTP(entry, direction, targetLmv, pair) -> number:
  // walk the opposing rungs (above for SHORT, below for LONG)
  candidates = targetLmv.opposingRungs(entry, direction), nearest first
  for rung in candidates:
    if isWeakTpWall(rung): continue   // weak walls (MoM rc≤1, or liquidityScore<5, or zfp>30) → pass-through
    return rung.defendedEdge            // cap at the first STRONG opposing rung (the weekly wall)
  return candidates.last.defendedEdge   // fallback: the furthest opposing rung
```

**The wall-map (Appendix C has the exact levels):**
- **EU SHORT TP** → the weekly demand wall ~1.1396-1.1410 (the EU BoM demand, the range bottom).
- **EU LONG TP** → the weekly supply wall ~1.1444-1.1458 (the EU range top).
- **GU SHORT TP** → the weekly demand wall ~1.3342 (proven Jul 13), NOT Friday's session low 1.33912.
- **GU LONG TP** → the weekly supply wall ~1.3444-1.3459 (the GU range top).

## 5.3 Port the SL-tightening to EU/GU

Apply `computeSL_LMV` to EU/GU: the EU/GU SLs (currently 16-33 pips for EU) tighten to the golden range (the reaction extreme + Law-7 buffer: EUR 2 / GBP 3 pips). The GU SLs (already vol-cleared in v4.5.x) stay vol-cleared but are verified to be at the reaction extreme.

## 5.4 The mid-range mirror entry fix

The EU TP 1.14082 is literally the LONG entry (a mid-range level, not a wall). The mirror's TP must target the OPPOSING rung of significance (the weekly wall), not a mid-range level. This is the same `isWeakTpWall` logic applied to the mirror's TP walk on EU/GU — a mid-range level votes WEAK (not a wall) → pass-through to the weekly wall.

---

# 6. THE ACCURATE CLEAN REPORTING (THE STATS ENGINE + THE MANDATORY FIELDS)

## 6.1 The defect

The v4.5.1 reported the embellished stats (36 setups, +73.05R) computed on the DUPLICATE rows, not the unique trades. The SL_vs_ENTRY analysis was also duplicate-poisoned ("SL TOO WIDE=25" is ~11 unique wins with 10 votes from ONE GU trade).

## 6.2 The stats engine (`src/report/accurate-stats.ts`, NEW)

**All stats are computed on the DEDUPLICATED (unique) trade set ONLY:**

```
fn accurateStats(uniqueTrades: UniqueTrade[]) -> AccurateStats:
  resolved = uniqueTrades.filter(t => t.outcome === 'WIN' || t.outcome === 'LOSS')
  wins = resolved.filter(t => t.outcome === 'WIN')
  return {
    total: uniqueTrades.length,
    wins: wins.length,
    losses: resolved.length - wins.length,
    winRate: wins.length / resolved.length,
    totalR: sum(t.r for t in resolved if t.r != null),
    avgRrr: mean(t.plannedRrr for t in wins),
    perPair: groupBy(uniqueTrades, t => t.pair).map(accurateStats),   // recursive per pair
    n: resolved.length,   // the count — every win rate carries its n
  }
```

## 6.3 The mandatory fields (every reported trade)

Every reported trade MUST carry:
- `trade_id` (the dedup identity — pair|dir|anchorBucket|day).
- `is_staggered` (bool — true if E1/E2/E3 legs merged).
- `staggeredEntries` (the legs, if staggered).
- `triggered_in_week` (bool — did it trigger within the golden week?).
- `resolved_in_week` (bool — did it resolve within the golden week?).
- `outcome` (WIN / LOSS / OPEN / NOT_TRIGGERED / STALE).
- `n` (the count of unique trades in the stat it belongs to — every win rate carries its n).
- `provenance` (the merged sources, if any — the DXY sources for a mirror, the session variants for a stagger).

## 6.4 The SL_vs_ENTRY dedup

The SL-wide vs entry-early analysis (`util = MAE / SL-distance`) must be computed on the UNIQUE set. The v4.5.1's "SL TOO WIDE=25" was ~11 unique wins with 10 votes from ONE GU trade (the GU ×10 each voted SL TOO WIDE). On the unique set, the analysis is honest (each unique trade votes once).

---

# 7. THE STALE-FILL HONESTY (TRIGGERED_IN_WEEK / RESOLVED_IN_WEEK + THE SESSION-LABEL RULE)

## 7.1 The defect

7 of 13 unique trades resolved POST-week (the orders live to Jul 28). 2 never triggered in-week. The session labels ("Monday London Open") are decorative (filled at 14:00 ET).

## 7.2 The session-bracketed order expiry

A "Friday" trade must TRIGGER within Friday's session (or the week) or be marked STALE:
- **IN-WEEK trades** (`triggered_in_week = true` AND `resolved_in_week = true`) — the weekly headline stats.
- **STALE trades** (`triggered_in_week = false` OR `resolved_in_week = false`) — a separate bucket, NOT counted in the weekly headline.

The operator decides the headline semantics: IN-WEEK-TRIGGERED (count trades that triggered in-week, even if they resolve post-week) OR IN-WEEK-RESOLVED (count only fully-resolved-in-week). Default: IN-WEEK-TRIGGERED (the weekly forecast's accuracy is whether the in-week triggers won).

## 7.3 The session-label honesty rule

A trade's session label must match its actual trigger session:
- If the order was placed for "Monday London Open" but filled at 14:00 ET (the NY session), the label is "Monday London Open (intended) → filled NY 14:00 ET" — honest about the intended vs actual session.
- A trade that never triggered in its intended session is NOT_TRIGGERED (or STALE), not a setup for that session.

---

# 8. THE BUILD PLAN (waves, exact files, line budgets, done-when criteria)

## Wave A (parallel, 2 build agents, disjoint files)

### PKG-DEDUP — the stats-integrity engine
**Files:** `src/mdve/trade-dedup.ts` (NEW, ~250 lines) + `scripts/verify-trade-dedup.ts` (NEW, ~200 lines).
**Content (spec §1 + §2 + §3 + §4 + Appendix B):**
- `tradeIdentity(setup)` = `(pair, dir, zone_anchor±tol, day)` — no session component.
- `dedup(setups)` → UniqueTrade[] (the group-by + the staggered-entry merge).
- The staggered-entry merge semantics (§2.2 — ONE SL, ONE TP, blended entry, the legs as the fill ladder).
- The EU/GU anchor dedup (§4.2-4.3 — merge same anchor+day mirrors).
- The per-anchor emission cap (§4.2 — MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1).
- The consumed-pool re-admission qualifier (§4.4).
- The upstream zone-pool dedup (§4.5).
- The CI assertion (§1.4 — row-count = unique-count).
**Done when:** the v4.5.1 report dedups to **13 unique trades** (matching the audit exactly: DXY 7, EU 5, GU 1... plus the upstream zone-pool dedup which may adjust to ~11-13), the CI assertion catches all 23 duplicate rows, determinism byte-identical ×2, verify-trade-dedup passes.

### PKG-REPORT — the accurate clean reporting
**Files:** `src/report/accurate-stats.ts` (NEW, ~200 lines) + `scripts/verify-accurate-stats.ts` (NEW, ~150 lines).
**Content (spec §6 + §7):**
- The unique-set stats engine (§6.2 — win rate / total R / avg RRR on the deduplicated set).
- The mandatory fields (§6.3 — trade_id, is_staggered, triggered_in_week, resolved_in_week, n, provenance).
- The STALE bucket (§7.2 — IN-WEEK vs STALE separation).
- The session-label honesty rule (§7.3).
- The SL_vs_ENTRY dedup (§6.4).
**Done when:** the v4.5.1 stats recompute to the audit's TRUE values (13 unique, 11W/2L, 84.6%, +31.23R) with the mandatory fields + the STALE bucket + honest session labels + the deduped SL_vs_ENTRY.

## Wave B (after Wave A verified)

### PKG-EU-GU — the EU/GU E/SL/TP refinement
**Files:** `src/mdve/mirror.ts` (EXTEND, +~150 lines) + `scripts/verify-eu-gu-refinement.ts` (NEW, ~200 lines).
**Content (spec §5 + Appendix C):**
- Port `isWeakTpWall` + the strong-opposing-rung cap to the mirror's TP walk on EU/GU (§5.2).
- The EU/GU wall-map (Appendix C — EU → ~1.1396-1.1410 / ~1.1444-1.1458; GU → ~1.3342 / ~1.3444-1.3459).
- Port computeSL_LMV to EU/GU (§5.3 — the reaction-extreme SL).
- The mid-range mirror entry fix (§5.4).
- The per-anchor emission cap + the consumed-pool re-admission + the session-bracketed order expiry (§4 + §7).
**Done when:** the EU/GU TPs target the weekly walls (GU TP → 1.3350, RRR 1.85 → ~3.6), the EU SLs tighten to the golden range, the GU emission cap prevents the ×10, the EU/GU stats are on the deduplicated set.

---

# 9. THE INTEGRATION POINTS (HOW THE DEDUP + REPORTING WIRE INTO THE PIPELINE)

## 9.1 The dedup's integration

The `trade-dedup.ts` dedup runs as a POST-processing stage after the setup generation + the mirror cascade, BEFORE the report:

```
generateSourceSetupsV45(DXY) → cascadeV45(EU/GU mirrors) → emergent lane
  → TRADE-DEDUP (the stats-integrity engine)
    → the deduplicated UniqueTrade[] (with staggered-entry merges + anchor dedup + emission cap)
      → ACCURATE-STATS (the unique-set stats + the mandatory fields + the STALE bucket)
        → the report (the accurate, deduplicated stats)
```

## 9.2 The reporting's integration

The `accurate-stats.ts` runs on the deduplicated set and produces the report's stats section. The report's per-trade rows are the UniqueTrade[] (with the mandatory fields). The STALE trades go to a separate section (not the headline).

## 9.3 The EU/GU refinement's integration

The mirror.ts's TP walk + the SL computation + the emission cap + the session-bracketed expiry are IN the mirror cascade (before the dedup). The EU/GU refinement extends the mirror's buildMirror + cascadeV45.

---

# 10. THE VERIFICATION PLAN (THE 5 ADVERSARIAL TESTS + THE REGRESSION GATES + THE HARNESS STRUCTURE)

## 10.1 The 5 adversarial acceptance tests

| # | Test | Assertion | Catches |
|---|---|---|---|
| 1 | **Row-count = unique-count** | `\|output.rows\| == \|output.uniqueTrades\|` for every (pair, day) | all 23 duplicate rows (6 DXY + 7 EU + 10 GU) |
| 2 | **Wall-TP assertion** | every DXY LONG TP targets the range-top ~101.19-101.24; every EU/GU TP targets the weekly wall (EU ~1.1396-1.1410, GU ~1.3342). Any mid-range TP = FAIL | the EU TP 1.14082 (mid-range) + the GU TP 1.33912 (session low) |
| 3 | **No post-week triggers in the weekly headline** | every headline trade has `triggered_in_week = true`. Any "Friday" trade that filled post-week = STALE, not headline | the 7 stale fills (EU "Friday" → Jul 13-14) |
| 4 | **Independent R recomputation ±0.01R** | the total R recomputed from the unique trades matches the reported total R ±0.01R | the +73.05R → +31.23R correction |
| 5 | **GU emission cap** | the GU lane produces ≤ 1 mirror per anchor per day. Any ×N (N>1) = FAIL | the GU ×10 |

## 10.2 The regression gates (no broken windows)

All 8 existing suites MUST still pass:
- `golden-recon.ts` — 16/16 (the MDVE model reproduces the golden chart).
- `verify-cascade.ts` — 13/13 (the v4.4 cascade contract).
- `verify-integration.ts` — 13/13 (the v4.4 pipeline stage).
- `scratch-lmv.ts` — 21/21 (the LMV engine).
- `verify-sl-fix.ts` — 25/25 (the SL-width fix).
- `verify-mirror-fix.ts` — 21/21 (the mirror re-anchor).
- `verify-integration-v45.ts` — 26/26 (the v4.5 pipeline integration).
- `verify-refinement-x.ts` — 18/18 (the v4.5.x refinement wave).

Plus: determinism byte-identical ×2, zero win→loss conversions introduced, frozen machinery 7/7 byte-identical.

## 10.3 The harness structure

```
scripts/verify-trade-dedup.ts    (PKG-DEDUP — the dedup + merge + cap + CI assertion)
scripts/verify-accurate-stats.ts (PKG-REPORT — the unique-set stats + the fields + the STALE bucket)
scripts/verify-eu-gu-refinement.ts (PKG-EU-GU — the TP-wall + SL + wall-map + emission cap on EU/GU)
scripts/verify-v452.ts            (the acceptance — the 5 adversarial tests + the TRUE stats + no regression)
```

Each harness prints PASS/FAIL per assertion + the before/after evidence. The orchestrator runs all of them + the 8 regression suites + the outcome audit (the accurate, deduplicated stats).

---

# 11. ANTI-GOALS + FROZEN CONSTRAINTS

- ❌ **No fabrication.** The per-row simulations were real (reproduced to the cent); the issue is duplication, not fabrication. Do NOT touch the per-row simulation logic (it's correct).
- ❌ **No changing the frozen machinery** (visual-setup-generator.ts, ladder-scaffold.ts, the canon lobes, the v4.4_CHECKPOINT — LOCKED). The dedup + reporting are NEW files (trade-dedup.ts, accurate-stats.ts); the EU/GU refinement extends mirror.ts (OPEN).
- ❌ **No blanket dedup that kills legitimate multi-day reactions.** Different days = DISTINCT (the operator's doctrine). Only same-day session-variants + anchor-duplicates merge.
- ❌ **No embellishment.** Every stat carries its n. Every trade carries its dedup identity. The win rate is on unique trades, period.
- ❌ **No over-merging adjacent zones.** The 3-pip anchor tolerance groups the staggered entries of one zone without merging adjacent golden rungs (which are 4-10 pips apart).
- **The v4.4_CHECKPOINT is LOCKED (never touched again).** v4.5.2 works in the v4.5.1_LIVE_MARKET_CAPABLE codebase (OPEN) or a fresh fork.

---

# APPENDIX A — THE AUDIT'S CONFIRMED FUCK-UPS (THE FULL EVIDENCE)

1. **GU ×10:** byte-identical rows (all SHORT e=1.34337 sl=1.34567 tp=1.33912). Entire GU lane = ONE trade.
2. **Phantom losses:** DXY LONG 100.977 Wed won at 09:00Z (+2.99R); session re-emissions "re-triggered" at 18:00Z AFTER the trade closed and stopped out — counted as 2 real LOSSES. Duplication poisons stats in both directions.
3. **Stale fills:** EU SHORT 1.14572 "Friday" never touched 1.14572 on Friday — filled Tue Jul 14. EU LONG 1.14082 "Friday" never touched Friday (low 1.14114) — filled Mon Jul 13, stopped 1h later. **7 of 13 unique trades resolved post-week; 2 never triggered in-week.**
4. **Decorative session labels:** "Monday London Open" trade filled at 14:00 ET. Orders never expire — they live to Jul 28.
5. **SL_vs_ENTRY duplicate-poisoning:** "SL TOO WIDE=25" is ~11 unique wins; 10 of the 25 votes are ONE GU trade.
6. **Zone pool undeduped (v4.4):** same zone listed up to 3× — the root generator.
7. **GU luck-assisted fill:** Friday high 1.34517 held the SL by 5 pips; Friday low 1.33918 missed the TP by 0.6 pips; the TP filled on the SUNDAY reopen gap. Had the gap not filled, GU went to 1.35579 by Jul 15 — full loss.

# APPENDIX B — THE DEDUP IDENTITY PSEUDOCODE (THE EXACT ALGORITHM, NORMATIVE)

```typescript
const ANCHOR_TOLERANCE_PIPS: Record<string, number> = { 'DXY': 3, 'EUR/USD': 3, 'GBP/USD': 3, 'AUD/USD': 3 };

function tradeIdentity(setup: TradeSetup, pair: string): string {
  const pip = PIP_VALUE[pair] ?? 0.0001;
  const tol = ANCHOR_TOLERANCE_PIPS[pair] * pip;
  const anchorPrice = setup.entryZone?.defendedEdge ?? setup.entry;
  const anchorBucket = Math.round(anchorPrice / tol);
  return `${pair}|${setup.direction}|${anchorBucket}|${setup.day}`;
}

function dedup(setups: TradeSetup[]): UniqueTrade[] {
  const groups = new Map<string, TradeSetup[]>();
  for (const s of setups) {
    const id = tradeIdentity(s, s.pair);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(s);
  }
  const unique: UniqueTrade[] = [];
  for (const [id, group] of [...groups.entries()].sort()) {   // deterministic order
    if (group.length === 1) { unique.push({ ...group[0]!, trade_id: id, is_staggered: false }); continue; }
    // MERGE: one trade with staggered entries (the frozen 0.33/0.33/0.34 ladder)
    const sorted = [...group].sort((a, b) => (a.triggerMs ?? 0) - (b.triggerMs ?? 0));
    const weights = [0.33, 0.33, 0.34];
    const legs = sorted.map((s, i) => ({
      leg: `E${i + 1}`, entry: s.entry, weight: weights[i] ?? 0.34, session: s.session, triggerMs: s.triggerMs,
    }));
    const blendedEntry = legs.reduce((sum, l) => sum + l.entry * l.weight, 0);
    unique.push({
      ...sorted[0]!, trade_id: id, is_staggered: true,
      staggeredEntries: legs, entry: blendedEntry, sl: sorted[0]!.sl, tp: sorted[0]!.tp,
      provenance: group.map(s => s.setupId).join(' + '),
    });
  }
  return unique;
}
```

# APPENDIX C — THE EU/GU WALL-MAP (THE EXACT WEEKLY WALL LEVELS + THE COMPUTATION)

**EU (the weekly walls — from the EU LmvTable):**
- **SHORT TP** → the weekly demand wall ~1.1396-1.1410 (the EU BoM demand, the range bottom — the defendedEdge of the EU's strongest BUY_SIDE demand zone in the golden week's range).
- **LONG TP** → the weekly supply wall ~1.1444-1.1458 (the EU range top — the defendedEdge of the EU's strongest SELL_SIDE supply zone).
- **EU SLs** → the reaction-extreme SL (tighten from 16-33p to the golden range: the nearest defended rung's reactionExtreme + 2-pip Law-7 buffer).

**GU (the weekly walls — from the GU LmvTable):**
- **SHORT TP** → the weekly demand wall ~1.3342 (proven Jul 13 — the GU BoM demand where GU based before the rally), NOT Friday's session low 1.33912. **TP 1.33912 → 1.3350 takes RRR 1.85 → ~3.6.**
- **LONG TP** → the weekly supply wall ~1.3444-1.3459 (the GU range top).
- **GU SLs** → volatility-cleared (already vol-cleared in v4.5.x; verify they're at the reaction extreme + 3-pip Law-7 buffer).

**The wall-map computation:** for each pair, the weekly walls are the defendedEdges of the pair's STRONGEST opposing zones (the UM BoM or liquidityScore≥5 rungs) in the golden week's range. The mirror's TP walk targets these (via isWeakTpWall — weak walls pass through, strong walls cap).

# APPENDIX D — THE TRUE STATS (THE DEDUPLICATED BASELINE, VERIFIED AGAINST THE BARS)

| Pair | Unique trades | W/L | Win rate | True R | Avg planned RRR |
|---|---|---|---|---|---|
| DXY | 7 | 6W/1L | 85.7% | +22.32R | 3.87x |
| EU | 5 | 4W/1L | 80.0% | +7.06R | 2.59x |
| GU | 1 | 1W/0L | n=1 | +1.85R | 1.85x |
| **TOTAL** | **13** | **11W/2L** | **84.6%** | **+31.23R** | — |

**The v4.5.2 target:** after the EU/GU refinement, the EU/GU RRR improves (GU → ~3.6 RRR, EU → ~3.4 RRR), and the EU/GU unique counts recover (the anchor dedup produces clean unique trades, not duplicates).

# APPENDIX E — THE FROZEN MACHINERY LIST (THE EXACT FILE:LINE LOCATIONS)

**NEVER touch these (the frozen list — the v4.4_CHECKPOINT + the frozen machinery):**
- `Checkpoints/v4.4_MARKET_READY_BASELINE/` — LOCKED IMMUTABLE (chmod -R a-w).
- `src/engine3/visual-setup-generator.ts` — entry computation (:53-58 FORWARD_SPREAD, :1075-1093 computeStaggeredEntries), computeSLNextLqzRung (:1126), computeTPSignificancePath (:1289), the inline repair loop (:584-657), the corrected dedup (zoneDayKey :706-712), the source-semantics helpers (isModelVerifiedSource :256-259, isBlindFallbackSource :261-263).
- `src/engines/ladder-scaffold.ts` — the 5 sources, the dedup, the bound (generateCandidateLadder :403).
- `src/brains/4h-sd-lobe.ts` — the OB detection (construct4HZones :100), the event-granularity freshness (:430-467), the canon zfp (:167-182).
- `src/brains/lqz-lobe.ts` — the LQZ detection (detectLiquidityZones :264), the canon zfp ladder (:392), LQZ_LOOKBACK_BARS=720 (:119).
- `src/brains/9-pillar-lobe.ts` — the 9-pillar confluence engine.
- `src/brains/shape-brain.ts` — the Engine 2 shape chains.

**The v4.5.2 NEW files (all OPEN):** `src/mdve/trade-dedup.ts`, `src/report/accurate-stats.ts`, `scripts/verify-trade-dedup.ts`, `scripts/verify-accurate-stats.ts`, `scripts/verify-eu-gu-refinement.ts`, `scripts/verify-v452.ts`.
**The v4.5.2 EXTENDED files (OPEN):** `src/mdve/mirror.ts` (the EU/GU refinement).

---

*END OF V4.5.2 FULL SPEC — build proceeds per the Wave plan (§8) after the operator's go-ahead (GATE-1).*
