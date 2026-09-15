// src/visual/chart-drawer.test.ts — the drawer script test (3-zone case).
// bun test src/visual/chart-drawer.test.ts
import { describe, expect, test } from "bun:test";
import { drawChart } from "./chart-drawer.ts";
import type { ZoneModel } from "../e1/core/types.ts";

function zone(o: Partial<ZoneModel> & { id: string }): ZoneModel {
  return {
    type: "SUPPLY",
    top: 1.14571,
    bottom: 1.1446,
    classification: "MoM",
    formationMs: 1_783_076_400_000,
    originIdx: 7,
    bw: 3.2,
    bf: 0.7,
    prior: "NONE",
    zfp: 22,
    ...o,
  } as ZoneModel;
}

describe("drawChart 3-zone script (spec B.W3.5.1 verbatim)", () => {
  test("3 zones -> 3 rectangles with the right colors/labels/co-ords", () => {
    const snap = {
      zones: [
        zone({ id: "s1", type: "SUPPLY", top: 1.14571, bottom: 1.1446, classification: "MoM", pressure: "ACTIVE-1", zfp: 22 }),
        zone({ id: "d1", type: "DEMAND", top: 1.1412, bottom: 1.141, classification: "BoM", zfp: 0.8 }),
        zone({ id: "d2", type: "DEMAND", top: 1.14004, bottom: 1.1397, classification: "MoM", pressure: "VIRGIN", zfp: 0.5 }),
      ],
    };
    const out = drawChart(snap, [], "1H");
    expect(out.length).toBe(3);
    const r0 = out[0]!;
    expect(r0.tool).toBe("tv_draw_rectangle");
    if (r0.tool !== "tv_draw_rectangle") throw new Error("unreachable");
    expect(r0.args.color).toBe("red");
    expect(r0.args.x1).toBe(1_783_076_400_000);
    expect(r0.args.x2).toBe(1_783_076_400_000 + 3_600_000);
    expect(r0.args.y1).toBe(1.14571);
    expect(r0.args.y2).toBe(1.1446);
    expect(r0.args.label).toBe("MoM ACTIVE-1 zfp:22");
    const r1 = out[1]!;
    if (r1.tool !== "tv_draw_rectangle") throw new Error("unreachable");
    expect(r1.args.color).toBe("green");
    expect(r1.args.label).toBe("BoM zfp:0.8");
  });

  test("designation emits the direction trend line anchored at the zone", () => {
    const snap = { zones: [zone({ id: "s1", top: 1.14571, bottom: 1.1446 })] };
    const out = drawChart(
      snap,
      [{ day: "Tuesday", pair: "EUR/USD", direction: "SHORT", anchorZoneId: "s1" }],
      "1H",
    );
    expect(out.length).toBe(2);
    const line = out[1]!;
    expect(line.tool).toBe("tv_draw_trend_line");
    if (line.tool !== "tv_draw_trend_line") throw new Error("unreachable");
    expect(line.args.y1).toBe(1.14571);
    expect(line.args.y2).toBe(1.1446);
    expect(line.args.color).toBe("red");
    expect(line.args.label).toBe("Tuesday SHORT");
  });

  test("projectedOpen form starts the line at the open (spec: open -> zone)", () => {
    const snap = { zones: [zone({ id: "d1", type: "DEMAND", top: 1.1412, bottom: 1.141 })] };
    const out = drawChart(
      snap,
      [{ day: "Monday", pair: "EUR/USD", direction: "LONG", anchorZoneId: "d1", projectedOpenMs: 1_783_080_000_000, projectedOpenPrice: 1.14395 }],
      "1H",
    );
    const line = out[1]!;
    if (line.tool !== "tv_draw_trend_line") throw new Error("unreachable");
    expect(line.args.x1).toBe(1_783_080_000_000);
    expect(line.args.y1).toBe(1.14395);
    expect(line.args.y2).toBe(1.1412);
    expect(line.args.color).toBe("green");
  });
});

describe("chart-drawer adversarial (error paths FIRST)", () => {
  const good = { zones: [zone({ id: "s1" })] };
  test("null snapshot refused (VISUAL_BAD_SNAPSHOT)", () => {
    expect(() => drawChart(null as never, [], "1H")).toThrow("VISUAL_BAD_SNAPSHOT");
  });
  test("empty zones -> empty script (no zones drawn, no crash)", () => {
    expect(drawChart({ zones: [] }, [], "4H")).toEqual([]);
  });
  test("inverted zone (top < bottom) refused, never silently swapped", () => {
    expect(() => drawChart({ zones: [zone({ id: "bad", top: 1.0, bottom: 2.0 })] }, [], "1H")).toThrow("VISUAL_BAD_ZONE");
  });
  test("NaN formationMs refused", () => {
    expect(() => drawChart({ zones: [zone({ id: "nan", formationMs: NaN })] }, [], "1H")).toThrow("VISUAL_BAD_ZONE");
  });
  test("unknown anchor zone refused (E3_DISOBEYED_E2 class)", () => {
    expect(() =>
      drawChart(good, [{ day: "Tuesday", pair: "EUR/USD", direction: "SHORT", anchorZoneId: "ghost" }], "1H"),
    ).toThrow("VISUAL_UNKNOWN_ZONE");
  });
  test("bad direction refused", () => {
    expect(() =>
      drawChart(good, [{ day: "Tuesday", pair: "EUR/USD", direction: "SIDEWAYS" as never, anchorZoneId: "s1" }], "1H"),
    ).toThrow("VISUAL_BAD_DESIGNATION");
  });
  test("bad TF refused", () => {
    expect(() => drawChart(good, [], "5m" as never)).toThrow("VISUAL_BAD_TF");
  });
  test("concurrent draws are independent (no shared mutable script)", () => {
    const a = drawChart(good, [], "1H");
    const b = drawChart({ zones: [] }, [], "1H");
    expect(a.length).toBe(1);
    expect(b.length).toBe(0);
  });
});
