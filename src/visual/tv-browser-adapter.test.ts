// src/visual/tv-browser-adapter.test.ts — the adapter seam contract.
// bun test src/visual/tv-browser-adapter.test.ts
import { describe, expect, test } from "bun:test";
import {
  TV_TOOL_NAMES,
  createMcpBridgeDriver,
  createRecordReplayDriver,
} from "./tv-browser-adapter.ts";

describe("tv-browser-adapter seam", () => {
  test("tool names match the runtime surface (tv_navigate/rectangle/trend_line/screenshot)", () => {
    expect(TV_TOOL_NAMES).toEqual({
      navigate: "tv_navigate",
      drawRectangle: "tv_draw_rectangle",
      drawTrendLine: "tv_draw_trend_line",
      screenshot: "tv_screenshot",
    });
  });
  test("bridge driver forwards validated calls to the caller", async () => {
    const seen: Array<{ tool: string; args: Record<string, unknown> }> = [];
    const driver = createMcpBridgeDriver(async (tool, args) => {
      seen.push({ tool, args });
      return { ok: true };
    });
    await driver.navigate({ pair: "DXY", timeframe: "4H" });
    await driver.drawRectangle({ x1: 1, y1: 2, y2: 1, color: "red", label: "MoM zfp:1" });
    await driver.drawTrendLine({ x1: 1, y1: 2, x2: 2, y2: 1, color: "green", label: "Mon LONG" });
    await driver.screenshot({ path: "screenshots/dxy_4h.png" });
    expect(seen.map((s) => s.tool)).toEqual(["tv_navigate", "tv_draw_rectangle", "tv_draw_trend_line", "tv_screenshot"]);
  });
  test("record/replay driver records the script + replays canned values", async () => {
    const driver = createRecordReplayDriver();
    driver.queueReplay([{ shot: 1 }]);
    const out = await driver.screenshot({ path: "screenshots/eu_1h.png" });
    expect(out).toEqual({ shot: 1 });
    expect(driver.script.length).toBe(1);
    expect(driver.script[0]!.tool).toBe("tv_screenshot");
  });
});

describe("tv-browser-adapter adversarial", () => {
  test("bridge without a caller refused at construction (VISUAL_NO_BRIDGE)", () => {
    expect(() => createMcpBridgeDriver(null as never)).toThrow("VISUAL_NO_BRIDGE");
  });
  test("bad pair refused BEFORE any bridge call (no side effect on invalid input)", async () => {
    let called = false;
    const driver = createMcpBridgeDriver(async () => { called = true; return {}; });
    await expect(driver.navigate({ pair: "USD/JPY" as never, timeframe: "1H" })).rejects.toThrow("VISUAL_BAD_PAIR");
    expect(called).toBe(false);
  });
  test("bad rectangle color refused", async () => {
    const driver = createRecordReplayDriver();
    await expect(driver.drawRectangle({ x1: 1, y1: 2, y2: 1, color: "blue" as never, label: "x" })).rejects.toThrow("VISUAL_BAD_TOOL_ARG");
    expect(driver.script.length).toBe(0);
  });
  test("NaN coordinate refused", async () => {
    const driver = createRecordReplayDriver();
    await expect(driver.drawTrendLine({ x1: NaN, y1: 2, x2: 3, y2: 1, color: "red", label: "x" })).rejects.toThrow("VISUAL_BAD_TOOL_ARG");
  });
  test("empty screenshot path refused", async () => {
    const driver = createRecordReplayDriver();
    await expect(driver.screenshot({ path: "" })).rejects.toThrow("VISUAL_BAD_TOOL_ARG");
  });
  test("bridge caller throw becomes a typed VISUAL_* error (never a raw leak)", async () => {
    const driver = createMcpBridgeDriver(async () => { throw new Error("boom"); });
    await expect(driver.screenshot({ path: "screenshots/dxy_4h.png" })).rejects.toThrow("VISUAL_CAPTURE_FAILED");
  });
});
