# HANDOVER PACKAGE 4.5.4 — THE REASONING CHAIN SYSTEM (FULLY SELF-CONTAINED)

**Version:** 2.0 · **Date:** 2026-08-07 · **Status:** THE FRESH SESSION'S ENTRY PACKAGE — read in order
**Project:** PLUTUS — the operator's autonomous TTE (Trident Trading Engine) — E1 → E2 → E3 with the reasoning chain between E2 and E3
**Workspace root:** /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/
**Package location:** MASTER_CONTEXT/HANDOVER_PACKAGE_4.5.4/
**This package's authority:** the operator's 2026-08-07 session directives (quoted verbatim below) + the architecture canon `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md` (2,051 lines) + the six-lexicon spec `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` + the audit process `MASTER_CONTEXT/Plutus_Shark_Operator_Audit_Process.md` + the Trident v4.4.2 checkpoint 7.3 shadow-backend reference.

---

## PART 0 — WHY THIS PACKAGE EXISTS

The 2026-08-07 session built the shadow-enhanced reasoning chain (the operator's agent-in-the-loop forward-reasoning layer between E2 and E3). The deterministic core WORKS (the EU LONG reproduced at Δ0.8p — the phantom-BoM fortress; the GU Monday direction flipped to the macro LONG). But the shadow LLM path was a compounding failure chain (the parse → the grounding hard-kill → the deterministic fallback → llm 0), the EU/GU TP substrate degenerated to the forced-2.5-RRR ratio-extension (the D37 class), and the operator ordered the shadow agent DEAD — replaced by the actual headed agent reasoning IN SESSION, visible, as a STEP in the tool chain pipeline.

This package is the COMPLETE handover — everything a fresh session needs to take over without re-deriving anything: what was built (functional + broken), what must be rewired (the shadow infra → the headed agent), what the system actually IS at the macro level (the pipeline chain + the lexicons), the cleanup + wiring work order, the full build report, the full debug log, and the full failure log of the degenerate slop.

---

## PART 1 — THE OPERATOR'S DIRECTIVES (2026-08-07 — VERBATIM, THE LAW)

### D1 — THE SHADOW AGENT IS DEAD → THE HEADED AGENT IN SESSION

> "ok shadow agent dead you are fucking this up royally replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop"

**The meaning:** the embedded shadow LLM call (the deepseek v4 flash via the opencode zen endpoint) is RETIRED as the reasoning executor. The ACTUAL headed agent — the primary opencode agent — performs the reasoning/inference IN SESSION, visible in the pipeline's stream, so the operator can SEE the forward-position reasoning, the anchor reasoning, the validation reasoning. The chain becomes a STEP in the tool chain pipeline the agent EXECUTES, not a hidden LLM call.

### D2 — THE GROUNDING VIOLATIONS WARN + CONTINUE, NEVER HARD-KILL

> "SHADOW_SHAPE_VIOLATION: forwardPosition must be a number / entry/sl/tp must be numbers - these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."

**The meaning:** a non-numeric/out-of-order response value is a REFINEMENT WARNING (recorded with the context: the check, the token, the sourceRef, the value, the proposed correction), logged to the failure store, and the LOOP CONTINUES with the warning as the refinement input. The hard-throw ONLY after 3 failed refinements. The refine/retry doctrine: *"a rejected setup is not a dead setup... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it."*

### D3 — THE RRR IS A CONSEQUENCE, NEVER A TARGET (the forced-2.5-RRR fallback is SLOP)

> "How is DXY higher R than EU + GU that makes no sense."

> "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR" (the standing law)

> "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table"

> "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."

**The meaning:** the `ratio-extension (RRR gate)` fallback (reasoning-chain.ts:789-790 — `tp = entry + RRR_GATE * risk` when computeMirrorTP returns null) FABRICATES the RRR to exactly 2.5 — the RRR-as-target, the direct violation of the law. ALL 4 EU/GU emissions showed RRR 2.50 exactly — the degenerate artifact. The fix: the E2-projected opposing zone's full-model resolution (the ZR-3.3 — the OB-id-vs-LMV-candidates mismatch) — the TP at the structurally-equivalent opposing BoM wall — the ratio-extension REMOVED as a TP source.

### D4 — THE ONLY VALID MONDAY TRADES ARE THE GOLDEN TRADES

> "what are these trades if not the golden hits? are these even valid? the only trades valid for Monday are the golden trades what are these?"

**The meaning:** the chain's 6 Monday emissions (DXY S/L, EU S/L, GU S/L) are the machine's CURRENT BEST GUESS — only 1/5 converges to the operator's golden Monday trades (the EU LONG 1.14102 vs 1.14110 = Δ0.8p). The other 4 miss (the EU SHORT Δ11.7p, the DXY LONG Δ9.6p, the DXY SHORT Δ19.1p, the GU LONG Δ8.8p). The G1-G10 golden gate (W6 — NOT BUILT) measures this gap. The emissions are NOT valid trades until they converge. Every emission report MUST carry the golden-convergence table (the delta per trade).

### D5 — THE REASONING CHAIN IS A STEP IN THE TOOL CHAIN PIPELINE

> "i dont even understand what the fuck you are building right now and how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline."

**The meaning:** the reasoning chain is the pipeline STEP between the shapes (E2) and the setups (E3): harvest → zones → shapes → **REASONING (the agent-in-session, the 11 tokens)** → setups → the report + the golden gate. NOT a side-system.

### D6 — THE TASK TOOL IS THE ONLY SPAWN PATH

> "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL"

**The meaning:** the wave-dispatcher's spawn failed (the agents never launched — the trident-tmp absent, the wave-status unknown_wave). The W4 + W5 agents that DID run were the MANUAL task-tool dispatches. Verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting.

---

## PART 2 — THE ONE-SENTENCE STATE

The reasoning chain (the 11-token forward engine between E2 and E3) is BUILT and its deterministic core WORKS (the EU LONG Δ0.8p HIT — the phantom-BoM fortress reproduced; the GU Monday direction flipped to the macro LONG; the W4 topology + the W5 phantom-BoM exemption verified by the orchestrator's own runs); the shadow LLM path is DEAD (the grounding violations hard-kill the loop instead of warning + the parse rejects the streaming output → the deterministic fallback carries, llm 0); the EU/GU TP substrate is broken (the computeMirrorTP null → the forced-2.5-RRR degenerate fallback); the operator has ordered the shadow agent REPLACED by the actual headed agent in opencode doing the reasoning/inference IN SESSION, visible, as a STEP in the tool chain pipeline.

---

## PART 3 — THE VERIFIED STATE (mechanically verified 2026-08-07 — the numbers)

| Item | Value | The evidence |
|---|---|---|
| The frozen pair | sl-lmv 912940832fac44bc · trade-dedup 33914c897e777540 — byte-identical | sha256sum |
| tsc | 0 (after all W1-W5 edits) | bunx tsc --noEmit |
| The Monday emissions | 6 projections — DXY S/L, EU S/L, GU S/L | the diag-reasoning-chain run |
| The golden convergence | **1/5** (≤3 pips) — the EU LONG Δ0.8p HIT | the diag's golden measurement |
| The emission deltas | EU LONG Δ0.8p HIT · EU SHORT Δ11.7p · DXY LONG Δ9.6p · DXY SHORT Δ19.1p · GU LONG Δ8.8p | the diag's golden measurement |
| The stats | deterministic 14 · llm 0 · refinements 2 · hardThrows 0 | the diag's stats line |
| The EU/GU RRRs | ALL 2.50 EXACTLY — the forced ratio-extension fallback (the D37 class) | the diag's projections |
| The DXY RRRs | 4.46 / 7.16 — the structural TP resolves on the source lane | the diag's projections |
| The GU Monday direction | FLIPPED to LONG (the macro authority) + the MACRO_DIVERGENCE recorded | the diag + the failure store |
| The phantom-BoM exemption | the fixture EUR/USD|1H|1782990000000|1.14004 → PHANTOM_BOM (EXEMPTED); the type-1 → DEATH | the W5 probe |
| The forced-null complement | the mirror ACTIVE with every GU zone excluded + the D50 held — E 1.33353 = Δ2.3p of the golden 1.33330 | probe-c3-complement.ts |
| The LLM | DEAD — the SHADOW_SHAPE_VIOLATION hard-kills the loop (D2) | the failure store |

---

## PART 4 — THE PACKAGE MAP (the reading order)

| # | The file | The content | The length |
|---|---|---|---|
| 1 | `README.md` | THIS FILE — the entry, the operator's directives, the state, the package map | — |
| 2 | `BUILD_REPORT.md` | THE FULL BUILD REPORT — the wave-by-wave record (W0-W6) with the code, the contracts, the evidence; what is functional vs broken; the honest numbers | the complete record |
| 3 | `DEBUG_LOG.md` | THE FULL DEBUG LOG — the 5 root causes (D-01..D-05) with the probes, the A/B tests, the mechanisms, the fixes, the regression checks | the complete record |
| 4 | `FAILURE_LOG.md` | THE FULL FAILURE LOG — the 11-item slop register (SLOP-01..SLOP-11) with the exact code, the mechanisms, the operator's laws violated, the fixes | the complete record |
| 5 | `SHADOW_REWIRE_SPEC.md` | THE REWIRE AUTHORITY — the shadow infra → the headed agent (D1); the grounding-WARN conversion (D2); the new architecture (the reasoning chain as the pipeline STEP 4); the complete conversion pseudocode | the build authority |
| 6 | `MACRO_ARCHITECTURE.md` | THE MACRO-LEVEL EXPLANATION — what this actually is; the tool chain pipeline; the six lexicons' full detail; the golden-doc reasoning as the token baseline; the honest gap | the reference |
| 7 | `NEXT_STEPS.md` | THE WORK ORDER — the 7-step cleanup + wiring in dependency order with the per-step contracts, the gates, the verification battery, the do-not list | the execution plan |

---

## PART 5 — THE RELATED CANON (the fresh session's full reading list)

1. `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.5.md` (3,040L) — the v4.5-era canon (the E1/E2/E3, the LMV/OBCV, the cascade, the doctrine).
2. `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md` (4,504L) — the foundational canon (the 37 laws, the 18 iron laws, the golden standard, the elemental cycle).
3. `MASTER_CONTEXT/PLUTUS_E1_E2_E3_MACRO_CONTEXT.md` (1,004L) — the fundamental law (E1+E2=E3), the pressure mechanics, the storyline, the protocols.
4. `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md` (2,051L) — THE ARCHITECTURE CANON — the C1-C6 corrections, the diagrams, the G1-G10, the waves W1-W6.
5. `MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md` (301L) — the six lexicons (the semantic intent layer).
6. `MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC.md` (688L) — the initial plan (the shadow contract, the G1-G8).
7. `MASTER_CONTEXT/Plutus_Shark_Operator_Audit_Process.md` (544L) — the de facto testing process.
8. `MASTER_CONTEXT/PLUTUS_V4.5.3_BUILD_REPORT.md` — the one running report (the ENTRY 5 = the C1-C6 record).
9. The Trident v4.4.2 `SHADOW_ENHANCED_TASK_PREFLIGHT_BUILD_REPORT.md` — the shadow-backend reference (the checkpoint 7.3, build SHA a7b886d3 — the naming: "trident checkpoint 7.3", NOT Manta).
10. `context_management/` — the canon docs (the DECISION_CHAIN D50-D61, the NEXT_STEPS, the EVIDENCE_STATE, the COMPACTION_SURVIVAL).
11. `.trident/wave-audit/` — the wave audits (the wave-w4-w5.md + the wave1-temporal through wave5-g2-parallel).

---

## PART 6 — THE HONEST WORD TO THE FRESH SESSION

You are taking over a system that is HALF-TRUTH: the deterministic reasoning core is real (the EU LONG Δ0.8p is a genuine reproduction of the operator's #2 via the phantom-BoM exemption + the chaining + the forward-position predicate), but the emissions are NOT the golden trades (1/5 convergence), the EU/GU RRRs are fabricated artifacts (the forced 2.5), the LLM never fired, and the operator has redirected the architecture (the shadow dead → the headed agent in-session). READ the FAILURE_LOG before any work — the slop register is the map of what not to do. READ the SHADOW_REWIRE_SPEC before any shadow-adjacent work — the rewire is the operator's directive #1. READ the NEXT_STEPS for the work order — STEP 1 (the grounding WARN) is the easy first fix; STEP 3 (the TP substrate) is the deep fix; STEP 2 (the headed agent) is the architecture turn. The operator's honesty standard is absolute: the TRUE state recorded, never the claimed state; the golden convergence is the ONLY metric; the doctrine quoted, never synthesized.

---

## PART 7 — THE FRESH SESSION'S ACTIVATION SEQUENCE (the entry protocol)

1. **READ this package in order:** the README → the BUILD_REPORT → the DEBUG_LOG → the FAILURE_LOG → the SHADOW_REWIRE_SPEC → the MACRO_ARCHITECTURE → the NEXT_STEPS.
2. **READ the canon:** the L2 spec (`MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md`, 2,051L) + the LEXICON SPEC + the audit process + the build report ENTRY 5 + the DECISION_CHAIN D50-D61.
3. **RUN the zero-trust battery:** tsc 0 · the frozen pair 91294083/33914c89 · the report determinism ×2 · the diag-reasoning-chain run (the key exported from ~/.bashrc).
4. **EXECUTE the NEXT_STEPS in order:** STEP 1 (the grounding WARN — the operator's D2) → STEP 2 (the headed agent — the operator's D1) → STEP 3 (the TP substrate — the D37 class) → STEP 4 (the pipeline STEP) → STEP 5 (the golden gate) → STEP 6 (the entry precision) → STEP 7 (the canon docs).
5. **REPORT at gates with the mechanical evidence:** the sha256, the diag outputs, the golden-convergence table per emission, the wall time (≤ 5 min), the per-hunk verdicts in the wave audits.
6. **The operator's visibility:** the reasoning chain's agent-in-session analysis MUST appear in the pipeline's stream — the operator sees the forward-position reasoning, the anchor reasoning, the validation reasoning.

## PART 8 — THE OPERATOR'S STANDING LAWS (THE DOCTRINE THE SYSTEM SERVES — VERBATIM)

1. THE FORWARD-REASONING LAW: "THIS is the root cause of literally ALL fucked trades... the lack of forward looking reasoning and logic"
2. THE REASONING-TOKEN LAW: "My analysis in the golden doc for EU trades is literally EXACTLY what the reasoning tokens should look like as a baseline reference"
3. THE TOKEN-SET LAW: "1 candle = 1 token. 1 token by itself does not provide any meaningful data. A set of tokens in a structured dataset = relevant context (TTE shapes)"
4. THE CANDLE-GROUP LAW: "the group of relevant candles near a zone are the candles that actually touch the zone and the context/storyline of the candles BEFORE they touch the zone + what is going to happen after they touch (post reaction move)"
5. THE RRR LAW: "RRR is a CONSEQUENCE, not a target" + "the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter" + "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."
6. THE ENFORCEMENT LAW: "a refine/retry is correct. not a hard throw... only hard throw SPECIFIC MICRO COMPONENTS after they have failed 3 refinements and then full data needs to be stored in an internal SQLite db... at the end of the pipeline all failure data needs to be synthesized and delivered with the final output + clear next steps"
7. THE CASCADE LAW: "EACH PAIR RUNS ITS OWN NATIVE PAIR-ISOLATED E1/E2/E3. THEN DXY'S E2 + E3 OUTPUT CASCADES ON TOP OF THE EU/GU PAIR NATIVE E1 ANCHORS. IT DOES NOT OVERWRITE OR SUPERSEDE IT IS FUCKING COMPLIMENTARY."
8. THE MACRO-AUTHORITY LAW: "they ARE allowed to have their own mechanics but unified macro signal has authority"
9. THE MIRROR LAW: "Everything I found on this EU chart maps 1:1 to DXY EXACTLY simply in the inverse direction. All the zone elements are the same, shapes, trade setups, etc LITERALLY EVERYTHING IS THE SAME the only thing that changes are the actual price levels between the pairs."
10. THE ZONE-ELEMENT LAW: "we are matching ZONE ELEMENTS not fucking price levels. a BoM on EU that is 30 pips away could be 70 pips away on GU. It is still moving to the same E1 zone. That is the fucking point"
11. THE PHANTOM-BoM LAW: "a phantom BoM zone... a MoM-disguised BoM... functions as a BoM zone" — the type-2 virgin MoM = the fortress.
12. THE VIRGIN-DEATH-SCOPE LAW: "the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and 1H type 1 virgin MoMs" + "ALL 4H zones WILL have at least 1 reaction before mitigation"
13. THE TF-HIERARCHY LAW: "the 4H King (the E2 shape chain) · the 1H General (the E3 trade setups) · the 30m Captain (the per-trade context)" — HTF > LTF.
14. THE TEMPORAL LAW: "TODAY IS WHATEVER DATE WE SET WHEN RUNNING THE PIPELINE. THERE IS NO FUCKING FORWARD LOOKING."
15. THE RECENCY LAW: "DO NOT ever use 1 week old candles to make decision on E1/E2/E3 mechanics to today's trades. EVER."
16. THE GOLDEN-ORACLE LAW: "make sure this is clearly commented and labelled in the codebase as TEMPORARY ARCHITECTURE... this should NOT BE CORE INFRA once everything is solid this should be removed completely. The agent/codebase must be able to self validate based on RULES and LOGIC not a hardcoded data set."
17. THE 3-PIP LAW: "the golden standard at 3 pips after EVERY change — not 30, not 10, THREE"
18. THE SHADOW-AGENT LAW (NOW SUPERSEDED BY D1): "lets have an embedded shadow agent or shadow-enhanced tool call right now so it is time efficient... deepseek v4 flash via opencode go as the model" — the 2026-08-07 D1 supersedes: the shadow is dead, the headed agent in-session.
19. THE STALL-DETECTOR LAW: "should be a STALL DETECTOR for the actual shadow backend not a dumb fucking wall clock on the entire tool itself"
20. THE TOPOLOGY LAW: "3 pairs - each pair can be done async. N parallel pipelines can run per pair. Once they are all done the DXY cascade can be layered on top as a macro signal to refine the other pairs against. That is the sequential macro level step 2, but each micro level pair specific pipeline can run in parallel"

## PART 9 — THE COMPACTION-PROOF SUMMARY (THE ONE-PAGE CANON)

1. The reasoning chain = the 11-token forward engine between E2 and E3 — the operator's missing judgment layer.
2. Tokens 1-7 = the deterministic 70% (ms-scale). Tokens 8-11 = the agent-in-session reasoning (the operator's D1 — the shadow dead).
3. **Tokens 8/10 run in PARALLEL** (C1); token9 sync; token11 after assembly.
4. **All 3 pairs + N lanes run in PARALLEL** (C3 micro); the DXY cascade AFTER as the macro refinement (the ONLY sequential step).
5. **The timeout = the SSE idle-window stall detector** (C4) — kills stalls, never working generations.
6. **The grounding violations WARN + continue** (the operator's D2) — never a hard-kill; the hard-throw only after 3 refinements.
7. The failure store = the SQLite chain_failures table (week + reason indexes) + the synthesis.
8. The phantom-BoM exemption at shape-brain.ts:1150 (the all-4 predicate) + the unified macro authority (the MACRO lane).
9. The acceptance = the Monday goldens (G1-G10) — the EU LONG Δ0.8p the current hit — the performance gate G9 (≤ 5 min).
10. The frozen pair byte-identical (sl-lmv 91294083 · trade-dedup 33914c89) · the determinism ×2 · the zero broken windows.
11. **THE HONEST GAP:** 1/5 golden convergence — the other 4 emissions miss (the EU SHORT Δ11.7p, the DXY LONG Δ9.6p, the DXY SHORT Δ19.1p, the GU LONG Δ8.8p) + the EU/GU RRRs are the degenerate forced-2.5 artifacts (the D37 class — the NEXT_STEPS STEP 3).

*END OF THE README — the entry. Read the BUILD_REPORT → the DEBUG_LOG → the FAILURE_LOG → the SHADOW_REWIRE_SPEC → the MACRO_ARCHITECTURE → the NEXT_STEPS. The operator's directives (D1-D6) + the standing laws (PART 8) are the law. The honest state: the deterministic core works, the shadow is dead (the headed agent next), the TP substrate is broken (STEP 3). <!-- DOC-COMPLETE -->*
