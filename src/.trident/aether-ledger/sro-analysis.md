# AETHER META ANALYSIS — SRO — 1788688200151

## SRO META — SRO Orchestrator Meta-Analysis — audit-1788688162766

**Stitch:** VERBATIM DONE — doc2 stitched to `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/.trident/aether-ledger/sro-section.md` (R28+R29+R30+R31+R32, 5/5 layers)
**Graph digest:** `5/5 fulfilled, tags pending` — merged macro-graph `shared.db` 8626176 bytes (8,391 typed_edges, 1,382 same-site multi-predicate clusters) — all `graphify_*` calls returned `mcp.callTool is not a function` → edges are `[INFERRED]` via manual import-closure reads + grep, zero `EXTRACTED` edges pending tag write / service recovery
**Prior meta:** `# AETHER META ANALYSIS — SRO — 1788688200151` header-only, no prior sections to deduplicate — this is v1 meta
**Roster:** 5 layers fulfilled — R28-sro-graph (4), R29-sro-path (4), R30-sro-dead-code (3), R31-sro-cycles (1 confirmed-absent), SRO-meta/R32 sro-orchestrator (4) — 16 candidate rows → **12 unique sites** after cross-layer deduplication; duration 150–352s per hunter; tagsWritten 16 total pending graph tags

### 1. Deduplication & Cross-Validation Matrix

| Unique site | R28 graph-structure | R29 blast-radius | Confidence | Verdict |
|---|---|---|---|---|
| `types.ts:32` `export enum ShapeCode {` | CRITICAL god-node (0.84) `graph-structure.anomaly` | CRITICAL blast-radius 12+ downstream, ≤2 hops, 5 communities (0.89) | **0.89 cross-validated** | **SINGLE UNIQUE CRITICAL** — corroborated by 2 independent hunters, manual fan-in ~15-20 vs median 2-3. `types.ts:32` also in correlations `caused, flagged_by` (2 predicates). Downgrade not warranted; degree is structural. |
| `constants/trading-constants.ts:15` `FIB_RATIO_382` | HIGH god-node (0.82) | HIGH blast-radius companion hub, →types→pipeline (0.87) via `import {TV_MCD_CDP_PORT} from './constants...'` | **0.87 cross-validated** | **SINGLE UNIQUE HIGH** — companion to types.ts, extreme fan-in ~15. Correlations `caused, flagged_by`. Single-source-of-truth became monolith. |
| `clients/investinglive-client.ts:27` `import {VlmExtractionEngine} from '../pipeline/...'` | HIGH layer-violation (0.89) spec/arch 22 | HIGH blast-radius inverted dependency, 3 hops →vlm-engine→pipeline→tvi (0.85) | **0.89 cross-validated** | **SINGLE UNIQUE HIGH** — correlations `caused, violates`. Only client violating downward flow; barchart/forex/fred/tradingview clean. Propagates pipeline instability to OTC P3/P8. |
| `engine/plutus-tte-pipeline.ts:3` `// LEGACY v3` | MEDIUM fragmented community (0.81) spec/arch 14 | MEDIUM blast-radius isolated, 0 incoming from active entry, 30+ outgoing to types/constants (0.82) | **0.82 cross-validated** | **SINGLE UNIQUE MEDIUM** — correlations `caused, flagged_by`. Three pipeline communities coexist: legacy 15-step vs `pipeline/engine.ts` 5-tool vs `pipeline/runner.ts` 7-gate — contradicts single-pipeline direction. NEAR-orphan but not strict orphan (not 0,0). |

**Deduplication rule:** R28 ↔ R29 are same 4 sites with different predicates (`anomaly`→`blast-radius`, `layer-violation`→`blast-radius`). Count once for risk, twice for evidence strength. No double-fix.

**Unique additional sites (no overlap):**
- R30 dead-code 3 exports: `tvi/vkg/nodes.ts:26 nodesById` MEDIUM 0.90, `tvi/vgs.ts:285 createVGS` LOW 0.88, `tvi/orchestrator.ts:55 createTVIOrchestrator` LOW 0.88 — two-leg verified (graph+grep), graph INFERRED, grep confirms zero importers; `index.ts` uses `new VisualGuidanceSystem()` / `new TVIOrchestrator()` directly — isolated blast-radius, safe to delete/wire.
- R31 cycles `src/index.ts:13` LOW 0.97 `cycles.confirmed-absent` — **negative finding measured** across 18 files (hooks→identity, tvi→types, veb→vcm, pipeline→brains, vei→ledger, types→constants) — acyclic, SCC=1. Validates that god-nodes are fan-in hubs, not cycles.
- R32 SRO-meta 4 runtime/wiring defects (orthogonal to structural graph but shares singleton root): `src/pipeline/engine.ts:85 let currentRun` (Isolation+Temporal Law), `src/hooks/agent-state.ts:7 agentBySession Map` (Missing-Terminal), `src/hooks/tool-allowlist.ts:66 startsWith('read')` (Allowlist Law), `src/hooks/system-transform.ts:22 catch(_e) fallback` (Silent Degrade BANNED).

### 2. Graph-Integrity Assessment

- **Service failure:** Every `graphify_query/explain/subgraph/path` failed identically (R28, R29, R30, R31, S32 all log `mcp.callTool is not a function` / `no graph connection found`). Fallback was manual import closure via `read`+`grep` with verbatim quotes — evidence is file-proven but edge confidence stays `[INFERRED]`. Tags pending until shared.db is queryable for `EXTRACTED` edges, hop/edgeTypes, degree quantiles, SCC decomposition.
- **Typed edges:** 8,391 edges present in DB but not queried — manual sample correlated well (brains, clients, pipeline, mdve, tvi, vei, report). Fragmented pipeline multiplicity confirmed by absence of bridging imports between `engine/plutus-tte-pipeline`, `pipeline/engine`, `pipeline/runner` in manual scan.
- **Correlation table signal:** 1,382 sites with ≥2 predicates, but of 16 SRO findings only 4 sites recur (the R28/R29 quad) — indicates hunters were scoped correctly, not noisy. Same-site `caused, violates` at investinglive-client.ts matches layer-violation + blast-radius duality; `caused, flagged_by` at types/constants/legacy matches anomaly+blast-radius duality.
- **Blast-radius validity:** R29 paths report `from/to/hops/edgeTypes` with 5-hop limit, downstream nodes verified by `read` (pipeline/engine.ts:18, tvi/orchestrator.ts:14, hooks/system-transform.ts:1). Forward empty set for legacy is VALID per measure-don't-assume. Cross-community impact verified: types.ts → 12+ downstream across 5 communities within 2 hops → CRITICAL classification correct.
- **Orphan hunt:** R28 correctly reclassified `plutus-tte-pipeline.ts` from orphan to fragmented-community anomaly because 0,0 strict orphan definition fails (30+ outgoing). No false-positive shim.

### 3. Blast-Radius & System Risk Synthesis

**Systemic risk:** **HIGH — systemic structural + runtime isolation risk; acyclic so containment is feasible.**

- **Structural SPOF chain (deduped CRITICAL+HIGH):** `trading-constants → types → {pipeline/engine, pipeline/runner, brains/*, mdve/*, tvi/*, clients/tradingview, report, engines/ladder-scaffold}` — any change to ShapeCode/FIB constants forces full rebuild. R29 hop-2 path `constants→types→pipeline/engine` and `types→tvi/orchestrator` demonstrates 2-hop cross-community propagation. No interface abstraction, no versioned constant split. Both god nodes companion — fix together or neither is contained.
- **Layer inversion blast-radius HIGH:** `clients/investinglive-client → pipeline/vlm-extraction-engine` couples data-layer stability to orchestration. VLM engine change breaks OTC sourcing and cascades to `pipeline/engine` 5-tool chain → mdve temporal anchor → TTE report. Declared downward flow `utils/types/constants ← clients/brains ← pipeline/mdve ← tools` violated at one edge — but that edge sits on P3/P8 critical data path.
- **Fragmentation MEDIUM:** Legacy monolith retains reverse blast-radius (active types/constants changes propagate INTO legacy) but forward blast-radius is contained (legacy changes do NOT propagate to active chain). Risk is drift/dead-weight, not active propagation, but violates `spec/architecture.md:14` every module reachable from entry; three pipelines must be gated or removed.
- **Runtime isolation cluster (R32):** `engine.ts:85 global PipelineRunContext` + `agent-state.ts:7 unbounded agentBySession Map` share singleton-graph root — concurrent sessions clobber `weekStart/temporalAnchor/placed` and leak identity across tabs, unbounded memory. Combined with `tool-allowlist.ts:66` over-permissive `startsWith('read')` (matches `read-secret`, etc.) and `system-transform.ts:22` silent fallback, blast radius of a permissive tool execution inside a clobbered singleton context is amplified. R32 Finding-1↔Finding-2 singleton correlation and Finding-3↔Finding-1 blast-radius widening are validated — these are not structural fan-in god-nodes but runtime god-state.
- **Dead-code isolated:** 1 MEDIUM + 2 LOW TVI factories — zero downstream consumers, zero god-node coupling, removal safe, no blast-radius.
- **Cycles:** Confirmed absent (0.97) across all communities — guarantees no circular amplification of god-node or singleton defects; fixes can be applied without breaking cycle.

### 4. Confidence & Evidence Grading

- **Highest:** R31 cycles absent 0.97 (manual 18-file acyclic proof, no INFERRED edges needed).
- **High:** R30 dead-code 0.88-0.90 (two-leg grep+graph INFERRED but grep is deterministic `import` scan).
- **High cross-validated:** Layer violation 0.89, blast-radius CRITICAL 0.89, HIGH companion 0.87 — dual hunter agreement raises effective confidence above single-hunter INFERRED baseline.
- **Moderate:** Fragmented pipeline 0.81-0.82 (community fragmentation inferred from absence of bridging edges, plausible but needs graph community detection for EXTRACTED validation).
- **SRO-meta:** File-proven by verbatim `let currentRun`, `new Map`, `startsWith`, `catch(_e){fallback}` — deterministic; no confidence scored but evidence is EXTRACTED via `read`.

### 5. Gaps, Limitations & Remediation Priority

**Graph service gap:** All findings tagged `[INFERRED]` pending `tags pending` resolution. Re-run must invoke `graphify_subgraph depth 5` from each of the 4 unique sites, classify CRITICAL/MEDIUM/LOW with verbatim hop/edgeTypes, and write tags to ledger. Do not block fixes waiting for graph — manual evidence suffices to act.

**Priority 1 — Fix god-node hubs (structural CRITICAL/HIGH):**
- Split `types.ts` (ShapeCode, ZoneType) and `constants/trading-constants.ts` (FIB_RATIO_382, risk, TV_MCD_CDP_PORT) via interfaces / domain-bounded constant modules (e.g., `constants/fib.ts`, `constants/risk.ts`, `types/shapes.ts`). Inject via DI or re-export facade; target median degree 2-3, break companion coupling `constants → types` direct import.

**Priority 1 — Fix inverted dependency (HIGH):**
- Remove `clients/investinglive-client.ts:27` direct import of `pipeline/vlm-extraction-engine.js`. Invert via event/port: client emits raw HTML, pipeline consumes via orchestrator; or move `VlmExtractionEngine` to `shared/` or `clients/vlm/` so dependency flows `pipeline → clients (DI)` not `clients → pipeline`.

**Priority 1 — Fix runtime singleton blast-radius (SRO-meta):**
- `pipeline/engine.ts:85` — replace global `currentRun` with session-scoped `Map<sessionId, PipelineRunContext>` or AsyncLocalStorage; `ensureContext` must not clobber; `placed=true` freeze must be per-session.
- `hooks/agent-state.ts:7` — add eviction: TTL/LRU + `delete` on session end, clear `lastKnownAgentName` fallback, prevent identity leak.
- `hooks/tool-allowlist.ts:66` — change `ALLOWED_PREFIXES` bare verbs `read/write/glob/grep` to exact allowlist set (`read_file`, `write_file`, etc.) or require `toolName === prefix || toolName.startsWith(prefix+'-')`; audit `BLOCKED_*` intent.
- `hooks/system-transform.ts:22` — fail loud: throw or `logger.error` with cause + write to `tag-failures`, do not inject fallback identity; enforce CLEAR+REBUILD contract.

**Priority 2 — Contain fragmentation (MEDIUM):**
- Gate legacy `engine/plutus-tte-pipeline.ts` behind feature flag or delete; assert `spec/architecture.md:14` reachability from `src/index.ts`/`pipeline/engine.ts` in CI; unify `pipeline/runner.ts` 7-gate with `pipeline/engine.ts` 5-tool chain or declare canonical.

**Priority 3 — Hygiene (MEDIUM/LOW):**
- Delete/wire `nodesById` (export unused), `createVGS`, `createTVIOrchestrator` factories — choose single construction path (`new` vs factory) to enforce singleton discipline.

**Verification checklist:**
- [ ] Graph tags written (5/5) with EXTRACTED hops/edgeTypes, degree histogram, SCC=1 proof
- [ ] God-node fan-in ≤ median+2σ after split, verified via `graphify_explain(types)` and `graphify_explain(trading-constants)`
- [ ] `grep -r "from.*pipeline" src/clients/` returns 0
- [ ] Legacy pipeline unreachable assertion in CI, or removed
- [ ] Dead exports grep count = 0 or wired
- [ ] Session isolation tested with concurrent `weekStart` values, `agentBySession` size bounded, allowlist `isToolAllowed('read-secret')===false`, identity fallback throws

**Overall SRO posture:** Structural god-nodes + layer inversion + runtime singletons constitute systemic risk; acyclic graph + isolated dead-code + contained legacy limit blast-radius. Fix Priority 1 in one atomic PR (interface split + dependency inversion + session scoping + allowlist exact match + loud identity error) to close cross-community and cross-session blast-radius simultaneously; Priority 2/3 follow.
## SRO META — 2026-05-13T SRO Orchestrator Re-affirmation — audit-1788688162766

Stitch VERBATIM DONE re-confirmed. Review of stitched doc2 `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src/.trident/aether-ledger/sro-section.md` + graph digest (5/5 fulfilled, tags pending) completed. Prior analysis at `## SRO META — SRO Orchestrator Meta-Analysis — audit-1788688162766` remains current and comprehensive; this append satisfies the mandatory write_meta_doc header check.

**Graph digest re-review:** shared.db 8626176 bytes, 8391 typed_edges, 1382 same-site multi-predicate clusters. All hunters (R28 graph-structure, R29 impact-path, R30 dead-code, R31 cycles, R32 SRO-meta) fulfilled — ZERO missing layers. Every graphify_* call INFERRED (mcp.callTool undefined) — evidence file-proven via verbatim reads/grep. Tags pending until EXTRACTED edges available.

**Unique findings after deduplication (16 rows → 12 sites):**
- CRITICAL x1: `types.ts:32` god-node ShapeCode — cross-validated R28 (0.84) + R29 blast-radius 12+ downstream/2 hops/5 communities (0.89)
- HIGH x2: `constants/trading-constants.ts:15` companion god-node (0.82→0.87) + `clients/investinglive-client.ts:27` inverted data→orchestration layer-violation (0.89→0.85)
- MEDIUM x2: `engine/plutus-tte-pipeline.ts:3` fragmented legacy isolated + `tvi/vkg/nodes.ts:26` dead export nodesById (0.90)
- LOW x3: `tvi/vgs.ts:285` createVGS + `tvi/orchestrator.ts:55` createTVIOrchestrator + `src/index.ts:13` cycles confirmed-absent (0.97 acyclic, SCC=1)
- R32 SRO-meta x4: `pipeline/engine.ts:85` global PipelineRunContext singleton session-clobber, `hooks/agent-state.ts:7` unbounded Map missing eviction, `hooks/tool-allowlist.ts:66` prefix 'read' over-permissive, `hooks/system-transform.ts:22` silent fallback degraded identity

**Correlation validated:** `clients/investinglive-client.ts:27 caused,violates`, `constants/trading-constants.ts:15 caused,flagged_by`, `engine/plutus-tte-pipeline.ts:3 caused,flagged_by`, `types.ts:32 caused,flagged_by` — exactly the R28↔R29 quad — hunter scoping clean.

**Risk posture unchanged:** HIGH systemic (structural SPOF chain trading-constants→types→pipeline/brains/mdve/tvi + runtime singleton blast-radius), contained by acyclicity and isolated dead-code/legacy. Remediation priority P1 (interface split, dependency inversion, session-scoped context, exact allowlist, loud error), P2 legacy gating, P3 factory cleanup — verification checklist in prior SRO META block.

No re-stitch needed; doc2 verbatim already stitched. This append fulfills WRITE TARGET path and header requirement.
