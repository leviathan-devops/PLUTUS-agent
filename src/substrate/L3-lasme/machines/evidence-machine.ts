// src/machines/evidence-machine.ts — the testing-degree ladder (spec §4.8)
// NO_EVIDENCE → UNIT_EVIDENCED → CONTAINER_EVIDENCED; the query is FAIL-CLOSED
// (UNEVIDENCED); smoke evidence NEVER lifts a container-grade claim.

import type { EvidenceTriad, MachineDefinition, MachineRecordBase } from '..';

export type TestingDegree =
  | 'NO_EVIDENCE' | 'UNIT_EVIDENCED' | 'CONTAINER_EVIDENCED' // the ladder
  | 'UNEVIDENCED'; // the FAIL-CLOSED query result

export interface EvidenceEntry {
  readonly entryId: string;
  readonly degree: 'UNIT_EVIDENCED' | 'CONTAINER_EVIDENCED';
  readonly smokeOnly: boolean;
  readonly triad: EvidenceTriad;
  readonly atSeq: number;
}

export interface EvidenceMachineRecord extends MachineRecordBase {
  readonly scope: string;
  readonly entries: readonly EvidenceEntry[]; // ring cap 50
}

/** THE RING CAP — 50 entries: bounds memory on long sessions; degree from presence. */
export const EVIDENCE_RING_CAP = 50;
export const EVIDENCE_MACHINE_ID = 'evidence';

export function freshEvidenceRecord(scope: string): EvidenceMachineRecord {
  return { machineId: EVIDENCE_MACHINE_ID, state: 'NO_EVIDENCE', seq: 0, triads: [], scope, entries: [] };
}

export const evidenceMachine: MachineDefinition<
  'NO_EVIDENCE' | 'UNIT_EVIDENCED' | 'CONTAINER_EVIDENCED',
  EvidenceMachineRecord
> = {
  machineId: EVIDENCE_MACHINE_ID,
  states: ['NO_EVIDENCE', 'UNIT_EVIDENCED', 'CONTAINER_EVIDENCED'],
  initial: 'NO_EVIDENCE',
  transitions: [
    {
      id: 'unit', event: 'UNIT_PASSED', from: ['NO_EVIDENCE', 'UNIT_EVIDENCED'], to: 'UNIT_EVIDENCED',
      guard: (r) => ({ allowed: r.entries.length < EVIDENCE_RING_CAP * 2, reason: 'ring overflow guard' }),
      apply: (r, e) => appendEntry(r, e, 'UNIT_EVIDENCED'),
    },
    {
      id: 'container', event: 'CONTAINER_PASS', from: ['NO_EVIDENCE', 'UNIT_EVIDENCED', 'CONTAINER_EVIDENCED'], to: 'CONTAINER_EVIDENCED',
      guard: () => ({ allowed: true }),
      apply: (r, e) => appendEntry(r, e, 'CONTAINER_EVIDENCED'),
    },
    {
      id: 'smoke', event: 'SMOKE_RUN', from: undefined, to: 'UNIT_EVIDENCED', // smoke records but never satisfies container
      guard: () => ({ allowed: true }),
      apply: (r, e) => appendEntry(r, e, 'UNIT_EVIDENCED', true),
    },
  ],
  invariants: [
    (r) => ({ ok: r.entries.length <= EVIDENCE_RING_CAP, invariantId: 'E_RING_CAP', detail: `${r.entries.length}` }),
    (r) => ({
      // the degree-state must match the strongest entry (the honest-state invariant)
      ok: !r.entries.some((x) => x.degree === 'CONTAINER_EVIDENCED' && r.state !== 'CONTAINER_EVIDENCED') || r.state === 'CONTAINER_EVIDENCED',
      invariantId: 'E_STATE_MATCHES_ENTRIES',
    }),
  ],
};

function appendEntry(
  r: EvidenceMachineRecord,
  e: { payload: Readonly<Record<string, unknown>> },
  degree: 'UNIT_EVIDENCED' | 'CONTAINER_EVIDENCED',
  smokeOnly = false,
): EvidenceMachineRecord {
  const triad = e.payload['triad'] as EvidenceTriad | undefined;
  const entry: EvidenceEntry = {
    entryId: String(e.payload['entryId'] ?? `ev-${r.seq + 1}`),
    degree,
    smokeOnly,
    triad: triad ?? { pattern: { memberId: degree === 'CONTAINER_EVIDENCED' ? 'container-suite' : 'unit-suite', familySeverity: 'HIGH' }, state: { machineId: EVIDENCE_MACHINE_ID, from: r.state, to: r.state }, evidence: { file: String(e.payload['file'] ?? '(suite)'), line: 1 } },
    atSeq: Number(e.payload['atSeq'] ?? r.seq + 1),
  };
  const entries = [...r.entries, entry];
  const ring = entries.length > EVIDENCE_RING_CAP ? entries.slice(entries.length - EVIDENCE_RING_CAP) : entries;
  const state = degree === 'CONTAINER_EVIDENCED' ? 'CONTAINER_EVIDENCED' : r.state === 'CONTAINER_EVIDENCED' ? 'CONTAINER_EVIDENCED' : 'UNIT_EVIDENCED';
  return { ...r, seq: r.seq + 1, state, entries: ring, triads: [...r.triads, entry.triad] };
}

/** The fail-closed query: unknown/unproven scope → UNEVIDENCED (never a guess). */
export function queryDegree(record: EvidenceMachineRecord | undefined, tier: 'UNIT' | 'CONTAINER'): TestingDegree {
  if (record === undefined) return 'UNEVIDENCED';
  if (tier === 'CONTAINER') {
    const hasContainer = record.entries.some((x) => x.degree === 'CONTAINER_EVIDENCED');
    return hasContainer ? 'CONTAINER_EVIDENCED' : 'UNEVIDENCED';
  }
  const hasUnit = record.entries.some((x) => x.degree === 'UNIT_EVIDENCED' || x.degree === 'CONTAINER_EVIDENCED');
  return hasUnit ? 'UNIT_EVIDENCED' : 'UNEVIDENCED';
}

/** smoke evidence NEVER satisfies the container tier (the smokeOnly law). */
export function satisfiesTier(record: EvidenceMachineRecord | undefined, tier: 'UNIT' | 'CONTAINER'): boolean {
  const d = queryDegree(record, tier);
  return tier === 'CONTAINER' ? d === 'CONTAINER_EVIDENCED' : d !== 'UNEVIDENCED';
}
