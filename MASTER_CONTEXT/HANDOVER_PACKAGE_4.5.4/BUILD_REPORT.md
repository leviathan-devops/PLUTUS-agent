# THE BUILD REPORT — THE REASONING CHAIN SYSTEM (WAVE BY WAVE)

**Date:** 2026-08-07 · **Status:** THE HONEST RECORD — what was built, what is functional, what is broken
**Authority:** `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md` (2,051 lines — the architecture canon) + `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` (the six lexicons)
**Related:** the wave audits at `.trident/wave-audit/wave-w4-w5.md` + the prior wave audits (wave1-temporal through wave5-g2-parallel)

---

## PART 1 — WHAT WAS BUILT (THE WAVE-BY-WAVE RECORD)

### THE ARCHITECTURE (the macro — see the MACRO_ARCHITECTURE.md for the full detail)

The reasoning chain = the 11-token forward-reasoning engine BETWEEN E2 (the shape chain) and E3 (the trade setups). It reads the E1 zone map (the pressure mechanics) + the E2 storyline (the shape chain), runs the 11-token sequence, and emits TradeProjections (E/SL/TP as checkable numbers). The operator's law: *"There needs to be a proper agent-in-the-loop reasoning chain to validate and refine/retry E2 before E3, and then also the same on E3 itself to forward map the trades that come from E2 + validate the trades themselves."*

### WAVE 0 — THE L2 SPEC + THE CANON (SHIPPED)

**The deliverable:** `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md` (2,051 lines) — the architecture canon — manually authored at DP L2 quality with the session's exact diagrams. The operator's six corrections (C1-C6) encoded as the law:
- **C1 — the parallel tokens:** tokens 8/10 run in PARALLEL (the operator: "8, 9, and 10 can all run async in parallel these do not need to be sequential. 11 can come after these are done and assembled")
- **C2 — the shadow backend = the Trident-v7.3 checkpoint pattern** (the reference: the Trident v4.4.2 SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md, build SHA a7b886d3 — the frozen model, the secrets chain, the encoded errors never thrown)
- **C3 — the execution topology:** the micro level (the 3 pairs + N lanes) PARALLEL, the macro level (the DXY cascade) the ONLY sequential step
- **C4 — the timeout = a STALL DETECTOR** (the SSE idle window, never a wall clock)
- **C5 — the failure store organization** (the chain_failures table + the synthesis)
- **C6 — the deterministic steps are ms-scale** (tokens 1-7 = ms; tokens 8-11 = the ONLY clock)

### WAVE 1 — THE PARALLEL ENGINE (LANDED — FUNCTIONAL)

**The deliverable:** the C1 parallel pair in reasoning-chain.ts's lane loop + the C3 pair Promise.all in diag-reasoning-chain.ts's results object.

```ts
// reasoning-chain.ts — the lane loop (C1)
const chainedEntry = token9_chaining(priorTp);                          // sync, ms
const targets = continuationTargetsFor(input.model, zone, lane.direction);
const deterministicFp = deterministicForwardPosition(ctx, targets);    // the skeleton BEFORE the dispatch
const [fp, anchorsOut] = await Promise.all([                           // THE PARALLEL PAIR
  token8_forwardPosition(ctx),
  token10_anchorConstruction(ctx, deterministicFp, chainedEntry),
]);
const proj = assembleProjection(ctx, tokens17, fp, anchorsOut, chainedEntry);

// diag-reasoning-chain.ts — the results object (C3)
const chainRuns = await Promise.all([
  buildReasoningChain(buildChainInput('DXY')),
  buildReasoningChain(buildChainInput('EUR/USD')),
  buildReasoningChain(buildChainInput('GBP/USD')),
]);
```

**The status:** FUNCTIONAL — tsc 0, the deterministic projections byte-identical to the sequential baselines (the G10 parallel-equivalence holds for the deterministic path).

### WAVE 2 — THE STALL DETECTOR (LANDED — the SSE stream, the parse path BROKEN)

**The deliverable:** the SSE-stream idle detector in shadow-agent.ts's callModel — `stream: true`, the per-chunk idle timer reset, the abort on the 90s no-token window, the SHADOW_STALLED encoding, the content||reasoning accumulation.

**The status:** the STREAM MECHANISM is landed + tsc 0; **the PARSE PATH IS BROKEN** — the model's responses on the heavy ledger prompts fail the grounding contract (`SHADOW_SHAPE_VIOLATION: forwardPosition must be a number` / `entry/sl/tp must be numbers`) → the loop is HARD-KILLED (the operator's directive #2: these must WARN and continue, never hard-kill).

### WAVE 3 — THE SHADOW ALIGNMENT (LANDED — the secrets chain works, the model frozen)

**The deliverable:** `SHADOW_MODEL` FROZEN (no override — the fallback-creep cannot exist) + `resolveShadowApiKey()` (env → the project .env → ~/.config/opencode/.env → ~/.env → the embedded base64) + the encoded errors never thrown + the content||reasoning keep.

**The status:** the SECRETS CHAIN WORKS (the key resolves from ~/.bashrc via the env, 67 chars verified) — but the LLM still never fires (llm 0) because of the W2 parse failure.

### WAVE 4 — THE EXECUTION TOPOLOGY (VERIFIED — NO EDITS NEEDED)

**The deliverable:** the C3 step-2 topology verification — the DXY cascade layers ON TOP as the macro refinement AFTER the pair-native parallel runs. The W1 landing already wired it; the wave verified:
- The micro-parallel (the pair Promise.all at diag-reasoning-chain.ts:159-163) ✅
- The macro authority (buildMacroAuthority at reasoning-chain.ts:1239-1264 — the EU = DXY inverted, the GU = EU kept) ✅
- **The GU Monday R:SHORT FLIPPED to the macro LONG** — the divergence recorded (14 MACRO_DIVERGENCE rows in the store), never suppressed, the macro wins ✅
- The forced-null complement proof (probe-c3-complement.ts — the mirror ACTIVE with every GU zone excluded, the D50 held — the LONG anchored the DEMAND; the forced-null entry E 1.33353 = Δ2.3p of the golden 1.33330) ✅

**The status:** FUNCTIONAL — the topology is correct. The wave audit: CORRECT.

### WAVE 5 — THE PHANTOM-BoM EXEMPTION (IMPLEMENTED — FUNCTIONAL)

**The deliverable:** the surgical edit at src/brains/shape-brain.ts — the virgin-MoM blanket death rule gains the exemption lane for the type-2 virgin MoM (the phantom-BoM fortress):
- `isPhantomBoMFortress` (shape-brain.ts:1090-1101) — the adapter consulting the SAME `phantomBoMExemption` the chain uses (reasoning-chain.ts:428) — zero drift by construction
- The death-rule decision (shape-brain.ts:1149-1163) — the exemption checked BEFORE the REJECT; the type-1 virgin MoM STILL dies (the conservative default — a 3-of-4 NOT exempted)
- `evaluateAllMoMZones` gains the pip param + the fortressZones return field
- The zfpTransitions gains the phantomBomFortress scenario

**The status:** FUNCTIONAL — the fixture EUR/USD|1H|1782990000000|1.14004 (the [1.14145-1.14000] demand) → PHANTOM_BOM (EXEMPTED); the type-1 → DEATH (177 death zones + 1 fortress); the EU LONG Δ0.8p HELD in my re-run (the G1 gate). The wave audit: CORRECT.

### WAVE 6 — THE GOLDEN GATE (NOT BUILT)

**The deliverable:** diag-reasoning-chain-golden.ts — the G1-G10 acceptance gate. **NOT BUILT** — the wave-dispatcher's spawn failed (no agents were actually launched); the W6 dispatch is PENDING.

---

## PART 2 — WHAT IS ACTUALLY FUNCTIONAL (the verified evidence)

| Item | Status | The evidence |
|---|---|---|
| The L2 spec (the canon) | FUNCTIONAL | 2,051 lines, the operator's C1-C6 corrections |
| The parallel engine (C1/C3) | FUNCTIONAL | tsc 0, the deterministic projections match the sequential baselines |
| The stall detector's STREAM | FUNCTIONAL | the SSE stream + the idle timer landed, tsc 0 |
| The secrets chain | FUNCTIONAL | the key resolves (67 chars verified) |
| The topology (C3 step 2) | FUNCTIONAL | the GU macro flip + the D50 complement proof (the wave audit: CORRECT) |
| The phantom-BoM exemption | FUNCTIONAL | the fixture → PHANTOM_BOM; the type-1 → DEATH; the EU LONG Δ0.8p held (the wave audit: CORRECT) |
| The deterministic chain core | FUNCTIONAL | tokens 1-7 = ms; the EU LONG 1.14102 emitted (the golden Δ0.8p HIT) |
| The GU Monday direction | FUNCTIONAL | flipped to LONG + the MACRO_DIVERGENCE recorded |
| The EU/GU TP substrate | **BROKEN** | computeMirrorTP returns null on the mirror lanes → the forced-2.5-RRR fallback (the D37 class) |
| The shadow LLM path | **DEAD** | the grounding violations hard-kill the loop (the operator's directive #2) + the parse rejects the streaming output → llm 0 |

---

## PART 3 — THE HONEST STATE (the numbers)

- The Monday emissions: 6 projections (DXY SHORT 101.331 RRR 4.46 · DXY LONG 100.849 RRR 7.16 · EU SHORT 1.14512 RRR 2.50 · EU LONG 1.14102 RRR 2.50 · GU SHORT 1.33662 RRR 2.50 · GU LONG 1.33242 RRR 2.50)
- The golden hits: **1/5** (the EU LONG Δ0.8p — the ONLY convergence)
- The stats: deterministic 14 · llm 0 · refinements 2 · hardThrows 0
- The EU/GU RRRs: ALL 2.50 EXACTLY — the degenerate ratio-extension fallback (the operator's directive #3 — the RRR-as-target violation)
- The DXY RRRs: 4.46 / 7.16 — the structural TP resolves on the source lane
- The frozen pair: byte-identical · tsc: 0

---

## PART 3 — THE WAVE-4 DETAIL (THE EXECUTION TOPOLOGY — VERIFIED, NO EDITS)

### 3.1 The topology verification (the W4 agent's runs — re-verified by the orchestrator)

**The C3 step-2 topology:** the three pairs (DXY/EU/GU) run async via the pair Promise.all (the W1 landing at diag-reasoning-chain.ts:159-163); the DXY cascade layers ON TOP as the macro refinement AFTER the pair-native parallel runs — the ≤35% divergence check (CASCADE_DIVERGENCE_VALIDATED = 0.35 at cascade-translation.ts:104 + the flag-only at report-v452.ts:1042-1045) — COMPLEMENTARY, never overwriting, never superseding.

**The macro authority (the code — reasoning-chain.ts:1239-1264):**

```ts
export function buildMacroAuthority(input: ReasoningChainInput): MacroAuthorityInput {
  // 1. EU-DXY 1:1 INVERTED MIRROR — the EU analysis exists 1:1 inverted on DXY:
  //    the same E1 zones, the same E2 chains, the same E3 setups — directions inverted.
  // 2. GU CASCADE — GU cascades from the EU: the same E1 zones + the same macro chain;
  //    the candles differ by the volatility. GU direction == EU direction.
  // 3. Every per-pair E1 classification and E2 projection is checked against (1)+(2).
  //    mismatch => macroConsistent=false + a divergence entry (context-bearing).
}
```

**The GU Monday R root (the operator's Q8 answer — the L2 spec PART 29):**

```
THE GU MONDAY R — THE ROOT CAUSE (the wave-A's trace)
1. The EU's openingConsolidatesWeek FIRED (the SWEEP_LOW@1.13245 → the SS override!)
   The GU's did NOT (the GU's storyline had SWEEP_HIGH@1.33846 — the wrong anatomy —
   the opening-consolidation signal never armed for the GU!)
2. The GU's standing classification read the 1.33389 OB supply at zfp=70
   (BROKEN, mit=4, pierced) → the ceilingZfp 70 > 45 → BS
3. The BS's contested zone = the VIRGIN demand rung → predictNextShapePressureAware → R
4. The R day's SUPPLY primary → R:SHORT
THE MECHANISM: the per-pair storyline anatomy — the GU swept a HIGH, the EU swept a LOW.
The operator's #1 level (1.33330) IS in the maps (the demand 1.33270, Δ6.0p) —
the DIRECTION is the derailment.
```

**The measured flip (the W4 agent's diag run — the macro authority):**

```
=== THE UNIFIED MACRO AUTHORITY (Monday) ===
  DXY    : SHORT (mirror EUR/USD inverted) — the DXY E2 chain Monday SHORT (the source)
  EUR/USD: LONG (mirror DXY inverted) — the DXY SHORT inverted (the mirror law)
  GBP/USD: LONG (mirror EUR/USD) — the EU LONG kept (the GU cascade law)

--- GBP/USD (macro LONG) ---
  SHORT E 1.33662 ... | zone GBP/USD|1H|...|1.33623 | E2 GBP/USD|Monday|R|SHORT
      [MACRO_DIVERGENCE] the unified macro authority wins the emission — record the divergence, never suppress it
  LONG  E 1.33242 SL 1.32963 TP 1.33939 RRR 2.50 | zone LMV|GBP/USD|1.33270 | shape-chain R day 1/5
  divergences (the macro wins; recorded, never suppressed):
    - GBP/USD Monday: E2-native SHORT (R) vs the unified macro LONG — the macro wins the emission; the divergence recorded, never suppressed
```

**The GU Monday R:SHORT FLIPPED to the macro LONG** — the emission exists at E 1.33242 anchored on the demand `LMV|GBP/USD|1.33270` (the operator's #1 level 1.33330 IS in the maps — the direction derailment fixed). The EU LONG **Δ0.8p HIT held** (`LONG 1.14110 -> Δ0.8p (HIT)`), `PHANTOM_BOM EXEMPT` on the fortress `[1.14145-1.14000]`.

### 3.2 The forced-null complement proof (the W4 exit criterion — probe-c3-complement.ts)

**The design:** run the GU Monday with EVERY GU E1/E2 zone EXCLUDED (the forced null — supplyZoneId/demandZoneId/deepDemandZoneId all null) and verify that the unified macro authority (the EU-kept mirror) is STILL ACTIVE: the MACRO lane emits the LONG projection anchored on a DEMAND-side zone (the D50 direction-appropriate consumption — never a supply). The pair-native lanes are the fallback (the cascade is COMPLEMENTARY — the mirror fills the void when the pair-native zones are absent). DETERMINISTIC (no shadow — the shadow omitted from the input): the proof is a mechanical property (WHICH zone the LONG mirror anchors), not an LLM behavior. The wall time is ms.

**The measured result:**

```
[PROOF] the GU macro authority = LONG (the EU-kept mirror — the cascade law: GU direction == EU direction).
=== THE FORCED-NULL GU (every GU zone EXCLUDED — the complement proof) ===
  LONG  E 1.33353 SL 1.33313 TP 1.33472 RRR 2.98 | zone LMV|GBP/USD|1.33410 (DEMAND) | D50 HELD
[PROOF RESULT] the mirror ACTIVE (a LONG emission with every GU zone excluded): true
[PROOF RESULT] the D50 direction-appropriate consumption (LONG -> DEMAND, never a supply): true
[PROOF RESULT] PASS — the complement holds: the macro mirror fills the pair-native void on the DEMAND side.
```

**PASS** — even with every GU zone nulled, the unified macro authority stays ACTIVE and anchors a DEMAND zone (never a supply). Notable: the forced-null entry **E 1.33353 = Δ2.3p from the operator's golden 1.33330 — within the 3p tolerance.**

### 3.3 The divergence record (the failure store)

```
TOTAL: 219 rows · MACRO_DIVERGENCE: 14 · GU (GBP/USD) Monday SHORT divergence rows: 14
Row 212 | GBP/USD | GBP/USD Monday SHORT | 2026-08-07 09:13:44  (recorded by the W4 run)
```

The law **records + never suppresses** — the E2-native SHORT emitted WITH the `[MACRO_DIVERGENCE]` warning AND the macro LONG emitted alongside (reasoning-chain.ts:1370-1381 pushes to `divergences[]` + `recordFailure({reason:'MACRO_DIVERGENCE'})`, then `projections.push` at :1382 unconditionally).

### 3.4 The W4 honest notes (the residuals tracked)

1. **The wall time EXCEEDS the G9 gate**: 9m14s vs the ≤5 min gate. This run made REAL shadow calls (`available: true`, key exported) at ~106s each — all of which **failed the grounding contract** (`SHADOW_SHAPE_VIOLATION: forwardPosition must be a number` / `entry/sl/tp must be numbers` — the model's effort:max output didn't parse on the heavy ledger prompts), so `llm 0` on every pair and the deterministic fallback produced the projections. The 9m14s is dominated by those slow failing calls. The G9 gate is a **W6/W2 concern** (the shadow alignment — the SHADOW_REWIRE_SPEC), not a W4 topology defect — the topology itself is correct (the projections match the W1 sequential baselines).
2. **The GU LONG entry Δ8.8p**: the emission direction is fixed (LONG), but the chained entry (Law 27 — the SHORT's TP 1.33242 chains into the LONG) is Δ8.8p from the golden 1.33330 → MISS at ≤3p. The **G3 acceptance** (direction === LONG + the divergence recorded + the macro wins) PASSES; the exact entry alignment is the **W6 golden gate's** job.
3. **The `[MACRO_DIVERGENCE]` on DXY's LONG and EU's SHORT** are the mechanical-floor warnings (`computeMechanicalFloor`, reasoning-chain.ts:944-952) for the SS days — the R-shape divergence LAW (reasoning-chain.ts:1370) fired only on the GU Monday R, as the spec requires.
4. **The E2-divergence GU 0.40 flag** (>0.35) is exactly the operator's *"no more than 35% divergence"* law — flag-only, the pair E2 stands, never suppressed.

### 3.5 The W4 wave audit verdict (the orchestrator's own verification)

**VERDICT: CORRECT** — the topology is verified (the W1 landing wired it; the orchestrator's own reads confirmed the pair Promise.all + the macro authority + the divergence law); the forced-null complement proof PASSED with the D50 held; the GU Monday macro flip verified; the frozen pair byte-identical; tsc 0. Recorded at `.trident/wave-audit/wave-w4-w5.md`.

---

## PART 4 — THE WAVE-5 DETAIL (THE PHANTOM-BoM EXEMPTION — IMPLEMENTED, AUDITED)

### 4.1 The surgical edit (the W5 agent's diff — audited hunk-by-hunk by the orchestrator)

| Location | BEFORE | AFTER |
|---|---|---|
| `src/brains/shape-brain.ts:42-54` (imports) | no W5 imports | + `phantomBoMExemption` + `OperativeZone` (reasoning-chain.ts), + `ChartModel`/`ZoneModel` types, + `PIP_VALUE` |
| `:980-1107` (new block) | — | + `zoneTimeframeFromId` + `dxyZoneToOperative` + `dxyZoneToZoneModel` + `shapeBrainAtrProxyPips` + `isPhantomBoMFortress` (the exemption lane) |
| `:1109` (`ZoneMechanicsDecision.action`) | `'LADDER_STEP' \| 'CONTINUATION_RETEST' \| 'TP_TARGET_ONLY' \| 'REJECT'` | + `'EXEMPT'` |
| `:1136-1166` (`evaluateMoMZoneMechanics`) | `isMoM && isVirgin → branch 4 REJECT` (blanket) | `isMoM && isVirgin → if isPhantomBoMFortress → branch 4 EXEMPT (the fortress survives); else branch 4 REJECT (the type-1 dies)` |
| `:1200-1232` (`evaluateAllMoMZones`) | signature `(zones)`, deathZones = `branch === 4` | signature `(zones, pip)`, deathZones = `branch === 4 && action === 'REJECT'`, + `fortressZones` return field |
| `:2494-2505` (`buildShapeChain`) | `evaluateAllMoMZones(zones)` | `evaluateAllMoMZones(zones, shapeBrainPip)` + `fortressZoneNote` |
| `:2505` (`currentContext`) | `${...}${deathZoneWarning}` | `${...}${deathZoneWarning}${fortressZoneNote}` |
| `:2590-2601` (`zfpTransitions`) | death scenario only | + `phantomBomFortress` scenario (action EXEMPT) |

### 4.2 The audit's WHY (the mechanism's correctness — the orchestrator's analysis)

**The mechanism — import the chain's own predicate, never a copy.** The all-4 predicate is `phantomBoMExemption` (reasoning-chain.ts:428) — the SAME function `findFortressDemand` uses to reproduce the EU LONG at Δ0.8p. Rather than re-implement a second copy (drift risk), shape-brain imports and calls it with an honest adapter. The doctrine: *"a phantom BoM zone... a MoM-disguised BoM... functions as a BoM zone"* — the type-2 virgin MoM is the fortress. Zero drift by construction: the E2-side designation cannot kill what the chain exempts.

**Why now.** The blanket rule rejected the operator's #2 demand [1.14145-1.14000] → the E1 picked the deep 1.13851 → Δ19.4p miss. The chain already fixed the pickup side; this edit aligns the E2 death-rule side. The semantics law: *"the rendered artifacts are the candles/zones... you must see what GENERATED the rendered artifact"* — the blanket death rule was the regex without the psychology; the exemption is the semantic intent.

**The architecture fit (E1→E2→E3).** The chain's `token1_zoneIdentification` exempts via `zone.phantom`; this edit makes the E2 brain's `evaluateMoMZoneMechanics` reach the same verdict *at the E2 boundary* (Lexicon 3 Phase A: "a phantom-BoM zone that the E2's virgin-MoM rule rejects → THROW at the E2 boundary — the death-rule exemption demand"). E3 now sees the fortress as a valid reaction point via the `phantomBomFortress` zfpTransitions entry. The E3-NEVER rule holds: every anchor still traces to the E1 zone + the E2 projection.

**The conservative default (the virgin-death-scope law).** *"the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and 1H type 1 virgin MoMs"* — the type-1 STILL dies. The all-4 requires ALL FOUR (the AND in `phantomBoMExemption`): a 3-of-4 is NOT exempted.

**The SMC ratio doctrine.** *"the OB's size is inherently a function of the move it precedes"* — the width gate is `widthPips >= 1.5 × atr1hPips` where the ATR proxy = 4 × min-zone-width / pip (the same formula as the chain's `proxyAtr1hPips`), never a fixed pip number. No golden level enters the pipeline (the golden = the measurement oracle only).

### 4.3 The verification outputs (the W5 agent's runs + the orchestrator's re-runs)

| Check | Result | Evidence |
|---|---|---|
| `bunx tsc --noEmit` | **exit 0** | `TSC_EXIT=0` |
| `sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts` | **912940832fac44bc / 33914c897e777540** | byte-identical (frozen pair untouched) |
| Fixture `EUR/USD\|1H\|1782990000000\|1.14004` | **PHANTOM_BOM (EXEMPTED)** | `FIXTURE ... : PHANTOM_BOM (EXEMPTED — the fortress SURVIVES)`; all-4 = `largeOb=true fakeout=true opposingBoM=true macroOrigin=true` (14.3p ≥ 1.8p gate, FRESH virgin, opposing supply BoM at 1.14140 pre-formation, center 1.140755 nesting in the 4H DEMAND [1.14130-1.13930]) |
| Normal type-1 virgin MoM | **DEATH (never over-fires)** | `TYPE-1: exempt=false — opposingBoMReaction=false` (the 3-of-4 fails); 177 death zones flagged, 1 fortress — the fortress is the ONLY exemption |
| Chain token-1 on the fixture | **PHANTOM_BOM + EXEMPT** | `token-1 verdict: classification=PHANTOM_BOM deathRuleVerdict=EXEMPT conf=0.63` |
| `bun diag-reasoning-chain.ts` (EU LONG) | **Δ0.8p HELD (the G1 gate — no regression)** | `EUR/USD: SHORT 1.14395 -> Δ11.7p (MISS) \| LONG 1.14110 -> Δ0.8p (HIT)`; token-1 ledger `PHANTOM_BOM EXEMPT on EUR/USD\|1H\|1782990000000\|1.14004`; entry 1.14102 (within 2p of 1.14110); anchors trace to the fortress zone |

**Regression-safety proof (mechanical):** the chain's `e2Days` input is built exclusively from `dayDecomposition` (`brainDaysForTranslation` + `snapshotToCascadedChain` read only `dayDecomposition`/`storylineBias`), and `buildDayDecomposition` takes `currentShape/zones/spot/chain/ltfZones/priorWeekStoryline` — never `momEvaluation`/`deathZones`/`currentContext`/`zfpTransitions`. The edits touch only the death-rule output surfaces, so the chain's input is byte-identical → the Δ0.8p held.

### 4.4 The W5 honest notes

1. **ATR proxy source difference:** the E2 brain has no `lqzMatrix`/ATR, so `shapeBrainAtrProxyPips` computes 4×min-zone-width/pip from the DXYZone map (verified = 1.20p, matching the chain's `proxyAtr1hPips` on the same fixture). This is the same SMC ratio formula on the same underlying rung data — no fitted constant.
2. **The `{ zones }` model view** is cast to `ChartModel` — the predicate provably reads `model.zones` only (reasoning-chain.ts:453/469), so the view is honest; no liquidity/narrative/ladder fields are fabricated.
3. **Full LLM-hooked diag timing:** the 30-50 min LLM path (tokens 8-11 at effort:max) exceeds a single command window; the deterministic core (which produces the EU LONG entry + the G1 measurement) completed in 120s with the same Δ0.8p. The `OPENCODE_API_KEY` from `~/.bashrc` was verified present (67 chars) for the live path.
4. **MACRO + forward-position items** (T2/T3 of the plan) are the W4 agent's territory (diag + reasoning-chain.ts) — verified read-only on the shape-brain side; `deterministicForwardPosition` uses `internalNearEdge` (zone-geometry-derived, never fixed pips) per the SMC doctrine.

### 4.5 The W5 wave audit verdict (the orchestrator's own verification)

**VERDICT: CORRECT** — the exemption lane exists at the RIGHT decision point (the `isMoM && isVirgin` branch — branch 4); the type-1 STILL gets REJECT (the conservative default); the type-2 gets EXEMPT; it consults the SAME `phantomBoMExemption` (reasoning-chain.ts:428 — grep-verified) — zero drift; tsc 0; the frozen pair byte-identical; **the orchestrator's OWN diag re-run confirmed the EU LONG Δ0.8p HELD** (the golden 1/5). Recorded at `.trident/wave-audit/wave-w4-w5.md`.

---

## PART 6 — THE COMPLETE DATA CONTRACTS (the full TypeScript interfaces — the fresh session's contract reference)

### 6.1 The TradeProjection (the chain's output contract — lives in reasoning-chain.ts)

```ts
export type PairKey = 'DXY' | 'EUR/USD' | 'GBP/USD';
export type TimeframeKey = '1H' | '4H' | '30m' | '15m';
export type Direction = 'LONG' | 'SHORT';
export type ProjectionSource = 'NATIVE' | 'CASCADE' | 'MIRROR';
export type TokenId =
  | 'zone-identification' | 'pressure-status' | 'liquidity'
  | 'break-validation' | 'strength-comparison' | 'reaction-count'
  | 'chain-progress' | 'forward-position' | 'chaining'
  | 'anchors' | 'validation';

export interface PricePoint { price: number; sourceRef: string; } // sourceRef = zone id or projection id

export interface TokenResult {
  token: TokenId;
  deterministic: boolean;      // tokens 1-7 true; 8-11 true (skeleton) w/ llmRefined flag
  llmRefined?: boolean;
  verdict: string;
  evidence: string[];          // file:line or token-set refs — never narration
  lexiconTraces?: LexiconTrace[];
}

export interface ChainContext {
  pair: PairKey;
  week: string;
  anchorMs: number;
  tokens: TokenResult[];       // the 11-token ledger, ordered
  macroDirection: Direction;
  macroConsistent: boolean;
  divergences: string[];
}

export interface PressureRead {
  side: 'BUY' | 'SELL';
  score: number;               // fused pos/(pos+neg+1)
  buyVotes: number; sellVotes: number;
  wickMassRatio: number;
}

export interface ProjectionAnchor {
  role: 'ENTRY' | 'SL' | 'TP';
  price: number;               // CHECKABLE
  e1ZoneId: string;            // traces to a specific E1 zone (E3-NEVER)
  e2ProjectionId: string;      // traces to a specific E2 projection (E3-NEVER)
  method: string;              // 'mirror-lmv' | 'mirror-lqz' | 'continuation-target' | ...
  rungId?: string;
  widthRatio?: number;         // SMC ratio — never a fixed pip number
}

export interface TradeProjection {
  pair: PairKey;
  direction: Direction;
  entry: number;  sl: number;  tp: number;  rrr: number;
  pressureRead: PressureRead;
  chainContext: ChainContext;
  confidence: number;          // 0.0-1.0
  anchors: ProjectionAnchor[]; // every anchor carries e1ZoneId + e2ProjectionId
  source: ProjectionSource;
  day: string;  session: string;  setupId: string;
}
```

### 6.2 The reasoning-chain input/output (the engine's contract)

```ts
export interface ReasoningChainInput {
  pair: PairKey;  week: string;  anchorMs: number;
  model: ChartModel;                        // the E1 model
  lmvTable: Array<Record<string, unknown>>;
  e2: { dxyChain?; euCoreChain?; guCoreChain?; euCascaded?; guCascaded? };
  dxySetups: unknown[];  cascade: { eu: unknown[]; gu: unknown[] };
  barsByTf: Record<TimeframeKey, OHLCBar[]>;
  macro: MacroAuthorityInput;
  lexicons?: LexiconBundle;                 // the six lexicons (the wiring target)
  shadow?: ShadowAgentClient;               // THE RETIRED PATH (D1) — the agent-in-session replaces it
  pip: number;  atr1hPips: number;
  days?: string[];
}

export interface ReasoningChainResult {
  projections: TradeProjection[];
  ledger: ChainContext;
  failures: ChainFailure[];
  stats: { deterministicTokens: number; llmTokens: number; refinements: number; hardThrows: number; };
}
```

### 6.3 The shadow-agent client contract (THE RETIRED PATH — the reference for the agent-in-session)

```ts
export interface ShadowAgentClient {
  projectForward(inp: ForwardProjectionInput): Promise<ForwardProjectionOutput>;
  anchor(inp: AnchorInput): Promise<AnchorOutput>;
  validateProjection(p: TradeProjection, ledger: ChainContext): Promise<ValidationOutput>;
  readonly provider: 'opencode-go-deepseek-v4-flash';
}

export interface ForwardProjectionInput {
  pair: PairKey;  tokenLedger: TokenResult[];
  operativeZone: { id: string; floor: number; ceiling: number; classification: 'BoM'|'MoM'|'PHANTOM_BOM' };
  candleGroups: TokenSet;
  continuationTargets: number[];      // KCE-Telescoping output — the CLOSED set
  macro: MacroAuthorityInput;
  widthRatio: number;
}

export interface ForwardProjectionOutput {
  forwardPosition: number;            // price "positioned forward of the zone toward the target"
  chosenTarget: number;               // one of continuationTargets (ratio-validated)
  positionVerdict: 'FORWARD' | 'NOT_FORWARD';
  reasonTrace: string[];
}

export interface AnchorInput {
  pair: PairKey;  direction: Direction;  operativeZone;  tokenLedger;
  e2ProjectionId: string;
  slCandidate: number | null;         // computeMirrorSL(...)
  tpCandidate: number | null;         // computeMirrorTP(...)
  atr1hPips: number;  widthRatio: number;
}

export interface AnchorOutput {
  entry: number;  sl: number;  tp: number;  rrr: number;
  anchors: ProjectionAnchor[];
}

export interface ValidationOutput {
  valid: boolean;
  warnings: RefinementWarning[];
  confidence: number;
}
```

### 6.4 The failure-store contract (the SQLite)

```ts
export interface FailureRecord {
  pipelineStage: string;  failureType: string;  pair: PairKey;  setupId: string;
  tokenFailures: RefinementWarning[];  ledger: ChainContext;  projection?: TradeProjection;
  nextSteps: string[];
}
export function recordFailure(r: FailureRecord): number;
export function failuresForWeek(week: string): FailureRecord[];
export function failureStats(): { total: number; byType: Record<string, number>; };

// THE SCHEMA (verified from the DB):
// CREATE TABLE IF NOT EXISTS chain_failures (
//   id         INTEGER PRIMARY KEY AUTOINCREMENT,
//   component  TEXT NOT NULL,   -- 'EUR/USD Monday LONG'  (the pair + day + direction)
//   reason     TEXT NOT NULL,   -- SHADOW_DEGRADE | MACRO_DIVERGENCE | REFINEMENT_EXHAUSTED | CONTRACT_VIOLATION
//   context    TEXT NOT NULL,   -- JSON: the op + the reason + the pair + the day
//   attempts   INTEGER NOT NULL,
//   timestamp  TEXT NOT NULL,   -- datetime('now')
//   week       TEXT NOT NULL,   -- '2026-07-06'
//   pair       TEXT NOT NULL    -- 'EUR/USD' | 'DXY' | 'GBP/USD'
// );
// CREATE INDEX idx_failures_week ON chain_failures(week);
// CREATE INDEX idx_failures_type ON chain_failures(reason);
```

### 6.5 The refinement-warning contract (the WARN semantics — the operator's D2)

```ts
export interface RefinementWarning {
  check: string;    // 'DIRECTION_ORDER' | 'MACRO_DIVERGENCE' | 'ANCHOR_TRACE' | 'SHADOW_INVENTED_ID' | 'GROUNDING_WARN'
  token: TokenId;
  sourceRef: string;   // file:line or token-set ref — evidence, never narration
  value: unknown;      // the offending value
  proposed: string;    // the correction, with the context
}
```

---

## PART 7 — THE COMPLETE ENGINE DETAIL (the 11-token execution — the fresh session's code reference)

### 7.1 The buildReasoningChain main entry (the complete pseudocode)

```
buildReasoningChain(input: ReasoningChainInput) → ReasoningChainResult

  THE SETUP
    projections = []        // the TradeProjection outputs
    failures = []           // the ChainFailure records
    divergences = []        // the macro-divergence records
    llmTokens = 0 · refinements = 0 · hardThrows = 0

  THE DAYS
    days = input.e2Days?.days ?? []
    dayKeys = input.days && input.days.length > 0 ? input.days : ['Monday']
    matched = days.filter(d → dayKeys.some(k → d.day.toLowerCase().startsWith(k.slice(0,3).toLowerCase())))
    processDays = matched.length > 0 ? matched : days

  THE PER-DAY LOOP
    for each e2Day in processDays:
      dayIndex = e2Day.dayIdx · dayKey = e2Day.day · shape = e2Day.shape
      dayDir = e2Day.direction · dayOpenSpot = e2Day.dayOpenSpot ?? model.spot

      THE ZONE RESOLUTION (the E1 consumption)
        supply = resolveOperativeZone(model, pair, e2Day.supplyZoneId)
        demand = resolveOperativeZone(model, pair, e2Day.demandZoneId)
        deepDemand = resolveOperativeZone(model, pair, e2Day.deepDemandZoneId)
        longDemand = findFortressDemand(model, dayOpenSpot, input)
                      ?? demand ?? deepDemand ?? nearestDemandBelow(model, dayOpenSpot)

      THE LANE CONSTRUCTION (the E2_NATIVE / MACRO / REACTION lanes)
        lanes = []
        if dayDir === 'SHORT' && supply: lanes.push({ SHORT, supply, 'E2_NATIVE' })
        if dayDir === 'LONG' && (demand ?? deepDemand): lanes.push({ LONG, demand ?? deepDemand, 'E2_NATIVE' })
        if macro.direction === 'SHORT' && supply: lanes.push({ SHORT, supply, 'MACRO' })
        if macro.direction === 'LONG' && longDemand: lanes.push({ LONG, longDemand, 'MACRO' })
        reactionDir = dayDir === 'SHORT' ? 'LONG' : 'SHORT'
        if reactionDir === 'LONG' && longDemand: lanes.push({ LONG, longDemand, 'REACTION' })
        if reactionDir === 'SHORT' && supply: lanes.push({ SHORT, supply, 'REACTION' })
        ordered = dedupeByDirection(lanes).sort(byLaneRank)   // E2_NATIVE 0 → MACRO 1 → REACTION 2

      THE PER-LANE LOOP (the C1-parallel structure)
        priorTp = undefined
        for each lane in ordered:
          zone = lane.zone
          tokens17 = runTokens1to7(buildTokenContext(input, e2Day, zone, lane.direction, priorTp, ...))
          ctx = buildTokenContext(input, e2Day, zone, lane.direction, priorTp, dayIndex, dayKey, shape, dayOpenSpot, tokens17)

          THE C1 PARALLEL PAIR (the canon — PART 2.4)
            chainedEntry = token9_chaining(priorTp)                      // SYNC — ms
            targets = continuationTargetsFor(input.model, zone, lane.direction)
            deterministicFp = deterministicForwardPosition(ctx, targets)
            [fp, anchorsOut] = await Promise.all([
              token8_forwardPosition(ctx),                               // the agent-in-session (D1) | the fallback
              token10_anchorConstruction(ctx, deterministicFp, chainedEntry),
            ])

          proj = assembleProjection(ctx, tokens17, fp, anchorsOut, chainedEntry)
          { projection, valid, hardThrow, warnings } = await runRefineRetry(proj, input, ctx)

          THE HARD-THROW DISPOSITION (data, never a crash)
            if hardThrow:
              hardThrows += 1
              failures.push({ REFINEMENT_EXHAUSTED, pair, setupId, warnings, projection, nextSteps })
              continue

          priorTp = projection.TP                                        // Law 27 — the lane chain
          llmTokens += count(llmRefined) · refinements += count(REFINED)

          THE DIVERGENCE LAW (the macro wins; recorded, never suppressed)
            if lane.lane === 'E2_NATIVE' && lane.direction !== macro.direction && shape === 'R':
              divergences.push(...) · recordFailure({ MACRO_DIVERGENCE, ... })

          projections.push(projection)

  THE LEDGER + THE RESULT
    ledger = { pair, week, anchorMs, tokens: projections.flatMap(p → p.tokenLedger),
               macroDirection, macroConsistent, divergences }
    return { projections, ledger, failures, stats }
```

### 7.2 The runTokens1to7 detail (the deterministic core — token by token)

```
runTokens1to7(ctx) → TokenResult[]

  TOKEN 1 — ZONE-IDENTIFICATION (with the phantom-BoM exemption)
    zone = ctx.operativeZone · classification = zone.classification
    if zone.classification === 'MoM' && zone.reactionCount === 0:
      if findFortressDemand(...)?.id === zone.id:  → classification = 'PHANTOM_BOM' (EXEMPT)
      else:                                        → deathVerdict = 'DEATH' (the type-1 stands)
    push({ token:'zone-identification', deterministic:true, verdict, evidence, confidence })

  TOKEN 2 — PRESSURE-STATUS
    side = zonePressureSide(zone) · score = lifecycleScore(zone)
    push({ token:'pressure-status', deterministic:true, verdict:`${side} ${lifecycle} score ${score} mitigations ${n}` })

  TOKEN 3 — LIQUIDITY
    rungsBelow/Above from the lmvTable + nearestRung
    push({ token:'liquidity', deterministic:true, verdict:`nested ${n} below ${b} above ${a} nearest ${id}` })

  TOKEN 4 — BREAK-VALIDATION
    breakVerdict = validateBreak(zone, bars ≤ anchorMs)   // BROKEN / UNBROKEN wick-reclaim / UNBROKEN virgin
    push({ token:'break-validation', deterministic:true, verdict:breakVerdict })

  TOKEN 5 — STRENGTH-COMPARISON
    buyImpulse/sellImpulse over the 3-day window (the recency law)
    push({ token:'strength-comparison', deterministic:true, verdict:`${stronger} delta ${d} impulse ${i}` })

  TOKEN 6 — REACTION-COUNT
    push({ token:'reaction-count', deterministic:true, verdict:`mitigations ${count}`,
           evidence:[`the 'third mitigation' doctrine: ${count >= 3 ? 'ACTIVE' : 'not yet'}`] })

  TOKEN 7 — CHAIN-PROGRESS
    push({ token:'chain-progress', deterministic:true, verdict:`${shape} day ${dayIndex}/5`,
           evidence:[`chain direction ${dir}`, `days remaining ${5-dayIndex}`] })
```

### 7.3 The deterministicAnchors detail (the skeleton — the entry/SL/TP fallback chain)

```
deterministicAnchors(ctx, fp, chainedEntry) → AnchorOutput
  THE ENTRY — the chained TP (Law 27) or the zone's internal near edge
    if chainedEntry > 0: entry = chainedEntry (method 'chained (TP-of-N = entry-of-N+1 — Law 27)')
    else: entry = internalNearEdge(zone, lmvTable, side) (method 'zone-internal-near-edge')
  THE SL — the mirror ladder walk (computeMirrorSL), else the zone far edge + the Law-7 buffer
    slRes = computeMirrorSL(entry, anchorZone, direction, ladder, pair, pip, atr1hPips)
    if slRes: sl = slRes.sl (method slRes.method)
    else: sl = direction === 'LONG' ? zone.floor - buffer*pip : zone.ceiling + buffer*pip
          (bufferPips = max(3, 0.5 * atr1hPips)) (method 'zone-far-edge+law7-buffer')
  THE TP — the mirror Law-14 walk, else the continuation target, else THE RATIO-EXTENSION (SLOP-01)
    tpRes = computeMirrorTP(entry, sl, anchorZone, direction, ladder, pip, { passThroughWeakWalls: true })
    if tpRes: tp = tpRes.tp (method 'mirror-law14-walk')
    else if isRewardSide(fp.chosenTarget, entry, direction): tp = fp.chosenTarget (method 'continuation-target (KCE)')
    else: tp = entry ± RRR_GATE * risk (method 'ratio-extension (RRR gate)')   ← THE SLOP — REMOVE (STEP 3)
  THE ANCHORS (every anchor traces to the E1 zone + the E2 projection — the E3-NEVER rule)
    anchors = [ {ENTRY, entry, e1ZoneId: zone.id, e2ProjectionId, method, rungId},
                {SL, sl, ...}, {TP, tp, ...} ]
```

### 7.4 The runRefineRetry detail (the enforcement loop)

```
runRefineRetry(proj, input, ctx) → { projection, valid, hardThrow, warnings }
  p = proj · n = 0
  loop:
    floor = computeMechanicalFloor(p, input)          // THE MECHANICAL FLOOR — ALWAYS the authority
    ledger = chainContextFor(p, input)
    agentVerdict = REASON_VALIDATE(p, ledger, floor)  // THE AGENT-IN-SESSION (D1) | the deterministic floor
    v = { valid: floor.valid,
          warnings: [...floor.warnings, ...agentVerdict.llmOnlyWarnings],
          confidence: agentVerdict.confidence }
    if v.valid: return { projection: { ...p, validation: v }, valid: true, hardThrow: false, warnings }
    if n >= 3: recordFailure(p, v.warnings, 'REFINEMENT_EXHAUSTED'); return { ..., hardThrow: true }
    p = refine(p, v.warnings, input)                  // the WARN semantics — the loop continues
    n += 1 · p.chainContext.tokens = ledgerWithRefinement(p.chainContext, n)
```

---

## PART 8 — THE SHADOW BATTERY (the Trident-v7.3 zero-hint standard — the reference test scenarios)

| The scenario | What it proves | The expected result |
|---|---|---|
| THE NO-KEY | the secrets chain resolves nothing | the LOUD error BEFORE any transport — SHADOW_BRAIN_NO_KEY — the deterministic skeleton |
| THE 401 | the endpoint rejects the key | SHADOW_HTTP_401 → the fallback → the secrets chain re-checked |
| THE EMPTY | the model returns no content | SHADOW_EMPTY → the fallback + the raw response shape recorded |
| THE PARTIAL-KEEP | stopReason 'length' with partial content | the partial content KEPT (never discarded) |
| THE STALL | the stream goes silent | the idle window → SHADOW_STALLED → the fallback |
| THE INVENTED-ID | the model fabricates a zone id | the grounding contract → a refinement warning → retry → after 3 → the hard-throw |
| THE COHERENCE | 2 sequential runs in one session | the second references the first (the memory hydrates) |
| THE DETERMINISM | the same bars + no shadow | the byte-identical ledger ×2 |

**THE REWIRE NOTE (the operator's D1):** the shadow battery's scenarios convert to the agent-in-session's verification — the agent's reasoning outputs validated against the same contracts (the numeric shapes, the direction order, the target-set membership, the invented-id ban). The grounding violations WARN + continue (the operator's D2).

---

## PART 9 — THE G1-G10 ACCEPTANCE IN FULL (the golden gate's assertion contract)

### 9.1 The Monday golden targets (the ONLY build target — the operator)

> "NOW WE ARE GOING TO DO THIS FUCKING ONE DAY AT A TIME THE ONLY TARGET TO BUILD IS NOW MONDAY'S FUCKING TRADES AND NOTHING ELSE"

| The pair | The direction | The golden entry | The SL | The TP | The shape | The source trade |
|---|---|---|---|---|---|---|
| DXY | LONG | 100.945 | 100.905 | 101.115 | SS | the golden #1 |
| DXY | SHORT | 101.140 | 101.200 | 100.845 | BS | the golden #2 |
| EUR/USD | SHORT | 1.14395 | 1.14485 | 1.14110 | SS Swing Scalp | the operator's EU #1 |
| EUR/USD | LONG | 1.14110 | 1.13990 | 1.14460 | WL Whiplash | the operator's EU #2 |
| GBP/USD | LONG | 1.33330 | 1.33250 | 1.33965 | WL Whiplash | the operator's GU #1 |

### 9.2 The G-gate table (the per-gate assertion contract)

| G# | The golden | The pass condition | The current measured state |
|---|---|---|---|
| G1 | EU LONG emission (the phantom-BoM fortress) | ≥1 LONG projection whose token-1 verdict is PHANTOM_BOM on [1.14145-1.14000]; the entry within 2 pips of 1.14110; the anchors trace (E3-NEVER) | **PASS** — the EU LONG E 1.14102, Δ0.8p, PHANTOM_BOM EXEMPT, the anchors trace |
| G2 | Native first, cascade complementary | the Monday EU LONG exists in the NATIVE lane; any cascade projection is complementary (never overwrites, never duplicates) | PARTIAL — the native lane emits; the cascade's complement verified (the W4 forced-null proof) |
| G3 | GU Monday direction = LONG (the operator's WL) | the GBP/USD Monday projection's direction === 'LONG'; the R divergence recorded (MACRO_DIVERGENCE); the macro wins | **PASS** — the GU LONG emitted (E 1.33242), the divergence recorded (14 rows) |
| G4 | EU/DXY 1:1 inverted mirror | for the EU LONG, a DXY SHORT exists with matching ZONE ELEMENTS (never price levels); the linkedMirror resolves | PARTIAL — the macro authority's mirrorPair resolves; the full ZONE-ELEMENTS match pending |
| G5 | E3-NEVER compliance | 100% of projections pass assertProjectionContract; 0 anchor-less | PASS — every anchor carries e1ZoneId + e2ProjectionId (the deterministic anchors) |
| G6 | Hard-throw discipline | 0 REFINEMENT_EXHAUSTED on the golden week; the store's week row count = 0 hard-throws | PASS — hardThrows 0 (the stats line) |
| G7 | No regression of the correct trades | the 13 unique trades still emit correctly; the util findings show no fixed-width SL regression | PARTIAL — the EU LONG Δ0.8p held; the OTHER emissions are degenerate (the forced-2.5 RRR) |
| G8 | Temporal gate respected | no chain computation reads bars beyond ANCHOR_MS; the negative control (a later anchor) does not change the projections' anchors | PASS (the temporal gate landed in the v4.5.3 wave) |
| G9 | THE PERFORMANCE GATE | the Monday diag completes ≤ 5 min wall time; the stall detector never kills a working generation | **FAIL** — the last measured run: ~9m14s (the shadow calls at ~106s each failing the grounding → the fallback) — the W6/shadow-alignment concern |
| G10 | THE PARALLEL-EQUIVALENCE GATE | the parallel run's projections byte-identical to the sequential run's | PASS (the deterministic path) — the G10 holds for the deterministic core |

### 9.3 The gate exit protocol (every gate — the mechanical order)

1. `bunx tsc --noEmit` = 0 errors.
2. `bun build src/index.ts --outdir dist --target bun` = success.
3. The frozen pair: `sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts` → 91294083 / 33914c89 (byte-identical).
4. The report determinism: the Monday report ×2 → the identical sha256.
5. The gate's diag: `bun diag-<gate>.ts` → exit 0 with the assertion list.
6. The wall time: `time bun diag-reasoning-chain.ts` → ≤ 5 min (G9).
7. The checkpoint: `Checkpoints/v4.5.4_{WAVE}/` with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS.

---

## PART 10 — THE COMPLETE VERIFICATION PROTOCOL (the zero-trust battery in full)

### 10.1 The zero-trust battery (BEFORE any build — the state verification)

The subagent's report is a CLAIM; the exit codes are claims; the hashes are claims — YOUR runs are the evidence.

```
1. bunx tsc --noEmit                                  → exit 0
2. the report determinism: bun report-v452.ts --day=2026-07-06 ×2
   → sha256sum report_v452.md identical              → the same hash both runs
3. the frozen pair: sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts
   → 912940832fac44bc · 33914c897e777540             → byte-identical
4. the checkpoint anchors: sha256sum src/mdve/mirror.ts vs the checkpoint's copy
5. the gate probes: run EVERY probe the previous session left — PASS or the work is NOT done
6. the wave audits: .trident/wave-audit/*.md — read the verdicts + the spec-coverage maps
```

### 10.2 The chain diags

| Diag | What it verifies | The expected result |
|---|---|---|
| `bun diag-reasoning-chain.ts` | the 11-token ledgers per pair + the golden measurement + the failure synthesis | the EU LONG Δ0.8p HIT · the stats line · the wall time ≤ 5 min (G9) |
| `bun diag-reasoning-chain-golden.ts` (W6 — NOT BUILT) | the G1-G10 acceptance | exit 0 · `bun diag-reasoning-chain-golden.ts && echo PASS` |
| `bun diag-failure-store.ts` | the week's failures from the SQLite store | the failure count + the by-type breakdown + the synthesis |
| `bun diag-monday.ts` | the Monday harness (native + cascade + the day-end outcomes) | native 2/5 · cascade 0/3 · WIN 3/LOSS 3/NOT_TRIGGERED 5 |

### 10.3 The performance measurement (the C6 confirmation)

```
time bun diag-reasoning-chain.ts
  THE EXPECTED: the deterministic stages (the temporal gate, the E1 models, the E2 core,
  the cascade translation, the macro authority) = ms · the tokens 1-7 = ms
  THE LLM SLOTS (tokens 8-11) = the ONLY clock — with C1+C3, the wall time = the slowest
  pair's ~2-3 LLM slots ≈ 2-4 minutes · the G9 gate: ≤ 5 min
  THE MEASURED (the last run): ~9m14s — the shadow calls at ~106s each failing the
  grounding → the deterministic fallback — the W6/shadow-alignment concern
```

### 10.4 The container verification

Via trident-container-test (the ONLY sanctioned container path):
1. The fresh sandbox container (the project's own — never another agent's).
2. The SHA-verified deploy (the dist/index.js sha256 on BOTH plugin paths).
3. The TUI launches via tmux send-keys (the two-step Enter — never text+Enter in one keystroke).
4. The task prompt: run `bun diag-reasoning-chain-golden.ts` with the fixture mounted.
5. The monitoring: the tool calls / the stream / the artifacts (the 3-signal monitoring).
6. The evidence: the ContainerTestResult.json — the exit code + the ledger excerpts + the wall time + the pass/fail.
7. THE FOUR ELEMENTS: sha256 proof · stream evidence · behavioral observation · pass/fail determination.

### 10.5 The running report (the append-only law)

Every wave appends to `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` (the ONE running report — ENTRY-numbered sections). The failure syntheses appended under the dated `## FAILURE SYNTHESIS (reasoning-chain)` sections. NEVER overwrite, NEVER truncate.

---

## PART 11 — THE MEASURED RUNS (the complete evidence record — 2026-08-07)

### 11.1 The W5-verify run (the orchestrator's own — after the phantom-BoM exemption)

```
[TEMPORAL] RUN ANCHOR LOCKED: 2026-07-06T07:00:00.000Z (1783321200000)
[E2] DXY: SS | EU CORE: Neutral — consolidation phase | GU CORE: Bearish-Short continuation — support broken
=== THE UNIFIED MACRO AUTHORITY (Monday) ===
  DXY    : SHORT (mirror EUR/USD inverted) — the DXY E2 chain Monday SHORT (the source)
  EUR/USD: LONG (mirror DXY inverted) — the DXY SHORT inverted (the mirror law)
  GBP/USD: LONG (mirror EUR/USD) — the EU LONG kept (the GU cascade law)
--- DXY (macro SHORT) ---
  SHORT E 101.33100 SL 101.43900 TP 100.84900 RRR 4.46 (10.8R / 48.2R) conf 0.51 | VALID
  LONG  E 100.84900 SL 100.79900 TP 101.20700 RRR 7.16 (5.0R / 35.8R) conf 0.64 | VALID
  stats: deterministic 14 | llm 0 | refinements 0 | hardThrows 0
--- EUR/USD (macro LONG) ---
  SHORT E 1.14512 SL 1.14676 TP 1.14102 RRR 2.50 (16.4R / 41.0R) conf 0.47 | VALID
  LONG  E 1.14102 SL 1.13917 TP 1.14564 RRR 2.50 (18.5R / 46.2R) conf 0.48 | VALID
  [zone-identification] PHANTOM_BOM EXEMPT on EUR/USD|1H|1782990000000|1.14004
  stats: deterministic 14 | llm 0 | refinements 2 | hardThrows 0
--- GBP/USD (macro LONG) ---
  SHORT E 1.33662 SL 1.33830 TP 1.33242 RRR 2.50 (16.8R / 42.0R) conf 0.50 | VALID
  LONG  E 1.33242 SL 1.32963 TP 1.33939 RRR 2.50 (27.9R / 69.7R) conf 0.45 | VALID
  divergences: GBP/USD Monday: E2-native SHORT (R) vs the unified macro LONG — the macro wins
  stats: deterministic 14 | llm 0 | refinements 2 | hardThrows 0
=== THE GOLDEN MEASUREMENT (the Monday oracle — tolerance 3 pips) ===
  DXY    : LONG 100.94500 -> Δ9.6p (MISS) | SHORT 101.14000 -> Δ19.1p (MISS)
  EUR/USD: SHORT 1.14395 -> Δ11.7p (MISS) | LONG 1.14110 -> Δ0.8p (HIT)
  GBP/USD: LONG 1.33330 -> Δ8.8p (MISS)
  golden hits: 1/5 (<= 3 pip)
```

### 11.2 The endpoint probes (the LLM mechanics — the evidence for the D-01/D-02/D-05)

| The probe | The result | The reading |
|---|---|---|
| max_tokens 2048, short prompt | HTTP 200 · content length 0 · finish_reason length · reasoning_tokens 2048 | the starvation — the model spends ALL tokens on reasoning |
| max_tokens 8192, short prompt | HTTP 200 in 41.0s · content 186 chars · reasoning 14620 · finish_reason stop | the model self-terminates with a budget |
| max_tokens 128000, short prompt | HTTP 200 in 61.9s · content 259 chars · reasoning 5914 · finish_reason stop · usage {completion 6014, reasoning 5914} | the endpoint works — 128K is a ceiling, never a target |
| max_tokens 128000, the realistic ledger prompt | >200s (the probe aborted) | the heavy prompts legitimately take minutes at effort:max |

### 11.3 The failure-store evidence (the recorded rows)

```
THE FAILURE SYNTHESIS (week 2026-07-06) — the last full diag:
  failures recorded: 127+ | hard-throws: 0
  [DXY Monday SHORT] x18 — SHADOW_DEGRADE(18) — the shadow unavailable/parse-failed
  [EUR/USD Monday LONG] x16 — SHADOW_DEGRADE(16)
  [GBP/USD Monday SHORT] x21 — SHADOW_DEGRADE(14), MACRO_DIVERGENCE(7)
  THE MACRO_DIVERGENCE rows: 14 total (the GU Monday SHORT divergence)
  THE W4 run: TOTAL 219 rows · MACRO_DIVERGENCE 14 · the GU Monday SHORT rows 14
```

*END OF THE BUILD REPORT PART 9-11 — the G-gates + the verification + the measured runs. The functional core: the deterministic chain + the topology + the phantom-BoM exemption. The broken: the shadow LLM path (the SHADOW_REWIRE_SPEC) + the EU/GU TP substrate (the NEXT_STEPS STEP 3). The operator's honesty standard: the TRUE state recorded, never the claimed state. <!-- DOC-COMPLETE -->*
