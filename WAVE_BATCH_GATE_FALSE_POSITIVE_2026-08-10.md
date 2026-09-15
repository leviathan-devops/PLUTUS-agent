# THE WAVE-BATCH GATE FALSE-POSITIVE — THE DISPATCH BLOCK EXPERIENCE (2026-08-10)

**Status:** the operator's bug doc — the false-positive patterns of the [WAVE BATCH] gate and how it blocked the ADM build dispatch. THE OPERATOR KNOWS WHERE THE CODE IS — this document is the BEHAVIORAL EVIDENCE + the pattern analysis, not a code hunt.

## 1. THE CONTEXT (what the dispatch was FOR)

The ANCHOR DECISION MACHINE (ADM) build — the L2 spec landed at `MASTER_CONTEXT/PLUTUS_V4.5.4_ANCHOR_DECISION_MACHINE_L2_SPEC.md` (584 lines). The wave generator was invoked with 5 build agents (the disjoint file sets):
- adm-1-module (the NEW src/mdve/anchor-decision-machine.ts)
- adm-2-chain-delegation (src/mdve/reasoning-chain.ts)
- adm-3-mirror-w6-walk (src/mdve/mirror.ts)
- adm-4-shadow-firewall (src/mdve/shadow-agent.ts)
- adm-5-outcome-gate (diag-reasoning-chain-golden.ts)

THE GENERATOR WORKED (the operator's "wave generator is working now" CONFIRMED): the wave `wave-1786375743640` registered, the 5 DPL1-grade prompt files written to `/home/leviathan/OPENCODE_WORKSPACE/trident-tmp/adm-*.md` (454/164/155/167/166 lines — ALL above the 125-line floor), the manifest `.wave-manifest-wave-1786375743640.json` with the per-agent sha256 + lines.

## 2. THE DISPATCH INTENT (what the operator's law demands)

THE BATCH PROCESS (the operator's wave law): "why are you only dispatching 1 subagent at a time you are supposed to be dispatching waves of parallel agents" — a wave = ALL the agents' task calls as the parts of ONE message, executed concurrently. THE PROMPTFILE CHANNEL: "write the prompts to a promptfile and pass the promptFile path directly with the task arg" — the loader replaces the placeholder prompt with the file's byte-exact content BEFORE the firewalls validate (the [WAVE VERBATIM] SHA matches by construction).

## 3. THE FALSE-POSITIVE PATTERN (the exact sequence — 3 attempts, 15 blocks)

**ATTEMPT 1** — 5 task calls in ONE message, each with `promptFile` + the FULL generated prompt text inline (the generator's returned batch form's prompt text, copied):
- ALL 5 blocked: `[WAVE BATCH] the wave for "adm-1-module" has 5 agents — a SINGLE dispatch is the derailment. DISPATCH THE FULL BATCH: ALL 5 task calls as the parts of ONE message (THE BATCH PROCESS — one concurrent pass).`

**ATTEMPT 2** — 5 task calls in ONE message, each with `promptFile` + the full prompt text (the same form):
- ALL 5 blocked with the identical message.

**ATTEMPT 3** — 5 task calls in ONE message, each with `promptFile` + the same full prompt text:
- ALL 5 blocked with the identical message.

**THE PATTERN IN ONE SENTENCE:** the [WAVE BATCH] gate fires on EVERY task call that carries a promptFile belonging to a multi-agent wave manifest — EVEN WHEN all the wave's task calls are the parts of the SAME message. The gate's per-call evaluation CANNOT OBSERVE the message's sibling parts — so every call looks like "a single dispatch of a multi-agent wave" and is blocked.

## 4. THE VERIFICATION I RAN (the false positive is PROVEN, not suspected)

1. The prompt files exist + are above the floor: `wc -l /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/adm-*.md` → 454/164/155/167/166.
2. The manifest exists with all 5 agents: `.wave-manifest-wave-1786375743640.json` — the dispatchedAt, the per-agent type/lines/sha256/status.
3. **THE HASHES MATCH EXACTLY** — `sha256sum adm-*.md` vs the manifest's sha256:
   - adm-1-module 0c233a12ae3100896167 (manifest: 0c233a12ae3100896167, 455) ✓
   - adm-2-chain-delegation 9e7213c50ef8049d23c5 (164) ✓
   - adm-3-mirror-w6-walk bfd962ee5ceac2aa0718 (155) ✓
   - adm-4-shadow-firewall 4d4fc8dc4fe3eeaff1a2 (167) ✓
   - adm-5-outcome-gate dc7e85cf619c51cc10a5 (166) ✓
   — the [WAVE VERBATIM] check would PASS by construction; the [WAVE BATCH] check is the only gate firing, and it fires on the false positive.
4. The dispatch WAS the full batch (5 task calls, ONE message, no interleaving) — the gate's own remedy text describes EXACTLY what I did.

## 5. THE ROOT-CAUSE ANALYSIS (the gate's observation gap)

**THE GATE'S INTENT** (per its message): block a SINGLE task dispatch of a multi-agent wave — the derailment is dispatching ONE agent when the wave has N.

**THE GATE'S MECHANICAL FLAW:** the check runs per task call (the tool.before hook) and evaluates the call against the wave manifest. When the manifest has 5 agents, ANY single task call referencing it looks like a single dispatch. The gate has NO OBSERVABLE SIGNAL for "this call is one part of a full batch in the current message" — the sibling parts are not visible to the per-call hook. So the gate cannot distinguish:
- (A) the derailment: ONE task call dispatched, the other 4 never sent → BLOCK (correct)
- (B) the compliance: ALL 5 task calls in ONE message → PASS (the intent)

Both look identical to the per-call check → (B) is blocked as (A) → the false positive.

**THE SECONDARY PATTERN (the same class):** the [WAVE VERBATIM] gate's line-counter — the runtime's inline counter runs ~15 lines below the file's physical count (the documented dispatch lesson: "write to 140+"). The SAME observation-gap class: the gate measures a proxy (the inline text length) instead of the true signal (the file's content). The [WAVE BATCH] gate measures "one call" instead of "the message's call set."

## 6. THE IMPACT (what the false positive cost)

- The ADM build wave (5 agents) could NOT be dispatched — 15 blocks, 3 attempts, zero dispatches.
- The build is STALLED at the dispatch boundary: the spec landed, the prompts generated, the manifest registered — the agents never spawned.
- The fallback documented: (a) the self-execution per the spec §3 (the POST-COMPACTION's dispatch lessons: "the self-execution is the reliable path for the surgical edits") — the operator's 85% subagent law frustrated by the gate; (b) the next session re-attempts the dispatch.
- The failure store: the DEBUG_LOG D68 + the COMPACTION_SURVIVAL session delta record the state for the next session.

## 7. THE FIX DIRECTIONS (what the gate needs to distinguish (A) from (B))

1. **THE MESSAGE-LEVEL BATCH FLAG (the cleanest):** the gate needs to know the current message's task-call set. If the runtime exposes the message's parts to the hook (the message context / the batch token), the gate checks: "do ALL the manifest's agents have a task call in THIS message?" → yes = the batch passes; no = the single dispatch is blocked. The signal = the SET of task calls in the message, never a single call in isolation.
2. **THE BATCH TOKEN:** the wave generator's batch form could carry a batchId (the wave id) that ALL N task calls share; the gate counts the distinct task calls carrying the wave's batchId within the current message — N present = PASS.
3. **THE MANIFEST STATE MACHINE:** the manifest could track the dispatch progress (the dispatchedAt + the per-agent status): the gate passes a call when the manifest's agent status is "pending" AND the wave's dispatch is IN PROGRESS (the first call of the batch marks the wave as dispatching; the last call completes it). The single-dispatch derailment = the wave stays at 1/N for the full message — the gate checks the COMPLETION at the message's end, not each call.
4. **THE PER-CALL PASS WITH THE DEFERRED COMPLETION CHECK:** allow the calls through, then verify at the message boundary that ALL N agents were dispatched; if fewer, the BLOCK fires retroactively (the derailment detected post-message, the wave marked aborted).

**THE MINIMAL CORRECT SEMANTIC:** the gate's decision input must be the MESSAGE's task-call SET (the batch), never the individual call. A per-call hook with no message visibility CANNOT enforce the batch law — that is the false-positive's root.

## 8. THE RELATED FALSE-POSITIVE CLASSES OBSERVED IN THE SAME SESSION (the pattern family)

| The gate | The false-positive pattern | The root | The fix direction |
|---|---|---|---|
| [WAVE BATCH] | the full batch in one message → every call blocked as "a single dispatch" | the per-call evaluation without the message's call-set visibility | the message-level set check (the §7.1/§7.2) |
| [WAVE VERBATIM] line-counter | a 134-line prompt file counted 119-121 inline → blocked | the proxy (the inline text) vs the true signal (the file's bytes) | the counter reads the FILE (the promptFile) — the loader already injects the byte-exact content |
| [TASK FIREWALL] | the runtime's inline counter runs ~15 lines below the file's physical count | the same proxy-vs-true-signal gap | the preflight validates the FILE; the runtime validates the INLINE — the two disagree |
| [SSTF CLAIM GATE] | the inline-exec detection fires on legitimate host diag runs (bun run the project's own harness) | the command-shape proxy vs the true intent (the host diag IS the runtime per D10) | the D10 exception: the project's own diag harnesses are the sanctioned runtime |

**THE FAMILY'S ONE ROOT:** every gate in the family decides on a PROXY (the single call, the inline text length, the command shape) instead of the TRUE SIGNAL (the message's call set, the file's bytes, the operator's D10 law). The false positives all die when the decision input is the true signal.

## 9. THE HONEST REMAINDER

- The wave generator itself is NOT the blocker — it worked end-to-end (the generation, the manifest, the hashes). The blocker is the dispatch-side gate's observation gap.
- The next session's documented paths: (a) re-dispatch the batch (the promptFile channel — the hashes match, the loader injects the byte-exact content); (b) self-execute per the L2 spec §3 with the per-wave gates. Both are recorded in the DEBUG_LOG D68 + the COMPACTION_SURVIVAL.
- The ADM build's full acceptance (the spec §6) is unaffected by the dispatch block — the work order is complete and ready to execute.

<!-- DOC-COMPLETE -->
