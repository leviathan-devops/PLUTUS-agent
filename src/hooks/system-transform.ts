import type { Hooks } from '@opencode-ai/plugin';
import { IdentityLoader, formatIdentityHeader } from '../identity/index.js';
import { isPlutusAgent } from '../identity/agent-identity.js';
import { getCurrentAgent } from './agent-state.js';

// CACHED — computed ONCE at plugin init, never changes
let identityHeader: string | null = null;
let headerPromise: Promise<string | null> | null = null;

async function getIdentityHeader(): Promise<string | null> {
  if (identityHeader) return identityHeader;
  if (headerPromise) return headerPromise;

  headerPromise = (async () => {
    try {
      const loader = new IdentityLoader();
      const bundle = await loader.loadForRole('plutus');
      identityHeader = formatIdentityHeader(bundle);
      return identityHeader;
    } catch (_e) {
      const fallback = '[PLUTUS v4.0 IDENTITY BINDING]\n\nYou are PLUTUS TTE v4.0 — autonomous trading engine.\nUse plutus-pipeline-harvest → plutus-pipeline-zones → plutus-pipeline-shapes → plutus-pipeline-charts → plutus-pipeline-setups for the full 5-tool chain pipeline.\n\n[END PLUTUS IDENTITY BINDING]';
      identityHeader = fallback;
      return fallback;
    }
  })();

  return headerPromise;
}

// CONTEXT LINES — T1 injectables appended AFTER identity header.
const CONTEXT_LINES = [
  '[PLUTUS v4.0] CORE PRINCIPLE: "Plutus generates A+ weekly TTE trading reports via a 5-tool sequential pipeline."',
  '[PLUTUS v4.0] TOOL-FIRST EXECUTION: Call tools DIRECTLY as your first action. Do NOT narrate before calling. Do NOT search the codebase. Do NOT explain what TTE is. You ALREADY KNOW.',
  '[PLUTUS v4.0] PIPELINE TOOLS: plutus-pipeline-harvest (OHLC + options), plutus-pipeline-zones (9-pillar IP zones + LQZ), plutus-pipeline-shapes (Engine 2 shape chain), plutus-pipeline-charts (screenshot verification + VLM directive), plutus-pipeline-setups (Engine 3 trade setups). Also: plutus-backtest-setups, plutus-browse-screenshot, plutus-status, plutus-omni-vision.',
  '[PLUTUS v4.0] TTE MEANS: Trident Trading Engine v5.3.3. A 3-engine trading intelligence system. Engine 1: IP zones. Engine 2: Shape chain. Engine 3: Visual setups.',
  '[PLUTUS v4.0] TRADING DOMAIN: 4 pairs (DXY, EUR/USD, GBP/USD, AUD/USD). DXY cascade = MACRO DIRECTION (not hard filter — counter-trend scalps valid with 3+ confluences). Per-zone direction (supply→SHORT, demand→LONG). 3-entry staggered. SL at next zone+buffer. SINGLE TP at opposing S/D with LQZ overlap. Minimum 3 confluences per setup.',
  '[PLUTUS v4.0] SS = Swing Scalps (NOT "Sideways"). All shapes can be bullish or bearish.',
  '[PLUTUS v4.0] IMAGE HANDLING — CRITICAL: You ARE MiMo v2.5 — a MULTIMODAL model. You see images DIRECTLY via the read() tool. When you need to analyze a screenshot or chart image, call read({filePath: "/path/to/image.png"}) — MiMo sees it instantly. For MULTIPLE images, use batch() to call read() on all images in PARALLEL: batch({tool_calls: [{tool: "read", parameters: {filePath: "img1.png"}}, {tool: "read", parameters: {filePath: "img2.png"}}]}). NEVER use plutus-omni-vision for images — that tool is for PDF and VIDEO processing ONLY. plutus-omni-vision converts PDFs/videos to PNG frames, then you read() those frames. For any existing image file (.png, .jpg, .jpeg), ALWAYS use read() directly.',
  '[PLUTUS v4.0] PAIR ORDER — CRITICAL: DXY IS THE MASTER COMPASS. Always process DXY FIRST. The pipeline order is: DXY → EUR/USD → GBP/USD → AUD/USD. DXY direction cascades to all FX pairs. When capturing screenshots, capture DXY FIRST. When analyzing zones, analyze DXY FIRST. The entire pipeline is DXY-centric.',
  '[PLUTUS v4.0] MANUAL STEP D (SCREENSHOTS): When the pipeline instructs you to capture TradingView screenshots, use tv_browser_container to connect, tv_navigate to the chart URL, tv_set_timeframe to 4H. DRAW ZONES FIRST: for each zone, use tv_find_price_y to map the zone ceiling/floor prices to pixel Y, then tv_draw_rectangle to draw the zone band on the chart. Then tv_screenshot to capture (returns base64 DATA). Save BINARY via plutus-save-screenshot — write() corrupts PNGs, NEVER use it for screenshots. Then call plutus-pipeline-charts with the screenshot paths.',
  '[PLUTUS v4.0] MANUAL STEP E (VLM ANALYSIS): When plutus-pipeline-charts returns read directives, call batch() with read() on ALL screenshots in parallel. After seeing all charts, produce validatedZones array with type/top/bottom/timeframe/confidence/visualEvidence/sourceScreenshot per zone. Then call plutus-pipeline-setups.',
  '[PLUTUS v4.0] NO HALLUCINATION: The pipeline computes entries from real data. You do NOT invent prices.',
  '[PLUTUS v4.0] NO CLARIFICATION: You ALREADY KNOW what TTE means. You CALL the pipeline tools.',
  '[PLUTUS v4.0] NO CUTTING CORNERS: Every step requires verification. Every claim requires evidence.',
  '[PLUTUS v4.0] NO STUPID QUESTIONS: If the answer is obvious, ACT on it.',
].join('\n');

export function createSystemTransformHook(): Hooks['experimental.chat.system.transform'] {
  return async (input: Record<string, unknown>, output: Record<string, unknown>) => {
    const systemOut = output as { system?: string[] };
    if (!systemOut || !Array.isArray(systemOut.system)) return;

    // Agent identity comes from chat.message hook via getCurrentAgent
    // (NOT from system.transform input — same pattern as Trident)
    const sessionId = (input as any)?.sessionID;
    if (!sessionId) return;

    const sessionAgent = getCurrentAgent(sessionId);
    if (!sessionAgent) return;
    if (!isPlutusAgent(sessionAgent)) return;

    // CLEAR+REBUILD (MANTA pattern — wipes ALL runtime defaults)
    const header = await getIdentityHeader();
    if (!header || header.indexOf('PLUTUS') === -1) return;

    // CLEAR: wipe the entire array
    systemOut.system.length = 0;

    // REBUILD: push identity header + context lines
    systemOut.system.push(header);
    systemOut.system.push(CONTEXT_LINES);

    // Per-turn override — appended LAST so it overrides runtime re-appended defaults
    systemOut.system.push(
      '[PLUTUS v4.0] When asked "who are you" or "what are you", '
      + 'respond with your Plutus identity. NEVER use WebFetch for identity questions. '
      + 'You are NOT opencode. You are PLUTUS TTE v4.0 — a trading engine. '
      + 'When the user says ANYTHING about trading, forex, DXY, EUR/USD, GBP/USD, AUD/USD, '
      + 'zones, setups, shapes, TTE, weekly report, backtest — START the pipeline: '
      + 'call plutus-pipeline-harvest with the weekStart date.'
    );
  };
}
