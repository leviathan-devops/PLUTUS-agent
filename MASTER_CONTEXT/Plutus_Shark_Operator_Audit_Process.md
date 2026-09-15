# PLUTUS_SHARK_OPERATOR_AUDIT_PROCESS.md — THE DE FACTO TESTING + ANALYSIS PROCESS

**Version:** 1.0 · **Date:** 2026-08-06 · **Status:** THE NEW DE FACTO TESTING PROCESS — the operator-mandated standard.
**Origin:** the session where the operator said "NOW WE ARE GOING TO DO THIS FUCKING ONE DAY AT A TIME THE ONLY TARGET TO BUILD IS NOW MONDAY'S FUCKING TRADES AND NOTHING ELSE I HAVE TO COMPLETLEY FUCKING MICROMANAGE THIS NOW" — and the v4.5.3 four-wave ship + the Monday test + the operator's full rip-apart followed.
**Purpose:** THIS DOCUMENT IS THE REPLICATION RECIPE — 90% the CORRECT process (what worked, why, step-by-step) + 10% the before-vs-after (the slop-loop vs the micromanagement turn). Future sessions follow this process VERBATIM until the operator changes it.

---

# PART 0 — THE MACRO FIRST-PRINCIPLES ZOOM-OUT (what the process actually IS)

## 0.1 THE ONE-SENTENCE THESIS

The process = **build the smallest honest testable slice → measure it against the operator's REAL trades → let the operator rip it apart → trace EVERY failure to its mechanical root → convert the corrections into deterministic semantic intelligence (the lexicons) → document the process so it replicates.**

## 0.2 THE FIVE PILLARS (the process's irreducible structure)

1. **THE HONEST SLICE** — the smallest temporally-constrained pipeline run that produces a MEASURABLE result (the single-day test: Monday-only, all 3 pairs, the native lanes FIRST + the cascade SECOND).
2. **THE ZERO-TRUST BATTERY** — every claim re-verified mechanically by the orchestrator (tsc, the probes, the determinism, the frozen hashes, the report rows). The subagent's exit codes are claims; YOUR runs are the evidence.
3. **THE OPERATOR'S RIP-APART** — the operator attacks the results with first-principles questions ("the 2 that hit — did they hit TP?", "WHY did they miss?", "why is the GU shape different?"). The process does NOT defend; it traces.
4. **THE ROOT-CAUSE TRACE** — every failure traced to its mechanical anchor (the virgin-MoM death rule, the per-pair classification, the demand-pick sort, the missing forward-reasoning layer) with the file:line evidence.
5. **THE SEMANTIC INTELLIGENCE CONVERSION** — the corrections become the deterministic lexicons (the pressure lexicon, the phantom-BoM classification, the unified macro authority, the forward-reasoning chain) — NOT patches, NOT hardcoded levels — INTELLIGENCE.

## 0.3 THE OPERATOR'S LAW (the process serves this — VERBATIM)

- "IN A REAL FUCKING LIVE MARKET FORWARD DATA DOESNT EXIST... TODAY IS WHATEVER DATE WE SET WHEN RUNNING THE PIPELINE. THERE IS NO FUCKING FORWARD LOOKING. THE POINT IS TO MANUALLY RUN THE PIPELINE ONCE AT LONDON SESSION OPEN ON EACH FUCKING DAY WITH THE DATA AVAIALBLE AT THAT MOMENT AND FULLY RUN THE ENTIRE FUCKING PIPELINE FROM SCRATCH WITHOUT CHEATING AND FACTOR IN THE MACRO NARRATIVE FROM PRIOR DAYS TO MAKE THE PIPELINE MORE INFORMED AND INTELLIGENT AND PRECISE."
- "MONDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL MONDAY / TUESDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL TUESDAY / WEDNESDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL WEDNESDAY / ETC"
- "the rendered artifacts are the candles/zones/OHLC data ~ first principles macro context is the pressure mechanics, shape chain, etc — you must see what GENERATED the rendered artifact. the artifact itself is just the trigger."
- "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs"
- "THIS IS LITERALLY LIKE HALF THE ENTIRE FUCKING PROCESS THAT DRIVED E3 TRADE SETUPS. WHY IS THIS NOT THERE. HOW DO WE WIRE IT IN... THERE NEEDS TO BE A PROPER AGENT-IN-THE-LOOP-REASONING-CHAIN TO VALIDATED AND REFINE/RETRY E2 BEFORE E3 AND THEN ALSO THE SAME ON E3 ITSELF TO FORWARD MAP THE TRADES THAT COME FROM E2 + VALIDATE THE TRADES THEMSELVES"
- "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference"

---

# PART 1 — THE BEFORE vs AFTER (10% — the contrast that justifies the process)

## 1.1 THE BEFORE — THE SLOP-LOOP (the prior week)

- **The symptom:** the agent "looped" — repeated wave after wave of the same tuning (the E2-side proximity experiments ×4!), each measured + reverted, with NO progress on the golden metric's ROOT. The golden sat at 12/21 for an entire iteration.
- **The mechanism of the slop-loop:** the agent tuned the E2's proximity/weight surfaces (the OUTPUT layers) without tracing the E3 mirror's consumption (the INPUT path). The probes measured the emissions, not the mechanisms. The 15-iteration lesson: "the metric flat after 2-3 iterations → STOP tuning + TRACE the full path end-to-end" — the probe-first discipline was NOT the default.
- **The deeper failure:** the agent treated the machine's LABELS as truth (the SELL_SIDE vote = a supply!) without reading the underlying psychology (the virgin-MoM death rule's blanket regex!). The label-derailment (the "regex without the psychology") went undetected for the entire iteration.
- **The outcome:** no honest test, no operator visibility, no progress — the operator's trust exhausted.

## 1.2 THE AFTER — THE MICROMANAGEMENT TURN (the session this doc codifies)

- **The trigger:** the operator's "I'M GOING TO COMPLETLEY FUCKING MICROMANAGE THIS NOW" + "the ONLY TARGET TO BUILD IS NOW MONDAY'S FUCKING TRADES".
- **The turn:** the agent stopped wave-tuning and built the HONEST SLICE: the temporal engine (the locked run-anchor!) → the semantics (the 3-day vote window + the resting side!) → the designation (the day-constraint!) → the native lane + the cascade complement + the Monday harness → the broker layer. The four waves in parallel, each zero-trust audited.
- **The result:** the FIRST HONEST TEST — the Monday-only run with the real stats (native 2/5, cascade 0/3) + the operator's full rip-apart → the phantom-BoM concept → the six-lexicon design → the reasoning-chain architecture → THIS PROCESS.
- **The difference in one line:** the slop-loop measured and tuned; the micromanagement turn TRACED and DESIGNED.

---

# PART 2 — THE CORRECT PROCESS (90% — the replication recipe)

## 2.0 THE PROCESS MAP (the step sequence)

```
STEP 1 — THE STATE VERIFICATION (the zero-trust battery)
STEP 2 — THE HONEST SLICE BUILD (the single-day pipeline)
STEP 3 — THE MECHANICAL GATES (the probes + the determinism + the frozen)
STEP 4 — THE HONEST STATS (the hits/misses with the WHY)
STEP 5 — THE OPERATOR'S RIP-APART (the first-principles interrogation)
STEP 6 — THE ROOT-CAUSE TRACES (every failure → the mechanical anchor)
STEP 7 — THE DESIGN DECISIONS (the corrections → the intelligence)
STEP 8 — THE DOCUMENTATION + THE REPLICATION (this doc!)
```

## STEP 1 — THE STATE VERIFICATION (the zero-trust battery)

### 1.1 WHAT
Before ANY build: mechanically verify the workspace's claimed state. The subagent's report is a CLAIM; the exit codes are claims; the hashes are claims — YOUR runs are the evidence.

### 1.2 THE BATTERY (the exact commands)
1. `bunx tsc --noEmit` → exit 0.
2. The report determinism: `bun report-v452.ts --day=YYYY-MM-DD` twice → `sha256sum report_v452.md` identical.
3. The frozen pair: `sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts` → the recorded hashes (912940832fac44bc · 33914c897e777540).
4. The checkpoint anchors: `sha256sum src/mdve/mirror.ts` vs the checkpoint's copy.
5. The gate probes: run EVERY probe the previous session left — PASS or the work is NOT done.
6. The wave audits: `.trident/wave-audit/*.md` — read the verdicts + the spec-coverage maps.

### 1.3 THE LESSON (from the session)
The wave-1 audit exposed the legacy-hash discrepancy (00188332 vs the recorded 7fd527ba) — the A/B swap-test (the baseline copies vs the wave copies) revealed the ONE-cell IP-count delta — a PRE-EXISTING input-side issue, NOT the wave's. The lesson: the battery ALWAYS runs; a hash discrepancy is a TRACE, never an assumption.

## STEP 2 — THE HONEST SLICE BUILD (the single-day pipeline)

### 2.1 WHAT
The smallest temporally-constrained pipeline run that produces a MEASURABLE result: the Monday-only run with the data ≤ the Monday London-open anchor (07:00 UTC), on all 3 pairs, the native lanes FIRST + the cascade SECOND.

### 2.2 THE BUILD ORDER (the waves, in dependency order)
1. **THE TEMPORAL ENGINE** (the foundation): the locked run-anchor (`--day=YYYY-MM-DD` + `--time=HH:MM`, the 07:00 UTC default) + the physical bar gate (gateBars — every bar > the anchor dropped) + the defensive model-boundary gate. The anchor is LOCKED one-way (a different-value lock THROWS). The gate is the law: a future bar reaching any computation is a CRITICAL failure.
2. **THE SEMANTICS** (the recency + the structure): the LMV side vote = the 3-day window (VOTE_WINDOW_HOURS=72 — the operator's recency law: "the 6-week lookback is only to see WHERE the relevant S/D/L zones are. NOTHING ELSE"); the resting-side pass (a rung inside a DEMAND zone = DEMAND-typed, period — the operator's structure law: "buy side liquidity sits in demand zones").
3. **THE DESIGNATION** (the day-honesty): the day-constraint (the designation pool filtered to formationMs ≤ min(dayEndMs, runAnchorMs) — no post-day zones, EVER) + the day-local preference (the 72h-window zones first at equal zfp — the day-reuse broken).
4. **THE NATIVE LANE + THE CASCADE COMPLEMENT**: the DXY setup pipeline (generateSourceSetupsV45) run on the EU/GU DIRECTLY — no cascade — the operator's law: "RUN THE SAME FUCKING PIPELINE THAT DXY USES TO GENERATE ITS SETUPS ON EU + GU W/ NO CASCADE"; the mirror's pair-native structural fallback (the regex: BoM→BoM, Supply→Demand via the direction inversion) with the D50 preserved.
5. **THE BROKER LAYER**: the broker-corrected fetch (EUR→ICE, GU→OANDA per the golden doc's own headers!) + the provenance contract (the fixture's measured spans + the variance risk).

### 2.3 THE HARNESS (the measurement slice)
The diag-monday.ts: the Monday-anchored pipeline on all 3 charts INDIVIDUALLY FIRST (the native stats!) THEN the cascade (the cascade stats!). The golden arrays = the operator's REAL Monday trades (the MEASUREMENT oracle — never read by the pipeline!). The tolerance = 3 pips (THE only metric that counts). The sections:
```
=== THE MONDAY NATIVE LANES (the DXY pipeline on each pair, NO cascade) ===
  DXY    : LONG 100.945 -> ... | SHORT 101.140 -> ...
  EUR/USD: SHORT 1.14395 -> ... | LONG 1.14110 -> ...
  GBP/USD: LONG 1.33330 -> ...
  native hits: N/5 (<= 3 pip)
=== THE MONDAY CASCADE (the DXY setups cascaded on top) ===
  ...
=== THE SUMMARY (native vs cascade) ===
```

### 2.4 THE DISPATCH STANDARD (the subagent protocol)
- The DPL1-grade prompts: ≥ 125-150 non-blank lines (the firewall's floor!), the mission + the acceptance criteria, the reading order (the absolute paths!), the per-task WHAT/HOW/WHY/EXPECTED expansions, the constraints + the do-not-touch, the concrete verification commands, the return format.
- The parallel waves on DISJOINT files (the file-collision-free partition!).
- The explore agents EXTRACT the context (read-only); the ORCHESTRATOR designs (the lexicons' specs are the operator's/ orchestrator's job — never delegated!).

## STEP 3 — THE MECHANICAL GATES (the probes + the determinism + the frozen)

### 3.1 WHAT
Every wave ships ONLY with the mechanical evidence: the probes PASS on the ORCHESTRATOR's own runs (never the subagent's claims!), the determinism ×2, the frozen pair byte-identical.

### 3.2 THE PROBE DISCIPLINE (the session's probes)
1. **probe-temporal.ts** — the anti-bypass proof: the unlocked access THROWS, the same-value re-lock is a no-op, the different-value lock THROWS, the gateBars drops the future bars. All six assertions PASS.
2. **probe-vote-window.ts** — the 3-day vote composition: the pre-formation chop mechanically excluded (the SELL count 0 < 5!).
3. **probe-resting-side.ts** — the pocket's type flips SUPPLY → DEMAND (the structure law!).
4. **probe-designation.ts** — the Thursday-formed zone excluded from the Monday pool (the look-ahead dead!) + the GU day-reuse broken (1 → 2 distinct!).
5. **probe-monday-detail.ts** — the native emissions' exact entries + the E1/E2/E3 breakdown.

### 3.3 THE DETERMINISM LAW
Every run is deterministic: `bun report-v452.ts --day=2026-07-06` twice → the identical sha256. The [TEMPORAL] lock log line uses the fixed ISO formatting (never the locale-dependent toString).

## STEP 4 — THE HONEST STATS (the hits/misses with the WHY)

### 4.1 THE REPORT FORMAT (what the operator sees)
The honest numbers — the hits AND the misses with the per-miss mechanism. The session's Monday stats:
```
NATIVE: DXY SHORT 101.14 Δ0.3p HIT · EU SHORT 1.14395 Δ0.5p HIT · EU LONG 1.14110 Δ19.4p
        DXY LONG 100.945 NONE · GU LONG 1.33330 NONE — 2/5
CASCADE: EU LONG Δ11.4p · GU LONG Δ27.1p · EU SHORT NONE (no DXY LONG source) — 0/3
```
The honesty rules:
- A NONE = the honest absence (the setup didn't form by the anchor!) — NEVER a fabricated match.
- The entries are temporally honest (the gated data!); the fills fast-forward to the day-end (the operator's design: "once everything is generated you obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1 hour before market close to accurately see what E/SL/TP were actually hit").
- The hits are broken into the ENTRY vs the TP (the entry hit ≠ the trade won!).

## STEP 5 — THE OPERATOR'S RIP-APART (the first-principles interrogation)

### 5.1 WHAT
The operator attacks the results with first-principles questions. The process's rule: DO NOT DEFEND — TRACE. Every question is a work order.

### 5.2 THE SESSION'S RIP-APART (the questions + the answers that followed)
1. "the 2 that hit was it just entry hit or did they also hit TP?" → the DXY SHORT's WIN +2.81R with the exit at the TP (the day-end fast-forward!) · the EU SHORT's TP unverified (the level-only harness).
2. "diagnose all the misses. WHY did they miss." → the EU LONG's wrong demand pick · the GU LONG's direction inversion · the DXY LONG's anchor-time.
3. "what about golden trades? did any hit?" → 2/5 golden entries (the same 2 native hits).
4. "why is GU shape different from EU and DXY" → the per-pair classification divergence — THE UNIFIED MACRO AUTHORITY BUG.
5. "this is the first honest test we've gotten" → the temporal + semantics + day-honesty + the native lane all MECHANICALLY WORK — the honest failures are the map to the intelligence.
6. "the fill model's look-ahead" → the operator's correction: the temporal lock = the GENERATION only; the day-end fast-forward = the DESIGN. The record corrected.
7. "THE EU LONG MISS — the E1 demand pick" → the operator's phantom-BoM analysis: the type-2 virgin MoM = the fortress — the machine's blanket death rule rejected it.
8. "what is the root cause of the GU Monday direction inversion" → the per-pair classification without the macro authority.
9. "the anchor-time question — are you drunk?" → the forward-reasoning absence: the pipeline computes, it does not REASON. The operator: "the lack of forward looking reasoning and logic in this EXACT scenario right here - THIS is the root cause of literally ALL fucked trades."
10. "we need a proper PRESSURE LEXICON" → the six-lexicon design + the IntelligenceLexicon mapping + the reasoning chain.

### 5.3 THE OPERATOR'S CORRECTIONS (the ones that changed the architecture)
- **The fill model:** the temporal lock governs the generation; the outcome simulation fast-forwards to the day-end (NY close − 1h). The simBarsFor ungated = the design, not the bug.
- **The phantom BoM:** the type-2 virgin MoM (the large OB at the bottom of a mid-swing-recovery phase that temporarily breaks the swing structure before the move continues violently) = a BoM-functioning fortress — the virgin-MoM death rule must discriminate the types.
- **The unified macro authority:** the EU/DXY = the direct 1:1 INVERTED mirrors (the same E1 zones + E2 chains + E3 setups, the directions inverted!); the GU cascades from the EU (the E1 + the direction = the direct mirrors, the E2 = the same macro chain, the E3 = the same mechanics with the volatility-scaled candles — matching ZONE ELEMENTS, never price levels!).
- **The token-set semantics:** 1 candle = 1 token; a token alone = no data; a SET of tokens in a structured dataset = the relevant context (the TTE shapes!). The lexicons read the CANDLE GROUPS (the touches + the pre-touch storyline + the post-reaction move), never random single candles.
- **The shadow-enhanced reasoning:** the embedded shadow-agent reasoning chain (deepseek v4 flash via opencode go) — the forward projection from the lexicons' data.

## STEP 6 — THE ROOT-CAUSE TRACES (every failure → the mechanical anchor)

### 6.1 THE TRACE PROTOCOL
Every failure's trace ends at a file:line anchor + the mechanism. The session's traces:
1. **The EU LONG Δ19.4p** → the E1's demand pick = EUR/USD|1H|1782896400000|1.13851 (the deep demand!) — the operator's phantom BoM [1.14145-1.14000] rejected by the virgin-MoM death rule — `shape-brain.ts:2330-2336` ("Virgin MoM zones are DEATH ZONES — automatic REJECT, no exceptions") + `evaluateAllMoMZones` (:1057-1072) + `evaluateMoMZoneMechanics` (:999-1051).
2. **The GU LONG NONE** → the GU Monday classified R:SHORT (the per-pair `identifyCurrentShape` + `classifyShape`, :2303-2317) vs the operator's WL LONG — the per-pair divergence without the macro authority.
3. **The DXY LONG NONE** → the anchor-time: no LONG setup formed by the 07:00 UTC anchor — the forward-reasoning absence (the pipeline doesn't project the reaction from the visible E1/E2 context!).
4. **The GU shape divergence** → the per-pair classification (each pair's own zones + pressure + storyline) — the unified macro authority missing.
5. **The label conflation** → setup-gen.ts:88 ("SUPPLY/BUY_SIDE → SHORT") vs index.ts:406 (BUY_SIDE → DEMAND) — the side/type conflation.
6. **The side-vote derailments** (the #2's SELL_SIDE mislabel) → the formation-blind + look-ahead + behavior→structure promotion — FIXED by the 3-day window + the resting-side pass.

### 6.2 THE INSTRUMENTATION PROTOCOL
When the mechanism isn't visible: the env-guarded dump INSIDE the actual code (the PROBE_VOTE pattern!) — run → capture → REMOVE (the byte-identical revert verified by the sha256!). The session's instrumentation: the PROBE_VOTE in lmv.ts (the #2 pocket's actual 24-reaction vote — buy 8 / sell 16 → SELL_SIDE — the pre-formation 8 + the future 5!) + the PROBE_GU in the shape-brain (the per-pair designation candidates!).

## STEP 7 — THE DESIGN DECISIONS (the corrections → the intelligence)

### 7.1 THE SIX LEXICONS (the semantic intent layer — the operator's design authority)
1. **candle-pressure-lexicon** — the battle semantics from the CANDLE GROUPS (the touches + the pre-touch storyline + the post-reaction!): defend/reject/sweep/dwell — the sweep = the consumption event.
2. **candle-shape-lexicon** — the shape grammar from the MOVE's CANDLE SET (the token sets!): 1 candle = 1 token — the SET = the shape.
3. **zone-classification-lexicon** — the BoM/MoM identity + THE PHANTOM BoM (the type-2 virgin MoM = the fortress — the death-rule exemption!).
4. **zone-pressure-lexicon** — the lifecycle recurrence (VIRGIN→ACTIVE→DEPLETED→FORTRESS→BROKEN) + the "third mitigation" + the fortress ("4 prior mitigations... NOT get pierced").
5. **shape-chain-lexicon** — the fractal chains + the unified macro authority (the EU/DXY 1:1 inverted mirror! the GU's same-chain-different-candles!).
6. **obvious-trades-lexicon** — the forward-reasoning tokens (the operator's golden-doc analyses as the baseline!) — the missing layer.

### 7.2 THE REASONING CHAIN (the agent-in-the-loop)
The 11-token sequence: zone-identification → pressure-status → liquidity → break-validation → strength-comparison → reaction-count → chain-progress → forward-position → chaining → anchors → validation. The output = the TradeProjection (the E/SL/TP as CHECKABLE numbers!). The E2 validated/refined/retried BEFORE the E3; the E3 forward-maps the trades. The enforcement: the REFINE/RETRY (the warnings with the context!), the hard-throw ONLY after 3 failed refinements + the SQLite failure store + the end-of-pipeline failure synthesis.

### 7.3 THE DESIGN DELIVERABLES
- `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` — the six lexicons + the reasoning chain (the orchestrator's direct design!).
- The DPL1 L1 spec (the trident-deep-planning tool fed with the reasoning-chain context — 0-trust audited!).
- The OHLC-Intelligence-Lexicon boilerplate fork (the skeleton scaffolding template — forkable for other projects!).
- The MPSE full deep synthesis (the math-logic systems for the lexicons!).

## STEP 8 — THE DOCUMENTATION + THE REPLICATION (this doc!)

### 8.1 THE REPLICATION RECIPE (the future session's entry sequence)
1. Read THIS doc (the de facto process!).
2. Read the build report (`MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` — the ONE running report for the iteration — append-only!).
3. Run the zero-trust battery (STEP 1).
4. Re-run the Monday harness (the honest stats!).
5. Ask the operator the first-principles questions (STEP 5's posture — never defend, trace!).
6. Build the next honest slice.

### 8.2 THE ONE-RUNNING-REPORT LAW
The iteration keeps ONE append-only build report (the ENTRY-numbered sections!). Every advancement, every audit finding, every operator ruling APPENDED. Never overwrite, never truncate.

### 8.3 THE WAVE-AUDIT LAW
Every wave ships ONLY with the per-hunk verdicts + the 100% spec-coverage map at `.trident/wave-audit/<wave>.md`. "Files changed" is not verification. "Gates passed" is not an audit. The orchestrator RE-RUNS the battery; the subagent's claims are never trusted.

---

# PART 3 — THE SESSION CHRONICLE (the exact sequence this doc codifies)

## 3.1 THE WEEK OF SLOP (the before)
The 4.5.2's end: the golden 12/21, the E2-proximity tuning loops, the near-hits unmoved. The operator's trust exhausted.

## 3.2 THE MICROMANAGEMENT TURN (the after)
1. The operator: "NOW WE ARE GOING TO DO THIS FUCKING ONE DAY AT A TIME... I HAVE TO COMPLETLEY FUCKING MICROMANAGE THIS NOW".
2. The four-wave parallel ship (the temporal + the semantics + the designation + the native/cascade/broker) — each zero-trust audited.
3. The Monday harness — the first honest test: native 2/5, cascade 0/3.
4. The operator's rip-apart — the 10 questions + the corrections.
5. The root-cause traces — the virgin-MoM death rule, the per-pair divergence, the forward-reasoning absence.
6. The design turn — the six lexicons + the reasoning chain + the shadow-enhanced agent.
7. THIS DOC — the de facto process.

## 3.3 THE IMMEDIATE NEXT STEPS (the session's continuation)
1. The audit process doc (THIS doc — complete!).
2. The phantom-BoM questions answered (the operator's pending answers!).
3. The GU Monday R's full instrumentation (the root-cause context!).
4. The DPL1 L1 spec (the reasoning chain — fed NOW + the round-2 with the extra context!).
5. The OHLC-Intelligence-Lexicon boilerplate fork (the skeleton scaffolding!).
6. The MPSE full deep synthesis.
7. The harness's day-end fill simulation (the accurate full-trading-day simulation!).
8. The shadow-enhanced reasoning chain (deepseek v4 flash — the embedded shadow agent!).
9. The context docs update (the DECISION_CHAIN + the NEXT_STEPS + the COMPACTION_SURVIVAL).

---

# PART 4 — THE DOCTRINE REGISTER (the operator's rulings this process serves)

- The temporal law (the day-by-day, no forward-looking, TODAY = the run date).
- The recency law (the 3-day scope; the 6-week lookback = the WHERE only).
- The structure law (buy-side liquidity in demand; sell-side in supply).
- The semantics law (the labels describe the psychology, not the surface).
- The cascade law (the regex matching on top of the pair-native E1 anchors; the EU/DXY 1:1 inverted mirror; the GU same-chain-different-candles).
- The native-lane law (the DXY pipeline runs on the EU/GU directly).
- The broker law (ICE for the EU, OANDA for the GU).
- The phantom-BoM law (the type-2 virgin MoM = the fortress).
- The fractal law (the micro/macro chains both valid).
- The forward-reasoning law (the reasoning chain validates/refines/retries the E2 before the E3).
- The reasoning-token law (the golden-doc analyses = the baseline).
- The token-set law (1 candle = 1 token; the set = the context).
- The unified-macro-authority law (the divergence = the bug; the macro signal has authority).
- The shadow-agent law (the embedded shadow-enhanced reasoning chain — deepseek v4 flash).
- The enforcement law (the refine/retry; the hard-throw only after 3 refinements + the SQLite failure store + the end-of-pipeline synthesis).

---

# PART 5 — THE QUALITY BAR (the process's acceptance)

1. **The honest slice:** the smallest testable run with the real stats — never a theater run.
2. **The mechanical evidence:** the probes on the orchestrator's runs, the determinism ×2, the frozen hashes.
3. **The root-cause anchors:** every failure traced to the file:line + the mechanism.
4. **The operator's visibility:** the stats + the WHYs + the trace, presented for the rip-apart.
5. **The intelligence conversion:** every correction becomes a deterministic lexicon entry — never a patch.
6. **The replication:** this doc + the one-running-report + the wave audits — the future session resumes without re-derivation.

*END OF THE PLUTUS_SHARK_OPERATOR_AUDIT_PROCESS — the de facto testing + analysis process. The operator's micromanagement turn codified. The 90% = the process; the 10% = the contrast. Replicate verbatim until the operator changes it.*


---

# PART 6 — THE SESSION DATA REGISTER (the actual numbers + the actual outputs — the replication's ground truth)

## 6.1 THE FOUR-WAVE SHIP — THE PER-WAVE DELIVERABLES + THE AUDIT VERDICTS

### WAVE 1 — THE TEMPORAL ENGINE (SHIPPED — the audit: .trident/wave-audit/wave1-temporal.md)
- NEW src/mdve/temporal.ts — the locked run-anchor: lockRunAnchor (one-way, idempotent same-value, THROW on a different value), getRunAnchorMs (fail-fast), isRunAnchorLocked, gateBars (the total filter — inert until locked).
- The four runners (report-v452.ts + diag-golden-coverage.ts + diag-lmv-golden-fx.ts + diag-lmv-golden.ts): the --day=YYYY-MM-DD + --time=HH:MM parsing (the default 07:00 UTC — the London open), the lock-FIRST (before any bar read!), the gateBars wrap.
- src/mdve/index.ts: the DEFENSIVE re-gate at the buildChartModel boundary (belt+suspenders).
- probe-temporal.ts: the six assertions PASS (the unlocked access THROWS, the same-value re-lock no-op, the different-value lock THROWS, the future bars dropped).
- THE MEASURED: the Monday report rows = 07-06 ONLY · the E2-CORE Monday S: = EUR/USD|1H|1781856000000|1.14463 (the JUNE formation!) · the Thursday-formed zone EUR/USD|1H|1783576800000|1.14307 mechanically impossible.
- THE VERDICT: CORRECT — the temporal law is mechanical.

### WAVE 2 — THE SEMANTICS (SHIPPED — the audit: wave2-semantics.md)
- lmv.ts: the 3-day side-vote window (VOTE_WINDOW_HOURS=72 — the recency law!) — the confirmation gate stays on the full set (the WHERE); only the side vote is window-scoped (the WHAT).
- resting-side.ts (NEW): classifyRungsByStructure — the rung's type = the narrowest containing S/D zone (the structure law!) — the side/zfp/freshness untouched.
- index.ts: the pass wired after the zonesFinal merge.
- THE MEASURED: the #2 pocket [1.14080, 1.14120] — the pre-formation chop excluded (the window SELL 0 < the full-lookback SELL 5!) · the type SUPPLY → DEMAND (the structure-based flip!).
- THE VERDICT: CORRECT — the semantics are corrected.

### WAVE 3 — THE DESIGNATION (SHIPPED — the audit: wave3-designation.md)
- shape-brain.ts: the dayLimitMs = min(dayEndMs, runAnchorMs) — the post-day zones excluded (the belt+suspenders) + the day-window sort preference (the 72h day-local zones first at equal zfp).
- THE CALL-SITE DISCOVERY: the day string = 'Mon'..'Fri' (NOT 'YYYY-MM-DD'!) — the day's ms derived from the week anchor (priorWeekStoryline.priorAnchorMs + the day index) — the honest adaptation (a date-parse would throw on every legitimate call!).
- THE MEASURED: the Thursday zone excluded from the Monday pool (the look-ahead dead!) · the GU Mon/Tue/Thu S: ids 2 distinct (the 1.33878 reuse broken!).
- THE VERDICT: CORRECT — the day-honesty is mechanical.

### WAVE 4 — THE NATIVE LANE + THE CASCADE COMPLEMENT + THE MONDAY HARNESS (SHIPPED — the audit: wave4-native-cascade.md)
- diag-monday.ts (NEW): the Monday harness — the native lanes FIRST + the cascade SECOND + the summary.
- mirror.ts: resolveNativeAnchor (the pair-native structural regex: BoM→BoM, MoM→MoM, LQZ→LQZ, Supply→Demand via the direction inversion!) + the E2-gate re-resolution — the D50 preserved (mirror.ts:3366-3370).
- cascade-translation.ts: UNCHANGED (already the structural matrix — documented).
- THE HARNESS OUTPUT (the operator's requested stats — the exact print):
=== THE MONDAY NATIVE LANES (the DXY pipeline on each pair, NO cascade) ===
  DXY    : LONG 100.94500 -> NONE (MISSING) | SHORT 101.14000 -> Δ0.3p (HIT)  [2 unique native trades]
  EUR/USD: SHORT 1.14395 -> Δ0.5p (HIT) | LONG 1.14110 -> Δ19.4p (MISS)  [3 unique native trades]
  GBP/USD: LONG 1.33330 -> NONE (MISSING)  [1 unique native trades]
  native hits: 2/5 (<= 3 pip)
=== THE MONDAY CASCADE (the DXY setups cascaded on top) ===
  EUR/USD: SHORT 1.14395 -> NONE (MISSING) | LONG 1.14110 -> Δ11.4p (MISS)  [1 unique cascade trades]
  GBP/USD: LONG 1.33330 -> Δ27.1p (MISS)  [2 unique cascade trades]
  cascade hits: 0/3 (<= 3 pip)
=== THE COMPLEMENT PROOF ===
  forced-null primary search -> mirror: ACTIVE | anchor: LMV|GBP/USD|1.33280 (DEMAND side, direction LONG)
  the D50 direction-appropriate consumption HOLDS
- THE VERDICT: CORRECT — the mechanism works; the exact Monday levels are the next iteration.

### WAVE 5 — THE BROKER (SHIPPED — the audit: wave5-broker.md)
- scripts/fetch-bars.ts (NEW, 494 lines): the broker map (EUR→ICE, GU→OANDA, DXY→ICE, AUD→PROPOSED-gated!), the exchange-as-broker filter, the RawFeed output, the --dry-run/--out/--pairs/--broker args, the honest failure reporting.
- MASTER_CONTEXT/DATA_PROVENANCE.md (NEW, 222 lines): the broker requirement + the fixture's measured provenance (the EUR/USD 1H 1777568400000 → 1785211200000 · 4573 of 7817 bars post-anchor · the 30m/15m 100% post-week!) + the variance risk + the re-fetch procedure.
- THE HONEST STATE: tvdatafeed ABSENT from node_modules — the live fetch exits 1 with the [DEP] remedy (bun add tvdatafeed) — NO fake success.
- THE VERDICT: CORRECT — the machinery + the provenance + the honest [DEP] state.

## 6.2 THE MONDAY REPORT'S ROWS (the integrated state — the fill + the TP evidence)

| The row | The entry | The SL | The TP | The outcome |
|---|---|---|---|---|
| DXY SHORT 3371 | 101.14300 | 101.22900 | 100.90150 | **WIN +2.81R — the exit 100.90150 = the TP — FILLED Mon 06:00 ET** |
| DXY SHORT 3375 | 101.24000 | 101.33100 | 100.84900 | NOT_TRIGGERED |
| EUR/USD LONG 3800 | 1.1399600 | 1.1377900 | 1.1465000 | NOT_TRIGGERED (the cascade mirror!) |
| GBP/USD LONG 4408 | 1.3225000 | 1.3220600 | 1.3337987 | NOT_TRIGGERED |
| GBP/USD LONG 4435 | 1.3305900 | 1.3303782 | 1.3337987 | NOT_TRIGGERED |

THE FILL-MODEL LAW (the operator's correction): the temporal lock governs the GENERATION; the outcome simulation fast-forwards to the day-end (NY close − 1h) — the simBarsFor (report-v452.ts:370-372) reads the full day's bars BY DESIGN. The DXY SHORT's WIN +2.81R with the exit at the TP = a legitimate result.

## 6.3 THE E2-CORE MONDAY DESIGNATIONS (the E1 data — the operator's visibility)

[E2] DXY: SS | EU CORE: Neutral — consolidation phase | GU CORE: Bearish-Short continuation — support broken
[E2-CORE] EU days: Monday:SS:SHORT:EUR/USD|1H|1783076400000|1.14460(S:1.14460/D:1782896400000|1.13851/DD:-/KT:SUPPLY/open:1.14205)
[E2-CORE] GU days: Monday:R:SHORT:GBP/USD|1H|1783062000000|1.33623(S:1.33623/D:LMV|1.33270/DD:1781730000000|1.32772/KT:SUPPLY/open:1.33375)

THE E1 FINDINGS:
- The EU Monday's supply 1.14460 ≈ the operator's #1's supply [1.14460-1.14530] — the E1 aligning!
- The EU Monday's demand pick 1.13851 = the machine's own deep demand — NOT the operator's phantom BoM [1.14145-1.14000] — THE MISS.
- The GU Monday's demand rung 1.33270 ≈ the operator's #1's 1.33330 (Δ6p!) — the demand-side close — but the GU's shape R:SHORT means NO LONG emitted.

## 6.4 THE ROOT-CAUSE ANCHORS (the trace table — the file:line evidence)

| The failure | The mechanism | The anchor |
|---|---|---|
| The EU LONG Δ19.4p | the virgin-MoM blanket death rule rejected the phantom BoM | shape-brain.ts:2330-2336 + :999-1011 + :1057-1072 |
| The GU LONG NONE | the per-pair classification (R vs the operator's WL) | shape-brain.ts:2303-2317 |
| The DXY LONG NONE | the forward-reasoning absence (the anchor-time) | the pipeline + the shape-brain.ts:1127-1135 |
| The GU shape divergence | the per-pair identifyCurrentShape + classifyShape | shape-brain.ts:2303-2317 |
| The label conflation | setup-gen.ts:88 vs index.ts:406 | the side/type inversion |
| The #2's SELL_SIDE mislabel | the formation-blind + look-ahead + behavior→structure vote | lmv.ts:618-645 (FIXED: the 72h window + the resting-side!) |

## 6.5 THE INSTRUMENTATION EVIDENCE (the #2 pocket's actual vote — the PROBE_VOTE run)

[PROBE-VOTE] band=[1.14080, 1.14120] buy=8 sell=16 → SELL_SIDE
  the 16 SELL votes: 8 from the 06-29→07-01 pre-formation chop (the virgin/baby problem!)
                    5 from the 07-07/07-08 future bars (the WLS context — 3 days ahead!)
  the 8 BUY votes: the 07-06 Monday fromAbove reactions (the demand HOLDING the down-approach!)
  the 3-day window (07-02→07-06): the pre-formation + the future votes mechanically excluded
  → the window vote: buy 0 / sell 0 → the spot-relative fallback → BUY_SIDE (the pocket's center below the Monday spot!)

THE LESSON: the operator's virgin/baby framing — "the level before the demand existed (the 06-29→07-01 chop resistance) ≠ the level after (the demand's internal liquidity)" — the vote must never mix the formation-blind history with the current pressure mechanics.

---

# PART 7 — THE QUESTIONS-AND-ANSWERS REGISTER (the rip-apart's full transcript — the replication's template)

## 7.1 THE OPERATOR'S QUESTIONS + THE ANSWERS THAT FOLLOWED

Q1: "the 2 that hit was it just entry hit or did they also hit TP?"
A: the DXY SHORT — the entry hit (Δ0.3p) + the WIN +2.81R with the exit at the TP (the day-end fast-forward — legitimate!); the EU SHORT — the entry hit (Δ0.5p, the native level) — the TP's reach untested (the level-only harness at the time).

Q2: "diagnose all the misses. WHY did they miss."
A: the EU LONG — the wrong demand pick (1.13851 vs the phantom BoM!); the GU LONG — the direction inversion (R:SHORT vs the WL LONG!); the DXY LONG — the anchor-time (no LONG setup by the 07:00 anchor).

Q3: "what about golden trades? did any hit?"
A: 2/5 golden entries (the same 2 native hits — the DXY SHORT + the EU SHORT).

Q4: "why is GU shape different from EU and DXY... there should never be any divergence"
A: the per-pair classification (each pair's own zones + pressure + storyline!) — the unified macro authority missing — THE BUG. The operator's law: "they ARE allowed to have their own mechanics but unified macro signal has authority."

Q5: "this is the first honest test we've gotten"
A: the temporal + the semantics + the day-honesty + the native lane ALL mechanically work — the honest failures are the map to the intelligence.

Q6: "the fill model's look-ahead — temporal lock is for pipeline generation"
A: the operator's correction absorbed — the lock governs the generation; the day-end fast-forward = the design.

Q7: "the EU LONG — the phantom BoM — the two types of virgin MoM zones"
A: the type-1 (the small OB in the middle of an uninterrupted BS/WL move — the death zone!) vs the type-2 (the LARGE OB at the bottom of a mid-swing-recovery that temporarily breaks the swing structure — the phantom BoM — the fortress!) — the machine's blanket death rule rejected the #2's demand.

Q8: "what is the root cause of the GU Monday direction inversion"
A: the per-pair classification without the macro authority — the GU's own zone-interaction produced the R.

Q9: "the anchor-time question — are you drunk? the entire point is we predict the trade setups BEFORE THEY HAPPEN"
A: the forward-reasoning absence — the pipeline computes, it does not REASON. The operator: "THIS is the root cause of literally ALL fucked trades."

Q10: "we need a proper PRESSURE LEXICON"
A: the six-lexicon design + the IntelligenceLexicon mapping + the reasoning chain.

## 7.2 THE OPERATOR'S CORRECTION REGISTER (the rulings that changed the architecture)

1. The fill model = the day-end fast-forward (the generation gated; the outcome simulated to the close).
2. The phantom BoM = the type-2 virgin MoM = the fortress — the death rule must discriminate.
3. The unified macro authority = the EU/DXY 1:1 inverted mirror; the GU same-chain-different-candles (matching ZONE ELEMENTS, never price levels!).
4. The token-set semantics = 1 candle = 1 token; the SET = the context (the TTE shapes).
5. The candle groups = the touches + the pre-touch storyline + the post-reaction move.
6. The shadow-enhanced reasoning = the embedded shadow agent (deepseek v4 flash via opencode go).
7. The enforcement = the refine/retry; the hard-throw only after 3 refinements + the SQLite failure store + the end-of-pipeline synthesis.
8. The KCE-Telescoping = the deterministic pipeline for the macro-origin continuation (the V3.4_KRONOS_CANDLE_ENGINE_SPEC + the VISUAL_TELESCOPE_CHARTING_T2 + the Zone_Element_Mechanics).

---

# PART 8 — THE LEXICON DESIGN SUMMARY (the design authority — the operator's mapping)

## 8.1 THE SIX LEXICONS (the semantic intent layer — the IntelligenceLexicon machine form)

| The lexicon | The purpose | The inputs | The outputs | The E1/E2/E3 position |
|---|---|---|---|---|
| candle-pressure | WHO won each battle (the defend/reject/sweep/dwell from the CANDLE GROUPS!) | the OHLC + the widened band + the ATR + the approach + the run anchor | the touch kinds + the side votes + the consumption events | feeds the LMV side vote + the zone-pressure lifecycle |
| candle-shape | the shape grammar from the MOVE's CANDLE SET (the token sets!) | the anatomy tokens (bf/wick/progression) over the 3-day window | the shape code + the confidence | feeds the E2's classification |
| zone-classification | the BoM/MoM identity + THE PHANTOM BoM | the ObZone + the prior-move + the width gate + the macro origin | the classification + the PHANTOM_BOM/DEATH_ZONE flags | feeds the E1's typing + the E2's death-rule + the E3's demand-pick |
| zone-pressure | the lifecycle + the fortress + the mitigation math | the reactionEvents + the freshness + the absorption + the liquidity | the lifecycle state + the ZFP + the FORTRESS flag | feeds the E2's pressureScore + the E3's SL-relevance |
| shape-chain | the fractal chains + the unified macro authority | the per-day shapes + the contested pressure + the chain state | the chain + the authority override | feeds the E2's decomposition + the E3's projection |
| obvious-trades | the forward-reasoning tokens (the operator's analyses as the baseline!) | the E1 map + the E2 storyline + the chaining state + the price position | the TradeProjections (the E/SL/TP checkable!) | feeds the E3's forward projection — THE MISSING LAYER |

## 8.2 THE REASONING CHAIN (the 11-token sequence — the agent-in-the-loop)

1. zone-identification → 2. pressure-status → 3. liquidity → 4. break-validation → 5. strength-comparison → 6. reaction-count → 7. chain-progress → 8. forward-position → 9. chaining (the TP of N = the entry of N+1!) → 10. the anchor construction (the E/SL/TP!) → 11. the validation.

The output = the TradeProjection: { pair, day, shape, direction, entryZoneId, entryLqzId, E, SL, TP, RRR, pressureRead, chainContext, validation, confidence } — the E/SL/TP as CHECKABLE numbers traceable to a specific E1 zone + the E2 projection (the E3-NEVER rule!).

The shadow-enhanced agent: the embedded shadow reasoning chain (deepseek v4 flash via opencode go) — reads the lexicons' outputs + the E1/E2 data → runs the 11-token sequence → the TradeProjections → validates/refines/retries the E2 BEFORE the E3 → the E3 resolves → the cascade on top → the harness validates.

## 8.3 THE ENFORCEMENT LAW (the refine/retry architecture)

- The lexicons' classifications = the WARNINGS with the context on how to fix/refine — NEVER the hard throws.
- The hard-throw ONLY for the SPECIFIC MICRO COMPONENTS after 3 failed refinements.
- ALL locked/failure data stored in the internal SQLite db.
- At the pipeline's end: ALL failure data synthesized + delivered with the final output + the clear next steps on what to clean/fix on the next pipeline attempt to clear the blocks.
- The explicit instructions to restart the pipeline and address all failures based on the provided context.

---

# PART 9 — THE FORWARD-REASONING FORENSIC (the root of all fucked trades)

## 9.1 THE OPERATOR'S DIRECTIVE (verbatim)

"At 7:00 UTC the price is literally in the middle of the fucking short move heading down towards the Demand zone and it is ltierally obvious from basic first principles logic that a bullish reaction is going to happen here. This right here, the lack of forward looking reasoning and logic in this EXACT scenario right here - THIS is the root cause of literally ALL fucked trades. You have just demonstrated a complete absence of basic forward looking logical reasoning based on visible pre-existeing E1 zone/pressure mechanics data + E2 shape chain macro storyline literally ALL of this exists at 7:00 UTC."

## 9.2 WHY THE ABSENCE EXISTS (the forensic)

- The pipeline = the deterministic state machine: E1 (the zones!) → E2 (the shape + the chain!) → E3 (the entries!) — each stage COMPUTES its output from its inputs.
- The E2's chain projection EXISTS (predictNextShapePressureAware!) + the DayProjection exists (the TP-of-one = entry-of-next!) — BUT the TRADE-LEVEL forward reasoning does not: the chain "the price is halfway to the designated demand — the demand's pressure will react — the LONG from the internal liquidity" requires a REASONING step that fuses the E1 pressure + the E2 chain + the CURRENT PRICE POSITION — no component does this.
- The deepest cause: the phantom BoM was REJECTED (the virgin-MoM death rule!) — so even the SS-SHORT's TP anchored at the WRONG demand (1.13851!) — the reasoning was poisoned before it could fire. The E1's demand pick must select the RIGHT zone for the reasoning to be possible.

## 9.3 THE SOLUTION (the reasoning chain + the shadow agent)

- The deterministic core (the 70%!): the six lexicons make the E1/E2 read the psychology — the phantom BoM selected, the pressure states correct, the macro authority unified.
- The reasoning layer (the 30% — the LLM): the shadow-enhanced embedded agent (deepseek v4 flash via opencode go) — reads the enriched E1/E2 + runs the 11-token sequence → the forward projections.
- The validation/refine/retry: the projections validated against the E2's chain BEFORE the E3; the failures stored in the SQLite db; the end-of-pipeline synthesis delivered.
- The test: the full-headed-agent test later — for NOW the shadow agent.

---

# PART 10 — THE REPLICATION CHECKLIST (the future session's entry sequence — VERBATIM)

1. Read THIS doc (the de facto process!).
2. Read the one-running-report (MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md — append-only!).
3. Run the zero-trust battery: tsc → the probes → the determinism ×2 → the frozen hashes → the wave audits.
4. Re-run the Monday harness (diag-monday.ts) — the honest stats.
5. Present the stats + the WHYs to the operator — the rip-apart posture (never defend, trace!).
6. Trace every failure to the file:line anchor + the mechanism.
7. Convert the corrections into the lexicon entries (the intelligence!).
8. Document: the build report ENTRY + this doc's updates.
9. NEVER: tune without tracing · assume a label is truth · fabricate a match · defend a result · skip the battery.

---

# PART 11 — THE SMC ORDER-BLOCK + S/D ZONE AWARENESS (the operator's Q5 answer — the ratio-based width foundation)

## 11.1 THE ORDER-BLOCK DOCTRINE (the SMC master notes — the operator's reference)

- An order block = the LAST opposite-color candle before a drastic sharp move (the inefficiency!) — the zone = the candle's wick-to-wick range.
- A VALID order block: the presence of the inefficiency (the sharp momentum + the gap between the before/after candles!) + the break of structure + the ONE-TIME USE (unmitigated!).
- The OB's size is inherently a FUNCTION OF THE MOVE IT PRECEDES — a small OB before a small move; a large OB before a large move. There is NO fixed pip width — the width is the RATIO anchored to the move's context (the ATR! the swing scale! the TF!).
- The operator's doctrine (the #2 analysis): the type-2 phantom BoM = the LARGE OB at the bottom of a mid-swing-recovery phase — the "large" is relative to the recovery's context, not a fixed number.

## 11.2 THE S/D ZONE DOCTRINE (the supply/demand vs the OB distinction)

- The S/D zones = the ORIGIN-STRUCTURE zones (the BoM = the beginning of the move; the MoM = the middle of the move!) — the ORIGIN-CANDLE structure determines the identity.
- The BoM = the zone at the MOVE'S ORIGIN (the displacement's launch — the prior-move OPPOSITE/NONE!) — the demand's BoM = the launch of the bullish impulse.
- The MoM = the zone in the MOVE'S MIDDLE (the continuation — the prior-move SAME!) — the demand's MoM = a midpoint pause/reaction.
- The OB vs the S/D: the OB = the candle-level structure (the single origin candle!); the S/D zone = the structural identity (the origin-vs-middle!) — the OBCV's bw≥3.0/bf≥0.65 gates = the OB's candle anatomy; the prior-move classifier = the S/D identity.
- THE RATIO-BASED WIDTH (the operator's Q5 answer): the width floor = the ratio anchored to the relevant context (the ATR14! the move's scale! the TF!) — e.g., the phantom BoM's LARGE-OB = the width ≥ the ratio × the ATR of the recovery's context — NEVER a fixed pip number.

## 11.3 THE KCE-TELESCOPING (the operator's Q6 answer — the deterministic pipeline for the macro-origin continuation)

- The V3.4_KRONOS_CANDLE_ENGINE_SPEC: the Kronos candle engine's telescoping = the multi-TF deterministic structure — the zone's macro-origin lookup across the TF hierarchy.
- The VISUAL_TELESCOPE_CHARTING_T2: the visual telescope charting — the zone elements' parent/child relationships (the 4H origin → the 1H refinement → the 30m detail!).
- The Zone_Element_Mechanics: the element matching — the zones matched by their ELEMENT identity (the BoM-to-BoM, the Supply-to-Demand!), never by the price levels (the operator's law: "a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point").
- The phantom-BoM's macro-origin continuation = the telescoping lookup: the zone's containing 4H structure (the origin element!) + the swing-completion check (the move completes the full swing from the macro origin!) — the deterministic pipeline.

## 11.4 THE AWARENESS STATEMENT (the operator's Q5 answer's demand)

The S/D zones vs the OBs: the OB = the candle-level trigger (the regex!); the S/D zone = the structural identity (the semantic intent!); the phantom BoM = the S/D identity that the surface OB label misreads (the MoM label! the virgin status!) — the psychology behind the label. The width = the ratio anchored to the context (the ATR/move-scale/TF) — never a fixed number. The lexicons' predicates = the ratio-based + the context-anchored + the telescoping-verified — the MPSE deterministic forms.

---

# PART 12 — THE DOCTRINE REGISTER (the full quotes — the law the process serves)

1. THE TEMPORAL LAW: "IN A REAL FUCKING LIVE MARKET FORWARD DATA DOESNT EXIST... TODAY IS WHATEVER DATE WE SET WHEN RUNNING THE PIPELINE."
2. THE DAY-BY-DAY LAW: "MONDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL MONDAY / TUESDAY - ... / ETC"
3. THE RECENCY LAW: "DO NOT ever use 1 week old candles to make decision on E1/E2/E3 mechanics to today's trades. EVER."
4. THE STRUCTURE LAW: "Sell side liquidity sits in supply zones. buy side liquidity sits in demand zones."
5. THE SEMANTICS LAW: "the rendered artifacts are the candles/zones/OHLC data ~ first principles macro context is the pressure mechanics, shape chain, etc"
6. THE MAPPING LAW: "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs"
7. THE CASCADE LAW: "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP OF THE EU/GU PAIR NATIVE E1 ANCHORS. IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY."
8. THE NATIVE-LANE LAW: "RUN THE SAME FUCKING PIPELINE THAT DXY USES TO GENERATE ITS SETUPS ON EU + GU W/ NO CASCADE. IT SHOULD LITERALLY GENERATE THE GOLDEN SETUPS BY DEFAULT"
9. THE MIRROR LAW: "the EXACT analysis + trades I did on EU LITERALLY EXIST on DXY in the inverse direction verbatim 1:1... same zones, same shapes, same trade setups same time, practically even down to the individual candle with 10-15% variance"
10. THE GU-CASCADE LAW: "GU's E2 follows the same macro shape chain as EU... it will still react though to exactly the same E1 zones... this is way we are matching ZONE ELEMENTS not fucking price levels"
11. THE BROKER LAW: "The golden trades are all on the ICE broker. you need to use the data from the same broker so the candles match"
12. THE PHANTOM-BoM LAW: "a phantom BoM zone... a MoM-disguised BoM... functions as a BoM zone" — the type-2 virgin MoM.
13. THE FRACTAL LAW: "everything is fractal... BS/R/WL --> WLS --> SS (micro, 30m) and BS/R/WL --> SS (macro, 4H). Both are valid."
14. THE FORWARD-REASONING LAW: "THIS is the root cause of literally ALL fucked trades... the lack of forward looking reasoning and logic"
15. THE REASONING-TOKEN LAW: "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference"
16. THE TOKEN-SET LAW: "1 candle = 1 token. 1 token by itself does not provide any meaningful data. A set of tokens in a structured dataset = relevant context (TTE shapes)"
17. THE CANDLE-GROUP LAW: "the group of relevant candles near a zone are the candles that actually touch the zone and the context/storyline of the candles BEFORE they touch the zone + what is going to happen after they touch (post reaction move)"
18. THE UNIFIED-MACRO-AUTHORITY LAW: "they ARE allowed to have their own mechanics but unified macro signal has authority"
19. THE SHADOW-AGENT LAW: "lets have an embedded shadow agent or shadow-enhanced tool call right now so it is time efficient... deepseek v4 flash via opencode go as the model"
20. THE ENFORCEMENT LAW: "a refine/retry is correct. not a hard throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db... at the end of the pipeline all failure data needs to be synthesized and delivered with the final output + clear next steps"
21. THE ZONE-ELEMENT LAW: "we are matching ZONE ELEMENTS not fucking price levels. a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point"
22. THE TELESCOPING LAW: "Telescoping is the deterministic pipeline" (the KCE + the VISUAL_TELESCOPE + the Zone_Element_Mechanics).
23. THE FILL-MODEL LAW: "temporal lock is for pipeline generation. once everything is generated you obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1 hour before market close to accurately see what E/SL/TP were actually hit"

*END OF THE PLUTUS_SHARK_OPERATOR_AUDIT_PROCESS — the de facto testing + analysis process. The operator's micromanagement turn codified. Replicate verbatim until the operator changes it.*
