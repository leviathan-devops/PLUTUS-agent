// src/visual/screenshot-capture.test.ts — the 12-path capture-set math.
// bun test src/visual/screenshot-capture.test.ts
import { describe, expect, test } from "bun:test";
import { capture, capturePath, captureSet } from "./screenshot-capture.ts";
import { createRecordReplayDriver } from "./tv-browser-adapter.ts";

describe("capture-set math (3 pairs x 4 TFs = 12)", () => {
  test("12 paths, pair-major in TF order 4H/1H/30m/15m", () => {
    const set = captureSet();
    expect(set.length).toBe(12);
    expect(set.map((c) => c.path)).toEqual([
      "screenshots/dxy_4h.png", "screenshots/dxy_1h.png", "screenshots/dxy_30m.png", "screenshots/dxy_15m.png",
      "screenshots/eu_4h.png", "screenshots/eu_1h.png", "screenshots/eu_30m.png", "screenshots/eu_15m.png",
      "screenshots/gu_4h.png", "screenshots/gu_1h.png", "screenshots/gu_30m.png", "screenshots/gu_15m.png",
    ]);
  });
  test("no wall-clock in any path (determinism: same call, same string)", () => {
    expect(capturePath("EUR/USD", "1H")).toBe(capturePath("EUR/USD", "1H"));
    expect(capturePath("EUR/USD", "1H")).toBe("screenshots/eu_1h.png");
  });
  test("capture() navigates THEN screenshots (side effects precede the claim)", async () => {
    const driver = createRecordReplayDriver();
    const res = await capture(driver, "EUR/USD", "4H");
    expect(res.path).toBe("screenshots/eu_4h.png");
    expect(driver.script.map((c) => c.tool)).toEqual(["tv_navigate", "tv_screenshot"]);
    expect(driver.script[1]!.args).toEqual({ path: "screenshots/eu_4h.png" });
  });
});

describe("screenshot-capture adversarial", () => {
  test("unknown pair refused (VISUAL_BAD_PAIR)", () => {
    expect(() => capturePath("USD/JPY" as never, "1H")).toThrow("VISUAL_BAD_PAIR");
  });
  test("unknown TF refused (VISUAL_BAD_TF)", () => {
    expect(() => capturePath("DXY", "5m" as never)).toThrow("VISUAL_BAD_TF");
  });
  test("null driver refused (VISUAL_NO_DRIVER)", async () => {
    await expect(capture(null as never, "DXY", "1H")).rejects.toThrow("VISUAL_NO_DRIVER");
  });
  test("navigate failure propagates loudly (VISUAL_NAVIGATE_FAILED)", async () => {
    const driver = createRecordReplayDriver();
    driver.navigate = async () => { throw new Error("socket dead"); };
    await expect(capture(driver, "DXY", "1H")).rejects.toThrow("VISUAL_NAVIGATE_FAILED");
  });
  test("screenshot failure propagates loudly (VISUAL_CAPTURE_FAILED)", async () => {
    const driver = createRecordReplayDriver();
    driver.screenshot = async () => { throw new Error("disk full"); };
    await expect(capture(driver, "DXY", "1H")).rejects.toThrow("VISUAL_CAPTURE_FAILED");
  });
  test("captureSet() returns a fresh array per call (no shared mutation)", () => {
    const a = captureSet();
    a.pop();
    expect(captureSet().length).toBe(12);
  });
});
