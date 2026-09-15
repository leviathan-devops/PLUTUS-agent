// PROVENANCE: vendored from plutus/pre-v5-overlay @ f5ee436 (src/graph/types.ts).
// Lives in src/enforcement because src/graph is not a dispatchable path in this goal (kernel lock).
// Import rewrites only; no logic changes.
export interface GraphNode {
  id: string;
  kind: string;
  name: string;
  file: string | null;
  line: number | null;
  lineage: string | null;
  source: string | null;
  data: string | null;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  kind: string;
}

export interface CallerRecord {
  callerId: string;
  callerName: string;
  file: string | null;
  line: number | null;
  edgeKind: string;
}

export interface FindingRecord {
  ruleId: string;
  severity: string;
  file: string;
  line: number | null;
  verdict: string;
  runId: string;
  evidence: string | null;
}

export interface RuleCardRecord {
  id: number;
  quote: string;
  anchor: string;
  classification: string;
  severity: string;
  proposed: number;
}

export interface PredicateRecord {
  id: string;
  family: string;
  template: string;
  severity: string;
  anchor: string;
  batteryVersion: string;
}

export interface RuleDetail {
  card: RuleCardRecord | null;
  predicate: PredicateRecord | null;
  violations: FindingRecord[];
}

export interface ConsistencyReport {
  nodeCount: number;
  edgeCount: number;
  danglingEdgeCount: number;
  unwiredNodeCount: number;
  openFindingCount: number;
  distinctViolationSites: number;
  latestRunId: string | null;
}

export interface MustImplementItem {
  predicateId: string;
  declaredInterface: string;
  requiredMembers: string[];
  missingMembers: string[];
  satisfied: boolean;
}

export interface SemanticHit {
  id: string;
  score: number;
  snippet: string;
}

export interface RecountVerdict {
  key: string;
  canon: string;
  live: string;
  verdict: "MATCH" | "DRIFT";
}

export interface RecountResult {
  nodes: number;
  edges: number;
  ruleCards: number;
  predicates: number;
  batteryVersions: Array<{ version: string; count: number }>;
  findings: number;
  tables: string[];
  verdicts: RecountVerdict[];
}

export const CANON = {
  nodes: 1940,
  edges: 3647,
  ruleCards: 2837,
  predicates: 2837,
  fingerprint: "bc6ce1a0584a",
} as const;

export const MAX_CHAIN_DEPTH = 64;

export class GraphEmptyError extends Error {
  readonly code = "GRAPH_EMPTY";
  constructor() {
    super("GRAPH_EMPTY: graph_nodes holds zero CODE nodes — rebuild the graph before querying");
    this.name = "GraphEmptyError";
  }
}

export class GraphNoEmbeddingsError extends Error {
  readonly code = "GRAPH_NO_EMBEDDINGS";
  constructor() {
    super("GRAPH_NO_EMBEDDINGS: no embeddings table in shared.db — semantic-search is unavailable until the embedding index lands");
    this.name = "GraphNoEmbeddingsError";
  }
}

export class GraphUnknownSymbolError extends Error {
  readonly code = "GRAPH_UNKNOWN_SYMBOL";
  constructor(symbol: string) {
    super(`GRAPH_UNKNOWN_SYMBOL: no graph_node matches symbol "${symbol}"`);
    this.name = "GraphUnknownSymbolError";
  }
}

export class GraphUnknownRuleError extends Error {
  readonly code = "GRAPH_UNKNOWN_RULE";
  constructor(id: string) {
    super(`GRAPH_UNKNOWN_RULE: no rule_card or compiled_predicate matches id "${id}"`);
    this.name = "GraphUnknownRuleError";
  }
}
