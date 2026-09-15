// src/lasme/index.ts — the LASME barrel
export type {
  WarheadEvent, WarheadRecord, WarheadVerdict, EvidenceTriad, PatternRef, StateRef,
  EvidenceRef, Severity, PatternFamilyMember, Order2Matcher, Order2Kind, ExampleHit,
  PatternFlag, MachineRecordBase, MachineDefinition, TransitionSpec, GuardResult,
  InvariantResult, StepResult, ThrowArm, ArmDecision, AuditStatus, WorkEntry,
} from './contracts';
export { AdvanceBlockedError } from './contracts';
export { step, withTriad, loadOrFresh, eventIdOf, reachable } from './state-machine';
export {
  PredicateLexicon, BareRegexRejectedError, DuplicateMemberError, MissingExampleHitsError,
  boundedSlice, splitSentences, memberIdOf,
} from './predicate-lexicon';
export { StrikeCounter, enforce, defaultEscapeHatch, EscalationError } from './throw-arms';
export { AuditRegistry } from './audit-registry';
export { LasmeEngine } from './engine';
export type { EngineTransformSeam, IngestResult, VerdictQuery } from './engine';

// L3 composition: the seed machines wired on the LASME core (ex-src/machines/).
export * from './machines';
