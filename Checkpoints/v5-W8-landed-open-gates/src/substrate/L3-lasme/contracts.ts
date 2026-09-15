// src/lasme/contracts.ts — the LASME core types (spec §4.3)
// The EVIDENCE TRIAD is the record; matchers FLAG and never decide; machines are
// pure cores with side effects in the ingest wrapper only.

import type { BrandedVerdict } from '../L1-math';
import type { MathExpr } from '../L1-math';

// ── the warhead surface (spec §4.3.1; v2.0 boilerplate lineage README:60-94) ──

export interface WarheadEvent {
  readonly type: string; // e.g. 'CLAIM_CANDIDATE' | 'TOOL_RESULT'
  readonly sessionId: string;
  readonly agentOrigin: boolean; // AGENT-ORIGIN only — user words NEVER gate
  readonly payload: Readonly<Record<string, unknown>>;
  readonly receivedAtSeq: number; // monotonic per-session sequence, NOT wall time
}

// ── THE EVIDENCE TRIAD (spec §4.3.2; vocabulary pin R-V61-7) ──────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface EvidenceTriad {
  readonly pattern: PatternRef; // WHICH lexicon member flagged
  readonly state: StateRef; // WHICH machine state decided
  readonly evidence: EvidenceRef; // node id + file:line of the ground truth
}
export interface PatternRef {
  readonly memberId: string;
  readonly familySeverity: Severity;
}
export interface StateRef {
  readonly machineId: string;
  readonly from: string;
  readonly to: string;
}
export interface EvidenceRef {
  readonly graphNodeId?: string;
  readonly file: string;
  readonly line: number;
}

export interface WarheadRecord {
  readonly eventId: string; // content-addressed
  readonly triad: EvidenceTriad; // MANDATORY — no triad, no record (DM-L1)
  readonly verdict: WarheadVerdict;
}
export type WarheadVerdict = 'FIRED' | 'SUPPRESSED' | 'DROPPED_INCONCLUSIVE' | 'ESCALATED';

// ── the PatternFamily member (spec §4.3.3) ────────────────────────────

export type Order2Kind = 'token-class' | 'ast-node' | 'sentence-frame';

/** Order-2 = structural awareness. A bare RegExp is REJECTED by the registry. */
export interface Order2Matcher {
  readonly kind: Order2Kind;
  readonly positive: readonly string[]; // structural patterns
  readonly negative: readonly string[]; // structural exclusions (USE frames)
}

export interface ExampleHit {
  readonly text: string;
  readonly shouldFlag: boolean;
  readonly because: string; // the WHY, quoted from the corpus (D13)
}

export interface PatternFamilyMember {
  readonly id: string; // stable, content-derived
  readonly kind: 'detector'; // matchers FLAG; they NEVER decide (Law 4)
  readonly matcher: Order2Matcher; // structural, Order-2+ — never bare regex
  readonly triggerCondition: MathExpr | null; // the machine evaluates; null = always flag
  readonly severity: Severity;
  readonly messageTemplate: string; // ${anchor} interpolated from evidence
  readonly remediationHook: string; // the named remedy (the gate NAMES the fix)
  readonly exampleHits: readonly ExampleHit[]; // ≥1 positive + ≥1 negative (D17 seed)
}

/** A scanner flag — carries NO verdict, NO decision fields (the type-level Law 4). */
export interface PatternFlag {
  readonly memberId: string;
  readonly excerpt: string; // the bounded matched span (≤200 chars)
  readonly anchor: { file: string; line: number } | null;
}

// ── the machine core (spec §4.3.4) ────────────────────────────────────

export interface MachineRecordBase {
  readonly machineId: string;
  readonly state: string;
  readonly seq: number;
  readonly triads: readonly EvidenceTriad[]; // appended on every EMITTED transition
}

export interface TransitionSpec<S extends string, R extends MachineRecordBase> {
  readonly id: string;
  readonly event: string;
  readonly from?: readonly S[]; // undefined = any (ORDER LOAD-BEARING: first match wins)
  readonly to: S; // the destination state — EXPLICIT, never inferred
  readonly guard: (r: R, e: WarheadEvent) => GuardResult;
  readonly apply: (r: R, e: WarheadEvent) => R; // PURE — returns new record (state set to `to`)
  readonly failState?: S; // guard fail ⇒ HERE, never the default pass
}

export interface GuardResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface MachineDefinition<S extends string, R extends MachineRecordBase> {
  readonly machineId: string;
  readonly states: readonly S[];
  readonly initial: S;
  readonly transitions: readonly TransitionSpec<S, R>[]; // ORDER IS LOAD-BEARING
  readonly invariants?: readonly ((r: R) => InvariantResult)[]; // the I1-I7 pattern
}

export interface InvariantResult {
  readonly ok: boolean;
  readonly invariantId: string;
  readonly detail?: string;
}

export type StepResult<S extends string, R extends MachineRecordBase> =
  | { kind: 'TRANSITIONED'; from: S; to: S; record: R; triad: EvidenceTriad }
  | { kind: 'UNCHANGED'; reason: 'NO_MATCHING_TRANSITION' | 'GUARD_FAILED'; failState?: S }
  | { kind: 'INVARIANT_BREACH'; invariantId: string; record: R }; // DIE — loud, named

// ── throw-arms (spec §4.3.5) ──────────────────────────────────────────

export interface ThrowArm {
  readonly id: string;
  readonly classifier: PatternFamilyMember['id']; // the member that FLAGS
  readonly gate: (e: WarheadEvent, record: MachineRecordBase) => ArmDecision;
  readonly escapeHatchTools: readonly string[]; // NEVER blocked
  readonly escalation: { readonly at: number; readonly remedy: string }; // 3 strikes
}

export type ArmDecision =
  | { kind: 'BLOCK'; code: string; remedy: string } // the ONLY enforcement verb (Law 5)
  | { kind: 'DEMAND'; code: string; remedy: string } // Phase-B splice ride-along
  | { kind: 'ALLOW' };

// ── the audit registry (spec §4.3.6) ─────────────────────────────────

export type AuditStatus =
  | 'DISPATCHED' | 'WORKING' | 'RETURNED' | 'AUDITED' | 'ADVANCED' | 'ADVANCE_BLOCKED';

export interface WorkEntry {
  readonly entryId: string; // content-addressed
  readonly taskSignature: string; // sha256 of the dispatched prompt (the promptFile channel)
  readonly status: AuditStatus;
  readonly returnedAtSeq?: number;
  readonly auditTriad?: EvidenceTriad; // ADVANCED requires it
}

export class AdvanceBlockedError extends Error {
  readonly code = 'ADVANCE_BLOCKED';
  constructor(public readonly entryId: string) {
    super(`ADVANCE_BLOCKED: ${entryId} RETURNED without audit — the audit-before-advance law`);
  }
}
