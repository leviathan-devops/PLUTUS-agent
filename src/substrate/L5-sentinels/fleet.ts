// src/sentinel/fleet.ts — input-filter, inject, override, barrage, boot, supervisor
// (spec §4.7.3-4.7.5, §7.3; Shark input-filter.ts:171 / bridge-inject.ts:240 / meta lineage).

import type { EvidenceTriad } from '../L3-lasme';
import { contentId, canonicalJson } from '../L1-math';

// ── input-filter.ts (the bounded chunk — RULING-7) ────────────────────

export const CHUNK_CHAR_CAP = 4_000; // BECAUSE: bounds the adversarial injection blast radius while preserving quote-level evidence

export interface ShadowChunk {
  readonly verbatimSpan: string; // ≤4000 chars
  readonly beforeBatch: string; // ±1 batch context, same cap
  readonly afterBatch: string;
  readonly structuralAbsence: string | null; // NAMED absence
  readonly provenance: { readonly batchIds: readonly string[] };
}

export function buildChunk(
  stream: string,
  batchIds: readonly string[],
  lookarounds: { before: string; after: string } = { before: '', after: '' },
): ShadowChunk {
  const cap = (s: string): string =>
    s.length <= CHUNK_CHAR_CAP ? s : `${s.slice(0, CHUNK_CHAR_CAP - 40)}[…CHUNK-TRUNCATED:${s.length}]`;
  return {
    verbatimSpan: cap(stream),
    beforeBatch: cap(lookarounds.before),
    afterBatch: cap(lookarounds.after),
    structuralAbsence: stream.includes('[TOOL_RESULT]') ? null : 'no tool_result in window',
    provenance: { batchIds },
  };
}

// ── inject.ts (the W-2 classified advisory — evidence-presence FIRST) ─

export type InjectDecision =
  | { delivered: true; plane: 'messages.transform' }
  | { delivered: false; dropRecord: { reason: 'INCONCLUSIVE_NO_EVIDENCE' | 'LEXICON_FLAGGED'; triad: EvidenceTriad | null } };

export function injectAdvisory(input: {
  advisory: string;
  evidence: EvidenceTriad | null;
  receivingLexiconFlags: (text: string) => boolean; // the receiving brain's classifier
}): InjectDecision {
  // (1) EVIDENCE-PRESENCE FIRST — absent = INCONCLUSIVE drop WITH the record
  if (input.evidence === null) {
    return { delivered: false, dropRecord: { reason: 'INCONCLUSIVE_NO_EVIDENCE', triad: null } };
  }
  // (2) the receiving lexicon classifies the warhead content; flagged = drop WITH record
  if (input.receivingLexiconFlags(input.advisory)) {
    return { delivered: false, dropRecord: { reason: 'LEXICON_FLAGGED', triad: input.evidence } };
  }
  // (3) delivery: the messages.transform plane ONLY (M-11 — no direct chat writes)
  return { delivered: true, plane: 'messages.transform' };
}

// ── override.ts (the dual-surface supervision channel — M-11) ─────────

export type OverrideTarget = 'HALT' | 'SUPPRESS' | 'RATE_LIMIT' | 'PUSH';

export interface OverrideSnapshot {
  readonly version: string; // content-addressed
  readonly perTarget: Readonly<Record<OverrideTarget, { overrideMultiplier: number }>>;
  readonly because: readonly EvidenceTriad[]; // every multiplier carries its WHY
}

export const OVERRIDE_PRECEDENCE: readonly OverrideTarget[] = ['HALT', 'SUPPRESS', 'RATE_LIMIT', 'PUSH'];

export class InvalidOverrideMultiplierError extends Error {
  readonly code = 'INVALID_MULTIPLIER';
  constructor(public readonly target: OverrideTarget, public readonly value: number) {
    super(`INVALID_MULTIPLIER: ${target}=${value} — outside [0,1]; refused LOUDLY, never clamped`);
  }
}

export function applyOverrides(
  directives: readonly { kind: OverrideTarget; mult: number; triad: EvidenceTriad }[],
): OverrideSnapshot {
  const perTarget: Record<OverrideTarget, { overrideMultiplier: number }> = {
    HALT: { overrideMultiplier: 1 }, SUPPRESS: { overrideMultiplier: 1 },
    RATE_LIMIT: { overrideMultiplier: 1 }, PUSH: { overrideMultiplier: 1 },
  };
  const because: EvidenceTriad[] = [];
  for (const d of directives) {
    if (d.mult < 0 || d.mult > 1) throw new InvalidOverrideMultiplierError(d.kind, d.mult);
    perTarget[d.kind] = { overrideMultiplier: d.mult };
    because.push(d.triad);
  }
  return { version: contentId(canonicalJson(perTarget)).slice(0, 12), perTarget, because };
}

/** effectiveMultiplier — the precedence resolution (HALT wins all). */
export function effectiveMultiplier(snap: OverrideSnapshot): number {
  for (const t of OVERRIDE_PRECEDENCE) {
    if (snap.perTarget[t]!.overrideMultiplier === 0) return 0;
  }
  return 1;
}

// ── barrage.ts (the ONE composed delivery per episode) ────────────────

export type BarrageVote = 'FIRE' | 'HOLD';

export interface BarrageOutcome {
  delivered: boolean;
  composed: string | null;
  dissent: readonly BarrageVote[];
}

/** barrage — the unanimous vote; ANY dissent ⇒ NO barrage (the dissent is ledgered). */
export function barrage(votes: readonly BarrageVote[], compose: () => string): BarrageOutcome {
  const dissent = votes.filter((v) => v === 'HOLD');
  if (dissent.length > 0 || votes.length === 0) {
    return { delivered: false, composed: null, dissent };
  }
  return { delivered: true, composed: compose(), dissent: [] };
}

/** approachHash — the NEVER-TWICE gate: a repeated approach without NEW evidence is rejected. */
export function approachHash(rule: string, chunkHash: string): string {
  return contentId(rule, chunkHash).slice(0, 16);
}
export function canIntervene(hash: string, prior: readonly string[], newEvidenceHash?: string): boolean {
  if (!prior.includes(hash)) return true;
  return newEvidenceHash !== undefined; // re-fire only on NEW evidence
}

// ── boot.ts (RULING-13 — the plugin owns the boot; boot-line acceptance) ─

export const BOOT_LINES = [
  '[PARAGON-SENTINEL] SIDECAR_UP',
  '[PARAGON-SENTINEL] SYNAPSE_ONLINE',
  '[PARAGON-SENTINEL] NEURONS_LOADED',
  '[PARAGON-SENTINEL] OVERRIDE_CHANNEL_READY',
  '[PARAGON-SENTINEL] WAL_OPEN',
  '[PARAGON-SENTINEL] WATCHING',
] as const;

export interface BootResult {
  readonly booted: boolean;
  readonly pid: number | null;
  readonly bootLinesSeen: readonly string[];
  readonly loudError: { code: 'SIDECAR_BOOT_FAILED'; detail: string } | null;
  readonly hostBlocked: boolean; // ALWAYS false — DEGRADED-not-hang
}

/** bootSentinel — spawn-or-adopt + watch the log for the 6 boot lines. */
export async function bootSentinel(
  input: { wsDir: string; spawnSidecar: (wsDir: string) => Promise<{ pid: number; logText: () => string }>; adoptExisting?: () => { pid: number; logText: () => string } | null; bootWindowMs?: number },
): Promise<BootResult> {
  const existing = input.adoptExisting?.() ?? null;
  let proc: { pid: number; logText: () => string };
  if (existing !== null) {
    proc = existing; // ADOPT — never double-spawn
  } else {
    try {
      proc = await input.spawnSidecar(input.wsDir);
    } catch (e) {
      return { booted: false, pid: null, bootLinesSeen: [], loudError: { code: 'SIDECAR_BOOT_FAILED', detail: String(e) }, hostBlocked: false };
    }
  }
  const window = input.bootWindowMs ?? 5_000;
  const deadline = Date.now() + window;
  let seen: string[] = [];
  while (Date.now() < deadline) {
    seen = BOOT_LINES.filter((l) => proc.logText().includes(l));
    if (seen.length === BOOT_LINES.length) {
      return { booted: true, pid: proc.pid, bootLinesSeen: seen, loudError: null, hostBlocked: false };
    }
    await new Promise((r) => setTimeout(r, 100)); // the 5s poll cadence
  }
  return {
    booted: false, pid: proc.pid, bootLinesSeen: seen,
    loudError: { code: 'SIDECAR_BOOT_FAILED', detail: `partial boot: ${seen.length}/6 lines` },
    hostBlocked: false, // DEGRADED-not-hang — the host ALWAYS continues
  };
}

// ── supervisor.ts (the WAL-evidenced self-heal; the watchdog machine is in machines/) ──

export interface SupervisorWalEntry {
  readonly t: 'OBSERVE' | 'STUCK' | 'RESTART' | 'GAVE_UP' | 'OFFLINE';
  readonly atUnixMs: number;
  readonly neuronId: string;
  readonly pid?: number;
  readonly attempt?: number;
  readonly reason?: string;
}

export interface SupervisorState {
  readonly wal: readonly SupervisorWalEntry[];
  readonly restartBudget: number;
  readonly restartWindowMs: number;
}

/** recordRestart — the budget check; exceeding GAVE_UP (never a 6th restart). */
export function recordRestart(
  state: SupervisorState,
  neuronId: string,
  nowUnixMs: number,
): SupervisorState & { gaveUp: boolean } {
  const recent = state.wal.filter((e) => e.t === 'RESTART' && e.neuronId === neuronId && nowUnixMs - e.atUnixMs < state.restartWindowMs);
  const attempt = recent.length + 1;
  const gaveUp = attempt > state.restartBudget;
  const entry: SupervisorWalEntry = gaveUp
    ? { t: 'GAVE_UP', atUnixMs: nowUnixMs, neuronId, attempt, reason: 'BUDGET_EXHAUSTED' }
    : { t: 'RESTART', atUnixMs: nowUnixMs, neuronId, attempt };
  return { ...state, wal: [...state.wal, entry], gaveUp };
}
