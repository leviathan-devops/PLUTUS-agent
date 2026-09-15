import { describe, expect, test } from "bun:test";
import { ComputationError } from "./errors";
import { countSetups, dischargeFromDesignations, dischargeMirrorFloor, mirrorCoverage, mirrorFloorTruth } from "./mirrorFloor";

describe("mirrorFloorTruth — f(T) = N x (1+P)", () => {
  test("pure math: truth(8,2)=24, truth(24,0)=24, truth(12,1)=24", () => {
    expect(mirrorFloorTruth(8, 2)).toBe(24);
    expect(mirrorFloorTruth(24, 0)).toBe(24);
    expect(mirrorFloorTruth(12, 1)).toBe(24);
  });
  test("adversarial: negative n throws", () => {
    expect(() => mirrorFloorTruth(-1, 2)).toThrow(ComputationError);
  });
  test("adversarial: NaN and non-number throw", () => {
    expect(() => mirrorFloorTruth(NaN, 2)).toThrow(ComputationError);
    expect(() => mirrorFloorTruth("8", 2)).toThrow(ComputationError);
    expect(() => mirrorFloorTruth(8, null)).toThrow(ComputationError);
  });
});

describe("dischargeMirrorFloor — the W0 trio via the registry oracle", () => {
  test("40 setups -> CONTRADICTED (overgen)", () => {
    expect(dischargeMirrorFloor(40, 24)).toBe("CONTRADICTED");
  });
  test("13 setups -> CONTRADICTED (undergen)", () => {
    expect(dischargeMirrorFloor(13, 24)).toBe("CONTRADICTED");
  });
  test("24 setups -> VALID (founding control)", () => {
    expect(dischargeMirrorFloor(24, 24)).toBe("VALID");
  });
  test("adversarial: null, string, float, negative setupCount throw via the oracle", () => {
    expect(() => dischargeMirrorFloor(null, 24)).toThrow();
    expect(() => dischargeMirrorFloor("40", 24)).toThrow();
    expect(() => dischargeMirrorFloor(40.5, 24)).toThrow();
    expect(() => dischargeMirrorFloor(-1, 24)).toThrow();
  });
  test("adversarial: malformed expectedSetups throws via the oracle", () => {
    expect(() => dischargeMirrorFloor(24, -1)).toThrow();
    expect(() => dischargeMirrorFloor(24, NaN)).toThrow();
  });
});

describe("countSetups + dischargeFromDesignations — the designation-state path", () => {
  test("counts rows from the data: 24 rows discharge VALID", () => {
    const rows = Array.from({ length: 24 }, (_, i) => ({ id: `setup-${i}` }));
    expect(countSetups(rows)).toBe(24);
    expect(dischargeFromDesignations(rows, 24)).toBe("VALID");
  });
  test("40 rows discharge CONTRADICTED", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ id: `setup-${i}` }));
    expect(dischargeFromDesignations(rows, 24)).toBe("CONTRADICTED");
  });
  test("adversarial: non-array and null designation state throw", () => {
    expect(() => countSetups(null)).toThrow(ComputationError);
    expect(() => countSetups({ length: 24 })).toThrow(ComputationError);
    expect(() => dischargeFromDesignations(undefined, 24)).toThrow(ComputationError);
  });
});

describe("mirrorCoverage — activeMirrors(pair) >= activeDxy(pair)", () => {
  test("above and equal cover: (30,24) and (24,24) true", () => {
    expect(mirrorCoverage(30, 24)).toBe(true);
    expect(mirrorCoverage(24, 24)).toBe(true);
  });
  test("below does not cover: (13,24) false", () => {
    expect(mirrorCoverage(13, 24)).toBe(false);
  });
  test("adversarial: negative, float, string counts throw", () => {
    expect(() => mirrorCoverage(-1, 24)).toThrow(ComputationError);
    expect(() => mirrorCoverage(30.5, 24)).toThrow(ComputationError);
    expect(() => mirrorCoverage("30", 24)).toThrow(ComputationError);
    expect(() => mirrorCoverage(30, NaN)).toThrow(ComputationError);
  });
});
