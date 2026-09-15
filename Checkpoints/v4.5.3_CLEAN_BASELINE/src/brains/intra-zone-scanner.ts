/**
 * Intra-Zone Scanner — Step 0.6: Intra-Zone Key Level Scan.
 *
 * TTE v5.3.3 Step 0.6 (v5.0.0 — P3 POSTMORTEM FIX — MANDATORY):
 *
 * This step was added because the Apr 20-24 report treated each IP zone as a
 * monolithic block, missing critical micro-levels within zones. Intra-zone
 * levels often serve as the precise entry or the precise rejection point.
 *
 * Purpose: Identify micro-levels within each mapped IP zone that provide
 * additional precision for entry and SL placement.
 *
 * Scan Procedure (0.6a):
 *   - 1H demand/supply zones from the prior 1-2 weeks that sit INSIDE the IP zone
 *   - Fib retracement levels (0.382, 0.5, 0.618) of the zone's own range
 *   - Prior daily closes within the zone range (each close is a reaction level)
 *   - Round number levels (.00, .25, .50, .75) that fall within the zone
 *
 * Tagging (0.6b):
 *   - "Intra-Zone Precision Floor"  — bottom 40% of zone range
 *   - "Intra-Zone Precision Ceiling" — top 40% of zone range
 *   - "Intra-Zone Mid-Anchor"       — middle 20%
 *
 * Scoring (0.6d): Structural dimension score = 0.5 (half weight of full zone levels).
 */

import { DXYZone, OHLCBar, IntraZoneLevel } from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  FIB_RATIO_382,
  FIB_RATIO_500,
  FIB_RATIO_618,
  BARS_PER_DAY_4H,
  PIP_VALUE_DXY,
  PIP_VALUE_FX_4DEC,
} from '../constants/trading-constants.js';

const log = new Logger('IntraZoneScanner');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Step 0.6d: Structural dimension score for intra-zone levels (half weight) */
const INTRA_ZONE_STRENGTH = 0.5;

/** 1H lookback: prior 1-2 weeks of 1H bars (≈ 120 bars for 24/5 markets) */
const BARS_1H_LOOKBACK = 240;

/** 4H bars per day for daily close extraction */
const BARS_PER_DAY = BARS_PER_DAY_4H; // 6 bars/day for 4H

/** Prior closes to extract: last N daily closes */
const PRIOR_CLOSES_COUNT = 5;

/** Round number sub-steps for FX pairs (.00, .25, .50, .75) */
const FX_ROUND_SUBSTEPS = [0.0, 0.25, 0.5, 0.75];

/** DXY round number sub-steps (.00, .50) */
const DXY_ROUND_SUBSTEPS = [0.0, 0.5];

/** Ms per day */
const MS_PER_DAY = 86_400_000;

/** Swing detection boundary offset (in bars) for 1H zone construction */
const SWING_OFFSET_1H = 2;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 0.6: Scan the interior of an IP zone for micro-level key levels.
 *
 * @param zone    The 4H IP zone to scan (floor/ceiling define the bounds).
 * @param bars1H  1H OHLC bars (prior 1-2 weeks). Pass [] to skip 1H zone detection.
 * @param bars4H  4H OHLC bars (used for prior daily close extraction).
 * @returns IntraZoneLevel[] sorted by proximity to zone center.
 */
export function scanIntraZoneLevels(
  zone: DXYZone,
  bars1H: OHLCBar[],
  bars4H: OHLCBar[],
): IntraZoneLevel[] {
  const levels: IntraZoneLevel[] = [];

  // ── 0.6a.1: Fibonacci retracements of the zone range ──
  levels.push(...scanFibLevels(zone));

  // ── 0.6a.2: Prior session closes within the zone ──
  if (bars4H.length > 0) {
    levels.push(...scanPriorCloses(zone, bars4H));
  }

  // ── 0.6a.3: Round numbers within the zone ──
  levels.push(...scanRoundNumbers(zone));

  // ── 0.6a.4: 1H demand/supply zones inside the IP zone ──
  if (bars1H.length > SWING_OFFSET_1H * 2) {
    levels.push(...scan1HZones(zone, bars1H));
  }

  if (levels.length === 0) {
    log.debug('No intra-zone levels found', { zoneId: zone.id, range: `${zone.floor}-${zone.ceiling}` });
    return [];
  }

  // ── 0.6b: Tag positions (Precision Floor / Ceiling / Mid-Anchor) ──
  const tagged = levels.map((lvl: IntraZoneLevel) => ({
    ...lvl,
    position: tagPosition(lvl.price, zone),
  }));

  // Sort by proximity to zone center (closest first)
  const zoneCenter = (zone.floor + zone.ceiling) / 2;
  tagged.sort((a: IntraZoneLevel, b: IntraZoneLevel) =>
    Math.abs(a.price - zoneCenter) - Math.abs(b.price - zoneCenter),
  );

  log.debug('Intra-zone levels scanned', {
    zoneId: zone.id,
    range: `${zone.floor.toFixed(4)}-${zone.ceiling.toFixed(4)}`,
    count: tagged.length,
    types: tagged.map((l) => l.type),
  });

  return tagged;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Fib Retracement Levels
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Fibonacci retracement levels of the zone's own range.
 * Per spec: 0.382, 0.5 (0.500), 0.618 of the ceiling-floor range.
 *
 * These are always present within the zone (by construction) since they
 * are derived from the zone bounds itself.
 */
function scanFibLevels(zone: DXYZone): IntraZoneLevel[] {
  const range = zone.ceiling - zone.floor;
  if (range <= 0) return [];

  const fibConfigs: Array<{ ratio: number; type: IntraZoneLevel['type']; label: string }> = [
    { ratio: FIB_RATIO_382, type: 'fib_382', label: 'Fib 0.382' },
    { ratio: FIB_RATIO_500, type: 'fib_500', label: 'Fib 0.500' },
    { ratio: FIB_RATIO_618, type: 'fib_618', label: 'Fib 0.618' },
  ];

  return fibConfigs.map(({ ratio, type, label }) => ({
    price: zone.floor + range * ratio,
    type,
    strength: INTRA_ZONE_STRENGTH,
    source: label,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Prior Session Closes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract prior daily closes from 4H bars that fall within the zone range.
 * Each daily close is a potential reaction level.
 *
 * Uses BARS_PER_DAY_4H to aggregate 4H bars into daily candles.
 */
function scanPriorCloses(zone: DXYZone, bars4H: OHLCBar[]): IntraZoneLevel[] {
  const levels: IntraZoneLevel[] = [];

  // Aggregate 4H bars into daily candles
  const dailyCloses = extractDailyCloses(bars4H);

  // Take the last PRIOR_CLOSES_COUNT daily closes (excluding the forming day)
  const priorCloses = dailyCloses.slice(-PRIOR_CLOSES_COUNT - 1, -1);

  for (let i = 0; i < priorCloses.length; i++) {
    const closePrice = priorCloses[i]!.price;
    const daysAgo = priorCloses.length - i;

    // Only include closes that fall within the zone range
    if (closePrice >= zone.floor && closePrice <= zone.ceiling) {
      levels.push({
        price: closePrice,
        type: 'prior_close',
        // Strength slightly higher for more recent closes
        strength: INTRA_ZONE_STRENGTH * (1 + 0.05 * (1 / daysAgo)),
        source: `Prior close [-${daysAgo}d]`,
      });
    }
  }

  return levels;
}

/**
 * Extract daily closes from 4H bars by grouping BARS_PER_DAY_4H consecutive bars.
 */
function extractDailyCloses(bars4H: OHLCBar[]): Array<{ price: number; timestamp: number }> {
  if (bars4H.length < BARS_PER_DAY) return [];

  const closes: Array<{ price: number; timestamp: number }> = [];

  for (let i = 0; i < bars4H.length; i += BARS_PER_DAY) {
    const dayGroup = bars4H.slice(i, i + BARS_PER_DAY);
    if (dayGroup.length === 0) break;

    // Daily close = close of the last bar in the group
    const lastBar = dayGroup[dayGroup.length - 1]!;
    closes.push({ price: lastBar.close, timestamp: lastBar.timestamp });
  }

  return closes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Round Numbers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scan for round number levels (.00, .25, .50, .75 for FX; .00, .50 for DXY)
 * that fall within the zone range.
 *
 * Per spec: "Round number levels (.00, .25, .50, .75) that fall within the zone."
 */
function scanRoundNumbers(zone: DXYZone): IntraZoneLevel[] {
  const levels: IntraZoneLevel[] = [];

  // Determine if this is a DXY zone (large price ~100+) or FX zone (small price ~1.0xxx)
  const isDXY = zone.ceiling > 50; // DXY trades around 100-110

  const substeps = isDXY ? DXY_ROUND_SUBSTEPS : FX_ROUND_SUBSTEPS;
  const bigFigure = isDXY ? 1.0 : 0.01; // DXY: whole numbers; FX: big figure (0.01)

  // Find the integer/half-integer grid that spans the zone
  const startGrid = Math.floor(zone.floor / bigFigure);
  const endGrid = Math.ceil(zone.ceiling / bigFigure);

  for (let grid = startGrid; grid <= endGrid; grid++) {
    for (const substep of substeps) {
      const level = grid * bigFigure + substep * bigFigure;

      // Only include if it falls within the zone range
      if (level >= zone.floor && level <= zone.ceiling) {
        // Label: format differently for DXY vs FX
        let label: string;
        if (isDXY) {
          label = substep === 0 ? `Round ${level.toFixed(2)}` : `Half figure ${level.toFixed(2)}`;
        } else {
          label = `Round ${level.toFixed(4)}`;
        }

        levels.push({
          price: level,
          type: 'round_number',
          strength: INTRA_ZONE_STRENGTH,
          source: label,
        });
      }
    }
  }

  return levels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: 1H Demand/Supply Zones
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect 1H demand/supply zones within the 4H zone bounds.
 *
 * A 1H demand zone = swing low area where price rallied afterward.
 * A 1H supply zone = swing high area where price dropped afterward.
 *
 * Uses simplified swing-based zone construction from 1H bars.
 */
function scan1HZones(zone: DXYZone, bars1H: OHLCBar[]): IntraZoneLevel[] {
  const lookback = Math.min(bars1H.length, BARS_1H_LOOKBACK);
  const levels: IntraZoneLevel[] = [];

  if (lookback < SWING_OFFSET_1H * 2 + 1) return levels;

  for (let i = SWING_OFFSET_1H; i < lookback - SWING_OFFSET_1H; i++) {
    const bar = bars1H[i]!;
    let isSwingHigh = true;
    let isSwingLow = true;

    // Check if this bar is a swing extreme relative to neighbors
    for (let j = 1; j <= SWING_OFFSET_1H; j++) {
      if (bar.high <= bars1H[i - j]!.high || bar.high <= bars1H[i + j]!.high) {
        isSwingHigh = false;
      }
      if (bar.low >= bars1H[i - j]!.low || bar.low >= bars1H[i + j]!.low) {
        isSwingLow = false;
      }
    }

    // Swing high → potential supply zone; check if it falls inside the 4H zone
    if (isSwingHigh && bar.high >= zone.floor && bar.high <= zone.ceiling) {
      levels.push({
        price: bar.high,
        type: '1h_supply',
        strength: INTRA_ZONE_STRENGTH,
        source: `1H Supply @ ${new Date(bar.timestamp).toISOString().slice(0, 10)}`,
      });
    }

    // Swing low → potential demand zone; check if it falls inside the 4H zone
    if (isSwingLow && bar.low >= zone.floor && bar.low <= zone.ceiling) {
      levels.push({
        price: bar.low,
        type: '1h_demand',
        strength: INTRA_ZONE_STRENGTH,
        source: `1H Demand @ ${new Date(bar.timestamp).toISOString().slice(0, 10)}`,
      });
    }
  }

  return levels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Position Tagging
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 0.6b: Tag the position of a level within the zone.
 *
 *   - "Precision Floor"  (bottom 40% of zone range)
 *   - "Precision Ceiling" (top 40% of zone range)
 *   - "Mid-Anchor"       (middle 20%)
 *
 * @returns The position tag, or undefined if the level is outside the zone.
 */
function tagPosition(
  price: number,
  zone: DXYZone,
): IntraZoneLevel['position'] {
  const range = zone.ceiling - zone.floor;
  if (range <= 0) return undefined;

  const pct = (price - zone.floor) / range;

  if (pct < 0 || pct > 1) return undefined;

  if (pct < 0.4) {
    return 'precision_floor';
  } else if (pct > 0.6) {
    return 'precision_ceiling';
  } else {
    return 'mid_anchor';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE: Batch scan all zones
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scan intra-zone levels for a batch of zones.
 *
 * For each zone, calls scanIntraZoneLevels() and attaches the results to
 * zone.intraLevels.
 *
 * @param zones   The zones to scan (mutated in-place — intraLevels added).
 * @param bars1H  1H OHLC bars for 1H zone detection.
 * @param bars4H  4H OHLC bars for prior close extraction.
 * @returns The same zones array with intraLevels populated.
 */
export function scanAllZonesIntraLevels(
  zones: DXYZone[],
  bars1H: OHLCBar[],
  bars4H: OHLCBar[],
): DXYZone[] {
  for (const zone of zones) {
    zone.intraLevels = scanIntraZoneLevels(zone, bars1H, bars4H);
  }
  return zones;
}
