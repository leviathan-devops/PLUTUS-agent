# PLUTUS v4.5.4 OVERHAUL — SHARK-CME ENGINEERING SPEC (THE AGENT-IN-THE-LOOP RESTORATION)
## THE FULL 4.5.4 REASONING-CHAIN OVERHAUL: THE SHADOW RETIREMENT · THE PRIMARY-AGENT REASONING STEPS (STEP A BETWEEN E1/E2 · STEP B BETWEEN E2/E3) · THE E1 MATH ENGINES (TELESCOPING T1-T6 · LMV RESOLUTION · OBCV) · THE SIX LEXICONS WIRED · THE E3 PRECISION · THE W6 GOLDEN GATE · HOST-BASED TESTING

**Version:** 2.0 (CME grade) · **Date:** 2026-08-08 · **Status:** BUILD AUTHORITY — supersedes PLUTUS_V4.5.4_OVERHAUL_L1_SPEC.md (v1.0, the 722-line plan — SUPERSEDED as napkin-grade)
**Purpose:** The complete engineering specification for the 4.5.4 overhaul, at the same grade as the operator-approved PLUTUS_V4.5.2_OVERHAUL_ENGINEERING_SPEC.md (1,126L) + PLUTUS_V4.5.2_ZR7_OVERHAUL_SPEC.md (1,142L): the operator's doctrine verbatim, the forensic derailment inventory with file:line anchors, the module-level fix plan (per module: the exact file:line insertion points, the before/after), the invariants, the test specs written BEFORE the code, the acceptance gates per phase, the function-level spec, the pseudocode, the data contracts, the forensic evidence trails, the ASCII diagrams for every illustrated concept, and the wave dispatch plan.
**Predecessor canon:** PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md (2,051L — the C1-C6 + the G1-G10) · PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC.md (687L — the design origin) · HANDOVER_PACKAGE_4.5.4/ (the measured state) · T1_MULTI_TOOL_CHAIN_PIPELINE.md (844L — the wiring law) · PLUTUS_V4.5.2_OVERHAUL_ENGINEERING_SPEC.md (the CME-grade template)
**Baseline (operator-locked):** the frozen pair sl-lmv `912940832fac44bc` + trade-dedup `33914c897e777540` byte-identical · tsc 0 · the Monday oracle (DXY L 100.945 / DXY S 101.140 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330 at ≤3p) · ANCHOR_MS=1783702800000 · WEEK_START_MS=1783296000000 · DXY_PIP=0.01 · EU/GU 0.0001 · the golden const = TEMPORARY ARCHITECTURE (measurement oracle only)

---

# PART 0 — THE ARCHITECTURE (operator-mandated)

## 0.1 The Operator's Directives (verbatim — the law this spec serves)
Every directive below is QUOTED verbatim (D13 — doctrine is quoted, never synthesized) with its architectural consequence. These are the LAW; anything that contradicts them does not get built.

| # | The directive (verbatim) | The source | The architectural consequence |
|---|---|---|---|
| D1 | "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop" | the handover README:23 | The shadow executor is RETIRED — deleted as the LLM executor. The PRIMARY agent reasons in-session, visible, as the pipeline STEP's executor. No external model call exists in the reasoning path. |
| D2 | "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop." | the handover README:29 | The machine's validation of the agent's output = a WARN that CONTINUES the agent loop. The hard-throw ONLY after 3 failed refinements. A first-violation hard-kill is the derailment. |
| D3 | "How is DXY higher R than EU + GU that makes no sense" + "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5." | the handover README:35-41 | The forced-2.5-RRR ratio-extension is REMOVED as a TP source. The RRR emerges from the zone geometry (the E/SL/TP from the pressure mechanics). Never a target to force. |
| D4 | "what are these trades if not the golden hits? are these even valid? the only trades valid for Monday are the golden trades what are these?" | the handover README:47 | The golden convergence is the ONLY metric. Every emission carries the golden-convergence table (the per-trade delta). The emissions are NOT valid trades until they converge. |
| D5 | "i dont even understand what the fuck you are building right now and how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline." | the handover README:53 | The reasoning chain = the pipeline STEP: harvest → zones → shapes → REASONING → setups → report + gate. A proper in-between step with reasoning-informed generation of the next phase. |
| D6 | "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL" | the handover README:59 | The task tool is the ONLY spawn path. The wave-dispatcher's spawn is broken — never wait on a spawn that did not return a sessionId. |
| D7 (NEW — this session) | "we are replacing all shadow agent steps with the proper primary agent so that we can accurately see what is happening. This is how it should be anyways the shadow agent was a cheat basically." | the operator, 2026-08-08 | The shadow was a CHEAT (a context-less external model call). The primary agent IS the reasoner — the T1 §8.2 doctrine: "the agent IS the VLM" — same context, same identity, no external calls. |
| D8 (NEW — this session) | "the reasoning chain needs to be a manual agent step in between specific tool calls... in the actual E1/E2/E3 pipeline this needs to happen between E1/E2 + E2/E3 as a proper in between step that has reasoning informed generation of the next phase." | the operator, 2026-08-08 | TWO agent-reasoning steps: STEP A between E1 (the zone map) and E2 (the shape chain); STEP B between E2 and E3 (the trade setups). Each step's reasoning informs the generation of the next phase. |
| D9 (NEW — this session) | "We have not been using the actual agent for the last several builds... now though we need a proper agent-reasoning step and also to finish overhauling the math/computation engines + the lexicons that are being worked on" | the operator, 2026-08-08 | The overhaul has THREE workstreams: (1) the agent-reasoning steps wired, (2) the math/computation engines finished (telescoping · LMV · OBCV), (3) the six lexicons wired. |
| D10 (NEW — this session) | "when it is ready i will deploy the full plutus agent as a subagent on host so we can test directly in this session and not waste time on container garbage" | the operator, 2026-08-08 | The testing path = the HOST deployment (the plutus agent as a subagent via the task tool). NO container. The diag harnesses run directly on the host. |

**The directives register's session rulings (2026-08-08, this session):** the operator confirmed the plan-only framing first, then ordered the spec written to CME grade, the wave dispatch plan included (the trident-dispatch-templates), and the ASCII diagrams for every illustrated concept.
## 0.2 The T1 Multi-Tool-Chain Doctrine (the wiring law — restored)
T1_MULTI_TOOL_CHAIN_PIPELINE.md (844L, 2026-07-20, status PROVEN WORKING — "6 trade setups generated end-to-end, mechanical firewalls enforced") is the WIRING LAW this overhaul restores. It is the operator's own architecture for how the agent reasons between tool calls.

**The T1 problem statement (why the multi-tool chain exists — verbatim):**
> "A monolithic tool runs ALL logic inside a single execute() function. The agent calls it once and gets a result. This has three critical flaws: (1) No agent reasoning between steps — the agent can't inspect intermediate output, catch errors, or adjust course (2) No enforcement of manual steps (3) VLM analysis is external."
> "The multi-tool chain solves this by splitting the work into N separate tools. The agent calls them sequentially, with reasoning steps between each call. Each tool validates the previous step's output before executing — making it mechanically impossible to skip steps or fabricate data."

**The T1 architecture (the diagram — the concept this overhaul restores):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE T1 MULTI-TOOL CHAIN (the agent reasons BETWEEN calls)   │
└──────────────────────────────────────────────────────────────┘

  Agent (TUI)
    │
    ├── Calls Tool 1 ──► Tool executes ──► Returns data + "NEXT: do STEP A"
    │                                                   │
    │     AGENT REASONS (reads output, does analysis) ◄──┘
    │                                                   │
    ├── Calls Tool 2 ──► BEFORE HOOK validates STEP A's output exists
    │                   Tool executes ──► Returns data + "NEXT: do STEP B"
    │                                                   │
    │     AGENT REASONS ◄───────────────────────────────┘
    │                                                   │
    ├── Calls Tool 3 ──► BEFORE HOOK validates STEP B
    │                   Tool executes ──► Returns data
    │                                                   │
    │     AGENT REASONS ◄───────────────────────────────┘
    │
    └── Calls Tool N ──► BEFORE HOOK validates STEP N-1
                        Tool executes ──► Returns FINAL result
```

**The key principle (verbatim — the load-bearing sentence):**
> "The agent is NOT a passive caller. Between each tool call, the agent performs reasoning that is REQUIRED for the next tool to function. The next tool's arguments MUST contain the output of that reasoning."

**The five T1 mechanisms (each restored in this overhaul):**

| # | The mechanism | The T1 section | The 4.5.4 application |
|---|---|---|---|
| 1 | The global pipeline context (module-level state) | T1 §3.1 | the PipelineRunContext gains `stepADesignation` + `projections` (see Part 8) |
| 2 | The tool registration via a factory | T1 §3.2 | the 7-tool registry in engine.ts (see Phase 7) |
| 3 | The mechanical firewalls (3 layers) | T1 §3.3 | the file-existence layer (fs.access) + the semantic layer (the zone-id membership + the contract asserts) + the format layer (the price references) |
| 4 | The tool output with the embedded NEXT instruction | T1 §3.4 | every tool's output ends with the NEXT step (the STEP A/B instructions) |
| 5 | The SDK client bridge | T1 §3.5 | SUPERSEDED by D7 — the primary agent IS the reasoner; the SDK bridge's lesson (T1 §8: "the agent IS the VLM") is the doctrine, the bridge itself is retired with the shadow |

**The T1 §8 architecture decision (the shadow-cheat root — verbatim):**
> "The old pipeline called an external API with a hardcoded API key. This was wrong because: (1) The model received NO identity context (2) The model was a blank slate trying to analyze charts without trading expertise (3) The call bypassed the agent's conversation context."
> "The fix: SDK Client Bridge — the model sees the system prompt AND the data. It produces analysis as if it IS the trading expert — because it IS."

**The 4.5.4 correction (D7):** the shadow re-introduced the EXACT violation T1 §8 killed — an external model call with no conversation context. The correct fix is one step further than T1's SDK bridge: the PRIMARY AGENT itself reasons in its own context — the reasoning is visible in the stream (D1: "so we can see everything"), the identity is the full Plutus identity, the conversation context is the full pipeline state. The machine computes; the agent decides; the firewalls enforce.
## 0.3 The Target Architecture (the agent-in-the-loop E1/E2/E3 pipeline)
The target is the T1 architecture restored + the v4.5.4 reasoning chain inserted as TWO explicit agent-reasoning steps in the E1/E2/E3 flow. The machine computes everything; the PRIMARY agent decides everything — in-session, visible (D1/D7/D8).

```
┌──────────────────────────────────────────────────────────────┐
│  TARGET — THE AGENT-IN-THE-LOOP E1/E2/E3 PIPELINE (7 tools)  │
└──────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │ 1 plutus-pipeline-harvest                                  │
  │   OHLC 4H/1H/30m/15m · the temporal anchor (ANCHOR_MS)     │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ 2 plutus-pipeline-zones (E1)  ◄── telescoping T1-T6        │
  │   the zone map (S/D + LQZ + OBs)                           │
  │   ◄── LMV resolution (modal-cluster, 1p dedup)             │
  │   ◄── OBCV (the 4 sub-engines)                             │
  │   ◄── lexicons 1·3·4 classify the map                      │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ▶ AGENT REASONING STEP A   (between E1 and E2 — NEW)        │
  │    the agent READS the zone map + the pressure state + the  │
  │    lexicons' classifications → the E2 ZONE DESIGNATION      │
  │    ("Monday's path visits supply zone X at 1.14544")        │
  │    ─ the reasoning is VISIBLE in the stream, in-session     │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼   ← the designation is the
  ┌────────────────────────────────────────────────────────────┐  contracted input
  │ 3 plutus-pipeline-shapes (E2)  ◄── lexicon 5 (the chain +   │  of the E2 tool,
  │   the shape chain BUILT ON the designated zones             │  validated by the
  └──────────────────────────────┬─────────────────────────────┘  mechanical firewall
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ▶ AGENT REASONING STEP B   (between E2 and E3 — THE CHAIN)  │
  │    T1..T7   the MACHINE computes the ledger (ms, shown)     │
  │    T9       chaining sync (Law 27: TP of N = entry of N+1)  │
  │    T8/T10   THE PRIMARY AGENT reasons in-session:           │
  │             forward-position · anchor construction          │
  │             (the SHADOW IS GONE — no external fetch)        │
  │    T11      the MACHINE validates: grounding WARN + refine  │
  │             ≤3 (D2) — hard-throw only after 3               │
  │    OUTPUT   TradeProjection[] (E/SL/TP + anchors traced)    │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼   ← the projections are the
  ┌────────────────────────────────────────────────────────────┐  contracted input
  │ 4 plutus-pipeline-setups (E3)  ◄── lexicon 6 (the obvious-  │  of the setups tool,
  │   resolves the projections' anchors (E3-NEVER enforced)     │  validated by
  └──────────────────────────────┬─────────────────────────────┘  assertProjectionContract
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ 5 plutus-pipeline-gate (the W6 golden gate — G1-G10)        │
  │   the convergence table per emission (D4) · ≤3p tolerance   │
  │   G9 wall ≤5min · G10 parallel-equivalence                  │
  └────────────────────────────────────────────────────────────┘
```

**The tool flow (the data + the reasoning handoffs):**

```
Tool 1 harvest ──► context.harvestData ──► Tool 2 zones (E1)
Tool 2 zones   ──► context.zoneMapSnapshot + the lexicon classes
                ──► NEXT: AGENT REASONING STEP A
AGENT STEP A   ──► the designation[] (the contracted args of Tool 3)
Tool 3 shapes  ──► context.shapeSnapshot + the storyline
                ──► NEXT: AGENT REASONING STEP B
AGENT STEP B   ──► the projections (the contracted args of Tool 4)
Tool 4 setups  ──► context.setups → the report
Tool 5 gate    ──► the G1-G10 verdicts → resetContext()
```

**The E1/E2/E3 linear architecture (the operator's non-negotiable law — the diagram):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE LINEAR E1 → E2 → E3 ARCHITECTURE (the operator, 2026)   │
├──────────────────────────────────────────────────────────────┤
│  E1 = the zone map (the pressure mechanics)                  │
│    └─► PROVIDES THE STRUCTURE                                │
│  E2 = the shape chain (the storyline on the E1 pressure)     │
│    └─► BUILDS ON TOP OF E1                                   │
│  E3 = the trade setups (the classification + precision       │
│       alignment of the E1+E2 data)                           │
│    └─► MUST FIT WITHIN E1+E2's constraints                   │
│                                                              │
│  "E3 is a natural RESULT we ARRIVE AT from E1 + 2 being      │
│   done properly... 90% of the work is in E1 + E2 - if you    │
│   do these correctly E3 is basically obvious"                │
│  "Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the  │
│   previous engine's data architecture — non negotiable"      │
│  "E3 is not permitted to override pre-existing E1/E2 data    │
│   architecture nor is it allowed to just randomly fabricate  │
│   its own rules"                                             │
└──────────────────────────────────────────────────────────────┘
```

**The STEP A/B position in the linear architecture:** STEP A sits at the E1→E2 boundary (the agent designates the zones the E2 chain builds on — the reasoning-informed generation of the E2 input); STEP B sits at the E2→E3 boundary (the 11-token chain — the reasoning-informed generation of the E3 input). The agent's reasoning is the "done properly" part of the operator's law — the machine's output is correct AND the agent's judgment reads it correctly.
## 0.4 The Machine/Agent Division of Labor (the E1+E2=E3 law)
The division of labor is the operator's design: the MACHINE computes (deterministic, ms-scale, total functions); the AGENT decides (the judgment, the forward reasoning, the anchor construction, the validation). This is the T1 doctrine ("the agent is NOT a passive caller") + the E1+E2=E3 law (the machine's correct output + the agent's correct reading = the natural E3 result).

```
┌──────────────────────────────────────────────────────────────┐
│  THE DIVISION OF LABOR (who does what in the pipeline)        │
├──────────────────────────────────────────────────────────────┤
│  THE MACHINE (deterministic — ms-scale, total functions)      │
│    · the zone map (E1: telescoping · LMV · OBCV)              │
│    · the lexicons' classifications (the predicates)           │
│    · the shape chain (E2: the ZFP-conditioned transitions)    │
│    · the reasoning ledger (tokens 1-7 + 9 — the deterministic │
│      core of the 11-token chain)                              │
│    · the validation (the grounding WARN set + the contract    │
│      asserts + the RRR computation — the consequence)         │
│                                                              │
│  THE AGENT (judgment — in-session, visible)                   │
│    · STEP A: the E2 zone designation (which zones the shape   │
│      chain's path visits, at what levels, with what pressure  │
│      read)                                                    │
│    · STEP B token 8: the forward-position ("the short is      │
│      halfway to the demand — the reaction WILL happen")       │
│    · STEP B token 10: the anchor construction (the E/SL/TP    │
│      as checkable numbers on the machine's candidates)        │
│    · STEP B token 11: the validation judgment (the confluence │
│      alignment — the machine floor is the authority, the      │
│      agent adds the confidence)                               │
│                                                              │
│  THE FIREWALLS (mechanical — never judgment)                  │
│    · the file-existence layer (fs.access)                     │
│    · the semantic layer (the zone-id membership, the          │
│      contract asserts)                                        │
│    · the format layer (the price references, the numbers)     │
└──────────────────────────────────────────────────────────────┘
```

**The 11-token split (the machine vs the agent — the contract):**

| Token | The computation | Who | The output field |
|---|---|---|---|
| T1 zone-identification | the operative zone + the phantom-BoM exemption (`if MoM ∧ reactionCount===0 ∧ findFortressDemand(...).id===zone.id → PHANTOM_BOM/EXEMPT; else DEATH`) | MACHINE | the verdict `${classification} ${deathVerdict}` |
| T2 pressure-status | zonePressureSide + lifecycleScore | MACHINE | side · score · the buy/sell votes · the wick-mass ratio |
| T3 liquidity | the LMV rungs below/above + the nearest rung | MACHINE | the nested/below/above counts + the nearest rung id |
| T4 break-validation | close-beyond = BROKEN · wick-reclaim = UNBROKEN · untouched = UNBROKEN virgin | MACHINE | the break verdict |
| T5 strength-comparison | buyImpulse vs sellImpulse over the 3-day window | MACHINE | the stronger side · the delta · the impulse |
| T6 reaction-count | zone.reactionCount; ≥3 → the third-mitigation doctrine | MACHINE | the mitigations count |
| T7 chain-progress | stage = shape · dir · remaining = 5 − dayIndex | MACHINE | `${stage} day ${dayIndex}/5` |
| T8 forward-position | the deterministic candidate + THE AGENT's read | **THE AGENT** | forwardPosition · chosenTarget · FORWARD/NOT_FORWARD |
| T9 chaining | Law 27: the TP of N = the entry of N+1 — SYNC | MACHINE | the chained entry |
| T10 anchor construction | the machine's candidates + THE AGENT's construction | **THE AGENT** | E/SL/TP/RRR · the per-anchor traces |
| T11 validation | the mechanical floor (the authority) + THE AGENT's confidence judgment; refine/retry ≤3 | **THE AGENT** + MACHINE | valid · warnings · confidence |

**The reasoning-token baseline (the operator's law):**
> "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference." (the LEXICON_SPEC:265)
The EU #2 (the golden doc): "Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested liquidity zone that sits inside this demand at 1.14110 - 1.14020, and set TP at the near edge of the supply zone" — this IS the token-10 anchor construction the agent performs. The golden-doc analyses are the agent's baseline reference for every token's judgment.
## 0.5 The 8 Immutable Operating Constraints
The 8 immutable operating constraints (the operator's 2026-07-31 ruling — "100% agree wire this in as immutable operating constraints for this build") — every wave's gate enforces them:

| # | The constraint | The enforcement |
|---|---|---|
| 1 | **Precision is the ONLY metric** — the 3-pip count; never report a looser tolerance | the golden-convergence table at ≤3p in EVERY wave audit; the diag outputs the 3-pip count, never 10/30 |
| 2 | **Never lower standards to inflate metrics** — RRR ≥ 3.0 emission minimum, 4+ the norm | the RRR-variety check (the EU/GU never all-2.50); the ratio-extension absent (the grep gate) |
| 3 | **Fix the map, not the ranking** — the levels must EXIST first (telescoping → LMV → OBCV in that order) | the phase order is FIXED: Phase 1 (telescoping) → Phase 2 (LMV) → Phase 3 (OBCV) — never inverted |
| 4 | **E2 designates the zone, E3 obeys** — the keyZoneId authoritative | the STEP A designation is the E2's contracted input; the E3 resolves the projections' anchors only |
| 5 | **The telescoping law** — LQZ runs 1H→30m→15m; BoM 4H/1H only; 30m MoM only | the bom-mom.ts gate + the 4h-sd-lobe.ts gate (Phase 1, module T4); the golden-map gate |
| 6 | **No repeat of the 18 documented derailments** (8 Bible 4.0 + 10 session) + the 12 anti-patterns of THIS spec (Part 3) | the anti-pattern register is read before every wave dispatch; the wave audits check for the repeats |
| 7 | **DXY provides direction, the pair provides levels** — zone-anchored, never price-anchored; Friday spot is Monday-E2-only | the cascade's structural-equivalence matching (the zone elements, never the price levels); the day-native gates |
| 8 | **Don't stop; don't fake coverage; verify mechanically** — prose is not evidence | the zero-trust battery (Part 4) runs on EVERY claim; the wave audits carry the sha256 + the diag verdicts |

**The additional locked constants (never changed unless the operator rules):**

| The constant | The value | The location |
|---|---|---|
| ZFP_ZONE_FAILURE_THRESHOLD | 45 | shape-brain.ts:555 |
| The DXY formula K | 50.14348112 | trading-constants.ts |
| EUR/USD weight in DXY | −0.576 | trading-constants.ts |
| ONE TP per trade | the design principle — no TP1/TP2/TP3 | enforced throughout E3 |
| The pair format | 'EUR/USD' with slashes | the pipeline-wide invariant |
| The RRR floors | RRR ≥ 3.0 emission minimum · ≥ 3.5 executed standard · 4+ the norm | the 2026-07-31 ruling |
| GOLDEN_SL_MIN_PIPS | 4 | the golden SL floor (Phase 4, module M1) |
| GOLDEN_SL_MAX_PIPS | 9.5 | sl-lmv.ts:84 |
| The Law-7 buffers | EUR 2 / GBP 3 / AUD 3 / DXY 5 | sl-lmv.ts:61-63 |
| The D17 SL ceiling | 36 pips HARD | mirror.ts:79 |
| CLUSTER_TOLERANCE_PIPS | 2 | the contract assert |
| The stall idle window | 90s (the SSE idle detector, never a wall clock) | the C4 reference |
| The refine cap | 3 (the WARN → refine → ≤3 → the hard-throw) | the D2 law |
## 0.6 The Acceptance Oracle (the Monday golden + the G1-G10 contract)
The acceptance oracle — the operator's real trades at ≤3p, the ONLY valid Monday trades (D4). The golden const is the MEASUREMENT ORACLE ONLY (the TEMPORARY ARCHITECTURE label — the pipeline never reads it; the diag measures the emissions against it).

**The Monday oracle (the golden const — the 5 Monday emissions):**

| # | Pair | Day | Dir | E | SL | TP | RRR | The zone |
|---|---|---|---|---|---|---|---|---|
| 1 | DXY | Mon | LONG | 100.945 | 100.905 | 101.115 | 4.25 | 1H LQZ (demand) |
| 2 | DXY | Mon | SHORT | 101.140 | 101.200 | 100.845 | 4.92 | 1H LQZ (supply) |
| 3 | EU | Mon | SHORT | 1.14395 | 1.14485 | 1.14110 | 3.18 | 1H supply + the entry LQZ |
| 4 | EU | Mon | LONG | 1.14110 | 1.13990 | 1.14460 | 2.92 | the UM MoM demand (the phantom-BoM fortress) |
| 5 | GU | Mon | LONG | 1.33330 | 1.33250 | 1.33965 | 8.94 | the kept EU cascade |

**The G1-G10 contract (the L2 spec's gates — the W6 harness, Phase 9):**

| G# | The check | The pass condition | The evidence |
|---|---|---|---|
| G1 | the EU LONG emission (the phantom-BoM fortress) | ≥1 LONG projection with token-1 PHANTOM_BOM on [1.14145-1.14000]; the entry within 2 pips of 1.14110; the anchors trace | the ledger's token-1 verdict + the entry delta |
| G2 | the native-first cascade-complementary | the Monday EU LONG exists in the NATIVE lane; any cascade projection complementary | the lane labels |
| G3 | the GU Monday direction = LONG | the GBP/USD Monday projection direction === 'LONG'; the R divergence recorded (MACRO_DIVERGENCE); the macro wins | the divergences + the store row |
| G4 | the EU/DXY 1:1 inverted mirror | for the EU LONG, a DXY SHORT exists with matching ZONE ELEMENTS; the linkedMirror resolves | the linkedMirror pair |
| G5 | the E3-NEVER compliance | 100% pass assertProjectionContract; 0 anchor-less | the contract audit count |
| G6 | the hard-throw discipline | 0 REFINEMENT_EXHAUSTED on the golden week; the store's week row count = 0 | the store query |
| G7 | the no-regression of the correct trades | the 13 unique trades still emit; no fixed-width SL regression | the util findings |
| G8 | the temporal gate | no chain computation reads bars beyond ANCHOR_MS; the negative control (a later anchor) does not change the anchors | the negative-control run |
| G9 | THE PERFORMANCE GATE | the Monday diag completes ≤ 5 min wall time with the SAME projections; the stall detector never kills a working generation | `time bun diag-reasoning-chain.ts` |
| G10 | THE PARALLEL-EQUIVALENCE GATE | the parallel run's projections byte-identical to the sequential run's | the ledger hashes ×2 |

**The full-week oracle (the 23 golden trades — the acceptance reference):** the DXY 8 (Bible 4.0 Part 9: #1 Mon SS LONG 100.945 · #2 Mon BS SHORT 101.14 · #3 Tue R LONG 100.845 · #4 Wed SS SHORT 101.19 · #5 Wed RWL LONG 100.975 · #6 Wed BS SHORT 101.235 · #7 Thu Ladder · #8 Fri WL+RWL) + the EU 8 (the golden doc: #1 Mon Short 1.14395/1.14485/1.14110 · #2 Mon Long 1.14110/1.13990/1.14460 · #3 Tue Short 1.14460/1.14560/1.14020 · #4 Wed Long 1.14020/1.13970/1.14295 · #5 Wed Short 1.14295/1.14330/1.14000 · #6 Wed Long 1.13935/1.13850/1.14475 · #7 Thu Long 1.14225/1.14165/1.14555 · #8 Fri Short 1.14555/1.14540/1.14165) + the GU 7 (the golden doc: #1 Mon Long 1.33330/1.33250/1.33965 · #2 Tue Short 1.33965/1.34065/1.33330 · #3 Wed Short 1.33660/1.33740/1.33275 · #4 Wed Long 1.33280/1.33190/1.34270 · #5 Thu Short 1.34260/1.34365/1.33850 · #6 Thu Long 1.33850/1.33760/1.34500 · #7 Fri Short 1.34500/1.34625/1.33960).

**The measured state (the handover's zero-trust battery — what the overhaul starts from):**

| The measurement | The value |
|---|---|
| the frozen pair | sl-lmv `912940832fac44bc` · trade-dedup `33914c897e777540` — byte-identical |
| tsc | 0 (after W1-W5) |
| the Monday emissions | 6 projections (DXY S/L · EU S/L · GU S/L) |
| the golden convergence | 1/5 (the EU LONG Δ0.8p HIT) |
| the emission deltas | EU LONG Δ0.8p HIT · EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p |
| the stats | deterministic 14 · llm 0 · refinements 2 · hardThrows 0 |
| the EU/GU RRRs | ALL 2.50 EXACTLY (the forced ratio-extension — the D37 class) |
| the DXY RRRs | 4.46 / 7.16 (the structural TP on the source lane) |
| the GU Monday direction | FLIPPED to LONG (the macro authority) + MACRO_DIVERGENCE recorded |
| the shadow LLM | DEAD (llm 0 — the grounding violations hard-killed the loop) |
## 0.7 The Phase Dependency Graph
The phases execute in a strict dependency order — each phase's output is the next phase's input. The dependency graph (the diagram):

```
┌──────────────────────────────────────────────────────────────┐
│  THE PHASE DEPENDENCY GRAPH (each gate feeds the next)        │
└──────────────────────────────────────────────────────────────┘

  W0  the state verification ──► the resolved anchors (F6/F12)
        │
        ▼
  PHASE 1  the E1 telescoping (T1-T6)
        │  GATE: the 7 golden DXY levels in the map, computed
        ▼
  PHASE 2  the LMV resolution (L1-L4)
        │  GATE: 7/7 golden DXY LQZs at ≤1 pip
        ▼
  PHASE 3  the OBCV machine (O1-O5)
        │  GATE: the golden OB reconstruction + 96% vs drawn
        ▼
  PHASE 4  the 3 lost mirror fixes + the sweep inversion (M1-M4)
        │  GATE: the golden SL floor · the probe · the GU ≥8 anchors
        ▼
  PHASE 5  the six lexicons wired (X1-X6)
        │  GATE: every lexicon consumed · the phantom-BoM fixture
        ▼
  PHASE 6  the shadow retirement + the grounding WARN (S1-S3)
        │  GATE: the A1 test (WARN, never a kill) · no fetch in the path
        ▼
  PHASE 7  the STEP A/B tools + the wiring (T-A/T-B/T-C)
        │  GATE: the A4 test (a fabricated designation → BLOCKED)
        ▼
  PHASE 8  the E3 precision (the TP substrate + the anchors)
        │  GATE: the EU/GU RRRs NOT all 2.50 · the convergence ≥2/5
        ▼
  PHASE 9  the W6 golden gate (G1-G10)
        │  GATE: G1-G10 pass · the wall ≤5min · the determinism ×2
        ▼
  W8  the host deployment test (the operator deploys the plutus
      agent as a subagent — the agent-in-the-loop observed LIVE)
```

**Why the order is fixed (the first-principles):**

1. **Phases 1-3 before Phase 5:** the agent's STEP A/B reason over the machine's zone map. If the map is wrong (the 4H-only lane, no LMV resolution, no OBCV), the agent's reasoning is theater — it would reason beautifully over garbage. The operator's law: "90% of the work is in E1 + E2 — if you do these correctly E3 is basically obvious." The judgment layer is only as good as the computation layer it reads.
2. **Phase 4 after 2-3:** the mirror fixes consume the resolved LMV rungs (the class-flexible fallback + the distribution loop need the 1-pip dedup'd rungs to distribute across).
3. **Phase 5 after 1-4:** the lexicons classify the CORRECT map — the candle-pressure lexicon's side vote feeds the LMV's side determination; the zone-classification feeds the E1 typing; the phantom-BoM exemption is tested against the golden fixture.
4. **Phase 6 before 7:** the shadow retirement changes the reasoning-chain's interfaces (the token 8/10/11 hooks become the agent-facing contract); the STEP B tool consumes the NEW interface.
5. **Phase 7 before 8:** the STEP B tool is the vehicle for the agent's anchor construction; the E3 precision refines what the agent constructs.
6. **Phase 9 last:** the W6 gate is the mechanical acceptance of the WHOLE overhaul — it measures the converged pipeline.
7. **W8 last:** the host deployment observes the complete agent-in-the-loop pipeline live.

**The wave-to-phase mapping (the build waves = the phases):**

| The wave | The phase | The template | The agent count |
|---|---|---|---|
| W0 | the state verification | E1 (explore) | 1 |
| W1 | Phases 1-2 (the telescoping + the LMV) | B3 (surgical) ×2 | 2 |
| W2 | Phase 3 (the OBCV) | B1 (build) | 1 |
| W3 | Phase 4 (the mirror fixes) | B3 (surgical) | 1 |
| W4 | Phase 5 (the lexicons) | B1 (build) | 1 |
| W5 | Phase 6 (the shadow retire + the WARN) | B3 (surgical) | 1 |
| W6 | Phase 7 (the STEP A/B tools) | B1 (build) | 1 |
| W7 | Phase 8 (the E3 precision) | B3 (surgical) | 1 |
| W8 | Phase 9 (the W6 gate) | B4 (test) | 1 |
| W9 | the host deployment test | the operator's directive | the deployed plutus agent |

# PART 1 — THE DERAILMENT INVENTORY (each verified, each with the file:line anchor)

## 1.1 The Reasoning-Chain Derailments (F1-F6)
Every derailment below is evidence-grounded (the handover package's measured state · the L2 spec's session records · the wave syntheses' doc anchors). Severity: CRITICAL / HIGH / MEDIUM.

| # | The derailment | What happened | The root cause | The impact | Severity |
|---|---|---|---|---|---|
| F1 | The shadow LLM never fired | the stats: `deterministic 14 \| llm 0 \| refinements 2 \| hardThrows 0` — every LLM-hooked token fell back to the deterministic skeleton | the grounding `SHADOW_SHAPE_VIOLATION` checks (shadow-agent.ts:447/:535) hard-killed the loop on any non-numeric / out-of-order output; the streaming parse rejected the heavy ledger prompts | the judgment layer NEVER ran — the "reasoning chain" emitted machine-only projections dressed as reasoned (D1's "cheat") | CRITICAL |
| F2 | The forced-2.5-RRR | the EU/GU RRRs ALL exactly 2.50 vs the DXY lane's real 4.46 / 7.16 | `computeMirrorTP` returns null on the EU/GU mirror lanes → the ratio-extension fallback (reasoning-chain.ts:789-790) computes the TP to hit RRR 2.5 EXACTLY — the RRR-as-target (the D37 class, SLOP-01) | the EU/GU emissions are fabricated artifacts — "How is DXY higher R than EU + GU that makes no sense" | CRITICAL |
| F3 | The 30-min diag hang | the Monday diag stalled at the first lane's first LLM call for 30 min | 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls × the 600s wall-clock cap that killed working generations (L2 PART 39; the endpoint probes: 128000 → 61.9s content 259 + reasoning 5914, finish_reason stop) | the build loop ground to a halt; the fix C1+C3+C4 landed (the token 8/10 Promise.all, the micro-parallel topology, the SSE idle stall detector) | HIGH (fixed — must not regress) |
| F4 | The golden convergence 1/5 | only the EU LONG hit (Δ0.8p) of the 5 Monday emissions | the anchor precision: EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p — the LQZ near edges + the ladder-steps SL not aligned to the operator's levels | the acceptance oracle unmet — the ONLY valid trades are the golden trades (D4) | HIGH |
| F5 | The W6 golden gate absent | `diag-reasoning-chain-golden.ts` does not exist | the wave dispatcher's spawn FAILED (SLOP-09) — the agents never launched; only the manual task-tool dispatches ran (D6) | no mechanical acceptance — the G1-G10 contract defined but unenforced | HIGH |
| F6 | The shape-brain.ts line conflict | the L2 spec cites the phantom-BoM exemption at `shape-brain.ts:2330-2336`; the handover README cites `:1150` | the same surgical edit point, two recorded line numbers | the W5/wiring edit targets the wrong anchor → the exemption silently misses | HIGH (resolve at W0) |

**The F1 root-code trace (the shadow's kill path — the D2 violation, verbatim from the L2):**

```
shadow-agent.ts:447   if (typeof out.forwardPosition !== 'number') {
shadow-agent.ts:448     throw new ShapeViolation('SHADOW_SHAPE_VIOLATION: forwardPosition must be a number');
shadow-agent.ts:535   if (!isFinite(out.entry) || !isFinite(out.sl) || !isFinite(out.tp)) {
shadow-agent.ts:536     throw new ShapeViolation('SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers');
reasoning-chain.ts:728  catch (e) { if (e instanceof ShapeViolation) return fallback; ... }

The FIX (Phase 6, module S2): the throws become the GROUNDING_WARN rows —
the loop continues with the warning as the refinement input (D2).
```
## 1.2 The Substrate Derailments (F7-F15)
| # | The derailment | What happened | The root cause | The impact | Severity |
|---|---|---|---|---|---|
| F7 | Telescoping completely absent in live E1 | the emergent lane builds 4H-only S/D + 1H-only LQZ; the MDVE lane builds 4H+1H+30m OBs with ZERO cross-TF logic; 15m bars harvested but unused; `bom-mom.ts:106` is TF-agnostic (a 30m OB CAN be classified BoM today — a doctrine violation) | the operator's telescoping doctrine never wired (Bible 4.5 §12: the T1-T6 modules are spec, not code); "the ONLY telescoping implementation lives in the DEAD legacy pipeline" (plutus-tte-pipeline.ts:3021-3179) | the zone map is wrong at the LTF levels where 53% of winning entries live (15m/30m); "If E1 is fucked everything that is built on top of it also gets fucked" | CRITICAL |
| F8 | The LMV resolution limits (the golden-rung collisions) | 3/7 golden DXY LQZs at ≤1 pip (100.849 Δ0.4p · 100.949 Δ0.4p · 101.130 Δ1.0p); 100.975 / 101.19 / 101.235 / 101.240 have NO dedicated emitted rung | the 4 stacked mechanisms: the ε=2 band merging (100.975 absorbed into 100.945's matrix), the center drift (the prominence-weighted mean vs the modal reaction level), the 3-pip dedup floor (the 0.5-pip pair 101.235/101.240 merged), the bridge gap (the matrix LQZ not in model.zones) | the entries cannot land on the operator's exact rungs — the precision ceiling | HIGH |
| F9 | The OBCV conservative gates | the OBCV's direct output emitted 0 BoM on the golden fixture | the bw≥3.0 / bf≥0.65 gates too conservative for the golden OBs (the documented Phase-4 gap) | the operator's drawn BoM levels exist but the machine's map lacks them — the agent STEP A would reason over a map missing the base camps | HIGH |
| F10 | The 3 lost mirror.ts fixes | computeGoldenSL_V452 + GOLDEN_FLOOR, weekProbeAtAnchor, classFlexibleLQZFallback + the GU distribution loop — lost in the wipe, NOT re-ported into the current mirror.ts | the v4.5.2-E2-cascade fork dropped them; BUILD_STATE.md:127 falsely claims they're present | the golden 4p SL floor, the LMV candle-wick probe scan, and the GU anchor-pool distribution are absent | HIGH |
| F11 | The six lexicons unwired | the PLUTUS_V4.5.4_LEXICON_SPEC.md (301L) defines the machine form (TradingLexiconRule / PatternFamily / the two-phase enforcement) — no consumer reads them | the lexicons were spec'd in parallel with the chain build; the wiring was never done | the semantic intent layer (the operator's "pressure mechanics = semantic intent") does not exist in code — the machine classifies without the psychology | CRITICAL |
| F12 | The LQZ 1H lookback conflict (P0) | the T2 spec says the sweepLookback 1H = 12; the Bible 4.5 T1 wiring says SWEEP_LEVEL_LOOKBACK_BARS 1H = 24 | two canon docs, two values | the telescoping T1 wiring silently changes the sweep detection materially | HIGH (resolve FIRST) |
| F13 | The zone-width discrepancy | the golden-standard reference: 4H zones 30-80 pips; Bible Law 2: 4H 15-40 — uniformly tighter | the 38-trade reference vs the canon law table | the SL geometry (Law 9: SL = zone width + buffer) computes systematically different SLs | MEDIUM |
| F14 | The RWL/WL doctrine contradictions | the shape-zone reference: RWL = 6+ ALWAYS + WL all-same-color; the operator's golden doc: RWL "often 1-2 large fat aggressive fast candles", WL can be 4-6 mixed-color candles | the distilled canon vs the operator's first-hand definitions | the E2 classifier misclassifies the operator's observed variants; the agent STEP B reads a wrong shape | MEDIUM (resolve for the E2 work) |
| F15 | The shadow secrets chain boundary | the OPENCODE_API_KEY lives in ~/.bashrc (67 chars) — the shell-session boundary broke the key resolution mid-build (SLOP-06) | the env→.env→embedded chain's first link is the shell session | the shadow (and any agent-side call) cannot resolve the key in a fresh session without the export | MEDIUM (dies with the shadow — Phase 6) |
| F16 | The EU/GU mirror substrate null | `computeMirrorTP` returns null on the EU/GU lanes (the trigger of F2) | the mirror lane's opposing-rung walk finds no candidate on the EU/GU tables → the null → the ratio-extension fallback | the EU/GU lanes cannot produce a structural TP — the root of the forced-2.5 | CRITICAL (the F2 root — Phase 8, module TP-1) |
| F17 | The GU Monday's demand pick Δ6.0p | the current emission's GU demand 1.33270 vs the golden 1.33330 | the demand-pick anchor not at the operator's near edge | the GU Monday miss (Δ6.0p > 3p) — the entry precision (Phase 8, module EN-2) | HIGH |
## 1.3 The Doc Conflicts (the resolution rules — the P0/P1 queue)
The P0/P1 queue — the doc conflicts the wave syntheses surfaced. Each has a RESOLUTION RULE (the mechanical arbiter) so the build never carries a contradiction.

| # | The conflict | The two sides | The resolution rule |
|---|---|---|---|
| C-1 (F12) | the LQZ 1H sweepLookback | the T2 spec `LQZ_CONFIG_BY_TF` sweepLookback 1H = **12** vs the Bible T1 `SWEEP_LEVEL_LOOKBACK_BARS` 1H = **24** | the W0 state verification reads the CURRENT lqz-lobe.ts constant; the golden-LQZ oracle (7/7 DXY ≤1 pip) is the arbiter — the sweep detector's 1H lookback = 12 per the T2 config (the operator's "exact criteria" reference), the Bible's 24 recognized as the ALIGNMENT window (a different threshold — the LQZ_ALIGN_TOLERANCE class); the choice is DOCUMENTED at lqz-lobe.ts:117 with the oracle's verdict |
| C-2 (F13) | the zone-width canon | the golden reference 4H 30-80 vs Bible Law 2 4H 15-40 | the reference's widths are the OBSERVED winning-trade zones (the detector gates); the Law-2 widths are the CONSTRUCTION params (the 4h-sd-lobe.ts maxZoneWidthPips); the SL geometry follows Law 9 (SL = zone width + buffer) from the CONSTRUCTED width — both are used, in their respective layers, documented in the Part 6 function-level spec |
| C-3 (F14) | the RWL/WL sub-forms | the shape-zone reference (RWL 6+ ALWAYS · WL all-same-color) vs the operator's golden doc (RWL "often 1-2" · WL 4-6 mixed) | the operator's first-hand definitions are the HIGHER authority (the golden doc IS the operator); the E2 classifier gains the sub-forms: RWL-rapid (1-2 candles, the "big aggressive fast reversal") / RWL-gradual (4-6, dissipating into SS/R) · WL-compact (3 candles, all-same-color) / WL-extended (4-6, mechanics + chain-context classified — the operator's "the directional move + pressure mechanics behind the candles + context to the previous shapes in the chain clearly denote it"); the Phase-5 lexicon-2 families carry both |
| C-4 (F6) | the shape-brain.ts phantom-BoM line | the L2 cites :2330-2336 vs the handover :1150 | the W0 state verification reads the CURRENT source and reports the FOUND line; every Phase-5 edit uses the W0-verified anchor |
| C-5 | the VISUAL_TELESCOPE_CHARTING_T2 identity | the filename says "telescoping charting" but the file is the PLUTUS-TTE-ENG engineering spec (4,446L, sections 1-15) | the telescoping doctrine lives in the Bible 4.5 Part 12 (the operator's verbatim quotes) + the T2 file carries the mechanics (the LQZ_CONFIG_BY_TF tables · the VLM contract · the sniper math); both are referenced with their true anchors — the build reads the T2 file for the thresholds and the Bible for the doctrine |
| C-6 | the L1 file count | the mission context said the L1 is 688 lines; the file is 687 | the EOF check is the truth: 687 lines (the L1 agent's verification) |
| C-7 | the RRR emission floor | the operator's "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE" (2026-07-31) vs the L2's mechanical floor RRR ≥ 1.0 + the 2.5R quality floor | BOTH hold in their layers: the CONTRACT floor (assertProjectionContract) is rrr ≥ 1.0 (a sub-1R = a refinement warning); the EMISSION floor is RRR ≥ 3.0 (the firewall gate); the TARGET is 4R+; the operator's "not a single trade below 3.5" is the executed standard — the layers never conflate |

**The resolution rule for the wave builds:** a conflict with a resolution rule above is BUILDABLE (the rule decides); a conflict WITHOUT a rule is reported to the orchestrator at the W0 gate — never carried silently into a build. The wave audits record every applied resolution.

# PART 2 — THE CORRECTED ARCHITECTURE (the agent-in-the-loop)

## 2.1 The Corrected Pipeline (the 7-tool chain with the STEP A/B)
The corrected pipeline — the 7-tool chain with the two agent-reasoning steps. The diagram (the full data + reasoning flow):

```
┌──────────────────────────────────────────────────────────────┐
│  THE 7-TOOL CHAIN (the tools + the agent steps + the flow)    │
└──────────────────────────────────────────────────────────────┘

  ┌────────────────────────────┐     ┌──────────────────────────┐
  │ 1 harvest (weekStart)      │     │ 2 zones (E1)             │
  │   OHLC 4H/1H/30m/15m       │──►  │   the telescoped map      │
  │   the temporal anchor      │ ctx │   + the lexicon classes   │
  └────────────────────────────┘     └───────────┬──────────────┘
                                                 │
                                  ┌──────────────▼──────────────┐
                                  │ ▶ AGENT REASONING STEP A     │
                                  │  the designation[]           │
                                  │  (zoneId + role + rationale) │
                                  └──────────────┬──────────────┘
                                                 │  the contracted
                                                 ▼  args of tool 3
  ┌────────────────────────────┐     ┌──────────────────────────┐
  │ 3 shapes (E2)              │◄────│  the firewall:            │
  │   the chain on the         │     │  zoneId ∈ the zone map    │
  │   DESIGNATED zones         │     │  rationale ≥40c + price   │
  └────────────────────────────┘     └──────────────────────────┘
                 │
                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ▶ AGENT REASONING STEP B  (the 11-token chain)              │
  │    the machine's ledger (T1-7 + T9) presented to the agent  │
  │    the AGENT's decisions (T8 · T10 · T11) — in-session      │
  │    the machine's validation (the WARN set + the contract)   │
  │    OUTPUT: the TradeProjection[]                            │
  └────────────────────────────┬───────────────────────────────┘
                               │  the contracted args of tool 4
                               ▼
  ┌────────────────────────────┐     ┌──────────────────────────┐
  │ 4 setups (E3)              │◄────│  the firewall:            │
  │   resolves the projections │     │  assertProjectionContract │
  │   (E3-NEVER)               │     │  (the anchors trace)      │
  └────────────────────────────┘     └──────────────────────────┘
                 │
                 ▼
  ┌────────────────────────────┐
  │ 5 the gate (G1-G10)        │  the W6 verdicts · resetContext
  └────────────────────────────┘
```

**The tool contracts (the summary — the full interfaces in Part 8):**

| Tool | The args (contracted) | The firewall | The output's NEXT |
|---|---|---|---|
| 1 harvest | weekStart (the ISO Monday) | the temporal anchor | NEXT: call zones |
| 2 zones (E1) | weekStart + the options data | the 3-layer firewall (the file · the vision · the format) | the zone map + NEXT: AGENT REASONING STEP A |
| 3 reason-step-a | weekStart + the designation[] | every zoneId ∈ the zone map · the rationale ≥40c + a price reference | the designation + NEXT: call shapes |
| 4 shapes (E2) | weekStart (the designation from the context) | the designation validated | the shape chains + NEXT: AGENT REASONING STEP B |
| 5 reason-step-b | weekStart + the projection decisions[] | the WARN set (D2) + the contract asserts | the projections + NEXT: call setups |
| 6 setups (E3) | weekStart (the projections from the context) | assertProjectionContract | the setups + the report + resetContext |
| 7 gate | weekStart | — | the G1-G10 verdicts |

**The context lifecycle (the T1 pattern — unchanged):** `ensureContext(weekStart)` creates/returns the module-level context; the phases store their outputs (harvestData · zoneMapSnapshot · stepADesignation · shapeSnapshot · projections · setups); the gate tool calls `resetContext()` at the chain's end — the next week starts fresh. If the context is lost (a module reload), the next ensureContext creates a fresh one and the agent re-runs from harvest.
## 2.2 The E1 → STEP A → E2 Boundary (the designation contract)
**The purpose (the operator's doctrine):** "The E2 shape chain must produce ZONE-LEVEL projections ('Monday's projected path visits supply zone X at level 1.14544', not 'Monday is SS with bearish bias')" — the Bible 4.5 lesson #2. The agent reads the E1 zone map and designates the zones the E2 shape chain will build on. This replaces the E2's blind "curate top-20 by confluence" with a reasoning-informed designation — the reasoning-informed generation of the E2 input (D8).

**The boundary diagram:**

```
┌──────────────────────────────────────────────────────────────┐
│  THE E1 → STEP A → E2 BOUNDARY (the designation contract)    │
└──────────────────────────────────────────────────────────────┘

  E1's output (the machine)              the agent's STEP A (judgment)
  ┌────────────────────────────┐         ┌────────────────────────────┐
  │ the telescoped zone map    │         │ READS: the zone map + the   │
  │   (S/D · LQZ · OB, all TF) │         │ pressure states + the       │
  │ the lexicons' classes      │──read──►│ lexicon classes             │
  │ the pressure states        │         │                            │
  │ (lifecycle · zfp · absorpt)│         │ DECIDES: per day, per pair: │
  │ the macro narrative        │         │   zoneId (the designated    │
  └────────────────────────────┘         │   zone the path visits)     │
                                         │   role (S/D/LQZ)            │
                                         │   classification (BoM/MoM)  │
                                         │   rationale (the story)     │
                                         │   pressureRead              │
                                         └─────────────┬──────────────┘
                                                       │ the designation[]
                                                       ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  THE FIREWALL (mechanical — the tool 3's before-hook):            │
  │    every designation.zoneId ∈ ctx.zoneMapSnapshot.zones          │
  │    (the invented id → BLOCKED — the T1 semantic layer)           │
  │    every designation.rationale ≥ 40 chars ∧ has a price ref      │
  │    (the generic string → BLOCKED — the T1 format layer)          │
  └──────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │  E2's input (the machine — the chain BUILT ON the designation):   │
  │    ShapeBrain.compute(zoneMap, designation)                       │
  │    → the per-day shapes + the day decomposition                   │
  │    → cascadeShapeChain (DXY → EU inverted → GU kept)              │
  │    → the storyline (the macro arc + the warframe)                 │
  └──────────────────────────────────────────────────────────────────┘
```

**The StepADesignation contract (Part 8's full interface — the summary):**

```typescript
interface StepADesignation {
  pair: string;                       // 'DXY' | 'EUR/USD' | 'GBP/USD'
  day: string;                        // 'Mon'..'Fri'
  zoneId: string;                     // MUST exist in the E1 zone map (the firewall)
  role: 'SUPPLY' | 'DEMAND' | 'LQZ';  // the zone's element
  classification: 'BoM' | 'MoM' | 'LQZ';
  rationale: string;                  // the agent's visible reasoning (≥40c + a price ref)
  pressureRead: string;               // the lexicon-4 lifecycle state the agent read
}
```

**The agent's STEP A reasoning sequence (visible in the stream — the operator's E1 pressure-reading protocol, the E1_E2_E3_MACRO Part 22):**
1. The macro narrative first: the 4H BoM supply/demand storyline (the operator's Step 1).
2. The zone's pressure state: the confluence/ZFP/BoM-MoM/reaction-count/absorption (Step 2).
3. The liquidity: the nested LQZ within + the shield in front (Step 3).
4. The break-validation: the E1 pressure validates the structure break (Step 4).
5. The strength comparison: the bullish-vs-bearish pressure (Step 5).
6. The reaction-count state: the mitigation count (Step 6).
7. The deep liquidity: the left-look for the deep zones (Step 7).
8. Emit the designation per day — the zone the shape chain's path will visit, at what level, with the pressure read.

**The done-when (STEP A):** a host run shows the agent's designation in the stream with real zone ids + the pressure reads; the E2 tool accepts it; a fabricated zoneId returns BLOCKED (the A4 test); the rationale without a price reference returns BLOCKED.
## 2.3 The E2 → STEP B → E3 Boundary (the 11-token chain contract)
**The purpose:** the 11-token reasoning chain becomes the explicit STEP B between E2 and E3. The machine computes the deterministic ledger (tokens 1-7 + 9); the PRIMARY AGENT performs the judgment tokens (8, 10, 11) in-session; the machine validates (the WARN + refine ≤3 per D2). The output = the TradeProjections the E3 tool consumes — the reasoning-informed generation of the E3 input (D8).

**The boundary diagram:**

```
┌──────────────────────────────────────────────────────────────┐
│  THE E2 → STEP B → E3 BOUNDARY (the 11-token chain)          │
└──────────────────────────────────────────────────────────────┘

  E2's output + the machine's ledger          the AGENT's STEP B (judgment)
  ┌────────────────────────────┐              ┌────────────────────────────┐
  │ the shape chains + the     │              │ READS: the ledger (T1-7+9) │
  │ storyline                  │              │ + the storyline + the map  │
  │ the zone map (E1)          │──shown to──► │                            │
  │                            │              │ DECIDES:                   │
  │ THE LEDGER (the machine):  │              │  T8  forwardPosition:      │
  │  T1 zone-identification    │              │    "the short is halfway   │
  │  T2 pressure-status        │              │     to the demand — the    │
  │  T3 liquidity              │              │     reaction WILL happen"  │
  │  T4 break-validation       │              │  T10 anchor construction:  │
  │  T5 strength-comparison    │              │    E/SL/TP as checkable    │
  │  T6 reaction-count         │              │    numbers + the anchors   │
  │  T7 chain-progress         │              │  T11 validation judgment:  │
  │  T9 chaining (Law 27, sync)│              │    the confluence align    │
  └────────────────────────────┘              └─────────────┬──────────────┘
                                                           │ the decisions[]
  ┌──────────────────────────────────────────────────────────────────────┐
  │  THE MACHINE'S VALIDATION (after the agent's turn — the WARN set):    │
  │    forwardPosition ∈ number        → else GROUNDING_WARN (D2)         │
  │    entry/sl/tp ∈ number ∧ ordered   → else GROUNDING_WARN             │
  │    chosenTarget ∈ the CLOSED set    → else GROUNDING_WARN             │
  │    the anchors trace to E1+E2       → else CONTRACT_VIOLATION         │
  │    (WARN → refine ≤3 → REFINEMENT_EXHAUSTED → the store)              │
  └──────────────────────────────────────────────────────────────────────┘
                                                           │
                                                           ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  E3's input (the machine — the projections RESOLVED):                 │
  │    the TradeProjection[] → the setups' entries/SLs/TPs                │
  │    (the E3-NEVER: every anchor traces to an E1 zone + an E2 proj)     │
  └──────────────────────────────────────────────────────────────────────┘
```

**The flow (the agent's visible reasoning):**
1. The machine runs tokens 1-7 + 9 → the ledger is PRESENTED to the agent in the tool result.
2. The agent reads the ledger + the E2 storyline + the zone map → performs T8 (the forward-position), T10 (the anchor construction), T11 (the validation judgment) — its reasoning visible in the stream.
3. The agent emits the projection DECISIONS via the tool args (the E/SL/TP + the anchors + the verdicts — NOT the full projections; the machine assembles them, per the zero-trust audit A-2).
4. The machine validates (the WARN set above): violations → GROUNDING_WARN → the agent refines (≤3) → the hard-throw to the failure store after 3.
5. The projections pass to the E3 tool.

**The TradeProjection contract (Part 8's full interface — the summary):**

```typescript
interface TradeProjection {
  pair: string; day: string; shape: ShapeCode; direction: 'LONG' | 'SHORT';
  entryZoneId: string; entryLqzId: string;
  E: number; SL: number; TP: number; RRR: number;      // the checkable anchors
  pressureRead: ZonePressureState;
  chainContext: string;
  validation: ValidationSignal;
  confidence: number;                                  // pos/(pos+neg+1)
  anchors: Array<{ e1ZoneId: string; e2ProjectionId: string }>;  // E3-NEVER
}
```

**The done-when (STEP B):** a host run shows the agent's forward-position/anchor reasoning in the stream; the machine's WARNs fire on a deliberately-bad projection (the A1 test) and the loop CONTINUES; a projection with an invented anchor id is hard-thrown after 3 (never on the first); the E3 tool accepts the contract-clean projections.
## 2.4 The Shadow Retirement (the D1 law — the executor deleted)
**The D1 law — the shadow executor is DELETED.** The operator's directive (verbatim): "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything." And this session's ruling (D7): "we are replacing all shadow agent steps with the proper primary agent so that we can accurately see what is happening. This is how it should be anyways the shadow agent was a cheat basically."

**The retirement diagram:**

```
┌──────────────────────────────────────────────────────────────┐
│  THE SHADOW RETIREMENT (the before → after)                   │
├──────────────────────────────────────────────────────────────┤
│  BEFORE (the cheat — external, context-less):                │
│                                                              │
│    reasoning-chain.ts          shadow-agent.ts               │
│    token 8/10 hooks ──call──►  fetch(SHADOW_BASE_URL)        │
│                                SHADOW_MODEL (frozen)         │
│                                SSE stream + 90s idle         │
│                                the grounding THROWS (D2 bug) │
│                                ── the agent's context NEVER  │
│                                   sees the reasoning         │
│                                                              │
│  AFTER (the agent-in-session — D1/D7):                       │
│                                                              │
│    reasoning-chain.ts          THE PRIMARY AGENT             │
│    token 8/10/11 hooks ──►    reasons IN ITS OWN CONTEXT     │
│    (the agent-facing           (the full Plutus identity,    │
│     contract: the ledger +     the full conversation state)  │
│     the candidates)            the reasoning VISIBLE in the  │
│                                stream — "we can see          │
│                                everything"                   │
│                                                              │
│    the machine VALIDATES (the WARN set — D2) — never an      │
│    external call                                              │
└──────────────────────────────────────────────────────────────┘
```

**What is deleted (Phase 6, module S1):**
- shadow-agent.ts's `callModel` fetch path — the `fetch(SHADOW_BASE_URL)` call, the SSE stream handling, the SHADOW_MODEL pin, the SHADOW_* error taxonomy's throw paths — DELETED as the executor.
- The secrets chain (resolveShadowApiKey: env → .env → ~/.config/opencode/.env → ~/.env → the embedded base64) — retired with it (F15 dies).
- The shadow-side tools (projectForward / chaining / anchor / validate) — their INTERFACES become the agent-facing contract shape (the ledger + the candidates the agent refines).

**What is preserved (the reference pattern only):**
- The C2 shadow-brain structure (the frozen model concept, the SSE idle-window stall detector, the content||reasoning defensive read) — archived as the REFERENCE PATTERN for any future agent-side call design; NEVER invoked by the pipeline.
- The failure store's taxonomy: SHADOW_DEGRADE kept for backward compatibility; the LIVE rows become GROUNDING_WARN / REFINEMENT_EXHAUSTED / CONTRACT_VIOLATION / MACRO_DIVERGENCE.
- The SHADOW_REWIRE_SPEC (HANDOVER_PACKAGE_4.5.4/SHADOW_REWIRE_SPEC.md, 506L) — the rewire authority: its Part 6 (the agent-in-session contract) + Part 11 (the pipeline-integration detail) are the conversion reference.

**The grep gate (enforced in every wave audit):** `grep -rn "fetch\|axios\|http" src/mdve/reasoning-chain.ts src/mdve/shadow-agent.ts` must return ZERO network calls in the reasoning path. The agent's reasoning happens in its own context — no external model call exists.
## 2.5 The Grounding WARN (the D2 law — the validation semantics)
**The D2 law — the machine's validation of the agent's output = a WARN that CONTINUES the agent loop.** The operator's directive (verbatim): "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."

**The WARN semantics diagram:**

```
┌──────────────────────────────────────────────────────────────┐
│  THE GROUNDING WARN STATE MACHINE (the D2 law)               │
└──────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │  the agent emits the output │
                    └──────────────┬──────────────┘
                                   ▼
                    ┌─────────────────────────────┐
                    │  the machine validates      │
                    │  (the WARN set)             │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ the output VALID  │  │ a WARN triggers  │  │ a CONTRACT       │
   │ → accepted        │  │ (non-numeric /   │  │ violation        │
   │ → the next phase  │  │  out-of-order /  │  │ (an invented id) │
   └──────────────────┘  │  invented target) │  └────────┬─────────┘
                         └────────┬─────────┘           │
                                  │                     │
                                  ▼                     │
                    ┌─────────────────────────────┐     │
                    │  the WARN row recorded:      │     │
                    │  {check, tokenId, sourceRef, │     │
                    │   value, proposedCorrection} │     │
                    │  → the failure store         │     │
                    │  (GROUNDING_WARN)            │     │
                    └──────────────┬──────────────┘     │
                                   │                     │
                                   ▼                     ▼
                    ┌─────────────────────────────────────────┐
                    │  the agent LOOP CONTINUES — the WARN is  │
                    │  the refinement input (attempts ≤ 3)     │
                    └────────────────────┬────────────────────┘
                                         │ after 3 failed refinements
                                         ▼
                    ┌─────────────────────────────────────────┐
                    │  REFINEMENT_EXHAUSTED → the hard-throw → │
                    │  the failure store → the end-of-diag     │
                    │  synthesis (data, never a crash)         │
                    └─────────────────────────────────────────┘
```

**The WARN set (the machine's validation predicates — Phase 6, module S2):**

| # | The check | The trigger | The WARN's proposedCorrection |
|---|---|---|---|
| W-1 | the forwardPosition is a number | a string / NaN / absent | "re-emit the forward position as a number of pips from the zone's near edge" |
| W-2 | the entry/sl/tp are numbers | a string / NaN / absent | "re-emit the anchors as numeric price levels" |
| W-3 | the E/SL/TP direction-order | LONG: E < SL < TP violated; SHORT: E > SL > TP violated | "re-order the anchors so the SL sits beyond the entry on the adverse side" |
| W-4 | the chosenTarget ∈ the CLOSED continuationTargets set | an outside value | "pick from the closed set: {target1, target2, ...} — never extend it" |
| W-5 | the e1ZoneId ∈ the E1 zone map | an invented id | "use a real zone id from the map (the candidate list provided)" |
| W-6 | the e2ProjectionId ∈ the E2 chain | an invented id | "use a real projection id from the chain (the candidate list provided)" |
| W-7 | the RRR is computable | a zero/negative SL distance | "re-anchor the SL so the RRR is a positive finite consequence" |

**The hard-throw rules (the ONLY hard paths):**
- REFINEMENT_EXHAUSTED: after 3 failed refinements on the same projection → the hard-throw → the store → the synthesis (never a crash — the D18 law: "a hard-throw is data, not a crash").
- CONTRACT_VIOLATION: an anchor-less / out-of-zone projection after the 3 WARN attempts → the hard-throw → the store.
- The TEMPORAL gate: any computation reading bars beyond ANCHOR_MS → the pipeline error (the G8 negative control).

**The failure-store contract (unchanged from the L2 — the live rows):**

```typescript
// MASTER_CONTEXT/plutus-reasoning-failures.db — chain_failures
// id · component · reason ∈ {GROUNDING_WARN, REFINEMENT_EXHAUSTED,
//   CONTRACT_VIOLATION, MACRO_DIVERGENCE} · context(JSON) ·
//   attempts · timestamp · week · pair — the indexes on week + reason
// recordFailure degrades to the append-only fallback row when
//   bun:sqlite is unavailable — NEVER silently drops (L2:1582)
```

# PHASE 1 — THE E1 TELESCOPING (T1-T6 — the foundation)

## 1.1 The Doctrine (operator verbatim)
The operator's telescoping doctrine — VERBATIM (Bible 4.5 §12.1 + §31.1):

> "Rule of thumb S/D zones are charted on 4H and refined down to 1H, also can be charted on 1H and refined down to 30m (for 1H specific OBs that are not visible on 4H - nested S/D zones can exist)"

> "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones to identifiy E2 reaction points for SS/R shapes but BoM OBs are 4H/1H only w/ 30m only for minor telescoping refinement of 1H origin OBs"

> "LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"

> "All of these are telescoping refinment procedures. looks like last agnet just stopped at step 1."

> "The zone map is built from 4H bars only" — "something derailed here... full telescoping procudure needs to be wired in for E1 this is extremely important. If E1 is fucked everything that is built on top of it also gets fucked."

**The compressed mechanical gate (the doctrine made code):**

```
S/D:  4H → 1H refinement (nested zones allowed)
      1H → 30m refinement (for 1H-specific OBs not visible on 4H)
BoM:  4H/1H ONLY as origin — 30m/15m NEVER a BoM origin
MoM:  30m VALID (E2 reaction points for SS/R shapes)
LQZ:  1H → 30m → 15m telescoping (origin detection per TF, refinement down)
LTF:  never overrides HTF direction (Law 1)
```

**The BoM/MoM origin-TF gate (the doctrine's mechanical form):**

| TF | BoM origin? | MoM? | The role |
|---|---|---|---|
| 4H | ✅ YES | ✅ YES | the strategic S/D, the HTF swings |
| 1H | ✅ YES | ✅ YES | the tactical S/D, the entry zones |
| 30m | ❌ NEVER | ✅ YES | the MoM reaction points for the SS/R shapes; the minor refinement of the 1H origins ONLY |
| 15m | ❌ NEVER | (LQZ-only lane) | the LQZ refinement of the 30m levels |
## 1.2 The Current State (forensic)
The forensic state (verified 2026-07-31 + the wave syntheses — the telescoping is COMPLETELY ABSENT in the live E1):

| The lane | The timeframes | The cross-TF logic | The status |
|---|---|---|---|
| The live emergent (engine.ts) | 4H S/D + 1H LQZ only | NONE | `timeframe: '4H'` hardcoded at engine.ts:465; `ohlc[pair]` = 4H only at :223 |
| The MDVE lane (ob-engine.ts) | 4H + 1H + 30m OBs | NONE — the independent constructions concatenated + sorted (:348-354) | MDVE_TIMEFRAMES = ['4H','1H','30m'] (:45) |
| The legacy lane (plutus-tte-pipeline.ts) | 4H/1H/30m/15m + the nesting + the refinedLabel (:3021-3179) | YES — the ONLY telescoping code | **DEAD — not in the live tool registry** |

**The key forensic facts:**
- `4h-sd-lobe.ts:64-69` HAS the TF-scaled params for all 4 TFs (4H maxBars 60/width 40/dist 150; 1H 120/25/150; 30m 200/15/150; 15m 300/10/150) but only '4H' is ever passed in the live lane.
- The LQZ detector is structurally 1H-calibrated (lqz-lobe.ts:264-269 has NO timeframe param; the 24-bar sweep lookback, the 5-pip wick minimums).
- The 30m/15m bars ARE harvested (engine.ts:277-280) but 15m is used by NOBODY; 30m only by the MDVE ladder/OB engine.
- `bom-mom.ts:106` classifyBoMMoM is TF-agnostic — a 30m OB CAN be classified BoM today (the doctrine violation).
- `ZoneModel` (mdve/types.ts:131-142) has `timeframe` but NO `refinedLabel`/`nestedWithin` fields; `DXYZone.refinedLabel` EXISTS at types.ts:206 and the renderers honor it (report-generator.ts:537).
- `mergeLqzWithIpZones` IS called at engine.ts:480 (the live emergent) but NOT in the MDVE lane.
- report-v452.ts feeds 1H + 4H + 30m (NO 15m) via buildChartModel.

**The telescoping acceptance target (what "done" means for this phase):** the 7 golden DXY levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) appear in the zone map COMPUTED from the week's own data — no hardcoding, no fixture injection. Plus the EU/GU golden levels present (the Tier-B axis labels: the EU ladder 1.14649→1.13850 · the GU ladder 1.34587→1.33000).
## 1.3 Modules T1-T6 (the exact insertion points + the before/after)
The 6 wiring modules (T1-T6 — the exact insertion points from Bible 4.5 §12.3, with the resolution rules from Part 1.3):

**T1 — the LQZ TF parameterization (lqz-lobe.ts:264-269):**

| The threshold | 1H | 30m | 15m | The anchor |
|---|---|---|---|---|
| SWEEP_LEVEL_LOOKBACK_BARS | 12 (the C-1 resolution — the T2 config) | 20 | 30 | the T2 LQZ_CONFIG_BY_TF |
| SWEEP_MIN_BEYOND_PIPS | 2 | 1.5 | 1 | the T2 config |
| LONG_WICK_MIN_PIPS | 5 | 3 | 2 | the T2 config |
| SHARP_MOVE_MIN_PIPS | 15 | 10 | 6 | the T2 config |
| LQZ_ALIGN_TOLERANCE_PIPS | 3 | 2 | 1 | the T2 config |
| minLqzWidthPips | 6 | 4 | 2 | the T2 config |
| maxLqzWidthPips | 25 | 15 | 10 | the T2 config |

The `timeframe` param added to the detector; the config lookup via LQZ_CONFIG_BY_TF. **The C-1 resolution documented at lqz-lobe.ts:117 with the golden-oracle verdict.**

**T2 — the 4H S/D → 1H refinement (ob-engine.ts:348 + engine.ts:479-481):**
For each 1H zone: the containment test `[z.bottom, z.top] ⊆ [htf.bottom, htf.top]` against the same-type 4H zones; when nested: tag the refinement field, add the confluence (dual-TF +3, triple-TF +5), refine the 4H zone's active edge toward the 1H edge. Add `refinedLabel?: string` + `nestedWithin?: string` to ZoneModel (mdve/types.ts:131-142).

**T3 — the 1H OB → 30m minor refinement (ob-engine.ts:346):**
30m zones entirely within a 1H zone (same type) refine the 1H zone's minor edge; tag "30m Refined 1H".

**T4 — the 30m MoM-only + the E2 delivery:**
- `bom-mom.ts:79-106` — add `timeframe` to BoMMoMInput; return 'MoM' when tf === '30m' (or '15m').
- `ob-engine.ts:339-344` — force `classification: 'MoM'` for all 30m zones.
- `4h-sd-lobe.ts:147-149` — gate `isBoM = tf !== '30m' && tf !== '15m' && classifyOrderBlock(...)` (protects ANY future 30m/15m construct4HZones call).
- `shape-brain.ts:608` — deliver the 30m MoM zones to E2 as the SS/R reaction points (currently E2 never sees them).

**T5 — the LQZ 1H→30m→15m (engine.ts:472-480 + mdve/index.ts:161-178):**
Add `detectLiquidityZones(pair, bars30m)` + `(pair, bars15m)` calls (the bars available at :277-280); the nested-refinement merge before/within mergeLqzWithIpZones. Thread the 30m/15m bars into buildLqzMatrix/buildLmvTable for the matrix refinement tiers.

**T6 — the zone-map snapshot merge (engine.ts:517-524):**
Upgrade the emergent ZoneMapSnapshot to include the telescoped result; after `ctx.chartModelsByPair` is built (:546), run the T2/T3/T5 refinements on ChartModel.zones and merge the telescoped MDVE zones into zonesByPair/snapshot (report-v452 consumes ChartModel.zones at :103-105 — the telescoping there propagates to the source setups + the cascade automatically).

**The per-module before/after (the function-level summary):**

```
bom-mom.ts:79-106  BEFORE: classifyBoMMoM(input) — TF-agnostic (30m CAN be BoM)
                   AFTER:  classifyBoMMoM(input, tf) — tf 30m/15m → 'MoM' always
ob-engine.ts:339   BEFORE: zones.forEach(z => { ... }) — no classification force
                   AFTER:  zones.forEach(z => { if (z.timeframe === '30m') z.classification = 'MoM' })
4h-sd-lobe.ts:147  BEFORE: isBoM = classifyOrderBlock(origin)
                   AFTER:  isBoM = tf !== '30m' && tf !== '15m' && classifyOrderBlock(origin)
shape-brain.ts:608 BEFORE: (the E2 never sees the 30m MoM zones)
                   AFTER:  the 30m MoM zones delivered as the SS/R reaction points
```
## 1.4 The Phase-1 Invariants + Test Spec + Acceptance Gate
**The Phase-1 invariants (asserted at the gate):**

```
INV-1  ∀ z30m: classification === 'MoM'            (the 30m never a BoM)
INV-2  ∀ z15m: type === 'LQZ'                      (the 15m is the LQZ lane only)
INV-3  ∀ z: widthGate(z)                           (the per-TF width canon re-verified)
INV-4  the single zone map: the telescoped union merged, no two-parallel-universes
INV-5  ∀ nested: refinedLabel set ∧ nestedWithin set (the audit trail)
INV-6  the 7 golden DXY levels present, computed from the data (never hardcoded)
```

**The Phase-1 test spec (written BEFORE the code — the diag assertions):**

```
diag-telescoping.ts:
  T-1  the 1H S/D zones ⊆ 4H zones carry refinedLabel + nestedWithin
       (assert: the golden 1H BoM demand 100.68-100.73 ⊆ the 4H band)
  T-2  no 30m zone carries classification === 'BoM'
       (assert: the fixture's 30m OBs all 'MoM' — the doctrine gate)
  T-3  the 15m lane exists in the map (the LQZ rungs present)
  T-4  the LQZ detector runs on the 30m + 15m bars (no crash, the rungs emitted)
  T-5  THE ORACLE: the 7 golden DXY levels in the map at the operator's levels
       (100.845 · 100.945 · 100.975 · 101.14 · 101.19 · 101.235 · 101.240)
  T-6  the adversarial: a 30m zone with a BoM-shaped origin STILL classified MoM
  T-7  the merge: the emergent snapshot + the MDVE ChartModel merged (no dupes)
```

**The Phase-1 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical (sl-lmv 912940832fac44bc · trade-dedup 33914c897e777540)
4. `bun diag-telescoping.ts` exits 0 — ALL of T-1..T-7 green, the oracle 7/7 levels present
5. the diff review of EVERY changed line (the WHAT/WHY/HOW verdicts)
6. the wave audit at .trident/wave-audit/wave-w1a-telescoping.md

# PHASE 2 — THE LMV RESOLUTION (L1-L4 — the golden-rung precision)

## 2.1 The Doctrine + The 4 Failure Mechanisms
**The LMV doctrine (the operator's formulation — VERBATIM):**
> "Create a matrix data set based on linear algebra or other MPSE concepts that groups ALL visible ranges of LQZs from candlestick data (the OHLC of several if not dozens of candles across the last 1-6 weeks all reacting to the same price range = clear liquidity zone). Group all of these into matrices so each zone's OHLC data from X number of candles = 1 matrix. We will have a table of matrices denoting exactly what are all the LQZ ranges. LQZs discovered by MPSE matrices."
> "this should be extremely easy to see in data since dozens of candles across multiple weeks all react to the same price range — a liquidity matrix vision that uses matrices to find all the LQZs in the data."
> "this is the definitive test of LMV. LMV is the most important machine in the MDVE - if it cannot copute these LQZs there is a major issue we need to address" (the 7 golden DXY levels at ≤1 pip).

**The 4 failure mechanisms (why 3/7 today — each with its fix):**

| # | The mechanism | The failure | The fix (module) |
|---|---|---|---|
| M-1 | The band merging | 100.975's candles absorbed into the 100.945 shelf's matrix by the ε=2 band → ONE zone-matrix [100.936-100.972], ONE entry at 100.977 (Δ0.2p — served, not distinct) | L1 the modal-cluster emission (the rung = the modal reaction level of the cluster, not the prominence-weighted mean) |
| M-2 | The center drift | the emitted rung = the prominence-weighted mean → 101.19 emits at 101.208 (Δ1.8p), 101.235 at 101.253 (Δ1.8p) | L1 the modal-cluster emission (the modal = the highest-density bucket) |
| M-3 | The dedup floor | any pair ≤ 3 pips cannot both survive → the 0.5-pip pair 101.235/101.240 merged | L2 the 1-pip LQZ dedup (`< 1·pip` strict at ladder-scaffold.ts:446) |
| M-4 | The bridge gap | the matrix LQZ lives in model.lqzMatrix/lmv/ladder but NOT model.zones → the mirror anchor search never sees the rungs as candidates (Bible 4.0:2647) | L3 the matrix→model.zones bridge (matrixLadderRungs → the adapter) |
| M-5 | The single-TF resolution | the golden 3-pip pairs (100.945/100.975) and the 0.5-pip pair (101.235/101.240) unresolvable at the 1H-only resolution | L4 the telescoped 30m/15m LMV runs (the 2026-07-31 ruling: "resolution via modal-cluster emission + 30m/15m telescoped LMV runs + 1-pip LQZ dedup") |

**The LMV machine's constants (unchanged — the canon):**

| The constant | The value | The anchor |
|---|---|---|
| CLUSTER_TOLERANCE_PIPS | 2 | lmv.ts:179 |
| CLUSTER_MAX_SPAN_PIPS | 4 | lmv.ts:188 |
| MIN_REACTION_CANDLES | 3 | lmv.ts:197 |
| MIN_DISTINCT_KINDS | 2 | lmv.ts:206 |
| EPSILON_ATR_FRACTION | 0.25 | lmv.ts:220 |
| DEFENDED_EDGE_QUANTUM_PIPS | 1 | lmv.ts:231 |
| LQZ_LOOKBACK_BARS | 720 (6 weeks 1H) | the operator's 3-6 week sweet spot |
| the zfp ladder | min(60, 20 + floor((touches−3)/2)×5) | lmv.ts:585-588 |
## 2.2 Modules L1-L4 (the modal emission · the 1-pip dedup · the bridge · the telescoped tiers)
The 4 resolution modules (L1-L4 — the mutable prototypes, lmv.ts + lqz-matrix.ts):

**L1 — the modal-cluster emission (the M-1/M-2 kill):**
The emitted rung = the MODAL reaction level of the cluster — the price bucket with the highest reaction-candle density — NOT the prominence-weighted mean. The cluster's candles are bucketed at the 1-pip quantum (DEFENDED_EDGE_QUANTUM_PIPS); the modal bucket's center is the rung. The golden proof: 101.19 emits at ~101.19 (not 101.208); 101.235 at ~101.235 (not 101.253); 100.975 survives as its own matrix (not absorbed into 100.945's).

```
BEFORE (the prominence-weighted mean):
  rung = Σ (price_i × weight_i) / Σ weight_i      → the drift (M-2)
AFTER (the modal-cluster emission):
  buckets = the 1-pip quantized reaction prices
  rung    = the modal bucket's center             → the golden level
```

**L2 — the 1-pip LQZ dedup (the M-3 kill):**
The ladder dedup floor drops from 3 pips to 1 pip (`< 1·pip` strict at ladder-scaffold.ts:446). The 0.5-pip pair 101.235/101.240 BOTH survive as distinct rungs (the operator's 2026-07-31 ruling: "do what make sense and aligns with the visual example I've given you" — the drawn map shows 101.235, 101.240, 101.250 as THREE separate rungs).

```
BEFORE: any pair ≤ 3 pips → merged (101.235/101.240 collapsed)
AFTER:  any pair < 1 pip  → merged (101.235/101.240 distinct — Δ0.5p survives)
```

**L3 — the matrix→model.zones bridge (the M-4 kill):**
The matrixLadderRungs adapter exposes the LMV rungs in model.zones — the mirror anchor search sees the rungs as candidates. The bridge: `matrixZonesToZoneModels` (the L3 bridge, the ladder-scaffold) feeds the rungs into the zone pool with the `LQZ_M` namespace + the priceCenter + the zfp-as-liquidityScore + the sweeps-as-reactionCount (lqz-matrix.ts:599-626 matrixLadderRungs).

```
BEFORE: the LQZ matrix rungs live in model.lqzMatrix/lmv/ladder — the mirror
        anchor search (selectPairNativeZone) NEVER sees them as candidates
AFTER:  the matrixLadderRungs adapter exposes the rungs in model.zones —
        the E2 cascade's bestGroup sees the golden VIOLATED zones
```

**L4 — the telescoped multi-TF LMV runs (the M-5 kill):**
The 30m/15m telescoped LMV runs feed the matrix tiers (per the 2026-07-31 ruling): the LMV run 2 on the 30m bars + the LMV run 3 on the 15m bars refine the 1H rungs. The 3-pip pairs (100.945/100.975) resolve distinct at the finer resolution.

```
HARVEST:  1H bars → the LMV run 1 (the origin tiers)
          30m bars → the LMV run 2 (the refinement tier 1)
          15m bars → the LMV run 3 (the refinement tier 2)
MERGE:    the refined rungs override the coarser parents at the 1-pip quantum
```
## 2.3 The Phase-2 Invariants + Test Spec + Acceptance Gate
**The Phase-2 invariants (asserted at the gate):**

```
INV-1  the 0.5-pip pair 101.235/101.240 both survive as DISTINCT rungs
INV-2  the 3-pip pair 100.945/100.975 both survive as DISTINCT rungs
INV-3  the matrix rungs exposed in model.zones (the bridge active)
INV-4  the rungs' anchors = the modal reaction levels (the drift ≤ 1 pip)
INV-5  the LmvTable spans [98.751, 101.800] for the golden week (48 zone-matrices)
```

**The Phase-2 test spec (written BEFORE the code):**

```
diag-lmv-golden.ts (the existing frozen harness — EXTENDED):
  L-1  the 7/7 golden DXY LQZs at ≤1 pip
       (100.845 · 100.945 · 100.975 · 101.14 · 101.19 · 101.235 · 101.240)
  L-2  the modal-cluster proof: 101.19 emits within 1 pip of 101.19
       (the M-2 regression: the drift ≤ 1 pip on ALL emitted rungs)
  L-3  the 1-pip dedup proof: 101.235 AND 101.240 both present (Δ0.5p survives)
  L-4  the bridge proof: the matrix rungs visible to selectPairNativeZone
       (the mirror anchor search finds a golden-rung candidate)
  L-5  the adversarial: a synthetic 2-rung cluster 3 pips apart stays distinct
  L-6  the adversarial: a synthetic 0.4-pip pair merges (the <1p floor)
```

**The Phase-2 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-lmv-golden.ts` exits 0 — ALL of L-1..L-6 green, the oracle 7/7 at ≤1 pip
5. the diff review of EVERY changed line
6. the wave audit at .trident/wave-audit/wave-w1b-lmv-resolution.md

# PHASE 3 — THE OBCV MACHINE (O1-O5 — the order-block vision)

## 3.1 The Doctrine + The Macro Concept
**The OBCV doctrine (the operator's formulation — VERBATIM):**
> "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function. I dont think matrices apply here like they do with LQZ since there arent dozens of candles reacting to the same level that can be grouped into matricies and detected."
> "and then these 2 become the biggest levers because once these 2 are 96%+ accurate then 90% of the work in charting zones is done from the start already and we have the exact candles/price anchors for nearly all the zones already computed"

**The macro concept (the diagram):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE OBCV MACRO CONCEPT (the order-block vision)              │
├──────────────────────────────────────────────────────────────┤
│  LMV finds levels that DOZENS of candles react to            │
│  (the clustering matrix — the liquidity).                    │
│                                                              │
│  An order block is the OPPOSITE shape of evidence:           │
│  ONE candle that a big move started from (a singular event). │
│                                                              │
│  The impulse candle is the sprinter exploding out of the     │
│  blocks; the order block is the blocks themselves — the      │
│  candle right before.                                        │
│                                                              │
│  OBCV finds every explosion, looks one candle back, and      │
│  classifies the block.                                       │
│                                                              │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│  │ the impulse │   │ the origin │   │ the zone = │            │
│  │ detection  │──►│ matrix F   │──►│ the origin │            │
│  │ (engine A) │   │ (engine B) │   │ candle's   │            │
│  └────────────┘   └────────────┘   │ full H-L   │            │
│                                    └────────────┘            │
│  + the prior-move classifier (C) + the telescoping           │
│    incidence (D) + the firewall invariants (O5)              │
└──────────────────────────────────────────────────────────────┘
```

**The OBCV's 4 sub-engines (the normative pseudocode — Bible 4.5 §16):**

**Sub-engine A — the ATR-normalized displacement field D (the impulse detection):**

```
D_t(i, k) = ( max_{j∈(i, i+k]} close[j] − min_{j∈(i, i+k]} close[j] ) / ATR14_t(i)

where ATR14_t(i) = Wilder's ATR(14) from the 14 bars ENDING at bar i−1
                   (TR prefix sums — deterministic; NEVER including bar i itself —
                    the v4.4 Bug-3 fix: the impulse bar inflates an anchor ATR
                    and blinds the detector)
and k = moveWindowBars(t) = { 4H: 18 (3 trading days), 1H: 36 (1.5 days),
                              30m: 24 (0.5 day — derived, half of 1H) }

isImpulse(i, t) ⟺
  (1) body[i] ≥ 1.5 × μ_body(i−4 .. i−1)      // the relative displacement
  (2) |close[i] − open[i]| ≥ 1.5 × ATR14_t(i)  // the operator canon: ≥1.5×ATR(14)
  (3) D_t(i, k) ≥ θ_t                           // the forward confirmation
  (4) structureBroken(i, t)                     // the close beyond the prior N-bar extreme
where θ_4H = 50 pips / ATR · θ_1H = 30 pips / ATR · θ_30m = 15-20 pips / ATR
```

**Sub-engine B — the origin-candle feature matrix F:**

```
F[o] = [ bw(o), bf(o), rng(o), dir(o), prior(o) ]

bw(o)  = bodyToWick(o)    = body(o) / max(wickTop(o), wickBottom(o))   // ≥ 3.0 for BoM
bf(o)  = bodyFraction(o)  = body(o) / (high(o) − low(o))               // ≥ 0.65 for BoM
rng(o) = rangePips(o)     = (high(o) − low(o)) / pip(t)                // the width gate
dir(o) = sign(close(o) − open(o))     // + → DEMAND below; − → SUPPLY above
prior(o) = the prior-move class       // NONE | OPPOSITE | SAME

The zone range = [o.low, o.high] — the origin candle's FULL high-low, NEVER the
impulse candle (Bible L1146). Each OB = exactly one origin candle = exactly one zone.
```

**Sub-engine C — the prior-move direction classifier:**

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

**Sub-engine D — the telescoping refinement matrix T:**

```
T[parent][child] = 1 ⟺ child.zone ⊆ parent.zone ∧ child.originMs ∈ interval(parent.originCandle)
                        ∧ tf(child) < tf(parent)        // strictly finer
30m OB: REQUIRES a 1H parent (orphan → REJECT — the operator's rule)
1H OB:  MAY refine a 4H OB (optional nesting)
Never skipping a level; never a sibling at the same TF (that is a SEPARATE zone)
```
## 3.2 Modules O1-O5 (the displacement field · the origin matrix · the classifier · the incidence · the firewall)
The 5 OBCV modules (O1-O5 — the implementation):

**O1 — the displacement field (sub-engine A in code):** `computeDisplacementField(bars, tf)` → the per-bar impulse verdict. The ATR via the TR prefix sums (the rolling ATR NEVER includes the impulse bar — the v4.4 Bug-3 lesson). The structureBroken check: the close beyond the prior N-bar extreme (the N = the moveWindowBars).

**O2 — the origin-candle feature matrix (sub-engine B in code):** `buildOriginMatrix(bars, impulses)` → F[o] per origin candle. The bw/bf/rng/dir/prior columns; the zone = [o.low, o.high].

**O3 — the prior-move classifier (sub-engine C in code):** `classifyPriorMove(o, bars, L)` → NONE/OPPOSITE/SAME via the signed ATR-normalized displacement sums; `classifyOrigin(o, t)` → BoM/MoM/REJECT (the piecewise-total — every origin classified exactly once).

**O4 — the telescoping incidence matrix (sub-engine D in code):** `buildIncidenceMatrix(obZones)` → T[parent][child]; the 30m orphan → REJECT.

**O5 — the firewall + the wiring:** the invariants asserted at the output + the ObZone[] integration into ChartModel.zones with `formationMs` + `parent`; the ladder scaffold's ORDER_BLOCK source fed by OBCV; the BoM/MoM classification feeding the E3's `+5 isBoM` scoring, the zfp ladders, and the Law-14 TP walk's significance ranking (UM BoM > liquidityScore≥5 > BoM > MoM ≤1x); the E/SL anchors OB-native (the entry at the origin-candle defended edge, the SL just beyond the origin-candle reaction extreme + the Law-7 buffer).

**The downstream integration (the OBCV's consumers):**

```
ObZone[] → ChartModel.zones (with formationMs + parent)
  ├──► the scaffold ladder's ORDER_BLOCK source
  ├──► the E3's +5 isBoM scoring + the zfp ladders
  ├──► the Law-14 TP walk's significance ranking
  └──► the E/SL anchors OB-native (the entry at the defended edge)
```
## 3.3 The Phase-3 Invariants + Test Spec + Acceptance Gate
**The Phase-3 invariants (asserted at the gate):**

```
INV-1  |BoM| + |MoM| == |deduped|       // the partition — every zone classified once
INV-2  ∀ z30m: parent != null           // the nesting — the 30m never top-level
INV-3  ∀ z: widthGate(z)                // the width canon re-verified at the output
INV-4  ∀ z: the zone = the origin candle's FULL high-low
INV-5  the ATR NEVER includes the impulse bar (the Bug-3 lesson)
```

**The Phase-3 test spec (written BEFORE the code):**

```
diag-obcv-golden.ts:
  O-1  THE ORACLE: the golden reconstruction from data alone
       · 1H BoM demand 100.68-100.73 (the deepest TP — T6's target)
       · 4H BoM supply 101.235-band (T6's entry band)
       · 1H MoM demand 100.845 (T3's entry)
  O-2  the 96%+ agreement vs the operator's drawn OB map
       (the golden annotations are the ground truth)
  O-3  the partition: |BoM| + |MoM| == |deduped| on the fixture
  O-4  the nesting: NO orphan 30m OB (the fixture's 30m OBs all have a 1H parent)
  O-5  the adversarial: an impulse whose ATR includes the impulse bar → the
       detector's blindness reproduced THEN fixed (the Bug-3 regression)
  O-6  the adversarial: a 30m BoM-shaped OB → REJECT (no parent)
```

**The Phase-3 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-obcv-golden.ts` exits 0 — ALL of O-1..O-6 green
5. the diff review of EVERY changed line
6. the wave audit at .trident/wave-audit/wave-w2-obcv.md

# PHASE 4 — THE 3 LOST MIRROR FIXES + THE SWEEP-BONUS INVERSION (M1-M4)

## 4.1 The Doctrine + The Forensic State
**The doctrine (the SL anchor law — VERBATIM):**
> "SL goes INSIDE the next LQZ next to the entry zone. Should usually be within < 20 pips. Any massive stupid 40 pip SLs are dumb as fuck for no reason" (D35)
> "you are allowed to change these in the v4.5 codebase; the FROZEN directive is to the actual v4.4 CHECKPOINT — THAT is NOT to ever be touched again" (the frozen clarification — mirror.ts IS mutable in v4.5.x)

**The forensic state (the 3 lost fixes — Bible 4.5 §9.1, verified):**

| The fix | The v4.5.5_PRISTINE_CORE anchor | The current state |
|---|---|---|
| computeGoldenSL_V452 + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK | mirror.ts:2417-2536 | ABSENT — the v4.5.2-E2-cascade fork dropped it |
| weekProbeAtAnchor | mirror.ts:2328-2381 | ABSENT |
| classFlexibleLQZFallback + the GU distribution loop | mirror.ts:1213/:1324/:1858 + :2123-2131 | ABSENT — BUILD_STATE.md:127 falsely claims present |

**The computeLmvTP sweep-bonus inversion (the documented-unbuilt — Bible 4.5 §3.7):**
The current significance: `sig = (sweepCount≥1 ? 50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)` — the +50 SWEEP PROMOTION is WRONG: a swept rung = liquidity TAKEN → must be DEMOTED −30. The GU TP lands one rung too shallow → RRR 1.30 < the floor → RRR_DISCARDED → the GU lane dead. The evidence (diag-rungs): `[1.34081-1.34116] defEdge=1.34111 zfp=60 sweeps=1 → sig 90 (PROMOTED — wrong)`; `[1.34036-1.34073] defEdge=1.34022 zfp=50 sweeps=0 → sig 40 (DEMOTED — wrong)`.

```
BEFORE: sig = (sweepCount≥1 ? +50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)
AFTER:  sig = (sweepCount≥1 ? −30 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)
```
## 4.2 Modules M1-M4 (the golden SL floor · the week probe · the class-flexible fallback · the −30 inversion)
The 4 modules (M1-M4 — mirror.ts):

**M1 — computeGoldenSL_V452 + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK (the 4-stage golden SL pipeline):**

```
STAGE 1  computeSL_LMV golden SL (the existing — the next rung's reactionExtreme
         + the Law-7 buffer)
STAGE 2  PROBE_GUARD + the §4.4.3 wick-clear:
         const probe = weekProbeAtAnchor(...);
         if (!clearsAnatomy(sl)) sl = direction==='SHORT' ? p.price+buffer : p.price−buffer
STAGE 3  THE GOLDEN FLOOR GOLDEN_SL_MIN_PIPS=4:
         a sub-floor SL walks to the next defended rung in [4p, 9.5+buffer]
         clearing the anatomy
STAGE 4  the selective util guard:
         util = probeDepthPips/structDistPips;
         util >= 0.40 → KEEP the structural SL with UTIL_GUARD_KEEP
         else → PROBE_GUARD flag
```

**M2 — weekProbeAtAnchor (the deepest adverse probe at the anchor within the model week):**
The OB: the non-pierced reaction-event prices; the GA-audit fix: the LMV candle wicks reaching INTO the anchor band ARE adverse anatomy; the consumed anchors also include the band edge; the LQZ: the week candle highs/lows.

```
weekProbeAtAnchor(anchor, bars, weekStartMs):
  probe = the deepest adverse price at the anchor within the model week
  OB:   the non-pierced reaction-event prices (never the wick tips beyond)
  LMV:  the candle wicks reaching INTO the anchor band — adverse anatomy
  consumed anchors: include the band edge
  LQZ:  the week candle highs/lows
  return { probeDepthPips, structDistPips, clearsAnatomy(sl) }
```

**M3 — classFlexibleLQZFallback + the GU distribution loop (the §8.1 union pool):**
The LMV rungs join the OB-class candidacy UNCONDITIONALLY at group −1.5 (between the OB recently-battled −1 and the OB rank/nearest −2) with the recency gate (`lastReaction ∈ [weekStartMs, anchorMs]`). The distribution deadlock fix: `if (g.status === 'ACTIVE') usedGuAnchors.add(...)` → `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror. The macro principle: "Distribution must be a property of the SIGNALS (N distinct signals deserve N distinct zones), NEVER of the OUTCOMES."

```
GU distribution (BEFORE → AFTER):
  BEFORE: usedGuAnchors.add() only for ACTIVE mirrors →
          the distribution deadlock (the pool collapses)
  AFTER:  usedGuAnchors.add(g.anchorZoneId) for EVERY constructed mirror →
          the GU anchors spread across the distinct zones (≥8 distinct)
```

**M4 — the sweep-bonus inversion (the −30):**
The computeLmvTP significance: `(sweepCount≥1 ? −30 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)`. The GU TP stops landing one rung too shallow → the RRR_DISCARDED casualty drops.
## 4.3 The Phase-4 Invariants + Test Spec + Acceptance Gate
**The Phase-4 invariants (asserted at the gate):**

```
INV-1  ∀ sl: slDistancePips ∈ [GOLDEN_SL_MIN_PIPS=4, GOLDEN_SL_MAX_PIPS=9.5] ∨
       the documented exception (the deep 4H/8H shield cases ≤ 36 = the D17 ceiling)
INV-2  ∀ sl: clearsAnatomy(probe) — the weekProbeAtAnchor passes
INV-3  the GU distribution: ≥ 8 distinct anchors on the golden week
INV-4  the significance: a swept rung NEVER scores above an unswept rung of
       the same zfp class (the −30 inversion proven)
INV-5  the D17 ceiling 36 pips HARD on ALL the fallback SL paths
```

**The Phase-4 test spec (written BEFORE the code):**

```
diag-mirror-fixes.ts:
  M-1  the golden SL floor: the T3 fixture (100.845 entry, the golden SL 100.77)
       → the machine's SL ≥ 4 pips from the entry (the sub-4p walk proven)
  M-2  the weekProbeAtAnchor: the T6 fixture (101.235 entry) → the probe at
       101.330 band detected; the SL clears the anatomy
  M-3  the class-flexible fallback: the GU lane emits ≥ 8 distinct anchors
       on the golden week (the distribution deadlock gone)
  M-4  the sweep inversion: the diag-rungs fixture → the swept rung's sig ≤
       the unswept rung's sig (the [1.34081] case now DEMOTED)
  M-5  the adversarial: a sub-4p SL candidate → walked to the next defended rung
  M-6  the adversarial: a 40-pip SL → rejected (the D17 ceiling)
```

**The Phase-4 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-mirror-fixes.ts` exits 0 — ALL of M-1..M-6 green
5. the diff review of EVERY changed line
6. the wave audit at .trident/wave-audit/wave-w3-mirror-fixes.md

# PHASE 5 — THE SIX LEXICONS WIRED (X1-X6 — the semantic intent layer)

## 5.1 The Doctrine (the operator's mapping — the machine form)
**The doctrine (the operator's mapping — the LAW):**
> "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = Trident deep planning L2 · trade setups = tool outputs"

The lexicons ARE the semantic intent layer — the layer between the mechanical detection (the regex/LMV/OBCV) and the algorithmic systems (the shape chains). The PLUTUS_V4.5.4_LEXICON_SPEC.md (301L) is the design authority; this phase WIRES it.

**The machine form (the IntelligenceLexicon — the contract every lexicon implements):**

```typescript
interface TradingLexiconRule {
  id: 'candle-pressure' | 'candle-shape' | 'zone-classification' | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
  families: TradingPatternFamily[];
  classify(input: LexiconInput): LexiconResult;   // {intent, confidence, action: 'classify'|'reject'|'escalate'}
  enforce(result: LexiconResult, phase: 'A' | 'B'): void;
  // Phase A = the E1/E2/E3 boundary THROW (a hard violation — e.g. the phantom-BoM reversal)
  // Phase B = the OUTPUT MUTATION (the classification demand appended to the stage's output)
  escapeHatchTool: string;   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: number; // 3 — three rejected classifications → the problem-solving dispatch
}

interface TradingPatternFamily {
  group: 'candle-predicate' | 'zone-predicate' | 'chain-predicate' | 'projection-predicate';
  descriptive: Predicate[];   // the EVIDENCE AGAINST the semantic intent (neg weight +1)
  suggestive: Predicate[];    // the EVIDENCE FOR the semantic intent (pos weight +1, some +2)
  substitute?: Predicate[];   // the MISLEADING SURFACE patterns (pos +2 — the regex without the psychology)
  use?: Predicate[];          // the LEGITIMATE EXEMPTORS (neg +3 — the classification is REAL)
}
// Predicate = a deterministic function over the OHLC/zone data: (data: LexiconData) => boolean
// The confidence = pos/(pos+neg+1) · the decision = pos > neg ? 'classify' : 'reject'
// The MPSE law: every predicate is a deterministic expression (a numeric comparison / a
// set membership / a piecewise branch) — fuzzy prose is the derailment (the Losslessness Theorem)
```

**The wiring map (the lexicon → the consumer — the diagram):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE SIX LEXICONS WIRED (the semantic intent layer)           │
└──────────────────────────────────────────────────────────────┘

  LEXICON 1 candle-pressure ──► the LMV side vote (lmv.ts:618-645)
       └─ the touch kinds: SWEEP / WICK_REJECT / BODY_DEFEND /
          CONSOL_DWELL / PASS_THROUGH (the classifyTouch)

  LEXICON 2 candle-shape ──► the E2 per-day classification (shape-brain.ts:331/:890)
       └─ the families: ss / bs / wl / rwl / r / wls

  LEXICON 3 zone-classification ──► the E1 typing + the E2 death-rule exemption
       └─ the families: bom / mom / PHANTOM-BOM / fortress-bom / ip
       └─ THE phantom-BoM all-4 predicate (the operator's fortress)

  LEXICON 4 zone-pressure ──► the E2 designation + the E3 SL-relevance switch
       └─ the families: virgin / virgin-death-scope / tf-hierarchy /
          active / depleted / fortress / broken

  LEXICON 5 shape-chain ──► the E2 chain + the unified macro authority
       └─ the families: ss-to-bs / bs-to-r / bs-to-rwl / r-to-wl /
          wl-to-ss / micro-vs-macro

  LEXICON 6 obvious-trades ──► the STEP B's token baseline
       └─ the families: zone-identification / pressure-mechanics /
          shape-chain-context / forward-position / anchor-construction /
          validation / strength-comparison / reaction-count-state
```

**The phase semantics (the enforcement):** Phase A = the E1/E2/E3 boundary THROW (a hard violation — the phantom-BoM reversal, the macro divergence, a DEPLETED zone as the entry-primary); Phase B = the OUTPUT MUTATION (the classification demand appended to the stage's output — the audit trail). The escape hatches: the token-4 break-validation (with the real close/claim sequence) + the token-11 validation (with the real E2 evidence) — a legitimate operator-drawn setup is NEVER blocked.
## 5.2 Modules X1-X6 (each lexicon: the families · the consumer · the enforcement point)
The 6 lexicon modules (X1-X6 — each: the families' core + the consumer + the enforcement point):

**X1 — candle-pressure-lexicon (the per-candle battle semantics):**
The consumer: the LMV side vote (lmv.ts:618-645) + the zone-pressure lifecycle's consumption events. The core families: **defend** (the body closed against the approach + the next bar turned ≥ max(2p, 0.5×ATR) against — the BODY_DEFEND predicate, the defended-edge accumulator) · **reject** (the WICK_REJECT: a ≥2p wick INTO the band + the body reversed + retreated to the approach side — the side vote SELL fromAbove / BUY fromBelow) · **sweep** (the SWEEP: the wick crossed the ENTIRE bucket ≥2p AND the body closed back — the reactionCount += 1) · **dwell** (the CONSOL_DWELL: ≥3 consecutive bars intersecting, span ≤ 2 bucket widths) · **pass** (the PASS_THROUGH — the anti-noise exclusion). The enforcement: Phase A — a candle classified PASS_THROUGH that the LMV counts as a reaction → THROW at the lmv.ts boundary; Phase B — the touch-kind demand appended to the LMV table's row.

**X2 — candle-shape-lexicon (the per-candle shape signatures):**
The consumer: the E2 per-day shape classification (shape-brain.ts:331/:890). The inputs: the anatomy tokens (body_fraction, body_to_wick, wick_ratio, total_range_ratio, color_consistency, candle_progression, retracement_size over the 3-day window). The core families: **ss** (bf 0.10-0.30 · range 0.2-0.5× · alternating colors · BOTH bounding zones' zfp < 30%) · **bs** (thrust bf 0.65-0.95 · minimal wicks < 0.2 · the PROGRESSION small→MASSIVE · the retracements < 30% · the bounding zone's zfp > 45%) · **wl** (3 same-color candles · the long wicks ~1× the body — the grab→momentum→grab) · **rwl** (6+ candles · bf 0.30-0.50 · the mixed reverse-dominant) · **r** (6-24 candles · bf 0.40-0.60 · the V-shape) · **wls** (14-15+ candles · the both-side wicks · 3+ moderate-zfp zones in a narrow band). The enforcement: Phase A — a day the lexicon classifies BS but E2 says PBS → THROW at the E2 boundary (the unified macro check); Phase B — the shape demand on the day decomposition. **The C-3 sub-forms wired: RWL-rapid/RWL-gradual · WL-compact/WL-extended.**

**X3 — zone-classification-lexicon (the zone-identity + THE PHANTOM BoM):**
The consumer: the E1 zone typing + the E2 virgin-MoM death-rule decision. THE most important lexicon — the blanket virgin-MoM death rule (shape-brain.ts:2330-2336, the W0-verified line) rejected the operator's #2 demand and caused the EU LONG's miss. The core families: **bom** (prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate) · **mom** (prior == SAME ∧ validOrigin ∧ widthGate) · **phantom-bom** (THE FORTRESS — the all-4 predicate below) · **fortress-bom** (a plain BoM that held 4+ mitigations — "has not been pierced or broken in 4 prior mitigations... likely to become a fortress zone and NOT get pierced") · **ip** (the 9-pillar confluence). The enforcement: Phase A — a phantom-BoM-classified zone that the virgin-MoM rule rejects → THROW at the E2 boundary (the death-rule exemption demand); Phase B — the PHANTOM_BOM flag appended to the classification.

**THE PHANTOM-BoM ALL-4 PREDICATE (the operator's criteria — the code):**

```
PHANTOM_BOM ⟺
  (1) the LARGE-OB width predicate     — the SMC ratio-based width (the OB's size
       is a function of the move it precedes)
  ∧ (2) the mid-swing-recovery + the FAKEOUT predicate — "clearly breaks
       (temporarily for only a couple of candles) the actual swing move structure
       and is clearly a 'fake RWL' type or 'correction' fakeout candle"
  ∧ (3) the pre-formation opposing-BoM reaction predicate — "this correction
       instantly reacts to before forming the big OB" (the reaction PRECEDES
       the formation)
  ∧ (4) the macro-origin continuation — the KCE-Telescoping: the move completes
       the FULL swing from the macro origin element

3-of-4 → the DEATH rule stands (the conservative default)
The type-1 virgin MoM's FULL signature (small OB + the uninterrupted BS/WL +
the mid-move position) → DEATH always (the use-exemptor)
The boolean algebra: PHANTOM ∧ DEATH_TYPE1 → DEATH · PHANTOM ∧ ¬DEATH_TYPE1 → FORTRESS
```

**X4 — zone-pressure-lexicon (the lifecycle/mitigation/freshness + the fortress):**
The consumer: the E2 designation (the pressureScore: +40 VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS) + the E3 SL-relevance switch. The core families: **virgin** (reactionCount = 0 ∧ BoM — the ENTRY-PRIMARY +40) · **virgin-death-scope** (the death rule applies to the 30m virgin MoMs + the 1H TYPE-1 virgin MoMs; the 4H zones are NEVER death zones — "ALL 4H zones WILL have at least 1 reaction before mitigation") · **tf-hierarchy** (4H = the King · 1H = the General · 30m = the Captain — "HTF > LTF") · **active** (1-2 reactions — ~80%/~50%) · **depleted** (≥3 — the TP-target-ONLY, "zones usually fail on the THIRD mitigation") · **fortress** (4+ strong holds — the phase transition Fire→Earth, the 95% direction flip) · **broken** (the pierce with a battle — the role reversal). The enforcement: Phase A — a DEPLETED zone the E2 treats as the ENTRY-PRIMARY → THROW (the TP-target-ONLY rule); Phase B — the lifecycle demand on the pressure state.

**X5 — shape-chain-lexicon (the fractal chain + the unified macro authority):**
The consumer: the E2 chain + the unified macro authority. The core families: **ss-to-bs** (the marubozu breakout 3-5× the SS body · the ZFP-conditioned: SS + the bounding zone > 45% → BS) · **bs-to-r** (the exhaustion pin bar · BS + the target 20-40% → R) · **bs-to-rwl** (the shooting star/engulfing · BS + the target < 20% → RWL — the hard wall) · **r-to-wl** (the long-wick liquidity grab at the recovery extreme) · **wl-to-ss** (the IMMEDIATE consolidation) · **micro-vs-macro** (THE FRACTAL — the same chain valid at the 30m micro AND the 4H macro; the unified macro authority: the DXY's chain for the EU, the EU core's for the GU — the divergence = the per-pair mechanics WITHOUT the macro override). The enforcement: Phase A — a day whose per-pair shape diverges from the macro authority without a documented per-pair mechanic → THROW at the E2 boundary; Phase B — the authority-override demand on the day decomposition.

**X6 — obvious-trades-lexicon (the forward-reasoning baseline — THE MISSING LAYER):**
The consumer: the STEP B's token baseline — the operator's EU analyses in the golden doc VERBATIM. The core families: **zone-identification** ("the 1H Unmitigated MoM Demand zone at 1.14145 - 1.14000 from Thursday's Breakout Surge") · **pressure-mechanics** ("This is clearly an area of strong pressure + bullish liquidity... the opposing bearish pressure is not yet strong enough to pierce it") · **shape-chain-context** ("This follows the shape chain forming of SS → BS") · **forward-position** ("the short is halfway to the demand") · **anchor-construction** ("Set E at the TP level of trade #1, SL 3 pips outside the far edge of the nested liquidity zone... set TP at the near edge of the supply zone") · **validation** ("all the macro storyline confluences align") · **strength-comparison** ("the Bearish BS from Tuesday was extremely weak compared to the Bullish BS from Thursday") · **reaction-count-state** ("zones usually fail on the THIRD mitigation"). The enforcement: Phase A — a projection whose E/SL/TP are not traceable → THROW (the E3-NEVER — never a fabricated level); Phase B — the projection demand appended to the E3 output. The escape hatch: the diag-monday harness; the escalation = 3 rejected projections → the problem-solving dispatch.
## 5.3 The Phase-5 Invariants + Test Spec + Acceptance Gate
**The Phase-5 invariants (asserted at the gate):**

```
INV-1  ∀ lexicon: the families' predicates deterministic (the MPSE Losslessness)
INV-2  ∀ lexicon: classify() returns {intent, confidence, action} — never a bare string
INV-3  the phantom-BoM all-4: the golden fixture's demand [1.14145-1.14000]
       → PHANTOM_BOM (EXEMPT) · a 3-of-4 fixture → DEATH
INV-4  ∀ lexicon: an escapeHatchTool named (never blocked)
INV-5  every lexicon's classification CONSUMED by a machine or agent path
       (the wiring map proven by the grep: each lexicon's id referenced)
```

**The Phase-5 test spec (written BEFORE the code):**

```
diag-lexicons.ts:
  X-1  the phantom-BoM fixture: EUR/USD|1H|1782990000000|1.14004 → PHANTOM_BOM
       (the W5 probe's fixture — the EXEMPT verdict)
  X-2  the phantom-BoM 3-of-4: a synthetic zone with 3 predicates (no macro-origin
       continuation) → DEATH (the conservative default)
  X-3  the candle-pressure: the classifyTouch piecewise-total on the fixture —
       exactly one branch per candle (the exhaustiveness)
  X-4  the candle-shape: the golden week's shapes classified per the anatomy
       (the SS/BS/R/WL chain reproduced)
  X-5  the zone-pressure: the lifecycle states on the golden zones
       (the fortress 101.235-band · the depleted 3+ cases)
  X-6  the shape-chain: the unified macro authority — the GU Monday R divergence
       recorded + the macro override wins
  X-7  the obvious-trades: the EU #2's projection tokens reproduced
       (the anchor-construction: E 1.14110 · SL 1.13990 · TP 1.14460)
  X-8  the adversarial: a 3-of-4 phantom candidate NEVER exempts
  X-9  the adversarial: an invented zone id in a projection → the CONTRACT
       violation path
```

**The Phase-5 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-lexicons.ts` exits 0 — ALL of X-1..X-9 green
5. the diff review of EVERY changed line
6. the wave audit at .trident/wave-audit/wave-w4-lexicons.md

# PHASE 6 — THE SHADOW RETIREMENT + THE GROUNDING WARN (S1-S3 — the D1/D2 law made mechanical)

## 6.1 The Doctrine (D1/D2 verbatim + the rewire authority)
**The doctrine (D1/D2 verbatim + the rewire authority):**
> D1 — "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop"
> D2 — "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."
> D7 — "we are replacing all shadow agent steps with the proper primary agent so that we can accurately see what is happening. This is how it should be anyways the shadow agent was a cheat basically."

**The rewire authority:** the SHADOW_REWIRE_SPEC (HANDOVER_PACKAGE_4.5.4/SHADOW_REWIRE_SPEC.md, 506L) — the complete conversion: the shadow infra inventory (Part 8) · the agent-in-session contract (Part 9) · the conversion pseudocode (Parts 5-6) · the pipeline-integration detail (Part 11) · the verification matrix (Part 11.5) · the conversion summary (Part 12). This phase EXECUTES the rewire spec.

**The phase diagram (what this phase does):**

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 6 — THE SHADOW RETIREMENT + THE GROUNDING WARN         │
├──────────────────────────────────────────────────────────────┤
│  S1  the executor deletion                                    │
│      shadow-agent.ts's fetch/SSE/SHADOW_MODEL path → DELETED  │
│      the C2 machinery → the reference pattern (never invoked) │
│                                                              │
│  S2  the WARN semantics                                      │
│      the SHADOW_SHAPE_VIOLATION throws → the GROUNDING_WARN   │
│      rows (the D2 state machine)                             │
│      the hard-throw ONLY after 3 refinements                 │
│                                                              │
│  S3  the contract shape                                      │
│      the token 8/10/11 hooks → the agent-facing interface    │
│      (the ledger + the candidates the agent refines)         │
│      the failure store's live rows: GROUNDING_WARN /         │
│      REFINEMENT_EXHAUSTED / CONTRACT_VIOLATION /             │
│      MACRO_DIVERGENCE                                        │
└──────────────────────────────────────────────────────────────┘
```
## 6.2 Modules S1-S3 (the fetch deletion · the contract shape · the WARN semantics + the store rows)
The 3 modules (S1-S3):

**S1 — the executor deletion (shadow-agent.ts):**
Delete: `callModel`'s `fetch(SHADOW_BASE_URL)` path · the SSE stream handling + the 90s idle detector's runtime · the SHADOW_MODEL pin · the SHADOW_* error taxonomy's throw paths · the secrets chain's invocation (resolveShadowApiKey call sites). Preserve AS REFERENCE (archived, never invoked): the frozen-model concept · the SSE idle-window stall-detector pattern · the content||reasoning defensive read · the secrets chain's structure (for any future agent-side call design). The grep gate: `grep -rn "fetch\|axios\|http" src/mdve/shadow-agent.ts src/mdve/reasoning-chain.ts` → ZERO network calls in the reasoning path.

**S2 — the WARN semantics (reasoning-chain.ts — the D2 state machine):**
The grounding checks (shadow-agent.ts:447/:535's logic — MOVED into the machine's validation): forwardPosition numeric · entry/sl/tp numeric + direction-ordered · chosenTarget ∈ the CLOSED set · the anchors trace. Each violation → the GROUNDING_WARN row `{check, tokenId, sourceRef, value, proposedCorrection}` → the failure store → the agent loop CONTINUES with the WARN as the refinement input. The hard-throw ONLY after 3 (REFINEMENT_EXHAUSTED → the store → the synthesis — data, never a crash, D18).

```
BEFORE (the D2 violation):
  if (typeof out.forwardPosition !== 'number') throw new ShapeViolation(...);
  → the loop dies on the FIRST violation → llm 0 (F1)
AFTER (the D2 law):
  const warn = buildGroundingWarn(check, tokenId, sourceRef, value, proposed);
  recordFailure('GROUNDING_WARN', warn);         // the store row
  return { ...projection, warnings: [...warnings, warn] };  // the loop continues
  // after 3 failed refinements → recordFailure('REFINEMENT_EXHAUSTED') → hard-throw
```

**S3 — the contract shape (the agent-facing interface — the rewire spec Part 9):**

```typescript
// the token 8/10/11 hooks — the PRIMARY AGENT's interface
interface ReasoningStepInput {
  ledger: TokenLedger;            // tokens 1-7 + 9 — the machine's deterministic core
  operativeZone: ZoneModel;       // the E1 zone + the pressure state
  candidates: {                   // the machine's candidates the agent refines
    forwardPosition: number;
    chainedEntry: number;
    slCandidate: number;
    tpCandidate: number;
    continuationTargets: string[];  // the CLOSED set — never extended
  };
  macro: MacroAuthority;          // the unified macro signal
  e1ZoneIds: string[];            // the VALID zone ids (the W-5 check)
  e2ProjectionIds: string[];      // the VALID projection ids (the W-6 check)
}

// the agent's DECISIONS (what it emits via the tool args — NOT the full projections)
interface ReasoningStepDecisions {
  forwardPosition: number;
  chosenTarget: string;           // ∈ the CLOSED continuationTargets
  E: number; SL: number; TP: number;
  e1ZoneId: string; e2ProjectionId: string;
  confidence: number;             // the agent's validation judgment
  rationale: string;              // the visible reasoning (the stream)
}

// the MACHINE assembles the full TradeProjection from the decisions +
// the ledger, then validates (the WARN set) — the A-2 audit amendment
```
## 6.3 The Phase-6 Invariants + Test Spec + Acceptance Gate
**The Phase-6 invariants (asserted at the gate):**

```
INV-1  NO network call in the reasoning path (the grep gate: fetch/axios/http = 0)
INV-2  NO first-violation hard-kill (the A1 test: the WARN fires, the loop continues)
INV-3  the hard-throw ONLY after 3 (REFINEMENT_EXHAUSTED, data not a crash)
INV-4  the failure store's live rows: GROUNDING_WARN / REFINEMENT_EXHAUSTED /
       CONTRACT_VIOLATION / MACRO_DIVERGENCE (no SHADOW_* live rows)
INV-5  the contract shape: the ReasoningStepInput/Decisions interfaces compile
```

**The Phase-6 test spec (written BEFORE the code):**

```
diag-grounding-warn.ts:
  S-1  the A1 test: a deliberately-bad projection (entry/sl/tp as strings, an
       invented zone id) → the GROUNDING_WARN fires + the loop continues
       (the stats' refinements > 0 — NEVER a hard-throw on the first violation)
  S-2  the 3-attempt cap: the same bad projection 3× → REFINEMENT_EXHAUSTED
       → the store row → the synthesis (the process survives, the data recorded)
  S-3  the direction-order: a LONG with E > SL → the W-3 WARN → the refinement
       input carries the proposed correction
  S-4  the CLOSED set: a chosenTarget outside the continuationTargets → the W-4
       WARN (never extended)
  S-5  the grep gate: the reasoning path's network calls = 0
  S-6  the adversarial: a NaN forwardPosition → the W-1 WARN (not a crash)
  S-7  the adversarial: bun:sqlite unavailable → the append-only fallback row
       (never silently drops)
```

**The Phase-6 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-grounding-warn.ts` exits 0 — ALL of S-1..S-7 green
5. the grep gate: 0 network calls in the reasoning path
6. the diff review of EVERY changed line
7. the wave audit at .trident/wave-audit/wave-w5-shadow-retire.md

# PHASE 7 — THE STEP A/B TOOLS + THE PIPELINE WIRING (T-A/T-B — the agent-in-the-loop becomes real)

## 7.1 The Doctrine (the T1 mechanics restored)
**The doctrine (the T1 mechanics restored — the operator's architecture):**
> "The agent is NOT a passive caller. Between each tool call, the agent performs reasoning that is REQUIRED for the next tool to function. The next tool's arguments MUST contain the output of that reasoning." (T1:46)
> D5 — "the reasoning chain I said to wire in as a STEP in the tool chain pipeline" (the handover README:53)
> D8 — "the reasoning chain needs to be a manual agent step in between specific tool calls... between E1/E2 + E2/E3 as a proper in between step that has reasoning informed generation of the next phase" (the operator, 2026-08-08)

**The T1 mechanics this phase restores (the five — with the 4.5.4 application):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE T1 MECHANICS RESTORED (the 4.5.4 application)            │
├──────────────────────────────────────────────────────────────┤
│  1  The global context     → the PipelineRunContext gains     │
│                             stepADesignation + projections    │
│  2  The tool registry      → the 7-tool chain (the D5 order)  │
│  3  The mechanical walls   → fs.access (files) · the zone-id  │
│                             membership (semantic) · the price │
│                             references (format)               │
│  4  The NEXT instructions  → every tool's output ends with    │
│                             "NEXT: AGENT REASONING STEP <A|B>"│
│  5  The agent IS the       → the primary agent reasons in its │
│      reasoner              │ own context (the shadow retired) │
└──────────────────────────────────────────────────────────────┘
```
## 7.2 Module T-A (the STEP A tool — the designation contract + the firewalls)
**T-A — plutus-pipeline-reason-step-a (the E1→E2 designation tool):**

```typescript
const plutusPipelineReasonStepA = tool({
  description: 'STEP A (E1→E2): the agent reads the zone map + the pressure ' +
    'states + the lexicon classes, then designates the zones the E2 shape ' +
    'chain will build on. The designation is the contracted input of ' +
    'plutus-pipeline-shapes.',
  args: {
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    designation: z.array(StepADesignationSchema).min(1),
    // StepADesignationSchema: { pair, day, zoneId, role, classification,
    //                           rationale (min 40, must match /\d+\.\d{3,}/),
    //                           pressureRead }
  },
  async execute(args) {
    const ctx = ensureContext(args.weekStart);

    // ── THE MECHANICAL FIREWALL (the T1 semantic + format layers) ──
    const zoneIds = new Set(ctx.zoneMapSnapshot.zones.map(z => z.id));
    for (const d of args.designation) {
      if (!zoneIds.has(d.zoneId)) {
        return { status: 'BLOCKED', error: `zoneId ${d.zoneId} not in the E1 zone map` };
      }
      if (d.rationale.length < 40 || !/\d+\.\d{3,}/.test(d.rationale)) {
        return { status: 'BLOCKED', error: 'rationale must be ≥40 chars with a price reference' };
      }
    }

    // ── THE STEP A OUTPUT ──
    ctx.stepADesignation = args.designation;
    return {
      title: `STEP A complete — ${args.designation.length} designations`,
      output: JSON.stringify({
        status: 'success',
        designation: args.designation,        // the agent's visible reasoning
        nextStep: 'AGENT REASONING STEP A done — call plutus-pipeline-shapes ' +
                  'with weekStart (the designation is in the context).',
      }),
    };
  },
});
```

**The tool's flow (the agent's visible turn):**

```
Tool 2 zones returns ──► { zoneMapSnapshot, lexiconClasses, pressureStates,
                           nextStep: 'AGENT REASONING STEP A: read the zone map
                           and call plutus-pipeline-reason-step-a with your
                           designation[]' }
The AGENT reads ──► the map + the pressure reads (the operator's E1 reading
                    protocol — the macro narrative first, the pressure state,
                    the liquidity, the break-validation, the strength, the
                    reaction count, the deep liquidity)
The AGENT emits ──► the designation[] (zoneId + role + classification +
                    rationale + pressureRead per day per pair)
The firewall ─────► every zoneId ∈ the map · every rationale ≥40c + a price
                    (BLOCKED if invented or generic)
```

**The done-when (T-A):** the A4 test (a fabricated designation → BLOCKED) · the A4b test (a generic rationale → BLOCKED) · the stream shows the agent's designation with the real zone ids + the pressure reads.
## 7.3 Module T-B (the STEP B tool — the 11-token contract + the assemble + the WARN)
**T-B — plutus-pipeline-reason-step-b (the E2→E3 11-token tool):**

```typescript
const plutusPipelineReasonStepB = tool({
  description: 'STEP B (E2→E3): the 11-token reasoning chain. The machine ' +
    'computes the ledger (T1-7 + T9) and presents it; the AGENT performs the ' +
    'judgment tokens (T8 forward-position, T10 anchor construction, T11 ' +
    'validation) in-session; the machine validates (the WARN set, D2) and ' +
    'assembles the TradeProjections — the contracted input of ' +
    'plutus-pipeline-setups.',
  args: {
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    decisions: z.array(ReasoningStepDecisionsSchema).min(1),
    // ReasoningStepDecisionsSchema: { forwardPosition, chosenTarget, E, SL, TP,
    //                                 e1ZoneId, e2ProjectionId, confidence,
    //                                 rationale }
  },
  async execute(args) {
    const ctx = ensureContext(args.weekStart);

    // ── THE MACHINE'S LEDGER (the tokens 1-7 + 9 — computed FIRST, shown) ──
    const ledger = ctx.reasoningLedger;   // set by the shapes tool's chain run

    // ── THE VALIDATION (the WARN set — the D2 law, Phase 6 S2) ──
    const warnings: GroundingWarn[] = [];
    for (const d of args.decisions) {
      if (typeof d.forwardPosition !== 'number' || !isFinite(d.forwardPosition)) {
        warnings.push(buildGroundingWarn('W-1', 'T8', 'forwardPosition', d.forwardPosition,
          're-emit the forward position as a number of pips'));
      }
      if (![d.E, d.SL, d.TP].every(n => typeof n === 'number' && isFinite(n))) {
        warnings.push(buildGroundingWarn('W-2', 'T10', 'E/SL/TP', d, 're-emit numeric anchors'));
      }
      if (!(d.direction === 'LONG' ? d.E < d.SL && d.E < d.TP : d.E > d.SL && d.E > d.TP)) {
        warnings.push(buildGroundingWarn('W-3', 'T10', 'order', d, 're-order E/SL/TP'));
      }
      if (!ledger.continuationTargets.includes(d.chosenTarget)) {
        warnings.push(buildGroundingWarn('W-4', 'T8', 'chosenTarget', d.chosenTarget,
          'pick from the closed set — never extend it'));
      }
      if (!ledger.e1ZoneIds.includes(d.e1ZoneId)) {
        warnings.push(buildGroundingWarn('W-5', 'T10', 'e1ZoneId', d.e1ZoneId,
          'use a real zone id from the map'));
      }
      if (!ledger.e2ProjectionIds.includes(d.e2ProjectionId)) {
        warnings.push(buildGroundingWarn('W-6', 'T10', 'e2ProjectionId', d.e2ProjectionId,
          'use a real projection id from the chain'));
      }
      for (const w of warnings) recordFailure('GROUNDING_WARN', { ...w, pair: d.pair, week: args.weekStart });
    }

    // ── THE ASSEMBLE (the machine builds the full TradeProjections) ──
    const projections = args.decisions.map(d => assembleProjection(d, ledger));
    // the contract assert: assertProjectionContract(projections) — the E3-NEVER

    ctx.projections = projections;
    return {
      title: `STEP B complete — ${projections.length} projections (${warnings.length} WARNs)`,
      output: JSON.stringify({
        status: warnings.length === 0 ? 'success' : 'success_with_warnings',
        projections,                       // the checkable E/SL/TP + the anchors
        ledger,                            // the machine's deterministic core (shown)
        warnings,                          // the WARN rows (the D2 audit trail)
        nextStep: 'AGENT REASONING STEP B done — call plutus-pipeline-setups ' +
                  'with weekStart (the projections are in the context).',
      }),
    };
  },
});
```

**The refine loop (the agent's second turn — the D2 law's continuation):**

```
The machine's WARNs return ──► the agent READS the WARNs (the check + the
                              proposedCorrection) and REFINES the decisions
                              (attempts 1..3)
The refined decisions ──────► re-submitted via the tool args
The machine re-validates ───► clean → the assemble → the projections
                              still-warned after 3 → REFINEMENT_EXHAUSTED →
                              the hard-throw → the store → the synthesis
```

**The done-when (T-B):** the A1 test (a deliberately-bad projection → the WARN fires + the loop continues) · the A1b test (3 attempts → REFINEMENT_EXHAUSTED, never a crash) · the stream shows the agent's forward-position/anchor reasoning · the projections pass assertProjectionContract.
## 7.4 Module T-C (the gate tool + the context fields + the registry + the NEXT instructions)
**T-C — the gate tool + the context fields + the registry + the NEXT instructions:**

**The gate tool (plutus-pipeline-gate — the W6 verdicts, Phase 9's harness integration):**

```typescript
const plutusPipelineGate = tool({
  description: 'The W6 golden gate: the G1-G10 acceptance verdicts for the run.',
  args: { weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) },
  async execute(args) {
    const ctx = ensureContext(args.weekStart);
    const verdicts = runGoldenGate(ctx);      // the G1-G10 checks (Phase 9)
    resetContext();                           // the T1 lifecycle: the chain's end
    return {
      title: `Gate complete — ${verdicts.filter(v => v.pass).length}/10 passed`,
      output: JSON.stringify({ status: verdicts.every(v => v.pass) ? 'success' : 'FAILED',
                               verdicts }, null, 2),
    };
  },
});
```

**The context fields (the extension — the T1 pattern):**

```typescript
interface PipelineRunContext {
  weekStart: string; temporalAnchor: number; startedAt: number;
  harvestData: { ohlc: Record<string, OHLCBar[]>; ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>; spots: Record<string, number> } | null;
  zoneMapSnapshot: { zones: DXYZone[]; spots: Record<string, number>; version: number } | null;
  stepADesignation: StepADesignation[] | null;        // NEW — the STEP A output
  shapeSnapshot: ShapePredictionSnapshot | null;
  reasoningLedger: TokenLedger | null;                // NEW — the STEP B machine core
  projections: TradeProjection[] | null;              // NEW — the STEP B output
  screenshots: Array<{ pair: string; timeframe: string; path: string }>;
  validatedZones: any[]; errors: PipelineError[]; setupCounter: number;
  manualStepOutputs: Record<string, unknown>;
}
```

**The tool registry (the factory — the 7-tool chain):**

```typescript
export function createPipeline7Tools(): Record<string, ReturnType<typeof tool>> {
  return {
    'plutus-pipeline-harvest': harvestTool,
    'plutus-pipeline-zones': zonesTool,
    'plutus-pipeline-reason-step-a': reasonStepATool,   // NEW
    'plutus-pipeline-shapes': shapesTool,
    'plutus-pipeline-reason-step-b': reasonStepBTool,   // NEW
    'plutus-pipeline-setups': setupsTool,
    'plutus-pipeline-gate': gateTool,                   // NEW
  };
}
// the allowlist: the plutus- prefix already allowed — no change needed
```

**The NEXT-instruction chain (the tool outputs' tails — the T1 §3.4 pattern):**

```
harvest:  NEXT: call plutus-pipeline-zones
zones:    NEXT: AGENT REASONING STEP A — read the zone map and call
          plutus-pipeline-reason-step-a with your designation[]
step-a:   NEXT: call plutus-pipeline-shapes (the designation is in the context)
shapes:   NEXT: AGENT REASONING STEP B — read the shape chain and call
          plutus-pipeline-reason-step-b with your decisions[]
step-b:   NEXT: call plutus-pipeline-setups (the projections are in the context)
setups:   NEXT: call plutus-pipeline-gate
gate:     FINAL — the G1-G10 verdicts + resetContext()
```
## 7.5 The Phase-7 Invariants + Test Spec + Acceptance Gate
**The Phase-7 invariants (asserted at the gate):**

```
INV-1  the 7-tool registry: harvest → zones → step-a → shapes → step-b →
       setups → gate (the D5 order)
INV-2  the STEP A firewall: a fabricated zoneId → BLOCKED (never accepted)
INV-3  the STEP B validation: the WARN set fires, the loop continues (D2)
INV-4  the context: stepADesignation + reasoningLedger + projections carried
INV-5  the NEXT instructions present on every tool's output
INV-6  resetContext() at the gate (the T1 lifecycle)
```

**The Phase-7 test spec (written BEFORE the code):**

```
diag-step-tools.ts:
  P-1  the registry: all 7 tools registered (the tool list includes the 3 new)
  P-2  the A4 test: a fabricated zoneId in the designation → BLOCKED
  P-3  the A4b test: a generic rationale (<40c / no price) → BLOCKED
  P-4  the A1 test: a bad projection → the WARNs fire + the loop continues
  P-5  the assemble: the decisions → the full TradeProjections (the contract clean)
  P-6  the NEXT chain: every tool's output carries the NEXT instruction
  P-7  the context lifecycle: ensureContext/resetContext across the 7 calls
  P-8  the adversarial: the designation empty → BLOCKED (min 1 required)
  P-9  the adversarial: the projections empty → BLOCKED
```

**The Phase-7 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-step-tools.ts` exits 0 — ALL of P-1..P-9 green
5. the diff review of EVERY changed line
6. the wave audit at .trident/wave-audit/wave-w6-step-tools.md

# PHASE 8 — THE E3 PRECISION (the anchor doctrine made mechanical)

## 8.1 The Doctrine (the operator's anchor rules verbatim)
**The operator's anchor rules — VERBATIM (the E1_E2_E3_MACRO_CONTEXT Part 5):**

**The SL (the ladder-steps model):**
> "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone. In the case of the EU trade the next rung relevant zone was the supply zone. you need to look at the zones like ladder steps. It is either 3 pips outside the far edge of the current step we enter on, or 1-2 pips inside the close edge of the NEXT STEP away (opposite direction of the projected trade direction - if it is a short then this is the next step UP. if it is a long this is the next step DOWN) from the entry step. This is to ensure the SL has breathing room for volatility while still being tight enough to maximize RRR"

**The TP (the strength-driven edge):**
> "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction. Strong pressure zones = near instant reaction. exit on the closest zone edge and even potentially add a 1-2 pip spread so you dont miss the exit. Weak pressure zones = delayed reaction. Maximize the profits you catch from these while the candles are still inside of them."

**The RRR (the consequence):**
> "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table."
> "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR." (D3)

**The entry (the LQZ's near edge — the first contact):**
> "LQZ at 1.1444-1.14395 ~ using this as the entry zone anchor" — the E 1.14395 = the rung's near edge from above (the first contact for the SHORT).

**The zone-relevance switch (the trade #4's doctrine):**
> "let us only use the LQZ as an E anchor and set the SL based on the DEMAND zone instead of the LQZ to ensure we are safe from the potential wicks/volatility as all the bullish pressure from the demand zone is absorbed" — THE SL ANCHOR MOVED WITH THE PRESSURE STATE (the LQZ eaten → the DEMAND zone as the operative defense).

**The chaining (Law 27):**
> "TP OF ONE = ENTRY OF NEXT" — the operator uses this constantly (the EU trades: #2's E = #1's TP; #4's E = #3's TP; #5's E = #4's TP; #8's E = #7's TP).
## 8.2 The TP Substrate (the SLOP-01/D37 kill — the ZR-3.3/ZR-3.4)
**The TP substrate (the SLOP-01/D37 kill — the F2/F16 root fix):**

**TP-1 — the ratio-extension REMOVED (reasoning-chain.ts:789-790):**
The fallback that computes a TP to hit RRR 2.5 EXACTLY is deleted. No code path computes a TP from a target RRR. The TP comes ONLY from the zone geometry (the opposing rung's defendedEdge / the strength-driven edge).

```
BEFORE (the SLOP-01 — the D37 class):
  if (tp === null) tp = computeTpToHitRrr(entry, sl, 2.5);   // THE FORCED-2.5
AFTER (the D3 law):
  if (tp === null) → the projection is NOT emitted (the RRR is a consequence —
                     a null TP means no structural target exists — the trade
                     does not exist, never a fabricated one)
```

**TP-2 — the ZR-3.3 full-model resolution (the E2-projected opposing zone):**
The computeLmvTP shapeDay path resolves the OB-id-vs-LMV-candidates mismatch: when the E2 shape day's projected opposing zone EXISTS, the TP = that zone's LMV rung's defendedEdge — the FULL-MODEL resolution, NOT the nearest-first fallback. The fallback's nearest-first walk is the LAST resort, never the default.

**TP-3 — the ZR-3.4 E1-pressure wall classification (the cap-walk):**
The Law-14 cap-walk's "fresh wall" predicate uses the E1-pressure classification — the BoM/MoM + the 6D confluence + the Earth+Fire — NOT the candle-count zfp≤20 ladder (the D37 derailment's mechanism). A BoM wall with a high zfp STOPS the walk; an MoM rung passes through.

```
BEFORE (the D37):  the fresh-wall predicate = (zfp ≤ 20) — candle-count only
AFTER (ZR-3.4):    the fresh-wall predicate = isBoM(zone) ∧ confluence(zone) ≥ 6
                   ∧ earthFire(zone) — the E1 pressure, the candle count only
                   as a tiebreak
```

**TP-4 — the computeLmvTP sweep-bonus inversion (already Phase 4, M4 — the −30):**
The swept rung = the liquidity TAKEN → DEMOTED −30 (never promoted +50). The GU TP stops landing one rung too shallow.

**The done-when (the TP substrate):** the A2 test (a null computeMirrorTP → NO emission, never the 2.5 clamp) · the EU/GU RRRs show the structural variety (never all-2.50) · the EU LONG Δ0.8p held.
## 8.3 The Ladder-Steps SL + The Strength-Driven TP Edge
**The ladder-steps SL (the operator's rule made mechanical — the diagram):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE LADDER-STEPS SL (the zones are ladder steps)             │
└──────────────────────────────────────────────────────────────┘

  SHORT trade (the steps UP are the adverse side):

      step N+1 (the next rung UP)  ──► the CLOSE EDGE
        │   SL option B: 1-2 pips INSIDE the close edge
        │                 of the NEXT STEP away
      step N   (the entry step)    ──► the ENTRY (the LQZ near edge)
        │   SL option A: 3 pips OUTSIDE the far edge
        │                 of the current step
      step N-1 (the step DOWN)     ──► (the trade's direction)

  LONG trade (the steps DOWN are the adverse side):
      the mirror — the SL = 3p outside the far edge of the current
      step OR 1-2p inside the close edge of the NEXT STEP down

  THE RELEVANT ZONE: chosen by the pressure state (the lexicon-4
  lifecycle) — the trade #4's switch: the LQZ eaten → the DEMAND
  zone as the operative defense
```

**The SL decision function:**

```
computeLadderStepsSL(entryStep, tradeDirection, pressureState):
  // the relevant zone = the pressure-state function (the lexicon-4 output)
  relevantZone = the operative defense (the LQZ unless absorbed → the S/D zone)
  optionA = farEdge(entryStep) ± 3·pip        // the 3p outside the back edge
  optionB = closeEdge(nextStepAway) ∓ (1..2)·pip  // the 1-2p inside the next
  sl = pickTightest(optionA, optionB)         // the max RRR while the breathing room
  assert: slDistancePips ∈ [GOLDEN_SL_MIN_PIPS=4, GOLDEN_SL_MAX_PIPS=9.5] ∨
          the documented deep-shield exception (≤ 36, the D17 ceiling)
  return sl
```

**The strength-driven TP edge (the operator's rule made mechanical):**

```
computeStrengthDrivenTP(targetZone, pressureState):
  if isStrongZone(targetZone)    // BoM · confluence ≥ 8 · fortress (4+ strong)
    tp = closeEdge(targetZone) ∓ (1..2)·pip   // the near edge + the spread
  else                           // the weak zone (virgin MoM · low confluence)
    tp = farEdge(targetZone)                  // the far edge — the delayed reaction
  // the E1-pressure wall classification (ZR-3.4) decides the walk's stops
  return tp
```
## 8.4 The Entry Refinements (the convergence push — the 4 misses + the GU pick)
**The entry refinements (the convergence push — the 4 misses + the GU pick):**

| The emission | The current | The golden | The delta | The refinement (the same zone anchors — never a new zone) |
|---|---|---|---|---|
| EU SHORT | 1.14449-ish | 1.14395 | Δ11.7p | the entry LQZ [1.1444-1.14395]'s NEAR EDGE (the first contact from above) — the Monday-formed LQZ, not the Friday-formed zone |
| DXY LONG | 100.945-ish | 100.945 | Δ9.6p | the 1H LQZ's near edge at the operator's level (the modal rung after Phase 2) |
| DXY SHORT | 101.14-ish | 101.140 | Δ19.1p | the 1H LQZ supply's near edge + the F1-A SHORT-entry lift (the band top − 1 pip when in the lower half) |
| GU LONG | 1.33270-ish | 1.33330 | Δ6.0p | the demand pick at the operator's 1.33330 — the near-edge refinement (the demand 1.33270 → the modal rung 1.33330) |

**The refinement mechanics (the 3-attempt machine — the operator's design, verbatim):**
> "3 attempts on each anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked individually per trade - so a dedicated dynamic state machine that can track each trade + each anchor of each trade and correctly lock what has exceeded the 3-turn limit while allowing attempts on the others until either RRR passes or all 3 anchros hit turn limit. each rejection needs to also give context on WHY it was rejected and HOW to properly improve it."

```
REFINE-1  the entry micro-refinement on the defendedEdge (the LQZ near edge)
REFINE-2  the SL via the ladder-steps rule (the pressure-state relevance)
REFINE-3  the TP via the strength-driven edge (the E1-pressure wall)
Each attempt: the context WHY + the HOW (the RefinementWarning shape)
Each anchor locked individually at its 3-turn limit
The 🔧 REPAIRED(2) annotations on the refined setups (the audit trail)
```

**The chaining (preserved — never broken by the refinements):** the TP of N = the entry of N+1 (Law 27) across the lanes — the EU #2's E = the EU #1's TP (1.14110); the GU Tue SHORT's E = the GU Mon LONG's TP (1.33965); the DXY #5's E = the DXY #4's TP (100.975).
## 8.5 The Phase-8 Invariants + Test Spec + Acceptance Gate
**The Phase-8 invariants (asserted at the gate):**

```
INV-1  NO ratio-extension / RRR-target computation in any TP path (the grep gate)
INV-2  the EU/GU RRRs show the structural variety — NOT all 2.50 (the D3 proof)
INV-3  the SL ∈ [4, 9.5] pips ∨ the documented deep-shield exception (≤ 36)
INV-4  the chaining preserved: the TP of N = the entry of N+1 (the golden chains)
INV-5  the entry NEVER moves to a new zone in the refinement (the 3-attempt rule)
INV-6  the 🔧 REPAIRED annotations on every refined setup (the audit trail)
```

**The Phase-8 test spec (written BEFORE the code):**

```
diag-e3-precision.ts:
  E-1  the A2 test: a null computeMirrorTP → NO emission (never the 2.5 clamp)
  E-2  the RRR variety: the EU/GU RRRs NOT all 2.50 (the structural targets:
       EU 3.18/2.92/4.4 · GU 8.94 — approaching, on the same zone anchors)
  E-3  the ladder-steps SL: the EU #2's SL at the demand's close edge region
       (the golden 1.13990 — 3p outside the far edge of the nested LQZ)
  E-4  the strength-driven TP: the EU #3's TP at the LQZ's FAR edge (the BS —
       expected to pierce or deep mitigate) vs the EU #1's TP at the demand
       nested LQZ's NEAR edge (the strong zone — the close edge)
  E-5  the entry refinements: the GU Monday's demand pick at 1.33330 (Δ ≤ 3p)
  E-6  the convergence: the golden hits ≥ 2/5 (from 1/5) at ≤3p
  E-7  the chaining: the EU #2's E == the EU #1's TP (1.14110)
  E-8  the adversarial: a sub-4p SL candidate → the floor walk (Phase 4 M1)
  E-9  the adversarial: an entry moved to a NEW zone in the refinement →
       the REPAIRED annotation absent → the violation
```

**The Phase-8 acceptance gate (mechanical — all must pass):**
1. `bunx tsc --noEmit` = 0
2. `bun build` = success
3. the frozen pair sha256 byte-identical
4. `bun diag-e3-precision.ts` exits 0 — ALL of E-1..E-9 green
5. the grep gate: the ratio/RRR-target computations absent from the TP paths
6. the diff review of EVERY changed line
7. the wave audit at .trident/wave-audit/wave-w7-e3-precision.md

# PHASE 9 — THE W6 GOLDEN GATE (G1-G10 — the mechanical acceptance)

## 9.1 The Doctrine (the golden = the measurement oracle only)
**The doctrine (the golden = the measurement oracle ONLY):**
> "make sure this is clearlly commented and labelled in the codebase as TEMPORARY ARCHITECTURE i can understand why this is there to just make the testing loop easy but this should NOT BE CORE INFRA once everything is solid this should be removed complately. The agent/codebase must be able to self validate based on RULES and LOGIC not a hardcoded data set." (the operator — the golden const's label)
> "the only trades valid for Monday are the golden trades" (D4)

**The golden const's placement (the diagram):**

```
┌──────────────────────────────────────────────────────────────┐
│  THE GOLDEN CONST PLACEMENT (the measurement oracle only)     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  diag-reasoning-chain-golden.ts (the W6 harness)             │
│    └─ const golden = { DXY: [...], EU: [...], GU: [...] }    │
│       └─ the MEASUREMENT ORACLE — the diag compares the      │
│          emissions against it, computes the deltas, emits    │
│          the G1-G10 verdicts                                 │
│                                                              │
│  THE PIPELINE (harvest → zones → STEP A → shapes → STEP B →  │
│  setups)                                                     │
│    └─ NEVER reads the golden const — the pipeline has NO     │
│       access to it (the grep gate: golden referenced only    │
│       in the diag)                                           │
│                                                              │
│  THE SELF-VALIDATION (the operator's target): the rules +    │
│  logic — the pressure mechanics + the storyline + the RRR    │
│  geometry — replace the hardcoded dataset once solid         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**The G1-G10 harness (the per-gate checks + the verdicts + the exit protocol):**

```typescript
interface GateVerdict {
  gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10';
  pass: boolean;
  detail: string;          // the measured value vs the target
  evidence: string;        // the ledger/store/report anchor
}

runGoldenGate(ctx): GateVerdict[] {
  const projections = ctx.projections;
  return [
    { gate: 'G1', pass: hasPhantomBomLong(projections, 'EUR/USD') &&
                       entryWithin(projections, 'EUR/USD', 'LONG', 1.14110, 2),
      detail: 'the EU LONG phantom-BoM emission', evidence: ledgerToken1('EUR/USD') },
    { gate: 'G2', pass: hasNativeLane(projections, 'EUR/USD', 'LONG'),
      detail: 'the native-first cascade-complementary', evidence: laneLabels() },
    { gate: 'G3', pass: directionIs(projections, 'GBP/USD', 'Mon', 'LONG') &&
                       macroDivergenceRecorded('GBP/USD', 'Mon'),
      detail: 'the GU Monday LONG + the divergence', evidence: storeQuery('MACRO_DIVERGENCE') },
    { gate: 'G4', pass: linkedMirrorResolves(projections, 'EUR/USD', 'LONG'),
      detail: 'the EU/DXY 1:1 inverted mirror', evidence: linkedMirrorPairs() },
    { gate: 'G5', pass: assertProjectionContract(projections).passRate === 1.0,
      detail: 'the E3-NEVER 100% compliance', evidence: contractAudit() },
    { gate: 'G6', pass: storeWeekCount('REFINEMENT_EXHAUSTED', week) === 0,
      detail: 'the hard-throw discipline', evidence: storeQuery() },
    { gate: 'G7', pass: uniqueTradesEmit(13) && !fixedWidthSlRegression(),
      detail: 'the no-regression of the 13 unique trades', evidence: dedupReport() },
    { gate: 'G8', pass: negativeControlHolds(),
      detail: 'the temporal gate', evidence: negativeControlRun() },
    { gate: 'G9', pass: wallTimeMs <= 5 * 60 * 1000,
      detail: 'the performance gate', evidence: `time bun diag...` },
    { gate: 'G10', pass: parallelHash === sequentialHash,
      detail: 'the parallel-equivalence', evidence: ledgerHashes() },
  ];
}
```

**The exit protocol (every gate run):** `bunx tsc --noEmit` = 0 → `bun build` = success → the frozen pair sha256 → the report determinism ×2 → `bun diag-reasoning-chain-golden.ts --day=2026-07-06` exit 0 with the per-gate verdicts → the wall time ≤ 5 min → the wave audit.
## 9.2 The G1-G10 Harness (the per-gate checks + the verdicts + the exit protocol)
**The Phase-9 test spec (the adversarial scenarios A1-A7 — the runtime-grade law: happy paths are forbidden):**

| # | The scenario | The pass token | The fail token |
|---|---|---|---|
| A1 | a deliberately bad projection (entry/sl/tp as strings, an invented zone id) sent to STEP B | the GROUNDING_WARN fires + the loop continues + after 3 → the store row | a first-violation hard-kill / a crash |
| A2 | the ratio-extension removal: the EU/GU lanes with a null computeMirrorTP | the projections NOT emitted (never the 2.5 clamp) — the RRRs NOT all 2.50 | any TP computed to hit 2.5 exactly |
| A3 | the temporal gate (the G8 negative control): an anchor later than ANCHOR_MS | the anchors unchanged | any bar beyond ANCHOR_MS read |
| A4 | a fabricated STEP A designation (a zone id not in the map) | the firewall BLOCKED | the designation accepted |
| A5 | the parallel-equivalence (G10): the parallel run vs the sequential | the projections byte-identical | any drift |
| A6 | the phantom-BoM 3-of-4: a zone with 3 predicates, not 4 | the DEATH rule stands (rejected) | the exemption fires on 3-of-4 |
| A7 | the 30-min-hang regression: the wall-time measurement | the Monday diag completes ≤ 5 min | the stall detector kills a working generation |

**The host-based test loop (the operator's directive D10 — no container):**
1. The operator deploys the FULL plutus agent as a subagent on host (the task tool — D6).
2. The deployed agent runs the diag harnesses DIRECTLY on the host: `bun diag-reasoning-chain-golden.ts --day=2026-07-06` · `bun report-v452.ts` · `bun diag-telescoping.ts` · `bun diag-lmv-golden.ts` · `bun diag-obcv-golden.ts` · `bun diag-lexicons.ts` · `bun diag-grounding-warn.ts` · `bun diag-step-tools.ts` · `bun diag-e3-precision.ts` — the fixture at /tmp/opencode/bars_raw.json.
3. The agent's STEP A/B reasoning observed IN THE STREAM (the TUI session) — the operator sees every designation + every projection's reasoning (D1: "so we can see everything").
4. The per-phase gates run on the host with the zero-trust battery (Part 4).

**The container rule:** the container tests are SKIPPED per the operator's directive (D10 — "not waste time on container garbage") — the host deployment IS the runtime test. Any residual container-specific evidence (the browser/VLM paths) is explicitly out of scope for this overhaul's gate.
## 9.3 The Phase-9 Test Spec (the adversarial scenarios A1-A7)
**The Phase-9 test spec (the diag assertions — the adversarial scenarios A1-A7 in full):**

```
diag-reasoning-chain-golden.ts --day=2026-07-06:

  THE GATES (the G1-G10 verdicts — each a pass/fail with the measured detail):
    G1  the EU LONG phantom-BoM: ≥1 EUR/USD LONG with token-1 PHANTOM_BOM on
        [1.14145-1.14000]; the entry within 2 pips of 1.14110; the anchors trace
    G2  the native-first cascade-complementary: the EU LONG in the NATIVE lane
    G3  the GU Monday direction === 'LONG' + the MACRO_DIVERGENCE recorded
    G4  the EU/DXY 1:1 inverted mirror: the linkedMirror resolves
    G5  the E3-NEVER: assertProjectionContract 100% (0 anchor-less)
    G6  the hard-throw discipline: 0 REFINEMENT_EXHAUSTED on the golden week
    G7  the no-regression: the 13 unique trades still emit
    G8  the temporal gate: the negative control (a later anchor) unchanged
    G9  the performance: the wall time ≤ 5 min
    G10 the parallel-equivalence: the projections byte-identical

  THE ADVERSARIAL SCENARIOS (the runtime-grade law — happy paths forbidden):
    A1  a deliberately bad projection → GROUNDING_WARN + the loop continues
        (the fail token: a first-violation hard-kill)
    A2  a null computeMirrorTP → NO emission (the fail token: any 2.5 clamp)
    A3  the temporal negative control → the anchors unchanged
        (the fail token: any bar beyond ANCHOR_MS read)
    A4  a fabricated designation → BLOCKED (the fail token: accepted)
    A5  the G10 equivalence (the fail token: any drift)
    A6  the phantom-BoM 3-of-4 → DEATH (the fail token: the exemption fires)
    A7  the wall-time regression (the fail token: the stall detector kills
        a working generation)

  THE EXIT PROTOCOL:
    bunx tsc --noEmit = 0 → bun build = success → the frozen pair sha256
    byte-identical → the report determinism ×2 → the diag exit 0 with the
    per-gate verdicts → the wall time ≤ 5 min → the wave audit at
    .trident/wave-audit/wave-w8-golden-gate.md

  THE HOST LOOP (D10 — no container):
    the operator deploys the plutus agent as a subagent on host (the task
    tool — D6); the agent runs the FULL pipeline: harvest → zones → STEP A
    (the visible designation) → shapes → STEP B (the visible 11-token
    reasoning) → setups → gate; the orchestrator observes the stream and
    collects the verdicts; the convergence table is the operator's read.
```

# PART 3 — THE ANTI-PATTERNS (the do-nots — the operator's laws code-enforced)

The theatrical traps specific to THIS overhaul — each with the failure mode + the block. The register is read before every wave dispatch (the immutable constraint 6).

| # | The trap | The failure mode | The block |
|---|---|---|---|
| AP-1 | The shadow reintroduction | an agent rebuilds an external-model executor "for convenience" — the D1/D7 violation | the code review blocks ANY new external fetch in the reasoning path; the grep gate: `fetch\|axios\|http` = 0 in reasoning-chain.ts + shadow-agent.ts |
| AP-2 | The RRR-as-target sneaks back | a ratio-extension or a TP clamp to hit a floor — the D3 violation | the grep gate on `ratio`/`RRR` computations in the TP paths + the RRR-variety check in the gate (E-2) |
| AP-3 | The grounding hard-kill returns | a validation that throws on the FIRST violation — the D2 violation | the WARN semantics test (A1/S-1) runs every wave |
| AP-4 | The wall-clock timeout returns | any 600s-style cap on the agent's reasoning — the C4 violation | the stall-detector pattern only (the SSE idle window 90s — as the reference); no wall clock in the reasoning path |
| AP-5 | The sequential LLM calls return | the 24-calls × sequential topology — the C1/C3 violation | the parallel tokens (8/10 Promise.all) + the micro-parallel pair runs stay; the G10 equivalence gate |
| AP-6 | The container theater | claiming "container tested" with no host evidence — the D10 directive | the host-based evidence ONLY; the container claims are the theatrical declaration |
| AP-7 | The golden-fitted claims | the diag thresholds or the fixtures tuned to pass — the TEMPORARY-ARCHITECTURE violation | the golden const stays the measurement oracle ONLY; the pipeline never reads it (the grep gate); the golden is a VALIDATION set, never a training input |
| AP-8 | The napkin docs | the wave reports as bullet summaries without the WHAT/WHY/HOW verdicts | the wave audit format enforced (the per-hunk verdicts + the coverage map) |
| AP-9 | The scope creep | a builder "fixes" a frozen file or refactors an unrelated module | the frozen pair + the disjoint-file discipline; the diff review blocks anything outside the wave's file set |
| AP-10 | The false "no regression" | declaring no regression on a degenerate baseline (the SLOP-10 class) | the measure is the golden convergence + the RRR authenticity, never the raw emission count |
| AP-11 | The wave-dispatcher spawn | dispatching via anything but the task tool (D6) | the task tool ONLY; verify the sessionId before waiting |
| AP-12 | The agent's claim trusted | a build agent's "it works" without the mechanical battery | the zero-trust battery runs on EVERY return (the orchestrator's own runs, never the agent's) |
| AP-13 | The 18-derailment repeats | the ZFP 45→60 · the pair-name slash removal · the RRR flatten · the TP multi-target · the cascade hard-filter · the ZFP evolution · the shape-chain rewrite (Bible 4.0 §11.1) + the 10 post-wipe derailments (the RRR 1.0 · the 150-pip onSide · the VIOLATED group −3 · the nearest-to-spot ranking · the 30-pip delusion · the §8.1 unconditional union · the stop-after-every-change) | the anti-pattern register is the pre-dispatch read; the wave audits check for the repeats |
| AP-14 | The phantom-BoM 3-of-4 exemption | the exemption fires on 3 predicates — the fortress misclassification | the all-4 predicate is hard (A6/X-2); the 3-of-4 → DEATH |
| AP-15 | The chaining break | the refinements move the entry off the chained TP — the Law-27 violation | the chaining invariant (E-7) checks the golden chains every wave |

# PART 4 — THE VERIFICATION BATTERY (after EVERY change — the orchestrator's own runs)

After EVERY change — the orchestrator's own runs (never the agent's reported exit codes). The battery:

```
┌──────────────────────────────────────────────────────────────┐
│  THE ZERO-TRUST BATTERY (after EVERY change, EVERY wave)      │
├──────────────────────────────────────────────────────────────┤
│  1  bunx tsc --noEmit           → 0 errors                    │
│  2  bun build                   → success                     │
│  3  sha256sum the frozen pair   → sl-lmv 912940832fac44bc     │
│                                    trade-dedup 33914c897e7775 │
│  4  the wave's diag             → exit 0, the per-test green  │
│  5  the report determinism      → sha256 report_v452.md ×2    │
│                                    identical                  │
│  6  the golden-convergence      → the per-emission delta      │
│                                    table (never a bare claim) │
│  7  the wall time               → G9: ≤ 5 min for the Monday  │
│                                    diag                       │
│  8  the grep gates              → no fetch in the reasoning   │
│                                    path · no ratio/RRR-target │
│                                    in the TP paths · the      │
│                                    golden const referenced    │
│                                    only in the diag           │
│  9  the diff review             → EVERY changed line with the │
│                                    WHAT/WHY/HOW verdict       │
│  10 the wave audit              → .trident/wave-audit/<wave>  │
│                                    with the coverage map      │
└──────────────────────────────────────────────────────────────┘
```

**The evidence classes (what counts as proof):** sha256sum outputs · the diag verdicts (the pass/fail per test) · the store queries' rows · the TUI stream captures (the STEP A/B reasoning visible) · the container NOT required (the host deployment is the runtime).

**The prose-is-not-evidence rule (the immutable constraint 8):** a wave report that says "it works" without the battery's outputs is REJECTED — the orchestrator re-runs the battery, and the wave does not ship until the outputs are green.

# PART 5 — THE ACCEPTANCE CRITERIA (the operator's target — mechanical, numbered)

The operator's acceptance bar — mechanical and numbered. The overhaul is DONE when EVERY line holds:

1. **The agent-in-the-loop runs (D1/D7/D8):** a host deployment of the plutus agent shows the STEP A designation + the STEP B reasoning (the tokens 8/10/11) IN THE STREAM — visible, in-session, no external model call anywhere (the grep gate: no fetch in the reasoning path).
2. **The grounding WARN behaves (D2):** a deliberately bad projection (A1) → GROUNDING_WARN + the loop continues; the hard-throw ONLY after 3; the store's week rows record the WARNs.
3. **The EU/GU TP substrate is structural (D3):** the EU/GU RRRs show the VARIETY (never all-2.50); the ratio-extension absent (the grep gate); the targets approach the operator's real RRRs (EU 3.18/2.92/4.4 · GU 8.94).
4. **The golden convergence rises (D4):** ≥ 2/5 after Phase 8, progressing toward 5/5 at ≤3p; every emission carries the delta table; the EU LONG Δ0.8p HIT never regresses.
5. **The E1 substrate is correct:** the 7 golden DXY LQZs ≤1 pip (the LMV oracle) · the golden OB reconstruction + 96% (the OBCV oracle) · the telescoped map with the 30m MoM-only + the 15m lane · the 3 lost mirror.ts fixes re-ported.
6. **The lexicons are wired:** all six consume/produce at their enforcement points; the phantom-BoM all-4 predicate tested on the golden fixture (the EU LONG's demand [1.14145-1.14000] → PHANTOM_BOM, EXEMPT; a 3-of-4 → DEATH).
7. **The W6 golden gate passes:** G1-G10 with the per-gate verdicts; G9 wall ≤ 5 min; G10 byte-identical; the frozen pair byte-identical; tsc 0; the report determinism ×2.
8. **The canon docs updated:** the build report ENTRY 6 · the DEBUG_LOG (the append-only record of every bug found + fixed) · the DECISION_CHAIN D62 (the shadow retirement + the agent-in-the-loop ruling) · the NEXT_STEPS · the EVIDENCE_STATE · the COMPACTION_SURVIVAL.
9. **The 8 immutable operating constraints hold:** the precision-only metric · never lower standards · fix the map not the ranking · E2 designates E3 obeys · the telescoping law · no repeat of the 18 derailments + the 15 anti-patterns · DXY direction pair levels · don't stop, don't fake, verify mechanically.

# PART 6 — THE FUNCTION-LEVEL SPEC (per file, per function — the exact before/after)

## 6.1 src/mdve/shadow-agent.ts (the executor retired → the contract shape)
The per-file, per-function before/after — the exact edit targets for the build agents. Every anchor is the W0-verified line (the F6/F12 resolution first).

### 6.1 src/mdve/shadow-agent.ts (the executor retired → the contract shape — Phase 6)

| The function | The before | The after |
|---|---|---|
| callModel (the fetch path, :155-240) | `fetch(SHADOW_BASE_URL)` + the SSE stream + the 90s idle abort + the max_tokens 128000 | DELETED as the executor — the SSE idle-window pattern archived as the reference; NO network call remains |
| projectForward / chaining / anchor / validate | the shadow-side tools calling callModel | their INTERFACES become the agent-facing contract shape (the ReasoningStepInput — the ledger + the candidates) |
| the grounding checks (:447/:535) | `throw new ShapeViolation(...)` — the hard-kill | MOVED to the machine's validation (reasoning-chain.ts) as the GROUNDING_WARN rows (the D2 law) |
| resolveShadowApiKey (:278) | the env→.env→embedded chain | retired with the executor (F15 dies) — no key resolution in the reasoning path |
| SHADOW_MODEL (:86) | the frozen deepseek-v4-flash pin | archived as the reference — never invoked |

### 6.2 src/mdve/reasoning-chain.ts (the WARN + the TP substrate + the STEP B interface — Phases 6+8)

| The function | The before | The after |
|---|---|---|
| runRefineRetry (the token-11 loop) | the shadow-based refine (llm 0 — never refined) | the WARN-based refine: the GROUNDING_WARN rows feed the agent's next turn; the hard-throw ONLY after 3 (REFINEMENT_EXHAUSTED) |
| the ratio-extension (:789-790) | `computeTpToHitRrr(entry, sl, 2.5)` on a null TP | DELETED — a null TP = no emission (the D3 law); the TP via the ZR-3.3 full-model resolution + the ZR-3.4 E1-pressure wall |
| buildReasoningChain (the lane loop :1325-1360) | the tokens 8/10 via the shadow hooks (dead) | the tokens 8/10/11 via the agent-facing contract — the ledger presented, the decisions assembled, the WARN validated |
| the token 8/10/11 hooks | `shadow.projectForward(ctx)` etc. | `presentReasoningStep(ledger, candidates)` → the tool result; the agent's decisions → `assembleProjection(decisions, ledger)` → the validation |

### 6.3 src/brains/shape-brain.ts (the phantom-BoM exemption + the 30m MoM delivery — Phases 1+5)

| The function | The before | The after |
|---|---|---|
| the virgin-MoM death rule (the W0-verified line — F6 resolved) | the blanket REJECT — no exemption lane | the exemption lane: `if MoM ∧ reactionCount===0 ∧ findFortressDemand(...).id===zone.id → PHANTOM_BOM/EXEMPT` (the all-4 predicate via the lexicon-3) |
| the E2 delivery (:608) | the 30m MoM zones never delivered to E2 | the 30m MoM zones delivered as the SS/R reaction points (the T4 wiring) |

### 6.4 src/mdve/mirror.ts (the 3 lost fixes + the sweep inversion + the relevance — Phases 4+8)

| The function | The before | The after |
|---|---|---|
| computeMirrorTP (:501-601) | the weak-wall pass-through :535 · the cap-walk :570-581 · the Earth+Fire midpoint :584-586 | UNCHANGED as the computeMirrorTP-primary structure — the NULL path's fallback (the F16 root) handled at the CALLER (the ratio-extension removed) |
| computeLmvTP (:1533-1591) | the significance `(sweepCount≥1 ? +50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)` | the significance with the −30 inversion (M4) + the ZR-3.3 shapeDay path + the ZR-3.4 wall classification |
| computeSL_LMV (the caller) | the 2-stage golden SL (no floor) | the 4-stage computeGoldenSL_V452 (the GOLDEN_FLOOR + the PROBE_GUARD + the util guard) — M1 |
| selectPairNativeZone (:1233-1373) | the E2 shapeDay advisory (+2 tier bonus) | the E2 AUTHORITATIVE (the exact keyZoneId → return immediately) + the matrix rungs visible (the L3 bridge) |
| the GU distribution (:2090-2117) | `usedGuAnchors.add()` only for ACTIVE mirrors — the deadlock | `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror — ≥8 distinct anchors (M3) |

### 6.5 src/pipeline/engine.ts (the tool registry + the context + the firewalls — Phase 7)

| The function | The before | The after |
|---|---|---|
| createPipeline4Tools | the 5 legacy tools | createPipeline7Tools — the 3 new tools (step-a · step-b · gate) |
| PipelineRunContext | no stepADesignation/projections | + stepADesignation + reasoningLedger + projections |
| the zones tool (:479-481) | the 4H-only lane | the T2/T5 wiring (the telescoped construction) |
| the LQZ calls (:472-480) | 1H-only detectLiquidityZones | + the 30m/15m runs (T5) |
| the snapshot merge (:517-524) | the two-parallel-universes | the T6 merge (the telescoped union) |

### 6.6 src/mdve/lmv.ts + lqz-matrix.ts (the resolution modules — Phase 2)

| The function | The before | The after |
|---|---|---|
| the rung emission (lmv.ts) | the prominence-weighted mean | the modal-cluster emission (L1) |
| the ladder dedup (ladder-scaffold.ts:446) | `< 3·pip` strict | `< 1·pip` strict (L2 — the 0.5-pip pair survives) |
| matrixLadderRungs (lqz-matrix.ts:599-626) | the rungs in the matrix only | the rungs exposed in model.zones (L3 — the bridge) |
| buildLmvTable | the 1H-only tiers | + the 30m/15m telescoped tiers (L4) |

### 6.7 src/mdve/obcv.ts (the new machine — the 4 sub-engines — Phase 3)

| The function | The spec |
|---|---|
| computeDisplacementField (O1) | the impulse detection: `body ≥ 1.5×μ_body(prev 4)` ∧ `|close−open| ≥ 1.5×ATR14(i)` ∧ `D_t(i,k) ≥ θ_t` ∧ structureBroken — the ATR NEVER includes the impulse bar |
| buildOriginMatrix (O2) | F[o] = [bw, bf, rng, dir, prior]; the zone = [o.low, o.high] |
| classifyPriorMove (O3) | NONE/OPPOSITE/SAME via the signed ATR-normalized displacement sums; classifyOrigin → BoM/MoM/REJECT (the piecewise-total) |
| buildIncidenceMatrix (O4) | T[parent][child]; the 30m orphan → REJECT |
| the O5 firewall | the partition · the nesting · the widthGate invariants |
## 6.2 src/mdve/reasoning-chain.ts (the WARN + the TP substrate + the STEP B interface)
**The deep dive — src/mdve/reasoning-chain.ts (the STEP B core — the WARN + the TP + the assemble):**

```
THE LANE LOOP (buildReasoningChain — the C1 parallel structure, :1325-1360):

  per pair × per lane:
    T1..T7   runTokens1to7(ctx)                    // the machine, ms
    T9       chainedEntry = token9(priorTp)         // sync — Law 27
    ── the agent-facing turn ──
    stepInput  = presentReasoningStep(ledger, candidates)   // the tool result
    decisions  = the AGENT's args (the tool's contracted input)
    ── the machine's turn ──
    warnings   = validateDecisions(decisions, ledger)       // the WARN set
    for (w of warnings) recordFailure('GROUNDING_WARN', w)  // the store
    if (warnings.length && attempts < 3) → the refine loop (the agent re-turns)
    if (warnings.length && attempts >= 3) → recordFailure('REFINEMENT_EXHAUSTED')
                                            → the hard-throw (data, not a crash)
    projections = assembleProjection(decisions, ledger)     // the full contract
    assertProjectionContract(projections)                   // the E3-NEVER
    priorTp = projections[0].TP                             // the lane chain

THE TP SUBSTRATE (the F2/F16 kill — :789-790):

  BEFORE:  if (tp === null) tp = computeTpToHitRrr(entry, sl, 2.5)
  AFTER:   if (tp === null) → the projection NOT emitted
           tp = resolveProjectedOpposingZone(shapeDay, lmvTable)  // the ZR-3.3
                → the defendedEdge of the E2-projected opposing zone
                → the ZR-3.4 wall classification in the cap-walk:
                   freshWall = isBoM(zone) ∧ confluence ≥ 6 ∧ earthFire(zone)

THE REFINE LOOP (the D2 state machine):

  attempts 0..2:  the WARNs (check + tokenId + sourceRef + value + proposed)
                  → appended to the tool result → the agent's next turn
  attempts 3:     REFINEMENT_EXHAUSTED → the store → the synthesis
```
## 6.3 src/brains/shape-brain.ts (the phantom-BoM exemption + the 30m MoM delivery)
**The deep dive — src/brains/shape-brain.ts (the phantom-BoM exemption + the 30m MoM delivery):**

```
THE VIRGIN-MoM DEATH RULE (the W0-verified line — F6 resolved; the edit target):

  BEFORE (the blanket — the F1 root of the EU LONG miss):
    if (zone.classification === 'MoM' && zone.reactionCount === 0)
      → REJECT  // the virgin MoM = the DEATH ZONE — no exemption lane

  AFTER (the exemption lane — the all-4 predicate via the lexicon-3):
    if (zone.classification === 'MoM' && zone.reactionCount === 0) {
      const phantom = isPhantomBoMFortress(zone, ctx);   // the ALL-4 predicate
      if (phantom) → PHANTOM_BOM / EXEMPT    // the operator's #2 demand
      else         → REJECT                  // the death rule stands
    }

  isPhantomBoMFortress(zone, ctx) — the 4 conjuncts (the operator's criteria):
    (1) largeObWidth(zone)                    // the SMC ratio-based width
    (2) midSwingFakeout(zone, bars)           // the temporary structure-break
    (3) preFormationOpposingBoMReaction(zone) // the reaction precedes the OB
    (4) macroOriginContinuation(zone, macro)  // the KCE-Telescoping full swing
    return (1) && (2) && (3) && (4)           // 3-of-4 → false (the DEATH holds)

THE 30m MoM DELIVERY (the T4 wiring — :608):

  BEFORE:  the E2 never sees the 30m MoM zones (the SS/R reaction points absent)
  AFTER:   the 30m MoM zones delivered to the E2's day decomposition as the
           reaction points for the SS/R shapes (the telescoping law: "30m is
           valid for MoM S/D zones to identifiy E2 reaction points for SS/R
           shapes")
```
## 6.4 src/mdve/mirror.ts (the 3 lost fixes + the sweep inversion + the relevance)
**The deep dive — src/mdve/mirror.ts (the 3 lost fixes + the sweep inversion + the relevance):**

```
THE GOLDEN SL PIPELINE (M1 — computeGoldenSL_V452, the 4 stages):

  stage1  sl = computeSL_LMV(entry, lmvTable)          // the next rung's
                                                       // reactionExtreme + the
                                                       // Law-7 buffer
  stage2  probe = weekProbeAtAnchor(entry, bars, weekStartMs)   // M2
          if (!clearsAnatomy(sl, probe))
            sl = dir === 'SHORT' ? probe.price + buffer
                                 : probe.price − buffer
  stage3  if (slDistancePips(sl, entry) < GOLDEN_SL_MIN_PIPS)   // the 4p floor
            sl = walkToNextDefendedRung(entry, [4p, 9.5p + buffer])
                 // the sub-floor SL walks to the next defended rung
  stage4  util = probe.probeDepthPips / structDistPips
          if (util >= 0.40) → KEEP (the UTIL_GUARD_KEEP flag)
          else              → the PROBE_GUARD flag

THE SWEEP-BONUS INVERSION (M4 — computeLmvTP's significance):

  BEFORE:  sig = (sweepCount ≥ 1 ? +50 : 0) + (zfp ≥ 40 ? 40 : zfp ≤ 20 ? 25 : 15)
  AFTER:   sig = (sweepCount ≥ 1 ? −30 : 0) + (zfp ≥ 40 ? 40 : zfp ≤ 20 ? 25 : 15)
  // a swept rung = liquidity TAKEN → demoted — the GU TP stops landing
  // one rung too shallow (the RRR 1.30 → the floor)

THE CLASS-FLEXIBLE FALLBACK (M3 — the §8.1 union + the GU distribution):

  BEFORE:  the OB-class pool only — the GU's 25/26 VIOLATED supply collapses
           the pool to ONE anchor → the GU lane dead
  AFTER:   the LMV rungs join the OB-class candidacy at group −1.5 with the
           recency gate (lastReaction ∈ [weekStartMs, anchorMs])
           + usedGuAnchors.add(g.anchorZoneId) for EVERY constructed mirror
           → the GU ≥ 8 distinct anchors (the distribution is a property of
           the SIGNALS, never of the OUTCOMES)

THE RELEVANCE SWITCH (Phase 8 — the E3 SL's operative defense):

  BEFORE:  the SL = the next rung's reactionExtreme + the buffer (static)
  AFTER:   the relevant zone = the zone-pressure lexicon's lifecycle output
           (the LQZ unless absorbed → the S/D zone — the trade #4's switch:
           "set the SL based on the DEMAND zone instead of the LQZ")
```
## 6.5 src/pipeline/engine.ts (the tool registry + the context + the firewalls)
**The deep dive — src/pipeline/engine.ts (the registry + the context + the firewalls):**

```
THE TOOL REGISTRY (the factory — the D5 7-tool order):

  BEFORE:  createPipeline4Tools() → harvest · zones · shapes · charts · setups
  AFTER:   createPipeline7Tools() → harvest · zones · reason-step-a · shapes
                                    · reason-step-b · setups · gate
  // the charts tool REMAINS registered (the VLM verification path — the
  // operator's "data 80%, vision 20%" Law 37) but is NOT in the mandatory
  // D5 chain order; the reason-steps are the NEW contracted steps

THE CONTEXT (the T1 module-level state):

  BEFORE:  weekStart · temporalAnchor · harvestData · zoneMapSnapshot ·
           shapeSnapshot · screenshots · validatedZones · errors · setupCounter
  AFTER:   + stepADesignation: StepADesignation[] | null
           + reasoningLedger: TokenLedger | null
           + projections: TradeProjection[] | null
  lifecycle: ensureContext(weekStart) · resetContext() at the gate (T1 §3.1)

THE ZONES TOOL (the T2/T5/T6 wiring):

  BEFORE:  const bars = ctx.harvestData.ohlc[pair];          // 4H only (:223)
           detectLiquidityZones(pair, bars);                 // 1H-calibrated on 4H
  AFTER:   detectLiquidityZones(pair, bars1H) + (pair, bars30m) + (pair, bars15m)
           // the T5 runs; the T2 nesting pass; the T6 snapshot merge — the
           // telescoped union into zonesByPair/snapshot (:517-524)

THE FIREWALLS (the T1 three layers — the new tools):

  layer1  fs.access(evidenceFile)            // the file must exist
  layer2  zoneIds.has(designation.zoneId)    // the semantic membership
          assertProjectionContract(projections)  // the contract asserts
  layer3  /\d+\.\d{3,}/.test(rationale)      // the price references
```
## 6.6 src/mdve/lmv.ts + lqz-matrix.ts (the resolution modules)
**The deep dive — src/mdve/lmv.ts + lqz-matrix.ts (the resolution modules L1-L4):**

```
THE MODAL-CLUSTER EMISSION (L1 — the M-1/M-2 kill):

  BEFORE:  rung = Σ(price_i × weight_i) / Σ weight_i        // the drift
  AFTER:   buckets = quantize(reactionPrices, 1 pip)        // the quantum
           rung    = argmax(count(buckets))                 // the modal bucket
  // the golden proof: 101.19 emits ~101.19 (not 101.208); 101.235 ~101.235
  // (not 101.253); 100.975 survives as its own matrix (not absorbed)

THE 1-PIP DEDUP (L2 — the M-3 kill):

  BEFORE:  if (|rungA − rungB| < 3·pip) → merge            // the 0.5p pair dies
  AFTER:   if (|rungA − rungB| < 1·pip) → merge            // 101.235/101.240 live
  // ladder-scaffold.ts:446 — the operator's ruling: the drawn map shows
  // 101.235, 101.240, 101.250 as THREE separate rungs

THE MATRIX→MODEL.ZONES BRIDGE (L3 — the M-4 kill):

  BEFORE:  the rungs live in model.lqzMatrix/lmv/ladder — the mirror search
           (selectPairNativeZone) never sees them
  AFTER:   matrixLadderRungs' adapter exposes the rungs in model.zones
           (the LQZ_M namespace · the priceCenter · the zfp-as-liquidityScore
           · the sweeps-as-reactionCount — lqz-matrix.ts:599-626)

THE TELESCOPED TIERS (L4 — the M-5 kill):

  BEFORE:  the LMV runs at the 1H resolution only
  AFTER:   run1 on the 1H (the origin tiers) + run2 on the 30m (the refinement
           tier 1) + run3 on the 15m (the refinement tier 2) — the refined
           rungs override the coarser parents at the 1-pip quantum
```
## 6.7 src/mdve/obcv.ts (the new machine — the 4 sub-engines)
**The deep dive — src/mdve/obcv.ts (the new machine — the 4 sub-engines + the firewall):**

```
SUB-ENGINE A — THE DISPLACEMENT FIELD (the impulse detection):

  atr(i)  = Wilder's ATR(14) from the bars ENDING at i−1     // NEVER includes i
  isImpulse(i, tf) =
      body[i] ≥ 1.5 × μ_body(i−4..i−1)
    ∧ |close[i] − open[i]| ≥ 1.5 × atr(i)
    ∧ D_t(i, k) ≥ θ_tf          // θ: 4H 50p/ATR · 1H 30p/ATR · 30m 15-20p/ATR
    ∧ structureBroken(i, tf)    // the close beyond the prior N-bar extreme

SUB-ENGINE B — THE ORIGIN MATRIX:

  F[o] = [bw, bf, rng, dir, prior]
  zone = [o.low, o.high]        // the origin candle's FULL high-low
  // one origin candle = exactly one zone

SUB-ENGINE C — THE PRIOR-MOVE CLASSIFIER (the piecewise-total):

  prior(o) ∈ { NONE, OPPOSITE, SAME }   // the signed ATR-normalized sums
  classifyOrigin(o, tf) =
      BoM   if prior ∈ {NONE, OPPOSITE} ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate
      MoM   if prior == SAME ∧ validOrigin ∧ widthGate
      REJECT otherwise                   // the totality: no undefined inputs

SUB-ENGINE D — THE TELESCOPING INCIDENCE:

  T[parent][child] = 1 ⟺ child ⊆ parent ∧ tf(child) < tf(parent)
  30m → REQUIRES a 1H parent (orphan → REJECT)
  1H  → MAY refine a 4H OB

THE O5 FIREWALL (the output invariants):

  assert(|BoM| + |MoM| == |deduped|)      // the partition
  assert(∀ z30m: parent != null)          // the nesting
  assert(∀ z: widthGate(z))               // the width canon

THE INTEGRATION (the consumers):

  ObZone[] → ChartModel.zones (formationMs + parent)
  → the scaffold ladder's ORDER_BLOCK source
  → the E3's +5 isBoM scoring + the zfp ladders
  → the Law-14 TP walk's significance (UM BoM > liquidityScore≥5 > BoM > MoM ≤1x)
  → the E/SL anchors OB-native (the entry at the origin-candle defended edge,
    the SL beyond the origin-candle reaction extreme + the Law-7 buffer)
```

# PART 7 — THE PSEUDOCODE (the corrected engines — the full logic before the build)

The corrected engines' full logic — the build agents' pseudocode before the code (the ZR-7 spec's Part 7 style).

**7.1 The STEP A designation engine:**

```
function runStepADesignation(ctx, agentDecisions): StepADesignation[] {
  // the machine presents; the agent decides; the firewall validates
  const map = ctx.zoneMapSnapshot;
  const zoneIds = new Set(map.zones.map(z => z.id));

  for (const d of agentDecisions) {
    assert(zoneIds.has(d.zoneId),        `BLOCKED: ${d.zoneId} not in the map`);
    assert(d.rationale.length >= 40,     'BLOCKED: rationale too short');
    assert(/\d+\.\d{3,}/.test(d.rationale), 'BLOCKED: no price reference');
    assert(isValidDay(d.day),            'BLOCKED: invalid day');
    assert(isValidRole(d.role),          'BLOCKED: invalid role');
    ctx.stepADesignation.push(d);
  }
  return ctx.stepADesignation;
}
```

**7.2 The STEP B engine (the 11-token chain):**

```
function runStepB(ctx, agentDecisions): { projections, warnings } {
  const ledger = computeLedger(ctx);          // T1-T7 + T9 — the machine, ms
  const warnings: GroundingWarn[] = [];

  for (const d of agentDecisions) {
    if (!isFinite(d.forwardPosition)) warnings.push(warn('W-1', 'T8', ...));
    if (![d.E, d.SL, d.TP].every(isFinite))  warnings.push(warn('W-2', 'T10', ...));
    if (!directionOrdered(d))                warnings.push(warn('W-3', 'T10', ...));
    if (!ledger.targets.includes(d.chosenTarget)) warnings.push(warn('W-4', 'T8', ...));
    if (!ledger.zoneIds.includes(d.e1ZoneId))     warnings.push(warn('W-5', 'T10', ...));
    if (!ledger.projIds.includes(d.e2ProjectionId)) warnings.push(warn('W-6', 'T10', ...));
  }

  for (const w of warnings) recordFailure('GROUNDING_WARN', w);
  if (warnings.length && ctx.refineAttempts < 3) {
    return { projections: [], warnings };      // the agent's next turn (refine)
  }
  if (warnings.length) {
    recordFailure('REFINEMENT_EXHAUSTED', { pair: ctx.pair, week: ctx.weekStart });
    throw new ChainFailure('REFINEMENT_EXHAUSTED');   // data, not a crash
  }

  const projections = agentDecisions.map(d => assembleProjection(d, ledger));
  assertProjectionContract(projections);        // the E3-NEVER
  ctx.projections = projections;
  return { projections, warnings };
}
```

**7.3 The golden SL pipeline (M1):**

```
function computeGoldenSL(entry, dir, lmvTable, bars, weekStartMs): number {
  let sl = computeSL_LMV(entry, lmvTable);            // stage 1
  const probe = weekProbeAtAnchor(entry, bars, weekStartMs);  // stage 2
  if (!clearsAnatomy(sl, probe))
    sl = dir === 'SHORT' ? probe.price + buffer : probe.price − buffer;
  if (slDist(sl, entry) < GOLDEN_SL_MIN_PIPS)         // stage 3 — the 4p floor
    sl = walkToNextDefendedRung(entry, [4, 9.5 + buffer]);
  const util = probe.probeDepthPips / structDistPips; // stage 4
  return util >= 0.40 ? sl : probeGuard(sl, probe);   // KEEP vs PROBE_GUARD
}
```

**7.4 The phantom-BoM exemption (the all-4):**

```
function isPhantomBoMFortress(zone, ctx): boolean {
  return largeObWidth(zone)                       // (1) the SMC ratio width
      && midSwingFakeout(zone, ctx.bars)          // (2) the temporary break
      && preFormationOpposingBoMReaction(zone)    // (3) the reaction precedes
      && macroOriginContinuation(zone, ctx.macro);// (4) the KCE full swing
}   // 3-of-4 → false → the DEATH rule stands (the conservative default)
```

**7.5 The modal-cluster emission (L1):**

```
function emitModalRung(cluster, pip): number {
  const buckets = quantize(cluster.reactionPrices, 1 * pip);
  const modal = argmax(buckets, b => b.count);
  return modal.center;
}   // the golden proof: 101.19 → ~101.19 · 101.235 → ~101.235
```

# PART 8 — THE DATA CONTRACTS (the interfaces the build defines)

The interfaces the build defines (the ZR-7 spec's Part 8 style — the full contracts):

```typescript
// ── THE STEP A CONTRACT ──────────────────────────────────────────
interface StepADesignation {
  pair: 'DXY' | 'EUR/USD' | 'GBP/USD';
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  zoneId: string;                          // ∈ the E1 zone map (the firewall)
  role: 'SUPPLY' | 'DEMAND' | 'LQZ';
  classification: 'BoM' | 'MoM' | 'LQZ';
  rationale: string;                       // ≥40 chars ∧ /\d+\.\d{3,}/ (the firewall)
  pressureRead: string;                    // the lexicon-4 lifecycle state
}

// ── THE STEP B CONTRACTS ─────────────────────────────────────────
interface TokenLedger {
  t1: { zoneId: string; verdict: string };          // zone-identification
  t2: { side: 'BUY' | 'SELL'; score: number };      // pressure-status
  t3: { below: number; above: number; nearestRungId: string | null };  // liquidity
  t4: { breakVerdict: 'BROKEN' | 'UNBROKEN' | 'UNBROKEN_VIRGIN' };     // break-validation
  t5: { stronger: 'BUY' | 'SELL'; delta: number };  // strength-comparison
  t6: { mitigations: number };                     // reaction-count
  t7: { stage: ShapeCode; dayIndex: number };      // chain-progress
  t9: { chainedEntry: number | null };             // chaining (Law 27, sync)
  continuationTargets: string[];                   // the CLOSED set
  e1ZoneIds: string[];                             // the valid zone ids
  e2ProjectionIds: string[];                       // the valid projection ids
}

interface ReasoningStepDecisions {                 // the AGENT's args
  forwardPosition: number;                         // pips from the near edge
  chosenTarget: string;                            // ∈ the CLOSED set
  E: number; SL: number; TP: number;
  e1ZoneId: string; e2ProjectionId: string;
  confidence: number;                              // 0..1
  rationale: string;                               // the visible reasoning
}

interface GroundingWarn {
  check: string;        // W-1..W-7
  tokenId: string;      // T8 | T10 | T11
  sourceRef: string;    // the field
  value: unknown;
  proposedCorrection: string;
}

// ── THE OUTPUT CONTRACT ──────────────────────────────────────────
interface TradeProjection {
  pair: string; day: string; shape: ShapeCode; direction: 'LONG' | 'SHORT';
  entryZoneId: string; entryLqzId: string;
  E: number; SL: number; TP: number; RRR: number;   // the checkable anchors
  pressureRead: ZonePressureState;
  chainContext: string;
  validation: ValidationSignal;
  confidence: number;                               // pos/(pos+neg+1)
  anchors: Array<{ e1ZoneId: string; e2ProjectionId: string }>;  // E3-NEVER
}

// ── THE LEXICON CONTRACT ─────────────────────────────────────────
interface TradingLexiconRule {
  id: 'candle-pressure' | 'candle-shape' | 'zone-classification'
    | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
  families: TradingPatternFamily[];
  classify(input: LexiconInput): LexiconResult;     // {intent, confidence, action}
  enforce(result: LexiconResult, phase: 'A' | 'B'): void;
  escapeHatchTool: string;
  escalationThreshold: number;                      // 3
}

// ── THE FAILURE-STORE CONTRACT ───────────────────────────────────
// chain_failures: id · component · reason ∈ {GROUNDING_WARN,
//   REFINEMENT_EXHAUSTED, CONTRACT_VIOLATION, MACRO_DIVERGENCE} ·
//   context(JSON) · attempts · timestamp · week · pair
// recordFailure degrades to the append-only fallback row when
//   bun:sqlite is unavailable — never silently drops
```

# PART 9 — THE FORENSIC DETAIL (the exact evidence trails per derailment — the build agents' context)

The exact evidence trails per derailment — the build agents' context (the ZR-7 spec's Part 9 style).

**9.1 The F1 trace (the shadow dead — the D2 violation):**

```
the run:  diag-reasoning-chain.ts --day=2026-07-06
the log:  32 lines ending at "=== THE REASONING CHAIN ===" — the first lane's
          first LLM call in flight the whole time (L2:2035)
the stats: deterministic 14 | llm 0 | refinements 2 | hardThrows 0
the kill:  shadow-agent.ts:447/:535 — SHADOW_SHAPE_VIOLATION throws on the
          streaming output's parse (the forwardPosition/entry/sl/tp non-numeric)
the fix:   Phase 6 S2 — the WARN semantics (D2)
```

**9.2 The F2 trace (the forced-2.5-RRR — the D37 class):**

```
the emissions: EU S 1.14512 RRR 2.50 · EU L 1.14102 RRR 2.50 ·
               GU S 1.33662 RRR 2.50 · GU L 1.33242 RRR 2.50
the DXY lane:  DXY S 101.331 RRR 4.46 · DXY L 100.849 RRR 7.16
the mechanism: computeMirrorTP → null on the EU/GU lanes (F16) →
               the ratio-extension fallback (reasoning-chain.ts:789-790) →
               TP computed to hit RRR 2.5 EXACTLY
the fix:       Phase 8 TP-1..TP-4 — the ratio-extension removed, the ZR-3.3
               full-model resolution, the ZR-3.4 wall classification
```

**9.3 The F3 trace (the 30-min hang — fixed by C1+C3+C4, must not regress):**

```
the math:  3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls
           × the 600s wall-clock cap — killed working generations (L2:2037-2038)
the probes: 128000 → 61.9s · content 259 · reasoning 5914 · finish_reason stop
           (the model self-terminates at the natural end — the cap was the killer)
the fix:    C1 the token 8/10 Promise.all (2 LLM calls → 1 wall-clock slot) ·
            C3 the micro-parallel topology · C4 the SSE idle stall detector
the gate:   G9 ≤ 5 min — the regression test A7
```

**9.4 The F4 trace (the 1/5 convergence — the deltas):**

```
EU LONG  Δ0.8p  HIT (E 1.14102 vs the golden 1.14110 — the phantom-BoM fortress)
EU SHORT Δ11.7p (the E2 CORE designated the Friday-formed zone; the operator's
           real entry zone is the Monday-formed LQZ [1.1444-1.14395])
DXY LONG Δ9.6p  (the 1H LQZ near-edge alignment)
DXY SHORT Δ19.1p (the F1-A SHORT-entry lift missing)
GU LONG  Δ8.8p  (the demand pick 1.33270 vs the golden 1.33330)
the fix:  Phase 8 EN-1..EN-2 — the entry refinements on the SAME zone anchors
```

**9.5 The F7 trace (the telescoping absent — the root of the macro derailments):**

```
the lanes: the emergent 4H-only S/D + 1H-only LQZ (engine.ts:465 :223) ·
           the MDVE 4H+1H+30m OBs with ZERO cross-TF logic (ob-engine.ts:348) ·
           the ONLY telescoping code DEAD (plutus-tte-pipeline.ts:3021-3179)
the violation: bom-mom.ts:106 TF-agnostic — a 30m OB CAN be classified BoM
the operator: "If E1 is fucked everything that is built on top of it also
              gets fucked"
the fix:  Phase 1 T1-T6 — the wiring (the modules + the gates above)
```

**9.6 The F8 trace (the golden-rung collisions — the LMV resolution limits):**

```
the emitted rungs: 100.849 (Δ0.4p ✓) · 100.949 (Δ0.4p ✓) · 101.000 · 101.054 ·
                   101.130 (Δ1.0p ✓) · 101.253
the missing: 100.975 · 101.19 · 101.235 · 101.240 (no dedicated emitted rung)
the mechanisms: the band merging (100.975 → 100.945's matrix) · the center drift
                (101.19 → 101.208) · the dedup floor (101.235/101.240 merged) ·
                the bridge gap (the matrix rungs not in model.zones)
the fix:  Phase 2 L1-L4 — the modal emission · the 1-pip dedup · the bridge ·
          the telescoped tiers
```

# PART 10 — THE TEST SPECS (written BEFORE the code per TDD — the diag assertions)

The test specs written BEFORE the code (TDD — the ZR-7 spec's Part 10 style). Every diag is a standalone harness with the exit code 0/1 + the per-test verdicts.

**10.1 The diag inventory (one per phase — the full battery):**

| The diag | The phase | The tests | The exit |
|---|---|---|---|
| diag-telescoping.ts | 1 | T-1..T-7 (the nesting · the 30m MoM-only · the 15m lane · the oracle) | 0/1 |
| diag-lmv-golden.ts | 2 | L-1..L-6 (the 7/7 ≤1p · the modal proof · the 1p dedup · the bridge) | 0/1 |
| diag-obcv-golden.ts | 3 | O-1..O-6 (the reconstruction · the 96% · the partition · the nesting) | 0/1 |
| diag-mirror-fixes.ts | 4 | M-1..M-6 (the SL floor · the probe · the distribution · the inversion) | 0/1 |
| diag-lexicons.ts | 5 | X-1..X-9 (the phantom all-4 · the piecewise-total · the macro authority) | 0/1 |
| diag-grounding-warn.ts | 6 | S-1..S-7 (the WARN fires · the 3-cap · the order · the closed set) | 0/1 |
| diag-step-tools.ts | 7 | P-1..P-9 (the registry · the firewalls · the NEXT chain · the lifecycle) | 0/1 |
| diag-e3-precision.ts | 8 | E-1..E-9 (the A2 · the RRR variety · the ladder SL · the edges · the chain) | 0/1 |
| diag-reasoning-chain-golden.ts | 9 | G1-G10 + A1-A7 (the oracle · the wall · the equivalence) | 0/1 |

**10.2 The replay fixtures (the real evidence reconstructed as tests):**
- The F1 replay: a streaming output with a non-numeric forwardPosition → the WARN, never a kill (diag-grounding-warn S-1).
- The F2 replay: a null computeMirrorTP on the EU/GU lanes → NO emission, never the 2.5 clamp (diag-e3-precision E-1).
- The F3 replay: the Monday diag's wall time ≤ 5 min (diag-reasoning-chain-golden G9).
- The F4 replay: the EU LONG Δ0.8p held + the 4 misses refined (diag-e3-precision E-5/E-6).
- The F6 replay: the phantom-BoM fixture `EUR/USD|1H|1782990000000|1.14004` → PHANTOM_BOM (diag-lexicons X-1).
- The F7 replay: no 30m BoM anywhere on the golden fixture (diag-telescoping T-2).
- The F8 replay: the 7/7 golden LQZs at ≤1 pip (diag-lmv-golden L-1).

**10.3 The adversarial minimums (the runtime-grade law — happy paths are forbidden):**
Every diag carries ≥ 1 adversarial scenario (the empty/null/concurrent/boundary): the empty designation (P-8) · the empty projections (P-9) · the NaN forwardPosition (S-6) · the 3-of-4 phantom (X-8) · the sub-4p SL (M-5) · the 40-pip SL (M-6) · the 0.4-pip pair merge (L-6) · the Bug-3 ATR-inclusion blindness (O-5).

# PART 11 — THE WAVE DISPATCH PLAN (the trident-dispatch-templates — pre-organized sequential waves)

**THE DISPATCH PROTOCOL (the load → fill → dispatch loop):**
1. Load the trident-dispatch-templates skill (the E1-E4 explore + B1-B5 build templates — complete pre-written prompts).
2. Fill ONLY the two slots: [FILEPATHS] (the absolute paths from the wave table) + [CONTEXT] (the per-agent context blocks below — mission / knownContext / doctrine / measurements / acceptance / taskTargets / position).
3. The filled template is 150+ lines BY CONSTRUCTION (the skeleton alone is 100+); the trident-task-preflight validates the line floor + the markers (target=task) — READY = dispatch.
4. Dispatch via THE TASK TOOL ONLY (D6 — the wave dispatcher's spawn is broken; never wait on a spawn that did not return a sessionId).
5. Every return: the orchestrator's own zero-trust battery (Part 4) + the diff review of EVERY changed line + the wave audit at .trident/wave-audit/.

**THE WAVE-BY-WAVE DISPATCH PLAN (pre-organized sequential waves — one agent per disjoint file set):**

### WAVE 0 — THE STATE VERIFICATION (explore — E1 template)
| The slot | The fill |
|---|---|
| name | w0-state-verify |
| filepaths | src/mdve/reasoning-chain.ts · src/mdve/shadow-agent.ts · src/brains/shape-brain.ts · src/pipeline/engine.ts · src/mdve/ob-engine.ts · src/mdve/lmv.ts · src/mdve/lqz-matrix.ts · src/mdve/mirror.ts · diag-reasoning-chain.ts |
| mission | The forensic inventory: the CURRENT state of every file the overhaul touches — the exports, the line anchors, the phantom-BoM exemption's ACTUAL line in shape-brain.ts (the F6 conflict: the L2 cites :2330-2336, the handover :1150), the LQZ sweepLookback's ACTUAL constant in lqz-lobe.ts (the F12 conflict: 12 vs 24), the computeMirrorTP null path in mirror.ts (the F2 root), the ratio-extension in reasoning-chain.ts (the F2 fallback), the shadow-agent.ts fetch path (the F1 root), the frozen pair's sha256 |
| knownContext | This engineering spec is the build authority; the handover package's measured state: the shadow dead (llm 0), the EU/GU RRRs all 2.50, the golden convergence 1/5, the frozen pair sl-lmv 912940832fac44bc + trade-dedup 33914c897e777540; the wave table's file sets depend on YOUR resolved anchors |
| doctrine | Do NOT re-derive the measured state — verify the anchors; an anchor that moved is reported MOVED with the current line; every claim carries a file:line; the frozen pair is read-only |
| measurements | the phantom-BoM line (FOUND at line X / MOVED to Y / ABSENT) · the sweepLookback value · the ratio-extension lines · the shadow fetch lines · the frozen pair sha256 · the engine.ts tool registry |
| acceptance | the resolved line numbers for F6 + F12 · the F1/F2 root-code excerpts · the file inventory with the exports · tsc 0 on the CURRENT tree |
| taskTargets | T1 the per-file extraction · T2 the F6/F12 line verification · T3 the F1/F2 root-code trace · T4 the tool registry + the context fields · T5 the failure-mode scan |
| position | W0 gates the entire overhaul — every wave's surgical edits target YOUR verified anchors |

### WAVE 1 — PHASE 1+2 — THE E1 MATH ENGINES PART 1 (B3 ×2)
| The slot | Agent 1a (the telescoping) | Agent 1b (the LMV resolution) |
|---|---|---|
| name | w1a-telescoping | w1b-lmv-resolution |
| filepaths | src/mdve/ob-engine.ts · src/brains/4h-sd-lobe.ts · src/mdve/bom-mom.ts · src/brains/lqz-lobe.ts · src/brains/shape-brain.ts · src/pipeline/engine.ts · src/mdve/index.ts | src/mdve/lmv.ts · src/mdve/lqz-matrix.ts |
| mission | Wire the telescoping T1-T6 per the spec §Phase 1: the lqz-lobe timeframe param + the per-TF thresholds (the T2 config — the W0-verified sweepLookback), the 4H→1H nesting + the refinedLabel/nestedWithin + the confluence (+3/+5), the 1H→30m minor refinement, the 30m MoM-only gate, the LQZ 1H→30m→15m runs, the T6 snapshot merge | The LMV resolution per the spec §Phase 2: the modal-cluster emission, the 1-pip dedup (the 0.5-pip pair 101.235/101.240 both survive), the matrix→model.zones bridge, the telescoped 30m/15m matrix tiers |
| knownContext | The operator's telescoping doctrine verbatim (the spec §1.1); the current state: the emergent lane 4H-only, bom-mom.ts:106 TF-agnostic; the ONLY telescoping code dead legacy | lmv.ts + lqz-matrix.ts are the MUTABLE prototypes (the operator's ruling); the current 3/7 at ≤1 pip; the 4 stacked collapse mechanisms (the spec §2.1) |
| doctrine | "30m is not an origin point for BoM S/D zones"; the LTF never overrides the HTF; the single zone map (LAW 3); the golden levels never hardcoded | The LMV formulation verbatim; "this is the definitive test of LMV"; the constants CLUSTER_TOLERANCE_PIPS=2 · CLUSTER_MAX_SPAN_PIPS=4 · MIN_REACTION_CANDLES=3 · LQZ_LOOKBACK_BARS=720 |
| measurements | the 7 golden DXY levels · the per-TF S/D params (4H 60/40/150 · 1H 120/25/150 · 30m 200/15/150 · 15m 300/10/150) · the confluence +3/+5 | the 7 golden levels · the 48-zone LmvTable [98.751, 101.800] · the 3.0p + 0.5p pairs as the proof |
| acceptance | tsc 0 · bun build · the frozen pair byte-identical · the 7 golden DXY levels in the map computed · no 30m BoM · the 15m lane | tsc 0 · diag-lmv-golden 7/7 at ≤1 pip · the frozen pair byte-identical · the bridge visible to the mirror search |
| taskTargets | T1 the T1-T2 wiring · T2 the T3-T4 wiring · T3 the T5-T6 wiring · T4 the golden-map verification | T1 the modal emission · T2 the 1-pip dedup · T3 the bridge · T4 the telescoped tiers · T5 the oracle |
| position | The E1 substrate is the agent's STEP A/B reading material — a wrong map makes the reasoning theater | The entries land on the operator's exact rungs ONLY through this resolution |

### WAVE 2 — PHASE 3 — THE OBCV MACHINE (B1 ×1)
| The slot | The fill |
|---|---|
| name | w2-obcv |
| filepaths | src/mdve/obcv.ts (NEW) · the OBCV consumers (the ladder scaffold's ORDER_BLOCK source) |
| mission | Build the OBCV per the spec §Phase 3: the 4 sub-engines (the displacement field D · the origin matrix F · the prior-move classifier · the telescoping incidence T) + the O5 firewall invariants (the partition · the nesting · the widthGate) |
| knownContext | The operator's OBCV formulation verbatim ("finds all the OBs using its own MPSE function"); the current gap: the conservative gates emitted 0 BoM on the golden fixture; the v4.4 Bug-3 lesson (the ATR never includes the impulse bar) |
| doctrine | "LMV + OBCV = the two biggest levers"; the BoM = prior NONE/OPPOSITE ∧ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate; the 30m requires a 1H parent |
| measurements | the displacement thresholds (4H 50p/18b · 1H 30p/36b · 30m 15-20p/24b) · the width gates (4H 15-40 · 1H 8-25 · 30m 5-15) · the golden reconstruction targets (1H BoM demand 100.68-100.73 · 4H BoM supply 101.235-band · 1H MoM demand 100.845) |
| acceptance | the golden OB reconstruction from data alone + 96% vs the drawn map · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 sub-engine A · T2 sub-engine B · T3 sub-engine C · T4 sub-engine D + the invariants · T5 the oracle |
| position | The operator's drawn BoM levels must exist in the map BEFORE the agent's STEP A designates them |

### WAVE 3 — PHASE 4 — THE MIRROR FIXES (B3 ×1)
| The slot | The fill |
|---|---|
| name | w3-mirror-fixes |
| filepaths | src/mdve/mirror.ts |
| mission | Re-port the 3 lost fixes + the sweep-bonus inversion per the spec §Phase 4: computeGoldenSL_V452 + the GOLDEN_FLOOR (GOLDEN_SL_MIN_PIPS=4), weekProbeAtAnchor (the LMV candle-wick band-touch probe), classFlexibleLQZFallback + the GU distribution loop (`usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror), and the computeLmvTP sweep-bonus −30 (the inverted significance) |
| knownContext | The 3 fixes lost in the v4.5.2-E2-cascade wipe (Bible 4.5 §9.1); BUILD_STATE.md:127 falsely claims present; the current significance `(sweepCount≥1 ? +50 : 0) + ...` — the +50 is the inversion; the GU TP lands one rung too shallow → RRR 1.30 → RRR_DISCARDED |
| doctrine | The D35 SL doctrine ("SL goes INSIDE the next LQZ... < 20 pips"); the GOLDEN_SL_MIN_PIPS=4 · GOLDEN_SL_MAX_PIPS=9.5 · the Law-7 buffers · the D17 ceiling 36 HARD; "Distribution must be a property of the SIGNALS, NEVER of the OUTCOMES" |
| measurements | the golden SLs 4-9.5p · the probe targets · the GU distribution ≥ 8 distinct anchors · the 55.5-pip Law-14 path |
| acceptance | tsc 0 · the golden SL floor enforced · the weekProbeAtAnchor fires · the GU ≥ 8 distinct anchors · the RRR_DISCARDED casualty drops |
| taskTargets | T1 computeGoldenSL_V452 + the floor + the fallback · T2 weekProbeAtAnchor · T3 the class-flexible fallback + the distribution · T4 the sweep inversion |
| position | The GU lane's viability + the golden SL precision depend on this wave |

### WAVE 4 — PHASE 5 — THE SIX LEXICONS (B1 ×1)
| The slot | The fill |
|---|---|
| name | w4-lexicons |
| filepaths | src/mdve/lexicons/ (NEW) · the wiring points: src/mdve/lmv.ts · src/brains/shape-brain.ts · src/mdve/mirror.ts · src/mdve/reasoning-chain.ts |
| mission | Build the six lexicons per the spec §Phase 5: the TradingLexiconRule machine form + the wiring at the 6 enforcement points + the phantom-BoM all-4 predicate tested on the golden fixture |
| knownContext | The PLUTUS_V4.5.4_LEXICON_SPEC.md is the design authority (the family tables complete there); no consumer reads the lexicons (F11); the shape-brain line = the W0-verified anchor (F6); the operator's mapping: "zones/candles = regex · pressure mechanics = semantic intent" |
| doctrine | The MPSE law (every predicate deterministic · score = pos/(pos+neg+1)); Phase A = the boundary THROW · Phase B = the output mutation; the escape hatches never block a legitimate setup; the phantom-BoM all-4 (3-of-4 = DEATH) |
| measurements | the confidence formula · the escalationThreshold 3 · the golden fixture (the EU demand [1.14145-1.14000] → PHANTOM_BOM EXEMPT; a 3-of-4 → DEATH) |
| acceptance | every lexicon's classification consumed · the phantom fixture passes · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 the machine form + the 6 modules · T2 the 6 wirings · T3 the phantom fixture · T4 the tsc + the build |
| position | The semantic intent layer the agent's STEP A/B reads — without it the agent reasons over bare numbers |

### WAVE 5 — PHASE 6 — THE SHADOW RETIRE + THE WARN (B3 ×1)
| The slot | The fill |
|---|---|
| name | w5-shadow-retire |
| filepaths | src/mdve/shadow-agent.ts · src/mdve/reasoning-chain.ts |
| mission | Retire the shadow per the spec §Phase 6: shadow-agent.ts's fetch/SSE/SHADOW_MODEL path DELETED as the executor (the C2 machinery archived as the reference, never invoked); the token 8/10/11 hooks become the agent-facing contract (the ReasoningStepInput — the ledger + the candidates); the grounding WARN semantics wired: the WARN rows → the store → the loop continues → the hard-throw ONLY after 3 (REFINEMENT_EXHAUSTED) |
| knownContext | D1/D2 verbatim (the spec §0.1); the current llm 0 — the SHADOW_SHAPE_VIOLATION hard-kills at shadow-agent.ts:447/:535; the SHADOW_REWIRE_SPEC is the rewire authority; the failure store's live rows become GROUNDING_WARN / REFINEMENT_EXHAUSTED / CONTRACT_VIOLATION / MACRO_DIVERGENCE |
| doctrine | D1 + D2 verbatim; the C4 stall-detector pattern preserved as the reference; the store never silently drops (the append-only fallback) |
| measurements | the WARN row shape · the refine cap 3 · the chain_failures schema |
| acceptance | the A1 test (a bad projection → WARN + the loop continues + the hard-throw only after 3) · NO fetch in the reasoning path (the grep gate) · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 the fetch removal + the contract shape · T2 the WARN semantics · T3 the store rows · T4 the A1 test |
| position | The D1/D2 law made mechanical — the agent reasons, the machine warns, nobody hard-kills |

### WAVE 6 — PHASE 7 — THE STEP A/B TOOLS (B1 ×1)
| The slot | The fill |
|---|---|
| name | w6-step-tools |
| filepaths | src/pipeline/engine.ts · the new tools (plutus-pipeline-reason-step-a · plutus-pipeline-reason-step-b · plutus-pipeline-gate) |
| mission | Build the STEP A/B tools per the spec §Phase 7: reason-step-a (the designation contract + the firewalls — the zone-id membership + the rationale ≥40c + the price ref), reason-step-b (the 11-token contract: the ledger presented, the agent's decisions assembled, the WARN validated — the A-2 amendment: the agent emits ONLY the decisions, the machine assembles), the gate tool (the G1-G10), the context fields + the NEXT instructions + resetContext() |
| knownContext | The T1_MULTI_TOOL_CHAIN_PIPELINE.md is the wiring authority (the output-contracted args · the firewalls · the NEXT instructions · the context · the reset); D5/D8 (the reasoning chain as a STEP); the current registry: the 5 legacy tools |
| doctrine | "The agent is NOT a passive caller. The next tool's arguments MUST contain the output of that reasoning." (T1:46); the E3-NEVER contract |
| measurements | the StepADesignation + TradeProjection interfaces (Part 8) · the WARN set · CLUSTER_TOLERANCE_PIPS 2 · the rationale floor |
| acceptance | tsc 0 · the A4 test (a fabricated designation → BLOCKED) · the A1 test (a bad projection → WARN) · the NEXT instructions · the context carries the designation + the projections · the frozen pair byte-identical |
| taskTargets | T1 the STEP A tool + the firewall · T2 the STEP B tool + the assemble + the WARN · T3 the gate tool · T4 the context + the registry + the NEXT · T5 the A1/A4 tests |
| position | The agent-in-the-loop becomes REAL — the two reasoning steps the operator sees in the stream |

### WAVE 7 — PHASE 8 — THE E3 PRECISION (B3 ×1)
| The slot | The fill |
|---|---|
| name | w7-e3-precision |
| filepaths | src/mdve/reasoning-chain.ts (the ladder-steps SL + the strength-driven TP edge) · src/mdve/setup-gen.ts (the entry refinements — the operator-unfrozen file) |
| mission | The anchor doctrine made mechanical per the spec §Phase 8: the ladder-steps SL (3p outside the far edge OR 1-2p inside the next step's close edge — the relevant zone by the pressure state), the strength-driven TP edge (the strong → close + spread; the weak → far), the entry refinements at the operator's levels (the GU pick 1.33330 · the 4 misses on the SAME zone anchors), the TP substrate (the ratio-extension removed · the ZR-3.3 full-model resolution · the ZR-3.4 wall classification) |
| knownContext | The operator's anchor rules verbatim (the spec §Phase 8.1); the trade #4's relevance switch; the current state: the 4 misses + the GU Δ6.0p pick + the forced-2.5 |
| doctrine | The RRR is the consequence; the chaining preserved (Law 27); the zones are ladder steps; the entry never moves to a new zone in the refinement (the 3-attempt machine) |
| measurements | the golden levels · the ≤3p tolerance · the 2.5R floor / 4R+ target |
| acceptance | tsc 0 · the golden hits ≥2/5 · the EU LONG Δ0.8p held · the chaining intact · the ratio-extension absent (the grep gate) · the frozen pair byte-identical |
| taskTargets | T1 the ratio-extension removal + the ZR-3.3/ZR-3.4 · T2 the ladder-steps SL · T3 the strength-driven TP edge · T4 the entry refinements · T5 the convergence measurement |
| position | The convergence push — the golden hits are the ONLY metric (D4) |

### WAVE 8 — PHASE 9 — THE W6 GOLDEN GATE (B4 ×1)
| The slot | The fill |
|---|---|
| name | w8-golden-gate |
| filepaths | diag-reasoning-chain-golden.ts (NEW) |
| mission | Build the W6 golden gate per the spec §Phase 9: the G1-G10 harness (the per-gate checks + the verdicts + the exit protocol) + the adversarial scenarios A1-A7 |
| knownContext | The L2's G1-G10 table + the Monday oracle (the spec §0.6); the golden const = the MEASUREMENT ORACLE ONLY (the TEMPORARY ARCHITECTURE label); the current state: the W6 absent (F5); D4: the only valid Monday trades are the golden trades |
| doctrine | The golden is a VALIDATION set, never a training input; the ≤3p tolerance ONLY; the G9 ≤ 5 min; the G10 byte-identical |
| measurements | the oracle levels · the ≤3p tolerance · the 5-min wall · the 2-pip G1 entry · the frozen pair SHAs |
| acceptance | `bun diag-reasoning-chain-golden.ts --day=2026-07-06` exits 0 with the per-gate verdicts · the convergence table · the wall ≤5min · the determinism ×2 · tsc 0 |
| taskTargets | T1 the G1-G10 harness · T2 the verdicts + the exit protocol · T3 the adversarial scenarios (A3 · A5 · A7) |
| position | The mechanical acceptance — the overhaul's proof, run on the host |

### WAVE 9 — THE HOST DEPLOYMENT TEST (the operator's directive D10)
The operator deploys the FULL plutus agent as a subagent on host (the task tool). The deployed agent runs the full pipeline: harvest → zones → STEP A (the visible designation) → shapes → STEP B (the visible 11-token reasoning) → setups → gate. The orchestrator observes the stream (the STEP A/B reasoning visible — D1: "so we can see everything"), collects the G1-G10 verdicts, and records the wave audit. The convergence table is the operator's acceptance read.

*END OF THE WAVE DISPATCH PLAN — every wave's fills are ready to load into the trident-dispatch-templates skeleton (E1 for W0 · B3 for the surgical waves · B1 for the builds · B4 for the gate) and dispatch via the task tool with 0 watering down. THE OVERHAUL SHIPS WAVE BY WAVE, EACH GATED, EACH AUDITED, ON THE HOST.*

# APPENDIX A — THE ZERO-TRUST AUDIT (of this spec — the adversarial-builder pass)

**The zero-trust audit of THIS spec (the adversarial-builder pass — the deep-planning skill's mandatory gate):**

| # | Severity | The finding | The surgical edit |
|---|---|---|---|
| A-1 | HIGH | The LQZ lookback resolution (the C-1 rule) presumes the T2-config choice before the operator's ruling — a spec should not pre-decide a canonical conflict | The rule stands WITH the mechanical arbiter (the golden-LQZ oracle decides, the W0 verifies the current constant); the choice is documented at the edit point, not buried — ACCEPTED as-is with the explicit note |
| A-2 | MEDIUM | The STEP B tool's args carrying the FULL projections array would bloat the agent's context (the A-2 amendment in v1) — the agent should emit ONLY the decisions, the machine assembles | ALREADY AMENDED: the ReasoningStepDecisions contract (Part 8) + the assemble step (Phase 7 T-B) — the agent's args carry the decisions, the machine builds the full projections — RESOLVED IN THIS VERSION |
| A-3 | MEDIUM | The W6 wave (the shadow removal + the WARN + the TP substrate) bundles three mechanisms in one agent | RESOLVED: the phases split — Phase 6 (the shadow + the WARN) is the W5 wave; Phase 8 (the TP substrate) is the W7 wave — one mechanism per wave in the dispatch plan |
| A-4 | LOW | The Phase-1 file set (ob-engine · 4h-sd-lobe · bom-mom · lqz-lobe · shape-brain · engine · mdve) is large for one surgical agent | The telescoping modules are one coherent doctrine (the T1-T6 as a single wiring — the same as the operator-approved V4.5.2 spec's Phase 2); the dispatch plan's task targets break it into the T1-T6 units; the gate forces the integration — ACCEPTED |
| A-5 | LOW | The host-testing presumes the operator's deployment readiness — the diag harnesses must run even before the deployment | The zero-trust battery runs on the host directly (bun) regardless; the deployment adds the AGENT-visible stream — ACCEPTED |
| A-6 | LOW | The STEP A's designation count (min 1 per pair per day) could balloon the agent's output on a full week | The tool's args carry the designation ARRAY (the summary), the context carries the full — the machine validates the membership; the agent's visible reasoning is the rationale field — ACCEPTED with the note |
| A-7 | MEDIUM | The G1-G10 harness pseudocode (Phase 9) references ctx.projections — the gate must also run when the projections are absent (the failure path) | The gate tool returns the FAILED verdicts with the reason (the missing phase outputs) — the gate NEVER crashes, it reports — AMENDED in the harness contract |

**The audit verdict:** 0 CRITICAL · 1 HIGH (mitigated by the mechanical arbiter — the golden oracle) · 2 MEDIUM (A-2 resolved in this version · A-7 amended) · 3 LOW (accepted) — **no unresolvable gaps; the spec ships as the build authority.**

**The spec's compaction anchor:** this document is the FIRST read after any compaction — the §0 directives, the §0.6 oracle, the §3 wave order, the Part 11 dispatch fills, and the Part 4 battery are the complete resume surface. The canon docs (the build report ENTRY 6 · the DEBUG_LOG · the DECISION_CHAIN D62) are updated per wave (Part 7 of the v1 spec's discipline — carried here as the wave discipline in the §3 gates).

*END OF THE PLUTUS v4.5.4 SHARK-CME ENGINEERING SPEC — THE AGENT-IN-THE-LOOP RESTORATION. THE OVERHAUL SHIPS WAVE BY WAVE, EACH GATED, EACH AUDITED, ON THE HOST.*
