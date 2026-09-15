// ═══════════════════════════════════════════════════════════════════
// TVI — ORCHESTRATOR — SINGLE OUTPUT GATEWAY
// Spec: PLUTUS_TVI_DESIGN_SPEC.md §8.3 (IntelligenceOrchestrator pattern)
//
// All TVI findings (blocks, warns, guides) are synthesized into ONE
// coherent output.system push per turn. No fragmentation, no
// contradiction. Priority order: block > warn > guide. Guides are
// emitted only when no blocks exist (a blocked turn needs fixes,
// not education).
// ═══════════════════════════════════════════════════════════════════

import type { TVIFinding } from './types.js';

export class TVIOrchestrator {
  /**
   * Synthesize findings into a single output string (spec §8.3 verbatim):
   *   [TVI BLOCK] b1 | b2
   *   [TVI WARN] w1 | w2
   *   [TVI GUIDE] g1 | g2   (only when zero blocks)
   */
  synthesize(findings: TVIFinding[]): string {
    // Priority order: block > warn > guide
    const blocks = findings.filter((f) => f.priority === 'block');
    const warns = findings.filter((f) => f.priority === 'warn');
    const guides = findings.filter((f) => f.priority === 'guide');

    const parts: string[] = [];

    if (blocks.length > 0) {
      parts.push(`[TVI BLOCK] ${blocks.map((b) => b.bullet).join(' | ')}`);
    }
    if (warns.length > 0) {
      parts.push(`[TVI WARN] ${warns.map((w) => w.bullet).join(' | ')}`);
    }
    if (guides.length > 0 && blocks.length === 0) {
      parts.push(`[TVI GUIDE] ${guides.map((g) => g.bullet).join(' | ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Convenience: synthesize the queue and clear it in place. Pass the
   * VGS mutable queue (vgs.queue) — after this call the queue is empty
   * and the returned string is the single output.system push for the turn.
   */
  synthesizeAndClear(findings: TVIFinding[]): string {
    const output = this.synthesize(findings);
    findings.length = 0;
    return output;
  }
}

/** Singleton factory — one orchestrator per plugin lifecycle (spec §8.3) */
export function createTVIOrchestrator(): TVIOrchestrator {
  return new TVIOrchestrator();
}
