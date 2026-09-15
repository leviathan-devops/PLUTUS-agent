export function isPlutusAgent(agent: string | undefined | null): boolean {
  if (!agent) return false;
  const lower = agent.toLowerCase();
  return lower === 'plutus' || lower === 'plutus-agent' || lower === 'plutus_agent' || lower === 'plutus-engine';
}
