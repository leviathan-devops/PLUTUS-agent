import { describe, expect, test } from "bun:test";
import { classifyRungsByStructure } from "./resting-side.ts";
import type { ZoneModel } from "./types.ts";

function zone(partial: Partial<ZoneModel> & Pick<ZoneModel, "id" | "type" | "top" | "bottom">): ZoneModel {
  return {
    classification: "BoM",
    formationMs: 1,
    originIdx: 0,
    bw: 3,
    bf: 0.7,
    prior: "NONE",
    zfp: 0.5,
    ...partial,
  };
}

describe("classifyRungsByStructure structure law", () => {
  test("conflict: LMV SUPPLY rung inside DEMAND is overwritten to DEMAND (SC-5 load-bearing)", () => {
    const demand = zone({ id: "EUR/USD|1H|1|DEMAND", type: "DEMAND", bottom: 1.14272, top: 1.14434 });
    const lmv = zone({ id: "LMV|EUR/USD|1.14400", type: "SUPPLY", bottom: 1.1439, top: 1.14415 });
    classifyRungsByStructure([demand, lmv]);
    expect(lmv.type).toBe("DEMAND");
  });

  test("agreement: DEMAND LMV inside DEMAND stays DEMAND", () => {
    const demand = zone({ id: "EUR/USD|1H|1|DEMAND", type: "DEMAND", bottom: 1.14, top: 1.142 });
    const lmv = zone({ id: "LMV|EUR/USD|1.14100", type: "DEMAND", bottom: 1.1408, top: 1.1412 });
    classifyRungsByStructure([demand, lmv]);
    expect(lmv.type).toBe("DEMAND");
  });
});
