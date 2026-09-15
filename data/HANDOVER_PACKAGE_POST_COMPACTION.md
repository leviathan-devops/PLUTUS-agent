# PLUTUS AGENT — POST-COMPACTION CONSCIOUSNESS HANDOVER

**Created**: 2026-07-17 16:30 UTC+4
**Purpose**: Full stream-of-consciousness preservation. Read this FIRST after compaction to instantly regain all context.
**Status**: Engine 1 + Engine 2 compliance fixes DONE. Engine 3 visual intelligence BUILT but NOT YET TESTED in container. Context limit approaching.

---

# PART 1: THE CORE MISSION (What We're Actually Building)

The PLUTUS TTE (Trident Trading Engine) is a **3-engine autonomous trading agent** that generates A+ weekly trading reports. It must predict price action across 4 pairs (DXY, EUR/USD, GBP/USD, AUD/USD) with surgical precision — entries at 0-50 pips from spot, SL at 5-15 pips, TP at opposing zones.

**The user's manual trading strategy is the GOLD STANDARD.** The pipeline must reproduce it exactly. The user has shown me the exact trades via screenshots and explained every rule. The pipeline is NOT inventing a strategy — it is codifying the user's existing, proven strategy.

**Architecture: 1D → 2D → 3D**

```
Engine 1 (1D): IP Pressure Zones from DATA (9-pillar, ZFP, OTC options, pressure degrees)
    → WHERE is the institutional liquidity? (battlefield map)
    → MUST be data-driven. MUST NOT be visual.
    → Status: FIXED (6 deviations corrected). DO NOT TOUCH.

Engine 2 (2D): Macro Shape Chain from Engine 1 + 1H bars
    → WHAT path will price take? (war timeline: SS→BS→WL→RWL)
    → MUST be data-driven. MUST NOT be visual.
    → Status: FIXED (10 deviations corrected). DO NOT TOUCH.

Engine 3 (3D): Visual Trade Setup Intelligence on TOP of Engine 1 + Engine 2
    → WHERE EXACTLY do we enter/exit? (sniper entries, SL, TP)
    → MUST use VISUAL intelligence (chart screenshots + VLM candlestick analysis)
    → SUPERIMPOSES on Engine 1 + 2. Does NOT replace them.
    → Status: BUILT (TvChartController + VisualZoneLobe + VisualSetupGenerator). NOT YET TESTED.
```

**CRITICAL RULE**: Engine 1 zones and Engine 3 zones are MUTUALLY EXCLUSIVE. Engine 1 = institutional pressure (macro liquidity map). Engine 3 = S/D/L zones (visual candlestick patterns for trade execution). They are NOT the same. Engine 3's S/D/L zones are identified VISUALLY from chart screenshots, NOT computed from OHLC data.

---

# PART 2: THE 37 FUNDAMENTAL LAWS (Non-Negotiable Trading Rules)

These laws were derived from 38 winning trade images analyzed via VLM + user's manual trade analysis + backtest evidence. EVERY setup must comply with ALL of them.

## Category A: Zone Construction (Laws 1-6)

**Law 1: TIMEFRAME TELESCOPING — TOP-DOWN**
Zone construction processes **4H → 1H → 30m → 15m**, top-down. Each lower TF validates and refines the higher TF. A lower TF can NEVER override a higher TF's strategic direction.

| TF | Role | What It Identifies |
|----|------|-------------------|
| 4H | Strategic | Direction, BoM zones, weekly bias |
| 1H | Tactical | LQZ entry zones, liquidity shields |
| 30m | Operational | Refined entry edges, mid anchors |
| 15m | Execution | Sniper trigger, forward spread calibration |

**Law 2: ZONE WIDTH PARAMETERS ARE TF-DEPENDENT**
- 4H: 15-40 pips min/max, 60 max bars, consolidation 15-40 pips
- 1H: 8-25 pips, 120 bars, consolidation 8-20 pips
- 30m: 5-15 pips, 200 bars, consolidation 5-12 pips
- 15m: 3-10 pips, 300 bars, consolidation 3-8 pips

The existing `construct4HZones` hardcodes 4H-specific params (MIN_ZONE_WIDTH_PIPS=15) that will produce garbage on LTF bars. This MUST be TF-scaled.

**Law 3: MULTI-TF ZONE MAP AS SINGLE SOURCE OF TRUTH**
ALL zones from ALL timeframes live in ONE zone map. Every zone tagged with: `timeframe`, `type` (BOM/MOM/LQZ), `reactionCount`, `zoneName`. No overlay-only zones. No hidden LTF zones.

**Law 4: ZONE NESTING**
When a 15m zone's floor/ceiling are entirely within a 4H zone → the 15m zone is a REFINEMENT of the 4H zone. Label: "15m Refined 4H". When zones merely overlap → merge into single zone with narrower width + combined confluence.

**Law 5: LQZ = ENTRY ZONE (NOT SL ANCHOR)**
Liquidity Zones (LQZ, formerly LSZ) are the FIRST zones price reaches on the path from spot to the HTF objective. They are ENTRY zones. The LQZ between spot and the 4H BoM Supply is where you ENTER, not where you place your stop.

**Law 6: ENTRY ZONE MUST BE ON CORRECT SIDE OF SPOT**
- SHORT entries only from supply/LQZ zones ABOVE spot
- LONG entries only from demand/LQZ zones BELOW spot
- No exceptions (except ZoC dual-direction)

## Category B: SL Placement (Laws 7-10)

**Law 7: SL AT NEXT KEY ZONE + 2-5 PIPS INSIDE**
SL is placed 2-5 pips INSIDE the NEXT structural zone beyond the entry zone.
- SHORT: scan upward for nearest supply zone above entry ceiling, SL = that zone's floor + buffer
- LONG: scan downward for nearest demand zone below entry floor, SL = that zone's ceiling - buffer
- Buffer: EUR/USD=2, GBP/USD=3, AUD/USD=3, DXY=5 (index points)

**Evidence**: User screenshot — entry at 1H LQZ 101.191-101.240, SL at 101.330 (inside 4H BoM 101.330+). NOT at opposite edge of entry zone.

**Law 8: SL FALLBACK WHEN NO NEXT ZONE**
If no next zone within 100 pips of the entry: SL = entry ± max(entryZoneWidth × 2, 1.5 × pairATR). pairATR = ATR(14) on 1H bars.

**Law 9: SL DISTANCE DETERMINED BY ZONE GEOMETRY**
SL distance = distance from entry to next zone's inner edge + buffer. NOT a fixed pip constant. NOT category-based.

**Evidence**: SL distances in winning trades: 3-6 pips (18%), 8-15 pips (29%), 17-30 pips (37%), 34-55 pips (16%). These map directly to zone widths on different TFs.

**Law 10: ATR-BASED SL MINIMUM**
SL must never be tighter than 0.5 × pairATR(14) on entry TF. A 3-pip SL when ATR is 15 pips = guaranteed stop-out.

## Category C: TP Placement (Laws 11-14)

**Law 11: TP AT DEMAND + LIQUIDITY OVERLAP (EARTH + FIRE)**
TP targets the NEAREST opposing zone where STRUCTURAL DEMAND overlaps with LIQUIDITY.
- "Earth" = structural demand zone (UM BoM Demand)
- "Fire" = liquidity pool behind the demand (resting orders, prior reactions)
- Earth + Fire = strong reaction expected → use zone MIDPOINT as TP
- If no liquidity overlap → use zone NEAR EDGE (quick exit)
- NEVER target the FAR edge of a distant zone

**Evidence**: User screenshot — TP at 1H UM Demand + liquidity overlap at 100.540. Reverse whiplash occurred there the next day.

**Law 12: TP TIMEFRAME ≥ ENTRY TIMEFRAME**
A 15m entry targets 30m or 1H TP. A 1H entry targets 4H TP. Never same-TF targeting.

**Law 13: TP DISTANCE SANITY CHECK**
If TP distance > 2 × weeklyATR → mark "ambitious". If > 3 × weeklyATR → reject TP, look for closer LTF zone.

**Law 14: PRICE CANNOT TELEPORT**
Price defends zones sequentially. It cannot skip from one HTF zone to another without reacting at intermediate LTF zones. The nearest 1H demand WILL be defended at least once before price can reach the 4H demand below it. The pipeline must map the FULL PATH and set TP at the FIRST zone price will react at.

## Category D: Entry Mechanics (Laws 15-19)

**Law 15: 3-ENTRY STAGGERED SYSTEM**
Every setup generates 3 entries:
- **Entry 1 (Front)**: zone edge nearest to spot + forward spread. 33% capital.
- **Entry 2 (Middle)**: zone midpoint or refined 1H candle body anchor. 33% capital.
- **Entry 3 (Back)**: zone edge farthest from spot + forward spread. 34% capital.

All 3 share the same SL and TP. SL cascade: R1 fill → Primary to breakeven. R2 fill → R1 to breakeven.

**Law 16: FORWARD SPREADS ARE MANDATORY**
Every entry edge gets a forward spread toward spot. Without this, entries miss by fractions of a pip.

| Pair | Forward Spread |
|------|---------------|
| EUR/USD | 1 pip |
| AUD/USD | 1.5 pips |
| GBP/USD | 2 pips |
| DXY | 0.02 index points |

**Evidence**: User explicitly stated Entry 3 only triggered because of 1.5 pip forward spread. Without it, 2/3 entries would have missed by 0.5 pips.

**Law 17: ENTRY AT ZONE EDGE (74%) OR INSIDE (26%)**
Most entries are at the zone edge (ceiling for LONG, floor for SHORT). Some are inside the zone body (scalps, consolidation entries). Never outside the zone.

**Law 18: CANDLE CONFIRMATION REQUIRED**
Entries require candle confirmation at the zone touch:
- Bullish/Bearish Engulfing (18/38 winning trades)
- Pin Bar / Hammer (12/38)
- Inside Bar (8/38)
- Breakout Candle (6/38)

Setup note: "CONFIRMATION REQUIRED: Wait for [pattern] at entry zone during assigned session. Do NOT enter without candle confirmation."

**Law 19: ZOC — ZONE OF CONQUEST (DUAL DIRECTION EXCEPTION)**
When price is at a ZoC (high-confluence zone with 3+ TF overlap + LQZ shield + BoM status), the pipeline generates DUAL setups (both directions). The ZoC reaction determines the next phase of the war. ZoC is the ONLY exception to Laws 6 and 1 (directional lock).

## Category E: Direction & Cascade (Laws 20-22)

**Law 20: DXY CASCADE IS A HARD FILTER**
If DXY is bearish (supply zones above spot, BS/WL/RWL shape):
- EUR/USD, GBP/USD, AUD/USD can ONLY generate LONG setups
- SHORT FX setups are REJECTED (not penalized — rejected)

If DXY is bullish (demand zones below spot, BS bullish shape):
- FX pairs can ONLY generate SHORT setups

If DXY is neutral (SS shape, range-bound):
- Both directions allowed for FX pairs

**Evidence**: V2 generated mixed DXY directions and mixed FX — cascade was not enforced. Winning trades show consistent DXY→FX inverse correlation.

**Law 21: DIRECTION ANALYSIS IS 70% CORRECT — EXECUTION IS THE PROBLEM**
The pipeline's zone analysis and shape prediction correctly identify direction 70% of the time. Losses are from execution: SL placement, session timing, TP targeting. NOT from wrong direction.

**Law 22: MFE BEFORE SL = RIGHT ZONE, WRONG SL**
When a setup has MFE of 2+ R before hitting SL, the entry zone was CORRECT but the SL was placed at the wrong structural level. This is an SL placement failure, not an analytical failure.

**Evidence**: V2 setups #1-4 had +3.0-3.2R MFE before SL hit.

## Category F: Session & Timing (Laws 23-25)

**Law 23: SESSION ENFORCEMENT IS FUNCTIONAL**
Entries only count during the assigned session window:
- London Open: 02:00-05:00 ET
- NY Overlap: 08:00-10:00 ET
- NY Mid: 10:00-14:00 ET

If price touches entry OUTSIDE the window → "DO NOT ENTER." The setup is still valid for the NEXT session window on the same day.

**Evidence**: July 6-10 backtest — 0/10 setups filled during assigned session. All filled during Asian low-liquidity hours.

**Law 24: NEWS EVENTS ARE SHAPE CATALYSTS**
Red-folder events (CPI, PPI, NFP) provide the LIQUIDITY to push price into zones. The news spike IS the shape transition.

When CPI is on a BS day:
1. News spike pushes price toward the nearest UM zone in the BS direction
2. The UM zone causes the reversal (BS → WL or BS → RWL)
3. The pipeline should ENTER at the UM zone, riding the post-news reversal

Do NOT just widen SL on news days. PREDICT the spike direction and use it as an entry catalyst.

**Evidence**: July 6-10 — Wednesday CPI spike pushed DXY into the 30m UM supply at 101.275. Perfect SHORT entry. Pipeline missed it.

**Law 25: LONDON SPIKE / VOLATILITY EVENTS**
A "London Spike" is a single 1H bar with range > 2 × pairATR. These events:
- Kill tight SLs (if SL < 1 ATR)
- Provide the best entry opportunities (price reaches distant zones)
- Are caused by session-open liquidity gaps + news positioning

Pipeline must detect these bars and: (a) not place SLs tighter than the spike range, (b) identify the zone the spike reached as a potential entry.

## Category G: War Narrative (Laws 26-30)

**Law 26: THE WAR NARRATIVE IS THE CONNECTING TISSUE**
Every pair has a weekly war story:
- Zones = military positions (front lines)
- Shapes = campaign phases (trench warfare → breakthrough → counterattack → recovery)
- Setups = troop deployments (where to position for each battle)
- TP → Entry chains = sequential battle outcomes

The pipeline must generate a human-readable WAR NARRATIVE that connects shapes to zones to setups in a sequential story.

**Law 27: TRADE CHAINING — TP OF ONE = ENTRY OF NEXT**
The TP zone of setup N is the ENTRY zone of setup N+1. When a SHORT targets 1H demand at 100.540:
- Price will react at 100.540 (at least once)
- The reaction IS the RWL (reverse whiplash) from that zone
- The pipeline should generate a LONG setup at 100.540 for the RWL

Shape chain determines chain links:
- BS → R: TP of BS becomes R entry zone
- BS → WL: TP of BS becomes WL entry zone
- WL → RWL: TP of WL becomes RWL entry zone

**Law 28: ZONE DEFENSE TRACKING**
For each zone, track:
- `lastTestedSession`: which session last touched it
- `lastReactionPips`: how many pips price moved on last touch
- `defenseStatus`: DEFENDED (price bounced) | BROKEN (price sliced through) | UNTESTED

A DEFENDED zone has higher reaction probability. A BROKEN zone becomes opposite-type on retest (broken support = new resistance).

**Law 29: PRIOR WEEK CONTEXT**
The pipeline must consider:
- Which zones were defended last week (depleted this week?)
- Which zones were broken (role reversal: support→resistance)
- Where price closed relative to key zones (closing inside a zone = starting battlefield)

**Law 30: SESSION-SPECIFIC ZONE BEHAVIOR**
London Open produces sharper reactions (22/38 winning entries). NY produces deeper penetrations (15/38). Track which session each zone was last tested in. Predict which session will produce the reaction.

## Category H: Zone Quality (Laws 31-34)

**Law 31: UM ZONES HAVE 100% REACTION RATE**
Unmitigated (reactionCount=0) zones react 100% of the time. Mitigation decreases reliability:
- 0x (UM): 100% reaction
- 1x: ~80%
- 2x: ~50%
- 3x+: TP target only (depleted)

UM zones are prioritized for entries. 3x+ zones are excluded from entries.

**Law 32: MULTI-TF CONFLUENCE = STRONGER ZONE**
When a zone exists on 2+ TFs simultaneously:
- Dual-TF ("30m Refined 1H"): +3 confluence bonus, higher reaction probability
- Triple-TF ("15m Refined 30m Refined 1H"): +5 confluence bonus

Refined zones are preferred for entry selection over single-TF zones.

**Law 33: LIQUIDITY QUANTIFICATION ("WOOD FOR THE FIRE")**
Every zone has a `liquidityScore: 0-10` estimating the resting orders behind it:
- Prior reaction strength (pips moved on last touch): stronger = more liquidity
- Options notional near the zone (if available)
- Number of prior reactions (more reactions = more stop orders clustered)
- Session of last test (London tests leave more liquidity residue)

TP zones must have liquidityScore ≥ 5. Low-liquidity zones produce weak reactions.

**Law 34: ZONE DEPLETION IS PER-TIMEFRAME**
A zone depleted on 15m (3+ reactions on 15m bars) might still be UM on 1H. Track reactionCount PER TF. A 1H zone with 0 reactions is UM regardless of 15m activity.

## Category I: Validation (Laws 35-37)

**Law 35: RR IS A CONSEQUENCE, NOT A TARGET**
RR is determined by zone geometry (entry-to-TP distance / entry-to-SL distance). Do not reject setups based on minimum RR. Let the zone structure determine RR.

Minimum RR: 1.0 for conditional, 1.2 for primary. If zone structure provides 1:1, that's what the market offers.

**Law 36: DUPLICATE ELIMINATION**
Dedup key = `direction_entry_sl_tp_day`. When two categories produce identical entry+SL+TP+day, keep only the higher confidence one. The 3 staggered entries (different entry prices) are NOT duplicates.

**Law 37: VISUAL VERIFICATION — DATA = 80%, VISION = 20%**
Data-driven zone construction is 80% of the work. The remaining 20% requires VISUAL VERIFICATION:
1. Screenshot each pair's TradingView chart
2. VLM confirms: zone visible? price reacted before? zone intact or broken?
3. Flag mismatches — if VLM says zone is broken, REMOVE from zone map
4. If VLM identifies a visible zone the data MISSED → ADD it

Trades are executed on what is VISUALLY TRADEABLE, not what is mathematically calculated.

---

# PART 3: WHAT THE USER'S ACTUAL TRADES LOOK LIKE (From Screenshots)

## DXY Week of July 6-10, 2026 (from user's god-vision chart)

The user gave me a fully annotated DXY 1H chart with all LQZ zones marked. Here are the 8 trades:

| # | Day | Setup | Entry | SL | TP | Result |
|---|-----|-------|-------|----|----|--------|
| 1 | Mon | SS Long | **100.945** | 100.905 | **101.115** | WIN |
| 2 | Mon | BS Short | **101.14** | 101.200 | **100.845** | WIN |
| 3 | Tue | SS Long | **100.845** | 100.77 | **101.190** | WIN |
| 4 | Wed | SS Short | **101.19** | 101.25 | **100.975** | WIN (Tokyo fill, London TP) |
| 5 | Wed | RWL Long | **100.975** | 100.905 | **101.240** | WIN |
| 6 | Wed | BS Short | **101.235** | 101.330 | **100.680** | TP hits Friday |
| 7 | Thu | Ladder Short | (liquidity ladder, multiple entries at same LQZ) | — | — | Consolidation |
| 8 | Fri | Whiplash Short + RWL Long | (entries from Wed+Thu) | — | — | Continuation |

**Key lessons from these trades:**
- Entries are at SPECIFIC LQZ levels: 100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240
- SLs are at the NEXT LQZ beyond entry: 100.77, 100.905, 101.200, 101.250, 101.330
- TPs are at OPPOSING LQZ levels: 100.680, 100.845, 101.115, 101.190, 101.240
- The pipeline's zone map (Supply at 101.137-101.253, Demand at 100.887-100.987) does NOT contain these levels. The LQZ levels are between the 4H zones.
- The LQZ levels come from CANDLESTICK PATTERN RECOGNITION — wick highs, body edges, reaction points on 1H/30m charts. They CANNOT be computed from OHLC bar statistics.

## What Makes a Zone Tradeable

From the SMC notes:
1. **Liquidity = where stop losses and pending orders sit** — the market moves TO and FROM liquidity zones
2. **Supply/Demand = ADDITIONAL CONFLUENCE** — not the primary driver
3. **Entry = LQZ + overlap with S/D** — the best entries have both liquidity AND supply/demand overlap
4. **Zones are drawn by EYES** — candlestick patterns, wick levels, reaction points. NOT statistical consolidations.
5. **Price cannot teleport** — defends zones sequentially. Must react at intermediate zones.

---

# PART 4: WHAT'S BUILT AND VERIFIED (Do Not Touch)

## Engine 1: IP Pressure Zones (FIXED — 6 deviations corrected)

| Fix | What Changed | Status |
|-----|-------------|--------|
| E1-1 | BoM/MoM structural classification restored (removed distance-based override from pipeline) | ✅ DONE |
| E1-2 | IP pressure zones separated from S/D execution zones (sdType = "BoM"/"MoM" only) | ✅ DONE |
| E1-3 | Terminology: "Beginning of Move" / "Middle of Move" (was "Break of Market") | ✅ DONE |
| E1-4 | Reaction counter starts at 0 (was 1) | ✅ DONE |
| E1-5 | 9-pillar: weekly pivots added, 12 MAs (EMA+SMA), derivatives arena boundary, strike→DXY conversion, 6-dimension confluence scoring | ✅ DONE |
| E1-6 | engine3Status preserved (no 'enriched' stomp) | ✅ DONE |

**Files**: `src/brains/4h-sd-lobe.ts`, `src/brains/9-pillar-lobe.ts`, `src/brains/synthesis-lobe.ts`, `src/brains/bom-mom-lobe.ts`, `src/constants/trading-constants.ts`

**Verification**: TSC 0, Bun build SUCCESS. All 6 fixes compile together.

## Engine 2: Macro Shape Chain (FIXED — 10 deviations corrected)

| Fix | What Changed | Status |
|-----|-------------|--------|
| E2-1 | Trading Speed Rule +1 day shift applied (was dead code) | ✅ DONE |
| E2-2 | Day decomposition derived from ZFP chain (not hardcoded energy patterns) | ✅ DONE |
| E2-3 | WLS (Whiplash Storm) detection added | ✅ DONE |
| E2-4 | HTF Zone Mechanics Decision Tree (6.4.2) implemented | ✅ DONE |
| E2-5 | Virgin MoM = DEATH ZONE (reject, was ENTRY-CONDITIONAL) | ✅ DONE |
| E2-6 | Storyline bias directional (was always "Bullish" for BS) | ✅ DONE |
| E2-7 | Session assignment shape-based (SS→London, BS/WL→NY) | ✅ DONE |
| E2-8 | ZFP SS→BS threshold at 45% (was 40%) | ✅ DONE |
| E2-9 | Alternative chains with decision zones + ZFP thresholds | ✅ DONE |
| E2-10 | Full consolidation phase + setup-type mapping | ✅ DONE |

**File**: `src/brains/shape-brain.ts` (960 → 1341 lines, +381 for Engine 2 fixes)

**Verification**: TSC 0, Bun build SUCCESS. All 10 fixes compile together.

## Engine 3: Visual Intelligence (BUILT — NOT YET TESTED)

**New files created:**
- `src/engine3/types.ts` (145 lines) — VisualSDZone, VLMExtraction, VLMAnalysisResult types
- `src/engine3/visual-zone-lobe.ts` (587 → 841 lines) — VLM screenshot analysis + IP zone mapping + fallback
- `src/engine3/visual-setup-generator.ts` (919 lines) — Setup generation at Engine 1+2+visual intersection
- `src/engine3/tv-chart-controller.ts` (254 lines) — Playwright-core CDP input injection controller
- `src/engine3/tv-chart-image-fetch.ts` (330 → 354 lines) — Chart capture + VLM analysis tool

**What it does:**
1. Navigates TradingView to pair chart via `TvChartController` (playwright-core over CDP port 9228)
2. Takes screenshots at 4H, 1H, 30m, 15m timeframes
3. Scrolls back through the week capturing multiple screens
4. Sends screenshots to VLM via opencode SDK client (session.prompt)
5. Parses VLM response for S/D/L zones (supply, demand, LQZ, candle patterns)
6. Maps visual zones onto Engine 1 IP zones (inherits pressure, ZFP, BoM/MoM)
7. Generates 3-entry staggered setups with forward spreads
8. SL at next visual LQZ + 2-5 pip buffer
9. TP at nearest opposing visual LQZ with liquidity overlap
10. Falls back to Engine 1 IP zone edges when VC/browser unavailable

**Verification**: TSC 0, Bun build SUCCESS (1.19 MB, 125 modules). Class instantiation + API surface + connectOverCDP under bun all pass. `bun test` 13 passed.

---

# PART 5: WHAT'S STILL BROKEN / NEEDS TO BE BUILT

## Immediate Blockers (Fix These FIRST)

### 1. CS12 Direction Validation — FIXED BUT NEEDS VERIFICATION
**Issue**: The new Engine 3 visual setup generator produced 3 direction validation checks. The firewall's CS12 rule requires exactly 6 checks. ALL 18 raw setups were rejected by CS12.
**Fix Applied**: Updated `buildDirectionValidation` in `visual-setup-generator.ts` to produce 6 checks matching the old format: Zone Category, Shape Alignment, Confluence Threshold, RRR Check, Session Timing, Sniper Entry Precision.
**Status**: Fixed in code, needs verification in container. Was blocked by TSC error (zone.label vs zone.mappedIPZoneName) which was fixed.
**Next Step**: Deploy to container, run pipeline, verify CS12 no longer rejects all setups.

### 2. GBP/USD + EUR/USD Produce 0 Raw Setups
**Issue**: The visual setup generator produces 0 raw setups for GBP/USD (BS shape) and EUR/USD (RS shape).
**Root Cause**: The `resolveDirection` method used hardcoded `BULLISH_SHAPES`/`BEARISH_SHAPES` lists to determine direction from shape. For BS (bullish) it returned LONG, looking for demand zones below spot. But the correct direction for BS is SHORT at supply zones above spot (fade the surge at supply).
**Fix Applied**: Removed hardcoded shape-direction lists. Direction now comes from zone proximity (nearest supply above → SHORT, nearest demand below → LONG).
**Status**: Fixed in code, needs verification. The `shapeAligned` check in `scoreConfidence` and `buildDirectionValidation` also needed fixing (changed to `zoneAligned` based on zone type).
**Next Step**: Deploy to container, verify GBP/USD and EUR/USD now produce setups.

### 3. Visual Zone Lobe Uses External VC Daemon (BROKEN)
**Issue**: The `visual-zone-lobe.ts` used `VCHttpBridge.analyzeImage()` which calls an external daemon at localhost:3323 that has been consistently unavailable.
**User's Requirement**: Self-contained visual intelligence using the built-in headless browser + opencode SDK client's built-in VLM (MiMo model). No external daemon.
**Fix Applied**: Built `TvChartController` (playwright-core over CDP port 9228) for chart navigation + input injection (click TF, scroll, zoom, screenshot). The VLM analysis now uses the opencode SDK client (`session.prompt`) instead of the external daemon.
**Status**: Built but NOT YET TESTED in container. The `:9228` browser lives in the pipeline runtime behind the socat bridge — not accessible from the host shell for testing.
**Next Step**: Deploy to container, verify the controller connects to :9228, navigates charts, takes screenshots, sends to VLM.

### 4. SS = Swing Scalps (NOT "Sideways")
**Issue**: The codebase has "Sideways" and "Sideways.consolidation" terminology for the SS shape code. SS means "Swing Scalps" (range trades from one zone edge to the opposing zone edge).
**Fix Applied**: Cleaned up all "Sideways" references across 7 files. Replaced with "Swing Scalps" or "Swing Scalps range". Also removed all hardcoded `BULLISH_SHAPES`/`BEARISH_SHAPES` lists from pipeline, elemental-lobe, trade-brain, and visual-setup-generator.
**Status**: Fixed in code, needs verification.

## Medium Priority (After Blockers)

### 5. Semantic Firewall CS12 Might Be Too Aggressive
Even with 6 checks, the firewall might reject setups based on other rules (RRR minimum, SL distance, confidence). The 18 raw setups that were rejected had RRR values of 2.1-3.65, which should pass. But CS12 was the primary killer. Need to verify after CS12 fix that remaining setups pass.

### 6. Spot Price Accuracy
The pipeline uses `priorWeekClose` or last 4H bar close as spot. For DXY on July 6, this was 101.118. But the chart shows DXY was at ~101.15-101.20 during the week. A 3-4 pip error shifts the entire zone path analysis. Should use last 1H bar close for tighter accuracy.

### 7. TP Distance Too Far
The TP at 0.70421 for AUD/USD LONG was 122 pips above entry. Week high was 0.69697 (50 pips above entry). TP never reached. The TP computation needs to target the NEAREST opposing zone with liquidity overlap (Earth+Fire), not the FAR edge of a distant zone. This is Law 11 — partially implemented but needs tuning.

### 8. Reaction Count Per TF
Zone depletion should be tracked PER timeframe. A zone depleted on 15m might be UM on 1H. Currently tracked globally, not per-TF.

### 9. LQZ Detection from Visual Analysis
The pipeline's LQZ zones come from visual analysis (VLM), but the VLM might not always be available. The fallback (IP zone edges) is lower quality. Need to ensure the fallback produces reasonable zones when VLM is down.

### 10. War Narrative Generation
The report needs a human-readable war narrative section that connects shapes to zones to setups in a sequential story. Currently the report has zone tables and setup tables but no narrative connecting them.

---

# PART 6: THE COMPLETE PIPELINE EXECUTION FLOW (How It Should Work)

```
1. DATA HARVEST (Engine 1 input)
   TradingView 4H bars (500 bars per pair)
   OTC Options (DXY component strikes)
   FRED/Treasury/EIA macro data
   Economic calendar (red folder events)
   Web search commentary (analyst S/R levels)

2. ENGINE 1: IP PRESSURE ZONE CONSTRUCTION (data-driven)
   4H bars → construct4HZones() → consolidation detection → BoM/MoM classification
   → 9-pillar analysis → confluence scoring → ZFP computation → pressure degree
   → ZoneMapSnapshot: IP zones with pressure, ZFP, reaction count, structural BoM/MoM
   → MUST be data-driven. MUST NOT be visual.

3. ENGINE 2: MACRO SHAPE CHAIN (data-driven)
   ZoneMapSnapshot → ShapeBrain.compute() → current shape identification
   → ZFP-conditioned chain extension → day decomposition (+1 shift) → consolidation phase
   → ShapePredictionSnapshot: 5-day shape chain, day-by-day decomposition, alternative chains
   → MUST be data-driven. MUST NOT be visual.

4. ENGINE 3: VISUAL TRADE SETUP INTELLIGENCE (visual-driven, on top of Engine 1+2)
   TradingView chart → TvChartController.navigate() → setTimeframe() → screenshot()
   → VLM analyzes screenshots for S/D/L zones (candlestick patterns, wick levels, reaction points)
   → Parse VLM response → VisualSDZone[] (supply, demand, LQZ, candle patterns)
   → Map visual zones onto Engine 1 IP zones (inherit pressure, ZFP, BoM/MoM)
   → For each day in Engine 2 shape chain:
     → Get shape for that day (SS→scalps, BS→fade at supply, WL→whiplash, etc.)
     → Find visual LQZ zones that align with the shape's expected direction
     → Generate 3-entry staggered setup (front+spread, middle anchor, back+spread)
     → SL at next visual LQZ + 2-5 pip buffer
     → TP at nearest opposing visual LQZ with liquidity overlap
     → Map to Engine 1 IP zone for context (pressure, ZFP, BoM/MoM)
     → Assign session based on shape (SS→London, BS→NY, etc.)
   → Output: TradeSetup[] with day, session, shape trigger, chain links

5. COMPLIANCE + REPORT
   Semantic firewall (65 rules) filters setups
   Blind-execution check (BE1-BE18) verifies report is blindly executable
   Report generator produces markdown report with:
     - War narrative (battlefield map, campaign phases, trade chains)
     - Zone maps (Engine 1 IP zones with TF tags)
     - Trade setups (3-entry staggered, session enforcement, candle confirmation)
     - Compliance sweep results
   → PDF generation (optional, falls back to HTML)
   → Pine Script generation for TradingView zone overlays
```

---

# PART 7: CRITICAL CODE LOCATIONS (Where Everything Is)

## Pipeline Orchestration
- **File**: `src/engine/plutus-tte-pipeline.ts` (5,641 lines)
- **Key methods**:
  - `execute()` — main pipeline entry point
  - `harvestAllData()` — collects OHLC bars, options, macro data
  - `constructAndMergeMultiTfZones()` — multi-TF zone construction (4H+1H+30m+15m)
  - `computeATR()` — ATR(14) computation on 1H bars
  - `constructBasicSetups()` — OLD setup generation (being replaced by Engine 3)
  - `getSniperSL()` — SL computation (zone-geometry, next zone)
  - `computeTpsV8()` — TP computation (nearest opposing zone with liquidity)
  - `enforceDXYCascade()` — DXY direction hard filter on FX pairs
  - `linkTradeChains()` — TP→Entry chain linking
  - `generateWarNarrative()` — war narrative report section

## Engine 1: Zone Construction
- **File**: `src/brains/4h-sd-lobe.ts` (860 lines)
- **Key**: `construct4HZones(input)` — constructs IP pressure zones from OHLC bars
- **TF-scaled params**: `TF_CONSTRUCTION_PARAMS` (4H/1H/30m/15m)

## Engine 1: 9-Pillar Analysis
- **File**: `src/brains/9-pillar-lobe.ts` (2,371 lines)
- **Key**: `pillarEngine(input)` — computes 9 pillars (P1-P9) for zone confluence
- **Pillars**: P1 pivots (weekly+daily), P2 MAs (12 EMA+SMA), P3 options, P4 commentary, P5 structural, P6 Fib/round, P7 derivatives arena, P8 strike→DXY, P9 regime

## Engine 2: Shape Prediction
- **File**: `src/brains/shape-brain.ts` (1,341 lines)
- **Key**: `ShapeBrain.compute()` → `buildShapeChain()` → `buildDayDecomposition()`
- **New**: WLS detection, HTF decision tree, virgin MoM death zone, directional storyline bias, shape-based sessions, ZFP 45% threshold, alternative chains, consolidation phases

## Engine 3: Visual Intelligence
- **File**: `src/engine3/visual-zone-lobe.ts` (841 lines)
- **Key**: `identifyZones()` → VLM screenshot analysis → IP zone mapping → fallback
- **File**: `src/engine3/visual-setup-generator.ts` (919 lines)
- **Key**: `generateSetups()` → 3-entry staggered, SL at next LQZ, TP at opposing LQZ
- **File**: `src/engine3/tv-chart-controller.ts` (254 lines)
- **Key**: `TvChartController` — playwright-core CDP input injection (click TF, scroll, zoom, screenshot)

## Supporting Files
- **Types**: `src/types.ts` (912 lines) — DXYZone, TradeSetup, ShapePredictionSnapshot, etc.
- **Report**: `src/report/report-generator.ts` (1,994 lines) — markdown report generation
- **Firewall**: `src/semantic-firewall/index.ts` (1,312 lines) — 65 rules + blind-execution checks
- **Constants**: `src/constants/trading-constants.ts` (1,255 lines) — all trading constants

---

# PART 8: THE USER'S CORE PHILOSOPHY (What They Actually Believe)

## From the SMC Notes:
1. **Liquidity is EVERYTHING** — the market moves to and from liquidity zones. Supply/Demand is ADDITIONAL CONFLUENCE, not the primary driver.
2. **Zones are drawn by EYES** — candlestick patterns, wick levels, reaction points. NOT statistical consolidations from OHLC data.
3. **Shapes show the PATH** — the shape chain tells you the SEQUENCE of price movements through liquidity zones.
4. **Spot price is IRRELEVANT** — everything is based on zones, candles, shapes. Spot reacts to zones, not the other way around.
5. **Entry at LQZ + overlap with S/D** — the best entries have both liquidity AND supply/demand overlap.
6. **Price cannot teleport** — defends zones sequentially. Must react at intermediate zones.
7. **Earth = Liquidity, Fire = Supply/Demand, Water = Macro Shapes, Air = Fibonacci** — the elemental density system. Earth+Fire = strongest zones. Water+Earth = liquidity that fuels shapes.
8. **Vision is REQUIRED for zone charting** — data has been IRRELEVANT for 9 months. Everything is visually price action based candlestick patterns.
9. **TradingView is accessible from headless browser** — no external daemon needed. The agent must interact with TradingView charts directly.
10. **Engine 1 + 2 are A+ solid in the prompt, currently corrupted in code** — they MUST be fixed to match the prompt exactly. Engine 3 is the visual intelligence layer that needs to be built correctly on top.

## From the Winning Trade Library:
- 38 winning trades analyzed via VLM
- Entry zones: 74% at zone edge, 26% inside zone
- SL distances: median 12 pips, buffer 2-5 pips
- Entry zones predominantly 15m/30m MoM (not 4H BoM)
- TP at opposing zone on higher TF
- RR is consequence, not target (median 3.5x)
- Candle confirmation: 18/38 engulfing, 12/38 pin bar

---

# PART 9: CHECKPOINTS AND ARTIFACTS

## Checkpoints (In Order)
1. `Checkpoints/v3.3_2026-07-14_TEMPORAL_SCOPING/` — Original pre-overhaul (untouched)
2. `Checkpoints/v3.3_ENGINE3_FUNCTIONAL_BASELINE/` — V2 with zone-geometry SL
3. `Checkpoints/v3.3_WORKING_ENGINE_3_BASELINE/` — V4 with LTF entries + 3-entry staggered
4. `Checkpoints/v3.3_V4_FULL_ARCHITECTURAL_OVERHAUL/` — Wave 1-4 overhaul
5. `Checkpoints/v3.3_3ENGINE_COMPLIANCE_OVERHAUL/` — Engine 1+2+3 compliance fixes (SHA: 044e208262182d8f1ae6f29a7db5555ce5e68d6d272fb4b281b95128f9528251)
6. `Checkpoints/v3.3_HANDOVER_2026-07-17/` — **CURRENT** — Full 3-engine + visual intelligence + CS12/dir/SS fixes (SHA: c2b6341b5b87fbe993253a639a68f78838a41358bdb3c4fdffc69359b24dfb63)

## Key Documents
- `data/ENGINE3_DEEP_PLAN_L2.md` (5,003 lines) — Engine 3 overhaul spec
- `data/ENGINE3_FUNDAMENTAL_LAWS_V4.md` (686 lines) — 37 fundamental laws
- `data/ENGINE_OVERHAUL_COMPLIANCE_L2.md` (2,822 lines) — Engine 1+2+3 compliance overhaul spec
- `data/FORENSIC_ANALYSIS_38_TRADES.md` — 38 winning trade analysis
- `data/TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md` — Golden standard reference
- `data/PRICE_ACTION_ANALYSIS_2026-07-07.md` — July 6-10 price action analysis
- `data/BUILD_REPORT_OVERHAUL_WAVE1-4.md` — Build report for Waves 1-4
- `data/ENGINE3_OVERHAUL_SPEC_V2.md` — V2 overhaul spec
- `data/ENGINE3_OVERHAUL_SPEC_V3.md` — V3 overhaul spec

## Winning Trade Library
- `/home/leviathan/Pictures/WINNING_TRADE_LIBARARY/` — 38 golden-standard winning trade images across 10 folders
- `/home/leviathan/Pictures/Screenshots/` — User's annotated DXY chart (god vision) showing all LQZ zones and trades

## SMC Notes
- `/home/leviathan/Downloads/Forex SMC Notes(1).md` — Market structure mechanics, S/D zones, order blocks, liquidity
- `/home/leviathan/Downloads/Forex SMC Notes(2).md` — Liquidity explained simply

---

# PART 10: WHAT TO DO IMMEDIATELY AFTER COMPACTION

## Step 1: Read This Document
Read this entire handover package. It contains everything needed to regain full stream-of-consciousness.

## Step 2: Verify Codebase State
```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Manta Agent/Active_Projects/PLUTUS_AGENT"
npx tsc --noEmit  # Should be 0 errors
bun build src/index.ts --outdir dist --target bun  # Should succeed (1.19 MB)
wc -l src/engine/plutus-tte-pipeline.ts src/brains/shape-brain.ts src/engine3/*.ts
# Should show: pipeline=5641, shape-brain=1341, engine3 types=145, zone-lobe=841, setup-generator=919, tv-chart-controller=254, tv-chart-image-fetch=354
```

## Step 3: Deploy to Container and Test
```bash
docker cp dist/index.js trident-plutus-agent:/root/.config/opencode/plugins/plutus-engine/dist/index.js
docker exec -i trident-plutus-agent bash -c "tmux send-keys -t plutus:0 C-c; sleep 2; tmux send-keys -t plutus:0 'node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus' Enter; sleep 15; tmux send-keys -t plutus:0 'generate weekly TTE report for week 2026-07-06 with data cutoff 2026-07-06T09:00:00-04:00' Enter; sleep 150; tmux capture-pane -t plutus:0 -p | tail -60"
```

## Step 4: Check What Happened
- Did the pipeline produce setups? (Should be >0 with CS12 fixed)
- Are GBP/USD and EUR/USD generating setups? (Should be >0 with direction fix)
- Is the visual layer working? (Check if TvChartController connects to :9228)
- What do the setups look like? (entries, SLs, TPs, confidence)

## Step 5: Score Against Price Action
Use the OHLC data in `data/ohlc_week_2026-07-07/` (or re-fetch from container) to score the setups against July 6-10 price action. Check: entries filled? SL hit? TP hit? Win rate?

## Step 6: Fix Remaining Issues
Based on test results, fix the remaining issues listed in PART 5 (spot price accuracy, TP distance, TP timing, war narrative, etc.).

---

# PART 11: THE USER'S FRUSTRATION PATTERN (What NOT To Do)

The user has been EXTREMELY frustrated throughout this session. Their core complaints:

1. **"You are bullshitting theatrical garbage reports"** — They caught me writing summaries instead of actual code. They want ENGINEERING, not documentation.

2. **"Why are you not seeing these zones?"** — I kept missing the LQZ zones on their charts because I was looking at data, not the chart. They had to show me screenshots 3 times before I saw the right zones.

3. **"Why did you not implement the spec?"** — I identified problems in the forensic analysis, wrote a spec for fixes, but then only implemented the easy parts and skipped the hard architectural changes.

4. **"Why is it only using 4H zones?"** — The pipeline was supposed to use multi-TF zones but kept falling back to 4H-only zone construction.

5. **"Why are you hallucinating entries?"** — I kept giving wrong entry prices because I was guessing from VLM summaries instead of looking at the actual chart pixels.

6. **"Why are you not using subagents?"** — I was doing all the work myself line-by-line when I should have been dispatching subagents for parallel execution.

7. **"Why is there no visual processing?"** — The pipeline was purely data-driven with zero chart analysis. The user's entire strategy is visual.

8. **"Why are you not using the knowledge graph correctly?"** — I tried to build an automatic sync that dumps raw data. The user wanted curated rules only, manually approved.

9. **"Why are you changing Engine 1/2 when they should not be touched?"** — I was modifying Engine 1/2 when the user explicitly said they are A+ solid in the prompt and only need compliance fixes.

10. **"Why are you not checking the calendar?"** — I used the wrong week dates (July 7 instead of July 6) and didn't verify.

**What the user wants**: Fast, correct engineering with subagent-driven execution. No hallucination. No theatrical reports. No summaries. Just working code that matches their proven trading strategy.

---

# PART 12: THE IMMEDIATE NEXT STEPS (What to Build Next)

1. **Deploy and test the current build** — Verify CS12 fix, GBP/EUR setup generation, TvChartController connection, VLM analysis
2. **Fix spot price accuracy** — Use last 1H bar close instead of 4H close
3. **Fix TP distance** — Target nearest opposing zone with liquidity overlap (Earth+Fire), not far edge of distant zone
4. **Generate more setups** — Should be 8+ setups for DXY week (4 swing scalps + main short + RWL + BS + continuation)
5. **Add war narrative** — Human-readable battlefield story in report
6. **Score against price action** — Verify win rate improves from 0% to ≥30%
7. **Backtest 3+ weeks** — Validate across multiple trading weeks
8. **Add zone defense tracking** — Track which zones were defended/broken last week
9. **Implement LQZ detection from visual analysis** — Improve VLM prompts for better LQZ identification
10. **Add TP→Entry chain linking** — Complete the trade chaining system

---

**END OF HANDOVER PACKAGE**
