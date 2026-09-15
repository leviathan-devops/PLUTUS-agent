import type { Hooks } from '@opencode-ai/plugin';
import { plutusOmniVisionAfterHook } from '../tools/plutus-omni-vision.js';
import { isPlutusAgent } from '../identity/agent-identity.js';
import { getCurrentAgent } from './agent-state.js';

/**
 * Combined tool.execute.after hook.
 * 
 * Chains:
 * 1. plutusOmniVisionAfterHook (existing — batch read directives for omni-vision)
 * 2. Manual Step prompt injection (new — drives agent through pipeline manual steps)
 * 
 * After Tool 3 (shapes): Injects the ZIP protocol — Manual Step C (draw zones on charts
 * + capture screenshots via MCP) + Manual Step D (read PNGs, VERDICT FLOW: verify each
 * deterministic scaffold rung, emit ZONE|verdict|... lines)
 * After Tool 4 (charts): Injects Manual Step E (review validated zones)
 */

const MANUAL_STEP_CD_PROMPT = `
=== MANUAL STEP C: DRAW ZONES + CAPTURE SCREENSHOTS (ZIP PHASE 1 — DRAW VISUAL ANCHORS) ===

First: review the shape chain predictions above for each pair (shapes, day decomposition,
storyline bias). Then execute the ZONE IDENTIFICATION PROTOCOL (ZIP) below.

You MUST draw Engine 1 zones on each TradingView chart, THEN capture screenshots.
The drawn rectangles are VISUAL ANCHORS — they focus your visual attention on the right
price levels when you read the charts in Manual Step D. They are NOT the zones themselves.

These screenshots are REQUIRED input for plutus-pipeline-charts (Tool 4).
Without real screenshots, Tool 4 WILL FAIL. There are NO fallbacks.

STEP 0 (DO THIS FIRST): Connect to the TradingView container browser.
  Call tv_browser_container to connect.
  This MUST be done BEFORE any tv_ call.

FOR EACH PAIR (DXY FIRST — DXY IS THE MASTER COMPASS):
  1. tv_navigate to the pair's chart:
     - DXY:     tv_navigate({ url: "https://www.tradingview.com/chart/?symbol=TVC:DXY" })
     - EUR/USD: tv_navigate({ url: "https://www.tradingview.com/chart/?symbol=FX:EURUSD" })
     - GBP/USD: tv_navigate({ url: "https://www.tradingview.com/chart/?symbol=FX:GBPUSD" })
     - AUD/USD: tv_navigate({ url: "https://www.tradingview.com/chart/?symbol=FX:AUDUSD" })
  2. tv_set_timeframe({ timeframe: "4H" })
     (4H shows institutional structure — order blocks, BoM/MoM zones.)
  3. DRAW Engine-1 S/D ZONES (from the Tool 2 zone map). For each S/D zone:
       a. tv_find_price_y({ price: <zone ceiling> }) → y_top
       b. tv_find_price_y({ price: <zone floor> })   → y_bottom
       c. tv_draw_rectangle({ x1: 200, y1: y_top, x2: 1700, y2: y_bottom })
          - SUPPLY zone (price rejected DOWN) → RED rectangle
          - DEMAND zone (price rejected UP)   → GREEN rectangle
  4. DRAW Engine-1 LQZ ZONES (from the Tool 2 zone map). For each LQZ zone:
       Same procedure (zone top / zone bottom) → BLUE rectangle (liquidity/stop-hunt area).
  5. Draw at least the top 5 supply + top 5 demand zones per pair.
     More is better — draw ALL S/D and LQZ zones if possible.
  6. Wait 3 seconds for drawings to render.
  7. tv_screenshot() → capture the chart WITH zones drawn.
  8. tv_screenshot AUTO-SAVES the PNG to /tmp/tv-screenshot-*.png and returns the path.
     read() THAT path directly — it is a real binary PNG on disk.
     Do NOT attempt base64 extraction — tool results truncate large base64 blobs,
     so the full base64 is never accessible to you. The auto-saved path IS the screenshot.
     (plutus-save-screenshot exists ONLY for saving base64 you already have to a
     custom path — you do not need it for the tv_screenshot flow.)

⚠ PIPELINE DISCIPLINE — READ THIS EXACTLY:
If plutus-pipeline-setups BLOCKS (any [TVI] error): do NOT hand-write setups,
do NOT hand-write a report. Hand-written setups are fabrication and are REJECTED
by doctrine. The ONLY valid path: fix the zone production (save screenshots via
plutus-save-screenshot → read() those PNGs → produce ZONE| lines → convert each
line to a zone OBJECT with pair/type/top/bottom as numbers/timeframe/classification/
source:'VLM_CONFIRMED' or 'VLM_NEW'/confidence/visualEvidence/sourceScreenshot)
and call plutus-pipeline-setups again. The setups tool + Engine 3 generator is the
ONLY sanctioned setup source.

ZONE DRAWING PROCEDURE (for each zone):
  a. Get the zone's ceiling and floor prices from Tool 2 output.
  b. tv_find_price_y({ price: <ceiling> }) → returns { y: <pixel_y_top> }
  c. tv_find_price_y({ price: <floor> }) → returns { y: <pixel_y_bottom> }
  d. tv_draw_rectangle({ x1: 200, y1: <pixel_y_top>, x2: 1700, y2: <pixel_y_bottom> })
     This draws a horizontal band across the chart at the zone's price level.
  e. Repeat for each zone.

ANTI-PATTERNS:
  - Do NOT use plutus-browse-screenshot for TradingView charts. Use tv_ tools ONLY.
  - Do NOT skip tv_browser_container.
  - Do NOT skip zone drawing. Zones MUST be drawn on the chart before screenshotting.
  - Do NOT use write() to save screenshots. write() saves TEXT not binary. Use plutus-save-screenshot() instead.
  - Do NOT skip any pair. DXY FIRST.
  - Do NOT fabricate screenshot paths.
  - Do NOT call plutus-pipeline-charts until ALL 4 screenshots are verified as real binary PNGs (>10KB each).

⚠ IMAGE HANDLING — READ THIS EXACTLY: The base64 string returned by tv_screenshot is DATA — pass it straight to plutus-save-screenshot. NEVER analyze it, NEVER paste it into read(), NEVER try to read base64 text (read() truncates long lines and base64 is not an image). You ARE multimodal. read() on a .png/.jpeg file RENDERS the image to you directly. That is the ONLY way you look at screenshots. If you catch yourself reasoning about reading base64: STOP. Save the PNG, then read() the PNG.

SELF-VERIFICATION (must pass ALL before calling Tool 4):
  [ ] /tmp/plutus_dxy_4H.png exists — chart shows drawn zones
  [ ] /tmp/plutus_eurusd_4H.png exists — chart shows drawn zones
  [ ] /tmp/plutus_gbpusd_4H.png exists — chart shows drawn zones
  [ ] /tmp/plutus_audusd_4H.png exists — chart shows drawn zones

WHEN ALL 4 VERIFIED → call plutus-pipeline-charts with:
{
  "weekStart": "<same weekStart>",
  "reviewC": { "chainReviewed": true },
  "screenshots": [
    { "pair": "DXY", "timeframe": "4H", "path": "/tmp/plutus_dxy_4H.png" },
    { "pair": "EUR/USD", "timeframe": "4H", "path": "/tmp/plutus_eurusd_4H.png" },
    { "pair": "GBP/USD", "timeframe": "4H", "path": "/tmp/plutus_gbpusd_4H.png" },
    { "pair": "AUD/USD", "timeframe": "4H", "path": "/tmp/plutus_audusd_4H.png" }
  ]
}

=== MANUAL STEP D: READ SCREENSHOTS + VERIFY SCAFFOLD RUNGS (ZIP PHASE 2 — VERDICT FLOW) ===

After plutus-pipeline-charts verifies your screenshots, verify the scaffold rungs against
the ACTUAL candlestick structure. This is the PERCEPTION step. You ARE MiMo v2.5 — a
MULTIMODAL model. read() on a .png file RENDERS the image to you directly. That is the
ONLY way you look at screenshots.

The rectangles on your charts are the DETERMINISTIC SCAFFOLD — candidate rungs computed
from THIS week's own data, drawn by Tool 4. The rung list is in the Tool 4 output. Your
job is VERIFICATION, not invention: for EACH rung in the list, PERCEIVE whether it is
actually reacting on the chart and emit ONE verdict line per rung:

     ZONE|verdict|type|top|bottom|timeframe|classification|confidence|evidence

     - verdict: CONFIRMED (the level is visibly reacting — wick cluster / engulfing /
       sweep at the level) | REJECTED (price ignores it — closes through without
       reaction) | WEAK (marginal, ambiguous evidence)
     - type/top/bottom/timeframe: COPY them from the rung's own entry in the Tool 4
       rung list
     - classification: UNMITIGATED if untouched since formation, else BoM/MoM
     - confidence: your certainty IN THE VERDICT (a certain rejection = 60-75, NOT 80+)
     - evidence: specific candle evidence with EXACT prices + freshness (UM/1x/2x/pierced)
       (e.g. "3 upper wicks rejecting from 101.190, UM" or "two closes through 100.740
       with no wick rejection — level not defended")

EVERY RUNG NEEDS A VERDICT: emit one verdict line for EVERY rung in the Tool 4 list.
Skipped rungs are recorded as UNVERIFIED — they weaken your own setup map.

OFF-SCAFFOLD ADDITIONS: if you see a STRONG zone NOT in the scaffold list (an
unmitigated order block or liquidity sweep the computation missed), add it as an extra
line with verdict=CONFIRMED and a 10th field VLM_NEW. Maximum 3 per pair — the scaffold
is the primary map.

FOR EACH PAIR (DXY FIRST):
  1. read({ filePath: "/tmp/plutus_{pair}_4H.png" }) — LOOK at the chart.
  2. Walk the rung list top to bottom. For EACH rung, PERCEIVE the chart at that level:
     is it visibly reacting (CONFIRMED), ignored (REJECTED), or ambiguous (WEAK)?
  3. Emit one verdict line per rung, then any off-scaffold additions (max 3).

WHAT TO LOOK FOR:
  1. ORDER BLOCKS (the most important pattern): find a drastic, sharp price move →
     identify the candle BEFORE the move → mark the high/low of that candle's wicks
     = the OB zone. Must create break of structure (higher high or lower low).
     One-time-use (unmitigated — price has NOT retested since formation) = strongest.
  2. SUPPLY rungs (price rejected DOWN): bearish order blocks, upper wick clusters
     (3+ candles rejecting the SAME high), bearish engulfing at resistance,
     consolidation tops, double top with liquidity sweep above.
  3. DEMAND rungs (price rejected UP): bullish order blocks, lower wick clusters
     (3+ candles rejecting the SAME low), bullish engulfing at support,
     consolidation bottoms, double bottom with liquidity sweep below.
  4. LIQUIDITY rungs (stop-hunt/sweep areas): long wicks where price spiked through a
     level then reversed, just beyond visible swing highs/lows or round numbers,
     smart-money traps at chart patterns, trendline-break liquidity traps.
  5. UNMITIGATED PRIORITY: rungs price has NOT retested since formation are the
     strongest entries. Check: has any candle entered the zone since it formed?
     If not → unmitigated.

REQUIREMENTS (VEB gates will BLOCK you if violated):
  - ONE verdict line per scaffold rung — no skipped rungs.
  - ALL 4 pairs — no skipping.
  - evidence ≥20 chars naming the EXACT pattern with EXACT prices, for EVERY verdict
    including REJECTED. ("zone confirmed" / "looks good" / "valid zone" = BLOCKED as
    generic. A REJECTED verdict must still say WHY: e.g. "two closes through 100.740
    with no wick rejection — level not defended".)

GOD-VISION AUTOPSY PROCEDURE (the operator's visual method — follow this order):
  1. FIND THE SWEEP FIRST. Scan for a long wick that pokes through an obvious prior
     low/high and closes back inside. That wick is the origin candle — it seeds the
     week's bias and the deepest zone.
  2. MARK TERMINAL BODY CLUSTERS → BoM. 2-4 overlapping candle BODIES (not wicks)
     immediately before a large displacement candle that breaks structure.
     Box = the bodies' high/low.
  3. MARK MID-LEG SHELVES → MoM. A tight multi-candle consolidation inside an
     established leg, left behind unmitigated. Box = consolidation body range.
  4. DRAW LQZ RUNGS from wick clusters + repeated touches. Any price where ≥2 candles'
     wicks/bodies align within ~1-2 pips = a horizontal rung (liquidity zone).
  5. CLASSIFY mitigated vs unmitigated. Price traded through and closed beyond →
     mitigated (pass-through). Untested since formation → unmitigated (valid anchor).
  6. CHAIN CHECK. A rung price is currently bouncing from = the next trade's entry
     rung. The ladder is reused, never redrawn mid-week.
  7. RUNG-BASED SL. Stops belong at the NEXT RUNG — not the zone extreme, not a round
     number, not ATR padding. Note the next rung beyond each zone you identify.

DO NOT:
  - Use plutus-omni-vision (that is for VIDEO only).
  - Try to read base64 text (read() on .png renders the image directly).
  - Write generic evidence — describe the EXACT pattern with EXACT prices.
  - Only look at one side — you MUST find both supply AND demand zones.
  - Just confirm rectangles — read the actual candlestick patterns behind them.

EXAMPLE OUTPUT (DXY scaffold, spot 100.95):
ZONE|CONFIRMED|SUPPLY|101.14|101.19|4H|MoM|85|3 consecutive upper wicks rejecting from 101.190, 1x retest visible 07-08
ZONE|REJECTED|DEMAND|100.72|100.76|1H|MoM|65|two closes through 100.740 with no wick rejection — level not defended
ZONE|WEAK|LIQUIDITY|100.97|100.98|1H|MoM|55|rung recorded 2 reactions but wick evidence at 100.975 is thin — single sweep only
ZONE|CONFIRMED|DEMAND|100.84|100.95|4H|UNMITIGATED|80|bullish engulfing at 100.945, UM — no candle entered zone since formation|VLM_NEW

THEN: convert your ZONE| verdict lines into the validatedZones array and call
plutus-pipeline-setups:
{
  "weekStart": "<same weekStart>",
  "validatedZones": [
    {
      "pair": "DXY",
      "type": "SUPPLY" | "DEMAND" | "LIQUIDITY",
      "top": <number>, "bottom": <number>,
      "timeframe": "4H",
      "classification": "BoM" | "MoM" | "UNMITIGATED",
      "source": "VLM_CONFIRMED" (a scaffold rung you verified) | "VLM_NEW" (off-scaffold addition),
      "confidence": 0-100,
      "visualEvidence": "<your evidence text — exact pattern with exact prices + freshness>",
      "verdict": "CONFIRMED" | "REJECTED" | "WEAK",
      "sourceScreenshot": "/tmp/plutus_{pair}_4H.png"
    }
    // ... one object per ZONE| verdict line, covering ALL 4 pairs ...
    // REJECTED zones stay in the array — the setups tool decides their Law-14 pass-through role.
  ]
}
`;

const MANUAL_STEP_E_PROMPT = `
=== MANUAL STEP E: REVIEW VALIDATED ZONES ===

Tool 4 (charts) has verified your screenshots exist and issued the ZIP protocol directive.
You have read() the PNGs and produced ZONE| lines (Manual Step D). Review the validated zones below.

For each zone, verify:
  - The zone type (SUPPLY/DEMAND/LIQUIDITY) makes sense
  - The price levels (top/bottom) are reasonable for the pair
  - The confidence score is appropriate

When you are satisfied with the zones, call plutus-pipeline-setups with:
{
  "weekStart": "<same weekStart>",
  "validatedZones": [<copy the validatedZones array from Tool 4 output>]
}

ANTI-PATTERNS:
  - Do NOT modify zone prices or types
  - Do NOT skip zones you disagree with — let the setup generator's 7 rejection gates filter
  - Do NOT fabricate additional zones
`;

export function createToolAfterHook(): Hooks['tool.execute.after'] {
  return async (input: Record<string, unknown>, output: Record<string, unknown>) => {
    // ── Cross-plugin isolation ──
    const sessionId = (input as any)?.sessionID;
    if (!sessionId) return;

    const sessionAgent = getCurrentAgent(sessionId);
    if (!sessionAgent || !isPlutusAgent(sessionAgent)) return;

    // ── 1. Chain existing omni-vision after hook ──
    await plutusOmniVisionAfterHook(input, output);

    // ── 2. Manual Step prompt injection ──
    const toolName = (input as any)?.tool as string;
    if (!toolName) return;

    if (toolName === 'plutus-pipeline-shapes') {
      // After Tool 3 (shapes) → inject Manual Step C+D
      const existingOutput = (output as any)?.output as string;
      if (existingOutput) {
        try {
          const parsed = JSON.parse(existingOutput);
          parsed.manualStepPrompt = MANUAL_STEP_CD_PROMPT;
          (output as any).output = JSON.stringify(parsed, null, 2);
        } catch {
          // Output isn't JSON — append directly
          (output as any).output = existingOutput + '\n' + MANUAL_STEP_CD_PROMPT;
        }
      }
    }

    if (toolName === 'plutus-pipeline-charts') {
      // After Tool 4 (charts) → inject Manual Step E
      const existingOutput = (output as any)?.output as string;
      if (existingOutput) {
        try {
          const parsed = JSON.parse(existingOutput);
          parsed.manualStepPrompt = MANUAL_STEP_E_PROMPT;
          (output as any).output = JSON.stringify(parsed, null, 2);
        } catch {
          (output as any).output = existingOutput + '\n' + MANUAL_STEP_E_PROMPT;
        }
      }
    }
  };
}
