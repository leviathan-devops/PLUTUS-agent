# WAVE GENERATOR FAILURE LOG — 2026-08-10 — THE GENERATOR'S OUTPUT IS POLLUTED WITH ITS OWN DRAFTING

**Status:** THE CLEANUP AGENT'S WORK ORDER — the wave generator (the trident-wave-generator tool) produced DEFECTIVE dispatch prompts on 2026-08-10. The operator's directive: "and also write a failure log for this to disk so i can have the other agent clean the wave generator" + "everything you just experienced". This document is the complete reproduction evidence + the fix guidance. The manual workaround was executed (the clean prompt dispatched directly); the GENERATOR ITSELF still needs the fix.

---

## THE SYMPTOM (what the generator produced — the scan-e1-detect generation, wave-1786344166483)

The generator returned a "batch form" claiming a ready dispatch, with a manifest SHA-256 (63c8bcc7af8b59de4e4ee9b405d2a7ecfecd855ba0c806a1416c9efdf96cecca) over a 224-line prompt file (/home/leviathan/OPENCODE_WORKSPACE/trident-tmp/scan-e1-detect.md). The prompt file was POLLUTED — it contained the generator's OWN INTERNAL LINE-COUNTING SCRATCHPAD as the file's tail, PLACEHOLDER paths in the reading order, and MANGLED paths in the verification commands. The batch form's inline prompt field was also elided ("... (13 paths)") in the returned JSON — the "exact generated prompt" the operator is told to dispatch VERBATIM was NOT fully present in the tool return, and the file that survived was defective.

**The four concrete defects (all verified by direct read of /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/scan-e1-detect.md):**

### DEFECT 1 — THE DRAFTING SCRATCHPAD LEAKED INTO THE PROMPT FILE (lines 155-224)
The prompt file's tail contains the generator's internal reasoning about LINE COUNTING — verbatim residue:
```
Then ~~~~~~~~~~~
Then [SHADOW INFERENCE] — the dense summary.

Let me now count the lines of the prompt draft. I'll estimate:
- 3 header lines
- 1 workspace root
...
Total: 3+7+12+14+19+5+20+10+7+6+31+8+6+7+11+1+1 = 168 + shadow inference 40 = ~208. Too short! The requirement is 250-350 lines. I need to expand. I'm under by ~90 lines.
...
Sum: 4+11+15+14+34+5+12+10+7+7+49+9+7+9+12+2+1 = 208. Still short. Hmm — I keep underestimating...
- Mission: ~12 lines
- Acceptance: ~16 lines

THE OPERATOR'S DOCTRINE (VERBATIM — the L4 supremacy demands the doctrine quoted, never paraphrased):
D2 verbatim: Create a matrix data set...
```
**THE CLASS:** the shadow-LLM's drafting process (its token-by-token "let me count the lines" chain-of-thought) was APPENDED TO THE DELIVERABLE instead of being consumed internally. The file that the [WAVE VERBATIM] firewall hashes is 30% drafting garbage. A subagent dispatched with this file would receive the generator's private arithmetic as part of its instructions — the reading order, the doctrine, and the tasks are buried under the scratchpad.

### DEFECT 2 — THE READING ORDER PLACEHOLDER (line 23-24)
```
THE READING ORDER (READ BEFORE ANY EXECUTION — one file per line, absolute paths):
1. /home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/mdve/lmv.ts
... (13 paths)
```
The 13-element filepaths array was NOT woven into the reading order — the generator emitted the literal `... (13 paths)` placeholder. A subagent dispatched with this prompt has exactly ONE path and an ellipsis — it cannot read the region. **THE FILEPATHS WEAVE FAILED.**

### DEFECT 3 — THE MANGLED VERIFICATION COMMANDS (lines 134-140)
```
THE VERIFICATION (run ALL + return the outputs):
1. grep -rn "export" "/home/.../Plutus_Agent/src/mdve/lmv.ts" — the coupling graph
2. grep -rn "export" ".../src/mdve/lexicons/zone-classification.ts" — the lexicon surface
3. grep -rnE "fromAbove|fromBelow|..." ".../src/mdve/lmv.ts" ".../src/mdve/lexicons/candle-pressure.ts" — the side-vote sites
4. grep -rnE "30m|15m" ".../src/mdve/bom-mom.ts" ".../src/mdve/ob-engine.ts" — the telescoping-law sites
...
6. read ".../src/mdve/" (offset=9999) — the EOF confirmed (empty beyond)
```
The absolute paths became ellipsis-relative (`/home/.../`, `.../src/mdve/`) — UNRESOLVED template shorthand leaked into the deliverable. A subagent cannot execute `/home/.../Plutus_Agent/...` — the verification commands are broken.

### DEFECT 4 — THE WORKSPACE ROOT TRUNCATION (line 4)
```
WORKSPACE ROOT: /home/leviathan
```
The full workspace root (…/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent) was truncated to /home/leviathan — the subagent's grounding root is wrong (it cannot resolve the paths from this root).

### DEFECT 5 — THE BATCH FORM'S PROMPT FIELD IS ELIDED
The generator's returned batch form contained `"prompt": "EXECUTE THE FOLLOWING...\n... (13 paths)\n..."` — the inline prompt was NOT the full content, and the promptFile channel pointed at the POLLUTED file. The operator's dispatch instruction ("the exact generated prompt") could not be satisfied from the return alone — the surviving file had to be read, audited, and manually repaired.

### DEFECT 6 — THE SECOND GENERATION ATTEMPT ABORTED
After the pollution was detected, a second trident-wave-generator call (waveId scan-e1-detect-final, the same agent args) returned "Tool execution aborted" — the generator's LLM path is UNSTABLE (this matches the 2026-08-09 failure record: SHADOW_BRAIN_HTTP_500 + SHADOW_BRAIN_TIMEOUT on opencode-go).

---

## THE REPRODUCTION (how the operator's team reproduces it)
1. Call trident-wave-generator with an agents array of ≥1 entry, template E1, filepaths = 13 absolute paths, and the 7 context args at the density floors.
2. Inspect the returned promptFile (/home/leviathan/OPENCODE_WORKSPACE/trident-tmp/<name>.md):
   - `tail -40 <promptFile>` — the scratchpad residue is present (the "Let me now count the lines" block).
   - `grep -n "\.\.\." <promptFile>` — the placeholder paths are present.
   - `head -8 <promptFile>` — the WORKSPACE ROOT is truncated to /home/leviathan.
3. Compare the manifest SHA-256 against `sha256sum <promptFile>` — they MATCH (the firewall would enforce the polluted content verbatim).

## THE ROOT CAUSE (the mechanism)
1. **The shadow-LLM's drafting is written INTO the output stream.** The generator's prompt-composition step (the "shadow inference") is asked to produce a dense prompt and internally reasons about line-count targets ("250-350 lines", "I'm under by ~90 lines") — that reasoning is emitted into the file instead of being consumed as scratch. THE FIX: the composition step MUST write ONLY the deliverable sections; the drafting arithmetic must be stripped at the output boundary (a structural validator, not a hope).
2. **The filepaths weave is not verified before the SHA is recorded.** The manifest hashes whatever the composition produced — the placeholder `... (13 paths)` and the ellipsis paths survived because NO gate checked: every reading-order entry is a real absolute path, zero placeholders, zero `...` fragments. THE FIX: a POST-COMPOSITION VALIDATOR before the manifest hash: (a) every reading-order line starts with `/` and resolves on disk, (b) zero occurrences of `... (` / `/home/.../` / `.../src/` in the file, (c) the file ends with the return-format or the ground-truth clause — NEVER a scratchpad, (d) `WORKSPACE ROOT:` carries the full path, (e) the line count is irrelevant to the content (the density floors are the result, never the drafting target).
3. **The manifest SHA-256 is recorded BEFORE validation** — a polluted file gets a valid hash, and the [WAVE VERBATIM] firewall then BLOCKS the repaired version (a DIFFERENT SHA) — the pollution becomes self-enforcing. THE FIX: the hash is recorded AFTER the post-composition validator passes; a validation failure returns an ERROR (loud-fail), never a batch form.
4. **The batch form's inline prompt is elided** — the tool return truncates the prompt field, forcing the orchestrator to the promptFile channel, which is the polluted file. THE FIX: the batch form references the promptFile only (the file is the source of truth), and the file is validated per (2) before the batch form is returned.

## THE IMPACT (what the pollution cost)
- The E1-DETECTION register (the C-8/W2/W6 core — the LMV side-vote, the lexicons, the 30m force, the proximity constants) did NOT land with the first 5 scan registers — the scan's completeness is gated on a re-dispatch.
- The orchestrator's time: the polluted prompt had to be read in full, the pollution identified (6 defects), a clean prompt manually composed (the operator's directive: "manually edit the files and dispatch them cleanly"), and the dispatch re-done.
- The firewall paradox: the manifest's valid SHA would have BLOCKED the clean prompt — the operator's manual-edit directive was the only escape.
- The second generation attempt aborted — the generator cannot be relied on until the fix lands.

## THE OPERATOR'S RULING (verbatim)
- "Going forward use trident wave generator instead of this manual preflight it does all of this for you" (the generator is the sanctioned path GOING FORWARD — the manual preflight is retired).
- "manually edit the files and dispatch them cleanly. if there are issues then load the dispatch templates skill, copy the existing generate prompts, clean them up and then dispatch" (the workaround for THIS dispatch).
- "and also write a failure log for this to disk so i can have the other agent clean the wave generator" + "everything you just experienced" (THIS document).

## THE WORKAROUND EXECUTED (the immediate unblock)
The clean prompt was written to /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/scan-e1-detect-CLEAN.md — the SAME golden E1 structure, with: (a) the scratchpad removed, (b) the full 13-path reading order woven, (c) the absolute verification commands, (d) the full WORKSPACE ROOT, (e) the anti-patterns + the ground-truth clause retained. The dispatch uses this file via the task tool (subagent_type trident_explore).

## THE FIX WORK ORDER (for the wave-generator cleanup agent)
1. **THE POST-COMPOSITION VALIDATOR** (the non-negotiable gate before the manifest hash): 
   - `grep -cE '\.\.\.|\(13 paths\)|Let me now count|I\'m under by|Too short' <promptFile>` MUST be 0.
   - EVERY reading-order line after the header MUST start with `/` AND `test -e` must resolve it (or the path is a directory like the lexicons/ — the line must still start with `/` and the dir must exist).
   - `WORKSPACE ROOT:` MUST contain the full absolute path (the agent's context-root, never truncated).
   - The file MUST end with a section the golden template defines (the RETURN FORMAT / the ground-truth clause / the self-check) — a trailing "THE OPERATOR'S DOCTRINE" re-dump after a scratchpad = FAIL.
   - The verification commands MUST contain zero `.../` fragments.
2. **THE SHADOW-COMPOSITION BOUNDARY:** the LLM that drafts the prompt must have its drafting REPLACED by a deterministic weave where possible — the context args (the 7 blocks) + the filepaths are DATA; the template is FIXED; the LLM's job is the section-fill, never the structure. The line-count arithmetic must never reach the output — strip everything after the last known-good section marker.
3. **THE LOUD-FAIL:** a validation failure returns an ERROR naming the defect (the polluted section), NEVER a batch form + manifest. The manifest hash is recorded ONLY for validated files.
4. **THE STABILITY:** the second-generation abort (the "Tool execution aborted" on the identical args) matches the 2026-08-09 SHADOW_BRAIN failures — the generator's LLM path needs the retry/fallback machinery (the same as the container-test switch-model law: on failure, switch the provider or fail loudly — never a silent abort).

## THE EVIDENCE (the files)
- The polluted prompt: /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/scan-e1-detect.md (224 lines — the scratchpad at 155-224, the placeholder at 23-24, the ellipsis paths at 134-140, the truncated root at line 4).
- The manifest: /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/.wave-manifest-wave-1786344166483.json (SHA 63c8bcc7af8b59de4e4ee9b405d2a7ecfecd855ba0c806a1416c9efdf96cecca — the polluted content).
- The clean prompt (the workaround): /home/leviathan/OPENCODE_WORKSPACE/trident-tmp/scan-e1-detect-CLEAN.md.
- The D64 scan failure-log entry (the wider degeneracy context): MASTER_CONTEXT/PLUTUS_V4.5.2_OVERHAUL_DEBUG_LOG.md.

**END OF THE WAVE GENERATOR FAILURE LOG — the cleanup agent's reproduction + the fix work order. The generator is NOT to be trusted for dispatch until the post-composition validator lands.**
