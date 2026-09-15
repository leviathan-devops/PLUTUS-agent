/**
 * Forex Research Client — Fetches analyst consensus from forex.com research.
 *
 * Used by P4 (Analyst Consensus) to extract High/Low Wall Calls and bias
 * from published research articles.
 *
 * Zero-dependency: uses fetch() + regex parsing. No cheerio.
 * Cache: 1 hour TTL (shared page fetch across instruments).
 *
 * The research page is the same URL for all instruments — the client
 * fetches it once, then filters content per-instrument using keyword matching.
 */

import type { Result } from '../types.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('ForexResearchClient');

const RESEARCH_URL = 'https://www.forex.com/en-us/market-analysis/latest-research/';

const ALL_INSTRUMENTS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnalystConsensus {
  instrument: string;
  hwc: number | null;         // High Wall Call — resistance level
  lwc: number | null;         // Low Wall Call — support level
  bias: 'bullish' | 'bearish' | 'neutral';
  sources: string[];          // Article titles/URLs
  timestamp: number;
}

interface ResultCacheEntry {
  data: AnalystConsensus;
  fetchedAt: number;
}

// ── Instrument Keyword Patterns ──────────────────────────────────────────────

const INSTRUMENT_KEYWORDS: Record<string, RegExp> = {
  'DXY':     /\b(?:DXY|US\s*Dollar\s*Index|Dollar\s*Index|USDX)\b/i,
  'EUR/USD': /\b(?:EUR\/?USD|EUR-USD|Euro(?:\s*Dollar)?|EUR)\b/i,
  'GBP/USD': /\b(?:GBP\/?USD|GBP-USD|Cable|Pound\s*Sterling|GBP)\b/i,
  'AUD/USD': /\b(?:AUD\/?USD|AUD-USD|Aussie(?:\s*Dollar)?|AUD)\b/i,
};

/** Price-like number patterns per instrument (forex pair decimal conventions). */
function getPricePattern(instrument: string): RegExp {
  switch (instrument) {
    case 'DXY':     return /\b1\d{2}\.\d{2,4}\b/g;   // 104.50
    case 'EUR/USD': return /\b1\.\d{4}\b/g;           // 1.0850
    case 'GBP/USD': return /\b1\.\d{4}\b/g;           // 1.2650
    case 'AUD/USD': return /\b0\.\d{4}\b/g;           // 0.6550
    default:        return /\b\d{1,5}\.\d{2,5}\b/g;
  }
}

// ── HTML Parsing Helpers ─────────────────────────────────────────────────────

/** Strip HTML to plain text, removing scripts/styles/tags/entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract relevant text chunks mentioning the instrument.
 * Splits clean text into sentences and keeps those containing instrument keywords.
 */
function getInstrumentContext(cleanText: string, instrumentRegex: RegExp): string {
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => instrumentRegex.test(s)).join(' ');
}

/**
 * Extract all price-like numbers near specified keywords in the given text.
 * Searches a ±200 char window around each keyword occurrence.
 */
function extractPricesNearKeywords(
  text: string,
  keywords: readonly string[],
  pricePattern: RegExp,
): number[] {
  const prices: number[] = [];
  const patternSource = pricePattern.source;

  for (const keyword of keywords) {
    const keywordRegex = new RegExp(keyword, 'gi');
    let match: RegExpExecArray | null;
    while ((match = keywordRegex.exec(text)) !== null) {
      const windowStart = Math.max(0, match.index - 150);
      const windowEnd = match.index + 200;
      const context = text.slice(windowStart, windowEnd);

      const localPattern = new RegExp(patternSource, 'g');
      let priceMatch: RegExpExecArray | null;
      while ((priceMatch = localPattern.exec(context)) !== null) {
        const price = parseFloat(priceMatch[0]);
        if (Number.isFinite(price)) prices.push(price);
      }
    }
  }

  return prices;
}

/**
 * Determine bias from bullish vs bearish keyword frequency in the text.
 * Uses 1.2× threshold to avoid flipping on near-equal counts.
 */
function extractBias(text: string): 'bullish' | 'bearish' | 'neutral' {
  const bullishWords = ['bullish', 'long', 'buy', 'upside', 'rally', 'higher', 'support', 'gain'];
  const bearishWords = ['bearish', 'short', 'sell', 'downside', 'decline', 'lower', 'resistance', 'loss'];

  let bullishCount = 0;
  let bearishCount = 0;

  for (const word of bullishWords) {
    const matches = text.match(new RegExp(`\\b${word}\\w*\\b`, 'gi'));
    if (matches) bullishCount += matches.length;
  }
  for (const word of bearishWords) {
    const matches = text.match(new RegExp(`\\b${word}\\w*\\b`, 'gi'));
    if (matches) bearishCount += matches.length;
  }

  if (bullishCount > bearishCount * 1.2) return 'bullish';
  if (bearishCount > bullishCount * 1.2) return 'bearish';
  return 'neutral';
}

/**
 * Extract article titles (from heading/anchor tags) mentioning the instrument.
 * Limited to 10 sources to avoid excessive data.
 */
function extractArticleTitles(html: string, instrumentRegex: RegExp): string[] {
  const titles: string[] = [];
  const titleRegex = /<(?:h[1-4]|a)[^>]*>([\s\S]*?)<\/(?:h[1-4]|a)>/gi;
  let match: RegExpExecArray | null;

  while ((match = titleRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text.length > 15 && instrumentRegex.test(text)) {
      titles.push(text);
    }
  }

  // Deduplicate
  return [...new Set(titles)].slice(0, 10);
}

// ── Client ───────────────────────────────────────────────────────────────────

export class ForexResearchClient {
  private pageCache: { html: string; fetchedAt: number } | null = null;
  private readonly cacheTtlMs = 3_600_000; // 1 hour
  private resultCache: Map<string, ResultCacheEntry> = new Map();

  /**
   * Fetch analyst consensus for a single instrument.
   * Returns cached data if fresh (< 1 hour old).
   */
  async fetchResearch(instrument: string): Promise<Result<AnalystConsensus>> {
    if (!INSTRUMENT_KEYWORDS[instrument]) {
      return { success: false, error: `Unknown instrument: ${instrument}` };
    }

    // Check result cache
    const cached = this.resultCache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      log.debug(`Cache hit for ${instrument}`);
      return { success: true, data: cached.data };
    }

    // Fetch shared page
    const pageResult = await this.fetchPage();
    if (!pageResult.success) {
      return { success: false, error: pageResult.error };
    }

    const consensus = this.parseResearch(pageResult.data, instrument);

    this.resultCache.set(instrument, { data: consensus, fetchedAt: Date.now() });
    log.info(`Parsed forex research for ${instrument} (bias: ${consensus.bias}, HWC: ${consensus.hwc ?? 'none'})`);

    return { success: true, data: consensus };
  }

  /**
   * Get cached analyst consensus for an instrument without triggering a network fetch.
   * Returns undefined if no cached data exists or cache has expired.
   */
  getCached(instrument: string): AnalystConsensus | undefined {
    const cached = this.resultCache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      return cached.data;
    }
    return undefined;
  }

  /**
   * Refresh all instruments' analyst consensus in parallel.
   * Alias for getAllInstruments() — called by the background refresh cycle.
   */
  async refreshAll(): Promise<Result<AnalystConsensus[]>> {
    return this.getAllInstruments();
  }

  /**
   * Fetch analyst consensus for all supported instruments.
   * Returns partial results if the page fetch fails.
   */
  async getAllInstruments(): Promise<Result<AnalystConsensus[]>> {
    const results = await Promise.allSettled(
      ALL_INSTRUMENTS.map((inst) => this.fetchResearch(inst)),
    );

    const data: AnalystConsensus[] = [];
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
      log.warn(`Partial forex research fetch: ${data.length}/${ALL_INSTRUMENTS.length} succeeded. Errors: ${errors.join('; ')}`);
    }

    return { success: true, data };
  }

  /**
   * Fetch the shared research page HTML. Cached across all instrument calls.
   */
  private async fetchPage(): Promise<Result<string>> {
    if (this.pageCache && Date.now() - this.pageCache.fetchedAt < this.cacheTtlMs) {
      log.debug('Research page cache hit');
      return { success: true, data: this.pageCache.html };
    }

    log.info('Fetching forex.com research page');

    try {
      const res = await fetch(RESEARCH_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!res.ok) {
        log.warn(`Forex.com HTTP ${res.status}`);
        return { success: false, error: `Forex.com HTTP ${res.status}` };
      }

      const html = await res.text();
      this.pageCache = { html, fetchedAt: Date.now() };
      return { success: true, data: html };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log.error('Forex.com fetch failed:', msg);
      return { success: false, error: `Fetch failed: ${msg}` };
    }
  }

  /**
   * Parse research page HTML for a specific instrument.
   * Always returns an AnalystConsensus (nulls for missing data).
   */
  private parseResearch(html: string, instrument: string): AnalystConsensus {
    const instrumentRegex = INSTRUMENT_KEYWORDS[instrument];
    const cleanText = stripHtml(html);
    const context = getInstrumentContext(cleanText, instrumentRegex);
    const pricePattern = getPricePattern(instrument);

    // Extract article titles mentioning the instrument
    const sources = extractArticleTitles(html, instrumentRegex);

    // HWC: highest price near resistance/target keywords
    const resistancePrices = extractPricesNearKeywords(
      context.length > 0 ? context : cleanText,
      ['resistance', 'target', 'high', 'ceiling', 'supply'],
      pricePattern,
    );
    const hwc = resistancePrices.length > 0 ? Math.max(...resistancePrices) : null;

    // LWC: lowest price near support/low keywords
    const supportPrices = extractPricesNearKeywords(
      context.length > 0 ? context : cleanText,
      ['support', 'low', 'floor', 'bottom', 'demand'],
      pricePattern,
    );
    const lwc = supportPrices.length > 0 ? Math.min(...supportPrices) : null;

    // Bias from keyword frequency in instrument context
    const bias = extractBias(context.length > 0 ? context : cleanText);

    return {
      instrument,
      hwc,
      lwc,
      bias,
      sources,
      timestamp: Date.now(),
    };
  }
}
