// specs/harness/integration-runner.test.ts — the W5 integration runner battery.
//
// Minimum 5 cases (spec): (1) Monday chain → >=1 projection, (2) determinism x2
// byte-identical, (3) D13 oracle-mutation isolation, (4) bad bars → typed loud
// error, (5) verdict table machine-parseable. Plus: (6) comparator PASS/FAIL
// boundary on test-local geometry (proves the PASS branch is live — the
// mutation check: corrupt the level and the row MUST flip to FAIL), (7)
// concurrent pipelines converge to identical bytes, (8) stage-error taxonomy.

import { describe, test, expect } from "bun:test";
import { fileURLToPath } from "node:url";
import {
  ANCHOR_MS, IntegrationStageError, canonicalJson, compareConvergence, e1StageOverBars,
  formatTable, readMondaySet, runPipeline, TABLE_HEADER,
  type MondayRow, type PipelineOutput,
} from "./integration-runner.ts";
import { synthBars } from "../../src/e1/tests/helpers.ts";

function mondayFixture(): MondayRow[] {
  return readMondaySet(fileURLToPath(new URL("../fixtures/golden-week.json", import.meta.url)));
}

describe("integration-runner e2e chain", () => {
  test("Monday fixture runs the full chain and produces >=1 projection per pair", async () => {
    const out = await runPipeline();
    expect(out.meta.anchorMs).toBe(ANCHOR_MS);
    expect(out.meta.seams.length).toBeGreaterThanOrEqual(4);
    for (const key of ["DXY", "EUR/USD", "GBP/USD"]) {
      const slot = out.perPair[key]!;
      expect(slot.bars).toBeGreaterThan(0);
      expect(slot.zones).toBeGreaterThan(0);
      expect(slot.designations).toBeGreaterThan(0);
      expect(slot.setupsBuilt).toBeGreaterThan(0);
      expect(slot.setupsSurvived).toBeGreaterThanOrEqual(1);
      expect(slot.projections.length).toBeGreaterThanOrEqual(1);
      expect(slot.machineTrail.length).toBeGreaterThanOrEqual(5);
      for (const p of slot.projections) {
        expect(Number.isFinite(p.level)).toBe(true);
        expect(p.rr).toBeGreaterThanOrEqual(2.5);
      }
    }
    const total = Object.values(out.perPair).flatMap((p) => p.projections).length;
    expect(total).toBeGreaterThanOrEqual(3);
  }, 120000);

  test("determinism: two runs are byte-identical", async () => {
    const a = await runPipeline();
    const b = await runPipeline();
    expect(canonicalJson({ perPair: b.perPair, zoneGeometry: b.zoneGeometry }))
      .toBe(canonicalJson({ perPair: a.perPair, zoneGeometry: a.zoneGeometry }));
    expect(a.determinismHash).toBe(b.determinismHash);
  }, 120000);

  test("D13 guard: corrupting oracle rows does NOT change pipeline output", async () => {
    const out = await runPipeline();
    const monday = mondayFixture();
    const rowsA = compareConvergence(out, monday);
    // Mutate EVERY oracle level by +1000 — the pipeline output has no oracle
    // input channel, so the projection SET both diag runs draw from must be
    // identical; only the diag deltas may move (the comparator reads oracle).
    const mutated = monday.map((m) => ({ ...m, level: m.level + 1000 }));
    const rowsB = compareConvergence(out, mutated);
    expect(rowsB.length).toBe(rowsA.length);
    const ids = new Set(Object.values(out.perPair).flatMap((p) => p.projections).map((p) => p.id));
    for (const r of [...rowsA, ...rowsB]) {
      if (r.actual !== null) {
        const m = /projection=(\S+)/.exec(r.note);
        expect(m).not.toBeNull();
        expect(ids.has(m![1]!)).toBe(true);
      }
    }
    // And the mutation must be VISIBLE in the deltas (the comparator reads oracle).
    expect(rowsB.map((r) => r.deltaPips)).not.toEqual(rowsA.map((r) => r.deltaPips));
  }, 120000);

  test("concurrent pipelines converge to identical bytes", async () => {
    const outs = await Promise.all([runPipeline(), runPipeline(), runPipeline(), runPipeline()]);
    const first = canonicalJson({ perPair: outs[0]!.perPair, zoneGeometry: outs[0]!.zoneGeometry });
    for (const o of outs) {
      expect(canonicalJson({ perPair: o.perPair, zoneGeometry: o.zoneGeometry })).toBe(first);
    }
  }, 180000);
});

describe("integration-runner stage failures are loud and typed", () => {
  test("null bars → E1_BAR_REFUSED (never silent, never coerced)", () => {
    try {
      e1StageOverBars(null, "EUR/USD");
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationStageError);
      expect((e as IntegrationStageError).code).toBe("E1_BAR_REFUSED");
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_E1_BAR_REFUSED");
  });

  test("empty bars → E1_NO_ZONES loud refusal", () => {
    try {
      e1StageOverBars([], "EUR/USD");
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationStageError);
      expect((e as IntegrationStageError).code).toBe("E1_NO_ZONES");
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_E1_NO_ZONES");
  });

  test("future bar past the anchor → E1_BAR_REFUSED (FUTURE_BAR_LEAK wrapped)", () => {
    const bars = synthBars(20260706, 8, ANCHOR_MS - 8 * 3600_000, 3600_000, 1.142, 0.00002, 0.0009);
    bars.push({ t: ANCHOR_MS + 3600_000, O: 1.142, H: 1.143, L: 1.141, C: 1.1425 });
    try {
      e1StageOverBars(bars, "EUR/USD");
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationStageError);
      expect((e as IntegrationStageError).code).toBe("E1_BAR_REFUSED");
      expect((e as Error).message).toContain("e1-adapter");
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_E1_BAR_REFUSED_FUTURE");
  });

  test("unknown pair key → E1_BAR_REFUSED", () => {
    try {
      e1StageOverBars([], "NOPE/USD");
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationStageError);
      expect((e as IntegrationStageError).code).toBe("E1_BAR_REFUSED");
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_E1_BAR_REFUSED_PAIR");
  });

  test("missing fixture file → S5_ORACLE_UNREADABLE (loud, never silent)", () => {
    try {
      readMondaySet("/nonexistent/fixture.json");
    } catch (e) {
      expect(e).toBeInstanceOf(IntegrationStageError);
      expect((e as IntegrationStageError).code).toBe("S5_ORACLE_UNREADABLE");
      return;
    }
    throw new Error("SHOULD_HAVE_THROWN_S5");
  });
});

describe("integration-runner verdict table", () => {
  test("table is machine-parseable with fixed columns", async () => {
    const out = await runPipeline();
    const rows = compareConvergence(out, mondayFixture());
    const table = formatTable(rows, true, "PASS");
    const lines = table.split("\n");
    expect(lines[0]).toBe(TABLE_HEADER);
    expect(lines.filter((l) => /^MONDAY-[0-9]/.test(l)).length).toBe(5);
    for (const line of lines.slice(1)) {
      const cols = line.split(" | ");
      expect(cols.length).toBe(7);
      expect(["PASS", "FAIL"]).toContain(cols[6]!.split(" ")[0]);
    }
    expect(table).toContain("MONDAY-COVERAGE");
    expect(table).toContain("DETERMINISM");
  }, 120000);

  test("comparator boundary: <=3p PASS, >=4p FAIL, no-coverage FAIL (test-local geometry)", () => {
    const mkOut = (level: number): PipelineOutput => ({
      meta: { anchorMs: 1, seed: 1, barsSource: "test", seams: [] },
      perPair: {
        "EUR/USD": {
          bars: 1, zones: 1, designations: 1, setupsBuilt: 1, setupsSurvived: 1,
          dropped: [], projections: [{ id: "ST-x", pair: "EUR/USD", direction: "LONG", level, rr: 3 }],
          machineTrail: [],
        },
      },
      zoneGeometry: {},
      determinismHash: "test",
    });
    const monday: MondayRow[] = [{ pair: "EUR/USD", direction: "LONG", level: 1.1411 }];
    // exactly 3 pips → PASS (1.1411 + 0.0003)
    expect(compareConvergence(mkOut(1.1414), monday)[0]!.verdict).toBe("PASS");
    // 4 pips → FAIL (the mutation check: move the level and the row flips)
    expect(compareConvergence(mkOut(1.1415), monday)[0]!.verdict).toBe("FAIL");
    expect(compareConvergence(mkOut(1.1415), monday)[0]!.deltaPips).toBe(4);
    // no same-direction projection → NO_COVERAGE FAIL
    const short = mkOut(1.1411);
    short.perPair["EUR/USD"]!.projections[0]!.direction = "SHORT";
    const noCov = compareConvergence(short, monday)[0]!;
    expect(noCov.verdict).toBe("FAIL");
    expect(noCov.note).toBe("NO_COVERAGE");
  });
});
