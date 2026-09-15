import { divergence_le, type FireVerdict } from "./oracles";
import { DIVERGENCE_MAX, divergenceOf } from "../machines/types";
import { ComputationError, needFiniteNumber } from "./errors";

export interface DivergenceReport {
  value: number;
  verdict: FireVerdict;
  flagged: boolean;
  bound: number;
}

function needChain(oracle: string, field: string, value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ComputationError(oracle, field, `expected string array, got ${String(value)}`);
  }
  for (const el of value) {
    if (typeof el !== "string") {
      throw new ComputationError(oracle, field, `expected string array, got element ${String(el)}`);
    }
  }
  return value as readonly string[];
}

export function computeDivergence(chain: unknown, macro: unknown): number {
  return divergenceOf(needChain("computeDivergence", "chain", chain), needChain("computeDivergence", "macro", macro));
}

export function reportDivergence(value: unknown): DivergenceReport {
  const v = needFiniteNumber("reportDivergence", "value", value);
  if (v < 0 || v > 1) {
    throw new ComputationError("reportDivergence", "value", `expected divergence in [0,1], got ${String(value)}`);
  }
  const verdict = divergence_le({ value: v, bound: DIVERGENCE_MAX });
  return { value: v, verdict, flagged: verdict === "FIRE", bound: DIVERGENCE_MAX };
}

export function divergencePairVsMacro(chain: unknown, macro: unknown): DivergenceReport {
  return reportDivergence(computeDivergence(chain, macro));
}
