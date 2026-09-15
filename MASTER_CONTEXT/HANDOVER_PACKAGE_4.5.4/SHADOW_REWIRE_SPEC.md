# THE SHADOW REWIRE SPEC — THE SHADOW AGENT → THE PRIMARY HEADED AGENT (THE OPERATOR'S DIRECTIVE #1)

**Date:** 2026-08-07 · **Status:** THE REWIRE AUTHORITY — the shadow agent is DEAD; the actual headed agent in opencode does the reasoning/inference IN SESSION, visible
**The operator (verbatim):**
> "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop"

> "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers — these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."

> "i dont even understand what the fuck you are building right now and how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline."

---

## PART 1 — WHY THE SHADOW DIED (the honest record)

The shadow agent (the embedded LLM call via the opencode zen endpoint, deepseek v4 flash) NEVER successfully fired — the stats line `llm 0` on every run. The reasons (the DEBUG_LOG D-02):
1. The parse failure on the heavy ledger prompts (the streaming output didn't survive the parse → the non-numbers)
2. The grounding SHADOW_SHAPE_VIOLATION REJECT (a hard-kill of the loop — the operator's directive #2)

The operator's call: the shadow agent is DEAD. The replacement: the ACTUAL HEADED AGENT in opencode — the primary agent (THIS agent, in-session) does the reasoning/inference itself, visibly, so the operator can SEE everything. The chain becomes a STEP in the tool chain pipeline that the agent EXECUTES with its own reasoning, not a hidden LLM call.

## PART 2 — WHAT THE REWIRE REPLACES (the shadow infra inventory)

| The shadow infra | The file | The rewire disposition |
|---|---|---|
| The shadow-agent client (createShadowAgentClient + callModel + the SSE stream) | src/mdve/shadow-agent.ts | **RETIRED as the LLM executor** — the SSE stream + the stall detector + the secrets chain KEPT as the reference pattern (the Trident-v7.3 checkpoint 7.3), but the agent does the reasoning IN SESSION |
| The token 8 forward-position LLM hook | reasoning-chain.ts token8_forwardPosition | the agent's in-session reasoning REPLACES the shadow call — the chain's token 8 becomes the agent's forward-projection STEP |
| The token 10 anchor LLM hook | reasoning-chain.ts token10_anchorConstruction | the agent's in-session anchor construction REPLACES the shadow call |
| The token 11 validation LLM hook | reasoning-chain.ts runRefineRetry | the agent's in-session validation (the floor + the reasoning) REPLACES the shadow call |
| The failure store (recordShadowDegrade) | failure-store.ts | KEPT — the agent's reasoning + the failures logged to the SQLite store |
| The deterministic fallback | reasoning-chain.ts (deterministicForwardPosition + deterministicAnchors) | KEPT as the mechanical floor — the agent's reasoning refines it; the floor is ALWAYS the validity authority |
| The grounding contract | shadow-agent.ts (checkDirectionOrder + the numeric checks) | CONVERTED — the violations become a WARN (the refinement warning with the context), the loop CONTINUES (the operator's directive #2) |

## PART 3 — THE NEW ARCHITECTURE (the reasoning chain as a STEP in the tool chain pipeline)

```
THE TOOL CHAIN PIPELINE (the operator's mental model):
  STEP 1  plutus-pipeline-harvest      (the data — the bars + the options)
  STEP 2  plutus-pipeline-zones        (the E1 zone map — the pressure mechanics)
  STEP 3  plutus-pipeline-shapes       (the E2 shape chain — the storyline)
  STEP 4  plutus-pipeline-reasoning    (THE REASONING CHAIN — NEW — the agent-in-the-loop)
            ↓ the agent runs the 11-token sequence IN SESSION:
              tokens 1-7  the deterministic ledger (the machine computes — ms)
              token 8     the FORWARD-POSITION — the agent REASONS (visible):
                          "price is halfway to the demand — the reaction WILL happen"
              token 9     the chaining (Law 27 — the TP of N = the entry of N+1)
              token 10    the ANCHOR CONSTRUCTION — the agent REASONS (visible):
                          E/SL/TP as checkable numbers (the floor's candidates + the agent's refinement)
              token 11    the VALIDATION — the agent REASONS (visible):
                          the floor + the macro + the confluence → VALID or the refine/retry (≤3)
  STEP 5  plutus-pipeline-setups       (the E3 trade setups — the TradeProjections resolved)
  STEP 6  the report + the golden gate (the G1-G10 acceptance)
```

**THE KEY DIFFERENCE:** the reasoning is VISIBLE — the agent's analysis appears in the pipeline's stream (the operator can read the forward-position reasoning, the anchor reasoning, the validation reasoning), NOT hidden in an opaque LLM call. The chain's token ledger records the agent's verdicts + the evidence.

## PART 4 — THE GROUNDING VIOLATIONS BECOME A WARN (the operator's directive #2)

**THE OLD (the hard-kill — SLOP-02):** the SHADOW_SHAPE_VIOLATION checks REJECTED the response → the chain treated the shadow as failed → the deterministic fallback → the LLM path died.

**THE NEW (the warn — the operator's ruling):**

```
THE GROUNDING WARN (never a hard-kill):
  when the agent's/response's values fail a check (the direction order, the numeric shape,
  the target-set membership, the invented-id):
    1. RECORD the violation as a refinement warning WITH the context:
         { check: 'DIRECTION_ORDER' | 'ANCHOR_TRACE' | 'SHADOW_INVENTED_ID' | ...,
           token: 'validation' | 'anchors' | 'forward-position',
           sourceRef: the file:line or the token-set ref,
           value: the offending value,
           proposed: the correction with the context }
    2. LOG the warning to the failure store (the SQLite chain_failures — the WARN type).
    3. CONTINUE the loop — the warning is the refinement input: the next iteration
       re-runs the reasoning with the warning as the context (the refine/retry doctrine:
       "a rejected setup is not a dead setup... each rejection needs to also give context
       on WHY it was rejected and HOW to properly improve it").
    4. ONLY after 3 failed refinements → the hard-throw → the failure store (data, never a crash).
  THE LOOP NEVER DIES ON A NON-NUMBER — the non-number is a WARN + the refinement context.
```

## PART 5 — THE REWIRE STEPS (the fresh session's implementation)

1. **RETIRE the shadow-agent as the LLM executor** — the callModel + the client stay as the REFERENCE pattern (the SSE stream + the stall detector + the secrets chain — the Trident-v7.3 pattern documented), but the chain no longer calls it.
2. **CONVERT the token 8/10/11 hooks to the agent-in-session steps** — the chain exposes the reasoning contract (the ForwardProjectionInput/AnchorInput/ValidationInput shapes) as the pipeline STEP's interface; the AGENT (in-session) performs the reasoning, visible in the stream, and the chain records the verdicts to the ledger.
3. **CONVERT the grounding violations to the WARN** (PART 4) — the refinement-warning shape + the failure-store WARN type + the loop-continues semantics.
4. **Wire the reasoning chain as the pipeline STEP 4** (PART 3) — the tool chain pipeline gains the reasoning step between the shapes and the setups.
5. **The deterministic skeleton STAYS as the mechanical floor** — the agent's reasoning refines it; the floor is ALWAYS the validity authority; the fallback never fabricates.
6. **The EU/GU TP substrate fix (the D37 class)** — the NEXT_STEPS: the computeMirrorTP null → the forced-2.5-RRR fallback must be replaced by the E2-projected opposing zone's full-model resolution.

---

## PART 6 — THE COMPLETE CONVERSION PSEUDOCODE (the fresh session's implementation reference)

### 6.1 The token-8 conversion (the forward-position — the agent-in-session step)

```
THE OLD (the shadow call):
  token8_forwardPosition(ctx):
    fp = deterministicForwardPosition(ctx, targets)          // the skeleton
    sr = await ctx.input.shadow.projectForward({...})        // the LLM call (DEAD)
    if sr?.ok: return { ...sr.result, reasonTrace: [...] }
    return fp                                                // the fallback

THE NEW (the agent-in-session step):
  token8_forwardPosition(ctx) — the PIPELINE STEP 4's forward-position sub-step:
    fp = deterministicForwardPosition(ctx, targets)          // the mechanical floor (ms)
    agentVerdict = REASON_FORWARD(ctx, fp, targets)
      // THE AGENT (in-session, visible in the stream):
      //   reads the token ledger (1-7) + the operative zone + the continuation targets
      //   + the macro authority + the candle groups
      //   REASONS: "the price is at X, the demand is at Y, the reaction WILL happen"
      //   emits: { forwardPosition, chosenTarget, positionVerdict, reasonTrace }
      //   the reasoning APPEARS IN THE PIPELINE'S STREAM (the operator sees it)
    if agentVerdict is well-formed:                          // the WARN, not the kill
      return { ...agentVerdict, reasonTrace: [...fp.reasonTrace, ...agentVerdict.reasonTrace] }
    else:
      recordWarn(ctx, 'forward-position', agentVerdict)       // the failure store WARN row
      return fp                                              // the mechanical floor stands
```

### 6.2 The token-10 conversion (the anchor construction — the agent-in-session step)

```
THE OLD (the shadow call):
  token10_anchorConstruction(ctx, fp, chainedEntry):
    det = deterministicAnchors(ctx, fp, chainedEntry)         // the skeleton
    sr = await ctx.input.shadow.anchor({...})                // the LLM call (DEAD)
    if sr?.ok: return sr.result
    return det                                               // the fallback

THE NEW (the agent-in-session step):
  token10_anchorConstruction(ctx, fp, chainedEntry) — the PIPELINE STEP 4's anchor sub-step:
    det = deterministicAnchors(ctx, fp, chainedEntry)         // the mechanical floor (ms)
    agentVerdict = REASON_ANCHORS(ctx, fp, chainedEntry, det)
      // THE AGENT (in-session, visible):
      //   reads the ledger + the zone + the SL/TP candidates (computeMirrorSL/TP)
      //   REASONS: "Set E at the TP level of trade #1, SL 3 pips outside the far
      //            edge of the nested liquidity zone, TP at the near edge of the supply"
      //   emits: { entry, sl, tp, rrr, anchors[] } — each anchor tracing to an
      //          E1 zone id + an E2 projection id (the E3-NEVER rule)
    if agentVerdict is well-formed (the direction order + the numeric shape):
      return agentVerdict
    else:
      recordWarn(ctx, 'anchors', agentVerdict)                // the WARN row
      return det                                             // the mechanical floor stands
```

### 6.3 The token-11 conversion (the validation — the agent-in-session step)

```
THE OLD (the shadow call):
  runRefineRetry(proj, input, ctx):
    floor = computeMechanicalFloor(p, input)                  // the validity authority
    shadowV = await input.shadow.validateProjection(p, ledger)  // the LLM call (DEAD)
    v = { valid: floor.valid, warnings, confidence: shadowV?.confidence }
    if v.valid: accept
    if n >= 3: hard-throw (REFINEMENT_EXHAUSTED)
    p = refine(p, v.warnings, input)

THE NEW (the agent-in-session step):
  runRefineRetry(proj, input, ctx) — the PIPELINE STEP 4's validation sub-step:
    floor = computeMechanicalFloor(p, input)                  // ALWAYS the validity authority
    agentVerdict = REASON_VALIDATE(p, ledger, floor)
      // THE AGENT (in-session, visible):
      //   reads the assembled projection + the 11-token ledger + the macro
      //   REASONS: "all the macro storyline confluences align" (the operator's #2)
      //   emits: { valid, warnings[], confidence }
      //   the mechanical floor's verdict can NEVER be overridden by the agent's
      //   "valid" — the floor is the authority; the agent refines the confidence
      //   + the SHADOW_FLAG warnings only
    v = { valid: floor.valid,
          warnings: [...floor.warnings, ...agentVerdict.llmOnlyWarnings],
          confidence: agentVerdict.confidence }
    if v.valid: accept
    if n >= 3: hard-throw → the failure store (data, never a crash)
    p = refine(p, v.warnings, input)                          // the loop continues (the WARN semantics)
```

### 6.4 The grounding-WARN converter (the shared utility)

```
THE GROUNDING WARN (never a hard-kill — the operator's D2):
  groundingWarn(check, token, sourceRef, value, proposed):
    // 1. BUILD the refinement warning with the context:
    const w: RefinementWarning = { check, token, sourceRef, value, proposed };
    // 2. LOG the warning to the failure store (the WARN type — the SQLite chain_failures):
    recordFailure({ pipelineStage: 'E3', failureType: 'GROUNDING_WARN', pair,
                    setupId, tokenFailures: [w], ledger, nextSteps: [...] });
    // 3. RETURN the warning — the CALLER continues the loop with it as the
    //    refinement input (the refine/retry doctrine: "a rejected setup is not
    //    a dead setup... each rejection needs to also give context on WHY it was
    //    rejected and HOW to properly improve it")
    return w;
  // THE LOOP NEVER DIES ON A NON-NUMBER — the non-number is a WARN + the refinement context.
  // THE HARD-THROW ONLY after 3 failed refinements → the failure store (data, never a crash).
```

### 6.5 The pipeline STEP 4 wiring (the tool chain integration)

```
THE TOOL CHAIN PIPELINE (the 6-step flow — the reasoning chain is STEP 4):
  STEP 1  HARVEST        plutus-pipeline-harvest        the bars + the options data
  STEP 2  ZONES          plutus-pipeline-zones          E1 — the zone map (the pressure mechanics)
  STEP 3  SHAPES         plutus-pipeline-shapes         E2 — the shape chain (the storyline)
  STEP 4  REASONING      plutus-pipeline-reasoning      THE REASONING CHAIN — the agent-in-the-loop
            │                                              (the 11-token forward engine)
            │  the deterministic tokens 1-7 (the machine — ms):
            │    1 zone-identification (the phantom-BoM exemption!)
            │    2 pressure-status · 3 liquidity · 4 break-validation
            │    5 strength-comparison · 6 reaction-count · 7 chain-progress
            │  the reasoning tokens 8-11 (the AGENT IN SESSION — visible):
            │    8 forward-position ("the short is halfway to the demand")
            │    9 chaining (the TP of N = the entry of N+1 — Law 27)
            │   10 anchor construction (E/SL/TP as checkable numbers)
            │   11 validation (the floor + the macro + the confluence → refine/retry ≤3)
            │  the output: TradeProjection[] — the E/SL/TP + the anchors (each tracing
            │  to a specific E1 zone id + a specific E2 projection id — the E3-NEVER rule)
  STEP 5  SETUPS          plutus-pipeline-setups         E3 — the trade setups (the tickets)
  STEP 6  REPORT + GATE   the report + diag-reasoning-chain-golden   the G1-G10 acceptance
```

---

## PART 7 — THE REWIRE CHECKLIST (the fresh session's verification per step)

1. [ ] The shadow-agent's callModel is RETIRED as the LLM executor (the SSE stream + the stall detector + the secrets chain KEPT as the reference pattern — the Trident-v7.3 checkpoint 7.3 documented).
2. [ ] The token 8/10/11 hooks expose the reasoning contract as the pipeline STEP's interface (the ForwardProjectionInput/AnchorInput/ValidationInput shapes).
3. [ ] The AGENT performs the reasoning IN SESSION — the analysis visible in the pipeline's stream (the forward-position, the anchors, the validation).
4. [ ] The grounding violations WARN (the refinement warning + the failure-store WARN row) + the loop CONTINUES (never a hard-kill on the first violation).
5. [ ] The hard-throw ONLY after 3 failed refinements → the failure store (data, never a crash).
6. [ ] The deterministic skeleton STAYS as the mechanical floor — the agent's reasoning refines it; the floor is ALWAYS the validity authority; the fallback never fabricates.
7. [ ] The reasoning chain wired as the pipeline STEP 4 (harvest → zones → shapes → REASONING → setups → the report + the gate).
8. [ ] The EU/GU TP substrate fix (the NEXT_STEPS STEP 3) — the ratio-extension REMOVED as a TP source.
9. [ ] The battery passes: tsc 0 · the frozen pair byte-identical · the diag runs · the golden convergence table reported.

---

## PART 8 — THE FULL SHADOW-INFRA INVENTORY (every function, its fate, its replacement)

### 8.1 shadow-agent.ts (506 lines — the RETIRED LLM executor)

| The function | The role | The rewire fate |
|---|---|---|
| `DEFAULT_ENDPOINT` | https://opencode.ai/zen/go/v1/chat/completions (the operator: "this IS the go endpoint") | KEPT as the reference constant |
| `SHADOW_MODEL` | deepseek-v4-flash FROZEN (no override — the fallback-creep cannot exist) | KEPT as the reference — the agent-in-session's model is the primary opencode agent's own |
| `IDLE_WINDOW_MS` | the SSE idle window 90s (the stall detector) | KEPT as the reference pattern |
| `SHADOW_SYSTEM` | the system prompt ("Output ONLY the requested JSON object... never invent a zone id") | CONVERTED to the agent's reasoning instructions (the visible analysis + the contract) |
| `buildShadowPrompt` | the prompt builder (the serialized token-set context) | CONVERTED to the agent's reasoning brief (the token ledger + the zone + the targets + the macro — the SAME context, the agent reads it directly) |
| `parseJsonResponse` | the defensive JSON parse (the fence-strip) | KEPT as the harness's response validator |
| `callModel` | the fetch + the SSE stream + the idle timer | RETIRED as the executor — the STREAM + the IDLE pattern KEPT as the reference |
| `checkDirectionOrder` | the direction-order check (LONG: sl<entry<tp; SHORT: tp<entry<sl) | CONVERTED to the WARN (the operator's D2) — never the hard-kill |
| `computeValidationFloor` | the mechanical floor (the order + the RRR + the macro) | KEPT — ALWAYS the validity authority |
| `createShadowAgentClient` | the client factory | RETIRED as the executor — the resolveShadowApiKey + the reference pattern KEPT |
| `resolveShadowApiKey` | the secrets chain (env → .env → embedded) | KEPT — the key resolution for the agent's model calls |
| `projectForward` / `anchor` / `validateProjection` | the client's three reasoning methods | CONVERTED to the agent-in-session's reasoning steps (the SHADOW_REWIRE_SPEC PART 6) |

### 8.2 The Trident-v7.3 reference deep-dive (the shadow-brain pattern the Plutus shadow SHOULD have followed)

**The reference:** the Trident v4.4.2 `SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md` (build SHA a7b886d3) — "this is trident checkpoint 7.3 dont confuse this" (the naming correction).

**The seven modules (the reference's architecture):**

| Module | Lines | The one-line job |
|---|---|---|
| shadow-memory.ts | ~330 | the session-scoped sqlite: the prompts table (seq/name/prompt_text/sha256/template/validated/lines/created_at), the dual write (sqlite + the JSON mirror), the runtime-validated reads, the epoch summary, the nextSeq |
| shadow-sidecar.ts | ~290 | the tether (globalThis → env → defaults) + the per-PID lifecycle (register/touch/switch) + the 3-check reattach gate (sessionKey matches / the root exists / the pool hydrates — ANY FAIL → the error string) |
| shadow-brain.ts | ~296 | the model-disciplined LLM call: SHADOW_MODEL = deepseek-v4-flash FROZEN (no override), the fetch streamFn against opencode.ai/zen/go/v1/chat/completions, the effort max, the 240s timeout (the race-promise pattern), the error encoding (never thrown) |
| shadow-context-manager.ts | ~386 | the buildContext: the recent ~30-message window + the last-N chain + the epoch + the [SHADOW INFERENCE] assembly + the R1/R2/R3 contradiction detectors |
| shadow-brief-builder.ts | ~187 | the FROZEN SUPREMACY_CONTRACT + the 84-slot weave + the inference embedding |
| shadow-verify.ts | ~292 | the silent verifier: the markers/structure + the VERBATIM-DOCTRINE check + the FRESHNESS check + the repair |
| shadow-runner.ts | ~981 | the 13-step one-place pipeline + the PI execution loop (the scoped read_file/grep/stat) + the dead-LLM fallback |
| shadow-secrets.ts | NEW | the key resolution: env → the .env paths → the EMBEDDED base64 fallback (never logged, never echoed) |

**THE REFERENCE'S LESSONS the Plutus shadow MISSED:**
1. **The frozen model with NO override parameter** — the fallback-creep path cannot exist in code (the test asserts the request's model).
2. **The 240s timeout as a RACE-PROMISE** (a single timer that aborts the transport AND rejects the race promise) — NOT the wall-clock-cap-then-abort.
3. **The errors ENCODED, NEVER thrown** — SHADOW_BRAIN_NO_KEY / _TIMEOUT / _ABORTED / _HTTP_<status> / _EMPTY / _FAIL; the no-key → the loud error BEFORE any transport (no fallback model).
4. **The content || reasoning_content defensive read** — the reasoning-only completions on hard problems; stopReason 'length' keeps the partial content.
5. **The secrets chain with the embedded base64 fallback** — the key NEVER logged, NEVER echoed.

**THE REWIRE'S APPLICATION:** the reference's PATTERNS (the frozen model, the encoded errors, the defensive read, the secrets chain) are KEPT as the agent-in-session's harness; the EXECUTOR (the shadow LLM call) is replaced by the primary opencode agent's in-session reasoning.

### 8.3 The failure taxonomy (the encoded errors — the complete list)

| Code | Meaning | The disposition |
|---|---|---|
| `SHADOW_BRAIN_NO_KEY` | no API key resolved | the LOUD error BEFORE any transport — no fallback model, the deterministic skeleton runs |
| `SHADOW_STALLED` | the idle window exceeded (no tokens for 90s) | the deterministic fallback, confidence capped 0.70, the SHADOW_DEGRADE recorded |
| `SHADOW_ABORTED` | the caller's signal aborted | the deterministic fallback |
| `SHADOW_HTTP_<status>` | the endpoint returned an error | the deterministic fallback + the status recorded |
| `SHADOW_EMPTY` | the model returned no content | the deterministic fallback + the raw response shape recorded |
| `SHADOW_FAIL` | the transport failed | the deterministic fallback + the error message recorded |
| `SHADOW_INVENTED_ID` | the model invented a zone/projection id | a refinement warning (context-bearing) — retry; after 3 → the hard-throw |
| `GROUNDING_WARN` (NEW — the operator's D2) | a non-numeric/out-of-order value | the WARN (the refinement warning + the failure-store row) — the loop CONTINUES |

---

## PART 9 — THE COMPLETE AGENT-IN-SESSION REASONING CONTRACT (the fresh session's interface)

### 9.1 The reasoning STEP's input (the context the agent reads — the pipeline STEP 4's interface)

```ts
export interface ReasoningStepInput {
  pair: PairKey;
  day: string;                 // 'Monday'
  week: string;                // '2026-07-06'
  anchorMs: number;            // the temporal gate
  dayOpenSpot: number;         // the day-native open (the London session anchor)
  e2Day: {
    shape: ShapeCode;          // SS/BS/R/WL/RWL/WLS
    direction: Direction;
    supplyZoneId?: string;
    demandZoneId?: string;
    deepDemandZoneId?: string;
    keyZonePrice?: number;
  };
  zones: OperativeZone[];      // the E1 pressure mechanics (the operative + the candidates)
  lmvTable: Array<...>;        // the liquidity rungs (the fuel)
  macro: MacroAuthorityInput;  // the unified macro authority (the EU/DXY inverted, the GU kept)
  tokenLedger: TokenResult[];  // the deterministic tokens 1-7 (the machine's facts)
  continuationTargets: number[];  // the KCE-Telescoping CLOSED set
  candleGroups: TokenSet;      // the touches + the pre-touch storyline + the post-reaction move
  pip: number;
  atr1hPips: number;
}
```

### 9.2 The reasoning STEP's output (the agent's verdicts — the visible analysis)

```ts
export interface ReasoningStepOutput {
  forwardPosition: number;        // token 8 — the price "positioned forward of the zone toward the target"
  chosenTarget: number;           // one of continuationTargets (the CLOSED set)
  positionVerdict: 'FORWARD' | 'NOT_FORWARD';
  chainedEntry: number;           // token 9 — the prior TP (Law 27) or 0
  entry: number;  sl: number;  tp: number;  rrr: number;   // token 10 — the checkable anchors
  anchors: ProjectionAnchor[];    // every anchor traces to an E1 zone + an E2 projection
  valid: boolean;                 // token 11 — the floor + the macro + the confluence
  warnings: RefinementWarning[];  // the WARNs with the context
  confidence: number;             // 0.0-1.0
  reasonTrace: string[];          // THE VISIBLE REASONING — the operator sees the analysis
  analysis: string[];             // THE AGENT'S IN-SESSION ANALYSIS (the stream-visible narrative)
}
```

### 9.3 The agent-in-session protocol (how the reasoning appears to the operator)

```
THE PIPELINE STEP 4 — THE REASONING (the agent-in-session, visible):
  STEP 4a  the machine computes the deterministic tokens 1-7 (ms — the ledger):
           [zone-identification] PHANTOM_BOM EXEMPT on EUR/USD|1H|1782990000000|1.14004
           [pressure-status] BUY VIRGIN score 0.54 mitigations 0
           [liquidity] nested 3 below 30 above 142 nearest LMV-1.14030
           [break-validation] UNBROKEN wick-reclaim
           [strength-comparison] SELL delta 0.01 impulse 0.98
           [reaction-count] mitigations 0
           [chain-progress] SS day 1/5
  STEP 4b  THE AGENT REASONS (visible in the stream):
           --- THE FORWARD-POSITION ANALYSIS (token 8) ---
           > The price is at 1.14205, the demand is at [1.14145-1.14000] — the price is
           > moving TOWARD the demand. The demand is a phantom-BoM fortress (the type-2
           > virgin MoM — the large OB + the fakeout + the pre-formation reaction + the
           > macro-origin continuation). The reaction WILL happen — the opposing bearish
           > pressure is not yet strong enough to pierce it.
           > forwardPosition: 1.14102 · chosenTarget: 1.14150 · verdict: FORWARD
           --- THE CHAINING ANALYSIS (token 9) ---
           > The prior trade's TP is 1.14102 — set E at the TP level of trade #1 (Law 27).
           --- THE ANCHOR ANALYSIS (token 10) ---
           > SL 3 pips outside the far edge of the nested liquidity zone that sits inside
           > this demand at 1.14110-1.14020 · TP at the near edge of the supply zone.
           > E 1.14102 · SL 1.13917 · TP 1.14564 · RRR 2.50
           --- THE VALIDATION ANALYSIS (token 11) ---
           > The mechanical floor passes (the order + the RRR + the macro) · all the macro
           > storyline confluences align · VALID
  STEP 4c  the machine records the verdicts to the ledger + the TradeProjection to the output.
```

**THE OPERATOR'S VISIBILITY (the D1 core):** the `analysis` array + the reasonTrace appear in the pipeline's stream — the operator SEES the reasoning exactly as the golden-doc analyses read.

---

## PART 10 — THE REWIRE'S RELATION TO THE LEXICONS (the semantic intent stays)

The six lexicons (the MACRO_ARCHITECTURE PART 6) remain the machine's deterministic semantic-intent layer — they feed the agent-in-session's reasoning:
- **candle-pressure** → the token-2 evidence (the side votes, the wick-mass) the agent reads
- **candle-shape** → the token-7 evidence (the shape stage) the agent reads
- **zone-classification** → the phantom-BoM exemption (LANDED — the W5) the agent's token-1 reads
- **zone-pressure** → the lifecycle + the fortress the agent's token-6 reads
- **shape-chain** → the unified macro authority (LANDED — the W4) the agent's macro input reads
- **obvious-trades** → THE REASONING ITSELF — the operator's golden-doc analyses as the agent's reasoning baseline

**THE REASONING-TOKEN LAW (the operator):** "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference" — the agent's in-session analysis MUST read like the operator's EU analyses (the MACRO_ARCHITECTURE PART 7's 8-trade table is the baseline).

---

## PART 11 — THE PIPELINE-INTEGRATION DETAIL (the reasoning chain as the STEP 4 — the complete wiring)

### 11.1 The tool-chain contract (the pipeline STEP's interface)

```
THE TOOL CHAIN PIPELINE (the 6-step flow — the reasoning chain is STEP 4):
  STEP 1  HARVEST        plutus-pipeline-harvest        the bars + the options data
  STEP 2  ZONES          plutus-pipeline-zones          E1 — the zone map (the pressure mechanics)
  STEP 3  SHAPES         plutus-pipeline-shapes         E2 — the shape chain (the storyline)
  STEP 4  REASONING      plutus-pipeline-reasoning      THE REASONING CHAIN — the agent-in-the-loop
            │                                              (the 11-token forward engine)
            │  the deterministic tokens 1-7 (the machine — ms):
            │    1 zone-identification (the phantom-BoM exemption!)
            │    2 pressure-status · 3 liquidity · 4 break-validation
            │    5 strength-comparison · 6 reaction-count · 7 chain-progress
            │  the reasoning tokens 8-11 (the AGENT IN SESSION — visible):
            │    8 forward-position ("the short is halfway to the demand")
            │    9 chaining (the TP of N = the entry of N+1 — Law 27)
            │   10 anchor construction (E/SL/TP as checkable numbers)
            │   11 validation (the floor + the macro + the confluence → refine/retry ≤3)
            │  the output: TradeProjection[] — the E/SL/TP + the anchors (each tracing
            │  to a specific E1 zone id + a specific E2 projection id — the E3-NEVER rule)
  STEP 5  SETUPS          plutus-pipeline-setups         E3 — the trade setups (the tickets)
  STEP 6  REPORT + GATE   the report + diag-reasoning-chain-golden   the G1-G10 acceptance
```

### 11.2 The STEP-4 execution sequence (the agent-in-session flow)

```
plutus-pipeline-reasoning (STEP 4) — the execution sequence:
  1. RECEIVE the pipeline context (the E1 zones + the E2 shape chain + the macro authority
     + the temporal anchor) from the STEPS 1-3.
  2. THE MACHINE runs the deterministic tokens 1-7 per pair per lane (ms — the ledger):
     the zone-identification (the phantom-BoM exemption), the pressure-status, the liquidity,
     the break-validation, the strength-comparison, the reaction-count, the chain-progress.
  3. THE AGENT (in-session, visible) runs the reasoning tokens 8-11:
     - the FORWARD-POSITION analysis (token 8) — the agent reads the ledger + the zone +
       the targets + the macro + the candle groups → "the price is halfway to the demand —
       the reaction WILL happen" → the forwardPosition + the chosenTarget + the verdict
     - the CHAINING (token 9 — sync) — the prior TP (Law 27)
     - the ANCHOR construction (token 10) — the agent refines the deterministic candidates
       → the E/SL/TP + the anchors (each tracing to an E1 zone + an E2 projection)
     - the VALIDATION (token 11) — the mechanical floor is ALWAYS the authority; the agent
       adds the confidence + the SHADOW_FLAG warnings; the refine/retry ≤3 with the WARNs
  4. THE MACHINE assembles the TradeProjection + records the ledger + the failure store rows.
  5. THE PIPELINE passes the TradeProjections to the STEP 5 (the setups).
```

### 11.3 The data flows (the STEP-4's inputs and outputs)

```
THE STEP-4 INPUTS (from the STEPS 1-3):
  - the E1 zones (buildChartModel — the S/D OBs + the LQZ rungs + the 9-pillar IP zones)
  - the E2 shape chain (buildE2Core — the day decomposition + the storylines)
  - the cascade (cascadeV45 — the EU/GU mirrors, status ACTIVE filtered)
  - the macro authority (the EU = DXY inverted · the GU = EU kept)
  - the temporal anchor (lockRunAnchor — the bars ≤ the Monday 07:00)

THE STEP-4 OUTPUTS (to the STEP 5):
  - the TradeProjection[] (the E/SL/TP as checkable numbers + the anchors)
  - the ledger (the 11-token chain context per projection)
  - the failures (the SQLite rows — the WARNs + the hard-throws + the divergences)
```

### 11.4 The failure modes (the STEP-4's error paths + the dispositions)

| The error | The detection | The disposition |
|---|---|---|
| The agent's response non-numeric | the grounding WARN (the operator's D2) | the WARN recorded + the loop continues with the warning as the refinement input; after 3 → the hard-throw → the store |
| The agent's response out-of-order (E/SL/TP) | the direction-order check | the WARN + the refinement |
| The agent invented a zone id | the grounding check | the WARN (SHADOW_INVENTED_ID) + the refinement; after 3 → the hard-throw |
| The agent's chosenTarget outside the set | the CLOSED-set check | the WARN + the refinement (the target set is CLOSED — never extended) |
| The macro divergence | the token-9 chaining | NOT an error — the macro wins the emission, the divergence recorded + stored (the flag) |
| The contract violation (anchor-less) | assertProjectionContract | the hard-throw → the ProjectionContractError → the store → the synthesis |
| The refinement exhausted (3 fails) | the loop | the hard-throw → the store → the synthesis |
| bun:sqlite unavailable | the failure-store open | recordFailure degrades to the append-only fallback row (never silently drops) |
| The temporal gate bypass | the G8 negative control | the pipeline error — the bars beyond ANCHOR_MS never enter the chain |

### 11.5 The verification matrix (the STEP-4's per-gate checks)

| The gate | The check | The evidence |
|---|---|---|
| G1 | the EU LONG phantom-BoM emission (the token-1 PHANTOM_BOM + the entry within 2p of 1.14110 + the anchors trace) | the gate's per-gate verdict with the delta |
| G2 | the native-first cascade-complementary | the native lane's projection + the cascade's complement proof |
| G3 | the GU Monday direction = LONG (the divergence recorded, the macro wins) | the gate's verdict + the failure-store row |
| G4 | the EU/DXY 1:1 inverted mirror (the linkedMirror resolves) | the gate's verdict |
| G5 | the E3-NEVER compliance (0 anchor-less) | the gate's verdict |
| G6 | the hard-throw discipline (0 REFINEMENT_EXHAUSTED) | the gate's verdict + the store's week count |
| G7 | no regression of the correct trades | the gate's verdict + the golden-convergence table |
| G8 | the temporal gate (the negative control) | the gate's verdict |
| G9 | the performance gate (≤ 5 min) | the gate's wall-time measurement |
| G10 | the parallel-equivalence (the byte-identical projections) | the gate's comparison |

---

## PART 12 — THE COMPLETE CONVERSION SUMMARY (the rewire at a glance)

| The item | The OLD (the shadow) | The NEW (the agent-in-session) |
|---|---|---|
| The reasoning executor | the shadow-agent's callModel (the LLM fetch) | the PRIMARY opencode agent (in-session, visible) |
| The token-8 forward-position | shadow.projectForward | the agent's forward-position analysis (visible) |
| The token-10 anchors | shadow.anchor | the agent's anchor construction (visible) |
| The token-11 validation | shadow.validateProjection | the agent's validation (the floor = the authority, the agent refines the confidence) |
| The grounding violations | the SHADOW_SHAPE_VIOLATION hard-kill | the GROUNDING_WARN + the loop continues (the operator's D2) |
| The deterministic floor | the fallback on failure | the floor ALWAYS the validity authority — the agent's reasoning refines it |
| The failure store | the SQLite rows | KEPT — the WARNs + the hard-throws + the divergences recorded |
| The secrets chain | resolveShadowApiKey | KEPT — the agent's model calls' key resolution |
| The stall detector | the SSE idle window | KEPT as the reference pattern |
| The EU/GU TP substrate | the ratio-extension forced-2.5 | the E2-projected opposing zone's full-model resolution (the NEXT_STEPS STEP 3) |

*END OF THE SHADOW REWIRE SPEC — the complete conversion: the shadow agent is dead; the actual headed agent does the reasoning in-session, visible, as a STEP in the tool chain pipeline. The grounding violations WARN and continue. The deterministic floor stays. The operator's directive #1 is the authority. <!-- DOC-COMPLETE -->*
