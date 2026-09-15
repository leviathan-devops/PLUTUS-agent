// src/visual/index.ts — the W3.5 visual pipeline surface (feeds the Aether
// Chart Verifier sibling + W4 visuals.charts[]).
export {
  TV_TOOL_NAMES,
  checkNavigate,
  checkRectangle,
  checkTrendLine,
  checkScreenshot,
  createMcpBridgeDriver,
  createRecordReplayDriver,
  TvAdapterError,
} from "./tv-browser-adapter.ts";
export type {
  McpCaller,
  RecordedCall,
  RecordReplayDriver,
  TvBrowserDriver,
  TvNavigateArgs,
  TvPair,
  TvRectangleArgs,
  TvScreenshotArgs,
  TvTimeframe,
  TvTrendLineArgs,
} from "./tv-browser-adapter.ts";
export { TF_SLOT_MS, drawChart, ChartDrawerError } from "./chart-drawer.ts";
export type { DrawCall, VisualDesignation, VisualDirection, ZoneSnapshotInput } from "./chart-drawer.ts";
export { CAPTURE_PAIRS, CAPTURE_TFS, capture, capturePath, captureSet, CaptureError } from "./screenshot-capture.ts";
export type { CapturedChart, CaptureResult } from "./screenshot-capture.ts";
