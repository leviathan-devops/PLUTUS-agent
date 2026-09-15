// specs/mpse/oracle-registry.ts — the W0 typed oracle implementations.
//
// The ten canonical oracles every S-file `expr:` references, plus two composed
// evaluators (shape_gate, near_edge) the D17 mutant classes route through.
// Every oracle is a PURE function over its input record. Every numeric comparison
// is pip-quantized: values are scaled to integers (Math.round(v / quantum)) and
// only integers are ever compared — zero float-ordering false positives by
// construction. Malformed input THROWS OracleError (fail-closed: a crashing
// predicate counts AGAINST, never silently passes).
//
// Doctrine sources: spec D.4 constants table (DIVERGENCE_MAX 0.35, RRR_FLOOR 2.5,
// SL_CEILING_PIPS 36, GOLDEN_SL_MIN_PIPS 4, MIRROR_FLOOR_FORMULA N×(1+P)=24),
// spec B.W3.4 (f(T) discharge), spec B.W3.5 (side-inversion D17 pair).
// No external deps — node builtins only (this file imports nothing).

export type FireVerdict = "FIRE" | "SILENT";
export type FloorVerdict = "VALID" | "CONTRADICTED";
export type RowVerdict = "ROW" | "CONTRADICTED";
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

// ── 5. rrr_floor ─────────────────────────────────────────────────────────
// RRR floor (ratified 2.5, D-R1): FIRE iff the RRR (computed from E/SL/TP or
// carried) falls below the floor. A zero risk distance is malformed (fail-closed,
// never a silent pass).
export type RrrFloorInput =
  | { rrr: unknown; floor: unknown }
  | { entry: unknown; sl: unknown; tp: unknown; floor: unknown }
  | { claimedFloor: unknown; sanctionedFloor: unknown };
export function rrr_floor(input: RrrFloorInput): FireVerdict {
  let rrr: number;
  let floor: number;
  if ("claimedFloor" in input) {
    rrr = needFinite("rrr_floor", "claimedFloor", input.claimedFloor);
    floor = needFinite("rrr_floor", "sanctionedFloor", input.sanctionedFloor);
  } else if ("entry" in input) {
    const entry = needFinite("rrr_floor", "entry", input.entry);
    const sl = needFinite("rrr_floor", "sl", input.sl);
    const tp = needFinite("rrr_floor", "tp", input.tp);
    floor = needFinite("rrr_floor", "floor", input.floor);
    const risk = Math.abs(entry - sl);
    if (risk === 0) throw new OracleError("rrr_floor", "sl", "zero risk distance — entry equals SL");
    rrr = Math.abs(tp - entry) / risk;
  } else {
    rrr = needFinite("rrr_floor", "rrr", input.rrr);
    floor = needFinite("rrr_floor", "floor", input.floor);
  }
  return quantize(rrr, 1e-9) < quantize(floor, 1e-9) ? "FIRE" : "SILENT";
}

// ── 6. sl_ceiling ────────────────────────────────────────────────────────
// SL depth ceiling (36p HARD, spec D.4 SL_CEILING_PIPS): FIRE iff the SL width
// exceeds the ceiling. Width in integer pips when carried, else pip-quantized
// from entry/SL at the given pip size.
export type SlCeilingInput =
  | { widthPips: unknown; ceilingPips: unknown }
  | { entry: unknown; sl: unknown; pip: unknown; ceilingPips: unknown }
  | { riskPips: unknown; slCeilingPips: unknown };
export function sl_ceiling(input: SlCeilingInput): FireVerdict {
  let widthPips: number;
  let ceilingPips: number;
  if ("riskPips" in input) {
    widthPips = needFinite("sl_ceiling", "riskPips", input.riskPips);
    ceilingPips = needFinite("sl_ceiling", "slCeilingPips", input.slCeilingPips);
  } else if ("entry" in input) {
    const entry = needFinite("sl_ceiling", "entry", input.entry);
    const sl = needFinite("sl_ceiling", "sl", input.sl);
    const pip = needFinite("sl_ceiling", "pip", input.pip);
    ceilingPips = needFinite("sl_ceiling", "ceilingPips", input.ceilingPips);
    widthPips = Math.abs(quantize(entry, pip) - quantize(sl, pip));
  } else {
    widthPips = needFinite("sl_ceiling", "widthPips", input.widthPips);
    ceilingPips = needFinite("sl_ceiling", "ceilingPips", input.ceilingPips);
  }
  return quantize(widthPips, 0.1) > quantize(ceilingPips, 0.1) ? "FIRE" : "SILENT";
}

// ── 7. sl_min ────────────────────────────────────────────────────────────
// Golden SL minimum (4p, spec D.4 GOLDEN_SL_MIN_PIPS): FIRE iff the SL width
// is tighter than the minimum.
export type SlMinInput =
  | { widthPips: unknown; minPips: unknown }
  | { entry: unknown; sl: unknown; pip: unknown; minPips: unknown };
export function sl_min(input: SlMinInput): FireVerdict {
  let widthPips: number;
  let minPips: number;
  if ("entry" in input) {
    const entry = needFinite("sl_min", "entry", input.entry);
    const sl = needFinite("sl_min", "sl", input.sl);
    const pip = needFinite("sl_min", "pip", input.pip);
    minPips = needFinite("sl_min", "minPips", input.minPips);
    widthPips = Math.abs(quantize(entry, pip) - quantize(sl, pip));
  } else {
    widthPips = needFinite("sl_min", "widthPips", input.widthPips);
    minPips = needFinite("sl_min", "minPips", input.minPips);
  }
  return quantize(widthPips, 0.1) < quantize(minPips, 0.1) ? "FIRE" : "SILENT";
}

// ── 8. containment_subset ────────────────────────────────────────────────
// Structural subset (telescoping law S-6, LQZ nesting): FIRE iff the inner band
// is NOT contained in the outer band. All four edges pip-quantized to integers
// before comparison. Entry/rung/top form is entry-within-rung sugar.
export type ContainmentInput =
  | { inner: unknown; outer: unknown; pip?: unknown }
  | { entry: unknown; rung: unknown; top: unknown; pip?: unknown };
interface Band {
  floor: number;
  ceiling: number;
}
function parseBand(oracle: string, field: string, value: unknown, pip: number): Band {
  if (typeof value !== "object" || value === null) {
    throw new OracleError(oracle, field, `expected {floor, ceiling}, got ${String(value)}`);
  }
  const rec = value as Record<string, unknown>;
  const floor = quantize(needFinite(oracle, `${field}.floor`, rec["floor"]), pip);
  const ceiling = quantize(needFinite(oracle, `${field}.ceiling`, rec["ceiling"]), pip);
  if (floor > ceiling) {
    throw new OracleError(oracle, field, `inverted band floor ${String(rec["floor"])} > ceiling ${String(rec["ceiling"])}`);
  }
  return { floor, ceiling };
}
export function containment_subset(input: ContainmentInput): FireVerdict {
  const rawPip = "pip" in input && input.pip !== undefined ? input.pip : 0.0001;
  const pip = needFinite("containment_subset", "pip", rawPip);
  let inner: Band;
  let outer: Band;
  if ("entry" in input) {
    const entry = quantize(needFinite("containment_subset", "entry", input.entry), pip);
    const rung = quantize(needFinite("containment_subset", "rung", input.rung), pip);
    const top = quantize(needFinite("containment_subset", "top", input.top), pip);
    inner = { floor: entry, ceiling: entry };
    outer = { floor: Math.min(rung, top), ceiling: Math.max(rung, top) };
  } else {
    inner = parseBand("containment_subset", "inner", input.inner, pip);
    outer = parseBand("containment_subset", "outer", input.outer, pip);
  }
  const contained = inner.floor >= outer.floor && inner.ceiling <= outer.ceiling;
  return contained ? "SILENT" : "FIRE";
}

// ── 9. tf_restriction ────────────────────────────────────────────────────
// Timeframe restriction (e.g. LQZ detection NEVER on 4H — doctrine register #8):
// FIRE iff the timeframe is outside the allowed set.
export interface TfRestrictionInput {
  timeframe: unknown;
  allowed: unknown;
}
export function tf_restriction(input: TfRestrictionInput): FireVerdict {
  const timeframe = needNonEmptyString("tf_restriction", "timeframe", input.timeframe).toUpperCase();
  if (!Array.isArray(input.allowed) || input.allowed.length === 0) {
    throw new OracleError("tf_restriction", "allowed", `expected non-empty string array, got ${String(input.allowed)}`);
  }
  const allowed = input.allowed.map((t) => needNonEmptyString("tf_restriction", "allowed[]", t).toUpperCase());
  return allowed.includes(timeframe) ? "SILENT" : "FIRE";
}

// ── 10. no_wall_clock ────────────────────────────────────────────────────
// Determinism process contract (S-7): FIRE iff the record carries wall-clock
// fields (timestamps, dates, Date.now-style provenance). Content hashes,
// session ids and analysis-point constants are NOT wall-clock → SILENT.
// Bounded-depth, cycle-safe traversal.
const WALL_CLOCK_KEYS = new Set([
  "timestamp", "wallclock", "wall_clock", "datetime", "date", "createdat",
  "created_at", "now", "epochms", "epoch_ms", "clocktime", "generatedat",
  "generated_at", "runat", "run_at",
]);
export function no_wall_clock(input: { record: unknown }): FireVerdict {
  if (typeof input.record !== "object" || input.record === null) {
    throw new OracleError("no_wall_clock", "record", `expected object, got ${String(input.record)}`);
  }
  const seen = new Set<object>();
  const stack: Array<{ node: unknown; depth: number }> = [{ node: input.record, depth: 0 }];
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === undefined) break;
    const { node, depth } = top;
    if (depth > 10 || node === null || typeof node !== "object") continue;
    if (seen.has(node as object)) continue;
    seen.add(node as object);
    if (Array.isArray(node)) {
      for (const item of node) stack.push({ node: item, depth: depth + 1 });
      continue;
    }
    for (const key of Object.keys(node)) {
      const squashed = key.toLowerCase().replace(/[_-]/g, "");
      if (WALL_CLOCK_KEYS.has(squashed)) return "FIRE";
      stack.push({ node: (node as Record<string, unknown>)[key], depth: depth + 1 });
    }
  }
  return "SILENT";
}

// ── Composed evaluators ──────────────────────────────────────────────────
// shape_gate: the shape-gating legality check (D17 mutant 6 — the EU #4 deep
// rung is a legal deep demand entry → SILENT). Same side-consistency core as
// side_match over the nature-declared zone class; a SHORT claiming a deep
// demand (or LONG claiming supply) is a gating violation → FIRE.
export interface ShapeGateInput {
  direction: unknown;
  zoneType: unknown;
}
export function shape_gate(input: ShapeGateInput): FireVerdict {
  const direction = parseDirection("shape_gate", input.direction);
  const zoneType = parseZoneType("shape_gate", input.zoneType);
  return sideConsistent(direction, zoneType) ? "SILENT" : "FIRE";
}

// near_edge: the near-edge designation must produce its row (D17 mutant 9 —
// rung 1.14100, top 1.14120, Δ1.0p). ROW iff the entry sits inside the rung
// band (pip-quantized containment) AND matches the expected row entry when one
// is declared; else CONTRADICTED. Declared delta cross-checked fail-closed.
export interface NearEdgeInput {
  entry: unknown;
  rung: unknown;
  top: unknown;
  pip?: unknown;
  deltaPips?: unknown;
  expectedEntry?: unknown;
}
export function near_edge(input: NearEdgeInput): RowVerdict {
  const rawPip = input.pip === undefined ? 0.0001 : input.pip;
  const pip = needFinite("near_edge", "pip", rawPip);
  const entry = quantize(needFinite("near_edge", "entry", input.entry), pip);
  const rung = quantize(needFinite("near_edge", "rung", input.rung), pip);
  const top = quantize(needFinite("near_edge", "top", input.top), pip);
  const lo = Math.min(rung, top);
  const hi = Math.max(rung, top);
  if (entry < lo || entry > hi) return "CONTRADICTED";
  if (input.deltaPips !== undefined) {
    const declared = needFinite("near_edge", "deltaPips", input.deltaPips);
    const computed = Math.abs(entry - rung);
    if (Math.abs(computed - declared) > 0.05) {
      throw new OracleError(
        "near_edge",
        "deltaPips",
        `declared ${String(declared)}p disagrees with computed ${String(computed)}p from entry/rung`,
      );
    }
  }
  if (input.expectedEntry !== undefined) {
    const expected = quantize(needFinite("near_edge", "expectedEntry", input.expectedEntry), pip);
    if (entry !== expected) return "CONTRADICTED";
  }
  return "ROW";
}

export const ORACLES = {
  mirror_floor,
  side_match,
  divergence_le,
  totality_forall,
  rrr_floor,
  sl_ceiling,
  sl_min,
  containment_subset,
  tf_restriction,
  no_wall_clock,
} as const;

export type OracleName = keyof typeof ORACLES;
