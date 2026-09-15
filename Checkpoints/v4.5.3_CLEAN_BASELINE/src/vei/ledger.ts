/**
 * VEI v4.4.0 — ledger.ts — the fingerprint ledger (spec §5.1).
 *
 * Per-session rolling window of the last 20 GUI actions. The ONLY state VEI
 * keeps about agent behavior. Fingerprints are `tool:sha256(args)` per SEL
 * LD.js L19-28 (Appendix A.1). Every mutation re-checks the MPSE invariants
 * (Structure 10); a violation throws VeiInvariantError and the wire layer
 * disables VEI for the session (§12 law 6 — fail-silent-off).
 *
 * Determinism: the only clock is the recorded `ts` on entries, which never
 * feeds a decision (§5.2 determinism law) — decisions use hashes and counts.
 */

import { createHash } from 'node:crypto';

/** BECAUSE §11: version-checked restore (MPSE KB-MPSE-03 §6 contractId discipline). */
export const VEI_STATE_VERSION = 1;

/** BECAUSE SEL LD.js L127-129 production windowSize=20: ≈2-3 pipeline phases —
 *  large enough to see patterns, small enough that ancient history cannot mask
 *  a current loop (Appendix A.2). */
export const LEDGER_WINDOW = 20;

/** BECAUSE LD.js L86-93: perception-loop detection compares the last 3 screenshots. */
export const SCREENSHOT_HASH_WINDOW = 3;

/** BECAUSE §4.2.1: trajectory health is undefined when the window has fewer
 *  than 5 verified actions — the ladder stays in its current state. */
export const MIN_VERIFIED_FOR_HEALTH = 5;

/** BECAUSE Appendix A.1: 64 bits (16 hex chars) is ample for loop detection. */
const HASH_LEN = 16;

export class VeiInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VeiInvariantError';
  }
}

export interface VeiAction {
  seq: number;                 // monotonic per session
  tool: string;                // e.g. 'tv-browser_tv_canvas_zoom'
  argsHash: string;            // sha256(stableStringify(args)) — node:crypto
  signature: string;           // `${tool}:${argsHash}` — the LD fingerprint
  ts: number;
  outcome: 'changed' | 'unchanged' | 'unknown' | 'failed';
  viewHashAfter: string | null; // truth-layer view-state hash after this action
  viewHashBefore: string | null; // snapshot at intent time (nav-class; §6.1)
  verified: boolean;           // outcome was computed (not 'unknown')
  /** Click-class center coordinates (D6 spatial check, WebAntiDerailment L172-181).
   *  Extracted at intent time from {x,y} or the center of {x1,x2,y1,y2}. */
  clickX?: number;
  clickY?: number;
}

export interface VeiLedger {
  sessionID: string;
  actions: VeiAction[];        // ring buffer, max 20 (LD's windowSize)
  toolStreaks: Record<string, { failures: number; lastArgsHash: string }>;
  screenshotHashes: string[];  // last 3 (perception-loop detection)
  productiveCount: number;     // actions in the profile's productive allowlist
  health: number;              // fraction changed over verified in the window
  seqNext: number;             // next monotonic seq
}

/** Key-sorted recursive stringify — {a:1,b:2} and {b:2,a:1} hash identically
 *  BECAUSE the agent's arg key order varies; the semantic call is what matters
 *  (Appendix A.1). */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

export function sha256Hex16(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, HASH_LEN);
}

/** The LD fingerprint (LD.js L19-28 → VEI, Appendix A.1). */
export function fingerprint(tool: string, args: unknown): { argsHash: string; signature: string } {
  const argsHash = sha256Hex16(stableStringify(args ?? null));
  return { argsHash, signature: `${tool}:${argsHash}` };
}

export function createLedger(sessionID: string): VeiLedger {
  return {
    sessionID,
    actions: [],
    toolStreaks: {},
    screenshotHashes: [],
    productiveCount: 0,
    health: 1,
    seqNext: 1,
  };
}

export function recordIntent(l: VeiLedger, tool: string, args: unknown, ts: number = Date.now()): VeiAction {
  const { argsHash, signature } = fingerprint(tool, args);
  const a: VeiAction = {
    seq: l.seqNext++,
    tool,
    argsHash,
    signature,
    ts,
    outcome: 'unknown',
    viewHashAfter: null,
    viewHashBefore: null,
    verified: false,
  };
  // D6 click-center extraction (SEL `_isClickLoop` uses point distance).
  if (tool.includes('click') && args && typeof args === 'object') {
    const r = args as Record<string, unknown>;
    if (typeof r.x === 'number' && typeof r.y === 'number') {
      a.clickX = r.x;
      a.clickY = r.y;
    } else if (
      typeof r.x1 === 'number' && typeof r.x2 === 'number' &&
      typeof r.y1 === 'number' && typeof r.y2 === 'number'
    ) {
      a.clickX = (r.x1 + r.x2) / 2;
      a.clickY = (r.y1 + r.y2) / 2;
    }
  }
  l.actions.push(a);
  trimWindow(l);
  checkInvariants(l);
  return a;
}

/**
 * Record (or re-record) an outcome. Called once at tool.after, and again for
 * nav-class actions when the agent's own subsequent get_view resolves the
 * view-delta (§6.1 — VEI never forces a get_view; it consumes the agent's).
 */
export function recordOutcome(
  l: VeiLedger,
  a: VeiAction,
  outcome: VeiAction['outcome'],
  viewHash: string | null,
): void {
  a.outcome = outcome;
  a.viewHashAfter = viewHash;
  a.verified = outcome !== 'unknown';

  // Streak semantics (SEL exact, §7.1 D2): increment on failed, reset on any
  // non-failed outcome of the same tool.
  const streak = (l.toolStreaks[a.tool] ??= { failures: 0, lastArgsHash: a.argsHash });
  if (outcome === 'failed') {
    streak.failures += 1;
    streak.lastArgsHash = a.argsHash;
  } else {
    streak.failures = 0;
    streak.lastArgsHash = a.argsHash;
  }

  // Trajectory health (§4.2.1): |changed| / |verified| over the window.
  // Undefined (< 5 verified) → hold previous value (the ladder holds state).
  const verified = l.actions.filter((x) => x.verified);
  if (verified.length >= MIN_VERIFIED_FOR_HEALTH) {
    const changed = verified.filter((x) => x.outcome === 'changed').length;
    l.health = changed / verified.length;
  }

  trimWindow(l);
  checkInvariants(l);
}

/** Appendix A.2 (LD.js L127-129 → VEI). */
export function trimWindow(l: VeiLedger): void {
  while (l.actions.length > LEDGER_WINDOW) l.actions.shift();
  while (l.screenshotHashes.length > SCREENSHOT_HASH_WINDOW) l.screenshotHashes.shift();
}

/** MPSE Structure 10 — checked on every mutation. Violation → VeiInvariantError
 *  → wire layer disables VEI for the session (§12 law 6). */
export function checkInvariants(l: VeiLedger): void {
  if (l.actions.length > LEDGER_WINDOW) {
    throw new VeiInvariantError(`ledger window overflow: ${l.actions.length} > ${LEDGER_WINDOW}`);
  }
  for (let i = 1; i < l.actions.length; i++) {
    if (l.actions[i].seq <= l.actions[i - 1].seq) {
      throw new VeiInvariantError(`seq not strictly increasing at index ${i}`);
    }
  }
  if (!(l.health >= 0 && l.health <= 1)) {
    throw new VeiInvariantError(`health out of range: ${l.health}`);
  }
}

export function serialize(l: VeiLedger): string {
  return JSON.stringify({ veiStateVersion: VEI_STATE_VERSION, ledger: l });
}

/** Version-checked restore (§11). Mismatched version → fresh state (the caller
 *  catches and calls createLedger). Restored state is invariant-checked. */
export function restore(s: string): VeiLedger {
  const parsed = JSON.parse(s) as { veiStateVersion?: number; ledger?: VeiLedger };
  if (parsed.veiStateVersion !== VEI_STATE_VERSION || !parsed.ledger) {
    throw new VeiInvariantError(
      `veiStateVersion mismatch: got ${String(parsed.veiStateVersion)}, want ${VEI_STATE_VERSION}`,
    );
  }
  checkInvariants(parsed.ledger);
  return parsed.ledger;
}
