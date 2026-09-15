/**
 * Sequential Liquidity Sweep Check (TTE v5.3.3 Rule 8 / CS18)
 *
 * Price ALWAYS sweeps liquidity zone by zone in sequential order.
 * It NEVER skips a zone.
 * If a gap exists between entry and TP where no zone is mapped,
 * the setup has a blind spot and must be rejected.
 *
 * This module provides two entry points:
 *   1. `checkSequentialLiquidity()` — standalone check returning gaps array
 *   2. `checkLiquiditySweep()`      — firewall-compatible GuardrailResult wrapper
 */

import { DXYZone, TradeSetup, GuardrailResult, PIP_VALUE } from '../types.js';
import { MAX_LIQUIDITY_GAP_PIPS, PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Backward-compatible re-export — use MAX_LIQUIDITY_GAP_PIPS directly in new code. */
export { MAX_LIQUIDITY_GAP_PIPS as MAX_GAP_PIPS } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiquidityGap {
  fromPrice: number;
  toPrice: number;
  gapPips: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check that all price movement between entry and TP sweeps through
 * mapped liquidity zones sequentially — no zone gaps larger than MAX_LIQUIDITY_GAP_PIPS.
 *
 * @param entry  - Entry price of the setup
 * @param tp     - Take-profit price of the setup
 * @param zones  - All mapped DXY zones for this instrument
 * @param pair   - Instrument pair (for pip value resolution)
 * @returns Object with `passed` boolean and array of `gaps` found
 */
export function checkSequentialLiquidity(
  entry: number,
  tp: number,
  zones: DXYZone[],
  pair: string,
): { passed: boolean; gaps: LiquidityGap[]; evidence: string } {
  const gaps: LiquidityGap[] = [];

  // Determine direction: long = tp > entry, short = tp < entry
  const isLong = tp > entry;
  const start = isLong ? entry : tp;
  const end = isLong ? tp : entry;

  // Collect all unique zone edges between start and end, sorted by price
  const zoneEdges: { price: number; zone: DXYZone }[] = [];

  for (const zone of zones) {
    const zoneStart = Math.min(zone.floor, zone.ceiling);
    const zoneEnd = Math.max(zone.floor, zone.ceiling);

    // Check if this zone overlaps with the entry-TP range
    if (zoneEnd > start && zoneStart < end) {
      zoneEdges.push({ price: zoneStart, zone });
      zoneEdges.push({ price: zoneEnd, zone });
    }
  }

  // Sort by price (ascending for longs, descending for shorts)
  zoneEdges.sort((a: { price: number; zone: DXYZone }, b: { price: number; zone: DXYZone }) => (isLong ? a.price - b.price : b.price - a.price));

  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  let prevPrice = start;

  for (const edge of zoneEdges) {
    const gap = Math.abs(edge.price - prevPrice) / pipValue;
    if (gap > MAX_LIQUIDITY_GAP_PIPS) {
      // Check if there's a zone that spans this gap (bridging zone)
      const gapBridging = zones.some((z: DXYZone) => {
        const zStart = Math.min(z.floor, z.ceiling);
        const zEnd = Math.max(z.floor, z.ceiling);
        return zStart < edge.price && zEnd > prevPrice;
      });

      if (!gapBridging) {
        gaps.push({
          fromPrice: prevPrice,
          toPrice: edge.price,
          gapPips: Math.round(gap),
        });
      }
    }
    prevPrice = edge.price;
  }

  // Check final gap from last zone edge to TP
  const finalGap = Math.abs(end - prevPrice) / pipValue;
  if (finalGap > MAX_LIQUIDITY_GAP_PIPS) {
    const gapBridging = zones.some((z: DXYZone) => {
      const zStart = Math.min(z.floor, z.ceiling);
      const zEnd = Math.max(z.floor, z.ceiling);
      return zStart < end && zEnd > prevPrice;
    });
    if (!gapBridging) {
      gaps.push({
        fromPrice: prevPrice,
        toPrice: end,
        gapPips: Math.round(finalGap),
      });
    }
  }

  return {
    passed: gaps.length === 0,
    gaps,
    evidence: gaps.length === 0
      ? `CS18 sequential sweep check passed: no gaps >= ${MAX_LIQUIDITY_GAP_PIPS} pips found between adjacent zones`
      : `CS18 sequential sweep check failed: ${gaps.length} gap(s) >= ${MAX_LIQUIDITY_GAP_PIPS} pips found between adjacent zones`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIREWALL-COMPATIBLE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Firewall-compatible check wrapping `checkSequentialLiquidity`.
 * Returns a `GuardrailResult` suitable for use in the CS18 rule definition.
 *
 * @param setup - The trade setup being validated
 * @param zones - All mapped DXY zones for this instrument
 * @returns GuardrailResult — HARD_BLOCK if gaps found, INFO if passed
 */
export function checkLiquiditySweep(
  setup: TradeSetup,
  zones: DXYZone[],
): GuardrailResult {
  if (!zones || zones.length === 0) {
    return {
      rule: 'CS18',
      passed: true,
      severity: 'INFO',
      message: 'No zone map available — skipping liquidity sweep check',
      evidence: 'CS18 liquidity sweep check skipped: empty zone map provided, no sequential gaps to evaluate',
    };
  }

  const { passed, gaps } = checkSequentialLiquidity(
    setup.entry,
    setup.tp,
    zones,
    setup.pair,
  );

  if (!passed) {
    return {
      rule: 'CS18',
      passed: false,
      severity: 'HARD_BLOCK',
      message: `Sequential liquidity sweep gap: ${gaps.map((g: LiquidityGap) => `${g.gapPips}p between ${g.fromPrice} and ${g.toPrice}`).join('; ')}`,
      evidence: `CS18 sequential sweep check failed: ${gaps.length} unmapped gap(s) >= ${MAX_LIQUIDITY_GAP_PIPS} pips between entry and TP — price would traverse a blind spot without liquidity zones`,
    };
  }

  return {
    rule: 'CS18',
    passed: true,
    severity: 'INFO',
    message: 'Sequential liquidity path confirmed — no zone gaps',
    evidence: 'CS18 sequential sweep check passed: all zone edges between entry and TP are within the maximum liquidity gap tolerance, confirming sequential sweep path',
  };
}
