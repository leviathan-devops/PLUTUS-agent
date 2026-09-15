// src/kernel/l2-pressure.ts — B.W5-L2 PRESSURE-MAPPER (spec B.W5.1 L2 + S-4).
// Pure function: PressureInput -> PressureVerdict. Emits ZONE-ID refs, integer
// counts and boolean states only.
// Doctrine: the FORTRESS flip (>=4 defenses, 0 full-consumption sweeps, spec
// lines 813-824 + zone-pressure-machine.ts routeBattle BATTLE_FORTIFY) and the
// death-scope law (4H NEVER dies — zone-pressure-machine.ts:58-60). Band
// overlap is pip-quantized via the LANDED quantize() — integers compared only.

import type { ZoneModel, Rung } from "../e1/core/types";
import { quantize } from "../../specs/mpse/oracle-registry";
import type { TelescopeVerdict } from "./l1-telescope";

export type FreshnessState = "VIRGIN" | "ACTIVE" | "FORTRESS" | "DEPLETED" | "BROKEN";

export interface PressureZoneInput {
  zone: ZoneModel;
  defenses: number;
  sweeps: number;
  broken: boolean;
}

export interface PressureInput {
  entries: PressureZoneInput[];
  rungs: Rung[];
  telescope: TelescopeVerdict;
  pip: number;
}

export interface PressureOverlap {
  supplyZoneId: string;
  demandZoneId: string;
  overlapPips: number;
}

export interface PressureShield {
  rungId: string;
  shieldedZoneId: string;
  eaten: boolean;
}

export interface PressureOverlayRow {
  zoneId: string;
  defenseCount: number;
  sweepCount: number;
  state: FreshnessState;
}

export interface PressureVerdict {
  fortressZoneIds: string[];
  phantomZoneIds: string[];
  depletedZoneIds: string[];
  brokenZoneIds: string[];
  overlaps: PressureOverlap[];
  shields: PressureShield[];
  overlay: PressureOverlayRow[];
}

export const FORTRESS_DEFENSE_FLOOR = 4;

function fail(field: string, detail: string): Error {
  const e = new Error(`[l2-pressure:PressureInputError] malformed input — field '${field}': ${detail}`);
  e.name = "PressureInputError";
  return e;
}

function stateFor(tf: string | undefined, defenses: number, sweeps: number, broken: boolean): FreshnessState {
  if (broken) return "BROKEN";
  if (defenses >= FORTRESS_DEFENSE_FLOOR && sweeps === 0) return "FORTRESS";
  if (sweeps > 0 && tf !== "4H") return defenses > 0 ? "DEPLETED" : "BROKEN";
  if (defenses === 0 && sweeps === 0) return "VIRGIN";
  return "ACTIVE";
}

export function computePressure(input: PressureInput): PressureVerdict {
  if (typeof input !== "object" || input === null) throw fail("input", "expected object");
  if (!Array.isArray(input.entries) || input.entries.length === 0) throw fail("entries", "expected non-empty array");
  const pip = input.pip;
  if (typeof pip !== "number" || !Number.isFinite(pip) || pip <= 0) throw fail("pip", "expected positive quantum");
  const rungs = Array.isArray(input.rungs) ? input.rungs : [];
  if (typeof input.telescope !== "object" || input.telescope === null) throw fail("telescope", "expected TelescopeVerdict");

  const verdict: PressureVerdict = {
    fortressZoneIds: [],
    phantomZoneIds: [],
    depletedZoneIds: [],
    brokenZoneIds: [],
    overlaps: [],
    shields: [],
    overlay: [],
  };

  const byId = new Map<string, ZoneModel>();
  for (const e of input.entries) {
    if (typeof e !== "object" || e === null) throw fail("entries[]", "expected object");
    const z = (e as PressureZoneInput).zone;
    if (typeof z !== "object" || z === null || typeof (z as ZoneModel).id !== "string") throw fail("entries[].zone", "expected ZoneModel with id");
    const defenses = (e as PressureZoneInput).defenses;
    const sweeps = (e as PressureZoneInput).sweeps;
    if (!Number.isInteger(defenses) || defenses < 0) throw fail("entries[].defenses", "expected non-negative integer");
    if (!Number.isInteger(sweeps) || sweeps < 0) throw fail("entries[].sweeps", "expected non-negative integer");
    byId.set((z as ZoneModel).id, z as ZoneModel);
  }

  for (const e of input.entries) {
    const z = e.zone;
    const st = stateFor(z.tf, e.defenses, e.sweeps, e.broken);
    verdict.overlay.push({ zoneId: z.id, defenseCount: e.defenses, sweepCount: e.sweeps, state: st });
    if (st === "FORTRESS") verdict.fortressZoneIds.push(z.id);
    else if (st === "DEPLETED") verdict.depletedZoneIds.push(z.id);
    else if (st === "BROKEN") verdict.brokenZoneIds.push(z.id);
    if (z.classification === "PHANTOM_BOM") verdict.phantomZoneIds.push(z.id);
  }

  const supplies = input.entries.filter((e) => e.zone.type === "SUPPLY").map((e) => e.zone);
  const demands = input.entries.filter((e) => e.zone.type === "DEMAND").map((e) => e.zone);
  for (const s of supplies) {
    for (const d of demands) {
      const sLo = quantize(Math.min(s.bottom, s.top), pip);
      const sHi = quantize(Math.max(s.bottom, s.top), pip);
      const dLo = quantize(Math.min(d.bottom, d.top), pip);
      const dHi = quantize(Math.max(d.bottom, d.top), pip);
      const lo = Math.max(sLo, dLo);
      const hi = Math.min(sHi, dHi);
      if (hi > lo) verdict.overlaps.push({ supplyZoneId: s.id, demandZoneId: d.id, overlapPips: hi - lo });
    }
  }

  const placedRungs = new Set((input.telescope.lqzRungIds ?? []).length > 0
    ? (input.telescope.rungPlacements ?? []).map((p) => p.rungId)
    : []);
  for (const r of rungs) {
    const row = verdict.overlay.find((o) => o.zoneId === r.zoneId);
    if (row === undefined) continue;
    const listed = placedRungs.size === 0 || placedRungs.has(r.id);
    if (!listed) continue;
    verdict.shields.push({ rungId: r.id, shieldedZoneId: r.zoneId, eaten: row.sweepCount > 0 });
  }

  return verdict;
}
