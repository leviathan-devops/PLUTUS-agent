import type { Hooks } from '@opencode-ai/plugin';
import { isPlutusAgent } from '../identity/agent-identity.js';
import { setCurrentAgent, getCurrentAgent } from './agent-state.js';

export function createChatMessageHook(): Hooks['chat.message'] {
  return async (input: Record<string, unknown>, _output: Record<string, unknown>) => {
    const sid = (input as any)?.sessionID || 'default';
    // Agent extraction — match Trident's 4-source pattern exactly
    const agent = (typeof (input as any)?.agent === 'string' ? (input as any)?.agent : '')
      || (typeof (input as any)?.agentName === 'string' ? (input as any)?.agentName : '')
      || (input as any)?.info?.agent
      || (input as any)?.message?.agent
      || getCurrentAgent(sid)
      || '';

    if (isPlutusAgent(agent)) {
      setCurrentAgent(agent, sid);
    }
  };
}
