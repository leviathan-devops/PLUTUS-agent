/**
 * Market Hours Engine — Session detection, holidays, market open/close.
 * Per TTE v5.3.3 Section 8: Session-Specific Rules.
 */

export type TradingSession = 'london' | 'ny' | 'tokyo' | 'off';

export interface SessionInfo {
  session: TradingSession;
  isMarketOpen: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  spreadPips: number;
}

// US Federal Holidays 2026 (forex market closed)
const US_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents Day
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-10-12', // Columbus Day
  '2026-11-11', // Veterans Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
];

// UK Bank Holidays 2026
const UK_HOLIDAYS_2026 = [
  '2026-01-01', // New Year
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday
  '2026-05-04', // Early May
  '2026-05-25', // Spring
  '2026-08-31', // Summer
  '2026-12-25', // Christmas
  '2026-12-28', // Boxing Day (observed)
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isWeekend(d: Date = new Date()): boolean {
  const day = d.getUTCDay();
  const hour = d.getUTCHours();
  // Saturday (6) is fully closed.
  if (day === 6) return true;
  // Sunday (0) closed until ~22:00 UTC (Wellington/Sydney open).
  if (day === 0) return hour < 22;
  // Friday (5) closed after ~22:00 UTC (NY close ~17:00 ET = 22:00 UTC).
  if (day === 5) return hour >= 22;
  return false;
}

export function isHoliday(d: Date = new Date()): boolean {
  const dateStr = toDateStr(d);
  return US_HOLIDAYS_2026.includes(dateStr) || UK_HOLIDAYS_2026.includes(dateStr);
}

export function isMarketOpen(d: Date = new Date()): boolean {
  if (isWeekend(d)) return false;
  if (isHoliday(d)) return false;
  return true;
}

export function getCurrentSession(d: Date = new Date()): TradingSession {
  if (!isMarketOpen(d)) return 'off';
  const hourUTC = d.getUTCHours();
  // Tokyo: 23:00-08:00 UTC (approx)
  if (hourUTC >= 23 || hourUTC < 8) return 'tokyo';
  // London: 08:00-16:00 UTC (approx)
  if (hourUTC >= 8 && hourUTC < 13) return 'london';
  // London/NY overlap: 13:00-17:00 UTC
  // NY: 13:00-22:00 UTC (approx)
  if (hourUTC >= 13 && hourUTC < 22) return 'ny';
  return 'off';
}

export function getSpreadPips(d: Date = new Date()): number {
  const session = getCurrentSession(d);
  // Session-specific spreads: Tokyo=2, London=2, NY=3, Off=3.
  const SESSION_SPREAD: Record<TradingSession, number> = {
    tokyo: 2.0,
    london: 2.0,
    ny: 3.0,
    off: 3.0,
  };
  return SESSION_SPREAD[session];
}

export function getSessionInfo(d: Date = new Date()): SessionInfo {
  return {
    session: getCurrentSession(d),
    isMarketOpen: isMarketOpen(d),
    isWeekend: isWeekend(d),
    isHoliday: isHoliday(d),
    spreadPips: getSpreadPips(d),
  };
}
