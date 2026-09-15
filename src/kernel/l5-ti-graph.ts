// src/kernel/l5-ti-graph.ts — B.W5-L5 WARHEAD CONFLUENCE (spec B.W5.1 L5).
// Pure function: TiInput -> TiVerdict. Nodes are the operator's laws as typed warheads ("3 pips
// outside the back edge OR 1-2 pips inside the next rung" — LAW-7; LAW-10/LAW-12/LAW-14 + the
// ratified RRR floor carried as input; full verbatim quotes with source anchors below);
// edges are REQUIRES/SUPPORTS/CONTRADICTS relations. Grading is macro-level
// confluence — a REQUIRES conjunction plus the RRR oracle — never binary math on
// geometry. Emits law IDs, integer scores and checklist rows only.
// DOCTRINE (D13 verbatim quotes; each quote carries its on-disk source anchor):
// - LAW-7 (ladder steps SL): "3 pips outside the back edge OR 1-2 pips inside
//   the next rung" (MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md:1338).
// - LAW-10 (ATR floor): "SL never tighter than 0.5 × ATR(14)"
//   (MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md:1339).
// - LAW-12 (TP timeframe): "TP timeframe ≥ entry timeframe"
//   (MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md:1340).
// - LAW-14 (RRR): "RRR ≥ 2.5 (floor) / 4R+ (target)"
//   (MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md:1341).
// - RRR floor (D-R1/B10): "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE"
//   (MASTER_CONTEXT/PLUTUS_V5_FULL_BUILD_SPEC.md:2006).

import { rrr_floor } from "../../specs/mpse/oracle-registry";

export type TiEdge = "REQUIRES" | "SUPPORTS" | "CONTRADICTS";

export interface TiLawNode {
  lawId: string;
  edge: TiEdge;
  satisfied: boolean;
  weight: number;
  quote: string;
}

export interface TiCheckItem {
  item: string;
  evidence: string;
}

export interface TiInput {
  laws: TiLawNode[];
  rrr: number;
  rrrFloor: number;
}

export interface TiCheckRow {
  item: string;
  checked: boolean;
  evidence: string;
}

export interface TiVerdict {
  score: number;
  supportingLawIds: string[];
  contradictingLawIds: string[];
  requiredLawIds: string[];
  entryChecklist: TiCheckRow[];
  tradeValid: boolean;
}

export class TiInputError extends Error {
  readonly code = "TI_INVALID_INPUT";
  readonly field: string;
  constructor(field: string, detail: string) {
    super(`[l5-ti-graph:TI_INVALID_INPUT] malformed input — field '${field}': ${detail}`);
    this.name = "TiInputError";
    this.field = field;
  }
}

// NOTE(ISE): the guards below are mechanical input-shape detectors (fail-closed
// malformed rejection), never the decision layer — the verdict is a pure
// REQUIRES-conjunction + oracle discharge with zero numeric thresholds.
export function computeConfluence(input: TiInput, checklist: TiCheckItem[]): TiVerdict {
  if (typeof input !== "object" || input === null) throw new TiInputError("input", "expected object");
  if (!Array.isArray(input.laws) || input.laws.length === 0) {
    throw new TiInputError("laws", "expected non-empty warhead law array");
  }
  if (!Array.isArray(checklist)) throw new TiInputError("checklist", "expected array");
  if (typeof input.rrr !== "number" || !Number.isFinite(input.rrr)) {
    throw new TiInputError("rrr", `expected finite number, got ${String(input.rrr)}`);
  }
  if (typeof input.rrrFloor !== "number" || !Number.isFinite(input.rrrFloor) || input.rrrFloor <= 0) {
    throw new TiInputError("rrrFloor", `expected positive floor, got ${String(input.rrrFloor)}`);
  }
  for (const law of input.laws) {
    if (typeof law !== "object" || law === null) throw new TiInputError("laws[]", "expected object");
    if (typeof law.lawId !== "string" || law.lawId.length === 0) {
      throw new TiInputError("laws[].lawId", "expected non-empty string");
    }
    if (law.edge !== "REQUIRES" && law.edge !== "SUPPORTS" && law.edge !== "CONTRADICTS") {
      throw new TiInputError("laws[].edge", `expected REQUIRES|SUPPORTS|CONTRADICTS, got ${String(law.edge)}`);
    }
    if (typeof law.satisfied !== "boolean") throw new TiInputError("laws[].satisfied", "expected boolean");
    if (typeof law.weight !== "number" || !Number.isFinite(law.weight) || law.weight < 0) {
      throw new TiInputError("laws[].weight", "expected non-negative finite weight");
    }
    if (typeof law.quote !== "string" || law.quote.length === 0) {
      throw new TiInputError("laws[].quote", "expected non-empty doctrine quote (D13)");
    }
  }
  for (const row of checklist) {
    if (typeof row !== "object" || row === null) throw new TiInputError("checklist[]", "expected object");
    if (typeof row.item !== "string" || row.item.length === 0) {
      throw new TiInputError("checklist[].item", "expected non-empty string");
    }
    if (typeof row.evidence !== "string") throw new TiInputError("checklist[].evidence", "expected string");
  }

  const rrrGate = rrr_floor({ rrr: input.rrr, floor: input.rrrFloor });

  let score = 0;
  const supportingLawIds: string[] = [];
  const contradictingLawIds: string[] = [];
  const requiredLawIds: string[] = [];
  let requiredViolated = false;

  for (const law of input.laws) {
    if (law.edge === "REQUIRES") {
      requiredLawIds.push(law.lawId);
      if (!law.satisfied) requiredViolated = true;
      else score += law.weight;
    } else if (law.edge === "SUPPORTS") {
      if (law.satisfied) {
        supportingLawIds.push(law.lawId);
        score += law.weight;
      }
    } else {
      if (law.satisfied) contradictingLawIds.push(law.lawId);
    }
  }
  if (rrrGate === "FIRE") contradictingLawIds.push("LAW-14-RRR-FLOOR");

  const entryChecklist: TiCheckRow[] = checklist.map((row) => ({
    item: row.item,
    checked: row.evidence.length > 0,
    evidence: row.evidence,
  }));
  const checklistOpen = entryChecklist.some((row) => !row.checked);

  return {
    score,
    supportingLawIds,
    contradictingLawIds,
    requiredLawIds,
    entryChecklist,
    tradeValid: !requiredViolated && contradictingLawIds.length === 0 && !checklistOpen,
  };
}
