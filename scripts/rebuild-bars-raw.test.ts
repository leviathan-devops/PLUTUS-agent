import { describe, expect, test } from "bun:test";
import {
  ANALYSIS_POINT_MS,
  WEEK_CLOSE_MS,
  DECISION_BARS_PATH,
  WEEK_BARS_PATH,
  assertClipped,
  assertNoForgedTf,
  buildFeeds,
  outPathForUntil,
} from "./rebuild-bars-raw.ts";
import { decodeMarketData } from "../src/e1/adapters/market-data-adapter.ts";
import { FutureBarLeak } from "../src/runtime/errors.ts";

describe("rebuild-bars-raw shipped ingest", () => {
  test("12 feeds: Vibe 4H + Air 1H clipped to anchor; 30m/15m GAP; no forged LTF", () => {
    const feeds = buildFeeds();
    expect(feeds.length).toBe(12);
    const maxT = Math.max(0, ...feeds.flatMap((f) => f.bars.map((b) => b.timestamp)));
    expect(maxT).toBeLessThanOrEqual(ANALYSIS_POINT_MS);
    expect(maxT).toBe(ANALYSIS_POINT_MS); // 1H bar lands on the analysis point
    for (const f of feeds) {
      if (f.timeframe === "30m" || f.timeframe === "15m") {
        expect(f.bars.length).toBe(0);
        expect(f.error).toContain("NEVER aggregate");
      } else {
        expect(f.error).toBeNull();
        expect(f.bars.length).toBeGreaterThan(100);
        expect(f.bars.every((b) => b.timestamp <= ANALYSIS_POINT_MS)).toBe(true);
      }
    }
    expect(() => assertNoForgedTf(feeds)).not.toThrow();
    expect(() => assertClipped(feeds, ANALYSIS_POINT_MS)).not.toThrow();
  });

  test("week until includes post-anchor 1H for outcome sim; still no forged 30m/15m", () => {
    const feeds = buildFeeds(WEEK_CLOSE_MS);
    const maxT = Math.max(0, ...feeds.flatMap((f) => f.bars.map((b) => b.timestamp)));
    expect(maxT).toBeGreaterThan(ANALYSIS_POINT_MS);
    expect(maxT).toBeLessThanOrEqual(WEEK_CLOSE_MS);
    const h1 = feeds.find((f) => f.pair === "DXY" && f.timeframe === "1H")!;
    expect(h1.bars.some((b) => b.timestamp > ANALYSIS_POINT_MS)).toBe(true);
    expect(() => assertNoForgedTf(feeds)).not.toThrow();
  });

  test("named live path is decision-only; week until cannot overwrite it", () => {
    expect(outPathForUntil(ANALYSIS_POINT_MS)).toBe(DECISION_BARS_PATH);
    expect(outPathForUntil(WEEK_CLOSE_MS)).toBe(WEEK_BARS_PATH);
    expect(() => outPathForUntil(WEEK_CLOSE_MS, DECISION_BARS_PATH)).toThrow(/named decision path/);
  });

  test("decodeMarketData accepts clipped 1H and throws FutureBarLeak on week 1H", () => {
    const decision = buildFeeds(ANALYSIS_POINT_MS);
    const week = buildFeeds(WEEK_CLOSE_MS);
    const d1 = decision.find((f) => f.pair === "DXY" && f.timeframe === "1H")!;
    const w1 = week.find((f) => f.pair === "DXY" && f.timeframe === "1H")!;
    expect(decodeMarketData(d1.bars, ANALYSIS_POINT_MS).length).toBe(d1.bars.length);
    expect(w1.bars.some((b) => b.timestamp > ANALYSIS_POINT_MS)).toBe(true);
    expect(() => decodeMarketData(w1.bars, ANALYSIS_POINT_MS)).toThrow(FutureBarLeak);
  });
});
