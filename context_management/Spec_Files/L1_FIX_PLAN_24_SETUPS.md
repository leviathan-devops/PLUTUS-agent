# L1 FIX PLAN: Plutus Pipeline — 8-Phase E2E Engineering Plan
**Date:** 2026-07-23 (Session 3 — Full Forensic Realignment)
**Status:** PLAN READY — incorporates all forensic findings, user corrections, and spec requirements
**Prerequisite:** ROOT_CAUSE_ANALYSIS_24_SETUPS.md (8 defects diagnosed)

---

## EXECUTIVE SUMMARY

The pipeline has an architectural collapse: ONE shape for the whole week, ONE direction per day, ONE category for all setups. This plan fixes it in 8 phases, each addressing a specific defect, ordered by dependency. NOTHING is hardcoded. Everything is dynamically computed.

**Target:** 15-24 setups (SS 3-9 + BS 3 + R 3 + WL 3-6 + LL 3-6 + chained setups)
**Direction accuracy:** 3/3 (matching baseline) PLUS 24 setups (matching golden standard count)

---

## ARCHITECTURAL PRINCIPLES (NON-NEGOTIABLE)

1. **Per-zone direction** (Law 6): supply→SHORT, demand→LONG. Both coexist same day.
2. **Per-day shape** (golden standard): SS(Mon-Tue)→BS(Wed)→R(Thu)→WL(Fri). Dynamic, NOT hardcoded.
3. **DXY→EU/GU inverse 1:1**: Same shapes, same setups, opposite direction. EU/GU use own zone levels.
4. **Trade chaining** (Law 27): TP of N = entry of N+1. PASS CRITERIA — 85% must chain.
5. **RR as consequence** (Law 35): NOT a rejection criterion. Report only.
6. **No hardcoding**: Financial markets are dynamic. Shape chain evolves dynamically.

---

## PHASE 1: REVERT DAMAGE + RESTORE BASELINE

**Goal:** Stop the bleeding. Return to baseline behavior + retain LQZ improvements.

### Step 1.1: Remove B4 Cascade Filter
**File:** `src/pipeline/engine.ts`
**Action:** Delete the entire B4 cascade block (the one that counts DXY LONG vs SHORT and rejects FX setups).
**Reason:** It amplifies direction errors into system-wide flips. Will be reimplemented properly in Phase 5.
**Verification:** After removal, FX pairs independently determine direction via zone proximity.

### Step 1.2: Restore LIQUIDITY as Valid TP Target
**File:** `src/engine3/visual-setup-generator.ts` — `computeTPEarthFire()` method
**Action:** Change TP filter to include LIQUIDITY zones:
```
LONG TP: opposing = SUPPLY or LIQUIDITY zones where z.bottom > entry
SHORT TP: opposing = DEMAND or LIQUIDITY zones where z.top < entry
```
**Reason:** 18% of winning trade TPs are at LSZ/Liquidity Shield zones (FORENSIC_ANALYSIS_38_TRADES.md Law 4).
**Verification:** Setup count increases ~50% (previously null-TP setups now have valid TP).

### Step 1.3: Remove Hard RRR Filter (Law 35)
**File:** `src/engine3/visual-setup-generator.ts` — RRR filter at line ~315
**Action:** Remove the `if (rrr < minRrr) continue;` rejection. Keep the log for reporting. Only reject if RR < 1.0 (negative expectancy).
**Reason:** Law 35: "RR IS A CONSEQUENCE, NOT A TARGET." Median RR in winning trades is 3.5x but range is 1:1 to 1:16. Don't reject valid zone geometry.
**Verification:** Setups that were [skip]ped for low RRR now survive.

### Step 1.4: Confirm B1/B2/B3 Retained
**Action:** Verify LQZ detector receives 1H bars, relaxed confirmation, mergeLqzWithIpZones.
**Verification:** Run LQZ test → 7/7 golden DXY levels matched.

---

## PHASE 2: PER-DAY SHAPE CONSUMPTION

**Goal:** Each day gets its OWN shape. Different days produce different setup categories.

### Step 2.1: Setup Generator Uses dayDecomposition[i].shape
**File:** `src/engine3/visual-setup-generator.ts` — generateSetups() dayLoop
**Action:** For each day in the loop, use `dayShape.shape` (from dayDecomposition) to determine categories. NOT `chain.currentShape`.
**Current (BROKEN):** `const shape = dayShape.shape;` — but then uses `chain.currentShape` for category resolution downstream.
**Required:** Categories come from the DAY'S shape, not the global shape. Monday=SS→Swing Scalp. Wednesday=BS→Breakout Surge. Thursday=R→Recovery. Friday=WL→Whiplash.

### Step 2.2: assignDayAndSession Distributes Across Days
**File:** `src/engine3/visual-setup-generator.ts` or equivalent
**Action:** Setups for Monday's shape go to Monday. Setups for Wednesday's shape go to Wednesday. NOT all to the first matching day.
**Verification:** At least 3 different days have setups. NOT all on same day.

---

## PHASE 3: PER-ZONE DIRECTION (Law 6)

**Goal:** Each zone determines its OWN direction. Both LONG and SHORT coexist on the same day.

### Step 3.1: Replace resolveDirection() with Per-Zone Direction
**File:** `src/engine3/visual-setup-generator.ts`
**Action:** Instead of resolving ONE direction per day and filtering zones to match, iterate ALL eligible zones and determine direction PER ZONE:
```
for each visual zone:
  if zone.type === SUPPLY → direction = SHORT (sell at supply)
  if zone.type === DEMAND → direction = LONG (buy at demand)
  if zone.type === LIQUIDITY → check side: BUY_SIDE → SHORT, SELL_SIDE → LONG
```
**Reason:** Law 6. The golden standard Monday has SS LONG (at demand) AND BS SHORT (at supply). Both valid simultaneously.

### Step 3.2: Remove Direction-Based Zone Filtering
**File:** `src/engine3/visual-setup-generator.ts` — selectEligibleVisualZones()
**Action:** Don't pre-filter zones by direction. Present ALL zones and let each zone's type determine the trade direction.
**Verification:** Monday DXY produces BOTH LONG (at demand zone 100.945) AND SHORT (at supply zone 101.14).

---

## PHASE 4: SHAPE CHAIN DYNAMIC INTELLIGENCE

**Goal:** Shape chain dynamically produces variety (SS→BS→R→WL). NOTHING hardcoded.

### Step 4.1: Fix classifyShape() Threshold
**File:** `src/brains/shape-brain.ts:623-656`
**Action:** Change BS trigger from ZFP > 45% to ZFP > 60%. When zones are balanced (both supply and demand near spot with moderate ZFP), return SS. BS only when a zone is ACTIVELY FAILING.
**Reason:** SS is accumulation (Mon-Tue). BS requires actual zone failure. With 7 LQZ zones, ZFP > 45% triggers too easily.
**Verification:** With balanced zones near spot, classifyShape returns SS. Shape chain starts with SS.

### Step 4.2: Evolve ZFP Per Chain Step
**File:** `src/brains/shape-brain.ts` — getDirectionalZfp() / predictNextShape()
**Action:** After each chain step, simulate zone weakening:
- Zones that were "tested" in the previous step get ZFP +10-15% (weaker)
- This shifts the ZFP band, causing predictNextShape to transition to a different shape
- Example: Step 0 SS (ZFP 30, STRONG band) → Step 1 zone weakens to ZFP 45 (MODERATE) → BS → Step 2 opposing zone weakens → WL
**Reason:** Real zones weaken after testing. Static ZFP produces plateaus. Dynamic ZFP produces the natural SS→BS→R→WL sequence.
**Verification:** Chain produces at least 3 different shapes across 5 days. NOT all same.

### Step 4.3: Build Day Decomposition from Dynamic Chain
**File:** `src/brains/shape-brain.ts` — buildDayDecomposition()
**Action:** dayDecomposition already uses chain shapes + energy fallback. After Step 4.2, the chain has variety, so dayDecomposition will naturally have different shapes per day.
**Verification:** dayDecomposition has shapes like [SS, SS, BS, R, WL] or [SS, BS, RWL, WL, SS].

---

## PHASE 5: DXY→EU/GU CASCADE (1:1 INVERSE GENERATION)

**Goal:** EU/GU mirror DXY shapes with inverse direction and their own zone levels.

### Step 5.1: Generate DXY Setups First
**Action:** Run the full pipeline for DXY: zones → shapes → setups. This produces 6-8 DXY setups with per-zone direction, per-day shape.

### Step 5.2: Cascade to EU/GU (Inverse Generation)
**Action:** For each DXY setup, generate corresponding EU/GU setup:
- SAME day, SAME shape, SAME category
- INVERSE direction (DXY LONG → EU/GU SHORT, DXY SHORT → EU/GU LONG)
- EU/GU use their OWN zone levels (computed from their own OHLC, NOT mapped from DXY)
- EU/GU entry/SL/TP computed from their OWN zone map at the corresponding location
**Reason:** DXY/EU/GU are inverse 1:1 correlated. Same shapes, same sessions, opposite direction. But each pair has its own candle/zone/pip mechanics.

### Step 5.3: ZOC Exception (Law 19)
**Action:** SS category at ZOC zones (score ≥ 4: 3+ TF overlap + liquidity shield + BoM) can go BOTH directions regardless of cascade.
**Implementation:** Compute ZOC score per zone. If score ≥ 4 AND category is SS, generate BOTH directions.
**Verification:** At least one day has BOTH LONG and SHORT on the same pair (at different zones).

### Step 5.4: Handle AU Separately
**Action:** AUDUSD is NOT inversely correlated 1:1. Generate AU setups independently from its own zone map. Often sidelined (0 setups is correct).

---

## PHASE 6: TRADE CHAINING (Law 27 — PASS CRITERIA)

**Goal:** TP of setup N = entry zone of setup N+1. 85% of setups must chain.

### Step 6.1: Implement Trade Chain Validation
**Action:** After all setups are generated, validate chains:
1. Sort setups by day
2. For each setup, check if another setup's entry zone is within 5 pips of this setup's TP
3. If chain exists → link them (chainId, chainPosition)
4. If no chain exists → flag as "UNCHAINED" (suspect)

### Step 6.2: Chain Quality Gate
**Action:** If > 15% of setups are UNCHAINED, flag the pipeline output as suspect. Either:
- The TP is wrong (pointing to a non-zone)
- The setup itself is wrong (wrong entry, wrong direction, wrong shape)
**Reason:** Water energy. Everything flows forward. Current shape → next shape. Current trade → next trade. Brick wall = investigate.

### Step 6.3: Chain-Aware Setup Count
**Action:** Chained setups count as connected sequences. A BS→R→WL chain = 3 setups but 1 connected trade pathway. This is how 6-8 entries per pair produce 15-24 total setups.

**Reference:** Legacy implementation at `src/engine/plutus-tte-pipeline.ts:5443` (linkTradeChains).

---

## PHASE 7: LIQUIDITY LADDERS (LL = REINFORCEMENT)

**Goal:** 1-2 LLs along each BS pathway at MoM zones with liquidity clusters.

### Step 7.1: Identify LL Entry Points
**Action:** Along each BS setup's path from entry to TP:
1. Find MoM zones between entry and TP
2. Check if liquidity clusters exist at those MoM zones (liquidityScore ≥ 5)
3. These are LL entry points (reinforcement rockets)

### Step 7.2: LL Entry Computation
**Action:** LL entry at MoM zone edge. LLs go DEEPER into the zone (toward SL), not at far edge.
- R1: 1/3 into the zone from primary direction (Fib 1.382)
- R2: 2/3 into the zone (Fib 1.618)

### Step 7.3: SL Cascade
**Action:** When R1 fills → primary SL to breakeven. When R2 fills → R1 SL to breakeven. Final: all entries risk-free.

---

## PHASE 8: VERIFICATION + E2E TEST

**Goal:** Full pipeline in container produces 15-24 setups with correct direction.

### Verification Criteria

| Check | Expected | Fail If |
|-------|----------|---------|
| DXY LQZ levels | ≥ 5 of 7 golden levels | < 5 |
| Shape variety | ≥ 3 different shapes across days | < 3 |
| Direction variety | ≥ 1 day with BOTH LONG and SHORT per pair | 0 dual-direction days |
| DXY setups | 6-8 | < 6 |
| EURUSD setups | 6-8 (inverse DXY) | < 6 |
| GBPUSD setups | 6-8 (inverse DXY) | < 6 |
| AUDUSD setups | 0-2 (diverges) | > 4 |
| Total setups | 15-24 | < 15 |
| Trade chains | ≥ 85% of setups have chain at TP | < 70% |
| RRR minimum | NONE (Law 35: consequence, not target) | Any hard RR filter |
| TP includes LIQUIDITY | Yes | No |
| FATAL errors | 0 | Any |
| Forecast direction | DXY matches golden standard | Wrong direction |

### E2E Test Procedure
1. Build project: `bun build src/index.ts --outdir dist --target bun`
2. Deploy to container: `trident-container-test action=deploy` with `plutus-container-testing:master` image
3. Configure: `agent: plutus` in opencode config
4. Run: "generate a TTE report for week 2026-07-06"
5. Verify report at `/root/plutus/reports/TTE-2026-07-06.md`
6. Compare setups against golden standard

---

## DEPENDENCY ORDER

```
Phase 1 (revert + restore) ──→ Baseline behavior + LQZ improvements
      │
      ├──→ Phase 2 (per-day shape) ──→ Different categories per day
      │         │
      │         └──→ Phase 3 (per-zone direction) ──→ Both directions per day
      │                   │
      │                   └──→ Phase 5 (cascade generation) ──→ EU/GU inverse setups
      │                             │
      │                             └──→ Phase 6 (trade chaining) ──→ Sequential setups
      │                                       │
      │                                       └──→ Phase 7 (LLs) ──→ Reinforcement rockets
      │
      └──→ Phase 4 (shape chain fix) ──→ Dynamic shape variety
                │
                └──→ (feeds into Phase 2)
```

**Phase 1 is prerequisite for ALL other phases.**
**Phase 4 feeds into Phase 2** (need dynamic shapes for per-day consumption).
**Phase 3 is prerequisite for Phase 5** (need per-zone direction before cascade).
**Phase 5 is prerequisite for Phase 6** (need all setups before chaining).
**Phase 6 is prerequisite for Phase 7** (need chained pathway for LL placement).
**Phase 8 verifies everything.**

---

## WHAT IS ALREADY CORRECT (DO NOT REGRESS)

| Component | Status | Source |
|-----------|--------|--------|
| B1: LQZ 1H bars | Verified: 7/7 golden levels | Test run |
| B2: Relaxed confirmation | Verified: 0 valid levels discarded | Test run |
| B3: mergeLqzWithIpZones | Verified: proper Supply/Demand typing | Test run |
| MAX_SETUPS_PER_DAY = 6 | Harmless increase | Code audit |
| Docker image (plutus-container-testing:master) | Working | Container test |
| Harvest (tvDatafeed) | Working: 1,782 bars | Pipeline run |
| 9-pillar zone detection | Working: 175-188 per pair | Pipeline run |
| Report generation | Working: TTE format | Pipeline run |
| Browser MCP tools | Working | Container test |

---

## RISK NOTES

- **Do NOT hardcode shape patterns.** Markets are dynamic. The SS→BS→R→WL sequence must EMERGE from zone analysis, not from a hardcoded array.
- **Do NOT remove B1/B2/B3.** These are verified correct improvements. The direction regression comes from B4 (cascade) and pre-existing architectural defects, not from LQZ fixes.
- **Do NOT add AUDUSD setups.** 0-2 is correct for Jul 6-10. AU diverges from DXY correlation.
- **Do NOT use fixed SL buffers.** Use zone geometry (opposite edge + 2-5 pips per pair volatility).
- **Do NOT reject setups based on RR.** Law 35: RR is consequence, not target.
- **Per-day decomposition must preserve weekly shape as context.** Decompose, don't discard.
- **ZOC must be gated on Law 19 conditions.** Score ≥ 4: 3+ TF overlap + LSZ shield + BoM status.
- **Cascade is GENERATION + FILTER, not just filter.** EU/GU setups are GENERATED as inverse of DXY, then filtered by ZOC exception.
