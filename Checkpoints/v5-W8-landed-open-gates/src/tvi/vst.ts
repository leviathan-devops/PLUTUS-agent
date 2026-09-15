// ═══════════════════════════════════════════════════════════════════
// TVI — VISUAL STATE TRACKER (VST) — SQLITE STATE
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §9 (VST) + §10.1 (VLD query helpers)
//
// SQLite-backed state tracker recording every visual action for
// trajectory analysis and loop detection.
//
// DRIVER DECISION: bun:sqlite (Bun built-in). better-sqlite3 IS in
// package.json dependencies, but it is a native Node addon and FAILS
// under the Bun runtime (ERR_DLOPEN_FAILED — verified at build time).
// This plugin builds with `--target bun` and runs inside Bun, so
// bun:sqlite is the only working zero-new-dependency driver. Its API
// (prepare/run/get/all/exec) is interface-identical to better-sqlite3,
// so a future swap is a one-line import change.
//
// Schema: 7 tables verbatim from spec §9.1. Init is idempotent
// (CREATE TABLE IF NOT EXISTS). DB created at runtime under
// src/tvi/state/tvi-state.db.
// ═══════════════════════════════════════════════════════════════════

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TrajectoryRecord, ValidatedZone } from './types.js';

/** Default DB location — spec §16.1: src/tvi/state/tvi-state.db (created at runtime) */
export const DEFAULT_VST_DB_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'state',
  'tvi-state.db',
);

// ─────────────────────────────────────────────────────────────────
// SCHEMA — verbatim from spec §9.1 (7 tables)
// One documented addition: UNIQUE index on loop_detection.pattern.
// The spec's ON CONFLICT(pattern) upsert (§9.2) requires a unique
// constraint on that column to function; without it the upsert
// degrades to a plain INSERT and produces duplicate pattern rows.
// This index makes the spec's own upsert statement work as specified.
// ─────────────────────────────────────────────────────────────────
const SCHEMA_SQL = `
-- Zone identifications (every zone the agent produced)
CREATE TABLE IF NOT EXISTS zone_identifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair TEXT NOT NULL,
  type TEXT NOT NULL,
  top REAL NOT NULL,
  bottom REAL NOT NULL,
  timeframe TEXT NOT NULL,
  classification TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  visual_evidence TEXT NOT NULL,
  source_screenshot TEXT NOT NULL,
  reaction_count INTEGER DEFAULT 0,
  confluence REAL DEFAULT 0,
  zfp REAL DEFAULT 50,
  liquidity_score REAL DEFAULT 0,
  mapped_ip_zone_name TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

-- Zone verifications (every zone the harness accepted/rejected)
CREATE TABLE IF NOT EXISTS zone_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  gate TEXT NOT NULL,
  passed INTEGER NOT NULL, -- 0=failed, 1=passed
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (zone_id) REFERENCES zone_identifications(id)
);

-- Screenshots (every screenshot captured)
CREATE TABLE IF NOT EXISTS screenshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  pair TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  captured_at INTEGER NOT NULL
);

-- Enforcement log (every VEB decision)
CREATE TABLE IF NOT EXISTS enforcement_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gate TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'blocked', 'warned', 'passed'
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Trajectory history (success/failure per pipeline run)
CREATE TABLE IF NOT EXISTS trajectory_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  week_start TEXT NOT NULL,
  zones_produced INTEGER NOT NULL,
  zones_validated INTEGER NOT NULL,
  setups_produced INTEGER NOT NULL,
  gates_passed INTEGER NOT NULL,
  gates_failed INTEGER NOT NULL,
  health_score REAL NOT NULL, -- 0.0-1.0
  created_at INTEGER NOT NULL
);

-- Loop detection (occurrence counts per pattern)
CREATE TABLE IF NOT EXISTS loop_detection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  last_occurrence INTEGER NOT NULL
);

-- Required by the spec §9.2 ON CONFLICT(pattern) upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_loop_detection_pattern ON loop_detection(pattern);

-- Image reads (every read() call on an image)
CREATE TABLE IF NOT EXISTS image_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  pair TEXT,
  timeframe TEXT,
  read_at INTEGER NOT NULL
);
`;

interface CountRow {
  n: number;
}

interface LoopCountRow {
  count: number;
}

export class VisualStateTracker {
  private db: Database;

  constructor(dbPath: string = DEFAULT_VST_DB_PATH) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.initSchema();
  }

  /** Idempotent schema init — CREATE TABLE IF NOT EXISTS per spec §9.2 */
  private initSchema(): void {
    this.db.exec(SCHEMA_SQL);
  }

  /** Every zone the agent produced — spec §9.2 */
  recordZoneIdentification(zone: ValidatedZone): void {
    this.db
      .prepare(
        `INSERT INTO zone_identifications (pair, type, top, bottom, timeframe, classification, source, confidence, visual_evidence, source_screenshot, reaction_count, confluence, zfp, liquidity_score, mapped_ip_zone_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        zone.pair,
        zone.type,
        zone.top,
        zone.bottom,
        zone.timeframe,
        zone.classification,
        zone.source,
        zone.confidence,
        zone.visualEvidence,
        zone.sourceScreenshot,
        zone.reactionCount,
        zone.confluence,
        zone.zfp,
        zone.liquidityScore,
        zone.mappedIPZoneName,
        Date.now(),
      );
  }

  /** Every zone the harness accepted/rejected — spec §9.2 */
  recordZoneVerification(zoneId: number, gate: string, passed: boolean, reason: string): void {
    this.db
      .prepare(
        `INSERT INTO zone_verifications (zone_id, gate, passed, reason, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(zoneId, gate, passed ? 1 : 0, reason, Date.now());
  }

  /** Every screenshot captured — spec §9.2 */
  recordScreenshot(path: string, pair: string, timeframe: string, sizeBytes: number): void {
    this.db
      .prepare(
        `INSERT INTO screenshots (path, pair, timeframe, size_bytes, captured_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(path, pair, timeframe, sizeBytes, Date.now());
  }

  /** Every VEB decision — spec §9.2 */
  recordEnforcement(gate: string, decision: string, reason: string): void {
    this.db
      .prepare(
        `INSERT INTO enforcement_log (gate, decision, reason, created_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(gate, decision, reason, Date.now());
  }

  /** Pipeline run outcome — healthScore = gatesPassed / max(1, passed+failed) per spec §9.2 */
  recordTrajectory(
    runId: string,
    weekStart: string,
    zonesProduced: number,
    zonesValidated: number,
    setupsProduced: number,
    gatesPassed: number,
    gatesFailed: number,
  ): void {
    const healthScore = gatesPassed / Math.max(1, gatesPassed + gatesFailed);
    this.db
      .prepare(
        `INSERT INTO trajectory_history (run_id, week_start, zones_produced, zones_validated, setups_produced, gates_passed, gates_failed, health_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(runId, weekStart, zonesProduced, zonesValidated, setupsProduced, gatesPassed, gatesFailed, healthScore, Date.now());
  }

  /** Every read() call on an image — spec §9.2 */
  recordImageRead(filePath: string, pair?: string, timeframe?: string): void {
    this.db
      .prepare(
        `INSERT INTO image_reads (file_path, pair, timeframe, read_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(filePath, pair ?? null, timeframe ?? null, Date.now());
  }

  /** Recent trajectory records, newest first — spec §9.2 (used by VTM §10.2) */
  getTrajectoryHistory(limit: number = 10): TrajectoryRecord[] {
    return this.db
      .prepare(`SELECT * FROM trajectory_history ORDER BY created_at DESC LIMIT ?`)
      .all(limit) as TrajectoryRecord[];
  }

  /** Occurrence count for a loop pattern — spec §9.2 */
  getLoopCount(pattern: string): number {
    const row = this.db
      .prepare(`SELECT count FROM loop_detection WHERE pattern = ?`)
      .get(pattern) as LoopCountRow | undefined;
    return row?.count ?? 0;
  }

  /** ON CONFLICT upsert per spec §9.2 — one row per pattern, count incremented */
  incrementLoopCount(pattern: string): void {
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO loop_detection (pattern, count, last_occurrence)
         VALUES (?, 1, ?)
         ON CONFLICT(pattern) DO UPDATE SET count = count + 1, last_occurrence = ?`,
      )
      .run(pattern, now, now);
  }

  // ─────────────────────────────────────────────────────────────
  // VLD/VTM QUERY HELPERS (spec §10.1 — built in Phase 1 per build
  // authority so the Phase 4 VLD module has its full interface)
  // ─────────────────────────────────────────────────────────────

  /** VLD-1 STALE_READ: how many times this screenshot file was read */
  getImageReadCount(filePath: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM image_reads WHERE file_path = ?`)
      .get(filePath) as CountRow;
    return row.n;
  }

  /** VLD-1 STALE_READ: zones produced since a given timestamp */
  getNewZoneCountSince(timestamp: number): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM zone_identifications WHERE created_at >= ?`)
      .get(timestamp) as CountRow;
    return row.n;
  }

  /** VLD-2 NO_VERIFY: total zones produced */
  getZoneProductionCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM zone_identifications`).get() as CountRow;
    return row.n;
  }

  /** VLD-2 NO_VERIFY: total zone verifications recorded */
  getZoneVerificationCount(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS n FROM zone_verifications`).get() as CountRow;
    return row.n;
  }

  /**
   * VLD-4 REPEAT_ERROR: enforcement violations for a gate.
   * A violation is any non-passing decision ('blocked' or 'warned') —
   * 'passed' rows are healthy gate evaluations, not violations.
   */
  getViolationCount(gate: string): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS n FROM enforcement_log WHERE gate = ? AND decision != 'passed'`)
      .get(gate) as CountRow;
    return row.n;
  }

  /** Close the database handle (plugin shutdown) */
  close(): void {
    this.db.close();
  }
}

/**
 * Singleton factory — one tracker per plugin lifecycle.
 * Uses the default DB path (src/tvi/state/tvi-state.db) unless the
 * caller overrides it (e.g. an in-memory or tmp path for verification).
 */
export function createVST(dbPath: string = DEFAULT_VST_DB_PATH): VisualStateTracker {
  return new VisualStateTracker(dbPath);
}
