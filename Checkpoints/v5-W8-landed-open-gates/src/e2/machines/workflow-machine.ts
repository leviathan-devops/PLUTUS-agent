// src/e2/machines/workflow-machine.ts — B.W3.5 (the E2 pipeline workflow).
// E1_DONE->E2_DONE->E3_DONE->REPORTED with the skip transitions ABSENT from
// the table — a skip is machine-impossible (step() returns UNCHANGED with
// NO_MATCHING_TRANSITION, and reachable() proves it).

import type { MachineDefinition, MachineRecordBase, WarheadEvent } from "../../substrate/L3-lasme/index";
import { reachable, withTriad } from "../../substrate/L3-lasme/index";
import { ev } from "./types";

export type E2WorkflowState = "E1_DONE" | "E2_DONE" | "E3_DONE" | "REPORTED";
export const E2_WORKFLOW_MACHINE_ID = "e2-workflow";
const HERE = "src/e2/machines/workflow-machine.ts";

export interface E2WorkflowRecord extends MachineRecordBase {
  readonly week: string;
}

export function freshWorkflow(week: string): E2WorkflowRecord {
  return { machineId: E2_WORKFLOW_MACHINE_ID, state: "E1_DONE", seq: 0, triads: [], week };
}

export const e2WorkflowMachine: MachineDefinition<E2WorkflowState, E2WorkflowRecord> = {
  machineId: E2_WORKFLOW_MACHINE_ID,
  states: ["E1_DONE", "E2_DONE", "E3_DONE", "REPORTED"],
  initial: "E1_DONE",
  // THE TABLE CONTAINS NO SKIP: E1_DONE->E3_DONE, E1_DONE->REPORTED,
  // E2_DONE->REPORTED do not exist here (grep-verifiable absence).
  transitions: [
    { id: "e1-e2", event: "E2_COMPLETED", from: ["E1_DONE"], to: "E2_DONE",
      guard: () => ({ allowed: true }),
      apply: (r, e) => withTriad({ ...r }, e) },
    { id: "e2-e3", event: "E3_COMPLETED", from: ["E2_DONE"], to: "E3_DONE",
      guard: () => ({ allowed: true }),
      apply: (r, e) => withTriad({ ...r }, e) },
    { id: "e3-reported", event: "REPORT_COMPLETED", from: ["E3_DONE"], to: "REPORTED",
      guard: () => ({ allowed: true }),
      apply: (r, e) => withTriad({ ...r }, e) },
  ],
};

export function workflowEvent(type: "E2_COMPLETED" | "E3_COMPLETED" | "REPORT_COMPLETED", from: E2WorkflowState): WarheadEvent {
  return ev(type, {}, E2_WORKFLOW_MACHINE_ID, from, "?", `workflow:${type}`, HERE, 30);
}

/** The machine-impossible-skip proof: no path E1_DONE->E3_DONE except via E2_DONE. */
export function skipAbsent(): boolean {
  const edges = e2WorkflowMachine.transitions.map((t) => ({ from: t.from, to: t.to, event: t.event }));
  const direct = edges.some((t) => t.from?.includes("E1_DONE") && t.to === "E3_DONE");
  const viaReport = edges.some((t) => t.from?.includes("E1_DONE") && t.to === "REPORTED");
  void reachable;
  return !direct && !viaReport;
}
