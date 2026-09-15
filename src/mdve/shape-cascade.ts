/**
 * shape-cascade.ts — the E2 shape chain cascade (DXY → EU → GU).
 *
 * ═══════════════════════════════════════════════════════════════
 * Wave G1 (2026-08-01 — the CASCADE TRANSLATION ENGINE): the strength-ranked
 * round-robin ZONE DESIGNATION (assignZonesByDay producing the keyZoneId the
 * mirrors consumed) is RETIRED from the designation role. The cascade's job
 * is now ONLY:
 *
 *     copy the shape sequence, invert direction for EU (DXY/EU inverse),
 *     keep direction for GU (EU/GU correlated), and hand off to the
 *     translation engine — src/mdve/cascade-translation.ts (the
 *     structural-equivalence matcher: element + translated role + ±48h
 *     window + position, strength as the secondary noise filter).
 *
 * The designation fields (keyZoneId / keyZonePrice / supplyZoneId /
 * demandZoneId) are null — the E2 CORE designation now lives in the
 * translation engine's output (agent G2 rewires report-v452.ts + mirror.ts
 * to consume it). collectWeekZones + assignZonesByDay are KEPT as the
 * macro-signal feed ONLY (the direction fallback when the source chain
 * carries no day direction) — their output designates NOTHING.
 *
 * The operator's 2026-08-01 ruling (QUOTED — doctrine is never synthesized):
 *   "cascade needs to match to structurally equivalent as primary
 *    confluence and strength as secondary confluence (in case the primary
 *    incorrectly selects some weak penetrated high ZFP zone by accident...)"
 *   "No cascade is literally a translation of the exact map/data that
 *    currently exists on the cascade pair to the receiving pair..."
 * ═══════════════════════════════════════════════════════════════
 */
import type { ShapePredictionSnapshot } from '../types.js';
import type { ChartModel } from './types.js';

export interface ShapeDayZone {
  dayIdx: number;
  day: string;
  shape: string;
  direction: 'LONG' | 'SHORT';
  keyZoneId: string | null;
  keyZonePrice: number | null;
  supplyZonePrice: number | null;
  demandZonePrice: number | null;
  floor: number | null;
  ceiling: number | null;
  confidence: number;
  // Phase 5 E1 fields (2026-07-31) — the E2-authoritative designation contract:
  // mirror.ts consumes these (dayOpenSpot = the DayBand forward-projected London-open
  // price; supplyZoneId/demandZoneId = the E2-designated zone MACHINE ids). The
  // cascade inherits them from the DXY chain's day entries when present.
  // WAVE G1: the designation fields are RETIRED (null) — the translation engine
  // (cascade-translation.ts) produces the structurally-equivalent designation;
  // dayOpenSpot/session remain the E1 DayBand waveform passthrough.
  // ZR-6D (additive): keyZoneType — the E2 PRIMARY side signal (the A1.4
  // RANGE-day top-of-range SUPPLY → SHORT — the direction that consumes the
  // keyZoneId); deepDemandZoneId — the E2 CORE's SECOND demand (the deep
  // demand beneath the primary — the operator's EU #6's BoM-4H LQ-shield
  // structure). The E3-consumed contract declares them for forward-compat.
  dayOpenSpot?: number;
  supplyZoneId?: string | null;
  demandZoneId?: string | null;
  keyZoneType?: 'SUPPLY' | 'DEMAND' | null;
  deepDemandZoneId?: string | null;
  session?: string;
}

export interface CascadedShapeChain {
  pair: string;
  storylineBias: string;
  days: ShapeDayZone[];
}

const DAY_MS = 24 * 3_600_000;

interface ZoneCand {
  zoneId: string; center: number; type: 'SUPPLY' | 'DEMAND';
  strength: number; firstActiveMs: number;
}

/**
 * Collect ALL zones active during the week, sorted by strength.
 * Each zone appears once with its FIRST active timestamp.
 *
 * WAVE G1: the macro-signal feed (designation RETIRED) — this supplies the
 * per-day supply/demand strength distribution used ONLY for the direction
 * fallback (the source chain's dayDecomposition carries no day direction).
 * The output designates no zone.
 */
function collectWeekZones(model: ChartModel, weekStartMs: number, anchorMs: number): ZoneCand[] {
  const winStart = weekStartMs - DAY_MS;
  const winEnd = anchorMs + DAY_MS;
  const out: ZoneCand[] = [];
  const seen = new Set<string>();

  for (const z of model.zones) {
    if (z.freshness === 'VIOLATED') continue;
    const type = z.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND';
    const events = z.reactionEvents ?? [];
    const weekEvents = events.filter(e => e.lastTouchMs >= winStart && e.lastTouchMs <= winEnd);
    if (!weekEvents.length && z.formationMs < winStart) continue;
    if (seen.has(z.id)) continue;
    seen.add(z.id);
    const firstMs = weekEvents.length > 0
      ? Math.min(...weekEvents.map(e => e.lastTouchMs))
      : z.formationMs;
    out.push({ zoneId: z.id, center: (z.top + z.bottom) / 2, type,
      strength: (z.confluence ?? 0) * 2 + (100 - (z.zfp ?? 50)), firstActiveMs: firstMs });
  }

  for (const z of model.lmv.table) {
    const candles = z.candles ?? [];
    const weekCandles = candles.filter(c => c.timestamp >= winStart && c.timestamp <= winEnd);
    if (!weekCandles.length) continue;
    const id = `LMV-${z.center.toFixed(5)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ zoneId: id, center: z.center,
      type: z.side === 'SELL_SIDE' ? 'SUPPLY' : 'DEMAND',
      strength: (100 - (z.zfp ?? 50)) + weekCandles.length,
      firstActiveMs: Math.min(...weekCandles.map(c => c.timestamp)) });
  }

  return out;
}

/**
 * Assign zones to days via CHRONOLOGICAL distribution:
 * Sort each type by firstActiveMs, then assign one per day in order.
 * This naturally distributes different zones to different days.
 *
 * WAVE G1: macro-signal only — the per-day supply/demand assignment feeds
 * the direction fallback (below). It NO LONGER designates the keyZone the
 * mirrors consume (that is the translation engine's job).
 */
function assignZonesByDay(
  cands: ZoneCand[],
  weekStartMs: number,
): { supply: (ZoneCand | null)[]; demand: (ZoneCand | null)[] } {
  const supply = [...cands.filter(c => c.type === 'SUPPLY')].sort((a, b) => a.firstActiveMs - b.firstActiveMs);
  const demand = [...cands.filter(c => c.type === 'DEMAND')].sort((a, b) => a.firstActiveMs - b.firstActiveMs);

  const supplyByDay: (ZoneCand | null)[] = [null, null, null, null, null];
  const demandByDay: (ZoneCand | null)[] = [null, null, null, null, null];

  // Assign each supply zone to its closest day
  for (const z of supply) {
    const dayIdx = Math.max(0, Math.min(4, Math.floor((z.firstActiveMs - weekStartMs) / DAY_MS)));
    if (!supplyByDay[dayIdx]) supplyByDay[dayIdx] = z;
    else {
      // Day already taken — find next free day
      for (let i = 0; i < 5; i++) {
        if (!supplyByDay[i]) { supplyByDay[i] = z; break; }
      }
    }
  }
  for (const z of demand) {
    const dayIdx = Math.max(0, Math.min(4, Math.floor((z.firstActiveMs - weekStartMs) / DAY_MS)));
    if (!demandByDay[dayIdx]) demandByDay[dayIdx] = z;
    else {
      for (let i = 0; i < 5; i++) {
        if (!demandByDay[i]) { demandByDay[i] = z; break; }
      }
    }
  }

  return { supply: supplyByDay, demand: demandByDay };
}

/**
 * The source chain's day trade direction (the E1 dayDecomposition's
 * 'UP'|'DOWN'|'RANGE'|'NEUTRAL' → the source pair's trade direction:
 * DOWN → SHORT, UP → LONG). RANGE/NEUTRAL/absent → null (no directional
 * claim — the zone macro-signal fallback takes over). Total.
 */
function sourceDayDirection(
  srcDir: string | undefined,
): 'LONG' | 'SHORT' | null {
  if (srcDir === 'DOWN') return 'SHORT';
  if (srcDir === 'UP') return 'LONG';
  return null;
}

/**
 * The receiving pair's day direction from its OWN zone macro-signal (the
 * strength distribution — the retired assignZonesByDay's surviving use).
 * Supply-dominant → SHORT, else LONG. Total (the distribution always picks
 * a side — the current cascade's euDir doctrine, verbatim).
 */
function zoneSignalDirection(
  supply: ZoneCand | null,
  demand: ZoneCand | null,
): 'LONG' | 'SHORT' {
  return supply && (!demand || supply.strength >= demand.strength) ? 'SHORT' : 'LONG';
}

export function cascadeShapeChain(
  dxyShape: ShapePredictionSnapshot,
  euModel: ChartModel, guModel: ChartModel,
  weekStartMs?: number,
): { eu: CascadedShapeChain; gu: CascadedShapeChain } {
  // ── Total: an absent shapeChain yields empty chains (honest — the
  //    cascade has no waveform to copy; never throw). ──
  const chain = dxyShape?.shapeChain;
  const preds = chain?.chain ?? [];
  const dayByDay = chain?.dayByDay ?? [];
  const dayDec = chain?.dayDecomposition ?? [];
  const wStart = weekStartMs ?? euModel.anchor.weekStartMs ?? 0;
  const anchorMs = euModel.anchor.anchorMs ?? (wStart + 5 * DAY_MS);

  // ── The macro-signal feed (designation RETIRED): the per-day supply/
  //    demand distribution — the direction fallback when the source chain
  //    carries no day direction. Designates nothing. ──
  const euZones = collectWeekZones(euModel, wStart, anchorMs);
  const euAssigned = assignZonesByDay(euZones, wStart);

  const euDays: ShapeDayZone[] = [];
  const guDays: ShapeDayZone[] = [];

  for (let i = 0; i < 5; i++) {
    const pred = preds[i];
    const dEntry = dayByDay[i];
    const dd = dayDec[i];
    const shape = String(pred?.shape ?? dEntry?.shape ?? dd?.shape ?? 'SS');
    const day = pred?.day ?? dEntry?.day ?? dd?.day ?? `day-${i}`;
    const conf = pred?.confidence ?? dEntry?.confidence ?? dd?.confidence ?? 0.5;

    // ── Direction: the source chain's day direction, INVERTED for EU
    //    (DXY/EU move inversely — a DXY DOWN day is an EU LONG day) and
    //    KEPT for GU (EU/GU move together — the EU cascade's direction
    //    carries). Fallback when the source has no day direction: the
    //    receiving pair's own zone macro-signal (deterministic). ──
    // ZR-6D — the RANGE/NEUTRAL day's direction from the DXY PRIMARY side
    // (the A1.4 RANGE-day keyZoneId IS the top-of-range SUPPLY — the
    // direction that consumes the keyZoneId is SHORT; a DEMAND primary →
    // LONG), INVERTED for EU (a DXY supply-keyed RANGE day → the EU LONG
    // mirror's day). This carries the operator's GU structure: the DXY Mon
    // SS (supply-keyed) → EU LONG → GU LONG (the operator's #1 Mon LONG);
    // the DXY Fri SS → EU LONG → GU LONG — while the GU CORE (the mirrors'
    // shapeDay source) resolves its own Friday SHORT via the keyZoneType
    // direction fix (the operator's #7 Fri SHORT RWL). ──
    const dxyTrade = sourceDayDirection(dd?.direction);
    const dxyRangeSide: 'LONG' | 'SHORT' | null =
      dxyTrade !== null ? null
        : dd?.keyZoneType === 'SUPPLY' ? 'SHORT'
          : dd?.keyZoneType === 'DEMAND' ? 'LONG' : null;
    const euSupply = euAssigned.supply[i];
    const euDemand = euAssigned.demand[i];
    const euDir: 'LONG' | 'SHORT' =
      dxyRangeSide !== null
        ? (dxyRangeSide === 'SHORT' ? 'LONG' : 'SHORT')
        : dxyTrade === null
          ? zoneSignalDirection(euSupply, euDemand)
          : dxyTrade === 'SHORT' ? 'LONG' : 'SHORT';
    const guDir = euDir;   // KEPT for GU (the EU cascade's direction carries)

    const zf = pred?.zfpFloor ?? 0;
    const zc = pred?.zfpCeiling ?? 0;

    // ── Wave G1: the E2 CORE designation is RETIRED from the cascade. The
    //    keyZoneId/keyZonePrice/supplyZoneId/demandZoneId fields are null —
    //    the translation engine (cascade-translation.ts) produces the
    //    structurally-equivalent designation. dayOpenSpot/session remain
    //    the E1 DayBand waveform passthrough (mirror.ts:1274's on-side
    //    gate consumes dayOpenSpot — the E2 waveform's day-native level). ──
    euDays.push({ dayIdx: i, day, shape, direction: euDir,
      keyZoneId: null, keyZonePrice: null,
      supplyZonePrice: null, demandZonePrice: null,
      floor: zf > 0 ? zf : null, ceiling: zc > 0 ? zc : null, confidence: conf,
      dayOpenSpot: dEntry?.dayOpenSpot ?? dd?.dayOpenSpot,
      supplyZoneId: null, demandZoneId: null,
      // ZR-6D: the DXY PRIMARY side rides the translated lane as the
      // direction signal (a side label — never a DXY zone id; the E2 CORE's
      // deep-demand designation stays with the pair brains).
      keyZoneType: (dd?.keyZoneType as 'SUPPLY' | 'DEMAND' | undefined) ?? null,
      deepDemandZoneId: null,
      session: dEntry?.session ?? dd?.session });
    guDays.push({ dayIdx: i, day, shape, direction: guDir,
      keyZoneId: null, keyZonePrice: null,
      supplyZonePrice: null, demandZonePrice: null,
      floor: zf > 0 ? zf : null, ceiling: zc > 0 ? zc : null, confidence: conf,
      dayOpenSpot: dEntry?.dayOpenSpot ?? dd?.dayOpenSpot,
      supplyZoneId: null, demandZoneId: null,
      keyZoneType: (dd?.keyZoneType as 'SUPPLY' | 'DEMAND' | undefined) ?? null,
      deepDemandZoneId: null,
      session: dEntry?.session ?? dd?.session });
  }

  return {
    eu: { pair: 'EUR/USD', storylineBias: chain?.storylineBias ?? 'NEUTRAL', days: euDays },
    gu: { pair: 'GBP/USD', storylineBias: chain?.storylineBias ?? 'NEUTRAL', days: guDays },
  };
}
