/**
 * Web Search Client — DXY institutional commentary extraction (Pillar 4).
 *
 * Per TTE v5.3.3 Pillar 4 spec: Web search for DXY institutional commentary
 * from ING, FXStreet, VT Markets, forex.com, Continuum Economics.
 * Extracts EXPLICIT S/R levels only.
 *
 * Uses fetch() to query web search endpoints. Extracts explicit support/resistance
 * levels from results using regex patterns near "support"/"resistance"/"target"
 * keywords. Returns structured commentary with source URLs.
 *
 * Falls back to HP filter proxy (existing P4 behavior) when web search is
 * unavailable or returns no usable levels.
 *
 * Zero-dependency: uses fetch() + regex parsing. No cheerio.
 * Cache: 2-hour TTL (analyst commentary doesn't change faster than that).
 */

import { Logger } from '../utils/logger.js';

const log = new Logger('WebSearchClient');

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A single institutional commentary result with extracted S/R levels.
 */
export interface CommentaryResult {
  source: string;           // e.g. "ING", "FXStreet", "VT Markets"
  url: string;
  title: string;
  excerpt: string;          // Short snippet around the S/R mention
  supportLevels: number[];  // Explicit support prices extracted
  resistanceLevels: number[]; // Explicit resistance prices extracted
  bias: 'bullish' | 'bearish' | 'neutral';
}

/**
 * Aggregated web search commentary for an instrument.
 */
export interface WebSearchCommentary {
  instrument: string;
  results: CommentaryResult[];
  /** Combined resistance levels (deduped, sorted descending). */
  resistance: number[];
  /** Combined support levels (deduped, sorted descending). */
  support: number[];
  /** Aggregated bias across all sources. */
  consensusBias: 'bullish' | 'bearish' | 'neutral';
  /** Source URLs for traceability. */
  sources: string[];
  timestamp: number;
}

// ── Configuration ────────────────────────────────────────────────────────────

/** Cache TTL in milliseconds (2 hours). */
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

/** Target sources for DXY institutional commentary. */
const TARGET_SOURCES: readonly string[] = [
  'ing.com',
  'fxstreet.com',
  'vtmarkets.com',
  'forex.com',
  'continuumeconomics.com',
  'reuters.com',
  'dailyfx.com',
  'marketpulse.com',
];

/** Instruments pre-warmed by refreshAll() — matches the Anchor Pod pair list. */
const REFRESH_INSTRUMENTS: readonly string[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];

/** Instrument-specific price patterns for level extraction. */
function getPricePattern(instrument: string): RegExp {
  switch (instrument) {
    case 'DXY':     return /1\d{2}\.\d{2,4}/g;   // 104.50
    case 'EUR/USD': return /1\.\d{4}/g;            // 1.0850
    case 'GBP/USD': return /1\.\d{4}/g;            // 1.2650
    case 'AUD/USD': return /0\.\d{4}/g;            // 0.6550
    default:        return /\d{1,5}\.\d{2,5}/g;
  }
}

/**
 * Search query templates — formatted with month/year for freshness.
 */
function buildSearchQueries(instrument: string): string[] {
  const now = new Date();
  const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const label = instrument === 'DXY' ? 'DXY dollar index' : instrument;
  // "EUR USD" (space form) and "EURUSD" (compact form) — both rank well on search engines
  const spaceForm = instrument === 'DXY' ? 'DXY' : instrument.replace('/', ' ');  // "EUR USD"
  const compact = instrument === 'DXY' ? 'DXY' : instrument.replace('/', '');      // "EURUSD"

  return [
    // Broad, high-result queries first (FXStreet, DailyFX rank well on these)
    `${spaceForm} forecast this week`,
    `${spaceForm} analysis today`,
    `${compact} outlook`,
    // More specific queries with S/R context
    `${label} outlook ${monthYear} support resistance`,
    `${label} forecast ${monthYear} analyst levels`,
    `${label} technical analysis support target`,
  ];
}

// ── Level Extraction ─────────────────────────────────────────────────────────

/**
 * Regex patterns to find S/R context near price mentions.
 * Matches phrases like "support at 104.50", "resistance near 1.0850",
 * "target of 1.2650", etc.
 */
const SUPPORT_CONTEXT = /\b(?:support|support\s*level|support\s*zone|floor|downside\s*target|s\d?)\s*(?:at|near|around|of|:|=)?\s*/i;
const RESISTANCE_CONTEXT = /\b(?:resistance|resistance\s*level|resistance\s*zone|ceiling|upside\s*target|r\d?)\s*(?:at|near|around|of|:|=)?\s*/i;
const TARGET_CONTEXT = /\b(?:target|tp|take\s*profit|objective|aim(?:ing)?\s*(?:for|at))\s*(?:at|near|around|of|:|=)?\s*/i;

/**
 * Extract explicit support/resistance levels from a text snippet.
 *
 * Strategy: for each S/R keyword occurrence, look for a nearby price pattern
 * within ±120 characters. If the price matches the instrument's format,
 * classify it as support or resistance based on the keyword.
 */
function extractLevels(
  text: string,
  instrument: string,
): { support: number[]; resistance: number[] } {
  const pricePattern = getPricePattern(instrument);
  const support: number[] = [];
  const resistance: number[] = [];

  // Find all keyword positions with their type
  type Match = { type: 'support' | 'resistance'; index: number };
  const keywords: Match[] = [];

  for (const re of [SUPPORT_CONTEXT, RESISTANCE_CONTEXT]) {
    let m: RegExpExecArray | null;
    const localRe = new RegExp(re.source, 'gi');
    while ((m = localRe.exec(text)) !== null) {
      keywords.push({
        type: re === SUPPORT_CONTEXT ? 'support' : 'resistance',
        index: m.index + m[0].length,
      });
    }
  }

  // Also check target keywords — these are resistance (long targets) by default
  let tm: RegExpExecArray | null;
  const targetRe = new RegExp(TARGET_CONTEXT.source, 'gi');
  while ((tm = targetRe.exec(text)) !== null) {
    keywords.push({ type: 'resistance', index: tm.index + tm[0].length });
  }

  // For each keyword, find the nearest price within ±120 chars
  for (const kw of keywords) {
    const windowStart = Math.max(0, kw.index - 120);
    const windowEnd = Math.min(text.length, kw.index + 120);
    const window = text.substring(windowStart, windowEnd);

    const localPriceRe = new RegExp(pricePattern.source, 'g');
    let pm: RegExpExecArray | null;
    let nearestPrice: number | null = null;
    let nearestDist = Infinity;

    while ((pm = localPriceRe.exec(window)) !== null) {
      const price = parseFloat(pm[0]);
      const dist = Math.abs(pm.index - (kw.index - windowStart));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPrice = price;
      }
    }

    if (nearestPrice !== null && nearestDist < 60) {
      // Sanity check: price should be in a reasonable range for the instrument
      if (isValidPrice(nearestPrice, instrument)) {
        if (kw.type === 'support') {
          support.push(nearestPrice);
        } else {
          resistance.push(nearestPrice);
        }
      }
    }
  }

  return { support: dedupeSort(support), resistance: dedupeSort(resistance) };
}

/** Validate that a price is plausible for the instrument. */
function isValidPrice(price: number, instrument: string): boolean {
  switch (instrument) {
    case 'DXY':     return price >= 90 && price <= 120;
    case 'EUR/USD': return price >= 0.9 && price <= 1.25;
    case 'GBP/USD': return price >= 1.0 && price <= 1.4;
    case 'AUD/USD': return price >= 0.5 && price <= 0.85;
    default:        return price > 0;
  }
}

/** Deduplicate (within tolerance) and sort descending. */
function dedupeSort(arr: number[]): number[] {
  if (arr.length === 0) return [];
  const sorted = [...arr].sort((a, b) => b - a);
  const result: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    // Skip near-duplicates (within 5 pips for forex, 0.05 for DXY)
    const tol = 0.0005;
    if (Math.abs(sorted[i] - result[result.length - 1]) > tol) {
      result.push(sorted[i]);
    }
  }
  return result;
}

// ── Client ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: WebSearchCommentary | null;
  fetchedAt: number;
}

export class WebSearchClient {
  private cache: Map<string, CacheEntry> = new Map();
  private abortController?: AbortController;

  /**
   * Fetch institutional commentary for an instrument.
   * Returns null if no results found or search unavailable.
   */
  async searchCommentary(
    instrument: string,
    timeoutMs: number = 8000,
  ): Promise<WebSearchCommentary | null> {
    // Cache check
    const cached = this.cache.get(instrument);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      log.debug(`Cache hit for ${instrument}`);
      return cached.data;
    }

    const queries = buildSearchQueries(instrument);
    const allResults: CommentaryResult[] = [];

    for (const query of queries) {
      try {
        const results = await this.searchQuery(query, instrument, timeoutMs);
        allResults.push(...results);
      } catch (e) {
        log.debug(`Search failed for "${query}": ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = allResults.filter((r: CommentaryResult) => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    const commentary = unique.length > 0
      ? this.aggregate(instrument, unique)
      : null;

    this.cache.set(instrument, { data: commentary, fetchedAt: Date.now() });
    return commentary;
  }

  /**
   * Pre-warm the commentary cache for all traded instruments.
   * Called by the background refresh cycle (refreshExternalData in index.ts).
   * Each instrument's cache respects the 2-hour TTL internally, so this is a
   * no-op for fresh entries and only re-fetches stale ones.
   *
   * Uses Promise.allSettled so one instrument failure doesn't affect others.
   */
  async refreshAll(): Promise<void> {
    const results = await Promise.allSettled(
      REFRESH_INSTRUMENTS.map((inst: string) => this.searchCommentary(inst)),
    );

    const failed = results.filter((r: PromiseSettledResult<WebSearchCommentary | null>) => r.status === 'rejected').length;
    if (failed > 0) {
      log.warn(`WebSearch refreshAll: ${failed}/${results.length} instruments failed`);
    }
    log.debug('WebSearch refreshAll complete');
  }

  /**
   * Execute a single search query against multiple endpoints.
   * Tries DuckDuckGo HTML endpoint first, then falls back to source-specific URLs.
   */
  private async searchQuery(
    query: string,
    instrument: string,
    timeoutMs: number,
  ): Promise<CommentaryResult[]> {
    const results: CommentaryResult[] = [];
    this.abortController = new AbortController();
    const timer = setTimeout(() => this.abortController?.abort(), timeoutMs);

    try {
      // Strategy: fetch from DuckDuckGo HTML (no API key required)
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:' + TARGET_SOURCES.join(' OR site:'))}`;

      const resp = await fetch(ddgUrl, {
        signal: this.abortController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlutusAgent/1.0; +https://plutus.agent)',
        },
      });

      if (!resp.ok) {
        log.debug(`DuckDuckGo returned ${resp.status}`);
        return results;
      }

      const html = await resp.text();
      results.push(...this.parseDuckDuckGoHtml(html, instrument));
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        log.debug(`Search timed out for "${query}"`);
      } else {
        log.debug(`Search error for "${query}": ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      clearTimeout(timer);
    }

    return results;
  }

  /**
   * Parse DuckDuckGo HTML results — extract result snippets + URLs.
   */
  private parseDuckDuckGoHtml(html: string, instrument: string): CommentaryResult[] {
    const results: CommentaryResult[] = [];

    // DuckDuckGo HTML: <a class="result__a" href="...">Title</a>
    // <a class="result__snippet" href="...">Snippet</a>
    const resultBlockRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;

    let m: RegExpExecArray | null;
    while ((m = resultBlockRe.exec(html)) !== null && results.length < 10) {
      const rawUrl = m[1];
      const title = stripTags(m[2]).trim();
      const snippet = stripTags(m[3]).trim();

      // Resolve DDG redirect URL
      const url = resolveDdgUrl(rawUrl);
      const source = extractSourceName(url);

      // Only keep results from target sources
      if (!TARGET_SOURCES.some(s => url.includes(s))) continue;

      // Extract S/R levels from the snippet
      const { support, resistance } = extractLevels(snippet + ' ' + title, instrument);

      if (support.length === 0 && resistance.length === 0) {
        continue; // Skip — no explicit levels found
      }

      // Infer bias from level distribution
      const bias = inferBias(snippet, support, resistance);

      results.push({
        source,
        url,
        title,
        excerpt: snippet.substring(0, 200),
        supportLevels: support,
        resistanceLevels: resistance,
        bias,
      });
    }

    return results;
  }

  /**
   * Aggregate multiple commentary results into a single WebSearchCommentary.
   */
  private aggregate(instrument: string, results: CommentaryResult[]): WebSearchCommentary {
    const allSupport: number[] = [];
    const allResistance: number[] = [];
    const allSources: string[] = [];
    let bullishCount = 0;
    let bearishCount = 0;

    for (const r of results) {
      allSupport.push(...r.supportLevels);
      allResistance.push(...r.resistanceLevels);
      allSources.push(r.url);
      if (r.bias === 'bullish') bullishCount++;
      else if (r.bias === 'bearish') bearishCount++;
    }

    const consensusBias: 'bullish' | 'bearish' | 'neutral' =
      bullishCount > bearishCount + 1 ? 'bullish'
      : bearishCount > bullishCount + 1 ? 'bearish'
      : 'neutral';

    return {
      instrument,
      results,
      resistance: dedupeSort(allResistance),
      support: dedupeSort(allSupport),
      consensusBias,
      sources: [...new Set(allSources)],
      timestamp: Date.now(),
    };
  }

  /** Abort any in-flight searches. */
  abort(): void {
    this.abortController?.abort();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveDdgUrl(rawUrl: string): string {
  // DDG wraps URLs as /l/?uddg=<encoded>
  const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
  if (uddgMatch) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch (e) {
      console.error('[WebSearchClient] resolveDdgUrl decode failed:', e instanceof Error ? e.message : String(e));
      return rawUrl;
    }
  }
  return rawUrl;
}

function extractSourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const domain = host.split('.')[0];
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch (e) {
    console.error('[WebSearchClient] extractSourceName URL parse failed:', e instanceof Error ? e.message : String(e));
    return 'Unknown';
  }
}

function inferBias(
  text: string,
  support: number[],
  resistance: number[],
): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  const bullishWords = (lower.match(/\b(?:bullish|long|buy|upside|rally|surge|support\s*holds|demand)\b/g) || []).length;
  const bearishWords = (lower.match(/\b(?:bearish|short|sell|downside|drop|fall|resistance\s*holds|supply)\b/g) || []).length;

  if (bullishWords > bearishWords + 1) return 'bullish';
  if (bearishWords > bullishWords + 1) return 'bearish';
  // If more resistance levels than support, slight bearish lean
  if (resistance.length > support.length + 2) return 'bearish';
  if (support.length > resistance.length + 2) return 'bullish';
  return 'neutral';
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const webSearchClient = new WebSearchClient();
