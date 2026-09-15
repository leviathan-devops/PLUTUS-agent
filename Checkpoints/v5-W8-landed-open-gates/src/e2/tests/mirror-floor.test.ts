import { describe, expect, test } from "bun:test";
import { dischargeMirrorFloor, mirrorFloorTruth } from "../computations/mirror-floor";
import { readJson } from "./support";

interface MirrorFixture {
  id: string;
  expect: "CONTRADICTED" | "VALID";
  data: { setupCount: number; expectedSetups: number };
}

describe("mirror-floor discharge — 40 / 13 / 24 through the computation", () => {
  test("Tuesday 40-setup overgeneration -> CONTRADICTED", () => {
    const fx = readJson<MirrorFixture>("mutants/mutant-1-40setup.json");
    expect(fx.expect).toBe("CONTRADICTED");
    expect(dischargeMirrorFloor(fx.data.setupCount, fx.data.expectedSetups)).toBe("CONTRADICTED");
  });

  test("Wednesday 13-setup undergeneration -> CONTRADICTED", () => {
    const fx = readJson<MirrorFixture>("mutants/mutant-2-13setup.json");
    expect(fx.expect).toBe("CONTRADICTED");
    expect(dischargeMirrorFloor(fx.data.setupCount, fx.data.expectedSetups)).toBe("CONTRADICTED");
  });

  test("24-setup truth (f(T) = N x (1+P)) -> VALID", () => {
    const fx = readJson<MirrorFixture>("mutants/mutant-1-40setup.json");
    expect(mirrorFloorTruth(8, 2)).toBe(fx.data.expectedSetups);
    expect(dischargeMirrorFloor(fx.data.expectedSetups, fx.data.expectedSetups)).toBe("VALID");
  });

  test("f(T) = N x (1+P) arithmetic is computed, not fitted", () => {
    expect(mirrorFloorTruth(12, 1)).toBe(24);
    expect(mirrorFloorTruth(6, 3)).toBe(24);
    expect(mirrorFloorTruth(10, 2)).toBe(30);
  });

  test("adversarial: off-by-one (23, 25) both CONTRADICTED", () => {
    expect(dischargeMirrorFloor(23, 24)).toBe("CONTRADICTED");
    expect(dischargeMirrorFloor(25, 24)).toBe("CONTRADICTED");
  });

  test("adversarial: zero setups CONTRADICTED, never VALID-by-default", () => {
    expect(dischargeMirrorFloor(0, 24)).toBe("CONTRADICTED");
  });

  test("adversarial: negative setupCount throws RangeError", () => {
    expect(() => dischargeMirrorFloor(-1, 24)).toThrow(RangeError);
  });

  test("adversarial: non-positive expectedSetups throws RangeError", () => {
    expect(() => dischargeMirrorFloor(24, 0)).toThrow(RangeError);
  });

  test("adversarial: non-integer setupCount throws RangeError", () => {
    expect(() => dischargeMirrorFloor(24.5, 24)).toThrow(RangeError);
  });
});
