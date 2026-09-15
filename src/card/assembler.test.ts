// src/card/assembler.test.ts — Wave 2 consumer-desk battery.
// Every test FAILS if the code is wrong: golden round-trip proves the happy
// path; each negative proves a distinct typed AssemblerError (name + code).

import { describe, expect, test } from "bun:test";
import { assemble } from "./assembler.ts";
import { AssemblerError, buildProvenance } from "./provenance.ts";
import { safeParsePlutusCard } from "./schema.ts";

const GOLDEN_URL = new URL("./golden-card.json", import.meta.url);

async function loadGolden(): Promise<Record<string, unknown>> {
  const data: unknown = await Bun.file(GOLDEN_URL).json();
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new AssemblerError("SCHEMA_INVALID", "golden-card.json root must be an object");
  }
  return data as Record<string, unknown>;
}

function clone(data: Record<string, unknown>): any {
  return structuredClone(data);
}

function expectAssemblerError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof AssemblerError)) {
      throw new Error(`expected AssemblerError ${code}, got non-assembler: ${String(error)}`);
    }
    expect(error.name).toBe("AssemblerError");
    expect(error.code as string).toBe(code);
    return;
  }
  throw new Error(`expected AssemblerError ${code} — input COERCED to pass (theatrical)`);
}

describe("assembler golden round-trip", () => {
  test("golden assemble PASS round-trips the landed golden-card.json shape", async () => {
    const golden = await loadGolden();
    const card = assemble(structuredClone(golden));
    expect(card.meta.pair).toBe("EUR/USD");
    expect(card.zones.length).toBe(3);
    expect(card.designations.length).toBe(2);
    expect(card.visuals.charts.length).toBe(2);
    expect(card.setups.length).toBe(1);
    expect(card.provenance.entries.length).toBe(8);
    const reparsed = safeParsePlutusCard(JSON.parse(JSON.stringify(card)));
    if (!reparsed.ok) {
      throw new Error(`assembled card REJECTED by schema: ${reparsed.error.message}`);
    }
    expect(reparsed.card.meta.analysisPointMs).toBe(1783317600000);
  });

  test("buildProvenance happy path carries every id with a source anchor", async () => {
    const golden = await loadGolden();
    const entries = (golden["provenance"] as any)["entries"].map((entry: any) => ({
      id: entry.id as string,
      source: entry.source as string,
      kind: entry.kind,
      ...(entry.value !== undefined ? { value: entry.value as number } : {}),
    }));
    const provenance = buildProvenance(entries);
    expect(provenance.entries.length).toBe(8);
  });
});

describe("assembler negatives (typed loud FAILs)", () => {
  test("FAIL-grade chart REFUSED with CHART_FAIL", async () => {
    const mutant = clone(await loadGolden());
    mutant.visuals.charts[0].grade = "FAIL";
    expectAssemblerError(() => assemble(mutant), "CHART_FAIL");
  });

  test("missing chart grade REFUSED with CHART_FAIL (boundary: absent grade is unvetted)", async () => {
    const mutant = clone(await loadGolden());
    delete mutant.visuals.charts[1].grade;
    expectAssemblerError(() => assemble(mutant), "CHART_FAIL");
  });

  test("orphan designation zoneId REFUSED with ORPHAN_ID", async () => {
    const mutant = clone(await loadGolden());
    mutant.designations[0].supplyZoneId = "EUR/USD|1H|0000000000000|9.99999";
    expectAssemblerError(() => assemble(mutant), "ORPHAN_ID");
  });

  test("orphan setup zoneId REFUSED with ORPHAN_ID", async () => {
    const mutant = clone(await loadGolden());
    mutant.setups[0].zoneId = "GBP/USD|1H|0000000000000|9.99999";
    expectAssemblerError(() => assemble(mutant), "ORPHAN_ID");
  });

  test("missing provenance anchor REFUSED with PROVENANCE_INCOMPLETE", async () => {
    const mutant = clone(await loadGolden());
    mutant.provenance.entries = mutant.provenance.entries.filter(
      (entry: any) => entry.id !== "setup-eu-tue-short-1",
    );
    expectAssemblerError(() => assemble(mutant), "PROVENANCE_INCOMPLETE");
  });

  test("provenance entry missing source REFUSED with PROVENANCE_INCOMPLETE (never auto-filled)", async () => {
    const mutant = clone(await loadGolden());
    mutant.provenance.entries[0].source = "";
    expectAssemblerError(() => assemble(mutant), "PROVENANCE_INCOMPLETE");
  });

  test("buildProvenance entry missing source REFUSED with PROVENANCE_INCOMPLETE", () => {
    expectAssemblerError(
      () => buildProvenance([{ id: "x", source: "", kind: "e1-zone" }]),
      "PROVENANCE_INCOMPLETE",
    );
  });

  test("buildProvenance non-anchor source REFUSED with PROVENANCE_INCOMPLETE", () => {
    expectAssemblerError(
      () => buildProvenance([{ id: "x", source: "no-line-here", kind: "chart" }]),
      "PROVENANCE_INCOMPLETE",
    );
  });

  test("schema-invalid input REFUSED typed (meta.tf garbage -> SCHEMA_INVALID)", async () => {
    const mutant = clone(await loadGolden());
    mutant.meta.tf = "9Y";
    expectAssemblerError(() => assemble(mutant), "SCHEMA_INVALID");
  });

  test("null root REFUSED with SCHEMA_INVALID (adversarial: null)", () => {
    expectAssemblerError(() => assemble(null), "SCHEMA_INVALID");
  });

  test("empty zones REFUSED typed (boundary: a card with no zones is not a card)", async () => {
    const mutant = clone(await loadGolden());
    mutant.zones = [];
    try {
      assemble(mutant);
    } catch (error) {
      if (!(error instanceof AssemblerError)) throw error;
      expect(error.name).toBe("AssemblerError");
      return;
    }
    throw new Error("empty zones COERCED to pass");
  });
});
