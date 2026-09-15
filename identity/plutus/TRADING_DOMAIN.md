# TRADING DOMAIN — PLUTUS TTE v3.0

## The 37 Fundamental Laws (Abbreviated)

### Category A: Zone Construction (Laws 1-6)
1. TIMEFRAME TELESCOPING: 4H → 1H → 30m → 15m, top-down. Lower TF refines, never overrides.
2. ZONE WIDTH TF-DEPENDENT: 4H=15-40pips, 1H=8-25pips, 30m=5-15pips, 15m=3-10pips.
3. MULTI-TF SINGLE ZONE MAP: All zones from all TFs in one map with timeframe tags.
4. ZONE NESTING: LTF inside HTF = refinement. Overlap = merge with narrower width.
5. LQZ = ENTRY ZONE: First zone from spot to HTF objective. NOT SL anchor.
6. ENTRY ON CORRECT SIDE: SHORT from supply ABOVE spot. LONG from demand BELOW spot.

### Category B: SL Placement (Laws 7-10)
7. SL AT NEXT ZONE + 2-5 PIPS: NOT entry zone opposite edge. Buffer: EUR=2, GBP=3, AUD=3, DXY=5.
8. SL FALLBACK: If no next zone within 100 pips: SL = entry ± max(zoneWidth×2, 1.5×ATR).
9. SL ZONE GEOMETRY: Distance = entry to next zone's inner edge + buffer. NOT fixed pip constant.
10. ATR SL MINIMUM: Never tighter than 0.5 × ATR(14) on entry TF.

### Category C: TP Placement (Laws 11-14)
11. TP AT DEMAND+LIQUIDITY (EARTH+FIRE): Nearest opposing zone with overlap. Use midpoint.
12. TP TF ≥ ENTRY TF: 15m entry → 30m/1H TP. 1H entry → 4H TP.
13. TP SANITY CHECK: > 2×weeklyATR = ambitious. > 3× = reject, find closer LTF zone.
14. PRICE CANNOT TELEPORT: Defends zones sequentially. Must react at intermediate zones.

### Category D: Entry Mechanics (Laws 15-19)
15. 3-ENTRY STAGGERED: Front (edge+spread), Middle (midpoint), Back (far edge+spread). 33/33/34%.
16. FORWARD SPREADS: EUR=1pip, AUD=1.5, GBP=2, DXY=0.02. MANDATORY.
17. ENTRY AT ZONE EDGE (74%) or INSIDE (26%): Never outside the zone.
18. CANDLE CONFIRMATION: Engulfing (18/38), Pin Bar (12/38), Inside Bar (8/38), Breakout (6/38).
19. ZOC DUAL DIRECTION: Zone of Conquest allows both directions (only exception to Law 6).

### Category E: Direction & Cascade (Laws 20-22)
20. DXY CASCADE HARD FILTER: DXY bearish → FX LONG only. DXY bullish → FX SHORT only.
21. DIRECTION 70% CORRECT: Losses from execution (SL, session, TP), not wrong direction.
22. MFE BEFORE SL = RIGHT ZONE, WRONG SL: 2+ R MFE before SL = SL placement failure.

### Category F: Session & Timing (Laws 23-25)
23. SESSION ENFORCEMENT: London 02:00-05:00, NY 08:00-10:00, NY Mid 10:00-14:00 ET.
24. NEWS = SHAPE CATALYST: Red-folder events provide liquidity to push into zones.
25. LONDON SPIKE: 1H bar > 2×ATR = kills tight SLs, provides best entries.

### Category G: War Narrative (Laws 26-30)
26. WAR NARRATIVE: Zones = positions, Shapes = phases, Setups = deployments, TP→Entry = chains.
27. TRADE CHAINING: TP of setup N = entry of setup N+1.
28. ZONE DEFENSE TRACKING: DEFENDED/BROKEN/UNTESTED per zone per session.
29. PRIOR WEEK CONTEXT: Defended zones, broken zones, close position.
30. SESSION-SPECIFIC BEHAVIOR: London = sharp reactions, NY = deep penetrations.

### Category H: Zone Quality (Laws 31-34)
31. UM ZONES 100% REACTION: reactionCount=0 → 100%, 1x→80%, 2x→50%, 3x+→TP only.
32. MULTI-TF CONFLUENCE: Dual-TF +3 bonus, Triple-TF +5 bonus.
33. LIQUIDITY QUANTIFICATION: liquidityScore 0-10. TP zones need ≥5.
34. DEPLETION PER-TF: 15m depleted ≠ 1H depleted. Track per timeframe.

### Category I: Validation (Laws 35-37)
35. RR IS CONSEQUENCE: Determined by zone geometry. Not a target.
36. DUPLICATE ELIMINATION: Dedup key = direction_entry_sl_tp_day.
37. VISUAL VERIFICATION: Data=80%, Vision=20%. Trades on what is VISUALLY TRADEABLE.

## Trading Strategy (From SMC Notes)
1. LIQUIDITY IS EVERYTHING: Market moves to/from liquidity zones. S/D is additional confluence.
2. ZONES ARE DRAWN BY EYES: Candlestick patterns, wick levels, reaction points. NOT statistics.
3. SHAPES SHOW THE PATH: Shape chain tells the sequence through liquidity zones.
4. SPOT IS IRRELEVANT: Everything is zones, candles, shapes. Spot reacts to zones.
5. ENTRY = LQZ + S/D OVERLAP: Best entries have both liquidity AND supply/demand.
6. PRICE CANNOT TELEPORT: Defends zones sequentially. Must react at intermediate zones.
7. EARTH+FIRE = STRONGEST: Earth=structural demand, Fire=liquidity pool. Overlap = best TP.
8. VISION REQUIRED: Data has been IRRELEVANT for 9 months. Everything is visual price action.

## Session Behavior
- London Open (02:00-05:00 ET): Sharp reactions, high liquidity, 22/38 winning entries
- NY Overlap (08:00-10:00 ET): Deep penetrations, 15/38 winning entries
- NY Mid (10:00-14:00 ET): Continuation moves, moderate liquidity

## Pair Characteristics
- DXY: Index, no pip value. Buffer=5 index points. ATR computed on 1H bars.
- EUR/USD: Pip=0.0001. Forward spread=1pip. Buffer=2pips.
- GBP/USD: Pip=0.0001. Forward spread=2pips. Buffer=3pips.
- AUD/USD: Pip=0.0001. Forward spread=1.5pips. Buffer=3pips.

[END TRADING_DOMAIN.md — v3.0]
