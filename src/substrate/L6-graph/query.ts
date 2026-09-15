// src/graph/query.ts — the 10 query verbs (spec §6.9; bug-hunter :3192-3256 lineage)
// TYPED EMPTIES (never null/undefined); NAMED ERRORS for unavailable surfaces;
// the chain verb is BFS-BOUNDED at 64 (a pathological graph cannot hang the query).

import type { SqliteDriver } from './db';

export const TEN_VERBS = [
  'who-calls', 'chain', 'must-implement', 'unwired', 'rule', 'violations',
  'consistency', 'semantic-search', 'code-search', 'docs-patterns',
] as const;
export type QueryVerb = (typeof TEN_VERBS)[number];

export const CHAIN_DEPTH_BOUND = 64; // BECAUSE: ~2.8x the observed max derivation depth (23 at W10 scale)

export class SemanticUnavailableError extends Error {
  readonly code = 'SEMANTIC_UNAVAILABLE';
  constructor() { super('SEMANTIC_UNAVAILABLE: the semantic index is a phase-2 stub — honest zero, never a fabricated pass'); }
}
export class DocsUnavailableError extends Error {
  readonly code = 'DOCS_UNAVAILABLE';
  constructor() { super('DOCS_UNAVAILABLE: the docs-pattern surface is a phase-2 stub — honest zero'); }
}

export interface QueryResult {
  readonly verb: QueryVerb;
  readonly items: readonly unknown[]; // TYPED empties: always an array
  readonly namedError?: string;
  readonly truncated?: boolean;
}

export function query(db: SqliteDriver, verb: QueryVerb, args: { start?: string; edges?: readonly string[]; match?: string; scope?: string }): QueryResult {
  switch (verb) {
    case 'who-calls': {
      if (args.start === undefined) return { verb, items: [] };
      const rows = db.prepare(
        `SELECT e.src AS caller, n.file, n.line FROM graph_edges e
         JOIN graph_nodes n ON n.id = e.src WHERE e.dst = ? AND e.kind IN ('calls', 'wires')`,
      ).all(args.start);
      return { verb, items: rows };
    }
    case 'chain': {
      if (args.start === undefined) return { verb, items: [] };
      const kinds = args.edges ?? ['derives-from', 'traces-to', 'calls'];
      const placeholders = kinds.map(() => '?').join(',');
      // BFS bounded at 64 — the bound is enforced by the visit frontier
      const visited: string[] = [args.start];
      const seen = new Set<string>([args.start]);
      let frontier = [args.start];
      let truncated = false;
      for (let depth = 0; depth < CHAIN_DEPTH_BOUND && frontier.length > 0; depth++) {
        const next: string[] = [];
        const qs = frontier.map(() => '?').join(',');
        const rows = db.prepare(
          `SELECT dst FROM graph_edges WHERE src IN (${qs}) AND kind IN (${placeholders})`,
        ).all(...frontier, ...kinds) as { dst: string }[];
        for (const r of rows) {
          if (!seen.has(r.dst)) { seen.add(r.dst); visited.push(r.dst); next.push(r.dst); }
        }
        frontier = next;
        if (frontier.length > 0 && depth === CHAIN_DEPTH_BOUND - 1) truncated = true;
      }
      return { verb, items: visited.map((id) => ({ id })), truncated };
    }
    case 'must-implement': {
      const rows = db.prepare(
        `SELECT n.id, n.name FROM graph_nodes n
         WHERE n.kind = 'stage' AND n.lineage = 'SPEC_DERIVED'
         AND NOT EXISTS (SELECT 1 FROM graph_edges e WHERE e.dst = n.id AND e.kind = 'implements')`,
      ).all();
      return { verb, items: rows }; // the un-implemented SPEC stages
    }
    case 'unwired': {
      const rows = db.prepare(
        `SELECT n.id, n.name, n.kind FROM graph_nodes n
         WHERE n.kind IN ('function', 'machine', 'lexicon') AND n.lineage = 'CODE_DERIVED'
         AND NOT EXISTS (SELECT 1 FROM graph_edges e WHERE e.dst = n.id AND e.kind IN ('calls', 'wires'))`,
      ).all();
      return { verb, items: rows };
    }
    case 'rule': {
      if (args.match === undefined) return { verb, items: [] };
      const rows = db.prepare('SELECT * FROM compiled_predicates WHERE templateId LIKE ?').all(`%${args.match}%`);
      return { verb, items: rows };
    }
    case 'violations': {
      const rows = db.prepare(
        'SELECT * FROM findings ORDER BY CASE severity WHEN \'CRITICAL\' THEN 0 WHEN \'HIGH\' THEN 1 WHEN \'MEDIUM\' THEN 2 ELSE 3 END, createdSeq DESC',
      ).all();
      return { verb, items: rows };
    }
    case 'consistency': {
      // THE MATRIX VISION: the SPEC_DERIVED vs CODE_DERIVED drift alarm
      const specCount = (db.prepare('SELECT COUNT(*) AS c FROM graph_nodes WHERE lineage = ?').get('SPEC_DERIVED') as { c: number }).c;
      const codeCount = (db.prepare('SELECT COUNT(*) AS c FROM graph_nodes WHERE lineage = ?').get('CODE_DERIVED') as { c: number }).c;
      const hybridCount = (db.prepare('SELECT COUNT(*) AS c FROM graph_nodes WHERE lineage = ?').get('HYBRID') as { c: number }).c;
      return { verb, items: [{ specDerived: specCount, codeDerived: codeCount, hybrid, drift: specCount > 0 && codeCount === 0 }] };
      function hybrid(): number { return hybridCount; }
    }
    case 'semantic-search':
      throw new SemanticUnavailableError();
    case 'code-search':
      throw new SemanticUnavailableError();
    case 'docs-patterns':
      throw new DocsUnavailableError();
  }
}
