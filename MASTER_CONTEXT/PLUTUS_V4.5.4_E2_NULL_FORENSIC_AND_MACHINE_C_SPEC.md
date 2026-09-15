# THE E2-NULL FORENSIC + THE MACHINE C SPEC — THE ZERO-TRUST AUDIT OF THE FULL-WEEK DEGENERACY

**Version:** 1.0 · **Date:** 2026-08-11 · **Status:** THE NEXT BUILD AUTHORITY — the Machine C engineering spec.
**The trigger:** the operator's full-week test exposed the E2-null degeneracy — the machine cannot designate per-day zones, so Machine A slops identical trades and Machine B emits nothing.
**The target:** a proper full-week golden-level run that SHOULD hit with 90% accuracy THROUGH THE SANCTIONED E1 → E2 → E3 PIPELINE — no degenerate garbage, no monkey-patch bullshit at any point.

---

# PART 1 — THE ZERO-TRUST AUDIT (what is ACTUALLY true, verified 2026-08-11)

## 1.1 THE VERIFIED MONDAY GOLD (the locked checkpoint — REAL)

The checkpoint `Checkpoints/monday-gold-standard-achieved/` is LOCKED IMMUTABLE (chmod -R a-w — the write attempt PROVEN denied). Its hashes are byte-identical to the workspace state at the moment of the gold:
- anchor-decision-machine.ts: e9d696d4d0303f8a5bf6702a19b267a6a21cfd84a1ba472c2a326d5527f965f8
- reasoning-chain.ts: a639d8d5b11a7270a7778a70333fdb11303050e3f65c764d6eb3c79ad50eec44
- mirror.ts: fc59a5c385f43d2c89bf3e19a68aa95f6526c5a626ac917ae229388b1539ed4a
- anchor-decision-machine.test.ts: 5a06ce112de0771a9fe51d788bee7724c3103e28b6ce89c46a3092856662fafc
- dist/index.js: a6383b6587f95f6d4352bb4176f397b9320ea8e951565b4ee994319c9aedd6cf

THE MONDAY GOLD — the golden gate 5/5 at ≤3p (G1-G10 10/10 + A1-A7 7/7, exit 0 ×2, the determinism byte-identical 0bbab1f7eb52e915) + the OUTCOME 5/5 wins ≥ 4/6 PASS (net +17.84R). VERIFIED by the orchestrator's own runs + the independent adversarial bar probe (the open-window SLs never touched: the DXY 2.2p / the EU 11.6p / the GU 11.0p clearance; the post-exit dips were 9-21 days after the closes — irrelevant).

**BUT THE CRITICAL CAVEAT (the operator's correct fury):** the Monday gold runs on Machine A's D-3a FALLBACKS, not on the E2 designation. The E2 zone-ids are NULL at the source — the fallbacks (strongestSupplyInDayBand / nearestDemandBelow / findFortressDemand) resolve the zones from the E1 map heuristically. They HAPPEN to match the operator's read on Monday (the 5/5 gold) — but that is the monkey-patch class the operator bans.

## 1.2 THE E2-NULL ROOT CAUSE — THE COMPLETE MECHANISM (probe-verified)

THE PROBE (probe-e2-real.ts — the raw shape-brain day decomposition on the REAL models):
```
DXY:      Mon BS/DOWN key=NULL S=NULL D=DXY|1H|...101.005 · Tue BS/DOWN same · Wed R/DOWN same · Thu BS/DOWN same · Fri SS/RANGE same
EUR/USD:  ALL 5 DAYS: BS/DOWN or R/UP or SS/RANGE · key=NULL S=NULL D=NULL · open=1.1423 EVERY DAY
GBP/USD:  ALL 5 DAYS: SS/RANGE · key=NULL S=NULL D=NULL · open=1.33342 EVERY DAY
```

THE THREE PROVEN MECHANISMS:
1. **THE DAY-OPEN NEVER ADVANCES:** `dayBandCarry = spot` (:2186 — the model's base spot) and `projectZoneForDay`'s `const dayOpenSpot = priorDayClose;` (:1616) — the input is passed through UNPROJECTED. The design (:1539-1540) says "Monday → dayOpenSpot = f(Friday close + shape travel); Tue-Fri → dayOpenSpot = f(prior day's PREDICTED London-open spot + shape travel)" — THE FORWARD PROJECTION IS NOT IMPLEMENTED. All 5 days get the SAME open (101.048 / 1.1423 / 1.33342). The `dayBandCarry = szd.dayOpenSpot` update (:2379) copies the same value forward — a no-op chain.
2. **THE ZONE-POOL SEARCH COLLAPSES:** `projectZoneForDay`'s `inBand` filter (:1624-1627) — zones overlapping [dayOpenSpot ± travelMax] — with the stale open every day, the same/no zones qualify. The EU/GU candidates find NOTHING (null ids); the DXY finds the same one zone (101.005) regardless of the day.
3. **THE SHAPE/DIRECTION MISMATCH:** the probe's RAW decomposition shows the shapes/directions differ from the E2-CORE print (the raw DXY Mon = BS/DOWN vs the core's SS/SHORT) — a downstream mapping divergence (toEntryDirection / the day-shape re-mapping) that also needs auditing.

THE DOWNSTREAM FAITHFULNESS (verified NOT the drop point): `brainDaysForTranslation` (report-v452.ts:808) and `snapshotToCascadedChain` (:843) copy the day's keyZoneId/supplyZoneId/demandZoneId VERBATIM (`?? null`). The ids are null AT THE SOURCE — nothing drops them downstream.

THE CONSEQUENCE: E2 cannot designate per-day zones → Machine A's fallbacks slop the same trade every day (the EU 10 + GU 5 identical projections) → Machine B (the report) reads the null ids → 0 trades. THE SINGLE ROOT CAUSE SHARED BY BOTH MACHINES.

## 1.3 THE MACHINE DIVERGENCE — THE COMPLETE MAP (the audit)

| | **MACHINE A (the chain path)** | **MACHINE B (the report path)** |
|---|---|---|
| The files | reasoning-chain.ts (the 11-token engine) · the ADM (anchor-decision-machine.ts) · the diag (diag-reasoning-chain-golden.ts + the NEW full-week diag) | report-v452.ts · mirror.ts · setup-gen.ts · trade-dedup.ts · trade-chaining.ts · fill-sim.ts · the shape-brain (shape-brain.ts) · the cascade-translation (cascade-translation.ts) |
| The E3 machinery | The ADM (the measured SL/entry/TP) + the chain's D-3a fallbacks | The mirror cascade (cascadeV45) + reAnchorMirror + selectPairNativeZone + the ladder/mirror TP walks |
| The E2 consumption | `resolveOperativeZone(model, pair, e2Day.supplyZoneId ?? undefined)` → null → the D-3a fallbacks | `brainDaysForTranslation` → the days' zone fields → null → nothing to re-anchor |
| The dedup | NONE (the identical-every-day slop — no filter) | trade-dedup.ts (the frozen pair — the dedup machinery EXISTS) |
| The fill simulation | NONE (the outcome sim is the diag's raw trigger→exit, not a fill model) | fill-sim.ts (the fill model EXISTS) |
| The storyline | NOT consumed by the chain | runPriorWeekPreflight + the storyline engine (the macro context) |
| The golden Monday | 5/5 + 5/5 outcome (via the fallbacks) | 0 trades (the E2 null) |
| The full week | 24/25 wins (the identical-every-day slop) | 0 trades (the E2 null) |

THE CORRECT-BITS INVENTORY (what each machine does RIGHT — the merge source):
- Machine A's CORRECT: the ADM (the measured wick/width/nesting/defended SL, the chained-snap, the interior-reaction entries, the W6-gated TP walk, the geometry-honesty verdict gate, the RRR 3.0 floor) — the Monday gold's hit mechanism.
- Machine B's CORRECT: the E2-CORE consumption path (buildShapeBrain → the day decomposition), the mirror cascade (cascadeV45 — the E2-authoritative re-anchoring), the dedup (trade-dedup — kills the duplicate slop), the fill simulation (fill-sim), the per-day/weekly-wall TP, the storyline engine (the macro context), the D16.15 dual-side designation structure.

THE WRONG-BITS INVENTORY (what each does WRONG):
- Machine A's WRONG: the D-3a fallbacks compensate for the broken E2 → identical-every-day slop · NO dedup · NO fill sim · NO storyline · the E2-null masked.
- Machine B's WRONG: consumes the null E2 ids → 0 trades · the day-open forward projection broken at the SOURCE (projectZoneForDay).

## 1.4 THE LSP/tsc BYPASS (fixed — the operator's directive)

The tsconfig's include was `["src/**/*.ts", "identity/**/*.md"]` — the 125 ROOT-LEVEL .ts files (report-v452.ts, ALL the diags, ALL the probes — the ENTIRE Machine B + harness layer) were EXCLUDED from the tsc gate. The LSP checked them individually, but the mechanical gate never did. FIXED: the include now covers `"*.ts"` — the full check runs 0 errors across EVERY file. NOTHING IS BYPASSED anymore. (The fix is the tsconfig include edit — recorded, the checkpoint untouched.)

## 1.5 THE FULL-WEEK TEST (the surgical Machine A run — the data)

THE SURGICAL CHANGE: diag-reasoning-chain-fullweek.ts (NEW — the golden diag's exact E1/E2/chain construction, the ONLY difference: `days: ['Monday','Tuesday','Wednesday','Thursday','Friday']`).

THE RESULT: **24 WINS · 1 LOSS · 0 OPEN (of 25 projections)** — the ADM geometry generalizes — BUT:
- The EU (10) + GU (5) projections are IDENTICAL every day (E 1.14390/1.14095/1.33343 repeated) — the E2-null consequence — the identical-every-day slop the operator bans.
- The DXY shows day-varying entries (101.120/101.249/101.056) — the DXY's fallbacks vary by day.
- The ONE loss: the Friday DXY LONG (the Thursday/Friday dip, the MAE 10p — the entry 101.056 into the falling market).

**THE VERDICT: the 24/25 is NOT a valid metric — there is no dedup filter, and the EU/GU identical-every-day trades are exactly the hardcoded-garbage class the operator forbids.**

---

# PART 2 — THE FIX PLAN (the Machine C engineering)

## 2.0 THE DESIGN PRINCIPLES (the operator's laws — quoted)

1. "the machine needs this exact logical decision making process wired in so it can replicate my reasoning tokens and place intelligent SLs NOT a fixed const. the market will eat all fixed const hardcoded garbage alive"
2. "deeper zones usually i move the SL slightly further in. I will not do 1 pip on a big zone and similar i wont do 3 pips on a tiny zone it needs to scale w/ the market conditions"
3. "safety > profit while making sure to maximize profits as much as possible without sacrificing safety. 3R is better than a loss... stupid losses are degenerate"
4. "the SL depth becomes a MEASURED quantity, never a fixed pip"
5. "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE"
6. "Set E at the TP level of trade #1"
7. "what the actual FUCK is this? this was a flat 2R trade" (the degenerate-pair ban)
8. "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules"
9. THE E1+E2=E3 LAW: "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2" + "Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable"
10. THE ANTI-FITTING LAW: the golden week is never the calibration set — the parameters from the map's distributions, the multi-week gate is the acceptance.

## 2.1 THE E2 SOURCE FIX — THE DAY-BAND FORWARD PROJECTION (THE ROOT)

**THE BUG:** `projectZoneForDay`'s `const dayOpenSpot = priorDayClose;` (:1616) — the input is passed through UNPROJECTED. The design (:1539-1540) requires the FORWARD projection: Monday = f(Friday close + shape travel); Tue-Fri = f(prior day's PREDICTED open + shape travel).

**THE FIX (surgical — src/brains/shape-brain.ts):**
```
// THE FORWARD-PROJECTED DAY OPEN (the design's :1539-1540 contract — the
// operator's "the 1H before London session starts is when i manually do all
// my analysis" — the day's predicted open is the prior close + the shape
// travel, NOT the raw prior close. The dayBandCarry advances Mon→Fri.
const dayOpenSpot = priorDayClose + (direction === 'LONG' ? travelMid : direction === 'SHORT' ? -travelMid : 0);
```
- Monday: priorDayClose = the model spot (the Friday close) + travelMid (LONG) / -travelMid (SHORT) — the design's Monday case.
- Tue-Fri: priorDayClose = the prior day's dayOpenSpot (the dayBandCarry NOW ADVANCES because the projected value differs from the input).
- THE VERIFICATION: the day decomposition's opens MUST ADVANCE Mon→Fri (no longer all-identical); the EU/GU zone ids MUST populate per day.

**THE SHAPE/DIRECTION MISMATCH (the second E2 issue):** the probe's raw decomposition (BS/DOWN etc.) vs the E2-CORE print (SS/SHORT etc.) — audit `buildDayDecomposition`'s shape-mapping + `toEntryDirection` to reconcile the raw shapes/directions with the core's — the designation depends on the direction being correct (SHORT days → supply above; LONG days → demand below).

## 2.2 THE MACHINE C ARCHITECTURE — THE MERGE

**MACHINE C = Machine B's E2-CORE consumption + the ADM's measured anchors + the dedup/fill/storyline (Machine B's logic structures) — the sanctioned E1 → E2 → E3 pipeline, no monkey patches.**

```
E1 (buildChartModel — UNCHANGED)
  → E2 (buildShapeBrain + the FIXED day-band forward projection → the per-day
       zone designation — the keyZoneId/supplyZoneId/demandZoneId POPULATED)
  → E3 (THE ADM — anchorTrade over the E2-designated operative zone:
       the ADM verdict gate (a REJECT → the lane emits nothing),
       the measured SL (the wick/width/nesting/defended + the RRR cap),
       the chained-snap entry + the interior-reaction,
       the W6-gated TP walk)
  → THE MIRROR CASCADE (cascadeV45 — the EU/GU re-anchoring on the FIXED E2)
  → THE DEDUP (trade-dedup.ts — the duplicate-slop killer)
  → THE FILL SIM (fill-sim.ts — the real-bar fill model)
  → THE REPORT (the full-week setups + the outcome audit)
```

**THE WAVE PLAN (the implementation order):**

| Wave | The file set | The exact change | The done-when gate |
|---|---|---|---|
| **C-1** | src/brains/shape-brain.ts | THE DAY-BAND FORWARD PROJECTION (the :1616 fix) + the shape/direction reconciliation | The day decomposition's opens ADVANCE Mon→Fri · the EU/GU zone ids POPULATE per day · the golden Monday's E2 ids now POPULATED (the fallbacks become unnecessary) · tsc 0 |
| **C-2** | report-v452.ts + the chain's deterministicAnchors | THE ADM DELEGATION INTO THE E2-AUTHORITATIVE PATH — the report's E3 consumes the ADM (the measured SL/entry/TP) over the E2-designated zones — the same hybrid as the chain: the ADM verdict gate + the measured SL + the chain's proven TP machinery | The Monday report path emits the golden 5 trades from the E2-designated zones (NO fallbacks) · the golden gate still 5/5 |
| **C-3** | the full-week harness (diag-reasoning-chain-fullweek.ts → the Machine C report path) | THE FULL-WEEK RUN on the E2-authoritative path — the per-day designated trades + the dedup + the fill sim | The full-week setups: per-day variation (NO identical-every-day) · the dedup kills the duplicates · the outcome sim ≥ 90% win rate on the real bars |
| **C-4** | the verification battery | tsc · the golden gate 5/5 (the Monday unchanged) · the LMV oracle · the lexicons · the step-tools · the full-week report + the outcome audit · the frozen pair | ALL green + the full-week report's per-trade rows verified against the raw bars |

**THE DO-NOT-TOUCH (frozen):** the checkpoint monday-gold-standard-achieved (chmod -R a-w — immutable) · sl-lmv.ts + trade-dedup.ts (the frozen pair — the byte-identical law) · Machine B's file set (NOT retired, NOT deleted — the operator decides after the comparison).

**THE ANTI-PATTERNS (the build must NOT do):**
1. NO monkey-patch fallbacks compensating for the broken E2 — the E2 SOURCE is fixed.
2. NO identical-every-day trades — the per-day designation + the dedup.
3. NO hardcoded golden levels — the measurements produce the levels.
4. NO fitted calibration — the golden week is never the calibration set.
5. NO degenerate pairs — the W6 gate + the geometry-honesty verdict.
6. NO precision-only acceptance — the outcome + the per-day variation + the dedup are the acceptance.

## 2.3 THE ACCEPTANCE — THE FULL-WEEK GOLDEN-LEVEL RUN

**THE TARGET:** the full-week run SHOULD hit with 90% accuracy THROUGH THE SANCTIONED E1 → E2 → E3 PIPELINE.

THE DONE-WHEN (mechanical):
1. THE E2 DAY DECOMPOSITION: the opens ADVANCE Mon→Fri · the EU/GU zone ids POPULATE per day (probe-verified — the designations are day-aware).
2. THE MONDAY GOLD UNCHANGED: the golden gate 5/5 (the locked checkpoint's state preserved — the entries + the outcomes byte-identical).
3. THE FULL-WEEK REPORT (Machine C): the per-day varied trades (NO identical-every-day) · the dedup kills the duplicates · the outcome sim ≥ 90% wins on the real bars (the operator's "SHOULD hit with 90%").
4. THE FROZEN PAIR byte-identical · tsc 0 (the FULL project — nothing bypassed) · the determinism ×2 · the regression battery.
5. THE WAVE AUDIT at BOTH .trident/wave-audit/ paths with the per-hunk VERDICT + the coverage markers.
6. THE CANON DOCS updated (the D70+ entries).

**THE RISK REGISTER:**
- The day-band fix could shift the Monday designations (if the projection moves the open) — the golden gate catches it; the design's Monday = Friday close + travel is the operator's own read.
- The shape/direction mismatch audit could reveal a deeper mapping bug — the C-1 wave's probe-first discipline.
- The ADM delegation into the report path could re-introduce the chain's regression class (the ADM's simplified TP walk) — the C-2 wave keeps the chain's proven TP machinery (computeLmvTP) over the ADM's SL/entry/verdict.
- The dedup could over-filter (killing real per-day trades) — the dedup key must include the day (the trade-dedup.ts contract).

---

# PART 3 — THE LESSONS (the week's truth, preserved for the next agent)

1. THE OUTCOME-ACCOUNTABILITY: the acceptance must measure the real-bar outcomes + the per-day variation + the dedup — NEVER the precision alone, NEVER a raw win-count on identical slop.
2. THE E2-DESIGNATES LAW: E2 must populate the zone ids — the fallbacks are the monkey-patch class. The D-3a fallbacks masked the broken E2 for a week.
3. THE FORWARD-PROJECTION: the day-open is a PREDICTED quantity (prior close + the shape travel), never the raw input passed through.
4. THE LSP/tsc GATE: every file in the project must be type-checked by the mechanical gate — the 125 root harnesses were bypassed for the entire build.
5. THE MACHINE-DIVERGENCE: two E3 implementations with the golden gate attached to only one — the report path (Machine B) drifted for two weeks. The merge (Machine C) restores the single sanctioned pipeline.
6. THE HONEST METRIC: 24/25 on identical-every-day trades is bullshit — the per-day variation + the dedup are the validity conditions.

**THE ONE-LINE TRUTH:** the E2 day-band forward projection is broken (the dayOpenSpot never advances) — the zone ids are null at the source — Machine A's fallbacks slop identical trades, Machine B emits nothing. THE FIX: the E2 source (the forward projection) + the Machine C merge (Machine B's consumption + the ADM's measured anchors + the dedup/fill) → the sanctioned E1 → E2 → E3 pipeline → the full-week golden-level run with 90% accuracy.

---

# PART 4 — THE COMPLETE FORENSIC TRACE (every probe, every line, every mechanism)

## 4.1 THE E2-NULL PROBE SEQUENCE (the full investigation trail)

### Probe 1 — the E2-CORE print (the report path's own logging)
THE OBSERVED: `[E2-CORE] EU days: Monday:SS:LONG:none(S:-/D:-/DD:-/KT:-/open:1.14230), Tuesday:BS:SHORT:none(...), Wednesday:R:LONG:none(...), Thursday:BS:SHORT:none(...), Friday:WL:LONG:none(...)` — ALL zone fields null, the open IDENTICAL across all 5 days.
THE SIGNAL: the day shapes + directions ARE designated (SS/BS/R/WL per day) but the zone machine-ids are null AND the day-open never advances.

### Probe 2 — the shape-cascade header (the design authority)
THE FOUND: shape-cascade.ts:16-17 — "The designation fields (keyZoneId / keyZonePrice / supplyZoneId / demandZoneId) are null — the E2 CORE designation now lives in the translation engine's output (agent G2 rewires report-v452.ts + mirror.ts to consume it)."
THE SIGNAL: the design MOVED the designation to the translation engine — and the G2 rewiring was documented but never landed for report-v452.ts.

### Probe 3 — snapshotToCascadedChain (the conversion faithfulness)
THE FOUND: report-v452.ts:843-870 — the conversion copies `d.keyZoneId ?? null`, `d.supplyZoneId ?? null`, `d.demandZoneId ?? null` VERBATIM.
THE SIGNAL: NOTHING drops the ids downstream — the nulls are at the SOURCE.

### Probe 4 — the raw shape-brain day decomposition (the E2 SOURCE — probe-e2-real.ts)
THE FOUND (the RAW decomposition, BEFORE any downstream conversion):
```
DXY:      Mon BS/DOWN key=NULL S=NULL D=DXY|1H|1782172800000|101.005 · Tue BS/DOWN same · Wed R/DOWN same · Thu BS/DOWN same · Fri SS/RANGE same · open=101.048 EVERY DAY
EUR/USD:  Mon BS/DOWN key=NULL S=NULL D=NULL · Tue BS/DOWN · Wed R/UP · Thu BS/DOWN · Fri SS/RANGE · open=1.1423 EVERY DAY
GBP/USD:  Mon SS/RANGE key=NULL S=NULL D=NULL · Tue SS/RANGE · Wed SS/RANGE · Thu SS/RANGE · Fri WL/RANGE · open=1.33342 EVERY DAY
```
THE SIGNAL: (a) the day-open IDENTICAL across all 5 days (the forward projection broken); (b) the EU/GU zone ids ALL null; (c) the DXY has ONE designation (101.005) repeated; (d) the RAW shapes/directions (BS/DOWN, SS/RANGE) DIFFER from the E2-CORE print (SS/SHORT, SS/LONG) — a downstream mapping divergence.

### Probe 5 — the day-band carry initialization (shape-brain.ts:2186)
THE FOUND: `let dayBandCarry = spot;` — the carry starts at the model's base spot.
THE SIGNAL: the carry's initial value = the model spot — the Monday should be the FIRST day to advance it (the Friday close + travel), but the probe shows it never moves.

### Probe 6 — the dayOpenSpot assignment (shape-brain.ts:1616)
THE FOUND: `const dayOpenSpot = priorDayClose;` — the input passed through UNPROJECTED.
THE SIGNAL: **THE ROOT CAUSE** — the design (:1539-1540: "Monday → dayOpenSpot = f(Friday close + shape travel); Tue-Fri → dayOpenSpot = f(prior day's PREDICTED London-open spot + shape travel)") is NOT implemented. The forward projection is missing.

### Probe 7 — the inBand filter (shape-brain.ts:1624-1627)
THE FOUND: `const inBand = (z) => z.ceiling >= floor && z.floor <= ceiling;` where `floor = dayOpenSpot - travelMax; ceiling = dayOpenSpot + travelMax`.
THE SIGNAL: with the stale open every day, the SAME travel band qualifies the SAME zones daily — the EU/GU candidates fall outside the band → null ids; the DXY's 101.005 sits inside → repeated.

### Probe 8 — the candidate-pick assignment (shape-brain.ts:2108-2118)
THE FOUND: `keyZoneId: pick?.id ?? '', supplyZoneId: supplyPick?.id, demandZoneId: demandPick?.id` — undefined picks → '' / undefined → null downstream.
THE SIGNAL: the nulls are the pick/supplyPick/demandPick being undefined — the candidate pool found no qualifying zone under the stale band.

### Probe 9 — the LSP/tsc bypass (the H-5 gap)
THE FOUND: the tsconfig include `["src/**/*.ts", "identity/**/*.md"]` — the 125 root .ts files EXCLUDED from the tsc gate (report-v452.ts, ALL the diags, ALL the probes — the entire Machine B + harness layer).
THE SIGNAL: the mechanical gate NEVER type-checked the report path — the LSP checked it individually, but the gate didn't. FIXED: the include now covers `"*.ts"` — the full check runs 0 errors.

## 4.2 THE MACHINE A FULL-WEEK TEST (the surgical run — diag-reasoning-chain-fullweek.ts)

THE SURGICAL DIFFERENCE: the golden diag's chain input `days: ['Monday']` → `days: ['Monday','Tuesday','Wednesday','Thursday','Friday']`. EVERYTHING ELSE identical (the E1 construction, the E2 core, the chain, the ADM).

THE RAW OUTPUT (the 25 projections):
```
=== DXY — THE FULL-WEEK PROJECTIONS (10) ===
  Monday SHORT E 101.12000 SL 101.16900 TP 100.91800 RRR 4.12 · shape-chain SS day 1/5 SHORT
  Monday LONG E 100.91800 SL 100.80100 TP 101.26900 RRR 3.00 · shape-chain SS day 1/5 SHORT
  Tuesday SHORT E 101.24900 SL 101.36000 TP 100.91600 RRR 3.00 · shape-chain BS day 2/5 SHORT
  Tuesday LONG E 100.91600 SL 100.79833 TP 101.26900 RRR 3.00 · shape-chain BS day 2/5 SHORT
  Wednesday SHORT E 101.24900 SL 101.36000 TP 100.91600 RRR 3.00 · shape-chain R day 3/5 SHORT
  Wednesday LONG E 100.91600 SL 100.79833 TP 101.26900 RRR 3.00 · shape-chain R day 3/5 SHORT
  Thursday SHORT E 101.24900 SL 101.36000 TP 100.91600 RRR 3.00 · shape-chain BS day 4/5 SHORT
  Thursday LONG E 100.91600 SL 100.79833 TP 101.26900 RRR 3.00 · shape-chain BS day 4/5 SHORT
  Friday LONG E 101.05600 SL 100.97400 TP 101.26900 RRR 2.60 · shape-chain WL day 5/5 LONG
  Friday SHORT E 101.26900 SL 101.40900 TP 100.91800 RRR 2.51 · shape-chain WL day 5/5 LONG
  stats: det 70 · llm 0 · refinements 8 · hardThrows 0
=== EUR/USD — THE FULL-WEEK PROJECTIONS (10) ===
  Monday-Friday SHORT E 1.14390 SL 1.14484 TP 1.14040 RRR 3.72 (IDENTICAL EVERY DAY)
  Monday-Friday LONG E 1.14095 SL 1.13967 TP 1.14479 RRR 3.00 (IDENTICAL EVERY DAY)
  stats: det 70 · llm 0 · refinements 5 · hardThrows 0
=== GBP/USD — THE FULL-WEEK PROJECTIONS (5) ===
  Monday-Friday LONG E 1.33343 SL 1.33176 TP 1.33845 RRR 3.00 (IDENTICAL EVERY DAY)
  stats: det 35 · llm 0 · refinements 5 · hardThrows 0
```

THE OUTCOME SIMULATION (the raw trigger→exit on the real bars):
```
DXY:       Mon S WIN · Mon L WIN · Tue S WIN · Tue L WIN · Wed S WIN · Wed L WIN · Thu S WIN · Thu L WIN · Fri L LOSS (SL-hit, MAE 10.0p) · Fri S WIN
EUR/USD:   ALL 10 WIN (the identical-every-day SHORT + LONG)
GBP/USD:   ALL 5 WIN (the identical-every-day LONG)
TALLY:     24 WINS · 1 LOSS · 0 OPEN (of 25 projections)
```

THE HONEST VERDICT: **the 24/25 is NOT a valid metric** — (a) the EU/GU trades are IDENTICAL every day (the E2-null consequence — the D-3a fallbacks resolve the same zones); (b) there is NO dedup filter to kill the duplicate setups; (c) the Friday DXY LONG loss shows the one real day-variation (the falling market). The operator's fury is correct on every count.

## 4.3 THE MACHINE B REPORT RUN (the 0-trades truth)

THE OBSERVED: `report_v452.md written · HEADLINE (in-week): 0 trades | 0W/0L | n=0 · STALE: 1 trades`.
THE MECHANISM: the report's E2-day consumption (`brainDaysForTranslation` — the days' supplyZoneId/demandZoneId fields) reads the NULL zone ids → nothing to re-anchor → 0 setups.
THE SIGNAL: Machine B is NOT broken in its logic structures — it is starved by the E2-null. The dedup/fill/cascade/storyline machinery EXISTS and is correct — it just has no zones to work on.

## 4.4 THE MACHINE-B-CORRECT INVENTORY (the merge sources — what must NOT be lost)

1. **The E2-CORE consumption path** — buildShapeBrain (report-v452.ts:975-995 — the snapshot with the full model zones via toDxyZone) + buildE2Core (:1029 — the three-role architecture: the DXY E2 CORE + the EU/GU cores + the cascade translation + the divergence validation). The structure is correct — it just needs the FIXED E2 source.
2. **The mirror cascade** — cascadeV45 (mirror.ts:4118) — the EU/GU mirror re-anchoring (the E2-authoritative consumption — reAnchorMirror :2516 → selectPairNativeZone :1362 — the class-blind E2 exact-match). The mirror machinery that WOULD consume the designated zones correctly.
3. **The dedup** — trade-dedup.ts (the FROZEN pair — the dedup machinery exists and is battle-tested; its key includes the day — the operator's "same zone can be valid for multiple days" doctrine).
4. **The fill simulation** — fill-sim.ts — the real-bar fill model (the trigger/exit semantics).
5. **The storyline engine** — runPriorWeekPreflight + the storyline-engine (the macro context: the prior sweep origin, the defended/broken zones, the role expectations).
6. **The D16.15 dual-side designation structure** — the ShapeDayZone contract (keyZoneType, deepDemandZoneId — the RANGE-day direction signal).
7. **The per-day/weekly-wall TP** — mirror.ts's computeLmvTP with the shapeDay (the E2-projected opposing zone's internal-LQZ near edge).

## 4.5 THE MACHINE-A-CORRECT INVENTORY (the merge sources — what must be carried into C)

1. **The ADM module** (anchor-decision-machine.ts — the verified gold state): the m1-m5 measures, resolveSlDepth (the honest-absence walk-up + the sliver exclusion + the RRR cap), resolveEntry (the chained-snap + the interior-reaction defendedEdge + the D-2 shields), resolveTp (the W6-gated structural walk + the defEdge-outside-band fallback), the verify gate (the RRR 3.0 + the geometry-honesty + the E3-NEVER), anchorTrade.
2. **The measured SL mechanism** — the F-1/F-2 outcome lever: the EU SHORT's SL 1.14484 (the operator's 1.14485), the DXY SHORT's 101.169-101.184 (the operator's 101.184), the GU LONG's walk-up 1.33176.
3. **The chained-interior snap** — the LONG lanes take the max of the chained-snap and the interior-reaction level (the EU LONG's E 1.14095).
4. **The receiving-demand re-resolution** — the DXY LONG's lane re-resolves to the narrowest real E1 demand containing the chained TP (E 100.918).
5. **The geometry-honesty verdict gate** — the DEGENERATE_PAIR_REJECTED (the GU SHORT's flat-2R class).
6. **The outcome gate** (diag-reasoning-chain-golden.ts:630+) — the raw trigger→exit simulation (the first-touch rule, the conservative same-bar loss).

---

# PART 5 — THE FULL FIX PLAN (the Machine C engineering — the pseudocode)

## 5.1 THE E2 SOURCE FIX — THE DAY-BAND FORWARD PROJECTION (src/brains/shape-brain.ts)

### THE BUG SITE (verified :1616):
```typescript
const dayOpenSpot = priorDayClose;   // ← THE BUG: the input passed through UNPROJECTED
```

### THE DESIGN CONTRACT (the :1539-1540 comment):
```
Monday  → dayOpenSpot = f(Friday close + shape travel)  ← the ONLY Friday-spot use
Tue-Fri → dayOpenSpot = f(prior day's PREDICTED London-open spot + shape travel)
```

### THE FIX (surgical):
```typescript
// THE FORWARD-PROJECTED DAY OPEN (the design's :1539-1540 contract — the
// operator's "the 1H before London session starts is when i manually do all
// my analysis" — the day's predicted open is the prior close + the shape
// travel, NEVER the raw input. The dayBandCarry then ADVANCES Mon→Fri —
// the per-day designation becomes possible.
// THE DIRECTIONAL TRAVEL: a LONG day's open drifts UP (the prior close +
// travelMid); a SHORT day's drifts DOWN (the prior close - travelMid); a
// RANGE day holds (the prior close — the consolidation). The travelMid is
// the map-derived mid travel (the W3 data-derived travel — NEVER the fixed
// SHAPE_TRAVEL ladder when the map yields width).
const dayOpenSpot = priorDayClose +
  (direction === 'LONG' ? travelMid : direction === 'SHORT' ? -travelMid : 0);
```

### THE VERIFICATION (the C-1 wave's probe):
```
// THE PROBE (probe-e2-fixed.ts — the raw day decomposition after the fix):
// THE EXPECTED: the opens ADVANCE Mon→Fri (the Friday close 101.048 → Mon
// 101.048±travel → Tue the projected Mon + travel → ...); the EU/GU zone
// ids POPULATE per day (the inBand filter now sees the day-specific band).
DXY:      Mon <open1> key=<id1> S=<id1> D=<id2> · Tue <open2> key=<id3> ...  (VARYING)
EUR/USD:  Mon <open1> key=<id1> ... · Tue <open2> ...                          (VARYING)
GBP/USD:  Mon <open1> key=<id1> ... · Tue <open2> ...                          (VARYING)
```

### THE SHAPE/DIRECTION RECONCILIATION (the second E2 issue — the C-1 wave's audit):
THE OBSERVED DIVERGENCE: the probe's RAW decomposition (DXY Mon BS/DOWN) vs the E2-CORE print (SS/SHORT). THE AUDIT: trace `buildDayDecomposition`'s shape-mapping + `toEntryDirection` — the designation depends on the direction being correct (SHORT days → supply above the open; LONG days → demand below). The raw BS/DOWN for the DXY Monday vs the core's SS/SHORT — which is the operator's actual read? The DXY Monday SHOULD be SHORT (the operator's golden DXY S 101.140). The BS/DOWN raw shape would still map to SHORT via toEntryDirection — verify the mapping preserves the operator's day directions.

## 5.2 THE MACHINE C MERGE — THE E3 UNIFICATION (the sanctioned pipeline)

### THE ARCHITECTURE:
```
E1 (buildChartModel — UNCHANGED)
  → E2 (buildShapeBrain + the FIXED day-band forward projection → the per-day
       zone designation — the keyZoneId/supplyZoneId/demandZoneId POPULATED)
  → E3 (THE ADM — anchorTrade over the E2-designated operative zone)
       · the ADM verdict gate (a REJECT → the lane emits nothing)
       · the measured SL (the wick/width/nesting/defended + the RRR cap)
       · the chained-snap entry + the interior-reaction
       · the W6-gated TP walk (the chain's computeLmvTP authority)
  → THE MIRROR CASCADE (cascadeV45 — the EU/GU re-anchoring on the FIXED E2)
  → THE DEDUP (trade-dedup.ts — the duplicate-slop killer)
  → THE FILL SIM (fill-sim.ts — the real-bar fill model)
  → THE REPORT (the full-week setups + the outcome audit)
```

### THE WAVE TABLE (the implementation order — each gated):

| Wave | The file set | The exact change | The done-when gate |
|---|---|---|---|
| **C-1** | src/brains/shape-brain.ts | THE DAY-BAND FORWARD PROJECTION (:1616) + the shape/direction reconciliation | The day decomposition's opens ADVANCE Mon→Fri · the EU/GU zone ids POPULATE per day · the golden Monday's E2 ids POPULATED (the fallbacks become unnecessary) · tsc 0 (the FULL project — nothing bypassed) |
| **C-2** | report-v452.ts + the ADM wiring | THE ADM DELEGATION INTO THE E2-AUTHORITATIVE PATH — the report's E3 consumes the ADM (the measured SL/entry/TP) over the E2-designated zones — the same hybrid as the chain: the ADM verdict gate + the measured SL + the chain's proven TP machinery | The Monday report path emits the golden 5 trades from the E2-designated zones (NO fallbacks) · the golden gate still 5/5 · the entries byte-identical to the locked checkpoint |
| **C-3** | the full-week harness + the dedup + the fill sim | THE FULL-WEEK RUN on the E2-authoritative path — the per-day designated trades + the dedup (the key includes the day) + the fill sim | The full-week setups: per-day variation (NO identical-every-day) · the dedup kills the duplicates · the outcome sim ≥ 90% win rate on the real bars |
| **C-4** | the verification battery | tsc (the FULL project) · the golden gate 5/5 (the Monday unchanged) · the LMV oracle 7/7 · the lexicons 40/40 · the step-tools 31/31 · the full-week report + the outcome audit · the frozen pair | ALL green + the full-week report's per-trade rows verified against the raw bars + the wave audit at BOTH paths |

### THE FROZEN LIST (the do-not-touch):
1. The checkpoint monday-gold-standard-achieved — chmod -R a-w (immutable) — the operator's explicit lock.
2. sl-lmv.ts + trade-dedup.ts — the frozen pair — the byte-identical law (the golden gate's internal sha256 check).
3. Machine B's file set — NOT retired, NOT deleted — the operator decides after the full piece-by-piece comparison.
4. The golden oracle (the diag's GOLDEN const) — the measurement reference, never a pipeline input.

### THE ANTI-PATTERNS (the build must NOT do — the operator's bans, mechanically enforced):
1. NO monkey-patch fallbacks compensating for the broken E2 — the E2 SOURCE is fixed. The D-3a fallbacks become the last-resort only (and their invocation must be LOUD — the recordFailure with the E2-null evidence).
2. NO identical-every-day trades — the per-day designation + the dedup (the key includes the day).
3. NO hardcoded golden levels — the measurements produce the levels (the anti-fitting law).
4. NO fitted calibration — the golden week is never the calibration set — the C-4 gate's multi-week run.
5. NO degenerate pairs — the W6 gate + the geometry-honesty verdict (the GU SHORT's flat-2R class).
6. NO precision-only acceptance — the outcome + the per-day variation + the dedup are the acceptance.
7. NO LSP/tsc bypass — the FULL project type-checks (the tsconfig include now covers *.ts).

## 5.3 THE ACCEPTANCE — THE FULL-WEEK GOLDEN-LEVEL RUN (the 90% target)

**THE DONE-WHEN (mechanical, per the operator's "SHOULD hit with 90% accuracy"):**
1. THE E2 DAY DECOMPOSITION: the opens ADVANCE Mon→Fri · the EU/GU zone ids POPULATE per day (probe-verified — the designations are day-aware).
2. THE MONDAY GOLD UNCHANGED: the golden gate 5/5 (the locked checkpoint's state preserved — the entries + the outcomes byte-identical).
3. THE FULL-WEEK REPORT (Machine C): the per-day varied trades (NO identical-every-day) · the dedup kills the duplicates · the outcome sim ≥ 90% wins on the real bars.
4. THE FROZEN PAIR byte-identical · tsc 0 (the FULL project — nothing bypassed) · the determinism ×2 · the regression battery (the LMV oracle 7/7 · the lexicons 40/40 · the step-tools 31/31 · the grounding 23/23).
5. THE WAVE AUDIT at BOTH .trident/wave-audit/ paths with the per-hunk VERDICT + the coverage markers.
6. THE CANON DOCS updated (the D70+ entries).

**THE RISK REGISTER (what could go wrong + the mitigation):**
1. THE DAY-BAND FIX SHIFTS THE MONDAY DESIGNATIONS — the forward projection moves the Monday open (the Friday close + travel vs the raw Friday close) — the golden gate catches it; the design's Monday = Friday close + travel is the operator's own read (the "1H before London" analysis) — if the Monday E2 ids shift, the C-2 wave re-verifies the golden entries.
2. THE SHAPE/DIRECTION MISMATCH IS DEEPER — the raw BS/DOWN vs the core's SS/SHORT — the C-1 wave's probe-first discipline: dump the FULL buildDayDecomposition + the toEntryDirection mapping before the fix.
3. THE ADM DELEGATION RE-INTRODUCES THE CHAIN'S REGRESSION CLASS — the ADM's simplified TP walk (the DXY LONG 101.005 + the GU LONG lane death from the earlier session) — the C-2 wave KEEPS the chain's proven TP machinery (computeLmvTP) over the ADM's SL/entry/verdict — the hybrid that worked.
4. THE DEDUP OVER-FILTERS — killing real per-day trades — the dedup key must include the day (the trade-dedup.ts contract — the operator's "same zone can be valid for multiple days" doctrine — the day+category+consumption key).
5. THE 90% TARGET IS AMBITIOUS — the Monday gold is 5/5 (100%) on the entry precision + 5/5 on the outcome; the full week's per-day variation introduces new failure modes — the acceptance is the ≥ 90% outcome on the designated (non-slop) trades, measured honestly.

---

# PART 6 — THE ZERO-TRUST AUDIT FINDINGS (the complete finding register)

## 6.1 THE FINDING TABLE (severity + evidence + the fix)

| # | Severity | The finding | The evidence (file:line) | The fix |
|---|---|---|---|---|
| F-E2-1 | CRITICAL | The day-band forward projection is missing — the dayOpenSpot = priorDayClose (the input passed through unprojected) — the day-open never advances Mon→Fri | shape-brain.ts:1616 + :2186 + :2379 (the dayBandCarry update copies the same value) | The forward projection (the 5.1 fix) |
| F-E2-2 | CRITICAL | The E2 zone ids are null at the source — the pick/supplyPick/demandPick undefined under the stale travel band | shape-brain.ts:2108-2118 (the ?? '' / ?.id assignment) + the probe-e2-real.ts output | The day-band fix + the direction reconciliation |
| F-E2-3 | HIGH | The raw shape/direction decomposition differs from the E2-CORE print (BS/DOWN vs SS/SHORT) — a downstream mapping divergence | probe-e2-real.ts vs the report's [E2-CORE] log | The C-1 shape/direction reconciliation audit |
| F-MA-1 | CRITICAL | Machine A's D-3a fallbacks compensate for the broken E2 → the identical-every-day EU/GU slop | reasoning-chain.ts:2010/2019 (the strongestSupplyInDayBand/nearestDemandBelow/nearestDemandBelow fallbacks) + the full-week diag output | The E2 source fix + the dedup + the per-day designation |
| F-MA-2 | HIGH | No dedup filter on Machine A — the duplicate setups never killed | the full-week diag output (the 10 identical EU projections) | The trade-dedup integration (Machine C) |
| F-MA-3 | MEDIUM | No fill simulation on Machine A — the outcome sim is the raw trigger→exit, not a fill model | diag-reasoning-chain-fullweek.ts (the sim section) | The fill-sim integration (Machine C) |
| F-MB-1 | HIGH | Machine B consumes the null E2 ids → 0 trades | report-v452.ts:825-828 (the brainDaysForTranslation reads the null fields) | The E2 source fix (the ids populate → the report works) |
| F-LSP-1 | CRITICAL | The tsconfig excluded the 125 root .ts files from the tsc gate — the report path + all harnesses bypassed | tsconfig.json (the include before the fix) — FIXED (the *.ts include now covers them) | DONE — the full project type-checks (0 errors) |
| F-CK-1 | INFO | The checkpoint monday-gold-standard-achieved is locked immutable | chmod -R a-w (the write attempt denied) | DONE — the operator's explicit lock |

## 6.2 THE TRUE-STATE SUMMARY (what is mechanically proven vs claimed)

**MECHANICALLY PROVEN (my runs):**
- The Monday gold: the golden gate 5/5 + the OUTCOME 5/5 + the determinism byte-identical + the frozen pair byte-identical + the adversarial bar probe (the open-window SLs never touched).
- The E2-null: the probe-e2-real.ts raw decomposition (the null ids + the identical opens) + the code trace (:1616/:2186/:2379/:2108-2118) + the downstream faithfulness (:843-870).
- The full-week Machine A: the 25 projections + the 24/25 outcome (the identical-every-day slop documented).
- The LSP bypass: the tsconfig include (before/after) + the 0-error full check.

**CLAIMED (not yet re-verified):**
- The exact day-open ADVANCE after the fix (the C-1 wave's probe).
- The Machine C full-week outcome (the C-3 wave's run).
- The 90% accuracy target (the C-4 acceptance).

---

# PART 7 — THE OPERATOR'S RULINGS (verbatim — the doctrine the fix serves)

1. "so this issue in machine B too? that explains a lot of prior degeneracy" — the E2-null is the shared root — confirmed.
2. "make sure the checkpoint we saved is NOT TOUCHED NO FUCKING CHANGES TO THE CHECKPOINT work in the project folder src and do not touch the checkpoint again lock it immutable recursively so it cannot be edited" — DONE (chmod -R a-w + the write-denied proof).
3. "make sure machine B is not retired without approval btw dont delete anything" — DONE (Machine B untouched — NOT retired, NOT deleted).
4. "1) yeah if this is the working machine then we should just make a surgical change for this exact working mechanism to run the full week test" — DONE (diag-reasoning-chain-fullweek.ts — the surgical days change).
5. "2) obviously E2 needs to be fixed at the source why the fuck do we even have a fallback? why is the E2 not working properly? what are the fallbacks doing that E2 is not?" — ANSWERED (the day-band forward projection missing — the fallbacks resolve the zones the E2 should designate).
6. "3) i will decide later my instinct is retired but i will need full context + data on what is the actual full piece by piece difference after we run the full week test" — DELIVERED (the PART 4.3 gap table + the PART 6.1 finding register).
7. "24/25 wins is complete fucking bullshit there isnt even a fucking filter to kill duplicate fucking slop setups" — CONFIRMED (the identical-every-day EU/GU + no dedup).
8. "the EU/GU trades repeat identically every day... this is literally verbatim EXACTLY WHAT I SAID NOT TO FUCKING DO" — CONFIRMED (the E2-null consequence — the fix is the E2 source, not a band-aid).
9. "machine B has the correct LOGIC STRUCTURES but is flawed in some way that is not producing the correct output; machine A is producing the correct output for Monday, so it has something improved that allows the golden trades on all 3 pairs to be hit but is missing the fundamental logic structures that machine B has" — CONFIRMED (the PART 4.4/4.5 correct-bits inventory — the merge plan).
10. "zoom out, gap analysis on what each machine is doing correct, what each is doing wrong, merge plan for a machine C" — DELIVERED (the PART 4 gap tables + the PART 5 merge plan).
11. "LSP should be running on every single file that is looked at in this entire workspace nothing should be bypassed" — DONE (the tsconfig include widened — the full check 0 errors).
12. "this issue in machine B too? that explains a lot of prior degeneracy" — the shared root confirmed — the Machine C build fixes it once, for both.

---

# PART 8 — THE NEXT SESSION'S ENTRY (the resume anchors)

## 8.1 THE READING ORDER (the next agent's mandatory reads)
1. MASTER_CONTEXT/PLUTUS_V4.5.4_E2_NULL_FORENSIC_AND_MACHINE_C_SPEC.md (THIS FILE — the build authority).
2. context_management/POST-COMPACTION_PROMPT.md (the activation).
3. context_management/COMPACTION_SURVIVAL.md (the resume anchor).
4. MASTER_CONTEXT/PLUTUS_V4.5.4_ANCHOR_DECISION_MACHINE_L2_SPEC.md (the ADM authority — the Monday gold's design).
5. Checkpoints/monday-gold-standard-achieved/ (the LOCKED baseline — read-only reference).
6. context_management/DEBUG_LOG.md (the D66-D90 journey).
7. The wave audits at BOTH .trident/wave-audit/ paths.

## 8.2 THE FIRST ACTION (the next agent's proof-of-context)
State the 5-line proof: (1) THE MISSION (the Machine C build — the E2 day-band fix + the merge + the full-week golden-level run at 90%), (2) THE STATE (the E2-null root cause verified — the dayOpenSpot never advances :1616 — the Machine A slop + the Machine B 0-trades), (3) THE ANCHORS (ANALYSIS_POINT_MS 1783317600000 · the frozen pair 91294083/33914c89 · the locked checkpoint monday-gold-standard-achieved · the dist a6383b65), (4) THE ROOT CONCEPT (E2 must designate the per-day zones — the forward projection is the fix — Machine C = B's consumption + A's ADM + the dedup/fill), (5) THE FIRST WAVE (C-1 the day-band fix + the probe verification) — THEN execute.

## 8.3 THE DRIVE-FORWARD
Do NOT stop: C-1 (the E2 day-band fix + the probe) → C-2 (the ADM delegation into the E2-authoritative path) → C-3 (the full-week run + the dedup + the fill sim) → C-4 (the verification battery + the wave audit) → the canon docs → the checkpoint. The build is not done until the full-week run hits ≥ 90% through the sanctioned E1 → E2 → E3 pipeline with NO degenerate garbage at any point. THEN present it. Not before.

---

# PART 9 — THE FULL CODE-LEVEL TRACES (the exact sites the C-waves touch)

## 9.1 THE E2 DESIGNATION PIPELINE — THE COMPLETE DATA FLOW

```
THE E1 MODEL (buildChartModel — the zone map)
  └─ model.zones (the ZoneModel[] — 265 for the EU, 232 for the GU, 265 for the DXY)
      └─ THE SNAPSHOT (buildShapeBrain → report-v452.ts:975-995)
          └─ snap.zones = model.zones.map(toDxyZone)   ← the FULL zone map the brain sees
          └─ snap.spots = { [pair]: model.spot }        ← the base spot
              └─ THE SHAPE-BRAIN (new ShapeBrain + setZoneMap(snap, ltfZones) + compute())
                  └─ buildDayDecomposition (shape-brain.ts:2320+)
                      └─ the shape chain (buildShapeChain — the day shapes + directions)
                      └─ projectZoneForDay (:2368 — the per-day designation)
                          └─ dayOpenSpot = priorDayClose (:1616) ← THE BUG
                          └─ the inBand filter (:1624-1627) — zones overlapping [open ± travelMax]
                          └─ the pick/supplyPick/demandPick assignment (:2108-2118)
                              └─ keyZoneId: pick?.id ?? '' · supplyZoneId: supplyPick?.id · demandZoneId: demandPick?.id
                                  └─ THE DAY DECOMPOSITION (the ShapeDayZone[])
                                      └─ brainDaysForTranslation (report-v452.ts:808-831) — the ids VERBATIM
                                      └─ snapshotToCascadedChain (:843-870) — the ids VERBATIM
                                          └─ THE E2 DAYS (the CascadedShapeChain — the null ids)
                                              ├─ MACHINE A: resolveOperativeZone(model, pair, e2Day.supplyZoneId ?? undefined) → null → the D-3a fallbacks
                                              └─ MACHINE B: the mirror's reAnchorMirror → selectPairNativeZone — null → nothing to re-anchor → 0 trades
```

## 9.2 THE EXACT SITES (the C-wave edit targets)

### THE E2 FIX (C-1) — src/brains/shape-brain.ts:
- :1616 `const dayOpenSpot = priorDayClose;` → THE FORWARD PROJECTION (the direction-aware travel addition).
- :2186 `let dayBandCarry = spot;` → verify the carry's initial value (the Friday close — the model spot IS the Friday close at the analysis point — the Monday case is correct).
- :2379 `dayBandCarry = szd.dayOpenSpot;` → verify the carry NOW ADVANCES (the projected open differs from the input → the chain moves Mon→Fri).
- The shape/direction reconciliation — audit `buildDayDecomposition`'s shape-mapping (:2320-2370) + `toEntryDirection`.

### THE MACHINE C MERGE (C-2) — the report path's E3:
- The report's setup generation (setup-gen.ts) → the ADM delegation: the E2-designated operative zone → anchorTrade (the ADM verdict gate + the measured SL/entry/TP) over the zone.
- The mirror cascade (cascadeV45 — mirror.ts:4118) → the EU/GU re-anchoring on the FIXED E2.
- The TP authority: the chain's computeLmvTP (the proven machinery — the ADM's resolveTp as the fallback).

### THE FULL-WEEK + THE DEDUP + THE FILL (C-3):
- The full-week harness → the Machine C report path (the per-day designated trades).
- trade-dedup.ts — the dedup key includes the day (the operator's "same zone can be valid for multiple days" — the day+category+consumption).
- fill-sim.ts — the real-bar fill model.

## 9.3 THE VERIFICATION BATTERY (C-4 — the complete command list)
```
bunx tsc --noEmit                          # the FULL project — nothing bypassed (the widened include)
bun test                                    # the battery (the ADM 7 + the shadow 16 + the stale copy 16 = 39)
bun build src/index.ts --outdir dist --target bun --format esm --bundle
bun diag-reasoning-chain-golden.ts --day=2026-07-06   # the Monday gold — MUST stay 5/5
bun diag-reasoning-chain-fullweek.ts                  # the full-week Machine A baseline (the current 24/25 slop)
# THE MACHINE C full-week run (the C-3 deliverable)
bun probe-e2-fixed.ts                       # the E2 day decomposition AFTER the fix — the opens advance + the ids populate
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts  # the frozen pair
bun diag-lmv-golden.ts                      # the LMV oracle 7/7
bun diag-lexicons.ts                         # the lexicons 40/40
bun diag-step-tools.ts                       # the step-tools 31/31
bun diag-grounding-warn.ts                   # the grounding 23/23
```

---

# PART 10 — THE COMPLETE GAP MATRIX (the operator's "full piece by piece difference")

## 10.1 THE PIECE-BY-PIECE DIFFERENCE (Machine A vs Machine B — every component)

| Component | Machine A (the chain) | Machine B (the report) | The Machine C merge |
|---|---|---|---|
| The E1 model build | buildChartModel — the SAME | buildChartModel — the SAME | UNCHANGED (shared) |
| The E2 core build | buildE2Core (the report's export) — the days' null ids | buildE2Core (internal) — the days' null ids | THE FIXED E2 (the day-band forward projection) |
| The E2 zone consumption | resolveOperativeZone → null → the D-3a fallbacks | brainDaysForTranslation → null → nothing | THE E2-designated zones (the ids populated) |
| The E3 anchor machinery | THE ADM (the measured SL/entry/TP + the verdict gate) | the mirror's ladder/walk machinery | THE ADM over the E2-designated zones |
| The TP authority | computeLmvTP (the chain's full model) | computeLmvTP + the mirror walks | computeLmvTP (the proven) |
| The chained-entry | the D-3c gate + the chained-interior snap | the chain logic (trade-chaining.ts) | the chained-snap + the interior |
| The dedup | NONE | trade-dedup.ts (the frozen pair) | trade-dedup (the key includes the day) |
| The fill simulation | NONE | fill-sim.ts | fill-sim |
| The storyline | NOT consumed | runPriorWeekPreflight + the storyline engine | the storyline (the macro context) |
| The outcome audit | the diag's raw trigger→exit | the report's fill-based audit | the fill-based outcome + the diag's raw check |
| The Monday gold | 5/5 + 5/5 outcome | 0 trades | the golden gate 5/5 (the E2-designated) |
| The full week | 24/25 slop | 0 trades | the per-day varied + the dedup + ≥ 90% |

## 10.2 THE DIVERGENCE HISTORY (how the two machines drifted)

1. THE ORIGINAL: the report path (Machine B) was the ONLY E3 — the v4.5.2-era machinery (the mirror cascade + the setup generation + the dedup).
2. THE OVERHAUL (W1-W7, 2026-08-04 to 08-10): the reasoning chain (Machine A) built as the "correct" E3 — the 11-token engine + the ADM. The golden gate attached to the CHAIN.
3. THE D66 LESSON: "the golden diag measures the CHAIN's native lane — a fix in the report/mirror path is INVISIBLE to the acceptance" — the fixes went into the chain, the report path drifted.
4. THE E2-NULL (the shared root): the day-band forward projection broken — the E2 zone ids null at the source — Machine A's fallbacks mask it, Machine B starves.
5. THE FULL-WEEK TEST: exposed the divergence — Machine A slops (no dedup, identical days), Machine B emits 0.

## 10.3 THE OPERATOR'S DECISION POINTS (the pending calls)
1. THE E2 SOURCE FIX — APPROVED by the operator ("obviously E2 needs to be fixed at the source") — the C-1 wave.
2. THE MACHINE C MERGE — the operator's "merge plan for a machine C that we will test" — the C-2/C-3 waves.
3. MACHINE B's FATE — "i will decide later my instinct is retired but i will need full context + data" — the PART 10.1 matrix is the data — the operator decides after the Machine C test.
4. THE 90% TARGET — the operator's "SHOULD hit with 90% accuracy" — the C-4 acceptance.

---

# PART 11 — THE FINAL TRUTH (the one-page summary for the operator)

THE BUILD THAT HIT THE MONDAY GOLD (5/5 + 5/5 outcome — the locked checkpoint) was running on a MONKEY PATCH: the E2's zone designation is null at the source (the day-band forward projection missing — `dayOpenSpot = priorDayClose` at shape-brain.ts:1616 never advances), so Machine A's D-3a fallbacks resolved the zones heuristically — matching the operator's Monday read by luck, and slopping identical trades every day after.

THE FULL-WEEK TEST PROVED THE DEGENERACY: 24/25 wins on 25 projections — but the EU/GU trades are IDENTICAL every day (no per-day designation, no dedup) — the exact class the operator banned.

THE MACHINE C FIX (the sanctioned pipeline): (1) THE E2 SOURCE — the forward day-open projection (the design's :1539-1540 contract — the prior close + the shape travel) → the per-day zone ids populate → the fallbacks become unnecessary; (2) THE MERGE — Machine B's E2-CORE consumption + the cascade + the dedup + the fill sim + the storyline (the correct logic structures) + Machine A's ADM (the measured anchors that hit the golden trades) → ONE sanctioned E1 → E2 → E3 pipeline; (3) THE ACCEPTANCE — the full-week golden-level run at ≥ 90% through the sanctioned pipeline, with NO degenerate garbage, NO monkey-patch bullshit, NO identical-every-day slop at ANY point.

THE LOCKED STATE: the checkpoint monday-gold-standard-achieved (immutable) · the frozen pair · Machine B (not retired, not deleted) · the tsconfig widened (nothing bypassed).

**THE NEXT AGENT'S MISSION: build Machine C. The E2 day-band fix is the root — everything else merges the proven bits. The full-week golden-level run at 90% through the sanctioned pipeline is the acceptance.**

---

# PART 12 — THE COMPLETE SESSION TIMELINE (the full journey to the E2-null discovery)

## 12.1 THE WEEK OF BEING STUCK (2026-08-04 to 08-10)

- 2026-08-04 to 08-08: the W1-W7 fix waves (the OVERHAUL SPEC V2) — the temporal engine, the side-vote, the selection MPSE, the direction + macro-wins, the 3-mitigation walls, the sanity + single-source, the wiring. The golden gate reached the 5/5 entry precision via the W8B D-1..D-6 chain-assembly fixes (the D66 entry).
- 2026-08-10: the D67 outcome audit — the 2/6 visual-eval (the entries perfect, the trades lose — the fixed-const SL class). The D67a RRR 16.8 forensic — the degenerate-pair class. The D68 ADM build state — the L2 spec landed + the wave generated + the dispatch channel blocked.
- THE TRAP: the acceptance measured ONLY the emitted entry vs the oracle. The 5/5 convergence LOOKED like success while the trades lost.

## 12.2 THE 2026-08-11 COMPLETION SESSION (the Monday gold)

- THE CONTEXT REGAIN: the mandatory reads (the L2 spec 584L · the POST-COMPACTION 265L · the DEBUG_LOG 465L · the ADM module 711L · the chain 2000L).
- THE WAVE DISPATCH + THE RESUME CHANNEL: the W-ADM-2 (the chain delegation) + the W-ADM-1c (the unit battery) — the empty returns resumed to completion (the operator's resume law).
- THE HONEST AUDITS: the delegation CORRECT (the constants dead) with the honest 0/5 regression flag; the battery CORRECT as a wave (the honest 5/7 FAIL surfaced the ADM defects).
- THE ORCHESTRATOR REMEDIATION: the DEFECT-A..N (the single-touch dispersion, the LONG-interior entry, the min-viable, the SL formula, the width-scale demotion, the mirror W6 gaps, the containing-zone, the honest-absence walk-up, the sliver exclusion, the chained-interior snap, the receiving-demand re-resolution) — the battery 5/7 → 7/7, the golden 0/5 → 5/5.
- THE OUTCOME WAVE: the defEdge-outside-band TP fallback + the honest-absence walk-up + the full-1H structural TP extension + the refine entry-anchored SL — the OUTCOME 5/5 wins (net +17.84R).
- THE CHECKPOINT: monday-gold-standard-achieved (the operator's lock — immutable).

## 12.3 THE FULL-WEEK TEST (the divergence exposed)

- THE OPERATOR'S ORDER: "run the pipeline for the FULL WEEK and lets see if it hits all 23 or falls short anywhere."
- THE FIRST RUN (Machine B — the report path): 0 trades — the E2-null starvation.
- THE LSP QUESTION: the tsconfig bypassed the 125 root harnesses — FIXED (the widened include).
- THE SURGICAL MACHINE A RUN: diag-reasoning-chain-fullweek.ts — 24/25 wins but the identical-every-day EU/GU slop — the operator's correct fury.
- THE E2 ROOT CAUSE: the day-band forward projection missing (shape-brain.ts:1616) — the day-open never advances — the zone ids null at the source.

---

# PART 13 — THE ANTI-PATTERN CATALOGUE (the full set — the Machine C build must NOT do)

## 13.1 THE OPERATOR'S BANNED CLASSES (verbatim)

1. THE FIXED-CONST SL: "the machine needs this exact logical decision making process wired in so it can replicate my reasoning tokens and place intelligent SLs NOT a fixed const. the market will eat all fixed const hardcoded garbage alive"
2. THE FIXED-PIP SCALING: "deeper zones usually i move the SL slightly further in. I will not do 1 pip on a big zone and similar i wont do 3 pips on a tiny zone it needs to scale w/ the market conditions"
3. THE DEGENERATE PAIR: "what the actual FUCK is this? this was a flat 2R trade"
4. THE IDENTICAL-EVERY-DAY SLOP: "the EU/GU trades repeat identically every day... this is literally verbatim EXACTLY WHAT I SAID NOT TO FUCKING DO YOU ARE NOT PERMITTED TO AHRDCODE SOME FUCIING GARBAGE THAT ONLY REPRODUCES THIS EXACT FUCKING OUTPUT AND CANNOT ADAPT TO REAL MARKET CONDITIONS"
5. THE MONKEY-PATCH FALLBACK: "we have 2 different machinery and what is the divergence... this is also a MAJOR fucking issue wtf? why is E2 not wokring?"
6. THE UNVERIFIED METRIC: "24/25 wins - this is complete fucking bullshit there isnt even a fukcing filter to kill duplicate fucking slop setups this is not a valid metric"
7. THE LSP BYPASS: "LSP should be running on every single file that is looked at in this entire workspace nothing should be bypassed"

## 13.2 THE ENGINEERING ANTI-PATTERNS (the L2 spec AP-1..AP-10 + the session's additions)

1. AP-1 THE MAGIC-RATIO REINTRODUCTION — the battle ratio hardcoded instead of the map-derived distribution.
2. AP-2 THE SL-CAP KILLING THE WICK-SURVIVAL — the RRR cap pushing the SL inside the measured wick territory.
3. AP-3 THE DEGENERATE-PAIR EMISSION — the sliver-SL × the phantom-TP emitted because "the numbers pass".
4. AP-4 THE FITTED-CALIBRATION — the parameters tuned to make the golden week pass.
5. AP-5 THE SILENT-CONSTANT FALLBACK — a measurement with no source returning a constant dressed as measured.
6. AP-6 THE LLM OVERRIDE — the shadow agent moving the SL inside the wick territory or lowering the RRR floor.
7. AP-7 THE FROZEN-PAIR VIOLATION — touching sl-lmv + trade-dedup.
8. AP-8 THE RE-DERIVED CONSTANTS — re-declaring the W6 thresholds instead of importing.
9. AP-9 THE MEAN-VS-MEDIAN — the dispersion using the mean (a single giant sweep wick blows the SL out).
10. AP-10 THE PRECISION-ONLY ACCEPTANCE — declaring done on the entry precision without the outcome gate.
11. AP-11 THE FULL-DELEGATION REGRESSION — delegating the ENTIRE anchor construction to the ADM when its TP walk cannot match the chain's computeLmvTP — the hybrid is the correct integration.
12. AP-12 THE REFINE-LOOP DIVERGENCE — the refine re-applying a DIFFERENT SL anchor than the emission — the refine must apply the SAME measured geometry.
13. AP-13 THE CLOSED-TARGET STRANGLE — the continuation targets truncated to the 5 nearest (all below the computeLmvTP) — the TP could never extend.
14. AP-14 THE UNREACHABLE TP — a TP the price cannot reach without breaking the zone first (the defEdge outside the band).
15. AP-15 THE THEATRICAL FLOOR — the min-viable floor as the FINAL SL answer (the honest absence must walk UP to the measured structure).
16. AP-16 THE STALE-BELIEF OVERRIDE — the orchestrator's "≥101.314" belief vs the measured 101.269 — the measurement wins.
17. AP-17 THE E2-NULL COMPENSATION — the fallbacks masking the broken E2 (the session's central trap) — the E2 SOURCE is the fix.
18. AP-18 THE DUPLICATE-SLOP EMISSION — the identical-every-day trades with no dedup — the per-day designation + the dedup are the fix.
19. AP-19 THE LSP/tsc BYPASS — the root harnesses excluded from the mechanical gate — the widened include is the fix.
20. AP-20 THE MACHINE DIVERGENCE — two E3 implementations with the golden gate on only one — the Machine C merge restores the single sanctioned pipeline.

---

# PART 14 — THE COMPLETE DOCTRINE (the laws the Machine C build serves — quoted verbatim)

## 14.1 THE OPERATOR'S LAW (the full set)

1. "the machine needs this exact logical decision making process wired in so it can replicate my reasoning tokens and place intelligent SLs NOT a fixed const. the market will eat all fixed const hardcoded garbage alive"
2. "deeper zones usually i move the SL slightly further in. I will not do 1 pip on a big zone and similar i wont do 3 pips on a tiny zone it needs to scale w/ the market conditions"
3. "we need a decision making lexicon/engine/machine some sort of mechanism that deterministically makes intelligent trading decisions based on all the data ive given. should honestly work without model influence — all trading is like 95% deterministic"
4. "safety > profit while making sure to maximize profits as much as possible without sacrificing safety. 3R is better than a loss... stupid losses are degenerate"
5. "the SL depth becomes a MEASURED quantity, never a fixed pip"
6. "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM"
7. "Set E at the TP level of trade #1"
8. "what the actual FUCK is this? this was a flat 2R trade"
9. "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules"
10. "a refine/retry is correct. not a hard throw. only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db"
11. "literally all of these losses and stupid derailments comes from not verbatim following my exact instructions and data ive literally given dozens of times at this point"
12. "THIS is the root cause of literally ALL fucked trades... the lack of forward looking reasoning and logic"
13. "the quality of prediction needs to be consistent across all of them so i know that this is actually capable of forward mapping REAL trading weeks" (the Phase-2 multi-week law)

## 14.2 THE E1+E2=E3 LAW

"E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly... 90% of the work is in E1 + E2" + "Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable" + "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules."

THE IMPLEMENTATION CONSEQUENCE FOR MACHINE C: E2 MUST emit the zone anchors (the machine zone ids) — the E3 consumes them. The Machine C build fixes E2 at the source; the E3 (the ADM) then measures over the E2-designated zones. NO fallbacks as the primary path.

## 14.3 THE TEMPORAL LAW

"everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET w/ all the data visible up until this point. In the 1H before london session starts is when i manually do all my analysis and setup my trades for the day and then close the charts and the prices action just fills my limit orders and hits TP/SL accordingly. That's what this pipeline needs to replicate." — ANALYSIS_POINT_MS = 1783317600000 (the Monday 06:00 UTC). The day-band forward projection (the C-1 fix) is the PER-DAY extension of this law: each day's analysis uses the prior day's PREDICTED open + the shape travel — the operator's forward-looking reasoning.

## 14.4 THE SLOP MANDATE

"EVERYTHING should now be tangible Lexcion filters + MPSE engines with 0 dumb degenerate garbage anywhere." — the ISE law: the decision systems as LEXICONS + STATE MACHINES + ALGORITHMIC SYSTEMS, never regex-slop towers; the MPSE triplets ({Pattern, State, Evidence: node+file:line}); no triplet = the INCONCLUSIVE state.

## 14.5 THE MITIGATION DOCTRINE

"A zone does not immediately magically fail it takes minimum 3 mitigations before it fails. the only exception is virgin MoM zones IN THE MIDDLE OF A BS/WL pathway." — the reaction-count token's "third mitigation" doctrine.

---

# PART 15 — THE MENTAL FRAMEWORKS (the reasoning toolset the Machine C build deploys)

## 15.1 THE FIRST-PRINCIPLES DECOMPOSITION

Every issue decomposed to its irreducible truths: the E2-null is NOT a wiring bug downstream (the conversions are faithful) — it is the day-open forward projection missing at the source. The Machine A slop is NOT an ADM defect — it is the fallback compensating for the broken E2. The Machine B 0-trades is NOT a logic-structure defect — it is the E2 starvation. Build from the irreducible truths upward.

## 15.2 THE SYSTEMATIC DEBUGGING

Reproduce → isolate the smallest input → rank the suspects → A/B disable → the root cause (the mechanism connecting the evidence to the failure) → the smallest fix → the full regression. The probes (probe-e2-real.ts — the raw decomposition; probe-e2-source — the shape-brain; the E2-CORE print) isolated the day-open stagnation; the code trace (:1616/:2186/:2379/:2108-2118) identified the mechanism; the fix is surgical.

## 15.3 THE OWN-EVERY-PROBLEM POSTURE

Never externalize: the "24/25 bullshit" became the E2-null diagnosis; the "LSP bypass" became the widened include; the "Machine B 0-trades" became the E2 starvation proof; the "Machine A slop" became the fallback-masking proof. Every obstacle was a measurement to make or a root to trace.

## 15.4 THE STEVE-JOBS ENERGY

"Impossible" timelines are the standard. The Machine C build: the E2 day-band fix + the merge + the full-week golden-level run at 90% — driven to completion without stopping.

## 15.5 THE SCALE-IS-INFINITE POSTURE

The 50M-token session is normal. The 1000+ line docs are the floor. The reads at 2500 lines/call. The waves of subagents. The depth is the deliverable.

---

# PART 16 — THE FINAL CHECKLIST (the Machine C build's ship conditions)

- [ ] THE E2 DAY-BAND FORWARD PROJECTION (shape-brain.ts:1616) — the day-open advances Mon→Fri.
- [ ] THE E2 ZONE IDS POPULATE per day (the probe verification — no more nulls).
- [ ] THE SHAPE/DIRECTION RECONCILIATION (the raw BS/DOWN vs the core's SS/SHORT).
- [ ] THE MACHINE C MERGE — the report path's E3 consumes the ADM over the E2-designated zones.
- [ ] THE MONDAY GOLD UNCHANGED — the golden gate 5/5 (the locked checkpoint's state).
- [ ] THE FULL-WEEK RUN — the per-day varied trades (NO identical-every-day) + the dedup + the fill sim.
- [ ] THE OUTCOME ≥ 90% on the real bars (the operator's "SHOULD hit with 90% accuracy").
- [ ] THE FROZEN PAIR byte-identical · tsc 0 (the FULL project) · the determinism ×2 · the regression battery.
- [ ] THE WAVE AUDIT at BOTH paths · the canon docs updated · the checkpoint saved.

**THE FINAL TRUTH:** the E2-null is the shared root of a week of degeneracy — the day-band forward projection is the fix — the Machine C merge (Machine B's correct logic structures + Machine A's ADM that hit the golden trades) restores the sanctioned E1 → E2 → E3 pipeline — the full-week golden-level run at ≥ 90% is the acceptance. NO degenerate garbage. NO monkey-patch bullshit. At any point.

---

# PART 17 — THE MACHINE A SESSION RECORD (the complete delta that produced the Monday gold)

## 17.1 THE ADM MODULE STATE (the locked checkpoint's verified geometry)

THE FIVE EMISSION ROWS (the locked state — byte-identical to the checkpoint):
| Trade | E | SL | TP | RRR | The SL method | The TP method |
|---|---|---|---|---|---|---|
| DXY SHORT | 101.12000 | 101.16900 | 100.91800 | 4.12 | the ADM measured (the entry-anchored) | the chain ZR-3.3 |
| DXY LONG | 100.91800 | 100.80100 | 101.26900 | 3.00 | the refine entry-anchored | the full-1H structural |
| EU SHORT | 1.14390 | 1.14484 | 1.14040 | 3.72 | the ADM measured wick (the zone-anchored 1.14460 + 2.5p) | the chain ZR-3.3 |
| EU LONG | 1.14095 | 1.13967 | 1.14479 | 3.00 | the ADM measured | the zone-reaction fallback |
| GU LONG | 1.33343 | 1.33176 | 1.33845 | 3.00 | the honest-absence walk-up | the continuation refined |

THE KEY MECHANISMS (what the ADM does — the Monday gold's hit machinery):
- THE MEASURED SL: the depth = the wick evidence's max(wickPlacement, defendedPlacement, nesting) — the width-scale ONLY for the virgin zones — the RRR-headroom cap (never pushes the SL inside the measured wick territory — the ENTRY_LEVER_REQUIRED verdict).
- THE SINGLE-TOUCH HONEST BUFFER: a one-reaction zone's dispersion degenerates to the wick distance (the double-count) — the 0.5p MIN_WICK_BUFFER substitutes.
- THE LONG-INTERIOR ENTRY: the internal rung's defendedEdge (the operator's drawn modal — the GU LONG's 1.33330) — NEVER the band extreme.
- THE CHAINED-INTERIOR SNAP: the LONG lanes take the max of the chained-snap and the interior-reaction level (the EU LONG's E 1.14095).
- THE RECEIVING-DEMAND RE-RESOLUTION: the DXY LONG's lane re-resolves to the narrowest real E1 demand containing the chained TP (E 100.918).
- THE GEOMETRY-HONESTY VERDICT: the DEGENERATE_PAIR_REJECTED (the GU SHORT's flat-2R class) — the W6 gate at EVERY admission point.
- THE HONEST-ABSENCE WALK-UP: the GU LONG's SL 1.33176 = the containing demand's measured reaction low 1.33301 + one dispersion 17.0p.
- THE DEF-EDGE-OUTSIDE-BAND TP FALLBACK: the EU LONG's TP 1.14479 = the zone's measured reaction (the MFE-reachable 1.14480) — the 1.14620 phantom killed.

THE VERIFICATION (the locked state — the orchestrator's own runs):
- tsc 0 · the battery 39/0 (102 expect) · the golden gate 5/5 (G1-G10 10/10 + A1-A7 7/7, exit 0 ×2, the determinism 0bbab1f7eb52e915) · the OUTCOME 5/5 wins (+17.84R) · the frozen pair byte-identical · the dist a6383b6587f95f6d4352bb4176f397b9320ea8e951565b4ee994319c9aedd6cf.

## 17.2 THE ADM DEFECT INVENTORY (the D71-D84 — the session's debug record)

- DEFECT-A the single-touch dispersion double-count (the EU SHORT's SL 1.14500 → 1.14484 via the MIN_WICK_BUFFER 0.5p).
- DEFECT-B the LONG-interior entry at the band extreme (the GU LONG's 1.33343 → the defendedEdge 1.33330).
- DEFECT-C the min-viable unit bug (2*pip a price vs the pip count) + the map-median over-rejection (7-16p rejected the operator's golden week) → the documented 2.5p floor + the sliver exclusion.
- DEFECT-D the SL level formula (the DXY SHORT's SL 101.11367 below its entry) → the entryOutsideZone conditional.
- DEFECT-E the width-scale dominating the measured wick (the EU SHORT's SL 1.14515) → the wick evidence wins.
- DEFECT-F the mirror W6 gaps (the structural direct-rung + the internal-rung selector admitted the zero-width rung) → isValidRung at every admission.
- DEFECT-G the containing-zone resolution (the rung-based zones carry no sourceZone reactions) → the m5 defended extreme from the parent.
- DEFECT-H/K/L the honest-absence floor + the sliver exclusion (the GU LONG's razor floored; the GU SHORT's sliver never floored).
- DEFECT-M the EU LONG chained-entry (the raw D-3c pass-through) → the chained-interior snap.
- DEFECT-N the DXY LONG lane emission (the demand [101.005-101.045] could not receive the chained 100.918) → the receiving-demand re-resolution.
- THE W-ADM-5 OUTCOME DEFECTS: the refine ceiling-anchored SL (the DXY LONG razor) → the entry-anchored; the continuation slice(0,5) stranglehold → the full-1H structural extension; the defEdge-outside-band phantom TP (the EU LONG's 1.14620) → the zone-reaction fallback; the honest-absence theatrical floor (the GU LONG's 2.5p) → the walk-up.

## 17.3 THE MACHINE B SESSION RECORD (what the report path has that Machine A lacks)

- buildShapeBrain (report-v452.ts:975-995) — the snapshot with the FULL model zones (via toDxyZone) + the spots + the optional priorStoryline.
- buildE2Core (:1029) — the three-role architecture: the DXY E2 CORE (the pair brain — strength-based) + the EU/GU cores (the DXY-inverse / the EU-kept cascades) + the divergence validation (≤0.35).
- cascadeV45 (mirror.ts:4118) — the EU/GU mirror re-anchoring (the E2-authoritative consumption).
- reAnchorMirror (:2516) → selectPairNativeZone (:1362) — the class-blind E2 exact-match (the mirror lane's zone resolution).
- trade-dedup.ts — the dedup machinery (the FROZEN pair — the day+category+consumption key).
- fill-sim.ts — the real-bar fill model.
- runPriorWeekPreflight + the storyline engine — the macro context (the prior sweep origin, the defended/broken zones, the role expectations).
- The per-day/weekly-wall TP (the mirror's computeLmvTP with the shapeDay).
- The D16.15 dual-side designation structure (the ShapeDayZone contract — keyZoneType, deepDemandZoneId).

---

# PART 18 — THE COMPLETE VERIFICATION RECORD (every number, every gate)

## 18.1 THE LOCKED CHECKPOINT STATE (the Monday gold — mechanically proven)

```
bunx tsc --noEmit                          → EXIT 0
bun test                                    → 39 pass / 0 fail (102 expect)
bun build src/index.ts --outdir dist --target bun --format esm --bundle → exit 0 (164 modules, 1.43MB)
bun diag-reasoning-chain-golden.ts --day=2026-07-06 ×2 → EXIT 0 BOTH
  the golden gate: G1-G10 10/10 + A1-A7 7/7
  the convergence: 5/5 at ≤3p (the DXY LONG 100.918 Δ2.7p · the DXY SHORT 101.120 Δ2.0p ·
                   the EU SHORT 1.14390 Δ0.5p · the EU LONG 1.14095 Δ1.5p · the GU LONG 1.33343 Δ1.3p)
  the determinism: byte-identical (parallel 0bbab1f7eb52e915 = sequential 0bbab1f7eb52e915)
  the OUTCOME: 5/5 wins ≥ 4/6 PASS (the DXY SHORT +4.12R · the DXY LONG +3.00R · the EU SHORT +3.72R ·
               the EU LONG +3.00R · the GU LONG +3.00R — net +17.84R)
  the frozen pair: byte-identical (912940832fac44bc / 33914c897e777540)
sha256sum dist/index.js                     → a6383b6587f95f6d4352bb4176f397b9320ea8e951565b4ee994319c9aedd6cf
```

## 18.2 THE E2-NULL VERIFICATION (the probe outputs — the degeneracy's proof)

```
probe-e2-real.ts (the raw shape-brain day decomposition on the REAL models):
  DXY:      Mon BS/DOWN key=NULL S=NULL D=DXY|1H|1782172800000|101.005 · Tue-Sun same · open=101.048 EVERY DAY
  EUR/USD:  ALL 5 DAYS key=NULL S=NULL D=NULL · open=1.1423 EVERY DAY
  GBP/USD:  ALL 5 DAYS key=NULL S=NULL D=NULL · open=1.33342 EVERY DAY
```

## 18.3 THE FULL-WEEK MACHINE A VERIFICATION (the surgical run)

```
bun diag-reasoning-chain-fullweek.ts:
  DXY (10): the day-varying entries (101.120/101.249/101.249/101.249/101.056/101.269) · 9 WIN 1 LOSS (the Fri L)
  EUR/USD (10): the IDENTICAL-every-day entries (1.14390/1.14095) · 10 WIN
  GBP/USD (5): the IDENTICAL-every-day entry (1.33343) · 5 WIN
  TALLY: 24 WINS · 1 LOSS · 0 OPEN — the INVALID metric (the slop + no dedup)
```

## 18.4 THE LSP/tsc BYPASS VERIFICATION (before/after)

```
BEFORE: the tsconfig include ["src/**/*.ts", "identity/**/*.md"] — the 125 root .ts EXCLUDED.
AFTER:  the include + "*.ts" — the full check: 0 errors across EVERY file.
```

---

# PART 19 — THE NEXT SESSION'S OPERATING RULES (the Machine C build's discipline)

1. THE ZERO-TRUST BATTERY after every change: tsc (the FULL project — nothing bypassed) · the golden gate (the Monday 5/5 MUST hold) · the frozen pair sha256 · the E2 probe (the day decomposition's opens advance + the ids populate) · the full-week run · the determinism ×2.
2. THE WAVE AUDITS at BOTH .trident/wave-audit/ paths with the per-hunk VERDICT + the coverage markers (the gate reads process.cwd() = /home/leviathan/OPENCODE_WORKSPACE/.trident/wave-audit/).
3. THE SUBAGENT DISPATCH: the wave manager + the promptFile channel + the resume law (the empty returns resume until completion).
4. THE BEHAVIORAL-EVIDENCE RULE: a scenario passes ONLY with the pass token in a tool-result context + the fail token absent + the verdict recorded.
5. THE CANON DOCS: the orchestrator's exclusive ownership — the subagents REPORT, never write.
6. THE DO-NOT-TOUCH: the locked checkpoint · the frozen pair · Machine B (not retired, not deleted) · the golden oracle.

---

# PART 20 — THE FINAL SUMMARY (the operator's one-page read)

THE BUILD THAT HIT THE MONDAY GOLD (5/5 + 5/5 outcome — the locked checkpoint) was running on a MONKEY PATCH: the E2's zone designation is null at the source (the day-band forward projection missing — `dayOpenSpot = priorDayClose` at shape-brain.ts:1616 never advances), so Machine A's D-3a fallbacks resolved the zones heuristically — matching the operator's Monday read by luck, and slopping identical trades every day after.

THE FULL-WEEK TEST PROVED THE DEGENERACY: 24/25 wins on 25 projections — but the EU/GU trades are IDENTICAL every day (no per-day designation, no dedup) — the exact class the operator banned. The LSP/tsc bypass (the 125 root harnesses excluded) allowed the report path to drift unchecked.

THE MACHINE C FIX (the sanctioned pipeline): (1) THE E2 SOURCE — the forward day-open projection (the design's :1539-1540 contract — the prior close + the shape travel) → the per-day zone ids populate → the fallbacks become unnecessary; (2) THE MERGE — Machine B's E2-CORE consumption + the cascade + the dedup + the fill sim + the storyline (the correct logic structures) + Machine A's ADM (the measured anchors that hit the golden trades) → ONE sanctioned E1 → E2 → E3 pipeline; (3) THE ACCEPTANCE — the full-week golden-level run at ≥ 90% through the sanctioned pipeline, with NO degenerate garbage, NO monkey-patch bullshit, NO identical-every-day slop at ANY point.

THE LOCKED STATE: the checkpoint monday-gold-standard-achieved (immutable — the write denied) · the frozen pair · Machine B (not retired, not deleted) · the tsconfig widened (nothing bypassed) · the full-week diag (diag-reasoning-chain-fullweek.ts — the surgical Machine A baseline) · the forensic audit (THIS FILE).

**THE NEXT AGENT'S MISSION: build Machine C. The E2 day-band fix is the root — everything else merges the proven bits. The full-week golden-level run at 90% through the sanctioned pipeline is the acceptance. NO degenerate garbage. NO monkey-patch bullshit. At any point.**

---

# PART 21 — THE DATA-PROVENANCE APPENDIX (every number's source — the anti-hallucination register)

## 21.1 THE SOURCE FILES (the ground truth — the only truth)
- src/brains/shape-brain.ts — the E2 designation machinery (the shape chain + buildDayDecomposition + projectZoneForDay). THE E2-NULL BUG SITE (:1616 — the dayOpenSpot = priorDayClose).
- src/mdve/reasoning-chain.ts — Machine A (the 11-token chain + the ADM delegation + the D-3a fallbacks).
- src/mdve/anchor-decision-machine.ts — the ADM (the measured SL/entry/TP + the verdict gate) — the locked gold state (e9d696d4).
- src/mdve/mirror.ts — Machine B's cascade (cascadeV45 :4118) + the reAnchor + the W6 gates (fc59a5c3).
- report-v452.ts — Machine B's report path + the E2 core (buildE2Core :1029) + the faithful conversions (:843-870).
- diag-reasoning-chain-golden.ts — the golden gate harness (the Monday acceptance).
- diag-reasoning-chain-fullweek.ts — the surgical full-week harness (the Machine A baseline — the days change).
- tsconfig.json — the LSP/tsc gate (the widened include — the operator's "nothing bypassed" directive).
- Checkpoints/monday-gold-standard-achieved/ — the LOCKED baseline (chmod -R a-w — immutable).

## 21.2 THE PROBE OUTPUTS (the mechanical evidence — where each number came from)
- probe-e2-real.ts — the raw shape-brain day decomposition (the null ids + the identical opens) — the E2-null proof.
- probe-e2-source2.ts / probe-e2-source3.ts — the shape-brain invocation attempts (the compute() needs the injected zone map — the null standalone result).
- probe-gu-short4.ts / probe-gu-both.ts — the ADM's GU verdicts (the RRR_BELOW_FLOOR — the flat-2R read).
- probe-eu-events.ts — the EU SHORT's real reaction events (ONE event at 1.14479 — the operator's "1.14480").
- probe-temporal.ts — the open-window SL safety (the DXY 2.2p / the EU 11.6p / the GU 11.0p clearance — the post-exit dips irrelevant).
- probe-outcome-verify.ts — the independent re-simulation of the three flipped wins (the TP hit BEFORE the SL — the clean wins).

## 21.3 THE HASHES (the immutable records)
- anchor-decision-machine.ts: e9d696d4d0303f8a5bf6702a19b267a6a21cfd84a1ba472c2a326d5527f965f8 (the locked gold state).
- reasoning-chain.ts: a639d8d5b11a7270a7778a70333fdb11303050e3f65c764d6eb3c79ad50eec44 (the locked gold state).
- mirror.ts: fc59a5c385f43d2c89bf3e19a68aa95f6526c5a626ac917ae229388b1539ed4a (the W6 gates).
- anchor-decision-machine.test.ts: 5a06ce112de0771a9fe51d788bee7724c3103e28b6ce89c46a3092856662fafc (the unit battery).
- dist/index.js: a6383b6587f95f6d4352bb4176f397b9320ea8e951565b4ee994319c9aedd6cf (the Monday gold's dist).
- sl-lmv.ts (FROZEN): 912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab.
- trade-dedup.ts (FROZEN): 33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4.

---

# PART 22 — THE FINAL AUDIT VERDICT (the zero-trust conclusion)

## 22.1 THE FINDING SUMMARY
- 2 CRITICAL (the E2 day-band forward projection missing — the root of everything; the LSP/tsc bypass — the root harnesses unchecked).
- 2 HIGH (the Machine A fallback-masking → the identical-every-day slop; the Machine B 0-trades from the E2 starvation).
- 1 MEDIUM (the raw shape/direction mismatch — the BS/DOWN vs the SS/SHORT).
- 1 INFO (the checkpoint lock — DONE).
- The Machine A Monday gold: REAL (verified) but running on the fallback monkey-patch.
- The Machine A full-week 24/25: INVALID (the slop + no dedup — the operator's correct rejection).
- Machine B: NOT broken in its logic structures — starved by the E2-null (the fix revives it).

## 22.2 THE VERDICT
THE BUILD IS NOT SHIPPED IN ITS CURRENT FORM — the Monday gold is a real achievement (the ADM's measured geometry + the verified outcome) but it runs on the fallback compensation for a broken E2. THE MACHINE C BUILD (the E2 day-band fix + the merge) is the sanctioned path to the full-week golden-level run at ≥ 90% through the E1 → E2 → E3 pipeline. The operator's approval gates the C-waves.

## 22.3 THE OPERATOR'S DECISION POINTS (the pending gates)
1. THE C-1 WAVE (the E2 day-band fix) — the operator's "obviously E2 needs to be fixed at the source" — APPROVED by statement.
2. THE C-2/C-3 WAVES (the Machine C merge + the full-week run) — the operator's "merge plan for a machine C that we will test" — the plan is this spec; the operator's go.
3. MACHINE B's FATE — "i will decide later my instinct is retired but i will need full context + data" — the PART 10.1 matrix + the PART 4.3/4.4 data is delivered.
4. THE 90% TARGET — the C-4 acceptance.

---

# PART 23 — THE FINAL WORDS

THE WEEK OF BEING STUCK ended with a REAL achievement — the Monday gold (5/5 + 5/5 outcome, locked immutable). But the full-week test exposed the truth the operator suspected: the gold ran on a monkey patch (the fallbacks compensating for the null E2), and the full-week output is the exact slop class the operator banned.

THE E2-NULL is the shared root — the day-band forward projection missing (the dayOpenSpot never advances) — and the fix is surgical and measured: the forward projected day-open (the prior close + the shape travel — the design's own :1539-1540 contract).

THE MACHINE C merge then unifies the two diverged machines: Machine B's correct logic structures (the E2-CORE consumption, the cascade, the dedup, the fill sim, the storyline) + Machine A's ADM (the measured anchors that hit the golden trades) → ONE sanctioned E1 → E2 → E3 pipeline.

THE ACCEPTANCE: the full-week golden-level run at ≥ 90% through the sanctioned pipeline — no degenerate garbage, no monkey-patch bullshit, no identical-every-day slop — the machine's trades WIN where the operator's would have won, EVERY day of the week, FORWARD-MAPPED from the E2 designations.

THE NEXT AGENT: build Machine C. Fix the E2 at the source. Merge the proven bits. Run the full week. Hit the 90%. Then the operator sees the REAL golden week — the sanctioned pipeline's output, not the fallback's luck.
