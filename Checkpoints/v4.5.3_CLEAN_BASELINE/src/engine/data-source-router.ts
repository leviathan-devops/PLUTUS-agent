/**
 * Data Source Router — Unified fetch with per-source access method selection.
 *
 * Three access methods:
 *  - fetch:         Plain HTTP fetch (for APIs that work without browser headers)
 *  - fetch_headers: HTTP fetch with browser-like headers (for sites with light protection)
 *  - vc_browser:    CDP browser via host Chrome (for Cloudflare/anti-bot sites)
 *
 * Never throws. Returns null on failure.
 */

import { Logger } from '../utils/logger.js';

const log = new Logger('DataSourceRouter');

export type AccessMethod = 'fetch' | 'fetch_headers' | 'vc_browser';

export interface SourceConfig {
  url: string;
  method: AccessMethod;
  headers?: Record<string, string>;
  description: string;
  /** Custom timeout in ms for HTTP fetch sources (default: 15_000) */
  timeoutMs?: number;
  /** Max retry attempts on failure (default: 0 for HTTP, 1 for vc_browser) */
  maxRetries?: number;
  /** Whether this source is Cloudflare-protected (increases render delay + timeout for vc_browser) */
  cloudflareProtected?: boolean;
  /** Use headed Chrome (real display :2, port 9225) for sites with aggressive anti-bot detection */
  headedBrowser?: boolean;
}

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Ch-Ua': '"Google Chrome";v="125", "Chromium";v="125"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// ---------------------------------------------------------------------------
// CDP Browser Configuration
// ---------------------------------------------------------------------------

/** Host Chrome CDP endpoint reachable from inside the container via socat bridge */
const CDP_BASE = 'http://localhost:9228';
/** Headed Chrome CDP endpoint — real display (:2), bypasses Cloudflare/anti-bot detection */
const CDP_HEADED_BASE = 'http://localhost:9228';
/** Maximum concurrent CDP tabs (avoid overwhelming Chrome) */
const MAX_CONCURRENT_TABS = 3;
/** Seconds to wait after page load for JS rendering */
const RENDER_WAIT_MS = 8_000;
/** Render delay for Cloudflare-protected sources (gives JS challenge time to resolve) */
const CF_RENDER_WAIT_MS = 35_000;
/** Overall CDP operation timeout */
const CDP_TIMEOUT_MS = 30_000;
/** Extended CDP timeout for Cloudflare-protected sources */
const CF_CDP_TIMEOUT_MS = 90_000;
/** Extra wait when Cloudflare challenge page is detected */
const CF_CHALLENGE_WAIT_MS = 15_000;

// ---------------------------------------------------------------------------
// Cookie Consent + Options Table Wait — injected via Runtime.evaluate
// ---------------------------------------------------------------------------

/**
 * JS expression: dismiss cookie-consent overlays BEFORE screenshot/extraction.
 * investinglive.com shows a consent banner that covers the options table —
 * the VLM sees the banner, not the data. Clicks the first visible accept
 * button (consent-framework selectors first, then text match), and as a last
 * resort hides high-z-index cookie/consent overlays. Returns a diagnostic.
 */
const COOKIE_CONSENT_EXPR = `(() => {
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // 1) Well-known consent-framework buttons (OneTrust, Quantcast, generic)
  const selectors = [
    '#onetrust-reject-btn-handler',
    '.onetrust-close-btn-handler',
    '#onetrust-pc-btn-handler',
    '.qc-cmp2-summary-buttons button[mode="secondary"]',
    '.qc-cmp2-footer button[mode="secondary"]',
    '[class*="cookie"][class*="reject"]',
    '[id*="cookie"][id*="reject"]',
    '.cookie-reject',
    '#cookie-reject',
    '[class*="consent"] button[class*="reject"]'
  ];
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) { el.click(); return 'clicked-selector:' + sel; }
    } catch (e) { /* invalid selector — try next */ }
  }
  // 2) Exact text-match scan on clickable elements
  const rejectTexts = ['reject all', 'reject', 'decline', 'decline all', 'no thanks', 'dismiss', 'close', 'manage options'];
  const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
  for (const btn of candidates) {
    const text = (((btn.textContent || '') + ' ' + (btn.value || '')).trim()).toLowerCase();
    if (!text || text.length > 40) continue;
    if (rejectTexts.indexOf(text) !== -1 && isVisible(btn)) {
      btn.click();
      return 'clicked-text:"' + text + '"';
    }
  }
  // 3) Last resort: hide high-z-index cookie/consent overlays so they cannot
  //    cover the options table in the screenshot
  const overlays = document.querySelectorAll('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [class*="gdpr"], [id*="gdpr"]');
  let hidden = 0;
  for (const o of overlays) {
    try {
      const st = window.getComputedStyle(o);
      const z = parseInt(st.zIndex || '0', 10);
      if ((st.position === 'fixed' || st.position === 'absolute') && z >= 100) {
        o.style.display = 'none';
        hidden++;
      }
    } catch (e) { /* style read failed — skip element */ }
  }
  return hidden > 0 ? 'hid-overlays:' + hidden : 'no-consent-banner';
})()`;

/**
 * JS expression (Promise — use with awaitPromise): wait up to 12s for the
 * options table / FXO data image to appear in the DOM, scroll it into view,
 * then settle 500ms so the scroll + lazy render complete before capture.
 */
const OPTIONS_TABLE_WAIT_EXPR = `new Promise((resolve) => {
  const SELECTOR = 'table, [class*="expiry"], [class*="option"], [class*="strike"], img[alt*="FXO"], img[data-src*="FXO"], img[data-src*="size900"]';
  const start = Date.now();
  const check = () => {
    const el = document.querySelector(SELECTOR);
    if (el) {
      try { el.scrollIntoView({ block: 'center' }); } catch (e) { /* scroll non-blocking */ }
      setTimeout(() => resolve('found:' + el.tagName), 500);
      return;
    }
    if (Date.now() - start > 12000) { resolve('timeout'); return; }
    setTimeout(check, 500);
  };
  check();
})`;

// ---------------------------------------------------------------------------
// Source Configurations
// ---------------------------------------------------------------------------

export const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  // --- APIs (plain fetch, no browser headers needed) ---
  fred_rrp: {
    url: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=RRPONTTLD',
    method: 'fetch',
    description: 'FRED Reverse Repo Operations (RRP) CSV',
    timeoutMs: 30_000,
    maxRetries: 2,
  },
  treasury_auctions: {
    url: 'https://www.treasurydirect.gov/TA_WS/securities/auctioned?format=json',
    method: 'fetch',
    description: 'Treasury auctions JSON',
  },

  // --- Bot-protected sites (headed CDP browser required) ---
  // NOTE: Barchart cheat-sheets REMOVED — paywalled, returns marketing content.
  // TradingView technicals (below) provide the same EMA/SMA data for Pillar P2.
  forex_research: {
    url: 'https://www.forex.com/en-us/market-analysis/latest-research/',
    method: 'vc_browser',
    description: 'Forex.com latest research (Cloudflare protected)',
    cloudflareProtected: true,
    headedBrowser: true,
    maxRetries: 2,
  },

  // --- Light protection (browser headers suffice) ---
  eia_petroleum: {
    url: 'https://ir.eia.gov/wpsr/wpsrsummary.pdf',
    method: 'fetch_headers',
    headers: BROWSER_HEADERS,
    description: 'EIA Weekly Petroleum Status Report',
  },
  fed_h10: {
    url: 'https://www.federalreserve.gov/releases/h10/',
    method: 'fetch_headers',
    headers: BROWSER_HEADERS,
    description: 'Fed H.10 Foreign Exchange Rates',
  },
  investinglive_orders: {
    url: 'https://www.investinglive.com/Orders/',
    method: 'vc_browser',
    description: 'InvestingLive OTC Options',
    cloudflareProtected: true,
    headedBrowser: true,
    maxRetries: 1,
  },
  // --- TradingView (SPA, returns HTML shell via curl) ---
  tv_technicals_eurusd: {
    url: 'https://www.tradingview.com/symbols/EURUSD/technicals/',
    method: 'vc_browser',
    description: 'TradingView EUR/USD Technicals',
  },
  tv_technicals_gbpusd: {
    url: 'https://www.tradingview.com/symbols/GBPUSD/technicals/',
    method: 'vc_browser',
    description: 'TradingView GBP/USD Technicals',
  },
  tv_technicals_audusd: {
    url: 'https://www.tradingview.com/symbols/AUDUSD/technicals/',
    method: 'vc_browser',
    description: 'TradingView AUD/USD Technicals',
  },
  tv_technicals_dxy: {
    url: 'https://www.tradingview.com/symbols/TVC-DXY/technicals/',
    method: 'vc_browser',
    description: 'TradingView DXY Technicals',
  },
};

// ---------------------------------------------------------------------------
// CDP Screenshot — Navigate + Capture on Headed Browser
// ---------------------------------------------------------------------------

/**
 * Navigate the headed Chrome (port 9225) to a URL, wait for render,
 * take a screenshot via CDP Page.captureScreenshot, save to file.
 *
 * This is the correct VLM capture path:
 *   CDP (9228) for navigation + screenshot → VC daemon (3322) for VLM inference
 *
 * @param url URL to navigate to
 * @param renderWaitMs Time to wait after load for JS rendering (default 10s)
 * @returns File path to saved PNG, or null on failure
 */
export async function navigateAndScreenshot(url: string, renderWaitMs = 10_000): Promise<string | null> {
  const cdpBase = CDP_HEADED_BASE;
  const screenshotPath = `/tmp/vlm_capture_${Date.now()}.png`;

  log.info(`navigateAndScreenshot: ${url.substring(0, 80)}...`);

  let tabId: string | null = null;

  // ── Reuse check: if there's already a tab on this URL, screenshot it ──
  // instead of creating+closing a temp tab. More efficient and less flashy.
  try {
    const listResp = await fetch(`${cdpBase}/json`);
    if (listResp.ok) {
      const listRaw: unknown = await listResp.json();
      if (!Array.isArray(listRaw)) {
        log.warn(`navigateAndScreenshot: CDP /json returned non-array (${typeof listRaw}) — skipping reuse check`);
      } else {
        const existingTabs = listRaw as Array<{
          id: string;
          type: string;
          url: string;
          webSocketDebuggerUrl?: string;
        }>;
      // Match on path portion (no query params) to avoid cross-page false matches
      const targetPath = url.split('?')[0];
      const existing = existingTabs.find(
        (t) => t.type === 'page' && t.webSocketDebuggerUrl && t.url.split('?')[0].startsWith(targetPath),
      );
      if (existing?.webSocketDebuggerUrl) {
        log.info(`navigateAndScreenshot: reusing existing tab for ${url.substring(0, 60)}...`);

        const reuseWsUrl = existing.webSocketDebuggerUrl.replace(
          /ws:\/\/127\.0\.0\.1:\d+/,
          `ws://${CDP_HEADED_BASE.replace('http://', '')}`,
        );

        const reuseScreenshot = await new Promise<string | null>((resolve) => {
          const ws = new WebSocket(reuseWsUrl);
          let msgId = 1;
          let resolved = false;
          let consentEvalId: number | null = null;
          let tableWaitEvalId: number | null = null;

          const cleanup = (result: string | null) => {
            if (resolved) return;
            resolved = true;
            try {
              ws.close();
            } catch (reuseWsCloseErr) {
              log.debug(`navigateAndScreenshot reuse WS close: ${reuseWsCloseErr instanceof Error ? reuseWsCloseErr.message : String(reuseWsCloseErr)}`);
            }
            resolve(result);
          };

          ws.onopen = () => {
            ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
            ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
            // Page is already loaded — wait briefly for any in-progress render,
            // then dismiss cookie consent BEFORE capturing.
            const wait = renderWaitMs > 3000 ? 3000 : renderWaitMs;
            setTimeout(() => {
              consentEvalId = msgId++;
              ws.send(
                JSON.stringify({
                  id: consentEvalId,
                  method: 'Runtime.evaluate',
                  params: { expression: COOKIE_CONSENT_EXPR, returnByValue: true },
                }),
              );
            }, wait);
          };

          ws.onmessage = (ev) => {
            if (typeof ev.data !== 'string') return;
            const msg = JSON.parse(ev.data) as Record<string, unknown>;

            // Cookie consent dismissed → wait for options table + scroll into view
            if (typeof msg.id === 'number' && msg.id === consentEvalId) {
              consentEvalId = null;
              const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
              log.info(`navigateAndScreenshot: cookie consent: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
              tableWaitEvalId = msgId++;
              ws.send(
                JSON.stringify({
                  id: tableWaitEvalId,
                  method: 'Runtime.evaluate',
                  params: { expression: OPTIONS_TABLE_WAIT_EXPR, returnByValue: true, awaitPromise: true },
                }),
              );
              return;
            }

            // Options table ready → capture screenshot
            if (typeof msg.id === 'number' && msg.id === tableWaitEvalId) {
              tableWaitEvalId = null;
              const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
              log.info(`navigateAndScreenshot: options table wait: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
              ws.send(
                JSON.stringify({
                  id: msgId++,
                  method: 'Page.captureScreenshot',
                  params: { format: 'png' },
                }),
              );
              return;
            }

            const result = msg.result as Record<string, unknown> | undefined;
            if (msg.id !== undefined && result?.data) {
              const screenshotData = result.data;
              if (typeof screenshotData === 'string') {
                cleanup(screenshotData);
              }
            }
          };

          ws.onerror = () => cleanup(null);
          setTimeout(() => cleanup(null), 30_000);
        });

        if (reuseScreenshot) {
          const fs = await import('node:fs');
          fs.writeFileSync(screenshotPath, Buffer.from(reuseScreenshot, 'base64'));
          log.info(
            `Screenshot saved (reused tab): ${screenshotPath} (${((reuseScreenshot.length * 0.75) / 1024).toFixed(0)}KB)`,
          );
          return screenshotPath;
        }
        // Reuse path failed — fall through to creating a new tab
        log.info('navigateAndScreenshot: reuse screenshot failed, falling back to new tab');
      }
      }
    }
  } catch (reuseErr) {
    // Reuse check failed — fall through to normal temp-tab flow with reason
    log.debug(`navigateAndScreenshot: tab reuse check failed (${reuseErr instanceof Error ? reuseErr.message : String(reuseErr)}) — falling back to new tab creation`);
  }

  try {
    // Step 1: Create new tab
    const tabResp = await fetch(`${cdpBase}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (!tabResp.ok) { log.warn(`CDP tab creation failed: HTTP ${tabResp.status}`); return null; }
    const tabRaw: unknown = await tabResp.json();
    if (typeof tabRaw !== 'object' || tabRaw === null || typeof (tabRaw as Record<string, unknown>).id !== 'string') {
      log.warn('CDP tab response missing required "id" field — cannot proceed');
      return null;
    }
    const tab = tabRaw as { id: string; webSocketDebuggerUrl?: string };
    tabId = tab.id;
    if (!tab.webSocketDebuggerUrl) { log.warn('CDP tab has no WebSocket URL'); return null; }

    // Rewrite WebSocket URL: CDP returns ws://127.0.0.1:PORT/... which is
    // unreachable from inside the container. Replace with socat bridge host.
    const wsUrl = tab.webSocketDebuggerUrl.replace(
      /ws:\/\/127\.0\.0\.1:\d+/,
      `ws://${CDP_HEADED_BASE.replace('http://', '')}`,
    );
    log.info(`CDP WebSocket: ${wsUrl.substring(0, 60)}...`);

    // Step 2: Connect WebSocket, wait for load, screenshot
    const screenshot = await new Promise<string | null>((resolve) => {
      const ws = new WebSocket(wsUrl);
      let msgId = 1;
      let loadFired = false;
      let resolved = false;
      let consentEvalId: number | null = null;
      let tableWaitEvalId: number | null = null;

      const cleanup = (result: string | null) => {
        if (resolved) return;
        resolved = true;
        try { ws.close(); } catch (wsCloseErr) { log.debug(`navigateAndScreenshot WS close during cleanup: ${wsCloseErr instanceof Error ? wsCloseErr.message : String(wsCloseErr)}`); }
        resolve(result);
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));

        // Anti-detection
        ws.send(JSON.stringify({
          id: msgId++, method: 'Page.addScriptToEvaluateOnNewDocument',
          params: { source: 'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});' },
        }));
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') {
          log.debug(`navigateAndScreenshot WS: received non-string message (${typeof ev.data}) — ignoring`);
          return;
        }
        const msg = JSON.parse(ev.data) as Record<string, unknown>;

        // Wait for page load → dismiss cookie consent BEFORE screenshot
        if (msg.method === 'Page.loadEventFired' && !loadFired) {
          loadFired = true;
          setTimeout(() => {
            consentEvalId = msgId++;
            ws.send(JSON.stringify({
              id: consentEvalId,
              method: 'Runtime.evaluate',
              params: { expression: COOKIE_CONSENT_EXPR, returnByValue: true },
            }));
          }, renderWaitMs);
        }

        // Cookie consent dismissed → wait for options table + scroll into view
        if (typeof msg.id === 'number' && msg.id === consentEvalId) {
          consentEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          log.info(`navigateAndScreenshot: cookie consent: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
          tableWaitEvalId = msgId++;
          ws.send(JSON.stringify({
            id: tableWaitEvalId,
            method: 'Runtime.evaluate',
            params: { expression: OPTIONS_TABLE_WAIT_EXPR, returnByValue: true, awaitPromise: true },
          }));
          return;
        }

        // Options table ready → take screenshot
        if (typeof msg.id === 'number' && msg.id === tableWaitEvalId) {
          tableWaitEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          log.info(`navigateAndScreenshot: options table wait: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
          ws.send(JSON.stringify({
            id: msgId++, method: 'Page.captureScreenshot',
            params: { format: 'png' },
          }));
          return;
        }

        // Capture screenshot result
        const result = msg.result as Record<string, unknown> | undefined;
        if (msg.id !== undefined && result?.data) {
          const screenshotData = result.data;
          if (typeof screenshotData !== 'string') {
            log.warn('navigateAndScreenshot WS: screenshot result data is not a string');
            cleanup(null);
            return;
          }
          cleanup(screenshotData);
        }
      };

      ws.onerror = () => cleanup(null);
      setTimeout(() => cleanup(null), 60_000);
    });

    // Step 3: Close tab
    if (tabId) await closeCDPTab(tabId, cdpBase);

    if (!screenshot) {
      log.warn('Screenshot capture returned null');
      return null;
    }

    // Step 4: Save base64 to file
    const fs = await import('node:fs');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot, 'base64'));
    log.info(`Screenshot saved: ${screenshotPath} (${(screenshot.length * 0.75 / 1024).toFixed(0)}KB)`);
    return screenshotPath;

  } catch (err) {
    log.warn(`navigateAndScreenshot failed: ${err instanceof Error ? err.message : String(err)}`);
    if (tabId) await closeCDPTab(tabId, CDP_HEADED_BASE);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Live-DOM Element Capture — Options Table IMAGE Extraction
// ---------------------------------------------------------------------------

/**
 * JS expression: locate the FX options table IMAGE element in the LIVE DOM.
 *
 * The options data on investinglive.com is an EMBEDDED RASTER IMAGE (colored
 * grid), NOT a DOM <table>. The image is lazy-loaded and frequently absent
 * from fetched HTML, so it must be found in the rendered DOM after consent
 * dismissal. Multi-strategy search:
 *   1) img[data-src] containing size900 / FXO / expiry (lazy-loading)
 *   2) img[src] containing size900 / FXO / expiry (already loaded)
 *   3) img[alt] containing FXO / option / expiry
 *   4) Largest image inside the main content area (.entry-content, article, main)
 *
 * Returns { src, x, y, width, height } or null. Stashes the element on
 * window.__fxoTarget so later evaluations can re-measure the SAME element.
 */
const OPTIONS_IMAGE_FINDER_EXPR = `(() => {
  // Strategy 1: timestamp-filename image in /cms/media/images/ (the actual options table)
  // Pattern: /cms/media/images/DD-MM-YYYY-HH-MM-SS-(am|pm).jpg
  let img = document.querySelector('img[src*="/cms/media/images/"][src*=".jpg"]');
  if (img) {
    const src = img.src || '';
    // Verify it looks like a timestamp filename (contains date pattern DD-MM-YYYY)
    if (/\\d{1,2}-\\d{1,2}-\\d{4}/.test(src)) {
      const r = img.getBoundingClientRect();
      try { window.__fxoTarget = img; } catch (e) { }
      return { src: img.src, x: r.x, y: r.y, width: r.width, height: r.height };
    }
  }
  // Strategy 2: data-src variants (lazy loading)
  img = document.querySelector('img[data-src*="size900"], img[data-src*="FXO"], img[data-src*="expiry"]');
  if (!img) {
    img = document.querySelector('img[src*="size900"], img[src*="FXO"], img[src*="expiry"]');
  }
  // Strategy 3: alt text (banner fallback — NOT the table, but better than nothing)
  if (!img) {
    img = document.querySelector('img[alt*="FXO"], img[alt*="option"], img[alt*="expiry"]');
  }
  // Strategy 4: largest image in content area
  if (!img) {
    const content = document.querySelector('.entry-content, article, main, .post-content');
    if (content) {
      const imgs = content.querySelectorAll('img');
      let largest = null;
      let largestArea = 0;
      for (const im of imgs) {
        const r = im.getBoundingClientRect();
        const area = r.width * r.height;
        if (area > largestArea) { largestArea = area; largest = im; }
      }
      img = largest;
    }
  }
  if (!img) return null;
  try { window.__fxoTarget = img; } catch (e) { /* stash non-critical */ }
  const r = img.getBoundingClientRect();
  return {
    src: (img.dataset && img.dataset.src) ? img.dataset.src : (img.src || null),
    x: r.x, y: r.y, width: r.width, height: r.height
  };
})()`;

/** Geometry + source URL of the options table image found in the live DOM. */
export interface OptionsImageInfo {
  src: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Generic CDP page evaluation: navigate a fresh tab to `url`, dismiss the
 * cookie-consent overlay (REJECT), wait for render, then evaluate `expression`
 * in the live DOM and return its value (returnByValue — any JSON-serializable
 * type). Closes the tab afterwards. Never throws — returns null on failure.
 *
 * @param url                  URL to navigate to
 * @param expression           JS expression to evaluate after consent + render
 * @param renderWaitMs         Wait after load event before consent (default 10s)
 * @param cloudflareProtected  Use extended timeout for CF-challenged sites
 */
async function evaluateOnPage(
  url: string,
  expression: string,
  renderWaitMs = 10_000,
  cloudflareProtected = true,
): Promise<unknown> {
  const cdpBase = CDP_HEADED_BASE;
  const timeout = cloudflareProtected ? CF_CDP_TIMEOUT_MS : CDP_TIMEOUT_MS;
  let tabId: string | null = null;

  try {
    const tabResp = await fetch(`${cdpBase}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (!tabResp.ok) {
      log.warn(`evaluateOnPage: CDP tab creation failed: HTTP ${tabResp.status}`);
      return null;
    }
    const tabRaw: unknown = await tabResp.json();
    if (typeof tabRaw !== 'object' || tabRaw === null || typeof (tabRaw as Record<string, unknown>).id !== 'string') {
      log.warn('evaluateOnPage: CDP tab response missing required "id" field');
      return null;
    }
    const tab = tabRaw as { id: string; webSocketDebuggerUrl?: string };
    tabId = tab.id;
    if (!tab.webSocketDebuggerUrl) {
      log.warn('evaluateOnPage: CDP tab has no WebSocket URL');
      if (tabId) await closeCDPTab(tabId, cdpBase);
      return null;
    }

    const wsUrl = tab.webSocketDebuggerUrl.replace(
      /ws:\/\/127\.0\.0\.1:\d+/,
      `ws://${CDP_HEADED_BASE.replace('http://', '')}`,
    );

    const value = await new Promise<unknown>((resolve) => {
      const ws = new WebSocket(wsUrl);
      let msgId = 1;
      let loadFired = false;
      let resolved = false;
      let consentEvalId: number | null = null;
      let targetEvalId: number | null = null;

      const cleanup = (result: unknown) => {
        if (resolved) return;
        resolved = true;
        try {
          ws.close();
        } catch (wsCloseErr) {
          log.debug(`evaluateOnPage WS close: ${wsCloseErr instanceof Error ? wsCloseErr.message : String(wsCloseErr)}`);
        }
        resolve(result);
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({
          id: msgId++, method: 'Page.addScriptToEvaluateOnNewDocument',
          params: { source: 'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});' },
        }));
        // Re-navigate AFTER Page.enable so loadEventFired is guaranteed to fire.
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.navigate', params: { url } }));
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return;
        const msg = JSON.parse(ev.data) as Record<string, unknown>;

        // Page loaded → render wait → dismiss cookie consent (REJECT)
        if (msg.method === 'Page.loadEventFired' && !loadFired) {
          loadFired = true;
          setTimeout(() => {
            consentEvalId = msgId++;
            ws.send(JSON.stringify({
              id: consentEvalId,
              method: 'Runtime.evaluate',
              params: { expression: COOKIE_CONSENT_EXPR, returnByValue: true },
            }));
          }, renderWaitMs);
          return;
        }

        // Consent dismissed → settle briefly, then evaluate the target expression
        if (typeof msg.id === 'number' && msg.id === consentEvalId) {
          consentEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          log.info(`evaluateOnPage: cookie consent: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
          setTimeout(() => {
            targetEvalId = msgId++;
            ws.send(JSON.stringify({
              id: targetEvalId,
              method: 'Runtime.evaluate',
              params: { expression, returnByValue: true },
            }));
          }, 1_000);
          return;
        }

        // Target expression result — return its raw value
        if (typeof msg.id === 'number' && msg.id === targetEvalId) {
          targetEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          cleanup(evalRes ? evalRes.value : null);
          return;
        }
      };

      ws.onerror = () => cleanup(null);
      setTimeout(() => cleanup(null), timeout);
    });

    if (tabId) {
      await closeCDPTab(tabId, cdpBase);
      tabId = null;
    }
    return value ?? null;
  } catch (err) {
    log.warn(`evaluateOnPage failed: ${err instanceof Error ? err.message : String(err)}`);
    if (tabId) await closeCDPTab(tabId, cdpBase);
    return null;
  }
}

/**
 * Find the FX options table IMAGE element in the live DOM of a page.
 *
 * Navigates a fresh tab to `url`, dismisses cookie consent (REJECT), waits
 * for render, then runs the multi-strategy image finder. Returns the image's
 * source URL (data-src preferred) and bounding geometry, or null if no
 * plausible options image exists on the page.
 *
 * @param url          Sub-page URL (e.g. investinglive.com/Orders/fx-option-expiries-for-...)
 * @param renderWaitMs Wait after load before consent + search (default 10s)
 */
export async function findOptionsTableImage(
  url: string,
  renderWaitMs = 10_000,
): Promise<OptionsImageInfo | null> {
  const result = await evaluateOnPage(url, OPTIONS_IMAGE_FINDER_EXPR, renderWaitMs, true);
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    log.info('findOptionsTableImage: no options image found in live DOM');
    return null;
  }
  const r = result as Record<string, unknown>;
  const x = r['x'];
  const y = r['y'];
  const width = r['width'];
  const height = r['height'];
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
    log.warn('findOptionsTableImage: finder returned malformed geometry');
    return null;
  }
  // Reject tiny elements — the options table image is a large colored grid
  if (width < 50 || height < 30) {
    log.info(`findOptionsTableImage: candidate too small (${Math.round(width)}x${Math.round(height)}) — rejecting`);
    return null;
  }
  const src = typeof r['src'] === 'string' && r['src'].length > 0 ? r['src'] : null;
  log.info(
    `findOptionsTableImage: found image ${Math.round(width)}x${Math.round(height)} ` +
      `src=${src ? src.substring(0, 80) : 'none'}`,
  );
  return { src, x, y, width, height };
}

/**
 * Navigate to a URL and take a ZOOMED screenshot of a single DOM element
 * (the options table image) using CDP Page.captureScreenshot with a clip
 * region — NOT a full-page screenshot. The 2x scale factor keeps table text
 * readable for VLM extraction.
 *
 * Flow: navigate → render wait → cookie consent (REJECT) → find element
 * (cssSelector, then multi-strategy image fallback) → scroll into view →
 * re-measure bounding rect → captureScreenshot with clip → save PNG.
 *
 * Never throws — returns null on failure.
 *
 * @param url          URL to navigate to
 * @param cssSelector  Primary CSS selector for the target element
 * @param renderWaitMs Wait after load before consent (default 10s)
 * @returns File path to the saved clipped PNG, or null on failure
 */
export async function navigateAndScreenshotElement(
  url: string,
  cssSelector: string,
  renderWaitMs = 10_000,
): Promise<string | null> {
  const cdpBase = CDP_HEADED_BASE;
  const screenshotPath = `/tmp/vlm_element_${Date.now()}.png`;

  log.info(`navigateAndScreenshotElement: ${url.substring(0, 70)} (selector: ${cssSelector.substring(0, 50)}...)`);

  // Find the target element: caller's selector first, then the same
  // multi-strategy image fallback used by OPTIONS_IMAGE_FINDER_EXPR.
  // Stashes the element on window.__fxoTarget for later re-measurement.
  const FIND_ELEMENT_EXPR = `(() => {
    let el = null;
    try { el = document.querySelector(${JSON.stringify(cssSelector)}); } catch (e) { el = null; }
    if (!el) {
      el = document.querySelector('img[data-src*="size900"], img[data-src*="FXO"], img[data-src*="expiry"]')
        || document.querySelector('img[src*="size900"], img[src*="FXO"], img[src*="expiry"]')
        || document.querySelector('img[alt*="FXO"], img[alt*="option"], img[alt*="expiry"]');
    }
    if (!el) {
      const content = document.querySelector('.entry-content, article, main, .post-content');
      if (content) {
        const imgs = content.querySelectorAll('img');
        let largest = null;
        let largestArea = 0;
        for (const im of imgs) {
          const r = im.getBoundingClientRect();
          const area = r.width * r.height;
          if (area > largestArea) { largestArea = area; largest = im; }
        }
        el = largest;
      }
    }
    if (!el) return null;
    try { window.__fxoTarget = el; } catch (e) { /* stash non-critical */ }
    return 'found:' + el.tagName;
  })()`;

  const SCROLL_EXPR = `(() => {
    const el = window.__fxoTarget;
    if (!el) return null;
    try { el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
    catch (e) { try { el.scrollIntoView(); } catch (e2) { /* scroll non-blocking */ } }
    return 'scrolled';
  })()`;

  const RECT_EXPR = `(() => {
    const el = window.__fxoTarget;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  })()`;

  let tabId: string | null = null;

  try {
    // Step 1: Create new tab
    const tabResp = await fetch(`${cdpBase}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    if (!tabResp.ok) {
      log.warn(`navigateAndScreenshotElement: CDP tab creation failed: HTTP ${tabResp.status}`);
      return null;
    }
    const tabRaw: unknown = await tabResp.json();
    if (typeof tabRaw !== 'object' || tabRaw === null || typeof (tabRaw as Record<string, unknown>).id !== 'string') {
      log.warn('navigateAndScreenshotElement: CDP tab response missing required "id" field');
      return null;
    }
    const tab = tabRaw as { id: string; webSocketDebuggerUrl?: string };
    tabId = tab.id;
    if (!tab.webSocketDebuggerUrl) {
      log.warn('navigateAndScreenshotElement: CDP tab has no WebSocket URL');
      if (tabId) await closeCDPTab(tabId, cdpBase);
      return null;
    }

    const wsUrl = tab.webSocketDebuggerUrl.replace(
      /ws:\/\/127\.0\.0\.1:\d+/,
      `ws://${CDP_HEADED_BASE.replace('http://', '')}`,
    );

    // Step 2: Connect WebSocket → consent → find → scroll → clip capture
    const screenshot = await new Promise<string | null>((resolve) => {
      const ws = new WebSocket(wsUrl);
      let msgId = 1;
      let loadFired = false;
      let resolved = false;
      let consentEvalId: number | null = null;
      let findEvalId: number | null = null;
      let scrollEvalId: number | null = null;
      let rectEvalId: number | null = null;

      const cleanup = (result: string | null) => {
        if (resolved) return;
        resolved = true;
        try {
          ws.close();
        } catch (wsCloseErr) {
          log.debug(`navigateAndScreenshotElement WS close: ${wsCloseErr instanceof Error ? wsCloseErr.message : String(wsCloseErr)}`);
        }
        resolve(result);
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({
          id: msgId++, method: 'Page.addScriptToEvaluateOnNewDocument',
          params: { source: 'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});' },
        }));
        // Re-navigate AFTER Page.enable so loadEventFired is guaranteed to fire.
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.navigate', params: { url } }));
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return;
        const msg = JSON.parse(ev.data) as Record<string, unknown>;

        // Page loaded → render wait → dismiss cookie consent (REJECT)
        if (msg.method === 'Page.loadEventFired' && !loadFired) {
          loadFired = true;
          setTimeout(() => {
            consentEvalId = msgId++;
            ws.send(JSON.stringify({
              id: consentEvalId,
              method: 'Runtime.evaluate',
              params: { expression: COOKIE_CONSENT_EXPR, returnByValue: true },
            }));
          }, renderWaitMs);
          return;
        }

        // Consent dismissed → find the target element
        if (typeof msg.id === 'number' && msg.id === consentEvalId) {
          consentEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          log.info(`navigateAndScreenshotElement: cookie consent: ${typeof evalRes?.value === 'string' ? evalRes.value : 'n/a'}`);
          setTimeout(() => {
            findEvalId = msgId++;
            ws.send(JSON.stringify({
              id: findEvalId,
              method: 'Runtime.evaluate',
              params: { expression: FIND_ELEMENT_EXPR, returnByValue: true },
            }));
          }, 1_000);
          return;
        }

        // Element found → scroll it into view
        if (typeof msg.id === 'number' && msg.id === findEvalId) {
          findEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          const found = evalRes?.value;
          if (typeof found !== 'string' || !found.startsWith('found:')) {
            log.warn('navigateAndScreenshotElement: target element not found in live DOM');
            cleanup(null);
            return;
          }
          log.info(`navigateAndScreenshotElement: ${found} — scrolling into view`);
          scrollEvalId = msgId++;
          ws.send(JSON.stringify({
            id: scrollEvalId,
            method: 'Runtime.evaluate',
            params: { expression: SCROLL_EXPR, returnByValue: true },
          }));
          return;
        }

        // Scrolled → settle, then re-measure the bounding rect (viewport coords
        // change after scroll — clip must use the post-scroll rect)
        if (typeof msg.id === 'number' && msg.id === scrollEvalId) {
          scrollEvalId = null;
          setTimeout(() => {
            rectEvalId = msgId++;
            ws.send(JSON.stringify({
              id: rectEvalId,
              method: 'Runtime.evaluate',
              params: { expression: RECT_EXPR, returnByValue: true },
            }));
          }, 700);
          return;
        }

        // Rect measured → capture screenshot clipped to the element, 2x zoom
        if (typeof msg.id === 'number' && msg.id === rectEvalId) {
          rectEvalId = null;
          const evalRes = (msg.result as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined;
          const rect = evalRes?.value as Record<string, unknown> | null | undefined;
          const rx = rect?.['x'];
          const ry = rect?.['y'];
          const rw = rect?.['width'];
          const rh = rect?.['height'];
          if (
            typeof rx !== 'number' || typeof ry !== 'number' ||
            typeof rw !== 'number' || typeof rh !== 'number' ||
            rw < 20 || rh < 20
          ) {
            log.warn('navigateAndScreenshotElement: element rect unusable — aborting capture');
            cleanup(null);
            return;
          }
          const clip = {
            x: Math.max(0, Math.round(rx)),
            y: Math.max(0, Math.round(ry)),
            width: Math.round(rw),
            height: Math.round(rh),
            scale: 2, // 2x zoom — table text must be VLM-readable
          };
          log.info(`navigateAndScreenshotElement: capturing clip ${clip.width}x${clip.height} @ (${clip.x},${clip.y}) scale=2`);
          ws.send(JSON.stringify({
            id: msgId++,
            method: 'Page.captureScreenshot',
            params: { format: 'png', clip },
          }));
          return;
        }

        // Capture screenshot result
        const result = msg.result as Record<string, unknown> | undefined;
        if (msg.id !== undefined && result?.data) {
          const screenshotData = result.data;
          if (typeof screenshotData === 'string') {
            cleanup(screenshotData);
          }
        }
      };

      ws.onerror = () => cleanup(null);
      setTimeout(() => cleanup(null), 60_000);
    });

    // Step 3: Close tab
    if (tabId) {
      await closeCDPTab(tabId, cdpBase);
      tabId = null;
    }

    if (!screenshot) {
      log.warn('navigateAndScreenshotElement: capture returned null');
      return null;
    }

    // Step 4: Save base64 to file
    const fs = await import('node:fs');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot, 'base64'));
    log.info(`Element screenshot saved: ${screenshotPath} (${((screenshot.length * 0.75) / 1024).toFixed(0)}KB)`);
    return screenshotPath;
  } catch (err) {
    log.warn(`navigateAndScreenshotElement failed: ${err instanceof Error ? err.message : String(err)}`);
    if (tabId) await closeCDPTab(tabId, CDP_HEADED_BASE);
    return null;
  }
}

/**
 * Navigate the headed browser's FIRST (existing) tab to a URL.
 *
 * Unlike navigateAndScreenshot which creates+closes temp tabs, this keeps
 * the tab open permanently so the browser always shows something useful
 * instead of sitting on about:blank between harvests.
 *
 * Fire-and-forget by design — callers should `.catch(() => {})` the result.
 */
export async function navigateHeadedBrowser(url: string): Promise<void> {
  try {
    const resp = await fetch(`${CDP_HEADED_BASE}/json`);
    if (!resp.ok) {
      log.warn(`navigateHeadedBrowser: CDP /json returned HTTP ${resp.status}`);
      return;
    }
    const tabsRaw: unknown = await resp.json();
    if (!Array.isArray(tabsRaw)) {
      log.warn(`navigateHeadedBrowser: CDP /json returned non-array (${typeof tabsRaw}) — cannot navigate`);
      return;
    }
    const tabs = tabsRaw as Array<{
      id: string;
      type: string;
      url: string;
      webSocketDebuggerUrl?: string;
    }>;
    const pageTab = tabs.find((t) => t.type === 'page');
    if (!pageTab?.webSocketDebuggerUrl) {
      log.warn('navigateHeadedBrowser: no page-type tab found on headed browser');
      return;
    }

    // Rewrite WS URL: CDP returns ws://127.0.0.1:PORT/... which is
    // unreachable from inside the container. Replace with socat bridge host.
    const wsUrl = pageTab.webSocketDebuggerUrl.replace(
      /ws:\/\/127\.0\.0\.1:\d+/,
      `ws://${CDP_HEADED_BASE.replace('http://', '')}`,
    );

    await new Promise<void>((resolve) => {
      const ws = new WebSocket(wsUrl);
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch (wsCloseErr) {
          log.debug(`navigateHeadedBrowser WS close during cleanup: ${wsCloseErr instanceof Error ? wsCloseErr.message : String(wsCloseErr)}`);
        }
        resolve();
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Page.navigate', params: { url } }));
        // Give the navigation a moment to register, then close.
        setTimeout(done, 3000);
      };

      ws.onerror = () => done();
      // Hard timeout
      setTimeout(done, 5000);
    });

    log.info(`navigateHeadedBrowser: navigated headed browser to ${url.substring(0, 60)}...`);
  } catch (err) {
    log.warn(`navigateHeadedBrowser failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Run VLM inference on a screenshot file via the VLM server directly.
 * Uses the OpenAI-compatible API at port 18082 (socat bridge to 8082).
 *
 * POST /v1/chat/completions with image_url (base64) + text prompt.
 */
/**
 * Run VLM inference on an image file.
 * PRIMARY: MiMo v2.5 cloud vision via OpenCode Go.
 * FALLBACK: direct local VLM call (:8082) when the cloud path is unavailable.
 */
export async function vlmInfer(imagePath: string, prompt: string): Promise<string | null> {
  // ── PRIMARY: MiMo v2.5 via OpenCode Go (fast cloud vision, ~3s per call) ──
  const OPENCODE_GO_URL = 'https://opencode.ai/zen/go/v1/chat/completions';
  const OPENCODE_GO_KEY = process.env.OPENCODE_API_KEY ?? process.env.OPENCODE_GO_KEY;
  if (!OPENCODE_GO_KEY) {
    throw new Error("DATA-SOURCE-ROUTER: OPENCODE_API_KEY env is not set");
  }
  const VISION_MODEL = 'mimo-v2.5';

  // ── FALLBACK: Direct local VLM (slow, ~55s per call) ──
  const VLM_DIRECT_URL = 'http://localhost:8082';
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 2000;

  const fs = await import('node:fs');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const mime =
    imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8
      ? 'image/jpeg'
      : imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50
        ? 'image/png'
        : 'image/jpeg';

  log.info(`vlmInfer: ${imagePath} (${(base64.length * 0.75 / 1024).toFixed(0)}KB) → MiMo v2.5`);

  // ── PATH 0: MiMo v2.5 via OpenCode Go (PRIMARY — fast cloud vision) ──
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const dataUrl = `data:${mime};base64,${base64}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const startTime = Date.now();

      const resp = await fetch(OPENCODE_GO_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCODE_GO_KEY}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          }],
          max_tokens: 4000,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (resp.ok) {
        const data: unknown = await resp.json();
        const content = (data as Record<string, unknown>)?.['choices'] as Array<Record<string, unknown>> | undefined;
        const msg = content?.[0]?.['message'] as Record<string, unknown> | undefined;
        const text = msg?.['content'] as string | null;

        if (text && text.length > 5) {
          log.info(`vlmInfer success via MiMo v2.5 (${elapsed}s, attempt ${attempt}): ${text.substring(0, 100)}...`);
          return text;
        }
        log.warn(`vlmInfer: MiMo returned empty content (${elapsed}s, attempt ${attempt})`);
      } else {
        log.warn(`vlmInfer: MiMo v2.5 returned ${resp.status} (${elapsed}s, attempt ${attempt})`);
      }
    } catch (err) {
      log.warn(`vlmInfer: MiMo v2.5 failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── FALLBACK PATHS (local VLM — much slower) ──
  log.info('vlmInfer: MiMo failed, falling back to local VLM...');

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // ── FALLBACK: Direct local VLM call (:8082) ──
    try {
      const dataUrl = `data:${mime};base64,${base64}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);
      const resp = await fetch(`${VLM_DIRECT_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'jan-v2-vl-high-q4_k_m.gguf',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          }],
          max_tokens: 2048,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const vlmData: unknown = await resp.json();
        if (typeof vlmData !== 'object' || vlmData === null) {
          log.warn(`vlmInfer: direct VLM response was not an object (attempt ${attempt})`);
        } else {
          const data = vlmData as Record<string, unknown>;
          const choicesRaw = data['choices'];
          if (Array.isArray(choicesRaw) && choicesRaw.length > 0) {
            const firstChoiceRaw = choicesRaw[0];
            if (typeof firstChoiceRaw !== 'object' || firstChoiceRaw === null) {
              log.warn(`vlmInfer: choices[0] is not an object (got ${typeof firstChoiceRaw}) (attempt ${attempt})`);
            } else {
            const firstChoice = firstChoiceRaw as Record<string, unknown>;
            const messageRaw = firstChoice['message'];
            let content: string | undefined;
            if (typeof messageRaw === 'object' && messageRaw !== null) {
              const msgContent = (messageRaw as Record<string, unknown>)['content'];
              content = typeof msgContent === 'string' ? msgContent : undefined;
            }
            // Strip </think> tags (Qwen3VL reasoning)
            if (content) {
              const thinkEnd = content.lastIndexOf('</think>');
              if (thinkEnd !== -1) {
                const afterThink = content.substring(thinkEnd + 8).trim();
                content = afterThink || content.replace(/<\/?think>/g, '').trim();
              }
            }
            if (content && content.length > 5) {
              log.info(`vlmInfer success via direct VLM (attempt ${attempt}): ${content.substring(0, 100)}...`);
              return content;
            }
            }
          }
        }
      }
      log.warn(`vlmInfer: direct VLM returned ${resp.status} (attempt ${attempt})`);
    } catch (err) {
      log.warn(`vlmInfer: direct VLM failed (attempt ${attempt}): ${err instanceof Error ? err.message : String(err)}`);
    }

    if (attempt < MAX_RETRIES) {
      log.info(`vlmInfer: retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  log.warn('vlmInfer: all attempts exhausted');
  return null;
}

/**
 * Fetch page content using the host's Chrome browser via CDP.
 *
 * This is the equivalent of `z-ai page_reader` from the TTE spec.
 * Bypasses Cloudflare/CloudFront anti-bot protection by using a real browser.
 *
 * Flow:
 *  1. Create a new tab via CDP HTTP API (PUT /json/new?url)
 *  2. Connect to tab's WebSocket
 *  3. Wait for Page.loadEventFired + additional render time
 *  4. Extract document.body.innerText via Runtime.evaluate
 *  5. Close the tab
 */
async function _cdpFetchOnce(url: string, cloudflareProtected = false, headedBrowser = true, extractExpression?: string): Promise<string | null> {
  const renderWait = cloudflareProtected ? CF_RENDER_WAIT_MS : RENDER_WAIT_MS;
  const timeout = cloudflareProtected ? CF_CDP_TIMEOUT_MS : CDP_TIMEOUT_MS;
  const cdpBase = headedBrowser ? CDP_HEADED_BASE : CDP_BASE;

  log.info(`_cdpFetchOnce: ${url.substring(0, 60)}... (cf=${cloudflareProtected}, headed=${headedBrowser}, renderWait=${renderWait}ms, timeout=${timeout}ms)`);

  let tabId: string | null = null;

  try {
    // Step 1: Create a new tab pointing to the target URL
    const tabResp = await fetch(`${cdpBase}/json/new?${encodeURIComponent(url)}`, {
      method: 'PUT',
    });

    if (!tabResp.ok) {
      log.warn(`CDP tab creation failed: HTTP ${tabResp.status} for ${url.substring(0, 60)}`);
      return null;
    }

    const tabRaw: unknown = await tabResp.json();
    if (typeof tabRaw !== 'object' || tabRaw === null || typeof (tabRaw as Record<string, unknown>).id !== 'string') {
      log.warn(`CDP tab response missing required "id" field for ${url.substring(0, 60)}`);
      return null;
    }
    const tab = tabRaw as { id: string; webSocketDebuggerUrl?: string };
    tabId = tab.id;

    if (!tab.webSocketDebuggerUrl) {
      log.warn(`CDP tab has no WebSocket URL`);
      if (tabId) await closeCDPTab(tabId, cdpBase);
      return null;
    }

    const wsUrl = tab.webSocketDebuggerUrl;

    // Step 2: Connect via WebSocket and extract content
    const content = await new Promise<string | null>((resolve) => {
      const ws = new WebSocket(wsUrl);
      let msgId = 1;
      let loadFired = false;
      let resolved = false;
      let innerText: string | null = null;
      let cfRetrySent = false;
      let currentPhase = 'connecting';
      let consentEvalId: number | null = null;
      let tableWaitEvalId: number | null = null;

      const cleanup = (result: string | null) => {
        if (resolved) return;
        resolved = true;
        try {
          ws.close();
        } catch (closeErr) {
          // Best-effort close during cleanup — ignore errors
          log.debug(`WS close during cleanup: ${closeErr}`);
        }
        resolve(result);
      };

      /**
       * Send Runtime.evaluate to extract page content.
       * Defaults to document.body.innerText, but callers can pass a custom
       * expression (e.g. innerHTML for extracting data-src attributes).
       * If cfRetry has been sent, we already re-evaluated after CF wait.
       */
      const _extractExpr =
        extractExpression ||
        'document.body ? document.body.innerText : document.documentElement.innerText';
      const requestInnerText = () => {
        ws.send(
          JSON.stringify({
            id: msgId++,
            method: 'Runtime.evaluate',
            params: {
              expression: _extractExpr,
              returnByValue: true,
            },
          }),
        );
      };

      /**
       * Dismiss cookie-consent overlays, then wait for the options table to
       * render and scroll it into view — BEFORE extracting page content.
       * investinglive.com's consent banner covers the options table; the table
       * DOM also finishes rendering only after consent in some layouts.
       * Chain: consent eval → table-wait eval → requestInnerText (in onmessage).
       */
      const startConsentThenExtract = () => {
        currentPhase = 'cookie-consent';
        consentEvalId = msgId++;
        ws.send(
          JSON.stringify({
            id: consentEvalId,
            method: 'Runtime.evaluate',
            params: { expression: COOKIE_CONSENT_EXPR, returnByValue: true },
          }),
        );
      };

      ws.onopen = () => {
        currentPhase = 'navigating';
        log.info(`CDP WebSocket connected to ${wsUrl.substring(0, 50)}...`);

        // Enable required domains
        ws.send(JSON.stringify({ id: msgId++, method: 'Page.enable' }));
        ws.send(JSON.stringify({ id: msgId++, method: 'Runtime.enable' }));

        // Inject anti-detection script before navigation
        ws.send(
          JSON.stringify({
            id: msgId++,
            method: 'Page.addScriptToEvaluateOnNewDocument',
            params: {
              source:
                'Object.defineProperty(navigator,"webdriver",{get:()=>undefined});' +
                'Object.defineProperty(navigator,"plugins",{get:()=>[1,2,3,4,5]});' +
                'Object.defineProperty(navigator,"languages",{get:()=>["en-US","en"]});' +
                'window.chrome={runtime:{}};',
            },
          }),
        );

        // Navigate to URL
        ws.send(
          JSON.stringify({
            id: msgId++,
            method: 'Page.navigate',
            params: { url },
          }),
        );
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          log.debug(`_cdpFetchOnce WS: received non-string message (${typeof event.data}) — ignoring`);
          return;
        }
        const msg = JSON.parse(event.data) as Record<string, unknown>;

        // Check for navigation error
        if (msg.id && msg.method === undefined && msg.error) {
          log.warn(`CDP error: ${JSON.stringify(msg.error).substring(0, 200)}`);
        }

        // Wait for page load event, then extract content after render delay
        if (msg.method === 'Page.loadEventFired' && !loadFired) {
          loadFired = true;
          currentPhase = 'render-wait';
          log.info(`CDP page loaded, waiting ${renderWait}ms for JS render...`);

          setTimeout(() => {
            startConsentThenExtract();
          }, renderWait);
        }

        // Handle frameStoppedLoading as fallback if loadEventFired doesn't fire
        if (msg.method === 'Page.frameStoppedLoading' && !loadFired) {
          loadFired = true;
          currentPhase = 'render-wait';
          log.info(`CDP frame stopped loading, waiting ${renderWait}ms...`);

          setTimeout(() => {
            startConsentThenExtract();
          }, renderWait);
        }

        // Get the Runtime.evaluate result
        const evalResult = msg.result as Record<string, unknown> | undefined;
        const evalInnerResult = evalResult?.result as Record<string, unknown> | undefined;

        // ── Auxiliary evaluate results (cookie consent / table wait) — these are
        // NOT page content; chain the next step instead of treating them as data.
        if (typeof msg.id === 'number' && msg.id === consentEvalId) {
          consentEvalId = null;
          log.info(`  [cdp] Cookie consent: ${typeof evalInnerResult?.value === 'string' ? evalInnerResult.value : 'n/a'}`);
          currentPhase = 'table-wait';
          tableWaitEvalId = msgId++;
          ws.send(
            JSON.stringify({
              id: tableWaitEvalId,
              method: 'Runtime.evaluate',
              params: { expression: OPTIONS_TABLE_WAIT_EXPR, returnByValue: true, awaitPromise: true },
            }),
          );
          return;
        }
        if (typeof msg.id === 'number' && msg.id === tableWaitEvalId) {
          tableWaitEvalId = null;
          log.info(`  [cdp] Options table wait: ${typeof evalInnerResult?.value === 'string' ? evalInnerResult.value : 'n/a'}`);
          currentPhase = 'extracting';
          requestInnerText();
          return;
        }

        if (evalResult && evalInnerResult && evalInnerResult.value !== undefined) {
          const evalValue = evalInnerResult.value;
          if (typeof evalValue !== 'string') {
            log.debug(`_cdpFetchOnce: Runtime.evaluate returned non-string value (${typeof evalValue})`);
          } else {
            innerText = evalValue;

          // Check for Cloudflare challenge page
          if (
            cloudflareProtected &&
            !cfRetrySent &&
            innerText &&
            (
              innerText.includes('Checking your browser') ||
              innerText.includes('cf-challenge') ||
              innerText.includes('Just a moment') ||
              innerText.includes('Enable JavaScript and cookies') ||
              innerText.includes('Attention Required')
            )
          ) {
            log.info(`Cloudflare challenge detected — waiting ${CF_CHALLENGE_WAIT_MS}ms and re-evaluating...`);
            cfRetrySent = true;
            currentPhase = 'cf-challenge-wait';
            setTimeout(() => {
              startConsentThenExtract();
            }, CF_CHALLENGE_WAIT_MS);
            return;
          }

          if (innerText && innerText.length > 50) {
            log.info(`CDP content extracted: ${innerText.length} chars`);
            cleanup(innerText);
          } else if (cfRetrySent) {
            // Already retried, this is the best we have
            log.warn(`CDP returned short content after CF retry: ${innerText?.length ?? 0} chars`);
            cleanup(null);
          }
          }
        }
      };

      ws.onerror = (err) => {
        log.warn(`CDP WebSocket error for ${url} (phase=${currentPhase}): ${err instanceof Error ? err.message : String(err)}`);
        cleanup(null);
      };

      ws.onclose = () => {
        if (!resolved) cleanup(null);
      };

      // Overall timeout
      setTimeout(() => {
        log.warn(`CDP timeout for ${url} after ${timeout}ms (phase=${currentPhase})`);
        cleanup(null);
      }, timeout);
    });

    // Step 3: Close the tab
    if (tabId) await closeCDPTab(tabId, cdpBase);
    tabId = null;

    return content;
  } catch (err) {
    log.warn(
      `CDP browser fetch failed for ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
    if (tabId) await closeCDPTab(tabId, cdpBase);
    return null;
  }
}

/**
 * Fetch via CDP browser with automatic single retry on null/empty result.
 * Tries a fresh tab if the first attempt yields nothing.
 * This is the public entry point used by fetchSource() and fetchUrlViaCDP().
 */
async function fetchViaCDPBrowser(url: string, cloudflareProtected = false, headedBrowser = true, extractExpression?: string): Promise<string | null> {
  // Attempt 1
  const result1 = await _cdpFetchOnce(url, cloudflareProtected, headedBrowser, extractExpression);
  if (result1 && result1.length > 50) return result1;

  // Retry with a fresh tab
  log.warn(`CDP first attempt returned null/empty (${result1?.length ?? 0} chars) — retrying with fresh tab for ${url.substring(0, 60)}...`);
  await new Promise((r) => setTimeout(r, 3_000)); // brief cooldown before retry
  const result2 = await _cdpFetchOnce(url, cloudflareProtected, headedBrowser, extractExpression);
  if (result2 && result2.length > 50) return result2;

  log.warn(`CDP both attempts failed for ${url.substring(0, 60)}`);
  return null;
}

/** Close a CDP tab by ID */
async function closeCDPTab(tabId: string, cdpBase: string = CDP_BASE): Promise<void> {
  try {
    await fetch(`${cdpBase}/json/close/${tabId}`);
    log.debug(`Closed CDP tab ${tabId}`);
  } catch (closeErr) {
    log.warn(`Failed to close CDP tab ${tabId}: ${closeErr}`);
  }
}

/**
 * Fetch arbitrary URL content via CDP browser.
 * Exported for Protocol A and other callers that need to navigate to
 * URLs not in SOURCE_CONFIGS.
 *
 * @param url       The URL to fetch
 * @param cloudflare  Set true for Cloudflare-protected sites (longer delays + CF detection)
 * @param headedBrowser  Set true to use the headed Chrome instance (port 9225) for anti-bot bypass
 * @returns          Page innerText or null on failure
 */
export async function fetchUrlViaCDP(url: string, cloudflareProtected = false, headedBrowser = true, extractExpression?: string): Promise<string | null> {
  return fetchViaCDPBrowser(url, cloudflareProtected, headedBrowser, extractExpression);
}

/**
 * Fetch page HTML (innerHTML) via CDP browser — needed for extracting
 * data-src attributes from lazy-loaded images (e.g. Investinglive options tables).
 *
 * Same as fetchUrlViaCDP but evaluates document.body.innerHTML instead of innerText.
 *
 * @param url       The URL to fetch
 * @param cloudflare  Set true for Cloudflare-protected sites
 * @param headedBrowser  Set true to use headed Chrome (port 9225)
 * @returns          Page innerHTML or null on failure
 */
export async function fetchHtmlViaCDP(url: string, cloudflareProtected = false, headedBrowser = true): Promise<string | null> {
  return fetchUrlViaCDP(
    url,
    cloudflareProtected,
    headedBrowser,
    'document.body ? document.body.innerHTML : document.documentElement.innerHTML',
  );
}

/**
 * Download an image from a URL and save to a temp file.
 * Used by Protocol A to download lazy-loaded options table images from
 * Investinglive (data-src URLs pointing to images.investinglive.com).
 *
 * Sends proper Referer + User-Agent headers to avoid hotlink protection.
 *
 * @param imageUrl  Direct URL to the image (e.g. https://images.investinglive.com/...)
 * @returns         File path to downloaded image, or null on failure
 */
export async function downloadImage(imageUrl: string): Promise<string | null> {
  const imgPath = `/tmp/vlm_img_${Date.now()}.jpg`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    log.info(`downloadImage: fetching ${imageUrl.substring(0, 80)}...`);

    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Referer: 'https://investinglive.com/Orders/',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      log.warn(`downloadImage: HTTP ${resp.status} for ${imageUrl.substring(0, 80)}`);
      return null;
    }

    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length < 1000) {
      log.warn(`downloadImage: suspiciously small response (${buffer.length} bytes) — likely an error page`);
      return null;
    }

    const fs = await import('node:fs');
    fs.writeFileSync(imgPath, buffer);
    log.info(`downloadImage: saved ${imgPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
    return imgPath;
  } catch (err) {
    log.warn(`downloadImage failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source Fetch Router
// ---------------------------------------------------------------------------

/**
 * Fetch a single source. Never throws — returns null on any failure.
 * Routes to the appropriate access method based on SourceConfig.
 *
 * Supports per-source timeout and retry via SourceConfig fields.
 */
export async function fetchSource(
  sourceKey: string,
  variables: Record<string, string> = {},
): Promise<string | null> {
  const config = SOURCE_CONFIGS[sourceKey];
  if (!config) {
    log.warn(`Unknown source: ${sourceKey}`);
    return null;
  }

  let url = config.url;
  for (const [key, value] of Object.entries(variables)) {
    url = url.replace(`{${key}}`, encodeURIComponent(value));
  }

  const timeoutMs = config.timeoutMs ?? 15_000;
  const maxRetries = config.maxRetries ?? 0;

  log.info(`Fetching ${sourceKey} via ${config.method}...`);

  // Single-attempt fetch helper
  const attemptFetch = async (): Promise<string | null> => {
    switch (config.method) {
      case 'vc_browser':
        return fetchViaCDPBrowser(url, config.cloudflareProtected ?? false, config.headedBrowser ?? false);
      case 'fetch_headers':
        return fetchViaHttp(url, config.headers ?? BROWSER_HEADERS, timeoutMs);
      case 'fetch':
      default:
        return fetchViaHttp(url, undefined, timeoutMs);
    }
  };

  // Try with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await attemptFetch();
    if (result !== null) return result;

    if (attempt < maxRetries) {
      const backoffMs = 2_000 * (attempt + 1); // 2s, 4s, 6s...
      log.info(`Retrying ${sourceKey} (attempt ${attempt + 2}/${maxRetries + 1}) after ${backoffMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  log.warn(`${sourceKey}: all ${maxRetries + 1} attempt(s) failed`);
  return null;
}

/**
 * Plain HTTP fetch with optional headers. Never throws.
 */
async function fetchViaHttp(
  url: string,
  headers: Record<string, string> | undefined,
  timeoutMs: number,
): Promise<string | null> {
  // Try fetch() first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      headers: headers ?? {},
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      if (text && text.length > 10) {
        log.info(`Fetched ${text.length} chars via fetch()`);
        return text;
      }
    }
    log.warn(`fetch() returned ${response.status} for ${url.substring(0, 60)}`);
  } catch (err) {
    log.warn(`fetch() failed for ${url.substring(0, 60)}: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Fallback: curl shell-out (handles TLS/DNS issues that Bun fetch can't)
  try {
    const proc = Bun.spawn(['curl', '-sL', '--max-time', '20', url], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode === 0 && text && text.length > 10) {
      log.info(`Fetched ${text.length} chars via curl fallback`);
      return text;
    }
    log.warn(`curl fallback exit ${exitCode} for ${url.substring(0, 60)}`);
  } catch (err) {
    log.warn(`curl fallback failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Both fetch() and curl fallback exhausted — all preceding log.warn calls documented the failures
  log.warn(`fetchViaHttp: all methods exhausted for ${url.substring(0, 60)}`);
  return null;
}

/**
 * Fetch multiple sources in parallel. Returns a Map keyed by sourceKey.
 * Each value is either the fetched string or null if that source failed.
 *
 * Note: vc_browser sources are rate-limited to MAX_CONCURRENT_TABS to avoid
 * overwhelming the host Chrome instance.
 */
export async function fetchSourcesParallel(
  sourceKeys: string[],
): Promise<Map<string, string | null>> {
  // Separate vc_browser sources from others (rate-limit browser sources)
  const browserKeys = sourceKeys.filter(
    (k) => SOURCE_CONFIGS[k]?.method === 'vc_browser',
  );
  const httpKeys = sourceKeys.filter(
    (k) => SOURCE_CONFIGS[k]?.method !== 'vc_browser',
  );

  const map = new Map<string, string | null>();

  // HTTP sources run fully in parallel
  const httpResults = await Promise.allSettled(httpKeys.map((k) => fetchSource(k)));
  for (let i = 0; i < httpKeys.length; i++) {
    const result = httpResults[i];
    map.set(httpKeys[i], result.status === 'fulfilled' ? result.value : null);
  }

  // Browser sources run in limited-parallelism batches
  for (let i = 0; i < browserKeys.length; i += MAX_CONCURRENT_TABS) {
    const batch = browserKeys.slice(i, i + MAX_CONCURRENT_TABS);
    const batchResults = await Promise.allSettled(batch.map((k) => fetchSource(k)));
    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      map.set(batch[j], result.status === 'fulfilled' ? result.value : null);
    }
  }

  return map;
}
