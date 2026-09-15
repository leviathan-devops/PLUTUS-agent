// src/machines/sentinel-watchdog.ts — liveness/stuck/budget with LOUD OFFLINE (spec §6.3.6)
// sidecar-supervisor.ts:277 lineage: liveness = pid + log-growth heartbeat;
// STUCK (frozen >120s) counts as DEAD; 5 restarts/10min → GAVE_UP; the WAL is append-only.

export const STUCK_WINDOW_MS = 120_000; // BECAUSE: 24 consecutive missed heartbeats at 15s polls — deep past any legit pause
export const LIVENESS_POLL_MS = 15_000;
export const RESTART_BUDGET = 5;
export const RESTART_WINDOW_MS = 600_000; // 10 min

export type WatchdogClassification =
  | { kind: 'ALIVE'; pid: number }
  | { kind: 'STUCK_COUNTS_DEAD'; frozenMs: number }
  | { kind: 'OFFLINE'; pid: number; lastHeartbeatMs: number }
  | { kind: 'GAVE_UP'; reason: 'BUDGET_EXHAUSTED' };

export interface WalEntry {
  readonly t: 'OBSERVE' | 'STUCK' | 'RESTART' | 'GAVE_UP' | 'OFFLINE';
  readonly atUnixMs: number;
  readonly neuronId: string;
  readonly pid?: number;
  readonly frozenMs?: number;
  readonly attempt?: number;
  readonly reason?: string;
}

/** The injected clock — K21.2: NO Date.now in cores. */
export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };

export class SentinelWatchdog {
  private readonly wal: WalEntry[] = [];
  private readonly restarts = new Map<string, number[]>(); // neuronId → restart timestamps
  private lastLogGrowth = new Map<string, { bytes: number; atMs: number }>();

  constructor(private readonly clock: Clock = systemClock) {}

  /** observe — one liveness tick for a sidecar; returns the classification. */
  observe(input: { neuronId: string; pid: number; logGrowthBytes: number; processAlive: boolean }): WatchdogClassification {
    const now = this.clock.now();
    const prev = this.lastLogGrowth.get(input.neuronId);
    this.lastLogGrowth.set(input.neuronId, { bytes: input.logGrowthBytes, atMs: now });
    this.wal.push({ t: 'OBSERVE', atUnixMs: now, neuronId: input.neuronId, pid: input.pid, frozenMs: 0 });

    if (!input.processAlive) {
      this.wal.push({ t: 'OFFLINE', atUnixMs: now, neuronId: input.neuronId, pid: input.pid });
      return { kind: 'OFFLINE', pid: input.pid, lastHeartbeatMs: prev?.atMs ?? now };
    }
    const grew = prev === undefined || input.logGrowthBytes !== prev.bytes;
    if (!grew && prev !== undefined) {
      const frozenMs = now - prev.atMs;
      if (frozenMs > STUCK_WINDOW_MS) {
        this.wal.push({ t: 'STUCK', atUnixMs: now, neuronId: input.neuronId, frozenMs });
        return { kind: 'STUCK_COUNTS_DEAD', frozenMs };
      }
    }
    return { kind: 'ALIVE', pid: input.pid };
  }

  /** restart — records the attempt; the budget check converts loops to GAVE_UP. */
  restart(neuronId: string): WatchdogClassification {
    const now = this.clock.now();
    const arr = (this.restarts.get(neuronId) ?? []).filter((t) => now - t < RESTART_WINDOW_MS);
    arr.push(now);
    this.restarts.set(neuronId, arr);
    this.wal.push({ t: 'RESTART', atUnixMs: now, neuronId, attempt: arr.length });
    if (arr.length > RESTART_BUDGET) {
      this.wal.push({ t: 'GAVE_UP', atUnixMs: now, neuronId, reason: 'BUDGET_EXHAUSTED' });
      return { kind: 'GAVE_UP', reason: 'BUDGET_EXHAUSTED' };
    }
    return { kind: 'OFFLINE', pid: 0, lastHeartbeatMs: now };
  }

  /** The WAL is APPEND-ONLY — this returns a frozen snapshot (no mutation path). */
  walEntries(): readonly WalEntry[] {
    return Object.freeze([...this.wal]);
  }
}
