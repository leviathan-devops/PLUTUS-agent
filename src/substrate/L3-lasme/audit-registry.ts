// src/lasme/audit-registry.ts — the per-dispatch work records (spec §4.3.6)
// DISPATCHED → WORKING → RETURNED → AUDITED → ADVANCED; RETURNED-without-audit
// → ADVANCE_BLOCKED (the audit-before-advance law — the wave law).

import type { AuditStatus, EvidenceTriad, WorkEntry } from './contracts';
import { AdvanceBlockedError } from './contracts';
import { contentId } from '../L1-math';

export class AuditRegistry {
  private readonly entries = new Map<string, WorkEntry>();

  recordWork(input: { taskSignature: string }): WorkEntry {
    const entryId = contentId('work', input.taskSignature).slice(0, 16);
    const entry: WorkEntry = { entryId, taskSignature: input.taskSignature, status: 'DISPATCHED' };
    this.entries.set(entryId, entry);
    return entry;
  }

  markWorking(entryId: string): void {
    this.mutate(entryId, 'DISPATCHED', 'WORKING');
  }

  markReturned(entryId: string, atSeq: number): void {
    this.mutate(entryId, 'WORKING', 'RETURNED', (e) => ({ ...e, returnedAtSeq: atSeq }));
  }

  markAudited(entryId: string, triad: EvidenceTriad): void {
    this.mutate(entryId, 'RETURNED', 'AUDITED', (e) => ({ ...e, auditTriad: triad }));
  }

  advance(entryId: string): WorkEntry {
    const e = this.entries.get(entryId);
    if (e === undefined) throw new Error(`ADVANCE_UNKNOWN_ENTRY: ${entryId}`);
    if (e.status !== 'AUDITED') throw new AdvanceBlockedError(entryId);
    const advanced: WorkEntry = { ...e, status: 'ADVANCED' };
    this.entries.set(entryId, advanced);
    return advanced;
  }

  get(entryId: string): WorkEntry | undefined {
    return this.entries.get(entryId);
  }

  all(): readonly WorkEntry[] {
    return [...this.entries.values()];
  }

  private mutate(entryId: string, from: AuditStatus, to: AuditStatus, f?: (e: WorkEntry) => Partial<WorkEntry>): void {
    const e = this.entries.get(entryId);
    if (e === undefined) throw new Error(`AUDIT_UNKNOWN_ENTRY: ${entryId}`);
    if (e.status !== from) throw new Error(`AUDIT_ILLEGAL_TRANSITION: ${entryId} ${e.status} → ${to}`);
    // BUG-3 fix: the status ALWAYS advances; f contributes extra fields only
    this.entries.set(entryId, { ...e, ...(f ? f(e) : {}), status: to });
  }
}
