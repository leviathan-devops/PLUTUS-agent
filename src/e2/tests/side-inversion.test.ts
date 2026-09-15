import { describe, expect, test } from "bun:test";
import { step } from "../../substrate/L3-lasme/index.ts";
import {
  designateEvent,
  designationMachine,
  freshDesignation,
  type DesignationRecord,
  type ZoneGeometry,
} from "../machines/designation-machine.ts";
import { consumeStep, readJson } from "./support";

interface SideInversionFixture {
  id: string;
  expect: "FIRE" | "SILENT";
  data: {
    pair: "EUR/USD";
    day: string;
    direction: "LONG" | "SHORT";
    anchorZoneId?: string;
    anchorZoneType: "SUPPLY" | "DEMAND";
    anchorZonePrice: number;
    rung?: number;
  };
}

function snapshotFor(fx: SideInversionFixture): { anchorId: string; zones: ZoneGeometry[] } {
  const t = 1782990000000;
  const anchorId =
    fx.data.anchorZoneId ?? `EUR/USD|1H|${t}|${fx.data.anchorZonePrice.toFixed(5)}`;
  const anchor: ZoneGeometry =
    fx.data.anchorZoneType === "SUPPLY"
      ? { id: anchorId, top: fx.data.anchorZonePrice + 0.001, bottom: fx.data.anchorZonePrice }
      : { id: anchorId, top: fx.data.anchorZonePrice + 0.0002, bottom: fx.data.anchorZonePrice - 0.0005 };
  const other: ZoneGeometry =
    fx.data.anchorZoneType === "SUPPLY"
      ? { id: `EUR/USD|1H|${t}|1.14100`, top: 1.1412, bottom: 1.1405 }
      : { id: "EUR/USD|1H|1783648800000|1.14469", top: 1.14571, bottom: 1.14469 };
  const supplyZone = fx.data.anchorZoneType === "SUPPLY" ? anchor : other;
  const demandZone = fx.data.anchorZoneType === "SUPPLY" ? other : anchor;
  return {
    anchorId,
    zones: [
      supplyZone,
      demandZone,
      { id: `EUR/USD|1H|${t}|deep`, top: 1.1399, bottom: 1.1395 },
      { id: `EUR/USD|1H|${t}|extra`, top: 1.147, bottom: 1.146 },
    ],
  };
}

function designate(day: string, zones: ZoneGeometry[], open: number): DesignationRecord {
  const out = step(
    designationMachine,
    freshDesignation(day, "EUR/USD"),
    designateEvent(
      {
        supplyZoneId: zones[0].id,
        demandZoneId: zones[1].id,
        keyZoneType: "DEMAND",
        deepDemandZoneId: zones[2].id,
      },
      zones,
      open,
    ),
  );
  if (out.kind !== "TRANSITIONED") {
    throw new Error(`[SIDE_SETUP] designate refused: ${JSON.stringify(out)}`);
  }
  return out.record;
}

describe("side-inversion D17 calibration pair — real machine, FIRE + SILENT", () => {
  test("v4.5.2 mutant (EU Mon LONG on SUPPLY 1.14469) FIRES SIDE_INVERSION_VIOLATION", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-3-sideinversion-v452.json");
    expect(fx.expect).toBe("FIRE");
    const { anchorId, zones } = snapshotFor(fx);
    expect(anchorId).toBe(zones[0].id);
    const record = designate(fx.data.day, zones, 1.142);
    const out = consumeStep(record, anchorId, fx.data.direction);
    expect(out.kind).toBe("UNCHANGED");
    if (out.kind === "UNCHANGED") {
      expect(out.reason).toBe("GUARD_FAILED");
    }
    console.log(`D17 mutant v4.5.2: FIRE SIDE_INVERSION_VIOLATION (step UNCHANGED GUARD_FAILED)`);
  });

  test("v4.5.3 corrected row (EU Mon LONG on demand 1.14100) stays SILENT", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-4-sideinversion-v453-silent.json");
    expect(fx.expect).toBe("SILENT");
    const { anchorId, zones } = snapshotFor(fx);
    expect(anchorId).toBe(zones[1].id);
    const record = designate(fx.data.day, zones, 1.142);
    const out = consumeStep(record, anchorId, fx.data.direction);
    if (out.kind !== "TRANSITIONED") {
      throw new Error(`corrected row refused: ${JSON.stringify(out)}`);
    }
    expect(out.record.state).toBe("CONSUMED");
    console.log("D17 corrected v4.5.3: SILENT (TRANSITIONED to CONSUMED, no violation)");
  });

  test("adversarial: SHORT consuming demand FIRES", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-4-sideinversion-v453-silent.json");
    const { zones } = snapshotFor(fx);
    const record = designate(fx.data.day, zones, 1.142);
    const out = consumeStep(record, zones[1].id, "SHORT");
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: SHORT consuming supply stays SILENT", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-4-sideinversion-v453-silent.json");
    const { zones } = snapshotFor(fx);
    const record = designate(fx.data.day, zones, 1.142);
    const out = consumeStep(record, zones[0].id, "SHORT");
    if (out.kind !== "TRANSITIONED") {
      throw new Error(`SHORT-on-supply refused: ${JSON.stringify(out)}`);
    }
    expect(out.record.state).toBe("CONSUMED");
  });

  test("adversarial: CONSUME before DESIGNATE cannot fire (no matching edge)", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-3-sideinversion-v452.json");
    const { anchorId } = snapshotFor(fx);
    const out = consumeStep(freshDesignation(fx.data.day, "EUR/USD"), anchorId, "LONG");
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: anchor outside the pair is refused (E3_DISOBEYED_E2)", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-4-sideinversion-v453-silent.json");
    const { zones } = snapshotFor(fx);
    const record = designate(fx.data.day, zones, 1.142);
    const out = consumeStep(record, "EUR/USD|1H|0|ghost", "LONG");
    expect(out.kind).toBe("UNCHANGED");
  });

  test("adversarial: double CONSUME cannot re-fire from CONSUMED", () => {
    const fx = readJson<SideInversionFixture>("mutants/mutant-4-sideinversion-v453-silent.json");
    const { anchorId, zones } = snapshotFor(fx);
    const record = designate(fx.data.day, zones, 1.142);
    const first = consumeStep(record, anchorId, fx.data.direction);
    if (first.kind !== "TRANSITIONED") {
      throw new Error(`first consume refused: ${JSON.stringify(first)}`);
    }
    const second = consumeStep(first.record, anchorId, fx.data.direction);
    expect(second.kind).toBe("UNCHANGED");
  });
});
