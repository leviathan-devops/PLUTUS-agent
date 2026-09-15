/**
 * MarketDataClient — Near real-time spot prices via TradingView.
 *
 * Fetches the latest market price for DXY and FX majors from the TradingView
 * Finance chart endpoint (regularMarketPrice from meta). Supports a
 * background polling feed for streaming-style updates at a configurable
 * interval. Spot cache TTL is 5 seconds by default.
 *
 * No auth required. Response is JSON.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('MarketDataClient');

const YF_BASE = 'https://query1.finance.tradingview.com/v8/finance/chart/';
const DEFAULT_FEED_INTERVAL_MS = 5_000;   // 5 second poll
const CACHE_TTL_MS = 5_000;               // 5 second spot cache

// Instrument → TradingView ticker mapping.
const SYMBOL_MAP: Record<string, string> = {
  DXY: 'DX-Y.NYB',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'AUD/USD': 'AUDUSD=X',
};

interface SpotEntry {
  price: number;
  timestamp: number;
}

interface TradingViewChartMeta {
  regularMarketPrice?: unknown;
}

interface TradingViewChartPayload {
  chart?: {
    result?: Array<{ meta?: TradingViewChartMeta } | undefined> | undefined;
    error?: { description?: unknown };
  };
}

export class MarketDataClient {
  private spotCache: Map<string, SpotEntry> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly cacheTtlMs: number;

  constructor(
    private readonly evidence: EvidenceDB | null = null,
    cacheTtlMs: number = CACHE_TTL_MS,
  ) {
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Fetch the latest spot price for an instrument. Returns null on failure
   * or when the instrument is unmapped. Respects the in-memory cache TTL.
   */
  async fetchSpot(instrument: string): Promise<number | null> {
    const symbol = this.symbolMap(instrument);
    if (symbol === '') {
      log.warn(`No symbol mapping for instrument ${instrument}`);
      return null;
    }

    const cached = this.spotCache.get(instrument);
    if (cached !== undefined && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return cached.price;
    }

    try {
      const price = await this.fetchPrice(symbol);
      if (price === null) return null;
      this.spotCache.set(instrument, { price, timestamp: Date.now() });
      this.recordEvidence('spot_fetched', { instrument, price });
      return price;
    } catch (e) {
      log.warn(`Spot fetch failed for ${instrument}: ${(e as Error).message}`);
      this.recordEvidence('spot_fetch_failed', { instrument, error: (e as Error).message });
      return null;
    }
  }

  /**
   * Start a background polling feed that refreshes all `instruments`
   * every `intervalMs` milliseconds. Replaces any prior feed.
   */
  startSpotFeed(instruments: string[], intervalMs: number = DEFAULT_FEED_INTERVAL_MS): void {
    this.stopSpotFeed();
    this.intervalId = setInterval(() => {
      void this.pollInstruments(instruments);
    }, intervalMs);
    log.info(`Spot feed started for ${instruments.length} instruments every ${intervalMs}ms`);
  }

  /**
   * Stop the background polling feed if one is running.
   */
  stopSpotFeed(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      log.info('Spot feed stopped');
    }
  }

  /**
   * Get the cached spot price for an instrument, or null.
   */
  getSpot(instrument: string): number | null {
    return this.spotCache.get(instrument)?.price ?? null;
  }

  /**
   * Snapshot of all cached spot prices.
   */
  getAllSpots(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [instrument, entry] of this.spotCache) {
      out[instrument] = entry.price;
    }
    return out;
  }

  // ── Internals ──────────────────────────────────────────────────

  private symbolMap(instrument: string): string {
    return SYMBOL_MAP[instrument] ?? '';
  }

  private async pollInstruments(instruments: string[]): Promise<void> {
    for (const instrument of instruments) {
      try {
        await this.fetchSpot(instrument);
      } catch (e) {
        log.warn(`Feed poll error for ${instrument}: ${(e as Error).message}`);
      }
    }
  }

  private async fetchPrice(symbol: string): Promise<number | null> {
    const url = `${YF_BASE}${symbol}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Plutus/1.0.0)' },
    });
    if (!res.ok) {
      throw new Error(`TradingView HTTP ${res.status}`);
    }

    const payload = await res.json() as TradingViewChartPayload;
    const result = payload.chart?.result?.[0];
    const meta = result?.meta;
    const rawPrice = meta?.regularMarketPrice;

    if (typeof rawPrice !== 'number' || !Number.isFinite(rawPrice)) {
      const apiError = payload.chart?.error?.description;
      throw new Error(
        typeof apiError === 'string' ? apiError : 'TradingView returned no regularMarketPrice',
      );
    }
    return rawPrice;
  }

  private recordEvidence(action: string, payload: Record<string, unknown>): void {
    if (this.evidence === null) return;
    try {
      this.evidence.recordEvidence('market_data', action, payload);
    } catch (e) {
      log.warn(`Evidence write failed (${action}): ${(e as Error).message}`);
    }
  }
}
