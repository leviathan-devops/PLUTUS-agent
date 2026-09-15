/**
 * MDVE Util — deterministic shared primitives.
 *
 * ═══════════════════════════════════════════════════════════════
 * Every function here is a pure total function of its inputs.
 * No wall-clock, no randomness, no locale-dependent formatting
 * (§12 Determinism Law 2: same bars → byte-identical model).
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import type { SessionLabel } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TIME PRIMITIVES (deterministic — derived from candle timestamps ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/**
 * Session of a candle timestamp — the §8.4 dedup-key component.
 * UTC-hour bucketing:
 *   TOKYO  00-07 UTC, LONDON 07-13 UTC, NY 13-21 UTC, OFF 21-24 UTC.
 * BECAUSE: the operator's sessions are Tokyo/London/NY (§8.4.1
 * sessionOf); fixed UTC boundaries are the deterministic canonical form —
 * no exchange-calendar lookups, no wall-clock, no DST.
 */
export function sessionOf(ms: number): SessionLabel {
  const hour = new Date(ms).getUTCHours();
  if (hour < 7) return 'TOKYO';
  if (hour < 13) return 'LONDON';
  if (hour < 21) return 'NY';
  return 'OFF';
}

/**
 * ISO-8601 week key (e.g. '2026-W28') — the LQZ matrix's time axis
 * (§6.2: M[bucket][isoWeek] = touchEvents).
 *
 * Computed algorithmically from the timestamp (UTC): week 1 is the week
 * containing the year's first Thursday. Total + deterministic — no Intl
 * locale lookups (locale output is environment-dependent → forbidden).
 */
export function isoWeekKey(ms: number): string {
  const date = new Date(ms);
  // Shift to the Thursday of the current week (ISO week belongs to its Thursday).
  const day = date.getUTCDay() === 0 ? 7 : date.getUTCDay(); // Mon=1..Sun=7
  const thursday = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + (4 - day),
  ));
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / MS_PER_DAY / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAR PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

/** Decompose a bar into body / wick anatomy (mirrors lqz-lobe barAnatomy). */
export function barAnatomy(bar: OHLCBar): {
  bodyTop: number;
  bodyBottom: number;
  bodySize: number;
  upperWick: number;
  lowerWick: number;
} {
  const bodyTop = Math.max(bar.open, bar.close);
  const bodyBottom = Math.min(bar.open, bar.close);
  return {
    bodyTop,
    bodyBottom,
    bodySize: bodyTop - bodyBottom,
    upperWick: bar.high - bodyTop,
    lowerWick: bodyBottom - bar.low,
  };
}

/**
 * Simple average true range over the last `period` bars — replicates
 * lqz-lobe.ts computeAtr EXACTLY (cited, not imported: that helper is not
 * exported and the canon lobes must not be modified — the ladder-scaffold
 * CANON REPLICAS precedent).
 */
export function computeAtr(bars: OHLCBar[], period: number): number {
  if (bars.length < 2) return 0;
  const start = Math.max(1, bars.length - period);
  let sum = 0;
  let count = 0;
  for (let i = start; i < bars.length; i++) {
    const cur = bars[i]!;
    const prev = bars[i - 1]!;
    sum += Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
    count++;
  }
  return count > 0 ? sum / count : 0;
}

/** Price decimals for ids/logging: DXY prints 3 decimals, FX prints 5. */
export function priceDecimals(pair: string): number {
  return pair === 'DXY' ? 3 : 5;
}
