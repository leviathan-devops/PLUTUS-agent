# PLUTUS PROBABILISTIC VERIFICATION ENGINE (PVE) — DESIGN SPEC v0.1

**Status:** DESIGN ONLY — DO NOT BUILD YET. Build begins only when Engine 3 setup generation is A-grade solid and container-verified.
**Date:** 2026-07-25
**Authority:** Operator directive 2026-07-25: "an actual statistical/mathematical/probabilistic verification engine that can calculate a success % of each trade and pass this as an output arg with each trade setup. Deterministic, not model inference, based on all the final data available at the end of a TTE report with trade setups as a final verification pass of the firewall layer."
**Supersedes:** The dead TimesFM/Kronos/Dual-Brain overlay concept (model-inference based, never wired into the active path — population code exists only in legacy `plutus-tte-pipeline.ts` and `trade-brain.ts`, which have zero importers in the active pipeline).

---

## 0. PURPOSE AND POSITION

The PVE answers one question per trade setup: **"Given everything we know at report time, what is the probability this setup succeeds?"** — computed by deterministic mathematics on structured data, emitted as an output argument on every TradeSetup.

It replaces the two failed approaches to the same problem:
1. **Arbitrary count caps** (10/pair, 3/day, 3/category) — bolted on as flood control after the 40-SETUPS dedup-broken checkpoint. Ceilings on valid output instead of filters on invalid output. REMOVED by operator directive; PVE + semantic firewall is the replacement.
2. **TimesFM/Kronos overlay** — external model inference, never wired into the active path, and a derailment vector (a second "brain" contradicting the first). PVE is explicitly NOT this. There is no model, no API, no inference. There is a formula, data, and calibration.

**Pipeline position:** FINAL pass, after the semantic firewall, before report emission:

```
Engine 3 setups → semantic firewall (doctrinal gate — hard rules) → PVE (probabilistic scoring + path simulation) → ranked/filtered setups → report
```

The semantic firewall remains the **doctrine** layer (is this setup structurally/legalistically valid?). PVE is the **probability** layer (given it's valid, how likely is it to work?). Neither does the other's job. No setup count limits exist anywhere — output is ranked by probability, and only the probability floor and structural defects remove setups.

---

## 1. HARD DESIGN CONSTRAINTS (ANTI-DERAILMENT GUARDS)

These are the rules that prevent this engine from becoming slop. Violating any of them is a derailment.

1. **DETERMINISTIC ONLY.** Zero LLM calls. Zero external model APIs. Zero "AI scoring." Every output is reproducible from inputs: same setup + same zone map + same constants → identical probability, every time. This is the single most important constraint. The moment a model infers a probability, we have rebuilt TimesFM and imported a second, unauditable brain.
2. **EVERY CONSTANT HAS A BECAUSE PARAGRAPH AND DATA PROVENANCE.** Weights are not tuned by vibes. Each weight cites the forensic evidence (38-trade set, golden standard week, backtest accumulation) that justifies it, the estimation method, and the smoothing applied.
3. **CALIBRATION IS A PROCEDURE, NOT A RUNTIME BEHAVIOR.** Weights never change mid-run. Recalibration is a documented, manual, versioned operation performed against accumulated backtest evidence, producing a new constants version (PVE_CALIBRATION_V1, V2…). The engine is a pure function of (setup, context, constantsVersion).
4. **THE GOLDEN STANDARD IS A VALIDATION SET, NEVER A TRAINING INPUT.** The 8 winning DXY trades (July 6-10) must all score ≥ B grade (≥ 0.60) — this is a verification check. Weights must not be fitted to make them pass; if they fail, the feature model is wrong, and the failure is investigated structurally.
5. **FALSIFIABILITY.** Every weight must have a stated test that would fail if the weight had the wrong sign. If a factor's LLR is positive, there must exist a counterfactual in the forensic data that would flip it. No unfalsifiable factors.
6. **NO COUNT CAPS, NO RANK TRUNCATION.** PVE never says "only N setups." It says "this setup is 0.74, that one is 0.31." Filtering happens only at the probability floor (REJECT band) and through the existing structural gates. The report sorts by probability descending; nothing is silently truncated.
7. **SMALL-SAMPLE HONESTY.** The 38-trade forensic is small. Every likelihood ratio uses Laplace (add-one) smoothing minimum; any factor with < 5 supporting observations is shrunk toward neutral (LLR = 0) with the shrinkage documented. The engine must degrade gracefully toward "no opinion" (0.50 ± shrinkage) rather than fabricate confidence.
8. **NO FEEDBACK INTO ZONE/SHAPE ENGINES.** PVE consumes Engine 1/2/3 outputs read-only. It must never modify zones, shapes, entries, SL, or TP. It scores; it does not edit. (Its REJECT action removes a setup from the report — it never "fixes" one.)

---

## 2. INPUTS (ALL FINAL DATA AVAILABLE AT END OF TTE REPORT)

Per setup, PVE receives the full final context:

**From the setup itself:**
- pair, direction, category, day, session
- entry legs (front/mid/back), SL, TP — and derived: SL distance (pips + ATR units), TP distance (pips + weekly-ATR units), blended RRR
- confidence score + quality tier from Engine 3 (used as a feature, not as the answer — PVE is an independent second measurement)

**From Engine 1 (zone map):**
- Entry zone: type, BoM/MoM, reactionCount, confluence (0-14), ZFP, liquidityScore (0-10), POI tier, LQZ overlap (Earth+Fire), multi-TF nesting, distance to spot, zone width
- TP zone: same fields
- Full ordered zone list per pair (for path simulation — every zone between spot→entry and entry→TP with mitigation status)

**From Engine 2 (shape chain):**
- Day shape + chain confidence for the setup's day
- Storyline bias
- Shape-category validity (was this category valid for this day's shape?)

**From context:**
- Pair ATR (1H and weekly), prior-week momentum direction
- Cascade alignment state (HTF swing vs DXY macro direction; N/A for scalps)
- Chain linkage (chainedFrom — is this entry a prior setup's TP?)
- **Mirror provenance (v4.4 — MDVE mirror engine output):** `mirrorOf` (the source setup id this setup mirrors — DXY→EU, EU→GU), mirror status (ACTIVE / RRR_DISCARDED with reason), the source setup's own geometry + grade (a mirror's quality is partially inherited from its source — the source's zone quality and the mirror's anchor-match quality: formation-time match vs rank fallback). Mirror setups are scored with the same 21 features; the mirror-provenance features (anchor-match type, source grade, timing drift) feed the context axis (0.20). An RRR_DISCARDED mirror is logged with its reason and excluded from the report (the discard IS its PVE verdict — F band, documented).

**From calibration store (append-only):**
- 38-trade forensic feature/outcome table
- Golden standard week outcomes
- Accumulated backtest results (plutus-backtest-setups output, appended after each verified run)

---

## 3. ARCHITECTURE — FOUR DETERMINISTIC STAGES

### Stage 1 — Feature Extraction

Each setup is converted to a normalized feature vector (all features scaled to [0,1] unless noted). Every feature lists its empirical basis. Features are grouped into three independent axes (mirroring the 6-dimension confluence philosophy — independence is what makes multiplication valid):

**AXIS A — ZONE QUALITY (where are we trading?)**
| # | Feature | Computation | Empirical basis |
|---|---------|-------------|-----------------|
| A1 | confluence_norm | confluence / 14 | 6-dimension system; EXTREME(12-14) zones are near-impregnable |
| A2 | freshness | reactionCount → 1.0 (0x) / 0.8 (1x) / 0.5 (2x) / 0.2 (3x+) | Law 31 reaction rates (100/80/50/<30%) |
| A3 | bom_flag | 1.0 BoM / 0.4 MoM / 0.6 IP-LQZ | BoM 100% reaction if UM; MoM ladder-steps-only |
| A4 | zfp_hold | 1 − (zfp / 100) | ZFP < 20 = Hard Wall; > 45 = failing |
| A5 | liquidity_norm | liquidityScore / 10 | Law 33: TP zones need ≥ 5; "wood for the fire" |
| A6 | earth_fire | 1.0 if LQZ overlaps entry zone, else 0.5 | Earth+Fire = double reaction pressure (Law 11) |
| A7 | tf_nesting | 0.5 / 0.75 / 1.0 for single/dual/triple-TF | Law 32: dual +3, triple +5 confluence |
| A8 | entry_tf_prior | historical win-frequency of entry zone TF: 15m 0.32, 30m 0.21, 1H 0.18, 4H 0.13, LSZ 0.11, other 0.05 | 38-trade entry-TF distribution (Bible 9.7) |

**AXIS B — SETUP GEOMETRY (is the trade mechanically sound?)**
| # | Feature | Computation | Empirical basis |
|---|---------|-------------|-----------------|
| B1 | sl_atr_fit | SL pips / pairATR(1H); ideal band 0.5–1.5 → 1.0, decays outside | Law 10: SL never < 0.5×ATR; Law 9: SL = zone geometry |
| B2 | sl_zone_fit | 1 − |SL_dist − (zone_width + buffer)| / (zone_width + buffer), clamped [0,1] | Bible 9.5: SL distance ≈ zone width + 2-5 pip buffer |
| B3 | tp_reach | TP pips / weeklyATR; ≤1.0 → 1.0, 1.0–2.0 → 0.8, 2.0–3.0 → 0.4, >3.0 → 0.0 | Law 13: >2× = ambitious, >3× = reject |
| B4 | rrr_norm | min(blendedRrr, 8) / 8 | 38-trade RR distribution (median ~3.5×) |
| B5 | path_clearance | 1 / (1 + UM_zones_between_entry_and_TP) | Law 14: price cannot teleport past UM zones — each forces a reaction before TP |
| B6 | entry_proximity | 1 − (entry_to_spot_pips / MAX_ENTRY_DISTANCE[pair][category]) | Canon proximity table (Bible 8.2) |

**AXIS C — CONTEXT ALIGNMENT (does the environment support it?)**
| # | Feature | Computation | Empirical basis |
|---|---------|-------------|-----------------|
| C1 | shape_align | direction vs day-shape: aligned 1.0 / neutral 0.6 / opposed 0.2 | Shape→category mapping (Bible 6.3) |
| C2 | session_fit | category→session appropriateness | Session win rates: London 22/38, NY 15/38, Asian 3/38 |
| C3 | cascade_align | HTF swings: aligned 1.0 / counter 0.3; scalps: 0.75 (neutral by doctrine) | Law 20: macro direction for swings; counter-trend scalps valid |
| C4 | chain_linked | 1.0 if chainedFrom (entry = prior TP — structurally confirmed level), else 0.6 | Law 27: Wednesday chain proof |
| C5 | momentum_align | prior-week direction vs setup direction: aligned 1.0 / flat 0.6 / opposed 0.3 | Confidence formula momentum term |
| C6 | vlm_sourced | VLM_CONFIRMED 1.0 / Engine-1 merge 0.6 | Law 37: data 80% / vision 20% |
| C7 | day_chain_conf | Engine 2 chain confidence for the setup's day / 100 | Forward-mapping confidence |

### Stage 2 — Probabilistic Core (log-odds accumulator)

**Model:** Naive-Bayes-style log-likelihood-ratio (LLR) accumulation over a base-rate prior. Chosen because it is (a) fully deterministic, (b) auditable per-factor, (c) statistically valid under approximate feature independence — which the axis design enforces — and (d) degrades to the prior when evidence is thin.

```
prior_logodds   = log(baseRate / (1 − baseRate))
baseRate        = empirical win rate of structurally-valid setups in the forensic set
                  (initially from the 38-trade set; exact value fixed at calibration time
                   with Laplace smoothing — documented in the constants table)

For each feature i with value x_i ∈ [0,1]:
    contribution_i = W_i × (x_i − 0.5) × LLR_i

posterior_logodds = prior_logodds + Σ contribution_i
P(success)        = 1 / (1 + e^(−posterior_logodds))
```

- **LLR_i** = log(P(feature high | win) / P(feature high | loss)), estimated from forensic distributions with add-one smoothing. Any factor with < 5 supporting observations gets LLR_i shrunk 50% toward 0 (documented per factor).
- **W_i** = axis weight (Σ W per axis = 1; axis totals: A 0.45, B 0.35, C 0.20 — zone quality dominates because the 38-trade forensic shows entries fail at wrong zones more than at wrong geometry; each axis weight has a BECAUSE paragraph).
- The (x_i − 0.5) centering means a neutral feature contributes nothing — absence of evidence never fabricates conviction in either direction.

**Output of Stage 2:** P(success) ∈ (0,1) plus a per-factor contribution table (which factors pushed the number up or down, and by how much — this is emitted to the report as the probability breakdown).

### Stage 3 — Deterministic Path Simulation

This is the component that catches the failure modes that motivated the caps (duplicate slop, unreachable entries, TPs behind unmitigated walls). Pure geometry + ATR math, no probability model:

1. **Entry reachability:** expected travel = |entry − spot| / ATR-per-session. If expected travel > session window for the assigned session → P_entry_fill collapses (e.g., entry 150 pips from spot on a London scalp — the "1500 pips away" class of garbage).
2. **Law 14 walk (entry → TP):** enumerate every zone between entry and TP. Each UM zone (reactionCount = 0) is a forced reaction point: if an UM zone sits between entry and TP, price reacts there first — the TP is behind a wall. Compute effective_reach = distance to first UM zone. If TP > effective_reach → strong P(tp_first) penalty; the TP should have been that UM zone (annotation emitted, not a silent edit).
3. **SL exposure walk (entry → SL):** verify SL sits at/behind the next structural zone (Law 7). If SL is inside the entry zone (Bug #1 pattern — SL tighter than zone geometry) → P(sl_first) spike.
4. **Chain coherence:** if chainedFrom exists, verify entry ≈ parent TP within tolerance; a broken chain link is flagged (suspect annotation), not rejected.
5. **Duplicate-class detection (the dedup-broken failure mode):** setups sharing (pair, direction, entry within pip tolerance) are exact duplicates → deterministic dedup by exact key. Setups sharing a zone but with materially different SL/TP/day are NOT duplicates — they survive independently. This is the "8 copy-pastes of the same trade" killer — exact-match elimination, not count caps.

**Output of Stage 3:** P_entry_fill, P_tp_first, P_sl_first (deterministic sub-probabilities from geometry), plus structural annotations (TP-behind-UM-wall, SL-inside-zone, broken-chain).

### Stage 4 — Composition, Calibration, Verdict

```
P_final = P(success) × P_entry_fill × (P_tp_first / (P_tp_first + P_sl_first))
```

- **Calibration:** before ≥ 50 accumulated backtested setups exist, apply conservative shrinkage: P_calibrated = 0.5 + (P_final − 0.5) × 0.8 (20% shrink toward no-opinion). After the sample exists, fit isotonic (or Platt) calibration offline and version the constants. Shrinkage factor documented in constants table.
- **Grade bands (output arg):**
  | Grade | P_calibrated | Firewall action |
  |-------|-------------|-----------------|
  | A+ | ≥ 0.80 | PASS — primary report placement |
  | A | 0.70–0.79 | PASS |
  | B | 0.60–0.69 | PASS |
  | C | 0.50–0.59 | FLAG — emitted with "manual review" annotation |
  | F | < 0.50 | REJECT — removed from report, logged with full breakdown (auditable) |

**TradeSetup extension (output args):**
```typescript
successProbability: number;            // P_calibrated, 0-1
probabilityGrade: 'A+' | 'A' | 'B' | 'C' | 'F';
probabilityBreakdown: Array<{ factor: string; value: number; contribution: number }>;
pathSimulation: { pEntryFill: number; pTpFirst: number; pSlFirst: number; annotations: string[] };
pveConstantsVersion: string;           // e.g. 'PVE_CAL_V1' — full reproducibility
```

---

## 4. WHAT THIS REPLACES / HOW IT INTERACTS WITH EXISTING SYSTEMS

- **Arbitrary caps:** DELETED everywhere (generator MAX_SETUPS, MAX_SETUPS_PER_DAY, firewall CS11). PVE ranking + F-floor is the only volume control. (CS11's deletion is sanctioned by operator directive 2026-07-25.)
- **Semantic firewall:** unchanged in role. Doctrine violations (virgin-MoM reversal, wrong-side entry, SL over hard cap, ICT contamination, theatrical language) are HARD_BLOCKs *before* PVE ever runs. PVE never resurrects a firewall-rejected setup.
- **Engine 3 confidence score:** remains as an Engine-3-internal feature (feeds C-axis as one input among ~21). PVE is an independent second measurement — if Engine 3 says 85 and PVE says 0.42, the disagreement is surfaced in the report, which is exactly the kind of signal the operator wants.
- **TimesFM/Kronos/Dual-Brain overlay:** conceptually superseded. Their firewall rules (TFM1-3, ZT-18, TFM-K1/K2, DBR-1) currently no-op in the active path (fields always undefined). At PVE build time: those rules are either rewired to consume PVE's deterministic outputs (P_tp_first → TFM2's pTpReach slot, etc.) or deleted. Decision recorded here: **rewire where semantically equivalent, delete the rest** — no always-pass placeholders remain.
- **Report:** probability column + per-setup breakdown section + PVE summary (grade distribution, top-rejected with reasons).

---

## 5. CALIBRATION DATA REQUIREMENTS

| Dataset | Role | Status |
|---------|------|--------|
| 38-trade forensic (feature/outcome table) | Initial LLR estimation | Exists in narrative form (Bible Part 9) — needs one-time structured extraction at build time |
| Golden standard week (8 DXY trades) | Validation set (must all grade ≥ B) | Fully documented (Bible 9.1) |
| Backtest accumulation | Recalibration input (append-only) | plutus-backtest-setups already produces per-setup WIN/LOSS/NOT_TRIGGERED — wire its output into the calibration store |

---

## 6. VERIFICATION MATRIX (WHEN BUILT)

| Check | Pass condition |
|-------|---------------|
| V1 determinism | Same input twice → identical output to 10 decimal places |
| V2 golden standard | All 8 winning DXY trades grade ≥ B |
| V3 no-model | Static scan: zero LLM/SDK/API calls in PVE module |
| V4 neutral degradation | Empty-feature setup → output within [0.45, 0.55] band |
| V5 falsifiability | Every weight has a documented sign-flip test; all pass review |
| V6 no caps | Static scan: no MAX_SETUPS/count-truncation constants in generator or firewall |
| V7 audit trail | Every REJECTED setup logged with full breakdown to evidence store |

---

## 7. EXPLICIT NON-GOALS

- NOT a price predictor. PVE never forecasts where price goes — Engines 1+2 do that. PVE scores the quality of what they produced.
- NOT a second brain. No inference, no embeddings, no "learned" anything at runtime.
- NOT a replacement for the semantic firewall, Engine 3 confidence, or operator judgment. It is the final mathematical verification pass — one more independent measurement in a system whose entire philosophy is independent measurements multiplying.

---

*End of PVE Design Spec v0.1. Build only after Engine 3 is container-verified A-grade.*
