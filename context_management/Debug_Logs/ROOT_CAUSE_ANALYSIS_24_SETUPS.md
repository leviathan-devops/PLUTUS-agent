# ROOT CAUSE ANALYSIS: Plutus Pipeline — Architectural Collapse
**Date:** 2026-07-23 (Session 3 — Complete Forensic Realignment)
**Status:** FULLY DIAGNOSED — 8 compounding defects identified across 3 architectural layers
**Method:** 3 parallel forensic audit agents + 38-trade forensic analysis + golden standard reference + code vs baseline comparison

---

## 1. CLASSIFICATION

The pipeline has an **architectural collapse** — it reduces a WEEK of trading (multiple shapes, multiple directions, multiple days, multiple categories) into a SINGLE verdict (one shape, one direction, one day, one category). This is NOT a bug — it's a fundamental design flaw that existed in the baseline AND was amplified by B-fixes.

**Current output:** 3-4 setups with WRONG direction (0/3 forecast accuracy)
**Previous baseline:** 6 setups with CORRECT direction (3/3 forecast accuracy)
**Golden standard:** 24 setups (8 DXY + 8 EURUSD + 8 GBPUSD + 0 AUDUSD)

---

## 2. THE 8 DEFECTS (Root Causes)

### DEFECT 1: Single Global Shape for Entire Week (ARCHITECTURAL)

**Symptom:** Pipeline produces ONE shape (e.g., "BS") for all 5 days. All setups get ONE category.

**Root Cause Chain:**
- `classifyShape()` (shape-brain.ts:623) reduces the ENTIRE zone map to ONE ShapeCode
- `trade-brain.ts:764` uses this single `currentShape` for ALL setups across ALL days
- `buildShapeChain()` starts with this single shape and `predictNextShape()` plateaus due to static ZFP

**Spec Violation:** Golden standard requires SS(Mon-Tue)→BS(Wed)→R(Thu)→WL(Fri). Each day's shape determines which setup categories are available.

**Evidence:**
- `classifyShape()` returns BS if ANY bounding zone has ZFP > 45%. With 7 LQZ zones (B1 fix), more zones exist → higher chance of ZFP > 45% → BS verdict.
- `predictNextShape()` uses `getDirectionalZfp()` which returns the SAME ZFP every step (zones are immutable). The chain plateaus: BS→R→R→R or BS→PBS→PBS→PBS.
- `assignDayAndSession()` finds FIRST day matching single `currentShape` in dayDecomposition. ALL setups get same day.

**Files:** `src/brains/shape-brain.ts:623,1174,1282`, `src/engine3/visual-setup-generator.ts`

---

### DEFECT 2: Single Direction Per Day (ARCHITECTURAL)

**Symptom:** All setups for a day are either ALL LONG or ALL SHORT. No dual-direction days.

**Root Cause:** `resolveDirection()` (visual-setup-generator.ts:521) returns ONE `TradeDirection` for the entire day based on zone proximity (nearest supply vs demand). All zones for that day are filtered to match this direction.

**Spec Violation:** Law 6 requires PER-ZONE direction (supply→SHORT, demand→LONG). The golden standard Monday has SS LONG (demand zone) AND BS SHORT (supply zone) simultaneously.

**Evidence:** Pipeline output shows all-DXY-SHORT or all-FX-LONG. Never both directions on same pair.

**Files:** `src/engine3/visual-setup-generator.ts:521-551`

---

### DEFECT 3: B4 Cascade Filter Amplifies Direction Errors (REGRESSION — FROM B-FIX)

**Symptom:** When DXY direction is wrong, cascade kills ALL correct FX setups. Forecast 0/3.

**Root Cause:** B4 added a cascade filter that determines DXY direction from setup count majority, then REJECTS all FX setups in the same direction as DXY. If DXY resolves SHORT (wrong), ALL FX SHORT setups (correct) are killed.

**Spec Violation:** Law 20 says cascade is a HARD FILTER on direction, but Law 19 (ZOC) provides exception for SS at high-confluence zones. The B4 implementation has NO ZOC exception. Also, DXY/EU/GU are inverse 1:1 — same shapes, same setups, opposite direction. The cascade should GENERATE inverse setups, not just filter.

**Evidence:** Previous baseline (no cascade) was 3/3 correct direction. Current (with B4) is 0/3 correct.

**Files:** `src/pipeline/engine.ts` (B4 cascade block, added after setup generation loop)

---

### DEFECT 4: TP Excludes LIQUIDITY Zones (REGRESSION — PRE-EXISTING)

**Symptom:** ~50% of setups have TP=null → silently skipped.

**Root Cause:** TP computation (`computeTPEarthFire()` in visual-setup-generator.ts) only accepts SUPPLY (for LONG TP) or DEMAND (for SHORT TP). LIQUIDITY zones are excluded.

**Spec Violation:** Golden standard shows 18% of winning trade TPs are at LSZ/Liquidity Shield zones. FORENSIC_ANALYSIS_38_TRADES.md Law 4: "TP ALWAYS at opposing zone on HIGHER TF" — this includes LSZ.

**Evidence:** Baseline TP included LIQUIDITY zones. Current code excludes them. Setup count dropped ~50%.

**Files:** `src/engine3/visual-setup-generator.ts:761-805` (computeTPEarthFire)

---

### DEFECT 5: RR Filter Rejects Valid Setups (PRE-EXISTING — Violates Law 35)

**Symptom:** Setups with RR < 2.0 are rejected. Many valid setups killed.

**Root Cause:** Category-dependent RRR minimum filter at visual-setup-generator.ts:315-318. Rejects setups below threshold.

**Spec Violation:** Law 35: "RR IS A CONSEQUENCE, NOT A TARGET. Don't reject based on minimum RR. Let zone structure determine RR." FORENSIC_ANALYSIS shows RR range 1:1 to 1:16 with median 3.5x.

**Evidence:** Pipeline log shows "[skip] zone: RRR 0.38 < 2" — valid zone geometry rejected because TP distance < 2× SL distance. But the zone IS valid — the RR is just what the geometry gives.

**Files:** `src/engine3/visual-setup-generator.ts:315-318`, `src/constants/trading-constants.ts:140-150`

---

### DEFECT 6: Shape Chain Static ZFP (ARCHITECTURAL)

**Symptom:** Chain produces same shape every step. No variety. [BS, R, R, R] or [BS, PBS, PBS, PBS].

**Root Cause:** `getDirectionalZfp()` (shape-brain.ts:1141) returns same ZFP value every step because zones are immutable snapshots. `predictNextShape()` uses ZFP bands to determine transitions — same band → same transition → plateau.

**Spec Violation:** Shape sequence must be DYNAMIC. SS→BS→R→WL is the most frequent pattern but must emerge from zone analysis, not from static repetition.

**Evidence:** Pipeline log: "chain 4 steps" but all inherit same shape. `buildDayDecomposition()` DOES produce variety via energy fallback patterns, but nobody consumes it.

**Files:** `src/brains/shape-brain.ts:93-142,1141-1162,1217-1253`

---

### DEFECT 7: classifyShape Threshold Too Aggressive (ARCHITECTURAL)

**Symptom:** classifyShape returns BS when it should return SS.

**Root Cause:** ZFP > 45% threshold for BS is too low. Balanced zones with moderate ZFP (40-50%) should be SS (consolidation). Only ACTIVELY FAILING zones (ZFP > 60%) should trigger BS.

**Spec Violation:** SS is the most common shape (accumulation phase, Mon-Tue). BS requires actual zone failure, not just moderate pressure.

**Evidence:** With 7 LQZ zones (B1 fix), more zones exist near spot. Any zone with ZFP > 45% flips the entire week to BS. But the golden standard starts with SS (Mon-Tue consolidation).

**Files:** `src/brains/shape-brain.ts:623-656` (classifyShape, ZFP_ZONE_FAILURE_THRESHOLD)

---

### DEFECT 8: Trade Chaining Not Implemented (MISSING)

**Symptom:** No link between consecutive trades. TP of setup N doesn't become entry of N+1.

**Root Cause:** Law 27 exists in the spec but has no code path. Setups are generated independently, not chained.

**Spec Violation:** Law 27: "TRADE CHAINING — TP OF ONE = ENTRY OF NEXT." 85% of winning trades have obvious 2nd trade at TP. If no chain exists → setup is suspect.

**Evidence:** Golden standard: Trade 2 entry (101.14) = Trade 1 TP region. Trade 5 entry (100.975) = Trade 4 TP. Trade 6 entry (101.235) = Trade 5 TP region. All chained.

**Files:** Not implemented. Reference: `src/engine/plutus-tte-pipeline.ts:5443` (linkTradeChains method exists in legacy but not ported to v4.0 pipeline).

---

## 3. DEPENDENCY GRAPH

```
DEFECT 1 (single shape) ─────────────────────┐
                                             ├──→ ALL setups get ONE category
DEFECT 2 (single direction) ─────────────────┤
                                             ├──→ ALL setups ONE direction per day
DEFECT 6 (static ZFP) ────────────┐          │
                                  ├──→ Chain plateaus
DEFECT 7 (BS threshold) ──────────┘          │
                                             │
DEFECT 3 (B4 cascade) ───────────────────────┤──→ Amplifies wrong direction
                                             │
DEFECT 4 (TP excludes LIQUIDITY) ────────────┤──→ 50% fewer setups
                                             │
DEFECT 5 (RR filter) ────────────────────────┤──→ Kills valid setups
                                             │
DEFECT 8 (no trade chaining) ────────────────┘──→ No sequential setups
```

**Critical path:** Defect 1+7 → wrong shape → wrong categories → Defect 2 → wrong direction → Defect 3 → cascade amplifies → ALL forecasts wrong.

---

## 4. WHAT B-FIXES BROKE vs FIXED

| Fix | Fixed | Broke | Action |
|-----|-------|-------|--------|
| B1 (1H LQZ bars) | ✅ 7/7 golden levels | Nothing directly | KEEP |
| B2 (relaxed confirm) | ✅ More LQZ zones | ⚠️ More noise | KEEP |
| B3 (mergeLqzWithIpZones) | ✅ Proper typing | 🔴 Shifted zone balance → direction flip | KEEP (fix downstream) |
| B4 (cascade filter) | Intended: enforce Law 20 | 🔴 CATASTROPHIC: 0/3 direction accuracy | REVERT + REIMPLEMENT |
| B5 (dual-direction) | Intended: more setups | ⚠️ Useless (SS never produced) | KEEP MAX=6, rest no-op |

---

## 5. WHAT THE BASELINE GOT RIGHT (That We Lost)

The v4.0_6_SETUPS_BASELINE produced 6 CORRECT setups because:
1. All LQZ zones were 'LSZ Supply' → demand side weaker → resolveDirection returned correct directions
2. No cascade filter → FX pairs independently found correct direction
3. TP included LIQUIDITY zones → more setups had valid TP
4. Result: 3 EURUSD SHORT + 3 GBPUSD SHORT = 6 total (correct direction, insufficient count)

---

## 6. THE 7 UNIVERSAL LAWS FROM 38 WINNING TRADES

1. Entry ALWAYS at zone edge (74%) or inside (26%) — NEVER arbitrary
2. SL at structural invalidation (opposite zone edge + 2-5 pips) — NOT fixed buffer
3. SL buffer is 2-5 pips — NEVER 8-15 (current code uses 8-15)
4. TP ALWAYS at opposing zone on HIGHER TF — includes LIQUIDITY zones (18%)
5. LSZ is a SHIELD — in 84% of trades, entry zone IS the shield
6. RR is a CONSEQUENCE — median 3.5x, NOT a rejection criterion
7. Liquidity ladder rockets go DEEPER into zone — not at far edge

---

## 7. EVIDENCE TABLE

| # | Finding | Source | Impact |
|---|---------|--------|--------|
| E1 | LQZ with 1H bars produces 7/7 golden levels | Test run (B1+B2+B3) | LQZ fix verified correct |
| E2 | classifyShape returns BS for balanced zones | Code audit (shape-brain.ts:623) | All setups get wrong category |
| E3 | resolveDirection returns ONE direction per day | Code audit (vsg.ts:521) | No dual-direction days |
| E4 | B4 cascade amplifies direction error | Pipeline run (0/3 accuracy) | System-wide direction flip |
| E5 | TP excludes LIQUIDITY zones | Code audit (vsg.ts:776) | ~50% setups have TP=null |
| E6 | RR filter rejects setups < 2.0 | Code audit (vsg.ts:315) | Violates Law 35 |
| E7 | Static ZFP causes chain plateau | Code audit (shape-brain.ts:1141) | No shape variety |
| E8 | Trade chaining not implemented | Code audit | No sequential setups |
| E9 | 38 winning trades: SL buffer 2-5 pips | FORENSIC_ANALYSIS | Current SL 2-3x too wide |
| E10 | 38 winning trades: RR 1:1 to 1:16 | FORENSIC_ANALYSIS | RR is NOT a filter criterion |
| E11 | 85% of winning trades have chain at TP | WINNING_TRADE_ANALYSIS | Chaining is pass criteria |
| E12 | DXY/EU/GU are inverse 1:1 correlated | User specification | Cascade = generation, not just filter |
| E13 | AU diverges from correlation | User specification | Handle separately |
| E14 | R = Recovery (NOT Reinforcement) | User correction | LL = Reinforcement |
| E15 | HTF Swing IS BS/WL | User correction | NOT separate category |
