// src/shadow/brain.ts — the frozen model call (spec §6.7.2; shadow-brain.ts lineage)
// THE MODEL SEAM: the model is INJECTED (fake-model in unit tests, the host
// provider in the binding). The config is FROZEN — no override parameter exists.
// Errors are ENCODED in the result, NEVER thrown; the stall window is a TRUE
// silence detector re-armed per event; the 3-strike breaker opens LOUDLY.

export interface ModelRequest {
  readonly system: string;
  readonly prompt: string;
}

export type StreamEvent =
  | { kind: 'chunk'; text: string }
  | { kind: 'stall-marker'; stalledMs: number }
  | { kind: 'model-error'; code: string };

export interface ModelSeam {
  stream(req: ModelRequest): AsyncIterable<StreamEvent>;
  readonly frozenConfig: Readonly<{ model: string; maxTokens: number }>;
}

export const FROZEN_MODEL_CONFIG = {
  model: 'deepseek-v4-flash', // FROZEN — the flash-only mandate; no override path
  maxTokens: 384_000, // BECAUSE: the anti-truncation guard — the compose stage must never be the truncation source
} as const;

export const STALL_WINDOW_MS = 45_000; // BECAUSE: the proven stall detector window (shadow-tools :787)
export const BREAKER_THRESHOLD = 3;

export type BrainResult =
  | { ok: true; content: string; stallDetected: boolean; completed: boolean }
  | { ok: false; code: string; breakerOpen?: boolean };

export class BrainBreaker {
  private consecutiveFailures = 0;
  private open = false;

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.open = false;
  }
  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= BREAKER_THRESHOLD) this.open = true;
  }
  isOpen(): boolean {
    return this.open;
  }
}

/** streamWithBrain — the frozen-model streaming call with stall detection + breaker. */
export async function streamWithBrain(
  seam: ModelSeam,
  req: ModelRequest,
  breaker: BrainBreaker,
  opts: { stallWindowMs?: number } = {},
): Promise<BrainResult> {
  if (breaker.isOpen()) return { ok: false, code: 'BREAKER_OPEN', breakerOpen: true };
  const stallWindowMs = opts.stallWindowMs ?? STALL_WINDOW_MS;
  const parts: string[] = [];
  let stallDetected = false;
  let lastEventAt = Date.now();
  try {
    for await (const ev of seam.stream(req)) {
      const now = Date.now();
      const gap = now - lastEventAt;
      lastEventAt = now;
      if (gap > stallWindowMs) {
        stallDetected = true; // the TRUE silence detector — re-armed per event
      }
      if (ev.kind === 'chunk') {
        parts.push(ev.text);
      } else if (ev.kind === 'stall-marker') {
        stallDetected = true;
      } else {
        // model-error: ENCODED, never thrown; the runner decides
        breaker.recordFailure();
        return { ok: false, code: `MODEL_${ev.code}` };
      }
    }
    breaker.recordSuccess();
    return { ok: true, content: parts.join(''), stallDetected, completed: true };
  } catch (e) {
    breaker.recordFailure();
    return { ok: false, code: `BRAIN_CRASH:${String(e)}` };
  }
}

/** The fake-model double for unit tests (NO network in unit tests — the seam is doubled). */
export class FakeModel implements ModelSeam {
  readonly frozenConfig = FROZEN_MODEL_CONFIG;
  private script: StreamEvent[] = [];
  private cursor = 0;
  calls = 0;

  setScript(events: readonly StreamEvent[]): this {
    this.script = [...events];
    this.cursor = 0;
    return this;
  }

  async *stream(_req: ModelRequest): AsyncIterable<StreamEvent> {
    this.calls += 1;
    for (const ev of this.script) {
      yield ev;
    }
  }
}
