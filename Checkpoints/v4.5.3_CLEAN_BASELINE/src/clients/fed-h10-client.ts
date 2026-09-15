/**
 * FedH10Client — Federal Reserve H.10 exchange rates.
 *
 * Scrapes the Fed H.10 current release HTML for the six DXY component
 * currencies (EUR, JPY, GBP, CAD, SEK, CHF) and computes the US Dollar
 * Index from the official ICE formula. Cached for 24 hours.
 *
 * No auth required. Response is HTML; tables are parsed defensively.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('FedH10Client');

const H10_URL = 'https://www.federalreserve.gov/releases/h10/current/';

// The six DXY basket currencies (ISO 4217).
const DXY_CURRENCIES = ['EUR', 'JPY', 'GBP', 'CAD', 'SEK', 'CHF'] as const;

// ICE US Dollar Index weights and base value.
const DXY_BASE = 50.14348112;
const DXY_WEIGHTS: Record<string, number> = {
  EUR: -0.576,
  JPY: 0.136,
  GBP: -0.119,
  CAD: 0.091,
  SEK: 0.042,
  CHF: 0.036,
};

export interface ExchangeRate {
  currency: string;          // 'EUR', 'JPY', 'GBP', 'CAD', 'SEK', 'CHF'
  rate: number;
  date: string;
}

/**
 * FIX-010: Result of a DXY computation with fallback awareness.
 * When component data is incomplete and supplementary rates are used,
 * the confidence band is widened to reflect reduced certainty.
 */
export interface DXYWithConfidence {
  dxy: number;
  confidence: number;            // 1.0 = all components from H.10, lower if fallback
  missingComponents: string[];   // currencies not found in H.10
  fallbackUsed: string[];        // currencies filled from supplementary sources
  confidenceBandLow: number;     // dxy - widenedBand
  confidenceBandHigh: number;    // dxy + widenedBand
  source: 'h10_full' | 'h10_with_fallback' | 'fallback_only';
}

export class FedH10Client {
  private rates: Map<string, ExchangeRate> = new Map();
  private reportDate: string = '';
  private lastFetch = 0;
  private readonly fetchIntervalMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private readonly evidence: EvidenceDB | null = null) {}

  /**
   * Refresh the cached exchange rates if stale.
   */
  async refreshRates(): Promise<Result<ExchangeRate[]>> {
    if (this.lastFetch !== 0 && Date.now() - this.lastFetch < this.fetchIntervalMs) {
      return { success: true, data: Array.from(this.rates.values()) };
    }

    try {
      const html = await this.fetchHtml();
      const parsed = this.parseRates(html);
      this.rates.clear();
      for (const rate of parsed) {
        this.rates.set(rate.currency, rate);
      }
      this.lastFetch = Date.now();
      this.recordEvidence('h10_refreshed', { currencies: this.rates.size, date: this.reportDate });
      log.info(`Refreshed H.10 rates (${this.rates.size} currencies, date ${this.reportDate})`);
      return { success: true, data: Array.from(this.rates.values()) };
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`Failed to refresh H.10 rates: ${msg}`);
      this.recordEvidence('h10_refresh_failed', { error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * Get the latest rate for a single currency code, or null.
   */
  getRate(currency: string): number | null {
    return this.rates.get(currency)?.rate ?? null;
  }

  /**
   * All cached rates keyed by currency code.
   */
  getAllRates(): Map<string, number> {
    const out = new Map<string, number>();
    for (const [currency, entry] of this.rates) {
      out.set(currency, entry.rate);
    }
    return out;
  }

  /**
   * Compute the US Dollar Index from the six component rates using the
   * official ICE geometric-mean formula. Returns null if any component
   * is missing or non-positive.
   */
  computeDXY(): number | null {
    let product = DXY_BASE;
    for (const currency of DXY_CURRENCIES) {
      const rate = this.rates.get(currency)?.rate;
      if (rate === undefined || rate <= 0) return null;
      const weight = DXY_WEIGHTS[currency];
      if (weight === undefined) return null;
      product *= Math.pow(rate, weight);
    }
    return product;
  }

  /**
   * FIX-010: Identify which DXY components are missing from the cached H.10 data.
   * @returns Array of missing currency codes (subset of EUR, JPY, GBP, CAD, SEK, CHF)
   */
  getMissingComponents(): string[] {
    const missing: string[] = [];
    for (const currency of DXY_CURRENCIES) {
      const rate = this.rates.get(currency)?.rate;
      if (rate === undefined || rate <= 0) {
        missing.push(currency);
      }
    }
    return missing;
  }

  /**
   * FIX-010: H.10 Fallback Procedure.
   *
   * Per TTE v5.3.3 Pillar 3 Step 3: If Fed H.10 data is incomplete for
   * specific component pairs, search for supplementary spot rates and
   * widen confidence bands.
   *
   * This method accepts supplementary spot rates for missing components,
   * merges them with the H.10 rates, and computes DXY with a widened
   * confidence band proportional to how many components used fallback data.
   *
   * @param supplementaryRates - Spot rates keyed by currency code
   *   (e.g., { 'SEK': 10.85, 'CHF': 0.88 }) for missing components
   * @returns DXY with confidence metadata, or null if still incomplete
   */
  computeDXYWithFallback(
    supplementaryRates: Record<string, number>,
  ): DXYWithConfidence | null {
    const missing = this.getMissingComponents();
    const fallbackUsed: string[] = [];
    const allRates: Record<string, number> = {};

    // Start with H.10 rates
    for (const currency of DXY_CURRENCIES) {
      const rate = this.rates.get(currency)?.rate;
      if (rate !== undefined && rate > 0) {
        allRates[currency] = rate;
      }
    }

    // Fill missing components from supplementary rates
    for (const currency of missing) {
      const suppRate = supplementaryRates[currency];
      if (suppRate !== undefined && suppRate > 0) {
        allRates[currency] = suppRate;
        fallbackUsed.push(currency);
        log.warn(`FIX-010: H.10 missing ${currency}, using supplementary rate ${suppRate}`);
      }
    }

    // Check if we still have missing components
    const stillMissing = DXY_CURRENCIES.filter(c => allRates[c] === undefined || allRates[c] <= 0);

    // Compute DXY from merged rates
    let product = DXY_BASE;
    let computationComplete = true;
    for (const currency of DXY_CURRENCIES) {
      const rate = allRates[currency];
      const weight = DXY_WEIGHTS[currency];
      if (rate === undefined || rate <= 0 || weight === undefined) {
        computationComplete = false;
        break;
      }
      product *= Math.pow(rate, weight);
    }

    if (!computationComplete || stillMissing.length > 0) {
      log.error(`FIX-010: Cannot compute DXY even with fallback — missing: ${stillMissing.join(', ')}`);
      return null;
    }

    // Confidence: 1.0 if all from H.10, reduced proportionally per fallback component
    const fallbackRatio = fallbackUsed.length / DXY_CURRENCIES.length;
    const confidence = Math.max(0.5, 1.0 - fallbackRatio * 0.5);

    // Confidence band widens with fallback usage
    // Base band: 0.05 DXY points; each fallback component adds 0.10
    const bandWidth = 0.05 + fallbackUsed.length * 0.10;

    const source: DXYWithConfidence['source'] =
      fallbackUsed.length === 0 ? 'h10_full'
      : missing.length === DXY_CURRENCIES.length ? 'fallback_only'
      : 'h10_with_fallback';

    log.info(`FIX-010: DXY computed with ${source} (confidence ${(confidence * 100).toFixed(0)}%, band ±${bandWidth.toFixed(2)})`);

    return {
      dxy: product,
      confidence,
      missingComponents: missing,
      fallbackUsed,
      confidenceBandLow: product - bandWidth,
      confidenceBandHigh: product + bandWidth,
      source,
    };
  }

  // ── Internals ──────────────────────────────────────────────────

  private async fetchHtml(): Promise<string> {
    const res = await fetch(H10_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Plutus/1.0.0)' },
    });
    if (!res.ok) {
      throw new Error(`Fed H.10 HTTP ${res.status}`);
    }
    return res.text();
  }

  /**
   * Parse the H.10 HTML. The release uses <table> elements with one row
   * per currency. We scan all table rows for a leading currency code and
   * capture the first positive numeric rate found in the row.
   *
   * The Fed publishes most rates as "foreign currency per USD". EUR and
   * GBP are quoted as "USD per unit of foreign currency". We normalize to
   * "foreign currency per USD" (the form the DXY formula expects).
   */
  private parseRates(html: string): ExchangeRate[] {
    const found: ExchangeRate[] = [];
    const rows = this.extractTableRows(html);

    for (const row of rows) {
      const code = this.matchCurrency(row);
      if (code === null) continue;
      const rate = this.extractFirstRate(row);
      if (rate === null) continue;
      const normalized = this.normalizePerUsd(code, rate);
      found.push({
        currency: code,
        rate: normalized,
        date: this.reportDate || new Date().toISOString().slice(0, 10),
      });
    }

    // Deduplicate by currency, keeping the first occurrence per code.
    const seen = new Set<string>();
    const deduped: ExchangeRate[] = [];
    for (const entry of found) {
      if (seen.has(entry.currency)) continue;
      seen.add(entry.currency);
      deduped.push(entry);
    }
    return deduped;
  }

  private matchCurrency(row: string): string | null {
    for (const currency of DXY_CURRENCIES) {
      // Match whole-word currency codes (avoid matching substrings).
      const regex = new RegExp(`\\b${currency}\\b`);
      if (regex.test(row)) return currency;
    }
    return null;
  }

  private extractFirstRate(row: string): number | null {
    // Strip HTML tags, then find the first parseable number with a decimal.
    const stripped = row.replace(/<[^>]*>/g, ' ');
    const tokens = stripped.split(/\s+/);
    for (const token of tokens) {
      const cleaned = token.replace(/[,]/g, '');
      if (/^\d+(\.\d+)?$/.test(cleaned)) {
        const value = Number(cleaned);
        if (Number.isFinite(value) && value > 0) return value;
      }
    }
    return null;
  }

  /**
   * Convert a raw quote to "foreign currency per USD".
   * EUR and GBP are published as USD-per-foreign (must invert). The rest
   * are already foreign-per-USD.
   */
  private normalizePerUsd(currency: string, rate: number): number {
    if (currency === 'EUR' || currency === 'GBP') {
      return rate <= 0 ? rate : 1 / rate;
    }
    return rate;
  }

  /**
   * Extract the text of all table rows in the document.
   */
  private extractTableRows(html: string): string[] {
    const rows: string[] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match: RegExpExecArray | null;
    while ((match = rowRegex.exec(html)) !== null) {
      const inner = match[1];
      if (inner !== undefined) rows.push(inner);
    }
    // Capture the release date if present (e.g. "October 7, 2024").
    const dateMatch = html.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/i);
    if (dateMatch !== null && dateMatch[0] !== undefined) {
      this.reportDate = dateMatch[0];
    }
    return rows;
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
