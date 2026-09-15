/**
 * FAILURE STORE — the SQLite failure store + the end-of-pipeline synthesis
 * (PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC §8 + the ENFORCEMENT LAW §8.3).
 *
 * THE OPERATOR'S ENFORCEMENT LAW (verbatim):
 *   "a refine/retry is correct. not a hard throw. the throws here need to be
 *    warnings w/ context on how to properly fix/refine. only hard throw SPECIFIC
 *    MICRO COMPONENTS after they have failed 3 refinements and then full data
 *    needs to be stored in an internal SQLite db for all locked/failures and at
 *    the end of the pipeline all failure data needs to be synthesized and
 *    delivered with the final output + clear next steps on what to clean/fix
 *    on the next pipeline attempt"
 *
 * THE STORE: the locked/failure records (the insert + the query), schema
 * { id, component, reason, context, attempts, timestamp } + week + pair. Backed
 * by bun:sqlite (the project runs on bun). DB path (PROPOSED per the L1 §8.1):
 * MASTER_CONTEXT/plutus-reasoning-failures.db.
 *
 * THE DEGRADATION (the L1 §13.2 disposition): if bun:sqlite is unavailable,
 * recordFailure degrades to an APPEND-ONLY
 * MASTER_CONTEXT/PLUTUS_FAILURES_FALLBACK.md row — a failure is NEVER silently
 * dropped.
 *
 * THE SYNTHESIS: the end-of-pipeline block — the GROUP BY component summary +
 * the clear next steps (checkable commands) per the operator's "clear next
 * steps on what to clean/fix on the next pipeline attempt".
 *
 * Self-contained: ZERO imports from the chain modules — the context is an
 * opaque unknown (JSON-serialized by the caller's data). No cycles.
 */
import { Database } from 'bun:sqlite';
import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// THE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type FailureReason =
  | 'REFINEMENT_EXHAUSTED' // 3 failed refinements → the hard-throw → stored
  | 'CONTRACT_VIOLATION'   // the E3-NEVER contract (anchor-less / unordered) → hard-throw
  | 'SHADOW_DEGRADE'       // the shadow LLM call failed → the deterministic fallback (informational)
  | 'MACRO_DIVERGENCE'     // the per-pair classification contradicted the macro (informational-flag)
  | 'GROUNDING_WARN';      // the D2 law — a grounding violation (W-1..W-7) is a WARN that
                           // CONTINUES the agent loop (the CME §2.5 live-row — the operator:
                           // "these cannot hard kill the fucking agent... need to be a warn
                           // that continues the agent loop")

/** The input a caller (the reasoning chain / the diag) records. */
export interface FailureRecord {
  /** The failing micro component (e.g. 'EUR/USD Monday LONG' / 'EUR/USD Monday SHORT'). */
  component: string;
  /** The failure reason (the operator's taxonomy above). */
  reason: FailureReason;
  /** The FULL data: the refinement warnings + the projection + the ledger excerpt + next steps. */
  context: unknown;
  /** The number of refinement attempts at the time of recording (1-3+). */
  attempts: number;
  /** The fixture week (e.g. '2026-07-06') — the synthesis's time axis. */
  week: string;
  /** The pair (e.g. 'EUR/USD'). */
  pair: string;
}

/** The stored row (the schema + the auto columns). */
export interface StoredFailure extends FailureRecord {
  id: number;
  /** The recorded-at timestamp (datetime('now') — the store's own clock). */
  timestamp: string;
}

/** The end-of-pipeline synthesis (the L1 §8.3 + the operator's law). */
export interface FailureSynthesis {
  week: string;
  total: number;
  hardThrows: number;
  byComponent: Array<{
    component: string;
    count: number;
    reasons: Record<string, number>;
    nextSteps: string[];
  }>;
  nextSteps: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PATHS + THE SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_DB_PATH = (): string =>
  join(process.cwd(), 'MASTER_CONTEXT', 'plutus-reasoning-failures.db');
export const FALLBACK_LOG_PATH = (): string =>
  join(process.cwd(), 'MASTER_CONTEXT', 'PLUTUS_FAILURES_FALLBACK.md');

let db: Database | null = null;
let openError: string | null = null;

/**
 * Open (once) the failure store. Idempotent — the singleton is reused. Returns
 * null on any open/DDL failure (never throws — the degradation path handles
 * the null). WAL mode so the diag's concurrent reads never block the inserts.
 */
export function openFailureStore(dbPath: string = DEFAULT_DB_PATH()): Database | null {
  if (db) return db;
  try {
    const d = new Database(dbPath, { create: true, readwrite: true });
    d.exec('PRAGMA journal_mode = WAL;');
    d.exec(`
      CREATE TABLE IF NOT EXISTS chain_failures (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        component  TEXT NOT NULL,
        reason     TEXT NOT NULL,
        context    TEXT NOT NULL,
        attempts   INTEGER NOT NULL DEFAULT 1,
        timestamp  TEXT NOT NULL DEFAULT (datetime('now')),
        week       TEXT NOT NULL DEFAULT '',
        pair       TEXT NOT NULL DEFAULT ''
      );
    `);
    d.exec('CREATE INDEX IF NOT EXISTS idx_failures_week ON chain_failures(week);');
    d.exec('CREATE INDEX IF NOT EXISTS idx_failures_component ON chain_failures(component);');
    db = d;
    return d;
  } catch (e) {
    openError = e instanceof Error ? e.message : String(e);
    db = null;
    return null;
  }
}

function safeParse(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw ?? null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE INSERT + THE QUERIES (the L1 §8.2 API)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * INSERT the failure record. Returns the row id, or -1 on the fallback path
 * (bun:sqlite unavailable → the append-only fallback log row — NEVER dropped).
 */
export function recordFailure(r: FailureRecord): number {
  const d = openFailureStore();
  const context = JSON.stringify(r.context ?? null);
  if (!d) {
    try {
      mkdirSync(join(process.cwd(), 'MASTER_CONTEXT'), { recursive: true });
      appendFileSync(
        FALLBACK_LOG_PATH(),
        [
          '',
          `## FAILURE (fallback — bun:sqlite unavailable${openError ? `: ${openError}` : ''})`,
          `- component: ${r.component}`,
          `- reason: ${r.reason}`,
          `- attempts: ${r.attempts}`,
          `- week: ${r.week}`,
          `- pair: ${r.pair}`,
          `- context: ${context}`,
          '',
        ].join('\n'),
        'utf8',
      );
    } catch (e2) {
      console.error(
        `[FAILURE-STORE] fallback write failed: ${e2 instanceof Error ? e2.message : String(e2)}`,
      );
    }
    return -1;
  }
  const res = d
    .query(
      `INSERT INTO chain_failures (component, reason, context, attempts, week, pair)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(r.component, r.reason, context, r.attempts, r.week, r.pair);
  return Number(res.lastInsertRowid ?? -1);
}

/** The query — the week's failures (the synthesis's input). */
export function failuresForWeek(week: string): StoredFailure[] {
  const d = openFailureStore();
  if (!d) return [];
  const rows = d
    .query(
      `SELECT id, component, reason, context, attempts, timestamp, week, pair
       FROM chain_failures WHERE week = ? ORDER BY id`,
    )
    .all(week) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id ?? 0),
    component: String(r.component ?? ''),
    reason: String(r.reason ?? '') as FailureReason,
    context: safeParse(r.context),
    attempts: Number(r.attempts ?? 0),
    timestamp: String(r.timestamp ?? ''),
    week: String(r.week ?? week),
    pair: String(r.pair ?? ''),
  }));
}

/** The aggregate — the total + the by-type + the by-component counts. */
export function failureStats(): {
  total: number;
  byType: Record<string, number>;
  byComponent: Record<string, number>;
} {
  const d = openFailureStore();
  if (!d) return { total: 0, byType: {}, byComponent: {} };
  const byType: Record<string, number> = {};
  const byComponent: Record<string, number> = {};
  const rows = d
    .query(`SELECT reason, component, COUNT(*) AS n FROM chain_failures GROUP BY reason, component`)
    .all() as Array<Record<string, unknown>>;
  let total = 0;
  for (const r of rows) {
    const n = Number(r.n ?? 0);
    total += n;
    const reason = String(r.reason ?? 'unknown');
    const component = String(r.component ?? 'unknown');
    byType[reason] = (byType[reason] ?? 0) + n;
    byComponent[component] = (byComponent[component] ?? 0) + n;
  }
  return { total, byType, byComponent };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE NEXT-STEPS BUILDER (the operator's "clear next steps on what to
// clean/fix on the next pipeline attempt" — checkable commands, never prose)
// ═══════════════════════════════════════════════════════════════════════════

export function nextStepsForFailure(r: StoredFailure): string[] {
  switch (r.reason) {
    case 'REFINEMENT_EXHAUSTED':
      return [
        `Refine the operative-zone selection for ${r.pair} ${r.component} — 3 refinements failed to satisfy the RRR ${'2.5'} gate / the anchor trace.`,
        `Rerun the reasoning chain after the fix: bun diag-reasoning-chain.ts`,
      ];
    case 'CONTRACT_VIOLATION':
      return [
        `Inspect the anchor trace for ${r.component}: an E/SL/TP anchor failed assertProjectionContract (the E3-NEVER rule — every anchor needs the e1ZoneId + the e2ProjectionId).`,
        `Verify the zone resolution: bun diag-reasoning-chain.ts --pair ${r.pair}`,
      ];
    case 'SHADOW_DEGRADE':
      return [
        `The shadow agent (deepseek v4 flash via opencode go) was unavailable — set OPENCODE_API_KEY or check SHADOW_AGENT_ENDPOINT.`,
        `The deterministic fallback ran (the chain never hung); re-run with the key to get the LLM refinement: bun diag-reasoning-chain.ts`,
      ];
    case 'GROUNDING_WARN':
      return [
        `A grounding violation (W-1..W-7) was recorded — the WARN was the refinement input and the loop CONTINUED (the D2 law: never a hard-kill on the first violation). Re-emit the offending value per the proposedCorrection in the recorded context.`,
        `Rerun the reasoning chain after the correction: bun diag-reasoning-chain.ts`,
      ];
    case 'MACRO_DIVERGENCE':
      return [
        `Instrument the per-pair classifier at its source — ${r.component} contradicted the unified macro authority (the macro won the emission; the divergence was recorded, never suppressed).`,
        `Rerun after the per-pair fix: bun diag-reasoning-chain.ts`,
      ];
    default:
      return ['Rerun the pipeline: bun diag-reasoning-chain.ts'];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE END-OF-PIPELINE SYNTHESIS (§8.3 — the GROUP BY component summary +
// the next steps; delivered with the final output)
// ═══════════════════════════════════════════════════════════════════════════

export function synthesizeFailures(week: string): FailureSynthesis {
  const rows = failuresForWeek(week);
  const byComponent = new Map<
    string,
    { component: string; count: number; reasons: Record<string, number>; nextSteps: string[] }
  >();
  const allNextSteps: string[] = [];
  let hardThrows = 0;

  for (const r of rows) {
    if (r.reason === 'REFINEMENT_EXHAUSTED' || r.reason === 'CONTRACT_VIOLATION') hardThrows += 1;
    const steps = nextStepsForFailure(r);
    allNextSteps.push(...steps);
    const cur = byComponent.get(r.component) ?? {
      component: r.component,
      count: 0,
      reasons: {},
      nextSteps: [] as string[],
    };
    cur.count += 1;
    cur.reasons[r.reason] = (cur.reasons[r.reason] ?? 0) + 1;
    for (const s of steps) {
      if (!cur.nextSteps.includes(s)) cur.nextSteps.push(s);
    }
    byComponent.set(r.component, cur);
  }

  const dedupSteps = (arr: string[]): string[] => [...new Set(arr)];
  return {
    week,
    total: rows.length,
    hardThrows,
    byComponent: [...byComponent.values()].map((c) => ({
      ...c,
      nextSteps: dedupSteps(c.nextSteps),
    })),
    nextSteps: dedupSteps(allNextSteps),
  };
}

/** The printable synthesis block (the diag's end-of-pipeline section). */
export function formatSynthesis(s: FailureSynthesis): string {
  const lines: string[] = [
    `=== THE FAILURE SYNTHESIS (week ${s.week}) ===`,
    `  failures recorded: ${s.total} | hard-throws (REFINEMENT_EXHAUSTED + CONTRACT_VIOLATION): ${s.hardThrows}`,
  ];
  if (s.byComponent.length === 0) {
    lines.push('  0 hard-throws, 0 contract violations — the reasoning chain emitted cleanly (the append-only law: the synthesis still delivers).');
  }
  for (const c of s.byComponent) {
    lines.push(`  [${c.component}] x${c.count} — ${Object.entries(c.reasons).map(([k, n]) => `${k}(${n})`).join(', ')}`);
    for (const step of c.nextSteps) lines.push(`      next: ${step}`);
  }
  if (s.nextSteps.length > 0) {
    lines.push('  NEXT STEPS (the clean/fix list for the next pipeline attempt):');
    for (const step of s.nextSteps) lines.push(`    - ${step}`);
  }
  return lines.join('\n');
}
