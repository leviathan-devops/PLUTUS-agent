// src/shadow/sidecar.ts — the 3-tier tether + reattach gate (spec §5.3)
// tetherSession: globalThis → env → defaults. registerSidecar/touchSidecar/
// handleSessionSwitch + verifyMemoryReattach (3-check gate, named conditions).

export interface Tether {
  readonly sessionKey: string;
  readonly projectId: string;
  readonly parentSessionId: string | null;
  readonly pid: number;
}

interface TetherStore {
  current: Tether | null;
  sidecars: Map<number, { sessionKey: string; projectId: string; lastTouchUnixMs: number }>;
}

const G = globalThis as { __paragonTether?: TetherStore };

function store(): TetherStore {
  if (G.__paragonTether === undefined) G.__paragonTether = { current: null, sidecars: new Map() };
  return G.__paragonTether;
}

/** Tier 1 globalThis → Tier 2 env → Tier 3 defaults. */
export function tetherSession(defaults: { sessionKey: string; projectId: string }): Tether {
  const s = store();
  if (s.current !== null) return s.current; // tier 1: the live tether
  const envSession = process.env['PARAGON_SESSION_KEY'];
  const envProject = process.env['PARAGON_PROJECT_ID'];
  const tether: Tether = {
    sessionKey: envSession ?? defaults.sessionKey, // tier 2: env
    projectId: envProject ?? defaults.projectId,
    parentSessionId: process.env['PARAGON_PARENT_SESSION'] ?? null,
    pid: process.pid,
  };
  s.current = tether;
  return tether;
}

export function registerSidecar(pid: number, sessionKey: string, projectId: string): void {
  store().sidecars.set(pid, { sessionKey, projectId, lastTouchUnixMs: Date.now() });
}

export function touchSidecar(pid: number): boolean {
  const s = store();
  const entry = s.sidecars.get(pid);
  if (entry === undefined) return false;
  entry.lastTouchUnixMs = Date.now();
  return true;
}

export function handleSessionSwitch(pid: number, newSessionKey: string): void {
  const s = store();
  const entry = s.sidecars.get(pid);
  if (entry !== undefined) entry.sessionKey = newSessionKey;
  if (s.current !== null && s.current.pid === pid) s.current = { ...s.current, sessionKey: newSessionKey };
}

export type ReattachVerdict =
  | { ok: true }
  | { ok: false; condition: 'PID_DEAD' | 'SESSION_KEY_MISMATCH' | 'MEMORY_ROOT_ABSENT' };

/** The 3-check reattach gate (named conditions — never a silent adopt). */
export function verifyMemoryReattach(
  pid: number,
  sessionKey: string,
  memoryRootExists: () => boolean,
): ReattachVerdict {
  const s = store();
  const entry = s.sidecars.get(pid);
  if (entry === undefined) return { ok: false, condition: 'PID_DEAD' };
  if (entry.sessionKey !== sessionKey) return { ok: false, condition: 'SESSION_KEY_MISMATCH' };
  if (!memoryRootExists()) return { ok: false, condition: 'MEMORY_ROOT_ABSENT' };
  return { ok: true };
}
