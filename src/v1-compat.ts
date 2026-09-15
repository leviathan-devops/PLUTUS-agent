/**
 * v1-Compat Types — Local definitions for archived v1.0 tick-architecture components.
 *
 * These types were previously imported from now-archived modules:
 *   - pair-manager/pair-manager.ts
 *   - evidence-engine/evidence-db.ts
 *   - backtest/harness.ts
 *   - gate-engine/gate-engine.ts
 *   - shared/analysis-order-dispatcher.ts
 *
 * In the v2.0 report-first architecture, the brains are pure computation
 * functions and do not use a tick loop, messenger pub/sub, or BaseBrain
 * inheritance. These compat types allow the existing brain/client code to
 * compile without the v1.0 infrastructure.
 */

import type { OHLCBar, TradeSetup } from './types.js';
import type { WebSearchCommentary } from './clients/web-search-client.js';

// PairDataBundle (from pair-manager/pair-manager.ts)
export interface PairDataBundle {
  pair: string;
  ohlc: OHLCBar[];
  barchartMAs?: {
    ema9: number; ema20: number; ema50: number; ema100: number; ema200: number;
    sma9: number; sma20: number; sma50: number; sma100: number; sma200: number;
  };
  tvTechnicals?: {
    ema: Record<string, number>;
    sma: Record<string, number>;
  };
  analystConsensus?: {
    hwc: number | null;
    lwc: number | null;
    bias: 'bullish' | 'bearish' | 'neutral';
    sources: string[];
  };
  webSearchCommentary?: WebSearchCommentary;
  fetchedAt: number;
}

// EvidenceDB (from evidence-engine/evidence-db.ts) — minimal interface
export interface EvidenceDB {
  recordEvidence(channel: string, eventType: string, data: Record<string, unknown>): void;
  recordVLMFrame(data: Record<string, unknown>): void;
  close?(): void;
}

// ReplayResult (from backtest/harness.ts)
export interface ReplayTrade {
  setup: TradeSetup;
  entryBar: number;
  exitBar: number;
  exitReason: 'TP_HIT' | 'SL_HIT' | 'WEEKEND_CLOSE' | 'TIMEOUT';
  pnlPips: number;
}

export interface ReplayResult {
  weekOf: string;
  instrument: string;
  totalBars: number;
  totalSetups: number;
  passedSetups: number;
  executedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPips: number;
  profitFactor: number;
  maxDrawdownPips: number;
  averageWinPips: number;
  averageLossPips: number;
  bestTradePips: number;
  worstTradePips: number;
  trades: ReplayTrade[];
  summary: string;
}

// ReplayHarness (from backtest/harness.ts) — minimal interface
export interface ReplayHarness {
  runReplay(instrument: string, weekDate?: string): Promise<ReplayResult>;
}

// GateEngine (from gate-engine/gate-engine.ts) — minimal interface
export interface GateEngine {
  send(event: Record<string, unknown>): void;
  waitForGate(gate: string, timeoutMs: number): Promise<boolean>;
}

// BrainMessenger (from brains/brain-messenger.ts) — minimal interface
export interface MessengerEnvelope<T> {
  version: number;
  timestamp: number;
  data: T;
  source: string;
}

export interface BrainMessenger {
  publish<T>(channel: string, data: T, source: string): void;
  getLatest<T>(channel: string): MessengerEnvelope<T> | null;
  getVersion(channel: string): number;
}

/**
 * In-memory BrainMessenger implementation for v2.0 batch mode.
 * Stores envelopes in a Map — no ZeroMQ, no pub/sub.
 */
export class LocalBrainMessenger implements BrainMessenger {
  private channels: Map<string, MessengerEnvelope<unknown>> = new Map();
  private versions: Map<string, number> = new Map();

  publish<T>(channel: string, data: T, source: string): void {
    const version = (this.versions.get(channel) ?? 0) + 1;
    this.versions.set(channel, version);
    this.channels.set(channel, { version, timestamp: Date.now(), data, source });
  }

  getLatest<T>(channel: string): MessengerEnvelope<T> | null {
    const env = this.channels.get(channel);
    return (env as MessengerEnvelope<T> | undefined) ?? null;
  }

  getVersion(channel: string): number {
    return this.versions.get(channel) ?? 0;
  }
}

// AnalysisOrderDispatcher (from shared/analysis-order-dispatcher.ts)
export type AnalysisOrder = 0 | 1 | 2 | 3 | 4 | 5;

export interface AnalysisFinding {
  order: AnalysisOrder;
  rule: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  file?: string;
  line?: number;
  column?: number;
}

export interface AnalysisResult {
  findings: AnalysisFinding[];
  diagnostics: AnalysisFinding[];
  passed: boolean;
  ordersRun: AnalysisOrder[];
}

export interface AnalysisRule {
  name: string;
  order: AnalysisOrder;
  severity: AnalysisFinding['severity'];
  check: (content: string, context?: Record<string, unknown>) => AnalysisFinding | null;
  enabled: boolean;
}

export class AnalysisOrderDispatcher {
  private rules: AnalysisRule[] = [];
  private maxOrder: AnalysisOrder = 5;

  registerRule(rule: AnalysisRule): void {
    this.rules.push(rule);
  }

  setMaxOrder(order: AnalysisOrder): void {
    this.maxOrder = order;
  }

  analyze(content: string, context?: Record<string, unknown>): AnalysisResult {
    const findings: AnalysisFinding[] = [];
    const ordersRun: AnalysisOrder[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.order > this.maxOrder) continue;
      if (!ordersRun.includes(rule.order)) {
        ordersRun.push(rule.order);
      }
      try {
        const finding = rule.check(content, context);
        if (finding) {
          findings.push(finding);
        }
      } catch (err) {
        // Analysis rules are untrusted — swallow errors to keep pipeline alive
        void err;
      }
    }

    const passed = findings.every(f => f.severity === 'INFO' || f.severity === 'LOW');
    return { findings, diagnostics: findings, passed, ordersRun };
  }

  getRuleCount(): number {
    return this.rules.filter(r => r.enabled).length;
  }
}
