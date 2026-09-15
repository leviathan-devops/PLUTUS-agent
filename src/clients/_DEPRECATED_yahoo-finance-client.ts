/**
 * TradingView Client — OHLC data source via TradingView API.
 *
 * REAL IMPLEMENTATION — no stubs.
 *
 * Fetches OHLC data from TradingView (query1.finance.tradingview.com).
 * This is the primary market data source per TTE spec Step 0f.
 *
 * This client provides:
 *   1. State tracking — records what chart is currently open (for plutus-status)
 *   2. OHLC history fetching — via TradingView API (real HTTP, no MCP dependency)
 *
 * The agent calls tv_* MCP tools for navigation/drawing. Plutus calls this
 * client for OHLC data retrieval that doesn't go through MCP.
 */

import { createRequire } from 'node:module';
import type { PlutusConfig, OHLCBar } from '../types.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('TradingViewFinanceClient');

export interface ChartState {
  symbol: string;
  timeframe: string;
  lastNavigateAt: number;
}

// TradingView interval mapping
const YF_INTERVAL_MAP: Record<string, string> = {
  '1H': '60m',
  '4H': '60m',   // TradingView doesn't have 4H — use 60m and aggregate
  'D': '1d',
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
};

// Realistic browser User-Agent (TradingView blocks non-browser UAs / rate-limits them)
const YF_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// TradingView symbol mapping
const YF_SYMBOL_MAP: Record<string, string> = {
  'DXY': 'DX-Y.NYB',     // US Dollar Index
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'AUD/USD': 'AUDUSD=X',
};

export class TradingViewFinanceClient {
  private currentChart: ChartState | null = null;
  private ohlcCache: Map<string, { bars: OHLCBar[]; fetchedAt: number }> = new Map();
  private readonly ohlcCacheTtlMs = 60_000; // 1 minute

  constructor(private config: PlutusConfig) {}

  /**
   * Record chart navigation. Called by plutus-* tools when the agent
   * navigates via tv_open_chart MCP tool. This keeps Plutus's state
   * tracking in sync with what the agent did.
   */
  recordNavigation(symbol: string, timeframe: string = '4H'): void {
    this.currentChart = {
      symbol,
      timeframe,
      lastNavigateAt: Date.now(),
    };
    log.info(`Chart navigation recorded: ${symbol} ${timeframe}`);
  }

  /**
   * Get the current chart state (for plutus-status reporting).
   */
  getCurrentChart(): ChartState | null {
    return this.currentChart;
  }

  /**
   * Fetch OHLC history from TradingView API.
   *
   * REAL HTTP request to query1.finance.tradingview.com. No MCP dependency.
   * Used as the OHLC source for TimesFM forecasts (TV MCP's tv_get_visible_bars
   * is degraded per the wiring doc — DOM scrape returns single bar).
   *
   * Returns at most `bars` bars of 1H data. For 4H timeframe, caller must
   * aggregate 4 consecutive 1H bars into one 4H bar.
   */
  async getOHLCHistory(symbol: string, timeframe: string = '4H', bars: number = 1024): Promise<OHLCBar[]> {
    // Check cache first
    const cacheKey = `${symbol}|${timeframe}|${bars}`;
    const cached = this.ohlcCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this.ohlcCacheTtlMs) {
      log.debug(`OHLC cache hit for ${symbol} (${cached.bars.length} bars)`);
      return cached.bars;
    }

    // FIX: Handle both pre-mapped symbols (e.g., "EURUSD=X") and unmapped (e.g., "EUR/USD").
    // The data-harvester may pass an already-mapped TradingView symbol. If the symbol isn't in
    // YF_SYMBOL_MAP, fall through and use it as-is (it's likely already a TradingView symbol).
    const yfSymbol = YF_SYMBOL_MAP[symbol] ?? symbol;

    const yfInterval = YF_INTERVAL_MAP[timeframe] ?? '60m';
    // TradingView period1 = start time (unix seconds), period2 = end time (now)
    // For 1024 4H bars: 1024 * 3600 * 4 = ~170 days back (within TradingView's 730-day limit)
    const period2 = Math.floor(Date.now() / 1000);
    const lookbackSeconds = bars * 3600 * (timeframe === '4H' ? 4 : 1);
    const period1 = period2 - lookbackSeconds;

    // Map TradingView interval to range string for fallback strategy
    const rangeMap: Record<string, string> = {
      '1d': '1mo', '60m': '6mo', '1h': '6mo',
      '5m': '1mo', '15m': '1mo', '30m': '1mo', '1m': '5d',
    };
    const rangeStr = rangeMap[yfInterval] ?? '6mo';

    log.info(`Fetching ${bars} ${timeframe} bars for ${symbol} (yf=${yfSymbol}, interval=${yfInterval}) from TradingView`);

    // Helper: make a single fetch attempt with timeout
    const fetchWithTimeout = async (url: string): Promise<Response> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10-second timeout
      try {
        return await fetch(url, {
          headers: { 'User-Agent': YF_USER_AGENT },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };

    // Helper: parse TradingView response into OHLCBar[]
    const parseResponse = (data: {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: number[];
              high?: number[];
              low?: number[];
              close?: number[];
              volume?: number[];
            }>;
          };
        }>;
      };
    }): OHLCBar[] => {
      const result = data?.chart?.result?.[0];
      if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
        return [];
      }
      const quote = result.indicators.quote[0];
      const rawBars: OHLCBar[] = [];
      for (let i = 0; i < result.timestamp.length; i++) {
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i];
        if (open == null || high == null || low == null || close == null) continue;
        rawBars.push({
          timestamp: result.timestamp[i] * 1000,
          open, high, low, close,
          volume: volume ?? 0,
        });
      }
      return rawBars;
    };

    // Build candidate URLs to try in order:
    //   1. query1 with period1/period2
    //   2. query2 with period1/period2
    //   3. query1 with range parameter (different TradingView API format)
    const candidateUrls = [
      `https://query1.finance.tradingview.com/v8/finance/chart/${yfSymbol}?period1=${period1}&period2=${period2}&interval=${yfInterval}&includePrePost=false`,
      `https://query2.finance.tradingview.com/v8/finance/chart/${yfSymbol}?period1=${period1}&period2=${period2}&interval=${yfInterval}&includePrePost=false`,
      `https://query1.finance.tradingview.com/v8/finance/chart/${yfSymbol}?range=${rangeStr}&interval=${yfInterval}&includePrePost=false`,
    ];

    let lastError: string | null = null;

    for (let attempt = 0; attempt < candidateUrls.length; attempt++) {
      const url = candidateUrls[attempt];
      try {
        const res = await fetchWithTimeout(url);

        if (!res.ok) {
          const bodySnippet = (await res.text()).slice(0, 200);
          log.warn(`[attempt ${attempt + 1}/${candidateUrls.length}] TradingView HTTP ${res.status} for ${symbol}: ${bodySnippet}`);
          lastError = `HTTP ${res.status}: ${bodySnippet}`;
          continue;
        }

        const data = await res.json() as {
          chart?: {
            result?: Array<{
              timestamp?: number[];
              indicators?: {
                quote?: Array<{
                  open?: number[];
                  high?: number[];
                  low?: number[];
                  close?: number[];
                  volume?: number[];
                }>;
              };
            }>;
            error?: { description?: string };
          };
        };

        // Check for API-level error
        if (data?.chart?.error) {
          const errDesc = data.chart.error.description ?? JSON.stringify(data.chart.error);
          log.warn(`[attempt ${attempt + 1}/${candidateUrls.length}] TradingView API error for ${symbol}: ${errDesc}`);
          lastError = errDesc;
          continue;
        }

        const rawBars = parseResponse(data);
        if (rawBars.length === 0) {
          log.warn(`[attempt ${attempt + 1}/${candidateUrls.length}] TradingView returned 0 bars for ${symbol} (parsed empty)`);
          lastError = 'Returned 0 bars';
          continue;
        }

        // Aggregate 1H to 4H if requested
        let bars_result: OHLCBar[];
        if (timeframe === '4H' && yfInterval === '60m') {
          bars_result = aggregateTo4H(rawBars);
        } else {
          bars_result = rawBars;
        }

        // Take last `bars` entries
        bars_result = bars_result.slice(-bars);

        // Cache
        this.ohlcCache.set(cacheKey, { bars: bars_result, fetchedAt: Date.now() });
        log.info(`Fetched ${bars_result.length} ${timeframe} bars for ${symbol} (attempt ${attempt + 1}, ${rawBars.length} raw bars)`);

        return bars_result;
      } catch (e) {
        const errMsg = (e as Error).name === 'AbortError'
          ? `Request timed out after 10s`
          : (e as Error).message;
        log.warn(`[attempt ${attempt + 1}/${candidateUrls.length}] TradingView fetch failed for ${symbol}: ${errMsg} — URL: ${url.slice(0, 120)}...`);
        lastError = errMsg;
      }
    }

    log.error(`All ${candidateUrls.length} TradingView attempts failed for ${symbol}: ${lastError}`);
    return [];
  }

  /**
   * Clear the OHLC cache. Called when fresh data is needed.
   */
  clearCache(): void {
    this.ohlcCache.clear();
    log.info('OHLC cache cleared');
  }

  /**
   * Get OHLC cache stats for diagnostics.
   */
  getCacheStats(): { entries: number; totalBars: number; oldestFetch: number | null } {
    let totalBars = 0;
    let oldestFetch: number | null = null;
    for (const entry of this.ohlcCache.values()) {
      totalBars += entry.bars.length;
      if (oldestFetch === null || entry.fetchedAt < oldestFetch) {
        oldestFetch = entry.fetchedAt;
      }
    }
    return {
      entries: this.ohlcCache.size,
      totalBars,
      oldestFetch,
    };
  }
}

/**
 * Aggregate 1H bars into 4H bars.
 * Groups every 4 consecutive 1H bars (aligned to 4H boundaries) into one 4H bar.
 */
function aggregateTo4H(bars1h: OHLCBar[]): OHLCBar[] {
  if (bars1h.length === 0) return [];

  const bars4h: OHLCBar[] = [];
  let currentGroup: OHLCBar[] = [];

  for (const bar of bars1h) {
    // Align to 4H boundary: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
    const hour = new Date(bar.timestamp).getUTCHours();
    const groupStart = hour - (hour % 4);

    if (currentGroup.length === 0) {
      currentGroup.push(bar);
    } else {
      const prevHour = new Date(currentGroup[0].timestamp).getUTCHours();
      const prevGroupStart = prevHour - (prevHour % 4);
      if (groupStart === prevGroupStart) {
        currentGroup.push(bar);
      } else {
        // Push completed group
        bars4h.push(aggregateGroup(currentGroup));
        currentGroup = [bar];
      }
    }

    if (currentGroup.length === 4) {
      bars4h.push(aggregateGroup(currentGroup));
      currentGroup = [];
    }
  }

  // Push remaining partial group
  if (currentGroup.length > 0) {
    bars4h.push(aggregateGroup(currentGroup));
  }

  return bars4h;
}

function aggregateGroup(group: OHLCBar[]): OHLCBar {
  if (group.length === 0) {
    throw new Error('Cannot aggregate empty group');
  }
  if (group.length === 1) return group[0];

  return {
    timestamp: group[0].timestamp,
    open: group[0].open,
    high: Math.max(...group.map((b: OHLCBar) => b.high)),
    low: Math.min(...group.map((b: OHLCBar) => b.low)),
    close: group[group.length - 1].close,
    volume: group.reduce((sum: number, b: OHLCBar) => sum + b.volume, 0),
  };
}
