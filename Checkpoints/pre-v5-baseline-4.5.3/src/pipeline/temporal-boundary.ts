/**
 * TemporalBoundary — Enforces option data is scoped to the target trading week.
 *
 * TTE v5.3.3 temporal rules:
 *   - Boundary date = Friday 17:00 ET of the week BEFORE the target week
 *   - Target week = Monday 00:00 ET through Friday 17:00 ET
 *   - Strikes with expiry outside [Monday, Friday] of target week -> EXCLUDED
 *   - Days with no expiries -> marked [NO_EXPIRIES] in audit trail
 *
 * ET timezone handling uses America/New_York via Intl.DateTimeFormat.
 *
 * FIX-003 / GAP-003 — CRITICAL. Depends on FIX-001, FIX-002.
 */

import type { OptionStrike } from '../clients/investinglive-client.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('TemporalBoundary');

// ── Types ──

export interface TemporalWindow {
  boundaryDate: string;      // ISO date of Friday 17:00 ET (snapshot time)
  weekStart: string;         // ISO date Monday 00:00 ET
  weekEnd: string;           // ISO date Friday 17:00 ET
  targetDays: string[];      // ['Monday', ..., 'Friday']
}

export interface DayAuditEntry {
  day: string;
  date: string;              // ISO date
  strikeCount: number;
  status: 'HAS_EXPIRIES' | 'NO_EXPIRIES';
  strikes: OptionStrike[];
}

export interface TemporalResult {
  window: TemporalWindow;
  inWindow: OptionStrike[];
  outOfWindow: OptionStrike[];
  perDayAudit: DayAuditEntry[];
}

// ── Engine ──

export class TemporalBoundary {

  /**
   * Compute the target trading week window.
   * If today is Monday-Friday of week N, the target week is week N
   * and the boundary is the Friday of week N-1.
   */
  computeWindow(referenceDate: Date = new Date()): TemporalWindow {
    const etNow = this.toEasternTime(referenceDate);
    const dayOfWeek = etNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekStart = new Date(etNow);
    weekStart.setDate(etNow.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday
    weekEnd.setHours(17, 0, 0, 0);            // 17:00 ET

    const boundaryDate = new Date(weekEnd);
    boundaryDate.setDate(weekEnd.getDate() - 7);

    const targetDays: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      targetDays.push(this.dayName(d.getDay()));
    }

    return {
      boundaryDate: this.toISOStringET(boundaryDate),
      weekStart: this.toISOStringET(weekStart),
      weekEnd: this.toISOStringET(weekEnd),
      targetDays,
    };
  }

  /**
   * Validate option strikes against the temporal window.
   * Returns in-window strikes, out-of-window strikes, and a per-day audit.
   */
  validate(strikes: OptionStrike[], window: TemporalWindow): TemporalResult {
    const weekStartMs = new Date(window.weekStart).getTime();
    const weekEndMs = new Date(window.weekEnd).getTime();

    const inWindow: OptionStrike[] = [];
    const outOfWindow: OptionStrike[] = [];

    for (const strike of strikes) {
      const expiryMs = new Date(strike.expiry + 'T00:00:00').getTime();
      if (isNaN(expiryMs)) {
        log.warn(`Strike ${strike.pair}@${strike.strike} has invalid expiry: ${strike.expiry}`);
        outOfWindow.push(strike);
        continue;
      }
      if (expiryMs >= weekStartMs && expiryMs <= weekEndMs + 86_400_000) {
        inWindow.push(strike);
      } else {
        outOfWindow.push(strike);
      }
    }

    // Build per-day audit (one entry per weekday, including [NO_EXPIRIES])
    const perDayAudit: DayAuditEntry[] = [];
    for (let i = 0; i < 5; i++) {
      const dayDate = new Date(window.weekStart);
      dayDate.setDate(new Date(window.weekStart).getDate() + i);
      const dayIso = this.toISOStringET(dayDate).slice(0, 10);
      const dayName = this.dayName(dayDate.getDay());

      const dayStrikes = inWindow.filter(s => s.expiry === dayIso);
      perDayAudit.push({
        day: dayName,
        date: dayIso,
        strikeCount: dayStrikes.length,
        status: dayStrikes.length > 0 ? 'HAS_EXPIRIES' : 'NO_EXPIRIES',
        strikes: dayStrikes,
      });
    }

    log.info(
      `TemporalBoundary: ${inWindow.length} in-window, ${outOfWindow.length} out-of-window. ` +
      `Per-day: ${perDayAudit.map(d => `${d.day}=${d.strikeCount > 0 ? d.strikeCount : '[NO_EXPIRIES]'}`).join(', ')}`
    );

    return { window, inWindow, outOfWindow, perDayAudit };
  }

  // ── Timezone helpers ──

  private toEasternTime(date: Date): Date {
    const etStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(date);
    const [datePart, timePart] = etStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hour, minute, second);
  }

  private toISOStringET(date: Date): string {
    const et = this.toEasternTime(date);
    return et.toISOString();
  }

  private dayName(dayOfWeek: number): string {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
  }
}
