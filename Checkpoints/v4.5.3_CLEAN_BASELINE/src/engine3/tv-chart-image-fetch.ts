/**
 * TvChartImageFetch — Self-contained visual intelligence tool.
 *
 * Replaces the broken external VC daemon dependency for Engine 3 visual
 * analysis with a simple in-process pipeline:
 *
 *   pair name → TradingView chart URL → headed browser (CDP :9228)
 *     → PNG screenshot → VLM (opencode SDK client, MiMo) → structured markdown
 *
 * Design contract (inviolable):
 *   - NEVER spawn a new browser. Reuses the existing headed browser
 *     infrastructure from data-source-router.ts (CDP endpoint :9228).
 *   - NEVER crash the pipeline. Every failure path returns null so the
 *     caller (VisualZoneLobe) can fall back to Engine 1 IP zone edges.
 *   - No external daemon required for VLM analysis. The opencode SDK
 *     client (session.prompt with an image part) is the primary VLM path;
 *     vlmInfer() (MiMo via OpenCode Go HTTP — the same omnimodal MiMo
 *     model) is the safety net when no SDK client is wired in.
 *   - No child processes, no subprocesses — in-process fetch + CDP only.
 *
 * The VLM is asked for exactly what Engine 3 needs:
 *   - Every visible SUPPLY zone (level, tests, originating candle)
 *   - Every visible DEMAND zone (same)
 *   - Every visible LIQUIDITY zone / LQZ (consolidation, wick cluster, reaction point)
 *   - Key candlestick patterns at zone touches (engulfing, pin bar, inside bar)
 */

import { Logger } from '../utils/logger.js';
import {
  navigateAndScreenshot,
  navigateHeadedBrowser,
  vlmInfer,
} from '../engine/data-source-router.js';

const log = new Logger('TvChartImageFetch');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Pair name → TradingView symbol. Matches the startup chart in plutus-tools.ts. */
const PAIR_TO_TV_SYMBOL: Record<string, string> = {
  'DXY': 'TVC:DXY',
  'EUR/USD': 'OANDA:EURUSD',
  'GBP/USD': 'OANDA:GBPUSD',
  'AUD/USD': 'OANDA:AUDUSD',
};

/**
 * Time to wait after navigating the headed browser before screenshotting.
 * TradingView is a heavy SPA — candles need several seconds to render after
 * Page.navigate commits. 12s matches the render waits used by the harvester.
 */
const DEFAULT_RENDER_WAIT_MS = 12_000;

/**
 * Default VLM prompt for standalone use (plutus-chart-vision tool).
 * The VisualZoneLobe passes its own Engine 1/2-context-enriched prompt built
 * by buildVLMPrompt() — this default is for context-free ad-hoc captures.
 * The markdown format matches what parseVLMMarkdown() in visual-zone-lobe.ts
 * can parse into a VLMExtraction.
 */
export const DEFAULT_CHART_VLM_PROMPT = `You are analyzing a TradingView chart screenshot.

Analyze the chart and identify:
1. Every visible SUPPLY zone: price level (top-bottom), the candle wick/body that created it, how many times tested
2. Every visible DEMAND zone: same details
3. Every visible LIQUIDITY ZONE (LQZ): tight consolidation, wick cluster, or reaction point where stop-losses concentrate
4. Key candlestick patterns at zone touches (engulfing, pin bar, inside bar, hammer, shooting star)

Liquidity is EVERYTHING. Markets move to/from liquidity zones. Supply/Demand is ADDITIONAL confluence.
The best entries have BOTH liquidity AND supply/demand overlap.

Respond in this markdown format:
### 1. Setup Type
[Breakout Surge / Swing Scalp / HTF Swing / Reinforcement / Transition]
### 2. Entry Points
| Entry Type | Level | Logic |
| Primary | [price] | [reasoning] |
| Secondary | [price] | [reasoning] |
| Tertiary | [price] | [reasoning] |
### 3. Stop Loss
SL Level: [price]
SL Logic: [next LQZ beyond entry]
### 4. Take Profit
| TP1 | [price] | [nearest opposing LQZ] |
| TP1.5 | [price] | [70% of TP1 distance] |
| TP2 | [price] | [extended LQZ] |
### 5. S/D Hierarchy
Supply: [top]-[bottom]
Demand: [top]-[bottom]
### 6. Risk:Reward
[TP1 RRR]:[1]
### 7. Visual Zone Mapping
For each visual zone, state its price range and what formed it.
### 8. LQZ Details
| LQZ | Top | Bottom | Tests | Pattern |
| [name] | [price] | [price] | [count] | [pattern] |`;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Which VLM path produced the analysis. */
export type ChartVlmSource = 'OPENCODE_SDK' | 'MIMO_HTTP';

/** Result of a successful chart capture + VLM analysis. */
export interface TvChartImageResult {
  pair: string;
  /** TradingView symbol the chart was navigated to (e.g. OANDA:EURUSD). */
  symbol: string;
  chartUrl: string;
  /** On-disk path of the captured PNG screenshot. */
  screenshotPath: string;
  /** Structured VLM analysis (markdown, parseable by VisualZoneLobe). */
  vlmMarkdown: string;
  vlmSource: ChartVlmSource;
  elapsedMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS — SDK response narrowing (unknown in, typed out; NO any)
// ═══════════════════════════════════════════════════════════════════════════════

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Extract a session id from an SDK session.create() response. */
function extractSessionId(created: unknown): string | null {
  if (!isRecord(created)) return null;
  if (typeof created['id'] === 'string') return created['id'];
  const data = created['data'];
  if (isRecord(data) && typeof data['id'] === 'string') return data['id'];
  return null;
}

/**
 * Extract assistant text from an SDK session.prompt() response.
 * Handles both { data: { parts: [...] } } and { parts: [...] } shapes,
 * plus a flat { text } fallback.
 */
function extractPromptText(result: unknown): string | null {
  if (!isRecord(result)) return null;
  const container = isRecord(result['data']) ? result['data'] : result;

  const parts = container['parts'];
  if (Array.isArray(parts)) {
    const texts: string[] = [];
    for (const p of parts) {
      if (isRecord(p) && p['type'] === 'text' && typeof p['text'] === 'string') {
        texts.push(p['text']);
      }
    }
    const joined = texts.join('\n').trim();
    if (joined.length > 0) return joined;
  }

  const flat = container['text'];
  if (typeof flat === 'string' && flat.trim().length > 0) return flat.trim();
  return null;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
// TV CHART IMAGE FETCH
// ═══════════════════════════════════════════════════════════════════════════════

export class TvChartImageFetch {
  /**
   * @param client opencode SDK client (PluginInput.client). Optional — when
   *               absent or non-functional, the MiMo HTTP path is used.
   */
  constructor(private client?: unknown) {}

  /**
   * Capture the TradingView chart for a pair and analyze it with the VLM.
   *
   * Steps:
   *   1. Navigate the existing headed browser to the pair's chart (reuses the
   *      SAME tab the pipeline already keeps on TradingView — no new browser).
   *   2. Wait for the chart to render.
   *   3. Screenshot via CDP Page.captureScreenshot.
   *   4. Send the PNG to the VLM: opencode SDK client first (session.prompt
   *      with image part), vlmInfer() (MiMo HTTP) as safety net.
   *
   * @returns TvChartImageResult on success, null on ANY failure (caller falls
   *          back to Engine 1 IP zone edges — non-blocking by design).
   */
  async captureAndAnalyze(
    pair: string,
    prompt: string = DEFAULT_CHART_VLM_PROMPT,
    renderWaitMs: number = DEFAULT_RENDER_WAIT_MS,
  ): Promise<TvChartImageResult | null> {
    const start = Date.now();
    const symbol = PAIR_TO_TV_SYMBOL[pair] ?? pair;
    const chartUrl = `https://www.tradingview.com/chart/?symbol=${symbol}`;

    // ── Step 1: Navigate the existing headed browser tab to the right symbol ──
    // navigateHeadedBrowser moves the first existing tab (never spawns). If the
    // tab was already on TradingView for another pair, this ensures the chart
    // actually shows the requested pair before we screenshot it. Failure here
    // is non-fatal — navigateAndScreenshot can still open a temp tab.
    try {
      await navigateHeadedBrowser(chartUrl);
    } catch (e) {
      log.debug(`${pair}: headed-browser navigate failed (continuing): ${e instanceof Error ? e.message : String(e)}`);
    }

    // ── Step 2: Wait for chart render (TradingView SPA candle paint) ──
    await sleep(renderWaitMs);

    // ── Step 3: Screenshot via CDP on the same headed browser ──
    let screenshotPath: string | null = null;
    try {
      screenshotPath = await navigateAndScreenshot(chartUrl, 3_000);
    } catch (e) {
      log.warn(`${pair}: screenshot threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!screenshotPath) {
      log.warn(`  [chart-fetch] ${pair}: headed-browser screenshot unavailable — VLM path skipped`);
      return null;
    }

    // ── Step 4: VLM analysis (SDK primary, MiMo HTTP safety net) ──
    const analysis = await this.analyzeScreenshot(screenshotPath, prompt);
    if (analysis) {
      log.info(`  [chart-fetch] ${pair}: VLM analysis via ${analysis.source === 'OPENCODE_SDK' ? 'opencode SDK' : 'MiMo HTTP'} (${analysis.markdown.length} chars, ${Date.now() - start}ms)`);
      return {
        pair,
        symbol,
        chartUrl,
        screenshotPath,
        vlmMarkdown: analysis.markdown,
        vlmSource: analysis.source,
        elapsedMs: Date.now() - start,
      };
    }

    log.warn(`  [chart-fetch] ${pair}: VLM unavailable on both paths (SDK + MiMo HTTP)`);
    return null;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PUBLIC VLM PATH — analyze an existing screenshot
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Send an EXISTING screenshot file to the VLM and return the structured
   * markdown analysis.
   *
   * This is the shared VLM send path used by both captureAndAnalyze() (which
   * captures via raw CDP) and the TvChartController workflows (which capture
   * via playwright input injection). The VisualZoneLobe calls this directly
   * after the controller captures a screenshot.
   *
   * Path order (unchanged from captureAndAnalyze):
   *   1. opencode SDK client (session.prompt with [text, image-file-part])
   *   2. vlmInfer() — MiMo via OpenCode Go HTTP (same omnimodal MiMo model)
   *
   * @returns { markdown, source } on success, null on ANY failure
   *          (non-blocking by design — caller falls back to IP zone edges).
   */
  async analyzeScreenshot(
    imagePath: string,
    prompt: string = DEFAULT_CHART_VLM_PROMPT,
  ): Promise<{ markdown: string; source: ChartVlmSource } | null> {
    // ── Path A: opencode SDK client (PRIMARY) ──
    const viaSdk = await this.analyzeViaSdk(imagePath, prompt);
    if (viaSdk && viaSdk.length > 5) {
      return { markdown: viaSdk, source: 'OPENCODE_SDK' };
    }

    // ── Path B: MiMo HTTP (SAFETY NET — same MiMo omnimodal model) ──
    let viaHttp: string | null = null;
    try {
      viaHttp = await vlmInfer(imagePath, prompt);
    } catch (e) {
      log.warn(`vlmInfer threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (viaHttp && viaHttp.length > 5) {
      return { markdown: viaHttp, source: 'MIMO_HTTP' };
    }

    return null;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // OPENCODE SDK VLM PATH
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Send the screenshot to the VLM through the opencode SDK client.
   *
   * Creates a throwaway session, prompts with [text, image-file-part], and
   * extracts the assistant text from the response parts. The image is sent as
   * a base64 data URL (mime image/png) — the same omnimodal MiMo model that
   * analyzed the winning trade images handles it natively.
   *
   * The SDK client's exact shape varies by version, so everything is narrowed
   * from unknown with type guards. Any mismatch/throw → null (non-blocking).
   */
  private async analyzeViaSdk(imagePath: string, prompt: string): Promise<string | null> {
    if (!isRecord(this.client)) return null;
    const session = this.client['session'];
    if (!isRecord(session)) return null;
    const create = session['create'];
    const promptFn = session['prompt'];
    if (typeof create !== 'function' || typeof promptFn !== 'function') return null;

    let sessionId: string | null = null;
    try {
      const fs = await import('node:fs');
      const base64 = fs.readFileSync(imagePath).toString('base64');

      const created: unknown = await create.call(session, {
        body: { title: `plutus-vision-${Date.now()}` },
      });
      sessionId = extractSessionId(created);
      if (!sessionId) {
        log.debug('SDK session.create returned no session id — skipping SDK VLM path');
        return null;
      }

      const result: unknown = await promptFn.call(session, {
        path: { id: sessionId },
        body: {
          parts: [
            { type: 'text', text: prompt },
            { type: 'file', mime: 'image/png', url: `data:image/png;base64,${base64}` },
          ],
        },
      });

      return extractPromptText(result);
    } catch (e) {
      log.warn(`SDK VLM path failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    } finally {
      // Best-effort cleanup of the throwaway session — never blocks the result.
      if (sessionId) {
        try {
          const del = session['delete'];
          if (typeof del === 'function') {
            void (del.call(session, { path: { id: sessionId } }) as Promise<unknown>).catch(() => {});
          }
        } catch (cleanupErr) {
          log.debug(`SDK session cleanup failed (ignored): ${cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)}`);
        }
      }
    }
  }
}
