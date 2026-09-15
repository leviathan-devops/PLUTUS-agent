// src/machines/workflow-machine.ts — derailment-by-construction (spec §6.3.4)
// sstf-machine.ts:125 lineage: REPORT is reachable ONLY from TEST-RUNTIME on
// LEGIT evidence — the skip transition does not EXIST in the table (grep-verifiable).

import type { MachineDefinition, MachineRecordBase } from '..';
import { withTriad } from '..';

export type WorkflowStage = 'CODE' | 'BUILD' | 'TEST-UNIT' | 'TEST-RUNTIME' | 'REPORT';
export type EvidenceKind = 'NONE' | 'SMOKE' | 'LEGIT';

export interface WorkflowContext extends MachineRecordBase {
  readonly evidenceVerdict: EvidenceKind;
}

export const WORKFLOW_MACHINE_ID = 'workflow';

export function freshWorkflow(): WorkflowContext {
  return { machineId: WORKFLOW_MACHINE_ID, state: 'CODE', seq: 0, triads: [], evidenceVerdict: 'NONE' };
}

const advance: WorkflowStage[] = ['CODE', 'BUILD', 'TEST-UNIT', 'TEST-RUNTIME'];
function nextStage(s: WorkflowStage): WorkflowStage {
  const i = advance.indexOf(s);
  return i >= 0 && i + 1 < advance.length ? advance[i + 1]! : s;
}

export const workflowMachine: MachineDefinition<WorkflowStage, WorkflowContext> = {
  machineId: WORKFLOW_MACHINE_ID,
  states: ['CODE', 'BUILD', 'TEST-UNIT', 'TEST-RUNTIME', 'REPORT'],
  initial: 'CODE',
  transitions: [
    // the linear advance: CODE→BUILD→TEST-UNIT→TEST-RUNTIME
    ...(advance.slice(0, -1).map((stage): import('..').TransitionSpec<WorkflowStage, WorkflowContext> => ({
      id: `advance-${stage}`,
      event: 'STEP_DONE',
      from: [stage] as const,
      to: nextStage(stage),
      guard: () => ({ allowed: true }),
      apply: (r, e) => withTriad({ ...r }, e),
    }))),
    // THE GUARDED REPORT: from TEST-RUNTIME on LEGIT evidence ONLY — the transition
    // does not exist from any other state (the machine-impossible skip).
    {
      id: 'report',
      event: 'REQUEST_REPORT',
      from: ['TEST-RUNTIME'],
      to: 'REPORT',
      guard: (r) => ({
        allowed: r.evidenceVerdict === 'LEGIT',
        reason: `evidence=${r.evidenceVerdict} — REPORT requires LEGIT from TEST-RUNTIME`,
      }),
      failState: 'TEST-RUNTIME',
      apply: (r, e) => withTriad({ ...r }, e),
    },
  ],
  invariants: [
    (r) => ({
      // I-W1: the evidence verdict is from the closed set
      ok: ['NONE', 'SMOKE', 'LEGIT'].includes(r.evidenceVerdict),
      invariantId: 'I_W1_EVIDENCE_CLOSED_SET',
    }),
  ],
};
