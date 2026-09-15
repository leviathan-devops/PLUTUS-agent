// Plutus V5 E1 — src/e1/machines/shape-chain.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/shape-chain.md)
// LEXICON 5 — SHAPE-CHAIN-LEXICON machine skeleton.
// The chain semantics — the operator's fractal doctrine: "everything is fractal...
// BS/R/WL --> WLS --> SS (micro, 30m) and BS/R/WL --> SS (macro, 4H). Both are valid."
// + the unified macro authority (the operator's law: "they ARE allowed to have their
// own mechanics but unified macro signal has authority" — the GU Monday R divergence!).
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 5 — the
// family table lines 200-209). The MPSE form: the recurrence relation (the chain) +
// the composition operator (g∘f over the day decomposition — the fractal layers!) +
// the set membership (the shape ∈ the chain's domain).

import type { LexiconData, MachineRule, OHLCBar, PatternFamily } from '../core/types';
import { classify, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, operativeZone } from '../core/engine';

const lastShape = (data: LexiconData): string | undefined => data.shapeChain[data.shapeChain.length - 1];
const zfp = (data: LexiconData): number => operativeZone(data)?.zfp ?? 0;
const lastCandle = (data: LexiconData): OHLCBar | undefined => {
  const bs = data.bars.filter((b) => b.t <= data.meta.anchorMs);
  return bs[bs.length - 1];
};
const avgBodyBefore = (data: LexiconData, shape: string): number => {
  const idx = data.shapeChain.lastIndexOf(shape as never);
  if (idx <= 0) return data.meta.atr14 * 0.2; // PROPOSED: the SS-body fallback
  const bs = data.bars.filter((b) => b.t <= data.meta.anchorMs);
  return Math.abs((bs[bs.length - 1]?.C ?? 0) - (bs[bs.length - 1]?.O ?? 0)) || data.meta.atr14 * 0.2;
};

// ── the SS-to-BS family — the breakout step ───────────────────────────────────
function marubozuBreakout(data: LexiconData): boolean {
  // the marubozu breakout (3-5x the SS body, bf > 0.65, minimal wicks) → BS
  const c = lastCandle(data); if (!c) return false;
  const body = Math.abs(c.C - c.O);
  const wick = Math.max(c.H, c.L) - Math.max(c.O, c.C) + Math.min(c.O, c.C) - Math.min(c.H, c.L);
  const bf = body / Math.max(c.H - c.L, 1e-12);
  return bf > 0.65 && wick < 0.2 * body && body >= 3 * avgBodyBefore(data, 'SS');
}
function zfpConditionedBs(data: LexiconData): boolean {
  // the ZFP-conditioned: SS + the bounding zone > 45% → BS (src/e1/lexicons/shape-chain.md)
  return lastShape(data) === 'SS' && zfp(data) > 0.45;
}
function exhaustionPinBar(data: LexiconData): boolean {
  // the exhaustion pin bar (the R! — the descriptive for the SS-to-BS step)
  const c = lastCandle(data); if (!c) return false;
  const wick = Math.max(c.H, c.L) - Math.max(c.O, c.C) + Math.min(c.O, c.C) - Math.min(c.H, c.L);
  return wick > 2 * Math.abs(c.C - c.O);
}
function singleBsCandle(data: LexiconData): boolean {
  // the BS's single candle (one candle != the chain step! — the substitute)
  return lastShape(data) !== 'SS' && zfp(data) > 0.45;
}
function ssLowZfp(data: LexiconData): boolean {
  // the SS (when the bounding zfp < 30% — the exemptor)
  return lastShape(data) === 'SS' && zfp(data) < 0.30;
}

// ── the BS-to-R family — the exhaustion → recovery step ───────────────────────
function bsTargetRetrace(data: LexiconData): boolean {
  // BS + the target 20-40% → R (src/e1/lexicons/shape-chain.md)
  return lastShape(data) === 'BS' && zfp(data) >= 0.20 && zfp(data) <= 0.40;
}
function hardWall(data: LexiconData): boolean {
  // the hard wall (the RWL! — the descriptive)
  return lastShape(data) === 'BS' && zfp(data) < 0.20;
}

// ── the BS-to-RWL family — the hard-wall step ─────────────────────────────────
function shootingStarEngulfing(data: LexiconData): boolean {
  // the shooting star / engulfing at the top → RWL
  const c = lastCandle(data); if (!c) return false;
  const upperWick = c.H - Math.max(c.O, c.C);
  const lowerWick = Math.min(c.O, c.C) - c.L;
  return upperWick > 2 * Math.abs(c.C - c.O) || lowerWick > 2 * Math.abs(c.C - c.O);
}
function bsTargetBelowTwenty(data: LexiconData): boolean {
  // BS + the target < 20% → RWL (the hard wall!)
  return lastShape(data) === 'BS' && zfp(data) < 0.20;
}
function moderateRetrace(data: LexiconData): boolean {
  // the moderate retrace (the R! — the descriptive)
  return lastShape(data) === 'BS' && zfp(data) >= 0.20 && zfp(data) <= 0.40;
}

// ── the R-to-WL family — the liquidity-grab step ──────────────────────────────
function longWickLiquidityGrab(data: LexiconData): boolean {
  // the long-wick liquidity grab at the recovery extreme → WL
  const c = lastCandle(data); if (!c) return false;
  const wick = Math.max(c.H, c.L) - Math.max(c.O, c.C) + Math.min(c.O, c.C) - Math.min(c.H, c.L);
  return lastShape(data) === 'R' && wick >= Math.abs(c.C - c.O);
}
function continuationNotGrab(data: LexiconData): boolean {
  // the continuation (the BS! — the descriptive)
  return lastShape(data) === 'BS';
}

// ── the WL-to-SS family — the consolidation step ──────────────────────────────
function immediateConsolidation(data: LexiconData): boolean {
  // the IMMEDIATE consolidation after the lash → SS
  return lastShape(data) === 'WL' && zfp(data) < 0.30;
}
function furtherLash(data: LexiconData): boolean {
  // the further lash (the RWL! — the descriptive)
  return lastShape(data) === 'WL' && zfp(data) >= 0.30;
}

// ── the MICRO-vs-MACRO family — THE FRACTAL + THE UNIFIED MACRO AUTHORITY ─────
function sameChainBothTfs(data: LexiconData): boolean {
  // the SAME chain valid at the 30m micro AND the 4H macro — both valid (the
  // operator's fractal doctrine!)
  return data.shapeChain.length >= 2;
}
function chainsContradict(data: LexiconData): boolean {
  // the chains contradicting (the micro and the macro disagree! — the descriptive)
  return data.e2 && typeof data.e2 === 'object' && 'macroDirection' in data.e2 && data.shapeChain.length >= 1 && data.e2.macroDirection !== lastShape(data);
}
function microOnlyReading(data: LexiconData): boolean {
  // the micro-only reading (the 30m precision != the 4H macro! — the substitute)
  return data.meta.tf === '30m' && data.shapeChain.length >= 1;
}
function unifiedMacroAuthority(data: LexiconData): boolean {
  // the unified macro authority (the DXY's chain for the EU, the EU core's for the GU
  // — the divergence = the per-pair mechanics WITHOUT the macro override! — the exemptor)
  return data.e2 !== undefined && typeof data.e2 === 'object' && 'macroDirection' in data.e2 && data.e2.macroDirection === (data.meta.currentShape ?? lastShape(data));
}

export const SHAPE_CHAIN_FAMILIES: PatternFamily[] = [
  { group: 'chain-predicate', descriptive: [exhaustionPinBar], suggestive: [marubozuBreakout, zfpConditionedBs], substitute: [singleBsCandle], use: [ssLowZfp] },
  { group: 'chain-predicate', descriptive: [hardWall], suggestive: [bsTargetRetrace, exhaustionPinBar], substitute: [], use: [] },
  { group: 'chain-predicate', descriptive: [moderateRetrace], suggestive: [shootingStarEngulfing, bsTargetBelowTwenty], substitute: [], use: [] },
  { group: 'chain-predicate', descriptive: [continuationNotGrab], suggestive: [longWickLiquidityGrab], substitute: [], use: [] },
  { group: 'chain-predicate', descriptive: [furtherLash], suggestive: [immediateConsolidation], substitute: [], use: [] },
  { group: 'chain-predicate', descriptive: [chainsContradict], suggestive: [sameChainBothTfs], substitute: [microOnlyReading], use: [unifiedMacroAuthority] },
];

export const shapeChainMachine: MachineRule = {
  id: 'shape-chain',
  families: SHAPE_CHAIN_FAMILIES,
  classify: (input) => classify(input, SHAPE_CHAIN_FAMILIES),
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        throw buildBlock('shape-chain', result.evidence || 'rejected chain step', '3 failed refinements → the problem-solving dispatch. The failure data is stored + synthesized at the pipeline end.', phase);
      }
      throw buildRefineWarning('shape-chain', result.evidence || 'rejected chain step', `Refine/retry (${used}/3): the chain = the recurrence (nextShape = predictNextShapePressureAware — the S1 transitions) — re-run with the ZFP-conditioned transition matrix + the chain state context.`, used);
    }
    if (phase === 'B') st.auditTrail.push(`shape-chain: ${result.intent} conf ${result.confidence.toFixed(2)} — the authority-override demand appended to the day decomposition`);
  },
  escapeHatchTool: 'probe-shape',   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
