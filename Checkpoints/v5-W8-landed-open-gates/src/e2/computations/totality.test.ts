import { describe, expect, test } from "bun:test";
import type { Designation } from "../types";
import { ComputationError } from "./errors";
import { auditTotality, checkDesignationPair, dischargeTotality, expandTotality } from "./totality";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PAIRS = ["DXY", "EUR/USD", "GBP/USD"] as const;
const DIRECTIONS = ["LONG", "SHORT"] as const;

function buildRows(): Designation[] {
  const rows: Designation[] = [];
  for (const day of DAYS)
    for (const pair of PAIRS)
      for (const direction of DIRECTIONS)
        rows.push({
          day,
          pair,
          direction,
          supplyZoneId: `${pair}|${day}|${direction}|supply`,
          demandZoneId: `${pair}|${day}|${direction}|demand`,
          keyZoneType: direction === "LONG" ? "DEMAND" : "SUPPLY",
          deepDemandZoneId: `${pair}|${day}|${direction}|deep`,
        });
  return rows;
}

describe("expandTotality — the 90-row expansion counter", () => {
  test("golden week: 5 x 3 x 2 = 30 pairs", () => {
    expect(expandTotality(5, 3, 2)).toBe(30);
  });
  test("fifteen-day window: 15 x 3 x 2 = 90 rows", () => {
    expect(expandTotality(15, 3, 2)).toBe(90);
  });
  test("adversarial: zero, negative, float, NaN, string throw", () => {
    expect(() => expandTotality(0, 3, 2)).toThrow(ComputationError);
    expect(() => expandTotality(-5, 3, 2)).toThrow(ComputationError);
    expect(() => expandTotality(5.5, 3, 2)).toThrow(ComputationError);
    expect(() => expandTotality(NaN, 3, 2)).toThrow(ComputationError);
    expect(() => expandTotality("5", 3, 2)).toThrow(ComputationError);
  });
});

describe("checkDesignationPair — exactly demand-side + supply-side", () => {
  test("valid designation with two distinct IDs -> VALID", () => {
    const check = checkDesignationPair(buildRows()[0]);
    expect(check.verdict).toBe("VALID");
  });
  test("identical supply and demand IDs -> CONTRADICTED", () => {
    const row = { ...buildRows()[0], demandZoneId: buildRows()[0].supplyZoneId };
    const check = checkDesignationPair(row);
    expect(check.verdict).toBe("CONTRADICTED");
    expect(check.reason.length).toBeGreaterThan(0);
  });
  test("adversarial: missing field, empty ID, null, non-object throw", () => {
    const { demandZoneId: _drop, ...rest } = buildRows()[0];
    expect(() => checkDesignationPair(rest)).toThrow(ComputationError);
    expect(() => checkDesignationPair({ ...buildRows()[0], supplyZoneId: "" })).toThrow(ComputationError);
    expect(() => checkDesignationPair(null)).toThrow(ComputationError);
    expect(() => checkDesignationPair("designation")).toThrow(ComputationError);
  });
});

describe("dischargeTotality — via the registry totality_forall", () => {
  test("30 designations over 5x3x2 -> VALID", () => {
    expect(dischargeTotality(30, 5, 3, 2)).toBe("VALID");
  });
  test("29 designations -> CONTRADICTED", () => {
    expect(dischargeTotality(29, 5, 3, 2)).toBe("CONTRADICTED");
  });
  test("adversarial: malformed counts throw via the oracle", () => {
    expect(() => dischargeTotality(-1, 5, 3, 2)).toThrow();
    expect(() => dischargeTotality(30, 0, 3, 2)).toThrow();
  });
});

describe("auditTotality — 30 pairs = 60 IDs", () => {
  test("30 built designations audit VALID with 60 IDs", () => {
    const audit = auditTotality(buildRows(), 5, 3, 2);
    expect(audit.verdict).toBe("VALID");
    expect(audit.groups).toBe(30);
    expect(audit.ids).toBe(60);
    expect(audit.expectedIds).toBe(60);
    expect(audit.reasons).toEqual([]);
  });
  test("a dropped row audits CONTRADICTED with the shortfall named", () => {
    const rows = buildRows().slice(1);
    const audit = auditTotality(rows, 5, 3, 2);
    expect(audit.verdict).toBe("CONTRADICTED");
    expect(audit.ids).toBe(58);
    expect(audit.reasons.length).toBeGreaterThan(0);
  });
  test("a corrupted row audits CONTRADICTED with the row named", () => {
    const rows = buildRows();
    rows[7] = { ...rows[7], demandZoneId: rows[7].supplyZoneId };
    const audit = auditTotality(rows, 5, 3, 2);
    expect(audit.verdict).toBe("CONTRADICTED");
    expect(audit.reasons.some((r) => r.includes("row 7"))).toBe(true);
  });
  test("adversarial: empty array audits CONTRADICTED, non-array throws", () => {
    expect(auditTotality([], 5, 3, 2).verdict).toBe("CONTRADICTED");
    expect(() => auditTotality(null, 5, 3, 2)).toThrow(ComputationError);
    expect(() => auditTotality(buildRows(), 0, 3, 2)).toThrow(ComputationError);
  });
});
