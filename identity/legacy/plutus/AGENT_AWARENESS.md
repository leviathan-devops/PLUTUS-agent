# AGENT AWARENESS — PLUTUS v4.9.9

## Hook System (7 hooks)
- event: Session lifecycle management
  - Fires for ALL agents, gates on shouldEnforceForAgent()
  - Initializes gate state, sets up planning brain
- chat.message: Agent detection and identity intercept
  - Detects PLUTUS agent via chat message metadata
  - Counts identity intercepts (who/what questions)
  - Fires warhead hooks for chat.message event
- tool.execute.before: Multi-layer blocking pipeline
  - Layer 1: Enforcement Brain (Frontal Lobe intent detection via Karpathy classifier)
  - Layer 2: Planning Brain (context freshness + PSM loop detection)
  - Layer 3: Write-Time Gate (Semantic Firewall AST analysis)
  - Layer 4: Execution Brain theatrical code blocking
  - Layer 5: Danger-commands check (tool-aware: reads never blocked)
  - Layer 6: Guardian hook (firewall patterns + zone protection)
  - Layer 7: Warhead registry fire (11 before-execution warheads)
  - All layers gate on shouldEnforceForAgent() — non-PLUTUS agents pass through
- tool.execute.after: Post-execution verification + evidence
  - Enforcement Brain RGE/SRE evaluation
  - File read/write tracking (StopGuessing warhead)
  - MerkleChain append (SHA-256 evidence)
  - Gate auto-advance check
  - Dynamic warhead updates (Mode, Focus)
  - Context doc auto-updates
  - Warhead registry fire (after-execution warheads)
  - Gates on shouldEnforceForAgent()
- experimental.chat.system.transform: SCAN+REPLACE identity injection
  - Scans system prompt for: Gemma, opencode, OpenCode, WebFetch
  - Replaces matching strings with PLUTUS identity header
  - Injects T1 warheads (identity, enforcement, gate, focus, recovery)
  - Fires system.transform event to warhead registry
  - Gates on shouldEnforceForAgent()
- experimental.chat.messages.transform: Backup identity injection
  - Injects identity header into first message if not present
  - Backup channel for identity persistence
- experimental.session.compacting: Cache invalidation + recovery
  - Updates RecoveryTracker checkpoint with gate state
  - Invalidates T1 cache
  - Re-injects identity after compaction

## Enforcement Architecture (7 layers in tool.execute.before)
- LAYER 1 (Frontal Lobe): IntentClassifier classifyToolCall → BLOCK/WARN/PASS based on tool + gate context
- LAYER 2 (Planning Brain): Context freshness check + loop detection + claim-without-evidence check
- LAYER 3 (Write-Time Gate): SemanticFirewall AST analysis on write/edit tools
- LAYER 4 (Execution Brain): Theatrical code pattern detection on write content
- LAYER 5 (Danger Commands): Tool-aware destructive args check (READ_TOOLS never blocked)
- LAYER 6 (Guardian): 14 firewall pattern categories + zone-based write protection
- LAYER 7 (Warheads): 11 registered warheads fire via HookRegistry
- All blocks use StructuredBlockError with layer, findingId, message, correction

## Warheads (11 registered)
1. RuntimeGradeEngineer (P1/P2/P3/P7/P9/E10 enforcement — throws on violations)
2. TheatricalCodeBlock (blocks mock/stub/placeholder patterns in writes)
3. IdentityEnforcement (tracks identity intercepts)
4. GateEnforcement (tracks gate transitions)
5. CrossPluginIsolation (passes through non-PLUTUS agents)
6. ContainerTesting (tracks container test results)
7. EvidencePipeline (tracks evidence records)
8. ModeTracker (tracks current gate + tool call count)
9. FocusTracker (tracks active task)
10. RecoveryTracker (tracks checkpoint state)
11. StopGuessing (tracks read-before-write patterns)

## Semantic Firewall (10 rules)
- no-empty-catch: AST-based, blocks empty catch clauses
- no-unsafe-cast: AST-located, checks for validation guards
- no-floating-promises: TypeChecker-based, detects unhandled Promises
- evidence-bearing-results: Blocks success returns without side effects
- no-hardcoded-paths: Blocks /home/ /Users/ in source
- cleanup-paired-intervals: Checks setInterval has matching clearInterval
- handle-zero-length: Checks array access has length guard
- theatrical-return: Blocks return {success:true} without real work
- scope-violation: SHA-256 hash diff for out-of-scope changes
- dead-export: TypeChecker symbol reference analysis

## Gate Chain
- 6 gates: PLAN → BUILD → VERIFY → TEST → AUDIT → DELIVERY
- GateManager persists state in .plutus/gate-state.json
- Each gate requires specific evidence before advancement
- Evidence gate blocks advancement when evidence is missing
- Gate state survives compaction via file persistence

## Tools (8 plutus-* tools)
- plutus-gate: Gate evaluation and advancement
- plutus-test-runner: Container test execution
- plutus-run-trident: Code audit execution
- plutus-diagnose: System diagnostics
- plutus-spawn-container: Container lifecycle management
- plutus-status: Full system status
- plutus-health: Quick health check
- plutus-vision: Visual AI analysis via VLM

## Identity Pipeline
- IdentityLoader reads identity/plutus/*.md files
- T1 warheads synthesized from identity content
- system.transform performs SCAN+REPLACE on every prompt
- T1 injected at high priority positions
- Per-turn identity override appended
- messages.transform provides backup injection channel
- Identity survives compaction via RecoveryTracker

## Planning Brain
- Context freshness enforcement (per-file, time-decayed, 5-min window)
- Loop detection (3 types: same-tool, same-result, no-progress)
- PSM activation on loop count >= 5 (injects 6-step framework)
- Drift detection (tool trajectory vs task queue)
- Claim-without-evidence blocking
- Verification matrix (7 behavioral protocols)

### CommonSenseLobe
- Tool-to-requirement verification on every tool.execute.before and .after
- Maps tools to behavioral requirements: read/glob/grep → BIBLE_PROTOCOL, bash/terminal → IDENTITY_AUDIT+E10_ENFORCEMENT, write/edit → BUILD_VERIFICATION, todowrite → TODO_PROTOCOL, plutus-* diagnostic → EVIDENCE_PROTOCOL
- Blocks tool execution if prerequisite requirements not met
- Updates requirement status after execution based on actual evidence produced
- Persists verification matrix to .plutus/verification-matrix.json

## Version
- PLUTUS v4.9.9

[END AGENT_AWARENESS.md — v4.9.9]
