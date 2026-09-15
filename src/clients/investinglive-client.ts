/**
 * InvestingliveClient — OTC FX Option Expiry Data Pipeline Generator.
 *
 * TTE v5.3.3 spec requires REAL OTC FX option expiry data from investinglive.com
 * for P3 (Options OI) and P8 (Max Pain). The data source embeds option strikes
 * and notionals in an IMAGE on the expiry page — NOT in text/HTML tables.
 *
 * investinglive.com blocks headless browsers (CloudFront 403), so this client
 * does NOT make HTTP calls directly. Instead, it generates a multi-step
 * CaptureInstruction pipeline for the agent to execute via webfetch + VLM.
 *
 * The agent executes the pipeline:
 *   1. Fetch investinglive.com/Orders/ via webfetch
 *   2. Find today's expiry page URL
 *   3. Fetch the expiry page
 *   4. Extract embedded image URLs
 *   5. Download image(s) to /tmp/
 *   6. Call visual-cortex_analyze with extraction prompt
 *   7. Parse VLM output into OptionStrike[]
 *   8. Compute max pain from strikes
 *
 * All parsing and computation are done client-side after the agent returns VLM results.
 */

import { Logger } from '../utils/logger.js';
import { VlmExtractionEngine, type ReconciliationResult } from '../pipeline/vlm-extraction-engine.js';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  TTE_CRITICAL_NOTIONAL_B,
  TTE_SIGNIFICANT_NOTIONAL_B,
  INVESTINGLIVE_CACHE_TTL_MS,
  INVESTINGLIVE_MS_PER_MINUTE,
  INVESTINGLIVE_MILLIONS_TO_BILLIONS,
  INVESTINGLIVE_ISO_DATE_LENGTH,
  INVESTINGLIVE_DATE_PAD_LENGTH,
  TO_FIXED_2,
} from '../constants/trading-constants.js';

const log = new Logger('InvestingliveClient');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OptionStrike {
  pair: string;          // 'EUR/USD', 'GBP/USD', 'AUD/USD'
  strike: number;        // Price level
  notional: number;      // In billions USD
  expiry: string;        // ISO date
  type: 'call' | 'put' | 'unknown';
}

export interface OptionsExpiryData {
  date: string;          // Expiry date
  strikes: OptionStrike[];
  maxPain: number;       // Computed max pain price
  totalNotional: number; // Sum of all notionals
}

/** A single instruction step in the extraction pipeline. */
export interface CaptureInstruction {
  step: number;
  action: 'webfetch' | 'download_image' | 'vlm_analyze' | 'parse';
  description: string;
  url?: string;
  outputPath?: string;
  vlmPrompt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export class InvestingliveClient {
  /** Cached options data, populated by the agent pipeline. */
  private cachedData: OptionsExpiryData | null = null;
  private cachedAt = 0;
  private readonly cacheTtlMs = INVESTINGLIVE_CACHE_TTL_MS; // 1 hour

  /** FIX-001: VLM 3-pass extraction engine + last reconciliation audit. */
  private vlmEngine = new VlmExtractionEngine();
  private lastReconciliation: ReconciliationResult | null = null;

  /**
   * Get cached options data if available and fresh.
   * Returns null if no cached data or expired.
   */
  getCached(): OptionsExpiryData | null {
    if (this.cachedData && (Date.now() - this.cachedAt) < this.cacheTtlMs) {
      return this.cachedData;
    }
    return null;
  }

  /**
   * Store parsed options data from the agent pipeline.
   * Called after the pipeline completes and VLM output is parsed.
   */
  storeData(data: OptionsExpiryData): void {
    this.cachedData = data;
    this.cachedAt = Date.now();
    log.info(`Stored options data: ${data.strikes.length} strikes, max pain=${data.maxPain}, total=$${data.totalNotional.toFixed(TO_FIXED_2)}B`);
  }

  /**
   * Background refresh hook for the hourly data cycle.
   *
   * investinglive.com blocks headless browsers (CloudFront 403), so this
   * method CANNOT fetch data directly via HTTP. The actual extraction
   * requires the multi-step VLM pipeline (webfetch → download image → VLM
   * analyze → parse), which must be triggered by the agent via the
   * plutus-options-extract tool.
   *
   * This method instead:
   *   1. Checks if cached data is for today's session and still fresh.
   *   2. If stale or missing, logs a warning directing the agent to run
   *      plutus-options-extract to refresh P3 (Options OI) and P8 (Max Pain).
   *   3. Always resolves successfully (non-blocking).
   */
  async refreshAll(): Promise<void> {
    const cached = this.getCached();
    if (cached) {
      const ageMin = Math.round((Date.now() - this.cachedAt) / INVESTINGLIVE_MS_PER_MINUTE);
      log.debug(`Investinglive cache fresh: ${cached.strikes.length} strikes, age=${ageMin}min, max pain=${cached.maxPain}`);
      return;
    }

    const todayIso = new Date().toISOString().split('T')[0];
    const isStale = this.cachedData === null ||
      (this.cachedData.date !== todayIso && (Date.now() - this.cachedAt) > this.cacheTtlMs);

    if (isStale) {
      log.warn(
        `Investinglive options data is stale or missing for ${todayIso}. ` +
        `P3 (Options OI) and P8 (Max Pain) pillars need refresh. ` +
        `Agent should run plutus-options-extract to trigger the VLM extraction pipeline.`
      );
    }
  }

  /**
   * Generate the full extraction pipeline for the agent.
   * The agent must execute each step sequentially.
   */
  getExtractionPipeline(): { steps: CaptureInstruction[]; description: string } {
    const today = new Date();
    const dateStr = this.formatDateForUrl(today);
    const todayIso = today.toISOString().split('T')[0];

    const steps: CaptureInstruction[] = [
      {
        step: 1,
        action: 'webfetch',
        description: 'Fetch the investinglive.com Orders index page to find today expiry page link.',
        url: 'https://investinglive.com/Orders/',
      },
      {
        step: 2,
        action: 'webfetch',
        description: `Fetch today FX option expiry page (pattern: fx-option-expiries-for-${dateStr}). Extract any embedded image URLs from the page content.`,
        url: `https://investinglive.com/fx-option-expiries-for-${dateStr}`,
      },
      {
        step: 3,
        action: 'download_image',
        description: `Download the embedded expiry chart/screenshot image from the expiry page to ${path.join(os.tmpdir(), 'option-expiry.png')}. Use the image URL extracted from step 2.`,
        outputPath: path.join(os.tmpdir(), 'option-expiry.png'),
      },
      {
        step: 4,
        action: 'vlm_analyze',
        description: 'Analyze the downloaded option expiry image with VLM to extract all option strikes and notionals.',
        vlmPrompt: this.buildVlmExtractionPrompt(),
      },
      {
        step: 5,
        action: 'parse',
        description: 'Return the raw VLM text output. The InvestingliveClient.parseVlmOutput() method will parse it into structured OptionStrike[] data.',
      },
    ];

    return {
      steps,
      description: `OTC FX Option Expiry extraction pipeline for ${todayIso}. Execute steps 1-5 sequentially. The agent fetches pages via webfetch (investinglive blocks headless browsers), downloads embedded images, and uses VLM to extract option strike data from the image.`,
    };
  }

  /**
   * Parse VLM text output into structured option strikes.
   *
   * Expected VLM output formats (any of these):
   *   "EUR/USD 1.0850 $1.2B"
   *   "GBP/USD 1.2700 $850M"
   *   "1.1000 $2.1B EUR/USD"
   *
   * Parses pair, strike price, notional (converts M/B to billions).
   */
  parseVlmOutput(vlmText: string): OptionStrike[] {
    const strikes: OptionStrike[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Split into lines and process each
    const lines = vlmText.split(/[\n\r]+/);

    // Regex patterns:
    // Pattern 1: "EUR/USD 1.0850 $1.2B" or "GBP/USD 1.2700 $850M"
    // Pattern 2: "1.1000 $2.1B EUR/USD" (pair at end)
    // We also handle without $ sign
    const pairPattern = '(EUR/USD|GBP/USD|AUD/USD|USD/JPY|USD/CHF|USD/CAD|NZD/USD)';
    const pricePattern = '(\\d+\\.\\d{3,5})';
    const notionalPattern = '\\$?(\\d+(?:\\.\\d+)?)\\s*([BM])';

    // Combined: pair first, then price, then notional
    const rePairFirst = new RegExp(`${pairPattern}\\s+${pricePattern}\\s+${notionalPattern}`, 'gi');
    // Combined: price first, then notional, then pair
    const rePriceFirst = new RegExp(`${pricePattern}\\s+${notionalPattern}\\s+${pairPattern}`, 'gi');

    const seen = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try pair-first pattern
      let match: RegExpExecArray | null;
      rePairFirst.lastIndex = 0;
      while ((match = rePairFirst.exec(trimmed)) !== null) {
        const strike = this.buildStrike(match[1], match[2], match[3], match[4], today);
        if (strike && !seen.has(`${strike.pair}-${strike.strike}`)) {
          seen.add(`${strike.pair}-${strike.strike}`);
          strikes.push(strike);
        }
      }

      // Try price-first pattern
      rePriceFirst.lastIndex = 0;
      while ((match = rePriceFirst.exec(trimmed)) !== null) {
        const strike = this.buildStrike(match[5], match[1], match[2], match[3], today);
        if (strike && !seen.has(`${strike.pair}-${strike.strike}`)) {
          seen.add(`${strike.pair}-${strike.strike}`);
          strikes.push(strike);
        }
      }
    }

    log.debug(`Parsed ${strikes.length} option strikes from VLM output`);
    return strikes;
  }

  /**
   * Compute max pain from a list of option strikes.
   *
   * Max pain = the price where the highest total notional expires worthless.
   * For each candidate price (each unique strike), sum the notionals of all
   * options that would be worthless at that price. The strike with the MAXIMUM
   * total worthless notional is the max pain price.
   *
   * For calls: worthless if strike > settlement price
   * For puts: worthless if strike < settlement price
   * For unknown type: approximate using current price direction
   */
  computeMaxPain(strikes: OptionStrike[], currentPrice: number): number {
    if (strikes.length === 0) return 0;

    // Candidate prices: all unique strike levels
    const candidatePrices = [...new Set(strikes.map((s: OptionStrike) => s.strike))];

    let maxWorthless = 0;
    let maxPainPrice = currentPrice;

    for (const candidate of candidatePrices) {
      let worthlessNotional = 0;

      for (const strike of strikes) {
        if (strike.type === 'call') {
          // Call is worthless if strike > settlement (price ends below strike)
          if (strike.strike > candidate) {
            worthlessNotional += strike.notional;
          }
        } else if (strike.type === 'put') {
          // Put is worthless if strike < settlement (price ends above strike)
          if (strike.strike < candidate) {
            worthlessNotional += strike.notional;
          }
        } else {
          // Unknown type: approximate using current price direction
          if (strike.strike > currentPrice && strike.strike > candidate) {
            worthlessNotional += strike.notional;
          } else if (strike.strike < currentPrice && strike.strike < candidate) {
            worthlessNotional += strike.notional;
          }
        }
      }

      if (worthlessNotional > maxWorthless) {
        maxWorthless = worthlessNotional;
        maxPainPrice = candidate;
      }
    }

    log.debug(`Max pain computed: ${maxPainPrice} (worthless notional: $${maxWorthless.toFixed(TO_FIXED_2)}B)`);
    return maxPainPrice;
  }

  /**
   * Classify strikes into TTE three-tier system.
   *
   * >= $1.5B        = CRITICAL OPTION WALL
   * $850M - $1.499B = SIGNIFICANT MAGNET
   * < $850M         = EXCLUDED (goes to P3 conversion only)
   */
  classifyStrikes(strikes: OptionStrike[]): {
    critical: OptionStrike[];
    significant: OptionStrike[];
    excluded: OptionStrike[];
  } {
    const critical: OptionStrike[] = [];
    const significant: OptionStrike[] = [];
    const excluded: OptionStrike[] = [];

    for (const strike of strikes) {
      if (strike.notional >= TTE_CRITICAL_NOTIONAL_B) {
        critical.push(strike);
      } else if (strike.notional >= TTE_SIGNIFICANT_NOTIONAL_B) {
        significant.push(strike);
      } else {
        excluded.push(strike);
      }
    }

    return { critical, significant, excluded };
  }

  /**
   * Build a complete OptionsExpiryData object from raw strikes.
   * Computes max pain and total notional.
   */
  buildExpiryData(strikes: OptionStrike[], currentPrice: number): OptionsExpiryData {
    const totalNotional = strikes.reduce((sum: number, s: OptionStrike) => sum + s.notional, 0);
    const maxPain = this.computeMaxPain(strikes, currentPrice);
    const date = strikes.length > 0
      ? strikes[0].expiry
      : new Date().toISOString().split('T')[0];

    return {
      date,
      strikes,
      maxPain,
      totalNotional,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FIX-001: VLM 3-PASS EXTRACTION (Protocol A)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Run the TTE-mandated 3-pass VLM extraction pipeline on an option expiry image.
   *
   * Pass 1: Full extraction (all strikes at once)
   * Pass 2: Targeted per-strike verification
   * Pass 3: Cross-check (max notional + total sum)
   *
   * Reconciliation applies the 2/3 agreement rule — only ACCEPTED strikes
   * (>= 2 passes agree) are stored for downstream consumption.
   *
   * @param imageDataUrl - Base64-encoded image of the option expiry table
   * @param vlmAnalyzeFn - Injected VLM analyze function (visual-cortex proxy)
   * @returns Reconciliation result with full audit trail
   */
  async runVlm3PassExtraction(
    imageDataUrl: string,
    vlmAnalyzeFn: (image: string, prompt: string) => Promise<string>,
  ): Promise<ReconciliationResult> {
    const result = await this.vlmEngine.extract(imageDataUrl, vlmAnalyzeFn);
    this.lastReconciliation = result;

    const strikes: OptionStrike[] = this.vlmEngine.toOptionStrikes(result);

    this.storeData({
      date: new Date().toISOString().slice(0, INVESTINGLIVE_ISO_DATE_LENGTH),
      strikes,
      maxPain: result.maxPainPrice,
      totalNotional: result.totalNotional,
    });

    log.info(
      `VLM 3-pass complete: ${result.accepted.length} accepted, ` +
      `${result.disputed.length} disputed [UNCLEAR], ${result.rejected.length} rejected. ` +
      `Stored ${strikes.length} reconciled strikes.`
    );

    return result;
  }

  /** Get the last 3-pass reconciliation audit trail for compliance reporting. */
  getReconciliationAudit(): ReconciliationResult | null {
    return this.lastReconciliation;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Format a date for the investinglive.com URL pattern.
   * Pattern: DD-MMM-10am-new-york-cut-YYYYMMDD
   * Example: 15-jan-10am-new-york-cut-20250115
   */
  private formatDateForUrl(date: Date): string {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const dd = String(date.getDate()).padStart(INVESTINGLIVE_DATE_PAD_LENGTH, '0');
    const mmm = months[date.getMonth()];
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(INVESTINGLIVE_DATE_PAD_LENGTH, '0');
    const dd2 = String(date.getDate()).padStart(INVESTINGLIVE_DATE_PAD_LENGTH, '0');
    const yyyymmdd = `${yyyy}${mm}${dd2}`;
    return `${dd}-${mmm}-10am-new-york-cut-${yyyymmdd}`;
  }

  /**
   * Build the VLM extraction prompt for option expiry image analysis.
   */
  private buildVlmExtractionPrompt(): string {
    return [
      'You are analyzing an OTC FX option expiry chart/screenshot.',
      'Extract ALL option strikes listed in the image.',
      'For each strike, provide: the currency pair (EUR/USD, GBP/USD, AUD/USD, etc.),',
      'the strike price (e.g., 1.0850), and the notional amount (e.g., $1.2B, $850M).',
      'Format each strike on its own line like:',
      'EUR/USD 1.0850 $1.2B',
      'GBP/USD 1.2700 $850M',
      'List ALL strikes visible in the image. Do not skip any.',
    ].join(' ');
  }

  /**
   * Build a single OptionStrike from regex match groups.
   * Returns null if data is invalid.
   */
  private buildStrike(
    pair: string,
    priceStr: string,
    notionalStr: string,
    unit: string,
    expiry: string,
  ): OptionStrike | null {
    const strike = parseFloat(priceStr);
    if (isNaN(strike) || strike <= 0) return null;

    const notionalRaw = parseFloat(notionalStr);
    if (isNaN(notionalRaw) || notionalRaw <= 0) return null;

    // Convert to billions: B stays as-is, M divides by 1000
    const notional = unit.toUpperCase() === 'B' ? notionalRaw : notionalRaw / INVESTINGLIVE_MILLIONS_TO_BILLIONS;

    return {
      pair: pair.toUpperCase(),
      strike,
      notional,
      expiry,
      type: 'unknown',
    };
  }
}
