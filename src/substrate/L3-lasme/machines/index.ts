// src/machines/index.ts — the seed machine barrel (every machine ships WIRED)
export type {
  TestingDegree, EvidenceEntry, EvidenceMachineRecord,
} from './evidence-machine';
export {
  evidenceMachine, freshEvidenceRecord, queryDegree, satisfiesTier,
  EVIDENCE_RING_CAP, EVIDENCE_MACHINE_ID,
} from './evidence-machine';

export type { ClaimGateState, ClaimDemand } from './claim-gate';
export {
  ClaimGate, spliceDemand, claimEventFromChat,
  CLAIM_GATE_TTL_SEQ, CLAIM_GATE_ESCALATION_AT,
} from './claim-gate';

export type { CtFamilyId, CtExecVerdict } from './config-lock';
export {
  classifyCtExec, buildCtConfigLockMessage, CT_WARHEAD_REMEDIES,
  CT_DECODE_PRINTABLE_RATIO,
} from './config-lock';

export type { WorkflowStage, EvidenceKind, WorkflowContext } from './workflow-machine';
export { workflowMachine, freshWorkflow, WORKFLOW_MACHINE_ID } from './workflow-machine';

export type { EvidenceSnapshot, DischargeOutcome } from './mpse-discharge';
export {
  extractBindings, dischargeAtRuntime, toSelfVerifierFinding,
} from './mpse-discharge';

export type { WatchdogClassification, WalEntry, Clock } from './sentinel-watchdog';
export {
  SentinelWatchdog, systemClock,
  STUCK_WINDOW_MS, LIVENESS_POLL_MS, RESTART_BUDGET, RESTART_WINDOW_MS,
} from './sentinel-watchdog';

export {
  toXStateGuards, compileToXState, runSequenceViaAdapter, runSequenceViaCore,
} from './adapters/xstate';

export { ok, err, attempt, bracket } from './algebra';
export type { Result, ParagonError } from './algebra';
