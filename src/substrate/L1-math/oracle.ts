// src/math/oracle.ts — the oracle registry (spec §4.2.5)
// "the firewall does not read the agent's reasoning — it evaluates the agent's
//  number against the oracle" (KB-01:313). Integer equality, zero false positives.

import type { ProvenanceAnchor } from './anchor';
import { toBrandedVerdict, type BrandedResult } from './verdicts';
import { canonicalJson, contentId, scalarKey } from './serialize';

export interface OracleDeclaration {
  readonly exprId: string; // canonical serialization id of the MathExpr
  readonly oracleValue: number | boolean | readonly (string | number)[];
  readonly anchor: ProvenanceAnchor; // the bible-Q&A-sourced value (Hydra :209-211)
  readonly unit?: string; // 'setups' | 'pips' | 'count' ...
  /** REQUIRED for non-integer floats — a hidden tolerance is banned (registered epsilon only) */
  readonly epsilon?: number;
}

export interface OracleEntryInternal {
  readonly decl: OracleDeclaration;
  readonly registeredIdx: number; // registration ORDER (append-only); never wall time
}

export class OracleConflictError extends Error {
  readonly code = 'ORACLE_CONFLICT';
  constructor(public readonly exprId: string) {
    super(`ORACLE_CONFLICT: oracle already registered for ${exprId} — first registration wins, re-register is loud`);
  }
}
export class OracleEpsilonError extends Error {
  readonly code = 'ORACLE_FLOAT_REQUIRES_EPSILON';
  constructor(public readonly exprId: string) {
    super(`ORACLE_FLOAT_REQUIRES_EPSILON: ${exprId} is a non-integer float oracle without a registered epsilon — hidden tolerances are banned`);
  }
}

export class OracleRegistry {
  private readonly entries = new Map<string, OracleEntryInternal>();
  private nextIdx = 0;

  register(decl: OracleDeclaration): void {
    const existing = this.entries.get(decl.exprId);
    if (existing !== undefined) throw new OracleConflictError(decl.exprId);
    if (
      typeof decl.oracleValue === 'number' &&
      !Number.isInteger(decl.oracleValue) &&
      decl.epsilon === undefined
    ) {
      throw new OracleEpsilonError(decl.exprId);
    }
    this.entries.set(decl.exprId, { decl, registeredIdx: this.nextIdx++ });
  }

  get(exprId: string): OracleDeclaration | undefined {
    return this.entries.get(exprId)?.decl;
  }

  size(): number {
    return this.entries.size;
  }

  /** sha256 over sorted (exprId, value) pairs — registration-order independent (K21.2). */
  contentHash(): string {
    const rows = [...this.entries.values()]
      .map((e) => [e.decl.exprId, scalarKey(e.decl.oracleValue), String(e.decl.epsilon ?? '')] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return contentId(...rows.map((r) => r.join('|')));
  }

  /**
   * The discharge: the ONLY comparison is integer/boolean/set equality (zero false
   * positives by construction); floats compare ONLY against the REGISTERED epsilon;
   * type mismatch is CONTRADICTED ("GARBAGE IN → CONTRADICTED. NO EXCUSES.");
   * a missing oracle is UNVERIFIABLE (honest, never a guess).
   */
  discharge(exprId: string, observed: number | boolean | readonly (string | number)[]): BrandedResult {
    const entry = this.get(exprId);
    if (entry === undefined)
      return toBrandedVerdict({ basis: 'UNMEASURABLE', reason: `no oracle registered for ${exprId}` });
    const expected = entry.oracleValue;
    if (typeof expected === 'number' && typeof observed === 'number') {
      // GARBAGE IN → CONTRADICTED. NO EXCUSES. NaN/Infinity against ANY oracle is
      // garbage (a non-finite value is never a valid measurement) — the float
      // epsilon path is for finite floats only (BUG-1 fix).
      if (!Number.isFinite(observed))
        return toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT', oracleId: exprId, observed, expected, reason: 'non-finite observed' });
      if (Number.isInteger(expected) && Number.isInteger(observed)) {
        return observed === expected
          ? toBrandedVerdict({ basis: 'EVALUATED_EQUAL', oracleId: exprId, observed })
          : toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT', oracleId: exprId, observed, expected });
      }
      const eps = entry.epsilon;
      if (eps === undefined)
        return toBrandedVerdict({ basis: 'UNMEASURABLE', reason: `float oracle without epsilon: ${exprId}` });
      return Math.abs(observed - expected) <= eps
        ? toBrandedVerdict({ basis: 'EVALUATED_EQUAL', oracleId: exprId, observed })
        : toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT', oracleId: exprId, observed, expected });
    }
    if (typeof expected === 'boolean' && typeof observed === 'boolean') {
      return observed === expected
        ? toBrandedVerdict({ basis: 'EVALUATED_EQUAL', oracleId: exprId, observed })
        : toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT', oracleId: exprId, observed, expected });
    }
    if (Array.isArray(expected) && Array.isArray(observed)) {
      const a = [...expected].sort();
      const b = [...observed].sort();
      const equal = a.length === b.length && a.every((x, i) => x === b[i]);
      return equal
        ? toBrandedVerdict({ basis: 'EVALUATED_EQUAL', oracleId: exprId, observed })
        : toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT', oracleId: exprId, observed, expected });
    }
    return toBrandedVerdict({
      basis: 'EVALUATED_DIFFERENT',
      oracleId: exprId,
      observed,
      reason: 'oracle type mismatch',
    });
  }
}
