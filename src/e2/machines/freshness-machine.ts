// src/e2/machines/freshness-machine.ts — B.W3.4 second half.
// FRESH->TESTED->DEPLETED|VIOLATED on EVENTS, not bar-counts. The 4H-never-death
// guard refuses DEPLETED on 4H (same death-scope law as the pressure machine).
//
// THE ROUTER (same law as zone-pressure-machine.ts): the L3 core is
// first-match-wins with no fallthrough, so BATTLE_RESOLVED fans out by
// touchKind into disjoint sub-events — one transition per (event, from).

import type { MachineDefinition, MachineRecordBase, StepResult, WarheadEvent } from "../../substrate/L3-lasme/index";
import { step, withTriad } from "../../substrate/L3-lasme/index";
import { ev, violation, type TouchKind } from "./types";
import type { DeathScopeTf } from "./zone-pressure-machine";

export type FreshnessState = "FRESH" | "TESTED" | "DEPLETED" | "VIOLATED";
export const FRESHNESS_MACHINE_ID = "freshness";
const HERE = "src/e2/machines/freshness-machine.ts";

export interface FreshnessRecord extends MachineRecordBase {
  readonly zoneId: string;
  readonly tf: DeathScopeTf;
  readonly tests: number;
}

export function freshFreshness(zoneId: string, tf: DeathScopeTf): FreshnessRecord {
  if (typeof zoneId !== "string" || zoneId.length === 0) throw violation("FRESHNESS_BAD_ZONE", "zoneId must be non-empty");
  if (tf !== "30m" && tf !== "1H" && tf !== "4H" && tf !== "15m") throw violation("FRESHNESS_BAD_TF", `unknown timeframe: ${String(tf)}`);
  return { machineId: FRESHNESS_MACHINE_ID, state: "FRESH", seq: 0, triads: [], zoneId, tf, tests: 0 };
}

export function readTouchKind(e: WarheadEvent): TouchKind | null {
  const k = (e.payload as Record<string, unknown>)["touchKind"];
  return k === "SWEEP" || k === "WICK_REJECT" || k === "BODY_DEFEND" || k === "CONSOL_DWELL" || k === "PASS_THROUGH" ? k : null;
}

export type FreshnessSubEvent = "BATTLE_TEST" | "BATTLE_DEPLETE" | "BATTLE_RETEST" | "BATTLE_VIOLATE";

export function routeFreshness(r: FreshnessRecord, touch: TouchKind | null): FreshnessSubEvent | null {
  if (touch === null) return null;
  if (touch === "PASS_THROUGH") return "BATTLE_VIOLATE";
  if (touch === "SWEEP" && r.state === "TESTED" && r.tf !== "4H") return "BATTLE_DEPLETE";
  if (r.state === "FRESH") return "BATTLE_TEST";
  return "BATTLE_RETEST";
}

const malformed = "BATTLE_RESOLVED malformed: touchKind must be a known TouchKind";

export const freshnessMachine: MachineDefinition<FreshnessState, FreshnessRecord> = {
  machineId: FRESHNESS_MACHINE_ID,
  states: ["FRESH", "TESTED", "DEPLETED", "VIOLATED"],
  initial: "FRESH",
  // Each (sub-event, from) appears EXACTLY ONCE.
  transitions: [
    { id: "fresh-test", event: "BATTLE_TEST", from: ["FRESH"], to: "TESTED",
      guard: (_r, e) => {
        const b = readTouchKind(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: false, reason: "router disagreement: pass-through violates" } : { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), tests: r.tests + 1 } as FreshnessRecord) },
    { id: "fresh-violate", event: "BATTLE_VIOLATE", from: ["FRESH"], to: "VIOLATED",
      guard: (_r, e) => {
        const b = readTouchKind(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: true } : { allowed: false, reason: "router disagreement: only PASS_THROUGH violates" };
      },
      apply: (r, e) => withTriad({ ...r }, e) },
    { id: "tested-deplete", event: "BATTLE_DEPLETE", from: ["TESTED"], to: "DEPLETED",
      guard: (r, e) => {
        const b = readTouchKind(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (b !== "SWEEP") return { allowed: false, reason: "router disagreement: only SWEEP depletes" };
        // THE 4H-NEVER-DEATH GUARD (double-pinned: the router already reroutes 4H sweeps to RETEST).
        if (r.tf === "4H") return { allowed: false, reason: "4H NEVER dies — DEPLETED refused (the death-scope law)" };
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), tests: r.tests + 1 } as FreshnessRecord) },
    { id: "tested-retest", event: "BATTLE_RETEST", from: ["TESTED"], to: "TESTED",
      guard: (r, e) => {
        const b = readTouchKind(e);
        if (b === null) return { allowed: false, reason: malformed };
        if (b === "PASS_THROUGH") return { allowed: false, reason: "router disagreement: pass-through violates" };
        if (b === "SWEEP" && r.tf !== "4H") return { allowed: false, reason: "router disagreement: non-4H sweep depletes" };
        return { allowed: true };
      },
      apply: (r, e) => ({ ...withTriad({ ...r }, e), tests: r.tests + 1 } as FreshnessRecord) },
    { id: "tested-violate", event: "BATTLE_VIOLATE", from: ["TESTED"], to: "VIOLATED",
      guard: (_r, e) => {
        const b = readTouchKind(e);
        if (b === null) return { allowed: false, reason: malformed };
        return b === "PASS_THROUGH" ? { allowed: true } : { allowed: false, reason: "router disagreement: only PASS_THROUGH violates" };
      },
      apply: (r, e) => withTriad({ ...r }, e) },
  ],
};

export function freshnessBattleEvent(from: FreshnessState, zoneId: string, touchKind: TouchKind): WarheadEvent {
  return ev("BATTLE_RESOLVED", { zoneId, touchKind }, FRESHNESS_MACHINE_ID, from, "?", `freshness:${touchKind}`, HERE, 40);
}

/** Step the freshness machine on a BATTLE_RESOLVED event (route, then step). */
export function stepFreshness(r: FreshnessRecord, e: WarheadEvent): StepResult<FreshnessState, FreshnessRecord> {
  const sub = routeFreshness(r, readTouchKind(e));
  if (sub === null) return { kind: "UNCHANGED", reason: "GUARD_FAILED" };
  return step(freshnessMachine, r, { ...e, type: sub });
}
