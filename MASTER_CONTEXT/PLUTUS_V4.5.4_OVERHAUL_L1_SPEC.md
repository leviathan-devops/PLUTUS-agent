# PLUTUS v4.5.4 OVERHAUL — L1 SPEC (THE AGENT-IN-THE-LOOP RESTORATION)

**Version:** 1.0 · **Date:** 2026-08-08 · **Status:** BUILD AUTHORITY — the full 4.5.4 overhaul, session-scoped
**Purpose:** Anchor the complete v4.5.4 overhaul: the shadow-agent removal, the primary-agent reasoning steps wired between E1/E2 and E2/E3 per the T1 multi-tool-chain architecture, the E1 math engines finished (telescoping T1-T6, LMV resolution, OBCV), the six lexicons wired, the E3 precision substrate fixed, the W6 golden gate built, and the host-based testing loop (the plutus agent deployed as a subagent on host — no container).
**Predecessor:** PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md (the architecture canon, 2,051L) · PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC.md (the design origin, 687L) · HANDOVER_PACKAGE_4.5.4/ (the measured state) · T1_MULTI_TOOL_CHAIN_PIPELINE.md (the wiring architecture, 844L)
**Baseline (operator-locked):** the frozen pair sl-lmv `912940832fac44bc` + trade-dedup `33914c897e777540` byte-identical · tsc 0 · the Monday oracle (DXY L 100.945 / DXY S 101.140 / EU S 1.14395 / EU L 1.14110 / GU L 1.33330 at ≤3p) · ANCHOR_MS=1783702800000 · DXY_PIP=0.01 · EU/GU 0.0001 · the golden const = TEMPORARY ARCHITECTURE (measurement oracle only)

---

## THE TABLE OF CONTENTS

- §0 THE FUNDAMENTAL PROBLEM
- §1 FAILURE INVENTORY (evidence-grounded)
- §2 THE FIX PLAN (the agent-in-the-loop architecture)
  - 2.1 The target architecture
  - 2.2 The STEP A contract (E1 → E2 reasoning)
  - 2.3 The STEP B contract (E2 → E3 reasoning — the 11-token chain)
  - 2.4 The shadow removal + the grounding WARN (D2)
  - 2.5 The E1 math engines (telescoping · LMV · OBCV · the 3 lost fixes)
  - 2.6 The six lexicons wired
  - 2.7 The E3 precision (the TP substrate + the anchors)
  - 2.8 The pipeline wiring (the T1 mechanics)
- §3 IMPLEMENTATION ORDER (the waves + the gates)
- §4 TESTING STRATEGY (host-based, subagent deployment)
- §5 ANTI-PATTERNS AGAINST FALSE SUCCESS
- §6 SUCCESS CRITERIA (mechanical, numbered)
- §7 COMPACTION-PROOF IMPLEMENTATION GUIDE
- §8 OPEN QUESTIONS
- APPENDIX A — ZERO-TRUST AUDIT (the findings table)
- APPENDIX B — THE WAVE DISPATCH PLAN (trident dispatch templates, pre-organized)

---

## §0 THE FUNDAMENTAL PROBLEM
The v4.5.4 reasoning chain's JUDGMENT layer (tokens 8-11) is executed by a DEAD external shadow fetch (llm 0 — never fired) instead of the primary agent reasoning in-session, and the deterministic substrate the agent must reason over (the E1 math engines + the six lexicons) is UNFINISHED — so the pipeline currently runs either agentless (direct OHLC computation, the last several builds) or with a cheat (the shadow's context-less external model call).

**The root class of defect in one sentence:** the judgment layer was implemented as a hidden external LLM call instead of the T1 architecture's designed role — the primary agent reasoning VISIBLY between tool calls, with the machine computing and the agent deciding.

**The operator's directives (VERBATIM — the law this spec serves):**

| # | The directive (verbatim) | The architectural consequence |
|---|---|---|
| D1 | "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop" | The shadow executor is RETIRED; the primary agent reasons in-session, visible, as the pipeline STEP's executor |
| D2 | "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop." | The machine's validation of the agent's output = WARN + continue; hard-throw ONLY after 3 refinements |
| D3 | "How is DXY higher R than EU + GU that makes no sense" + "RRR is a CONSEQUENCE, not a target" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5." | The forced-2.5-RRR ratio-extension is REMOVED; the RRR emerges from the zone geometry |
| D4 | "what are these trades if not the golden hits? are these even valid? the only trades valid for Monday are the golden trades" | The golden convergence is the ONLY metric; every emission carries the delta table |
| D5 | "i dont even understand what the fuck you are building right now and how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline." | The reasoning chain = the pipeline STEP: harvest → zones → shapes → REASONING → setups → report + gate |
| D6 | "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL" | The task tool is the ONLY spawn path; the wave dispatcher's spawn is broken — never wait on it |

**The T1 restoration principle (the operator's own architecture, T1_MULTI_TOOL_CHAIN_PIPELINE.md):**
"The agent is NOT a passive caller. Between each tool call, the agent performs reasoning that is REQUIRED for the next tool to function. The next tool's arguments MUST contain the output of that reasoning." — the tool output carries the NEXT instruction; the next tool's args are contracted on the reasoning's output; the mechanical firewalls validate. The SDK-bridge lesson (T1 §8): the agent IS the model — same context, same identity, no external calls. The shadow violated exactly this; this spec restores it.

## §1 FAILURE INVENTORY
Every failure below is evidence-grounded (the handover package's measured state, the L2 spec's session records, the wave syntheses' doc anchors). Severity: CRITICAL / HIGH / MEDIUM.

### 1.1 The reasoning-chain failures

| # | Failure | What happened | Root cause | Impact | Severity |
|---|---|---|---|---|---|
| F1 | The shadow LLM never fired | stats: `deterministic 14 \| llm 0 \| refinements 2 \| hardThrows 0` — every LLM-hooked token fell back to the deterministic skeleton | the grounding `SHADOW_SHAPE_VIOLATION` checks (shadow-agent.ts:447/:535) hard-killed the loop on any non-numeric / out-of-order output; the streaming parse rejected the heavy ledger prompts | the judgment layer NEVER ran — the "reasoning chain" emitted machine-only projections dressed as reasoned | CRITICAL |
| F2 | The forced-2.5-RRR | EU/GU RRRs ALL exactly 2.50 vs the DXY lane's real 4.46 / 7.16 | `computeMirrorTP` returns null on the EU/GU mirror lanes → the ratio-extension fallback (reasoning-chain.ts:789-790) computes the TP to hit RRR 2.5 EXACTLY — the RRR-as-target (the D37 class, SLOP-01) | the EU/GU emissions are fabricated artifacts — the operator: "How is DXY higher R than EU + GU that makes no sense" | CRITICAL |
| F3 | The 30-min diag hang | the Monday diag stalled at the first lane's first LLM call for 30 min | 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls × the 600s wall-clock cap that killed working generations (L2 PART 39; the endpoint probes: 128000 → 61.9s content 259 + reasoning 5914, finish_reason stop) | the build loop ground to a halt; the fix C1+C3+C4 already landed (the token 8/10 Promise.all, the micro-parallel topology, the SSE idle stall detector) | HIGH (fixed, must not regress) |
| F4 | The golden convergence 1/5 | only the EU LONG hit (Δ0.8p) of the 5 Monday emissions | the anchor precision: EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p — the LQZ near edges and the ladder-steps SL not aligned to the operator's levels | the acceptance oracle unmet — the ONLY valid trades are the golden trades (D4) | HIGH |
| F5 | The W6 golden gate absent | `diag-reasoning-chain-golden.ts` does not exist | the wave dispatcher's spawn FAILED (SLOP-09) — the agents never launched; only the manual task-tool dispatches ran (D6) | no mechanical acceptance — the G1-G10 contract defined but unenforced | HIGH |
| F6 | The shape-brain.ts line conflict | the L2 spec cites the phantom-BoM exemption at `shape-brain.ts:2330-2336`; the handover README cites `:1150` | the same surgical edit point, two recorded line numbers | the W5/wiring edit targets the wrong anchor → the exemption silently misses | HIGH (verify before edit) |

### 1.2 The substrate failures (E1/E2/lexicons)
### 1.1 The reasoning-chain failures
| # | Failure | What happened | Root cause | Impact | Severity |
|---|---|---|---|---|---|
| F7 | Telescoping completely absent in live E1 | the emergent lane builds 4H-only S/D + 1H-only LQZ; the MDVE lane builds 4H+1H+30m OBs with ZERO cross-TF logic; 15m bars harvested but unused; `bom-mom.ts:106` is TF-agnostic (a 30m OB CAN be classified BoM today — a doctrine violation) | the operator's telescoping doctrine never wired (Bible 4.5 §12: T1-T6 modules are spec, not code); "the ONLY telescoping implementation lives in the DEAD legacy pipeline" (plutus-tte-pipeline.ts:3021-3179) | the zone map is wrong at the LTF levels where 53% of winning entries live (15m/30m); "If E1 is fucked everything that is built on top of it also gets fucked" | CRITICAL |
| F8 | The LMV resolution limits (the golden-rung collisions) | 3/7 golden DXY LQZs at ≤1 pip (100.849 Δ0.4p · 100.949 Δ0.4p · 101.130 Δ1.0p); 100.975 / 101.19 / 101.235 / 101.240 have NO dedicated emitted rung | the 4 stacked mechanisms: the ε=2 band merging (100.975 absorbed into 100.945's matrix), the center drift (prominence-weighted mean vs the modal reaction level), the 3-pip dedup floor (101.235/101.240 = 0.5p merged), the bridge gap (matrix LQZ not in model.zones) | the entries cannot land on the operator's exact rungs — the precision ceiling | HIGH |
| F9 | The OBCV conservative gates | the OBCV's direct output emitted 0 BoM on the golden fixture | the bw≥3.0 / bf≥0.65 gates too conservative for the golden OBs (the documented Phase-4 gap) | the operator's drawn BoM levels exist but the machine's map lacks them — the agent STEP A would reason over a map missing the base camps | HIGH |
| F10 | The 3 lost mirror.ts fixes | computeGoldenSL_V452 + GOLDEN_FLOOR, weekProbeAtAnchor, classFlexibleLQZFallback + the GU distribution loop — lost in the wipe, NOT re-ported into the current mirror.ts | the v4.5.2-E2-cascade fork dropped them; BUILD_STATE.md:127 falsely claims they're present | the golden 4p SL floor, the LMV candle-wick probe scan, and the GU anchor-pool distribution are absent | HIGH |
| F11 | The six lexicons unwired | the PLUTUS_V4.5.4_LEXICON_SPEC.md (301L) defines the machine form (TradingLexiconRule / PatternFamily / two-phase enforcement) — no consumer reads them | the lexicons were spec'd in parallel with the chain build; the wiring was never done | the semantic intent layer (the operator's "pressure mechanics = semantic intent") does not exist in code — the machine classifies without the psychology | CRITICAL |
| F12 | The LQZ 1H lookback conflict (P0) | the T2 spec says sweepLookback 1H = 12; the Bible 4.5 T1 wiring says SWEEP_LEVEL_LOOKBACK_BARS 1H = 24 | two canon docs, two values | the telescoping T1 wiring silently changes sweep detection materially | HIGH (resolve FIRST) |
| F13 | The zone-width discrepancy | the golden-standard reference: 4H zones 30-80 pips; Bible Law 2: 4H 15-40 — uniformly tighter | the 38-trade reference vs the canon law table | the SL geometry (Law 9: SL = zone width + buffer) computes systematically different SLs | MEDIUM |
| F14 | The RWL/WL doctrine contradictions | the shape-zone reference: RWL = 6+ ALWAYS + WL all-same-color; the operator's golden doc: RWL "often 1-2 large fat aggressive fast candles", WL can be 4-6 mixed-color candles | the distilled canon vs the operator's first-hand definitions | the E2 classifier misclassifies the operator's observed variants; the agent STEP B reads a wrong shape | MEDIUM (resolve for the E2 work) |
| F15 | The shadow secrets chain boundary | the OPENCODE_API_KEY lives in ~/.bashrc (67 chars) — the shell-session boundary broke the key resolution mid-build (SLOP-06) | the env→.env→embedded chain's first link is the shell session | the shadow (and any agent-side call) cannot resolve the key in a fresh session without the export | MEDIUM (dies with the shadow) |
### 1.2 The substrate failures (E1/E2/lexicons)
The target is the T1 architecture restored + the v4.5.4 reasoning chain inserted as TWO explicit agent reasoning steps in the E1/E2/E3 flow — with the machine computing everything and the PRIMARY agent deciding everything, in-session, visible.

```
┌──────────────────────────────────────────────────────────────┐
│  TARGET — THE AGENT-IN-THE-LOOP E1/E2/E3 PIPELINE             │
└──────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │ 1 harvest — OHLC 4H/1H/30m/15m (the temporal anchor)        │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ 2 zones (E1)  ◄── T1-T6 telescoping wired                   │
  │              ◄── LMV resolution (modal-cluster, 1p dedup)   │
  │              ◄── OBCV (the 4 sub-engines)                   │
  │              ◄── lexicons 1·3·4 classify the zone map       │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ▶ AGENT REASONING STEP A  (between E1 and E2 — NEW)         │
  │    the agent READS the zone map + pressure state + the      │
  │    lexicons' classifications → the E2 ZONE DESIGNATION      │
  │    ("Monday's path visits supply zone X at 1.14544")        │
  │    ─ the reasoning is VISIBLE in the stream, in-session     │
  └──────────────────────────────┬─────────────────────────────┘
                                 ▼   ← the designation is the
  ┌────────────────────────────────────────────────────────────┐  contracted input
  │ 3 shapes (E2)  ◄── lexicon 5 (shape-chain + unified macro)  │  of the E2 tool,
  │    the shape chain BUILT ON the designated zones            │  validated by the
  └──────────────────────────────┬─────────────────────────────┘  mechanical firewall
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ ▶ AGENT REASONING STEP B  (between E2 and E3 — THE CHAIN)   │
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
  │ 4 setups (E3)  ◄── lexicon 6 (obvious-trades baseline)      │  of the setups tool,
  │    resolves the projections' anchors (E3-NEVER enforced)    │  validated by
  └──────────────────────────────┬─────────────────────────────┘  assertProjectionContract
                                 ▼
  ┌────────────────────────────────────────────────────────────┐
  │ 5 report + the W6 golden gate (G1-G10)                      │
  │    the convergence table per emission (D4) · ≤3p tolerance  │
  │    G9 wall ≤5min · G10 parallel-equivalence                 │
  └────────────────────────────────────────────────────────────┘
```

**The T1 mechanics restored (each is a hard requirement):**
1. **Output-contracted args** — the E2 tool's args REQUIRE the STEP A designation (the zone ids, validated against the E1 zone map); the setups tool's args REQUIRE the STEP B projections (validated by `assertProjectionContract`). Fabricated/skipped reasoning = BLOCKED.
2. **The NEXT instruction** — every tool's output ends with `NEXT: AGENT REASONING STEP <A|B> — analyze <what> and call <next tool> with <your conclusions>`.
3. **The mechanical firewalls** — the file-existence layer (fs.access on any evidence file), the semantic layer (the designation ids must exist in the zone map; the projections' anchors must trace), the format layer (the numbers, the order).
4. **The agent IS the reasoner** — the primary agent's own context does the analysis; no external model call anywhere (T1 §8.2's SDK bridge replaced by the agent's native reasoning in-session).

**The division of labor (the operator's law):** the MACHINE computes (the deterministic tokens, the zone map, the lexicons' classifications, the ledger, the validation); the AGENT decides (the zone designation in STEP A; the forward-position, the chaining read, the anchor construction, the validation judgment in STEP B). E3 is a natural result of E1+E2 done properly — the agent's reasoning over the machine's correct output IS the "done properly" part.

## §2 THE FIX PLAN
### 2.1 The target architecture
**The purpose:** the operator's doctrine — "The E2 shape chain must produce ZONE-LEVEL projections ('Monday's projected path visits supply zone X at level 1.14544', not 'Monday is SS with bearish bias')". The agent reads the E1 zone map and designates the zones the E2 shape chain will build on. This replaces the E2's blind "curate top-20 by confluence" with a reasoning-informed designation.

**The tool contract (the E1 → E2 gate):**

```typescript
interface StepADesignation {
  pair: string;                       // 'DXY' | 'EUR/USD' | 'GBP/USD'
  day: string;                        // 'Mon'..'Fri' — the shape chain's day
  zoneId: string;                     // MUST exist in the E1 zone map (the firewall)
  role: 'SUPPLY' | 'DEMAND' | 'LQZ';  // the zone's element
  classification: 'BoM' | 'MoM' | 'LQZ';
  rationale: string;                  // the agent's visible reasoning (the story)
  pressureRead: string;               // the lexicon-4 lifecycle state the agent read
}

// the tool: plutus-pipeline-reason-step-a
//   args: { weekStart, designation: StepADesignation[] }  — min 1 per pair per day
//   FIREWALL: every zoneId ∈ the E1 zone map (fs + map lookup — BLOCKED if invented)
//   FIREWALL: every rationale ≥ 40 chars with a price reference (the T1 format layer)
//   OUTPUT: { status, designation, nextStep: 'call plutus-pipeline-shapes with this designation' }
```

**The agent's STEP A reasoning sequence (visible in the stream):**
1. Read the E1 zone map (the telescoped zones + the lexicons' classifications + the pressure states).
2. Read the macro narrative first (the operator's Step 1: the 4H BoM supply/demand storyline).
3. Designate per day: which zone the shape chain's path will visit, at what level, with the pressure read (the confluence/ZFP/BoM-MoM/reaction-count/absorption).
4. Emit the designation array — the contracted input of the E2 tool.

**The pseudocode (the E2 tool's consumption):**

```
plutus-pipeline-shapes (weekStart, designation[]):
  ctx = ensureContext(weekStart)
  FIREWALL: designation.zoneId ∈ ctx.zoneMapSnapshot.zones  → BLOCKED if not
  FIREWALL: designation.rationale has a price reference      → BLOCKED if generic
  shapeChain = ShapeBrain.compute(ctx.zoneMapSnapshot, designation)
  shapeChains = { dxy, eu: cascadeShapeChain(dxy, inverted), gu: cascadeShapeChain(eu, kept) }
  ctx.shapeSnapshot = shapeChains
  return { status, shapeChains, nextStep: 'AGENT REASONING STEP B: read the shape chain and call plutus-pipeline-reason-step-b with your TradeProjections' }
```

**The done-when for STEP A:** a container/host run shows the agent's designation in the stream with real zone ids + the pressure reads; the E2 tool accepts it; a fabricated zoneId returns BLOCKED.
### 2.2 The STEP A contract (E1 → E2 reasoning)
**The purpose:** the 11-token reasoning chain becomes the explicit STEP B between E2 and E3. The machine computes the deterministic ledger (tokens 1-7 + 9); the PRIMARY AGENT performs the judgment tokens (8, 10, 11) in-session; the machine validates (WARN + refine ≤3 per D2). The output = the TradeProjections the E3 tool consumes.

**The tool contract (the E2 → E3 gate):**

```typescript
// the tool: plutus-pipeline-reason-step-b
//   args: { weekStart, projections: TradeProjection[] }  — the agent's reasoned output
//   FIREWALL (the machine, AFTER the agent's turn):
//     · forwardPosition is a number            → else GROUNDING_WARN (D2), refine
//     · entry/sl/tp are numbers, direction-ordered (E < SL < TP for LONG,
//       E > SL > TP for SHORT)                 → else GROUNDING_WARN, refine
//     · chosenTarget ∈ the CLOSED continuationTargets set → else GROUNDING_WARN
//     · every anchor traces: e1ZoneId ∈ the E1 map ∧ e2ProjectionId ∈ the E2 chain
//                                             → else CONTRACT_VIOLATION (hard after 3)
//   OUTPUT: { status, projections, ledger, warnings, nextStep: 'call plutus-pipeline-setups with these projections' }
```

**The 11-token split (the machine vs the agent):**

| Token | The computation | Who | The mechanics |
|---|---|---|---|
| T1 zone-identification | the operative zone + the phantom-BoM exemption (`if MoM ∧ reactionCount===0 ∧ findFortressDemand(...).id===zone.id → PHANTOM_BOM/EXEMPT; else DEATH`) | MACHINE | the zone-classification lexicon's output |
| T2 pressure-status | zonePressureSide + lifecycleScore | MACHINE | the candle-pressure + zone-pressure lexicons |
| T3 liquidity | the LMV rungs below/above + the nearest rung | MACHINE | the lmvTable + the resting-side |
| T4 break-validation | close-beyond = BROKEN · wick-reclaim = UNBROKEN · untouched = UNBROKEN virgin | MACHINE | the bars ≤ anchorMs |
| T5 strength-comparison | buyImpulse vs sellImpulse over the 3-day window | MACHINE | the recency law |
| T6 reaction-count | zone.reactionCount; ≥3 → the third-mitigation doctrine | MACHINE | the battles, not the bars |
| T7 chain-progress | stage = shape · dir · remaining = 5 − dayIndex | MACHINE | the E2 chain + the unified macro authority |
| T8 forward-position | the deterministic candidate + THE AGENT's read: "the short is halfway to the demand — the reaction WILL happen" | **THE AGENT** | the forwardPosition + chosenTarget + the verdict |
| T9 chaining | Law 27: the TP of N = the entry of N+1 — SYNC | MACHINE | priorTp across the lanes |
| T10 anchor construction | the machine's candidates + THE AGENT's construction: E/SL/TP as checkable numbers + the anchors | **THE AGENT** | the E2-projected opposing zone + the ladder-steps SL + the strength-driven TP edge |
| T11 validation | the mechanical floor (the authority) + THE AGENT's confidence judgment; refine/retry ≤3 | **THE AGENT** + MACHINE | the WARN semantics (D2) |

**The TradeProjection contract (the E3 input — data, never prose):**

```typescript
interface TradeProjection {
  pair: string; day: string; shape: ShapeCode; direction: 'LONG' | 'SHORT';
  entryZoneId: string; entryLqzId: string;
  E: number; SL: number; TP: number; RRR: number;      // the checkable anchors
  pressureRead: ZonePressureState;                     // the lifecycle/zfp/fortress/absorption
  chainContext: string;                                // the shape-chain position
  validation: ValidationSignal;                        // the break-validation + the strength + the confluence
  confidence: number;                                  // pos/(pos+neg+1)
  anchors: Array<{ e1ZoneId: string; e2ProjectionId: string }>;  // E3-NEVER compliance
}
```

**The STEP B flow (the agent's visible reasoning):**
1. The machine runs tokens 1-7 + 9 → the ledger is PRESENTED to the agent in the tool result.
2. The agent reads the ledger + the E2 storyline + the zone map → performs T8 (forward-position), T10 (the anchor construction), T11 (the validation judgment) — its reasoning visible in the stream.
3. The agent emits the projections via the tool args.
4. The machine validates (the firewalls above): violations → GROUNDING_WARN → the agent refines (≤3) → the hard-throw to the failure store after 3.
5. The projections pass to the E3 tool.

**The done-when for STEP B:** a run shows the agent's forward-position/anchor reasoning in the stream; the machine's WARNs fire on a deliberately-bad projection (the D2 test); a projection with an invented anchor id is hard-thrown after 3; the E3 tool accepts the contract-clean projections.
### 2.3 The STEP B contract (E2 → E3 reasoning — the 11-token chain)
**The retirement:** shadow-agent.ts's LLM fetch path is DELETED as the executor. The C2 machinery (the frozen model, the SSE idle detector, the secrets chain, the encoded errors) is preserved as the REFERENCE PATTERN for the agent-side calls, but no code path calls an external model for the reasoning. The SHADOW_REWIRE_SPEC (HANDOVER_PACKAGE_4.5.4/SHADOW_REWIRE_SPEC.md, 506L) is the rewire authority.

**What remains of the shadow (the contract shape only):**
- The token 8/10/11 HOOKS become the agent-facing interface — the deterministic skeleton + the candidate values the agent refines.
- The `SHADOW_MODEL` freeze, the `SHADOW_*` error taxonomy, the secrets chain — all archived as reference, never invoked.
- The failure store's taxonomy keeps `SHADOW_DEGRADE` for backward compatibility but the live rows become `GROUNDING_WARN` / `REFINEMENT_EXHAUSTED` / `CONTRACT_VIOLATION` / `MACRO_DIVERGENCE`.

**The grounding WARN semantics (D2 — the operator's law, verbatim):**

```
GROUNDING_WARN (the machine's validation of the agent's output):
  trigger: forwardPosition non-numeric · entry/sl/tp non-numeric ·
           E/SL/TP out of direction-order · chosenTarget ∉ the CLOSED set ·
           an invented zone/projection id
  action:  the WARN row { check, tokenId, sourceRef, value, proposedCorrection }
           → the failure store (GROUNDING_WARN) → the agent loop CONTINUES
           with the WARN as the refinement input
  hard:    ONLY after 3 failed refinements → REFINEMENT_EXHAUSTED →
           the hard-throw → the store → the end-of-diag synthesis
  NEVER:   a first-violation hard-kill · a crash · a silent drop
```

**The failure-store contract (unchanged from the L2, live rows):**

```typescript
// MASTER_CONTEXT/plutus-reasoning-failures.db — chain_failures
// id · component · reason ∈ {GROUNDING_WARN, REFINEMENT_EXHAUSTED,
//   CONTRACT_VIOLATION, MACRO_DIVERGENCE} · context(JSON) · attempts ·
//   timestamp · week · pair — indexes on week + reason
// recordFailure degrades to the append-only fallback row when bun:sqlite
//   is unavailable — NEVER silently drops (L2:1582)
```
### 2.4 The shadow removal + the grounding WARN (D2)
The agent's STEP A/B reason over the machine's zone map — the map must be CORRECT first. Three engines finish the E1 substrate (Bible 4.5 phases 2-4), then the 3 lost mirror.ts fixes re-port.

### 2.5.1 The telescoping wiring (T1-T6 — Bible 4.5 §12.3, the insertion points)

**RESOLVE FIRST (F12/P0): the LQZ 1H sweepLookback — the T2 spec says 12, the Bible T1 says 24.** The resolution rule: the live lobe uses the T2's LQZ_CONFIG_BY_TF table for the detector thresholds (the operator's "exact criteria" reference), and the Bible's T1 constants are reconciled against it — the 1H sweep lookback is 12 per the T2 config (the SWEEP pattern's prior-high/low window over the 1H bars), with the Bible's 24 recognized as the LQZ-alignment lookback (a different window — documented, not merged). The wave-1 build documents the choice at lqz-lobe.ts:117 and runs the golden-LQZ oracle (7/7 DXY ≤1 pip) to prove it.

| Module | The change | The file:line anchor |
|---|---|---|
| T1 | lqz-lobe.ts gains the `timeframe` param; the TF-scaled thresholds (SWEEP_LEVEL_LOOKBACK_BARS, SWEEP_MIN_BEYOND_PIPS, LONG_WICK_MIN_PIPS, SHARP_MOVE_MIN_PIPS, LQZ_ALIGN_TOLERANCE_PIPS per the T2 per-TF tables) | lqz-lobe.ts:264-269 |
| T2 | the 4H→1H S/D nesting pass: every 1H zone ⊆ same-type 4H zone → the refinement tag + the confluence (+3 dual-TF / +5 triple-TF) + the active-edge refinement; `refinedLabel` + `nestedWithin` on ZoneModel | ob-engine.ts:348, engine.ts:479-481 |
| T3 | the 1H→30m minor refinement: 30m zones ⊆ 1H zones (same type) refine the minor edge; tag "30m Refined 1H" | ob-engine.ts:346 |
| T4 | the 30m MoM-only gate: bom-mom.ts returns 'MoM' for tf 30m/15m; ob-engine.ts forces MoM for 30m; 4h-sd-lobe.ts gates `isBoM = tf !== '30m' && tf !== '15m'`; shape-brain.ts:608 delivers the 30m MoM zones to E2 as the SS/R reaction points | bom-mom.ts:79-106, ob-engine.ts:339-344, 4h-sd-lobe.ts:147-149, shape-brain.ts:608 |
| T5 | the LQZ 1H→30m→15m runs: `detectLiquidityZones(pair, bars30m)` + `(pair, bars15m)` + the nested-refinement merge before/within mergeLqzWithIpZones; the matrix tiers threaded | engine.ts:472-480, mdve/index.ts:161-178 |
| T6 | the zone-map snapshot merge: after ctx.chartModelsByPair is built, the T2/T3/T5 refinements run on ChartModel.zones and merge into zonesByPair/snapshot (propagates to report-v452 via ChartModel.zones) | engine.ts:517-524, :546 |

**The telescoping acceptance gate:** the 7 golden DXY levels (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240) appear in the map COMPUTED from the week's own data — no hardcoding, no fixture injection; 30m zones are NEVER BoM; 15m zones exist in the map.

### 2.5.2 The LMV resolution (lmv.ts + lqz-matrix.ts — MUTABLE prototypes until the oracle passes)

| The fix | The mechanism | The target |
|---|---|---|
| The modal-cluster emission | the emitted rung = the MODAL reaction level of the cluster (the highest-density bucket), not the prominence-weighted mean — the center-drift kill | 101.19 emits at ~101.19, 101.235 at ~101.235 |
| The 1-pip LQZ dedup | the ladder dedup floor drops from 3 pips to 1 pip (`< 1·pip` strict) | the 0.5-pip pair 101.235/101.240 BOTH survive as distinct rungs |
| The sweep-bonus inversion | the computeLmvTP significance: swept rung = liquidity TAKEN → DEMOTE −30, not PROMOTE +50 (mirror.ts:1554) | the GU TP stops landing one rung too shallow (RRR 1.30 → the floor) |
| The matrix→model.zones bridge | the matrixLadderRungs adapter exposes the LMV rungs in model.zones — the mirror anchor search sees them as candidates (the bridge-gap kill, Bible 4.0:2647) | the E2 cascade's bestGroup sees the golden VIOLATED zones |
| The telescoped multi-TF LMV runs | the 30m/15m telescoped runs feed the matrix tiers (per the 2026-07-31 ruling) | the 3-pip pairs (100.945/100.975) resolve distinct |

**The LMV acceptance gate:** 7/7 golden DXY LQZs at ≤1 pip (diag-lmv-golden) + the 48-zone-matrix LmvTable spans [98.751, 101.800] for the golden week.

### 2.5.3 The OBCV machine (obcv.ts — the 4 sub-engines, Bible 4.5 §16)

1. **Sub-engine A — the ATR-normalized displacement field D:** `body ≥ 1.5×μ_body(prev 4)` ∧ `|close−open| ≥ 1.5×ATR14(i)` (the rolling ATR NEVER includes the impulse bar — the v4.4 Bug-3 lesson) ∧ `D_t(i,k) ≥ θ_tf` (4H 50p/18b · 1H 30p/36b · 30m 15-20p) ∧ structureBroken.
2. **Sub-engine B — the origin-candle feature matrix F:** `[bw, bf, rng, dir, prior]`; `isBoM ⟺ bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate(t)` (the 4H 15-40 / 1H 8-25 / 30m 5-15); the zone = the origin candle's FULL high-low.
3. **Sub-engine C — the prior-move classifier:** NONE (dwell ≤ 0.5×ATR, drift < 0.25×ATR) / OPPOSITE / SAME via the signed ATR-normalized displacement sums — BoM = NONE|OPPOSITE, MoM = SAME, else REJECT (piecewise-total).
4. **Sub-engine D — the telescoping incidence matrix T:** `T[parent][child] = 1 ⟺ child ⊆ parent ∧ tf(child) < tf(parent)`; a 30m OB REQUIRES a 1H parent (orphan → REJECT); 1H may refine 4H.
5. **The firewall invariants:** `|BoM| + |MoM| == |deduped|` (the partition) ∧ `∀ z30m: parent != null` (the nesting) ∧ `∀ z: widthGate(z)`.

**The OBCV acceptance gate:** the golden reconstruction from data alone (1H BoM demand 100.68-100.73 · 4H BoM supply 101.235-band · 1H MoM demand 100.845) + 96%+ agreement vs the operator's drawn OB map.

### 2.5.4 The 3 lost mirror.ts fixes (re-ported per Bible 4.5 §9.1)

| The fix | The mechanism | The source |
|---|---|---|
| computeGoldenSL_V452 + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK | the 4-stage golden SL pipeline: computeSL_LMV → PROBE_GUARD + the wick-clear → the GOLDEN_FLOOR (GOLDEN_SL_MIN_PIPS=4; the sub-floor SL walks to the next defended rung in [4p, 9.5+buffer]) → the selective util guard (util ≥ 0.40 → KEEP, else PROBE_GUARD) | mirror.ts:2417-2536 (v4.5.5_PRISTINE_CORE) |
| weekProbeAtAnchor | the deepest adverse probe at the anchor within the model week — the LMV candle wicks reaching INTO the anchor band ARE adverse anatomy | mirror.ts:2328-2381 |
| classFlexibleLQZFallback + the GU distribution loop | the §8.1 union pool (the LMV rungs join the OB-class candidacy at group −1.5 with the recency gate) + the distribution deadlock fix (`usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror) | mirror.ts:1213/:1324/:1858 + :2123-2131 |
### 2.5 The E1 math engines
The operator's mapping is the law: "zones/candles = regex · pressure mechanics = semantic intent · shape chains = semantically intelligent algorithmic systems · E1/E2/E3 pipeline = the deep-planning orchestration · trade setups = tool outputs." The six lexicons ARE the semantic intent layer. Each takes the IntelligenceLexicon machine form and wires at its enforcement point:

```typescript
interface TradingLexiconRule {
  id: 'candle-pressure' | 'candle-shape' | 'zone-classification' | 'zone-pressure' | 'shape-chain' | 'obvious-trades';
  families: TradingPatternFamily[];          // suggestive/descriptive/substitute/use predicates
  classify(input: LexiconInput): LexiconResult;  // {intent, confidence, action}
  enforce(result: LexiconResult, phase: 'A' | 'B'): void;
  escapeHatchTool: string;                   // never blocked
  escalationThreshold: number;               // 3 → the problem-solving dispatch
}
// confidence = pos/(pos+neg+1) · decision = pos > neg ? classify : reject
// every predicate deterministic (the MPSE Losslessness — fuzzy prose = derailment)
```

**The wiring points (the lexicon → the consumer):**

| Lexicon | The consumer | The enforcement point | The key family |
|---|---|---|---|
| 1 candle-pressure | the LMV side vote (lmv.ts:618-645) + the zone-pressure lifecycle | Phase A: a PASS_THROUGH counted as a reaction → THROW at the lmv.ts boundary; Phase B: the touch-kind demand on the matrix row | defend / reject / sweep / dwell / pass |
| 2 candle-shape | the E2 per-day shape classification (shape-brain.ts:331/:890) | Phase A: a day the lexicon classifies BS but E2 says PBS → THROW at the E2 boundary; Phase B: the shape demand on the day decomposition | ss / bs / wl / rwl / r / wls |
| 3 zone-classification | the E1 zone typing + the E2 death-rule exemption | Phase A: a phantom-BoM the virgin-MoM rule rejects → THROW at the E2 boundary (the death-rule exemption demand); Phase B: the PHANTOM_BOM flag on the classification | bom / mom / **phantom-bom** / fortress-bom / ip |
| 4 zone-pressure | the E2 designation (the pressureScore +40 VIRGIN-BoM / −30 DEPLETED / +20 FORTRESS) + the E3 SL-relevance switch | Phase A: a DEPLETED zone treated as ENTRY-PRIMARY → THROW; Phase B: the lifecycle demand on the pressure state | virgin / virgin-death-scope / tf-hierarchy / active / depleted / fortress / broken |
| 5 shape-chain | the E2 chain + the unified macro authority (the DXY's chain for the EU, the EU core's for the GU) | Phase A: a day diverging from the macro authority without a documented pair mechanic → THROW at the E2 boundary; Phase B: the authority-override demand | ss-to-bs / bs-to-r / bs-to-rwl / r-to-wl / wl-to-ss / micro-vs-macro |
| 6 obvious-trades | the STEP B's token baseline (the operator's EU #1/#2 logic verbatim) | Phase A: a projection whose E/SL/TP are not traceable → THROW (the E3-NEVER); Phase B: the projection demand on the E3 output | zone-identification / pressure-mechanics / shape-chain-context / forward-position / anchor-construction / validation / strength-comparison / reaction-count-state |

**The phase semantics:** Phase A = the E1/E2/E3 boundary THROW (a hard violation — the phantom-BoM reversal, the macro divergence); Phase B = the OUTPUT MUTATION (the classification demand appended to the stage's output — the audit trail). The escape hatches: the token-4 break-validation (with the real close/claim sequence) + the token-11 validation (with the real E2 evidence) — a legitimate operator-drawn setup is NEVER blocked.

**The phantom-BoM exemption (the all-4 predicate — the operator's fortress):**
```
PHANTOM_BOM ⟺ (1) the LARGE-OB width predicate (the SMC ratio-based width)
           ∧ (2) the mid-swing-recovery + the FAKEOUT predicate
           ∧ (3) the pre-formation opposing-BoM reaction predicate
           ∧ (4) the macro-origin continuation (the KCE-Telescoping full swing)
3-of-4 → the DEATH rule stands (conservative) · the type-1 virgin MoM's full
signature (small OB + uninterrupted BS/WL + mid-move) → DEATH always
```
The shape-brain.ts line for the exemption edit MUST be verified first (F6: the L2 cites :2330-2336, the handover :1150).
### 2.6 The six lexicons wired
The E3 precision = the operator's anchor doctrine made mechanical. The RRR is a CONSEQUENCE (D3). The fixes:

**2.7.1 The TP substrate (the SLOP-01 / D37-class kill):**
- `reasoning-chain.ts:789-790` — the ratio-extension fallback REMOVED as a TP source. No code path computes a TP to hit a target RRR.
- ZR-3.3 — the E2-projected opposing zone's FULL-MODEL resolution: the computeLmvTP shapeDay path resolves the OB-id-vs-LMV-candidates mismatch — the TP = the opposing rung's defendedEdge where the E2 shape day's projected opposing zone EXISTS (the full-model LQZ resolution, not the nearest-first fallback).
- ZR-3.4 — the E1-pressure wall classification in the cap-walk: the "fresh wall" predicate uses the BoM/MoM + the 6D confluence + the Earth+Fire — NOT the candle-count zfp≤20 ladder (the D37 derailment).
- The computeLmvTP sweep-bonus inversion (−30 for a swept rung) — see 2.5.2.

**2.7.2 The ladder-steps SL (the operator's rule, verbatim):**
> "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps."
- The SL = 3p OUTSIDE the far edge of the current entry step OR 1-2p INSIDE the close edge of the NEXT STEP away (SHORT → the next step UP; LONG → the next step DOWN).
- The RELEVANT zone chosen by the pressure state (the trade #4's switch: the LQZ eaten → the DEMAND zone becomes the operative defense) — the zone-relevance switch wired via the zone-pressure lexicon's lifecycle.

**2.7.3 The strength-driven TP edge (the operator's rule, verbatim):**
> "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction... exit on the closest zone edge and even potentially add a 1-2 pip spread... Weak pressure zones = delayed reaction. Maximize the profits you catch."
- STRONG zone (BoM / high confluence / fortress) → the CLOSE edge + the 1-2 pip spread.
- WEAK zone (virgin MoM / low confluence) → the FAR edge.

**2.7.4 The entry refinements (the convergence push — STEP 6):**
- The GU Monday's demand pick at the operator's 1.33330 (the current emission's demand 1.33270 = Δ6.0p → the near-edge refinement to ≤3p).
- The 4 misses: EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p — each traced to the anchor choice (the LQZ near edges, the ladder-steps SL, the strength-driven TP) and refined on the SAME zone anchors (the 3-attempt refinement machine, never a new zone).
- The chaining preserved: the TP of N = the entry of N+1 (Law 27) across the lanes.

**2.7.5 The E3-NEVER enforcement (unchanged, absolute):**
`assertProjectionContract` throws on: an anchor-less projection · E/SL/TP out of direction-order · the entry outside `[floor, ceiling]` of its e1Zone (CLUSTER_TOLERANCE_PIPS = 2) · rrr < 1.0 (a refinement warning, not a hard error) · confidence outside [0,1]. A violation = the pipeline error → the hard-throw → the store → the synthesis — never silently dropped, never auto-credited an anchor.
### 2.7 The E3 precision (the TP substrate + the anchors)
The T1 mechanics restored in the tool registry (engine.ts):

**2.8.1 The context (unchanged, the T1 pattern):**
```typescript
interface PipelineRunContext {
  weekStart: string; temporalAnchor: number; startedAt: number;
  harvestData: { ohlc: Record<string, OHLCBar[]>; ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>; spots: Record<string, number> } | null;
  zoneMapSnapshot: { zones: DXYZone[]; spots: Record<string, number>; version: number } | null;
  shapeSnapshot: ShapePredictionSnapshot | null;
  stepADesignation: StepADesignation[] | null;      // NEW — the STEP A output
  projections: TradeProjection[] | null;            // NEW — the STEP B output
  screenshots: Array<{ pair: string; timeframe: string; path: string }>;
  validatedZones: any[]; errors: PipelineError[]; setupCounter: number;
  manualStepOutputs: Record<string, unknown>;       // the T1 pattern retained
}
// ensureContext(weekStart) · resetContext() at the chain's end
```

**2.8.2 The tool registry (the 7-tool chain — the D5 pipeline):**

| # | Tool | The contracted input | The firewall | The output's NEXT |
|---|---|---|---|---|
| 1 | plutus-pipeline-harvest | weekStart | the temporal anchor | NEXT: AGENT REASONING STEP A — read the zone map, designate the E2 zones |
| 2 | plutus-pipeline-zones (E1) | the options data (the legacy manual step) | fs.access + the semantic vision + the format | the zone map + the lexicons' classifications + NEXT: STEP A |
| 3 | plutus-pipeline-reason-step-a | weekStart + designation[] | every zoneId ∈ the zone map · the rationale has a price reference | the designation + NEXT: call plutus-pipeline-shapes |
| 4 | plutus-pipeline-shapes (E2) | weekStart + the designation (from the context or the args) | the designation validated | the shape chains + the storyline + NEXT: STEP B |
| 5 | plutus-pipeline-reason-step-b | weekStart + projections[] | the grounding WARN set (D2) + the contract assert | the projections + the ledger + NEXT: call plutus-pipeline-setups |
| 6 | plutus-pipeline-setups (E3) | weekStart + the projections (from the context) | assertProjectionContract (E3-NEVER) | the setups + the report path + resetContext() |
| 7 | plutus-pipeline-gate | weekStart | — | the G1-G10 verdicts (the W6 diag) |

**2.8.3 The allowlist:** `plutus-` prefix already allowed; the two new tools register under it — no allowlist change needed.

**2.8.4 The data flow (the agent's visible loop):**
```
harvest → zones → [STEP A: the agent reads the map, designates] → shapes
        → [STEP B: the machine ledger 1-7/9 → the agent reasons 8/10/11
           → the machine validates (WARN+refine ≤3)] → setups → gate
The agent's STEP A/B reasoning appears IN THE STREAM — the operator sees everything.
```
### 2.8 The pipeline wiring (the T1 mechanics)
The waves execute SEQUENTIALLY (each gates into the next) with DISJOINT file sets per build agent (one builder per file — the deep-planning red flag). The dispatch plan (the templates + the fills) is in APPENDIX B.

| Wave | The work | The files (disjoint sets) | The template | The gate |
|---|---|---|---|---|
| W0 | The state verification + the line-conflict resolution | the code inventory + shape-brain.ts's actual phantom-BoM line (F6) + the LQZ lookback verification (F12) | E1 (explore) ×1 | the inventory + the resolved line numbers |
| W1 | The E1 math engines | A: ob-engine.ts · 4h-sd-lobe.ts · bom-mom.ts · lqz-lobe.ts · shape-brain.ts (T1-T4) · engine.ts (T5-T6) · mdve/index.ts — B: lmv.ts · lqz-matrix.ts (the LMV resolution) — C: obcv.ts (the OBCV) | B3 ×2 (surgical: telescoping + LMV) + B1 ×1 (build: OBCV) | the 7 golden DXY LQZs ≤1 pip · the golden OB reconstruction · tsc 0 · the frozen pair byte-identical |
| W2 | The 3 lost mirror.ts fixes + the sweep-bonus inversion | mirror.ts (one agent — the fixes + the −30 inversion together) | B3 ×1 | the golden SL floor (4p min) · the weekProbeAtAnchor probes · the GU distribution ≥8 distinct anchors · tsc 0 |
| W3 | The six lexicons wired | the lexicon module (new: src/mdve/lexicons/) + the wiring points (lmv.ts side-vote · shape-brain.ts · mirror.ts relevance · reasoning-chain.ts) | B1 ×1 | every lexicon's classification consumed · the phantom-BoM all-4 predicate tested on the golden fixture · tsc 0 |
| W4 | The shadow removal + the grounding WARN | shadow-agent.ts (the fetch retired → the contract shape) · reasoning-chain.ts (the WARN semantics + the TP substrate 2.7.1) | B3 ×1 | a deliberate bad projection → GROUNDING_WARN, never a hard-kill · the loop continues · the EU/GU RRRs NOT all 2.50 · tsc 0 |
| W5 | The STEP A/B tools + the pipeline wiring | the new tools (pipeline/engine.ts: step-a, step-b, the gate) + the context fields + the firewalls | B1 ×1 | the designation contract · the projection contract · the NEXT instructions · the firewalls' BLOCKED paths · tsc 0 |
| W6 | The E3 precision (2.7.2-2.7.4) | reasoning-chain.ts (the ladder-steps SL + the strength-driven TP edge) + setup-gen.ts (the entry refinements) | B3 ×1 | the golden hits ≥2/5 → toward 5/5 · the EU LONG Δ0.8p held · tsc 0 |
| W7 | The W6 golden gate + the canon docs | diag-reasoning-chain-golden.ts (NEW) | B4 ×1 | G1-G10 · the wall time ≤5 min · the determinism ×2 · the build report ENTRY 6 · DECISION_CHAIN D62 |

**The wave discipline (every wave):** `bunx tsc --noEmit` = 0 · `bun build` = success · the frozen pair sha256 byte-identical · the diag exit 0 · the diff review of EVERY changed line (the WHAT/WHY/HOW verdict) · the wave audit recorded at .trident/wave-audit/ · the canon docs updated (the DEBUG_LOG + the BUILD_REPORT — append-only, at every milestone).

## §3 IMPLEMENTATION ORDER
**THE OPERATOR'S TESTING DIRECTIVE (verbatim intent):** "when it is ready i will deploy the full plutus agent as a subagent on host so we can test directly in this session and not waste time on container garbage."

**The host-based test loop (the ONLY testing path — no container):**
1. The operator deploys the FULL plutus agent as a subagent on host (the task tool — D6: the task tool is the ONLY spawn path).
2. The deployed agent runs the diag harnesses DIRECTLY on the host: `bun diag-reasoning-chain-golden.ts --day=2026-07-06` · `bun report-v452.ts` · `bun diag-lmv-golden.ts` · `bun diag-obcv-golden.ts` — the fixture at /tmp/opencode/bars_raw.json.
3. The agent's STEP A/B reasoning is observed IN THE STREAM (the TUI session) — the operator sees every designation and every projection's reasoning.
4. The per-wave gates run on the host with the zero-trust battery below.

**The zero-trust battery (every claim, every wave — the evidence gate):**
```
· bunx tsc --noEmit          → 0 errors
· bun build                  → success
· sha256sum the frozen pair  → sl-lmv 912940832fac44bc · trade-dedup 33914c897e777540 (byte-identical)
· the diag exit 0            → the per-gate verdicts
· the report determinism     → sha256 report_v452.md ×2 identical
· the golden-convergence     → the per-emission delta table (never a bare claim)
· the wall time              → G9: ≤ 5 min for the Monday diag
```

**The adversarial test scenarios (per the runtime-grade law — happy paths are forbidden):**

| # | The scenario | The pass token | The fail token |
|---|---|---|---|
| A1 | A deliberately bad projection (entry/sl/tp strings, invented zone id) sent to STEP B | the GROUNDING_WARN fires + the loop continues + after 3 → the store row | a first-violation hard-kill / a crash |
| A2 | The ratio-extension removal: the EU/GU lanes with a null computeMirrorTP | the TPs resolve structurally (the RRRs NOT all 2.50) | any TP computed to hit 2.5 exactly |
| A3 | The temporal gate (the G8 negative control): an anchor later than ANCHOR_MS | the anchors unchanged | any bar beyond ANCHOR_MS read |
| A4 | A fabricated STEP A designation (zone id not in the map) | the firewall BLOCKED | the designation accepted |
| A5 | The parallel-equivalence (G10): the parallel run vs the sequential | the projections byte-identical | any drift |
| A6 | The phantom-BoM 3-of-4: a zone with 3 predicates, not 4 | the DEATH rule stands (rejected) | the exemption fires on 3-of-4 |
| A7 | The 30-min-hang regression: the wall-time measurement | the Monday diag completes ≤ 5 min | the stall detector kills a working generation |

**The container rule:** the container tests are SKIPPED per the operator's directive — the host deployment IS the runtime test. Any residual container-specific evidence (the browser/VLM paths) is explicitly out of scope for this overhaul's gate.

## §4 TESTING STRATEGY
The theatrical traps specific to THIS overhaul — each with the failure mode + the block:

| # | The trap | The failure mode | The block |
|---|---|---|---|
| AP-1 | The shadow reintroduction | an agent rebuilds an external-model executor "for convenience" — the D1 violation | the code review blocks ANY new external fetch in the reasoning path; the grep gate: `shadow-agent`'s fetch path stays deleted |
| AP-2 | The RRR-as-target sneaks back | a ratio-extension or a TP clamp to hit a floor — the D3 violation | the grep gate on `ratio`/`RRR` computations in the TP paths + the RRR-variety check in the gate |
| AP-3 | The grounding hard-kill returns | a validation that throws on the FIRST violation — the D2 violation | the WARN semantics test (A1) runs every wave |
| AP-4 | The wall-clock timeout returns | any 600s-style cap on the agent's reasoning — the C4 violation | the stall-detector pattern only (the SSE idle window); no wall clock in the reasoning path |
| AP-5 | The sequential LLM calls return | the 24-calls × sequential topology — the C1/C3 violation | the parallel tokens (8/10 Promise.all) + the micro-parallel pair runs stay; the G10 equivalence gate |
| AP-6 | The container theater | claiming "container tested" with no host evidence — the operator's directive | the host-based evidence ONLY; the container claims are the theatrical declaration |
| AP-7 | The golden-fitted claims | the diag thresholds or the fixtures tuned to pass — the TEMPORARY-ARCHITECTURE violation | the golden const stays the measurement oracle ONLY; the pipeline never reads it (the grep gate) |
| AP-8 | The napkin docs | the wave reports as bullet summaries without the WHAT/WHY/HOW verdicts | the wave audit format enforced (the per-hunk verdicts + the coverage map) |
| AP-9 | The scope creep | a builder "fixes" a frozen file or refactors an unrelated module | the frozen pair + the disjoint-file discipline; the diff review blocks anything outside the wave's file set |
| AP-10 | The false "no regression" | declaring no regression on a degenerate baseline (the SLOP-10 class) | the measure is the golden convergence + the RRR authenticity, never the raw emission count |
| AP-11 | The wave-dispatcher spawn | dispatching via anything but the task tool (D6) | the task tool ONLY; verify the sessionId before waiting |
| AP-12 | The agent's claim trusted | a build agent's "it works" without the mechanical battery | the zero-trust battery runs on EVERY return (the orchestrator's own runs, never the agent's) |

## §5 ANTI-PATTERNS AGAINST FALSE SUCCESS
The operator's acceptance bar — mechanical and numbered. The overhaul is DONE when EVERY line holds:

1. **The agent-in-the-loop runs:** a host deployment of the plutus agent shows the STEP A designation + the STEP B reasoning (tokens 8/10/11) IN THE STREAM — visible, in-session, no external model call anywhere (the grep gate: no fetch in the reasoning path).
2. **The grounding WARN behaves (D2):** a deliberately bad projection (A1) → GROUNDING_WARN + the loop continues; the hard-throw ONLY after 3; the store's week rows record the WARNs.
3. **The EU/GU TP substrate is structural (D3):** the EU/GU RRRs show the VARIETY (never all-2.50); the ratio-extension absent (the grep gate); the targets approach the operator's real RRRs (EU 3.18/2.92/4.4 · GU 8.94).
4. **The golden convergence rises (D4):** ≥ 2/5 after W6, progressing toward 5/5 at ≤3p; every emission carries the delta table; the EU LONG Δ0.8p HIT never regresses.
5. **The E1 substrate is correct:** the 7 golden DXY LQZs ≤1 pip (the LMV oracle) · the golden OB reconstruction + 96% (the OBCV oracle) · the telescoped map with the 30m MoM-only + the 15m lane · the 3 lost mirror.ts fixes re-ported.
6. **The lexicons are wired:** all six consume/produce at their enforcement points; the phantom-BoM all-4 predicate tested on the golden fixture (the EU LONG's demand [1.14145-1.14000] → PHANTOM_BOM, EXEMPT; a 3-of-4 → DEATH).
7. **The W6 golden gate passes:** G1-G10 with the per-gate verdicts; G9 wall ≤ 5 min; G10 byte-identical; the frozen pair byte-identical; tsc 0; the report determinism ×2.
8. **The canon docs updated:** the build report ENTRY 6 · the DEBUG_LOG (the append-only record of every bug found + fixed) · the DECISION_CHAIN D62 (the shadow retirement + the agent-in-the-loop ruling) · the NEXT_STEPS · the EVIDENCE_STATE · the COMPACTION_SURVIVAL.
9. **The 8 immutable operating constraints hold:** precision-only metric · never lower standards · fix the map not the ranking · E2 designates E3 obeys · the telescoping law · no repeat of the 18 derailments · DXY direction pair levels · don't stop, don't fake, verify mechanically.

## §6 SUCCESS CRITERIA
**The docs to maintain (the session-level canon + the permanent knowledge):**

| The doc | The update rule | The content |
|---|---|---|
| MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md | APPEND-ONLY (ENTRY 6+) | every milestone: the bug found + the root cause + the mechanism + the verification |
| MASTER_CONTEXT/DEBUG_LOG (the overhaul's) | APPEND-ONLY, at EVERY milestone | the bug class → the fix → the verification — the permanent knowledge (a bug class solved once is referenceable forever) |
| MASTER_CONTEXT/DECISION_CHAIN.md | APPEND D62+ | the shadow retirement · the agent-in-the-loop ruling · the LQZ-lookback resolution · the zone-width canon |
| MASTER_CONTEXT/NEXT_STEPS.md | REWRITE at the wave boundaries | the remaining queue with the done-when |
| MASTER_CONTEXT/EVIDENCE_STATE.md | APPEND | the wave gates' outputs (the sha256, the diag verdicts, the convergence tables) |
| context_management/COMPACTION_SURVIVAL.md | UPDATE at every compaction prep | the phase / the active / the completed |
| .trident/wave-audit/ | one file per wave | the spec-coverage map + the per-hunk verdicts |

**The resume anchors (the entry sequence after any compaction):**
1. THIS SPEC (the build authority — the waves + the gates).
2. MASTER_CONTEXT/HANDOVER_PACKAGE_4.5.4/ (the measured state + the operator's directives).
3. MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md (the architecture canon — the C1-C6, the G1-G10).
4. MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md + 4.5.md (the doctrine — read sequentially).
5. The 5-line proof-of-context: the mission (the agent-in-the-loop restoration), the state (the shadow dead, 1/5 convergence, the substrate unfinished), the anchor (this spec's waves), the root concept (the machine computes, the agent decides, the T1 contracts), the first wave (W0 — the state verification).

**The cross-consistency rules:** the frozen pair's sha256 in EVERY wave audit · the golden const = TEMPORARY ARCHITECTURE everywhere (never a computation input) · the doctrine QUOTED never synthesized (D13) · the anchor constants (ANCHOR_MS=1783702800000 · DXY_PIP=0.01 · EU/GU 0.0001) in every diag header · the wave audits cross-check the canon docs' claims (the line conflicts like F6/F12 get verified, never carried).

## §7 COMPACTION-PROOF IMPLEMENTATION GUIDE
The decisions needing the operator, with the recommendations — nothing hidden:

| # | The question | The options | The recommendation |
|---|---|---|---|
| Q1 | The LQZ 1H sweepLookback (F12/P0): the T2 config says 12, the Bible T1 says 24 | (a) T2's 12 for the sweep window + the Bible's 24 documented as the alignment window (b) the Bible's 24 everywhere | (a) — the T2 config is the operator's "exact criteria" reference; the golden-LQZ oracle proves it either way |
| Q2 | The zone-width canon (F13): the golden reference 4H 30-80 vs Bible Law 2 4H 15-40 | (a) the reference's widths for the detector gates + the Law-2 widths for the SL geometry (b) the Law-2 everywhere | (a) — the reference describes the OBSERVED winning-trade zones; the Law-2 widths are the construction params; the SL geometry follows Law 9 |
| Q3 | The RWL/WL sub-forms (F14): the operator's 1-2-candle RWL + 4-6-candle mixed WL vs the reference's 6+/all-same-color | (a) the sub-form variants (RWL-rapid/RWL-gradual, WL-compact/WL-extended) (b) the reference strictly | (a) — the operator's first-hand definitions are the higher authority; the classifier gains the sub-forms |
| Q4 | The STEP A/B tool naming | (a) two tools (reason-step-a, reason-step-b) (b) one tool with a phase arg | (a) — two tools = the T1 chain's explicit steps, clearer firewalls |
| Q5 | The host deployment mechanics | the plutus agent deployed as a subagent via the task tool; the diag harnesses run directly; the fixture at /tmp/opencode/bars_raw.json | confirmed by the operator's directive — the container path is dropped for this overhaul |
| Q6 | The shape-brain.ts phantom-BoM line (F6) | verified at W0 against the CURRENT source | the W0 explore agent resolves it before any edit |

**The BLOCKING questions:** none — Q1/Q2/Q3 have the recommendations above and the golden oracles decide them mechanically; Q4/Q5/Q6 are procedural.

## §8 OPEN QUESTIONS
**The zero-trust audit of THIS spec (the adversarial-builder pass):**

| # | Severity | The finding | The surgical edit |
|---|---|---|---|
| A-1 | HIGH | The LQZ lookback resolution (2.5.1) presumes the T2-config choice before the operator's Q1 — the spec should not pre-decide a blocking question | The recommendation stands (Q1(a)) with the oracle as the mechanical arbiter — the gate decides, not the prose; ACCEPTED as-is with the explicit note |
| A-2 | MEDIUM | The STEP B tool's args carry the FULL projections array — the token budget for the agent's own reasoning is unbounded | The ledger + the candidates go in the tool RESULT (read-only); the agent's args carry ONLY the projection decisions (the E/SL/TP + the anchors + the verdicts) — the contract updated in 2.3's flow (step 3 emits decisions, the machine assembles the full projections) |
| A-3 | MEDIUM | The W4 wave (the shadow removal + the WARN + the TP substrate) bundles three mechanisms in one agent — the wave-discipline risk | The W4 split: W4a (the shadow removal + the WARN semantics, reasoning-chain.ts) and W4b (the TP substrate 2.7.1, reasoning-chain.ts:789-790 + mirror.ts) — SEQUENTIAL, the same file, one agent per wave (the §3 table amended: W4a, W4b) |
| A-4 | LOW | The §3 wave table's W1-A file set (ob-engine · 4h-sd-lobe · bom-mom · lqz-lobe · shape-brain · engine · mdve) is large for one surgical agent | The telescoping modules are one coherent doctrine (the T1-T6 as a single wiring); the acceptance gate forces the integration — ACCEPTED, the dispatch plan's task targets break it into the T1-T6 units |
| A-5 | LOW | The host-testing §4 presumes the operator's deployment readiness — the diag harnesses must run even before the deployment | The zero-trust battery runs on the host directly (bun) regardless; the deployment adds the AGENT-visible stream — ACCEPTED |

**The audit verdict:** 0 CRITICAL · 1 HIGH (mitigated by the mechanical arbiter) · 1 MEDIUM (the contract amended in A-2) · 1 MEDIUM (the wave split in A-3) · 2 LOW (accepted) — **no unresolvable gaps; the spec ships as the build authority.**

## APPENDIX A — ZERO-TRUST AUDIT
**THE DISPATCH PROTOCOL (the load → fill → dispatch loop):**
1. Load the trident-dispatch-templates skill (the E1-E4 explore + B1-B5 build templates — pre-written, complete prompts).
2. Fill ONLY the two slots: [FILEPATHS] (the absolute paths from the wave table) + [CONTEXT] (the per-agent context blocks below — mission / knownContext / doctrine / measurements / acceptance / taskTargets / position).
3. The filled template is 150+ lines BY CONSTRUCTION (the skeleton alone is 100+); the trident-task-preflight validates the line floor + the markers (target=task) — READY = dispatch.
4. Dispatch via THE TASK TOOL ONLY (D6 — the wave dispatcher's spawn is broken; never wait on a spawn that did not return a sessionId).
5. Every return: the orchestrator's own zero-trust battery (tsc · build · the frozen pair · the diag · the diff review of EVERY changed line) + the wave audit at .trident/wave-audit/.

**THE WAVE-BY-WAVE DISPATCH PLAN (pre-organized sequential waves — one agent per disjoint file set):**

### WAVE 0 — THE STATE VERIFICATION (explore — E1 template)

| The slot | The fill |
|---|---|
| name | w0-state-verify |
| filepaths | src/mdve/reasoning-chain.ts · src/mdve/shadow-agent.ts · src/brains/shape-brain.ts · src/pipeline/engine.ts · src/mdve/ob-engine.ts · src/mdve/lmv.ts · src/mdve/lqz-matrix.ts · src/mdve/mirror.ts · diag-reasoning-chain.ts |
| mission | The forensic inventory: the CURRENT state of every file the overhaul touches — the exports, the line anchors, the phantom-BoM exemption's ACTUAL line in shape-brain.ts (the F6 conflict: the L2 cites :2330-2336, the handover :1150), the LQZ sweepLookback's ACTUAL constant in lqz-lobe.ts (the F12 conflict: 12 vs 24), the computeMirrorTP null path in mirror.ts (the F2 root), the ratio-extension in reasoning-chain.ts (the F2 fallback), the shadow-agent.ts fetch path (the F1 root), the frozen pair's sha256 |
| knownContext | The overhaul spec (this document) is the build authority; the handover package's measured state: the shadow dead (llm 0), the EU/GU RRRs all 2.50, the golden convergence 1/5, the frozen pair sl-lmv 912940832fac44bc + trade-dedup 33914c897e777540; the wave table's file sets depend on YOUR resolved anchors |
| doctrine | Do NOT re-derive the measured state — verify the anchors; an anchor that moved is reported MOVED with the current line; every claim carries a file:line; the frozen pair is read-only |
| measurements | the phantom-BoM line (FOUND at line X / MOVED to Y / ABSENT) · the sweepLookback value · the ratio-extension lines · the shadow fetch lines · the frozen pair sha256 · the engine.ts tool registry |
| acceptance | the resolved line numbers for F6 + F12 · the F1/F2 root-code excerpts · the file inventory with the exports · tsc 0 on the CURRENT tree (read-only: report the command's output, run it if bash is permitted) |
| taskTargets | T1 the per-file extraction · T2 the F6/F12 line verification · T3 the F1/F2 root-code trace · T4 the tool registry + the context fields · T5 the failure-mode scan |
| position | W0 gates the entire overhaul — every wave's surgical edits target YOUR verified anchors |

### WAVE 1 — THE E1 MATH ENGINES (3 agents — B3 surgical ×2 + B1 build ×1)

**Agent 1a — the telescoping wiring (B3):**
| The slot | The fill |
|---|---|
| name | w1a-telescoping |
| filepaths | src/mdve/ob-engine.ts · src/brains/4h-sd-lobe.ts · src/mdve/bom-mom.ts · src/brains/lqz-lobe.ts · src/brains/shape-brain.ts · src/pipeline/engine.ts · src/mdve/index.ts |
| mission | Wire the telescoping doctrine T1-T6 per the spec §2.5.1: the lqz-lobe timeframe param + the per-TF thresholds (the T2 config table — the W0-verified sweepLookback), the 4H→1H nesting + the refinedLabel/nestedWithin + the confluence (+3/+5), the 1H→30m minor refinement, the 30m MoM-only gate (bom-mom.ts returns 'MoM' for 30m/15m; 4h-sd-lobe.ts gates isBoM; shape-brain.ts:608 delivers the 30m MoM to E2), the LQZ 1H→30m→15m runs, the T6 snapshot merge |
| knownContext | The operator's telescoping doctrine verbatim (Bible 4.5 §12.1): "S/D zones are charted on 4H and refined down to 1H... LQZ similarly starts on 1H and is refined down to 30m + started on 30m and refined down to 15m"; the current state: the emergent lane is 4H-only S/D + 1H-only LQZ; bom-mom.ts:106 is TF-agnostic (a 30m OB CAN be BoM today — the doctrine violation); the ONLY telescoping code is the dead legacy (plutus-tte-pipeline.ts:3021-3179) |
| doctrine | "30m is not an origin point for BoM S/D zones"; the BoM origins 4H/1H ONLY; the LTF never overrides the HTF; the zone map is the single source of truth (LAW 3); the golden levels are the measurement oracle only — never hardcoded, computed from the week's own data |
| measurements | the 7 golden DXY levels (100.845 · 100.945 · 100.975 · 101.14 · 101.19 · 101.235 · 101.240) · the per-TF S/D params (4H 60/40/150 · 1H 120/25/150 · 30m 200/15/150 · 15m 300/10/150) · the confluence dual-TF +3 / triple-TF +5 |
| acceptance | tsc 0 · bun build success · the frozen pair byte-identical · the 7 golden DXY levels appear in the map computed from the data · no 30m BoM anywhere · the 15m lane in the map |
| taskTargets | T1 the T1-T2 wiring (lqz-lobe + ob-engine + engine) · T2 the T3-T4 wiring (the 30m gate + the E2 delivery) · T3 the T5-T6 wiring (the LQZ runs + the snapshot merge) · T4 the golden-map verification |
| position | The E1 substrate is the agent's STEP A/B reading material — a wrong map makes the reasoning theater |

**Agent 1b — the LMV resolution (B3):**
| The slot | The fill |
|---|---|
| name | w1b-lmv-resolution |
| filepaths | src/mdve/lmv.ts · src/mdve/lqz-matrix.ts |
| mission | The LMV resolution per the spec §2.5.2: the modal-cluster emission (the rung = the MODAL reaction level, not the prominence-weighted mean), the 1-pip LQZ dedup (`< 1·pip` strict — the 0.5-pip pair 101.235/101.240 BOTH survive), the matrix→model.zones bridge (matrixLadderRungs → model.zones so the mirror search sees the rungs), the telescoped 30m/15m matrix tiers |
| knownContext | lmv.ts (611L) + lqz-matrix.ts (626L) are the MUTABLE prototypes (the operator's 2026-07-31 ruling — mutable until the golden-LQZ oracle passes); the current resolution state: 3/7 golden DXY LQZs at ≤1 pip (100.849 Δ0.4p · 100.949 Δ0.4p · 101.130 Δ1.0p); the 4 stacked collapse mechanisms: the ε=2 band merging, the center drift, the 3-pip dedup floor, the bridge gap |
| doctrine | The LMV formulation (the operator's verbatim): "Create a matrix data set based on linear algebra... each zone's OHLC data from X number of candles = 1 matrix"; the golden-LQZ oracle is "the definitive test of LMV"; the constants: CLUSTER_TOLERANCE_PIPS=2 · CLUSTER_MAX_SPAN_PIPS=4 · MIN_REACTION_CANDLES=3 · MIN_DISTINCT_KINDS=2 · EPSILON_ATR_FRACTION=0.25 · LQZ_LOOKBACK_BARS=720 |
| measurements | the 7 golden levels · the 48-zone LmvTable spanning [98.751, 101.800] · the 3.0-pip pair (100.945/100.975) and the 0.5-pip pair (101.235/101.240) as the resolution proof |
| acceptance | diag-lmv-golden: 7/7 at ≤1 pip · tsc 0 · the frozen pair byte-identical · the matrix rungs visible to the mirror anchor search |
| taskTargets | T1 the modal-cluster emission · T2 the 1-pip dedup · T3 the model.zones bridge · T4 the telescoped tiers · T5 the oracle run |
| position | The entries land on the operator's exact rungs ONLY through this resolution — the precision ceiling |

**Agent 1c — the OBCV machine (B1):**
| The slot | The fill |
|---|---|
| name | w1c-obcv |
| filepaths | src/mdve/obcv.ts (NEW) · the OBCV consumers (the ladder scaffold's ORDER_BLOCK source) |
| mission | Build the OBCV machine per the spec §2.5.3: the 4 sub-engines (the ATR-normalized displacement field D · the origin-candle feature matrix F · the prior-move classifier · the telescoping incidence matrix T) + the firewall invariants (|BoM|+|MoM|==|deduped| · ∀z30m: parent · ∀z: widthGate) |
| knownContext | The operator's formulation: "We should also build an OBCV (order block candle vision) machine on the same principles that finds all the OBs using its own MPSE function"; the current gap: the OBCV's conservative gates (bw≥3.0/bf≥0.65) emitted 0 BoM on the golden fixture — the golden OBs exist but the machine misses them; the v4.4 Bug-3 lesson: the rolling ATR NEVER includes the impulse bar |
| doctrine | "LMV + OBCV = the two biggest levers: once these 2 are 96%+ accurate, 90% of the work in charting zones is done from the start"; the BoM = the first impulse (prior NONE/OPPOSITE) with bw ≥ 3.0 ∧ bf ≥ 0.65 ∧ widthGate; the 30m requires a 1H parent (orphan → REJECT) |
| measurements | the displacement thresholds (4H 50p/18b · 1H 30p/36b · 30m 15-20p/24b) · the width gates (4H 15-40 · 1H 8-25 · 30m 5-15) · the golden reconstruction targets (1H BoM demand 100.68-100.73 · 4H BoM supply 101.235-band · 1H MoM demand 100.845) |
| acceptance | the golden OB reconstruction from data alone + 96%+ vs the operator's drawn map · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 sub-engine A (the displacement field) · T2 sub-engine B (the feature matrix) · T3 sub-engine C (the classifier) · T4 sub-engine D (the incidence matrix) + the invariants · T5 the oracle |
| position | The operator's drawn BoM levels must exist in the map BEFORE the agent's STEP A designates them |

### WAVE 2 — THE 3 LOST MIRROR FIXES (B3 ×1)
| The slot | The fill |
|---|---|
| name | w2-mirror-fixes |
| filepaths | src/mdve/mirror.ts |
| mission | Re-port the 3 lost fixes per the spec §2.5.4 + the sweep-bonus inversion: computeGoldenSL_V452 + GOLDEN_FLOOR + GOLDEN_FLOOR_FALLBACK (the 4-stage golden SL pipeline with GOLDEN_SL_MIN_PIPS=4), weekProbeAtAnchor (the LMV candle-wick band-touch probe), classFlexibleLQZFallback + the GU distribution loop (the §8.1 union + `usedGuAnchors.add(g.anchorZoneId)` for EVERY constructed mirror), and the computeLmvTP sweep-bonus −30 (the inverted significance: a swept rung = DEMOTED, not PROMOTED) |
| knownContext | The 3 fixes were lost in the v4.5.2-E2-cascade wipe and NOT re-ported (Bible 4.5 §9.1); the BUILD_STATE.md:127 claim that mirror.ts carries them is FALSE; the current computeLmvTP significance: `(sweepCount≥1 ? 50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)` — the +50 is the inversion; the GU TP lands one rung too shallow → RRR 1.30 → the RRR_DISCARDED → the GU lane dead |
| doctrine | The operator's SL doctrine (D35): "SL goes INSIDE the next LQZ next to the entry zone. Should usually be within < 20 pips"; the GOLDEN_SL_MIN_PIPS=4 floor · GOLDEN_SL_MAX_PIPS=9.5 · the Law-7 buffers (EUR 2 / GBP 3 / AUD 3 / DXY 5) · the D17 ceiling 36 pips HARD; the distribution principle: "Distribution must be a property of the SIGNALS, NEVER of the OUTCOMES" |
| measurements | the golden SLs (4-9.5 pips) · the probe targets · the GU anchor distribution ≥ 8 distinct anchors · the 55.5-pip Law-14 path (101.235 → 100.680 through 5 mitigated zones) |
| acceptance | tsc 0 · the golden SL floor enforced (a sub-4p SL walks to the next defended rung) · the weekProbeAtAnchor probes fire · the GU distribution ≥ 8 distinct anchors · the RRR_DISCARDED casualty drops |
| taskTargets | T1 computeGoldenSL_V452 + the floor + the fallback · T2 weekProbeAtAnchor · T3 the class-flexible fallback + the distribution loop · T4 the sweep-bonus inversion |
| position | The GU lane's viability + the golden SL precision depend on this wave |

### WAVE 3 — THE SIX LEXICONS (B1 ×1)
| The slot | The fill |
|---|---|
| name | w3-lexicons |
| filepaths | src/mdve/lexicons/ (NEW — the machine form) · the wiring points: src/mdve/lmv.ts (the side vote) · src/brains/shape-brain.ts (the classification + the death-rule exemption) · src/mdve/mirror.ts (the SL relevance) · src/mdve/reasoning-chain.ts (the token consumption) |
| mission | Build the six lexicons per the spec §2.6: the TradingLexiconRule machine form (families · classify · enforce Phase A/B · escapeHatchTool · escalationThreshold=3) + the wiring at the 6 enforcement points + the phantom-BoM all-4 predicate tested on the golden fixture |
| knownContext | The PLUTUS_V4.5.4_LEXICON_SPEC.md (301L) is the design authority — the machine form + the family tables are complete there; the current state: no consumer reads the lexicons (F11); the shape-brain.ts line for the exemption edit MUST be the W0-verified line (F6); the operator's law: "zones/candles = regex · pressure mechanics = semantic intent" |
| doctrine | The MPSE law: every predicate deterministic; `score = pos/(pos+neg+1)`; Phase A = the boundary THROW (a hard violation), Phase B = the output mutation; the escape hatches NEVER block a legitimate operator-drawn setup; the phantom-BoM all-4 (the width · the fakeout · the pre-formation reaction · the macro-origin continuation) — 3-of-4 = DEATH |
| measurements | the confidence formula · the escalationThreshold 3 · the golden fixture test (the EU LONG's demand [1.14145-1.14000] → PHANTOM_BOM EXEMPT; a 3-of-4 fixture → DEATH) |
| acceptance | every lexicon's classification consumed by a machine or agent path · the phantom-BoM fixture passes · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 the machine form + the 6 lexicon modules · T2 the wiring (the 6 enforcement points) · T3 the phantom-BoM fixture test · T4 the tsc + the build |
| position | The semantic intent layer the agent's STEP A/B reads — without it the agent reasons over bare numbers, not pressure mechanics |

## APPENDIX B — THE WAVE DISPATCH PLAN
### WAVE 4 — THE SHADOW REMOVAL + THE GROUNDING WARN + THE TP SUBSTRATE (B3 ×2, SEQUENTIAL — the A-3 audit split)

**Agent 4a — the shadow retirement + the grounding WARN (B3):**
| The slot | The fill |
|---|---|
| name | w4a-shadow-retire |
| filepaths | src/mdve/shadow-agent.ts · src/mdve/reasoning-chain.ts (the validation points) |
| mission | Retire the shadow executor per the spec §2.4: shadow-agent.ts's LLM fetch path DELETED as the executor (the C2 machinery preserved as the reference pattern, never invoked); the token 8/10/11 hooks become the agent-facing interface (the deterministic skeleton + the candidates the agent refines); the grounding WARN semantics wired: a non-numeric/out-of-order/invented-id output → the WARN row {check, tokenId, sourceRef, value, proposedCorrection} → the failure store (GROUNDING_WARN) → the loop continues → the hard-throw ONLY after 3 refinements (REFINEMENT_EXHAUSTED) |
| knownContext | The operator's D1: "ok shadow agent dead... replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything"; D2: "these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop"; the current state: llm 0 — the SHADOW_SHAPE_VIOLATION checks (shadow-agent.ts:447/:535) hard-killed the loop; the SHADOW_REWIRE_SPEC (HANDOVER_PACKAGE_4.5.4/SHADOW_REWIRE_SPEC.md) is the rewire authority; the failure store's taxonomy keeps SHADOW_DEGRADE for backward compatibility; the live rows become GROUNDING_WARN / REFINEMENT_EXHAUSTED / CONTRACT_VIOLATION / MACRO_DIVERGENCE |
| doctrine | D1 + D2 verbatim; the C4 stall-detector pattern (the SSE idle window 90s) preserved as the reference for the agent-side waits; the failure store never silently drops (the append-only fallback row) |
| measurements | the WARN row shape · the refine cap 3 · the store's chain_failures schema (id · component · reason · context · attempts · timestamp · week · pair) |
| acceptance | a deliberately bad projection (the A1 test) → GROUNDING_WARN + the loop continues + the hard-throw ONLY after 3 + the store row · NO fetch in the reasoning path (the grep gate) · tsc 0 · the frozen pair byte-identical |
| taskTargets | T1 the fetch path removal + the contract shape · T2 the WARN semantics at the validation points · T3 the store rows · T4 the A1 test |
| position | The D1/D2 law made mechanical — the agent reasons, the machine warns, nobody hard-kills |

**Agent 4b — the TP substrate (B3 — runs AFTER 4a, the same reasoning-chain.ts file):**
| The slot | The fill |
|---|---|
| name | w4b-tp-substrate |
| filepaths | src/mdve/reasoning-chain.ts (the ratio-extension at :789-790) · src/mdve/mirror.ts (the computeLmvTP shapeDay path + the significance) |
| mission | The SLOP-01/D37 kill per the spec §2.7.1: the ratio-extension REMOVED as a TP source (no code path computes a TP to hit a target RRR); ZR-3.3 — the E2-projected opposing zone's full-model resolution (the computeLmvTP shapeDay path resolves the OB-id-vs-LMV-candidates mismatch — the TP = the opposing rung's defendedEdge where the E2 shape day's projected opposing zone EXISTS); ZR-3.4 — the E1-pressure wall classification in the cap-walk (the BoM/MoM + the 6D confluence + the Earth+Fire, NOT the candle-count zfp≤20 ladder) |
| knownContext | The operator's D3: "How is DXY higher R than EU + GU that makes no sense" + "RRR is a CONSEQUENCE, not a target" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5"; the current state: the EU/GU RRRs ALL exactly 2.50 (the forced ratio-extension fallback — the D37 class, SLOP-01); the computeMirrorTP null path is the trigger; the computeLmvTP significance currently: `(sweepCount≥1 ? 50 : 0) + (zfp≥40 ? 40 : zfp≤20 ? 25 : 15)` — the +50 sweep PROMOTION is the inversion (a swept rung = liquidity TAKEN → DEMOTE −30) |
| doctrine | The RRR is the consequence of the zone geometry (the E/SL/TP from the pressure mechanics) — never a target to force; the operator's real RRRs (EU 3.18/2.92/4.4 · GU 8.94) are the structural targets; the 2.5R floor valid-if-high-probability, the 4R+ target |
| measurements | the EU/GU RRR variety (never all-2.50) · the EU LONG Δ0.8p held · the GU RRR_DISCARDED casualty drops · the golden convergence ≥2/5 |
| acceptance | tsc 0 · the ratio-extension absent (the grep gate) · the EU/GU RRRs NOT all 2.50 · the A2 test (the null computeMirrorTP → the structural TP, never the 2.5 clamp) · the frozen pair byte-identical |
| taskTargets | T1 the ratio-extension removal · T2 the ZR-3.3 full-model resolution · T3 the ZR-3.4 wall classification · T4 the A2 test |
| position | The EU/GU lanes stop emitting fabricated artifacts — the RRR becomes the honest consequence |

### WAVE 5 — THE STEP A/B TOOLS + THE PIPELINE WIRING (B1 ×1)
| The slot | The fill |
|---|---|
| name | w5-step-tools |
| filepaths | src/pipeline/engine.ts (the tool registry + the context fields) · the new tools (plutus-pipeline-reason-step-a · plutus-pipeline-reason-step-b · plutus-pipeline-gate) |
| mission | Build the STEP A/B tools + the wiring per the spec §2.2/§2.3/§2.8: plutus-pipeline-reason-step-a (the E1→E2 designation contract: the args require the designation array; the firewalls: every zoneId ∈ the zone map, the rationale ≥40 chars with a price reference; the output's NEXT: call plutus-pipeline-shapes); plutus-pipeline-reason-step-b (the E2→E3 11-token contract: the machine's tokens 1-7+9 ledger presented in the tool RESULT; the agent's args carry ONLY the projection decisions — the E/SL/TP + the anchors + the verdicts (the A-2 audit amendment); the machine assembles the full TradeProjections + validates — the grounding WARN set + assertProjectionContract); the gate tool (the G1-G10 verdicts); the context fields (stepADesignation, projections) + the NEXT instructions + resetContext() |
| knownContext | The T1_MULTI_TOOL_CHAIN_PIPELINE.md is the wiring authority: the output-contracted args, the mechanical firewalls (the file-existence layer · the semantic layer · the format layer), the NEXT instructions, the module-level context, the reset on completion; the operator's D5: the reasoning chain is a STEP in the tool chain pipeline; the current registry: the 5 legacy tools (harvest/zones/shapes/charts/setups) — the new 3 tools join under the existing plutus- prefix (the allowlist unchanged) |
| doctrine | "The agent is NOT a passive caller. Between each tool call, the agent performs reasoning that is REQUIRED for the next tool to function. The next tool's arguments MUST contain the output of that reasoning." — T1 verbatim; the E3-NEVER contract (assertProjectionContract throws on the anchor-less / unordered / out-of-zone / sub-1R / out-of-confidence) |
| measurements | the StepADesignation interface · the TradeProjection interface · the grounding WARN set · the CLUSTER_TOLERANCE_PIPS 2 · the rationale floor (≥40 chars + a price reference) |
| acceptance | tsc 0 · the A4 test (a fabricated designation → BLOCKED) · the A1 test (a bad projection → WARN, never a kill) · the NEXT instructions present · the context carries the designation + the projections · the frozen pair byte-identical |
| taskTargets | T1 the STEP A tool + the firewall · T2 the STEP B tool + the ledger + the assemble + the WARN · T3 the gate tool · T4 the context + the registry + the NEXT instructions · T5 the A1/A4 tests |
| position | The agent-in-the-loop becomes REAL — the two reasoning steps the operator sees in the stream |

### WAVE 6 — THE E3 PRECISION (B3 ×1)
| The slot | The fill |
|---|---|
| name | w6-e3-precision |
| filepaths | src/mdve/reasoning-chain.ts (the ladder-steps SL + the strength-driven TP edge) · src/mdve/setup-gen.ts (the entry refinements — the operator-unfrozen file, the HOTFIX_SPEC:65 precedent) |
| mission | The anchor doctrine made mechanical per the spec §2.7.2-2.7.4: the ladder-steps SL (3p outside the far edge of the current step OR 1-2p inside the close edge of the NEXT STEP away — the relevant zone by the pressure state); the strength-driven TP edge (STRONG → the close edge + the 1-2p spread; WEAK → the far edge); the entry refinements at the operator's levels (the GU Monday's demand pick at 1.33330; the 4 misses: EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p — refined on the SAME zone anchors, never a new zone) |
| knownContext | The operator's anchor rules verbatim (the E1_E2_E3_MACRO_CONTEXT Part 5): "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps"; "the stronger the pressure of the zone, the weaker the mitigation will be prior to the reaction... exit on the closest zone edge and even potentially add a 1-2 pip spread"; the trade #4's relevance switch (the LQZ eaten → the DEMAND zone as the operative defense); the current state: the 4 misses + the GU Δ6.0p demand pick (1.33270 vs 1.33330) |
| doctrine | The RRR is the consequence; the chaining preserved (the TP of N = the entry of N+1); the zones are ladder steps; the entry never moves in the refinement (the 3-attempt machine, the 🔧 REPAIRED annotations) |
| measurements | the golden levels (EU 1.14395/1.14110/1.14460 · GU 1.33330/1.33965 · DXY 100.945/101.140/100.845/101.19/100.975/101.235) · the ≤3p tolerance · the 2.5R floor / 4R+ target |
| acceptance | tsc 0 · the golden hits ≥2/5 → toward 5/5 · the EU LONG Δ0.8p held · the chaining intact · the frozen pair byte-identical |
| taskTargets | T1 the ladder-steps SL · T2 the strength-driven TP edge · T3 the entry refinements (the 4 misses + the GU pick) · T4 the convergence measurement |
| position | The convergence push — the golden hits are the ONLY metric (D4) |

### WAVE 7 — THE W6 GOLDEN GATE (B4 ×1)
| The slot | The fill |
|---|---|
| name | w7-golden-gate |
| filepaths | diag-reasoning-chain-golden.ts (NEW) |
| mission | Build the W6 golden gate per the spec §3's W7 + the L2's G1-G10 contract: the diag harness with the 10 gates (G1 the EU LONG phantom-BoM within 2p of 1.14110 · G2 the native-first cascade-complementary · G3 the GU Monday LONG with the MACRO_DIVERGENCE recorded · G4 the EU/DXY 1:1 inverted mirror · G5 the E3-NEVER 100% · G6 the hard-throw discipline (0 REFINEMENT_EXHAUSTED) · G7 the no-regression of the 13 unique trades · G8 the temporal negative control · G9 the wall time ≤5 min · G10 the parallel-equivalence byte-identical) + the per-gate verdicts + the exit protocol (tsc · build · the frozen pair · the report determinism ×2 · the wall time) |
| knownContext | The L2 spec's G1-G10 table (L2:1122-1135) + the Monday oracle (DXY L 100.945 · DXY S 101.140 · EU S 1.14395 · EU L 1.14110 · GU L 1.33330 at ≤3p); the golden const = the MEASUREMENT ORACLE ONLY (the TEMPORARY ARCHITECTURE label — the pipeline never reads it); the current state: the W6 gate absent (F5); the operator's D4: the only valid Monday trades are the golden trades |
| doctrine | The golden is a VALIDATION set, never a TRAINING input; the ≤3p tolerance is the ONLY tolerance; the RRR ≥3.0 emission minimum; the G9 wall ≤5 min (the C1/C3/C4 fix's proof); the G10 byte-identical determinism |
| measurements | the oracle levels · the ≤3p tolerance · the 5-min wall · the 2-pip G1 entry tolerance · the frozen pair SHAs |
| acceptance | `bun diag-reasoning-chain-golden.ts --day=2026-07-06` exits 0 with the per-gate verdicts · the convergence table per emission · the wall ≤5 min · the determinism ×2 · tsc 0 |
| taskTargets | T1 the G1-G10 harness · T2 the per-gate verdicts + the exit protocol · T3 the adversarial scenarios (A3 the temporal control · A5 the G10 equivalence · A7 the wall-time regression) |
| position | The mechanical acceptance — the overhaul's proof, run on the host |

### WAVE 8 — THE HOST DEPLOYMENT TEST (the operator's directive)
The operator deploys the FULL plutus agent as a subagent on host (the task tool). The deployed agent runs the full pipeline: harvest → zones → STEP A (the visible designation) → shapes → STEP B (the visible 11-token reasoning) → setups → gate. The orchestrator observes the stream (the STEP A/B reasoning visible — D1's "so we can see everything"), collects the G1-G10 verdicts, and records the wave audit. The convergence table is the operator's acceptance read.

*END OF THE WAVE DISPATCH PLAN — every wave's fills are ready to load into the trident-dispatch-templates skeleton (E1 for W0, B3 for the surgical waves, B1 for the builds, B4 for the gate) and dispatch via the task tool with 0 watering down. THE OVERHAUL SHIPS WAVE BY WAVE, EACH GATED, EACH AUDITED, ON THE HOST.*
