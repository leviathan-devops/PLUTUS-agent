# PLUTUS AGENT — FULL COMPACTION PROOF BUILD REPORT
**Date**: 2026-07-18 (UPDATED)  
**Status**: Engine 1 + Engine 2 + Engine 3 + Identity + LQZ/S/D Detection BUILT. 6 setups passing (DXY=3, EUR=3). GBP/AUD still 0. LQZ still not producing zones in pipeline. Rate limit fixed (opencode-zen/mimo-v2.5-free).  
**SHA256**: `840f4aaa8c9b438d5657d7d63bfe4b1543e7ad6c7f894d991082437b3ba4e5e7`

---

# PART 1: THE CORE MISSION (What We're Actually Building)

The PLUTUS TTE (Trident Trading Engine) is a **3-engine autonomous trading agent** that generates A+ weekly trading reports. It must predict price action across 4 pairs (DXY, EUR/USD, GBP/USD, AUD/USD) with surgical precision — entries at 0-50 pips from spot, SL at 5-15 pips, TP at opposing zones.

**The user's manual trading strategy is the GOLD STANDARD.** The pipeline must reproduce it exactly. The user has shown me the exact trades via screenshots and explained every rule. The pipeline is NOT inventing a strategy — it is codifying the user's existing, proven strategy.

**Architecture: 1D → 2D → 3D**

```
Engine 1 (1D): IP Pressure Zones from DATA + 4H S/D Zones from DATA + LQZ from DATA
    → WHERE is institutional liquidity? (battlefield map)
    → MUST be data-driven. MUST NOT be visual.
    → Status: FIXED (BoM/MoM classification, 6-dim confluence, zone limit, synthetic zones removed)
    → S/D zones: FIXED (singular origin candle, not consolidation cluster)
    → LQZ zones: BUILT (3 patterns: sweep, wick, consol) but NOT producing zones in pipeline

Engine 2 (2D): Macro Shape Chain from Engine 1 + 1H bars
    → WHAT path will price take? (war timeline: SS→BS→WL→RWL)
    → MUST be data-driven. MUST NOT be visual.
    → Status: FIXED (ZFP conditioning, MoM tree, day decomposition, chain termination, session override)

Engine 3 (3D): Visual Trade Setup Intelligence on TOP of Engine 1 + Engine 2
    → WHERE EXACTLY do we enter/exit? (sniper entries, SL, TP)
    → MUST use VISUAL intelligence (chart screenshots + VLM candlestick analysis)
    → SUPERIMPOSES on Engine 1 + 2. Does NOT replace them.
    → Status: BUILT (TvChartController + VisualZoneLobe + VisualSetupGenerator). NOT YET TESTED.
    → Direction: FIXED (zone type, not storylineBias)
    → TP: FIXED (entry side, not spot side)
    → SL: FIXED (SL-cap-aware fallthrough)
    → Direction retry: FIXED (retry opposite direction when locked yields 0)
    → Zone eligibility: FIXED (>= / <= instead of > / <)
```

**ZONE OWNERSHIP (CLEAR SEPARATION)**:
- **Engine 1 Pipeline A: IP zones** (9-pillar data analysis) → feed Engine 2 shapes
- **Engine 1 Pipeline B: S/D/L zones** (candlestick patterns from data) → feed Engine 3 trade setups
- Both are data-mapped initially, then visual verification separates signal from noise
- IP zones forward-map PRICE ACTION (how price will move through the week)
- S/D/L zones forward-map E/SL/TP points (where to enter, stop, target)

**ZONE COLORS (CORRECT)**:
- **Demand Zone = BLUE** (order block candle that precedes a strong bullish breakout)
- **Supply Zone = RED** (order block candle that precedes a strong bearish breakout)
- **Liquidity Zone (LQZ) = GREEN** (candle body edge to end of wick on liquidity sweep candles)

---

# PART 2: WHAT'S BUILT AND VERIFIED (Do Not Touch)

## Engine 1: IP Pressure Zones (FIXED — 18 bugs corrected)

| Fix | What Changed | Status |
|-----|-------------|--------|
| E1-1 | BoM/MoM structural classification restored (removed distance-based override) | ✅ DONE |
| E1-2 | IP pressure zones separated from S/D execution zones | ✅ DONE |
| E1-3 | Terminology: "Beginning of Move" / "Middle of Move" | ✅ DONE |
| E1-4 | Reaction counter starts at 0 | ✅ DONE |
| E1-5 | 9-pillar: weekly pivots, 12 MAs, derivatives arena, strike→DXY, 6-dim confluence | ✅ DONE |
| E1-6 | engine3Status preserved | ✅ DONE |
| E1-7 | Zone limit removed (was 4, now ALL zones) | ✅ DONE |
| E1-8 | 6-dim confluence scoring used in synthesis-lobe | ✅ DONE |
| E1-9 | Synthetic zone fabrication removed | ✅ DONE |
| E1-10 | Reaction counter off-by-one fixed (3 = depleted) | ✅ DONE |
| E1-11 | MoM promotion threshold 3→6 | ✅ DONE |

**Files**: `src/brains/4h-sd-lobe.ts`, `src/brains/9-pillar-lobe.ts`, `src/brains/synthesis-lobe.ts`, `src/brains/bom-mom-lobe.ts`, `src/constants/trading-constants.ts`

## Engine 2: Macro Shape Chain (FIXED — 12 bugs corrected)

| Fix | What Changed | Status |
|-----|-------------|--------|
| E2-1 | ZFP-conditioned chain uses directional target zone | ✅ DONE |
| E2-2 | MoM decision tree ZFP semantics corrected | ✅ DONE |
| E2-3 | REVERSAL_ENTRY at MoM removed | ✅ DONE |
| E2-4 | Day decomposition Monday included | ✅ DONE |
| E2-5 | Chain termination 25% floor | ✅ DONE |
| E2-6 | Session override deleted | ✅ DONE |

**File**: `src/brains/shape-brain.ts` (1,341 lines)

## Engine 3: Visual Intelligence (BUILT)

**Files**:
- `src/engine3/types.ts` (145 lines)
- `src/engine3/visual-zone-lobe.ts` (841 lines)
- `src/engine3/visual-setup-generator.ts` (1,181 lines)
- `src/engine3/tv-chart-controller.ts` (254 lines)
- `src/engine3/tv-chart-image-fetch.ts` (354 lines)

**Fixes applied**:
- Direction: zone type, not storylineBias ✅
- TP: entry side, not spot side ✅
- SL: SL-cap-aware fallthrough (LQZ → IP zone → last resort) ✅
- Direction retry: retry opposite direction when locked yields 0 ✅
- Zone eligibility: >= / <= instead of > / < ✅
- Fallback zone typing: preserve IP zone polarity ✅
- LQZ dual-edge emission: both near + far edges ✅
- TP last resort: 2R projection or ATR ✅
- Setup categories: SS/BS/RWL/Whiplash (not just HTF Swing) ✅
- AUD category gate: allow SWING_SCALP ✅
- RRR unification: generator + firewall use same constants ✅

## LQZ Detection (BUILT — 3 patterns, 886 lines)

**File**: `src/brains/lqz-lobe.ts`

**3 Patterns**:
1. **Type 1 — LIQUIDITY_SWEEP**: 2 back-to-back thick candle bodies that BREAK a support/resistance level with EXTENDED wicks, then price REVERSES
2. **Type 2 — LONG_WICK**: Long wick (≥2.5× body, ≥5 pips) immediately preceding a sharp move (≥15 pips or 1.5×ATR)
3. **Type 3 — SHORT_WICK_CONSOL**: 3+ candles in compressed range whose short wick tips align

**Confirmation Rule**: Zone only emitted when 2+ pattern types align on a horizontal line.

**Smoke Test**: 18/18 PASS

**PIPELINE STATUS**: NOT producing zones. ATR sequencing fix applied (moved ATR computation before constructAndMergeMultiTfZones) but NOT VERIFIED. Root cause analysis says LQZ function likely not being called or producing 0 zones on real data.

## S/D Zone Construction (FIXED)

**File**: `src/brains/4h-sd-lobe.ts` (706 → 570 lines)
- Singular origin candle (not consolidation cluster) ✅
- BoM = origin of move, MoM = continuation ✅
- Noise rejection: width > TF max → excluded ✅

## Identity System (FULLY WIRED)

- 6-section identity header with CLEAR+REBUILD injection ✅
- Tool allowlist: trading only (no coding agent tools) ✅
- Agent config hook: registers plutus with opencode ✅
- Compacting hook: context survival ✅
- Model: `opencode-zen/mimo-v2.5-free` ✅
- Container image: `plutus-container-testing:latest` (committed with opencode-zen config) ✅

## RRR Unification (FIXED)

**File**: `src/constants/trading-constants.ts`
- `RRR_BY_CATEGORY` single source of truth ✅
- `rrrForCategory()` used by generator + firewall + pipeline ✅

---

# PART 3: CURRENT PIPELINE OUTPUT

**Last successful run**: 2026-07-18 (opencode-zen/mimo-v2.5-free)

| Pair | Zones | Raw | Passed | Rejected |
|------|-------|-----|--------|----------|
| DXY | 61 | 10 | **3** | 2 (RRR-1) |
| EUR/USD | 56 | 10 | **3** | 1 (RRR-1) |
| GBP/USD | 59 | **0** | 0 | 0 |
| AUD/USD | 65 | **0** | 0 | 0 |

**Total**: 6 setups pass firewall (was 0 before all fixes). But GBP/AUD still 0.

---

# PART 4: WHAT'S STILL BROKEN

## BLOCKER 1: GBP/USD + AUD/USD Produce 0 Raw Setups

**Problem-Solving Tool Analysis** identified these root causes:

1. **RC1 — constructBasicSetups collapses Python triple-loop**: The TypeScript implementation only processes ONE shape (currentShape), not ALL 5 days from day decomposition. This means if currentShape doesn't produce viable categories for GBP/AUD, ALL setups are skipped.
   - BUT: The visual-setup-generator DOES iterate day decomposition (line 229). So this may be fixed for the visual path.
   - The issue is likely that the visual-setup-generator IS iterating days but still produces 0 because:
     - Direction resolves to LONG but all zones are above spot (or vice versa)
     - TP computation returns null (one-sided maps)
     - SL computation exceeds cap

2. **RC2 — SHAPE_CATEGORIES is global, not pair-aware**: AUD/USD only allows BS/WL categories. If currentShape is SS, AUD gets 0 viable categories.
   - Fix was applied (AUD now allows SWING_SCALP). But AUD still produces 0.

3. **RC3 — Two setup generators exist**: Legacy `constructBasicSetups` (deprecated, fallback removed) and `visualSetupGenerator.generateSetups()` (active). The active path IS being called for all 4 pairs.

4. **RC4 — Post-filter collapse**: 10 raw → 3 final for DXY/EUR due to dedup or confidence < 50.

5. **RC5 — LQZ detection not producing zones**: Code exists, passes tests, but produces 0 zones in pipeline. Zone counts identical (61, 56, 59, 65) before and after LQZ fix.

**THE MOST LIKELY ROOT CAUSE**: The visual setup generator IS being called for all 4 pairs. But for GBP/AUD, it produces 0 because:
- The `visualZoneLobe.identifyZones()` produces zones that are ALL on one side of spot
- The direction resolution locks ONE direction per day
- With ALL zones on one side, the locked direction has 0 eligible zones
- The direction retry fix should retry opposite direction, but may not be working correctly
- OR: the zones are on BOTH sides but the SL/TP computation returns null for all of them

**WHAT TO DO NEXT**: Add debug logging to the visual setup generator to see EXACTLY what's happening for GBP/AUD:
- How many visual zones are produced?
- What direction is resolved?
- How many eligible zones?
- Why are setups skipped (SL null? TP null? RRR too low?)

## BLOCKER 2: LQZ Detection Not Producing Zones in Pipeline

**Root Cause Analysis** (from problem-solving tool):
- ATR sequencing fix applied (moved ATR computation before constructAndMergeMultiTfZones)
- But LQZ still not producing zones
- The ATR is now computed BEFORE zone construction
- But the LQZ detection might be failing because:
  - The `detectLiquidityZones()` function is returning 0 zones on real 1H data
  - The 3 patterns (sweep, wick, consol) are not being detected
  - The confirmation rule (2+ patterns must align) is too strict
  - The function is throwing an exception that's caught silently

**WHAT TO DO NEXT**: Add debug logging to LQZ detection:
- Log the number of patterns detected per type
- Log the number of aligned groups
- Log the number of confirmed zones
- Log any exceptions

## BLOCKER 3: RRR-1 Rejections (10 raw → 3 passed)

DXY: 2 rejected (RRR 2.41 and 2.13 < 2.5 for HTF Swing)
EUR: 1 rejected (RRR 2.28 < 2.5 for HTF Swing)

The RRR unification fix changed the minimums to:
- HTF Swing: tp1=2.0, blended=3.0
- But the firewall is still rejecting at 2.5

**Root Cause**: The firewall's RRR-1 rule may not be using `rrrForCategory()`. It may still have a hardcoded 2.5 minimum.

**WHAT TO DO NEXT**: Check if the firewall's RRR-1 rule is using `rrrForCategory()`.

---

# PART 5: CRITICAL CODE LOCATIONS

## Pipeline
- `src/engine/plutus-tte-pipeline.ts` (5,692 lines)
- `execute()` — main pipeline entry point
- `constructAndMergeMultiTfZones()` — multi-TF zone construction + LQZ detection (line 3144)
- `computeATR()` — ATR(14) on 1H bars (line 3345)
- Visual setup generator call: line 936
- Fallback removed: line 947

## Engine 1
- `src/brains/4h-sd-lobe.ts` (570 lines) — S/D zone construction (singular origin candle)
- `src/brains/9-pillar-lobe.ts` (2,371 lines) — 9-pillar analysis
- `src/brains/synthesis-lobe.ts` (610 lines) — Zone assembly
- `src/brains/lqz-lobe.ts` (886 lines) — LQZ detection (3 patterns)

## Engine 2
- `src/brains/shape-brain.ts` (1,341 lines)

## Engine 3
- `src/engine3/visual-zone-lobe.ts` (841 lines)
- `src/engine3/visual-setup-generator.ts` (1,181 lines)
- `src/engine3/tv-chart-controller.ts` (254 lines)

## Supporting
- `src/types.ts` (923 lines)
- `src/constants/trading-constants.ts` (1,255 lines)
- `src/semantic-firewall/index.ts` (1,312 lines)
- `src/semantic-firewall/rrr-rules.ts` — RRR rules (check if using rrrForCategory)
- `src/report/report-generator.ts` (1,994 lines)

---

# PART 6: THE 8 WINNING DXY TRADES (July 6-10, 2026)

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

---

# PART 7: THE 3 TYPES OF LQ CANDLES

**Type 1 — LIQUIDITY_SWEEP**: 2 back-to-back thick candle bodies that BREAK a support/resistance level with EXTENDED wicks, then price REVERSES back. VERY DISTINCT VISUAL PATTERN.

**Type 2 — LONG_WICK**: Long wick (≥2.5× body, ≥5 pips) immediately preceding a sharp move (≥15 pips or 1.5×ATR).

**Type 3 — SHORT_WICK_CONSOL**: 3+ candles in compressed range (span ≤25 pips) whose short wick tips (≤3 pips) align at the same level within 2 pips.

**CONFIRMATION RULE**: A liquidity zone is only emitted when 2 or all 3 pattern types align on a HORIZONTAL LINE. Single-pattern hits are discarded.

---

# PART 8: CHECKPOINTS

1. `Checkpoints/v3.3_COMPACTION_PROOF_2026-07-18/` — Full source + data + build report
2. `Checkpoints/v3.3_OPENCODE_ZEN_CONFIG/` — opencode-zen config files
3. `Checkpoints/v3.3_LQZ_ANALYSIS_COMPLETE/` — LQZ analysis complete
4. `Checkpoints/v3.3_18_BUG_FIXES/` — 18 bug fixes
5. `Checkpoints/v3.3_IDENTITY_WIRED_BASELINE/` — Identity wired

**Docker image**: `plutus-container-testing:latest` (with opencode-zen/mimo-v2.5-free)

**Canonical config**: `Checkpoints/v3.3_OPENCODE_ZEN_CONFIG/config.json`

---

# PART 9: IMMEDIATE NEXT STEPS (After Compaction)

## Step 1: Fix GBP/AUD 0-Setup Issue

The visual setup generator IS being called for all 4 pairs but produces 0 for GBP/AUD. The fix requires:

1. **Add debug logging** to `visualSetupGenerator.generateSetups()` to see what's happening for GBP/AUD:
   ```typescript
   log.info(`  [engine3-gen] ${pair}: day=${dayLabel} shape=${shape} direction=${direction} categories=${categories.length} eligibleZones=${eligibleZones.length}`);
   ```

2. **Check why eligibleZones is 0** for GBP/AUD:
   - Are the visual zones on the wrong side of spot?
   - Is the direction locked to a side with no zones?

3. **Check why SL/TP computation fails** for GBP/AUD:
   - Is SL exceeding cap?
   - Is TP returning null?

4. **Verify direction retry works**: When the locked direction yields 0, retry with opposite.

## Step 2: Fix LQZ Detection in Pipeline

The LQZ detection code exists and passes 18/18 tests but produces 0 zones in pipeline.

1. **Add debug logging** to `detectLiquidityZones()`:
   ```typescript
   log.info(`  [lqz] ${pair}: bars=${bars.length} hits=${hits.length} groups=${groups.length} zones=${zones.length}`);
   ```

2. **Check if patterns are detected** on real 1H data:
   - The 3 pattern detectors might be too strict
   - The confirmation rule (2+ patterns align) might be filtering everything

3. **Check if ATR is available** when LQZ runs:
   - ATR was moved before constructAndMergeMultiTfZones
   - But the LQZ function computes its own ATR internally

## Step 3: Fix RRR-1 Rejections

The firewall still rejects setups with RRR < 2.5 for HTF Swing.

1. **Check if firewall uses `rrrForCategory()`**:
   - `src/semantic-firewall/rrr-rules.ts` should use `rrrForCategory()` not hardcoded minimums

## Step 4: Deploy and Test

```bash
# Build
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Manta Agent/Active_Projects/PLUTUS_AGENT"
bun build src/index.ts --outdir dist --target bun --format esm --bundle

# Deploy
docker cp dist/index.js trident-plutus-agent:/root/plutus-src/dist/index.js
docker exec trident-plutus-agent bash -c "cp /root/plutus-src/dist/index.js /root/.config/opencode/plugins/plutus-engine/dist/index.js"

# Run
docker exec -i trident-plutus-agent bash -c "tmux send-keys -t plutus:0 'generate a TTE report for week 2026-07-06 with data cutoff 2026-07-06T09:00:00-04:00' Enter"
```

---

# PART 10: THE USER'S FRUSTRATION PATTERNS

1. **"STOP FUCKING LOOPING"** — I keep checking the same diagnostic logs over and over. USE THE PROBLEM-SOLVING TOOL to find root causes, don't loop grep commands.

2. **"Engine 3 produces zones FROM CANDLESTICKS, NOT from Engine 1 IP zones"** — Engine 3's visual zone lobe should analyze candlestick patterns, not use Engine 1 IP zones.

3. **"constructBasicSetups should be REPLACED"** — The fallback to constructBasicSetups is REMOVED. Visual setup generator is MANDATORY.

4. **"opencode-zen/mimo-v2.5-free is the correct model"** — Don't waste time testing other models. Use opencode-zen.

5. **"S/D zones = ONE single order block candle"** — Not consolidation clusters.

6. **"LQZ = 3 patterns with confirmation"** — Not just "long wick > 2× body".

7. **"Zone count < 20 tradeable, < 50 total, 75 hard ceiling"** — Don't produce 500+ zones.

8. **"IP zones feed Engine 2, S/D/L zones feed Engine 3"** — Clean separation.

9. **"Data computation initially, then visual verification"** — Not visual-only.

10. **"BE AN INTELLIGENT SENIOR ENGINEER"** — Find root causes, don't loop diagnostics.

---

**END OF BUILD REPORT**
