// src/bindings/opencode/hooks.ts — the 5-hook OpenCode binding (spec §5.3.1)
// The substrate-owned surface: identity-guard → throw-arms → escape-hatch →
// escalation (tool.before); record + Phase-B splice + LSP injection (tool.after);
// the consume-on-read delivery (messages.transform); the STATIC mandates ONLY
// (system.transform — the cache law, byte-identical across invocations).

import type { ChatMessageInput, ToolBeforeInput, ToolAfterInput, MessagesTransformInput, MessagesTransformResult, ToolAfterResult, ToolBeforeResult } from '../contract';
import type { LasmeEngine } from '../../L3-lasme';
import type { ClaimGate } from '../../L3-lasme/machines';
import { spliceDemand, claimEventFromChat } from '../../L3-lasme/machines';
import { classifyCtExec } from '../../L3-lasme/machines';
import type { DiagnosticsServer } from '../../L6-graph';
import { extractTouchedFile } from '../../L6-graph';
import { boundedSlice } from '../../L3-lasme';

export const PARAGON_STATIC_MARKER = '[PARAGON-STATIC-v1]';
const STATIC_MANDATES = [
  PARAGON_STATIC_MARKER,
  '[PARAGON] The substrate enforces: every claim needs its evidence; every',
  '[PARAGON] finding carries {Pattern, State, Evidence}; INCONCLUSIVE never',
  '[PARAGON] advances; container evidence is the only claim currency; the',
  '[PARAGON] LSP block on touched files is load-bearing — read it, do not',
  '[PARAGON] skim it. Escape hatches: read/grep/evidence tools/container-test.',
].join('\n');

export interface HookDeps {
  readonly engine: LasmeEngine;
  readonly claimGate: ClaimGate;
  readonly lsp: DiagnosticsServer | null;
  readonly substratePaths: readonly string[];
  readonly escapeHatchTools: readonly string[];
  readonly registeredAgents: readonly string[];
}

export class OpenCodeHooks {
  constructor(private readonly deps: HookDeps) {}

  private seq = 0;
  private nextSeq(sessionId: string): number {
    return this.deps.engine.nextSeq(sessionId) + (this.seq += 1);
  }

  /** HOOK 1 — chat.message: assistant-claim detection (AGENT-ORIGIN ONLY). */
  onChatMessage(e: ChatMessageInput): void {
    if (e.role !== 'assistant') return; // user words NEVER gate
    if (!this.deps.registeredAgents.includes(e.agent)) return; // identity guard
    const triad = {
      pattern: { memberId: 'chat.claim-scan', familySeverity: 'HIGH' as const },
      state: { machineId: 'claim-gate', from: 'IDLE', to: 'ARMED' },
      evidence: { file: '(chat)', line: this.nextSeq(e.sessionId) },
    };
    // the detector FLAGs claim-shaped text; the machine decides (Law 4)
    const flags = this.deps.engine.scan(e.text, { file: '(chat)', line: triad.evidence.line });
    if (flags.length > 0 || /\b(verified|passing|green|works|complete)\b/i.test(e.text)) {
      const ev = claimEventFromChat(e.sessionId, e.role, e.text, this.nextSeq(e.sessionId), triad);
      if (ev !== null) {
        this.deps.claimGate.onAgentClaim(e.sessionId, boundedSlice(e.text, 200), triad, ev.receivedAtSeq);
        this.deps.engine.ingestEvent(ev);
      }
    }
  }

  /** HOOK 2 — tool.execute.before: identity → config-lock arms → escape hatch. */
  onToolBefore(e: ToolBeforeInput): ToolBeforeResult {
    // (1) IDENTITY GUARD — substrate tools are agent-surface only
    // (2) THE CONFIG-LOCK (the CTX pair-test — the substrate self-protection)
    if (e.tool === 'bash') {
      const verdict = classifyCtExec('bash', e.args as { command?: string }, this.deps.substratePaths);
      if (verdict.action === 'BLOCK') {
        // (3) ESCAPE HATCH checked BEFORE the block lands, never after
        if (!this.deps.escapeHatchTools.includes(e.tool)) {
          return { action: 'BLOCK', code: `CTX_${verdict.family}`, remedy: verdict.remedy ?? 'use the sanctioned path' };
        }
      }
    }
    // (4) the claim gate NEVER blocks the work (block-the-CLAIM-not-the-WORK)
    const gate = this.deps.claimGate.onToolBefore(e.tool, e.args);
    return gate.blocked ? { action: 'BLOCK', code: 'P_GATE_WORK_BLOCKED_BUG', remedy: 'this is a defect — the claim gate never blocks work' } : { action: 'ALLOW' };
  }

  /** HOOK 3 — tool.execute.after: record + Phase-B splice + LSP injection. */
  onToolAfter(e: ToolAfterInput): ToolAfterResult {
    const out: { splicedResult?: string; injectedBlocks?: string[] } = {};
    const seq = this.nextSeq(e.sessionId);
    // (1) record — the tool result enters the audit trail
    const triad = {
      pattern: { memberId: `tool.${e.tool}`, familySeverity: 'LOW' as const },
      state: { machineId: 'audit', from: 'WORKING', to: 'RETURNED' },
      evidence: { file: String(e.args['filePath'] ?? e.args['path'] ?? '(tool)'), line: seq },
    };
    this.deps.engine.ingestEvent({
      type: 'TOOL_RESULT', sessionId: e.sessionId, agentOrigin: true,
      payload: { tool: e.tool, triad, excerpt: boundedSlice(String(e.result).slice(0, 400), 400) },
      receivedAtSeq: seq,
    });
    // (2) the Phase-B splice — the claim demand rides the result (consume-once)
    const pending = this.deps.claimGate.pendingDemand(e.sessionId, seq);
    if (pending !== null) {
      const text = typeof e.result === 'string' ? e.result : JSON.stringify(e.result);
      out.splicedResult = spliceDemand(text, pending);
      this.deps.claimGate.consumeDemand(e.sessionId, pending.atSeq);
    }
    // (3) the LSP injection — the byte-budgeted block on the touched file
    const touched = extractTouchedFile(e.tool, e.args);
    if (touched !== null && this.deps.lsp !== null) {
      const block = this.deps.lsp.blockFor(touched);
      if (block !== null) out.injectedBlocks = [block];
    }
    // (4) the container-test escape hatch clears the claim gate (the deadlock break)
    if (e.tool === 'trident-container-test') {
      this.deps.claimGate.clear(e.sessionId);
      this.deps.engine.clearStrikes(e.sessionId);
    }
    return out;
  }

  /** HOOK 4 — messages.transform: the delivery surface (consume-on-read, TTL). */
  onMessagesTransform(e: MessagesTransformInput): MessagesTransformResult {
    // the barrage/demand blocks carry expiry; expired blocks are STRIPPED here
    // (consume-on-read — delivered exactly once per episode)
    const messages = e.messages.map((m) => {
      if (m.paragonBlock && m.text.includes('[P-GATE]')) {
        return { ...m, paragonBlock: false, text: m.text.replace(/\n\n\[P-GATE\][\s\S]*$/, '') };
      }
      return m;
    });
    return { messages };
  }

  /** HOOK 5 — system.transform: STATIC mandates ONLY (the cache law). */
  onSystemTransform(systemPrompt: string): string {
    if (systemPrompt.includes(PARAGON_STATIC_MARKER)) return systemPrompt; // idempotent
    return `${systemPrompt}\n${STATIC_MANDATES}`;
  }
}
