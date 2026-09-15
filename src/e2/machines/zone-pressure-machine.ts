// src/e2/machines/zone-pressure-machine.ts — B.W3.4 first half.
// The lifecycle runs on EVENTS (BATTLE_RESOLVED), not bar-counts: battles
// advance the state; the 4H-never-death guard refuses DEPLETED on 4H (the
// DEATH_SCOPE_TFS=['30m','1H'] law from the E1 engine).
//
// THE ROUTER (why it exists — read before touching this file): the LANDED L3
// step() core (state-machine.ts:11-14) is FIRST-match-wins with NO fallthrough
// — the first transition matching (event, from) decides; a failed guard ends
// the step as UNCHANGED. Overlapping BATTLE_RESOLVED guards can therefore
// never coexist in one table. routeBattle() fans BATTLE_RESOLVED out by
// touchKind (+ tf + counters) into disjoint sub-events, so each (event, from)
// has EXACTLY ONE transition. The guards re-verify the router's decision
// (defense in depth — a router/guard disagreement surfaces as UNCHANGED and
// the tests pin every route). External callers send BATTLE_RESOLVED only.

import type { MachineDefinition, MachineRecordBase, StepResult, WarheadEvent } from "../../substrate/L3-lasme/index";
import { step, withTriad } from "../../substrate/L3-lasme/index";
import { ev, violation, type TouchKind } from "./types";

export type ZonePressureState = "VIRGIN" | "ACTIVE_1" | "ACTIVE_2" | "DEPLETED" | "FORTRESS" | "BROKEN";
export const ZONE_PRESSURE_MACHINE_ID = "zone-pressure";
const HERE = "src/e2/machines/zone-pressure-machine.ts";

/** DEATH_SCOPE: only 30m/1H zones can die — 4H NEVER dies (E1 engine law). */
export type DeathScopeTf = "30m" | "1H" | "4H" | "15m";

export interface ZonePressureRecord extends MachineRecordBase {
  readonly zoneId: string;
  readonly tf: DeathScopeTf;
  readonly defenses: number;
  readonly sweeps: number;
}

export function freshZonePressure(zoneId: string, tf: DeathScopeTf): ZonePressureRecord {
  if (typeof zoneId !== "string" || zoneId.length === 0) throw violation("PRESSURE_BAD_ZONE", "zoneId must be non-empty");
  if (tf !== "30m" && tf !== "1H" && tf !== "4H" && tf !== "15m") throw violation("PRESSURE_BAD_TF", `unknown timeframe: ${String(tf)}`);
  return { machineId: ZONE_PRESSURE_MACHINE_ID, state: "VIRGIN", seq: 0, triads: [], zoneId, tf, defenses: 0, sweeps: 0 };
}

export function readTouch(e: WarheadEvent): TouchKind | null {
  const k = (e.payload as Record<string, unknown>)["touchKind"];
  return k === "SWEEP" || k === "WICK_REJECT" || k === "BODY_DEFEND" || k === "CONSOL_DWELL" || k === "PASS_THROUGH" ? k : null;
}

const isDefend = (b: TouchKind): boolean => b === "BODY_DEFEND" || b === "WICK_REJECT";
const isSweep = (b: TouchKind): boolean => b === "SWEEP";

export type PressureSubEvent = "BATTLE_HOLD" | "BATTLE_SWEEP" | "BATTLE_FORTIFY" | "BATTLE_BREAK";

/**
 * The touch-class router: BATTLE_RESOLVED -> exactly one disjoint sub-event.
 * Returns null on malformed input (the caller reports UNCHANGED loud, never throws).
 */
export function routeBattle(r: ZonePressureRecord, touch: TouchKind | null): PressureSubEvent | null {
  if (touch === null) return null;
  if (touch === "PASS_THROUGH") return "BATTLE_BREAK";
  if (isSweep(touch)) {
    // 4H sweeps never deplete — absorbed as holds (the death-scope law).
    if (r.tf === "4H") return "BATTLE_HOLD";
    return "BATTLE_SWEEP";
  }
  if (isDefend(touch) && (r.state === "ACTIVE_1" || r.state === "ACTIVE_2") && r.sweeps === 0 && r.defenses + 1 >= 4) {
    return "BATTLE_FORTIFY"; // the 4th clean defense
  }
  return "BATTLE_HOLD";
}

const malformed = "BATTLE_RESOLVED malformed: touchKind must be a known TouchKind";

export const zonePressureMachine: MachineDefinition<ZonePressureState, ZonePressureRecord> = {
  machineId: ZONE_PRESSURE_MACHINE_ID,
  states: ["VIRGIN", "ACTIVE_1", "ACTIVE_2", "DEPLETED", "FORTRESS", "BROKEN"],
  initial: "VIRGIN",
  // Each (sub-event, from) appears EXACTLY ONCE — the first-match-wins core
  // can never shadow a sibling (see the ROUTER note above).
  transitions: [
    { id: "virgin-hold", event: "BATTLE_HOLD", from: ["VIRGIN"], to: "ACTIVE_1",
      guard: (_r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (b === "PASS_THROUGH") return { allowed: false, reason: "router disagreement: PASS_THROUGH is never a hold" };
        return { allowed: true };
      },
      apply: (r, e) => {
        const b = readTouch(e) as TouchKind;
        return { ...withTriad({ ...r }, e), defenses: isDefend(b) ? r.defenses + 1 : r.defenses, sweeps: isSweep(b) ? r.sweeps + 1 : r.sweeps } as ZonePressureRecord;
      } },
    { id: "virgin-break", event: "BATTLE_BREAK", from: ["VIRGIN"], to: "BROKEN",
      guard: (_r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: true } : { allowed: false, reason: "router disagreement: only PASS_THROUGH breaks" };
      },
      apply: (r, e) => withTriad({ ...r }, e) },
    { id: "active1-hold", event: "BATTLE_HOLD", from: ["ACTIVE_1"], to: "ACTIVE_2",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (b === "PASS_THROUGH") return { allowed: false, reason: "router disagreement: PASS_THROUGH is never a hold" };
        if (isDefend(b) && r.sweeps === 0 && r.defenses + 1 >= 4) return { allowed: false, reason: "router disagreement: 4th clean defense fortifies" };
        if (isSweep(b) && r.tf !== "4H") return { allowed: false, reason: "router disagreement: non-4H sweep depletes" };
        return { allowed: true };
      },
      apply: (r, e) => {
        const b = readTouch(e) as TouchKind;
        return { ...withTriad({ ...r }, e), defenses: isDefend(b) ? r.defenses + 1 : r.defenses, sweeps: isSweep(b) ? r.sweeps + 1 : r.sweeps } as ZonePressureRecord;
      } },
    { id: "active1-sweep", event: "BATTLE_SWEEP", from: ["ACTIVE_1"], to: "DEPLETED",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (!isSweep(b)) return { allowed: false, reason: "router disagreement: only SWEEP depletes" };
        // THE 4H-NEVER-DEATH GUARD (double-pinned: the router already reroutes 4H sweeps to HOLD).
        if (r.tf === "4H") return { allowed: false, reason: "4H NEVER dies — DEPLETED refused (the death-scope law)" };
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), sweeps: r.sweeps + 1 } as ZonePressureRecord) },
    { id: "active1-fortify", event: "BATTLE_FORTIFY", from: ["ACTIVE_1"], to: "FORTRESS",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (!isDefend(b) || r.sweeps !== 0 || r.defenses + 1 < 4) {
          return { allowed: false, reason: `router disagreement: fortify needs a defense reaching >=4 with 0 sweeps (got ${b})` };
        }
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), defenses: r.defenses + 1 } as ZonePressureRecord) },
    { id: "active1-break", event: "BATTLE_BREAK", from: ["ACTIVE_1"], to: "BROKEN",
      guard: (_r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: true } : { allowed: false, reason: "router disagreement: only PASS_THROUGH breaks" };
      },
      apply: (r, e) => withTriad({ ...r }, e) },
    { id: "active2-hold", event: "BATTLE_HOLD", from: ["ACTIVE_2"], to: "ACTIVE_2",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (b === "PASS_THROUGH") return { allowed: false, reason: "router disagreement: PASS_THROUGH is never a hold" };
        if (isDefend(b) && r.sweeps === 0 && r.defenses + 1 >= 4) return { allowed: false, reason: "router disagreement: 4th clean defense fortifies" };
        if (isSweep(b) && r.tf !== "4H") return { allowed: false, reason: "router disagreement: non-4H sweep depletes" };
        return { allowed: true };
      },
      apply: (r, e) => {
        const b = readTouch(e) as TouchKind;
        return { ...withTriad({ ...r }, e), defenses: isDefend(b) ? r.defenses + 1 : r.defenses, sweeps: isSweep(b) ? r.sweeps + 1 : r.sweeps } as ZonePressureRecord;
      } },
    { id: "active2-sweep", event: "BATTLE_SWEEP", from: ["ACTIVE_2"], to: "DEPLETED",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (!isSweep(b)) return { allowed: false, reason: "router disagreement: only SWEEP depletes" };
        if (r.tf === "4H") return { allowed: false, reason: "4H NEVER dies — DEPLETED refused (the death-scope law)" };
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), sweeps: r.sweeps + 1 } as ZonePressureRecord) },
    { id: "active2-fortify", event: "BATTLE_FORTIFY", from: ["ACTIVE_2"], to: "FORTRESS",
      guard: (r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (!isDefend(b) || r.sweeps !== 0 || r.defenses + 1 < 4) {
          return { allowed: false, reason: `router disagreement: fortify needs a defense reaching >=4 with 0 sweeps (got ${b})` };
        }
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), defenses: r.defenses + 1 } as ZonePressureRecord) },
    { id: "active2-break", event: "BATTLE_BREAK", from: ["ACTIVE_2"], to: "BROKEN",
      guard: (_r, e) => {
        const b = readTouch(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: true } : { allowed: false, reason: "router disagreement: only PASS_THROUGH breaks" };
      },
      apply: (r, e) => withTriad({ ...r }, e) },
  ],
};

export function pressureBattleEvent(from: ZonePressureState, zoneId: string, touchKind: TouchKind): WarheadEvent {
  return ev("BATTLE_RESOLVED", { zoneId, touchKind }, ZONE_PRESSURE_MACHINE_ID, from, "?", `pressure:${touchKind}`, HERE, 40);
}

/**
 * Step the pressure machine on a BATTLE_RESOLVED event: route by touchKind,
 * then step the table on the disjoint sub-event.
 */
export function stepPressure(
  r: ZonePressureRecord,
  e: WarheadEvent,
): StepResult<ZonePressureState, ZonePressureRecord> {
  const sub = routeBattle(r, readTouch(e));
  if (sub === null) return { kind: "UNCHANGED", reason: "GUARD_FAILED" };
  return step(zonePressureMachine, r, { ...e, type: sub });
}
