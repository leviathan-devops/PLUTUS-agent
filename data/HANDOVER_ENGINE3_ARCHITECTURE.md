# ENGINE 3 VISUAL INTELLIGENCE — COMPLETE ARCHITECTURE AND IMPLEMENTATION GUIDE

**Purpose**: Engine 3 (3D) is the visual trade setup intelligence layer that sits ON TOP of Engine 1 (IP zones) and Engine 2 (shape chain). It uses TradingView chart screenshots + VLM candlestick pattern analysis to identify S/D/L zones for precise trade entries, SLs, and TPs.

**Core Principle**: Engine 3 SUPERIMPOSES on Engine 1 + Engine 2. It does NOT replace them. Engine 1 provides the battlefield map (WHERE the liquidity is). Engine 2 provides the war timeline (WHEN battles happen). Engine 3 provides the sniper precision (WHERE EXACTLY to enter/exit each battle).

---

## ARCHITECTURE OVERVIEW

```
Engine 1 (1D): IP Pressure Zones from DATA
    → 9-pillar analysis → confluence → ZFP → pressure degree
    → Output: ZoneMapSnapshot with IP zones
    → WHERE is the institutional liquidity?

Engine 2 (2D): Macro Shape Chain from Engine 1 + 1H bars
    → Current shape → ZFP chain → day decomposition → consolidation phase
    → Output: ShapePredictionSnapshot with 5-day shape chain
    → WHEN will battles happen?

Engine 3 (3D): Visual Trade Setup Intelligence
    → TradingView chart → Screenshot → VLM analysis → S/D/L zones
    → Map onto Engine 1 + Engine 2 → Generate setups
    → WHERE EXACTLY do we enter/exit?
```

## THE 3-STAGE VISUAL INTELLIGENCE PIPELINE

### Stage 1: Chart Capture (TvChartController)

**File**: `src/engine3/tv-chart-controller.ts` (254 lines)

**Purpose**: Navigate TradingView to a pair's chart, interact with the GUI (click timeframes, scroll back, zoom), and take screenshots. This replaces the broken external VC daemon.

**Technology**: `playwright-core` over `connectOverCDP('http://localhost:9228')`. This attaches to the SAME headed Chrome browser that the pipeline already uses for data harvesting. It adds input injection (clicking, dragging, scrolling, zooming) to the existing navigation/screenshot capabilities.

**API**:
- `connect()` — attach to the running headed Chrome on :9228. Never spawns a new browser. Prefers the TradingView tab.
- `openChart(tvSymbol)` — navigate to `tradingview.com/chart/?symbol=${tvSymbol}`. 12s SPA render wait.
- `setTimeframe(tf)` — click a timeframe button (1m/5m/15m/30m/1H/4H/D/W/M). Fallback: focus canvas → type minutes → Enter.
- `scrollBack(bars)` — focus canvas → ArrowLeft×bars → 1.5s history load.
- `dragPan(dxPixels)` — mouse down/move/up across canvas center for drag-pan.
- `zoom('in'|'out')` — `+`/`-` keyboard shortcuts.
- `captureScreenshot(path)` — PNG to disk.
- `captureScreenshotBase64()` — base64 for VLM.
- `disconnect()` — nulls refs only (browser is shared, never closed).

**Integration**: The pipeline creates `TvChartController` in its constructor and passes it to `VisualZoneLobe`. The controller is the PRIMARY path for chart capture. The fallback (IP zone edges) is used when the controller is unavailable.

### Stage 2: VLM Analysis (TvChartImageFetch)

**File**: `src/engine3/tv-chart-image-fetch.ts` (354 lines)

**Purpose**: Take a chart screenshot and send it to the VLM for S/D/L zone analysis. The VLM is the SAME model that analyzed the 38 winning trade images (MiMo, omnimodal — handles text + images).

**How it works**:
1. The screenshot is captured by TvChartController (or the existing CDP screenshot path)
2. The screenshot is sent to the VLM via the opencode SDK client (`session.prompt`)
3. The VLM receives: the screenshot image + a structured prompt asking for S/D/L zone identification
4. The VLM returns markdown with supply zones, demand zones, LQZ zones, and candlestick patterns
5. The response is parsed into structured `VisualSDZone[]`

**VLM Prompt Structure**:
```
Analyze this TradingView chart for [PAIR] on [TF] timeframe.

Identify EVERY visible zone:
1. SUPPLY ZONES: price levels where price was rejected from above. For each:
   - Exact price range (top/bottom)
   - How many times price touched it
   - What candle formed it (wick/body)
   - Is it mitigated (tested) or unmitigated (virgin)?

2. DEMAND ZONES: price levels where price bounced from below. Same details.

3. LIQUIDITY ZONES (LQZ): tight consolidations where price paused.
   - Exact price range
   - How many bars in the consolidation
   - Is this a Liquidity Shield (protecting another zone)?

4. CANDLESTICK PATTERNS at zone touches:
   - Engulfing candles
   - Pin bars / hammers
   - Inside bars
   - Breakout candles

Return as markdown with sections for each zone type.
```

**VLM Response Parsing**: The existing `parseVLMMarkdown()` method parses the VLM's markdown response into structured zones. It extracts: zone type (supply/demand/LQZ), price range, reaction count, candle pattern, mitigated status.

### Stage 3: Setup Generation (VisualSetupGenerator)

**File**: `src/engine3/visual-setup-generator.ts` (919 lines)

**Purpose**: Generate TradeSetup[] at the intersection of Engine 1 zones + Engine 2 shapes + Engine 3 visual zones.

**How it works**:

For each day in the Engine 2 shape chain:
1. Get the shape for that day (SS → scalps, BS → fade at supply, WL → whiplash, etc.)
2. Determine direction from ZONE PROXIMITY (nearest supply above → SHORT, nearest demand below → LONG)
3. Find visual LQZ zones that align with the shape's expected direction
4. Generate 3-entry staggered setup:
   - Entry 1 (Front): zone edge nearest to spot + forward spread (1-2 pips toward spot)
   - Entry 2 (Middle): zone midpoint or refined 1H candle body anchor
   - Entry 3 (Back): zone edge farthest from spot + forward spread
5. Compute SL at next visual LQZ beyond entry + 2-5 pip buffer
6. Compute TP at nearest opposing visual LQZ with liquidity overlap
7. Map the visual zone to the nearest Engine 1 IP zone (inherit pressure, ZFP, BoM/MoM)
8. Assign session based on shape (SS→London, BS→NY, etc.)
9. Add candle confirmation note
10. Add session enforcement note ("Enter ONLY during [session]")

**Key Methods**:
- `generateSetups()` — main entry point. Iterates day chain, generates setups for each day.
- `resolveDirection()` — determines direction from zone proximity (NOT from shape classification).
- `computeStaggeredEntries()` — computes entry1/entry2/entry3 with forward spreads.
- `computeSLAtNextLQZ()` — finds next LQZ beyond entry for SL placement.
- `computeTPAtOpposingLQZ()` — finds nearest opposing LQZ with liquidity overlap for TP.
- `buildDirectionValidation()` — produces 6 direction validation checks (required by CS12 firewall rule).
- `scoreConfidence()` — computes confidence score from IP zone confluence, VLM quality, RRR, momentum.

---

## THE WEEK CAPTURE WORKFLOW (Full Multi-TF Visual Analysis)

This is the complete Engine 3 workflow for a full week of trading:

```typescript
async captureAndAnalyzeWeek(pair: string, spot: number, zoneMap: ZoneMapSnapshot, shapePrediction: ShapePredictionSnapshot): Promise<VisualSDZone[]> {
  const controller = this.tvChartController;
  if (!controller) return this.fallbackToIPZones(zoneMap, spot);

  try {
    // 1. Open chart at 4H
    await controller.openChart(TV_PAIR_MAP[pair].exchange + ':' + TV_PAIR_MAP[pair].symbol);
    await controller.setTimeframe('4h');
    await controller.waitForTimeout(3000);
    
    // 2. Screenshot 4H (strategic map — 4H BoM zones, weekly bias)
    const shot4H = await controller.captureScreenshot(`/tmp/${pair}_4h.png`);
    
    // 3. Switch to 1H (tactical map — LQZ entry zones, liquidity shields)
    await controller.setTimeframe('60');
    await controller.waitForTimeout(3000);
    
    // 4. Screenshot 1H (tactical map)
    const shot1H = await controller.captureScreenshot(`/tmp/${pair}_1h.png`);
    
    // 5. Scroll back through the week (4 screens of 1H bars)
    const weekShots: string[] = [];
    for (let i = 0; i < 4; i++) {
      weekShots.push(await controller.captureScreenshot(`/tmp/${pair}_1h_week_${i}.png`));
      await controller.scrollBack(40); // ~40 bars = ~1.7 days
    }
    
    // 6. Switch to 30m for execution precision
    await controller.setTimeframe('30');
    await controller.waitForTimeout(3000);
    const shot30m = await controller.captureScreenshot(`/tmp/${pair}_30m.png`);
    
    // 7. Send ALL screenshots to VLM for S/D/L zone analysis
    const allShots = [shot4H, shot1H, ...weekShots, shot30m];
    const vlmResults: VLMAnalysisResult[] = [];
    for (const shot of allShots) {
      const result = await this.analyzeScreenshot(shot, pair);
      if (result) vlmResults.push(result);
    }
    
    // 8. Parse all VLM results into VisualSDZone[]
    const allZones: VisualSDZone[] = [];
    for (const result of vlmResults) {
      allZones.push(...result.visualZones);
    }
    
    // 9. Merge zones from multiple screenshots (dedupe by price overlap)
    const mergedZones = this.mergeVisualZones(allZones);
    
    // 10. Map merged zones onto Engine 1 IP zones (inherit pressure, ZFP, BoM/MoM)
    const mappedZones = this.mapVisualZonesToIP(mergedZones, zoneMap.zones);
    
    // 11. Return complete multi-TF visual zone map
    return mappedZones;
  } catch (err) {
    log.warn(`TvChartController capture failed for ${pair}: ${err instanceof Error ? err.message : String(err)}`);
    return this.fallbackToIPZones(zoneMap, spot);
  }
}
```

## THE FALLBACK (When VLM/Browser Unavailable)

The visual intelligence layer has TWO fallback layers:

**Layer 1 — IP Zone Edge Fallback** (when VLM/browser unavailable):
- Uses Engine 1's IP zone edges as approximate LQZ levels
- Each IP zone above spot → SUPPLY zone (top/bottom = ceiling/floor)
- Each IP zone below spot → DEMAND zone
- Each IP zone edge nearest to spot → LIQUIDITY zone (±2-4 pips band)
- Source tagged as `FALLBACK_IP_EDGE` (lower confidence: 45-85 vs 70-95 for VLM)
- The setup generator uses these approximate zones to produce setups (lower quality but functional)

**Layer 2 — Setup Generator Fallback** (when visual setup generator produces 0 setups):
- If the visual setup generator produces 0 setups (e.g., no visual zones met RRR/proximity requirements), the pipeline falls back to the original `constructBasicSetups`
- This guarantees the pipeline never produces zero setups due to Engine 3 issues

## INTEGRATION WITH ENGINE 1 + ENGINE 2

**Engine 1 Integration**: The visual zones are mapped to Engine 1's IP zones. Each visual zone that falls WITHIN an Engine 1 IP zone's price range inherits that IP zone's pressure degree, ZFP, reaction count, and structural classification (BoM/MoM). The visual zone then adds the ENTRY PRECISION that Engine 1 lacks (exact wick level, exact body edge).

**Engine 2 Integration**: The shape chain from Engine 2 determines WHICH visual zones are relevant for each day. SS days → swing scalp setups at range boundaries (both directions). BS days → fade at supply (SHORT at LQZ the surge reaches). WL days → whiplash entries at whiplash top/bottom. The shape determines the CATEGORY of the setup (Swing Scalp, Breakout Surge, HTF Swing, etc.).

## DIRECTION RESOLUTION (CRITICAL FIX)

**Old (WRONG)**: Direction came from hardcoded BULLISH_SHAPES/BEARISH_SHAPES lists. BS = bullish (LONG), SS = bearish (SHORT). This is WRONG because all shapes can be either bullish or bearish depending on the zone they're reacting at.

**New (CORRECT)**: Direction comes from ZONE PROXIMITY. The setup generator finds the nearest supply zone above spot and the nearest demand zone below spot. Whichever is CLOSER to spot gets the trade. Supply closer → SHORT (sell at supply). Demand closer → LONG (buy at demand).

**Why this matters**: The user's DXY SHORT trade was at the 1H LQZ at 101.19-101.24 (supply above spot). The pipeline was generating DXY LONG at 101.007 (demand below spot) because it treated BS as bullish. The correct direction was SHORT at the supply zone the BS surge reached.

## 3-ENTRY STAGGERED SYSTEM

From the user's winning trades:

| Entry | Position | Price | How It's Computed |
|-------|----------|-------|-----------------|
| Entry 1 (Front) | 33% | Zone edge nearest to spot + forward spread | `zone.edge ± forwardSpread` |
| Entry 2 (Middle) | 33% | Zone midpoint or 1H candle body anchor | `(zone.floor + zone.ceiling) / 2` |
| Entry 3 (Back) | 34% | Zone edge farthest from spot + forward spread | `zone.edge ∓ forwardSpread` |

**Forward spread**: 1 pip for EUR/USD, 1.5 for AUD/USD, 2 for GBP/USD, 0.02 for DXY. Applied toward spot from each edge. This ensures entries trigger even if price barely touches the zone.

**SL Cascade**: When R1 (Entry 2) fills, move Entry 1's SL to breakeven. When R2 (Entry 3) fills, move Entry 2's SL to breakeven. This eliminates risk on earlier entries as later ones fill.

**Combined Risk**: After full cascade, only Entry 3's SL distance remains as actual risk. Combined RRR can be 16-61x.

## FILES CREATED/MODIFIED

| File | Lines | Purpose |
|------|-------|---------|
| `src/engine3/types.ts` | 145 | VisualSDZone, VLMExtraction, VLMAnalysisResult, VLMZoneDetail, VLMCandlePattern types |
| `src/engine3/tv-chart-controller.ts` | 254 | Playwright-core CDP input injection controller (navigate, click TF, scroll, zoom, screenshot) |
| `src/engine3/tv-chart-image-fetch.ts` | 354 | Chart capture + VLM analysis via opencode SDK client |
| `src/engine3/visual-zone-lobe.ts` | 841 | VLM screenshot analysis + IP zone mapping + fallback |
| `src/engine3/visual-setup-generator.ts` | 919 | Setup generation at Engine 1+2+visual intersection |
| `src/engine/plutus-tte-pipeline.ts` | 5641 | Pipeline integration (TvChartController init, VisualZoneLobe wiring) |

## VERIFICATION

| Check | Result |
|-------|--------|
| TSC | 0 errors |
| Bun build | SUCCESS (1.19 MB, 125 modules) |
| `bun test` | 13 passed |
| Class instantiation + API surface | pass |
| `chromium.connectOverCDP` under bun | pass |
| Bundle contains controller | confirmed (TvChartController×10, connectOverCDP×23) |
| No `as any` casts | 0 across all Engine 3 files |

## WHAT'S STILL NEEDED

1. **Deploy to container and test** — The TvChartController needs the :9228 browser (which lives in the pipeline runtime behind the socat bridge). Need to verify it connects, navigates charts, takes screenshots, and the VLM analysis works.
2. **Verify CS12 fix** — The 6 direction validation checks should now pass the firewall. Verify all 18 raw setups pass CS12.
3. **Verify GBP/EUR setup generation** — The zone-based direction fix should now produce setups for GBP/USD and EUR/USD. Verify they generate >0 setups.
4. **Verify TP distance** — The TP computation should now target the NEAREST opposing zone with liquidity overlap (Earth+Fire), not the far edge of a distant zone.
5. **Score against price action** — Verify the setups produce wins (not just open positions).
