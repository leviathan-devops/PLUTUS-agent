/**
 * EconomicCalendarClient — Weekly economic calendar (red-folder detection).
 *
 * Fetches the forex factory weekly calendar from nfs.faireconomy.media.
 * Identifies "red folder" events (FOMC, NFP, CPI, GDP, PMI) and exposes
 * whether any HIGH-impact USD event is currently active within a ±30 min
 * window. Red folders suppress trading per the Plutus guardrails.
 *
 * No auth required. Response is a JSON array. Cached for 5 minutes.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('EconomicCalendarClient');

const CALENDAR_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json';

// Keywords that mark an event as a "red folder" (trade-suppressing).
const RED_FOLDER_KEYWORDS = ['FOMC', 'NFP', 'CPI', 'GDP', 'PMI'] as const;

// ±30 minute active window (ms).
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

export interface CalendarEvent {
  title: string;
  country: string;
  date: string;          // ISO 8601
  impact: 'low' | 'medium' | 'high';
  forecast?: string;
  previous?: string;
}

interface CalendarApiResponseItem {
  title?: unknown;
  country?: unknown;
  date?: unknown;
  impact?: unknown;
  forecast?: unknown;
  previous?: unknown;
}

// ── Impact classification ──────────────────────────────────────────
// The nfs.faireconomy.media feed returns `impact` as Title-case strings
// ("High", "Medium", "Low", "Holiday"). A case-sensitive comparison
// silently degrades every event to 'low', which is the bug that marked
// all 110+ events (incl. NFP, CPI, FOMC) as LOW in the report.

/** Keywords that ALWAYS mark an event as HIGH-impact (trade-suppressing). */
const HIGH_KEYWORDS = [
  'non-farm', 'nfp', 'cpi', 'core cpi', 'pce', 'core pce',
  'gdp', 'ism manufacturing', 'ism services', 'fomc', 'rate decision',
  'interest rate', 'federal reserve', 'ecb rate', 'boe rate',
  'unemployment rate', 'retail sales', 'ppi', 'chair powell',
  'fed chair', 'press conference', 'monetary policy statement',
] as const;

/** Keywords that mark an event as MEDIUM-impact. */
const MEDIUM_KEYWORDS = [
  'pmi', 'consumer confidence', 'durable goods', 'housing starts',
  'industrial production', 'trade balance', 'current account',
  'unemployment claims', 'jolts',
] as const;

/**
 * Case-insensitive normaliser for the source `impact` field. The feed
 * uses Title-case, so strict `=== 'high'` checks were failing on every
 * item and defaulting to 'low'.
 */
export function normalizeImpact(value: unknown): 'low' | 'medium' | 'high' {
  const v = typeof value === 'string' ? value.toLowerCase() : '';
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  return 'low';
}

/**
 * Authoritative impact classifier. Keyword matches take priority over the
 * source-supplied impact so that known red-folder events (NFP, CPI, FOMC,
 * PCE, ISM PMI, ...) are never mislabelled by upstream data quirks or
 * casing. Everything else falls back to the (now case-insensitive) source
 * impact. HIGH keywords are evaluated before MEDIUM, which is evaluated
 * before the source fallback.
 */
export function classifyImpact(
  title: string,
  sourceImpact?: unknown,
): 'low' | 'medium' | 'high' {
  const t = (title ?? '').toLowerCase();

  for (const kw of HIGH_KEYWORDS) {
    if (t.includes(kw)) return 'high';
  }
  for (const kw of MEDIUM_KEYWORDS) {
    if (t.includes(kw)) return 'medium';
  }
  return normalizeImpact(sourceImpact);
}

export class EconomicCalendarClient {
  private events: CalendarEvent[] = [];
  private lastFetch = 0;
  private readonly fetchIntervalMs = 300_000;

  constructor(private readonly evidence: EvidenceDB | null = null) {}

  /**
   * Refresh the cached calendar if stale. Returns the parsed events.
   * Public callers use this to keep data fresh before querying.
   */
  async refreshCalendar(): Promise<Result<CalendarEvent[]>> {
    // Serve from cache if fresh.
    if (this.lastFetch !== 0 && Date.now() - this.lastFetch < this.fetchIntervalMs) {
      return { success: true, data: this.events };
    }

    try {
      this.events = await this.fetchCalendar();
      this.lastFetch = Date.now();
      this.recordEvidence('calendar_refreshed', { count: this.events.length });
      log.info(`Refreshed economic calendar (${this.events.length} events)`);
      return { success: true, data: this.events };
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`Failed to refresh economic calendar: ${msg}`);
      this.recordEvidence('calendar_refresh_failed', { error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * True if any HIGH-impact USD red-folder event is currently within the
   * ±30 min active window. Callers gate trade execution on this.
   */
  isRedFolderActive(): boolean {
    return this.getActiveRedFolders().length > 0;
  }

  /**
   * Red-folder events occurring within `minutesAhead` from now.
   * Defaults to the rest of the current trading day (1440 min).
   */
  getUpcomingRedFolders(minutesAhead: number = 1440): CalendarEvent[] {
    const now = Date.now();
    const horizonMs = minutesAhead * 60 * 1000;
    return this.events.filter((ev: CalendarEvent) => {
      if (!this.isRedFolder(ev)) return false;
      const t = Date.parse(ev.date);
      if (Number.isNaN(t)) return false;
      return t >= now && t <= now + horizonMs;
    });
  }

  /**
   * Red-folder events currently inside the ±30 min window around now.
   */
  getActiveRedFolders(): CalendarEvent[] {
    const now = Date.now();
    return this.events.filter((ev: CalendarEvent) => {
      if (!this.isRedFolder(ev)) return false;
      const t = Date.parse(ev.date);
      if (Number.isNaN(t)) return false;
      return Math.abs(now - t) <= ACTIVE_WINDOW_MS;
    });
  }

  /**
   * Returns the cached events (no network). Call refreshCalendar() first.
   */
  getEvents(): CalendarEvent[] {
    return this.events;
  }

  // ── Internals ──────────────────────────────────────────────────

  private isRedFolder(ev: CalendarEvent): boolean {
    if (ev.country !== 'USD') return false;
    if (ev.impact !== 'high') return false;
    const upper = ev.title.toUpperCase();
    return RED_FOLDER_KEYWORDS.some((kw: string) => upper.includes(kw));
  }

  private async fetchCalendar(): Promise<CalendarEvent[]> {
    const res = await fetch(CALENDAR_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Plutus/1.0.0)' },
    });
    if (!res.ok) {
      throw new Error(`Calendar HTTP ${res.status}`);
    }

    const raw = await res.json() as unknown;
    if (!Array.isArray(raw)) {
      throw new Error('Calendar response is not a JSON array');
    }

    const events: CalendarEvent[] = [];
    for (const item of raw as CalendarApiResponseItem[]) {
      const title = typeof item.title === 'string' ? item.title : '';
      const country = typeof item.country === 'string' ? item.country : '';
      const date = typeof item.date === 'string' ? item.date : '';
      const impact = classifyImpact(title, item.impact);
      if (!title || !date) continue;
      events.push({
        title,
        country,
        date,
        impact,
        forecast: typeof item.forecast === 'string' ? item.forecast : undefined,
        previous: typeof item.previous === 'string' ? item.previous : undefined,
      });
    }
    return events;
  }

  private recordEvidence(action: string, payload: Record<string, unknown>): void {
    if (this.evidence === null) return;
    try {
      this.evidence.recordEvidence('macro', action, payload);
    } catch (e) {
      log.warn(`Evidence write failed (${action}): ${(e as Error).message}`);
    }
  }
}
