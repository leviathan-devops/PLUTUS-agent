interface AgentState {
  agent: string | undefined;
  timestamp: number;
  sessionId: string;
}

const agentBySession = new Map<string, AgentState>();

export function setCurrentAgent(agent: string | undefined, sessionId?: string): void {
  const sid = sessionId || 'default';
  agentBySession.set(sid, { agent, timestamp: Date.now(), sessionId: sid });
}

export function getCurrentAgent(sessionId?: string): string | undefined {
  return agentBySession.get(sessionId || 'default')?.agent;
}
