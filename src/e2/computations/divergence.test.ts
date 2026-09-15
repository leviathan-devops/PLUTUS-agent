import { describe, expect, test } from "bun:test";
import { DIVERGENCE_MAX } from "../machines/types";
import { ComputationError } from "./errors";
import { computeDivergence, divergencePairVsMacro, reportDivergence } from "./divergence";

describe("computeDivergence — mismatch fraction in [0,1], computed from the data", () => {
  test("identical chains -> 0", () => {
    expect(computeDivergence(["SS", "BS", "R"], ["SS", "BS", "R"])).toBe(0);
  });
  test("fully opposed chains -> 1", () => {
    expect(computeDivergence(["SS", "SS"], ["BS", "BS"])).toBe(1);
  });
  test("half mismatch -> 0.5", () => {
    expect(computeDivergence(["SS", "BS", "R", "WL"], ["SS", "R", "BS", "WL"])).toBe(0.5);
  });
  test("adversarial: empty chains throw fail-closed", () => {
    expect(() => computeDivergence([], ["SS"])).toThrow();
    expect(() => computeDivergence(["SS"], [])).toThrow();
  });
  test("adversarial: non-array and non-string elements throw", () => {
    expect(() => computeDivergence(null, ["SS"])).toThrow(ComputationError);
    expect(() => computeDivergence(["SS", 42], ["SS", "BS"])).toThrow(ComputationError);
    expect(() => computeDivergence("SS", ["SS"])).toThrow(ComputationError);
  });
});

describe("reportDivergence — FLAG-ONLY at the 0.35 contract bound", () => {
  test("contract bound is 0.35", () => {
    expect(DIVERGENCE_MAX).toBe(0.35);
  });
  test("0.34 -> SILENT, never flagged", () => {
    const r = reportDivergence(0.34);
    expect(r.verdict).toBe("SILENT");
    expect(r.flagged).toBe(false);
    expect(r.bound).toBe(0.35);
  });
  test("0.36 -> FIRE, flagged for the machine to decide", () => {
    const r = reportDivergence(0.36);
    expect(r.verdict).toBe("FIRE");
    expect(r.flagged).toBe(true);
  });
  test("endpoints: 0 SILENT, 1 FIRE", () => {
    expect(reportDivergence(0).flagged).toBe(false);
    expect(reportDivergence(1).flagged).toBe(true);
  });
  test("adversarial: out-of-range, NaN, Infinity, non-number throw", () => {
    expect(() => reportDivergence(-0.1)).toThrow(ComputationError);
    expect(() => reportDivergence(1.1)).toThrow(ComputationError);
    expect(() => reportDivergence(NaN)).toThrow(ComputationError);
    expect(() => reportDivergence(Infinity)).toThrow(ComputationError);
    expect(() => reportDivergence("0.3")).toThrow(ComputationError);
    expect(() => reportDivergence(null)).toThrow(ComputationError);
  });
});

describe("divergencePairVsMacro — the combined computation-plus-report path", () => {
  test("1/3 mismatch (0.333) stays SILENT", () => {
    const r = divergencePairVsMacro(["SS", "BS", "R"], ["SS", "R", "R"]);
    expect(r.value).toBeCloseTo(1 / 3, 12);
    expect(r.flagged).toBe(false);
  });
  test("2/3 mismatch (0.667) flags FIRE", () => {
    const r = divergencePairVsMacro(["SS", "BS", "R"], ["SS", "R", "BS"]);
    expect(r.value).toBeCloseTo(2 / 3, 12);
    expect(r.flagged).toBe(true);
  });
  test("adversarial: malformed chains propagate fail-closed, never a silent pass", () => {
    expect(() => divergencePairVsMacro([], [])).toThrow();
    expect(() => divergencePairVsMacro(null, ["SS"])).toThrow(ComputationError);
  });
});
