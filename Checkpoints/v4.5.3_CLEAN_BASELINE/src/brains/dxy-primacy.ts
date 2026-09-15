/**
 * DXY Primacy Model — Cross-pair directional conviction.
 * Per TTE v5.3.3 Part IX: DXY provides the direction, pairs provide their own levels.
 * DXY BULLISH → EUR/USD, GBP/USD, AUD/USD should be SHORT (inverse correlation)
 * DXY BEARISH → EUR/USD, GBP/USD, AUD/USD should be LONG
 * DXY NEUTRAL → both directions allowed
 *
 * Enhancement (TTE v5.3.3 Part IX + Section 2.0.4):
 *   - Pillar composite score integration from DXY zones
 *   - Pair-specific element profiles (Fire-Earth, Earth-Water, Earth)
 *   - Preferred setup type per pair
 *   - recommendedCategory in isDirectionAligned() output
 */

import { ZoneType, ShapeCode, SetupCategory } from '../types.js';
import type { ZoneMapSnapshot, ShapePredictionSnapshot, ShapeChain, DXYZone } from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  DEFAULT_CONFIDENCE,
  MOVE_DURATION_EURUSD_DAYS,
  MOVE_DURATION_GBPUSD_DAYS,
  MOVE_DURATION_AUDUSD_DAYS,
  CONFIDENCE_HIGH,
  PILLAR_COMPOSITE_MAX,
  NEARBY_ZONE_DISTANCE_DXY,
  MIN_PRESSURE_EXCESS,
  PILLAR_COMPOSITE_STRONG,
  BULLISH_CONVICTION_RATIO,
  BEARISH_CONVICTION_RATIO,
  PAIR_CATEGORY_MISMATCH_PENALTY,
  PAIR_GENERAL_MISMATCH_PENALTY,
  AUDUSD_MIN_CONFLUENCE,
  AUDUSD_LOW_CONFLUENCE_PENALTY,
  AUDUSD_SCALP_PENALTY,
} from '../constants/trading-constants.js';

const log = new Logger('DXYPrimacy');

export type DXYConviction = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface DXYPrimacyState {
  conviction: DXYConviction;
  strength: number;  // 0.0-1.0
  reason: string;
  /** Pillar composite score (0-18 scale from 9-pillar engine). 0 when no DXY data. */
  pillarComposite?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAIR-SPECIFIC ELEMENT PROFILES (TTE v5.3.3 Section 2.0.4)
// ═══════════════════════════════════════════════════════════════════════════════

export interface PairElementProfile {
  pair: string;
  dominantElements: string[];      // e.g. ['Fire', 'Earth']
  pace: 'fast' | 'medium' | 'slow';
  preferredTimeframe: 'LTF' | 'HTF';
  moveDurationDays: number;        // typical move duration in days
  preferredCategory: SetupCategory;
  preferredSessionNote: string;    // human-readable guidance
}

/**
 * Per TTE v5.3.3 Section 2.0.4 — each major pair has distinct elemental
 * characteristics that determine how it moves and what setup type is optimal.
 */
export const PAIR_PROFILES: Readonly<Record<string, PairElementProfile>> = {
  'EUR/USD': {
    pair: 'EUR/USD',
    dominantElements: ['Fire', 'Earth'],
    pace: 'medium',
    preferredTimeframe: 'HTF',
    moveDurationDays: MOVE_DURATION_EURUSD_DAYS,
    preferredCategory: SetupCategory.HTF_SWING,
    preferredSessionNote: 'HTF swings during NY — medium pace, 2-day moves',
  },
  'GBP/USD': {
    pair: 'GBP/USD',
    dominantElements: ['Earth', 'Water'],
    pace: 'fast',
    preferredTimeframe: 'LTF',
    moveDurationDays: MOVE_DURATION_GBPUSD_DAYS,
    preferredCategory: SetupCategory.SWING_SCALP,
    preferredSessionNote: 'Scalps during London — 3-4x more opportunities, liquidity-respected',
  },
  'AUD/USD': {
    pair: 'AUD/USD',
    dominantElements: ['Earth'],
    pace: 'slow',
    preferredTimeframe: 'HTF',
    moveDurationDays: MOVE_DURATION_AUDUSD_DAYS,
    preferredCategory: SetupCategory.HTF_SWING,
    preferredSessionNote: 'HTF swings only — slower, cleaner, 2-4 days per move',
  },
};

/** Zone types that represent demand (bullish pressure when near spot). */
const DEMAND_TYPES: ReadonlySet<ZoneType> = new Set([
  ZoneType.BOM_DEMAND,
  ZoneType.MOM_DEMAND,
  ZoneType.LSZ_DEMAND,
  ZoneType.IP_DEMAND,
]);

/** Zone types that represent supply (bearish pressure when near spot). */
const SUPPLY_TYPES: ReadonlySet<ZoneType> = new Set([
  ZoneType.BOM_SUPPLY,
  ZoneType.MOM_SUPPLY,
  ZoneType.LSZ_SUPPLY,
  ZoneType.IP_SUPPLY,
]);

/**
 * Compute the average pillar composite score from DXY zones.
 *
 * Each DXYZone has a `pillars: number[]` field (9 individual pillar scores 0-2).
 * We sum all pillar scores across all zones and divide by the zone count to get
 * a per-zone average composite (0-18 scale), then pick the highest-zone composite.
 *
 * A high composite means many pillars are active = stronger directional conviction.
 */
function computePillarComposite(zoneMap: ZoneMapSnapshot): number {
  if (!zoneMap.zones || zoneMap.zones.length === 0) return 0;

  let maxComposite = 0;
  for (const zone of zoneMap.zones as DXYZone[]) {
    const pillars = zone.pillars;
    if (pillars && pillars.length > 0) {
      const composite = pillars.reduce((sum: number, s: number) => sum + s, 0);
      if (composite > maxComposite) {
        maxComposite = composite;
      }
    }
  }
  return maxComposite;
}

/**
 * Compute DXY directional conviction from zone map + shape prediction.
 * Uses: shape chain direction + zone pressure imbalance + shape confidence
 * + pillar composite score (TTE v5.3.3 Part IX enhancement).
 */
export function computeDXYConviction(
  zoneMap: ZoneMapSnapshot | undefined,
  shapePrediction: ShapePredictionSnapshot | undefined,
): DXYPrimacyState {
  if (!zoneMap || !shapePrediction) {
    return { conviction: 'NEUTRAL', strength: 0, reason: 'No DXY data' };
  }

  let bullishSignals = 0;
  let bearishSignals = 0;
  const reasons: string[] = [];

  const shapeChain: ShapeChain = shapePrediction.shapeChain;

  // Signal 1: Current shape from the chain
  const currentShape = shapeChain.currentShape;
  if (currentShape === ShapeCode.BS || currentShape === ShapeCode.PBS) {
    bullishSignals++;
    reasons.push('shape=BS');
  } else if (currentShape === ShapeCode.WL || currentShape === ShapeCode.R) {
    bearishSignals++;
    reasons.push(`shape=${currentShape}`);
  }

  // Signal 2: Zone pressure imbalance (more demand zones near spot = bullish)
  const spot = zoneMap.spots['DXY'] ?? 0;
  if (spot > 0 && zoneMap.zones.length > 0) {
    const nearbyZones = zoneMap.zones.filter((z: DXYZone) =>
      Math.abs((z.ceiling + z.floor) / 2 - spot) < NEARBY_ZONE_DISTANCE_DXY, // within 2 DXY points
    );
    const demandNearby = nearbyZones.filter((z: DXYZone) => DEMAND_TYPES.has(z.type)).length;
    const supplyNearby = nearbyZones.filter((z: DXYZone) => SUPPLY_TYPES.has(z.type)).length;
    if (demandNearby > supplyNearby + MIN_PRESSURE_EXCESS) {
      bullishSignals++;
      reasons.push('demand-heavy near spot');
    } else if (supplyNearby > demandNearby + MIN_PRESSURE_EXCESS) {
      bearishSignals++;
      reasons.push('supply-heavy near spot');
    }
  }

  // Signal 3: Shape prediction confidence — use the latest chain entry's confidence
  const chainEntries = shapeChain.chain;
  if (chainEntries.length > 0) {
    const lastEntry = chainEntries[chainEntries.length - 1];
    if (lastEntry.confidence > CONFIDENCE_HIGH) {
      if (lastEntry.shape === ShapeCode.BS || lastEntry.shape === ShapeCode.PBS) {
        bullishSignals++;
        reasons.push('high-conf BS');
      } else if (lastEntry.shape === ShapeCode.WL || lastEntry.shape === ShapeCode.R) {
        bearishSignals++;
        reasons.push('high-conf bearish');
      }
    }
  }

  // ══ Signal 4: Pillar composite score (TTE v5.3.3 Part IX enhancement) ══
  // High pillar composite + directional = stronger conviction.
  // The 9-pillar engine scores 0-2 per pillar; max composite = 18.
  // We add an extra signal when composite is high (≥ 9 = at least 1.0 avg per pillar)
  // and the directional bias matches the shape/zone signals.
  const pillarComposite = computePillarComposite(zoneMap);
  if (pillarComposite >= PILLAR_COMPOSITE_STRONG) {
    reasons.push(`pillar composite=${pillarComposite}/${PILLAR_COMPOSITE_MAX}`);
    // If bullish signals already dominate, the strong pillar score reinforces
    if (bullishSignals > bearishSignals) {
      bullishSignals++;
      reasons.push('pillar-reinforced bullish');
    } else if (bearishSignals > bullishSignals) {
      bearishSignals++;
      reasons.push('pillar-reinforced bearish');
    }
  }

  // Compute conviction
  const total = bullishSignals + bearishSignals;
  if (total === 0) {
    return { conviction: 'NEUTRAL', strength: 0, reason: 'No directional signals', pillarComposite };
  }

  const bullishRatio = bullishSignals / total;
  if (bullishRatio >= BULLISH_CONVICTION_RATIO) {
    return { conviction: 'BULLISH', strength: bullishRatio, reason: reasons.join(', '), pillarComposite };
  } else if (bullishRatio <= BEARISH_CONVICTION_RATIO) {
    return { conviction: 'BEARISH', strength: 1 - bullishRatio, reason: reasons.join(', '), pillarComposite };
  }
  return { conviction: 'NEUTRAL', strength: DEFAULT_CONFIDENCE, reason: 'Mixed signals: ' + reasons.join(', '), pillarComposite };
}

/**
 * Get the recommended setup category for a given pair based on its elemental
 * profile (TTE v5.3.3 Section 2.0.4).
 *
 * EUR/USD: HTF swings during NY
 * GBP/USD: Scalps during London (3-4x more opportunities)
 * AUD/USD: HTF swings (slower, cleaner)
 *
 * Falls back to HTF_SWING for unknown pairs (DXY, etc.)
 */
export function getRecommendedCategory(pair: string): SetupCategory {
  const profile = PAIR_PROFILES[pair];
  if (profile) return profile.preferredCategory;
  return SetupCategory.HTF_SWING;
}

/**
 * Get the full pair element profile for diagnostic/logging purposes.
 */
export function getPairProfile(pair: string): PairElementProfile | undefined {
  return PAIR_PROFILES[pair];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX-023: PAIR-SPECIFIC ELEMENTAL PROFILE ENFORCEMENT (GAP-25)
// TTE v5.3.3 Section 2.0.4
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Session type derived from SessionWindow for profile enforcement.
 */
function sessionToType(session: string): 'london' | 'ny' | 'other' {
  if (session.includes('London')) return 'london';
  if (session.includes('NY')) return 'ny';
  return 'other';
}

export interface PairProfilePenalty {
  /** Adjusted confidence after penalty. */
  adjustedConfidence: number;
  /** Penalty applied (0 if no penalty). */
  penalty: number;
  /** Human-readable reason for the penalty. */
  reason: string;
}

/**
 * FIX-023: Apply pair-specific elemental profile confidence penalty.
 *
 * Per TTE v5.3.3 Section 2.0.4:
 *   - EUR/USD: Fire-Earth dominant, HTF moves, medium pace
 *   - GBP/USD: Earth-Water dominant, LTF moves, liquidity-respected
 *   - AUD/USD: Earth dominant (slow), HTF moves only, 2-4 days per move
 *
 * Enforcement rules:
 *   - GBP/USD generates an HTF_SWING during London → penalty (GU is scalp-dominant)
 *   - EUR/USD generates a SWING_SCALP during NY → penalty (EU is swing-dominant)
 *   - AUD/USD requires higher confluence (slow mover, needs more confirmation)
 *
 * @param pair       Instrument pair (e.g. "EUR/USD")
 * @param category   Setup category (HTF_SWING, SWING_SCALP, etc.)
 * @param session    Session window string from SessionWindow enum
 * @param confidence Current confidence score (0-100)
 * @param confluence Zone confluence score (for AUD/USD higher-confluence check)
 * @returns Adjusted confidence + penalty rationale
 */
export function applyPairProfilePenalty(
  pair: string,
  category: SetupCategory,
  session: string,
  confidence: number,
  confluence: number = 0,
): PairProfilePenalty {
  const profile = PAIR_PROFILES[pair];
  if (!profile) {
    return { adjustedConfidence: confidence, penalty: 0, reason: 'No pair profile' };
  }

  const sessionType = sessionToType(session);
  let penalty = 0;
  const reasons: string[] = [];

  // Rule 1: Setup category mismatches pair's preferred category during the
  // pair's optimal session
  if (category !== profile.preferredCategory) {
    if (pair === 'GBP/USD' && sessionType === 'london' && category === SetupCategory.HTF_SWING) {
      // GBP/USD is scalp-dominant — HTF_SWING during London is suboptimal
      penalty += PAIR_CATEGORY_MISMATCH_PENALTY;
      reasons.push('GBP/USD is scalp-dominant (Earth-Water) — HTF_SWING during London penalized');
    }
    if (pair === 'EUR/USD' && sessionType === 'ny' && category === SetupCategory.SWING_SCALP) {
      // EUR/USD is swing-dominant — SWING_SCALP during NY is suboptimal
      penalty += PAIR_CATEGORY_MISMATCH_PENALTY;
      reasons.push('EUR/USD is swing-dominant (Fire-Earth) — SWING_SCALP during NY penalized');
    }
    // General mismatch penalty (smaller, applies in any session)
    if (penalty === 0) {
      penalty += PAIR_GENERAL_MISMATCH_PENALTY;
      reasons.push(`${pair} prefers ${profile.preferredCategory} — ${category} is suboptimal`);
    }
  }

  // Rule 2: AUD/USD requires higher confluence (slow mover, Earth-dominant)
  // Needs more confirmation — penalize low-confluence setups
  if (pair === 'AUD/USD' && confluence < AUDUSD_MIN_CONFLUENCE) {
    penalty += AUDUSD_LOW_CONFLUENCE_PENALTY;
    reasons.push(`AUD/USD is slow/Earth-dominant — requires confluence ≥${AUDUSD_MIN_CONFLUENCE}, got ${confluence}`);
  }

  // Rule 3: AUD/USD generating scalps is against its nature (HTF only)
  if (pair === 'AUD/USD' && category === SetupCategory.SWING_SCALP) {
    penalty += AUDUSD_SCALP_PENALTY;
    reasons.push('AUD/USD is HTF-only (slow mover) — SWING_SCALP is against elemental nature');
  }

  const adjustedConfidence = Math.max(0, confidence - penalty);
  const reason = reasons.length > 0 ? reasons.join('; ') : 'No penalty';

  return { adjustedConfidence, penalty, reason };
}

/**
 * Check if a trade direction is aligned with DXY conviction.
 * DXY BULLISH → pairs should be SHORT (inverse correlation)
 * DXY BEARISH → pairs should be LONG
 * DXY NEUTRAL → any direction allowed
 *
 * Also returns recommendedCategory based on the pair's elemental profile
 * (TTE v5.3.3 Section 2.0.4 Part IX Multi-Pair Translation).
 */
export function isDirectionAligned(
  pair: string,
  direction: 'LONG' | 'SHORT',
  primacy: DXYPrimacyState,
): { aligned: boolean; reason: string; recommendedCategory: SetupCategory } {
  const recommendedCategory = getRecommendedCategory(pair);

  if (pair === 'DXY') {
    return { aligned: true, reason: 'DXY is the primary', recommendedCategory };
  }
  if (primacy.conviction === 'NEUTRAL') {
    return { aligned: true, reason: 'DXY neutral', recommendedCategory };
  }

  // Inverse correlation: DXY bullish → pair short, DXY bearish → pair long
  const expectedDirection = primacy.conviction === 'BULLISH' ? 'SHORT' : 'LONG';
  if (direction === expectedDirection) {
    // High pillar composite + directional = stronger conviction
    const pillarNote = primacy.pillarComposite && primacy.pillarComposite >= PILLAR_COMPOSITE_STRONG
      ? ` (pillar=${primacy.pillarComposite}/${PILLAR_COMPOSITE_MAX})`
      : '';
    return {
      aligned: true,
      reason: `Aligned with DXY ${primacy.conviction}${pillarNote}`,
      recommendedCategory,
    };
  }
  return {
    aligned: false,
    reason: `Counter-trend: DXY ${primacy.conviction} expects ${expectedDirection}, got ${direction}`,
    recommendedCategory,
  };
}
