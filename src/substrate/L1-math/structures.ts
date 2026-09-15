// src/math/structures.ts — the 20-structure helpers (spec §4.2.9; KB-MPSE-00 catalog)
// EXPRESSION BUILDERS ONLY — they never evaluate, never touch stores, never import
// host code (Law 18). Spec authors compose card(subset(...)) instead of hand-writing
// nested literals, eliminating transcription drift.

import {
  add, and, card, eq, foldAdd, foldAnd, le, lit, lt, member, mul, not, or, ref, subset, sum,
  type MathExpr,
} from './expr';

export type StructureId = string & { readonly __brand: 'StructureId' };

export interface StructureHelper {
  readonly id: StructureId;
  readonly build: (...args: MathExpr[]) => MathExpr;
  /** the structure's own invariant (null = none beyond the built expr itself) */
  readonly invariantOf: (built: MathExpr) => MathExpr | null;
}

export interface StructureRegistry {
  register(helper: StructureHelper): void;
  get(id: StructureId): StructureHelper | undefined;
  all(): readonly StructureHelper[];
}

export function createStructureRegistry(): StructureRegistry {
  const map = new Map<string, StructureHelper>();
  return {
    register: (h) => { map.set(h.id, h); },
    get: (id) => map.get(id),
    all: () => [...map.values()],
  };
}

const sid = (id: string): StructureId => id as StructureId;
const simple = (id: string, build: (...a: MathExpr[]) => MathExpr): StructureHelper =>
  ({ id: sid(id), build, invariantOf: () => null });

/** Register the 20 KB-MPSE-00 structures. Idempotent, order-free. */
export function registerStructures(reg: StructureRegistry): void {
  // 1. algebraic composition — pipeline stages compose; output type of N feeds N+1
  reg.register(simple('algebraic-composition', (...stages) => foldAdd(stages.map((s) => s))));
  // 2. set theory — explicit composable filters
  reg.register(simple('set-intersection', (a, b) => ({ kind: 'subset', sub: a, sup: b })));
  reg.register(simple('set-membership', member));
  // 3. inequality constraint systems — hard bounds
  reg.register(simple('bounded', (x, lo, hi) => foldAnd([le(lo, x), le(x, hi)])));
  // 4. piecewise functions — exhaustive branches (see D8 for the exhaustiveness invariant)
  reg.register(simple('piecewise-count', (universe, ...guards) =>
    eq(foldAdd(guards.map(card)), card(universe))));
  // 5. linear combinations — Σ wᵢxᵢ, weights explicit
  reg.register(simple('linear-combination', (weights, xs) => mul(weights, xs)));
  // 6. recurrence relations — next = f(current) (the invariant: state-reachability)
  reg.register(simple('recurrence-step', (prev, delta) => add(prev, delta)));
  // 7. boolean algebra — composable rule sets
  reg.register(simple('rule-and', and));
  reg.register(simple('rule-or', or));
  reg.register(simple('rule-not', not));
  // 8. probability/expected value — quantified numerically
  reg.register(simple('expected-value', (outcomes, probs) => mul(outcomes, probs)));
  // 9. matrix operations — all pairs scored on same dimensions (row completeness)
  reg.register(simple('row-complete', (row, universe) => subset(row, universe)));
  // 10. invariants — the system CANNOT produce invalid output
  reg.register(simple('invariant', (x, bound) => le(x, bound)));
  // 11. graphs/dependency trees — no circular deps (D9 uses monotone positions)
  reg.register(simple('depends-on', (a, b) => lt(b, a)));
  // 12. sequences/series — cumulative correctness
  reg.register(simple('series-sum', sum));
  // 13. domain/range — reject invalid inputs at the boundary
  reg.register(simple('in-domain', member));
  // 14. monotonicity — progress guaranteed
  reg.register(simple('monotone', le));
  // 15. equivalence relations — consistent dedup
  reg.register(simple('mutual-subset', (a, b) => and(subset(a, b), subset(b, a))));
  // 16. partial orders — tier preference
  reg.register(simple('tier-lte', le));
  // 17. vector spaces — precise distance
  reg.register(simple('bounded-distance', (d, cap) => le(d, cap)));
  // 18. optimization — mathematically defined "best"
  reg.register(simple('optimal-is-max', (candidate, all) => eq(candidate, { kind: 'max', set: all })));
  // 19. combinatorics — EXACTLY the expected count (the founding family)
  reg.register(simple('exact-count', eq));
  // 20. logical implication — cause ⇒ effect
  reg.register(simple('implies', (cause, effect) => or(not(cause), effect)));
  // sanity: 20 registered
  if (reg.all().length !== 20) {
    throw new Error(`STRUCTURE_REGISTRY_COUNT: expected 20, got ${reg.all().length} — the KB-00 catalog is closed`);
  }
}

// Re-export commonly used builders for direct spec authoring.
export { add, and, card, eq, foldAdd, foldAnd, le, lit, lt, member, mul, not, or, ref, subset, sum };
