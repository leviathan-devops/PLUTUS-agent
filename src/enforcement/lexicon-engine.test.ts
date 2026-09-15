import { describe, expect, test } from "bun:test";
import {
  LexiconRegistry,
  classifySource,
  extractNumericThreshold,
} from "./lexicon-engine.js";

const OPTS = { numericThreshold: 1.0, tolerancePips: 3 };

function registry() {
  return new LexiconRegistry(OPTS);
}

describe("registry construction", () => {
  test("bad threshold throws TypeError", () => {
    expect(() => new LexiconRegistry({ numericThreshold: NaN, tolerancePips: 3 })).toThrow(TypeError);
  });
  test("bad tolerance throws RangeError", () => {
    expect(() => new LexiconRegistry({ numericThreshold: 1.0, tolerancePips: 0 })).toThrow(RangeError);
  });
  test("duplicate family id throws", () => {
    const reg = registry();
    const first = reg.get("domain.numeric-threshold:comparator");
    expect(first).not.toBeNull();
    expect(() => reg.register(first!)).toThrow(/DUPLICATE/);
  });
  test("non-RegExp matcher throws TypeError", () => {
    const reg = registry();
    expect(() =>
      reg.register({
        id: "x",
        kind: "process.gates",
        matcher: "not-a-regex" as unknown as RegExp,
        triggerCondition: () => true,
        severity: "LOW",
        messageTemplate: "x",
        remediationHook: "x",
      })
    ).toThrow(TypeError);
  });
});

describe("clean tree", () => {
  test("benign source emits zero findings", () => {
    const outcome = classifySource("src/kernel/l1.ts", "export const x = 1;\n", registry());
    expect(outcome.state).toBe("EMITTED");
    expect(outcome.findings).toEqual([]);
    expect(outcome.scannedLines).toBe(2);
  });
  test("empty content emits zero findings", () => {
    const outcome = classifySource("src/empty.ts", "", registry());
    expect(outcome.state).toBe("EMITTED");
    expect(outcome.findings).toEqual([]);
  });
  test("below-threshold comparator is silent", () => {
    const outcome = classifySource("src/gate.ts", "const comparator=1.0;\n", registry());
    expect(outcome.findings).toEqual([]);
  });
});

describe("planted violation", () => {
  test("comparator above binding fires CRITICAL with triad", () => {
    const outcome = classifySource("src/pipeline/golden-gate.ts", "const comparator=101.14;\n", registry());
    expect(outcome.state).toBe("EMITTED");
    expect(outcome.findings.length).toBe(1);
    const finding = outcome.findings[0]!;
    expect(finding.severity).toBe("CRITICAL");
    expect(finding.triad.pattern).toBe("domain.numeric-threshold:comparator");
    expect(finding.triad.state).toBe("EVIDENCED");
    expect(finding.triad.evidence.file).toBe("src/pipeline/golden-gate.ts");
    expect(finding.triad.evidence.line).toBe(1);
    expect(finding.message).toContain("src/pipeline/golden-gate.ts:1");
  });
  test("just above threshold fires", () => {
    const outcome = classifySource("src/gate.ts", "comparator=1.01\n", registry());
    expect(outcome.findings.length).toBe(1);
  });
});

describe("other families", () => {
  test("frozen-pair write attempt fires HIGH", () => {
    const outcome = classifySource("src/tool.ts", "await writeFile(sl-lmvPath, patched);\n", registry());
    const hit = outcome.findings.find((f) => f.kind === "frozen-pair");
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe("HIGH");
  });
  test("frozen-pair mention without mutation verb is silent", () => {
    const outcome = classifySource("src/tool.ts", "import { x } from './sl-lmv';\n", registry());
    expect(outcome.findings.filter((f) => f.kind === "frozen-pair")).toEqual([]);
  });
  test("coverage claim without oracle fires; with oracle is silent", () => {
    const loud = classifySource("a.ts", "we have 100% coverage\n", registry());
    expect(loud.findings.some((f) => f.kind === "coverage-inflation")).toBe(true);
    const quiet = classifySource("a.ts", "100% coverage discharged against the oracle diag\n", registry());
    expect(quiet.findings.filter((f) => f.kind === "coverage-inflation")).toEqual([]);
  });
  test("loose pip tolerance fires; tight tolerance is silent", () => {
    const loose = classifySource("a.ts", "5 pips tolerance allowed\n", registry());
    expect(loose.findings.some((f) => f.kind === "tolerance-drift")).toBe(true);
    const tight = classifySource("a.ts", "2 pips tolerance allowed\n", registry());
    expect(tight.findings.filter((f) => f.kind === "tolerance-drift")).toEqual([]);
  });
  test("operator-rule claim without quote fires", () => {
    const outcome = classifySource("a.ts", "the operator law requires zones\n", registry());
    expect(outcome.findings.some((f) => f.kind === "doctrine-attribution")).toBe(true);
  });
});

describe("INCONCLUSIVE path", () => {
  test("null content is INCONCLUSIVE, never PASS", () => {
    const outcome = classifySource("src/x.ts", null, registry());
    expect(outcome.state).toBe("INCONCLUSIVE");
    expect(outcome.findings).toEqual([]);
  });
  test("undefined content is INCONCLUSIVE", () => {
    const outcome = classifySource("src/x.ts", undefined, registry());
    expect(outcome.state).toBe("INCONCLUSIVE");
  });
  test("empty file path throws TypeError", () => {
    expect(() => classifySource("", "x", registry())).toThrow(TypeError);
  });
});

describe("threshold extraction", () => {
  test("parses the binding from profile yaml", () => {
    const yaml = "bindings:\n  domain.numeric-threshold:\n    operator: gt\n    threshold: 1.0\n";
    expect(extractNumericThreshold(yaml)).toBe(1.0);
  });
  test("missing binding throws", () => {
    expect(() => extractNumericThreshold("no bindings here\n")).toThrow(/NO_THRESHOLD/);
  });
  test("concurrent classify calls agree", async () => {
    const src = "const comparator=101.14;\n";
    const results = await Promise.all([
      Promise.resolve(classifySource("f.ts", src, registry())),
      Promise.resolve(classifySource("f.ts", src, registry())),
      Promise.resolve(classifySource("f.ts", src, registry())),
    ]);
    for (const r of results) expect(r.findings.length).toBe(1);
  });
});
