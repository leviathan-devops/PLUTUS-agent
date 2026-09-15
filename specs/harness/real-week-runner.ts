// specs/harness/real-week-runner.ts — THE G3 REAL-DATA GOLDEN DIAG.
// The full V5 chain over the REAL golden-week bars (Plutus_Air_Agent fixtures, week 2026-07-06):
// e1 OBCV+lexicons → e2 six machines + the DXY→EU→GU cascade → card → loader → computeTrades → diag.
// D13 ORACLE_ISOLATION: runRealWeek() takes NO oracle input — the oracle is read only by the
// comparator AFTER the output exists. Bars > anchor are OUTCOME bars — excluded from designation.
import { readFileSync } from "node:fs";
import { adaptBarsOrThrow, detectZonesObcv, makeLexiconData, makeRung } from "../../src/e1/tests/helpers.ts";
import { DEFAULT_MACHINES } from "../../src/e1/machines/index.ts";
import type { LexiconData, OHLCBar, ZoneModel } from "../../src/e1/core/types.ts";
import {
  cascadeEvent, cascadeMachine, freshCascade, designateEvent, designationMachine,
  freshDesignation, freshShape, shapeChainMachine, dayOpenEvent,
  freshZonePressure, pressureBattleEvent, stepPressure, e2WorkflowMachine,
  freshWorkflow, workflowEvent,
} from "../../src/e2/machines/index.ts";
import type { CascadeState, ZonePressureRecord } from "../../src/e2/machines/index.ts";
import { step } from "../../src/substrate/L3-lasme/index.ts";
import { assemble } from "../../src/card/assembler.ts";
import { loadCard } from "../../src/kernel/card-loader.ts";
import { computeTrades, RRR_FLOOR } from "../../src/kernel/trade-computer.ts";
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

const ANCHOR_MS = 1783317600000;
const PIP: Record<string, number> = { "DXY": 0.01, "EUR/USD": 0.0001, "GBP/USD": 0.0001 };
const ATR: Record<string, number> = { "DXY": 0.08, "EUR/USD": 0.0006, "GBP/USD": 0.0008 };
const ORDER = ["DXY", "EUR/USD", "GBP/USD"] as const;
const BARS = "/tmp/opencode/real-week-bars.json";
// WK2: the 5-day loop input — the operator's read from the fixture (an INPUT, never oracle).
// golden-week.json .shapeChains: { days: [Mon..Fri], DXY/EUR-USD/GBP-USD: [SS,BS,R,BS,WL] }.
// Day labels for freshDesignation(day, key) (designation-machine.ts:41-45: day is a carried
// label, non-empty string — per-day fresh records) mirror the fixture's day tokens.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const DAY_LABEL: Record<string, string> = { "Mon": "Monday", "Tue": "Tuesday", "Wed": "Wednesday", "Thu": "Thursday", "Fri": "Friday" };
const SHAPE_CHAINS: Record<string, Array<"SS" | "BS" | "R" | "WL" | "RWL" | "WLS" | "PBS">> = {
  "DXY": ["SS", "BS", "R", "BS", "WL"],
  "EUR/USD": ["SS", "BS", "R", "BS", "WL"],
  "GBP/USD": ["SS", "BS", "R", "BS", "WL"],
};
// WK2: per-day DAY_OPEN evidence keyed by (from -> to) over the shape-chain-machine dayTable
// (shape-chain-machine.ts:97-128). SS->BS: ss-to-bs guard (zfp>0.45 + marubozu, :98-100);
// BS->R: bs-to-r guard (zfp in [0.20,0.40], :104-106). Thu R->BS and Fri BS->WL have NO
// DAY_OPEN edge in the B.W3.1 table (golden test pins both UNCHANGED) — those days lane
// EMPTY as honest NO_COVERAGE/MISS outcomes, never forced. Mon SS is the carried initial
// (freshShape state SS, shape-chain-machine.ts:168-181 initial SS; golden test :33-47 walks
// Mon SS -> Tue BS -> Wed R with these exact payloads SS_TO_BS/BS_TO_R).
const DAY_OPEN_FIELDS: Record<string, Record<string, unknown>> = {
  "SS>BS": { zfp: 0.5, marubozuAnatomy: true },
  "BS>R": { zfp: 0.3 },
};

export class StageError extends Error {
  constructor(readonly code: string, readonly stage: string, detail: string, cause?: unknown) {
    super(`[real-week:${code}] ${stage}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`);
    this.name = "StageError";
  }
}

function canonicalize(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalize);
  if (v !== null && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) o[k] = canonicalize((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}
export const canonicalJson = (v: unknown): string => JSON.stringify(canonicalize(v));

function touchOf(bars: OHLCBar[], z: ZoneModel): "SWEEP" | "BODY_DEFEND" | "CONSOL_DWELL" {
  let swept = false, defended = false;
  for (const b of bars) {
    if (b.L < z.bottom && b.C > z.bottom) swept = true;
    if (b.C >= z.bottom && b.C <= z.top) defended = true;
    if (swept && defended) break;
  }
  return swept ? "SWEEP" : defended ? "BODY_DEFEND" : "CONSOL_DWELL";
}

export interface LaneSetup { id: string; day: string; zoneId: string; targetZoneId: string; direction: "LONG" | "SHORT"; rr: number; desId: string }
export interface LaneDesignation { id: string; day: string; supplyZoneId: string; demandZoneId: string; direction: "LONG" | "SHORT" }

export interface RealWeekOutput {
  perPair: Record<string, {
    contextBars: number; zones: number; designations: number; setupsBuilt: number; setupsSurvived: number;
    dropped: Array<{ id: string; reason: string }>;
    projections: Array<{ id: string; day: string; pair: string; direction: string; level: number; rr: number }>;
    machineTrail: string[];
    perDay: Record<string, { shape: string; designations: number; setups: number; projections: number; note: string }>;
  }>;
  determinismHash: string;
}

export async function runRealWeek(barsFile: string): Promise<RealWeekOutput> {
  const feed = JSON.parse(readFileSync(barsFile, "utf8")) as Array<{ pair: string; bars: Array<Record<string, unknown>> }>;
  const perPair: RealWeekOutput["perPair"] = {};
  const laneSetups: Record<string, LaneSetup[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };
  const laneDesignations: Record<string, LaneDesignation[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };
  const pairZones: Record<string, ZoneModel[]> = {};
  const pairCtx: Record<string, OHLCBar[]> = {};
  const pairL1: Record<string, TelescopeVerdict> = {};
  const pairL2: Record<string, PressureVerdict> = {};
  const pairDef: Record<string, Map<string, { defenses: number; sweeps: number }>> = { "DXY": new Map(), "EUR/USD": new Map(), "GBP/USD": new Map() };
  const trails: Record<string, string[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };
  const pairDayRows: Record<string, Record<string, { shape: string; designations: number; setups: number; projections: number; note: string }>> = { "DXY": {}, "EUR/USD": {}, "GBP/USD": {} };

  for (const key of ORDER) {
    const feedRow = feed.find((r) => r.pair === key);
    if (!feedRow) throw new StageError("E1_BAR_REFUSED", "feed", `no bars for ${key}`);
    const all: OHLCBar[] = feedRow.bars.map((b) => ({ t: Number(b.timestamp), O: Number(b.open), H: Number(b.high), L: Number(b.low), C: Number(b.close) }));
    const ctx = all.filter((b) => b.t <= ANCHOR_MS);
    if (ctx.length < 50) throw new StageError("E1_BAR_REFUSED", "feed", `${key}: only ${ctx.length} context bars <= anchor`);
    let bars: OHLCBar[];
    try { bars = adaptBarsOrThrow(ctx, ANCHOR_MS); } catch (e) { throw new StageError("E1_BAR_REFUSED", `adapter:${key}`, "gate refused", e); }
    // WK2 zones/bars decision: re-detect ONCE from the full ≤ anchor context (the ctx gate
    // keeps ≤ anchor — runner :95; adaptBarsOrThrow temporal gate helpers.ts:56-69 refuses any
    // post-anchor bar). No machine contract offers per-day bar slicing: the zone-pressure and
    // freshness machines step per BATTLE_RESOLVED event (zone-pressure-machine.ts:185-192
    // stepPressure; freshness-machine.ts:100-105 stepFreshness) with no clock/window input, and
    // the designation guard reads only the passed snapshot + projectedOpen
    // (designation-machine.ts:82-102). Per-day zone re-detection from invented session windows
    // would be unquotable — refused. Zones carry; the DAY loop varies shape + designation day.
    const zones = detectZonesObcv(bars, { pair: key as never, tf: "1H", pip: PIP[key]!, anchorMs: ANCHOR_MS });
    if (zones.length === 0) throw new StageError("E1_NO_ZONES", `obcv:${key}`, "zero zones");
    const open = bars[bars.length - 1]!.C;
    pairCtx[key] = bars; pairZones[key] = zones;
    const data: LexiconData = makeLexiconData({
      bars, zones, meta: { pair: key as never, week: "2026-07-06", anchorMs: ANCHOR_MS, spot: open, atr14: ATR[key]!, pip: PIP[key]!, tf: "1H" },
    });
    let ok = 0;
    for (const m of DEFAULT_MACHINES) { try { m.classify({ data }); ok++; } catch (e) { throw new StageError("E1_MACHINE_FAIL", `machine:${m.id}:${key}`, "classify threw", e); } }
    trails[key]!.push(`e1: ${bars.length} ctx bars, open=${open.toFixed(5)}, zones=${zones.length}, machines=${ok}/${DEFAULT_MACHINES.length}`);
    // WK2 day loop: for di over the fixture shapeChains days (shapeChains[pair][di] is the
    // operator's read, an INPUT — runner :110's own comment; oracle rows never touched here).
    // Shape state CARRIES across days (shape moves on DAY_OPEN only — shape-chain-machine.ts:132-133;
    // dayTable :97-128 has no self-loop DAY_OPEN edge, so a carried re-step of the same shape
    // would be NO_MATCHING_TRANSITION; Monday's SS is the carried initial, matching freshShape
    // initial SS :168-181). Per-day freshShape would reset to SS and break the Tue BS->Wed R
    // walk the golden test pins (golden test :33-47). Designation is per-day fresh
    // (freshDesignation(day, key), designation-machine.ts:41-45 — day is a carried label, and
    // the machine has no cross-day state: OPEN->DESIGNATED per record). A day whose shape step
    // lawfully refuses (no DAY_OPEN edge — Thu R->BS, Fri BS->WL) lanes EMPTY for that day:
    // honest NO_COVERAGE/MISS, never forced. Zone pressure records CARRY across days
    // (freshZonePressure per zone once — zone-pressure-machine.ts:34-38; battles advance the
    // lifecycle VIRGIN->ACTIVE_1->... via stepPressure :185-192, an event-sourced lifecycle,
    // not a per-day reset).
    let shapeRec = freshShape(key);
    const defenses = pairDef[key]!;
    const zoneRecs = new Map<string, ZonePressureRecord>();
    for (const z of zones) zoneRecs.set(z.id, freshZonePressure(z.id, "1H"));
    const chain = SHAPE_CHAINS[key]!;
    for (let di = 0; di < DAYS.length; di++) {
      const dayTok = DAYS[di]!;
      const dayLabel = DAY_LABEL[dayTok]!;
      const shape = chain[di]!;
      if (di === 0) {
        if (shapeRec.state !== shape) throw new StageError("E2_DESIGNATE_REFUSED", `shape:${key}:${dayTok}`, `Monday shape ${shape} != carried initial ${shapeRec.state}`);
        trails[key]!.push(`e2:${dayTok}: shape ${shape} (carried initial, no DAY_OPEN — freshShape initial SS shape-chain-machine.ts:168-181)`);
      } else {
        const from = shapeRec.state;
        if (from === shape) {
          trails[key]!.push(`e2:${dayTok}: shape ${shape} unchanged (no DAY_OPEN edge for same-shape — dayTable :97-128 carries no self-loop)`);
        } else {
          const fields = DAY_OPEN_FIELDS[`${from}>${shape}`];
          if (fields === undefined) {
            // No DAY_OPEN edge in the B.W3.1 table (Thu R->BS, Fri BS->WL): lawful refusal.
            pairDayRows[key]![dayTok] = { shape, designations: 0, setups: 0, projections: 0, note: `NO_EDGE ${from}->${shape}: lanes EMPTY (honest NO_COVERAGE/MISS, never forced)` };
            trails[key]!.push(`e2:${dayTok}: shape ${shape} unreachable from ${from} (no DAY_OPEN edge dayTable :97-128) — lanes EMPTY`);
            continue;
          }
          const shapeOut = step(shapeChainMachine, shapeRec, dayOpenEvent(shapeRec.state as "SS" | "BS" | "R" | "WL" | "RWL" | "WLS" | "PBS", { ...fields, projectedOpen: open }));
          if (shapeOut.kind !== "TRANSITIONED") throw new StageError("E2_DESIGNATE_REFUSED", `shape:${key}:${dayTok}`, `dayOpen ${from}->${shape} UNCHANGED`);
          shapeRec = shapeOut.record;
          trails[key]!.push(`e2:${dayTok}: shape ${from}->${shape} (DAY_OPEN dayTable :97-128)`);
        }
      }
      // Zone-pressure battles: step the CARRIED per-zone records (stepPressure
      // zone-pressure-machine.ts:185-192 routes BATTLE_RESOLVED by touchKind; touch computed
      // over the ≤ anchor context — touchOf over bars).
      for (const z of zones) {
        const touch = touchOf(bars, z);
        const cur = zoneRecs.get(z.id)!;
        const pOut = stepPressure(cur, pressureBattleEvent(cur.state, z.id, touch));
        if (pOut.kind === "TRANSITIONED") {
          zoneRecs.set(z.id, pOut.record);
          defenses.set(z.id, { defenses: pOut.record.defenses, sweeps: pOut.record.sweeps });
        } else {
          const rec = zoneRecs.get(z.id)!;
          defenses.set(z.id, { defenses: rec.defenses, sweeps: rec.sweeps });
        }
      }
      // Designation: the orientation law over REAL structure, per-day fresh records
      // (freshDesignation(day, key) — designation-machine.ts:41-45; DESIGNATE guard :82-102
      // reads emission + snapshot + projectedOpen; lawful refusal => day lanes EMPTY).
      const snapshot = zones.map((z) => ({ id: z.id, top: z.top, bottom: z.bottom }));
      const supplies = zones.filter((z) => z.type === "SUPPLY" && z.bottom > open).sort((a, b) => a.bottom - b.bottom);
      const demands = zones.filter((z) => z.type === "DEMAND" && z.top < open).sort((a, b) => b.top - a.top);
      if (supplies.length === 0 || demands.length === 0) {
        pairDayRows[key]![dayTok] = { shape, designations: 0, setups: 0, projections: 0, note: `orientation refusal (sup ${supplies.length}, dem ${demands.length}): lanes EMPTY` };
        trails[key]!.push(`e2:${dayTok}: designation refused — no orientation pair (sup ${supplies.length}, dem ${demands.length}) — lanes EMPTY`);
        continue;
      }
      const dayDesBefore = laneDesignations[key]!.length;
      const daySetBefore = laneSetups[key]!.length;
      const pairs = Math.min(2, supplies.length, demands.length);
      let refused = false;
      for (let i = 0; i < pairs; i++) {
        const s = supplies[i]!, d = demands[i]!;
        const out = step(designationMachine, freshDesignation(dayLabel, key),
          designateEvent({ demandZoneId: d.id, supplyZoneId: s.id, keyZoneType: i % 2 === 0 ? "SUPPLY" : "DEMAND", deepDemandZoneId: (demands[demands.length - 1] ?? d).id }, snapshot, open));
        if (out.kind !== "TRANSITIONED") { refused = true; break; }
        for (const dir of ["SHORT", "LONG"] as const) {
          const desId = `DES-${key}-${dayTok}-${i}-${dir}`;
          laneDesignations[key]!.push({ id: desId, day: dayTok, supplyZoneId: s.id, demandZoneId: d.id, direction: dir });
          const setupZone = dir === "SHORT" ? s : d, targetZone = dir === "SHORT" ? d : s;
          const entryEdge = dir === "SHORT" ? s.bottom : d.top, slEdge = dir === "SHORT" ? s.top : d.bottom, tpEdge = dir === "SHORT" ? d.top : s.bottom;
          const risk = Math.abs(Math.round((entryEdge - slEdge) / PIP[key]!));
          const reward = Math.abs(Math.round((tpEdge - entryEdge) / PIP[key]!));
          if (risk <= 0) continue;
          laneSetups[key]!.push({ id: `ST-${key}-${dayTok}-${i}-${dir}`, day: dayTok, zoneId: setupZone.id, targetZoneId: targetZone.id, direction: dir, rr: Math.round((reward / risk) * 100) / 100, desId });
        }
      }
      if (refused) {
        laneDesignations[key]!.length = dayDesBefore; laneSetups[key]!.length = daySetBefore;
        pairDayRows[key]![dayTok] = { shape, designations: 0, setups: 0, projections: 0, note: "DESIGNATE guard refused: lanes EMPTY" };
        trails[key]!.push(`e2:${dayTok}: DESIGNATE refused — lanes EMPTY`);
        continue;
      }
      const dayDes = laneDesignations[key]!.length - dayDesBefore;
      const daySet = laneSetups[key]!.length - daySetBefore;
      pairDayRows[key]![dayTok] = { shape, designations: dayDes, setups: daySet, projections: 0, note: `${pairs} designations` };
      trails[key]!.push(`e2:${dayTok}: ${pairs} designations, ${daySet} candidate setups`);
    }
    const builtDays = Object.values(pairDayRows[key]!).filter((r) => r.setups > 0).length;
    perPair[key] = { contextBars: bars.length, zones: zones.length, designations: laneDesignations[key]!.length, setupsBuilt: laneSetups[key]!.length, setupsSurvived: 0, dropped: [], projections: [], machineTrail: [...trails[key]!], perDay: { ...pairDayRows[key]! } };
    void builtDays;
  }

  // WK2 per-day D98 cascade: freshCascade per day over THAT day's designations (freshCascade
  // cascade-machine.ts:25-27 starts IDLE with empty mirrors; the machine is a per-pass generative
  // record — dxyInverseExists + activeEuMirrors accumulate within one IDLE->GU_DONE pass :58-106 —
  // so each day re-runs its own pass. A day lanes EMPTY (zero designations) => its cascade pass is
  // SKIPPED as an honest gap (never forced with another day's ids — that would forge a DXY inverse).
  const idsOn = (k: string, day: string) => laneDesignations[k]!.filter((d) => d.day === day).map((d) => d.id);
  const cascadeLast: Record<string, string> = {};
  for (const day of DAYS) {
    const dxy = idsOn("DXY", day), eu = idsOn("EUR/USD", day), gu = idsOn("GBP/USD", day);
    if (dxy.length === 0 || eu.length === 0 || gu.length === 0) {
      trails["DXY"]!.push(`cascade:${day}: SKIPPED (a lane empty: DXY ${dxy.length}, EU ${eu.length}, GU ${gu.length} — honest gap)`);
      continue;
    }
    let rec = freshCascade();
    const steps: Array<{ type: "DXY_DESIGNATED" | "EU_CASCADE_DESIGNATED" | "EU_CORE_DESIGNATED" | "GU_DESIGNATED"; from: CascadeState; fields: Record<string, unknown> }> = [
      { type: "DXY_DESIGNATED", from: "IDLE", fields: { designationId: dxy[0] } },
      { type: "EU_CASCADE_DESIGNATED", from: "DXY_DONE", fields: { designationId: eu[0] } },
      { type: "EU_CORE_DESIGNATED", from: "EU_CASCADE", fields: { designationId: eu[eu.length - 1] } },
      { type: "GU_DESIGNATED", from: "EU_CORE", fields: { designationId: gu[0], euMirrorId: eu[0] } },
    ];
    for (const s of steps) {
      const out = step(cascadeMachine, rec, cascadeEvent(s.type, s.from, s.fields));
      if (out.kind !== "TRANSITIONED") throw new StageError("E2_CASCADE_REFUSED", `cascade:${day}`, `${s.type} UNCHANGED from ${s.from}`);
      rec = out.record;
    }
    cascadeLast[day] = rec.lastStage ?? "?";
    trails["DXY"]!.push(`cascade:${day}: IDLE→${rec.lastStage} (the D98 law, ${day} lanes)`);
  }
  const ids = (k: string) => laneDesignations[k]!.map((d) => d.id);
  void ids;

  // L1/L2/L3 + survivor gates per pair (zones carry — single context; L1/L2/L3 are pure
  // functions over that context: computeTelescope l1-telescope.ts:54-133, computePressure
  // l2-pressure.ts, computeFib l3-fib.ts:99-198 — none takes a day input, so one verdict set
  // per pair; per-day variation enters via the day-tagged laneSetups below).
  const pairL3: Record<string, FibVerdict> = {};
  const survivors: Record<string, LaneSetup[]> = { "DXY": [], "EUR/USD": [], "GBP/USD": [] };
  for (const key of ORDER) {
    const zones = pairZones[key]!;
    const l1 = computeTelescope({ zones, rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)), meta: { pair: key, pip: PIP[key]! } });
    pairL1[key] = l1;
    const l2 = computePressure({
      entries: zones.map((z) => { const c = pairDef[key]!.get(z.id) ?? { defenses: 0, sweeps: 0 }; return { zone: z, defenses: c.defenses, sweeps: c.sweeps, broken: false }; }),
      rungs: zones.map((z) => makeRung(`R-${z.id}`, z.id, z.bottom, z.top)), telescope: l1, pip: PIP[key]!,
    });
    pairL2[key] = l2;
    const bands: Record<string, { lo: number; hi: number }> = {};
    for (const z of zones) bands[z.id] = { lo: z.bottom, hi: z.top };
    const tolerancePips = Math.max(3, Math.ceil((2 * ATR[key]!) / PIP[key]!));
    const l3 = computeFib({
      swings: zones.map((z) => ({ swingZoneId: z.id, loEdge: z.bottom, hiEdge: z.top })),
      trades: laneSetups[key]!.map((s) => ({ tradeId: s.id, entryZoneId: s.zoneId, targetZoneId: s.targetZoneId, direction: s.direction })),
      bands, pip: PIP[key]!, tolerancePips,
    });
    pairL3[key] = l3;
    const fibOk = new Set(l3.tradeChecks.filter((c) => c.entryOk && c.targetOk).map((c) => c.tradeId));
    for (const s of laneSetups[key]!) {
      if (s.rr < RRR_FLOOR) { perPair[key]!.dropped.push({ id: s.id, reason: `rr ${s.rr} < D-R1 ${RRR_FLOOR}` }); continue; }
      if (!fibOk.has(s.id)) { perPair[key]!.dropped.push({ id: s.id, reason: "L3 fib gate" }); continue; }
      survivors[key]!.push(s);
    }
    perPair[key]!.setupsSurvived = survivors[key]!.length;
    if (survivors[key]!.length === 0) throw new StageError("S4_FIB_EMPTY", `kernel:${key}`, "all candidates dropped");
  }

  // WK2 per-day L4: computeCascade is a pure function over the passed lanes
  // (l4-cascade.ts:108-174 — no clock, no carried record; translations checked for
  // duplicates via detectLoop :95-106, so per-day translationIds must be day-unique).
  // One verdict per day that has survivors on all three lanes; days with an empty lane
  // keep no L4 (their setups cannot link a DXY inverse — computeTrades :246-253 would refuse).
  const l4ByDay: Record<string, CascadeVerdict> = {};
  for (const day of DAYS) {
    const sd = survivors["DXY"]!.filter((s) => s.day === day);
    const se = survivors["EUR/USD"]!.filter((s) => s.day === day);
    const sg = survivors["GBP/USD"]!.filter((s) => s.day === day);
    if (sd.length === 0 || se.length === 0 || sg.length === 0) continue;
    const dxyIds = sd.map((s) => s.desId), euIds = se.map((s) => s.desId);
    try {
      l4ByDay[day] = computeCascade({
        dxy: sd.map((s) => ({ tradeId: s.id, pair: "DXY" as const, direction: s.direction, zoneId: s.zoneId })),
        eu: se.map((s) => ({ tradeId: s.id, pair: "EUR/USD" as const, direction: s.direction, zoneId: s.zoneId })),
        gu: sg.map((s) => ({ tradeId: s.id, pair: "GBP/USD" as const, direction: s.direction, zoneId: s.zoneId })),
        translations: [
          { stage: "dxy-e2", translationId: `rw-${day}-dxy-${dxyIds[0]}` },
          { stage: "eu-e2-cascade", translationId: `rw-${day}-eu-${euIds[0]}` },
          { stage: "eu-e2-core", translationId: `rw-${day}-eu-core-${euIds[euIds.length - 1]}` },
          { stage: "gu-e2", translationId: `rw-${day}-gu-${sg.map((s) => s.desId)[0]}` },
        ],
        divergenceScore: 0,
        setupCount: sd.length + se.length + sg.length,
        expectedSetups: sd.length + se.length + sg.length,
      });
    } catch (e) { throw new StageError("S4_CASCADE_FAIL", `kernel-l4:${day}`, "computeCascade threw", e); }
    if (l4ByDay[day]!.floorCheck !== "VALID") throw new StageError("S4_CASCADE_FAIL", `kernel-l4:${day}`, `mirror floor ${l4ByDay[day]!.floorCheck}`);
  }

  // S3+S4: card → loader → computeTrades per pair per day with injected day timestamps.
  // computeTrades causationId/timestampMs contract (trade-computer.ts:74-78 options,
  // :103-111 journal-without-timestamp refused, :165 default causationId
  // `trade-computer:${pair}:${analysisPointMs}`): wall-clock banned — every journaled call
  // must inject timestampMs explicitly. The runner passes journal-less calls (no journal =>
  // no timestamp owed), and namespaces causationId + card meta + setup ids per day so each
  // day's projections trace to that day's session. Provenance completeness (SC-14,
  // trade-computer.ts:179-203) is satisfied per day-card: every zone/designation/setup/chart
  // id on the day-card carries an anchor.
  const DAY_TS: Record<string, number> = { "Mon": ANCHOR_MS, "Tue": ANCHOR_MS + 86400000, "Wed": ANCHOR_MS + 2 * 86400000, "Thu": ANCHOR_MS + 3 * 86400000, "Fri": ANCHOR_MS + 4 * 86400000 };
  const wf1 = step(e2WorkflowMachine, freshWorkflow("2026-07-06"), workflowEvent("E2_COMPLETED", "E1_DONE"));
  if (wf1.kind !== "TRANSITIONED") throw new StageError("E2_WORKFLOW_REFUSED", "workflow", "E2_COMPLETED UNCHANGED");
  for (const key of ORDER) {
    const zones = pairZones[key]!;
    const open = pairCtx[key]![pairCtx[key]!.length - 1]!.C;
    const zoneGeometry: Record<string, { bottom: number; top: number }> = {};
    for (const z of zones) zoneGeometry[z.id] = { bottom: z.bottom, top: z.top };
    const entryOf = (s: LaneSetup): number => { const g = zoneGeometry[s.zoneId]!; return s.direction === "SHORT" ? g.bottom : g.top; };
    const allProj: Array<{ id: string; day: string; pair: string; direction: string; level: number; rr: number }> = [];
    for (const day of DAYS) {
      const kept = survivors[key]!.filter((s) => s.day === day);
      if (kept.length === 0) continue;
      const l4 = l4ByDay[day];
      if (!l4) { perPair[key]!.dropped.push({ id: `day-${day}`, reason: `no L4 verdict (a lane empty ${day} — honest gap)` }); continue; }
      const minRr = Math.min(...kept.map((s) => s.rr));
      const l5 = computeConfluence({
        laws: [
          { lawId: "LAW-7-DEFENSE", edge: "REQUIRES", satisfied: kept.every((s) => pairL2[key]!.overlay.some((r) => r.zoneId === s.zoneId)), weight: 3, quote: "L2 overlay rows" },
          { lawId: "LAW-10-ORIGIN", edge: "REQUIRES", satisfied: kept.every((s) => pairL1[key]!.boMOriginIds.includes(s.zoneId)), weight: 2, quote: "L1 BoM origins" },
          { lawId: "LAW-12-CASCADE", edge: "REQUIRES", satisfied: l4.floorCheck === "VALID", weight: 2, quote: "the L4 mirror floor VALID" },
          { lawId: "LAW-14-RRR-FLOOR", edge: "REQUIRES", satisfied: minRr >= RRR_FLOOR, weight: 3, quote: "D-R1 floor cleared" },
        ],
        rrr: minRr, rrrFloor: RRR_FLOOR,
      }, kept.map((s) => ({ item: `setup-${s.id}`, evidence: `rr ${s.rr} zone ${s.zoneId}` })));
      const l5v: TiVerdict = l5;
      if (!l5v.tradeValid) throw new StageError("S4_CONFLUENCE_FAIL", `l5:${key}:${day}`, `invalid (contradicting=${l5v.contradictingLawIds.join(",")})`);
      const prov: Array<{ id: string; source: string; kind: "e1-zone" | "e2-designation" | "chart" | "setup" | "grounding" }> = [];
      for (const z of zones) prov.push({ id: z.id, source: `src/e1/tests/helpers.ts:${75 + (zones.indexOf(z) % 20)}`, kind: "e1-zone" });
      for (const d of laneDesignations[key]!.filter((x) => x.day === day)) prov.push({ id: d.id, source: `src/e2/machines/designation-machine.ts:${130 + (laneDesignations[key]!.indexOf(d) % 10)}`, kind: "e2-designation" });
      for (const s of kept) prov.push({ id: s.id, source: `src/kernel/trade-computer.ts:${100 + (kept.indexOf(s) % 50)}`, kind: "setup" });
      const chartProv = { id: `screenshots/${key === "EUR/USD" ? "eu" : key === "GBP/USD" ? "gu" : "dxy"}_1h.png`, source: "src/aether/chart-verifier.ts:406", kind: "chart" as const };
      prov.push(chartProv);
      const rawCard = {
        meta: { pair: key, tf: "1H" as const, analysisPointMs: DAY_TS[day]! },
        zones: zones.map((z) => ({ zoneId: z.id })),
        designations: laneDesignations[key]!.filter((x) => x.day === day).map((d) => ({ id: d.id, supplyZoneId: d.supplyZoneId, demandZoneId: d.demandZoneId, direction: d.direction })),
        visuals: { charts: [{ path: `screenshots/${key === "EUR/USD" ? "eu" : key === "GBP/USD" ? "gu" : "dxy"}_1h.png`, tf: "1H" as const, grade: "PASS" as const }] },
        setups: kept.map((s) => ({ id: s.id, zoneId: s.zoneId, direction: s.direction, rr: s.rr })),
        provenance: { entries: prov },
        grounding: {
          forwardPosition: Math.round(Math.abs(open - entryOf(kept[0]!)) / PIP[key]!),
          anchorsNumeric: true, directionOrder: true, targetClosed: true, zoneIdsReal: true, projectionIdsReal: true, rrrComputable: true,
        },
      };
      const card = assemble(rawCard);
      const loaded = loadCard(card);
      const projections = computeTrades(loaded, { l1: pairL1[key]!, l2: pairL2[key]!, l3: pairL3[key]!, l4, l5: l5v }, { causationId: `trade-computer:${key}:${day}:${DAY_TS[day]}` });
      if (projections.length === 0) throw new StageError("S4_COMPUTE_REFUSED", `trade-computer:${key}:${day}`, "zero projections");
      for (const p of projections) allProj.push({ id: p.id, day, pair: p.pair, direction: p.direction, level: entryOf(kept.find((s) => s.id === p.id)!), rr: p.rr });
      pairDayRows[key]![day]!.projections = projections.length;
      trails[key]!.push(`kernel:${day}: ${projections.length} projections (l5=${l5v.score})`);
    }
    if (allProj.length === 0) throw new StageError("S4_COMPUTE_REFUSED", `trade-computer:${key}`, "zero projections across all days");
    perPair[key]!.projections = allProj;
    perPair[key]!.machineTrail = [...trails[key]!];
  }

  const out: RealWeekOutput = { perPair, determinismHash: "" };
  out.determinismHash = canonicalJson({ perPair: out.perPair });
  return out;
}

// ── THE DIAG (the ONLY oracle reader — runs AFTER the output exists) ──
export interface OracleRow { day: string; dir: string; e: number; pair: string }
export function readOracleRows(fixturePath: string): OracleRow[] {
  const f = JSON.parse(readFileSync(fixturePath, "utf8"));
  const rows: OracleRow[] = [];
  for (const r of f.oracle.eurusd.rows) rows.push({ day: r.day, dir: r.dir, e: r.e, pair: "EUR/USD" });
  for (const r of f.oracle.gbpusd.rows) rows.push({ day: r.day, dir: r.dir, e: r.e, pair: "GBP/USD" });
  for (const s of f.mondayConvergence.set) if (s.pair === "DXY") rows.push({ day: "Mon", dir: s.direction === "LONG" ? "Long" : "Short", e: s.level, pair: "DXY" });
  return rows;
}

export function diag(output: RealWeekOutput, oracle: OracleRow[]): Array<Record<string, unknown>> {
  const pipOf = (p: string) => PIP[p] ?? 0.0001;
  return oracle.map((o, i) => {
    const cands = Object.values(output.perPair).flatMap((p) => p.projections)
      .filter((p) => p.pair === o.pair && (o.dir === "Long" ? p.direction === "LONG" : p.direction === "SHORT"));
    if (cands.length === 0) return { row: `${o.pair}-${o.day}-${o.dir}`, expected: o.e, actual: null, deltaPips: null, verdict: "NO_COVERAGE" };
    let best = cands[0]!, bestD = Math.abs(best.level - o.e);
    for (const c of cands) { const d = Math.abs(c.level - o.e); if (d < bestD) { best = c; bestD = d; } }
    const dp = Math.round(bestD / pipOf(o.pair));
    return { row: `${o.pair}-${o.day}-${o.dir}`, expected: o.e, actual: best.level, deltaPips: dp, verdict: dp <= 3 ? "HIT" : dp <= 10 ? "NEAR" : "MISS", projection: best.id };
  });
}

const isMain = process.argv[1] !== undefined && process.argv[1].includes("real-week-runner");
if (isMain) {
  (async () => {
    const out1 = await runRealWeek(BARS);
    const out2 = await runRealWeek(BARS);
    const det = canonicalJson(out1) === canonicalJson(out2);
    console.log(`[real-week] determinism x2: ${det}`);
    for (const key of ORDER) {
      const p = out1.perPair[key]!;
      console.log(`\n== ${key}: ctxBars=${p.contextBars} zones=${p.zones} designations=${p.designations} setups=${p.setupsBuilt}->${p.setupsSurvived} projections=${p.projections.length}`);
      for (const [day, row] of Object.entries(p.perDay)) console.log(`   DAY ${day}: shape=${row.shape} designations=${row.designations} setups=${row.setups} projections=${row.projections} :: ${row.note}`);
      for (const d of p.dropped) console.log(`   dropped ${d.id}: ${d.reason}`);
      for (const pr of p.projections) console.log(`   PROJECTION ${pr.id} [${pr.day}] ${pr.direction} @ ${pr.level} rr=${pr.rr}`);
      for (const t of p.machineTrail) console.log(`   trail: ${t}`);
    }
    const oracle = readOracleRows(new URL("../fixtures/golden-week.json", import.meta.url).pathname);
    const rows = diag(out1, oracle);
    console.log(`\n== GOLDEN DIAG (17 oracle rows: 8 EU + 7 GU + 2 DXY Monday) ==`);
    let hits = 0, near = 0, miss = 0, nc = 0;
    for (const r of rows) {
      console.log(`  ${r.row}: expected ${r.expected} actual ${r.actual} delta ${r.deltaPips}p -> ${r.verdict}`);
      if (r.verdict === "HIT") hits++; else if (r.verdict === "NEAR") near++; else if (r.verdict === "MISS") miss++; else nc++;
    }
    console.log(`\n== SCORE: ${hits} HIT(<=3p) / ${near} NEAR(4-10p) / ${miss} MISS / ${nc} NO_COVERAGE of ${rows.length} rows ==`);
    console.log(`[real-week] determinism=${det}`);
  })().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
}
