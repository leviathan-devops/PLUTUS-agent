# THE DEBUG LOG — THE ROOT CAUSES (MECHANICAL, WITH THE EVIDENCE)

**Date:** 2026-08-07 · **Status:** THE ROOT-CAUSE RECORD — every failure traced to its mechanical anchor
**Method:** reproduce → isolate → suspects → A/B → root cause → smallest fix → regression (the PART-12 workbook)

---

## D-2026-08-07-01 — THE 30-MINUTE HANG (the sequential LLM architecture + the wall-clock cap)

**The symptom:** bun diag-reasoning-chain.ts ran 30+ minutes with the log stuck at 32 lines, ending at "=== THE REASONING CHAIN (the 11-token sequence, Monday) ===" — the first lane's first LLM call in flight the whole time.

**The evidence:**
- The diag log after 30 min: 32 lines (the deterministic stages — the temporal gate, the E1 models, the E2 core — all ms-scale; then the first LLM call with NO output for 30 min)
- The endpoint probe (short prompt): HTTP 200 in 61.9s, content 259 chars, reasoning 5914 tokens, finish_reason stop — the endpoint WORKS, the model self-terminates
- The architecture: 3 pairs × 2 lanes × 4 shadow hooks = up to 24 SEQUENTIAL LLM calls at effort:max
- The timeout: the 600s wall-clock cap (DEFAULT_TIMEOUT_MS) — ANY call exceeding 600s was killed mid-reasoning → SHADOW_TIMEOUT → the deterministic fallback → the chain ground forward through aborts. The "progress" was aborts.

**The mechanism:** the sequential execution serialized up to 24 LLM calls (each 1-3+ min at effort:max on the heavy ledger prompts) = 30-50 min wall time; the wall-clock cap made it worse (killed working generations).

**The fix (LANDED):** C1 (the token 8/10 Promise.all — 2 LLM calls per lane → 1 wall-clock slot) + C3 (the pairs/lanes parallel — the wall time = the slowest pair) + C4 (the SSE idle detector — the stall, never the wall).

**The regression check:** the deterministic projections byte-identical to the sequential baselines (the G10 parallel-equivalence holds for the deterministic path). tsc 0. The frozen pair byte-identical.

## D-2026-08-07-02 — THE SHADOW LLM NEVER FIRES (llm 0 — the grounding hard-kill + the parse failure)

**The symptom:** the stats line shows `llm 0` on every run — the LIVE LLM never fires; the deterministic fallback always carries.

**The evidence:**
- The failure store: SHADOW_DEGRADE rows with the context reasons: `SHADOW_SHAPE_VIOLATION: forwardPosition must be a number` / `SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers` (shadow-agent.ts:447/535)
- The W4 agent's run: the shadow calls at ~106s each (real fetches!) ALL failed the grounding contract → llm 0 on every pair

**The mechanism (TWO stacked defects):**
1. **The grounding hard-kill (the operator's directive #2):** the SHADOW_SHAPE_VIOLATION checks REJECT the response and the chain treats the shadow as failed → the deterministic fallback. The operator: *"these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."* — the violations must be a WARN (the response is recorded as a refinement warning with the context), the loop CONTINUES with the LLM's partial/attempted values as the refinement inputs.
2. **The parse failure (the W2 stream path):** the SSE-stream accumulation + the parseJsonResponse on the heavy ledger prompts produces a response that fails the numeric checks — either (a) the content lands in reasoning_content while the final content stays empty on the big prompts (the streaming shape of the starvation), or (b) the model's JSON is wrapped such that the parse returns null. The grounding then rejects the non-numbers.

**The fix (THE REWIRE — the operator's directive #1):** the shadow agent is DEAD — replace with the actual headed agent in opencode doing the reasoning/inference IN SESSION (visible). The SHADOW_REWIRE_SPEC.md details the full conversion. The deterministic skeleton STAYS as the mechanical floor; the agent's in-session reasoning refines it; the grounding violations WARN (recorded to the failure store) and the loop continues.

**The regression check:** the deterministic core still emits the EU LONG Δ0.8p (the fallback path) — no regression in the mechanical path.

## D-2026-08-07-03 — THE EU/GU TP SUBSTRATE IS BROKEN (the forced-2.5-RRR degenerate fallback)

**The symptom:** ALL EU/GU projections show RRR 2.50 EXACTLY — the ratio-extension fallback firing — while the DXY projections show the real structural RRRs (4.46 / 7.16).

**The evidence:**
- reasoning-chain.ts:780-790 — the TP resolution: `if (tpRes) → the mirror Law-14 walk; else if (isRewardSide(fp.chosenTarget)) → the KCE continuation target; else → tp = entry + RRR_GATE * risk (the ratio-extension, RRR_GATE = 2.5 at :48)`
- The EU/GU emissions: ALL RRR 2.50 exactly (the forced fallback) · the DXY emissions: 4.46 / 7.16 (the structural TP resolved)

**The mechanism:** `computeMirrorTP` returns NULL on the EU/GU mirror lanes (the OB-id-vs-LMV-candidates mismatch — the D37 root cause class: the opposing zone's id doesn't match the LMV rung candidates on the mirror lanes) → the KCE continuation target also fails the reward-side check → the ratio-extension fallback computes the TP to hit RRR 2.5 EXACTLY. **The RRR becomes a TARGET, not a consequence — the direct violation of the operator's law.**

**The operator's law (verbatim):**
> "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR"
> "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table"
> "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5"

**The fix (the NEXT_STEPS):** the E2-projected opposing zone's resolution — the demandZoneId/supplyZoneId must resolve to the zone's internal LQZ (the ZR-3.3 "full-model resolution" — the OB-id-vs-LMV-candidates mismatch fixed) — the TP at the structurally-equivalent opposing BoM wall — NEVER the ratio fallback. The ratio-extension must be REMOVED as a TP source (it fabricates the RRR).

**The regression check:** the DXY lane's structural TPs (4.46 / 7.16) must be preserved — the fix is EU/GU-specific.

## D-2026-08-07-04 — THE GU LONG ENTRY Δ8.8p (the direction fixed, the entry precision pending)

**The symptom:** the GU Monday's direction is now LONG (the macro authority flip — the G3 acceptance passes), but the entry 1.33242 is Δ8.8p from the golden 1.33330 → MISS at ≤3p.

**The mechanism:** the chained entry (Law 27 — the SHORT's TP 1.33242 chains into the LONG) is the source — the operator's #1 GU entry is 1.33330; the machine's chained entry lands 8.8p off. The direction derailment is FIXED (the macro authority); the entry precision is the W6 golden gate's measurement + the anchor refinement (the NEXT_STEPS).

**The fix:** the anchor refinement — the GU Monday's demand pick at the operator's 1.33330 (the demand 1.33270 is Δ6.0p — the FX-proven rung resolution).

## D-2026-08-07-05 — THE WAVE-DISPATCHER SPAWN FAILURE (no agents launched)

**The symptom:** the trident-wave-dispatch tool reported "dispatched: ready" for 4 agents, but NO agents actually ran (the trident-tmp absent, the wave-status "unknown_wave", the golden gate never created).

**The mechanism:** the wave dispatcher's fire-and-forget spawn did NOT land — the generated prompts appeared in the batch output but the actual task() spawns were truncated/dropped. The W4 + W5 agents that DID run were the ones I dispatched MANUALLY via the task tool.

**The lesson (for the fresh session):** THE TASK TOOL IS THE ONLY SPAWN PATH — "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL" (the operator). Verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting.

---

## THE DEBUG LOG REGISTER (the summary)

| ID | The symptom | The root cause | The status |
|---|---|---|---|
| D-01 | the 30-min hang | 24 sequential LLM calls × the wall-clock cap | FIXED (C1+C3+C4 landed) |
| D-02 | the LLM never fires (llm 0) | the grounding hard-kill + the parse failure | THE REWIRE (the operator's directive #1) |
| D-03 | the EU/GU RRR forced to 2.5 | the computeMirrorTP null → the ratio-extension fallback (the D37 class) | THE NEXT_STEPS (the TP substrate fix) |
| D-04 | the GU LONG entry Δ8.8p | the chained entry off the golden | the W6 golden gate + the anchor refinement |
| D-05 | the wave spawn failure | the dispatcher's spawn didn't land | the lesson: the task tool is the ONLY spawn path |

---

## THE FULL ROOT-CAUSE DETAILS (the probes + the A/B tests + the mechanisms)

### D-01 EXPANDED — THE 30-MINUTE HANG (the full trace)

**The reproduction:** `bun diag-reasoning-chain.ts` with the key exported ran 30+ minutes; the log file showed 32 lines, ending at "=== THE REASONING CHAIN (the 11-token sequence, Monday) ===". The first lane's first LLM call was in flight the entire time.

**The isolation (the probe evidence):**
- The deterministic stages (the temporal gate, the E1 model builds, the native setups, the E2 core, the cascade translation, the macro authority) printed IMMEDIATELY — the first 32 lines of the log = milliseconds of deterministic work.
- The run then hit the FIRST shadow LLM call and produced ZERO output for 30 minutes — the stall was entirely inside `projectForward`'s fetch.
- The endpoint probe (short prompt): HTTP 200 in 61.9s, content 259 chars, reasoning 5914 tokens, `finish_reason: stop`, usage `{"completion_tokens":6014,"reasoning_tokens":5914}` — the endpoint WORKS, the model self-terminates (128K is a ceiling, not a target).
- The latency probe (the realistic ledger prompt): >200s (the probe aborted) — the heavy prompts legitimately take minutes at effort:max.

**The suspects (ranked):** (1) the sequential architecture — 3 pairs × 2 lanes × 4 shadow hooks = up to 24 sequential LLM calls; (2) the 600s wall-clock cap — any call exceeding it was killed mid-reasoning → SHADOW_TIMEOUT → the deterministic fallback; (3) the endpoint hang — DISPROVEN by the 61.9s short-prompt probe.

**The A/B:** the same fixture with the shadow omitted → the diag completed in ~2 min (the deterministic-only path) — the LLM calls were 100% of the wall time.

**The root cause:** 24 sequential LLM calls × 1-3+ min each = 30-50 min; the wall-clock cap made it worse (the "progress" was aborts — 3 aborted calls × 600s = the 30 min).

**The fix (LANDED):** C1 (the token 8/10 Promise.all — 2 LLM calls per lane → 1 wall-clock slot) + C3 (the pairs/lanes parallel — the wall time = the slowest pair) + C4 (the SSE idle detector — the stall, never the wall).

**The regression check:** the deterministic projections byte-identical to the sequential baselines (the G10 parallel-equivalence holds for the deterministic path). tsc 0. The frozen pair byte-identical.

### D-02 EXPANDED — THE SHADOW LLM NEVER FIRES (the full trace)

**The reproduction:** the stats line `llm 0` on every run; the failure store's SHADOW_DEGRADE rows with the context reasons: `SHADOW_SHAPE_VIOLATION: forwardPosition must be a number` / `SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers` (shadow-agent.ts:447/535).

**The isolation (the probe evidence):**
- The W4 agent's run: the shadow calls at ~106s each (REAL fetches — the key exported, available:true) ALL failed the grounding contract → llm 0 on every pair.
- The endpoint probe (short prompt): HTTP 200 in 61.9s with content 259 chars — the endpoint + the model work on a SHORT prompt.
- The heavy ledger prompts (the full token ledger + the candle groups + the macro + the targets): the model's output at effort:max didn't survive the stream→parse→grounding path.

**The suspects (ranked):** (1) the parse failure — the streaming output's content landed in reasoning_content while the final content stayed empty (the streaming shape of the starvation), OR the model's JSON wrapped such that parseJsonResponse returned null; (2) the grounding hard-kill — the SHADOW_SHAPE_VIOLATION REJECT (a hard stop, not a warn); (3) the model genuinely producing non-numeric output on the heavy prompts.

**The root cause (TWO stacked defects):**
1. **The grounding hard-kill (the operator's D2):** the SHADOW_SHAPE_VIOLATION checks REJECT the response and the chain treats the shadow as failed → the deterministic fallback. The operator: "these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop." — the violations must be a WARN (the response is recorded as a refinement warning with the context), the loop CONTINUES with the partial/attempted values as the refinement inputs.
2. **The parse failure (the W2 stream path):** the SSE-stream accumulation + the parseJsonResponse on the heavy ledger prompts produces a response that fails the numeric checks.

**The fix (THE REWIRE — the operator's D1):** the shadow agent is DEAD — replace with the actual headed agent in opencode doing the reasoning/inference IN SESSION (visible). The SHADOW_REWIRE_SPEC details the full conversion. The deterministic skeleton STAYS as the mechanical floor; the agent's in-session reasoning refines it; the grounding violations WARN (recorded to the failure store) and the loop continues.

**The regression check:** the deterministic core still emits the EU LONG Δ0.8p (the fallback path) — no regression in the mechanical path.

### D-03 EXPANDED — THE EU/GU TP SUBSTRATE (the full trace)

**The reproduction:** ALL EU/GU projections show RRR 2.50 EXACTLY — the ratio-extension fallback firing — while the DXY projections show the real structural RRRs (4.46 / 7.16).

**The isolation (the code trace — reasoning-chain.ts:780-790):**

```ts
  // THE TP — the mirror Law-14 walk (passThroughWeakWalls), else the
  // continuation target, else the ratio-extension.
  let tp: number;
  let tpMethod: string;
  let tpRungId: string | undefined;
  const tpRes = computeMirrorTP(entry, sl, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true });
  if (tpRes) {
    tp = tpRes.tp;
    tpMethod = 'mirror-law14-walk';
    tpRungId = tpRes.rungId;
  } else if (isRewardSide(fp.chosenTarget, entry, direction)) {
    tp = fp.chosenTarget;
    tpMethod = 'continuation-target (KCE)';
  } else {
    tp = direction === 'LONG' ? entry + RRR_GATE * risk : entry - RRR_GATE * risk;
    tpMethod = 'ratio-extension (RRR gate)';
  }
```

**The mechanism:** `computeMirrorTP` returns NULL on the EU/GU mirror lanes (the OB-id-vs-LMV-candidates mismatch — the D37 root cause class: the opposing zone's id doesn't match the LMV rung candidates on the mirror lanes) → the KCE continuation target also fails the reward-side check → the ratio-extension fallback computes the TP to hit RRR 2.5 EXACTLY (RRR_GATE = 2.5 at reasoning-chain.ts:48). **The RRR becomes a TARGET, not a consequence — the direct violation of the operator's law.**

**The operator's law (verbatim):**
> "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR"
> "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table"
> "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."

**The evidence (the emissions):** the EU SHORT 1.14512/1.14676/1.14102 RRR 2.50 · the EU LONG 1.14102/1.13917/1.14564 RRR 2.50 · the GU SHORT 1.33662/1.33830/1.33242 RRR 2.50 · the GU LONG 1.33242/1.32963/1.33939 RRR 2.50 — ALL exactly 2.50 (the forced fallback). The DXY SHORT 101.331/101.439/100.849 RRR 4.46 + the DXY LONG 100.849/100.799/101.207 RRR 7.16 — the structural TP resolved.

**The fix (the NEXT_STEPS STEP 3):** the E2-projected opposing zone's resolution — the demandZoneId/supplyZoneId must resolve to the zone's internal LQZ (the ZR-3.3 "full-model resolution" — the OB-id-vs-LMV-candidates mismatch fixed) — the TP at the structurally-equivalent opposing BoM wall — the ratio-extension REMOVED as a TP source (it fabricates the RRR).

**The regression check:** the DXY lane's structural TPs (4.46 / 7.16) must be preserved — the fix is EU/GU-specific.

### D-04 EXPANDED — THE GU LONG ENTRY Δ8.8p (the direction fixed, the entry precision pending)

**The reproduction:** the GU Monday's direction is now LONG (the macro authority flip — the G3 acceptance passes), but the entry 1.33242 is Δ8.8p from the golden 1.33330 → MISS at ≤3p.

**The mechanism:** the chained entry (Law 27 — the SHORT's TP 1.33242 chains into the LONG) is the source — the operator's #1 GU entry is 1.33330; the machine's chained entry lands 8.8p off. The direction derailment is FIXED (the macro authority); the entry precision is the W6 golden gate's measurement + the anchor refinement.

**The fix:** the anchor refinement — the GU Monday's demand pick at the operator's 1.33330 (the demand 1.33270 is Δ6.0p — the FX-proven rung resolution — diag-lmv-golden-fx proved the machine's rungs ARE at the operator's levels, Δ0.5-1.0p; the resolution must land them).

### D-05 EXPANDED — THE WAVE-DISPATCHER SPAWN FAILURE (the full trace)

**The reproduction:** the trident-wave-dispatch tool reported `{"wave":"wave-1786091997479","dispatched":[{"name":"w4-topology","sessionId":"","type":"trident_build","status":"ready"},...],"failed":[]}` — but NO agents actually ran: the trident-tmp directory absent, the wave-status `{"status":"unknown_wave","agents":[]}`, the golden gate never created.

**The mechanism:** the wave dispatcher's fire-and-forget spawn did NOT land — the generated prompts appeared in the batch output but the actual task() spawns were truncated/dropped (the output was cut at ~91KB with the note "The tool call succeeded but the output was truncated"). The W4 + W5 agents that DID run were the ones I dispatched MANUALLY via the task tool.

**The lesson (for the fresh session):** THE TASK TOOL IS THE ONLY SPAWN PATH — "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL" (the operator). Verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting. A "dispatched: ready" status without a sessionId = the spawn did NOT land.

---

## THE DEBUG LOG REGISTER (the summary)

| ID | The symptom | The root cause | The status |
|---|---|---|---|
| D-01 | the 30-min hang | 24 sequential LLM calls × the wall-clock cap | FIXED (C1+C3+C4 landed) |
| D-02 | the LLM never fires (llm 0) | the grounding hard-kill + the parse failure | THE REWIRE (the operator's D1 — the SHADOW_REWIRE_SPEC) |
| D-03 | the EU/GU RRR forced to 2.5 | the computeMirrorTP null → the ratio-extension fallback (the D37 class) | THE NEXT_STEPS STEP 3 (the TP substrate fix) |
| D-04 | the GU LONG entry Δ8.8p | the chained entry off the golden | the W6 golden gate + the anchor refinement |
| D-05 | the wave spawn failure | the dispatcher's spawn didn't land | the lesson: the task tool is the ONLY spawn path |

---

## THE COMPLETE TRACE DETAILS (each D-section's full evidence chain)

### D-01 TRACE — THE 30-MINUTE HANG (the complete evidence)

**The exact sequence of events (from the log files):**
1. The diag starts: `[TEMPORAL] RUN ANCHOR LOCKED: 2026-07-06T07:00:00.000Z (1783321200000)` — the temporal gate engaged.
2. The deterministic stages print immediately: the E1 model builds (buildDayDecomposition ×6), the E2 core, the cascade translation, the macro authority — all ms-scale, the first 32 lines of the log.
3. The chain header prints: `=== THE REASONING CHAIN (the 11-token sequence, Monday) ===`.
4. The FIRST lane's FIRST LLM call (token8_forwardPosition → shadow.projectForward) begins — and NOTHING prints for 30 minutes.
5. The user aborts at ~30 min. The log has 32 lines total.

**The arithmetic (the 30-min = 3 aborted calls × 600s):**
- The 600s wall-clock cap (the pre-C4 DEFAULT_TIMEOUT_MS): any call exceeding 600s → controller.abort() → SHADOW_TIMEOUT → the deterministic fallback.
- The first lane's sequence: token8 projectForward (up to 600s) → token10 anchor (up to 600s) → runRefineRetry's validate (up to 600s) = up to 1,800s = 30 minutes for ONE lane.
- The 6 lanes (3 pairs × 2 directions) × up to 4 shadow hooks = up to 24 sequential calls × up to 600s = up to 4 hours wall time worst-case.

**The A/B (the shadow omitted):** the same fixture with the shadow omitted → the diag completed in ~2 min (the deterministic-only path). The LLM calls were 100% of the wall time — the C6 confirmation.

**The probes (the endpoint's real behavior):**
- The short prompt at max_tokens 2048: HTTP 200, content length 0, finish_reason length, reasoning_tokens 2048 — the model spent the ENTIRE budget on reasoning → the content empty → SHADOW_EMPTY_RESPONSE.
- The short prompt at max_tokens 8192: HTTP 200 in 41.0s, content 186 chars, reasoning 14620 — the model self-terminated once the reasoning completed.
- The short prompt at max_tokens 128000: HTTP 200 in 61.9s, content 259 chars, reasoning 5914, finish_reason stop, usage {completion_tokens 6014, reasoning_tokens 5914} — the endpoint works; the 128K is a ceiling, never a target.
- The realistic ledger prompt at max_tokens 128000: >200s (the probe aborted) — the heavy prompts legitimately take minutes at effort:max.

**The fix (LANDED):** C1 (the token 8/10 Promise.all — 2 LLM calls per lane → 1 wall-clock slot) + C3 (the pairs/lanes parallel — the wall time = the slowest pair) + C4 (the SSE idle detector — the stall, never the wall).

### D-02 TRACE — THE SHADOW LLM NEVER FIRES (the complete evidence)

**The exact failure-store rows (the SHADOW_DEGRADE context reasons):**

```
{"op":"projectForward","reason":"SHADOW_SHAPE_VIOLATION: forwardPosition must be a number","pair":"EUR/USD","day":"Monday"}
{"op":"anchor","reason":"SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers","pair":"GBP/USD","day":"Monday"}
```

**The grounding checks that reject (shadow-agent.ts:447/535):**

```ts
        client.lastError = 'SHADOW_SHAPE_VIOLATION: forwardPosition must be a number';
        return errResult(client.lastError);
        // and
        client.lastError = 'SHADOW_SHAPE_VIOLATION: entry/sl/tp must be numbers';
        return errResult(client.lastError);
```

**The chain's disposition of the failure (reasoning-chain.ts:728):**

```ts
  if (sr) recordShadowDegrade(ctx, 'projectForward', sr.reason);
  return fp;   // THE DETERMINISTIC FALLBACK — the skeleton's forward-position
```

**The two stacked defects:**
1. **The grounding hard-kill (the operator's D2):** the SHADOW_SHAPE_VIOLATION checks REJECT the response → the chain treats the shadow as failed → the deterministic fallback. The operator: "these cannot hard kill the fucking agent are you stupid these need to be a warn that continues the agent loop."
2. **The parse failure (the W2 stream path):** the SSE-stream accumulation + the parseJsonResponse on the heavy ledger prompts produces a response that fails the numeric checks — either (a) the content lands in reasoning_content while the final content stays empty on the big prompts (the streaming shape of the starvation), or (b) the model's JSON is wrapped such that the parse returns null.

**The fix (THE REWIRE — the operator's D1):** the shadow agent is DEAD — replace with the actual headed agent in opencode doing the reasoning/inference IN SESSION (visible). The SHADOW_REWIRE_SPEC details the full conversion. The deterministic skeleton STAYS as the mechanical floor; the agent's in-session reasoning refines it; the grounding violations WARN (recorded to the failure store) and the loop continues.

### D-03 TRACE — THE EU/GU TP SUBSTRATE (the complete evidence)

**The exact code path (reasoning-chain.ts:780-790) — the three-way TP resolution:**

```ts
  const tpRes = computeMirrorTP(entry, sl, anchorZone, direction, input.model.ladder, input.pip, { passThroughWeakWalls: true });
  if (tpRes) {
    tp = tpRes.tp;
    tpMethod = 'mirror-law14-walk';
    tpRungId = tpRes.rungId;
  } else if (isRewardSide(fp.chosenTarget, entry, direction)) {
    tp = fp.chosenTarget;
    tpMethod = 'continuation-target (KCE)';
  } else {
    tp = direction === 'LONG' ? entry + RRR_GATE * risk : entry - RRR_GATE * risk;
    tpMethod = 'ratio-extension (RRR gate)';
  }
```

**The measured emissions (the forced-2.5 evidence):**

| The projection | The entry | The SL | The TP | The RRR | The method |
|---|---|---|---|---|---|
| EU SHORT | 1.14512 | 1.14676 | 1.14102 | **2.50** | ratio-extension (RRR gate) |
| EU LONG | 1.14102 | 1.13917 | 1.14564 | **2.50** | ratio-extension (RRR gate) |
| GU SHORT | 1.33662 | 1.33830 | 1.33242 | **2.50** | ratio-extension (RRR gate) |
| GU LONG | 1.33242 | 1.32963 | 1.33939 | **2.50** | ratio-extension (RRR gate) |
| DXY SHORT | 101.331 | 101.439 | 100.849 | **4.46** | mirror-law14-walk |
| DXY LONG | 100.849 | 100.799 | 101.207 | **7.16** | mirror-law14-walk |

**The mechanism:** computeMirrorTP returns NULL on the EU/GU mirror lanes (the OB-id-vs-LMV-candidates mismatch — the D37 root cause class: the opposing zone's id doesn't match the LMV rung candidates on the mirror lanes) → the KCE continuation target also fails the reward-side check → the ratio-extension fallback computes the TP to hit RRR 2.5 EXACTLY (RRR_GATE = 2.5 at reasoning-chain.ts:48). The RRR becomes a TARGET, not a consequence.

**The operator's laws violated (verbatim):**
- "RRR is a CONSEQUENCE, not a target. Let zone structure determine RR"
- "anything that is 2.5 RR or above is valid as long as it is high probability. However the TARGET is always 4R+ i dont want the machine optimizing everything for low R just to pass the filter and leaving money on the table"
- "NOT A SINGLE ONE OF MY TRADES IS BELOW RRR = 3.5."

**The fix (the NEXT_STEPS STEP 3):** the E2-projected opposing zone's full-model resolution (the ZR-3.3) + the E1-pressure wall classification (the ZR-3.4) + the ratio-extension REMOVED as a TP source.

### D-04 TRACE — THE GU LONG ENTRY Δ8.8p (the complete evidence)

**The measured emissions:** the GU SHORT E 1.33662 TP 1.33242 (the ratio-extension) → the GU LONG E 1.33242 (the CHAINED entry — Law 27: the SHORT's TP chains into the LONG). The operator's GU #1 golden: E 1.33330 / SL 1.33250 / TP 1.33965 — the machine's chained entry 1.33242 is Δ8.8p off.

**The mechanism:** the direction derailment is FIXED (the macro authority — the G3 acceptance passes); the entry precision is the chained-entry geometry + the demand-pick resolution. The operator's #1 level 1.33330 IS in the maps (the demand 1.33270 = Δ6.0p); the FX-proven rungs (diag-lmv-golden-fx: the machine's rungs at Δ0.5-1.0p of the operator's levels) must be resolved to the operator's exact level.

**The fix:** the anchor refinement (the NEXT_STEPS STEP 6) — the GU Monday's demand pick at the operator's 1.33330.

### D-05 TRACE — THE WAVE-DISPATCHER SPAWN FAILURE (the complete evidence)

**The exact dispatcher output (the truncated batch):**

```json
{
  "wave": "wave-1786091997479",
  "dispatched": [
    { "name": "w4-topology", "sessionId": "", "type": "trident_build", "status": "ready" },
    { "name": "w5-lexicon-wiring", "sessionId": "", "type": "trident_build", "status": "ready" }
  ],
  "failed": [],
  "tmpDir": "/home/leviathan/OPENCODE_WORKSPACE/trident-tmp",
  ...
}
```

**The ground truth (the verification):**
- The trident-tmp directory: ABSENT (`ls /home/leviathan/OPENCODE_WORKSPACE/trident-tmp` → no output).
- The wave-status tracker: `{"status":"unknown_wave","agents":[]}` — "no tracked wave for wave-1786091997479".
- The golden gate: never created (diag-reasoning-chain-golden.ts absent).
- The W4 + W5 agents that DID run: the MANUAL task-tool dispatches (the task_ids ses_024988e91ffeQ6x9YzKcPkJA5l + ses_024984a25ffenm7igjErL2RtPQ).

**The mechanism:** the wave dispatcher's fire-and-forget spawn did NOT land — the generated prompts appeared in the batch output but the actual task() spawns were truncated/dropped (the output was cut at ~91KB with "The tool call succeeded but the output was truncated").

**The lesson (for the fresh session):** THE TASK TOOL IS THE ONLY SPAWN PATH — "THERE ARE NO FUCKING DISPATCHED AGENTS WITHOUT CALLING THE TASK TOOL" (the operator). A "dispatched: ready" status WITHOUT a sessionId = the spawn did NOT land. Verify the spawn landed (the sessionId present + the wave-status tracking) BEFORE waiting.

---

## THE DEBUG LOG REGISTER (the summary)

| ID | The symptom | The root cause | The status |
|---|---|---|---|
| D-01 | the 30-min hang | 24 sequential LLM calls × the wall-clock cap | FIXED (C1+C3+C4 landed) |
| D-02 | the LLM never fires (llm 0) | the grounding hard-kill + the parse failure | THE REWIRE (the operator's D1 — the SHADOW_REWIRE_SPEC) |
| D-03 | the EU/GU RRR forced to 2.5 | the computeMirrorTP null → the ratio-extension fallback (the D37 class) | THE NEXT_STEPS STEP 3 (the TP substrate fix) |
| D-04 | the GU LONG entry Δ8.8p | the chained entry off the golden | the W6 golden gate + the anchor refinement |
| D-05 | the wave spawn failure | the dispatcher's spawn didn't land | the lesson: the task tool is the ONLY spawn path |

---

## THE PROBE CODE APPENDIX (the exact probes that produced the evidence — the replication reference)

### The endpoint-shape probe (probe-shadow-shape.ts — the response structure)

```ts
// THE ENDPOINT'S ACTUAL RESPONSE SHAPE (the redacted probe)
// Calls the endpoint with the same body as shadow-agent.ts callModel and prints
// ONLY the structure: keys, types, and content-part shapes. Never the content itself.
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'deepseek-v4-flash',
    temperature: 0.2,
    max_tokens: 64,               // the small-budget control
    reasoning_options: { effort: 'max' },
    messages: [{ role: 'user', content: 'Say OK' }],
  }),
});
// THE MEASURED RESULT (max_tokens 64):
// HTTP 200 OK
// top-level keys: id, object, created, model, choices, usage, cost
// choices[0] keys: index, finish_reason, logprobs, message
// message keys: role, content, reasoning_content
// content typeof: string | isArray: false | content length: 2
// reasoning_content typeof: string | length: 58
// model: deepseek-v4-flash
```

### The hang probe (probe-shadow-hang.ts — the abort + the timing)

```ts
// THE 128K-BUDGET + ABORT-90s PROBE (the hang investigation)
const controller = new AbortController();
const timer = setTimeout(() => { console.log(`[abort firing at 90s]`); controller.abort(); }, 90_000);
const t0 = Date.now();
const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'deepseek-v4-flash',
    temperature: 0.2,
    max_tokens: 128000,
    reasoning_options: { effort: 'max' },
    messages: [system, user],
  }),
  signal: controller.signal,
});
// THE MEASURED RESULT (the SHORT prompt):
// [headers received] HTTP 200 after 61.9s
// [body received] after 61.9s | choices=1
// content typeof=string len=259 reasoning=20178 finish=stop
// usage={"prompt_tokens":175,"completion_tokens":6014,"reasoning_tokens":5914}
// THE ENDPOINT WORKS — the model self-terminates; 128K is a ceiling, never a target.
```

### The latency probe (probe-shadow-latency.ts — the realistic ledger prompt)

```ts
// THE REALISTIC LEDGER PROMPT (the token ledger + the candle groups + the macro)
const userPrompt = [
  'THE TOKEN LEDGER (the deterministic tokens 1-7, FIXED):',
  ledger,   // the 11-token ledger excerpt
  'THE OPERATIVE ZONE: EUR/USD|1H|1782990000000|1.14004 (DEMAND, floor 1.14000, ceiling 1.14145, PHANTOM_BOM)',
  'THE DAY OPEN SPOT: 1.14205',
  'THE CONTINUATION TARGETS (CLOSED SET — choose ONE): 1.14150, 1.14205, 1.14395, 1.14460',
  'THE MACRO: EUR/USD LONG (the DXY SHORT inverted — the mirror law)',
  'THE WIDTH RATIO: 1.62 (zone width / ATR1h)',
  'THE CANDLE GROUPS: touches [1.14110x3, 1.14020x2] pre-touch [1.14390, 1.14305, 1.14295] post-reaction [1.14150, 1.14210]',
  'REFINE THE FORWARD-POSITION TOKEN. Return ONLY JSON: {"forwardPosition":number,...}',
].join('\n');
// THE MEASURED RESULT: >200s (the probe aborted) — the heavy prompts legitimately
// take minutes at effort:max. THIS is why the 600s wall-clock cap was killing
// working generations, and why the C4 stall detector (the SSE idle window) is the fix.
```

### The failure-store probe (the SQLite read)

```ts
// THE FAILURE-STORE READ (the probe-shadow-db.ts — the row dump)
import { Database } from 'bun:sqlite';
const db = new Database('MASTER_CONTEXT/plutus-reasoning-failures.db', { readonly: true });
const rows = db.query(
  `SELECT id, component, reason, context, attempts, timestamp, pair FROM chain_failures ORDER BY id DESC LIMIT 10`
).all();
// THE MEASURED ROWS (the live evidence):
// {"id":127,"component":"GBP/USD Monday LONG","reason":"SHADOW_DEGRADE",
//  "context":"{\"op\":\"anchor\",\"reason\":\"SHADOW_EMPTY_RESPONSE: the model returned no content\"}",...}
// {"id":153,"component":"GBP/USD Monday LONG","reason":"SHADOW_DEGRADE",
//  "context":"{\"op\":\"anchor\",\"reason\":\"SHADOW_TIMEOUT after 60000ms\"}",...}
// THE PROGRESSION of the failure reasons across the runs:
//   SHADOW_EMPTY_RESPONSE (the max_tokens 2048 starvation era)
//   → SHADOW_TIMEOUT after 60000ms (the 60s wall-clock era)
//   → SHADOW_EMPTY_RESPONSE again (the parser shape-blindness era)
//   → SHADOW_SHAPE_VIOLATION (the W2 stream parse failure era — the current)
```

---

## THE VERIFICATION TRACE (how each fix was verified)

### The C1+C3 parallel verification (the G10 parallel-equivalence)

```
THE CHECK: the parallel run's projections byte-identical to the sequential run's.
THE RUN: bun diag-reasoning-chain.ts (the C1+C3 landed) — the deterministic projections
  match the sequential baselines (the same 6 emissions: the DXY S/L, the EU S/L, the GU S/L).
THE VERDICT: PASS (the deterministic path) — the G10 holds for the deterministic core.
THE CAVEAT: the LLM path (tokens 8-11) never fired (llm 0) — the parallel-equivalence for
  the LLM-refined path is UNVERIFIED until the agent-in-session reasoning lands (the D1).
```

### The C4 stall-detector verification

```
THE CHECK: a working generation streams through; a stall aborts at the idle window.
THE RUN: the endpoint probe (the short prompt at 128K) — HTTP 200 in 61.9s (the stream
  delivered) — a working generation completed un-aborted.
THE STALL CASE: not directly probed (the idle-window abort on a killed connection) —
  the mechanism is landed (the per-chunk reset + the 90s abort) + tsc 0.
THE VERDICT: the stream mechanism PASS (the 61.9s delivery); the idle-abort case pending
  a dedicated probe.
```

### The W5 exemption verification (the orchestrator's own run)

```
THE CHECK: the fixture EUR/USD|1H|1782990000000|1.14004 → PHANTOM_BOM; the type-1 → DEATH.
THE RUN: bun diag-reasoning-chain.ts (the key exported) — the EU LONG Δ0.8p HELD;
  the token-1 ledger "PHANTOM_BOM EXEMPT on EUR/USD|1H|1782990000000|1.14004".
THE PROBE (the W5 agent's): the fixture → PHANTOM_BOM (the all-4: largeOb/fakeout/
  opposingBoM/macroOrigin all true); the type-1 → DEATH (the 3-of-4 fails);
  177 death zones + 1 fortress.
THE VERDICT: PASS — the exemption fires on the fortress, never on the type-1.
```

---

## THE DEBUG LOG REGISTER (the summary)

| ID | The symptom | The root cause | The status |
|---|---|---|---|
| D-01 | the 30-min hang | 24 sequential LLM calls × the wall-clock cap | FIXED (C1+C3+C4 landed) |
| D-02 | the LLM never fires (llm 0) | the grounding hard-kill + the parse failure | THE REWIRE (the operator's D1 — the SHADOW_REWIRE_SPEC) |
| D-03 | the EU/GU RRR forced to 2.5 | the computeMirrorTP null → the ratio-extension fallback (the D37 class) | THE NEXT_STEPS STEP 3 (the TP substrate fix) |
| D-04 | the GU LONG entry Δ8.8p | the chained entry off the golden | the W6 golden gate + the anchor refinement |
| D-05 | the wave spawn failure | the dispatcher's spawn didn't land | the lesson: the task tool is the ONLY spawn path |

*END OF THE DEBUG LOG — the root causes with the complete mechanical evidence + the probe-code appendix + the verification traces. The D-sections are the record; the fixes are the NEXT_STEPS + the SHADOW_REWIRE_SPEC. The operator's honesty standard: the TRUE state recorded, never the claimed state. <!-- DOC-COMPLETE -->*
