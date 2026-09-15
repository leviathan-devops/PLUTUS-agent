// src/kernel/l4-cascade.test.ts — adversarial battery for B.W5-L4 incl. the typed FAIL negative.
import { describe, test, expect } from "bun:test";
import { computeCascade, CascadeError } from "./l4-cascade";

function base() {
  return {
    dxy: [{ tradeId: "DX1", pair: "DXY" as const, direction: "LONG" as const, zoneId: "DXY|4H|D|1" }],
    eu: [{ tradeId: "EU1", pair: "EUR/USD" as const, direction: "SHORT" as const, zoneId: "EU|1H|S|1" }],
    gu: [],
    translations: [{ stage: "dxy-e2", translationId: "dx1" }],
    divergenceScore: 0.12,
    setupCount: 24,
    expectedSetups: 24,
  };
}

describe("l4-cascade happy path", () => {
  test("EU SHORT maps to the DXY LONG inverse with floor VALID", () => {
    const v = computeCascade(base());
    expect(v.perTradeInverseMapping.length).toBe(1);
    expect(v.perTradeInverseMapping[0]).toMatchObject({
      tradeId: "EU1",
      dxyInverseDirection: "LONG",
      dxyInverseZoneId: "DXY|4H|D|1",
      inverseExists: true,
    });
    expect(v.floorCheck).toBe("VALID");
    expect(v.divergenceFlag).toBe(false);
  });

  test("divergence above 0.35 raises the flag leg only", () => {
    const v = computeCascade({ ...base(), divergenceScore: 0.5 });
    expect(v.divergenceFlag).toBe(true);
    expect(v.perTradeInverseMapping.length).toBe(1);
  });
});

describe("l4-cascade adversarial", () => {
  test("missing DXY inverse throws the typed CASCADE_NO_INVERSE FAIL", () => {
    const input = { ...base(), dxy: [] };
    try {
      computeCascade(input);
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (e) {
      expect(e).toBeInstanceOf(CascadeError);
      expect((e as CascadeError).code).toBe("CASCADE_NO_INVERSE");
      expect((e as CascadeError).tradeId).toBe("EU1");
    }
  });

  test("GU consuming a raw DXY zone throws CASCADE_FORBIDDEN_CONSUMPTION", () => {
    const input = {
      ...base(),
      gu: [{ tradeId: "GU1", pair: "GBP/USD" as const, direction: "LONG" as const, zoneId: "DXY|4H|D|1" }],
    };
    try {
      computeCascade(input);
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (e) {
      expect((e as CascadeError).code).toBe("CASCADE_FORBIDDEN_CONSUMPTION");
    }
  });

  test("duplicate translation re-fire throws CASCADE_LOOP_DETECTED", () => {
    const input = {
      ...base(),
      translations: [
        { stage: "dxy-e2", translationId: "dx1" },
        { stage: "dxy-e2", translationId: "dx1" },
      ],
    };
    try {
      computeCascade(input);
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (e) {
      expect((e as CascadeError).code).toBe("CASCADE_LOOP_DETECTED");
    }
  });

  test("empty EU/GU lanes with DXY present pass with zero rows (no silent miss)", () => {
    const v = computeCascade({ ...base(), eu: [] });
    expect(v.perTradeInverseMapping.length).toBe(0);
    expect(v.floorCheck).toBe("VALID");
  });

  test("null input throws CASCADE_INVALID_INPUT", () => {
    try {
      computeCascade(null as unknown as never);
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (e) {
      expect((e as CascadeError).code).toBe("CASCADE_INVALID_INPUT");
    }
  });

  test("non-finite divergence throws loud", () => {
    expect(() => computeCascade({ ...base(), divergenceScore: Number.NaN })).toThrow("expected finite number");
  });

  test("mirror floor contradiction propagates (40 vs 24)", () => {
    const v = computeCascade({ ...base(), setupCount: 40 });
    expect(v.floorCheck).toBe("CONTRADICTED");
  });
});
