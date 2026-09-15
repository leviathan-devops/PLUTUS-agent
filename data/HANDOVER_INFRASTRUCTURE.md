# INFRASTRUCTURE + ENVIRONMENT — FULL TECHNICAL REFERENCE

**Purpose**: Everything needed to deploy, run, and debug the PLUTUS pipeline in the container. This is the ops manual.

---

## PROJECT LOCATION

```
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Manta Agent/Active_Projects/PLUTUS_AGENT/
```

## CONTAINER

| Property | Value |
|----------|-------|
| Container name | `trident-plutus-agent` |
| Docker image | `trident-plutus-testing:master` |
| Opencode binary | `node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus` |
| Plugin path | `/root/.config/opencode/plugins/plutus-engine/dist/index.js` |
| Auth key location | `/root/.local/share/opencode/auth.json` (inside container) |
| Auth key host | `~/.local/share/opencode/auth.json` |
| Model | `opencode-go/deepseek-v4-flash` |
| tmux session | `plutus` (single window) |
| Reports dir | `/root/plutus/reports/` |
| Pipeline diagnostic | `/root/plutus/reports/pipeline-diagnostic.json` |
| MTF diagnostic | `/root/plutus/reports/mtf-diagnostic.log` (custom diagnostic from constructAndMergeMultiTfZones) |

## HEADED BROWSER (TradingView Data Source)

| Property | Value |
|----------|-------|
| CDP endpoint | `http://localhost:9228` |
| Socat bridge | Maps host:9228 → container Chrome |
| Usage | TradingView OHLC data harvesting + Engine 3 chart screenshots |
| Playwright connection | `chromium.connectOverCDP('http://localhost:9228')` |
| Browser type | Headed Chrome (xvfb-backed for headless environments) |

## TRADINGVIEW SYMBOL MAPPING

```typescript
const TV_PAIR_MAP: Record<string, { symbol: string; exchange: string }> = {
  'DXY':     { symbol: 'DXY',    exchange: 'TVC' },
  'EUR/USD': { symbol: 'EURUSD', exchange: 'FX' },
  'GBP/USD': { symbol: 'GBPUSD', exchange: 'FX' },
  'AUD/USD': { symbol: 'AUDUSD', exchange: 'FX' },
};

// Chart URLs:
// DXY:     https://www.tradingview.com/chart/?symbol=TVC:DXY
// EUR/USD: https://www.tradingview.com/chart/?symbol=FX:EURUSD
// GBP/USD: https://www.tradingview.com/chart/?symbol=FX:GBPUSD
// AUD/USD: https://www.tradingview.com/chart/?symbol=FX:AUDUSD

// OANDA symbols also work:
// EUR/USD: OANDA:EURUSD
// GBP/USD: OANDA:GBPUSD
// AUD/USD: OANDA:AUDUSD
```

## DEPLOYMENT COMMANDS

```bash
# 1. Build the plugin
cd "/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Manta Agent/Active_Projects/PLUTUS_AGENT"
npx tsc --noEmit && echo "TSC OK"
bun build src/index.ts --outdir dist --target bun && echo "BUILD OK"

# 2. Deploy to container
docker cp dist/index.js trident-plutus-agent:/root/.config/opencode/plugins/plutus-engine/dist/index.js

# 3. Restart opencode in container
docker exec -i trident-plutus-agent bash -c "tmux send-keys -t plutus:0 C-c; sleep 2; tmux send-keys -t plutus:0 'node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus' Enter; sleep 15; tmux capture-pane -t plutus:0 -p | tail -8"

# 4. Run pipeline for a specific week
docker exec -i trident-plutus-agent bash -c "tmux send-keys -t plutus:0 'generate weekly TTE report for week 2026-07-06 with data cutoff 2026-07-06T09:00:00-04:00' Enter; sleep 150; tmux capture-pane -t plutus:0 -p | tail -80"

# 5. Pull report from container
docker cp trident-plutus-agent:/root/plutus/reports/TTE_Report_2026-07-06.md /tmp/TTE_LATEST.md

# 6. Pull diagnostic JSON
docker cp trident-plutus-agent:/root/plutus/reports/pipeline-diagnostic.json /tmp/diagnostic.json

# 7. Pull MTF diagnostic log
docker cp trident-plutus-agent:/root/plutus/reports/mtf-diagnostic.log /tmp/mtf-diagnostic.log 2>/dev/null

# 8. Fetch OHLC data for backtesting
docker exec -i trident-plutus-agent bash -c "for s in DXY EURUSD GBPUSD AUDUSD; do python3 /root/scripts/tv_datafeed.py --symbol \$s --exchange \$(echo \$s | sed 's/USD/USD/;s/DXY/TVC/') --interval 1_hour --bars 400 > /tmp/pa_score/\${s}_1h.json; done"
```

## TVDATAFEED (TradingView Python Library)

| Property | Value |
|----------|-------|
| Library | `tvDatafeed` (installed in container at `/usr/local/lib/python3.9/dist-packages/tvDatafeed/`) |
| Script path (container) | `/root/scripts/tv_datafeed.py` |
| Script path (host) | `scripts/tv_datafeed.py` |
| Auth | No login (free tier — data may be limited) |
| Timeframe mapping | 4H → `4_hour`, 1H → `1_hour`, 30m → `30_minute`, 15m → `15_minute`, D → `daily` |
| Max bars | 500 (free tier) |
| Historical depth | Recent only (last 2-8 days for LTF, last 40 days for 4H) |

**CRITICAL**: tvDatafeed returns RECENT bars. For 15m, only the last ~2 days are returned. When `dataCutoff` is applied to LTF bars, ALL bars might be filtered out because they're all AFTER the cutoff.

**Fix Applied**: LTF bars are NOT filtered by dataCutoff. They represent CURRENT market structure for zone construction, not historical price action. The dataCutoff only applies to 4H bars (for deterministic spot/price analysis). See `harvestAllData()` in pipeline around line 1862-1898.

## VLM ANALYSIS (Visual Intelligence)

| Property | Value |
|----------|-------|
| VLM model | MiMo (omnimodal — handles text + images) |
| VLM access | Via opencode SDK client (`this.client` in pipeline constructor) |
| VLM method | `session.prompt()` with image attachment (base64 data URL) |
| VLM fallback | `vlmInfer()` via OpenAI-compatible HTTP endpoint (`data-source-router.ts` line ~449) |
| VC daemon | BROKEN — external daemon at localhost:3323, consistently unavailable |
| Replacement | `TvChartController` (playwright-core over CDP :9228) — self-contained |

**VLM Screenshot Analysis Flow**:
1. `TvChartController.connect()` — attach to :9228 browser
2. `TvChartController.openChart(symbol)` — navigate TradingView
3. `TvChartController.setTimeframe(tf)` — switch to 4H/1H/30m/15m
4. `TvChartController.captureScreenshot(path)` — take screenshot
5. `TvChartImageFetch.analyzeScreenshot(path, prompt)` — send to VLM via SDK client
6. `VisualZoneLobe.parseVLMMarkdown(markdown)` — parse VLM response into VisualSDZone[]
7. `VisualZoneLobe.mapVisualZonesToIP(zones, ipZones)` — map onto Engine 1 IP zones

**VLM Prompt Structure** (for S/D/L zone identification):
```
Analyze this TradingView chart for [PAIR] on [TF] timeframe.

Identify EVERY visible zone:
1. SUPPLY ZONES: price levels where price was rejected from above.
   For each: exact price range (top/bottom), how many times tested, 
   what candle formed it, mitigated or virgin?

2. DEMAND ZONES: price levels where price bounced from below. Same details.

3. LIQUIDITY ZONES (LQZ): tight consolidations where price paused.
   For each: exact price range, how many bars, is it a Liquidity Shield?

4. CANDLESTICK PATTERNS at zone touches:
   Engulfing, Pin bars/Hammers, Inside bars, Breakout candles.

Return as markdown with sections for each zone type.
```

## SEMANTIC FIREWALL (65 Rules)

**File**: `src/semantic-firewall/index.ts` (1,312 lines)

**Key Rules That Block Setups**:
- **CS12**: Direction validation 6-check mandatory. Setup must have exactly 6 direction validation checks. **FIXED**: `buildDirectionValidation` now produces 6 checks.
- **CS1-CS18**: Core semantic rules (pair filter, notional filter, 3-tier classification, BoM/MoM enforcement, TF stack compliance, etc.)
- **RRR-1**: RRR minimum per category (HTF Swing ≥2.5, Scalp ≥1.5, Breakout ≥2.0)
- **SL-1**: SL distance maximum (per pair: DXY ≤150 points, FX ≤150 pips)
- **PROX-1**: Entry proximity maximum (per pair per category)
- **AP22**: No "Sideways Squeeze" terminology (SS = Swing Scalps only)

**Blind-Execution Checks (BE1-BE18)**:
- BE1-BE16: Original checks (day labels, session windows, shape triggers, setup categories, calendar, etc.)
- BE17: Session enforcement text ("DO NOT ENTER outside window")
- BE18: Candle confirmation text ("CONFIRMATION REQUIRED")

## CANONICAL REFERENCES

| Document | Location |
|----------|----------|
| System Prompt v5.3.3 | `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Plutus_Agent/Canon_Docs/Macbook Workspace/TTE System Prompts/Trident_System_Prompt_v5.3.3_DOWNLOAD_ME.md` |
| SMC Notes (1) | `/home/leviathan/Downloads/Forex SMC Notes(1).md` |
| SMC Notes (2) | `/home/leviathan/Downloads/Forex SMC Notes(2).md` |
| Winning Trade Library | `/home/leviathan/Pictures/WINNING_TRADE_LIBARARY/` (38 images across 10 folders) |
| User's God-Vision Chart | `/home/leviathan/Pictures/Screenshots/Screenshot from 2026-07-17 01-01-08.png` |
| User's DXY Trade Setup | `/home/leviathan/Pictures/Screenshots/Screenshot from 2026-07-16 12-13-28.png` |
| User's TP Zone | `/home/leviathan/Pictures/Screenshots/Screenshot from 2026-07-16 12-19-09.png` |
| User's Forward Price Action | `/home/leviathan/Pictures/Screenshots/Screenshot from 2026-07-16 12-19-42.png` |
| User's Screencast | `/home/leviathan/Videos/Screencasts/Screencast from 2026-07-17 12-16-20.mp4` (50s, 2560×1600) |
| Validated Trade Report | `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Plutus_Agent/Canon_Docs/Macbook Workspace/Validated Trade Reports/Trident_Report_2026W14_Mar30-Apr3.pdf` |

## HANDOVER DOCUMENT INDEX

| Document | Lines | Purpose |
|----------|-------|---------|
| `POST_COMPACTION_QUICK_START.md` | 53 | Read FIRST — quick status overview |
| `HANDOVER_PACKAGE_POST_COMPACTION.md` | 679 | Main handover — architecture, laws, status, next steps |
| `HANDOVER_37_FUNDAMENTAL_LAWS.md` | 497 | All 37 trading laws with evidence + code refs |
| `HANDOVER_ENGINE12_COMPLIANCE_AUDIT.md` | 241 | What was wrong with Engine 1+2, what was fixed |
| `HANDOVER_ENGINE3_ARCHITECTURE.md` | 268 | Visual intelligence layer architecture |
| `HANDOVER_TRADING_STRATEGY.md` | 208 | The user's actual trading strategy from SMC + winning trades |
| `HANDOVER_CODE_STRUCTURE.md` | 372 | Complete file map, key methods, data flow |
| `HANDOVER_REMAINING_WORK.md` | 312 | All remaining work items with priorities |
| `HANDOVER_INFRASTRUCTURE.md` | THIS FILE | Container, deploy, VLM, firewall, references |

## SECURITY NOTE

**CRITICAL**: `data-source-router.ts` line ~452 contains a hardcoded API key (`sk-9Bs...`) for the opencode-go endpoint. This key should be moved to an environment variable (`process.env.OPENCODE_GO_KEY`) and rotated.

---

## BUILD STATE (As of Last Handover)

| Property | Value |
|----------|-------|
| Current SHA256 | `c2b6341b5b87fbe993253a639a68f78838a41358bdb3c4fdffc69359b24dfb63` |
| TSC | 0 errors |
| Bun build | SUCCESS (8.12 MB with playwright-core, 1.19 MB without) |
| Pipeline lines | 5,641 |
| shape-brain.ts lines | 1,341 |
| 9-pillar-lobe.ts lines | 2,371 |
| 4h-sd-lobe.ts lines | 860 |
| Engine 3 total lines | 2,513 (types:145 + controller:254 + image-fetch:354 + zone-lobe:841 + setup-gen:919) |
| Total TypeScript | ~12,000+ lines across all files |
| `as any` casts | 0 |
| bun test | 13 passed |
| Current checkpoint | `Checkpoints/v3.3_HANDOVER_2026-07-17/` |
