// src/math/families.ts — the D1–D9 derailment family builders (spec §4.2.8)
// CANONICAL taxonomy (KB-MPSE-02:196-589; V444 spec §2): each family is a CONSTANT
// shape; the spec's declared values are the VARIABLES (D10). A closed set — adding
// a family is a taxonomy revision, not a code patch.

import {
  add, and, card, eq, foldAdd, foldAnd, ge, gt, le, lit, lt, member, mul, ref, subset,
  type MathExpr,
} from './expr';
import type { ProvenanceAnchor } from './anchor';
import { contentId, canonicalJson } from './serialize';

export type DerailmentFamilyId =
  | 'D1' // single-admissible-reading:   |I(S)| = 1 (the Losslessness Theorem)
  | 'D2' // cardinality upper bound:     |O| ≤ |X|  (overgeneration)
  | 'D3' // cardinality lower bound:     |O| ≥ |X|  (undergeneration)
  | 'D4' // closed output set:           O ⊆ S      (scope creep)
  | 'D5' // constraint provenance:       source(c) ∈ Spec (hallucinated constraints)
  | 'D6' // constraint coverage:         |C_spec| = |C_used| (dropped constraints)
  | 'D7' // domain membership:           x ∈ Dom(f)  (type confusion)
  | 'D8' // piecewise exhaustiveness:    ⋃ guards = Universe, pairwise disjoint (boundary violation)
  | 'D9'; // topological order:          deps(a) ≺ a in execution order (ordering error)

export interface FamilyDescriptor {
  readonly id: DerailmentFamilyId;
  readonly name: string;
  readonly semantic: string; // the KB definition, verbatim-anchored
  readonly canonicalCase: ProvenanceAnchor; // the founding incident
  /** the builder: pure expression construction from ALREADY-BUILT MathExpr args */
  readonly invariantTemplate: (profile: FamilyProfile) => MathExpr;
}

/** Profile fields are ALREADY-BUILT MathExpr values (binding refs, counts, sets). */
export type FamilyProfile = Readonly<Record<string, MathExpr | readonly MathExpr[]>>;

export const REQUIRED_PROFILE_FIELDS: Readonly<Record<DerailmentFamilyId, readonly string[]>> = {
  D1: ['readings'],
  D2: ['outputs', 'inputs'],
  D3: ['outputs', 'inputs'],
  D4: ['observed', 'declared'],
  D5: ['constraint', 'spec'],
  D6: ['specCount', 'usedCount'],
  D7: ['value', 'domainLo', 'domainHi'],
  D8: ['guards', 'universe'],
  D9: ['positions'],
};

// ── the builders (CONSTANT shapes — KB-MPSE-02 family table) ──────────

/** D1: exactly one admissible reading — the Losslessness Theorem as an invariant. */
const d1 = (p: FamilyProfile): MathExpr => eq(p['readings'] as MathExpr, lit(1));

/** D2 (overgeneration): |O| ≤ |X| — "40 setups from 8 pairs" violates. */
const d2 = (p: FamilyProfile): MathExpr => le(p['outputs'] as MathExpr, p['inputs'] as MathExpr);

/** D3 (undergeneration): |O| ≥ |X| — "13 of 24" violates. */
const d3 = (p: FamilyProfile): MathExpr => ge(p['outputs'] as MathExpr, p['inputs'] as MathExpr);

/** D4 (scope creep): O ⊆ S — every observed id must be in the declared set. */
const d4 = (p: FamilyProfile): MathExpr => subset(p['observed'] as MathExpr, p['declared'] as MathExpr);

/** D5 (hallucinated constraints): source(c) ∈ Spec. */
const d5 = (p: FamilyProfile): MathExpr => member(p['constraint'] as MathExpr, p['spec'] as MathExpr);

/** D6 (dropped constraints): |C_spec| = |C_used|. */
const d6 = (p: FamilyProfile): MathExpr => eq(p['specCount'] as MathExpr, p['usedCount'] as MathExpr);

/** D7 (type confusion): lo ≤ x ≤ hi — the value inside the declared numeric domain.
 *  The canonical case is the branded range (SlPips ∈ [5,15]; -7 and 1e308 violate). */
const d7 = (p: FamilyProfile): MathExpr =>
  and(le(p['domainLo'] as MathExpr, p['value'] as MathExpr), le(p['value'] as MathExpr, p['domainHi'] as MathExpr));

/**
 * D8 (piecewise exhaustiveness): Σ|gᵢ| = |U| ∧ pairwise-disjoint.
 * A partition satisfies BOTH sum-of-parts = whole AND parts ⊆ whole; the conjunction
 * rejects gaps (sum < whole) AND overlaps (sum > whole) in one expression pair.
 */
const d8 = (p: FamilyProfile): MathExpr => {
  const guards = p['guards'] as readonly MathExpr[];
  const universe = p['universe'] as MathExpr;
  const guardCardinalities = guards.map((g) => card(g));
  return and(
    eq(foldAdd(guardCardinalities), card(universe)), // exhaustiveness + disjointness
    foldAnd(guards.map((g) => subset(g, universe))), // no guard outside the universe
  );
};

/** D9 (ordering error): positions are monotone non-decreasing (deps(a) ≺ a). */
const d9 = (p: FamilyProfile): MathExpr => {
  const positions = p['positions'] as readonly MathExpr[];
  const clauses: MathExpr[] = [];
  for (let i = 0; i + 1 < positions.length; i++) {
    clauses.push(le(positions[i]!, positions[i + 1]!));
  }
  if (clauses.length === 0) return eq(lit(1), lit(1)); // a single position is trivially ordered
  return foldAnd(clauses);
};

export const FAMILY_BUILDERS: Readonly<Record<DerailmentFamilyId, (p: FamilyProfile) => MathExpr>> = {
  D1: d1, D2: d2, D3: d3, D4: d4, D5: d5, D6: d6, D7: d7, D8: d8, D9: d9,
};

export type FamilyBuildError =
  | { ok: false; code: 'PROFILE_INCOMPLETE'; familyId: DerailmentFamilyId; missing: readonly string[] };
export type FamilyBuildResult = { ok: true; expr: MathExpr; exprId: string } | FamilyBuildError;

/** buildFamilyInvariant — profile completeness fires FIRST (a defaulted zero silently
 *  passes additive families — the historical bug class this gate kills). */
export function buildFamilyInvariant(
  familyId: DerailmentFamilyId,
  profile: FamilyProfile,
): FamilyBuildResult {
  const missing = REQUIRED_PROFILE_FIELDS[familyId].filter((f) => profile[f] === undefined);
  if (missing.length > 0) return { ok: false, code: 'PROFILE_INCOMPLETE', familyId, missing };
  const expr = FAMILY_BUILDERS[familyId](profile);
  return { ok: true, expr, exprId: contentId(canonicalJson(expr)).slice(0, 12) };
}

/** The canonical founding case, generalized for tests and the demo (KB-01:311-382). */
export function foundingCaseContract(): { total: MathExpr; oracleValue: number } {
  // f(T) = N × (1 + P); N=8, P=2 ⇒ 24. If |all_setups| ≠ 24 → ABORT.
  return {
    total: mul(ref('N'), add(lit(1), ref('P'))),
    oracleValue: 24,
  };
}

// Convenience re-exports for spec authors (used by tests + demo fixtures).
export { add, and, card, eq, foldAdd, foldAnd, ge, gt, le, lit, lt, member, mul, ref, subset };
