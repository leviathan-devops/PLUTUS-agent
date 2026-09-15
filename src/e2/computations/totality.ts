import { totality_forall, type FloorVerdict } from "../../../specs/mpse/oracle-registry";
import type { Designation } from "../types";
import { ComputationError, needPositiveInt } from "./errors";

export interface DesignationPairCheck {
  verdict: FloorVerdict;
  reason: string;
}

export interface TotalityAudit {
  verdict: FloorVerdict;
  groups: number;
  ids: number;
  expectedIds: number;
  reasons: string[];
}

const DESIGNATION_FIELDS = ["day", "pair", "direction", "supplyZoneId", "demandZoneId", "keyZoneType", "deepDemandZoneId"] as const;

function needDesignation(oracle: string, value: unknown): Designation {
  if (typeof value !== "object" || value === null) {
    throw new ComputationError(oracle, "designation", `expected object, got ${String(value)}`);
  }
  const rec = value as Record<string, unknown>;
  for (const field of DESIGNATION_FIELDS) {
    if (typeof rec[field] !== "string" || (rec[field] as string).length === 0) {
      throw new ComputationError(oracle, field, `expected non-empty string, got ${String(rec[field])}`);
    }
  }
  return value as Designation;
}

export function expandTotality(days: unknown, pairs: unknown, directions: unknown): number {
  const d = needPositiveInt("expandTotality", "days", days);
  const p = needPositiveInt("expandTotality", "pairs", pairs);
  const r = needPositiveInt("expandTotality", "directions", directions);
  return d * p * r;
}

export function checkDesignationPair(designation: unknown): DesignationPairCheck {
  const d = needDesignation("checkDesignationPair", designation);
  if (d.supplyZoneId === d.demandZoneId) {
    return { verdict: "CONTRADICTED", reason: `supplyZoneId === demandZoneId (${d.supplyZoneId})` };
  }
  return { verdict: "VALID", reason: "demand-side + supply-side present and distinct" };
}

export function dischargeTotality(designationCount: unknown, days: unknown, pairs: unknown, directions: unknown): FloorVerdict {
  return totality_forall({ designationCount, days, pairs, directions });
}

export function auditTotality(designations: unknown, days: unknown, pairs: unknown, directions: unknown): TotalityAudit {
  if (!Array.isArray(designations)) {
    throw new ComputationError("auditTotality", "designations", `expected array, got ${String(designations)}`);
  }
  const groups = expandTotality(days, pairs, directions);
  const reasons: string[] = [];
  let ids = 0;
  for (let i = 0; i < designations.length; i++) {
    const check = checkDesignationPair(designations[i]);
    if (check.verdict !== "VALID") reasons.push(`row ${i}: ${check.reason}`);
    else ids += 2;
  }
  const expectedIds = groups * 2;
  if (ids !== expectedIds) reasons.push(`id total ${ids} !== expected ${expectedIds}`);
  const countVerdict = totality_forall({ actual: ids, expected: expectedIds });
  const verdict = reasons.length === 0 && countVerdict === "VALID" ? "VALID" : "CONTRADICTED";
  return { verdict, groups, ids, expectedIds, reasons };
}
