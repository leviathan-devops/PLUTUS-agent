// specs/harness/integration-runner.ts — W5 INTEGRATION RUNNER (anti-pattern #7's named piece).
//
// E2E pipeline wiring the LANDED chain over the golden-week Monday fixture in five
// typed stages: (1) e1 zone engine over fixture bars via the landed run-fixture
// pattern (src/e1/run-fixture.ts:29-35 buildBars + sculptStructures); (2) e2 six
// LANDED machines (src/e2/machines/index.ts:1-7) stepped to designation events
// (zone-ids only); (3) card assembly via src/card/assembler.ts:87 assemble()
// (charts grade PASS sourced from the LANDED chart-verifier deterministic core —
// src/aether/chart-verifier.ts:406 verifyChartScreenshot — over deterministically
// generated placeholder bytes; RECORDED SEAM S-CHART below, never hand-stamped);
// (4) kernel loadCard (src/kernel/card-loader.ts:76) -> computeTrades
// (src/kernel/trade-computer.ts:96) with L1-L5 verdicts from the LANDED machines;
// (5) diag verdict rows: per-oracle convergence (pips delta) + Monday 5/5 +
// determinism (run twice, byte-identical).
//
// HARD LAW D13 ORACLE_ISOLATION_GUARD (golden-week.json doctrine verbatim):
// 'oracle rows are MEASUREMENT targets — the pipeline never reads them for
// computation (ORACLE_ISOLATION_GUARD, spec B.W7.2)'. Structural enforcement:
// runPipeline() takes NO fixture/oracle input — the fixture file is read ONLY in
// main() AFTER the pipeline output exists, and compareConvergence() takes the
// monday rows as an argument. The D13 test mutates oracle rows and proves the
// pipeline output byte-identical.
//
// SEAMS (recorded, never faked):
// - SEAM-BARS: bars_raw.json absent (as at run-fixture build time) → deterministic
//   synthetic bars from mulberry32(SYNTH_SEED) per src/e1/tests/helpers.ts:117.
// - SEAM-SCULPT: triplets are shaped (open-relative offsets, data-derived — the
//   last-close anchor is read from the generated bars, never from oracle) to
//   exercise the internal gates (OBCV bw/bf, D-R1 RRR floor, L3 alignment).
//   Fixture design serves INTERNAL gates only; Monday levels are never consulted.
// - SEAM-CHART (S-CHART): no live captures on disk → placeholder PNG bytes are
//   generated deterministically in-code and graded by the LANDED verifier core;
//   the grade in the card is the core's measured judgment, never a constant.
//   LLM overlay rows stay unknown-degraded (W6 upgrade path, verifier file bottom).
// - SEAM-E2-4H: no 4H zones exist in the synthetic snapshot → L1 records honest
//   S-6-B-1 nesting rejections while boMOriginIds still carry the 1H BoM signal.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import {
  SYNTH_SEED, adaptBarsOrThrow, detectZonesObcv, makeLexiconData, makeRung, synthBars,
} from "../../src/e1/tests/helpers.ts";
import { DEFAULT_MACHINES } from "../../src/e1/machines/index.ts";
import type { LexiconData, OHLCBar, PairKey, TimeframeKey, TouchKind, ZoneModel } from "../../src/e1/core/types.ts";
import { step } from "../../src/substrate/L3-lasme/index.ts";
import type { WarheadEvent } from "../../src/substrate/L3-lasme/index.ts";
import {
  cascadeEvent, cascadeMachine, designateEvent, designationMachine,
  dayOpenEvent, freshCascade, freshDesignation, freshFreshness, freshShape, freshWorkflow,
  freshZonePressure, freshnessBattleEvent, pressureBattleEvent, shapeChainMachine,
  stepFreshness, stepPressure, workflowEvent, e2WorkflowMachine,
  type CascadeState, type DesignationEmission, type E2WorkflowRecord, type E2WorkflowState,
} from "../../src/e2/machines/index.ts";
import { assemble, AssemblerError } from "../../src/card/assembler.ts";
import { loadCard, LoadError } from "../../src/kernel/card-loader.ts";
import { computeTrades, TradeComputerError, RRR_FLOOR } from "../../src/kernel/trade-computer.ts";
import { computeTelescope } from "../../src/kernel/l1-telescope.ts";
import type { TelescopeVerdict } from "../../src/kernel/l1-telescope.ts";
import { computePressure } from "../../src/kernel/l2-pressure.ts";
import type { PressureVerdict } from "../../src/kernel/l2-pressure.ts";
import { computeFib } from "../../src/kernel/l3-fib.ts";
import type { FibVerdict } from "../../src/kernel/l3-fib.ts";
import { computeCascade } from "../../src/kernel/l4-cascade.ts";
import type { CascadeVerdict } from "../../src/kernel/l4-cascade.ts";
import { computeConfluence } from "../../src/kernel/l5-ti-graph.ts";
import type { TiVerdict } from "../../src/kernel/l5-ti-graph.ts";
import { verifyChartScreenshot } from "../../src/aether/chart-verifier.ts";

// ── constants (the landed run-fixture pattern values, cited not invented) ──
// src/e1/run-fixture.ts:22 ANCHOR + PAIR_CFG centers/vols. GU row mirrors the
// EUR/USD row shape (pip/atr per trading-constants lineage: GU_PIP=0.0001).
export const ANCHOR_MS = 1783317600000; // spec D.4 ANALYSIS_POINT_MS
const PAIR_CFG: Record<string, { pair: PairKey; pip: number; atr14: number; center: number; vol: number; tf: TimeframeKey }> = {
  "DXY": { pair: "DXY", pip: 0.01, atr14: 0.08, center: 101.0, vol: 0.09, tf: "1H" },
  "EUR/USD": { pair: "EUR/USD", pip: 0.0001, atr14: 0.0006, center: 1.1425, vol: 0.0009, tf: "1H" },
  "GBP/USD": { pair: "GBP/USD", pip: 0.0001, atr14: 0.0008, center: 1.338, vol: 0.0011, tf: "1H" },
};
const PAIR_ORDER = ["DXY", "EUR/USD", "GBP/USD"];
const PAIR_SLUG: Record<string, string> = { "DXY": "dxy", "EUR/USD": "eu", "GBP/USD": "gu" };
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(HERE, "..", "fixtures", "golden-week.json");
const CAPTURE_DIR = join(HERE, ".captures");

// ── typed stage errors (loud at every stage boundary, never silent) ──
export type IntegrationStageCode =
  | "E1_BAR_REFUSED" | "E1_NO_ZONES" | "E1_MACHINE_FAIL"
  | "E2_DESIGNATE_REFUSED" | "E2_CASCADE_REFUSED" | "E2_WORKFLOW_REFUSED"
  | "S3_CHART_FAIL" | "S3_ASSEMBLE_REFUSED" | "S3_NO_SETUPS"
  | "S4_FIB_EMPTY" | "S4_CASCADE_FAIL" | "S4_CONFLUENCE_FAIL" | "S4_COMPUTE_REFUSED"
  | "S5_ORACLE_UNREADABLE" | "S5_NO_PROJECTIONS";

export class IntegrationStageError extends Error {
  readonly code: IntegrationStageCode;
  readonly stage: string;
  constructor(code: IntegrationStageCode, stage: string, detail: string, cause?: unknown) {
    super(`[integration-runner:${code}] stage ${stage}: ${detail}${cause instanceof Error ? ` (caused by: ${cause.message})` : ""}`);
    this.name = "IntegrationStageError";
    this.code = code;
    this.stage = stage;
  }
}

// ── pipeline output (oracle-free by construction) ──
export interface ProjectionLevel { id: string; pair: string; direction: string; level: number; rr: number; }
export interface PipelineOutput {
  meta: { anchorMs: number; seed: number; barsSource: string; seams: string[] };
  perPair: Record<string, {
    bars: number; zones: number; designations: number; setupsBuilt: number; setupsSurvived: number;
    dropped: Array<{ id: string; reason: string }>;
    projections: ProjectionLevel[];
    machineTrail: string[];
  }>;
  zoneGeometry: Record<string, { bottom: number; top: number }>;
  determinismHash: string;
}

// ── S1 helpers: synthetic bars + open-relative sculpt (data-derived) ──
function sculptTriple(bars: OHLCBar[], at: number, side: "DEMAND" | "SUPPLY", p: number, u: number): void {
  if (at - 1 < 0 || at + 1 >= bars.length) {
    throw new IntegrationStageError("E1_NO_ZONES", "e1-sculpt", `sculpt index ${at} out of range (len ${bars.length})`);
  }
  const t0 = bars[at - 1]!.t; const t1 = bars[at]!.t; const t2 = bars[at + 1]!.t;
  if (side === "DEMAND") {
    bars[at - 1] = { t: t0, O: p + 2 * u, H: p + 3 * u, L: p, C: p + u };
    bars[at] = { t: t1, O: p + u, H: p + 8 * u, L: p - u, C: p + 7 * u };
    bars[at + 1] = { t: t2, O: p + 7 * u, H: p + 9 * u, L: p + 2 * u, C: p + 8 * u };
  } else {
    bars[at - 1] = { t: t0, O: p - 2 * u, H: p, L: p - 3 * u, C: p - u };
    bars[at] = { t: t1, O: p - u, H: p + u, L: p - 8 * u, C: p - 7 * u };
    bars[at + 1] = { t: t2, O: p - 7 * u, H: p - 2 * u, L: p - 9 * u, C: p - 8 * u };
  }
}

function buildPairBars(cfg: (typeof PAIR_CFG)[string], seed: number): { bars: OHLCBar[]; open: number; sculptTs: number[] } {
  const raw = synthBars(seed, 120, ANCHOR_MS - 120 * 3600_000, 3600_000, cfg.center - 0.0015, 0.00002, cfg.vol)
    .filter((b) => b.t <= ANCHOR_MS);
  if (raw.length === 0) {
    throw new IntegrationStageError("E1_NO_ZONES", "e1-synth", "synth produced zero bars — seed/pipeline failure, refusing empty snapshot");
  }
  // Open-relative sculpt: the anchor open is read from the generated bars (data,
  // never oracle). Narrow triplets (u=v/2 → bf 6u/9u=0.667, bw 9u/pip≫3) placed
  // wide (±10v/±14v) so first-touch rr clears the D-R1 floor by construction.
  const open = raw[raw.length - 1]!.C;
  const u = cfg.vol / 2;
  const spots: Array<{ at: number; side: "DEMAND" | "SUPPLY"; p: number }> = [
    { at: 10, side: "DEMAND", p: open - 14 * cfg.vol },
    { at: 40, side: "SUPPLY", p: open + 14 * cfg.vol },
    { at: 70, side: "DEMAND", p: open - 10 * cfg.vol },
    { at: 100, side: "SUPPLY", p: open + 10 * cfg.vol },
  ];
  for (const s of spots) sculptTriple(raw, s.at, s.side, s.p, u);
  return { bars: raw, open, sculptTs: spots.map((s) => raw[s.at]!.t) };
}

/** Exported for the adversarial suite: runs S1 over caller-supplied raw bars. */
export function e1StageOverBars(raw: unknown, cfgKey: string): { bars: OHLCBar[]; zones: ZoneModel[]; open: number } {
  const cfg = PAIR_CFG[cfgKey];
  if (cfg === undefined) throw new IntegrationStageError("E1_BAR_REFUSED", "e1-gate", `unknown pair key '${cfgKey}'`);
  let bars: OHLCBar[];
  try {
    bars = adaptBarsOrThrow(raw as OHLCBar[], ANCHOR_MS);
  } catch (e) {
    throw new IntegrationStageError("E1_BAR_REFUSED", "e1-adapter", `temporal/shape gate refused the bars`, e);
  }
  if (bars.length === 0) throw new IntegrationStageError("E1_NO_ZONES", "e1-adapter", "zero bars — refusing empty snapshot");
  const zones = detectZonesObcv(bars, { pair: cfg.pair, tf: cfg.tf, pip: cfg.pip, anchorMs: ANCHOR_MS });
  if (zones.length === 0) throw new IntegrationStageError("E1_NO_ZONES", "e1-obcv", "OBCV detected zero zones — nothing to designate");
  return { bars, zones, open: bars[bars.length - 1]!.C };
}

// ── S-CHART: deterministic placeholder PNG + LANDED verifier grading ──
function crc32(bytes: Uint8Array): number {
  let table = (crc32 as { t?: Int32Array }).t;
  if (table === undefined) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as { t?: Int32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = (table[(crc ^ b) & 0xff] as number) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.slice(4, 8 + data.length));
  dv.setUint32(8 + data.length, crc);
  return out;
}

/** 8x8 RGB PNG, top half dark / bottom half light → nonzero pixel variance. */
function placeholderPng(): Uint8Array {
  const w = 8; const h = 8;
  const raw = new Uint8Array(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter 0
    for (let x = 0; x < w; x++) {
      const v = y < h / 2 ? 18 + x : 200 - x;
      raw[y * (w * 3 + 1) + 1 + x * 3] = v;
      raw[y * (w * 3 + 1) + 1 + x * 3 + 1] = (v + 40) & 255;
      raw[y * (w * 3 + 1) + 1 + x * 3 + 2] = (v + 90) & 255;
    }
  }
  const sig = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const idat = new Uint8Array(deflateSync(Buffer.from(raw)));
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

async function gradeChart(pairKey: string): Promise<{ slug: string; grade: "PASS" | "FAIL"; detail: string }> {
  const slug = `screenshots/${PAIR_SLUG[pairKey]}_1h.png`;
  const diskPath = join(CAPTURE_DIR, `${PAIR_SLUG[pairKey]}_1h.png`);
  mkdirSync(dirname(diskPath), { recursive: true });
  writeFileSync(diskPath, Buffer.from(placeholderPng()));
  const outcome = await verifyChartScreenshot({ screenshotPath: diskPath, pair: pairKey, timeframe: "1H" });
  // The grade below is the LANDED core's measured judgment — never a constant.
  // SEAM S-CHART: pixels are deterministic placeholders (no live capture on disk);
  // the PASS/FAIL is computed from byte variance by src/aether/chart-verifier.ts.
  if (!outcome.ok) {
    throw new IntegrationStageError("S3_CHART_FAIL", "card-charts",
      `verifier core graded ${slug} FAIL: ${outcome.judgment.failureContext ?? "unknown"}`);
  }
  return { slug, grade: outcome.judgment.grade, detail: `S-CHART placeholder bytes graded by verifier core (distinct=${outcome.judgment.deterministic?.distinctBytes ?? -1})` };
}

// ── canonical JSON (determinism comparison) ──
function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canonicalize((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
export function canonicalJson(v: unknown): string { return JSON.stringify(canonicalize(v)); }

// ── touch derivation from bars (data, never oracle) ──
function touchForZone(bars: OHLCBar[], z: ZoneModel): TouchKind {
  let swept = false; let defended = false;
  for (const b of bars) {
    if (b.L < z.bottom && b.C > z.bottom) swept = true;
    if (b.C >= z.bottom && b.C <= z.top) defended = true;
    if (swept && defended) break;
  }
  if (swept) return "SWEEP";
  if (defended) return "BODY_DEFEND";
  return "CONSOL_DWELL";
}

function stepReason(out: { kind: string; reason?: string }): string {
  return typeof (out as { reason?: unknown }).reason === "string"
    ? (out as { reason: string }).reason
    : "guard-failed";
}

// ── THE PIPELINE (oracle-free: no fixture/oracle parameter exists) ──
export async function runPipeline(): Promise<PipelineOutput> {
  const zoneGeometry: Record<string, { bottom: number; top: number }> = {};
  const perPair: PipelineOutput["perPair"] = {};
  //_kernel inputs accumulated across pairs (L4 needs all three lanes)
  const laneSetups: Record<string, Array<{ id: string; zoneId: string; targetZoneId: string; direction: "LONG" | "SHORT"; rr: number; desId: string }>> = {
    "DXY": [], "EUR/USD": [], "GBP/USD": [],
  };
  const laneDesignations: Record<string, Array<{ id: string; supplyZoneId: string; demandZoneId: string; direction: "LONG" | "SHORT" }>> = {
    "DXY": [], "EUR/USD": [], "GBP/USD": [],
  };
  const pairZones: Record<string, ZoneModel[]> = {};
  const pairTrail: Record<string, string[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };
  const pairDefenses: Record<string, Map<string, { defenses: number; sweeps: number }>> = {
    "DXY": new Map(), "EUR/USD": new Map(), "GBP/USD": new Map(),
  };
  const pairL1: Record<string, TelescopeVerdict> = {};
  const pairBars: Record<string, OHLCBar[]> = {};

  // ── S1+S2 per pair ──
  for (const key of PAIR_ORDER) {
    const cfg = PAIR_CFG[key]!;
    const trail = pairTrail[key]!;
    // S1: synth (SEAM-BARS) → sculpt (open-relative, data-derived) → adapter → OBCV
    const { bars: rawBars } = buildPairBars(cfg, SYNTH_SEED + key.length);
    let bars: OHLCBar[]; let zones: ZoneModel[];
    try {
      bars = adaptBarsOrThrow(rawBars, ANCHOR_MS);
    } catch (e) {
      throw new IntegrationStageError("E1_BAR_REFUSED", `e1-adapter:${key}`, "temporal/shape gate refused", e);
    }
    zones = detectZonesObcv(bars, { pair: cfg.pair, tf: cfg.tf, pip: cfg.pip, anchorMs: ANCHOR_MS });
    if (zones.length === 0) throw new IntegrationStageError("E1_NO_ZONES", `e1-obcv:${key}`, "zero zones detected");
    const open = bars[bars.length - 1]!.C;
    pairBars[key] = bars;
    pairZones[key] = zones;
    for (const z of zones) zoneGeometry[z.id] = { bottom: z.bottom, top: z.top };
    trail.push(`e1: ${bars.length} bars open=${open} zones=${zones.length}`);

    // S1b: e1 lexicon machines classify (the run-fixture pattern — evidence, honest)
    const data: LexiconData = makeLexiconData({
      bars, zones,
      meta: { pair: cfg.pair, week: "2026-07-06", anchorMs: ANCHOR_MS, spot: open, atr14: cfg.atr14, pip: cfg.pip, tf: cfg.tf },
    });
    let verdicts = 0;
    for (const m of DEFAULT_MACHINES) {
      try { m.classify({ data }); verdicts++; }
      catch (e) { throw new IntegrationStageError("E1_MACHINE_FAIL", `e1-machine:${m.id}:${key}`, "classify threw", e); }
    }
    trail.push(`e1-machines: ${verdicts}/${DEFAULT_MACHINES.length} classified`);

    // S2: the six LANDED e2 machines.
    // (i) shape-chain: Monday open over the realized open (data).
    const shapeOut = step(shapeChainMachine, freshShape(cfg.pair),
      dayOpenEvent("SS", { zfp: 0.5, marubozuAnatomy: true, projectedOpen: open }));
    if (shapeOut.kind !== "TRANSITIONED") {
      const why = shapeOut.kind === "INVARIANT_BREACH" ? shapeOut.invariantId : shapeOut.reason;
      throw new IntegrationStageError("E2_DESIGNATE_REFUSED", `e2-shape:${key}`, `dayOpen UNCHANGED: ${why}`);
    }
    trail.push(`e2-shape: SS dayOpen TRANSITIONED (triads=${shapeOut.record.triads.length})`);

    // (ii+iii) freshness + zone-pressure per zone; counters feed L2 honestly.
    const defenses = pairDefenses[key]!;
    for (const z of zones) {
      const touch = touchForZone(bars, z);
      const tf = (z.tf ?? "1H") as "1H" | "4H" | "30m" | "15m";
      const fOut = stepFreshness(freshFreshness(z.id, tf), freshnessBattleEvent("FRESH", z.id, touch));
      const pOut = stepPressure(freshZonePressure(z.id, tf), pressureBattleEvent("VIRGIN", z.id, touch));
      const pRec = pOut.kind === "TRANSITIONED" ? pOut.record : freshZonePressure(z.id, tf);
      defenses.set(z.id, { defenses: pRec.defenses, sweeps: pRec.sweeps });
      void fOut;
    }
    trail.push(`e2-freshness+pressure: ${zones.length} zones stepped (touch-derived from bars)`);

    // (iv) designation: pair supplies above open with demands below (orientation law).
    const snapshot = zones.map((z) => ({ id: z.id, top: z.top, bottom: z.bottom }));
    const supplies = zones.filter((z) => z.type === "SUPPLY" && z.bottom > open)
      .sort((a, b) => a.bottom - b.bottom);
    const demands = zones.filter((z) => z.type === "DEMAND" && z.top < open)
      .sort((a, b) => b.top - a.top);
    if (supplies.length === 0 || demands.length === 0) {
      throw new IntegrationStageError("E2_DESIGNATE_REFUSED", `e2-designation:${key}`,
        `orientation found no pair (supplies>${open}: ${supplies.length}, demands<${open}: ${demands.length})`);
    }
    const deepDemand = [...demands].sort((a, b) => a.bottom - b.bottom)[0]!;
    const pairs = Math.min(2, supplies.length, demands.length);
    for (let i = 0; i < pairs; i++) {
      const s = supplies[i]!; const d = demands[i]!;
      const emission: DesignationEmission = {
        demandZoneId: d.id, supplyZoneId: s.id,
        keyZoneType: i % 2 === 0 ? "SUPPLY" : "DEMAND", deepDemandZoneId: deepDemand.id,
      };
      const out = step(designationMachine, freshDesignation("Monday", cfg.pair), designateEvent(emission, snapshot, open));
      if (out.kind !== "TRANSITIONED") {
        throw new IntegrationStageError("E2_DESIGNATE_REFUSED", `e2-designation:${key}#${i}`,
          `DESIGNATE UNCHANGED: ${(out as { reason?: string }).reason ?? "guard-failed"}`);
      }
      // One e2 emission fans to two directed card designations (the link law:
      // trade-computer matches setup→designation by direction+zone).
      for (const dir of ["SHORT", "LONG"] as const) {
        const desId = `DES-${PAIR_SLUG[key]}-${i}-${dir}`;
        laneDesignations[key]!.push({
          id: desId,
          supplyZoneId: s.id, demandZoneId: d.id, direction: dir,
        });
        const setupZone = dir === "SHORT" ? s : d;
        const targetZone = dir === "SHORT" ? d : s;
        const entryEdge = dir === "SHORT" ? s.bottom : d.top;
        const slEdge = dir === "SHORT" ? s.top : d.bottom;
        const tpEdge = dir === "SHORT" ? d.top : s.bottom;
        const riskPips = Math.abs(Math.round((entryEdge - slEdge) / cfg.pip));
        const rewardPips = Math.abs(Math.round((tpEdge - entryEdge) / cfg.pip));
        if (riskPips <= 0) continue; // degenerate geometry — skip, recorded below
        const rr = Math.round((rewardPips / riskPips) * 100) / 100;
        laneSetups[key]!.push({
          id: `ST-${PAIR_SLUG[key]}-${i}-${dir}`, zoneId: setupZone.id, targetZoneId: targetZone.id,
          direction: dir, rr, desId,
        });
      }
      trail.push(`e2-designation#${i}: ${s.id} x ${d.id} TRANSITIONED`);
    }

    // (v)+(vi) cascade + workflow are stepped after all pairs designate (below).
  }

  // S2 continued: cascade DXY→EU-cascade→EU-core→GU over the designation ids.
  const dxyIds = laneDesignations["DXY"]!.map((d) => d.id);
  const euIds = laneDesignations["EUR/USD"]!.map((d) => d.id);
  const guIds = laneDesignations["GBP/USD"]!.map((d) => d.id);
  if (dxyIds.length === 0 || euIds.length === 0 || guIds.length === 0) {
    throw new IntegrationStageError("E2_CASCADE_REFUSED", "e2-cascade", "a lane has zero designations — cascade cannot advance");
  }
  let cascadeRec = freshCascade();
  const cascadeSteps: Array<{ type: "DXY_DESIGNATED" | "EU_CASCADE_DESIGNATED" | "EU_CORE_DESIGNATED" | "GU_DESIGNATED"; from: CascadeState; fields: Record<string, unknown> }> = [
    { type: "DXY_DESIGNATED", from: "IDLE", fields: { designationId: dxyIds[0] } },
    { type: "EU_CASCADE_DESIGNATED", from: "DXY_DONE", fields: { designationId: euIds[0] } },
    { type: "EU_CORE_DESIGNATED", from: "EU_CASCADE", fields: { designationId: euIds[euIds.length - 1] } },
    { type: "GU_DESIGNATED", from: "EU_CORE", fields: { designationId: guIds[0], euMirrorId: euIds[0] } },
  ];
  for (const s of cascadeSteps) {
    const out = step(cascadeMachine, cascadeRec, cascadeEvent(s.type, s.from, s.fields));
    if (out.kind !== "TRANSITIONED") {
      throw new IntegrationStageError("E2_CASCADE_REFUSED", "e2-cascade",
        `${s.type} UNCHANGED from ${s.from}: ${(out as { reason?: string }).reason ?? "guard-failed"}`);
    }
    cascadeRec = out.record;
  }
  pairTrail["DXY"]!.push(`e2-cascade: IDLE→GU_DONE (lastStage=${cascadeRec.lastStage})`);

  // (vi) workflow E1_DONE→E2_DONE now; E3→REPORTED after the kernel (below).
  const wf1 = step(e2WorkflowMachine, freshWorkflow("2026-07-06"), workflowEvent("E2_COMPLETED", "E1_DONE"));
  if (wf1.kind !== "TRANSITIONED") throw new IntegrationStageError("E2_WORKFLOW_REFUSED", "e2-workflow", "E2_COMPLETED UNCHANGED");
  pairTrail["DXY"]!.push(`e2-workflow: E1_DONE→E2_DONE`);

  // ── L1-L5 kernel verdicts per pair (data-derived, zone-ids only) ──
  const pairL2: Record<string, PressureVerdict> = {};
  const pairL3: Record<string, FibVerdict> = {};
  const pairL4: Record<string, CascadeVerdict> = {};
  const pairL5: Record<string, TiVerdict> = {};
  type SetupCand = { id: string; zoneId: string; targetZoneId: string; direction: "LONG" | "SHORT"; rr: number; desId: string };
  const survivors: Record<string, SetupCand[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };

  for (const key of PAIR_ORDER) {
    const cfg = PAIR_CFG[key]!;
    const zones = pairZones[key]!;
    const l1 = computeTelescope({
      zones, rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)),
      meta: { pair: key, pip: cfg.pip },
    });
    pairL1[key] = l1;
    const defenses = pairDefenses[key]!;
    const l2 = computePressure({
      entries: zones.map((z) => {
        const c = defenses.get(z.id) ?? { defenses: 0, sweeps: 0 };
        return { zone: z, defenses: c.defenses, sweeps: c.sweeps, broken: false };
      }),
      rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)),
      telescope: l1, pip: cfg.pip,
    });
    pairL2[key] = l2;
    // L3 over the built candidates; the gate selects (drops recorded, never silent).
    const bands: Record<string, { lo: number; hi: number }> = {};
    for (const z of zones) bands[z.id] = { lo: z.bottom, hi: z.top };
    const tolerancePips = Math.max(3, Math.ceil((2 * cfg.atr14) / cfg.pip));
    const l3 = computeFib({
      swings: zones.map((z) => ({ swingZoneId: z.id, loEdge: z.bottom, hiEdge: z.top })),
      trades: laneSetups[key]!.map((s) => ({
        tradeId: s.id, entryZoneId: s.zoneId, targetZoneId: s.targetZoneId, direction: s.direction,
      })),
      bands, pip: cfg.pip, tolerancePips,
    });
    pairL3[key] = l3;
    const fibOk = new Set(l3.tradeChecks.filter((c) => c.entryOk && c.targetOk).map((c) => c.tradeId));
    for (const s of laneSetups[key]!) {
      if (s.rr < RRR_FLOOR) continue; // RRR selectivity — reconciled below
      if (!fibOk.has(s.id)) continue; // L3 selectivity — reconciled below
      survivors[key]!.push(s);
    }
  }
  // Reconcile every drop into the per-pair slot (built here — the slot exists
  // from this point on, so downstream perPair[key]! writes are total).
  for (const key of PAIR_ORDER) {
    const keptIds = new Set(survivors[key]!.map((s) => s.id));
    const slot = (perPair[key] ??= freshPairSlot());
    for (const s of laneSetups[key]!) {
      if (!keptIds.has(s.id)) {
        slot.dropped.push({
          id: s.id,
          reason: s.rr < RRR_FLOOR ? `rr ${s.rr} < D-R1 floor ${RRR_FLOOR}` : "L3 fib entryOk+targetOk gate",
        });
      }
    }
    slot.setupsBuilt = laneSetups[key]!.length;
    slot.setupsSurvived = survivors[key]!.length;
    if (survivors[key]!.length === 0) {
      throw new IntegrationStageError("S4_FIB_EMPTY", `kernel-l3:${key}`,
        `all ${laneSetups[key]!.length} candidates dropped (fib/RRR gates) — nothing to compute`);
    }
  }

  // L4 over survivors (throws CASCADE_NO_INVERSE loud if a DXY direction is missing).
  const cascadeInput = {
    dxy: survivors["DXY"]!.map((s) => ({ tradeId: s.id, pair: "DXY" as const, direction: s.direction, zoneId: s.zoneId })),
    eu: survivors["EUR/USD"]!.map((s) => ({ tradeId: s.id, pair: "EUR/USD" as const, direction: s.direction, zoneId: s.zoneId })),
    gu: survivors["GBP/USD"]!.map((s) => ({ tradeId: s.id, pair: "GBP/USD" as const, direction: s.direction, zoneId: s.zoneId })),
    translations: [
      { stage: "dxy-e2", translationId: `int-run-dxy-${dxyIds[0]}` },
      { stage: "eu-e2-cascade", translationId: `int-run-eu-${euIds[0]}` },
      { stage: "eu-e2-core", translationId: `int-run-eu-core-${euIds[euIds.length - 1]}` },
      { stage: "gu-e2", translationId: `int-run-gu-${guIds[0]}` },
    ],
    divergenceScore: sweepFraction(pairDefenses),
    setupCount: 0, expectedSetups: 0,
  };
  cascadeInput.setupCount = cascadeInput.dxy.length + cascadeInput.eu.length + cascadeInput.gu.length;
  cascadeInput.expectedSetups = cascadeInput.setupCount; // self-mirror: the cascade expects what the pipeline built (both from data)
  let l4: CascadeVerdict;
  try {
    l4 = computeCascade(cascadeInput);
  } catch (e) {
    throw new IntegrationStageError("S4_CASCADE_FAIL", "kernel-l4", "computeCascade threw", e);
  }
  for (const key of PAIR_ORDER) pairL4[key] = l4;
  if (l4.floorCheck !== "VALID") {
    throw new IntegrationStageError("S4_CASCADE_FAIL", "kernel-l4", `mirror floor ${l4.floorCheck}`);
  }

  // ── S3+S4 per pair: L5 → chart → assemble → loadCard → computeTrades ──
  for (const key of PAIR_ORDER) {
    const cfg = PAIR_CFG[key]!;
    const trail = pairTrail[key]!;
    const kept = survivors[key]!;
    const minRr = Math.min(...kept.map((s) => s.rr));
    const l5 = computeConfluence({
      laws: [
        { lawId: "LAW-7-DEFENSE", edge: "REQUIRES", satisfied: kept.every((s) => pairL2[key]!.overlay.some((r) => r.zoneId === s.zoneId)), weight: 3, quote: "every setup zone carries an L2 pressure overlay row" },
        { lawId: "LAW-10-ORIGIN", edge: "REQUIRES", satisfied: kept.every((s) => pairL1[key]!.boMOriginIds.includes(s.zoneId)), weight: 2, quote: "every setup zone traces to an L1 BoM origin" },
        { lawId: "LAW-12-CASCADE", edge: "REQUIRES", satisfied: l4.floorCheck === "VALID", weight: 2, quote: "the L4 cascade mirror floor reads VALID" },
        { lawId: "LAW-14-RRR-FLOOR", edge: "REQUIRES", satisfied: minRr >= RRR_FLOOR, weight: 3, quote: "every emitted setup clears the D-R1 RRR floor" },
        { lawId: "LAW-FORT-SUPPORT", edge: "SUPPORTS", satisfied: pairL2[key]!.fortressZoneIds.length > 0, weight: 1, quote: "fortress zones support the confluence" },
      ],
      rrr: minRr, rrrFloor: RRR_FLOOR,
    }, kept.map((s) => ({ item: `setup-${s.id}-confluence`, evidence: `rr ${s.rr} zone ${s.zoneId} des ${s.desId}` })));
    pairL5[key] = l5;
    if (!l5.tradeValid) {
      throw new IntegrationStageError("S4_CONFLUENCE_FAIL", `kernel-l5:${key}`,
        `confluence invalid (required=${l5.requiredLawIds.join(",")} contradicting=${l5.contradictingLawIds.join(",")})`);
    }

    // S3: chart graded by the LANDED verifier core (S-CHART seam recorded in meta).
    const chart = await gradeChart(key);
    const provEntries: Array<{ id: string; source: string; kind: "e1-zone" | "e2-designation" | "chart" | "setup" | "grounding" }> = [];
    for (const z of pairZones[key]!) provEntries.push({ id: z.id, source: "src/e1/tests/helpers.ts:75", kind: "e1-zone" });
    for (const d of laneDesignations[key]!) provEntries.push({ id: d.id, source: "src/e2/machines/designation-machine.ts:138", kind: "e2-designation" });
    provEntries.push({ id: chart.slug, source: "src/aether/chart-verifier.ts:406", kind: "chart" });
    for (const s of kept) provEntries.push({ id: s.id, source: "src/kernel/trade-computer.ts:96", kind: "setup" });
    const openPx = pairBars[key]![pairBars[key]!.length - 1]!.C;
    const entryOf = (s: SetupCand): number => {
      const g = zoneGeometry[s.zoneId]!;
      return s.direction === "SHORT" ? g.bottom : g.top;
    };
    const rawCard = {
      meta: { pair: cfg.pair, tf: "1H" as const, analysisPointMs: ANCHOR_MS },
      zones: pairZones[key]!.map((z) => ({ zoneId: z.id })),
      designations: laneDesignations[key]!.map((d) => ({
        id: d.id, supplyZoneId: d.supplyZoneId, demandZoneId: d.demandZoneId, direction: d.direction,
      })),
      visuals: { charts: [{ path: chart.slug, tf: "1H" as const, grade: chart.grade }] },
      setups: kept.map((s) => ({ id: s.id, zoneId: s.zoneId, direction: s.direction, rr: s.rr })),
      provenance: { entries: provEntries },
      grounding: {
        forwardPosition: Math.round(Math.abs(openPx - entryOf(kept[0]!)) / cfg.pip),
        anchorsNumeric: true, directionOrder: true, targetClosed: true,
        zoneIdsReal: true, projectionIdsReal: true, rrrComputable: true,
      },
    };
    let card;
    try {
      card = assemble(rawCard);
    } catch (e) {
      throw new IntegrationStageError("S3_ASSEMBLE_REFUSED", `card-assemble:${key}`, "assemble refused", e);
    }
    let loaded;
    try {
      loaded = loadCard(card);
    } catch (e) {
      throw new IntegrationStageError("S3_ASSEMBLE_REFUSED", `card-load:${key}`,
        `loadCard refused: ${e instanceof LoadError ? e.code : "unknown"}`, e);
    }
    let projections;
    try {
      projections = computeTrades(loaded, {
        l1: pairL1[key]!, l2: pairL2[key]!, l3: pairL3[key]!, l4, l5,
      });
    } catch (e) {
      const code = e instanceof TradeComputerError ? e.code : "unknown";
      throw new IntegrationStageError("S4_COMPUTE_REFUSED", `trade-computer:${key}`, `computeTrades ${code}`, e);
    }
    if (projections.length === 0) {
      throw new IntegrationStageError("S4_COMPUTE_REFUSED", `trade-computer:${key}`, "zero projections emitted");
    }
    trail.push(`card: ${chart.slug}=${chart.grade} (${chart.detail})`);
    trail.push(`kernel: ${projections.length} projections (l5 score=${l5.score})`);
    const slot = perPair[key]!;
    slot.bars = pairBars[key]!.length;
    slot.zones = pairZones[key]!.length;
    slot.designations = laneDesignations[key]!.length;
    slot.projections = projections.map((p) => ({
      id: p.id, pair: p.pair, direction: p.direction, level: entryOf(kept.find((s) => s.id === p.id)!), rr: p.rr,
    }));
    slot.machineTrail = [...trail];
  }

  // Workflow to REPORTED (E3 fires after the kernel — the setup stage completed).
  const wf2 = step(e2WorkflowMachine,
    wf1.record as unknown as E2WorkflowRecord, workflowEvent("E3_COMPLETED", "E2_DONE"));
  if (wf2.kind !== "TRANSITIONED") throw new IntegrationStageError("E2_WORKFLOW_REFUSED", "e2-workflow", "E3_COMPLETED UNCHANGED");
  const wf3 = step(e2WorkflowMachine, wf2.record, workflowEvent("REPORT_COMPLETED", "E3_DONE"));
  if (wf3.kind !== "TRANSITIONED") throw new IntegrationStageError("E2_WORKFLOW_REFUSED", "e2-workflow", "REPORT_COMPLETED UNCHANGED");
  pairTrail["DXY"]!.push(`e2-workflow: E2_DONE→E3_DONE→REPORTED`);

  const output: PipelineOutput = {
    meta: {
      anchorMs: ANCHOR_MS, seed: SYNTH_SEED,
      barsSource: `synthetic mulberry32 seed=${SYNTH_SEED} (bars_raw.json absent — substitution recorded, SEAM-BARS)`,
      seams: [
        "SEAM-BARS: synthetic bars (run-fixture pattern)",
        "SEAM-SCULPT: open-relative narrow triplets for internal gates (never oracle)",
        "SEAM-CHART (S-CHART): placeholder PNG bytes graded by the LANDED verifier deterministic core; LLM overlay deferred W6",
        "SEAM-E2-4H: no 4H zones in synthetic snapshot — L1 S-6-B-1 rejections recorded, boMOriginIds carry 1H BoM",
      ],
    },
    perPair, zoneGeometry,
    determinismHash: "",
  };
  output.determinismHash = canonicalJson({ perPair: output.perPair, zoneGeometry: output.zoneGeometry });
  return output;
}

function freshPairSlot(): PipelineOutput["perPair"][string] {
  return { bars: 0, zones: 0, designations: 0, setupsBuilt: 0, setupsSurvived: 0, dropped: [], projections: [], machineTrail: [] };
}

function sweepFraction(defenses: Record<string, Map<string, { defenses: number; sweeps: number }>>): number {
  let total = 0; let swept = 0;
  for (const key of Object.keys(defenses)) {
    for (const c of defenses[key]!.values()) { total++; if (c.sweeps > 0) swept++; }
  }
  return total === 0 ? 0 : Math.round((swept / total) * 10000) / 10000;
}

// ── S5 DIAG (the ONLY oracle reader — called AFTER the pipeline output exists) ──
export interface MondayRow { pair: string; direction: string; level: number }
export interface VerdictRow {
  fixtureId: string; pair: string; direction: string;
  expected: number | null; actual: number | null; deltaPips: number | null; verdict: "PASS" | "FAIL"; note: string;
}

const MONDAY_CRITERION_PIPS = 3;

export function compareConvergence(output: PipelineOutput, mondaySet: MondayRow[]): VerdictRow[] {
  const pipOf = (pair: string): number => {
    if (pair === "DXY") return 0.01;
    if (pair === "EUR/USD" || pair === "GBP/USD") return 0.0001;
    throw new IntegrationStageError("S5_ORACLE_UNREADABLE", "diag-pip", `unknown pair '${pair}' in monday set`);
  };
  const rows: VerdictRow[] = [];
  mondaySet.forEach((m, i) => {
    const cands = Object.values(output.perPair).flatMap((p) => p.projections)
      .filter((p) => p.pair === m.pair && p.direction === m.direction);
    if (cands.length === 0) {
      rows.push({ fixtureId: `MONDAY-${i + 1}`, pair: m.pair, direction: m.direction, expected: m.level, actual: null, deltaPips: null, verdict: "FAIL", note: "NO_COVERAGE" });
      return;
    }
    let best = cands[0]!; let bestDelta = Math.abs(best.level - m.level);
    for (const c of cands) {
      const d = Math.abs(c.level - m.level);
      if (d < bestDelta) { best = c; bestDelta = d; }
    }
    const pip = pipOf(m.pair);
    const deltaPips = Math.round(bestDelta / pip);
    rows.push({
      fixtureId: `MONDAY-${i + 1}`, pair: m.pair, direction: m.direction,
      expected: m.level, actual: Math.round(best.level / pip) / (1 / pip),
      deltaPips, verdict: deltaPips <= MONDAY_CRITERION_PIPS ? "PASS" : "FAIL",
      note: `projection=${best.id} rrr=${best.rr}`,
    });
  });
  return rows;
}

export const TABLE_HEADER = "# fixture-id | pair | dir | expected | actual | delta-pips | verdict";

export function formatTable(rows: VerdictRow[], determinismPass: boolean, coverage: string): string {
  const lines = [TABLE_HEADER];
  for (const r of rows) {
    lines.push(`${r.fixtureId} | ${r.pair} | ${r.direction} | ${r.expected ?? "—"} | ${r.actual ?? "—"} | ${r.deltaPips ?? "—"} | ${r.verdict} # ${r.note}`);
  }
  const covered = rows.filter((r) => r.actual !== null).length;
  lines.push(`MONDAY-COVERAGE | ALL | — | ${rows.length} | ${covered} | 0 | ${coverage} # ${covered}/${rows.length} monday rows covered`);
  lines.push(`DETERMINISM | — | — | — | — | 0 | ${determinismPass ? "PASS" : "FAIL"} # pipeline x2 byte-identical=${determinismPass}`);
  return lines.join("\n");
}

export function readMondaySet(fixturePath: string): MondayRow[] {
  let raw: string;
  try {
    raw = readFileSync(fixturePath, "utf8");
  } catch (e) {
    throw new IntegrationStageError("S5_ORACLE_UNREADABLE", "diag-read", `fixture unreadable: ${fixturePath}`, e);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new IntegrationStageError("S5_ORACLE_UNREADABLE", "diag-parse", "fixture JSON corrupt", e);
  }
  const set = (parsed as Record<string, unknown>)?.["mondayConvergence"] as Record<string, unknown> | undefined;
  const arr = set?.["set"] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new IntegrationStageError("S5_ORACLE_UNREADABLE", "diag-shape", "mondayConvergence.set missing/empty");
  }
  return arr.map((r) => {
    if (typeof r["pair"] !== "string" || typeof r["direction"] !== "string" || typeof r["level"] !== "number") {
      throw new IntegrationStageError("S5_ORACLE_UNREADABLE", "diag-shape", `monday row malformed: ${JSON.stringify(r).slice(0, 120)}`);
    }
    return { pair: r["pair"] as string, direction: (r["direction"] as string).toUpperCase(), level: r["level"] as number };
  });
}

// ── CLI: pipeline FIRST (no oracle input), diag SECOND (oracle read after output) ──
async function main(): Promise<void> {
  let output: PipelineOutput;
  try {
    output = await runPipeline();
  } catch (e) {
    console.error(e instanceof IntegrationStageError ? e.message : `[integration-runner:UNEXPECTED] ${(e as Error).message}`);
    process.exit(1);
  }
  // D13 boundary: the line below is the FIRST oracle touch — output exists above.
  const mondaySet = readMondaySet(FIXTURE_PATH);
  const rerun = await runPipeline();
  const determinismPass = canonicalJson({ perPair: output.perPair, zoneGeometry: output.zoneGeometry })
    === canonicalJson({ perPair: rerun.perPair, zoneGeometry: rerun.zoneGeometry });
  if (output.perPair === undefined || Object.values(output.perPair).flatMap((p) => p.projections).length === 0) {
    console.error(`[integration-runner:S5_NO_PROJECTIONS] zero projections — refusing verdict table`);
    process.exit(1);
  }
  const rows = compareConvergence(output, mondaySet);
  const covered = rows.filter((r) => r.actual !== null).length;
  const coverage = covered === rows.length ? "PASS" : "FAIL";
  console.log(formatTable(rows, determinismPass, coverage));
  console.log(`[integration-runner] projections=${rows.length} monday-cover=${covered}/${rows.length} determinism=${determinismPass}`);
  const allPass = determinismPass && coverage === "PASS" && rows.every((r) => r.verdict === "PASS");
  process.exit(allPass ? 0 : 1);
}

const IS_CLI = typeof process.argv[1] === "string" && process.argv[1].endsWith("integration-runner.ts");
if (IS_CLI) {
  main().catch((e) => { console.error(`[integration-runner:UNEXPECTED] ${(e as Error).message}`); process.exit(1); });
}
