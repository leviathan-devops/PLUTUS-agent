// src/graph/db.ts — the SQLite seam (spec §4.5.1)
// bun:sqlite native (the host runtime is bun 1.3.14); the DRIVER seam allows a
// better-sqlite3 swap for non-bun hosts (Law 18: THIS FILE is the sanctioned seam).
import { Database as BunDatabase } from 'bun:sqlite';

export interface SqliteDriver {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  pragma(statement: string): unknown;
}
export interface PreparedStatement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}
export interface DbClose {
  close(): void;
}

/** The driver seam — hosts inject alternatives; the default is bun:sqlite. */
export type DriverFactory = (path: string) => SqliteDriver & DbClose;

let driverFactory: DriverFactory | null = null;

export function setDriverFactory(f: DriverFactory): void {
  driverFactory = f;
}

export function openDb(path: string): SqliteDriver & DbClose {
  if (driverFactory !== null) return driverFactory(path);
  const db = new BunDatabase(path);
  // THE PRAGMA BLOCK (spec §4.5.1 — exact, at every open; BUG-7: bun:sqlite
  // executes pragmas as statements, not a .pragma() method)
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA foreign_keys = ON');
  const wrapped: SqliteDriver & DbClose = {
    exec: (sql: string) => db.exec(sql),
    prepare: (sql: string) => db.prepare(sql),
    close: () => db.close(),
    pragma: (statement: string) => {
      // BUG-7c: normalize bun's pragma read shapes — object, single-row array, or
      // scalar — into the single-row object the caller expects
      try {
        const raw: unknown = db.query(`PRAGMA ${statement}`).get();
        if (raw === null || raw === undefined) return undefined;
        if (Array.isArray(raw)) return raw[0] ?? undefined;
        if (typeof raw === 'object') {
          const keys = Object.keys(raw as Record<string, unknown>);
          if (keys.length === 1) {
            const only = (raw as Record<string, unknown>)[keys[0]!];
            if (only !== null && typeof only === 'object') return only; // {col: {val}} unwrap
          }
          return raw;
        }
        return { [statement.replace(/[^a-z_]/gi, '')]: raw }; // scalar → named
      } catch {
        return undefined;
      }
    },
  };
  return wrapped;
}

export const SCHEMA_VERSION = 1; // user_version stamp; the opener refuses newer
export class SchemaVersionMismatchError extends Error {
  readonly code = 'SCHEMA_VERSION_MISMATCH';
  constructor(public readonly found: number) {
    super(`SCHEMA_VERSION_MISMATCH: db at v${found} > library v${SCHEMA_VERSION} — forward-compat is never guessed`);
  }
}
