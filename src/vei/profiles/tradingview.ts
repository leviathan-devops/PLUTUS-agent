/**
 * VEI v4.4.0 — profiles/tradingview.ts — the GUI profile (spec §5.5 + §9).
 *
 * ALL TradingView-isms are quarantined behind this interface. The core
 * modules (ledger/truth/detectors/guidance/wire) contain zero TV knowledge;
 * a second profile (generic web canvas) registers by implementing GuiProfile.
 */

import type { ViewState } from '../truth.js';
import { parseGetViewResult } from '../truth.js';

export interface GuiProfile {
  name: string;
  matches(tool: string): boolean;                        // tool prefix match
  productiveTools: ReadonlySet<string>;                  // allowlist for PROGRESS_STAGNATION
  navClass: ReadonlySet<string>;                         // pan/zoom/navigate (outcome = view-delta)
  drawClass: ReadonlySet<string>;                        // draw_* (outcome = drawing-delta)
  settleMs(tool: string): number;                        // SEL's per-tool settle table
  parseViewState(result: unknown): ViewState | null;     // tv_get_view result shape
  expectedChange(tool: string): 'view' | 'drawing' | 'screenshot' | 'none';  // outcome polarity
  temporalRecipe(target: { weekStartMs: number; anchorMs: number; label?: string }): string;
  verbTable: Record<string, string>;                     // intent → correct tool+args guidance
}

/** BECAUSE §9: the TradingView MCP tool prefix. Bare `tv_` is also accepted
 *  BECAUSE opencode MCP tool naming can surface either the fully-qualified
 *  `tv-browser_tv_*` form or the bare form depending on server registration —
 *  matching both keeps VEI attached regardless of naming variant. */
const TV_PREFIX = 'tv-browser_tv_';
const TV_PREFIX_BARE = 'tv_';

/** Both naming variants of every TV tool, so ReadonlySet.has() works on the
 *  raw tool name without normalization (detector pseudocode uses .has directly).
 *  Base names carry NO tv_ prefix — both() expands them to the fully-qualified
 *  `tv-browser_tv_*` form and the bare `tv_*` form. */
function both(base: string[]): string[] {
  return base.flatMap((t) => [TV_PREFIX + t, TV_PREFIX_BARE + t]);
}

/** BECAUSE §6.1: nav-class = pan/zoom/navigate/set_timeframe — outcome is the
 *  view-state hash delta. */
const NAV_TOOLS = both([
  'canvas_pan', 'canvas_zoom', 'navigate', 'navigate_to',
  'set_timeframe', 'scroll', 'zoom',
]);

/** BECAUSE §6.1: draw-class = draw_* — outcome is the drawing-list delta. */
const DRAW_TOOLS = both([
  'draw_rectangle', 'draw_trend_line', 'draw_horizontal_line',
  'draw_fib_retracement', 'draw_long_position', 'draw_short_position',
]);

/**
 * BECAUSE §7.1 D7/D8 + Appendix C: productive = drawing verbs (the pipeline's
 * physical output) PLUS canvas_pan. canvas_pan is productive BECAUSE a pan is
 * the correct temporal-navigation verb — V15's healthy flow (get_view, probes,
 * pan, get_view, draws) must yield ZERO findings, while V9 (pure read verbs)
 * must fire PROGRESS_STAGNATION. canvas_pan is ALSO in navClass (its outcome
 * polarity is the view-delta); the two classifications are orthogonal.
 */
const PRODUCTIVE_TOOLS = new Set([...DRAW_TOOLS, ...both(['canvas_pan'])]);

/** §9 temporal model: 1H = 120 bars/week, 4H = 30 bars/week. */
export const BARS_PER_WEEK_1H = 120;
export const BARS_PER_WEEK_4H = 30;

/** BECAUSE §5.5: the recipe targets the week's midpoint — Wednesday noon —
 *  weekStartMs + 2.5 days, so the whole Mon-Fri window lands in frame. */
const WEEK_MIDPOINT_OFFSET_MS = 2.5 * 86_400_000;

export const tradingViewProfile: GuiProfile = {
  name: 'tradingview',

  matches(tool: string): boolean {
    return tool.startsWith(TV_PREFIX) || tool.startsWith(TV_PREFIX_BARE);
  },

  productiveTools: PRODUCTIVE_TOOLS,
  navClass: new Set(NAV_TOOLS),
  drawClass: new Set(DRAW_TOOLS),

  /**
   * Appendix A.4 (enforceAction.js L470-476, verbatim). BECAUSE (SEL):
   * verification reads taken before the repaint settles are the #1 cause of
   * false "no change" readings.
   */
  settleMs(tool: string): number {
    if (tool.includes('navigate') || tool.includes('switch')) return 2000;
    if (tool.includes('draw')) return 1000;
    if (tool.includes('replay')) return 1000;
    if (tool.includes('click') || tool.includes('type')) return 300;
    return 200;
  },

  parseViewState: parseGetViewResult,

  /** §6.1 polarity table. read-class and click/key-class → 'none' (honest
   *  'unknown' — no cheap oracle; never a finding from outcome alone). */
  expectedChange(tool: string): 'view' | 'drawing' | 'screenshot' | 'none' {
    if ((tradingViewProfile.navClass as ReadonlySet<string>).has(tool)) return 'view';
    if ((tradingViewProfile.drawClass as ReadonlySet<string>).has(tool)) return 'drawing';
    if (tool.includes('screenshot')) return 'screenshot';
    return 'none';
  },

  /** §5.5: the exact pan recipe. 1H = 120 bars/week, 4H = 30 (§9) — the
   *  bars:-60 fallback on 1H pans half a week, landing the window mid-frame. */
  temporalRecipe(target: { weekStartMs: number; anchorMs: number; label?: string }): string {
    const mid = Math.round(target.weekStartMs + WEEK_MIDPOINT_OFFSET_MS);
    const label = target.label ?? 'the target week';
    return `canvas_pan({time: ${mid}}) — or canvas_pan({bars: -60}) on 1H — then get_view: ${label} must fill the frame.`;
  },

  /** §5.5 + §6.4: intent → correct verb. */
  verbTable: {
    temporal_navigation:
      'canvas_pan({time} or {bars}) — NEVER zoom: zoom changes scale only, it cannot travel through time',
    fine_positioning: 'canvas_pan({bars: ±N}) — small bar-count pans, then get_view to confirm',
    price_to_pixel:
      'the affine cache first (already calibrated this view); find_price_y ONLY to calibrate (2 samples) or after a pan/zoom invalidates the cache',
    verify_drawing: 'list_drawings — NOT another screenshot: the drawing list is the cheap ground truth',
    tool_failure:
      'change ONE variable (args, then tool), never retry identical args; if the alternative fails once, STOP and report the blocker',
  },
};
