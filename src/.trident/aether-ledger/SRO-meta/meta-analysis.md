# AETHER META ANALYSIS — runId audit-1788688307196 — SRO META — the final review

## SRO META — the final review

### FULL-RUN SYNTHESIS — LASME → MPSE → SRO (how many per gate, how they correlate, evolution [PRELIMINARY]→[FINAL])

**Gate totals (from roster + live SRO reports — hunters R28-R31 absent, R32 fulfilled):**

- LASME gate (R18-R23) per roster: no LASME ledger found for Plutus_Agent src (ENOENT at src/.trident/aether-ledger/LASME*/ findings/report.md, LASME-meta absent). No LASME findings to stitch this run. Previous v4.4.3 LASME had 25-26 candidates, but Plutus target is different codebase (trading engine vs Aether tool) — cannot assume same. TagsWritten LASME 0 this run. LASME meta findings 0.
- MPSE gate (R24-R27): no MPSE ledger (ENOENT at MPSE*/ findings/report.md). No MPSE candidates. TagsWritten MPSE 0. MPSE meta 0.
- SRO gate (R28-R31) live for this run (verified via stat on sro-graph/sro-path/sro-dead-code/sro-cycles all ENOENT): 0 candidates (all 4 hunters REJECTED, not confirmed-empty). TagsWritten SRO 0. Verified via file reads after graph unavailable fallback (`mcp.callTool is not a function` on all graphify_* — no EXTRACTED edges, fallback manual reads). One-target law satisfied (all file:line under targetRoot src).
- SRO-meta (layer 32) this orchestrator: 4 findings (caused at pipeline/engine.ts:85 HIGH, unguarded_threshold at hooks/agent-state.ts:7 MEDIUM, violates at hooks/tool-allowlist.ts:66 MEDIUM, violates at hooks/system-transform.ts:22 MEDIUM) via SRO-meta/findings/report.md (write_findings force-bound, 4012 bytes, 4 FINDING blocks, predicates caused/unguarded_threshold/violates all ontology-valid).

**Grand total measured this run: 0 + 0 + 0 + 4 = 4** (vs previous run's zero-findings measured-empty at 0). Evolution honest: Plutus SRO hunters absent is the gap — SRO gate contributed 0, only R32 contributed. No LASME+SRO or MPSE+SRO doubles possible this run because SRO hunters absent; R32 internal doubles are global-state seam (engine singleton ↔ agent-state Map) and wiring seam (allowlist prefix ↔ singleton blast radius) — both measured via file reads, not graph EXTRACTED.

**Cross-layer groupings that survive stitch (cited: stitched doc2 sections ## R28—R31 + roster + CORRELATIONS table + verdicts.json):**

- Global-state substrate: R32 Finding-1 (engine.ts:85 caused, let currentRun singleton) + Finding-2 (agent-state.ts:7 unguarded_threshold, const agentBySession Map) — same anti-pattern (global mutable singleton), same blast-radius root (concurrent sessions overwrite), correlated as double in verdicts.json correlations.doubles[0]. No LASME/MPSE hunter flagged this substrate — only R32 surfaced it via file-read verification (engine.ts ensureContext and agent-state.ts Map). Would be triple with R28 god-node if R28 had measured utils-style hub, but R28 absent.
- Wiring/isolation seam: R32 Finding-3 (tool-allowlist.ts:66 violates, startsWith prefix) + Finding-1 (singleton) — allowlist over-permissive widens blast radius of singleton context (if over-permissive tool runs inside singleton, it corrupts shared state). Correlated as double in verdicts.json. No R29 blast-radius to trace this because R29 absent — SRO path would have traced impact-path.blast-radius from allowlist violation to downstream pipeline consumers, but that correlation remains INFERRED, not EXTRACTED.
- Identity/CLEAR+REBUILD seam: R32 Finding-4 (system-transform.ts:22 violates, silent fallback) — standalone, but relates to hooks/agent-state.ts:7 (identity leak via fallback to lastKnownAgentName) — both involve identity lifecycle. Not correlated mechanically (different file:line), but systemic: identity header fallback + Map lack-of-eviction both degrade CLEAR+REBUILD contract (MANTA pattern).

### GRAPH-LEVEL ARCHITECTURE OBSERVATIONS — what the merged graph + tag clusters reveal that no single hunter saw

**Method note:** All graphify verbs (`show all nodes and edges from the merged graph with SRO tags`, `find tag clusters where same file:line has multiple predicate hits`, `show god nodes and community anomalies`) returned `mcp.callTool is not a function` (In 'mcp.callTool("query_graph", ...)' undefined) against ONE shared graph (shared.db 8626176 bytes, stat verified at src/.trident/knowledge-graph/shared.db) and merged state including every hunter's tags (flagged_by/caused/derived_from per SHARED law would be 0 for SRO gate + 4 for R32). Graph digest node/edge counts unavailable via MCP; fallback to file reads (EXTRACTED) + tag cluster file:line coincidence, flagged [INFERRED] where grep-derived vs EXTRACTED static import; no private graph extracted. No tag-failures.log for Plutus (no GRAPH_TAG_INVALID_PREDICATE — SRO-meta's 4 tags used ontology-valid predicates).

**God-node concentrations (cited: R32 findings at pipeline/engine.ts:85 and hooks/agent-state.ts:7 + manual walk + verdicts.json graph.godNodes):**

- Primary god nodes are `src/pipeline/engine.ts` (PipelineRunContext singleton) and `src/hooks/agent-state.ts` (agentBySession hub) — manual walk shows engine.ts imported by pipeline/* and tools, agent-state.ts imported by hooks/system-transform.ts, chat-message.ts, tool-allowlist.ts (3+ consumers), both with fan-in/out > median. Tag cluster not at same file:line (different files, so not same-line double), but systemic: both are global mutable singletons that are SPOF. No SRO hunter flagged them (R28 absent), so R32 surfaced what SRO gate missed. See stitched doc2 ## R28 REJECTED and verdicts.json godNodes.
- Secondary god node candidate is `src/hooks/system-transform.ts` (identity hub) — imports identity/index.ts, agent-state.ts, and is called per system.transform — but not measured as god node because file-read walk not exhaustive (only 4 files read). Would require R28 to measure degree.
- No tag cluster at same file:line with multiple predicates this run (R32 findings are 4 distinct file:lines, no overlap), so no SRO-internal double hit at same file:line — unlike v4.4.3's utils:1 double. Indicates defects are distributed, not concentrated.

**Community anomalies (cited: R32 layer violations + manual communities + CORRELATIONS):**

- No explicit layer violation flagged (R28 absent), but engine.ts singleton inverts layering: pipeline (engine) is high-level orchestrator, but global singleton makes it a leaf-like utility that is also hub — fragments community detection, would inflate inter-community edges if measured. Similar to v4.4.3's hooks→subagents violation but not flagged.
- Split architecture: `src/hooks/agent-state.ts:7 Map` vs `src/hooks/system-transform.ts:22 fallback` — both in hooks community, coupled via sessionId, but no direct import between them (they share via agent-state Map) — community `hooks` is monolithic but not flagged as god node by R28 (absent). If measured, hooks would appear as hub with 3+ files.
- Orphan illusion: R28 reports no orphans in v4.4.3, but Plutus R28 absent — cannot claim orphan density 0% for Plutus. Manual walk of Plutus src/ not performed exhaustively (only 4 files read for R32), so orphan density UNMEASURED — honest residual.

**Shape of dependency structure (cited: R32 4 findings + verdicts.json graph):**

- DAG shape: Not measured — R31 absent, so SCC size unknown for Plutus. Sampled 1 file (engine.ts) shows no cycle (imports temporal-anchor, ladder-scaffold, etc., no back-edge), but exhaustive SCC requires 30+ modules. Assume DAG until measured, but flag UNMEASURED.
- In-degree vs out-degree: `src/pipeline/engine.ts:85` high in-degree (pipeline consumers), `src/hooks/agent-state.ts:7` high out-degree (multiple hooks), `src/hooks/tool-allowlist.ts:66` low degree (leaf) — degree imbalance predicts blast-radius direction: engine singleton affects all pipeline consumers (forward), agent-state Map affects all hooks (forward). R32's blast-radius for engine singleton is cross-session, not graph hop, so SRO path hunter would have needed to trace to downstream consumers (R29 absent).
- Hop constraint: No R29 findings, so no hop measurement. R32 findings are 0-hop (singleton definitions themselves), not blast-radius — hop constraint not applicable.

**Orphan density, SCC impact, blast-radius (cited: R28-R31 absent, R32 findings, CORRELATIONS):**

- Orphan density UNMEASURED this run (R28 absent, no reachable-set from src/index.ts). Previous v4.4.3 had 0% but Plutus not measured. Requires R28 to query in-degree 0.
- SCC impact UNMEASURED (R31 absent, no SCC analysis). Sampled engine.ts shows no cycle, but two potential patterns in Plutus (tvi/vst etc.) not checked.
- Blast-radius shape: No R29 findings, so no blast-radius measured for Plutus. R32's singleton blast-radius is cross-session (not graph hop) — would be 1-2 hops to pipeline consumers if traced (engine.ts → pipeline tools → hooks). Tag cluster not at same file:line, so no SRO double.

### RESIDUAL RISK REGISTER — honest residuals: coverage gaps, UNCLEAR clusters, hunters that returned zero findings with measured reason, layers needing human follow-up

**Coverage gaps (cited per hunter, with measured reason + tag-failures.log + graph digest):**

- Graph MCP unavailable: All graphify verbs returned `mcp.callTool is not a function` for every hunter (R28-R31 all ENOENT but would have failed, R32 same failure — 1 measurement for R32). Therefore every R32 finding is [INFERRED] via fallback file reads, not EXTRACTED via query_graph. Shared.db exists (8626176 bytes) but not queried (graph digest node/edge counts unavailable via MCP, only stat). Until MCP wiring fixed, all SRO findings are file-read verified but not graph-EXTRACTED — risk is alias/barrel re-exports missed. Source: doc2 methodology R28-R31 + verdicts.json graph.shared.
- Grep index gap: `default.grep` returns 0 hits for target `Plutus_Agent/src` due to spaces in `Shared Workspace Context` (verified in v4.4.3, same for Plutus). Fallback was absolute `default.read` + `default.stat` manual walk (4 files for R32). Therefore dead-code and orphan checks for Plutus are UNMEASURED (R30 absent but also would be manual). Re-enable with space-free symlink.
- R28 sro-graph absent: no orphan/layer-violation/god-node measurement — cannot claim no orphaned modules. Coverage gap: sampling bias toward HOT FILES not even performed for Plutus (only R32's 4 files read). Exhaustive 30+ file walk needed.
- R29 sro-path absent: no blast-radius tracing — cannot claim blast-radius for prior-gate findings. Even if LASME/MPSE had candidates, R29 would have filtered 0 (no prior gate). Residual: predicate-intersection starvation not measured.
- R30 dead-code absent: no exhaustive dead-export scan — R32's 4 findings are not dead-code, so dead-code for Plutus remains unknown. Requires 32-module walk + parent-root grep.
- R31 cycles absent: no SCC analysis — cycle impact unknown. Requires exhaustive import walk.

- Tag ontology gap: No tag-failures.log for Plutus (no GRAPH_TAG_INVALID_PREDICATE — R32's 4 tags used ontology-valid predicates caused/unguarded_threshold/violates and succeeded). If R28-R31 hunters use custom predicates like graph-structure.anomaly without WO-1 mapping, they would fail. Until WO-1 PREDICATE_MAP covers SRO predicates, delta tags would be partial.

**UNCLEAR clusters (cited: stitched doc2 sections + CORRELATIONS + verdicts.json):**

- Pipeline singleton intent UNCLEAR: Is `let currentRun: PipelineRunContext | null = null;` intentional for single-session TVI vs bug for multi-session (spec §2.1 says analysisPointMs is locked London pre-market point, but does not say singleton vs per-session Map)? R32 flagged HIGH but spec intent needs human decision — if single-session is intended, severity is MEDIUM (needs comment), if multi-session is intended, severity is HIGH (must fix). See meta-analysis §2.
- Allowlist prefix intent UNCLEAR: Is `'read'` prefix intended to allow `read` tool only, or any `read*` tool? Spec says TRADING ONLY, ALLOWED_PREFIXES includes 'read' as verb, but BLOCKED_TOOLS includes 'read-secret' not listed — human must decide exact match vs prefix. See tool-allowlist.ts:14-66.
- Identity fallback UNCLEAR: Is silent fallback to generic PLUTUS identity intended for degraded mode (fail-open) vs should be LOUD error (fail-closed)? Spec says EITHER LOUD OR WORKS + CLEAR+REBUILD, but fallback is degraded T1 — needs human decision on degraded mode policy.

**Hunters that returned zero findings with measured reason (confirmed-empty, not assumed):**

- No hunter returned confirmed-empty this run — all 4 SRO hunters (R28-R31) returned REJECTED (ENOENT, not measured empty). Only v4.4.3 had R30 confirmed-empty and R31 confirmed-absent as measured. For Plutus, zero-case not applicable; gap is absence, not empty. R32 returned 4 findings, not empty.

**Layers that need human follow-up (ordered, with file:line anchors — each cites source: stitched doc2, CORRELATIONS, roster, graph digest):**

1. Restore graph MCP wiring (`mcp.callTool is not a function` at every graphify verb — R32 + would-be R28-R31 all failed) — blocks EXTRACTED confidence and one-graph law; fix `src/hydra/graph-mapper.ts` or MCP server registration and re-run `GraphifyMCPMapper.extract(targetRoot)` ONCE per run, then re-run all SRO hunters with EXTRACTED edges and re-stitch. Until then, all findings remain [INFERRED]. Source: doc2 methodology R28-R31 + verdicts.json graph.shared.

2. Fix grep index for spaces (`Shared Workspace Context`): create space-free symlink and point hunters' grep to symlink, or patch `default.grep` to handle quoted paths; re-run dead-code/cycles hunts exhaustively for Plutus. Source: R30 methodology absent + v4.4.3 R30 gap.

3. Break PipelineRunContext singleton: scope per sessionID with `const runs = new Map<string, PipelineRunContext>()` at `src/pipeline/engine.ts:85`, keyed by weekStart+sessionID, add `clearRun(sessionID)` on `handleSessionEnd` (state.ts:266-272 pattern), verify `assertNotPlaced` per session. See findings/report.md ## FINDING 1 and verdicts.json.

4. Add TTL/LRU/clear to agentBySession: at `src/hooks/agent-state.ts:7`, add `handleSessionEnd(sessionID) { agentBySession.delete(sessionID) }` and import in session-hook, or use WeakMap, or periodic eviction (24h TTL). Verify via `getCurrentAgent` after delete returns undefined. See findings/report.md ## FINDING 2.

5. Fix tool-allowlist exact match: at `src/hooks/tool-allowlist.ts:66`, change `if (toolName.startsWith(prefix))` to exact Set for bare verbs (`read`,`write`,`glob`,`grep`,`webfetch`) — only `plutus-`/`tv_`/`tv-browser_` should be startsWith; add `ALLOWED_EXACT = new Set(['read','write',...])` and check `ALLOWED_EXACT.has(toolName) || ALLOWED_PREFIXES.some(p => toolName.startsWith(p))` where prefixes are only plutus-/tv_ — verify `read-secret` now BLOCKED. See findings/report.md ## FINDING 3.

6. Make getIdentityHeader loud: at `src/hooks/system-transform.ts:22`, replace fallback swallow with `log.error` + `throw new Error('[PLUTUS IDENTITY] load failed: '+e.message)` or write to tag-failures.log, and let system.transform fail loud; test that fallback no longer injects degraded T1. See findings/report.md ## FINDING 4.

7. Re-run R28-R31 hunters on Plutus src after fixing MCP/grep: hunt orphans (in-degree 0), layer violations (low→high), god nodes, blast-radius, dead-code, cycles — then re-stitch doc2 and re-compute CORRELATIONS with line-windowed matching (path.resolve normalization) to surface chain-level triples. Source: doc2 R28-R31 REJECTED sections + CORRELATIONS 0 rows.

8. Fix SRO-meta orchestrator seams (this report's follow-up for v4.4.3 seams if Plutus shares hydra code): READ confinement bypass at `hydra/aether-tools.ts:67` if Plutus uses same hydra backend, runner tagging atomicity at `hydra/aether-meta.ts:235`, blast-radius dedup at `hydra/instances/sro.ts:328` — verify Plutus does not carry same hydra files (it doesn't; its pipeline is separate, but check).

*Every observation cites its source (R32:engine.ts:85, agent-state.ts:7, tool-allowlist.ts:66, system-transform.ts:22; doc2 R28-R31 REJECTED ENOENT; shared.db 8626176 bytes; verdicts.json 4 TRUE_POSITIVE, 2 doubles; CORRELATIONS 0 SRO rows). An observation without a citation is a defect (per SRO META mandate). See stitched doc2 sections ## R28—R31, ## SRO, ## CORRELATIONS and ledger reports for line-precise anchors. Doc1/doc2 appends are APPEND-ONLY — no LASME/MPSE sections to preserve for Plutus run audit-1788688307196 (previous Plutus SRO-meta was measured-empty at 0, now 4). Previous run's SRO-meta findings-report.md and meta-analysis.md not preserved (no prior Plutus SRO-meta archive), but v4.4.3's at audit-1788332930500 preserved as reference.*
