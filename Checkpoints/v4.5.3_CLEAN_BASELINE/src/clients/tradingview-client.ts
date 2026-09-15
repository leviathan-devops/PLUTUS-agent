/**
 * TradingView Client — PRIMARY OHLC + technicals source via tvDatafeed.
 *
 * Uses the TradingView-Datafeed Python library (tvDatafeed) which connects
 * to TradingView's WebSocket chart-data feed. Returns real OHLC bars.
 *
 * This is the standard quant library for TradingView data. No APIs, no
 * scraping — direct WebSocket data feed access.
 *
 * Free-tier: TVC:DXY, FX:EURUSD, FX:GBPUSD, FX:AUDUSD (no login needed)
 */

import type { OHLCBar } from '../types.js';
import { Logger } from '../utils/logger.js';
import { execFile } from 'node:child_process';
import { join } from 'node:path';

function sanitizeExecArg(arg: string): string {
  if (typeof arg !== 'string' || arg.length === 0) {
    throw new Error(`Invalid execFile argument (empty or non-string)`);
  }
  if (!/^[A-Za-z0-9_./-]+$/.test(arg)) {
    throw new Error(`Invalid execFile argument (disallowed characters): ${arg}`);
  }
  return arg;
}

const log = new Logger('TradingViewClient');

const TV_PAIR_MAP: Record<string, { symbol: string; exchange: string }> = {
  'DXY': { symbol: 'DXY', exchange: 'TVC' },
  'EUR/USD': { symbol: 'EURUSD', exchange: 'FX' },
  'GBP/USD': { symbol: 'GBPUSD', exchange: 'FX' },
  'AUD/USD': { symbol: 'AUDUSD', exchange: 'FX' },
};

export interface ChartState {
  symbol: string;
  timeframe: string;
  lastNavigateAt: number;
}

export class TradingViewClient {
  private currentChart: ChartState | null = null;
  private ohlcCache: Map<string, { bars: OHLCBar[]; fetchedAt: number }> = new Map();
  private readonly cacheTtlMs = 120_000;
  private scriptPath: string;

  constructor(_config: unknown) {
    this.scriptPath = join(process.cwd(), 'scripts', 'tv_datafeed.py');
  }

  /**
   * Fetch OHLC history from TradingView via tvDatafeed.
   *
   * @param symbol    Pair name (EUR/USD, GBP/USD, DXY, etc.)
   * @param timeframe 4H (default), 1H, D
   * @param bars      Number of bars to fetch (tvDatafeed supports up to 5000)
   */
  async getOHLCHistory(
    symbol: string,
    timeframe: string = '4H',
    bars: number = 1024,
  ): Promise<OHLCBar[]> {
    const cacheKey = `${symbol}|${timeframe}|${bars}`;
    const cached = this.ohlcCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) {
      log.debug(`OHLC cache hit for ${symbol} (${cached.bars.length} bars)`);
      return cached.bars;
    }

    const tvInfo = TV_PAIR_MAP[symbol];
    if (!tvInfo) {
      log.error(`Unknown symbol: ${symbol}`);
      return [];
    }

    // Map timeframe to tvDatafeed interval
    const interval = timeframe === '4H' ? '4_hour'
      : timeframe === '1H' ? '1_hour'
      : timeframe === 'D' || timeframe === '1d' ? 'daily'
      : timeframe === '15m' ? '15_minute'
      : timeframe === '30m' ? '30_minute'
      : timeframe === '5m' ? '5_minute'
      : '4_hour';

    log.info(`Fetching ${bars} ${timeframe} bars for ${symbol} from TradingView (tvDatafeed: ${tvInfo.exchange}:${tvInfo.symbol})`);

    try {
      let result = await this.callTvDatafeed(tvInfo.symbol, tvInfo.exchange, interval, bars);

      if (result.length === 0) {
        log.warn(`tvDatafeed returned 0 bars for ${symbol} — retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
        result = await this.callTvDatafeed(tvInfo.symbol, tvInfo.exchange, interval, bars);
      }

      if (result.length > 0) {
        this.ohlcCache.set(cacheKey, { bars: result, fetchedAt: Date.now() });
        log.info(`TradingView: ${result.length} ${timeframe} bars for ${symbol}`);
        return result;
      }

      log.error(`tvDatafeed returned 0 bars for ${symbol}`);
      return [];
    } catch (err) {
      log.error(`tvDatafeed failed for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Call tv_datafeed.py Python script.
   * tvDatafeed connects to TradingView's WebSocket and returns real OHLC bars.
   */
  private callTvDatafeed(
    symbol: string,
    exchange: string,
    interval: string,
    nBars: number,
  ): Promise<OHLCBar[]> {
    return new Promise((resolve, reject) => {
      const args = [
        sanitizeExecArg(this.scriptPath),
        '--symbol', sanitizeExecArg(symbol),
        '--exchange', sanitizeExecArg(exchange),
        '--interval', sanitizeExecArg(interval),
        '--bars', sanitizeExecArg(String(nBars)),
      ];

      log.debug(`Executing: python3 ${this.scriptPath} ${args.join(' ')}`);

      const child = execFile('python3', args, {
        timeout: 30_000,
        maxBuffer: 50 * 1024 * 1024, // 50MB for large bar sets
        cwd: process.cwd(),
      }, (err, stdout, stderr) => {
        if (err) {
          const errMsg = stderr?.trim() || err.message;
          log.warn(`tvDatafeed error: ${errMsg}`);
          // Script outputs [] on error — try to parse it
          try {
            const data = JSON.parse(stdout.trim()) as unknown;
            if (Array.isArray(data)) {
              resolve(data as OHLCBar[]);
              return;
            }
          } catch (parseErr) {
            log.warn(`tvDatafeed OHLC parse failed on error stdout: ${(parseErr as Error).message}`);
          }
          reject(new Error(errMsg));
          return;
        }

        try {
          const data = JSON.parse(stdout.trim()) as unknown;
          if (Array.isArray(data)) {
            resolve(data as OHLCBar[]);
          } else {
            log.warn(`tvDatafeed returned non-array: ${typeof data}`);
            resolve([]);
          }
        } catch (parseErr) {
          log.warn(`tvDatafeed JSON parse failed: ${(parseErr as Error).message}`);
          log.debug(`stdout first 300 chars: ${stdout.substring(0, 300)}`);
          resolve([]);
        }
      });

      // Hard timeout
      setTimeout(() => {
        try { child.kill('SIGKILL'); } catch (killErr) {
          log.warn(`Failed to kill tvDatafeed child process: ${(killErr as Error).message}`);
        }
      }, 30_000);
    });
  }

  /**
   * Fetch technicals (EMAs, SMAs, RSI, signals) via tradingview_ta.
   */
  async getTechnicals(
    symbol: string,
    timeframe: string = '4H',
  ): Promise<Record<string, unknown> | null> {
    const tvInfo = TV_PAIR_MAP[symbol];
    if (!tvInfo) return null;

    const interval = timeframe === '4H' ? '4_hour' : timeframe === '1H' ? '1_hour' : 'daily';

    return new Promise((resolve) => {
      const args = [
        this.scriptPath,
        '--symbol', tvInfo.symbol,
        '--exchange', tvInfo.exchange,
        '--mode', 'technicals',
        '--interval', interval,
      ];

      execFile('python3', args, { timeout: 15_000 }, (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()) as Record<string, unknown>);
        } catch (parseErr) {
          log.warn(`tvDatafeed technicals JSON parse failed: ${(parseErr as Error).message}`);
          resolve({});
        }
      });
    });
  }

  recordNavigation(symbol: string, timeframe: string = '4H'): void {
    this.currentChart = { symbol, timeframe, lastNavigateAt: Date.now() };
    log.info(`Chart navigation recorded: ${symbol} ${timeframe}`);
  }

  getCurrentChart(): ChartState | null {
    return this.currentChart;
  }
}
