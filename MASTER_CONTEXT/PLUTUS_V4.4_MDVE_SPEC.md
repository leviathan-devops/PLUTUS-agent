# PLUTUS V4.4 — MDVE: THE MATHEMATICAL DATA VISION ENGINE

**Version:** 1.0 (FULL SPEC)
**Date:** 2026-07-28
**Status:** DESIGN LOCKED — build target v4.4.0
**Position in the v4.4 triad:** MDVE is the EYES. VEI is the HANDS (headed-browser execution intelligence — spec: PLUTUS_V4.4_VEI_SPEC.md). PVE is the JUDGE (probabilistic verification — spec: PLUTUS_PVE_DESIGN_SPEC.md).
**Doctrine (the operator, 2026-07-28):** "Everything visible on the chart exists as data. We don't need to teach the agent to see the pixels on the screen — we need to teach it to see the STRUCTURE in the DATA and generate a proper mental model of the TTE framework. Pixels were just the input mechanism for me as a human. Vision is just how humans process math."
**Lineage:** Engine 1 (100% math since the prompt-infra era — always the strongest component) elevated to complete chart-model status + KNOWLEDGE_LIBRARY/MPSE (the 20 mathematical structures, firewall+oracle, MathContract, totality).

---

## TABLE OF CONTENTS

0. What MDVE Is (the doctrine)
1. The Problem (vision-based perception is the variance source)
2. The Core Insight (the zone-producing candle types map to data structures)
3. Architecture (the mental model as primary perception; pixels as verification)
4. Mathematical Foundations (the MPSE structure map)
5. The Chart Mental Model (the output data structure)
6. Detection Sub-Engines (OB/S/D, LQZ matrix, BoM/MoM, freshness, narrative)
7. The Scaffold Ladder (absorbed from v4.3 — now the perception backbone)
8. Reaction-Validity (the slop-killer — entry reachability from bars)
9. The Mirror Engine (DXY→EU→GU mechanical cascade)
10. The Oracle Loop (pixel-vision as verification, disagreement handling)
11. Immutability Encoding (MathContract doctrine, totality, f(T)=24 firewall)
12. Determinism Laws
13. Verification Plan (golden reconstruction as the oracle test)
14. Rollout Phases
15. Anti-Goals
16. Why This Changes Everything (and changes nothing)

---

## 0. WHAT MDVE IS (the doctrine)

MDVE is the Plutus agent's **primary perception system**: a deterministic mathematical engine that constructs the complete **mental model of the chart** from raw OHLC data — every S/D zone, every liquidity zone, every order block, every freshness state, the weekly narrative (sweep origin, range boundaries, the break), and the cross-pair mirror map — with **zero pixel input and zero LLM inference.**

The operator's realization (2026-07-28): when he looks at a chart, he is running a mathematical process over candle data — the pixels are merely how a HUMAN ingests that data. The AI does not need the pixels. The same data, ingested through mathematical logic structures, produces the same perception — more reliably, run-to-run identical, un-cheatable. **MDVE is that mathematical logic structure.** Pixel-vision (MiMo reading screenshots) does not disappear — it is demoted to its correct role: the **verification layer** that confirms or refutes specific claims in the mathematical model (freshness, reaction evidence, wick quality — the parts that are genuinely ambiguous in data), and the presentation lane (drawn charts for the human operator).

**Design law:** if a fact about the chart can be computed from data, it MUST be computed from data. The model's eyes are reserved for the residue — the 10-20% of perceptual judgments data cannot settle. The v4.3 scaffold proved the principle for zone identity; MDVE generalizes it to the entire chart model.

**The MPSE framing:** the chart model is a **total function** `M: OHLC × Options × Anchor → ChartModel`. Total = every input data set produces exactly one model (Losslessness Theorem: `|I(S_math)| = 1`). Un-cheatable = the model is produced by a deterministic evaluator; the agent's claims about the chart are verified against that evaluator (firewall + oracle — the agent cannot hallucinate an evaluation).

---

## 1. THE PROBLEM (vision-based perception is the variance source)

The v4.3 container evidence (4 tests, Jul 27, 2026) established the full failure taxonomy of pixel-primary perception:

| # | Failure | Evidence | Root cause |
|---|---|---|---|
| P1 | Zone levels invented differently every run | 4 → 97 setups across 6 pre-scaffold runs | Open-ended generation instead of closed-ended verification |
| P2 | Temporal leakage in perception | 17 false REJECTED verdicts (test 3): agent judged rungs against live price 101.508, not the Jul 6-10 week | The pixel channel has no mechanical time anchor |
| P3 | Verdict match-rate swings | DXY CONFIRMED 2 → 21 → 0 across 3 runs | Coordinate/copy drift in the pixel lane |
| P4 | GUI execution floundering | zoom-loop ×8, pan-loop ×6, 203× find_price_y (tests 2-4) | No spatial self-model (VEI's domain) |
| P5 | Translation failure | EU/GU starved while DXY over-produced (40/11/2/0) | Per-pair independent generation instead of the mechanical mirror (doctrine correction, §9) |
| P6 | Legitimate trades killed by my own dedup | day-independent geometry fingerprint ate multi-day reactions (the range-top LQZ reacting twice = 2 trades, not 1) | Wrong dedup doctrine — answered the wrong question (correction, §8.4) |
| P7 | Draw-phase cost | ~45 min + 2 loops + 1 nudge for 4 charts (test 4) | Pixel lane is slow, expensive, fragile |

**The pattern:** every failure traces to asking the pixel channel to do what the data channel does better. The v4.3 scaffold (deterministic zone identity) fixed P1 — and immediately proved the deeper truth: when the scaffold computed the levels, the golden levels appeared (all 7 within 2 pips, test 1). The data already contains the chart. MDVE completes the pivot.

---

## 2. THE CORE INSIGHT (zone-producing candle types map to data structures)

Every element the operator draws on a chart is produced by a specific, identifiable candle structure:

| Chart element | The candle structure (computable from OHLC) |
|---|---|
| **S/D zone (order block)** | The candle immediately BEFORE a strong breakout (displacement ≥ θ·ATR over ≥3 days) — the OB candle's [low, high] range IS the zone. Bull breakout → demand (prior bearish candle); bear breakout → supply (prior bullish candle). Break of structure required. |
| **BoM vs MoM** | The OB's position in the move's anatomy: BoM = the origin of the leg (the first OB after a sweep/reversal — manipulation leg origin); MoM = a mid-leg shelf (consolidation inside an established leg). Computable from the surrounding candle sequence (what came before the OB: a sweep low/high vs a continuation). |
| **LQZ (liquidity zone)** | A price range where MANY candles' wicks/bodies align across days/weeks — the horizontal clustering of touches. Dozens of candles across multiple weeks reacting to the same price range = institutional liquidity. Pure clustering problem over price × time. |
| **Freshness (UM/1x/2x/pierced)** | Retest EVENTS after formation (event-granularity — already canon: a 2-day retest is ONE battle; consolidation dwell is not a retest; pierce requires a battle, gap-through is not depletion). |
| **The weekly narrative** | Sweep origin (the week's extreme candle with sweep anatomy — long wick through a prior extreme closing back inside), range top/bottom (the consolidation boundaries), N distinct reactions at each boundary, the break (the displacement candle that pierced the boundary, e.g. Friday Tokyo BS through the range bottom). |
| **Trade setups** | Entry = next reaction at a zone of significance; SL = inside the next rung beyond the zone; TP = the opposing rung of significance via the Law-14 walk. All geometry over the computed ladder. |
| **The cross-pair mirror** | EU's chart is ~80-90% the inverted DXY down to candle structure; GU is the same macro moves with its own volatility profile. The same zones form at the same times (inverted) — the mirror is a structural mapping, not a price conversion. |

**None of this requires a single pixel.** Every row is a deterministic function of OHLC bars. The existing codebase ALREADY computes most of it (4h-sd-lobe's OB detection, lqz-lobe's liquidity detection, the event-granularity counter, the ladder-scaffold) — MDVE unifies, extends, and elevates it to the complete chart model, and adds the three missing pieces: the **LQZ matrix** (first-class clustering), the **weekly narrative model**, and the **mirror engine**.

---

## 3. ARCHITECTURE (the mental model as primary perception)

```
                        ┌─────────────────────────────────────┐
                        │  RAW DATA (harvest — existing)       │
                        │  OHLC 4H/1H/30m/15m × 4 pairs,       │
                        │  options (when present), anchor      │
                        └──────────────┬──────────────────────┘
                                       │
              ┌────────────────────────▼────────────────────────┐
              │              MDVE (src/mdve/)                    │
              │                                                  │
              │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
              │  │ OB/S-D   │ │ LQZ      │ │ BoM/MoM +        │ │
              │  │ detector │ │ MATRIX   │ │ freshness state  │ │
              │  │ (canon)  │ │ (NEW)    │ │ machines         │ │
              │  └──────────┘ └──────────┘ └──────────────────┘ │
              │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
              │  │ WEEKLY   │ │ SCAFFOLD │ │ REACTION-        │ │
              │  │ NARRATIVE│ │ LADDER   │ │ VALIDITY (NEW)   │ │
              │  │ (NEW)    │ │ (v4.3)   │ │                  │ │
              │  └──────────┘ └──────────┘ └──────────────────┘ │
              │  ┌────────────────────────────────────────────┐ │
              │  │  MIRROR ENGINE (NEW): DXY → EU → GU        │ │
              │  └────────────────────────────────────────────┘ │
              │                      │                           │
              │         CHART MENTAL MODEL (§5 — the output)     │
              └──────────────────────┬───────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
┌───────▼────────┐         ┌─────────▼─────────┐        ┌────────▼────────┐
│ ENGINE 2+3     │         │ ORACLE LOOP (§10) │        │ PRESENTATION    │
│ (existing —    │         │ MiMo pixel-vision │        │ (charts drawn   │
│ shape chains,  │         │ verifies specific │        │ for the human;  │
│ setup gen,     │         │ model claims      │        │ VEI governs     │
│ mirror stage)  │         │ (§10)             │        │ execution)      │
└───────┬────────┘         └───────────────────┘        └─────────────────┘
        │
┌───────▼────────┐
│ PVE (JUDGE)    │
└────────────────┘
```

**The critical inversion vs v4.3:** in v4.3, the harness computed zones and the model verified them (scaffold + verdicts). In v4.4/MDVE, the harness computes the ENTIRE chart model — zones, ladder, freshness, narrative, mirror map — and the model verifies only the residual perceptual claims (§10). The pipeline's zone/shape/setup stages consume the model; the pixel lane no longer feeds identity at all.

**What happens to the existing components (nothing is thrown away):**

| Existing component | MDVE disposition |
|---|---|
| 4h-sd-lobe (OB/S/D detection, event-granularity freshness, canon zfp) | **Absorbed as the OB/S-D sub-engine** (multi-TF: 4H+1H+30m — already TF-parameterized) |
| lqz-lobe (LQZ detection, canon zfp ladder) | **Absorbed as the LQZ sub-engine's detection core**; the NEW LQZ matrix (§6.2) sits on top as the clustering/vision layer |
| ladder-scaffold (v4.3 W7) | **Absorbed as the scaffold backbone** (§7) — now fed by MDVE's unified model |
| 9-pillar-lobe | **Unchanged** — the confluence layer (pivots/MAs/options/analyst) feeding rung significance |
| shape-brain (Engine 2) | **Unchanged** — consumes the model's zones per pair (W6-3 per-pair chains stay) |
| visual-setup-generator (Engine 3) | **Unchanged in geometry** — consumes the model + mirror output; entry/SL/TP machinery frozen |
| TVI verdict lane (zip.ts, SCAFFOLD_VERDICT_PROMPT) | **Repurposed to the oracle loop** (§10) — verdicts verify MDVE's model claims instead of establishing identity |
| The dedup machinery (geometry fingerprint) | **REPLACED by the corrected doctrine** (§8.4): same zone+day+time = same trade; multi-day reactions legitimate |

**PROVEN AT BASELINE (v4.3 CLEAN_BASELINE @ SHA 2f49d4c2 — do NOT rebuild, ABSORB):** the deterministic ladder-scaffold (498 lines, golden levels ≤2 pips, byte-identical determinism), the verdict protocol (verdict parsing + gate 9 + SCAFFOLD_VERDICT_PROMPT_TEMPLATE), the scaffold→generator integration (SCAFFOLD_CONFIRMED/UNVERIFIED matching, 7/7 assertions), the anchor geometry (SL next rung :784, TP significance walk :919), the retry loop (:417-530), the canon zfp ladders, the event-granularity freshness, the corrected dedup (zone+day+session — zero same-day re-fires in test 5), the reaction-validity gate (36 no-touch kills in test 5 — bar-range version; the battle-anatomy upgrade per §8.1 is the v4.4 refinement), the per-pair shape chains + bias injection, the fallback pool + inheritance, Protocol A + options wiring, the hook-args contract, the TVI stack (17 files), the ladder module, the temporal directives, the walk over-capture fix, the double-feed proximity dedup. **The v4.4 build ADDS the matrix, the narrative, the mirror, the battle-anatomy touch semantics, the oracle loop, and the MathContract enforcement — it does not rebuild the proven machinery.**

---

## 4. MATHEMATICAL FOUNDATIONS (the MPSE structure map)

MDVE is built directly on the MPSE library (fully mapped 2026-07-28 — 5 files, ~12,458 lines). The structures each MDVE component consumes:

### 4.1 The chart model as a total function

- **Losslessness Theorem (KB-MPSE-01 L125-141):** `M: OHLC × Options × Anchor → ChartModel` is well-typed and total ⇒ exactly one model per input. Every MDVE function is total: every candle sequence classifies to exactly one structure (piecewise exhaustiveness, §4.3).
- **Algebraic composition (Structure 1):** `harvest ∘ detect ∘ classify ∘ narrate ∘ mirror` — each stage's output type = the next stage's input type. Skipping a stage breaks compilation. The pipeline is un-bypassable by construction.
- **Domain & range (Structure 13):** every function rejects malformed input at its boundary (price > 0, high ≥ low, 5-dp FX / 3-dp DXY, timestamps ordered). Garbage never enters the model.

### 4.2 The clustering mathematics (LQZ matrix vision)

- **Partitions / equivalence classes / quotient sets (KB-MPSE-01 §2.4-2.6, L506-665):** the LQZ clustering formalism. `c₁ ~ c₂ ⟺ |price(c₁) − price(c₂)| ≤ ε·ATR` — an equivalence relation (proven reflexive/symmetric/transitive). An LQZ is an equivalence class with a cardinality predicate: `LQZ = { [p] : |[p]| ≥ minTouches ∧ spanWeeks([p]) ≥ minWeeks }`.
- **Matrix operations (Structure 9):** the literal liquidity matrix `M[priceBucket][week] = touchEvents` — the completeness invariant ("every cell exists") makes the model total over price × time.
- **Vector distance (Structure 17):** the proximity metric (`|p₁−p₂| ≤ ε·ATR`, ATR-scaled per pair — DXY 0.01 pip, FX 0.0001).
- **Monotonicity (Structure 14):** output zones are ordered, non-overlapping — `validateZoneOrdering` (KB-MPSE-00 L860-874, liftable verbatim).

### 4.3 The classification mathematics (OB/S-D, BoM/MoM, narrative)

- **Piecewise functions + exhaustiveness (Structure 4):** every classifier maps every input to EXACTLY ONE branch — `∀ window: ∃ exactly one piece with condition=true` (KB-MPSE-00 L239). The OB classifier (§6.1), the BoM/MoM classifier (§6.3), the narrative classifier (§6.5) are all piecewise-total with an explicit `UNKNOWN/OTHERWISE` branch — no forgotten cases, no ambiguous inputs.
- **Boolean algebra (Structure 7):** the OB predicate conjunction `isOB ⟺ priorCandle(bearish) ∧ displacement ≥ θ·ATR ∧ breaksStructure(up)` — with a SAT check (KB-MPSE-01 §6.1, L1565-1579) proving the predicate set has no contradictions and no gaps.
- **Logical implication (Structure 20):** doctrine as implications — `(displacement ≥ θ ∧ priorBearish) → BullishOB`. If the premise holds and the conclusion wasn't produced: IMPLICATION VIOLATION (logged, abort).
- **Recurrence relations (Structure 6):** freshness state machines `FRESH → TESTED → MITIGATED → VIOLATED` as `stateₙ₊₁ = f(stateₙ, touchEventₙ)` — Markov, no look-ahead, explicit termination.

### 4.4 The immutability mathematics (doctrine as MathContract)

- **MathContract (KB-MPSE-03 L271-277):** every doctrine rule as `{preconditions, postconditions, invariants, temporal}` — ONE doctrine object consumed by every layer (detection guards, pipeline gates, LTL model-checker, snapshot validation, offline verification).
- **Invariants (Structure 10):** checked after every transition; violation → ABORT (not warn). E.g. `zones non-overlapping`, `ladder sorted`, `mirror count ≥ DXY count − documented casualties`.
- **Combinatorics (Structure 19):** `f(T) = N + I(P) = 24` as a **count firewall** — the pipeline's output count must satisfy the formula modulo documented filter casualties; 13 or 40 without documented reasons = FIREWALL REJECT (the agent cannot produce 25 — KB-MPSE-01 L231).
- **Horn clauses + forward chaining + contradiction detection (KB-MPSE-01 §6.3-6.5):** the doctrine encoded as clauses; `detectContradictions` proves the doctrine can never emit both ENTER and BLOCK for the same candidate — proven satisfiable and complete BEFORE it runs.

---

## 5. THE CHART MENTAL MODEL (the output data structure)

MDVE's output is ONE object per pair per week — the complete "visual" the agent reasons over:

```typescript
export interface ChartModel {
  pair: string;
  weekStart: string;
  anchor: { weekStartMs: number; anchorMs: number };
  spot: number;

  /** The zone map — every S/D zone across 4H/1H/30m. */
  zones: ZoneModel[];              // §6.1 — OB-derived, BoM/MoM classified, freshness-annotated

  /** The liquidity matrix — every LQZ with its full touch structure. */
  lqzMatrix: LqzMatrixEntry[];     // §6.2 — clustered, week-spanning, matrix-complete

  /** The deterministic ladder (§7 — the v4.3 scaffold, now model-fed). */
  ladder: ScaffoldRung[];          // sorted, deduped, range-filtered, source-annotated

  /** The weekly narrative (§6.5). */
  narrative: WeeklyNarrative;      // sweepOrigin, rangeTop, rangeBottom, reactions[], theBreak

  /** The mirror map (§9) — present on EU/GU models; DXY's model is the mirror SOURCE. */
  mirrorSource?: { pair: string;   // 'DXY' for EU; 'EUR/USD' for GU
                   mappings: MirrorMapping[] };
}

export interface ZoneModel {
  id: string;                      // deterministic: `${pair}|${tf}|${obTimestamp}|${floor}`
  type: 'SUPPLY' | 'DEMAND';
  top: number; bottom: number;
  timeframe: '4H' | '1H' | '30m';
  classification: 'BoM' | 'MoM';   // §6.3 — from candle anatomy, never from a label
  formationMs: number;             // the OB candle's timestamp (mirror matching key, §9.2)
  freshness: FreshnessState;       // §6.4 — the recurrence state machine's output
  reactionEvents: ReactionEvent[]; // event-granularity (canon — battles, not bars)
  zfp: number;                     // canon zfp (type + freshness + LQZ ladder)
  confluence: number;              // 9-pillar composite at this level
}

export interface LqzMatrixEntry {
  priceCenter: number;             // the equivalence-class center
  top: number; bottom: number;
  side: 'BUY_SIDE' | 'SELL_SIDE';
  touchEvents: ReactionEvent[];    // every touch, with timestamps + candle refs
  weekSpan: number;                // how many distinct weeks touched this level
  confirmationPatterns: string[];  // sweep/long-wick/consolidation pattern types (canon ≥2)
  zfp: number;                     // canon LQZ ladder
}

export interface WeeklyNarrative {
  sweepOrigin: { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH' } | null;
  rangeTop: { price: number; reactions: ReactionEvent[] } | null;
  rangeBottom: { price: number; reactions: ReactionEvent[] } | null;
  theBreak: { direction: 'UP' | 'DOWN'; ms: number; piercedLevel: number; displacement: number } | null;
  reactionsAtBoundaries: number;   // e.g. "2 distinct reactions at the range top before the break"
}

export interface MirrorMapping {
  sourceSetupId: string;           // the DXY (or EU) setup this mirrors
  direction: 'LONG' | 'SHORT';     // inverted from source for DXY→EU; same as source for EU→GU
  anchorZoneId: string;            // the pair's OWN zone (structurally equivalent, §9.2)
  entry: number; sl: number; tp: number;
  status: 'ACTIVE' | 'RRR_DISCARDED';
  discardReason?: string;          // e.g. "GU volatility: RRR 1.3 < floor 2.0 after re-anchor"
}
```

Determinism: `ChartModel` contains no wall-clock fields (all timestamps are candle timestamps). Same bars → byte-identical model.

---

## 6. DETECTION SUB-ENGINES

### 6.1 OB/S-D detection (absorbed canon + extension)

The existing 4h-sd-lobe is canon (singular origin candle, TF-scaled params, event-granularity freshness, canon zfp — all proven). MDVE extends it:

1. **Multi-TF as first-class:** 4H + 1H + 30m detection runs ALWAYS (the v4.3 scaffold already calls all three; MDVE makes them co-equal citizens of the zone map with full metadata — formationMs retained per zone).
2. **Displacement qualification as a total predicate:** `displacement(ob, next) = (max(close[next]) − min(close[next])) / ATR(14)` over the next k bars; `isBreakout ⟺ displacement ≥ θ_tf ∧ structureBroken` with `θ_4H = 0.5 DXY pts / 3 days` canon (existing), extended: `θ_1H`, `θ_30m` from TF_CONSTRUCTION_PARAMS.
3. **Zone identity carries formationMs** — the OB candle's timestamp (new field; required by the mirror engine, §9.2).
4. **Exhaustiveness proof:** the classifier is piecewise-total — every (candle, context) → exactly one of {BullishOB, BearishOB, NotOB} — with the SAT check run at build time (KB-MPSE-01 §6.1) proving no overlap/gap in the predicate set.

### 6.2 The LQZ matrix (NEW — the "liquidity matrix vision")

The operator's formulation: *"this should be extremely easy to see in data since dozens of candles across multiple weeks all react to the same price range — a liquidity matrix vision that uses matrices to find all the LQZs in the data."*

**The matrix.** For each pair:
```
Buckets: partition the observed price range into ATR-scaled buckets (ε = 0.25 × ATR(14, 1H) —
         sub-rung resolution; the golden rungs are 3-10 pips apart, so buckets must be finer).
Matrix M[bucket][isoWeek] = touchEvents(bucket, isoWeek)
  where touchEvents = count of bars whose wick or body RANGE intersects the bucket,
  excluding bars that pass through without reaction (a reaction = the bar's close is on the
  opposite side of the bucket from its open, OR the bar's wick enters the bucket and the body
  closes outside it — sweep anatomy — OR the bar is part of a consolidation dwelling at the bucket).
LQZ candidates = { bucket : Σ_weeks M[bucket][week] ≥ MIN_TOUCHES (canon: 2+ confirmation
  pattern types from the existing lqz-lobe thresholds) ∧ weekCoverage(bucket) ≥ 1 }
Merge adjacent candidate buckets into zones via the equivalence relation (§4.2).
```

**Relationship to the existing lqz-lobe:** the lqz-lobe's 3-pattern confirmation (LIQUIDITY_SWEEP / LONG_WICK / SHORT_WICK_CONSOL, 24-bar sweep lookback, 3-bar sharp move, 5-pip wick — all 1H-calibrated canon) remains the PER-PATTERN detector. The matrix is the VISION layer on top: it shows the full liquidity landscape (every bucket's touch count across 6 weeks), from which the rungs emerge as the high-cardinality equivalence classes. The matrix is also what makes rung DENSITY inspectable — the golden 4-10 pip spacing appears as adjacent occupied buckets, and gaps appear as empty rows.

**Completeness invariant (MPSE Structure 9):** every cell of the matrix exists (zero-filled where no touches) — the model is total over price × time; no unexamined region.

**Output:** `LqzMatrixEntry[]` (§5) — each with touchEvents (full reaction history), weekSpan, confirmationPatterns, zfp (canon ladder: fresh confirmed = Hard Wall zfp 20 + exhaustion per touch count).

#### 6.2.1 The matrix algorithm (complete pseudocode)

```typescript
// ═══ LQZ MATRIX VISION — the full algorithm (normative) ═══
// Input: bars1H (720 bars, 6 weeks — canon lookback), pair, pipValue, atr14(1H)
// Output: LqzMatrixEntry[] — every liquidity zone with full touch structure

const EPSILON = 0.25 * atr14Pips;      // bucket half-width in pips — BECAUSE: the golden
                                       // rungs are 4-10 pips apart; the bucket must
                                       // resolve them (2-4 buckets per inter-rung gap)
const MIN_PATTERN_TYPES = 2;           // canon (lqz-lobe): ≥2 distinct confirming patterns

// ── Stage 1: TOUCH EXTRACTION — classify every bar's interaction with every level ──
// A "touch" is NOT any bar whose range covers a price — it is a bar that REACTED.
// Touch semantics (total predicate — every bar classifies to exactly one branch):
type TouchKind = 'SWEEP' | 'WICK_REJECT' | 'BODY_DEFEND' | 'CONSOL_DWELL' | 'PASS_THROUGH';

fn classifyTouch(bar, level, prevBar): TouchKind =
  if wickEnters(bar, level) && bodyClosesBeyond(bar, level) && prevBarDidNotDwell:
    'SWEEP'                 // spiked through, closed back — the liquidity event
  else if wickEnters(bar, level) && !bodyClosesBeyond(bar, level) && bodyReverses(bar):
    'WICK_REJECT'           // wick tested, body reversed — defended
  else if bodyInside(bar, level) && nextBarsReverseDirection(level):
    'BODY_DEFEND'           // body sat at the level and price turned
  else if barInConsolidationCluster(bar, level):
    'CONSOL_DWELL'          // consolidation dwelling AT the level — the shelf
  else:
    'PASS_THROUGH'          // traversed without reacting — NOT a touch (excluded)

// ── Stage 2: BUCKET ASSIGNMENT ──
// Every non-PASS_THROUGH touch is assigned to its price bucket.
// bucketKey(price) = Math.round(price / (EPSILON * pipValue))
matrix: Map<bucketKey, Map<isoWeek, TouchEvent[]>>   // M[bucket][week] = touches

// ── Stage 3: EQUIVALENCE-CLASS MERGE ──
// Adjacent occupied buckets merge via the equivalence relation:
//   b₁ ~ b₂ ⟺ |center(b₁) − center(b₂)| ≤ EPSILON ∧ both occupied
// (proven reflexive/symmetric/transitive — MPSE Structure 15).
// Merged class = the LQZ candidate: top = max(bucket tops), bottom = min(bucket bottoms),
// center = touch-weighted mean of contributing touch prices.

// ── Stage 4: CONFIRMATION (the canon pattern gate) ──
// A candidate becomes an LQZEntry ⟺
//   |distinct TouchKinds across its touches| ≥ MIN_PATTERN_TYPES
//   AND total touch events ≥ 2 (the canon 2+ confirmation)
// AND it carries: weekSpan = |distinct isoWeeks with touches|,
//   zfp = canonLadder(touchCount) = min(60, 20 + max(0, floor((touchCount − 3) / 2)) × 5),
//   side = center > spot ? 'BUY_SIDE' : 'SELL_SIDE'.

// ── Stage 5: COMPLETENESS INVARIANT (MPSE Structure 9) ──
// Every bucket in the observed range exists in the matrix (zero-filled where untouched).
// The model is total over price × time — no unexamined region.
// Verified post-construction: ∀ bucket ∈ range: matrix.has(bucket).
```

**Why the touch semantics exclude PASS_THROUGH:** the matrix's signal is REACTION, not coverage. A level price traversed 40 times without reacting is NOT liquidity — it's noise. The golden LQZs are defined by battles (sweeps, rejections, defenses, dwellings), and the matrix counts exactly those. This is the same doctrine as the event-granularity freshness counter (bars ≠ events) applied to liquidity.

**Relationship to the ladder dedup:** matrix entries feed the scaffold's LQZ source. Two matrix entries within the scaffold's 3-pip dedup tolerance merge at the SCAFFOLD stage (§7) with ORDER_BLOCK > LQZ > OPTION_WALL > PIVOT > SWING > FIB > MA priority — the matrix never double-counts a level an order block already owns.

### 6.3 BoM/MoM classification (from candle anatomy — NEW formalization)

The operator: *"which S/D zones are BoM vs MoM (discernible from the candle body data of BS/WL before/after the OB candle)."*

The classifier (piecewise-total):
```
classifyRole(ob, barsBefore, barsAfter) =
  { BoM,  if ∃ sweepEvent(barsBefore, ob) within SWEEP_LOOKBACK bars
            ∧ displacement after ob ≥ θ              // the OB ORIGINATED the leg
  { MoM,  if legEstablished(barsBefore)              // price was already moving this direction
            ∧ consolidationAnatomy(ob)               // the OB is a mid-leg shelf
  { MoM,  otherwise }                                // exhaustiveness: default to the weaker class
```
- `sweepEvent`: a candle whose wick exceeds the prior N-bar extreme and whose body closes back inside (sweep anatomy — pure OHLC).
- `legEstablished`: the move direction was already in force before the OB (prior displacement in the same direction).
- `consolidationAnatomy`: the OB sits inside a tight multi-candle range (body overlap ≥ 50% across 2-4 candles).

The existing `classifyOrderBlock` (4h-sd-lobe) provides the current implementation; MDVE formalizes it as this piecewise-total classifier with the anatomy predicates above and the exhaustiveness proof.

### 6.4 Freshness / mitigation state machines (recurrence, canon)

The existing event-granularity counter is canon (bars ≠ events; pierce requires battle; gap-through ≠ depletion). MDVE formalizes it as an explicit state machine per zone:

```
States: FRESH(0x) → TESTED(1x) → TESTED(2x) → DEPLETED(3x+) | VIOLATED(pierced)
Transition on touchEvent(bar):
  FRESH   --[battle at zone]--> TESTED(1x)
  TESTED  --[battle]--> TESTED(2x) --[battle]--> DEPLETED
  any     --[close beyond zone with battle]--> VIOLATED
  any     --[gap-through without battle]--> (no transition — being-left-behind ≠ depletion)
```
Each state maps to canon zfp per type (BoM 10/18/32/65, MoM 65/22/38/70 — the inverted-at-0x doctrine). The state machine is a pure recurrence (MPSE Structure 6): `stateₙ₊₁ = f(stateₙ, touchEventₙ)` — no look-ahead, no history rewrite.

### 6.5 The weekly narrative model (NEW)

Computes the operator's GOD-VISION autopsy from data:

1. **Sweep origin:** scan the week (± lookback) for the sweep anatomy at the week's extreme: `sweepLow = argmin(low) with wick-through-prior-extreme ∧ close back inside`. The circled origin on the gold chart (100.61, Jul 6 06:00) is exactly this.
2. **Range boundaries:** the consolidation top/bottom — computed as the highest/lowest equivalence classes with ≥2 touch events during the consolidation window (the range top 101.19-101.24 and bottom ~100.94 on the gold chart).
3. **Reactions at boundaries:** event-granularity count at each boundary (the "2 distinct reactions at the range top before Friday" — each reaction = arrival + rejection anatomy + departure).
4. **The break:** the displacement candle that pierced a boundary: `theBreak = first bar with close beyond boundary ∧ displacement ≥ θ` — Friday Tokyo BS through the range bottom (Jul 10), direction DOWN, piercedLevel = rangeBottom.
5. **The post-break reaction:** where price went after the break (the Friday pierce drove into the 1H BoM at 100.68-100.73 and reacted up — computable: the first zone of significance in the break direction where a battle occurred).

The narrative is what Engine 2's shape chain reads (SS/WL/BS/RWL shape classification from the narrative's actual events rather than pure zone statistics) — the shape chain's directional sensitivity problem (DXY read NEUTRAL in a golden-short week) is addressed by feeding it the narrative: sweep + range + 2 reactions + break = the week's actual story.

#### 6.5.1 The narrative algorithm (complete pseudocode)

```typescript
// ═══ WEEKLY NARRATIVE — the GOD-VISION autopsy, computed (normative) ═══
// Input: bars1H for [weekStartMs − 7d, anchorMs] (current week + prior-week context), zones, lqzMatrix
// Output: WeeklyNarrative

// ── Step 1: SWEEP ORIGIN (the first thing the operator looks for) ──
fn findSweepOrigin(weekBars, priorBars): SweepEvent | null {
  const weekLow  = min(weekBars.map(b => b.low));
  const weekHigh = max(weekBars.map(b => b.high));
  const priorExtremeLow  = min(priorBars.map(b => b.low));
  const priorExtremeHigh = max(priorBars.map(b => b.high));

  // SWEEP_LOW: a bar whose wick pierced the prior extreme low and whose body closed back above
  const sweepLowBar = weekBars.find(b =>
    b.low < priorExtremeLow && b.close > priorExtremeLow &&
    (b.close - b.low) / (b.high - b.low) >= 0.5);        // lower-wick ≥ 50% of range — sweep anatomy
  if (sweepLowBar && weekLow === sweepLowBar.low)
    return { price: sweepLowBar.low, ms: sweepLowBar.timestamp, anatomy: 'SWEEP_LOW' };

  // SWEEP_HIGH: mirror image
  const sweepHighBar = weekBars.find(b =>
    b.high > priorExtremeHigh && b.close < priorExtremeHigh &&
    (b.high - b.close) / (b.high - b.low) >= 0.5);
  if (sweepHighBar && weekHigh === sweepHighBar.high)
    return { price: sweepHighBar.high, ms: sweepHighBar.timestamp, anatomy: 'SWEEP_HIGH' };

  return null;   // no sweep this week — honest null, never fabricated
}

// ── Step 2: RANGE BOUNDARIES (the consolidation box) ──
// The range top/bottom are the highest/lowest LQZ matrix entries with ≥2 touch events
// during the consolidation window (the week's mid-section after the sweep, before the break).
fn findRangeBoundaries(lqzMatrix, consolidationWindow): { top, bottom } {
  const inWindow = lqzMatrix.filter(e =>
    e.touchEvents.some(t => t.ms >= consolidationWindow.start && t.ms <= consolidationWindow.end));
  const top    = maxBy(inWindow.filter(e => e.side === 'BUY_SIDE'),  e => e.priceCenter);
  const bottom = minBy(inWindow.filter(e => e.side === 'SELL_SIDE'), e => e.priceCenter);
  return { top, bottom };
}

// ── Step 3: REACTIONS AT BOUNDARIES (event-granularity — canon) ──
// A "reaction" = arrival (bar enters the boundary zone) + rejection anatomy
// (wick/engulfing AWAY from the boundary) + departure (close back inside the range).
// This is the "2 distinct reactions at the range top before Friday's pierce" count.
fn countReactions(boundary, weekBars): ReactionEvent[] {
  return mergeIntoEvents(weekBars.filter(b => touches(b, boundary)))
    .filter(event => hasRejectionAnatomy(event, boundary));
}

// ── Step 4: THE BREAK (the displacement candle through the boundary) ──
fn findTheBreak(weekBars, boundaries, atr14): BreakEvent | null {
  for (const bar of weekBars) {
    const displacement = Math.abs(bar.close - bar.open) / atr14;
    if (bar.close < boundaries.bottom.priceCenter && displacement >= 1.5 && direction(bar) === 'DOWN')
      return { direction: 'DOWN', ms: bar.timestamp,
               piercedLevel: boundaries.bottom.priceCenter, displacement };
    if (bar.close > boundaries.top.priceCenter && displacement >= 1.5 && direction(bar) === 'UP')
      return { direction: 'UP', ms: bar.timestamp,
               piercedLevel: boundaries.top.priceCenter, displacement };
  }
  return null;   // consolidation unbroken this week — honest null (an SS week with no break)
}

// ── Step 5: POST-BREAK REACTION (where the break went) ──
// The Friday pierce drove price INTO the 1H BoM demand (100.68-100.73) and it reacted up.
// Computable: the first zone of significance in the break direction where a battle occurred.
fn postBreakReaction(theBreak, zones, barsAfter): ZoneModel | null {
  const path = zones.filter(z => inBreakPath(z, theBreak));
  return path.find(z => battleOccurredAt(z, barsAfter)) ?? null;
}
```

**The golden trace (what this computes for Jul 6-10):**
1. Sweep origin: `SWEEP_LOW at 100.61, Jul 6 ~06:00` (the circled origin — wick through the prior week's low, close back above).
2. Range: top ≈ 101.19-101.24 (BUY_SIDE LQZ with 2+ touches Jul 8-9), bottom ≈ 100.94-100.975 (SELL_SIDE with touches).
3. Reactions at the range top: 2 distinct events (Jul 8 first touch + rejection, Jul 9 second touch + rejection).
4. The break: `DOWN, Jul 10 (Tokyo session), piercedLevel ≈ 100.94, displacement ≥ 1.5×ATR` — the Friday BS.
5. Post-break: battle at the 1H BoM 100.68-100.73 → the T8 golden trade's origin.

---

## 7. THE SCAFFOLD LADDER (absorbed — now the perception backbone)

The v4.3 ladder-scaffold (498 lines, container-proven: deterministic, golden levels within 2 pips) is absorbed unchanged as MDVE's rung backbone, with its inputs upgraded from pipeline-stage byproducts to first-class model citizens:

- ORDER_BLOCK rungs: from §6.1's zone map (now with formationMs).
- LQZ rungs: from §6.2's matrix (with full touch history).
- PILLAR rungs: from the 9-pillar lobe (unchanged).
- FIB_RETRACE + SWING_EXTREME rungs: unchanged (week-range Fib + prior-week/day H/L/C).

Union → sort → dedup (3-pip tolerance, source-priority merge) → range filter (±200p) → bound (40). The dedup is a **structural** dedup (same LEVEL from multiple sources merges — correct) — NOT the trade dedup (§8.4, corrected doctrine).

---

## 8. REACTION-VALIDITY (the slop-killer — entry reachability from bars)

### 8.1 The doctrine (the operator's first-principles slop rule — RESOLVED 2026-07-28)

**The operator's ruling (verbatim):** "Trades require clear S/D + LQ that align with Engine 2 Shape mechanics or it is just noise."

A trade setup for (zone, day, session) is valid only when ALL THREE hold:

1. **The anchor is STRUCTURAL** — a clear S/D zone (order-block-derived supply/demand) or an LQ zone (liquidity rung). **Passive pillar levels (PIVOT / MA / OPTION_WALL / FIB_RETRACE / SWING_EXTREME) are RETIRED from the entry pool** — they remain in the scaffold as rungs (SL/TP anchors, Law-14 walk points, confluence context, significance ranking) but NEVER produce entries. This supersedes the old "IP zones are valid entry anchors with curation" doctrine. (The DXY=39 evidence: all 39 setups anchored on passive pillar levels — pivots, gamma, MA clusters, fibs — none are clear S/D or LQ. The golden standard's 8 trades all anchor on OB/LQZ.)
2. **The anchor was BATTLED** — a touch counts as a reaction ONLY with rejection anatomy (the §6.2 touch kinds: SWEEP / WICK_REJECT / BODY_DEFEND / CONSOL_DWELL). A PASS_THROUGH crossing (price traverses the level without rejection) is noise, not a reaction — at ANY zone, and specifically at passive levels which have no battle semantics by construction (the defect-E doctrine: passive strength is priced into significance ranking, not freshness).
3. **The trade aligns with Engine 2 shape mechanics** — it makes sense within the day's shape (SS range plays at boundaries, WL at Hard Walls, BS continuation, etc.). A structural zone with a battle that contradicts the day's shape mechanics is also noise.

```
VALID(zone, day, shape) ⟺ structural(zone) ∧ battled(zone, day) ∧ shapeAligned(zone, day, shape)

structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ}            // clear S/D or LQ — NEVER passive
battled(zone, day) ⟺ ∃ event ∈ touchEvents(day, zone) :
                       kind(event) ∈ {SWEEP, WICK_REJECT, BODY_DEFEND, CONSOL_DWELL}
shapeAligned(zone, day, shape) ⟺ the day's shape mechanics admit this zone's
                                  direction + position (existing category filters:
                                  WL at Hard Walls, SS at holding walls + ceiling/floor,
                                  §8.13 AUD profile, cascade alignment)
```

**Reachability (the v4.3 minimal version) is a necessary precondition, not a sufficient one:** `reachable(zone, day) = ∃ bar : barRange ∩ entryBand ≠ ∅` — geometry. `battled` is the binding condition — anatomy. The v4.3 bar-range gate shipped first (36 no-touch kills in test 5 — correct but incomplete); the anatomy + structural-class conditions complete the ruling.

### 8.2 Why this replaces the dedup philosophy

The DXY-40 slop was never a dedup problem — it was the generator emitting setups for zones price never approached on those days. The geometry fingerprint killed the symptom (byte-identical re-fires) while ALSO killing legitimate multi-day reactions (P6). Reaction-validity kills the actual disease: a zone only produces a setup for a day when price came to it. The 40-slop dies because most of those zone-days had no touch. The multi-day reactions live because the range top WAS touched twice (Jul 8 AND Jul 9 — two distinct battles, two valid trades).

### 8.3 The reaction event as the trade's temporal identity

Each valid setup carries its `ReactionEvent` (the arrival bar + battle anatomy). Trade identity = `(zoneId, reactionEvent.ms)` — same zone reacting at different times = DISTINCT trades (the operator's doctrine verbatim). This is the dedup key.

### 8.4 The corrected dedup (replaces the geometry fingerprint)

```
DUPLICATE ⟺ zoneId equal ∧ reactionEvent within the same session window
DISTINCT  ⟺ different zone, different day, or different session — even at identical prices
```
Same zone + same day + same session = same trade (kill — that's a pipeline re-fire). Everything else = legitimate. The day-independent geometry fingerprint is DELETED (it violated this doctrine). The cross-zone same-price case (EUR #1/#2 from the test-4 investigation): two zones at the same level with the same reaction = the ladder's structural dedup merges them at the RUNG level (§7) — so the double-emit dies at the source, not at the trade level.

#### 8.4.1 The reaction-validity algorithm (complete pseudocode)

```typescript
// ═══ REACTION-VALIDITY — the slop-killer (normative) ═══
// A setup for (zone, day, session) is valid ⟺ price actually reached the zone's
// entry band during that window. Computable from harvested 1H bars. Zero vision.

// ── The entry band (what "reaching the zone" means) ──
fn entryBand(zone: ZoneModel, direction: Direction): [number, number] {
  // For LONG from demand: the band is [zone.bottom − buffer, zone.ceiling]
  //   (price must dip INTO the zone — the ceiling is the entry edge, Law 7 buffer below)
  // For SHORT from supply: [zone.floor, zone.top + buffer]
  const buffer = LAW7_BUFFER[pairOf(zone)] * pipValueOf(zone);
  return direction === 'LONG'
    ? [zone.bottom - buffer, zone.top]
    : [zone.bottom, zone.top + buffer];
}

// ── The reachability check ──
fn reachable(zone: ZoneModel, direction: Direction, windowBars: OHLCBar[]): boolean {
  const [lo, hi] = entryBand(zone, direction);
  return windowBars.some(b => b.low <= hi && b.high >= lo);   // bar range ∩ entry band ≠ ∅
}

// ── The reaction event extraction (the trade's temporal identity) ──
// Each valid setup carries the event that proves price came to the zone:
fn extractReactionEvent(zone: ZoneModel, direction: Direction, windowBars: OHLCBar[]): ReactionEvent | null {
  const [lo, hi] = entryBand(zone, direction);
  const touches = windowBars.filter(b => b.low <= hi && b.high >= lo);
  if (touches.length === 0) return null;
  // The event = the contiguous touch sequence + the rejection anatomy (canon
  // event-granularity: a multi-bar battle is ONE event; consolidation dwell is not a battle)
  const event = mergeContiguous(touches);
  return {
    zoneId: zone.id,
    firstTouchMs: event[0].timestamp,
    lastTouchMs:  event[event.length - 1].timestamp,
    session: sessionOf(event[0].timestamp),        // Tokyo / London / NY — the dedup key component
    anatomy: classifyAnatomy(event, zone),         // SWEEP | WICK_REJECT | BODY_DEFEND | DWELL
    bars: event.length,
  };
}

// ── The dedup key (corrected doctrine) ──
fn tradeIdentity(zoneId: string, ev: ReactionEvent): string {
  return `${zoneId}|${ev.session}|${dayOf(ev.firstTouchMs)}`;
  // Same zone + same day + same session = DUPLICATE (pipeline re-fire — kill).
  // Same zone + different day/session = DISTINCT (the range top reacting Jul 8 AND Jul 9
  // = two trades; the old fingerprint killed the second — that was the EUR starvation bug).
}
```

**Why this kills the DXY-40 slop without a fingerprint:** the 40 were setups emitted for zones price never approached on those days — with reachability as an emission precondition, those zone-days produce NOTHING (no touch → no event → no setup). The 13 unique trades survive (their zones were touched). The multi-day reactions survive too (Jul 8 touch + Jul 9 touch = 2 events = 2 trades). No counting, no caps, no fingerprint — just physics: did price come to the zone or not.

**The state machine (per zone, for the generator's consumption tracking):**
```
States: AVAILABLE → OFFERED(session) → CONSUMED(session) | EXPIRED
  AVAILABLE --[reaction event in session S]--> OFFERED(S)      // setup emitted for S
  OFFERED(S) --[same zone, same S]--> CONSUMED(S)              // re-fire killed (DUPLICATE)
  OFFERED(S) --[new reaction event in S']--> OFFERED(S')       // NEW trade (DISTINCT)
  OFFERED(S) --[zone VIOLATED]--> EXPIRED                      // zone dead — no more offers
```

---

## 9. THE MIRROR ENGINE (DXY→EU→GU mechanical cascade)

### 9.1 The doctrine (the operator, verbatim)

"Engine 3 trade setups calculated for DXY. DXY → EU (inverse direction). EU → GU (adjust E/SL/TP to match GU candles). EU and GU CANNOT have LESS trades than DXY. Every DXY trade MECHANICALLY maps to a mirror trade from the exact same (inverse — supply=demand, demand=supply) zones on EU/GU. Copy the trade, invert the directions/zones, find the price coordinates on the specific pair. Emergent pair-specific trades ON TOP are fine and encouraged — MORE than 24 is fine, LESS is not. GU diverges: bigger swings, tighter consolidations, moves can begin early or late by hours or a full session; some cascaded setups die to the RRR filter (GU's volatility); GU winners run 5-11 RRR vs EU 4-8."

### 9.2 The structural-equivalence mapping (how the mirror anchor is found)

For a DXY setup anchored at zone Z_dxy (type T, formationMs F), the EU mirror anchor Z_eu is EU's OWN zone with:
1. **Inverse type:** T_eu = inverse(T_dxy) (supply↔demand). The same institutional structure exists on EU inverted (EU candles are ~80-90% inverted DXY).
2. **Nearest formation time:** `argmin over EU zones of inverse type |formationMs_eu − F_dxy|`, within a tolerance (±24h — the same macro structure forms within a day on both charts). The circled sweep origin on DXY (Jul 6 06:00) has its EU counterpart sweep at the same session (the sweep high ~1.146).
3. **Rank fallback:** if no time-match within tolerance, rank-match: the nth inverse-type zone from spot on EU ↔ the nth type-zone from spot on DXY (the 2nd supply above DXY spot ↔ the 2nd demand below EU spot).
4. **No match at all → the mirror is declared FAILED for that setup** (honest — logged with the attempted matches), and the setup relies on the emergent lane.

For EU→GU: same mapping from EU's zone to GU's zone — but GU's version of the same structure may sit at a different distance from spot (the operator: "a 4H BoM 15 pips from spot on DXY might be 25 on EU and 50 on GU"). The mapping finds GU's zone by the same formation-time + rank logic; the DISTANCE is whatever GU's chart says it is.

### 9.3 The mirror trade construction

```
mirrorSetup(source: TradeSetup, targetPair, anchorZone Z_tgt) = {
  direction: source.pair === 'DXY' ? inverse(source.direction) : source.direction,  // DXY→EU inverts; EU→GU keeps
  entry: Z_tgt's entry edge (same edge semantics as source — ceiling for demand-long, floor for supply-short),
  sl: inside the NEXT RUNG beyond Z_tgt in the TARGET pair's own ladder (the target's ladder
      provides the rung — the SL doctrine is pair-native: Law 7, pair buffer, <36p ceiling),
  tp: the opposing rung of significance in the TARGET pair's ladder via the Law-14 walk
      (mirrored direction — the mirrored walk),
  rrr: computed from the target pair's actual geometry,
  mirrorOf: source.id,
  status: rrr >= RRR_FLOOR(targetPair, category) ? 'ACTIVE' : 'RRR_DISCARDED',
}
```

**The GU RRR filter (the casualty mechanism):** after re-anchoring to GU's candles, the mirror trade's RRR is computed on GU's geometry. If it fails the floor (GU's volatility compressed this particular move's candles — the operator's "smaller candles on this move"), the trade is `RRR_DISCARDED` with the logged reason (`"GU mirror of EU T1: RRR 1.3 < 2.0 after re-anchor — GU candles smaller on this move"`). The discard is HONEST and documented — the f(T)=24 firewall counts ACTIVE mirrors + documented discards. GU's inverse volatility effect (winners at 5-11 RRR vs EU 4-8) emerges naturally: the same re-anchor on swing moves produces wider GU TPs.

**Timing drift tolerance:** GU's moves begin early or late by hours or a full session — the mirror's day/session label comes from the TARGET pair's own reaction event (when GU's bars actually touched the anchor zone), not from the source setup's timestamp. The mirror trades happen "at the exact same time" macro-wise, with the session label from the target's actual touch. (The ±24h formation-time tolerance in Stage 1 covers the operator's documented drift profile — "early or late by a few hours or sometimes even a full session.")

### 9.4 The emergent lane (preserved on top)

The mirror lane produces the guaranteed floor: `|EU setups| ≥ |DXY ACTIVE mirrors|`, `|GU setups| ≥ |EU ACTIVE mirrors| − documented casualties`. The emergent lane (the existing per-pair generation — GU's 12 native setups in test 4) continues independently and its outputs are MERGED with the mirror lane (dedup by §8.4's reaction-event identity — an emergent setup at the same zone+session as a mirror is the same trade). Total per pair = mirrors + emergent extras. MORE than 24 total is fine. LESS is a firewall violation (§11).

**AUD/USD is emergent-only** (§8.13 profile: HTF Swing + Reinforcement categories only, Tokyo+London sessions). AUD has no mirror lane — its macro relationship to DXY is not the strict EU/GU tether (the operator: EU is practically an inverted copy-paste of DXY; GU diverges more; AUD is its own profile). AUD setups come solely from the emergent lane under its §8.13 gates — an all-SS week legitimately produces AUD=0.

### 9.5 What this does to the translation architecture

The W6-3 per-pair shape chains and dxyMacroBias injection remain (they serve the emergent lane and the cascade context). The mirror engine is a NEW stage AFTER Engine 3: `Engine3(DXY) → MirrorEngine(DXY setups, EU model) → MirrorEngine(EU setups, GU model)`. The bias injection's role shifts: it no longer carries the translation (the mirror does); it remains the MACRO DIRECTION input for emergent generation.

### 9.6 The mirror algorithm (complete pseudocode)

```typescript
// ═══ THE MIRROR ENGINE — DXY → EU → GU (normative) ═══
// Doctrine: every DXY setup maps mechanically to an EU inverse setup from the SAME
// (inverse-type) structural zone; every EU setup maps to a GU setup re-anchored to
// GU's candles. Emergent pair setups merge ON TOP. EU/GU never have FEWER setups
// than the source minus documented RRR casualties.

const FORMATION_TIME_TOLERANCE_MS = 24 * 3600 * 1000;  // ±24h — BECAUSE: the same macro
  // structure forms within a day on both charts (the Jul 6 sweep: DXY 06:00, EU same session).

// ── Stage 1: ANCHOR MATCHING (structural equivalence) ──
fn findMirrorAnchor(source: ZoneModel, targetZones: ZoneModel[], targetSpot: number): ZoneModel | null {
  const inverseType = source.type === 'SUPPLY' ? 'DEMAND' : 'SUPPLY';
  const candidates = targetZones.filter(z => z.type === inverseType);

  // 1a. FORMATION-TIME MATCH (primary): the same institutional structure forms at
  //     the same time on both charts (EU candles ≈ inverted DXY).
  const timeMatched = candidates
    .filter(z => Math.abs(z.formationMs - source.formationMs) <= FORMATION_TIME_TOLERANCE_MS)
    .sort((a, b) => Math.abs(a.formationMs - source.formationMs) - Math.abs(b.formationMs - source.formationMs));
  if (timeMatched.length > 0) return timeMatched[0];

  // 1b. RANK MATCH (fallback): the nth inverse-type zone from spot on the target
  //     ↔ the nth type-zone from spot on the source.
  const sourceRank = rankFromSpot(source, /* source pair's zones */);
  const rankMatched = candidates.sort((a, b) =>
    Math.abs(mid(a) - targetSpot) - Math.abs(mid(b) - targetSpot))[sourceRank - 1];
  return rankMatched ?? null;   // null → mirror FAILED for this setup (honest, logged)
}

// ── Stage 2: MIRROR CONSTRUCTION ──
fn buildMirror(source: TradeSetup, anchor: ZoneModel, targetModel: ChartModel, pair: string): MirrorMapping {
  const direction = source.pair === 'DXY' ? inverse(source.direction) : source.direction;
  // EU→GU KEEPS direction (EU and GU move together); DXY→EU INVERTS.

  const entry = entryEdge(anchor, direction);        // ceiling for demand-long, floor for supply-short
  const sl = nextRungInside(targetModel.ladder, anchor, direction, pair);
           // the TARGET pair's own ladder — SL doctrine is pair-native
           // (Law 7 buffer, Law-10 floor, <36p ceiling — computed on the target's rungs)
  const tp = law14Walk(targetModel.ladder, entry, direction, targetModel.zones);
           // the opposing rung of significance in the TARGET's ladder (mirrored walk)

  const rrr = computeBlendRrr(entry, sl, tp, pair);
  const floor = RRR_FLOOR[pair][categoryOf(source)];
  const status = rrr >= floor ? 'ACTIVE' : 'RRR_DISCARDED';
  const discardReason = status === 'RRR_DISCARDED'
    ? `${pair} mirror of ${source.mirrorOf ?? source.id}: RRR ${rrr.toFixed(1)} < ${floor} after re-anchor — ${pair} candles smaller on this move`
    : undefined;

  return { sourceSetupId: source.id, direction, anchorZoneId: anchor.id,
           entry, sl, tp, status, discardReason,
           session: sessionOfTouch(anchor, targetModel) };  // GU timing drift: the session
           // label comes from the TARGET's actual touch, not the source's timestamp
}

// ── Stage 3: THE CASCADE + EMERGENT MERGE ──
fn cascade(dxySetups: TradeSetup[], models: { DXY, EU, GU }): Record<pair, TradeSetup[]> {
  const euMirrors = dxySetups.map(s => mirrorInto(s, models.EU, 'EUR/USD'));
  const euAll = mergeLane(euMirrors.filter(ACTIVE), emergentSetups('EUR/USD'));
    // mergeLane dedups by (zoneId, reactionEvent.session) — §8.4:
    // an emergent setup at the same zone+session as a mirror IS the mirror.

  const guMirrors = euAll.map(s => mirrorInto(s, models.GU, 'GBP/USD'));
  const guAll = mergeLane(guMirrors.filter(ACTIVE), emergentSetups('GBP/USD'));

  // INVARIANT (mirror-floor contract — violation ABORTS):
  //   |euAll| ≥ |euMirrors.active| − 0   (EU can only lose a mirror to a FAILED anchor, logged)
  //   |guAll| ≥ |guMirrors.active|       (GU loses only to documented RRR_DISCARDED)
  return { 'DXY': dxySetups, 'EUR/USD': euAll, 'GBP/USD': guAll, 'AUD/USD': emergentSetups('AUD/USD') };
}
```

**The GU discard trace (the operator's documented case):** EU T1 (SHORT from the sweep high ~1.1444, Jul 5-6) → GU anchor = GU's equivalent supply at the week's top (~1.3455-1.3460). GU's candles on that specific move were SMALLER (the operator: GU volatility compressed that swing) → the re-anchored TP sits closer in GU terms → `rrr = 1.3 < 2.0` → `RRR_DISCARDED` with the logged reason. GU's remaining 7 mirrors proceed from EU T2. The firewall records: `24 source − 1 documented casualty = 23 active` — formula satisfied.

**The GU volatility amplification (the inverse effect):** on swing moves GU's candles are LARGER → the same re-anchor produces wider GU TPs → GU winners at 5-11 RRR vs EU's 4-8. This is not a special case — it falls out of the same re-anchor math on GU's own ladder.

---

## 10. THE ORACLE LOOP (pixel-vision as verification)

### 10.1 The inverted role of pixel-vision

The MiMo visual channel no longer establishes identity. It verifies specific, residual claims in the MDVE model — the judgments data cannot settle:

| MDVE claim (computed) | What MiMo verifies (the residue) |
|---|---|
| Zone at [floor, ceiling] exists (OB structure) | Is it VISIBLY defended? (wick cluster quality, rejection strength at the level) |
| Freshness state = TESTED(1x) | Does the chart confirm one clean retest? (the battle's visual quality) |
| Narrative: 2 reactions at range top | Confirm the second reaction's anatomy (engulfing vs wick-only) |
| LQZ rung at 100.975 | Is the sweep visible, and did price close back inside? |

The verdict protocol (v4.3 W7: ZONE|verdict|...) is repurposed: verdicts now reference MDVE model entries (`zoneId`), not agent-invented levels. The verdict's role in the pipeline: a CONFIRMED verdict raises the zone's perceptual-confidence (feeding PVE's zone-quality features); a REJECTED verdict with SPECIFIC evidence can VETO a zone's entry-candidacy for that week (the agent saw something the data missed — e.g. a news spike through the level that reads as depletion in context).

### 10.2 The disagreement protocol

- **Model says zone exists, MiMo says REJECTED:** the zone stays in the model (the data is ground truth for existence) but its entry-candidacy is vetoed for the week. Logged with the visual evidence.
- **MiMo claims a zone the model doesn't have (VLM_NEW):** the claim is checked against the data oracle: does the claimed level correspond to any OB/LQZ structure in the bars (within tolerance)? If yes → the model is EXTENDED (the claim found a detection gap — logged as a detector-improvement signal). If no → the claim is rejected as fabrication (firewall: the agent cannot invent a level the data doesn't support).
- **This is the firewall + oracle pattern (MPSE):** the agent's perceptual claims are evaluated against the deterministic evaluator's model. The agent cannot hallucinate a zone; the data cannot be argued with.

### 10.3 What the pixel lane still owns

- The presentation layer: charts drawn with the model's zones/rungs for the human operator (VEI governs the execution).
- The residual verdicts (§10.1) — at most one screenshot read per pair per week, not open-ended exploration.
- Ambiguity resolution when the model itself reports low confidence (e.g. a borderline BoM/MoM classification — the anatomy predicate was marginal).

---

## 11. IMMUTABILITY ENCODING (the doctrine as MathContract)

### 11.1 The doctrine objects

Every MDVE rule is encoded as a `MathContract` (KB-MPSE-03 L271-277) — preconditions, postconditions, invariants, temporal properties — as DATA (MathExpr), not closures. Examples:

```
CONTRACT zone-integrity:
  invariants: [ ∀z ∈ zones: z.bottom < z.top,
                ∀z₁,z₂ ∈ zones: ¬overlap(z₁,z₂) ∨ merged(z₁,z₂),
                ladder isSortedBy price ]
CONTRACT mirror-floor:
  invariants: [ |EU.activeMirrors| ≥ |DXY.activeSetups| − |EU.documentedCasualties|,
                |GU.activeMirrors| ≥ |EU.activeMirrors| − |GU.documentedCasualties| ]
  temporal:   [ G(discarded(m) → ∃ reason(m)) ]        // every discard has a logged reason
CONTRACT reaction-validity:
  preconditions: [ ∀setup s: ∃ bar ∈ s.dayWindow : reaches(bar, s.zone) ]
CONTRACT output-count (the f(T)=24 firewall):
  invariants: [ |totalActive| + |documentedCasualties| ≥ 24 − tolerance,
                ∀p ∈ pairs: count(p) ≤ 12 ∨ documentedEmergentJustification(p) ]
```

### 11.2 The enforcement points

1. **At detection:** guards reject malformed structures at the boundary (Structure 13).
2. **After every model mutation:** invariants re-checked; violation → ABORT with the violated contract + evidence.
3. **At pipeline output:** the f(T)=24 firewall evaluates the final count formula; failure → the run is invalid (not a warning — a rejection).
4. **Offline (CI):** `detectContradictions` over the Horn-clause doctrine; the SAT check over every classifier's exhaustiveness; the golden reconstruction test (§13) as the acceptance oracle.
5. **In the snapshot/compaction flow:** the model + contracts serialize together (T2 discipline: the doctrine is content-addressed, never dropped).

### 11.3 Totality and contradiction-freedom (build-time proofs)

- Every classifier is piecewise-total (exhaustiveness invariant) — proven at build time by the SAT checker (KB-MPSE-01 §6.1).
- The doctrine is proven contradiction-free at build time (Horn clauses + forward chaining + `detectContradictions`) — it can never emit both ENTER and BLOCK for the same candidate.
- Every loop/recursion has a termination measure (the bar index strictly decreases — well-founded).

---

## 12. DETERMINISM LAWS (binding on the build)

1. **Zero pixel input, zero LLM inference inside MDVE.** The model is a pure function of harvested data.
2. **Same bars → byte-identical model.** No wall-clock, no randomness, no iteration over unordered structures without a total order.
3. **No invented truth.** A detector that finds nothing emits an empty set — never a placeholder. Absence of options data → the options pillar is empty, not proxied.
4. **Canon reuse over re-implementation.** The existing proven machinery (4h-sd-lobe, lqz-lobe, event-granularity, canon zfp, ladder-scaffold) is ABSORBED, not rewritten. MDVE's new code is the matrix, the narrative, the mirror, reaction-validity, and the unifying model.
5. **Every constant has a BECAUSE + provenance** (canon thresholds already documented; new constants — bucket ε, formation-time tolerance, RRR floors — carry the operator's rules with citations).
6. **The frozen machinery stays frozen:** entry computation (gen:53-58, 636-654), computeSLNextLqzRung, computeTPSignificancePath, the retry loop — MDVE feeds them; it does not touch them.

---

## 13. VERIFICATION PLAN (golden reconstruction as the oracle test)

### 13.1 The golden reconstruction (the acceptance oracle — week 2026-07-06)

The Jul 6-10 MDVE model, computed from data alone, MUST contain:

| Golden element | Tolerance |
|---|---|
| 1H BoM demand at 100.68-100.73 (sweep origin zone) | exact zone present |
| 1H MoM demand at ~100.845 | ±2 pips |
| 4H BoM supply at the top | present |
| LQZ rungs: 100.845, 100.905, 100.940, 100.945, 100.975, 101.115, 101.14, 101.189, 101.235, 101.24 | each within 2 pips |
| Narrative: sweep origin (100.61, Jul 6), range top (~101.19-101.24) with 2 reactions, the Friday break DOWN through the range bottom | all present |
| The 8 golden setups (T1-T8) reconstructed | entries within 4 pips, correct direction, correct day |
| EU mirror: 8 mirror setups at EU's equivalent anchors (inverse) | entries within 4 pips of EU's actual structure |
| GU mirror: 7 ACTIVE + 1 RRR_DISCARDED (with logged reason) | exactly the operator's documented outcome |

### 13.2 The corrected-dedup proof

- The range-top LQZ reacting on Jul 8 AND Jul 9 → TWO distinct valid setups (not one).
- A pipeline re-fire of the same zone+session → ONE setup (the true duplicate).
- Test: the corrected dedup key `(zoneId, reactionEvent.session)` — synthetic streams prove both branches.

### 13.3 The mirror-floor firewall proof

- Synthetic DXY setups → EU mirrors ≥ DXY count (minus documented casualties) — enforced.
- A run that would emit EU < DXY mirror count without documented discards → FIREWALL REJECT with the violated contract.

### 13.4 Container acceptance (after build)

- The full pipeline on 2026-07-06: the sniff test (mirror-floor counts, golden reconstruction ≥ 5/8 within 4 pips on all 3 pairs, SL < 20p mostly / zero > 36p, RRR median in the golden band, honest provenance, no >12/pair without documented justification) + the f(T)=24 firewall evaluated and logged.

---

## 14. ROLLOUT PHASES

| Phase | Content | Gate |
|---|---|---|
| **v4.4.0a** | §6.1 multi-TF OB + formationMs; §6.2 LQZ matrix; §6.3 formal BoM/MoM; §6.4 formal freshness; §7 absorption; §8 reaction-validity + corrected dedup | Golden reconstruction 13.1 rows 1-6 (DXY model correct from data alone) |
| **v4.4.0b** | §9 mirror engine (DXY→EU→GU + RRR filter + emergent merge); §11 contracts + firewall | Golden reconstruction 13.1 rows 7-8 (EU 8, GU 7+1) |
| **v4.4.0c** | §10 oracle loop (verdict repurposing, disagreement protocol, veto semantics) | Container acceptance 13.4 |
| **v4.4.x** | PVE integration (the judge consumes the model's features); VEI v4.4.0 (the hands) | Triad acceptance |
| **v4.5** | Narrative-fed Engine 2 (shape chains read the weekly narrative); multi-week matrix (LQZ across 6+ weeks as first-class) | ship review |

---

## 15. ANTI-GOALS (explicitly out of scope)

- ❌ MDVE does not use pixels, screenshots, or any VLM — ever. (The oracle loop consumes MiMo verdicts as INPUT to confidence adjustments; MDVE itself never calls a model.)
- ❌ No hardcoded levels — every level is computed from the week's own bars (the golden levels appear because they're that week's real structure).
- ❌ No price-conversion mirror (Bible Appendix E's true intent: the mirror maps STRUCTURE — inverse zone, formation-time match, rank fallback — never `EU_price = f(DXY_price)` arithmetic).
- ❌ No deleting the emergent lane — mirror is the floor, emergent is the surplus.
- ❌ No resurrection of day-independent geometry dedup — trade identity is `(zoneId, reactionEvent)`.
- ❌ No blocking/veto power for the pixel lane over the DATA model's existence claims — the data oracle is ground truth for existence; pixels veto weekly candidacy only, with evidence.
- ❌ No touching the frozen entry/SL/TP machinery.

---

## 16. WHY THIS CHANGES EVERYTHING (and changes nothing)

**Changes nothing:** the architecture is the same pipeline (harvest → zones → shapes → setups → report). The existing engines stay. The frozen geometry stays. The canon thresholds stay. The scaffold stays. The agent's job is the same job.

**Changes everything:** the agent's PERCEPTION moves from the pixel channel to the data channel. Zone identity, liquidity structure, freshness, the weekly narrative, and the cross-pair mirror are now computed — totally, deterministically, un-cheatably — from the same bars the human reads as pixels. The variance that has haunted every run (invented levels, temporal leaks, match-rate swings, translation failures, over-killed trades) was never a modeling problem. It was a perception-channel problem. The data already contains the chart. **Vision is just how humans process math. MDVE is how the agent processes it.**

---

*END OF SPEC — build proceeds per TASK-305 (MDVE v4.4.0a/b/c) alongside TASK-304 (VEI) after the v4.3 cleanup lands. PVE follows per its own spec once Engine 3 + mirror output is A-grade.*

---

## APPENDIX A — THE GOLDEN RECONSTRUCTION TRACE (Jul 6-10, what MDVE computes from data alone)

This is the acceptance oracle made concrete: the exact model the engine must produce for the golden week, element by element, with the computation that produces each.

### A.1 The zone map (from the 1H/4H bars)

| Golden element | The computation | MDVE output |
|---|---|---|
| 1H BoM demand 100.68-100.73 | The sweep origin candle (Jul 6 ~06:00, wick to 100.61, close back above) IS the displacement origin; the candle before it = the OB → zone [100.68, 100.73], formationMs = Jul 6 ~05:00, sweepEvent before → **BoM** | zone present, BoM, FRESH→(1x Friday) |
| 1H MoM demand ~100.845 | Mid-leg shelf during the Jul 6-7 rally: consolidation body range before the next displacement up; legEstablished (rally already in force) → **MoM**; the Jul 6 18:00 circled reaction = its first retest event | zone present ±2 pips, MoM, TESTED(1x) |
| 4H BoM supply (top) | The OB before the Jul 3-5 decline from ~101.33 — the origin of the supply leg | zone present, BoM, UNMITIGATED |

### A.2 The LQZ matrix (from 720 1H bars)

| Golden rung | Matrix evidence |
|---|---|
| 100.845 | SWEEP + WICK_REJECT + CONSOL_DWELL across 2+ weeks (the Jul 6 18:00 circle is one touch) |
| 100.905 / 100.940 / 100.945 / 100.975 | WICK_REJECT + CONSOL_DWELL clusters (the range-bottom shelf rungs, 4-10 pips apart) |
| 101.115 / 101.14 / 101.189 / 101.235 / 101.24 | SWEEP + WICK_REJECT clusters at the range top (the 2 distinct reactions Jul 8 + Jul 9) |
| 100.61 (sweep extreme) | single SWEEP touch — the origin, not a rung (correctly NOT a high-cardinality class) |

### A.3 The narrative (§6.5.1 trace)

1. **Sweep origin:** `SWEEP_LOW at 100.61, Jul 6 ~06:00` ✓ (prior-week low pierced, close back above, lower wick ≥ 50% of range).
2. **Range:** top ≈ 101.19-101.24 (BUY_SIDE LQZ, touches Jul 8 + Jul 9), bottom ≈ 100.94-100.975 (SELL_SIDE).
3. **Reactions at top:** 2 events (Jul 8 first, Jul 9 second) ✓ — the operator's "2 distinct reactions before Friday."
4. **The break:** `DOWN, Jul 10 Tokyo, pierced 100.94, displacement ≥ 1.5×ATR` ✓ — the Friday BS.
5. **Post-break:** battle at 1H BoM 100.68-100.73 ✓ — T8's origin.

### A.4 The 8 golden setups (Engine 3 + reaction-validity, from the model)

| # | Dir | Day | Anchor zone | Entry | SL (next rung) | TP (opposing rung) |
|---|---|---|---|---|---|---|
| T1 | LONG | Jul 6 | 1H BoM 100.68-100.73 | ~100.73 | ~100.68 (zone edge + Law 7 buffer) | ~100.945 (rung above) |
| T2 | SHORT | Jul 7 | ~101.04-101.09 rung | ~101.04 | ~101.09 (next rung above) | ~100.905-100.945 |
| T3 | SHORT | Jul 8 | ~101.14 (reaction 1) | ~101.14 | ~101.19 | ~100.975 |
| T4 | SHORT | Jul 8-9 | ~101.19 | ~101.19 | ~101.24 | ~100.975 |
| T5 | SHORT | Jul 9 | ~101.235 (reaction 2) | ~101.235 | ~101.33 | ~101.115 |
| T6 | SHORT | Jul 9 | ~101.14 (mid-rung, reaction 2) | ~101.14 | ~101.19 | ~100.945 |
| T7 | SHORT | Jul 10 | ~101.115-101.14 | ~101.115 | ~101.19 | ~100.905 |
| T8 | LONG | Jul 10 | 1H BoM 100.68-100.73 (Friday pierce catch) | ~100.73 | ~100.68 | ~100.905-100.945 |

**The corrected-dedup proof in this table:** T3 and T6 share the ~101.14 zone — T3 = reaction 1 (Jul 8), T6 = reaction 2 (Jul 9) — DISTINCT trades under the corrected doctrine `(zoneId, reactionEvent.session)`. The old day-independent fingerprint would have killed T6. The range top reacting twice = two trades. This is the operator's doctrine, now mechanized.

### A.5 The mirror (cascade trace)

- **T1 → EU:** DXY LONG from BoM 100.68-100.73 (formationMs Jul 6 ~05:00) → EU's inverse-type zone nearest that formation time = EU's supply at the sweep high ~1.1444-1.146 (same session) → EU SHORT, SL inside EU's next rung above, TP at EU's opposing rung (~1.1418-1.1420). **EU T1 ACTIVE.**
- **EU T1 → GU:** EU's supply ~1.1444 (formationMs Jul 5-6) → GU's equivalent supply ~1.3455-1.3460 → GU SHORT, re-anchored to GU candles → GU's compressed swing → `rrr 1.3 < 2.0` → **RRR_DISCARDED** (logged: "GU mirror of EU T1: RRR 1.3 < 2.0 after re-anchor — GU candles smaller on this move").
- **T2-T7 → EU → GU:** the range-top shorts ↔ range-bottom longs — EU longs ~1.1396-1.1410 (ACTIVE), GU longs ~1.333-1.340 (ACTIVE, RRR 5-11 from GU's wider swings).
- **T8 → EU:** DXY LONG from the Friday pierce into BoM demand → EU SHORT from the Friday rally into the range-top supply ~1.1444 (inverse) → ACTIVE. **→ GU:** GU#7 SHORT ~1.3448, SL 1.3459, TP ~1.3394 → ACTIVE.
- **Count check:** DXY 8 → EU 8 ACTIVE → GU 7 ACTIVE + 1 documented casualty = 23 active, formula satisfied (§11 output-count contract).

**If the engine produces this table from the harvested bars, the golden reconstruction passes.** This trace IS the test.

---

## APPENDIX B — THE DOCTRINE AS MathExpr (the immutable contract objects)

The doctrine encoded as data (KB-MPSE-03's 29-operator MathExpr grammar — `forall/exists/card/sum/globally/eventually/until/lt/lte/eq/and/or/not/implies`). One object, consumed by every layer (detection guards, pipeline gates, LTL model-checker, snapshot validation, offline CI). When the doctrine changes, every layer sees the same change — no drift, no translation.

```typescript
const MDVE_DOCTRINE: MathContract[] = [
  {
    id: 'zone-integrity',
    preconditions: [],
    postconditions: [
      { kind: 'forall', set: 'zones', pred: { kind: 'lt', left: 'zone.bottom', right: 'zone.top' } },
      { kind: 'forall', set: 'zones', pred: { kind: 'gt', left: 'zone.top', right: { lit: 0 } } },
    ],
    invariants: [
      { kind: 'forall', set: 'pairs(zones)', pred:
        { kind: 'or', args: [
          { kind: 'not', arg: { kind: 'overlaps', left: 'z1', right: 'z2' } },
          { kind: 'merged', left: 'z1', right: 'z2' } ] } },
      { kind: 'sorted', set: 'ladder', by: 'price' },
    ],
  },
  {
    id: 'reaction-validity',
    preconditions: [
      { kind: 'forall', set: 'setups', pred:
        { kind: 'exists', set: 'dayWindow(setup).bars', pred:
          { kind: 'reaches', left: 'bar', right: 'entryBand(setup.zone, setup.direction)' } } },
    ],
    postconditions: [],
    invariants: [
      // trade identity: (zoneId, session, day) — no two emitted setups share one
      { kind: 'forall', set: 'pairs(setups)', pred:
        { kind: 'neq', left: 'tradeIdentity(s1)', right: 'tradeIdentity(s2)' } },
    ],
  },
  {
    id: 'mirror-floor',
    preconditions: [],
    postconditions: [
      { kind: 'gte', left: { kind: 'card', set: 'EU.activeMirrors' },
        right: { kind: 'sub', left: { kind: 'card', set: 'DXY.activeSetups' },
                 right: { kind: 'card', set: 'EU.failedAnchors' } } },
      { kind: 'gte', left: { kind: 'card', set: 'GU.activeMirrors' },
        right: { kind: 'sub', left: { kind: 'card', set: 'EU.activeMirrors' },
                 right: { kind: 'card', set: 'GU.documentedCasualties' } } },
    ],
    invariants: [],
    temporal: [
      // every discard carries a reason, forever
      { kind: 'globally', expr:
        { kind: 'implies', left: { kind: 'discarded', set: 'm' },
          right: { kind: 'exists', set: 'reasons', pred: { kind: 'reasonFor', left: 'r', right: 'm' } } } },
    ],
  },
  {
    id: 'output-count',   // the f(T) = N + I(P) = 24 firewall
    preconditions: [],
    postconditions: [
      { kind: 'gte',
        left: { kind: 'sum', sets: ['DXY.active', 'EU.active', 'GU.active'] },
        right: { kind: 'sub', left: { lit: 24 },
                 right: { kind: 'card', set: 'documentedCasualties' } } },
    ],
    invariants: [
      { kind: 'forall', set: 'pairs', pred:
        { kind: 'or', args: [
          { kind: 'lte', left: 'count(pair)', right: { lit: 12 } },
          { kind: 'exists', set: 'justifications', pred: { kind: 'justifies', left: 'j', right: 'pair' } } ] } },
    ],
  },
  {
    id: 'no-fabrication',   // the firewall + oracle for zone existence
    preconditions: [
      { kind: 'forall', set: 'agentClaimedZones', pred:
        { kind: 'exists', set: 'computedModel.zones', pred:
          { kind: 'withinTolerance', left: 'claimed', right: 'computed', eps: '3 * pipValue' } } },
      // the agent's claimed zone must match a model zone — the agent cannot
      // hallucinate a level the data doesn't support (MPSE: cannot hallucinate an evaluation)
    ],
    postconditions: [],
    invariants: [],
  },
];
```

**Enforcement of these objects:** (1) detection guards evaluate preconditions at stage entry; (2) invariants re-evaluate after every model mutation (violation → ABORT with contract id + evidence); (3) postconditions evaluate at stage exit; (4) temporal clauses feed the LTL checker (KB-MPSE-03 §7 `checkGlobally`); (5) CI evaluates the entire doctrine against the golden-week fixture on every build.

---

## APPENDIX C — v4.3 CLEANUP → v4.4 BUILD DEPENDENCY MAP

| v4.3 cleanup item | Feeds | Where it lands |
|---|---|---|
| Dedup doctrine fix (same zone+day+session) | §8.4 trade identity + the OFFERED/CONSUMED state machine | generator (replaces gen:648-684 fingerprint) |
| Reaction-validity design (reachability) | §8.1-8.3 emission precondition | generator's candidate filter |
| Mirror engine design (DXY→EU→GU) | §9 cascade stage | NEW post-Engine-3 stage |
| EUR re-diagnosis (fingerprint over-kill + missing mirror) | §8.4 + §9.4 — EUR's floor = DXY count | validation against test-4 evidence |
| DXY direction-mixing reframe (golden week itself was mixed) | §6.5 narrative-fed Engine 2 (v4.5) | shape-chain sensitivity (separate track) |
| VEI spec v2.0 (this file's sibling) | TASK-304 build | src/vei/ |
| MPSE map (20 structures, firewall+oracle, MathContract) | §4, §11, Appendix B | doctrine encoding across all 3 engines |
