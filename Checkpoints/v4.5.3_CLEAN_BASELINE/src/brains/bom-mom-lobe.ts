/**
 * BoM/MoM Lobe — classifies zones as Beginning of Move (BoM) or Middle of Move (MoM).
 *
 * Classification source (TTE v5.3.3):
 *   - BoM/MoM is determined SOLELY by the 4h-sd-lobe's move-structure analysis.
 *   - BoM = zone at the ORIGIN of a directional move (consolidation then price
 *     left with momentum).
 *   - MoM = zone formed MID-MOVE.
 *   - Exception: if confluence ≥ 6 (MODERATE), promote MoM to BoM.
 *
 * This lobe does NOT classify based on distance from spot. The 4h-sd-lobe's
 * isBoM flag is the authoritative source.
 *
 * Classification determines zone type (BoM Supply / BoM Demand / MoM Supply / MoM Demand)
 * which drives trading strategy selection and position sizing.
 */

import { DXYZone, ZoneType, OHLCBar } from '../types.js';
import type { PillarResult } from './9-pillar-lobe.js';
import { ZONE_WIDTH, REINFORCEMENT } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
// BoM/MoM promotion confluence sourced from trading-constants.js
// (REINFORCEMENT.PROMOTION_CONFLUENCE).

// ═══════════════════════════════════════════════════════════════════════════════
// 4H MoM One-and-Done Rule (TTE v5.3.3 lines 246-249)
// ═══════════════════════════════════════════════════════════════════════════════

export enum MomStatus {
  UNKNOWN = 'unknown',
  VIRGIN = 'virgin',       // First retest = minor reaction, then likely strong pierce
  REACTED = 'reacted',     // Has had 1 reaction — expect pierce next
  PIERCED = 'pierced',     // Already pierced — zone is dead
}

// In-memory store of MoM zone status
const momStatusStore = new Map<string, MomStatus>();

export function getMomStatus(zoneId: string, spotPrice: number, floor: number, ceiling: number): MomStatus {
  const current = momStatusStore.get(zoneId) ?? MomStatus.VIRGIN;

  // Check if price has pierced through the zone
  if (spotPrice > ceiling || spotPrice < floor) {
    if (current === MomStatus.REACTED || current === MomStatus.VIRGIN) {
      momStatusStore.set(zoneId, MomStatus.PIERCED);
      return MomStatus.PIERCED;
    }
  }

  // Check if price is currently AT the zone (testing it)
  if (spotPrice >= floor && spotPrice <= ceiling) {
    if (current === MomStatus.VIRGIN) {
      momStatusStore.set(zoneId, MomStatus.REACTED);
      return MomStatus.REACTED;
    }
  }

  return current;
}

export function isOneAndDone(scalable: boolean, is4HMoM: boolean, momStatus: MomStatus): boolean {
  // The rule only applies to 4H MoM zones
  if (!is4HMoM) return false;

  // Virgin 4H MoM: first retest = minor reaction, then likely strong pierce
  // After first reaction: expect pierce, DO NOT enter for swing
  if (momStatus === MomStatus.REACTED || momStatus === MomStatus.PIERCED) {
    return true; // One-and-done — zone is exhausted
  }

  // Virgin 4H MoM: scalp only at most
  if (momStatus === MomStatus.VIRGIN && scalable) {
    return false; // Scalp entries still allowed
  }

  return false;
}

export function clearMomStatusStore(): void {
  momStatusStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassifyInput {
  zones: DXYZone[];
  spot: number;
  pipValue: number;
  pillarResult?: Pick<PillarResult, 'compositeScore'>;
}

/**
 * Classify zones as Beginning of Move (BoM) or Middle of Move (MoM).
 *
 * @param input.zones - Zones to classify (typically 4H SD zones)
 * @param input.spot - Current spot price
 * @param input.pipValue - Pip value for the instrument
 * @param input.pillarResult - Optional pillar results (used for confluence promotion)
 * @returns New array of zones with updated isBoM and type fields
 */
export function classifyZones(input: ClassifyInput): DXYZone[] {
  const { zones, spot, pipValue, pillarResult } = input;

  return zones.map((zone: DXYZone) => {
    const zoneMidPrice = (zone.floor + zone.ceiling) / 2;

    // BoM/MoM classification: use the 4h-sd-lobe's move-structure
    // classification as the SOLE source. BoM = zone at the ORIGIN of a
    // directional move (consolidation then price left with momentum).
    // MoM = zone formed MID-MOVE. Do NOT override with distance from spot.
    let isBoM = zone.isBoM;

    // Exception: if confluence is high (≥6 MODERATE), promote MoM to BoM
    if (!isBoM) {
      const effectiveConfluence = pillarResult?.compositeScore ?? zone.confluence;
      if (effectiveConfluence >= REINFORCEMENT.PROMOTION_CONFLUENCE) {
        isBoM = true;
      }
    }

    // Determine zone type from isBoM and position relative to spot
    const isDemand = zoneMidPrice < spot;
    const type = computeZoneType(isDemand, isBoM);

    // 4H MoM one-and-done classification
    let momStatus: MomStatus | undefined;
    let isOneAndDoneVal: boolean | undefined;
    if (!isBoM) {
      // This is a MoM zone
      momStatus = getMomStatus(zone.id, spot, zone.floor, zone.ceiling);
      isOneAndDoneVal = isOneAndDone(false, true, momStatus);
    }

    return {
      ...zone,
      isBoM,
      type,
      momStatus,
      isOneAndDone: isOneAndDoneVal,
    };
  });
}

/**
 * Classify a single price level as BoM or MoM based on distance from spot.
 * Useful for non-4H zones (e.g., pillar-derived zones) that need classification.
 */
export function classifyLevel(
  level: number,
  spot: number,
  pipValue: number,
  isDemand: boolean,
  confluence?: number,
): { isBoM: boolean; type: ZoneType } {
  const distancePips = Math.abs(level - spot) / pipValue;
  let isBoM = distancePips > ZONE_WIDTH.BOM_DISTANCE_PIPS;

  // Promotion exception
  if (!isBoM && (confluence ?? 0) >= REINFORCEMENT.PROMOTION_CONFLUENCE) {
    isBoM = true;
  }

  return {
    isBoM,
    type: computeZoneType(isDemand, isBoM),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function computeZoneType(isDemand: boolean, isBoM: boolean): ZoneType {
  if (isDemand) {
    return isBoM ? ZoneType.BOM_DEMAND : ZoneType.MOM_DEMAND;
  } else {
    return isBoM ? ZoneType.BOM_SUPPLY : ZoneType.MOM_SUPPLY;
  }
}
