// src/bindings/opencode/index.ts + src/enforcement/index.ts + src/index.ts — barrels + assembly
import type { ParagonHostBinding, HostToolRegistration } from '../contract';
import { OpenCodeHooks, PARAGON_STATIC_MARKER } from './hooks';
import { registerTools, type ToolDeps } from './tools';
import type { LasmeEngine } from '../../L3-lasme';
import type { ClaimGate } from '../../L3-lasme/machines';
import type { DiagnosticsServer } from '../../L6-graph';

export interface OpenCodeBindingOptions {
  readonly engine: LasmeEngine;
  readonly claimGate: ClaimGate;
  readonly lsp: DiagnosticsServer | null;
  readonly workspaceRoot: string;
  readonly substratePaths: readonly string[];
  readonly escapeHatchTools: readonly string[];
  readonly registeredAgents: readonly string[];
  readonly toolDeps?: Partial<ToolDeps>;
}

export function createOpenCodeBinding(opts: OpenCodeBindingOptions): ParagonHostBinding & { hooks: OpenCodeHooks } {
  const hooks = new OpenCodeHooks({
    engine: opts.engine,
    claimGate: opts.claimGate,
    lsp: opts.lsp,
    substratePaths: opts.substratePaths,
    escapeHatchTools: opts.escapeHatchTools,
    registeredAgents: opts.registeredAgents,
  });
  const tools: readonly HostToolRegistration[] = registerTools({
    engine: opts.engine,
    claimGate: opts.claimGate,
    workspaceRoot: opts.workspaceRoot,
    ...opts.toolDeps,
  });
  return {
    hostName: 'opencode',
    onChatMessage: (e) => hooks.onChatMessage(e),
    onToolBefore: (e) => hooks.onToolBefore(e),
    onToolAfter: (e) => hooks.onToolAfter(e),
    onMessagesTransform: (e) => hooks.onMessagesTransform(e),
    onSystemTransform: (s) => hooks.onSystemTransform(s),
    tools,
    hooks,
  };
}

export { PARAGON_STATIC_MARKER };
