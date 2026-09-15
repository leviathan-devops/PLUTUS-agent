import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runV5FromBarsRaw, rrFromZones, ANALYSIS_POINT_MS, V5PathError } from "./run-from-bars.ts";
import { FutureBarLeak } from "../runtime/errors.ts";
import { RRR_FLOOR } from "./trade-computer.ts";
import type { ZoneModel } from "../e1/core/types.ts";

const BARS = join("/tmp", "opencode", "bars_raw.json");
const WEEK = join("/tmp", "opencode", "bars_raw.week.json");

describe("V5 kernel generative path on real bars_raw", () => {
  test("kernel computeTrades consumes E1+E2 card; no oracle file; analysis point locked", () => {
    expect(existsSync(BARS)).toBe(true);
    const out = runV5FromBarsRaw(BARS);
    expect(out.analysisPointMs).toBe(ANALYSIS_POINT_MS);
    expect(out.pairs.length).toBe(3);
    for (const p of out.pairs) {
      expect(p.projections.length).toBeGreaterThan(0);
      expect(p.zoneIds.length).toBeGreaterThan(0);
      expect(p.designationId.startsWith("DES|")).toBe(true);
      expect(p.projections[0]!.pair).toBe(p.pair);
      expect(p.projections[0]!.rr).toBeGreaterThanOrEqual(2.5);
      expect(p.projections[0]!.provenance.cardZoneId.length).toBeGreaterThan(0);
    }
  });

  test("missing bars_raw is a loud V5_PATH refusal", () => {
    expect(() => runV5FromBarsRaw(join("/tmp", "no-such-bars_raw.json"))).toThrow(V5PathError);
  });

  test("OBCV-first: DXY and EUR/USD carry lexicon zones, not the envelope range", () => {
    const out = runV5FromBarsRaw(BARS);
    const byPair = new Map(out.pairs.map((p) => [p.pair, p] as const));
    expect(byPair.get("DXY")!.zoneIds.some((id) => !id.includes("|ENV|"))).toBe(true);
    expect(byPair.get("EUR/USD")!.zoneIds.some((id) => !id.includes("|ENV|"))).toBe(true);
  });

  test("GBP/USD may anchor on envelope: 0 pure OBCV oriented pairs on the clipped feed", () => {
    // GBP/USD has no demand.top < supply.bottom among pure OBCV zones, so the
    // mixed fallback keeps an |ENV| supply anchor beside OBCV demands.
    const out = runV5FromBarsRaw(BARS);
    const gu = new Map(out.pairs.map((p) => [p.pair, p] as const)).get("GBP/USD")!;
    expect(gu.zoneIds.length).toBeGreaterThan(0);
    expect(gu.zoneIds.some((id) => id.includes("|ENV|"))).toBe(true);
  });

  test("shipped run locks anchor 1783317600000, 3 pairs, rr >= 2.5", () => {
    const out = runV5FromBarsRaw(BARS);
    expect(out.analysisPointMs).toBe(1783317600000);
    expect(out.pairs.length).toBe(3);
    for (const p of out.pairs) {
      expect(p.projections.length).toBeGreaterThan(0);
      expect(p.projections[0]!.rr).toBeGreaterThanOrEqual(2.5);
    }
  });

  test("post-anchor week feed throws FutureBarLeak via decodeMarketData", () => {
    expect(existsSync(WEEK)).toBe(true);
    expect(() => runV5FromBarsRaw(WEEK)).toThrow(FutureBarLeak);
  });

  test("rrFromZones refuses sub-floor RRR instead of coercing to 3", () => {
    const supply = { type: "SUPPLY", top: 1.1, bottom: 1.09 } as ZoneModel;
    const demand = { type: "DEMAND", top: 1.08, bottom: 1.07 } as ZoneModel;
    expect(() => rrFromZones(supply, demand, 0.0001)).toThrow(V5PathError);
    try {
      rrFromZones(supply, demand, 0.0001);
    } catch (e) {
      expect(String(e)).toContain("refuse, do not coerce");
      expect(String(e)).toContain(String(RRR_FLOOR));
    }
  });
});
