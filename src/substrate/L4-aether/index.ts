// src/shadow/index.ts — the shadow barrel
export type { ShadowMemoryEvent, EpochSummary } from './memory';
export { ShadowMemory } from './memory';
export type { Tether, ReattachVerdict } from './sidecar';
export { tetherSession, registerSidecar, touchSidecar, handleSessionSwitch, verifyMemoryReattach } from './sidecar';
export type { ModelRequest, StreamEvent, ModelSeam, BrainResult } from './brain';
export {
  streamWithBrain, BrainBreaker, FakeModel, FROZEN_MODEL_CONFIG,
  STALL_WINDOW_MS, BREAKER_THRESHOLD,
} from './brain';
export {
  SUPREMACY_CONTRACT, SUPREMACY_MARKER, INFERENCE_MARKER, WEAVE_MARKER,
  buildBrief, slotValue, injectSlots, weave, buildContext, silentVerify,
  CHAIN_WINDOW, CHAIN_LAST_N, READ_FILE_CAP, GREP_CAP, PI_ROUNDS_CAP,
  piTools, parseToolCall, formatToolResult, ReadOnlySurfaceError,
} from './tools';
export type { BriefInput, SlotSource, ChainTurn, BuiltContext, VerifyResult, PiTool } from './tools';
export type { ShadowPipelineInput, ShadowPipelineResult, ShadowPipelineDeps } from './runner';
export { runShadowPipeline } from './runner';
