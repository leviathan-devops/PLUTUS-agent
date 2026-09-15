// src/sentinel/index.ts — the sentinel barrel
export type { SynapseState, ThresholdRegister, SynapseSignal } from './synapse';
export {
  freshSynapse, accumulate, canFire, fire, exitRefractory, checkInvariants,
  SynapseInvariantError, SEED_THRESHOLD_REGISTER,
} from './synapse';
export type {
  ShadowChunk, InjectDecision, OverrideTarget, OverrideSnapshot, BarrageVote,
  BarrageOutcome, BootResult, SupervisorWalEntry, SupervisorState,
} from './fleet';
export {
  CHUNK_CHAR_CAP, buildChunk, injectAdvisory, applyOverrides, effectiveMultiplier,
  OVERRIDE_PRECEDENCE, InvalidOverrideMultiplierError, barrage, approachHash,
  canIntervene, BOOT_LINES, bootSentinel, recordRestart,
} from './fleet';
