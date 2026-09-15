// PROVENANCE: vendored from plutus/pre-v5-overlay @ f5ee436 (src/graph/client.ts).
// Lives in src/enforcement because src/graph is not a dispatchable path in this goal (kernel lock).
// Single rewrite: ./types.js -> ./graph-types.js; no logic changes.
import { Database, type SQLQueryBindings } from "bun:sqlite";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANON,
  GraphEmptyError,
  GraphNoEmbeddingsError,
  GraphUnknownRuleError,
  GraphUnknownSymbolError,
  MAX_CHAIN_DEPTH,
} from "./graph-types.js";
import type {
  CallerRecord,
  ConsistencyReport,
  FindingRecord,
  GraphNode,
  MustImplementItem,
  PredicateRecord,
  RecountResult,
  RecountVerdict,
  RuleCardRecord,
  RuleDetail,
  SemanticHit,
} from "./graph-types.js";

export const GRAPH_RELATIVE_PATH = ".trident/knowledge-graph/shared.db";

export interface ViolationsOptions {
  runId?: string;
  severity?: string;
  limit?: number;
}

export interface GraphClient {
  readonly dbPath: string;
  whoCalls(symbol: string): CallerRecord[];
  chain(from: string, to: string, depth?: number): GraphNode[] | null;
  violations(options?: ViolationsOptions): FindingRecord[];
  consistency(): ConsistencyReport;
  mustImplement(): MustImplementItem[];
  semanticSearch(query: string, limit?: number): SemanticHit[];
  rule(id: string | number): RuleDetail;
  recount(): RecountResult;
  latestRunId(): string | null;
  close(): void;
}

function resolveDefaultPath(): string {
  const fromEnv = process.env["PLUTUS_GRAPH_DB"];
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const candidates: string[] = [];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(here, "..", "..", GRAPH_RELATIVE_PATH));
  } catch {
    throw new Error("GRAPH_NO_PATH: cannot resolve shared.db location — pass dbPath explicitly");
  }
  candidates.push(join(process.cwd(), GRAPH_RELATIVE_PATH));
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `GRAPH_NO_PATH: shared.db not found at ${candidates.join(" or ")} — pass dbPath explicitly`
  );
}

function assertSymbol(symbol: unknown): asserts symbol is string {
  if (typeof symbol !== "string" || symbol.length === 0) {
    throw new TypeError("GRAPH_BAD_SYMBOL: symbol must be a non-empty string");
  }
}

function rowToNode(row: Record<string, unknown>): GraphNode {
  return {
    id: String(row["id"]),
    kind: String(row["kind"]),
    name: String(row["name"]),
    file: row["file"] === null ? null : String(row["file"]),
    line: row["line"] === null ? null : Number(row["line"]),
    lineage: row["lineage"] === null ? null : String(row["lineage"]),
    source: row["source"] === null ? null : String(row["source"]),
    data: row["data"] === null ? null : String(row["data"]),
  };
}

function rowToFinding(row: Record<string, unknown>): FindingRecord {
  return {
    ruleId: String(row["rule_id"]),
    severity: String(row["severity"]),
    file: String(row["file"]),
    line: row["line"] === null ? null : Number(row["line"]),
    verdict: String(row["verdict"]),
    runId: String(row["run_id"]),
    evidence: row["evidence"] === null ? null : String(row["evidence"]),
  };
}

export function openGraph(dbPath?: string): GraphClient {
  const resolved = dbPath ?? resolveDefaultPath();
  if (!existsSync(resolved)) {
    throw new Error(`GRAPH_NO_PATH: shared.db not found at ${resolved}`);
  }
  const db = new Database(resolved, { readonly: true });
  try {
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec("PRAGMA query_only = ON;");
    db.exec("PRAGMA foreign_keys = ON;");
  } catch (error) {
    db.close();
    throw new Error(
      `GRAPH_PRAGMA_FAILED: cannot arm readonly pragmas on ${resolved}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  type Bindings = Extract<SQLQueryBindings, object>;
  function queryAll<T>(sql: string, params: Bindings = {}): T[] {
    try {
      return db.query(sql).all(params) as T[];
    } catch (error) {
      throw new Error(
        `GRAPH_QUERY_FAILED: ${error instanceof Error ? error.message : String(error)} :: ${sql}`
      );
    }
  }

  function queryOne<T>(sql: string, params: Bindings = {}): T | null {
    const rows = queryAll<T>(sql, params);
    return rows.length > 0 ? rows[0]! : null;
  }

  function assertNonEmptyGraph(): void {
    const row = queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM graph_nodes");
    if (row === null || row.n === 0) throw new GraphEmptyError();
  }

  function resolveSymbolIds(symbol: string): string[] {
    const rows = queryAll<{ id: string }>(
      "SELECT id FROM graph_nodes WHERE id = $sym OR name = $sym OR id LIKE $sfx",
      { $sym: symbol, $sfx: `%::${symbol}` }
    );
    return rows.map((r) => r.id);
  }

  function nodeById(id: string): GraphNode | null {
    const row = queryOne<Record<string, unknown>>(
      "SELECT id, kind, name, file, line, lineage, source, data FROM graph_nodes WHERE id = $id",
      { $id: id }
    );
    return row === null ? null : rowToNode(row);
  }

  function latestRunId(): string | null {
    const row = queryOne<{ run_id: string }>(
      "SELECT run_id FROM findings ORDER BY created_at DESC LIMIT 1"
    );
    return row === null ? null : row.run_id;
  }

  function whoCalls(symbol: string): CallerRecord[] {
    assertSymbol(symbol);
    assertNonEmptyGraph();
    const ids = resolveSymbolIds(symbol);
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$t${i}`).join(", ");
    const params: Bindings = {};
    ids.forEach((id, i) => {
      params[`$t${i}`] = id;
    });
    const rows = queryAll<Record<string, unknown>>(
      `SELECT n.id AS callerId, n.name AS callerName, n.file AS file, n.line AS line, e.kind AS edgeKind
       FROM graph_edges e JOIN graph_nodes n ON n.id = e.source_id
       WHERE e.target_id IN (${placeholders}) AND e.kind = 'calls'
       ORDER BY n.file, n.line`,
      params
    );
    return rows.map((r) => ({
      callerId: String(r["callerId"]),
      callerName: String(r["callerName"]),
      file: r["file"] === null ? null : String(r["file"]),
      line: r["line"] === null ? null : Number(r["line"]),
      edgeKind: String(r["edgeKind"]),
    }));
  }

  function chain(from: string, to: string, depth: number = MAX_CHAIN_DEPTH): GraphNode[] | null {
    assertSymbol(from);
    assertSymbol(to);
    if (!Number.isInteger(depth) || depth < 1 || depth > MAX_CHAIN_DEPTH) {
      throw new RangeError(
        `GRAPH_BAD_DEPTH: depth must be an integer in [1, ${MAX_CHAIN_DEPTH}], got ${String(depth)}`
      );
    }
    assertNonEmptyGraph();
    const fromIds = resolveSymbolIds(from);
    if (fromIds.length === 0) throw new GraphUnknownSymbolError(from);
    const toIds = new Set(resolveSymbolIds(to));
    if (toIds.size === 0) throw new GraphUnknownSymbolError(to);
    for (const start of fromIds) {
      if (toIds.has(start)) {
        const self = nodeById(start);
        if (self !== null) return [self];
      }
    }
    const visited = new Set<string>(fromIds);
    let frontier: Array<{ id: string; path: string[] }> = fromIds.map((id) => ({ id, path: [id] }));
    for (let d = 0; d < depth; d++) {
      const next: Array<{ id: string; path: string[] }> = [];
      for (const cursor of frontier) {
        const outs = queryAll<{ target_id: string }>(
          "SELECT target_id FROM graph_edges WHERE source_id = $src AND kind = 'calls'",
          { $src: cursor.id }
        );
        for (const edge of outs) {
          if (visited.has(edge.target_id)) continue;
          visited.add(edge.target_id);
          const path = [...cursor.path, edge.target_id];
          if (toIds.has(edge.target_id)) {
            const nodes: GraphNode[] = [];
            for (const id of path) {
              const node = nodeById(id);
              if (node === null) {
                throw new Error(`GRAPH_DANGLING_EDGE: path node ${id} missing from graph_nodes`);
              }
              nodes.push(node);
            }
            return nodes;
          }
          next.push({ id: edge.target_id, path });
        }
      }
      if (next.length === 0) return null;
      frontier = next;
    }
    return null;
  }

  function violations(options: ViolationsOptions = {}): FindingRecord[] {
    const runId = options.runId ?? latestRunId();
    if (runId === null) return [];
    if (typeof runId !== "string" || runId.length === 0) {
      throw new TypeError("GRAPH_BAD_RUN: runId must be a non-empty string");
    }
    const limit = options.limit ?? 500;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`GRAPH_BAD_LIMIT: limit must be a positive integer, got ${String(limit)}`);
    }
    let sql =
      "SELECT rule_id, severity, file, line, verdict, run_id, evidence FROM findings WHERE run_id = $run";
    const params: Bindings = { $run: runId };
    if (options.severity !== undefined) {
      if (typeof options.severity !== "string" || options.severity.length === 0) {
        throw new TypeError("GRAPH_BAD_SEVERITY: severity must be a non-empty string");
      }
      sql += " AND severity = $sev";
      params["$sev"] = options.severity;
    }
    sql += " ORDER BY severity, file, line LIMIT $lim";
    params["$lim"] = limit;
    return queryAll<Record<string, unknown>>(sql, params).map(rowToFinding);
  }

  function consistency(): ConsistencyReport {
    assertNonEmptyGraph();
    const nodes = queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM graph_nodes");
    const edges = queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM graph_edges");
    const dangling = queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM graph_edges e
       WHERE NOT EXISTS (SELECT 1 FROM graph_nodes n WHERE n.id = e.source_id)
          OR NOT EXISTS (SELECT 1 FROM graph_nodes m WHERE m.id = e.target_id)`
    );
    const unwired = queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM graph_nodes n
       WHERE n.kind != 'module'
         AND NOT EXISTS (SELECT 1 FROM graph_edges e WHERE e.target_id = n.id AND e.kind = 'calls')`
    );
    const open = queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM findings WHERE verdict = 'VIOLATION'"
    );
    const sites = queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM (SELECT DISTINCT file, line FROM findings WHERE verdict = 'VIOLATION')"
    );
    return {
      nodeCount: nodes?.n ?? 0,
      edgeCount: edges?.n ?? 0,
      danglingEdgeCount: dangling?.n ?? 0,
      unwiredNodeCount: unwired?.n ?? 0,
      openFindingCount: open?.n ?? 0,
      distinctViolationSites: sites?.n ?? 0,
      latestRunId: latestRunId(),
    };
  }

  function mustImplement(): MustImplementItem[] {
    assertNonEmptyGraph();
    const preds = queryAll<{ id: string; check_code: string }>(
      "SELECT id, check_code FROM compiled_predicates WHERE template = 'contract.must-implement'"
    );
    const items: MustImplementItem[] = [];
    for (const pred of preds) {
      let bindings: { declaredInterface?: unknown; requiredMembers?: unknown };
      try {
        const parsed: unknown = JSON.parse(pred.check_code);
        if (typeof parsed !== "object" || parsed === null || !("bindings" in parsed)) continue;
        bindings = (parsed as { bindings: typeof bindings }).bindings;
      } catch {
        throw new Error(`GRAPH_BAD_PREDICATE: check_code of ${pred.id} is not valid JSON`);
      }
      if (typeof bindings.declaredInterface !== "string" || !Array.isArray(bindings.requiredMembers)) {
        continue;
      }
      const iface = bindings.declaredInterface;
      const members = bindings.requiredMembers.filter(
        (m): m is string => typeof m === "string"
      );
      const classRows = queryAll<{ id: string }>(
        "SELECT id FROM graph_nodes WHERE kind = 'class' AND (name = $nm OR id LIKE $sfx)",
        { $nm: iface, $sfx: `%::${iface}` }
      );
      const missing: string[] = [];
      for (const member of members) {
        const hit = queryOne<{ id: string }>(
          `SELECT id FROM graph_nodes
           WHERE (name = $m OR id LIKE $sfx OR id LIKE $scoped)
             AND kind IN ('method', 'function') LIMIT 1`,
          { $m: member, $sfx: `%::${member}`, $scoped: `%::${iface}.${member}` }
        );
        if (hit === null) missing.push(member);
      }
      if (classRows.length === 0) {
        for (const member of members) {
          if (!missing.includes(member)) missing.push(member);
        }
      }
      items.push({
        predicateId: pred.id,
        declaredInterface: iface,
        requiredMembers: members,
        missingMembers: missing,
        satisfied: missing.length === 0,
      });
    }
    return items;
  }

  function semanticSearch(query: string, limit: number = 10): SemanticHit[] {
    if (typeof query !== "string" || query.length === 0) {
      throw new TypeError("GRAPH_BAD_QUERY: query must be a non-empty string");
    }
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError(`GRAPH_BAD_LIMIT: limit must be a positive integer, got ${String(limit)}`);
    }
    const tables = queryAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%embed%'"
    );
    if (tables.length === 0) throw new GraphNoEmbeddingsError();
    const rows = queryAll<Record<string, unknown>>(
      `SELECT id, snippet FROM ${tables[0]!.name} WHERE snippet LIKE $q LIMIT $lim`,
      { $q: `%${query}%`, $lim: limit }
    );
    return rows.map((r, i) => ({
      id: String(r["id"]),
      score: 1 / (i + 1),
      snippet: String(r["snippet"] ?? ""),
    }));
  }

  function rule(id: string | number): RuleDetail {
    if ((typeof id !== "string" && typeof id !== "number") || String(id).length === 0) {
      throw new TypeError("GRAPH_BAD_RULE_ID: id must be a non-empty string or number");
    }
    let card: RuleCardRecord | null = null;
    let predicate: PredicateRecord | null = null;
    if (typeof id === "number" || /^\d+$/.test(String(id))) {
      const cardRow = queryOne<Record<string, unknown>>(
        "SELECT id, quote, anchor, classification, severity, proposed FROM rule_cards WHERE id = $id",
        { $id: Number(id) }
      );
      if (cardRow !== null) {
        card = {
          id: Number(cardRow["id"]),
          quote: String(cardRow["quote"]),
          anchor: String(cardRow["anchor"]),
          classification: String(cardRow["classification"]),
          severity: String(cardRow["severity"]),
          proposed: Number(cardRow["proposed"]),
        };
      }
    } else {
      const predRow = queryOne<Record<string, unknown>>(
        "SELECT id, family, template, severity, anchor, battery_version FROM compiled_predicates WHERE id = $id",
        { $id: String(id) }
      );
      if (predRow !== null) {
        predicate = {
          id: String(predRow["id"]),
          family: String(predRow["family"]),
          template: String(predRow["template"]),
          severity: String(predRow["severity"]),
          anchor: String(predRow["anchor"]),
          batteryVersion: String(predRow["battery_version"]),
        };
        const cardRow = queryOne<Record<string, unknown>>(
          "SELECT id, quote, anchor, classification, severity, proposed FROM rule_cards WHERE anchor = $a LIMIT 1",
          { $a: predicate.anchor }
        );
        if (cardRow !== null) {
          card = {
            id: Number(cardRow["id"]),
            quote: String(cardRow["quote"]),
            anchor: String(cardRow["anchor"]),
            classification: String(cardRow["classification"]),
            severity: String(cardRow["severity"]),
            proposed: Number(cardRow["proposed"]),
          };
        }
      }
    }
    if (card === null && predicate === null) throw new GraphUnknownRuleError(String(id));
    const anchor = predicate?.anchor ?? card?.anchor ?? "";
    const predIds = queryAll<{ id: string }>(
      "SELECT id FROM compiled_predicates WHERE anchor = $a",
      { $a: anchor }
    ).map((r) => r.id);
    if (predicate !== null && !predIds.includes(predicate.id)) predIds.push(predicate.id);
    let violationRows: Record<string, unknown>[] = [];
    if (predIds.length > 0) {
      const placeholders = predIds.map((_, i) => `$p${i}`).join(", ");
      const params: Bindings = {};
      predIds.forEach((pid, i) => {
        params[`$p${i}`] = pid;
      });
      violationRows = queryAll<Record<string, unknown>>(
        `SELECT rule_id, severity, file, line, verdict, run_id, evidence FROM findings
         WHERE rule_id IN (${placeholders}) ORDER BY file, line`,
        params
      );
    }
    return { card, predicate, violations: violationRows.map(rowToFinding) };
  }

  function recount(): RecountResult {
    const count = (table: string): number => {
      const row = queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM "${table}"`);
      if (row === null) throw new Error(`GRAPH_RECOUNT_FAILED: no count for ${table}`);
      return row.n;
    };
    const nodes = count("graph_nodes");
    const edges = count("graph_edges");
    const ruleCards = count("rule_cards");
    const predicates = count("compiled_predicates");
    const findings = count("findings");
    const batteryVersions = queryAll<{ version: string; count: number }>(
      "SELECT battery_version AS version, COUNT(*) AS count FROM compiled_predicates GROUP BY battery_version"
    );
    const tables = queryAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    ).map((r) => r.name);
    const hasFingerprint = batteryVersions.some((b) => b.version.includes(CANON.fingerprint));
    const verdicts: RecountVerdict[] = [
      { key: "nodes", canon: String(CANON.nodes), live: String(nodes), verdict: nodes === CANON.nodes ? "MATCH" : "DRIFT" },
      { key: "edges", canon: String(CANON.edges), live: String(edges), verdict: edges === CANON.edges ? "MATCH" : "DRIFT" },
      { key: "rule_cards", canon: String(CANON.ruleCards), live: String(ruleCards), verdict: ruleCards === CANON.ruleCards ? "MATCH" : "DRIFT" },
      { key: "compiled_predicates", canon: String(CANON.predicates), live: String(predicates), verdict: predicates === CANON.predicates ? "MATCH" : "DRIFT" },
      { key: "fingerprint", canon: CANON.fingerprint, live: hasFingerprint ? CANON.fingerprint : "absent", verdict: hasFingerprint ? "MATCH" : "DRIFT" },
    ];
    return { nodes, edges, ruleCards, predicates, batteryVersions, findings, tables, verdicts };
  }

  function close(): void {
    try {
      db.close();
    } catch (error) {
      throw new Error(
        `GRAPH_CLOSE_FAILED: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { dbPath: resolved, whoCalls, chain, violations, consistency, mustImplement, semanticSearch, rule, recount, latestRunId, close };
}
