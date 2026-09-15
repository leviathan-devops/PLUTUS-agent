/**
 * FREDClient — Federal Reserve Reverse Repo (RRP) balance.
 *
 * Fetches the ON RRP total from FRED as CSV (series RRPONTTLD). RRP balance
 * is a liquidity proxy: a falling balance signals reserves being deployed,
 * which is risk-on for equities and risk-off for the dollar. Cached 1 hour.
 *
 * No auth required. Response is CSV.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('FREDClient');

const FRED_CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=RRPONTTLD';

// Trend classification threshold (billions). Differences below this are
// considered noise and reported as 'stable'.
const TREND_THRESHOLD = 5.0;

export interface RRPBalance {
  date: string;
  balance: number;          // In billions USD
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface ParsedRow {
  date: string;
  value: number;
}

export class FREDClient {
  private current: RRPBalance | null = null;
  private history: ParsedRow[] = [];
  private lastFetch = 0;
  private readonly fetchIntervalMs = 60 * 60 * 1000; // 1 hour

  constructor(private readonly evidence: EvidenceDB | null = null) {}

  /**
   * Refresh the cached RRP balance if stale.
   */
  async refreshRRP(): Promise<Result<RRPBalance>> {
    if (this.lastFetch !== 0 && Date.now() - this.lastFetch < this.fetchIntervalMs) {
      if (this.current !== null) return { success: true, data: this.current };
      return { success: false, error: 'No RRP data available yet' };
    }

    try {
      const rows = await this.fetchRRP();
      this.history = rows;
      if (rows.length === 0) {
        throw new Error('RRP CSV contained no data rows');
      }
      const latest = rows[rows.length - 1];
      this.current = {
        date: latest.date,
        balance: latest.value,
        trend: this.computeTrend(rows),
      };
      this.lastFetch = Date.now();
      this.recordEvidence('rrp_refreshed', this.current);
      log.info(`Refreshed RRP balance: ${this.current.balance}B (${this.current.trend})`);
      return { success: true, data: this.current };
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`Failed to refresh RRP: ${msg}`);
      this.recordEvidence('rrp_refresh_failed', { error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Latest RRP balance in billions, or null if never refreshed.
   */
  getCurrentRRP(): number | null {
    return this.current?.balance ?? null;
  }

  /**
   * Latest trend classification.
   */
  getTrend(): 'increasing' | 'decreasing' | 'stable' {
    return this.current?.trend ?? 'stable';
  }

  // ── Internals ──────────────────────────────────────────────────

  private computeTrend(rows: ParsedRow[]): 'increasing' | 'decreasing' | 'stable' {
    if (rows.length < 2) return 'stable';
    // Compare the average of the last 3 readings against the prior 3.
    const tail = rows.slice(-3);
    const prev = rows.slice(-6, -3);
    if (prev.length === 0) {
      const diff = tail[tail.length - 1].value - tail[0].value;
      return this.classify(diff);
    }
    const tailAvg = this.avg(tail.map((r) => r.value));
    const prevAvg = this.avg(prev.map((r) => r.value));
    return this.classify(tailAvg - prevAvg);
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
  }

  private classify(diff: number): 'increasing' | 'decreasing' | 'stable' {
    if (diff > TREND_THRESHOLD) return 'increasing';
    if (diff < -TREND_THRESHOLD) return 'decreasing';
    return 'stable';
  }

  private async fetchRRP(): Promise<ParsedRow[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(FRED_CSV_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/csv,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`FRED HTTP ${res.status}`);
    }

    const text = await res.text();
    return this.parseCsv(text);
  }

  /**
   * Parse FRED CSV: `observation_date,RRPONTTLD\n2024-01-01,800.5\n`.
   * Skips the header and any rows with '.' (FRED missing-value marker).
   */
  private parseCsv(text: string): ParsedRow[] {
    const rows: ParsedRow[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined || line.trim() === '') continue;
      if (i === 0 && line.toLowerCase().startsWith('observation_date')) continue;
      const parts = line.split(',');
      const date = parts[0]?.trim();
      const rawValue = parts[1]?.trim();
      if (!date || rawValue === undefined || rawValue === '' || rawValue === '.') continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      rows.push({ date, value });
    }
    return rows;
  }

  private recordEvidence(action: string, payload: object): void {
    if (this.evidence === null) return;
    try {
      this.evidence.recordEvidence('macro', action, payload as Record<string, unknown>);
    } catch (e) {
      log.warn(`Evidence write failed (${action}): ${(e as Error).message}`);
    }
  }
}
