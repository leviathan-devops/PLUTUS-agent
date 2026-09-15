// src/kernel/l3-fib.test.ts — adversarial battery for B.W5-L3 (spiderweb confluence).
import { describe, test, expect } from "bun:test";
import { computeFib, FIB_RETRACEMENTS, FIB_EXTENSIONS } from "./l3-fib";

const PIP = 0.0001;

function base() {
  return {
    swings: [{ swingZoneId: "EU|4H|SW|1.14", loEdge: 1.14, hiEdge: 1.15 }],
    trades: [{ tradeId: "T1", entryZoneId: "E1", targetZoneId: "T1T", direction: "LONG" as const }],
    bands: {
      E1: { lo: 1.1458, hi: 1.1462 },
      T1T: { lo: 1.15, hi: 1.154 },
    },
    pip: PIP,
    tolerancePips: 12,
  };
}

describe("l3-fib happy path", () => {
  test("doctrine ratio tables are the sanctioned sets", () => {
    expect([...FIB_RETRACEMENTS]).toEqual([0.382, 0.5, 0.618, 0.786]);
    expect([...FIB_EXTENSIONS]).toEqual([1.272, 1.618, 2.618]);
  });

  test("entry near a retracement level aligns entryOk", () => {
    const v = computeFib(base());
    const row = v.tradeChecks.find((r) => r.tradeId === "T1");
    expect(row?.alignedCount).toBeGreaterThan(0);
    expect(row?.entryOk).toBe(true);
  });

  test("target beyond the 1.272 extension marks targetOk", () => {
    const v = computeFib(base());
    expect(v.tradeChecks.find((r) => r.tradeId === "T1")?.targetOk).toBe(true);
  });
});

describe("l3-fib adversarial", () => {
  test("empty swings throws loud", () => {
    expect(() => computeFib({ ...base(), swings: [] })).toThrow("malformed input");
  });

  test("empty trades throws loud", () => {
    expect(() => computeFib({ ...base(), trades: [] })).toThrow("malformed input");
  });

  test("entry zone with no band record throws loud (never silently skipped)", () => {
    expect(() =>
      computeFib({ ...base(), trades: [{ tradeId: "TX", entryZoneId: "GHOST", targetZoneId: "T1T", direction: "LONG" }] }),
    ).toThrow("malformed input");
  });

  test("distant entry aligns nothing — entryOk false", () => {
    const v = computeFib({
      ...base(),
      bands: { E1: { lo: 1.3, hi: 1.301 }, T1T: { lo: 1.31, hi: 1.312 } },
      tolerancePips: 1,
    });
    const row = v.tradeChecks.find((r) => r.tradeId === "T1");
    expect(row?.alignedCount).toBe(0);
    expect(row?.entryOk).toBe(false);
  });

  test("inverted swing band throws loud", () => {
    expect(() => computeFib({ ...base(), swings: [{ swingZoneId: "S", loEdge: 1.15, hiEdge: 1.14 }] })).toThrow(
      "malformed input",
    );
  });

  test("negative tolerance throws loud", () => {
    expect(() => computeFib({ ...base(), tolerancePips: -2 })).toThrow("malformed input");
  });

  test("illegal direction throws loud", () => {
    expect(() =>
      computeFib({
        ...base(),
        trades: [{ tradeId: "T1", entryZoneId: "E1", targetZoneId: "T1T", direction: "SIDEWAYS" as never }],
      }),
    ).toThrow("malformed input");
  });
});
