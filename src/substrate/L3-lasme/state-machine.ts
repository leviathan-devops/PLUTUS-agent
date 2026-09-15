// src/lasme/state-machine.ts — the pure machine core (spec §4.3.4)
// THE PURE CORE: (record, event) → record. Zero I/O, zero clock, zero host.
// Side effects (persistence, logging, injection) live in the INGEST WRAPPER only.

import type {
  EvidenceTriad, GuardResult, MachineDefinition, MachineRecordBase, StepResult,
  WarheadEvent,
} from './contracts';
import { contentId, canonicalJson } from '../L1-math';

/**
 * step — the total transition function. ORDER IS LOAD-BEARING: the FIRST matching
 * transition (event + from-state) wins; reorder changes behavior (tested).
 * I2: a fired transition whose applied record did not GROW the triads is an
 * INVARIANT_BREACH (no observation, no fire) — apply() must append the event's triad.
 */
export function step<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
  record: R,
  event: WarheadEvent,
): StepResult<S, R> {
  for (const t of def.transitions) {
    if (t.event !== event.type) continue;
    if (t.from !== undefined && !t.from.includes(record.state as S)) continue;
    const g: GuardResult = t.guard(record, event);
    if (!g.allowed) {
      return { kind: 'UNCHANGED', reason: 'GUARD_FAILED', failState: t.failState };
    }
    const applied = t.apply({ ...record, state: t.to } as R, event);
    if (applied.triads.length <= record.triads.length) {
      return { kind: 'INVARIANT_BREACH', invariantId: 'I2_TRIAD_REQUIRED', record };
    }
    if (applied.state !== t.to) {
      return { kind: 'INVARIANT_BREACH', invariantId: 'I0_TO_STATE_MISMATCH', record };
    }
    if (def.invariants !== undefined) {
      for (const inv of def.invariants) {
        const r = inv(applied);
        if (!r.ok) return { kind: 'INVARIANT_BREACH', invariantId: r.invariantId, record: applied };
      }
    }
    const triad = applied.triads[applied.triads.length - 1]!;
    return { kind: 'TRANSITIONED', from: record.state as S, to: t.to, record: applied, triad };
  }
  return { kind: 'UNCHANGED', reason: 'NO_MATCHING_TRANSITION' };
}

/** withTriad — the apply() helper that appends the event's triad (the I2-satisfying append). */
export function withTriad<R extends MachineRecordBase>(r: R, e: WarheadEvent): R {
  const triad = e.payload['triad'] as EvidenceTriad | undefined;
  if (triad === undefined) return r; // step() will catch this as I2 breach
  return { ...r, seq: r.seq + 1, triads: [...r.triads, triad] };
}

/**
 * loadOrFresh — the fail-closed loader: a corrupt/unreadable persisted record
 * yields a FRESH INITIAL record, NEVER a half-parsed record carrying stale state.
 */
export function loadOrFresh<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
  persisted: unknown,
  fresh: () => R,
): { record: R; recovered: boolean } {
  if (isValidRecord(def, persisted)) {
    return { record: persisted as R, recovered: false };
  }
  return { record: fresh(), recovered: true };
}

function isValidRecord<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
  p: unknown,
): boolean {
  return (
    p !== null &&
    typeof p === 'object' &&
    (p as Partial<R>).machineId === def.machineId &&
    typeof (p as Partial<R>).state === 'string' &&
    def.states.includes((p as unknown as { state: S }).state) &&
    typeof (p as Partial<R>).seq === 'number' &&
    Array.isArray((p as Partial<R>).triads)
  );
}

/** Content-addressed event id — for the append-only ledgers. */
export function eventIdOf(e: WarheadEvent): string {
  return contentId(e.type, e.sessionId, String(e.agentOrigin), String(e.receivedAtSeq), canonicalJson(e.payload));
}

/** Graph-level reachability (bounded) — the machine-impossible-skip proof helper. */
export function reachable<S extends string>(
  transitions: readonly { from?: readonly S[]; to: S; event: string }[],
  from: S,
  to: S,
  maxHops = 64,
): boolean {
  if (from === to) return true;
  let frontier: S[] = [from];
  const seen = new Set<S>([from]);
  for (let hop = 0; hop < maxHops && frontier.length > 0; hop++) {
    const next: S[] = [];
    for (const s of frontier) {
      for (const t of transitions) {
        if (t.from !== undefined && !t.from.includes(s)) continue;
        if (t.to === to) return true;
        if (!seen.has(t.to)) { seen.add(t.to); next.push(t.to); }
      }
    }
    frontier = next;
  }
  return false;
}
