// src/graph/schema.ts — the 11-table DDL (spec §4.5.2-4.5.5, bug-hunter :1301-1450 lineage)
// WRITE GATES: LINEAGE_MISSING and FINDING_NO_TRIPLET throw AT INSERT (DM-L5/L1).
// The REBUILD/LEDGER split: graph tables are per-run-rebuilt; findings/events are append-only.

import type { SqliteDriver } from './db';
import { SCHEMA_VERSION } from './db';
import { canonicalJson, contentId } from '../L1-math';

export const DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('invariant','lexicon','machine','gate','evidence','stage','rule')),
    name TEXT NOT NULL,
    file TEXT NOT NULL,
    line INTEGER NOT NULL,
    lineage TEXT NOT NULL CHECK (lineage IN ('SPEC_DERIVED','CODE_DERIVED','HYBRID')),
    source TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    src TEXT NOT NULL REFERENCES graph_nodes(id),
    dst TEXT NOT NULL REFERENCES graph_nodes(id),
    kind TEXT NOT NULL CHECK (kind IN ('derives-from','traces-to','enforces','constrains','wires','verifies','implements','calls','imports')),
    data TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    predicateId TEXT NOT NULL,
    batteryVersion TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')),
    triad TEXT NOT NULL,
    evidence TEXT NOT NULL,
    message TEXT NOT NULL,
    createdSeq INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS rule_cards (
    cardId TEXT PRIMARY KEY, quote TEXT NOT NULL, anchor TEXT NOT NULL,
    classification TEXT NOT NULL, corpusHash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS compiled_predicates (
    predicateId TEXT PRIMARY KEY, cardId TEXT NOT NULL REFERENCES rule_cards(cardId),
    templateId TEXT NOT NULL, batteryVersion TEXT NOT NULL, fullHash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS calibrations (
    batteryVersion TEXT NOT NULL, fixtureId TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('CALIBRATED','FLAGGED_EXCLUDED')),
    PRIMARY KEY (batteryVersion, fixtureId)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('HUNT_DONE','BUILD_DONE','AUDIT_DONE')),
    payload TEXT NOT NULL, atSeq INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_sections (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, sourcePredicateIds TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS implementations (
    id TEXT PRIMARY KEY, nodeRef TEXT NOT NULL REFERENCES graph_nodes(id), status TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS conformance_verdicts (
    id TEXT PRIMARY KEY, scope TEXT NOT NULL,
    conformanceZero INTEGER NOT NULL CHECK (conformanceZero IN (0,1)),
    clearedByEvent TEXT REFERENCES events(id)
  )`,
  `CREATE TABLE IF NOT EXISTS ledger (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, atUnixMs INTEGER NOT NULL,
    actor TEXT NOT NULL, op TEXT NOT NULL, subject TEXT NOT NULL, payload TEXT NOT NULL
  )`,
];

export interface NodeInput {
  readonly kind: 'invariant' | 'lexicon' | 'machine' | 'gate' | 'evidence' | 'stage' | 'rule';
  readonly name: string;
  readonly file: string;
  readonly line: number;
  readonly lineage: 'SPEC_DERIVED' | 'CODE_DERIVED' | 'HYBRID';
  readonly source: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface EdgeInput {
  readonly src: string;
  readonly dst: string;
  readonly kind: 'derives-from' | 'traces-to' | 'enforces' | 'constrains' | 'wires' | 'verifies' | 'implements' | 'calls' | 'imports';
}

export class LineageMissingError extends Error {
  readonly code = 'LINEAGE_MISSING';
  constructor(public readonly node: string) {
    super(`LINEAGE_MISSING: ${node} — the writer MUST declare lineage; there is no default`);
  }
}
export class FindingNoTriadError extends Error {
  readonly code = 'FINDING_NO_TRIPLET';
  constructor(public readonly findingId: string) {
    super(`FINDING_NO_TRIPLET: ${findingId} — no triad, no finding (DM-L1)`);
  }
}

export function nodeIdOf(n: NodeInput): string {
  if (n.lineage === undefined || n.lineage === null) throw new LineageMissingError(n.name);
  return contentId(n.kind, n.name, n.file, String(n.lineage)).slice(0, 24);
}

export class GraphStore {
  constructor(private readonly db: SqliteDriver) {
    for (const ddl of DDL) this.db.exec(ddl);
    const v = this.db.pragma('user_version') as { user_version?: number } | unknown[];
    const current = Array.isArray(v) ? Number((v[0] as { user_version?: number })?.user_version ?? 0) : Number((v as { user_version?: number })?.user_version ?? 0);
    if (current > SCHEMA_VERSION) throw new SchemaVersionMismatchErrorImported(current);
    if (current === 0) this.db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  /** REBUILD: the per-run graph rebuild (idempotent — content-addressed re-insert is a no-op diff). */
  rebuildGraph(nodes: readonly NodeInput[], edges: readonly EdgeInput[]): void {
    this.db.exec('DELETE FROM graph_edges');
    this.db.exec('DELETE FROM graph_nodes');
    const danglingEdges: string[] = [];
    const ids = new Set(nodes.map((n) => nodeIdOf(n)));
    for (const n of nodes) {
      this.db.prepare('INSERT OR IGNORE INTO graph_nodes (id, kind, name, file, line, lineage, source, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(nodeIdOf(n), n.kind, n.name, n.file, n.line, n.lineage, n.source, canonicalJson(n.data ?? {}));
    }
    for (const e of edges) {
      if (!ids.has(e.src) || !ids.has(e.dst)) {
        danglingEdges.push(`${e.src}→${e.dst}`);
        continue; // the DANGLING-EDGE FILTER: quarantined (counted), never written
      }
      this.db.prepare('INSERT OR IGNORE INTO graph_edges (id, src, dst, kind, data) VALUES (?, ?, ?, ?, ?)')
        .run(contentId(e.src, e.kind, e.dst).slice(0, 24), e.src, e.dst, e.kind, '{}');
    }
    if (danglingEdges.length > 0) {
      this.db.prepare('INSERT INTO ledger (atUnixMs, actor, op, subject, payload) VALUES (?, ?, ?, ?, ?)')
        .run(Date.now(), 'graph', 'DANGLING_EDGES_QUARANTINED', 'rebuild', canonicalJson({ count: danglingEdges.length, edges: danglingEdges.slice(0, 10) }));
    }
  }

  insertFinding(input: {
    predicateId: string; batteryVersion: string; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    triad: Readonly<Record<string, unknown>>; evidence: string; message: string; createdSeq: number;
  }): string {
    const triadJson = canonicalJson(input.triad);
    if (triadJson === '{}' || triadJson === 'null') throw new FindingNoTriadError(input.predicateId);
    if (!input.evidence || input.evidence.trim() === '') throw new FindingNoTriadError(input.predicateId);
    const id = contentId(input.predicateId, input.evidence, input.batteryVersion).slice(0, 24);
    this.db.prepare('INSERT OR REPLACE INTO findings (id, predicateId, batteryVersion, severity, triad, evidence, message, createdSeq) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, input.predicateId, input.batteryVersion, input.severity, triadJson, input.evidence, input.message, input.createdSeq);
    return id;
  }

  insertEvent(kind: 'HUNT_DONE' | 'BUILD_DONE' | 'AUDIT_DONE', payload: Readonly<Record<string, unknown>>, atSeq: number): string {
    const id = contentId(kind, String(atSeq), canonicalJson(payload)).slice(0, 24);
    this.db.prepare('INSERT OR REPLACE INTO events (id, kind, payload, atSeq) VALUES (?, ?, ?, ?)')
      .run(id, kind, canonicalJson(payload), atSeq);
    return id;
  }

  latestEvent(kind: 'HUNT_DONE' | 'BUILD_DONE' | 'AUDIT_DONE'): { id: string; kind: string; payload: string; atSeq: number } | null {
    const row = this.db.prepare('SELECT id, kind, payload, atSeq FROM events WHERE kind = ? ORDER BY atSeq DESC LIMIT 1').get(kind);
    return (row as { id: string; kind: string; payload: string; atSeq: number }) ?? null;
  }

  /** THE D25 CLEAR: only an AUDIT_DONE event carrying conformanceZero sets the clear. */
  isConformanceZero(): boolean {
    const audit = this.latestEvent('AUDIT_DONE');
    if (audit === null) return false;
    try {
      const p = JSON.parse(audit.payload) as { conformanceZero?: boolean };
      return p.conformanceZero === true;
    } catch {
      return false;
    }
  }
}

class SchemaVersionMismatchErrorImported extends Error {
  readonly code = 'SCHEMA_VERSION_MISMATCH';
  constructor(public readonly found: number) {
    super(`SCHEMA_VERSION_MISMATCH: db at v${found} > library v${SCHEMA_VERSION}`);
  }
}
