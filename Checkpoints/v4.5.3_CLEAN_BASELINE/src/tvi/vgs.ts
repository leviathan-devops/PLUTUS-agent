// ═══════════════════════════════════════════════════════════════════
// TVI — VISUAL GUIDANCE SYSTEM (VGS) — T0 BULLETS + T1 WARHEADS
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §8 (VGS) + §10.2 (adaptive profiles)
//
// T0 bullets: <80-char actionable guidance queued as TVIFindings and
// synthesized by the TVIOrchestrator into ONE output.system push.
// T1 warheads: 300-600 token .md files read from src/tvi/warheads/
// (cached; absent files yield null with a one-time log — never crash).
//
// Profiles (spec §10.2): TRUSTED (health > 0.85) emits blocks +
// anti-pattern warns only; STANDARD (> 0.60) emits all; GUIDED emits
// all + flags warhead injections. ZERO model inference.
// ═══════════════════════════════════════════════════════════════════
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TVIFinding, VKGNode } from './types.js';

/**
 * Candidate warhead directories. Source layout: src/tvi/warheads/.
 * Bundled layout (dist/index.js): resolve back to src/tvi/warheads/.
 * The first candidate that yields a readable file is pinned.
 */
const WARHEAD_DIR_CANDIDATES: string[] = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, 'warheads'),
    join(here, 'tvi', 'warheads'),
    join(here, '..', 'src', 'tvi', 'warheads'),
    join(here, '..', '..', 'src', 'tvi', 'warheads'),
  ];
})();

export type VGSProfile = 'TRUSTED' | 'STANDARD' | 'GUIDED';

/** Optional emission metadata for profile gating and warhead flagging */
export interface VGSBulletOptions {
  /** Gate that produced this bullet (e.g. 'P1', 'V2', 'AD-3') */
  gate?: string;
  /** Reason string carried on the TVIFinding */
  reason?: string;
  /** True when the bullet corrects an anti-pattern (§11) — TRUSTED keeps these warns */
  antiPattern?: boolean;
  /** Warhead trigger to inject under GUIDED profile (T1 hand-holding) */
  warhead?: string;
}

export class VisualGuidanceSystem {
  private profile: VGSProfile = 'STANDARD';
  private findingsQueue: TVIFinding[] = [];
  /** Warhead triggers flagged for injection under GUIDED profile */
  private pendingWarheads: string[] = [];
  /** Warhead content cache: normalized trigger → content (null = unavailable, logged once) */
  private warheadCache: Map<string, string | null> = new Map();
  /** Resolved warhead directory (first candidate containing a readable hit) */
  private warheadDir: string | null = null;
  /** once-gate disclosure keys (`${gate}:${nodeId}`) */
  private disclosedGate: Set<string> = new Set();
  /** once-session disclosure keys (nodeId) — session = one pipeline run */
  private disclosedSession: Set<string> = new Set();

  // ─────────────────────────────────────────────────────────────────
  // T0 BULLETS (spec §8.1) — queue a TVIFinding and return it
  // ─────────────────────────────────────────────────────────────────

  /** Block bullet — always emitted under every profile */
  block(bullet: string, opts: VGSBulletOptions = {}): TVIFinding {
    return this.emit('block', bullet, opts);
  }

  /** Warn bullet — TRUSTED emits only anti-pattern warns (spec §10.2) */
  warn(bullet: string, opts: VGSBulletOptions = {}): TVIFinding {
    return this.emit('warn', bullet, opts);
  }

  /** Guide bullet — suppressed under TRUSTED (spec §10.2 light enforcement) */
  guide(bullet: string, opts: VGSBulletOptions = {}): TVIFinding {
    return this.emit('guide', bullet, opts);
  }

  /**
   * Profile-gated emission. The finding is ALWAYS constructed and
   * returned (callers may need it); it is QUEUED only when the active
   * profile emits that priority/category combination.
   */
  private emit(
    priority: TVIFinding['priority'],
    bullet: string,
    opts: VGSBulletOptions,
  ): TVIFinding {
    const finding: TVIFinding = {
      priority,
      bullet,
      gate: opts.gate ?? 'VGS',
      reason: opts.reason ?? '',
    };

    if (!this.shouldEmit(priority, opts)) return finding;

    this.findingsQueue.push(finding);

    // GUIDED: flag T1 warhead injection for complex situations (spec §10.2)
    if (this.profile === 'GUIDED' && opts.warhead) {
      this.pendingWarheads.push(opts.warhead);
    }

    return finding;
  }

  /** Deterministic profile gate (spec §10.2 profile effects) */
  private shouldEmit(priority: TVIFinding['priority'], opts: VGSBulletOptions): boolean {
    if (this.profile === 'TRUSTED') {
      if (priority === 'block') return true;
      if (priority === 'warn') return opts.antiPattern === true;
      return false; // guides suppressed under light enforcement
    }
    return true; // STANDARD and GUIDED emit everything
  }

  // ─────────────────────────────────────────────────────────────────
  // FINDINGS QUEUE — drained by the TVIOrchestrator (single gateway)
  // ─────────────────────────────────────────────────────────────────

  /** Mutable queue reference — orchestrator clears it in place after synthesis */
  get queue(): TVIFinding[] {
    return this.findingsQueue;
  }

  /** Copy of all queued findings (non-destructive) */
  getFindings(): TVIFinding[] {
    return [...this.findingsQueue];
  }

  /** Remove all queued findings without returning them */
  clearFindings(): void {
    this.findingsQueue.length = 0;
  }

  /** Return all queued findings and clear the queue in one call */
  drainFindings(): TVIFinding[] {
    const out = this.findingsQueue;
    this.findingsQueue = [];
    return out;
  }

  // ─────────────────────────────────────────────────────────────────
  // PROFILES (spec §10.2)
  // ─────────────────────────────────────────────────────────────────

  setProfile(profile: VGSProfile): void {
    this.profile = profile;
  }

  getProfile(): VGSProfile {
    return this.profile;
  }

  /**
   * Derive and set the profile from a VTM health score (spec §10.2
   * thresholds verbatim): > 0.85 TRUSTED, > 0.60 STANDARD, else GUIDED.
   */
  setHealthScore(healthScore: number): VGSProfile {
    if (healthScore > 0.85) this.profile = 'TRUSTED';
    else if (healthScore > 0.60) this.profile = 'STANDARD';
    else this.profile = 'GUIDED';
    return this.profile;
  }

  /** Warhead triggers flagged under GUIDED since last drain */
  drainWarheads(): string[] {
    const out = this.pendingWarheads;
    this.pendingWarheads = [];
    return out;
  }

  // ─────────────────────────────────────────────────────────────────
  // T1 WARHEADS (spec §8.2) — cached .md reads, null when unavailable
  // ─────────────────────────────────────────────────────────────────

  /**
   * Read a warhead .md file by trigger. Accepts any of:
   *   'zone-identification-guide' | 'zone-identification-guide.md'
   *   'warheads/zone-identification-guide.md'
   * Returns file content (cached). When the file is unavailable the
   * result is null and a one-time log line is emitted — guidance
   * degradation must never crash a hook.
   */
  getWarheadInjection(trigger: string): string | null {
    const name = this.normalizeTrigger(trigger);
    if (!name) {
      const empty: string | null = null;
      return empty;
    }

    if (this.warheadCache.has(name)) {
      const cached = this.warheadCache.get(name);
      return cached === undefined ? null : cached;
    }

    const content = this.readWarhead(name);
    if (content === null) {
      console.warn(`[TVI] warhead unavailable (yielding null): ${name}.md`);
    }
    this.warheadCache.set(name, content);
    return content;
  }

  /** Strip path prefix and extension → bare warhead name */
  private normalizeTrigger(trigger: string): string {
    if (!trigger || typeof trigger !== 'string') return '';
    let t = trigger.trim();
    if (t.startsWith('warheads/')) t = t.slice('warheads/'.length);
    const slash = t.lastIndexOf('/');
    if (slash >= 0) t = t.slice(slash + 1);
    if (t.endsWith('.md')) t = t.slice(0, -3);
    return t;
  }

  /** Read `${name}.md` from the resolved warhead dir (resolves dir lazily) */
  private readWarhead(name: string): string | null {
    const dirs = this.warheadDir ? [this.warheadDir] : WARHEAD_DIR_CANDIDATES;
    let content: string | null = null;
    for (const dir of dirs) {
      const path = join(dir, `${name}.md`);
      // Deterministic probe — an absent candidate is an expected
      // outcome, not an error. Only an unreadable existing file throws.
      if (!existsSync(path)) continue;
      content = readFileSync(path, 'utf8');
      this.warheadDir = dir; // pin the working candidate
      break;
    }
    return content;
  }

  // ─────────────────────────────────────────────────────────────────
  // DISCLOSURE TRACKING (spec §3 node disclosure modes)
  // once-gate: fires once per gate | once-session: once per pipeline run
  // ─────────────────────────────────────────────────────────────────

  /**
   * Returns true if the node should fire NOW (and records the firing).
   * 'always' nodes always fire. 'once-gate' fires once per gate key.
   * 'once-session' fires once per session (until resetSession()).
   */
  shouldDisclose(
    nodeId: string,
    disclosure: VKGNode['disclosure'],
    gate: string = '',
  ): boolean {
    if (disclosure === 'always') return true;

    if (disclosure === 'once-gate') {
      const key = `${gate}:${nodeId}`;
      if (this.disclosedGate.has(key)) return false;
      this.disclosedGate.add(key);
      return true;
    }

    // once-session
    if (this.disclosedSession.has(nodeId)) return false;
    this.disclosedSession.add(nodeId);
    return true;
  }

  /** Clear once-gate disclosures for one gate (or all gates when omitted) */
  resetGate(gate?: string): void {
    if (gate === undefined) {
      this.disclosedGate.clear();
      return;
    }
    const prefix = `${gate}:`;
    for (const key of this.disclosedGate) {
      if (key.startsWith(prefix)) this.disclosedGate.delete(key);
    }
  }

  /** New pipeline run — clear all disclosure state */
  resetSession(): void {
    this.disclosedGate.clear();
    this.disclosedSession.clear();
  }
}

/** Singleton factory — one VGS per plugin lifecycle (spec §8 integration) */
export function createVGS(): VisualGuidanceSystem {
  return new VisualGuidanceSystem();
}
