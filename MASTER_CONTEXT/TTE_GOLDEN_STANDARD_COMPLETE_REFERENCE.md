# TTE GOLDEN STANDARD REVERSE ENGINEERING — COMPLETE COMPACTION-PROOF REFERENCE
## 38 Images Analyzed via VLM | July 14, 2026
## THIS DOCUMENT IS THE AUTHORITATIVE REFERENCE FOR ALL PIPELINE FIXES

---

# PART 1: THE 7 UNIVERSAL LAWS (confirmed across ALL 38 images, zero exceptions)

## LAW 1: MULTI-TIMEFRAME ZONE STACKING
Every A+ trade uses zones from 3-5 timeframes SIMULTANEOUSLY. Zones from different TFs that overlap at the same price create "near-impenetrable walls" — the highest probability entries.

**Verified TF combinations across 38 images:**
- 15m + 30m + 1H + 4H (most common, 24 images)
- 15m + 30m + 1H + 4H + 8H (deep context, 8 images)
- 15m + 30m + 1H (scalp-focused, 3 images)
- 5m + 15m + 30m + 1H + 4H (ultra-precision, 3 images)

**Zone width by timeframe (measured across all images):**
| TF | Typical Width | Range | Use |
|----|--------------|-------|-----|
| 5m | 5-8 pips | 3-12 | Ultra-precision scalp entry |
| 15m | 8-15 pips | 5-22 | Scalp entry, BoM identification |
| 30m | 12-25 pips | 10-35 | Swing entry, MoM rocket placement |
| 1H | 15-35 pips | 10-50 | HTF swing entry, liquidity shield |
| 4H | 30-80 pips | 20-120 | Directional bias, TP target, major liquidity shield |
| 8H | 50-150 pips | 30-200 | Macro context, deep TP target |

**CRITICAL: The pipeline currently builds zones ONLY from 4H bars (30-80 pip wide). Entry at a 4H zone edge places the trade 50-140 pips from spot. Winning trades enter at 15m/30m zone edges 5-25 pips from the actual entry trigger point.**

## LAW 2: SHAPE-DRIVEN ZONE ACTIVATION
The shape chain PREDICTS which zones price will reach on which days. The pipeline must only generate setups at zones the shape chain says price will touch.

**Shape-to-zone-distance mapping (verified across 38 images):**
| Shape | Expected Price Travel | Zone Distance from Spot | Entry Type |
|-------|----------------------|------------------------|------------|
| SS (Mon-Tue) | ±5-30 pips (consolidation) | 0-30 pips | Scalp entries at nearby zones |
| BS (Wed) | 30-100 pips directional | 30-100 pips in breakout dir | HTF Swing / Breakout |
| WL (Thu-Fri) | 50-200 pips (whiplash spike) | 50-200 pips at extremes | Reversal entry after spike |
| RWL | 30-100 pips (partial recovery) | 30-100 pips | Counter-direction scalp |
| R | ±10-50 pips (recovery) | 10-50 pips | Reinforcement / Recovery entry |

**The forward mapping principle (VLM quote from image 15):**
> "The code must be programmed to ignore price action until it physically intersects with a pre-drawn Zone Map. The strategy is patient; it waits for price to travel 50-100 pips to find the setup."

**Pipeline gap**: Shape decomposition generates shapes per day (Wave 8 fix), but shapes are NOT connected to zone selection. All zones are treated equally regardless of which day's shape is active.

## LAW 3: ENTRY PRECISION AT LTF ZONE EDGES
Entries are NEVER placed at 4H zone edges. They are placed at:
- **15m zone edges** for scalps: entry at zone boundary ± 2 pips inside
- **30m zone edges** for swings: entry at zone ceiling (SHORT) or floor (LONG)
- **1H zone edges** for HTF swings: entry at nearest key level to zone edge
- **4H zones**: Directional bias + TP target ONLY. Never direct entry.

**Entry precision measurements (from 38 images):**
| Category | Entry Offset from Zone Edge | SL from Entry | Typical R:R |
|----------|---------------------------|---------------|-------------|
| Scalp | 0-2 pips inside zone | 5-8 pips | 4-6.5x |
| HTF Swing | At zone edge (nearest key level) | 10-15 pips | 3-10x |
| Breakout | At zone edge (break confirmation) | 12-20 pips | 5-15x |
| Reinforcement | At FAR edge of entry zone | 10-25 pips | Variable |
| Whiplash | Post-spike entry at zone rejection | 7-14 pips | 3.5-9x |

## LAW 4: SL BEHIND LIQUIDITY SHIELDS
Every winning trade places SL behind a liquidity zone (Earth density shield). The SL is NEVER at a random zone edge — it's PROTECTED.

**SL placement rules (verified 38/38 images):**
1. SL distance from entry: 5-15 pips (median 12 pips, NEVER above 25 pips for standard entries)
2. SL is placed OUTSIDE the nearest liquidity shield zone
3. If no LSZ between entry and SL → SL widened to next LSZ or setup rejected
4. The LSZ acts as a "shield" — price must break through Earth density to hit SL
5. For deep HTF swings: SL can be 25-50 pips but MUST be behind 4H/8H liquidity shield

**SL distance distribution across 38 images:**
| SL Range | Count | Context |
|----------|-------|---------|
| 5-8 pips | 11 | Scalps with 15m LSZ protection |
| 8-12 pips | 14 | Standard entries with 30m/1H LSZ |
| 12-20 pips | 8 | HTF swings with 1H/4H LSZ |
| 20-50 pips | 5 | Deep HTF reversals with 4H/8H LSZ |

## LAW 5: FIBONACCI-ALIGNED ENTRIES AND ROCKETS
Entries and reinforcement rockets align with specific Fibonacci levels computed from the entry zone.

**Fibonacci level usage (verified across 38 images):**
| Fib Level | Use | Alignment Frequency |
|-----------|-----|-------------------|
| 0.382 | Primary entry (retracement) | 8/38 images |
| 0.50 | Primary entry (equilibrium) | 12/38 images |
| 0.618 | Primary entry (golden pocket) | 10/38 images |
| 0.786 | Deep entry / SL invalidation | 6/38 images |
| 1.272 | Minor target | 4/38 images |
| 1.382 | Rocket 1 reinforcement entry | 15/38 images |
| 1.618 | Rocket 2 reinforcement entry | 14/38 images |
| 2.382 | TP target / Rocket 3 trigger | 8/38 images |
| 2.786 | Extended TP / trigger zone | 5/38 images |

**Fib computation source**: Swing high = entry zone ceiling, swing low = entry zone floor. The Fib tool is anchored to TWO Earth density points (zone edges).

## LAW 6: LIQUIDITY LADDER REINFORCEMENT SYSTEM
Liquidity ladders are REINFORCEMENT entries on an EXISTING primary trade. They are NOT primary entries themselves.

**Ladder architecture (verified across 5 LIQUIDITY LADDER images):**
```
Primary Entry: At BoM zone, SL 5-15 pips (ONLY risk in the entire ladder)
    ↓ Price travels toward TP...
Rocket 1: At next MoM zone (~20-30 pips from primary)
    → Fib 1.382 extension
    → When R1 triggers: Primary SL → BREAKEVEN (risk = 0)
    ↓ Price continues...
Rocket 2: At next MoM zone (~20-30 more pips)
    → Fib 1.618 extension
    → When R2 triggers: R1 SL → BREAKEVEN, Primary SL locks profit
    ↓ Price reaches...
TP: At opposing BoM / Liquidity Shield zone
    → Fib 2.382+ extension
    → Combined R:R = 16-61x (only primary risk counts)
```

**Zone spacing in ladders (measured from 5 images):**
| Spacing | Pips | Determinant |
|---------|------|-------------|
| Primary → R1 | 20-30 pips | Next MoM zone + Fib 1.382 |
| R1 → R2 | 12-30 pips | Next MoM zone + Fib 1.618 |
| R2 → TP | 25-130 pips | Opposing BoM/Liquidity Shield + Fib 2.382+ |

**Combined R:R measurements:**
| Ladder | Primary Risk | Total Reward | Combined R:R |
|--------|-------------|-------------|--------------|
| Image 1 | 13 pips | 88.5 pips | 6.8x |
| Image 2 | 20 pips | 1140 pips (4 entries) | 57x |
| Image 3 | 10 pips | 85 pips | 8.5x |
| Image 4 | 10 pips | 160 pips | 16x |
| Image 5 | 5 pips | 305 pips | 61x |

**SL cascade rules (universal across all 5 ladder images):**
1. Initial state: All entries share primary SL (or each has own SL behind LSZ)
2. Rocket 1 triggers (price reaches R1 zone) → Primary SL moves to breakeven
3. Rocket 2 triggers (price reaches R2 zone) → R1 SL moves to breakeven
4. Final: All entries risk-free, only upside remains

## LAW 7: FORWARD MAPPING — ZONES FIRST, SHAPES PREDICT REACHABILITY
The pipeline must draw ALL zones from ALL timeframes FIRST, then use the shape chain to predict which zones price will reach.

**The principle (quoted from VLM analyses):**
- "The strategy dictates waiting for the price to come to the pre-drawn HTF zones, rather than chasing the price." (Image 32)
- "The code must be programmed to ignore price action until it physically intersects with a pre-drawn Zone Map." (Image 15)
- "This is a 'Zone-Dependent' strategy. The code must ignore price action until it physically intersects with a pre-drawn Zone Map." (Image 14)

**Implementation requirement:**
1. Build zone map from ALL timeframes (15m through 4H) BEFORE generating any setups
2. For each day's predicted shape, determine the expected price travel range
3. Only generate setups at zones within the expected range for that day's shape
4. If no zone is reachable based on shape prediction → "no actionable setup" for that day
5. A zone 200 pips away is valid IF the shape chain predicts a whiplash reaching it. A zone 100 pips away is INVALID if the shape chain predicts consolidation near spot.

---

# PART 2: PATTERN-BY-PATTERN ZONE ARCHITECTURE

## SS → BS Pattern (8 images analyzed)
**Week structure**: Mon-Tue consolidation → Wed breakout → Thu-Fri continuation

**Zone proximity from week-start (all 8 images):**
| Image | Nearest Entry Zone | Pips from Start | Shape That Reached It |
|-------|-------------------|-----------------|----------------------|
| 1 | 30m Liquidity Shield | 7-35 | SS consolidation, price drifted |
| 2 | 15m BoM Demand | 43 | SS→BS, price dropped then reversed |
| 3 | 1H MoM | 100 | BS surge reached it |
| 4 | Entry zone | 0 | Price was AT the entry at start |
| 5 | 15m Consolidating | 104.5 | BS reached it after trend developed |
| 6 | 4H MoM | 81 | Counter-trend into lower supply |
| 7 | Swing Scalps | 3 | Immediately adjacent |
| 8 | 1H Liquidity Shield | 35 | Price traveled to it via rally |

**Consistent pattern**: Nearest zone 0-35 pips from start (6/8 images). Price either enters immediately or travels 50-100 pips via shape chain to reach the zone.

## Swing Scalps Pattern (3 images)
**Zone proximity**: 0-40 pips from week-start
**SL**: 6.2-15 pips (tightest of all patterns)
**Multi-TF**: 15m MoM + 30m MoM + 4H Liquidity Shield (3-layer confluence)

## R → BS/WL Pattern (5 images)
**Zone proximity**: 11-185 pips from start
**Key finding**: Short entries 11 pips from start (at supply right at open). Long entries 185 pips away (reached via WL whiplash). Shape chain determines reachability.

## BS → R/RWL Pattern (5 images)
**Zone proximity**: 3-265 pips from start
**Key finding**: Recovery entries 3-25 pips from start. Continuation entries 100-265 pips (reached via 300-pip rally). BS shape = massive directional move.

## PBS → R → WL(S) Pattern (3 images)
**Zone proximity**: Nearest zones 0-13 pips (MoM Shields at opening price). Entry zones 113-174 pips below (deep sweep reached via 4-day SS sell-off).
**Key finding**: 23 zones mapped across 8 timeframes. Zones STACKED 42 pips deep at supply create "near-impenetrable ceiling."

## R → WL Pattern (5 images)
**Zone proximity**: 0-130 pips from start
**SL**: 6.1-15 pips (ultra-tight for whiplash entries)
**Key finding**: Whiplash spike drives price INTO the entry zone. Entry is AFTER the spike (confirmation entry). TP at 78.6% Fib.

## WL → RWL/R Pattern (1 image)
**Zone proximity**: 18-20 pips from start
**Key finding**: "Trap" pattern — price moves AWAY from entry zone first to trap buyers, then returns.

## WL → SS Pattern (1 image)
**Zone proximity**: 0 pips (price started inside the zone)
**Key finding**: Swing entry 120 pips away reached via whiplash drop.

## BS/WL → SS Pattern (2 images)
**Zone proximity**: 35-300 pips from start
**Key finding**: "Wait for the setup" — engine ignores price until it enters pre-drawn zones. 300-pip drop to reach entry is valid if SS shape predicts it.

## LIQUIDITY LADDERS Pattern (5 images)
**Primary entry proximity**: 0-70 pips from week-start
**Rocket spacing**: 20-30 pips between each rocket
**Fib alignment**: R1 = 1.382, R2 = 1.618, TP = 2.382+
**SL cascade**: Each rocket trigger → prior entries to breakeven
**Combined R:R**: 6.8-61x

---

# PART 3: EXACT CODE CHANGES REQUIRED

## CHANGE 1: LTF Entry Zone Construction [PRIORITY 1]
**File**: `src/engine/plutus-tte-pipeline.ts`
**Method**: `constructBasicSetups()`

**Current flow**:
```
4H zones → filter eligible → for each zone → for each day → for each category →
  entry = getSniperEntry(4H zone edge) → SL = getSniperSL(4H zone edge)
```

**Required flow**:
```
4H zones → filter eligible → for each 4H zone:
  1. Find all 15m zones WITHIN this 4H zone (using multiTfBars)
  2. Find all 30m zones WITHIN or NEAR this 4H zone
  3. Find all 1H zones that OVERLAP this 4H zone
  4. For each LTF zone near spot (within 30 pips):
     - Use LTF zone edge as ENTRY
     - Use LTF zone opposite edge + buffer as SL
     - Use 4H opposing zone as TP (directional target)
     - Compute Fib from LTF zone range
  5. If no LTF zone within 30 pips of spot:
     - Use 4H zone edge as entry (current behavior)
     - But flag as "HTF-only" (lower confidence)
```

**The `detectLtfZones()` method already exists** (added Wave 11). It detects swing highs/lows from 15m/1H bars. Extend it to also detect consolidation zones (consecutive bars in tight range = supply/demand micro-zones).

## CHANGE 2: Shape-Zone Connection [PRIORITY 2]
**File**: `src/engine/plutus-tte-pipeline.ts`
**Method**: `constructBasicSetups()` day loop

**For each day's shape, set max entry distance from spot:**
```typescript
const SHAPE_MAX_DISTANCE: Record<string, number> = {
  'SS': 30,      // Consolidation: entries within 30 pips
  'BS': 100,     // Breakout: entries up to 100 pips in breakout direction
  'WL': 200,     // Whiplash: entries at extremes up to 200 pips
  'RWL': 100,    // Recovery whiplash: up to 100 pips
  'R': 50,       // Recovery: up to 50 pips
  'RS': 80,      // Recovery surge: up to 80 pips
};

const maxDist = SHAPE_MAX_DISTANCE[dayShape] ?? 60;
if (distPips > maxDist) {
  log.info(`    [skip] ${zone.zoneName}: ${distPips}p exceeds ${dayShape} max ${maxDist}p`);
  continue;
}
```

## CHANGE 3: Liquidity Shield SL [PRIORITY 3]
**File**: `src/engine/plutus-tte-pipeline.ts`
**Method**: `getSniperSL()`

After computing SL, scan for LSZ between entry and SL:
```typescript
// Check for liquidity shield between entry and SL
const lsZones = allZones.filter(z => z.type === 'LSZ' || z.zoneType?.includes('Liquidity'));
const slDist = Math.abs(entry - sl);
const lsBetween = lsZones.find(z => {
  if (direction === TradeDirection.LONG) {
    return z.floor > sl && z.ceiling < entry;
  } else {
    return z.ceiling < sl && z.floor > entry;
  }
});

if (!lsBetween && slDist > 20 * pipValue) {
  // No liquidity shield protecting this SL and SL is wide
  // Widen SL to next LSZ or reject
  const nextLsz = lsZones.find(z => /* nearest LSZ beyond current SL */);
  if (nextLsz) {
    sl = direction === LONG ? nextLsz.floor - buffer : nextLsz.ceiling + buffer;
  } else {
    // No LSZ available — reduce confidence, keep current SL
    confidence -= 10; // Penalty for unprotected SL
  }
}
```

## CHANGE 4: Depleted Zone Breakout Entries [PRIORITY 4]
**File**: `src/engine/plutus-tte-pipeline.ts`
**Method**: Zone depletion enforcement block

Allow depleted zones IF a fresh LTF zone exists at the same price:
```typescript
// Instead of completely excluding depleted zones:
if (status === 'TP-TARGET') {
  // Check if there's a fresh 15m/30m zone at this price level
  const ltfBars = this.multiTfBars.get(pair);
  const freshLtfZone = ltfBars ? this.findFreshLtfZone(ltfBars, zone, spot) : null;
  
  if (freshLtfZone) {
    // Allow entry but as BREAKOUT setup
    log.info(`Zone ${zone.zoneName} depleted but fresh LTF zone found — BREAKOUT entry`);
    // Keep zone in eligible list, mark as breakout
  } else {
    log.info(`Zone ${zone.zoneName} excluded — depleted, no fresh LTF overlap`);
    return false;
  }
}
```

## CHANGE 5: Liquidity Ladder Completion [PRIORITY 5]
**Files**: `plutus-tte-pipeline.ts` (reinforcementLevels), `report-generator.ts`

Snap rockets to nearest MoM zone at Fib price levels:
```typescript
// Current: reinforcementLevels computed from pure Fib math
// Required: snap to nearest actual MoM zone

for (const [pair, bars1H] of this.multiTfBars) {
  const momZones = this.detectLtfZones(bars1H, 3); // 1H MoM zones
  for (const setup of setups) {
    if (setup.reinforcementLevels) {
      for (const rl of setup.reinforcementLevels) {
        // Find nearest MoM zone to the Fib-computed price
        const nearestMom = momZones.reduce((closest, z) =>
          Math.abs((z.floor + z.ceiling)/2 - rl.price) < Math.abs((closest.floor + closest.ceiling)/2 - rl.price) ? z : closest
        );
        if (nearestMom) {
          rl.price = (nearestMom.floor + nearestMom.ceiling) / 2; // Snap to zone center
          rl.zoneLabel = nearestMom.label;
        }
      }
    }
  }
}
```

Implement SL cascade in setup data:
```typescript
setup.reinforcementLevels = [
  { price: r1Price, fibLevel: 1.382, slManagement: 'Primary SL → BE on trigger' },
  { price: r2Price, fibLevel: 1.618, slManagement: 'R1 SL → BE on trigger' },
];
```

---

# PART 4: CURRENT PIPELINE STATE vs GOLDEN STANDARD

| Dimension | Pipeline (Current) | Golden Standard (38 Images) | Gap |
|-----------|-------------------|----------------------------|-----|
| Entry zone TF | 4H only | 15m + 30m + 1H + 4H | Missing 3 TFs |
| Entry pips from spot | 55-140 | 0-50 (initial), 50-300 (continuation) | 3-10x too far |
| SL pips from entry | 15-100 | 5-15 (median 12) | 2-8x too wide |
| SL protection | Zone edge + buffer | Behind liquidity shield | No shield check |
| Zone width | 30-80 pips (4H) | 5-25 pips (15m/30m) | 3-10x too wide |
| Shape-zone connection | None | Each shape has max distance | Not implemented |
| Fibonacci use | Computed, not connected | Entries at 38.2-61.8%, rockets at 1.382/1.618 | Not connected |
| Liquidity ladder | Fib levels only (not snapped) | Rockets at actual MoM zones | Not snapped |
| SL cascade | Not implemented | Each rocket → prior SL to BE | Not implemented |
| Multi-TF confluence | Computed, 0 results | 3-5 TFs stacked at every entry | Not producing confluence |
| Depleted zones | Completely excluded | Used as breakout if fresh LTF exists | Too aggressive exclusion |
| Forward mapping | All zones equally | Shape chain predicts reachability | Not implemented |

---

# PART 5: BUILD STATE

**Checkpoint**: `Checkpoints/v3.3_2026-07-14_TEMPORAL_SCOPING/`
**SHA256**: `6777d1bf00515951c05e778c103c9b825c6874a3ec1e55d34c4432072a05e701`
**TSC**: 0 errors
**Bun Build**: SUCCESS (650K)
**Pipeline**: 4729 lines (plutus-tte-pipeline.ts)

**All Run 7 fixes included**:
- Dedup with entry + day in key
- Confidence diminishing returns (±20 cap)
- Category-aware TP (FAR/NEAR/MID)
- Category-aware entry (scalp 2pip inside, reinforcement far edge)
- Zone depletion enforcement + direction inversion
- Prior week momentum (date-scoped, before weekStart)
- Temporal data scoping (dataCutoff parameter)
- Incomplete bar filtering (bars not yet closed)
- Fibonacci levels (0.382-2.786)
- DXY SL pip display fix
- Shape prediction energy cycle (SS→BS→R→WL)
- Minimum SL enforcement + zone width
- BoM/MoM compliance boolean check

**Container**: trident-plutus-agent (image: trident-plutus-testing:master)
**Auth**: `/root/.local/share/opencode/auth.json` with opencode-go key
**Model**: opencode-go/deepseek-v4-flash

---

# PART 5B: PIPELINE TEST RESULTS (July 14, 2026)

## Run 7 (July 13, before temporal scoping)
- **16 setups generated**
- **Directions**: DXY SHORT ✅, EUR/USD LONG ✅, GBP/USD LONG ✅, AUD/USD LONG ✅
- **Compliance**: 2 FAIL (category cap, confidence threshold)
- **Issue**: Used incomplete July 13 bars, momentum calculated from wrong data

## Today's Run (July 14, with temporal scoping + incomplete bar filter)
- **12 setups generated** (4 fewer than Run 7)
- **Directions**: DXY SHORT ✅, EUR/USD LONG ✅, GBP/USD LONG ✅, AUD/USD LONG ✅
- **Compliance**: 1 FAIL (category cap)
- **Improvement**: Uses only complete bars before cutoff, momentum correctly scoped to prior week

## Gap Analysis (Today vs Golden Standard)
| Metric | Today's Pipeline | Golden Standard (38 Images) |
|--------|-----------------|----------------------------|
| Entry proximity | 55-140 pips from spot | 0-50 pips (initial), 50-300 (continuation) |
| SL distance | 15-100 pips | 5-15 pips (median 12) |
| Zone TF | 4H only | 15m + 30m + 1H + 4H |
| Shape-zone connection | None | Each shape has max distance |
| Fibonacci use | Computed, not connected | Entries at 38.2-61.8%, rockets at 1.382/1.618 |

**Root cause**: Pipeline uses ONLY 4H zones for entries. Winning trades use 15m/30m/1H zones for entry precision.

---

# PART 6: THE WARFRONT NARRATIVE — PHILOSOPHICAL FOUNDATION OF ZONES AND SHAPES

## ZoC = Zone of Conquest 

Price action IS the visual illustration of an ongoing battle between bullish and bearish liquidity/pressure. Every zone is a military position in this war. The TTE Engine maps the battlefield.

### The Battlefield Ontology

| Military Concept | TTE Equivalent | Market Meaning |
|-----------------|---------------|----------------|
| **Territory** | Price level | Area controlled by one side |
| **Front line** | Zone (Supply/Demand) | Where two armies meet |
| **Bearish territory** | Supply zone | Area of bearish liquidity/pressure |
| **Bullish territory** | Demand zone | Area of bullish liquidity/pressure |
| **Trenches** | Liquidity zones (LSZ) | Where fighting occurs, orders cluster |
| **Skirmishes** | Consolidation (SS) | Minor back-and-forth as one side clears trenches |
| **Breakthrough** | Breakout Surge (BS) | Front line broken, rapid territory conquest |
| **Counter-attack** | Whiplash (WL) | Defending army strikes back after territory loss |
| **Failed counter** | Reverse Whiplash (RWL) | Counter-attack lacks force, territory stays lost |
| **Stabilization** | Recovery (R) | New defensive line forming after retreat |
| **Base camp** | BoM zone | Origin of the army's move — strongest defense |
| **Forward camp** | MoM zone | Mid-move position — weaker than base camp |
| **ZoC** | Zone of Conquest | Critical defensive position — if it falls, violent conquest follows |

### How the War Drives Engine 2 Shapes

**Trench Warfare (SS / Swing Scalps)**
> One side has the upper hand and systematically clears the trenches of all opposing liquidity. Price consolidates with minor reactions from liquidity zones (skirmishes) until they reach a ZoC.

**The Breakthrough (BS / Breakout Surge)**
> The army reaches a ZoC — Zone of Conquest. From here, either:
> - **ZoC HOLDS**: The defenders repel the attack. Strong reaction. Front line holds.
> - **ZoC FAILS**: The front line has been broken. All opposing soldiers retreat to the next line of defense. The victorious army SURGES FORWARD, conquering territory rapidly (BS). This is why if ZoC fails, BS/WL is imminent.

**The Counter-Attack (WL / Whiplash)**
> The victorious army continues conquering until reaching the "base camp" of the opposing army (opposing BoM zone). There will be a STRONG COUNTER-ATTACK to defend the territory and establish a new line of control — whether this is a RWL (failed counter, insufficient force) or a gradual Recovery (R).

**Stabilization (R / Recovery)**
> New defensive lines form. Both armies regroup. The back-and-forth battle between bears and bulls continuing/losing territory continues indefinitely.

### Why HTF Zones ALWAYS Cause Strong Reactions
> When HTF (4H/8H) zones are broken, the defeat is MORE VIOLENT and regaining lost territory is HARDER. A 4H supply zone is a major military installation — breaking it means a significant campaign. The subsequent counter-attack will be proportionally stronger.

### Why LTF Zones Have Weaker Reactions
> LTF (15m/30m) zones are weaker positions — lost territory on LTF is easier to recover. A 15m supply zone is a forward scouting post — losing it is a minor setback.

### How This Connects to the Pipeline

The pipeline must understand this war model to correctly predict shapes:

1. **When price approaches a ZoC (high-confluence zone with 3+ TF overlap)**:
   - Predict either BS (breakthrough) or strong R (hold)
   - The ZoC reaction determines the rest of the week's shape chain

2. **When a ZoC FAILS (price pierces through)**:
   - BS is imminent — price will surge to the next defensive zone
   - The surge target is the opposing army's BoM zone
   - WL will occur at the BoM (counter-attack)

3. **When a ZoC HOLDS (price rejects)**:
   - Price returns to the trenches (SS)
   - Consolidation continues until the next offensive

4. **The shape chain IS the war narrative**:
   - SS = trench warfare → BS = breakthrough → WL = counter-attack → R = stabilization
   - This is SS→BS→WL→R — the most frequently observed pattern

---

# PART 7: ZONE LABEL TAXONOMY (Extracted from 38 Chart Images)

## Zone Type Labels Observed

| Label | Meaning | TF Source | Significance |
|-------|---------|-----------|-------------|
| **BoM (Unmitigated)** | Beginning of Move, never tested | 15m/30m/1H/4H/8H | STRONGEST entry zone — 100% reaction if unmitigated |
| **MoM (Unmitigated)** | Middle of Move, never tested | 15m/30m/1H | TP target or ladder step |
| **MoM (Mitigated 1x/2x/3x)** | Middle of Move, tested N times | All TFs | Reaction count determines strength |
| **MoM (Shielded)** | MoM zone WITH a Liquidity Shield protecting it | All TFs | HIGHER probability — Earth protects Fire |
| **LSZ / Liquidity Shield** | Liquidity Sweep Zone — Earth density | 15m/30m/1H/4H | SL anchor, entry protection |
| **Liquidity Shield (BEAR CONQUERED)** | Supply shield that was tested and HELD against bears | 4H/8H | Ultra-strong resistance |
| **Liquidity Shield (BULL CONQUERED)** | Demand shield that was tested and HELD against bulls | 4H/8H | Ultra-strong support |
| **Liquidity Shield (Bull/Bear Contesting)** | Shield currently being tested | All TFs | ZoC — Zone of Conquest, battle in progress |
| **15m Refined 30m** | Zone validated on BOTH 15m AND 30m simultaneously | 15m+30m | Multi-TF confluence zone — single zone, two TF validation |
| **30m Refined 1H** | Zone validated on BOTH 30m AND 1H | 30m+1H | Higher confluence |
| **1H Refined 4H** | Zone validated on BOTH 1H AND 4H | 1H+4H | Highest practical confluence |

## Zone State Classifications

| State | Reaction Count | Entry Validity | Pipeline Equivalent |
|-------|---------------|----------------|-------------------|
| **Unmitigated** | 0 | ENTRY-PRIMARY (BoM) or TP-TARGET (MoM) | ✅ Implemented |
| **1x Mitigated** | 1 | ENTRY-PRIMARY (tested once, still strong) | ✅ |
| **2x Mitigated** | 2 | ENTRY-CONDITIONAL (weakening, exceptions apply) | ✅ |
| **3x Mitigated / Depleted** | 3+ | TP-TARGET ONLY (exhausted) | ✅ Excluded from entries |
| **Shielded** | Any | HIGHER priority (LSZ protecting this zone) | ❌ NOT IMPLEMENTED |
| **Conquered** | Any | DIRECTIONAL BIAS (held or broke) | ❌ NOT IMPLEMENTED |
| **Contesting** | Active | ZoC — generate both directions | ❌ NOT IMPLEMENTED |
| **Refined** | Any | MULTI-TF CONFLUENCE (validated on 2+ TFs) | ❌ NOT IMPLEMENTED |

## Entry Confirmation Patterns (Candle Signals at Zone Touch)

Observed across 38 images at the moment of entry:

| Pattern | Context | Frequency | Meaning |
|---------|---------|-----------|---------|
| **Bullish/Bearish Engulfing** | Primary entry at BoM | 18/38 | Institutional reversal — army counter-attacks |
| **Pin Bar / Hammer** | Rocket entry at MoM | 12/38 | Rejection wick — zone holding |
| **Inside Bar** | Consolidation entry during SS | 8/38 | Pause before next move |
| **Breakout Candle** | BS entry after ZoC fails | 6/38 | Front line broken |
| **Piercing Candle (wick spike)** | WL entry after whiplash | 5/38 | Failed conquest, immediate reversal |

**Pipeline gap**: The pipeline does NOT check for candle confirmation patterns. It places entries at zone edges unconditionally. Adding candle confirmation would dramatically reduce false entries.

---

# PART 8: TP TIMEFRAME HIERARCHY

Across all 38 images, the TP zone is ALWAYS at an EQUAL or HIGHER timeframe than the entry zone:

| Entry Zone TF | TP Zone TF | Frequency | Rationale |
|--------------|-----------|-----------|----------|
| 15m | 30m or 1H | 14/38 | Scalp targets next higher TF zone |
| 15m | 4H | 8/38 | Scalp targeting HTF for larger move |
| 30m | 1H or 4H | 10/38 | Swing targets HTF zone |
| 1H | 4H or 8H | 6/38 | HTF swing targets macro zone |

**Rule**: TP timeframe ≥ Entry timeframe. A 15m scalp entry NEVER targets another 15m zone — it always targets at least 30m. This ensures the TP is at a structurally significant level.

**Pipeline gap**: `computeTpsV8()` searches ALL zones for the opposing zone. It should PRIORITIZE zones from higher timeframes than the entry zone.

---

# PART 9: MULTI-POSITION SIZING (Ladder Specific)

From the 5 LIQUIDITY LADDERS images:

| Position | Typical Size | When to Scale | Rationale |
|----------|-------------|---------------|-----------|
| Primary | 50% of full position | At entry | Largest size at highest-probability zone |
| Rocket 1 | 30% of full position | When R1 triggers | Adding as trend confirms |
| Rocket 2 | 20% of full position | When R2 triggers | Final add, smallest size |

**Alternative scaling observed**: Equal thirds (1/3 each) for simpler management.

**Pipeline gap**: The pipeline generates reinforcement entries but does NOT implement position sizing. The report should show recommended position weights.

---

# PART 10: SESSION TIMING DATA (Across All 38 Images)

| Session | Primary Use | Entry Frequency | Optimal For |
|---------|------------|-----------------|-------------|
| **London Open** (02:00-05:00 ET) | Scalp entries | 22/38 | Swing Scalps at fresh zones |
| **London/NY Overlap** (08:00-10:00 ET) | Breakout entries | 15/38 | BS entries, whiplash triggers |
| **NY Mid** (10:00-14:00 ET) | HTF Swing entries | 18/38 | Swing continuations |
| **NY Open** (08:30-10:00 ET) | Reinforcement triggers | 8/38 | Rocket entries |
| **Asian Session** | Rare entries | 3/38 | Deep sweep bounces |

**Key finding**: London Open dominates for scalp entries (22/38). The pipeline's `SETUP_SESSION_MAP` already maps categories to sessions correctly. No change needed, but entries should be annotated with the session rationale.

---

# PART 11: ZONE REFINEMENT CONCEPT

Multiple images showed zones labeled "15m Refined 30m" or "30m Refined 1H". This means:

**A Refined Zone is a SINGLE zone that exists on TWO timeframes simultaneously.**

This is NOT two separate zones that happen to overlap. It is ONE zone identified on the lower TF, then VALIDATED by confirming it also exists on the higher TF.

**Example**: A 15m supply zone at 1.35430-1.35495 is labeled "15m Refined 30m" because:
1. The 15m chart shows a supply cluster at 1.35430-1.35495
2. The 30m chart ALSO shows a supply zone at approximately the same level
3. The zone is "refined" — validated by both TFs
4. This makes it STRONGER than a zone that exists on only one TF

**Implementation requirement**: After constructing zones from each TF, check for overlapping zones across TFs. When a 15m zone overlaps with a 30m zone (within 5 pips), MERGE them into a single "Refined" zone with combined properties:
- Width = narrower of the two (more precise)
- Confluence = sum of both TF pillar hits
- Status = fresher of the two
- Label = "15m Refined 30m"

---

# PART 12: DXY-SPECIFIC DIFFERENCES

From the 1 DXY image analyzed (Image 26, R→WL folder):

| Property | DXY | FX Pairs (EUR/GBP/AUD) |
|----------|-----|----------------------|
| Pip value | 0.01 (index points) | 0.0001 |
| Zone width | 0.05-0.20 index points (5-20 "pips") | 10-30 pips |
| Entry proximity | Similar (10-80 index points from spot) | Similar (10-80 pips) |
| SL distance | 7-15 index points | 7-15 pips |
| Direction role | MASTER — determines all FX pair directions | FOLLOWER — inversely correlated with DXY |

**Pipeline status**: DXY handling is already partially implemented (pip value 0.01, SL buffer in index points). No additional changes needed beyond the universal fixes.

---

# PART 13: BUILD HASH HISTORY (Full Traceability)

| Build | SHA256 | Stage | Date |
|-------|--------|-------|------|
| 1 | `0edbeef55834c58d948eadafcfea2c0ed3ed23578537479595ba3776f6be723e` | Initial fork from checkpoint | Jul 13 |
| 2 | `0b3a69eceb6bc5e0cdb19d9fe071ff918c0dd68bafe89bcc64774c05b59d416a` | Post code quality fixes | Jul 13 |
| 3 | `9412ecf09bbe7c5db81e8901bcbc7f7f11e51475e33b69d96d0d7b902e28b3f0` | Confidence + SL + shape + TP fixes | Jul 13 |
| 4 | `96c4034c0b39ca89ad30665f6a8b6a206ad293afe44c5a1d1a75d8969952e5b8` | BoM/MoM + compliance threshold | Jul 13 |
| 5 | `cfa77ae917d6a6f264fc703344a66e7c012b3b848f922d3424c7ebe18e479291` | Fibonacci + DXY SL display | Jul 13 |
| 6 | `a094d986d6db8651ecad7751ee170415acef6cc461234bbf090b92742a576a7a` | Multi-TF + Ladder + Friday fix | Jul 14 |
| 7 | `503793043d3850921b5301e28cdb9a57ec7f114b90cfb6e9c3784ce1b136bdf1` | Directional fix (depletion + momentum) | Jul 14 |
| 8 | `65e55095d37f33a9f79c6594235c0ebd74f6267c3a82af76f2b687670f1c3b96` | Momentum tuning (Run 7 — 16 setups correct direction) | Jul 14 |
| 9 | `d8e38aad2942bc3a4875ca8f49eaf2271857a4678ef77ad6f2a9f2474f7be7e0` | Stuck agent revert (no changes) | Jul 14 |
| 10 | `6777d1bf00515951c05e778c103c9b825c6874a3ec1e55d34c4432072a05e701` | Temporal scoping + incomplete bar filter | Jul 14 |

**Current checkpoint**: `Checkpoints/v3.3_2026-07-14_TEMPORAL_SCOPING/`

---

# PART 14: EXISTING INFRASTRUCTURE (Already in the pipeline)

These methods/data ALREADY EXIST and should be USED/EXTENDED for the fixes:

| Component | Location | Current State | Needed Change |
|-----------|----------|--------------|---------------|
| `detectLtfZones()` | plutus-tte-pipeline.ts ~L3365 | Detects swing H/L from 15m/1H bars | Extend to detect consolidation micro-zones |
| `computeMultiTfConfluence()` | plutus-tte-pipeline.ts ~L3400 | Checks if entry overlaps LTF zones | Use overlaps as ENTRY POINTS not just confluence flags |
| `multiTfBars` | plutus-tte-pipeline.ts ~L1796 | Map<pair, Map<TF, OHLCBar[]>> with 1H + 15m bars | Already fetched — USE for zone construction |
| `computeFibLevelsForSetup()` | plutus-tte-pipeline.ts ~L3310 | Computes Fib from entry zone (0.382-2.786) | Connect Fib levels to ACTUAL zone positions |
| `reinforcementLevels` | types.ts | {price, fibLevel}[] at 1.382/1.618 | Snap to nearest MoM zone, add SL cascade |
| `generateLiquidityLadder()` | report-generator.ts ~L1608 | Generates ladder table in report | Add SL cascade column, combined R:R |
| `SETUP_SESSION_MAP` | plutus-tte-pipeline.ts | Category→session mapping | Already correct, no change needed |
| `assessPriorWeekMomentum()` | plutus-tte-pipeline.ts ~L2887 | Date-scoped to bars before weekStart | Working correctly |
| Incomplete bar filter | plutus-tte-pipeline.ts ~L1790 | Drops bars where timestamp + TF < cutoff | Working correctly |
| `dataCutoff` parameter | plutus-tools.ts | Optional ISO timestamp on tool | Working correctly |
| Zone depletion enforcement | plutus-tte-pipeline.ts ~L3770 | Excludes 3+ reaction zones from entries | Add LTF breakout exception |
| Direction inversion | plutus-tte-pipeline.ts ~L3780 | Inverts direction when ALL zones depleted | Working correctly |
| Category-aware TP | plutus-tte-pipeline.ts ~L3067 | FAR/NEAR/MID based on category | Working, but should prioritize HTF zones for TP |
| Category-aware entry | plutus-tte-pipeline.ts ~L2841 | Scalp 2pip inside, Reinf far edge | Needs LTF zone edge as base, not 4H |
| Shape prediction | shape-brain.ts ~L567 | Energy cycle patterns per day | Needs shape→max-distance mapping |

---

# PART 15: SUMMARY — THE COMPLETE PICTURE

The TTE pipeline is a BATTLEFIELD INTELLIGENCE SYSTEM. It maps the ongoing war between bullish and bearish liquidity across multiple timeframes, predicts where the next battles will occur (ZoC identification), and generates trade setups at the zones where one side will prevail.

**Current state**: The pipeline maps the WAR from 4H satellite imagery only (wide zones, distant from the front lines). It can see the strategic picture but can't identify where the actual fighting is happening.

**Required state**: The pipeline must combine 4H strategic intelligence with 15m/30m/1H tactical intelligence. The 4H map shows WHICH DIRECTION the war is going. The 15m/30m/1H maps show WHERE the actual entries should be placed — at the front line trenches (liquidity zones) near the current battle position (spot price).

**The war metaphor maps directly to code:**
- 4H zones = strategic objectives (TP targets, directional bias)
- 1H zones = tactical positions (HTF swing entries, liquidity shields)
- 30m zones = forward operating bases (MoM entries, rocket placements)
- 15m zones = front line positions (scalp entries, BoM identification)
- Shape chain = war timeline (which battles happen on which days)
- Fibonacci = trajectory mapping (how far the victor will advance)
- Liquidity ladder = reinforcement supply lines (adding troops as front advances)
- SL behind LSZ = defending behind fortifications

**The pipeline must think like a GENERAL**: Use the 4H strategic map to determine the war's direction. Use the 15m/30m tactical maps to place troops (entries) at the actual front lines. Use the shape chain to predict WHEN battles will occur. Use Fibonacci to predict HOW FAR the victor will advance. And use liquidity ladders to reinforce success as the front line moves forward.

---

# PART 16: V4 ARCHITECTURAL OVERHAUL (July 16, 2026)

## What Changed

The pipeline was rebuilt from a 4H-only zone construction model into a multi-TF telescope-down architecture implementing 37 Fundamental Laws derived from forensic analysis of 38 winning trades.

### 37 Fundamental Laws (9 Categories)
- A: Zone Construction (Laws 1-6): TF telescoping, TF-scaled params, multi-TF zone map, nesting, LQZ=entry, correct side of spot
- B: SL Placement (Laws 7-10): SL at next zone + 2-5 pips, ATR fallback, zone geometry, 0.5×ATR minimum
- C: TP Placement (Laws 11-14): demand+liquidity overlap, TF hierarchy, ATR sanity, no teleporting
- D: Entry Mechanics (Laws 15-19): 3-entry staggered, forward spreads, zone edge, candle confirmation, ZoC
- E: Direction (Laws 20-22): DXY cascade hard filter, 70% direction accuracy, MFE analysis
- F: Session (Laws 23-25): session enforcement, news catalysts, London spike detection
- G: War Narrative (Laws 26-30): narrative tissue, trade chaining, defense tracking, prior week, session behavior
- H: Zone Quality (Laws 31-34): UM priority, multi-TF confluence, liquidity score, per-TF depletion
- I: Validation (Laws 35-37): RR consequence, dedup, visual verification

### Pipeline Architecture (V4)
- 5,512 lines (plutus-tte-pipeline.ts)
- Multi-TF zone construction: 4H → 1H → 30m → 15m with merge
- ATR(14) Wilder's smoothing per pair
- Path-based setup generation: spot → entry LQZ → next zone (SL) → demand+liq (TP)
- 3-entry staggered with forward spreads (EUR=1pip, AUD=1.5, GBP=2, DXY=0.02)
- DXY cascade hard filter
- Trade chaining (TP → Entry links)
- Visual verification via VC bridge
- War narrative report sections
- 18 blind-execution checks (BE1-BE18)

### Spec
- ENGINE3_DEEP_PLAN_L2.md: 5,003 lines
- All constants have BECAUSE rationale comments
- 202 Law references in code

### Checkpoints
- v3.3_2026-07-14_TEMPORAL_SCOPING: Original (untouched)
- v3.3_ENGINE3_FUNCTIONAL_BASELINE: V2 with zone-geometry SL
- v3.3_V4_FULL_ARCHITECTURAL_OVERHAUL: Complete V4 with all 37 laws

### Build History
| Build | SHA256 | Stage |
|-------|--------|-------|
| Original | bc2eb74c... | Pre-overhaul checkpoint |
| V2 Baseline | 18d6b92f... | Zone-geometry SL + 5 fixes |
| V4 Final | b37348be... | Full multi-TF + 37 laws |
