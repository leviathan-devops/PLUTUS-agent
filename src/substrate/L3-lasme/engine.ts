// src/lasme/engine.ts — the EngineSurface + DI seam (spec §4.3.7)
// The seam is the ONLY sanctioned injection point; its default is NO-OP
// (cache-law compliant — static-only until the host binding wires the real one).

import type {
  ArmDecision, AuditStatus, EvidenceTriad, MachineDefinition, MachineRecordBase,
  PatternFlag, ThrowArm, WarheadEvent, WorkEntry,
} from './contracts';
import { step, eventIdOf, loadOrFresh } from './state-machine';
import { PredicateLexicon } from './predicate-lexicon';
import { StrikeCounter, enforce, defaultEscapeHatch, EscalationError } from './throw-arms';
import { AuditRegistry } from './audit-registry';
import type { BrandedVerdict } from '../L1-math';
import type { BrandedResult } from '../L1-math';

export type EngineTransformSeam = (staticBlock: string) => string;

export interface IngestResult {
  readonly kind: 'TRANSITIONED' | 'UNCHANGED' | 'INVARIANT_BREACH';
  readonly eventId: string;
  readonly machineId: string;
}

export interface VerdictQuery {
  readonly machineId: string;
  readonly subject?: string;
}

export class LasmeEngine {
  private readonly machines = new Map<string, { def: MachineDefinition<string, MachineRecordBase>; record: MachineRecordBase }>();
  private readonly lexicon: PredicateLexicon;
  private readonly arms = new Map<string, ThrowArm>();
  private readonly strikes = new StrikeCounter();
  private readonly audit = new AuditRegistry();
  private seam: EngineTransformSeam = (x) => x;
  private seqCounters = new Map<string, number>();
  /** the discharge hook — the machines layer injects the real verdict router */
  verdictRouter: ((q: VerdictQuery) => BrandedResult) | null = null;

  constructor(lexicon: PredicateLexicon) {
    this.lexicon = lexicon;
  }

  // ── machine registry ────────────────────────────────────────────────
  registerMachine<S extends string, R extends MachineRecordBase>(def: MachineDefinition<S, R>, fresh: () => R): void {
    this.machines.set(def.machineId, { def: def as unknown as MachineDefinition<string, MachineRecordBase>, record: fresh() as MachineRecordBase });
  }

  getState(machineId: string): MachineRecordBase | { kind: 'EMPTY'; reason: 'NO_MACHINE' } {
    const m = this.machines.get(machineId);
    return m?.record ?? { kind: 'EMPTY', reason: 'NO_MACHINE' };
  }

  loadMachine<S extends string, R extends MachineRecordBase>(
    def: MachineDefinition<S, R>, persisted: unknown, fresh: () => R,
  ): { recovered: boolean } {
    const { record, recovered } = loadOrFresh(def, persisted, fresh);
    this.machines.set(def.machineId, { def: def as unknown as MachineDefinition<string, MachineRecordBase>, record: record as MachineRecordBase });
    return { recovered };
  }

  // ── the event surface ───────────────────────────────────────────────
  nextSeq(sessionId: string): number {
    const n = (this.seqCounters.get(sessionId) ?? 0) + 1;
    this.seqCounters.set(sessionId, n);
    return n;
  }

  ingestEvent(e: WarheadEvent): IngestResult {
    const eventId = eventIdOf(e);
    // The wrapper: route to EVERY machine whose transitions match the event type.
    // (Machines without a matching transition report UNCHANGED — total, no throw.)
    let last: IngestResult = { kind: 'UNCHANGED', eventId, machineId: '(none)' };
    for (const [machineId, m] of this.machines) {
      const r = step(m.def, m.record, e);
      if (r.kind === 'INVARIANT_BREACH') {
        // DIE — loud, named; the invariant breach is returned (and would be thrown
        // by the host binding's verb). The record is NOT advanced.
        return { kind: 'INVARIANT_BREACH', eventId, machineId };
      }
      if (r.kind === 'TRANSITIONED') {
        m.record = r.record;
        last = { kind: 'TRANSITIONED', eventId, machineId };
      }
    }
    return last;
  }

  // ── scan / verdict / enforce ────────────────────────────────────────
  scan(text: string, anchor: { file: string; line: number } | null = null): readonly PatternFlag[] {
    return this.lexicon.scan(text, anchor);
  }

  queryVerdict(q: VerdictQuery): BrandedResult {
    if (this.verdictRouter === null) {
      throw new Error('ENGINE_VERDICT_ROUTER_UNWIRED: the machines layer must inject the router before verdict queries (the wired-or-cut law)');
    }
    return this.verdictRouter(q);
  }

  registerArm(arm: ThrowArm): void {
    this.arms.set(arm.id, arm);
  }

  armedThrowArms(): readonly ThrowArm[] {
    return [...this.arms.values()];
  }

  enforceArm(armId: string, e: WarheadEvent): ArmDecision {
    const arm = this.arms.get(armId);
    if (arm === undefined) throw new Error(`ARM_UNKNOWN: ${armId}`);
    return enforce(arm, e, this.strikes, defaultEscapeHatch);
  }

  clearStrikes(sessionId: string): void {
    this.strikes.clear(sessionId);
  }

  // ── the audit surface ───────────────────────────────────────────────
  recordWork(input: { taskSignature: string }): WorkEntry { return this.audit.recordWork(input); }
  markWorking(id: string): void { this.audit.markWorking(id); }
  markReturned(id: string, atSeq: number): void { this.audit.markReturned(id, atSeq); }
  markAudited(id: string, triad: EvidenceTriad): void { this.audit.markAudited(id, triad); }
  advance(id: string): WorkEntry { return this.audit.advance(id); }

  // ── the DI seam ─────────────────────────────────────────────────────
  setEngineTransformSeam(fn: EngineTransformSeam): void { this.seam = fn; }
  getEngineTransformSeam(): EngineTransformSeam { return this.seam; }

  // ── status (the grep-verifiable surface for paragon-status) ─────────
  statusReport(): {
    machines: { id: string; state: string; seq: number }[];
    arms: string[];
    members: number;
    seamWired: boolean;
    verdictRouterWired: boolean;
  } {
    return {
      machines: [...this.machines.values()].map((m) => ({ id: m.def.machineId, state: m.record.state, seq: m.record.seq })),
      arms: [...this.arms.keys()],
      members: this.lexicon.all().length,
      seamWired: this.seam !== identitySeam,
      verdictRouterWired: this.verdictRouter !== null,
    };
  }
}

const identitySeam: EngineTransformSeam = (x) => x;
export { EscalationError };
