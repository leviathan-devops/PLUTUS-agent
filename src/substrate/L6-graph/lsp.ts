// src/graph/lsp.ts — the LOGIC-LSP (spec §4.9; lsp-injector.ts:451 lineage)
// ONE-SHARED-LSP-PER-PROJECT: the diagnostics state IS the database. The block
// is byte-budgeted (<500), deduped, and persists until the D25 clear (only the
// auditor's verified conformance-zero; build-agent fixes NEVER clear).

import type { SqliteDriver } from './db';
import type { GraphStore } from './schema';

export const LOGIC_LSP_BYTE_COST = 500; // BECAUSE: "the highlight must not tax the context window into the very regression it prevents"

export class DiagnosticsServer {
  /** the state IS the db — two sessions read the same truth (ONE-SHARED-LSP). */
  constructor(private readonly store: GraphStore, private readonly db: SqliteDriver) {}

  /** blockFor — renders the [LOGIC-LSP] block for a touched file (or null when clean).
   *  D25 persistence semantics: findings for the file persist until conformanceZero —
   *  NOT filtered by the latest hunt's runId (a clean re-hunt never hides old findings;
   *  only the auditor's verified zero clears). */
  blockFor(file: string): string | null {
    if (this.store.isConformanceZero()) return null; // THE D25 CLEAR — audit-only
    const rows = this.db.prepare(
      `SELECT predicateId, severity, message, evidence FROM findings
       WHERE evidence LIKE ?
       ORDER BY CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END
       LIMIT 8`,
    ).all(`%${file}%`) as {
      predicateId: string; severity: string; message: string; evidence: string;
    }[];
    if (rows.length === 0) return null;
    // THE BLOCK (byte-budgeted, deduped)
    const lines: string[] = [`[LOGIC-LSP] ${rows.length} finding(s) in ${file}:`];
    const seen = new Set<string>();
    let deduped = 0;
    let budget = LOGIC_LSP_BYTE_COST;
    for (const r of rows) {
      const key = `${r.predicateId}:${r.evidence}`;
      if (seen.has(key)) { deduped += 1; continue; }
      seen.add(key);
      const prefix = r.severity === 'LOW' ? 'warn' : 'error';
      const line = `  ${prefix}  ${r.predicateId}  ${r.message.slice(0, 80)}`;
      if (budget - line.length < 0) { lines.push(`  …+${rows.length - seen.size} more`); break; }
      lines.push(line);
      budget -= line.length;
    }
    if (deduped > 0) lines.push(`  (${deduped} repeated)`);
    const block = lines.join('\n');
    return block.length > LOGIC_LSP_BYTE_COST ? `${block.slice(0, LOGIC_LSP_BYTE_COST - 20)}\n  (…truncated)` : block;
  }
}

/** extractTouchedFile — the per-tool arg surface (lsp-injector.ts:314-321 lineage). */
export function extractTouchedFile(tool: string, args: Readonly<Record<string, unknown>> | undefined): string | null {
  if (args === undefined || args === null) return null;
  switch (tool) {
    case 'read':
      return str(args['filePath']) ?? str(args['path']); // the 1.14.51 runtime passes filePath
    case 'edit':
      return str(args['filePath']);
    case 'write':
      return str(args['targetPath']) ?? str(args['filePath']);
    case 'bash': {
      const cmd = str(args['command']);
      if (cmd === null) return null;
      const m = /(?:^|\s)([^\s|;&<>]+\.(?:ts|tsx|md|json))/.exec(cmd);
      return m?.[1] ?? null;
    }
    default:
      return null;
  }
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
