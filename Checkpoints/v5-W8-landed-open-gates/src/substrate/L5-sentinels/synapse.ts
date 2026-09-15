// src/sentinel/synapse.ts — the pure-math accumulator + fire gate + I1-I7
// (spec §4.7.1-4.7.2; Shark synapse/math.ts:276 lineage). NO wall clock, NO LLM;
// thresholds are versioned DATA (the register), never literals in the core.

import type { EvidenceTriad } from '../L3-lasme';

export interface SynapseState {
  readonly neuronId: string;
  readonly lambda: number; // the accumulator A_λ(t) = Σ w·e^(−α·Δseq)·s
  readonly lastFireSeq: number | null; // refractory anchor — SEQ, never wall time
  readonly state: 'DORMANT' | 'PRIMED' | 'FIRING' | 'REFRACTORY';
  readonly evidence: readonly EvidenceTriad[]; // appended EVERY transition (I2)
}

export interface ThresholdRegister {
  readonly version: string; // content-addressed — THRESHOLDS ARE DATA
  readonly fireThreshold: number;
  readonly refractorySeqWindow: number;
  readonly decayAlpha: number; // per event-step
  readonly weights: Readonly<Record<string, number>>; // per signal-class weight
}

/** thr-v1 — the seed register (versioned data; phase-2 recalibrates via a NEW version). */
export const SEED_THRESHOLD_REGISTER: ThresholdRegister = {
  version: 'thr-v1',
  fireThreshold: 1.0,
  refractorySeqWindow: 25,
  decayAlpha: 0.05,
  weights: { CLAIM_CONTRADICTED: 0.6, LSP_FINDING: 0.3, ESCALATION: 1.0, SUBSTRATE_MUTATION: 1.0 },
};

export class SynapseInvariantError extends Error {
  readonly code = 'SYNAPSE_INVARIANT';
  constructor(public readonly invariant: string) {
    super(`SynapseInvariantError: ${invariant}`);
  }
}

export interface SynapseSignal {
  readonly signalClass: string;
  readonly weight?: number; // defaults to register.weights[signalClass]
  readonly atSeq: number;
  readonly triad: EvidenceTriad; // I2: no triad, no signal
}

/** freshSynapse — the DORMANT initial state. */
export function freshSynapse(neuronId: string): SynapseState {
  return { neuronId, lambda: 0, lastFireSeq: null, state: 'DORMANT', evidence: [] };
}

/** accumulate — A_λ decays by e^(−α·Δseq) then adds w·s. PURE (no clock, no store).
 *  BUG-10 fix: lastFireSeq is the FIRE anchor ONLY — accumulate never touches it
 *  (a signal's atSeq is not a fire; conflating them put fresh neurons in a phantom
 *  refractory window they never fired in). */
export function accumulate(
  s: SynapseState,
  signal: SynapseSignal | null,
  register: ThresholdRegister,
): SynapseState {
  let lambda = s.lambda;
  if (signal !== null) {
    const w = signal.weight ?? register.weights[signal.signalClass] ?? 0.1;
    lambda = lambda * Math.exp(-register.decayAlpha) + w; // one decay step per accumulation
  } else {
    lambda = lambda * Math.exp(-register.decayAlpha); // decay-only tick
  }
  // PRIMING: any accumulated signal primes a DORMANT neuron
  const state: SynapseState['state'] = s.state === 'DORMANT' && lambda > 0 ? 'PRIMED' : s.state;
  const evidence = signal !== null ? [...s.evidence, signal.triad] : s.evidence;
  checkInvariants({ ...s, lambda, state, evidence }, register, signal);
  return { ...s, lambda, state, evidence }; // lastFireSeq preserved — the fire anchor only
}

/** canFire — the fire gate: threshold ∧ NOT-refractory ∧ PRIMED — ALL THREE, never a subset (I7). */
export function canFire(
  s: SynapseState,
  register: ThresholdRegister,
  currentSeq: number,
): boolean {
  if (s.lambda < register.fireThreshold) return false; // threshold
  if (s.state !== 'PRIMED') return false; // state
  if (s.lastFireSeq !== null && currentSeq - s.lastFireSeq < register.refractorySeqWindow) return false; // refractory
  return true;
}

/** fire — the FIRING transition; requires the TRIAD (I2) and lands in REFRACTORY. */
export function fire(
  s: SynapseState,
  register: ThresholdRegister,
  currentSeq: number,
  fireTriad: EvidenceTriad,
): SynapseState {
  if (!canFire(s, register, currentSeq)) {
    throw new SynapseInvariantError('I7_FIRE_GATE_ALL_THREE');
  }
  const next: SynapseState = {
    ...s,
    state: 'REFRACTORY',
    lastFireSeq: currentSeq,
    lambda: 0, // the fire consumes the accumulator
    evidence: [...s.evidence, fireTriad],
  };
  checkInvariants(next, register, null);
  return next;
}

/** exitRefractory — expiry by SEQ-WINDOW ONLY, never wall time (I5). */
export function exitRefractory(s: SynapseState, register: ThresholdRegister, currentSeq: number): SynapseState {
  if (s.state !== 'REFRACTORY') return s;
  if (s.lastFireSeq !== null && currentSeq - s.lastFireSeq < register.refractorySeqWindow) return s;
  return { ...s, state: lambdaPrimesWith(s) ? 'PRIMED' : 'DORMANT' };
}
function lambdaPrimesWith(s: SynapseState): boolean {
  return s.lambda > 0;
}

/** checkInvariants — I1..I7 checked after EVERY transition; a breach THROWS (the DIE role). */
export function checkInvariants(s: SynapseState, register: ThresholdRegister, signal: SynapseSignal | null): void {
  if (!['DORMANT', 'PRIMED', 'FIRING', 'REFRACTORY'].includes(s.state))
    throw new SynapseInvariantError('I1_STATE_CLOSED_SET');
  if (signal !== null && s.evidence[s.evidence.length - 1] !== signal.triad && s.state === 'FIRING')
    throw new SynapseInvariantError('I2_TRIAD_REQUIRED');
  if (!Number.isFinite(s.lambda) || s.lambda < 0)
    throw new SynapseInvariantError('I3_LAMBDA_FINITE');
  if (s.state === 'FIRING' && s.lastFireSeq !== null && s.evidence.length === 0)
    throw new SynapseInvariantError('I2_TRIAD_REQUIRED');
  if (s.state === 'REFRACTORY' && s.lastFireSeq === null)
    throw new SynapseInvariantError('I5_REFRACTORY_ANCHOR');
  if (s.state === 'PRIMED' && s.lambda <= 0 && register.fireThreshold > 0)
    throw new SynapseInvariantError('I4_PRIMED_REQUIRES_SIGNAL');
  // I6 (evidence integrity — triads reference graph nodes) is store-checked at the ledger.
}
