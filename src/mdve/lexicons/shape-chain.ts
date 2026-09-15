/**
 * shape-chain.ts — LEXICON 5: the fractal chain semantics + the unified macro
 * authority.
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 5 — the design authority.)
 *
 * THE PURPOSE: the chain semantics — the operator's fractal doctrine: "everything
 * is fractal... BS/R/WL --> WLS --> SS (micro, 30m) and BS/R/WL --> SS (macro,
 * 4H). Both are valid." + the unified macro authority: "they ARE allowed to have
 * their own mechanics but unified macro signal has authority" (the GU Monday R
 * divergence!).
 *
 * THE INPUTS: the per-day shapes (the E2's decomposition) + the contested zone's
 *   pressure state + the ZFP-conditioned transition matrix (shape-brain.ts:874-
 *   888) + the chain state (the prior days' shapes).
 *
 * THE OUTPUTS: the chain (max 5 — the day decomposition) + the UNIFIED MACRO
 *   AUTHORITY (the authoritative shape per day across the 3 pairs!) + the
 *   fractal-validity flags (the micro/macro both-valid!).
 *
 * THE FAMILIES (the ZFP-conditioned transitions + the fractal):
 *   ss-to-bs  — the marubozu breakout (3-5× the SS body, bf > 0.65, minimal
 *               wicks) → BS · SS + the bounding zone > 45% → BS
 *   bs-to-r   — the exhaustion pin bar → R · BS + the target 20-40% → R
 *   bs-to-rwl — the shooting star / engulfing at the top → RWL · BS + the
 *               target < 20% → RWL (the hard wall!)
 *   r-to-wl   — the long-wick liquidity grab at the recovery extreme → WL
 *   wl-to-ss  — the IMMEDIATE consolidation after the lash → SS
 *   micro-vs-macro — THE FRACTAL: the SAME chain valid at the 30m micro AND
 *               the 4H macro; the UNIFIED MACRO AUTHORITY — the DXY's chain for
 *               the EU, the EU core's for the GU — the divergence = the per-pair
 *               mechanics WITHOUT the macro override!
 *
 * THE ENFORCEMENT: Phase A — a day whose per-pair shape diverges from the macro
 *   authority without a documented per-pair mechanic → THROW at the E2 boundary
 *   (the divergence is the bug!); Phase B — the authority-override demand
 *   appended to the day decomposition.
 */
import {
  classifyByFamilies,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';

// ── the canon transition gates (shape-brain.ts:874-888 — the ZFP-conditioned
//    matrix; the ZFP_SS_TO_BS_THRESHOLD = 45 — shape-brain.ts:158) ──
const SS_TO_BS_ZFP = 45;
const BS_TARGET_R_RANGE = 0.2;   // 20-40% → R
const BS_TARGET_R_HIGH = 0.4;
const BS_TARGET_RWL_MAX = 0.2;   // < 20% → RWL (the hard wall)
const MARUBOZU_BODY = 0.65;
const MARUBOZU_MIN_MULT = 3;     // 3-5× the SS body
const MARUBOZU_MAX_MULT = 5;

// ── THE FAMILIES (the transitions — each predicate a deterministic comparison) ──

/** ss-to-bs — the marubozu breakout + the ZFP-conditioned SS → BS. */
const ssToBsFamily = {
  id: 'SS_TO_BS',
  group: 'chain-predicate' as const,
  suggestive: [
    // the marubozu breakout: the body 3-5× the SS body, bf > 0.65, minimal wicks
    (d: LexiconData): boolean => {
      const mult = d.breakoutBodyRatio ?? 0;
      return mult >= MARUBOZU_MIN_MULT && mult <= MARUBOZU_MAX_MULT &&
        (d.bodyFraction ?? 0) > MARUBOZU_BODY;
    },
    // the ZFP-conditioned: SS + the bounding zone > 45% → BS
    (d: LexiconData): boolean =>
      d.currentShape === 'SS' && (d.boundingZoneZfp ?? 0) > SS_TO_BS_ZFP,
  ],
  descriptive: [
    // the exhaustion pin bar (the R!)
    (d: LexiconData): boolean => (d.retracementSize ?? 0) >= 0.5 && (d.bodyFraction ?? 0) < 0.4,
  ],
  substitute: [
    // the BS's single candle (one candle ≠ the chain step!) — pos +2
    (d: LexiconData): boolean => (d.candleCount ?? 99) <= 1,
  ],
  use: [
    // the SS (when the bounding zfp < 30%)
    (d: LexiconData): boolean => d.currentShape === 'SS' && (d.boundingZoneZfp ?? 100) < 30,
  ],
};

/** bs-to-r — the exhaustion pin bar → R · BS + the target 20-40% → R. */
const bsToRFamily = {
  id: 'BS_TO_R',
  group: 'chain-predicate' as const,
  suggestive: [
    // the exhaustion pin bar → R
    (d: LexiconData): boolean => (d.retracementSize ?? 0) >= 0.5 && d.currentShape === 'BS',
    // BS + the target 20-40% → R (shape-brain.ts:877)
    (d: LexiconData): boolean =>
      d.currentShape === 'BS' &&
      (d.targetRetrace ?? 0) >= BS_TARGET_R_RANGE &&
      (d.targetRetrace ?? 0) <= BS_TARGET_R_HIGH,
  ],
  descriptive: [
    // the hard wall (the RWL!)
    (d: LexiconData): boolean => (d.targetRetrace ?? 0) < BS_TARGET_RWL_MAX,
  ],
};

/** bs-to-rwl — the shooting star / engulfing at the top → RWL · BS + the
 *  target < 20% → RWL (the hard wall!). */
const bsToRwlFamily = {
  id: 'BS_TO_RWL',
  group: 'chain-predicate' as const,
  suggestive: [
    // BS + the target < 20% → RWL (the hard wall!)
    (d: LexiconData): boolean =>
      d.currentShape === 'BS' && (d.targetRetrace ?? 1) < BS_TARGET_RWL_MAX,
  ],
  descriptive: [
    // the moderate retrace (the R!)
    (d: LexiconData): boolean =>
      (d.targetRetrace ?? 0) >= BS_TARGET_R_RANGE && (d.targetRetrace ?? 0) <= BS_TARGET_R_HIGH,
  ],
};

/** r-to-wl — the long-wick liquidity grab at the recovery extreme → WL. */
const rToWlFamily = {
  id: 'R_TO_WL',
  group: 'chain-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => d.currentShape === 'R' && d.liquidityGrab === true,
    (d: LexiconData): boolean => d.currentShape === 'R' && (d.wickRatio ?? 0) >= 0.4,
  ],
  descriptive: [
    // the continuation (the BS!)
    (d: LexiconData): boolean => d.currentShape === 'R' && (d.bodyFraction ?? 0) > 0.6,
  ],
};

/** wl-to-ss — the IMMEDIATE consolidation after the lash → SS. */
const wlToSsFamily = {
  id: 'WL_TO_SS',
  group: 'chain-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => d.currentShape === 'WL' && (d.bodyFraction ?? 0) <= 0.3,
    (d: LexiconData): boolean => d.currentShape === 'WL' && (d.boundingZoneZfp ?? 100) < 30,
  ],
  descriptive: [
    // the further lash (the RWL!)
    (d: LexiconData): boolean => d.currentShape === 'WL' && (d.wickRatio ?? 0) >= 0.5,
  ],
};

/** micro-vs-macro — THE FRACTAL + the UNIFIED MACRO AUTHORITY. */
const microVsMacroFamily = {
  id: 'MICRO_VS_MACRO',
  group: 'chain-predicate' as const,
  suggestive: [
    // the SAME chain valid at the 30m micro AND the 4H macro — both valid
    (d: LexiconData): boolean =>
      !!d.perPairShape && !!d.macroShape && d.perPairShape === d.macroShape,
  ],
  descriptive: [
    // the chains contradicting (the micro and the macro disagree!)
    (d: LexiconData): boolean =>
      !!d.perPairShape && !!d.macroShape && d.perPairShape !== d.macroShape,
  ],
  substitute: [
    // the micro-only reading (the 30m precision ≠ the 4H macro!) — pos +2
    (d: LexiconData): boolean => !!d.perPairShape && !d.macroShape,
  ],
  use: [
    // the unified macro authority (the DXY's chain for the EU, the EU core's
    // for the GU — the divergence = the per-pair mechanics WITHOUT the macro
    // override!) — a documented per-pair mechanic legitimizes the divergence
    (d: LexiconData): boolean =>
      !!d.perPairShape && !!d.macroShape && d.perPairShape !== d.macroShape &&
      !!d.perPairMechanic,
  ],
};

export const shapeChainLexicon: TradingLexiconRule = {
  id: 'shape-chain',
  families: [ssToBsFamily, bsToRFamily, bsToRwlFamily, rToWlFamily, wlToSsFamily, microVsMacroFamily],
  escapeHatchTool: 'diag-e2-forward',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    // THE UNIFIED MACRO AUTHORITY (the operator's law: the unified macro signal
    // has authority). When the per-pair shape diverges from the macro authority:
    //   - WITH a documented per-pair mechanic → the divergence is LEGITIMATE
    //     (the per-pair mechanics allowed) → the per-pair shape classifies
    //     (the micro-vs-macro family's use-exemptor — the divergence is REAL).
    //   - WITHOUT a mechanic → the divergence is a BUG → the authority override
    //     fires (the authoritative shape = the macro shape) + the violation is
    //     recorded (Phase A throws on it).
    if (!!input.perPairShape && !!input.macroShape && input.perPairShape !== input.macroShape) {
      if (input.perPairMechanic) {
        const base = classifyByFamilies(shapeChainLexicon.families, input);
        return { ...base, intent: input.perPairShape, action: 'classify' };
      }
      const base = classifyByFamilies(shapeChainLexicon.families, input);
      return { ...base, intent: input.macroShape, action: 'classify', violation: `per-pair ${input.perPairShape} diverges from the macro authority ${input.macroShape} without a documented mechanic` };
    }
    return classifyByFamilies(shapeChainLexicon.families, input);
  },
  enforce(result: LexiconResult, phase: 'A' | 'B'): void {
    if (phase === 'A') {
      // Phase A — the boundary THROW: a day whose per-pair shape diverges from
      // the macro authority without a documented per-pair mechanic → the
      // divergence is the bug (the unified macro check).
      if (result.violation) {
        throw new Error(
          `[SHAPE-CHAIN PHASE-A] ${result.violation}. Escape: ` +
          `${shapeChainLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    // Phase B — the authority-override demand appended to the day decomposition.
    result.demand = `shape-chain: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};

/** The unified macro authority — the authoritative shape per day: the per-pair
 *  shape unless it diverges without a documented mechanic, in which case the
 *  macro shape wins (the GU Monday R → SS override). */
export function unifiedMacroShape(input: LexiconData): string {
  if (!!input.perPairShape && !!input.macroShape && input.perPairShape !== input.macroShape && !input.perPairMechanic) {
    return input.macroShape;
  }
  return input.perPairShape ?? input.macroShape ?? 'UNKNOWN';
}
