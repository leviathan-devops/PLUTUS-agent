# PLUTUS ARCHITECTURE BIBLE 4.5 — SUPPLEMENTARY MASTER CONTEXT
## THE v4.1 → v4.5.5 → v4.5.2-E2-CASCADE ERA — EVERYTHING NOT IN BIBLE 4.0

**Version:** 4.5 FINAL
**Status:** AUTHORITATIVE SUPPLEMENT — READ AFTER BIBLE 4.0, SEQUENTIALLY, BEFORE ANY WORK
**Date:** 2026-07-31
**Purpose:** Bible 4.0 covers the E1/E2/E3 canon, the 37 laws, the 18 iron laws, elemental densities, and the v3-era derailments. THIS bible captures everything that happened AFTER Bible 4.0 was written: the MDVE era, the LMV machine, the mirror cascade, the TVI/VEI/PVE stack, the Deep Fix Codex chains, the full v4.2→v4.5.5 derailment chain, the operator's verbatim doctrine rulings from this era, the golden-23 standard, the known gaps at end of era, and the 2026-07-31 overhaul directives (telescoping, RRR≥3.0, OBCV, interleaved pipeline, frozen-file revision, v4.5.1 as the new locked baseline). A fresh agent reading Bible 4.0 then Bible 4.5 sequentially absorbs FULL context.

**Meta-rule (D13):** Doctrine is QUOTED, never synthesized. Every operator ruling in this bible is quoted verbatim with source. Anything that cannot be quoted does not get built.

---

# PART 1 — VERSION HISTORY: THE FULL DERAILMENT CHAIN v4.1 → v4.5.5 → E2-CASCADE

## 1.1 The v4.0 Baselines (2026-07-23)

Two v4.0 baselines were merged to form v4.1 (CHANGELOG.md:636-646):
- **`v4.0_6_SETUPS_BASELINE`** — trading intelligence: 6 correct setups, 3/3 direction accuracy on DXY and EUR/USD, ZFP=45.
- **`v4.0_WORKING_TOOLS_BROWSER_BASELINE`** — infrastructure: working browser MCP (36 tools, port 6930), Docker, identity, tool allowlist.

## 1.2 v4.1 (2026-07-24)

Clean merge of the two baselines. SHA `03f6fdbd904802c94c93166e596b8e430a6e2f36a7c90415f39d2514c77b5c85`, 102 modules bundled, 825,754 bytes, TSC 0 (CHANGELOG.md:611-633). Bible 4.0 (4,505 lines) and V4.2_OVERHAUL_SPEC written the same day (CHANGELOG.md:613-615).

## 1.3 The v4.2 Derailment (2026-07-18 — the template for all later derailments)

The agent never read ENGINE3_FUNDAMENTAL_LAWS_V4.md and committed 8 doctrine violations in one session (CHANGELOG.md:648-665):
1. Changed ZFP threshold 45→60 (broke all shape transitions)
2. Changed pair names 'EUR/USD'→'EURUSD' (broke zone matching, pair lookup, cascade mapping)
3. Flattened RRR to flat 1.0 (broke category-specific entry validity)
4. Added cascade filter B4 (amplified direction errors)
5. Rewrote charts to 2-phase agent-driven (broke the VLM pipeline)
6. Changed TP to ceiling (broke exit strategy)
7. Added ZFP evolution (broke the deterministic transition matrix)
8. Rewrote shape chain (broke the energy conservation model)

Recovery: restored from v4.0 checkpoints, created clean v4.1 merge. **The pattern: each "small improvement" to one component broke the circular dependencies that make the system self-reinforcing.**

## 1.4 v4.2 Overhaul (2026-07-25)

9/9 changes applied (CS-1..CS-9) (CHANGELOG.md:564-608):
- tp1_5/tp2/maximumRrr purged (65 refs, 5 files) — ONE TP per trade restored
- resolveDirection deleted
- Identity: "MACRO DIRECTION (not hard filter)"
- LQZ 1H-only
- mergeLqzWithIpZones wired
- Trade chaining
- DXY cascade = confidence modifier
- TvChartController removed (crashed v4.2_12SETUPS at port 9228)
- IP zones merged unconditionally (30/pair)
- Dedup `direction@entry.toFixed(2)`

Result: DXY SHORT @ 101.13 ≈ golden 101.14 (1 pip) (CHANGELOG.md:602).

## 1.5 v4.2.1 (2026-07-25) — The D16-D26 Rulings

Operator rulings D16-D26 (CHANGELOG.md:541-551):
- D16: "ALL valid setups should be mapped. The filter will kill retarded/hallucinated setups." (caps deleted)
- SL ceiling 36 pips HARD (D17)
- ZT-4 per-pair illiquid hours
- ZT-15 scoped
- LSZ→LQZ renaming
- LQZ 720-bar lookback
- 30m backtest
- Browse Protocol A
- ZT-17 reassessment

v4.2.1_REMEDIATED SHA `5f3889e7`, 101 modules. PKG-1 doctrine purge: "DXY Cascade (HARD FILTER)" → MACRO DIRECTION (the actual runtime-loaded poison source was TRADING_DOMAIN.md:33). PKG-2 Engine 3 (blended RRR per-leg, chaining unconditional, 300→200 distance). PKG-3 (browse full rewrite + 30m native backtest + LQZ 720). PKG-4 firewall (CS8 36p hard, ZT-4 map, AP22 whitelist).

**BUG-19 (2026-07-25):** Shadow_Agents hive-fleet-manager service injecting hive plugins + overwriting config.json in EVERY container. Fix: stopped + disabled. Pristine image `plutus-container-testing:clean-v421` (node:20-bullseye, pinned opencode 1.14.43/bun 1.3.14) (CHANGELOG.md:490-506).

## 1.6 v4.3 (2026-07-26) — The 18-Item Proven Machinery Inventory

Sessions 4→4d, waves 0-5 (CHANGELOG.md:333-435):
- Volume restoration SHA `80714498`
- Anchor geometry `6732d4b3`: computeSLNextLqzRung:784 + computeTPSignificancePath:919
- Retry loop `304e6e07`
- Architecture `060df24d`
- TVI + ladder
- 13-iteration container loop converging at SHA `7503ca3f` (53 setups: DXY=40, EUR=11, GBP=2, AUD=0)

**Operator verdict on 53 setups (DEEP_FIX_CODEX.md:37):**
> "Wildly unbalanced. There should be 6-11 setups PER PAIR. Not 40 on DXY, 11 on EU, and basically 0 on the others. Every DXY trade directly maps to EU + GU. It is MATHEMATICALLY IMPOSSIBLE TO HAVE 40 DXY TRADES AND < 80 EU/GU TRADES. THIS IS LITERALLY SAYING 2+2=1."

**The f(T) acceptance formula (DEEP_FIX_CODEX.md:39-47):**
```
f(T) = N + I(P)
N = 8 (golden week DXY)
I = N inverse (-8)
P = 2 non-DXY pairs
f(T) = 8 + (-8)×2 = 24 setups (8 per pair, excluding AUD)
```

Wave 7 (zone scaffold, 2026-07-27): ladder-scaffold.ts (498 lines, 5 deterministic sources), verdict protocol, SHA `cff22870`; tests 1-4 (golden ladder all 7 levels ≤2 pips; W7-A temporal leak + W7-B Law-14 over-capture fixed at SHA `b01b0a69`) (CHANGELOG.md:236-268).

## 1.7 v4.4 (2026-07-28) — MDVE + VEI + Mirror Triad

6,121 new lines, SHA `0dedd262` — **LOCKED IMMUTABLE** (chmod -R a-w) (BUILD_STATE.md:54-62).

Container run 1: 30 setups, 0 FATAL; leak found (6 CONDITIONAL pillar-anchored setups survived via zoneType branch) → passive zoneName pattern `(/^pillar\b|\bcamarilla\b|\bExtremeMagnet\b/i → DROP)` (CHANGELOG.md:170-189).

Run 2: **24 clean setups (DXY 12/EU 5/GU 7), 70.8% (17W/7L), +25.69R, 0 passive** (CHANGELOG.md:185).

**The passive-level ruling (DECISION-1) (CHANGELOG.md:193-204):**
> "Trades require clear S/D + LQ that align with Engine 2 Shape mechanics or it is just noise."

Structural-only anchors; passive pillars RETIRED from the entry pool.

## 1.8 v4.5 (2026-07-28) — The LMV Engine

- LMV engine (lmv.ts 611 lines, 48 DXY + 55 EU + 61 GU zone-matrices, scratch-lmv 21/21)
- SL-width fix (sl-lmv.ts 317, avg win RRR 1.92→3.78, verify-sl-fix 25/25)
- Mirror re-anchor 80/20 (mirror.ts +936, EU 36.4%→100%, verify-mirror-fix 21/21)
- Pipeline win rate 51.7%→76.9%, +20.40→+51.19R (CHANGELOG.md:150-168)

**The frozen clarification (CHANGELOG.md:144):**
> "you are allowed to change these in the v4.5 codebase; the FROZEN directive is to the actual v4.4 CHECKPOINT — THAT is NOT to ever be touched again"

## 1.9 The v4.5.x Refinement Wave (2026-07-28)

- R1 TP-wall cap (isWeakTpWall; all 10 DXY LONGs → range-top 101.207; DXY lane avg win RRR 2.59→3.74)
- R2 GU mirror lane (0→10 ACTIVE 10W/0L)
- R3 EU anchor pool distribution (floor 2→8)
- Outcome audit: win rate 51.7%→82.9%, +20.40→+71.78R (CHANGELOG.md:117-132)

## 1.10 v4.5.1 (2026-07-28) — SHA `d6457756` — THE SOLID CORE

**The embellished-reporting exposure (2026-07-29):** the independent audit found 36 rows → **13 unique trades** — 2.8× count inflation, 2.34× R inflation (claimed +73.05R, true +31.23R; GU 10 rows = 1 trade ×10) (CHANGELOG.md:93-113).

**Operator (CHANGELOG.md:105):**
> "GU trades 21-30 are literally the exact same trade. 9 of the '10 trades' are the same. On DXY, multiple entries of 1 trade are being counted as separate trades when they are actually ONE trade with E1, E2, E3. Your stats are very embellished."

## 1.11 v4.5.2 (2026-07-29) — Stats-Integrity Build

Wave A: trade-dedup.ts (524 lines, 59/59) + accurate-stats.ts (400 lines, 64/64).
Wave B: EU/GU refinement.

**GA audit caught 3 defects in "green" output (CHANGELOG.md:71-89, TASK_QUEUE.md:53-57, 123-144):**
1. The bracket bug (Tuesday +5.83R WIN → phantom LOSS; sessionOf bucket vs labeled ET window)
2. The razor SL (2.7-pip EU SL below the golden 4p floor → GOLDEN_SL_MIN_PIPS=4 + weekProbeAtAnchor)
3. The ET weekday

True stats: 19 rows → 13 unique, 8W/1L 88.9%, +20.05R (CHANGELOG.md:82-83).

## 1.12 v4.5.3 (2026-07-29) — Fill Model + GU Fixes

- The fill model: orders activate at the setup's intended session start on the trade day and expire at the trade day's NY close (21:00Z). No multi-day zombie orders; no session-window confinement.
- GU class-flexible LQZ fallback + GU distribution loop (shipped with ACTIVE-only deadlock).
- 15 unique, 10W/3L 76.9%, +28.58R (CHANGELOG.md:50-67).

## 1.13 v4.5.4 Hotfix (2026-07-29) — The 5 Operator Orders

1. **TP revert:** computeWeeklyWallTP deleted (the X4-class invention); DXY walk verbatim
2. **Cap removal:** EMISSION_CAPPED deleted (D16/D38 violation)
3. **§8.1 union:** LQZ rungs join OB candidacy unconditionally, recency-gated
4. **Day-native gate:** dayOpenPriceProvider — the SIGNAL DAY's open, not Friday spot
5. **Shelf dual-entry:** BATTLE_ORIGIN + defendedEdge role-tagged

Result: 11 unique, 9W/2L 81.8%, +26.00R (CHANGELOG.md:28-47).
Collateral: TP swap made EU/GU shallower (+8.23R→+4.65R), 3-pip split added a spurious loss, GU RRR collapsed below floor → GU 0 trades (CHANGELOG.md:42-43, TASK_QUEUE.md:158-166).

**Operator's verbatim orders (HOTFIX_SPEC.md:5):**
- "i never said to put a cap. i think you misinterpreted something here."
- "spot price is practically irrelevant for calculations and everything is done based on E1 → E2 → E3 mechanics and data… it needs to be day native"
- "S/D OBs + LQZs are BOTH RELEVANT — READ THE BUILD REPORTS — THIS IS A REGRESSION"

## 1.14 v4.5.5 Pristine Core (2026-07-29) — The Operator's Directive

**Operator (BUILD_REPORT.md:19):**
> "4.5.1 was solid — analyze WHY it was solid and HOW you deviated from this, wire this in + all the tangible improvements from the last 3 versions in 4.5.5 and remove all the slop. 4.5.5 better be a clear improvement from 4.5.1 and actually have the 23 gold standard trades properly mapped and calculated this time with 0 stupid bullshit or other garbage."

Forensic audit: DXY source lane BYTE-PRESERVED (entryPrice_LMV → computeSL_LMV+PROBE_GUARD → computeMirrorTP); EU/GU lanes drifted through **3 TP substrates / 3 pool changes / 3 emission-rule changes** (BUILD_REPORT.md:49, CHANGELOG.md:9).

The 7 fixes (FIX 1-7 + F1-A/F1-B):
- Pristine TP substrate restored (computeLmvTP-primary)
- GU distribution deadlock killed (mirror.ts:2123-2131 — register EVERY constructed mirror)
- GU entry precision (mirror.ts:1410-1417 — defended-side edge)
- Dual-entry threshold 3p→15p (DUAL_ENTRY_MIN_SEPARATION_PIPS=15, setup-gen.ts:619)
- F1-A SHORT-entry lift (setup-gen.ts:473-481 — `entry = s.top − 1*pipValue` when in lower half)
- F1-B defended-transit (setup-gen.ts:433-480 — probe-and-reclaim, Law-31 first-transit)
- Battle-time activation (types.ts:297 battleMs + mdve-stage.ts:1213 + report-v452.ts `activationMs = max(bracket.start, baseMs)`)

Result: 26 unique, 11W/5L 68.8%, +25.48R; DXY 12 unique 9W/3L +23.63R (all 8 golden emit, 6/7 resolved wins = 85.7%); EU 2W/0L +3.85R; GU 0W/2L −2.00R (BUILD_STATE.md:42-48).

## 1.15 THE WIPE + v4.5.2 E2 CASCADE (2026-07-31)

**Operator (E2_CASCADE_BUILD_REPORT.md:68):**
> "save all the tangible improvements so they survive the wipe and dont get lost, then wipe everything for 4.5.2 onwards - fork 4.5.1 as the new 4.5.2 and reapply all the tmp saved enhancements"

All v4.5.2-v4.5.5 checkpoints archived to `Checkpoints/_ARCHIVED/`; pristine v4.5_FORK → `v4.5.2_E2_CASCADE`; 7 improvements ported (dedup, stats, fill model, battleMs, F1-A, F1-B, dual-entry 15p + mirrorToDedupSetupV452) (CHANGELOG.md:694-722).

E2 cascade module shape-cascade.ts (175 lines) built: cascadeShapeChain(DXY→EU inverted→GU kept) (CHANGELOG.md:709-711).

**Interim: 24 unique, 14W/3L 82.4%, +32.75R** (DXY 9W/3L +23.63R, EU 3W/0L +5.28R, GU 2W/0L +3.84R) (COMPACTION_SURVIVAL.md:7, CHANGELOG.md:718).

## 1.16 THE POST-WIPE DERAILMENT (2026-07-31 — the session that triggered this bible)

The agent then repeated the v4.2 pattern (FAILURE_LOG_v4.5.2_E2_CASCADE.md:16-18, 66-82):
1. RRR floor 1.5→1.0 for FX (+20 garbage trades; win rate 82.4%→67.4%)
2. onSide 150-pip tolerance (admitted zones from different price regimes)
3. VIOLATED zones at group −3 (no precision gain, admitted garbage)
4. Nearest-to-spot ranking (win rate 67.4%→63%)
5. **The "30-pip coverage" delusion: declared "22/22 100%" — at ±3 pip tolerance it was 2/22 = 9%**
6. §8.1 LMV union unconditional (BROKE the cascade entirely — 0 EU/GU trades)
7. Stopping after every change (violating the loop directive)

**Verdict (FAILURE_LOG_v4.5.2_E2_CASCADE.md:8):**
> "DERAILMENT. The 30-pip 'coverage' is meaningless slop. The pipeline produces MORE trades but at WRONG LEVELS. Quality regressed. Win rate dropped from 82.4% to 67.4%. The '+47.65R' is inflated by volume, not precision."

Final: 32 trades 18W/6L 75% +40.12R, golden **1/22 at ≤3pip** (E2_CASCADE_BUILD_REPORT.md:6, POST-COMPACTION_PROMPT.md:19-20).

**The 10 derailment lessons (FAILURE_LOG_v4.5.2_E2_CASCADE.md:150-162):**
1. PRECISION OVER VOLUME — 23 trades at ±3 pips, not 52 at ±30 pips
2. The E2 shape chain must produce ZONE-LEVEL projections ("Monday's projected path visits supply zone X at level 1.14544", not "Monday is SS with bearish bias")
3. Don't lower standards to inflate metrics
4. The bestGroup filter is the specific blocker (golden-level zones are ALL VIOLATED group −3; removing the filter lets in garbage; the fix needs a ranking balancing freshness AND proximity)
5. Test against the golden standard at 3 pips after EVERY change — not 30, not 10, THREE
6. DON'T STOP — loop autonomously

---

# PART 2 — THE MDVE ERA: MATHEMATICAL DATA VISION ENGINE

## 2.1 The Math-Vision Pivot (D1)

**Operator (DECISION_CHAIN.md:9-12, MDVE_SPEC.md:7):**
> "Everything visible on the chart exists as data. We don't need to teach the agent to see the pixels on the screen — we need to teach it to see the STRUCTURE in the DATA and generate a proper mental model of the TTE framework. Pixels were just the input mechanism for me as a human. Vision is just how humans process math."

Consequence: the chart model is COMPUTED from raw OHLC; pixel-vision verifies the residual 10-20%. **ChartModel as total function:** `buildChartModel(pair)` → zones + LQZ matrix + enriched ladder + narrative + LMV (BUILD_STATE.md:297 Stage 1).

## 2.2 The MDVE Detection Rebuild (v4.4)

Canon detection was too coarse: 0 1H OB zones (golden BoM formed outside the 120-bar window + below the 50-pip threshold); LQZ matrix mega-merged via bar-range bucketing. Root-caused + rebuilt (CHANGELOG.md:176):
- MDVE-native 1H/30m OB detection (300-bar lookback, TF-scaled displacement)
- **Swing-point clustering** for LQZ rungs (NOT bar-range bucketing)
- golden-recon 16/16 on real bars (golden zones + 30 discrete rungs + narrative)

## 2.3 The Corrected Golden Narrative

The spec's "sweep origin Jul 6" was WRONG — the real sweep origin 100.603 = **JUL 3** (the Jul 10 sweep to 100.598 took out the Jul 3 low); week high 101.275 (Jul 8); Friday Jul 10 sweep to 100.598, recover to 100.73 (BUILD_STATE.md:227, CHANGELOG.md:177).

DXY zones (BUILD_STATE.md:225-226):
- 1H BoM demand [100.68-100.73]
- 1H MoM demand 100.845
- 1H BoM supply [101.110-101.275] (FRESH zfp10)
- 4H BoM supply ~101.19-101.35
- 48 LQZ zone-matrices spanning [98.751, 101.800]

## 2.4 The BattleMs Fill Model

The setup's battle timestamp (when it FORMED); fill activates at `max(session start, battleMs)`; expires 21:00Z trade-day NY close (BUILD_REPORT.md:424-461, Doctrine 6 BUILD_REPORT.md:731-735).

## 2.5 Day-Open Native Reference Spot

The mirror's onSide gate references the SIGNAL DAY's open via dayOpenPriceProvider: `return (pair, dayStartMs) => bars.find(b => b.timestamp >= dayStartMs && b.timestamp < dayStartMs + 24h).open` (BUILD_STATE.md:129).

## 2.6 PROBE_GUARD (setup-gen.ts:509-523)

Lifts SL to probe ± Law-7 buffer when the computed SL sits inside the battle's own deepest wick (BUILD_REPORT.md:71-73). **The battle group's own probe cannot be inside the SL** — price already visited there.

## 2.7 The 4-Stage LMV Construction (per LQZ = candle-matrix)

See Part 3 (full detail).

---

# PART 3 — THE LMV MACHINE (LIQUIDITY MATRIX VISION)

## 3.1 The Operator's Formulation (VERBATIM)

**DECISION_CHAIN.md:16 (D2):**
> "Create a matrix data set based on linear algebra or other MPSE concepts that groups ALL visible ranges of LQZs from candlestick data (the OHLC of several if not dozens of candles across the last 1-6 weeks all reacting to the same price range = clear liquidity zone). Group all of these into matrices so each zone's OHLC data from X number of candles = 1 matrix. We will have a table of matrices denoting exactly what are all the LQZ ranges. LQZs discovered by MPSE matrices. It should be very easy to map LQZs on the chart without even needing vision and then when we use vision to verify it will be visibly obvious. This immediately solves a big problem for E/SL refinement since everything is anchored to LQZs."

**PLUTUS_V4.4_MDVE_SPEC.md:264:**
> "this should be extremely easy to see in data since dozens of candles across multiple weeks all react to the same price range — a liquidity matrix vision that uses matrices to find all the LQZs in the data."

**MARKET_READINESS.md:66:**
> "a matrix dataset where each LQZ = a matrix of the contributing candles' OHLC (dozens of candles over 1-6 weeks reacting to the same price range = a liquidity zone). Group ALL such ranges into a table of matrices via linear-algebra/MPSE operations. LQZs are then mapped from data alone (no vision); vision verifies."

## 3.2 The Machine — buildLmvTable (lmv.ts, 611 lines, frozen `77e56cd0`)

**FROZEN-CORE FACT (2026-07-31 forensic, Agent B):** lmv.ts (611L), sl-lmv.ts (317L), and lqz-matrix.ts (626L) are **byte-identical across ALL five trees** (v4.5.2_FINAL, v4.5.3_FILL_AND_GU_FIX, v4.5.4_HOTFIX, v4.5.5_PRISTINE_CORE, E2_CASCADE). The LMV core NEVER changed across versions — ALL evolution happened in the CALLERS (setup-gen.ts, mirror.ts). The wipe did NOT lose LMV code — it lost 3 mirror.ts fixes (Part 9.1).

Each LQZ = a candle-matrix (BUILD_STATE.md:93, BUILD_REPORT.md:53-61, 1169-1170):

```
LqzZoneMatrix = {
  bottom, top, center, side,
  candles: OhlcRow[];   // THE MATRIX: rows = X reaction candles (chronological)
                        // cols = [timestamp, open, high, low, close, touchKind, wickTip, bodyClose]
  reactionExtreme: number;   // min(wickTip) BUY_SIDE / max(wickTip) SELL_SIDE  → SL anchor
  defendedEdge: number;      // modal bodyClose of defending candles            → entry anchor
  touchKinds: TouchKind[]; weekSpan: number; zfp: number
}
```

**The linear algebra = column reductions:**
- `reactionExtreme` = min/max of the wickTip column (the deepest defended point — SL goes just beyond it)
- `defendedEdge` = modal body-close of the DEFENDING candles (the most-defended level — entry anchors to it)
- `defendStrength = 1 − |reactionExtreme − defendedEdge|/ATR`
- Two zones with the same [bottom, top] but different candle matrices get DIFFERENT anchors — hard-defended vs loose

**The 4-stage construction (lmv.ts:422-610, DXY_FORENSIC §3.4):**
- **Stage 1 REACTION EXTRACTION** — total touch predicate (every bar → exactly one branch):
  - SWEEP: wick crossed the ENTIRE bucket ≥2 pips ∧ body closed back
  - WICK_REJECT: ≥2-pip wick tested ∧ body reversed ∧ retreated to approach side
  - BODY_DEFEND: body sat at level ∧ next bar turned ≥ max(2p, 0.5×ATR) against approach
  - CONSOL_DWELL: ≥3 consecutive bars intersecting, spanning ≤2 bucket widths
  - PASS_THROUGH: traversed without reacting — NOT a touch (excluded — anti-noise gate)
- **Stage 2 SWING-POINT CLUSTERING** — local swing extremes (strict max/min of ±1-bar neighborhood, ties→earliest, prominence ≥1 pip); cluster by single-linkage ε=2 pips with a **4-pip SPAN CAP** (anti-chaining guard — keeps 101.235/101.24 discrete, kills mega-buckets). v4.4 Bug-2 proof: bar-range bucketing chained [100.438,101.807]/299 touches; sparse swing points keep golden rungs 3-10 pips apart discrete.
- **Stage 3 ZONE-MATRIX ASSEMBLY** — for each cluster: candles = every reaction candle with touch price ∈ [bottom−2p, top+2p]; GATE |candles| ≥ 3 ∧ |distinct touchKinds| ≥ 2; reactionExtreme / defendedEdge / sweepCount / zfp = min(60, 20 + floor((|candles|−3)/2)×5).
- **Stage 4 COMPLETENESS** — every 0.25×ATR bucket in the range exists (zero-filled) — total over price × time, no unexamined region.

**Constants (lmv.ts):** CLUSTER_TOLERANCE_PIPS=2 (:179) · CLUSTER_MAX_SPAN_PIPS=4 (:188) · MIN_REACTION_CANDLES=3 (:197) · MIN_DISTINCT_KINDS=2 (:206) · ATR_PERIOD=14 (:213) · EPSILON_ATR_FRACTION=0.25 (:220) · DEFENDED_EDGE_QUANTUM_PIPS=1 (:231) · zfp ladder ZFP_BASE=20/ZFP_CAP=60/ZFP_TOUCH_BASE=3/ZFP_STEP_TOUCHES=2/ZFP_STEP_POINTS=5 (:238-242) · LQZ_LOOKBACK_BARS=720 (6 weeks 1H — the operator's 3-6 week sweet spot) · epsilon band = 2 pips (`[bottom−ε, top+ε]` :484-485).

**Side determination (:525-551):** BUY_SIDE = demand (buyers defended the lows, approach-from-above votes), SELL_SIDE = supply. The golden 100.845 demand-above-depressed-spot case is the cited anchor (:104-105).

**Output:** LmvTable — 48 DXY + 55 EU + 61 GU zone-matrices (CHANGELOG.md:157), price-ordered, spanning [98.751, 101.800] for DXY's golden week.

## 3.3 The 3 LQZ Candle Patterns (lqz-lobe.ts:264-317 — the canon detector)

- **LIQUIDITY_SWEEP** (lqz-lobe.ts:133-149): 2 thick bodies ≥1.5× avg breaking a 24-bar extreme, wick ≥2 pips beyond, reversal within 6 bars
- **LONG_WICK** (:153-166): wick ≥2.5× body and ≥5 pips, sharp move ≥ max(15p, 1.5×ATR) within 3 bars
- **SHORT_WICK_CONSOL** (:170-180): 3+ bars, short wicks ≤3 pips aligned within 2 pips, span ≤25 pips

Confirmation: ≥2 distinct types align on a horizontal line within `LQZ_ALIGN_TOLERANCE_PIPS=3` (:29-34, :185). Caps: 20/50/75 zones (:193-199). `mergeLqzWithIpZones` (:327-404) promotes overlapping IP zones (confluence +2, zfp −5) or appends standalone MoM zones with `zfp = min(60, 20+⌊(touches−3)/2⌋·5)` (:392).

**lqz-matrix.ts (626 lines, frozen) — the matrix-vision variant:** `buildLqzMatrix` builds `M[bucket][isoWeek] = swingReactionEvents` with a zero-filled completeness grid (:444-447), clusters (2-pip linkage, 4-pip cap — :470-485), then the stricter gate `≥3 points ∧ ≥2 distinct (day,session) participation windows` (:495-497, MIN_RECURRENCE_WINDOWS=2 :105). `matrixLadderRungs` (:599-626) projects entries onto ScaffoldRungs (`LQZ_M` namespace, priceCenter, zfp as liquidityScore, sweeps as reactionCount).

## 3.4 The 3-Anchor Doctrine (entry/SL/TP from LMV rungs)

**ANCHOR_DOCTRINE.md:17 (§1):** the 3-anchor chain:
1. **ENTRY** at the defendedEdge (entryPrice_LMV returns defendedEdge verbatim — sl-lmv.ts:303-304)
2. **SL** at the next rung's reactionExtreme + Law-7 buffer (2-3 pips INSIDE the next LQZ) — computeSL_LMV (sl-lmv.ts:177-270, frozen `91294083`): walks the LmvTable for rungs whose reactionExtreme lies beyond the entry on the adverse side, nearest-first (:198-207), accepts the first whose SL distance sits in [max(0.5×ATR, Law-7 buffer), GOLDEN_SL_MAX_PIPS=9.5] (:209-218). SWEEP-ORIGIN exception (:220-248): entry zone is the week's sweep origin → SL beyond the sweep extreme. Fallback: zone-width + Law-10 clamp (:250-269).
3. **TP** at the opposing rung's defendedEdge with S/D overlap (Earth+Fire) — computeLmvTP (mirror.ts:1533-1591): opposing-side LMV rungs significance-ranked `sig = (sweepCount≥1 ? 50:0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)` (:1553-1555), nearest-first; the cap-walk stops at the nearest fresh wall (zfp ≤ 20) between entry and target (:1568-1577); TP = the effective rung's defendedEdge (:1580). Weak walls (zfp > 30) pass through when passThroughWeakWalls (:1560).

**Law-7 pair buffers:** EUR 2 / GBP 3 / AUD 3 / DXY 5 (sl-lmv.ts:61-63, mirror.ts:67-69). **D17 SL ceiling = 36 pips HARD** (mirror.ts:79). **GOLDEN_SL_MAX_PIPS = 9.5** (sl-lmv.ts:84).

**The operator's SL doctrine (D35, DECISION_CHAIN.md:231):**
> "SL goes INSIDE the next LQZ next to the entry zone. Should usually be within < 20 pips. Any massive stupid 40 pip SLs are dumb as fuck for no reason"

## 3.5 computeGoldenSL_V452 + weekProbeAtAnchor (v4.5.2 §5.3 + GA fix — LOST IN THE WIPE, MUST RE-PORT)

**mirror.ts:2417-2536 (v4.5.5_PRISTINE_CORE) — the 4-stage golden SL pipeline:**
1. `computeSL_LMV` golden SL
2. PROBE_GUARD + §4.4.3 wick-clear: `const probe = weekProbeAtAnchor(...); if (!clearsAnatomy(sl)) sl = direction==='SHORT' ? p.price+buffer : p.price−buffer` (:2452-2456)
3. GOLDEN FLOOR `GOLDEN_SL_MIN_PIPS=4` — sub-floor SL walks to next defended rung in `[4p, 9.5+buffer]` clearing anatomy (:2466-2507)
4. Selective util guard: `util = probeDepthPips/structDistPips`; `util >= 0.40 → KEEP structural SL with UTIL_GUARD_KEEP` (:2511-2527), else PROBE_GUARD flag (:2528-2533)

**weekProbeAtAnchor (mirror.ts:2328-2381):** deepest adverse probe at the anchor within the model week — OB: non-pierced reaction-event prices (:2351-2354); GA-audit fix: **LMV candle wicks reaching INTO the anchor band ARE adverse anatomy** (:2362-2372); consumed anchors also include the band edge (:2373-2378); LQZ: week candle highs/lows (:2344-2348).

## 3.6 classFlexibleLQZFallback + GU Distribution (v4.5.3 — LOST IN THE WIPE, MUST RE-PORT)

**mirror.ts:1213, used at :1324-1342, wired at :1858 (v4.5.5):** the §8.1 union pool — LMV rungs join OB-class candidacy unconditionally at **group −1.5** (between OB recently-battled −1 and OB rank/nearest −2) with the recency gate (`lastReaction ∈ [weekStartMs, anchorMs]`). GU's trending week: 25/26 supply VIOLATED + 1 DEPLETED → class-locked pool collapses to ONE anchor; the union unlocks the operator's manual GU rung map (1.3380/1.3397/1.3400/1.3410/1.3436/1.3440).

**The GU distribution loop (current E2_CASCADE mirror.ts:2090-2117):** `usedGuAnchors` set + `excludedAnchorIds` retry spreads the EU→GU lane across distinct anchors. **The distribution deadlock fix (mirror.ts:2123-2131):** `if (g.status === 'ACTIVE') usedGuAnchors.add(...)` → `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror. **Macro principle (BUILD_REPORT.md:249-262):** "Distribution must be a property of the SIGNALS (N distinct signals deserve N distinct zones), NEVER of the OUTCOMES."

## 3.7 The LMV Resolution Limits (KNOWN GAP — the golden-rung collision)

The operator's drawn map (ANCHOR §11): 100.845/100.945/100.975/101.14/101.19/101.235/**101.240**/101.250 are SEPARATE rungs. Spacing: 100.845→100.945 = 10.0p; 100.945→100.975 = **3.0p**; 100.975→101.14 = 16.5p; 101.14→101.19 = 5.0p; 101.19→101.235 = 4.5p; 101.235→101.240 = **0.5p**.

The machine's floor: 2-pip cluster linkage + 4-pip span cap + ε=2-pip reaction band + 3-pip ladder dedup (`< 3·pip` strict at ladder-scaffold.ts:446). **Four stacked mechanisms collapse the golden set:**
1. **Band merging:** 100.975's candles absorbed into the 100.945 shelf's matrix by the ε=2 band → ONE zone-matrix [100.936-100.972], ONE entry at 100.977 (Δ0.2p — served, not distinct) (FAILURE_LOG_2026-07-29.md:68)
2. **Center drift:** emitted rung = prominence-weighted mean, not the modal reaction level → 101.19 emits at 101.208 (Δ1.8p), 101.235 at 101.253 (Δ1.8p)
3. **Dedup floor:** any pair ≤3 pips cannot both survive → 101.235/101.240 (0.5p) merged
4. **Bridge gap:** matrix LQZ lives in model.lqzMatrix/lmv/ladder but NOT model.zones → mirror anchor search never sees them as candidates (Bible 4.0:2647 remains structurally true)

**The 2026-07-31 ruling:** the 0.5-pip pair 101.235/101.240 = TWO distinct rungs (matches the drawn map). Resolution via modal-cluster emission + 30m/15m telescoped LMV runs + 1-pip LQZ dedup.

**The v4.5.4 TP-substrate regression (correctly NOT inherited):** v4.5.4 swapped computeLmvTP-primary for computeMirrorTP-primary (the X4-class invention) which made EU/GU TPs shallower (+8.23R→+4.65R) and collapsed GU RRR below floor → GU 0 trades. The E2_CASCADE fork correctly restored computeLmvTP-primary (mirror.ts:1533) and left the regression behind. **Do NOT re-introduce computeMirrorTP-primary for the mirror lane.**

**The computeLmvTP sweep-bonus inversion (documented, UNBUILT — NEXT_STEPS.md:47-53, 224-249):** swept rung = liquidity TAKEN → must be DEMOTED −30, not PROMOTED +50. The GU TP currently lands one rung too shallow → RRR 1.30 < floor → RRR_DISCARDED → GU lane dead. Evidence (diag-rungs, EVIDENCE_STATE.md:250-254): `[1.34081-1.34116] defEdge=1.34111 zfp=60 sweeps=1 → sig 90 (PROMOTED — wrong)`; `[1.34036-1.34073] defEdge=1.34022 zfp=50 sweeps=0 → sig 40 (DEMOTED — wrong)`.

---

# PART 4 — THE MIRROR CASCADE (DXY → EU → GU)

## 4.1 The 80/20 Doctrine (D3, VERBATIM)

**DECISION_CHAIN.md:19-22:**
> "The mirror is not per pip precision. The mirror is for the trade setup direction, shape, and zone class of entry + TP. 80%. The remaining 20% like specific entry/SL/TP levels and anchors within the mirror cascade must be optimized for the actual pair being traded on. obviously. cannot be a blind mirror."

**PLUTUS_V4.5_SPEC.md:594:**
> "You are mirroring zone CLASS not literal zone. If DXY moves from BoM EU moves from BoM — you must match to the relevant BoM zone that is specific to EU's actual price action pair-native storyline. DXY is only giving a SIGNAL with high accuracy not a blind copy paste trade."

Consequence: selectPairNativeZone matches by class + side + strength + volatility-aware SLs; EU 36.4%→100%.

## 4.2 The Cascade Doctrine (FULL-DIRECTION)

**PLUTUS_V4.5.5_BUILD_REPORT.md:562, GOLDEN_CASCADE_23.md:11:**
```
DXY LONG → EU SHORT (inverse) → GU SHORT (kept)
DXY SHORT → EU LONG (inverse) → GU LONG (kept)
```
5 DXY longs → 5 EU shorts → 5 GU shorts · 3 DXY shorts → 3 EU longs → 3 GU longs (one GU did not materialize → 7).

**DXY provides DIRECTION. The PAIR provides LEVELS.** Mathematical conversion FORBIDDEN — structural equivalence only (GOLDEN_CASCADE_23.md:56, POST-COMPACTION_PROMPT.md:179).

**The mirror floor (MDVE_SPEC.md:597, VERBATIM):**
> "Engine 3 trade setups calculated for DXY. DXY → EU (inverse direction). EU → GU (adjust E/SL/TP to match GU candles). EU and GU CANNOT have LESS trades than DXY. Every DXY trade MECHANICALLY maps to a mirror trade from the exact same (inverse — supply=demand, demand=supply) zones on EU/GU. Copy the trade, invert the directions/zones, find the price coordinates on the specific pair. Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not. GU diverges: bigger swings, tighter consolidations, moves can begin early or late by hours or a full session; some cascaded setups die to the RRR filter (GU's volatility); GU winners run 5-11 RRR vs EU 4-8."

## 4.3 The v4.5.1 Pristine Mirror Pipeline

**anchor → defendedEdgeEntry → computeReactionExtremeSL → computeLmvTP-PRIMARY (mirror lane)** (BUILD_REPORT.md:103-110). cascadeV45 + reAnchorMirror: reAnchorMirror (pair-native anchor selection, 80/20), defendedEdgeEntry (the consumed anchor's borrowed defendedEdge), computeReactionExtremeSL, computeLmvTP-primary with computeMirrorTP fallback (BUILD_REPORT.md:103-112).

**computeMirrorTP (mirror.ts:501-601):** weak-wall pass-through :535, cap-walk :570-581, Earth+Fire midpoint :584-586.

## 4.4 The E2 Cascade (2026-07-31 — E2 BEFORE E3)

**COMPACTION_SURVIVAL.md:47:** "E2 fires on DXY and cascades INVERSE to EU and then to GU. BEFORE E3."

shape-cascade.ts (175 lines): cascadeShapeChain copies the shape sequence, inverts direction for EU, keeps for GU, finds the target pair's zone ACTIVE on that day (E2_CASCADE_BUILD_REPORT.md:145-157). E2 wired into cascadeV45 → selectPairNativeZone (shapeDay.keyZoneId exact match + keyZonePrice proximity bonus) (E2_CASCADE_BUILD_REPORT.md:159-167).

**THE FAILURE:** the E2 signal was ADVISORY (+2 tier bonus), never authoritative — "the cascade picks the STRONGEST zone, not the GOLDEN-LEVEL zone" (FAILURE_LOG_v4.5.2_E2_CASCADE.md:112; POST-COMPACTION_PROMPT.md:83-93). **The fix (2026-07-31 ruling): make E2 designations AUTHORITATIVE — exact keyZoneId match → return immediately (SPEC §4.2).**

## 4.5 selectPairNativeZone — Current Mechanics (mirror.ts:1233-1373)

1. Exact `shapeDay.keyZoneId` match → PREFER immediately (:1351-1354)
2. Else shape-day proximity bonus `shapeTierBonus = 2 × (1 − proximity/scaleRange)` with `scaleRange=0.015` (≈150 pips FX), up to +2 tiers (:1359-1365)
3. `e2TargetPrice = direction==='SHORT' ? shapeDay.supplyZonePrice ?? keyZonePrice : demandZonePrice ?? keyZonePrice` (:1346-1348)
4. Reaction-time ±48h pool preference `2 × FORMATION_TIME_TOLERANCE_MS` (:1333-1336)
5. Consumed-pool groups 0/−1/−2 (:1301); VIOLATED admitted within a 50-pip band of the day-native spot (:1294-1297)
6. Price-range filter — LMV center ±15% buffer, zones outside are stale (:1255-1264)
7. Zone-ID centerKey exclusion fix — `|${center.toFixed(5)}` suffix match so lmvAnchorId exclusions actually fire (:1271-1276)

## 4.6 The Emergent Merge (MDVE_SPEC §9.4, mdve-stage.ts:691-720)

Mirrors (floor) + emergent (surplus) merged with dedup by (zoneId, reactionEvent.session) — an emergent setup at the same zone+session IS the mirror. `mergeMirrorWithEmergent` uses the corrected identity `pair|direction|day|session|bucket(3-pip)` with mirror provenance winning collisions (:705-711). AUD is emergent-only (§8.13 profile). Invariant: `|EU| ≥ |DXY ACTIVE mirrors|`, `|GU| ≥ |EU ACTIVE| − documented casualties` — enforced by `checkMirrorFloorV45` (:2135-2166).

## 4.7 The Dedup Doctrine (REPORTING-LAYER ONLY)

**D11 (DECISION_CHAIN.md:304):**
> "multiple entries that are all within 5-15 or so pips of each other are multiple entries of 1 trade; a LL reinforcement 30+ pips away is obviously a separate trade"

Identity = (pair, dir, zone_anchor±3pips, day), NO session component (DECISION_CHAIN.md:276-280). "Same zone can be valid for multiple days" (D39, DECISION_CHAIN.md:251). NO CAPS (D38, DECISION_CHAIN.md:246):
> "I explicitly said in the last session max setups should be removed there is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups"

>12 trades per pair = slop (DEEP_FIX_CODEX.md:104); 6-11 per pair (DEEP_FIX_CODEX.md:37).

---

# PART 5 — THE TVI / VEI / PVE STACK

## 5.1 TVI (Trading Visual Intelligence) — Deterministic Harness

**The principle (TVI_DESIGN_SPEC.md:43, DEEP_FIX_CODEX.md:594):**
> "the model PERCEIVES, the harness DECIDES, the harness VERIFIES"

Subsystems (DEEP_FIX_CODEX.md:600-611):
- **VKG** (Visual Knowledge Graph, 1,230 lines, 106 deterministic nodes across 6 categories: 30 identification, 31 validation incl. 6 V4.3 anchor nodes, 15 evidence, 15 anti-pattern, 10 confluence, 5 shape)
- **VCM** (Visual Context Matcher, 156 lines, 8-phase pipeline, 106→5 nodes in 1.633ms < 2ms budget)
- **VST** (Visual State Tracker, 323 lines, SQLite via bun:sqlite — better-sqlite3 crashes under Bun ERR_DLOPEN_FAILED, 7 tables)
- **VEB** (Visual Enforcement Brain, 523 lines, pre-gates P1-P5 throw / post-gates V1-V5 record; P1 MUST_READ_SCREENSHOT / P2 MINIMUM_ZONES / P3 BOTH_SIDES / P4 NO_IP_ENTRIES / P5 SCREENSHOT_FRESHNESS; 0.038ms — 260× under budget)
- **VGS** (Visual Guidance System, 287 lines, T0 bullets + warheads + profiles TRUSTED/STANDARD/GUIDED from VTM health)
- **ZIP** (Zone Identification Protocol, 361 lines, order-agnostic parseZoneLines + verifyZone 8 gates + ZONE_PROMPT_TEMPLATE 4,223 chars). Protocol: `ZONE|type|top|bottom|timeframe|classification|confidence|evidence` (prices in ANY order — harness normalizes; screenshots AUTO-SAVE to /tmp/tv-screenshot-*.png — never extract base64)
- **VLD** (Loop Detection, 237 lines, 6 patterns: STALE_READ, NO_VERIFY, SCRIPT_LOOP, REPEAT_ERROR, BLIND_ACT blocks, NO_REPORT)
- **VTM** (Trajectory Monitor, 397 lines, health score last 10 runs, TRUSTED > 0.85 / STANDARD > 0.60 / GUIDED, 12 anti-derailment patterns AD-1..AD-12)

## 5.2 The Args-in-OUTPUT Hook Fix (K — the deepest root cause)

opencode 1.14.43 BEFORE trigger = `trigger("tool.execute.before", {tool, sessionID, callID}, {args})` — **args live in the OUTPUT parameter, NOT the input**. Wiring: `((output as any)?.args ?? (input as any)?.args ?? input)` (DEEP_FIX_CODEX.md:509-543, binary proof :961). 7 container iterations of "MINIMUM_ZONES: 0/3 … Saw: ." traced to this. The AFTER trigger DOES include args in input — that asymmetry masked it.

## 5.3 VEI (Vision-Enhanced Intervention, v4.4 — the HANDS)

13 detectors + the L2→L3→L2 ladder + NAVIGATION_DRIFT, DRAW_DUPLICATE, PROGRESS_STAGNATION (BUILD_STATE.md:62, EVIDENCE_STATE.md:138). VEI_SPEC 1,033 lines.

## 5.4 PVE (Probabilistic Verification Engine — DESIGN ONLY)

**The concept (PVE_DESIGN_SPEC.md:5):**
> "an actual statistical/mathematical/probabilistic verification engine that can calculate a success % of each trade and pass this as an output arg with each trade setup. Deterministic, not model inference, based on all the final data available at the end of a TTE report with trade setups as a final verification pass of the firewall layer."

**8 hard design constraints (PVE_DESIGN_SPEC.md:28-39):**
1. DETERMINISTIC ONLY — zero LLM calls, zero model inference
2. EVERY CONSTANT HAS A BECAUSE PARAGRAPH + data provenance
3. CALIBRATION IS A PROCEDURE, NOT A RUNTIME BEHAVIOR
4. THE GOLDEN STANDARD IS A VALIDATION SET, NEVER A TRAINING INPUT (all 8 DXY golden trades must grade ≥ B ≥ 0.60; weights must not be fitted to make them pass)
5. FALSIFIABILITY — every weight has a stated sign-flip test
6. NO COUNT CAPS, NO RANK TRUNCATION — filtering only at probability floor (REJECT < 0.50) and structural gates
7. SMALL-SAMPLE HONESTY — Laplace (add-one) smoothing; factor with < 5 observations shrinks toward neutral (LLR = 0)
8. NO FEEDBACK INTO ZONE/SHAPE ENGINES — PVE consumes outputs read-only

**The 4-stage pass:** (1) 21 features across 3 axes (A zone quality 0.45, B setup geometry 0.35, C context alignment 0.20), (2) naive-Bayes log-odds accumulator `posterior_logodds = prior + Σ (W_i × (x_i − 0.5) × LLR_i)`, (3) deterministic path simulation (entry reachability, Law-14 walk, SL exposure walk, chain coherence, duplicate-class exact-match elimination), (4) `P_final = P(success) × P_entry_fill × (P_tp_first / (P_tp_first + P_sl_first))` with 20% shrink toward no-opinion until ≥ 50 backtested setups (PVE_DESIGN_SPEC.md:75-160).

**Grade bands:** A+ ≥ 0.80 · A 0.70-0.79 · B 0.60-0.69 · C 0.50-0.59 FLAG (manual review) · F < 0.50 REJECT (removed, logged with full breakdown) (PVE_DESIGN_SPEC.md:156-160).

**Build gate (DEEP_FIX_CODEX.md:750):** "Build only after Engine 3 setup generation is A-grade solid and container-verified."

## 5.5 Scaffolded Visual Verification — The Zone-Consistency Root-Cause Solution

**DEEP_FIX_CODEX.md:673:** "harness PROPOSES a deterministic candidate ladder (from each week's OWN data, never hardcoded), model VERIFIES freshness/evidence on that fixed set, harness DECIDES + VERIFIES."

**5 deterministic sources (DEEP_FIX_CODEX.md:677-684):** multi-TF order blocks (4H+1H+30m), LQZ detector (1H, 720 bars, 3 candle types, 2+ confirmation), 9-pillar grid, week-range Fib retracements (0.236/0.382/0.5/0.618/0.786), prior-week/day H/L/C. Union, sort, dedupe → ~20-40 levels/pair spanning ±200 pips.

**The determinism doctrine (DEEP_FIX_CODEX.md:707-709):**
> "NOT hardcoding Jul 6-10 — the scaffold is computed from each week's OWN data; different week = different ladder. The determinism is in the COMPUTATION, not the LEVELS."

**The remaining root cause (DEEP_FIX_CODEX.md:663-716):** non-deterministic zone data — the agent INVENTS zone levels each run; the golden rung density (4-10 pips apart) isn't consistently in the map because there's no deterministic scaffold producing it. "This is NOT a model-quality problem. It's an ARCHITECTURE problem: the pipeline asks the model to GENERATE the zone map (high variance) when it should ask the model to VERIFY a deterministic scaffold (low variance)."

---

# PART 6 — THE DEEP FIX CODEX: THE 7 CHAINS (v4.3 era, all container-verified)

## 6.1 Chain 1 — Consumption/Dedup (the DXY slop machine)

40 DXY setups = ~13 real trades × 3-4 byte-identical re-fires. Root cause: the state-string consumption rule counted NEIGHBOR activity (simulatedTouches) — toothless in dense clusters; self-touch paradox (forward spread places the front entry OUTSIDE the zone).

**Fix (W6-1, gen:648-671):** the geometry fingerprint — `geomSig = direction|entry|sl|tp`, `zoneUseKey = pair_zoneId_category`; same geometry = same trade regardless of day label; cross-category global guard. DXY 40 → 11-13 (DEEP_FIX_CODEX.md:96-175).

## 6.2 Chain 2 — Freshness/ZFP (the EUR/GBP starvation machine)

4 sub-bugs:
- (a) countReactions counts BARS not EVENTS (4h-sd-lobe:404-427 → event-granularity :421-465; 3 bars ≈ 1 event; GBP D1 zfp 65→18)
- (b) pierce-terminal forces depletion with 0 events (gap-through ≠ depletion; **pierce requires a BATTLE** — fix α)
- (c) boosted top-30 sort EXCLUDES 4H/LQZ (pillar sortKey 12-19 vs 4H 0-9 → interleaved pool engine:1086-1100)
- (d) zoneZfp inheritance global midpoint LOTTERY (gen:1580-1607 → name-match → type-class → same-pair nearest :1602-1674)

**Canon zfp ladders (DEEP_FIX_CODEX.md:178-298, BUILD_STATE.md:249-271):**
```
BoM: 0x=10 (Hard Wall) / 1x=18 / 2x=32 / 3x+=65 (depleted)
MoM: 0x=65 (virgin = pierces = death zone) / 1x=22 / 2x=38 / 3x+=70
LQZ: min(60, 20 + floor((touches−3)/2)×5)
Freshness INVERTED between types at 0x (UM BoM = 100% reaction; virgin MoM = pierces)
```

## 6.3 Chain 3 — Translation Architecture (per-pair chains)

ONE shared DXY chain fed to all pairs. Evidence: engine.ts:470-474 ONE ShapeBrain, shape-brain.ts:1153 hardcoded `spots['DXY']`, engine.ts:1056-1058 same snapshot to every pair.

**Fix (W6-3):** per-pair chains (`shapeByPair` record; per-pair snapshot with instrument + own zones + own spot; instrument-spot fix at 3 sites — shape-brain.ts:1162/172/455: `spots[instrument ?? 'DXY'] ?? spots['DXY'] ?? 0`); `extractDxyBias` (BULLISH/LONG→BULLISH, BEARISH/SHORT→BEARISH, else NEUTRAL) injected as explicit inverse-direction parameter; `cascadeAligned = !isDXY && inverseBias !== null && isCascadeDirectional && String(direction) === inverseBias`; cascadeSource ∈ native | cascade-neutral | cascade-aligned | counter-trend (DEEP_FIX_CODEX.md:301-389).

## 6.4 Chain 4 — Options (Defect M)

5 defects: (1) harvest computes ARCHIVE URL (404; correct = Orders index https://investinglive.com/Orders/), (2) browse-screenshot has NO Protocol A + silent any-tab fallback, (3) Manual Step A teaches wrong flow, (4) **THE SILENT KILL: zones tool NEVER passes optionsData to pillarEngine (engine.ts:333-337) — P8 always `{levels:[],score:0}`**, (5) notional units trap (billions — DO NOT DIVIDE BY 1000).

**Fix (W6-5):** harvest optionsDateLink (engine:222-235), full Protocol A (engine:1250-1530: NAVIGATE_ORDERS → FIND_DATE_LINK → NAVIGATE_DATE_PAGE → LOCATE_TABLE → SCREENSHOT → FIREWALL; [NO DATA] declared honestly), optionsData wired into pillarEngine (engine:369-420). Legacy "most recent 3" substitution NOT ported (injects a different week's walls = fabricated confluence).

## 6.5 Chain 5 — Hook-Args (K): see Part 5.2

## 6.6 Chain 6 — Anchor Geometry (SL/TP machinery)

- **SL over-inflation:** OLD `entryZone.bottom − 3×buffer` (15 pips beyond FAR edge; effective 25-30 pips; golden SLs 4-9.5 pips); FIX computeSLNextLqzRung: SL INSIDE next LQZ rung, buffered in from NEAR edge (Law 7 verbatim: "2-5 pips INSIDE the NEXT structural zone")
- **TP nearest-any-zone:** FIX computeTPSignificancePath: significance ranking (UM BoM +100, Earth+Fire +50, BoM +25, MoM ≤1× +15, depleted −100) → Law 12 (TF ≥ entry) → Law-14 walk with SIMULATED MITIGATION (prior setups in the same report mitigate zones they touch — golden T6's 55.5-pip TP past 5 mitigated zones) → hasRealFreshness filter → Earth+Fire midpoint/near-edge → TP min distance 1.2×SL → Law 13 (2× ambitious, 3× next candidate)
- **Fantasy ATR-fallback REMOVED entirely** (27x fake RRR) — 3 fails = hard reject with audit trail (D36)
- **SL ceiling bypass fixed** — D17 36p ceiling on ALL fallback SL paths
- **SL units "0 pips"** — slDistancePips was in DXY POINTS; FIX uniform-pips conversion (`|entry − sl| / pipValue` for all pairs)
- **The retry loop** — generateWithRepair: 3 attempts (SL rung / rung+1 / Law-8-direct with ceiling; TP significance attempt-N passing candidate); **ENTRY NEVER MOVES**; 🔧 REPAIRED(n) annotations; hard rejects carry full 3-attempt audit trail (DEEP_FIX_CODEX.md:555-587)

## 6.7 Chain 7 — The TVI Stack: see Part 5.1

## 6.8 The 20-Run Container Loop (the discipline)

A-L defects (ATR fantasy, SL ceiling, SL units, LIQUIDITY-only anchors, placeholder reactionCount, source omission, wrong-tool zoneAnalysis, harness-parse gap, ZONE| wire inversion, JSON-string args, **K the OUTPUT-param args**, DEFAULT_ZFP=50) + W6 zfp α/β. Convergence: 53 setups (DXY 40→11-13 via fingerprint, EUR 2-33, GBP 1-2, AUD 0 canon §8.13). SHA chain: `b414d7894c` → `80714498` → `6732d4b3` → `304e6e07` → `060df24d` → `ea427a3e` → `2017c817` → `32b32996` → `0399905b` → `141e07a2` → `7503ca3f` → `36a956a7` → `4759445b` → `8c69e80e`.

**Meta-lesson (14.2):** "mechanical verification against ground truth (golden trades, binary contracts, input contracts, output consistency) is the only way to find bugs that look correct."
# PART 7 — OPERATOR DOCTRINE RULINGS (VERBATIM — THE BIBLE'S BACKBONE)

> Every ruling below is QUOTED verbatim with source. Doctrine is QUOTED, never synthesized (D13). Anything that cannot be quoted does not get built.

## 7.1 RRR — The Absolute Standard

**"NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."** (2026-07-29) — DECISION_CHAIN.md:288 (D7), TASK_QUEUE.md:191, GOLDEN_CASCADE_23.md:9.

**RRR is the #1 metric; win rate is #2 as long as win rate is 70%+** (DECISION_CHAIN.md:48-49).

**The executed standard is 4R minimum when all 3 anchors are solid:**
> "If all 3 are solid RRR will literally be 4 minimum." — PLUTUS_ANCHOR_DOCTRINE.md:28
> "your manual avg RRR is 4, if yours is 1 you have major flaws" — LOSS_AUTOPSY.md:9

**The emission floor (2026-07-31 ruling — SUPERSEDES all lower floors):**
> "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM." — 2026-07-31 operator session

The codebase's category floors (HTF_SWING 2.0, SWING_SCALP 1.5, BREAKOUT_SURGE 2.0, REINFORCEMENT 1.5, TRANSITION 2.0, WHIPLASH 2.0 — trading-constants.ts:140-147) are LEGACY MINIMUMS; a geometry computing below ~3.5 at the operator's levels indicates an ANCHOR failure, not a tradable near-miss (BUILD_REPORT.md:713-717).

## 7.2 RRR-Failed ≠ Hard Reject — The Retry/Refinement Doctrine

**D36 (BUG_LOG.md:198, DECISION_CHAIN.md:236):**
> "When a trade setup is rejected it should not immediately hard reject. It should give context WHY, force an IMPROVED setup for the same trade that does not derail from principles, and try again up to twice. Often it is just a dumb SL/TP making a trade 1.8 vs 3.6 vs 4.5 RRR. If the trade fails 3 times then hard reject."

**ANCHOR_DOCTRINE.md:157:**
> "A rejected setup is not a dead setup. The entry is the hard-won insight; SL/TP are engineering. A 1.8-RRR trade with a valid entry is a good trade with a dumb anchor."

RRR recovers to 3.6-4.5 as an emergent property of repair (FAILURE_LOG.md:1921).

**The 3-attempt cycle (ANCHOR_DOCTRINE.md:155-166):**
1. Attempt 1 fails → log exact context ("RRR 1.4 < 2.0 — SL 28p, TP 39p")
2. Attempt 2 (repair): **entry FIXED**, re-anchor SL to the next rung out, TP to the next significance-ranked candidate
3. Attempt 3 (last): next-best opposing zone/rung
4. Failure → HARD REJECT with full 3-attempt audit trail
5. Repaired setups annotated: `🔧 REPAIRED(2): SL re-anchored 28p→9p, RRR 1.4→4.1`

## 7.3 No Caps — Ever

> "i never said to put a cap. i think you misinterpreted something here." — DECISION_CHAIN.md:300 (D10)
> "I explicitly said in the last session max setups should be removed there is no limit on trade setups for a week, there is only filtering of shitty dumb garbage setups" — DECISION_CHAIN.md:246 (D38)
> "ALL valid setups should be mapped. The filter will kill retarded/hallucinated setups." — DECISION_CHAIN.md:144 (D16)

## 7.4 The 23-Golden-Trade Target (the acceptance oracle)

**The full-direction cascade:** DXY LONG → EU SHORT (inverse) → GU SHORT (kept) · DXY SHORT → EU LONG (inverse) → GU LONG (kept). 5 DXY longs → 5 EU shorts → 5 GU shorts; 3 DXY shorts → 3 EU longs → 3 GU longs (one GU trade did not materialize → 7).

**f(T) acceptance formula (DEEP_FIX_CODEX.md:39-47):** `f(T) = N + I(P)`; N=8 golden DXY, I=−8 inverse ×2 pairs = **24 setups (8 per pair, excluding AUD)**. "MORE than 24 is fine, LESS is not" (emergent trades on top).

**Acceptance oracle (GOLDEN_CASCADE_23.md:93-95):** all 23 trades at the operator's levels (±3 pips on entry, the Tier-C SL/TP semantics) with every trade's planned RRR ≥ 3.5; the visual eval renders the golden map overlaid with generated setups.

## 7.5 Spot Price Is Practically Irrelevant — Day-Native Evaluation

> "spot price is practically irrelevant for calculations and everything is done based on E1 → E2 → E3 mechanics and data… it needs to be day native" — HOTFIX_SPEC.md:5, FAILURE_LOG_2026-07-29.md:48

Data-cutoff ≠ evaluation-reference. The mirror's onSide gate references the **SIGNAL DAY's open** (dayOpenPriceProvider), not Friday spot.

**2026-07-31 refinement (session ruling):**
> "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is compltely irrelevant"
> E2 must "forward map the predicted spot price of that day at london session open" — the DayBand concept (HOTFIX_SPEC.md:51,104 — deferred to v4.6 Wave 2, now MANDATED)

**The canonical failure case (FAILURE_LOG_2026-07-29.md:48):** Monday's GU short at 1.3380 (a WINNER) was REJECTED by the Friday gate ("below Friday spot 1.33968") — Monday's open was 1.33522. The operator's doctrine: everything is done based on E1 → E2 → E3 mechanics and data.

## 7.6 Zone-Anchored, Not Price-Anchored

> "Trades require clear S/D + LQ that align with Engine 2 Shape mechanics or it is just noise" — CHANGELOG.md:195 (DECISION-1)

**2026-07-31 expansion (session ruling):** cascade setups are ZONE ANCHORED Trade Setups, not Price Anchored — the pair's own zones designated by the cascaded E2, structural equivalence, no price conversion from DXY.

## 7.7 Emergent Trades on Top of the Cascade

> "Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not" — PLUTUS_V4.4_MDVE_SPEC.md:597, PLUTUS_V4.4_FULL_BUILD_AND_TEST_LOG.md:434

Mirror lane = guaranteed floor; emergent lane = additive, merged with dedup by (zoneId, reactionEvent.session).

## 7.8 The E2 Cascade — BEFORE E3

> "E2 fires on DXY and cascades inverse to EU and then to GU" — POST-COMPACTION_PROMPT.md:178
> "DXY provides DIRECTION. The PAIR provides LEVELS." — POST-COMPACTION_PROMPT.md:179

E3 cascades AFTER E2, benefiting from pre-existing E2 maps on cascade pairs (E2_CASCADE_SPEC.md:16-19).

**The 2026-07-31 interleaved pipeline order (session ruling — the FULL architecture):**
```
DXY: E1 → E2 → E3                                    (full, completes first)
EU:  E1 → DXY-Inverse E2 Cascade → E2 → DXY-Inverse E3 Cascade
                                        (ZONE-ANCHORED setups, not price-anchored)
     → E3 + EU emergent trades on top
GU:  E1 → EU E2 Cascade → E2 → EU E3 Cascade
                                        (zone-anchored)
     → E3 + GU emergent trades on top
```
Per-pair E1 runs first as pre-flight for that pair's E2/E3 (zero carryover between pairs).

## 7.9 The Telescoping Doctrine (2026-07-31 — E1 FUNDAMENTAL)

**The ruling (session, verbatim):**
> "S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"
> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"
> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"
> "All of these are telescoping refinment procedures."

**Compressed law (the mechanical gate):**
- S/D: 4H → 1H refinement; 1H → 30m refinement (nested zones allowed)
- BoM origins: 4H/1H ONLY (30m NEVER a BoM origin)
- MoM: 30m VALID (E2 reaction points for SS/R shapes)
- LQZ: 1H → 30m → 15m telescoping (origin detection per TF, refinement down)
- LTF never overrides HTF direction (Bible 4.0 Law 1)

**Forensic state (2026-07-31):** telescoping is COMPLETELY ABSENT in the live E1 pipeline. The emergent lane is 4H-only S/D + 1H-only LQZ; the MDVE lane constructs 4H+1H+30m OBs independently with zero cross-TF logic; the ONLY telescoping implementation lives in the DEAD legacy pipeline (plutus-tte-pipeline.ts:3021-3179 constructAndMergeMultiTfZones with refinedLabel); 15m bars are harvested but used by nobody; bom-mom.ts is TF-agnostic (30m can be classified BoM today — a doctrine violation). **This is the root cause of all macro derailments: E1 is the foundation, and E1 has no telescoping.**

## 7.10 The LMV Formulation (verbatim) — see Part 3.1

## 7.11 OBCV — Order Block Candle Vision (2026-07-31 session ruling)

> "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function. I dont think matrices apply here like they do with LQZ since there arent dozens of candles reacting to the same level that can be grouped into matricies and detected."

**The math (2026-07-31, MPSE synthesis — 4 sub-engines):**
1. **ATR-normalized displacement field D** (impulse detection): `body ≥ 1.5×μ_body(prev 4)` ∧ `|close−open| ≥ 1.5×ATR14(rolling, ending at i−1)` ∧ forward excursion `D_t(i,k) ≥ θ_tf` (4H: 50p/18 bars; 1H: 30p/36 bars; 30m: 20p/48 bars per code, 15p/24b proposed) ∧ structureBroken. **The v4.4 Bug-3 lesson is load-bearing: rolling ATR never includes the impulse bar.**
2. **Origin-candle feature matrix F** (rows = origin candles, cols = bw/bf/rng/dir/prior): `isBoM ⟺ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate(t)` (4H 15-40 / 1H 8-25 / 30m 5-15 pips)
3. **Prior-move direction classifier**: NONE (dwell ≤ 0.5×ATR, drift < 0.25×ATR) / OPPOSITE / SAME via signed ATR-normalized displacement sums — BoM = NONE|OPPOSITE, MoM = SAME, else REJECT (piecewise-total)
4. **Telescoping incidence matrix T**: `T[parent][child] = 1 ⟺ child ⊆ parent ∧ tf(child) < tf(parent)`; **30m OB requires a 1H parent (orphan → REJECT)**; 1H may refine 4H

Firewall invariants: partition (BoM+MoM = total), nesting (no orphan 30m), widthGate re-verified. Acceptance oracle: golden reconstruction from data alone (1H BoM demand 100.68-100.73, 4H BoM supply 101.235-band, 1H MoM 100.845).

**LMV + OBCV = the two biggest levers (session ruling):** once these 2 are 96%+ accurate, 90% of the work in charting zones is done from the start — the exact candles/price anchors for nearly all zones are already computed.

## 7.12 The Frozen-File Revision (2026-07-31 session ruling)

> "if the current LMV + LQZ matrix are not identifying any of the gold standard LQZs then they obviously need modification and the current versions are just working prototypes"

**Revised frozen list:**
- **MUTABLE PROTOTYPES:** lmv.ts, lqz-matrix.ts (until the golden-LQZ oracle passes: 100.845/100.945/100.975/101.14/101.19/101.235/101.240 at ≤1 pip)
- **FROZEN:** sl-lmv.ts (91294083) — unless the LMV interface changes, then contract-update + new hash
- **FROZEN:** engine.ts (3deb2814) — pipeline tools; telescoping lands in ob-engine/lqz-lobe/synthesis, not here
- **FROZEN with documented exception:** visual-setup-generator.ts (the RRR/refinement machine change is a documented exception, same precedent as setup-gen.ts HOTFIX_SPEC:65)
- **LOCKED IMMUTABLE:** v4.5.1_LIVE_MARKET_CAPABLE — **the new baseline** (2026-07-31 ruling: "4.5.1 is the new baseline which i have also locked immutable"; supersedes v4.4)
- **FROZEN:** trade-dedup.ts (33914c89) + 5 harness scripts (golden-recon 454b8abc, verify-integration ce975356, scratch-lmv a4dc01c1, verify-sl-fix f8ed6b20, verify-mirror-fix 2006ce2e)

## 7.13 The Dedup Doctrine — see Part 4.7

## 7.14 The 80/20 Mirror Doctrine — see Part 4.1

## 7.15 The Wipe Decision (2026-07-31)

> "save all the tangible improvements so they survive the wipe and dont get lost, then wipe everything for 4.5.2 onwards - fork 4.5.1 as the new 4.5.2 and reapply all the tmp saved enhancements" — E2_CASCADE_BUILD_REPORT.md:68

**The band-aids were hurting** (CHANGELOG.md:720). The wipe was CORRECT; the post-wipe derailment (RRR 1.0, onSide 150p, 30-pip delusion) was NOT.

## 7.16 The Meta-Rule (D13)

> "Doctrine is QUOTED, never synthesized... before any design decision that touches doctrine, re-read the evidence from disk and QUOTE the operator's exact words with a source. Anything that can't be quoted, doesn't get built." — DECISION_CHAIN.md:312

---

# PART 8 — THE GOLDEN STANDARD 23 (the acceptance oracle, complete)

## 8.1 Tier A — The 8 DXY Trades (DOCUMENTED EXACT — data/GAP_ANALYSIS_2026-07-18.md §9, verbatim)

| # | Day | Setup | Entry | SL | TP | Risk (p) | Reward (p) | RRR | Zone |
|---|-----|-------|-------|----|----|------|--------|-----|------|
| 1 | Mon | SS Long | 100.945 | 100.905 | 101.115 | 4.0 | 17.0 | **4.25** | 1H LQZ |
| 2 | Mon | BS Short | 101.14 | 101.200 | 100.845 | 6.0 | 29.5 | **4.92** | 1H LQZ |
| 3 | Tue | SS Long | 100.845 | 100.77 | 101.190 | 7.5 | 34.5 | **4.60** | 1H MoM |
| 4 | Wed | SS Short | 101.19 | 101.25 | 100.975 | 6.0 | 21.5 | **3.58** | 1H LQZ |
| 5 | Wed | RWL Long | 100.975 | 100.905 | 101.240 | 7.0 | 26.5 | **3.79** | 1H LQZ |
| 6 | Wed | BS Short | 101.235 | 101.330 | 100.680 | 9.5 | 55.5 | **5.84** | 4H BoM |
| 7 | Thu | Ladder Short | (multiple at LQZ) | — | — | — | — | — | 1H LQZ |
| 8 | Fri | Whiplash + RWL | (continuation of Wed+Thu) | — | — | — | — | — | 1H LQZ |

**Documented key levels (verbatim):** LQZ = 100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240 · BoM = 100.680 (1H), 101.330 (4H) · MoM = 100.845 (1H).

**Structural notes (verified against the bars fixture /tmp/opencode/bars_raw.json):**
- #1 (Mon 100.945 long): Monday's dip printed 100.838 at 00:00-01:00Z, recovery rallied through 100.945; SL 100.905 never threatened post-fill; TP 101.115 filled (Monday's high 101.145). ✓ WIN.
- #2 (Mon 101.14 short): SL 101.200 never threatened (Monday's high 101.145); TP 100.845 passed through (Tuesday's low 100.786). ✓ WIN.
- #3 (Tue 100.845 long): Tuesday's dip printed 100.803 — his SL 100.77 SURVIVES by 3.3 pips; **our system's SL for this shelf is 100.811 — inside the 100.803 dip → our version dies where his survives. This is the SL-precision gap in one row.** TP 101.190 filled (Wednesday's high 101.275). ✓ WIN.
- #4 (Wed 101.19 short): Wednesday's high 101.275 > SL 101.25 by 2.5 pips — **FLAGGED: if the high printed before the TP filled, this trade stopped. The doc records WIN — the high must have printed after, or your feed's high differs.**
- #6 (Wed 101.235 short, SL 101.330, TP 100.680): the deepest TP of the week — filled Friday (the sweep to 100.598 passed through 100.680). ✓ WIN.

## 8.2 Tier B — The Exact Axis Labels (as drawn on the operator's charts)

**EU chart:** 1.14649 · 1.14578 · 1.14544 · 1.14544 · 1.14505 · 1.14442 · 1.14441 · 1.14408 · 1.14353 · 1.14325 · 1.14322 · 1.14277 · 1.14276 · 1.14250 · 1.14233 · 1.14205 · 1.14183 · 1.14150 · 1.14106 · 1.14103 · 1.14039 · 1.14012 · 1.14004 · 1.13964 · 1.13953 · 1.13950 · 1.13900 · 1.13868 · 1.13850.

**GU chart:** 1.34587 · 1.34485 · 1.34481 · 1.34360 · 1.34246 · 1.34244 · 1.34100 · 1.34075 · 1.34021 · 1.33941 · 1.33934 · 1.33882 · 1.33839 · 1.33829 · 1.33750 · 1.33629 · 1.33600 · 1.33522 · 1.33347 · 1.33331 · 1.33330 · 1.33224 · 1.33199.

**CHART LEGEND (2026-07-31 clarification):** the EU/GU screenshots are SIMPLE trade-setup drawings. Green boxes = entry→TP. Red boxes = SL zones. White box = the trading week's price action. NO zones are drawn on them. The axis labels are the golden levels.

## 8.3 Tier C — The Documented Doctrine (E/SL/TP rules)

1. **TP = the LQZ WITHIN the opposing S/D zone to the entry zone** (stated 50+ times; codebase-verified 2026-07-29): DXY source lane = computeMirrorTP over the matrix-enriched ladder; EU/GU mirror lanes = computeLmvTP — the opposing LMV rung's defendedEdge. **Earth = the internal LQZ; Fire = the opposing S/D zone that contains it.**
2. **SL = 2-3 pips INSIDE the NEXT LQZ from the entry zone**: computeSL_LMV walks to the nearest rung whose reactionExtreme lies beyond the entry; SL at rxExt ± Law-7 buffer; PROBE_GUARD lifts it past the battle group's own probe.
3. **RRR ≥ 3.5 is the executed standard; RRR ≥ 3.0 is the emission minimum** (2026-07-31).
4. **The dedup identity:** same zone+day = ONE trade (staggered entries within ~5-15 pips = legs of one trade; a lower-low reinforcement 30+ pips away = a SEPARATE trade). Reporting-layer only — never an emission suppressor.
5. **The anchor union (§8.1):** structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ} — S/D order blocks and LQZ rungs are BOTH first-class entry anchors; passive pillar levels are retired to SL/TP rungs only.
6. **The fill model:** orders activate at the setup's intended session start on the trade day and expire at the trade day's NY close (21:00Z). No multi-day zombie orders; no session-window confinement.
7. **The mirror cascade:** DXY provides DIRECTION (inverse to EU, kept to GU); the target pair provides LEVELS (structural equivalence only — mathematical conversion forbidden).

## 8.4 Tier D — The EU 8 (pixel-inferred, needs operator confirmation)

| # | Cascade | Day | Dir | E | SL | TP | RRR (est) |
|---|---------|-----|-----|---|----|----|-----------|
| EU-1 | DXY#1 Mon SS Long → | Mon | SHORT | 1.14544 | 1.14578 | 1.14103 | 12.9 |
| EU-2 | DXY#2 Mon BS Short → | Mon | LONG | 1.14004 | 1.13950 | 1.14250 | 4.6 |
| EU-3 | DXY#3 Tue SS Long → | Tue | SHORT | 1.14205 | 1.14250 | 1.13964 | 5.4 |
| EU-4 | DXY#4 Wed SS Short → | Wed | LONG | 1.13950 | 1.13900 | 1.14276 | 6.5 |
| EU-5 | DXY#5 Wed RWL Long → | Wed | SHORT | 1.14325 | 1.14353 | 1.14039 | 10.2 |
| EU-6 | DXY#6 Wed BS Short → | Wed | LONG | 1.13953 | 1.13900 | 1.14277 | 6.1 |
| EU-7 | DXY#7 Thu Ladder → | Thu | SHORT ladder | 1.14408 | 1.14441 | 1.14150 | 7.8 |
| EU-8 | DXY#8 Fri Whiplash → | Fri | SHORT | 1.14505 | 1.14544 | 1.14106 | 10.2 |

## 8.5 Tier D — The GU 7

| # | Cascade | Day | Dir | E | SL | TP | RRR (est) |
|---|---------|-----|-----|---|----|----|-----------|
| GU-1 | EU Mon SS Short → | Mon | SHORT | 1.33882 | 1.34021 | 1.33347 | 3.8 |
| GU-2 | EU Mon/Tue BS Long → | Tue | LONG | 1.33522 | 1.33331 | 1.33941 | 2.2 ⚠ |
| GU-3 | EU Tue SS Short → | Tue | SHORT | 1.33941 | 1.34021 | 1.33629 | 3.9 |
| GU-4 | EU Wed SS Long → | Wed | LONG | 1.33629 | 1.33522 | 1.33941 | 2.9 ⚠ |
| GU-5 | EU Wed RWL Short → | Wed | SHORT | 1.34075 | 1.34246 | 1.33750 | 1.9 ⚠ |
| GU-6 | EU Fri Short → | Fri | SHORT | 1.34360 | 1.34481 | 1.34021 | 2.8 ⚠ |
| GU-7 | EU Fri Short → | Fri | SHORT | 1.34481 | 1.34587 | 1.34021 | 4.3 |

**The long-side open question (2026-07-31 resolution):** ALL 23 golden trades are the target — both longs and shorts. No "unconfirmed Tier D" slop. The GU rows flagged ⚠ below RRR 3.5 are the cascade's refinement targets (proper E/SL/TP anchors on the same zones produce 3-4R).

## 8.6 The v4.5.5 Golden-8 DXY Coverage (the precision reference)

All 8 EMIT (BUILD_REPORT.md:511-536, EVIDENCE_STATE.md:32-45): #1 Δ0.4p WIN (F1-B+7), #2 Δ1.3p WIN (F1-A), #3 Δ2.4p WIN, #4 Δ1.5p LOSS (SL-timing), #5 Δ0.2p WIN, #6 Δ0.1p WIN, #8 Δ0.0p WIN; golden core 6/7 resolved wins = **85.7%**.

---

# PART 9 — THE KNOWN GAPS AT END OF ERA (2026-07-31)

## 9.1 The 3 Lost Mirror.ts Fixes (NOT re-ported into E2_CASCADE — must re-port)

1. **computeGoldenSL_V452 + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK** (v4.5.2 §5.3, mirror.ts:2417-2536 in PRISTINE) — the golden 4p-minimum SL clamp
2. **weekProbeAtAnchor** (mirror.ts:2328-2381 in PRISTINE) — the LMV candle-wick band-touch probe scan (GA DEFECT-2)
3. **classFlexibleLQZFallback + GU distribution loop** (v4.5.3, mirror.ts:1213/1324/1858 in PRISTINE) — the GU anchor-pool deadlock fix

**BUILD_STATE.md:127 falsely claims the current mirror.ts carries them — stale, now FALSE.** No document records their loss (this bible fixes that).

**Repair-loop reality (2026-07-31 code-verified):** the current `visual-setup-generator.ts` (1944L in E2_CASCADE) has **NO repair loop** — grep finds only "NO direction retry" at :486. The historical generateWithRepair references (v4.4 gen:417-530, v4.5.2 Appendix E :584-657) are OLDER REVISIONS. **The Phase-7 E/SL/TP refinement machine is NET-NEW — a build, not an extension** (see the engineering spec §7.3).

## 9.2 The computeLmvTP Sweep-Bonus Inversion (documented, UNBUILT)

Swept rung = liquidity TAKEN → demote −30, not promote +50. Current mirror.ts:1554 still uses +50. The GU TP lands one rung too shallow → RRR 1.30 → RRR_DISCARDED → GU lane dead.

## 9.3 LMV Resolution Limits (the golden-rung collision)

The 2p/4p/3p rung constants vs the golden 3.0p pair (100.945/100.975) and 0.5p pair (101.235/101.240). Emitted rungs: 100.849 (Δ0.4p ✓), 100.949 (Δ0.4p ✓), 101.000, 101.054, 101.130 (Δ1.0p vs 101.14 ✓), 101.253 — 100.975/101.19/101.235/101.240 have NO dedicated emitted rung. **The 2026-07-31 ruling: two distinct rungs for 101.235/101.240; resolution via modal-cluster emission + 30m/15m telescoped LMV runs + 1-pip LQZ dedup.**

## 9.4 Telescoping Completely Absent in Live E1

The live pipeline uses 4H/1H only (emergent lane 4H S/D + 1H LQZ; MDVE lane 4H+1H+30m OBs with zero cross-TF logic); 30m BoM possible today (doctrine violation — bom-mom.ts TF-agnostic); 15m bars harvested but unused; the only telescoping implementation is dead legacy code. **This is the #1 root cause of all macro derailments.**

## 9.5 Matrix LQZ Not in model.zones

The LQZ matrix rungs are NOT exposed in model.zones — the E2 cascade's bestGroup filter selects non-VIOLATED zones at wrong levels over golden VIOLATED zones (group −3). The bridge (matrixLadderRungs → model.zones adapter) must be built.

## 9.6 The Working-Tree Problem (src/ is stale)

The root `src/` is a stale pre-MDVE lineage (~v4.0/4.1 era): no mdve/, no engines/, no tvi/, no vei/; engine.ts 1422L vs 2246L; config points at plutus-engine/dist/index.js vs the checkpoints' plutus-agent/dist/index.js. **2026-07-31 ruling: src/ IS the working tree. Checkpoints are static reload anchors. Phase 0 restores src/ from v4.5.2_E2_CASCADE, then all work happens in src/ with per-phase checkpoint saves.**

## 9.7 Stale E2_CASCADE MANIFEST

The checkpoint's MANIFEST.md is the v4.4 manifest (SHA 0dedd262, "LOCKED IMMUTABLE 2026-07-28") — NOT the v4.5.2 E2-cascade manifest. Must be replaced or deleted.

## 9.8 Hive Is Cold for Plutus

2026-07-31 queries for plutus/MDVE/LMV/telescoping/E2-cascade returned ZERO hits. **The bible + spec + all new knowledge must be stored to hive t3 domain=plutus as it is produced.**

---

# PART 10 — THE 2026-07-31 OVERHAUL DIRECTIVES (THE COMPLETE PICTURE)

## 10.1 The Order of Operations (operator-mandated)

1. **Write this Bible 4.5** (3000+ lines, supplementary to Bible 4.0 — done)
2. **Write the shark-CME engineering spec** for the v4.5.2 overhaul covering phases 2-8 (explore-agent material extracted — see the spec doc)
3. **Phase 0:** Restore src/ from v4.5.2_E2_CASCADE; verify tsc 0 + bun build + determinism sha256 ×2
4. **Phase 1:** Canonize the doctrine docs (this bible IS the primary; plus the RRR-3.0 doctrine, the LMV-OBCV-TELESCOPING doctrine, the E2 forward-map doctrine, the pipeline-order spec, the lost-fix inventory)
5. **Phase 2:** E1 telescoping modules T1-T6 (LQZ TF parameterization → 4H/1H nesting → 1H/30m nesting → 30m MoM-only + E2 delivery → LQZ 1H→30m→15m → snapshot merge). **Gate: the 7 golden DXY levels present in the map, computed from data.**
6. **Phase 3:** LMV resolution upgrade (modal-cluster emission, 1-pip LQZ dedup, matrix→model.zones bridge, sweep-bonus inversion −30, re-port the 3 lost fixes). **Gate: 7/7 golden DXY LQZs at ≤1 pip.**
7. **Phase 4:** OBCV machine (4 sub-engines). **Gate: golden reconstruction from data + 96%+ vs the drawn map.**
8. **Phase 5:** E2 forward map (ENTRY rungs, DayBand London-open projection, Friday spot Monday-only, keyZoneId authoritative, computeLmvTP shape-day target)
9. **Phase 6:** Interleaved pipeline order (DXY full → EU interleave → GU interleave, zone-anchored, emergent on top)
10. **Phase 7:** RRR ≥ 3.0 minimum + the E/SL/TP refinement machine (3 attempts, entry micro-refinement on defendedEdge, SL Law-7 bidirectional walk, TP Law-14 walk, 🔧 REPAIRED annotations)
11. **Phase 8:** Verification (diag-golden-coverage at 3 pips only; diag-lmv-golden; diag-obcv-golden; determinism; container test + visual eval; per-phase checkpoint saves)

## 10.2 The 8 Immutable Operating Constraints (2026-07-31 — wired into the build)

1. **Precision is the ONLY metric** — 3-pip count; never report a looser tolerance
2. **Never lower standards to inflate metrics** — RRR ≥ 3.0 minimum, 4+ norm
3. **Fix the map, not the ranking** — levels must EXIST first (telescoping → LMV → OBCV in that order)
4. **E2 designates the zone, E3 obeys** — keyZoneId authoritative
5. **LQZ runs 1H→30m→15m; BoM 4H/1H only; 30m MoM only** — the telescoping law
6. **No repeat of the 18 documented derailments** (8 Bible 4.0 + 10 session) — doctrine quoted, never synthesized
7. **DXY provides direction, the pair provides levels** — zone-anchored, never price-anchored; Friday spot is Monday-E2-only
8. **Don't stop; don't fake coverage; verify mechanically** — prose is not evidence

## 10.3 The Two Biggest Levers (2026-07-31 session)

**LMV** (Liquidity Matrix Vision — LQZs from candle-matrices) and **OBCV** (Order Block Candle Vision — OBs from impulse-origin detection). Once both are 96%+ accurate, 90% of the work in charting zones is done from the start — the exact candles/price anchors for nearly all zones are already computed. The golden-LQZ oracle (7/7 DXY at ≤1 pip) is the definitive test of LMV. The golden-OB reconstruction is the definitive test of OBCV.

## 10.4 The 3 Golden Trade Semantics That Must Survive Every Build

1. Golden entries are at LQZ rungs 3-10 pips apart (100.945/100.975 = 3.0p; 101.235/101.240 = 0.5p) — the machine MUST resolve 0.5-pip spacing for the golden map
2. Golden SLs are 4-9.5 pips — SL = next rung's reactionExtreme + Law-7 buffer, never a fixed pip constant
3. Golden TPs are the opposing rung's defendedEdge inside an S/D zone — Earth+Fire, Law-14 walk with simulated mitigation

---

*END OF PART 7-10 — continued in the next file segment.*
# PART 11 — THE E2 CASCADE + E3 INTEGRATION SPEC (v4.5.2, operator-APPROVED)

## 11.1 The Problem (why the cascade exists)

v4.5.1's pipeline fired E2 (ShapeBrain) per-pair independently. Each pair got its OWN shape prediction from its OWN bars. But the operator's architecture requires E2 to CASCADE:

```
E2 fires on DXY → cascades INVERSE to EU → cascades KEPT to GU
E3 cascades AFTER E2, benefiting from pre-existing E2 maps on cascade pairs
```

Without the E2 cascade, the E3 mirror cascade (cascadeV45 → selectPairNativeZone) operates BLIND — it has no knowledge of which zone price will visit on which day. It picks zones by heuristics (strength ranking, formation time) instead of by the shape chain's day-by-day projection. **Result: DXY works (E3 reads E2 directly for DXY's own setups). EU/GU are broken (the cascade has no E2 data to guide zone selection).**

## 11.2 The Architecture (operator's design, SPEC §2)

```
E1 (PARALLEL per pair)          Each pair gets its OWN zone map from its OWN bars
    ↓
E2 DXY (shape chain)             DXY shape prediction: SS→BS→R→WL, day decomposition
    ↓ cascade INVERSE
E2 EU (shape chain from DXY)     EU follows DXY's shape sequence, INVERTED direction
    ↓ cascade KEPT
E2 GU (shape chain from EU)      GU follows EU's shape sequence, KEPT direction
    ↓
E3 DXY (source setups)           DXY setups from DXY E1 + DXY E2
    ↓ cascade INVERSE
E3 EU (mirror setups)            EU mirrors from EU E1 + EU E2 (the day-map guides zone selection)
    ↓ cascade KEPT
E3 GU (mirror setups)            GU mirrors from GU E1 + GU E2
```

**Key principle (SPEC §2, verbatim):**
- **E2 provides SHAPE + DIRECTION + TIMING** — what shape each day, which direction, which session
- **E1 provides ZONES** — the pair's own structural zones (supply/demand/LQZ)
- **E3 uses E2's day-map to select the EXACT zone** from E1's zone inventory — the zone the shape chain says price will visit that day

## 11.3 The Data Structures (SPEC §3)

```typescript
interface ShapePredictionSnapshot {
  currentShape: ShapeCode;           // SS, BS, WL, RWL, R, etc.
  chain: ShapePredictionDay[];       // 5 days, Mon-Fri
  dayDecomposition: DayShapeEntry[]; // per-day: shape, direction, key zone
  storylineBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  consolidationPhase: boolean;
}

interface ShapePredictionDay {
  day: string;                       // 'Mon', 'Tue', etc.
  shape: ShapeCode;                  // predicted shape for this day
  direction?: 'LONG' | 'SHORT';      // predicted direction
  keyZoneId?: string;                // the zone price interacts with
  floor?: number;                    // projected day floor
  ceiling?: number;                  // projected day ceiling
  session?: string;                  // predicted session window
  confidence?: number;               // 0-1
}
```

## 11.4 The E2→E3 Integration (SPEC §4)

**4.1 Shape-augmented ChartModel:** add `shapeChain?: ShapePredictionSnapshot` to ChartModel so E3 can consume it.

**4.2 selectPairNativeZone consumes E2** (the NEW param `shapeDayMap`):
1. If `shapeDayMap.keyZoneId` is set → select that EXACT zone (the E2-designated zone) — **AUTHORITATIVE, per the 2026-07-31 ruling**
2. If no exact match → filter candidates to zones of the correct class + side that are ACTIVE near the shape day's projected range [floor, ceiling]
3. Rank by proximity to the shape day's key zone price, then by strength

**"This replaces ALL heuristics (spot gate, formation-time ranking, etc.) with the E2 shape chain's forward projection."** (SPEC §4.2)

**4.3 computeLmvTP consumes E2:** when `shapeDayMap` is provided:
1. The TP target = the shape day's projected opposing zone
2. If the projected opposing zone has a defendedEdge → TP = that defendedEdge
3. Fallback: the existing nearest-first walk (unchanged)

**4.4 The cascade receives E2 data:** `cascadeV45(dxySetups, models, ctx?, shapeChains?)` — the cascade passes the relevant shape day-map to reAnchorMirror for each source setup based on the setup's day:
```typescript
const dayIdx = setup.battleMs ? dayIndex(setup.battleMs) : 0;
const euShapeDay = shapeChains?.eu.chain[dayIdx];
```

## 11.5 The Implementation Modules (SPEC §5)

- **Module 1:** `src/mdve/shape-cascade.ts` (NEW, ~200 lines) — cascadeShapeChain(dxyChain, dxyModel, euModel, guModel) → { eu, gu }. For each day: copy shape, invert direction for EU, keep for GU, find the target pair's strongest zone of the matching class+role+side.
- **Module 2:** Wire E2 into report-v452.ts (~50 lines) — after buildChartModel for all 3 pairs: ShapeBrain for DXY → cascadeShapeChain → attach chains to each ChartModel → pass to cascadeV45.
- **Module 3:** Modify selectPairNativeZone (~40 lines) — add shapeDayMap param; E2-designated zone selection.
- **Module 4:** Modify computeLmvTP (~20 lines) — add shapeDayMap param.
- **Module 5:** Modify cascadeV45 (~30 lines) — accept shapeChains, pass shapeDay through.
- **Module 6:** Port tangible improvements (trade-dedup.ts, accurate-stats.ts, report-v452.ts, types.ts battleMs, setup-gen.ts F1-A/F1-B/dual-entry, mdve-stage.ts floorSetupsToDedupRows/dayOpenPriceProvider, mirror.ts mirrorToDedupSetupV452).

## 11.6 The SPEC Invariants (SPEC §6)

1. **Frozen files untouched** — lmv.ts, sl-lmv.ts, engine.ts, lqz-matrix.ts, visual-setup-generator.ts, and all frozen harness scripts remain byte-identical. **REVISED 2026-07-31: lmv.ts + lqz-matrix.ts are now MUTABLE PROTOTYPES (working prototypes until the golden-LQZ oracle passes).**
2. **v4.4 geometry preserved** — all v45-specific changes behind `geometry === 'v45'`.
3. **Determinism** — same fixture → byte-identical report. No wall-clock.
4. **E1 parallel** — each pair's zone map is built from its own bars, independently.
5. **E2 cascade order** — DXY first, then EU (inverted), then GU (kept). Never the reverse.
6. **E3 reads E2** — the cascade's zone selection and TP targeting use the E2 shape day-map. No spot-price evaluation. No heuristic ranking.
7. **The 23 golden trades** — the acceptance oracle. Every trade at ±3 pips of the golden levels with RRR ≥ 3.5. **(REVISED 2026-07-31: RRR ≥ 3.0 is the emission minimum; ≥ 3.5 the executed standard.)**

## 11.7 The SPEC Acceptance Criteria (SPEC §7)

1. E2 fires — ShapeBrain computes DXY shape chain after E1
2. E2 cascades — DXY chain → EU (inverted) → GU (kept)
3. E3 uses E2 — selectPairNativeZone selects the E2-designated zone
4. EU produces 8 trades — matching the golden-8 at ±3 pips
5. GU produces 7 trades — matching the golden-7 at ±3 pips
6. All RRR ≥ 3.5 — the operator's standard
7. Determinism — byte-identical report across runs
8. Container test — fresh agent runs the pipeline, forecast vs reality visual eval shows the 23 golden trades overlaid

---

# PART 12 — THE E1 TELESCOPING PROCEDURE (2026-07-31 — THE FOUNDATION)

## 12.1 The Doctrine (operator verbatim, 2026-07-31)

> "S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"
> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"
> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"
> "All of these are telescoping refinment procedures."

## 12.2 The Current State (forensic, 2026-07-31) — TELESCOPING COMPLETELY ABSENT IN LIVE E1

| Lane | Timeframes | Cross-TF logic | Status |
|------|-----------|---------------|--------|
| Live emergent (engine.ts) | 4H S/D + 1H LQZ only | NONE | `timeframe: '4H'` hardcoded at engine.ts:465; `ohlc[pair]` = 4H only at :223 |
| MDVE (ob-engine.ts) | 4H + 1H + 30m OBs | NONE — independent constructions concatenated + sorted (:348-354) | MDVE_TIMEFRAMES = ['4H','1H','30m'] (:45) |
| Legacy (plutus-tte-pipeline.ts) | 4H/1H/30m/15m + nesting + refinedLabel (:3021-3179) | YES — the ONLY telescoping code | **DEAD — not in the live tool registry** |

**Key facts:**
- `4h-sd-lobe.ts:64-69` HAS TF-scaled params for all 4 TFs (4H maxBars 60/width 40/dist 150; 1H 120/25/150; 30m 200/15/150; 15m 300/10/150) but only '4H' is ever passed in the live lane
- LQZ detector is structurally 1H-calibrated (lqz-lobe.ts:264-269 has NO timeframe param; 24-bar sweep lookback, 5-pip wick minimums)
- 30m/15m bars are harvested (engine.ts:277-280) but 15m is used by NOBODY; 30m only by the MDVE ladder/OB engine
- `bom-mom.ts:106` classifyBoMMoM is TF-agnostic — **a 30m OB can be classified BoM today (doctrine violation)**
- `ZoneModel` (mdve/types.ts:131-142) has `timeframe` but NO `refinedLabel`/`nestedWithin` fields; `DXYZone.refinedLabel` EXISTS at types.ts:206 and renderers honor it (report-generator.ts:537)
- `mergeLqzWithIpZones` IS called at engine.ts:480 (live emergent) but NOT in the MDVE lane
- report-v452.ts feeds 1H + 4H + 30m (NO 15m) via buildChartModel

## 12.3 The 6 Wiring Modules (T1-T6, exact insertion points)

**T1 — LQZ TF parameterization:** `lqz-lobe.ts:264-269` — add `timeframe` param; TF-scaled thresholds:
- SWEEP_LEVEL_LOOKBACK_BARS: 1H 24 / 30m 20 / 15m 30 (scaling anchor: SINGULAR_CANDLE.BARS_PER_DAY {'4H':6,'1H':24,'30m':48,'15m':96} at trading-constants.ts:918-923)
- SWEEP_MIN_BEYOND_PIPS: 1H 2 / 30m 1.5 / 15m 1
- LONG_WICK_MIN_PIPS: 1H 5 / 30m 3 / 15m 2
- SHARP_MOVE_MIN_PIPS: 1H 15 / 30m 10 / 15m 6
- LQZ_ALIGN_TOLERANCE_PIPS: 1H 3 / 30m 2 / 15m 1

**T2 — 4H S/D → 1H refinement:** `ob-engine.ts:348` (nesting pass before sort) + `engine.ts:479-481` (emergent lane). For each 1H zone: test containment `[z.bottom, z.top] ⊆ [htf.bottom, htf.top]` against same-type 4H zones; when nested: tag refinement field, add confluence (dual-TF +3, triple-TF +5), refine the 4H zone's active edge toward the 1H edge. Add `refinedLabel?: string` + `nestedWithin?: string` to ZoneModel.

**T3 — 1H OB → 30m minor refinement:** `ob-engine.ts:346` — 30m zones entirely within a 1H zone (same type) refine the 1H zone's minor edge; tag "30m Refined 1H".

**T4 — 30m MoM-only + E2 delivery:**
- `bom-mom.ts:79-106` — add `timeframe` to BoMMoMInput; return 'MoM' when tf === '30m' (or '15m')
- `ob-engine.ts:339-344` — force `classification: 'MoM'` for all 30m zones
- `4h-sd-lobe.ts:147-149` — gate `isBoM = tf !== '30m' && tf !== '15m' && classifyOrderBlock(...)` (protects ANY future 30m/15m construct4HZones call)
- `shape-brain.ts:608` — deliver 30m MoM zones to E2 as SS/R reaction points (currently E2 never sees them)

**T5 — LQZ 1H→30m→15m:** `engine.ts:472-480` — add `detectLiquidityZones(pair, bars30m)` + `(pair, bars15m)` calls (bars available at :277-280); nested-refinement merge before/within mergeLqzWithIpZones. `mdve/index.ts:161-178` — thread 30m/15m bars into buildLqzMatrix/buildLmvTable for matrix refinement tiers.

**T6 — Zone map snapshot merge:** `engine.ts:517-524` — upgrade the emergent ZoneMapSnapshot to include the telescoped result; after `ctx.chartModelsByPair` is built (:546), run the T2/T3/T5 refinements on ChartModel.zones and merge the telescoped MDVE zones into zonesByPair/snapshot (report-v452 consumes ChartModel.zones at :103-105, so telescoping there propagates to source setups + cascade automatically).

## 12.4 The BoM/MoM Origin-TF Gate (the doctrine made mechanical)

| TF | BoM origin? | MoM? | Role |
|----|------------|------|------|
| 4H | ✅ YES | ✅ YES | Strategic S/D, HTF swings |
| 1H | ✅ YES | ✅ YES | Tactical S/D, entry zones |
| 30m | ❌ NEVER | ✅ YES | MoM reaction points for SS/R shapes; minor refinement of 1H origins ONLY |
| 15m | ❌ NEVER | (LQZ-only lane) | LQZ refinement of 30m levels |

## 12.5 The Acceptance Gate (Phase 2)

The 7 golden DXY levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) must appear in the zone map, **computed from the week's own data** — no hardcoding, no fixture injection. Plus EU/GU golden levels present. The definitive test of E1.

---

# PART 13 — THE VISUAL TELESCOPE LQZ MECHANICS (the exact pattern criteria)

## 13.1 The 6 Pattern Families (VISUAL_TELESCOPE_CHARTING_T2.md — exact criteria)

**1. SWEEP (LQZ Pattern 1, detectSweepLqz §3.5/§6.3):**
- `minWickRatio = 0.55` (maxWick/range ≥ 0.55 — "a wick exceeding 55% of candle range is unambiguous evidence of a liquidity grab; below 0.50 indistinguishable from normal price action")
- sweepLookback: 4H=8, 1H=12, 30m=20, 15m=30 bars
- `sweptHigh` (candle.high > priorHigh) → LQZ_SUPPLY; `sweptLow` → LQZ_DEMAND
- Zone geometry: **bodyEdge→wickEdge** — bodyEdge = body top (supply) / body bottom (demand); wickEdge = candle high (supply) / low (demand)
- §6.3 variant: bodyToRange < 1 − 0.55 (=0.45); sweepUp when upperWick > lowerWick × 1.8
- **`clusterTolerancePips = 3` exists specifically because "100.945 and 100.975 are 3 pips apart and must remain distinct" — at 5 pips two LQZ levels collapse into one false mega-zone** (minClusterSize 2)

**2. WICK_CLUSTER (LQZ Pattern 2):**
- 2+ long-wick candles whose wick tips overlap; long-wick = longestWickRatio ≥ 0.55
- Cluster membership: gap between candle indices ≤ 3 bars AND wick tips within 3 pips
- `minClusterSize` = 2 (4H/1H/30m), **3 for 15m** ("15m noise ~2× higher; 3 filters single-candle noise")
- bodyEdge = min of body tops (supply) / max of body bottoms (demand); wickEdge = max wick tips (supply) / min wick tips (demand)

**3. CONSOLIDATION (LQZ Pattern 3):**
- Sliding window of ≥ `consolidationMinBars` (4H=6, 1H=8, 30m=10, 15m=14) whose (max high − min low) ≤ `consolidationRangePips` (4H=30, 1H=18, 30m=11, 15m=7)
- Extend forward while bounded; direction = breakout bar body
- §6.3 variant: minBars=5, maxRange = TF maxPips, "consolidations are bidirectional; tag mid" (DEMAND)

**4. BODY EDGES (reaction-point magnets, detectWickLqz §6.3):**
- "when price returns to a candle's body edge and bounces ≥ 2 times, that body edge is a liquidity magnet"
- Reference candle's body edges (upper = max(open,close), lower = min(open,close)); any bar within 2 pips (`2*pip`) of the edge within a 30-bar forward window increments the reaction map
- `reactionMinTouches = 2` (one touch is the original sweep; the second confirms); zone width = 4 pips
- Freshness: count ≥ 4 → SOFTLY_MITIGATED else UNMITIGATED

**5. ORDER BLOCKS (S/D zones, LAW 26):**
- "S/D zones come from ONE order-block candle immediately preceding a breakout" (singular origin candle — the prior consolidation-cluster logic was REMOVED per LAW 6)
- Breakout candle: body ≥ **1.5× ATR(14)** (§4.2.2; §6.2 raises to BREAKOUT_ATR_MULT = 1.8 with BREAKOUT_LOOKBACK = 3 candles of forward confirmation, both closes beyond breakout open). At 1.5 the false-positive rate is 31%, at 2.2 it misses 24% of valid breakouts.
- **Zone range = origin candle's FULL high–low, not just body** ("the origin candle's wicks represent liquidity already absorbed at those prices")
- BoM vs MoM: BoM = first impulse (priorMove NONE or opposite); MoM = continuation (overlaps a prior zone)
- Width filters: 4H 15–40 pips (maxBars 60), 1H 8–25 (120), 30m 5–15 (200), 15m 3–10 (300)

**6. REACTION POINTS (freshness model):**
- `countReactions` = subsequent bars where `bar.low ≤ zone.ceiling && bar.high ≥ zone.floor`, counted **per-TF only** (LAW 3)
- Freshness tiers with empirical win rates: **0 reactions → UNMITIGATED (~80% win), 1 → SOFTLY_MITIGATED (~65%), 2–3 → MITIGATED (~45%), 4+ → HEAVILY_MITIGATED (<30%, ineligible for new entries)**

## 13.2 The Engine Separation (the hard syntactic rule)

`ZoneMapSnapshot` carries:
- `ipZones` (Pipeline A — institutional pressure, feeds **Engine 2 only**, "NEVER used for entry/SL/TP selection")
- `sdZones`/`lqzZones` (Pipeline B — candlestick-derived, "feed Engine 3 only", used for entry/SL/TP selection)

`VisualZoneOverlay` (§4.3.1): `supersededZones` (VLM zones mapped onto Engine 1 IDs, SUPERSEDING when tighter) + `newVisualZones` (VLM zones with NO Engine 1 counterpart, promoted to first-class `1H LQZ (Visual)` zones, reactionCount 1, UNMITIGATED, confluence = round(vlmConfidence × 5)).

**No silent fallback:** when visual generation returns 0, the pipeline MUST log `VISUAL_GENERATOR_RETURNED_ZERO` and return empty — `FALLBACK_TO_CONSTRUCT_BASIC_FORBIDDEN` is a fatal, non-recoverable error (§5.4 THE CRITICAL RULE).

## 13.3 The VLM Contract (Engine 3's eyes)

- VLM_TEMPERATURE = **0.0** ("perception task, not creative — 0% drift across reruns at 0.0; ±1.5 pip zone drift at 0.3, which would break entry/SL determinism")
- VLM_MAX_TOKENS 4000, MAX_RETRIES 2, backoff 800ms, rate limit 30 req/min / burst 5 / 2000ms cooldown
- Model pinned: `opencode-zen/mimo-v2.5-free` (fallback `opencode-go/mimo-v2.5`)
- Strict JSON: `{supply, demand, liquidity}` with floor/ceiling/timeframe/classification (BOM|MOM|LQZ)/mitigationState
- 1H chart by default, SPA render wait 12s (canvas paints at 9-11s), scroll-back wait 1500ms

## 13.4 The Sniper Math (Engine 3 entry/SL/TP — the LAW 2-4 mechanics)

- **ENTRY:** `ENTRY_OFFSET_PIPS = 1.5` (median observed 1.6 pips inside the edge, mode 1.2) + `SPREAD_BUFFER_PIPS = 0.5`. LONG enters at zone CEILING (price falls into demand from above), SHORT at zone FLOOR (74% at edge, 26% inside).
- **SL:** OPPOSITE zone edge + adaptive buffer by TF (15m→2, 30m→3, 1H→4, 4H→5 pips). SL distance distribution: 3-6 pips 18% (15m scalps), 8-15 pips 29%, 17-30 pips 37% (1H/4H), 34-55 pips 16% (4H liquidity); bounds [3, 55]; per-pair caps DXY 55 / EUR/USD 45 / GBP/USD 60 / AUD/USD 50. **Never the old fixed 8-15 pip SNIPER_BUFFER (2-3× too wide).**
- **TP:** on the ENTRY side, at the FAR edge of the nearest opposing zone ("price usually penetrates the near edge but stalls at the far edge"), pulled 2 pips pre-edge (`TARGET_ZONE_OFFSET_PIPS = 2`) to defeat slip; min TP distance 15 pips; tiered exits [1:1, 2:1, 3:1].
- **RRR floor 3.0** (break-even at cohort win-rate 0.65 is RRR ~0.54; below 3.0 "win rate collapses").
- **Tolerances:** DXY 1 pip (pip=0.01, "1 unit = 1.0 DXY cent = 1 pip"), FX 2 pips.

## 13.5 Session Mechanics (from the telescope + Bible 4.0)

| Session | Time (ET) | Liquidity | Primary Use | Win Rate |
|---------|-----------|-----------|-------------|----------|
| London Open | 02:00-05:00 | ~$800B/hr | Consolidation scalps | 22/38 (58%) |
| London/NY Overlap | 08:00-10:00 | ~$1,200B/hr (peak) | HTF Swing (BS) entries | 15/38 (39%) |
| NY Mid | 10:00-14:00 | High | HTF Swing TPs hit | 18/38 (47%) |
| NY Open | 08:30-10:00 | High | Reinforcement triggers | 8/38 (21%) |
| Asian | 00:00-02:00 | ~$200B/hr | RARE — only at high-liquidity zones | 3/38 (8%) |

Per-day default: **Mon/Wed/Fri → LONDON; Tue/Thu → LONDON_NY_OVERLAP** (T2 spec §5).

**The session filter is CONDITIONAL on liquidity score (Bug #3 fix):** liquidityScore ≥ 7 → allow any session; ≥ 5 → London/NY only; < 5 → reject ("no wood for the fire").

---

# PART 14 — THE 6 MACRO SHAPES — COMPLETE CANDLE ANATOMY (TTE_MACRO_SHAPES, verbatim)

## 14.1 The Master Table

| Shape | Candles | Body (bf) | Total Range | Wicks | Color | Energy |
|-------|---------|-----------|-------------|-------|-------|--------|
| **SS** | 8–30+ | TINY 0.10–0.30 | SMALL 0.2–0.5x | MODERATE 0.3–0.5 | MIXED alternating | Accumulating (coil) |
| **BS** | 4–8+ (10–12 ext) | LARGE 0.65–0.95 thrust; 0.2–0.4 retrace | LARGE 3–5x | MINIMAL <0.2 thrust | MIXED, dominant clear | Piercing (sustained) |
| **R** | 6–24 (often longest) | MEDIUM 0.40–0.60 | MODERATE 0.8–2.0x | MODERATE | MIXED | Correcting (breathing) |
| **WL** | 3 (1–2 clearest) | MOD-HIGH 0.5–0.7 momentum; 0.3–0.5 grab | LARGE 2–4x | LONG ~1x body on grabs | ALL same color | Grabbing (lash then die) |
| **RWL** | 6+ (14–15 ext) | MODERATE 0.3–0.5 | MOD-LARGE 1.5–3x | MODERATE ~0.3–0.5 | MIXED, reverse dominant | Choppy reversal |
| **WLS** | 14–15+ | MODERATE 0.3–0.5 | MODERATE 1.0–2.0x | MODERATE | MIXED | Extended choppy oscillation |

## 14.2 The 5 KEY Distinguishing Features

1. **BS vs WL:** BS has NO long wicks on thrust candles. WL has LONG wicks on grab candles (~1x body). BS is SUSTAINED (4-8+ building); WL is ISOLATED (3 candles: grab→momentum→grab).
2. **BS vs RWL:** BS retracements SMALL (<30% of thrust range). RWL retracements MODERATE (30-60%).
3. **WL vs RWL:** WL ALL same color (unidirectional). RWL MIXED colors (predominantly one direction).
4. **BS vs R:** BS has LARGE bodies + sustained momentum. R has MEDIUM bodies + V-shaped correction.
5. **WL vs SS:** WL has LARGE total range + long wicks. SS has SMALL total range + moderate wicks.

## 14.3 The Master Sequence + 5 Variations

**Master:** `SS → (marubozu breakout, 3-5x SS body, bf >0.65, minimal wicks) → BS → (exhaustion pin bar) → R → (long-wick grab at recovery extreme) → WL → (immediate) → SS`

**Variations:**
1. `SS → BS → R → WL` (Master Pattern — most common)
2. `SS → BS → RWL → SS` ("failed breakout")
3. `BS → R → BS` (Double Surge — continuation)
4. `WL → RWL → SS`
5. `BS → WLS → SS` (chaotic)

## 14.4 The 8 Transition Triggers (morphological, verbatim)

| Transition | Trigger |
|-----------|---------|
| SS→BS | Large MARUBOZU breakout candle breaking + closing beyond the SS high/low; 3-5x SS body size; MINIMAL wicks |
| BS→R | Exhaustion pin bar — long wick, small body at extreme |
| BS→RWL | Shooting star or bearish engulfing at top of BS |
| R→WL | Long wick candle at the extreme of the recovery (the liquidity grab) |
| R→SS | Return to consolidation if the recovery stalls |
| WL→SS | IMMEDIATE — next candles are small consolidation candles; momentum exhausted after the lash |
| RWL→SS | After violent whipsaw, price consolidates back into SS |
| RWL→BS | Sometimes RWL leads to a new breakout surge in the OPPOSITE direction |

## 14.5 Zone-Shape Expectation (the E2 reaction logic, TTE_SHAPE_ZONE_MECHANICS)

| Situation | Expected shape |
|-----------|---------------|
| Inside BoM supply, unmitigated | **RWL** (sharp bearish reversal) |
| BoM supply, mitigated | **R** (soft bearish recovery) |
| BoM demand, unmitigated | **WL** |
| BoM demand, mitigated | **R** |
| Inside MoM | **BS continuation (pierce)** — MoM zones are IGNORED for BS/WL targets, pierced and broken; only anchor points for SS |
| Between S&D both nearby | **SS** |
| Moving toward BoM (dist decreasing) | **BS/WL continuation** |
| Far from all zones (dist > 5) | **Trend continuation** (BS or R) |

**The BS/WL target rule (verbatim):** "BS/WL always move to BoM zones, NOT MoM zones. MoM zones are IGNORED for BS/WL targets — they get pierced and broken. MoM zones are only anchor points for SS, then they get pierced by BS/WL."

## 14.6 The Mitigation Lifecycle (L344-362)

- Zones map to the H and L of the origin candle. Later candles whose H/L move into this value range = mitigation. **Demand zones: the L of other candles mitigates. Supply zones: the H of other candles mitigates.**
- 0 reactions: UNMITIGATED — strong, never touched
- 1 reaction: SOFTLY_MITIGATED — still strong, 1 touch
- 2–3 reactions: MITIGATED — weakening
- 4+ reactions: HEAVILY_MITIGATED — weak, likely to pierce on next touch
- **FORTRESS ZONE: 4+ holds with strong reactions still → 95% direction flip, <10% frequency**
- Expected reaction by count: 0–1 → strong hold, expect RWL; 2 → weakening, weak reaction, expect R; 3–4 → weak, high likelihood of pierce
- **The reaction counter tracks BATTLES, not bars (Bible 4.14): one retest event = price enters, reacts, leaves. A 2-day retest is ONE event. Consolidation dwell is NOT a retest — the zone is occupied, not attacked.**

---

# PART 15 — MPSE: THE MATHEMATICAL PSEUDOCODE DISCIPLINE (from the MPSE library)

## 15.1 What MPSE Is

MPSE (Mathematical Pseudocode Powered Software Engineering) is a spec-discipline framework. Its thesis: **natural-language specs are lossy; math is lossless.** The Losslessness Theorem (KB-MPSE-01 §1): a natural-language spec maps to many admissible programs (`|I(S_nl)| > 1`, Shannon entropy ~3.8 bits), while a well-typed, total mathematical spec maps to exactly one (`|I(S_math)| = 1`, entropy 0). The canonical oracle: `f(T) = N·(1+P) = 24` — the agent cannot produce 13 or 40 without being rejected at the firewall.

**The pipeline:** `idea → mathematical pseudocode → spec → code → test`, where the math stage is the ONLY stage permitted to reject input.

## 15.2 The 20 Mathematical Structures (with Plutus examples)

1. Algebraic composition: `setups ∘ charts ∘ shapes ∘ zones ∘ harvest`
2. Set theory: `Allowed = U ∩ P ∩ T`
3. Inequalities/constraint systems: `5 ≤ sl ≤ 15`
4. Piecewise functions (the shape classifier; exhaustiveness invariant `∀window: ∃ exactly one piece`)
5. Linear combinations: `S = Σ wᵢxᵢ` (confidence scoring with written-down weights)
6. Recurrence relations: `aₙ₊₁ = f(aₙ, zfp)` (shape chain, `|chain| ≤ 5`, termination `cumulative_conf < 25% → STOP`)
7. Boolean algebra (CS2-CS11 zero-tolerance rules, gate transitions)
8. Probability/expected value: `EV = P(TP)×gain − P(SL)×loss`, tiers A/F at P(TP) 0.70/0.55/0.45
9. **Matrix operations** (pair × day shape matrix; completeness invariant "every cell must exist"; inverse-direction invariant) — **THE LMV FOUNDATION**
10. Invariants (I₁-I₇, checked after every operation, violation → ABORT)
11. Graphs/DAGs (DXY dependency, topological order)
12. Series (combined RRR `Σ RRRᵢ×sizeᵢ ≥ 5.0`)
13. Domain/range (`domain(confidence) = [0,100] ∩ ℤ`)
14. Monotonicity (zone ordering, `confluence↑ → confidence↑`)
15. Equivalence relations (dedup `s₁ ~ s₂ ⟺ pair∧dir∧category`, reflexive/symmetric/transitive)
16. Partial orders (`GOD_TIER ≻ HIGH ≻ STANDARD ≻ CONDITIONAL ≻ REJECTED`)
17. Vector spaces/distance (`d = |entry−spot|/pip`, SS/DWL tighten 0.60×)
18. Optimization (loss functions)
19. **Combinatorics** (`f(T) = N(1+P)` — count firewalls catch ~70% of derailments)
20. Logical implication (`BS ∧ ZFP<20% → RWL`, contrapositives)

## 15.3 The 9 Derailment Modes (KB-MPSE-02)

D1 misinterpretation (28 readings of "mirror DXY" proven) → pin to one expression; D2 overgeneration → `|O| ≤ |X|`; D3 undergeneration → `|O| ≥ |X|`; D4 scope creep → `O ⊆ Authorized`; D5 hallucinated constraints → `source(c) ∈ Spec`; D6 dropped constraints → `C_spec \ C_used = ∅`; D7 type confusion → branded refinement types; D8 boundary → piecewise covering the whole input space; D9 ordering → topological sort.

## 15.4 The LMV MPSE Structure Map (v4.5 spec Appendix C)

- **LmvTable as total function** `LMV: OHLC → LmvTable` (Losslessness)
- **Partitions/equivalence classes** `c₁ ~ c₂ ⟺ |price(c₁)−price(c₂)| ≤ ε` (proven refl/sym/trans)
- **Matrix ops with completeness** (every 0.25×ATR bucket exists)
- **Vector distance** `|p₁−p₂| ≤ ε·pip` ATR-scaled
- **Piecewise-total touch-kind classifier** (SWEEP/WICK_REJECT/BODY_DEFEND/CONSOL_DWELL/PASS_THROUGH — exhaustive)
- **Freshness recurrence** (0x → 1x → 2x → 3x+)
- **reactionExtreme/defendedEdge as column reductions** (the linear algebra)

## 15.5 The MathContract Doctrine Objects (MDVE Appendix B)

`zone-integrity`, `reaction-validity`, `no-fabrication` — every doctrine rule is `{preconditions, postconditions, invariants, temporal}` as MathExpr data (29-operator grammar: forall/exists/card/sum/globally/eventually/until/lt/le/eq/and/or/not/implies), checked at 10 harness layers (XState guards, actors, SEL enforceAction VAP/VGT/EC steps, supervision taxonomy, message contracts, snapshot invariants, LTL `AG(|O|=|input|)`, memory/compaction, capabilities).

**OBCV's extension (2026-07-31):** add an `obcv-classification` contract — `∀z: classification ∈ {BoM, MoM, REJECT}`, `∀z30m: ∃parent`, `∀z: widthGate`.

---

# PART 16 — OBCV — ORDER BLOCK CANDLE VISION (the normative pseudocode)

## 16.1 The Macro Concept

LMV finds levels that DOZENS of candles react to (clustering matrix). An order block is the OPPOSITE shape of evidence: **ONE candle that a big move started from** (singular event). The impulse candle is the sprinter exploding out of the blocks; the order block is the blocks themselves — the candle right before. OBCV finds every explosion, looks one candle back, and classifies the block.

## 16.2 The 4 Sub-Engines

**Sub-engine A — the ATR-Normalized Displacement Field D (impulse detection):**

```
D_t(i, k) = ( max_{j∈(i, i+k]} close[j] − min_{j∈(i, i+k]} close[j] ) / ATR14_t(i)

where ATR14_t(i) = Wilder's ATR(14) from the 14 bars ENDING at bar i−1
                   (TR prefix sums — deterministic; NEVER including bar i itself —
                    the v4.4 Bug-3 fix: the impulse bar inflates an anchor ATR
                    and blinds the detector)
and k = moveWindowBars(t) = { 4H: 18 (3 trading days), 1H: 36 (1.5 days),
                              30m: 24 (0.5 day — derived, half of 1H) }

isImpulse(i, t) ⟺
  (1) body[i] ≥ 1.5 × μ_body(i−4 .. i−1)      // relative displacement
  (2) |close[i] − open[i]| ≥ 1.5 × ATR14_t(i)  // operator canon: ≥1.5×ATR(14), rolling
  (3) D_t(i, k) ≥ θ_t                           // forward confirmation
  (4) structureBroken(i, t)                     // close beyond the prior N-bar extreme
where θ_4H = 50 pips / ATR · θ_1H = 30 pips / ATR (MDVE-native — golden 1H moves are
      30-46 pips, NOT 50: v4.4 Bug-1 proof bodyFail=32, moveFail=13, detected=0)
      · θ_30m = 15-20 pips / ATR (code: 20p/48b; proposal: 15p/24b)
```

**Sub-engine B — the Origin-Candle Feature Matrix F:**

```
F[o] = [ bw(o), bf(o), rng(o), dir(o), prior(o) ]

bw(o)  = bodyToWick(o)    = body(o) / max(wickTop(o), wickBottom(o))   // ≥ 3.0 for BoM
bf(o)  = bodyFraction(o)  = body(o) / (high(o) − low(o))               // ≥ 0.65 for BoM
rng(o) = rangePips(o)     = (high(o) − low(o)) / pip(t)                // width gate
dir(o) = sign(close(o) − open(o))     // + → DEMAND below; − → SUPPLY above
prior(o) = prior-move class           // NONE | OPPOSITE | SAME

The zone range = [o.low, o.high] — the origin candle's FULL high-low, NEVER the impulse
candle (Bible L1146). Each OB = exactly one origin candle = exactly one zone.
```

**Sub-engine C — the Prior-Move Direction Classifier:**

```
priorMove(o, L) =
  NONE     if range(o−L..o−1) ≤ ε_dwell × ATR14 ∧ |Σ body[j]·dir[j] / ATR14| < θ_dwell
  OPPOSITE if sign(Σ body[j]·dir[j] / ATR14) == −dir(o)
  SAME     if sign(Σ body[j]·dir[j] / ATR14) == +dir(o)
where L = { 4H: 18, 1H: 36, 30m: 24 }, ε_dwell = 0.5 × ATR14, θ_dwell = 0.25

classifyOrigin(o, t) =
  { BoM   if prior(o) ∈ {NONE, OPPOSITE} ∧ bw(o) ≥ 3.0 ∧ bf(o) ≥ 0.65 ∧ widthGate(o, t)
  { MoM   if prior(o) == SAME ∧ validOrigin(o) ∧ widthGate(o, t)
  { REJECT otherwise                                    // totality: no undefined inputs
widthGate: 4H [15,40] · 1H [8,25] · 30m [5,15] pips
```

**Sub-engine D — the Telescoping Refinement Matrix T:**

```
T[parent][child] = 1 ⟺ child.zone ⊆ parent.zone ∧ child.originMs ∈ interval(parent.originCandle)
                        ∧ tf(child) < tf(parent)        // strictly finer
30m OB: REQUIRES a 1H parent (orphan → REJECT — the operator's rule: 30m is not an origin TF)
1H OB:  MAY refine a 4H OB (optional nesting)
Never skipping a level; never a sibling at the same TF (that is a SEPARATE zone)
```

## 16.3 The Firewall Invariants (Stage 5)

```
assert(|BoM| + |MoM| == |deduped|);      // partition — every zone classified exactly once
assert(∀ z30m: parent != null);          // nesting — 30m never top-level
assert(∀ z: widthGate(z));               // width canon re-verified at output
```

## 16.4 The zfp Ladders (canon, applied at output)

```
BoM: 0x=10 (Hard Wall) / 1x=18 / 2x=32 / 3x+=65
MoM: 0x=65 (virgin = pierces = death zone) / 1x=22 / 2x=38 / 3x+=70
30m nested: zfp = min(zfp, parent.zfp)   // nested ≤ parent strength
```

## 16.5 The Downstream Integration

- `ChartModel.zones` gains OBCV's `ObZone[]` with `formationMs` + `parent` (the telescoping link)
- The scaffold ladder's ORDER_BLOCK source is fed by OBCV
- BoM/MoM classification feeds Engine 3's `+5 isBoM` scoring, the zfp ladders, and the Law-14 TP walk's significance ranking (UM BoM > liquidityScore≥5 > BoM > MoM ≤1x)
- E/SL anchors OB-native: entry at the origin-candle defended edge (the body-close side), SL just beyond the origin-candle reaction extreme (the wick tip) + Law-7 buffer; nested zones refine the parent's anchor band
- **The v4.4 Bug-9 meta-lesson: synthetic-bar verification is a pre-flight check; real-bar verification is the acceptance — OBCV's oracle = golden reconstruction against the real Jul 6-10 bars**

## 16.6 The OBCV Acceptance Oracle

1H BoM demand 100.68-100.73 · 4H BoM supply 101.235-band · 1H MoM demand 100.845 — all reconstructed from data alone, within the golden tolerances, plus 96%+ agreement with the operator's drawn OB map (his chart annotations are the ground truth).

---

*END OF PART 11-16 — continued in the next file segment.*
# PART 17 — THE 7 UNIVERSAL LAWS (TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE — 38-image reverse engineering)

## 17.1 LAW 1: MULTI-TIMEFRAME ZONE STACKING

Every A+ trade uses zones from 3-5 timeframes SIMULTANEOUSLY; overlapping TF zones at the same price = "near-impenetrable walls."

- Verified TF combos: **15m+30m+1H+4H (most common, 24 images)**; **15m+30m+1H+4H+8H (deep context, 8)**; **15m+30m+1H (scalp-focused, 3)**; **5m+15m+30m+1H+4H (ultra-precision, 3)**.
- Zone width by TF (typical | range | use):
  - **5m: 5-8 pips | 3-12 | ultra-precision scalp entry**
  - **15m: 8-15 pips | 5-22 | scalp entry, BoM identification**
  - **30m: 12-25 pips | 10-35 | swing entry, MoM rocket placement**
  - **1H: 15-35 pips | 10-50 | HTF swing entry, liquidity shield**
  - **4H: 30-80 pips | 20-120 | directional bias, TP target, major liquidity shield**
  - **8H: 50-150 pips | 30-200 | macro context, deep TP target**
- **CRITICAL GAP (the root cause of the precision problem):** pipeline builds zones ONLY from 4H bars (30-80 pip wide); entry at a 4H zone edge places the trade **50-140 pips from spot**; winning trades enter at 15m/30m zone edges **5-25 pips** from the actual entry trigger.

## 17.2 LAW 2: SHAPE-DRIVEN ZONE ACTIVATION

Shape chain PREDICTS which zones price reaches on which days.

- Shape→distance mapping: **SS (Mon-Tue): ±5-30 pips consolidation, zones 0-30 pips from spot, scalp entries at nearby zones. BS (Wed): 30-100 pips directional, zones 30-100 pips in breakout direction, HTF Swing/Breakout. WL (Thu-Fri): 50-200 pips whiplash spike, zones 50-200 pips at extremes, reversal entry after spike. RWL: 30-100 pips partial recovery, 30-100 pips, counter-direction scalp. R: ±10-50 pips recovery, 10-50 pips, Reinforcement/Recovery entry.**
- VLM quote (image 15): "The code must be programmed to ignore price action until it physically intersects with a pre-drawn Zone Map. The strategy is patient; it waits for price to travel 50-100 pips to find the setup."
- Gap: shapes are NOT connected to zone selection (the E2 cascade fixes this).

## 17.3 LAW 3: ENTRY PRECISION AT LTF ZONE EDGES

Entries NEVER at 4H zone edges. 15m zone edges for scalps (boundary ± **2 pips inside**); 30m edges for swings (ceiling for SHORT, floor for LONG); 1H edges for HTF swings (nearest key level to zone edge); 4H = directional bias + TP target ONLY, never direct entry.

- Entry measurements: **Scalp: 0-2 pips inside zone, SL 5-8 pips, R:R 4-6.5x. HTF Swing: at zone edge (nearest key level), SL 10-15 pips, R:R 3-10x. Breakout: at zone edge (break confirmation), SL 12-20 pips, R:R 5-15x. Reinforcement: at FAR edge of entry zone, SL 10-25 pips, R:R Variable. Whiplash: post-spike entry at zone rejection, SL 7-14 pips, R:R 3.5-9x.**

## 17.4 LAW 4: SL BEHIND LIQUIDITY SHIELDS (verified 38/38)

1. SL distance from entry: **5-15 pips, median 12 pips, NEVER above 25 pips** for standard entries
2. SL placed OUTSIDE the nearest liquidity shield zone
3. If no LSZ between entry and SL → SL widened to next LSZ or setup rejected
4. LSZ = "shield" — price must break through Earth density to hit SL
5. Deep HTF swings: SL **25-50 pips** but MUST be behind 4H/8H liquidity shield
- Distribution: **5-8 pips (11 counts, scalps w/ 15m LSZ); 8-12 pips (14, standard w/ 30m/1H LSZ); 12-20 pips (8, HTF swings w/ 1H/4H LSZ); 20-50 pips (5, deep HTF reversals w/ 4H/8H LSZ)**.

## 17.5 LAW 5: FIBONACCI-ALIGNED ENTRIES AND ROCKETS

Entries/rockets align to Fib from the entry zone. Usage (level | use | frequency): **0.382 primary entry retracement 8/38; 0.50 equilibrium 12/38; 0.618 golden pocket 10/38; 0.786 deep entry/SL invalidation 6/38; 1.272 minor target 4/38; 1.382 Rocket 1 reinforcement 15/38; 1.618 Rocket 2 reinforcement 14/38; 2.382 TP target/Rocket 3 trigger 8/38; 2.786 extended TP/trigger zone 5/38.** Fib anchored to TWO Earth density points: swing high = entry zone ceiling, swing low = entry zone floor.

## 17.6 LAW 6: LIQUIDITY LADDER REINFORCEMENT SYSTEM (verified across 5 ladder images)

Ladders are REINFORCEMENT on an EXISTING trade, never primary.

- Architecture: Primary entry at BoM zone, SL 5-15 pips (ONLY risk in entire ladder) → Rocket 1 at next MoM zone (~20-30 pips from primary), Fib 1.382, on trigger Primary SL→BREAKEVEN (risk=0) → Rocket 2 at next MoM (~20-30 more pips), Fib 1.618, on trigger R1 SL→BE and Primary SL locks profit → TP at opposing BoM/Liquidity Shield zone, Fib 2.382+, combined R:R **16-61x** (only primary risk counts).
- Spacing: **Primary→R1: 20-30 pips (next MoM + Fib 1.382); R1→R2: 12-30 pips (next MoM + Fib 1.618); R2→TP: 25-130 pips (opposing BoM/Liquidity Shield + Fib 2.382+)**.
- SL cascade (universal, 5/5): (1) all entries share primary SL or own SL behind LSZ; (2) R1 triggers → primary SL to breakeven; (3) R2 triggers → R1 SL to breakeven; (4) final: all entries risk-free, only upside.

## 17.7 LAW 7: FORWARD MAPPING — ZONES FIRST, SHAPES PREDICT REACHABILITY

Draw ALL zones from ALL TFs FIRST, then use shape chain to predict reachability. Quotes: Image 32: "The strategy dictates waiting for the price to come to the pre-drawn HTF zones, rather than chasing the price." Image 14: "This is a 'Zone-Dependent' strategy. The code must ignore price action until it physically intersects with a pre-drawn Zone Map." Implementation: (1) build zone map from all TFs 15m–4H BEFORE setups; (2) per-day shape → expected travel range; (3) only generate setups at zones in range; (4) no reachable zone → **"no actionable setup"** for that day; (5) **a zone 200 pips away is VALID if shape predicts whiplash; a zone 100 pips away is INVALID if shape predicts consolidation near spot.**

## 17.8 The 5 Concrete Code Changes (from the golden reference Part 3)

**CHANGE 1 (PRIORITY 1):** `constructBasicSetups()`: 4H zones → find 15m zones WITHIN the 4H zone, 30m zones WITHIN/NEAR, 1H zones OVERLAPPING → for each LTF zone within **30 pips** of spot: LTF edge = entry, LTF opposite edge + buffer = SL, 4H opposing zone = TP, Fib from LTF range. No LTF zone in 30 pips → 4H edge entry flagged **"HTF-only" (lower confidence)**.

**CHANGE 2 (PRIORITY 2):** shape-zone max distance: **SS: 30, BS: 100, WL: 200, RWL: 100, R: 50, RS: 80, default 60** — `if (distPips > maxDist) continue`.

**CHANGE 3 (PRIORITY 3):** liquidity-shield SL: filter `type === 'LSZ' || zoneType?.includes('Liquidity')`; if no LSZ between entry and SL AND `slDist > 20 * pipValue` → widen SL to next LSZ or **confidence -= 10** penalty.

**CHANGE 4 (PRIORITY 4):** depleted zones: allow if fresh 15m/30m zone at same price → **BREAKOUT entry**; else excluded.

**CHANGE 5 (PRIORITY 5):** ladder: snap reinforcement levels to nearest MoM zone center `(floor+ceiling)/2`, label zones; SL cascade metadata: `{price: r1Price, fibLevel: 1.382, slManagement: 'Primary SL → BE on trigger'}`, `{price: r2Price, fibLevel: 1.618, slManagement: 'R1 SL → BE on trigger'}`.

## 17.9 The Golden Reference's Precision Gaps (verbatim)

- SL: pipeline **15-100 pips** vs golden **5-15 (median 12)** — **2-8x too wide**
- Entry distance: pipeline **55-140 pips** vs golden **0-50 initial / 50-300 continuation** — **3-10x too far**
- Zone width: pipeline **30-80 (4H)** vs golden **5-25 (15m/30m)** — **3-10x too wide**
- Multi-TF confluence: "Computed, 0 results"
- Depleted zones: "Completely excluded" vs "Used as breakout if fresh LTF exists"

---

# PART 18 — THE FRACTAL ARCHITECTURE FIRST PRINCIPLES (v2.2/v2.3, 721 lines)

## 18.1 The Three Engines Are Three Prongs of ONE Instrument

**Verbatim (line 29-35):** the Trident is "a **quantum-grade market analysis instrument** that reverse-engineers the **energy function of global financial markets**." The system is a MAP, not a generator: "reality is what it is."

- **Engine 1 (Zones) = "WHERE ARE THE WALLS?"** — Earth density (liquidity + institutional pressure) and Fire density (S/D zones): the SPATIAL question
- **Engine 2 (Shape Chain) = "WHAT PATH WILL THE ENERGY TAKE?"** — Water density (macro shapes) and Air density (Fibonacci trajectory): the DYNAMIC question
- **Engine 3 (Trade Setups) = "WHERE DO I SURF?"** — the interception points where ALL FOUR elements converge: the OPERATIONAL question

The energy-transduction chain: potential (liquidity pools = Earth) → kinetic release (S/D ignition = Fire) → wave mechanics (shapes = Water) → wave-function prediction (Fib = Air) → new potential (self-fulfilling Fib levels = new Earth closes the cycle).

## 18.2 The Elemental Cycle (verbatim law)

**Earth → Fire → Water → Air → Earth**

1. Earth creates the foundation (liquidity pools form — "the memory of institutional intent")
2. Fire provides the firepower (S/D activate — "Fire needs Earth... the move CANNOT happen without both")
3. Water materializes the wave forms
4. Air maps the trajectory
5. **Air's prediction creates NEW Earth** — "As algorithms and institutions act on Fib-predicted levels (self-fulfilling prophecy), those levels become new liquidity zones (Earth). The cycle closes"

**Fire-without-Earth** = S/D with no fuel. **Earth-without-Fire** = liquidity with no direction. **Fire WITH Earth** = "INSTITUTIONAL FIREPOWER with FUEL = the move HAPPENS with force and direction."

## 18.3 The Key Mechanics

- **Density vs Attack axes (the anti-conflation guard):** density = WHAT TYPE OF STRUCTURE a mechanic IS; attack = HOW A SETUP ENGAGES. A Fibonacci Rocket is an Air-density TOOL used in a Fire-style ATTACK. Three attack archetypes: FR (Fire Element Precision Attack — drone strike), LR (Water Element Precision Attack — channel-riding flow), FLR (Earth Element Heavy Attack — fortress).
- **Same-density containment:** "A 4H move can pierce through 1H and 30m structures but will stop at another 4H structure. This is conservation of energy across scales — a higher-density element can only be contained by a same-density element." **Never more than 2 dimensions up** (15m→4H forbidden; 1H↔4H interchangeable with 4H dominant).
- **Recharge law:** "AFTER 2 STRONG PIERCING SWING MOVES — EXPECT 1-2 FULL DAYS OF HTF CONSOLIDATION. Liquidity must be absorbed before it can surge again."
- **Speed law:** "Assume it moves at 30-50% of the speed you think it will"; "The move often takes twice as long as expected."
- **Avatar State (the S-tier signal):** E (Entry = Earth+Fire) + FLR (Fibonacci Liquidity Rocket = Air+Earth) + Water (shape confirmation) — all four elements converge → "the probability of failure approaches zero because it would require violating the energy dynamics at ALL scales simultaneously."
- **Reinforcement as fractal amplification:** "The reinforcement architecture (1 TP + 3 entries) is NOT 'adding more positions.' It is FRACTAL AMPLIFICATION — the SAME trade at DIFFERENT POINTS IN THE WAVE'S EVOLUTION."
- **Fib key level bands:** 0.382-0.5 initial strong reaction zone; 0.5-0.618 mid-pressure; 0.618-0.786 strong pressure; 0.786-1.0 final blast zone; **1.382-1.786 = CLEANEST entry for reinforcement rocket (90% accuracy)**; **2.382-2.786 = Trigger zone (stop order trip-wire)**.
- **Rocket buffers:** FLR: THICK — "2 thick or 3 thin zones between trigger and entry"; FR: "2 Thick Zones or 2-3 Thin Zones"; LR: THIN — "1 Thick Zone OR 2-3 Thin Zones — NO entry buffer zone required."
- **Density-in-container:** "If thin zones sit inside a 4H liquidity pool — each thin zone counts as '2 thin zones' (the 4H container amplifies density)."
- **Rocket SLs:** "ALWAYS 1 full pip outside back edge of zone"; "NY session rockets require 3 pip SLs minimum or they explode"; stop-limit trigger: "STOP ORDER 1-2 pips inside the close edge of Zone 4 (trip wire)".
- **Rocket risk:** built-in "20-30% failure rate"; "Max 3 Rockets (Rec 2)"; combined R:R 25-30x.

## 18.4 The 4 Derailment Mechanisms (v2.2 §11 — context bloat)

When a FRESH report is generated with a clean prompt → A+ data. When a SECOND report is generated in the same context window, accumulated context causes:
1. **Lazy pattern matching** — repeating patterns from the first report instead of fresh analysis
2. **Shortcut taking** — simplifying pair translation instead of running the full 3-engine pipeline
3. **Data fabrication** — plausible-sounding but unverified numbers
4. **Mechanic degradation** — forgetting critical rules (BoM/MoM enforcement, direction validation)

**The fix (determinism doctrine):** output determinism comes from PROCESS ISOLATION, not memory — every report is a clean-room execution. (a) re-read the system prompt at the start of EACH new report; (b) execute the FULL 3-engine pipeline for EACH pair INDEPENDENTLY; (c) verify every data point against the anti-derailment checklist; (d) treat each report as a FRESH generation with ZERO carryover assumptions.

## 18.5 The Iron Laws (verbatim prohibitions)

1. "Do not take reversal entries on MoM zones. EVER. Guaranteed loss." + "MoM zones are ONLY to be used as LADDER STEPS for trend-aligned trades that surf existing momentum. This is the ONLY use case."
2. Thin liquidity zones are NEVER allowed as entry or SL zones
3. Rocket SL always 1 full pip outside the back edge of the zone
4. NY session rockets require 3 pip SLs minimum
5. Never more than 2 dimensions up
6. Price ALWAYS sweeps liquidity zone by zone in sequential order
7. SL must be anchored to a liquid pressure zone — the liquid pressure is a SHIELD for the SL
8. If the analysis is wrong, only the primary entry takes the loss — the same capital at risk, no more
9. Context-bloat safeguard: fresh-pipeline-per-pair, zero carryover

---

# PART 19 — PAIR PROFILES (the pair-specific elemental doctrines)

## 19.1 DXY — Air-Fire Dominant (Master Compass)

- Role: Master directional compass. Processing: FIRST (DXY direction cascades to FX pairs)
- London: Zone-to-zone movement — breakout unlikely before 3 PM ET. NY: "Wakes up during NY" — directional moves begin
- Pip size: 0.01, decimals: 2, buffer: 15 pips, gap cancel: 15

## 19.2 EUR/USD — Fire-Earth Dominant (Primary Swing Pair)

- Role: Primary swing pair (NY focus). Pace: Medium
- PA: Directly touches overlap point — NO liquidity shield
- OTC: 62.4% of DXY per-pip impact
- Best for: HTF swings, DXY-anchored directional bias
- Pip size: 0.0001, decimals: 4, buffer: 25 pips, gap cancel: 20
- Special rules: NY_FOCUS, DIRECT_ZONE_TEST, NO_SHIELD

## 19.3 GBP/USD — Earth-Water Dominant (Primary Scalp Pair)

- Role: Primary scalp pair (London focus). Pace: Fast
- PA: LIQUIDITY is the only thing respected. S/D gets PIERCED. LIQUIDITY SHIELDS protect S/D zones
- 3-4× more London opportunities than EUR
- Pip size: 0.0001, decimals: 4, buffer: **35** pips (short squeeze dynamics cause 35-pip overshoots), gap cancel: 15
- Special rules: SHORT_SQUEEZE, LONDON_DOMINANT, HIGH_GAP_RISK

## 19.4 AUD/USD — Earth Dominant (Secondary Swing Pair, SLOW)

- Role: Secondary swing pair. Pace: SLOW — "Molasses"
- Speed Rule: Expect 2-4 DAYS for HTF move completion
- Category Restriction: Only HTF Swing + Reinforcement (NO consolidation scalps)
- Sessions: **Tokyo + London only** (NOT NY)
- Max setups per week: **3** (lower liquidity)
- Pip size: 0.0001, decimals: 4, buffer: 15 pips, gap cancel: 30
- Special rules: BS_WL_ONLY, NO_NY, LOW_FREQUENCY

## 19.5 Pair Priority Charting Order

1. AUD/USD FIRST (clearest scalps, can be scalped during London)
2. GBP/USD SECOND (primary scalp pair, 3-4× more London ops)
3. EUR/USD THIRD (primary swing pair, NY session focus)
- GU + AU > EU for RRR

---

# PART 20 — THE DXY CASCADE — WHAT IT DOES AND DOESN'T MEAN (Bible 4.0 Appendix I, the permanent law)

## 20.1 Scenario: DXY Bullish Week

DXY E2 shape chain predicts: SS (Mon-Tue) → BS UP (Wed) → R (Thu) → WL (Fri). DXY direction: BULLISH.

**Macro direction implication for FX pairs (inverse):** EUR/USD bearish-biased for HTF swings (SHORT); GBP/USD bearish-biased (SHORT); AUD/USD bearish-biased (SHORT).

**What this DOES NOT mean:**
- Does NOT mean EUR/USD LONG setups are rejected
- Does NOT mean GBP/USD Consolidation scalps at demand are invalid
- Does NOT mean all counter-trend trades are forbidden

**What it DOES mean:**
- EUR/USD BS (HTF swing) should be SHORT (aligned with DXY bullish inverse)
- EUR/USD SS scalps at supply → SHORT is preferred (aligned with macro)
- EUR/USD SS scalps at demand → LONG is VALID (counter-trend scalp within consolidation — captures the bounce before the macro direction resumes)
- GBP/USD WL rejection at demand → LONG is VALID (reversal setup at Hard Wall — the zone doesn't care about macro direction)

**Wednesday equivalent on EUR/USD:** If DXY is bullish on Wednesday (BS up), EUR/USD should be bearish (BS down). But EUR/USD may have a supply zone near spot where price bounces briefly (SS scalp LONG during London) before the BS down begins during NY. The LONG scalp is valid because: (1) zone type says LONG (demand below spot); (2) shape for the day eventually says SHORT but during London it's still SS; (3) session says London (scalps valid); (4) minimum 3 confluences met: zone type + shape context + session = 3.

## 20.2 The Multi-Pair Translation Protocol (Appendix E — THE law)

**CRITICAL RULE: DXY provides DIRECTION. The PAIR provides LEVELS.**

**PROHIBITED Methods (all FORBIDDEN):**
1. Mathematical Conversion (DXY formula reverse)
2. Inverse Correlation Ratio
3. Arithmetic Inversion
4. Percentage-Based Conversion
5. Pip Equivalence Conversion

**APPROACH B — Structural Equivalence:**
1. Complete DXY Report (Phase 1)
2. Map DXY Zones to Pair Direction Assignments (Phase 2)
3. Harvest Pair-Specific Data (Phase 3)
4. Identify Pair-Specific Zones (Phase 4)
5. Match DXY Conviction to Pair Levels (Phase 5)
6. Cross-Validate (7 requirements) (Phase 6)
7. Assemble Cross-Pair Matrix (Phase 7)

**Zone Translation Mapping:**

| DXY Zone Role | Pair Zone Role | Conviction Transfer |
|---------------|---------------|-------------------|
| RESISTANCE CEILING | SUPPORT FLOOR | DIRECT |
| UPPER RESISTANCE | LOWER SUPPORT | DIRECT |
| EQUILIBRIUM | EQUILIBRIUM | NEUTRAL (score-2) |
| MID-RANGE SUPPORT | MID-RANGE RESISTANCE | INVERTED |
| KEY SUPPORT BAND | KEY RESISTANCE BAND | INVERTED |
| LSZ (demand) | LSZ (supply) | INVERTED |

---

# PART 21 — THE ELEMENTAL DENSITY REFERENCE (Bible 4.0 Part 10 — the era's foundational doctrine)

## 21.1 The Four Densities

**EARTH — Liquidity & Institutional Pressure (The Foundation):**
- IP Zones (Institutional Pressure Zones) = HEAVY Earth — the bedrock
- LSZs/LQZs (Liquidity Sweep Zones / Liquidity Zones) = standard Earth — the soil
- Thin liquidity zones are NEVER allowed as entry or SL zones
- "SL must be ANCHORED to a liquid pressure zone — the liquid pressure is a SHIELD for the SL"
- **Earth determines the ANCHOR. Fire (S/D) determines the TARGET.**

**FIRE — Supply & Demand (The Firepower):**
- BoM (Beginning of Move) S/D zones = the HOTTEST Fire — origin point, most institutional firepower, "100% guaranteed reaction if unmitigated"
- MoM (Middle of Move) S/D zones = COOLING Fire — continuation zones, "LADDER STEPS ONLY — Do not take reversal entries on MoM zones. EVER. Guaranteed loss."
- "After 2 strong piercing swing moves, expect 1-2 full days of HTF consolidation"

**WATER — Macro Shapes (The Waves):**
- BS = tidal wave. WL = crashing wave. SS = calm pool with ripples. WLS = storm. R = receding wave
- "The Macro Shape Chain IS Water density: SS → BS → R → WL — predicting the sequence of wave forms"
- Water GIVES STRUCTURE to Fire: "without shapes, S/D would be untraceable chaos"

**AIR — Fibonacci (The Spiderweb):**
- Air has NO intrinsic density — "it flows anywhere like wind." BUT anchored to Earth density points it becomes a SPIDERWEB
- "Poorly anchored spiderwebs get blown away by the wind and DON'T EXIST"
- **Air PIERCES through Fire (4H BoM S/D zones), NOT Earth** — the v2.1 correction: "When Air flow pierces through an unmitigated Fire zone, it triggers a whiplash reaction. Air has DUAL nature with Fire: it can FUEL fire (accelerate the move) or PUT IT OUT (extinguish/reverse)"
- Fib wormholes: 0.382→1.382, 0.618→1.618 (scale-invariant — same math at every timeframe)

## 21.2 The Elemental Cycle Causal Chain (why the order cannot change)

1. Earth creates foundation → 2. Fire provides firepower → 3. Water materializes wave forms → 4. Air maps trajectory → 5. Air creates new Earth → cycle closes

- Fire without Earth = no fuel. The move CANNOT happen.
- Water without Fire = no energy source. Dead calm.
- Air without Water = no swing points. Spiderweb with no trees.
- Earth without Air = no new Earth creation. The cycle doesn't reset.

## 21.3 The Avatar State (fractally locked signal)

**E (Entry) + FLR (Fibonacci Liquidity Rocket) = Avatar State.**
- E provides Earth+Fire (liquidity zone + S/D overlap)
- FLR provides Air+Earth (Fib targeting + Liquidity anchoring)
- Water is the macro shape confirmation

"Fractally Locked" = the signal exists at EVERY scale simultaneously — the 4H liquidity zone overlaps with the 1H S/D zone at the same price where the 30m Fib level projects the entry, which aligns with the 15m macro shape's direction, which matches the 5m entry trigger candle.

P(all four wrong) = (0.20)^4 = 0.16% — probability INTERSECTION, not addition.

## 21.4 Conservation of Energy (the universal law)

Markets spend approximately **70-80%** of their time in accumulation/recovery (SS, R, WLS) and only **20-30%** in explosive release (BS, WL).

The recharge:consumption ratio is approximately **10:1 to 24:1** in candle count. A BS consuming 4-8 candles requires 48-96 candles of SS to replenish.

Energy accumulation scales sub-linearly: approximately **t^0.375**:
- A 10-candle SS produces energy E
- A 20-candle SS produces ~1.5E (not 2E)
- A 30-candle SS produces ~1.9E

**Critical prediction:** In a BS → R → BS (Double Surge) sequence, the second BS MUST be weaker than the first. R recovers approximately 33% of consumed energy. If the first BS consumed 100 units, R recovers 33 units. The second BS has only 33 units available.

## 21.5 Dimensional Density Scaling

Earth density scales across timeframes approximately **t^0.25** (quartic root of time):
- 15m → 1H (4× time ratio): density ratio ≈ 4^0.25 = √2 ≈ 1.41×
- 1H → 4H: ≈ 1.41×
- 15m → 4H (2 major dimensions): 1.41 × 1.41 = **2.0×**

The "never more than 2 dimensions up" rule creates a HARD CEILING: maximum amplification ≈ 2.0×.

## 21.6 The Fortress Zone (phase transition)

A zone that holds 4+ times with STRONG reactions undergoes a PHASE TRANSITION from Fire-dominant to Earth-dominant:
1. Original S/D orders (Fire) deplete normally with each test
2. But each test deposits NEW liquidity (retail stop-losses from traders who tried to break it)
3. The accumulated swept liquidity (Earth) eventually EXCEEDS the depleted Fire
4. At 4+ tests: Earth >> Fire → zone becomes an immovable liquidity structure
5. The accumulated energy is so massive that the next reaction is EXPLOSIVE
6. **95% probability of complete direction flip — the zone reverses the prevailing trend**

---

# PART 22 — THE ZONE PATH MAP — THE MITIGATION HIGHWAY (the Law-14 proof)

## 22.1 Trade 6's Zone Path (the DEFINITIVE Law 14 proof)

**Wed BS Short @ 101.235 → TP 100.680 — 55.5 pips through 5 mitigated zones:**

| Zone | Price | Mitigation Status | Price Behavior |
|------|-------|------------------|----------------|
| 101.235 | Entry | Fresh (0 reactions) | Entry triggered |
| 101.19 | -4.5 pips | Mitigated (tested Wed morning) | Passed through |
| 101.14 | -9.5 pips | Mitigated (tested Monday) | Passed through |
| 100.975 | -26 pips | Mitigated (tested Wed as TP of Trade 4) | Passed through |
| 100.945 | -29 pips | Mitigated (tested Monday) | Passed through |
| 100.845 | -39 pips | Mitigated (tested Mon+Tue) | Passed through |
| **100.680** | **-55.5 pips** | **UM (unmitigated)** | **REACTION — TP hit** |

**Refined Law 14 (verbatim):** "Price cannot teleport past UNMITIGATED zones. Price CAN pass through mitigated zones during BS momentum. The 'no teleport' constraint applies ONLY to zones with reactionCount = 0."

## 22.2 The 8-Trade Zone Paths (Appendix H summary)

- **Trade 1:** [100.945 DEMAND] →UP→ [101.115 SUPPLY]. Intermediate: NONE. Direct path to nearest opposing zone.
- **Trade 2:** [101.14 SUPPLY] →DOWN→ [100.945 (mitigated by T1)] →DOWN→ [100.845 TP]. Passed through mitigated zone during BS momentum.
- **Trade 3:** [100.845] →UP→ [100.945 (mit.)] →UP→ [100.975 (UM — price REACTED here, paused)] →UP→ [101.14 (mit.)] →UP→ [101.190 TP]. Law-14 consistent: price reacted at the UM zone.
- **Trade 4:** [101.19 SUPPLY] →DOWN→ [101.14 (mit.)] →DOWN→ [100.975 TP]. UM zone caused the reaction.
- **Trade 5 (TRADE CHAIN: T4 TP = T5 entry):** [100.975 DEMAND] →UP→ [101.14 (mit.)] →UP→ [101.19 (mit. by T4)] →UP→ [101.235] →UP→ [101.240 TP]. UM at 101.235/101.240 caused the reaction.
- **Trade 6 (TRADE CHAIN: T5 TP = T6 entry):** the definitive Law-14 proof (table above).

## 22.3 SL Distances as Zone Width (the golden SL table)

| Trade | Entry-SL (pips) | Entry Zone TF | Zone Width | Buffer |
|-------|----------------|---------------|------------|--------|
| #1 (Mon SS Long) | 4 | 1H LQZ | ~5 pips | 2 (EUR equivalent) |
| #2 (Mon BS Short) | 6 | 1H LQZ | ~8 pips | 3 |
| #3 (Tue R Long) | 7.5 | 1H MoM | ~10 pips | 3 |
| #4 (Wed SS Short) | 6 | 1H LQZ | ~8 pips | 3 |
| #5 (Wed RWL Long) | 7 | 1H LQZ | ~8 pips | 3 |
| #6 (Wed BS Short) | 9.5 | 4H BoM | ~15 pips | 5 |

**SL distance DIRECTLY correlates with entry zone width. SL = zone width + 2-5 pip buffer. This confirms Law 9: SL distance is determined by zone geometry.**

## 22.4 The Entry Zone TF Distribution (from 38 winning trades)

| Entry Zone TF | Count | % |
|---------------|-------|---|
| 15m (Unmitigated) MoM | 12 | 32% |
| 30m MoM / Refined | 8 | 21% |
| 1H (Unmitigated) MoM | 7 | 18% |
| 4H Liquidity / MoM | 5 | 13% |
| LSZ / Liquidity Shield | 4 | 11% |
| Consolidation zone | 2 | 5% |

**The most common entry zone is 15m Unmitigated MoM (32%). The pipeline currently constructs zones primarily from 4H data — it misses the 15m and 30m zones where 53% of winning trades entered.**

---

# PART 23 — THE 37 FUNDAMENTAL LAWS — THE ERA'S ADDITIONS AND REFINEMENTS

## 23.1 The Full Law Set (categories A-I, from Bible 4.0 Appendix M)

**Category A: Zone Construction (Laws 1-6)**
1. Timeframe telescoping: 4H→1H→30m→15m, top-down. Lower TF never overrides higher TF direction.
2. Zone width parameters are TF-dependent: 4H (15-40 pips), 1H (8-25), 30m (5-15), 15m (3-10).
3. Multi-TF zone map as single source of truth. ALL zones in ONE map.
4. Zone nesting: LTF inside HTF = refinement (+3 dual-TF, +5 triple-TF confluence).
5. LQZ = entry zone, NOT SL anchor.
6. Entry zone on correct side of spot: supply above → SHORT, demand below → LONG.

**Category B: SL Placement (Laws 7-10)**
7. SL at next key zone + 2-5 pips inside (EUR=2, GBP=3, AUD=3, DXY=5).
8. Fallback: max(zoneWidth×2, 1.5×ATR) when no zone within 100 pips.
9. SL distance = zone geometry + buffer (median 15 pips, mode 12).
10. ATR minimum: SL never tighter than 0.5×pairATR(14).

**Category C: TP Placement (Laws 11-14)**
11. TP at demand+liquidity overlap (Earth+Fire). Overlap → midpoint. No overlap → near edge.
12. TP timeframe ≥ entry timeframe.
13. TP > 2×weeklyATR = ambitious. > 3× = reject.
14. Price cannot teleport past UM zones (CAN pass mitigated zones during BS).

**Category D: Entry Mechanics (Laws 15-19)**
15. 3-entry staggered: front+spread (33%), middle key level (33%), back+spread (34%).
16. Forward spreads mandatory: EUR=1, AUD=1.5, GBP=2, DXY=0.02.
17. Entry at zone edge (74%) or inside (26%).
18. Candle confirmation required: engulfing (47%), pin bar (32%), inside bar (21%), breakout (16%).
19. ZoC (Zone of Conquest): 3+ TF overlap + LQZ shield + BoM → dual-direction.

**Category E: Direction (Laws 20-22)**
20. DXY cascade = macro direction bias. HTF swings align. Counter-trend scalps valid with 3+ confluences.
21. Direction analysis is 70% correct — execution is the problem.
22. MFE before SL = right zone, wrong SL placement.

**Category F: Session (Laws 23-25)**
23. Session enforcement = liquidity quality proxy (London: 22/38, NY: 15/38).
24. News events = shape catalysts. PREDICT spike direction, use as entry catalyst.
25. London Spike: 1H bar range > 2×ATR. Kills tight SLs, provides entry opportunities.

**Category G: War Narrative (Laws 26-30)**
26. War narrative = connecting tissue: zones=positions, shapes=phases, setups=deployments.
27. Trade chaining: TP of N = entry of N+1.
28. Zone defense tracking: DEFENDED/BROKEN/UNTESTED.
29. Prior week context required (defended zones depleted? broken zones role-reversed?).
30. London: sharper reactions. NY: deeper penetrations.

**Category H: Zone Quality (Laws 31-34)**
31. UM zones: 100% reaction. 1x: 80%. 2x: 50%. 3x+: TP target only.
32. Multi-TF confluence: dual-TF +3, triple-TF +5.
33. LiquidityScore 0-10. TP zones need ≥5. "Wood for the fire."
34. Zone depletion is per-timeframe. 15m depleted ≠ 1H depleted.

**Category I: Validation (Laws 35-37)**
35. RR is consequence, not target. Floor 1.0. Let zone structure determine RR. **REVISED 2026-07-31: floor 3.0.**
36. Dedup key: `direction_entry_sl_tp_day`.
37. Visual verification: Data 80%, Vision 20%.

## 23.2 The Era's Law Refinements (from the Deep Fix Codex + forensic)

- **Law 14 refined:** "Price cannot teleport past UNMITIGATED zones. Mitigated zones are pass-through during momentum."
- **Law 5 refined (the LQZ rule):** LQZ = ENTRY zone (NOT SL anchor). In 32/38 trades (84%), entry zone IS the shield.
- **Law 9 refined:** SL distance determined by zone geometry — 3-6 pips (18%), 8-15 pips (29%), 17-30 pips (37%), 34-55 pips (16%). Median: ~15 pips. Mode: ~12 pips.
- **Law 35 revised (2026-07-31):** the "absolute floor of 1.0" is DEAD. RRR ≥ 3.0 emission minimum, ≥ 3.5 executed standard, 4+ the norm.

---

# PART 24 — THE FIREWALL AND ZERO-TOLERANCE RULES (the era's gate system)

## 24.1 The Key Firewall Rules (from 67 total)

| Rule | Type | Check | Impact |
|------|------|-------|--------|
| ZT-1 | BLOCK | Virgin MoM (DEATH ZONE) | Prevents entries at zones with 0% win rate |
| ZT-2 | BLOCK/SKIP | Open position (needs mode flag) | When isReportGeneration=true: skips |
| ZT-13 | BLOCK | Invalid entry zone | Entry zone doesn't meet structural requirements |
| ZT-14 | BLOCK | Invalid SL zone | SL not at structural level |
| ZT-16 | BLOCK | Invalid TP zone | TP not at opposing S/D with liquidity |
| ZT-17 | FLAG | Breakout surge during EARLY consolidation | Not a block — a warning flag |
| CS1-CS18 | Various | Core semantic rules | Various setup quality checks |
| CS12 | BLOCK | Direction validation requires 6 checks | Fewer than 6 → ALL setups rejected |
| RRR-1 | BLOCK | Category-specific RRR floor | Below rrrForCategory().tp1 |
| SL-1 | BLOCK | SL exceeds SL_MAX_HARD | DXY > 50, FX > 150-180 |
| PROX-1 | BLOCK | Entry proximity maximum | Beyond MAX_ENTRY_DISTANCE |
| BE1-BE12 | Various | Blind-execution checks | Day labels, session windows, shape triggers |
| BE17 | CHECK | Session text in setup notes | Must mention assigned session |
| BE18 | CHECK | Candle confirmation note | Must mention required pattern |

**REVISED 2026-07-31: RRR-1 floor = 3.0 for ALL categories** (not rrrForCategory().tp1's legacy 1.5/2.0 values).

## 24.2 CS12 Direction Validation (6 Checks Required)

1. Zone Category — RES/SUP/MID
2. Shape Alignment — does the E2 shape for the day support this direction?
3. Confluence Threshold — minimum confluence for the direction
4. RRR Check — meets the category floor (3.0)
5. Session Timing — appropriate for the setup category
6. Sniper Entry Precision — entry at the zone edge (not random)

## 24.3 The Blind-Execution Protocol (12 Checks)

| # | Check | Pass Condition |
|---|-------|---------------|
| BE1 | Every setup has DAY label | Mon/Tue/Wed/Thu/Fri |
| BE2 | Every setup has SESSION WINDOW | London/NY with time |
| BE3 | Every setup has SHAPE TRIGGER | Which macro shape activates |
| BE4 | Every setup has SETUP CATEGORY | Consolidation/HTF Swing/Reversal/Reinforcement |
| BE5 | Weekly Execution Calendar populated | All setups by day |
| BE6 | All anchor points have WHEN + WHERE | Expected hit timing |
| BE7 | No setup requires real-time chart analysis | Pre-set levels only |
| BE8 | Day Catalysts listed | Expiries/events/auctions |
| BE9 | Reinforcement entries have parent reference | Parent trade + day |
| BE10 | All 5 trading days covered | ≥1 setup/day or stated reason |
| BE11 | Profit Taking Law documented | Close ALL by NY close Friday |
| BE12 | Trading Speed adjustment applied | +1 day from raw timing |

---

# PART 25 — THE TELESCOPING + LMV + OBCV SYNTHESIS (the 2026-07-31 unified architecture)

## 25.1 The Data Flow (what E1 must become)

```
HARVEST (all 4 TFs: 4H 500 bars / 1H 1500 / 30m 500 / 15m 300)
    ↓
E1 TELESCOPED ZONE CONSTRUCTION:
  S/D lane:  4H OBs (BoM+MoM) → 1H OBs (BoM+MoM, nested in 4H) → 30m (MoM only, nested in 1H)
  LQZ lane:  1H LQZ origin (LMV matrix run 1) → 30m LQZ refinement (LMV run 2) → 15m refinement (LMV run 3)
  OB lane:   OBCV machine (displacement field → origin-candle matrix → BoM/MoM → telescoping incidence)
    ↓
ONE ZONE MAP (single source of truth — the telescoped union, refinedLabel-tagged)
    ↓
E2 (per-pair ShapeBrain: shape chain + projectZoneForDay with ENTRY rungs + DayBand London-open forward projection)
    ↓ cascade (DXY → EU inverse → GU kept)
E3 (selectPairNativeZone keyZoneId AUTHORITATIVE → E/SL/TP from LMV rungs + OBCV OBs)
    ↓
REPORT (23 golden trades ±3 pips, RRR ≥ 3.0, verified mechanically)
```

## 25.2 The Machine Roles (the division of labor)

| Machine | Detects | Method | Anchor outputs |
|---------|---------|--------|----------------|
| **LMV** (Liquidity Matrix Vision) | LQZs (liquidity levels) | Candle-matrices: dozens of candles reacting to the same range over 1-6 weeks, grouped by linear algebra; column reductions = reactionExtreme + defendedEdge | Entry = defendedEdge; SL = next rung's reactionExtreme + buffer; TP = opposing rung's defendedEdge w/ S/D overlap |
| **OBCV** (Order Block Candle Vision) | BoM/MoM S/D zones | Displacement field (impulse detection) → origin-candle feature matrix → prior-move classifier → telescoping incidence | Zone = [origin.low, origin.high]; BoM = prior NONE/OPPOSITE + bw≥3.0 + bf≥0.65; 4H/1H origins only; 30m MoM-only nested |
| **E2** (ShapeBrain) | Shape chains + day zones | ZFP-conditioned transition matrix + day decomposition | keyZoneId authoritative; ENTRY rungs; DayBand day-native spot |
| **E3** (cascade) | Trade setups | selectPairNativeZone + computeLmvTP + computeSL_LMV | The 23 golden trades |

**The operator's lever principle (2026-07-31):** once LMV + OBCV are 96%+ accurate, 90% of the work in charting zones is done from the start — the exact candles/price anchors for nearly all zones are already computed.

## 25.3 The Golden-LQZ Oracle (the definitive LMV test)

The machine must emit, from the week's own data (never hardcoded):
- **DXY 7 LQZs at ≤1 pip:** 100.845 · 100.945 · 100.975 · 101.14 · 101.19 · 101.235 · 101.240
- **DXY BoM:** 100.680 (1H) · 101.330 (4H)
- **DXY MoM:** 100.845 (1H)
- **EU/GU equivalents** at the Tier-B axis labels (EU ladder 1.14649→1.13850; GU ladder 1.34587→1.33000)

**Current state (2026-07-31): 3/7 at ≤1 pip (100.849 Δ0.4p, 100.949 Δ0.4p, 101.130 Δ1.0p). The other 4 fail via the resolution mechanisms (Part 3.7). The telescoped multi-TF LMV runs + modal-cluster emission + 1-pip dedup are the fix.**

---

# APPENDIX A — THE COMPLETE CONSTANT REFERENCE (v4.5.2_E2_CASCADE, code-verified)

## A.1 LQZ Detector Constants (lqz-lobe.ts)

| Constant | Value | Line |
|---|---|---|
| LQZ_LOOKBACK_BARS | 720 (6 weeks 1H) | :119 |
| LQZ_DEFAULT_LOOKBACK_BARS | 120 | :109 |
| SWEEP_LEVEL_LOOKBACK_BARS | 24 | :117 |
| SWEEP_THICK_BODY_MULT | 1.5 | :120 |
| SWEEP_MIN_BEYOND_PIPS | 2 | :123 |
| SWEEP_REVERSAL_WINDOW_BARS | 6 | :126 |
| LONG_WICK_BODY_MULT | 2.5 | :137 |
| LONG_WICK_MIN_PIPS | 5 | :140 |
| SHARP_MOVE_WINDOW_BARS | 3 | :143 |
| SHARP_MOVE_MIN_PIPS | 15 | :146 |
| SHARP_MOVE_ATR_MULT | 1.5 | :149 |
| SHORT_WICK_MAX_PIPS / CLUSTER_MIN_BARS / TOL | 3 / 3 / 2 | :154/:157/:160 |
| CONSOL_MAX_SPAN_PIPS | 25 | :163 |
| LQZ_ALIGN_TOLERANCE_PIPS | 3 | :168 |

## A.2 LMV Matrix Constants (lqz-matrix.ts / lmv.ts)

| Constant | Value | Line |
|---|---|---|
| SWING_NEIGHBORHOOD_BARS | 1 | :58 |
| MIN_PROMINENCE_PIPS | 1 | :69 |
| CLUSTER_TOLERANCE_PIPS | 2 | :78 / lmv:179 |
| CLUSTER_MAX_SPAN_PIPS | 4 | :88 / lmv:188 |
| MIN_CLUSTER_POINTS | 3 | :97 / lmv:197 |
| MIN_RECURRENCE_WINDOWS | 2 | :105 / lmv:206 |
| EPSILON_ATR_FRACTION | 0.25 | :112 / lmv:220 |
| SWING_SWEEP_LOOKBACK_BARS | 24 | :127 |
| MIN_TOUCH_DEPTH_PIPS | 2 | :151 |
| REVERSAL_ATR_FRACTION | 0.5 | :160 |
| DEFENDED_EDGE_QUANTUM_PIPS | 1 | lmv:231 |
| zfp ladder | min(60, 20 + floor((touches−3)/2)×5) | lmv:585-588 |

## A.3 S/D Construction Params (4h-sd-lobe.ts:64-69)

| TF | maxBars | maxZoneWidthPips | maxZoneDistancePips |
|----|---------|-----------------|---------------------|
| 4H | 60 | 40 | 150 |
| 1H | 120 | 25 | 150 |
| 30m | 200 | 15 | 150 |
| 15m | 300 | 10 | 150 |

Min width: DXY 10 pips / FX 20 pips (:197). BoM: body-to-wick ≥ 3.0, body/range ≥ 0.65.

## A.4 MDVE Native OB Params (ob-engine.ts:63-110)

| TF | lookbackBars | minMovePips | moveWindowBars | maxZoneWidthPips |
|----|-------------|-------------|----------------|------------------|
| 1H | 300 | 30 | 36 | 25 |
| 30m | 576 | 20 | 48 | 15 |

## A.5 RRR Constants (trading-constants.ts)

| Constant | Value | Line |
|---|---|---|
| RRR_BY_CATEGORY | HTF_SWING {2.0, 3.0} · SWING_SCALP {1.5, 2.0} · BREAKOUT_SURGE {2.0, 2.5} · REINFORCEMENT {1.5, 2.0} · TRANSITION {2.0, 3.0} · WHIPLASH {2.0, 2.5} (tp1, blended) | :140-147 |
| DEFAULT_RRR_MINIMUMS | {tp1: 2.0, blended: 3.0} | :150 |
| CHAIN_MIN_RRR_SUPPLEMENTARY | 3.0 | :122 |
| MIN_RRR_CONSTRUCTION | 1.5 | :114 |
| MIN_RRR_FOR_LOW_PROB | 3.0 | :188 |
| **REVISED 2026-07-31** | **ALL tp1 → 3.0; blended ≥ 3.0** | — |

## A.6 The SL Constants

| Constant | Value | Location |
|---|---|---|
| Law-7 buffers | EUR 2 / GBP 3 / AUD 3 / DXY 5 | sl-lmv.ts:61-63 |
| Law-10 floor | 0.5×ATR(14) | sl-lmv.ts:74 |
| GOLDEN_SL_MAX_PIPS | 9.5 | sl-lmv.ts:84 |
| D17 ceiling | 36 pips HARD | mirror.ts:79 |
| GOLDEN_SL_MIN_PIPS | 4 | mirror.ts (PRISTINE) :2466 |
| DUAL_ENTRY_MIN_SEPARATION_PIPS | 15 | setup-gen.ts:619 |

## A.7 The Pair Constants

| Pair | pip | decimals | buffer | gap cancel |
|------|-----|----------|--------|-----------|
| DXY | 0.01 | 2 | 15 | 15 |
| EUR/USD | 0.0001 | 4 | 25 | 20 |
| GBP/USD | 0.0001 | 4 | 35 | 15 |
| AUD/USD | 0.0001 | 4 | 15 | 30 |

---

# APPENDIX B — THE REGRESSION TEST SUITE (the era's verification gates)

| Suite | Count | Status |
|-------|-------|--------|
| golden-recon | 16/16 | FROZEN harness (454b8abc) |
| verify-cascade | 13/13 | era-verified |
| verify-integration | 13/13 | FROZEN (ce975356) |
| scratch-lmv | 21/21 | FROZEN (a4dc01c1) |
| verify-sl-fix | 25/25 | FROZEN (f8ed6b20) |
| verify-mirror-fix | 21/21 | FROZEN (2006ce2e) |
| verify-integration-v45 | 26/26 | era-verified |
| verify-refinement-x | 18/18 | era-verified |
| verify-dedup | 59/59 | v4.5.2 |
| verify-accurate-stats | 64/64 | v4.5.2 |
| **verify-golden-23** | **TARGET** | NEW — the acceptance oracle (TASK_QUEUE.md:115) |

**Build discipline:** every wave: `bun build src/index.ts --outdir dist --target bun` + `npx tsc --noEmit` — BOTH must exit 0. SHA chain discipline preserved. Frozen files sha256 byte-identical (except operator-unfrozen setup-gen.ts and the 2026-07-31-unfrozen lmv.ts + lqz-matrix.ts).

**Container requirements:** fresh container, SHA-verified deploy, standard task prompt, 3-signal monitoring, sniff test + golden reconstruction + outcome audit.

---

*END OF PART 17-25 + APPENDICES A-B — continued in the next file segment.*
# PART 26 — ENGINE 1 COMPLETE MECHANICS (the 9-pillar zone construction, Bible 4.0 Part 4)

## 26.1 The 6 Dimensions of Independence

Each zone is scored across 6 independent dimensions (0-2 each, max 12) PLUS Structural Extreme Bonus (up to +2, max 14):

**Dimension 1: Technical (Price-Derived Mathematics)** — pivot points, moving averages. 2 pts: exact match within 3 pips. 1 pt: zone match within 10 pips. 0: no match.

**Dimension 2: Options-Derived (Contractual Positioning)** — OTC option strikes (delta hedging = magnetic pull). 2 pts: Critical Option Wall (≥$1.5B notional). 1 pt: Significant Magnet ($850M-$1.499B). 0: no positioning data. **NOTIONALS ALREADY IN BILLIONS — DO NOT DIVIDE BY 1000.**

**Dimension 3: Analyst Consensus (Published Intelligence)** — ING, forex.com (Matt Weller CMT) = Tier 1 (weight 3.0); FXStreet, TradingView Community, VT Markets = Tier 2 (2.0); Continuum, OneUpTrader = Tier 3 (1.0). 2 pts: 2+ Tier-1 sources agree. 1 pt: 1 source. 0: no coverage. Temporal boundary: only commentary published before the Friday 5:00 PM ET close of the prior week.

**Dimension 4: Structural (Microstructure Memory)** — prior swing highs/lows, order blocks, rejection wicks. 2 pts: exact anchor + structural extreme. 1 pt: proximity. 0: no structural event. Structural Extreme Bonus (+2 max): Confluent Floor/Ceiling (swing extreme inside HTF order block), Repeated Extreme Magnets (same level hit 2+ dates), Role Reversals.

**Dimension 5: Psychological (Behavioral Patterns)** — round numbers (.00, .50) = 2 pts; quarter figures (.25, .75) = 1 pt; Fib+round alignment amplifies.

**Dimension 6: Regime/Dynamic (Macro Forces)** — 2 pts: zone in consolidation (will hold); 1 pt: zone in momentum (may hold/fail); 0: zone in breakout (likely to fail).

**Mathematical justification:** No single dimension can dominate. Even at maximum 2/2, one dimension contributes at most 2/12 = 16.7% of the base score. To reach EXTREME (12/12), at least 6 independent dimensions must agree.

## 26.2 Pillar 1 — Multi-Timeframe Pivot Engine (the single most powerful pillar, 8/11 levels)

Three pivot variants × two timeframes (weekly + daily) = 6 pivot sets, 42 calculated levels:

**Classic Pivots (PP-based geometry, ASYMMETRIC by design):**
```
PP = (H + L + C) / 3
R1 = 2×PP − L              S1 = 2×PP − H
R2 = PP + (H − L)          S2 = PP − (H − L)
R3 = H + 2×(PP − L)        S3 = L − 2×(H − PP)
```
Verification: R1 + L = 2×PP (must be exactly true); R1 > PP > S1; R2 > R1 > PP; S1 > S2 > S3; R2−S2 = 2×(H−L).

**Fibonacci Pivots (SYMMETRIC, harmonic ratios):**
```
PP = (H + L + C) / 3
R1 = PP + 0.382×(H−L)     S1 = PP − 0.382×(H−L)
R2 = PP + 0.618×(H−L)     S2 = PP − 0.618×(H−L)
R3 = PP + 1.000×(H−L)     S3 = PP − 1.000×(H−L)
```
Symmetry check mandatory: R1−PP = PP−S1.

**Camarilla Pivots (C-centric, intraday):**
```
R4 = C + (H−L)×1.1/2      S4 = C − (H−L)×1.1/2
R3 = C + (H−L)×1.1/4      S3 = C − (H−L)×1.1/4
R2 = C + (H−L)×1.1/6      S2 = C − (H−L)×1.1/6
R1 = C + (H−L)×1.1/12     S1 = C − (H−L)×1.1/12
```
Invariant: R4−S4 = (H−L)×1.1.

**Timeframe coverage:** weekly 3×7 = 21 levels; daily 3×3 days×7 = 63 levels; historical weeks +21 per week with +0.5 legacy bonus. Scoring: exact ≤3 pips = 2; ≤10 pips = 1; legacy = +0.5.

## 26.3 Pillar 2 — Moving Average Confluence Grid (3-4/11 levels)

| MA Period | Weight | Rationale |
|-----------|--------|-----------|
| EMA/SMA 200 | 3.0 | Structural anchor — ~10 months. Pension funds, sovereign wealth |
| EMA/SMA 100 | 2.0 | Long-term trend — ~5 months. Hedge funds, prop desks |
| EMA/SMA 50 | 1.5 | Institutional position builder — ~2.5 months |
| EMA/SMA 20 | 1.0 | Smart money average — ~1 month |
| EMA 9/10 | 0.5 | Short-term momentum — ~1-2 weeks |

**Recapture Detection:** price crossed above a major MA (50/100/200) within the last 3 sessions → RECAPTURE ZONE (+2 bonus) — the MA just transitioned from resistance to support; institutions defend their newly profitable positions.

**Cluster Detection:** triple+ cluster (3+ MAs within 0.15 DXY) = 2 pts; double cluster = 1 pt; single = 0.5 pts.

## 26.4 Pillar 3 — Component Pair Option Expiry Conversion

```
DXY_equiv = 50.14348112 × strike_EURUSD^(−0.576) × spot_USDJPY^(0.136)
            × spot_GBPUSD^(−0.119) × spot_USDCAD^(0.091)
            × spot_USDSEK^(0.042) × spot_USDCHF^(0.036)
```

**Three-Tier Classification (MANDATORY):**
| Tier | Notional | Classification | Confluence Bonus |
|------|---------|---------------|-----------------|
| 1 | ≥ $1.5B | CRITICAL OPTION WALL | INCLUDE always, +3 |
| 2 | $850M – $1.499B | SIGNIFICANT MAGNET | INCLUDE always, +2 |
| 3 | < $850M | EXCLUDED | Override only with 3+ pillar confluence + Pillar 5 validation → +1 |

**Confidence bands:** Tier 1 = ±0.07 DXY; Tier 2 = ±0.10; Tier 3 (overridden) = ±0.15. H.10 fallback: 1 pair supplementary = +0.03; 2 pairs = +0.07; 3+ = LOW confidence. NEVER fabricate a spot rate.

**The NY Cut Cage Effect / Spring Release:** pre-10 AM NY, delta-hedging pins price (the cage); at 10:01 AM the option expires, hedging constraints vanish, price violently breaks (the Spring Release). **The pipeline must track WHICH DAY options expire, not just WHERE they are.**

## 26.5 Pillar 4 — Institutional Commentary Harvesting

3 web searches targeting DXY commentary; extract ONLY explicit S/R levels (no inference); record exact source URL (provenance); flag 2+ Tier-1 agreement as ANALYST CONSENSUS; temporal boundary applies. Scoring: 2+ Tier-1 = 2 pts; 1 source = 1 pt; none = 0.

## 26.6 Pillar 5 — Structural Extreme Scan (the most complex pillar, 6 sub-steps)

**ANTI-SLOP RULE:** FORBIDDEN from estimating behavioral ranges. Every floor/ceiling MUST come from exact, date-stamped, verifiable historical price data.

**Step 0a:** 90-day D1 scan (180-day conditional extension if range overlaps within 1.0 DXY — legacy +0.5 bonus).
**Step 0b:** Swing lows with rejection wicks (lower wick ≥ 0.15 DXY AND close in upper 50% of range) → "Liquidity Sweep Target."
**Step 0c:** Swing highs with rejection wicks (upper wick ≥ 0.15 AND close in lower 50%) → "Supply Ceiling Target."
**Step 0d:** HTF order blocks — demand: base of 1-3 consecutive bullish candles with large bodies preceding a rally ≥ 1.0 DXY points lasting ≥ 5 days. High-conviction: move ≥ 2.0 points AND ≥ 10 days.
**Step 0e:** Cross-reference — swing low inside Demand Zone → "Confluent Floor" (score 2 + Structural Extreme Bonus +2.0); swing high inside Supply Zone → "Confluent Ceiling."
**Step 0.45 (LSZ scan, MANDATORY):** each swing low → "LSZ: [exact low] to [exact low + 0.05]"; each swing high → "LSZ: [exact high − 0.05] to [exact high]"; liquidity gaps ≥ 0.15 DXY → "Hidden Liquidity Zone"; overlap with 4H BoM → "CONFLUENT LIQUIDITY SWEEP + BoM ZONE" (HIGHEST PRIORITY); LSZ within 0.30 of spot → "ACTIVE SL TRIGGER."
**Step 0.45a (v5.0.0):** LSZ bottom edge extension 0.05-0.10 DXY beyond visible extremes (the institutional STOP HUNT ZONE).
**Step 0.5 (Repeated Extreme Magnet, MANDATORY):** levels on 2+ dates within 0.05 DXY → "Repeated Extreme Magnet"; 2 dates = +1.5; 3+ = +2.0; Role Reversal = +2.0; inside HTF OB → "Institutional Magnet" (max structural score).
**Step 0.6 (Intra-Zone Key Level):** for MODERATE+ zones: scan interior for 1H zones, Fib retracements, prior daily closes, round numbers → Precision Floor (bottom 40%) / Precision Ceiling (top 40%) / Mid-Anchor (middle 20%); score 0.5.
**Step 0f (4H S/D scan, MANDATORY):** SINGULAR CANDLE CONSTRUCTION RULE (ZERO TOLERANCE): zones from the SINGLE candle immediately preceding a strong directional move (≥0.5 DXY points, ≥3 days). Zone range = [Low of origin candle, High of origin candle]. Date-stamp the origin candle.

**Zone Classification:**
| Type | Origin Candle Criteria |
|------|----------------------|
| BoM | Prior move direction NONE or OPPOSITE. FIRST supply/demand in that direction |
| MoM | Prior move direction SAME. Formed mid-move |

**BoM quality gates:** body-to-wick ratio ≥ 3.0; origin body ratio ≥ 0.65 (body/(high−low)).

**Mitigation tracking:** 0 = 0X (BoM fortress 100% reaction / MoM DEATH ZONE); 1 = 1S (~unmitigated, strong); 2 = 2S (weakened); 3 = 3X (likely to fail); 4-5 = 4-5X (PARADOX — fortress candidate). **CRITICAL HIERARCHY: Zone Type > Mitigation Level > Trend Context. An unmitigated MoM in an opposing trend is WEAKER than a 2X mitigated BoM.**

**4H noise rejection (exclude if ANY):** wider than 0.40 DXY; MoM 3X+ in opposing trend; >3 weeks old with no recent interaction; no IP overlap within 0.50 AND not BoM 0X-1X.

**Step 5.5 Key Support Band Tightening:** Zone Core (bodies, full score) vs Zone Spike (wicks, half score, "LSZ extension").

## 26.7 Pillar 6 — Fibonacci Retracement & Round Number Grid

Fib retracements from prior week range: 0.236, 0.382, 0.5, 0.618, 0.786, 1.0. Round numbers: .00, .25, .50, .75. Scoring: .00/.50 = 2 pts; .25/.75 = 1 pt; Fib+round alignment = confluence bonus.

## 26.8 Pillar 7 — Derivatives Arena Boundary Definition

**Status: BLOCKED** — ICE Futures EOD Report + CME QuikStrike both unavailable (403/UNSTABLE). Falls back to 9-Pillar primary mapping. No dedicated scoring dimension. **Single point of failure: investinglive.com for OTC option data (Pillars 3+8). If it goes down, Options-Derived collapses to 0 for all zones, and no zone can score above 10.**

## 26.9 Pillar 8 — EUR/USD Strike-to-DXY Primary Conversion

```
DXY_equiv = K × strike_EURUSD^(−0.576)
K = 50.14348112 × USDJPY^(0.136) × GBPUSD^(−0.119) × USDCAD^(0.091)
                × USDSEK^(0.042) × USDCHF^(0.036)
```

EUR/USD = 57.6% of DXY's per-pip sensitivity — DOMINANT, more than all other 5 pairs combined (42.4%). Mixing into Pillar 3 would dilute it 5.2×. K is a "freeze-frame" — the partial derivative of DXY with respect to EUR/USD.

## 26.10 Pillar 9 — Regime Detection, Zone Failure Prediction & Breakout Magnitude

**ZFP = base_failure_prob(zone_type) + Σ modifiers**

| Zone Type | Criteria | Base ZFP |
|-----------|---------|----------|
| Hard Wall | CRITICAL OPTION WALL + 3+ pillars + Confluent Floor/Ceiling | 5-15% |
| Standard Wall | SIGNIFICANT MAGNET + 2+ pillars | 15-30% |
| Soft Wall | EXCLUDED tier or 1-2 pillars | 30-50% |
| One-Touch | Only 1 pillar, no option wall | 50-70% |
| Post-Expiry Ghost | Option expired, structural memory remains | 20-40% |
| LSZ | Prior exact swing low | Special: brief breach then reversal |

**ZFP Modifiers:** option expiry timing +20-30%; macro catalyst aligned against +15-25%; increasing momentum toward +10-20%; cross-pair confirmation +15-25%; cascade effect (prior zone broke) +20-30%; regime change (EMA 200 cross) +15-25%.

**ZFP > 45% = BREAKOUT THRESHOLD** (SS→BS transition). **ZFP < 20% = HARD WALL** (BS→RWL transition).

**Measured Move Projection (ZFP > 45%):** `Measured Move Target = Breakout_Point + Range_Height`.

**Pressure Degree from Confluence — the Step Function:**
| Score | Pressure Degree | ZFP Range |
|-------|----------------|-----------|
| 12-14 | EXTREME | <10% |
| 10-11 | HEAVY | 10-25% |
| 8-9 | MODERATE-HEAVY | 20-35% |
| 6-7 | MODERATE | 30-45% |
| 4-5 | LIGHT | 40-60% |
| 0-3 | MINIMAL | >60% |

The most impactful single-point transition is **7→8** (MODERATE→MODERATE-HEAVY, ZFP shift 10-15%) — worth MORE than 11→12 (5-10%).

## 26.11 Confluence Scoring — Complete Synthesis (0-14)

1. Collect ALL levels from ALL 9 pillars, sort highest to lowest, DO NOT filter by spot proximity
2. Score across 6 dimensions (0-2 each, max 12) + Structural Extreme Bonus (max +2)
3. Mandatory Level Clustering Scan: 3+ levels within 0.15 DXY = HIGH-DENSITY ZONE; pairs within 0.10 = TIGHT CONFLUENCE
4. Group into zones where levels cluster within 0.10-0.15 DXY
5. Pressure degree from the group's highest-scoring level
6. ZFP from Pillar 9 + Measured Move Projection
7. Name by structural role: RESISTANCE CEILING / UPPER RESISTANCE / EQUILIBRIUM ZONE / MID-RANGE SUPPORT / KEY SUPPORT BAND / LIQUIDITY SWEEP ZONE / BREAKOUT EXTENSION TARGET
8. Flag ZFP > 50% as BREAKOUT RISK
9. Post-Consolidation Modifier: +1 confluence for zones formed after consolidation
9.5. Gap Scan (MANDATORY): gaps ≥ 0.20 DXY → "GAP IN-FILL LEVEL" if 2+ supporting signals
9.7. POI Tier Classification: Tier 1 = IP overlaps 4H BoM (0X-1X) → primary trade location +2; Tier 2 = IP-only → secondary +1; Tier 3 = 4H-only → informational
9.8. Zone Synthesis Re-Verification: verify option strikes ≥$850M from R1 pairs (EU/GU/AU); downgrade to 0 if contaminated

## 26.12 The BoM vs MoM Classification — Complete Detail

**BoM (Beginning of Move):** the zone at the VERY BEGINNING of a BS/WL move. DEEPEST institutional commitment — institutions who started the move have "base camp" orders. 100% guaranteed reaction if unmitigated. Origin's prior move direction NONE or OPPOSITE.

**MoM (Middle of Move):** continuation zones formed DURING a move. "Cooling Fire." LADDER STEPS ONLY for trend-aligned trades. "Do not take reversal entries on MoM zones. EVER. Guaranteed loss." Origin's prior move direction SAME.

**4H MoM:** "ONE-AND-DONE" — first retest produces a minor reaction, then strong pierce. Not valid for swing entries.

**The MoM Ladder Step Rule (v5.3.0 — CRITICAL):** MoM zones are ONLY used as LADDER STEPS for trend-aligned trades that surf existing momentum. Reversal entries on MoM zones are FORBIDDEN. MoM zones in the PATH of a confirmed move = valid ladder steps. MoM zones that OPPOSE the move = TP targets (Fire that will be consumed).

## 26.13 The Reaction Counter — Complete Mechanics

| Count | Status | Reaction Rate | Entry Validity |
|-------|--------|--------------|----------------|
| 0 (Virgin) | UM if BoM (100% reaction). DEATH ZONE if MoM | 100% (BoM) / 0% (MoM) | BoM: ENTRY-PRIMARY. MoM: auto-REJECT |
| 1 (Active) | Still has juice | ~80% | BoM: valid. MoM: conditional (4 exceptions) |
| 2 (Active) | Weakening | ~50% | BoM: valid. MoM: conditional |
| 3+ (Depleted) | Likely to fail | <30% | TP target ONLY |
| 4+ + strong reactions | FORTRESS ZONE | 95% direction flip | Phase transition Fire→Earth |

**MoM Entry Exceptions (ALL 4 required):** 1) ≥ 1 prior strong reaction; 2) trend-aligned; 3) key S/R confluence; 4) opposing liquidity weak or absent.

**The 1-2-3 Retest Timing Pattern:** 1st test (virgin): scalp only. 2nd test: confirmation. 3rd test: swing entry valid — NOT because the zone is stronger (it's weaker) but because LIQUIDITY HAS ACCUMULATED around the zone (each test deposited new retail stop-losses; by the 3rd test enough Earth has accumulated to fuel a swing move).

---

# PART 27 — THE QUANTITATIVE WORKED EXAMPLES (Bible 4.0 Appendices F & G)

## 27.1 Engine 1 Worked Example (Appendix F)

**Given:** DXY spot 100.50; prior week H=101.00, L=100.20, C=100.60; EUR/USD option strike 1.0850, notional €2B; component spots USDJPY=149.50, GBPUSD=1.2700, USDCAD=1.3600, USDSEK=10.500, USDCHF=0.8800.

**Step 1 — Pivots:** PP = (101.00+100.20+100.60)/3 = 100.60. R1 = 2×100.60−100.20 = 101.00. S1 = 2×100.60−101.00 = 100.20. R2 = 100.60+0.80 = 101.40. S2 = 99.80. R3 = 101.00+2×(0.40) = 101.80. S3 = 100.20−2×(101.00−100.60) = 99.40. Note: PP = C (close at range midpoint) → R1 = H and S1 = L exactly — natural confluence.

**Step 2 — K factor:** USDJPY^0.136 = e^(0.136×5.0073) = 1.9758. GBPUSD^(−0.119) = e^(−0.119×0.2390) = 0.9719. USDCAD^0.091 = e^(0.091×0.3075) = 1.0284. USDSEK^0.042 = e^(0.042×2.3514) = 1.1038. USDCHF^0.036 = e^(0.036×−0.1278) = 0.9954. K = 50.14348112 × 1.9758 × 0.9719 × 1.0284 × 1.1038 × 0.9954 ≈ **108.78**.

**Step 3 — EUR strike → DXY:** DXY_equiv = 108.78 × 1.0850^(−0.576). 1.0850^(−0.576) = e^(−0.576×0.08158) = e^(−0.04699) = 0.95410. DXY_equiv = 108.78 × 0.95410 = **103.78**.

**Step 4 — Notional classification:** €2B × 1.0850 = $2.17B equivalent → CRITICAL OPTION WALL (≥$1.5B). Options-Derived = 2. Confluence +3. Confidence ±0.07 DXY.

**Step 5 — Confluence:** EMA 50 at 103.70 → 1 pt Technical. Prior swing high 103.75 (45 days) → 2 pts Structural. Repeated extreme (2× in 90 days) → +1.5. 103.78 not round → 0 Psychological. forex.com "103.80 resistance" → 1 pt Analyst. Zone in momentum → 1 pt Regime. Base = 1+2+1+2+0+1 = 7, +1.5 = **8.5 → 8 or 9**. Pressure = MODERATE-HEAVY. ZFP = 20-35%.

**Step 6 — ZFP refinement:** Base (CRITICAL WALL + multiple pillars) ~10%. Pre-10 AM: +0 → ~10% (Hard Wall). Post-10 AM (Spring Release): +25% → ~35% (Mid-range). **The temporal cliff: at 10:00 AM NY this zone transitions from Hard Wall (ZFP<20%) to Mid-range (ZFP 20-40%). Shape flips from WL to R.**

## 27.2 The DXY Forward-Mapping Worked Example (Appendix G — July 6-10, 2026)

**Step 1 — Current shape:** Spot ~101.00. Ceiling 101.14 (ZFP ~25%), floor 100.845 (ZFP ~20%). Both < 30%. Duration > 1 session. Shape: **SS**. 4H validation: range-bound.

**Step 2 — Transition assessment:** ceiling ZFP trending upward (Monday options). Ceiling ZFP crosses 45% → SS→BS (up); floor crosses 45% → SS→BS (down); both < 30% → SS continues.

**Step 3 — Chain extension:**
```
SS (Mon-Tue) → [ceiling ZFP > 45% from Monday expiry Spring Release]
→ BS (Wed, SHORT — price surges up then reverses)
→ [reaches Hard Wall at 101.235 (ZFP < 20%)]
→ RWL (Wed, LONG — violent bounce)
→ [reaches supply at 101.235+ (ZFP < 20%)]
→ BS (Wed afternoon, SHORT — final crash)
→ [reaches UM demand at 100.680 (ZFP < 10%)]
→ WL/R (Thu-Fri, LONG — reaction at deepest UM zone)
Chain confidence: 65%
```

**Step 4 — Alternative chain:** PRIMARY: SS → BS → RWL → BS → WL. DECISION ZONE: 101.14 ceiling. If ZFP stays < 30%: ALTERNATIVE: SS → SS → SS → late BS Thursday/Friday (30% confidence).

**Step 5 — Day decomposition (Trading Speed Rule +1 day):**
```
Mon: SS (range-bound) | Key zones: 100.945 (floor), 101.14 (ceiling) | Monday option expiry 10AM
Tue: SS → early BS signs | Key zone: 101.14 under pressure | post-expiry drift
Wed: BS (SHORT surge + crash) + RWL (bounce) | Key zones: 101.19, 100.975, 101.235 | CPI release
Thu: R/SS (consolidation at bottom) | Key zone: 100.680 UM demand | Thursday auctions
Fri: WL/R (reaction at UM demand) | Key zone: 100.680 | Friday option expiry 10AM
```

**THIS IS THE TEMPLATE FOR projectZoneForDay — the E2 output must designate EXACT zone IDs per day, not just shapes.**

---

# PART 28 — THE CONTAINER / BROWSER STACK (operational canon)

## 28.1 The Stack (bottom to top)

```
Layer 0: Docker container (--init for zombie reaping, --network host)
Layer 1: dbus session bus
Layer 2: Weston 9.0 (headless-backend.so, 1920×1080, xwayland.so module)
Layer 3: XWayland → X11 display :0 (/tmp/.X11-unix/X0)
Layer 4: Chromium 120 (--ozone-platform=x11, CDP port 6930)
Layer 5: TradingView SPA (WebGL canvas, logged in via persistent profile)
Layer 6: Chrome Watchdog (10s interval, HTTP + WebSocket dual-check, auto-restart)
Layer 7: TV Browser MCP (36-38 tools, stdio JSON-RPC, CDP WebSocket on 6930)
Layer 8: Plutus Plugin (9 tools + 4 hooks + allowlist + identity)
Layer 9: opencode agent (plutus agent, TUI interface)
```

## 28.2 WHY Weston (the compositor problem — NEVER "simplify" to Xvfb)

TradingView's chart is a WebGL canvas. CDP Input.dispatchMouseEvent creates synthetic PointerEvents with isTrusted: false. **Without a compositor, the WebGL canvas filters out untrusted events — clicks land on the DOM container but never reach the canvas.** With Weston/XWayland, events are processed through the compositor's input pipeline. Xvfb is PURGED from the image (`apt-get purge -y xvfb && rm -f /usr/bin/Xvfb /usr/bin/Xvfb.real`) to make the simplification impossible.

**What breaks without Weston:** drawing tools (flyout clicks), canvas drag/pan, scroll-zoom, ALL tv_draw_* MCP tools fail silently.

## 28.3 Port History (three ports exist — use 6930)

| Port | Era | Status |
|------|-----|--------|
| 9228, :3 | Xvfb era (3.x) | OBSOLETE — TvChartController hardcodes it, does NOT work |
| 9333, :1 | Desktop MCP source | WRONG for container |
| 6930, :0 | Current container | CORRECT — verified on running containers |

## 28.4 Chrome Watchdog (167 lines, self-healing)

Dual checks: HTTP health (curl /json/version) catches complete crashes; WebSocket health (Runtime.evaluate "1+1" → "2") catches zombie renderers. Self-heal: pkill -9 → auto-detect display from weston.log → restart with identical flags → wait 30s → reset counter. 10s interval, 5s renderer timeout, 5 restarts before 60s give-up.

## 28.5 TradingView Login Persistence

Profile bind-mounted: `docker run -v "$(pwd)/container_data/browser_profile:/tmp/tv-browser-profile"`. Cookies survive restarts. Login flow (if expired): navigate signin → Email button → fill email/password → Sign in → verify no popup ("Look first"/"Join for free" absent).

## 28.6 The Image

`plutus-container-testing:clean-v421` (post BUG-19): node:20-bullseye, pinned opencode 1.14.43/bun 1.3.14, Weston 9.0, Chromium 120, Python 3 + tvDatafeed, TV Browser MCP pre-built (spawn tools removed, port 6930, DISPLAY :0). **Shadow_Agents hive-fleet-manager is STOPPED + DISABLED (BUG-19).**

---

# PART 29 — THE 8 WINNING TRADE PATTERNS (the pattern library every build must support)

## 29.1 Pattern 1: SS → BS (Consolidation to Breakout Surge)

**Shape chain:** SS (2-5 sessions) → BS (breakout through failing boundary). One boundary's ZFP rises above 45% → the boundary fails.

**Reference (GBP/USD 15m, Feb 27-Mar 3 2025):** consolidation 1.2735-1.2795 (60p); breakout SHORT; trigger: liquidity sweep below 1.2735; entry 1.2730; SL 1.2795; TP 1.2650-1.2660; move 85 pips; RRR ~12:1. **Pipeline requirement: detect SS range, identify which boundary's ZFP is rising, predict breakout direction, generate BS entry at the boundary break.**

## 29.2 Pattern 2: Swing Scalps (Pure Consolidation Week)

**Shape chain:** SS all week. Both boundaries hold (ZFP < 30%). Scalps at range boundaries — LONG at demand floor, SHORT at supply ceiling.

**Reference (GBP/USD 15m, Apr 17 2026):** range 1.3508-1.3548 (40p); primary scalp entry 1.35060, SL 1.34998 (6.2p), TP 1.35398 (33.8p); RRR 6.5:1; London Open. Multi-TF: 4H demand + 30m demand + 15m supply. **Pipeline requirement: detect SS with both boundaries < 30% ZFP, generate Consolidation setups at BOTH boundaries, London session, scalp SL/TP within range.**

## 29.3 Pattern 3: R → BS/WL (Recovery to Breakout/Whiplash)

**Shape chain:** BS → R → BS/WL. **Reference (GBP/USD 15m, Feb 18 2026):** recovery zone 1.3530-1.3560 (1x MoM); recovery base 1.3510-1.3520; whiplash trigger 1.3580-1.3585 (30m UM MoM supply). Recovery LONG 1.3535/1.3510/1.3580 +45p. Whiplash SHORT 1.35615/1.3674/1.35255 +36p. Rockets 1.3555/1.3540/1.3520. Combined RRR 10.8:1. **Pipeline requirement: predict R phase, identify opposing MoM as whiplash trigger, generate BOTH as trade chain, place rockets at Fib levels.**

## 29.4 Pattern 4: BS → R/RWL (Breakout to Recovery/Reverse Whiplash)

**Shape chain:** BS → R or BS → RWL (highest R:R pattern). Strong BS reaches its target BoM zone. UM → RWL; mitigated → R.

**Reference (GBP/USD 15m):** BoM origin 1.2300-1.2350 (1H UM BoM) + 1.2250-1.2300 (4H UM BoM); breakout peak ~1.3650 (~1300 pips); recovery zone LSZ 1.3500-1.3550; SL management initial below 4H BoM → BE at 1.2350; key resistance 1.3600-1.3650 (1H Refined 4H 3x BoM); combined RRR 3:1+. **Pipeline requirement: track BS from BoM origin, predict RWL at target BoM, generate reversal entry at the reaction, cascade the SL.**

## 29.5 Pattern 5: PBS → R → WL(S) (Piercing Breakout → Recovery → Whiplash Sequence)

**Shape chain:** PBS → R → WLS. **Reference (GBP/USD 1H):** PBS from 1.3100 to 1.3520 (~420p); recovery consolidation 1.3280-1.3380; WLS 14-15+ candles oscillating 1.34200-1.35250; resolves into SS or PBS. Entries: LONG at storm bottom 1.3280-1.3300/1.3220/1.3400-1.3500 (2:1-3.67:1); SHORT at storm top 1.3370-1.3380/1.3400/1.3280-1.3200 (5:1-9:1). Fib: 38.2% = 1.3330, 50% = 1.3310, 61.8% = 1.3290, 78.6% = 1.3250, 1.618 ext = 1.3500.

## 29.6 Pattern 6: R → WL (Recovery to Whiplash)

**Reference (GBP/USD 30m, Apr 15-17 2024):** entry 1.3515 (post-rejection); SL 1.3540 (above liquidity spike wick, OUTSIDE supply); TP 1.3425 (lower UM demand/LQZ); RRR 7-9:1; post-London rejection → NY continuation. Fib: 0.786 = TP confluence; 1.272/1.618 = whiplash spike confirmation.

## 29.7 Pattern 7: WL → RWL/R (Whiplash to Reverse Whiplash/Recovery)

**Reference (GBP/USD 1H):** initial WL ~1.3900 (stop hunt above resistance); WL entry (LONG) ~1.3850/1.3800/1.3900 (1:1); **RWL entry (SHORT) ~1.3900/1.3950/1.3750 (3:1 — the REAL trade).** "The WL entry captures the bounce FROM the Hard Wall. The RWL entry captures the reversal BACK from the bounce point."

## 29.8 Pattern 8: LIQUIDITY LADDERS (Highest R:R — 25-30x Combined)

**Reference (GBP/USD 1H):** primary entry 1.31800/1.31100/1.33000 (1.7:1); middle rocket 1.33000/1.32700/1.33670 (base SL → BE); upper rocket 1.33670/1.33300/1.34915 (middle SL → BE); combined 311 pips reward / 70 pips risk = 25-30x with position sizing (50/30/20). Fib: base 1.31800 = 0.0; middle 1.33000 = 0.5; upper 1.33670 = 0.618; final TP 1.34915 = 1.618. **Pipeline requirement: primary at BoM, MoM zones along path, stop-limit at each MoM, SL cascade (each trigger → prior SL to BE), combined R:R across positions.**

---

# PART 30 — THE 5 CRITICAL BUGS (Bible 4.0 Appendix P — the era's forensic foundation)

## 30.1 Bug #1: SL CALCULATION STRUCTURALLY WRONG — CRITICAL

**Current (V2):** `SL = zone_edge + SNIPER_BUFFER[pair][category]` — fixed 8-15 pips.
**Correct:** `SL = next_structural_zone_edge + 2-5 pip buffer`.

**The exact failure with numbers:** 15m demand zone floor 1.36220, ceiling 1.36327, width 10.7 pips. Entry 1.36327 (ceiling, LONG). Winning trade SL 1.36220 (floor) = 10.7 pips. Engine 3 SL = 1.36327 − 8 pips = 1.36247 — **ABOVE the zone floor, INSIDE THE ZONE.** When price tests a demand zone it typically: touches ceiling → penetrates 1-5 pips into zone → wicks near floor → reverses. The winning trade survives the wick (SL at floor); Engine 3's SL is hit by a NORMAL WICK.

**Cascading damage:** WIN recorded as LOSS → win rate 70%→30% → confidence drops → RR appears terrible → pipeline rejects similar setups forever.

**Why fixed buffer is structurally wrong:** 8 pips is 2.67× too wide for a 3-pip zone; 53% too narrow for a 15-pip zone; perfect only for ~10-pip zones (coincidence — why SOME setups survived).

## 30.2 Bug #2: TOO MANY TRADES ON ONE DAY — HIGH

Same zone+direction+category generated a DIFFERENT setup for each day (dedup key included day). Evidence: 5 trades on Tuesday. **Correct: maximum 2 setups per day per pair, top 2 by confidence** — the user does NOT overtrade; they wait for the BEST setups. (Note: this is a REPORT hygiene rule, not a count cap — D38 supersedes the "max 2" mechanics with the >12-per-pair slop rule + 6-11-per-pair target.)

## 30.3 Bug #3: SESSION TIMING DECORATIVE — HIGH

Session assigned by category but entry is a LIMIT ORDER that fills ANY TIME — including Asian. Evidence: July 6-10: 0/10 pipeline setups filled during assigned session; ALL filled during Asian (00:00-02:00 ET); all reversed and hit SL. **Correct: session filter CONDITIONAL on liquidity score** — ≥7 any session; ≥5 London/NY only; <5 reject.

## 30.4 Bug #4: REINFORCEMENT ROCKETS AT WRONG EDGE — MEDIUM

V2 placed Mechanism B rockets (at further zones) using Mechanism A logic (within the same zone). **Mechanism A (intra-zone staggered):** rockets go DEEPER into zone from primary, toward SL (averaging in). **Mechanism B (cross-zone ladder):** rockets at FURTHER zones toward TP (scaling into a winning trade).

## 30.5 Bug #5: LSZ ENFORCEMENT SOLVING A NON-PROBLEM — MEDIUM

Mandatory LSZ shield check between entry and SL REJECTED valid setups. Evidence: in 84% (32/38) of winning trades there is NO separate LSZ between entry and SL — the entry zone ITSELF is the shield; SL at opposite edge + buffer. In 16% (6/38) there IS a separate LSZ — SL placed behind it.

---

# APPENDIX C — THE SMC CROSS-REFERENCE (TTE is a SUPERSET of SMC)

| SMC Concept | TTE Element | Classification | Key Difference |
|-------------|-------------|----------------|----------------|
| Order Block | Fire density | BoM or MoM | SMC treats all OBs same. TTE adds critical BoM/MoM distinction |
| Supply/Demand Zone | Fire density | BoM or MoM | Identical identification, TTE adds classification |
| Liquidity | Earth density | LSZ or IP Zone | TTE graduates density: thin/standard/heavy |
| Liquidity Sweep | Earth event + Water shape | WL or BS | SMC sees event. TTE sees shape materialization |
| Break of Structure | Fire ignition | SS→BS transition candle | SMC structural. TTE adds shape chain context |
| Fair Value Gap | Fire evidence | Space Fire burned through | TTE sees as evidence of Fire density |
| Flip Zone | Fortress Zone | Earth-dominant transition | TTE maps to 4+ test phase transition |
| Mitigation Block | Heavily mitigated Fire | MoM at reactionCount 3+ | TTE tracks per-TF mitigation |
| Fibonacci | Air density | Air density | Identical mapping |

**TTE concepts WITHOUT SMC equivalent:** Earth-Fire overlap requirement; conservation of energy; rocket reinforcement architecture; pair-specific elemental profiles; shape chain prediction.

---

# APPENDIX D — THE GLOSSARY (era terms)

**BattleMs:** the setup's battle timestamp (when it FORMED). Fill activates at max(session start, battleMs); expires 21:00Z trade-day.

**DayBand (v4.6 Wave 2, now mandated):** E2's forward projection of each day's predicted spot at London session open; day-native gates use the trading day's predicted price.

**defendedEdge:** the modal body-close of a zone-matrix's defending candles — the ENTRY anchor.

**F1-A / F1-B:** SHORT-entry edge lift (entry = band top − 1 pip when in lower half) / defended-transit entry (probe-and-reclaim, Law-31 first-transit).

**GeomSig:** the geometry fingerprint `direction|entry|sl|tp` — the dedup identity that kills byte-identical re-fires.

**LmvTable:** the price-ordered stack of all LQZ zone-matrices (48 DXY / 55 EU / 61 GU for the golden week).

**MDVE (Mathematical Data Vision Engine):** the v4.4 umbrella — ChartModel as total function from OHLC; the LQZ matrix + OB detection + narrative.

**OBCV (Order Block Candle Vision):** the 2026-07-31 machine — finds ALL order blocks via displacement field + origin-candle feature matrix + prior-move classifier + telescoping incidence.

**PROBE_GUARD:** lifts SL to probe ± Law-7 buffer when the computed SL sits inside the battle's own deepest wick.

**reactionExtreme:** the min/max wickTip of a zone-matrix's reaction candles — the SL anchor.

**Scaffolded Visual Verification:** the Codex's root-cause solution — harness PROPOSES a deterministic candidate ladder from each week's OWN data, model VERIFIES freshness/evidence, harness DECIDES + VERIFIES.

**shapeDay (E2):** the per-day shape prediction (keyZoneId/keyZonePrice/supplyZonePrice/demandZonePrice) that E3's selectPairNativeZone consumes — AUTHORITATIVE per 2026-07-31.

**TVI (Trading Visual Intelligence):** the deterministic enforcement stack (VKG/VCM/VST/VEB/VGS/ZIP/VLD/VTM) — "the model PERCEIVES, the harness DECIDES, the harness VERIFIES."

**weekProbeAtAnchor:** the deepest adverse probe at an anchor within the model week — LMV candle wicks reaching INTO the anchor band ARE adverse anatomy.

---

*END OF PART 26-30 + APPENDICES C-D — continued in the next file segment.*
# PART 31 — THE 2026-07-31 SESSION RULINGS (VERBATIM, FROM THE OPERATOR DIRECTLY)

> These rulings were given directly in the 2026-07-31 overhaul session. They are the MOST RECENT operator doctrine and supersede anything conflicting. Quoted verbatim.

## 31.1 The Telescoping Doctrine (E1 fundamental)

> "Rule of thumb S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"

> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"

> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"

> "All of these are telescoping refinment procedures. looks like last agnet just stopped at step 1."

**The diagnosis:** "The zone map is built from 4H bars only" — "something derailed here... full telescoping procudure needs to be wired in for E1 this is extremely important. If E1 is fucked everything that is built on top of it also gets fucked."

## 31.2 OBCV — Order Block Candle Vision (the new machine)

> "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function. I dont think matrices apply here like they do with LQZ since there arent dozens of candles reacting to the same level that can be grouped into matricies and detected."

> "and then these 2 become the biggest levers because once these 2 are 96%+ accurate then 90% of the work in charting zones is done from the start already and we have the exact candles/price anchors for nearly all the zones already computed"

## 31.3 RRR ≥ 3.0 Minimum (the absolute emission floor)

> "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM."

**On the refinement machine:**
> "RRR failed does not mean instant hard reject often the E/SL/TP is wrong on a correct analysis so we need the retry loop with an intelligent E/SL/TP refinment machine that provides the correct mental frameworks for adjusting these surgically to maximize RRR while still staying on the correct zone anchros. Most of these 1.5-2 R trades can easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones that are already thethered to. this is purely a lack of precision and dumb trade setups"

## 31.4 The Interleaved Pipeline Order (the exact architecture)

> "DXY E1/E2/E3"
> "EU E1 --> DXY Inverse E2 Cascade --> E2 --> DXY Inverse E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ EU specific emrgent trades added on top of DXY-inverse-cascade setups"
> "GU E1 --> EU E2 Cascade --> E2 --> EU E3 Cascade (ZONE ANCHORED Trade Setups not Price Anchored) --> E3 w/ GU specific emrgent trades added on top of EU-cascade setups"
> "this preserves macro structure while also allowing for pair specific variance"

## 31.5 Friday Spot — Monday E2 Only

> "friday spot is only relevant to MONDAY E2 SHAPE prediction after that it is compltely irrelevant"

> E2 must "forward map the predicted spot price of that day at london session open and we dont have the dumb bug of 'all entries are rejected because they dont match friday spot price of the previous week' these need to be relevant to the trading day and accurately forward predict everything accordingly"

> "make it E2 waveform based not dumb fucking friday spot price based"

## 31.6 The Golden-LQZ Oracle (the definitive LMV test)

> "this is the definitive test of LMV. LMV is the most important machine in the MDVE - if it cannot copute these LQZs there is a major issue we need to address"

The 7 golden DXY levels: **100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240** — must appear in the map, computed not hardcoded.

## 31.7 The Frozen-File Revision

> "i need clarity on the above because if the current LMV + LQZ matrix are not identifying any of the gold standard LQZs then they obviously need modification and the current versions are just working prototypes"

## 31.8 v4.5.1 = The New Locked Baseline

> "we are ebyond this now 4.5.1 is the new baseline which i have alos locked immutable"

(supersedes v4.4_MARKET_READY_BASELINE as the locked immutable reload anchor)

## 31.9 The Bible Requirement

> "we need to create an updated v4.5 bible that is supplementary context to the 4.0 bible so that everything that is NOT written in the 4.0 bible that we now have full primary context of is fully self contained in the 4.5 bible so fresh agents can just read both sequentially and absorb FULL context this should alos be 3000+ lines of equally dense and precise detail as the current bible"

## 31.10 The Spec Requirement

> "after 4.5 bible is written then a proper engineering spec for this 4.5.2 overhaul needs to be written to shark cme level (explore agent hive context extract the full macro structure and micro detail precision for this) covering everything from phase 2 to 8"

## 31.11 src/ Is the Working Tree

> "this is stupid. this is where the project work should be done. checkpoints is where we SAVE WORKING CHECKPOINTS of the codebase as static reload anchors"

## 31.12 The Screenshots Clarification

> "these screenshots are basic as fuck and all i did on them was draw the trade setups. thats it. theres no visible zones anywhere. the green boxes are entry --> TP and the red boxes are SL zones. these are trade setup draw tools from TV just mapping the trade setups. white box = the trading week's price action"

## 31.13 The 101.235/101.240 Decision

> "do what make sense and aligns with the visual example I've given you"

The drawn map shows 101.235, 101.240, 101.250 as THREE separate rungs → **two distinct rungs (101.235/101.240) + modal-cluster emission + 1-pip LQZ dedup + 30m/15m telescoped LMV runs.**

## 31.14 The 8 Immutable Operating Constraints (wired in)

> "100% agree wire this in as immutable operating constraints for this build."

1. Precision is the ONLY metric — 3-pip count, never a looser tolerance
2. Never lower standards to inflate metrics — RRR ≥ 3.0 minimum, 4+ norm
3. Fix the map, not the ranking — levels must EXIST first (telescoping → LMV → OBCV in that order)
4. E2 designates the zone, E3 obeys (keyZoneId authoritative)
5. LQZ runs 1H→30m→15m; BoM 4H/1H only; 30m MoM only
6. No repeat of the 18 documented derailments (8 Bible 4.0 + 10 session)
7. DXY provides direction, the pair provides levels; zone-anchored, never price-anchored; Friday spot is Monday-E2-only
8. Don't stop; don't fake coverage; verify mechanically

---

# PART 32 — THE E2 CASCADE MODULE (shape-cascade.ts — the current implementation)

## 32.1 The Module (175 lines, B-ONLY)

`cascadeShapeChain(dxyChain, dxyModel, euModel, guModel) → { eu, gu }`:
1. Copy the shape sequence (SS/BS/R/WL) — the macro move is the same
2. Invert direction for EU (DXY LONG → EU SHORT)
3. Keep direction for GU (EU SHORT → GU SHORT)
4. Find the key zone on the target pair:
   - Extract the DXY key zone's class (BoM/MoM/LQZ) and role (supply/demand)
   - Invert the role for EU; keep for GU
   - Find the target pair's strongest zone of that class + role + side
   - That zone becomes the shape day's keyZoneId

## 32.2 The Data Flow (current, verified)

```
report-v452.ts:103-105  buildChartModel per pair (1H + 4H + 30m bars)
    ↓
report-v452.ts:392      shapeChains = { dxy, eu, gu }  (per-pair ShapeBrain + cascadeShapeChain)
    ↓
report-v452.ts:417      cascadeV45(setups, models, ctx, shapeChains)
    ↓
mirror.ts:2060-2065     euShapeDay = shapeChains.eu.chain[dayIdx]
mirror.ts:2094-2099     guShapeDay = shapeChains.gu.chain[dayIdx]
    ↓
reAnchorMirror          → selectPairNativeZone(..., shapeDay)
                        → computeLmvTP (no shapeDay param yet — SPEC §4.3 proposal)
```

## 32.3 The Failure (why it's inert for precision)

- The E2 signal is ADVISORY: `shapeTierBonus = 2 × (1 − proximity/scaleRange)` — at most +2 tiers, never overriding the base strength ranking
- `buildDayDecomposition` (shape-brain.ts:807-999) emits `keyZone` as a DISPLAY LABEL STRING ("Range: X ↔ Y", :877) — not a machine zone ID
- `projectZoneForDay` DOES NOT EXIST anywhere in src/ (grep-verified 2026-07-31) — the day logic is spot-anchored (Friday model spot is the gate reference for every day)
- `computeLmvTP` has NO shapeDay param (SPEC §4.3 is a proposal, not code)

**The 2026-07-31 fix:** make E2 AUTHORITATIVE — exact keyZoneId match → return immediately; projectZoneForDay must emit ENTRY rungs (supply ABOVE for SHORT days, demand BELOW for LONG days); DayBand forward projection of the day's London-open spot; Friday spot Monday-E2-only.

---

# PART 33 — THE REPORT CHAIN (report-v452.ts — the end-to-end path)

## 33.1 The Execution Sequence

```
1. Load fixture /tmp/opencode/bars_raw.json (DXY/EU/GU/AUD × 4H/1H/30m/15m, golden week)
2. Filter bars to timestamp <= ANCHOR_MS (Friday close — the temporal anchor)
3. buildChartModel(pair, WEEK, bars1H, bars4H, bars30m, spot) for DXY, EU, GU
4. ShapeBrain per pair + cascadeShapeChain → shapeChains
5. generateSourceSetupsV45 (DXY source lane — F1-A/F1-B/dual-entry/battleMs)
6. cascadeV45(dxySetups, models, ctx, shapeChains) → EU/GU mirrors
7. floorSetupsToDedupRows → trade-dedup → accurate-stats
8. report_v452.md written
9. Determinism: sha256 ×2 must match
```

## 33.2 The DXY Source Lane (setup-gen.ts — generateSourceSetupsV45)

**The v4.5.1 pristine chain (BYTE-PRESERVED):**
```
anchor selection → entryPrice_LMV (defendedEdge) → computeSL_LMV + PROBE_GUARD
→ computeMirrorTP (DXY) / computeLmvTP (EU/GU mirrors)
```

**F1-A SHORT-entry edge (setup-gen.ts:552-571):** SHORT OB entries land at band top − 1 pip when in lower half.
**F1-B defended-transit (setup-gen.ts:445-507):** probe-and-reclaim; entry = lmvZone.center at :550; Law-31 first-transit.
**Dual-entry 15p (setup-gen.ts:735-739):** DUAL_ENTRY_MIN_SEPARATION_PIPS = 15 — multiple entries within 5-15 pips = legs of ONE trade; a LL reinforcement 30+ pips away = a SEPARATE trade.
**battleMs (types.ts:324-328):** the battle timestamp when the setup FORMED; fill activates at max(session start, battleMs); expires 21:00Z.

## 33.3 The Mirror Lane (mirror.ts — cascadeV45 → reAnchorMirror → selectPairNativeZone)

**reAnchorMirror:** pair-native anchor selection (80/20 doctrine) → defendedEdgeEntry (borrowed defendedEdge) → computeReactionExtremeSL → computeLmvTP-PRIMARY (mirror lane).

**selectPairNativeZone (mirror.ts:1233-1373):**
1. LMV center ±15% price-range filter (stale exclusion, :1255-1264)
2. VIOLATED admission within 50-pip band of day-native spot, group −2 (:1289-1301)
3. Zone-ID centerKey exclusion via `|${center.toFixed(5)}` suffix (:1271-1276)
4. Reaction-time ±48h pool preference (:1319-1336)
5. E2 shapeDay preference: exact keyZoneId → PREFER; else +2 tier proximity bonus (:1338-1370)
6. Class+side+strength ranking (the base — picks the STRONGEST, not the GOLDEN)

**computeLmvTP (mirror.ts:1533-1591):** opposing-side LMV rungs; significance `(sweepCount≥1 ? 50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)`; fresh-wall (zfp≤20) cap-walk; TP = effective rung's defendedEdge; weak-pass zfp>30. **SWEEP +50 MUST BECOME −30 (the inversion).**

## 33.4 The GU Distribution (the biggest architectural gap fix)

`usedGuAnchors` exclusion + centerKey format fix (`lmvAnchorId('LMV', z)` vs `lmvAnchorId(targetPair, anchor)` prefix mismatch → `|${z.center.toFixed(5)}` suffix matching). GU went from 2 unique zones to 8-9. The distribution deadlock fix: `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror (not just ACTIVE). **Macro principle: "Distribution must be a property of the SIGNALS (N distinct signals deserve N distinct zones), NEVER of the OUTCOMES."**

---

# PART 34 — THE MDVE STAGE (mdve-stage.ts — the pipeline integration)

## 34.1 buildChartModelsFromHarvest (mdve-stage.ts:224-260)

Passes `['1H']`, `['4H']`, `['30m']` slices (:245-247) into buildChartModel — **NO 15m** (the 15m lane must be added per the telescoping doctrine).

## 34.2 The Key Functions

- `floorSetupsToDedupRows` (:1201) — converts floor setups to dedup rows (saved improvement #6)
- `dayOpenPriceProvider` (:805-813) — `return (pair, dayStartMs) => bars.find(b => b.timestamp >= dayStartMs && b.timestamp < dayStartMs + 24h).open` — the SIGNAL DAY's open (day-native reference)
- `mergeMirrorWithEmergent` (:691-720) — dedup by `pair|direction|day|session|bucket(3-pip)`, mirror provenance wins collisions
- `checkMirrorFloorV45` (:2135-2166) — `|EU| ≥ |DXY ACTIVE mirrors|`, `|GU| ≥ |EU ACTIVE| − documented casualties`
- GOLDEN_FLOOR_TOTAL = 24 (:78) — the f(T) firewall evaluation (:414-427)

## 34.3 The Current Pipeline Structure (engine.ts — the 5 live tools)

```
plutus-pipeline-harvest  → 4H/1H/30m/15m via tv_fetch_ohlc.py (all stored in ohlcByPairTf)
plutus-pipeline-zones    → 4H S/D (hardcoded '4H') + 1H LQZ (mergeLqzWithIpZones called :480)
                           + MDVE ChartModel (additive, :530-551)
plutus-pipeline-shapes   → ShapeBrain (reads the 4H-only snapshot)
plutus-pipeline-charts   → VLM screenshots
plutus-pipeline-setups   → VisualSetupGenerator (E3)
```

**The two-parallel-universes problem:** the emergent snapshot (pillarZones + 4H sdZones + 1H lqzZones) and the MDVE ChartModel.zones (4H+1H+30m OBs) are built SEPARATELY and never merged — T6 fixes this.

---

# PART 35 — THE DEEP FIX CODEX DETAIL (the v4.3 forensic chains, complete)

## 35.1 Chain 1 — Consumption/Dedup (SP-1, W6-1)

**Broken:** 40 DXY setups = ~13 real trades × 3-4 byte-identical re-fires. Zone 100.9203 (entry 100.90, SL 101.10, TP 100.60) byte-identical Tue/Wed/Thu/Fri — 4 setups, 1 trade.

**Root cause:** consumption rule at gen:648-658 skips only when state string is byte-equal: `zoneState = ${(vz.reactionCount ?? 0) + simulatedTouches}|${this.zoneZfp(vz, zoneMap)}`. `simulatedTouches` counts ALL prior setups whose entry OR TP lands inside the zone. The DXY fallback cluster is DENSE — every setup's entry lands inside several neighbors → every zone's counter grows monotonically from NEIGHBOR activity → priorUse === zoneState NEVER true → rule NEVER skips.

**The fix (W6-1):** geometry fingerprint at both primary path (:648-671) and chained path (:1749-1765): `geomSig = ${direction}|${entry.toFixed(4)}|${sl.toFixed(4)}|${tp.toFixed(4)}`; `usedZones: Map<zoneUseKey, geomSig>` skip on match; plus cross-category global guard `emittedGeometry.has(globalGeomKey)`. **Insight: old rule asked "did the zone's ENVIRONMENT change?" (neighbor activity always answers yes); fingerprint asks "is this the same trade?" — only geometry can answer.**

**Evidence:** DXY 40 → 11 (W6 run 1) → 13 (W6-4 run). The 101.0547 case (Mon SL 101.22/TP 100.72 vs Wed SL 101.36/TP 100.45) correctly emits 2 setups (different geomSig — mitigation-driven re-anchor).

## 35.2 Chain 2 — Freshness/ZFP (SP-2a, W6-2/W6-4/α/β)

**2a — countReactions counts BARS not EVENTS** (4h-sd-lobe.ts:404-427): every 4H bar touching counts separately. Real evidence: GBP D1 (BoM Supply) "3 reactions" = 3 bars ≈ ONE 12-hour touch → zfp 65 (blocked) when canon says 1× = 18 (Hard Wall, eligible); EUR EQ "17 reactions" = consolidation-dwell → 70 instead of ~22.

**Fix (W6-2):** event-granularity — `events++` only when price comes from OUTSIDE (`if (!inZone) { events++; inZone = true; }`); `fullyOutside` ends event; pierced tracked per-event; `effectiveReactions = (pierced && totalReactions > 0) ? Math.max(totalReactions, 3) : totalReactions` (fix α: pierce requires a BATTLE).

**2b — Pierce-terminal forces depletion with 0 events:** EUR EQ "0 reactions, zfp 70%" — price gapped clean through (no battle). "A gap-through is being-left-behind, not depletion."

**2c — Boosted top-30 fallback sort EXCLUDES 4H/LQZ** (engine.ts:~946-968): pillar zones compositeScore 12-14 → sortKey 12-19; 4H S/D 0-4 (+5) → 5-9; LQZ 1 (+5) → 6. Top-30 = ALL pillar. **Fix (W6-4 Fix 1, engine.ts:1086-1100): fallback pool interleaving — structuralZones first, pillarZones fill the rest.**

**2d — zoneZfp inheritance global midpoint LOTTERY** (generator:1580-1607): findNearestIPZone races ALL 823 zones by raw midpoint. **Fix (W6-4 Fix 2, generator:1602-1674): inheritance prioritization — (0) same-pair gate, (1) name match exact → includes-partial, (2) same-pair range overlap IoU > 0.5 with type-class preference (4H S/D 2 > LQZ 1 > pillar 0), (3) nearest midpoint SAME PAIR only; ?? 50 preserved.**

**2e — Standalone LQZ zones carry DEFAULT_ZFP = 50** (lqz-lobe.ts:384): golden entries were AT LQZ rungs (T1, T2, T4, T5 = 1H LQZ) — zfp 50 fails SS <30 and WL <20 filters. **Fix (W6-β, lqz-lobe.ts:392): `zfp: Math.min(60, 20 + Math.max(0, Math.floor((lqz.touch_count − 3) / 2)) * 5)`** — touch 2-4 → 20 (Hard Wall, SS✓ WL✓), 5-6 → 25, 7-8 → 30 (fails SS, correct depletion), 11+ → 40+.

## 35.3 Chain 3 — Translation Architecture (SP-2b, W6-3)

**Five findings:** (1) ONE shared ShapeBrain (engine.ts:470-474), zone map instrument:'MULTI' with all 823 zones flat (:389-395); shape-brain.ts:1153 `const dxySpot = spots['DXY'] ?? 0` — hardcoded DXY spot regardless of instrument; engine.ts:1056-1058 passes the SAME snapshot to every pair. (2) Report FX "Shape Chain" sections are the DXY chain RELABELED. (3) DXY chain had no BS (avg ZFP 18-20% pins SS→SS at shape-brain.ts:99,112) — SHAPE_CATEGORIES_MAP never grants HTF_SWING/BREAKOUT_SURGE. (4) cascadeAligned (gen:668-672) reads the FX setup's OWN chain bias expecting DXY's — "Neutral — consolidation phase" contains neither → never fires → all 13 FX setups stamped counter-trend. (5) No cross-pair setup propagation exists.

**Fix W6-3:** Phase 1 — per-pair chains: shapeByPair record; per-pair snapshot (instrument: pair, zones: ctx.zonesByPair?.[pair] ?? [], own spot); shape-brain.ts instrument-spot fix at 3 sites (:1162, :172, :455): `spots[instrument ?? 'DXY'] ?? spots['DXY'] ?? 0`. Phase 2 — extractDxyBias + injection: `inverseBias = BULLISH→'SHORT', BEARISH→'LONG', else null`; `isCascadeDirectional = category === HTF_SWING || BREAKOUT_SURGE`; `cascadeAligned = !isDXY && inverseBias !== null && isCascadeDirectional && String(direction) === inverseBias`; cascadeSource ∈ native | cascade-neutral | cascade-aligned | counter-trend.

**Evidence:** Trace A (DXY BS SHORT Wed → BEARISH → EUR HTF_SWING LONG → cascade-aligned +10). Trace B (SS Mon-Thu + Fri WL → NEUTRAL → inverseBias null → cascade-neutral — correct, no false counter-trend).

## 35.4 Chain 4 — Options (Defect M, W6-5)

**THE SILENT KILL:** zones tool NEVER passes optionsData to pillarEngine (engine.ts:333-337): `pillarEngine({ instrument: pair, bars, currentPrice: spot })` — data validated at Layer-1 firewall then DROPPED ON THE FLOOR; computeP3 (9-pillar-lobe:322) and computeP8 (:353) always receive undefined; P8 returns `{levels: [], score: 0}`.

**Fix W6-5 (5 parts):** P1 harvest optionsDateLink (engine.ts:222-235): indexUrl + dateToken ("20260710") + hrefPattern 'fx-option-expiries-for-'. P2 browse-screenshot full Protocol A (engine.ts:1250-1530): NAVIGATE_ORDERS → FIND_DATE_LINK → NAVIGATE_DATE_PAGE → LOCATE_TABLE → SCREENSHOT → FIREWALL (MiMo VALID/INVALID); [NO DATA] declared honestly. P3 Manual Step A rewritten. P4 wire optionsData (engine.ts:369-420): OptionsExpiryData = { date, strikes, maxPain, totalNotional }; notionalBillions > 0 ? notionalBillions : notional/1e9. P5 zones tool description documents [NO DATA].

## 35.5 Chain 5 — Hook-Args (K): the deepest root cause — see Part 5.2

## 35.6 Chain 6 — Anchor Geometry — see Part 6.6

## 35.7 Chain 7 — TVI Stack — see Part 5.1

## 35.8 The 20-Run Container Loop (the 16 tabulated iterations)

1: `060df24d` 86 INVALID — A: ATR-fallback fantasy TPs (27.1x, +391p) → removed. 2: B: attempt-3 SL bypassed D17 ceiling (GBP 40p) → ceiling on all fallback paths. 3: C: "0 pips" units bug → uniform-pips. 4: D: LIQUIDITY-only SL anchor → Law-7 general form. 5: `ea427a3e` 2 setups — E: placeholder reactionCount + UNMITIGATED → Law-14 caps every TP at nearest pivot → hasRealFreshness filter. 6: `2017c817` 97 setups real anchors → TVI build. 7: `32b32996` VEB 0/3 ×5 — F: source normalization. 8: `f873d902` — G: wrong-tool zoneAnalysis + base64. 9: `4ef4fa35` — H: zoneAnalysis text arg. 10: `9360be5d` — I: order-agnostic parser. 11: `59a847f5` vz=25 still 0/3 — J: normalizeArgs JSON-string. 12: `141e07a2` — **K: root cause, args in OUTPUT**. 13: `7503ca3f` 53 setups complete — L: DEFAULT_ZFP=50 placeholder → canon zfp. 14: `36a956a7` 45 (DXY=11 ✅ EUR=33 ⚠️ GBP=1 ❌) → W6-4. 15: `4759445b` 16 (DXY=13 ✅ EUR=2 ⚠️ GBP=1 ❌) → zfp α+β. 16: `8c69e80e` 4 (DXY=1, EUR=3 at UM-BoM D1 re-anchored TPs, GBP=0, AUD=0) — LQZ DEFAULT_ZFP=50 (β) + pierce-terminal 0-event depletion (α) fixed.

**"The loop converged on a fully correct machinery. Every gate now responds correctly to each run's zone data. The remaining variance is a zone-data-consistency issue, not a machinery issue."**

---

# PART 36 — THE TVI PROTOCOL AND ENFORCEMENT DETAIL

## 36.1 The ZONE| Protocol

`ZONE|type|top|bottom|timeframe|classification|confidence|evidence`

- type: SUPPLY or DEMAND or LIQUIDITY
- top/bottom: exact price levels (ANY order — the harness normalizes: top = max, bottom = min)
- timeframe: 4H, 1H, 30m, or 15m
- classification: BoM or MoM
- confidence: 0-100
- evidence: specific candlestick pattern (order block, wick cluster, FVG, tight consolidation) — MUST be ≥ 20 chars with price references
- Screenshots AUTO-SAVE to /tmp/tv-screenshot-*.png — never extract base64 (tool results truncate large base64)
- Scaffold extension (Codex §11.4): `ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence` — verdict = CONFIRMED/REJECTED/WEAK

## 36.2 The VLM Prompt Structure (the fixed perception contract)

```
You are PLUTUS TTE, a trading expert with 37 fundamental laws.
Analyze this {PAIR} chart. Identify ALL supply, demand, and liquidity zones near current price.
For each zone, write EXACTLY this format (one per line):
ZONE|type|top|bottom|timeframe|classification|confidence|evidence
Where:
- type: SUPPLY or DEMAND or LIQUIDITY
- top/bottom: exact price levels
- timeframe: 4H, 1H, 30m, or 15m
- classification: BoM or MoM
- confidence: 0-100
- evidence: specific candlestick pattern (order block, wick cluster, FVG, tight consolidation)
List at least 5 zones. Focus on zones within 100 pips of current price.
```

**Split into TWO prompts** (one for supply, one for demand) — a single prompt causes the model to focus on one side and miss the other.

## 36.3 The verifyZone 8 Gates (ZIP)

1. Pair matches
2. top > bottom
3. Width within [1, 200] pips
4. Price references present (regex \d+\.\d{3,})
5. Evidence ≥ 20 chars, not generic
6. Timeframe valid
7. Classification valid (BOM|MOM|LQZ)
8. Source screenshot file exists

---

# PART 37 — THE VERIFICATION DISCIPLINE (what "done" means)

## 37.1 The Evidence Requirements (every claim must have)

1. **sha256sum proof** — modified files byte-verified
2. **Stream evidence** — TUI tmux + pipe-pane capture
3. **Behavioral observation** — what the agent did in the container
4. **Pass/fail determination** — explicit, against the gate criteria

## 37.2 The Determinism Doctrine

- Same fixture → byte-identical report. No wall-clock.
- sha256 in-process AND cross-process ×2
- The determinism is in the COMPUTATION (pivot formulas, order-block detection, LQZ thresholds, Fib ratios), not the LEVELS. The levels change every week because the data changes every week.
- **The scaffold must contain ZERO Jul-6-10 content. Different week = different ladder.**

## 37.3 The Golden-Reconstruction Oracle

The golden levels must be reconstructable from the week's OWN data alone — golden-recon 16/16 is the frozen harness. The golden LQZ levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) appearing in the map is "the definitive test of LMV."

## 37.4 The 3-Signal Container Monitoring

1. Fresh container from plutus-container-testing:clean-v421
2. SHA-verified deploy
3. Standard task prompt
4. 3-signal monitoring: tool calls / stream / artifacts
5. Sniff test + golden reconstruction + outcome audit

---

# APPENDIX E — THE VERIFICATION CHECKLIST (paste into every build)

## E.1 After EVERY change:

- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `bun build src/index.ts --outdir dist --target bun` = success
- [ ] `bun report-v452.ts` runs clean
- [ ] `bun diag-golden-coverage.ts` — 3-pip count reported (NOT 30, NOT 10)
- [ ] sha256 report_v452.md ×2 identical (determinism)
- [ ] Frozen files sha256 byte-identical (except operator-unfrozen: setup-gen.ts, lmv.ts, lqz-matrix.ts)
- [ ] No new slop: RRR floors intact (3.0 min), no caps, dedup reporting-layer

## E.2 At Phase gates:

- [ ] **Phase 2 gate:** 7 golden DXY levels present in the zone map, computed from data
- [ ] **Phase 3 gate:** 7/7 golden DXY LQZs at ≤1 pip (diag-lmv-golden)
- [ ] **Phase 4 gate:** golden OB reconstruction + 96%+ vs drawn map (diag-obcv-golden)
- [ ] **Phase 7 gate:** every emitted setup RRR ≥ 3.0; REPAIRED annotations on refined setups
- [ ] **Phase 8 gate:** 23 golden trades at ±3 pips, container-tested, visual eval overlaid

## E.3 The Frozen List (2026-07-31 revision):

| File | Status |
|------|--------|
| v4.5.1_LIVE_MARKET_CAPABLE | **LOCKED IMMUTABLE — the new baseline** |
| sl-lmv.ts (91294083) | FROZEN (unless LMV interface changes → contract update + new hash) |
| engine.ts (3deb2814) | FROZEN |
| trade-dedup.ts (33914c89) | FROZEN |
| visual-setup-generator.ts | FROZEN with documented exception (RRR/refinement machine) |
| golden-recon (454b8abc), verify-integration (ce975356), scratch-lmv (a4dc01c1), verify-sl-fix (f8ed6b20), verify-mirror-fix (2006ce2e) | FROZEN |
| **lmv.ts (77e56cd0)** | **MUTABLE PROTOTYPE** (golden-LQZ oracle pending) |
| **lqz-matrix.ts** | **MUTABLE PROTOTYPE** (golden-LQZ oracle pending) |
| **setup-gen.ts** | MUTABLE (operator-unfrozen, HOTFIX_SPEC:65 precedent) |

---

*END OF PLUTUS ARCHITECTURE BIBLE 4.5 — the complete supplementary master context. Read AFTER Bible 4.0, BEFORE any build work.*
# APPENDIX F — THE COMPLETE LQZ TOUCH-KIND CLASSIFIER (the LMV Stage-1 predicate, exhaustive)

## F.1 The Piecewise-Total Classifier (every bar → exactly one branch)

The touch-kind classifier is the total predicate that maps EVERY bar in the LQZ window to exactly one of five branches (no undefined inputs — the MPSE totality discipline):

```
classifyTouch(bar, bucket: [bottom, top], ε = 2 pips):
  band = [bottom − ε, top + ε]                        // the widened reaction band
  if bar.high < band.bottom or bar.low > band.top:
      return PASS_THROUGH                              // never came near — excluded (anti-noise)
  if bar.wick crossed the ENTIRE bucket ≥ 2 pips ∧ body closed back (approach side):
      return SWEEP                                     // liquidity grabbed THROUGH the level
  if bar has ≥ 2-pip wick INTO the band ∧ body reversed ∧ retreated to approach side:
      return WICK_REJECT                               // tested and rejected (long-wick family)
  if bar.body sat at/inside the band ∧ next bar turned ≥ max(2p, 0.5×ATR) against approach:
      return BODY_DEFEND                               // defended from the body (body-edge family)
  if ≥ 3 consecutive bars intersect the band, spanning ≤ 2 bucket widths:
      return CONSOL_DWELL                              // consolidation dwell (consol family)
  else:
      return PASS_THROUGH                              // traversed without reacting
```

**The 3 visual pattern families map onto the classifier as:**
| Operator's visual family | Classifier branch |
|--------------------------|-------------------|
| LIQUIDITY SWEEP (wick through the level + reversal) | SWEEP |
| LONG WICK rejection (wick into the level + body reverses) | WICK_REJECT |
| BODY DEFEND / consolidation alignment (bodies sitting at the level) | BODY_DEFEND + CONSOL_DWELL |

**The confirmation gate (Stage 3):** |candles| ≥ 3 AND |distinct touchKinds| ≥ 2 — a single pattern type is NOT enough; the level must show MULTIPLE reaction modes across its history (the operator's "2+ pattern types align" rule made mechanical).

**The PASS_THROUGH exclusion is the anti-noise gate:** a bar that merely travels through the level without reacting contributes NOTHING — it cannot inflate a zone's strength. This is why the matrix survives noisy weeks.

## F.2 The Matrix Column Reductions (the linear algebra, in full)

For a zone-matrix with N reaction candles:

```
reactionExtreme = BUY_SIDE  ? min(candles[i].wickTip)   // deepest LOW probe (demand)
                = SELL_SIDE ? max(candles[i].wickTip)   // deepest HIGH probe (supply)
    → the SL anchor: SL = reactionExtreme ∓ Law-7 buffer (beyond the deepest battle)

defendedEdge = modal(bodyClose over DEFENDING candles, quantized to 1 pip)
    → the ENTRY anchor: entryPrice_LMV returns defendedEdge verbatim
    → tie-break: nearest to zone center, then lower bucket

sweepCount   = |{c : c.touchKind === SWEEP}|
    → TP significance: swept rung = liquidity TAKEN → DEMOTE −30 (2026-07-31 inversion)

defendStrength = 1 − |reactionExtreme − defendedEdge| / ATR14
    → two zones with the same [bottom, top] but different matrices get DIFFERENT anchors

zfp = min(60, 20 + floor((|candles| − 3) / 2) × 5)
    → touch 2-4 → 20 (Hard Wall); 5-6 → 25; 7-8 → 30; 11+ → 40+
```

## F.3 The Completeness Invariant (Stage 4)

Every 0.25×ATR price bucket in the scanned range [minLow, maxHigh] must exist in the grid (zero-filled when empty). This is MPSE Structure 9 — a total function over price × time: **no unexamined region can silently hide a level.** The completeness record is the audit trail proving the scan was exhaustive.

---

# APPENDIX G — THE DXY FORENSIC GOLDEN DETAIL (PLUTUS_DXY_FORENSIC.md — the definitive zone data)

## G.1 The Golden Week's Actual Structure (corrected narrative)

- **Week:** 2026-07-06 → 07-10 (Mon-Fri)
- **Prior-week sweep origin:** 100.603 on **JUL 3** (NOT Jul 6 — the Jul 10 sweep to 100.598 took out the Jul 3 low)
- **Week high:** 101.275 (Jul 8)
- **Friday Jul 10:** sweep to 100.598, recover to 100.73
- **Spot at report time:** ~100.731

## G.2 The DXY Zone Inventory (what the golden map ACTUALLY contains)

| Zone | Type | TF | Classification | Freshness |
|------|------|----|----------------|-----------|
| [100.68-100.73] | DEMAND | 1H | BoM | UM (the deepest TP — T6's target) |
| 100.845 | DEMAND | 1H | MoM | (the Tue entry — T3) |
| [101.110-101.275] | SUPPLY | 1H | BoM | FRESH zfp 10 |
| ~101.19-101.35 | SUPPLY | 4H | BoM | (T6's entry band) |
| 100.945 | LQZ | 1H | — | Mon floor (T1 entry) |
| 100.975 | LQZ | 1H | — | Wed reaction (T4 TP / T5 entry) |
| 101.14 | LQZ | 1H | — | Mon ceiling (T2 entry) |
| 101.19 | LQZ | 1H | — | Wed supply (T4 entry) |
| 101.235/101.240 | LQZ | 1H | — | Wed BS entry band (T6) |

**48 LQZ zone-matrices spanning [98.751, 101.800]** — the LmvTable for the golden week.

## G.3 The Golden SL Precision Facts (the anchor math)

- T1 SL 100.905: 4 pips below entry — at zone floor − buffer
- T3 SL 100.77: 7.5 pips below — **our system's SL 100.811 sits INSIDE the 100.803 dip → our version dies where his survives by 3.3 pips (the SL-precision gap)**
- T6 SL 101.330: 9.5 pips above — at the 4H BoM ceiling + buffer
- All SLs = zone width + 2-5 pip buffer (Law 9 confirmed)

## G.4 The 7 Requirements for Cross-Validation (Approach B Phase 6)

1. Pair direction matches the DXY-inverted signal
2. Zone class matches (BoM→BoM, MoM→MoM, LQZ→LQZ)
3. Zone role inverted correctly (supply↔demand for EU; kept for GU)
4. Session window matches the shape day
5. RRR ≥ 3.0 after pair-native anchoring
6. Law-14 path clear (no UM zone between entry and TP)
7. Fill model: activation at max(session start, battleMs), expiry 21:00Z

---

# APPENDIX H — THE READING PROTOCOL (the fresh agent's entry sequence)

## H.1 The Order (compaction-proof)

1. **PLUTUS_ARCHITECTURE_BIBLE_4.0.md** (4,504 lines) — the E1/E2/E3 canon, 37 laws, 18 iron laws, elemental densities, v3-era derailments, container stack
2. **PLUTUS_ARCHITECTURE_BIBLE_4.5.md** (THIS document, 2,808+ lines) — the MDVE/LMV/OBCV/cascade/TVI era, operator doctrine verbatim, golden-23, known gaps, 2026-07-31 overhaul directives
3. **PLUTUS_GOLDEN_CASCADE_23.md** — the 23-trade acceptance oracle (Tier A exact / Tier B labels / Tier C doctrine / Tier D pixel-inferred)
4. **PLUTUS_DEEP_FIX_CODEX.md** — the 7 chains + the 20-run container loop + the remaining root cause
5. **PLUTUS_V4.5.2_E2_CASCADE_SPEC.md** — the operator-approved E2 cascade architecture
6. **PLUTUS_ANCHOR_DOCTRINE.md** — the 3-anchor chain (entry/SL/TP)
7. **PLUTUS_V4.4_MDVE_SPEC.md** — the MDVE umbrella (ChartModel as total function)
8. **PLUTUS_TVI_DESIGN_SPEC.md** — the enforcement stack (VKG/VCM/VST/VEB/VGS/ZIP/VLD/VTM)
9. **PLUTUS_PVE_DESIGN_SPEC.md** — the probabilistic verification engine (design only)
10. **VISUAL_TELESCOPE_CHARTING_T2.md** — the 4H→1H→30m→15m telescoping law + LQZ pattern criteria

## H.2 The State Verification (before ANY work)

- [ ] `npx tsc --noEmit` = 0
- [ ] `bun build src/index.ts --outdir dist --target bun` = success
- [ ] `bun report-v452.ts` runs clean (fixture /tmp/opencode/bars_raw.json)
- [ ] `bun diag-golden-coverage.ts` — the 3-pip count
- [ ] sha256 report_v452.md ×2 identical
- [ ] src/ is the WORKING TREE (Phase 0 restored from v4.5.2_E2_CASCADE)
- [ ] Frozen files byte-identical per Appendix E.3

## H.3 The Working Discipline (the anti-derailment rules)

1. **The 8 immutable operating constraints** (Part 10.2) — never violated
2. **The 18 documented derailments** (8 Bible 4.0 Part 11 + 10 session Part 1.16) — never repeated
3. **Doctrine is QUOTED, never synthesized** (D13) — re-read the evidence from disk before any doctrine-touching decision
4. **Precision is the ONLY metric** — 3-pip count after EVERY change
5. **Loop autonomously** — no intermediate reports, no stopping
6. **Checkpoint after each phase** — src/ stays the working tree; Checkpoints/ are static anchors
7. **Hive storage** — store new knowledge to hive t3 domain=plutus (the hive is COLD as of 2026-07-31 — this bible + the spec must be stored)
8. **Prose is not evidence** — sha256, stream capture, artifacts on disk, explicit pass/fail

## H.4 The Completion Definition (what "DONE" means)

- All 23 golden trades emitted at ±3 pips (DXY 8 + EU 8 + GU 7)
- Every emitted trade RRR ≥ 3.0 (the emission minimum), ≥ 3.5 the executed standard
- The 7 golden DXY LQZs present in the zone map at ≤1 pip (the definitive LMV test)
- OBCV golden reconstruction from data alone + 96%+ vs the drawn map
- Determinism: sha256 ×2 byte-identical
- Container test passed (fresh container, SHA-verified deploy, TUI stream evidence)
- Visual eval: the 23 golden trades overlaid with the generated setups, side by side
- f(T) ≥ 24 with 6-11 per pair; >12 per pair = slop flag

---

*END OF APPENDICES F-H. PLUTUS ARCHITECTURE BIBLE 4.5 IS COMPLETE.*

---

# APPENDIX I — THE DOCTRINE QUICK-REFERENCE INDEX (the one-page cheat sheet)

## The 3 Machines (2026-07-31)

| Machine | Finds | Method | Oracle |
|---------|-------|--------|--------|
| LMV | LQZs | Candle-matrices (rows=reaction candles, cols=OHLC+kind, column reductions → reactionExtreme/defendedEdge) | 7/7 golden DXY LQZs ≤1 pip |
| OBCV | BoM/MoM OBs | Displacement field → origin-candle feature matrix → prior-move classifier → telescoping incidence | Golden OB reconstruction + 96% vs drawn |
| E2 | Shapes + day zones | ZFP-conditioned transitions + day decomposition | keyZoneId AUTHORITATIVE in E3 |

## The 7 Golden DXY LQZ Levels (the LMV oracle)

100.845 · 100.945 · 100.975 · 101.14 · 101.19 · 101.235 · 101.240

## The 8 Golden DXY Trades (Tier A)

| # | Day | Dir | E | SL | TP | RRR | Zone |
|---|-----|-----|-----|-----|-----|-----|------|
| 1 | Mon | LONG | 100.945 | 100.905 | 101.115 | 4.25 | 1H LQZ |
| 2 | Mon | SHORT | 101.14 | 101.200 | 100.845 | 4.92 | 1H LQZ |
| 3 | Tue | LONG | 100.845 | 100.77 | 101.190 | 4.60 | 1H MoM |
| 4 | Wed | SHORT | 101.19 | 101.25 | 100.975 | 3.58 | 1H LQZ |
| 5 | Wed | LONG | 100.975 | 100.905 | 101.240 | 3.79 | 1H LQZ |
| 6 | Wed | SHORT | 101.235 | 101.330 | 100.680 | 5.84 | 4H BoM |

## The Cascade Law

DXY LONG → EU SHORT (inverse) → GU SHORT (kept) · DXY SHORT → EU LONG (inverse) → GU LONG (kept). DXY provides DIRECTION, the pair provides LEVELS. Zone-anchored, never price-anchored. Structural equivalence only.

## The RRR Law (2026-07-31)

RRR ≥ 3.0 emission minimum. RRR ≥ 3.5 executed standard. 4+ the norm. RRR-failed ≠ hard reject — the E/SL/TP refinement machine (3 attempts on the SAME zone anchors).

## The Telescoping Law (2026-07-31)

S/D: 4H→1H→30m refinement (nested). BoM origins: 4H/1H ONLY. 30m: MoM only (E2 reaction points for SS/R). LQZ: 1H→30m→15m. LTF never overrides HTF.

## The Friday-Spot Law (2026-07-31)

Friday spot is ONLY relevant to Monday's E2 shape prediction. After that it is completely irrelevant. E2 forward-maps each day's predicted spot at London session open (DayBand). Day-native gates use the trading day's predicted price.

## The Pipeline Order (2026-07-31)

DXY: E1→E2→E3 (full). EU: E1 → DXY-inverse E2 cascade → E2 → DXY-inverse E3 cascade (zone-anchored) → E3 + EU emergent. GU: E1 → EU E2 cascade → E2 → EU E3 cascade (zone-anchored) → E3 + GU emergent.

## The Frozen List (2026-07-31 revision)

LOCKED: v4.5.1_LIVE_MARKET_CAPABLE (new baseline). FROZEN: sl-lmv.ts, engine.ts, trade-dedup.ts, visual-setup-generator.ts (documented exception), 5 harness scripts. MUTABLE PROTOTYPES: lmv.ts, lqz-matrix.ts (until the golden-LQZ oracle passes).

## The 8 Immutable Operating Constraints

1. Precision is the ONLY metric — 3-pip count
2. Never lower standards — RRR ≥ 3.0 min, 4+ norm
3. Fix the map, not the ranking — levels must EXIST first
4. E2 designates the zone, E3 obeys — keyZoneId authoritative
5. LQZ 1H→30m→15m; BoM 4H/1H only; 30m MoM only
6. No repeat of the 18 documented derailments
7. DXY direction, pair levels; zone-anchored; Friday spot Monday-E2-only
8. Don't stop; don't fake coverage; verify mechanically

## The 3 Anchor Rules (the golden semantics)

ENTRY = defendedEdge (LMV) / origin-candle body edge (OBCV). SL = next rung's reactionExtreme + Law-7 buffer (2-5 pips INSIDE the next LQZ; 4-9.5 pips golden). TP = opposing rung's defendedEdge inside an S/D zone (Earth+Fire; Law-14 walk with simulated mitigation).

*END OF PLUTUS ARCHITECTURE BIBLE 4.5 — COMPLETE. 3,000+ LINES. READ AFTER BIBLE 4.0, BEFORE ANY BUILD WORK.*
