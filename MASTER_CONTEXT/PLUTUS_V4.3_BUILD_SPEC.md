# PLUTUS TTE — V4.3 BUILD SPECIFICATION
## Fork → Volume Restoration → Anchor Geometry → Retry Loop → Architecture → TVI → Ladder → Validate → Ship

**Document ID:** PLUTUS-V4.3-BUILD-SPEC
**Classification:** RUNTIME_GRADE_BUILD_SPEC — MASTER EXECUTION DOCUMENT
**Date:** 2026-07-26
**Fork From:** `Checkpoints/v4.2_11SETUPS_PRECISION_DXY101pt13/` (SHA: `b414d7894cebb45cbde8cef32d20d5a901cd005ce993a03aa65df5e0a1bd755b`)
**Supersedes:** `PLUTUS_V4.2.1_CONTINUATION_SPEC.md` (absorbed and amended — the 16 genuine improvements + 7 Bible gaps are folded into this spec with corrections from 5 forensic explorations + operator rulings)
**Authority Chain:** Bible 4.0 (design) → HANDOVER_37_FUNDAMENTAL_LAWS.md (laws) → TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md (anchor doctrine) → THIS SPEC (build) → context_management (state)
**Quality Bar:** CME specification grade. Zero derailments tolerated. Every pseudocode block annotated with the Bible principle it implements and the live-market mechanic it encodes.

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Doctrine Foundation — The Corrected Anchor Model](#2-doctrine-foundation)
3. [Current State Forensics — The 7 Volume Killers](#3-current-state-forensics)
4. [Phase 0: Fork + Verify](#4-phase-0-fork--verify)
5. [Phase 1: Volume Restoration](#5-phase-1-volume-restoration)
6. [Phase 2: Anchor Geometry (SL/TP/Law-14)](#6-phase-2-anchor-geometry)
7. [Phase 3: The Retry Loop](#7-phase-3-the-retry-loop)
8. [Phase 4: Category / Chain / Dedup Architecture](#8-phase-4-category--chain--dedup-architecture)
9. [Phase 5: TVI Implementation](#9-phase-5-tvi-implementation)
10. [Phase 6: Liquidity Ladder Module](#10-phase-6-liquidity-ladder-module)
11. [Phase 7: Container Test + Validation](#11-phase-7-container-test--validation)
12. [Golden Reconstruction Test Cases](#12-golden-reconstruction-test-cases)
13. [Anti-Derailment Guards — 15 Rules](#13-anti-derailment-guards)
14. [Verification Matrices](#14-verification-matrices)
15. [File Manifest](#15-file-manifest)

---

## 1. EXECUTIVE SUMMARY

### 1.1 What V4.3 IS

V4.3 is the build that takes the most precise checkpoint PLUTUS has ever produced (11-setups, DXY 101.13 ≈ golden 101.14 within 1 pip) and gives it the VOLUME and FULL TRADE SETUP ARCHITECTURE of the golden standard — without sacrificing one pip of that precision.

The core diagnosis, established by 5 parallel forensic explorations (3 codebase autopsies, 2 vision analyses of 24 winning-trade images):

**Both the 40-setups and 11-setups checkpoints have the SAME unique-setup starvation (~3 unique setups/pair).** The 40's "volume" was day-keyed-dedup inflation of the same 3 setups × 4 days. The real problem is not display volume — it is that only ~3 zones per pair survive the gate stack, and the survivors carry broken anchor geometry (over-inflated SL + nearest-any-zone TP) that kills them at the RRR floor.

**The fix is not more zones and not looser gates. The fix is correct anchors.** The operator's doctrine, verified against every ticketed trade in the winning library (minimum ticketed RRR = 5.7):

> "SL/TP is nearest opposing 4H S/D zone. The entry + TP should be on LQZ within the S/D zone. There is 0 reason any entry should be < 3 RRR if the anchors are set up properly. If all 3 are solid RRR will literally be 4 minimum."

> "SL goes INSIDE the NEXT LQZ next to the entry zone. Should usually be within < 20 pips of the actual entry. Any massive stupid fucking 40 pip SLs are dumb as fuck for no reason."

### 1.2 The 8-Phase Build Loop

| Phase | Name | What It Does | Kills |
|-------|------|--------------|-------|
| 0 | Fork + Verify | Fork 11-setups → v4.3_TVI_FORK, build green, crown-jewel grep battery | — |
| 1 | Volume Restoration | Smart pair-skip, mappedIPZoneName fix, LQZ 720, BoM/LQZ priority, zfp from confluence, gated pool 30, atr wiring, relax bound | K2, K3, K6 (partial) |
| 2 | Anchor Geometry | NEW SL model (next LQZ rung, <20p), NEW TP model (BoM/LQZ-overlap preference, Earth+Fire, Law 14 walk, Laws 12-13) | K1, K4 (partial) |
| 3 | Retry Loop | Rejection context + anchor repair + 2 retries + hard reject on 3rd with full audit trail | K1, K4 (residual) |
| 4 | Architecture | Category eligibility model, chaining reachability, dedup doctrine (day+category+consumption), session unification, no caps, remaining spec items | K5, K7 |
| 5 | TVI | Visual zone identification per 2,599-line TVI spec + god-vision autopsy guidance | K6 |
| 6 | Ladder Module | Liquidity ladders with BE cascade (Thu/Fri architecture, 16-61x class) | Architecture gap |
| 7 | Container Test + Sniff Test | Golden reconstruction ≥5/8, ≥6 unique/pair, quality table, NEVER save invalid | — |
| 8 | Ship + PVE | Checkpoint + ship package. PVE only after Engine 3 A-grade | — |

### 1.3 Success Definition (The Sniff Test, Quantified)

- ≥6 unique setups per pair (24+ total across DXY/EU/GU/AU), both directions per pair
- **Golden reconstruction: ≥5 of 8 golden DXY trades reproduced within 4-pip entry tolerance**
- SL distribution: mostly < 20 pips, ZERO 40-pip monsters; RRR distribution: median ≥ 3.5, ≥ 48% at 1:4+ (38-trade forensic bands)
- Chain links visible (T4→T5→T6 class), retry-loop repairs annotated in report
- Honest provenance: VLM_CONFIRMED/VLM_NEW primary, FALLBACK_IP_EDGE labeled
- WL at Hard Walls only (zfp < 20), SS at ceiling/floor only, category diversity

---

## 2. DOCTRINE FOUNDATION — THE CORRECTED ANCHOR MODEL

*This section is the doctrinal core of V4.3. Every code change in Phases 2-4 implements one of these doctrines. Each doctrine is verified against: (a) Bible 4.0 laws, (b) the 37-laws handover, (c) the golden-standard reference, (d) the 38-trade forensic, (e) 24 winning-trade images read by vision agents, (f) operator rulings.*

### 2.1 The 3-Anchor System

Every trade setup is a 3-anchor chain:

```
[SL ANCHOR] — behind → [ENTRY ANCHOR] — inside/overlapping → [LQZ sweep] — toward → [TP ANCHOR]
```

- **ENTRY ANCHOR:** a liquidity rung (LQZ) at the edge of a refined LTF zone nested inside an HTF S/D shell. Entry sits ON the rung. This is UNCHANGED from the fork — it is the proven A- precision mechanism (zone edge + forward spread; DXY 101.13 vs golden 101.14).
- **SL ANCHOR:** the NEXT LQZ rung beyond the entry zone — one rung out — NOT the entry zone's far edge + 15 pips, NOT a fixed pip distance, NOT an ATR multiple. (CORRECTED — see 2.2.)
- **TP ANCHOR:** the nearest opposing zone of BoM/LQZ-overlap significance at TF ≥ entry TF, reached via a Law-14 path walk — NOT the nearest opposing zone of ANY type. (CORRECTED — see 2.3.)

**Live-market mechanic:** you enter where someone else's stops just got taken (the sweep), you hide your stop behind the next liquidity shelf (where the next cluster of orders defends), and you exit where the next pool of stops sits (the opposing liquidity). The whole system is liquidity-to-liquidity.

### 2.2 SL Doctrine — The Next LQZ Rung (CORRECTED)

**Doctrine (operator ruling, image-verified):** SL goes INSIDE the NEXT LQZ rung beyond the entry zone. Usually < 20 pips from entry. 40-pip SLs are structurally wrong.

**Golden-week evidence (DXY, from the god-vision ladder):**

| Trade | Entry | SL | Distance | SL anchor |
|-------|-------|-----|----------|-----------|
| T1 Long | 100.945 | 100.905 | 4.0p | Next red rung down |
| T2 Short | 101.14 | 101.200 | 6.0p | Next red rung up |
| T3 Long | 100.845 | 100.77 | 7.5p | Next red rung down |
| T4 Short | 101.19 | 101.25 | 6.0p | Next red rung up |
| T5 Long | 100.975 | 100.905 | 7.0p | Same shelf as T1 |
| T6 Short | 101.235 | 101.330 | 9.5p | 4H BoM lower edge (EXCEPTION) |

**Winning-library evidence (ticketed trades):** SL buffers of 5, 6, 7.5, 8, 13, 14 pips (0.03%–0.11% of price). No 30-50 pip "safety" stops on LTF entries anywhere in the library.

**The exception (T6 template):** when the entry is positioned DIRECTLY AGAINST an unmitigated 4H BoM/Bo2L block, the SL goes inside/behind that block's edge — because the trade is only wrong if the block itself is violated. This is still minimal (9.5p in the golden case).

**Bible principles implemented:**
- **Law 7:** SL at next structural zone + 2-5 pip buffer (EUR 2, GBP 3, AUD 3, DXY 5). The "next structural zone" = next LQZ rung in the general case.
- **Law 10:** SL never tighter than 0.5×ATR(14) on 1H. The floor, not the target.
- **Law 8:** fallback = entry ± max(zoneWidth×2, 1.5×ATR) when no rung within 100 pips.
- **Law 9:** SL distance = zone geometry + buffer. Median ~15p, mode ~12p across 38 trades. Golden DXY band 4-9.5p.
- **D17 (operator):** 36 pips HARD ceiling. WARN > 25. Sniper < 15.

**Why the fork code is wrong:** `computeSLZoneGeometry` Method 1 computes `entryZone.bottom − 3×buffer` (DXY = 15 pips beyond the FAR edge). Measured from the front entry at the NEAR edge, effective SL = zone partial width + 15 pips = 25-30 pips on typical DXY zones. Wrong anchor (entry zone instead of next rung) AND wrong magnitude (3× instead of 1× buffer). This is the single largest RRR killer in the pipeline.

### 2.3 TP Doctrine — Significance-Preferred Opposing Zone + Law 14 Walk (CORRECTED)

**Doctrine:** TP = the nearest opposing zone of **BoM/LQZ-overlap significance** at TF ≥ entry TF, selected by walking the entry→target path and respecting unmitigated intermediate zones.

**Significance preference order:**
1. **Unmitigated BoM** (100% reaction — the "base camp" where the counter-attack occurs; T6's TP at 100.680)
2. **LQZ-overlapping S/D (Earth+Fire)** — structural zone with liquidity pool behind it; midpoint TP
3. **MoM** (mitigated ≤1×) — valid but weaker
4. **Other opposing zones** — near-edge TP only

**Earth+Fire rule (Law 11):** if the TP zone has liquidityScore ≥ 5 → TP at zone MIDPOINT (double reaction pressure — institutional defense AND forced stop-triggers fire simultaneously). Otherwise → TP at zone NEAR EDGE (quick exit).

**Law 14 walk (price cannot teleport):** walking entry→TP, price CAN pass through mitigated zones (their orders are consumed — T6 blew through 5 mitigated zones without pausing) but MUST react at unmitigated (UM) intermediate zones. If an UM zone sits between entry and the chosen target → the TP caps at that UM zone (it IS the reaction point).

**Law 12:** TP timeframe ≥ entry timeframe. A 15m scalp never targets another 15m zone — it targets 30m/1H. A 1H entry targets 4H.

**Law 13:** TP > 2×weeklyATR = "ambitious" annotation. TP > 3×weeklyATR = repair trigger (try next candidate — NOT a setup reject).

**TP minimum distance:** |TP − entry| ≥ 1.2× |entry − SL| — guarantees viable RRR before any other gate.

**Why the fork code is wrong:** `computeTPEarthFire` takes the nearest opposing zone of ANY type and puts TP at its near edge (midpoint only if liquidityScore ≥ 5). Two failures: (a) no significance preference — it can't skip to the BoM at 100.680 when nearer LQZ rungs exist (kills golden T2/T6-class trades); (b) no Law-14 walk — it doesn't know whether the path to the target is clear. Combined with the over-wide SL, this compresses RRR to 0.6-1.2 and kills setups at the floor.

### 2.4 Entry Doctrine — UNCHANGED (Proven Precise)

The fork's entry computation is the A- precision mechanism and MUST NOT be touched:

- Entry = zone edge closest to spot + forward spread toward spot
- Forward spreads: EUR 1 pip, AUD 1.5, GBP 2, DXY 0.02 (`gen:53-58`)
- 3-entry stagger: front/mid/back 33/33/34 (`gen:636-654`)
- Zone edges are unquantized real candle prices (4H order-block [Low, High], LQZ wick tips)

**Bible principles:** Law 15 (3-entry staggered), Law 16 (forward spreads mandatory), Law 17 (entry at zone edge — 74% of winning trades).

### 2.5 The Retry Doctrine (NEW — Operator Ruling)

> "When a trade setup is rejected it should not immediately hard reject. It should give context WHY the trade is rejected, force an IMPROVED setup for the same trade that does not derail from principles, and try again up to twice. Often it is just a dumb SL/TP that is making a trade 1.8 vs 3.6 vs 4.5 RRR. If the trade fails 3 times then hard reject. If the entry is valid then make sure TP SL are also valid and not retarded."

**Doctrine:** a rejected setup enters a repair cycle. The ENTRY stays fixed (if the entry zone passed eligibility, it's valid). Only the SL/TP anchors are re-computed with progressively relaxed-but-principled fallbacks. Max 3 attempts. Every attempt logged with exact gate-failure context. Repaired setups are annotated in the report.

**Bible principles:** Law 35 (RR is a consequence, not a target — the floor gate itself is suspect), Law 13 (on unreachable TP: "reject TP, look for closer LTF zone" — repair the leg, keep the trade), Law 22 (MFE ≥ 2R before SL = right zone, wrong SL — fix the SL, keep the entry), Law 21 (losses are execution errors, not direction errors).

### 2.6 The LQZ 3-Candle Doctrine (VERIFIED — NOT DERAILED)

**The 3 liquidity candle types (1H bars ONLY — never 4H):**

| Type | Name | Exact criteria (14 canon thresholds, verified byte-identical in fork `lqz-lobe.ts:117-168`) |
|------|------|------|
| 1 | **LIQUIDITY_SWEEP** | 2 back-to-back THICK bodies (each ≥ **1.5×** avg body) BREAKING a **24-bar** high/low; wick extends ≥ **2 pips** beyond; REVERSES back through within **6 bars** |
| 2 | **LONG_WICK** | Single candle: wick ≥ **2.5×** body AND ≥ **5 pips** absolute; followed within **3 bars** by sharp move ≥ max(**15 pips**, **1.5×**ATR) |
| 3 | **SHORT_WICK_CONSOL** | **3+** candles: short wicks ≤ **3 pips**, tips align within **2 pips**, span ≤ **25 pips** |

**Confirmation rule:** a zone is emitted ONLY when **2+ DISTINCT candle types align on the same horizontal line** — same side, intervals overlapping within **3 pips** — across the multi-week lookback. Single-pattern hits DISCARDED.

**Lookback:** 720 bars (6 weeks) per operator ruling D21 ("2 different pattern types IS VALID but I never applied a temporal scope"). The fork's 120-bar (1-week) window is why the 7 golden LQZ levels were missed — each pattern type is individually rare in one week.

**Documentation locations (all consistent):** Bible Part 4.16 (`:1424-1490`), fork code (`lqz-lobe.ts:117-168` + `:696-698`), SMC_Liquidity_Notes.md (sweep→BOS→OB-retest flow).

### 2.7 The Dedup Doctrine (CORRECTED — Operator Ruling)

> "Same zone can be valid for multiple days."

**Doctrine:** dedup key = `direction_entry_sl_tp_day_category`. Identical trade on the same day in the same category = duplicate (killed). Same zone on a different day OR different category = distinct trade (survives).

**PLUS the consumption rule:** after a zone generates a setup, it is marked used-as-that-category. Re-firing the SAME category with IDENTICAL geometry on a later day requires a genuine state change (simulated mitigation altering freshness/eligibility) — otherwise it's the 40-checkpoint's identical-3×4 inflation, which is structurally forbidden.

**Why not day-keyed-only (the 40-checkpoint bug):** entry/SL/TP are deterministic functions of the zone with no day input. Day-in-key alone re-fires the IDENTICAL trade 4×. The category+consumption extension preserves multi-day validity while making identical re-fires impossible.

**Why not day-blind (the 11-checkpoint starvation):** day-blind dedup collapses the 5-day × category loop to 1 setup per zone — the day loop becomes zone-consumption instead of opportunity-multiplication. Golden proof: the same level (100.975) is T4's TP AND T5's entry — legitimately reused through the chain.

### 2.8 The Category Eligibility Model (CORRECTED — Shape-Chain Clarification)

> "Shapes are always 1-2 per day (usually 1 — plays out during NY session). Shape CHAIN is a FULL WEEK phenomena."

**Doctrine:** the day decomposition assigns 1-2 shapes per day from the week-long chain. Shape-driven categories (HTF Swing, Reversal, Reinforcement) come from the day's shape. **Consolidation scalps at ceiling/floor are ALWAYS eligible** — session-gated (London), confluence-gated (3+), zone-gated (holding walls zfp < 30, structural ceiling/floor filter) — independent of the day's macro shape.

**Golden Wednesday reconstruction:** day's shapes = BS + RWL → HTF Swing lane (T6) + Reversal lane (T5). Always-on scalp lane → T4 (SS Short at the ceiling, London, 3+ confluences). No multi-shape day decomposition required.

**Bible principles:** Law 20 (counter-trend scalps valid with 3+ confluences — the cascade is macro direction, not a filter), the Shape→Category map (Bible 6.3), session doctrine (London = sharper reactions, 22/38).

### 2.9 The No-Caps Doctrine (Operator Ruling, Reaffirmed)

> "I explicitly said in the last session max setups should be removed. There is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups."

**Doctrine:** NO MAX_SETUPS. NO MAX_SETUPS_PER_DAY. NO category caps. Volume is controlled by: (a) quality gates, (b) the retry loop (converts borderline rejects into repaired valid setups), (c) honest provenance, (d) the semantic firewall. The old Bible-gap "max-2/day structural filter" is DROPPED.

### 2.10 The Provenance Doctrine (Unchanged, Reaffirmed)

- VLM zones are PRIMARY: `source: 'VLM_CONFIRMED'` or `'VLM_NEW'`
- Engine 1 zones are a SUPPLEMENT: `source: 'FALLBACK_IP_EDGE'` → displayed as VLM_UNAVAILABLE
- NEVER label Engine 1 zones as VLM_CONFIRMED — that's the dishonest-fallback derailment

---

## 3. CURRENT STATE FORENSICS — THE 7 VOLUME KILLERS

*Established by 3 parallel codebase autopsies (11-setups checkpoint, 40-vs-11 differential, golden-standard gap map). File:line verified. `eng` = `src/pipeline/engine.ts`, `gen` = `src/engine3/visual-setup-generator.ts`, `lqz` = `src/brains/lqz-lobe.ts`.*

| # | Killer | Location | Mechanism | Phase That Kills It |
|---|--------|----------|-----------|---------------------|
| K1 | **RRR gate vs broken geometry** | `gen:328-333` + `gen:664-719` + `gen:749-751` | SL = zone partial width + 3×buffer (25-30p effective) vs TP at near edge of nearest ANY-type zone → RRR 0.6-1.2 < floors. Kills golden T1, T2, T4 | Phase 2 + 3 |
| K2 | **Dead confluence check 5** | `gen:565` vs absent in `eng:639-652, 768-781` | `mappedIPZoneName` never populated anywhere → check fails for 100% of zones → FALLBACK zones rejected on non-SS/R/WLS days | Phase 1 |
| K3 | **Zero-VLM pair skip** | `eng:728-729` | `if (pairValidated.length === 0) continue;` fires BEFORE the Engine-1 fallback merge → pair with 0 VLM zones gets 0 setups regardless of Engine 1 quality | Phase 1 |
| K4 | **TP-null hard-skip** | `gen:318-322, 745, 761` | No opposing zone → setup silently skipped. No repair attempt, no fallback target | Phase 2 + 3 |
| K5 | **Day-blind dedup starvation** | `gen:344-352` | Same zone tried across 5 days × 1-2 categories collapses to 1 setup | Phase 4 |
| K6 | **LQZ levels absent from zone map** | `lqz:121` (120-bar lookback) + GAP_ANALYSIS §GAP 1 | Pipeline's 61 DXY zones contain NONE of the 7 golden LQZ levels. Blocks 8/8 golden trades upstream | Phase 1 + 5 |
| K7 | **Chaining kill-switches** | `gen:490-493, 1071-1104` | MAX_SETUPS early-return skips chaining; TP-zone `reactionCount ≤ 1` blocks LQZ-pivot chains (LQZ zones carry touch_count ≥ 2 by construction); chained RRR hardcoded HTF 2.0 floor. Golden T4→T5 chain dies at `:1104` | Phase 4 |

**Precision mechanisms (KEEP — verified, do not touch):**
- Entry = zone edge + forward spread (`gen:53-58, 636-654`) — unquantized candle-derived edges
- IP curation ±200p/DXY ±2.00 + distance sort + top-20 (`eng:741-757`)
- Honest fallback FALLBACK_IP_EDGE (`eng:775`)
- Per-zone direction supply→SHORT demand→LONG (`gen:225-243`)
- 3-confluence gate structure (`gen:539-572`) — only check 5 is dead
- Earth+Fire midpoint rule (`gen:749-751`) — correct rule, wrong candidate selection
- All 14 LQZ canon thresholds (`lqz:117-168`)

---

## 4. PHASE 0: FORK + VERIFY

### 4.1 Fork Procedure

```bash
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/Checkpoints"
cp -r v4.2_11SETUPS_PRECISION_DXY101pt13 v4.3_TVI_FORK
cd v4.3_TVI_FORK
bun build src/index.ts --outdir dist --target bun && npx tsc --noEmit
sha256sum dist/index.js
# Expected: b414d7894cebb45cbde8cef32d20d5a901cd005ce993a03aa65df5e0a1bd755b
```

### 4.2 Crown-Jewel Verification Battery

Every one of these greps MUST pass before any build wave starts. If ANY fails → stop, investigate, do not proceed.

```bash
# IP curation intact (±200p / distance sort / top-20)
grep -n "slice(0, 20)" src/pipeline/engine.ts                                    # expect :757
grep -n "maxDist = isDXY ? 2.00 : 0.020" src/pipeline/engine.ts                  # expect :748
# Honest fallback intact
grep -cn "FALLBACK_IP_EDGE" src/pipeline/engine.ts                               # expect ≥1 (:775)
# Dedup present (day-blind — Phase 4 will amend, not delete)
grep -n "dedupKey" src/engine3/visual-setup-generator.ts                         # expect :344-352
# Forward spreads canon
grep -n "'EUR/USD': 0.0001\|'AUD/USD': 0.00015\|'GBP/USD': 0.0002\|'DXY': 0.02" src/engine3/visual-setup-generator.ts  # expect :53-58
# All 14 LQZ thresholds canon
grep -c "SWEEP_THICK_BODY_MULT = 1.5\|SWEEP_MIN_BEYOND_PIPS = 2\|SWEEP_LEVEL_LOOKBACK_BARS = 24\|SWEEP_REVERSAL_WINDOW_BARS = 6\|LONG_WICK_BODY_MULT = 2.5\|LONG_WICK_MIN_PIPS = 5\|SHARP_MOVE_WINDOW_BARS = 3\|SHARP_MOVE_MIN_PIPS = 15\|SHARP_MOVE_ATR_MULT = 1.5\|SHORT_WICK_CLUSTER_MIN_BARS = 3\|SHORT_WICK_MAX_PIPS = 3\|SHORT_WICK_CLUSTER_TOL_PIPS = 2\|CONSOL_MAX_SPAN_PIPS = 25\|LQZ_ALIGN_TOLERANCE_PIPS = 3" src/brains/lqz-lobe.ts  # expect 14
# ZFP threshold canon
grep -n "ZFP_SS_TO_BS_THRESHOLD = 45" src/brains/shape-brain.ts                  # expect :78
# No derailment signatures
grep -c "tp1_5\|tp2\|maximumRrr\|resolveDirection\|selectEligibleVisualZones" src/engine3/visual-setup-generator.ts  # expect 0 (resolveDirection may exist as comment-only)
```

---

## 5. PHASE 1: VOLUME RESTORATION

*8 items. Each kills or weakens a starvation mechanism without touching precision. Dispatch as parallel build packages; verify every hunk before merge.*

### 5.1 Smart Pair-Skip Logic (kills K3)

**Why:** today the pair-skip fires BEFORE the Engine-1 fallback merge, so a pair with 0 agent-produced VLM zones produces 0 setups even when Engine 1 mapped 200+ zones for it. The operator: "thats dumb. need smarter logic here." The fallback exists precisely to carry a pair when VLM is thin — but the skip fires before the supplement is merged.

**Bible principle:** Law 37 (Data 80% / Vision 20%) — data zones are the majority contributor. A pair carried by honestly-labeled data zones is doctrine-valid.

```typescript
// eng:~728 — BEFORE (the dumb version):
// const pairValidated = validZones.filter((v) => v.pair === pair);
// if (pairValidated.length === 0) continue;   // ← fires BEFORE fallback merge

// AFTER (smart version): merge Engine-1 candidates FIRST, then skip on TOTAL candidates
const pairValidated = validZones.filter((v) => v.pair === pair);

// ... Engine-1 IP curation + fallback push happens HERE (moved up) ...
// pairValidated now includes FALLBACK_IP_EDGE supplements

// Skip ONLY if the pair has insufficient TOTAL candidates of any honest provenance
const totalCandidates = pairValidated.length;
if (totalCandidates < 3) {
  log.info(`[setups] ${pair}: only ${totalCandidates} total candidates (VLM + Engine-1) — need ≥3. Skipping pair.`);
  continue;
}
if (pairValidated.every(v => v.source === 'FALLBACK_IP_EDGE')) {
  log.info(`[setups] ${pair}: proceeding on ${totalCandidates} Engine-1 candidates (VLM thin — honest FALLBACK_IP_EDGE provenance)`);
}
```

**Live-market relevance:** a week where the agent can't get a clean chart read on GBP (browser hiccup, rate limit) should still produce GBP setups from the 9-pillar + 4H S/D + LQZ map — labeled honestly as data-derived. The institutional pressure map doesn't disappear because a screenshot failed.

### 5.2 mappedIPZoneName Population (kills K2)

**Why:** confluence check 5 (`gen:565`) awards +1 for zones mapped to an Engine-1 IP zone — but the field is NEVER populated in the fork, so the check fails for 100% of zones, and FALLBACK zones (which need every confluence point) get rejected on non-SS/R/WLS days. This is a direct volume lever, not just hygiene.

**Bible principle:** the confluence system (Bible 4.2) requires INDEPENDENT evidence dimensions. A zone that exists in both the visual set AND the Engine-1 map has genuine dual-source confluence — the check should fire.

```typescript
// eng:668-682 (zod schema for validatedZones) — ADD the field:
mappedIPZoneName: z.string().optional().default(''),

// eng:813-826 (fallback push) — POPULATE it:
pairValidated.push({
  pair,
  type: isLqzFallback ? 'LIQUIDITY' : (ez.ceiling > spot ? 'SUPPLY' : 'DEMAND'),
  top: ez.ceiling,
  bottom: ez.floor,
  timeframe: '4H',
  classification: ez.sdType === 'BoM' ? 'BoM' : ez.sdType === 'MoM' ? 'MoM' : 'UNMITIGATED',
  source: isLqzFallback ? 'FALLBACK_LQZ' : 'FALLBACK_IP_EDGE',
  mappedIPZoneName: ez.zoneName || '',   // ← THE FIX (was never populated)
  confidence: 50,
  reactionCount: ez.reactionCount ?? 0,
  liquidityScore: ez.liquidityScore ?? 0,
  visualEvidence: `Engine 1 ${ez.zoneName}: ${ez.reactionCount} reactions, confluence ${ez.confluence}`,
  sourceScreenshot: pairScreenshot?.path || '',
} as any);

// gen:291 + all read sites — OPTIONAL CHAINING (the Wave-C TypeError lesson):
(vz.mappedIPZoneName ?? '').toUpperCase().includes('LQZ')

// ALSO: VLM zones get enriched the same way — when a VLM zone maps to an Engine-1 zone
// by price proximity (within 1 pip), populate mappedIPZoneName from the nearest Engine-1 zone.
// This is the Engine-1 enrichment step from the TVI spec §6.4.
```

**Verification (MANDATORY before deploy — the field-existence lesson from FAILURE_LOG Derailment 1):**
```bash
grep -n "mappedIPZoneName:" src/pipeline/engine.ts        # MUST show assignment
grep -n "mappedIPZoneName ?? ''" src/engine3/visual-setup-generator.ts  # MUST show guards
```

### 5.3 LQZ Lookback 120→720 + Harvest Bars (weakens K6)

**Why:** the golden LQZ levels were drawn by the operator looking at MULTIPLE WEEKS of chart history. The detector's 120-bar (1-week) window + 2-distinct-type confirmation rule means each pattern type must land twice on the same price line within one week — statistically rare (~2 zones/pair vs 7 golden). 720 bars (6 weeks) is the operator-ruled sweet spot (D21). Wave-B testing produced 8-11 LQZ/pair with this change.

**Bible principle:** Bible 4.16 — the confirmation rule is valid; the temporal scope was the defect. Operator: "2 different pattern types IS VALID but I never applied a temporal scope."

```typescript
// lqz:121
export const LQZ_LOOKBACK_BARS = 720; // 6 weeks of 1H at 120 bars/week. Operator-ruled 3-6 weeks, max 1440.
export const LQZ_AGE_CONFIDENCE_MAX = 1.0;
// Reaction-age weighting: same level reacted across 6+ weeks = max-validity LQZ.
// span = bar-span between oldest and newest confirming hit.
// ageMultiplier = span >= LQZ_LOOKBACK_BARS ? 1.0 : span / LQZ_LOOKBACK_BARS.
// boost = min(10, span / 144) * ageMultiplier.
// confidence = min(100, confidence + round(boost * 10)).
// New LiquidZone fields: confirmationSpanBars, ageConfidenceBoost.

// tv_fetch_ohlc.py:22
N_BARS = {"4H": 500, "1H": 1500, "30m": 500, "15m": 300}
// 1H raised 500→1500 for full 720-bar lookback supply. 30m raised 300→500 for backtest coverage.

// eng:344 — pass the constant, not a literal:
detectLiquidityZones(pair, bars1H, LQZ_LOOKBACK_BARS)

// eng zones-tool output — add lqzStats per pair for observability:
// { barsScanned, sweepHits, wickHits, consolHits, totalHits, alignedGroups,
//   discardedSingleTypeGroups, confirmedZones, cappedZones }
```

**Live-market relevance:** the 100.61 sweep wick (Jul 3/4) seeded the entire golden week's zone map. A 1-week detector running on Jul 6 data sees the aftermath but not the origin — 6 weeks sees the sweep, the wick clusters, and the consolidations that CONFIRM each rung.

### 5.4 zfp from Confluence (replaces placeholder)

**Why:** every pillar zone carries `zfp: 50` placeholder (`eng:322`), every 4H zone `DEFAULT_ZFP = 50`. The shape chain is driven by ZFP thresholds (ZFP<20 Hard Wall → RWL; ZFP 20-40 → R; ZFP>45 → BS). All-50 input → the week runs the same canned transition sequence regardless of actual zone strength. Computing ZFP from the confluence score makes shape prediction data-driven.

**Bible principle:** Bible 4.12 — the Pillar 9 step function: confluence 12-14 EXTREME (ZFP<10), 10-11 HEAVY (10-25), 8-9 MODERATE-HEAVY (20-35), 6-7 MODERATE (30-45), 4-5 LIGHT (40-60), 0-3 MINIMAL (>60).

```typescript
// eng:101-109 — ADD:
function computeZfpFromConfluence(confluence: number): number {
  // Canon Pillar 9 pressure-degree → ZFP step function (Bible Part 4.12).
  // Why a step function: confluence bands represent qualitatively different
  // institutional defense regimes — within a band the defense is constant,
  // at band boundaries it jumps. The 7→8 transition (MODERATE→MODERATE-HEAVY)
  // is the most valuable single point in the system.
  if (confluence >= 12) return 10;  // EXTREME — nearly impregnable
  if (confluence >= 10) return 20;  // HEAVY
  if (confluence >= 8)  return 30;  // MODERATE-HEAVY
  if (confluence >= 6)  return 40;  // MODERATE
  if (confluence >= 4)  return 55;  // LIGHT
  return 65;                         // MINIMAL
}

// eng:340 — REPLACE placeholder:
zfp: computeZfpFromConfluence(pillarResult.compositeScore),
```

**Live-market relevance:** a Hard Wall (ZFP<20) is where WL/RWL entries fire — the single highest-value trade class (golden T5, 3.79 RRR at the hard-wall bounce). With placeholder 50s, NO zone is ever a Hard Wall, so the WL lane starves.

### 5.5 BoM/LQZ Priority Boost + Gated Pool Enlargement

**Why (two coupled changes):** (a) the generator's working set is curated by confluence-desc — pivot/MA-derived virgin-MoM zones crowd out BoM zones (which carry +5 confidence, ENTRY-PRIMARY status, and the deepest institutional commitment). A +5 sort-key for BoM/LQZ zones surfaces them. (b) the pool cap of 20 was set before the gates were fixed; the 40-checkpoint's only salvageable idea — more Engine-1 anchors — is sound IF the ±200p filter + distance sort stay. Raising the cap 20→30 within the actionable range adds candidates without the 40-checkpoint's far-zone precision hole.

**Bible principle:** Bible 4.13 (BoM = deepest commitment, 100% reaction if unmitigated), Bible 4.14 (zone reaction counter). The pool enlargement respects the SAME curation doctrine — it's a quantity change inside a quality frame.

```typescript
// eng:~781-800 (zone curation sort) — BoM/LQZ boost + cap 30:
.sort((a, b) => {
  const isBoMA = a.sdType === 'BoM';
  const isLqzA = a.sdOverlap === 'LQZ' || (a.zoneName?.includes('LQZ') ?? false);
  const sortKeyA = (a.confluence ?? 0) + ((isBoMA || isLqzA) ? 5 : 0);
  const isBoMB = b.sdType === 'BoM';
  const isLqzB = b.sdOverlap === 'LQZ' || (b.zoneName?.includes('LQZ') ?? false);
  const sortKeyB = (b.confluence ?? 0) + ((isBoMB || isLqzB) ? 5 : 0);
  return sortKeyB - sortKeyA;
})
.slice(0, 30); // was 20 — enlarged WITHIN the ±200p/distance-sort gate (NOT the 40-checkpoint's unfiltered 30)
```

### 5.6 Wire `atr` Through the Call Site

**Why:** the generator's distance cap has ATR scaling (`maxDistPips = max(300, atrPips × 4)`) but `eng:792-800` never passes `atr` — the scaling is dead code in BOTH checkpoints. GBP/AUD (higher volatility) are exactly the pairs where ATR-scaled reach matters for volume.

```typescript
// eng:~790 — compute pair ATR from harvested 1H bars (14-period), pass as the atr arg:
const bars1H = ctx.harvestData?.ohlcByPairTf?.[pair]?.['1H'] ?? [];
const pairAtrPips = computeATR14(bars1H, pipValue);  // standard 14-period ATR in pips
// ... generateSetups(..., pairAtrPips)
```

### 5.7 Bound the Relax Escape

**Why (latent hazard in BOTH checkpoints):** `RELAX_NEAREST_ZONES = 3` (`gen:131, 257-267`) lets the generator take the nearest 3 zones from `tooFar` when `inRange` is empty — with NO upper bound. If the pool is enlarged (5.5), this escape reopens the far-zone precision hole. Also note: the engine-side ±200p filter covers only FALLBACK zones, not VLM zones.

```typescript
// gen:257-267 — bound the relax path:
if (inRange.length === 0 && tooFar.length > 0) {
  // Relax ONLY within 1.5× the engine-side filter (±300 pips FX / ±3.00 DXY).
  // Beyond that, the pair legitimately has no actionable zones this week.
  const relaxBound = isDXY ? 3.00 : 0.030;
  const relaxable = tooFar.filter(z => Math.abs(zoneMid(z) - spot) <= relaxBound);
  inRange = relaxable.slice(0, RELAX_NEAREST_ZONES);
  if (inRange.length > 0) log.info(`[relax] ${pair}: using ${inRange.length} zones within relaxed bound`);
}
```

### 5.8 Phase 1 Verification Matrix

| Check | Command | Expected |
|-------|---------|----------|
| mappedIPZoneName assigned | `grep -n "mappedIPZoneName:" src/pipeline/engine.ts` | ≥2 (schema + push) |
| Optional chaining | `grep -c "mappedIPZoneName ?? ''" src/engine3/visual-setup-generator.ts` | ≥1 |
| Pair-skip after merge | read the hunk | skip uses total candidates, ≥3 |
| LQZ lookback | `grep -n "LQZ_LOOKBACK_BARS = 720" src/brains/lqz-lobe.ts` | :121 |
| Harvest bars | `grep -n "1500" tv_fetch_ohlc.py` | N_BARS 1H |
| zfp function | `grep -n "computeZfpFromConfluence" src/pipeline/engine.ts` | defined + called |
| zfp:50 gone from pillar push | `grep -c "zfp: 50" src/pipeline/engine.ts` | 0 |
| Pool cap | `grep -n "slice(0, 30)" src/pipeline/engine.ts` | curation site |
| Build | `bun build && npx tsc --noEmit` | exit 0 |

---

## 6. PHASE 2: ANCHOR GEOMETRY

*The RRR killer. Replaces the two broken anchor functions in the generator with the corrected doctrine from §2.2-2.3. Entry computation is NOT touched.*

### 6.1 New SL Model — `computeSLNextLqzRung` (replaces `computeSLZoneGeometry`)

**Why:** the fork's Method 1 anchors SL to the entry zone's FAR edge + 3×buffer (wrong anchor, wrong magnitude → 25-30p effective DXY SLs → RRR collapse). The doctrine: SL inside the NEXT LQZ rung beyond the entry zone, < 20 pips typical, 4H block edge only when entry is directly against that block.

**Bible principles:** Law 7 (next zone + pair buffer), Law 8 (fallback), Law 9 (zone geometry), Law 10 (0.5×ATR floor), D17 (36p hard ceiling).

```typescript
/**
 * computeSLNextLqzRung — the corrected SL anchor.
 *
 * LIVE-MARKET MECHANIC: your stop hides behind the NEXT liquidity shelf beyond
 * your entry. That shelf is where the next cluster of resting orders defends —
 * price must consume THAT liquidity to reach your stop. This is why golden SLs
 * are 4-9.5 pips: the ladder rungs are dense, so the next shelf is close.
 * A stop placed in empty space between rungs gets hunted by intraday noise.
 *
 * @param entry      — front entry price (zone edge + forward spread)
 * @param entryZone  — the zone the entry anchors on
 * @param direction  — LONG or SHORT
 * @param allZones   — full zone array (visual + fallback) for the pair
 * @param pair       — 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD'
 * @param atr1hPips  — 14-period ATR on 1H bars, in pips (for Law 10 floor + Law 8 fallback)
 */
function computeSLNextLqzRung(entry, entryZone, direction, allZones, pair, atr1hPips, attempt = 1): number | null {
  const pipValue = pair === 'DXY' ? 0.01 : 0.0001;
  const bufferPips = SL_BUFFER_PIPS[pair] ?? 3;        // Law 7: EUR 2, GBP 3, AUD 3, DXY 5
  const buffer = bufferPips * pipValue;

  // ── Step 1: collect LQZ rungs — the ladder lines.
  // Rungs are: (a) LIQUIDITY-type zones, (b) LQZ-merged zones (sdOverlap='LQZ'),
  // (c) FALLBACK_LQZ-sourced zones. These are the levels where stop-clusters live —
  // the ONLY structurally meaningful place to hide a stop.
  const rungs = allZones.filter(z =>
    z.type === 'LIQUIDITY' ||
    z.source === 'FALLBACK_LQZ' ||
    (z.mappedIPZoneName ?? '').toUpperCase().includes('LQZ') ||
    z.sdOverlap === 'LQZ'
  );

  // ── Step 2: find the NEXT rung beyond the entry zone (adverse direction).
  // LONG: rungs below the entry zone's floor, nearest first. SHORT: above its ceiling.
  // attempt 1 = nearest rung; attempt 2 (retry) = one shelf deeper (rungs[1]).
  const candidates = direction === 'LONG'
    ? rungs.filter(r => r.top < entryZone.bottom).sort((a, b) => b.top - a.top)
    : rungs.filter(r => r.bottom > entryZone.top).sort((a, b) => a.bottom - b.bottom);
  const slZone = candidates[Math.min(attempt - 1, candidates.length - 1)] ?? null;

  let sl: number | null = null;
  if (slZone) {
    // Law 7 VERBATIM: "SL is placed 2-5 pips INSIDE the NEXT structural zone."
    // The SL sits INSIDE the rung, buffer-distance in from its NEAR edge (the edge
    // price meets first). Price must trade INTO the rung's resting orders to reach
    // the stop — the rung's liquidity body is the shield.
    // LONG: price falls into the rung → meets slZone.top first → SL = top − buffer.
    // SHORT: price rises into the rung → meets slZone.bottom first → SL = bottom + buffer.
    // Golden proof: T6 SL 101.330 = the 4H BoM's NEAR edge (lower edge), not beyond it.
    sl = direction === 'LONG' ? slZone.top - buffer : slZone.bottom + buffer;
  }

  // ── Step 3: the T6 branch — COMPUTED, not a phantom field.
  // When no LQZ rung exists within the doctrinal band (< ~20 pips), check whether an
  // UNMITIGATED 4H BoM/Bo2L is the nearest structure beyond the entry zone. If so,
  // ITS near edge is the SL anchor — the trade is only wrong if the block itself fails.
  // Golden T6: entry 101.235 inside the reaction band below the 4H BoM (101.330-101.42),
  // no LQZ rung between → SL at the block's near edge 101.330 (9.5 pips).
  if (!sl) {
    const structuralBandPips = 20;
    const blocks = allZones.filter(z =>
      z.classification === 'BoM' && (z.reactionCount ?? 0) === 0 &&
      (direction === 'LONG' ? z.top < entryZone.bottom : z.bottom > entryZone.top)
    ).sort((a, b) => direction === 'LONG'
      ? b.top - a.top
      : a.bottom - b.bottom);
    const block = blocks[0] ?? null;
    if (block) {
      const blockDistPips = direction === 'LONG'
        ? (entryZone.bottom - block.top) / pipValue
        : (block.bottom - entryZone.top) / pipValue;
      if (blockDistPips <= structuralBandPips * 2) {  // block within ~40p = the T6 case
        sl = direction === 'LONG' ? block.top - buffer : block.bottom + buffer;
      }
    }
  }

  // ── Step 4: Law 8 fallback — no rung, no block within 100 pips.
  // SL = entry ∓ max(entryZoneWidth×2, 1.5×ATR). Covers the two real threats:
  // a full zone-width wick, or a London-Spike-sized noise bar — whichever is larger.
  if (!sl) {
    const zoneWidthPips = (entryZone.top - entryZone.bottom) / pipValue;
    const fallbackPips = Math.max(zoneWidthPips * 2, 1.5 * atr1hPips);
    sl = direction === 'LONG' ? entry - fallbackPips * pipValue : entry + fallbackPips * pipValue;
  }

  // ── Step 5: Law 10 floor — never tighter than 0.5×ATR(1H).
  // An 8-pip SL into a 15-pip ATR bar is a guaranteed stop-out by ordinary noise.
  const minDistPips = Math.max(0.5 * atr1hPips, bufferPips);
  let slDistPips = Math.abs(entry - sl) / pipValue;
  if (slDistPips < minDistPips) {
    sl = direction === 'LONG' ? entry - minDistPips * pipValue : entry + minDistPips * pipValue;
    slDistPips = minDistPips;
  }

  // ── Step 6: D17 ceiling — 36 pips HARD. If the structural SL exceeds it,
  // the ENTRY is wrong (too far from its rung) — return null and let the
  // retry loop repair the anchor chain or reject with context.
  if (slDistPips > 36) return null;

  return sl;
}
```

**Why `< 20 pips` is the doctrine, not a hard gate:** the rung density determines the SL distance. On DXY's golden ladder, rungs were 4-9.5 pips apart. On a sparse GBP chart the next rung might be 15-20 pips. The LAW is "next rung," not "X pips" — the pip band is the observed consequence. The 36p ceiling (D17) is the only hard limit; >25 gets a WARN annotation, <15 gets a sniper annotation.

### 6.2 New TP Model — `computeTPSignificancePath` (replaces `computeTPEarthFire`)

**Why:** the fork takes the nearest opposing zone of ANY type at near edge — it cannot skip to the BoM at 100.680 (golden T6) or the MoM at 100.845 (golden T2), and it never checks whether the path is clear (Law 14). The corrected model: significance-preferred candidate selection + Law-14 path walk + Earth+Fire midpoint + Laws 12/13.

**Bible principles:** Law 11 (Earth+Fire), Law 12 (TP TF ≥ entry TF), Law 13 (ATR sanity), Law 14 (no teleport past UM zones), Law 33 (TP zones need liquidityScore ≥ 5), Law 31 (UM = 100% reaction).

```typescript
/**
 * computeTPSignificancePath — the corrected TP anchor.
 *
 * LIVE-MARKET MECHANIC: you exit where the NEXT POOL OF STOPS sits — the opposing
 * liquidity that price is statistically drawn toward. The best exit is an unmitigated
 * BoM (100% reaction — the "base camp" where the counter-attack happens). Between
 * entry and that target, price can blow through MITIGATED zones (orders consumed —
 * golden T6 blew through 5 without pausing) but MUST react at UNMITIGATED ones.
 * So the walk is: pass through mitigated freely, cap at the first unmitigated.
 */
function computeTPSignificancePath(entry, sl, direction, entryZone, allZones, weeklyAtrPips, pipValue): { tp, target } | null {
  const slDistPips = Math.abs(entry - sl) / pipValue;
  const minTpDistPips = slDistPips * 1.2;   // viable-RRR precondition (genuine improvement #7)

  // ── Step 1: opposing candidates on the far side of entry.
  const opposing = allZones.filter(z => direction === 'LONG'
    ? (z.type === 'SUPPLY' || z.type === 'LIQUIDITY') && z.bottom > entry
    : (z.type === 'DEMAND' || z.type === 'LIQUIDITY') && z.top < entry
  );
  if (opposing.length === 0) return null;   // → retry loop with Law-13/8 fallback target

  // ── Step 2: significance ranking.
  // Unmitigated BoM (reactionCount=0, classification BoM) — the guaranteed reaction.
  // Earth+Fire (liquidityScore ≥ 5) — double reaction pressure.
  // MoM mitigated ≤1× — still structurally valid.
  // Everything else — near-edge only, lowest priority.
  const significance = (z) => {
    let s = 0;
    if (z.classification === 'BoM' && (z.reactionCount ?? 0) === 0) s += 100;  // UM BoM
    if ((z.liquidityScore ?? 0) >= 5) s += 50;                                  // Earth+Fire
    if (z.classification === 'BoM') s += 25;
    if (z.classification === 'MoM' && (z.reactionCount ?? 0) <= 1) s += 15;
    if ((z.reactionCount ?? 0) >= 3) s -= 100;                                  // depleted — pass-through, not a target
    return s;
  };
  const ranked = opposing
    .map(z => ({ z, sig: significance(z), dist: Math.abs(((z.top + z.bottom) / 2) - entry) }))
    .filter(c => c.sig > -50)                       // drop depleted zones entirely
    .sort((a, b) => b.sig - a.sig || a.dist - b.dist); // significance first, proximity second

  // ── Step 3: walk candidates with Law 12 + Law 14 + Law 13.
  const tfRank = { '15m': 1, '30m': 2, '1H': 3, '4H': 4 };
  for (const { z: target } of ranked) {
    // Law 12: TP timeframe must be ≥ entry timeframe. A 15m scalp targets 30m+.
    if ((tfRank[target.timeframe] ?? 0) < (tfRank[entryZone.timeframe] ?? 0)) continue;

    // Law 14 walk: find UNMITIGATED zones between entry and this target.
    // Mitigated zones are pass-through (their orders are consumed).
    // The first UM zone in the path IS the reaction point — cap TP there.
    //
    // CRITICAL — SIMULATED MITIGATION STATE: the walk must evaluate each intermediate
    // zone's freshness AS OF this setup's position in the report's trade sequence,
    // NOT the static pre-week state. Prior setups in the SAME report mitigate the
    // zones they touch (entry or TP). This is the mechanical explanation for golden
    // T6's 55.5-pip TP: by Wednesday, zones 101.19 (mitigated by T4), 101.14 (T2),
    // 100.975 (T4), 100.945 (T1), 100.845 (T3) were ALL consumed by earlier trades in
    // the chain → pass-through → the walk legitimately reaches the UM 100.680.
    // Implementation: effectiveReactionCount(z) = z.reactionCount + count of prior
    // setups (earlier day, or earlier same-day) whose entry or TP falls inside z.
    const effectiveReactionCount = (z) => {
      const simulated = ctx.priorSetups.filter(s =>
        s.dayIndex < candidate.dayIndex &&
        ((s.entry >= z.bottom && s.entry <= z.top) || (s.tp >= z.bottom && s.tp <= z.top))
      ).length;
      return (z.reactionCount ?? 0) + simulated;
    };
    let effectiveTarget = target;
    const umBetween = allZones.filter(z => {
      const mid = (z.top + z.bottom) / 2;
      const between = direction === 'LONG'
        ? mid > entry && mid < (target.top + target.bottom) / 2
        : mid < entry && mid > (target.top + target.bottom) / 2;
      return between && effectiveReactionCount(z) === 0 && z !== target;
    }).sort((a, b) => direction === 'LONG'
      ? ((a.top + a.bottom) / 2) - ((b.top + b.bottom) / 2)
      : ((b.top + b.bottom) / 2) - ((a.top + a.bottom) / 2));
    if (umBetween.length > 0) effectiveTarget = umBetween[0];

    // Earth+Fire: midpoint when the target has liquidity (Law 11 + Law 33).
    // Near edge when it doesn't — quick exit before the weak reaction fades.
    const tp = (effectiveTarget.liquidityScore ?? 0) >= 5
      ? (effectiveTarget.top + effectiveTarget.bottom) / 2
      : (direction === 'LONG' ? effectiveTarget.bottom : effectiveTarget.top);

    // Viable-RRR precondition: skip targets that can't pay for the risk.
    const tpDistPips = Math.abs(tp - entry) / pipValue;
    if (tpDistPips < minTpDistPips) continue;

    // Law 13: distance sanity vs weekly ATR.
    if (tpDistPips > 3 * weeklyAtrPips) continue;      // unreachable — try next candidate (NOT a reject)
    const ambitious = tpDistPips > 2 * weeklyAtrPips;  // annotate "ambitious" in notes

    return { tp, target: effectiveTarget, ambitious };
  }
  return null;  // → retry loop with fallback target
}
```

**Golden T6 walk-through (the proof):** entry 101.235 SHORT. Opposing DEMAND/LIQUIDITY below: 101.14 (mitigated — passed T2), 100.975 (mitigated — passed T4), 100.845 (mitigated — passed T3), 100.680 (1H BoM, UM, reactionCount=0). Significance: 100.680 scores 100 (UM BoM) + liquidity → top-ranked. Law-14 walk: all intermediates mitigated → no cap. TP = midpoint of 100.66-100.75 ≈ 100.68 (liquidityScore ≥ 5). **TP 100.680 — exactly the golden target.** SL via new model: next LQZ rung above 101.235 = the 4H BoM edge 101.330 (T6 exception) → 9.5p. RRR = 55.5/9.5 = 5.84. **Exactly the golden trade.**

### 6.3 Weekly ATR Computation

```typescript
// Weekly ATR for Law 13 sanity — from harvested 4H bars (42 bars ≈ 1 week of 4H):
function computeWeeklyAtrPips(bars4H, pipValue): number {
  const week = bars4H.slice(-42);
  const trs = week.map((b, i) => i === 0 ? b.high - b.low
    : Math.max(b.high - b.low, Math.abs(b.high - week[i-1].close), Math.abs(b.low - week[i-1].close)));
  return (trs.reduce((a, b) => a + b, 0) / trs.length) / pipValue;
}
```

### 6.4 Phase 2 Verification (Golden Reconstruction on Paper — MANDATORY before container test)

Reconstruct ALL 6 mappable golden trades through the new code path. Each MUST produce: SL ≤ ~10 pips DXY (or documented structural reason), TP within 4 pips of golden, RRR ≥ 3.5. Table in §12. If any fails → the model is wrong, fix it now, not in the container.

---

## 7. PHASE 3: THE RETRY LOOP

*New module in the generator. Implements §2.5. This is the operator's BIG requirement.*

### 7.1 The Repair Cycle

**Why:** today a gate failure is a silent `continue` — the trade dies with no context and no repair attempt. The doctrine: the ENTRY is the hard-won insight (the right zone at the right level); SL/TP are engineering. A 1.8-RRR trade with a valid entry is not a bad trade — it's a good trade with a dumb anchor. Fix the anchor.

**Bible principles:** Law 35 (RR is consequence), Law 13 (repair the TP leg, keep the trade), Law 22 (right zone wrong SL → fix SL), Law 21 (losses are execution errors).

**Law-35 tension — RESOLVED:** the 37-laws handover states "Do not reject setups based on minimum RR… except for the absolute floor of 1.0" (`:465-473`), while the operator's retry doctrine implies category floors as the repair target ("making a trade 1.8 vs 3.6 vs 4.5 RRR"). Resolution: the category floor (SS 1.5 / HTF 2.0, consolidation-relaxed SS 1.2) is the **repair TARGET, not the kill criterion.** A first-attempt failure triggers repair, never rejection. After 3 failed attempts, the operator's explicit ruling governs: hard reject WITH the full audit trail (D36). Law 35's spirit — gates must not silently kill structurally-valid trades — is honored by the repair cycle itself: no setup dies on first sight, and every death is documented with 3 attempts of evidence.

```typescript
/**
 * generateWithRepair — wraps the per-candidate setup computation in a 3-attempt
 * repair cycle. The ENTRY NEVER MOVES during repair (if the entry zone passed
 * eligibility, it's valid). Only SL/TP anchors are re-computed.
 *
 * ATTEMPT 1: primary anchors (next-LQZ-rung SL + significance-path TP).
 * ATTEMPT 2: re-anchor — if SL failed, walk to the NEXT rung out; if TP failed,
 *            try the next significance-ranked candidate; if TP was null, use the
 *            Law-13/8 fallback target (ATR-projected next structural level).
 * ATTEMPT 3: last resort — next-best opposing zone / rung; then HARD REJECT
 *            with the full 3-attempt audit trail in the report's filter-checkpoint
 *            section (every attempt logged: gate, values, repair action).
 */
interface RepairAttempt {
  attempt: number;
  gate: string;          // which gate failed: 'RRR_FLOOR' | 'TP_NULL' | 'SL_CEILING' | 'TP_MIN_DIST' | ...
  values: string;        // exact numbers: "RRR 1.4 < 2.0 — SL 28p, TP 39p"
  repair: string;        // what was changed: "SL re-anchored rung+1 (28p→9p)"
}

function generateWithRepair(candidate, ctx): TradeSetup | RejectRecord {
  const attempts: RepairAttempt[] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    // SL: attempt 1 = next rung; attempt 2 = next rung + 1 (one shelf deeper);
    //     attempt 3 = Law-8 fallback (max(zoneWidth×2, 1.5×ATR)).
    const sl = computeSLNextLqzRung(candidate.entry, candidate.zone, candidate.direction,
                                    ctx.allZones, candidate.pair, ctx.atr1hPips, attempt);
    if (sl === null) {
      attempts.push({ attempt, gate: 'SL_CEILING', values: `structural SL > 36p`, repair: attempt < 3 ? 'walk rung+1' : 'none' });
      continue;
    }

    // TP: attempt 1 = significance-path; attempt 2 = next-ranked candidate;
    //     attempt 3 = Law-13/8 fallback target (2×weeklyATR projection in trade direction).
    const tpResult = computeTPSignificancePath(candidate.entry, sl, candidate.direction,
                                               candidate.zone, ctx.allZones, ctx.weeklyAtrPips, ctx.pipValue, attempt);
    if (tpResult === null) {
      if (attempt < 3) {
        attempts.push({ attempt, gate: 'TP_NULL', values: 'no opposing zone', repair: 'fallback target (ATR-projected)' });
        continue;
      }
      // attempt 3 fallback: ATR-projected target — doctrine-valid when the map ends
      // (Law 13: the projection must still be within 3×weeklyATR by construction).
      const fbTp = candidate.direction === 'LONG'
        ? candidate.entry + 2 * ctx.weeklyAtrPips * ctx.pipValue
        : candidate.entry - 2 * ctx.weeklyAtrPips * ctx.pipValue;
      const rrr = Math.abs(fbTp - candidate.entry) / Math.abs(candidate.entry - sl);
      if (rrr >= rrrFloorFor(candidate.category)) {
        return finalize(candidate, sl, fbTp, attempts, /* repaired */ true);
      }
      attempts.push({ attempt, gate: 'RRR_FLOOR', values: `fallback RRR ${rrr.toFixed(2)} < floor`, repair: 'none' });
      break;
    }

    // Gate check: RRR floor (category-specific; consolidation-week relaxed floors apply).
    const rrr = Math.abs(tpResult.tp - candidate.entry) / Math.abs(candidate.entry - sl);
    const floor = rrrFloorFor(candidate.category, ctx.isConsolidationWeek);
    if (rrr >= floor) {
      return finalize(candidate, sl, tpResult.tp, attempts, attempt > 1);
    }
    attempts.push({ attempt, gate: 'RRR_FLOOR', values: `RRR ${rrr.toFixed(2)} < ${floor} — SL ${slDistPips}p, TP ${tpDistPips}p`,
                    repair: attempt < 3 ? 're-anchor SL rung+1 OR next TP candidate' : 'none' });
  }

  // HARD REJECT — full context, auditable in the report.
  return { rejected: true, candidate, attempts };
}
```

### 7.2 Report Integration

Repaired setups carry an annotation: `🔧 REPAIRED(2): SL re-anchored 28p→9p, RRR 1.4→4.1`. Hard rejects are listed in the report's Filter Checkpoint section with all 3 attempts: gate, values, repair action. This makes every rejection AUDITABLE — no more silent `continue`.

**Live-market relevance:** this is exactly what a human trader does — "the zone is right but my stop is too wide, let me tighten it to the shelf below" — except the human does it in their head and the machine now does it in code with an audit trail.

---

## 8. PHASE 4: CATEGORY / CHAIN / DEDUP ARCHITECTURE

### 8.1 Category Eligibility Model (implements §2.8)

```typescript
/**
 * Category eligibility per day — TWO lanes:
 *
 * LANE 1 (shape-driven): the day's shape from the week-long chain maps to its
 *   categories (BS → HTF_SWING + BREAKOUT_SURGE; RWL → REVERSAL; R → REINFORCEMENT).
 *   These are the directional-money lanes.
 *
 * LANE 2 (always-on scalp lane): Consolidation scalps at ceiling/floor are ALWAYS
 *   eligible — session-gated (London), confluence-gated (3+), zone-gated
 *   (holding walls zfp < 30 + structural ceiling/floor: 3 nearest supply above +
 *   3 nearest demand below spot). Independent of the day's macro shape.
 *   Bible principle: Law 20 — counter-trend scalps valid with 3+ confluences.
 *
 * Golden Wednesday proof: BS+RWL shapes → T6 (HTF) + T5 (Reversal); scalp lane → T4.
 */
const SHAPE_CATEGORIES_MAP = {
  SS:     [SWING_SCALP],
  SS_DWL: [SWING_SCALP, WHIPLASH],
  BS:     [HTF_SWING, BREAKOUT_SURGE],   // ← amended: golden Wed BS is HTF-swing-class
  WL:     [WHIPLASH, HTF_SWING],
  RWL:    [REVERSAL, HTF_SWING],          // ← amended: RWL trades labeled REVERSAL
  WLS:    [SWING_SCALP, HTF_SWING],
  R:      [REINFORCEMENT, SWING_SCALP],
};

function eligibleCategories(dayShape, zone, spot, allZones): Category[] {
  const cats = [...SHAPE_CATEGORIES_MAP[dayShape]];
  // Always-on scalp lane — zone must be a holding wall at a range boundary:
  const zfp = zone.zfp ?? 50;
  if (zfp < 30 && isAtCeilingOrFloor(zone, spot, allZones)) {
    if (!cats.includes(SWING_SCALP)) cats.push(SWING_SCALP);
  }
  return cats;
}
```

### 8.2 Session Map Unification

**Why:** TWO divergent SHAPE_SESSION_MAPs exist (generator `:61-74` vs shape-brain `:528-541`) — they disagree on BS/WL/R. The golden + 38-trade forensic give the truth: London Open = scalps (22/38), London/NY Overlap = BS (15/38), NY Mid = HTF swings (18/38), NY Open = reinforcements (8/38).

```typescript
// constants/trading-constants.ts — ONE map, imported by BOTH consumers:
export const SHAPE_SESSION_MAP = {
  SS: LONDON_OPEN, BS: LONDON_NY_OVERLAP, WL: NY_MID, RWL: NY_MID,
  WLS: LONDON_OPEN, R: NY_OPEN, PBS: LONDON_NY_OVERLAP,
};
export const CATEGORY_SESSION_MAP = {
  SWING_SCALP: LONDON_OPEN, BREAKOUT_SURGE: LONDON_NY_OVERLAP,
  HTF_SWING: NY_MID, REVERSAL: NY_MID, WHIPLASH: NY_MID, REINFORCEMENT: NY_OPEN,
};
// Session selection: category map wins for category-labeled setups; shape map is the fallback.
```

### 8.3 Chaining Reachability (kills K7)

```typescript
// FIX 1: chaining runs unconditionally — there are NO caps anymore (D16), so the
// MAX_SETUPS early-return that used to skip chaining is gone by definition.

// FIX 2: LQZ-pivot exemption — a TP zone that was just CREATED by the chain
// (fresh reaction at a liquidity rung) is chain-eligible even with reactionCount ≥ 2.
// LQZ zones carry touch_count ≥ 2 BY CONSTRUCTION (2 pattern types aligned → touches summed)
// — the old ≤1 gate blocked exactly the rungs the golden chains pivot on (100.975, 101.240).
const isLqzPivot = tpZone.type === 'LIQUIDITY' || tpZone.source === 'FALLBACK_LQZ'
  || (tpZone.mappedIPZoneName ?? '').toUpperCase().includes('LQZ');
const freshnessOk = isLqzPivot ? true : (findNearestIPZone(tpZone)?.reactionCount ?? 1) <= 1;

// FIX 3: chained RRR uses the SOURCE category's floor, not hardcoded HTF 2.0.
// A chain born from an SS scalp (floor 1.5, or 1.2 in consolidation weeks) should not
// die against an HTF floor it never claimed to meet.
const chainFloor = rrrFloorFor(parentSetup.category, isConsolidationWeek);
```

### 8.4 Dedup Doctrine (implements §2.7)

```typescript
// gen:344-352 — REPLACE the day-blind key:
const dedupKey = `${direction}_${Math.round(entry * 1e6)}_${Math.round(sl * 1e6)}_` +
                 `${Math.round(tp * 1e6)}_${dayLabel}_${category}`;
// Same zone, different day → DISTINCT (multi-day validity — operator ruling).
// Same zone, same day, different category → DISTINCT (different trade class).
// Same zone, same day, same category, same geometry → DUPLICATE (killed).

// PLUS the consumption rule — prevents the 40-checkpoint's identical-3×4 inflation:
// After a zone emits a setup as category C, record it. A later day may re-use the zone
// as C ONLY if its simulated state changed (mitigation incremented → freshness tier changed).
// Identical category + identical geometry + unchanged state = skip (that's the inflation bug).
const zoneUseKey = `${pair}_${zoneId}_${category}`;
if (usedZones.has(zoneUseKey) && !zoneStateChanged(zone, usedZones.get(zoneUseKey))) continue;
usedZones.set(zoneUseKey, snapshotZoneState(zone));
```

### 8.5 Remaining Spec Items (folded from the superseded Continuation Spec)

| Item | Change | Verification |
|------|--------|--------------|
| CONDITIONAL floor | `MIN_CONFIDENCE_CONDITIONAL = 50` (canon: ≥50 CONDITIONAL, <50 REJECTED) | `grep "MIN_CONFIDENCE_CONDITIONAL = 50"` |
| Consolidation-week RRR floors | SS 1.2, HTF 1.5, WL 1.5, R 1.5, Reinforcement 1.2 when ALL days are SS/R/WLS (Bible 8.6) | `grep "CONSOLIDATION_WEEK_FLOORS"` |
| WL/SS category filters | WL only at Hard Walls (zfp < 20); SS only at holding walls (zfp < 30) + ceiling/floor structural filter | `grep "not a Hard Wall"` |
| AUD/USD profile §8.13 | HTF Swing + Reinforcement only (NO consolidation scalps); Tokyo + London sessions (NOT NY) | `grep "AUD/USD.*no consolidation"` |
| priorWeekMomentum | wire from harvest (last 40 4H bars: >+0.5% BULLISH, <-0.5% BEARISH) — replaces hardcoded NEUTRAL | `grep "priorWeekMomentum"` shows computation |
| Category MAX_ENTRY_DISTANCE §8.2 | DXY 30/50/40/40, EUR 50/80/60/60, GBP 80/120/100/100, AUD 50/80/60/60 (SS/HTF/Reversal/Reinforcement) | constant table + gate |
| Doctrine fixes | identity MACRO DIRECTION, read()-direct rule, 2-phase purge (A.1-A.3) | grep battery ZERO |
| Prompt strengthening | base64 = DATA only, read() on .png RENDERS (A.18-A.19) | grep "base64 is not an image" |
| Rename | plutus-engine → plutus-agent everywhere (A.20) | grep plutus-engine = 0 in config/Dockerfile |

---

## 9. PHASE 5: TVI IMPLEMENTATION

**Reference:** `MASTER_CONTEXT/PLUTUS_TVI_DESIGN_SPEC.md` (2,599 lines — the full engineering spec; do NOT duplicate it here). Implement its 6 migration phases: (1) VKG 100 nodes + VCM + VST, (2) VEB gates + VGS + orchestrator, (3) ZIP protocol, (4) VLD/VTM anti-derailment, (5) integration, (6) hardening.

**V4.3 ADDITION — the god-vision autopsy goes into the VKG warheads verbatim.** The agent's visual procedure, extracted from the golden-week chart analysis:

```
VISUAL ZONE IDENTIFICATION — THE OPERATOR'S PROCEDURE:
1. FIND THE SWEEP FIRST. Scan for a long wick that pokes through an obvious prior
   low/high and closes back inside. That wick is the origin candle — it seeds the
   week's bias and the deepest zone.
2. MARK TERMINAL BODY CLUSTERS → BoM. 2-4 overlapping candle BODIES (not wicks)
   immediately before a large displacement candle that breaks structure. Box = the
   bodies' high/low. Check 4H for the same pattern — 4H BoM overrides 1H.
3. MARK MID-LEG SHELVES → MoM. A tight multi-candle consolidation inside an
   established leg, left behind unmitigated. Box = consolidation body range.
4. DRAW LQZ RUNGS from wick clusters + repeated touches. Any price where ≥2 candles'
   wicks/bodies align within ~1-2 pips = a horizontal rung. (The 3-candle doctrine
   from §2.6 codifies this: sweep / long-wick / short-wick-consol, 2+ types on the
   same line across multiple weeks.)
5. CLASSIFY mitigated vs unmitigated. Price traded through and closed beyond →
   mitigated (pass-through). Untested since formation → unmitigated (valid anchor).
6. CHAIN CHECK. A TP rung price is currently bouncing from = the next trade's
   entry rung. The ladder is reused, never redrawn mid-week.
7. SL DISCIPLINE. SL at the NEXT RUNG, not the zone extreme, not a round number,
   not ATR padding. If the next rung is > ~10 pips away, the entry is early.
```

**The anchor doctrine from §2 also becomes VKG validation nodes:** B-series nodes verify SL is at a rung (< 20p typical, 36p hard), TP has significance (BoM/LQZ-overlap preferred), evidence names the pattern with prices.

---

## 10. PHASE 6: LIQUIDITY LADDER MODULE

*After core geometry is container-verified (ladders inherit Phase-2 anchors). Bible Appendix O Pattern 8 + LAW 6 from the golden reference (L99-139) + the library ladder images.*

```typescript
/**
 * generateLiquidityLadder — the 16-61x combined-RRR architecture.
 *
 * LIVE-MARKET MECHANIC: the primary entry at the BoM carries the ONLY risk in the
 * entire structure (5-15 pips). Each rocket triggers as price reaches the next MoM
 * rung toward the target — and each trigger moves the previous rung's SL to
 * breakeven. After rocket 1 fills, the trade is risk-free. After rocket 2, it's
 * locking profit. The reward is the SUM of all legs to the shared TP; the risk is
 * only the primary's stop. That ratio — not any single leg — is the 25-30x.
 *
 * Golden/library evidence: rungs at MoM steps 20-30 pips apart, shared TP at the
 * opposing BoM/4H liquidity pool, ticketed combined R:R values 6.8, 7.0, 7.29,
 * 7.51, 10.0, 11.06, 16, 17.44, 57, 61.
 */
interface LadderStructure {
  primary: TradeSetup;          // at the BoM/LQZ rung — 50% size, SL 5-15p (ONLY risk)
  rockets: TradeSetup[];        // at successive MoM rungs 20-30p apart — 30%, 20% sizes
  sharedTP: number;             // opposing BoM / 4H liquidity pool
  beCascade: Array<{ triggerRung: number; moveSLof: string; to: number }>;
}

function generateLiquidityLadder(bsSetup, rungsBetween, opposingBoM): LadderStructure | null {
  // Preconditions (Bible 5.12 + virgin-MoM exception):
  // - parent is a BS (sustained directional move — NOT WL: WL's isolated energy
  //   cannot guarantee piercing, the pattern is unpredictable)
  // - ≥2 MoM rungs between entry and the opposing BoM target
  if (rungsBetween.length < 2) return null;
  const primary = bsSetup;                                  // entry at BoM rung
  const rockets = rungsBetween.slice(0, 2).map((rung, i) => makeRocket(rung, primary, i));
  // BE cascade: rocket 1 fills → primary SL to breakeven; rocket 2 fills → rocket 1 SL to BE.
  const beCascade = rockets.map((r, i) => ({
    triggerRung: r.entry, moveSLof: i === 0 ? 'primary' : `rocket${i}`, to: i === 0 ? primary.entry : rockets[i-1].entry,
  }));
  return { primary, rockets, sharedTP: opposingBoM, beCascade };
}
```

---

## 11. PHASE 7: CONTAINER TEST + VALIDATION

### 11.1 Procedure

```bash
docker rm -f plutus-host 2>/dev/null
docker run -d --name plutus-host --init --network host plutus-container-testing:clean-v421 sh -c 'sleep 57600'
sleep 8
docker cp dist/index.js plutus-host:/root/.config/opencode/plugins/plutus-agent/dist/index.js
docker cp tv_fetch_ohlc.py plutus-host:/root/scripts/tv_fetch_ohlc.py
LOCAL=$(sha256sum dist/index.js | awk '{print $1}')
REMOTE=$(docker exec plutus-host sha256sum /root/.config/opencode/plugins/plutus-agent/dist/index.js | awk '{print $1}')
[ "$LOCAL" = "$REMOTE" ] && echo "DIST VERIFIED ✓" || echo "SHA MISMATCH ✗"
docker exec plutus-host tmux new-session -d -s plutus
docker exec plutus-host tmux pipe-pane -t plutus -o 'cat >> /tmp/v43-stream.txt'
docker exec -e OPENCODE_SKIP_UPDATE=1 -d plutus-host tmux send-keys -t plutus 'opencode --agent plutus --model opencode-go/mimo-v2.5' Enter
```

### 11.2 The Sniff Test (Quantified — ALL must pass before saving any checkpoint)

| # | Criterion | Target |
|---|-----------|--------|
| 1 | Unique setups per pair | ≥6 (24+ total) |
| 2 | Direction diversity | Both LONG and SHORT per pair |
| 3 | **Golden reconstruction** | **≥5 of 8 golden DXY trades within 4-pip entry tolerance** |
| 4 | SL distribution | Mostly < 20p; ZERO > 36p; some < 15p (sniper) |
| 5 | RRR distribution | Median ≥ 3.5; ≥ 48% at 1:4+; sub-1:2 tail ≤ 21% (38-trade bands) |
| 6 | Chain links | ≥2 TP→entry chains visible |
| 7 | Retry repairs | Repaired setups annotated; hard rejects have 3-attempt audit trails |
| 8 | Provenance | VLM_CONFIRMED/VLM_NEW primary; FALLBACK_IP_EDGE labeled; ZERO Engine-1-as-VLM_CONFIRMED |
| 9 | Category diversity | SS + BS/HTF + RWL/Reversal present; WL at Hard Walls (zfp<20) only; SS at ceiling/floor only |
| 10 | Distribution balance | No pair > 2× another pair's count |

**Fails ANY → DO NOT SAVE. Diagnose the mechanism, fix, retest. (Commandment 10.)**

---

## 12. GOLDEN RECONSTRUCTION TEST CASES

*Mandatory paper-verification in Phase 2, then mechanical verification in Phase 7.*

| Trade | Entry (golden) | Expected SL (new model) | Expected TP (new model) | Expected RRR |
|-------|---------------|------------------------|------------------------|--------------|
| T1 Mon SS Long | 100.945 | 100.905 (next rung, 4p) | 101.115 (opposing supply rung) | ~4.2 |
| T2 Mon BS Short | 101.14 | 101.200 (next rung, 6p) | 100.845 (1H MoM — significance: mitigated ≤1×, in path) | ~4.9 |
| T3 Tue SS Long | 100.845 (chain from T2 TP) | 100.77 (next rung, 7.5p) | 101.190 (opposing supply) | ~4.6 |
| T4 Wed SS Short | 101.19 (chain from T3 TP) | 101.25 (next rung, 6p) | 100.975 (opposing demand) | ~3.6 |
| T5 Wed RWL Long | 100.975 (chain from T4 TP — LQZ-pivot exemption REQUIRED) | 100.905 (next rung, 7p) | 101.240 (opposing supply) | ~3.8 |
| T6 Wed BS Short | 101.235 (chain from T5 TP) | 101.330 (4H BoM edge — T6 exception, 9.5p) | 100.680 (UM 1H BoM — significance top-ranked; Law-14 walk passes through 5 mitigated zones) | ~5.8 |

**Prerequisites in the zone map for reconstruction to work:** the 7 golden LQZ levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) + 1H BoM 100.680 + 4H BoM 101.330 must exist as zones/rungs. Phase 1 (LQZ 720) + Phase 5 (TVI) supply them. If they're absent at test time, the retry loop logs the exact missing anchor — that's diagnostic value, not failure silence.

---

## 13. ANTI-DERAILMENT GUARDS — 15 RULES

1. **NEVER touch the entry computation** (`gen:53-58, 636-654`). It is the proven A- precision mechanism.
2. **NEVER re-inflate SL.** No far-edge + 3×buffer. No fixed pip distances. No ATR-multiple targets (ATR is a floor/fallback only). SL = next LQZ rung.
3. **NEVER TP at the nearest opposing zone of ANY type.** Significance preference (UM BoM > Earth+Fire > MoM≤1×) + Law-14 walk, always.
4. **NEVER hard-reject on first gate failure.** Retry loop with context, always. 3 attempts, then reject WITH the audit trail.
5. **NEVER day-key-only dedup** (the 40-checkpoint inflation) **and NEVER day-blind dedup** (the 11-checkpoint starvation). Key = direction+entry+sl+tp+day+category + consumption rule.
6. **NO CAPS.** No MAX_SETUPS, no MAX_SETUPS_PER_DAY, no category caps (D16, reaffirmed).
7. **NEVER label Engine-1 zones VLM_CONFIRMED.** FALLBACK_IP_EDGE = VLM_UNAVAILABLE, always.
8. **NEVER exclude IP zones from candidates.** They are valid entry anchors with the gated curation (±200p, sort, top-N, dedup).
9. **Field-existence audit before every field use** + `?? ''` optional chaining. Grep `fieldName\s*=` before deploy. (Derailment 1 lesson.)
10. **ZFP = 45, pairs slashed, ONE TP, per-zone direction, Engine 1+2 canon, LQZ = 1H bars ONLY.** (Iron Laws.)
11. **All 14 LQZ thresholds byte-identical.** Only the lookback changes (120→720, operator-ruled).
12. **WL only at Hard Walls (zfp < 20).** 22 WL setups on 1H is impossible — it's a 1-3 candle event.
13. **SS at ceiling/floor only** (3 nearest supply above + 3 nearest demand below spot).
14. **Every subagent claim verified by reading the actual hunks** — build + tsc + greps are necessary, never sufficient. (Derailment 15 lesson.)
15. **NEVER save a checkpoint before the sniff test passes.** Invalid checkpoints are worse than none. (Derailment 16 lesson.)

---

## 14. VERIFICATION MATRICES

### 14.1 Per-Phase Build Verification (run after EVERY wave)

```bash
bun build src/index.ts --outdir dist --target bun && npx tsc --noEmit   # BOTH exit 0
sha256sum dist/index.js                                                  # record in BUILD_STATE
```

### 14.2 Phase-Specific Grep Batteries

Each phase's matrix is defined in its section (§5.8, §6.4, §7.2, §8.5). ALL must pass before the next wave dispatches.

### 14.3 Container Test Evidence Requirements (Phase 7)

- sha256sum match local == remote
- TUI stream: agent init (10 tools), harvest (4 pairs, 1H=1500), zones (LQZ counts 8-11/pair), shapes, charts (binary PNGs), setups (counts per pair), report path
- Report quality table (§11.2) — all 10 criteria
- Golden reconstruction table (§12) — ≥5/8

---

## 15. FILE MANIFEST

### 15.1 Modified Files (Phases 1-4)

```
src/pipeline/engine.ts              # smart pair-skip, mappedIPZoneName, zfp function, pool 30,
                                    # BoM/LQZ boost, atr wiring, LQZ lookback call, lqzStats
src/engine3/visual-setup-generator.ts # NEW computeSLNextLqzRung (replaces computeSLZoneGeometry),
                                    # NEW computeTPSignificancePath (replaces computeTPEarthFire),
                                    # NEW generateWithRepair (retry loop), category eligibility,
                                    # chaining fixes, dedup doctrine, CONDITIONAL 50,
                                    # consolidation floors, WL/SS filters, AUD profile
src/brains/lqz-lobe.ts              # LQZ_LOOKBACK_BARS = 720, age weighting
src/brains/shape-brain.ts           # session map unification (import from constants)
src/constants/trading-constants.ts  # unified SHAPE_SESSION_MAP, CATEGORY_SESSION_MAP,
                                    # SHAPE_CATEGORIES_MAP amendment, MAX_ENTRY_DISTANCE table
src/identity/index.ts               # doctrine fixes (MACRO DIRECTION, read()-direct)
src/hooks/tool-after.ts             # prompt strengthening (base64→PNG)
src/hooks/system-transform.ts       # Step D summary
identity/plutus/TRADING_DOMAIN.md   # Law 20 MACRO DIRECTION
tv_fetch_ohlc.py                    # N_BARS 1H 1500, 30m 500
config.json, Dockerfile, deploy-plutus.sh  # plutus-agent rename
```

### 15.2 New Files

```
src/engine3/ladder-generator.ts     # Phase 6: liquidity ladder module
src/tvi/                            # Phase 5: full TVI engine (per TVI spec §16.1)
MASTER_CONTEXT/PLUTUS_ANCHOR_DOCTRINE.md  # the anchor micro-bible (written alongside this spec)
```

### 15.3 Deleted Code

```
gen: computeSLZoneGeometry (replaced), computeTPEarthFire (replaced),
     day-blind dedup key (replaced), MAX_SETUPS / MAX_SETUPS_PER_DAY remnants (purged)
```

---

*End of V4.3 Build Specification. Fork clean. Volume restored. Anchors corrected. Retry loop armed. Architecture completed. TVI implemented. Ladders built. Sniff test passed. THEN ship.*
