/**
 * Elemental Lobe — Elemental Density Classification System
 *
 * From Trident Fractal Architecture v2.3 Section 2:
 * All market mechanics are governed by four fundamental elemental densities.
 * This lobe classifies every zone, shape, and setup by its elemental density.
 *
 * EARTH — Liquidity & IP zones (foundation)
 * FIRE — Supply & Demand zones (firepower)
 * WATER — Macro shapes (waves)
 * AIR — Fibonacci (spiderweb)
 */

import { 
  ElementalDensity, AttackType, ElementalProfile, PAIR_ELEMENTAL_PROFILES,
  DXYZone, ZoneType, ShapeCode, TradeSetup, SetupCategory, FractalSignal,
} from '../types.js';
import { REINFORCEMENT } from '../constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — proximity thresholds for elemental detection
// (no matching centralized constant; kept here as named domain thresholds)
// ═══════════════════════════════════════════════════════════════════════════════

/** Earth zone proximity (fraction of price) — liquidity zone near entry */
const EARTH_ZONE_PROXIMITY = 0.002;

/** Fire zone proximity (fraction of price) — BoM S/D overlap at entry */
const FIRE_ZONE_PROXIMITY = 0.003;

/** Air Fib proximity (fraction of price) — Fib level within ~5 pips of entry */
const AIR_FIB_PROXIMITY = 0.0005;

/** Number of elemental densities required for Avatar State (Earth+Fire+Water+Air) */
const ELEMENTAL_DENSITY_COUNT = 4;

// ── Zone Density Classification ──

export function classifyZoneDensity(zone: DXYZone): ElementalDensity {
  switch (zone.type) {
    case ZoneType.BOM_SUPPLY:
    case ZoneType.BOM_DEMAND:
      return ElementalDensity.FIRE;  // BoM zones are the hottest Fire
    case ZoneType.MOM_SUPPLY:
    case ZoneType.MOM_DEMAND:
      return ElementalDensity.FIRE;  // MoM zones are cooling Fire
    case ZoneType.LSZ_SUPPLY:
    case ZoneType.LSZ_DEMAND:
      return ElementalDensity.EARTH; // Liquidity Sweep Zones = standard Earth
    case ZoneType.IP_SUPPLY:
    case ZoneType.IP_DEMAND:
      return ElementalDensity.EARTH; // IP zones = HEAVY Earth
    default:
      return ElementalDensity.EARTH;
  }
}

// ── Shape Density Classification ──

export function classifyShapeDensity(shape: ShapeCode): ElementalDensity {
  switch (shape) {
    case ShapeCode.BS:
    case ShapeCode.PBS:
      return ElementalDensity.WATER; // Breakout Surges = tidal waves
    case ShapeCode.WL:
    case ShapeCode.RWL:
      return ElementalDensity.WATER; // Whiplashes = crashing waves
    case ShapeCode.R:
      return ElementalDensity.WATER; // Recovery = wave reformation
    case ShapeCode.SS:
      return ElementalDensity.WATER; // Swing Scalps = ripples
    case ShapeCode.WLS:
      return ElementalDensity.WATER; // Wide Range Swing = big wave
    case ShapeCode.STORM:
      return ElementalDensity.WATER; // Storm = chaotic waves
    case ShapeCode.DWL:
      return ElementalDensity.WATER; // Dead Whales = failed wave
    default:
      return ElementalDensity.WATER;
  }
}

// ── Attack Type Classification (Density vs Attack distinction) ──

export function classifyAttackType(setup: Partial<TradeSetup>): AttackType {
  // FLR = Earth Heavy Attack (Air trigger + Earth entry/SL)
  if (setup.shapeTrigger?.includes('fib') || setup.shapeTrigger?.includes('Fib')) {
    return AttackType.EARTH_HEAVY;
  }
  // FR = Fire Precision Attack (Air precision on Fire zones)
  if (setup.category === SetupCategory.BREAKOUT_SURGE) {
    return AttackType.FIRE_PRECISION;
  }
  // LR = Water Precision Attack (flowing through Earth channels)
  return AttackType.WATER_PRECISION;
}

// ── Pair Elemental Profile ──

function getPairProfile(pair: string): ElementalProfile {
  return PAIR_ELEMENTAL_PROFILES[pair] ?? {
    pair,
    primary: ElementalDensity.EARTH,
    secondary: ElementalDensity.WATER,
    description: 'Default profile',
  };
}

// ── Fractal Signal Detection ──

export function detectFractalSignal(
  zones: DXYZone[],
  shapeCode: ShapeCode,
  fibLevels: { price: number }[],
  entryPrice: number,
  pair: string,
): FractalSignal {
  const present: ElementalDensity[] = [];
  const profile = getPairProfile(pair);

  // Earth: Is there a liquidity zone at or near entry?
  const earthZone = zones.some((z: DXYZone) => 
    classifyZoneDensity(z) === ElementalDensity.EARTH &&
    Math.abs(z.ceiling - entryPrice) / entryPrice < EARTH_ZONE_PROXIMITY
  );
  if (earthZone) present.push(ElementalDensity.EARTH);

  // Fire: Is there a BoM S/D zone overlap at entry?
  const fireZone = zones.some((z: DXYZone) => 
    z.isBoM && z.confluence >= REINFORCEMENT.PROMOTION_CONFLUENCE &&
    Math.abs(z.floor - entryPrice) / entryPrice < FIRE_ZONE_PROXIMITY
  );
  if (fireZone) present.push(ElementalDensity.FIRE);

  // Water: Is the shape anchored to a supply/demand zone at entry?
  // Direction comes from ZONE TYPE (supply = SHORT, demand = LONG) — never from
  // shape classification (TTE v5.3.3 #14). The shape only selects the setup
  // CATEGORY, so Water is present when the entry sits inside a zone's range.
  const waterZone = zones.some((z: DXYZone) =>
    entryPrice >= z.floor && entryPrice <= z.ceiling
  );
  if (waterZone) present.push(ElementalDensity.WATER);

  // Air: Is there a Fib level within 5 pips of entry?
  const airLevel = fibLevels.some((f: { price: number }) => 
    Math.abs(f.price - entryPrice) / entryPrice < AIR_FIB_PROXIMITY
  );
  if (airLevel) present.push(ElementalDensity.AIR);

  return {
    isAvatarState: present.length >= ELEMENTAL_DENSITY_COUNT,
    elements: present,
    confluenceCount: present.length,
  };
}
