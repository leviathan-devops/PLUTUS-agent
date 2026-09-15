import { describe, expect, test } from "bun:test";
import { EscalationError, EscalationLadder, tierForOccurrence } from "./escalation.js";
import type { LexiconFinding } from "./lexicon-engine.js";

function findingAt(file: string, line: number): LexiconFinding {
  return {
    familyId: "domain.numeric-threshold:comparator",
    kind: "domain.numeric-threshold",
    severity: "CRITICAL",
    message: "planted",
    remediationHook: "remove-hardcoded-comparator",
    triad: { pattern: "domain.numeric-threshold:comparator", state: "EVIDENCED", evidence: { file, line, quote: "const comparator=101.14;" } },
  };
}

describe("tier mapping", () => {
  test("occurrences map to WARN REVIEW BLOCK HALT", () => {
    expect(tierForOccurrence(1)).toEqual({ tier: 1, mode: "WARN" });
    expect(tierForOccurrence(2)).toEqual({ tier: 2, mode: "REVIEW" });
    expect(tierForOccurrence(3)).toEqual({ tier: 3, mode: "BLOCK" });
    expect(tierForOccurrence(9)).toEqual({ tier: 4, mode: "HALT" });
  });
  test("bad occurrence throws RangeError", () => {
    expect(() => tierForOccurrence(0)).toThrow(RangeError);
    expect(() => tierForOccurrence(1.5)).toThrow(RangeError);
  });
  test("empty finding id throws TypeError", () => {
    expect(() => new EscalationLadder().decide("", 1)).toThrow(TypeError);
  });
});

describe("drill tier 1 advisory", () => {
  test("WARN never throws and hatch grants", () => {
    const drill = new EscalationLadder().runDrill(1);
    expect(drill.mode).toBe("WARN");
    expect(drill.threw).toBe(false);
    expect(drill.thrownCode).toBeNull();
    expect(drill.hatchGranted).toBe(true);
  });
});

describe("drill tier 2 review", () => {
  test("REVIEW never throws and hatch grants", () => {
    const drill = new EscalationLadder().runDrill(2);
    expect(drill.mode).toBe("REVIEW");
    expect(drill.threw).toBe(false);
    expect(drill.hatchGranted).toBe(true);
  });
});

describe("drill tier 3 block", () => {
  test("BLOCK throws EscalationError and hatch grants", () => {
    const drill = new EscalationLadder().runDrill(3);
    expect(drill.mode).toBe("BLOCK");
    expect(drill.threw).toBe(true);
    expect(drill.thrownCode).toBe("ESCALATION_BLOCK");
    expect(drill.hatchGranted).toBe(true);
  });
});

describe("drill tier 4 halt", () => {
  test("HALT throws EscalationError and hatch grants", () => {
    const drill = new EscalationLadder().runDrill(4);
    expect(drill.mode).toBe("HALT");
    expect(drill.threw).toBe(true);
    expect(drill.thrownCode).toBe("ESCALATION_HALT");
    expect(drill.hatchGranted).toBe(true);
  });
  test("bad tier throws RangeError", () => {
    expect(() => new EscalationLadder().runDrill(5 as never)).toThrow(RangeError);
  });
});

describe("tracking and hatches", () => {
  test("third occurrence of one finding throws BLOCK", () => {
    const ladder = new EscalationLadder();
    const finding = findingAt("src/gate.ts", 7);
    ladder.track(finding);
    ladder.track(finding);
    try {
      ladder.track(finding);
      throw new Error("SHOULD_HAVE_THROWN");
    } catch (error) {
      expect(error).toBeInstanceOf(EscalationError);
      expect((error as EscalationError).code).toBe("ESCALATION_BLOCK");
    }
  });
  test("container-test hatch resets the count", () => {
    const ladder = new EscalationLadder();
    const finding = findingAt("src/gate.ts", 7);
    ladder.track(finding);
    ladder.track(finding);
    const hatch = ladder.requestHatch("container-test", "domain.numeric-threshold:comparator::src/gate.ts:7");
    expect(hatch.granted).toBe(true);
    const decision = ladder.track(finding);
    expect(decision.tier).toBe(1);
  });
  test("operator-override without reason throws; with reason logs", () => {
    const ladder = new EscalationLadder();
    expect(() => ladder.requestHatch("operator-override", "x")).toThrow(TypeError);
    const hatch = ladder.requestHatch("operator-override", "x", "operator accepted the risk");
    expect(hatch.granted).toBe(true);
    expect(ladder.overrideLog().length).toBe(1);
    expect(ladder.overrideLog()[0]!.reason).toBe("operator accepted the risk");
  });
  test("finding without triad throws TypeError", () => {
    const ladder = new EscalationLadder();
    expect(() => ladder.track({ familyId: "x" } as unknown as LexiconFinding)).toThrow(TypeError);
  });
  test("concurrent decide calls agree", async () => {
    const ladder = new EscalationLadder();
    const decisions = await Promise.all([
      Promise.resolve(ladder.decide("k", 1)),
      Promise.resolve(ladder.decide("k", 1)),
      Promise.resolve(ladder.decide("k", 1)),
    ]);
    for (const d of decisions) expect(d.mode).toBe("WARN");
  });
});
