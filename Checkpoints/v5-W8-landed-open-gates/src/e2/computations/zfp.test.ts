import { describe, expect, test } from "bun:test";
import { ComputationError } from "./errors";
import { PRESSURE_BANDS, ZFP_FROM_CONFLUENCE, pressureBand, zfpFromConfluence, zfpLadder } from "./zfp";

describe("zfpLadder — min(60, 20 + floor((battles-3)/2) x 5)", () => {
  test("mission boundaries: 3->20, 5->25, 61->60 cap", () => {
    expect(zfpLadder(3)).toBe(20);
    expect(zfpLadder(5)).toBe(25);
    expect(zfpLadder(61)).toBe(60);
  });
  test("step shape: even battles hold, odd battles step", () => {
    expect(zfpLadder(4)).toBe(20);
    expect(zfpLadder(6)).toBe(25);
    expect(zfpLadder(7)).toBe(30);
    expect(zfpLadder(13)).toBe(45);
  });
  test("cap holds far above: 100 and 1000 stay 60", () => {
    expect(zfpLadder(100)).toBe(60);
    expect(zfpLadder(1000)).toBe(60);
  });
  test("formula-literal below 3: 0->10, 1->15, 2->15", () => {
    expect(zfpLadder(0)).toBe(10);
    expect(zfpLadder(1)).toBe(15);
    expect(zfpLadder(2)).toBe(15);
  });
  test("adversarial: negative, float, NaN, string, null throw", () => {
    expect(() => zfpLadder(-1)).toThrow(ComputationError);
    expect(() => zfpLadder(2.5)).toThrow(ComputationError);
    expect(() => zfpLadder(NaN)).toThrow(ComputationError);
    expect(() => zfpLadder("5")).toThrow(ComputationError);
    expect(() => zfpLadder(null)).toThrow(ComputationError);
  });
});

describe("pressureBand — the canon confluence step function", () => {
  test("all six bands resolve with their canon ZFP ranges", () => {
    expect(pressureBand(14)).toEqual({ degree: "EXTREME", zfpLow: 0, zfpHigh: 10 });
    expect(pressureBand(12)).toEqual({ degree: "EXTREME", zfpLow: 0, zfpHigh: 10 });
    expect(pressureBand(11)).toEqual({ degree: "HEAVY", zfpLow: 10, zfpHigh: 25 });
    expect(pressureBand(10)).toEqual({ degree: "HEAVY", zfpLow: 10, zfpHigh: 25 });
    expect(pressureBand(9)).toEqual({ degree: "MODERATE-HEAVY", zfpLow: 20, zfpHigh: 35 });
    expect(pressureBand(8)).toEqual({ degree: "MODERATE-HEAVY", zfpLow: 20, zfpHigh: 35 });
    expect(pressureBand(7)).toEqual({ degree: "MODERATE", zfpLow: 30, zfpHigh: 45 });
    expect(pressureBand(6)).toEqual({ degree: "MODERATE", zfpLow: 30, zfpHigh: 45 });
    expect(pressureBand(5)).toEqual({ degree: "LIGHT", zfpLow: 40, zfpHigh: 60 });
    expect(pressureBand(4)).toEqual({ degree: "LIGHT", zfpLow: 40, zfpHigh: 60 });
    expect(pressureBand(3)).toEqual({ degree: "MINIMAL", zfpLow: 60, zfpHigh: 100 });
    expect(pressureBand(0)).toEqual({ degree: "MINIMAL", zfpLow: 60, zfpHigh: 100 });
  });
  test("every score 0..14 lands in exactly one band", () => {
    for (let c = 0; c <= 14; c++) {
      const band = pressureBand(c);
      expect(band.zfpLow).toBeLessThanOrEqual(band.zfpHigh);
    }
    expect(PRESSURE_BANDS.length).toBe(6);
  });
  test("adversarial: 15, -1, float, NaN, string throw", () => {
    expect(() => pressureBand(15)).toThrow(ComputationError);
    expect(() => pressureBand(-1)).toThrow(ComputationError);
    expect(() => pressureBand(7.5)).toThrow(ComputationError);
    expect(() => pressureBand(NaN)).toThrow(ComputationError);
    expect(() => pressureBand("12")).toThrow(ComputationError);
  });
});

describe("zfpFromConfluence — the representative ZFP per band", () => {
  test("representatives: 12->10, 10->20, 8->30, 6->40, 4->55, 0->65", () => {
    expect(zfpFromConfluence(12)).toBe(10);
    expect(zfpFromConfluence(10)).toBe(20);
    expect(zfpFromConfluence(8)).toBe(30);
    expect(zfpFromConfluence(6)).toBe(40);
    expect(zfpFromConfluence(4)).toBe(55);
    expect(zfpFromConfluence(0)).toBe(65);
  });
  test("representatives sit inside their band ranges", () => {
    for (let c = 0; c <= 14; c++) {
      const band = pressureBand(c);
      const zfp = zfpFromConfluence(c);
      expect(zfp).toBe(ZFP_FROM_CONFLUENCE[band.degree]);
    }
  });
  test("adversarial: out-of-range propagates the band throw", () => {
    expect(() => zfpFromConfluence(15)).toThrow(ComputationError);
    expect(() => zfpFromConfluence(null)).toThrow(ComputationError);
  });
});
