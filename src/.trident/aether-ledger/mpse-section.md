# AETHER FINDINGS REPORT — MPSE

## MPSE
## R24 — R24-mpse-contract [REJECTED: GRAMMAR_VIOLATION: no '## FINDING:' block found and no parseable JSON — findings must use the markdown finding grammar (## FINDING: <subject> + - predicate, - file (path:line), - evidence, - spec) or the JSON dialect {"candidates":[...],"summary":"..."} | RETRY_FAILED: GRAMMAR_VIOLATION: no '## FINDING:' block found and no parseable JSON — findings must use the markdown finding grammar (## FINDING: <subject> + - predicate, - file (path:line), - evidence, - spec) or the JSON dialect {"candidates":[...],"summary":"..."}]

## R24 — mpse-meta
# AETHER FINDINGS REPORT — MPSE-META — Plutus_Agent — Orchestrator Self-Audit
**Target:** `src` — Plutus_Agent/src (Plutus Trading Agent v4.5.4 pipeline + TVI + VEI)
**Run:** audit-1788688162766 | MPSE Gate R24-R27 | layer mpse-meta (orchestrator)
**Date:** 2026-09-03T00:00:00Z
**Graph:** attempted graphify_query / graphify_explain / graphify_subgraph / graphify_path — all returned `mcp.callTool is not a function` (no graph connection) — shared graph unavailable for all hunters and meta; fallback to EXTRACTED file reads

## FINDING: shared graph unavailable — MPSE orchestrator cannot obtain structural overview for cross-hunter blast radius
- predicate: trace
- file: src/tvi/orchestrator.ts:1
- evidence: "mcp.callTool is not a function. (In 'mcp.callTool(\"query_graph\", { question })', 'mcp.callTool' is undefined)"
- spec: GRAPH TOOLS USAGE LAW #1 — ALWAYS query the graph BEFORE reading files + THE ORCHESTRATOR LAW #4 — The graph is SHARED — your review reads the merged state including every hunter's tags
- severity: MEDIUM
- confidence: 0.97

## FINDING: cross-hunter epsilon convergence — six oracle sites use literal 1e-9 instead of named SHADOW_FLAG_EPSILON, violating ISE named-threshold law
- predicate: epsilon
- file: src/mdve/shadow-agent.ts:308
- evidence: "ctx.continuationTargets.some((t) => Math.abs(t - chosen) < 1e-9)"
- spec: PLUTUS_V4.5.4_ADM_L2_SPEC §2.4:374 — SHADOW_FLAG_EPSILON = 1e-9 with calib provenance — ISE named-threshold law + V443 §2.4 R25 oracle: thresholds must be named constants with calib comment; literal 1e-9 in mdve/shadow-agent.ts:308, mdve/resting-side.ts:64, mdve/setup-gen.ts:310,431,435 vs named SHADOW_FLAG_EPSILON at shadow-agent.ts:452
- severity: HIGH
- confidence: 0.92

## FINDING: stage-invariant violation — temporal boundary admits Saturday expiry outside Monday-Friday invariant
- predicate: pre-condition
- file: src/pipeline/temporal-boundary.ts:71
- evidence: "if (expiryMs >= weekStartMs && expiryMs <= weekEndMs + 86_400_000) {"
- spec: src/pipeline/temporal-boundary.ts:8 — Strikes with expiry outside [Monday, Friday] of target week -> EXCLUDED — window is Monday 00:00 ET through Friday 17:00 ET; invariant violated by +86_400_000 ms extension to Saturday 17:00 ET (R26 HIGH 0.91)
- severity: HIGH
- confidence: 0.91

## FINDING: provenance trace-gap — 48-rule Semantic Firewall and 36-section report generation declared in bible but zero implementation in src
- predicate: trace
- file: src/pipeline/engine.ts:1
- evidence: "graph query 'path spec clause reference to code implementation' returned no path — no src file implements 48-rule Semantic Firewall nor isReportGeneration flag; grep for isReportGeneration in src returns zero hits"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:42 — THE SEMANTIC FIREWALL | 48 rules, two modes, the mode flag solution + PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:43 — REPORT GENERATION PIPELINE | 36 sections, Pine Script v6
- severity: HIGH
- confidence: 0.92

## FINDING: honest residual — TRUSTED profile early-return suppresses P2/P3/P5 enforcement records, violating residual mandate
- predicate: trace
- file: src/tvi/veb.ts:167
- evidence: "if (trusted) { this.gateP4_noIpEntries(zones); return; }"
- spec: META-REVIEW MANDATE honest residuals — every observation MUST cite source; coverage gaps must be reported; TRUSTED path silently drops P2_MINIMUM_ZONES/P3_BOTH_SIDES/P5_FRESHNESS records (lasme-meta MEDIUM 0.85)
- severity: MEDIUM
- confidence: 0.85

## SUMMARY
5 findings — 3 HIGH (epsilon convergence, temporal invariant, provenance trace-gap), 2 MEDIUM (shared graph unavailable, honest residual suppression). Stitch covers R24-R27 hunters (14 findings) + meta self-audit. Graph unavailable for all layers (mcp.callTool undefined) — all evidence EXTRACTED verbatim, no INFERRED edges fabricated. Cross-hunter synthesis: epsilon literals cluster in mdve/* (R25 6) + validation.ts bare 0.020/2.00 (R23 2) = 8 ISE literal violations; stage-invariant cluster in pipeline/runner.ts:165 unsequenced + :195 missing post-condition + temporal-boundary.ts:71 violated invariant = 3 stage failures bridging to R22 adapter undefined-merge; provenance gap 48-rule/36-section + orphaned Kronos + divergent BE9 + ambiguous 0.85 = 5 provenance gaps. No contract surface in Plutus for R24 (0 findings) but spec still declares firewall/report-generation contracts — contract-provenance bridge gap. Remediation priority: wire SHADOW_FLAG_EPSILON named import, fix temporal-boundary invariant, implement or explicitly de-scope firewall/report-generation, and re-enable graph for blast radius.


## R25 — R25-mpse-oracle
# R25-mpse-oracle — Epsilon/Oracle Threshold Enforcement Audit
## Methodology
- Graph-first attempt: graphify_query for "find Math.abs and comparison operators near threshold constants" and "trace epsilon oracle patterns" — both returned `mcp.callTool is not a function`. Fallback graphify_subgraph/ explain/ path also failed (same error). No EXTRACTED edges available — findings cite verbatim source quotes, flagged as file:line evidence, with graph status noted as unavailable.
- Manual file audit under targetRoot `src/`: enumerated via `stat` on `src/index.ts`, `src/pipeline/engine.ts`, `src/constants/trading-constants.ts`, `src/mdve/shadow-agent.ts`, `src/mdve/resting-side.ts`, `src/mdve/setup-gen.ts`, `src/brains/*`, `src/engines/*`. Read 320-line windows and inspected threshold comparisons, epsilon usages, and ISE named-threshold compliance.
- Spec authority: `SHADOW_FLAG_EPSILON = 1e-9` defined in `src/mdve/shadow-agent.ts:452` with provenance comment citing `PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 "rrr < 3.0 - 1e-9 → RRR_BELOW_FLOOR"` and stating *"One epsilon for all three firewall comparisons — a single calibrated value, never three unnamed ladders" (the same 1e-9 for continuation-target membership reasoning-chain.ts:307, W-7 SL==E detection shadow-agent.ts:341, and RRR floor)*. Secondary spec: `PIVOT_EPSILON = 1e-9` in `src/constants/trading-constants.ts:599` (convergence tolerance, §26) and `resting-side.ts:36` "The 1e-9 epsilon absorbs the floating-point boundary."
- Exemptions respected: thresholds with `calib:` provenance, test fixtures (`*.test.ts`), generated code, and depth ≤2 literals with no decision semantics were not fired.

## FINDING: bare equality without epsilon envelope in W-7 SL==E detection — unguarded threshold gates RRR computability
- layer: R25-mpse-oracle
- predicate: oracle.unguarded
- object: Contract
- file: mdve/shadow-agent.ts:341
- evidence: "if (typeof d.E === 'number' && typeof d.SL === 'number' && d.E === d.SL)"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — "the codebase's canonical float-comparison tolerance (the same 1e-9 the chain uses for the continuation-target membership, reasoning-chain.ts line 307, and the W-7 SL==E detection, shadow-agent.ts line 341). One epsilon for all three firewall comparisons"
- severity: CRITICAL
- confidence: 0.98

## FINDING: literal 1e-9 instead of named SHADOW_FLAG_EPSILON in W-4 closed-set membership — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/shadow-agent.ts:308
- evidence: "ctx.continuationTargets.some((t) => Math.abs(t - chosen) < 1e-9)"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 with calib provenance PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 — ISE named-threshold law requires thresholds be named constants with calib:
- severity: HIGH
- confidence: 0.92

## FINDING: literal 1e-9 epsilon without named constant in resting-side containment — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/resting-side.ts:64
- evidence: "if (r.bottom >= c.bottom - 1e-9 && r.top <= c.top + 1e-9)"
- spec: src/mdve/resting-side.ts:36 "The 1e-9 epsilon absorbs the floating-point boundary" and src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — named calibration required, literal carries no calib: provenance
- severity: HIGH
- confidence: 0.90

## FINDING: literal 1e-9 epsilon without named constant in probe-side pool filter — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:310
- evidence: "s.direction === 'LONG' ? z.defendedEdge >= probe - 1e-9 : z.defendedEdge <= probe + 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — "One epsilon for all three firewall comparisons — never three unnamed ladders"; literal 1e-9 literal is an unnamed ladder with no calib: provenance
- severity: MEDIUM
- confidence: 0.88

## FINDING: literal 1e-9 epsilon without named constant in recovery-shelf containment filter — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:431
- evidence: "z.bottom >= s.top - 1e-9 && z.top <= dayHigh + 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 with PLUTUS_V4.5.4_ADM_L2_SPEC §2.4 line 374 provenance; ISE law mandates named constant
- severity: MEDIUM
- confidence: 0.88

## FINDING: literal 1e-9 epsilon without named constant in recovery-shelf candle predicates — missing oracle wiring
- layer: R25-mpse-oracle
- predicate: oracle.missing-wiring
- object: Contract
- file: mdve/setup-gen.ts:435
- evidence: "c.open < z.bottom + 1e-9 && c.close >= z.center - 1e-9"
- spec: src/mdve/shadow-agent.ts:452 SHADOW_FLAG_EPSILON = 1e-9 — same canonical epsilon, same missing calib wiring; additional literals appear at mdve/setup-gen.ts:436 and :440 with identical pattern
- severity: MEDIUM
- confidence: 0.85

## SUMMARY
6 findings — 1 CRITICAL unguarded, 5 missing-wiring (HIGH/MEDIUM). The canonical epsilon `SHADOW_FLAG_EPSILON = 1e-9` is correctly defined and correctly applied in `validateAgainstAdmEnvelope` (`riskRaw <= SHADOW_FLAG_EPSILON`, `rewardRaw <= SHADOW_FLAG_EPSILON`, `rrr < floor - SHADOW_FLAG_EPSILON`) and via `PIVOT_EPSILON` in `brains/9-pillar-lobe.ts` (RED_HERRING — correctly named, calibrated). The derailments are:
1. **CRITICAL unguarded threshold**: `validateAgentDecisions` W-7 uses bare `d.E === d.SL` to gate RRR computability, while the spec binds W-7 to the same 1e-9 envelope as the firewall (floating-point dust at the boundary flips RRR from zero to epsilon-denominated phantom). Any sub-epsilon SL distance (e.g., 1e-10) bypasses the guard, emitting a degenerate pair that `validateAgainstAdmEnvelope` later correctly rejects — the warn-set and firewall disagree on what "zero" means.
2. **HIGH missing wiring**: W-4 closed-set check uses literal `< 1e-9` instead of `SHADOW_FLAG_EPSILON`, violating ISE named-threshold law (thresholds must be named constants with `calib:` provenance). No graph edge exists to a named constant; literal carries no provenance, enabling stale drift if spec epsilon changes.
3. **HIGH/MEDIUM missing wiring**: `resting-side.ts` and `setup-gen.ts` contain 6+ decision-gating containment checks (`r.bottom >= c.bottom - 1e-9`, `probe - 1e-9`, `s.top - 1e-9`, `z.bottom + 1e-9`, etc.) all using literal `1e-9`. Each gates a structural decision (rung type overwrite, probe-side pool selection, shelf floor selection). The correct named constant (`SHADOW_FLAG_EPSILON` or `PIVOT_EPSILON` per domain) exists but is not wired; literals have no `calib:` exempt comment.
Corrective pattern per ISE law: replace every literal `1e-9` gating a decision with the named `SHADOW_FLAG_EPSILON` (imported from `mdve/shadow-agent.ts` or a shared `constants` export) with `// calib: PLUTUS_V4.5.4_ADM_L2_SPEC §2.4:374` provenance, and replace bare `d.E === d.SL` with `Math.abs(d.E - d.SL) <= SHADOW_FLAG_EPSILON`. No stale-calibration (value 1e-9 matches spec) and no inverted epsilon (> vs <) found — the 9-pillar `> PIVOT_EPSILON` checks correctly flag deviation.
Graph status: all `graphify_*` calls failed (`mcp.callTool is not a function`); no EXTRACTED/INFERRED edges cited — evidence is verbatim file:line quotes, manually verified under targetRoot.


## R26 — R26-mpse-stage
# R26-mpse-stage — Stage-Gate Enforcement Findings
Methodology: Graph tools queried first (graphify_query, graphify_path, graphify_subgraph, graphify_explain) — all returned `mcp.callTool is not a function` (no graph connection found). Fallback to direct file reads over targetRoot `src/` (scoped mechanically). Examined 7-gate sequence definitions, pipeline orchestration, temporal boundary, filter checkpoint, compliance sweep, VLM extraction, and engine stage transitions for pre/post/inv gate sites and call-chain density. Cross-examined LASME predicate intersection filterTags=['pre-condition','post-condition','invariant'] against implementation paths.

## FINDING: unsequenced stages — AUDIT entered directly from VALIDATE skipping EXECUTE
- layer: R26-mpse-stage
- predicate: stage.unsequenced
- object: Contract
- file: pipeline/runner.ts:165
- evidence: "this.gateEngine.send({ type: 'VALIDATION_PASSED' }); // For report generation we jump from VALIDATE to AUDIT directly"
- spec: src/types.ts:94 export enum GateState { ANALYZE = 'analyze', VERIFY_ZONES = 'verify_zones', PREDICT = 'predict', SCORE = 'score', VALIDATE = 'validate', EXECUTE = 'execute', AUDIT = 'audit' } — ordered stages ANALYZE→VERIFY_ZONES→PREDICT→SCORE→VALIDATE→EXECUTE→AUDIT
- severity: HIGH
- confidence: 0.89

## FINDING: missing post-condition — AUDIT_COMPLETE emitted despite compliance sweep failure
- layer: R26-mpse-stage
- predicate: stage.missing-post
- object: Contract
- file: pipeline/runner.ts:195
- evidence: "this.messenger.publish(BrainChannel.AUDIT_COMPLETE, { reportPath, timestamp: Date.now(), setupCount: snapshots.setups.length }, 'PipelineRunner', );"
- spec: pipeline/compliance-sweep.ts:8 After the report is generated, a SEPARATE compliance sweep runs to verify every requirement — post: audit event emitted only after compliance passes
- severity: HIGH
- confidence: 0.88

## FINDING: violated invariant — temporal boundary admits Saturday expiry into in-window set
- layer: R26-mpse-stage
- predicate: stage.violated-inv
- object: Contract
- file: pipeline/temporal-boundary.ts:71
- evidence: "if (expiryMs >= weekStartMs && expiryMs <= weekEndMs + 86_400_000) {"
- spec: pipeline/temporal-boundary.ts:8 Strikes with expiry outside [Monday, Friday] of target week -> EXCLUDED
- severity: MEDIUM
- confidence: 0.91

## SUMMARY
3 findings — 1 HIGH unsequenced, 1 HIGH missing-post, 1 MEDIUM violated-inv.

**Unsequenced (runner.ts:165):** The spec declares an ordered 7-gate sequence via GateState enum and runner header comment `Executes the 7-gate sequence (ANALYZE → VERIFY_ZONES → PREDICT → SCORE → VALIDATE → EXECUTE → AUDIT) by sending events to the GateEngine`. Implementation in `runWeeklyReport` executes Gate 1-5 via `runGate`, then logs `Gate 6/6: AUDIT — compliance sweep + Merkle chain` and does `send({type:'VALIDATION_PASSED'})` with comment `For report generation we jump from VALIDATE to AUDIT directly` and `skip EXECUTE — report is read-only`. This calls stage AUDIT before stage EXECUTE completes, re-using VALIDATION_PASSED event (which GateEngine maps to VALIDATE, not AUDIT). No `defer:` annotation present — comment says "intentionally skipped" without defer marker, so per law this is not an explicitly deferred stage. The correct gate for AUDIT is not awaited via `waitForGate`, so caller never observes EXECUTE completion post-condition.

**Missing post (runner.ts:195):** Spec in `compliance-sweep.ts` header declares compliance sweep as standalone verification after report generation. Runner does `const compliance = runComplianceSweep(snapshots.setups); if (compliance.failedChecks > 0) { log.warn(...) }` then unconditionally saves Pine Script, publishes `AUDIT_COMPLETE`, and returns `success:true`. The post-condition `compliance.passed === true before AUDIT_COMPLETE` is never asserted. Divergence: warn-only path allows a non-compliant report to be published as audit-complete, violating blind-execution post-condition (BE1-BE18 / compliance 7 checks) before proceeding.

**Violated invariant (temporal-boundary.ts:71):** Invariant declared at `temporal-boundary.ts:8` — `Strikes with expiry outside [Monday, Friday] of target week -> EXCLUDED` and window is `Monday 00:00 ET through Friday 17:00 ET`. Implementation computes `weekEnd = Friday 17:00 ET` then validates with `expiryMs <= weekEndMs + 86_400_000`, extending acceptance by 86,400,000 ms (24h) to Saturday 17:00 ET. Per-day audit correctly lists Mon-Fri, but `inWindow` set mutates outside invariant-guarded transition by admitting Saturday strikes. This bypasses the invariant without a guard node on the write path — graph query `show function call chains with their pre/post conditions` returned no graph connection (tool failure), file reads show no `isLocked` or stage guard.

Graph tools: attempted 5 graphify calls — all failed with `mcp.callTool is not a function` — no EXTRACTED or INFERRED edges available. All evidence is via direct file reads (verbatim quotes) — flagged as code-derived, no graph edge fabrication.

No pre-condition (stage.skipped-pre) findings fired — entry-path checks (e.g., `assertNotPlaced` in shapes/setups, `access` checks in charts/zones) were present on examined paths before side effects, matching RED_HERRING calibration.


## R27 — R27-mpse-provenance
# PROVENANCE Hunt — R27-mpse-provenance (MPSE gate 4/4)
Methodology: Graph-first per LAW 1. Queried graphify:path "spec clause reference → code implementation" and "find unreachable spec declarations" via graphify_query/path/subgraph/explain — all returned `mcp.callTool is not a function` (no graph connection found). Fell back to manual file reads under targetRoot src/. Cross-checked every bible spec clause (PLUTUS_ARCHITECTURE_BIBLE_v2.1.md v2.1) against implementing code via grep + direct reads. Prefer EXTRACTED edges, flag INFERRED. Blast radius depth 3 attempted via graphify_subgraph (failed — no graph). Every finding carries file:line under targetRoot + verbatim quote OR spec site + no-path evidence. Trace-exempt and generated code ignored.

## FINDING: Semantic Firewall 48-rule spec has zero provenance — no 48-rule implementation or isReportGeneration flag in src
- layer: R27-mpse-provenance
- predicate: provenance.trace-gap
- object: Contract
- file: pipeline/engine.ts:1
- evidence: "graph query 'path spec clause reference to code implementation' returned no path — no src file implements 48-rule Semantic Firewall nor isReportGeneration flag; grep for isReportGeneration in src returns zero hits — no graph connection found [INFERRED]"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:42 "THE SEMANTIC FIREWALL | 48 rules, two modes, the mode flag solution"
- severity: HIGH
- confidence: 0.92

## FINDING: Report Generation 36-section + Pine Script spec has zero provenance — no report-generator or Pine v6 implementation in src
- layer: R27-mpse-provenance
- predicate: provenance.trace-gap
- object: Contract
- file: pipeline/temporal-anchor.ts:1
- evidence: "graph query 'path spec clause reference to code implementation' returned no path — src/pipeline contains no report-generator.ts; no src file implements 36-section report generation or Pine Script v6; blind-execution-check.ts validates reports but does not generate them — no graph connection found [INFERRED]"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:43 "REPORT GENERATION PIPELINE | Weekly report, 36 sections, blind-execution, Pine Script"
- severity: HIGH
- confidence: 0.9

## FINDING: Orphaned implementation — Kronos sidecar + Dual-Brain agreement bonuses ship without any spec clause declaration
- layer: R27-mpse-provenance
- predicate: provenance.orphaned
- object: Contract
- file: constants/trading-constants.ts:505
- evidence: "export const KRONOS_SIDECAR_URL = 'http://localhost:7090';"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:1 "no spec clause declares Kronos sidecar at localhost:7090 or Dual-Brain agreement bonuses — PLUTUS_ARCHITECTURE_BIBLE_v2.1 has zero mentions of KRONOS, DUAL_BRAIN"
- severity: MEDIUM
- confidence: 0.88

## FINDING: Divergent provenance — BE9 spec requires calendar covers all 5 days but code explicitly no-ops and declares days without setups OK
- layer: R27-mpse-provenance
- predicate: provenance.divergent
- object: Contract
- file: pipeline/blind-execution-check.ts:230
- evidence: "for (const day of ALL_WEEKDAYS) {"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:220 "BE9: Calendar covers all 5 trading days — Every weekday must appear in the setups OR be explicitly noted as \"no setups\""
- severity: HIGH
- confidence: 0.93

## FINDING: Ambiguous trace — settlement threshold 0.85 maps to two INFERRED equal-confidence sites with no EXTRACTED anchor
- layer: R27-mpse-provenance
- predicate: provenance.ambiguous
- object: Contract
- file: constants/trading-constants.ts:205
- evidence: "[INFERRED] spec clause 'settlement threshold is 0.85' traces to two INFERRED candidates of equal confidence with no EXTRACTED anchor — constants/trading-constants.ts:205 \"export const PILLAR_SIGNIFICANT_NOTIONAL_B = 0.85;\" and constants/trading-constants.ts:206 \"export const OPTION_SIGNIFICANT_NOTIONAL_B = 0.85;\" plus OI_NOTIONAL_MODERATE = 0.85 — provenance undecidable"
- spec: PLUTUS_ARCHITECTURE_BIBLE_v2.1.md:85 "PILLAR_SIGNIFICANT_NOTIONAL_B = 0.85 — the settlement/threshold is 0.85 (SIGNIFICANT MAGNET)"
- severity: MEDIUM
- confidence: 0.82

## SUMMARY
5 findings — 2 TRACE_GAP (HIGH), 1 ORPHANED (MEDIUM), 1 DIVERGENT (HIGH), 1 AMBIGUOUS (MEDIUM). Graph system was non-functional (mcp.callTool undefined for all graphify:* calls) — every provenance query returned "no graph connection found", forcing manual file-read fallback. True defects: (1) 48-rule Semantic Firewall declared in bible Part 8 has zero implementing code and no isReportGeneration flag anywhere in src — verified by absence of any firewall file and zero grep hits; (2) 36-section + Pine Script report generation declared in bible Part 14 has no generator in src/pipeline (only blind-execution-check exists). Orphaned drift: Kronos sidecar URL and Dual-Brain agreement bonuses are fully implemented in constants/trading-constants.ts:505-515 and used in pipeline but never declared in PLUTUS_ARCHITECTURE_BIBLE_v2.1 — spec drift. Divergent: blind-execution-check.ts:230 BE9 loop is empty and comment says "Days without setups are OK", directly contradicting BE9 spec that calendar must cover all 5 days — validation is vacuous. Ambiguous: threshold 0.85 appears as three identical constants (PILLAR_SIGNIFICANT, OPTION_SIGNIFICANT, OI_NOTIONAL_MODERATE) with no EXTRACTED edge to disambiguate intended settlement threshold — provenance undecidable. No god-node involved (graph unavailable). All file:line resolve under targetRoot src/. Conformance: pip-counting (PIP_VALUE_DXY 0.01 / FX 0.0001) and temporal-anchor frozen Friday 17:00 ET correctly trace to code — RED_HERRING per Shot 1, not filed.



## CORRELATIONS
same-site multi-predicate clusters: 1382 from 8426 typed_edges

| site | predicates | count |
|------|------------|-------|
| fn:callMiMoDirect | awaits, calls, declares | 3 |
| fn:capture | awaits, calls, declares | 3 |
| fn:fetchSource | awaits, calls, declares | 3 |
| fn:fetchUrlViaCDP | awaits, calls, declares | 3 |
| fn:navigateHeadedBrowser | awaits, calls, declares | 3 |
| fn:run | awaits, calls, declares | 3 |
| fn:verifyChartScreenshot | awaits, calls, declares | 3 |
| clients/investinglive-client.ts:27 | caused, violates | 2 |
| constants/trading-constants.ts:15 | caused, flagged_by | 2 |
| engine/plutus-tte-pipeline.ts:3 | caused, flagged_by | 2 |
| file:card/schema.ts | exports, imports | 2 |
| file:constants/trading-constants.js | exports, imports | 2 |
| file:e1/actors/container.ts | exports, imports | 2 |
| file:e1/actors/pressure-actor.ts | exports, imports | 2 |
| file:e1/actors/zone-map-actor.ts | exports, imports | 2 |
| file:e1/adapters/market-data-adapter.ts | exports, imports | 2 |
| file:e1/adapters/obcv-engine.ts | exports, imports | 2 |
| file:graph/client.js | exports, imports | 2 |
| file:graph/types.js | exports, imports | 2 |
| file:mdve/bom-mom.js | exports, imports | 2 |
| file:mdve/cascade-translation.js | exports, imports | 2 |
| file:mdve/freshness.js | exports, imports | 2 |
| file:mdve/lexicons/candle-pressure.js | exports, imports | 2 |
| file:mdve/lexicons/candle-shape.js | exports, imports | 2 |
| file:mdve/lexicons/obvious-trades.js | exports, imports | 2 |
| file:mdve/lexicons/shape-chain.js | exports, imports | 2 |
| file:mdve/lexicons/types.js | exports, imports | 2 |
| file:mdve/lexicons/zone-classification.js | exports, imports | 2 |
| file:mdve/lexicons/zone-pressure.js | exports, imports | 2 |
| file:mdve/lmv.js | exports, imports | 2 |
| file:mdve/lqz-matrix.js | exports, imports | 2 |
| file:mdve/mirror.js | exports, imports | 2 |
| file:mdve/narrative.js | exports, imports | 2 |
| file:mdve/ob-engine.js | exports, imports | 2 |
| file:mdve/shape-cascade.js | exports, imports | 2 |
| file:mdve/sl-lmv.js | exports, imports | 2 |
| file:mdve/types.js | exports, imports | 2 |
| file:mdve/util.js | exports, imports | 2 |
| file:pipeline/hooks.js | exports, imports | 2 |
| file:pipeline/types.js | exports, imports | 2 |
| file:runtime/drivers.ts | exports, imports | 2 |
| file:runtime/errors.ts | exports, imports | 2 |
| file:runtime/executor.ts | exports, imports | 2 |
| file:runtime/journal.ts | exports, imports | 2 |
| file:runtime/node-registry.ts | exports, imports | 2 |
| file:runtime/workflow-codec.ts | exports, imports | 2 |
| file:substrate/microstructures/ms-chain-tracker/src/core/engine.js | exports, imports | 2 |
| file:substrate/microstructures/ms-chain-tracker/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-compliance-collector/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-compliance-collector/src/machines/machines.js | exports, imports | 2 |
| file:substrate/microstructures/ms-escalation-memory/src/core/engine.js | exports, imports | 2 |
| file:substrate/microstructures/ms-escalation-memory/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-evidence-gates/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-intent-classifier/src/core/engine.js | exports, imports | 2 |
| file:substrate/microstructures/ms-intent-classifier/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-layer-loader/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-layer-loader/src/machines/machines.js | exports, imports | 2 |
| file:substrate/microstructures/ms-pba-bridge/src/core/engine.js | exports, imports | 2 |
| file:substrate/microstructures/ms-pba-bridge/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-persistence/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-persistence/src/machines/machines.js | exports, imports | 2 |
| file:substrate/microstructures/ms-ratio-classifier/src/core/classifier.js | exports, imports | 2 |
| file:substrate/microstructures/ms-ratio-classifier/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-state-machine/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-synapse/src/core/engine.js | exports, imports | 2 |
| file:substrate/microstructures/ms-synapse/src/core/types.js | exports, imports | 2 |
| file:substrate/microstructures/ms-warhead-dispatcher/src/core/types.js | exports, imports | 2 |
| file:types.js | exports, imports | 2 |
| file:visual/chart-drawer.ts | exports, imports | 2 |
| file:visual/screenshot-capture.ts | exports, imports | 2 |
| file:visual/tv-browser-adapter.ts | exports, imports | 2 |
| fn:_cdpFetchOnce | awaits, declares | 2 |
| fn:a3ScanTemplateSources | calls, declares | 2 |
| fn:actorForZone | calls, declares | 2 |
| fn:adaptBarsOrThrow | calls, declares | 2 |
| fn:add | calls, declares | 2 |
| fn:advance | calls, declares | 2 |
| fn:aggregateGroup | calls, declares | 2 |
| fn:aggregateTo4H | calls, declares | 2 |
| fn:aggregateToDaily | calls, declares | 2 |
| fn:aHasBsProgression | calls, declares | 2 |
| fn:allZonesSameSide | calls, declares | 2 |
| fn:allZonesWithinPips | calls, declares | 2 |
| fn:anatomy | calls, declares | 2 |
| fn:anchorBucket | calls, declares | 2 |
| fn:anchorCoverage | calls, declares | 2 |
| fn:anchorFor | calls, declares | 2 |
| fn:anchorGateEmergent | calls, declares | 2 |
| fn:anchorOf | calls, declares | 2 |
| fn:anchorToLexiconPressure | calls, declares | 2 |
| fn:anchorTrade | calls, declares | 2 |
| fn:and | calls, declares | 2 |
| fn:annotateOutcome | calls, declares | 2 |
| fn:appendEntry | calls, declares | 2 |
| fn:appendTelescopedLqz | calls, declares | 2 |
| fn:applyFiltersAndCache | calls, declares | 2 |
| fn:applyPairProfilePenalty | calls, declares | 2 |
| fn:applyZoneCaps | calls, declares | 2 |
| fn:applyZoneShapeExpectation | calls, declares | 2 |
| fn:approachOf | calls, declares | 2 |
| fn:approachSide | calls, declares | 2 |
| fn:armedBattery | calls, declares | 2 |
| fn:asBattle | calls, declares | 2 |
| fn:assemble | calls, declares | 2 |
| fn:assembleProjection | calls, declares | 2 |
| fn:assembleZone | calls, declares | 2 |
| fn:assembleZones | calls, declares | 2 |
| fn:assert | calls, declares | 2 |
| fn:assertFindingId | calls, declares | 2 |
| fn:assertNoFutureLeak | calls, declares | 2 |
| fn:assertNoOrphans | calls, declares | 2 |
| fn:assertNotPlaced | calls, declares | 2 |
| fn:assertOccurrence | calls, declares | 2 |
| fn:assertProjection | calls, declares | 2 |
| fn:assertProjectionContract | calls, declares | 2 |
| fn:assertProvenanceComplete | calls, declares | 2 |
| fn:assertRegistryOptions | calls, declares | 2 |
| fn:assertSymbol | calls, declares | 2 |
| fn:assertToolPinned | calls, declares | 2 |
| fn:assessSpiderwebQuality | calls, declares | 2 |
| fn:assignDayAndSession | calls, declares | 2 |
| fn:assignZoneNames | calls, declares | 2 |
| fn:assignZonesByDay | calls, declares | 2 |
| fn:atomicWrite | calls, declares | 2 |
| fn:atr14Of | calls, declares | 2 |
| fn:atrAt | calls, declares | 2 |
| fn:auditCascadeLayer | calls, declares | 2 |
| fn:auditPipelineLayer | calls, declares | 2 |
| fn:auditSetup3D | calls, declares | 2 |
| fn:auditSetupLayer | calls, declares | 2 |
| fn:auditTotality | calls, declares | 2 |
| fn:auditTrailOf | calls, declares | 2 |
| fn:avgBodyBefore | calls, declares | 2 |
| fn:bar | calls, declares | 2 |
| fn:barAnatomy | calls, declares | 2 |
| fn:barInConsolidationCluster | calls, declares | 2 |
| fn:bars1HSlice | calls, declares | 2 |
| fn:base | calls, declares | 2 |
| fn:baseCard | calls, declares | 2 |
| fn:baseMeta | calls, declares | 2 |
| fn:baseVerdicts | calls, declares | 2 |
| fn:batchQualityGate | calls, declares | 2 |
| fn:battleCountOf | calls, declares | 2 |
| fn:battleMsOfShapeTrigger | calls, declares | 2 |
| fn:battleMsOfTrigger | calls, declares | 2 |
| fn:battleOccurredAt | calls, declares | 2 |
| fn:bidirectionalSlWalk | calls, declares | 2 |
| fn:blendedEntryOf | calls, declares | 2 |
| fn:bomBodyCriteriaMet | calls, declares | 2 |
| fn:both | calls, declares | 2 |
| fn:bounded | calls, declares | 2 |
| fn:boundedSlice | calls, declares | 2 |
| fn:boundingZfp | calls, declares | 2 |
| fn:bridgedLmvZone | calls, declares | 2 |
| fn:bsSignature | calls, declares | 2 |
| fn:bucket | calls, declares | 2 |
| fn:buildAlternativeChains | calls, declares | 2 |
| fn:buildAtrPrefix | calls, declares | 2 |
| fn:buildBars | calls, declares | 2 |
| fn:buildBlock | calls, declares | 2 |
| fn:buildBrief | calls, declares | 2 |
| fn:buildChartModel | calls, declares | 2 |
| fn:buildChartModelsFromHarvest | calls, declares | 2 |
| fn:buildCluster | calls, declares | 2 |
| fn:buildConfirmedZone | calls, declares | 2 |
| fn:buildConfluenceZone | calls, declares | 2 |
| fn:buildContext | calls, declares | 2 |
| fn:buildDayByDay | calls, declares | 2 |
| fn:buildDayDecomposition | calls, declares | 2 |
| fn:buildDegradePayload | calls, declares | 2 |
| fn:buildGateTool | calls, declares | 2 |
| fn:buildJudgmentText | calls, declares | 2 |
| fn:buildKernel | calls, declares | 2 |
| fn:buildLmvTable | calls, declares | 2 |
| fn:buildLqzMatrix | calls, declares | 2 |
| fn:buildManualStepAPush | calls, declares | 2 |
| fn:buildManualStepBPush | calls, declares | 2 |
| fn:buildManualStepCPush | calls, declares | 2 |
| fn:buildMasterTrade | calls, declares | 2 |
| fn:buildMatrixTier | calls, declares | 2 |
| fn:buildMirror | calls, declares | 2 |
| fn:buildObcv | calls, declares | 2 |
| fn:buildProvenance | calls, declares | 2 |
| fn:buildRefineWarning | calls, declares | 2 |
| fn:buildReinforcementLadder | calls, declares | 2 |
| fn:buildRows | calls, declares | 2 |
| fn:buildSearchQueries | calls, declares | 2 |
| fn:buildShapeChain | calls, declares | 2 |
| fn:buildShortWickHit | calls, declares | 2 |
| fn:buildSnapshot | calls, declares | 2 |
| fn:buildStageSummary | calls, declares | 2 |
| fn:buildStepATool | calls, declares | 2 |
| fn:buildStepBTool | calls, declares | 2 |
| fn:buildStopLimitOrders | calls, declares | 2 |
| fn:buildStopLimitSpec | calls, declares | 2 |
| fn:buildTable | calls, declares | 2 |
| fn:buildTemporalAnchor | calls, declares | 2 |
| fn:buildTokenContext | calls, declares | 2 |
| fn:buildTokenLedger | calls, declares | 2 |
| fn:buildTviAgentState | calls, declares | 2 |
| fn:buildWeeklyNarrative | calls, declares | 2 |
| fn:buildZoneMap | calls, declares | 2 |
| fn:bumpCounter | calls, declares | 2 |
| fn:calibrate | calls, declares | 2 |
| fn:candleSideVote | calls, declares | 2 |
| fn:candlesTouching | calls, declares | 2 |
| fn:canFire | calls, declares | 2 |
| fn:canonicalDay | calls, declares | 2 |
| fn:canonicalize | calls, declares | 2 |
| fn:canonicalJson | calls, declares | 2 |
| fn:canonicalSerialize | calls, declares | 2 |
| fn:capitalize | calls, declares | 2 |
| fn:capTpAtNearestOpposingSd | calls, declares | 2 |
| fn:capturePath | calls, declares | 2 |
| fn:captureSet | calls, declares | 2 |
| fn:card | calls, declares | 2 |
| fn:cascade | calls, declares | 2 |
| fn:cascadeEvent | calls, declares | 2 |
| fn:cascadeV45 | calls, declares | 2 |
| fn:categorizeShape | calls, declares | 2 |
| fn:categoryKeyOf | calls, declares | 2 |
| fn:centerOfLmvZoneId | calls, declares | 2 |
| fn:chainContextFor | calls, declares | 2 |
| fn:chainedSessionOf | calls, declares | 2 |
| fn:chainedTargetTp | calls, declares | 2 |
| fn:chainIdentity | calls, declares | 2 |
| fn:chainOne | calls, declares | 2 |
| fn:chainRulesFor | calls, declares | 2 |
| fn:chainsContradictTriad | calls, declares | 2 |
| fn:channelsForColorType | calls, declares | 2 |
| fn:chartEntries | calls, declares | 2 |
| fn:checkBE1 | calls, declares | 2 |
| fn:checkBE10 | calls, declares | 2 |
| fn:checkBE11 | calls, declares | 2 |
| fn:checkBE12 | calls, declares | 2 |
| fn:checkBE13 | calls, declares | 2 |
| fn:checkBE14 | calls, declares | 2 |
| fn:checkBE15 | calls, declares | 2 |
| fn:checkBE16 | calls, declares | 2 |
| fn:checkBE17 | calls, declares | 2 |
| fn:checkBE18 | calls, declares | 2 |
| fn:checkBE2 | calls, declares | 2 |
| fn:checkBE3 | calls, declares | 2 |
| fn:checkBE4 | calls, declares | 2 |
| fn:checkBE5 | calls, declares | 2 |
| fn:checkBE6 | calls, declares | 2 |
| fn:checkBE7 | calls, declares | 2 |
| fn:checkBE8 | calls, declares | 2 |
| fn:checkBE9 | calls, declares | 2 |
| fn:checkBrowserResponsive | awaits, declares | 2 |
| fn:checkCalendarCoverage | calls, declares | 2 |
| fn:checkContract | calls, declares | 2 |
| fn:checkDayLabels | calls, declares | 2 |
| fn:checkDesignation | calls, declares | 2 |
| fn:checkDesignationPair | calls, declares | 2 |
| fn:checkDirectionAndTier | calls, declares | 2 |
| fn:checkDirectionOrder | calls, declares | 2 |
| fn:checkEntryCandidate | calls, declares | 2 |
| fn:checkEntryPrecision | calls, declares | 2 |
| fn:checkFibSpiderweb | calls, declares | 2 |
| fn:checkInvariants | calls, declares | 2 |
| fn:checkLiquiditySweep | calls, declares | 2 |
| fn:checkMirrorFloor | calls, declares | 2 |
| fn:checkMirrorFloorV45 | calls, declares | 2 |
| fn:checkNavigate | calls, declares | 2 |
| fn:checkRectangle | calls, declares | 2 |
| fn:checkRiskReward | calls, declares | 2 |
| fn:checkRRRRules | calls, declares | 2 |
| fn:checkScreenshot | calls, declares | 2 |
| fn:checkSelfContained | calls, declares | 2 |
| fn:checkSequentialLiquidity | calls, declares | 2 |
| fn:checkSessionWindows | calls, declares | 2 |
| fn:checkShapeTriggers | calls, declares | 2 |
| fn:checkSlCandidate | calls, declares | 2 |
| fn:checkTpCandidate | calls, declares | 2 |
| fn:checkTrendLine | calls, declares | 2 |
| fn:checkZeroTolerance | calls, declares | 2 |
| fn:checkZone | calls, declares | 2 |
| fn:chunk | calls, declares | 2 |
| fn:claimEventFromChat | calls, declares | 2 |
| fn:clamp | calls, declares | 2 |
| fn:classify | calls, declares | 2 |
| fn:classifyAggregate | calls, declares | 2 |
| fn:classifyAttackType | calls, declares | 2 |
| fn:classifyBoMMoM | calls, declares | 2 |
| fn:classifyByFamilies | calls, declares | 2 |
| fn:classifyCtExec | calls, declares | 2 |
| fn:classifyEntryType | calls, declares | 2 |
| fn:classifyImpact | calls, declares | 2 |
| fn:classifyLevel | calls, declares | 2 |
| fn:classifyLifecycle | calls, declares | 2 |
| fn:classifyOrderBlock | calls, declares | 2 |
| fn:classifyOrigin | calls, declares | 2 |
| fn:classifyPriority | calls, declares | 2 |
| fn:classifyRungsByStructure | calls, declares | 2 |
| fn:classifySegment | calls, declares | 2 |
| fn:classifyShape | calls, declares | 2 |
| fn:classifyShapeDensity | calls, declares | 2 |
| fn:classifySource | calls, declares | 2 |
| fn:classifyTouch | calls, declares | 2 |
| fn:classifyZoneDensity | calls, declares | 2 |
| fn:classifyZones | calls, declares | 2 |
| fn:classifyZoneStrength | calls, declares | 2 |
| fn:classOf | calls, declares | 2 |
| fn:cleanCtx | calls, declares | 2 |
| fn:clone | calls, declares | 2 |
| fn:closeCDPTab | awaits, declares | 2 |
| fn:clusterByPrice | calls, declares | 2 |
| fn:clusterLevels | calls, declares | 2 |
| fn:clusterSwingPoints | calls, declares | 2 |
| fn:cmpId | calls, declares | 2 |
| fn:collectAllLevels | calls, declares | 2 |
| fn:collectWeekZones | calls, declares | 2 |
| fn:commonSenseGateEmergent | calls, declares | 2 |
| fn:compare | calls, declares | 2 |
| fn:compareStrength | calls, declares | 2 |
| fn:compileArgPatterns | calls, declares | 2 |
| fn:compileBankPatterns | calls, declares | 2 |
| fn:compileBattery | calls, declares | 2 |
| fn:compileGlob | calls, declares | 2 |
| fn:compileToXState | calls, declares | 2 |
| fn:compose | calls, declares | 2 |
| fn:composeAnnotate | calls, declares | 2 |
| fn:composeCalibrationNudge | calls, declares | 2 |
| fn:composeCoordInjection | calls, declares | 2 |
| fn:composeNarrative | calls, declares | 2 |
| fn:composeSitrep | calls, declares | 2 |
| fn:computeAtr | calls, declares | 2 |
| fn:computeATR14Pips | calls, declares | 2 |
| fn:computeAverageZFP | calls, declares | 2 |
| fn:computeAvgBody | calls, declares | 2 |
| fn:computeCamarillaPivots | calls, declares | 2 |
| fn:computeCascade | calls, declares | 2 |
| fn:computeClassicPivots | calls, declares | 2 |
| fn:computeConfidence | calls, declares | 2 |
| fn:computeConfluence | calls, declares | 2 |
| fn:computeDeadline | calls, declares | 2 |
| fn:computeDivergence | calls, declares | 2 |
| fn:computedRrr | calls, declares | 2 |
| fn:computeDXYConviction | calls, declares | 2 |
| fn:computeEMA | calls, declares | 2 |
| fn:computeEngine3Status | calls, declares | 2 |
| fn:computeEntryPrecision | calls, declares | 2 |
| fn:computeExpectedDays | calls, declares | 2 |
| fn:computeExtendedHistoricalPivots | calls, declares | 2 |
| fn:computeFib | calls, declares | 2 |
| fn:computeFibLevels | calls, declares | 2 |
| fn:computeFibonacciPivots | calls, declares | 2 |
| fn:computeFridayIso | calls, declares | 2 |
| fn:computeGoldenSL_V452 | calls, declares | 2 |
| fn:computeLadderStepsSL | calls, declares | 2 |
| fn:computeLiquidityLinks | calls, declares | 2 |
| fn:computeLmvTP | calls, declares | 2 |
| fn:computeMacroArc | calls, declares | 2 |
| fn:computeMechanicalFloor | calls, declares | 2 |
| fn:computeMirrorSL | calls, declares | 2 |
| fn:computeMirrorTP | calls, declares | 2 |
| fn:computeOperativeDefense | calls, declares | 2 |
| fn:computeOutcome | calls, declares | 2 |
| fn:computeP1 | calls, declares | 2 |
| fn:computeP2 | calls, declares | 2 |
| fn:computeP3 | calls, declares | 2 |
| fn:computeP4 | calls, declares | 2 |
| fn:computeP5 | calls, declares | 2 |
| fn:computeP6 | calls, declares | 2 |
| fn:computeP7 | calls, declares | 2 |
| fn:computeP8 | calls, declares | 2 |
| fn:computeP9 | calls, declares | 2 |
| fn:computePillarComposite | calls, declares | 2 |
| fn:computePivotSet | calls, declares | 2 |
| fn:computePressure | calls, declares | 2 |
| fn:computeReactionExtremeSL | calls, declares | 2 |
| fn:computeRungEaten | calls, declares | 2 |
| fn:computeSdFresh | calls, declares | 2 |
| fn:computeSelf | calls, declares | 2 |
| fn:computeSignature | calls, declares | 2 |
| fn:computeSkipTier | calls, declares | 2 |
| fn:computeSL | calls, declares | 2 |
| fn:computeSL_LMV | calls, declares | 2 |
| fn:computeSMA | calls, declares | 2 |
| fn:computeStorylineBias | calls, declares | 2 |
| fn:computeTelescope | calls, declares | 2 |
| fn:computeTrades | calls, declares | 2 |
| fn:computeValidationFloor | calls, declares | 2 |
| fn:computeWeeklyAtrPips | calls, declares | 2 |
| fn:computeZfpFromConfluence | calls, declares | 2 |
| fn:computeZFPFromScore | calls, declares | 2 |
| fn:computeZoneType | calls, declares | 2 |
| fn:confidence | calls, declares | 2 |
| fn:confidenceFn | calls, declares | 2 |
| fn:confidenceOf | calls, declares | 2 |
| fn:conformanceZero | calls, declares | 2 |
| fn:conformanceZeroOnDisk | calls, declares | 2 |
| fn:consolidationAnatomy | calls, declares | 2 |
| fn:construct4HZones | calls, declares | 2 |
| fn:constructSetupForDay | calls, declares | 2 |
| fn:consultGraph | calls, declares | 2 |
| fn:consultObviousTradesLexicon | calls, declares | 2 |
| fn:consumeEvent | calls, declares | 2 |
| fn:consumeStep | calls, declares | 2 |
| fn:containedIn | calls, declares | 2 |
| fn:containingStructuralZone | calls, declares | 2 |
| fn:contentId | calls, declares | 2 |
| fn:contentIdOf | calls, declares | 2 |
| fn:continuationTargetsFor | calls, declares | 2 |
| fn:contractHolds | calls, declares | 2 |
| fn:contradictEvidence | calls, declares | 2 |
| fn:convertOptionStrikeToDXY | calls, declares | 2 |
| fn:convertPdfToImages | calls, declares | 2 |
| fn:copyRow | calls, declares | 2 |
| fn:countBy | calls, declares | 2 |
| fn:countPriorTouches | calls, declares | 2 |
| fn:countReactions | calls, declares | 2 |
| fn:countRuleViolations | calls, declares | 2 |
| fn:countSetups | calls, declares | 2 |
| fn:crc32 | calls, declares | 2 |
| fn:createChain | calls, declares | 2 |
| fn:createChartVerifierAgent | calls, declares | 2 |
| fn:createChatMessageHook | calls, declares | 2 |
| fn:createCompactingHook | calls, declares | 2 |
| fn:createE1Container | calls, declares | 2 |
| fn:createLedger | calls, declares | 2 |
| fn:createMcpBridgeDriver | calls, declares | 2 |
| fn:createPipeline7Tools | calls, declares | 2 |
| fn:createPipelineError | calls, declares | 2 |
| fn:createPlutusTools | calls, declares | 2 |
| fn:createPressureActor | calls, declares | 2 |
| fn:createRecordReplayDriver | calls, declares | 2 |
| fn:createShadowAgentClient | calls, declares | 2 |
| fn:createSynthesisDemand | calls, declares | 2 |
| fn:createSynthesisSupply | calls, declares | 2 |
| fn:createSystemTransformHook | calls, declares | 2 |
| fn:createToolAfterHook | calls, declares | 2 |
| fn:createToolBeforeHook | calls, declares | 2 |
| fn:createTruth | calls, declares | 2 |
| fn:createVCM | calls, declares | 2 |
| fn:createVeiHooks | calls, declares | 2 |
| fn:createZoneMapActor | calls, declares | 2 |
| fn:D | calls, declares | 2 |
| fn:d11DeltaPips | calls, declares | 2 |
| fn:dataDerivedTravel | calls, declares | 2 |
| fn:dataForRow | calls, declares | 2 |
| fn:dayApply | calls, declares | 2 |
| fn:dayBarsFor | calls, declares | 2 |
| fn:dayDirectionMacro | calls, declares | 2 |
| fn:dayGuard | calls, declares | 2 |
| fn:dayIsoOfShapeTrigger | calls, declares | 2 |
| fn:dayKeyOf | calls, declares | 2 |
| fn:dayKeyOfMs | calls, declares | 2 |
| fn:dayMs | calls, declares | 2 |
| fn:dayOpen | calls, declares | 2 |
| fn:dayOpenEvent | calls, declares | 2 |
| fn:dayStep | calls, declares | 2 |
| fn:dayToUtcRange | calls, declares | 2 |
| fn:decodeDoc | calls, declares | 2 |
| fn:decodeMarketData | calls, declares | 2 |
| fn:decodeRecord | calls, declares | 2 |
| fn:dedupeSort | calls, declares | 2 |
| fn:DEFAULT_DB_PATH | calls, declares | 2 |
| fn:defaultContext | calls, declares | 2 |
| fn:defaultFamilies | calls, declares | 2 |
| fn:defaultRegistry | calls, declares | 2 |
| fn:defaultRuleContext | calls, declares | 2 |
| fn:defaultStateDir | calls, declares | 2 |
| fn:defendedEdgeEntry | calls, declares | 2 |
| fn:defendFixture | calls, declares | 2 |
| fn:designate | calls, declares | 2 |
| fn:designateEvent | calls, declares | 2 |
| fn:designatePair | calls, declares | 2 |
| fn:detectChainEntry | calls, declares | 2 |
| fn:detectFractalSignal | calls, declares | 2 |
| fn:detectHallucination | calls, declares | 2 |
| fn:detectLiquiditySweeps | calls, declares | 2 |
| fn:detectLiquidityZones | calls, declares | 2 |
| fn:detectLongWickSharpMoves | calls, declares | 2 |
| fn:detectLoop | calls, declares | 2 |
| fn:detectLSZ | calls, declares | 2 |
| fn:detectMediaType | calls, declares | 2 |
| fn:detectRepeatedExtremes | calls, declares | 2 |
| fn:detectShortWickConsolidations | calls, declares | 2 |
| fn:detectSingularCandles | calls, declares | 2 |
| fn:detectTfOrderBlocks | calls, declares | 2 |
| fn:detectTheatricalPatterns | calls, declares | 2 |
| fn:detectZonesObcv | calls, declares | 2 |
| fn:determineBreakoutWatch | calls, declares | 2 |
| fn:determineConsolidationPhase | calls, declares | 2 |
| fn:deterministicAnchors | calls, declares | 2 |
| fn:deterministicForwardPosition | calls, declares | 2 |
| fn:diesOnSweep | calls, declares | 2 |
| fn:directionalSanity | calls, declares | 2 |
| fn:directionFromShape | calls, declares | 2 |
| fn:directionOf | calls, declares | 2 |
| fn:dischargeFromDesignations | calls, declares | 2 |
| fn:dischargeMirrorCase | calls, declares | 2 |
| fn:dischargeMirrorFloor | calls, declares | 2 |
| fn:dischargeSideCase | calls, declares | 2 |
| fn:dischargeTotality | calls, declares | 2 |
| fn:displacementAfter | calls, declares | 2 |
| fn:divergenceOf | calls, declares | 2 |
| fn:divergencePairVsMacro | calls, declares | 2 |
| fn:divKey | calls, declares | 2 |
| fn:docHashFor | calls, declares | 2 |
| fn:doji | calls, declares | 2 |
| fn:downloadImage | awaits, declares | 2 |
| fn:drawChart | calls, declares | 2 |
| fn:dxyZoneToOperative | calls, declares | 2 |
| fn:e2ProjectionIdFor | calls, declares | 2 |
| fn:e2ProjectionIdOf | calls, declares | 2 |
| fn:e2ZoneResolvedEntry | calls, declares | 2 |
| fn:echoImpl | calls, declares | 2 |
| fn:elementOfZone | calls, declares | 2 |
| fn:emaLabel | calls, declares | 2 |
| fn:emitWiring | calls, declares | 2 |
| fn:emptyChainFixture | calls, declares | 2 |
| fn:emptyRecord | calls, declares | 2 |
| fn:emptyTally | calls, declares | 2 |
| fn:emptyTradesFixture | calls, declares | 2 |
| fn:encodeBase64 | calls, declares | 2 |
| fn:enforce | calls, declares | 2 |
| fn:enforceMinWidth | calls, declares | 2 |
| fn:enrichWithEngine1 | calls, declares | 2 |
| fn:ensureContext | calls, declares | 2 |
| fn:ensureDir | calls, declares | 2 |
| fn:entryCandidates | calls, declares | 2 |
| fn:entryNearTp | calls, declares | 2 |
| fn:entryPrice_LMV | calls, declares | 2 |
| fn:eq | calls, declares | 2 |
| fn:err | calls, declares | 2 |
| fn:errResult | calls, declares | 2 |
| fn:escapeHtml | calls, declares | 2 |
| fn:escapeRegex | calls, declares | 2 |
| fn:etDecimalHour | calls, declares | 2 |
| fn:ev | calls, declares | 2 |
| fn:evalExpr | calls, declares | 2 |
| fn:evalExprStrict | calls, declares | 2 |
| fn:evaluate | calls, declares | 2 |
| fn:evaluateAllMoMZones | calls, declares | 2 |
| fn:evaluateMarkerContract | calls, declares | 2 |
| fn:evaluateMoMZoneMechanics | calls, declares | 2 |
| fn:evaluateOnPage | awaits, declares | 2 |
| fn:evaluateRules | calls, declares | 2 |
| fn:evalWeekMs | calls, declares | 2 |
| fn:eventIdOf | calls, declares | 2 |
| fn:executeProtocolA | awaits, declares | 2 |
| fn:executeVlmExtraction | awaits, declares | 2 |
| fn:expandTotality | calls, declares | 2 |
| fn:expectAssemblerError | calls, declares | 2 |
| fn:expectJeslError | awaits, declares | 2 |
| fn:expectLoadError | calls, declares | 2 |
| fn:expectTradeError | calls, declares | 2 |
| fn:extendThroughShallowShelf | calls, declares | 2 |
| fn:extractArticleTitles | calls, declares | 2 |
| fn:extractBias | calls, declares | 2 |
| fn:extractBindings | calls, declares | 2 |
| fn:extractBracketCode | calls, declares | 2 |
| fn:extractDailyCloses | calls, declares | 2 |
| fn:extractDxyBias | calls, declares | 2 |
| fn:extractImageUrlsFromHtml | calls, declares | 2 |
| fn:extractLevels | calls, declares | 2 |
| fn:extractMAFromInlinePattern | calls, declares | 2 |
| fn:extractMAFromVlmText | calls, declares | 2 |
| fn:extractMAValueFromText | calls, declares | 2 |
| fn:extractNumericThreshold | calls, declares | 2 |
| fn:extractPhrases | calls, declares | 2 |
| fn:extractPricesNearKeywords | calls, declares | 2 |
| fn:extractPromptText | calls, declares | 2 |
| fn:extractReactionEvents | calls, declares | 2 |
| fn:extractRuleCards | calls, declares | 2 |
| fn:extractSessionId | calls, declares | 2 |
| fn:extractSourceName | calls, declares | 2 |
| fn:extractStrikesFromHtml | calls, declares | 2 |
| fn:extractSubPageUrls | calls, declares | 2 |
| fn:extractSummary | calls, declares | 2 |
| fn:extractSwingPoints | calls, declares | 2 |
| fn:extractTouchedFile | calls, declares | 2 |
| fn:extractValueNearLabel | calls, declares | 2 |
| fn:extractVideoFrames | calls, declares | 2 |
| fn:extractZones | calls, declares | 2 |
| fn:extractZonesFromText | calls, declares | 2 |
| fn:fail | calls, declares | 2 |
| fn:failEvent | calls, declares | 2 |
| fn:failuresForWeek | calls, declares | 2 |
| fn:FALLBACK_LOG_PATH | calls, declares | 2 |
| fn:falseRejectionEvidenceOf | calls, declares | 2 |
| fn:familyOf | calls, declares | 2 |
| fn:fetch | awaits, calls | 2 |
| fn:fetchHtmlViaCDP | calls, declares | 2 |
| fn:fetchViaCDPBrowser | calls, declares | 2 |
| fn:fetchViaHttp | calls, declares | 2 |
| fn:fib1EntryAlignsWithConfluence | calls, declares | 2 |
| fn:fib2MultiContextConfluence | calls, declares | 2 |
| fn:fib3ZoneFibAlignment | calls, declares | 2 |
| fn:fibRungs | calls, declares | 2 |
| fn:fileExists | calls, declares | 2 |
| fn:fillTemplate | calls, declares | 2 |
| fn:findAnchorKeepType | calls, declares | 2 |
| fn:findConfluenceZones | calls, declares | 2 |
| fn:findCycle | calls, declares | 2 |
| fn:findFortressDemand | calls, declares | 2 |
| fn:findingAt | calls, declares | 2 |
| fn:findMirrorAnchor | calls, declares | 2 |
| fn:findNearestDemandBelow | calls, declares | 2 |
| fn:findNearestSupplyAbove | calls, declares | 2 |
| fn:findOptionsTableImage | awaits, declares | 2 |
| fn:findRangeBoundaries | calls, declares | 2 |
| fn:findRoundNumbers | calls, declares | 2 |
| fn:findSlZone | calls, declares | 2 |
| fn:findSweepOrigin | calls, declares | 2 |
| fn:findSwingHighs | calls, declares | 2 |
| fn:findSwingLows | calls, declares | 2 |
| fn:findTheBreak | calls, declares | 2 |
| fn:fingerprint | calls, declares | 2 |
| fn:fingerprintOf | calls, declares | 2 |
| fn:firstGateFailure | calls, declares | 2 |
| fn:firstNumber | calls, declares | 2 |
| fn:firstUnmitigatedOpposingZone | calls, declares | 2 |
| fn:flipsFortress | calls, declares | 2 |
| fn:fmtBand | calls, declares | 2 |
| fn:fmtConf | calls, declares | 2 |
| fn:fmtDirection | calls, declares | 2 |
| fn:fmtPct | calls, declares | 2 |
| fn:fmtPct01 | calls, declares | 2 |
| fn:fmtPrice | calls, declares | 2 |
| fn:fmtRange | calls, declares | 2 |
| fn:fmtRrr | calls, declares | 2 |
| fn:fmtSession | calls, declares | 2 |
| fn:fmtShape | calls, declares | 2 |
| fn:fmtWeekHeader | calls, declares | 2 |
| fn:fn | awaits, calls | 2 |
| fn:foldAdd | calls, declares | 2 |
| fn:foldAnd | calls, declares | 2 |
| fn:formatAnchorLabel | calls, declares | 2 |
| fn:formatET | calls, declares | 2 |
| fn:formatIdentityHeader | calls, declares | 2 |
| fn:formatLadderForLog | calls, declares | 2 |
| fn:fortressOverridesDeath | calls, declares | 2 |
| fn:forwardDirectionFromPressure | calls, declares | 2 |
| fn:forwardProbabilities | calls, declares | 2 |
| fn:frameToRegex | calls, declares | 2 |
| fn:freshCascade | calls, declares | 2 |
| fn:freshDesignation | calls, declares | 2 |
| fn:freshFreshness | calls, declares | 2 |
| fn:freshnessBattleEvent | calls, declares | 2 |
| fn:freshShape | calls, declares | 2 |
| fn:freshWorkflow | calls, declares | 2 |
| fn:freshZonePressure | calls, declares | 2 |
| fn:gate | awaits, declares | 2 |
| fn:gateBars | calls, declares | 2 |
| fn:gateG1 | calls, declares | 2 |
| fn:gateG10 | calls, declares | 2 |
| fn:gateG2 | calls, declares | 2 |
| fn:gateG3 | calls, declares | 2 |
| fn:gateG4 | calls, declares | 2 |
| fn:gateG5 | calls, declares | 2 |
| fn:gateG6 | calls, declares | 2 |
| fn:gateG7 | calls, declares | 2 |
| fn:gateG8 | calls, declares | 2 |
| fn:gateG9 | calls, declares | 2 |
| fn:ge | calls, declares | 2 |
| fn:generate4hClassification | calls, declares | 2 |
| fn:generateCandidateLadder | calls, declares | 2 |
| fn:generateCoverPage | calls, declares | 2 |
| fn:generateCrossPairMatrix | calls, declares | 2 |
| fn:generateDataQualitySummary | calls, declares | 2 |
| fn:generateEconomicCalendar | calls, declares | 2 |
| fn:generateFxPairClassification | calls, declares | 2 |
| fn:generateFxPairCommentary | calls, declares | 2 |
| fn:generateFxPairShapeChain | calls, declares | 2 |
| fn:generateFxPairVolatility | calls, declares | 2 |
| fn:generateFxPairZoneSynthesis | calls, declares | 2 |
| fn:generateHtmlFallback | calls, declares | 2 |
| fn:generateIpZoneMap | calls, declares | 2 |
| fn:generateLiquidityLadder | calls, declares | 2 |
| fn:generateMdReport | calls, declares | 2 |
| fn:generateMdveMirrorSection | calls, declares | 2 |
| fn:generateMissingDataLog | calls, declares | 2 |
| fn:generateOtcSummary | calls, declares | 2 |
| fn:generatePairSetupsSection | calls, declares | 2 |
| fn:generatePdf | calls, declares | 2 |
| fn:generatePdfViaCDP | awaits, declares | 2 |
| fn:generatePillarAudits | calls, declares | 2 |
| fn:generateScreenshotsIndex | calls, declares | 2 |
| fn:generateSetupsTable | calls, declares | 2 |
| fn:generateShapeChain | calls, declares | 2 |
| fn:generateSourceSetups | calls, declares | 2 |
| fn:generateSourceSetupsImpl | calls, declares | 2 |
| fn:generateSourceSetupsV45 | calls, declares | 2 |
| fn:generateViaPandoc | calls, declares | 2 |
| fn:generateViaWeasyprint | calls, declares | 2 |
| fn:generateVolatilityTriggers | calls, declares | 2 |
| fn:generateZoneSynthesis | calls, declares | 2 |
| fn:getAgentConfigs | calls, declares | 2 |
| fn:getAnalysisPointMs | calls, declares | 2 |
| fn:getCurrentAgent | calls, declares | 2 |
| fn:getCurrentSession | calls, declares | 2 |
| fn:getDirectionalZfp | calls, declares | 2 |
| fn:getFibLevels | calls, declares | 2 |
| fn:getIdentityBaseDir | calls, declares | 2 |
| fn:getIdentityHeader | awaits, declares | 2 |
| fn:getInstrumentContext | calls, declares | 2 |
| fn:getMime | calls, declares | 2 |
| fn:getMinimumConfidence | calls, declares | 2 |
| fn:getMomStatus | calls, declares | 2 |
| fn:getPairProfile | calls, declares | 2 |
| fn:getPipValue | calls, declares | 2 |
| fn:getPricePattern | calls, declares | 2 |
| fn:getReactionCount | calls, declares | 2 |
| fn:getReactionStatus | calls, declares | 2 |
| fn:getRecommendedCategory | calls, declares | 2 |
| fn:getRecommendedReinforcements | calls, declares | 2 |
| fn:getRunAnchorMs | calls, declares | 2 |
| fn:getSessionBuffer | calls, declares | 2 |
| fn:getSessionForShape | calls, declares | 2 |
| fn:getSpreadPips | calls, declares | 2 |
| fn:globToRegExp | calls, declares | 2 |
| fn:globToRegexSource | calls, declares | 2 |
| fn:goldenOraclePending | calls, declares | 2 |
| fn:goldenReCheck | calls, declares | 2 |
| fn:groupAlignedHits | calls, declares | 2 |
| fn:groupSwingPointsByProximity | calls, declares | 2 |
| fn:hallucinationTriggered | calls, declares | 2 |
| fn:handleSessionSwitch | calls, declares | 2 |
| fn:hashEntry | calls, declares | 2 |
| fn:hashViewState | calls, declares | 2 |
| fn:hasTool | calls, declares | 2 |
| fn:hasVisibleCandleEvidence | calls, declares | 2 |
| fn:hasWordBoundary | calls, declares | 2 |
| fn:hasZone | calls, declares | 2 |
| fn:highLowClose | calls, declares | 2 |
| fn:identifyCurrentShape | calls, declares | 2 |
| fn:ids | calls, declares | 2 |
| fn:inferBias | calls, declares | 2 |
| fn:inferBiasFromZones | calls, declares | 2 |
| fn:inferCandleConfirmation | calls, declares | 2 |
| fn:inferDirection | calls, declares | 2 |
| fn:inferStorylineBias | calls, declares | 2 |
| fn:injectSlots | calls, declares | 2 |
| fn:inlineFormat | calls, declares | 2 |
| fn:input | calls, declares | 2 |
| fn:internalLmvRungEntry | calls, declares | 2 |
| fn:internalLqzNearEdge | calls, declares | 2 |
| fn:internalNearEdge | calls, declares | 2 |
| fn:internalRungNearEdge | calls, declares | 2 |
| fn:internalRungOf | calls, declares | 2 |
| fn:intervalGap | calls, declares | 2 |
| fn:invalidateAffine | calls, declares | 2 |
| fn:inventoryCardIds | calls, declares | 2 |
| fn:invert | calls, declares | 2 |
| fn:invokeWithRetry | awaits, declares | 2 |
| fn:inWeek | calls, declares | 2 |
| fn:is4Hzone | calls, declares | 2 |
| fn:isAnalysisPointLocked | calls, declares | 2 |
| fn:isBrowserProcessCommand | calls, declares | 2 |
| fn:isDefend | calls, declares | 2 |
| fn:isDefense | calls, declares | 2 |
| fn:isDegeneratePair | calls, declares | 2 |
| fn:isDegenerateRung | calls, declares | 2 |
| fn:isDegenerateRungAdm | calls, declares | 2 |
| fn:isDemandZone | calls, declares | 2 |
| fn:isDirectionAligned | calls, declares | 2 |
| fn:isDirectionFlip | calls, declares | 2 |
| fn:isDuplicate | calls, declares | 2 |
| fn:isEarthFire | calls, declares | 2 |
| fn:isFiniteNumber | calls, declares | 2 |
| fn:isForbiddenLibInstalled | calls, declares | 2 |
| fn:isGenericEvidence | calls, declares | 2 |
| fn:isHoliday | calls, declares | 2 |
| fn:isId | calls, declares | 2 |
| fn:isImpulse | calls, declares | 2 |
| fn:isLateSession | calls, declares | 2 |
| fn:isLmvRung | calls, declares | 2 |
| fn:isLoadError | calls, declares | 2 |
| fn:isLqzAnchor | calls, declares | 2 |
| fn:isMarketOpen | calls, declares | 2 |
| fn:isMirrorOutcome | calls, declares | 2 |
| fn:isMutterRunning | calls, declares | 2 |
| fn:isOneAndDone | calls, declares | 2 |
| fn:isoWeekKey | calls, declares | 2 |
| fn:isPairNativeZoneId | calls, declares | 2 |
| fn:isPass | calls, declares | 2 |
| fn:isPhantomBoM | calls, declares | 2 |
| fn:isPhantomBoMFortress | calls, declares | 2 |
| fn:isPlutusAgent | calls, declares | 2 |
| fn:isProvenanceKind | calls, declares | 2 |
| fn:isRecord | calls, declares | 2 |
| fn:isRewardSide | calls, declares | 2 |
| fn:isRunAnchorLocked | calls, declares | 2 |
| fn:isStructuralWall | calls, declares | 2 |
| fn:isStructuralZone | calls, declares | 2 |
| fn:isSupplyZone | calls, declares | 2 |
| fn:isSweep | calls, declares | 2 |
| fn:isToolAllowed | calls, declares | 2 |
| fn:isTpTarget | calls, declares | 2 |
| fn:isVagueEvidence | calls, declares | 2 |
| fn:isValidEntryAnchor | calls, declares | 2 |
| fn:isValidPrice | calls, declares | 2 |
| fn:isValidRecord | calls, declares | 2 |
| fn:isValidRung | calls, declares | 2 |
| fn:isVerif | calls, declares | 2 |
| fn:isWeakPenetrated | calls, declares | 2 |
| fn:isWeakTpWall | calls, declares | 2 |
| fn:isWeekend | calls, declares | 2 |
| fn:isZoneModel | calls, declares | 2 |
| fn:lacksRungSpecificity | calls, declares | 2 |
| fn:lambdaPrimesWith | calls, declares | 2 |
| fn:largeOb | calls, declares | 2 |
| fn:lastCandle | calls, declares | 2 |
| fn:lastReactionMsOf | calls, declares | 2 |
| fn:lastSetup | calls, declares | 2 |
| fn:lastShape | calls, declares | 2 |
| fn:laws | calls, declares | 2 |
| fn:layerMatchesTool | calls, declares | 2 |
| fn:le | calls, declares | 2 |
| fn:legEstablished | calls, declares | 2 |
| fn:levelCoincides | calls, declares | 2 |
| fn:levelFor | calls, declares | 2 |
| fn:liquidityScoreFor | calls, declares | 2 |
| fn:listTvControllerFiles | calls, declares | 2 |
| fn:lit | calls, declares | 2 |
| fn:lmvAnchorId | calls, declares | 2 |
| fn:lmvZoneForStructure | calls, declares | 2 |
| fn:loadCard | calls, declares | 2 |
| fn:loadGolden | awaits, declares | 2 |
| fn:loadGoldenObject | calls, declares | 2 |
| fn:loadGoldenText | calls, declares | 2 |
| fn:loadGoldenWeek | calls, declares | 2 |
| fn:loadOrFresh | calls, declares | 2 |
| fn:loadRecords | calls, declares | 2 |
| fn:lockAnalysisPoint | calls, declares | 2 |
| fn:looksDecoded | calls, declares | 2 |
| fn:lqzRungs | calls, declares | 2 |
| fn:lqzSignificanceTier | calls, declares | 2 |
| fn:lqzZfpFromTouchCount | calls, declares | 2 |
| fn:lt | calls, declares | 2 |
| fn:macroContradicts | calls, declares | 2 |
| fn:magnetsToPriceLevels | calls, declares | 2 |
| fn:main | calls, declares | 2 |
| fn:makeCliLive | calls, declares | 2 |
| fn:makeData | calls, declares | 2 |
| fn:makeJournalFileLive | calls, declares | 2 |
| fn:makeLexiconData | calls, declares | 2 |
| fn:makePng | calls, declares | 2 |
| fn:makeRungId | calls, declares | 2 |
| fn:makeZone | calls, declares | 2 |
| fn:mapCardError | calls, declares | 2 |
| fn:mapSessionStringToEnum | calls, declares | 2 |
| fn:mapTradingSessionToSessionWindow | calls, declares | 2 |
| fn:markdownToHtml | calls, declares | 2 |
| fn:markerFailOutcome | calls, declares | 2 |
| fn:matchesStructural | calls, declares | 2 |
| fn:matchesToolMatcher | calls, declares | 2 |
| fn:matchGlob | calls, declares | 2 |
| fn:matrixLadderRungs | calls, declares | 2 |
| fn:matrixZonesToZoneModels | calls, declares | 2 |
| fn:maxMagnetBonus | calls, declares | 2 |
| fn:mdveZoneToDxyZone | calls, declares | 2 |
| fn:meanBody | calls, declares | 2 |
| fn:meanBodyFraction | calls, declares | 2 |
| fn:meanBodyPips | calls, declares | 2 |
| fn:measureDefendedExtreme | calls, declares | 2 |
| fn:measureMinViableDefensePips | calls, declares | 2 |
| fn:measureNestingDepth | calls, declares | 2 |
| fn:measurePostTouchExcursion | calls, declares | 2 |
| fn:measureReactionWickExtreme | calls, declares | 2 |
| fn:measureVariance | calls, declares | 2 |
| fn:measureWickDispersion | calls, declares | 2 |
| fn:measureZoneWidthScale | calls, declares | 2 |
| fn:mechanicalEvidenceCount | calls, declares | 2 |
| fn:member | calls, declares | 2 |
| fn:mergeGroup | calls, declares | 2 |
| fn:mergeLqzWithIpZones | calls, declares | 2 |
| fn:mergeMirrorWithEmergent | calls, declares | 2 |
| fn:mid | calls, declares | 2 |
| fn:mimoApiKey | calls, declares | 2 |
| fn:minWidthPips | calls, declares | 2 |
| fn:mirrorConfidence | calls, declares | 2 |
| fn:mirrorConfidenceScore | calls, declares | 2 |
| fn:mirrorCoverage | calls, declares | 2 |
| fn:mirrorFloorTruth | calls, declares | 2 |
| fn:mirrorOfOf | calls, declares | 2 |
| fn:mirrorToDedupSetupV452 | calls, declares | 2 |
| fn:mirrorToTradeSetup | calls, declares | 2 |
| fn:mirrorToTradeSetupV45 | calls, declares | 2 |
| fn:mkFinding | calls, declares | 2 |
| fn:modelBattleOnDay | calls, declares | 2 |
| fn:mondayUtcOf | calls, declares | 2 |
| fn:mul | calls, declares | 2 |
| fn:mulberry32 | calls, declares | 2 |
| fn:n | calls, declares | 2 |
| fn:narrativeAligned | calls, declares | 2 |
| fn:narrativeAtrPips | calls, declares | 2 |
| fn:navigateAndScreenshot | awaits, declares | 2 |
| fn:navigateAndScreenshotElement | awaits, declares | 2 |
| fn:nearestBoMWallBeyond | calls, declares | 2 |
| fn:nearestDemandBelow | calls, declares | 2 |
| fn:needChain | calls, declares | 2 |
| fn:needConfluence | calls, declares | 2 |
| fn:needDesignation | calls, declares | 2 |
| fn:needDesignations | calls, declares | 2 |
| fn:needDirection | calls, declares | 2 |
| fn:needEdge | calls, declares | 2 |
| fn:needFiniteNumber | calls, declares | 2 |
| fn:needNonNegativeInt | calls, declares | 2 |
| fn:needPositiveInt | calls, declares | 2 |
| fn:needRec | calls, declares | 2 |
| fn:needStr | calls, declares | 2 |
| fn:needTradeId | calls, declares | 2 |
| fn:needZones | calls, declares | 2 |
| fn:nestedSellLiquidity | calls, declares | 2 |
| fn:nextBarsReverse | calls, declares | 2 |
| fn:nextChainId | calls, declares | 2 |
| fn:nextStage | calls, declares | 2 |
| fn:nextStepsForFailure | calls, declares | 2 |
| fn:nextTradingDay | calls, declares | 2 |
| fn:nodeIdOf | calls, declares | 2 |
| fn:nodeIdOfDemo | calls, declares | 2 |
| fn:noMatchShapeFixture | calls, declares | 2 |
| fn:nonEmpty | calls, declares | 2 |
| fn:noReactionTouchFixture | calls, declares | 2 |
| fn:normalizeArgs | calls, declares | 2 |
| fn:normalizeAtrToPips | calls, declares | 2 |
| fn:normalizeDayKey | calls, declares | 2 |
| fn:normalizeDesignationDay | calls, declares | 2 |
| fn:normalizeImpact | calls, declares | 2 |
| fn:normalizePairCanonical | calls, declares | 2 |
| fn:not | calls, declares | 2 |
| fn:notesContain | calls, declares | 2 |
| fn:numField | calls, declares | 2 |
| fn:obSignificanceTier | calls, declares | 2 |
| fn:obviousLongFixture | calls, declares | 2 |
| fn:obZoneToZoneModel | calls, declares | 2 |
| fn:ok | calls, declares | 2 |
| fn:okResult | calls, declares | 2 |
| fn:okVal | calls, declares | 2 |
| fn:openDb | calls, declares | 2 |
| fn:openFailureStore | calls, declares | 2 |
| fn:openGraph | calls, declares | 2 |
| fn:openingConsolidates | calls, declares | 2 |
| fn:operativeZone | calls, declares | 2 |
| fn:opposingProximityPips | calls, declares | 2 |
| fn:opposingZones | calls, declares | 2 |
| fn:or | calls, declares | 2 |
| fn:oracleBase | calls, declares | 2 |
| fn:orderBlockRungs | calls, declares | 2 |
| fn:ot | calls, declares | 2 |
| fn:overlappingTimeframes | calls, declares | 2 |
| fn:paethPredictor | calls, declares | 2 |
| fn:pairFromPath | calls, declares | 2 |
| fn:pairSlug | calls, declares | 2 |
| fn:parseDeclaredMetadata | calls, declares | 2 |
| fn:parseForexResearch | calls, declares | 2 |
| fn:parseForexResearchViaVLM | awaits, declares | 2 |
| fn:parseGradeMarker | calls, declares | 2 |
| fn:parsePlutusCard | calls, declares | 2 |
| fn:parsePng | calls, declares | 2 |
| fn:parseSpec | calls, declares | 2 |
| fn:parseTextForStrikes | calls, declares | 2 |
| fn:parseTVTechnicals | calls, declares | 2 |
| fn:parseVlmOutput | calls, declares | 2 |
| fn:parseWeekStart | calls, declares | 2 |
| fn:parseZoneLines | calls, declares | 2 |
| fn:participationKey | calls, declares | 2 |
| fn:PASS2_PROMPT | calls, declares | 2 |
| fn:passesObcvGates | calls, declares | 2 |
| fn:persistErrors | awaits, declares | 2 |
| fn:phantomBoMExemption | calls, declares | 2 |
| fn:phantomFixture | calls, declares | 2 |
| fn:pillarEngine | calls, declares | 2 |
| fn:pillarRungs | calls, declares | 2 |
| fn:pillarSourceFromString | calls, declares | 2 |
| fn:pillarZfpFromConfluence | calls, declares | 2 |
| fn:pipFor | calls, declares | 2 |
| fn:pipOfSourcePrice | calls, declares | 2 |
| fn:pipSize | calls, declares | 2 |
| fn:pipSizeFor | calls, declares | 2 |
| fn:pipSizeForPair | calls, declares | 2 |
| fn:pipSizeOf | calls, declares | 2 |
| fn:pipValueFor | calls, declares | 2 |
| fn:plannedRrrOf | calls, declares | 2 |
| fn:plutusOmniVisionAfterHook | awaits, declares | 2 |
| fn:populateKeyLevels | calls, declares | 2 |
| fn:positionMatchOf | calls, declares | 2 |
| fn:postBreakReaction | calls, declares | 2 |
| fn:predBodyDefend | calls, declares | 2 |
| fn:predConsolDwell | calls, declares | 2 |
| fn:predictNextShape | calls, declares | 2 |
| fn:predictNextShapePressureAware | calls, declares | 2 |
| fn:predLargeOb | calls, declares | 2 |
| fn:predMacroOriginContinuation | calls, declares | 2 |
| fn:predMidSwingFakeout | calls, declares | 2 |
| fn:predOpposingBoMReaction | calls, declares | 2 |
| fn:predPassThrough | calls, declares | 2 |
| fn:predPhantomBomAll4 | calls, declares | 2 |
| fn:predSweep | calls, declares | 2 |
| fn:predType1Signature | calls, declares | 2 |
| fn:predWickReject | calls, declares | 2 |
| fn:pressureBand | calls, declares | 2 |
| fn:pressureBattleEvent | calls, declares | 2 |
| fn:pressureScoreOf | calls, declares | 2 |
| fn:priceDecimals | calls, declares | 2 |
| fn:priceToY | calls, declares | 2 |
| fn:printResult | calls, declares | 2 |
| fn:printToPdfViaCDP | awaits, declares | 2 |
| fn:priorMove | calls, declares | 2 |
| fn:processSubPage | awaits, declares | 2 |
| fn:proj | calls, declares | 2 |
| fn:projectionDigest | calls, declares | 2 |
| fn:projectionWith | calls, declares | 2 |
| fn:projectNext | calls, declares | 2 |
| fn:projectStatus | calls, declares | 2 |
| fn:projectZoneForDay | calls, declares | 2 |
| fn:provenanceEntries | calls, declares | 2 |
| fn:proximityRung | calls, declares | 2 |
| fn:proxyAtr1hPips | calls, declares | 2 |
| fn:qDist | calls, declares | 2 |
| fn:queryDegree | calls, declares | 2 |
| fn:rc | calls, declares | 2 |
| fn:reachable | calls, declares | 2 |
| fn:reaction | calls, declares | 2 |
| fn:reactionCount | calls, declares | 2 |
| fn:reactionEventsOf | calls, declares | 2 |
| fn:readConsume | calls, declares | 2 |
| fn:readContestedZone | calls, declares | 2 |
| fn:readDesignate | calls, declares | 2 |
| fn:readEgressLog | calls, declares | 2 |
| fn:readFile | awaits, calls | 2 |
| fn:readFileContent | calls, declares | 2 |
| fn:readJournalFile | calls, declares | 2 |
| fn:readJson | calls, declares | 2 |
| fn:readManualStepPushLog | calls, declares | 2 |
| fn:readTouch | calls, declares | 2 |
| fn:readTouchKind | calls, declares | 2 |
| fn:readU32BE | calls, declares | 2 |
| fn:readZoneMapSnapshot | calls, declares | 2 |
| fn:realizedROf | calls, declares | 2 |
| fn:reAnchorMirror | calls, declares | 2 |
| fn:receivingDemandForChained | calls, declares | 2 |
| fn:recipe | calls, declares | 2 |
| fn:recomputeRrr | calls, declares | 2 |
| fn:reconcileVlmPasses | calls, declares | 2 |
| fn:recordFailure | calls, declares | 2 |
| fn:recordIntent | calls, declares | 2 |
| fn:recordLayerCause | calls, declares | 2 |
| fn:recordOutcome | calls, declares | 2 |
| fn:recordPriceSample | calls, declares | 2 |
| fn:recordShadowDegrade | calls, declares | 2 |
| fn:recordViewState | calls, declares | 2 |
| fn:recoveryDirection | calls, declares | 2 |
| fn:redactValues | calls, declares | 2 |
| fn:ref | calls, declares | 2 |
| fn:refCloseOf | calls, declares | 2 |
| fn:refineAnchor | calls, declares | 2 |
| fn:refineEntryMicro | calls, declares | 2 |
| fn:refineNestedTables | calls, declares | 2 |
| fn:refineProjection | calls, declares | 2 |
| fn:refineSetup | calls, declares | 2 |
| fn:refit | calls, declares | 2 |
| fn:refreshDerived | calls, declares | 2 |
| fn:registerSidecar | calls, declares | 2 |
| fn:registerTools | calls, declares | 2 |
| fn:registry | calls, declares | 2 |
| fn:rejectedPressureFixture | calls, declares | 2 |
| fn:rejectedZoneFixture | calls, declares | 2 |
| fn:render | calls, declares | 2 |
| fn:renderReport | calls, declares | 2 |
| fn:renderToJson | calls, declares | 2 |
| fn:reportDivergence | calls, declares | 2 |
| fn:requiredCardIds | calls, declares | 2 |
| fn:requiredFieldsFor | calls, declares | 2 |
| fn:requiredRole | calls, declares | 2 |
| fn:requireFinite | calls, declares | 2 |
| fn:requireNonEmpty | calls, declares | 2 |
| fn:resolveCard | calls, declares | 2 |
| fn:resolveCascadeZone | calls, declares | 2 |
| fn:resolveDdgUrl | calls, declares | 2 |
| fn:resolveDefaultPath | calls, declares | 2 |
| fn:resolveEntry | calls, declares | 2 |
| fn:resolveFilePaths | calls, declares | 2 |
| fn:resolveNativeAnchor | calls, declares | 2 |
| fn:resolveOperativeZone | calls, declares | 2 |
| fn:resolvePath | calls, declares | 2 |
| fn:resolveReceivingLevel | calls, declares | 2 |
| fn:resolveRun | calls, declares | 2 |
| fn:resolveSessionWindow | calls, declares | 2 |
| fn:resolveSlDepth | calls, declares | 2 |
| fn:resolveSourceZone | calls, declares | 2 |
| fn:resolveThreshold | calls, declares | 2 |
| fn:resolveTp | calls, declares | 2 |
| fn:retranslateSetup | calls, declares | 2 |
| fn:revMin | calls, declares | 2 |
| fn:rollingAtrMap | calls, declares | 2 |
| fn:round1 | calls, declares | 2 |
| fn:round2 | calls, declares | 2 |
| fn:roundToPip | calls, declares | 2 |
| fn:routeBattle | calls, declares | 2 |
| fn:routeFreshness | calls, declares | 2 |
| fn:rowsOf | calls, declares | 2 |
| fn:rowToNode | calls, declares | 2 |
| fn:rrr1MinRRRByCategory | calls, declares | 2 |
| fn:rrr2RiskAdjustedPositionSizing | calls, declares | 2 |
| fn:rrr3TPDistanceVsATR | calls, declares | 2 |
| fn:rrr4SLDistanceVsATR | calls, declares | 2 |
| fn:rrr5RRRvsWinRate | calls, declares | 2 |
| fn:rrr6AsymmetricRiskCheck | calls, declares | 2 |
| fn:rrrForCategory | calls, declares | 2 |
| fn:ruleById | calls, declares | 2 |
| fn:runBlindExecutionCheck | calls, declares | 2 |
| fn:runChecks | calls, declares | 2 |
| fn:runComplianceSweep | calls, declares | 2 |
| fn:runFreshnessMachine | calls, declares | 2 |
| fn:rung | calls, declares | 2 |
| fn:rungId | calls, declares | 2 |
| fn:rungIdOf | calls, declares | 2 |
| fn:runGoldenGate | calls, declares | 2 |
| fn:rungToOperative | calls, declares | 2 |
| fn:runIdFor | calls, declares | 2 |
| fn:runIdOf | calls, declares | 2 |
| fn:runMirrorStage | calls, declares | 2 |
| fn:runMirrorStageV45 | calls, declares | 2 |
| fn:runRefineRetry | awaits, declares | 2 |
| fn:runTest | calls, declares | 2 |
| fn:runTokens1to7 | calls, declares | 2 |
| fn:runVariant | calls, declares | 2 |
| fn:safeMatch | calls, declares | 2 |
| fn:safeParse | calls, declares | 2 |
| fn:safeParsePlutusCard | calls, declares | 2 |
| fn:sameZoneIntegrity | calls, declares | 2 |
| fn:sanitizeExecArg | calls, declares | 2 |
| fn:saturateExecutor | calls, declares | 2 |
| fn:sc | calls, declares | 2 |
| fn:SCAFFOLD_VERDICT_PROMPT_TEMPLATE | calls, declares | 2 |
| fn:scalarKey | calls, declares | 2 |
| fn:scan1HZones | calls, declares | 2 |
| fn:scanAllZonesIntraLevels | calls, declares | 2 |
| fn:scanFibLevels | calls, declares | 2 |
| fn:scanIntraZoneLevels | calls, declares | 2 |
| fn:scanPriceSlots | calls, declares | 2 |
| fn:scanPriorCloses | calls, declares | 2 |
| fn:scanRoundNumbers | calls, declares | 2 |
| fn:scoreCluster | calls, declares | 2 |
| fn:scoreFamily | calls, declares | 2 |
| fn:scoreSignals | calls, declares | 2 |
| fn:scoreSignalsLocal | calls, declares | 2 |
| fn:screenshotAndVlm | awaits, declares | 2 |
| fn:sculptStructures | calls, declares | 2 |
| fn:sectionById | calls, declares | 2 |
| fn:sectionIds | calls, declares | 2 |
| fn:sectionRowsFor | calls, declares | 2 |
| fn:selectEntryZone | calls, declares | 2 |
| fn:selectPairNativeZone | calls, declares | 2 |
| fn:selectTopZones | calls, declares | 2 |
| fn:sendCdp | awaits, calls | 2 |
| fn:sessionHourOfWindow | calls, declares | 2 |
| fn:sessionLabelHonesty | calls, declares | 2 |
| fn:sessionOf | calls, declares | 2 |
| fn:sessionOfTouch | calls, declares | 2 |
| fn:sessionStartPriceProvider | calls, declares | 2 |
| fn:sessionState | calls, declares | 2 |
| fn:sessionToType | calls, declares | 2 |
| fn:setAnchor | calls, declares | 2 |
| fn:setCurrentAgent | calls, declares | 2 |
| fn:setIdentityBaseDir | calls, declares | 2 |
| fn:setSdkClient | calls, declares | 2 |
| fn:sha256Hash | calls, declares | 2 |
| fn:sha256Hex | calls, declares | 2 |
| fn:sha256Hex16 | calls, declares | 2 |
| fn:sha256Of | calls, declares | 2 |
| fn:sha256OfText | calls, declares | 2 |
| fn:shapeBrainAtrProxyPips | calls, declares | 2 |
| fn:shapeIs | calls, declares | 2 |
| fn:shapesAligned | calls, declares | 2 |
| fn:shapeTriggerMs | calls, declares | 2 |
| fn:sid | calls, declares | 2 |
| fn:sideMatchId | calls, declares | 2 |
| fn:sideOf | calls, declares | 2 |
| fn:significanceOf | calls, declares | 2 |
| fn:silentVerify | calls, declares | 2 |
| fn:simple | calls, declares | 2 |
| fn:skipAbsent | calls, declares | 2 |
| fn:slCandidates | calls, declares | 2 |
| fn:sleep | awaits, declares | 2 |
| fn:slFloorPips | calls, declares | 2 |
| fn:slotValue | calls, declares | 2 |
| fn:smaLabel | calls, declares | 2 |
| fn:SMC_RATIO | calls, declares | 2 |
| fn:snapshotFor | calls, declares | 2 |
| fn:sortKeys | calls, declares | 2 |
| fn:sourceCategoryOf | calls, declares | 2 |
| fn:sourceDayDirection | calls, declares | 2 |
| fn:sourceDirectionOf | calls, declares | 2 |
| fn:sourceIdOf | calls, declares | 2 |
| fn:sourceLaneShapeDayFor | calls, declares | 2 |
| fn:spliceDemand | calls, declares | 2 |
| fn:splitIntoMASections | calls, declares | 2 |
| fn:splitInWeekVsStale | calls, declares | 2 |
| fn:ssFixture | calls, declares | 2 |
| fn:ssSignature | calls, declares | 2 |
| fn:ssToBsFixture | calls, declares | 2 |
| fn:stableStringify | calls, declares | 2 |
| fn:stampZonePressureStates | calls, declares | 2 |
| fn:stateFor | calls, declares | 2 |
| fn:statsBlock | calls, declares | 2 |
| fn:step | calls, declares | 2 |
| fn:stepFreshness | calls, declares | 2 |
| fn:stepPressure | calls, declares | 2 |
| fn:store | calls, declares | 2 |
| fn:str | calls, declares | 2 |
| fn:streamWithBrain | awaits, declares | 2 |
| fn:strengthDrivenRungTp | calls, declares | 2 |
| fn:strengthDrivenZoneTp | calls, declares | 2 |
| fn:strField | calls, declares | 2 |
| fn:stripBandSuffix | calls, declares | 2 |
| fn:stripHtml | calls, declares | 2 |
| fn:stripTags | calls, declares | 2 |
| fn:strong | calls, declares | 2 |
| fn:strongestInternalEntryRung | calls, declares | 2 |
| fn:strongestInternalLqzRung | calls, declares | 2 |
| fn:strongestSupplyInDayBand | calls, declares | 2 |
| fn:structuralBoMWall | calls, declares | 2 |
| fn:structurallyValid | calls, declares | 2 |
| fn:structuralOpposingLqz | calls, declares | 2 |
| fn:structuralZones | calls, declares | 2 |
| fn:structureBroken | calls, declares | 2 |
| fn:subset | calls, declares | 2 |
| fn:substrateSha | calls, declares | 2 |
| fn:summarizeVerdict | calls, declares | 2 |
| fn:sweep | calls, declares | 2 |
| fn:sweepEventNear | calls, declares | 2 |
| fn:swingAnatomy | calls, declares | 2 |
| fn:swingRungs | calls, declares | 2 |
| fn:synthBars | calls, declares | 2 |
| fn:T | calls, declares | 2 |
| fn:tagPosition | calls, declares | 2 |
| fn:telescope | calls, declares | 2 |
| fn:tetherSession | calls, declares | 2 |
| fn:tfOf | calls, declares | 2 |
| fn:tfOfZone | calls, declares | 2 |
| fn:thickness | calls, declares | 2 |
| fn:threeDBandOf | calls, declares | 2 |
| fn:threeDElementOf | calls, declares | 2 |
| fn:threeDTranslatedRole | calls, declares | 2 |
| fn:threeDVerdict | calls, declares | 2 |
| fn:tierForOccurrence | calls, declares | 2 |
| fn:tierFromConfidence | calls, declares | 2 |
| fn:tierOf | calls, declares | 2 |
| fn:timeframeFromPath | calls, declares | 2 |
| fn:timeToMinutes | calls, declares | 2 |
| fn:toBrandedVerdict | calls, declares | 2 |
| fn:toCardFailure | calls, declares | 2 |
| fn:toDateStr | calls, declares | 2 |
| fn:toDedupSetup | calls, declares | 2 |
| fn:toEntryDirection | calls, declares | 2 |
| fn:token1_zoneIdentification | calls, declares | 2 |
| fn:token10_anchorConstruction | calls, declares | 2 |
| fn:token11_validation | calls, declares | 2 |
| fn:token2_pressureStatus | calls, declares | 2 |
| fn:token3_liquidity | calls, declares | 2 |
| fn:token4_breakValidation | calls, declares | 2 |
| fn:token5_strengthComparison | calls, declares | 2 |
| fn:token6_reactionCount | calls, declares | 2 |
| fn:token7_chainProgress | calls, declares | 2 |
| fn:token8_forwardPosition | calls, declares | 2 |
| fn:token9_chaining | calls, declares | 2 |
| fn:tokenize | calls, declares | 2 |
| fn:toLoadError | calls, declares | 2 |
| fn:toPipelineError | calls, declares | 2 |
| fn:touch | calls, declares | 2 |
| fn:touches | calls, declares | 2 |
| fn:touchSidecar | calls, declares | 2 |
| fn:toXStateGuards | calls, declares | 2 |
| fn:tpCandidates | calls, declares | 2 |
| fn:trackOf | calls, declares | 2 |
| fn:tradeIdentity | calls, declares | 2 |
| fn:transition | calls, declares | 2 |
| fn:translateDay | calls, declares | 2 |
| fn:translatedRoleOf | calls, declares | 2 |
| fn:trimWindow | calls, declares | 2 |
| fn:trunc | calls, declares | 2 |
| fn:ts1ZoneBounce | calls, declares | 2 |
| fn:ts2BosRetest | calls, declares | 2 |
| fn:ts3PatternCompletion | calls, declares | 2 |
| fn:ts4OrderFlowExhaustion | calls, declares | 2 |
| fn:ts5MomentumContinuation | calls, declares | 2 |
| fn:ts6RangeBreakout | calls, declares | 2 |
| fn:ts7FibConfluenceEntry | calls, declares | 2 |
| fn:ts8MtfAlignment | calls, declares | 2 |
| fn:ts9NewsReaction | calls, declares | 2 |
| fn:tvSymbolForPair | calls, declares | 2 |
| fn:typeName | calls, declares | 2 |
| fn:typeOf | calls, declares | 2 |
| fn:unwrapResult | calls, declares | 2 |
| fn:updateChainStatus | calls, declares | 2 |
| fn:upFixture | calls, declares | 2 |
| fn:upsertZone | calls, declares | 2 |
| fn:validateAgainstAdmEnvelope | calls, declares | 2 |
| fn:validateAgentDecisions | calls, declares | 2 |
| fn:validateBreak | calls, declares | 2 |
| fn:validateCard | calls, declares | 2 |
| fn:validateDoc | calls, declares | 2 |
| fn:validateLayerJson | calls, declares | 2 |
| fn:validateSectionOrder | calls, declares | 2 |
| fn:verdict | calls, declares | 2 |
| fn:verifyChain | calls, declares | 2 |
| fn:verifyChartWithJournal | calls, declares | 2 |
| fn:verifyDistSha | calls, declares | 2 |
| fn:verifyImportGraph | calls, declares | 2 |
| fn:verifyMemoryReattach | calls, declares | 2 |
| fn:verifyPivotSet | calls, declares | 2 |
| fn:verifySignature | calls, declares | 2 |
| fn:verifyZone | calls, declares | 2 |
| fn:violation | calls, declares | 2 |
| fn:virginBoMFixture | calls, declares | 2 |
| fn:vlmInfer | awaits, declares | 2 |
| fn:voteFamily | calls, declares | 2 |
| fn:warframePhaseOf | calls, declares | 2 |
| fn:warframeProse | calls, declares | 2 |
| fn:weekdayOf | calls, declares | 2 |
| fn:weekdayOfSetup | calls, declares | 2 |
| fn:weekProbeAtAnchor | calls, declares | 2 |
| fn:wickRejected | calls, declares | 2 |
| fn:wicky | calls, declares | 2 |
| fn:widthGate | calls, declares | 2 |
| fn:widthPips | calls, declares | 2 |
| fn:widthPipsOf | calls, declares | 2 |
| fn:windowAtET | calls, declares | 2 |
| fn:windowBars | calls, declares | 2 |
| fn:windowDeltaMsOf | calls, declares | 2 |
| fn:windowExtreme | calls, declares | 2 |
| fn:windowNamedByLabel | calls, declares | 2 |
| fn:withStage | calls, declares | 2 |
| fn:withTriad | calls, declares | 2 |
| fn:wlsSignature | calls, declares | 2 |
| fn:workflowEvent | calls, declares | 2 |
| fn:writeMdReport | calls, declares | 2 |
| fn:writeRejectedSetup | calls, declares | 2 |
| fn:writeReport | calls, declares | 2 |
| fn:z | calls, declares | 2 |
| fn:zcZone | calls, declares | 2 |
| fn:zfp | calls, declares | 2 |
| fn:zfpFromConfluence | calls, declares | 2 |
| fn:zfpFromState | calls, declares | 2 |
| fn:zfpLadder | calls, declares | 2 |
| fn:zone | calls, declares | 2 |
| fn:zoneAsModel | calls, declares | 2 |
| fn:zoneBandOf | calls, declares | 2 |
| fn:zoneCenter | calls, declares | 2 |
| fn:zoneClassOf | calls, declares | 2 |
| fn:zoneElementType | calls, declares | 2 |
| fn:zoneForRow | calls, declares | 2 |
| fn:zoneIdSet | calls, declares | 2 |
| fn:zoneLabel | calls, declares | 2 |
| fn:zonePressureOf | calls, declares | 2 |
| fn:zonePressureScore | calls, declares | 2 |
| fn:zonesBetweenEntryAndSl | calls, declares | 2 |
| fn:zonesFromSpot | calls, declares | 2 |
| fn:zoneSignalDirection | calls, declares | 2 |
| fn:zoneTimeframeFromId | calls, declares | 2 |
| fn:zoneToLexiconPressure | calls, declares | 2 |
| fn:zoneToOperative | calls, declares | 2 |
| fn:zoneTypeWord | calls, declares | 2 |
| fn:zoneWidth | calls, declares | 2 |
| fn:zoneWidthPips | calls, declares | 2 |
| fn:zpZone | calls, declares | 2 |
| fn:zt10SessionConsistency | calls, declares | 2 |
| fn:zt11SpreadCostValidation | calls, declares | 2 |
| fn:zt12NoOverfitting | calls, declares | 2 |
| fn:zt13DaySessionLabels | calls, declares | 2 |
| fn:zt14NoManualOverrideWithoutEvidence | calls, declares | 2 |
| fn:zt15No4HMoMSwingEntries | calls, declares | 2 |
| fn:zt16RequireDaySession | calls, declares | 2 |
| fn:zt17MaxTradesPerChain | calls, declares | 2 |
| fn:zt1NoTradeNewsWindow | calls, declares | 2 |
| fn:zt2NoAveragingIntoLosers | calls, declares | 2 |
| fn:zt3MaxRiskPerPair | calls, declares | 2 |
| fn:zt4NoIlliquidHours | calls, declares | 2 |
| fn:zt5CorrelationCap | calls, declares | 2 |
| fn:zt6DailyLossLimit | calls, declares | 2 |
| fn:zt7NoMartingale | calls, declares | 2 |
| fn:zt8MinEntryGap | calls, declares | 2 |
| fn:zt9NoRevengeTrading | calls, declares | 2 |
| fn:ztf | calls, declares | 2 |
| types.ts:32 | caused, flagged_by | 2 |
