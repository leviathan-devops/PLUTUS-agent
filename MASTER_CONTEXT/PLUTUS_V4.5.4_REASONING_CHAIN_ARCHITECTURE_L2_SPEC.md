# PLUTUS v4.5.4 — THE SHADOW-ENHANCED REASONING CHAIN — L2 ENGINEERING SPEC (THE ARCHITECTURE CANON)

**Version:** 2.0 · **Date:** 2026-08-07 · **Status:** CANON — the architecture as MAPPED by the operator's corrections in the 2026-08-07 session
**Authority:** the operator's direct architecture rulings (the parallel tokens, the stall detector, the Trident-v7.3 shadow pattern, the execution topology) — quoted verbatim in PART 17.
**Supersedes:** `PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC.md` (the L1 initial plan — this L2 is the corrected + expanded canon).
**Complementary:** `PLUTUS_V4.5.4_LEXICON_SPEC.md` (the six lexicons — the semantic intent layer) · `Plutus_Shark_Operator_Audit_Process.md` (the testing process) · the Trident v4.4.2 checkpoint 7.3 `SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md` (the shadow backend reference — the correct mechanism).
**Reading order:** Bible 4.5 → Bible 4.0 → the E1+E2=E3 MACRO CONTEXT → THIS SPEC → the LEXICON SPEC → the L1 spec (historical) → the audit process.

---

# PART 0 — THE MISSION AND THE SESSION'S ARCHITECTURE CORRECTIONS

## 0.1 The mission (unchanged — the operator's directive)

> "There needs to be a proper agent-in-the-loop reasoning chain to validate and refine/retry E2 before E3, and then also the same on E3 itself to forward map the trades that come from E2 + validate the trades themselves."

The 11-token forward-reasoning engine sits between E2 and E3. It reads the E1 pressure state + the E2 storyline, runs the 11-token sequence, and emits TradeProjections (E/SL/TP as checkable numbers). The embedded shadow agent (deepseek v4 flash via opencode go) drives the forward-projection tokens. A deterministic fallback ensures the pipeline never hangs. A SQLite failure store remembers every miss. A refine/retry loop enforces the operator's "rejected setup is not a dead setup" doctrine.

## 0.2 The session's corrections (2026-08-07 — the operator's architecture rulings)

The operator reviewed the v2.0 implementation and corrected SIX architectural points. Each is a ruling — this spec encodes them as canon:

| # | The correction | The pre-correction design | The canon design (THIS SPEC) |
|---|---|---|---|
| C1 | **Tokens 8/9/10 run in PARALLEL** | token8 → token9 → token10 sequential (2 LLM calls serialized per lane) | `Promise.all([token8, token10])` after the sync token9 — token11 AFTER assembly |
| C2 | **The shadow backend = the Trident-v7.3 checkpoint pattern** | a bespoke AbortController fetch with an env-only key | the shadow-brain pattern: the frozen model, the race-promise timeout, the encoded errors never thrown, the content||reasoning defensive read, the secrets chain env → .env → embedded |
| C3 | **The execution topology: micro-parallel, macro-sequential** | 3 pairs sequential, then the cascade at the end of everything | all 3 pairs + N lanes run ASYNC in parallel (the micro level); the DXY cascade layered ON TOP as the macro signal (the sequential macro-level step 2) |
| C4 | **The timeout = a STALL DETECTOR, not a wall clock** | a 600s wall-clock cap on the whole call — killed working generations | the SSE-stream idle detector: the timer resets per received chunk; abort ONLY on a no-token idle window |
| C5 | **The failure store organization = session/week-scoped, mirrored, indexed** | a flat week-scoped table | the `chain_failures` table (week + reason indexes) + the synthesis + the session scoping + the append-only mirror pattern |
| C6 | **The deterministic steps are ms-scale — ALL the time is LLM reasoning** | (not a bug — a confirmation) | the performance model: tokens 1-7 = ms; tokens 8-11 = the entire wall clock; the parallelization is the ONLY lever that matters |

## 0.3 The naming correction (the operator, verbatim context)

> "Manta v7.3 — this is trident checkpoint 7.3, don't confuse this."

The shadow-backend reference is the **Trident v4.4.2 project's checkpoint 7.3** (`SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md`, build SHA a7b886d3) — NOT a "Manta" artifact. The reference canon: `KNOWLEDGE_LIBRARY/Engineering/SHADOW_ENHANCED_TOOLS_MACRO_ARCHITECTURE.md` (the PI-fused replication Part 6). All references in this spec use the corrected naming.

## 0.4 What this spec IS

This is the CANON architecture document for the reasoning chain — written at DP L2 quality (the deep-planning layer-2 standard: contracts, pseudocode, data flows, failure modes, implementation order, verification, acceptance). It is MANUALLY authored (not tool-generated) per the operator's directive, so it is "properly stored" and "canon and clear." The diagrams are the EXACT diagrams mapped in the 2026-08-07 session — the operator approved their structure.

---

# PART 1 — THE MACRO POSITION (WHERE THE LAYER LIVES)

## 1.1 The pipeline position — THE diagram

```
        ┌──────────────────────────┐        ┌──────────────────────────┐
        │  E1  THE ZONE MAP        │        │  E2  THE STORYLINE       │
        │  pressure mechanics      │        │  the shape chain         │
        │  (OBs · LQZ · 9 pillars) │        │  (SS→BS→R→WL per day)    │
        └──────────────────────────┘        └──────────────────────────┘
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  ★ THE REASONING CHAIN (v4.5.4)      │
                 │  the 11-token forward engine         │
                 │  reads E1+E2 → TradeProjections      │
                 └──────────────────────────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │  E3  TRADE SETUPS (E/SL/TP/RRR)      │
                 └──────────────────────────────────────┘
```

## 1.2 The one-line meaning

**E1 draws the map (WHERE the walls are). E2 tells the story (WHAT path price takes). The reasoning chain is the JUDGMENT — the part that says "price is here, the demand is there, the reaction WILL happen, here is the trade" — before E3 prints the ticket.**

## 1.3 The fundamental law (the operator, verbatim)

> "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being done properly. It becomes very fucking obvious when E1 + E2 are done correctly it is really just a classification + precision alignment engine of the E1 + E2 data."

The reasoning chain is the missing piece between E2's output and E3's classification: it makes the E1+E2 data REASON instead of merely COMPUTE.

## 1.4 The proof (the measured state)

The EU LONG emitted at **E 1.14102 / SL 1.13917 / TP 1.14564 → the golden 1.14110 at Δ0.8p HIT** — the phantom-BoM fortress reproduced mechanically by the chain's token-1 exemption + the forward-position reasoning. This is the forward-reasoning layer the operator demanded — LIVE.

## 1.5 The E1/E2/E3 constraint (the operator, verbatim)

> "this needs to clearly follow the pre-existing linear price-action-zone-pressure-shape-chain-trade-mapping architecture E1 --> E2 --> E3 each one BUILDS ON TOP of the previous. Previous engine data PROVIDES THE STRUCTURE FOR the next one. Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable."

> "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules and make shit up."

The reasoning chain OBEYS: it consumes the E1 zones + the E2 projections; every emitted anchor traces to a specific E1 zone id + a specific E2 projection id (the E3-NEVER rule, PART 11).

---

# PART 2 — THE 11-TOKEN ENGINE (THE REASONING SEQUENCE)

## 2.1 The token sequence — THE diagram

```
┌──────────────────────────────────────────────────────┐
│  TOKENS 1-7  THE DETERMINISTIC CORE (the machine)    │
│  1 zone-identification    5 strength-comparison      │
│  2 pressure-status        6 reaction-count           │
│  3 liquidity              7 chain-progress           │
│  4 break-validation                                   │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  TOKENS 8-11  THE SHADOW-REFINED (the LLM hooks)     │
│  8 forward-position    → shadow.projectForward       │
│  9 chaining            → Law 27 (TP=N → E=N+1)       │
│ 10 anchor construction → shadow.anchor               │
│ 11 validation          → shadow.validateProjection   │
└──────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│  THE OUTPUT — TradeProjection                        │
│  pair · direction · E · SL · TP · RRR                │
│  pressureRead · chainContext · confidence            │
│  anchors[] (each traces to an E1 zone + E2 proj)     │
└──────────────────────────────────────────────────────┘
```

## 2.2 Why 7 deterministic + 4 LLM

The machine already computes facts well — the 70% of the reasoning that is mechanical (the zone's pressure state, the liquidity, the battle count). What the machine could NOT do is the judgment — the 30% that requires reading the situation like the operator does. That 30% is tokens 8-11, driven by the shadow LLM.

**THE PERFORMANCE LAW (C6 — the operator's confirmation):** tokens 1-7 complete in MILLISECONDS (pure in-memory computation over the fixture — zone resolution, rung lookups, ledger building). **100% of the wall time is tokens 8-11's LLM reasoning.** The parallelization of tokens 8-11 is the ONLY lever that reduces the wall clock.

## 2.3 The token table (each token = a checkable verdict with evidence, never prose)

| Token | The question it answers | The evidence it emits | Deterministic? |
|---|---|---|---|
| 1 zone-identification | WHICH zone is operative? Is it a phantom-BoM fortress? | the E1 zone id + the classification (incl. PHANTOM_BOM exemption) | YES |
| 2 pressure-status | What is the zone's lifecycle state? | side · score · buy/sell votes · wick-mass ratio | YES |
| 3 liquidity | Where is the fuel? | the LMV rungs below/above · nearest LQZ | YES |
| 4 break-validation | Did structure actually break, or is it a false positive? | close-beyond = invalid · wick-reclaim = valid | YES |
| 5 strength-comparison | Which side has more impulse? | the strength delta · the stronger side | YES |
| 6 reaction-count | How many battles has the zone fought? | the count · "zones usually fail on the THIRD mitigation" | YES |
| 7 chain-progress | Where in the SS→BS→R→WL chain are we? | the chain stage · the direction · days remaining | YES |
| **8 forward-position** | **Is price heading TOWARD the zone? Will it react?** | **the forward position · the chosen target · FORWARD/NOT_FORWARD** | LLM-hooked |
| **9 chaining** | Does this trade chain from the prior TP? | the linked mirror · the prior TP (Law 27) | YES (sync) |
| **10 anchor construction** | What are the E/SL/TP numbers? | entry · sl · tp · rrr · per-anchor traces | LLM-hooked |
| **11 validation** | Do all layers agree? | valid · warnings · confidence | LLM-hooked |

## 2.4 THE CORRECTION C1 — tokens 8/9/10 run in PARALLEL (the operator's ruling)

> "8, 9, and 10 can all run async in parallel these do not need to be sequential. 11 can come after these are done and assembled"

**The pre-correction (WRONG — the v2.0 implementation):**

```ts
const fp = await token8_forwardPosition(ctx);           // LLM call #1 (await)
const chainedEntry = token9_chaining(priorTp);          // sync, ms
const anchorsOut = await token10_anchorConstruction(ctx, fp, chainedEntry);  // LLM call #2 (await)
```

token10 awaits token8's `fp` — a FALSE sequential dependency. The anchor construction's real inputs (the operative zone, the computeMirrorSL/computeMirrorTP candidates, the chained entry) are all available WITHOUT the forward-position result — the forward-position refines the TARGET choice, it does not gate the anchor.

**The canon (CORRECT):**

```ts
const chainedEntry = token9_chaining(priorTp);          // sync, ms — the lane-level chain
const [fp, anchorsOut] = await Promise.all([           // THE PARALLEL PAIR
  token8_forwardPosition(ctx),                          // LLM — runs concurrently
  token10_anchorConstruction(ctx, deterministicFp, chainedEntry),  // LLM — runs concurrently
]);
const proj = assembleProjection(ctx, tokens17, fp, anchorsOut, chainedEntry);
const { projection } = await runRefineRetry(proj, input, ctx);  // token 11 AFTER assembly
```

**The result: 2 LLM calls per lane → 1 wall-clock slot.** token11 stays AFTER assembly — it validates the assembled projection.

## 2.5 The token-set semantics (the operator, verbatim)

> "1 candle = 1 token. 1 token by itself does not provide any meaningful data. A set of tokens in a structured dataset = relevant context (TTE shapes)"

The candle groups = the touches + the pre-touch storyline + the post-reaction move around the operative zone. The shadow receives the serialized token-set (structured rows), never the raw OHLC dump.

---

# PART 3 — THE ENGINE INTERNALS (buildReasoningChain)

## 3.1 The per-lane execution — THE diagram

```
  THE PER-LANE EXECUTION (inside buildReasoningChain)
  ┌────────────────────────────────────────────┐
  │  runTokens1to7 — the deterministic 70%     │
  │  the ledger: tokens 1-7 (fixed facts)      │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  token9  chaining (Law 27) — SYNC, ms      │
  │  priorTp = the previous lane's TP          │
  └────────────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
  ┌────────────────────────┐  ┌────────────────────────┐
  │  token8  forward-      │  │  token10 anchor        │
  │  position (LLM)        │  │  construction (LLM)    │
  │  shadow.projectForward │  │  shadow.anchor         │
  │  fallback: determinist-│  │  SL: computeMirrorSL   │
  │  icForwardPosition     │  │  TP: computeMirrorTP   │
  └────────────────────────┘  └────────────────────────┘
              └─────────┬─────────┘
                        ▼
  ┌────────────────────────────────────────────┐
  │  assembleProjection → TradeProjection      │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  runRefineRetry (token 11 validation)      │
  │  floor → shadow.validate → refine ≤3 →     │
  │  hard-throw → failure store                │
  └────────────────────────────────────────────┘
                        │
                        ▼
  ┌────────────────────────────────────────────┐
  │  priorTp = projection.TP  (the chaining)   │
  └────────────────────────────────────────────┘
```

## 3.2 The lanes (per day, deduped by direction)

The engine builds up to 3 candidate lanes for each pair:

| Lane | Source | The role |
|---|---|---|
| **E2_NATIVE** | the day's own E2 designation (shape-brain) | the shape chain's verdict — the day's own direction |
| **MACRO** | the unified macro authority (the D50/D59 fix) | EU mirrors DXY inverted · GU mirrors EU kept — a per-pair classification contradicting the macro = a recorded divergence, the macro WINS the emission |
| **REACTION** | the complement | "the demand's pressure will react" — the forward-reasoning lane that produced the EU LONG |

The lane construction (the current code, verbatim semantics):

```ts
const lanes: Array<{ direction, zone, lane: 'E2_NATIVE' | 'MACRO' | 'REACTION' }> = [];
if (dayDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'E2_NATIVE' });
if (dayDir === 'LONG' && (demand ?? deepDemand)) lanes.push({ direction: 'LONG', zone: demand ?? deepDemand, lane: 'E2_NATIVE' });
if (macro.direction === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'MACRO' });
if (macro.direction === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'MACRO' });
const reactionDir = dayDir === 'SHORT' ? 'LONG' : 'SHORT';
if (reactionDir === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'REACTION' });
if (reactionDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'REACTION' });
```

Dedupe by direction (the E2_NATIVE leg first so its TP chains into the reaction — Law 27), then order by the lane rank (E2_NATIVE 0 → MACRO 1 → REACTION 2).

**THE CHAINING DEPENDENCY (the only sequential lane coupling):** `priorTp = projection.TP` — the next lane's entry chains from the previous lane's TP (Law 27). This is a LANE-level dependency, not a token-level one — the lanes remain ordered, but WITHIN each lane, tokens 8/10 run parallel.

## 3.3 The phantom-BoM fortress (findFortressDemand)

```ts
const longDemand = findFortressDemand(model, dayOpenSpot, input)
  ?? demand ?? deepDemand ?? nearestDemandBelow(model, dayOpenSpot);
```

The engine scans for the **type-2 virgin MoM** — the operator's concept — a large OB at the base of a mid-swing recovery that temporarily faked the swing break (the "fake RWL"/correction fakeout). When found, it becomes the LONG lane's demand. This is the intelligence that the blanket "virgin MoM = death zone" rule at `shape-brain.ts:2330-2336` was killing — the machine rejected the #2 demand [1.14145-1.14000] and picked a deep 1.13851 instead (Δ19.4p miss). The chain's token 1 exempts the fortress.

**The exemption criteria (ALL FOUR — the operator's type-2 virgin MoM = the fortress):**
1. **large-OB** — the width exceeds the SMC ratio threshold anchored to the context (ATR/move-scale/TF — never a fixed pip number)
2. **mid-swing-recovery + the fakeout** — formed at the base of a recovery whose candles TEMPORARILY broke the swing structure ("clearly breaks (temporarily for only a couple of candles) the actual swing move structure and is clearly a 'fake RWL' type or 'correction' fakeout candle")
3. **the pre-formation opposing-BoM reaction** — the correction INSTANTLY reacted to an opposing UM BoM structure BEFORE forming the big OB ("there is an UM 1H BoM supply zone... that this correction instantly reacts to before forming the big OB")
4. **macro-origin continuation** — the KCE-Telescoping chain continues THROUGH the zone in the macro direction ("the move actually CONTINUES FORWARD VIOLENTLY and completes the full swing from the macro origin element")

## 3.4 The divergence law (the unified macro authority)

```ts
if (lane.lane === 'E2_NATIVE' && lane.direction !== macro.direction && shape === 'R') {
  // MACRO_DIVERGENCE — recorded, never suppressed; the macro wins the emission
}
```

A per-pair REVERSAL classification (the R-shape day) that contradicts the unified macro direction = a divergence BUG — recorded in the failure store (`MACRO_DIVERGENCE`), never suppressed, the macro wins the emission. This is the D59 fix: the GU Monday's R:SHORT (its storyline swept a HIGH while the EU swept a LOW) → the macro authority flips it to the EU-mirror direction.

---

# PART 4 — THE SHADOW BACKEND (THE CORRECT MECHANISM — THE TRIDENT V7.3 CHECKPOINT PATTERN)

## 4.1 THE CORRECTION C2 — the reference is the Trident checkpoint 7.3

> "ok but is this using the correct mechanism? See how the correct shadow backend was just done in another session" → the Trident v4.4.2 `SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md` (build SHA a7b886d3).

The shadow backend's correct mechanism is the **shadow-brain pattern** from the Trident v4.4.2 checkpoint 7.3 — the PI-fused silent backend. The Plutus shadow-agent must align to it.

## 4.2 The shadow-brain contract (the reference — the canon mechanism)

```ts
// THE REFERENCE (shadow-brain.ts — the Trident v4.4.2 checkpoint 7.3)
SHADOW_MODEL = 'deepseek-v4-flash'        // FROZEN — exported, no override parameter
                                         // (the fallback-creep path cannot exist in code)
SHADOW_BASE_URL = 'https://opencode.ai/zen/go/v1'   // the operator: "this IS the go endpoint"
callShadow(prompt, system, maxTokens, options) → { content, model, ok, error }
  // the fetch POST {baseUrl}/chat/completions:
  //   Authorization: Bearer <resolveShadowApiKey()>
  //   body: { model: SHADOW_MODEL, messages, reasoning_options: { effort: 'max' }, max_tokens }
  // THE TIMEOUT: a single timer that aborts the transport AND rejects the race promise
  // errors encoded: SHADOW_BRAIN_NO_KEY / _TIMEOUT / _ABORTED / _HTTP_<status> / _EMPTY / _FAIL
  //   — NEVER thrown; the no-key → the loud error BEFORE any transport (no fallback model)
  // the response read defensively (content || reasoning_content — the reasoning-only
  // completions on hard problems); stopReason 'length' keeps the partial content
```

## 4.3 THE CORRECTION C4 — the stall detector, not the wall clock (the operator's ruling)

> "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"

**The pre-correction (WRONG):** `setTimeout(() => controller.abort(), 600_000)` — a wall-clock cap on the whole fetch. Any generation that legitimately exceeds 600s was killed mid-reasoning → the SHADOW_TIMEOUT degrade → the chain grinds forward through aborts. The 30-minute "hang" was 3 aborted calls × 600s each.

**The canon (CORRECT) — the SSE-stream idle detector:**

```
THE STALL DETECTOR (the SSE idle-window design)
┌────────────────────────────────────────────────────────────┐
│  callShadow with stream:true (SSE)                          │
│  the fetch returns a ReadableStream of SSE chunks           │
│  ┌────────────────────────────────────────────┐             │
│  │  per-chunk loop:                           │             │
│  │  onData(chunk) → reset the idle timer      │             │
│  │  (the model IS working — tokens are moving)│             │
│  │  accumulate the content + reasoning        │             │
│  └────────────────────────────────────────────┘             │
│  THE IDLE TIMER (e.g. 90s of NO tokens):                    │
│  → abort the transport (a TRUE stall — the model died)      │
│  → SHADOW_STALLED encoded, never thrown                      │
│  → the deterministic fallback with confidence capped 0.70    │
│  A WORKING GENERATION NEVER DIES — the timer resets         │
│  per chunk, so a 10-minute reasoning pass streams through.  │
└────────────────────────────────────────────────────────────┘
```

**The semantics:** a working generation that streams tokens for 10 minutes never dies; a stalled connection dies at the first idle window (no tokens for 90s). This is the "kill stalls, never kill work" law.

## 4.4 THE CORRECTION C2b — the secrets chain (the key resolution)

**The pre-correction (WRONG):** `process.env.OPENCODE_API_KEY` ONLY — which failed the shell-session boundary (the key exported in one bash call wasn't visible in the next).

**The canon (the shadow-secrets pattern — the Trident v7.3):**

```ts
resolveShadowApiKey() → string
  1. process.env.OPENCODE_API_KEY (the runtime env)
  2. the .env files: the project root's .env → ~/.config/opencode/.env → ~/.env
     (the KEY=VALUE parse, # comments skipped)
  3. THE EMBEDDED FALLBACK: the operator's granted key, base64-encoded
     (the plaintext appears NOWHERE in the source; the decode verified == the key EXACTLY)
  The key is NEVER logged, NEVER echoed in the errors, NEVER in the reports.
```

## 4.5 The shadow-agent's placement in the chain

```
┌──────────────────────────────────────────────┐
│  THE SHADOW AGENT (the embedded LLM)         │
│  deepseek v4 flash via opencode go           │
│  the endpoint: opencode.ai/zen/go/v1/...     │
└──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│  callShadow(prompt, system, maxTokens)       │
│  the frozen model · effort max               │
│  the SSE stream · the idle-window timer      │
└──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│  THE GROUNDING CONTRACT (the response check) │
│  E/SL/TP numeric + direction-ordered         │
│  chosenTarget ∈ the CLOSED target set        │
│  e1ZoneId/e2ProjectionId real ids only       │
└──────────────────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
┌────────────────────────┐  ┌────────────────────────┐
│  ACCEPT the refinement │  │  FALLBACK (never hang) │
│  llmRefined: true      │  │  deterministic value   │
│                        │  │  confidence capped 0.70│
└────────────────────────┘  └────────────────────────┘
```

## 4.6 The error taxonomy (the encoded errors — NEVER thrown)

| Code | Meaning | The disposition |
|---|---|---|
| `SHADOW_BRAIN_NO_KEY` | no API key resolved | the LOUD error BEFORE any transport — no fallback model, the deterministic skeleton runs |
| `SHADOW_STALLED` | the idle window exceeded (no tokens for 90s) | the deterministic fallback, confidence capped 0.70, `SHADOW_DEGRADE` recorded |
| `SHADOW_ABORTED` | the caller's signal aborted | the deterministic fallback |
| `SHADOW_HTTP_<status>` | the endpoint returned an error | the deterministic fallback + the status recorded |
| `SHADOW_EMPTY` | the model returned no content | the deterministic fallback + the raw response shape recorded |
| `SHADOW_FAIL` | the transport failed | the deterministic fallback + the error message recorded |
| `SHADOW_INVENTED_ID` | the model invented a zone/projection id | a refinement warning (context-bearing) — retry; after 3 → the hard-throw |

---

# PART 5 — THE VALIDATE / REFINE / RETRY LOOP

## 5.1 THE diagram

```
┌────────────────────────────────────────────┐
│  THE VALIDATE / REFINE / RETRY LOOP        │
│  (runRefineRetry — token 11 enforcement)   │
└────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────┐
│  computeMechanicalFloor                    │
│  direction order · RRR ≥ 1.0 · macro check │
└────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────┐
│  shadow.validateProjection (LLM vote)      │
│  warnings + confidence delta only —        │
│  the floor is ALWAYS the validity authority│
└────────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
   ┌────────────────────┐   ┌────────────────────┐
   │ VALID → accept     │   │ INVALID → refine   │
   │ the projection     │   │ re-run tokens 8-11 │
   │ ships to E3        │   │ with the warnings  │
   └────────────────────┘   └────────────────────┘
                                    │
                                    ▼
   ┌────────────────────────────────────────────┐
   │  refinements ≥ 3 ?                        │
   │  YES → HARD THROW → SQLite failure store  │
   │  NO  → refine again (the loop)            │
   └────────────────────────────────────────────┘
```

## 5.2 The refinement warnings carry the context (never bare text)

```ts
export interface RefinementWarning {
  check: string;    // 'DIRECTION_ORDER' | 'MACRO_DIVERGENCE' | 'ANCHOR_TRACE' | 'SHADOW_INVENTED_ID' | 'RATIO_OFF_CONTEXT'
  token: TokenId;
  sourceRef: string;   // file:line or token-set ref — evidence, never narration
  value: unknown;      // the offending value
  proposed: string;    // the correction, with the context
}
```

## 5.3 The enforcement doctrine (the operator, verbatim)

> "a refine/retry is correct. not a hard throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db... at the end of the pipeline all failure data needs to be synthesized and delivered with the final output + clear next steps"

The hard-throw is DATA, not a crash — it lands in the failure store with the full ledger, the warnings, and the next steps, and the pipeline continues.

## 5.4 The refinement strategies (the per-anchor 3-attempt machine — the operator's design)

> "3 attempts on each anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked individually per trade - so a dedicated dynamic state machine... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it"

The chain's refine step implements the per-anchor attempt tracking:

```
THE PER-ANCHOR STATE (per trade):
  { entry: { attempts, locked, best },
    sl:    { attempts, locked, best },
    tp:    { attempts, locked, best },
    status: 'REFINING' | 'PASSED' | 'REJECTED' }

THE TURN SEMANTICS:
  each anchor gets 3 refinement attempts, tracked INDIVIDUALLY
  an anchor LOCKS when its 3 attempts are exhausted — the others keep their attempts
  the loop: while status === 'REFINING':
    refine the best unlocked anchor (the E1/E2-informed candidate)
    re-compute the RRR
    RRR ≥ floor → PASSED
    all 3 anchors locked → REJECTED with the full context

THE REJECTION CONTEXT (every rejection):
  WHY  — the mechanical reason (the anchor, the numbers, the violated constraint)
  HOW  — the specific correction ("the TP must extend to the E2-designated demand at 1.33567 —
         the current TP stops at the 1.33720 shelf which is a pass-through LQZ, not a structural wall")

THE INTELLIGENCE:
  the machine consumes the E1 pressure mechanics + the E2 shape chain OF THE TRADE BEING REFINED —
  it rejects: the SL 2 zones away from the entry, the TP extended to an unreachable zone,
  any violation of the pre-existing architecture
```

## 5.5 The anchor doctrine integration (how the chain's anchors implement the operator's rules)

**THE ENTRY (the LQZ's near edge — the first contact):**
> "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor"

The chain's token 10 resolves the entry at the entry LQZ's NEAR edge — the level the price reacts at — with the chained entry (the TP of N = the entry of N+1) preferred when present.

**THE SL (the ladder-steps model — the operator's refined rule):**
> "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps. It is either 3 pips outside the far edge of the current step we enter on, or 1-2 pips inside the close edge of the NEXT STEP away (opposite direction of the projected trade direction - if it is a short then this is the next step UP. if it is a long this is the next step DOWN)"

The chain's token 10 computes the SL via `computeMirrorSL` (the next rung's reactionExtreme + the Law-7 buffer) — the ladder-steps rule. The RELEVANT zone (the S/D or the LQZ — whichever pressure structure is the operative defense) is chosen by the pressure state of THAT trade — the SL/entry roles are NOT hardcoded:
> "it is not S/D = SL and LQZ = E hardcoded. No."

**THE TP (the strength-driven edge):**
> "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the closest zone edge and even potentially add a 1-2 pip spread so you dont miss the exit. Weak pressure zones = delayed reaction. Maximize the profits you catch from these while the candles are still inside of them."

The chain's token 10 computes the TP via `computeMirrorTP` (the structurally-equivalent opposing BoM wall — NEVER nearest):
> "NEVER have I said 'the nearest'. No. This needs to follow proper TP calculation mechanics and match to the zone of opposing pressure that will ACTUALLY cause a reaction this is LITERALLY what E1 and E2 are for. STRUCTURALLY EQUIVALENT not this wank of false metrics like nearest or strongest"

**THE RRR (the consequence — never a target):**
> "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table. look at all the R on these trades this is the target and expected default behavior i dont want 50 shitty 2.5 R trades"

The chain's RRR = |TP − E| / |E − SL| — the consequence of the zone geometry, the 2.5R floor, the 4R+ target. The mechanical floor's `RRR >= 1.0` is the ABSOLUTE validity floor; the 2.5R/4R+ are the QUALITY standards — never optimized down to pass the filter.

---

# PART 6 — THE FAILURE STORE (THE DATA ORGANIZATION)

## 6.1 THE diagram

```
┌────────────────────────────────────────────────┐
│  THE SQLITE FAILURE STORE                      │
│  MASTER_CONTEXT/plutus-reasoning-failures.db   │
│  table: chain_failures                         │
│  id · component · reason · context · week      │
│  the failure taxonomy:                         │
│  SHADOW_DEGRADE · MACRO_DIVERGENCE             │
│  REFINEMENT_EXHAUSTED · CONTRACT_VIOLATION     │
│  THE SYNTHESIS (end of the diag):              │
│  grouped by component → the "next:" steps      │
└────────────────────────────────────────────────┘
```

## 6.2 The schema (verified from the DB — probe evidence)

```sql
CREATE TABLE IF NOT EXISTS chain_failures (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  component  TEXT NOT NULL,   -- 'EUR/USD Monday LONG'  (the pair + day + direction)
  reason     TEXT NOT NULL,   -- SHADOW_DEGRADE | MACRO_DIVERGENCE | REFINEMENT_EXHAUSTED | CONTRACT_VIOLATION
  context    TEXT NOT NULL,   -- JSON: the op + the reason + the pair + the day
  attempts   INTEGER NOT NULL,
  timestamp  TEXT NOT NULL,   -- datetime('now')
  week       TEXT NOT NULL,   -- '2026-07-06'
  pair       TEXT NOT NULL    -- 'EUR/USD' | 'DXY' | 'GBP/USD'
);
CREATE INDEX IF NOT EXISTS idx_failures_week  ON chain_failures(week);
CREATE INDEX IF NOT EXISTS idx_failures_type  ON chain_failures(reason);
```

## 6.3 The data organization (how it is structured)

- **The storage unit:** one row per failure event — the component (which pair/day/direction), the reason (the taxonomy), the context (JSON — the op + the specific reason string + the pair + the day), the attempts, the timestamp, the week, the pair.
- **The indexes:** by week (the per-week synthesis) + by reason (the per-type counts).
- **The query surface:** `failuresForWeek(week)` (the synthesis input) + `failureStats()` (the `GROUP BY reason, component` counts).
- **The synthesis:** at the end of the diag, the failures are grouped by component → the count + the "next:" remediation steps (e.g. "The shadow agent was unavailable — set OPENCODE_API_KEY" / "Instrument the per-pair classifier at its source — GBP/USD Monday SHORT contradicted the unified macro authority").
- **The session-scoping (the Trident-v7.3 pattern, adopted):** the reference memory is session-scoped `{project} × {sessionKey}` with sqlite + the JSON mirror + `state.json`. The Plutus store is week-scoped (correct for the pipeline's per-week runs) — the session-scoping + the append-only mirror adopted as the cross-run accumulation pattern.
- **The hard-throw record:** `REFINEMENT_EXHAUSTED` rows carry the full ledger JSON + the projection JSON + the nextSteps JSON — the complete audit trail.

---

# PART 7 — THE EXECUTION TOPOLOGY (MICRO PARALLEL, MACRO SEQUENTIAL)

## 7.1 THE CORRECTION C3 — the operator's topology ruling

> "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"

## 7.2 THE diagram — the correct topology

```
   THE CORRECT EXECUTION TOPOLOGY (C3)
   ┌──────────────────────────────────────────────────────┐
   │  STEP 1 — THE MICRO LEVEL (PARALLEL)                 │
   │  DXY pipeline   EU pipeline    GU pipeline            │
   │  (N parallel    (N parallel    (N parallel            │
   │   lanes/tokens)  lanes/tokens)  lanes/tokens)         │
   │  ── all 3 pairs run ASYNC                             │
   │  ── within each pair, the lanes run ASYNC             │
   │  ── within each lane, tokens 8/10 run ASYNC (C1)      │
   └──────────────────────────────────────────────────────┘
                        │
                        ▼
   ┌──────────────────────────────────────────────────────┐
   │  STEP 2 — THE MACRO LEVEL (SEQUENTIAL, ONCE)         │
   │  the DXY cascade layered ON TOP — the macro signal   │
   │  refines the EU/GU pair-native results against it    │
   │  (the ≤35% divergence check — COMPLEMENTARY, never   │
   │   overwriting — the cascade law)                     │
   └──────────────────────────────────────────────────────┘
```

## 7.3 The cascade law (the operator, verbatim)

> "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP OF THE EU/GU PAIR NATIVE E1 ANCHORS. IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY."

> "they ARE allowed to have their own mechanics but unified macro signal has authority"

Sequential ONLY at the macro level (the DXY cascade needs the DXY output first), parallel at every micro level. This matches the cascade law verbatim: the DXY cascade refines the pair-native results — complementary, never overwriting.

## 7.4 THE diagram — the 30-minute math (the why + the fix)

```
  ┌─────────────────────────────────────────────┐
  │  THE 30-MINUTE MATH (why it hangs)          │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  3 pairs  ×  2 lanes  ×  4 shadow hooks     │
  │  (DXY/EU/GU)  (S/LONG)  (fwd+anchor+valid)  │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  = up to 24 SEQUENTIAL LLM calls            │
  │  each 1-3+ min at effort:max on the         │
  │  heavy ledger prompts                       │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  = 30-50 min wall time                      │
  │  + the 600s wall-clock cap KILLS working    │
  │    generations (not a stall detector)       │
  └─────────────────────────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────┐
  │  THE FIX (C1 + C3 + C4)                     │
  │  1. tokens 8/10 parallel per lane (C1)      │
  │  2. all 3 pairs + lanes async (C3)          │
  │  3. the SSE idle-detector (C4)              │
  │  4. the DXY cascade after, as the macro     │
  │     refinement (C3 step 2)                  │
  └─────────────────────────────────────────────┘
```

**The arithmetic:** 3 pairs × 2 lanes × 4 shadow hooks = up to 24 sequential LLM calls at 1-3+ min each = 30-50 min. With C1+C3: the per-lane pair becomes 1 LLM slot, the 3 pairs run concurrently → the wall time = the slowest pair's ~2-3 LLM slots ≈ **2-4 minutes total**.

---

# PART 8 — THE PERFORMANCE MODEL (C6 — THE CONFIRMATION)

## 8.1 The operator's question

> "The deterministic steps happen in ms time right? they do not take time all the time is coming from LLM reasoning?"

## 8.2 The answer (verified — the canon)

**YES — 100% of the wall time is LLM reasoning.** The evidence:

1. The diag's first 32 lines (the temporal gate, the E1 model builds, the native setups, the E2 core, the cascade translation, the macro authority) all printed IMMEDIATELY — those are the deterministic stages, pure in-memory computation over the fixture, milliseconds each.
2. The run then hit the FIRST shadow LLM call and produced ZERO output for 30 minutes — the stall was entirely inside `projectForward`'s fetch.
3. The probes: a short prompt returned in **61.9s** (HTTP 200, content 259 chars, reasoning 5914 tokens, `finish_reason: stop`); a realistic ledger prompt at effort:max **exceeded 200s** (the probe aborted). All of that is the deepseek reasoning time.

**The implication:** tokens 1-7 complete in ms; tokens 8-11 are the ONLY clock. The parallelization of tokens 8-11 (C1) + the pairs/lanes (C3) is the ONLY lever that reduces the wall clock. The stall detector (C4) ensures the clock is spent on WORK, never on aborted stalls.

---

# PART 9 — THE DATA CONTRACTS (THE FULL TYPESCRIPT INTERFACES)

## 9.1 The TradeProjection (the chain's output contract)

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

## 9.2 The reasoning-chain input/output

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
  shadow?: ShadowAgentClient;               // absent => deterministic fallback, confidence capped
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

## 9.3 The shadow-agent client contract

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

## 9.4 The failure-store API

```ts
export interface FailureRecord {
  pipelineStage: string;  failureType: string;  pair: PairKey;  setupId: string;
  tokenFailures: RefinementWarning[];  ledger: ChainContext;  projection?: TradeProjection;
  nextSteps: string[];
}
export function recordFailure(r: FailureRecord): number;
export function failuresForWeek(week: string): FailureRecord[];
export function failureStats(): { total: number; byType: Record<string, number>; };
```

---

# PART 10 — THE GROUNDING CONTRACT (THE ANTI-HALLUCINATION WALL)

## 10.1 The law

The LLM may ONLY refine the skeleton's numbers. It can NEVER:
1. invent a zone id or a projection id (`SHADOW_INVENTED_ID` — a refinement warning with the context, retry, after 3 → the hard-throw)
2. pick a target outside the closed continuation set (the target set is CLOSED — never extended by the LLM)
3. emit an unordered E/SL/TP (the direction-order check: LONG requires sl < entry < tp; SHORT requires tp < entry < sl)
4. produce a sub-1R projection as a hard pass (the RRR floor is a refinement warning, the mechanical floor is the authority)

## 10.2 The mechanical floor (the validity authority — ALWAYS)

```ts
function computeValidationFloor(p: TradeProjection, ledger: ChainContext): ValidationOutput {
  const longOrderOk = p.SL < p.E && p.E < p.TP;
  const shortOrderOk = p.TP < p.E && p.E < p.SL;
  const orderOk = p.direction === 'LONG' ? longOrderOk : shortOrderOk;
  const floorOk = p.RRR >= 1.0;
  const macroOk = ledger.macroConsistent || p.direction === ledger.macroDirection;
  // the shadow's validateProjection contributes ONLY its flags + the confidence delta —
  // it can NEVER override a mechanical violation into "valid"
}
```

## 10.3 The E3-NEVER rule (mechanical)

`assertProjectionContract` is called at the E3 emission boundary. A projection whose anchor lacks `e1ZoneId` or `e2ProjectionId` = a pipeline error → hard-throw → `ProjectionContractError` → SQLite failure store → the synthesis. NEVER silently dropped, NEVER auto-credited an anchor.

---

# PART 11 — THE LEXICONS (THE SEMANTIC INTENT LAYER — THE WIRING)

## 11.1 The operator's mapping (the design law)

> "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs"

The six lexicons are the SEMANTIC INTENT layer between the mechanical detection (the regex) and the algorithmic systems (the shape chains). Full detail in `PLUTUS_V4.5.4_LEXICON_SPEC.md` — this spec carries the wiring points:

| Lexicon | The wiring point in the chain |
|---|---|
| candle-pressure | feeds the LMV side vote + the zone-pressure lifecycle (the sweep = the consumption event) |
| candle-shape | feeds the E2's per-day shape classification (the unified macro authority) |
| zone-classification | **THE PHANTOM-BoM exemption at `shape-brain.ts:2330-2336`** + the E1's isDemandZone/isSupplyZone typing |
| zone-pressure | the E2's pressureScore + the E3's SL-relevance switch |
| shape-chain | the E2's buildDayDecomposition (the authority override) + the forward-position predicate |
| obvious-trades | the E3's forward-projection reasoning chain — THE MISSING LAYER |

## 11.2 The machine form

```ts
export interface LexiconRule {
  id: string;  family: PatternFamily;  pattern: RegExp;
  posWeight: number;  negWeight: number;   // score = pos/(pos+neg+1)
  action: 'flag' | 'exempt' | 'override' | 'record';
}
export interface Lexicon {
  name: LexiconName;
  rules: LexiconRule[];
  score(text: string): number;
  twoPhaseEnforcement(): { phase: 'proposal' | 'claim' };
  escapeHatches: string[];
}
```

## 11.3 The PatternFamily predicate groups (the semantic scoring)

```
THE PREDICATE GROUPS (per family):
  descriptive: Predicate[]   // the EVIDENCE AGAINST the semantic intent (neg weight +1)
  suggestive:  Predicate[]   // the EVIDENCE FOR the semantic intent (pos weight +1, some +2)
  substitute?: Predicate[]   // the MISLEADING SURFACE patterns (pos +2 — the "regex without
                             // the psychology"!)
  use?:        Predicate[]   // the LEGITIMATE EXEMPTORS (neg +3 — short-circuit: the
                             // classification is REAL)
// Predicate = a deterministic function over the OHLC/zone data: (data: LexiconData) => boolean
// THE SCORING: confidence = pos/(pos+neg+1) · decision = pos > neg ? 'classify' : 'reject'
// THE MPSE LAW: every predicate is a deterministic expression — fuzzy prose is the derailment
```

## 11.4 The six lexicons' key families (the condensed table)

| The lexicon | The key families | The semantic intent |
|---|---|---|
| candle-pressure | defend · reject · sweep · dwell · pass | WHO won each battle from the candle's wick/body/close anatomy — the defend/reject/sweep/dwell state feeding the zone's pressure lifecycle |
| candle-shape | ss · bs · wl · rwl · r · wls | the impulse/reversal/consolidation signatures feeding the E2 classification — the candle-level grammar (the chain = the sentence) |
| zone-classification | bom · mom · **phantom-bom** · fortress-bom · ip | the BoM/MoM identity + THE PHANTOM BoM (the type-2 virgin MoM = the fortress) + the fortress-BoM (the SEPARATE category — the #8's visible proven BoM) |
| zone-pressure | virgin · virgin-death-scope · tf-hierarchy · active · depleted · fortress · broken | the lifecycle recurrence + the "third mitigation" + the fortress ("4 prior mitigations... NOT get pierced") + the 4H King/1H General/30m Captain hierarchy |
| shape-chain | ss-to-bs · bs-to-r · bs-to-rwl · r-to-wl · wl-to-ss · micro-vs-macro | the fractal chains + the unified macro authority (the EU/DXY 1:1 inverted mirror! the GU same-chain-different-candles!) |
| obvious-trades | zone-identification · pressure-mechanics · shape-chain-context · forward-position · anchor-construction · validation · strength-comparison · reaction-count-state | the forward-reasoning tokens — the operator's golden-doc analyses as the baseline — THE MISSING LAYER |

## 11.5 The phantom-BoM family (the operator's concept — the four suggestive predicates)

```
THE phantom-bom family (the zone-classification lexicon):
  suggestive (FOR the fortress):
    (a) the LARGE-OB width predicate — the SMC ratio-based width (the OB's size is a
        function of the move it precedes — never a fixed pip number!)
    (b) the mid-swing-recovery + the FAKEOUT — the formation at the base of a recovery
        whose candles TEMPORARILY broke the swing structure ("clearly breaks (temporarily
        for only a couple of candles) the actual swing move structure and is clearly a
        'fake RWL' type or 'correction' fakeout candle")
    (c) the PRE-FORMATION opposing-BoM reaction — the correction INSTANTLY reacted to an
        opposing UM BoM structure BEFORE forming the big OB ("there is an UM 1H BoM supply
        zone... that this correction instantly reacts to before forming the big OB")
    (d) the macro-origin continuation — the KCE-Telescoping chain continues THROUGH the
        zone ("the move actually CONTINUES FORWARD VIOLENTLY and completes the full swing
        from the macro origin element")
  descriptive (AGAINST): the small-OB width ∧ the mid-uninterrupted-move position
                          (the type-1 signature!)
  substitute (the surface trap): the virgin-MoM label ALONE — "it's a MoM so it's a death
                          zone" = the regex without the psychology — THE derailment!
  use (the exemptor): the type-1 virgin MoM's FULL signature (the small OB + the
                          uninterrupted BS/WL + the mid-move → the DEATH ZONE stands!)
  THE DECISION: the PHANTOM_BOM intent fires when the suggestive (a-d) > the descriptive
  THE ENFORCEMENT: Phase A — a phantom-BoM zone that the E2's virgin-MoM rule rejects
                          → THROW at the E2 boundary (the death-rule exemption demand)
                   Phase B — the PHANTOM_BOM flag appended to the zone's classification
```

## 11.6 The virgin-death-scope + tf-hierarchy families (the operator's Q3/Q4 answers)

```
THE virgin-death-scope family (the zone-pressure lexicon):
  THE REFINED DEATH RULE — the operator verbatim:
    "the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and
     1H type 1 virgin MoMs"
    "ALL 4H zones WILL have at least 1 reaction before mitigation so even though
     this is MoM on the 4H it is still a valid reaction point"
  → the death rule applies to: the 30m virgin MoMs + the 1H TYPE-1 virgin MoMs ONLY
  → the 4H zones are NEVER death zones
  → the 1H phantom-BoM (the type-2) = the exemption

THE tf-hierarchy family:
  "4H = the King (the E2 shape chain — the war strategy!)
   1H = the General (the E3 trade setups — the battles!)
   30m = the Captain (the per-trade context within the 1H-mapped E3 constraints!)"
  → the pressure mechanics SET by the HTF, CASCADED DOWN to the LTFs — "HTF > LTF"
  → the single-TF static reading = the derailment (the charts require the multi-TF
    analysis — the telescoping!)
```

## 11.7 The fortress-BoM family (the operator's Q2 correction — the SEPARATE category)

> "has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone and NOT get pierced"

The fortress-BoM = a VISIBLE proven BoM (the #8's 1H Refined 4H supply [1.14475-1.14625] anchored to the Jun 22 OB) — SEPARATE from the phantom-BoM (the type-2 virgin MoM). The phantom is a MoM-disguised BoM; the fortress-BoM is a BoM that has PROVEN itself through the mitigations. Both are fortress-class; they are DIFFERENT families with different predicates (the phantom = the formation-window disguise; the fortress-BoM = the mitigation history).

---

# PART 12 — THE INTEGRATION POINTS (THE FILE:LINE ANCHORS + THE BLAST RADIUS)

| Module | File:line | The change | The blast radius (the importers/consumers) |
|---|---|---|---|
| The parallel tokens (C1) | `src/mdve/reasoning-chain.ts` — the lane loop (:1325-1360) | token9 sync first, then `Promise.all([token8, token10])`, then assemble, then runRefineRetry | the lane loop is the ONLY consumer of token8/token10 — the diag + the report read the projections, never the loop's internals — the change is contained |
| The pair-level parallel (C3) | `diag-reasoning-chain.ts` — the results object (:152-156) | `Promise.all` over the 3 pairs | the diag's results object feeds the print loop (:188-210) — the record shape unchanged — the print order must stay DXY/EU/GU (the array index preserved) |
| The stall detector (C4) | `src/mdve/shadow-agent.ts` — callModel (:155-240) | the SSE stream + the per-chunk idle timer | callModel's consumers: projectForward/anchor/validateProjection — all expect `{ok, content|reason}` — the SSE change is internal to callModel |
| The secrets chain (C2b) | `src/mdve/shadow-agent.ts` — the key read (:278) | env → .env → embedded base64 | `createShadowAgentClient`'s `available` flag — the key resolution internal |
| The frozen model (C2) | `src/mdve/shadow-agent.ts` — DEFAULT_MODEL (:86) | FROZEN — kill the opts.model override | the callers pass no model today (the diag calls `createShadowAgentClient()` bare) — the override removal is safe |
| The partial-content keep (C2) | `src/mdve/shadow-agent.ts` — the parser (:185-193) | content || reasoning_content; the partial kept on length-stop | the parser's consumers read `content` — the fallback chain string/array/reasoning already fixed |
| The phantom-BoM exemption | `src/brains/shape-brain.ts:2330-2336` | the death rule gains the exemption lane | the death rule's callers: `evaluateAllMoMZones` (:1057-1072) + `evaluateMoMZoneMechanics` (:999-1051) — the exemption must be consulted at the SAME decision point — the surgical edit |
| The unified macro authority | `src/mdve/macro-authority.ts` (PROPOSED) | the EU/DXY 1:1 inverted mirror + the GU kept | the chain's MACRO lane + the report's buildE2Core — the authority consumed read-only |
| The failure store | `MASTER_CONTEXT/plutus-reasoning-failures.db` | the chain_failures table + the indexes + the synthesis | recordFailure's callers: token8/token10's degrades + the divergence law + runRefineRetry's hard-throws |
| The diag's golden gate | `diag-reasoning-chain-golden.ts` (PROPOSED) | the G1-G10 acceptance | standalone — the golden const is the measurement oracle ONLY, never read by the pipeline (TEMPORARY ARCHITECTURE) |

## 12.1 The frozen surface (NEVER touched)

| File | The hash | The status |
|---|---|---|
| `src/mdve/sl-lmv.ts` | 912940832fac44bc | FROZEN — byte-identical throughout |
| `src/mdve/trade-dedup.ts` | 33914c897e777540 | FROZEN — byte-identical throughout |
| `src/mdve/lmv.ts` (77e56cd0) | MUTABLE prototype | until the golden-LQZ oracle passes |
| `src/mdve/lqz-matrix.ts` | MUTABLE prototype | until the golden-LQZ oracle passes |
| `src/mdve/temporal.ts` | READ-ONLY | the locked run-anchor — the chain reads bars only up to ANCHOR_MS, never bypasses |
| `src/mdve/mirror.ts` | READ-ONLY (this wave) | the computeMirrorSL/computeMirrorTP consumed, not modified |

## 12.2 The temporal gate (the chain's horizon — NEVER bypassed)

```ts
// the chain's inputs are the gated bars: barsFor(pair, tf) applies gateBars
// (the bars ≤ the locked run-anchor — the future bars physically dropped at the source)
// the G8 negative control: a run with a later anchor does not change the golden projections' anchors
```

---

# PART 13 — THE IMPLEMENTATION WAVES (WITH GATES)

## THE WAVE SEQUENCE (W1 → W6, each ends at its exit criterion, then the next starts — NO approval gates)

## Wave W1 — THE PARALLEL ENGINE (C1 + C3)

**The deliverable:** the token 8/10 `Promise.all` in the lane loop (reasoning-chain.ts) + the pair-level `Promise.all` in the diag (diag-reasoning-chain.ts:152-156).

**The exact changes:**
1. `reasoning-chain.ts` — the lane loop: token9 sync first, then `Promise.all([token8_forwardPosition(ctx), token10_anchorConstruction(ctx, deterministicFp, chainedEntry)])`, then assemble, then runRefineRetry. The `deterministicFp` = the skeleton's forward-position computed BEFORE the parallel dispatch (the C1 semantics: the anchor's real inputs are all available without the LLM's fp — the LLM refines the target choice, it does not gate the anchor).
2. `diag-reasoning-chain.ts` — the results object: `Promise.all([buildReasoningChain('DXY'), buildReasoningChain('EUR/USD'), buildReasoningChain('GBP/USD')])`.

**The failure modes (probe-first):**
- The parallel run's projections DIFFER from the sequential run's → the deterministicFp was NOT computed before the dispatch → the C1 order violated → the G10 gate fails → the fix: hoist the deterministic skeleton before the Promise.all.
- The determinism breaks (the ledger hashes differ ×2) → a shared mutable state in the chain (the usedAnchors sets!) → the fix: the per-pair isolation (each pair's chain owns its anchor sets).
- The wall time does NOT drop → the pairs were still serialized (the diag's results object still awaited) → the fix: verify the Promise.all actually dispatched.

**The gate:** `bun diag-reasoning-chain.ts` completes with the SAME projections as the sequential run (the byte-identical ledgers — G10) — the wall time dropped to ~1/6.
**The exit criterion:** the golden hits unchanged (the EU LONG Δ0.8p held) + the wall time measured + the frozen pair byte-identical + tsc 0.

## Wave W2 — THE STALL DETECTOR (C4)

**The deliverable:** the SSE-stream idle-detector in callModel (shadow-agent.ts) — the per-chunk timer reset, the abort on the 90s no-token window, the `SHADOW_STALLED` encoding.

**The exact changes:**
1. The fetch body gains `stream: true`.
2. The response body iterated as the SSE chunk stream (the OpenAI SSE delta shape: `data: {choices:[{delta:{content?, reasoning_content?}}]}` + the `data: [DONE]` terminator).
3. The idle timer: reset per chunk; abort ONLY on the 90s no-token window.
4. The partial content accumulated + kept (the stopReason 'length' semantics — never discarded).

**The failure modes (probe-first):**
- The abort fires on a WORKING generation → the idle window too short OR the timer not reset per chunk → the probe: a real 60-120s generation must stream through un-aborted.
- The SSE parse drops content → the delta shape mismatch (the endpoint's delta may carry reasoning_content while content is empty) → the fix: accumulate BOTH fields defensively.
- The stall never aborts → the timer not cleared/restarted → the probe: a killed connection must abort at the idle window.

**The gate:** the probe — a working generation streams through (the 60-120s calls complete); a killed connection stalls → the abort at the idle window → the deterministic fallback. The wall-clock cap is GONE.
**The exit criterion:** no `SHADOW_TIMEOUT`-after-full-wall records in the store; only `SHADOW_STALLED`-after-idle records.

## Wave W3 — THE SHADOW-BACKEND ALIGNMENT (C2)

**The deliverable:** the frozen model (no override), the secrets chain (env → .env → embedded base64), the encoded errors never thrown, the content||reasoning + partial-content keep.

**The exact changes:**
1. `DEFAULT_MODEL` FROZEN — kill the `opts.model` override path (the fallback-creep cannot exist in code — the Trident-v7.3 law).
2. `resolveShadowApiKey()`: env → the project .env → ~/.config/opencode/.env → ~/.env → the embedded base64 fallback (the plaintext appears NOWHERE in the source; never logged, never echoed).
3. The error encoding: SHADOW_BRAIN_NO_KEY (the loud error BEFORE any transport — no fallback model) / SHADOW_STALLED / SHADOW_ABORTED / SHADOW_HTTP_<status> / SHADOW_EMPTY / SHADOW_FAIL — NEVER thrown.
4. The content||reasoning defensive read + the partial-content keep.

**The failure modes (probe-first):**
- The no-key path silently degrades → the fix: the LOUD error before the transport (the operator: "EITHER IT WORKS OR WE GET A VISIBLE LOUD ERROR").
- The key lost at the shell boundary → the .env + embedded fallback resolves it (the C2b fix — the session's measured failure).
- A wrong embedded key → the 401 → the base64 decode verified against the operator's key EXACTLY.

**The gate:** the zero-hint battery — the no-key loud error, the 401 fallback, the empty-response handling, the partial-content keep on length-stop.
**The exit criterion:** the 77-test-style battery (the Trident-v7.3 standard) ported + passing.

## Wave W4 — THE EXECUTION TOPOLOGY (C3 step 2)

**The deliverable:** the DXY cascade layered ON TOP as the macro refinement — the ≤35% divergence check applied AFTER the pair-native parallel runs.

**The exact changes:**
1. The pair-native parallel runs complete FIRST (the micro level — W1).
2. The DXY cascade runs SECOND (the macro level — the ONLY sequential step): the DXY's E2+E3 output cascades ON TOP of the EU/GU pair-native anchors.
3. The divergence check: the pair-native vs the cascaded shape ≤ 35% divergence (the operator: "the cascade is a macro signal to validate the pair specific output against to ensure there is no more than 35% divergence").
4. The cascade is COMPLEMENTARY — never overwrites, never supersedes the pair-native.

**The failure modes (probe-first):**
- The cascade overwrites the pair-native → the complementary law violated → the fix: the divergence recorded, the pair-native held, the cascade refines only the direction/authority.
- The GU Monday R divergence not flipped → the macro authority failed to fire → the fix: the D59 unified macro authority (PART 31).

**The gate:** the EU/GU projections refine against the DXY macro signal — complementary, never overwriting (the divergence recorded, the macro wins).
**The exit criterion:** the divergence law holds + the cascade-complement proof (the forced-null test).

## Wave W5 — THE LEXICON WIRING

**The deliverable:** the six lexicons' enrichments — the phantom-BoM exemption at shape-brain.ts:2330-2336, the unified macro authority, the forward-position predicate.

**The exact changes:**
1. `shape-brain.ts:2330-2336` — the virgin-MoM blanket death rule gains the exemption lane: `if (phantomBoM(zone)) classification = 'PHANTOM_BOM'` (the all-4 predicate — PART 3.3); else the death rule stands.
2. `macro-authority.ts` (NEW) — the EU/DXY 1:1 inverted mirror + the GU kept — the unified macro authority consumed by the chain's MACRO lane.
3. The forward-position predicate — the price's CURRENT position between the shape's start and its designated target ("the short is halfway to the demand") — ratio-based widths.

**The failure modes (probe-first):**
- The exemption fires on a NORMAL virgin MoM → the all-4 predicate too loose → the fix: the 4-of-4 required, the 3-of-4 NOT exempted (the conservative default).
- The exemption never fires on the fortress → the predicate too strict → the probe: the [1.14145-1.14000] fixture must classify PHANTOM_BOM.

**The gate:** the phantom-BoM predicate unit-tested against the [1.14145-1.14000] fixture; the macro divergence detector unit-tested.
**The exit criterion:** the exemption fires on the fortress, never on a normal virgin MoM.

## Wave W6 — THE GOLDEN GATE (the acceptance)

**The deliverable:** `diag-reasoning-chain-golden.ts` — the G1-G10 acceptance (PART 14).
**The gate:** the Monday goldens under the new architecture.
**The exit criterion:** G1-G10 all PASS + the wall time ≤ 5 min + the determinism ×2 + the frozen pair byte-identical.

---

# PART 14 — THE ACCEPTANCE CRITERIA (G1-G10)

## 14.1 THE ONLY BUILD TARGET (the operator's mandate)

> "NOW WE ARE GOING TO DO THIS FUCKING ONE DAY AT A TIME THE ONLY TARGET TO BUILD IS NOW MONDAY'S FUCKING TRADES AND NOTHING ELSE"

**THE MONDAY GOLDEN TARGETS (the ONLY build target until the operator says otherwise):**

| The pair | The direction | The golden entry | The SL | The TP | The shape | The source trade |
|---|---|---|---|---|---|---|
| DXY | LONG | 100.945 | 100.905 | 101.115 | SS | the golden #1 |
| DXY | SHORT | 101.140 | 101.200 | 100.845 | BS | the golden #2 |
| EUR/USD | SHORT | 1.14395 | 1.14485 | 1.14110 | SS Swing Scalp | the operator's EU #1 |
| EUR/USD | LONG | 1.14110 | 1.13990 | 1.14460 | WL Whiplash | the operator's EU #2 |
| GBP/USD | LONG | 1.33330 | 1.33250 | 1.33965 | WL Whiplash | the operator's GU #1 |

**The measured state at this spec's writing (the honest baseline):**

| The measurement | The value | The evidence |
|---|---|---|
| The shadow chain's EU LONG | E 1.14102 / SL 1.13917 / TP 1.14564 → the golden 1.14110 at **Δ0.8p HIT** | the diag-reasoning-chain run |
| The golden hits (the Monday oracle, ≤3p) | **1/5** (the EU LONG) | the diag's golden measurement |
| The native lanes (diag-monday) | DXY SHORT Δ0.3p HIT · EU SHORT Δ0.5p HIT · EU LONG Δ19.4p · DXY LONG NONE · GU LONG NONE — 2/5 | diag-monday.ts |
| The cascade lanes | EU LONG Δ11.4p · GU LONG Δ27.1p — 0/3 | diag-monday.ts |
| The day-end outcomes (fill-sim) | WIN 3 · LOSS 3 · NOT_TRIGGERED 5 · OPEN 0 — the DXY SHORT WIN +2.81R shared-row match | the harness fill-sim |
| The report determinism | the Monday report (--day=2026-07-06) ×2 identical | sha256sum |
| The frozen pair | sl-lmv 91294083 · trade-dedup 33914c89 — byte-identical | sha256sum |

## 14.2 The G-gate table

| G# | The golden | The pass condition |
|---|---|---|
| G1 | EU LONG emission (the phantom-BoM fortress) | ≥1 LONG projection whose token-1 verdict is PHANTOM_BOM on [1.14145-1.14000]; the entry within 2 pips of 1.14110; the anchors trace (E3-NEVER) |
| G2 | Native first, cascade complementary | the Monday EU LONG exists in the NATIVE lane; any cascade projection is complementary (never overwrites, never duplicates) |
| G3 | GU Monday direction = LONG (the operator's WL) | the GBP/USD Monday projection's direction === 'LONG'; the R divergence recorded in the divergences + the store (MACRO_DIVERGENCE); the macro wins |
| G4 | EU/DXY 1:1 inverted mirror | for the EU LONG, a DXY SHORT exists with matching ZONE ELEMENTS (never price levels); the linkedMirror resolves |
| G5 | E3-NEVER compliance | 100% of projections pass assertProjectionContract; 0 anchor-less |
| G6 | Hard-throw discipline | 0 REFINEMENT_EXHAUSTED on the golden week; the store's week row count = 0 hard-throws |
| G7 | No regression of the correct trades | the 13 unique trades still emit correctly; the util findings show no fixed-width SL regression |
| G8 | Temporal gate respected | no chain computation reads bars beyond ANCHOR_MS; the negative control (a later anchor) does not change the projections' anchors |
| G9 | **THE PERFORMANCE GATE (NEW — C1/C3/C4)** | the Monday diag completes ≤ 5 min wall time (was 30-50 min) with the SAME projections; the stall detector never kills a working generation |
| G10 | **THE PARALLEL-EQUIVALENCE GATE (NEW — C1)** | the parallel run's projections byte-identical to the sequential run's (the determinism preserved under the Promise.all) |

## 14.3 The gate exit protocol (every gate — the mechanical order)

1. `bunx tsc --noEmit` = 0 errors.
2. `bun build src/index.ts --outdir dist --target bun` = success.
3. The frozen pair: `sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts` → 91294083 / 33914c89 (byte-identical).
4. The report determinism: the Monday report ×2 → the identical sha256.
5. The gate's diag: `bun diag-<gate>.ts` → exit 0 with the assertion list.
6. The wall time: `time bun diag-reasoning-chain.ts` → ≤ 5 min (G9).
7. The checkpoint: `Checkpoints/v4.5.4_{WAVE}/` with the MANIFEST + the report + the gate outputs + the DIFF REVIEWS.

---

# PART 15 — THE VERIFICATION PROTOCOL (THE FULL BATTERY)

## 15.1 The zero-trust battery (BEFORE any build — the state verification)

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

## 15.2 The chain diags

| Diag | What it verifies | The expected result |
|---|---|---|
| `bun diag-reasoning-chain.ts` | the 11-token ledgers per pair + the golden measurement + the failure synthesis | the EU LONG Δ0.8p HIT · the stats line · the wall time ≤ 5 min (G9) |
| `bun diag-reasoning-chain-golden.ts` | the G1-G10 acceptance | exit 0 · `bun diag-reasoning-chain-golden.ts && echo PASS` |
| `bun diag-failure-store.ts` | the week's failures from the SQLite store | the failure count + the by-type breakdown + the synthesis |
| `bun diag-monday.ts` | the Monday harness (native + cascade + the day-end outcomes) | native 2/5 · cascade 0/3 · WIN 3/LOSS 3/NOT_TRIGGERED 5/OPEN 0 |

## 15.3 The shadow battery (the Trident-v7.3 zero-hint standard)

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

## 15.4 The regression battery (must stay green — the zero broken windows law)

`diag-obcv-golden.ts` (the OBCV acceptance, exit 0) · the diag-golden-coverage lineage · `diag-monday.ts` · `probe-step1d.ts` · `probe-label.ts` · `probe-mirror-sl.ts` · `diag-report-source.ts` · `diag-dump-dedup.ts` · the frozen pair sha256. **THE ZERO BROKEN WINDOWS LAW: a build passing before and failing after = a HARD FAILURE — stop, fix the root cause, re-verify, loop until zero regressions.**

## 15.5 The performance measurement (the C6 confirmation)

```
time bun diag-reasoning-chain.ts
  THE EXPECTED: the deterministic stages (the temporal gate, the E1 models, the E2 core,
  the cascade translation, the macro authority) = ms · the tokens 1-7 = ms
  THE LLM SLOTS (tokens 8-11) = the ONLY clock — with C1+C3, the wall time = the slowest
  pair's ~2-3 LLM slots ≈ 2-4 minutes · the G9 gate: ≤ 5 min
```

## 15.6 The container verification

Via trident-container-test (the ONLY sanctioned container path):
1. The fresh sandbox container (the project's own — never another agent's).
2. The SHA-verified deploy (the dist/index.js sha256 on BOTH plugin paths).
3. The TUI launches via tmux send-keys (the two-step Enter — never text+Enter in one keystroke).
4. The task prompt: run `bun diag-reasoning-chain-golden.ts` with the fixture mounted.
5. The monitoring: the tool calls / the stream / the artifacts (the 3-signal monitoring).
6. The evidence: the ContainerTestResult.json — the exit code + the ledger excerpts + the wall time + the pass/fail.
7. THE FOUR ELEMENTS: sha256 proof · stream evidence · behavioral observation · pass/fail determination.

## 15.7 The running report (the append-only law)

Every wave appends to `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` (the ONE running report — ENTRY-numbered sections). The failure syntheses appended under the dated `## FAILURE SYNTHESIS (reasoning-chain)` sections. NEVER overwrite, NEVER truncate.

---

# PART 16 — THE OPERATOR'S RULINGS REGISTER (THIS SESSION — VERBATIM)

1. **The parallel tokens:** "8, 9, and 10 can all run async in parallel these do not need to be sequential. 11 can come after these are done and assembled"
2. **The topology:** "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"
3. **The stall detector:** "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"
4. **The reference:** "See how the correct shadow backend was just done in another session" → the Trident v4.4.2 checkpoint 7.3 (SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md — "this is trident checkpoint 7.3 dont confuse this")
5. **The performance confirmation:** "The deterministic steps happen in ms time right? they do not take time all the time is coming from LLM reasoning?" → CONFIRMED (PART 8)
6. **The shadow doctrine (from the Trident-v7.3 canon, adopted):** "DeepSeek V4 Flash ONLY via opencode-go (the effort max, the secret from the store, NO FALLBACKS — 'DO NOT USE DEEPSEEK PRO. EITHER IT WORKS OR WE GET A VISIBLE LOUD ERROR')"
7. **The endpoint (the operator):** "this IS the go endpoint. it is https://opencode.ai/zen/go/v1/chat/completions"
8. **The enforcement (the standing law):** "a refine/retry is correct. not a hard throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db"
9. **The cascade (the standing law):** "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP... IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY"
10. **The macro authority (the standing law):** "they ARE allowed to have their own mechanics but unified macro signal has authority"

---

# PART 17 — THE ANTI-DERAILMENT DOCTRINE

1. **The scope is the operator's** — the reasoning chain + the shadow backend + the lexicons + the failure store + the topology. No shrinking.
2. **No approval gates** — the waves ship in-turn; W1→W6 each ends at its exit criterion.
3. **Evidence over prose** — every claim carries a file:line or token-set ref; the ledger is the evidence structure.
4. **The lexicons are deterministic predicates** — fuzzy prose is the derailment; `score = pos/(pos+neg+1)`; free-text lives only in reasonTrace.
5. **Refine/retry, not hard-throw** — the hard-throw is data (the failure store), never a crash.
6. **The E3-NEVER rule is mechanical** — a projection without the E1-zone + E2-projection trace = a pipeline error, never an emission.
7. **The wall-clock cap is BANNED** — the timeout is the stall detector (the idle window), never a wall clock on the whole call.
8. **The sequential LLM path is BANNED** — tokens 8/10 parallel per lane; the pairs + lanes parallel per run; the DXY cascade is the ONLY sequential step (the macro level).
9. **The frozen pair stays frozen** — sl-lmv 91294083 · trade-dedup 33914c89 — byte-identical throughout.
10. **Adversarial testing only** — the G8 temporal negative control, the G10 parallel-equivalence, the shadow battery's zero-hint scenarios.

---

# PART 18 — THE GLOSSARY

- **The reasoning chain:** the 11-token forward-reasoning engine between E2 and E3.
- **The shadow agent:** the embedded LLM call (deepseek v4 flash via opencode go) driving tokens 8-11.
- **The stall detector:** the SSE-stream idle-window timer — aborts ONLY on a no-token window, never on a wall clock.
- **The TradeProjection:** the chain's output — E/SL/TP as checkable numbers, every anchor tracing to an E1 zone + an E2 projection.
- **The lanes:** E2_NATIVE (the day's own direction) · MACRO (the unified macro authority) · REACTION (the complement).
- **The phantom-BoM:** the type-2 virgin MoM — the fortress — the death-rule exemption.
- **The failure store:** the SQLite chain_failures table + the synthesis.
- **The micro level:** the per-pair pipelines — ALL parallel.
- **The macro level:** the DXY cascade layered on top — the ONLY sequential step.
- **The token-set:** 1 candle = 1 token; the set = the context (the TTE shapes).
- **The candle groups:** the touches + the pre-touch storyline + the post-reaction move.

---

---

# PART 19 — THE COMPLETE PSEUDOCODE (EVERY FUNCTION IN THE CHAIN)

## 19.1 buildReasoningChain — the main entry (the FULL pseudocode)

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

      THE LANE CONSTRUCTION (PART 3.2)
        lanes = buildLanes(dayDir, shape, supply, demand, deepDemand, longDemand, macro)
        ordered = dedupeByDirection(lanes).sort(byLaneRank)

      THE PER-LANE LOOP (the C1-parallel structure)
        priorTp = undefined
        for each lane in ordered:
          zone = lane.zone
          tokens17 = runTokens1to7(buildTokenContext(input, e2Day, zone, lane.direction, priorTp, ...))
          ctx = buildTokenContext(input, e2Day, zone, lane.direction, priorTp, dayIndex, dayKey, shape, dayOpenSpot, tokens17)

          THE C1 PARALLEL PAIR (the canon — PART 2.4)
            chainedEntry = token9_chaining(priorTp)                      // SYNC — ms
            [fp, anchorsOut] = await Promise.all([
              token8_forwardPosition(ctx),                               // LLM or deterministic fallback
              token10_anchorConstruction(ctx, deterministicFp(ctx, targets), chainedEntry),
            ])

          proj = assembleProjection(ctx, tokens17, fp, anchorsOut, chainedEntry)
          { projection, valid, hardThrow, warnings } = await runRefineRetry(proj, input, ctx)

          THE HARD-THROW DISPOSITION (data, never a crash)
            if hardThrow:
              hardThrows += 1
              failures.push({ pipelineStage:'E3', failureType:'REFINEMENT_EXHAUSTED', pair,
                              setupId: proj.setupId, warnings, projection,
                              nextSteps: [ 'Refine the operative-zone selection for ...',
                                           'Rerun the reasoning chain: bun diag-reasoning-chain.ts' ] })
              continue

          priorTp = projection.TP                                        // Law 27 — the lane chain
          llmTokens += count(llmRefined tokens) · refinements += count(REFINED verdicts)

          THE DIVERGENCE LAW (PART 3.4)
            if lane.lane === 'E2_NATIVE' && lane.direction !== macro.direction && shape === 'R':
              divergences.push(...) · recordFailure({ reason: 'MACRO_DIVERGENCE', ... })

          projections.push(projection)

  THE LEDGER
    ledger = { pair, week, anchorMs, tokens: projections.flatMap(p → p.tokenLedger),
               macroDirection: macro.direction, macroConsistent, divergences }

  THE RESULT
    return { projections, ledger, failures,
             stats: { deterministicTokens, llmTokens, refinements, hardThrows } }
```

## 19.2 runTokens1to7 — the deterministic core (the FULL pseudocode)

```
runTokens1to7(ctx: TokenSetContext) → TokenResult[]

  THE TOKEN 1 — ZONE-IDENTIFICATION
    zone = ctx.operativeZone
    classification = zone.classification
    deathVerdict = 'DEATH'   // the default — the virgin-MoM blanket rule
    if zone.classification === 'MoM' && zone.reactionCount === 0:
      if findFortressDemand(ctx.input.model, ctx.dayOpenSpot, ctx.input)?.id === zone.id:
        classification = 'PHANTOM_BOM'        // the exemption — the fortress
        deathVerdict = 'EXEMPT'
      else:
        deathVerdict = 'DEATH'                // the type-1 virgin MoM — the death rule stands
    push({ token:'zone-identification', deterministic:true, verdict:`${classification} ${deathVerdict}`,
           evidence:[`E1 zone ${zone.id}`, `virgin-MoM ${deathVerdict} rule`], confidence })

  THE TOKEN 2 — PRESSURE-STATUS
    side = zonePressureSide(zone)             // the candle-pressure lexicon's vote
    score = lifecycleScore(zone)              // the zone-pressure lexicon's recurrence
    push({ token:'pressure-status', deterministic:true,
           verdict:`${side} ${lifecycle(zone)} score ${score.toFixed(2)} mitigations ${zone.reactionCount}`,
           evidence:[`lifecycle ${lifecycle(zone)}`, `zfp ${zone.zfp}`, `pierced ${zone.pierced}`] })

  THE TOKEN 3 — LIQUIDITY
    rungsBelow = lmvTable.filter(r → r.center < zone.floor)   // the fuel beneath (LONG)
    rungsAbove = lmvTable.filter(r → r.center > zone.ceiling) // the fuel above (SHORT)
    nearest = nearestRung(lmvTable, dayOpenSpot)
    push({ token:'liquidity', deterministic:true,
           verdict:`nested ${nestedCount} below ${rungsBelow.length} above ${rungsAbove.length} nearest ${nearest.id}`,
           evidence:[`internal rungs ${nestedCount}`, `shields ${shieldCount}`] })

  THE TOKEN 4 — BREAK-VALIDATION
    breakVerdict = validateBreak(zone, bars ≤ anchorMs)
      // close-beyond the zone's far edge with no reclaim → 'BROKEN'
      // wick-through with the body closed back → 'UNBROKEN wick-reclaim'
      // never touched → 'UNBROKEN virgin'
    push({ token:'break-validation', deterministic:true, verdict:breakVerdict,
           evidence:[`narrative post-break zone ${postBreakZone}`] })

  THE TOKEN 5 — STRENGTH-COMPARISON
    buyImpulse = aggregateImpulse(bars, 'BUY', window3d)   // the 3-day window (the recency law)
    sellImpulse = aggregateImpulse(bars, 'SELL', window3d)
    stronger = buyImpulse > sellImpulse ? 'BUY' : sellImpulse > buyImpulse ? 'SELL' : 'EQUAL'
    push({ token:'strength-comparison', deterministic:true,
           verdict:`${stronger} delta ${abs(buy-sell).toFixed(2)} impulse ${max(buy,sell).toFixed(2)}`,
           evidence:[`aggregate 1H range split over ${bars.length} bars`] })

  THE TOKEN 6 — REACTION-COUNT
    count = zone.reactionCount
    thirdMitigation = count >= 3 ? 'ACTIVE — the third-mitigation doctrine' : 'not yet'
    push({ token:'reaction-count', deterministic:true, verdict:`mitigations ${count}`,
           evidence:[`the 'third mitigation' doctrine: ${thirdMitigation}`] })

  THE TOKEN 7 — CHAIN-PROGRESS
    stage = ctx.shape · dir = ctx.direction · remaining = 5 - dayIndex
    push({ token:'chain-progress', deterministic:true,
           verdict:`${stage} day ${dayIndex}/5`, evidence:[`chain direction ${dir}`, `days remaining ${remaining}`] })

  return tokens
```

## 19.3 token8_forwardPosition — the LLM hook (the FULL pseudocode)

```
token8_forwardPosition(ctx: TokenSetContext) → ForwardProjectionOutput

  targets = continuationTargetsFor(ctx.input.model, ctx.operativeZone, ctx.direction)
    // the KCE-Telescoping macro-origin continuation targets — the CLOSED set

  fp = deterministicForwardPosition(ctx, targets)
    // the skeleton: the price's position between the zone and the nearest target,
    // ratio-based widths (the SMC doctrine — never fixed pip numbers)

  sr = ctx.input.shadow
    ? await ctx.input.shadow.projectForward({
        pair, tokenLedger: ctx.tokens, operativeZone: ctx.operativeZone,
        dayOpenSpot, continuationTargets: targets, widthRatio: ctx.widthRatio,
        bars: ctx.input.barsByTf['1H'], pip: ctx.input.pip, macro: ctx.input.macro })
    : null

  if sr?.ok: return { ...sr.result, reasonTrace: [...fp.reasonTrace, ...sr.result.reasonTrace] }
  if sr: recordShadowDegrade(ctx, 'projectForward', sr.reason)   // the failure store
  return fp                                                      // the deterministic fallback
```

## 19.4 token10_anchorConstruction — the LLM hook (the FULL pseudocode)

```
token10_anchorConstruction(ctx, fp, chainedEntry) → AnchorOutput

  THE DETERMINISTIC CANDIDATES (the skeleton — computed BEFORE the LLM)
    slCandidate = computeMirrorSL(fp.forwardPosition, anchor, ctx.direction,
                                  ladder, pair, pip, atr1hPips)   // the SL at the next rung
    tpCandidate = computeMirrorTP(fp.forwardPosition, slCandidate, anchor, ctx.direction,
                                  ladder, pip, { passThroughWeakWalls: true })
                                  // the TP at the structurally-equivalent opposing BoM wall
    e2ProjectionId = e2ProjectionIdFor(ctx)

  sr = ctx.input.shadow
    ? await ctx.input.shadow.anchor({
        pair, direction, operativeZone: ctx.operativeZone, tokenLedger: ctx.tokens,
        e2ProjectionId, slCandidate, tpCandidate, atr1hPips, widthRatio: ctx.widthRatio })
    : null

  if sr?.ok: return { ...sr.result, anchors: withTraces(sr.result.anchors, e2ProjectionId) }
  if sr: recordShadowDegrade(ctx, 'anchor', sr.reason)
  return deterministicAnchor(ctx, fp, slCandidate, tpCandidate, chainedEntry)
    // the fallback: entry = the chained entry ?? the zone's near edge,
    // SL = slCandidate, TP = tpCandidate, the anchors traced to the e1 zone + e2 projection
```

## 19.5 runRefineRetry — the enforcement loop (the FULL pseudocode)

```
runRefineRetry(proj, input, ctx) → { projection, valid, hardThrow, warnings }

  p = proj · n = 0
  loop:
    // THE MECHANICAL FLOOR — ALWAYS the validity authority (PART 10.2)
    floor = computeMechanicalFloor(p, input)
    ledger = chainContextFor(p, input)

    // THE SHADOW VALIDATE — contributes ONLY its flags + the confidence delta
    shadowV = input.shadow ? await input.shadow.validateProjection(p, ledger) : null
    v = floor
    if shadowV?.ok:
      llmOnly = shadowV.result.warnings.filter(w → w.check === 'SHADOW_FLAG')
      v = { valid: floor.valid,
            warnings: [...floor.warnings, ...llmOnly],
            confidence: shadowV.result.confidence }

    if v.valid: return { projection: { ...p, validation: v }, valid: true, hardThrow: false, warnings: v.warnings }

    if n >= 3:   // the refinement budget exhausted
      recordFailure(p, v.warnings, 'REFINEMENT_EXHAUSTED')   // the SQLite store
      return { projection: p, valid: false, hardThrow: true, warnings: v.warnings }

    p = refine(p, v.warnings, input)        // re-run tokens 8-11 with the warnings as context
    n += 1 · p.chainContext.tokens = ledgerWithRefinement(p.chainContext, n)
```

## 19.6 The shadow client's callShadow (the Trident-v7.3 pattern — the FULL pseudocode)

```
callShadow(prompt, system, maxTokens) → { content, model, ok, error }

  key = resolveShadowApiKey()               // env → .env → embedded base64 (PART 4.4)
  if !key: return { ok:false, error:'SHADOW_BRAIN_NO_KEY' }   // the LOUD error BEFORE the transport

  THE SSE STREAM (the C4 stall detector)
    controller = new AbortController()
    idleTimer = null
    response = await fetch(`${baseUrl}/chat/completions`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${key}` },
      body: JSON.stringify({ model: SHADOW_MODEL, messages:[{role:'system',content:system},
                                                              {role:'user',content:prompt}],
                             reasoning_options:{ effort:'max' }, max_tokens, stream:true }),
      signal: controller.signal })

    if !response.ok:
      return { ok:false, error:`SHADOW_HTTP_${response.status}` }

    content = '' · reasoning = '' · done = false
    for await (chunk of response.body):            // the SSE chunk stream
      resetIdleTimer(90_000, () → controller.abort())   // THE IDLE WINDOW — per chunk
      for each SSE data line:
        if line === '[DONE]': done = true; break
        delta = parseDelta(line)                    // the OpenAI SSE delta shape
        if delta?.reasoning_content: reasoning += delta.reasoning_content
        if delta?.content: content += delta.content
      if done: break

    clearIdleTimer()
    if controller.signal.aborted:
      return { ok:false, error:'SHADOW_STALLED' }   // a TRUE stall — no tokens for 90s

    text = content || reasoning                     // the defensive read (the reference)
    if !text || text.trim().length === 0:
      return { ok:false, error:'SHADOW_EMPTY' }
    return { ok:true, content:text }                // the partial content KEPT on length-stop
```

---

# PART 20 — THE FULL WORKED EXAMPLE (THE OPERATOR'S EU #2 THROUGH THE TOKENS)

## 20.1 The golden-doc analysis (the operator, verbatim — the reasoning-token baseline)

> "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference"

The EU #2 (Mon LONG, E 1.14110, SL 1.13990, TP 1.14460, RRR 2.92):

> "1H Unmitigated MoM Demand zone at 1.14145-1.14000 from Thursday's Breakout Surge. This UM MoM zone of the BS is also simultaneously the UM BoM zone of the Whiplash move that was the 2nd leg of Thursday's breakout surge... This is clearly an area of strong pressure + bullish liquidity (macro liquidity beneath the actual friday whiplash move)... There is likely to be a reaction from this zone as the opposing bearish pressure is not yet strong enough to pierce it... This follows the shape chain forming of SS → BS... Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110-1.14020, and set TP at the near edge of the supply zone."

## 20.2 The token-by-token mapping (the operator's reasoning → the chain's tokens)

| The operator's reasoning (verbatim) | The token | The chain's emission |
|---|---|---|
| "1H Unmitigated MoM Demand zone at 1.14145-1.14000 from Thursday's Breakout Surge" | 1 zone-identification | the operative zone + the PHANTOM_BOM exemption (the type-2 fortress — the UM MoM of the BS = the UM BoM of the Whiplash's 2nd leg) |
| "This is clearly an area of strong pressure + bullish liquidity" | 2 pressure-status | BUY side · the lifecycle score · the wick-mass ratio |
| "macro liquidity beneath the actual friday whiplash move" | 3 liquidity | the LMV rungs below the demand (the fuel) |
| "the opposing bearish pressure is not yet strong enough to pierce it" | 4 break-validation | UNBROKEN — the zone has not been broken (the false-positive check) |
| "the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday" (the #6's strength read) | 5 strength-comparison | BUY impulse > SELL impulse — the delta + the impulse |
| "zones usually fail on the THIRD mitigation" (the #4's doctrine) | 6 reaction-count | mitigations 0 — the virgin fortress |
| "clearly in the SS consolidation phase after the full bullish SS/BS/R/WL chain just completed" | 7 chain-progress | SS day 1/5 · the chain direction · days remaining |
| "There is likely to be a reaction from this zone... the demand's pressure will react" | 8 forward-position | FORWARD — the price positioned toward the zone · the chosen target · the LLM's projection |
| "Set E at the TP level of trade #1" | 9 chaining | priorTp = 1.14110 → the chained entry |
| "SL 3 pips outside the far edge of the nested liquidity zone... TP at the near edge of the supply zone" | 10 anchor construction | E 1.14102 · SL 1.13917 · TP 1.14564 · RRR 2.50 (the measured shadow output) |
| "all the macro storyline confluences align" | 11 validation | VALID — the floor + the macro consistency + the confidence |

**THE MEASURED RESULT:** the chain emitted the EU LONG **E 1.14102 / SL 1.13917 / TP 1.14564** → the golden **1.14110 at Δ0.8p HIT** — the phantom-BoM fortress reproduced mechanically.

## 20.3 The EU #1 → #2 chaining (the cascade's kept structure)

The EU #1 (Mon SHORT, TP 1.14110) → the EU #2 (Mon LONG, E 1.14110 = the #1's TP). The chain's token 9 (chaining) carries `priorTp` across the lanes — the #1's TP becomes the #2's entry. This is the Law-27 chain the operator uses constantly ("Trade #1 literally sets this up").

---

# PART 21 — THE FAILURE-MODE ANALYSIS (EVERY ERROR PATH + THE DISPOSITION)

| The failure | The detection | The disposition |
|---|---|---|
| `SHADOW_BRAIN_NO_KEY` | the secrets chain resolves nothing | the LOUD error BEFORE any transport · the deterministic skeleton · the confidence capped 0.70 |
| `SHADOW_STALLED` | the SSE idle window (90s of no tokens) | the abort + the deterministic fallback + the SHADOW_DEGRADE recorded |
| `SHADOW_ABORTED` | the caller's signal | the deterministic fallback |
| `SHADOW_HTTP_<status>` | the endpoint's non-200 | the deterministic fallback + the status recorded (a 401 = the key wrong — the secrets chain re-checked) |
| `SHADOW_EMPTY` | content AND reasoning both empty | the deterministic fallback + the raw response shape recorded (the parser accepts string/array/reasoning — the emptiness is a real model failure) |
| `SHADOW_FAIL` | the transport error | the deterministic fallback + the message recorded |
| `SHADOW_INVENTED_ID` | a made-up zone/projection id in the response | a refinement warning (context-bearing) · retry · after 3 → the hard-throw → the store |
| `MACRO_DIVERGENCE` | the per-pair classification contradicts the macro | NOT an error — the macro wins the emission · the divergence recorded + stored (the flag) |
| `CONTRACT_VIOLATION` | E/SL/TP unordered · anchor-less | the hard-throw → `ProjectionContractError` → the store → the synthesis |
| `REFINEMENT_EXHAUSTED` | 3 failed refinements | the hard-throw → the store → the synthesis |
| The LLM hallucinated a target | the target not in the continuation set | a refinement warning · the target set is CLOSED (never extended by the LLM) |
| `bun:sqlite` unavailable | the failure-store open | `recordFailure` degrades to an append-only fallback row (never silently drops) |

---

# PART 22 — THE DATA FLOWS (END TO END)

## 22.1 The pipeline flow

```
bars_raw.json (/tmp/opencode/bars_raw.json — the fixture, the golden week)
  → THE TEMPORAL GATE (temporal.ts — the locked run-anchor, the bars ≤ the Monday 07:00 anchor)
  → buildChartModel(pair, WEEK, bars1H, bars4H, bars30m, spot, undefined, bars15m)
      the E1 zones (the MDVE model — the S/D OBs + the LQZ rungs + the 9-pillar IP zones)
  → generateSourceSetupsV45(models.DXY)            the DXY source setups
  → runPriorWeekPreflight(pair, {...})             the prior-week storylines (the macro arc)
  → buildE2Core(models, priorStorylines)           the shape chains {euCore, guCore, euCascaded, guCascaded}
  → cascadeV45(dxySetups, models, {...})           the EU/GU mirrors (status === 'ACTIVE' filtered)
  → THE MACRO AUTHORITY (macro-authority.ts)       the EU = DXY inverted · the GU = EU kept
  → buildReasoningChain(input)                     THE 11-TOKEN ENGINE (PART 19.1)
      per pair, per lane: tokens 1-7 → token9 → [token8 ∥ token10] → assemble → token11
  → TradeProjection[]                              the E/SL/TP as checkable numbers
  → floorSetupsToDedupRows + dedupTrades           the emission floor (frozen, unchanged)
  → THE GOLDEN GATE (diag-reasoning-chain-golden)  G1-G10 (PART 14)
```

## 22.2 The shadow-call flow

```
The chain's token8/token10/token11
  → ctx.input.shadow.{projectForward | anchor | validateProjection}
  → callShadow(prompt, system, maxTokens)          the frozen model · effort max · the SSE stream
  → the grounding contract checks (PART 10)
  → ACCEPT (llmRefined:true) | the deterministic fallback (confidence capped 0.70)
  → the SHADOW_DEGRADE / MACRO_DIVERGENCE records → the SQLite store
```

---

# PART 23 — THE DETERMINISM GUARANTEES

1. **The deterministic tokens (1-7) are byte-identical across runs** — the same bars + the same lexicons + no shadow call → the same ledger (the diag-obcv-golden O7 determinism doctrine extended to the chain).
2. **The LLM is the ONLY nondeterminism** — bounded to tokens 8-11, recorded as `llmRefined` per token.
3. **The parallel-equivalence (G10):** the C1 `Promise.all` MUST NOT change the projections — the deterministic skeleton's values are computed BEFORE the parallel dispatch, so the assembled projection is order-independent. The gate: the parallel run's ledgers byte-identical to the sequential run's.
4. **The temporal gate (G8):** no chain computation reads bars beyond ANCHOR_MS — the negative control (a later anchor) does not change the projections' anchors.

---

# PART 24 — THE SHADOW PROMPT ENGINEERING (THE ACTUAL PROMPTS)

## 24.1 The system prompt (the SHADOW_SYSTEM — the contract)

```
You are the shadow-enhanced reasoning brain of the Plutus trading pipeline.
You refine the FORWARD-PROJECTION tokens (8-11) of the deterministic reasoning chain.

THE DATA IS THE ONLY GROUND TRUTH. THE E1/E2 DATA OUTRANKS ANY CONTEXT.
You NEVER invent a zone id, a price, or a value that is not present in the input.
The chosenTarget MUST be one of the supplied continuationTargets (the target set is CLOSED).
The e1ZoneId/e2ProjectionId MUST be real ids from the input — an invented id is the worst error.
Output ONLY the requested JSON object. No prose. No preamble. No markdown fences.
If a value is ambiguous, omit it — the deterministic skeleton provides the fallback.
```

## 24.2 The projectForward prompt (the token-8 request)

```
THE TOKEN LEDGER (the deterministic tokens 1-7, FIXED):
  [zone-identification] <verdict> (conf <x>)
  [pressure-status] <verdict> (conf <x>)
  ... (all 7)

THE OPERATIVE ZONE: <id> (DEMAND, floor <f>, ceiling <c>, <classification>)
THE DAY OPEN SPOT: <spot>
THE CONTINUATION TARGETS (CLOSED SET — choose ONE): <targets>
THE MACRO: <pair> <direction> (<mirror> <inverted|kept> — the mirror law)
THE WIDTH RATIO: <widthRatio> (the zone width / ATR1h — the SMC ratio)
THE CANDLE GROUPS: touches [<touches>] pre-touch [<pre>] post-reaction [<post>]

REFINE THE FORWARD-POSITION TOKEN. Return ONLY JSON:
{"forwardPosition":number,"chosenTarget":number,"positionVerdict":"FORWARD"|"NOT_FORWARD","reasonTrace":[string]}
```

## 24.3 The anchor prompt (the token-10 request)

```
THE TOKEN LEDGER (tokens 1-7 + the forward-position verdict, FIXED)
THE OPERATIVE ZONE: <id> (floor/ceiling/classification)
THE E2 PROJECTION: <e2ProjectionId>
THE SL CANDIDATE: <slCandidate> (computeMirrorSL — the next rung's reactionExtreme + the Law-7 buffer)
THE TP CANDIDATE: <tpCandidate> (computeMirrorTP — the structurally-equivalent opposing BoM wall)
THE ATR1H: <atr1hPips> · THE WIDTH RATIO: <widthRatio>
THE CHAINED ENTRY: <chainedEntry | null> (Law 27 — the prior TP)

REFINE THE ANCHOR CONSTRUCTION. Return ONLY JSON:
{"entry":number,"sl":number,"tp":number,"rrr":number,"anchors":[{"role":"ENTRY"|"SL"|"TP","price":number,"method":string}]}
The anchors MUST satisfy: LONG sl < entry < tp · SHORT tp < entry < sl.
```

## 24.4 The validate prompt (the token-11 request)

```
THE PROJECTION: <the assembled TradeProjection — pair/direction/E/SL/TP/RRR/anchors>
THE LEDGER: <the 11-token ledger>
THE MACRO: <direction> · THE DIVERGENCES: <divergences>

VALIDATE. Return ONLY JSON:
{"valid":boolean,"warnings":[{"check":string,"token":string,"sourceRef":string,"value":unknown,"proposed":string}],"confidence":number}
```

---

# PART 25 — THE TEST PLAN (THE FULL BATTERY)

## 25.1 The shadow battery (the Trident-v7.3 zero-hint standard)

| The scenario | What it proves | The expected result |
|---|---|---|
| THE NO-KEY | the secrets chain resolves nothing | the LOUD error BEFORE any transport — SHADOW_BRAIN_NO_KEY — the deterministic skeleton |
| THE 401 | the endpoint rejects the key | SHADOW_HTTP_401 → the fallback → the secrets chain re-checked |
| THE EMPTY | the model returns no content | SHADOW_EMPTY → the fallback + the raw response shape recorded |
| THE PARTIAL-KEEP | stopReason 'length' with partial content | the partial content KEPT (never discarded) |
| THE STALL | the stream goes silent | the idle window → SHADOW_STALLED → the fallback |
| THE INVENTED-ID | the model fabricates a zone id | the grounding contract → a refinement warning → retry → after 3 → the hard-throw |
| THE LIAR | the context claims N functions over M | the [SHADOW INFERENCE]-style contradiction detector flags it |
| THE COHERENCE | 2 sequential runs in one session | the second references the first (the memory hydrates) |

## 25.2 The chain battery

| The scenario | What it proves | The expected result |
|---|---|---|
| THE DETERMINISM | the same bars + no shadow | the byte-identical ledger ×2 |
| THE PARALLEL-EQUIVALENCE (G10) | the C1 Promise.all | the projections byte-identical to the sequential run |
| THE TEMPORAL NEGATIVE (G8) | a later anchor | the projections' anchors unchanged |
| THE DIVERGENCE | an R-shape day contradicting the macro | the MACRO_DIVERGENCE recorded, the macro wins |
| THE FORTRESS | the phantom-BoM fixture | the token-1 verdict PHANTOM_BOM, the entry within 2p of 1.14110 |
| THE E3-NEVER | an anchor-less projection | the ProjectionContractError → the store → the synthesis |

## 25.3 The regression battery (must stay green)

`diag-obcv-golden.ts` · the diag-golden-coverage lineage · `diag-monday.ts` · `probe-step1d.ts` · `probe-label.ts` · `probe-mirror-sl.ts` · `diag-report-source.ts` · `diag-dump-dedup.ts` · the frozen pair sha256.

---

# PART 26 — THE DEPLOYMENT + THE CONTAINER PLAN

1. **The host verification:** `bunx tsc --noEmit` = 0 · `bun build src/index.ts --outdir dist --target bun` = success · the frozen pair byte-identical · the report determinism ×2.
2. **The wall-time measurement:** `time bun diag-reasoning-chain.ts` — the Monday run ≤ 5 min (the G9 performance gate).
3. **The container verification:** via trident-container-test — the fresh sandbox, the SHA-verified deploy, the TUI runs `bun diag-reasoning-chain-golden.ts` with the fixture mounted, the ContainerTestResult.json records the exit code + the ledger excerpts + the wall time.
4. **The visual eval:** the golden map overlaid with the generated projections, side by side.
5. **The running report:** every wave appends to `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` (append-only — the ENTRY-numbered sections).

---

# PART 27 — THE CANON DOC MAP (THE POST-COMPACTION READING ORDER)

1. `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.5.md` (3,040L) — the v4.5-era canon.
2. `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md` (4,504L) — the E1/E2/E3 canon + the 37 laws.
3. `MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md` (1,004L) — the fundamental law + the protocols.
4. **THIS SPEC** — the reasoning-chain architecture canon (the C1-C6 corrections).
5. `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` (301L) — the six lexicons.
6. `MASTER_CONTEXT/Plutus_Shark_Operator_Audit_Process.md` (544L) — the testing process.
7. The Trident v4.4.2 `SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md` — the shadow-backend reference (checkpoint 7.3).
8. `context_management/` — the canon docs (the DECISION_CHAIN D50-D60, the NEXT_STEPS, the EVIDENCE_STATE, the CURRENT_STATE, the BUILD_REPORT ENTRY 5).

---

# PART 28 — THE OPERATOR'S GOLDEN-DOC REASONING AS THE TOKEN BASELINE (THE 8 EU TRADES)

The operator's 8 EU analyses ARE the reasoning-token baseline. Every analysis maps to the 11 tokens — the chain's output must read like the operator's analysis:

| The EU trade | The operator's headline reasoning | The chain's token emphasis |
|---|---|---|
| #1 Mon SHORT 1.14395/1.14485/1.14110 | "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor... 1H Refined 4H supply zone at 1.14475-1.14625... strong pressure confirmed" | zone-identification (the refined-4H supply) + the anchor construction (the entry at the LQZ near edge) |
| #2 Mon LONG 1.14110/1.13990/1.14460 | "UM MoM Demand... strong pressure + bullish liquidity... the reaction WILL happen... Set E at the TP of trade #1" | the phantom-BoM exemption + the forward-position + the chaining (PART 20) |
| #3 Tue SHORT 1.14460/1.14560/1.14020 | "1H supply matches the element of 1H demand, and this is BoM so high pressure aligns with confluences... we can set TP at the far edge of the LQZ as this is expected to either pierce or deep mitigate" | strength-comparison + the TP strength-driven edge (the weak zone → the far edge) |
| #4 Wed LONG 1.14020/1.13970/1.14295 | "zones usually fail on the THIRD mitigation... a minor recovery will happen here... set the SL based on the DEMAND zone instead of the LQZ" | reaction-count (the 3rd-mitigation doctrine) + the SL relevance switch (the zone-pressure lexicon) |
| #5 Wed SHORT 1.14295/1.14330/1.14000 | "set E at the TP of trade #4... set TP at the far edge of the strong demand zone" | the chaining + the TP far-edge (the fortress demand) |
| #6 Wed LONG 1.13935/1.13850/1.14475 | "this 'break of structure' could be a false positive... this ZONE has not yet been broken... the market structure is still BULLISH" | the break-validation (the E1 pressure validates the break) + the strength-comparison |
| #7 Thu LONG 1.14225/1.14165/1.14555 | "Fib aligned, pressure mechanics aligned, market structure aligned" | the chain-progress + the anchor construction (the next LQZ rung up the ladder) |
| #8 Fri SHORT 1.14555/1.14540/1.14165 | "this supply zone is likely to become a fortress zone and NOT get pierced... WL → RWL is a common shape chain" | the zone-pressure (the fortress detection — 4 prior mitigations, 3+4 weak) + the chain-progress |

---

---

# PART 29 — THE GU MONDAY R ROOT CAUSE (D59 — THE UNIFIED MACRO AUTHORITY'S TARGET)

## 29.1 The symptom

The Monday harness measured the GU LONG at the operator's golden 1.33330 → **NONE (MISSING)**. The GU Monday was classified **R:SHORT** while the operator's golden was **WL LONG**. The EU swept a LOW; the GU swept a HIGH — the per-pair storylines diverged and the GU's classification produced the wrong direction.

## 29.2 The root cause (the wave-A trace)

```
THE GU MONDAY R — THE ROOT CAUSE (the wave-A's trace — the operator's Q8 answer)
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

## 29.3 The fix (the unified macro authority — the MACRO lane)

The chain's MACRO lane (PART 3.2) flips the emission to the macro direction: the EU's SS (the DXY-inverted mirror) → the GU's SS → the LONG lane fires at the demand 1.33270 → the operator's WL LONG becomes possible. The per-pair R divergence is RECORDED (the MACRO_DIVERGENCE failure row), never suppressed — the macro wins the emission (the D50/D59 discipline).

## 29.4 The cascade laws (the operator, verbatim — the authority's basis)

> "Everything I found on this EU chart maps 1:1 to DXY EXACTLY simply in the inverse direction. All the zone elements are the same, shapes, trade setups, etc LITERALLY EVERYTHING IS THE SAME the only thing that changes are the actual price levels between the pairs."

> "GU's E2 follows the same macro shape chain as EU... it will still react though to exactly the same E1 zones... this is way we are matching ZONE ELEMENTS not fucking price levels"

> "we are matching ZONE ELEMENTS not fucking price levels. a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point"

> "they ARE allowed to have their own mechanics but unified macro signal has authority"

---

# PART 30 — THE FILL-MODEL LAW (THE DAY-END FAST-FORWARD — THE OPERATOR'S CORRECTION)

## 30.1 The law (the operator, verbatim)

> "temporal lock is for pipeline generation. once everything is generated you obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1 hour before market close to accurately see what E/SL/TP were actually hit"

## 30.2 The two-phase semantics

1. **THE GENERATION (gated):** the temporal lock (`--day=YYYY-MM-DD` + `--time=HH:MM`, the 07:00 UTC default) governs the pipeline generation — NO forward data, NO look-ahead in the chain's inputs. The anchor is LOCKED one-way until the pipeline finishes.
2. **THE OUTCOME SIMULATION (ungated — BY DESIGN):** the fill-sim fast-forwards to the day-end (the NY close minus 1 hour = 20:00 UTC) to measure what E/SL/TP were ACTUALLY hit.

**THE MEASURED PROOF:** the DXY SHORT's WIN +2.81R (entry 101.143, SL 101.229, TP 100.9015, exit 100.9015 = the TP, filled Mon 06:00 ET) — a legitimate day-end result, NOT a look-ahead violation. The earlier "look-ahead" flag on this row was the WRONG reading — the operator corrected it: the temporal lock governs the GENERATION; the day-end fast-forward is the DESIGN.

---

# PART 31 — THE DATA PROVENANCE (THE BROKER LAYER)

## 31.1 The broker law (the operator, verbatim)

> "The golden trades are all on the ICE broker. you need to use the data from the same broker so the candles match... tvdatafeed should have a broker filter so you can get accurate data from the correct broker"

## 31.2 The mapping

| The pair | The broker (the golden doc's own headers) | The fetch |
|---|---|---|
| EUR/USD | ICE | `scripts/fetch-bars.ts` — the broker map (EUR→ICE) |
| GBP/USD | OANDA | the broker map (GU→OANDA) |
| DXY | ICE | the broker map (DXY→ICE) |
| AUD/USD | — | PROPOSED-gated |

## 31.3 The fixture's measured provenance (the honest state)

- The fixture: `/tmp/opencode/bars_raw.json` (the spans: EUR 1H 1777568400000 → 1785211200000).
- The measured contamination: **4573 of 7817 bars post-anchor** (the fixture contains post-week bars — the temporal gate drops them at the source; the honest state documented in `MASTER_CONTEXT/DATA_PROVENANCE.md`).
- The options data: `/tmp/opencode/options_walls.json` (the EUR/USD-only walls — the JUL-6 image).
- The variance risk: the golden trades are on the ICE/OANDA brokers; the fixture is the TradingView tvDatafeed fetch — every pip measurement carries the variance. The broker-corrected fetch is the future path.
- The honest state: tvdatafeed ABSENT from node_modules — the live fetch exits 1 with the [DEP] remedy (bun add tvdatafeed) — NO fake success.

---

# PART 32 — THE DOCTRINE REGISTER (THE OPERATOR'S RULINGS THIS ARCHITECTURE SERVES — VERBATIM)

1. THE TEMPORAL LAW: "IN A REAL FUCKING LIVE MARKET FORWARD DATA DOESNT EXIST... TODAY IS WHATEVER DATE WE SET WHEN RUNNING THE PIPELINE. THERE IS NO FUCKING FORWARD LOOKING."
2. THE DAY-BY-DAY LAW: "MONDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL MONDAY / TUESDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL TUESDAY / ETC"
3. THE RECENCY LAW: "DO NOT ever use 1 week old candles to make decision on E1/E2/E3 mechanics to today's trades. EVER."
4. THE STRUCTURE LAW: "Sell side liquidity sits in supply zones. buy side liquidity sits in demand zones."
5. THE SEMANTICS LAW: "the rendered artifacts are the candles/zones/OHLC data ~ first principles macro context is the pressure mechanics, shape chain, etc"
6. THE MAPPING LAW: "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs"
7. THE CASCADE LAW: "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP OF THE EU/GU PAIR NATIVE E1 ANCHORS. IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY."
8. THE NATIVE-LANE LAW: "RUN THE SAME FUCKING PIPELINE THAT DXY USES TO GENERATE ITS SETUPS ON EU + GU W/ NO CASCADE. IT SHOULD LITERALLY GENERATE THE GOLDEN SETUPS BY DEFAULT"
9. THE MIRROR LAW: "the EXACT analysis + trades I did on EU LITERALLY EXIST on DXY in the inverse direction verbatim 1:1... same zones, same shapes, same trade setups same time, practically even down to the individual candle with 10-15% variance"
10. THE GU-CASCADE LAW: "GU's E2 follows the same macro shape chain as EU... we are matching ZONE ELEMENTS not fucking price levels"
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
21. THE FILL-MODEL LAW: "temporal lock is for pipeline generation. once everything is generated you obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1 hour before market close to accurately see what E/SL/TP were actually hit"
22. THE PARALLEL LAW (THIS SESSION): "8, 9, and 10 can all run async in parallel these do not need to be sequential. 11 can come after these are done and assembled"
23. THE TOPOLOGY LAW (THIS SESSION): "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"
24. THE STALL-DETECTOR LAW (THIS SESSION): "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"
25. THE NO-FALLBACK-CREEP LAW (the Trident-v7.3 canon, adopted): "DO NOT USE DEEPSEEK PRO. EITHER IT WORKS OR WE GET A VISIBLE LOUD ERROR"

---

# PART 33 — THE COMPACTION-PROOF SUMMARY (THE ONE-PAGE CANON)

1. The reasoning chain = the 11-token forward engine between E2 and E3 — the operator's missing judgment layer.
2. Tokens 1-7 = the deterministic 70% (ms-scale). Tokens 8-11 = the shadow-refined 30% (the ONLY clock).
3. **Tokens 8/10 run in PARALLEL** (C1); token9 sync; token11 after assembly.
4. **All 3 pairs + N lanes run in PARALLEL** (C3 micro); the DXY cascade AFTER as the macro refinement (the ONLY sequential step).
5. **The timeout = the SSE idle-window stall detector** (C4) — kills stalls, never working generations.
6. **The shadow backend = the Trident-v7.3 pattern** (C2): the frozen model, the secrets chain env→.env→embedded, the encoded errors never thrown, the content||reasoning keep.
7. The failure store = the SQLite chain_failures table (week + reason indexes) + the synthesis.
8. The phantom-BoM exemption at shape-brain.ts:2330-2336 (the all-4 predicate) + the unified macro authority (the MACRO lane).
9. The acceptance = the Monday goldens (G1-G10) — the EU LONG Δ0.8p the current hit — the performance gate G9 (≤ 5 min).
10. The frozen pair byte-identical (sl-lmv 91294083 · trade-dedup 33914c89) · the determinism ×2 · the zero broken windows.

---

# PART 34 — THE GLOSSARY (EXPANDED)

- **The reasoning chain:** the 11-token forward-reasoning engine between E2 and E3.
- **The shadow agent:** the embedded LLM call (deepseek v4 flash via opencode go) driving tokens 8-11.
- **The stall detector:** the SSE-stream idle-window timer — aborts ONLY on a no-token window, never on a wall clock.
- **The TradeProjection:** the chain's output — E/SL/TP as checkable numbers, every anchor tracing to an E1 zone + an E2 projection.
- **The lanes:** E2_NATIVE (the day's own direction) · MACRO (the unified macro authority) · REACTION (the complement).
- **The phantom-BoM:** the type-2 virgin MoM — the fortress — the death-rule exemption.
- **The failure store:** the SQLite chain_failures table + the synthesis.
- **The micro level:** the per-pair pipelines — ALL parallel.
- **The macro level:** the DXY cascade layered on top — the ONLY sequential step.
- **The token-set:** 1 candle = 1 token; the set = the context (the TTE shapes).
- **The candle groups:** the touches + the pre-touch storyline + the post-reaction move.
- **The deterministicFp:** the skeleton's forward-position computed BEFORE the parallel dispatch (the C1 anchor input).
- **The idle window:** the 90s no-token period that triggers the SHADOW_STALLED abort.
- **The SSE stream:** the streaming response — the per-chunk timer reset mechanism.
- **The secrets chain:** env → .env → the embedded base64 key resolution (never logged).
- **The G10 parallel-equivalence:** the parallel run's projections byte-identical to the sequential run's.
- **The G9 performance gate:** the Monday diag ≤ 5 min wall time.
- **The divergence law:** a per-pair classification contradicting the macro = recorded, the macro wins.
- **The MACRO_DIVERGENCE:** the failure-store reason for the per-pair-vs-macro contradiction.
- **The day-end fast-forward:** the outcome simulation to the NY close minus 1 hour (the fill-model law).
- **The temporal gate:** the locked run-anchor — the generation's forward-data barrier.

---

---

# PART 35 — THE TOKEN-SET CONSTRUCTION (THE SHADOW'S CONTEXT — THE CANDLE GROUPS)

## 35.1 The token-set semantics (the operator, verbatim)

> "1 candle = 1 token. 1 token by itself does not provide any meaningful data. A set of tokens in a structured dataset = relevant context (TTE shapes)"

## 35.2 The candle groups (the operator, verbatim)

> "the group of relevant candles near a zone are the candles that actually touch the zone and the context/storyline of the candles BEFORE they touch the zone + what is going to happen after they touch (post reaction move)"

## 35.3 The construction (src/mdve/token-set.ts — PROPOSED)

```
buildTokenSet(barsByTf, zone, CLUSTER_TOLERANCE_PIPS=2) → TokenSet
  THE WIDENED BAND: [zone.floor − ε, zone.ceiling + ε]  (ε = 2 pips — the LMV reaction band)
  THE GROUPS:
    touches       = the bars intersecting the band — the reaction candles (the vote inputs)
    pre-touch     = the bars BEFORE each touch — the storyline leading into the zone
                    (the "context/storyline of the candles BEFORE they touch")
    post-reaction = the bars AFTER each touch — the move that followed
                    (the "what is going to happen after they touch")
  THE TOKENS: each candle = one token row
    { t, O, H, L, C, group: 'touch'|'pre'|'post', vote, wick }
  THE SHADOW'S INPUT: the serialized token-set (the structured rows), NEVER the raw OHLC dump
```

## 35.4 The vote mechanics (reused verbatim from the probe-label discipline)

- fromAbove fell-in → BUY · fromBelow rose-in → SELL · dwell lower/upper wick · tie → close-vs-center
- the 3-day window (the recency law) scopes the vote; the 6-week lookback = the WHERE only

---

# PART 36 — THE KCE-TELESCOPING + THE ZONE-ELEMENT MECHANICS (THE REASONING CHAIN'S REFERENCES)

## 36.1 The telescoping law (the operator, verbatim)

> "S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"

> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"

> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"

> "All of these are telescoping refinment procedures."

## 36.2 The KCE-Telescoping (the deterministic pipeline for the macro-origin continuation)

The reference docs: `V3.4_KRONOS_CANDLE_ENGINE_SPEC.md` + `VISUAL_TELESCOPE_CHARTING_T2.md` + the `Zone_Element_Mechanics.md` — the deterministic pipeline that:
1. looks up the zone's macro-origin element across the TF hierarchy (the 4H origin → the 1H refinement → the 30m detail)
2. matches the ZONE ELEMENTS (the BoM-to-BoM, the Supply-to-Demand), never the price levels
3. produces the continuation targets — the CLOSED set the chain's token 8 consumes

> "we are matching ZONE ELEMENTS not fucking price levels. a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point"

## 36.3 The phantom-BoM's macro-origin continuation (the predicate's telescoping)

The phantom-BoM's 4th criterion (the macro-origin continuation) = the telescoping lookup: the zone's containing 4H structure (the origin element) + the swing-completion check (the move completes the full swing from the macro origin) — the deterministic pipeline (the audit process Part 11.3).

---

# PART 37 — THE PRIOR-WEEK PREFLIGHT (THE MACRO ARC — THE STORYLINE CONTEXT)

## 37.1 The operator's directive (verbatim)

> "the previous weeks entire E1/E2/E3 pipeline needs to be BACKWARDS MAPPED ON THE AVAILABLE HISTORICAL DATA AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE MACRO STORYLINE as part of the reasoning chain that feeds into the forward looking E1/E2/E3 of the upcoming week"

## 37.2 The module (src/mdve/prior-week-preflight.ts — SOLID, d9054cbc)

`runPriorWeekPreflight(pair, {barsByTf, weekStartMs, anchorMs})` — the prior week's storyline context:
- the sweep origin (the DXY 100.603 @ Jul 3 — COMPUTED, never hardcoded)
- the range · the defended/broken zones (Law 28) · the role reversals (Law 29) · the depletion
- the prior shape chain — the macro arc feeding the forward E2

**The chain's consumption:** the prior-week storyline feeds the E2's storyline context (the macro arc) + the token 7's chain-progress (the chain stage within the arc).

---

# PART 38 — THE OPERATOR'S FIVE PHANTOM-BoM ANSWERS (D56 — THE FORMATION-WINDOW DOCTRINE)

## 38.1 The formation-window (the classification timing)

> The classification happens AT the formation time (the Thurs→Mon = the 3-day window!) + the temporal-rewind capability (the micro-analysis of the zone's formation window!) + the day-end post-hoc verification — the verdict IS known at the Monday decision (it anchors the trades!).

**The chain's implementation:** the phantom-BoM classification consults the zone's FORMATION-WINDOW (the 3-day window ending at the run anchor) — never the post-formation price action. The temporal-rewind (unlocking the temporal filter for the micro-analysis) is the capability; the verdict anchors the trade at the Monday decision.

## 38.2 The narrative coherence (the fortress-BoM = SEPARATE)

> The #8's fortress = a VISIBLE fortress BoM (the Jun-22-OB 1H Refined 4H supply!) — SEPARATE from the phantom BoM (the type-2 virgin MoM!) — the spec's new fortress-bom family!

The two families are distinct (PART 11.7): the phantom-BoM = the MoM-disguised BoM (the formation disguise); the fortress-BoM = the proven BoM (the mitigation history).

## 38.3 The TF hierarchy (the King/General/Captain)

> The 4H King (the E2 chain!) · the 1H General (the E3 setups!) · the 30m Captain (the per-trade context!) — HTF > LTF — the death-rule scope: the 30m virgin MoMs + the 1H type-1 ONLY (the 4H zones never — all get >= 1 reaction!)

The virgin-death-scope family (PART 11.6) implements this mechanically.

## 38.4 The TF-scoped pressure (the pressure set by the HTF, cascaded down)

> The pressure set by the HTF, cascaded down — the 4H maps the week, telescoped to the 1H, refined on the 30m.

The tf-hierarchy family (PART 11.6) + the KCE-Telescoping (PART 36) implement this.

## 38.5 The full forward propagation

> The phantom-BoM exemption propagates through the whole chain.

The token-1's PHANTOM_BOM verdict → tokens 2-7 read the fortress's pressure state → token 8's forward-position → token 10's anchor construction (the E at the golden band) → token 11's validation — the exemption propagates end-to-end.

---

# PART 39 — THE SESSION'S MEASURED EVIDENCE (THE BUG + THE FIX — THE RECORD)

## 39.1 The hang (the 30-minute mystery — the measured truth)

| The evidence | The value | The reading |
|---|---|---|
| The diag log after 30 min | 32 lines, ending at "=== THE REASONING CHAIN ===" | the FIRST lane's first LLM call was in flight the whole time |
| The endpoint probe (short prompt) | HTTP 200 in 61.9s · content 259 chars · reasoning 5914 tokens · finish_reason stop | the endpoint works — the model self-terminates (128K is a ceiling, not a target) |
| The call count | 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL calls | the sequential architecture = the hang |
| The timeout | 600s wall-clock cap per call | ANY call exceeding 600s was killed mid-reasoning — the "progress" was aborts |
| THE ROOT | 24 sequential LLM calls × the wall-clock cap | the C1+C3+C4 fixes |

## 39.2 The fixes (the operator's corrections — the canon)

| The correction | The fix | The expected result |
|---|---|---|
| C1 | the token 8/10 `Promise.all` | 2 LLM calls per lane → 1 wall-clock slot |
| C3 | the pairs + lanes parallel | the wall time = the slowest pair ≈ 2-4 min |
| C4 | the SSE idle-detector | a working generation never dies — only stalls abort |

---

*END OF THE L2 SPEC — THE ARCHITECTURE CANON. The operator's six corrections (C1-C6) are the law. The Trident v4.4.2 checkpoint 7.3 is the shadow-backend reference. The diagrams are the session's mapped diagrams. The golden gate (G1-G10) is the acceptance. The operator's golden-doc analyses are the reasoning-token baseline. The doctrine register (PART 32) is the law the architecture serves. The formation-window doctrine (PART 38) is the phantom-BoM's timing law. Doctrine is QUOTED, never synthesized.*
