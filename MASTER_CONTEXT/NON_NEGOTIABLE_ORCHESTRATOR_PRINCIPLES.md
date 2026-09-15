# NON-NEGOTIABLE ORCHESTRATOR PRINCIPLES (2026-08-01 — THE OPERATOR'S MANDATE)

**Status: THE ORCHESTRATOR'S LAW. Read before ANY subagent dispatch. Violation = derailment.**
**Origin: the 2026-08-01 audit — the operator's explicit directive:** "must include CLEAR NOTES AND INSTRUCTIONS AND ANTI PATTERNS IN THE COMPACTION PREP FOR THE NEXT SESSION ON WHAT PROPER SUBAGENT MANAGEMENT ACTUALLY LOOKS LIKE. Honestly write this as a separate 500+ line .md file NON-NEGOTIABLE ORCHESTRATOR PRINCIPLES that mandate PROPER senior engineer level supervision/audit/management/orchestration behavior guidelines cuz this is just fucking retarded."

---

## PART 0 — THE OPERATOR'S VERDICT (why this file exists — quoted, never softened)

> "compltely fucking retarded slop WHY DID YOU NOT CATCH THIS? this is obviously blind subagent slop garbage and your 'aduit' was just 'subagents made files changes everything works!' you clearly did not actually look at WHAT the subagents did and WHY they did it or HOW ti affects the codebase you would have obviously seen the logic flaws and derailments here."

> "it is clear you did literally 0 fucking management or quality audit of subagents in any way shape or form and they just blindly edited some retarded fucking shit because THEY DID NOT RECEIVE CLEAR DETAILED INSTRUCTIONS EXPLAINING EXACTLY WHAT TO DO, HOW TO DO IT, WHY TO DO IT THAT WAY, WHAT IMPORTANT CONTEXT TO READ PRIOR TO ANY EXECUTION YOU PROBABLY GAVE SOME BULLSHIT 50 LINE BASIC TOILET PAPER PROMPT AND THEN ALSO DID NOT ACTUALY VERIFY ANY OUTPUTS OR QUALITY AUDITS OCNE THEY FINISHED. COMPLTE DERAILMENT ON YOUR PART AS THE ORCHESTRATOR. UNNACEPTABLE."

The failure: the R1 wave's subagents changed setup-gen.ts (+238 lines: F1-D/F1-E) and shape-brain.ts (+180 lines) — the orchestrator verified the GATES (tsc/build/golden/determinism — the OUTPUTS) and declared the wave shipped — without READING what the agents actually did, WHY they did it that way, and HOW the changes affect the codebase. The logic flaws (the RWL bounce-inset hardcoding the operator's level, the zfp-20 cap-walk collapse, the SL probe-floor widening) were invisible to the output-only audit. THE GATES PASS ≠ THE LOGIC IS CORRECT. The gates measure the outputs; the orchestrator audits the LOGIC.

---

## PART 1 — THE ARCHITECTURE CONSTRAINT DOCTRINE (the non-negotiable foundation)

### 1.1 The linear architecture — E1 → E2 → E3, each BUILDS ON the previous

The operator (2026-08-01, verbatim): "this needs to clearly follow the pre-existing linear price-action-zone-pressure-shape-chain-trade-mapping architecture E1 --> E2 --> E3 each one BUILDS ON TOP OF the previous. Previous engine data PROVIDES THE STRUCTURE FOR the next one. Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable."

- E1 (the zone map) = the pressure mechanics: the zones, the BoM/MoM classification, the ZFP from the 6D confluence, the Earth+Fire overlaps, the confluence scores. E1 PROVIDES THE STRUCTURE.
- E2 (the shape chain) = the timing/reach: the day-by-day shape predictions, the projected zones, the expected reaches, the day/level/session designations. E2 BUILDS ON E1's structure.
- E3 (the trade setups + the refinement) = the execution: the entries/SLs/TPs/RRRs. E3 MUST FIT WITHIN the constraints of E1's zones + E2's projections.
- **E3 is NOT permitted to: (a) override the pre-existing E1/E2 data architecture, (b) fabricate its own rules, (c) invent its own zone/level logic. E3's every anchor must trace to an E1 zone + an E2 projection.**

### 1.2 The enforcement (every E3 change audited against the constraint)

- EVERY entry anchors to an E1 structural zone (an S/D OB or an LQZ rung with the E1 pressure data — the confluence/ZFP/BoM-MoM) + an E2 day designation.
- EVERY SL sits within the E1 pressure structure (the defended edges, the reaction extremes) + beyond the E2 shape's expected probe.
- EVERY TP targets an E1 opposing zone (the structural wall — the Earth+Fire) + the E2 shapeDay's projected opposing zone.
- ANY E3 code that derives its own levels/rules from raw bars instead of consuming the E1/E2 data = a derailment, flagged in the audit.
- The refinement engine's "intelligence" = the E1 pressure mechanics + the E2 shape chain OF THE TRADE BEING REFINED — never its own invented heuristics.

### 1.3 The prioritization doctrine (the operator, verbatim)

- TP: "extended to the STRUCTURALLY CORRECT zone based on E2 shape chain + E1 pressure mechanics" — the E2 projection FIRST names the zone, the E1 pressure mechanics validate it.
- SL: "made tighter (where actually possible not arbitrarily) based on E1 pressure mechanics + E2 shape chain" — the E1 defended-edge density + the E2 expected probe, NEVER the arbitrary rung walk.
- The significance ranking: "significance is based on E1 first, E2 second, candle mechanics third."

---

## PART 2 — THE SUBAGENT PROMPT STANDARD (what a proper dispatch looks like)

### 2.1 The mandatory prompt sections (a subagent dispatch WITHOUT these = a derailment)

1. **THE MISSION** — the exact objective, the acceptance criteria, the do-not-touch list.
2. **THE CONTEXT** — the full architectural context: the file's role in the E1→E2→E3 chain, the data flow, the blast radius (the importers), the doctrine quotes relevant to the task.
3. **THE READING ORDER** — the exact files/docs the agent MUST read BEFORE any execution (the target file + its importers + the relevant spec sections + the doctrine). The agent is instructed to read them IN FULL.
4. **THE EXACT TASKS** — numbered, each with: WHAT to do, HOW to do it (the specific mechanism), WHY that way (the doctrine/architecture reason), the expected result.
5. **THE CONSTRAINTS** — the frozen files, the mutable files, the architecture constraints, the do-nots.
6. **THE VERIFICATION PROTOCOL** — the exact commands + the expected outputs the agent must run and RETURN (the exit codes, the hashes, the grep markers).
7. **THE RETURN FORMAT** — the exact structure of the return (the diff summary, the reasoning for EACH change, the evidence, the honest notes).
8. **THE EXPLICIT DEMAND** — "RETURN THE FULL REPORT — never an empty return" + "explain WHY you made each change".

### 2.2 The anti-patterns (the dispatch formats that caused this derailment)

- ❌ The 50-line toilet-paper prompt: "fix X, verify, return" — NO context, NO why, NO reading order. BANNED.
- ❌ The vague mission: "make the golden count better" — the agent invents its own approach. BANNED.
- ❌ The no-context dispatch: the agent doesn't know the E1→E2→E3 architecture → it fabricates rules. BANNED.
- ❌ The unconstrained dispatch: no frozen list, no do-nots → the agent touches the wrong files. BANNED.
- ❌ The no-why dispatch: the agent implements a mechanism without knowing the doctrine → the mechanism violates the doctrine (the zfp-20 cap-walk, the arbitrary SL). BANNED.
- ❌ The no-verification dispatch: the agent returns prose without the command outputs. BANNED.

### 2.3 The prompt length standard

- The dispatch prompt for a code change: 150-400 lines of dense specification — the context, the reading order, the exact tasks with the why, the constraints, the verification, the return format.
- The dispatch prompt for a debugging task: the known facts, the suspects, the probes to run, the A/B tests to execute, the root-cause criteria.
- A dispatch prompt that fits on one screen = NOT ENOUGH CONTEXT. The agent cannot know what it wasn't told.

---

## PART 3 — THE ORCHESTRATOR AUDIT STANDARD (what "auditing the subagents" MEANS)

### 3.1 The audit is of the LOGIC, not the outputs

- The gates (tsc/build/golden/determinism) verify the OUTPUTS. They CANNOT verify the LOGIC.
- THE ORCHESTRATOR MUST READ EVERY CHANGED LINE: what the agent wrote, WHY it wrote it that way (the reasoning it was supposed to return), HOW it affects the codebase (the blast radius).
- The audit checklist per changed file:
  1. READ the full diff (the before/after per hunk).
  2. For each hunk: WHAT does it do? WHY (the agent's stated reason — verify it against the doctrine)? HOW does it affect the callers/importers?
  3. Does it violate the E1→E2→E3 constraint (E3 overriding/fabricating)?
  4. Does it violate the quoted doctrine?
  5. Does it hardcode a level/number that should be computed?
  6. Does it add a heuristic that should come from the E1/E2 data?
  7. Does it change behavior outside the stated scope (the scope creep)?
  8. Does it break the blast radius (the importers)?
- The audit is INCOMPLETE without reading the changed code. "The gates pass" is the START of the audit, not the end.

### 3.2 The zero-trust diff review (the mandatory procedure)

- The subagent returns → the orchestrator opens the changed files → reads the changed regions IN FULL (the diff or the relevant line ranges) → writes its own analysis of each change (what/why/how) → compares against the agent's claims → the verdict per change (CORRECT / FLAWED / DERIVED-FROM-WRONG-PREMISE / SCOPE-CREEP).
- The FLAWED verdicts trigger: (a) the surgical fix by the orchestrator, OR (b) the re-dispatch with the specific flaw quoted + the correction demanded.
- A wave is NOT shipped until EVERY changed line is reviewed + every review verdict is recorded in the wave report.

### 3.3 The quality audit (the operator's standard)

- The agent's return must explain WHY each change — the reasoning. A return without the why = an un-auditable change = a re-dispatch.
- The agent's mechanism must be traced to the doctrine (quoted) + the architecture (the E1/E2 data consumed). A mechanism that cannot be traced = a derailment.
- The agent's numbers must be traced to the fixture (the levels computed, never hardcoded). A hardcoded level = a derailment (the golden levels are the validation set, NEVER the training input).
- The agent's test claims must be verified by the orchestrator's own runs (the exit codes, the hashes, the outputs) — the agent's prose is a claim, the orchestrator's runs are the evidence.

### 3.4 The wave report standard

- Every wave report records: (a) the dispatches (the prompt summaries), (b) the returns (the claims), (c) the DIFF REVIEWS (the orchestrator's per-change analysis — what/why/how + the verdict), (d) the verification runs (the exit codes, the hashes), (e) the honest residuals.
- The wave report WITHOUT the diff reviews = the wave was NOT audited = the wave did NOT ship.

---

## PART 4 — THE ANTI-PATTERNS REGISTER (the derailments this file prevents)

| # | The anti-pattern | The derailment it caused | The prevention |
|---|------------------|-------------------------|---------------|
| 1 | "Subagents made file changes, everything works!" (the output-only audit) | The R1 wave's logic flaws shipped: the RWL bounce-inset, the zfp-20 cap-walk, the SL probe-floor widening — invisible to the gates | PART 3 — the diff review of EVERY changed line before the wave ships |
| 2 | The 50-line toilet-paper dispatch | The agents invented their own mechanisms (the anchor collapse, the arbitrary SL walks) because they didn't know the architecture | PART 2 — the full-context dispatch with the reading order + the why |
| 3 | No reading order in the dispatch | The agents never read the E1→E2→E3 architecture docs → they fabricated rules | PART 2.1 — the reading order is MANDATORY in every dispatch |
| 4 | The no-why mechanism | The agents implemented the rung walks without the doctrine (the "NEVER nearest" was unknown to them) | PART 2.1 — the doctrine quotes in the dispatch + the why per task |
| 5 | The un-audited scope | The agents changed behavior outside the stated scope (the +238/+180 lines with the hidden effects) | PART 3.1 — the scope-creep check per hunk |
| 6 | The gate-as-evidence | The golden count passed while the logic was derailed (the phantom hits, the zfp-20 caps) | PART 3.1 — the gates are the start, the diff review is the audit |
| 7 | The empty return re-dispatch | The R1 agents returned empty ×3 — the orchestrator re-dispatched without diagnosing the channel | the D5 discipline: verify the filesystem FIRST, then diagnose the channel (the quota), then decide |
| 8 | The "it must be the previous code" blame | The root causes (the zfp-20 cap, the OB-id mismatch) were in the EXISTING code the agents extended — the audit must cover the touched regions' PRE-EXISTING flaws | PART 3.1 — the touched regions' logic reviewed, not just the new lines |

---

## PART 5 — THE ORCHESTRATOR'S OPERATING RULES (the senior-engineer behavior)

### 5.1 The supervision standard
1. The orchestrator is the SENIOR ENGINEER — the subagents are the implementers. The orchestrator OWNS the logic, the architecture, the doctrine.
2. Every dispatch is preceded by: (a) the orchestrator's own reading of the target file's relevant regions, (b) the root-cause analysis (the known facts + the suspects), (c) the exact task specification with the why.
3. Every return is followed by: (a) the diff review (PART 3), (b) the orchestrator's own verification runs, (c) the wave report with the per-change verdicts.
4. The orchestrator NEVER declares a wave shipped on the subagent's claims + the gates alone.

### 5.2 The verification standard
1. The orchestrator runs the verification commands ITSELF (the tsc/build/report/golden/determinism/frozen) — never trusts the agent's reported exit codes.
2. The orchestrator READS the changed code — never audits the diff by the agent's summary alone.
3. The orchestrator probes the DATA (the fixture bars, the model zones, the rung inventories) to verify the mechanism's premises — the "1.33720 zfp-20 cap" style facts are probe-verified, not assumed.
4. The orchestrator records the evidence (the hashes, the outputs, the probe results) in the wave report.

### 5.3 The doctrine standard
1. Doctrine is QUOTED, never synthesized (D13) — every design decision traced to the operator's verbatim words.
2. The architecture constraint (E1→E2→E3 — the next engine's data fits within the previous's constraints) is checked for EVERY change.
3. A change that cannot be traced to the doctrine + the architecture = a derailment, regardless of the gates.

### 5.4 The honesty standard
1. The TRUE state is recorded, never the claimed state (the v4.5.1 embellishment lesson).
2. The honest residuals are documented (the fixture-physical limits, the Tier-D unconfirmed rows, the environmental blocks).
3. The orchestrator's OWN errors are owned, not deflected (the "my G5 premise was wrong" style corrections, recorded).

### 5.5 The delegation standard (the operator's 85/15)
1. The subagents do the implementation (the 85%); the orchestrator does: the audit, the context docs, the wave organization, the surgical fixes, the container testing.
2. The orchestrator's surgical fixes are for the SMALL well-specified corrections (the gate constants, the regex bugs) — the DEEP work goes to the full-context subagents.
3. The orchestrator does NOT bulk-implement (the >50-line changes) — it specifies + audits.

---

## PART 6 — THE WAVE MANAGEMENT STANDARD

1. The waves are SEQUENTIAL with the parallel agents within (the disjoint files, the fixed contracts).
2. The disjointness is verified BEFORE the dispatch (the agents' file lists must not overlap).
3. The interfaces between the parallel agents are FIXED in the prompts (the handoff field names, the signatures) — the cross-agent type drift is the Wave-2 coordination-point lesson.
4. The wave gate is run AFTER the audit (the diff review first, then the gates, then the checkpoint).
5. The wave checkpoints record: the MANIFEST (the base, the changes, the SHAs), the report, the gate outputs, the DIFF REVIEWS.
6. The subagent channel failures are diagnosed (the quota, the size, the context) — the D5 filesystem-first discipline — never a blind re-dispatch.

---

## PART 7 — THE REFINEMENT-ENGINE ARCHITECTURE (the E1→E2→E3-compliant design — the D37 doctrine)

### 7.1 The TP (the E2 projection FIRST, the E1 pressure SECOND — the operator's directive)
1. The TP target = the E2 shapeDay's projected opposing zone (the demandZoneId/supplyZoneId) — resolved to the zone's internal LQZ (the Earth+Fire).
2. The E2-designated opposing zone is the PRIMARY — the walk extends THROUGH the shallow shelves to it.
3. The wall classification = the E1 pressure mechanics (the BoM/MoM, the 6D-confluence ZFP, the Earth+Fire overlap) — the candle-count zfp is the THIRD-order input.
4. The Law-14 cap applies to the STRUCTURAL walls only; the shallow shelves are pass-through.

### 7.2 The SL (the E1 pressure + the E2 shape — "where actually possible")
1. The SL candidates ranked by the E1 defended-edge density (the modal bodyClose clusters) + the reaction extremes.
2. The SL sits beyond the E2 shape's expected probe (the day's projected reach) but inside the next REAL structural defense.
3. The arbitrary rung walk is BANNED — every SL must trace to the E1/E2 evidence.

### 7.3 The per-anchor 3-attempt dynamic state machine (the operator's design)
1. Each trade's anchors (E, SL, TP) tracked INDIVIDUALLY — 3 attempts per anchor, each locked when its limit is hit.
2. The attempts continue on the unlocked anchors until the RRR passes or ALL 3 hit the limits.
3. Every rejection gives the context: WHY (the mechanical reason) + HOW to improve it (the specific correction).
4. The machine's intelligence = the E1 pressure mechanics + the E2 shape chain OF THE TRADE BEING REFINED — it correctly rejects: the SL 2 zones away from the entry, the TP extended to an unreachable zone, any violation of the pre-existing architecture.

### 7.4 The significance ranking (the operator's order)
E1 (the confluence/ZFP/BoM-MoM/Earth+Fire) FIRST · E2 (the shape chain's projection) SECOND · the candle mechanics THIRD.

---

## PART 8 — THE OPERATOR'S REVIEW GATE (the orchestrator's checklist before ANY presentation)

1. Did I read every changed line + write the what/why/how verdict?
2. Did I run the verification commands myself?
3. Did I probe the data to verify the mechanism's premises?
4. Did I trace every change to the quoted doctrine + the E1→E2→E3 architecture?
5. Did I record the TRUE state (the honest residuals, the fixture limits)?
6. Is the wave report complete (the dispatches, the returns, the diff reviews, the verification, the residuals)?
7. Would the operator's audit find a logic flaw I missed? (the adversarial self-review: try to break my own wave report)

---

## PART 9 — THE WORKED EXAMPLE: HOW THE PART-3 AUDIT WOULD HAVE CAUGHT THE R1 DERAILMENTS (the 2026-08-01 post-mortem)

The R1 wave shipped with the logic flaws the operator caught. This section walks the FAILED audit — what the orchestrator SHOULD have seen, line by line. Every future wave audits this way.

### 9.1 The flaw: the RWL bounce-inset (setup-gen.ts, the F1-D)
**What the agent wrote:** the Wed LONG's entry at the internal rung's CEILING with RRR in [floor−0.1, floor) → re-place 0.2p inside the ceiling (100.972→100.970 — "the operator's bounce-BACK level").
**The audit that SHOULD have fired:**
- ❌ The 0.2p inset is a HARDCODED constant (RWL_BOUNCE_INSET_PIPS = 0.2) invented to clear the RRR 3.0 floor by 0.08. The E1→E2→E3 constraint: the entry must trace to the E1 zone + the E2 projection — the inset is E3 fabricating its own rule ("0.2p inside the ceiling") with NO E1/E2 basis.
- ❌ The agent's reasoning "bypasses the machine" — the refinement machine's floor-adjust was the CORRECT behavior (the entry at the ceiling produced RRR 2.975 < 3.0 — the machine correctly rejected it); the agent's workaround (the inset) is a gate-bypass, not a fix.
- ❌ The WHY is absent: the agent never explained WHY 0.2p is the correct inset vs 0.1 or 1.0 — the mechanism is fitted to the golden level (100.970 ≈ the golden 100.975), the anti-hardcode violation.
**The correct audit verdict: FLAWED — the E3 fabrication; the re-dispatch with the correction demanded: the entry must emerge from the E1/E2 data (the E2's projected bounce level), not a fitted inset.**

### 9.2 The flaw: the recovery-shelf entry (setup-gen.ts, the F1-E)
**What the agent wrote:** the Mon LONG's entry = the shelf.bottom + 1 pip (100.946) — "the recovery shelf [100.936-100.972]".
**The audit that SHOULD have fired:**
- ❌ The "+1 pip" is an arbitrary constant — the golden entry 100.945 vs the shelf's defendedEdge ~100.940 — the agent fitted +1p to land near the golden. The correct: the entry = the E1 zone's defendedEdge (the modal bodyClose — the E1 pressure data), NOT the shelf.bottom + a fitted offset.
- ✅ The recovery-shelf detection (the transit + ≥2 closes) is a legitimate E1/E2 mechanic (the zone's defended structure).
- ❌ The SL 100.893 vs the golden 100.905 (Δ1.2p) — the agent's SL is the probe-forced wide placement — the arbitrary-walk family.
**The correct audit verdict: PARTIALLY FLAWED — the shelf detection is sound, the +1p entry offset + the SL placement are fitted; the re-dispatch with the E1-defendedEdge entry + the E1/E2-informed SL.**

### 9.3 The flaw: the zfp-20 cap-walk (the D37 — the GU kill)
**What the agent (and the prior waves) left in place:** the Law-14 significance walk caps at the first zfp≤20 rung — the LQZ canon ladder floors at 20 — the GU's demand rungs all qualify — the TP stops at the nearest shelf (1.33720).
**The audit that SHOULD have fired:**
- ❌ The wall classification (zfp≤20) is the CANDLE-COUNT ladder — the E1 pressure mechanics (the 6D-confluence ZFP, the BoM/MoM, the Earth+Fire) are not in the classification. The operator's order: "E1 first, E2 second, candle mechanics third" — the candle-count-zfp-as-wall-classification is the candle mechanics FIRST — inverted.
- ❌ The E2 shapeDay's projected opposing zone (the demandZoneId) is carried but never resolved to the TP — the OB-id-vs-LMV-candidates mismatch (mirror.ts:1596) silently falls through.
- ❌ The SL probe-floor (the weekProbeAtAnchor forcing the SL wider) is the arbitrary tightening — the E1 defended-edge density + the E2 expected probe are absent.
**The correct audit verdict: FLAWED — the architecture constraint violated (the E3 TP/SL derived from the candle mechanics instead of the E1/E2 data); the re-dispatch with the E1-first wall classification + the E2-projection TP resolution.**

### 9.4 The audit's meta-lesson
The gates measured the OUTPUTS (the golden 7/22, the determinism) — they cannot see the LOGIC. The orchestrator's diff review is the ONLY gate that sees the E3-fabrication, the fitted constants, the inverted significance. **A wave whose diff review found nothing is a wave whose diff review was not performed.**

---

## PART 10 — THE DISPATCH TEMPLATES (the full worked examples)

### 10.1 The code-change dispatch template (the minimum sections — copy, fill, dispatch)

```
EXECUTE THE FOLLOWING BUILD PLAN VERBATIM. You are a trident_build agent.

WORKSPACE ROOT: <the absolute path>
YOUR FILES: <the exact file list — and ONLY these>
DO NOT TOUCH: <the frozen list + the other agents' files>

CONTEXT — THE MISSION: <the objective + the acceptance criteria, tied to the operator's directives>

THE ARCHITECTURE (READ FIRST): <the E1→E2→E3 chain position of the target file + the data flow + the constraint: your change MUST fit within the previous engines' data>

THE READING ORDER (READ BEFORE ANY EXECUTION):
1. <the target file — in full>
2. <its importers>
3. <the relevant spec sections, with the file:line>
4. <the doctrine quotes relevant to the task>

THE TASKS (numbered — each with WHAT/HOW/WHY):
1. <the task> — WHAT: <the exact change> — HOW: <the exact mechanism> — WHY: <the doctrine/architecture reason> — EXPECTED: <the measurable result>

THE CONSTRAINTS:
- <the architecture constraints: the E3 must consume the E1/E2 data, never fabricate>
- <the frozen files>
- <the hardcode ban: every level computed from the data, never fitted to the golden>

THE VERIFICATION (run ALL + return the outputs):
1. npx tsc --noEmit — exit 0
2. bun build src/index.ts --outdir dist --target bun
3. bun report-v452.ts + sha256sum ×2
4. bun diag-golden-coverage.ts — the count
5. <the wave gates>
6. sha256sum <the frozen files>

THE RETURN FORMAT:
1. The diff summary (before → after per edit)
2. THE REASONING for EACH change (why this mechanism, why now, how it fits the E1→E2→E3 architecture)
3. The verification outputs (the exit codes + the hashes)
4. The honest notes
RETURN THE FULL REPORT — NEVER an empty return.
```

### 10.2 The debugging-task dispatch template

```
EXECUTE THE FOLLOWING DEBUGGING PLAN. You are a trident_build agent. RESEARCH + SURGICAL FIX ONLY.

THE SYMPTOM: <the exact failing output>
THE KNOWN FACTS (probe-verified — do NOT re-derive): <the fixture truths, the rung inventories, the code paths>
THE SUSPECTS (in order): <the ranked hypotheses with the file:line>
THE PROBES TO RUN: <the exact probe scripts/commands>
THE A/B TESTS: <the disable-one-variable tests>
THE ROOT-CAUSE CRITERIA: <what the evidence must show>
THE FIX SPEC: <the exact change once the root cause is confirmed>
THE VERIFICATION: <the battery>
RETURN: the root cause with the mechanical evidence + the fix diff + the reasoning + the verification outputs.
```

### 10.3 The dispatch anti-checklist (the pre-send review)
- [ ] The prompt is 150+ lines (the full context).
- [ ] The reading order is included.
- [ ] The WHY is included per task.
- [ ] The architecture constraint is stated.
- [ ] The doctrine quotes are included.
- [ ] The hardcode ban is stated.
- [ ] The verification protocol is included.
- [ ] The return format demands the reasoning.
- [ ] The do-not-touch list is explicit.

---

## PART 11 — THE ORCHESTRATOR'S VERIFICATION SUITE (the commands the orchestrator runs ITSELF)

### 11.1 The per-wave battery
```bash
npx tsc --noEmit                                              # exit 0
bun build src/index.ts --outdir dist --target bun             # success
bun report-v452.ts                                            # the report
sha256sum report_v452.md                                      # ×2 identical
bun diag-golden-coverage.ts                                   # the 3-pip count
# the wave gates: bun diag-<wave>.ts                          # exit 0
sha256sum src/mdve/sl-lmv.ts src/mdve/trade-dedup.ts          # the frozen hashes
```

### 11.2 The logic probes (the orchestrator's own — the mechanism verification)
- The fixture bars: the per-day highs/lows/touches (the reachability premises).
- The model zones: the rung inventories, the zfp/freshness/classification (the wall-classification premises).
- The E2 days: the keyZoneId/keyZonePrice/demandZoneId/supplyZoneId (the projection premises).
- The diff review: the changed regions read in full (the logic premises).

### 11.3 The anti-pattern: "the agent's exit codes" — the agent's reported "EXIT=0" is a CLAIM; the orchestrator's own run is the EVIDENCE. The agent's reported hash is a CLAIM; the orchestrator's sha256sum is the EVIDENCE. Every claim re-run.

---

## PART 12 — THE ROOT-CAUSE WORKBOOK (the orchestrator's debugging protocol)

1. REPRODUCE: run the failing check twice (the determinism of the failure).
2. ISOLATE: the smallest input that reproduces it (the probe).
3. SUSPECTS: the changed components ranked (the changed code first).
4. A/B: disable the prime suspect, re-run, compare.
5. THE CANARY: a byte-identical hash after a change = the change isn't in the path.
6. THE GEOMETRY: the numbers are the facts — the reason text is a claim.
7. THE ROOT CAUSE: the mechanism connecting the evidence to the failure.
8. THE FIX: the smallest change eliminating the mechanism.
9. THE REGRESSION: the full battery + the diff review.
10. THE RECORD: the D-section in the DEBUG LOG (the symptom, the geometry, the mechanism, the evidence, the fix direction).

---

## PART 13 — THE REFINEMENT-ENGINE OVERHAUL SPEC (the D37 doctrine — the E1→E2→E3-compliant design, in full)

### 13.1 The TP computation (the E2 projection FIRST, the E1 pressure SECOND, the candle mechanics THIRD)
1. THE PRIMARY: the E2 shapeDay's projected opposing zone — the demandZoneId (for a SHORT) / supplyZoneId (for a LONG) — RESOLVED to the zone's internal LQZ:
   - The demandZoneId is an OB-zone id → find the zone in the FULL model → the TP = the zone's internal LQZ (the LMV rung fully inside, the Earth+Fire) → its defendedEdge.
   - The demandZoneId is an LMV-rung id → the TP = the rung's defendedEdge.
   - The zone has no internal LQZ → the TP = the zone's defended edge (the E1 pressure edge).
2. THE WALL CLASSIFICATION (the Law-14 cap): the structural walls = the E1 pressure mechanics — the BoM/MoM classification + the 6D-confluence ZFP + the Earth+Fire overlap. The cap applies ONLY to the structural walls. The shallow LQZ shelves (the candle-count zfp 20 without the E1 pressure) are PASS-THROUGH.
3. THE SIGNIFICANCE RANKING (the fallback): E1 (the confluence/ZFP/BoM-MoM/Earth+Fire) FIRST, E2 (the shape chain's projection proximity) SECOND, the candle mechanics (the touch counts, the sweep states) THIRD.
4. THE REACHABILITY: the TP must be within the E2 shape's projected reach (the shape's travel) — a TP beyond the reach is rejected with the context ("the TP extends past the shape's projected reach — the E2 says the move stops earlier").

### 13.2 The SL computation (the E1 pressure + the E2 shape — "where actually possible")
1. THE CANDIDATES: the E1 structural defenses BEYOND the entry on the adverse side — the defended edges (the modal bodyClose clusters) + the reaction extremes (the wick-tip minima/maxima) — ranked by the E1 pressure (the defended-edge density, the confluence/ZFP).
2. THE E2 SHAPE CONSTRAINT: the SL must sit BEYOND the E2 shape's expected probe (the day's projected reach on the adverse side) — an SL inside the expected probe is rejected with the context ("the SL sits inside the shape's expected probe — the E2 says price will reach X").
3. THE TIGHTENING: "where actually possible" = where the E1 evidence shows the dense defense — the SL at the defended edge + the Law-7 buffer — NEVER the arbitrary rung walk.
4. THE REJECTION CONTEXT: the SL 2 zones away from the entry = rejected with the why ("the SL sits 2 zones past the nearest structural defense — the E1 pressure between is undefended — the entry is wrong, not the SL").

### 13.3 The per-anchor dynamic state machine (the operator's design — in full)
1. THE STATE PER TRADE: { entry: { attempts, locked, best }, sl: { attempts, locked, best }, tp: { attempts, locked, best }, status: 'REFINING' | 'PASSED' | 'REJECTED' }.
2. THE TURN SEMANTICS: each anchor gets 3 refinement attempts, tracked INDIVIDUALLY. An anchor LOCKS when its 3 attempts are exhausted. The other anchors keep their attempts.
3. THE LOOP: while status === 'REFINING': (a) the best unlocked anchor is refined (the E1/E2-informed candidate), (b) the RRR re-computed, (c) RRR ≥ floor → PASSED, (d) all 3 anchors locked → REJECTED with the full context.
4. THE REJECTION CONTEXT (every rejection): WHY (the mechanical reason — the anchor, the numbers, the violated constraint) + HOW to improve it (the specific correction — "the TP must extend to the E2-designated demand at 1.33567 — the current TP stops at the 1.33720 shelf which is a pass-through LQZ, not a structural wall").
5. THE INTELLIGENCE: the machine consumes the E1 pressure mechanics + the E2 shape chain OF THE TRADE BEING REFINED — it rejects the flawed setups the operator listed: the SL 2 zones away, the TP extended to an unreachable zone, any violation of the pre-existing architecture.

### 13.4 The anchor distribution
The E2 exact-match registers its anchor into the usedAnchors set — the N distinct sources spread across the N E2-designated rungs — the N-distinct-signals-N-distinct-zones principle — never the pile-on-one-anchor collapse.

### 13.5 The map intelligence (the OBCV)
- The detection gap vs the honest absence: the OBCV's conservative gates (bw≥3.0/bf≥0.65) missed the golden week's BoM origins — the map's BoM labels are incomplete — the tuning is a map-fix.
- The E2-designated opposing zone is the TP target REGARDLESS of the BoM/MoM label (the E2's projection IS the structure) — the BoM label is NEVER forced when none exists.

### 13.6 The fill alignment (the session-reachability)
The E2's day/level/session must be JOINTLY reachable: the session the day's shape ACTUALLY reacts in — the day-reachability extended to the session-reachability — the fill bracket covers the actual reaction time.

---

## PART 14 — THE OPERATOR'S DIRECTIVES REGISTER (the quotes every orchestration decision honors)

1. "the pre-existing linear price-action-zone-pressure-shape-chain-trade-mapping architecture E1 --> E2 --> E3 each one BUILDS ON TOP OF the previous... Next engine's data MUST FIT WITHIN THE CONSTRAINTS of the previous engine's data archtiecture this is absolutely non negotiable."
2. "TP should be exteneded to the STRUCTURALLY CORRECT zone based on E2 shape chain + E1 pressure mechanics."
3. "SL should be made tighter (where actually possible not arbitrarily) based on E1 pressure mechanics + E2 shape chain."
4. "significance is based on E1 first, E2 second, candle mechanics third."
5. "3 attempts on each anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked individually per trade - so a dedicated dynamic state machine... each rejection needs to also give context on WHY it was rejected and HOW to properly improve it."
6. "This refinement engine also needs clear logic/intelligence on E1 pressure mechanics + the E2 shape chain of the E3 trades that are being refined so it correctly rejects flawed shitty setups like putting the SL 2 zones away from the entry or extending the TP to an unreachable zone or other stupid fucking shit that violates the pre-exisitng architecture."
7. "BoM should not be forced when there is none. the logic must be intelligent."
8. "E3 is not permitted to override pre-existing E1/E2 data architecture nor is it allowed to jsut randomly fabricate its own rules and make shit up."

---

## PART 15 — THE WAVE-REPORT TEMPLATE (the mandatory structure — every wave)

```
=== WAVE <ID> — <NAME> ===
--- THE DISPATCHES ---
  <per agent: the task id, the file list, the prompt length, the reading order included?>
--- THE RETURNS ---
  <per agent: the claims — verbatim excerpts>
--- THE DIFF REVIEWS (THE AUDIT — per changed file) ---
  <file> — <hunk 1>: WHAT <the change> | WHY <the agent's reason — verified> | HOW <the blast radius>
    VERDICT: CORRECT | FLAWED (<the flaw>) | SCOPE-CREEP | FITTED-TO-GOLDEN | ARCHITECTURE-VIOLATION
    <the orchestrator's own analysis — what the change actually does in the E1→E2→E3 chain>
--- THE VERIFICATION (the orchestrator's OWN runs) ---
  tsc=<exit> build=<exit> report=<hash ×2> golden=<count> gates=<per-gate exits> frozen=<hashes>
--- THE PROBES (the mechanism premises) ---
  <the fixture/rung/E2-day probes + the outputs>
--- THE HONEST RESIDUALS ---
  <the fixture limits, the unconfirmed data, the environmental blocks>
--- THE VERDICT ---
  PASS (all hunks reviewed + verified) | FAIL (the flaw + the correction)
```

---

## PART 16 — THE SUBAGENT-RETURN TRIAGE PROTOCOL (what to do when a subagent returns)

1. **EMPTY RETURN** → the D5 discipline: verify the filesystem FIRST (the target file's hash vs the checkpoint) — did the work land? If YES: the work is complete, only the message was lost — audit it as normal. If NO: diagnose the CHANNEL (the quota, the size, the context) — a tiny liveness probe (a trivial task) tests the channel — then re-dispatch with the diagnosis. NEVER blind re-dispatch the same heavy task.
2. **PROSE-ONLY RETURN** (no command outputs) → the claims are unverifiable — the return is INCOMPLETE — re-dispatch with the verification protocol demanded.
3. **OUTPUTS BUT NO REASONING** → the diff review cannot be performed (the WHY is absent) — the re-dispatch demands the per-change reasoning.
4. **REASONING BUT NO DIFF** → the review cannot be anchored — the re-dispatch demands the diff summary.
5. **THE COMPLETE RETURN** → the PART-3 audit: the diff review + the orchestrator's own verification + the probes.

---

## PART 17 — THE AUDIT-VERDICT VOCABULARY (the exact language the diff review uses)

| Verdict | Meaning | The action |
|---------|---------|-----------|
| CORRECT | the change fits the E1→E2→E3 architecture, traces to the quoted doctrine, computes from the data, no scope creep | ship |
| FLAWED-MECHANISM | the change works but the mechanism violates the doctrine/architecture (the arbitrary walk, the candle-first significance) | the surgical fix or the re-dispatch with the specific flaw |
| FITTED-TO-GOLDEN | a constant/offset tuned to land on the golden level (the anti-hardcode violation) | the re-dispatch: the value must emerge from the data |
| E3-FABRICATION | E3 invented its own rule instead of consuming the E1/E2 data | the re-dispatch with the architecture constraint quoted |
| ARCHITECTURE-VIOLATION | the change overrides/ignores the pre-existing E1/E2 data | the re-dispatch with the constraint quoted |
| SCOPE-CREEP | the change alters behavior outside the stated scope | the revert of the out-of-scope parts |
| UNVERIFIED-PREMISE | the change rests on an un-probed assumption (the "all rungs zfp 20" type) | the probe FIRST, then the verdict |
| SILENT-FALLTHROUGH | the change's primary path can fail silently to a fallback (the OB-id-vs-candidates mismatch) | the fix: the primary must resolve or fail loudly |

---

## PART 18 — THE PROJECT-SPECIFIC CONTEXT MAP (the files every dispatch references — the Plutus v4.5.2)

### 18.1 The E1→E2→E3 chain (the architecture every agent must know)
- E1 = the zone map: `src/mdve/` (ob-engine.ts — the S/D OBs; lmv.ts + lqz-matrix.ts — the LQZ rungs; obcv.ts — the BoM/MoM detection; 9-pillar-lobe.ts — the IP zones; the ZFP ladders: the BoM 10/18/32/65, the MoM 65/22/38/70, the LQZ min(60,20+floor((touches-3)/2)*5), the 6D-confluence step). E1 PROVIDES THE STRUCTURE.
- E2 = the shape chain: `src/brains/shape-brain.ts` (projectZoneForDay, the DayBand, the day-reachability, the ShapeDayZone with the keyZoneId/keyZonePrice/demandZoneId/supplyZoneId/session) + `src/mdve/prior-week-preflight.ts` (the storyline). E2 BUILDS ON E1.
- E3 = the setups + the refinement: `src/mdve/setup-gen.ts` (the source lane), `src/mdve/mirror.ts` (the mirror lane: cascadeV45 → reAnchorMirror → selectPairNativeZone → computeLmvTP/computeSL_LMV), `src/mdve/refinement-machine.ts` (the 3D machine), `report-v452.ts` (the pipeline entry). E3 MUST FIT WITHIN E1+E2.

### 18.2 The dispatch's mandatory reading order (per task type)
- A mirror/cascade change: read mirror.ts (the cascadeV45/reAnchorMirror/selectPairNativeZone/computeLmvTP/computeSL_LMV regions) + shape-brain.ts (the ShapeDayZone) + the NEXT-BUILD SPEC §6 + the DECISION_CHAIN A1-A6.
- A source-lane change: read setup-gen.ts (the anchor selection, the internalLmvRungEntry, the F1-A/F1-B) + sl-lmv.ts (READ-ONLY — the computeSL_LMV) + the D8/D37 debug-log sections.
- A refinement change: read refinement-machine.ts (auditSetup3D/refineSetup/retranslateSetup) + the FIX PLAN §3/§10 + the NON-NEGOTIABLE ORCHESTRATOR PRINCIPLES §7/§13 (the E1→E2→E3-compliant design).
- An E2 change: read shape-brain.ts (projectZoneForDay, the buildDayDecomposition) + the ENGINEERING SPEC §5 + the DECISION_CHAIN A4/A5.
- A map change (the OBCV/LMV): read obcv.ts + lmv.ts + the ENGINEERING SPEC §3/§4 + the diag-lmv-golden/obcv-golden gates.

### 18.3 The doctrine files (the quote sources — every dispatch quotes from these)
- `MASTER_CONTEXT/PLUTUS_V4.5.2_NEXT_BUILD_SPEC.md` — the build authority.
- `context_management/DECISION_CHAIN.md` — the canon rulings verbatim.
- `MASTER_CONTEXT/PLUTUS_ARCHITECTURE_BIBLE_4.0.md` + `4.5.md` — the E1/E2/E3 canon + the doctrine.
- `MASTER_CONTEXT/PLUTUS_V4.5.2_OVERHAUL_DEBUG_LOG.md` — the D-sections (the D37 = the refinement-engine derailment).
- `MASTER_CONTEXT/NON_NEGOTIABLE_ORCHESTRATOR_PRINCIPLES.md` — THIS file.

---

## PART 19 — THE 15-MINUTE DIFF AUDIT (the procedural checklist — the minimum audit per changed file)

1. [ ] OPEN the changed file (the live tree or the diff).
2. [ ] READ the changed regions IN FULL (the read tool or the grep-context).
3. [ ] For each hunk: WHAT does it do? (the one-line mechanic)
4. [ ] WHY did the agent do it that way? (the claimed reason — verify it against the doctrine)
5. [ ] Does it consume the E1/E2 data or fabricate its own? (the architecture check)
6. [ ] Does it quote the doctrine or invent a rule? (the D13 check)
7. [ ] Does it compute from the data or fit the golden? (the hardcode check)
8. [ ] Does it change behavior outside the scope? (the blast-radius check)
9. [ ] What are the importers of the changed function? (the caller check)
10. [ ] Write the verdict (the PART-17 vocabulary) + the correction if flawed.
11. [ ] RUN the verification battery YOURSELF.
12. [ ] PROBE the mechanism's premises (the fixture/rungs/E2 days).
13. [ ] Record the wave report (PART 15).

---

## PART 20 — THE ORCHESTRATOR'S SELF-AUDIT (the operator's standard, applied to the orchestrator)

The operator's audit of the orchestrator is the same standard the orchestrator applies to the subagents:
1. Did the orchestrator read WHAT the subagents did? (the diff review — the PART 19 checklist)
2. Did the orchestrator know WHY they did it? (the reasoning demanded + verified)
3. Did the orchestrator verify HOW it affects the codebase? (the blast radius + the probes)
4. Did the orchestrator trace the changes to the doctrine + the architecture? (the D13 + the E1→E2→E3)
5. Did the orchestrator's wave reports record the diff reviews? (the PART 15 structure)
6. Would the operator's own audit find a logic flaw the orchestrator missed? (the adversarial self-review)

**The operator's words (2026-08-01): "you clearly did not actually look at WHAT the subagents did and WHY they did it or HOW ti affects the codebase you would have obviously seen the logic flaws and derailments here." — the orchestrator's PRIMARY job is the LOGIC AUDIT. Everything else is secondary.**

*END OF THE NON-NEGOTIABLE ORCHESTRATOR PRINCIPLES (FINAL) — 500+ lines, the operator's mandate, the audit standards, the dispatch standards, the anti-patterns, the worked post-mortem, the refinement-engine spec, the templates, the project context map, the self-audit. Violation of any section = a derailment.*
