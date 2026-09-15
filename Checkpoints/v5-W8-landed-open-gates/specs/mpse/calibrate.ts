// specs/mpse/calibrate.ts — the W0 gate harness, step 2 (D17 calibration).
//
// Loads battery.json + specs/fixtures/ and discharges every predicate against
// its declared fixtures. Per fixture the oracle verdict is compared to the
// fixture's `expect` field (FIRE|SILENT|VALID|CONTRADICTED|row-produced):
// match → calibrated; mismatch → recorded + process exits 1 (LOUD fail — the
// gate reads exit 0 as ALL-CALIBRATED-OR-BORN-OFF).
//
// Dispatch is data-driven: the fixture `class` field selects the oracle and
// the field profile (mirror-floor, side-inversion, tp-cap, shape-gate,
// tolerance-drift, rrr-drift, near-edge, sl-min, tf-restriction, wall-clock,
// containment, totality). Sanctioned thresholds ride IN the fixture data
// (expectedSetups, slCeilingPips, sanctionedTolerancePips, sanctionedFloor);
// spec D.4 constants are fallback defaults ONLY when a fixture carries none.
// A predicate with NO fixtures is born_off (EXCLUDED_BORN_OFF — never silently
// armed). Fixture refs that resolve to expect-less golden-week sections are
// evaluated as evidence-only (recorded, never gating).
//
// The founding VALID control: the mirror-floor VALID leg is synthesized from
// the expectedSetups value READ from the resolved mirror-floor fixtures
// (their declared sanctioned truth, never a literal in this file) and must
// discharge VALID — the D17 twin every FIRE case requires.
//
// NOTE (mechanical-detector justification): the matchers below are regexes over
// line-oriented contract text and fixture ids — the S-FILE FORMAT CONTRACT is
// fixed-order `key: value` lines and the fixture corpus is JSON records, so
// structural line/token matchers ARE the Order-2 mechanism here (same posture
// as the orchestrator-landed jspec-check.ts); the DECISION layer is the
// verdict comparison + exit code, never a default-pass.
//
// Usage: bun specs/mpse/calibrate.ts [--battery <path>] [--fixtures <dir>]
//   [--out <path>] [--help]
// Exit: 0 = all calibrated-or-born-off; 1 = LOUD mismatch/malformed. No deps.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mirror_floor, side_match, divergence_le, totality_forall, rrr_floor,
  sl_ceiling, sl_min, containment_subset, tf_restriction, no_wall_clock,
  shape_gate, near_edge, OracleError,
} from "./oracle-registry";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BATTERY = join(SCRIPT_DIR, "battery.json");
const DEFAULT_FIXTURES = join(SCRIPT_DIR, "..", "fixtures");
const DEFAULT_OUT = join(SCRIPT_DIR, "d17-report.json");

// Spec D.4 fallback defaults — used ONLY when a fixture carries no sanctioned
// value in its own data. Current fixtures all carry theirs; these never fire
// on the real tree (each fallback use is logged to stderr for auditability).
const FALLBACK = {
  expectedSetups: 24, // MIRROR_FLOOR_FORMULA f(T) = N×(1+P) = 24, spec B.W3.4
  divergenceMax: 0.35, // DIVERGENCE_MAX, spec D.4
  rrrFloor: 2.5, // RRR_FLOOR (D-R1 ratified), spec D.4
  slCeilingPips: 36, // SL_CEILING_PIPS, spec D.4
  slMinPips: 4, // GOLDEN_SL_MIN_PIPS, spec D.4
  tolerancePips: 3, // the only metric (T5), spec D.2 mutant 7
  fxPip: 0.0001,
};

type Json = unknown;

interface BatteryPredicate {
  id: string;
  spec: string;
  block: string;
  kind: string;
  oracle: string;
  fixtures: string[];
}

interface FixtureRecord {
  id: string;
  class?: string;
  data?: Record<string, Json>;
  expect?: string;
  expectedRow?: Record<string, Json>;
  viaFile: string;
}

interface EmbeddedSection {
  key: string;
  data: Json;
}

type Resolution =
  | { kind: "records"; records: FixtureRecord[]; via: string }
  | { kind: "embedded"; sections: EmbeddedSection[]; via: string }
  | { kind: "unresolved"; via: string };

interface EvalRow {
  fixtureId: string;
  oracle: string;
  expect: string | null;
  actual: string;
  pass: boolean | null;
  note?: string;
}

function printHelp(): void {
  console.log(`calibrate.ts — D17 FIRE/SILENT runner + d17-report.json writer (W0 harness)
usage: bun specs/mpse/calibrate.ts [--battery <path>] [--fixtures <dir>] [--out <path>]
  --battery   predicate battery (default: specs/mpse/battery.json)
  --fixtures  fixture corpus dir, searched recursively (default: specs/fixtures/)
  --out       report path (default: specs/mpse/d17-report.json)
exit 0 = every predicate calibrated, born-off, or evidence-only.
exit 1 = any verdict mismatch, malformed fixture, or unresolvable fixture ref.`);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 0);
}

function walkJsonFiles(dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err) {
    throw new Error(`cannot list fixtures dir '${dir}': ${(err as Error).message}`);
  }
  for (const e of entries.sort()) {
    const p = join(dir, e);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(p);
    } catch (err) {
      throw new Error(`cannot stat '${p}': ${(err as Error).message}`);
    }
    if (st.isDirectory()) walkJsonFiles(p, acc);
    else if (e.endsWith(".json")) acc.push(p);
  }
}

function loadJsonFile(path: string): Json {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`cannot read '${path}': ${(err as Error).message}`);
  }
  try {
    return JSON.parse(text) as Json;
  } catch (err) {
    throw new Error(`invalid JSON in '${path}': ${(err as Error).message}`);
  }
}

interface FixtureIndex {
  files: Array<{ path: string; stem: string; normStem: string; stemTokens: Set<string>; records: FixtureRecord[] }>;
  corpus: Map<string, Json>;
}

function buildIndex(fixturesDir: string): FixtureIndex {
  if (!existsSync(fixturesDir)) throw new Error(`fixtures dir absent '${fixturesDir}'`);
  const paths: string[] = [];
  walkJsonFiles(fixturesDir, paths);
  if (paths.length === 0) throw new Error(`no fixture JSON files under '${fixturesDir}'`);
  const files: FixtureIndex["files"] = [];
  const corpus = new Map<string, Json>();
  for (const p of paths) {
    const parsed = loadJsonFile(p);
    const stem = basename(p, ".json");
    corpus.set(stem, parsed);
    const raws = Array.isArray(parsed) ? parsed : [parsed];
    const records: FixtureRecord[] = [];
    for (const r of raws) {
      if (typeof r !== "object" || r === null) {
        throw new Error(`fixture '${p}': top-level entries must be objects`);
      }
      const rec = r as Record<string, Json>;
      if (typeof rec["id"] !== "string") continue; // corpus docs (golden-week) carry no id
      records.push({
        id: rec["id"] as string,
        class: typeof rec["class"] === "string" ? (rec["class"] as string) : undefined,
        data: typeof rec["data"] === "object" && rec["data"] !== null ? (rec["data"] as Record<string, Json>) : undefined,
        expect: typeof rec["expect"] === "string" ? (rec["expect"] as string) : undefined,
        expectedRow: typeof rec["expectedRow"] === "object" && rec["expectedRow"] !== null
          ? (rec["expectedRow"] as Record<string, Json>)
          : undefined,
        viaFile: p,
      });
    }
    files.push({ path: p, stem, normStem: norm(stem), stemTokens: new Set(tokens(stem)), records });
  }
  return { files, corpus };
}

function embeddedSections(ref: string, index: FixtureIndex): EmbeddedSection[] {
  const golden = index.corpus.get("golden-week");
  if (golden === undefined || typeof golden !== "object" || golden === null) return [];
  const g = golden as Record<string, Json>;
  const o = (g["oracle"] ?? {}) as Record<string, Json>;
  // Golden-row pattern first: golden-eu-8 → oracle.eurusd.rows[7] (evidence-only).
  const rowMatch = /golden[-_ ]?(eu|gu)[-_ ]?(\d+)/i.exec(ref);
  if (rowMatch) {
    const pair = rowMatch[1]!.toLowerCase() === "eu" ? "eurusd" : "gbpusd";
    const n = parseInt(rowMatch[2] as string, 10);
    const side = (o[pair] ?? {}) as Record<string, Json>;
    const rows = side["rows"];
    if (Array.isArray(rows) && n >= 1 && n <= rows.length) {
      return [{ key: `golden-week#oracle.${pair}.rows[${String(n)}]`, data: rows[n - 1] as Json }];
    }
    return [];
  }
  const n = norm(ref);
  if (n.includes("monday")) {
    return g["mondayConvergence"] !== undefined
      ? [{ key: "golden-week#mondayConvergence", data: g["mondayConvergence"] as Json }]
      : [];
  }
  if (n.includes("euchain") || n.includes("eurusd") || (n.includes("eu") && n.includes("oracle"))) {
    return o["eurusd"] !== undefined ? [{ key: "golden-week#oracle.eurusd", data: o["eurusd"] as Json }] : [];
  }
  if (n.includes("guchain") || n.includes("gbpusd") || (n.includes("gu") && n.includes("oracle"))) {
    return o["gbpusd"] !== undefined ? [{ key: "golden-week#oracle.gbpusd", data: o["gbpusd"] as Json }] : [];
  }
  if (n.includes("golden")) return [{ key: "golden-week", data: golden }];
  return [];
}

function tokHit(refTok: string, stemTok: string): boolean {
  if (refTok === stemTok) return true;
  if (refTok.length >= 2 && stemTok.includes(refTok)) return true;
  if (stemTok.length >= 2 && refTok.includes(stemTok)) return true;
  return false;
}

function resolveRef(ref: string, index: FixtureIndex): Resolution {
  // Tier 1-2: exact/normalized file or record-id match — but only when the file
  // carries id-bearing records; corpus docs (golden-week.json) fall through to
  // the embedded tier below.
  const withRecords = (files: FixtureIndex["files"]): FixtureIndex["files"] =>
    files.filter((f) => f.records.length > 0);
  const exact = withRecords(index.files.filter((f) => f.stem === ref));
  if (exact.length > 0) {
    return { kind: "records", records: exact.flatMap((f) => f.records), via: `stem:${exact.map((f) => basename(f.path)).join(",")}` };
  }
  const n = norm(ref);
  const normHit = withRecords(index.files.filter((f) => f.normStem === n || f.records.some((r) => norm(r.id) === n)));
  if (normHit.length > 0) {
    return { kind: "records", records: normHit.flatMap((f) => f.records), via: `norm:${normHit.map((f) => basename(f.path)).join(",")}` };
  }
  // Tier 3: golden-row / embedded sections before fuzzy files (golden-eu-8 must
  // not fuzzy-match mutant files).
  const emb = embeddedSections(ref, index);
  if (emb.length > 0) return { kind: "embedded", sections: emb, via: `embedded:${emb.map((s) => s.key).join(",")}` };
  // Tier 4: substring either direction.
  const sub = withRecords(index.files.filter((f) => f.normStem.includes(n) || (n.length > 0 && n.includes(f.normStem))));
  if (sub.length > 0) {
    return { kind: "records", records: sub.flatMap((f) => f.records), via: `substr:${sub.map((f) => basename(f.path)).join(",")}` };
  }
  // Tier 5: full-coverage token score — every ref token must hit a stem token.
  // Max-score file(s) only, so tp-cap-mutant cannot drag in every mutant file.
  const refToks = tokens(ref);
  let best = -1;
  const scored: Array<{ f: FixtureIndex["files"][number]; score: number }> = [];
  for (const f of index.files) {
    if (f.records.length === 0) continue;
    let score = 0;
    for (const rt of refToks) {
      for (const st of f.stemTokens) {
        if (tokHit(rt, st)) {
          score += 1;
          break;
        }
      }
    }
    scored.push({ f, score });
    if (score > best) best = score;
  }
  const winners = scored.filter((s) => s.score === best && best === refToks.length && best > 0);
  if (winners.length > 0) {
    return { kind: "records", records: winners.flatMap((s) => s.f.records), via: `tokens:${winners.map((s) => basename(s.f.path)).join(",")}` };
  }
  return { kind: "unresolved", via: "none" };
}

function normalizeExpect(raw: unknown, fixtureId: string): string {
  if (typeof raw !== "string") throw new Error(`fixture '${fixtureId}': malformed expect (want FIRE|SILENT|VALID|CONTRADICTED|row-produced)`);
  const t = raw.trim().toUpperCase().replace(/-/g, "_");
  if (t === "ROW_PRODUCED" || t === "ROW") return "ROW";
  if (t === "FIRE" || t === "SILENT" || t === "VALID" || t === "CONTRADICTED") return t;
  throw new Error(`fixture '${fixtureId}': malformed expect '${raw}'`);
}

function numField(data: Record<string, Json>, fields: string[], fixtureId: string, what: string): number {
  for (const f of fields) {
    const v = data[f];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  throw new Error(`fixture '${fixtureId}': ${what} needs one of [${fields.join(", ")}] as a finite number`);
}

function strField(data: Record<string, Json>, fields: string[], fixtureId: string, what: string): string {
  for (const f of fields) {
    const v = data[f];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  throw new Error(`fixture '${fixtureId}': ${what} needs one of [${fields.join(", ")}] as a non-empty string`);
}

function natureZoneType(nature: Json, fixtureId: string): string {
  if (typeof nature !== "string") throw new Error(`fixture '${fixtureId}': shape-gate needs anchorZoneType or a nature string naming DEMAND|SUPPLY`);
  const m = /\b(DEMAND|SUPPLY)\b/i.exec(nature);
  if (!m) throw new Error(`fixture '${fixtureId}': nature names no DEMAND|SUPPLY zone class`);
  return m[1] as string;
}

function withFallback(fixtureId: string, present: number | undefined, fallback: number, name: string): number {
  if (present !== undefined) return present;
  console.error(`CALIBRATE_NOTE: fixture '${fixtureId}' carries no ${name} — spec D.4 fallback ${String(fallback)}`);
  return fallback;
}

// Route one expect-carrying record through its class oracle. Every branch
// computes the verdict from the record's data; nothing is fitted to ids.
function evaluateRecord(rec: FixtureRecord): string {
  const cls = (rec.class ?? "").toLowerCase().replace(/[_-]/g, "");
  const data = rec.data ?? {};
  const id = rec.id;
  switch (cls) {
    case "mirrorfloor": {
      const expectedRaw = typeof data["expectedSetups"] === "number"
        ? (data["expectedSetups"] as number)
        : typeof data["n"] === "number" && typeof data["p"] === "number"
        ? (data["n"] as number) * (1 + (data["p"] as number))
        : withFallback(id, undefined, FALLBACK.expectedSetups, "expectedSetups");
      const setupCount = typeof data["setupCount"] === "number"
        ? (data["setupCount"] as number)
        : typeof data["setups"] === "number"
        ? (data["setups"] as number)
        : Array.isArray(data["setups"])
        ? (data["setups"] as Json[]).length
        : undefined;
      if (setupCount === undefined || !Number.isFinite(setupCount)) {
        throw new Error(`fixture '${id}': mirror-floor needs setupCount (or setups) as a finite number`);
      }
      return mirror_floor({ setupCount, expectedSetups: expectedRaw });
    }
    case "sideinversion": {
      const zoneType = typeof data["anchorZoneType"] === "string" && (data["anchorZoneType"] as string).trim().length > 0
        ? (data["anchorZoneType"] as string)
        : natureZoneType(data["nature"], id);
      return side_match({ direction: strField(data, ["direction"], id, "side-inversion"), zoneType });
    }
    case "tpcap": {
      const ceiling = withFallback(
        id,
        typeof data["slCeilingPips"] === "number" ? (data["slCeilingPips"] as number) : undefined,
        FALLBACK.slCeilingPips, "slCeilingPips",
      );
      if (typeof data["riskPips"] === "number") return sl_ceiling({ riskPips: data["riskPips"], slCeilingPips: ceiling });
      return sl_ceiling({
        entry: numField(data, ["entry"], id, "tp-cap"),
        sl: numField(data, ["sl"], id, "tp-cap"),
        pip: typeof data["pip"] === "number" ? (data["pip"] as number) : FALLBACK.fxPip,
        ceilingPips: ceiling,
      });
    }
    case "shapegate": {
      const zoneType = typeof data["anchorZoneType"] === "string" && (data["anchorZoneType"] as string).trim().length > 0
        ? (data["anchorZoneType"] as string)
        : natureZoneType(data["nature"], id);
      return shape_gate({ direction: strField(data, ["direction"], id, "shape-gate"), zoneType });
    }
    case "tolerancedrift": {
      const value = numField(data, ["claimedTolerancePips", "divergence", "value"], id, "tolerance-drift");
      const boundRaw = typeof data["sanctionedTolerancePips"] === "number"
        ? (data["sanctionedTolerancePips"] as number)
        : typeof data["max"] === "number"
        ? (data["max"] as number)
        : withFallback(id, undefined, Number.isInteger(value) ? FALLBACK.tolerancePips : FALLBACK.divergenceMax, "sanctioned bound");
      const quantum = Number.isInteger(value) && Number.isInteger(boundRaw) ? 1 : 1e-9;
      return divergence_le({ value, bound: boundRaw, quantum });
    }
    case "rrrdrift": {
      if (data["claimedFloor"] !== undefined) {
        return rrr_floor({
          claimedFloor: numField(data, ["claimedFloor"], id, "rrr-drift"),
          sanctionedFloor: withFallback(
            id,
            typeof data["sanctionedFloor"] === "number" ? (data["sanctionedFloor"] as number) : undefined,
            FALLBACK.rrrFloor, "sanctionedFloor",
          ),
        });
      }
      if (data["entry"] !== undefined) {
        return rrr_floor({
          entry: numField(data, ["entry"], id, "rrr-drift"),
          sl: numField(data, ["sl"], id, "rrr-drift"),
          tp: numField(data, ["tp"], id, "rrr-drift"),
          floor: withFallback(
            id,
            typeof data["floor"] === "number" ? (data["floor"] as number) : undefined,
            FALLBACK.rrrFloor, "floor",
          ),
        });
      }
      return rrr_floor({
        rrr: numField(data, ["rrr"], id, "rrr-drift"),
        floor: withFallback(
          id,
          typeof data["floor"] === "number" ? (data["floor"] as number) : undefined,
          FALLBACK.rrrFloor, "floor",
        ),
      });
    }
    case "nearedge": {
      return near_edge({
        entry: numField(data, ["entry"], id, "near-edge"),
        rung: numField(data, ["rung"], id, "near-edge"),
        top: numField(data, ["top"], id, "near-edge"),
        pip: typeof data["pip"] === "number" ? (data["pip"] as number) : FALLBACK.fxPip,
        deltaPips: typeof data["deltaPips"] === "number" ? (data["deltaPips"] as number) : undefined,
        expectedEntry: rec.expectedRow !== undefined && typeof rec.expectedRow["e"] === "number"
          ? (rec.expectedRow["e"] as number)
          : undefined,
      });
    }
    case "slmin": {
      const min = withFallback(
        id,
        typeof data["minPips"] === "number" ? (data["minPips"] as number) : undefined,
        FALLBACK.slMinPips, "minPips",
      );
      if (typeof data["widthPips"] === "number") return sl_min({ widthPips: data["widthPips"], minPips: min });
      return sl_min({
        entry: numField(data, ["entry"], id, "sl-min"),
        sl: numField(data, ["sl"], id, "sl-min"),
        pip: typeof data["pip"] === "number" ? (data["pip"] as number) : FALLBACK.fxPip,
        minPips: min,
      });
    }
    case "tfrestriction": {
      const allowed = data["allowed"];
      if (!Array.isArray(allowed)) throw new Error(`fixture '${id}': tf-restriction needs allowed[]`);
      return tf_restriction({ timeframe: strField(data, ["timeframe"], id, "tf-restriction"), allowed });
    }
    case "wallclock": {
      return no_wall_clock({ record: data["record"] !== undefined ? data["record"] : data });
    }
    case "containment": {
      const pip = typeof data["pip"] === "number" ? (data["pip"] as number) : FALLBACK.fxPip;
      if (data["entry"] !== undefined) {
        return containment_subset({
          entry: numField(data, ["entry"], id, "containment"),
          rung: numField(data, ["rung"], id, "containment"),
          top: numField(data, ["top"], id, "containment"),
          pip,
        });
      }
      if (typeof data["inner"] !== "object" || typeof data["outer"] !== "object") {
        throw new Error(`fixture '${id}': containment needs inner+outer bands or entry+rung+top`);
      }
      return containment_subset({ inner: data["inner"], outer: data["outer"], pip });
    }
    case "totality": {
      if (data["actual"] !== undefined) {
        return totality_forall({
          actual: numField(data, ["actual"], id, "totality"),
          expected: numField(data, ["expected"], id, "totality"),
        });
      }
      return totality_forall({
        designationCount: numField(data, ["designationCount", "designations"], id, "totality"),
        days: numField(data, ["days"], id, "totality"),
        pairs: numField(data, ["pairs"], id, "totality"),
        directions: numField(data, ["directions"], id, "totality"),
      });
    }
    default:
      throw new Error(`fixture '${id}': unknown class '${String(rec.class)}' (no oracle route)`);
  }
}

const ORACLE_ALIAS: Record<string, string> = {
  side_inversion_violation: "side_match",
  mirror_floor_contradicted: "mirror_floor",
  cascade_divergence_exceeded: "divergence_le",
  designation_incomplete: "totality_forall",
  e3_disobeyed_e2: "side_match",
  "golden-week-discharge": "totality_forall",
  "d17-eu2-near-edge-row-produced": "near_edge",
  "d17-eu4-deep-silent": "shape_gate",
  "d17-tolerance-drift-fire": "divergence_le",
  "d17-side-inversion-pair": "side_match",
};

function run(argv: string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const args = [...argv];
  const takeOpt = (name: string, dflt: string): string => {
    const i = args.indexOf(name);
    if (i === -1) return dflt;
    if (i + 1 >= args.length) throw new Error(`missing value for ${name}`);
    const v = args[i + 1] as string;
    args.splice(i, 2);
    return v;
  };
  let batteryPath: string;
  let fixturesDir: string;
  let out: string;
  try {
    batteryPath = resolve(takeOpt("--battery", DEFAULT_BATTERY));
    fixturesDir = resolve(takeOpt("--fixtures", DEFAULT_FIXTURES));
    out = resolve(takeOpt("--out", DEFAULT_OUT));
    if (args.length > 0) throw new Error(`unexpected args: ${args.join(" ")}`);
  } catch (err) {
    console.error(`CALIBRATE_FAIL: ${(err as Error).message}`);
    return 1;
  }

  let battery: { fingerprint: string; blockCount: number; predicateCount: number; predicates: BatteryPredicate[] };
  try {
    const raw = loadJsonFile(batteryPath);
    if (typeof raw !== "object" || raw === null) throw new Error("battery root must be an object");
    const b = raw as Record<string, Json>;
    if (typeof b["fingerprint"] !== "string" || !Array.isArray(b["predicates"])) {
      throw new Error("battery must carry {fingerprint, predicates[]}");
    }
    battery = {
      fingerprint: b["fingerprint"] as string,
      blockCount: typeof b["blockCount"] === "number" ? (b["blockCount"] as number) : (b["predicates"] as Json[]).length,
      predicateCount: typeof b["predicateCount"] === "number" ? (b["predicateCount"] as number) : (b["predicates"] as Json[]).length,
      predicates: (b["predicates"] as BatteryPredicate[]),
    };
    for (const p of battery.predicates) {
      if (typeof p.id !== "string" || typeof p.oracle !== "string" || !Array.isArray(p.fixtures)) {
        throw new Error("every battery predicate must carry {id, oracle, fixtures[]}");
      }
    }
  } catch (err) {
    console.error(`CALIBRATE_FAIL: cannot load battery '${batteryPath}': ${(err as Error).message}`);
    return 1;
  }

  let index: FixtureIndex;
  try {
    index = buildIndex(fixturesDir);
  } catch (err) {
    console.error(`CALIBRATE_FAIL: ${(err as Error).message}`);
    return 1;
  }

  const calibrated: string[] = [];
  const flagged: Array<{ predicate: string; fixture: string; expect: string; actual: string; reason?: string }> = [];
  const bornOff: Array<{ predicate: string; reason: string }> = [];
  const evidenceOnly: string[] = [];
  const verdicts: Record<string, { predicate: string; oracle: string; expect: string | null; actual: string; pass: boolean | null; note?: string }> = {};
  const foundingControls: Array<{ id: string; expectedSetups: number; verdict: string }> = [];
  const mirrorTruths = new Set<number>();

  const recordVerdict = (row: EvalRow, predicate: string): void => {
    verdicts[row.fixtureId] = {
      predicate, oracle: row.oracle, expect: row.expect, actual: row.actual, pass: row.pass,
      ...(row.note !== undefined ? { note: row.note } : {}),
    };
  };

  for (const pred of battery.predicates) {
    if (pred.fixtures.length === 0) {
      bornOff.push({ predicate: pred.id, reason: "EXCLUDED_BORN_OFF: no fixtures declared" });
      continue;
    }
    let gated = 0;
    let info = 0;
    let bad = false;
    for (const ref of pred.fixtures) {
      let res: Resolution;
      try {
        res = resolveRef(ref, index);
      } catch (err) {
        console.error(`CALIBRATE_FAIL: predicate '${pred.id}' ref '${ref}': ${(err as Error).message}`);
        return 1;
      }
      if (res.kind === "unresolved") {
        flagged.push({ predicate: pred.id, fixture: ref, expect: "RESOLVED", actual: "UNRESOLVED", reason: `fixture ref '${ref}' matches no file or golden-week section` });
        bad = true;
        continue;
      }
      if (res.kind === "embedded") {
        for (const sec of res.sections) {
          info += 1;
          recordVerdict({
            fixtureId: `${pred.id}#${sec.key}`, oracle: ORACLE_ALIAS[pred.oracle.toLowerCase()] ?? pred.oracle,
            expect: null, actual: "EVIDENCE", pass: null, note: `embedded section via ${res.via} — recorded, never gating`,
          }, pred.id);
        }
        continue;
      }
      if (res.records.length === 0) {
        flagged.push({ predicate: pred.id, fixture: ref, expect: "RECORDS", actual: "EMPTY_FILE", reason: `file matched but carries no id-bearing records (via ${res.via})` });
        bad = true;
        continue;
      }
      // Multi-record files: a ref naming a record id selects ONLY that record.
      // (Whole-file fan-out stays for refs that name no single record, e.g.
      // mutant-side-inversion intentionally discharging both v452 and v453.)
      const refNorm = norm(ref);
      const named = res.records.filter((r) => r.id === ref || norm(r.id) === refNorm);
      const targets = named.length > 0 ? named : res.records;
      for (const rec of targets) {
        if (rec.class === "mirror-floor" && typeof rec.data?.["expectedSetups"] === "number") {
          mirrorTruths.add(rec.data["expectedSetups"] as number);
        }
        if (rec.expect === undefined) {
          info += 1;
          recordVerdict({
            fixtureId: rec.id, oracle: pred.oracle, expect: null, actual: "EVIDENCE", pass: null,
            note: `no expect field (via ${res.via}) — recorded, never gating`,
          }, pred.id);
          continue;
        }
        gated += 1;
        let expect: string;
        try {
          expect = normalizeExpect(rec.expect, rec.id);
        } catch (err) {
          console.error(`CALIBRATE_FAIL: predicate '${pred.id}': ${(err as Error).message}`);
          return 1;
        }
        let actual: string;
        try {
          actual = evaluateRecord(rec);
        } catch (err) {
          const msg = err instanceof OracleError ? err.message : (err as Error).message;
          console.error(`CALIBRATE_FAIL: predicate '${pred.id}' fixture '${rec.id}': ${msg}`);
          return 1;
        }
        const pass = actual === expect;
        recordVerdict({ fixtureId: rec.id, oracle: pred.oracle, expect, actual, pass, note: `via ${res.via}` }, pred.id);
        if (!pass) {
          flagged.push({ predicate: pred.id, fixture: rec.id, expect, actual });
          bad = true;
        }
      }
    }
    if (gated === 0 && !bad) {
      if (info > 0) evidenceOnly.push(pred.id);
      else bornOff.push({ predicate: pred.id, reason: "EXCLUDED_BORN_OFF: no resolvable fixtures" });
    } else if (!bad) {
      calibrated.push(pred.id);
    }
  }

  // The founding VALID control: synthesized from the sanctioned truth READ from
  // the mirror-floor fixtures — the D17 twin of the 40/13 CONTRADICTED legs.
  if (mirrorTruths.size > 1) {
    console.error(`CALIBRATE_FAIL: mirror-floor fixtures disagree on expectedSetups: ${[...mirrorTruths].join(", ")}`);
    return 1;
  }
  if (mirrorTruths.size === 1) {
    const truth = [...mirrorTruths][0] as number;
    const controlId = `mirror-floor-${truth}`;
    let verdict: string;
    try {
      verdict = mirror_floor({ setupCount: truth, expectedSetups: truth });
    } catch (err) {
      console.error(`CALIBRATE_FAIL: founding control broken: ${(err as Error).message}`);
      return 1;
    }
    foundingControls.push({ id: controlId, expectedSetups: truth, verdict });
    verdicts[controlId] = {
      predicate: "founding-control(f(T)=N×(1+P))", oracle: "mirror_floor",
      expect: "VALID", actual: verdict, pass: verdict === "VALID",
      note: `synthesized from fixtures' declared expectedSetups=${String(truth)}`,
    };
    if (verdict !== "VALID") {
      flagged.push({ predicate: "founding-control", fixture: controlId, expect: "VALID", actual: verdict });
    }
  }

  const failed = flagged.length > 0;
  const report = {
    batteryFingerprint: battery.fingerprint,
    blockCount: battery.blockCount,
    predicateCount: battery.predicateCount,
    calibrated: [...calibrated].sort(),
    flagged,
    born_off: bornOff,
    evidence_only: [...evidenceOnly].sort(),
    foundingControls,
    verdicts: Object.fromEntries(Object.entries(verdicts).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
  try {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  } catch (err) {
    console.error(`CALIBRATE_FAIL: cannot write '${out}': ${(err as Error).message}`);
    return 1;
  }
  if (failed) {
    console.error(`CALIBRATE_FAIL: ${String(flagged.length)} mismatch(es) — report: ${out}`);
    for (const f of flagged) {
      console.error(`  - ${f.predicate} :: ${f.fixture}: expect ${f.expect}, got ${f.actual}${f.reason !== undefined ? ` (${f.reason})` : ""}`);
    }
    return 1;
  }
  console.log(`CALIBRATE_OK: ${String(calibrated.length)} calibrated, ${String(bornOff.length)} born-off, ${String(evidenceOnly.length)} evidence-only, ${String(foundingControls.length)} founding control(s)`);
  console.log(`d17-report: ${out}`);
  return 0;
}

process.exitCode = run(process.argv.slice(2));
