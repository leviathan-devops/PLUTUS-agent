# GAP ANALYSIS: Pipeline Output vs 8 Winning DXY Trades (July 6-10, 2026)

**Date**: 2026-07-18
**Source**: User's god-vision DXY 1H chart (Screenshot from 2026-07-17 01-01-08.png) + 8 winning trades + 38 winning trade library
**Purpose**: Map the EXACT gap between current pipeline output and the user's proven winning trades

---

## THE 8 WINNING DXY TRADES (User's Actual Trades)

| # | Day | Setup | Entry | SL | TP | Result | Zone |
|---|-----|-------|-------|----|----|--------|------|
| 1 | Mon | SS Long | 100.945 | 100.905 | 101.115 | WIN | 1H LQZ |
| 2 | Mon | BS Short | 101.14 | 101.200 | 100.845 | WIN | 1H LQZ |
| 3 | Tue | SS Long | 100.845 | 100.77 | 101.190 | WIN | 1H MoM |
| 4 | Wed | SS Short | 101.19 | 101.25 | 100.975 | WIN | 1H LQZ |
| 5 | Wed | RWL Long | 100.975 | 100.905 | 101.240 | WIN | 1H LQZ |
| 6 | Wed | BS Short | 101.235 | 101.330 | 100.680 | WIN | 4H BoM |
| 7 | Thu | Ladder Short | (multiple at LQZ) | — | — | Consolidation | 1H LQZ |
| 8 | Fri | Whiplash+RWL | (from Wed+Thu) | — | — | Continuation | 1H LQZ |

**Key LQZ levels**: 100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240
**Key BoM levels**: 100.680 (1H BoM), 101.330 (4H BoM)
**Key MoM levels**: 100.845 (1H MoM)

---

## GAP ANALYSIS: What the Pipeline Produces vs What the User Trades

### GAP 1: ZONE MAP — LQZ Levels Missing

**User's chart shows**:
- 1H LQZ at 100.845 (Monday SS Long entry)
- 1H LQZ at 100.945 (Monday SS Long entry)
- 1H LQZ at 101.14 (Monday BS Short entry)
- 1H LQZ at 101.19 (Wednesday SS Short entry)
- 1H LQZ at 100.975 (Wednesday RWL Long entry)
- 1H LQZ at 101.235 (Wednesday BS Short entry)
- 1H LQZ at 101.240 (Wednesday BS Short entry)
- 1H MoM at 100.845 (Tuesday SS Long entry)
- 1H BoM at 100.680 (Wednesday BS Short TP)
- 4H BoM at 101.330 (Wednesday BS Short SL)

**Pipeline currently produces** (from diagnostic):
- 61 zones for DXY
- But zones are at DIFFERENT levels than the user's LQZ levels
- The pipeline's zones come from 9-pillar confluence clustering + 4H S/D construction
- The user's LQZ levels come from candlestick pattern recognition on 1H charts

**THE GAP**: The pipeline's zone map does NOT contain the user's LQZ levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240). These are LIQUIDITY ZONES between the major BoM zones. They are identified from candlestick patterns (wick clusters, body edges, reaction points) on 1H charts, NOT from 9-pillar data analysis or 4H S/D construction.

**ROOT CAUSE**: The pipeline's zone construction is DATA-DRIVEN (9-pillar + 4H S/D). The user's zones are VISUALLY IDENTIFIED from candlestick patterns. The 9-pillar analysis identifies institutional pressure zones, but the LQZ levels are LIQUIDITY POOLS that don't appear in the 9-pillar data.

### GAP 2: ENTRY PRICES — LQZ Levels Not in Pipeline

**User's entries**: 100.845, 100.945, 101.14, 101.19, 100.975, 101.235
**Pipeline entries**: 100.727, 100.676 (from diagnostic — different levels)

**THE GAP**: The pipeline's entries are at DIFFERENT price levels than the user's entries. The pipeline computes entries from its zone map (which lacks the LQZ levels), so entries are at the wrong prices.

### GAP 3: SL PLACEMENT — Next Zone vs LQZ

**User's SLs**: 100.77, 100.905, 101.200, 101.25, 101.330
**Pipeline SLs**: 100.571, 100.520 (from diagnostic — different levels)

**THE GAP**: The pipeline places SL at the NEXT structural zone + buffer. But the user's SLs are at the NEXT LQZ, not the next pipeline zone. The pipeline's zones don't include the LQZ levels, so SLs are placed at the wrong levels.

### GAP 4: TP PLACEMENT — Opposing LQZ vs Opposing Zone

**User's TPs**: 100.845, 101.115, 101.190, 100.975, 101.240, 100.680
**Pipeline TPs**: 101.103 (from diagnostic — different levels)

**THE GAP**: The pipeline targets the nearest opposing zone. But the user targets the nearest opposing LQZ with liquidity overlap (Earth+Fire). The pipeline's zones don't include the LQZ levels, so TPs are at the wrong levels.

### GAP 5: SETUP COUNT — 8 DXY Trades vs 3 Passed

**User's trades**: 8 DXY setups for the week
**Pipeline passed**: 3 DXY setups

**THE GAP**: The pipeline produces 3 passing DXY setups. The user executed 8. The pipeline is missing 5 setups because the zone map doesn't contain the LQZ levels.

### GAP 6: SHAPE CHAIN — Not Connected to Setups

**User's trades**: SS Long, BS Short, SS Long, SS Short, RWL Long, BS Short, Ladder Short, Whiplash+RWL
**Pipeline setups**: HTF Swing, HTF Swing, HTF Swing (from diagnostic)

**THE GAP**: The pipeline's setups are all HTF Swing category. The user's trades are SS, BS, RWL, Whiplash categories. The pipeline is not generating the correct setup categories for the shape chain.

### GAP 7: GBP/USD + AUD/USD — 0 Raw Setups

**User's trades**: 8 DXY + 8 EUR + 8 GBP = 24 winning setups
**Pipeline**: GBP=0, AUD=0 raw setups

**THE GAP**: The visual-setup-generator produces 0 raw setups for GBP/USD and AUD/USD. The direction fix (zone type) and TP fix (entry side) were applied but these pairs still produce 0.

**ROOT CAUSE**: The visual-setup-generator may not be called for GBP/AUD, or the fallback `constructBasicSetups` path is being used which has SHAPE_MAX_DISTANCE starvation and AUD category gate.

---

## THE FUNDAMENTAL GAP

**The pipeline's zone map is DATA-DRIVEN. The user's zone map is VISUALLY IDENTIFIED.**

The pipeline uses:
1. 9-pillar analysis (pivots, MAs, options, commentary, structural, fib, derivatives, strike→DXY, regime)
2. 4H S/D zone construction (singular origin candle)
3. Confluence clustering

The user uses:
1. Candlestick pattern recognition on 1H charts
2. Wick clusters, body edges, reaction points
3. Liquidity pool identification
4. Visual zone drawing

**The user's LQZ levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) are NOT in the pipeline's zone map.** These are liquidity pools that appear on the chart but not in the 9-pillar data.

**THE FIX**: The pipeline needs to add LQZ detection to its zone map. The LQZ levels are identified from:
1. Tight consolidations (2-5 pip ranges)
2. Wick clusters (multiple wicks at the same level)
3. Body edges (candle bodies that stop at the same level)
4. Reaction points (price reverses from the same level multiple times)

These are VISUAL patterns that require candlestick analysis, not 9-pillar data analysis.

---

## WHAT NEEDS TO CHANGE

### CHANGE 1: Add LQZ Detection to Zone Map

The pipeline needs to add LQZ (Liquidity Zone) detection to its zone construction. LQZ levels are identified from:
- Tight consolidations (2-5 pip ranges) on 1H bars
- Wick clusters (multiple wicks at the same level)
- Body edges (candle bodies that stop at the same level)
- Reaction points (price reverses from the same level)

### CHANGE 2: Fix Setup Categories

The pipeline needs to generate the correct setup categories:
- SS (Swing Scalps) — range trades from zone edge to opposing zone edge
- BS (Breakout Surge) — fade the surge at supply/demand
- RWL (Reverse Whiplash) — continuation after reversal
- Whiplash — trade both whiplash extremes

### CHANGE 3: Fix GBP/USD + AUD/USD

The visual-setup-generator needs to produce setups for GBP/USD and AUD/USD. The direction fix and TP fix were applied but these pairs still produce 0. The root cause is likely:
- The visual-setup-generator is not being called for these pairs
- The fallback `constructBasicSetups` path is being used
- SHAPE_MAX_DISTANCE starvation kills setups

### CHANGE 4: Fix RRR-1 Rejections

The generator's MIN_RRR was fixed to match the firewall's minimums, but the actual setups are still being rejected. The fallback path `constructBasicSetups` uses different constants than `visual-setup-generator`.

---

## THE 37 LAWS vs CURRENT STATE

| Law | Description | Status | Gap |
|-----|-------------|--------|-----|
| 1 | TIMEFRAME TELESCOPING | ✅ | Multi-TF zones working |
| 2 | ZONE WIDTH TF-DEPENDENT | ✅ | TF-scaled params working |
| 3 | MULTI-TF SINGLE ZONE MAP | ✅ | Single map working |
| 4 | ZONE NESTING | ✅ | Merge working |
| 5 | LQZ = ENTRY ZONE | ❌ | LQZ levels missing from map |
| 6 | ENTRY ON CORRECT SIDE | ✅ | Direction fix working |
| 7 | SL AT NEXT ZONE + BUFFER | ⚠️ | SL at next zone, but wrong zones |
| 8 | SL FALLBACK | ⚠️ | Fallback firing, wrong zones |
| 9 | SL ZONE GEOMETRY | ⚠️ | Geometry working, wrong zones |
| 10 | ATR SL MINIMUM | ⚠️ | ATR working, wrong zones |
| 11 | TP AT DEMAND+LIQUIDITY | ❌ | LQZ levels missing |
| 12 | TP TF ≥ ENTRY TF | ✅ | TF matching working |
| 13 | TP SANITY CHECK | ⚠️ | Sanity check working, wrong zones |
| 14 | PRICE CANNOT TELEPORT | ⚠️ | Path mapping working, wrong zones |
| 15 | 3-ENTRY STAGGERED | ⚠️ | Staggered entries working |
| 16 | FORWARD SPREADS | ⚠️ | Spreads working |
| 17 | ENTRY AT ZONE EDGE | ✅ | Edge entries working |
| 18 | CANDLE CONFIRMATION | ⚠️ | Confirmation text working |
| 19 | ZOC DUAL DIRECTION | ⚠️ | ZoC working |
| 20 | DXY CASCADE | ✅ | Cascade working |
| 21 | DIRECTION 70% CORRECT | ⚠️ | Direction working, wrong zones |
| 22 | MFE BEFORE SL | ⚠️ | MFE working, wrong zones |
| 23 | SESSION ENFORCEMENT | ✅ | Session working |
| 24 | NEWS = SHAPE CATALYST | ⚠️ | News working |
| 25 | LONDON SPIKE | ⚠️ | Spike detection working |
| 26 | WAR NARRATIVE | ⚠️ | Narrative working |
| 27 | TRADE CHAINING | ⚠️ | Chaining working |
| 28 | ZONE DEFENSE TRACKING | ⚠️ | Tracking working |
| 29 | PRIOR WEEK CONTEXT | ⚠️ | Context working |
| 30 | SESSION-SPECIFIC BEHAVIOR | ⚠️ | Behavior working |
| 31 | UM ZONES 100% REACTION | ⚠️ | UM working |
| 32 | MULTI-TF CONFLUENCE | ⚠️ | Confluence working |
| 33 | LIQUIDITY QUANTIFICATION | ⚠️ | Quantification working |
| 34 | DEPLETION PER-TF | ⚠️ | Depletion working |
| 35 | RR IS CONSEQUENCE | ⚠️ | RR working |
| 36 | DUPLICATE ELIMINATION | ⚠️ | Dedup working |
| 37 | VISUAL VERIFICATION | ⚠️ | Verification working |

**Summary**: 5 laws are BROKEN (LQZ levels missing, TP at opposing LQZ, setup categories, GBP/AUD 0 setups, RRR rejections). 25 laws are PARTIALLY WORKING (working but with wrong zones). 7 laws are WORKING.

---

## THE FIX PLAN

1. **Add LQZ detection to zone map** — detect tight consolidations, wick clusters, body edges, reaction points on 1H bars
2. **Fix setup categories** — generate SS, BS, RWL, Whiplash categories (not just HTF Swing)
3. **Fix GBP/USD + AUD/USD** — ensure visual-setup-generator is called for these pairs, fix fallback path
4. **Fix RRR-1 rejections** — unify generator and firewall constants
5. **Verify against 8 winning trades** — score each setup against actual price action
