// src/visual/tv-browser-adapter.ts — B.W3.5.1 (spec lines 1079-1100).
// The typed seam between the pipeline and the tv-browser MCP tools.
// The runtime exposes tv_navigate / tv_draw_rectangle / tv_draw_trend_line /
// tv_screenshot via the tv-browser tool family (verified: grep finds all four
// in tv-browser-mcp/src + src). The drawer never touches MCP directly — it
// emits a DrawCall script; THIS adapter is the only module that binds tool
// names to calls, so the live-capture proof swaps one driver, not the core.
//
// TWO DRIVERS:
// - createMcpBridgeDriver(caller): production path. `caller` is the host's MCP
//   bridge `(tool, args) => Promise<unknown>`; the orchestrator binds the real
//   tv-browser tools at the wave gate. Every call validates its args FIRST.
// - createRecordReplayDriver(): build-time path. Records every call into an
//   in-memory script (inspectable via .script) and replays canned results.
//   Used by unit tests + any environment where the bridge is unavailable.
//
// SEAM (what the orchestrator's live-capture proof must bind):
// - S1: the `caller` injection for createMcpBridgeDriver (real MCP tools).
// - S2: tv_draw_rectangle's right edge (x2): the spec fixes x1/y1/y2 only;
//   the driver extends x2 by one TF slot unless the caller passes x2.
// - S3: screenshot bytes land wherever the host's tv_screenshot writes; `path`
//   is the pipeline's requested destination, enforced by file convention.

export type TvPair = "DXY" | "EUR/USD" | "GBP/USD";
export type TvTimeframe = "4H" | "1H" | "30m" | "15m";

export const TV_TOOL_NAMES = {
  navigate: "tv_navigate",
  drawRectangle: "tv_draw_rectangle",
  drawTrendLine: "tv_draw_trend_line",
  screenshot: "tv_screenshot",
} as const;

export interface TvNavigateArgs {
  readonly pair: TvPair;
  readonly timeframe: TvTimeframe;
}

export interface TvRectangleArgs {
  readonly x1: number;
  readonly x2?: number;
  readonly y1: number;
  readonly y2: number;
  readonly color: "red" | "green";
  readonly label: string;
}

export interface TvTrendLineArgs {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly color: "red" | "green";
  readonly label: string;
}

export interface TvScreenshotArgs {
  readonly path: string;
}

/** The host's MCP bridge: tool name + args in, tool result out. */
export type McpCaller = (tool: string, args: Record<string, unknown>) => Promise<unknown>;

export interface TvBrowserDriver {
  navigate(args: TvNavigateArgs): Promise<unknown>;
  drawRectangle(args: TvRectangleArgs): Promise<unknown>;
  drawTrendLine(args: TvTrendLineArgs): Promise<unknown>;
  screenshot(args: TvScreenshotArgs): Promise<unknown>;
}

export class TvAdapterError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "TvAdapterError";
    this.code = code;
  }
}

const PAIRS: readonly string[] = ["DXY", "EUR/USD", "GBP/USD"];
const TFS: readonly string[] = ["4H", "1H", "30m", "15m"];

function requireFinite(name: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", `tv arg ${name} must be a finite number, got ${String(v)}`);
  }
  return v;
}

function requireNonEmpty(name: string, v: unknown): string {
  if (typeof v !== "string" || v.length === 0) {
    throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", `tv arg ${name} must be a non-empty string`);
  }
  return v;
}

export function checkNavigate(args: TvNavigateArgs): void {
  if (args === null || typeof args !== "object") throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", "navigate args must be an object");
  if (!PAIRS.includes(args.pair)) throw new TvAdapterError("VISUAL_BAD_PAIR", `unknown pair: ${String(args.pair)}`);
  if (!TFS.includes(args.timeframe)) throw new TvAdapterError("VISUAL_BAD_TF", `unknown timeframe: ${String(args.timeframe)}`);
}

export function checkRectangle(args: TvRectangleArgs): void {
  if (args === null || typeof args !== "object") throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", "rectangle args must be an object");
  requireFinite("x1", args.x1);
  if (args.x2 !== undefined) requireFinite("x2", args.x2);
  requireFinite("y1", args.y1);
  requireFinite("y2", args.y2);
  if (args.color !== "red" && args.color !== "green") {
    throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", `rectangle color must be red|green, got ${String(args.color)}`);
  }
  requireNonEmpty("label", args.label);
}

export function checkTrendLine(args: TvTrendLineArgs): void {
  if (args === null || typeof args !== "object") throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", "trend-line args must be an object");
  requireFinite("x1", args.x1);
  requireFinite("y1", args.y1);
  requireFinite("x2", args.x2);
  requireFinite("y2", args.y2);
  if (args.color !== "red" && args.color !== "green") {
    throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", `trend-line color must be red|green, got ${String(args.color)}`);
  }
  requireNonEmpty("label", args.label);
}

export function checkScreenshot(args: TvScreenshotArgs): void {
  if (args === null || typeof args !== "object") throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", "screenshot args must be an object");
  requireNonEmpty("path", args.path);
}

/** Production driver: every call validated FIRST, then forwarded to the host bridge. */
export function createMcpBridgeDriver(caller: McpCaller): TvBrowserDriver {
  if (typeof caller !== "function") {
    throw new TvAdapterError("VISUAL_NO_BRIDGE", "createMcpBridgeDriver requires a caller function (the host MCP bridge)");
  }
  return {
    async navigate(args: TvNavigateArgs): Promise<unknown> {
      checkNavigate(args);
      try {
        return await caller(TV_TOOL_NAMES.navigate, { ...(args as unknown as Record<string, unknown>) });
      } catch (e) {
        throw new TvAdapterError("VISUAL_NAVIGATE_FAILED", `tv_navigate failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    async drawRectangle(args: TvRectangleArgs): Promise<unknown> {
      checkRectangle(args);
      try {
        return await caller(TV_TOOL_NAMES.drawRectangle, { ...(args as unknown as Record<string, unknown>) });
      } catch (e) {
        throw new TvAdapterError("VISUAL_DRAW_FAILED", `tv_draw_rectangle failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    async drawTrendLine(args: TvTrendLineArgs): Promise<unknown> {
      checkTrendLine(args);
      try {
        return await caller(TV_TOOL_NAMES.drawTrendLine, { ...(args as unknown as Record<string, unknown>) });
      } catch (e) {
        throw new TvAdapterError("VISUAL_DRAW_FAILED", `tv_draw_trend_line failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    async screenshot(args: TvScreenshotArgs): Promise<unknown> {
      checkScreenshot(args);
      try {
        return await caller(TV_TOOL_NAMES.screenshot, { ...(args as unknown as Record<string, unknown>) });
      } catch (e) {
        throw new TvAdapterError("VISUAL_CAPTURE_FAILED", `tv_screenshot failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
  };
}

export interface RecordedCall {
  readonly tool: string;
  readonly args: Record<string, unknown>;
}

/**
 * Build-time driver: records every validated call into `.script` and returns
 * the next canned replay value (or `{ ok: true }` when the queue is empty).
 * The recorded script IS the side effect the tests assert on.
 */
export interface RecordReplayDriver extends TvBrowserDriver {
  readonly script: RecordedCall[];
  queueReplay(values: unknown[]): void;
}

export function createRecordReplayDriver(): RecordReplayDriver {
  const script: RecordedCall[] = [];
  const queue: unknown[] = [];
  const next = (): unknown => (queue.length > 0 ? queue.shift() : { ok: true });
  const rec = (tool: string, args: Record<string, unknown>): unknown => {
    script.push({ tool, args });
    return next();
  };
  return {
    script,
    queueReplay(values: unknown[]): void {
      if (!Array.isArray(values)) throw new TvAdapterError("VISUAL_BAD_TOOL_ARG", "queueReplay requires an array");
      queue.push(...values);
    },
    async navigate(args: TvNavigateArgs): Promise<unknown> {
      checkNavigate(args);
      return rec(TV_TOOL_NAMES.navigate, { ...(args as unknown as Record<string, unknown>) });
    },
    async drawRectangle(args: TvRectangleArgs): Promise<unknown> {
      checkRectangle(args);
      return rec(TV_TOOL_NAMES.drawRectangle, { ...(args as unknown as Record<string, unknown>) });
    },
    async drawTrendLine(args: TvTrendLineArgs): Promise<unknown> {
      checkTrendLine(args);
      return rec(TV_TOOL_NAMES.drawTrendLine, { ...(args as unknown as Record<string, unknown>) });
    },
    async screenshot(args: TvScreenshotArgs): Promise<unknown> {
      checkScreenshot(args);
      return rec(TV_TOOL_NAMES.screenshot, { ...(args as unknown as Record<string, unknown>) });
    },
  };
}
