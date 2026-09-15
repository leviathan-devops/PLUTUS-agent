# WAVE GENERATOR FORENSIC LOG — 2026-08-09 (session experience, full data)

**Purpose:** the complete record of what the trident-wave-generator tool did across this session — every invocation, every error, the parallelism evidence, the payload anatomy — so the tool can be fixed in a future session. Written by the orchestrator (Trident Agent) at the operator's request.

**Tool under investigation:** `trident-wave-generator` (aliases observed in the toolset: `trident-wave-dispatch` / `trident-task-preflight` — the same wave generator). The tool's self-described contract: THE ONLY SUBAGENT DISPATCH PATH — takes `agents=[{name, template, filepaths, mission, knownContext, doctrine, measurements, acceptance, taskTargets, position}]`, WEAVES the context args into pre-woven golden templates (E1-E4 explore / B1-B5 build), runs a shadow-pipeline generation (the "PI loop" / "SHADOW_BRAIN"), writes the prompt files to a tmp folder, and returns the MANIFEST + the BATCH FORM (the task calls with the exact generated prompts) for the ORCHESTRATOR to dispatch via the task tool.

---

## 1. THE OBSERVED OUTPUT CONTRACT (what the tool returns on success)

```json
{
  "wave": "wave-<epoch-ms>",
  "dispatched": [ { "name": "<agent>", "sessionId": "", "type": "trident_explore", "status": "ready" }, ... ],
  "failed": [ { "name": "<agent>", "error": "PI_LOOP_EMPTY: PI round 1: ..." }, ... ],
  "tmpDir": "/home/leviathan/OPENCODE_WORKSPACE/trident-tmp",
  "checkIn": "WAVE CHECK-IN: wave-<id> (<n> agents) dispatched at <hh:mm> — the streams are live in the child sessions. ADD the wave row to the todowrite: 'WAVE wave-<id> — <n> agents — running since <hh:mm> — ETA ~<m>m' (high, in_progress). The cron will remind you when the wave completes or the ETA passes. Update the row on every check until ALL agents are complete.",
  "batch": {
    "tool": "batch",
    "parameters": { "tools": [ { "tool": "task", "parameters": { "description": "<agent-name>", "prompt": "<THE FULL GENERATED PROMPT — 31K-50K+ chars each>", "subagent_type": "trident_explore" } }, ... ] }
  }
}
```

**CRITICAL OBSERVED FACTS about the contract:**
1. **`dispatched[].sessionId` is ALWAYS EMPTY (`""`).** The tool does NOT actually spawn anything. The "dispatched" + "the streams are live in the child sessions" narrative is FALSE — the operator's ruling confirmed it: *"there are no wave agents only what you dispatch with batching the task tool. ignore wave generator"*. The REAL dispatch = the orchestrator taking the `batch` form's prompts and issuing the `task` calls itself.
2. **The batch form is the only real payload.** It carries the EXACT generated prompts. When the batch is large (3+ agents), the tool result gets TRUNCATED in the UI at ~50KB and the FULL output is saved to `/home/leviathan/.local/share/opencode/tool-output/tool_<random>.json` (observed paths: `tool_fdf5910fb001DD1c0HjQN6DxvH`, `tool_fe00403a5001zsiMu1GDU5FaCz`).
3. **The tmp folder is WIPED after the return.** The tool's own message: *"The prompt files + the manifest were wiped from /home/leviathan/OPENCODE_WORKSPACE/trident-tmp (the closed loop). The audit trail lives in the child sessions + the tracker."* — so the ONLY surviving copy of the generated prompts is the (possibly truncated) tool result + the tool-output file.
4. The `checkIn` text embeds a todowrite directive + a "cron" reminder narrative — part of the output contract, no actual cron observed.

---

## 2. THE THREE INVOCATIONS (the complete record)

### INVOCATION 1 — waveId `wave-context-rebuild-2026-08-09` → wave-1786158083688 — 07:09
- **Agents (5, ALL template E2):** e2-canon-context-docs · e2-architecture-canon · e2-handover-and-lineage · e2-doctrine-reference-library · e2-asbuilt-source-tree (the context-rebuild wave: 13 canon docs / 7 architecture specs / 27 lineage docs / 24 doctrine-library items / 25 source files).
- **Context-arg sizes supplied:** mission 400-900 chars each · knownContext 900-1900 chars · doctrine 300-700 · measurements 300-500 · acceptance 300-500 · taskTargets 300-600 · position 100-200 (per the tool's char floors: mission/knownContext ≥200, doctrine/measurements/acceptance/taskTargets ≥100, position ≥50 — all exceeded).
- **RESULT: 3 "dispatched" (sessionId "") + 2 FAILED:**
  - `e2-asbuilt-source-tree` → **`PI_LOOP_EMPTY: PI round 1: SHADOW_BRAIN_HTTP_500: opencode-go 500 {"type":"error","error":{"type":"error","message":"Internal server error"}} — the generation FAILED; NO mechanical fallback exists (the operator: a loud fail or a clear pass)`**
  - `e2-architecture-canon` → **`PI_LOOP_EMPTY: PI round 1: SHADOW_BRAIN_TIMEOUT: the LLM call stalled past 240000ms — the generation FAILED; NO mechanical fallback exists (the operator: a loud fail or a clear pass)`**
- **Batch form:** 3 tools returned (the 3 successes). Output truncated in the UI; full copy at `tool_fdf5910fb001DD1c0HjQN6DxvH` (~117KB+).
- **CheckIn:** "WAVE CHECK-IN: wave-1786158083688 (3 agents) dispatched at 07:09 — ... ETA ~19m".
- **Outcome:** per the operator's ruling the 3 "dispatched" were NOT real. The 2 failed agents were later re-dispatched via the task tool with hand-filled skill templates (both returned full briefs, audited CORRECT).

### INVOCATION 2 — waveId `wave-context-rebuild-2026-08-09` → wave-1786160043844 — 07:38
- **Agents (2, template E2):** e2-architecture-canon · e2-asbuilt-source-tree (the retry of the 2 failures).
- **RESULT: 0 "dispatched" + 2 FAILED — BOTH failed again, the errors SWAPPED between the two agents:**
  - `e2-architecture-canon` → **`PI_LOOP_EMPTY: PI round 1: SHADOW_BRAIN_HTTP_500: opencode-go 500 {"type":"error","error":{"type":"error","message":"Internal server error"}}`**
  - `e2-asbuilt-source-tree` → **`PI_LOOP_EMPTY: PI round 1: SHADOW_BRAIN_TIMEOUT: the LLM call stalled past 240000ms`**
- **Batch form:** `{ "tool": "batch", "parameters": { "tools": [] } }` — EMPTY (no successes).
- **CheckIn:** "WAVE CHECK-IN: wave-1786160043844 (0 agents) dispatched at 07:38 — ... ETA ~19m".
- **Outcome:** the operator then ruled: *"use the wave generator tool or dispatch skill to deploy subagents with E2 prompt"* then *"there are no wave agents only what you dispatch with batching the task tool. ignore wave generator and just dispatch with the skill going forward. absorb full context"* — all 5 E2 agents were then hand-filled from the skill templates and dispatched via the task tool directly. ALL 5 returned full briefs (audited CORRECT, with honest ABSENT/PROPOSED flags).

### INVOCATION 3 — waveId `wave-gu-fix-hunt-2026-08-09` → wave-1786169206239 — 10:16
- **Agents (3, ALL template E1):** e1-archived-gu-fix-hunt (4 archived checkpoint trees) · e1-v453-gu-fix-hunt (3 v4.5.3-era trees + the current-src references) · e1-v452-designation-hunt (6 v4.5.2-era trees).
- **RESULT: 2 "dispatched" (sessionId "") + 1 FAILED:**
  - `e1-v453-gu-fix-hunt` → **`PI_LOOP_EMPTY: PI round 1: SHADOW_BRAIN_TIMEOUT: the LLM call stalled past 240000ms — the generation FAILED; NO mechanical fallback exists (the operator: a loud fail or a clear pass)`**
- **Batch form:** 2 tools returned. The generated prompts measured: **e1-archived-gu-fix-hunt = 31,263 chars · e1-v452-designation-hunt = 46,090 chars** (extracted via python json-unescape to `/tmp/opencode/wg-prompt-0.txt` + `/tmp/opencode/wg-prompt-1.txt`). Output truncated in the UI; full copy at `tool_fe00403a5001zsiMu1GDU5FaCz`.
- **CheckIn:** "WAVE CHECK-IN: wave-1786169206239 (2 agents) dispatched at 10:16 — ... ETA ~17m".
- **Outcome:** the 2 prompts were dispatched VERBATIM via the task tool (per the operator's order: *"use wave generator to generate the prompts and then verbatim copy paste them in batch task dispatch dont compress anything and dont waste time"*). `e1-archived-gu-fix-hunt` returned an INCOMPLETE result ("Discovery truncated at 100. Running per-root full inventories in parallel." — a discovery cap of 100 entries appears to have truncated its run; the [TRIAGE] banners flagged: "claims unverifiable — re-dispatch demanding the verification outputs" + "diff review impossible — demand per-change reasoning"). `e1-v452-designation-hunt` was never dispatched (the operator interrupted for this forensic log). `e1-v453-gu-fix-hunt` still needs a generation retry or a hand-fill.

---

## 3. THE ERROR TAXONOMY (what caused the failures — the fix data)

**The error prefix — `PI_LOOP_EMPTY: PI round 1:`**
- The generation stage is called the "PI loop" (parallel-inference / prompt-inference loop). `PI round 1` = the FIRST round. `PI_LOOP_EMPTY` = the loop produced NO output for that agent. The tool's own tail: *"the generation FAILED; NO mechanical fallback exists (the operator: a loud fail or a clear pass)"* — i.e., there is NO retry inside the tool and NO fallback; a failed generation = a failed agent, loud.

**Failure mode A — `SHADOW_BRAIN_HTTP_500: opencode-go 500 {"type":"error","error":{"type":"error","message":"Internal server error"}}` (2 occurrences: inv-1 e2-asbuilt-source-tree, inv-2 e2-architecture-canon)**
- The shadow-brain LLM call (the weaving model) hit the `opencode-go` provider and received a clean **HTTP 500 "Internal server error"**.
- **Diagnosis: a PROVIDER-SIDE error, not a client bug, not a timeout, not a parse error.** The HTTP response was well-formed JSON — the endpoint itself errored. Most probable causes: (a) the opencode-go tier overloaded/rate-limited at the moment of the call, (b) a transient endpoint outage, (c) a request-size rejection by the provider (the weaving prompt = the golden template + 7 woven context args; the agent's full prompt can exceed 40-50KB of OUTPUT, so the GENERATION request (template+args) is large but the RESPONSE (the woven 30-50KB prompt) is very large — a provider with an output-token cap could 500 on the response side).
- **Notably: it occurred in the SAME batch where OTHER agents succeeded** (inv-1: 3 succeeded + 2 failed) — so it is NOT a full-provider outage at that moment; it is per-call. This is consistent with: concurrent-call overload, or per-call size limits, or a flaky endpoint.

**Failure mode B — `SHADOW_BRAIN_TIMEOUT: the LLM call stalled past 240000ms` (3 occurrences: inv-1 e2-architecture-canon, inv-2 e2-asbuilt-source-tree, inv-3 e1-v453-gu-fix-hunt)**
- The shadow-brain call **stalled for 240,000 ms (4 minutes) with no completion** → the tool's internal ceiling aborted it.
- **Diagnosis: a STALL, not a rejection.** The HTTP layer did not return an error — the call hung (no SSE/stream chunks, or a slow stream that never finished inside 4 min). Most probable causes: (a) the provider accepted the request and the generation (a 30-50KB woven prompt) took >4 min to stream — the output is LARGE (the E1/E2 templates are 100+ lines; the weave multiplies the context args into the full prompt; the measured outputs were 31K-46K chars per agent), (b) a hung connection (no idle detection inside the generator's call — the 240s is a plain deadline, and a stall that produces slow-but-alive chunks could exceed it), (c) provider overload on the same concurrent batch.
- **The strongest correlation:** in EVERY invocation at least one agent hit a failure (2/5, 2/2, 1/3 — overall 5/10 = 50% failure). The failures are heterogeneous (500 vs timeout vs success in the same batch). **This pattern = a flaky/overloaded provider under concurrent load, with the 240s ceiling and the size of the woven prompts as the aggravating factors.**

---

## 4. THE PARALLELISM QUESTION (async-parallel vs sequential — the evidence)

**What is observable from the session:**
1. The tool returns ALL per-agent verdicts (dispatched/failed) in ONE atomic response — never a stream of per-agent results. The orchestrator cannot see interleaving.
2. In inv-1, 3 agents succeeded + 2 failed in the same batch, with the 2 failures being DIFFERENT error types (one 500, one timeout). If the generations were strictly sequential with a 240s ceiling each, a timeout on agent N delays everything behind it; the observed result is still consistent with sequential OR parallel.
3. In inv-2 (2 agents, both failed), the errors SWAPPED between the two agents relative to inv-1 — the agent that got the 500 in inv-1 got the timeout in inv-2, and vice versa. **This is the strongest parallelism signal: the errors are per-CALL lottery, not per-AGENT determinism** — a deterministic per-agent failure (e.g., a specific agent's args causing a size rejection) would repeat the SAME error for the SAME agent. The swap means both calls hit the same flaky endpoint independently — consistent with concurrent calls.
4. The tool's own naming — "PI_LOOP" and the plural "the generation FAILED" per agent — and the batch-form design (one generated prompt per agent returned together) are consistent with a per-agent parallel generation stage.
5. **The honest limit: the generator's internal concurrency is NOT observable from outside — the tool has no progress output, no per-agent timing, no intermediate logs returned.** The verdict: **consistent with async-parallel per-agent LLM calls** (the error-swap + same-batch heterogeneity are the evidence), but the tool provides NO telemetry to prove it. If the operator wants certainty, the fix should ADD per-agent timing + a concurrency flag + a progress stream to the output.

**The timing data that IS observable:**
- inv-1 checkIn says "dispatched at 07:09"; inv-2 checkIn says "07:38" — the two calls were ~29 minutes apart (the orchestrator's own work between them; not tool timing).
- inv-3 checkIn "10:16" — the call returned after the LLM generation of 3 agents; the timeout of e1-v453 (240s) is the only hard timing datum: if sequential with the timeout last, the call ≥ 240s + the 2 successful generations (each possibly 1-4 min); if parallel, the call ≈ max(all generations) with the timeout agent capping at 240s. **The observed wall of inv-3 was on the order of minutes, consistent with BOTH — no discriminating datum.**

---

## 5. THE PAYLOAD ANATOMY (the generation sizes — the overload suspect)

| Agent (inv-3, E1) | Generated prompt size |
|---|---|
| e1-archived-gu-fix-hunt | **31,263 chars** |
| e1-v452-designation-hunt | **46,090 chars** |
| e1-v453-gu-fix-hunt | FAILED (timeout) — generation never completed |

- The inv-1 E2 batch (3 successes) was **117KB+ combined** (truncated at that point).
- **The generation REQUEST is also large:** each agent's context args (mission 400-900c + knownContext 900-1900c + doctrine 300-700c + measurements 300-500c + acceptance 300-500c + taskTargets 300-600c + position 100-200c) get woven into the golden template (the E1/E2 skeleton is 100+ lines). The weaving LLM must then EMIT the full 31-46KB prompt.
- **Size is the prime aggravating suspect:** the shadow brain is asked to emit 30-50KB outputs per agent; the 240s ceiling + a slow provider stream + large output = the timeout signature; a provider output cap = the 500 signature. The 50% failure rate correlates with the largest requests of the session.

---

## 6. THE WORKAROUNDS THAT WORKED (for the next session)

1. **The reliable path (0 failures across 5 agents): hand-fill the skill templates + dispatch via the task tool directly.** Load `skill("trident-dispatch-templates")` → fill the E1/E2 template's [FILEPATHS] + [CONTEXT] slots → dispatch multiple `task` calls in ONE message (parallel). All 5 E2 context-rebuild agents returned full briefs this way.
2. **The generator path when it succeeds:** take the `batch` form from the tool result (or from the saved `tool_*.json` when truncated) → extract the prompts (python json-unescape) → dispatch the task calls VERBATIM (the operator's rule: *"verbatim copy paste them in batch task dispatch dont compress anything"*).
3. **The generator's "dispatched" array is IGNORED** (sessionId "" — not real).
4. **The prompt extraction recipe:** `python3 -c` reading `/home/leviathan/.local/share/opencode/tool-output/tool_<id>` → regex `"prompt": ("..." ),\n\s*"subagent_type"` → json.loads → write to `/tmp/opencode/wg-prompt-N.txt` → read → dispatch.

---

## 7. THE OPERATOR'S RULINGS (verbatim — the session's law on this tool)

1. *"use the wave generator tool or dispatch skill to deploy subagents with E2 prompt"*
2. *"there are no wave agents only what you dispatch with batching the task tool. ignore wave generator and just dispatch with the skill going forward. absorb full context"*
3. *"use wave generator to generate the prompts and then verbatim copy paste them in batch task dispatch dont compress anything and dont waste time"*
4. (this log) *"is wave generator working async and doing all calls in parallel or is it sequential / and what caused the error. was it a stall timeout? something else? full forensic log so i can fix the tool"*

---

## 8. THE PENDING STATE (what the fix session inherits)

- **e1-archived-gu-fix-hunt** (the 4 _ARCHIVED trees: v4.5.3_FILL_AND_GU_FIX · v4.5.4_HOTFIX · v4.5.5_PRISTINE_CORE · v4.5.2_FINAL): returned INCOMPLETE — "Discovery truncated at 100. Running per-root full inventories in parallel." → **needs a resume/re-dispatch demanding the FULL report + all 15 verification outputs** (task_id ses_01ffa6b9affe43NJYZWW62RWYA).
- **e1-v452-designation-hunt** (the 6 v4.5.2-era trees: E2_CASCADE · E2_CASCADE_FIXED · ZR7_C · ZR7_C1 · ZR6_FINAL · TEACHING_SESSION_2026-08-04): the generated prompt (46,090 chars) is extracted and READY at `/tmp/opencode/wg-prompt-1.txt` → **dispatch verbatim**.
- **e1-v453-gu-fix-hunt** (the 3 v4.5.3-era trees: CLEAN_BASELINE · S1 · S2 + the current-src references): generation FAILED (timeout) → **retry the generator or hand-fill the E1 template**.
- The GU-fix hunt context: there are NO v4.5.4 checkpoints (the newest tree is v4.5.3_S2); the current src HAS the GU Monday direction fix (G3 passes — the macro wins, the emission is LONG at E 1.33270) but NOT the WL shape or the 1.33330 demand level (the rung LMV|GBP/USD|1.33380 [1.33306-1.33343] containing 1.33330 exists but loses selection).

---

## 9. THE FIX RECOMMENDATIONS (for the tool engineer)

1. **Add per-agent telemetry to the output:** a `generations: [{name, startedAt, finishedAt, ms, error?}]` array — the parallelism question becomes answerable from the tool itself (overlapping startedAt/finishedAt = parallel; serial = sequential).
2. **Raise or make configurable the 240s ceiling** for the large E1/E2 weaves (the observed outputs 31-46KB; the E2 outputs larger) — or add an SSE idle detector like the pipeline's C4 (90s no-chunk → abort) instead of a plain deadline.
3. **Add a retry (2-3 attempts) on SHADOW_BRAIN_HTTP_500** — the 500 is transient/provider-side (the same batch had successes); a single retry with backoff would have recovered most of the 50% failure rate.
4. **Shrink the generation load:** the golden templates + 7 woven args → 31-46KB outputs per agent. Consider: (a) emitting the prompt to the tmp file FIRST (the tool already writes to trident-tmp) and returning only the file paths + the batch form with a FILE REFERENCE instead of the inline 46KB prompt — the UI truncation + the output-size pressure disappear; (b) capping the woven output (the observed 46KB for an E1 hunt is mostly the template's fixed boilerplate).
5. **Stop claiming dispatch:** the `dispatched[]` array with `sessionId:""` + the "streams are live" narrative is false and was ruled false by the operator. Rename to `generated[]` (the prompts READY to dispatch) + return ONLY the batch form; the orchestrator dispatches.
6. **Stop wiping the tmp prompts immediately** — or keep them until the wave's batch is acknowledged; the wipe forces the truncation-file extraction workaround.
7. **The "PI round 1" + "NO mechanical fallback" contract:** if a retry is added, the loop becomes "PI round N" — the operator's "loud fail or clear pass" is satisfied by the retry-then-fail semantics.

---

*END OF THE WAVE GENERATOR FORENSIC LOG — 2026-08-09. The three invocations, the two error modes with their root-cause assessments, the parallelism evidence, the payload sizes, the workarounds, the operator rulings, the pending state, and the fix recommendations are all recorded above for the next session.*
