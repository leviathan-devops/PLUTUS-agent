# PLUTUS TTE — FUNDAMENTAL TRADING LAWS & ENGINE SPECIFICATION (v4 FINAL)

**Date**: 2026-07-16
**Status**: NUCLEAR HOLOCAUST PROOF — awaiting lock before any code execution
**Sources**: 38 winning trade forensic VLM analysis + July 6-10 price action backtest + user screenshot analysis + 4-wave overhaul code audit

---

# PART 1: THE 37 FUNDAMENTAL LAWS

These laws are ALWAYS TRUE. They were derived from 38 winning trades, backtest evidence, and the user's explicit manual trade analysis. No pipeline version may violate any of these laws.

## CATEGORY A: ZONE CONSTRUCTION LAWS

### LAW 1: TIMEFRAME TELESCOPING — TOP-DOWN
Zone construction processes **4H → 1H → 30m → 15m**, top-down. Each lower TF validates and refines the higher TF. A lower TF can NEVER override a higher TF's strategic direction.

| TF | Role | What It Identifies |
|----|------|-------------------|
| 4H | Strategic | Direction, BoM zones, weekly bias |
| 1H | Tactical | LQZ entry zones, liquidity shields |
| 30m | Operational | Refined entry edges, mid anchors |
| 15m | Execution | Sniper trigger, forward spread calibration |

**Evidence**: All 38 winning trades show multi-TF awareness with HTF direction respected.
**Violation penalty**: Setup rejection.

### LAW 2: ZONE WIDTH PARAMETERS ARE TF-DEPENDENT
Each timeframe has different volatility and zone geometry. Construction parameters MUST scale:

| TF | Min Width | Max Width | Max Bars | Consolidation Range |
|----|-----------|-----------|----------|-------------------|
| 4H | 15 pips | 40 pips | 60 | 15-40 pips |
| 1H | 8 pips | 25 pips | 120 | 8-20 pips |
| 30m | 5 pips | 15 pips | 200 | 5-12 pips |
| 15m | 3 pips | 10 pips | 300 | 3-8 pips |

**Evidence**: 15m zones in winning trades are 3-8 pips wide. 4H lobe's hardcoded 15-pip minimum would reject ALL valid 15m zones.
**Violation penalty**: LTF zone construction produces garbage.

### LAW 3: MULTI-TF ZONE MAP AS SINGLE SOURCE OF TRUTH
ALL zones from ALL timeframes live in ONE zone map. Every zone is tagged with:
- `timeframe`: source TF (4H/1H/30m/15m)
- `type`: BOM_SUPPLY/BOM_DEMAND/MOM_SUPPLY/MOM_DEMAND/LQZ_SUPPLY/LQZ_DEMAND
- `reactionCount`: reactions on THIS TF only
- `zoneName`: includes TF prefix (e.g., "1H Supply", "30m LQZ")

No zone exists outside this map. No overlay-only zones. No hidden LTF zones.

**Evidence**: V1-V2 had LTF zones as "overlays" — they were invisible to TP selection, direction analysis, and path mapping. The 1H LQZ at 101.200 was invisible to the pipeline.

### LAW 4: ZONE NESTING — LTF INSIDE HTF
When a 15m zone's floor/ceiling are entirely within a 4H zone's floor/ceiling:
- The 15m zone is a REFINEMENT of the 4H zone
- Mark 15m zone as `refinedLabel: "15m Refined 4H"`
- The 15m zone inherits the 4H zone's type (BoM/MoM) and direction bias
- Confluence = sum of both (capped at 14)

When zones from different TFs merely overlap (not nested):
- Merge into single zone
- Width = narrower of the two
- Label = "{lowerTF} Refined {higherTF}"

**Evidence**: Winning trades show "15m Refined 30m" zones as the highest-probability entries.

### LAW 5: LQZ = ENTRY ZONE (NOT SL ANCHOR)
Liquidity Zones (LQZ, formerly LSZ) are the FIRST zones price reaches on the path from spot to the HTF objective. They are ENTRY zones.

The LQZ between spot and the 4H BoM Supply is where you ENTER SHORT. You do NOT place your SL at the LQZ. You do NOT skip the LQZ and enter at the 4H BoM.

**Evidence**: User screenshot 11-58-45 — LQZ at 101.200 is the entry, NOT the 4H BoM at 101.350.
**Former name**: LSZ (Liquidity Sweep Zone). Renamed to LQZ (Liquidity Zone) — more accurate.

### LAW 6: ENTRY ZONE MUST BE ON CORRECT SIDE OF SPOT
- SHORT entries only from SUPPLY/LQZ zones ABOVE spot
- LONG entries only from DEMAND/LQZ zones BELOW spot
- No exceptions (except ZoC dual-direction, Law 19)

**Evidence**: Multiple V2 setups had entries on the wrong side of spot — generating SHORT at demand zones below spot.

## CATEGORY B: SL PLACEMENT LAWS

### LAW 7: SL AT NEXT KEY ZONE + 2-5 PIPS INSIDE
SL is placed 2-5 pips INSIDE the NEXT structural zone beyond the entry zone.

- SHORT: scan upward through zone map for nearest SUPPLY zone above entry ceiling. SL = that zone's floor + buffer.
- LONG: scan downward for nearest DEMAND zone below entry floor. SL = that zone's ceiling - buffer.

Buffer by pair: EUR/USD=2, GBP/USD=3, AUD/USD=3, DXY=5 (index points).

**Evidence**: User screenshot — entry at 1H LQZ 101.191-101.240, SL at 101.330 (inside 4H BoM 101.330+). NOT at opposite edge of entry zone.
**38/38 winning trades confirm this pattern.**

### LAW 8: SL FALLBACK WHEN NO NEXT ZONE EXISTS
If no next zone exists within 100 pips of the entry:
- SL = entry ± max(entryZoneWidth × 2, 1.5 × pairATR)
- pairATR = ATR(14) on 1H bars
- Log: "No structural zone beyond entry — using ATR-based SL"

**Evidence**: Some zones in the winning trades were the outermost zones. SL was wider in these cases.

### LAW 9: SL DISTANCE DETERMINED BY ZONE GEOMETRY
SL distance = distance from entry to the next zone's inner edge + buffer. NOT a fixed pip constant. NOT a category-based parameter.

**Evidence**: SL distances in winning trades: 3-6 pips (18%), 8-15 pips (29%), 17-30 pips (37%), 34-55 pips (16%). These map directly to zone widths on different TFs.

### LAW 10: ATR-BASED SL MINIMUM
SL must never be tighter than 0.5 × pairATR(14) on the entry TF. A 3-pip SL when ATR is 15 pips = guaranteed stop-out.

If zone-geometry SL is tighter than 0.5 ATR → widen to 0.5 ATR minimum.

**Evidence**: July 6-10 backtest — setups with 8-pip SLs were stopped out by 15-pip ATR bars.

## CATEGORY C: TP PLACEMENT LAWS

### LAW 11: TP AT DEMAND + LIQUIDITY OVERLAP (EARTH + FIRE)
TP targets the NEAREST opposing zone where STRUCTURAL DEMAND overlaps with LIQUIDITY.

- "Earth" = liquidity pool behind the demand (resting orders, prior reactions)
- "Fire" = structural demand zone (UM BoM Demand)
- Earth + Fire = strong reaction expected → use zone MIDPOINT as TP
- If no liquidity overlap → use zone NEAR EDGE (quick exit)
- NEVER target the FAR edge of a distant zone

**Evidence**: User screenshot 12-19-09 — TP at 1H UM Demand + liquidity overlap at 100.540. Reverse whiplash occurred there the next day.

### LAW 12: TP TIMEFRAME ≥ ENTRY TIMEFRAME
A 15m entry targets 30m or 1H TP. A 1H entry targets 4H TP. Never same-TF targeting.

**Evidence**: 38/38 winning trades confirm TP TF ≥ entry TF.

### LAW 13: TP DISTANCE SANITY CHECK
If TP distance > 2 × weeklyATR → mark as "ambitious." If > 3 × weeklyATR → reject TP, look for closer LTF zone.

**Evidence**: V2 EUR/USD TP at 1.15393 was 117 pips away — week ATR was ~60 pips. TP was unreachable (2× ATR).

### LAW 14: PRICE CANNOT TELEPORT
Price defends zones sequentially. It cannot skip from one HTF zone to another without reacting at intermediate LTF zones.

The nearest 1H demand WILL be defended at least once before price can reach the 4H demand below it. The pipeline must map the FULL PATH and set TP at the FIRST zone price will react at.

**Evidence**: User screenshot 12-19-42 — price defended 1H demand before eventually piercing it the NEXT WEEK.

## CATEGORY D: ENTRY MECHANICS LAWS

### LAW 15: 3-ENTRY STAGGERED SYSTEM
Every setup generates 3 entries:
- **Entry 1 (Front)**: zone edge nearest to spot + forward spread. 33% capital.
- **Entry 2 (Middle)**: zone midpoint or refined 1H candle body anchor. 33% capital.
- **Entry 3 (Back)**: zone edge farthest from spot + forward spread. 34% capital.

All 3 share the same SL and TP. SL cascade: R1 fill → Primary to breakeven. R2 fill → R1 to breakeven.

**Evidence**: User screenshot 12-13-28 — 3 entries at 101.240/101.216/101.191.

### LAW 16: FORWARD SPREADS ARE MANDATORY
Every entry edge gets a forward spread toward spot. Without this, entries miss by fractions of a pip.

| Pair | Forward Spread |
|------|---------------|
| EUR/USD | 1 pip |
| AUD/USD | 1.5 pips |
| GBP/USD | 2 pips |
| DXY | 0.02 index points |

**Evidence**: User explicitly stated Entry 3 only triggered because of 1.5 pip forward spread. Without it, 2/3 entries would have missed by 0.5 pips.

### LAW 17: ENTRY AT ZONE EDGE (74%) OR INSIDE (26%)
Most entries are at the zone edge (ceiling for LONG, floor for SHORT). Some are inside the zone body (scalps, consolidation entries). Never outside the zone.

### LAW 18: CANDLE CONFIRMATION REQUIRED
Entries require candle confirmation at the zone touch:
- Bullish/Bearish Engulfing (18/38 winning trades)
- Pin Bar / Hammer (12/38)
- Inside Bar (8/38)
- Breakout Candle (6/38)

Setup note: "CONFIRMATION REQUIRED: Wait for [pattern] at entry zone during assigned session. Do NOT enter without candle confirmation."

### LAW 19: ZOC — ZONE OF CONQUEST (DUAL DIRECTION EXCEPTION)
When price is at a ZoC (high-confluence zone with 3+ TF overlap + LQZ shield + BoM status), the pipeline generates DUAL setups (both directions). The ZoC reaction determines the next phase of the war.

ZoC is the ONLY exception to Laws 6 and 1 (directional lock). All other zones respect the 4H strategic direction.

## CATEGORY E: DIRECTION & CASCADE LAWS

### LAW 20: DXY CASCADE IS A HARD FILTER
If DXY is bearish (supply zones above spot, BS/WL/RWL shape):
- EUR/USD, GBP/USD, AUD/USD can ONLY generate LONG setups
- SHORT FX setups are REJECTED (not penalized — rejected)

If DXY is bullish (demand zones below spot, BS bullish shape):
- FX pairs can ONLY generate SHORT setups

If DXY is neutral (SS shape, range-bound):
- Both directions allowed for FX pairs

**Evidence**: V2 generated mixed DXY directions and mixed FX — cascade was not enforced. Winning trades show consistent DXY→FX inverse correlation.

### LAW 21: DIRECTION ANALYSIS IS 70% CORRECT — EXECUTION IS THE PROBLEM
The pipeline's zone analysis and shape prediction correctly identify direction 70% of the time. Losses are from execution: SL placement, session timing, TP targeting. NOT from wrong direction.

**Evidence**: V1 backtest — 7/10 setups had direction correct but hit SL. V2 — 11/18 had direction correct.

### LAW 22: MFE BEFORE SL = RIGHT ZONE, WRONG SL
When a setup has MFE of 2+ R before hitting SL, the entry zone was CORRECT but the SL was placed at the wrong structural level. This is an SL placement failure, not an analytical failure.

**Evidence**: V2 setups #1-4 had +3.0-3.2R MFE before SL hit.

## CATEGORY F: SESSION & TIMING LAWS

### LAW 23: SESSION ENFORCEMENT IS FUNCTIONAL
Entries only count during the assigned session window:
- London Open: 02:00-05:00 ET
- NY Overlap: 08:00-10:00 ET
- NY Mid: 10:00-14:00 ET

If price touches entry OUTSIDE the window → "DO NOT ENTER." The setup is still valid for the NEXT session window on the same day.

**Evidence**: July 6-10 backtest — 0/10 setups filled during assigned session. All filled during Asian low-liquidity hours.

### LAW 24: NEWS EVENTS ARE SHAPE CATALYSTS
Red-folder events (CPI, PPI, NFP) provide the LIQUIDITY to push price into zones. The news spike IS the shape transition.

When CPI is on a BS day:
1. News spike pushes price toward the nearest UM zone in the BS direction
2. The UM zone causes the reversal (BS → WL or BS → RWL)
3. The pipeline should ENTER at the UM zone, riding the post-news reversal

Do NOT just widen SL on news days. PREDICT the spike direction and use it as an entry catalyst.

**Evidence**: July 6-10 — Wednesday CPI spike pushed DXY into the 30m UM supply at 101.275. Perfect SHORT entry. Pipeline missed it.

### LAW 25: LONDON SPIKE / VOLATILITY EVENTS
A "London Spike" is a single 1H bar with range > 2 × pairATR. These events:
- Kill tight SLs (if SL < 1 ATR)
- Provide the best entry opportunities (price reaches distant zones)
- Are caused by session-open liquidity gaps + news positioning

Pipeline must detect these bars and: (a) not place SLs tighter than the spike range, (b) identify the zone the spike reached as a potential entry.

## CATEGORY G: WAR NARRATIVE LAWS

### LAW 26: THE WAR NARRATIVE IS THE CONNECTING TISSUE
Every pair has a weekly war story:
- Zones = military positions (front lines)
- Shapes = campaign phases (trench warfare → breakthrough → counterattack → recovery)
- Setups = troop deployments (where to position for each battle)
- TP → Entry chains = sequential battle outcomes

The pipeline must generate a human-readable WAR NARRATIVE that connects shapes to zones to setups in a sequential story.

### LAW 27: TRADE CHAINING — TP OF ONE = ENTRY OF NEXT
The TP zone of setup N is the ENTRY zone of setup N+1. When a SHORT targets 1H demand at 100.540:
- Price will react at 100.540 (at least once)
- The reaction IS the RWL (reverse whiplash) from that zone
- The pipeline should generate a LONG setup at 100.540 for the RWL

Shape chain determines chain links:
- BS → R: TP of BS becomes R entry zone
- BS → WL: TP of BS becomes WL entry zone
- WL → RWL: TP of WL becomes RWL entry zone

### LAW 28: ZONE DEFENSE TRACKING
For each zone, track:
- `lastTestedSession`: which session last touched it
- `lastReactionPips`: how many pips price moved on last touch
- `defenseStatus`: DEFENDED (price bounced) | BROKEN (price sliced through) | UNTESTED

A DEFENDED zone has higher reaction probability. A BROKEN zone becomes opposite-type on retest (broken support = new resistance).

### LAW 29: PRIOR WEEK CONTEXT
The pipeline must consider:
- Which zones were defended last week (depleted this week?)
- Which zones were broken (role reversal: support→resistance)
- Where price closed relative to key zones (closing inside a zone = starting battlefield)

### LAW 30: SESSION-SPECIFIC ZONE BEHAVIOR
London Open produces sharper reactions (22/38 winning entries). NY produces deeper penetrations (15/38). Track which session each zone was last tested in. Predict which session will produce the reaction.

## CATEGORY H: ZONE QUALITY LAWS

### LAW 31: UM ZONES HAVE 100% REACTION RATE
Unmitigated (reactionCount=0) zones react 100% of the time. Mitigation decreases reliability:
- 0x (UM): 100% reaction
- 1x: ~80%
- 2x: ~50%
- 3x+: TP target only (depleted)

UM zones are prioritized for entries. 3x+ zones are excluded from entries.

### LAW 32: MULTI-TF CONFLUENCE = STRONGER ZONE
When a zone exists on 2+ TFs simultaneously:
- Dual-TF ("30m Refined 1H"): +3 confluence bonus, higher reaction probability
- Triple-TF ("15m Refined 30m Refined 1H"): +5 confluence bonus

Refined zones are preferred for entry selection over single-TF zones.

### LAW 33: LIQUIDITY QUANTIFICATION ("WOOD FOR THE FIRE")
Every zone has a `liquidityScore: 0-10` estimating the resting orders behind it:
- Prior reaction strength (pips moved on last touch): stronger = more liquidity
- Options notional near the zone (if available)
- Number of prior reactions (more reactions = more stop orders clustered)
- Session of last test (London tests leave more liquidity residue)

TP zones must have liquidityScore ≥ 5. Low-liquidity zones produce weak reactions.

### LAW 34: ZONE DEPLETION IS PER-TIMEFRAME
A zone depleted on 15m (3+ reactions on 15m bars) might still be UM on 1H. Track reactionCount PER TF. A 1H zone with 0 reactions is UM regardless of 15m activity.

## CATEGORY I: VALIDATION LAWS

### LAW 35: RR IS A CONSEQUENCE, NOT A TARGET
RR is determined by zone geometry (entry-to-TP distance / entry-to-SL distance). Do not reject setups based on minimum RR. Let the zone structure determine RR.

Minimum RR: 1.0 for conditional, 1.2 for primary. If zone structure provides 1:1, that's what the market offers.

### LAW 36: DUPLICATE ELIMINATION
Dedup key = `direction_entry_sl_tp_day`. When two categories produce identical entry+SL+TP+day, keep only the higher confidence one. The 3 staggered entries (different entry prices) are NOT duplicates.

### LAW 37: VISUAL VERIFICATION — DATA = 80%, VISION = 20%
Data-driven zone construction is 80% of the work. The remaining 20% requires VISUAL VERIFICATION:
1. Screenshot each pair's TradingView chart
2. VLM confirms: zone visible? price reacted before? zone intact or broken?
3. Flag mismatches — if VLM says zone is broken, REMOVE from zone map
4. If VLM identifies a visible zone the data MISSED → ADD it

Trades are executed on what is VISUALLY TRADEABLE, not what is mathematically calculated.

---

# PART 2: ARCHITECTURAL SPECIFICATION

## Pipeline Data Flow (Telescope Down)

```
4H OHLC → construct4HZones(TF='4H', params=4H_SCALE)
    ↓ 4 strategic zones per pair
1H OHLC → construct4HZones(TF='1H', params=1H_SCALE)
    ↓ 1H tactical zones added
30m OHLC → construct4HZones(TF='30m', params=30M_SCALE)
    ↓ 30m operational zones added
15m OHLC → construct4HZones(TF='15H', params=15M_SCALE)
    ↓ 15m execution zones added
    ↓
MERGE + REFINE (detect overlaps, nesting, multi-TF confluence)
    ↓
COMPUTE ATR(14) on 1H → pairATR
    ↓
MULTI-TF ZONE MAP (single source of truth)
    ↓
ASSESS PRIOR WEEK (zone defense tracking, momentum, close position)
    ↓
MAP WAR NARRATIVE (shape chain → zone path → setup sequence)
    ↓
PATH-BASED SETUP GENERATION:
    spot → nearest entry LQZ → next zone (SL) → nearest demand+liq (TP)
    ↓
3-ENTRY STAGGERED (front+spread, mid, back+spread)
    ↓
DXY CASCADE ENFORCEMENT (hard filter on FX directions)
    ↓
DUPLICATE ELIMINATION (entry+SL+TP+day key)
    ↓
TRADE CHAINING (TP→Entry links across days)
    ↓
ATR/SL VALIDATION (0.5 ATR minimum, TP reachability check)
    ↓
MAX 3 SETUPS PER DAY PER PAIR
    ↓
VISUAL VERIFICATION (screenshot → VLM → flag mismatches)
    ↓
FINAL SETUPS + WAR NARRATIVE REPORT
```

## TF-Scaled Construction Parameters

```typescript
const TF_CONSTRUCTION_PARAMS: Record<string, {
  minWidth: number; maxWidth: number; maxBars: number; consolidationMin: number;
}> = {
  '4H':  { minWidth: 15, maxWidth: 40, maxBars: 60,  consolidationMin: 15 },
  '1H':  { minWidth: 8,  maxWidth: 25, maxBars: 120, consolidationMin: 8 },
  '30m': { minWidth: 5,  maxWidth: 15, maxBars: 200, consolidationMin: 5 },
  '15m': { minWidth: 3,  maxWidth: 10, maxBars: 300, consolidationMin: 3 },
};
```

## ATR Computation

```typescript
private computeATR(bars: OHLCBar[], period: number = 14): number {
  if (bars.length < period + 1) return 50 * 0.0001; // fallback: 50 pips
  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i]!.high;
    const low = bars[i]!.low;
    const prevClose = bars[i - 1]!.close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trueRanges.push(tr);
  }
  const recent = trueRanges.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}
```

Stored per pair as `pairATRMap: Map<string, number>`.

## Path-Based Setup Generation

```typescript
private generatePathBasedSetups(
  pair: string,
  zones: DXYZone[],
  spot: number,
  pairATR: number,
): TradeSetup[] {
  // Sort supply above and demand below
  const supplyAbove = zones
    .filter(z => isSupplyType(z) && z.floor > spot)
    .sort((a, b) => a.floor - b.floor);  // nearest first

  const demandBelow = zones
    .filter(z => isDemandType(z) && z.ceiling < spot)
    .sort((a, b) => b.ceiling - a.ceiling);  // nearest first

  const setups: TradeSetup[] = [];

  // SHORT setup: enter at nearest supply above, SL at next supply, TP at nearest demand+liq below
  if (supplyAbove.length > 0) {
    const entryZone = supplyAbove[0]!;
    const slZone = supplyAbove[1];  // next supply above entry
    const tpZone = this.findNearestDemandWithLiquidity(demandBelow, entryZone);

    // 3-entry staggered with forward spread
    const setup = this.buildStaggeredSetup(pair, entryZone, slZone, tpZone,
      TradeDirection.SHORT, spot, pairATR);
    if (setup) setups.push(setup);
  }

  // LONG setup: enter at nearest demand below, SL at next demand, TP at nearest supply+liq above
  if (demandBelow.length > 0) {
    const entryZone = demandBelow[0]!;
    const slZone = demandBelow[1];
    const tpZone = this.findNearestSupplyWithLiquidity(supplyAbove, entryZone);

    const setup = this.buildStaggeredSetup(pair, entryZone, slZone, tpZone,
      TradeDirection.LONG, spot, pairATR);
    if (setup) setups.push(setup);
  }

  return setups;
}
```

## 3-Entry Staggered Builder

```typescript
private buildStaggeredSetup(
  pair: string,
  entryZone: DXYZone,
  slZone: DXYZone | undefined,
  tpZone: DXYZone | undefined,
  direction: TradeDirection,
  spot: number,
  pairATR: number,
): TradeSetup | null {
  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const FORWARD_SPREAD: Record<string, number> = {
    'EUR/USD': 1, 'AUD/USD': 1.5, 'GBP/USD': 2, 'DXY': 0.02,
  };
  const spreadRaw = FORWARD_SPREAD[pair] ?? 1.5;
  const spread = pair === 'DXY' ? spreadRaw : spreadRaw * pipValue;

  // 3 entries with forward spread toward spot
  let entry1: number, entry2: number, entry3: number;
  if (direction === TradeDirection.SHORT) {
    entry1 = entryZone.floor - spread;     // front (toward spot = lower)
    entry2 = (entryZone.floor + entryZone.ceiling) / 2;  // middle
    entry3 = entryZone.ceiling - spread;   // back (toward spot = lower)
  } else {
    entry1 = entryZone.ceiling + spread;   // front (toward spot = higher)
    entry2 = (entryZone.floor + entryZone.ceiling) / 2;
    entry3 = entryZone.floor + spread;     // back (toward spot = higher)
  }

  // SL at next zone + buffer
  const sl = this.getZoneGeometrySL(entryZone, slZone, direction, pair, pairATR);

  // TP at nearest demand+liq overlap
  if (!tpZone) return null;
  const hasLiquidity = (tpZone.liquidityScore ?? 0) >= 5;
  const tp = hasLiquidity
    ? (tpZone.floor + tpZone.ceiling) / 2  // midpoint (strong reaction)
    : direction === TradeDirection.LONG
      ? tpZone.floor    // near edge
      : tpZone.ceiling;

  // Validate: TP reachable (within 2× ATR)
  const tpDist = Math.abs(tp - entry1);
  if (tpDist > 2 * pairATR * 100 * pipValue) {
    // Too far — try to find closer TP or mark ambitious
  }

  // Build setup with all 3 entries
  return {
    entry1: Math.round(entry1 * 1e6) / 1e6,
    entry2: Math.round(entry2 * 1e6) / 1e6,
    entry3: Math.round(entry3 * 1e6) / 1e6,
    entryWeights: [0.33, 0.33, 0.34],
    sl,
    tp: Math.round(tp * 1e6) / 1e6,
    // ... other fields
  } as TradeSetup;
}
```

---

# PART 3: KNOWLEDGE GRAPH RULES (AWAITING APPROVAL)

**No automatic sync. No raw data. Only permanent laws.**

Each rule below is proposed for the knowledge graph. NOTHING is written until explicitly approved.

## Proposed KG Entry 1: The 37 Fundamental Laws
**Content**: All 37 laws above, stored as a single canonical reference document.
**Key**: `plutus:fundamental-laws:v4`
**Status**: AWAITING APPROVAL

## Proposed KG Entry 2: SL Placement Rule
**Key**: `plutus:rule:sl-placement`
**Content**: "SL goes 2-5 pips INSIDE the NEXT structural zone beyond entry. Buffer: EUR=2, GBP=3, AUD=3, DXY=5. Fallback: entry±max(zoneWidth×2, 1.5×ATR) when no next zone. Minimum: 0.5×ATR."
**Evidence**: 38/38 winning trades, user screenshot.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 3: TP Placement Rule
**Key**: `plutus:rule:tp-placement`
**Content**: "TP at nearest opposing zone with demand+liquidity overlap (Earth+Fire). If overlap: use midpoint. If not: use near edge. Max distance: 2×weeklyATR. TP TF must be ≥ entry TF."
**Evidence**: User screenshot 12-19-09, reverse whiplash at TP zone.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 4: Forward Spread Rule
**Key**: `plutus:rule:forward-spread`
**Content**: "Every entry edge gets forward spread toward spot. EUR=1pip, AUD=1.5pips, GBP=2pips, DXY=0.02pts. Without spread, entries miss by 0.5 pips."
**Evidence**: User screenshot 12-13-28.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 5: 3-Entry Staggered Rule
**Key**: `plutus:rule:staggered-entries`
**Content**: "3 entries per setup: Front+spread (33%), Middle (33%), Back+spread (34%). Shared SL+TP. Cascade: R1 fill→Primary BE, R2 fill→R1 BE."
**Evidence**: 5/5 ladder winning trades.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 6: LQZ = Entry Zone
**Key**: `plutus:rule:lqz-entry`
**Content**: "LQZ (Liquidity Zone, formerly LSZ) = first zone on path from spot to HTF objective. It is the ENTRY zone, not the SL anchor. Formerly called LSZ — renamed for accuracy."
**Evidence**: User screenshot 11-58-45.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 7: Price Cannot Teleport
**Key**: `plutus:rule:no-teleport`
**Content**: "Price defends zones sequentially. Cannot skip HTF zones without reacting at intermediate LTF zones. Nearest 1H demand WILL be defended at least once before 4H demand is reached. Map full path."
**Evidence**: User screenshot 12-19-42.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 8: Timeframe Telescoping
**Key**: `plutus:rule:tf-telescoping`
**Content**: "Zone construction: 4H→1H→30m→15m, top-down. Lower TF validates higher TF, never overrides direction. Each TF has scaled construction parameters (width, bars, consolidation). 4H=15-40pip, 1H=8-25pip, 30m=5-15pip, 15m=3-10pip."
**Evidence**: All 38 winning trades.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 9: DXY Cascade Hard Filter
**Key**: `plutus:rule:dxy-cascade`
**Content**: "DXY bearish → FX LONG only. DXY bullish → FX SHORT only. DXY neutral → both allowed. Exception: ZoC dual-direction. Cascade is a HARD FILTER, not a confidence modifier."
**Evidence**: V2 mixed-direction error.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 10: Session Enforcement
**Key**: `plutus:rule:session-enforcement`
**Content**: "Entries only count during assigned session window. London=02:00-05:00ET, NY Overlap=08:00-10:00ET, NY Mid=10:00-14:00ET. Fill outside window = NO TRADE. Setup remains valid for next session."
**Evidence**: July 6-10 backtest, 0/10 filled in session.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 11: Candle Confirmation
**Key**: `plutus:rule:candle-confirmation`
**Content**: "Entries require candle confirmation at zone touch: engulfing (18/38), pin bar (12/38), inside bar (8/38), breakout candle (6/38). Without confirmation, win rate drops significantly."
**Evidence**: 38 winning trades candle pattern analysis.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 12: News as Shape Catalyst
**Key**: `plutus:rule:news-catalyst`
**Content**: "Red-folder events provide liquidity to push price into UM zones. The news spike IS the shape transition. Don't widen SL — PREDICT spike direction, enter at the UM zone the spike reaches, ride the reversal."
**Evidence**: July 6-10 Wednesday CPI spike into 30m UM supply at 101.275.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 13: UM Zone Priority
**Key**: `plutus:rule:um-priority`
**Content**: "Unmitigated (reactionCount=0) zones react 100%. 1x mitigated ~80%. 2x ~50%. 3x+ = TP target only. UM zones prioritized for entries. Freshness bonus: UM +10, 1x +5, 2x +0, 3x+ -5."
**Evidence**: 38 winning trades freshness analysis.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 14: War Narrative
**Key**: `plutus:rule:war-narrative`
**Content**: "Zones = battlefronts. Shapes = campaign phases. Setups = troop deployments. TP→Entry chains = sequential battle outcomes. Pipeline must generate readable war narrative connecting all three. Price cannot teleport — must defend zones in sequence."
**Evidence**: User's core mental model throughout all analysis.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 15: Visual Verification
**Key**: `plutus:rule:visual-verification`
**Content**: "Data = 80% of work. Vision = 20%. After data-driven construction, VISUALLY VERIFY: screenshot chart, VLM confirms zones visible and intact. Flag mismatches. Remove broken zones. Add missed zones. Trades execute on VISUAL tradeability, not mathematical calculation alone."
**Evidence**: User's explicit architectural requirement.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 16: Zone Construction Parameters
**Key**: `plutus:rule:tf-zone-params`
**Content**: "Zone width params scale by TF: 4H=15-40pip/60bars, 1H=8-25/120, 30m=5-15/200, 15m=3-10/300. Hardcoded 4H params produce garbage on LTF bars."
**Evidence**: Code audit of 4h-sd-lobe.ts hardcoded constants.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 17: ATR Requirement
**Key**: `plutus:rule:atr-requirement`
**Content**: "Pipeline must compute ATR(14) on 1H bars per pair. Used for: SL minimum (0.5×ATR), TP reachability (≤2×weeklyATR), forward spread sizing (higher ATR= wider spread), news day adjustment (1.5×ATR SL on red-folder days)."
**Evidence**: V2 SL failures on 15-pip ATR bars with 8-pip SLs.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 18: Liquidity Quantification
**Key**: `plutus:rule:liquidity-score`
**Content**: "Every zone has liquidityScore 0-10. Estimated from: prior reaction strength, options notional, reaction count, session of last test. TP zones require liquidityScore≥5 ('wood for the fire'). Without liquidity, even UM zones produce weak reactions."
**Evidence**: User's 'Earth+Fire density' concept from screenshot 12-19-09.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 19: Trade Chaining
**Key**: `plutus:rule:trade-chaining`
**Content**: "TP of setup N = entry zone of setup N+1. Shape chain determines links: BS→R (TP becomes R entry), BS→WL (TP becomes WL entry), WL→RWL (TP becomes RWL entry). Pipeline must link and annotate chains."
**Evidence**: User screenshot 12-19-09 — 'short BS flows into long RWL at TP zone.'
**Status**: AWAITING APPROVAL

## Proposed KG Entry 20: Duplicate Elimination
**Key**: `plutus:rule:dedup`
**Content**: "Dedup key = direction+entry+SL+TP+day. Same trade at different category labels = duplicate (keep higher confidence). 3 staggered entries (different prices) = NOT duplicates."
**Evidence**: V2 generated HTF_SWING + BREAKOUT_SURGE dupes at same entry/SL/TP.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 21: Max 3 Setups Per Day Per Pair
**Key**: `plutus:rule:daily-cap`
**Content**: "Maximum 3 setups per day per pair, sorted by confidence. Eliminates setup dilution. Winning trades average 1-3 per pair per WEEK."
**Evidence**: 38 winning trades frequency analysis.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 22: Entry Zone Correct Side
**Key**: `plutus:rule:entry-side`
**Content**: "SHORT entries only from supply/LQZ zones ABOVE spot. LONG entries only from demand/LQZ zones BELOW spot. No exceptions except ZoC."
**Evidence**: V2 had entries on wrong side of spot.
**Status**: AWAITING APPROVAL

## Proposed KG Entry 23: SL Fallback
**Key**: `plutus:rule:sl-fallback`
**Content**: "When no next zone exists within 100 pips for SL anchoring: SL = entry ± max(entryZoneWidth×2, 1.5×pairATR). Never leave SL undefined."
**Status**: AWAITING APPROVAL

## Proposed KG Entry 24: TP Distance Sanity
**Key**: `plutus:rule:tp-sanity`
**Content**: "If TP distance > 2×weeklyATR → mark 'ambitious'. If > 3×weeklyATR → reject TP, search for closer LTF zone. Price cannot teleport to unreachable TP."
**Status**: AWAITING APPROVAL

## Proposed KG Entry 25: Backtest Session-Aware
**Key**: `plutus:rule:backtest-session`
**Content**: "Backtest scoring must filter fills to assigned session window only. Fills outside window = NO_TRADE (not loss). This reflects real-world execution constraints."
**Status**: AWAITING APPROVAL

---

# PART 4: IMPLEMENTATION PHASES

| Phase | Laws Addressed | Changes | Est. Lines |
|-------|---------------|---------|-----------|
| **1: Foundation** | 1-6 | Multi-TF zone construction with TF-scaled params, LQZ rename, zone nesting | ~200 |
| **2: Setup Engine** | 7-14, 20-22 | Path-based generation, SL at next zone, TP at demand+liq, ATR computation, DXY cascade hard filter | ~250 |
| **3: Entry System** | 15-19 | 3-entry staggered with forward spreads, candle confirmation notes, ZoC dual-direction | ~150 |
| **4: Intelligence** | 23-34 | Session enforcement, news catalyst, trade chaining, zone freshness, liquidity score, war narrative, prior week tracking | ~200 |
| **5: Validation** | 35-37 | RR relaxation, dedup fix, max 3/day, visual verification step | ~120 |
| **6: Knowledge Graph** | All 25 rules | Curated rule injection (manual, approved) | ~100 |
| **7: Test** | All | Fix date (July 6), E2E pipeline, session-aware backtest, checkpoint | — |

**Total: ~1020 lines across 7 phases. Nothing executes until spec is locked and KG rules approved.**
