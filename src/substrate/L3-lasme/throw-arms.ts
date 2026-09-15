// src/lasme/throw-arms.ts — the enforcement teeth (spec §4.3.5)
// Tool-based classification ONLY (never user-chat words); THROW-only verbs;
// escape hatches NEVER blocked; 3-strike escalation per arm.

import type { ArmDecision, ThrowArm, WarheadEvent } from './contracts';

export class EscalationError extends Error {
  readonly code = 'SSTF_ESCALATE';
  constructor(public readonly armId: string, public readonly strikes: number) {
    super(`[SSTF ESCALATE] ${armId} fired ${strikes}× un-remedied — run the container test to clear, or remediate the finding`);
  }
}

/** The strike counter — per session per arm; the escalation ladder (spec 6.3.2). */
export class StrikeCounter {
  private readonly counts = new Map<string, number>();

  bump(sessionId: string, armId: string): number {
    const key = `${sessionId}::${armId}`;
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }

  strikes(sessionId: string, armId: string): number {
    return this.counts.get(`${sessionId}::${armId}`) ?? 0;
  }

  clear(sessionId: string): void {
    for (const k of [...this.counts.keys()]) {
      if (k.startsWith(`${sessionId}::`)) this.counts.delete(k);
    }
  }
}

/**
 * enforce — runs the arm's gate and applies the escape-hatch law: reads, evidence
 * tools, and the container-test family are NEVER blocked (the deadlock prevention).
 * Returns the decision; the CALLER throws (the host binding's verb).
 */
export function enforce(
  arm: ThrowArm,
  e: WarheadEvent,
  strikes: StrikeCounter,
  isEscapeHatch: (tool: string, args: unknown, hatchTools: readonly string[]) => boolean,
): ArmDecision {
  const tool = String(e.payload['tool'] ?? '');
  const args = e.payload['args'];
  const decision = arm.gate(e, emptyRecord());
  if (decision.kind === 'ALLOW') return decision;
  // ESCAPE HATCH checked BEFORE the block lands, never after
  if (isEscapeHatch(tool, args, arm.escapeHatchTools)) return { kind: 'ALLOW' };
  const n = strikes.bump(e.sessionId, arm.id);
  if (n >= arm.escalation.at) {
    throw new EscalationError(arm.id, n);
  }
  return decision;
}

/** isEscapeHatch — the default policy: exact tool match against the hatch list. */
export function defaultEscapeHatch(tool: string, _args: unknown, hatchTools: readonly string[]): boolean {
  return hatchTools.includes(tool);
}

import type { MachineRecordBase } from './contracts';
function emptyRecord(): MachineRecordBase {
  return { machineId: '(arm-gate)', state: '(gate)', seq: 0, triads: [] };
}
