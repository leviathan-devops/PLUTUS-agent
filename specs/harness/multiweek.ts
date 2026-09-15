// specs/harness/multiweek.ts — W8 prep desk (O-F2 instrument): the multi-week
// sustained-acceptance harness. Runs the landed chain over N fixture weeks and
// asserts the SUSTAINED gate (SC-25: cumulative golden convergence >= 15/21,
// no week below the floor, coverage across >= 2 weeks) + exit 0/1.
//
// DEDUP SEAM (recorded for the orchestrator): no integration-runner module
// exists yet (verified 2026-09-05: grep src/ for integration-runner|e2e-runner
// finds only consumers of golden-gate, no runner). The default evaluator below
// therefore wires DIRECTLY on the landed stage modules — the same stage
// functions the runner will wire: src/e1/machines zoneClassificationMachine
// (E1), RRR_FLOOR from src/kernel/trade-computer (the kernel D-R1 floor).
// When w5-integration-runner lands, replace defaultEvaluateWeek's body with a
// delegation to the runner and keep the gate/table/CLI surface unchanged.
// The win criterion is documented on isRowConverged: E1-convergence per oracle
// row (machine classify + orientation + geometry + RRR floor), NOT <=3p level
// matching — the runner's projection outputs upgrade the comparator later.
//
// D13: oracle rows are MEASUREMENT targets. The machine input built by
// buildRowEvidence carries numeric geometry + bars ONLY — no oracle-metadata
// keys (rrr/shape/day/n/dir). Zone type is derived from real decision 1H OHLC
// (last.C<=last.O), not row.dir. The comparator (win counting) is the sole
// consumer of row.dir/rrr. Proven by multiweek.test.ts D13 cases.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { zoneClassificationMachine } from "../../src/e1/machines/index";
import { decodeMarketData } from "../../src/e1/adapters/market-data-adapter";
import { FutureBarLeak } from "../../src/runtime/errors";
import {
  VALID_ACTIONS,
  VALID_INTENTS,
  makeLexiconData,
} from "../../src/e1/tests/helpers";
import type { LexiconData, PairKey, ZoneModel } from "../../src/e1/core/types";
import { RRR_FLOOR } from "../../src/kernel/trade-computer";

export const ANALYSIS_POINT_MS = 1783317600000;
export const DECISION_BARS_PATH = "/tmp/opencode/bars_raw.json";

export const SUSTAINED_NUMERATOR = 15;
export const SUSTAINED_DENOMINATOR = 21;
export const MIN_WEEKS = 2;

export type MultiweekErrorCode =
  | "MW_FIXTURE_UNREADABLE"
  | "MW_FIXTURE_CORRUPT"
  | "MW_FIXTURE_EMPTY"
  | "MW_UNKNOWN_PAIR"
  | "MW_ROW_MALFORMED"
  | "MW_BARS_MISSING"
  | "MW_NO_WEEKS"
  | "MW_EVALUATOR_FAILED";

export class MultiweekError extends Error {
  readonly code: MultiweekErrorCode;
  readonly fixture: string | null;
  constructor(code: MultiweekErrorCode, fixture: string | null, detail: string) {
    super(`[multiweek:${code}] ${detail}`);
    this.name = "MultiweekError";
    this.code = code;
    this.fixture = fixture;
  }
}

export interface OracleRowInput {
  n: number;
  day: string;
  dir: string;
  e: number;
  sl: number;
  tp: number;
  rrr: number;
}

export interface RowConvergence {
  pair: string;
  n: number;
  win: boolean;
  machineIntent: string;
  machineAction: string;
  confidence: number;
  rrrEffective: number;
  divergent: boolean;
  reasons: string[];
}

export interface WeekVerdict {
  week: string;
  fixturePath: string;
  wins: number;
  losses: number;
  total: number;
  digest: string;
  rows: RowConvergence[];
}

export interface SustainedGate {
  numerator: number;
  denominator: number;
  minWeeks: number;
  weeks: number;
  cumulativeWins: number;
  cumulativeTotal: number;
  ratioOk: boolean;
  perWeekFloorOk: boolean;
  coverageOk: boolean;
  sustainedPass: boolean;
  failingWeeks: string[];
}

export type WeekEvaluator = (fixturePath: string) => WeekVerdict | Promise<WeekVerdict>;

const FIXTURE_KEY_TO_PAIR: Record<string, string> = {
  eurusd: "EUR/USD",
  gbpusd: "GBP/USD",
  dxy: "DXY",
};

const PAIR_SPECS: Record<string, { pip: number; atr14: number; spot: number }> = {
  "EUR/USD": { pip: 0.0001, atr14: 0.0006, spot: 1.14 },
  "GBP/USD": { pip: 0.0001, atr14: 0.0008, spot: 1.33 },
  DXY: { pip: 0.01, atr14: 0.08, spot: 101.0 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFinite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function loadDecision1h(pair: string): unknown[] {
  let raw: string;
  try {
    raw = readFileSync(DECISION_BARS_PATH, "utf8");
  } catch (e) {
    throw new MultiweekError("MW_BARS_MISSING", DECISION_BARS_PATH, `cannot read decision bars: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new MultiweekError("MW_BARS_MISSING", DECISION_BARS_PATH, `decision bars JSON corrupt: ${(e as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new MultiweekError("MW_BARS_MISSING", DECISION_BARS_PATH, "decision bars must be a feed array");
  }
  const feed = parsed.find((item) => {
    if (!isRecord(item)) return false;
    return item["pair"] === pair && String(item["timeframe"]).toUpperCase() === "1H";
  });
  if (!isRecord(feed) || !Array.isArray(feed["bars"]) || feed["bars"].length === 0) {
    throw new MultiweekError("MW_BARS_MISSING", DECISION_BARS_PATH, `no 1H bars for ${pair}`);
  }
  return feed["bars"] as unknown[];
}

export function canonicalSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalSerialize(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function digestVerdict(verdict: Omit<WeekVerdict, "digest">): string {
  return createHash("sha256").update(canonicalSerialize(verdict)).digest("hex");
}

function readFixture(fixturePath: string): { week: string; anchorMs: number; rowsByPair: Array<{ pair: string; rows: OracleRowInput[] }> } {
  let raw: string;
  try {
    raw = readFileSync(fixturePath, "utf8");
  } catch (e) {
    throw new MultiweekError("MW_FIXTURE_UNREADABLE", fixturePath, `cannot read fixture: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new MultiweekError("MW_FIXTURE_CORRUPT", fixturePath, `invalid JSON: ${(e as Error).message}`);
  }
  if (!isRecord(parsed) || !isRecord(parsed["meta"]) || !isRecord(parsed["oracle"])) {
    throw new MultiweekError("MW_FIXTURE_CORRUPT", fixturePath, "fixture must carry meta{} + oracle{} objects");
  }
  const week = parsed["meta"]["week"];
  const anchorMs = asFinite(parsed["meta"]["analysisPointMs"]);
  if (typeof week !== "string" || week.length === 0) {
    throw new MultiweekError("MW_FIXTURE_CORRUPT", fixturePath, "meta.week must be a non-empty string");
  }
  if (anchorMs === null) {
    throw new MultiweekError("MW_FIXTURE_CORRUPT", fixturePath, "meta.analysisPointMs must be a finite number");
  }
  if (anchorMs > ANALYSIS_POINT_MS) {
    throw new FutureBarLeak({
      message: `FUTURE_BAR_LEAK fixture analysisPointMs=${anchorMs} past ANALYSIS_POINT_MS=${ANALYSIS_POINT_MS} — decode refused, never filtered`,
    });
  }
  const oracle = parsed["oracle"] as Record<string, unknown>;
  const rowsByPair: Array<{ pair: string; rows: OracleRowInput[] }> = [];
  for (const key of Object.keys(oracle)) {
    const pair = FIXTURE_KEY_TO_PAIR[key];
    if (pair === undefined) {
      throw new MultiweekError("MW_UNKNOWN_PAIR", fixturePath, `oracle key '${key}' maps to no known pair (known: ${Object.keys(FIXTURE_KEY_TO_PAIR).join(",")})`);
    }
    const block = oracle[key];
    if (!isRecord(block) || !Array.isArray(block["rows"])) {
      throw new MultiweekError("MW_FIXTURE_CORRUPT", fixturePath, `oracle.${key} must carry rows[]`);
    }
    const rows: OracleRowInput[] = (block["rows"] as unknown[]).map((r, i) => {
      if (!isRecord(r)) {
        throw new MultiweekError("MW_ROW_MALFORMED", fixturePath, `oracle.${key}.rows[${i}] is not an object`);
      }
      const n = asFinite(r["n"]);
      const e = asFinite(r["e"]);
      const sl = asFinite(r["sl"]);
      const tp = asFinite(r["tp"]);
      const rrr = asFinite(r["rrr"]);
      if (n === null || e === null || sl === null || tp === null || rrr === null) {
        throw new MultiweekError("MW_ROW_MALFORMED", fixturePath, `oracle.${key}.rows[${i}] needs finite n/e/sl/tp/rrr`);
      }
      if (typeof r["day"] !== "string" || (r["dir"] !== "Short" && r["dir"] !== "Long")) {
        throw new MultiweekError("MW_ROW_MALFORMED", fixturePath, `oracle.${key}.rows[${i}] needs day string + dir Short|Long`);
      }
      return { n, day: r["day"] as string, dir: r["dir"] as string, e, sl, tp, rrr };
    });
    rowsByPair.push({ pair, rows });
  }
  const total = rowsByPair.reduce((acc, b) => acc + b.rows.length, 0);
  if (total === 0) {
    throw new MultiweekError("MW_FIXTURE_EMPTY", fixturePath, "fixture carries zero oracle rows — nothing to converge");
  }
  return { week, anchorMs, rowsByPair };
}

export function buildRowEvidence(
  row: OracleRowInput,
  pair: string,
  anchorMs: number,
  idx: number,
  week = "2026-07-06",
): { data: LexiconData; zone: ZoneModel } {
  const spec = PAIR_SPECS[pair];
  if (spec === undefined) {
    throw new MultiweekError("MW_UNKNOWN_PAIR", null, `pair '${pair}' has no market spec (known: ${Object.keys(PAIR_SPECS).join(",")})`);
  }
  if (anchorMs > ANALYSIS_POINT_MS) {
    throw new FutureBarLeak({
      message: `FUTURE_BAR_LEAK buildRowEvidence anchorMs=${anchorMs} past ANALYSIS_POINT_MS=${ANALYSIS_POINT_MS} — decode refused, never filtered`,
    });
  }
  const decoded = decodeMarketData(loadDecision1h(pair), ANALYSIS_POINT_MS).filter((b) => b.t <= anchorMs);
  const bars = decoded.slice(-8);
  if (bars.length === 0) {
    throw new MultiweekError("MW_BARS_MISSING", DECISION_BARS_PATH, `no gated 1H bars for ${pair}#${row.n} at anchor ${anchorMs}`);
  }
  const hi = Math.max(...bars.map((b) => b.H));
  const lo = Math.min(...bars.map((b) => b.L));
  const mid = (hi + lo) / 2;
  const last = bars[bars.length - 1]!;
  const fromBarsSupply = last.C <= last.O;
  const zone: ZoneModel = {
    id: `MW-${idx}`,
    type: fromBarsSupply ? "SUPPLY" : "DEMAND",
    top: fromBarsSupply ? hi : mid,
    bottom: fromBarsSupply ? mid : lo,
    classification: "BoM",
    formationMs: anchorMs - 3 * 86400_000,
    originIdx: 0,
    bw: 3.5,
    bf: 0.7,
    prior: "NONE",
    tf: "1H",
    zfp: 0.5,
    pressure: "VIRGIN",
    reactionCount: 0,
  };
  const data = makeLexiconData({
    bars,
    zones: [zone],
    meta: {
      pair: pair as PairKey,
      week,
      tf: "1H",
      anchorMs,
      spot: spec.spot,
      candidateZoneId: zone.id,
      atr14: spec.atr14,
      pip: spec.pip,
    },
  });
  return { data, zone };
}

export function isRowConverged(
  row: OracleRowInput,
  pair: string,
  anchorMs: number,
  idx: number,
  week = "2026-07-06",
): RowConvergence {
  const reasons: string[] = [];
  const { data, zone } = buildRowEvidence(row, pair, anchorMs, idx, week);
  let intent = "";
  let action = "";
  let confidence = NaN;
  let machineOk = false;
  try {
    const verdict = zoneClassificationMachine.classify({ data });
    intent = String(verdict.intent);
    action = String(verdict.action);
    confidence = Number(verdict.confidence);
    machineOk =
      VALID_INTENTS.includes(intent) &&
      VALID_ACTIONS.includes(action) &&
      Number.isFinite(confidence) &&
      confidence >= 0 &&
      confidence <= 1;
    if (!machineOk) reasons.push(`machine verdict invalid (intent=${intent} action=${action} confidence=${String(verdict.confidence)})`);
  } catch (e) {
    reasons.push(`machine threw: ${(e as Error).message}`);
  }
  const short = row.dir === "Short";
  const orientationOk = zone.type === (short ? "SUPPLY" : "DEMAND");
  if (!orientationOk) reasons.push(`orientation breach: zone ${zone.type} vs dir ${row.dir}`);
  const divergent = short ? row.sl < row.e : row.sl > row.e;
  let geometryOk = true;
  let rrrEffective: number;
  if (divergent) {
    reasons.push("divergent row: fixture SL inverts the direction orientation — geometry skipped, oracle rrr used for the floor (D13 comparator role)");
    rrrEffective = row.rrr;
  } else {
    const entryInside = row.e >= zone.bottom && row.e <= zone.top;
    const slOutside = short ? row.sl >= zone.top : row.sl <= zone.bottom;
    const tpOutside = short ? row.tp < zone.bottom : row.tp > zone.top;
    geometryOk = entryInside && slOutside && tpOutside;
    if (!geometryOk) {
      reasons.push(`geometry breach: entryInside=${entryInside} slOutside=${slOutside} tpOutside=${tpOutside}`);
    }
    const denom = Math.abs(row.sl - row.e);
    if (denom === 0) {
      reasons.push("rrr undefined: |sl-e| is zero");
      rrrEffective = NaN;
    } else {
      rrrEffective = Math.abs(row.tp - row.e) / denom;
    }
  }
  const rrrOk = Number.isFinite(rrrEffective) && (rrrEffective as number) >= RRR_FLOOR;
  if (!rrrOk) reasons.push(`rrr floor breach: effective ${String(rrrEffective)} < D-R1 floor ${RRR_FLOOR}`);
  const win = machineOk && action === "classify" && orientationOk && geometryOk && rrrOk;
  if (!machineOk || action !== "classify") reasons.push(`machine leg: action=${action || "none"}`);
  if (win) reasons.push("converged");
  return { pair, n: row.n, win, machineIntent: intent, machineAction: action, confidence, rrrEffective, divergent, reasons };
}

export function evaluateWeekFixture(fixturePath: string): WeekVerdict {
  const abs = resolve(fixturePath);
  const { week, anchorMs, rowsByPair } = readFixture(abs);
  let idx = 0;
  const rows: RowConvergence[] = [];
  for (const block of rowsByPair) {
    for (const row of block.rows) {
      rows.push(isRowConverged(row, block.pair, anchorMs, idx, week));
      idx += 1;
    }
  }
  const wins = rows.filter((r) => r.win).length;
  const total = rows.length;
  const partial: Omit<WeekVerdict, "digest"> = {
    week,
    fixturePath: abs,
    wins,
    losses: total - wins,
    total,
    rows,
  };
  return { ...partial, digest: digestVerdict(partial) };
}

export function evaluateSustainedGate(weeks: WeekVerdict[]): SustainedGate {
  const cumulativeWins = weeks.reduce((acc, w) => acc + w.wins, 0);
  const cumulativeTotal = weeks.reduce((acc, w) => acc + w.total, 0);
  const ratioOk =
    cumulativeTotal > 0 &&
    cumulativeWins * SUSTAINED_DENOMINATOR >= SUSTAINED_NUMERATOR * cumulativeTotal;
  const failingWeeks = weeks
    .filter((w) => !(w.total > 0 && w.wins * SUSTAINED_DENOMINATOR >= SUSTAINED_NUMERATOR * w.total))
    .map((w) => w.week);
  const perWeekFloorOk = weeks.length > 0 && failingWeeks.length === 0;
  const coverageOk = weeks.length >= MIN_WEEKS;
  const sustainedPass = ratioOk && perWeekFloorOk && coverageOk;
  return {
    numerator: SUSTAINED_NUMERATOR,
    denominator: SUSTAINED_DENOMINATOR,
    minWeeks: MIN_WEEKS,
    weeks: weeks.length,
    cumulativeWins,
    cumulativeTotal,
    ratioOk,
    perWeekFloorOk,
    coverageOk,
    sustainedPass,
    failingWeeks,
  };
}

export function discoverFixtureWeeks(fixturesDir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(fixturesDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => join(fixturesDir, e.name))
      .sort();
  } catch (e) {
    throw new MultiweekError("MW_FIXTURE_UNREADABLE", fixturesDir, `cannot list fixtures dir: ${(e as Error).message}`);
  }
  if (entries.length === 0) {
    throw new MultiweekError("MW_NO_WEEKS", fixturesDir, "no fixture weeks available (*.json in fixtures dir)");
  }
  return entries;
}

export interface MultiweekResult {
  weeks: WeekVerdict[];
  gate: SustainedGate;
}

export async function runMultiweekHarness(opts?: {
  fixturePaths?: string[];
  fixturesDir?: string;
  evaluateWeek?: WeekEvaluator;
}): Promise<MultiweekResult> {
  const evaluateWeek = opts?.evaluateWeek ?? evaluateWeekFixture;
  const fixturePaths =
    opts?.fixturePaths ??
    discoverFixtureWeeks(opts?.fixturesDir ?? join(process.cwd(), "specs", "fixtures"));
  if (fixturePaths.length === 0) {
    throw new MultiweekError("MW_NO_WEEKS", null, "empty fixture list — pass --fixtures or populate specs/fixtures");
  }
  const weeks: WeekVerdict[] = [];
  for (const path of fixturePaths) {
    try {
      weeks.push(await evaluateWeek(path));
    } catch (e) {
      if (e instanceof MultiweekError) throw e;
      throw new MultiweekError("MW_EVALUATOR_FAILED", path, `evaluator threw: ${(e as Error).message}`);
    }
  }
  return { weeks, gate: evaluateSustainedGate(weeks) };
}

export function formatVerdictTable(result: MultiweekResult): string {
  const lines: string[] = [];
  lines.push("week | wins | losses | total | cumulative | floor | verdict");
  let cumWins = 0;
  let cumTotal = 0;
  for (const w of result.weeks) {
    cumWins += w.wins;
    cumTotal += w.total;
    const floorOk = w.total > 0 && w.wins * SUSTAINED_DENOMINATOR >= SUSTAINED_NUMERATOR * w.total;
    lines.push(
      `${w.week} | ${w.wins} | ${w.losses} | ${w.total} | ${cumWins}/${cumTotal} | ${floorOk ? "FLOOR_OK" : "FLOOR_FAIL"} | ${w.wins}/${w.total}`,
    );
    lines.push(
      `MW-ROW|${w.week}|${basename(w.fixturePath)}|${w.wins}|${w.losses}|${w.total}|${cumWins}|${cumTotal}|${floorOk ? "FLOOR_OK" : "FLOOR_FAIL"}|${w.digest.slice(0, 16)}`,
    );
  }
  const g = result.gate;
  lines.push(
    `SUSTAINED|${g.cumulativeWins}/${g.cumulativeTotal}|gate=${g.numerator}/${g.denominator}|ratio=${g.ratioOk ? "OK" : "FAIL"}|floor=${g.perWeekFloorOk ? "OK" : "FAIL"}|coverage=${g.coverageOk ? `OK(${g.weeks}>=${g.minWeeks})` : `FAIL(${g.weeks}<${g.minWeeks})`}|${g.sustainedPass ? "SUSTAINED PASS" : "SUSTAINED FAIL"}`,
  );
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fixturesFlag = args.find((a) => a.startsWith("--fixtures="));
  const dirFlag = args.find((a) => a.startsWith("--fixtures-dir="));
  const fixturePaths = fixturesFlag
    ? fixturesFlag.slice("--fixtures=".length).split(",").map((s) => s.trim()).filter((s) => s.length > 0)
    : undefined;
  try {
    const result = await runMultiweekHarness({
      fixturePaths,
      fixturesDir: dirFlag ? dirFlag.slice("--fixtures-dir=".length) : undefined,
    });
    console.log(formatVerdictTable(result));
    process.exit(result.gate.sustainedPass ? 0 : 1);
  } catch (e) {
    if (e instanceof MultiweekError) {
      console.error(`[multiweek] LOUD FAIL ${e.code} fixture=${e.fixture ?? "none"}: ${e.message}`);
    } else {
      console.error(`[multiweek] LOUD FAIL unexpected: ${(e as Error).message}`);
    }
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && process.argv[1].endsWith("specs/harness/multiweek.ts");
if (invokedDirectly) {
  void main();
}
