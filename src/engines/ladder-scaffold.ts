/**
 * Ladder Scaffold Engine (W7 / PKG-S1) — the deterministic candidate ladder.
 *
 * ═══════════════════════════════════════════════════════════════
 * NEXT_STEPS §1 / PLUTUS_DEEP_FIX_CODEX §11 — THE ZONE-CONSISTENCY FIX
 * ═══════════════════════════════════════════════════════════════
 *
 * Root cause: the agent INVENTS zone levels from scratch each run (open-ended
 * generation → high variance). The fix INVERTS the flow: the harness PROPOSES
 * a deterministic candidate ladder computed from each week's OWN data (never
 * hardcoded); the VLM later only VERIFIES freshness/evidence on that fixed set.
 *
 * HARD DETERMINISM RULES (the entire point of this module):
 *   - No wall-clock timestamps, no randomness, no iteration over objects
 *     whose key order this module did not create.
 *   - Every rung id derives from (pair, source, price) — no timestamps.
 *   - Same input bars → byte-identical ladder (NEXT_STEPS §3.1 test).
 *
 * The 5 deterministic sources (unioned, sorted, deduped, range-filtered,
 * bounded — ALL deterministic):
 *   1. ORDER_BLOCK (multi-TF: 4H + 1H + 30m via construct4HZones)
 *   2. LQZ (detectLiquidityZones output, mapped with the canon LQZ zfp ladder)
 *   3. PILLAR levels (pivot grid / MAs / option walls from 9-pillar-lobe)
 *   4. FIB_RETRACE (week-range Fib retracements — NEW)
 *   5. SWING_EXTREME (prior-week H/L/C + prior-day H/L/C — NEW)
 */

import { construct4HZones } from '../brains/4h-sd-lobe.js';
import type { LiquidZone } from '../brains/lqz-lobe.js';
import type { PillarResult } from '../brains/9-pillar-lobe.js';
import type { DXYZone, OHLCBar } from '../types.js';
import { FIB_ENTRY_LEVELS } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ScaffoldSource = 'PIVOT' | 'MA' | 'ORDER_BLOCK' | 'LQZ' | 'FIB_RETRACE' | 'SWING_EXTREME' | 'OPTION_WALL';

export interface ScaffoldRung {
  id: string;                 // DETERMINISTIC: `${pair}|${source}|${price rounded to pair decimals}` — no timestamps
  pair: string;
  price: number;              // rung level (midpoint for zones)
  type: 'SUPPLY' | 'DEMAND' | 'LIQUIDITY';
  top: number;
  bottom: number;
  timeframe: '4H' | '1H' | '30m' | '15m'; // '15m': Phase 2 T5b telescoped LQZ-matrix tiers
  classification: 'BoM' | 'MoM' | 'UNMITIGATED';
  source: ScaffoldSource;
  confluence: number;
  zfp: number;                // from the source's canon computation
  reactionCount: number;      // from the source's event-granularity counter
  liquidityScore: number;
  /** LQZ only: BUY_SIDE → 'ABOVE' (liquidity overhead), SELL_SIDE → 'BELOW'. */
  side?: 'ABOVE' | 'BELOW';
  /** Deterministic derivation note (e.g. "FIB 0.618 of week range 100.845-101.435"). */
  evidence: string;
}

export interface CandidateLadderInput {
  pair: string;
  spot: number;
  pipValue: number;
  weekStartMs: number;        // Monday 00:00 UTC of the target week
  anchorMs: number;           // Friday 17:00 ET of the target week (temporal anchor)
  barsByTf: { '4H': OHLCBar[]; '1H': OHLCBar[]; '30m': OHLCBar[] };
  orderBlocks4H: DXYZone[];   // already computed by the zones tool (construct4HZones 4H)
  lqzZones: LiquidZone[];     // already computed by the zones tool (detectLiquidityZones)
  pillarResult: PillarResult; // already computed by the zones tool
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (calibration provenance)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Source priority (lower number = higher priority). Used for sort tie-breaks
 * and dedup merge-winner selection. Order blocks are the operator's primary
 * zone identity (BoM/MoM S/D); LQZ rungs are the confirmed liquidity shelves;
 * option walls outrank generic pivots (real notional > derived math); swing
 * extremes outrank fibs (actual prints > ratios); MAs are the weakest identity.
 */
const SOURCE_PRIORITY: Record<ScaffoldSource, number> = {
  ORDER_BLOCK: 1,
  LQZ: 2,
  OPTION_WALL: 3,
  PIVOT: 4,
  SWING_EXTREME: 5,
  FIB_RETRACE: 6,
  MA: 7,
};

/**
 * Actionable range filter: ±200 pips of spot.
 * BECAUSE: NEXT_STEPS §1.1 — the ladder spans "the actionable range ±200 pips
 * / ±2.00 DXY". pipValue is already pair-scaled (DXY pipValue = 0.01, so
 * 200 × 0.01 = 2.00) — ONE formula covers FX and DXY uniformly.
 */
const ACTIONABLE_RANGE_PIPS = 200;

/**
 * Dedup proximity tolerance: 3 pips.
 * BECAUSE: the golden-standard rung spacing is 4-10 pips (NEXT_STEPS §1);
 * 3 pips separates distinct rungs without duplicating them.
 */
const DEDUP_TOLERANCE_PIPS = 3;

/**
 * LQZ/LQZ_M dedup proximity tolerance: 0.4 pips (L2, 2026-07-31).
 * BECAUSE: the operator's drawn map shows the golden 0.5-pip pair
 * (101.235 / 101.240) as TWO DISTINCT rungs — the 3-pip global tolerance
 * merged them (0.5p < 3p). A 1-pip tolerance would STILL merge them: the
 * merge branch fires on `gap < tolerance`, so 0.5p < 1p → merge. Even a
 * 0.5-pip tolerance merges the ACTUAL float gap — 101.240 − 101.235
 * computes to 0.0049999999999955 (below 0.005, IEEE-754 dust). 0.4 pips is
 * therefore the largest round tolerance that provably keeps every 0.5-pip
 * (and wider) pair distinct (0.0049999… < 0.004 is false) while still
 * collapsing sub-0.4-pip duplicates. Applies ONLY between two
 * LQZ/LQZ_M-class rungs (same zone class); ANY cross-class pair (e.g. LQZ
 * vs ORDER_BLOCK — the §8.1 anchor union) keeps DEDUP_TOLERANCE_PIPS (3p).
 */
const LQZ_DEDUP_TOLERANCE_PIPS = 0.4;

/**
 * Maximum scaffold rungs per pair: 40.
 * BECAUSE: this is a scaffold DRAW bound, NOT a setup cap — chart legibility
 * (NEXT_STEPS §1.1: "~20-40 levels/pair"). Setups are never capped by this.
 */
const MAX_SCAFFOLD_RUNGS = 40;

/**
 * Zone half-width for pillar/fib/swing point-levels: ±2 pips.
 * BECAUSE: point levels (pivots, fibs, swing prints) have no natural zone
 * width; ±2 pips gives a draw-able rectangle inside the 3-pip dedup tolerance
 * without overlapping neighbours at golden-standard 4-10 pip spacing.
 */
const POINT_LEVEL_HALF_WIDTH_PIPS = 2;

/**
 * FIB_RETRACE zfp = 40 (constant).
 * BECAUSE: a week-range fib is a PASSIVE reference level — widely watched
 * (moderate institutional defense) but with no origin-candle defense and no
 * confirmed liquidity. 40 = the "MODERATE" band of the canon pillar step
 * function (Bible 4.12) — defended, tradeable, not a Hard Wall.
 */
const FIB_ZFP = 40;

/**
 * SWING_EXTREME zfp = 30 (constant).
 * BECAUSE: prior-week/prior-day H/L/C are well-watched institutional levels
 * (every desk marks them) — stronger defense than a fib ratio, weaker than a
 * fresh order block. 30 = the "MODERATE-HEAVY" band of the canon pillar step
 * function (Bible 4.12).
 */
const SWING_ZFP = 30;

const MS_PER_DAY = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════════
// CANON ZFP REPLICAS (cited, never imported — these lobes must not be modified)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon LQZ ladder zfp — replicates src/brains/lqz-lobe.ts (~line 392,
 * mergeLqzWithIpZones standalone-LQZ branch) EXACTLY:
 *   zfp = Math.min(60, 20 + Math.max(0, Math.floor((touch_count - 3) / 2)) * 5)
 * Canon semantics: a CONFIRMED LQZ is a STRONG liquidity level by construction
 * (repeated sweeps that HOLD prove liquidity, they don't deplete it). Base 20
 * (Hard Wall when fresh); +5 per 2 touches beyond 3 (exhaustion); capped 60.
 */
function lqzZfpFromTouchCount(touchCount: number): number {
  return Math.min(60, 20 + Math.max(0, Math.floor((touchCount - 3) / 2)) * 5);
}

/**
 * Canon pillar pressure-degree → ZFP step function (Bible 4.12) — replicates
 * computeZfpFromConfluence in src/pipeline/engine.ts:108-120 EXACTLY.
 * Why a step function: confluence bands represent qualitatively different
 * institutional defense regimes — within a band the defense is constant, at
 * band boundaries it jumps.
 */
function pillarZfpFromConfluence(confluence: number): number {
  if (confluence >= 12) return 10;  // EXTREME — nearly impregnable
  if (confluence >= 10) return 20;  // HEAVY
  if (confluence >= 8)  return 30;  // MODERATE-HEAVY
  if (confluence >= 6)  return 40;  // MODERATE
  if (confluence >= 4)  return 55;  // LIGHT
  return 65;                         // MINIMAL
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Price decimals for ids/logging: DXY prints 3 decimals, FX prints 5. */
function priceDecimals(pair: string): number {
  return pair === 'DXY' ? 3 : 5;
}

function makeRungId(pair: string, source: ScaffoldSource, price: number): string {
  return `${pair}|${source}|${price.toFixed(priceDecimals(pair))}`;
}

/** Highest/lowest/last-close of a bar set (deterministic — scans all bars). */
function highLowClose(bars: OHLCBar[]): { high: number; low: number; close: number } | null {
  if (bars.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  let closeTs = -Infinity;
  let close = 0;
  for (const b of bars) {
    if (b.high > high) high = b.high;
    if (b.low < low) low = b.low;
    if (b.timestamp > closeTs) { closeTs = b.timestamp; close = b.close; }
  }
  return { high, low, close };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 1 — ORDER_BLOCK (multi-TF: 4H passed in, 1H + 30m computed here)
// ═══════════════════════════════════════════════════════════════════════════════

function orderBlockRungs(
  zones: DXYZone[],
  tf: '4H' | '1H' | '30m',
  pair: string,
): ScaffoldRung[] {
  return zones.map((z) => {
    const mid = (z.floor + z.ceiling) / 2;
    const type = String(z.type).includes('Supply') ? 'SUPPLY' : 'DEMAND';
    const source: ScaffoldSource = 'ORDER_BLOCK';
    return {
      id: makeRungId(pair, source, mid),
      pair,
      price: mid,
      type,
      top: z.ceiling,
      bottom: z.floor,
      timeframe: tf,
      classification: z.isBoM ? 'BoM' : 'MoM',
      source,
      confluence: z.confluence,
      zfp: z.zfp, // canon — already computed by 4h-sd-lobe
      reactionCount: z.reactionCount,
      liquidityScore: z.liquidityScore ?? 0,
      evidence: `${tf} ${z.isBoM ? 'BoM' : 'MoM'} order block [${z.floor.toFixed(priceDecimals(pair))}-${z.ceiling.toFixed(priceDecimals(pair))}]`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 2 — LQZ
// ═══════════════════════════════════════════════════════════════════════════════

function lqzRungs(zones: LiquidZone[], pair: string): ScaffoldRung[] {
  return zones.map((z) => {
    const source: ScaffoldSource = 'LQZ';
    return {
      id: makeRungId(pair, source, z.level),
      pair,
      price: z.level,
      type: 'LIQUIDITY',
      top: z.top,
      bottom: z.bottom,
      timeframe: '1H',
      classification: 'MoM',
      source,
      confluence: z.patterns.length * 2,
      zfp: lqzZfpFromTouchCount(z.touch_count), // canon LQZ ladder (see citing comment above)
      reactionCount: z.touch_count,
      liquidityScore: z.confidence ?? 50,
      side: z.side === 'BUY_SIDE' ? 'ABOVE' : 'BELOW',
      evidence: `LQZ ${z.side} ${z.patterns.join('+')} x${z.touch_count} touches`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 3 — PILLAR levels (pivot grid / MAs / option walls)
// ═══════════════════════════════════════════════════════════════════════════════

/** Free-form pillar source string → ScaffoldSource. */
function pillarSourceFromString(source: string): ScaffoldSource {
  const s = source.toLowerCase();
  if (s.includes('option')) return 'OPTION_WALL';
  if (s.includes('pivot')) return 'PIVOT';
  // Word-boundary MA check: bare includes('ma') would misclassify "gamma"
  // (P3 gamma proxy) and "maxPain" as moving averages.
  if (/\b(ema|sma|ma)\b/.test(s) || s.includes('moving average')) return 'MA';
  return 'PIVOT';
}

function pillarRungs(input: CandidateLadderInput): ScaffoldRung[] {
  const { pair, spot, pipValue, pillarResult } = input;
  const halfWidth = POINT_LEVEL_HALF_WIDTH_PIPS * pipValue;
  return pillarResult.levels.map((lvl) => {
    const source = pillarSourceFromString(lvl.source);
    return {
      id: makeRungId(pair, source, lvl.price),
      pair,
      price: lvl.price,
      type: lvl.price > spot ? 'SUPPLY' : 'DEMAND',
      top: lvl.price + halfWidth,
      bottom: lvl.price - halfWidth,
      timeframe: '4H',
      classification: 'UNMITIGATED',
      source,
      confluence: pillarResult.compositeScore,
      zfp: pillarZfpFromConfluence(pillarResult.compositeScore), // canon pillar step function (Bible 4.12)
      reactionCount: 0,
      liquidityScore: lvl.confidence * 50,
      evidence: `pillar ${lvl.source}`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 4 — FIB_RETRACE (CURRENT week's high/low — NEW)
// ═══════════════════════════════════════════════════════════════════════════════

function fibRungs(input: CandidateLadderInput): ScaffoldRung[] {
  const { pair, spot, pipValue, weekStartMs, anchorMs, barsByTf } = input;
  // Current-week bars: 1H preferred (finer granularity), 4H fallback.
  let weekBars = barsByTf['1H'].filter((b) => b.timestamp >= weekStartMs && b.timestamp <= anchorMs);
  if (weekBars.length === 0) {
    weekBars = barsByTf['4H'].filter((b) => b.timestamp >= weekStartMs && b.timestamp <= anchorMs);
  }
  if (weekBars.length === 0) return []; // no week data → skip this source
  const hlc = highLowClose(weekBars)!;
  const range = hlc.high - hlc.low;
  if (range <= 0) return [];
  const halfWidth = POINT_LEVEL_HALF_WIDTH_PIPS * pipValue;
  const dec = priceDecimals(pair);
  return FIB_ENTRY_LEVELS.map((ratio) => {
    const level = hlc.low + ratio * range;
    const source: ScaffoldSource = 'FIB_RETRACE';
    return {
      id: makeRungId(pair, source, level),
      pair,
      price: level,
      type: level > spot ? 'SUPPLY' : 'DEMAND',
      top: level + halfWidth,
      bottom: level - halfWidth,
      timeframe: '1H',
      classification: 'UNMITIGATED',
      source,
      confluence: 3,
      zfp: FIB_ZFP,
      reactionCount: 0,
      liquidityScore: 0,
      evidence: `FIB ${ratio} of week range ${hlc.low.toFixed(dec)}-${hlc.high.toFixed(dec)}`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE 5 — SWING_EXTREME (prior-week H/L/C + prior-day H/L/C — NEW)
// ═══════════════════════════════════════════════════════════════════════════════

function swingRungs(input: CandidateLadderInput): ScaffoldRung[] {
  const { pair, spot, pipValue, weekStartMs, barsByTf } = input;
  const halfWidth = POINT_LEVEL_HALF_WIDTH_PIPS * pipValue;
  const source: ScaffoldSource = 'SWING_EXTREME';

  const make = (price: number, evidence: string): ScaffoldRung => ({
    id: makeRungId(pair, source, price),
    pair,
    price,
    type: price > spot ? 'SUPPLY' : 'DEMAND',
    top: price + halfWidth,
    bottom: price - halfWidth,
    timeframe: '1H',
    classification: 'UNMITIGATED',
    source,
    confluence: 4,
    zfp: SWING_ZFP,
    reactionCount: 0,
    liquidityScore: 0,
    evidence,
  });

  const rungs: ScaffoldRung[] = [];

  // Prior week: bars in [weekStartMs - 7d, weekStartMs). 1H preferred, 4H fallback.
  const priorStart = weekStartMs - 7 * MS_PER_DAY;
  let priorWeekBars = barsByTf['1H'].filter((b) => b.timestamp >= priorStart && b.timestamp < weekStartMs);
  if (priorWeekBars.length === 0) {
    priorWeekBars = barsByTf['4H'].filter((b) => b.timestamp >= priorStart && b.timestamp < weekStartMs);
  }
  const priorWeek = highLowClose(priorWeekBars);
  if (priorWeek) {
    rungs.push(make(priorWeek.high, 'prior week high'));
    rungs.push(make(priorWeek.low, 'prior week low'));
    rungs.push(make(priorWeek.close, 'prior week close'));
  }

  // Prior day: the UTC day containing the LAST 1H bar (max-timestamp bucket).
  const bars1H = barsByTf['1H'];
  if (bars1H.length > 0) {
    let lastTs = -Infinity;
    for (const b of bars1H) if (b.timestamp > lastTs) lastTs = b.timestamp;
    const dayKey = new Date(lastTs).toISOString().slice(0, 10);
    const dayBars = bars1H.filter((b) => new Date(b.timestamp).toISOString().slice(0, 10) === dayKey);
    const priorDay = highLowClose(dayBars);
    if (priorDay) {
      rungs.push(make(priorDay.high, 'prior day high'));
      rungs.push(make(priorDay.low, 'prior day low'));
      rungs.push(make(priorDay.close, 'prior day close'));
    }
  }

  return rungs;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNION → RANGE FILTER → SORT → DEDUP → BOUND (ALL deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

export function generateCandidateLadder(input: CandidateLadderInput): ScaffoldRung[] {
  const { pair, spot, pipValue, barsByTf } = input;

  // ── Source 1: ORDER_BLOCK — 4H passed in (already computed by zones tool);
  //    1H + 30m computed here via the SAME TF-parameterized canon constructor
  //    (4h-sd-lobe TF_CONSTRUCTION_PARAMS — that file is NOT modified).
  const ob1H = construct4HZones({ bars: barsByTf['1H'], instrument: pair, spot, pipValue, timeframe: '1H' });
  const ob30m = construct4HZones({ bars: barsByTf['30m'], instrument: pair, spot, pipValue, timeframe: '30m' });
  const rungs: ScaffoldRung[] = [
    ...orderBlockRungs(input.orderBlocks4H, '4H', pair),
    ...orderBlockRungs(ob1H, '1H', pair),
    ...orderBlockRungs(ob30m, '30m', pair),
    // ── Source 2: LQZ
    ...lqzRungs(input.lqzZones, pair),
    // ── Source 3: PILLAR levels
    ...pillarRungs(input),
    // ── Source 4: FIB_RETRACE (NEW)
    ...fibRungs(input),
    // ── Source 5: SWING_EXTREME (NEW)
    ...swingRungs(input),
  ];

  // ── Range filter FIRST: only the actionable range around spot.
  const maxDistance = ACTIONABLE_RANGE_PIPS * pipValue;
  const inRange = rungs.filter((r) => Math.abs(r.price - spot) <= maxDistance);

  // ── Sort: price ascending; tie-break source priority ascending, then id.
  //    Array.prototype.sort is stable in V8/JSC and the comparator is total,
  //    so this is fully deterministic.
  inRange.sort((a, b) =>
    (a.price - b.price) ||
    (SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source]) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  // ── Dedup by proximity: walk the sorted list; merge a rung into the
  //    previous kept rung when within the per-PAIR tolerance. The tolerance
  //    is resolved per pair of rungs: two LQZ/LQZ_M-class rungs (same zone
  //    class) dedup at LQZ_DEDUP_TOLERANCE_PIPS (0.4p — the golden 0.5p pair
  //    must survive as distinct rungs); ANY cross-class pair (e.g. LQZ vs
  //    ORDER_BLOCK — the §8.1 anchor union) keeps DEDUP_TOLERANCE_PIPS (3p).
  //    Merge winner = the LOWER source-priority number (higher-priority
  //    source); on equal priority the first-kept wins (deterministic — sort
  //    order is fixed).
  const isLqzClass = (r: ScaffoldRung): boolean =>
    r.source === 'LQZ' || r.id.startsWith('LQZ_M') || r.id.includes('|LQZ_M|');
  const kept: ScaffoldRung[] = [];
  for (const rung of inRange) {
    const last = kept[kept.length - 1];
    const tolerance = (last && isLqzClass(rung) && isLqzClass(last)
      ? LQZ_DEDUP_TOLERANCE_PIPS
      : DEDUP_TOLERANCE_PIPS) * pipValue;
    if (last && Math.abs(rung.price - last.price) < tolerance) {
      // Determine the base (identity winner) and the absorbed rung.
      let base: ScaffoldRung;
      let absorbed: ScaffoldRung;
      if (SOURCE_PRIORITY[rung.source] < SOURCE_PRIORITY[last.source]) {
        // Incoming rung's identity wins: price/zfp/reactionCount/classification/id.
        base = { ...rung, top: Math.max(rung.top, last.top), bottom: Math.min(rung.bottom, last.bottom) };
        absorbed = last;
      } else {
        base = last;
        absorbed = rung;
        base.top = Math.max(base.top, rung.top);
        base.bottom = Math.min(base.bottom, rung.bottom);
      }
      base.confluence += 1; // +1 per merged source
      base.evidence += ` + ${absorbed.source} confluence`;
      kept[kept.length - 1] = base;
    } else {
      kept.push({ ...rung });
    }
  }

  // ── Bound: if kept rungs > MAX_SCAFFOLD_RUNGS, repeatedly drop the rung
  //    with the LARGEST |price - spot|; tie-break higher source-priority
  //    number (lowest-priority source) first, then higher price. Scaffold
  //    draw bound, NOT a setup cap (chart legibility).
  while (kept.length > MAX_SCAFFOLD_RUNGS) {
    let dropIdx = 0;
    for (let i = 1; i < kept.length; i++) {
      const cand = kept[i]!;
      const cur = kept[dropIdx]!;
      const candDist = Math.abs(cand.price - spot);
      const curDist = Math.abs(cur.price - spot);
      if (
        candDist > curDist ||
        (candDist === curDist && SOURCE_PRIORITY[cand.source] > SOURCE_PRIORITY[cur.source]) ||
        (candDist === curDist && SOURCE_PRIORITY[cand.source] === SOURCE_PRIORITY[cur.source] && cand.price > cur.price)
      ) {
        dropIdx = i;
      }
    }
    kept.splice(dropIdx, 1);
  }

  return kept;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOG FORMAT
// ═══════════════════════════════════════════════════════════════════════════════

export function formatLadderForLog(pair: string, rungs: ScaffoldRung[]): string {
  const dec = priceDecimals(pair);
  return `scaffold ${pair}: ${rungs.length} rungs [${rungs.map((r) => r.price.toFixed(dec)).join(', ')}]`;
}
