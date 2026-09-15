// src/machines/claim-gate.ts — block the CLAIM, not the WORK (spec §6.3.2/6.4)
// A fresh claim ARMS the gate (the Phase-B demand rides the next tool result);
// work tools NEVER block; the container-test escape hatch CLEARS.

import type { EvidenceTriad, WarheadEvent } from '..';
import { boundedSlice } from '..';

export interface ClaimGateState {
  readonly sessionId: string;
  armed: boolean;
  demands: ClaimDemand[];
  strikes: number;
}

export interface ClaimDemand {
  readonly claimExcerpt: string; // ≤200 chars (the byte budget)
  readonly triad: EvidenceTriad;
  readonly atSeq: number;
  readonly expiresAtSeq: number; // the TTL — consume-once discipline
}

export const CLAIM_GATE_TTL_SEQ = 8; // the demand rides the next few results, then expires
export const CLAIM_GATE_ESCALATION_AT = 3;

export class ClaimGate {
  private readonly states = new Map<string, ClaimGateState>();

  private state(sessionId: string): ClaimGateState {
    let s = this.states.get(sessionId);
    if (s === undefined) {
      s = { sessionId, armed: false, demands: [], strikes: 0 };
      this.states.set(sessionId, s);
    }
    return s;
  }

  /** onAgentClaim — arms the gate; the CLAIM is gated, the WORK continues. */
  onAgentClaim(sessionId: string, claimText: string, triad: EvidenceTriad, atSeq: number): void {
    const s = this.state(sessionId);
    s.armed = true;
    const demand: ClaimDemand = {
      claimExcerpt: boundedSlice(claimText, 200),
      triad,
      atSeq,
      expiresAtSeq: atSeq + CLAIM_GATE_TTL_SEQ,
    };
    s.demands = [...s.demands, demand];
  }

  /** onToolBefore — work tools NEVER blocked here (the gate gates CLAIMS only). */
  onToolBefore(_tool: string, _args: unknown): { blocked: boolean } {
    return { blocked: false }; // the WORK always proceeds — LAW: block the claim, not the work
  }

  /** pendingDemand — the fresh demand for the Phase-B splice (consume-once). */
  pendingDemand(sessionId: string, currentSeq: number): ClaimDemand | null {
    const s = this.states.get(sessionId);
    if (s === undefined) return null;
    const fresh = s.demands.filter((d) => d.expiresAtSeq > currentSeq);
    s.demands = fresh;
    return fresh[0] ?? null;
  }

  /** consumeDemand — the splice delivery marks it consumed (exactly once). */
  consumeDemand(sessionId: string, atSeq: number): void {
    const s = this.states.get(sessionId);
    if (s === undefined) return;
    const rest = s.demands.filter((d) => d.atSeq !== atSeq);
    if (rest.length === 0 && s.demands.length > 0) s.armed = false;
    s.demands = rest;
    if (rest.length === 0) s.armed = false;
  }

  /** clear — the container-test escape hatch (the deadlock break). */
  clear(sessionId: string): void {
    const s = this.states.get(sessionId);
    if (s !== undefined) {
      s.armed = false;
      s.demands = [];
      s.strikes = 0;
    }
  }

  /** strike — an ignored demand counts; at 3 the ESCALATE fires. */
  strike(sessionId: string): number {
    const s = this.state(sessionId);
    s.strikes += 1;
    return s.strikes;
  }

  shouldEscalate(sessionId: string): boolean {
    return this.state(sessionId).strikes >= CLAIM_GATE_ESCALATION_AT;
  }

  armed(sessionId: string): boolean {
    return this.states.get(sessionId)?.armed ?? false;
  }
}

/** The Phase-B splice: the demand rides the tool result as the NEWEST instruction. */
export function spliceDemand(toolResult: string, demand: ClaimDemand): string {
  return `${toolResult}\n\n[P-GATE] You may CLAIM correctness only with container-test evidence. Claim under gate: "${demand.claimExcerpt}" — run the container suite (the escape hatch) or withdraw the claim.`;
}

/** The chat.message hook adapter: assistant-claims only (user words NEVER gate). */
export function claimEventFromChat(sessionId: string, role: string, text: string, seq: number, triad: EvidenceTriad): WarheadEvent | null {
  if (role !== 'assistant') return null;
  return {
    type: 'CLAIM_CANDIDATE',
    sessionId,
    agentOrigin: true,
    payload: { text: boundedSlice(text, 2000), triad },
    receivedAtSeq: seq,
  };
}
