import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { runV5FromBarsRaw, ANALYSIS_POINT_MS, V5PathError } from "./run-from-bars.ts";

const BARS = join("/tmp", "opencode", "bars_raw.json");

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
});
