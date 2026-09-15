/**
 * Fibonacci Spiderweb — 3-Context Fibonacci Anchoring
 *
 * Computes and validates Fibonacci confluence across three time horizons:
 *   - MACRO (weekly): Major structural levels, 2+ year swing points
 *   - MESO  (daily): Intermediate trend levels, 3-12 month swing points
 *   - MICRO (4H/1H): Near-term entry levels, 1-4 week swing points
 *
 * When all three contexts align at the same price level, the setup has
 * "fib spiderweb confluence" — a statistically high-probability entry.
 *
 * This module is an advisory overlay. It produces WARN/INFO results
 * that help the trader assess fib quality but does not block trades.
 */

import { GuardrailResult, PIP_VALUE } from '../types.js';
import { RuleCheckContext } from './index.js';
import {
  FIB_LEVELS_FULL, FIB_CLUSTER_RADIUS_PIPS, MIN_FIB_CONFLUENCE,
  MIN_SPIDERWEB_CONTEXTS, PIP_VALUE_DEFAULT,
  SPIDERWEB_FULL_SCORE_BASE, SPIDERWEB_FULL_SCORE_BONUS,
  SPIDERWEB_HIGH_CONFLUENCE, SPIDERWEB_MULTI_SCORE_BASE,
  SPIDERWEB_SINGLE_SCORE_BASE, SPIDERWEB_SCORE_CAP,
  SPIDERWEB_FULL_CONTEXTS,
} from '../constants/trading-constants.js';

// Re-export constants that were previously defined locally in this module,
// so downstream consumers importing from fib-spiderweb are unaffected.
export { FIB_CLUSTER_RADIUS_PIPS, MIN_FIB_CONFLUENCE, MIN_SPIDERWEB_CONTEXTS };

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fibonacci context horizons.
 */
export enum FibContext {
  MACRO = 'MACRO',   // Weekly timeframe
  MESO = 'MESO',     // Daily timeframe
  MICRO = 'MICRO',   // 4H/1H timeframe
}

/**
 * Standard Fibonacci retracement/extension levels.
 */
export const FIB_LEVELS = FIB_LEVELS_FULL;

export type FibLevelValue = (typeof FIB_LEVELS)[number];

/**
 * A single Fibonacci level at a specific price for a specific context.
 */
export interface FibLevel {
  /** Price of this fib level. */
  price: number;
  /** Which context this level originates from. */
  context: FibContext;
  /** The Fibonacci ratio (e.g., 0.618, 0.786). */
  level: FibLevelValue;
  /** Label for the swing used (e.g., "weekly_high_2024"). */
  swingLabel?: string;
}

/**
 * A zone where multiple fib levels from different contexts cluster.
 */
export interface FibConfluenceZone {
  /** Center price of the confluence zone. */
  price: number;
  /** Radius in pips around the center. */
  radiusPips: number;
  /** Number of fib levels converging in this zone. */
  confluenceCount: number;
  /** Which contexts are represented. */
  contextsPresent: FibContext[];
  /** The individual fib levels in this zone. */
  levels: FibLevel[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — All numeric thresholds now sourced from trading-constants.js
// (FIB_CLUSTER_RADIUS_PIPS, MIN_FIB_CONFLUENCE, MIN_SPIDERWEB_CONTEXTS
//  are imported and re-exported above.)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PIP HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function getPipValue(pair: string): number {
  return PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIB LEVEL COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute fib levels from a swing high and low.
 * Returns an array of FibLevel for all standard levels.
 */
export function computeFibLevels(
  high: number,
  low: number,
  context: FibContext,
  swingLabel?: string,
): FibLevel[] {
  const range = high - low;
  if (range <= 0) return [];

  return FIB_LEVELS.map((level: FibLevelValue) => ({
    price: low + range * level,
    context,
    level,
    swingLabel,
  }));
}

/**
 * Compute all fib levels from context data available in the rule context.
 *
 * The context may provide:
 *   - ctx.fibLevels: pre-computed FibLevel[] from the broader system
 *   - If not present, the function returns empty (no fib data available)
 *
 * The broader system (zone brain / shape brain) is responsible for calculating
 * fib levels from swing points. This module consumes them for confluence checks.
 */
function getFibLevels(ctx: RuleCheckContext): FibLevel[] {
  return ctx.fibLevels ?? [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLUENCE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find all fib confluence zones from a set of fib levels.
 *
 * A confluence zone exists when multiple fib levels from different contexts
 * cluster within FIB_CLUSTER_RADIUS_PIPS of each other.
 */
export function findConfluenceZones(
  levels: FibLevel[],
  pair: string,
  clusterRadiusPips: number = FIB_CLUSTER_RADIUS_PIPS,
): FibConfluenceZone[] {
  if (levels.length < MIN_FIB_CONFLUENCE) return [];

  const pipValue = getPipValue(pair);
  const zones: FibConfluenceZone[] = [];

  // Sort by price
  const sorted = [...levels].sort((a: FibLevel, b: FibLevel) => a.price - b.price);

  // Cluster: group levels within radius
  let cluster: FibLevel[] = [];
  for (const level of sorted) {
    if (cluster.length === 0) {
      cluster = [level];
      continue;
    }

    const clusterCenter = cluster.reduce((s: number, l: FibLevel) => s + l.price, 0) / cluster.length;
    const distancePips = Math.abs(level.price - clusterCenter) / pipValue;

    if (distancePips <= clusterRadiusPips) {
      cluster.push(level);
    } else {
      // Finalize current cluster
      if (cluster.length >= MIN_FIB_CONFLUENCE) {
        zones.push(buildConfluenceZone(cluster, pair, clusterRadiusPips));
      }
      cluster = [level];
    }
  }

  // Finalize last cluster
  if (cluster.length >= MIN_FIB_CONFLUENCE) {
    zones.push(buildConfluenceZone(cluster, pair, clusterRadiusPips));
  }

  return zones;
}

/**
 * Build a FibConfluenceZone from a cluster of fib levels.
 */
function buildConfluenceZone(
  cluster: FibLevel[],
  pair: string,
  radiusPips: number,
): FibConfluenceZone {
  const center = cluster.reduce((s: number, l: FibLevel) => s + l.price, 0) / cluster.length;
  const pipValue = getPipValue(pair);

  const contextsPresent = [...new Set(cluster.map((l: FibLevel) => l.context))];

  return {
    price: center,
    radiusPips,
    confluenceCount: cluster.length,
    contextsPresent,
    levels: cluster,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPIDERWEB QUALITY ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assess spiderweb quality based on confluence zones.
 *
 * Returns a quality score 0-10:
 *   0-3:  No or minimal confluence
 *   4-6:  Single-context confluence
 *   7-8:  Multi-context confluence (spiderweb forming)
 *   9-10: Full spiderweb (3 contexts in confluence zone)
 */
export function assessSpiderwebQuality(
  zones: FibConfluenceZone[],
): { score: number; label: string } {
  if (zones.length === 0) {
    return { score: 0, label: 'No fib confluence' };
  }

  // Find the best zone
  const bestZone = zones.reduce((prev: FibConfluenceZone, curr: FibConfluenceZone) =>
    curr.confluenceCount > prev.confluenceCount ? curr : prev,
  );

  const contextCount = bestZone.contextsPresent.length;

  if (contextCount >= SPIDERWEB_FULL_CONTEXTS) {
    return {
      score: SPIDERWEB_FULL_SCORE_BASE + (bestZone.confluenceCount > SPIDERWEB_HIGH_CONFLUENCE ? SPIDERWEB_FULL_SCORE_BONUS : 0),
      label: `Full spiderweb (${bestZone.contextsPresent.join('+')})`,
    };
  }

  if (contextCount >= MIN_SPIDERWEB_CONTEXTS) {
    return {
      score: SPIDERWEB_MULTI_SCORE_BASE + Math.min(bestZone.confluenceCount, SPIDERWEB_SCORE_CAP),
      label: `Multi-context confluence (${bestZone.contextsPresent.join('+')})`,
    };
  }

  if (contextCount >= 1) {
    return {
      score: SPIDERWEB_SINGLE_SCORE_BASE + Math.min(bestZone.confluenceCount, SPIDERWEB_SCORE_CAP),
      label: `Single-context confluence (${bestZone.contextsPresent[0] ?? 'unknown'})`,
    };
  }

  return { score: 0, label: 'No fib confluence' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK: Fib Spiderweb
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIB-1: Check if setup entry aligns with a fib confluence zone.
 *
 * Returns:
 *   - INFO if entry aligns with a confirmed fib confluence zone
 *   - WARN if no fib confluence zone is near the entry
 *   - INFO (passed=true) if no fib data available
 */
export function fib1EntryAlignsWithConfluence(ctx: RuleCheckContext): GuardrailResult {
  const levels = getFibLevels(ctx);

  if (levels.length === 0) {
    return {
      rule: 'FIB-1',
      passed: true,
      severity: 'INFO',
      message: 'No fib spiderweb data available — skipping confluence check',
    evidence: 'FIB-1 check passed: No fib spiderweb data available — skipping confluence check',
    };
  }

  const zones = findConfluenceZones(levels, ctx.setup.pair);

  if (zones.length === 0) {
    return {
      rule: 'FIB-1',
      passed: false,
      severity: 'WARN',
      message: `No fib confluence zones found from ${levels.length} fib levels — setup entry lacks fib spiderweb confirmation`,
    evidence: `FIB-1 check failed: No fib confluence zones found from ${levels.length} fib levels — setup entry lacks fib spiderweb confirmation`,
    };
  }

  // Check if entry price aligns with any confluence zone
  const pipValue = getPipValue(ctx.setup.pair);
  const alignedZone = zones.find((zone: FibConfluenceZone) => {
    const distancePips = Math.abs(ctx.setup.entry - zone.price) / pipValue;
    return distancePips <= FIB_CLUSTER_RADIUS_PIPS;
  });

  if (!alignedZone) {
    return {
      rule: 'FIB-1',
      passed: false,
      severity: 'WARN',
      message: `Entry ${ctx.setup.entry} does not align with any of ${zones.length} fib confluence zones — consider adjusting entry to nearest confluence`,
    evidence: `FIB-1 check failed: Entry ${ctx.setup.entry} does not align with any of ${zones.length} fib confluence zones — consider adjusting entry to nearest confluence`,
    };
  }

  const quality = assessSpiderwebQuality([alignedZone]);

  return {
    rule: 'FIB-1',
    passed: true,
    severity: 'INFO',
    message: `Entry aligns with fib confluence zone at ${alignedZone.price} (${alignedZone.confluenceCount} levels, ${alignedZone.contextsPresent.join('+')}) — spiderweb quality: ${quality.label}`,
  evidence: `FIB-1 check passed: Entry aligns with fib confluence zone at ${alignedZone.price} (${alignedZone.confluenceCount} levels, ${alignedZone.contextsPresent.join('+')}) — spiderweb quality: ${quality.label}`,
  };
}

/**
 * FIB-2: Check multi-context fib confluence.
 *
 * Verifies that the setup references fib levels from at least 2 contexts
 * (MACRO, MESO, MICRO) to avoid single-timeframe fib bias.
 */
export function fib2MultiContextConfluence(ctx: RuleCheckContext): GuardrailResult {
  const levels = getFibLevels(ctx);

  if (levels.length === 0) {
    return {
      rule: 'FIB-2',
      passed: true,
      severity: 'INFO',
      message: 'No fib spiderweb data available — skipping multi-context check',
    evidence: 'FIB-2 check passed: No fib spiderweb data available — skipping multi-context check',
    };
  }

  const contextsPresent = [...new Set(levels.map((l: FibLevel) => l.context))];

  if (contextsPresent.length < MIN_SPIDERWEB_CONTEXTS) {
    return {
      rule: 'FIB-2',
      passed: false,
      severity: 'WARN',
      message: `Fib levels from only ${contextsPresent.length} context(s) (${contextsPresent.join(', ')}) — minimum ${MIN_SPIDERWEB_CONTEXTS} contexts recommended for spiderweb confluence`,
    evidence: `FIB-2 check failed: Fib levels from only ${contextsPresent.length} context(s) (${contextsPresent.join(', ')}) — minimum ${MIN_SPIDERWEB_CONTEXTS} contexts recommended for spiderweb confluence`,
    };
  }

  return {
    rule: 'FIB-2',
    passed: true,
    severity: 'INFO',
    message: `Fib levels from ${contextsPresent.length} contexts: ${contextsPresent.join(', ')}`,
  evidence: `FIB-2 check passed: Fib levels from ${contextsPresent.length} contexts: ${contextsPresent.join(', ')}`,
  };
}

/**
 * FIB-3: Check zone-fib alignment.
 *
 * Verifies that a fib confluence zone exists near the setup's zone boundary.
 * This is the strongest signal — zone + fib confluence from multiple contexts.
 */
export function fib3ZoneFibAlignment(ctx: RuleCheckContext): GuardrailResult {
  const levels = getFibLevels(ctx);

  if (levels.length === 0 || !ctx.zone) {
    return {
      rule: 'FIB-3',
      passed: true,
      severity: 'INFO',
      message: 'No fib data or zone available — skipping zone-fib alignment check',
    evidence: 'FIB-3 check passed: No fib data or zone available — skipping zone-fib alignment check',
    };
  }

  const zones = findConfluenceZones(levels, ctx.setup.pair);

  if (zones.length === 0) {
    return {
      rule: 'FIB-3',
      passed: false,
      severity: 'WARN',
      message: `No fib confluence zones to align with zone ${ctx.zone.id}`,
    evidence: `FIB-3 check failed: No fib confluence zones to align with zone ${ctx.zone.id}`,
    };
  }

  // Check if any confluence zone is near the zone boundaries
  const pipValue = getPipValue(ctx.setup.pair);
  const zoneEdges = [ctx.zone.floor, ctx.zone.ceiling];

  const alignments = zones.filter((fz: FibConfluenceZone) =>
    zoneEdges.some((ze: number) => Math.abs(fz.price - ze) / pipValue <= FIB_CLUSTER_RADIUS_PIPS),
  );

  if (alignments.length === 0) {
    return {
      rule: 'FIB-3',
      passed: false,
      severity: 'WARN',
      message: `No fib confluence zone aligns with zone ${ctx.zone.id} (floor ${ctx.zone.floor}, ceiling ${ctx.zone.ceiling}) — zone lacks fib spiderweb confirmation`,
    evidence: `FIB-3 check failed: No fib confluence zone aligns with zone ${ctx.zone.id} (floor ${ctx.zone.floor}, ceiling ${ctx.zone.ceiling}) — zone lacks fib spiderweb confirmation`,
    };
  }

  const bestAlignment = alignments[0];
  if (!bestAlignment) {
    return {
      rule: 'FIB-3',
      passed: true,
      severity: 'INFO',
      message: 'Zone-fib alignment check inconclusive',
    evidence: 'FIB-3 check passed: Zone-fib alignment check inconclusive',
    };
  }

  return {
    rule: 'FIB-3',
    passed: true,
    severity: 'INFO',
    message: `Zone ${ctx.zone.id} aligns with fib confluence zone at ${bestAlignment.price} (${bestAlignment.confluenceCount} levels, ${bestAlignment.contextsPresent.join('+')})`,
  evidence: `FIB-3 check passed: Zone ${ctx.zone.id} aligns with fib confluence zone at ${bestAlignment.price} (${bestAlignment.confluenceCount} levels, ${bestAlignment.contextsPresent.join('+')})`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// META-CHECK: run all fib spiderweb rules
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all 3 fib spiderweb rules against the context.
 * Returns an array of GuardrailResult, one per rule.
 */
export function checkFibSpiderweb(ctx: RuleCheckContext): GuardrailResult[] {
  return [
    fib1EntryAlignsWithConfluence(ctx),
    fib2MultiContextConfluence(ctx),
    fib3ZoneFibAlignment(ctx),
  ];
}
