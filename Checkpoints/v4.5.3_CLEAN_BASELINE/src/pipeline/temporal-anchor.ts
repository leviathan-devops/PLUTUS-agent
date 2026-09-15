/**
 * PLUTUS 4.0 Pipeline — Dynamic Temporal Anchoring (BS-5, T18)
 *
 * The temporal anchor is the single source of truth for "today" inside
 * the pipeline. Every dynamic date link, every OHLC row, every macro
 * calendar entry is gated against it. The anchor is computed ONCE at
 * orchestrator boot and frozen — there is no API to mutate it after
 * construction.
 *
 * INTEGRATION: NEW FILE src/pipeline/temporal-anchor.ts
 * Source: L2 Spec Section 6.2
 */

import { TemporalAnchorViolation } from './errors.js';

/**
 * WEEKDAY_MONDAY = 1 BECAUSE ISO 8601 defines Monday as day 1 of the week.
 * JavaScript Date.getDay() returns 0 for Sunday, so the offset arithmetic
 * must use the ISO convention to remain consistent with TradingView's
 * date axis and investinglive.com's weekly archives.
 */
export const WEEKDAY_MONDAY = 1;

/**
 * FRIDAY_OFFSET_DAYS = 4 BECAUSE the anchor is Friday 17:00 ET (NY close)
 * which is the canonical end of the forex trading week. weekStart is
 * Monday 00:00 ET; adding 4 days plus 17 hours lands on Friday close.
 * Using Tuesday (offset 1) would force the agent to look at charts that
 * have not yet formed the weekly high/low — TTE reports require full-week
 * context. Using Sunday (offset 6) would leak into the next week's gap.
 */
export const FRIDAY_OFFSET_DAYS = 4;

/**
 * NY_CLOSE_HOUR_ET = 17 BECAUSE the New York forex session close is
 * 17:00 ET (21:00 UTC during DST, 22:00 UTC outside DST). This is the
 * TTE-defined "today" cutoff for backtesting.
 */
export const NY_CLOSE_HOUR_ET = 17;

export interface TemporalAnchor {
  weekStartIso: string;
  weekStartMs: number;
  fridayIso: string;
  anchorMs: number;
  /**
   * Friday date as YYYYMMDD (e.g. "20260710"). This is the Protocol A date
   * discriminator: investinglive.com expiry permalinks embed it verbatim
   * (fx-option-expiries-for-10-july-10am-new-york-cut-20260710).
   */
  fridayCompact: string;
  /** Pre-formatted slug for investinglive.com URL fragments. */
  fridayUrlSlug: string;
}

/**
 * buildTemporalAnchor BECAUSE dynamic date link construction must be the
 * ONLY path from weekStart to investinglive.com URLs. Hardcoding any
 * date string anywhere else in the codebase reintroduces forward-cheating
 * (BS-5). The agent's Manual Step A receives `fridayUrlSlug` verbatim.
 *
 * @param weekStartIso ISO date "YYYY-MM-DD" — must be a Monday.
 * @throws Error if weekStartIso is not a Monday.
 */
export function buildTemporalAnchor(weekStartIso: string): TemporalAnchor {
  const ms = Date.parse(weekStartIso + 'T00:00:00Z');
  if (Number.isNaN(ms)) {
    throw new Error(`[TemporalAnchor] Invalid weekStartIso: ${weekStartIso}`);
  }
  const date = new Date(ms);
  const weekday = date.getUTCDay();
  if (weekday !== WEEKDAY_MONDAY) {
    throw new Error(
      `[TemporalAnchor] weekStartIso must be Monday; ${weekStartIso} is weekday ${weekday}.`,
    );
  }

  const anchorMs = ms + FRIDAY_OFFSET_DAYS * 86_400_000 + NY_CLOSE_HOUR_ET * 3_600_000;
  const fridayMs = ms + FRIDAY_OFFSET_DAYS * 86_400_000;
  const fridayIso = new Date(fridayMs).toISOString().slice(0, 10);
  // fridayUrlSlug format: "july-19-2026" — investinglive.com archives use
  // lowercase month-name + zero-stripped day. This format was confirmed
  // against the live site in the pre-build crawl.
  const fridayDate = new Date(fridayMs);
  const monthName = fridayDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase();
  const day = fridayDate.getUTCDate();
  const year = fridayDate.getUTCFullYear();
  const fridayUrlSlug = `${monthName}-${day}-${year}`;
  const fridayCompact = fridayIso.replaceAll('-', '');

  return {
    weekStartIso,
    weekStartMs: ms,
    fridayIso,
    anchorMs,
    fridayCompact,
    fridayUrlSlug,
  };
}

/**
 * assertNoFutureLeak BECAUSE the only proof of temporal integrity is a
 * hard check at the harvest boundary. Every OHLC bar is passed through
 * this function before being added to the context. A single bar above
 * the anchor invalidates the entire backtest (BS-5).
 *
 * @param bar.timestamp unix ms
 * @param anchor temporal anchor
 * @param pair pair label for error reporting
 * @throws TemporalAnchorViolation if bar.timestamp > anchor.anchorMs
 */
export function assertNoFutureLeak(
  bar: { timestamp: number },
  anchor: TemporalAnchor,
  pair: string,
): void {
  if (bar.timestamp > anchor.anchorMs) {
    throw new TemporalAnchorViolation(anchor.anchorMs, bar.timestamp, pair);
  }
}

/**
 * ALLOWED_FUTURE_SKEW_MS = 5000 BECAUSE some data providers round the
 * close timestamp to the nearest second while the anchor is in
 * millisecond precision. 5s covers rounding without creating a leak
 * window wide enough for a real bar to slip through (the smallest forex
 * bar is 1 minute = 60000ms).
 */
export const ALLOWED_FUTURE_SKEW_MS = 5000;
