# BUG LOG — All Known Bugs with Forensic Detail

**Last Updated:** 2026-07-25
**Source:** V4.2 Overhaul — all 9 original bugs addressed + config derailment fix

---

## V4.2 ORIGINAL BUGS (All Fixed in v4.2_OVERHAUL)

### BUG-1: Multiple-TP Code (tp1_5, tp2, maximumRrr) — CRITICAL ✅ FIXED
**Status:** FIXED in v4.2 CS-1.
**Impact:** Violated single-TP principle. 65 references across 5 files.
**Root cause:** 6_SETUPS baseline code computed tp1_5 (70% of TP distance), tp2 (further opposing zone), and blended RRR across multiple TPs.
**Files affected:**
- `engine3/visual-setup-generator.ts` — 12 references (computation + output)
- `types.ts` — 5 references (interface fields)
- `engine3/types.ts` — 2 references (VLMExtraction interface)
- `report/report-generator.ts` — 12 references (table columns, RRR display, Pine Script)
- `engine/plutus-tte-pipeline.ts` — 14 references (legacy, already undefined)
**Fix applied:** ALL references purged. Blended RRR now computed across 3 staggered entries.
**Verification needed:** Container test — confirm no tp1_5/tp2 in output.

### BUG-2: Day-Level Direction Lock — CRITICAL ✅ FIXED
**Status:** FIXED in v4.2 CS-2.
**Impact:** GBP/USD and AUD/USD produced 0 setups. Only ONE direction allowed per day.
**Root cause:** `resolveDirection()` returned ONE TradeDirection for the entire day. `selectEligibleVisualZones()` filtered ALL zones by that one direction.
**Evidence:** Golden standard Wednesday had SHORT (supply), LONG (demand), SHORT (supply) — 3 different directions in one day.
**Fix applied:** resolveDirection deleted. selectEligibleVisualZones deleted. Direction determined inline per zone: supply→SHORT, demand→LONG.
**Verification needed:** Container test — confirm both LONG and SHORT setups for GBP/AUD.

### BUG-3: Identity Says "Hard Filter" — HIGH ✅ FIXED
**Status:** FIXED in v4.2 CS-3.
**Impact:** Agent identity injection told the model "DXY cascade hard filter" — causing the model to self-reject counter-trend setups.
**File:** `hooks/system-transform.ts` line ~36
**Fix applied:** Changed to "MACRO DIRECTION (not hard filter — counter-trend scalps valid with 3+ confluences)".
**Verification needed:** Manual review of identity text in container.

### BUG-4: Hardcoded Shape Direction Lists — MEDIUM ✅ FIXED
**Status:** FIXED in v4.2 CS-4.
**Impact:** `bullishShapes` and `bearishShapes` hardcoded sets in shape-brain.ts determined direction from shape classification instead of zone type.
**File:** `brains/shape-brain.ts` lines ~1147-1157
**Fix applied:** Lists deleted. Direction from zone type (supply→SHORT, demand→LONG).
**Verification needed:** Container test — confirm direction matches zone type.

### BUG-5: LQZ Detector Receives 4H Bars — CRITICAL ✅ FIXED
**Status:** FIXED in v4.2 CS-5.
**Impact:** LQZ detector calibrated for 1H patterns received 4H bars. Every threshold miscalibrated by 4×.
**File:** `pipeline/engine.ts` line ~350
**Fix applied:** Changed to `ctx.harvestData.ohlcByPairTf[pair]['1H']`.
**Verification needed:** Container test — confirm LQZ zones generated.

### BUG-6: mergeLqzWithIpZones Never Called — CRITICAL ✅ FIXED
**Status:** FIXED in v4.2 CS-6.
**Impact:** LQZ zones naively concatenated instead of properly merged. No confluence boost or ZFP reduction.
**File:** `pipeline/engine.ts` line ~370
**Fix applied:** Naive concat replaced with `mergeLqzWithIpZones(allZones, lqzResult, pair)`.
**Verification needed:** Container test — confirm LQZ zones have confluence boost.

### BUG-7: Browser Port Mismatch — LOW ✅ FIXED
**Status:** FIXED in v4.2 CS-9.
**Impact:** TvChartController hardcoded port 9228. Container Chrome runs on 6930.
**File:** `pipeline/engine.ts` line ~972
**Fix applied:** TvChartController REMOVED entirely. Replaced by agent MCP tools (charts tool).
**Verification needed:** N/A — component removed.

---

## V4.2 SESSION BUGS (Found and Fixed During Implementation)

### BUG-8: Config Derailment (hive-mind/shadow-hive plugins) — CRITICAL ✅ FIXED
**Status:** FIXED by rebuilding Docker image from scratch.
**Impact:** opencode 1.14.x rejects `"plugins"` key in config.json → FATAL crash, drops to bash shell. Every container start failed silently.
**Root cause:** Dockerfile had a Python RUN layer that read the base image's config.json (containing stale `"plugins": [hive-mind, shadow-hive]` from OTHER sessions) and modified it. The stale `"plugins"` key was preserved.
**Evidence:** 4 container test failures all showed same pattern: agent never initialized, TUI never started.
**Fix applied:** Rebuilt `plutus-container-testing:master` from scratch with clean Dockerfile that COPYs correct config.json directly (no Python modification layer). No `"plugins"` key at all.
**Verification:** Confirmed working — 4 successful container starts after fix.

### BUG-9: TvChartController Port 9228 — MEDIUM ✅ FIXED
**Status:** FIXED in v4.2 CS-9 (TvChartController removed entirely).
**Impact:** Component crashed on every chart operation because it connected to wrong port.
**Root cause:** Hardcoded `9228` instead of `6930`.
**Fix applied:** Component removed. Charts now use agent MCP tools directly.
**Evidence:** v4.2_12SETUPS build showed TvChartController crash in TUI stream.

### BUG-10: sdkClient.prompt is not a function — MEDIUM ✅ FIXED
**Status:** FIXED when charts tool was rewritten.
**Impact:** charts tool called `sdkClient.prompt()` which doesn't exist in the opencode SDK.
**Root cause:** Charts tool was written assuming a prompt API that was never implemented.
**Fix applied:** Charts tool rewritten to accept screenshots from agent via MCP tools.
**Evidence:** Found during v4.2_20SETUPS debugging session.

### BUG-11: tv_screenshot writes base64 as text not binary — LOW ✅ FIXED
**Status:** FIXED with plutus-save-screenshot tool.
**Impact:** Screenshots saved as base64 text files instead of binary PNG. Not usable for chart rendering.
**Root cause:** Naive file write of base64 string without decoding.
**Fix applied:** plutus-save-screenshot tool added — decodes base64 to binary PNG before writing.
**Evidence:** Found when chart images were corrupt text files.

### BUG-12: Config.json overlay restoration issue — LOW ✅ FIXED
**Status:** FIXED by rebuilding Docker image.
**Impact:** Even after docker cp wrote correct config.json, Docker layer caching could restore the old one.
**Root cause:** Image layer caching preserved the baked-in (incorrect) config.json.
**Fix applied:** New image built with correct config baked in at build time. docker cp no longer needed for config.
**Evidence:** Multiple attempts to fix via docker cp failed. Only image rebuild worked.

---

## RESOLVED BUGS (Fixed in v4.1 merge)

### RESOLVED-1: plutus-omni-vision Tool Not Registered
**Status:** FIXED in v4.1. Tool now imported and registered in index.ts.

### RESOLVED-2: config.json Listed Non-Existent plutus-backtest-setups
**Status:** FIXED. Backtest tool added to pipeline/engine.ts, registered in createPipeline4Tools.

### RESOLVED-3: Old v3 Tools Still Registered
**Status:** FIXED. plutus-generate-report and plutus-chart-vision removed from plutus-tools.ts.

### RESOLVED-4: Stale Comment in tool-allowlist.ts
**Status:** FIXED in v4.2 CS-9.

---

## WAVE A AUDIT BUGS (Found 2026-07-25 by 4-agent audit — fixes per PLUTUS_V4.2.1_REMEDIATION_WAVE_SPEC.md)

### BUG-13: Identity Header Injects "HARD FILTER … REJECTED" Every Turn — CRITICAL ⏳ IN FIX (PKG-1)
**Impact:** CS-3 regression. `identity/index.ts:225-228` tells the agent DXY cascade is a HARD FILTER with counter-direction FX setups "REJECTED" — while system-transform.ts:36 correctly says MACRO DIRECTION one line later. Both injected every turn. Probable root cause of missing DXY/GBP/AUD LONGs (agent self-rejects valid counter-trend setups). Also 5× stale omni-vision directives (:96,119,146,148,151) contradicting read()-direct doctrine, and stale 2-phase charts text (:116-117,181-182).
**Fix:** Full identity rewrite per spec §1. system-transform.ts:40 stale Step D + :21 fallback identity also fixed.

### BUG-14: Blended RRR Uses Front-Entry SL Distance for All 3 Legs — HIGH ⏳ IN FIX (PKG-2)
**Impact:** `visual-setup-generator.ts:311,412-414` — slDist computed from front entry only, divided into all 3 entries' RRR. Mid/back RRR systematically mispriced (overstated LONG, understated SHORT).
**Fix:** each leg divides by own |entry−sl|.

### BUG-15: Chained Setups Bypass All Gates + Cap-Ordering Bug — HIGH ⏳ IN FIX (PKG-2)
**Impact:** `:492-495` early return skips chaining when cap hit; chained setups pushed after cap check (can exceed cap); chained setups skip dedup/confidence floor/SL ceiling.
**Fix:** chaining before caps (caps now deleted anyway — D16); chained setups pass same gates.

### BUG-16: Generator Distance Filter Diverges from Canon — HIGH ⏳ IN FIX (PKG-2)
**Impact:** base 300 pips (canon 200), no ±2.00 DXY constant (DXY filter no-op unless ATR supplied), relax-to-nearest-3 escape hatch makes proximity gate soft. engine.ts setups tool has correct ±200/±2.00 — two filters disagreed.
**Fix:** align to canon, remove escape hatch.

### BUG-17: browse-screenshot Wrong-Page Fallback Fabricates Evidence — CRITICAL ⏳ IN FIX (PKG-3)
**Impact:** `engine.ts:886-905` — invalid CDP endpoint `/json/navigate`, then screenshots ANY open page and returns "success". Silent fabrication into the zones firewall.
**Fix:** full rewrite per spec §3 — single path, element-clipped table screenshot, MiMo VALID/INVALID gate (fixed prompt const), throws on failure. NO fallbacks.

### BUG-18: Backtest Same-Bar TP/SL Resolves to WIN First — HIGH ⏳ IN FIX (PKG-3)
**Impact:** `engine.ts:1238-1251` — TP checked before SL within a single 1H bar → ambiguous bars booked as wins → inflated win rate.
**Fix:** 30m native intra-bar resolution + TV broker-emulator path fallback (D22).

### BUG-20: IP Zones Misclassified as MoM (:819 collapse) — CRITICAL ✅ FIXED (Wave D)
**Impact:** `engine.ts:819` — `classification: ez.sdType === 'BoM' ? 'BoM' : 'MoM'` collapsed ALL IP zones (sdType='IP', pivot/MA/option-derived) into 'MoM'. IP zones are NOT MoM order blocks — MoM only forms from OB candles mid-BS/WL move (Bible 4.13). Result: 96 "virgin MoM" G0 rejections (phantom — those zones were never MoM). Root cause of Wave B DXY=1 and Wave C DXY=0.
**Fix:** `classification: sdType === 'BoM' ? 'BoM' : sdType === 'MoM' ? 'MoM' : 'UNMITIGATED'` — IP zones correctly classified as UNMITIGATED. G0 now fires only on actual MoM order blocks.

### BUG-21: mappedIPZoneName Never Populated + TypeError Landmine — CRITICAL ✅ FIXED (Wave D)
**Impact:** `mappedIPZoneName` never assigned in fallback zone conversion (engine.ts:813-826) or zod schema. Generator's G0 LQZ exemption (`vz.mappedZoneName.toUpperCase()` at :291) crashed with TypeError on undefined. Wave C introduced this crash via the LQZ exemption — explains Wave C DXY=0 while Wave B (pre-exemption) worked.
**Fix:** (a) `:813-834` — `mappedIPZoneName: ez.zoneName || ''` populated. (b) `:291` + 6 more sites — `(vz.mappedIPZoneName ?? '').toUpperCase()`.

### BUG-22: LQZ Identity Destroyed in Fallback Conversion — HIGH ✅ FIXED (Wave D)
**Impact:** Fallback conversion forced `type: ceiling > spot ? 'SUPPLY' : 'DEMAND'` (LIQUIDITY destroyed) and `source: 'FALLBACK_IP_EDGE'` (no LQZ marker). G0 LQZ exemption couldn't recognize LQZ zones because all identity markers were stripped.
**Fix:** When `sdOverlap === 'LQZ'` or `zoneName.includes('LQZ')`: `type: 'LIQUIDITY'`, `source: 'FALLBACK_LQZ'` — preserves LQZ identity on all 3 exemption signals.

### BUG-23: BoM Body Criteria Missing (Bible Step 0f) — HIGH ✅ FIXED (Wave D)
**Impact:** `classifyOrderBlock` only checked prior-move-direction. Bible requires body-to-wick ≥ 3.0 + body ratio ≥ 0.65. More zones got BoM than sanctioned → wrong +5 confidence bonus, wrong ENTRY-PRIMARY treatment.
**Fix:** Added `bodyToWick >= 3.0 && bodyRatio >= 0.65` to `classifyOrderBlock`. Prior-move logic unchanged.

### BUG-24: Consolidation Week RRR Floors Not Applied — HIGH ✅ FIXED (Wave D)
**Impact:** RRR floor always rrrForCategory().tp1 (SS=1.5). Bible Part 8.6 has Consolidation Week relaxed floors (SS=1.2, HTF=1.5). Multiple DXY zones rejected at RRR 1.38-1.49 (< 1.5) when the week was ALL-SS (consolidation). With floor 1.2 they pass.
**Fix:** `isConsolidationWeek` detection (all days SS/R/WLS) + `CONSOLIDATION_WEEK_FLOORS` map applied in RRR gate.

### BUG-25: IP Zone Exclusion (WRONG — excluded valid entry zones) — CRITICAL ⏳ REVERT
**Impact:** IP zones excluded from entry candidates entirely. WRONG. IP zones ARE valid entry anchors with institutional pressure confluence. The 11-setups checkpoint included them with proper filtering (±200p, top 20, distance sort, dedup, honest FALLBACK_IP_EDGE label) and produced DXY 101.13 ≈ golden 101.14 precision. The 22 DXY slop was from dedup WITH day + no confluence gate + no distance filter on IP curation — NOT from IP zones being entries.
**Fix:** REVERT. Restore IP curation: ±200 pips (DXY ±2.00), distance sort, top 20, price-overlap dedup, honest FALLBACK_IP_EDGE label (VLM_UNAVAILABLE).

### BUG-26: Fallback Removal (PARTIALLY WRONG — removed honest supplement) — HIGH ⏳ REVERT
**Impact:** Engine 1 fallback removed entirely. The 11-setups checkpoint had honest fallback: Engine 1 zones supplemented VLM zones with FALLBACK_IP_EDGE label (VLM_UNAVAILABLE), NOT VLM_CONFIRMED. This was a SUPPLEMENT (additional candidates for TP targeting and entry), not a REPLACEMENT. The operator's "NO FALLBACK" rule means no DISHONEST fallback (calling Engine 1 zones VLM_CONFIRMED), not no Engine 1 supplementation.
**Fix:** REVERT. Restore honest fallback: Engine 1 zones supplement VLM zones with FALLBACK_IP_EDGE label (VLM_UNAVAILABLE). VLM zones remain PRIMARY.

### BUG-27: Audit Agent Read Wrong Files (Regression Claims R1-R13 False) — ✅ CONFIRMED
**Impact:** Bible resynthesis audit claimed 13 regressions in "current src/" (resolveDirection, tp1_5/tp2, dedup with day, LQZ 4H bars, mergeLqz never called, TvChartController 9228, dishonest fallback, options hard-required, weakened IP curation). ALL FALSE for v4.2.1_REMEDIATED. Verified: resolveDirection = comment only, tp1_5/tp2 = 0, chaining present, cascade present, confluence gate present, LQZ 1H bars (:343-344), mergeLqz called (:372), TvChartController/9228 = 0. The audit agent read the wrong files (main project src/ or older checkpoint).
**Fix:** NONE — code is correct. Audit's analysis of the 11-setups checkpoint itself is VALUABLE (see BUG-25/26).

### OPEN ITEM: Pillar zone width hardcoded 10 pips (V2 from Bible audit)
Bible Law 2: TF-dependent widths (4H = 15-40 pips). Code hardcodes 10 pips for all pillar zones. Fix deferred — impacts zone overlap/precision.

---

## V4.3 FORENSIC BUGS (Found 2026-07-26 by 5-agent exploration — fixes per PLUTUS_V4.3_BUILD_SPEC.md)

### BUG-28: SL Over-Inflation (Far-Edge + 3×Buffer Anchor) — CRITICAL ⏳ IN FIX (Phase 2)
**Impact:** `visual-setup-generator.ts:664-719` — `computeSLZoneGeometry` Method 1 computes `entryZone.bottom − 3×buffer` (DXY = 15 pips beyond the FAR edge). Measured from the front entry at the NEAR edge, effective SL = zone partial width + 15 pips = 25-30 pips on typical DXY zones. Golden SLs are 4-9.5 pips (next LQZ rung). This is the single largest RRR killer: with TP at near edge of nearest opposing zone, RRR compresses to 0.6-1.2 → floor-gate kills golden Trades 1, 2, 4. Operator ruling D35: "SL goes INSIDE the NEXT LQZ next to the entry zone. Should usually be within < 20 pips. Any massive stupid 40 pip SLs are dumb."
**Fix:** NEW `computeSLNextLqzRung` — SL inside next LQZ rung beyond entry zone + pair buffer (EUR 2, GBP 3, AUD 3, DXY 5). T6 exception (unmitigated 4H block edge). Law-10 floor (0.5×ATR₁ₕ). Law-8 fallback. D17 ceiling (36p → null → repair trigger). V4.3 spec §6.1.

### BUG-29: TP at Nearest Opposing Zone of ANY Type (No Significance, No Path Check) — CRITICAL ⏳ IN FIX (Phase 2)
**Impact:** `visual-setup-generator.ts:732-770` — `computeTPEarthFire` takes the nearest opposing SUPPLY/DEMAND/LIQUIDITY zone, near edge (midpoint only if liquidityScore ≥ 5). Cannot skip to the BoM at 100.680 (golden T6, 55.5p past 5 mitigated zones) or the MoM at 100.845 (golden T2). No Law-14 walk (intermediate UM zones are hard reaction points). No Law-12 (TF ≥ entry). No Law-13 (ATR sanity). Kills golden T2, T5, T6 directly; the short TP leg + BUG-28's wide SL compresses RRR below floors for everything else.
**Fix:** NEW `computeTPSignificancePath` — significance ranking (UM BoM +100, Earth+Fire +50, BoM +25, MoM≤1× +15, depleted −100) → Law 12 → Law-14 walk (pass mitigated, cap at first UM) → Earth+Fire midpoint / near-edge → TP min distance 1.2×SL → Law 13 (2× ambitious, 3× next candidate). V4.3 spec §6.2.

### BUG-30: Silent Hard-Reject on Gate Failure (No Repair, No Context) — HIGH ⏳ IN FIX (Phase 3)
**Impact:** every gate failure is a silent `continue` — the trade dies with no logged reason and no repair attempt. Operator ruling D36: "When a trade setup is rejected it should not immediately hard reject. It should give context WHY, force an IMPROVED setup for the same trade that does not derail from principles, and try again up to twice. Often it is just a dumb SL/TP making a trade 1.8 vs 3.6 vs 4.5 RRR. If the trade fails 3 times then hard reject."
**Fix:** NEW `generateWithRepair` — 3 attempts (SL rung / rung+1 / Law-8 fallback; TP significance / next-ranked / ATR-fallback), entry FIXED, per-attempt gate-context logs, `🔧 REPAIRED(n)` annotations, hard rejects with full 3-attempt audit trail in report Filter Checkpoint. V4.3 spec §7.

### BUG-31: Zero-VLM Pair Skip Fires BEFORE Fallback Merge — HIGH ⏳ IN FIX (Phase 1)
**Impact:** `engine.ts:728-729` — `if (pairValidated.length === 0) continue;` fires before the Engine-1 fallback merge, so a pair with 0 agent-produced VLM zones produces 0 setups even when Engine 1 mapped 200+ zones for it. The fallback exists to carry a pair when VLM is thin — but the skip fires before the supplement is merged. Operator: "thats dumb. need smarter logic here."
**Fix:** merge Engine-1 candidates FIRST, then skip only if TOTAL candidates < 3. Log when a pair proceeds on FALLBACK_IP_EDGE provenance. V4.3 spec §5.1.

### BUG-32: Day-Blind Dedup Starvation (Multi-Day Validity Killed) — HIGH ⏳ IN FIX (Phase 4)
**Impact:** `visual-setup-generator.ts:344-352` — dedup key `direction_entry_sl_tp` (no day, no category) collapses the 5-day × 1-2-category retry loop to 1 setup per zone. The day loop becomes zone-consumption instead of opportunity-multiplication. Operator: "same zone can be valid for multiple days." (Golden proof: 100.975 = T4 TP AND T5 entry.) But the 40-checkpoint's day-key-only re-fires identical geometry 4× (the 3×4 inflation).
**Fix:** key = `direction_entry_sl_tp_day_category` + consumption rule (same category + identical geometry + unchanged state = skip). V4.3 spec §8.4. Operator ruling D39.

### BUG-33: Chaining Kill-Switches (Golden T4→T5 Chain Dies) — HIGH ⏳ IN FIX (Phase 4)
**Impact:** `visual-setup-generator.ts:490-493` — MAX_SETUPS early-return skips `generateChainedSetups` entirely when cap hit (40-checkpoint: chaining NEVER ran). `:1079` — TP-zone `reactionCount > 1` skips: LQZ zones carry touch_count ≥ 2 BY CONSTRUCTION (2 pattern types aligned → touches summed), blocking exactly the rungs golden chains pivot on (100.975, 101.240). `:1104` — chained RRR hardcoded HTF_SWING 2.0 floor regardless of source category. Golden T4→T5 chain dies at `:1104`.
**Fix:** chaining runs unconditionally (no caps — D38). LQZ-pivot exemption on the freshness gate. Chained RRR = source-category floor. V4.3 spec §8.3.

---

## SUMMARY

| Category | Count | Status |
|----------|-------|--------|
| V4.2 Original Bugs | 7 | All Fixed |
| V4.2 Session Bugs | 5 | All Fixed |
| v4.1 Resolved Bugs | 4 | All Fixed |
| Wave A Audit Bugs | 6 | All Fixed |
| Wave B/C/D Classification Bugs | 5 | All Fixed |
| Post-Audit Correction Bugs | 3 | 2 in revert, 1 confirmed false |
| V4.3 Forensic Bugs | 6 | In fix (Phases 1-4) |
| **TOTAL** | **36** | **V4.3 build loop executing** |

---

# ═══ 2026-08-01 WAVES G+H COMPLETE (the corrective build — FIX PLAN v2, phase 1) ═══

## THE STATE (mechanically verified 2026-08-01)
- **Golden ≤3 pip: 11/22** (session start 4/22 → Wave G 7/22 → Wave H 11/22). DXY 6/6 (#1 Mon LONG Δ5.5p→Δ0.0p via the §8.1 internal-rung entry; #5 Wed LONG MISSING→EXISTS Δ2.9p 🔧 REPAIRED via the source-lane refinement wiring). EU 2 hits (1.14544 Δ1.5p, 1.14505 Δ2.4p). GU 3 hits (1.33629 Δ2.9p, 1.34021 Δ2.7p, 1.34360 Δ2.6p).
- **Determinism: `7af5453b` ×2 byte-identical** (the NEW baseline, replaces baf0e068). Report: HEADLINE 8 trades 5W/3L +16.07R avgRRR 3.81x · 27 unique (DXY 9/EU 8/GU 10). tsc 0 · build 1.24MB.
- **Wave G (cascade-as-validation):** `src/mdve/cascade-translation.ts` NEW (581L — structural-equivalence engine: element BoM→BoM/MoM→MoM/LQZ→LQZ, role DXY/EU inverse + EU/GU kept, ±48h formation/reaction window, position-in-structure, structural PRIMARY + strength SECONDARY, honest absence); `assignZonesByDay` RETIRED from designation (shape-cascade.ts); report-v452.ts restored the interleave (pair E1 BEFORE the cascade → translateCascadeDayMap → pair E2 CORE runs → computeChainDivergence ≤0.35 → cascadeV45 with shapeChains = the PAIR BRAINS' days); shape-brain.ts dual-side designation completed (oppositeReach — SHORT days now designate demands too). **EU lane REAPPEARED (was 0), GU lane REAPPEARED (was 0), divergence EU 0.00 / GU 0.00 VALIDATED, DXY NO REGRESSION.**
- **Wave H (structural TP + source-lane precision):** mirror.ts — computeLmvTP/computeMirrorTP PRIMARY = the structurally-equivalent opposing BoM wall's internal LQZ (NEVER nearest; Law-14 UM-path check; MoM-to-BoM extension "+2R"); `entryPrice_LMV` + v4.5.5 FIX 3 (entry-precision fallback) RE-PORTED from `Checkpoints/_ARCHIVED/v4.5.5_PRISTINE_CORE/` (the forensic finding); mirror tradeDay = the SOURCE's signal day (fixed the pre-week Jun-18 labels + the fill-model bracket). setup-gen.ts — §8.1 internal-rung entry (F1-C) + the RRR_BELOW_FLOOR → refineSetup wiring (source-lane repair path) + the F1-B find fix + the float-stability quantizer. **NEW permanent gate: diag-structural-tp.ts PASS (Mon EU SHORT TP 1.14100 vs golden 1.14103 = Δ0.3p, RRR 7.03, tradeDay Monday; no TP at a MoM shelf when a BoM wall exists).**
- **Frozen list UNTOUCHED** (sl-lmv 91294083, trade-dedup 33914c89, engine.ts, visual-setup-generator.ts byte-identical). No computeMirrorTP-primary reintroduced. No hardcoded Jul-6-10 levels.
- **REMAINING (Waves I-L):** I = the 3D refinement machine (P1-P8/C1-C6/T1-T8 layers + verdicts + RE_TRANSLATE loop + global wiring incl. the emergent lane + the CS-1 day-native reference fix) + the EU designation precision + the probe-window fix (the golden Mon SL 100.905 / TP 101.115 fidelity); J = hallucination detector + rejected-setup log (data/rejected_setups/{run}/); K = the manual review stage (sequential → batch filter → 2 revisions → final report); L = full gates (23/23), container test (clean-v421, 4-element evidence), visual eval overlay, ship package + final checkpoint. EU misses to close: 1.14205 Δ32.4p, 1.14325 Δ20.4p, 1.14004 Δ8.6p, 1.13950/1.13953 Δ~14p (designation/CS-1 issues).

---

# ═══ 2026-08-01 FINAL AUDIT + COMPACTION PREP — THE TRUE STATE (READ FIRST) ═══

## THE VERIFIED STATE (zero-trust audited — never the claimed state)
- **Golden ≤3 pip: 6/22** (DEGRADED from 11/22 at the Wave-H peak — the E2-authoritative fixes shifted the DXY emissions off the golden levels). The DXY lane is **6W/0L +24.04R overall** (all winning — BETTER R than the original baseline +21.61R) but no longer at the golden levels.
- **EU/GU: 0 resolved trades** (0W/0L n=0) — the cascade does NOT produce tradeable mirrors. 7 STALE (NOT_TRIGGERED). **THE CASCADE ROOT CAUSE IS NOT YET FIXED.**
- **The E2 designation is CORRECT** (probe-verified): EU Mon keyZoneId `EUR/USD|1H|1783648800000|1.14469`, keyZonePrice **1.14567** (golden 1.14544, Δ2.3p), session "NY Overlap 08:00-10:00 ET". `selectPairNativeZone` WITH the class-blind fix returns the E2 zone. **But the report emits E 1.14494 / session TOKYO — the E2 designation is NOT reaching the emitting mirror path.**
- Determinism: report c6cc3537 ×2 · dist ee259e00. tsc 0 · build 1.27MB. Frozen pair: sl-lmv 91294083 · trade-dedup 33914c89.
- The report headline: 5 trades 5W/0L 100% +19.07R (DXY only) · IN-WEEK-TRIGGERED 6W/0L +24.04R · OVERALL 12 unique 6W/0L.

## THE TWO MAJOR ARCHITECTURAL OVERHAULS (the operator's 2026-08-01 directives — the next session's authority)
**FULL SPEC: `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` (read it — it is the build authority).**

### OVERHAUL A — E1 REINTEGRATION (the 9-pillar IP zone map + the prior-week backwards-mapping pre-flight)
- **The problem:** the v452 report path (`report-v452.ts` → `buildChartModel`) builds **pure S/D/L only**. `pillarEngine` (src/brains/9-pillar-lobe.ts, 2,371L) is called ONLY in zone-brain.ts:310, the DEAD plutus-tte-pipeline.ts:539, and engine.ts:531 (the 5-tool pipeline — **which report-v452.ts does NOT import**). No pivots/MA/options (P3/P8)/analyst (P4)/Fib (P6) confluence. ZFP comes from the canon ladders, NOT the 6D confluence step function (Bible 4.0 §4.11).
- **The operator (QUOTED):** "how much of this E1 specific web data prompt is being skipped that maps the IP zones? That drive the fucking E2 shapes? so you're just doing S/D/L and nothing else?" + the system prompt (Trident_System_Prompt_v5.3.3_DOWNLOAD_ME.md, 4,216L): Engine 1 = "9-Pillar 6D Hybrid System... Maps Institutional Pressure (IP) zones."
- **The options data:** `/home/leviathan/Pictures/Jul_6_Options_Data.jpg` — the operator-provided Jul-6 options expiry data. It is a FUNDAMENTAL Pillar 3/8 input, NOT skippable. For replay weeks the image substitutes for the live Protocol-A page (gone for Jul-10-2026).
- **The prior-week pre-flight (the operator's NEW directive):** "the previous weeks entire E1/E2/E3 pipeline needs to be BACKWARDS MAPPED ON THE AVAILABLE HISTORICAL DATA AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE MACRO STORYLINE... I bet thats not wired in anywhere is it" — **verified NOT wired.** The fixture holds 6+ weeks of bars (1H 1,500 ≈ 62d; 4H 500 ≈ 83d) but NO module runs the prior week's E1/E2/E3 as a storyline pre-flight. The only narrative code (src/mdve/narrative.ts:57-60) measures the WEEK's own sweep vs the prior extreme — not a full prior-week pipeline.
- **The fix:** (1) wire pillarEngine into the v452 path (IP levels → zones with confluence/ZFP; DECISION-1 respected — IP zones are confluence/SL-TP, never entries); (2) ingest the options image (parse → three-tier → DXY-equivalent walls → Options-Derived confluence + ZFP modifiers); (3) the prior-week pre-flight module (run the prior week's E1/E2/E3 → the storyline context: sweep origin, range, defended/broken (Law 28), role reversals (Law 29), depletion, prior shape chain → feed the forward E2); (4) IP-zone ZFP from the 6D confluence step function.

### OVERHAUL B — THE E2-AUTHORITATIVE CASCADE (the mirror lane must consume the E2 designations end-to-end)
- **The operator:** "it is literally so fucking simple... 6 winning DXY trades = 6 winning EU trades and 5-6 winning GU trades... DXY literally gives the exact fucking map."
- **The known facts:** cascadeV45 (mirror.ts:3009) → reAnchorMirror (mirror.ts:2516) → selectPairNativeZone (mirror.ts:1362, the class-blind E2 exact-match at :1402) — the NEW path with the E2 fixes. **`cascade` (mirror.ts:~855) → `findMirrorAnchor` (:884) + `buildMirror` (:892) — the OLD path, which does NOT consume the E2 shapeDay. THE PRIME SUSPECT: the report's EU rows (provenance MIRV45-...) may come from the OLD path.**
- The day-index: euDayIdx = floor((sourceFormationMs − weekStartMs)/86.4M) (mirror.ts:3049) — the DXY Mon source zone formed 2.42 days BEFORE the week (June, from the 720-bar lookback) → −3 → clamped 0 (Monday, by luck). The day must come from the SOURCE SETUP's signal day (battleMs), never the zone's formation.
- **The fix:** (1) determine which cascade path the report uses (instrument one EU mirror: shapeDay + anchor + entry) and wire the E2 consumption into the emitting path; (2) entry = the E2 keyZonePrice when the anchor is the E2 zone (mirror.ts:2623-2627 — verify it fires); (3) session = the E2 shapeDay's session (NY Overlap), NOT the anchor's battle session (TOKYO); (4) the day-index = the source setup's signal day; (5) the RE_TRANSLATE (mirror.ts:2799) must NEVER override an E2 designation — E2-designated anchors repair SL/TP ON the E2 zone, never re-anchor; (6) GU mirrors the ACTIVE EU mirrors (mirror.ts:3079-3082).

## THE REGRESSIONS TO FIX (priority order)
1. **Golden 11/22 → 6/22** (the E2-authoritative fixes shifted the DXY emissions — the lane is all-winning but off the golden levels; the #1 Mon LONG must be at 100.945 Δ≤1p, #5 Wed LONG at 100.975 Δ≤3p).
2. **EU/GU 0 resolved** (Overhaul B).
3. **The diag-source-lane S1 SL/TP fidelity** (Mon LONG SL 100.853 vs golden 100.905, TP 101.240 vs golden 101.115 — the probe window + the refinement A2 interplay).
4. **The container test is PARTIAL** (the deterministic gates host-verified; the container's model stalled + the deploy silent-gap; the full TUI run pending).

## THE VERIFIED PROVEN MACHINERY (do NOT re-open)
Wave G (cascade-translation.ts 581L + assignZonesByDay retired + the interleave + dual-side) · Wave H (structural TP + entryPrice_LMV/FIX 3 re-ports + tradeDay + CS-1 day-native) · Wave I (the 3D machine P1-P8/C1-C6/T1-T8 + the RE_TRANSLATE loop) · Wave J (hallucination detector + the rejected-setup log) · Wave K (review-stage.ts 1,032L) · the 8 gate diags · the frozen pair (sl-lmv 91294083, trade-dedup 33914c89).

## THE CHECKPOINT
`Checkpoints/v4.5.2_AUDIT_2026-08-01/` — the TRUE state (src + report + diags + MANIFEST with the degraded golden 6/22 recorded honestly). Prior anchors: v4.5.2_FINAL_PRE_AUDIT (3.7MB, the pre-audit state) → v4.5.2_OVERHAULED_BASELINE (147598aa, the pre-corrective-build state).

## THE NEXT SESSION
Execute `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` — **Overhaul B first (the cascade), then Overhaul A (E1 reintegration), then the regressions, then the container test + the ship.** The 5-line proof-of-context required before any code.
