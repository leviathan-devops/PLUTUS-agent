/**
 * LSZ Detector — Liquidity Sweep Zone Detection.
 *
 * ═══════════════════════════════════════════════════════════════
 * Purpose:
 *   Identifies Liquidity Sweep Zones (LSZ) from swing highs and lows.
 *   These are areas where stop-loss orders cluster — price tends to
 *   sweep these levels before reversing.
 *
 * Algorithm:
 *   1. Find swing highs and lows from the last 10 trading days (60 4H bars)
 *   2. For each swing low: create Demand-side LSZ at [low, low + 5 pips]
 *   3. For each swing high: create Supply-side LSZ at [high - 5 pips, high]
 *   4. LSZ within 30 pips of spot → priority = "ACTIVE SL TRIGGER"
 *   5. LSZ overlapping a 4H BoM zone → priority = "CONFLUENT LSZ + BoM"
 *   6. Default priority = "STANDARD"
 *   7. Thickness: THICK if >15 pips wide, THIN otherwise
 * ═══════════════════════════════════════════════════════════════
 */

import { OHLCBar, DXYZone } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LSZResult {
  top: number;
  bottom: number;
  side: 'Demand-side' | 'Supply-side';
  priority: string;
  source: string;
  thickness: 'THICK' | 'THIN';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Maximum 4H bars to scan = 10 trading days × 6 bars/day. */
const MAX_4H_BARS = 60;

/** Swing detection lookback: a bar is a swing high/low if it's the extreme within ±2 bars. */
const SWING_LOOKBACK = 2;

/** LSZ thickness in pips on each side of the swing point. */
const LSZ_HALF_WIDTH_PIPS = 5;

/** LSZ within this many pips of spot is "ACTIVE SL TRIGGER". */
const ACTIVE_SL_DISTANCE_PIPS = 30;

/** LSZ thicker than this (pips) is THICK, otherwise THIN. */
const THICK_THRESHOLD_PIPS = 15;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect Liquidity Sweep Zones from OHLC bar data.
 *
 * @param bars - 4H OHLC bars (will be truncated to last 60)
 * @param spot - Current spot price
 * @param pipValue - Pip value for the instrument (0.0001 for FX, 0.01 for DXY)
 * @param bomZones - Optional 4H BoM zones for confluence detection
 * @returns Array of LSZ results
 */
export function detectLSZ(
  bars: OHLCBar[],
  spot: number,
  pipValue: number,
  bomZones?: DXYZone[],
): LSZResult[] {
  if (bars.length < SWING_LOOKBACK * 2 + 1) return [];

  // ── Step 1: Truncate to last 60 bars (10 trading days) ──
  const recentBars = bars.length > MAX_4H_BARS
    ? bars.slice(bars.length - MAX_4H_BARS)
    : bars;

  // ── Step 2: Find swing highs and lows ──
  const swingHighs = findSwingHighs(recentBars);
  const swingLows = findSwingLows(recentBars);

  const lszWidth = LSZ_HALF_WIDTH_PIPS * pipValue;
  const activeDistance = ACTIVE_SL_DISTANCE_PIPS * pipValue;
  const thickThreshold = THICK_THRESHOLD_PIPS * pipValue;
  const results: LSZResult[] = [];

  // ── Step 3: Create Demand-side LSZ from swing lows ──
  for (const swing of swingLows) {
    const bottom = swing.price;
    const top = swing.price + lszWidth;
    const width = top - bottom;

    results.push({
      top,
      bottom,
      side: 'Demand-side',
      priority: classifyPriority(bottom, top, spot, activeDistance, pipValue, bomZones),
      source: `Swing Low @ bar ${swing.index}`,
      thickness: width > thickThreshold ? 'THICK' : 'THIN',
    });
  }

  // ── Step 4: Create Supply-side LSZ from swing highs ──
  for (const swing of swingHighs) {
    const top = swing.price;
    const bottom = swing.price - lszWidth;
    const width = top - bottom;

    results.push({
      top,
      bottom,
      side: 'Supply-side',
      priority: classifyPriority(bottom, top, spot, activeDistance, pipValue, bomZones),
      source: `Swing High @ bar ${swing.index}`,
      thickness: width > thickThreshold ? 'THICK' : 'THIN',
    });
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWING DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface SwingPoint {
  index: number;
  price: number;
}

/**
 * Find swing highs: bars whose high is greater than all surrounding bars
 * within ±SWING_LOOKBACK range.
 */
function findSwingHighs(bars: OHLCBar[]): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = SWING_LOOKBACK; i < bars.length - SWING_LOOKBACK; i++) {
    const currentHigh = bars[i].high;
    let isSwing = true;

    for (let j = i - SWING_LOOKBACK; j <= i + SWING_LOOKBACK; j++) {
      if (j === i) continue;
      if (bars[j].high >= currentHigh) {
        isSwing = false;
        break;
      }
    }

    if (isSwing) {
      swings.push({ index: i, price: currentHigh });
    }
  }

  return swings;
}

/**
 * Find swing lows: bars whose low is less than all surrounding bars
 * within ±SWING_LOOKBACK range.
 */
function findSwingLows(bars: OHLCBar[]): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = SWING_LOOKBACK; i < bars.length - SWING_LOOKBACK; i++) {
    const currentLow = bars[i].low;
    let isSwing = true;

    for (let j = i - SWING_LOOKBACK; j <= i + SWING_LOOKBACK; j++) {
      if (j === i) continue;
      if (bars[j].low <= currentLow) {
        isSwing = false;
        break;
      }
    }

    if (isSwing) {
      swings.push({ index: i, price: currentLow });
    }
  }

  return swings;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify LSZ priority based on proximity to spot and overlap with BoM zones.
 *
 * Priority hierarchy (checked in order):
 *   1. LSZ within 30 pips of spot AND overlapping a BoM zone → "CONFLUENT LSZ + BoM"
 *   2. LSZ within 30 pips of spot → "ACTIVE SL TRIGGER"
 *   3. LSZ overlapping a BoM zone → "CONFLUENT LSZ + BoM"
 *   4. Default → "STANDARD"
 *
 * Note: "CONFLUENT LSZ + BoM" takes highest priority when both conditions are met.
 */
function classifyPriority(
  bottom: number,
  top: number,
  spot: number,
  activeDistance: number,
  pipValue: number,
  bomZones?: DXYZone[],
): string {
  const mid = (bottom + top) / 2;
  const distanceFromSpot = Math.abs(mid - spot);
  const withinActiveRange = distanceFromSpot <= activeDistance;

  // Check overlap with BoM zones
  const overlapsBoM = bomZones?.some((zone: DXYZone) => {
    if (!zone.isBoM) return false;
    // Check if LSZ [bottom, top] overlaps with zone [floor, ceiling]
    return bottom <= zone.ceiling && top >= zone.floor;
  }) ?? false;

  // Priority: CONFLUENT > ACTIVE > STANDARD
  if (overlapsBoM) return 'CONFLUENT LSZ + BoM';
  if (withinActiveRange) return 'ACTIVE SL TRIGGER';
  return 'STANDARD';
}
