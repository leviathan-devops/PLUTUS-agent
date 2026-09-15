/**
 * TreasuryClient — US Treasury auction data.
 *
 * Fetches auctioned securities from treasurydirect.gov. Auctions drive
 * short-term liquidity flows (especially Bill auctions). Cached for 1 hour
 * since the schedule and results change infrequently.
 *
 * No auth required. Response is JSON.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('TreasuryClient');

const AUCTION_URL = 'https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AuctionEvent {
  securityType: string;     // 'Bill' | 'Note' | 'Bond' | 'TIPS' | 'FRN'
  cusip: string;
  issueDate: string;
  maturityDate: string;
  interestRate?: number;
  totalPublic: number;       // Total public allotment in millions
}

interface AuctionApiResponseItem {
  securityType?: unknown;
  cusip?: unknown;
  issueDate?: unknown;
  maturityDate?: unknown;
  interestRate?: unknown;
  totalPublic?: unknown;
}

export class TreasuryClient {
  private auctions: AuctionEvent[] = [];
  private lastFetch = 0;
  private readonly fetchIntervalMs = 60 * 60 * 1000; // 1 hour

  constructor(private readonly evidence: EvidenceDB | null = null) {}

  /**
   * Refresh the cached auction list if stale.
   */
  async refreshAuctions(): Promise<Result<AuctionEvent[]>> {
    if (this.lastFetch !== 0 && Date.now() - this.lastFetch < this.fetchIntervalMs) {
      return { success: true, data: this.auctions };
    }

    try {
      this.auctions = await this.fetchAuctions();
      this.lastFetch = Date.now();
      this.recordEvidence('treasury_refreshed', { count: this.auctions.length });
      log.info(`Refreshed treasury auctions (${this.auctions.length} securities)`);
      return { success: true, data: this.auctions };
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`Failed to refresh treasury auctions: ${msg}`);
      this.recordEvidence('treasury_refresh_failed', { error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Auctions whose issue date falls within `daysAhead` days from now.
   */
  getUpcomingAuctions(daysAhead: number = 7): AuctionEvent[] {
    const now = Date.now();
    const horizon = now + daysAhead * DAY_MS;
    return this.auctions.filter((a) => {
      const t = Date.parse(a.issueDate);
      if (Number.isNaN(t)) return false;
      return t >= now && t <= horizon;
    });
  }

  /**
   * True if any auction has an issue date on the current calendar day (UTC).
   */
  hasAuctionToday(): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.auctions.some((a) => a.issueDate.slice(0, 10) === todayStr);
  }

  /**
   * Returns the cached auctions (no network).
   */
  getAuctions(): AuctionEvent[] {
    return this.auctions;
  }

  // ── Internals ──────────────────────────────────────────────────

  private async fetchAuctions(): Promise<AuctionEvent[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(AUCTION_URL, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`Treasury HTTP ${res.status}`);
    }

    const raw = await res.json() as unknown;
    const list = this.extractList(raw);
    const events: AuctionEvent[] = [];

    for (const item of list) {
      const securityType = typeof item.securityType === 'string' ? item.securityType : '';
      const cusip = typeof item.cusip === 'string' ? item.cusip : '';
      const issueDate = typeof item.issueDate === 'string' ? item.issueDate : '';
      const maturityDate = typeof item.maturityDate === 'string' ? item.maturityDate : '';
      if (!securityType || !issueDate) continue;
      events.push({
        securityType,
        cusip,
        issueDate,
        maturityDate,
        interestRate: typeof item.interestRate === 'number' ? item.interestRate : undefined,
        totalPublic: typeof item.totalPublic === 'number' ? item.totalPublic : 0,
      });
    }
    return events;
  }

  /**
   * TreasuryDirect may return a bare array or a wrapper object with an
   * entry list. Normalize to an array of item records.
   */
  private extractList(raw: unknown): AuctionApiResponseItem[] {
    if (Array.isArray(raw)) {
      return raw as AuctionApiResponseItem[];
    }
    if (raw !== null && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const entries = obj.entry ?? obj.securities ?? obj.data;
      if (Array.isArray(entries)) {
        return entries as AuctionApiResponseItem[];
      }
    }
    return [];
  }

  private recordEvidence(action: string, payload: Record<string, unknown>): void {
    if (this.evidence === null) return;
    try {
      this.evidence.recordEvidence('macro', action, payload);
    } catch (e) {
      log.warn(`Evidence write failed (${action}): ${(e as Error).message}`);
    }
  }
}
