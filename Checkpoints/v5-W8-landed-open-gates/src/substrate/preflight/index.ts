// src/preflight/index.ts — the pre-flight barrel
export type { PipelineInput, ProjectionReport, PipelineStep } from './pipeline';
export { runPipeline, projectStatus, PreflightRejectedError } from './pipeline';
