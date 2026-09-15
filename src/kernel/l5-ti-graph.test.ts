// src/kernel/l5-ti-graph.test.ts — adversarial battery for B.W5-L5 (warhead confluence).
import { describe, test, expect } from "bun:test";
import { computeConfluence } from "./l5-ti-graph";
import type { TiLawNode } from "./l5-ti-graph";

function laws(): TiLawNode[] {
  return [
    { lawId: "LAW-7-LADDER", edge: "REQUIRES", satisfied: true, weight: 2, quote: "3 pips outside the back edge" },
    { lawId: "LAW-10-ATR", edge: "REQUIRES", satisfied: true, weight: 2, quote: "SL never tighter than 0.5 x ATR(14)" },
    { lawId: "LAW-12-TP-TF", edge: "SUPPORTS", satisfied: true, weight: 1, quote: "TP timeframe >= entry timeframe" },
    { lawId: "LAW-99-HOSTILE", edge: "CONTRADICTS", satisfied: false, weight: 0, quote: "hostile law dormant" },
  ];
}

function base() {
  return { laws: laws(), rrr: 3.1, rrrFloor: 2.5 };
}

const CHECKS = [{ item: "entry-checklist-complete", evidence: "L1+L2+L3+L4 verdicts journaled" }];

describe("l5-ti-graph happy path", () => {
  test("satisfied graph with clean RRR validates the trade", () => {
    const v = computeConfluence(base(), CHECKS);
    expect(v.tradeValid).toBe(true);
    expect(v.supportingLawIds).toContain("LAW-12-TP-TF");
    expect(v.requiredLawIds).toEqual(["LAW-7-LADDER", "LAW-10-ATR"]);
    expect(v.score).toBe(5);
    expect(v.contradictingLawIds.length).toBe(0);
  });

  test("checklist rows carry through with checked flags", () => {
    const v = computeConfluence(base(), CHECKS);
    expect(v.entryChecklist[0]).toMatchObject({ item: "entry-checklist-complete", checked: true });
  });
});

describe("l5-ti-graph adversarial", () => {
  test("empty laws array throws loud", () => {
    expect(() => computeConfluence({ ...base(), laws: [] }, CHECKS)).toThrow("malformed input");
  });

  test("violated REQUIRES edge invalidates (never outvoted by supports)", () => {
    const input = base();
    input.laws[0] = { ...input.laws[0]!, satisfied: false };
    const v = computeConfluence(input, CHECKS);
    expect(v.tradeValid).toBe(false);
  });

  test("fired CONTRADICTS edge invalidates", () => {
    const input = base();
    input.laws[3] = { ...input.laws[3]!, satisfied: true };
    const v = computeConfluence(input, CHECKS);
    expect(v.tradeValid).toBe(false);
    expect(v.contradictingLawIds).toContain("LAW-99-HOSTILE");
  });

  test("RRR below the floor appends the LAW-14 contradiction and invalidates", () => {
    const v = computeConfluence({ ...base(), rrr: 1.8 }, CHECKS);
    expect(v.tradeValid).toBe(false);
    expect(v.contradictingLawIds).toContain("LAW-14-RRR-FLOOR");
  });

  test("open checklist item (empty evidence) invalidates", () => {
    const v = computeConfluence(base(), [{ item: "missing-evidence", evidence: "" }]);
    expect(v.tradeValid).toBe(false);
    expect(v.entryChecklist[0]?.checked).toBe(false);
  });

  test("law without a doctrine quote throws loud (D13)", () => {
    const input = base();
    input.laws[0] = { ...input.laws[0]!, quote: "" };
    expect(() => computeConfluence(input, CHECKS)).toThrow("malformed input");
  });

  test("non-positive RRR floor throws loud", () => {
    expect(() => computeConfluence({ ...base(), rrrFloor: 0 }, CHECKS)).toThrow("malformed input");
  });
});
