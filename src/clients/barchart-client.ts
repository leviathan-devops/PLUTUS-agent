/**
 * Barchart Client — Fetches MA values from Barchart cheat sheets.
 *
 * Used by P2 (MA Confluence Grid) to cross-validate computed EMAs/SMAs
 * against published technical values.
 *
 * Zero-dependency: uses fetch() + regex parsing. No cheerio.
 * Cache: 1 hour TTL.
 *
 * Fallback: If Barchart blocks direct access (common — they use Cloudflare),
 * returns { success: false, error: 'Barchart blocked direct access' }
 * and the system falls back to locally computed EMAs.
 */

import type { Result } from '../types.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('BarchartClient');

// ── URL Mapping ──────────────────────────────────────────────────────────────

const BARCHART_URLS: Record<string, string> = {
  'DXY':     'https://www.barchart.com/stocks/quotes/%24DXY/cheat-sheet',
  'EUR/USD': 'https://www.barchart.com/forex/quotes/EURUSD/cheat-sheet',
  'GBP/USD': 'https://www.barchart.com/forex/quotes/GBPUSD/cheat-sheet',
  'AUD/USD': 'https://www.barchart.com/forex/quotes/AUDUSD/cheat-sheet',
};

const ALL_INSTRUMENTS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

// ── Types ────────────────────────────────────────────────────────────────────

export interface BarchartMAData {
  instrument: string;
  ema9: number; ema20: number; ema50: number; ema100: number; ema200: number;
  sma9: number; sma20: number; sma50: number; sma100: number; sma200: number;
  pivotPoint: number;
  r1: number; s1: number;
  timestamp: number;
}

interface CacheEntry {
  data: BarchartMAData;
  fetchedAt: number;
}

// ── HTML Parsing Helpers ─────────────────────────────────────────────────────

/**
 * Extract the first numeric value found after a label match in raw HTML.
 * Strips HTML tags from the post-label region before number extraction.
 * Returns null if no number is found.
 */
function extractValueNearLabel(html: string, labelRegex: RegExp, windowChars = 400): number | null {
  const match = html.match(labelRegex);
  if (!match || match.index === undefined) return null;

  const startPos = match.index + match[0].length;
  const region = html.slice(startPos, startPos + windowChars);
  const textOnly = region
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();

  const numMatch = textOnly.match(/-?\d{1,6}(?:\.\d{1,6})?/);
  if (!numMatch) return null;

  const value = parseFloat(numMatch[0]);
  return Number.isFinite(value) ? value : null;
}

/** Build a regex for an EMA label with a specific period. Matches common formats. */
function emaLabel(period: number): RegExp {
  return new RegExp(
    `(?:exponential[\\s\\-]*(?:moving[\\s\\-]*)?(?:average|avg)?|ema)[\\s\\S]{0,20}?\\b${period}\\b`,
    'i',
  );
}

/** Build a regex for an SMA label with a specific period. */
function smaLabel(period: number): RegExp {
  return new RegExp(
    `(?:simple[\\s\\-]*(?:moving[\\s\\-]*)?(?:average|avg)?|sma)[\\s\\S]{0,20}?\\b${period}\\b`,
    'i',
  );
}

// ── Client ───────────────────────────────────────────────────────────────────

export class BarchartClient {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTtlMs = 3_600_000; // 1 hour

  /**
   * Fetch cheat-sheet MA data for a single instrument.
   * Returns cached data if fresh (< 1 hour old).
   */
  async fetchCheatSheet(instrument: string): Promise<Result<BarchartMAData>> {
    const url = BARCHART_URLS[instrument];
    if (!url) {
      return { success: false, error: `Unknown instrument: ${instrument}` };
    }

    // Check cache
    const cached = this.cache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      log.debug(`Cache hit for ${instrument}`);
      return { success: true, data: cached.data };
    }

    log.info(`Fetching Barchart cheat sheet for ${instrument}`);

    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (res.status === 403 || res.status === 429) {
        log.warn(`Barchart blocked access for ${instrument} (HTTP ${res.status})`);
        return { success: false, error: 'Barchart blocked direct access' };
      }

      if (!res.ok) {
        log.warn(`Barchart HTTP ${res.status} for ${instrument}`);
        return { success: false, error: `Barchart HTTP ${res.status}` };
      }

      html = await res.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`Barchart fetch failed for ${instrument}:`, msg);
      return { success: false, error: `Fetch failed: ${msg}` };
    }

    // Check for Cloudflare / block challenge pages
    if (html.includes('cf-challenge') || html.includes('cf-browser-verification') || html.includes('Access denied')) {
      log.warn(`Barchart challenge page detected for ${instrument}`);
      return { success: false, error: 'Barchart blocked direct access' };
    }

    // Parse MA values
    const data = this.parseCheatSheet(html, instrument);
    if (!data) {
      return { success: false, error: `Failed to parse Barchart cheat sheet for ${instrument}` };
    }

    // Cache and return
    this.cache.set(instrument, { data, fetchedAt: Date.now() });
    log.info(`Parsed Barchart data for ${instrument} (EMA9=${data.ema9}, EMA50=${data.ema50})`);

    return { success: true, data };
  }

  /**
   * Get cached MA data for an instrument without triggering a network fetch.
   * Returns undefined if no cached data exists or cache has expired.
   */
  getCached(instrument: string): BarchartMAData | undefined {
    const cached = this.cache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.data;
    }
    return undefined;
  }

  /**
   * Refresh all instruments' cheat-sheet data in parallel.
   * Alias for getAllInstruments() — called by the background refresh cycle.
   */
  async refreshAll(): Promise<Result<BarchartMAData[]>> {
    return this.getAllInstruments();
  }

  /**
   * Fetch cheat-sheet data for all supported instruments.
   * Returns partial results if some instruments fail (with warnings logged).
   */
  async getAllInstruments(): Promise<Result<BarchartMAData[]>> {
    const results = await Promise.allSettled(
      ALL_INSTRUMENTS.map((inst) => this.fetchCheatSheet(inst)),
    );

    const data: BarchartMAData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const instrument = ALL_INSTRUMENTS[i];
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          data.push(result.value.data);
        } else {
          errors.push(`${instrument}: ${result.value.error}`);
        }
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : 'rejected';
        errors.push(`${instrument}: ${msg}`);
      }
    }

    if (data.length === 0) {
      return { success: false, error: `No data retrieved. Failures: ${errors.join('; ')}` };
    }

    if (errors.length > 0) {
      log.warn(`Partial Barchart fetch: ${data.length}/${ALL_INSTRUMENTS.length} succeeded. Errors: ${errors.join('; ')}`);
    }

    return { success: true, data };
  }

  /**
   * Parse HTML for EMA/SMA/Pivot values using regex-based extraction.
   * Returns null if no MA values could be extracted at all.
   */
  private parseCheatSheet(html: string, instrument: string): BarchartMAData | null {
    const ema9   = extractValueNearLabel(html, emaLabel(9))   ?? 0;
    const ema20  = extractValueNearLabel(html, emaLabel(20))  ?? 0;
    const ema50  = extractValueNearLabel(html, emaLabel(50))  ?? 0;
    const ema100 = extractValueNearLabel(html, emaLabel(100)) ?? 0;
    const ema200 = extractValueNearLabel(html, emaLabel(200)) ?? 0;

    const sma9   = extractValueNearLabel(html, smaLabel(9))   ?? 0;
    const sma20  = extractValueNearLabel(html, smaLabel(20))  ?? 0;
    const sma50  = extractValueNearLabel(html, smaLabel(50))  ?? 0;
    const sma100 = extractValueNearLabel(html, smaLabel(100)) ?? 0;
    const sma200 = extractValueNearLabel(html, smaLabel(200)) ?? 0;

    const pivotPoint = extractValueNearLabel(html, /pivot\s*(?:point)?/i) ?? 0;
    const r1 = extractValueNearLabel(html, /(?:resistance\s*)?\bR\s*1\b/i) ?? 0;
    const s1 = extractValueNearLabel(html, /(?:support\s*)?\bS\s*1\b/i)   ?? 0;

    // If no MA values found at all, consider parse failed
    const allMa = [ema9, ema20, ema50, ema100, ema200, sma9, sma20, sma50, sma100, sma200];
    if (allMa.every((v) => v === 0)) {
      log.warn(`No MA values found in Barchart HTML for ${instrument}`);
      return null;
    }

    return {
      instrument,
      ema9, ema20, ema50, ema100, ema200,
      sma9, sma20, sma50, sma100, sma200,
      pivotPoint,
      r1, s1,
      timestamp: Date.now(),
    };
  }
}
