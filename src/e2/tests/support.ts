import { readFileSync } from "node:fs";
import { join } from "node:path";
import { step } from "../../substrate/L3-lasme/index.ts";
import {
  consumeEvent,
  designateEvent,
  designationMachine,
  freshDesignation,
  type DesignationEmission,
  type DesignationRecord,
  type ZoneGeometry,
} from "../machines/designation-machine.ts";
import type { Direction, PairKey } from "../machines/types.ts";

const FIXTURE_ROOT = join(import.meta.dir, "..", "..", "..", "specs", "fixtures");

export function readJson<T>(rel: string): T {
  const raw = readFileSync(join(FIXTURE_ROOT, rel), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`[FIXTURE_EMPTY] ${rel} parsed to non-object`);
  }
  return parsed as T;
}

export interface GoldenWeek {
  meta: { analysisPointMs: number; pairs: string[]; week: string };
  oracle: {
    eurusd: { rows: Array<{ day: string; dir: string; e: number }> };
    gbpusd: { rows: Array<{ day: string; dir: string; e: number }> };
  };
  shapeChains: Record<string, string[]>;
  mondayConvergence: { set: Array<{ direction: string; level: number; pair: string }> };
}

export function loadGoldenWeek(): GoldenWeek {
  return readJson<GoldenWeek>("golden-week.json");
}

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const PAIRS: PairKey[] = ["DXY", "EUR/USD", "GBP/USD"];
export const DIRECTIONS: Direction[] = ["LONG", "SHORT"];

const DAY_MS = 86_400_000;

export function dayMs(anchorMs: number, day: string): number {
  const idx = DAYS.indexOf(day);
  if (idx < 0) throw new RangeError(`[DAY_RANGE] unknown day ${day}`);
  return anchorMs - (DAYS.length - 1 - idx) * DAY_MS;
}

/** Independent test spots — not golden-week oracle entries (D13). */
export const TEST_SPOT: Record<PairKey, number> = {
  DXY: 101.0,
  "EUR/USD": 1.14,
  "GBP/USD": 1.33,
};

function testSpot(pair: PairKey): number {
  return TEST_SPOT[pair];
}

export interface PairSnapshot {
  zones: ZoneGeometry[];
  projectedOpen: number;
}

export function buildSnapshot(
  pair: PairKey,
  day: string,
  gw: GoldenWeek,
  direction: Direction = "LONG",
): PairSnapshot {
  const base = testSpot(pair);
  const spread = pair === "DXY" ? 0.2 : 0.002;
  const t = dayMs(gw.meta.analysisPointMs, day);
  const scope = `${pair}|1H|${t}|${direction}`;
  return {
    projectedOpen: base,
    zones: [
      { id: `${scope}|supply`, top: base + 2 * spread, bottom: base + spread },
      { id: `${scope}|demand`, top: base - spread, bottom: base - 2 * spread },
      { id: `${scope}|deep`, top: base - 2 * spread, bottom: base - 3 * spread },
      { id: `${scope}|extra`, top: base + 4 * spread, bottom: base + 3 * spread },
    ],
  };
}

export function designatePair(pair: PairKey, day: string, direction: Direction, gw: GoldenWeek) {
  const snap = buildSnapshot(pair, day, gw, direction);
  const emission: DesignationEmission = {
    supplyZoneId: snap.zones[0].id,
    demandZoneId: snap.zones[1].id,
    keyZoneType: direction === "LONG" ? "DEMAND" : "SUPPLY",
    deepDemandZoneId: snap.zones[2].id,
  };
  const out = step(designationMachine, freshDesignation(day, pair), designateEvent(emission, snap.zones, snap.projectedOpen));
  if (out.kind !== "TRANSITIONED") {
    throw new Error(`[TOTALITY_SETUP] designate failed for ${pair} ${day}: ${JSON.stringify(out)}`);
  }
  return { record: out.record, emission, snap };
}

export function consumeStep(record: DesignationRecord, anchorZoneId: string, direction: Direction) {
  return step(designationMachine, record, consumeEvent(anchorZoneId, direction));
}
