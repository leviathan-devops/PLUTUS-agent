// src/e2/machines/designation-machine.ts — B.W3.2 (spec lines 978-1002) + S-2 totality.
// OPEN->DESIGNATED->CONSUMED|INCOMPLETE. Emissions are ZONE IDS ONLY — the
// DesignationEmission type LITERALLY HAS NO PRICE FIELD (SC-7, type-enforced:
// adding one breaks the sc7NoPriceField compile proof in tests).

import type { MachineDefinition, MachineRecordBase, WarheadEvent } from "../../substrate/L3-lasme/index";
import { withTriad } from "../../substrate/L3-lasme/index";
import { ev, sideMatchId, violation, type Direction, type PairKey } from "./types";

export type DesignationState = "OPEN" | "DESIGNATED" | "CONSUMED" | "INCOMPLETE";
export const DESIGNATION_MACHINE_ID = "designation";
const HERE = "src/e2/machines/designation-machine.ts";

/**
 * THE SC-7 TYPE: zone IDs only. There is no price/top/bottom/floor/ceiling
 * field on this interface — grep the file for those tokens to verify (0 hits
 * on the emission lines; the guard reads geometry from the E1 snapshot, never
 * from the emission).
 */
export interface DesignationEmission {
  readonly demandZoneId: string;
  readonly supplyZoneId: string;
  readonly keyZoneType: "DEMAND" | "SUPPLY";
  readonly deepDemandZoneId: string;
}

export interface ZoneGeometry {
  readonly id: string;
  readonly top: number;
  readonly bottom: number;
}

export interface DesignationRecord extends MachineRecordBase {
  readonly day: string;
  readonly pair: PairKey;
  readonly emission: DesignationEmission | null;
  readonly consumedBy: string | null;
  readonly failReason: string | null;
}

export function freshDesignation(day: string, pair: PairKey): DesignationRecord {
  if (typeof day !== "string" || day.length === 0) throw violation("DESIGNATION_BAD_DAY", "day must be a non-empty string");
  if (pair !== "DXY" && pair !== "EUR/USD" && pair !== "GBP/USD") throw violation("DESIGNATION_BAD_PAIR", `unknown pair: ${String(pair)}`);
  return { machineId: DESIGNATION_MACHINE_ID, state: "OPEN", seq: 0, triads: [], day, pair, emission: null, consumedBy: null, failReason: null };
}

function readDesignate(e: WarheadEvent): { emission: DesignationEmission; snapshot: ZoneGeometry[]; projectedOpen: number } | null {
  const p = e.payload as Record<string, unknown>;
  const em = p["emission"] as Record<string, unknown> | undefined;
  const snap = p["snapshot"] as unknown;
  if (typeof em !== "object" || em === null || !Array.isArray(snap) || typeof p["projectedOpen"] !== "number" || !Number.isFinite(p["projectedOpen"])) return null;
  if (
    typeof em["demandZoneId"] !== "string" || typeof em["supplyZoneId"] !== "string" ||
    (em["keyZoneType"] !== "DEMAND" && em["keyZoneType"] !== "SUPPLY") ||
    typeof em["deepDemandZoneId"] !== "string"
  ) return null;
  const zones = (snap as Array<Record<string, unknown>>).map((z) => ({
    id: String(z["id"]), top: Number(z["top"]), bottom: Number(z["bottom"]),
  }));
  if (zones.some((z) => typeof z.id !== "string" || !Number.isFinite(z.top) || !Number.isFinite(z.bottom))) return null;
  return {
    emission: em as unknown as DesignationEmission,
    snapshot: zones,
    projectedOpen: p["projectedOpen"] as number,
  };
}

function readConsume(e: WarheadEvent): { anchorZoneId: string; direction: Direction } | null {
  const p = e.payload as Record<string, unknown>;
  const dir = p["direction"];
  if (typeof p["anchorZoneId"] !== "string" || (dir !== "LONG" && dir !== "SHORT")) return null;
  return { anchorZoneId: p["anchorZoneId"] as string, direction: dir };
}

export const designationMachine: MachineDefinition<DesignationState, DesignationRecord> = {
  machineId: DESIGNATION_MACHINE_ID,
  states: ["OPEN", "DESIGNATED", "CONSUMED", "INCOMPLETE"],
  initial: "OPEN",
  // ORDER IS LOAD-BEARING: DESIGNATE before FAIL (a valid designation wins over absence).
  transitions: [
    { id: "designate", event: "DESIGNATE", from: ["OPEN"], to: "DESIGNATED",
      guard: (r, e) => {
        const d = readDesignate(e);
        if (d === null) return { allowed: false, reason: "DESIGNATE malformed: emission{demandZoneId,supplyZoneId,keyZoneType,deepDemandZoneId} + snapshot[] + numeric projectedOpen required" };
        // S-2 B-2 totality: all 4 IDs exist in the E1 ZoneMapSnapshot.
        const ids = new Set(d.snapshot.map((z) => z.id));
        const missing = [d.emission.demandZoneId, d.emission.supplyZoneId, d.emission.deepDemandZoneId]
          .filter((id) => !ids.has(id));
        if (missing.length > 0) return { allowed: false, reason: `totality: zone IDs absent from the E1 snapshot: ${missing.join(",")}` };
        // The orientation law: supply ABOVE the projected open, demand BELOW.
        const byId = new Map(d.snapshot.map((z) => [z.id, z] as const));
        const supply = byId.get(d.emission.supplyZoneId)!;
        const demand = byId.get(d.emission.demandZoneId)!;
        if (!(supply.bottom > d.projectedOpen)) {
          return { allowed: false, reason: `orientation: supply bottom ${supply.bottom} must be ABOVE projected open ${d.projectedOpen}` };
        }
        if (!(demand.top < d.projectedOpen)) {
          return { allowed: false, reason: `orientation: demand top ${demand.top} must be BELOW projected open ${d.projectedOpen}` };
        }
        void r;
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), emission: (readDesignate(e) as { emission: DesignationEmission }).emission } as DesignationRecord) },
    { id: "consume", event: "CONSUME", from: ["DESIGNATED"], to: "CONSUMED",
      guard: (r, e) => {
        const c = readConsume(e);
        if (c === null) return { allowed: false, reason: "CONSUME malformed: anchorZoneId + direction LONG|SHORT required" };
        if (r.emission === null) return { allowed: false, reason: "CONSUME with no emission — DESIGNATE first" };
        // The consuming anchor must trace to the designation ID (B.W3.2 CONSUMED guard).
        const known = [r.emission.supplyZoneId, r.emission.demandZoneId];
        if (!known.includes(c.anchorZoneId)) {
          return { allowed: false, reason: `E3_DISOBEYED_E2: anchor ${c.anchorZoneId} traces to no designation ID` };
        }
        // THE D50 SIDE-MATCH RULE (S-1 B-1): LONG matches demandZoneId ONLY.
        const expected = sideMatchId(c.direction, r.emission);
        if (c.anchorZoneId !== expected) {
          return { allowed: false, reason: `SIDE_INVERSION_VIOLATION: ${c.direction} mirror consumed ${c.anchorZoneId}, expected ${expected}` };
        }
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), consumedBy: (readConsume(e) as { anchorZoneId: string }).anchorZoneId } as DesignationRecord) },
    { id: "fail", event: "FAIL", from: ["OPEN", "DESIGNATED"], to: "INCOMPLETE",
      guard: (_r, e) => {
        const p = e.payload as Record<string, unknown>;
        if (typeof p["reason"] !== "string" || (p["reason"] as string).length === 0) {
          return { allowed: false, reason: "FAIL malformed: non-empty reason required (INCOMPLETE is LOUD, never silent)" };
        }
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), failReason: (e.payload as Record<string, unknown>)["reason"] as string } as DesignationRecord) },
  ],
  invariants: [
    (r) => ({ ok: r.emission === null || (typeof r.emission.demandZoneId === "string" && typeof r.emission.supplyZoneId === "string"), invariantId: "I_DESIGNATION_SHAPE" }),
  ],
};

/** DESIGNATE event: the emission + the E1 snapshot + the projected open (all guards read from HERE). */
export function designateEvent(emission: DesignationEmission, snapshot: ZoneGeometry[], projectedOpen: number): WarheadEvent {
  return ev("DESIGNATE", { emission, snapshot, projectedOpen }, DESIGNATION_MACHINE_ID, "OPEN", "DESIGNATED", "designation:totality", HERE, 60);
}

/** CONSUME event: the E3 anchor trace + the mirror direction (the D50 match input). */
export function consumeEvent(anchorZoneId: string, direction: Direction): WarheadEvent {
  return ev("CONSUME", { anchorZoneId, direction }, DESIGNATION_MACHINE_ID, "DESIGNATED", "CONSUMED", "designation:side-match", HERE, 80);
}

/** FAIL event: the honest absence — LOUD via the reason, never silent. */
export function failEvent(reason: string): WarheadEvent {
  return ev("FAIL", { reason }, DESIGNATION_MACHINE_ID, "OPEN", "INCOMPLETE", "designation:honest-absence", HERE, 95);
}
