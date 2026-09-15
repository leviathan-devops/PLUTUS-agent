// src/machines/mpse-discharge.ts — the runtime discharge (spec §4.2.6)
// extractBindings(evidence) → evaluate against the registered contract → the
// branded verdict. checkContract is the provenance (sttgf-contract.ts:819);
// toBrandedVerdict the ONLY brand producer (sttgf-verdict.ts:158).

import {
  checkContract, ctx as mkCtx, evalExpr, OracleRegistry, TemporalEscalationError,
  toBrandedVerdict, type Bindings, type BrandedResult, type ContractCheckResult,
  type EvalErr, type MathContract, type ScalarValue,
} from '../../L1-math';

export interface EvidenceSnapshot {
  readonly scope: string;
  readonly values: Readonly<Record<string, ScalarValue>>;
  /** domain proofs: symbol → satisfied (a value without its proof is OMITTED) */
  readonly domainProofs: Readonly<Record<string, boolean>>;
  readonly profile: string;
}

/**
 * extractBindings — reads measured values; a value whose domain proof FAILED is
 * OMITTED (never coerced) — dependent exprs then return UNBOUND_SYMBOL which
 * discharges UNVERIFIABLE. The brand law (KB-02:48) made mechanical.
 */
export function extractBindings(snap: EvidenceSnapshot): Bindings {
  const values: Record<string, ScalarValue> = {};
  for (const [k, v] of Object.entries(snap.values)) {
    const proofOk = snap.domainProofs[k] ?? false;
    if (proofOk) values[k] = v; // else: omitted — the dependent expressions go UNVERIFIABLE
  }
  return { profile: snap.profile, values };
}

export type DischargeOutcome =
  | { kind: 'DISCHARGED'; result: ContractCheckResult }
  | { kind: 'ESCALATED'; reason: string }; // temporal — routed to the sentinel

/** Runtime discharge with the ESCALATE routing (temporal never point-evaluates). */
export function dischargeAtRuntime(
  contract: MathContract,
  stage: 'input' | 'output' | 'runtime' | 'history',
  snap: EvidenceSnapshot,
  oracle: OracleRegistry,
  oracleId?: string,
): DischargeOutcome {
  const bindings = extractBindings(snap);
  try {
    const check = checkContract(contract, stage, bindings, mkCtx(bindings.values, bindings.profile));
    if (check.verdict.brand === 'VALID' && oracleId !== undefined) {
      // the deciding oracle: the evaluated value must ALSO match the oracle (integer equality)
      const expr = stage === 'output' ? contract.postconditions[0] : contract.invariants[0];
      if (expr !== undefined) {
        const ev = evalExpr(expr, mkCtx(bindings.values, bindings.profile));
        if (ev.ok && typeof ev.value === 'number') {
          return { kind: 'DISCHARGED', result: { ...check, verdict: oracle.discharge(oracleId, ev.value) } };
        }
      }
    }
    return { kind: 'DISCHARGED', result: check };
  } catch (e) {
    if (e instanceof TemporalEscalationError) {
      return { kind: 'ESCALATED', reason: e.message };
    }
    throw e; // non-temporal throws are BUGS — loud, never swallowed
  }
}

/** The Self-Verifier consumer shape (Hydra :1180-1195): oracle mismatch = CRITICAL. */
export function toSelfVerifierFinding(outcome: DischargeOutcome): {
  rule: string; severity: 'CRITICAL' | 'INFO'; brand: string; detail: string;
} {
  if (outcome.kind === 'ESCALATED') {
    return { rule: 'mpse-temporal-escalation', severity: 'INFO', brand: 'ESCALATE', detail: outcome.reason };
  }
  const brand = outcome.result.verdict.brand;
  return {
    rule: brand === 'VALID' ? 'mpse-oracle-verified' : 'mpse-oracle-mismatch',
    severity: brand === 'VALID' ? 'INFO' : 'CRITICAL',
    brand,
    detail: brand === 'CONTRADICTED'
      ? `GARBAGE IN → CONTRADICTED (${outcome.result.firstFailure?.exprId ?? 'expr'})`
      : String(outcome.result.verdict.reason ?? 'verified'),
  };
}

export { toBrandedVerdict };
