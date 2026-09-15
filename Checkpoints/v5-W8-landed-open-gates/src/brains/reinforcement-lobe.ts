/**
 * Reinforcement Lobe — Reinforcement Ladder Protocol (TTE v5.3.3 Section 7.3)
 *
 * Every HTF swing setup must have at least 2 reinforcement entries.
 * Combined R:R must be calculated across all entries.
 *
 * FLR = Earth Heavy Attack (30m Fib trigger + Liquidity entry/SL, thick buffer)
 * FR = Fire Precision Attack (15m Fib trigger/entry/SL, precision strike)
 * LR = Water Precision Attack (pure S/D/L mechanics, thin buffer, 20-30% failure)
 *
 * FIX-022: Each rocket now carries a complete StopLimitSpec (Section 8R.7):
 *   - Trigger zones 2-3 zones in front of entry zone (≥1 FULL zone buffer)
 *   - Stop price 1-2 pips INSIDE target liquidity zone
 *   - Rocket #1 trigger at close edge; Rocket #2/3 at far edge
 *   - SL 1-2 pips OUTSIDE back edge of SL zone
 *   - Thin liquidity zones NEVER used as entry or SL zones
 *   - NY session: 2-3 pip SL buffer; London session: 1-2 pip buffer
 */

import { DXYZone, TradeSetup, ReinforcementEntry, ReinforcementType, ReinforcementLadder, type StopLimitSpec } from '../types.js';
import { classifyAttackType } from './elemental-lobe.js';
import { getCurrentSession } from '../utils/market-hours.js';
import { REINFORCEMENT, ZONE_WIDTH } from '../constants/trading-constants.js';

const REINFORCEMENT_BUFFER_PIPS: Record<ReinforcementType, { thick: number; thin: number }> = {
  [ReinforcementType.FLR]: { thick: REINFORCEMENT.FLR_THICK_PIPS, thin: REINFORCEMENT.FLR_THIN_PIPS },  // Thick buffer
  [ReinforcementType.FR]: { thick: REINFORCEMENT.FR_THICK_PIPS, thin: REINFORCEMENT.FR_THIN_PIPS },   // Medium buffer
  [ReinforcementType.LR]: { thick: REINFORCEMENT.LR_THICK_PIPS, thin: REINFORCEMENT.LR_THIN_PIPS },    // Thin buffer
};

/**
 * FIX-022: Zone width in pips — thin liquidity zones are NEVER entry or SL zones.
 */
function zoneWidthPips(zone: DXYZone, pipValue: number): number {
  return Math.abs(zone.ceiling - zone.floor) / pipValue;
}

/**
 * FIX-022: Determine session-specific SL buffer.
 * NY session requires 2-3 pip SL buffer; London session 1-2 pip buffer.
 */
function getSessionBuffer(type: ReinforcementType): { slBufferPips: number; session: StopLimitSpec['session'] } {
  const session = getCurrentSession();
  const baseBuffers = REINFORCEMENT_BUFFER_PIPS[type];

  if (session === 'ny') {
    // NY session: 2-3 pip SL buffer (higher volatility)
    return { slBufferPips: baseBuffers.thin, session: 'ny' };
  } else if (session === 'london') {
    // London session: 1-2 pip buffer
    return { slBufferPips: baseBuffers.thick, session: 'london' };
  }
  // Off-hours: use medium buffer
  return { slBufferPips: baseBuffers.thick, session: 'other' };
}

/**
 * FIX-022: Build the stop-limit specification for a reinforcement rocket.
 *
 * Per TTE v5.3.3 Section 8R.7:
 *   - Trigger zone: 2-3 zones in front of entry zone (≥1 FULL zone buffer)
 *   - Stop price: 1-2 pips INSIDE target liquidity zone
 *   - Rocket #1 trigger at close edge; #2/#3 at far edge of trigger zone
 *   - SL: 1-2 pips OUTSIDE back edge of SL zone
 *   - Thin liquidity zones = NEVER entry or SL zones
 */
function buildStopLimitSpec(
  rocketIndex: number,
  entryZone: DXYZone,
  zones: DXYZone[],
  isLong: boolean,
  pipValue: number,
  type: ReinforcementType,
): StopLimitSpec {
  // Determine trigger zone: 2-3 zones in front of entry zone
  // (at least one FULL zone buffer between entry and trigger)
  const triggerOffset = Math.min(REINFORCEMENT.TRIGGER_OFFSET_BASE + rocketIndex, zones.length - 1);
  const triggerZoneIndex = zones.indexOf(entryZone) + triggerOffset;
  const triggerZone = zones[Math.min(triggerOffset, zones.length - 1)];
  const triggerZoneId = triggerZone?.id ?? `${entryZone.id}+${triggerOffset}`;

  // Edge selection: Rocket #1 at close edge, #2/#3 at far edge of trigger zone
  const triggerEdge: 'close' | 'far' = rocketIndex === 0 ? 'close' : 'far';

  // Stop price: 1-2 pips INSIDE target liquidity zone (prevents false sweeps)
  const insidePips = type === ReinforcementType.LR ? REINFORCEMENT.LR_INSIDE_PIPS : REINFORCEMENT.STANDARD_INSIDE_PIPS;
  const stopPrice = triggerZone
    ? (isLong
        ? triggerZone.floor + (insidePips * pipValue)
        : triggerZone.ceiling - (insidePips * pipValue))
    : entryZone.floor;

  // Session buffer
  const { slBufferPips, session } = getSessionBuffer(type);

  // Thin liquidity zone check: NEVER use as entry or SL zone
  const entryWidth = zoneWidthPips(entryZone, pipValue);
  const isThinLiquidityZone = entryWidth < ZONE_WIDTH.THIN_ZONE_THRESHOLD_PIPS;

  const rationale =
    `Rocket #${rocketIndex + 1} (${type}): ` +
    `trigger zone=${triggerZoneId} (${triggerEdge} edge), ` +
    `stop ${insidePips}p inside target, ` +
    `SL buffer=${slBufferPips}p (${session}), ` +
    `${isThinLiquidityZone ? 'WARNING: thin liquidity zone — not suitable' : 'zone width adequate'}`;

  return {
    triggerZoneId,
    triggerEdge,
    stopPrice,
    slBufferPips,
    session,
    isThinLiquidityZone,
    rationale,
  };
}

export function buildReinforcementLadder(
  primarySetup: TradeSetup,
  zones: DXYZone[],
  spotPrice: number,
): ReinforcementLadder {
  const reinforcements: ReinforcementEntry[] = [];
  const direction = primarySetup.direction;
  const isLong = direction === 'LONG';
  const pipValue = primarySetup.pair === 'DXY' ? ZONE_WIDTH.PIP_DXY : ZONE_WIDTH.PIP_5DIGIT;

  // Find intermediate zones between entry and TP
  const pathZones = zones.filter((z: DXYZone) => {
    const zonePrice = isLong ? z.floor : z.ceiling;
    if (isLong) {
      return zonePrice > primarySetup.entry && zonePrice < primarySetup.tp;
    }
    return zonePrice < primarySetup.entry && zonePrice > primarySetup.tp;
  }).sort((a: DXYZone, b: DXYZone) => isLong
    ? a.floor - b.floor
    : b.ceiling - a.ceiling
  );

  // FIX-022: Filter out thin liquidity zones — they are NEVER entry or SL zones
  const validPathZones = pathZones.filter((z: DXYZone) =>
    zoneWidthPips(z, pipValue) >= ZONE_WIDTH.THIN_ZONE_THRESHOLD_PIPS
  );

  // Use valid (non-thin) zones for reinforcement placement
  const buildZones = validPathZones.length > 0 ? validPathZones : pathZones;

  // THIN ZONE MULTIPLIER (Fractal §2.1): thin zones inside 4H pool count as 2 for LR
  let effectiveBufferCount = 0;
  for (const bufZone of buildZones) {
    const isThin = zoneWidthPips(bufZone, pipValue) < ZONE_WIDTH.THIN_ZONE_THRESHOLD_PIPS;
    if (isThin) {
      const insidePool = zones.some(z =>
        zoneWidthPips(z, pipValue) >= ZONE_WIDTH.THIN_ZONE_THRESHOLD_PIPS &&
        z.floor <= bufZone.floor && z.ceiling >= bufZone.ceiling
      );
      effectiveBufferCount += insidePool ? 2 : 1; // MULTIPLIER
    } else {
      effectiveBufferCount += 1;
    }
  }

  // Build up to 3 reinforcement entries at intermediate zones
  // S1: Use effectiveBufferCount for LR buffer validation (thin zones in 4H pool = 2)
  const maxEntries = Math.min(effectiveBufferCount, REINFORCEMENT.MAX_ENTRIES);

  for (let i = 0; i < maxEntries && i < REINFORCEMENT.RECOMMENDED_ENTRIES && i < buildZones.length; i++) {
    const zone = buildZones[i];
    const type = i === 0 ? ReinforcementType.FLR : ReinforcementType.LR;
    const buffers = REINFORCEMENT_BUFFER_PIPS[type];

    const entryPrice = isLong ? zone.floor : zone.ceiling;
    const buffer = buffers.thick * pipValue;
    const slPrice = isLong
      ? entryPrice - buffer
      : entryPrice + buffer;

    // Quantity: decreasing scale (first reinforcement = 1, second = 0.5)
    const quantity = i === 0 ? REINFORCEMENT.PRIMARY_ROCKET_QTY : REINFORCEMENT.SECONDARY_ROCKET_QTY;

    // Combined RRR: average of all entries so far
    const primaryRRR = primarySetup.rrr;
    const rrrSum = primaryRRR + reinforcements.reduce((s: number, r: ReinforcementEntry) => s + r.combinedRRR, 0);
    const entryCount = 1 + reinforcements.length;

    // FIX-022: Build stop-limit specification for this rocket
    const stopLimitSpec = buildStopLimitSpec(
      i,
      zone,
      buildZones,
      isLong,
      pipValue,
      type,
    );

    reinforcements.push({
      type,
      entryPrice,
      stopLoss: slPrice,
      takeProfit: primarySetup.tp,
      quantity,
      combinedRRR: rrrSum / entryCount,
      triggerPrice: entryPrice,
      elementalAttack: classifyAttackType({ shapeTrigger: type === ReinforcementType.FLR ? 'fib' : undefined } as Partial<TradeSetup>),
      stopLimitSpec,
    });
  }

  // Calculate combined RRR
  const totalRisk = primarySetup.slPips + reinforcements.reduce((s: number, r: ReinforcementEntry) => s + Math.abs(r.entryPrice - r.stopLoss) / pipValue, 0);
  const tpPips = Math.abs(primarySetup.tp - primarySetup.entry) / pipValue;
  const combinedRRR = reinforcements.length > 0 ? tpPips / (totalRisk / (1 + reinforcements.length)) : primarySetup.rrr;

  return {
    primarySetupId: primarySetup.setupId,
    reinforcements,
    totalRisk,
    combinedRRR,
  };
}

export function getRecommendedReinforcements(): number {
  return REINFORCEMENT.RECOMMENDED_ENTRIES;
}
