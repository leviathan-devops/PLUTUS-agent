// src/e2/computations/oracles.ts — the MPSE oracle subset E2 discharges through.
//
// VENDORED (verbatim logic) from specs/mpse/oracle-registry.ts — mirror_floor,
// side_match, divergence_le, totality_forall, quantize + FireVerdict/FloorVerdict.
// WHY A COPY: tsconfig rootDir is ./src, so importing ../../../specs/*.ts is
// error TS6059 (GATE-W3 tsc red). specs/mpse/oracle-registry.ts imports nothing
// and is pure, so this file pins the identical semantics under src/. Any change
// here MUST be diffed against the registry source:
//   diff <(sed -n '/^export type FireVerdict/,/^}/p;/^export class OracleError/,/^}/p;/Scale a real value/,/sideConsistent/p;/── 1. mirror_floor/,/── 5. rrr_floor/p' ../../../specs/mpse/oracle-registry.ts)
// Doctrine sources: spec D.4 constants table (DIVERGENCE_MAX 0.35,
// MIRROR_FLOOR_FORMULA N×(1+P)=24), spec B.W3.4 (f(T) discharge),
// spec B.W3.5 (side-inversion D17 pair).

export type FireVerdict = "FIRE" | "SILENT";
export type FloorVerdict = "VALID" | "CONTRADICTED";
export type Direction = "LONG" | "SHORT";
export type ZoneType = "DEMAND" | "SUPPLY";

export class OracleError extends Error {
  readonly oracle: string;
  readonly field: string;
  constructor(oracle: string, field: string, detail: string) {
    super(`[${oracle}] malformed input — field '${field}': ${detail}`);
    this.name = "OracleError";
    this.oracle = oracle;
    this.field = field;
  }
}

/** Scale a real value to its integer quantum bucket. All comparisons use these. */
export function quantize(value: number, quantum: number): number {
  if (!Number.isFinite(value)) {
    throw new OracleError("quantize", "value", `expected finite number, got ${String(value)}`);
  }
  if (!Number.isFinite(quantum) || quantum <= 0) {
    throw new OracleError("quantize", "quantum", `expected positive quantum, got ${String(quantum)}`);
  }
  return Math.round(value / quantum);
}

function needFinite(oracle: string, field: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OracleError(oracle, field, `expected finite number, got ${String(value)}`);
  }
  return value;
}

function needNonEmptyString(oracle: string, field: string, value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OracleError(oracle, field, `expected non-empty string, got ${String(value)}`);
  }
  return value.trim();
}

function parseDirection(oracle: string, value: unknown): Direction {
  const s = needNonEmptyString(oracle, "direction", value).toUpperCase();
  if (s === "LONG" || s === "SHORT") return s;
  throw new OracleError(oracle, "direction", `expected LONG|SHORT, got '${s}'`);
}

function parseZoneType(oracle: string, value: unknown): ZoneType {
  const s = needNonEmptyString(oracle, "zoneType", value).toUpperCase();
  if (s === "DEMAND" || s === "SUPPLY") return s;
  throw new OracleError(oracle, "zoneType", `expected DEMAND|SUPPLY, got '${s}'`);
}

/** LONG must hold DEMAND, SHORT must hold SUPPLY (spec B.W3.4 D50 rule). */
function sideConsistent(direction: Direction, zoneType: ZoneType): boolean {
  return direction === "LONG" ? zoneType === "DEMAND" : zoneType === "SUPPLY";
}

// ── 1. mirror_floor ──────────────────────────────────────────────────────
// f(T) = N×(1+P): VALID iff the observed setup population equals the founding
// truth, else CONTRADICTED (overgen AND undergen both contradict — spec B.W3.4:
// 40 → CONTRADICTED, 13 → CONTRADICTED, 24 → VALID).
export interface MirrorFloorInput {
  setupCount: unknown;
  expectedSetups: unknown;
}
export function mirror_floor(input: MirrorFloorInput): FloorVerdict {
  const actual = needFinite("mirror_floor", "setupCount", input.setupCount);
  const expected = needFinite("mirror_floor", "expectedSetups", input.expectedSetups);
  if (!Number.isInteger(actual) || actual < 0) {
    throw new OracleError("mirror_floor", "setupCount", `expected non-negative integer, got ${String(actual)}`);
  }
  if (!Number.isInteger(expected) || expected < 0) {
    throw new OracleError("mirror_floor", "expectedSetups", `expected non-negative integer, got ${String(expected)}`);
  }
  return actual === expected ? "VALID" : "CONTRADICTED";
}

// ── 2. side_match ────────────────────────────────────────────────────────
// D50 side-match: a LONG mirror consuming SUPPLY (or SHORT consuming DEMAND)
// is SIDE_INVERSION_VIOLATION → FIRE; the correct-side pairing stays SILENT.
export interface SideMatchInput {
  direction: unknown;
  zoneType: unknown;
}
export function side_match(input: SideMatchInput): FireVerdict {
  const direction = parseDirection("side_match", input.direction);
  const zoneType = parseZoneType("side_match", input.zoneType);
  return sideConsistent(direction, zoneType) ? "SILENT" : "FIRE";
}

// ── 3. divergence_le ─────────────────────────────────────────────────────
// Generic ceiling gate: FIRE iff value exceeds bound (integer-compared at the
// given quantum — pips use quantum 1, ratios use 1e-9). Serves chain divergence
// (bound 0.35, spec D.4 DIVERGENCE_MAX) and tolerance-drift (3p sanctioned).
export interface DivergenceInput {
  value: unknown;
  bound: unknown;
  quantum?: unknown;
}
export function divergence_le(input: DivergenceInput): FireVerdict {
  const value = needFinite("divergence_le", "value", input.value);
  const bound = needFinite("divergence_le", "bound", input.bound);
  const quantum = input.quantum === undefined ? 1e-9 : needFinite("divergence_le", "quantum", input.quantum);
  return quantize(value, quantum) > quantize(bound, quantum) ? "FIRE" : "SILENT";
}

// ── 4. totality_forall ───────────────────────────────────────────────────
// Bounded-forall discharge: VALID iff the observed designation population
// equals the required total (days×pairs×directions, e.g. 5×3×2 = 90 rows;
// spec B.W3.5 DESIGNATION TOTALITY ORACLE).
export type TotalityInput =
  | { actual: unknown; expected: unknown }
  | { designationCount: unknown; days: unknown; pairs: unknown; directions: unknown };
export function totality_forall(input: TotalityInput): FloorVerdict {
  let actual: number;
  let expected: number;
  if ("actual" in input) {
    actual = needFinite("totality_forall", "actual", input.actual);
    expected = needFinite("totality_forall", "expected", input.expected);
  } else {
    actual = needFinite("totality_forall", "designationCount", input.designationCount);
    const days = needFinite("totality_forall", "days", input.days);
    const pairs = needFinite("totality_forall", "pairs", input.pairs);
    const directions = needFinite("totality_forall", "directions", input.directions);
    for (const [name, v] of [["days", days], ["pairs", pairs], ["directions", directions]] as const) {
      if (!Number.isInteger(v) || v <= 0) {
        throw new OracleError("totality_forall", name, `expected positive integer, got ${String(v)}`);
      }
    }
    expected = days * pairs * directions;
  }
  if (!Number.isInteger(actual) || actual < 0) {
    throw new OracleError("totality_forall", "actual", `expected non-negative integer, got ${String(actual)}`);
  }
  return actual === expected ? "VALID" : "CONTRADICTED";
}
