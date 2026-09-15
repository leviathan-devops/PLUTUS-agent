// specs/harness/multiweek.test.ts — the W8 multiweek harness battery.
// bun test specs/harness/multiweek.test.ts
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MIN_WEEKS,
  MultiweekError,
  SUSTAINED_DENOMINATOR,
  SUSTAINED_NUMERATOR,
  buildRowEvidence,
  canonicalSerialize,
  evaluateSustainedGate,
  evaluateWeekFixture,
  formatVerdictTable,
  isRowConverged,
  runMultiweekHarness,
  type MultiweekErrorCode,
  type WeekVerdict,
} from "./multiweek";

const GOLDEN = join(process.cwd(), "specs", "fixtures", "golden-week.json");
const ANCHOR = 1783317600000;

function synthWeek(week: string, wins: number, losses: number): WeekVerdict {
  const total = wins + losses;
  return { week, fixturePath: `/synthetic/${week}.json`, wins, losses, total, digest: `synth-${week}`, rows: [] };
}

describe("multiweek harness: single-week verdict row", () => {
  test("golden-week run produces week 2026-07-06 with 15 rows, wins+losses=15, 64-hex digest", () => {
    const v = evaluateWeekFixture(GOLDEN);
    expect(v.week).toBe("2026-07-06");
    expect(v.total).toBe(15);
    expect(v.wins + v.losses).toBe(v.total);
    expect(v.rows.length).toBe(15);
    expect(v.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(v.rows.every((r) => r.reasons.length > 0)).toBe(true);
  });
});

describe("multiweek harness: cumulative SUSTAINED gate math", () => {
  test("16/17 across 2 weeks PASSES (ratio + floor + coverage all OK)", () => {
    const gate = evaluateSustainedGate([synthWeek("2026-07-06", 8, 0), synthWeek("2026-07-13", 8, 1)]);
    expect(gate.cumulativeWins).toBe(16);
    expect(gate.cumulativeTotal).toBe(17);
    expect(gate.ratioOk).toBe(true);
    expect(gate.perWeekFloorOk).toBe(true);
    expect(gate.coverageOk).toBe(true);
    expect(gate.sustainedPass).toBe(true);
    expect(gate.numerator).toBe(SUSTAINED_NUMERATOR);
    expect(gate.denominator).toBe(SUSTAINED_DENOMINATOR);
    expect(gate.minWeeks).toBe(MIN_WEEKS);
  });
  test("a below-floor week FAILS the gate even when siblings pass (8/8 + 0/5)", () => {
    const gate = evaluateSustainedGate([synthWeek("2026-07-06", 8, 0), synthWeek("2026-07-13", 0, 5)]);
    expect(gate.cumulativeWins).toBe(8);
    expect(gate.cumulativeTotal).toBe(13);
    expect(gate.ratioOk).toBe(false);
    expect(gate.perWeekFloorOk).toBe(false);
    expect(gate.failingWeeks).toEqual(["2026-07-13"]);
    expect(gate.sustainedPass).toBe(false);
  });
  test("single week FAILS coverage (SC-25 needs >= 2 weeks) even at 15/15", () => {
    const gate = evaluateSustainedGate([synthWeek("2026-07-06", 15, 0)]);
    expect(gate.ratioOk).toBe(true);
    expect(gate.perWeekFloorOk).toBe(true);
    expect(gate.coverageOk).toBe(false);
    expect(gate.sustainedPass).toBe(false);
  });
});

describe("multiweek harness: determinism per week", () => {
  test("two runs of golden-week are byte-identical (canonical serialize equal)", () => {
    const a = evaluateWeekFixture(GOLDEN);
    const b = evaluateWeekFixture(GOLDEN);
    expect(canonicalSerialize(a)).toBe(canonicalSerialize(b));
    expect(a.digest).toBe(b.digest);
  });
  test("concurrent runs agree (Promise.all, no shared-state drift)", async () => {
    const [a, b] = await Promise.all([
      runMultiweekHarness({ fixturePaths: [GOLDEN] }),
      runMultiweekHarness({ fixturePaths: [GOLDEN] }),
    ]);
    expect(canonicalSerialize(a)).toBe(canonicalSerialize(b));
  });
});

describe("multiweek harness: D13 oracle isolation", () => {
  test("machine input carries no oracle keys or values (rrr/shape/day/n/reinforcements)", () => {
    const row = { n: 1, day: "FundayXX", dir: "Short", e: 1.14395, sl: 1.14485, tp: 1.1411, rrr: 3.18 };
    const { data } = buildRowEvidence(row, "EUR/USD", ANCHOR, 0, "2026-07-06");
    const serialized = canonicalSerialize(data);
    for (const banned of ['"rrr":', '"shape":', '"day":', '"n":', "reinforcements", "FundayXX", ":3.18"]) {
      expect(serialized.includes(banned)).toBe(false);
    }
    expect(data.bars.length).toBeGreaterThan(0);
    expect(data.zones.length).toBe(1);
  });
  test("EU#8 inversion is detected mechanically (divergent=true, oracle rrr used)", () => {
    const eu8 = { n: 8, day: "Fri", dir: "Short", e: 1.14555, sl: 1.1454, tp: 1.14165, rrr: 4.59 };
    const c = isRowConverged(eu8, "EUR/USD", ANCHOR, 7, "2026-07-06");
    expect(c.divergent).toBe(true);
    expect(c.rrrEffective).toBe(4.59);
    expect(c.reasons.some((r) => r.includes("divergent"))).toBe(true);
  });
});

describe("multiweek harness: loud typed failures (no empty catches)", () => {
  function expectCode(fn: () => unknown, code: MultiweekErrorCode) {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(MultiweekError);
      expect((e as MultiweekError).code).toBe(code);
      return;
    }
    throw new Error(`SHOULD_HAVE_THROWN_${code}`);
  }
  test("missing file -> MW_FIXTURE_UNREADABLE; corrupt JSON -> MW_FIXTURE_CORRUPT", () => {
    expectCode(() => evaluateWeekFixture("/nonexistent/week.json"), "MW_FIXTURE_UNREADABLE");
    const dir = mkdtempSync(join(tmpdir(), "mw-"));
    try {
      const bad = join(dir, "bad.json");
      writeFileSync(bad, "{not json");
      expectCode(() => evaluateWeekFixture(bad), "MW_FIXTURE_CORRUPT");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("zero oracle rows -> MW_FIXTURE_EMPTY; unknown pair key -> MW_UNKNOWN_PAIR", () => {
    const dir = mkdtempSync(join(tmpdir(), "mw-"));
    try {
      const empty = join(dir, "empty.json");
      writeFileSync(empty, JSON.stringify({ meta: { week: "2026-07-13", analysisPointMs: ANCHOR }, oracle: { eurusd: { rows: [] } } }));
      expectCode(() => evaluateWeekFixture(empty), "MW_FIXTURE_EMPTY");
      const odd = join(dir, "odd.json");
      writeFileSync(
        odd,
        JSON.stringify({ meta: { week: "2026-07-13", analysisPointMs: ANCHOR }, oracle: { xyzpair: { rows: [{ n: 1, day: "Mon", dir: "Long", e: 1, sl: 0.9, tp: 1.2, rrr: 3 }] } } }),
      );
      expectCode(() => evaluateWeekFixture(odd), "MW_UNKNOWN_PAIR");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  test("malformed row (non-finite entry) -> MW_ROW_MALFORMED", () => {
    const dir = mkdtempSync(join(tmpdir(), "mw-"));
    try {
      const bad = join(dir, "badrow.json");
      writeFileSync(
        bad,
        JSON.stringify({ meta: { week: "2026-07-13", analysisPointMs: ANCHOR }, oracle: { eurusd: { rows: [{ n: 1, day: "Mon", dir: "Long", e: null, sl: 1.1, tp: 1.2, rrr: 3 }] } } }),
      );
      expectCode(() => evaluateWeekFixture(bad), "MW_ROW_MALFORMED");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("multiweek harness: verdict table output", () => {
  test("table carries MW-ROW machine rows + the SUSTAINED line", async () => {
    const result = await runMultiweekHarness({ fixturePaths: [GOLDEN] });
    const table = formatVerdictTable(result);
    expect(table.includes("MW-ROW|2026-07-06|golden-week.json|")).toBe(true);
    expect(table.includes("SUSTAINED|")).toBe(true);
    expect(table.includes("SUSTAINED FAIL")).toBe(true);
  });
});
