# R22 LASME Adapter — Delegation Integrity Hunt

## METHODOLOGY
Graph-first law enforced: attempted graphify_query for "find delegation function patterns", "show spread operator and Object.assign merge sites", "trace adapter to engine call chains" plus graphify_explain / graphify_subgraph / graphify_path for adapter→engine. All returned `mcp.callTool is not a function` — graph unavailable, no graph connection found. No INFERRED edges used; all evidence EXTRACTED from file reads under targetRoot. Hunted categories (a) delegation parity, (b) loss snapshot merges, (c) stale delegation, (d) unguarded wraps per adapter predicate. Reads covered pipeline/engine.ts, tvi/veb.ts, vei/wire.ts, pipeline/mdve-stage.ts, tvi/vst.ts, tvi/vcm.ts, tvi/vgs.ts, hooks/tool-after, etc. Calibrated against RED_HERRING passthrough and TRUE_DEFECT spread-over-undefined pattern.

Spec ground truth from PLUTUS_TVI_DESIGN_SPEC.md §5.3/§9.2/§10.3 and PLUTUS_V4.4_MDVE_SPEC §8 plus inline spec law comments.

## FINDING: VEB updateContext Object.assign merges partial patch onto full TVIContext without undefined guard — silent data loss
- layer: R22-lasme-adapter
- predicate: adapter.snapshot-merge
- object: Contract
- file: tvi/veb.ts:172
- evidence: "Object.assign(this.ctx, patch);"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:§5.3 VEB context bridge must guard snapshot merge against undefined overwrite — adapter snapshot-merge integrity
- severity: HIGH
- confidence: 0.88

## FINDING: VEI mergedContext spread merge overwrites observed scaffold/anchor with undefined from getPipelineContext — loss of observed scaffold data
- layer: R22-lasme-adapter
- predicate: adapter.snapshot-merge
- object: Contract
- file: vei/wire.ts:158
- evidence: "return { ...observed, ...getPipelineContext() };"
- spec: PLUTUS_TVI_DESIGN_SPEC.md:§10.3 VEI observed context merge must guard against undefined overwrite
- severity: HIGH
- confidence: 0.84

## FINDING: MDVE buildChartModelsFromHarvest wraps engine buildChartModel in catch that logs and continues — adapter claims success without verifying ChartModel side effect landed
- layer: R22-lasme-adapter
- predicate: adapter.unguarded-wrap
- object: Contract
- file: pipeline/mdve-stage.ts:255
- evidence: "logFn(`MDVE model ${pair}: FAILED (non-fatal — emergent lane unaffected): ${e instanceof Error ? e.message : String(e)}`);"
- spec: PLUTUS_V4.4_MDVE_SPEC:§8.0 MDVE stage must not claim success without verifying ChartModel side effect — unguarded wrap violates delegation parity
- severity: MEDIUM
- confidence: 0.81

## SUMMARY
3 findings — 2 HIGH snapshot-merge loss, 1 MEDIUM unguarded wrap. Graph unavailable — no graph connection found; all evidence EXTRACTED verbatim. VEB updateContext does Object.assign(this.ctx, patch) with Partial<TVIContext> — undefined overwrites populated fields (Shot 2). VEI mergedContext spread overwrites observed scaffold with undefined from getPipelineContext — no guard. MDVE per-pair try/catch logs non-fatal and returns partial/empty models while caller reports success — engine throws, adapter swallows, side effect not verified. No stale-delegation phantoms detected; no calib: exemptions.
