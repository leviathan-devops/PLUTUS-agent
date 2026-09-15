/**
 * Protocol A Executor — Autonomous OTC FX Options extraction.
 *
 * TTE v5.3.3 Pipeline:
 *   1. Check in-memory cache (TTL: 12 hours). If fresh, return cached.
 *   2. Fetch INDEX page (investinglive.com/Orders/) — a list of date links.
 *   3. Parse index for date-specific sub-page links (fx-option-expiries-for-...).
 *   4. Navigate to each sub-page -> find embedded data image -> download.
 *   5. Run 3-pass VLM extraction on the image (full -> targeted -> cross-check).
 *   6. Reconcile 3 passes (2/3 agreement rule) + merge regex text strikes.
 *   7. Apply FilterCheckpoint (pair filter + notional tier classification).
 *   8. Cache result, return data.
 *
 * FALLBACK: If VC daemon is unreachable, fall back to regex HTML parsing
 * of the page content (old behavior).
 *
 * CRITICAL: This function NEVER throws. It returns null on any failure.
 */

import { Logger } from '../utils/logger.js';
import { fetchSource, fetchUrlViaCDP, fetchHtmlViaCDP, downloadImage, navigateAndScreenshot, navigateAndScreenshotElement, findOptionsTableImage, vlmInfer } from './data-source-router.js';
import { FilterCheckpoint } from '../pipeline/filter-checkpoint.js';
import type { OptionStrike } from '../clients/investinglive-client.js';

const log = new Logger('ProtocolA');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OptionStrikeData {
  pair: string;
  strike: number;
  notional: number;
  expiry: string;
  tier: 'CRITICAL_WALL' | 'SIGNIFICANT_MAGNET' | 'EXCLUDED';
}

export interface OptionExpiryData {
  strikes: OptionStrikeData[];
  fetchedAt: number;
  source: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE — 12-hour TTL
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
let cachedData: OptionExpiryData | null = null;
let cachedAt = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const ALLOWED_PAIRS = new Set(['EUR/USD', 'GBP/USD', 'AUD/USD']);

/**
 * VLM 3-pass prompts per TTE v5.3.3 spec.
 * Pass 1: Full extraction. Pass 2: Targeted verification. Pass 3: Cross-check.
 *
 * Pass 1 is tuned for the EMBEDDED RASTER IMAGE of the FX option expiries
 * table (colored grid, one column per currency pair). It demands a per-pair
 * JSON object so parseVlmOutput can map strikes -> pairs deterministically.
 */
const VLM_PASS1_PROMPT =
  'Analyze this FX option expiries table image. For each currency pair column, extract:\n' +
  '- The strike price (e.g., 1.1350, 161.00, 1.3320)\n' +
  '- The notional value (e.g., €1.1bn, $2.1bn, €755m)\n' +
  '- Whether it is bold (highlighted as a key expiry)\n' +
  'Return ONLY JSON in this exact shape: ' +
  '{ "EUR/USD": [{"strike": 1.1350, "notional": "€1.1bn", "bold": false}, ...], "USD/JPY": [...], ... }. ' +
  'Do NOT hallucinate any values — only include what is actually visible in the image. ' +
  'If a value is unclear, omit that row.';

/**
 * CSS selector for the options table IMAGE element on investinglive sub-pages.
 * Passed to navigateAndScreenshotElement as the primary selector (it also has
 * multi-strategy fallbacks if this does not match).
 */
const OPTIONS_IMAGE_SELECTOR =
  'img[data-src*="size900"], img[data-src*="FXO"], img[data-src*="expiry"], ' +
  'img[src*="size900"], img[src*="FXO"], img[src*="expiry"], ' +
  'img[alt*="FXO"], img[alt*="option"], img[alt*="expiry"]';

const VLM_PASS2_PROMPT =
  'Verify these specific data points from the image. Answer ONLY with the exact digits you see — no guessing: ' +
  '1) List every EUR/USD strike and its exact notional. ' +
  '2) List every USD/JPY strike and its exact notional. ' +
  '3) List every GBP/USD strike and its exact notional. ' +
  '4) List every AUD/USD strike and its exact notional. ' +
  '5) What spot prices are shown for each pair?';

const VLM_PASS3_PROMPT =
  'Cross-check this image for the following specific data points. ' +
  'For each, confirm EXACTLY what you see, or state DOES NOT EXIST if the item is not present: ' +
  '1) Is there a strike at [each strike from Pass 1]? What notional? ' +
  '2) Are there any strikes I missed in Pass 1?';

/**
 * Regex patterns for extracting OTC option strike data from page text.
 * Used as FALLBACK when VLM is unavailable.
 */
const STRIKE_PATTERNS: Array<{
  pattern: RegExp;
  pairGroup: number;
  strikeGroup: number;
  notionalGroup: number;
  expiryGroup: number;
}> = [
  // Pattern: EUR/USD | 1.0850 | 1.5B | 2026-04-15
  {
    pattern: /(EUR\/USD|GBP\/USD|AUD\/USD)[\s|]+(\d+\.?\d*)[\s|]+\$?([\d.]+)\s*[Bb](?:n|illion)?[\s|]+(\d{4}-\d{2}-\d{2})/g,
    pairGroup: 1,
    strikeGroup: 2,
    notionalGroup: 3,
    expiryGroup: 4,
  },
  // Pattern: pair="EUR/USD" strike="1.0850" notional="1.5" expiry="2026-04-15"
  {
    pattern: /pair="(EUR\/USD|GBP\/USD|AUD\/USD)"[^>]*strike="(\d+\.?\d*)"[^>]*notional="([\d.]+)"[^>]*expiry="(\d{4}-\d{2}-\d{2})"/gi,
    pairGroup: 1,
    strikeGroup: 2,
    notionalGroup: 3,
    expiryGroup: 4,
  },
  // Pattern: JSON-like: {"pair":"EUR/USD","strike":1.085,"notional":1.5,"expiry":"2026-04-15"}
  {
    pattern: /"pair"\s*:\s*"(EUR\/USD|GBP\/USD|AUD\/USD)"[^}]*?"strike"\s*:\s*(\d+\.?\d*)[^}]*?"notional"\s*:\s*([\d.]+)[^}]*?"expiry"\s*:\s*"(\d{4}-\d{2}-\d{2})"/gi,
    pairGroup: 1,
    strikeGroup: 2,
    notionalGroup: 3,
    expiryGroup: 4,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VLM OUTPUT PARSING — Extract OptionStrike[] from VLM text output
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse VLM text output to extract option strikes.
 *
 * VLM output may be in various formats:
 *   - JSON array: [{"pair":"EUR/USD","strike":1.085,"notional":1.5,...}]
 *   - Tabular text: EUR/USD | 1.0850 | 1.5B | 2026-04-15
 *   - Free text: "EUR/USD at 1.0850 with notional 1.5B expiring 2026-04-15"
 */
function parseVlmOutput(vlmText: string): OptionStrike[] {
  const strikes: OptionStrike[] = [];
  const seen = new Set<string>();

  // Strategy 1: JSON array extraction
  const jsonMatch = vlmText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
          const record = item as Record<string, unknown>;
          const pair = String(record['pair'] ?? '').toUpperCase();
          const strike = Number(record['strike'] ?? NaN);
          let notional = Number(record['notional'] ?? NaN);
          const expiry = String(record['expiry'] ?? '');

          // Handle notional in millions -> convert to billions
          const notionalUnit = String(record['notionalUnit'] ?? record['unit'] ?? '').toLowerCase();
          if (notionalUnit.includes('m') || (Number.isFinite(notional) && notional > 100)) {
            notional = notional / 1000; // millions to billions
          }

          if (pair && Number.isFinite(strike) && Number.isFinite(notional)) {
            const key = `${pair}-${strike}`;
            if (!seen.has(key) && ALLOWED_PAIRS.has(pair)) {
              seen.add(key);
              strikes.push({
                pair,
                strike,
                notional,
                expiry: expiry || new Date().toISOString().slice(0, 10),
                type: 'unknown' as const,
              });
            }
          }
        }
        if (strikes.length > 0) {
          log.info(`VLM JSON parse: extracted ${strikes.length} strikes`);
          return strikes;
        }
      }
    } catch (parseErr) {
      // Not valid JSON — fall through to regex text parsing
      log.debug(`VLM output was not valid JSON: ${parseErr}`);
    }
  }

  // Strategy 1b: Per-pair JSON object — the format requested by VLM_PASS1_PROMPT:
  //   { "EUR/USD": [{"strike": 1.1350, "notional": "€1.1bn", "bold": false}, ...], "USD/JPY": [...] }
  const objMatch = vlmText.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsedObj: unknown = JSON.parse(objMatch[0]);
      if (typeof parsedObj === 'object' && parsedObj !== null && !Array.isArray(parsedObj)) {
        for (const [rawPair, entries] of Object.entries(parsedObj as Record<string, unknown>)) {
          const pair = rawPair.toUpperCase();
          if (!ALLOWED_PAIRS.has(pair) || !Array.isArray(entries)) continue;
          for (const entry of entries) {
            if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
            const record = entry as Record<string, unknown>;
            const strike = Number(record['strike'] ?? NaN);

            // Notional may be a string ("€1.1bn", "$755m") or a bare number.
            let notional = NaN;
            const rawNotional = record['notional'];
            if (typeof rawNotional === 'number') {
              notional = rawNotional;
            } else if (typeof rawNotional === 'string') {
              const unitMatch = rawNotional.match(/([\d.]+)\s*([BbMm])/);
              if (unitMatch) {
                notional = parseFloat(unitMatch[1]);
                if (unitMatch[2].toUpperCase() === 'M') notional /= 1000; // millions -> billions
              } else {
                const bare = parseFloat(rawNotional.replace(/[^\d.]/g, ''));
                if (Number.isFinite(bare)) notional = bare;
              }
            }
            // Safety: bare numbers > 100 are millions, not billions
            if (Number.isFinite(notional) && notional > 100) notional /= 1000;

            if (!Number.isFinite(strike) || !Number.isFinite(notional) || notional <= 0) continue;
            const key = `${pair}-${strike}`;
            if (seen.has(key)) continue;
            seen.add(key);
            strikes.push({
              pair,
              strike,
              notional,
              expiry: new Date().toISOString().slice(0, 10),
              type: 'unknown' as const,
            });
          }
        }
        if (strikes.length > 0) {
          log.info(`VLM per-pair JSON parse: extracted ${strikes.length} strikes`);
          return strikes;
        }
      }
    } catch (parseErr) {
      // Not per-pair JSON — fall through to regex text parsing
      log.debug(`VLM output was not per-pair JSON: ${parseErr}`);
    }
  }

  // Strategy 2: Regex text extraction
  // Look for patterns like: EUR/USD 1.0850 1.5B or EUR/USD strike:1.085 notional:1.5B
  const textPattern =
    /(EUR\/USD|GBP\/USD|AUD\/USD|USD\/JPY)[^\d]{0,30}?(\d+\.\d{3,5})[^\d]{0,30}?\$?([\d.]+)\s*([BbMm])(?:n|illion|io)?/g;

  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(vlmText)) !== null) {
    const pair = match[1].toUpperCase();
    const strike = parseFloat(match[2]);
    let notional = parseFloat(match[3]);
    const unit = match[4].toUpperCase();

    // Convert to billions
    if (unit === 'M') {
      notional = notional / 1000; // millions -> billions
    }

    if (pair && Number.isFinite(strike) && Number.isFinite(notional)) {
      const key = `${pair}-${strike}`;
      if (!seen.has(key) && ALLOWED_PAIRS.has(pair)) {
        seen.add(key);
        strikes.push({
          pair,
          strike,
          notional,
          expiry: new Date().toISOString().slice(0, 10),
          type: 'unknown' as const,
        });
      }
    }
  }

  if (strikes.length > 0) {
    log.info(`VLM text parse: extracted ${strikes.length} strikes`);
  }

  return strikes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3-PASS RECONCILIATION — 2/3 agreement rule
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reconcile the 3 VLM passes using a 2/3 agreement rule with fallback.
 *
 * Normal mode: A strike is confirmed if it appears in at least 2 of 3 passes.
 * Fallback: If only 1 pass returned strikes (VLM server intermittent failures),
 * accept those strikes directly — 1 good pass is better than 0.
 */
function reconcileVlmPasses(
  pass1Strikes: OptionStrike[],
  pass2Strikes: OptionStrike[],
  pass3Strikes: OptionStrike[],
): OptionStrike[] {
  const passCounts = [pass1Strikes.length, pass2Strikes.length, pass3Strikes.length];
  const passesWithData = passCounts.filter((c) => c > 0).length;

  // Fallback: Only 1 pass returned data — use it directly
  if (passesWithData === 1) {
    const singlePass = pass1Strikes.length > 0 ? pass1Strikes
      : pass2Strikes.length > 0 ? pass2Strikes
      : pass3Strikes;
    log.info(
      `Reconciliation: Only 1 pass returned data (P1=${pass1Strikes.length}, ` +
        `P2=${pass2Strikes.length}, P3=${pass3Strikes.length}) — ` +
        `accepting ${singlePass.length} strikes from single pass (fallback)`,
    );
    return singlePass;
  }

  // Build a map of pair-strike -> array of notional values across passes
  const agreement = new Map<
    string,
    { pair: string; strike: number; notionals: number[]; expiries: string[] }
  >();

  const addToAgreement = (strikes: OptionStrike[]) => {
    for (const s of strikes) {
      const key = `${s.pair}-${s.strike}`;
      const existing = agreement.get(key);
      if (existing) {
        existing.notionals.push(s.notional);
        existing.expiries.push(s.expiry);
      } else {
        agreement.set(key, {
          pair: s.pair,
          strike: s.strike,
          notionals: [s.notional],
          expiries: [s.expiry],
        });
      }
    }
  };

  addToAgreement(pass1Strikes);
  addToAgreement(pass2Strikes);
  addToAgreement(pass3Strikes);

  // Apply 2/3 agreement rule
  const reconciled: OptionStrike[] = [];
  for (const [, data] of agreement) {
    if (data.notionals.length >= 2) {
      // Confirmed by at least 2 passes
      // Take median notional for robustness
      const sortedNotionals = [...data.notionals].sort((a, b) => a - b);
      const medianNotional =
        sortedNotionals.length % 2 === 0
          ? (sortedNotionals[sortedNotionals.length / 2 - 1] +
              sortedNotionals[sortedNotionals.length / 2]) /
            2
          : sortedNotionals[Math.floor(sortedNotionals.length / 2)];

      reconciled.push({
        pair: data.pair,
        strike: data.strike,
        notional: medianNotional,
        expiry: data.expiries[0],
        type: 'unknown' as const,
      });
    }
  }

  log.info(
    `Reconciliation: Pass1=${pass1Strikes.length}, Pass2=${pass2Strikes.length}, ` +
      `Pass3=${pass3Strikes.length} -> ${reconciled.length} confirmed (2/3 rule)`,
  );

  return reconciled;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VLM EXTRACTION PIPELINE — Index -> Sub-page -> Screenshot -> 3-pass VLM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute the full VLM extraction pipeline per TTE v5.3.3 Protocol A:
 *   1. Fetch INDEX page text (investinglive.com/Orders/) — a list of date links.
 *   2. Search text for sub-page URLs matching fx-option-expiries-for-.
 *   3. For the first 3 sub-pages: fetch text, screenshot, VLM 3-pass, regex parse.
 *   4. Reconcile (2/3 agreement) + merge regex strikes from page text.
 *
 * This function NEVER throws. It returns [] on any failure.
 */
async function executeVlmExtraction(
  weekStart?: string,
  visionTool?: (imagePath: string, prompt: string) => Promise<string | null>,
): Promise<OptionStrike[]> {
  const baseUrl = 'https://investinglive.com/Orders/';

  // STEP 1: Fetch the INDEX page via CDP (cloudflare-protected).
  // We fetch BOTH innerText (for logging) and innerHTML (for href extraction).
  // innerText strips HTML attributes, so href="..." links are only in innerHTML.
  log.info('Protocol A Step 1: Fetching Orders index page...');
  let indexText: string | null = null;
  let indexHtml: string | null = null;
  try {
    [indexText, indexHtml] = await Promise.all([
      fetchUrlViaCDP(baseUrl, true), // cloudflare=true
      fetchHtmlViaCDP(baseUrl, true), // HTML for href extraction
    ]);
  } catch (err) {
    log.warn(
      `Protocol A: fetch threw on index: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!indexText || indexText.length < 100) {
    log.warn('Protocol A: Index text unavailable via CDP — falling back to screenshot of index page');
    return await screenshotAndVlm(baseUrl, visionTool);
  }

  log.info(`Protocol A: Index text loaded (${indexText.length} chars, html ${indexHtml?.length ?? 0} chars)`);

  // STEP 2: Search the index HTML for sub-page URLs matching fx-option-expiries-for-.
  // Use innerHTML (not innerText) because href attributes only exist in HTML.
  const subPageUrls = extractSubPageUrls(indexHtml || indexText);

  if (subPageUrls.length === 0) {
    log.warn('Protocol A: No expiry sub-page links found in index text');
    log.info(`Index text sample: ${indexText.substring(0, 500)}`);
    // FALLBACK: Screenshot the index page itself.
    return await screenshotAndVlm(baseUrl, visionTool);
  }

  // STEP 2b: Filter sub-page URLs to match the target week if weekStart is provided.
  // URLs contain dates like: fx-option-expiries-for-22-june-10am-new-york-cut-20260622
  let targetUrls = subPageUrls;
  if (weekStart) {
    // Parse the week start date and compute Mon-Fri dates
    const wsDate = new Date(weekStart + 'T00:00:00Z');
    if (!isNaN(wsDate.getTime())) {
      const weekDates: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date(wsDate);
        d.setDate(d.getDate() + i);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        weekDates.push(`${yyyy}${mm}${dd}`);
      }
      // Filter URLs that contain any of the target week dates
      const filtered = subPageUrls.filter(u => 
        weekDates.some(dateStr => u.includes(dateStr))
      );
      if (filtered.length > 0) {
        targetUrls = filtered;
        log.info(`Protocol A: Filtered to ${filtered.length} URLs matching week ${weekStart}`);
      } else {
        log.warn(`Protocol A: No URLs match week ${weekStart} — using most recent ${Math.min(3, subPageUrls.length)}`);
      }
    }
  }

  log.info(`Protocol A: Processing ${Math.min(5, targetUrls.length)} sub-pages`);
  targetUrls.slice(0, 5).forEach((u) => log.info(`  ${u}`));

  // STEP 3: For each sub-page — fetch text, screenshot, VLM 3-pass, regex parse, merge.
  const allStrikes: OptionStrike[] = [];

  for (const subPageUrl of targetUrls.slice(0, 5)) {
    try {
      const strikes = await processSubPage(subPageUrl, visionTool);
      allStrikes.push(...strikes);
      log.info(`Protocol A: ${strikes.length} strikes from ${subPageUrl.substring(0, 70)}`);
    } catch (err) {
      // Never let one bad sub-page kill the whole run.
      log.warn(
        `Protocol A: Sub-page ${subPageUrl.substring(0, 60)} threw (continuing): ` +
          `${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return allStrikes;
}

/**
 * Extract fx-option-expiries-for- sub-page URLs from index page text.
 * Searches both href="..." attributes and plain-text URLs.
 */
function extractSubPageUrls(text: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  const addUrl = (raw: string) => {
    let url = raw;
    if (url.startsWith('//')) url = `https:${url}`;
    else if (url.startsWith('/')) url = `https://investinglive.com${url}`;
    else if (!url.startsWith('http')) url = `https://investinglive.com/Orders/${url}`;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  };

  // href="...fx-option-expiries-for-..."
  const hrefRegex = /href=["']([^"']*fx-option-expiries-for-[^"']*)["']/gi;
  while ((match = hrefRegex.exec(text)) !== null) addUrl(match[1]);

  // Plain-text absolute URLs
  const absUrlRegex = /(https?:\/\/[^\s"']*fx-option-expiries-for-[^\s"']*)/gi;
  while ((match = absUrlRegex.exec(text)) !== null) addUrl(match[1]);

  // Relative path fragments: fx-option-expiries-for-...
  const relRegex = /(fx-option-expiries-for-[a-z0-9-]+)/gi;
  while ((match = relRegex.exec(text)) !== null) addUrl(match[1]);

  return urls;
}

/**
 * Extract data-src image URLs from sub-page HTML that contain FXO options data.
 *
 * Investinglive lazy-loads images via `data-src` instead of `src`. The options
 * table is embedded as an image with alt="FXO DD-MM" and a data-src pointing to
 * images.investinglive.com.
 *
 * We try multiple regex patterns to handle different attribute orderings and
 * HTML escaping (e.g. &amp; in URLs).
 */
function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  const addUrl = (raw: string) => {
    let url = raw.replace(/&amp;/g, '&');
    if (url.startsWith('//')) url = `https:${url}`;
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  };

  // Pattern 1: data-src with FXO in the URL path (most specific)
  const fxoRegex = /data-src="(https?:\/\/images\.investinglive\.com\/images\/[^"]*FXO[^"]*)"/gi;
  while ((match = fxoRegex.exec(html)) !== null) addUrl(match[1]);

  // Pattern 2: alt="...FXO..." before data-src="..."
  const altBeforeRegex = /<img[^>]*alt="[^"]*FXO[^"]*"[^>]*data-src="([^"]*)"/gi;
  while ((match = altBeforeRegex.exec(html)) !== null) addUrl(match[1]);

  // Pattern 3: data-src="..." before alt="...FXO..." (attribute order varies)
  const altAfterRegex = /<img[^>]*data-src="([^"]*)"[^>]*alt="[^"]*FXO[^"]*"/gi;
  while ((match = altAfterRegex.exec(html)) !== null) addUrl(match[1]);

  // Pattern 4: any data-src pointing to images.investinglive.com with size900 (options images)
  const sizeRegex = /data-src="(https?:\/\/images\.investinglive\.com\/images\/[^"]*size900[^"]*)"/gi;
  while ((match = sizeRegex.exec(html)) !== null) addUrl(match[1]);

  return urls;
}

/**
 * Process a single sub-page: fetch text + HTML + extract data-src images +
 * download image + VLM 3-pass + regex parse, then merge.
 * Never throws — returns [] on any failure.
 */
async function processSubPage(
  subPageUrl: string,
  visionTool?: (imagePath: string, prompt: string) => Promise<string | null>,
): Promise<OptionStrike[]> {
  // (a) Fetch sub-page text (for regex parsing) + HTML (for data-src extraction)
  let subPageText: string | null = null;
  let subPageHtml: string | null = null;
  try {
    [subPageText, subPageHtml] = await Promise.all([
      fetchUrlViaCDP(subPageUrl, true),
      fetchHtmlViaCDP(subPageUrl, true),
    ]);
  } catch (err) {
    log.warn(
      `Protocol A: fetch threw on sub-page: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!subPageText) {
    log.info(
      `Protocol A: Sub-page text unavailable for ${subPageUrl.substring(0, 70)}`,
    );
    subPageText = '';
  } else {
    log.info(`Protocol A: Sub-page text loaded (${subPageText.length} chars)`);
  }

  // (b) Extract data-src image URLs from sub-page HTML (lazy-loaded options images)
  let imageUrls: string[] = [];
  if (subPageHtml) {
    imageUrls = extractImageUrlsFromHtml(subPageHtml);
    log.info(
      `Protocol A: Extracted ${imageUrls.length} data-src image URLs from HTML (${subPageHtml.length} chars)`,
    );
    imageUrls.forEach((u) => log.info(`  IMG: ${u.substring(0, 80)}`));
  } else {
    log.info('Protocol A: No sub-page HTML — cannot extract data-src images');
  }

  // (c) Determine the image to run VLM on. The options table is an EMBEDDED
  //     RASTER IMAGE (colored grid), NOT a DOM <table> — acquisition order:
  //     1) Download data-src image found in fetched HTML (cheapest, sharpest)
  //     2) Find the image in the LIVE DOM via CDP, download its data-src/src
  //     3) ZOOMED clip screenshot of just the image element (no data-src case)
  //     4) Full-page screenshot (last resort — table usually too small to read)
  let vlmImagePath: string | null = null;

  // (c1) HTML-regex data-src extraction — no extra navigation required
  if (imageUrls.length > 0) {
    for (const imgUrl of imageUrls) {
      const downloaded = await downloadImage(imgUrl);
      if (downloaded) {
        vlmImagePath = downloaded;
        log.info(`Protocol A: Downloaded options image to ${downloaded}`);
        break;
      }
    }
  }

  // (c2) Live-DOM image finder via CDP. Lazy-loaded images frequently never
  //      appear in fetched HTML (consent-gated rendering), so search the
  //      rendered DOM after cookie-consent dismissal (REJECT).
  if (!vlmImagePath) {
    log.info('Protocol A: HTML regex found no usable image — searching live DOM for options table image...');
    const imgInfo = await findOptionsTableImage(subPageUrl, 10_000);
    if (imgInfo) {
      log.info(
        `Protocol A: Live DOM image found: ${Math.round(imgInfo.width)}x${Math.round(imgInfo.height)} ` +
          `src=${imgInfo.src ? imgInfo.src.substring(0, 80) : 'none'}`,
      );
      // Image has a real URL — download directly (faster + sharper than screenshot)
      if (imgInfo.src && /^https?:\/\//.test(imgInfo.src)) {
        const downloaded = await downloadImage(imgInfo.src);
        if (downloaded) {
          vlmImagePath = downloaded;
          log.info(`Protocol A: Downloaded DOM-found options image to ${downloaded}`);
        } else {
          log.info('Protocol A: DOM-found image download failed — will try zoomed element screenshot');
        }
      }
    } else {
      log.info('Protocol A: No options table image found in live DOM');
    }
  }

  // (c3) ZOOMED clip screenshot of JUST the image element. Full-page
  //      screenshots render the table too small for VLM OCR; the clip
  //      parameter + 2x scale keeps strike prices readable.
  if (!vlmImagePath) {
    log.info('Protocol A: Taking zoomed element screenshot of options table image...');
    vlmImagePath = await navigateAndScreenshotElement(subPageUrl, OPTIONS_IMAGE_SELECTOR, 10_000);
    if (vlmImagePath) {
      log.info(`Protocol A: Zoomed element screenshot saved to ${vlmImagePath}`);
    }
  }

  // (c4) Last resort: full-page screenshot
  if (!vlmImagePath) {
    log.info('Protocol A: All image strategies failed — falling back to full-page screenshot');
    vlmImagePath = await navigateAndScreenshot(subPageUrl, 10_000);
  }

  if (!vlmImagePath) {
    log.warn(`Protocol A: Both image download and screenshot failed for ${subPageUrl.substring(0, 60)} — falling back to regex parsing only`);
    const textOnly = subPageText ? parseTextForStrikes(subPageText) : [];
    if (textOnly.length > 0) return textOnly;
    // No usable image at all — mine the raw HTML DOM directly
    return subPageHtml ? extractStrikesFromHtml(subPageHtml) : [];
  }

  // (d) VLM 3-pass on the image — SEQUENTIAL (not parallel) to avoid
  //     overwhelming the local VLM server (llama-server handles 1 request
  //     well but degrades with concurrent multimodal inference)
  log.info(`Protocol A Step 3: Running VLM 3-pass on ${vlmImagePath}...`);
  const pass1 = visionTool
    ? await visionTool(vlmImagePath, VLM_PASS1_PROMPT)
    : await vlmInfer(vlmImagePath, VLM_PASS1_PROMPT);
  log.info(`Protocol A: VLM Pass 1 complete (${pass1 ? pass1.length + ' chars' : 'null'})`);
  await new Promise(r => setTimeout(r, 3_000)); // 3s delay between passes
  const pass2 = visionTool
    ? await visionTool(vlmImagePath, VLM_PASS2_PROMPT)
    : await vlmInfer(vlmImagePath, VLM_PASS2_PROMPT);
  log.info(`Protocol A: VLM Pass 2 complete (${pass2 ? pass2.length + ' chars' : 'null'})`);
  await new Promise(r => setTimeout(r, 3_000));
  const pass3 = visionTool
    ? await visionTool(vlmImagePath, VLM_PASS3_PROMPT)
    : await vlmInfer(vlmImagePath, VLM_PASS3_PROMPT);
  log.info(`Protocol A: VLM Pass 3 complete (${pass3 ? pass3.length + ' chars' : 'null'})`);

  const pass1Strikes = pass1 ? parseVlmOutput(pass1) : [];
  const pass2Strikes = pass2 ? parseVlmOutput(pass2) : [];
  const pass3Strikes = pass3 ? parseVlmOutput(pass3) : [];

  log.info(`VLM passes: P1=${pass1Strikes.length}, P2=${pass2Strikes.length}, P3=${pass3Strikes.length}`);

  // (e) Reconcile with 2/3 agreement rule
  const reconciled = reconcileVlmPasses(pass1Strikes, pass2Strikes, pass3Strikes);

  // (f) Regex-parse the sub-page text and merge any additional strikes
  const textStrikes = subPageText ? parseTextForStrikes(subPageText) : [];
  const existing = new Set(reconciled.map((s) => `${s.pair}-${s.strike}`));
  for (const ts of textStrikes) {
    if (!existing.has(`${ts.pair}-${ts.strike}`)) reconciled.push(ts);
  }

  // (g) ALTERNATIVE extraction: regex strikes directly from raw HTML.
  //     The options data IS in the DOM even when a cookie-consent overlay
  //     blocked the screenshot and blinded the VLM. Same data, different
  //     source (HTML markup vs pixels) — not a degraded fallback.
  if (reconciled.length === 0 && subPageHtml) {
    log.info(`Protocol A: VLM extracted 0 strikes — trying regex on raw HTML (${subPageHtml.length} chars)`);
    const htmlStrikes = extractStrikesFromHtml(subPageHtml);
    if (htmlStrikes.length > 0) {
      log.info(
        `Protocol A: Regex-on-HTML extracted ${htmlStrikes.length} strikes: ` +
          htmlStrikes.slice(0, 10).map((s) => `${s.pair}@${s.strike}`).join(', '),
      );
      reconciled.push(...htmlStrikes);
    }
  }

  return reconciled;
}

/**
 * Screenshot a URL and run VLM pass 1 as a fallback extraction method.
 */
async function screenshotAndVlm(
  url: string,
  visionTool?: (imagePath: string, prompt: string) => Promise<string | null>,
): Promise<OptionStrike[]> {
  const screenshotPath = await navigateAndScreenshot(url, 15_000);
  if (!screenshotPath) {
    log.warn(`screenshotAndVlm: navigateAndScreenshot returned null for ${url.substring(0, 60)} — cannot run VLM extraction`);
    return [];
  }

  const pass1 = visionTool
    ? await visionTool(screenshotPath, VLM_PASS1_PROMPT)
    : await vlmInfer(screenshotPath, VLM_PASS1_PROMPT);
  return pass1 ? parseVlmOutput(pass1) : [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK: REGEX PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse text content for option strike data using regex patterns.
 * Returns OptionStrike[] compatible with FilterCheckpoint.
 */
function parseTextForStrikes(text: string): OptionStrike[] {
  const strikes: OptionStrike[] = [];
  const seen = new Set<string>();

  for (const config of STRIKE_PATTERNS) {
    // Reset lastIndex for stateful regexes
    const regex = new RegExp(config.pattern.source, config.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const pair = match[config.pairGroup];
      const strike = parseFloat(match[config.strikeGroup]);
      const notional = parseFloat(match[config.notionalGroup]);
      const expiry = match[config.expiryGroup];

      if (!pair || isNaN(strike) || isNaN(notional) || !expiry) continue;

      const key = `${pair}-${strike}-${expiry}`;
      if (seen.has(key)) continue;
      seen.add(key);

      strikes.push({
        pair,
        strike,
        notional, // in billions USD
        expiry,
        type: 'unknown' as const,
      });
    }
  }

  log.info(`Regex parsing extracted ${strikes.length} option strikes`);
  return strikes;
}

/**
 * ALTERNATIVE extraction: mine option strikes directly from raw sub-page HTML.
 *
 * Used when the VLM pass yields 0 strikes — e.g. a cookie-consent overlay blocked
 * the screenshot and blinded the VLM. The options data IS still present in the
 * DOM (innerHTML), so we extract it from markup instead of pixels.
 *
 * Stage 1: Structured patterns (STRIKE_PATTERNS) — pair/strike/notional/expiry
 *          groups matching data-attributes or JSON embeds in the markup.
 * Stage 2: Pair-block scan on tag-stripped text — InvestingLive's native list
 *          format: "EUR/USD: 1.0850 (€1.5bn), 1.0900 (€800m)". Each pair mention
 *          opens a ~600-char window (cut at the next pair mention); every strike
 *          in the window requires an explicit notional in parentheses — strikes
 *          without notional are skipped (FilterCheckpoint would exclude them as
 *          below-tier, and unknown-notional strikes must not poison the cache).
 */
function extractStrikesFromHtml(html: string): OptionStrike[] {
  const strikes: OptionStrike[] = [];
  const seen = new Set<string>();
  const today = new Date().toISOString().slice(0, 10);

  const push = (pair: string, strike: number, notional: number, expiry?: string) => {
    if (!ALLOWED_PAIRS.has(pair)) return;
    if (!Number.isFinite(strike) || !Number.isFinite(notional) || notional <= 0) return;
    // FX-plausible strike range (0.5–2.0 for FX pairs, up to ~200 for yen/index)
    if (strike <= 0.5 || strike >= 200) return;
    const key = `${pair}-${strike}`;
    if (seen.has(key)) return;
    seen.add(key);
    strikes.push({
      pair,
      strike,
      notional,
      expiry: expiry || today,
      type: 'unknown' as const,
    });
  };

  // Stage 1: structured patterns on the raw markup
  for (const s of parseTextForStrikes(html)) {
    push(s.pair, s.strike, s.notional, s.expiry);
  }

  // Stage 2: pair-block scan on tag-stripped text
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&euro;/gi, '€')
    .replace(/&#8364;/g, '€')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');

  const pairMention = /(EUR\/USD|GBP\/USD|AUD\/USD)/g;
  let pm: RegExpExecArray | null;
  while ((pm = pairMention.exec(text)) !== null) {
    const pair = pm[1].toUpperCase();
    const windowStart = pm.index + pm[0].length;
    const window = text.substring(windowStart, windowStart + 600);
    // Cut the window at the next pair mention to avoid cross-pair bleed
    const nextPairIdx = window.search(
      /(EUR\/USD|GBP\/USD|AUD\/USD|USD\/JPY|USD\/CHF|NZD\/USD|USD\/CAD)/i,
    );
    const block = nextPairIdx === -1 ? window : window.substring(0, nextPairIdx);

    // Strike with mandatory notional: "1.0850 (€1.5bn)" / "1.0900 ($850m)"
    const strikeRe =
      /(\d+\.\d{3,5})\s*\(\s*[€$]?\s*([\d.]+)\s*([BbMm])(?:n|illion|io)?\s*\)/g;
    let sm: RegExpExecArray | null;
    while ((sm = strikeRe.exec(block)) !== null) {
      const strike = parseFloat(sm[1]);
      let notional = parseFloat(sm[2]);
      if (sm[3].toUpperCase() === 'M') notional /= 1000; // millions -> billions
      push(pair, strike, notional);
    }
  }

  log.info(`Regex-on-HTML extracted ${strikes.length} option strikes`);
  return strikes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Execute Protocol A — autonomous OTC FX options extraction.
 *
 * TTE v5.3.3 Pipeline:
 *   1. Check cache
 *   2. Try VLM 3-pass extraction (CDP browser -> capture -> VLM -> reconcile)
 *   3. Fall back to regex HTML parsing if VLM unavailable
 *   4. Apply FilterCheckpoint
 *   5. Cache and return
 *
 * This function NEVER throws. It returns null on any failure.
 */
export async function executeProtocolA(
  weekStart?: string,
  visionTool?: (imagePath: string, prompt: string) => Promise<string | null>,
): Promise<OptionExpiryData | null> {
  log.info('Protocol A: Starting OTC options extraction...');

  // ── Step 1: Check cache ──
  if (cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    log.info(
      `Protocol A: Cache HIT (${cachedData.strikes.length} strikes, age=${Math.round((Date.now() - cachedAt) / 60_000)}min)`,
    );
    return cachedData;
  }

  let allStrikes: OptionStrike[] = [];
  let sourceLabel = 'unknown';

  // ── Step 2: Try VLM 3-pass extraction (MiMo v2.5 — VC daemon gate REMOVED) ──
  log.info('Protocol A: Attempting VLM 3-pass extraction...');
  try {
    const vlmStrikes = await executeVlmExtraction(weekStart, visionTool);
    if (vlmStrikes.length > 0) {
      allStrikes = vlmStrikes;
      sourceLabel = 'VLM-3pass';
      log.info(`Protocol A: VLM extraction yielded ${vlmStrikes.length} strikes`);
    } else {
      log.warn('Protocol A: VLM extraction returned 0 strikes — falling back to regex');
    }
  } catch (err) {
    log.warn(
      `Protocol A: VLM extraction threw (should not happen): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // ── Step 3: Fall back to regex parsing via fetchSource ──
  if (allStrikes.length === 0) {
    log.info('Protocol A: Falling back to regex parsing via fetchSource...');
    const html = await fetchSource('investinglive_orders');
    if (html) {
      const regexStrikes = parseTextForStrikes(html);
      if (regexStrikes.length > 0) {
        allStrikes = regexStrikes;
        sourceLabel = 'Investinglive-regex';
      }
    }

    // If still nothing, try VLM screenshot extraction as last resort
    if (allStrikes.length === 0) {
      log.info('Protocol A: Trying VLM screenshot extraction as last resort...');
      const screenshotPath = await navigateAndScreenshot('https://www.investinglive.com/Orders/', 15_000);
      if (screenshotPath) {
        const pass1 = visionTool
          ? await visionTool(screenshotPath, VLM_PASS1_PROMPT)
          : await vlmInfer(screenshotPath, VLM_PASS1_PROMPT);
        if (pass1) {
          const vlmStrikes = parseVlmOutput(pass1);
          if (vlmStrikes.length > 0) {
            allStrikes = vlmStrikes;
            sourceLabel = 'VLM-screenshot';
          }
        }
      }
    }
  }

  if (allStrikes.length === 0) {
    log.warn('Protocol A: No strikes found from any extraction method (VLM 3-pass, regex parsing, VLM screenshot) — returning null');
    return null;
  }

  return applyFiltersAndCache(allStrikes, sourceLabel);
}

/**
 * Apply filter checkpoint and cache the result.
 */
function applyFiltersAndCache(strikes: OptionStrike[], source: string): OptionExpiryData {
  // ── Step 5: Apply FilterCheckpoint ──
  const checkpoint = new FilterCheckpoint();
  const result = checkpoint.apply(strikes);

  log.info(
    `Protocol A: FilterCheckpoint -> ${result.summary.totalInput} input, ` +
      `${result.summary.totalPassed} passed ` +
      `(${result.summary.criticalWalls} critical, ${result.summary.significantMagnets} significant), ` +
      `${result.summary.excludedByPair} excluded by pair, ${result.summary.excludedByNotional} by notional`,
  );

  // ── Convert to OptionStrikeData format ──
  const filteredStrikes: OptionStrikeData[] = result.passed.map((s) => ({
    pair: s.pair,
    strike: s.strike,
    notional: s.notional,
    expiry: s.expiry,
    tier: checkpoint.classifyNotional(s.notional),
  }));

  const data: OptionExpiryData = {
    strikes: filteredStrikes,
    fetchedAt: Date.now(),
    source,
  };

  // ── Step 6: Cache ──
  cachedData = data;
  cachedAt = Date.now();

  log.info(`Protocol A: Complete — ${filteredStrikes.length} strikes cached from ${source}`);
  return data;
}
