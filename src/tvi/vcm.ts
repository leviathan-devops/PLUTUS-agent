// ═══════════════════════════════════════════════════════════════════
// TVI — VISUAL CONTEXT MATCHER (VCM) — 8-PHASE PIPELINE
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §4 (VCM) + §15 (Performance Budgets)
//
// Deterministic matching engine. Selects the most relevant VKG nodes
// for the current agent context on every zone identification /
// verification task. ZERO model inference. Boolean evaluation only.
//
// Performance budget: < 2ms per match() call with 100+ nodes.
// Technique: Map for O(1) lookup, early-exit when a phase empties
// the candidate list, no string operations in hot path.
// ═══════════════════════════════════════════════════════════════════

import type { AgentState, VKGNode } from './types.js';

/** A VKG node that survived the pipeline, with its relevance score */
export interface MatchedNode {
  node: VKGNode;
  score: number;
  phase: number;
}

/** Number of top-scoring nodes returned per match() call (spec §4.1 phase 7) */
const TOP_N = 5;

export class VisualContextMatcher {
  /** O(1) node lookup by id — spec §4.1 constructor */
  private nodes: Map<string, VKGNode>;

  constructor(nodes: VKGNode[]) {
    this.nodes = new Map(nodes.map((n) => [n.id, n]));
  }

  /**
   * 8-phase matching pipeline (spec §4.1):
   *   filterByTask → filterByPair → filterByTimeframe → evaluateConditions
   *   → scoreRelevance → sortByScore → takeTopN(5) → formatResults
   *
   * Early-exit: if any filter phase empties the candidate list, the
   * pipeline short-circuits and returns []. No node survives, no work
   * remains — skipping scoring/sorting is the only correct behavior.
   */
  match(state: AgentState): MatchedNode[] {
    let candidates = this.phase1_filterByTask(state.task);
    if (candidates.length === 0) return [];

    candidates = this.phase2_filterByPair(candidates, state.pair);
    if (candidates.length === 0) return [];

    candidates = this.phase3_filterByTimeframe(candidates, state.timeframe);
    if (candidates.length === 0) return [];

    candidates = this.phase4_evaluateConditions(candidates, state);
    if (candidates.length === 0) return [];

    const scored = this.phase5_scoreRelevance(candidates, state);
    const sorted = this.phase6_sortByScore(scored);
    const topN = this.phase7_takeTopN(sorted, TOP_N);
    return this.phase8_formatResults(topN);
  }

  /** Phase 1 — keep nodes whose taskTypes include the current task */
  private phase1_filterByTask(task: string): VKGNode[] {
    const out: VKGNode[] = [];
    for (const n of this.nodes.values()) {
      if (n.taskTypes.includes(task)) out.push(n);
    }
    return out;
  }

  /** Phase 2 — keep nodes applying to this pair (undefined pairs = all pairs) */
  private phase2_filterByPair(nodes: VKGNode[], pair: string): VKGNode[] {
    return nodes.filter((n) => !n.pairs || n.pairs.includes(pair));
  }

  /** Phase 3 — keep nodes applying to this timeframe (undefined = all TFs) */
  private phase3_filterByTimeframe(nodes: VKGNode[], tf: string): VKGNode[] {
    return nodes.filter((n) => !n.timeframes || n.timeframes.includes(tf));
  }

  /** Phase 4 — evaluate each node's boolean condition against agent state */
  private phase4_evaluateConditions(nodes: VKGNode[], state: AgentState): VKGNode[] {
    return nodes.filter((n) => n.condition(state));
  }

  /** Phase 5 — compute relevance score for each surviving node */
  private phase5_scoreRelevance(nodes: VKGNode[], state: AgentState): MatchedNode[] {
    return nodes.map((n) => ({
      node: n,
      score: this.computeRelevanceScore(n, state),
      phase: 5,
    }));
  }

  /**
   * Relevance scoring (spec §4.1 — deterministic weights, no inference):
   *   Priority:   block +100 | warn +50 | guide +25
   *   Category:   anti_pattern +30 | validation +20 | identification +15 | evidence +10
   *   Disclosure: always +20 | once-gate +10 | once-session +5
   */
  computeRelevanceScore(node: VKGNode, _state: AgentState): number {
    let score = 0;

    // Priority weight
    if (node.priority === 'block') score += 100;
    else if (node.priority === 'warn') score += 50;
    else score += 25;

    // Category weight
    if (node.category === 'anti_pattern') score += 30;
    else if (node.category === 'validation') score += 20;
    else if (node.category === 'identification') score += 15;
    else if (node.category === 'evidence') score += 10;

    // Disclosure weight (never shown before = higher priority)
    if (node.disclosure === 'always') score += 20;
    else if (node.disclosure === 'once-gate') score += 10;
    else if (node.disclosure === 'once-session') score += 5;

    return score;
  }

  /** Phase 6 — sort descending by score (stable copy, no mutation of input) */
  private phase6_sortByScore(nodes: MatchedNode[]): MatchedNode[] {
    return [...nodes].sort((a, b) => b.score - a.score);
  }

  /** Phase 7 — take top N matches */
  private phase7_takeTopN(nodes: MatchedNode[], n: number): MatchedNode[] {
    return nodes.slice(0, n);
  }

  /** Phase 8 — format results (identity per spec §4.1; hook formats for output) */
  private phase8_formatResults(nodes: MatchedNode[]): MatchedNode[] {
    return nodes;
  }

  /** O(1) node lookup by id — used by VEB/VGS for direct node retrieval */
  getNode(id: string): VKGNode | undefined {
    return this.nodes.get(id);
  }

  /** Total nodes loaded — diagnostics */
  get size(): number {
    return this.nodes.size;
  }
}

/**
 * Singleton factory (spec §4.3 integration pattern).
 * Caller owns the instance lifetime; create once per plugin init and
 * reuse — constructor cost is one Map build over ~100 nodes.
 */
export function createVCM(nodes: VKGNode[]): VisualContextMatcher {
  return new VisualContextMatcher(nodes);
}
