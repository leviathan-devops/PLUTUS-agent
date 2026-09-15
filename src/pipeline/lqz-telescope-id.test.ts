import { describe, expect, test } from "bun:test";
import { ANALYSIS_POINT_MS } from "../mdve/temporal.ts";
import { lqzTelescopedIdentity } from "./lqz-telescope-id.ts";

describe("lqz telescoped identity (AP-5 no Date.now)", () => {
  test("two calls with identical inputs produce the same id", () => {
    const a = lqzTelescopedIdentity("DXY", "BUY_SIDE", 0, 0, 101.14);
    const b = lqzTelescopedIdentity("DXY", "BUY_SIDE", 0, 0, 101.14);
    expect(a).toBe(b);
    expect(a.includes(String(ANALYSIS_POINT_MS))).toBe(true);
  });
  test("first_seen > 0 stamps the bar time, not the analysis point", () => {
    const formed = 1782990000000;
    const id = lqzTelescopedIdentity("EUR/USD", "SELL_SIDE", 3, formed, 1.14395);
    expect(id).toBe(`eurusd-lqz-sell_side-3-1.14395-${formed}`);
    expect(id.includes(String(Date.now()))).toBe(false);
  });
});
