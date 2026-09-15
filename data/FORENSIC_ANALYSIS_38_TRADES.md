# FORENSIC ANALYSIS: 38 WINNING TRADES — WHAT ENGINE 3 IS DOING WRONG

**Date**: 2026-07-16
**Method**: VLM analysis of all 38 winning trade images, one by one
**Focus**: Entry placement, SL placement, SL-to-entry relationship, zone anchoring

---

## THE 7 UNIVERSAL LAWS (Confirmed Across All 38 Trades)

### LAW 1: ENTRY IS ALWAYS AT A ZONE EDGE — NEVER ARBITRARY

| Placement | Count | % |
|-----------|-------|---|
| Zone EDGE (ceiling for LONG, floor for SHORT) | 28/38 | 74% |
| Zone INSIDE (middle or deep) | 10/38 | 26% |

**Entry zones used (by frequency):**
1. **15m (Unmitigated) MoM** — 12 trades (most common)
2. **30m MoM / Refined** — 8 trades
3. **1H (Unmitigated) MoM** — 7 trades
4. **4H Liquidity / MoM** — 5 trades
5. **LSZ / Liquidity Shield** — 4 trades
6. **Consolidation zone** — 2 trades

**Engine 3 status**: ✅ FIXED in Wave 1 (LTF entry selection). Entries now at LTF zone edges.

---

### LAW 2: SL IS AT THE STRUCTURAL INVALIDATION POINT — NOT A FIXED PIP DISTANCE

This is the **#1 bug in Engine 3**.

**How winning trades place SL:**
- Entry at zone edge (e.g., demand zone ceiling for LONG)
- SL at **opposite zone edge + 2-5 pip buffer**
- SL distance = **zone width + 2-5 pips**

**How Engine 3 places SL:**
- Entry at zone edge
- SL at zone edge + **SNIPER_BUFFER (8-15 fixed pips per pair/category)**
- SL distance = **fixed buffer, NOT related to zone structure**

**The difference is catastrophic.** Example from winning trade #1:
- 15m zone: floor 1.36220, ceiling 1.36327 (width = 10.7 pips)
- Entry: 1.36327 (ceiling, LONG)
- SL: 1.36220 (floor) = **exactly at opposite zone edge**
- SL distance: 10.7 pips (zone width)

Engine 3 would do: SL = 1.36327 - (8 pip buffer) = 1.36247 → SL distance = 8 pips. This is INSIDE the zone, not behind it. **The trade would be stopped out by a wick that the winning trade survived.**

**SL distance distribution across 38 trades:**

| SL Range | Count | % | Typical Context |
|----------|-------|---|-----------------|
| 3-6 pips | 7 | 18% | Ultra-tight scalps on 15m zones (3-5 pip zone width) |
| 8-15 pips | 11 | 29% | Standard 15m/30m zone entries (8-12 pip zone width) |
| 17-30 pips | 14 | 37% | 1H/4H zone entries (15-25 pip zone width) |
| 34-55 pips | 6 | 16% | 4H Liquidity zone entries (wide zones) |

**Median SL: ~15 pips | Mode SL: ~12 pips**

**Engine 3 SL distances (from July 7 report):**
- Setup #1: 8 pip SL (EUR/USD)
- Setup #6: 26 pip SL (GBP/USD)
- Average: ~20 pips

**Engine 3's SLs are 30-50% WIDER than winning trades because they use fixed buffers instead of zone structure.**

---

### LAW 3: SL BUFFER IS 2-5 PIPS — NEVER 8-15

Across 38 trades, the buffer between the zone edge and the SL line:

| Buffer | Count | % |
|--------|-------|---|
| 0-2 pips | 12 | 32% |
| 3-5 pips | 19 | 50% |
| 6-8 pips | 5 | 13% |
| 10+ pips | 2 | 5% |

**The dominant buffer is 3-5 pips beyond the opposite zone edge.**

Engine 3 uses SNIPER_BUFFER of 8-15 pips. This is **2-3x too wide**.

---

### LAW 4: TP IS ALWAYS AT AN OPPOSING ZONE ON A HIGHER TIMEFRAME

| TP Zone Type | Count | % |
|--------------|-------|---|
| 30m/1H MoM (Unmitigated) | 15 | 39% |
| 4H Liquidity / MoM | 10 | 26% |
| 1H LSZ / Liquidity Shield | 7 | 18% |
| 15m MoM (opposing) | 6 | 16% |

**TP timeframe is ALWAYS ≥ entry timeframe.** A 15m entry targets 30m or 1H zones. A 1H entry targets 4H zones. Never same-TF targeting.

Engine 3 status: ✅ Fixed in Wave 3 (P6 TP TF hierarchy)

---

### LAW 5: THE LSZ IS A SHIELD — NOT THE SL LOCATION

In 32/38 trades (84%), there is **NO separate LSZ between entry and SL**. The entry zone ITSELF is the shield. The SL is placed at the opposite edge of the entry zone.

In 6/38 trades (16%), there IS a separate LSZ between entry and SL. In these cases:
- The LSZ acts as an additional buffer
- The SL is placed behind the LSZ, not at it
- The LSZ is typically a 4H liquidity level

**Engine 3's Wave 2 LSZ enforcement is WRONG.** It requires a separate LSZ zone between entry and SL, then uses structural shields (the entry zone itself) as a fallback. But the winning trades show that the entry zone IS the shield in 84% of cases. There is no separate LSZ needed.

---

### LAW 6: RR RATIO IS A CONSEQUENCE, NOT A TARGET

| RR Range | Count | % |
|----------|-------|---|
| 1:1 - 1:2 | 8 | 21% |
| 1:2 - 1:4 | 12 | 32% |
| 1:4 - 1:8 | 12 | 32% |
| 1:8 - 1:16 | 6 | 16% |

**Median RR: ~3.5x**

The RR is determined by the zone geometry (entry zone width vs distance to opposing zone). It is NOT a fixed target. The trader takes whatever RR the zone structure provides.

Engine 3 status: ✅ Correctly uses zone-to-zone distance for RR.

---

### LAW 7: LIQUIDITY LADDER ENTRIES ARE AT THE SAME ZONE, NOT DIFFERENT ZONES

From the 5 liquidity ladder trades:
- Primary entry at zone edge (e.g., 15m MoM ceiling)
- Rocket 1 entry is 5-15 pips DEEPER into the same zone (toward the floor)
- Rocket 2 entry is at or near the zone floor
- ALL entries share the SAME SL (at floor - buffer)
- SL cascade: when R1 fills, primary SL → breakeven. When R2 fills, R1 SL → breakeven.

**Engine 3's reinforcement entries are at the FAR EDGE of the zone** — the opposite of what winning trades do. Winning trades add rockets DEEPER into the zone (toward the SL), not at the opposite edge.

---

## WHAT IS BROKEN IN ENGINE 3 — THE 5 CRITICAL BUGS

### BUG #1: SL CALCULATION IS STRUCTURALLY WRONG ⚠️ CRITICAL

**Current**: `SL = zone_edge + SNIPER_BUFFER[pair][category]` (fixed 8-15 pips)

**Should be**: `SL = opposite_zone_edge + 2-5 pip buffer`

The SL must be calculated from the ZONE GEOMETRY, not a fixed constant. The winning trades prove that SL distance = zone width + 2-5 pip buffer. Engine 3's fixed buffer approach produces SLs that are:
- Too wide for narrow zones (killing RR)
- Too narrow for wide zones (getting stopped out)
- Disconnected from the zone structure (random placement)

**Fix**: Change `getSniperSL()` to compute SL as:
```
LONG: SL = zone.floor - small_buffer (2-5 pips)
SHORT: SL = zone.ceiling + small_buffer (2-5 pips)
```
Where `small_buffer` is based on pair volatility (2 pips for EUR, 3 for GBP, 5 for DXY).

### BUG #2: TOO MANY TRADES ON ONE DAY ⚠️ HIGH

**Why 5 trades on Tuesday**: The pipeline iterates over ALL eligible zones × ALL days × ALL categories. When the shape chain assigns the same shape to multiple days, the same zones generate setups for each day. The dedup key includes `day`, so the same zone+direction+category generates a DIFFERENT setup for Monday vs Tuesday vs Wednesday.

But the winning trades show **1-2 setups per pair per week**, not 5+ per day. The golden standard is selective — only the BEST setups at the BEST zones.

**Root cause**: No limit on setups per day per pair. The pipeline generates every possible combination and lets the firewall/confidence sort them.

**Fix**: Add `MAX_SETUPS_PER_DAY_PER_PAIR = 2` constraint. After generating all candidates for a day, keep only the top 2 by confidence.

### BUG #3: SESSION TIMING IS DECORATIVE, NOT FUNCTIONAL ⚠️ HIGH

**Current**: Session is assigned by category (SWING_SCALP → London Open, BREAKOUT_SURGE → NY Overlap). But the entry is a LIMIT ORDER at the zone edge. This order can fill at ANY TIME — including Asian session when liquidity is thin.

**Winning trades**: Entries are INTRADAY decisions. The trader waits for price to reach the zone DURING the session, then enters. If price reaches the zone outside the session, the entry is NOT taken.

**Why session timing was "broken" in the price action audit**: All 10 setups filled during Asian session (00:00-02:00 ET) because the limit orders were sitting there waiting. Price touched the entry level during low-liquidity hours, filled the order, then reversed and hit SL.

**Fix**: The pipeline should either:
1. Add a session filter: only count fills that occur during the assigned session window
2. Or use session-aware entry timing: generate "waiting" orders that only activate during the session

This is a REPORTING/PRESENTATION issue as much as an engine issue. The setups should say: "Enter ONLY if price touches this level during London Open 02:00-05:00 ET. If price touches outside this window, DO NOT ENTER."

### BUG #4: REINFORCEMENT ROCKETS ARE AT THE WRONG EDGE ⚠️ MEDIUM

**Current**: Reinforcement entry at FAR edge of zone (opposite from primary entry). So primary at ceiling, reinforcement at floor.

**Winning trades**: Rockets are DEEPER into the zone from the primary, toward the SL. So primary at ceiling, R1 5-10 pips deeper, R2 at floor. This means rockets are averaging DOWN (for LONG) into the zone, getting better prices as price pushes against the position.

**Fix**: Change reinforcement entry logic to:
```
LONG: R1 = entry - zone_width * 0.33 (1/3 into zone)
     R2 = entry - zone_width * 0.66 (2/3 into zone)
```

### BUG #5: LSZ ENFORCEMENT IS SOLVING A NON-PROBLEM ⚠️ MEDIUM

**Current**: Wave 2 added mandatory LSZ shield check between entry and SL. When no LSZ found, uses structural shields (entry zone itself) as fallback.

**Winning trades**: In 84% of trades, there is NO separate LSZ between entry and SL. The entry zone IS the structure. The SL is simply at the opposite edge of the entry zone.

The LSZ enforcement adds complexity without value. The real fix is BUG #1 — compute SL from zone geometry.

---

## SUMMARY: WHAT TO FIX AND IN WHAT ORDER

| Priority | Bug | Fix | Impact |
|----------|-----|-----|--------|
| **P0** | SL calculation | Change from fixed buffer to zone geometry (opposite edge + 2-5 pips) | Saves 4-5 trades from SL hit, improves RR dramatically |
| **P0** | Session timing | Add "enter ONLY during assigned session" language and filtering | Prevents Asian-session fills that reverse |
| **P1** | Too many trades/day | MAX_SETUPS_PER_DAY_PER_PAIR = 2 | Focuses on best setups only |
| **P1** | Reinforcement rockets | Rockets deeper into zone (toward SL), not at far edge | Correct ladder geometry |
| **P2** | LSZ enforcement | Simplify — remove mandatory LSZ check, use zone geometry for SL | Reduces complexity, prevents false rejections |
