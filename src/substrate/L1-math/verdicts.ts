// src/math/verdicts.ts — the branded verdict lattice (spec §4.2.7)
// toBrandedVerdict is the ONLY producer (sttgf-verdict.ts:158 lineage).
// DM-L9: no store row may represent a verdict not produced here.

export type BrandedVerdict =
  | 'VALID' // evaluated === oracle; or all contract exprs true
  | 'THEATRICAL_LIE' // claim contradicted by the verbatim record (quote-mismatch)
  | 'CONTRADICTED' // evaluated !== oracle (GARBAGE IN → CONTRADICTED. NO EXCUSES.)
  | 'UNVERIFIED' // evidence present but evaluation failed (typed EvalErr)
  | 'UNVERIFIABLE'; // no measurable bindings — never guess

/** The sole sanctioned inputs to a brand decision. */
export type DischargeBasis =
  | { basis: 'EVALUATED_EQUAL'; oracleId?: string; observed?: unknown }
  | { basis: 'EVALUATED_DIFFERENT'; oracleId?: string; observed?: unknown; expected?: unknown; reason?: string }
  | { basis: 'QUOTE_MISMATCH'; reason: string }
  | { basis: 'EVAL_ERROR'; code: string }
  | { basis: 'UNMEASURABLE'; reason: string };

export interface BrandedResult {
  readonly brand: BrandedVerdict;
  readonly basis: DischargeBasis;
  readonly reason?: string;
}

/** THE ONLY brand producer. A BrandedVerdict cannot be hand-assembled from outside. */
export function toBrandedVerdict(basis: DischargeBasis): BrandedResult {
  switch (basis.basis) {
    case 'EVALUATED_EQUAL':
      return { brand: 'VALID', basis };
    case 'EVALUATED_DIFFERENT':
      return { brand: 'CONTRADICTED', basis };
    case 'QUOTE_MISMATCH':
      return { brand: 'THEATRICAL_LIE', basis, reason: basis.reason };
    case 'EVAL_ERROR':
      return { brand: 'UNVERIFIED', basis, reason: basis.code };
    case 'UNMEASURABLE':
      return { brand: 'UNVERIFIABLE', basis, reason: basis.reason };
  }
}

/** A decided verdict is one a gate may act on (VALID or CONTRADICTED). */
export function isDecided(v: BrandedResult): boolean {
  return v.brand === 'VALID' || v.brand === 'CONTRADICTED';
}
