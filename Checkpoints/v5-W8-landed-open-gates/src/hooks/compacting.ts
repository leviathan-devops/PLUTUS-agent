import type { Hooks } from '@opencode-ai/plugin';
import { isPlutusAgent } from '../identity/agent-identity.js';
import { getCurrentAgent } from './agent-state.js';

/**
 * Compacting Hook — Ensures PLUTUS identity survives context window compaction.
 *
 * When opencode compacts the conversation (summarizes old messages to save tokens),
 * the identity header can be lost. This hook injects survival context into the
 * compaction prompt so the agent remembers who it is after compaction.
 */
export function createCompactingHook(): Hooks['experimental.session.compacting'] {
  return async (input: Record<string, unknown>, output: Record<string, unknown>) => {
    const sessionId = typeof input['sessionID'] === 'string' ? input['sessionID'] : undefined;
    const agentName = getCurrentAgent(sessionId);

    // Only inject for Plutus agents
    if (!isPlutusAgent(agentName)) return;

    const context = output['context'];
    if (!Array.isArray(context)) return;

    // Push survival context — ensures identity persists after compaction
    context.push(
      '[PLUTUS v4.0 COMPACTION SURVIVAL] ' +
        'You are PLUTUS TTE v4.0 — an autonomous trading engine. ' +
        'Pipeline tools: plutus-pipeline-harvest, plutus-pipeline-zones, plutus-pipeline-shapes, plutus-pipeline-charts, plutus-pipeline-setups. ' +
        'Plus: plutus-browse-screenshot, plutus-omni-vision, plutus-status, tv_* MCP tools. ' +
        'When the user asks for ANY trading-related work, CALL plutus-pipeline-harvest. ' +
        'Do NOT search the codebase. Do NOT explain what TTE is. CALL THE TOOL. ' +
        'Reports save to /root/plutus/reports/. Browser at localhost:6930 (Weston+XWayland container).',
    );
  };
}
