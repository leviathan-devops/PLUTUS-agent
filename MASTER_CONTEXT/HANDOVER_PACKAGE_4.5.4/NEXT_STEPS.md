# THE NEXT STEPS — THE CLEANUP + THE WIRING (THE PRECISE ORDER)

**Date:** 2026-08-07 · **Status:** THE FRESH SESSION'S WORK ORDER — what to fix, in order, to land the reasoning chain as a STEP in the tool chain pipeline
**The authorities:** the SHADOW_REWIRE_SPEC (the shadow → the headed agent) · the L2 spec (`MASTER_CONTEXT/PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC.md`, 2,051 lines) · the LEXICON SPEC · the FAILURE_LOG (the slop never repeated)

---

## THE WORK ORDER (in dependency order)

### STEP 1 — THE GROUNDING VIOLATIONS BECOME A WARN (the operator's directive #2 — the EASY, the FIRST)

**The what:** the SHADOW_SHAPE_VIOLATION checks (shadow-agent.ts:447/535 + the checkDirectionOrder at :288-291) currently REJECT the response → the chain treats the shadow as failed → the deterministic fallback. Convert them to the WARN semantics: the violation is recorded as a refinement warning WITH the context (the check, the token, the sourceRef, the value, the proposed correction), logged to the failure store (the WARN type), and the LOOP CONTINUES with the partial values as the refinement inputs. The hard-throw ONLY after 3 failed refinements.

**The why:** the operator: "these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop." The refine/retry doctrine: *"a rejected setup is not a dead setup... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it."*

**The gate:** the chain runs with the violations WARNED (the failure store records the WARN rows) + the loop continues (the stats: refinements > 0, never the hard-throw on the first violation).

### STEP 2 — THE SHADOW AGENT RETIRED → THE HEADED AGENT IN SESSION (the operator's directive #1)

**The what:** per the SHADOW_REWIRE_SPEC — the shadow-agent (the embedded LLM call) is RETIRED as the LLM executor; the ACTUAL HEADED AGENT (the primary opencode agent) does the reasoning/inference IN SESSION, visible in the pipeline's stream. The chain's token 8/10/11 hooks expose the reasoning contract (the ForwardProjectionInput/AnchorInput/ValidationInput shapes) as the pipeline STEP's interface; the agent performs the reasoning; the chain records the verdicts to the ledger.

**The why:** the operator: "replace with the actual headed agent in opencode doing the reasoning/inference in session so we can see everything before you derail this into a bunch of fucking slop."

**The gate:** the pipeline STEP 4 (the reasoning) shows the agent's reasoning in the stream (the forward-position analysis, the anchor analysis, the validation analysis) + the ledger records the verdicts + the failure store logs the WARNs.

### STEP 3 — THE EU/GU TP SUBSTRATE FIX (the D37 class — the SLOP-01 kill)

**The what:** the `computeMirrorTP` null on the EU/GU mirror lanes → the forced-2.5-RRR ratio-extension fallback (reasoning-chain.ts:789-790). The fix: the E2-projected opposing zone's FULL-MODEL resolution — the demandZoneId/supplyZoneId resolved to the zone's internal LQZ (the ZR-3.3: the OB-id-vs-LMV-candidates mismatch fixed) — the TP at the structurally-equivalent opposing BoM wall (the ZR-3.4: the E1-pressure wall classification — the shallow LQZ shelves pass-through). **The ratio-extension REMOVED as a TP source** (it fabricates the RRR — the operator's law: *"RRR is a CONSEQUENCE, not a target"*).

**The why:** the operator: "How is DXY higher R than EU + GU that makes no sense" — because the DXY lane's structural TP resolves while the EU/GU mirrors degenerate to the forced 2.5. The EU/GU must produce the STRUCTURAL RRRs (the operator's goldens: EU 3.18/2.92/4.4, GU 8.94).

**The gate:** the EU/GU emissions' RRRs are NO LONGER all 2.50 — they show the structural variety (the computeMirrorTP resolves the opposing BoM walls) + the EU LONG Δ0.8p held.

### STEP 4 — THE REASONING CHAIN WIRED AS THE PIPELINE STEP (the tool chain integration)

**The what:** the reasoning chain becomes `plutus-pipeline-reasoning` — the STEP 4 in the tool chain pipeline between the shapes (STEP 3) and the setups (STEP 5) — per the MACRO_ARCHITECTURE's PART 2. The pipeline runs: harvest → zones → shapes → REASONING (the agent-in-session, the 11 tokens) → setups → the report + the golden gate.

**The why:** the operator: "how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline" — the chain is a STEP, not a side-system.

**The gate:** the pipeline's STEP 4 runs the reasoning chain + the report shows the TradeProjections + the golden gate measures the convergence.

### STEP 5 — THE GOLDEN GATE (W6 — the acceptance)

**The what:** build diag-reasoning-chain-golden.ts — the G1-G10 acceptance (the L2 spec PART 14): the Monday golden targets at ≤3 pips (THE ONLY tolerance), the E3-NEVER compliance, the hard-throw discipline, the temporal gate (the negative control), the performance gate (≤ 5 min), the parallel-equivalence. The golden const = the MEASUREMENT ORACLE ONLY (TEMPORARY ARCHITECTURE — the pipeline never reads it).

**The why:** the acceptance oracle the operator demands — the Monday goldens measured at 3 pips with the mechanical evidence per gate.

**The gate:** `bun diag-reasoning-chain-golden.ts && echo PASS` — exit 0/1 with the per-gate verdicts + the deltas.

### STEP 6 — THE ENTRY PRECISION (the 4 misses + the GU Δ8.8p)

**The what:** the remaining misses: the EU SHORT Δ11.7p · the DXY LONG Δ9.6p · the DXY SHORT Δ19.1p · the GU LONG Δ8.8p — the anchor refinements: the entry at the operator's exact LQZ near edges, the SL at the ladder-steps rule (3p outside the back edge / 1-2p inside the next step), the TP at the strength-driven edges. The GU Monday's demand pick at the operator's 1.33330 (the demand 1.33270 is Δ6.0p — the FX-proven rung resolution).

**The why:** the golden convergence is the ONLY metric — 1/5 → toward 5/5.

**The gate:** the golden hits ≥ 2/5, then ≥ 3/5, progressing toward the operator's acceptance.

### STEP 7 — THE CANON DOCS UPDATE

**The what:** the build report ENTRY 6 (the rewire + the fixes) + the DECISION_CHAIN D62 (the shadow retirement + the headed-agent ruling) + the NEXT_STEPS + the EVIDENCE_STATE + the COMPACTION_SURVIVAL (the handover package as the read-first).

---

## THE DO-NOT LIST (the slop never repeated — the FAILURE_LOG)

- NO ratio-extension TP fallback (the forced-2.5-RRR — the RRR-as-target, the operator's ban).
- NO grounding hard-kill (the violations WARN + the loop continues).
- NO wall-clock timeout (the SSE idle detector only).
- NO sequential LLM calls (the pairs/lanes parallel).
- NO shadow-agent as the hidden LLM executor (the headed agent in-session, visible).
- NO "no regression" on a degenerate baseline (measure the golden convergence + the RRR authenticity).
- NO emissions presented without the golden-convergence table.
- NO fabricated LLM success (the llm 0 state recorded honestly).
- NO wave dispatch without the task tool (the ONLY spawn path).

## THE VERIFICATION BATTERY (every step)

1. bunx tsc --noEmit — exit 0.
2. sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts — 91294083 / 33914c89 (the frozen pair).
3. bun diag-reasoning-chain.ts (the key exported) — the stats + the golden hits.
4. bun diag-reasoning-chain-golden.ts (after STEP 5) — the G1-G10 verdicts.
5. The failure store — the WARN rows (never the hard-kill on the first violation).
6. The wall time — ≤ 5 min (the G9 gate).
7. The golden-convergence table per emission (never a bare "the trades generated").

---

## THE FULL PER-STEP CONTRACTS (the fresh session's implementation detail)

### STEP 1 DETAIL — THE GROUNDING WARN (the operator's D2 — the EASY, the FIRST)

**The exact change (shadow-agent.ts + reasoning-chain.ts):**

```ts
// THE OLD (the hard-kill — SLOP-02):
client.lastError = 'SHADOW_SHAPE_VIOLATION: forwardPosition must be a number';
return errResult(client.lastError);   // the chain treats the shadow as FAILED → the fallback

// THE NEW (the WARN — the operator's D2):
const warn = groundingWarn({
  check: 'SHADOW_SHAPE_VIOLATION',
  token: 'forward-position',
  sourceRef: 'shadow:forwardPosition',
  value: agentVerdict.forwardPosition,          // the offending value
  proposed: 'the forwardPosition must be a number — use the deterministic skeleton value as the fallback and continue the loop',
});
recordFailure({ pipelineStage: 'E3', failureType: 'GROUNDING_WARN', pair,
                setupId, tokenFailures: [warn], ledger, nextSteps: [...] });
// THE LOOP CONTINUES — the warn is the refinement input for the next iteration.
```

**The gate:** the chain runs with the violations WARNED (the failure store records the GROUNDING_WARN rows) + the loop continues (the stats: refinements > 0, never the hard-throw on the first violation).

### STEP 2 DETAIL — THE SHADOW RETIRED → THE HEADED AGENT IN SESSION (the operator's D1)

**The exact change:** per the SHADOW_REWIRE_SPEC — the shadow-agent (the embedded LLM call) is RETIRED as the LLM executor; the ACTUAL HEADED AGENT (the primary opencode agent) does the reasoning/inference IN SESSION, visible in the pipeline's stream. The chain's token 8/10/11 hooks expose the reasoning contract (the ForwardProjectionInput/AnchorInput/ValidationInput shapes) as the pipeline STEP's interface; the agent performs the reasoning; the chain records the verdicts to the ledger. The conversion pseudocode in the SHADOW_REWIRE_SPEC PART 6.

**The gate:** the pipeline STEP 4 (the reasoning) shows the agent's reasoning in the stream (the forward-position analysis, the anchor analysis, the validation analysis) + the ledger records the verdicts + the failure store logs the WARNs.

### STEP 3 DETAIL — THE EU/GU TP SUBSTRATE FIX (the D37 class — the SLOP-01 kill)

**The exact change (reasoning-chain.ts:780-790):**

```ts
// THE OLD (the ratio-extension — the RRR-as-target slop):
} else {
  tp = direction === 'LONG' ? entry + RRR_GATE * risk : entry - RRR_GATE * risk;
  tpMethod = 'ratio-extension (RRR gate)';
}

// THE NEW (the E2-projected opposing zone's full-model resolution — the ZR-3.3):
//   1. RESOLVE the E2's projected opposing zone (the demandZoneId for a SHORT /
//      the supplyZoneId for a LONG) to the zone's internal LQZ:
//      the demandZoneId is an OB-zone id → find the zone in the FULL model →
//      the TP = the zone's internal LQZ (the LMV rung fully inside, the Earth+Fire)
//      → its defendedEdge
//      the demandZoneId is an LMV-rung id → the TP = the rung's defendedEdge
//      the zone has no internal LQZ → the TP = the zone's defended edge
//   2. The WALL CLASSIFICATION (the ZR-3.4 — the E1-pressure, never the candle-count):
//      the Law-14 cap-walk's wall classification from the E1 pressure mechanics
//      (the BoM/MoM + the 6D confluence + the Earth+Fire) — the shallow LQZ shelves
//      (the candle-count zfp-20) are PASS-THROUGH
//   3. The SIGNIFICANCE RANKING (the operator's order): E1 first (the confluence/ZFP/
//      BoM-MoM/Earth+Fire), E2 second (the shape chain's projection), the candle
//      mechanics third
//   4. THE RATIO-EXTENSION REMOVED as a TP source — it fabricates the RRR.
```

**The why:** the operator: "How is DXY higher R than EU + GU that makes no sense" — because the DXY lane's structural TP resolves while the EU/GU mirrors degenerate to the forced 2.5. The EU/GU must produce the STRUCTURAL RRRs (the operator's goldens: EU 3.18/2.92/4.4, GU 8.94).

**The gate:** the EU/GU emissions' RRRs are NO LONGER all 2.50 — they show the structural variety (the computeMirrorTP resolves the opposing BoM walls) + the EU LONG Δ0.8p held.

### STEP 4 DETAIL — THE REASONING CHAIN WIRED AS THE PIPELINE STEP (the tool chain integration)

**The what:** the reasoning chain becomes `plutus-pipeline-reasoning` — the STEP 4 in the tool chain pipeline between the shapes (STEP 3) and the setups (STEP 5) — per the MACRO_ARCHITECTURE's PART 2. The pipeline runs: harvest → zones → shapes → REASONING (the agent-in-session, the 11 tokens) → setups → the report + the golden gate.

**The why:** the operator: "how this ties in to the reasoning chain I said to wire in as a STEP in the tool chain pipeline" — the chain is a STEP, not a side-system.

**The gate:** the pipeline's STEP 4 runs the reasoning chain + the report shows the TradeProjections + the golden gate measures the convergence.

### STEP 5 DETAIL — THE GOLDEN GATE (W6 — the acceptance)

**The what:** build diag-reasoning-chain-golden.ts — the G1-G10 acceptance (the L2 spec PART 14):

| G# | The golden | The pass condition |
|---|---|---|
| G1 | EU LONG emission (the phantom-BoM fortress) | ≥1 LONG projection whose token-1 verdict is PHANTOM_BOM on [1.14145-1.14000]; the entry within 2 pips of 1.14110; the anchors trace (the E3-NEVER) |
| G2 | Native first, cascade complementary | the Monday EU LONG exists in the NATIVE lane; any cascade projection is complementary (never overwrites, never duplicates) |
| G3 | GU Monday direction = LONG (the operator's WL) | the GBP/USD Monday projection's direction === 'LONG'; the R divergence recorded in the divergences + the store (MACRO_DIVERGENCE); the macro wins |
| G4 | EU/DXY 1:1 inverted mirror | for the EU LONG, a DXY SHORT exists with matching ZONE ELEMENTS (never price levels); the linkedMirror resolves |
| G5 | E3-NEVER compliance | 100% of projections pass assertProjectionContract; 0 anchor-less |
| G6 | Hard-throw discipline | 0 REFINEMENT_EXHAUSTED on the golden week; the store's week row count = 0 hard-throws |
| G7 | No regression of the correct trades | the 13 unique trades still emit correctly; the util findings show no fixed-width SL regression |
| G8 | Temporal gate respected | no chain computation reads bars beyond ANCHOR_MS; the negative control (a later anchor) does not change the projections' anchors |
| G9 | THE PERFORMANCE GATE | the Monday diag completes ≤ 5 min wall time (was 30-50 min); the stall detector never kills a working generation |
| G10 | THE PARALLEL-EQUIVALENCE GATE | the parallel run's projections byte-identical to the sequential run's (the determinism preserved under the Promise.all) |

**The golden const = the MEASUREMENT ORACLE ONLY (TEMPORARY ARCHITECTURE — the pipeline never reads it).** The golden levels: DXY LONG 100.945/100.905/101.115 · DXY SHORT 101.140/101.200/100.845 · EU SHORT 1.14395/1.14485/1.14110 · EU LONG 1.14110/1.13990/1.14460 · GU LONG 1.33330/1.33250/1.33965. The anchors: ANCHOR_MS=1783702800000, WEEK_START_MS=1783296000000, DXY_PIP=0.01, EU/GU PIP=0.0001, CLUSTER_TOLERANCE_PIPS=2.

**The gate:** `bun diag-reasoning-chain-golden.ts && echo PASS` — exit 0/1 with the per-gate verdicts + the deltas.

### STEP 6 DETAIL — THE ENTRY PRECISION (the 4 misses + the GU Δ8.8p)

**The what:** the remaining misses: the EU SHORT Δ11.7p · the DXY LONG Δ9.6p · the DXY SHORT Δ19.1p · the GU LONG Δ8.8p — the anchor refinements: the entry at the operator's exact LQZ near edges, the SL at the ladder-steps rule (3p outside the back edge / 1-2p inside the next step — the operator: "3 pips outside the back edge of the entry zone, or 1-2 pips inside the close edge of the *next rung* relevant zone... you need to look at the zones like ladder steps"), the TP at the strength-driven edges (the strong zone → the close edge + the spread; the weak zone → the far edge). The GU Monday's demand pick at the operator's 1.33330 (the demand 1.33270 is Δ6.0p — the FX-proven rung resolution — diag-lmv-golden-fx proved the machine's rungs ARE at the operator's levels, Δ0.5-1.0p; the resolution must land them).

**The why:** the golden convergence is the ONLY metric — 1/5 → toward 5/5.

**The gate:** the golden hits ≥ 2/5, then ≥ 3/5, progressing toward the operator's acceptance.

### STEP 7 DETAIL — THE CANON DOCS UPDATE

**The what:** the build report ENTRY 6 (the rewire + the fixes) + the DECISION_CHAIN D62 (the shadow retirement + the headed-agent ruling) + the NEXT_STEPS + the EVIDENCE_STATE + the COMPACTION_SURVIVAL (the handover package as the read-first).

---

## THE VERIFICATION BATTERY (every step — the zero-trust standard)

1. bunx tsc --noEmit — exit 0.
2. sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts — 91294083 / 33914c89 (the frozen pair).
3. bun report-v452.ts --day=2026-07-06 ×2 — the identical sha256 (the determinism).
4. bun diag-reasoning-chain.ts (the key exported from ~/.bashrc) — the stats + the golden hits.
5. bun diag-reasoning-chain-golden.ts (after STEP 5) — the G1-G10 verdicts.
6. The failure store — the GROUNDING_WARN rows (never the hard-kill on the first violation).
7. The wall time — ≤ 5 min (the G9 gate).
8. The golden-convergence table per emission (never a bare "the trades generated").

*END OF THE NEXT STEPS — the cleanup + the wiring in order: the WARN (STEP 1) → the headed agent (STEP 2) → the TP substrate (STEP 3) → the pipeline STEP (STEP 4) → the golden gate (STEP 5) → the entry precision (STEP 6) → the canon docs (STEP 7). The operator's directives are the authority; the FAILURE_LOG's slop is never repeated. <!-- DOC-COMPLETE -->*
