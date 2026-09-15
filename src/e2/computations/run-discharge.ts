import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { side_match } from "./oracles";
import { dischargeMirrorFloor } from "./mirrorFloor";
import { ComputationError } from "./errors";

const HERE = import.meta.dir;
const FIXTURE_ROOT = join(HERE, "..", "..", "..", "specs", "fixtures");
const MUTANTS_ROOT = join(FIXTURE_ROOT, "mutants");
const BATTERY_PATH = join(HERE, "..", "..", "..", "specs", "mpse", "battery.json");
const OUT_PATH = join(HERE, "..", "..", "..", "specs", "e2-discharge.json");

interface DischargeCase {
  id: string;
  oracle: string;
  expect: string;
  actual: string;
  pass: boolean;
}

function readJson(rel: string, root: string): Record<string, unknown> {
  const path = join(root, rel);
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new ComputationError("run-discharge", rel, `unreadable: ${String(err)}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ComputationError("run-discharge", rel, `invalid JSON: ${String(err)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new ComputationError("run-discharge", rel, "parsed to non-object");
  }
  return parsed as Record<string, unknown>;
}

function needRec(field: string, value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new ComputationError("run-discharge", field, `expected object, got ${String(value)}`);
  }
  return value as Record<string, unknown>;
}

function needStr(field: string, value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ComputationError("run-discharge", field, `expected non-empty string, got ${String(value)}`);
  }
  return value;
}

function dischargeMirrorCase(rel: string): DischargeCase {
  const fixture = readJson(rel, MUTANTS_ROOT);
  const data = needRec("data", fixture["data"]);
  const actual = dischargeMirrorFloor(data["setupCount"], data["expectedSetups"]);
  const expect = needStr("expect", fixture["expect"]);
  return { id: needStr("id", fixture["id"]), oracle: "mirror_floor", expect, actual, pass: actual === expect };
}

function dischargeSideCase(rel: string): DischargeCase {
  const fixture = readJson(rel, MUTANTS_ROOT);
  const data = needRec("data", fixture["data"]);
  const actual = side_match({ direction: data["direction"], zoneType: data["anchorZoneType"] });
  const expect = needStr("expect", fixture["expect"]);
  return { id: needStr("id", fixture["id"]), oracle: "side_match", expect, actual, pass: actual === expect };
}

function main(): void {
  const battery = readJson("battery.json", join(HERE, "..", "..", "..", "specs", "mpse"));
  const fingerprint = needStr("fingerprint", battery["fingerprint"]);

  const over = readJson("mutant-1-40setup.json", MUTANTS_ROOT);
  const overData = needRec("data", over["data"]);
  const foundingExpected = overData["expectedSetups"];
  if (typeof foundingExpected !== "number" || !Number.isInteger(foundingExpected) || foundingExpected <= 0) {
    throw new ComputationError("run-discharge", "expectedSetups", `founding control needs the fixtures' declared expectedSetups, got ${String(foundingExpected)}`);
  }
  const foundingActual = dischargeMirrorFloor(foundingExpected, foundingExpected);
  const founding: DischargeCase = {
    id: "mirror-floor-24",
    oracle: "mirror_floor",
    expect: "VALID",
    actual: foundingActual,
    pass: foundingActual === "VALID",
  };

  const cases: DischargeCase[] = [
    dischargeMirrorCase("mutant-1-40setup.json"),
    dischargeMirrorCase("mutant-2-13setup.json"),
    founding,
    dischargeSideCase("mutant-3-sideinversion-v452.json"),
    dischargeSideCase("mutant-4-sideinversion-v453-silent.json"),
  ];
  const passed = cases.filter((c) => c.pass).length;
  const report = {
    batteryFingerprint: fingerprint,
    caseCount: cases.length,
    passed,
    overall: passed === cases.length ? "PASS" : "FAIL",
    cases,
  };
  writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
  for (const c of cases) {
    console.log(`${c.pass ? "PASS" : "FAIL"} ${c.id} [${c.oracle}] expect=${c.expect} actual=${c.actual}`);
  }
  console.log(`discharge ${report.overall}: ${passed}/${cases.length} -> ${OUT_PATH}`);
  if (report.overall !== "PASS") process.exit(1);
}

try {
  main();
} catch (err) {
  console.error(`[run-discharge] FATAL ${String(err)}`);
  process.exit(1);
}
