/**
 * Extreme Magnet Lobe — Step 0.5: Repeated Extreme Magnet Detection.
 *
 * TTE v5.3.3 Step 0.5 (MANDATORY — runs after Step 0):
 *
 * Institutional algorithms scan for price levels where stops have clustered
 * from prior touches. When the exact same price level has been reached on
 * multiple separate dates, it becomes a magnet for future price action.
 *
 * Algorithm:
 *   0.5a. Scan bars for swing highs/lows within lookback.
 *         Group by proximity (±0.05% tolerance).
 *         Detect role reversal (swing low that was previously a swing high, or vice versa).
 *   0.5b. Tag each repeated level with exact price (wick-weighted average),
 *         dates, type (Repeated Low / High / Role Reversal), occurrence count.
 *   0.5c. Confidence escalation:
 *         - 2 dates  → +1.5 Structural Extreme Bonus
 *         - 3+ dates → +2.0 Structural Extreme Bonus
 *         - Role Reversal → additional +1.0
 *   0.5d. If magnet falls inside an HTF Order Block, tag as "Institutional Magnet".
 *
 * These magnets feed into Pillar 5 as bonus price levels.
 */

import { OHLCBar, DXYZone, PriceLevel } from '../types.js';
import { Logger } from '../utils/logger.js';
import {
  P5_MAX_LOOKBACK,
  P5_MIN_LOOKBACK,
  SWING_BOUNDARY_OFFSET,
  SWING_CONFIRMATION_BARS,
  P5_EXTREME_CONFIDENCE,
} from '../constants/trading-constants.js';

const log = new Logger('ExtremeMagnetLobe');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** A swing point detected during Step 0.5a scanning. */
interface SwingPoint {
  price: number;
  timestamp: number;
  role: 'high' | 'low';
  /** Wick distance from the candle body — used for weighted averaging */
  wickSize: number;
}

/**
 * Step 0.5: A price level that appeared as a swing extreme on 2+ separate dates.
 * These levels become magnets for future institutional stop hunts.
 */
export interface ExtremeMagnet {
  /** Wick-weighted average price across all occurrences */
  price: number;
  /** Number of separate dates this level was touched as an extreme */
  occurrences: number;
  /** Timestamps (unix ms) of each occurrence */
  dates: number[];
  /** Current role: 'resistance' if most recent touch was a swing high, 'support' if swing low */
  currentRole: 'support' | 'resistance';
  /** All roles across occurrences, in chronological order */
  priorRoles: ('support' | 'resistance')[];
  /** True if the level has been both a swing high and a swing low (role reversal) */
  roleReversed: boolean;
  /** Structural Extreme Bonus: +1.5 (2x), +2.0 (3+x), +1.0 additional for role reversal */
  bonusScore: number;
  /** True if this magnet falls inside an HTF Order Block (Step 0.5d — Institutional Magnet) */
  isInstitutional: boolean;
  /** Human-readable type label */
  typeLabel: 'Repeated Low Magnet' | 'Repeated High Magnet' | 'Role Reversal Magnet';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** ±0.05% tolerance for matching swing extremes to the same magnet level */
const MAGNET_MATCH_TOLERANCE_PCT = 0.0005; // 0.05%

/** Default lookback: 90 calendar days */
const DEFAULT_LOOKBACK_DAYS = 90;

/** Confidence escalation per Step 0.5c */
const BONUS_2_OCCURRENCES = 1.5;
const BONUS_3_PLUS_OCCURRENCES = 2.0;
const BONUS_ROLE_REVERSAL = 1.0; // additional

/** Ms per day for lookback filtering */
const MS_PER_DAY = 86_400_000;

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Step 0.5: Detect Repeated Extreme Magnets from swing high/low data.
 *
 * Scans OHLC bars for swing highs and lows within the lookback period,
 * groups them by proximity (±0.05% tolerance), and for any level with
 * 2+ occurrences, creates an ExtremeMagnet with confidence escalation.
 *
 * @param zones  HTF order blocks for Step 0.5d institutional magnet tagging.
 *               Pass [] if order blocks are not yet available.
 * @param bars   OHLC bars (typically 4H) for swing detection.
 * @param lookbackDays  Calendar days to look back (default 90).
 * @returns Array of ExtremeMagnet, sorted by bonusScore descending.
 */
export function detectRepeatedExtremes(
  zones: DXYZone[],
  bars: OHLCBar[],
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
): ExtremeMagnet[] {
  const lookback = Math.min(bars.length, P5_MAX_LOOKBACK);
  if (lookback < P5_MIN_LOOKBACK) {
    log.debug('Insufficient bars for extreme magnet detection', { bars: lookback, min: P5_MIN_LOOKBACK });
    return [];
  }

  // ── Step 0.5a: Scan for swing highs/lows ──
  const cutoff = Date.now() - lookbackDays * MS_PER_DAY;
  const swingPoints: SwingPoint[] = [];

  for (let i = SWING_BOUNDARY_OFFSET; i < lookback - SWING_BOUNDARY_OFFSET; i++) {
    const bar = bars[i]!;
    const prevBar = bars[i - 1]!;
    const nextBar = bars[i + 1]!;

    // Skip bars outside lookback window
    if (bar.timestamp < cutoff) continue;

    // Swing high: higher than immediate neighbors AND confirmation bars
    if (
      bar.high > prevBar.high &&
      bar.high > nextBar.high &&
      i >= SWING_CONFIRMATION_BARS &&
      i < lookback - SWING_CONFIRMATION_BARS &&
      bar.high > bars[i - SWING_CONFIRMATION_BARS]!.high &&
      bar.high > bars[i + SWING_CONFIRMATION_BARS]!.high
    ) {
      swingPoints.push({
        price: bar.high,
        timestamp: bar.timestamp,
        role: 'high',
        wickSize: bar.high - Math.max(bar.open, bar.close),
      });
    }

    // Swing low: lower than immediate neighbors AND confirmation bars
    if (
      bar.low < prevBar.low &&
      bar.low < nextBar.low &&
      i >= SWING_CONFIRMATION_BARS &&
      i < lookback - SWING_CONFIRMATION_BARS &&
      bar.low < bars[i - SWING_CONFIRMATION_BARS]!.low &&
      bar.low < bars[i + SWING_CONFIRMATION_BARS]!.low
    ) {
      swingPoints.push({
        price: bar.low,
        timestamp: bar.timestamp,
        role: 'low',
        wickSize: Math.min(bar.open, bar.close) - bar.low,
      });
    }
  }

  if (swingPoints.length < 2) {
    log.debug('Fewer than 2 swing points detected — no magnets possible', { count: swingPoints.length });
    return [];
  }

  // ── Step 0.5a (cont): Group by proximity (±0.05% tolerance) ──
  const groups = groupSwingPointsByProximity(swingPoints);

  // ── Step 0.5b/c/d: Create magnets from groups with ≥2 occurrences ──
  const magnets: ExtremeMagnet[] = [];

  for (const group of groups) {
    if (group.length < 2) continue;

    // Sort by timestamp (chronological order)
    group.sort((a: SwingPoint, b: SwingPoint) => a.timestamp - b.timestamp);

    // Build roles array
    const roles: ('support' | 'resistance')[] = group.map(
      (sp: SwingPoint) => (sp.role === 'low' ? 'support' : 'resistance'),
    );

    // Current role = most recent occurrence
    const currentRole = roles[roles.length - 1]!;

    // Role reversal: any role differs from another (both high and low present)
    const roleReversed = new Set(roles).size > 1;

    // Wick-weighted average price (Step 0.5b: "weighted by wick size")
    const totalWick = group.reduce((sum: number, sp: SwingPoint) => sum + Math.max(sp.wickSize, 0.0001), 0);
    const weightedPrice =
      group.reduce((sum: number, sp: SwingPoint) => sum + sp.price * Math.max(sp.wickSize, 0.0001), 0) / totalWick;

    // Bonus computation (Step 0.5c)
    let bonusScore: number;
    if (group.length >= 3) {
      bonusScore = BONUS_3_PLUS_OCCURRENCES;
    } else {
      bonusScore = BONUS_2_OCCURRENCES;
    }
    if (roleReversed) {
      bonusScore += BONUS_ROLE_REVERSAL;
    }

    // Step 0.5d: Check if magnet falls inside an HTF Order Block
    const isInstitutional = zones.some(
      (z: DXYZone) => weightedPrice >= z.floor && weightedPrice <= z.ceiling,
    );

    // Type label
    let typeLabel: ExtremeMagnet['typeLabel'];
    if (roleReversed) {
      typeLabel = 'Role Reversal Magnet';
    } else if (currentRole === 'support') {
      typeLabel = 'Repeated Low Magnet';
    } else {
      typeLabel = 'Repeated High Magnet';
    }

    magnets.push({
      price: weightedPrice,
      occurrences: group.length,
      dates: group.map((sp: SwingPoint) => sp.timestamp),
      currentRole,
      priorRoles: roles.slice(0, -1), // all roles except the current one
      roleReversed,
      bonusScore,
      isInstitutional,
      typeLabel,
    });
  }

  // Sort by bonusScore descending (strongest magnets first)
  magnets.sort((a: ExtremeMagnet, b: ExtremeMagnet) => b.bonusScore - a.bonusScore);

  log.debug('Extreme magnets detected', {
    swingPoints: swingPoints.length,
    magnets: magnets.length,
    topBonus: magnets[0]?.bonusScore ?? 0,
  });

  return magnets;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSION: ExtremeMagnet → PriceLevel (for P5 pillar integration)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert ExtremeMagnet[] to PriceLevel[] for integration into Pillar 5 output.
 *
 * Each magnet becomes a PriceLevel with:
 *   - price: the magnet's weighted price
 *   - source: descriptive label including occurrence count and role reversal
 *   - confidence: escalated based on bonusScore (2x = HIGH, 3+x/RR = VERY HIGH)
 *
 * @param magnets  The detected extreme magnets.
 * @returns PriceLevel[] suitable for merging into p5.levels.
 */
export function magnetsToPriceLevels(magnets: ExtremeMagnet[]): PriceLevel[] {
  return magnets.map((m: ExtremeMagnet) => {
    const sourceParts: string[] = [
      `P5-ExtremeMagnet(${m.occurrences}x`,
    ];
    if (m.roleReversed) sourceParts.push('RR');
    if (m.isInstitutional) sourceParts.push('INST');
    sourceParts.push(m.typeLabel);

    return {
      price: m.price,
      source: `${sourceParts.join(' ')})`,
      confidence: m.bonusScore >= BONUS_3_PLUS_OCCURRENCES
        ? P5_EXTREME_CONFIDENCE // VERY HIGH for 3+ or role reversal
        : P5_EXTREME_CONFIDENCE * 0.85, // HIGH for 2x
    };
  });
}

/**
 * Compute the maximum structural extreme bonus from a set of magnets.
 *
 * Per spec Step 0.5c and the scoring table:
 *   - 2 dates  → +1.5
 *   - 3+ dates or Role Reversal → +2.0
 *   - Institutional Magnet → +2.0
 *
 * The maximum structural extreme bonus is capped at +2.0.
 *
 * @param magnets  The detected extreme magnets.
 * @returns The highest bonus value (capped at 2.0), or 0 if no magnets.
 */
export function maxMagnetBonus(magnets: ExtremeMagnet[]): number {
  if (magnets.length === 0) return 0;

  const maxRaw = Math.max(...magnets.map((m: ExtremeMagnet) => m.bonusScore));

  // Per spec: max structural extreme bonus from magnets is +2.0
  // (3+ dates or role reversal already = +2.0; the +1.0 role reversal add
  //  is captured in bonusScore but the structural extreme bonus is capped)
  return Math.min(maxRaw, 2.0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Proximity Grouping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Group swing points by price proximity using ±0.05% tolerance.
 *
 * Two swing points belong to the same group if their prices are within
 * MAGNET_MATCH_TOLERANCE_PCT (0.05%) of each other.
 *
 * Uses a greedy clustering approach: sort by price, then merge adjacent
 * points that fall within the tolerance band.
 *
 * @returns Array of groups, each group is an array of SwingPoint.
 */
function groupSwingPointsByProximity(points: SwingPoint[]): SwingPoint[][] {
  if (points.length === 0) return [];

  // Sort by price ascending
  const sorted = [...points].sort((a: SwingPoint, b: SwingPoint) => a.price - b.price);

  const groups: SwingPoint[][] = [];
  let currentGroup: SwingPoint[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;

    // Tolerance: within 0.05% of the previous point's price
    const tolerance = prev.price * MAGNET_MATCH_TOLERANCE_PCT;

    if (Math.abs(curr.price - prev.price) <= tolerance) {
      currentGroup.push(curr);
    } else {
      groups.push(currentGroup);
      currentGroup = [curr];
    }
  }
  groups.push(currentGroup);

  return groups;
}
