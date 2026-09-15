/**
 * TradingView Workspace Client — VC daemon REMOVED (no-op stub).
 *
 * This client previously called the v9 VEE actuator endpoint on the external
 * Visual Cortex daemon (http://localhost:3322) to control a headed browser
 * with TradingView open. The daemon no longer exists — MiMo v2.5 built-in
 * vision via TvChartController / TvChartImageFetch is the visual path.
 *
 * The class is retained as a NO-OP stub so existing call sites compile and
 * run unchanged. Every method logs a one-time warning and returns a safe
 * empty/false value (operations honestly report that they did not happen).
 */

import { Logger } from '../utils/logger.js';
import { type DXYZone, type TradeSetup } from '../types.js';
import type { ReplayResult } from '../v1-compat.js';

const log = new Logger('TVWorkspace');

export interface TvChartAnalysis {
  zones: Array<{ top: number; bottom: number; type: string; reactionCount: number }>;
  shapes: string[];
  currentPrice: number;
  trendDirection: 'UP' | 'DOWN' | 'RANGE';
  narrative: string;
  tradeStatus: string;
}

export interface TvBarData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TvSetupCandidate {
  direction: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  narrative: string;
}

export class TvWorkspaceClient {
  private warned = false;

  /**
   * Log the removal warning once per client instance (no log spam), then
   * a per-call debug line identifying the no-op'd operation.
   */
  private warnRemoved(operation: string): void {
    if (!this.warned) {
      log.warn(
        'TvWorkspaceClient: VC daemon REMOVED — all workspace operations are no-ops. ' +
        'Use TvChartController/TvChartImageFetch (MiMo v2.5 built-in vision) instead.',
      );
      this.warned = true;
    }
    log.debug(`TvWorkspaceClient.${operation}: no-op (VC daemon removed)`);
  }

  /** The VC daemon is gone — always unavailable. */
  async isAvailable(): Promise<boolean> {
    this.warnRemoved('isAvailable');
    return false;
  }

  async openChart(symbol: string, timeframe?: string): Promise<boolean> {
    this.warnRemoved('openChart');
    void symbol;
    void timeframe;
    return false;
  }

  async switchSymbol(symbol: string): Promise<boolean> {
    this.warnRemoved('switchSymbol');
    void symbol;
    return false;
  }

  async setTimeframe(timeframe: string): Promise<boolean> {
    this.warnRemoved('setTimeframe');
    void timeframe;
    return false;
  }

  /** Screenshot capture moved to TvChartController/TvChartImageFetch. */
  async screenshot(): Promise<string | null> {
    this.warnRemoved('screenshot');
    return null;
  }

  /** Chart VLM reads moved to TvChartImageFetch (MiMo v2.5). */
  async readChart(prompt?: string): Promise<TvChartAnalysis | null> {
    this.warnRemoved('readChart');
    void prompt;
    return null;
  }

  async getVisibleBars(): Promise<TvBarData[]> {
    this.warnRemoved('getVisibleBars');
    return [];
  }

  async drawHorizontalLine(price: number, color?: string): Promise<boolean> {
    this.warnRemoved('drawHorizontalLine');
    void price;
    void color;
    return false;
  }

  async drawZone(topPrice: number, bottomPrice: number, color?: string): Promise<boolean> {
    this.warnRemoved('drawZone');
    void topPrice;
    void bottomPrice;
    void color;
    return false;
  }

  async drawTradeSetup(entry: number, stopLoss: number, takeProfit: number): Promise<boolean> {
    this.warnRemoved('drawTradeSetup');
    void entry;
    void stopLoss;
    void takeProfit;
    return false;
  }

  async drawFibonacci(startPrice: number, endPrice: number): Promise<boolean> {
    this.warnRemoved('drawFibonacci');
    void startPrice;
    void endPrice;
    return false;
  }

  async clearAllDrawings(): Promise<boolean> {
    this.warnRemoved('clearAllDrawings');
    return false;
  }

  /**
   * Zone drawing is a no-op — the VC daemon actuator no longer exists.
   * Zones are still computed and published in snapshots; only the
   * on-chart rendering is gone.
   */
  async drawZoneMap(zones: DXYZone[]): Promise<void> {
    this.warnRemoved('drawZoneMap');
    void zones;
  }

  async drawSetup(setup: TradeSetup): Promise<boolean> {
    this.warnRemoved('drawSetup');
    void setup;
    return false;
  }

  async drawBacktestResults(result: ReplayResult): Promise<void> {
    this.warnRemoved('drawBacktestResults');
    void result;
  }
}
