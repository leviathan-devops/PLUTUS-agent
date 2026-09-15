# Plutus Agent Dead-Code Audit — R30 SRO

Methodology: Graph tools queried first per one-graph law (graphify_query for in-degree 0 nodes, functions not in call chain, modules with no consumers; graphify_subgraph depth 3; graphify_explain). All graph calls returned `mcp.callTool is not a function` (INFERRED fallback). Fallback to two-leg verification via file-system measurement: enumerated exports via read_file on targetRoot (`/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/Plutus_Agent/src`) and proxy enumeration via Ship_Packages mirror (space-free path) filtered to Plutus_Agent, confirmed each candidate via grep for importer/caller (`import {symbol}`, `from '.../symbol'`, namespace `* as`) and graph in-degree inference (no incoming edge observed in manual import graph). Only symbols with zero evidence on both legs reported.

Checks performed:
- Exported symbols (functions, classes, consts, interfaces) across ~117 modules (manifest §11: pipeline engine, engine3, brains, tvi 106-node VKG, vei, hooks, agents, utils).
- Functions with no callers (grep `symbol(` outside defining file).
- Modules with no consumers (no incoming `import ... from` and not entry point `src/index.ts`).

Blast-radius subgraph depth 3 attempted around each candidate (graph unavailable — marked [INFERRED] and verified via manual import fan-in via read of dependents).

## FINDING: exported symbol `nodesById` with no importers — dead code
- layer: R30-sro-dead-code
- predicate: dead-code.export
- object: Contract
- file: tvi/vkg/nodes.ts:26
- evidence: "export const nodesById: Map<string, VKGNode> = new Map(vkgNodes.map((n) => [n.id, n])); // grep nodesById returns only definition, no import"
- spec: spec/dead-code.md:8 exported symbols must have at least one importer
- severity: MEDIUM
- confidence: 0.90

## FINDING: exported factory `createVGS` with no callers/importers — dead code
- layer: R30-sro-dead-code
- predicate: dead-code.export
- object: Contract
- file: tvi/vgs.ts:285
- evidence: "export function createVGS(): VisualGuidanceSystem { // grep createVGS returns only definition, index.ts uses new VisualGuidanceSystem() directly"
- spec: spec/dead-code.md:8 exported symbols must have at least one importer
- severity: LOW
- confidence: 0.88

## FINDING: exported factory `createTVIOrchestrator` with no callers/importers — dead code
- layer: R30-sro-dead-code
- predicate: dead-code.export
- object: Contract
- file: tvi/orchestrator.ts:55
- evidence: "export function createTVIOrchestrator(): TVIOrchestrator { // grep createTVIOrchestrator returns only definition, index.ts uses new TVIOrchestrator() directly"
- spec: spec/dead-code.md:8 exported symbols must have at least one importer
- severity: LOW
- confidence: 0.88

## SUMMARY
3 findings — 1 MEDIUM, 2 LOW. Measured via two-leg verification (graph attempted + grep confirmation). Graph unavailable `[INFERRED]` (mcp.callTool undefined) — manual import graph traversed via read_file + grep. All other exports checked (Logger, isPlutusAgent, createSystemTransformHook, createToolBeforeHook, createToolAfterHook, getAgentConfigs, vkgNodes, VisualStateTracker, DEFAULT_VST_DB_PATH, VisualContextMatcher/createVCM, createVeiHooks, TVIOrchestrator class, VEI/TVI zip/veb/vst etc.) have live importers (index.ts, hooks, pipeline engine). No modules with zero consumers beyond these factories; no functions with zero callers beyond the factories. Blast radius: isolated TVI factories — no downstream consumers, no god-node involvement, removal safe. Recommend deleting or wiring factories to enforce single-construction path.
