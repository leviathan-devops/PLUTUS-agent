/**
 * PLUTUS TTE — REJECTED-SETUP LOG WRITER (Wave J1)
 *
 * Every E3 rejection writes a structured record to
 *   data/rejected_setups/{run}/rejected_setup_{NNNN}.json
 * per the FIX PLAN §12 schema — "they should be logged somewhere easily
 * accessible" (the operator). The manual review stage (Wave K,
 * src/mdve/review-stage.ts) reads this log as its input.
 *
 * NEVER throws on write failure (a log failure must never kill the pipeline).
 * Deterministic naming (zero-padded index) — no wall-clock.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The §12 record schema. All fields optional-safe (the writer tolerates any
 *  partial record — the review stage fills what the rejection site lacked). */
export interface RejectedSetupRecord {
  setupId?: string;
  run?: string;
  pair?: string;
  lane?: string;
  day?: string;
  direction?: string;
  entry?: number;
  sl?: number;
  tp?: number;
  rrrComputed?: number;
  rrrFloor?: number;
  rejectionReason?: string;
  hallucinationTrigger?: boolean;
  sourceSetupId?: string;
  sourceZone?: unknown;
  cascadeDays?: unknown;
  designatedZone?: unknown;
  opposingBoMWall?: unknown;
  internalRungs?: unknown;
  layerFindings?: unknown;
  verdict?: string;
  correctedAnchors?: unknown;
  refinementNote?: string;
}

/** The default log root (project-relative — resolved at write time). */
export const REJECTED_SETUPS_DIR = 'data/rejected_setups';

/** Derive the deterministic run id from a week start (ms) — no wall-clock. */
export function runIdOf(weekStartMs: number | undefined | null): string {
  if (weekStartMs === undefined || weekStartMs === null) return 'unknown-run';
  return new Date(weekStartMs).toISOString().replace(/[:.]/g, '-');
}

/**
 * Write one rejected-setup record. Deterministic naming: the first record
 * for a run is rejected_setup_0001.json, then 0002, etc. The index is
 * derived from the EXISTING files in the run dir (deterministic — the same
 * sequence of writes produces the same names).
 *
 * @returns the written file path, or null on failure (never throws).
 */
export function writeRejectedSetup(
  record: RejectedSetupRecord,
  opts?: { logRoot?: string; weekStartMs?: number },
): string | null {
  try {
    const run = record.run ?? runIdOf(opts?.weekStartMs);
    const dir = join(opts?.logRoot ?? REJECTED_SETUPS_DIR, run);
    mkdirSync(dir, { recursive: true });
    // Deterministic index from the existing files (sorted — stable naming).
    let index = 1;
    try {
      const { readdirSync } = require('node:fs') as typeof import('node:fs');
      const existing = readdirSync(dir).filter((f) => /^rejected_setup_\d{4}\.json$/.test(f));
      if (existing.length > 0) {
        const max = Math.max(...existing.map((f) => parseInt(f.slice(15, 19), 10)));
        index = max + 1;
      }
    } catch {
      index = 1; // the dir listing failed — start at 1 (best-effort, never throw)
    }
    const name = `rejected_setup_${String(index).padStart(4, '0')}.json`;
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(record, null, 2) + '\n', 'utf8');
    return path;
  } catch (err) {
    // A log failure must never kill the pipeline (FIX PLAN §12 resilience).
    console.error('[rejected-log] write failed (non-fatal):', (err as Error).message);
    return null;
  }
}
