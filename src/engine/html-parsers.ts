/**
 * HTML Parsers — Extract MA values and analyst levels from bot-protected source HTML.
 *
 * These parsers operate on HTML fetched via fetchSource() from data-source-router.
 * They use regex-based extraction — no cheerio or DOM dependency.
 *
 * Sources handled:
 *   - TradingView technicals pages (EMA/SMA values)
 *   - Forex.com research page (HWC/LWC levels)
 *   - VLM fallback for SPA/canvas-rendered pages
 */

import { Logger } from '../utils/logger.js';
import { navigateAndScreenshot, vlmInfer } from './data-source-router.js';

const log = new Logger('HtmlParsers');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BarchartMAValues {
  ema9: number; ema20: number; ema50: number; ema100: number; ema200: number;
  sma9: number; sma20: number; sma50: number; sma100: number; sma200: number;
}

export interface TVTechnicalValues {
  ema: Record<string, number>;
  sma: Record<string, number>;
}

export interface ForexResearchValues {
  hwc: number | null;
  lwc: number | null;
  bias: 'bullish' | 'bearish' | 'neutral';
  sources: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the first numeric value found after a label match in raw HTML.
 * Strips HTML tags from the post-label region before number extraction.
 * Returns null if no number is found.
 */
function extractValueNearLabel(html: string, labelRegex: RegExp, windowChars = 400): number | null {
  const match = html.match(labelRegex);
  if (!match || match.index === undefined) {
    log.debug(`extractValueNearLabel: no match for pattern ${labelRegex.source.substring(0, 40)}`);
    return null;
  }

  const startPos = match.index + match[0].length;
  const region = html.slice(startPos, startPos + windowChars);
  const textOnly = region
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .trim();

  const numMatch = textOnly.match(/-?\d{1,6}(?:\.\d{1,6})?/);
  if (!numMatch) {
    log.debug(`extractValueNearLabel: label matched but no numeric value found within ${windowChars} chars after match`);
    return null;
  }

  const value = parseFloat(numMatch[0]);
  return Number.isFinite(value) ? value : null;
}

/** Build a regex for an EMA label with a specific period. Matches common formats. */
function emaLabel(period: number): RegExp {
  return new RegExp(
    `(?:exponential[\\s\\-]*(?:moving[\\s\\-]*)?(?:average|avg)?|ema)[\\s\\S]{0,20}?\\b${period}\\b`,
    'i',
  );
}

/** Build a regex for an SMA label with a specific period. */
function smaLabel(period: number): RegExp {
  return new RegExp(
    `(?:simple[\\s\\-]*(?:moving[\\s\\-]*)?(?:average|avg)?|sma)[\\s\\S]{0,20}?\\b${period}\\b`,
    'i',
  );
}

/** Strip HTML to plain text, removing scripts/styles/tags/entities. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Instrument-specific price patterns for level extraction. */
function getPricePattern(instrument: string): RegExp {
  switch (instrument) {
    case 'DXY':     return /\b1\d{2}\.\d{2,4}\b/g;   // 104.50
    case 'EUR/USD': return /\b1\.\d{4}\b/g;           // 1.0850
    case 'GBP/USD': return /\b1\.\d{4}\b/g;           // 1.2650
    case 'AUD/USD': return /\b0\.\d{4}\b/g;           // 0.6550
    default:        return /\b\d{1,5}\.\d{2,5}\b/g;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BARCHART PARSER
// ═══════════════════════════════════════════════════════════════════════════════

const MA_PERIODS = [9, 20, 50, 100, 200] as const;

/**
 * Parse Barchart cheat-sheet content for EMA/SMA values.
 *
 * CDP browser returns `document.body.innerText` (plain text), not HTML.
 * The cheat-sheet text typically has formats like:
 *
 *   Exponential Moving Average
 *   9 Day    1.1382
 *   20 Day   1.1356
 *   50 Day   1.1300
 *   ...
 *   Simple Moving Average
 *   9 Day    1.1380
 *   ...
 *
 * Or:
 *   EMA (9)   1.1382
 *   EMA (20)  1.1356
 *
 * This parser handles both text and HTML input (strips tags first for safety).
 * Returns undefined if no MA values could be extracted.
 */
export function parseBarchartMAs(html: string): BarchartMAValues | undefined {
  // Detect Cloudflare challenge pages
  if (html.includes('cf-challenge') || html.includes('cf-browser-verification') || html.includes('Access denied')) {
    log.warn('Barchart content appears to be a Cloudflare challenge page');
    return undefined;
  }

  // Normalize: if HTML, strip tags; otherwise treat as plain text
  const content = html.includes('<') && html.includes('>')
    ? stripHtml(html)
    : html.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ');

  log.info(`parseBarchartMAs: content length=${content.length}, first 200 chars: "${content.substring(0, 200).replace(/\n/g, '\\n')}"`);

  const result: Record<string, number> = {};
  let found = 0;

  // ── Strategy 1: Sectioned MA tables (Exponential Moving Average / Simple Moving Average headers) ──
  // Split text into sections by MA type headers
  const sections = splitIntoMASections(content);

  if (sections.ema || sections.sma) {
    for (const [sectionType, sectionText] of Object.entries(sections)) {
      if (!sectionText) continue;
      const prefix = sectionType; // 'ema' or 'sma'
      for (const period of MA_PERIODS) {
        const val = extractMAValueFromText(sectionText, period);
        if (val !== null) {
          result[`${prefix}${period}`] = val;
          found++;
        }
      }
    }
  }

  // ── Strategy 2: Inline "EMA (9) 1.1382" or "9-day EMA 1.1382" patterns ──
  if (found === 0) {
    for (const period of MA_PERIODS) {
      const eVal = extractMAFromInlinePattern(content, period, 'ema');
      const sVal = extractMAFromInlinePattern(content, period, 'sma');
      if (eVal !== null) { result[`ema${period}`] = eVal; found++; }
      if (sVal !== null) { result[`sma${period}`] = sVal; found++; }
    }
  }

  // ── Strategy 3: Generic "N-day" or "N period" + nearby price extraction ──
  if (found === 0) {
    for (const period of MA_PERIODS) {
      // Look for "9 Day" or "9-day" or "9 period" anywhere in text
      const periodRegex = new RegExp(`\\b${period}[\\s-]*(?:day|period|d)\\b`, 'i');
      const match = content.match(periodRegex);
      if (match && match.index !== undefined) {
        // Extract the first price-like number in the next 50 chars after the match
        const region = content.slice(match.index + match[0].length, match.index + match[0].length + 80);
        const priceMatch = region.match(/\d+\.\d{2,6}/);
        if (priceMatch) {
          const val = parseFloat(priceMatch[0]);
          // Determine if EMA or SMA from surrounding context
          const contextBefore = content.slice(Math.max(0, match.index - 200), match.index);
          const isEma = /exponential|ema/i.test(contextBefore);
          const isSma = /simple|sma/i.test(contextBefore);
          if (isEma && !result[`ema${period}`]) {
            result[`ema${period}`] = val;
            found++;
          }
          if (isSma && !result[`sma${period}`]) {
            result[`sma${period}`] = val;
            found++;
          }
        }
      }
    }
  }

  if (found === 0) {
    log.warn('No MA values found in Barchart content');
    return undefined;
  }

  // Fill missing values with 0
  for (const period of MA_PERIODS) {
    result[`ema${period}`] ??= 0;
    result[`sma${period}`] ??= 0;
  }

  log.info(`Barchart: extracted ${found} MA values`);

  // Validate that result has all required keys before casting (R8 source hygiene)
  const requiredKeys = ['ema9', 'ema20', 'ema50', 'ema100', 'ema200', 'sma9', 'sma20', 'sma50', 'sma100', 'sma200'];
  const missingKeys = requiredKeys.filter(k => !(k in result));
  if (missingKeys.length > 0) {
    log.warn(`Barchart: result missing keys after fill: ${missingKeys.join(', ')} — this should not happen`);
  }

  return result as unknown as BarchartMAValues;
}

/**
 * Split text into EMA and SMA sections based on section headers.
 * Barchart cheat sheets typically have "Exponential Moving Average" followed
 * by rows, then "Simple Moving Average" followed by more rows.
 */
function splitIntoMASections(text: string): { ema: string; sma: string } {
  const emaPattern = /exponential\s*moving\s*average\b/i;
  const smaPattern = /simple\s*moving\s*average\b/i;
  const emaAltPattern = /\bEMA\b/i;
  const smaAltPattern = /\bSMA\b/i;

  let emaSection = '';
  let smaSection = '';

  // Find EMA section
  const emaMatch = text.match(emaPattern) ?? text.match(emaAltPattern);
  const smaMatch = text.match(smaPattern) ?? text.match(smaAltPattern);

  if (emaMatch && emaMatch.index !== undefined) {
    const emaStart = emaMatch.index;
    const emaEnd = (smaMatch && smaMatch.index !== undefined && smaMatch.index > emaStart)
      ? smaMatch.index
      : Math.min(text.length, emaStart + 2000);
    emaSection = text.slice(emaStart, emaEnd);
  }

  if (smaMatch && smaMatch.index !== undefined) {
    const smaStart = smaMatch.index;
    smaSection = text.slice(smaStart, Math.min(text.length, smaStart + 2000));
  }

  return { ema: emaSection, sma: smaSection };
}

/**
 * Extract a single MA value from a text section.
 * Handles patterns like:
 *   "9 Day    1.1382"
 *   "9-day    1.1382"
 *   "9         1.1382"
 *   "(9)       1.1382"
 */
function extractMAValueFromText(sectionText: string, period: number): number | null {
  // Pattern: period number followed by optional qualifiers then a price
  const patterns = [
    // "9 Day 1.1382" or "9-Day 1.1382"
    new RegExp(`\\b${period}[\\s-]*day\\b[\\s\\$]*([0-9]+\\.[0-9]{2,6})`, 'i'),
    // "(9) 1.1382" or "[9] 1.1382"
    new RegExp(`\\(${period}\\)[\\s\\$]*([0-9]+\\.[0-9]{2,6})`, 'i'),
    // "9 period 1.1382"
    new RegExp(`\\b${period}[\\s-]*period\\b[\\s\\$]*([0-9]+\\.[0-9]{2,6})`, 'i'),
    // "9 1.1382" (bare number at line start)
    new RegExp(`^\\s*${period}\\s+([0-9]+\\.[0-9]{2,6})`, 'im'),
    // "9: 1.1382"
    new RegExp(`\\b${period}\\s*:\\s*([0-9]+\\.[0-9]{2,6})`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = sectionText.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (Number.isFinite(val) && val > 0) return val;
    }
  }

  log.debug(`extractMAValueFromText: no pattern matched period=${period} in section (${sectionText.length} chars)`);
  return null;
}

/**
 * Extract MA value from inline patterns like "EMA (9) 1.1382" or "9-day EMA 1.1382".
 */
function extractMAFromInlinePattern(text: string, period: number, type: 'ema' | 'sma'): number | null {
  const label = type === 'ema' ? 'exponential|ema' : 'simple|sma';

  // "EMA (9) 1.1382" or "EMA 9: 1.1382"
  const patterns = [
    new RegExp(`(?:${label})\\s*\\(?${period}\\)?\\s*[:\\s]+\\$?([0-9]+\\.[0-9]{2,6})`, 'i'),
    new RegExp(`(?:${label})\\s*[\\(\\[]${period}[\\)\\]]\\s*[:\\s]*\\$?([0-9]+\\.[0-9]{2,6})`, 'i'),
    // "9 day EMA 1.1382"
    new RegExp(`${period}\\s*(?:day|period)?\\s*(?:${label})\\s*[:\\s]*\\$?([0-9]+\\.[0-9]{2,6})`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (Number.isFinite(val) && val > 0) return val;
    }
  }

  log.debug(`extractMAFromInlinePattern: no pattern matched period=${period} type=${type} in text (${text.length} chars)`);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRADINGVIEW TECHNICALS PARSER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse TradingView technicals HTML for EMA/SMA values.
 *
 * TradingView technicals pages have structured data with labels like
 * "Exponential Moving Average (9)" followed by values.
 *
 * Returns undefined if no MA values could be extracted.
 */
export function parseTVTechnicals(html: string): TVTechnicalValues | undefined {
  if (html.includes('cf-challenge') || html.includes('Access denied')) {
    log.warn('TradingView HTML appears to be a challenge page');
    return undefined;
  }

  const ema: Record<string, number> = {};
  const sma: Record<string, number> = {};

  for (const period of MA_PERIODS) {
    const eVal = extractValueNearLabel(html, emaLabel(period));
    if (eVal !== null) ema[String(period)] = eVal;

    const sVal = extractValueNearLabel(html, smaLabel(period));
    if (sVal !== null) sma[String(period)] = sVal;
  }

  if (Object.keys(ema).length === 0 && Object.keys(sma).length === 0) {
    log.warn('No MA values found in TradingView HTML');
    return undefined;
  }

  log.info(`TradingView: extracted ${Object.keys(ema).length} EMA + ${Object.keys(sma).length} SMA values`);
  return { ema, sma };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOREX RESEARCH PARSER
// ═══════════════════════════════════════════════════════════════════════════════

const INSTRUMENT_KEYWORDS: Record<string, RegExp> = {
  'DXY':     /\b(?:DXY|US\s*Dollar\s*Index|Dollar\s*Index|USDX)\b/i,
  'EUR/USD': /\b(?:EUR\/?USD|EUR-USD|Euro(?:\s*Dollar)?|EUR)\b/i,
  'GBP/USD': /\b(?:GBP\/?USD|GBP-USD|Cable|Pound\s*Sterling|GBP)\b/i,
  'AUD/USD': /\b(?:AUD\/?USD|AUD-USD|Aussie(?:\s*Dollar)?|AUD)\b/i,
};

/**
 * Extract relevant text chunks mentioning the instrument.
 * Splits clean text into sentences and keeps those containing instrument keywords.
 */
function getInstrumentContext(cleanText: string, instrumentRegex: RegExp): string {
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  return sentences.filter((s) => instrumentRegex.test(s)).join(' ');
}

/**
 * Extract all price-like numbers near specified keywords in the given text.
 * Searches a ±200 char window around each keyword occurrence.
 */
function extractPricesNearKeywords(
  text: string,
  keywords: readonly string[],
  pricePattern: RegExp,
): number[] {
  const prices: number[] = [];
  const patternSource = pricePattern.source;

  for (const keyword of keywords) {
    const keywordRegex = new RegExp(keyword, 'gi');
    let match: RegExpExecArray | null;
    while ((match = keywordRegex.exec(text)) !== null) {
      const windowStart = Math.max(0, match.index - 150);
      const windowEnd = match.index + 200;
      const context = text.slice(windowStart, windowEnd);

      const localPattern = new RegExp(patternSource, 'g');
      let priceMatch: RegExpExecArray | null;
      while ((priceMatch = localPattern.exec(context)) !== null) {
        const price = parseFloat(priceMatch[0]);
        if (Number.isFinite(price)) prices.push(price);
      }
    }
  }

  return prices;
}

/**
 * Determine bias from bullish vs bearish keyword frequency in the text.
 * Uses 1.2x threshold to avoid flipping on near-equal counts.
 */
function extractBias(text: string): 'bullish' | 'bearish' | 'neutral' {
  const bullishWords = ['bullish', 'long', 'buy', 'upside', 'rally', 'higher', 'support', 'gain'];
  const bearishWords = ['bearish', 'short', 'sell', 'downside', 'decline', 'lower', 'resistance', 'loss'];

  let bullishCount = 0;
  let bearishCount = 0;

  for (const word of bullishWords) {
    const matches = text.match(new RegExp(`\\b${word}\\w*\\b`, 'gi'));
    if (matches) bullishCount += matches.length;
  }
  for (const word of bearishWords) {
    const matches = text.match(new RegExp(`\\b${word}\\w*\\b`, 'gi'));
    if (matches) bearishCount += matches.length;
  }

  if (bullishCount > bearishCount * 1.2) return 'bullish';
  if (bearishCount > bullishCount * 1.2) return 'bearish';
  return 'neutral';
}

/**
 * Extract article titles (from heading/anchor tags) mentioning the instrument.
 */
function extractArticleTitles(html: string, instrumentRegex: RegExp): string[] {
  const titles: string[] = [];
  const titleRegex = /<(?:h[1-4]|a)[^>]*>([\s\S]*?)<\/(?:h[1-4]|a)>/gi;
  let match: RegExpExecArray | null;

  while ((match = titleRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text.length > 15 && instrumentRegex.test(text)) {
      titles.push(text);
    }
  }

  return [...new Set(titles)].slice(0, 10);
}

/**
 * Parse forex.com research page HTML for HWC/LWC levels for a specific instrument.
 *
 * The research page is shared across instruments — this function filters
 * content by instrument keyword matching, then extracts price levels near
 * resistance/support keywords.
 *
 * Returns null hwc/lwc if no levels found.
 */
export function parseForexResearch(html: string, instrument: string): ForexResearchValues | undefined {
  const instrumentRegex = INSTRUMENT_KEYWORDS[instrument];
  if (!instrumentRegex) {
    log.warn(`Unknown instrument for forex research: ${instrument}`);
    return undefined;
  }

  const cleanText = stripHtml(html);
  const context = getInstrumentContext(cleanText, instrumentRegex);
  const pricePattern = getPricePattern(instrument);

  // HWC: highest price near resistance/target keywords
  const resistancePrices = extractPricesNearKeywords(
    context.length > 0 ? context : cleanText,
    ['resistance', 'target', 'high', 'ceiling', 'supply'],
    pricePattern,
  );
  const hwc = resistancePrices.length > 0 ? Math.max(...resistancePrices) : null;

  // LWC: lowest price near support/low keywords
  const supportPrices = extractPricesNearKeywords(
    context.length > 0 ? context : cleanText,
    ['support', 'low', 'floor', 'bottom', 'demand'],
    pricePattern,
  );
  const lwc = supportPrices.length > 0 ? Math.min(...supportPrices) : null;

  if (hwc === null && lwc === null) {
    log.info(`No HWC/LWC levels found for ${instrument} in forex research HTML`);
  }

  // Bias from keyword frequency in instrument context
  const bias = extractBias(context.length > 0 ? context : cleanText);

  // Article titles as sources
  const sources = extractArticleTitles(html, instrumentRegex);

  return { hwc, lwc, bias, sources };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VLM-BASED EXTRACTION (Fallback for SPA/Canvas-rendered pages)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract a numeric value for an MA label from VLM text output.
 * Handles patterns like "EMA9=1.0850", "EMA 9: 1.0850", "Exponential 9 1.0850".
 */
function extractMAFromVlmText(text: string, patterns: string[]): number | undefined {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern + '[\\s:=\\s]*([\\d.]+)', 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (Number.isFinite(val) && val > 0) return val;
    }
  }
  log.debug(`extractMAFromVlmText: no patterns matched (${patterns.length} patterns tried)`);
  return undefined;
}

/**
 * Parse MA values from VLM text output into BarchartMAValues.
 */
function parseMAFromVlmText(text: string): BarchartMAValues | undefined {
  log.info(`parseMAFromVlmText: parsing VLM output (${text.length} chars)`);

  const ema9  = extractMAFromVlmText(text, ['EMA.?9', 'Exponential.*9', 'EMA\\s*\\(?9\\)?']);
  const ema20 = extractMAFromVlmText(text, ['EMA.?20', 'Exponential.*20', 'EMA\\s*\\(?20\\)?']);
  const ema50 = extractMAFromVlmText(text, ['EMA.?50', 'Exponential.*50', 'EMA\\s*\\(?50\\)?']);
  const ema100= extractMAFromVlmText(text, ['EMA.?100', 'Exponential.*100', 'EMA\\s*\\(?100\\)?']);
  const ema200= extractMAFromVlmText(text, ['EMA.?200', 'Exponential.*200', 'EMA\\s*\\(?200\\)?']);
  const sma9  = extractMAFromVlmText(text, ['SMA.?9', 'Simple.*9', 'SMA\\s*\\(?9\\)?']);
  const sma20 = extractMAFromVlmText(text, ['SMA.?20', 'Simple.*20', 'SMA\\s*\\(?20\\)?']);
  const sma50 = extractMAFromVlmText(text, ['SMA.?50', 'Simple.*50', 'SMA\\s*\\(?50\\)?']);
  const sma100= extractMAFromVlmText(text, ['SMA.?100', 'Simple.*100', 'SMA\\s*\\(?100\\)?']);
  const sma200= extractMAFromVlmText(text, ['SMA.?200', 'Simple.*200', 'SMA\\s*\\(?200\\)?']);

  // Require at least one value
  const hasAny = [ema9, ema20, ema50, ema100, ema200, sma9, sma20, sma50, sma100, sma200].some(v => v !== undefined);
  if (!hasAny) {
    log.warn('VLM text contained no MA values');
    return undefined;
  }

  const result: BarchartMAValues = {
    ema9: ema9 ?? 0, ema20: ema20 ?? 0, ema50: ema50 ?? 0, ema100: ema100 ?? 0, ema200: ema200 ?? 0,
    sma9: sma9 ?? 0, sma20: sma20 ?? 0, sma50: sma50 ?? 0, sma100: sma100 ?? 0, sma200: sma200 ?? 0,
  };

  const found = [ema9, ema20, ema50, ema100, ema200, sma9, sma20, sma50, sma100, sma200].filter(v => v !== undefined).length;
  log.info(`VLM extracted ${found} MA values`);
  return result;
}

/**
 * Extract Forex research HWC/LWC levels via VLM screenshot extraction.
 *
 * Navigates headed browser to Forex.com research page, screenshots,
 * runs VLM inference to extract HWC/LWC/bias.
 *
 * @param instrument The instrument pair to extract levels for
 * @returns ForexResearchValues or undefined
 */
export async function parseForexResearchViaVLM(instrument: string): Promise<ForexResearchValues | undefined> {
  log.info(`parseForexResearchViaVLM: Attempting VLM extraction for ${instrument}`);

  const prompt =
    `This is a Forex.com market research page. Extract the High Wall Call (HWC) and ` +
    `Low Wall Call (LWC) levels for ${instrument}. ` +
    `HWC is the highest resistance/target level. LWC is the lowest support/floor level. ` +
    `Also determine the overall bias (bullish, bearish, or neutral). ` +
    `Format: HWC=number, LWC=number, BIAS=bullish|bearish|neutral`;

  // VC daemon REMOVED — screenshot via headed browser CDP, VLM via MiMo v2.5
  const screenshotPath = await navigateAndScreenshot(
    'https://www.forex.com/en-us/market-analysis/latest-research/',
    12_000,
  );
  if (!screenshotPath) {
    log.warn('parseForexResearchViaVLM: screenshot failed');
    return undefined;
  }

  const vlmText = await vlmInfer(screenshotPath, prompt);
  if (!vlmText) {
    log.warn(`parseForexResearchViaVLM: VLM extraction returned null for ${instrument} — VLM server unavailable`);
    return undefined;
  }

  // Parse HWC/LWC from VLM output
  const hwcMatch = vlmText.match(/HWC\s*[=:]\s*([\d.]+)/i);
  const lwcMatch = vlmText.match(/LWC\s*[=:]\s*([\d.]+)/i);
  const biasMatch = vlmText.match(/BIAS\s*[=:]\s*(bullish|bearish|neutral)/i);

  const hwc = hwcMatch ? parseFloat(hwcMatch[1]) : null;
  const lwc = lwcMatch ? parseFloat(lwcMatch[1]) : null;
  const biasRaw = biasMatch ? biasMatch[1].toLowerCase() : 'neutral';
  // Validate that the extracted bias is one of the allowed values (R8 source hygiene)
  const bias: 'bullish' | 'bearish' | 'neutral' =
    biasRaw === 'bullish' || biasRaw === 'bearish' || biasRaw === 'neutral'
      ? biasRaw
      : 'neutral';

  if (hwc === null && lwc === null) {
    log.warn(`VLM found no HWC/LWC levels for ${instrument}`);
    return undefined;
  }

  log.info(`VLM Forex: ${instrument} HWC=${hwc ?? '—'}, LWC=${lwc ?? '—'}, bias=${bias}`);
  return { hwc, lwc, bias, sources: ['VLM-Visual'] };
}
