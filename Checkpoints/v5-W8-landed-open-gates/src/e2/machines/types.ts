// src/e2/machines/types.ts — the E2 shared contracts.
// Authority: PLUTUS_V5_FULL_BUILD_SPEC.md B.W3 (lines 944-1024),
// S-1-cascade-law.md (B-1..B-6), S-2-designation-totality.md (B-1..B-5).

import type { EvidenceTriad, WarheadEvent } from "../../substrate/L3-lasme/index";

export type { EvidenceTriad, WarheadEvent };

export const DIVERGENCE_MAX = 0.35; // S-1 B-3: flag-only threshold
export const ZFP_SS_BS_MIN = 0.45; // B.W3.1: SS->BS requires zfp > 0.45
export const ZFP_BS_R_LO = 0.20; // B.W3.1: BS->R requires zfp in [0.20, 0.40]
export const ZFP_BS_R_HI = 0.40;

export type PairKey = "DXY" | "EUR/USD" | "GBP/USD";
export type Direction = "LONG" | "SHORT";
export type TouchKind = "SWEEP" | "WICK_REJECT" | "BODY_DEFEND" | "CONSOL_DWELL" | "PASS_THROUGH";
export type CascadeStage = "dxy-e2" | "eu-e2-cascade" | "eu-e2-core" | "gu-e2";

/** Named machine error — the code IS the grep-able contract (spec D.3). */
export function violation(code: string, message: string, detail?: Record<string, unknown>): Error {
  const e = new Error(`[${code}] ${message}`) as Error & { code: string; detail?: Record<string, unknown> };
  e.code = code;
  if (detail !== undefined) e.detail = detail;
  return e;
}

/** Build the WarheadEvent the L3 step() core requires (triad = I2 fuel). */
let seq = 0;
export function ev(
  type: string,
  payload: Record<string, unknown>,
  machineId: string,
  from: string,
  to: string,
  memberId: string,
  file: string,
  line: number,
): WarheadEvent {
  const triad: EvidenceTriad = {
    pattern: { memberId, familySeverity: "MEDIUM" },
    state: { machineId, from, to },
    evidence: { file, line },
  };
  seq += 1;
  return { type, sessionId: "e2", agentOrigin: true, payload: { ...payload, triad }, receivedAtSeq: seq };
}

/** chainsContradict evidence — S-1 B-3: FLAG ONLY, never silent-drop, never auto-reject. */
export function chainsContradictTriad(
  machineId: string,
  from: string,
  to: string,
  pair: PairKey,
  macro: string,
  divergence: number,
  file: string,
  line: number,
): EvidenceTriad {
  return {
    pattern: { memberId: "macro-authority:chainsContradict", familySeverity: "HIGH" },
    state: { machineId, from, to },
    evidence: { file, line, graphNodeId: `chainsContradict:${pair}:macro=${macro}:div=${divergence}` },
  };
}

/** The D50 side-match rule (S-1 B-1): LONG -> demand ONLY, SHORT -> supply ONLY. */
export function sideMatchId(direction: Direction, emission: { demandZoneId: string; supplyZoneId: string }): string {
  return direction === "LONG" ? emission.demandZoneId : emission.supplyZoneId;
}

/** Divergence in [0,1], computed from data — count of mismatched shape slots / total slots. */
export function divergenceOf(chain: readonly string[], macro: readonly string[]): number {
  if (chain.length === 0 || macro.length === 0) throw violation("DIVERGENCE_EMPTY_INPUT", "divergence requires non-empty chains");
  const n = Math.min(chain.length, macro.length);
  let mism = 0;
  for (let i = 0; i < n; i++) if (chain[i] !== macro[i]) mism += 1;
  return mism / n;
}
