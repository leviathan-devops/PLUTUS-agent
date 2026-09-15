import { describe, expect, test } from "bun:test";
import { step } from "../../substrate/L3-lasme/index.ts";
import { ev } from "../machines/types.ts";
import {
  designateEvent,
  designationMachine,
  freshDesignation,
  type DesignationEmission,
} from "../machines/designation-machine.ts";
import { DAYS, DIRECTIONS, PAIRS, buildSnapshot, designatePair, loadGoldenWeek } from "./support";

describe("designation totality — 30 pairs / 60 zone IDs, zero INCOMPLETE", () => {
  const gw = loadGoldenWeek();

  test("golden week yields exactly 30 designation pairs, all DESIGNATED", () => {
    let count = 0;
    for (const day of DAYS)
      for (const pair of PAIRS)
        for (const direction of DIRECTIONS) {
          const { record } = designatePair(pair, day, direction, gw);
          expect(record.state).toBe("DESIGNATED");
          count += 1;
        }
    expect(count).toBe(30);
  });

  test("60 zone IDs exact equality, zero INCOMPLETE", () => {
    const ids = new Set<string>();
    let incomplete = 0;
    for (const day of DAYS)
      for (const pair of PAIRS)
        for (const direction of DIRECTIONS) {
          const snap = buildSnapshot(pair, day, gw, direction);
          const emission: DesignationEmission = {
            supplyZoneId: snap.zones[0].id,
            demandZoneId: snap.zones[1].id,
            keyZoneType: direction === "LONG" ? "DEMAND" : "SUPPLY",
            deepDemandZoneId: snap.zones[2].id,
          };
          const out = step(
            designationMachine,
            freshDesignation(day, pair),
            designateEvent(emission, snap.zones, snap.projectedOpen),
          );
          if (out.kind === "TRANSITIONED" && out.record.emission !== null) {
            ids.add(out.record.emission.supplyZoneId);
            ids.add(out.record.emission.demandZoneId);
          } else {
            incomplete += 1;
          }
        }
    expect(incomplete).toBe(0);
    expect(ids.size).toBe(60);
  });

  test("emissions carry NO price field (type-enforced SC-7)", () => {
    const { record } = designatePair("EUR/USD", "Tue", "SHORT", gw);
    const emission = record.emission as unknown as Record<string, unknown>;
    expect(emission).not.toBeNull();
    expect("price" in emission).toBe(false);
    expect("top" in emission).toBe(false);
    expect("floor" in emission).toBe(false);
    expect(Object.keys(emission).sort()).toEqual(
      ["deepDemandZoneId", "demandZoneId", "keyZoneType", "supplyZoneId"].sort(),
    );
  });

  test("EU Tue SHORT designates the BoM supply zone containing 1.14460", () => {
    const t = 1783076400000;
    const zones = [
      { id: `EUR/USD|1H|${t}|1.14460`, top: 1.14571, bottom: 1.1446 },
      { id: "EUR/USD|1H|1782990000000|1.14004", top: 1.14004, bottom: 1.1395 },
      { id: "EUR/USD|1H|1782968400000|1.13815", top: 1.13815, bottom: 1.1376 },
      { id: `EUR/USD|1H|${t}|extra`, top: 1.147, bottom: 1.146 },
    ];
    const out = step(
      designationMachine,
      freshDesignation("Tue", "EUR/USD"),
      designateEvent(
        {
          supplyZoneId: `EUR/USD|1H|${t}|1.14460`,
          demandZoneId: "EUR/USD|1H|1782990000000|1.14004",
          keyZoneType: "SUPPLY",
          deepDemandZoneId: "EUR/USD|1H|1782968400000|1.13815",
        },
        zones,
        1.142,
      ),
    );
    if (out.kind !== "TRANSITIONED") throw new Error(`Tue SHORT refused: ${JSON.stringify(out)}`);
    expect(out.record.emission?.supplyZoneId).toBe(`EUR/USD|1H|${t}|1.14460`);
    expect(zones[0].bottom <= 1.1446 && 1.1446 <= zones[0].top).toBe(true);
  });

  test("EU Mon LONG demand rung at 1.14100/1.14120", () => {
    const t = 1782990000000;
    const zones = [
      { id: "EUR/USD|1H|1783076400000|1.14460", top: 1.14571, bottom: 1.1446 },
      { id: `EUR/USD|1H|${t}|1.14100`, top: 1.1412, bottom: 1.141 },
      { id: `EUR/USD|1H|${t}|deep`, top: 1.1399, bottom: 1.1395 },
      { id: `EUR/USD|1H|${t}|extra`, top: 1.147, bottom: 1.146 },
    ];
    const out = step(
      designationMachine,
      freshDesignation("Mon", "EUR/USD"),
      designateEvent(
        {
          supplyZoneId: "EUR/USD|1H|1783076400000|1.14460",
          demandZoneId: `EUR/USD|1H|${t}|1.14100`,
          keyZoneType: "DEMAND",
          deepDemandZoneId: `EUR/USD|1H|${t}|deep`,
        },
        zones,
        1.142,
      ),
    );
    if (out.kind !== "TRANSITIONED") throw new Error(`Mon LONG refused: ${JSON.stringify(out)}`);
    expect(out.record.emission?.demandZoneId).toBe(`EUR/USD|1H|${t}|1.14100`);
    expect(zones[1].bottom).toBe(1.141);
    expect(zones[1].top).toBe(1.1412);
  });

  test("adversarial: unknown zone id is refused (guard, never silent-designated)", () => {
    const snap = buildSnapshot("DXY", "Mon", gw);
    const out = step(
      designationMachine,
      freshDesignation("Mon", "DXY"),
      designateEvent(
        {
          supplyZoneId: "DXY|1H|0|ghost",
          demandZoneId: snap.zones[1].id,
          keyZoneType: "DEMAND",
          deepDemandZoneId: snap.zones[2].id,
        },
        snap.zones,
        snap.projectedOpen,
      ),
    );
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: inverted orientation (supply below open) is refused", () => {
    const snap = buildSnapshot("GBP/USD", "Mon", gw);
    const out = step(
      designationMachine,
      freshDesignation("Mon", "GBP/USD"),
      designateEvent(
        {
          supplyZoneId: snap.zones[1].id,
          demandZoneId: snap.zones[0].id,
          keyZoneType: "SUPPLY",
          deepDemandZoneId: snap.zones[2].id,
        },
        snap.zones,
        snap.projectedOpen,
      ),
    );
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: malformed DESIGNATE (missing projectedOpen) is refused", () => {
    const snap = buildSnapshot("DXY", "Fri", gw);
    const bad = ev(
      "DESIGNATE",
      {
        emission: {
          supplyZoneId: snap.zones[0].id,
          demandZoneId: snap.zones[1].id,
          keyZoneType: "SUPPLY",
          deepDemandZoneId: snap.zones[2].id,
        },
        snapshot: snap.zones,
      },
      "designation",
      "OPEN",
      "DESIGNATED",
      "test:malformed",
      "src/e2/tests/designation-totality.test.ts",
      1,
    );
    const out = step(designationMachine, freshDesignation("Fri", "DXY"), bad);
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: DESIGNATE from DESIGNATED does not re-fire (no matching edge)", () => {
    const { record, emission, snap } = designatePair("DXY", "Fri", "SHORT", gw);
    expect(record.state).toBe("DESIGNATED");
    const again = step(designationMachine, record, designateEvent(emission, snap.zones, snap.projectedOpen));
    expect(again.kind).toBe("UNCHANGED");
  });
});
