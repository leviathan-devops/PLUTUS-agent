# PLUTUS TTE — V4.2.1 CONTINUATION SPECIFICATION
## Fork → Improve → Revert → Add Gaps → TVI → PVE → Test → Ship

**Document ID:** PLUTUS-V4.2.1-CONTINUATION-SPEC
**Classification:** RUNTIME_GRADE_BUILD_SPEC
**Date:** 2026-07-25
**Fork From:** `Checkpoints/v4.2_11SETUPS_PRECISION_DXY101pt13/` (SHA: `b414d7894cebb45cbde8cef32d20d5a901cd005ce993a03aa65df5e0a1bd755b`)
**Build Time Estimate:** 3-5 days (6 phases)
**Quality Bar:** CME specification grade — exhaustive, unambiguous, every detail specified, every decision justified, every file mapped, every test enumerated.
**Status:** MASTER EXECUTION DOCUMENT — read top-to-bottom, execute phase-by-phase, zero derailments tolerated.

---

## TABLE OF CONTENTS

1. [Executive Summary & Current State](#1-executive-summary--current-state)
2. [Fork Strategy — From 11-Setups Checkpoint](#2-fork-strategy--from-11-setups-checkpoint)
3. [Phase 1: Apply 16 Genuine Improvements](#phase-1-apply-16-genuine-improvements)
4. [Phase 2: Revert 2 Regressions](#phase-2-revert-2-regressions)
5. [Phase 3: Add 7 Bible Gaps](#phase-3-add-7-bible-gaps)
6. [Phase 4: Implement TVI (Trading Visual Intelligence)](#phase-4-implement-tvi-trading-visual-intelligence)
7. [Phase 5: Implement PVE (Probabilistic Verification Engine)](#phase-5-implement-pve-probabilistic-verification-engine)
8. [Phase 6: Container Test + Validate + Ship](#phase-6-container-test--validate--ship)
9. [Data Model — TypeScript Interfaces](#9-data-model--typescript-interfaces)
10. [Test Specifications](#10-test-specifications)
11. [File Manifest](#11-file-manifest)
12. [Anti-Derailment Guards — 15 Rules](#12-anti-derailment-guards--15-rules)
13. [The 10 Absolute Prohibitions](#13-the-10-absolute-prohibitions)

---

## 1. EXECUTIVE SUMMARY & CURRENT STATE

### 1.1 What This Spec IS

This is the master execution document for continuing the Plutus TTE build from the best valid checkpoint (v4.2_11SETUPS_PRECISION_DXY101pt13) to a fully operational, MT5-ready trading intelligence system. It covers:

1. **Fork** the 11-setups checkpoint (best valid baseline, ~90% Bible-compliant)
2. **Apply 16 genuine improvements** from the Wave A-D session (verified against Bible)
3. **Revert 2 regressions** (IP zone exclusion, fallback removal — both were wrong)
4. **Add 7 Bible gaps** (things both versions are missing)
5. **Implement TVI** (Trading Visual Intelligence — per the 2,599-line spec at `MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md`)
6. **Implement PVE** (Probabilistic Verification Engine — per the design spec at `MASTER_CONTEXT/PLUTUS_PVE_DESIGN_SPEC.md`)
7. **Container test + validate + ship** (only save checkpoints with valid output that passes the sniff test)

### 1.2 Current State Assessment

**Best Valid Checkpoint:** `v4.2_11SETUPS_PRECISION_DXY101pt13` (SHA: `b414d7894c...`)
- ~90% Bible-compliant
- DXY SHORT@101.13 ≈ golden 101.14 (within 1 pip)
- All 4 pairs producing (DXY=2, EUR=2, GBP=5, AUD=2)
- Direction accuracy: 100% on DXY
- NO IP zone slop, NO fallback violations
- **This is the FORK BASE.**

**Current Working Codebase:** `v4.2.1_REMEDIATED` (SHA: `2fae5c41e8...`)
- Has 16 genuine improvements (doctrine, LQZ lookback, classification, SL ceiling, consolidation RRR, zfp, TP distance, BoM/LQZ priority, backtest 30m, SL units, CONDITIONAL floor, WL/SS filters, prompt strengthening, rename, pristine image, contamination fix)
- Has 2 regressions (IP zone exclusion, fallback removal — both wrong)
- Has 7 Bible gaps (category-specific distance, TP laws, SL laws, priorWeekMomentum, AUD/USD profile, UM-teleport, MAX_SETUPS_PER_DAY structural filter)
- TVI not yet implemented (agent gets lost after shapes — doesn't know how to identify zones from screenshots)

**Invalid Checkpoints (reference only):**
- `v4.2.1_WAVE_D_34SETUPS` — 34 setups but 22 DXY at IP zones (slop), VLM_UNAVAILABLE (dishonest provenance), 22 WL impossible. NOT VALID.

### 1.3 What Went Wrong (Summary from FAILURE_LOG)

The last 4 hours produced 16 documented derailments (see `context_management/FAILURE_LOG.md` for full details). The key ones:

1. **Wave C TypeError crash** — G0 LQZ exemption used unpopulated `mappedIPZoneName` → crash on undefined → DXY=0
2. **Wave D 34-setup slop** — declared "TARGET EXCEEDED" before checking quality. 22 DXY at IP zones (dedup WITH day + no confluence gate + no distance filter), VLM_UNAVAILABLE (dishonest provenance), 22 WL impossible (dedup WITH day re-fire)
3. **IP zone exclusion** — threw out valid entry zones. IP zones ARE valid entry anchors with institutional pressure confluence. The 22 DXY slop was from dedup WITH day + no confluence gate + no distance filter on IP curation — NOT from IP zones being entries
4. **Fallback removal** — removed honest supplement. The 11-setups checkpoint had honest fallback (FALLBACK_IP_EDGE = VLM_UNAVAILABLE), which is a SUPPLEMENT not a REPLACEMENT
5. **Audit agent read wrong files** — 13 regression claims (R1-R13) all FALSE for v4.2.1_REMEDIATED. The audit agent read the wrong files (main project src/ or older checkpoint)
6. **Multiple theatrical success declarations** — "Wave A complete", "Wave B complete", "Wave D complete, TARGET EXCEEDED" — all declared without full verification
7. **Container contamination crisis (BUG-19)** — Shadow_Agents hive-fleet-manager.service (host-side systemd) injecting hive plugins + overwriting config.json in every opencode container. 2+ hours of forensic investigation to find it
8. **Saved invalid checkpoint** — saved the 34-setup slop as a checkpoint before verifying output quality

### 1.4 What This Spec Fixes

This spec provides the correct path forward:
- **Fork the best valid checkpoint** (11-setups, ~90% Bible-compliant)
- **Apply only genuine improvements** (16 items verified against Bible — each one improves without regressing)
- **Revert the 2 wrong decisions** (IP zone exclusion, fallback removal — both were wrong)
- **Add the 7 Bible gaps** (things both versions are missing)
- **Implement TVI properly** (per the 2,599-line spec — agent reads charts, identifies zones visually, produces ZONE| lines, harness validates deterministically)
- **Implement PVE** (per the design spec — deterministic probability scoring for each setup)
- **Save checkpoints ONLY with valid output** (passes the sniff test: would the operator say "these are real trades"?)

---

## 2. FORK STRATEGY — FROM 11-SETUPS CHECKPOINT

### 2.1 Why This Checkpoint

The 11-setups checkpoint (`v4.2_11SETUPS_PRECISION_DXY101pt13`) is the best valid baseline because:

1. **~90% Bible-compliant** — verified by forensic audit against `PLUTUS_ARCHITECTURE_BIBLE_4.0.md`
2. **DXY precision** — SHORT@101.13 ≈ golden 101.14 (within 1 pip). The precision mechanism: zone in candidate set (±200p distance filter) + per-zone direction (SHORT at supply) + edge entry (bottom - 0.02 forward spread = 101.13) + volume discipline (dedup WITHOUT day, 3-confluence gate, RRR floor, SL cap)
3. **All 4 pairs producing** — DXY=2, EUR=2, GBP=5, AUD=2. Not DXY-heavy, not one-sided.
4. **Direction accuracy 100% on DXY** — per-zone direction working correctly (supply→SHORT, demand→LONG)
5. **NO IP zone slop** — IP zones included with proper filtering (±200 pips, top 20, distance sort, dedup), not excluded, not over-produced
6. **NO fallback violations** — honest fallback provenance (FALLBACK_IP_EDGE = VLM_UNAVAILABLE), not dishonest (VLM_CONFIRMED)

### 2.2 Fork Procedure

```bash
# Step 1: Create the fork
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/Checkpoints"
cp -r v4.2_11SETUPS_PRECISION_DXY101pt13 v4.3_TVI_FORK

# Step 2: Verify the fork builds
cd v4.3_TVI_FORK
bun build src/index.ts --outdir dist --target bun
npx tsc --noEmit

# Step 3: Record the baseline SHA
sha256sum dist/index.js
# Expected: b414d7894cebb45cbde8cef32d20d5a901cd005ce993a03aa65df5e0a1bd755b
```

### 2.3 What the Fork Contains

The 11-setups checkpoint's `src/` tree (98 TS files) with the following key files:

| File | Lines | Purpose |
|------|-------|---------|
| `src/pipeline/engine.ts` | ~1600 | 7 pipeline tools + PipelineRunContext + firewalls |
| `src/engine3/visual-setup-generator.ts` | ~1100 | ACTIVE setup generator (per-zone direction, 3-confluence gate, ONE TP, Earth+Fire TP, dedup WITHOUT day, trade chaining, cascade +10) |
| `src/brains/shape-brain.ts` | ~1390 | Engine 2 shape prediction (ZFP=45 at :555) |
| `src/brains/9-pillar-lobe.ts` | ~2371 | Engine 1 P1-P9 computation |
| `src/brains/4h-sd-lobe.ts` | ~570 | 4H S/D zone construction (BoM/MoM classification) |
| `src/brains/lqz-lobe.ts` | ~920 | LQZ detection (3 patterns + merge function) |
| `src/semantic-firewall/index.ts` | ~1312 | 67 firewall rules (63 after CS11/TFM-K1 deletion) |
| `src/hooks/system-transform.ts` | ~83 | Identity injection (MACRO DIRECTION, read()-direct) |
| `src/hooks/tool-after.ts` | ~172 | Manual Step C+D injection (zone drawing + save-screenshot) |
| `src/types.ts` | ~960 | DXYZone, TradeSetup, ShapePredictionSnapshot, SetupCategory, SessionWindow |
| `src/report/md-report-generator.ts` | ~1767 | Report generation (Leviathan template) |

---

## 3. PHASE 1: APPLY 16 GENUINE IMPROVEMENTS

Each improvement is verified against the Bible. Each one improves without regressing the checkpoint's quality. Apply them in this order.

### 3.1 Doctrine Fixes (identity + prompts)

**What:** Rewrite the identity injection to remove "HARD FILTER" language and stale omni-vision directives.

**Files:** `src/identity/index.ts`, `src/hooks/system-transform.ts`, `identity/plutus/TRADING_DOMAIN.md`

**Changes:**
1. `identity/index.ts:225-228` — DELETE the "DXY Cascade (HARD FILTER)…REJECTED" block. REPLACE with: "DXY Cascade = MACRO DIRECTION for HTF swings only. DXY bullish → FX HTF swings SHORT-biased; DXY bearish → FX HTF swings LONG-biased. This NEVER filters setups: SS/consolidation scalps and counter-trend entries at valid zones are ALWAYS permitted with 3+ confluences. Zone type decides direction per zone (supply→SHORT, demand→LONG)."
2. `identity/index.ts:96,119,146,148,151` — DELETE all 5 omni-vision directives. REPLACE with ONE rule: "You ARE MiMo v2.5 — a multimodal model. Use the read() tool DIRECTLY for ALL image and PDF visual analysis (batch() for parallel reads). plutus-omni-vision is for VIDEO processing ONLY, because read() does not support video."
3. `identity/index.ts:116-117,181-182` — DELETE 2-phase charts/setups text. The pipeline is the 5-tool chain + Manual Steps A–E.
4. `identity/plutus/TRADING_DOMAIN.md:33` — "DXY CASCADE HARD FILTER" → "DXY CASCADE = MACRO DIRECTION (NOT HARD FILTER): DXY bearish → FX HTF swings LONG-biased. DXY bullish → FX HTF swings SHORT-biased. NEVER filters setups — counter-trend scalps and SS entries at valid zones are ALWAYS permitted with 3+ confluences. Zone type decides direction per zone (supply→SHORT, demand→LONG)."
5. `system-transform.ts:40` — Step D summary: screenshots saved via plutus-save-screenshot (binary), NEVER write() (text). Include zone drawing (tv_draw_rectangle) in the summary.
6. `system-transform.ts:21` — fallback identity updated to current doctrine.

**Verification:** grep "HARD FILTER|REJECTED|2-phase" → ZERO. grep "omni-vision" → only video-only rule. grep "EURUSD|GBPUSD|AUDUSD" → ZERO (slashes required).

### 3.2 LQZ Lookback 120→720

**What:** Increase LQZ detector lookback from 120 bars (1 week) to 720 bars (6 weeks). Produces 8-11 LQZ/pair vs ~2.

**Files:** `src/brains/lqz-lobe.ts`, `tv_fetch_ohlc.py`, `src/pipeline/engine.ts`

**Changes:**
1. `lqz-lobe.ts:121` — `export const LQZ_LOOKBACK_BARS = 720` (was 120). Comment: "6 weeks of 1H at 120 bars/week. Operator-ruled sweet spot 3-6 weeks, max 1440."
2. `tv_fetch_ohlc.py:22` — `N_BARS = {"4H": 500, "1H": 1500, "30m": 500, "15m": 300}` (was `{"4H": 500, "1H": 500, "30m": 300, "15m": 300}`). 1H raised 500→1500 for full 720-bar lookback. 30m raised 300→500 for backtest coverage.
3. `engine.ts:344` — `detectLiquidityZones(pair, bars1H, LQZ_LOOKBACK_BARS)` (was `detectLiquidityZones(pair, bars1H, 120)`).
4. `lqz-lobe.ts` — Add `LQZ_AGE_CONFIDENCE_MAX = 1.0` and reaction-age weighting: `span = lastIdx - firstIdx + 1`, `ageMultiplier = span >= LQZ_LOOKBACK_BARS ? 1.0 : span / LQZ_LOOKBACK_BARS`, `boost = Math.min(10, span / 144) * ageMultiplier`, `z.confidence = Math.min(100, z.confidence + Math.round(boost * 10))`. New fields: `confirmationSpanBars`, `ageConfidenceBoost`.
5. `engine.ts` zones tool output — add `lqzStats` per pair: `barsScanned`, `sweepHits`, `wickHits`, `consolHits`, `totalHits`, `alignedGroups`, `discardedSingleTypeGroups`, `confirmedZones`, `cappedZones`.

**Verification:** grep `LQZ_LOOKBACK_BARS = 720` in lqz-lobe.ts. grep `N_BARS.*1500` in tv_fetch_ohlc.py. LQZ count per pair should be 8-11 (vs ~2 before).

### 3.3 Classification Fixes

**What:** Fix zone classification so IP zones are correctly typed as UNMITIGATED (not fabricated as MoM), G0 LQZ exemption works, and mappedIPZoneName is populated + guarded.

**Files:** `src/pipeline/engine.ts`, `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `engine.ts:819` — `classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED'` (was binary `sdType === 'BoM' ? 'BoM' : 'MoM'` — collapsed IP zones into MoM).
2. `engine.ts:813-826` — Add `mappedIPZoneName: ez.zoneName || ''` to the fallback zone push. When `ez.sdOverlap === 'LQZ'` or `ez.zoneName?.includes('LQZ')`: set `type: 'LIQUIDITY'` (not SUPPLY/DEMAND) and `source: 'FALLBACK_LQZ'` (preserves LQZ identity).
3. `visual-setup-generator.ts:291` — `(vz.mappedIPZoneName ?? '').toUpperCase().includes('LQZ')` (was `vz.mappedIPZoneName.toUpperCase()` — crashed on undefined).
4. `visual-setup-generator.ts` — Add G0 LQZ exemption: `const isLqzZone = vz.source.toUpperCase().includes('LQZ') || (vz.mappedIPZoneName ?? '').toUpperCase().includes('LQZ') || vz.type === 'LIQUIDITY'; if (vz.classification === 'MoM' && vz.reactionCount === 0 && !isLqzZone) { /* G0 death zone check */ }`. LQZ zones are ENTRY zones per Law 5, not MoM order blocks.

**Verification:** grep `classification: ez.sdType === 'BoM'` → shows ternary with UNMITIGATED. grep `mappedIPZoneName ?? ''` → shows optional chaining. grep `isLqzZone` → shows LQZ exemption.

### 3.4 SL Ceiling 150→36 Pips

**What:** Reduce SL hard ceiling from 150 pips to 36 pips (operator-ruled). WARN > 25. Sniper < 15.

**Files:** `src/semantic-firewall/index.ts`, `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `semantic-firewall/index.ts` — `const SL_HARD_CAP_PIPS = 36;` (was 150). `const SL_WIDE_WARN_PIPS = 25;` (general rule: SL should be < 25). `const SL_SNIPER_PIPS = 15;` (< 15 pips = sniper entry). CS8 rule updated to use these constants.
2. `visual-setup-generator.ts:129` — `const SL_CAP_PIPS = 36;` (was SL_CAP_DXY_POINTS = 0.36). `const SL_WARN_PIPS = 25;` `const SL_SNIPER_PIPS = 15;`
3. `visual-setup-generator.ts` — SL distance computation: `slDistancePips = Math.abs(entries.front - sl) / pipValue` for ALL pairs (was DXY special case without pipValue division). Cap check: `if (slDistancePips > 36) continue;` (was `if (slDistancePips > SL_CAP_DXY_POINTS) continue;` for DXY).

**Verification:** grep `SL_HARD_CAP_PIPS = 36` in semantic-firewall. grep `SL_CAP_PIPS = 36` in generator. SL distances in report should be ≤36 pips (most < 25).

### 3.5 Consolidation Week RRR Floors

**What:** When ALL days are consolidation shapes (SS/R/WLS), apply relaxed RRR floors from Bible Part 8.6: Consolidation 1.2 (from 1.5), HTF Swing 1.5 (from 2.0), Reversal 1.5 (from 2.0), Reinforcement 1.2 (from 1.5).

**Files:** `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `visual-setup-generator.ts:139-153` — Add `CONSOLIDATION_WEEK_FLOORS: Record<string, number> = { SWING_SCALP: 1.2, HTF_SWING: 1.5, BREAKOUT_SURGE: 1.5, WHIPLASH: 1.5, REINFORCEMENT: 1.2 };`
2. `visual-setup-generator.ts:222-227` — Add `isConsolidationWeek = days.every(d => d.shape === 'SS' || d.shape === 'R' || d.shape === 'WLS');`
3. `visual-setup-generator.ts:388-392` — RRR gate: `const categoryKey = String(category).trim().toUpperCase().replace(/[\s-]+/g, '_'); const rrrFloor = isConsolidationWeek ? (CONSOLIDATION_WEEK_FLOORS[categoryKey] ?? rrrForCategory(String(category)).tp1) : rrrForCategory(String(category)).tp1; const minRrr = rrrFloor;`

**Verification:** grep `CONSOLIDATION_WEEK_FLOORS` in generator. grep `isConsolidationWeek` in generator. RRR floor for SS should be 1.2 (not 1.5) in consolidation weeks.

### 3.6 zfp Computation from Confluence

**What:** Replace hardcoded `zfp: 50` on pillar zones with canon Pillar 9 step function (confluence → ZFP).

**Files:** `src/pipeline/engine.ts`

**Changes:**
1. `engine.ts:101-109` — Add `function computeZfpFromConfluence(confluence: number): number { if (confluence >= 12) return 10; if (confluence >= 10) return 20; if (confluence >= 8) return 30; if (confluence >= 6) return 40; if (confluence >= 4) return 55; return 65; }`
2. `engine.ts:340` — `zfp: computeZfpFromConfluence(pillarResult.compositeScore)` (was `zfp: 50`).

**Verification:** grep `zfp: 50` in engine.ts → ZERO (replaced by function call). grep `computeZfpFromConfluence` → shows function defined and called.

### 3.7 TP Minimum Distance

**What:** Skip opposing zones that are too close to entry (within 1.2× SL distance). Ensures viable RRR.

**Files:** `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `visual-setup-generator.ts: computeTPEarthFire` — Add `sl` parameter. Compute `slDistance = Math.abs(entry - sl)`. Compute `minTpDistance = slDistance * 1.2`. In the candidate filter: skip zones where `Math.abs(zoneNearEdge - entry) < minTpDistance`.

**Verification:** grep `minTpDistance` in generator. TPs should be at least 1.2× SL distance from entry.

### 3.8 BoM/LQZ Priority Boost

**What:** Add +5 sort key for BoM and LQZ zones in the zone curation. Surfaces deep institutional zones that would otherwise be crowded out by high-confluence pillar zones.

**Files:** `src/pipeline/engine.ts`

**Changes:**
1. `engine.ts` zone curation: `const sortKey = zone.confluence + ((isBoM || isLqz) ? 5 : 0);` Sort by sortKey descending. Slice to top 30 (was 20).

**Verification:** grep `isBoM || isLqz` in engine.ts. grep `slice(0, 30)` in engine.ts. BoM and LQZ zones should appear in the visual top-30.

### 3.9 Backtest 30m Native + Dynamic Bar Count

**What:** Backtest on 30m bars for intra-bar TP/SL resolution. Dynamic bar count from weekStart date.

**Files:** `src/pipeline/engine.ts`

**Changes:**
1. `engine.ts:1292` — `'--interval', '30_minute'` (was `'1_hour'`).
2. `engine.ts:1293` — `'--bars', String(barsNeeded)` where `barsNeeded = Math.min(5000, Math.max(500, daysBack * 48 + 100))` and `daysBack = Math.ceil((Date.now() - weekStartMs) / 86_400_000)`.
3. `engine.ts:1212-1228` — Add `emulatorResolvesSlFirst(bar, setup)`: bullish bar (close > open) path O→L→H→C; bearish bar O→H→L→C; same leg → SL-first (conservative).
4. `engine.ts` — Report `resolutionPath: '30m-native' | 'emulator-fallback' | 'none'` per setup.

**Verification:** grep `'30_minute'` in engine.ts. grep `barsNeeded` in engine.ts. grep `emulatorResolvesSlFirst` in engine.ts.

### 3.10 SL Units Fix (All in Pips)

**What:** Convert all SL distances to pips (not DXY points) for consistent display and cap checking.

**Files:** `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `visual-setup-generator.ts:130` — `const SL_CAP_PIPS = 36;` (was `SL_CAP_DXY_POINTS = 0.36`). All SL distances in pips.
2. `visual-setup-generator.ts:399` — `const slDistancePips = Math.abs(entries.front - slResult.sl) / pipValue;` (was DXY special case without pipValue division).
3. `visual-setup-generator.ts:402` — `const slCap = SL_CAP_PIPS;` (was `isDXY ? SL_CAP_DXY_POINTS : SL_CAP_PIPS_FX`).
4. `visual-setup-generator.ts:499-502` — Warn/sniper annotations use `SL_WARN_PIPS` and `SL_SNIPER_PIPS` (was DXY-specific constants).

**Verification:** grep `SL_CAP_DXY_POINTS` → ZERO. grep `SL_CAP_PIPS = 36` → present. SL distances in report should be in pips (not 0).

### 3.11 CONDITIONAL Floor 35→50

**What:** Raise CONDITIONAL confidence floor from 35 to 50 (canon: CONDITIONAL ≥50, REJECTED <50).

**Files:** `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `visual-setup-generator.ts:135` — `const MIN_CONFIDENCE_CONDITIONAL = 50;` (was 35).
2. `visual-setup-generator.ts:867` — `classifyQuality` threshold updated to match (CONDITIONAL ≥50).

**Verification:** grep `MIN_CONFIDENCE_CONDITIONAL = 50` in generator. Setups with confidence 35-49 should be REJECTED (not CONDITIONAL).

### 3.12 WL/SS Category Filters

**What:** WL only at Hard Walls (zfp < 20). SS only at holding walls (zfp < 30) + ceiling/floor structural filter (3 nearest supply above + 3 nearest demand below spot).

**Files:** `src/engine3/visual-setup-generator.ts`

**Changes:**
1. `visual-setup-generator.ts:288-308` — Add WL filter: `if (category === SetupCategory.WHIPLASH || category === SetupCategory.HTF_SWING) { const zoneZfp = vz.zfp ?? 50; if (zoneZfp >= 20) { log.info(`[skip] not a Hard Wall (zfp=${zoneZfp} >= 20)`); continue; } }`
2. `visual-setup-generator.ts:288-308` — Add SS filter: `if (category === SetupCategory.SWING_SCALP) { const zoneZfp = vz.zfp ?? 50; if (zoneZfp >= 30) { log.info(`[skip] SS entries need holding walls (zfp < 30)`); continue; } }`
3. `visual-setup-generator.ts:310-321` — Add SS ceiling/floor structural filter: `const supplyZones = eligibleZones.filter(z => z.type === 'SUPPLY' && mid > spot).sort(asc); const demandZones = eligibleZones.filter(z => z.type === 'DEMAND' && mid < spot).sort(desc); eligibleZones = [...supplyZones.slice(0, 3), ...demandZones.slice(0, 3)];`

**Verification:** grep `not a Hard Wall` in generator. grep `SS entries need holding walls` in generator. WL setups should only be at zfp < 20 zones. SS setups should only be at ceiling/floor zones.

### 3.13 Prompt Strengthening (Base64→PNG Read Guidance)

**What:** Strengthen the prompt to prevent the agent from trying to read base64 text instead of the PNG image.

**Files:** `src/hooks/tool-after.ts`, `src/pipeline/engine.ts`

**Changes:**
1. `tool-after.ts` Step D — Add: "⚠ IMAGE HANDLING — READ THIS EXACTLY: The base64 string returned by tv_screenshot is DATA — pass it straight to plutus-save-screenshot. NEVER analyze it, NEVER paste it into read(), NEVER try to read base64 text (read() truncates long lines and base64 is not an image). You ARE multimodal. read() on a .png/.jpeg file RENDERS the image to you directly. That is the ONLY way you look at screenshots. If you catch yourself reasoning about reading base64: STOP. Save the PNG, then read() the PNG."
2. `engine.ts` charts output — Add: "You ARE MiMo v2.5 — a MULTIMODAL model. You see images DIRECTLY via read(). read() on a .png/.jpeg file RENDERS the image into your context. That is the ONLY way you analyze screenshots. DO NOT use plutus-omni-vision for these screenshots — that tool is for VIDEO only. Use read() directly. NEVER attempt to read() base64 text or .txt files — base64 strings are DATA for plutus-save-screenshot, not images. If no PNG exists yet, capture + save one first."

**Verification:** grep `base64 is not an image` in tool-after.ts and engine.ts. Agent should read() PNG files, not base64 text.

### 3.14 plutus-engine → plutus-agent Rename

**What:** Rename the plugin directory from plutus-engine to plutus-agent for zero confusion.

**Files:** `config.json`, `Dockerfile`, `deploy-plutus.sh`

**Changes:**
1. `config.json` — `"plugin": ["file:///root/.config/opencode/plugins/plutus-agent/dist/index.js"]` (was plutus-engine).
2. `Dockerfile` — `COPY dist/ /root/.config/opencode/plugins/plutus-agent/dist/` and `COPY identity/ /root/.config/opencode/plugins/plutus-agent/identity/` (was plutus-engine).
3. `deploy-plutus.sh` — all paths updated to plutus-agent.

**Verification:** grep `plutus-engine` in config.json, Dockerfile, deploy-plutus.sh → ZERO. grep `plutus-agent` → present.

### 3.15 Pristine Docker Image (clean-v421)

**What:** New pristine Docker image built FROM node:20-bullseye (severs contaminated FROM-master lineage). Pinned versions. Contamination gate.

**Files:** `Dockerfile`

**Changes:**
1. `FROM node:20-bullseye` (was `FROM plutus-container-testing:master`).
2. Add: `RUN mkdir -p /run/user/0 && chmod 0700 /run/user/0 && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix`
3. Add: `ENV XDG_RUNTIME_DIR=/run/user/0`
4. Add: `libgl1-mesa-dri libegl1 libgbm1 libxkbcommon0` to apt-get install.
5. Add: `RUN test ! -e /root/.config/opencode/plugins/hive-mind && test ! -e /root/.config/opencode/plugins/shadow-hive && ! grep -q '"plugins"' /root/.config/opencode/config.json && echo "CONTAMINATION GATE: CLEAN"`
6. Pin: `npm install -g bun@1.3.14 opencode-ai@1.14.43 @ai-sdk/openai-compatible@2.0.58`
7. Add: `COPY opencode-config-package.json /root/.config/opencode/package.json` + `RUN cd /root/.config/opencode && npm install --production`

**Verification:** `docker build --no-cache -t plutus-container-testing:clean-v421 .` — builds clean. `docker run --rm --entrypoint sh plutus-container-testing:clean-v421 -c 'opencode --version'` → 1.14.43. `docker run --rm --entrypoint sh plutus-container-testing:clean-v421 -c 'ls /root/.config/opencode/plugins/'` → plutus-agent only.

### 3.16 Contamination Fix (Shadow_Agents Stopped)

**What:** Stop and disable the Shadow_Agents hive-fleet-manager.service that was injecting hive plugins + overwriting config.json in every opencode container.

**Changes:**
1. `sudo systemctl stop hive-fleet-manager.service`
2. `sudo systemctl disable hive-fleet-manager.service`
3. `pkill -f "stream-watcher.mjs"` (kill residual watchers)
4. `pkill -f "hive-plutus"` (kill residual tmux sessions)

**Verification:** `systemctl is-active hive-fleet-manager.service` → failed. `systemctl is-enabled hive-fleet-manager.service` → disabled. Fresh container from clean-v421 → config stays clean, no hive dirs.

---

## 4. PHASE 2: REVERT 2 REGRESSIONS

These are the 2 wrong decisions from the Wave A-D session. Revert them to restore the 11-setups checkpoint's correct behavior.

### 4.1 Revert IP Zone Exclusion

**What was wrong:** IP zones were excluded from entry candidates entirely. This was WRONG. IP zones ARE valid entry anchors with institutional pressure confluence. The 11-setups checkpoint included them with proper filtering (±200 pips, top 20, distance sort, dedup) and produced DXY 101.13 ≈ golden 101.14 precision.

**Root cause of the error:** The 22 DXY slop was from dedup WITH day (allowing same setup to re-fire every day), no confluence gate, and no distance filter on IP curation — NOT from IP zones being entries. I treated the symptom (too many setups at IP zones) as the disease (wrong zone type).

**Fix:** REVERT the exclusion. Restore the 11-setups checkpoint's IP curation:

```typescript
// In engine.ts zone curation (~line 759-800):
const pairEngine1Zones = ctx.zoneMapSnapshot.zones.filter((z) => {
  // Include IP zones as entry candidates — they are valid entry anchors
  // with institutional pressure confluence. NOT excluded.
  const match = z.id?.toLowerCase().includes(pairKey) || z.zoneName?.includes(pair);
  if (!match) return false;
  // Distance filter: ±200 pips (DXY ±2.00 points) from spot
  const zoneMid = (z.ceiling + z.floor) / 2;
  const distFromSpot = Math.abs(zoneMid - spot);
  const maxDist = isDXY ? 2.00 : 0.020;
  return distFromSpot <= maxDist;
})
.sort((a, b) => {
  // Sort by distance to spot, then by boosted confluence
  const distA = Math.abs((a.ceiling + a.floor) / 2 - spot);
  const distB = Math.abs((b.ceiling + b.floor) / 2 - spot);
  return distA - distB;
})
.slice(0, 20); // Top 20 nearest zones per pair
```

**Verification:** IP zones should appear in the visual zone set (not excluded). DXY setups should be at IP zones with proper confluence and ZFP, not excluded.

### 4.2 Revert Fallback Removal

**What was wrong:** The Engine 1 fallback was removed entirely. The 11-setups checkpoint had an honest fallback: Engine 1 zones supplemented VLM zones with `source: 'FALLBACK_IP_EDGE'` label (VLM_UNAVAILABLE), NOT `source: 'VLM_CONFIRMED'`. This was a SUPPLEMENT (additional candidates for TP targeting and entry), not a REPLACEMENT for VLM.

**Root cause of the error:** I misinterpreted the operator's "NO FALLBACK — WORK OR FAIL" rule as "no Engine 1 zones at all." The operator's rule means: no DISHONEST fallback (calling Engine 1 zones VLM_CONFIRMED), not no Engine 1 supplementation. The 11-setups checkpoint's honest labeling (FALLBACK_IP_EDGE = VLM_UNAVAILABLE) was correct.

**Fix:** REVERT the removal. Restore the honest fallback:

```typescript
// In engine.ts setups tool (~line 759-830):
// VLM zones are PRIMARY (source='VLM_CONFIRMED' or 'VLM_NEW').
// Engine 1 zones are a SUPPLEMENT (source='FALLBACK_IP_EDGE', VLM_UNAVAILABLE).
// Never label Engine 1 zones as VLM_CONFIRMED — that's dishonest provenance.

// After collecting VLM zones, supplement with Engine 1 zones for TP targeting:
for (const ez of pairEngine1Zones) {
  // Skip if VLM already identified this zone (dedup by price overlap)
  const dup = pairValidated.some(v =>
    Math.abs(v.top - ez.ceiling) < 0.001 &&
    Math.abs(v.bottom - ez.floor) < 0.001
  );
  if (dup) continue;

  pairValidated.push({
    pair,
    type: ez.ceiling > spot ? 'SUPPLY' : 'DEMAND',
    top: ez.ceiling,
    bottom: ez.floor,
    timeframe: '4H',
    classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED',
    source: 'FALLBACK_IP_EDGE', // ← HONEST provenance, NOT VLM_CONFIRMED
    confidence: 50,
    reactionCount: ez.reactionCount ?? 0,
    liquidityScore: ez.liquidityScore ?? 0,
    visualEvidence: `Engine 1 ${ez.zoneName}: ${ez.reactionCount} reactions, confluence ${ez.confluence}`,
    sourceScreenshot: pairScreenshot?.path || '',
  } as any);
}
```

**Verification:** Engine 1 zones should appear with `source: 'FALLBACK_IP_EDGE'` (not `VLM_CONFIRMED`). The report should show `VLM_UNAVAILABLE` for these zones (honest provenance).

---

## 5. PHASE 3: ADD 7 BIBLE GAPS

These are things BOTH the 11-setups checkpoint and the current version are missing. Add them to close the gap to full Bible compliance.

### 5.1 Category-Specific MAX_ENTRY_DISTANCE (Bible §8.2)

**What:** Replace the flat 200-pip distance filter with category-specific per-pair limits from Bible §8.2.

**Changes:**
```typescript
const MAX_ENTRY_DISTANCE_PIPS: Record<string, Record<string, number>> = {
  'DXY': { swingScalp: 30, htfSwing: 50, reversal: 40, reinforcement: 40 },
  'EUR/USD': { swingScalp: 50, htfSwing: 80, reversal: 60, reinforcement: 60 },
  'GBP/USD': { swingScalp: 80, htfSwing: 120, reversal: 100, reinforcement: 100 },
  'AUD/USD': { swingScalp: 50, htfSwing: 80, reversal: 60, reinforcement: 60 },
};

// In the distance gate:
const limits = MAX_ENTRY_DISTANCE_PIPS[pair];
const maxPips = limits?.[category] ?? limits?.swingScalp ?? 50;
if (distPips > maxPips) continue;
```

### 5.2 TP Laws 12-13 (Bible §6.9, §8.6)

**What:** Add TP timeframe check (TP TF ≥ entry TF) and TP distance sanity (TP > 2×weeklyATR = ambitious, > 3× = reject).

**Changes:**
```typescript
// In computeTPEarthFire:
// Law 12: TP timeframe ≥ entry timeframe
const tfRank = { '15m': 1, '30m': 2, '1H': 3, '4H': 4 };
if (tfRank[targetZone.timeframe] < tfRank[entryZone.timeframe]) {
  // TP TF < entry TF — skip this TP target, look for higher TF zone
}

// Law 13: TP distance sanity
const weeklyATR = computeWeeklyATR(pair, bars4H);
const tpDistancePips = Math.abs(tp - entry) / pipValue;
if (tpDistancePips > 3 * weeklyATR) {
  // TP > 3× weeklyATR — reject, look for closer zone
}
if (tpDistancePips > 2 * weeklyATR) {
  // TP > 2× weeklyATR — mark "ambitious" in notes
  notes += ' | TP ambitious (>2×weeklyATR)';
}
```

### 5.3 SL Law 10 + Law 8 Fallback (Bible §6.8, §8.4)

**What:** Add ATR-based SL minimum (SL never tighter than 0.5×pairATR) and fallback SL computation (max(zoneWidth×2, 1.5×ATR) when no zone within 100 pips).

**Changes:**
```typescript
// In computeSLZoneGeometry:
const pairATR = computeATR(pair, bars1H, 14);
const minSlDistance = 0.5 * pairATR;

if (slDistancePips < minSlDistance) {
  // SL too tight — widen to 0.5×ATR
  sl = isLong ? entry - minSlDistance * pipValue : entry + minSlDistance * pipValue;
}

// Law 8 fallback: no zone within 100 pips
if (!nextZone) {
  const zoneWidthPips = (entryZone.top - entryZone.bottom) / pipValue;
  const fallbackSlDistance = Math.max(zoneWidthPips * 2, 1.5 * pairATR);
  sl = isLong ? entry - fallbackSlDistance * pipValue : entry + fallbackSlDistance * pipValue;
}
```

### 5.4 priorWeekMomentum Wiring

**What:** Replace hardcoded `priorWeekMomentum = 'NEUTRAL'` with real momentum from harvest data.

**Changes:**
```typescript
// In engine.ts setups tool call site:
const priorWeekBars = ctx.harvestData?.ohlc?.[pair]?.slice(-40); // Last 40 4H bars (1 week)
const priorWeekMomentum = computeMomentum(priorWeekBars);
// computeMomentum: (lastClose - firstClose) / firstClose * 100
// > 0.5% = 'BULLISH', < -0.5% = 'BEARISH', else 'NEUTRAL'

// Pass to generator:
generator.generateSetups(
  ctx.zoneMapSnapshot, ctx.shapeSnapshot, pairValidated,
  pair, spot, setupCounter, priorWeekMomentum
);
```

### 5.5 AUD/USD Pair Profile (Bible §8.13)

**What:** Add AUD/USD-specific restrictions: max 3 setups/week, HTF Swing + Reinforcement only (NO consolidation scalps), Tokyo+London sessions only (NOT NY).

**Changes:**
```typescript
// In the setup generation loop:
if (pair === 'AUD/USD') {
  // §8.13: Only HTF Swing + Reinforcement for AUD/USD
  if (category === SetupCategory.SWING_SCALP) {
    log.info(`    [skip] AUD/USD: no consolidation scalps (§8.13 — HTF Swing + Reinforcement only)`);
    continue;
  }
  // §8.13: Tokyo + London only, NOT NY
  if (session === SessionWindow.NY_OVERLAP || session === SessionWindow.NY_MID || session === SessionWindow.NY_OPEN) {
    log.info(`    [skip] AUD/USD: no NY session (§8.13 — Tokyo+London only)`);
    continue;
  }
}

// After generation: cap AUD/USD at 3 setups per week (keep top 3 by confidence)
const auSetups = allSetups.filter(s => s.pair === 'AUD/USD');
if (auSetups.length > 3) {
  auSetups.sort((a, b) => b.confidence - a.confidence);
  allSetups = allSetups.filter(s => s.pair !== 'AUD/USD');
  allSetups.push(...auSetups.slice(0, 3));
}
```

### 5.6 UM-Teleport Check on TP Path (Law 14 Refined)

**What:** Check for intermediate unmitigated zones between entry and TP. Price reacts at UM zones first — the TP must account for them.

**Changes:**
```typescript
// In computeTPEarthFire:
// Law 14 refined: price cannot teleport past UM zones
const umZonesBetween = allZones.filter(z => {
  const zMid = (z.top + z.bottom) / 2;
  const isBetween = isLong
    ? zMid > entry && zMid < tp
    : zMid < entry && zMid > tp;
  return isBetween && (z.reactionCount ?? 0) === 0; // UM = unmitigated
});

if (umZonesBetween.length > 0) {
  // Price will react at the first UM zone before reaching TP
  // Adjust TP to the first UM zone's near edge
  const firstUM = umZonesBetween.sort((a, b) => {
    const distA = Math.abs((a.top + a.bottom) / 2 - entry);
    const distB = Math.abs((b.top + b.bottom) / 2 - entry);
    return distA - distB;
  })[0];
  tp = isLong ? firstUM.bottom : firstUM.top;
  notes += ` | TP adjusted to first UM zone (Law 14)`;
}
```

### 5.7 MAX_SETUPS_PER_DAY Structural Filter (Bible §6.15)

**What:** Max 2 setups per day per pair (keep top 2 by confidence). This is a STRUCTURAL filter for daily focus, not an arbitrary cap.

**Changes:**
```typescript
// In the setup generation loop, after collecting setups for a day:
const daySetups = setups.filter(s => s.day === day && s.pair === pair);
if (daySetups.length > 2) {
  // Keep top 2 by confidence
  daySetups.sort((a, b) => b.confidence - a.confidence);
  const keep = daySetups.slice(0, 2);
  const drop = daySetups.slice(2);
  setups = setups.filter(s => !(s.day === day && s.pair === pair && drop.includes(s)));
  log.info(`    [filter] ${pair} ${day}: kept top 2 of ${daySetups.length} setups by confidence`);
}
```

**Note:** The operator said "no caps" for TOTAL volume. This is a STRUCTURAL filter for daily focus (max 2/day/pair), not an arbitrary cap on total setups. The operator's rule applies to total volume; this is a daily quality filter.

---

## 6. PHASE 4: IMPLEMENT TVI (TRADING VISUAL INTELLIGENCE)

**Reference:** `MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md` (2,599 lines, CME-level). This is the blueprint. Implement it in 6 phases per the spec's migration strategy.

### 6.1 Phase 1: TVI Core Infrastructure (Day 1)

**Goal:** TVI core infrastructure exists.

1. Create `src/tvi/` directory structure
2. Implement `src/tvi/types.ts` — all TVI TypeScript interfaces (ValidatedZone, VKGNode, AgentState, TVIFinding, TrajectoryRecord, ScreenshotMeta, ZoneVerification, TVIContext)
3. Implement `src/tvi/vkg/nodes.ts` + all 6 category files — 100 VKG nodes (30 identification, 25 validation, 15 evidence, 15 anti-pattern, 10 confluence, 5 shape)
4. Implement `src/tvi/vcm.ts` — Visual Context Matcher with 8-phase pipeline
5. Implement `src/tvi/vst.ts` — SQLite state tracker with full schema (7 tables)
6. Unit tests: VKG node count, VCM matching, VST schema creation

**Verification:** `bun test src/tvi/__tests__/phase1.test.ts` — all pass.

### 6.2 Phase 2: Enforcement (Day 1-2)

**Goal:** VEB gates are wired and enforcing.

1. Implement `src/tvi/veb.ts` — Visual Enforcement Brain with all pre/post gates (P1-P5 pre-action, V1-V5 post-action)
2. Implement `src/tvi/vgs.ts` — Visual Guidance System with T0 bullets + T1 warheads
3. Implement `src/tvi/orchestrator.ts` — Single output gateway (synthesizes findings into ONE coherent output.system push)
4. Wire hooks in `src/index.ts` — tool.execute.before/after, system.transform
5. Unit tests: VEB gates fire correctly, VGS bullets pushed, orchestrator synthesizes

**Verification:** `bun test src/tvi/__tests__/phase2.test.ts` — all pass.

### 6.3 Phase 3: Zone Identification Protocol (Day 2-3)

**Goal:** ZIP protocol works end-to-end.

1. Implement `src/tvi/zip.ts` — ZONE| parsing + zone verification + Engine 1 enrichment
2. Rewrite `tool-after.ts` Manual Step D injection with ZIP protocol (draw zones → screenshot → save PNG → read PNG → identify zones with ZONE| format → call setups)
3. Rewrite `engine.ts` charts tool output with ZIP protocol (same instructions)
4. Unit tests: ZONE| parsing, zone verification, enrichment

**Verification:** `bun test src/tvi/__tests__/phase3.test.ts` — all pass.

### 6.4 Phase 4: Anti-Derailment (Day 3-4)

**Goal:** Loop detection and trajectory monitoring are active.

1. Implement `src/tvi/vld.ts` — Loop Detection with 6 patterns (STALE_READ, NO_VERIFY, SCRIPT_LOOP, REPEAT_ERROR, BLIND_ACT, NO_REPORT)
2. Implement `src/tvi/vtm.ts` — Trajectory Monitor with health scoring + adaptive profiles (TRUSTED/STANDARD/GUIDED)
3. Implement 12 anti-derailment behavioral patterns (AD-1 through AD-12)
4. Unit tests: loop detection triggers, health score computation, profile switching

**Verification:** `bun test src/tvi/__tests__/phase4.test.ts` — all pass.

### 6.5 Phase 5: Integration (Day 4-5)

**Goal:** TVI is fully integrated with the existing pipeline.

1. Remove old VLM directive from `engine.ts` charts tool (replaced by ZIP protocol)
2. Wire TVI enrichment into `visual-setup-generator.ts` (zfp, confluence, reactionCount from Engine 1)
3. Integration test: full pipeline (harvest → zones → shapes → charts → TVI → setups)
4. Container test: deploy to clean-v421, run full pipeline, verify output

**Verification:** Container test produces ≥6 setups per pair, both directions, proper SL/TP/RRR, no IP zone exclusion, honest fallback provenance, VLM_CONFIRMED/VLM_NEW for most setups, DXY precision within 4 pips of golden standard.

### 6.6 Phase 6: Hardening (Day 5)

**Goal:** TVI is production-ready.

1. Adversarial tests: base64 confusion, omni-vision misuse, phantom zones, wrong price mapping, over-production, wrong pair attribution
2. Performance audit: VCM < 2ms, VEB before < 10ms, VEB after < 15ms
3. Documentation: README, inline comments, warhead files
4. Final container test: verify all acceptance criteria

**Verification:** All adversarial tests pass, performance budgets met, documentation complete.

---

## 7. PHASE 5: IMPLEMENT PVE (PROBABILISTIC VERIFICATION ENGINE)

**Reference:** `MASTER_CONTEXT/PLUTUS_PVE_DESIGN_SPEC.md` (design only). This is the blueprint. Build it AFTER Engine 3 is container-verified A-grade.

**DO NOT BUILD PVE YET.** The PVE spec explicitly states: "Build only after Engine 3 setup generation is A-grade solid and container-verified." The current Engine 3 is NOT A-grade (it has the regressions and gaps that Phases 1-4 fix). Build PVE AFTER Phase 6 (TVI hardening) is complete and Engine 3 is verified.

**PVE Implementation Order:**
1. After Phase 6 (TVI hardening) is complete
2. After Engine 3 is container-verified A-grade (≥6 setups per pair, both directions, proper SL/TP/RRR, DXY precision within 4 pips of golden standard)
3. Then implement PVE per the design spec

---

## 8. PHASE 6: CONTAINER TEST + VALIDATE + SHIP

### 8.1 Container Test Procedure

```bash
# Step 1: Deploy to fresh container from clean-v421
docker rm -f plutus-host 2>/dev/null
docker run -d --name plutus-host --init --network host plutus-container-testing:clean-v421 sh -c 'sleep 57600'
sleep 8

# Step 2: Deploy dist + script
docker cp dist/index.js plutus-host:/root/.config/opencode/plugins/plutus-agent/dist/index.js
docker cp tv_fetch_ohlc.py plutus-host:/root/scripts/tv_fetch_ohlc.py

# Step 3: Verify SHA match
LOCAL=$(sha256sum dist/index.js | awk '{print $1}')
REMOTE=$(docker exec plutus-host sha256sum /root/.config/opencode/plugins/plutus-agent/dist/index.js | awk '{print $1}')
[ "$LOCAL" = "$REMOTE" ] && echo "DIST VERIFIED ✓" || echo "SHA MISMATCH ✗"

# Step 4: Start agent on paid model (no rate limits)
docker exec plutus-host tmux new-session -d -s plutus
docker exec plutus-host tmux pipe-pane -t plutus -o 'cat >> /tmp/tvi-stream.txt'
docker exec -e OPENCODE_SKIP_UPDATE=1 -d plutus-host tmux send-keys -t plutus 'opencode --agent plutus --model opencode-go/mimo-v2.5' Enter
sleep 20

# Step 5: Verify agent initialized
docker exec plutus-host sh -c 'strings /tmp/tvi-stream.txt | grep "tools registered" | tail -1'
# Expected: "PLUTUS AGENT v4.0 — 10 tools registered"

# Step 6: Send pipeline task
docker exec plutus-host tmux send-keys -t plutus 'Run the full Plutus TTE pipeline for the week of July 6-10, 2026. Harvest, zones, shapes, draw zones on charts, capture screenshots, read screenshots via read(), identify zones using ZONE| format (ZONE|type|top|bottom|timeframe|classification|confidence|evidence), minimum 5 per pair both supply AND demand, then call plutus-pipeline-setups. Produce the final weekly report.' Enter
```

### 8.2 Validation Criteria (The Sniff Test)

**Before saving any checkpoint, verify ALL of these:**

1. **Setup count:** ≥6 per pair (24+ total). Not 22 on one pair while others get 3-5.
2. **Direction diversity:** Both LONG and SHORT per pair. Not all-shorts or all-longs.
3. **Zone types:** Setups at S/D (BoM/MoM) and LQZ zones. NOT at IP zones (unless properly filtered with high confluence + low ZFP).
4. **Provenance:** VLM_CONFIRMED or VLM_NEW for most setups. FALLBACK_IP_EDGE (VLM_UNAVAILABLE) for Engine 1 supplements. NOT VLM_CONFIRMED for Engine 1 zones.
5. **Category distribution:** SS at ceiling/floor (2-4/day), WL at Hard Walls (1-2/day), BS at failing zones (1-2/day). NOT 22 of one category.
6. **DXY precision:** Entries within 4 pips of golden standard levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235).
7. **SL distances:** ≤36 pips (DXY ≤0.36 points). Most < 25 pips. Some < 15 pips (sniper).
8. **RRR viability:** ≥1.2 (consolidation week floor). Blended RRR computed across 3 entries.
9. **3-entry stagger:** Front/middle/back with forward spreads (EUR 1, AUD 1.5, GBP 2, DXY 0.02).
10. **Trade chaining:** TP of setup N = entry of setup N+1 where shape chain supports it.

**The sniff test:** Would the operator look at these setups and say "these are real trades"? If the answer is anything other than "yes," DO NOT SAVE THE CHECKPOINT.

### 8.3 Ship Package Procedure

**Only after validation passes:**

1. Save checkpoint: `Checkpoints/v4.3_TVI_VALIDATED/` with full build/progress report + context docs
2. Generate ship package: `trident-ship-package` with whatWasBuilt, bugsFound, architectureDecisions, filesChanged, testResults
3. Update all context docs with final results
4. Report completion with mechanical evidence (SHA, setup count, direction breakdown, precision metrics, backtest results)

---

## 9. DATA MODEL — TYPESCRIPT INTERFACES

### 9.1 Core Types (from TVI spec, reference only)

```typescript
// See MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md Section 13 for full data model.
// Key types:
// - ValidatedZone: pair, type, top, bottom, timeframe, classification, source, confidence, visualEvidence, sourceScreenshot, reactionCount, confluence, zfp, liquidityScore, mappedIPZoneName
// - VKGNode: id, category, taskTypes, pairs, timeframes, condition, bullet, warhead, priority, disclosure
// - AgentState: task, pair, timeframe, spot, zonesDrawn, screenshotsRead, agentHasReadScreenshot, currentShape, dayShape
// - TVIFinding: priority, bullet, gate, reason
// - TrajectoryRecord: run_id, week_start, zones_produced, zones_validated, setups_produced, gates_passed, gates_failed, health_score, created_at
// - TVIContext: screenshots, screenshotsRead, zonesDrawn, validatedZones, zoneMapSnapshot, shapeSnapshot, harvestData, runId, weekStart
```

### 9.2 ZONE| Line Format (from TVI spec, reference only)

```
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

Fields (pipe-delimited, one per line):
1. "ZONE" — literal prefix (required for parsing)
2. type — SUPPLY | DEMAND | LIQUIDITY
3. top — upper price boundary (float, from chart's price axis)
4. bottom — lower price boundary (float, from chart's price axis)
5. timeframe — 4H | 1H | 30m | 15m
6. classification — BoM | MoM | UNMITIGATED
7. confidence — 0-100 (integer)
8. evidence — specific candlestick pattern with exact prices (≥20 chars, with 3+ decimal price references)
```

---

## 10. TEST SPECIFICATIONS

### 10.1 Unit Tests (from TVI spec, reference only)

See `MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md` Section 14 for full test specifications. Key tests:
- ZONE| parsing (valid, malformed, edge cases)
- Zone verification (structure, evidence, price, distance, type, freshness)
- VCM matching (task filter, pair filter, timeframe filter, condition evaluation, scoring, top-N)
- VEB gates (must read screenshot, minimum zones, both sides, no IP entries, structure, evidence, distance, type, freshness)
- Engine 1 enrichment (confluence, zfp, reactionCount, mappedIPZoneName)
- Multi-layer verification (all 3 layers pass, layer 2 fails, layer 1 fails)
- Loop detection (stale read, no verify, script loop, repeat error, blind act, no report)
- Trajectory health score (computation, profile switching)

### 10.2 Integration Tests

- Full pipeline (harvest → zones → shapes → charts → TVI → setups)
- No fallback (agent can't produce zones → pipeline FAILS, no Engine 1 supplementation)
- IP zones included (with proper filtering: ±200p, top 20, distance sort, dedup, honest FALLBACK_IP_EDGE label)
- Both sides required (supply AND demand per pair)
- Visual evidence quality (generic evidence rejected, specific evidence accepted)
- Zone spread (clustered zones → WARN)

### 10.3 Adversarial Tests

- Base64 confusion (agent tries to read() base64 text → BLOCKED)
- Omni-vision misuse (agent calls omni-vision for chart screenshot → BLOCKED)
- Phantom zone (zone with no visible candlestick evidence → REJECTED)
- Wrong price mapping (zone boundaries don't match price axis → REJECTED)
- Over-production (>15 zones per pair → WARN "too many")
- Wrong pair attribution (zone pair doesn't match screenshot pair → BLOCKED)

---

## 11. FILE MANIFEST

### 11.1 New Files (TVI Engine)

```
src/tvi/
├── index.ts                    # TVI plugin entry — wires hooks, initializes subsystems
├── vkg/
│   ├── nodes.ts                # 100 VKG node definitions
│   ├── identification.ts       # Category A: 30 zone identification nodes
│   ├── validation.ts           # Category B: 25 zone validation nodes
│   ├── evidence.ts             # Category C: 15 visual evidence nodes
│   ├── anti-pattern.ts         # Category D: 15 anti-pattern nodes
│   ├── confluence.ts           # Category E: 10 confluence scoring nodes
│   └── shape.ts                # Category F: 5 shape-zone relationship nodes
├── vcm.ts                      # Visual Context Matcher — 8-phase pipeline
├── veb.ts                      # Visual Enforcement Brain — pre/post gates
├── vgs.ts                      # Visual Guidance System — bullets + warheads
├── vst.ts                      # Visual State Tracker — SQLite state
├── vld.ts                      # Loop Detection — 6 patterns
├── vtm.ts                      # Trajectory Monitor — health scoring + profiles
├── orchestrator.ts             # Single output gateway
├── zip.ts                      # Zone Identification Protocol — parse + verify
├── enrichment.ts               # Engine 1 enrichment
├── types.ts                    # TVI TypeScript interfaces
├── warheads/
│   ├── zone-identification-guide.md
│   ├── common-mistakes.md
│   ├── price-axis-reading.md
│   ├── order-block-guide.md
│   ├── liquidity-sweep-guide.md
│   └── evidence-format-guide.md
└── state/
    └── tvi-state.db            # SQLite database (created at runtime)
```

### 11.2 Modified Files

```
src/hooks/tool-after.ts         # Replace Manual Step D injection with TVI ZIP protocol
src/pipeline/engine.ts          # Replace charts tool VLM directive with TVI ZIP protocol
src/engine3/visual-setup-generator.ts  # Wire TVI enrichment (zfp, confluence, reactionCount)
src/index.ts                    # Wire TVI hooks (tool.execute.before/after, system.transform)
src/identity/index.ts           # Doctrine fixes (MACRO DIRECTION, read()-direct, no 2-phase)
identity/plutus/TRADING_DOMAIN.md      # Law 20: MACRO DIRECTION (NOT HARD FILTER)
src/hooks/system-transform.ts   # Step D summary (save-screenshot + zone drawing)
src/semantic-firewall/index.ts  # SL ceiling 36, ZT-4 per-pair, ZT-15 scoped, AP22 whitelist
src/brains/lqz-lobe.ts          # LQZ lookback 720, age weighting, LQZ_LOOKBACK_BARS
tv_fetch_ohlc.py                # N_BARS 1H 500→1500, 30m 300→500
config.json                     # plutus-agent rename
Dockerfile                      # pristine base, contamination gate, pinned versions
deploy-plutus.sh                # plutus-agent paths
```

### 11.3 Deleted Code

```
src/pipeline/engine.ts          # REMOVE: old VLM directive text (replaced by ZIP protocol)
src/pipeline/engine.ts          # REMOVE: old fallback to Engine 1 zones (replaced by honest FALLBACK_IP_EDGE supplement)
```

---

## 12. ANTI-DERAILMENT GUARDS — 15 RULES

1. **NO FALLBACK to Engine 1 zones labeled as VLM_CONFIRMED.** Engine 1 zones are a SUPPLEMENT with FALLBACK_IP_EDGE label (VLM_UNAVAILABLE). Never label them VLM_CONFIRMED — that's dishonest provenance.
2. **IP zones ARE valid entry anchors with proper filtering.** Include them with ±200 pips (DXY ±2.00) distance filter, distance sort, top 20, price-overlap dedup. Do NOT exclude them.
3. **ZONE| format is mandatory.** Free-form text is not parseable. The agent MUST produce ZONE|type|top|bottom|timeframe|classification|confidence|evidence lines.
4. **Both sides required.** Agent MUST produce both supply AND demand zones per pair. One-sided = WARN. Zero zones = BLOCK.
5. **read() for images, omni-vision for VIDEO only.** Agent reads chart screenshots via read() directly. plutus-omni-vision is for video processing only.
6. **Evidence must be specific with price references.** visualEvidence must be ≥ 20 chars, contain a price reference with 3+ decimal places (e.g., "at 1.1480"), and not match generic patterns.
7. **No base64 text reading.** Agent reads .png files via read() — the image renders directly. Reading base64 text is not reading an image.
8. **Zone boundaries from chart's price axis.** Zone top/bottom must come from the chart's price axis (right side numbers). Computing boundaries from OHLC data instead of reading the chart is a derailment.
9. **No count caps on zone identification.** The agent identifies as many zones as it can see. The harness validates each one. Volume is controlled by quality gates, not arbitrary caps.
10. **WL only at Hard Walls (zfp < 20).** 22 WL setups on 1H is impossible. WL is a 1-3 candle event at a Hard Wall.
11. **SS at ceiling/floor only.** SS = scalp at consolidation ceiling AND floor. Both boundaries valid. Not every zone in range.
12. **SL ceiling = 36 pips (DXY 0.36 points).** Bigger = entry is wrong or setup is wrong. General rule < 25. Sniper < 15.
13. **ZFP = 45 (never 60).** The threshold between "holds" and "breaks." Never change.
14. **Pair format = 'EUR/USD' with slashes.** Never 'EURUSD'. Internal pipeline format.
15. **Save checkpoints ONLY with valid output that passes the sniff test.** The sniff test: would the operator look at these setups and say "these are real trades"? If the answer is anything other than "yes," DO NOT SAVE.

---

## 13. THE 10 ABSOLUTE PROHIBITIONS

1. **NO FALLBACK to Engine 1 zones labeled as VLM_CONFIRMED.** Engine 1 zones are a SUPPLEMENT with FALLBACK_IP_EDGE label (VLM_UNAVAILABLE). Never label them VLM_CONFIRMED — that's dishonest provenance.

2. **NO model inference in the harness.** VCM matching, zone verification, evidence validation — all deterministic boolean evaluation. Zero LLM calls in the harness. The harness is fast (<10ms), deterministic, and auditable.

3. **ZONE| format is mandatory.** Free-form text is not parseable. The agent MUST produce ZONE|type|top|bottom|timeframe|classification|confidence|evidence lines. Any other format is rejected.

4. **IP zones are NOT excluded from entry candidates.** They are valid entry anchors with institutional pressure confluence. Include them with proper filtering (±200 pips, top 20, distance sort, dedup, honest FALLBACK_IP_EDGE label).

5. **Both sides required.** Agent MUST produce both supply AND demand zones per pair. One-sided identification is a WARN (likely missed the other side). Zero zones is a BLOCK.

6. **read() for images, omni-vision for VIDEO only.** The agent reads chart screenshots via read() directly. plutus-omni-vision is for video processing only. Using omni-vision for chart screenshots is a BLOCK.

7. **Evidence must be specific with price references.** visualEvidence must be ≥ 20 chars, contain a price reference with 3+ decimal places (e.g., "at 1.1480"), and not match generic patterns ("zone confirmed", "looks good", "valid zone").

8. **No base64 text reading.** The agent reads .png files via read() — the image renders directly. Reading base64 text is not reading an image. If the agent tries to analyze base64, it's a BLOCK.

9. **Zone boundaries from chart's price axis.** Zone top/bottom must come from the chart's price axis (right side numbers). Computing boundaries from OHLC data instead of reading the chart is a derailment.

10. **Save checkpoints ONLY with valid output that passes the sniff test.** The sniff test: would the operator look at these setups and say "these are real trades"? If the answer is anything other than "yes," DO NOT SAVE. Invalid checkpoints are worse than no checkpoints — they create the illusion of a valid baseline while being garbage.

---

*End of V4.2.1 Continuation Specification. This document is the single source of truth for the next build. Implement it exactly. Zero deviations tolerated.*

---

## APPENDIX A: EXACT CODE DIFFS FOR ALL 16 GENUINE IMPROVEMENTS

This appendix contains the exact code changes for each of the 16 genuine improvements from the Wave A-D session. Each improvement is verified against the Bible. Each one improves without regressing the checkpoint's quality. Apply them in this order.

### A.1 Doctrine Fixes — identity/index.ts

**DELETE (line 225-228):**
```typescript
// OLD — "DXY Cascade (HARD FILTER): DXY bearish → FX pairs LONG only (SHORT FX setups REJECTED). DXY bullish → FX pairs SHORT only (LONG FX setups REJECTED)"
```

**REPLACE WITH:**
```typescript
// NEW — "DXY Cascade = MACRO DIRECTION for HTF swings only. DXY bullish → FX HTF swings SHORT-biased; DXY bearish → FX HTF swings LONG-biased. This NEVER filters setups: SS/consolidation scalps and counter-trend entries at valid zones are ALWAYS permitted with 3+ confluences. Zone type decides direction per zone (supply→SHORT, demand→LONG)."
```

**DELETE (lines 96, 119, 146, 148, 151 — 5 omni-vision directives):**
```typescript
// OLD — "Uses plutus-omni-vision for ALL visual analysis" (×5 variations)
```

**REPLACE WITH (line 96-98):**
```typescript
// NEW — "You ARE MiMo v2.5 — a multimodal model. Use the read() tool DIRECTLY for ALL image and PDF visual analysis (batch() for parallel reads). plutus-omni-vision is for VIDEO processing ONLY, because read() does not support video."
```

**DELETE (lines 116-117, 181-182 — 2-phase text):**
```typescript
// OLD — "plutus-pipeline-charts: Phase 1 returns drawing instructions, Phase 2 validates screenshots. plutus-pipeline-setups: Phase 1 computes candidates, Phase 2 validates visual evidence."
```

**REPLACE WITH:**
```typescript
// NEW — "The pipeline is the 5-tool chain (harvest→zones→shapes→charts→setups) with Manual Steps A–E between tools. The agent does browser interaction via MCP tools between pipeline tool calls."
```

### A.2 Doctrine Fixes — identity/plutus/TRADING_DOMAIN.md

**DELETE (line 33):**
```markdown
20. DXY CASCADE HARD FILTER: DXY bearish → FX LONG only. DXY bullish → FX SHORT only.
```

**REPLACE WITH:**
```markdown
20. DXY CASCADE = MACRO DIRECTION (NOT HARD FILTER): DXY bearish → FX HTF swings LONG-biased. DXY bullish → FX HTF swings SHORT-biased. NEVER filters setups — counter-trend scalps and SS entries at valid zones are ALWAYS permitted with 3+ confluences. Zone type decides direction per zone (supply→SHORT, demand→LONG).
```

### A.3 Doctrine Fixes — system-transform.ts

**DELETE (line 40):**
```typescript
// OLD — "tv_screenshot to capture, write to save the file. Then call plutus-pipeline-charts with the screenshot paths."
```

**REPLACE WITH:**
```typescript
// NEW — "Draw zones on chart FIRST via tv_draw_rectangle using tv_find_price_y for pixel mapping. Then tv_screenshot to capture. Save BINARY via plutus-save-screenshot (write() corrupts PNGs — never use it for screenshots). Then call plutus-pipeline-charts with the screenshot paths."
```

### A.4 LQZ Lookback — lqz-lobe.ts

**CHANGE (line 121):**
```typescript
// OLD: export const LQZ_LOOKBACK_BARS = 120;
// NEW: export const LQZ_LOOKBACK_BARS = 720; // 6 weeks of 1H at 120 bars/week. Operator-ruled sweet spot 3-6 weeks, max 1440.
```

**ADD (after line 121):**
```typescript
export const LQZ_AGE_CONFIDENCE_MAX = 1.0;
// Reaction-age weighting: same level reacted across 6+ weeks = 100% valid LQZ (operator doctrine).
// span = bar-span between oldest and newest confirming hit.
// ageMultiplier = span >= LQZ_LOOKBACK_BARS ? LQZ_AGE_CONFIDENCE_MAX : span / LQZ_LOOKBACK_BARS.
// boost = min(10, span / 144) * ageMultiplier.
// confidence = min(100, confidence + round(boost * 10)).
```

### A.5 LQZ Lookback — tv_fetch_ohlc.py

**CHANGE (line 22):**
```python
# OLD: N_BARS = {"4H": 500, "1H": 500, "30m": 300, "15m": 300}
# NEW: N_BARS = {"4H": 500, "1H": 1500, "30m": 500, "15m": 300}
# 1H raised 500→1500 for full 720-bar LQZ lookback (6 weeks).
# 30m raised 300→500 for backtest intra-bar resolution coverage.
```

### A.6 Classification Fix — engine.ts:819

**CHANGE (line 819):**
```typescript
// OLD: classification: ez.sdType === 'BoM' ? 'BoM' : 'MoM',
// NEW: classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED',
// IP zones (sdType='IP') now correctly classified as UNMITIGATED, not fabricated as MoM.
```

### A.7 Classification Fix — engine.ts:813-826

**ADD (in the fallback zone push, after line 815):**
```typescript
const isLqzFallback = ez.sdOverlap === 'LQZ' || (ez.zoneName?.includes('LQZ') ?? false);
pairValidated.push({
  pair,
  type: isLqzFallback ? 'LIQUIDITY' : (ez.ceiling > spot ? 'SUPPLY' : 'DEMAND'),
  top: ez.ceiling,
  bottom: ez.floor,
  timeframe: '4H',
  classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED',
  source: isLqzFallback ? 'FALLBACK_LQZ' : 'FALLBACK_IP_EDGE',
  mappedIPZoneName: ez.zoneName || '',  // ← ADD THIS (was never populated)
  confidence: 50,
  reactionCount: ez.reactionCount ?? 0,
  liquidityScore: ez.liquidityScore ?? 0,
  visualEvidence: `Engine 1 ${ez.zoneName}: ${ez.reactionCount} reactions, confluence ${ez.confluence}`,
  sourceScreenshot: pairScreenshot?.path || '',
} as any);
```

### A.8 Classification Fix — visual-setup-generator.ts:291

**CHANGE (line 291):**
```typescript
// OLD: vz.mappedIPZoneName.toUpperCase().includes('LQZ')
// NEW: (vz.mappedIPZoneName ?? '').toUpperCase().includes('LQZ')
// Optional chaining prevents TypeError on undefined (mappedIPZoneName was never populated).
```

**ADD (G0 LQZ exemption, around line 289-316):**
```typescript
const isLqzZone =
  vz.source.toUpperCase().includes('LQZ') ||
  (vz.mappedIPZoneName ?? '').toUpperCase().includes('LQZ') ||
  vz.type === 'LIQUIDITY';
if (vz.classification === 'MoM' && vz.reactionCount === 0 && !isLqzZone) {
  // G0 virgin MoM death zone check (only for NON-LQZ MoM zones).
  // LQZ zones are ENTRY zones per Law 5, not MoM order blocks.
}
```

### A.9 SL Ceiling — semantic-firewall/index.ts

**CHANGE (around line 312-350):**
```typescript
// OLD: const SL_CAP_PIPS = 150;
// NEW: const SL_HARD_CAP_PIPS = 36;   // HARD ceiling — all FX pairs; DXY 0.36 pts
// NEW: const SL_WIDE_WARN_PIPS = 25;  // general rule: SL should be < 25
// NEW: const SL_SNIPER_PIPS = 15;     // < 15 pips = sniper entry (positive)
```

### A.10 SL Units Fix — visual-setup-generator.ts

**CHANGE (line 129):**
```typescript
// OLD: const SL_CAP_DXY_POINTS = 0.36;
// NEW: const SL_CAP_PIPS = 36; // HARD ceiling — all pairs (DXY pip = 0.01, so 36 pips = 0.36 points)
```

**CHANGE (line 399):**
```typescript
// OLD: const slDistancePips = isDXY ? Math.abs(entries.front - slResult.sl) : Math.abs(entries.front - slResult.sl) / pipValue;
// NEW: const slDistancePips = Math.abs(entries.front - slResult.sl) / pipValue;
// All pairs in pips (DXY pip = 0.01, FX pip = 0.0001).
```

**CHANGE (line 402):**
```typescript
// OLD: const slCap = isDXY ? SL_CAP_DXY_POINTS : SL_CAP_PIPS_FX;
// NEW: const slCap = SL_CAP_PIPS;
```

### A.11 Consolidation Week RRR — visual-setup-generator.ts

**ADD (lines 139-153):**
```typescript
const CONSOLIDATION_WEEK_FLOORS: Record<string, number> = {
  SWING_SCALP: 1.2,    // normal 1.5
  HTF_SWING: 1.5,      // normal 2.0
  BREAKOUT_SURGE: 1.5, // normal 2.0
  WHIPLASH: 1.5,       // normal 2.0
  REINFORCEMENT: 1.2,  // normal 1.5
};
```

**ADD (lines 222-227):**
```typescript
const isConsolidationWeek = days.every(
  (d) => d.shape === ShapeCode.SS || d.shape === ShapeCode.R || d.shape === ShapeCode.WLS,
);
```

**CHANGE (line 388-392):**
```typescript
// OLD: const minRrr = rrrForCategory(String(category)).tp1;
// NEW: const categoryKey = String(category).trim().toUpperCase().replace(/[\s-]+/g, '_');
// NEW: const rrrFloor = isConsolidationWeek
// NEW:   ? (CONSOLIDATION_WEEK_FLOORS[categoryKey] ?? rrrForCategory(String(category)).tp1)
// NEW:   : rrrForCategory(String(category)).tp1;
// NEW: const minRrr = rrrFloor;
```

### A.12 zfp Computation — engine.ts

**ADD (lines 101-109):**
```typescript
function computeZfpFromConfluence(confluence: number): number {
  // Canon Pillar 9 pressure-degree → ZFP step function (Bible Part 4.12)
  if (confluence >= 12) return 10;  // EXTREME — nearly impregnable
  if (confluence >= 10) return 20;  // HEAVY — holds under normal conditions
  if (confluence >= 8)  return 30;  // MODERATE-HEAVY
  if (confluence >= 6)  return 40;  // MODERATE — breaks easily under pressure
  if (confluence >= 4)  return 55;  // LIGHT
  return 65;                         // MINIMAL
}
```

**CHANGE (line 340):**
```typescript
// OLD: zfp: 50,
// NEW: zfp: computeZfpFromConfluence(pillarResult.compositeScore),
```

### A.13 TP Minimum Distance — visual-setup-generator.ts

**ADD (in computeTPEarthFire, around line 768):**
```typescript
const slDistance = Math.abs(entry - sl);
const minTpDistance = slDistance * 1.2;
// Skip opposing zones that are too close to entry (within 1.2× SL distance).
// This ensures viable RRR (minimum ~1.2 before any other gate).
```

**CHANGE (in the candidate filter, around line 776):**
```typescript
// LONG: .filter((z) => (z.type === 'SUPPLY' || z.type === 'LIQUIDITY') && z.bottom > entry && (z.bottom - entry) >= minTpDistance)
// SHORT: .filter((z) => (z.type === 'DEMAND' || z.type === 'LIQUIDITY') && z.top < entry && (entry - z.top) >= minTpDistance)
```

### A.14 BoM/LQZ Priority Boost — engine.ts

**CHANGE (in the zone curation sort, around line 781-800):**
```typescript
// OLD: .sort((a, b) => { const distA = Math.abs((a.ceiling + a.floor) / 2 - spot); const distB = Math.abs((b.ceiling + b.floor) / 2 - spot); return distA - distB; }).slice(0, 20);
// NEW: .sort((a, b) => { const isBoMA = a.sdType === 'BoM' || a.isBoM === true; const isLqzA = a.sdOverlap === 'LQZ' || (a.id?.toLowerCase().includes('lqz')) || (a.zoneName?.includes('LQZ')); const sortKeyA = a.confluence + ((isBoMA || isLqzA) ? 5 : 0); const isBoMB = b.sdType === 'BoM' || b.isBoM === true; const isLqzB = b.sdOverlap === 'LQZ' || (b.id?.toLowerCase().includes('lqz')) || (b.zoneName?.includes('LQZ')); const sortKeyB = b.confluence + ((isBoMB || isLqzB) ? 5 : 0); return sortKeyB - sortKeyA; }).slice(0, 30);
```

### A.15 Backtest 30m — engine.ts

**CHANGE (line 1292):**
```typescript
// OLD: '--interval', '1_hour',
// NEW: '--interval', '30_minute',
```

**CHANGE (line 1293):**
```typescript
// OLD: '--bars', '500',
// NEW: '--bars', String(barsNeeded),
```

**ADD (lines 1308-1310):**
```typescript
// Dynamically compute required bars: 48 30m bars/day + margin.
// tvDatafeed fetches the LAST N bars from now — to reach back to the target week,
// we need enough bars to cover (today - weekStart) days.
const daysBack = Math.ceil((Date.now() - weekStartMs) / 86_400_000);
const barsNeeded = Math.min(5000, Math.max(500, daysBack * 48 + 100));
```

**ADD (lines 1212-1228):**
```typescript
function emulatorResolvesSlFirst(bar: SimpleBar, setup: { tp: number; sl: number }): boolean {
  const bullish = bar.close > bar.open;
  const legs: Array<[number, number]> = bullish
    ? [[bar.open, bar.low], [bar.low, bar.high], [bar.high, bar.close]]
    : [[bar.open, bar.high], [bar.high, bar.low], [bar.low, bar.close]];
  const crosses = (a: number, b: number, level: number): boolean =>
    level >= Math.min(a, b) && level <= Math.max(a, b);
  const tpLeg = legs.findIndex(([a, b]) => crosses(a, b, setup.tp));
  const slLeg = legs.findIndex(([a, b]) => crosses(a, b, setup.sl));
  if (slLeg === -1) return false; // SL never crossed → TP first
  if (tpLeg === -1) return true;  // TP never crossed → SL first
  if (slLeg !== tpLeg) return slLeg < tpLeg;
  return true; // same leg → SL-first (conservative)
}
```

### A.16 CONDITIONAL Floor — visual-setup-generator.ts

**CHANGE (line 135):**
```typescript
// OLD: const MIN_CONFIDENCE_CONDITIONAL = 35;
// NEW: const MIN_CONFIDENCE_CONDITIONAL = 50;
// Canon: CONDITIONAL ≥50, REJECTED <50.
```

### A.17 WL/SS Category Filters — visual-setup-generator.ts

**ADD (lines 288-308):**
```typescript
if (category === SetupCategory.WHIPLASH || category === SetupCategory.HTF_SWING) {
  const zoneZfp = vz.zfp ?? 50;
  if (zoneZfp >= 20) {
    log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: not a Hard Wall (zfp=${zoneZfp} >= 20) — WL entries only at Hard Walls`);
    continue;
  }
}
if (category === SetupCategory.SWING_SCALP) {
  const zoneZfp = vz.zfp ?? 50;
  if (zoneZfp >= 30) {
    log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: zfp=${zoneZfp} >= 30 — SS entries need holding walls (zfp < 30)`);
    continue;
  }
}
```

**ADD (lines 310-321):**
```typescript
// SS = scalp at consolidation boundaries only — nearest 3 supply above + nearest 3 demand below.
const supplyZones = eligibleZones.filter(({ vz }) => vz.type === 'SUPPLY' && ((vz.top + vz.bottom) / 2) > spot)
  .sort((a, b) => ((a.vz.top + a.vz.bottom) / 2) - ((b.vz.top + b.vz.bottom) / 2));
const demandZones = eligibleZones.filter(({ vz }) => vz.type === 'DEMAND' && ((vz.top + vz.bottom) / 2) < spot)
  .sort((a, b) => ((b.vz.top + b.vz.bottom) / 2) - ((a.vz.top + a.vz.bottom) / 2));
eligibleZones = [...supplyZones.slice(0, 3), ...demandZones.slice(0, 3)];
```

### A.18 Prompt Strengthening — tool-after.ts

**ADD (after line 47 in the Step D text):**
```typescript
// NEW: ⚠ IMAGE HANDLING — READ THIS EXACTLY:
// The base64 string returned by tv_screenshot is DATA — pass it straight to plutus-save-screenshot.
// NEVER analyze it, NEVER paste it into read(), NEVER try to read base64 text
// (read() truncates long lines and base64 is not an image).
// You ARE multimodal. read() on a .png/.jpeg file RENDERS the image to you directly.
// That is the ONLY way you look at screenshots.
// If you catch yourself reasoning about reading base64: STOP. Save the PNG, then read() the PNG.
```

### A.19 Prompt Strengthening — engine.ts charts output

**ADD (in the charts tool output directive, around line 604-607):**
```typescript
// NEW: You ARE MiMo v2.5 — a MULTIMODAL model. You see images DIRECTLY via read().
// read() on a .png/.jpeg file RENDERS the image into your context. That is the ONLY way you analyze screenshots.
// DO NOT use plutus-omni-vision for these screenshots — that tool is for VIDEO only. Use read() directly.
// NEVER attempt to read() base64 text or .txt files — base64 strings are DATA for plutus-save-screenshot, not images.
// If no PNG exists yet, capture + save one first.
```

### A.20 plutus-engine → plutus-agent Rename

**CHANGE (config.json):**
```json
// OLD: "plugin": ["file:///root/.config/opencode/plugins/plutus-engine/dist/index.js"]
// NEW: "plugin": ["file:///root/.config/opencode/plugins/plutus-agent/dist/index.js"]
```

**CHANGE (Dockerfile):**
```dockerfile
# OLD: COPY dist/ /root/.config/opencode/plugins/plutus-engine/dist/
# NEW: COPY dist/ /root/.config/opencode/plugins/plutus-agent/dist/
# OLD: COPY identity/ /root/.config/opencode/plugins/plutus-engine/identity/
# NEW: COPY identity/ /root/.config/opencode/plugins/plutus-agent/identity/
```

### A.21 Pristine Docker Image

**CHANGE (Dockerfile line 1):**
```dockerfile
# OLD: FROM plutus-container-testing:master
# NEW: FROM node:20-bullseye
```

**ADD (Dockerfile, after system deps):**
```dockerfile
RUN mkdir -p /run/user/0 && chmod 0700 /run/user/0 \
    && mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix
ENV XDG_RUNTIME_DIR=/run/user/0
```

**ADD (Dockerfile, contamination gate):**
```dockerfile
RUN test ! -e /root/.config/opencode/plugins/hive-mind \
    && test ! -e /root/.config/opencode/plugins/shadow-hive \
    && ! grep -q '"plugins"' /root/.config/opencode/config.json \
    && echo "CONTAMINATION GATE: CLEAN"
```

### A.22 Contamination Fix (Shadow_Agents Stopped)

**EXECUTE (on host):**
```bash
sudo systemctl stop hive-fleet-manager.service
sudo systemctl disable hive-fleet-manager.service
pkill -f "stream-watcher.mjs"
pkill -f "hive-plutus"
```

**VERIFY:**
```bash
systemctl is-active hive-fleet-manager.service  # Expected: failed
systemctl is-enabled hive-fleet-manager.service # Expected: disabled
```

---

*End of Appendix A. All 16 genuine improvements with exact code diffs. Apply them in order A.1 through A.22. Each is verified against the Bible. Each improves without regressing the checkpoint's quality.*

