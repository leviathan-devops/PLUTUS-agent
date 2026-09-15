// src/kernel/l2-pressure.test.ts — adversarial battery for B.W5-L2 (S-4 B-4/B-5 boundary + freshness).
import { describe, test, expect } from "bun:test";
import type { ZoneModel } from "../e1/core/types";
import { computePressure, FORTRESS_DEFENSE_FLOOR } from "./l2-pressure";
import type { TelescopeVerdict } from "./l1-telescope";

function zone(over: Partial<ZoneModel> & { id: string }): ZoneModel {
  return {
    type: "SUPPLY",
    top: 1.14571,
    bottom: 1.1446,
    classification: "MoM",
    formationMs: 1783076400000,
    originIdx: 0,
    bw: 3.5,
    bf: 0.7,
    prior: "NONE",
    zfp: 0.4,
    tf: "1H",
    ...over,
  };
}

function telescope(): TelescopeVerdict {
  return {
    htfZoneIds: [],
    boMOriginIds: [],
    lqzRungIds: [],
    rungPlacements: [],
    containmentChecks: [],
    rejections: [],
  };
}

const PIP = 0.0001;

describe("l2-pressure happy path", () => {
  test("fortress flips at exactly 4 defenses with zero sweeps", () => {
    expect(FORTRESS_DEFENSE_FLOOR).toBe(4);
    const z = zone({ id: "EU|1H|1|1.1446" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 4, sweeps: 0, broken: false }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.fortressZoneIds).toContain(z.id);
    expect(v.overlay[0]?.state).toBe("FORTRESS");
  });

  test("opposite-type bands sharing a range produce an overlap row", () => {
    const s = zone({ id: "S1", type: "SUPPLY", bottom: 1.144, top: 1.146 });
    const d = zone({ id: "D1", type: "DEMAND", bottom: 1.145, top: 1.147 });
    const v = computePressure({
      entries: [
        { zone: s, defenses: 1, sweeps: 0, broken: false },
        { zone: d, defenses: 1, sweeps: 0, broken: false },
      ],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.overlaps.length).toBe(1);
    expect(v.overlaps[0]?.overlapPips).toBeGreaterThan(0);
  });

  test("PHANTOM_BOM classification is listed without geometry", () => {
    const z = zone({ id: "PH1", classification: "PHANTOM_BOM" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 0, sweeps: 0, broken: false }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.phantomZoneIds).toContain(z.id);
  });
});

describe("l2-pressure adversarial", () => {
  test("empty entries throws loud", () => {
    expect(() => computePressure({ entries: [], rungs: [], telescope: telescope(), pip: PIP })).toThrow(
      "malformed input",
    );
  });

  test("the fortress boundary: 3 defenses is ACTIVE, never FORTRESS", () => {
    const z = zone({ id: "EU|1H|1|1.1446" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 3, sweeps: 0, broken: false }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.fortressZoneIds).not.toContain(z.id);
    expect(v.overlay[0]?.state).toBe("ACTIVE");
  });

  test("4H never dies: sweeps on a 4H zone do not deplete it", () => {
    const z = zone({ id: "EU|4H|1|1.1446", tf: "4H" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 2, sweeps: 3, broken: false }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.depletedZoneIds).not.toContain(z.id);
  });

  test("swept 1H zone depletes (death-scope applies)", () => {
    const z = zone({ id: "EU|1H|1|1.1446", tf: "1H" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 1, sweeps: 1, broken: false }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.depletedZoneIds).toContain(z.id);
  });

  test("contradictory refs: fortress defenses plus broken flag resolve BROKEN first", () => {
    const z = zone({ id: "EU|1H|1|1.1446" });
    const v = computePressure({
      entries: [{ zone: z, defenses: 9, sweeps: 0, broken: true }],
      rungs: [],
      telescope: telescope(),
      pip: PIP,
    });
    expect(v.brokenZoneIds).toContain(z.id);
    expect(v.fortressZoneIds).not.toContain(z.id);
  });

  test("negative defense count throws loud", () => {
    const z = zone({ id: "EU|1H|1|1.1446" });
    expect(() =>
      computePressure({
        entries: [{ zone: z, defenses: -1, sweeps: 0, broken: false }],
        rungs: [],
        telescope: telescope(),
        pip: PIP,
      }),
    ).toThrow("malformed input");
  });

  test("non-positive pip quantum throws loud", () => {
    const z = zone({ id: "EU|1H|1|1.1446" });
    expect(() =>
      computePressure({
        entries: [{ zone: z, defenses: 1, sweeps: 0, broken: false }],
        rungs: [],
        telescope: telescope(),
        pip: -0.0001,
      }),
    ).toThrow("malformed input");
  });
});
