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
