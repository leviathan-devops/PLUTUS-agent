import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conformanceZero, conformanceZeroOnDisk, resolveThreshold } from "./conformance.js";

const PROFILE = join(process.cwd(), "profile.yaml");
const CLEAN = "export const x = 0;\nexport const y = 2;\n";
const PLANTED = "export const comparator=101.14;\n";

describe("threshold resolution", () => {
  test("explicit threshold wins", () => {
    expect(resolveThreshold({ numericThreshold: 2.5 })).toBe(2.5);
  });
  test("profile.yaml binding resolves to the armed value", () => {
    expect(resolveThreshold({ profileYamlPath: PROFILE })).toBe(1.0);
  });
  test("neither source throws loud", () => {
    expect(() => resolveThreshold({})).toThrow(/NO_THRESHOLD/);
  });
  test("empty file set throws RangeError", () => {
    expect(() => conformanceZero([], { numericThreshold: 1.0 })).toThrow(RangeError);
  });
});

describe("clean tree", () => {
  test("zero findings is CONFORMANT with lines counted", () => {
    const manifest = conformanceZero([{ path: "src/clean.ts", content: CLEAN }], { numericThreshold: 1.0 });
    expect(manifest.verdict).toBe("CONFORMANT");
    expect(manifest.findings).toEqual([]);
    expect(manifest.scannedLines).toBeGreaterThan(0);
    expect(manifest.numericThreshold).toBe(1.0);
  });
});

describe("planted violation", () => {
  test("planted comparator is NONCONFORMANT with tier plus triad", () => {
    const manifest = conformanceZero([{ path: "src/gate.ts", content: PLANTED }], { numericThreshold: 1.0 });
    expect(manifest.verdict).toBe("NONCONFORMANT");
    expect(manifest.findings.length).toBe(1);
    const finding = manifest.findings[0]!;
    expect(finding.severity).toBe("CRITICAL");
    expect(finding.triad.evidence.file).toBe("src/gate.ts");
    expect(finding.triad.evidence.line).toBe(1);
    expect(manifest.tiers.length).toBe(1);
    expect(manifest.tiers[0]!.tier).toBe(1);
    expect(manifest.tiers[0]!.mode).toBe("WARN");
  });
});

describe("INCONCLUSIVE path", () => {
  test("null content is INCONCLUSIVE", () => {
    const manifest = conformanceZero([{ path: "src/x.ts", content: null }], { numericThreshold: 1.0 });
    expect(manifest.verdict).toBe("INCONCLUSIVE");
    expect(manifest.inconclusiveReasons.length).toBeGreaterThan(0);
  });
  test("missing disk file is INCONCLUSIVE", () => {
    const manifest = conformanceZeroOnDisk([join(tmpdir(), "plutus-no-such-file-xyz.ts")], { numericThreshold: 1.0 });
    expect(manifest.verdict).toBe("INCONCLUSIVE");
  });
  test("on-disk clean plus planted round trip", () => {
    const dir = mkdtempSync(join(tmpdir(), "plutus-conf-"));
    const cleanPath = join(dir, "clean.ts");
    const badPath = join(dir, "bad.ts");
    writeFileSync(cleanPath, CLEAN);
    writeFileSync(badPath, PLANTED);
    const clean = conformanceZeroOnDisk([cleanPath], { numericThreshold: 1.0 });
    expect(clean.verdict).toBe("CONFORMANT");
    const bad = conformanceZeroOnDisk([cleanPath, badPath], { numericThreshold: 1.0 });
    expect(bad.verdict).toBe("NONCONFORMANT");
    expect(bad.findings[0]!.triad.evidence.file).toBe(badPath);
  });
});

describe("graph consult", () => {
  test("missing db is a loud note, verdict unaffected", () => {
    const manifest = conformanceZero([{ path: "src/clean.ts", content: CLEAN }], {
      numericThreshold: 1.0,
      graphDbPath: join(tmpdir(), "plutus-no-such-db.sqlite"),
    });
    expect(manifest.verdict).toBe("CONFORMANT");
    expect(manifest.graphNotes.some((n) => n.startsWith("GRAPH_CONSULT_FAILED"))).toBe(true);
  });
  test("concurrent runs agree", async () => {
    const files = [{ path: "src/gate.ts", content: PLANTED }];
    const manifests = await Promise.all([
      Promise.resolve(conformanceZero(files, { numericThreshold: 1.0 })),
      Promise.resolve(conformanceZero(files, { numericThreshold: 1.0 })),
    ]);
    for (const m of manifests) expect(m.verdict).toBe("NONCONFORMANT");
  });
});
