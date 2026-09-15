// Plutus V5 E1 — src/e1/machines/candle-shape.ts (ported from OHLC-Intelligence-Lexicon-v1.0 — machine form verbatim, evidence anchors re-pointed to src/e1/lexicons/candle-shape.md)
// LEXICON 2 — CANDLE-SHAPE-LEXICON machine skeleton.
// The impulse/reversal/consolidation candle signatures that feed the E2 shape
// classification — the SS/BS/R/WL/RWL/WLS anatomy. The shape is the CANDLE-LEVEL
// grammar; the chain (Lexicon 5) is the SENTENCE.
//
// Design authority: MASTER_CONTEXT/PLUTUS_V4.5.4_LEXICON_SPEC.md (LEXICON 2 — the
// family table lines 88-97). The MPSE form: the piecewise-total classifier (the
// shape = the piece over the anatomy-token space — the exhaustiveness invariant)
// + the linear combination (shapeScore = Σ wᵢ×tokenᵢ). Doctrine: "everything is
// fractal... BS/R/WL --> WLS --> SS (micro, 30m) and BS/R/WL --> SS (macro, 4H).
// Both are valid."

import type { LexiconData, MachineRule, OHLCBar, PatternFamily, ZoneModel } from '../core/types';
import { classify, buildBlock, buildRefineWarning, sessionState, ESCALATION_THRESHOLD, operativeZone } from '../core/engine';

const zone = (data: LexiconData): ZoneModel | undefined => operativeZone(data);

// ── the anatomy tokens (src/e1/lexicons/candle-shape.md — computed over the 3-day window) ──
interface Anatomy {
  count: number;
  avgBodyFraction: number;   // mean |C-O| / max(|H-L|, tiny)
  avgRangeRatio: number;     // mean (H-L) / atr14
  avgWickRatio: number;      // mean (wick mass) / body — the wick_ratio
  alternating: boolean;      // color_consistency — the up/down alternation
  progression: number;       // candle_progression — lastRange / firstRange (small→MASSIVE)
  sameColorRun: number;      // the longest same-color run
  bothSideWicks: boolean;    // candles with both upper and lower wicks (the WLS signature)
  countWithBothWicks: number;
  moderateZfpZones: number;  // the 3+ moderate-zfp zones in a narrow band (the WLS signature)
}

function anatomy(data: LexiconData): Anatomy {
  const bs = data.bars.filter((b) => b.t <= data.meta.anchorMs && data.meta.anchorMs - b.t <= 72 * 3600_000);
  const ranges = bs.map((c) => Math.max(c.H - c.L, 1e-12));
  const bodies = bs.map((c) => Math.abs(c.C - c.O));
  const avgBodyFraction = bodies.reduce((a, b, i) => a + b / ranges[i], 0) / Math.max(bs.length, 1);
  const avgRangeRatio = ranges.reduce((a, r) => a + r / data.meta.atr14, 0) / Math.max(bs.length, 1);
  const avgWickRatio = bs.reduce((a, c) => a + (Math.max(c.H, c.L) - Math.max(c.O, c.C) + Math.min(c.O, c.C) - Math.min(c.H, c.L)) / Math.max(Math.abs(c.C - c.O), 1e-12), 0) / Math.max(bs.length, 1);
  let alternating = true;
  let sameRun = 0, run = 0, prevUp: boolean | null = null, maxRun = 0;
  for (const c of bs) {
    const up = c.C >= c.O;
    if (prevUp !== null && up !== prevUp) { alternating = alternating && true; run = 1; }
    else { run += 1; if (prevUp !== null && up === prevUp) alternating = false; }
    maxRun = Math.max(maxRun, run);
    prevUp = up;
  }
  sameRun = maxRun;
  const first = ranges[0] ?? 1, last = ranges[ranges.length - 1] ?? first;
  const progression = last / Math.max(first, 1e-12);
  const both = bs.filter((c) => c.H > Math.max(c.O, c.C) && c.L < Math.min(c.O, c.C));
  const modZones = data.zones.filter((z) => z.zfp >= 0.3 && z.zfp <= 0.6).length;
  return { count: bs.length, avgBodyFraction, avgRangeRatio, avgWickRatio, alternating, progression, sameColorRun: sameRun, bothSideWicks: both.length > 0, countWithBothWicks: both.length, moderateZfpZones: modZones };
}

const boundingZfp = (data: LexiconData): number => zone(data)?.zfp ?? 0;

// ── the SS family — the scalp/consolidation ───────────────────────────────────
function ssSignature(data: LexiconData): boolean {
  // bf 0.10-0.30 · range 0.2-0.5× context · alternating colors · both bounding zones' zfp < 30% (src/e1/lexicons/candle-shape.md)
  const a = anatomy(data);
  return a.avgBodyFraction >= 0.10 && a.avgBodyFraction <= 0.30 && a.avgRangeRatio >= 0.2 && a.avgRangeRatio <= 0.5 && a.alternating && boundingZfp(data) < 0.30;
}
function directionalThrust(data: LexiconData): boolean {
  // a directional thrust (bf > 0.6 — the descriptive)
  return anatomy(data).avgBodyFraction > 0.6;
}
function narrowInTrend(data: LexiconData): boolean {
  // the narrow-range candle in a trend (the range != the consolidation — the substitute)
  const a = anatomy(data);
  return a.avgRangeRatio >= 0.2 && a.avgRangeRatio <= 0.5 && boundingZfp(data) > 0.45;
}
function wlsSignature(data: LexiconData): boolean {
  // the WLS signature (the 14-15+ candle storm — the ss-lookalike that is a WLS — the exemptor)
  const a = anatomy(data);
  return a.count >= 14 && a.bothSideWicks;
}

// ── the BS family — the breakout surge ────────────────────────────────────────
function bsSignature(data: LexiconData): boolean {
  // the thrust bf 0.65-0.95 · minimal wicks < 0.2 · PROGRESSION small→MASSIVE ·
  // the retracements < 30% · the bounding zone's zfp > 45% (src/e1/lexicons/candle-shape.md)
  const a = anatomy(data);
  return a.avgBodyFraction >= 0.65 && a.avgBodyFraction <= 0.95 && a.avgWickRatio < 0.2 && a.progression >= 3.0 && boundingZfp(data) > 0.45;
}
function moderateBf(data: LexiconData): boolean {
  // the moderate bf (0.30-0.60 — a recovery, not a breakout — the descriptive)
  const a = anatomy(data);
  return a.avgBodyFraction > 0.30 && a.avgBodyFraction < 0.60;
}
function singleBigCandle(data: LexiconData): boolean {
  // the single big candle (one candle != a BS — the BS is the PROGRESSION — the substitute)
  return anatomy(data).count <= 2;
}
function reversalFirstCandle(data: LexiconData): boolean {
  // the R/RWL's big-candle open (the reversal's first candle — the exemptor)
  const a = anatomy(data);
  return data.shapeChain.includes('R') || data.shapeChain.includes('RWL');
}

// ── the WL family — the whiplash ──────────────────────────────────────────────
function wlSignature(data: LexiconData): boolean {
  // 3 same-color candles · the long wicks ~1x the body (the grab→momentum→grab — TTE:177-179)
  const a = anatomy(data);
  return a.sameColorRun >= 3 && a.avgWickRatio >= 0.8 && a.avgWickRatio <= 1.5;
}
function sustainedMomentum(data: LexiconData): boolean {
  // the sustained momentum (a BS — the descriptive)
  return bsSignature(data);
}
function bsMiddleCandles(data: LexiconData): boolean {
  // the BS's middle candles (the whiplash-lookalike — the substitute)
  return aHasBsProgression(data);
}
function rwlInstantReversal(data: LexiconData): boolean {
  // the RWL (the instant reversal — no recovery period — the exemptor)
  return anatomy(data).count >= 6 && data.shapeChain.includes('RWL');
}

// ── the RWL family — the reversal whiplash ────────────────────────────────────
function rwlSignature(data: LexiconData): boolean {
  // 6+ candles · bf 0.30-0.50 · the mixed reverse-dominant
  const a = anatomy(data);
  return a.count >= 6 && a.avgBodyFraction >= 0.30 && a.avgBodyFraction <= 0.50 && !a.alternating;
}
function oneDirectionalThrust(data: LexiconData): boolean {
  // the one-directional thrust (the descriptive)
  return anatomy(data).avgBodyFraction > 0.6;
}
function wlThenRComposite(data: LexiconData): boolean {
  // the WL-then-R sequence (the two-shape composite — the exemptor)
  return data.shapeChain.includes('WL') && data.shapeChain.includes('R');
}

// ── the R family — the recovery ───────────────────────────────────────────────
function rSignature(data: LexiconData): boolean {
  // 6-24 candles · bf 0.40-0.60 · the V-shape
  const a = anatomy(data);
  const bs = data.bars.filter((b) => b.t <= data.meta.anchorMs && data.meta.anchorMs - b.t <= 72 * 3600_000);
  const midLows = bs.slice(1, -1).map((c) => c.L);
  const firstLow = bs[0]?.L ?? 0, lastLow = bs[bs.length - 1]?.L ?? 0;
  const midMin = Math.min(...midLows, firstLow, lastLow);
  const vShape = midMin < firstLow && midMin < lastLow && (lastLow > firstLow || true);
  return a.count >= 6 && a.count <= 24 && a.avgBodyFraction >= 0.40 && a.avgBodyFraction <= 0.60 && vShape;
}
function impulsiveMove(data: LexiconData): boolean {
  // the impulsive move (a BS — the descriptive)
  return bsSignature(data);
}
function wlsRecoveryLeg(data: LexiconData): boolean {
  // the WLS's recovery leg (the substitute)
  return wlsSignature(data) && data.shapeChain.includes('WLS');
}

// ── the WLS family — the whiplash storm ───────────────────────────────────────
function wlsStorm(data: LexiconData): boolean {
  // 14-15+ candles · the both-side wicks · 3+ moderate-zfp zones in a narrow band (src/e1/lexicons/candle-shape.md)
  const a = anatomy(data);
  return a.count >= 14 && a.bothSideWicks && a.moderateZfpZones >= 3;
}
function cleanConsolidation(data: LexiconData): boolean {
  // the clean consolidation (a SS — the descriptive)
  return ssSignature(data);
}
function ssWideRange(data: LexiconData): boolean {
  // the SS with the wide range (the storm-lookalike — the substitute)
  const a = anatomy(data);
  return a.avgRangeRatio >= 0.5 && a.avgRangeRatio <= 0.8 && a.alternating;
}
function ssBelowWlsThreshold(data: LexiconData): boolean {
  // the SS (when the zone-spread < the WLS threshold — the exemptor)
  const a = anatomy(data);
  return ssSignature(data) && a.moderateZfpZones < 3;
}

// helpers used above
function aHasBsProgression(data: LexiconData): boolean {
  const a = anatomy(data);
  return a.progression >= 3.0 && a.avgBodyFraction >= 0.50;
}

export const CANDLE_SHAPE_FAMILIES: PatternFamily[] = [
  { group: 'candle-predicate', descriptive: [directionalThrust], suggestive: [ssSignature], substitute: [narrowInTrend], use: [wlsSignature] },
  { group: 'candle-predicate', descriptive: [moderateBf], suggestive: [bsSignature], substitute: [singleBigCandle], use: [reversalFirstCandle] },
  { group: 'candle-predicate', descriptive: [sustainedMomentum], suggestive: [wlSignature], substitute: [bsMiddleCandles], use: [rwlInstantReversal] },
  { group: 'candle-predicate', descriptive: [oneDirectionalThrust], suggestive: [rwlSignature], substitute: [], use: [wlThenRComposite] },
  { group: 'candle-predicate', descriptive: [impulsiveMove], suggestive: [rSignature], substitute: [wlsRecoveryLeg], use: [] },
  { group: 'candle-predicate', descriptive: [cleanConsolidation], suggestive: [wlsStorm], substitute: [ssWideRange], use: [ssBelowWlsThreshold] },
];

export const candleShapeMachine: MachineRule = {
  id: 'candle-shape',
  families: CANDLE_SHAPE_FAMILIES,
  classify: (input) => classify(input, CANDLE_SHAPE_FAMILIES),
  enforce: (result, phase) => {
    const st = sessionState(result.sessionID);
    if (result.action === 'reject') {
      st.refinementCount += 1;
      const used = st.refinementCount;
      if (used >= ESCALATION_THRESHOLD) {
        throw buildBlock('candle-shape', result.evidence || 'rejected shape', '3 failed refinements → the E2 problem-solving dispatch. The failure data is stored + synthesized at the pipeline end.', phase);
      }
      throw buildRefineWarning('candle-shape', result.evidence || 'rejected shape', `Refine/retry (${used}/3): the shape = the piece over the anatomy-token space (the exhaustiveness invariant) — re-run with the full 3-day window + the bounding-zone zfp context.`, used);
    }
    if (phase === 'B') st.auditTrail.push(`candle-shape: ${result.intent} conf ${result.confidence.toFixed(2)} — the shape demand appended to the E2 day decomposition`);
  },
  escapeHatchTool: 'probe-shape',   // the pipeline's re-run / the audit tool (never blocked)
  escalationThreshold: ESCALATION_THRESHOLD,
};
