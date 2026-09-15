// src/visual/chart-drawer.ts — B.W3.5.1 the drawing sequence (spec lines 1088-1099).
// PURE script generation: snapshot + designations in, DrawCall[] out. No MCP,
// no wall-clock, no browser. The unit tests assert on the SCRIPT, not the TV.
//
// Per zone: tv_draw_rectangle { x1: formationMs, y1: top, y2: bottom,
//   color: SUPPLY=red / DEMAND=green, label: "<classification> <pressure> zfp:<zfp>" }.
// Per designation: tv_draw_trend_line, the direction arrow anchored at the
// designated zone (SHORT starts at the top edge and points down into the zone;
// LONG starts at the bottom edge and points up). When the designation carries
// an explicit projectedOpen (ms + price), the line starts there instead — the
// "from the open to the designated zone" form from the spec.

import type { ZoneModel } from "../e1/core/types.ts";
import type { TvTimeframe } from "./tv-browser-adapter.ts";
import type { TvRectangleArgs, TvTrendLineArgs } from "./tv-browser-adapter.ts";

export type VisualDirection = "LONG" | "SHORT";

export interface VisualDesignation {
  readonly day: string;
  readonly pair: string;
  readonly direction: VisualDirection;
  /** The designated zone's id — MUST exist in the snapshot (C.1: E2 fits within E1). */
  readonly anchorZoneId: string;
  readonly projectedOpenMs?: number;
  readonly projectedOpenPrice?: number;
}

export type DrawCall =
  | { readonly tool: "tv_draw_rectangle"; readonly args: TvRectangleArgs }
  | { readonly tool: "tv_draw_trend_line"; readonly args: TvTrendLineArgs };

export interface ZoneSnapshotInput {
  readonly zones: readonly ZoneModel[];
}

export class ChartDrawerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(`[${code}] ${message}`);
    this.name = "ChartDrawerError";
    this.code = code;
  }
}

/** One TF slot in ms — the rectangle's right edge (x2) and the trend-line span. */
export const TF_SLOT_MS: Record<TvTimeframe, number> = {
  "4H": 4 * 3_600_000,
  "1H": 3_600_000,
  "30m": 1_800_000,
  "15m": 900_000,
};

const TF_KEYS: readonly string[] = ["4H", "1H", "30m", "15m"];

function checkZone(z: ZoneModel, i: number): void {
  if (z === null || typeof z !== "object") {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone[${i}] must be an object`);
  }
  if (typeof z.id !== "string" || z.id.length === 0) {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone[${i}] has no id`);
  }
  if (typeof z.top !== "number" || !Number.isFinite(z.top) || typeof z.bottom !== "number" || !Number.isFinite(z.bottom)) {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone ${z.id} has non-finite top/bottom`);
  }
  if (z.top < z.bottom) {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone ${z.id} inverted: top ${z.top} < bottom ${z.bottom}`);
  }
  if (typeof z.formationMs !== "number" || !Number.isFinite(z.formationMs)) {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone ${z.id} has non-finite formationMs`);
  }
  if (z.type !== "SUPPLY" && z.type !== "DEMAND") {
    throw new ChartDrawerError("VISUAL_BAD_ZONE", `zone ${z.id} has unknown type ${String(z.type)}`);
  }
}

function zoneLabel(z: ZoneModel): string {
  const mid = z.pressure !== undefined && z.pressure !== null ? ` ${String(z.pressure)}` : "";
  return `${z.classification}${mid} zfp:${z.zfp}`;
}

function checkDesignation(d: VisualDesignation, i: number): void {
  if (d === null || typeof d !== "object") {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", `designation[${i}] must be an object`);
  }
  if (typeof d.anchorZoneId !== "string" || d.anchorZoneId.length === 0) {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", `designation[${i}] has no anchorZoneId`);
  }
  if (d.direction !== "LONG" && d.direction !== "SHORT") {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", `designation[${i}] has unknown direction ${String(d.direction)}`);
  }
  if (d.projectedOpenMs !== undefined && (typeof d.projectedOpenMs !== "number" || !Number.isFinite(d.projectedOpenMs))) {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", `designation[${i}] has non-finite projectedOpenMs`);
  }
  if (d.projectedOpenPrice !== undefined && (typeof d.projectedOpenPrice !== "number" || !Number.isFinite(d.projectedOpenPrice))) {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", `designation[${i}] has non-finite projectedOpenPrice`);
  }
}

/**
 * Build the TV drawing script for one pair+TF chart.
 * Error paths FIRST: bad snapshot, bad zone, bad designation, unknown anchor.
 */
export function drawChart(
  snapshot: ZoneSnapshotInput,
  designations: readonly VisualDesignation[],
  tf: TvTimeframe,
): DrawCall[] {
  if (snapshot === null || typeof snapshot !== "object" || !Array.isArray(snapshot.zones)) {
    throw new ChartDrawerError("VISUAL_BAD_SNAPSHOT", "snapshot must carry a zones array");
  }
  if (!Array.isArray(designations)) {
    throw new ChartDrawerError("VISUAL_BAD_DESIGNATION", "designations must be an array");
  }
  if (!TF_KEYS.includes(tf)) {
    throw new ChartDrawerError("VISUAL_BAD_TF", `unknown timeframe: ${String(tf)}`);
  }
  const slot = TF_SLOT_MS[tf];
  const calls: DrawCall[] = [];
  const byId = new Map<string, ZoneModel>();

  snapshot.zones.forEach((z, i) => {
    checkZone(z, i);
    byId.set(z.id, z);
    calls.push({
      tool: "tv_draw_rectangle",
      args: {
        x1: z.formationMs,
        x2: z.formationMs + slot,
        y1: z.top,
        y2: z.bottom,
        color: z.type === "SUPPLY" ? "red" : "green",
        label: zoneLabel(z),
      },
    });
  });

  designations.forEach((d, i) => {
    checkDesignation(d, i);
    const anchor = byId.get(d.anchorZoneId);
    if (!anchor) {
      throw new ChartDrawerError(
        "VISUAL_UNKNOWN_ZONE",
        `designation[${i}] anchor ${d.anchorZoneId} traces to no zone in the snapshot (E3_DISOBEYED_E2 class)`,
      );
    }
    const startEdge = d.direction === "SHORT" ? anchor.top : anchor.bottom;
    const endEdge = d.direction === "SHORT" ? anchor.bottom : anchor.top;
    const x1 = d.projectedOpenMs ?? anchor.formationMs;
    const y1 = d.projectedOpenPrice ?? startEdge;
    calls.push({
      tool: "tv_draw_trend_line",
      args: {
        x1,
        y1,
        x2: anchor.formationMs + slot,
        y2: endEdge,
        color: d.direction === "SHORT" ? "red" : "green",
        label: `${d.day} ${d.direction}`,
      },
    });
  });

  return calls;
}
