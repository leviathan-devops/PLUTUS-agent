/**
 * PROBE-E2-DESIGNATION — the N1 diagnostic: WHY do the DXY/GU Monday
 * designations miss the operator's LQZ levels (DXY 101.296 → golden 101.14;
 * GU 1.33270 → golden 1.33330)?
 *
 * The probe builds the EXACT pipeline inputs of diag-reasoning-chain-golden.ts
 * (models + prior storylines + E2 core, anchor-locked) and then RE-WALKS the
 * Monday designation with the exact projectZoneForDay selection code (copied
 * verbatim from shape-brain.ts:1515-1991) — printing every stage: the day
 * band, the reaches, the candidate pools with their sort keys, the picks.
 *
 * THE FAITHFULNESS ASSERTION: the re-walked pick id MUST equal the E2 core's
 * actual Monday designation (keyZoneId). A mismatch = the copy drifted — the
 * probe is then worthless and must be fixed before the diagnosis is read.
 *
 * READ-ONLY — never writes, never mutates. Run: bun probe-e2-designation.ts
 */

import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars, getRunAnchorMs, dayOpenSpotAt } from './src/mdve/temporal.js';
import { runPriorWeekPreflight, type PriorWeekStoryline } from './src/mdve/prior-week-preflight.js';
import { buildE2Core, toDxyZone } from './report-v452.js';
import { pressureScoreOf } from './src/mdve/lexicons/zone-pressure.js';
import { ZoneType } from './src/types.js';
import type { LexiconData } from './src/mdve/lexicons/types.js';
import type { DXYZone } from './src/types.js';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000; // ANALYSIS_POINT_MS — Monday 2026-07-06 06:00 UTC (the START of the pre-London hour — the operator's temporal law; the W1 re-anchor from the 07:00 1783321200000)
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  // THE ANALYSIS-POINT SPOT (the §2.1 semantic — the W1 fix): the last 1H
  // close at/before the anchor = the 05:00 bar's close for the 06:00 point.
  // NEVER the 4H close (the coarser bar blurs the exact analysis price).
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

// ── the pipeline inputs (EXACTLY the golden diag's wiring) ──
const models: Record<string, ChartModel | null> = {
  DXY: await buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))),
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))),
  'GBP/USD': await buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))),
};

const priorStorylines: Record<string, PriorWeekStoryline | undefined> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: {
      '1H': gateBars(barsFor(pair, '1H', ANCHOR_MS)), '4H': gateBars(barsFor(pair, '4H', ANCHOR_MS)),
      '30m': gateBars(barsFor(pair, '30m', ANCHOR_MS)), '15m': gateBars(barsFor(pair, '15m', ANCHOR_MS)),
    },
    weekStartMs: WEEK_START_MS,
    anchorMs: ANCHOR_MS,
  });
}

const e2 = await buildE2Core(models as Record<string, ChartModel>, priorStorylines);

// ── the faithful re-walk (the exact projectZoneForDay selection, copied
//    verbatim from shape-brain.ts:1534-1991 — the Monday case) ──
const SHAPE_TRAVEL: Record<string, { min: number; mid: number; max: number }> = {
  SS: { min: 5, mid: 15, max: 30 },
  BS: { min: 30, mid: 65, max: 100 },
  WL: { min: 50, mid: 125, max: 200 },
  RWL: { min: 30, mid: 65, max: 100 },
  R: { min: 10, mid: 30, max: 50 },
  PBS: { min: 30, mid: 65, max: 100 },
  WLS: { min: 10, mid: 30, max: 50 },
  default: { min: 10, mid: 30, max: 50 },
};

/** THE DATA-DERIVED TRAVEL (the §2.3 STAGE 1 — the probe's copy of the
 *  shape-brain's function — the W3 lockstep): the ATR-proxy band, the fixed
 *  ladder as the fallback only. */
function dataDerivedTravel(pool: DXYZone[], pipSize: number): { min: number; mid: number; max: number; nearEdge: number } {
  let minWidth = Infinity;
  for (const z of pool) {
    const w = z.ceiling - z.floor;
    if (w > 0 && w < minWidth) minWidth = w;
  }
  const atrProxyPips = minWidth === Infinity ? 0 : (4 * minWidth) / pipSize;
  if (atrProxyPips <= 0) return { min: 0, mid: 0, max: 0, nearEdge: 0 };
  return { min: 0.5 * atrProxyPips, mid: 1.0 * atrProxyPips, max: 1.5 * atrProxyPips, nearEdge: 0.25 * atrProxyPips };
}
const isSupplyZone = (z: DXYZone): boolean =>
  z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.IP_SUPPLY
  || z.type === ZoneType.LSZ_SUPPLY || z.type === ZoneType.BOM_SUPPLY;
const isDemandZone = (z: DXYZone): boolean =>
  z.type === ZoneType.MOM_DEMAND || z.type === ZoneType.IP_DEMAND
  || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.BOM_DEMAND;
const zoneCenter = (z: DXYZone): number => (z.floor + z.ceiling) / 2;
const zoneTimeframeFromId = (id: string): string | undefined => {
  const seg = id.split('|');
  if (seg.length < 4) return undefined;
  const tf = seg[1];
  return tf === '4H' || tf === '1H' || tf === '30m' || tf === '15m' ? tf : undefined;
};
const zoneToLexiconPressure = (z: DXYZone): LexiconData => {
  const isDemand = z.type === ZoneType.MOM_DEMAND || z.type === ZoneType.BOM_DEMAND
    || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND;
  const isBom = z.isBoM || z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.BOM_DEMAND;
  return {
    zoneType: isDemand ? 'DEMAND' : 'SUPPLY',
    zoneClassification: isBom ? 'BoM' : 'MoM',
    zoneTimeframe: (zoneTimeframeFromId(z.id) ?? '1H') as '1H' | '4H' | '30m' | '15m',
    zoneZfp: z.zfp,
    reactionCount: z.reactionCount,
    mitigationCount: z.pressure?.mitigationCount ?? z.reactionCount,
    reactionEvents: z.pressure?.mitigationCount != null
      ? Array.from({ length: z.pressure.mitigationCount }, () => ({ pierced: z.pressure?.pierced ?? false }))
      : (z.reactionCount > 0 ? Array.from({ length: z.reactionCount }, () => ({ pierced: z.pressure?.pierced ?? false })) : []),
    freshness: z.reactionStatus === 'virgin' ? 'FRESH'
      : z.reactionStatus === 'depleted' ? 'DEPLETED'
      : (z.reactionCount === 0 ? 'FRESH' : z.reactionCount >= 3 ? 'DEPLETED' : 'TESTED_1X'),
    pierced: z.pressure?.pierced ?? false,
    strongHoldCount: z.reactionCount,
    absorption: z.pressure?.absorption,
  };
};
const formationMsOf = (z: DXYZone): number => {
  if (Number.isFinite(z.createdAt) && z.createdAt > 0) return z.createdAt;
  const seg = String(z.id).split('|');
  const ms = Number(seg[0] === 'OB' ? seg[3] : seg[2]);
  return Number.isFinite(ms) && ms > 1e12 ? ms : 0;
};

interface ReWalkResult {
  day: string; shape: string; direction: string;
  dayOpenSpot: number; floor: number; ceiling: number;
  travelMidPips: number; travelMaxPips: number;
  expectedReach: number; oppositeReach: number;
  dayReachHigh: number | null; dayReachLow: number | null;
  supplyReach: number; demandReach: number;
  supplyFloor: number; demandCeiling: number;
  recencyStart: number | null; recencyEnd: number | null;
  dayLimitMs: number | null; windowStartMs: number | null;
  supplyCands: Array<{ z: DXYZone; zfp: number; pressure: number; dayWin: number; recency: number; distPips: number }>;
  demandCands: Array<{ z: DXYZone; zfp: number; pressure: number; dayWin: number; recency: number; distPips: number }>;
  supplyPickId: string | null; demandPickId: string | null; pickId: string | null;
}

function reWalkMonday(
  pair: string,
  model: ChartModel,
  dayShape: string,
  dayDir: string,
  storyline: unknown,
): ReWalkResult {
  const zones = model.zones.map(toDxyZone);
  const ltfZones = model.zones.filter((z) => z.timeframe === '30m').map(toDxyZone);
  const pool = [...zones, ...ltfZones];
  // THE DATA-DERIVED TRAVEL (the §2.3 STAGE 1 — the W3 lockstep copy): the
  // map's structure scaled by the ATR proxy, SHAPE_TRAVEL as the fallback
  // only (the C-1 fix — the probe mirrors the shape-brain).
  const pipSize = model.spot > 50 ? 0.01 : 0.0001;
  const derivedTravel = dataDerivedTravel(pool, pipSize);
  const travel = derivedTravel.max > 0
    ? derivedTravel
    : (SHAPE_TRAVEL[dayShape] ?? SHAPE_TRAVEL['default']!);
  const travelMid = travel.mid * pipSize;
  const travelMax = travel.max * pipSize;
  // THE ANALYSIS-POINT DAY OPEN (the §2.1 semantic — the W1 fix): the 06:00
  // analysis-point price via dayOpenSpotAt (the last 1H close at/before the
  // anchor), NEVER the Friday close. The model.spot equals the same value
  // when the model is built on bars ≤ ANCHOR_MS — but the EXPLICIT read is
  // the contract (a model built on a wider window cannot silently leak).
  const dayOpenSpot = dayOpenSpotAt(getRunAnchorMs(), barsFor(pair, '1H', getRunAnchorMs()));
  const floor = dayOpenSpot - travelMax;
  const ceiling = dayOpenSpot + travelMax;
  const inBand = (z: DXYZone): boolean => z.ceiling >= floor && z.floor <= ceiling;
  const DAY_MS = 86400000;
  const dayIdxOf = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf('Mon');
  let dayReachHigh: number | null = null;
  let dayReachLow: number | null = null;
  const st = storyline as { priorAnchorMs?: number } | null;
  if (st && dayIdxOf >= 0) {
    const weekStart = st.priorAnchorMs;
    if (weekStart && weekStart > 0) {
      const dayStart = weekStart + dayIdxOf * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const daySupply = pool.filter((z) => isSupplyZone(z) && z.createdAt >= dayStart && z.createdAt < dayEnd);
      const dayDemand = pool.filter((z) => isDemandZone(z) && z.createdAt >= dayStart && z.createdAt < dayEnd);
      if (daySupply.length > 0) dayReachHigh = Math.max(...daySupply.map((z) => z.ceiling));
      if (dayDemand.length > 0) dayReachLow = Math.min(...dayDemand.map((z) => z.floor));
    }
  }
  let recencyStart: number | null = null;
  let recencyEnd: number | null = null;
  if (st && dayIdxOf >= 0) {
    const weekStart = st.priorAnchorMs;
    if (weekStart && weekStart > 0) {
      recencyStart = weekStart + (dayIdxOf - 1) * DAY_MS;
      recencyEnd = weekStart + (dayIdxOf + 1) * DAY_MS;
    }
  }
  const recencyRank = (z: DXYZone): number =>
    recencyStart != null && recencyEnd != null
      && formationMsOf(z) >= recencyStart && formationMsOf(z) < recencyEnd ? 0 : 1;
  const weekStartMs = st?.priorAnchorMs ?? 0;
  const dayStartMs = weekStartMs > 0 && dayIdxOf >= 0 ? weekStartMs + dayIdxOf * DAY_MS : null;
  const dayLimitMs = dayStartMs != null ? Math.min(dayStartMs + DAY_MS - 1, ANCHOR_MS) : null;
  const DAY_WINDOW_HOURS = 72;
  const windowStartMs = dayStartMs != null ? dayStartMs - DAY_WINDOW_HOURS * 3600 * 1000 : null;
  const dayWindowRank = (z: DXYZone): number =>
    windowStartMs != null && formationMsOf(z) >= windowStartMs ? 1 : 0;
  const expectedReach = dayDir === 'SHORT' ? dayOpenSpot + travelMid
    : dayDir === 'LONG' ? dayOpenSpot - travelMid : dayOpenSpot;
  const oppositeReach = dayDir === 'SHORT' ? dayOpenSpot - travelMid
    : dayDir === 'LONG' ? dayOpenSpot + travelMid : dayOpenSpot;
  const isStorylineRange = dayDir === 'RANGE' && st != null;
  const supplyReachRaw = isStorylineRange ? dayOpenSpot + travelMax
    : (dayDir === 'LONG' ? oppositeReach : expectedReach);
  const demandReachRaw = isStorylineRange ? dayOpenSpot - travelMax
    : (dayDir === 'SHORT' ? oppositeReach : expectedReach);
  const supplyReach = dayReachHigh != null ? Math.min(supplyReachRaw, dayReachHigh) : supplyReachRaw;
  const demandReach = dayReachLow != null ? Math.max(demandReachRaw, dayReachLow) : demandReachRaw;
  const supplyFloor = dayReachLow != null ? dayReachLow : dayOpenSpot;
  const demandCeiling = dayReachHigh != null ? dayReachHigh : dayOpenSpot;
  const supplyCands = pool.filter((z) => isSupplyZone(z)
    && z.floor >= supplyFloor && z.floor <= supplyReach && inBand(z)
    && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));
  const demandCands = pool.filter((z) => isDemandZone(z)
    && z.ceiling <= demandCeiling && z.ceiling >= demandReach && inBand(z)
    && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));
  const keyOf = (z: DXYZone) => ({
    zfp: z.zfp,
    pressure: pressureScoreOf(zoneToLexiconPressure(z)),
    dayWin: dayWindowRank(z),
    recency: recencyRank(z),
    distPips: Math.abs(zoneCenter(z) - expectedReach) / pipSize,
  });
  const supplyKeyed = supplyCands.map((z) => ({ z, ...keyOf(z) }));
  const demandKeyed = demandCands.map((z) => ({ z, ...keyOf(z) }));
  const strongest = (cands: Array<{ z: DXYZone; zfp: number; pressure: number; dayWin: number; recency: number; distPips: number }>, reach: number) =>
    [...cands].sort((a, b) =>
      // THE EVIDENCE TOTAL ORDER (the §2.3 STAGE 4 — the W3 lockstep copy):
      // the pressure DESC FIRST, the zfp asc SECOND, the position from the
      // OPEN (never the invented reach) — the probe mirrors the shape-brain.
      (b.pressure - a.pressure) ||
      ((a.zfp ?? 99) - (b.zfp ?? 99)) ||
      (b.dayWin - a.dayWin) ||
      (a.recency - b.recency) ||
      (Math.abs(zoneCenter(a.z) - dayOpenSpot) - Math.abs(zoneCenter(b.z) - dayOpenSpot)) ||
      (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0),
    )[0];
  const supplyRungs = supplyKeyed.filter((c) => c.z.id.startsWith('LMV|'));
  const demandRungs = demandKeyed.filter((c) => c.z.id.startsWith('LMV|'));
  // THE REACH REFS (the rung-vs-zone pool's shared reference — mirrors the
  // shape-brain's supplyReachRef/demandReachRef).
  const supplyReachRef = dayReachHigh != null
    ? Math.min(isStorylineRange ? dayOpenSpot + travelMax
        : (dayDir === 'SHORT' ? expectedReach : oppositeReach), dayReachHigh)
    : (isStorylineRange ? dayOpenSpot + travelMax
        : (dayDir === 'SHORT' ? expectedReach : oppositeReach));
  const demandReachRef = dayReachLow != null
    ? Math.max(isStorylineRange ? dayOpenSpot - travelMax
        : (dayDir === 'LONG' ? expectedReach : oppositeReach), dayReachLow)
    : (isStorylineRange ? dayOpenSpot - travelMax
        : (dayDir === 'LONG' ? expectedReach : oppositeReach));
  // THE §8.1 UNION (the §2.3 STAGE 2 — the W3 lockstep copy): zones AND
  // rungs are ONE pool — the old rung-direct bypass (rungs.length > 0 →
  // strongest(rungs)) is dead.
  let supplyPick = strongest(supplyKeyed, supplyReachRef);
  let demandPick = strongest(demandKeyed, demandReachRef);
  let pick = dayDir === 'SHORT' ? supplyPick
    : dayDir === 'LONG' ? demandPick
    : isStorylineRange ? (supplyPick ?? demandPick)
    : strongest([...supplyKeyed, ...demandKeyed], expectedReach);
  // the I2 S/D-zone preference (the bare-LMV → containing-zone upgrade)
  const pickSide: 'SUPPLY' | 'DEMAND' | undefined = pick && isSupplyZone(pick.z) ? 'SUPPLY' : pick && isDemandZone(pick.z) ? 'DEMAND' : undefined;
  if (pick && pickSide && String(pick.z.id).startsWith('LMV|')) {
    const sideCands = pickSide === 'SUPPLY' ? supplyKeyed : demandKeyed;
    const i2ReachRaw = isStorylineRange ? dayOpenSpot + travelMax : expectedReach;
    const i2SortReach = pickSide === 'SUPPLY'
      ? (dayReachHigh != null ? Math.min(i2ReachRaw, dayReachHigh) : i2ReachRaw)
      : (dayReachLow != null ? Math.max(i2ReachRaw, dayReachLow) : i2ReachRaw);
    const edgeBandPips = derivedTravel.nearEdge > 0 ? derivedTravel.nearEdge : 5;
    const activeEdgeOf = (z: DXYZone): number => pickSide === 'SUPPLY' ? z.ceiling : z.floor;
    const qualifying = sideCands
      .filter((c) => !String(c.z.id).startsWith('LMV|')
        && (String(c.z.id).split('|')[1] === '1H' || String(c.z.id).split('|')[1] === '4H'))
      .map((c) => ({
        c,
        internal: pool.filter((r) =>
          String(r.id).startsWith('LMV|') &&
          (pickSide === 'SUPPLY' ? isSupplyZone(r) : isDemandZone(r)) &&
          r.floor >= c.z.floor - 1e-9 && r.ceiling <= c.z.ceiling + 1e-9),
      }))
      .filter((x) => x.internal.length > 0)
      .filter((x) => x.internal.some((r) => {
        const farEdge = pickSide === 'SUPPLY' ? r.ceiling : r.floor;
        return Math.abs(activeEdgeOf(x.c.z) - farEdge) / pipSize <= edgeBandPips;
      }))
      .sort((a, b) => {
        const nearA = Math.min(...a.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)));
        const nearB = Math.min(...b.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)));
        return (nearA - nearB) || (a.c.z.zfp - b.c.z.zfp) || (a.c.z.id < b.c.z.id ? -1 : a.c.z.id > b.c.z.id ? 1 : 0);
      })[0];
    if (qualifying) {
      pick = qualifying.c;
      if (pickSide === 'SUPPLY') supplyPick = qualifying.c;
      else demandPick = qualifying.c;
    }
  }
  return {
    day: 'Mon', shape: dayShape, direction: dayDir,
    dayOpenSpot, floor, ceiling,
    travelMidPips: travel.mid, travelMaxPips: travel.max,
    expectedReach, oppositeReach,
    dayReachHigh, dayReachLow,
    supplyReach, demandReach, supplyFloor, demandCeiling,
    recencyStart, recencyEnd, dayLimitMs, windowStartMs,
    supplyCands: supplyKeyed, demandCands: demandKeyed,
    supplyPickId: supplyPick?.z.id ?? null,
    demandPickId: demandPick?.z.id ?? null,
    pickId: pick?.z.id ?? null,
  };
}

// ── the RAW day-direction semantics (the shape switch in buildDayDecomposition
//    :2151-2230 — SS→RANGE · BS/PBS→failingZone?failingDirection:inferDirection
//    · R→NEUTRAL · WL/PWL→RANGE · RWL/PRWL→failingZone?'DOWN'/'UP':'RANGE'
//    · RS→UP · WLS→RANGE) — then toEntryDirection('NEUTRAL')='RANGE'. ──
function rawDayDirection(shape: string, model: ChartModel): string {
  const spot = model.spot;
  const failingZone = model.zones.find((z) => z.zfp > 70); // ZFP_ZONE_FAILURE_THRESHOLD
  const zf = (z: (typeof model.zones)[number]): number => z.bottom; // the ZoneModel floor = bottom (the bottom/top duality — the raw model's floor field)
  switch (shape) {
    case 'SS': return 'RANGE';
    case 'BS': case 'PBS': return failingZone ? (zf(failingZone) > spot ? 'UP' : 'DOWN') : inferDir(model);
    case 'R': case 'RS': return 'NEUTRAL';
    case 'WL': case 'PWL': case 'WLS': return 'RANGE';
    case 'RWL': case 'PRWL': return failingZone ? (zf(failingZone) > spot ? 'DOWN' : 'UP') : 'RANGE';
    default: return 'NEUTRAL';
  }
}
function inferDir(model: ChartModel): string {
  const spot = model.spot;
  const nearestSupply = model.zones.filter((z) => isSupplyZone(toDxyZone(z)) && z.bottom > spot)
    .sort((a, b) => a.bottom - b.bottom)[0];
  const nearestDemand = model.zones.filter((z) => isDemandZone(toDxyZone(z)) && z.top < spot)
    .sort((a, b) => b.top - a.top)[0];
  const supplyDist = nearestSupply ? nearestSupply.bottom - spot : Infinity;
  const demandDist = nearestDemand ? spot - nearestDemand.top : Infinity;
  if (supplyDist === Infinity && demandDist === Infinity) return 'RANGE';
  return demandDist <= supplyDist ? 'UP' : 'DOWN';
}
const toEntryDir = (d: string): 'LONG' | 'SHORT' | 'RANGE' =>
  d === 'UP' ? 'LONG' : d === 'DOWN' ? 'SHORT' : 'RANGE';

// ── the report ──
for (const pair of ['DXY', 'GBP/USD'] as const) {
  const chain = pair === 'DXY' ? e2.dxyChain : e2.guCoreChain;
  const model = models[pair]!;
  console.log(`\n════════ ${pair} — the MONDAY designation ════════`);
  console.log(`model.spot (the ANALYSIS-POINT 1H close — the §2.1 W1 fix) = ${model.spot.toFixed(5)} · pip = ${model.spot > 50 ? 0.01 : 0.0001}`);
  const mon = chain?.days?.[0];
  console.log(`E2 core Mon: shape=${mon?.shape} direction=${mon?.direction} keyZoneId=${mon?.keyZoneId} supplyZoneId=${mon?.supplyZoneId} demandZoneId=${mon?.demandZoneId} keyZoneType=${mon?.keyZoneType} dayOpenSpot=${mon?.dayOpenSpot !== undefined ? mon.dayOpenSpot.toFixed(5) : '?'}`);
  console.log(`\n-- the zone universe (${model.zones.length} zones) --`);
  for (const z of model.zones) {
    const dz = toDxyZone(z as Parameters<typeof toDxyZone>[0]);
    const tag = z.id.startsWith('LMV|') ? 'rung' : `${z.timeframe ?? '?'}`;
    console.log(`  ${z.id} floor=${dz.floor.toFixed(5)} ceil=${dz.ceiling.toFixed(5)} zfp=${dz.zfp} type=${dz.type} isBoM=${dz.isBoM} ${tag} formationMs=${formationMsOf(dz)}`);
  }
  const rawDir = rawDayDirection(mon?.shape ?? 'SS', model);
  const rwDir = toEntryDir(rawDir);
  const rw = reWalkMonday(pair, model, mon?.shape ?? 'SS', rwDir, priorStorylines[pair]);
  console.log(`\n-- the re-walk (shape=${rw.shape} dir=${rw.direction}) --`);
  console.log(`  travel mid=${rw.travelMidPips}p max=${rw.travelMaxPips}p · band [${rw.floor.toFixed(5)}, ${rw.ceiling.toFixed(5)}] · expectedReach=${rw.expectedReach.toFixed(5)} · oppositeReach=${rw.oppositeReach.toFixed(5)}`);
  console.log(`  dayReachHigh=${rw.dayReachHigh?.toFixed(5) ?? 'null'} · dayReachLow=${rw.dayReachLow?.toFixed(5) ?? 'null'} · supplyReach=${rw.supplyReach.toFixed(5)} · demandReach=${rw.demandReach.toFixed(5)} · supplyFloor=${rw.supplyFloor.toFixed(5)} · demandCeiling=${rw.demandCeiling.toFixed(5)}`);
  console.log(`  recency=[${rw.recencyStart ? new Date(rw.recencyStart).toISOString() : 'null'}, ${rw.recencyEnd ? new Date(rw.recencyEnd).toISOString() : 'null'}] · dayLimitMs=${rw.dayLimitMs ? new Date(rw.dayLimitMs).toISOString() : 'null'} · windowStart=${rw.windowStartMs ? new Date(rw.windowStartMs).toISOString() : 'null'}`);
  const show = (cands: ReWalkResult['supplyCands'], label: string) => {
    console.log(`  ${label} (${cands.length}):`);
    for (const c of [...cands].sort((a, b) => a.zfp - b.zfp)) {
      console.log(`    ${c.z.id} zfp=${c.z.zfp} pressure=${c.pressure} dayWin=${c.dayWin} recency=${c.recency} distToExpReach=${c.distPips.toFixed(1)}p center=${zoneCenter(c.z).toFixed(5)} [${c.z.floor.toFixed(5)}, ${c.z.ceiling.toFixed(5)}]`);
    }
  };
  show(rw.supplyCands, 'supplyCands');
  show(rw.demandCands, 'demandCands');
  console.log(`  pick=${rw.pickId} · supplyPick=${rw.supplyPickId} · demandPick=${rw.demandPickId}`);
  const actual = mon?.keyZoneId ?? null;
  console.log(`  FAITHFULNESS: re-walk pick ${rw.pickId === actual ? '=== E2 core (' + actual + ') — the copy is faithful' : '!== E2 core (' + actual + ') — THE COPY DRIFTED, the diagnosis is INVALID'}`);
}
