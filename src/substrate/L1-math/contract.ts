// src/math/contract.ts — MathContract + the 4 semantic roles (spec §4.2.4)
// The REJECT/THROW/DIE/ESCALATE ladder (KB-03:1029-1033): structural, not stylistic.

import type { MathExpr } from './expr';
import type { ProvenanceAnchor } from './anchor';
import type { Bindings } from './expr';
import { evalExprStrict, type Checked, type EvalContext, ctx as mkCtx } from './eval';
import { toBrandedVerdict, type BrandedResult } from './verdicts';
import { canonicalJson, contentId } from './serialize';

export interface MathContract {
  readonly id: string; // content-addressed (DM-L2) — computed by contractId()
  readonly preconditions: readonly MathExpr[]; // role: REJECT — fail ⇒ refuse the input
  readonly postconditions: readonly MathExpr[]; // role: THROW — fail ⇒ named hard error
  readonly invariants: readonly MathExpr[]; // role: DIE — fail ⇒ halt the machine
  readonly temporal?: readonly MathExpr[]; // role: ESCALATE — route to sentinel, never point-eval
  readonly provenance: readonly ProvenanceAnchor[]; // D13: every expr traces to spec text
}

export type ContractRole = 'REJECT' | 'THROW' | 'DIE' | 'ESCALATE';
export type ContractStage = 'input' | 'output' | 'runtime' | 'history';

export const ROLE_FOR_STAGE: Readonly<Record<ContractStage, ContractRole>> = {
  input: 'REJECT',
  output: 'THROW',
  runtime: 'DIE',
  history: 'ESCALATE',
};

/** Content-addressed contract id — sha256 of the canonical expr serialization. */
export function contractId(c: Omit<MathContract, 'id'>): string {
  return contentId(
    canonicalJson(c.preconditions),
    canonicalJson(c.postconditions),
    canonicalJson(c.invariants),
    canonicalJson(c.temporal ?? []),
  ).slice(0, 24);
}

export interface ContractCheckResult {
  readonly contractId: string;
  readonly stage: ContractStage;
  readonly role: ContractRole;
  readonly verdict: BrandedResult;
  readonly perExpr: readonly { exprId: string; role: ContractRole; checked: Checked }[];
  readonly firstFailure: { exprId: string; role: ContractRole; checked: Checked } | null;
}

/**
 * checkContract — evaluates the role's exprs for the stage (sttgf-contract.ts:819 lineage).
 * The role semantics map evaluation results to the ladder:
 *   any non-ok evaluation on the role's exprs ⇒ UNVERIFIED/UNVERIFIABLE (typed)
 *   any false ⇒ the role's action is recorded; the verdict is CONTRADICTED
 *   all true ⇒ VALID
 * Temporal exprs throw TemporalEscalationError through evalExprStrict — callers
 * route to the ESCALATE consumer (§4.2.6).
 */
export function checkContract(
  contract: MathContract,
  stage: ContractStage,
  bindings: Bindings,
  evalCtx: EvalContext = mkCtx(bindings.values, bindings.profile),
): ContractCheckResult {
  const role = ROLE_FOR_STAGE[stage];
  const exprs: readonly MathExpr[] =
    role === 'REJECT' ? contract.preconditions
    : role === 'THROW' ? contract.postconditions
    : role === 'DIE' ? contract.invariants
    : (contract.temporal ?? []);
  const perExpr: { exprId: string; role: ContractRole; checked: Checked }[] = [];
  let firstFailure: ContractCheckResult['firstFailure'] = null;
  let anyEvalErr: Checked | null = null;
  for (const e of exprs) {
    const checked = evalExprStrict(e, evalCtx);
    const exprId = contentId(canonicalJson(e)).slice(0, 12);
    perExpr.push({ exprId, role, checked });
    if (!checked.ok && anyEvalErr === null) anyEvalErr = checked;
    if (checked.ok && checked.value === false && firstFailure === null) {
      firstFailure = { exprId, role, checked };
    }
  }
  if (firstFailure !== null) {
    return { contractId: contract.id, stage, role, verdict: toBrandedVerdict({ basis: 'EVALUATED_DIFFERENT' }), perExpr, firstFailure };
  }
  if (anyEvalErr !== null && !anyEvalErr.ok) {
    const brand =
      anyEvalErr.code === 'UNBOUND_SYMBOL' || anyEvalErr.code === 'DOMAIN_UNBOUNDED'
        ? toBrandedVerdict({ basis: 'UNMEASURABLE', reason: anyEvalErr.code })
        : toBrandedVerdict({ basis: 'EVAL_ERROR', code: anyEvalErr.code });
    return { contractId: contract.id, stage, role, verdict: brand, perExpr, firstFailure: null };
  }
  if (exprs.length === 0)
    return { contractId: contract.id, stage, role, verdict: toBrandedVerdict({ basis: 'UNMEASURABLE', reason: `no exprs for role ${role}` }), perExpr, firstFailure: null };
  return { contractId: contract.id, stage, role, verdict: toBrandedVerdict({ basis: 'EVALUATED_EQUAL' }), perExpr, firstFailure: null };
}
