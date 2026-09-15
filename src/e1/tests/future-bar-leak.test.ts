// FUTURE_BAR_LEAK — drives the SHIPPED MarketDataAdapter (decodeMarketData),
// not the helpers.ts contract double. bun test src/e1/tests/future-bar-leak.test.ts
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { decodeMarketData } from "../adapters/market-data-adapter.ts";
import { FutureBarLeak } from "../../runtime/errors.ts";

const ANCHOR = 1_783_317_600_000; // 2026-07-06T06:00:00Z ANALYSIS_POINT_MS
const BARS_RAW = ["/tmp", "opencode", "bars_raw.json"].join("/");

const bar = (t: number) => ({ t, O: 1.14, H: 1.141, L: 1.139, C: 1.1405 });

describe("FUTURE_BAR_LEAK shipped decodeMarketData", () => {
  test("M1 FIRES: a single post-anchor bar throws FUTURE_BAR_LEAK", () => {
    const bars = [bar(ANCHOR - 3_600_000), bar(ANCHOR - 1000), bar(ANCHOR + 3_600_000)];
    let err: unknown = null;
    try {
      decodeMarketData(bars, ANCHOR);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(FutureBarLeak);
    expect((err as FutureBarLeak)._tag).toBe("FUTURE_BAR_LEAK");
    expect((err as Error).message).toContain("FUTURE_BAR_LEAK");
  });

  test("M2 PASSES: t === anchorMs is kept (boundary <=, not <)", () => {
    const out = decodeMarketData([bar(ANCHOR - 3_600_000), bar(ANCHOR)], ANCHOR);
    expect(out.length).toBe(2);
    expect(out[1]!.t).toBe(ANCHOR);
  });

  test("M3 FIRES: a bar 1ms past the anchor throws (no epsilon)", () => {
    expect(() => decodeMarketData([bar(ANCHOR - 1000), bar(ANCHOR + 1)], ANCHOR)).toThrow(FutureBarLeak);
  });
});

describe("rebuilt bars_raw.json slice through shipped adapter", () => {
  test("clipped real feed loads without leak; grafting a future bar throws", () => {
    const raw = JSON.parse(readFileSync(BARS_RAW, "utf8")) as Array<{
      pair: string;
      timeframe: string;
      bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number }>;
    }>;
    const dxy4 = raw.find((f) => f.pair === "DXY" && f.timeframe === "4H");
    expect(dxy4).toBeTruthy();
    expect(dxy4!.bars.length).toBeGreaterThan(100);
    const maxT = Math.max(...dxy4!.bars.map((b) => b.timestamp));
    expect(maxT).toBeLessThanOrEqual(ANCHOR);
    const decoded = decodeMarketData(dxy4!.bars, ANCHOR);
    expect(decoded.length).toBe(dxy4!.bars.length);

    const mutant = [
      ...dxy4!.bars.slice(-3),
      { timestamp: ANCHOR + 1, open: 100, high: 100.1, low: 99.9, close: 100.05 },
    ];
    expect(() => decodeMarketData(mutant, ANCHOR)).toThrow(FutureBarLeak);
  });
});
