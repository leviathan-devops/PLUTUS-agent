# THE USER'S ACTUAL TRADING STRATEGY — FROM SMC NOTES + 38 WINNING TRADES + GOD-VISION CHART

**Sources**: Forex SMC Notes(1).md, Forex SMC Notes(2).md, 38 winning trade images (VLM analysis), user's god-vision DXY chart (annotated), Trident_System_Prompt_v5.3.3, price action backtest

**Purpose**: This is the EXACT strategy the pipeline must reproduce. Not a theoretical strategy — the user's proven, manually-verified trading system.

---

## CORE PRINCIPLE: LIQUIDITY IS EVERYTHING

**The market moves to and from liquidity zones.** Supply/Demand is ADDITIONAL CONFLUENCE, not the primary driver.

From SMC Notes(2).md:
> "Liquidity = where other people's stop losses and pending orders are sitting. Markets move to where liquidity lives because: Big players (smart money) need liquidity to fill their huge orders. They bait retail traders into buying/selling at the wrong time. Then they sweep that liquidity (stop out retail), absorb those orders, and move price in their real direction."

**This means**: The pipeline must identify WHERE the liquidity is (not just where the zones are). Liquidity pools are where orders cluster — wick clusters, consolidation areas, stop-loss traps. These are the LQZ zones. Price touches them, reacts, and moves on.

## THE ELEMENTAL DENSITY SYSTEM (From v5.3.3 Spec)

**Earth = Liquidity** — The foundation of everything. LSZs (Liquidity Sweep Zones) = standard Earth density. IP Zones (Institutional Pressure Zones) = HEAVY Earth density. Earth is what everything anchors to.

**Fire = Supply & Demand** — Both supply AND demand are Fire density. This is where institutional FIREPOWER happens. Fire and Earth are intrinsically linked — a move CANNOT happen without both S/D (Fire) and liquidity (Earth). Like the core of the earth is fire and the sun powers all life — Fire needs Earth to fuel it.

**Water = Macro Shapes** — The macro shapes (BS, WL, R, SS, etc.) are Water density. Water is full of waves, and the shapes ARE the waves that price action materializes into. BS = tidal wave. Whiplash = crashing wave. Consolidation = calm pool. Swing Scalps = ripples.

**Air = Fibonacci** — Fibonacci flows anywhere like air — no intrinsic density. BUT when anchored to Earth density points (candlewick, swing H/L), it becomes a SPIDERWEB — a structured web floating in the air, anchored to trees (Earth).

**The Avatar State**: When ALL FOUR elements converge in the Master Trade Setup = Earth (liquidity anchor) + Fire (S/D overlap) + Water (macro shape) + Air (Fibonacci trajectory). The signal is fractally locked — exists at every scale simultaneously.

## HOW THE USER TRADES (From 38 Winning Trades + God-Vision Chart)

### The Entry Process

1. **Identify the zone**: The trader identifies a LQZ (Liquidity Zone) on the chart. This is a tight consolidation area where price paused and formed a liquidity pool. The LQZ is identified by CANDLESTICK PATTERNS — wick clusters, body edges, reaction points. NOT by statistical consolidation detection.

2. **Wait for price to reach the LQZ**: The trader waits for price to touch the LQZ. This is the entry trigger.

3. **Enter at the LQZ edge with forward spread**: The trader places a limit order at the LQZ edge with a forward spread (1-2 pips toward spot). This ensures the entry triggers even if price barely touches the zone.

4. **Stagger 3 entries**: The trader splits capital into 3 equal parts and places 3 entries:
   - Front edge + forward spread (first to fill)
   - Middle anchor (candle body edge refinement)
   - Back edge + forward spread (last to fill, deepest in zone)

5. **SL at the NEXT zone beyond entry**: The SL is placed 2-5 pips INSIDE the NEXT structural zone beyond the entry zone. NOT at the entry zone's opposite edge. NOT at a fixed pip distance. The SL is anchored to the next zone's structure.

6. **TP at opposing zone with liquidity overlap**: The TP is at the NEAREST opposing zone that has demand + liquidity overlap (Earth + Fire density). NOT at the far edge of a distant zone. The TP zone must have liquidity behind it — "wood to fuel the fire."

### The Shape Chain (Weekly War Timeline)

The trader thinks of the week as a WAR between bullish and bearish liquidity:

| Day | Shape | What Happens | What to Trade |
|-----|-------|-------------|---------------|
| Monday | SS (Swing Scalps) | Price oscillates in a range. Trench warfare. | LONG at range bottom (demand), SHORT at range top (supply) |
| Tuesday | SS (Swing Scalps) | More range trading. | Same as Monday |
| Wednesday | BS (Breakout Surge) | News spike pushes price into a supply zone. Breakout. | SHORT at the supply zone the surge reaches (fade the surge) |
| Thursday | R (Recovery) | Price stabilizes after the breakout. New defensive lines form. | LONG at the demand zone (recovery bounce) |
| Friday | WL (Whiplash) | Counter-attack from the other side. Whiplash. | SHORT at the whiplash top + LONG at the whiplash bottom |

**Key insight**: The shape chain is NOT a fixed sequence. It depends on the ZONE STRUCTURE. If the 4H BoM Supply is at 101.30-101.45 and price is at 101.15, the shape chain predicts:
- Monday-Tuesday: SS (price consolidates in the range between demand below and LQZ above)
- Wednesday: BS (price surges into the LQZ at 101.19-101.24)
- Wednesday-Thursday: WL (price whiplashes from the LQZ reversal)
- Thursday-Friday: R (price recovers from the whiplash)

The TRADE for Wednesday is SHORT at the LQZ (101.19-101.24), NOT LONG at the demand below. The BS shape means price surges INTO the supply zone, then REVERSES. The correct trade is SHORT at the supply, not LONG at the demand.

### The LQZ Levels (From the User's God-Vision Chart)

The user's DXY chart for July 6-10 shows these EXACT LQZ levels (not the 4H zones from the pipeline):

```
101.350-101.450 — 4H BoM Supply (red box, unmitigated)
101.240 — LQZ front edge (user's front entry)
101.215 — LQZ middle anchor (1H candle body edge)
101.191 — LQZ back edge (user's back entry)
101.140 — Monday BS Short entry
101.190 — Tuesday SS Long TP
101.200 — Monday BS Short SL
101.330 — BS Short SL (inside 4H BoM Supply)
100.845 — Monday SS Long entry, Tuesday SS Long entry
100.905 — Monday SS Long SL, Tuesday SS Long SL, Wednesday RWL Long SL
100.945 — Monday SS Long entry
100.975 — Wednesday SS Short TP, Wednesday RWL Long entry
101.115 — Monday SS Long TP
101.240 — Wednesday RWL Long TP
101.250 — Wednesday SS Short SL
100.680 — Wednesday BS Short TP (hits Friday)
100.770 — Tuesday SS Long SL
```

**These are LQZ levels, NOT BoM/MoM zones.** The pipeline's zone map has:
- Supply at 101.137-101.253 (BoM Supply)
- Demand at 100.887-100.987 (BoM Demand)

These are the CORRECT structural zones. But the user's LQZ levels (101.19-101.24, 100.845, 100.945, 100.975) are BETWEEN these zones. They are the liquidity pools that form BETWEEN the major structural zones.

**The pipeline MUST identify these LQZ levels from candlestick patterns, not compute them from OHLC statistics.**

## THE 8 DXY TRADES FOR JULY 6-10 (Corrected)

| # | Day | Shape | Setup | Entry | SL | TP | Result |
|---|-----|-------|-------|-------|----|----|--------|
| 1 | Mon | SS | LONG at LQZ ~100.945 | 100.945 | 100.905 | 101.115 | **WIN** |
| 2 | Mon | BS | SHORT at LQZ ~101.14 | 101.14 | 101.200 | 100.845 | **WIN** |
| 3 | Tue | SS | LONG at LQZ ~100.845 | 100.845 | 100.77 | 101.190 | **WIN** |
| 4 | Wed | SS | SHORT at LQZ ~101.19 | 101.19 | 101.25 | 100.975 | **WIN** (Tokyo fill, London TP) |
| 5 | Wed | RWL | LONG at LQZ ~100.975 | 100.975 | 100.905 | 101.240 | **WIN** |
| 6 | Wed | BS | SHORT at LQZ ~101.235 | 101.235 | 101.330 | 100.680 | **TP hits Friday** |
| 7 | Thu | Ladder | SHORT liquidity ladder at LQZ ~100.94 | multiple | — | — | Consolidation |
| 8 | Fri | WL+RWL | SHORT whiplash + LONG RWL | from Wed+Thu | — | — | Continuation |

**Total**: 8 setups on DXY alone. Plus cascade setups on EUR/USD and GBP/USD (inverse of DXY SHORT = FX LONG). Total across all pairs: 24+ setups.

## THE CRITICAL INSIGHT: THE PIPELINE'S ZONE MAP DOES NOT CONTAIN THESE LQZ LEVELS

The pipeline's zone map has:
- Supply at 101.137-101.253 (BoM Supply from 4H consolidation)
- Demand at 100.887-100.987 (BoM Demand from 4H consolidation)

The user's LQZ levels are at:
- 101.19-101.24 (1H liquidity zone between spot and 4H BoM)
- 100.845 (1H demand during recovery)
- 100.945 (1H demand during recovery)
- 100.975 (1H demand during recovery)

**These LQZ levels are NOT in the pipeline's zone map.** The pipeline's zone construction from OHLC bars produces zones at different price levels than what a human trader draws on the chart. The human sees specific candle wicks, body edges, and reaction points. The algorithm sees statistical consolidations.

**This is why the pipeline produces WRONG setups:**
1. It generates entries at 101.007 (the 4H demand zone edge) instead of 101.240 (the 1H LQZ front edge)
2. It generates SLs at 100.812 (below the 4H demand zone) instead of 101.330 (inside the 4H BoM Supply)
3. It generates TPs at 101.046 (near the 4H demand zone) instead of 100.540 (the 1H UM BoM Demand with liquidity overlap)

**The fix**: Engine 3 must use VISUAL INTELLIGENCE (chart screenshots + VLM) to identify the LQZ levels from candlestick patterns, then map those levels onto the Engine 1 IP zone framework for context.

## THE ELEMENTAL OVERLAP (Earth + Fire Density)

The user's TP zone at 100.61-100.68 is described as "Earth + Fire density":
- **Earth** = structural demand zone (1H UM BoM Demand — the blue box on the chart)
- **Fire** = liquidity pool behind the demand (resting orders, prior reactions — the green liquidity shield)

When Earth + Fire overlap:
- The zone has BOTH structural support (demand) AND liquidity behind it (orders)
- Price WILL react at this zone (guaranteed)
- This is the "wood to fuel the fire" — liquidity to fuel the reaction

The pipeline should identify zones where demand AND liquidity overlap. These are the highest-probability TP targets. If a zone has demand but NO liquidity, it might produce a weak reaction or get pierced.

## THE 3-ENTRY STAGGERED SYSTEM (From Winning Trades)

From the 5 liquidity ladder trades:

| Position | Size | When to Scale | Rationale |
|----------|------|---------------|-----------|
| Primary | 50% of full position | At entry | Largest size at highest-probability zone |
| Rocket 1 | 30% of full position | When R1 triggers | Adding as trend confirms |
| Rocket 2 | 20% of full position | When R2 triggers | Final add, smallest size |

The user actually uses equal thirds (33/33/33) for simpler management, but the principle is the same: scale into the position as price moves in your favor, with the cascade eliminating risk on earlier entries.

**Entry 1 (Front)**: At the front edge of the LQZ + forward spread. This is the FIRST entry to fill (closest to spot). 33% of capital.

**Entry 2 (Middle)**: At the middle of the LQZ (refined to a specific 1H candle body edge). This is the SECOND entry to fill. 33% of capital.

**Entry 3 (Back)**: At the back edge of the LQZ + forward spread. This is the LAST entry to fill (deepest in the zone). 34% of capital.

**The 1.5 pip forward spread on Entry 3 was CRITICAL**: Without it, 2/3 entries would have missed by 0.5 pips. The forward spread ensures entries trigger even if price barely touches the zone.

## THE WAR NARRATIVE (The Mental Model)

The user's mental model is a WAR between bullish and bearish liquidity:

- **Territory** = Price level (area controlled by one side)
- **Front line** = Zone (Supply/Demand) — where two armies meet
- **Trenches** = Liquidity zones (LQZ) — where fighting occurs, orders cluster
- **Skirmishes** = Consolidation (SS) — minor back-and-forth as one side clears trenches
- **Breakthrough** = Breakout Surge (BS) — front line broken, rapid territory conquest
- **Counter-attack** = Whiplash (WL) — defending army strikes back after territory loss
- **Failed counter** = Reverse Whiplash (RWL) — counter-attack lacks force, territory stays lost
- **Stabilization** = Recovery (R) — new defensive line forming after retreat
- **Base camp** = BoM zone — origin of the army's move, strongest defense
- **Forward camp** = MoM zone — mid-move position, weaker than base camp
- **ZoC** = Zone of Conquest — critical defensive position. If it falls, violent conquest follows.

**The shape chain IS the war timeline**: SS (trench warfare) → BS (breakthrough) → WL (counter-attack) → R (stabilization). Each shape transition is a battle that the pipeline should predict and trade.

## WHAT THE PIPELINE MUST DO

1. **Identify LQZ levels from candlestick patterns** — NOT from OHLC statistics. Use chart screenshots + VLM to see wick highs, body edges, reaction points.

2. **Map LQZ levels onto Engine 1 IP zones** — Each LQZ that falls within an Engine 1 IP zone inherits that zone's pressure, ZFP, and structural classification. The LQZ adds the ENTRY PRECISION that Engine 1 lacks.

3. **Use Engine 2 shapes to determine WHEN to enter** — The shape chain tells you WHICH day to expect which shape. SS days = range scalps. BS days = fade at supply. WL days = whiplash entries.

4. **Use ZONE TYPE for direction, NOT shape** — Supply zone = SHORT (sell at supply, expect rejection downward). Demand zone = LONG (buy at demand, expect bounce upward). The shape only determines the CATEGORY of the setup (Swing Scalp, Breakout Surge, HTF Swing, etc.).

5. **SL at NEXT zone + 2-5 pips inside** — The SL goes into the NEXT structural zone beyond the entry zone. NOT at the entry zone's opposite edge. NOT at a fixed pip distance.

6. **TP at opposing zone with liquidity overlap** — The TP goes to the NEAREST opposing zone that has demand + liquidity overlap (Earth + Fire density). NOT at the far edge of a distant zone.

7. **3-entry staggered with forward spreads** — Every setup gets 3 entries: front+spread, middle anchor, back+spread. All 3 share the same SL and TP. Cascade eliminates risk as later entries fill.

8. **Visual verification mandatory** — After data-driven construction, VISUALLY VERIFY: screenshot chart, VLM confirms zones visible and intact, flag mismatches, remove broken zones, add missed zones. Data = 80%, Vision = 20%.

---

**THIS IS THE STRATEGY. THE PIPELINE MUST REPRODUCE IT EXACTLY.**
