/**
 * TradingView Technicals Client — Fetches EMA/SMA values from TV technicals page.
 *
 * Used by P2 (MA Confluence Grid) to cross-validate Barchart and computed values.
 *
 * Zero-dependency: uses fetch() + regex parsing. No cheerio.
 * Cache: 1 hour TTL.
 *
 * Fallback: If TV blocks direct access, returns error and the system
 * falls back to Barchart or computed EMAs.
 */

import type { Result } from '../types.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('TVTechnicalsClient');

// ── URL Mapping ──────────────────────────────────────────────────────────────

const TV_TECHNICALS_URLS: Record<string, string> = {
  'DXY':     'https://www.tradingview.com/symbols/TVC-DXY/technicals/',
  'EUR/USD': 'https://www.tradingview.com/symbols/EURUSD/technicals/',
  'GBP/USD': 'https://www.tradingview.com/symbols/GBPUSD/technicals/',
  'AUD/USD': 'https://www.tradingview.com/symbols/AUDUSD/technicals/',
};

const ALL_INSTRUMENTS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

const VALID_PERIODS: readonly number[] = [9, 20, 50, 100, 200];

// ── Types ────────────────────────────────────────────────────────────────────

export interface TVTechnicalsData {
  instrument: string;
  ema: Record<string, number>;   // { '9': 1.0850, '20': 1.0830, ... }
  sma: Record<string, number>;   // Same format
  summary: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  timestamp: number;
}

interface CacheEntry {
  data: TVTechnicalsData;
  fetchedAt: number;
}

// ── HTML Parsing Helpers ─────────────────────────────────────────────────────

/**
 * Extract the first numeric value found after a label match in raw HTML.
 * Strips HTML tags from the post-label region before number extraction.
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

/** Build a regex for an EMA label with a specific period. */
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

/** Extract the overall technical summary from the page. */
function extractSummary(html: string): TVTechnicalsData['summary'] {
  const text = html.replace(/<[^>]*>/g, ' ');
  if (/strong\s*buy/i.test(text)) return 'Strong Buy';
  if (/strong\s*sell/i.test(text)) return 'Strong Sell';
  if (/\bbuy\b/i.test(text)) return 'Buy';
  if (/\bsell\b/i.test(text)) return 'Sell';
  return 'Neutral';
}

// ── Client ───────────────────────────────────────────────────────────────────

export class TradingViewTechnicalsClient {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTtlMs = 3_600_000; // 1 hour

  /**
   * Fetch technicals data for a single instrument.
   * Returns cached data if fresh (< 1 hour old).
   */
  async fetchTechnicals(instrument: string): Promise<Result<TVTechnicalsData>> {
    const url = TV_TECHNICALS_URLS[instrument];
    if (!url) {
      return { success: false, error: `Unknown instrument: ${instrument}` };
    }

    // Check cache
    const cached = this.cache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      log.debug(`Cache hit for ${instrument}`);
      return { success: true, data: cached.data };
    }

    log.info(`Fetching TradingView technicals for ${instrument}`);

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
        log.warn(`TradingView blocked access for ${instrument} (HTTP ${res.status})`);
        return { success: false, error: 'TradingView blocked direct access' };
      }

      if (!res.ok) {
        log.warn(`TradingView HTTP ${res.status} for ${instrument}`);
        return { success: false, error: `TradingView HTTP ${res.status}` };
      }

      html = await res.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error(`TradingView fetch failed for ${instrument}:`, msg);
      return { success: false, error: `Fetch failed: ${msg}` };
    }

    // Parse technicals
    const data = this.parseTechnicals(html, instrument);
    if (!data) {
      return { success: false, error: `Failed to parse TradingView technicals for ${instrument}` };
    }

    // Cache and return
    this.cache.set(instrument, { data, fetchedAt: Date.now() });
    log.info(`Parsed TV technicals for ${instrument} (summary: ${data.summary}, EMA periods: ${Object.keys(data.ema).length})`);

    return { success: true, data };
  }

  /**
   * Get cached technicals data for an instrument without triggering a network fetch.
   * Returns undefined if no cached data exists or cache has expired.
   */
  getCached(instrument: string): TVTechnicalsData | undefined {
    const cached = this.cache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.data;
    }
    return undefined;
  }

  /**
   * Refresh all instruments' technicals data in parallel.
   * Alias for getAllInstruments() — called by the background refresh cycle.
   */
  async refreshAll(): Promise<Result<TVTechnicalsData[]>> {
    return this.getAllInstruments();
  }

  /**
   * Fetch technicals for all supported instruments.
   * Returns partial results if some instruments fail.
   */
  async getAllInstruments(): Promise<Result<TVTechnicalsData[]>> {
    const results = await Promise.allSettled(
      ALL_INSTRUMENTS.map((inst) => this.fetchTechnicals(inst)),
    );

    const data: TVTechnicalsData[] = [];
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
      log.warn(`Partial TV technicals fetch: ${data.length}/${ALL_INSTRUMENTS.length} succeeded. Errors: ${errors.join('; ')}`);
    }

    return { success: true, data };
  }

  /**
   * Parse HTML for EMA/SMA values and summary.
   * Returns null if no MA values could be extracted.
   */
  private parseTechnicals(html: string, instrument: string): TVTechnicalsData | null {
    const ema: Record<string, number> = {};
    const sma: Record<string, number> = {};

    for (const period of VALID_PERIODS) {
      const eVal = extractValueNearLabel(html, emaLabel(period));
      if (eVal !== null) ema[String(period)] = eVal;

      const sVal = extractValueNearLabel(html, smaLabel(period));
      if (sVal !== null) sma[String(period)] = sVal;
    }

    // If no MA values found at all, consider parse failed
    if (Object.keys(ema).length === 0 && Object.keys(sma).length === 0) {
      log.warn(`No MA values found in TradingView HTML for ${instrument}`);
      return null;
    }

    const summary = extractSummary(html);

    return {
      instrument,
      ema,
      sma,
      summary,
      timestamp: Date.now(),
    };
  }
}
