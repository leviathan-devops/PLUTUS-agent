/**
 * VEI v4.4.0 — detectors.ts — the detector engine (spec §5.3 + §7).
 *
 * All 13 detectors as TOTAL predicates (ledger, truth, profile) → Finding|null
 * (§12 law 7 — MPSE Losslessness: every ledger state maps to exactly one
 * verdict; no partial functions, no exceptions-as-logic). Pseudocode in §7.1
 * is normative and implemented EXACTLY. Every finding carries machine-readable
 * evidence (§12 law 5 — evidence or silence).
 *
 * Evaluation order is FIXED (§5.3): BLOCK-severity first (D10), then
 * loop-class (D1→D2→D3→D5), navigation-class (D4→D7→D13), hygiene
 * (D6→D8→D9→D11→D12). First 3 findings max (flood control — the deepest
 * issue speaks first).
 */

import type { VeiLedger } from './ledger.js';
import type { TruthLayer } from './truth.js';
import { anchorCoverage } from './truth.js';
import type { GuiProfile } from './profiles/tradingview.js';

// ── Thresholds (§7: named constants, provenance cited — no magic numbers) ──

/** BECAUSE LD.js L30-38 (production-verified): last 3 signatures identical. */
export const D1_REPETITION_COUNT = 3;
/** BECAUSE LD.js L40-50: per-tool consecutive `failed` ≥ 3. */
export const D2_FAILURE_STREAK = 3;
/** BECAUSE LD.js L52-69: last 6 view hashes alternate A,B with ≥5 of 6 matches. */
export const D3_HISTORY = 6;
export const D3_MIN_MATCHES = 5;
/** BECAUSE §7 D4 (SEL nav-drift + outcome polarity): 3 consecutive nav-class
 *  with outcome=unchanged. */
export const D4_NAV_STREAK = 3;
/** BECAUSE LD.js L86-93: last 3 screenshot hashes identical. */
export const D5_SHOT_REPEAT = 3;
/** BECAUSE WebAntiDerailment L172-181: last 3 click-class within 20px
 *  center-distance (SEL's exact `_isClickLoop`). */
export const D6_CLICK_PROXIMITY_PX = 20;
/** BECAUSE WebAntiDerailment L183-194: 3 nav-class within 5 actions with zero
 *  productive verbs between. Full window required (same guard as D8) BECAUSE
 *  Appendix C V13: a 3-action session must not fire drift — drift is a
 *  sustained pattern, not a startup transient. */
export const D7_WINDOW = 5;
export const D7_NAV_MIN = 3;
/** BECAUSE WebAntiDerailment L203-212: last 5 actions, zero productive verbs. */
export const D8_WINDOW = 5;
/** BECAUSE WebAntiDerailment L100-151: ≥5 screenshot-class in window with
 *  zero read markers. */
export const D9_MIN_SHOTS = 5;
/** BECAUSE W7-A container evidence (test 3: 17 false REJECTIONS, 0 setups —
 *  the agent read the live right edge at 0% coverage). The golden rungs span
 *  the whole week; <60% visible means missing reactions. */
export const D10_MIN_COVERAGE = 0.6;
/** BECAUSE test-2 evidence (203 find_price_y probes in one view): >6 probes
 *  in one view-state while the affine cache is fitted for that view. */
export const D12_MAX_PROBES = 6;
/** BECAUSE test-4 zoom-loop evidence: fires at call #2 — the pipeline context
 *  says the target week is BEHIND the visible range and zoom is the wrong verb. */
export const D13_MIN_SAME_ZOOM = 2;
/** BECAUSE §5.3: flood control — the deepest issue speaks first. */
export const MAX_FINDINGS = 3;

export type DetectorCode =
  | 'ACTION_REPETITION' | 'TOOL_FAILURE_STREAK' | 'STATE_OSCILLATION'
  | 'NAV_STAGNATION' | 'PERCEPTION_LOOP' | 'CLICK_LOOP'
  | 'NAVIGATION_DRIFT' | 'PROGRESS_STAGNATION' | 'EXCESSIVE_SCREENSHOTS'
  | 'TEMPORAL_ANCHOR' | 'DRAW_DUPLICATE' | 'COORD_SPAM'
  | 'WRONG_VERB';

export interface Finding {
  code: DetectorCode;
  severity: 'INFO' | 'WARN' | 'BLOCK';
  toolName: string;
  repeatCount: number;
  evidence: Record<string, string | number | boolean>;  // counts, hashes, args — never prose-only
}

/** MPSE contract form (§5.3): the same predicate, replayable offline. */
export const DETECTOR_MATH_EXPRS: Record<DetectorCode, string> = {
  ACTION_REPETITION: 'card({a ∈ last(3, actions) : a.signature = head(actions).signature}) = 3',
  TOOL_FAILURE_STREAK: '∃tool : streaks[tool].failures ≥ 3',
  STATE_OSCILLATION: 'card({i ∈ 0..5 : history[i] = (i mod 2 = 0 ? A : B)}) ≥ 5 ∧ A ≠ B',
  NAV_STAGNATION: '∀a ∈ last(3, nav(actions)) : a.outcome = unchanged',
  PERCEPTION_LOOP: 'last(3, screenshotHashes) all equal',
  CLICK_LOOP: '∀c ∈ last(3, clicks) : |c − last| < 20px per axis',
  NAVIGATION_DRIFT: 'card(nav ∩ last(5)) ≥ 3 ∧ card(productive ∩ last(5)) = 0',
  PROGRESS_STAGNATION: '∀a ∈ last(5) : a ∉ productive',
  EXCESSIVE_SCREENSHOTS: 'card(screenshots) ≥ 5 ∧ card(reads) = 0',
  TEMPORAL_ANCHOR: 'anchorCoverage < 0.6 ∧ phase = perception',
  DRAW_DUPLICATE: 'last(draws).signature ∈ signatures(draws[:-1])',
  COORD_SPAM: 'card({p ∈ probes : p.viewHash = currentHash}) > 6 ∧ affine.calibratedAt = currentHash',
  WRONG_VERB: 'last.tool ⊃ zoom ∧ anchor.weekStartMs < current.barStartMs ∧ card(last(3) ∩ tool) ≥ 2',
};

// ── D1: last 3 signatures identical (§7.1) ──────────────────────────────────
function d1(l: VeiLedger, _t?: TruthLayer, _p?: GuiProfile): Finding | null {
  if (l.actions.length < D1_REPETITION_COUNT) return null;
  const [a, b, c] = l.actions.slice(-D1_REPETITION_COUNT);
  if (a.signature === b.signature && b.signature === c.signature) {
    return {
      code: 'ACTION_REPETITION', severity: 'WARN',
      toolName: c.tool, repeatCount: D1_REPETITION_COUNT,
      evidence: {
        signature: c.signature, argsHash: c.argsHash,
        outcomes: [a.outcome, b.outcome, c.outcome].join(','),
        viewUnchanged: a.viewHashAfter !== null && a.viewHashAfter === c.viewHashAfter,
      },
    };
  }
  return null;
}

// ── D2: per-tool consecutive failed ≥ 3 (§7.1) ──────────────────────────────
function d2(l: VeiLedger, _t?: TruthLayer, _p?: GuiProfile): Finding | null {
  for (const [tool, streak] of Object.entries(l.toolStreaks)) {
    if (streak.failures >= D2_FAILURE_STREAK) {
      return {
        code: 'TOOL_FAILURE_STREAK', severity: 'WARN',
        toolName: tool, repeatCount: streak.failures,
        evidence: { lastArgsHash: streak.lastArgsHash, failures: streak.failures },
      };
    }
  }
  return null;
}

// ── D3: last 6 view hashes alternate A,B ≥ 5 of 6 (§7.1) ────────────────────
function d3(_l: VeiLedger, t: TruthLayer): Finding | null {
  if (t.history.length < D3_HISTORY) return null;
  const last6 = t.history.slice(-D3_HISTORY);
  const [A, B] = [last6[0], last6[1]];
  if (A === B) return null;
  let matches = 0;
  for (let i = 0; i < D3_HISTORY; i++) {
    if (last6[i] === (i % 2 === 0 ? A : B)) matches++;
  }
  if (matches >= D3_MIN_MATCHES) {
    return {
      code: 'STATE_OSCILLATION', severity: 'WARN',
      toolName: 'navigation', repeatCount: matches,
      evidence: { hashA: A, hashB: B, matches },
    };
  }
  return null;
}

// ── D4: 3 consecutive nav-class with outcome=unchanged (§7.1) ───────────────
function d4(l: VeiLedger, _t: TruthLayer, p: GuiProfile): Finding | null {
  const navActions = l.actions.filter((a) => p.navClass.has(a.tool));
  const last3 = navActions.slice(-D4_NAV_STREAK);
  if (last3.length < D4_NAV_STREAK) return null;
  if (last3.every((a) => a.outcome === 'unchanged')) {
    return {
      code: 'NAV_STAGNATION', severity: 'WARN',
      toolName: last3[2].tool, repeatCount: D4_NAV_STREAK,
      evidence: { tools: last3.map((a) => a.tool).join(','), viewHash: last3[2].viewHashAfter ?? 'null' },
    };
  }
  return null;
}

// ── D5: last 3 screenshot hashes identical (§7.1) ───────────────────────────
function d5(l: VeiLedger, _t?: TruthLayer, _p?: GuiProfile): Finding | null {
  if (l.screenshotHashes.length < D5_SHOT_REPEAT) return null;
  const [a, b, c] = l.screenshotHashes.slice(-D5_SHOT_REPEAT);
  if (a === b && b === c) {
    return {
      code: 'PERCEPTION_LOOP', severity: 'WARN',
      toolName: 'tv_screenshot', repeatCount: D5_SHOT_REPEAT,
      evidence: { hash: a },
    };
  }
  return null;
}

// ── D6: last 3 click-class within 20px center-distance (§7.1, SEL exact) ────
function d6(l: VeiLedger, _t?: TruthLayer, _p?: GuiProfile): Finding | null {
  const clicks = l.actions
    .filter((a) => a.tool.endsWith('click') && a.clickX !== undefined && a.clickY !== undefined)
    .slice(-3);
  if (clicks.length < 3) return null;
  const target = clicks[2];
  const ok = clicks.every(
    (c) => Math.abs((c.clickX as number) - (target.clickX as number)) < D6_CLICK_PROXIMITY_PX
        && Math.abs((c.clickY as number) - (target.clickY as number)) < D6_CLICK_PROXIMITY_PX,
  );
  if (ok) {
    return {
      code: 'CLICK_LOOP', severity: 'WARN',
      toolName: target.tool, repeatCount: 3,
      evidence: { centerX: target.clickX as number, centerY: target.clickY as number },
    };
  }
  return null;
}

// ── D7: 3 nav-class within 5 actions, zero productive verbs between (§7.1) ──
function d7(l: VeiLedger, _t: TruthLayer, p: GuiProfile): Finding | null {
  const last5 = l.actions.slice(-D7_WINDOW);
  if (last5.length < D7_WINDOW) return null; // see D7_WINDOW provenance above (V13)
  const navCount = last5.filter((a) => p.navClass.has(a.tool)).length;
  const productiveCount = last5.filter((a) => p.productiveTools.has(a.tool)).length;
  if (navCount >= D7_NAV_MIN && productiveCount === 0) {
    return {
      code: 'NAVIGATION_DRIFT', severity: 'WARN',
      toolName: 'navigation', repeatCount: navCount,
      evidence: { navCount, productiveCount },
    };
  }
  return null;
}

// ── D8: last 5 actions, zero productive-allowlist verbs (§7.1) ──────────────
function d8(l: VeiLedger, _t: TruthLayer, p: GuiProfile): Finding | null {
  const last5 = l.actions.slice(-D8_WINDOW);
  if (last5.length < D8_WINDOW) return null;
  if (last5.every((a) => !p.productiveTools.has(a.tool))) {
    return {
      code: 'PROGRESS_STAGNATION', severity: 'WARN',
      toolName: last5[4].tool, repeatCount: D8_WINDOW,
      evidence: { tools: last5.map((a) => a.tool).join(',') },
    };
  }
  return null;
}

// ── D9: ≥5 screenshot-class in window with zero read markers (§7.1) ─────────
function d9(l: VeiLedger, _t?: TruthLayer, _p?: GuiProfile): Finding | null {
  const shots = l.actions.filter((a) => a.tool.endsWith('screenshot'));
  const reads = l.actions.filter((a) => a.tool === 'read');
  if (shots.length >= D9_MIN_SHOTS && reads.length === 0) {
    return {
      code: 'EXCESSIVE_SCREENSHOTS', severity: 'WARN',
      toolName: 'tv_screenshot', repeatCount: shots.length,
      evidence: { shots: shots.length, reads: reads.length },
    };
  }
  return null;
}

// ── D10: anchorCoverage < 0.6 during perception (§7.1 — the only BLOCK) ─────
function d10(_l: VeiLedger, t: TruthLayer, _p: GuiProfile): Finding | null {
  if (!t.anchor) return null;                       // inert without pipeline context
  const coverage = anchorCoverage(t);
  if (coverage === null) return null;               // no view-state yet — inert
  if (coverage < D10_MIN_COVERAGE && t.phase === 'perception') {
    return {
      code: 'TEMPORAL_ANCHOR', severity: 'BLOCK',
      toolName: 'screenshot/verdicts', repeatCount: 1,
      evidence: {
        coverage,
        visibleStart: t.current?.barStartMs ?? 0,
        visibleEnd: t.current?.barEndMs ?? 0,
        anchorStart: t.anchor.weekStartMs,
        anchorEnd: t.anchor.anchorMs,
      },
    };
  }
  return null;
}

// ── D11: draw-class signature seen before with same args (§7.1) ─────────────
function d11(l: VeiLedger, _t: TruthLayer, p: GuiProfile): Finding | null {
  const draws = l.actions.filter((a) => p.drawClass.has(a.tool));
  if (draws.length === 0) return null;
  const seen = new Set(draws.slice(0, -1).map((a) => a.signature));
  const last = draws[draws.length - 1];
  if (last && seen.has(last.signature)) {
    return {
      code: 'DRAW_DUPLICATE', severity: 'INFO',
      toolName: last.tool, repeatCount: draws.filter((a) => a.signature === last.signature).length,
      evidence: { signature: last.signature },
    };
  }
  return null;
}

// ── D12: >6 find_price_y in one view while affine fitted (§7.1) ─────────────
function d12(l: VeiLedger, t: TruthLayer, _p?: GuiProfile): Finding | null {
  const probes = l.actions.filter((a) => a.tool.endsWith('find_price_y'));
  const thisView = probes.filter((a) => a.viewHashAfter !== null && a.viewHashAfter === t.currentHash);
  if (thisView.length > D12_MAX_PROBES && t.affine && t.affine.calibratedAt === t.currentHash) {
    return {
      code: 'COORD_SPAM', severity: 'WARN',
      toolName: 'find_price_y', repeatCount: thisView.length,
      evidence: { probes: thisView.length, calibrated: true, residual: t.affine.maxResidual },
    };
  }
  return null;
}

// ── D13: zoom-class with a past-week target in context (§7.1) ───────────────
// The pipeline context reaches the detector via truth.anchor (set from the
// observed weekStart) — the same data as §7.1's `ctx.weekStartMs`, keeping the
// detector signature total: (ledger, truth, profile).
function d13(l: VeiLedger, t: TruthLayer, _p: GuiProfile): Finding | null {
  const last = l.actions[l.actions.length - 1];
  if (!last || !last.tool.includes('zoom')) return null;
  const weekStartMs = t.anchor?.weekStartMs;
  if (weekStartMs !== undefined && weekStartMs < (t.current?.barStartMs ?? Infinity)) {
    // the target week is LEFT of the visible range — temporal navigation needed
    const recentSameZoom = l.actions.slice(-3).filter((a) => a.tool === last.tool).length;
    if (recentSameZoom >= D13_MIN_SAME_ZOOM) {
      return {
        code: 'WRONG_VERB', severity: 'WARN',
        toolName: last.tool, repeatCount: recentSameZoom,
        evidence: {
          targetWeekStart: weekStartMs,
          visibleStart: t.current?.barStartMs ?? 0,
          direction: 'past',
        },
      };
    }
  }
  return null;
}

type Detector = (l: VeiLedger, t: TruthLayer, p: GuiProfile) => Finding | null;

/** Fixed evaluation order (§5.3): BLOCK first, loop-class, navigation-class,
 *  hygiene. */
const EVALUATION_ORDER: Detector[] = [
  d10, // BLOCK-severity first
  d1, d2, d3, d5, // loop-class
  d4, d7, d13, // navigation-class
  d6, d8, d9, d11, d12, // hygiene
];

/** Evaluate all 13 detectors in fixed order; first MAX_FINDINGS win. Total:
 *  every (ledger, truth, profile) state → exactly one Finding[] verdict. */
export function evaluate(l: VeiLedger, t: TruthLayer, profile: GuiProfile): Finding[] {
  const findings: Finding[] = [];
  for (const d of EVALUATION_ORDER) {
    const f = d(l, t, profile);
    if (f) {
      findings.push(f);
      if (findings.length >= MAX_FINDINGS) break;
    }
  }
  return findings;
}
