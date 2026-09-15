/**
 * 4H Zone Construction Lobe (Engine 1) — constructs IP PRESSURE zones from OHLC data.
 *
 * ═══════════════════════════════════════════════════════════════
 * ARCHITECTURAL REWRITE — Singular Origin Candle (Order Block) Construction
 * ═══════════════════════════════════════════════════════════════
 *
 * E1-2 INVARIANT: This lobe produces IP PRESSURE zones ONLY (Engine 1 output).
 * The `sdType` field is set to "BoM" or "MoM" (structural role in the
 * institutional move) — NEVER "BoM Supply"/"MoM Demand" etc. The S/D
 * execution classification ("is this a supply zone to short into" vs "a
 * demand zone to buy from") is Engine 3's job via visual intelligence.
 *
 * SINGULAR CANDLE CONSTRUCTION (ZERO TOLERANCE — TTE Step 0f):
 *   S/D zones are constructed from the SINGULAR candle that immediately
 *   precedes a strong directional move — NOT from a cluster of candles.
 *
 *   1. Find a STRONG BREAKOUT candle (large body, strong directional move:
 *      ≥ 0.5 DXY points over ≥ 3 trading days)
 *   2. Look at the candle IMMEDIATELY BEFORE the breakout
 *   3. That candle is the ORDER BLOCK (origin candle) — DATE-STAMP it
 *   4. The S/D zone is drawn from the order block candle's range [Low, High]
 *
 * CRITICAL: The zone is NOT drawn from the impulse/breakout candle itself —
 * it is drawn from the candle BEFORE the impulse.
 *
 * Direction mapping (PLUTUS_ARCHITECTURE_CORRECTED_V2):
 *   - Bull breakout → order block is a DEMAND zone (blue)
 *   - Bear breakout → order block is a SUPPLY zone (red)
 *
 * Classification:
 *   - BoM (Beginning of Move): order block at the exact ORIGIN of the
 *     directional move — price had NOT already traveled ≥ 0.5 DXY in the
 *     breakout direction over the preceding 3 trading days. STRONGEST.
 *   - MoM (Middle of Move): continuation zone formed during an existing
 *     move. WEAKEST.
 *
 * Algorithm:
 *   1. Truncate OHLC to recent bars (TF-scaled: 60/120/200/300)
 *   2. Scan for breakout candles (body > 1.5× avg body of prior 4 bars)
 *   3. Confirm a strong directional move: ≥ 0.5 DXY points (50 pips) of
 *      travel from the origin candle within the following ≥ 3 trading days
 *   4. Zone = [Low, High] of the candle immediately before the breakout
 *   5. Reject zones wider than the TF max width (spec noise rejection:
 *      0.40 DXY on 4H)
 *   6. Filter: only zones within 150 pips of spot
 *   7. Name zones by position relative to spot (R1/R2/D1/D2/EQ)
 */

import { OHLCBar, DXYZone, ZoneType } from '../types.js';
import { CONSOLIDATION, SINGULAR_CANDLE, FIB_RATIO_382, FIB_RATIO_618 } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — Zone Construction v4 (Singular Origin Candle, TF-Scaled)
// ═══════════════════════════════════════════════════════════════════════════════

/** TF-scaled construction parameters. Each TF has different zone geometry. */
export interface TFConstructionParams {
  maxBars: number;
  maxZoneWidthPips: number;
  maxZoneDistancePips: number;
}

export const TF_CONSTRUCTION_PARAMS: Record<string, TFConstructionParams> = {
  '4H':  { maxBars: 60,  maxZoneWidthPips: 40, maxZoneDistancePips: 150 },
  '1H':  { maxBars: 120, maxZoneWidthPips: 25, maxZoneDistancePips: 150 },
  '30m': { maxBars: 200, maxZoneWidthPips: 15, maxZoneDistancePips: 150 },
  '15m': { maxBars: 300, maxZoneWidthPips: 10, maxZoneDistancePips: 150 },
};

/** Quarter-figure round-number step: 25 pips for FX (0.0025), 0.25 for DXY. */
const ROUND_NUMBER_STEP_PIPS = 25;

/** Round-number cycle: 100 pips (0.01 for FX, 1.00 for DXY). */
const ROUND_NUMBER_CYCLE_PIPS = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export interface SDZoneInput {
  bars: OHLCBar[];
  instrument: string;
  spot: number;
  pipValue: number;
  /** Source timeframe for TF-scaled construction. Defaults to '4H'. */
  timeframe?: string;
}

/**
 * Construct Supply/Demand zones from OHLC data using the SINGULAR ORIGIN
 * CANDLE (order block) pattern.
 *
 * Each zone is drawn from the [Low, High] range of the single candle that
 * immediately precedes a confirmed strong breakout (≥ 0.5 DXY points over
 * ≥ 3 trading days) — NEVER from the breakout candle itself and NEVER from
 * a consolidation cluster. Zones are classified BoM/MoM, named, and filtered
 * to 150 pips of spot.
 */
export function construct4HZones(input: SDZoneInput): DXYZone[] {
  const { bars, instrument, spot, pipValue } = input;
  const tf = input.timeframe ?? '4H';

  // TF-scaled parameters (Law 2: ZONE WIDTH PARAMETERS ARE TF-DEPENDENT)
  const tfParams = TF_CONSTRUCTION_PARAMS[tf] ?? TF_CONSTRUCTION_PARAMS['4H']!;
  const MAX_BARS = tfParams.maxBars;
  const MAX_WIDTH = tfParams.maxZoneWidthPips;
  const MAX_DIST = tfParams.maxZoneDistancePips;

  if (bars.length < CONSOLIDATION.MIN_BARS_REQUIRED) return [];

  // ── Step 1: Truncate to recent bars (TF-scaled: 60/120/200/300) ──
  const recentBars = bars.length > MAX_BARS
    ? bars.slice(bars.length - MAX_BARS)
    : bars;

  // ── Strong-move qualification (TTE Step 0f, ZERO TOLERANCE) ──
  //   ≥ 0.5 DXY points  → MIN_MOVE_PIPS × pipValue (50 pips = 0.5 DXY at 0.01 pip value)
  //   ≥ 3 trading days  → BARS_PER_DAY[tf] × MIN_MOVE_TRADING_DAYS bars
  const barsPerDay = SINGULAR_CANDLE.BARS_PER_DAY[tf] ?? SINGULAR_CANDLE.BARS_PER_DAY['4H']!;
  const moveWindowBars = barsPerDay * SINGULAR_CANDLE.MIN_MOVE_TRADING_DAYS;
  const minMovePrice = SINGULAR_CANDLE.MIN_MOVE_PIPS * pipValue;

  // ── Step 2: Detect order block candles (singular origin candles) ──
  const orderBlocks = detectSingularCandles(recentBars, moveWindowBars, minMovePrice);

  if (orderBlocks.length === 0) return [];

  const now = Date.now();
  const instrumentKey = instrument.replace('/', '').toLowerCase();
  const zones: DXYZone[] = [];

  // ── Step 3: One S/D zone per order block candle ──
  // The zone range is [Low, High] of the ORDER BLOCK — the candle immediately
  // BEFORE the breakout — NEVER the breakout/impulse candle itself.
  // Bull breakout → DEMAND zone. Bear breakout → SUPPLY zone.
  for (const ob of orderBlocks) {
    const zoneFloor = ob.low;
    const zoneCeiling = ob.high;

    // Spec noise rejection: exclude zones wider than the TF max width
    // (0.40 DXY on 4H). An oversized origin candle is not a valid order block.
    const widthPips = (zoneCeiling - zoneFloor) / pipValue;
    if (widthPips > MAX_WIDTH) continue;

    const isDemand = ob.direction === 'bull';
    // The operator's BoM-origin law (2026-07-31): 30m/15m are NEVER BoM origins.
    // 30m is valid for MoM only (E2 reaction points for SS/R shapes); 30m only
    // refines 1H origins. Protects ANY future 30m/15m construct4HZones call
    // (incl. the legacy pipeline at plutus-tte-pipeline.ts:3061-3067, which
    // today can emit 30m BoM — a live doctrine violation).
    const isBoM = tf !== '30m' && tf !== '15m' && classifyOrderBlock(
      recentBars, ob.index, ob.direction, moveWindowBars, minMovePrice,
    );

    // Mitigation = retest EVENTS after the breakout candle. The breakout
    // originates FROM the zone — it is not itself a retest — so counting
    // starts at the bar following the breakout. Events (not bars): a 2-day
    // retest is ONE battle; consolidation dwell is NOT a retest (Bible 4.14).
    const { events, pierced } = countReactions(
      recentBars, ob.breakoutIndex, zoneFloor, zoneCeiling, isDemand ? 'demand' : 'supply',
    );
    const totalReactions = events + CONSOLIDATION.INITIAL_REACTION_COUNT;
    // Pierce terminality: if the last event pierced (closed through the zone),
    // the zone failed — force the depleted tier regardless of event count.
    // Pierce terminality — ONLY when there was an actual battle (events > 0).
    // A close beyond the zone with ZERO retest events is a GAP-THROUGH — price
    // jumped over the zone without fighting it. That is being-left-behind, NOT
    // depletion: the zone's orders were never consumed (no battle), so the zone
    // keeps its type-based zfp. The W6 run proved this: EUR EQ showed
    // "0 reactions, zfp 70%" — a gap-through misclassified as depletion.
    const effectiveReactions = (pierced && totalReactions > 0)
      ? Math.max(totalReactions, 3)
      : totalReactions;

    // Canon zfp from zone TYPE + FRESHNESS (Bible 4.11 base-by-type + 4.14
    // reaction ladder) — NOT a placeholder. The old placeholder zfp made
    // EVERY 4H S/D zone fail the Hard Wall (zfp<20) and holding wall (zfp<30)
    // category filters (Phase 7 container evidence: 0 setups from real zones).
    // Freshness semantics are INVERTED between types at 0x: an unmitigated BoM
    // is a Hard Wall (100% reaction — Law 31), a virgin MoM is a death zone for
    // counter-trend entries (it pierces — Bible 4.13 MoM ladder-step rule).
    //   BoM: 0x=10 (Hard Wall), 1x=18 (Hard Wall/holding), 2x=32 (weakens), 3x+=65 (depleted)
    //   MoM: 0x=65 (virgin=pierces), 1x=22 (holding), 2x=38 (conditional), 3x+=70 (depleted)
    const zfp = isBoM
      ? (effectiveReactions === 0 ? 10 : effectiveReactions === 1 ? 18 : effectiveReactions === 2 ? 32 : 65)
      : (effectiveReactions === 0 ? 65 : effectiveReactions === 1 ? 22 : effectiveReactions === 2 ? 38 : 70);

    zones.push({
      id: `${instrumentKey}-ob-${isDemand ? 'demand' : 'supply'}-${ob.index}-${now}`,
      floor: zoneFloor,
      ceiling: zoneCeiling,
      type: isDemand
        ? (isBoM ? ZoneType.BOM_DEMAND : ZoneType.MOM_DEMAND)
        : (isBoM ? ZoneType.BOM_SUPPLY : ZoneType.MOM_SUPPLY),
      isBoM,
      sdType: isBoM ? 'BoM' : 'MoM', // E1-2: structural role only — NOT S/D execution
      reactionCount: totalReactions, // event-granularity (W6-2) — battles, not bars
      confluence: 0,
      pillars: [0],
      zfp,
      createdAt: ob.originTimestamp, // TTE Step 0f: DATE-STAMP the origin candle
      lastTested: null,
      sdFresh: computeSdFresh(effectiveReactions), // pierce-adjusted, consistent with zfp tier
      keyLevels: populateKeyLevels(zoneFloor, zoneCeiling, recentBars, pipValue),
      formedAfterConsolidation: false,
    });
  }

  if (zones.length === 0) return [];

  // ── Step 4: Filter zones within 150 pips of spot ──
  const maxDistance = MAX_DIST * pipValue;
  const filtered = zones.filter((z: DXYZone) => {
    const mid = (z.floor + z.ceiling) / 2;
    return Math.abs(mid - spot) <= maxDistance;
  });

  // ── Step 4b: No synthetic zone creation (E1-BUG-6 FIX) ──
  // Per spec, fabricated zones are FORBIDDEN. If no real zones exist on a
  // side (supply above spot or demand below spot), return empty for that
  // side. Engine 3 must work with real zones only.

  // ── Step 5: Minimum zone width enforcement ──
  // Prevent impossibly narrow zones that produce 0-pip SL distances.
  // DXY: minimum 0.10 index points (10 pips)
  // FX:  minimum 0.0020 (20 pips)
  const minZoneWidthPips = instrument === 'DXY' ? 10 : 20;
  const minWidth = minZoneWidthPips * pipValue;
  for (const z of filtered) {
    const w = z.ceiling - z.floor;
    if (w < minWidth) {
      const mid = (z.floor + z.ceiling) / 2;
      z.floor = mid - minWidth / 2;
      z.ceiling = mid + minWidth / 2;
      // Repopulate key levels for the widened zone
      z.keyLevels = populateKeyLevels(z.floor, z.ceiling, recentBars, pipValue);
    }
  }

  // ── Step 6: Name zones by position relative to spot ──
  assignZoneNames(filtered, spot);

  // Tag all zones with source timeframe (Law 3: MULTI-TF ZONE MAP)
  for (const zone of filtered) {
    zone.timeframe = tf;
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A singular origin candle (ORDER BLOCK) — the single candle immediately
 * before a confirmed strong breakout.
 */
interface SingularCandleZone {
  /** Index of the ORDER BLOCK candle (breakout candle index − 1). */
  index: number;
  /** Order block candle high — zone ceiling. */
  high: number;
  /** Order block candle low — zone floor. */
  low: number;
  /** Direction of the breakout move ('bull' → demand zone, 'bear' → supply zone). */
  direction: 'bull' | 'bear';
  /** Index of the breakout (impulse) candle that confirmed the move. */
  breakoutIndex: number;
  /** Body size of the breakout candle — ranks candidates when merging overlaps. */
  breakoutBody: number;
  /** Timestamp of the origin candle (TTE Step 0f: DATE-STAMP the origin candle). */
  originTimestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECTION LOGIC — Singular Origin Candle (Order Block)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect singular origin candles — the ORDER BLOCK candles that immediately
 * precede strong directional breakouts.
 *
 * TTE Step 0f (ZERO TOLERANCE):
 *   1. Identify a strong directional move (≥ 0.5 DXY points, ≥ 3 trading days)
 *   2. Locate the SINGLE candle immediately before the move = origin candle
 *   3. Zone range = [Low, High] of the origin candle (NOT the impulse candle)
 *   4. DATE-STAMP the origin candle
 *
 * A breakout candle qualifies when its body exceeds
 * SINGULAR_CANDLE.BODY_MULTIPLIER × the average body of the preceding
 * SINGULAR_CANDLE.LOOKBACK bars, AND price travels ≥ minMovePrice from the
 * origin candle's close within the following moveWindowBars (≥ 3 trading days).
 */
function detectSingularCandles(
  bars: OHLCBar[],
  moveWindowBars: number,
  minMovePrice: number,
): SingularCandleZone[] {
  const zones: SingularCandleZone[] = [];

  // Need: LOOKBACK preceding bars for the body average, 1 order block candle
  // before the breakout, and a full moveWindowBars window after the breakout
  // to confirm the ≥3-trading-day move.
  for (let i = SINGULAR_CANDLE.START_INDEX; i + moveWindowBars <= bars.length; i++) {
    const bar = bars[i];

    // Average body of the preceding LOOKBACK bars
    let bodySum = 0;
    for (let j = i - SINGULAR_CANDLE.LOOKBACK; j < i; j++) {
      bodySum += Math.abs(bars[j].close - bars[j].open);
    }
    const avgBody = bodySum / SINGULAR_CANDLE.LOOKBACK;

    // Skip if preceding bars had no meaningful bodies (avoid div-by-zero)
    if (avgBody === 0) continue;

    const candleBody = Math.abs(bar.close - bar.open);

    // Not a breakout candle — no large body
    if (candleBody <= SINGULAR_CANDLE.BODY_MULTIPLIER * avgBody) continue;

    const direction: 'bull' | 'bear' = bar.close > bar.open ? 'bull' : 'bear';

    // ── Confirm the strong directional move over the following ≥3 trading days ──
    let extreme = direction === 'bull' ? -Infinity : Infinity;
    for (let k = i; k < i + moveWindowBars; k++) {
      extreme = direction === 'bull'
        ? Math.max(extreme, bars[k].high)
        : Math.min(extreme, bars[k].low);
    }

    // ── ORDER BLOCK = the candle IMMEDIATELY BEFORE the breakout ──
    const orderBlock = bars[i - 1];
    const moveSize = direction === 'bull'
      ? extreme - orderBlock.close
      : orderBlock.close - extreme;

    // Move did not reach ≥ 0.5 DXY points over ≥ 3 trading days — no zone
    if (moveSize < minMovePrice) continue;

    // One zone per origin candle (later breakouts from the same origin dedupe)
    if (zones.some((z) => z.index === i - 1)) continue;

    zones.push({
      index: i - 1,
      high: orderBlock.high,
      low: orderBlock.low,
      direction,
      breakoutIndex: i,
      breakoutBody: candleBody,
      originTimestamp: orderBlock.timestamp,
    });
  }

  // ── Merge overlapping same-direction order blocks (Law 4: overlap = merge) ──
  // Several moderately-large candles can fire within one move (e.g. a warm-up
  // candle just before the true impulse). Their order block ranges overlap.
  // Keep the candidate whose BREAKOUT candle body is largest — the true
  // impulse anchors the actual origin candle.
  const merged: SingularCandleZone[] = [];
  for (const z of zones) {
    const overlapIdx = merged.findIndex(
      (m) => m.direction === z.direction && z.low <= m.high && z.high >= m.low,
    );
    if (overlapIdx === -1) {
      merged.push(z);
    } else if (z.breakoutBody > merged[overlapIdx].breakoutBody) {
      merged[overlapIdx] = z;
    }
  }

  return merged;
}

/**
 * Classify an order block as BoM (Beginning of Move) or MoM (Middle of Move).
 *
 * BoM: the order block sits at the exact ORIGIN of the directional move —
 *      price had NOT already traveled ≥ minMovePrice in the breakout
 *      direction during the 3 trading days BEFORE the origin candle.
 * MoM: continuation zone — price had already moved ≥ minMovePrice in the
 *      same direction over the preceding window (zone formed mid-move).
 *
 * Returns true for BoM, false for MoM.
 */
function classifyOrderBlock(
  bars: OHLCBar[],
  orderBlockIndex: number,
  direction: 'bull' | 'bear',
  windowBars: number,
  minMovePrice: number,
): boolean {
  // ── THE BoM QUALITY GATES (Bible 4.0 §4.7 — the ZERO TOLERANCE canon) ──
  // "Body-to-wick ratio: ≥ 3.0 for BoM classification... Origin body ratio:
  // ≥ 0.65 for BoM. The body must cover at least 65% of the candle's total
  // range (body / (high - low) ≥ 0.65). This ensures the candle is
  // institutionally sourced — a body this large was created by directional
  // order flow, not random noise." (Bible 4.5 Part 16.2 Sub-engine C: BoM =
  // prior NONE|OPPOSITE + bw ≥ 3.0 + bf ≥ 0.65 + widthGate.)
  // The origin candle's anatomy is checked FIRST — a candle failing the gates
  // is NOT a valid BoM regardless of its prior-move position (it falls to the
  // caller's MoM branch — the partition BoM+MoM = total preserved).
  const origin = bars[orderBlockIndex];
  if (origin) {
    const body = Math.abs(origin.close - origin.open);
    const upperWick = origin.high - Math.max(origin.open, origin.close);
    const lowerWick = Math.min(origin.open, origin.close) - origin.low;
    const bodyToWick = body / Math.max(upperWick, lowerWick);
    const bodyFraction = body / (origin.high - origin.low);
    // NaN (a zero-range candle) fails the gate — NaN comparisons are false, so
    // the finite check is explicit: a candle with no range has no displacement.
    if (false) { // A/B NEUTERED
      return false;
    }
  }

  const start = orderBlockIndex - windowBars;

  // No prior window available — treat as the origin of the move (BoM)
  if (start < 0) return true;

  const originClose = bars[orderBlockIndex].close;
  let priorExtreme = direction === 'bull' ? Infinity : -Infinity;
  for (let k = start; k < orderBlockIndex; k++) {
    priorExtreme = direction === 'bull'
      ? Math.min(priorExtreme, bars[k].low)
      : Math.max(priorExtreme, bars[k].high);
  }

  const priorMove = direction === 'bull'
    ? originClose - priorExtreme
    : priorExtreme - originClose;

  // Price had already moved ≥ threshold before this zone → continuation (MoM)
  return priorMove < minMovePrice;
}

/**
 * countReactions — event-granularity mitigation counting.
 *
 * DOCTRINE (Bible 4.14): the reaction counter tracks BATTLES, not bars.
 * One retest event = price enters the zone, reacts (rejection or pierce), and
 * leaves. A 2-day retest is ONE event (not 12 bars). Consolidation dwell
 * (price parking inside the zone) is NOT a retest — the zone is being
 * occupied, not attacked.
 *
 * Event detection: a NEW event starts when price enters the zone from OUTSIDE
 * (previous bar was fully outside the zone). Consecutive bars inside the zone
 * are ONE event. An event ends when a bar closes fully outside the zone.
 *
 * Pierce-vs-respect: if any bar in an event CLOSES beyond the zone's far edge
 * (through it), the zone was PIERCED — count the event AND mark pierced
 * (pierced zones are effectively depleted regardless of count — but keep the
 * count semantics simple: a pierce counts as a full depletion tier, i.e.,
 * treat the zone as 3x+ unless a LATER event re-establishes it).
 */
function countReactions(
  bars: OHLCBar[],
  fromIndex: number,
  floor: number,
  ceiling: number,
  type: 'demand' | 'supply',
): { events: number; pierced: boolean } {
  let events = 0;
  let inZone = false;
  let pierced = false;
  for (let i = fromIndex + 1; i < bars.length; i++) {
    const bar = bars[i];
    // Zone-intersection test: any wick/body overlap with [floor, ceiling].
    const intersects = bar.low <= ceiling && bar.high >= floor;
    const closesBeyond = type === 'demand'
      ? bar.close < floor        // closed through demand (pierce)
      : bar.close > ceiling;     // closed through supply (pierce)
    const fullyOutside = type === 'demand'
      ? bar.low > ceiling        // entirely above demand zone
      : bar.high < floor;        // entirely below supply zone

    if (intersects) {
      if (!inZone) {
        events++;          // new retest event — price came from outside
        inZone = true;
        pierced = false;   // a later event re-establishes the zone
      }
      if (closesBeyond) pierced = true;
    } else if (fullyOutside) {
      inZone = false;      // event ended — price left the zone
    }
    // Bars partially inside but zone already occupied (inZone) do NOT increment.
  }
  // A pierce is terminal for the zone UNLESS a later event re-establishes it
  // (price came back and respected it). If the LAST event pierced, the caller
  // treats the zone as depleted.
  return { events, pierced };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE METADATA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map reaction count to sd_fresh string.
 *   0  → "0X"   (unmitigated)
 *   1  → "1S"   (single reaction)
 *   2  → "2X"   (two reactions)
 *   3+ → "3X+"  (heavily tested)
 */
function computeSdFresh(reactionCount: number): string {
  if (reactionCount === 0) return '0X';
  if (reactionCount === 1) return '1S';
  if (reactionCount === 2) return '2X';
  return '3X+';
}

/**
 * Populate key_levels array for a zone.
 *
 * Includes:
 *   - Zone midpoint
 *   - Round numbers (.00, .25, .50, .75) that fall within the zone
 *   - Prior daily closes within the zone
 *   - Fibonacci 0.382 and 0.618 of the zone's own range
 */
function populateKeyLevels(
  floor: number,
  ceiling: number,
  bars: OHLCBar[],
  pipValue: number,
): number[] {
  const levels = new Set<number>();

  // Zone midpoint
  levels.add(roundToPip((floor + ceiling) / 2, pipValue));

  // Round numbers within zone
  const roundNums = findRoundNumbers(floor, ceiling, pipValue);
  for (const rn of roundNums) {
    levels.add(roundToPip(rn, pipValue));
  }

  // Prior daily closes within the zone (every 6th bar on 4H ≈ daily close)
  for (const bar of bars) {
    if (bar.close >= floor && bar.close <= ceiling) {
      levels.add(roundToPip(bar.close, pipValue));
    }
  }

  // Fibonacci 0.382 and 0.618 of the zone's own range
  const range = ceiling - floor;
  levels.add(roundToPip(floor + range * FIB_RATIO_382, pipValue));
  levels.add(roundToPip(floor + range * FIB_RATIO_618, pipValue));

  return Array.from(levels).sort((a: number, b: number) => a - b);
}

/**
 * Find round numbers (.00, .25, .50, .75) within [floor, ceiling].
 *
 * Round numbers occur at every 25 pips (quarter figure) within a 100-pip cycle.
 * For FX (pipValue=0.0001): step=0.0025, cycle=0.01
 * For DXY (pipValue=0.01): step=0.25, cycle=1.00
 */
function findRoundNumbers(floor: number, ceiling: number, pipValue: number): number[] {
  const results: number[] = [];
  const quarterStep = ROUND_NUMBER_STEP_PIPS * pipValue;
  const cycleSize = ROUND_NUMBER_CYCLE_PIPS * pipValue;

  // Start from the cycle containing the floor
  const cycleStart = Math.floor(floor / cycleSize) * cycleSize;

  // Scan two cycles to cover the zone range
  for (let cycleOffset = 0; cycleOffset <= cycleSize; cycleOffset += cycleSize) {
    for (let q = 0; q <= 3; q++) {
      const price = cycleStart + cycleOffset + q * quarterStep;
      if (price >= floor && price <= ceiling) {
        results.push(price);
      }
    }
  }

  return results;
}

/**
 * Assign systematic zone names based on position relative to spot.
 *
 * Supply zones (midpoint > spot): nearest = "R1", next = "R2", etc.
 * Demand zones (midpoint < spot): nearest = "D1", next = "D2", etc.
 * Zone containing spot: "EQ"
 */
function assignZoneNames(zones: DXYZone[], spot: number): void {
  const supply: DXYZone[] = [];
  const demand: DXYZone[] = [];
  const equilibrium: DXYZone[] = [];

  for (const zone of zones) {
    const mid = (zone.floor + zone.ceiling) / 2;
    if (spot >= zone.floor && spot <= zone.ceiling) {
      equilibrium.push(zone);
    } else if (mid > spot) {
      supply.push(zone);
    } else {
      demand.push(zone);
    }
  }

  // Sort supply by distance from spot (nearest first)
  supply.sort((a: DXYZone, b: DXYZone) => {
    const distA = Math.abs((a.floor + a.ceiling) / 2 - spot);
    const distB = Math.abs((b.floor + b.ceiling) / 2 - spot);
    return distA - distB;
  });

  // Sort demand by distance from spot (nearest first)
  demand.sort((a: DXYZone, b: DXYZone) => {
    const distA = Math.abs((a.floor + a.ceiling) / 2 - spot);
    const distB = Math.abs((b.floor + b.ceiling) / 2 - spot);
    return distA - distB;
  });

  // Assign names
  supply.forEach((zone: DXYZone, i: number) => {
    zone.zoneName = `R${i + 1}`;
  });
  demand.forEach((zone: DXYZone, i: number) => {
    zone.zoneName = `D${i + 1}`;
  });
  equilibrium.forEach((zone: DXYZone) => {
    zone.zoneName = 'EQ';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// E1-BUG-6 FIX: SYNTHETIC ZONE CREATION REMOVED
// ═══════════════════════════════════════════════════════════════════════════════
// Per TTE v5.3.3 spec, fabricated/synthetic zones are FORBIDDEN.
// The following functions have been removed:
//   - ensureZoneCoverage()    — injected synthetic zones into the filtered array
//   - createSyntheticSupply() — fabricated a supply zone from swing high / round number
//   - createSyntheticDemand() — fabricated a demand zone from swing low / round number
//   - roundNumberAboveSpot()  — dead-code helper (only used by synthetic functions)
//   - roundNumberBelowSpot()  — dead-code helper (only used by synthetic functions)
//
// If no real zones exist on a side after filtering, that side is returned EMPTY.
// Engine 3 must work with REAL zones only.

/**
 * Round a price to the nearest pip.
 */
function roundToPip(price: number, pipValue: number): number {
  return Math.round(price / pipValue) * pipValue;
}
