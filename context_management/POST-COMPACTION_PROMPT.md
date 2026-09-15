# POST-COMPACTION PROMPT — PLUTUS JESL TEST MACHINERY BUILD

## THE MISSION
Build the JESL test machinery for the Plutus TTE pipeline: upgrade src/jesl/ with 4 new
node kinds (gate, shell-exec, math-eval, journal-sink), write the plutus-pipeline-test
card, create the skill, and prove it all works with the golden gate.

## THE WORKSPACE ROOT
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent

## THE READING ORDER (read ALL before any code)
1. MASTER_CONTEXT/Plutus_JESL_Blueprints.md (835L) — THE BUILD AUTHORITY
   - Section 1: the node-by-node pipeline explanation
   - Section 2 §1-§7: the DPL1 (problem, scope, success criteria, test plan)
   - Section 2 §8: THE KERNEL DEEP-DIVE (424L — registry, executor, journal, node kinds)
   - Section 3: the ASCII architecture graph + runtime flow
2. MASTER_CONTEXT/PLUTUS_MASTER_CONTEXT_T2.md — the operator's rulings R1-R34 + doctrine
3. context_management/BUILD_STATE.md — the current build state (443L)
4. context_management/DECISION_CHAIN.md — D101 (the wave-manager ruling) + the canon decisions
5. .trident/PHANTOM_WAVE_RETURN_INCIDENT_REPORT.md — the wave-manager phantom-complete doc

## THE VERIFIED STATE (do NOT re-derive)
- The canon golden gate RAN 5/5 on real bars (reconstructed fixture from Vibe/Air CSVs)
- report-v452.ts runs clean, sha ×2 identical
- 8/15 diag battery green (7 adjudicated-delta: fixture-sensitivity + C-3B residuals)
- V5 battery: 646/0 across 46 files, container-tested, frozen pair intact
- The real bars: Plutus_Vibe_Agent/fixtures/weeks/2026-07-06/{1H,4H}/*.csv + Plutus_Air_Agent 1H
- src/jesl/ exists: 10 files ~850L, 4 kinds, hello.test.ts GATE GREEN

## THE CRITICAL DOCTRINE (operator rulings — canon)
- D98: E2 on DXY only → inject EU (invert) → inject GU — the GENERATIVE cascade
- D101: "GENERATE WORKS FINE. IGNORE THE PHANTOM COMPLETE. GENERATE AND READ."
- D-R1..D-R7: RRR 2.5/4R+, thresholds, XState, sentinels, shared.db, frozen through W5, TS report
- The 3-pip golden tolerance after EVERY change
- The frozen pair: sl-lmv.ts 91294083... + trade-dedup.ts 33914c89... — byte-identical ALWAYS

## THE BUILD PLAN (from Plutus_JESL_Blueprints.md §8.6)
PHASE 1: Kernel node kinds (~220 lines in src/jesl/)
  1a. "gate" node (~60L) — assert on channel data
  1b. "shell-exec" node (~40L) — run a command
  1c. "math-eval" node (~30L) — compute numeric
  1d. "journal-sink" node (~30L) — commit evidence
  1e. Register all 4 + fix 9th token + switch to sha256
  1f. Add determinism-×2 test
PHASE 2: The card (~200 lines)
  2a. specs/jesl/plutus-pipeline-test.json (11 nodes)
  2b. Graph mapping (10+ entries to shared.db)
  2c. Integration test
PHASE 3: The skill (~80 lines)
  3a. SKILL.md + run script

## THE ACCEPTANCE (SC-1 through SC-14 in the blueprint §6)
All 14 success criteria must pass: 8 registered kinds, gate/shell/math tests PASS,
sha256 in journal, exactly 8 tokens, card exists + valid, card executes exit 0,
card refuses broken pipeline exit 1, journal verified, tamper detected,
existing tests still pass, graph mapped, determinism ×2, skill created.

## THE OPERATING RULES
- Use the wave manager (trident-wave-manager action=generate) for ALL subagent dispatches
- Ignore the "phantom complete" toast — the agents ARE running (D101)
- Track manually via trident-wave-read (direct session reads)
- The canon pipeline (report-v452.ts) is the SOURCE OF TRUTH — never rebuild it
- The knowledge graph (shared.db) is the FUNDAMENTAL codebase truth — map everything

## THE DO NOTs
- Do NOT touch: src/mdve/sl-lmv.ts, src/mdve/trade-dedup.ts (the frozen pair)
- Do NOT touch: Checkpoints/monday-gold-standard-achieved/ (LOCKED)
- Do NOT rebuild the pipeline — the canon entry (report-v452.ts) works
- Do NOT use price-anchored selection — ZONE-anchored only (R29)
- Do NOT skip the graph mapping — every card node MUST map to shared.db

## THE FIRST ACTION
Read Plutus_JESL_Blueprints.md fully (all 835 lines), then give a 5-line proof:
1. The name of the build spec and its line count
2. The 4 node kinds to implement
3. The kernel deep-dive section number and its key mechanic
4. The first Phase 1 task to execute
5. The frozen pair SHAs

Then EXECUTE Phase 1 immediately.
