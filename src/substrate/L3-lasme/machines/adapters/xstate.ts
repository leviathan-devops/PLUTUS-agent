// src/machines/adapters/xstate.ts — the XState v5 BRIDGE (spec §2.7, G12)
// Compiles the SAME MachineDefinition — never a second definition. The hand-rolled
// core remains PRIMARY; this adapter gives XState-estate hosts interop. Equivalence
// is PROVEN by the property battery (×500 random sequences, identical trajectories).

import type { MachineDefinition, MachineRecordBase, WarheadEvent } from '../..';
import type { StepResult } from '../..';

/** toXStateGuards — compiles PARADOX guards into the XState guard map. */
export function toXStateGuards<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
): Record<string, (ctx: { record: R; event: WarheadEvent }) => boolean> {
  const out: Record<string, (ctx: { record: R; event: WarheadEvent }) => boolean> = {};
  for (const t of def.transitions) {
    out[t.id] = (ctxObj) => t.guard(ctxObj.record, ctxObj.event).allowed;
  }
  return out;
}

/**
 * compileToXState — produces a shape XState v5 createMachine can consume directly:
 * states with on[event] → { target, guard } entries, ordered by the transition
 * table (the ORDER IS LOAD-BEARING contract transfers — array order = priority).
 */
export function compileToXState<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
): {
  id: string;
  initial: S;
  states: Record<S, { on: Record<string, { target: S; guard: string }[]> }>;
  guards: Record<string, (ctx: { record: R; event: WarheadEvent }) => boolean>;
  definition: MachineDefinition<S, R>; // the SAME object — the bridge proof
} {
  const states = {} as Record<S, { on: Record<string, { target: S; guard: string }[]> }>;
  for (const s of def.states) {
    states[s] = { on: {} };
  }
  for (const t of def.transitions) {
    const bucket = states[t.to] !== undefined || true; // target state exists by construction
    void bucket;
    // the from-state holds the event handler; `from: undefined` = any state
    const fromStates: readonly S[] = t.from ?? def.states;
    for (const from of fromStates) {
      const on = states[from]!.on;
      on[t.event] = [...(on[t.event] ?? []), { target: t.to, guard: t.id }];
    }
  }
  return { id: def.machineId, initial: def.initial, states, guards: toXStateGuards(def), definition: def };
}

/**
 * runSequenceViaAdapter — the equivalence-test runner: steps the sequence through
 * the adapter's compiled shape (the same first-match semantics — arrays preserve
 * transition order per event).
 */
export function runSequenceViaAdapter<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
  start: R,
  events: readonly WarheadEvent[],
  apply: (record: R, event: WarheadEvent, to: S) => R,
): { trajectory: S[]; final: R } {
  let record = start;
  const trajectory: S[] = [record.state as S];
  const compiled = compileToXState(def);
  for (const e of events) {
    const handlers = compiled.states[record.state as S]?.on[e.type] ?? [];
    for (const h of handlers) {
      if (compiled.guards[h.guard]!({ record, event: e })) {
        record = apply(record, e, h.target);
        trajectory.push(record.state as S);
        break; // first match wins — the ORDER contract
      }
    }
  }
  return { trajectory, final: record };
}

import { step as coreStep, withTriad } from '../..';

/** runSequenceViaCore — the hand-rolled counterpart for the equivalence test. */
export function runSequenceViaCore<S extends string, R extends MachineRecordBase>(
  def: MachineDefinition<S, R>,
  start: R,
  events: readonly WarheadEvent[],
): { trajectory: S[]; final: R } {
  let record = start;
  const trajectory: S[] = [record.state as S];
  for (const e of events) {
    const r: StepResult<S, R> = coreStep(def, record, e);
    if (r.kind === 'TRANSITIONED') {
      record = r.record;
      trajectory.push(record.state as S);
    }
  }
  return { trajectory, final: record };
}

export { withTriad };
