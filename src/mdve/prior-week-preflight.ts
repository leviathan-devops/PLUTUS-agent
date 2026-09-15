/**
 * prior-week-preflight.ts — the Wave A1.3 PRIOR-WEEK BACKWARDS-MAPPING
 * PRE-FLIGHT (the operator's 2026-08-01 directive): "the previous weeks
 * entire E1/E2/E3 pipeline needs to be BACKWARDS MAPPED ON THE AVAILABLE
 * HISTORICAL DATA AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE MACRO
 * STORYLINE as part of the reasoning chain that feeds into the forward
 * looking E1/E2/E3 of the upcoming week."
 *
 * ═══════════════════════════════════════════════════════════════
 * THE MODULE ALGORITHM (NEXT-BUILD SPEC §7.3, literal):
 *   INPUT: the pair's bars (1H/4H) + the current week's start
 *          (weekStartMs) + the temporal anchor (anchorMs)
 *   1. priorWeekStart = weekStartMs − 7 days; priorAnchor = weekStartMs
 *      (the prior week's end)
 *   2. Run the prior week's E1 on bars ≤ priorAnchor: the telescoped S/D
 *      + LQZ + LMV + OBCV — the SAME buildChartModel machinery the report
 *      calls, scoped to the prior window (bars ≤ priorAnchor ONLY).
 *   3. Run the prior week's E2 (the ShapeBrain on the prior window) —
 *      the prior week's shape chain (the storyline's arc).
 *   4. Produce the STORYLINE CONTEXT object:
 *      - priorSweepOrigin  (the sweep low/high + the timestamp — the
 *        narrative's sweep-origin logic on the prior window)
 *      - priorRangeTop / priorRangeBottom (the prior window's extremes)
 *      - priorDefendedZones (Law 28: DEFENDED/BROKEN/UNTESTED — the
 *        reaction counts)
 *      - priorRoleReversals (Law 29: a broken support whose price sits
 *        above it now = new resistance)
 *      - priorDepletion (the 3x+ mitigated zones — the pass-through
 *        candidates)
 *      - priorShapeChain (the prior week's shape sequence — the arc)
 *   5. The consumer (the parallel agent's shape-brain wiring) reads the
 *      storyline so the prior sweep origin anchors the current week's
 *      first reaction and the prior defended/broken zones set the
 *      current week's role expectations.
 *
 * TEMPORAL DISCIPLINE (the no-future-leak invariant): the pre-flight runs
 * on bars ≤ the PRIOR week's anchor ONLY — the current week's bars are
 * NEVER visible to it (bars > priorAnchor excluded). The storyline's zone
 * formations all satisfy formationMs ≤ priorAnchor by construction (the
 * model is built on the scoped bars).
 *
 * DETERMINISM: no wall-clock anywhere — the shape brain's snapshot
 * timestamp is irrelevant to the extracted day decomposition (the chain
 * derives from zones/spot/ltfZones only).
 * ═══════════════════════════════════════════════════════════════
 */

import { buildChartModel } from './index.js';
import { MS_PER_DAY } from './util.js';
import { ShapeBrain } from '../brains/shape-brain.js';
import { ZoneType } from '../types.js';
import type { DXYZone, OHLCBar, ZoneMapSnapshot } from '../types.js';
import type { ZoneModel } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE STORYLINE INTERFACE (Wave A1.3 — the handoff contract)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriorWeekStoryline {
  /** The pair key ('DXY' | 'EUR/USD' | 'GBP/USD' | …). */
  pair: string;
  /** The prior week's start (weekStartMs − 7 days). */
  priorWeekStartMs: number;
  /** The prior week's end (= the current week's start — the E1 bound). */
  priorAnchorMs: number;
  /** The prior window's sweep origin (the narrative's sweep-origin logic
   *  on the prior window). Honest null when no sweep held (§12 Law 3). */
  sweepOrigin: { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH' } | null;
  /** The prior window's range top (highest extreme + its bar's ms). */
  rangeTop: { price: number; ms: number } | null;
  /** The prior window's range bottom (lowest extreme + its bar's ms). */
  rangeBottom: { price: number; ms: number } | null;
  /** Law 28 — the defended/broken/untested zones (the reaction counts).
   *  BROKEN = VIOLATED (closed-through). DEFENDED = reactionCount 1-2.
   *  UNTESTED = reactionCount 0. */
  defendedZones: {
    id: string;
    price: number;
    status: 'DEFENDED' | 'BROKEN' | 'UNTESTED';
    reactionCount: number;
  }[];
  /** Law 29 — role reversals: a broken support whose price sits above it
   *  now = new resistance (and the mirror: broken resistance below price
   *  = new support). */
  roleReversals: { id: string; price: number; from: string; to: string }[];
  /** The 3x+ mitigated zones — the pass-through candidates. */
  depletedZones: { id: string; price: number; reactionCount: number }[];
  /** The prior week's shape sequence (the ShapeBrain's day decomposition
   *  on the prior window — the storyline's arc). */
  priorShapeChain: { day: string; shape: string; direction: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE MODEL → DXYZONE (the ShapeBrain input — mirrors report-v452's
// toDxyZone standard branch; the prior model carries NO PILLAR zones since
// buildChartModel runs without pillar options — the §8.1 branch is moot)
// ═══════════════════════════════════════════════════════════════════════════════

function toDxyZone(z: ZoneModel): DXYZone {
  const isBoM = z.classification === 'BoM';
  let type: ZoneType;
  if (isBoM && z.type === 'SUPPLY') type = ZoneType.BOM_SUPPLY;
  else if (isBoM && z.type === 'DEMAND') type = ZoneType.BOM_DEMAND;
  else if (z.type === 'SUPPLY') type = ZoneType.MOM_SUPPLY;
  else type = ZoneType.MOM_DEMAND;
  const reactionStatus: DXYZone['reactionStatus'] =
    z.freshness === 'FRESH' ? 'virgin'
      : z.freshness === 'DEPLETED' || z.freshness === 'VIOLATED' ? 'depleted' : 'active';
  return {
    id: z.id,
    floor: z.bottom,
    ceiling: z.top,
    type,
    isBoM,
    reactionCount: z.reactionEvents.length,
    reactionStatus,
    confluence: z.confluence,
    pillars: [],
    zfp: z.zfp,
    createdAt: z.formationMs,
    lastTested: z.reactionEvents.length > 0
      ? z.reactionEvents.reduce((mx, ev) => Math.max(mx, ev.lastTouchMs), 0)
      : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE PRE-FLIGHT (the module's total function — deterministic, temporal-safe)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PriorWeekPreflightInput {
  /** The pair's bars keyed by timeframe (already fixture-scoped to the
   *  current anchor — the module scopes further to ≤ priorAnchor). */
  barsByTf: Record<string, OHLCBar[]>;
  /** The current week's start (UTC midnight Monday). */
  weekStartMs: number;
  /** The current week's temporal anchor (the report's ANCHOR_MS). */
  anchorMs: number;
}

/**
 * runPriorWeekPreflight — the prior-week backwards-mapping pre-flight.
 * Runs the prior week's E1 (buildChartModel) + E2 (ShapeBrain) on bars
 * ≤ priorAnchor ONLY, then extracts the macro storyline. Deterministic
 * (no wall-clock), honest absence (null/[] on insufficient data — never
 * fabricated).
 *
 * @returns the PriorWeekStoryline — the context the current week's E2
 *          brain consumes (the parallel agent's shape-brain wiring reads
 *          the field `priorStoryline` attached to the injected zone map).
 */
export async function runPriorWeekPreflight(
  pair: string,
  input: PriorWeekPreflightInput,
): Promise<PriorWeekStoryline> {
  const { barsByTf, weekStartMs, anchorMs } = input;
  const priorWeekStartMs = weekStartMs - 7 * MS_PER_DAY;
  const priorAnchorMs = weekStartMs; // the prior week's end

  // ── 1. TEMPORAL DISCIPLINE: scope every bar to ≤ priorAnchor (never
  //    the current week's bars — the no-future-leak invariant). ──
  const scope = (bars?: OHLCBar[]): OHLCBar[] =>
    (bars ?? [])
      .filter((b) => b.timestamp <= priorAnchorMs && b.timestamp <= anchorMs)
      .sort((a, b) => a.timestamp - b.timestamp);
  const bars1H = scope(barsByTf['1H']);
  const bars4H = scope(barsByTf['4H']);
  const bars30m = scope(barsByTf['30m']);
  const bars15m = scope(barsByTf['15m']);
  const spot = bars4H.length > 0
    ? bars4H[bars4H.length - 1]!.close
    : bars1H.length > 0 ? bars1H[bars1H.length - 1]!.close : 0;

  // ── 2. THE PRIOR WEEK'S E1 — the same buildChartModel machinery the
  //    report calls, scoped to the prior window. ──
  const priorWeekStartStr = new Date(priorWeekStartMs).toISOString().slice(0, 10);
  const model = buildChartModel(
    pair,
    priorWeekStartStr,
    bars1H,
    bars4H,
    bars30m,
    spot,
    undefined,
    bars15m,
  );

  // ── 3. THE PRIOR WEEK'S E2 — the ShapeBrain on the prior window. ──
  const snap: ZoneMapSnapshot = {
    version: 1,
    timestamp: 0,
    instrument: pair,
    zones: model.zones.map(toDxyZone),
    spots: { [pair]: model.spot },
  };
  const ltfZones = model.zones.filter((z) => z.timeframe === '30m').map(toDxyZone);
  const brain = new ShapeBrain();
  brain.setZoneMap(snap, ltfZones);
  const e2 = await brain.compute();
  const dayDecomp = e2?.shapeChain.dayDecomposition ?? [];
  const priorShapeChain = dayDecomp.map((d) => ({
    day: d.day,
    shape: d.shape,
    direction: d.direction ?? 'RANGE',
  }));

  // ── 4a. SWEEP ORIGIN — the narrative's sweep-origin logic on the prior
  //    window (the same findSweepOrigin machinery buildChartModel runs). ──
  const sweepOrigin = model.narrative.sweepOrigin;

  // ── 4b. RANGE TOP/BOTTOM — the prior window's extremes (the highest
  //    high / lowest low over the prior week's 1H bars, with their ms). ──
  const rangeTop = windowExtreme(bars1H, priorWeekStartMs, priorAnchorMs, 'high');
  const rangeBottom = windowExtreme(bars1H, priorWeekStartMs, priorAnchorMs, 'low');

  // ── 4c. DEFENDED/BROKEN/UNTESTED (Law 28) + DEPLETION (3x+) ──
  const defendedZones: PriorWeekStoryline['defendedZones'] = [];
  const depletedZones: PriorWeekStoryline['depletedZones'] = [];
  for (const z of model.zones) {
    const center = (z.top + z.bottom) / 2;
    const count = z.reactionEvents.length;
    if (z.freshness === 'VIOLATED') {
      defendedZones.push({ id: z.id, price: center, status: 'BROKEN', reactionCount: count });
    } else if (count === 0) {
      defendedZones.push({ id: z.id, price: center, status: 'UNTESTED', reactionCount: 0 });
    } else if (count <= 2) {
      defendedZones.push({ id: z.id, price: center, status: 'DEFENDED', reactionCount: count });
    }
    if (count >= 3) depletedZones.push({ id: z.id, price: center, reactionCount: count });
  }

  // ── 4d. ROLE REVERSALS (Law 29 — the broken support whose price sits
  //    above it now = new resistance; the mirror: broken resistance below
  //    price = new support). ──
  const roleReversals: PriorWeekStoryline['roleReversals'] = [];
  for (const z of model.zones) {
    if (z.freshness !== 'VIOLATED') continue;
    const center = (z.top + z.bottom) / 2;
    if (z.type === 'DEMAND' && center > model.spot) {
      roleReversals.push({ id: z.id, price: center, from: 'SUPPORT', to: 'RESISTANCE' });
    } else if (z.type === 'SUPPLY' && center < model.spot) {
      roleReversals.push({ id: z.id, price: center, from: 'RESISTANCE', to: 'SUPPORT' });
    }
  }

  // ── 5. THE STORYLINE CONTEXT (honest absence — empty/[] when the data
  //    is insufficient; never fabricated). ──
  return {
    pair,
    priorWeekStartMs,
    priorAnchorMs,
    sweepOrigin,
    rangeTop,
    rangeBottom,
    defendedZones,
    roleReversals,
    depletedZones,
    priorShapeChain,
  };
}

/** The prior window's extreme (highest high / lowest low) over the 1H
 *  bars in [windowStartMs, windowEndMs), with the extreme bar's ms.
 *  Deterministic; null when no bar qualifies. */
function windowExtreme(
  bars: OHLCBar[],
  windowStartMs: number,
  windowEndMs: number,
  side: 'high' | 'low',
): { price: number; ms: number } | null {
  let best = side === 'high' ? -Infinity : Infinity;
  let bestMs = 0;
  let found = false;
  for (const b of bars) {
    if (b.timestamp < windowStartMs || b.timestamp >= windowEndMs) continue;
    const v = side === 'high' ? b.high : b.low;
    if ((side === 'high' && v > best) || (side === 'low' && v < best)) {
      best = v;
      bestMs = b.timestamp;
      found = true;
    }
  }
  return found ? { price: best, ms: bestMs } : null;
}
