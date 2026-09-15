# R28 sro-graph — graph-structure hunt report
Run: audit-1788688162766 | Target: Plutus_Agent/src | Layer: 28

Methodology:
- Attempted 4 graph queries via graphify_query / graphify_explain / graphify_subgraph / graphify_path against the shared merged graph (one-graph law).
- All graph tools returned `mcp.callTool is not a function` (In 'mcp.callTool("query_graph",...)', 'mcp.callTool' is undefined) — no graph connection found. Treated as INFERRED edges; fall-back to manual structural inspection with file reads as proof.
- Performed blast-radius subgraph analysis manually (depth 3) around candidates by reading import closures.
- Verified each candidate by reading the file (graph is map, file is proof).

Graph tool evidence:
- graphify_query("show all nodes and edges...") => ERROR mcp.callTool undefined
- graphify_explain("god nodes") => ERROR mcp.callTool undefined
- graphify_subgraph(center src depth 3) => ERROR mcp.callTool undefined
- graphify_path(utils -> orchestrator) => ERROR mcp.callTool undefined
=> No EXTRACTED edges available; all predicates flagged [INFERRED] where noted.

Structural overview (manual):
- God-node candidates: types.ts, constants/trading-constants.ts — imported by 12+ modules sampled (brains/9-pillar-lobe, shape-brain, data-harvester, semantic-firewall/index, pipeline/engine, pipeline/runner, clients/tradingview-client, report/report-generator, mdve/reasoning-chain, engine/plutus-tte-pipeline, tvi/veb, vei/wire) — degree far above median.
- Communities: brains (9-pillar, shape, lqz...), clients (6 data clients), pipeline (engine 5-tool chain vs runner 7-gate vs legacy 15-step), mdve (lexicons + temporal + reasoning-chain + mirror), tvi (vkg/vcm/vst/veb/orchestrator), vei, report, semantic-firewall, engines (ladder-scaffold). Too fragmented: two canonical pipelines coexist; legacy community isolated.
- Layering: declared direction utils/constants/types <- clients/brains <- engine/pipeline/mdve <- tools/hooks/report. Violation found: data layer clients imports pipeline.

## FINDING: layer violation — data-layer client imports orchestration-layer pipeline (inverted dependency)
- layer: R28-sro-graph
- predicate: graph-structure.layer-violation
- object: Contract
- file: clients/investinglive-client.ts:27
- evidence: "import { VlmExtractionEngine, type ReconciliationResult } from '../pipeline/vlm-extraction-engine.js';"
- spec: spec/architecture.md:22 data layer must not depend on orchestration layer; dependencies must flow downward (clients <- pipeline forbidden)
- severity: HIGH
- confidence: 0.89

## FINDING: god node — core type and constant modules are single points of failure (degree far above median)
- layer: R28-sro-graph
- predicate: graph-structure.anomaly
- object: Contract
- file: types.ts:32
- evidence: "export enum ShapeCode {"
- spec: spec/architecture.md:30 no god nodes — degree must be within median bounds; central modules must be abstracted via interfaces
- severity: CRITICAL
- confidence: 0.84

## FINDING: architectural anomaly — fragmented pipeline communities and legacy monolith isolated from active chain (contradicts declared single-pipeline direction)
- layer: R28-sro-graph
- predicate: graph-structure.anomaly
- object: Contract
- file: engine/plutus-tte-pipeline.ts:3
- evidence: "// LEGACY v3 PIPELINE — NOT THE ACTIVE CODE PATH."
- spec: spec/architecture.md:14 every module must be reachable from an entry point; legacy 15-step pipeline not reachable from active entry src/index.ts / pipeline/engine.ts 5-tool chain
- severity: MEDIUM
- confidence: 0.81

## FINDING: god node — trading-constants is a second god node (companion to types.ts) with extreme fan-in
- layer: R28-sro-graph
- predicate: graph-structure.anomaly
- object: Contract
- file: constants/trading-constants.ts:15
- evidence: "export const FIB_RATIO_382 = 0.382;"
- spec: spec/architecture.md:30 no god nodes — single source of truth must not become a monolithic dependency hub
- severity: HIGH
- confidence: 0.82

## SUMMARY
4 findings — 1 HIGH layer-violation, 3 anomalies (1 CRITICAL god-node, 1 HIGH god-node, 1 MEDIUM fragmented community).

- Orphan hunt: No module with strict in-degree 0 and out-degree 0 found among sampled src files; every probed file either has incoming (imported by index/pipeline/brains) or outgoing (imports logger/types/constants) edges. Legacy engine/plutus-tte-pipeline.ts is NEAR-orphaned (only legacy consumer) but has 30+ outgoing edges, so not counted as orphan per definition — reclassified as fragmented-community anomaly (finding 3). No standalone shim declared in spec; no generated-file false positives.

- Layer violations: 1 confirmed HIGH (clients/investinglive-client.ts:27 imports pipeline/vlm-extraction-engine.js). Data-layer → orchestration-layer inversion. Blast radius depth 3: clients/investinglive-client ← pipeline/vlm-extraction-engine ← pipeline/* + mdve/* ; change in vlm-extraction-engine breaks OTC option sourcing. No other client imports pipeline (barchart, forex-research, fred, tradingview clean). No low-level utils importing high-level (utils/logger clean).

- Architectural anomalies: 3 confirmed. Two god nodes (types.ts:32, constants/trading-constants.ts:15) each with fan-in ~15-20 sampled importers vs median estimated 2-3; single points of failure — change to ShapeCode or FIB constants triggers full rebuild. Third: fragmented communities — legacy 15-step pipeline (engine/plutus-tte-pipeline.ts:3), active 5-tool chain (pipeline/engine.ts), and 7-gate runner (pipeline/runner.ts) coexist as three pipeline communities. Declared architecture states one pipeline; graph shows three monolithic clusters with no bridging edges (no graph connection found between runner and engine in manual import scan). Community labels (brains, clients, mdve, tvi, report) are otherwise reasonable; violation is pipeline multiplicity, not full monolith.

Graph edge confidence: all edges [INFERRED] due to graph service failure (mcp.callTool undefined) — prefer EXTRACTED but none available. All evidence backed by verbatim file quotes + manual import counts. No orphan predicate fired per strict 0,0 definition; fragmentation covers near-orphan legacy case.
