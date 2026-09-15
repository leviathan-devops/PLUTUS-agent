/**
 * EIClient — Weekly Petroleum Status Report.
 *
 * Fetches the EIA weekly petroleum summary as a PDF from ir.eia.gov and
 * extracts crude oil, gasoline, and distillate inventory changes. Major
 * shocks (|change| > 5M barrels) move energy-correlated FX pairs.
 *
 * The PDF is text-based (not scanned), so we extract the text stream from
 * the PDF content and search for numeric values adjacent to commodity
 * keywords. Cached for 6 hours (weekly publication cadence).
 *
 * No auth required.
 */

import type { Result } from '../types.js';
import type { EvidenceDB } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('EIClient');

const EIA_PDF_URL = 'https://ir.eia.gov/wpsr/wpsrsummary.pdf';

const MAJOR_SHOCK_THRESHOLD = 5.0; // million barrels

export interface PetroleumReport {
  date: string;
  crudeOilChange: number;    // In millions of barrels (negative = drawdown)
  gasolineChange: number;
  distillateChange: number;
  isMajorShock: boolean;     // |change| > 5 million barrels
}

export class EIClient {
  private latest: PetroleumReport | null = null;
  private lastFetch = 0;
  private readonly fetchIntervalMs = 6 * 60 * 60 * 1000; // 6 hours

  constructor(private readonly evidence: EvidenceDB | null = null) {}

  /**
   * Refresh the cached petroleum report if stale.
   */
  async refreshPetroleum(): Promise<Result<PetroleumReport>> {
    if (this.lastFetch !== 0 && Date.now() - this.lastFetch < this.fetchIntervalMs) {
      if (this.latest !== null) return { success: true, data: this.latest };
      return { success: false, error: 'No petroleum data available yet' };
    }

    try {
      const report = await this.fetchReport();
      this.latest = report;
      this.lastFetch = Date.now();
      this.recordEvidence('petroleum_refreshed', report);
      log.info(`Refreshed petroleum report (crude ${report.crudeOilChange}M, shock=${report.isMajorShock})`);
      return { success: true, data: report };
    } catch (e) {
      const msg = (e as Error).message;
      log.warn(`Failed to refresh petroleum report: ${msg}`);
      this.recordEvidence('petroleum_refresh_failed', { error: msg });
      return { success: false, error: msg };
    }
  }

  /**
   * True if the latest report flagged a major shock.
   */
  hasMajorShock(): boolean {
    return this.latest?.isMajorShock ?? false;
  }

  /**
   * Latest parsed report, or null if never refreshed.
   */
  getLatestReport(): PetroleumReport | null {
    return this.latest;
  }

  // ── Internals ──────────────────────────────────────────────────

  private async fetchReport(): Promise<PetroleumReport> {
    const res = await fetch(EIA_PDF_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Plutus/1.0.0)' },
    });
    if (!res.ok) {
      throw new Error(`EIA HTTP ${res.status}`);
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const text = this.extractPdfText(bytes);

    const crudeOilChange = this.findChange(text, ['crude oil', 'crude']);
    const gasolineChange = this.findChange(text, ['motor gasoline', 'gasoline']);
    const distillateChange = this.findChange(text, ['distillate', 'distillate fuel']);

    const maxAbs = Math.max(
      Math.abs(crudeOilChange),
      Math.abs(gasolineChange),
      Math.abs(distillateChange),
    );

    return {
      date: new Date().toISOString().slice(0, 10),
      crudeOilChange,
      gasolineChange,
      distillateChange,
      isMajorShock: maxAbs > MAJOR_SHOCK_THRESHOLD,
    };
  }

  /**
   * Find the first signed number (in millions of barrels) that appears
   * near one of the given keywords in the extracted text. Returns 0 when
   * nothing parseable is found.
   */
  private findChange(text: string, keywords: string[]): number {
    const lower = text.toLowerCase();
    const tokens = lower.split(/\s+/);

    for (const keyword of keywords) {
      const idx = tokens.findIndex((tok) => tok.includes(keyword));
      if (idx === -1) continue;
      // Scan a window after the keyword for the first signed number.
      const window = tokens.slice(idx, idx + 12);
      for (const tok of window) {
        const parsed = this.parseSignedNumber(tok);
        if (parsed !== null) return parsed;
      }
    }
    return 0;
  }

  /**
   * Parse a token like "-3.5", "(-2.1)", "+1.0" into a number, or null.
   */
  private parseSignedNumber(token: string): number | null {
    const cleaned = token.replace(/[(),]/g, '');
    const value = Number(cleaned);
    if (Number.isFinite(value) && cleaned !== '' && /[0-9]/.test(cleaned)) {
      return value;
    }
    return null;
  }

  /**
   * Best-effort text extraction from a text-based PDF.
   *
   * PDF text is shown via the `(literal) Tj` and `[(...)] TJ` operators.
   * We scan the binary content for these patterns and concatenate the
   * extracted literals. This is intentionally simple — it is sufficient
   * for the EIA summary which is produced from text, not scanned images.
   */
  private extractPdfText(bytes: Uint8Array): string {
    // Decode bytes to a binary string without interpreting UTF-8 (raw).
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }

    const pieces: string[] = [];
    // Match `( ... ) Tj` literals, allowing escaped parentheses.
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(binary)) !== null) {
      const decoded = this.unescapePdfString(match[1]);
      if (decoded.trim() !== '') pieces.push(decoded);
    }
    // Match array text operators `[ (a) (b) ] TJ`.
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(binary)) !== null) {
      const inner = match[1];
      const litRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)/g;
      let litMatch: RegExpExecArray | null;
      while ((litMatch = litRegex.exec(inner)) !== null) {
        const decoded = this.unescapePdfString(litMatch[1]);
        if (decoded.trim() !== '') pieces.push(decoded);
      }
    }

    return pieces.join(' ');
  }

  private unescapePdfString(s: string): string {
    return s
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
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
