/**
 * TvChartController — Self-contained TradingView visual intelligence controller.
 *
 * Replaces the broken external VC daemon dependency for Engine 3 chart
 * manipulation. Attaches over RAW CDP WebSocket (Bun-native WebSocket) to the
 * EXISTING headed Chrome on port 9228 that the pipeline already uses for data
 * harvesting (see engine/data-source-router.ts — CDP_HEADED_BASE, which uses
 * the same raw CDP WebSocket pattern this controller copies).
 *
 * Previously this used playwright-core's chromium.connectOverCDP(), whose
 * WebSocket handshake does not complete under the Bun runtime — the raw
 * Bun-native WebSocket replaces it with zero external dependencies.
 *
 * Adds INPUT INJECTION on top of the existing screenshot/navigation
 * capabilities:
 *   - click (timeframe buttons, via Runtime.evaluate DOM clicks)
 *   - keyboard (interval typing, arrow-key scrollback, zoom, via
 *     Input.dispatchKeyEvent / Input.insertText)
 *   - mouse drag (pan back in time, via Input.dispatchMouseEvent)
 *   - scrollback through history for the week-capture workflow
 *   - chart drawing overlays (supply/demand/liquidity zones, price lines)
 *
 * Design contract (inviolable):
 *   - NEVER spawn a new browser. connect() attaches to the SAME headed
 *     Chrome the harvester uses (reusing its TradingView tab when present,
 *     otherwise opening one plain tab via CDP /json/new).
 *   - NEVER close the browser on disconnect — it is shared with the data
 *     harvesting pipeline. disconnect() closes ONLY the tab it used and
 *     drops local references.
 *   - NEVER crash the pipeline. The caller (VisualZoneLobe) wraps every
 *     controller operation in try/catch and falls back to Engine 1 IP zone
 *     edges on any failure (non-blocking by design).
 */

import { Logger } from '../utils/logger.js';
import type { DXYZone } from '../types.js';

const log = new Logger('TvChartController');

/** Sleep helper (module-level). */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Headed Chrome CDP endpoint. Matches CDP_HEADED_BASE in
 * engine/data-source-router.ts — the SAME browser instance, so chart
 * navigation here is visible to (and reused by) the harvesting pipeline.
 */
const CDP_ENDPOINT = 'http://localhost:9228';

/** WebSocket base for CDP — CDP's /json returns ws://127.0.0.1:PORT/... which
 *  is unreachable from containers; rewritten to this host (same rewrite as
 *  data-source-router.ts). */
const CDP_WS_BASE = 'ws://localhost:9228';

/** CDP attach timeout — must be generous because the SAME Chrome instance
 *  handles concurrent data-harvesting CDP connections which can saturate
 *  the endpoint for 10-20s at a time. */
const CDP_CONNECT_TIMEOUT_MS = 30_000;
const CDP_MAX_RETRIES = 3;
const CDP_RETRY_BACKOFF_BASE_MS = 5_000;

/** TradingView SPA render wait after navigation (matches harvester waits). */
const NAV_RENDER_WAIT_MS = 12_000;

/** Candle re-render wait after a timeframe switch. */
const TF_RENDER_WAIT_MS = 3_000;

/** History-load + repaint wait after scroll/pan. */
const PAN_RENDER_WAIT_MS = 1_500;

/** Directory for captured chart screenshots. */
export const TV_SCREENSHOT_DIR = '/tmp';

/**
 * Pair → TradingView {exchange, symbol}. Mirrors PAIR_TO_TV_SYMBOL in
 * tv-chart-image-fetch.ts (matches the startup chart in plutus-tools.ts).
 */
export const TV_PAIR_MAP: Record<string, { exchange: string; symbol: string }> = {
  'DXY':     { exchange: 'TVC',   symbol: 'DXY' },
  'EUR/USD': { exchange: 'FX',    symbol: 'EURUSD' },
  'GBP/USD': { exchange: 'FX',    symbol: 'GBPUSD' },
  'AUD/USD': { exchange: 'FX',    symbol: 'AUDUSD' },
};

/** Resolve a pair name to its full TradingView symbol (e.g. OANDA:EURUSD). */
export function tvSymbolForPair(pair: string): string {
  const entry = TV_PAIR_MAP[pair];
  return entry ? `${entry.exchange}:${entry.symbol}` : pair;
}

/**
 * Timeframe button label → minutes typed into TradingView's interval
 * shortcut. TradingView accepts raw interval strings ("60", "240", "1D")
 * typed on a focused chart followed by Enter.
 */
const TF_TO_MINUTES: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '1H': '60',
  '4h': '240',
  '4H': '240',
  'D': '1D',
  'W': '1W',
  'M': '1M',
};

/** Shape of a CDP target entry returned by GET /json. */
interface CdpTarget {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

/** Pending CDP command awaiting its matching response (matched by msg.id). */
interface PendingCommand {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TV CHART CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

export class TvChartController {
  private ws: WebSocket | null = null;
  private tabId: string | null = null;
  private tabUrl: string | null = null;
  private msgId = 0;
  private readonly pendingCommands = new Map<number, PendingCommand>();

  /**
   * Attach to the RUNNING headed Chrome. Never spawns a new browser.
   *
   * Idempotent: if a live connection is already held, returns immediately.
   * Picks the TradingView tab when present, otherwise creates one plain tab
   * via CDP /json/new (PUT). Connects a raw WebSocket to the tab's
   * webSocketDebuggerUrl (rewritten from 127.0.0.1 to the CDP host), then
   * enables the Page + Runtime domains.
   *
   * Retries up to CDP_MAX_RETRIES times with linear backoff
   * (CDP_RETRY_BACKOFF_BASE_MS × attempt number) — the shared harvester
   * Chrome can saturate its CDP endpoint for 10-20s at a time.
   */
  async connect(): Promise<void> {
    if (this.isConnected()) return;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= CDP_MAX_RETRIES; attempt++) {
      try {
        log.info(`CDP connect attempt ${attempt}/${CDP_MAX_RETRIES} (${CDP_ENDPOINT})`);
        await this.connectOnce();
        log.debug(`connected over CDP (${CDP_ENDPOINT}), tab: ${(this.tabUrl ?? 'about:blank').substring(0, 80)}`);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        log.warn(`CDP connect attempt ${attempt}/${CDP_MAX_RETRIES} failed: ${lastError.message}`);
        this.teardownSocket();
        if (attempt < CDP_MAX_RETRIES) {
          const backoffMs = CDP_RETRY_BACKOFF_BASE_MS * attempt; // linear: 5s, 10s
          log.info(`retrying CDP connect in ${backoffMs}ms...`);
          await sleep(backoffMs);
        }
      }
    }
    throw new Error(
      `TvChartController: failed to connect to CDP endpoint ${CDP_ENDPOINT} ` +
      `after ${CDP_MAX_RETRIES} attempts — last error: ${lastError?.message ?? 'unknown'}`
    );
  }

  /** True when the CDP WebSocket is held and open. */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /** Navigate to a pair's TradingView chart and wait for the SPA to render. */
  async openChart(tvSymbol: string): Promise<void> {
    this.assertConnected();
    await this.sendCdp('Page.navigate', { url: `https://www.tradingview.com/chart/?symbol=${tvSymbol}` });
    await sleep(NAV_RENDER_WAIT_MS); // SPA render
  }

  /**
   * Wait for the chart to actually render — canvas element present in the
   * DOM plus a settle window for candle data to arrive from TV servers.
   */
  async waitForRender(): Promise<void> {
    this.assertConnected();
    const deadline = Date.now() + 15_000;
    let rendered = false;
    while (Date.now() < deadline) {
      try {
        const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
          expression: `!!document.querySelector('canvas')`,
          returnByValue: true,
        });
        const value = (res?.result as Record<string, unknown> | undefined)?.value;
        if (value === true) {
          rendered = true;
          break;
        }
      } catch (e) {
        log.debug(`waitForRender poll failed (retrying): ${e instanceof Error ? e.message : String(e)}`);
      }
      await sleep(500);
    }
    if (!rendered) {
      throw new Error('Chart render timeout — no canvas element after 15s');
    }
    await sleep(3_000); // candle data settle from TV servers
  }

  /**
   * Click a timeframe button (1m/5m/15m/30m/1H/4H/D/W/M).
   *
   * PRIMARY: click the timeframe toolbar button matched by data-value or
   * text content. FALLBACK: TradingView's keyboard interval shortcut — focus
   * the chart canvas, type the interval in minutes, press Enter.
   */
  async setTimeframe(tf: string): Promise<void> {
    this.assertConnected();
    // PRIMARY: use TradingView chart API setResolution() — verified reliable
    // on the full app page (window.TradingViewApi.activeChart()).
    const minutes = TF_TO_MINUTES[tf] ?? tf;
    try {
      await this.sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
          if (!chart) return 'NO_TV_WIDGET';
          chart.setResolution('${minutes}');
          return 'OK';
        })()`,
        returnByValue: true,
      });
    } catch (e) {
      log.debug(`setTimeframe API failed, using keyboard fallback: ${e instanceof Error ? e.message : String(e)}`);
      // FALLBACK: keyboard interval shortcut (less reliable — canvas focus may fail).
      await this.focusChartCanvas();
      await this.sendCdp('Input.insertText', { text: minutes });
      await this.dispatchKey({ key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    }
    await sleep(TF_RENDER_WAIT_MS); // candle re-render
  }

  /**
   * Scroll back in time (see older bars).
   *
   * Focuses the chart canvas, then ArrowLeft × bars — the most reliable
   * history scroll for canvas-based charts. Waits for history load + repaint.
   */
  async scrollBack(bars: number): Promise<void> {
    this.assertConnected();
    await this.focusChartCanvas();
    for (let i = 0; i < bars; i++) {
      await this.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 });
      await sleep(20);
    }
    await sleep(PAN_RENDER_WAIT_MS); // history load + repaint
  }

  /**
   * Drag to pan the chart. Negative dxPixels drags left (back in time),
   * positive drags right (forward in time).
   */
  async dragPan(dxPixels: number): Promise<void> {
    this.assertConnected();
    const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
      expression:
        `(()=>{const c=document.querySelector('canvas');if(!c)return null;` +
        `const r=c.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`,
      returnByValue: true,
    });
    const center = (res?.result as Record<string, unknown> | undefined)?.value as { x: number; y: number } | null | undefined;
    if (!center || typeof center.x !== 'number' || typeof center.y !== 'number') return;
    const { x, y } = center;

    await this.sendCdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    const steps = 25;
    for (let i = 1; i <= steps; i++) {
      await this.sendCdp('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: x + (dxPixels * i) / steps,
        y,
        button: 'left',
      });
    }
    await this.sendCdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + dxPixels, y, button: 'left', clickCount: 1 });
    await sleep(PAN_RENDER_WAIT_MS);
  }

  /** Zoom in/out via TradingView's +/- keyboard shortcuts. */
  async zoom(direction: 'in' | 'out'): Promise<void> {
    this.assertConnected();
    await this.focusChartCanvas();
    if (direction === 'in') {
      await this.dispatchKey({ key: '+', code: 'Equal', windowsVirtualKeyCode: 187 });
    } else {
      await this.dispatchKey({ key: '-', code: 'Minus', windowsVirtualKeyCode: 189 });
    }
    await sleep(500); // zoom repaint
  }

  /** Zoom to show approximately one trading week — uses chart API setBarSpacing
   *  with TF-specific spacing (verified reliable on the full app page). */
  async zoomToWeek(): Promise<void> {
    this.assertConnected();
    try {
      await this.sendCdp('Runtime.evaluate', {
        expression: `(() => {
          const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
          if (!chart) return 'NO_TV_WIDGET';
          const ts = chart.getTimeScale?.();
          if (ts && typeof ts.setBarSpacing === 'function') {
            // TF-specific bar spacing to show ~1 week of data:
            // 4H: 24px (~42 candles), 1H: 12px (~168), 30m: 6px (~336), 15m: 3px (~672)
            const res = chart.resolution?.() ?? '60';
            const spacing = res === '240' ? 24 : res === '60' ? 12 : res === '30' ? 6 : res === '15' ? 3 : 12;
            ts.setBarSpacing(spacing);
          }
          if (ts && typeof ts.scrollToRealtime === 'function') {
            ts.scrollToRealtime();
          }
          return 'OK';
        })()`,
        returnByValue: true,
      });
    } catch (e) {
      log.debug(`zoomToWeek API failed, using keyboard fallback: ${e instanceof Error ? e.message : String(e)}`);
      for (let i = 0; i < 3; i++) {
        await this.dispatchKey({ key: '-', code: 'Minus', modifiers: 1, windowsVirtualKeyCode: 189 });
        await sleep(500);
      }
    }
    await sleep(1000); // zoom repaint
  }

  /** Take a screenshot of the current chart view. Returns the path. */
  async captureScreenshot(path: string): Promise<string> {
    this.assertConnected();
    const res = await this.sendCdp<{ data: string }>('Page.captureScreenshot', { format: 'png' }, 30_000);
    const fs = await import('node:fs');
    fs.writeFileSync(path, Buffer.from(res.data, 'base64'));
    return path;
  }

  /** Take a screenshot and return it as base64 for direct VLM attachment. */
  async captureScreenshotBase64(): Promise<string> {
    this.assertConnected();
    const res = await this.sendCdp<{ data: string }>('Page.captureScreenshot', { format: 'png' }, 30_000);
    return res.data;
  }

  /**
   * Multi-TF telescoping capture — walks the chart down the telescope order
   * (4H → 1H → 30m → 15m), waiting for render at each step, and returns the
   * screenshot path for every timeframe.
   */
  async captureMultiTfScreenshots(pair: string): Promise<Array<{ tf: string; path: string }>> {
    const TELESCOPE_ORDER = ['4H', '1H', '30m', '15m'] as const;
    const results: Array<{ tf: string; path: string }> = [];

    for (const tf of TELESCOPE_ORDER) {
      await this.setTimeframe(tf);
      await this.waitForRender();
      const path = `/tmp/tv_${pair.replace('/', '')}_${tf}_${Date.now()}.png`;
      await this.captureScreenshot(path);
      results.push({ tf, path });
      log.info(`  [tv-telescope] ${pair} ${tf}: screenshot saved to ${path}`);
    }

    return results;
  }

  /** Wait passthrough. */
  async waitForTimeout(ms: number): Promise<void> {
    await sleep(ms);
  }

  /**
   * Draw a zone rectangle (supply/demand/liquidity) on the chart spanning the
   * visible time range between prices top and bottom.
   *
   * Best-effort visual overlay: if the TradingView widget API is not exposed
   * on the page (NO_TV_WIDGET / NO_SHAPE_API) the status is logged as a
   * warning instead of throwing — the pipeline continues without drawings.
   * Only a failure of the CDP call itself propagates.
   */
  async drawZone(top: number, bottom: number, type: 'SUPPLY' | 'DEMAND' | 'LIQUIDITY', label: string): Promise<void> {
    this.assertConnected();
    const safeLabel = label.replace(/'/g, "\\'");
    const expression = `(() => {
  try {
    const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
    if (!chart) return 'NO_TV_WIDGET';
    const range = chart.getVisibleRange();
    const from = range && range.from ? range.from : Math.floor(Date.now()/1000) - 86400*7;
    const to = range && range.to ? range.to : Math.floor(Date.now()/1000);
    const colors = { SUPPLY: '#ef5350', DEMAND: '#26a69a', LIQUIDITY: '#ffa726' };
    const color = colors['${type}'] || '#2962ff';
    if (typeof chart.createMultipointShape === 'function') {
      chart.createMultipointShape(
        [{ time: from, price: ${top} }, { time: to, price: ${bottom} }],
        { shape: 'rectangle', text: '${safeLabel}', overrides: { backgroundColor: color + '33', linecolor: color, linewidth: 1, showLabel: true } }
      );
      return 'OK';
    }
    if (typeof chart.createShape === 'function') {
      chart.createShape({ time: from, price: ${top} }, { shape: 'rectangle', text: '${safeLabel}', overrides: { backgroundColor: color + '33', linecolor: color } });
      return 'OK';
    }
    return 'NO_SHAPE_API';
  } catch (e) { return 'ERR:' + (e && e.message ? e.message : String(e)); }
})()`;
    const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    const status = (res?.result as Record<string, unknown> | undefined)?.value;
    const statusStr = typeof status === 'string' ? status : 'UNKNOWN';
    if (statusStr === 'OK') {
      log.info(`drawZone: ${type} zone drawn [${bottom} – ${top}] "${label}"`);
    } else {
      log.warn(`drawZone: drawing overlay returned ${statusStr} (non-fatal — chart drawings are best-effort)`);
    }
  }

  /**
   * Draw a horizontal price line on the chart with a label.
   *
   * Best-effort visual overlay — same non-fatal semantics as drawZone().
   */
  async drawHorizontalLine(price: number, label: string): Promise<void> {
    this.assertConnected();
    const safeLabel = label.replace(/'/g, "\\'");
    const expression = `(() => {
  try {
    const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
    if (!chart) return 'NO_TV_WIDGET';
    if (typeof chart.createShape !== 'function') return 'NO_SHAPE_API';
    chart.createShape({ time: Math.floor(Date.now()/1000) - 3600, price: ${price} }, { shape: 'horizontal_line', text: '${safeLabel}', overrides: { linecolor: '#2962ff', linewidth: 1, showLabel: true } });
    return 'OK';
  } catch (e) { return 'ERR:' + (e && e.message ? e.message : String(e)); }
})()`;
    const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    const status = (res?.result as Record<string, unknown> | undefined)?.value;
    const statusStr = typeof status === 'string' ? status : 'UNKNOWN';
    if (statusStr === 'OK') {
      log.info(`drawHorizontalLine: line drawn @ ${price} "${label}"`);
    } else {
      log.warn(`drawHorizontalLine: drawing overlay returned ${statusStr} (non-fatal — chart drawings are best-effort)`);
    }
  }

  /**
   * Draw ALL Engine 1 zones on the chart as colored rectangles with dashed
   * horizontal lines at each zone's key levels — so the VLM can SEE the
   * Engine 1 base map on the screenshots instead of raw candlesticks.
   *
   * Uses the full TradingView app chart API (window.TradingViewApi.activeChart())
   * with the widget-embed API (window.tvWidget.activeChart()) as fallback.
   *
   * Color convention (user convention):
   *   SUPPLY zone (BoM/MoM) → RED   (rgba(255, 0, 0, 0.2) fill, #FF0000 border)
   *   DEMAND zone (BoM/MoM) → BLUE  (rgba(0, 0, 255, 0.2) fill, #0000FF border)
   *   LQZ zone    (LSZ)     → GREEN (rgba(0, 255, 0, 0.2) fill, #00FF00 border)
   *
   * Each rectangle spans the visible week (start = now − 7d, end = now) and is
   * labelled "[TF] TYPE | BoM/MoM". All shapes use disableSave:true so they
   * never persist into the saved chart layout.
   *
   * Best-effort: logs a per-run summary; only CDP-level failures propagate.
   */
  async drawEngine1Zones(zones: readonly DXYZone[], spot: number): Promise<void> {
    this.assertConnected();
    if (zones.length === 0) {
      log.info(`drawEngine1Zones: no zones to draw (spot=${spot})`);
      return;
    }

    // Classify + serialize the zone payload on the TS side (keeps the
    // injected expression free of business logic and quote-escape hazards).
    const payload = zones.map((z) => {
      const t = String(z.type);
      const cls = t.startsWith('LSZ') ? 'LQZ' : t.includes('Supply') ? 'SUPPLY' : 'DEMAND';
      return {
        name: z.zoneName ?? z.id,
        floor: z.floor,
        ceiling: z.ceiling,
        cls,
        sdType: z.sdType ?? (z.isBoM ? 'BoM' : 'MoM'),
        tf: z.timeframe ?? '4H',
        keyLevels: z.keyLevels ?? [],
      };
    });

    const expression = `(() => {
  try {
    const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
    if (!chart) return 'NO_TV_WIDGET';
    if (typeof chart.createMultipointShape !== 'function') return 'NO_SHAPE_API';
    const zones = ${JSON.stringify(payload)};
    // Draw zones across the VISIBLE time range (not 7 days) so they are
    // clearly visible as colored rectangles, not thin lines outside the view.
    let from, to;
    try {
      const range = chart.getVisibleRange();
      if (range && range.from && range.to) {
        from = range.from;
        to = range.to;
      }
    } catch (e) { /* fall through to default */ }
    if (!from || !to) {
      const now = Math.floor(Date.now()/1000);
      from = now - 7*86400;
      to = now;
    }
    const COLORS = {
      SUPPLY: { bg: 'rgba(255, 0, 0, 0.2)', line: '#FF0000' },
      DEMAND: { bg: 'rgba(0, 0, 255, 0.2)', line: '#0000FF' },
      LQZ:    { bg: 'rgba(0, 255, 0, 0.2)', line: '#00FF00' },
    };
    let rects = 0, lines = 0, errs = 0;
    for (const z of zones) {
      const c = COLORS[z.cls] || COLORS.LQZ;
      const label = '[' + z.tf + '] ' + z.cls + ' | ' + z.sdType;
      try {
        chart.createMultipointShape(
          [{ time: from, price: z.ceiling }, { time: to, price: z.floor }],
          { shape: 'rectangle', text: label, disableSave: true,
            overrides: { backgroundColor: c.bg, linecolor: c.line, linewidth: 1, showLabel: true } }
        );
        rects++;
      } catch (e) { errs++; }
      if (typeof chart.createShape === 'function') {
        for (const lvl of (z.keyLevels || [])) {
          try {
            chart.createShape(
              { time: from, price: lvl },
              { shape: 'horizontal_line', text: label, disableSave: true,
                overrides: { linecolor: c.line, linewidth: 1, linestyle: 2, showLabel: false } }
            );
            lines++;
          } catch (e) { errs++; }
        }
      }
    }
    return 'OK:' + rects + 'r/' + lines + 'l' + (errs > 0 ? ' errs=' + errs : '');
  } catch (e) { return 'ERR:' + (e && e.message ? e.message : String(e)); }
})()`;
    const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    const status = (res?.result as Record<string, unknown> | undefined)?.value;
    const statusStr = typeof status === 'string' ? status : 'UNKNOWN';
    if (statusStr.startsWith('OK:')) {
      log.info(`drawEngine1Zones: drew ${zones.length} Engine 1 zones (spot=${spot}) — ${statusStr}`);
    } else {
      log.warn(`drawEngine1Zones: zone overlay returned ${statusStr} (non-fatal — chart drawings are best-effort)`);
    }
  }

  /**
   * Remove every drawn shape from the chart (Engine 1 zone overlay cleanup
   * after the multi-TF screenshot pass). Uses chart.getAllShapes() +
   * chart.removeEntity(id) on the full-app/widget chart API.
   *
   * Best-effort: never throws on missing API — logs a warning instead.
   */
  async clearDrawnZones(): Promise<void> {
    this.assertConnected();
    const expression = `(() => {
  try {
    const chart = window.tvWidget?.activeChart?.() ?? window.TradingViewApi?.activeChart?.();
    if (!chart) return 'NO_TV_WIDGET';
    if (typeof chart.getAllShapes !== 'function' || typeof chart.removeEntity !== 'function') return 'NO_SHAPE_API';
    const shapes = chart.getAllShapes() || [];
    let removed = 0, errs = 0;
    for (const s of shapes) {
      try { chart.removeEntity(s.id); removed++; } catch (e) { errs++; }
    }
    return 'CLEARED:' + removed + (errs > 0 ? ' errs=' + errs : '');
  } catch (e) { return 'ERR:' + (e && e.message ? e.message : String(e)); }
})()`;
    const res = await this.sendCdp<Record<string, unknown>>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    const status = (res?.result as Record<string, unknown> | undefined)?.value;
    const statusStr = typeof status === 'string' ? status : 'UNKNOWN';
    if (statusStr.startsWith('CLEARED:')) {
      log.info(`clearDrawnZones: removed drawn zone shapes — ${statusStr}`);
    } else {
      log.warn(`clearDrawnZones: shape cleanup returned ${statusStr} (non-fatal)`);
    }
  }

  /**
   * Disconnect — closes ONLY the tab this controller used. The shared headed
   * browser is intentionally left running: the data harvesting pipeline owns
   * it. Never throws.
   */
  async disconnect(): Promise<void> {
    // (a) Close the tab via CDP when the socket is live.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        await this.sendCdp('Page.close', undefined, 5_000);
      } catch (e) {
        log.debug(`disconnect: Page.close failed (${e instanceof Error ? e.message : String(e)}) — trying HTTP close fallback`);
        // (b) Fallback: HTTP tab close endpoint.
        if (this.tabId) {
          try {
            await fetch(`${CDP_ENDPOINT}/json/close/${this.tabId}`);
          } catch (closeErr) {
            log.debug(`disconnect: HTTP tab close failed: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`);
          }
        }
      }
    }

    // (c) Close the WebSocket.
    try {
      this.ws?.close();
    } catch (e) {
      log.debug(`disconnect: WS close: ${e instanceof Error ? e.message : String(e)}`);
    }

    // (d) Drop local references and reject all pending commands.
    this.ws = null;
    this.tabId = null;
    this.tabUrl = null;
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('TvChartController: disconnected'));
    }
    this.pendingCommands.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNALS
  // ═══════════════════════════════════════════════════════════════════════════

  private assertConnected(): void {
    if (!this.isConnected()) {
      throw new Error('TvChartController: not connected — call connect() first');
    }
  }

  /**
   * One connect attempt: resolve the target tab (existing TradingView tab or
   * a newly created one), open the raw CDP WebSocket, install the permanent
   * message router, and enable the Page + Runtime domains.
   */
  private async connectOnce(): Promise<void> {
    let target: CdpTarget | null = null;

    // ALWAYS create a new tab — the existing TradingView tab is saturated with
    // the SPA's continuous rendering loop, which blocks CDP command processing
    // (Page.enable times out). A fresh tab is responsive.
    // The data harvester reuses the existing TradingView tab for its own CDP work;
    // Engine 3 must NOT share that tab.
    const listResp = await fetch(`${CDP_ENDPOINT}/json`);
    if (listResp.ok) {
      const listRaw: unknown = await listResp.json();
      if (Array.isArray(listRaw)) {
        const tabs = listRaw as CdpTarget[];
        log.debug(`CDP /json: ${tabs.length} tabs open — creating new tab for Engine 3 (not reusing existing)`);
      }
    }

    // Create a plain tab (the caller navigates it to TradingView).
    const tabResp = await fetch(`${CDP_ENDPOINT}/json/new?about:blank`, { method: 'PUT' });
    if (!tabResp.ok) {
      throw new Error(`TvChartController: CDP tab creation failed: HTTP ${tabResp.status}`);
    }
    const tabRaw: unknown = await tabResp.json();
    const tab = tabRaw as Partial<CdpTarget>;
    if (typeof tab.id !== 'string' || typeof tab.webSocketDebuggerUrl !== 'string') {
      throw new Error('TvChartController: CDP tab response missing id or webSocketDebuggerUrl');
    }
    target = { id: tab.id, type: 'page', url: tab.url ?? 'about:blank', webSocketDebuggerUrl: tab.webSocketDebuggerUrl };

    // Rewrite WS URL: CDP returns ws://127.0.0.1:PORT/... which is
    // unreachable from inside the container. Replace with the CDP host.
    const wsUrl = target.webSocketDebuggerUrl!.replace(/ws:\/\/127\.0\.0\.1:\d+/, CDP_WS_BASE);
    const tabId = target.id;
    const tabUrl = target.url;

    // Open the raw CDP WebSocket (Bun-native — playwright-core's handshake
    // does not complete under Bun).
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const timer = setTimeout(() => {
        try {
          ws.close();
        } catch (closeErr) {
          log.debug(`connect WS close after timeout: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`);
        }
        reject(new Error(`TvChartController: CDP WebSocket open timed out after ${CDP_CONNECT_TIMEOUT_MS}ms`));
      }, CDP_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(timer);
        this.ws = ws;
        this.tabId = tabId;
        this.tabUrl = tabUrl;
        this.installMessageRouter(ws);
        resolve();
      };
      ws.onerror = (ev) => {
        clearTimeout(timer);
        reject(new Error(`TvChartController: CDP WebSocket error during connect (${String(ev.type ?? 'error')})`));
      };
    });

    await this.sendCdp('Page.enable', undefined, 60_000);
    await this.sendCdp('Runtime.enable', undefined, 60_000);
  }

  /**
   * Install the permanent message router: resolves/rejects pending commands
   * matched by msg.id. CDP events (msg.method, no id) are ignored.
   */
  private installMessageRouter(ws: WebSocket): void {
    ws.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') {
        log.debug(`CDP WS: received non-string message (${typeof ev.data}) — ignoring`);
        return;
      }
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(ev.data) as Record<string, unknown>;
      } catch (parseErr) {
        log.debug(`CDP WS: unparseable message (ignoring): ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
        return;
      }

      if (typeof msg.id !== 'number') return; // event or malformed — ignored

      const pending = this.pendingCommands.get(msg.id);
      if (!pending) return; // stale/unknown id — ignored
      clearTimeout(pending.timer);
      this.pendingCommands.delete(msg.id);

      if (msg.error) {
        const errObj = msg.error as Record<string, unknown>;
        const errMsg = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(msg.error);
        pending.reject(new Error(`TvChartController: CDP error: ${errMsg}`));
      } else {
        pending.resolve(msg.result);
      }
    };
  }

  /**
   * Send a CDP command over the raw WebSocket and await its response (matched
   * by message id). Rejects on CDP error or timeout.
   */
  private sendCdp<T>(method: string, params?: Record<string, unknown>, timeoutMs = 30_000): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('TvChartController: not connected — call connect() first'));
    }
    const id = ++this.msgId;
    const ws = this.ws;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`TvChartController: CDP command ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pendingCommands.set(id, {
        resolve: (value: unknown) => resolve(value as T),
        reject,
        timer,
      });
      try {
        ws.send(JSON.stringify(params !== undefined ? { id, method, params } : { id, method }));
      } catch (e) {
        clearTimeout(timer);
        this.pendingCommands.delete(id);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  /** Dispatch a keyDown+keyUp pair via the CDP Input domain. */
  private async dispatchKey(keyParams: {
    key: string;
    code: string;
    windowsVirtualKeyCode: number;
    nativeVirtualKeyCode?: number;
    modifiers?: number;
  }): Promise<void> {
    const params: Record<string, unknown> = { ...keyParams };
    await this.sendCdp('Input.dispatchKeyEvent', { type: 'keyDown', ...params });
    await this.sendCdp('Input.dispatchKeyEvent', { type: 'keyUp', ...params });
  }

  /**
   * Focus the chart canvas so keyboard input reaches TradingView's chart
   * shortcuts. Failures are non-fatal (keyboard events may still land on
   * the previously focused element).
   */
  private async focusChartCanvas(): Promise<void> {
    try {
      await this.sendCdp('Runtime.evaluate', {
        expression: `document.querySelector('canvas')?.click()`,
        returnByValue: true,
      });
    } catch (e) {
      log.debug(`canvas focus click failed (continuing): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Drop socket state after a failed connect attempt (never throws). */
  private teardownSocket(): void {
    try {
      this.ws?.close();
    } catch (e) {
      log.debug(`connect cleanup WS close: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.ws = null;
    this.tabId = null;
    this.tabUrl = null;
    for (const pending of this.pendingCommands.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('TvChartController: connect attempt failed'));
    }
    this.pendingCommands.clear();
  }
}
