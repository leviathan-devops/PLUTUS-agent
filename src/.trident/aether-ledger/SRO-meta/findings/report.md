# SRO-meta Findings Report — Plutus Agent v4.4.3 / Plutus_Agent src

## FINDING: Global PipelineRunContext Singleton — Session-Isolation Blast Radius (SRO Orchestrator)
- predicate: caused
- file: src/pipeline/engine.ts:85
- evidence: let currentRun: PipelineRunContext | null = null;
- spec: SRO Orchestrator — Isolation Law + Temporal Law §2.1 (analysisPointMs is the locked London pre-market point, NEVER the Friday close) — global singleton lets concurrent sessions clobber weekStart/temporalAnchor/scaffoldByPair/placed/frozen-snapshot; ensureContext(weekStart) does `if (!currentRun || currentRun.weekStart !== weekStart) { currentRun = {weekStart, temporalAnchor: analysisPointMs, ...} }` — a second session with different weekStart overwrites the first mid-pipeline, and placed=true freeze leaks across sessions

## FINDING: Unbounded agentBySession Map — Missing Eviction / Missing-Terminal State (MPSE Unguarded Threshold)
- predicate: unguarded_threshold
- file: src/hooks/agent-state.ts:7
- evidence: const agentBySession = new Map<string, AgentState>();
- spec: SRO Graph-Integrity — State-Machine Missing-Terminal / Resource Lifecycle §7.4 — session map grows without TTL, LRU, or clear; setCurrentAgent(sid) only inserts, never deletes; getCurrentAgent falls through to stale lastKnownAgentName, causing identity leak across tabs and unbounded memory (sro-graph: graph-structure.anomaly, mpse.threshold)

## FINDING: Tool Allowlist Prefix Over-Permissive — 'read' Prefix Grants Unintended Tools (LASME Violates)
- predicate: violates
- file: src/hooks/tool-allowlist.ts:66
- evidence: for (const prefix of ALLOWED_PREFIXES) { if (toolName.startsWith(prefix)) return true; }
- spec: SRO Wiring — Allowlist Law (TRADING ONLY, §2 TRADING ONLY. NOTHING ELSE) — ALLOWED_PREFIXES = ['plutus-','tv_','tv-browser_','read','write','glob','grep','webfetch'] — prefix 'read' matches 'read-secret', 'readline', 'ready', etc.; same for 'write'/'glob'/'grep'; violates least-privilege and contradicts BLOCKED_PREFIXES/BLOCKED_TOOLS intent; should be exact match or allowlist set, not startsWith on bare verbs

## FINDING: Silent Fallback on Identity Load Failure — Degraded Identity Instead of Loud Error (SRO Silent Degrade)
- predicate: violates
- file: src/hooks/system-transform.ts:22
- evidence: } catch (_e) { const fallback = '[PLUTUS v4.0 IDENTITY BINDING]\n\nYou are PLUTUS TTE v4.0 — autonomous trading engine.\nUse plutus-pipeline-harvest → plutus-pipeline-zones → plutus-pipeline-shapes → plutus-pipeline-charts → plutus-pipeline-setups for the full 5-tool chain pipeline.\n\n[END PLUTUS IDENTITY BINDING]'; identityHeader = fallback; return fallback; }
- spec: SRO Engine — Silent Degrade BANNED (EITHER A LOUD FUCKING ERROR OR IT WORKS) + CLEAR+REBUILD Contract (MANTA pattern) — getIdentityHeader() swallows IdentityLoader failure and injects generic fallback without logging the cause, propagating a degraded T1 without evidence; should throw or log LOUD to tag-failures path and fail the run, not succeed-with-degraded-identity

## SUMMARY
4 findings — SRO-meta sro-orchestrator (R32) — Plutus_Agent src graph slice: PipelineRunContext singleton (engine.ts:85, ensureContext, assertNotPlaced/frozen-snapshot), agent-state Map (agent-state.ts:7), allowlist prefix wiring (tool-allowlist.ts:14-66, isToolAllowed, BROWSER_PROCESS_PATTERNS), identity CLEAR+REBUILD (system-transform.ts:22, getIdentityHeader, CONTEXT_LINES). Predicates map to ontology: caused (sro family, blast-radius), unguarded_threshold (mpse family, missing eviction), violates (lasme family, contract/oracle breach). No verbatim stitch from R28-R31 (graph/path/dead-code/cycles ledgers absent) but SRO orchestration defects verified by direct file reads. Correlations: Finding-1 (global context) ↔ Finding-2 (global map) share singleton-graph-structure root; Finding-3 (allowlist prefix) ↔ Finding-1 widen blast radius if over-permissive tool runs inside singleton context.
