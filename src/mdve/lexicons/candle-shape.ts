/**
 * candle-shape.ts — LEXICON 2: the per-candle shape signatures.
 * (PLUTUS_V4.5.4_LEXICON_SPEC.md LEXICON 2 — the design authority.)
 *
 * The impulse/reversal/consolidation candle signatures that feed the E2 shape
 * classification — the SS/BS/R/WL/RWL/WLS anatomy. The shape is the CANDLE-
 * LEVEL grammar; the chain (Lexicon 5) is the SENTENCE.
 *
 * THE INPUTS (the L2-spec:861-864 anatomy tokens — passed in, never derived
 *   from prose): body_fraction (bf), body_to_wick, wick_ratio,
 *   total_range_ratio, color_consistency, candle_progression,
 *   retracement_size — over the 3-day window.
 *
 * THE OUTPUTS: the shape code (SS/BS/R/WL/RWL/WLS/PBS) + the confidence —
 *   the input to the E2's identifyCurrentShape/classifyShape
 *   (shape-brain.ts:331/890).
 *
 * THE FAMILIES (the canon anatomy — Bible 4.5 §14 + the TTE shape zones):
 *   ss   — bf 0.10-0.30 · range 0.2-0.5× context · alternating colors ·
 *          BOTH bounding zones' zfp < 30% (shape-brain.ts:905-907)
 *   bs   — thrust bf 0.65-0.95 · minimal wicks < 0.2 · PROGRESSION
 *          small→MASSIVE · retracements < 30% · the bounding zone's zfp > 45%
 *          (shape-brain.ts:909-915)
 *   wl   — 3 same-color candles · long wicks ~1× the body (TTE:177-179)
 *   rwl  — 6+ candles · bf 0.30-0.50 · the mixed reverse-dominant
 *          (+ the C-3 sub-forms: RWL-rapid / RWL-gradual — the operator's
 *          golden doc: RWL "often 1-2 large fat aggressive fast candles")
 *   r    — 6-24 candles · bf 0.40-0.60 · the V-shape
 *   wls  — 14-15+ candles · the both-side wicks · 3+ moderate-zfp zones in a
 *          narrow band (shape-brain.ts:393-422)
 *   (+ the C-3 sub-forms: WL-compact (3, all-same-color) / WL-extended
 *   (4-6, mechanics + chain-context classified)).
 *
 * THE SCORING + THE DECISION: the shape = argmax over the families' pos−neg
 *   scores; the confidence = pos/(pos+neg+1); the tie → the zone-interaction
 *   classifyShape (the E2's existing refinement — consumed, never overridden).
 *
 * THE ENFORCEMENT: Phase A — a day the lexicon classifies BS but the E2
 *   classifies PBS (the divergence!) → THROW at the E2 boundary (the unified
 *   macro check); Phase B — the shape demand appended to the E2's day
 *   decomposition.
 */
import {
  classifyByFamilies,
  type LexiconData,
  type LexiconResult,
  type TradingLexiconRule,
} from './types.js';

// ── the canon anatomy bands (the TTE shape zones — cited, never imported) ──
const BF_SS_LOW = 0.1;
const BF_SS_HIGH = 0.3;
const BF_BS_LOW = 0.65;
const BF_BS_HIGH = 0.95;
const BF_RWL_LOW = 0.3;
const BF_RWL_HIGH = 0.5;
const BF_R_LOW = 0.4;
const BF_R_HIGH = 0.6;
const WICK_BS_MAX = 0.2;
const RANGE_SS_LOW = 0.2;
const RANGE_SS_HIGH = 0.5;
const RETRACE_BS_MAX = 0.3;
const ZFP_SS_MAX = 30;
const ZFP_BS_MIN = 45;

// ── THE FAMILIES (the canon anatomy — each predicate a deterministic comparison) ──

/** ss — the scalp/consolidation. */
const ssFamily = {
  id: 'SS',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => {
      const bf = d.bodyFraction ?? -1;
      return bf >= BF_SS_LOW && bf <= BF_SS_HIGH;
    },
    (d: LexiconData): boolean => {
      const rr = d.totalRangeRatio ?? -1;
      return rr >= RANGE_SS_LOW && rr <= RANGE_SS_HIGH;
    },
    (d: LexiconData): boolean => (d.colorConsistency ?? 0) < 0.5,
    (d: LexiconData): boolean =>
      (d.boundingZoneZfp ?? 100) < ZFP_SS_MAX,
  ],
  descriptive: [
    (d: LexiconData): boolean => (d.bodyFraction ?? 0) > 0.6,
    (d: LexiconData): boolean => (d.boundingZoneZfp ?? 0) > ZFP_BS_MIN,
  ],
  substitute: [
    // the narrow-range candle in a trend (the range ≠ the consolidation)
    (d: LexiconData): boolean => {
      const rr = d.totalRangeRatio ?? -1;
      return rr < RANGE_SS_LOW && (d.bodyFraction ?? 0) <= 0.3;
    },
  ],
  use: [
    // the WLS signature (the 14-15+ candle storm — the ss-lookalike)
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 14,
  ],
};

/** bs — the breakout surge. */
const bsFamily = {
  id: 'BS',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => {
      const bf = d.bodyFraction ?? -1;
      return bf >= BF_BS_LOW && bf <= BF_BS_HIGH;
    },
    (d: LexiconData): boolean => (d.wickRatio ?? 1) < WICK_BS_MAX,
    (d: LexiconData): boolean => (d.candleProgression ?? 0) >= 0.6,
    (d: LexiconData): boolean => (d.retracementSize ?? 1) < RETRACE_BS_MAX,
    (d: LexiconData): boolean => (d.boundingZoneZfp ?? 0) > ZFP_BS_MIN,
  ],
  descriptive: [
    // the moderate bf (0.30-0.60 — a recovery, not a breakout!)
    (d: LexiconData): boolean => {
      const bf = d.bodyFraction ?? 0;
      return bf >= 0.3 && bf <= 0.6;
    },
  ],
  substitute: [
    // the single big candle (one candle ≠ a BS — the BS is the PROGRESSION!)
    (d: LexiconData): boolean => (d.candleCount ?? 99) <= 1,
  ],
  use: [
    // the R/RWL's big-candle open (the reversal's first candle)
    (d: LexiconData): boolean => (d.candleCount ?? 99) <= 2 && (d.candleProgression ?? 0) < 0.6,
  ],
};

/** wl — the whiplash (the grab→momentum→grab). */
const wlFamily = {
  id: 'WL',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 3 && (d.candleCount ?? 0) <= 6,
    (d: LexiconData): boolean => (d.colorConsistency ?? 1) >= 0.9,
    // the long wicks ~1× the body (the both-side grab)
    (d: LexiconData): boolean => (d.wickRatio ?? 0) >= 0.4,
  ],
  descriptive: [
    // the sustained momentum (a BS!)
    (d: LexiconData): boolean => (d.candleProgression ?? 0) >= 0.7 && (d.bodyFraction ?? 0) > 0.6,
  ],
  substitute: [
    // the BS's middle candles (the whiplash-lookalike!)
    (d: LexiconData): boolean => (d.bodyFraction ?? 0) > 0.65 && (d.wickRatio ?? 0) < 0.2,
  ],
  use: [
    // the RWL (the instant reversal — no recovery period!)
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 6 && (d.colorConsistency ?? 0) < 0.9,
  ],
};

/** rwl — the reversal whiplash (with the C-3 sub-forms). */
const rwlFamily = {
  id: 'RWL',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 6,
    (d: LexiconData): boolean => {
      const bf = d.bodyFraction ?? -1;
      return bf >= BF_RWL_LOW && bf <= BF_RWL_HIGH;
    },
    // the mixed reverse-dominant (the mechanics + the chain-context classified)
    (d: LexiconData): boolean => (d.colorConsistency ?? 0) < 0.5,
  ],
  descriptive: [
    // the one-directional thrust
    (d: LexiconData): boolean => (d.candleProgression ?? 0) >= 0.7,
  ],
  substitute: [
    // the RWL-rapid sub-form (the operator: "often 1-2 large fat aggressive
    // fast candles" — the big candle, not the 6+ count)
    (d: LexiconData): boolean => (d.candleCount ?? 0) <= 2 && (d.bodyFraction ?? 0) > 0.6,
  ],
  use: [
    // the WL-then-R sequence (the two-shape composite)
    (d: LexiconData): boolean => (d.candleCount ?? 0) <= 6 && (d.colorConsistency ?? 0) >= 0.5,
  ],
};

/** r — the recovery. */
const rFamily = {
  id: 'R',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => {
      const n = d.candleCount ?? 0;
      return n >= 6 && n <= 24;
    },
    (d: LexiconData): boolean => {
      const bf = d.bodyFraction ?? -1;
      return bf >= BF_R_LOW && bf <= BF_R_HIGH;
    },
    // the V-shape (the deep retrace + the recovery)
    (d: LexiconData): boolean => (d.retracementSize ?? 0) >= 0.5,
  ],
  descriptive: [
    // the impulsive move (a BS!)
    (d: LexiconData): boolean => (d.bodyFraction ?? 0) > 0.6 && (d.candleProgression ?? 0) >= 0.7,
  ],
  substitute: [
    // the WLS's recovery leg
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 14 && (d.bodyFraction ?? 0) > 0.6,
  ],
};

/** wls — the whiplash storm. */
const wlsFamily = {
  id: 'WLS',
  group: 'candle-predicate' as const,
  suggestive: [
    (d: LexiconData): boolean => (d.candleCount ?? 0) >= 14,
    // the both-side wicks (the two-way grab)
    (d: LexiconData): boolean => (d.wickRatio ?? 0) >= 0.3,
    // the 3+ moderate-zfp zones in a narrow band (the storm signature)
    (d: LexiconData): boolean => (d.boundingZoneZfp ?? 0) >= 15 && (d.boundingZoneZfp ?? 0) <= 40,
  ],
  descriptive: [
    // the clean consolidation (a SS!)
    (d: LexiconData): boolean => (d.bodyFraction ?? 0) <= 0.3 && (d.wickRatio ?? 1) < 0.2,
  ],
  substitute: [
    // the SS with the wide range (the storm-lookalike!)
    (d: LexiconData): boolean => (d.totalRangeRatio ?? 0) > 0.5 && (d.candleCount ?? 0) < 14,
  ],
  use: [
    // the SS (when the zone-spread < the WLS threshold)
    (d: LexiconData): boolean => (d.boundingZoneZfp ?? 0) < 15,
  ],
};

export const candleShapeLexicon: TradingLexiconRule = {
  id: 'candle-shape',
  families: [ssFamily, bsFamily, wlFamily, rwlFamily, rFamily, wlsFamily],
  escapeHatchTool: 'diag-e2-forward',
  escalationThreshold: 3,
  classify(input: LexiconData): LexiconResult {
    const base = classifyByFamilies(candleShapeLexicon.families, input);
    // THE DIVERGENCE VIOLATION (the spec's Phase-A contract): a day the
    // lexicon classifies BS but the E2 classifies PBS — the unified macro
    // check. The marker is set on the classification itself (the E2's
    // classification rides input.currentShape); enforce('A') throws on it.
    if (base.intent === 'BS' && input.currentShape === 'PBS') {
      return { ...base, violation: `candle-shape BS vs E2 PBS divergence (pos ${base.pos} / neg ${base.neg})` };
    }
    return base;
  },
  enforce(result: LexiconResult, phase: 'A' | 'B'): void {
    if (phase === 'A') {
      // Phase A — the boundary THROW: a day the lexicon classifies BS but the
      // E2 classifies PBS (the divergence!) → the unified macro check.
      if (result.violation) {
        throw new Error(
          `[CANDLE-SHAPE PHASE-A] ${result.violation}. Escape: ` +
          `${candleShapeLexicon.escapeHatchTool}.`,
        );
      }
      return;
    }
    result.demand = `candle-shape: ${result.intent} (conf ${result.confidence.toFixed(3)})`;
  },
};
