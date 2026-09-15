# PLUTUS ARCHITECTURE BIBLE 4.0
## THE DEFINITIVE COMPACTION-PROOF MASTER CONTEXT REFERENCE

**Version:** 4.0 FINAL
**Status:** AUTHORITATIVE — READ THIS FIRST AFTER ANY COMPACTION
**Date:** 2026-07-24
**Purpose:** Pure dense documentation of the Plutus TTE trading machine — every macro architecture component and every micro component, how they connect, how they self-reinforce. Zero codebase cleanup tasks. Zero ambiguity. This is not a research paper. It is a master context reference for a self-reinforcing trading machine that is closer to tangible AGI than a static codebase.

---

## PART 0: CURRENT STATE

### 0.1 Version and Checkpoint

**You are at:** Plutus v4.1 Clean Baseline
**Checkpoint location:** `Checkpoints/v4.1_WORKING_BASELINE_CLEAN/`
**SHA256 of dist/index.js:** `03f6fdbd904802c94c93166e596b8e430a6e2f36a7c90415f39d2514c77b5c85`
**Build metrics:** 102 modules bundled, 825,754 bytes (0.83MB) dist output, TSC reports 0 errors
**Baseline origin:** Clean merge of v4.0_6_SETUPS_BASELINE (trading intelligence — produces 6 correct setups with 3/3 direction accuracy on DXY and EUR/USD) and v4.0_WORKING_TOOLS_BROWSER_BASELINE (infrastructure — working browser MCP, Docker, identity, tool allowlist)

### 0.2 What IS Working (Verified in Container)

The agent initializes successfully inside the `plutus-container-testing:master` Docker image. When opencode starts with `--agent plutus`, the plugin loads and the following systems activate:

- **9 tools registered:** 7 pipeline tools (harvest, zones, shapes, charts, setups, browse-screenshot, backtest-setups) + plutus-status + plutus-omni-vision. The tool registration log confirms: "PLUTUS AGENT v4.0 — 9 tools registered (7 pipeline-4.0 tools)."
- **Semantic firewall loads 67 rules** from `semantic-firewall/index.ts` (1,312 lines). The firewall evaluates every setup through 67 independent rule checks before it reaches the report.
- **Pipeline harvest executes correctly:** When the agent calls `plutus-pipeline-harvest` with a weekStart date, the tool calls Python `tv_fetch_ohlc.py` via `execFile('python3', ...)` with a 120-second timeout. It fetches 4H (500 bars), 1H (200 bars), and 15m (200 bars) OHLC data for all 4 pairs (DXY, EUR/USD, GBP/USD, AUD/USD) from TradingView via the tvDatafeed library. Spot prices are extracted from the last bar's close. The harvested data is stored in `PipelineRunContext.harvestData`.
- **Engine 1 produces IP zone maps:** The 9-pillar analysis constructs zones from pivots, moving averages, options data, analyst commentary, structural extremes, Fibonacci levels, and regime detection. Each zone receives a confluence score (0-14), pressure degree assignment, ZFP computation, and BoM/MoM classification.
- **Engine 2 produces shape chains:** The ShapeBrain consumes Engine 1's zone map and produces a forward-mapped shape chain with day-level decomposition, applying the ZFP-conditioned transition matrix and the Trading Speed Rule (+1 day adjustment).
- **Engine 3 produces setups via VisualSetupGenerator:** The active code path is `VisualSetupGenerator.generateSetups()` in `engine3/visual-setup-generator.ts`. This is NOT the legacy `constructBasicSetups()` in `plutus-tte-pipeline.ts` — that function was explicitly REMOVED from the pipeline path (line 1004: "fallback REMOVED"). The visual setup generator produces 3-entry staggered setups with zone-geometry SL, single TP at opposing S/D with LQZ overlap, and confidence scoring using the actual formula from line 824.
- **Backtest tool validates setups:** `plutus-backtest-setups` fetches actual 1H bars via tvDatafeed, filters to the target week, checks whether each setup's entry was triggered on the setup's assigned day, scans forward from entry to determine if TP or SL was hit first, and returns a full backtest report with win rate, total pips, and per-setup results.
- **Anti-fabrication firewall is active:** The semantic firewall uses a 3-layer validation system on all screenshot inputs: (1) file existence check via `fs.access()`, (2) vision-based content verification via SDK client (sends image to model asking "Is this an options table? YES or NO"), (3) format validation via regex for price references and generic string rejection. This makes it mechanically impossible for the agent to fabricate screenshot data.
- **Container browser is operational:** Weston 9.0 headless compositor with XWayland module creates display `:0`. Chromium 120 launches with CDP on port 6930. The chrome-watchdog.sh monitors health every 10 seconds with dual checks (HTTP + WebSocket). The TV Browser MCP plugin (36-38 tools) connects to Chrome via CDP WebSocket and provides interactive browser control to the agent.

### 0.3 What is NOT Working (Known Blockers)

- **GBP/USD and AUD/USD produce 0 raw setups.** The root cause is that direction resolution locks ONE direction per day per pair instead of determining direction PER-ZONE. When all visual zones for GBP/USD happen to be on one side of spot (e.g., all supply above), the direction locks to SHORT. If the DXY cascade says the macro direction is LONG for GBP/USD that week, ALL zones are filtered out as counter-trend, producing 0 eligible zones and 0 setups. The fix requires per-zone direction: each zone generates its own direction based on type (supply→SHORT, demand→LONG) with alignment to Engine 2 shape and session mechanics, requiring minimum 3 confluences per setup.
- **LQZ detection code exists (920 lines, 3 candlestick pattern types) but does not produce zones in the pipeline.** Two root causes have been forensically identified: (1) `detectLiquidityZones()` receives 4H bars instead of 1H bars — the pipeline reads `ctx.harvestData.ohlc[pair]` which returns 4H-only data, but the LQZ detector is calibrated for 1H candlestick patterns with thresholds tuned for 1H volatility. Every threshold (24-bar lookback for sweep levels, 3-bar sharp move window, 5-pip minimum wick) is miscalibrated when applied to 4H bars. (2) `mergeLqzWithIpZones()` is imported in engine.ts but NEVER CALLED — it is dead code. Instead of merging LQZ zones into the IP zone map (which would boost confluence +2, reduce ZFP -5, and raise liquidityScore for overlapping zones), the pipeline naively concatenates LQZ zones with `[...pillarZones, ...sdZones, ...lqzZones]`, losing all the merge benefits.
- **TvChartController (port 9228) is legacy and does not work.** The `plutus-pipeline-charts` tool and `plutus-browse-screenshot` tool hardcode CDP port 9228, which does not match any running Chrome instance. The container runs Chrome on port 6930. The TV Browser MCP tools (36-38 tools on port 6930) are the correct browser interface. TvChartController should be replaced by MCP tool calls.
- **Options data step requires a date-specific investinglive.com URL.** The pipeline tries to navigate to `investinglive.com/archive/{fridayUrlSlug}` for OTC option expiry data. This URL changes weekly and may be malformed. The pipeline CAN proceed without options data — Pillar 8 is optional, and the other 8 pillars still produce zone maps.

### 0.4 Active Code Paths (What is Actually Called at Runtime)

- **Setup generation:** `VisualSetupGenerator.generateSetups()` in `engine3/visual-setup-generator.ts` (1,087 lines). This is the ACTIVE setup generator. The old `constructBasicSetups()` in `plutus-tte-pipeline.ts` (5,576 lines) is NOT called — the fallback was explicitly removed.
- **Direction resolution:** `resolveDirection()` at `visual-setup-generator.ts` line 521. Currently uses zone proximity only (nearest supply above → SHORT, nearest demand below → LONG). NEEDS IMPROVEMENT: must also consider Engine 2 shape for the day and session mechanics, and must operate PER-ZONE not PER-DAY.
- **Confidence scoring:** `scoreConfidence()` at `visual-setup-generator.ts` line 824. Uses the actual formula: base from visual zone confidence + IP confluence bonus + BoM bonus + zone-direction alignment + storyline bias + VLM-sourced bonus + RRR bonus - SL distance penalty - proximity penalty + momentum alignment.
- **TP computation:** `computeTPEarthFire()` in `visual-setup-generator.ts`. Computes a SINGLE TP at the nearest opposing visual LQZ where structural demand overlaps with liquidity (Earth+Fire). If overlap exists, uses zone midpoint. If no overlap, uses zone near edge.
- **Pipeline tools:** All defined in `pipeline/engine.ts` (1,422 lines). 7 tools registered via `createPipeline4Tools()`.

---

## PART 1: CRITICAL CONFIGURATION

These values have been verified against actual source code in the v4.1 checkpoint. They must NEVER change unless explicitly directed by the operator. Each value includes the reasoning for WHY it is what it is.

### 1.1 ZFP Zone Failure Threshold = 45

**Value:** `const ZFP_ZONE_FAILURE_THRESHOLD = 45;`
**Location:** `src/brains/shape-brain.ts` line 555
**Reasoning:** 45% is the tipping point where institutional defense of a zone transitions from "likely to hold" to "likely to fail." Below 45%, the zone has enough multi-dimensional confluence (pivots, MAs, options, structural extremes) that the defending institutional orders are stronger than attacking momentum. Above 45%, the zone's defense is cracking — modifiers like option expiry timing (+20-30%), momentum building (+10-20%), and cascade effects (+20-30%) have eroded the structural integrity enough that price is likely to punch through. This threshold drives the most critical shape transition in Engine 2: SS→BS (when a bounding zone's ZFP exceeds 45%, the consolidation breaks and a breakout surge begins).

### 1.2 Pair Name Format = 'EUR/USD' with Slashes

**Value:** `const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];`
**Location:** `src/pipeline/engine.ts` line 136
**Reasoning:** The internal pipeline uses slashes in pair names for consistency with the trading methodology. The TradingView API uses different formats (FX:EURUSD, TVC:DXY), but these are converted at the data-fetching boundary. Using slashes internally prevents the kind of pair-name drift that caused the V4.2 derailment (where 'EUR/USD' was changed to 'EURUSD', breaking zone matching, pair lookup, and cascade mapping throughout the pipeline).

### 1.3 DXY Formula Constant K = 50.14348112

**Value:** `50.14348112`
**Location:** `src/constants/trading-constants.ts`
**Reasoning:** This is the exact mathematical constant from the Federal Reserve's DXY formula. It represents the base value before component pair weights are applied. Changing even one decimal place would make all DXY option strike conversions incorrect, silently shifting every Pillar 8 zone level.

### 1.4 EUR/USD Weight in DXY = -0.576

**Value:** `-0.576` (negative = inverse correlation, 57.6% of DXY formula)
**Location:** `src/constants/trading-constants.ts`
**Reasoning:** EUR/USD is 62.4% of DXY's per-pip sensitivity — 5.2× more impactful than the next component (USD/JPY at 11.9%). This is why EUR/USD has its OWN dedicated conversion pillar (Pillar 8) separate from the generic Pillar 3 component pair conversion. The negative sign means when EUR/USD goes UP, DXY goes DOWN (inverse). This inverse relationship is the foundation of the DXY cascade for FX pairs.

### 1.5 TP Per Trade = ONE

**Value:** Design principle — no constant, enforced throughout Engine 3 architecture
**Reasoning:** Each trade setup has exactly ONE take-profit target. There is no TP1, TP2, TP3. There are no "partial take-profits." The blended RRR is calculated across the 3 staggered ENTRIES (which have different entry prices but share the same SL and TP), NOT across multiple take-profit levels. This is non-negotiable. The trade exits at one price: the nearest opposing supply/demand zone where the LQZ (liquidity) sits inside the S/D zone.

### 1.6 RRR Computation = Category-Specific via rrrForCategory()

**Value:** `RRR_BY_CATEGORY` in `trading-constants.ts` is the SINGLE source of truth
**Location:** `src/constants/trading-constants.ts`
**Reasoning:** Different setup categories have inherently different risk/reward profiles. Consolidation scalps operate in tight ranges with smaller moves but higher frequency — they need a lower RRR floor (1.5). HTF swings capture large directional moves — they need a higher floor (2.0). Flattening all categories to a single floor (like 1.0) would allow low-quality setups that don't reflect the structural reality of each category. The `rrrForCategory()` function normalizes any category representation (enum values, abbreviated keys, case variants) to the canonical entry, so consumers never need to hardcode minimums.

### 1.7 Model Configuration

**Primary model:** `opencode-zen/mimo-v2.5-free` — Start here. This is the free tier of MiMo v2.5, the omnimodal model. It provides full multimodal capabilities (image analysis for VLM chart screenshots) at no cost.
**Fallback model:** `opencode-go/mimo-v2.5` — Switch to this PAID model when the free tier hits rate limits. Same MiMo v2.5 model, just on the paid endpoint with higher rate limits.
**Location:** `config.json`
**Both models are MiMo v2.5** — the same underlying model with the same capabilities. The only difference is the endpoint (free vs paid) and the rate limit. The agent should start on free and switch to paid when it receives rate limit errors.

### 1.8 Docker Image = plutus-container-testing:master

**Value:** `plutus-container-testing:master` (6.84GB)
**Location:** `Dockerfile` `FROM` directive
**Reasoning:** This image contains Weston 9.0, Chromium 120, Python 3 with tvDatafeed, Node.js with opencode-ai, and the TV Browser MCP pre-installed. Xvfb is explicitly PURGED to prevent accidental use (Xvfb lacks a compositor, breaking WebGL canvas interactions). No other Docker image should be used for Plutus testing.

### 1.9 Chrome CDP Port = 6930

**Value:** Port 6930
**Location:** `start-plutus.sh` line 40: `--remote-debugging-port=6930`
**Verified:** Confirmed on both running containers (`plutus-browser-container` and `plutus-host`) via `curl -s http://127.0.0.1:6930/json/version` returning valid Chrome version info.
**Port history:** 9228 was the Xvfb era port (Plutus 3.x, now obsolete). 9333 was the desktop MCP source code default (wrong for container — the MCP was rebuilt to 6930 for the container image). 6930 is the current, correct port.

### 1.10 Display = :0

**Value:** `DISPLAY=:0`
**Location:** `start-plutus.sh`, verified via `weston.log`: `xserver listening on display :0`
**Verified:** X0 socket exists at `/tmp/.X11-unix/X0` on both containers.
**Reasoning:** Weston headless compositor with XWayland module creates an X11 display on the first available number (:0 when no other X server exists). The Dockerfile passes `DISPLAY=:0` into the MCP's environment. The MCP source code in Ship_Packages hardcodes `DISPLAY=":1"` (for desktop mode), but this is overridden in the container because Chrome is already running (the MCP's `ensureChrome()` is a no-op when Chrome is detected on port 6930).

### 1.11 TV Browser MCP Tools = 36-38

**Count:** 36-38 tools registered as MCP tools
**Location:** Ship_Packages/TV_Browser_v3.0/src/index.ts, toolDefs array
**Categories:** Browser Control (5-6), Input Primitives (7), Drawing Tools (6), API Drawing Management (3), Chart Navigation (8), Price Mapping (2), Low-Level (4-5)
**Spawn tools removed:** The container-deployed MCP version has spawn tools removed (Chrome lifecycle is managed by `start-plutus.sh`, not the MCP). The MCP connects to the already-running Chrome via CDP WebSocket.

### 1.12 Bash = REMOVED from Agent Allowlist

**Value:** Bash is NOT in the ALLOWED_PREFIXES list
**Location:** `src/hooks/tool-allowlist.ts`
**Reasoning:** The Plutus agent is a TRADING ENGINE, not a general-purpose agent. It communicates with the world through its pipeline tools, TV Browser MCP tools, and file operations (read, write, glob, grep). Removing bash prevents the agent from executing arbitrary shell commands, which could destabilize the container or bypass the pipeline's mechanical safeguards.

### 1.13 Firewall Rules = 67

**Value:** 67 rules in `semantic-firewall/index.ts`
**Location:** `src/semantic-firewall/index.ts` (1,312 lines)
**Categories:** ZT (Zero Tolerance) rules, CS (Core Semantic) rules, RRR rules, SL rules, proximity rules, blind-execution checks (BE1-BE12). Any HARD_BLOCK results in setup rejection. The firewall needs a mode flag (`isReportGeneration: boolean`) — when true, certain rules (ZT-2, ZT-5, ZT-8, ZT-9, ZT-12) skip because they are designed for live position management, not report generation.

### 1.14 Notional Units = Already in BILLIONS

**Value:** OTC option notional values from Protocol A are already expressed in billions
**Reasoning:** A $1.5B option strike is represented as `1.5`, not `1500` or `0.0015`. Dividing by 1000 would make every option wall fall below the $850M threshold, causing ALL options to be classified as EXCLUDED. This would silently disable the entire Pillar 8 (EUR/USD options conversion) and Pillar 3 (component pair conversion) options layer, making the Options-Derived dimension score 0 for every zone.

---

## PART 2: THE CONTAINER AND BROWSER STACK

### 2.1 Docker Container Architecture

The Plutus agent operates inside a Docker container built from the `plutus-container-testing:master` image (6.84GB). This image is a purpose-built trading environment containing every dependency the agent needs to harvest data, construct zones, predict shapes, generate trade setups, and interact with TradingView charts.

**Pre-installed software in the image:**

- **Weston 9.0** — Wayland compositor with headless backend support and the XWayland module. This is the compositor layer that makes CDP mouse events reach TradingView's WebGL canvas.
- **Chromium 120** — Headed Chrome browser with remote debugging support. Launched with anti-throttling and keep-alive flags for 24+ hour uptime.
- **Python 3** with the `tvDatafeed` library pre-installed at `/usr/local/lib/python3.9/dist-packages/tvDatafeed/`. Used by the harvest tool to fetch OHLC data from TradingView's free data feed.
- **Node.js** with the `opencode-ai` framework pre-installed at `/usr/local/lib/node_modules/opencode-ai/`. The agent runs via `node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus`.
- **tmux** — Terminal multiplexer for persistent sessions. The agent runs inside a tmux session named `plutus`.
- **dbus** — Desktop bus for IPC. Weston requires dbus to function.
- **socat** — Network relay (may be needed for port forwarding between Chrome instances).
- **Xvfb is PURGED** — The image explicitly removes Xvfb (`apt-get purge -y xvfb && rm -f /usr/bin/Xvfb /usr/bin/Xvfb.real`) to prevent accidental use. Xvfb lacks a compositor, which breaks TradingView's WebGL canvas interactions.

### 2.2 Container Startup Sequence (start-plutus.sh)

The container entrypoint script `start-plutus.sh` performs the following steps in exact order:

**Step 1: Process Cleanup**
```bash
pkill -9 -f "chromium.*remote-debugging-port" 2>/dev/null || true
pkill -9 -f weston 2>/dev/null || true
pkill -9 -f Xvfb 2>/dev/null || true
pkill -9 -f dbus-daemon 2>/dev/null || true
```
Kills any leftover processes from previous runs. This ensures a clean state before starting the browser infrastructure.

**Step 2: D-Bus Session Bus**
```bash
eval $(/usr/bin/dbus-launch --sh-syntax)
export $(dbus-launch)
```
Weston requires dbus for IPC (inter-process communication). The dbus session bus must be running before Weston starts.

**Step 3: Weston Headless Compositor**
```bash
/usr/bin/weston --backend=headless-backend.so \
    --width=1920 --height=1080 \
    --modules=xwayland.so \
    --log=/tmp/weston.log &
sleep 5
```
Weston starts with the headless backend (no physical display needed). The `--modules=xwayland.so` flag loads the XWayland module, which provides full X11 compatibility on top of Wayland. The 5-second sleep allows Weston to fully initialize before Chrome starts.

**Step 4: Display Verification**
```bash
if [ -S /tmp/.X11-unix/X0 ]; then
    export DISPLAY=:0
fi
```
Weston's XWayland module creates an X11 display socket at `/tmp/.X11-unix/X0`. The script verifies this socket exists before setting `DISPLAY=:0`. This is the display that Chrome will use.

**Step 5: Chromium Launch**
```bash
chromium \
    --no-sandbox \
    --disable-gpu \
    --remote-debugging-port=6930 \
    --remote-debugging-address=0.0.0.0 \
    --no-first-run \
    --disable-features=TranslateUI \
    --user-data-dir=/tmp/tv-browser-profile \
    --keep-alive-for-test \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --disable-features=CalculateNativeWinOcclusion \
    'about:blank' &
```
Chrome launches with:
- `--remote-debugging-port=6930` — CDP endpoint for MCP and pipeline tools
- `--remote-debugging-address=0.0.0.0` — Allows connections from any network interface (needed for host-to-container communication)
- `--user-data-dir=/tmp/tv-browser-profile` — Profile directory for session persistence (TradingView login cookies)
- `--keep-alive-for-test` and anti-throttling flags — Prevent Chrome from sleeping or throttling background tabs, ensuring 24+ hour uptime
- `--no-first-run` and `--disable-features=TranslateUI` — Suppress first-run dialogs and translation prompts that could interfere with automated navigation

**Step 6: Chrome Health Verification**
```bash
sleep 3
if curl -s http://127.0.0.1:6930/json/version > /dev/null 2>&1; then
    echo "Chrome running on CDP port 6930"
else
    echo "WARNING: Chrome failed to start"
fi
```
Waits 3 seconds for Chrome to initialize, then verifies the CDP endpoint responds.

**Step 7: Chrome Watchdog**
```bash
/root/chrome-watchdog.sh &
```
Starts the self-healing watchdog that monitors Chrome health every 10 seconds.

**Step 8: Container Stay-Alive**
```bash
exec sleep infinity
```
The container stays alive indefinitely, waiting for the opencode agent to be started via tmux.

### 2.3 WHY Weston Instead of Bare Xvfb — The Compositor Problem

This is one of the most critical architectural decisions in the entire system. Without understanding WHY Weston is required, an engineer might "simplify" by switching to Xvfb — which would silently break all TradingView drawing interactions.

**The Problem:** TradingView's chart is rendered as a **WebGL canvas**. WebGL canvases use GPU-accelerated rendering and compositor-based input dispatch. When a CDP `Input.dispatchMouseEvent` command is sent to Chrome:

1. Chrome receives the mouse event via CDP WebSocket
2. Chrome creates a synthetic `PointerEvent` with `isTrusted: false` (CDP events are always untrusted)
3. Chrome dispatches the event through its input pipeline
4. **Without a compositor:** The event reaches the DOM layer but is IGNORED by the WebGL canvas. The canvas's compositor-based pointer event dispatch filters out untrusted events. The click lands on the DOM container around the canvas but never reaches the canvas itself.
5. **With a compositor (Weston/XWayland):** The compositor layer ensures that input events are properly dispatched to the rendering surface. The synthetic CDP events are processed through the compositor's input pipeline, which trusts them because they arrive through the system's input channel.

**What breaks without Weston:**
- Drawing tools (Rectangle, Trend Line, Fib Retracement, Long/Short Position) — flyout clicks don't register on the canvas. The agent clicks "Rectangle" in the TV UI, but the tool never activates because the click doesn't reach the WebGL canvas.
- Canvas drag/pan — clicking and dragging the chart background does nothing. The chart doesn't move.
- Scroll-zoom — mouse wheel events don't reach the chart. The chart doesn't zoom.
- All `tv_draw_*` MCP tools fail silently.

**Why Xvfb was PURGED:** An engineer might accidentally start Xvfb alongside Weston, or replace Weston with Xvfb for "simpler" setup. The Dockerfile explicitly removes Xvfb binaries to make this impossible: `RUN apt-get purge -y xvfb && rm -f /usr/bin/Xvfb /usr/bin/Xvfb.real`

### 2.4 Chrome Watchdog — Self-Healing Architecture

The `chrome-watchdog.sh` script (167 lines) runs as a background daemon and monitors Chrome health with dual checks:

**Check 1 — HTTP Health (catches complete crashes):**
```bash
check_chrome() {
    curl -s http://127.0.0.1:$CDP_PORT/json/version > /dev/null 2>&1
}
```
Tests whether Chrome's HTTP server responds on port 6930. If Chrome has crashed entirely (process dead), this returns false.

**Check 2 — WebSocket Health (catches zombie Chrome):**
```bash
check_renderer() {
    # Opens WebSocket to Chrome's CDP endpoint
    # Sends: {"id":1,"method":"Runtime.evaluate","params":{"expression":"1+1"}}
    # Waits 5 seconds for response containing "2"
    # If no response: returns "DEAD"
}
```
This catches the "zombie Chrome" failure mode where the browser process is alive (HTTP responds) but the renderer process has crashed (WebSocket commands are silently dropped). This is critical because `check_chrome` would pass but no CDP commands would actually execute.

**Self-Heal Sequence on Failure:**
1. Detect failure (either check fails)
2. `pkill -9 -f "chromium.*remote-debugging-port=$CDP_PORT"` — forcefully kill zombie Chrome
3. Auto-detect display from weston.log: `grep -oP 'xserver listening on display :\K\d+' /tmp/weston.log`
4. Restart Chrome with identical flags (same profile, same port, same URL)
5. Wait up to 30 seconds for CDP readiness (15 attempts × 2 second intervals)
6. If recovered: log success, reset restart counter
7. If failed: increment restart counter, continue monitoring

**Configuration:**
- Check interval: 10 seconds
- Renderer WebSocket timeout: 5 seconds
- Max restarts before temporary give-up: 5 (then 60-second sleep, reset counter, resume)
- Log file: `/tmp/chrome-watchdog.log`

### 2.5 TV Browser MCP — Full Tool Manifest

The TV Browser MCP provides 36-38 tools to the agent. These tools are registered in the opencode config under `mcp.tv-browser` and are available to the Plutus agent via the `tv_` and `tv-browser_` prefixes in the tool allowlist.

**Tool groups by function:**

*Browser Control (5-6 tools):*
- `tv_browser_desktop` — Launch or attach Chrome on the local desktop. Auto-reconnects if running, auto-spawns if dead. Optionally navigates to a URL after connecting.
- `tv_browser_container` — Connect to or start a containerized browser (Weston+XWayland+Chrome). Auto-spawns Docker container if not running. Supports parallel instances via suffix parameter.
- `tv_screenshot` — Capture a PNG screenshot as base64. Returns the image data directly to the agent's context.
- `tv_reset` — PANIC BUTTON: Clicks undo to revert last change, clicks chart to deselect, then returns a screenshot. Use when stuck or after accidental drawing.
- `tv_get_state` — Returns the current page state: URL, title, viewport dimensions, and a list of interactive DOM elements.
- `tv_navigate` — Navigate to a URL (symbol, timeframe, etc.). Waits for page load.

*Input Primitives (7 tools):*
- `tv_click` — Left-click at pixel coordinates (x, y).
- `tv_double_click` — Double-click at (x, y) with 0.1-second gap between clicks. Used to select all text in input fields.
- `tv_right_click` — Right-click at (x, y) to open context menus.
- `tv_drag` — Drag from (from_x, from_y) to (to_x, to_y). Used for chart panning.
- `tv_scroll` — Mouse wheel zoom at (x, y). Direction: "in" or "out". Steps: 1-20.
- `tv_type` — Type text into the currently focused input field.
- `tv_press_key` — Press a keyboard key (Enter, Escape, Tab, letter keys, etc.). Supports 60+ VK codes.

*High-Level Input (1 tool):*
- `tv_value_overwrite` — Completely replace the value in an input field. Double-clicks to select all, then types the new value. Used for coordinate field edits.

*Drawing Tools (6 tools):*
- `tv_draw_long_position` — Draw a Long Position on the chart. Two clicks: entry point then target point.
- `tv_draw_short_position` — Draw a Short Position. Two clicks: entry then target.
- `tv_draw_fib_retracement` — Draw Fibonacci Retracement. Uses diagonal anchors — swing low (left) to swing high (right). The two x coordinates MUST differ.
- `tv_draw_rectangle` — Draw a Rectangle. Two clicks: corner 1 then corner 2.
- `tv_draw_trend_line` — Draw a Trend Line. Two clicks: start point then end point.
- `tv_draw_horizontal_line` — Draw a Horizontal Line at a specific price level. Single click at the desired price.

*API-Based Drawing Management (3 tools — v3.0 additions):*
- `tv_list_drawings` — List ALL drawings on the chart via TradingView's internal chart API (`_exposed_chartWidgetCollection`). Returns each drawing's ID, type, and exact coordinates (price, bar). No Object Tree or pixel hunting needed.
- `tv_select_drawing` — Select a drawing by its ID (from `tv_list_drawings`). Shows anchor points on the chart. Follow with `tv_open_drawing_settings` to edit.
- `tv_open_drawing_settings_by_id` — Open the settings panel for a drawing by ID. No pixel hunting — works for any drawing type.

*Chart Navigation (8 tools):*
- `tv_zoom` — Simple zoom in or out at chart center. Direction: "in" or "out". Steps: 1-20.
- `tv_canvas_pan` — Pan the chart by dragging the EMPTY grid background. Uses safe-drag-point detection (12-point grid probe) to avoid moving existing drawings. Can pan by bars, pixels, price, or time.
- `tv_canvas_zoom` — Zoom the chart at a specific price/time point. More precise than `tv_zoom`.
- `tv_set_timeframe` — Change the chart timeframe. Clicks the toolbar button first; falls back to URL navigation if the button is not found. Supports: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W.
- `tv_get_view` — Read the current chart view: visible bar range, price range at viewport edges, current timeframe, bar spacing. The "where am I?" primitive.
- `tv_find_empty_area` — Find a safe drag point on the chart background (no drawing beneath). Returns pixel coordinates + strategy used. Essential for panning without disturbing drawings.
- `tv_navigate_to` — High-level navigation verb. Combines multiple primitives. Intents: look_left, look_right, zoom_to_macro, zoom_to_micro, reset, go_to_latest.
- `tv_refine_element_coordinates` — Open drawing settings and navigate to the correct tab. Long/Short positions → Inputs tab. Other elements → Coordinates tab. Use with `tv_value_overwrite` to modify fields.

*Price Mapping (2 tools):*
- `tv_find_price_y` — Map a price level to Y pixel coordinate via TradingView's internal chart API (`priceScale().priceToCoordinate()`). Returns `{price, y}`. Eliminates guesswork for clicking at specific prices.
- `tv_find_y_price` — Map a Y pixel coordinate to a price value. Reverse of `tv_find_price_y`. Returns `{y, price}`.

*Low-Level and Vision (4-5 tools):*
- `tv_open_flyout` — Open a drawing tool flyout by group name (trend-line, gann-and-fibonacci, patterns, prediction-and-measurement, geometric-shapes, annotation). Hovers + clicks the arrow button.
- `tv_select_tool` — Select a specific tool from an open flyout. Clicks at 25%-from-left offset.
- `tv_find_element` — Take a screenshot for visual element discovery. Canvas-rendered elements (candles, drawings) are NOT in the DOM — this screenshot is the only way to find them.
- `tv_evaluate` — Execute arbitrary JavaScript in the page context. Used for internal API calls, DOM queries, and custom logic.

### 2.6 TradingView Login Persistence

**Profile location:** `/tmp/tv-browser-profile` inside the container.

**Persistence mechanism:** The profile directory is bind-mounted from the host:
```bash
docker run -d --name plutus-browser-container \
    -v "$(pwd)/container_data/browser_profile:/tmp/tv-browser-profile" \
    plutus-container-testing:master
```

**Critical files inside the profile:**
- `Default/Cookies` — SQLite database containing TradingView session cookies (auth tokens). These are the "logged in" tokens that prevent the signup popup.
- `Default/Local State` — Browser-wide state including encryption keys.
- `Default/Preferences` — Chrome settings and configuration.
- `Default/Login Data` — Saved password cache.
- `Default/Session Storage/` — Per-tab session state.

**Survival across restarts:** YES — as long as the bind mount is present. When Chrome starts with `--user-data-dir=/tmp/tv-browser-profile`, it reads existing cookies from the bind-mounted host directory. If valid TradingView session cookies exist, Chrome is already logged in — no popup appears.

**Login process (if cookies expire):**
1. Navigate to `https://www.tradingview.com/accounts/signin/`
2. Click "Email" button
3. DOM-query the email input field, fill with credentials
4. DOM-query the password input field, fill with password
5. Click "Sign in" button
6. Navigate to chart
7. Verify no popup by checking `document.body.textContent` for absence of "Look first" or "Join for free"
8. "Remember me" checkbox is pre-checked — TradingView sets persistent cookies

**Credentials:** Stored in the profile. Documented in `docs/CONTAINER_BROWSER_LOGIN_PERSISTENCE.md`.

### 2.7 Port History and Display History

| Port/Display | Era | Context | Status |
|--------------|-----|---------|--------|
| Port 9228, Display :3 | Xvfb era (Plutus 3.x) | Original T1_HEADED_CHROME_DOCKER_REFERENCE.md | OBSOLETE — Xvfb purged, TvChartController hardcodes this port and does NOT work |
| Port 9333, Display :1 | Desktop MCP source code | Ship_Packages/TV_Browser_v3.0/src/index.ts constants | WRONG for container — MCP was rebuilt to port 6930 |
| Port 6930, Display :0 | Current container | start-plutus.sh + Dockerfile | CORRECT — verified on running containers |

**Why three ports exist:** Documentation drift + parallel development. The T1 reference doc was written for the Xvfb era (9228). The MCP source code was written for desktop mode (9333). The container deployment chose 6930 to avoid collision with host desktop Chrome on 9333. The Dockerfile comment confirms: "Copy pre-built MCP (spawn tools removed, port 6930, DISPLAY :0)" — meaning the MCP's dist/index.js was REBUILT with port 6930 for the container.

### 2.8 The Architecture Stack (Bottom to Top)

```
Layer 0: Docker container (--init for zombie reaping, --network host)
    ↓
Layer 1: dbus session bus (IPC infrastructure)
    ↓
Layer 2: Weston 9.0 (headless-backend.so, 1920×1080, xwayland.so module)
    ↓
Layer 3: XWayland → creates X11 display :0 (/tmp/.X11-unix/X0)
    ↓
Layer 4: Chromium 120 (--ozone-platform=x11, CDP on port 6930)
    ↓ (--keep-alive-for-test, anti-throttling flags, /tmp/tv-browser-profile)
Layer 5: TradingView SPA (WebGL canvas, logged in via persistent profile)
    ↓
Layer 6: Chrome Watchdog (10s interval, HTTP + WebSocket dual-check, auto-restart)
    ↓
Layer 7: TV Browser MCP (36-38 tools, stdio JSON-RPC, connects via CDP WebSocket on 6930)
    ↓
Layer 8: Plutus Plugin (9 tools + 4 hooks + allowlist + identity)
    ↓
Layer 9: opencode agent (plutus agent, TUI interface)
```

---

## PART 3: THE 5-TOOL CHAIN PIPELINE

### 3.1 Architecture Overview

The Plutus pipeline is NOT a monolithic function that runs all at once. It is a **sequential 5-tool chain** where the agent calls tools one by one, reasoning between each call. Each tool mechanically validates the previous step's output through a multi-layer firewall, making it impossible to skip steps or fabricate data.

This architecture was chosen because:
1. It forces the agent to follow the correct sequence (harvest → zones → shapes → charts → setups)
2. It provides natural checkpoints where the agent can reason about intermediate results
3. It makes fabrication mechanically impossible (each tool validates the previous tool's output)
4. It allows "manual steps" between tools where the agent performs browser interactions

### 3.2 PipelineRunContext — The Shared State

A module-level `PipelineRunContext` object is shared across all tool calls via `ensureContext(weekStart)`. This is the data backbone of the entire pipeline — every tool reads from and writes to this context.

```typescript
interface PipelineRunContext {
    // Identity
    weekStart: string;                    // ISO date string, e.g., "2026-07-06"
    temporalAnchor: number;               // Unix timestamp of Friday close (data cutoff)
    startedAt: number;                    // Unix timestamp of pipeline start

    // Phase outputs (each tool stores its result here)
    harvestData: {
        ohlc: Record<string, OHLCBar[]>;              // 4H bars per pair (primary dataset)
        ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>;  // ALL timeframes (4H, 1H, 15m)
        spots: Record<string, number>;                 // Current spot price per pair
        optionsDateLink: { url: string; fridayIso: string };
    } | null;

    zoneMapSnapshot: {
        zones: DXYZone[];
        spots: Record<string, number>;
        version: number;
        timestamp: number;
    } | null;

    shapeSnapshot: ShapePredictionSnapshot | null;

    // Accumulated state across tools
    screenshots: Array<{
        pair: string;
        timeframe: string;
        path: string;
        capturedAt: number;
    }>;

    validatedZones: any[];                // VLM-confirmed zones from charts tool
    errors: PipelineError[];              // Accumulated errors
    setupCounter: number;                 // Running counter for setup IDs
    manualStepOutputs: Record<string, any>;  // Outputs from manual steps A-D
}
```

**How `ensureContext()` works:**
```typescript
function ensureContext(weekStart: string): PipelineRunContext {
    if (!currentRun || currentRun.weekStart !== weekStart) {
        // Either no context exists, OR the weekStart changed (different week)
        currentRun = {
            weekStart,
            temporalAnchor: computeTemporalAnchor(weekStart),
            harvestData: null,
            zoneMapSnapshot: null,
            shapeSnapshot: null,
            screenshots: [],
            validatedZones: [],
            errors: [],
            setupCounter: 0,
            manualStepOutputs: {},
            startedAt: Date.now(),
        };
    }
    return currentRun;
}
```

**Lifecycle:**
1. Tool 1 (harvest) calls `ensureContext(weekStart)` → creates context, stores `harvestData`
2. Tool 2 (zones) calls `ensureContext(weekStart)` → same context, reads `harvestData`, stores `zoneMapSnapshot`
3. Tool 3 (shapes) calls `ensureContext(weekStart)` → same context, reads `zoneMapSnapshot`, stores `shapeSnapshot`
4. Tool 4 (charts) calls `ensureContext(weekStart)` → same context, reads everything, stores `screenshots` and `validatedZones`
5. Tool 5 (setups) calls `ensureContext(weekStart)` → same context, reads everything, generates setups. Calls `resetContext()` at end → sets `currentRun = null`

**If context is lost** (module reloaded, process restarted): `currentRun` is null. Next `ensureContext()` call creates a fresh context with all null phase outputs. The zones tool would fail because `ctx.harvestData` is null. The agent would need to re-run Tool 1 first.

### 3.3 Tool 1: plutus-pipeline-harvest

**Purpose:** Fetch OHLC data and options information for the target week.

**Input arguments:**
```typescript
{
    weekStart: string  // ISO date "2026-07-06" (must be a Monday)
}
```

**Execution sequence:**
1. Calls `ensureContext(args.weekStart)` to get or create the pipeline context
2. Resets the browse screenshot circuit breaker counter (`browseScreenshotAttempts = 0`)
3. Constructs the Python command: `python3 /root/scripts/tv_fetch_ohlc.py` with arguments for each pair and timeframe
4. Executes via `execFile('python3', [...], { timeout: 120_000, maxBuffer: 50 * 1024 * 1024 })`
5. Parses JSON output containing OHLC bars for each pair and timeframe
6. Filters 4H bars by temporal anchor (`b.timestamp <= temporalAnchor + 60_000`) — only uses complete bars
7. LTF bars (1H, 15m) are NOT filtered by temporal anchor — they represent current market structure
8. Extracts spot prices from the last bar's close for each pair
9. Computes the options date link (investinglive.com URL for the Friday of that week)

**Data stored in context:**
```typescript
ctx.harvestData = {
    ohlc: { 'DXY': [...4H bars...], 'EUR/USD': [...], ... },
    ohlcByPairTf: {
        'DXY': { '4H': [...], '1H': [...], '15m': [...] },
        'EUR/USD': { '4H': [...], '1H': [...], '15m': [...] },
        ...
    },
    spots: { 'DXY': 100.50, 'EUR/USD': 1.0850, ... },
    optionsDateLink: { url: 'https://...', fridayIso: '2026-07-10' }
};
```

**Returns to agent:**
```json
{
    "status": "success",
    "barsHarvested": 1875,
    "optionsDateLink": { "url": "https://investinglive.com/archive/july-10-2026" },
    "nextStep": "MANUAL STEP A: Navigate to the options URL. Screenshot the options table image. Extract pair, strike, notional for each row. Then call plutus-pipeline-zones with optionsData."
}
```

**What the agent does between Tool 1 and Tool 2 (Manual Step A):**
The agent uses MCP tv-browser tools (or plutus-browse-screenshot) to:
1. Navigate to the options URL from `optionsDateLink.url`
2. Wait for the page to render
3. Take a screenshot of the options table
4. Analyze the screenshot (either via VLM/omni-vision or by reading the image directly)
5. Extract structured options data: pair, strike price, notional value for each row
6. Call Tool 2 with this options data

### 3.4 Tool 2: plutus-pipeline-zones

**Purpose:** Construct Engine 1 zone maps (IP zones, S/D zones, LQZ zones) from harvested OHLC data and options data.

**Input arguments:**
```typescript
{
    weekStart: string,
    optionsData: Array<{
        pair: string,
        strike: number,
        sourceScreenshot: string,  // MUST be a real file path that exists on disk
        notional?: number,
    }>
}
```

**3-Layer Firewall (before tool logic executes):**

*Layer 1 — File Existence:*
```typescript
import { access } from 'node:fs/promises';
try {
    await access(args.optionsData[0].sourceScreenshot);
} catch {
    return { status: 'BLOCKED', error: 'Screenshot file does not exist...' };
}
```
Uses `fs.access()` which cannot be bypassed by the agent. If the file doesn't exist on disk, the tool returns BLOCKED.

*Layer 2 — Semantic Content Verification (Vision):*
```typescript
if (sdkClient) {
    const imgData = await readFile(args.optionsData[0].sourceScreenshot);
    const b64 = imgData.toString('base64');
    const visSession = await sdkClient.session.create({ body: { title: 'firewall-options-check' } });
    const visResult = await sdkClient.prompt({
        id: visSession.id,
        body: { parts: [
            { type: 'text', text: 'Does this image contain an FX options expiry table with strike prices and notional values? Answer YES or NO only.' },
            { type: 'file', mime: 'image/png', url: `data:image/png;base64,${b64}` },
        ]},
    });
    if (!visionAnswer.toUpperCase().includes('YES')) {
        return { status: 'BLOCKED', error: 'SEMANTIC FIREWALL: Screenshot does not contain an options table...' };
    }
}
```
Sends the image to the MiMo model via the SDK client. The model sees the image WITH the Plutus system prompt (trading expertise). If the model says "NO", the tool returns BLOCKED. This prevents the agent from passing a screenshot of the wrong page (footer, navigation bar, blank page).

*Layer 3 — Format Validation:*
```typescript
const hasPriceRefs = /\d+\.\d{3,}/.test(item.visualEvidence);
const GENERIC_PATTERNS = ['zone confirmed', 'order block', 'valid zone', 'looks good', 'confirmed zone', 'validated'];
const isGeneric = GENERIC_PATTERNS.some(p => evidence === p || evidence.length < 20);
```
Requires price references (numbers with 3+ decimal places like "1.0852") and rejects generic strings shorter than 20 characters.

**Tool Execution (after firewall passes):**

For each pair (DXY processed FIRST):
1. Retrieve 4H bars from `ctx.harvestData.ohlc[pair]`
2. Call `pillarEngine(input)` — executes all 9 pillars, produces pillar levels
3. Call `construct4HZones(bars4H, '4H')` — constructs 4H S/D zones from singular origin candles
4. Call `detectLiquidityZones(pair, bars, 120)` — detects LQZ from candlestick patterns. **CRITICAL BUG: Currently receives 4H bars instead of 1H bars.** The LQZ detector is calibrated for 1H candlestick patterns. Every threshold is miscalibrated when applied to 4H bars. The fix: use `ctx.harvestData.ohlcByPairTf[pair]['1H']` instead of `ctx.harvestData.ohlc[pair]`.
5. **CRITICAL BUG: `mergeLqzWithIpZones()` is imported but NEVER CALLED.** Instead of merging LQZ into IP zones (which would boost confluence +2, reduce ZFP -5, raise liquidityScore), the pipeline naively concatenates: `[...pillarZones, ...sdZones, ...lqzZones]`. The fix: call `mergeLqzWithIpZones(allZones, lqzResult, pair)`.
6. Store zone map in context: `ctx.zoneMapSnapshot = { zones, spots, version: 4, timestamp }`

**Returns to agent:** Zone map data (typically 500-823 zones per pair) + `nextStep: "MANUAL STEP B: Review zone map textually..."`

### 3.5 Tool 3: plutus-pipeline-shapes

**Purpose:** Compute Engine 2 shape chains from Engine 1 zone maps.

**Input:** `{ weekStart, manualStepB output }`

**Firewall:** Verifies Manual Step B was performed (agent reviewed the zone map).

**Execution:**
1. Reads `ctx.zoneMapSnapshot`
2. Curates zones: filters to confluence ≥ 2, sorts by confluence descending, caps at top 20 per pair (reduces noise from 500+ zones)
3. Calls `ShapeBrain.compute()` which:
   - Identifies current shape using the Shape Classification Decision Matrix
   - Applies ZFP-Conditioned Transition Rules to build the chain
   - Performs day-level decomposition (Mon-Fri) with Trading Speed Rule (+1 day)
   - Detects consolidation phase (EARLY/MID/LATE/DIRECTIONAL/RESOLUTION)
   - Constructs alternative chain around Decision Zones
4. Stores `ctx.shapeSnapshot`

**Returns:** Shape predictions for each pair with day-by-day breakdown + `nextStep: "MANUAL STEP C: Review shapes..."`

### 3.6 Tool 4: plutus-pipeline-charts

**Purpose:** Navigate TradingView charts, draw zones, capture screenshots, and perform VLM analysis.

**Input:** `{ weekStart, manualStepC output }`

**Firewall:** Verifies Manual Step C was performed.

**Execution:**
1. For each pair and timeframe (4H, 1H, 30m, 15m):
   - Navigate to TradingView chart for the pair
   - Set the timeframe
   - Draw Engine 1 zones as rectangles on the chart
   - Capture screenshot
2. VLM Analysis via SDK client:
   - Send each pair's 4H screenshot to MiMo with a structured prompt asking for supply/demand/liquidity zones
   - Split into TWO prompts (one for supply zones, one for demand zones) — a single prompt causes the model to focus on one side and miss the other
   - Parse pipe-delimited response: `ZONE|type|top|bottom|timeframe|classification|confidence|evidence`
3. Map visual zones onto Engine 1 IP zones
4. Store screenshots and validated zones in context

**Returns:** Screenshots + validatedZones + `nextStep: "MANUAL STEP D: Analyze screenshots..."`

**VLM Prompt Structure:**
```
You are PLUTUS TTE, a trading expert with 37 fundamental laws.
Analyze this {PAIR} chart. Identify ALL supply, demand, and liquidity zones near current price.

For each zone, write EXACTLY this format (one per line):
ZONE|type|top|bottom|timeframe|classification|confidence|evidence

Where:
- type: SUPPLY or DEMAND or LIQUIDITY
- top/bottom: exact price levels
- timeframe: 4H, 1H, 30m, or 15m
- classification: BoM or MoM
- confidence: 0-100
- evidence: specific candlestick pattern (order block, wick cluster, FVG, tight consolidation)

List at least 5 zones. Focus on zones within 100 pips of current price.
```

**VLM Response Parsing:**
```typescript
const zoneLines = vlmText.split('\n').filter(l => l.startsWith('ZONE|'));
for (const line of zoneLines) {
    const parts = line.split('|');
    if (parts.length >= 7) {
        validatedZones.push({
            pair,
            type: parts[1].trim().toUpperCase(),
            top: parseFloat(parts[2]),
            bottom: parseFloat(parts[3]),
            timeframe: parts[4].trim() || '4H',
            classification: parts[5].trim() || 'MoM',
            source: 'VLM_CONFIRMED',
            confidence: parseFloat(parts[6]) || 60,
            visualEvidence: parts[7]?.trim() || 'VLM identified zone',
            sourceScreenshot: screenshotPath,
        });
    }
}
```

**Fallback (when VLM doesn't produce structured zones):**
If the VLM analysis returns null or produces insufficient zones, the pipeline creates fallback zones from Engine 1 data:
```typescript
const pairZones = ctx.zoneMapSnapshot.zones.filter(zz =>
    zz.id?.startsWith(pair.replace('/', '').toLowerCase()) ||
    zz.zoneName?.includes(pair)
);
for (const zz of pairZones.slice(0, 5)) {
    validatedZones.push({
        pair,
        type: zz.ceiling > spot ? 'SUPPLY' : 'DEMAND',
        top: zz.ceiling,
        bottom: zz.floor,
        source: 'FALLBACK_IP_EDGE',
        confidence: 60,
        // ...
    });
}
```

### 3.7 Tool 5: plutus-pipeline-setups

**Purpose:** Generate final trade setups from validated zones.

**Input:**
```typescript
{
    weekStart: string,
    validatedZones: Array<{
        pair: string,
        type: 'SUPPLY' | 'DEMAND' | 'LIQUIDITY',
        top: number,
        bottom: number,
        timeframe: '4H' | '1H' | '30m' | '15m',
        sourceScreenshot: string,    // MUST exist, MUST be ≥ 5 chars
        visualEvidence: string,      // MUST be ≥ 20 chars, MUST contain price references
    }>  // MINIMUM 3 zones required
}
```

**Firewall (3 layers):**
1. File existence: `fs.access(vz.sourceScreenshot)` for each zone
2. Price reference regex: `/\d+\.\d{3,}/.test(vz.visualEvidence)`
3. Generic string rejection: evidence must be ≥ 20 chars and not match generic patterns

**Execution:**
1. Validates Manual Step D output (minimum 3 VLM_CONFIRMED or VLM_NEW zones)
2. Supplements validated zones with Engine 1 IP zones for TP targeting (finds opposing zones for each validated zone)
3. Calls `VisualSetupGenerator.generateSetups()` which:
   - For each day in shape chain:
     - For each eligible validated zone:
       - For each category valid for that day's shape:
         - Resolves direction (per-zone: supply→SHORT, demand→LONG)
         - Computes 3-entry staggered
         - Computes SL at next zone + buffer
         - Computes single TP at opposing S/D with LQZ overlap
         - Scores confidence
         - Classifies quality
         - Applies 7 rejection gates
         - If passes: creates TradeSetup
4. Calls `resetContext()` — clears module-level state

**Returns:** Final setups array + report path

### 3.8 Additional Pipeline Tools

**plutus-browse-screenshot:** Browser navigation helper with circuit breaker (max 3 attempts before suggesting to skip the step). Hardcodes port 9228 (does not match running container on 6930 — TvChartController legacy port). Validates screenshot file exists (>1KB), checks content type. Returns screenshot path + OCR text if available.

**plutus-backtest-setups:** Full backtest implementation. Takes `{ weekStart, setups: [{ setupId, pair, direction, entry, sl, tp, day }] }`. Fetches 1H bars via tvDatafeed Python script for each unique pair. For each setup: filters bars to the setup's day, checks if entry was triggered (LONG: `bar.low <= entry`, SHORT: `bar.high >= entry`), scans forward from entry bar through rest of week for TP/SL hit order. Returns win rate, total pips, per-setup results with WIN/LOSS/NOT_TRIGGERED determination.

**plutus-omni-vision:** VLM image analysis tool. Takes `{ file_path, prompt }`, reads image as base64, sends to SDK client. Has an after-hook (`plutusOmniVisionAfterHook`) that modifies tool output to inject explicit tool call directives for batch processing of multiple images.

**plutus-status:** Returns engine version, pipeline architecture description, and complete tool list.

### 3.9 The SDK Client Bridge

The SDK client bridge (`setSdkClient(input.client)`) is the mechanism that enables pipeline tools to perform VLM analysis. When the plugin loads, `input.client` (the opencode SDK client) is passed to the pipeline engine module:

```typescript
// In index.ts:
const { createPipeline4Tools, setSdkClient } = await import('./pipeline/engine.js');
setSdkClient(input.client);
```

This bridges the opencode SDK client so any pipeline tool can invoke the model for VLM analysis. When a tool calls `sdkClient.prompt()`, it creates a new inference request that includes:
- The system prompt (Plutus identity + 37 laws + trading methodology)
- The screenshot image (as base64 data URI)
- The text prompt (zone analysis instructions)

The model sees the image WITH full trading expertise context. However, the model does NOT see the current conversation history or accumulated pipeline reasoning — it's a separate inference call, not inline in the agent's reasoning chain. The analysis text flows back to the primary agent as tool output.

**Known limitation:** The fully-correct approach would have the agent view images directly in its primary context (via the `read` tool, which can display images to multimodal models). The SDK bridge creates a separate inference that lacks conversation context. The T1_MULTI_TOOL_CHAIN_PIPELINE.md describes this as the intended evolution path.

---

## PART 4: ENGINE 1 — ZONE CONSTRUCTION

*This section documents the CANON specification from the v5.3.3 system prompt. Engine 1 and Engine 2 must match this specification with ZERO deviation. The code should reflect this exact infrastructure.*

### 4.1 Purpose and Philosophy

Engine 1 answers three fundamental questions about the market: **WHAT institutional pressure exists, WHY it exists, and HOW strong is it.**

It maps Institutional Pressure (IP) zones — the price levels where significant institutional orders are resting. It classifies each zone by its origin (BoM vs MoM), its freshness (unmitigated vs depleted), its strength (confluence score), and its likelihood of failure (ZFP). It determines which zones are REAL (multi-dimensional confluence), which ones have JUICE LEFT (low reaction count), and which ones are ABOUT TO FAIL (high ZFP).

The fundamental premise of Engine 1 is that price levels are not random — they are the physical manifestation of institutional order flow. Banks, hedge funds, sovereign wealth funds, and central banks place orders at specific price levels for specific reasons (delta hedging, accumulation, distribution, defense). Engine 1 reverse-engineers WHERE these orders sit by analyzing nine independent types of market evidence.

### 4.2 The 6 Dimensions of Independence

Each zone is scored across 6 independent dimensions. Each dimension captures a FUNDAMENTALLY DIFFERENT TYPE of market evidence — they are not redundant, not correlated by design, and each must be gathered separately. When multiple dimensions CONVERGE on the same price level, the convergence is MEANINGFUL because it was not guaranteed.

**Dimension 1: Technical (Price-Derived Mathematics)**
This dimension captures levels derived from mathematical geometry of recent price action — pivot points, moving averages. These levels exist because algorithmic trading systems across thousands of desks are coded to react at these exact calculations. The pivot formulas become self-fulfilling prophecies through collective algorithmic behavior. A pivot level at 98.50 exists because the math of the prior week's H, L, C projects resistance there — and enough algorithms are programmed to sell at that projection that it becomes real resistance.
- 2 points: Exact match within 3 pips
- 1 point: Zone match within 10 pips
- 0 points: No match

**Dimension 2: Options-Derived (Contractual Positioning)**
This dimension captures levels derived from contractual obligations — OTC option strikes. When a bank sells a EUR call option at strike 1.0850, they MUST delta-hedge by buying EUR/USD spot as price approaches the strike. This hedging IS the magnetic pull — the bank's contractual obligation creates forced buying at a specific level. A €2B option strike creates €2 billion in delta-hedging flow — enough to actively PIN price in a tight range (the "NY Cut Cage Effect" before 10 AM) or cause violent breakouts (the "Spring Release" at 10:01 AM when hedging constraints vanish).
- 2 points: Critical Option Wall (≥$1.5B notional)
- 1 point: Significant Magnet ($850M-$1.499B)
- 0 points: No positioning data

**Dimension 3: Analyst Consensus (Published Intelligence)**
This dimension captures levels published by institutional research desks. When ING publishes "DXY support at 98.00," they almost certainly have CLIENT ORDERS at 98.00 — that is WHY they are calling it support. Published levels are PUBLIC SIGNALS of PRIVATE institutional positioning. Tier 1 sources (ING, forex.com) have direct institutional client access — their published levels reflect real institutional intent because their clients ARE the institutions.
- 2 points: 2+ Tier-1 sources agree
- 1 point: 1 source identifies
- 0 points: No coverage

**Dimension 4: Structural (Microstructure Memory)**
This dimension captures levels derived from historical price structure — prior swing highs/lows, order blocks, rejection wicks. Price REMEMBERS where it was defended. A swing low with a rejection wick is forensic evidence of institutional buying — the wick proves buyers pushed price BACK UP, meaning they were actively defending. When price returns to this level, the same institutional memory activates. The Structural Extreme Bonus (+2 max) recognizes extraordinary structural events: Confluent Floor/Ceiling (swing extreme inside HTF order block), Repeated Extreme Magnets (same level hit on 2+ dates), and Role Reversals (support becoming resistance).
- 2 points: Exact anchor + structural extreme
- 1 point: Proximity to anchor/extreme
- 0 points: No structural event

**Dimension 5: Psychological (Behavioral Patterns)**
This dimension captures levels where human psychology creates order clusters. Round numbers (.00, .50) are cognitive anchors — humans think in whole and half numbers, so institutional orders cluster at these levels. .25 and .75 are secondary anchors (quarter divisions). When a Fibonacci level aligns with a round number, the confluence amplifies — both the algorithmic (Fib) and psychological (round number) order clusters reinforce each other.
- 2 points: Major big figure (.00, .50)
- 1 point: Quarter figure (.25, .75)
- 0 points: No round number

**Dimension 6: Regime/Dynamic (Macro Forces)**
This dimension captures the current market regime and how it affects zone behavior. In consolidation regime, zones tend to hold (price oscillates between them). In momentum regime, zones may hold or fail depending on directional pressure. In breakout regime, zones are likely to fail (price is actively breaking through them). This dimension provides the MACRO CONTEXT that determines whether zones are likely to hold or break.
- 2 points: Zone in consolidation (will hold)
- 1 point: Zone in momentum (may hold/fail)
- 0 points: Zone in breakout (likely to fail)

**Mathematical justification for 0-2 per dimension:** No single dimension can dominate. Even at maximum 2/2, one dimension contributes at most 2/12 = 16.7% of the base score. To reach EXTREME (12/12), at least 6 independent dimensions must agree. This forces MULTI-DIMENSIONAL CONFLUENCE — a level must be confirmed across many independent evidence types. The 0-1-2 scale (none/weak/strong) provides enough resolution to distinguish quality within each dimension without false precision.

### 4.3 Pillar 1: Multi-Timeframe Pivot Engine

**The single most powerful pillar. Independently captures 8/11 verified institutional levels.**

**Data consumed:**
- Prior week DXY High, Low, Close (from TradingView)
- Prior day DXY H, L, C for each of the last 5 trading days
- Historical weekly OHLC for the last 4-8 weeks (extended structural pivots)
- Any prior week where DXY traded near the current range (back up to 4 months)

**Computation — Three Pivot Variants × Multiple Timeframes:**

The pillar computes three different pivot formulas across two timeframes (weekly and daily), producing 6 complete pivot sets containing 42 calculated levels. The three variants exist because no single formula captures all market behavior.

*Classic Pivots (PP-based geometry):*
```
PP = (H + L + C) / 3       ← "Fair Value" — the gravitational center
R1 = 2×PP - L              ← First resistance (derived from Low)
S1 = 2×PP - H              ← First support (derived from High)
R2 = PP + (H - L)          ← Second resistance (full range projection)
S2 = PP - (H - L)          ← Second support
R3 = H + 2×(PP - L)        ← Third resistance (extended)
S3 = L - 2×(H - PP)        ← Third support (extended)
```

Classic pivots are **ASYMMETRIC by design**. R1-PP ≠ PP-S1 because R1 is derived from L while S1 is derived from H, and H and L are asymmetric relative to PP. This asymmetry is a FEATURE, not a bug — it reflects the natural asymmetry of price action where resistance and support distances from fair value are rarely equal.

**Mandatory verification checks for Classic pivots:**
- Formula check: R1 + L = 2×PP (must be exactly true)
- Sanity check: R1 > PP > S1; R2 > R1 > PP; S1 > S2 > S3
- Range consistency: Classic R2-S2 = 2×(H-L)

*Fibonacci Pivots (Harmonic ratios):*
```
PP = (H + L + C) / 3
R1 = PP + 0.382×(H-L)     ← 38.2% retracement projected as resistance
S1 = PP - 0.382×(H-L)
R2 = PP + 0.618×(H-L)     ← 61.8% (golden ratio) projected as resistance
S2 = PP - 0.618×(H-L)
R3 = PP + 1.000×(H-L)     ← 100% projection
S3 = PP - 1.000×(H-L)
```

Fibonacci pivots are **SYMMETRIC** — R1-PP = PP-S1 = 0.382×(H-L). The symmetry check is mandatory: if R1-PP ≠ PP-S1, the calculation is wrong. These embed natural harmonic ratios (phi = 1.618, derived from the Fibonacci sequence) that appear throughout natural systems and were adopted by traders because they produce visually pleasing and empirically useful retracement levels.

*Camarilla Pivots (Close-anchored intraday):*
```
R4 = C + (H-L)×1.1/2      ← Maximum extension
S4 = C - (H-L)×1.1/2
R3 = C + (H-L)×1.1/4
S3 = C - (H-L)×1.1/4
R2 = C + (H-L)×1.1/6
S2 = C - (H-L)×1.1/6
R1 = C + (H-L)×1.1/12     ← Tightest level
S1 = C - (H-L)×1.1/12
```

Camarilla pivots are **C-CENTRIC** — they use the Close as the anchor rather than PP. This produces tighter intraday levels that capture reversion-to-mean behavior. The 1.1 multiplier is a empirical constant. The invariant R4-S4 = (H-L)×1.1 must hold.

**Verification: invariant R4-S4 = (H-L)×1.1**

**Timeframe coverage:**
- Weekly timeframe: 3 variants × 7 levels = 21 levels from prior week
- Daily timeframe: 3 variants × 3 trading days × 7 levels = 63 levels from last 3 days
- Historical weeks (if range overlaps): additional 21 levels per week, with +0.5 legacy bonus

**Scoring:**
- Exact match within 3 pips: **2 points** (Technical dimension)
- Zone match within 10 pips: **1 point**
- Historical legacy match: **+0.5 bonus**

**First-principles reasoning — WHY this pillar exists:**
Pivots represent the mathematical memory of recent institutional equilibrium. The H, L, C of the prior week are the three reference points where buyers and sellers found balance. PP is "fair value" — the gravitational center. R1-R3 project resistance levels calculated from the prior range geometry. These levels become institutional magnets because algorithmic trading systems across thousands of desks are coded to react at these exact calculations — the pivot formulas become self-fulfilling prophecies through collective algorithmic behavior.

Three variants exist because no single formula captures all market behavior. Classic captures symmetric PP-based geometry. Fibonacci embeds natural harmonic ratios. Camarilla captures Close-anchored intraday retracement potential. Computing across BOTH weekly and daily timeframes captures two scales of institutional memory simultaneously — the weekly PP reflects the prior week's institutional equilibrium, while daily PPs from the last 3 days capture the most recent intraday shifts.

The 3-pip threshold for exact match is tight enough to distinguish real confluence from coincidence (if two independent calculations land within 3 pips of each other, it's unlikely to be chance). The 10-pip zone match is loose enough to capture nearby institutional interest without being so wide that every level matches.

**What would go WRONG if this pillar was removed:**
You lose the foundational reference grid. Every other pillar produces levels that must be matched against SOMETHING — pivots are that reference frame. Without them, confluence scoring has no baseline dimension for the Technical axis. The 8/11 level capture rate collapses. You would be left with options, analyst, and structural data with no mathematical geometry layer, making it impossible to distinguish a "real" zone (where multiple mathematical projections converge) from a single-source level.

**Cross-pillar interaction:**
The weekly pivot PP becomes a natural "equilibrium" anchor. If PP sits inside an option-derived zone (Pillar 8), the Technical and Options-Derived dimensions both score 2, creating a natural confluence cluster. The ZFP of that zone is LOWER because it has multi-dimensional support. A pivot level doesn't just contribute to the score — it positions the equilibrium that determines which zones are "above" and "below" current price, which affects the Regime/Dynamic dimension scoring.

### 4.4 Pillar 2: Moving Average Confluence Grid

**Independently captures 3-4/11 verified levels.**

**Data consumed:** EMA and SMA values for periods 9, 10, 20, 50, 100, 200 from TradingView technicals.

**Computation — MA Weighting System:**
The pillar detects confluence clusters where 3+ MAs converge within 0.15 DXY points. Each MA is weighted by its time horizon — longer MAs represent more institutional capital and get higher weights:

| MA Period | Weight | Rationale |
|-----------|--------|-----------|
| EMA/SMA 200 | 3.0 | Structural anchor — the bull/bear separator. Represents ~10 months of price history. Positions held by pension funds, sovereign wealth, macro funds. |
| EMA/SMA 100 | 2.0 | Long-term trend — ~5 months of price history. Hedge fund and prop desk positioning. |
| EMA/SMA 50 | 1.5 | Institutional position builder — ~2.5 months. Where institutions build medium-term positions. |
| EMA/SMA 20 | 1.0 | Smart money average — ~1 month. The "institutional consensus" for the current month. |
| EMA 9/10 | 0.5 | Short-term momentum — ~1-2 weeks. Intraday/short-term trader positioning. |

**Recapture Detection:**
If price crossed above a major MA (50, 100, 200) within the last 3 sessions, the MA is flagged as a **RECAPTURE ZONE** with a +2 bonus. This is because when price recently crossed ABOVE a major MA, that MA just transitioned from RESISTANCE to SUPPORT. The institutions who were underwater are now at breakeven/profitable, and they will defend this level aggressively to protect their newly profitable positions. A recaptured MA becomes the MOST IMPORTANT support.

**Cluster Detection:**
- Triple+ cluster (3+ MAs within 0.15 DXY): 2 points (Technical dimension)
- Double cluster (2 MAs within 0.15 DXY): 1 point
- Single MA: 0.5 points

**First-principles reasoning — WHY MAs matter:**
Moving averages represent the AVERAGE ENTRY COST of institutional holders across different time horizons. MA 200 = the average cost basis of positions held over 200 days. These are LONG-TERM institutional positions — pension funds, sovereign wealth, macro funds — who hold for months. MA 50 = average cost of medium-term positions (hedge funds, prop desks). MA 20 = average cost of short-term smart money. MA 9/10 = short-term momentum traders.

When multiple MAs converge at the same price, MULTIPLE TIME HORIZONS of buyers/sellers have their cost basis clustered there. This creates an extraordinarily high reaction probability because each cohort will defend their breakeven. A fund that has held a position for 200 days will defend its average entry price aggressively. A hedge fund that built a position over 50 days will do the same. When BOTH have the same cost basis (MA 200 and MA 50 converge), the defense is TWICE as strong — two independent populations of market participants defending the same level.

The weight hierarchy (200=3.0 down to 9=0.5) reflects how much CAPITAL is tied to each timeframe. Longer MAs = more institutional capital = more defensive behavior when tested.

The Recapture bonus exists because the transition from resistance to support is psychologically and mechanically significant. When price crosses above MA 200, every institutional long position that was held below MA 200 (underwater) is suddenly at breakeven. These institutions will defend MA 200 aggressively — they finally have a chance to exit at no loss. This creates an extremely strong support level that didn't exist before the cross.

**What would go WRONG if removed:**
You lose the "average cost" map. Price levels become abstract numbers with no connection to where institutional capital actually sits. You would not know whether a zone at 98.50 has the 200-day MA beneath it (strong support from long-term holders) or above it (resistance from underwater longs). Every entry decision would be blind to the institutional cost-basis landscape.

### 4.5 Pillar 3: Component Pair Option Expiry Conversion

Converts major option expiry strikes from DXY component pairs into DXY equivalents. For non-EUR/USD pairs, this pillar is PRIMARY. For EUR/USD, it is SECONDARY (feeds into Pillar 8).

**Data consumed:**
- Protocol A OTC expiry strikes for all 6 DXY component pairs (EUR/USD, USD/JPY, GBP/USD, USD/CAD, USD/CHF, USD/SEK)
- Fed H.10 spot rates for all 6 pairs (5-day rolling rates)
- K factor computed from H.10 data

**Computation:**
For each LARGE expiry (≥$500M equivalent), calculate the DXY equivalent by holding all other 5 pairs at current spot and varying ONLY the pair with the expiry to its strike price:

```
DXY_equiv = 50.14348112 × strike_EURUSD^(-0.576) × spot_USDJPY^(0.136)
            × spot_GBPUSD^(-0.119) × spot_USDCAD^(0.091)
            × spot_USDSEK^(0.042) × spot_USDCHF^(0.036)
```

This produces the DXY level where that specific option wall exerts maximum magnetic pull. The computation is a partial derivative — by freezing the other 5 components at spot, we isolate ONE pair's effect on DXY.

**Three-Tier Classification (MANDATORY — applies to all option-derived data):**

| Tier | Notional | Classification | Default | Confluence Bonus |
|------|---------|---------------|---------|-----------------|
| 1 | ≥ $1.5B | CRITICAL OPTION WALL | INCLUDE — always | +3 |
| 2 | $850M – $1.499B | SIGNIFICANT MAGNET | INCLUDE — always | +2 |
| 3 | < $850M | EXCLUDED | EXCLUDE from summary/zone maps | Override only with 3+ pillar confluence + Pillar 5 validation → +1 |

**CRITICAL: NOTIONALS ARE ALREADY IN BILLIONS. DO NOT DIVIDE BY 1000.**
A $1.5B option wall is represented as `1.5` in the data, NOT `1500` or `0.0015`. Dividing by 1000 would make every option wall fall below the $850M threshold, causing ALL options to be classified as EXCLUDED. This would silently disable the entire options layer — Pillar 3, Pillar 8, and the Options-Derived dimension would all score 0 for every zone. No error, no crash, just degraded confluence scores that look plausible but are 1000× too small.

**H.10 Fallback:** If Fed H.10 is missing component data for one or more pairs, search for supplementary spot rates. Confidence band widens: 1 pair supplementary = +0.03 DXY; 2 pairs = +0.07 DXY; 3+ pairs = Pillar 8 confidence degrades to LOW. NEVER fabricate a spot rate.

**First-principles reasoning — WHY options matter:**
Options create FORCED HEDGING BEHAVIOR through delta. When a bank sells a EUR call option at strike 1.0850 with €2B notional, they must delta-hedge by buying EUR/USD spot. The closer price gets to 1.0850, the higher the delta, the more spot they must buy. This creates a MAGNETIC PULL toward the strike — the bank's hedging IS the magnetism.

A CRITICAL OPTION WALL (≥$1.5B) means there is over $1.5 BILLION in delta-hedging flow — enough to actively PIN price in a tight horizontal range pre-10 AM NY. This is the "NY Cut Cage Effect" — price cannot move freely because the delta-hedging flow creates a gravitational well around the strike.

At 10:00 AM NY, the option contract expires (the "NY Cut"). At 10:01 AM, the dynamic hedging constraints are INSTANTLY REMOVED. The bank no longer needs to hedge — the option is gone. The magnetic pull vanishes. Price violently breaks out or reverses. This is the "Spring Release" — named because the price has been coiled like a spring by the hedging cage, and when the cage disappears, the spring releases violently.

The Spring Release effect is why option expiry DAYS matter more than option expiry LEVELS in isolation. A €2B strike that expires Monday at 10 AM creates a violent Monday morning move. A €2B strike that expires Friday creates a violent Friday morning move. The pipeline must track WHICH DAY options expire, not just WHERE they are.

**Confidence bands:** Tier 1 (≥1.5B EUR) = ±0.07 DXY. Tier 2 ($850M-$1.499B) = ±0.10. Tier 3 (<$850M overridden) = ±0.15. Smaller options have less delta-hedging flow, making the conversion less precise — the DXY level where the magnetic pull is felt has more uncertainty.

### 4.6 Pillar 4: Institutional Commentary Harvesting

**Data consumed:** Web search for DXY institutional commentary. Sources prioritized by tier.

**Source tiers:**
| Tier | Sources | Weight |
|------|---------|--------|
| 1 (Primary) | ING Economics, forex.com (Matt Weller CMT) | 3.0 |
| 2 (Secondary) | FXStreet, TradingView Community, VT Markets | 2.0 |
| 3 (Supplementary) | Continuum Economics, OneUpTrader | 1.0 |

**Computation:**
1. Execute 3 web searches with specific query patterns targeting DXY commentary
2. Extract ONLY explicit S/R levels — no inference from narrative text
3. Record exact source URL for every level (provenance tracking)
4. Classify each level by source tier
5. Flag levels appearing in 2+ independent Tier-1 sources as ANALYST CONSENSUS
6. Temporal boundary applies — only pre-boundary published commentary is valid

**Scoring:**
- 2+ Tier-1 sources agree: **2 points** (Analyst Consensus dimension)
- 1 source identifies: **1 point**
- No coverage: **0 points**

**First-principles reasoning — WHY analyst commentary matters:**
Bank desks publish research based on their PROPRIETARY ORDER FLOW knowledge. When ING publishes "DXY support at 98.00," they almost certainly have CLIENT ORDERS sitting at 98.00 — that is WHY they are calling it support. Their published levels are PUBLIC SIGNALS of PRIVATE institutional positioning. The research desk knows where their clients' orders sit because they ARE the broker — they see the order book.

Tier 1 sources have direct institutional client access — their published levels reflect real institutional intent because their clients are the institutions. ING has billions in client flow; their analysts see where stops and limits cluster. forex.com (Matt Weller CMT) is one of the most followed FX analysts globally; his levels become self-fulfilling as thousands of retail and institutional traders react to them.

Multiple Tier-1 agreement = high probability of REAL institutional positioning because two independent desks with different client bases are both identifying the same level. This is genuine intelligence convergence, not herding. Herding would be Tier 2/3 sources copying each other — which is why only Tier-1 agreement scores 2 points.

The temporal boundary is critical because analyst commentary published AFTER the week starts may reflect in-week price action, which is forbidden by the Temporal Boundary Rule. The pipeline must only use commentary published before the Friday 5:00 PM ET close of the prior week.

**What would go WRONG if removed:**
You lose the human intelligence layer. Mathematical levels exist without context — you would not know whether an institution is defending a specific level due to an internal mandate, a central bank instruction, or a client order. The Analyst Consensus dimension would be empty, reducing every zone's maximum possible score by 2 points and eliminating an entire independent evidence axis.

### 4.7 Pillar 5: Structural Extreme Scan, Price Anchors & Liquidity Engineering

This is the most complex pillar with MANDATORY pre-computation steps that run BEFORE all other Pillar 5 steps. It has 6 sub-steps (Step 0, 0.45, 0.5, 0.6, 0f, and Steps 1-5) that systematically extract every form of structural evidence from historical price data.

**ANTI-SLOP RULE:** FORBIDDEN from estimating behavioral ranges. Every floor/ceiling level MUST come from exact, date-stamped, verifiable historical price data. No "approximately," no "around," no estimation.

**Step 0: 90-Day Structural Extreme Scan (MANDATORY — RUN FIRST)**

*0a: Retrieve 90 days DXY daily (D1) OHLC.*
**180-DAY CONDITIONAL EXTENSION:** If current DXY range overlaps with 90-180 days ago (within 1.0 DXY points), extend scan to 180 days. Prior swing levels from the extended scan get +0.5 Legacy Bonus because they represent institutional memory from a previous trading cycle that is still relevant.

*0b: Identify Swing Lows with Rejection Wicks.*
Criteria: Lower wick ≥ 0.15 DXY points AND close in upper 50% of daily range.
Tag as "Liquidity Sweep Target."
Reasoning: A long lower wick with a close in the upper half proves buyers pushed price BACK UP from the low — they were actively defending. The 0.15 DXY threshold is significant enough to indicate REAL rejection (not just noise — a wick smaller than 0.15 could be random spread). The "close in upper 50%" confirms the rejection was SUSTAINED.

*0c: Identify Swing Highs with Rejection Wicks.*
Criteria: Upper wick ≥ 0.15 DXY points AND close in lower 50% of daily range.
Tag as "Supply Ceiling Target."
Reasoning: Mirror of 0b for supply. Sellers defended the high.

*0d: Identify HTF Order Blocks (4H/D1 Demand/Supply Zones).*
- **Demand Zones:** Base of 1-3 consecutive bullish candles with large bodies preceding a rally of ≥ 1.0 DXY points lasting ≥ 5 trading days. Record as [Low of base, High of base].
- **Supply Zones:** Top of 1-3 consecutive bearish candles preceding a decline of ≥ 1.0 DXY points lasting ≥ 5 trading days.
- **High-Conviction tag:** Move ≥ 2.0 DXY points AND ≥ 10 trading days.
Reasoning: These are institutional ACCUMULATION bases — where large positions were quietly built before the move launched. The 1-3 candle base represents stealth accumulation. The ≥ 1.0 DXY point rally proves the accumulation was significant. The ≥ 5 trading days duration proves it wasn't a random spike.

*0e: Cross-Reference Swing Extremes with Order Blocks.*
- Swing low inside Demand Zone → flag as **"Confluent Floor"** — the highest structural confidence for support. Gets Structural dimension score 2 + Structural Extreme Bonus +2.0.
- Swing high inside Supply Zone → flag as **"Confluent Ceiling"** — highest for resistance. Same bonus.
Reasoning: When a swing extreme (price memory) overlaps with an order block (institutional accumulation), you have TWO independent pieces of evidence converging: (1) price reacted violently at this level (the wick), and (2) institutions accumulated positions here (the order block base). This double-confirmation is the strongest possible structural evidence.

**Step 0.45: Dedicated LSZ (Liquidity Sweep Zone) Scan (MANDATORY)**

*0.45a:* For each swing low, record as "LSZ: [exact low] to [exact low + 0.05]" — extends 0.05 ABOVE the exact low.
*0.45b:* For each swing high, record as "LSZ: [exact high - 0.05] to [exact high]" — extends 0.05 BELOW the exact high.
*0.45c:* Scan for LIQUIDITY GAPS ≥ 0.15 DXY points between adjacent IP zones with NO structural level. Check for 4H swing extreme or 4H BoM zone. Flag as "Hidden Liquidity Zone."
*0.45d:* Cross-reference with 4H BoM zones. Overlap = "CONFLUENT LIQUIDITY SWEEP + BoM ZONE" — HIGHEST PRIORITY for trade construction.
*0.45e:* Any LSZ within 0.30 DXY points of current spot → flag as "ACTIVE SL TRIGGER."

**Step 0.45a: LSZ Bottom Edge Extension (v5.0.0):**
Extend sweep scan 0.05-0.10 DXY below swing highs and above swing lows. Institutions often sweep 0.05-0.10 beyond the visible extreme before reversing. This captures the institutional STOP HUNT ZONE — where retail stop-losses cluster just beyond visible extremes. Retail traders typically place stops 3-5 pips beyond visible swing levels. Institutions know this and push price into those stops to fill their own large orders at better prices. The 0.05 extension (≈5 pips on EUR/USD) captures this sweep zone. Some sweeps go deeper (0.10) when there is abundant stop liquidity.

**Step 0.5: Repeated Extreme Magnet Detection (MANDATORY — AFTER Step 0)**

*0.5a:* Scan for price levels appearing on 2+ separate dates. Threshold: within 0.05 DXY of each other. Also check for role reversal (swing low coincides with prior swing high).
*0.5b:* Tag as "Repeated Extreme Magnet" with exact price (average weighted by wick size), dates, type, occurrence count.
*0.5c: Confidence escalation:*
- 2 separate dates: HIGH confidence → +1.5 bonus
- 3+ separate dates: VERY HIGH → +2.0 bonus
- Role Reversal: EXTREME → +2.0 (independent of count)

*0.5d:* If Repeated Magnet inside HTF Order Block → tag as **"Institutional Magnet"** with maximum Structural dimension score.

**Reasoning:** Price levels that appear as swing extremes on MULTIPLE dates are levels where institutional algorithms are coded to repeatedly defend or test. Each occurrence strengthens the magnet. Role Reversal (support→resistance or vice versa) is especially powerful because the SAME liquidity pool is now fighting in the opposite direction — buyers who defended it as support are now sellers creating resistance.

**Step 0.6: Intra-Zone Key Level Scan (MANDATORY)**

For each IP zone with MODERATE+ pressure degree:
*0.6a:* Scan zone interior for: 1H demand/supply zones from prior 1-2 weeks, Fib retracements (0.382, 0.618) of the zone's own range, prior daily closes, round numbers (.00, .25, .50, .75).
*0.6b:* Tag as "Intra-Zone Precision Floor" (bottom 40%), "Precision Ceiling" (top 40%), or "Mid-Anchor" (middle 20%).
*0.6d:* Scoring: Structural dimension = 0.5.

**Step 0f: 4H Demand-Supply Zone Scan (MANDATORY)**

Data: 4H OHLC via tvDatafeed.

**SINGULAR CANDLE CONSTRUCTION RULE (ZERO TOLERANCE):**
Supply/Demand zones are constructed from the SINGLE candle immediately preceding a strong directional move (≥0.5 DXY points, ≥3 trading days). Zone range = [Low of origin candle, High of origin candle]. Date-stamp the origin candle.

This is the ORDER BLOCK concept from SMC (Smart Money Concepts). The candle before the explosive move is where institutions ACCUMULATED their positions. They entered SLOWLY, absorbing sell orders without moving the market (small body = stealth accumulation). Then they LAUNCHED the move (big impulse candle). The origin candle's [Low, High] range is the EXACT price band where institutional capital was deployed.

**Zone Classification:**

| Type | Description | Origin Candle Criteria |
|------|-------------|----------------------|
| BoM (Beginning of Move) | Zone at exact origin of directional move | Origin candle's prior move direction is NONE or OPPOSITE. This is the FIRST supply/demand in that direction. |
| MoM (Middle of Move) | Continuation zone formed DURING move | Origin candle's prior move direction is SAME as zone direction. Not at start — formed mid-move. |

**Body-to-wick ratio:** ≥ 3.0 for BoM classification. This means the body of the origin candle is at least 3× the size of its wicks. A large body relative to wicks indicates INSTITUTIONAL DISPLACEMENT — aggressive, visible move that alerts other participants. The ratio matters because it distinguishes stealth accumulation (small body — institutions hiding intent) from loud displacement (large body — institutions showing their hand).

**Origin body ratio:** ≥ 0.65 for BoM. The body must cover at least 65% of the candle's total range (body / (high - low) ≥ 0.65). This ensures the candle is institutionally sourced — a body this large was created by directional order flow, not random noise.

**Mitigation Level Tracking (Reaction Counter):**

| Count | Code | Strength | Expected Behavior |
|-------|------|----------|-------------------|
| 0 | 0X (BoM) / 0X (MoM) | Fortress | BoM: 100% reaction. MoM: DEATH ZONE |
| 1 | 1S | ~Unmitigated | Still very strong |
| 2 | 2S | Weakened | Context-dependent |
| 3 | 3X | Likely to fail | Expect failure |
| 4-5 | 4-5X | PARADOX if still holding | Extremely strong (fortress zone candidate) |

**CRITICAL HIERARCHY RULE:** Zone Type > Mitigation Level > Trend Context. An unmitigated MoM in an opposing trend is WEAKER than a 2X mitigated BoM.

**4H Zone Noise Rejection (exclude zone if ANY applies):**
- Zone wider than 0.40 DXY points
- MoM with 3X+ hard mitigations in opposing trend
- Zone from >3 weeks ago with no recent interaction
- Zone that doesn't overlap with any IP zone within 0.50 DXY points AND is not a BoM with 0X-1X mitigation

**Steps 1-5:** Price anchors from forex.com HWC/LWC (High Warning Call / Low Warning Call). Recapture phenomenon detection. Structural extreme memory. Key support band tightening (distinguishing Zone Core from Zone Spike).

**Step 5.5: Key Support Band Tightening:**
Distinguish Zone Core (range of candle bodies — primary support) from Zone Spike (wicks extending beyond core — secondary LSZ targets). Zone Core gets full score. Zone Spike gets half score, tagged as "LSZ extension." This prevents wick outliers from inflating the zone's perceived strength.

### 4.8 Pillar 6: Fibonacci Retracement & Round Number Grid

**Data consumed:** Prior week DXY range (H, L). Extended swing points for additional Fib levels.

**Computation:**
Fibonacci retracements from prior week range: 0.236, 0.382, 0.5, 0.618, 0.786, 1.0. These levels are projected from the prior week's High and Low.
Round number levels: .00, .25, .50, .75 big figures.

**Scoring:**
- Major big figure (.00, .50): **2 points** (Psychological dimension)
- Quarter figure (.25, .75): **1 point**
- No round number: 0 points
- Confluence bonus when Fib + round number align

**First-principles reasoning:**
Fibonacci levels are SELF-FULFILLING PROPHECIES — enough algorithmic trading systems use them that they create real order clusters at these ratios. 0.618 = 1/phi (golden ratio), which appears throughout natural systems. 0.382 = 1 - 0.618 (complement). These ratios were adopted by traders because they produce empirically useful retracement levels — price frequently reverses at these golden ratio divisions of the prior range.

Round numbers are PSYCHOLOGICAL ANCHORS — humans think in round numbers, so institutional orders cluster at 98.00, 98.50, 99.00. The .00 and .50 levels are the MOST psychologically significant (whole and half numbers — the strongest cognitive anchors). When a Fibonacci level aligns with a round number, the confluence amplifies — both the algorithmic (Fib) and psychological (round number) order clusters reinforce each other.

### 4.9 Pillar 7: Derivatives Arena Boundary Definition

**Data consumed:** ICE Futures US DXY EOD Report, CME QuikStrike API.

**Status:** BOTH sources are BLOCKED (CME returns 403, ICE is UNSTABLE). This pillar falls back to 9-Pillar primary mapping. It has NO dedicated scoring dimension.

**First-principles reasoning (if it were functional):**
Exchange-traded options (unlike OTC daily expiries) create LONG-TERM structural walls that remain valid ALL DAY, not just pre-10 AM. These represent multi-week or multi-month institutional positioning — pension funds, sovereign wealth, macro hedge funds building large positions through regulated exchanges. The OI clusters act as continuous spatial magnets that confirm Fibonacci 1.618 extensions.

**What goes WRONG:** Since both sources are blocked, the pillar contributes nothing. The system degrades gracefully because Pillar 7 was designed as supplementary zone awareness only — it feeds into the Options-Derived dimension redundantly with Pillars 3+8.

**Single point of failure:** The system has a hidden dependency on investinglive.com for OTC option data (Pillars 3 and 8). If investinglive.com goes down, the entire Options-Derived dimension collapses to 0 for all zones, and no zone can score above 10 (since Options-Derived maxes at 2 out of 12).

### 4.10 Pillar 8: EUR/USD Strike-to-DXY Primary Conversion

**Dedicated conversion pipeline for EUR/USD specifically, PRIMARY weighted because EUR/USD dominates DXY at 57.6%.**

**Data consumed:** EUR/USD OTC option strikes from Protocol A. Fed H.10 for K factor computation.

**Computation:**
For each EUR/USD strike, compute:
```
DXY_equiv = K × strike_EURUSD^(-0.576)
where K = 50.14348112 × USDJPY^(0.136) × GBPUSD^(-0.119) × USDCAD^(0.091)
              × USDSEK^(0.042) × USDCHF^(0.036)
```

K is computed by holding the other 5 components at current spot — it represents the "frozen background" against which EUR/USD's effect on DXY is isolated. This is mathematically valid because the DXY formula is a weighted geometric mean, and partial derivatives of geometric means are well-defined.

**Three-tier classification (same as Pillar 3 but PRIMARY for EUR/USD):**

| EUR/USD Expiry Notional | Tier | Classification | Confidence Band |
|------------------------|------|---------------|----------------|
| ≥ 1.5B EUR | 1 | CRITICAL OPTION WALL | ±0.07 DXY |
| $850M – $1.499B EUR | 2 | SIGNIFICANT MAGNET | ±0.10 DXY |
| < $850M EUR | 3 | EXCLUDED (override possible with 3+ pillars) | ±0.15 DXY if overridden |

**First-principles reasoning — WHY this pillar exists SEPARATELY from Pillar 3:**
EUR/USD is 57.6% of DXY's per-pip sensitivity. This is DOMINANT — more than all other 5 pairs combined (42.4%). Mixing EUR/USD's options signal into Pillar 3's generic 6-pair conversion would DILUTE it — EUR/USD strikes would be treated as just one of six inputs, losing 5.2× of their actual impact. Pillar 8 isolates EUR/USD's magnetic pull on DXY by giving it its own dedicated conversion pipeline with PRIMARY weighting.

The K factor is a "freeze-frame" — by holding the other 5 components at spot and varying only EUR/USD, you compute the PARTIAL DERIVATIVE of DXY with respect to EUR/USD. This is the mathematical isolation of EUR/USD's contribution.

The confidence bands widen for smaller notionals because smaller options have less delta-hedging flow, making the conversion less precise. A €500M strike produces a weaker magnetic pull than a €2B strike, so the DXY level where that pull is felt has more uncertainty.

### 4.11 Pillar 9: Regime Detection, Zone Failure Prediction & Breakout Magnitude

**Consumes ALL outputs from Pillars 1-8. This is a POST-PROCESSOR, not a data source.**

**Data consumed:** Every zone produced by the Synthesis Engine (Pillars 1-8 output). Macro catalysts from economic calendar. Momentum indicators. Cross-pair confirmation data.

**Computation — ZFP (Zone Failure Probability):**

ZFP represents the probability that institutional defense of a zone will FAIL — that defending orders will be exhausted before attacking momentum.

**ZFP = base_failure_prob(zone_type) + Σ modifiers**

*Base Failure Probability by Zone Type:*

| Zone Type | Criteria | Base ZFP |
|-----------|---------|----------|
| Hard Wall | CRITICAL OPTION WALL (≥$1.5B) + 3+ pillars + Confluent Floor/Ceiling | 5-15% |
| Standard Wall | SIGNIFICANT MAGNET ($850M-$1.499B) + 2+ pillars | 15-30% |
| Soft Wall | EXCLUDED tier or 1-2 pillars only | 30-50% |
| One-Touch | Only 1 pillar, no option wall | 50-70% |
| Post-Expiry Ghost | Option expired, structural memory remains | 20-40% |
| LSZ | Prior exact swing low from Step 0 | Special: brief breach then reversal |

*ZFP Modifiers (applied to base):*

| Signal | Modifier | Reasoning |
|--------|----------|-----------|
| Option expiry timing (Spring Release at 10:01 AM NY) | +20-30% | Hedging constraints removed → magnetic pull vanishes → violent breakout |
| Macro catalyst aligned against zone | +15-25% | Fed policy, data release pushing against zone defense |
| Increasing momentum toward zone | +10-20% | Attacking force building — defense will be tested harder |
| Cross-pair confirmation | +15-25% | Multiple pairs showing same pattern → systemic force |
| Cascade effect (prior zone broke) | +20-30% | If the zone above already failed, this zone's defense is next |
| Regime change (EMA 200 cross) | +15-25% | Trend regime shift invalidates prior zone assumptions |

**ZFP > 45% = BREAKOUT THRESHOLD.** Institutional defense is weakening. Price is likely to punch through. This drives the SS→BS shape transition in Engine 2.

**ZFP < 20% = HARD WALL.** Institutional defense is OVERWHELMING. Price WILL be rejected. This drives the BS→RWL shape transition.

**Measured Move Projection** when ZFP > 45%:
```
Measured Move Target = Breakout_Point + Range_Height
where Range_Height = height of consolidation pattern preceding breakout
Breakout_Point = edge of failing zone (price where zone broke)
```
This works because institutional moves tend to be proportional to the range that preceded them — energy in = energy out. A consolidation that built up 0.80 DXY points of pressure tends to release 0.80 DXY points of directional movement.

**Pressure Degree from Confluence Score — The Step Function:**

| Score | Pressure Degree | ZFP Range | Description |
|-------|----------------|-----------|-------------|
| 12-14 | EXTREME | <10% | Multiple dimensions at max + structural extreme. Nearly impregnable. |
| 10-11 | HEAVY | 10-25% | Most dimensions agree. Holds under normal conditions. |
| 8-9 | MODERATE-HEAVY | 20-35% | Half the dimensions agree. Holds in consolidation, breaks in momentum. |
| 6-7 | MODERATE | 30-45% | Minimal agreement. Breaks easily under pressure. |
| 4-5 | LIGHT | 40-60% | One dimension. Barely a wall. |
| 0-3 | MINIMAL | >60% | No agreement. Price passes through freely. |

The relationship between confluence score and ZFP is a QUANTIZED STEP FUNCTION — within a band (e.g., scores 8-9), ZFP is constant. At band boundaries, ZFP jumps by 10-15%. The most impactful single-point transition is **7→8 (MODERATE→MODERATE-HEAVY)**, which shifts ZFP by 10-15% — worth MORE than the 11→12 transition (HEAVY→EXTREME) which shifts by only 5-10%. This means adding the 8th confluence point to a zone is more valuable than adding the 12th.

### 4.12 Confluence Scoring (0-14 Scale) — Complete Synthesis

After all 9 Pillars produce their levels, the Synthesis Engine assembles the DXY Institutional Pressure Zone Map:

**Step 1: Collect ALL levels from ALL 9 pillars. Sort highest to lowest. DO NOT filter by spot proximity.**

**Step 2: Score each level across 6 dimensions (0-2 each, max 12) PLUS Structural Extreme Bonus (up to +2, max 14).**

**Step 3: Mandatory Level Clustering Scan.**
Sort levels. For each, count others within 0.15 DXY points. A "cluster" = 3+ levels within 0.15 DXY band → flagged HIGH-DENSITY ZONE. Pairs within 0.10 DXY → TIGHT CONFLUENCE.

**Step 4: Group into zones where levels cluster within 0.10-0.15 DXY.**

**Step 5: Assign pressure degree based on group's highest-scoring level.**

**Step 6: Assign ZFP from Pillar 9. Add Measured Move Projection for ZFP > 45% zones.**

**Step 7: Name each zone by structural role:**
- RESISTANCE CEILING — highest supply above spot
- UPPER RESISTANCE — secondary supply
- EQUILIBRIUM ZONE — contains spot
- MID-RANGE SUPPORT — secondary demand
- KEY SUPPORT BAND — lowest demand below spot
- LIQUIDITY SWEEP ZONE — area of expected stop hunt
- BREAKOUT EXTENSION TARGET — projected BS target

**Step 8: Flag ZFP > 50% as BREAKOUT RISK.**

**Step 9: Post-Consolidation Modifier:** +1 confluence for zones formed AFTER consolidation. Tag as "POST-CONSOLIDATION ZONE."

**Step 9.5: Post-Zone-Map Gap Scan (MANDATORY).**
Identify gaps ≥ 0.20 DXY between adjacent zones. Check 4H zones, 1H zones, round numbers, option conversions, daily pivots, minor swing levels, extended closes as gap-fill candidates. If 2+ supporting signals exist → flag as "GAP IN-FILL LEVEL."

**Step 9.7: 4H Zone Classification Overlay — POI Tier Classification:**

| POI Tier | Condition | Action |
|----------|-----------|--------|
| Tier 1 — Confluent POI | IP zone OVERLAPS with 4H BoM S/D (0X-1X mitigation) | Primary trade location. +2 confluence. |
| Tier 2 — IP-Only POI | IP zone exists, NO overlapping 4H BoM | Secondary trade location. +1 confluence. |
| Tier 3 — 4H-Only Level | 4H BoM exists, NO overlapping IP zone | Informational only. No primary trades. |

**WHY overlap creates Tier 1:** Two INDEPENDENT analytical systems (9-pillar IP + 4H BoM) converging on the same price level. The IP zone provides the WHY (institutional pressure from options, MAs, analyst consensus). The 4H BoM provides the WHERE (structural memory from the origin candle). Together, they confirm each other through completely independent methodologies.

**Step 9.8: Zone Synthesis Re-Verification (MANDATORY).**
After zone map assembled: verify option strikes ≥$850M and from R1 pairs (EU/GU/AU). Downgrade to 0 if contaminated. Verify cross-reference consistency.

### 4.13 BoM vs MoM Classification — Complete Detail

**BoM (Beginning of Move):**
The supply/demand zone formed by the order block candle at the VERY BEGINNING of a BS/WL move. This zone has the DEEPEST institutional commitment — the institutions who started the move have "base camp" orders here. 100% guaranteed reaction if unmitigated.

Identification: The zone at the beginning of a clear impulse move. Price left the zone with momentum. The zone is the "source" of the move. The origin candle's prior move direction is NONE or OPPOSITE to the zone direction.

**MoM (Middle of Move):**
Supply/demand zones formed by clear OB candles IN THE MIDDLE of a BS/WL move. Continuation zones. Less firepower than BoM — they are "cooling Fire." They are LADDER STEPS ONLY for trend-aligned trades. "Do not take reversal entries on MoM zones. EVER. Guaranteed loss."

Identification: Zone formed DURING an ongoing move, not at the start. Price paused here then continued. The origin candle's prior move direction is SAME as the zone direction.

**4H MoM:** Marked as "ONE-AND-DONE" — first retest produces a minor reaction, then strong pierce. Not valid for swing entries.

**The MoM Ladder Step Rule (v5.3.0 — CRITICAL):** MoM zones are ONLY to be used as LADDER STEPS for trend-aligned trades that surf existing momentum. Reversal entries on MoM zones are FORBIDDEN — guaranteed loss. This is because a MoM cannot START a new direction — only BoM can reverse a move. MoM zones in the PATH of a confirmed move are valid ladder steps (adding fuel to existing direction). MoM zones that OPPOSE the move are TP targets (Fire that will be consumed by the stronger directional move).

### 4.14 Zone Reaction Counter — Complete Mechanics

Each zone tracks how many times price has returned to test it:

| Count | Status | Reaction Rate | Entry Validity |
|-------|--------|--------------|----------------|
| 0 (Virgin) | UM if BoM (100% reaction). DEATH ZONE if MoM. | 100% (BoM) / 0% (MoM) | BoM: ENTRY-PRIMARY. MoM: auto-REJECT |
| 1 (Active) | Still has juice | ~80% | BoM: valid. MoM: conditional (4 exceptions) |
| 2 (Active) | Still has juice but weakening | ~50% | BoM: valid. MoM: conditional |
| 3+ (Depleted) | Likely to fail | <30% | TP target ONLY. Price will pierce through |
| 4+ + strong reactions | FORTRESS ZONE | 95% direction flip | Phase transition from Fire to Earth |

**MoM Entry Exceptions (ALL 4 required):**
1. ≥ 1 prior strong reaction
2. Trend-aligned (same direction as the existing move)
3. Key S/R confluence
4. Opposing liquidity weak or absent

**First-principles reasoning — WHY reaction count matters:**
Each test of a zone is a BATTLE between attackers (price momentum trying to penetrate) and defenders (institutional orders protecting the level). Each battle depletes the defenders' ammunition — their counter-orders, delta hedges, and limit orders are consumed. The reaction count is a DIRECT MEASURE of how many battles have been fought and how much ammunition remains.

After 3 strong reactions, the defending institutions have deployed capital THREE TIMES to push price back. Each deployment reduced their remaining defensive capital. By the 3rd deployment, they are running low — their counter-orders are thin, their delta hedges are reduced, and the attacking momentum has learned the defense pattern. The 4th attack will overwhelm the weakened defense. The zone FAILS.

**The 1-2-3 Retest Timing Pattern:**
- 1st test (virgin): Scalp only. The zone reacts violently but you don't know if it'll hold on retest.
- 2nd test: Confirmation. The zone has reacted twice — institutional interest confirmed.
- 3rd test: Swing entry valid. WHY? Not because the zone is stronger (it's weaker), but because LIQUIDITY HAS ACCUMULATED around the zone. Each test deposited new retail stop-losses. By the 3rd test, enough Earth (liquidity) has accumulated to fuel a swing move when the zone's reaction sweeps those stops. The zone transitions from Fire-dominant to Earth-dominant.

### 4.15 Virgin MoM Exception — Complete Detail

A virgin MoM (0 reactions) is a DEATH ZONE for counter-trend entries. HOWEVER: when this virgin MoM is the OPPOSING PRESSURE of a fresh BS move (ONLY BS, NOT WL), the LQZ anchored to this virgin MoM IS a valid entry for a LIQUIDITY LADDER REINFORCEMENT of the EXISTING BS position.

**The entry is on the LQZ anchored to the MoM, NOT on the MoM itself.**

**Market mechanics — what happens when BS hits a virgin MoM:**

1. The BS represents Fire fully ignited with maximum Earth fuel — fresh directional momentum with 4-8+ candles of progression from small → massive.
2. The virgin MoM is an unmitigated Fire zone — it still holds residual institutional orders from when it formed during the prior move.
3. When the BS encounters this MoM, the residual orders cause a MINOR reaction — a few small counter-trend candles. This reaction is minor because:
   - The MoM's Fire is "cooling" — it formed mid-move, not at the origin, so it has less firepower than a BoM
   - The BS's directional momentum is STRONG and SUSTAINED
   - The MoM cannot generate enough counter-force to reverse a fresh BS
4. The minor reaction causes price to pull back slightly — this sweeps the LQZ beneath the MoM
5. The swept liquidity provides additional fuel for the BS to continue
6. The BS pierces through the MoM and continues to its real target (the next BoM)

**WHY valid for reinforcement but NOT for new entries:**
- Reinforcement = SAME direction as BS (trend-aligned) — catches the minor reaction dip, rides continuation
- New reversal entry = OPPOSITE direction to BS — attempts reversal AT the MoM, but the MoM gets PIERCED, no reversal happens, guaranteed loss

**WHY ONLY BS, NOT WL:**
- BS has SUSTAINED energy (4-8+ candles, progression small→massive, each thrust builds on previous)
- WL has ISOLATED energy (1-3 candles, then dies — no progression, appears at full size)
- When WL hits a virgin MoM, its energy is ALREADY SPENT upon contact — it cannot guarantee piercing. The outcome is UNPREDICTABLE.
- Only BS has the sustained energy to make the reaction-sweep-pierce pattern PREDICTABLE.

### 4.16 LQZ (Liquidity Zone) Detection — Complete Detail

LQZ detection operates on **1H or 30m candlestick patterns** — NEVER 4H. 4H is only for S/D zone order block identification.

**Three pattern types with exact thresholds:**

**Type 1 — LIQUIDITY_SWEEP:**

A classic stop-hunt pattern where price breaks through a support/resistance level, grabs stops, then reverses.

Detection criteria:
- 2 back-to-back THICK candle bodies that BREAK a support/resistance level
- Each candle body must be ≥ 1.5× the average body over the window (`SWEEP_THICK_BODY_MULT = 1.5`)
- EXTENDED wicks beyond the broken level — wick tip must extend ≥ 2 pips beyond (`SWEEP_MIN_BEYOND_PIPS = 2`)
- Price REVERSES back through the level within 6 bars (`SWEEP_REVERSAL_WINDOW_BARS = 6`)
- The S/R level being swept is the 24-bar high (resistance) or 24-bar low (support) (`SWEEP_LEVEL_LOOKBACK_BARS = 24`)
- Minimum 5 bars of history before a sweep pair can be evaluated

Zone bounds: From the broken level to the wick tip — the area where stops were grabbed.
Direction: Upward sweep (breaks resistance above) → BUY_SIDE → supply zone. Downward sweep (breaks support below) → SELL_SIDE → demand zone.

**Type 2 — LONG_WICK:**

A single candle with a dominant wick that grabs liquidity, followed by a sharp move confirming the grab.

Detection criteria:
- A single candle with dominant wick ≥ 2.5× body length (`LONG_WICK_BODY_MULT = 2.5`)
- AND the wick is ≥ 5 pips absolute (`LONG_WICK_MIN_PIPS = 5`) — the 2.5× ratio alone is never sufficient
- Followed within 3 bars (`SHARP_MOVE_WINDOW_BARS = 3`) by a SHARP directional move
- Sharp move = ≥ max(15 pips, 1.5×ATR) (`SHARP_MOVE_MIN_PIPS = 15`, `SHARP_MOVE_ATR_MULT = 1.5`)

The wick proves liquidity was there. The sharp move proves the grab worked — price moved significantly away from the wick level, confirming that resting orders were consumed.

Zone bounds: From the wick tip to the body edge — the liquidity grab area.
Direction: Lower wick → sell stops swept → SELL_SIDE → demand zone. Upper wick → buy stops swept → BUY_SIDE → supply zone.

**Type 3 — SHORT_WICK_CONSOL:**

Multiple candles with aligned short wick tips — tight consolidation that maps zone edges precisely.

Detection criteria:
- 3+ candles in compressed range (`SHORT_WICK_CLUSTER_MIN_BARS = 3`)
- Each candle's short wick (≤ 3 pips, `SHORT_WICK_MAX_PIPS = 3`)
- Wick tips align at the same level within 2 pips (`SHORT_WICK_CLUSTER_TOL_PIPS = 2`)
- Clustered bars span ≤ 25 pips total (`CONSOL_MAX_SPAN_PIPS = 25`) — proves consolidation

Direction: Aligned upper tips at range top → BUY_SIDE → supply zone. Aligned lower tips at range bottom → SELL_SIDE → demand zone.

**Confirmation Rule — THE CRITICAL ANTI-NOISE FILTER:**

A Liquidity Zone is ONLY emitted when 2 or more pattern types ALIGN on a HORIZONTAL LINE. Specifically:
- Same side (both BUY_SIDE or both SELL_SIDE)
- Zone intervals overlap within 3 pips (`LQZ_ALIGN_TOLERANCE_PIPS = 3`)
- Across the multi-day lookback (120 bars ≈ 5 trading days)
- Single-pattern hits are DISCARDED

**Zone Count Caps:**
| Scope | Limit |
|-------|-------|
| Tradeable range (±clamp(4×ATR, 25-100 pips)) | ≤ 20 zones |
| Entire week of bars | ≤ 50 zones |
| Hard ceiling | ≤ 75 zones |

**mergeLqzWithIpZones Function:**
When an LQZ overlaps an IP zone within 5 pips:
- IP zone gets promoted: confluence +2, zfp -5, liquidityScore raised, sdOverlap='LQZ'
- Non-overlapping LQZ becomes standalone MoM zone with confluence 1, proper sdType and liquidityScore

### 4.17 HTF Zone Mechanics Decision Tree

When a MoM zone is tested during the shape chain, the reaction determines the subsequent shape:

```
MoM zone tested (unmitigated):
  ├── SHARP WHIPLASH/REVERSAL instantly
  │   → All liquidity drained at this level
  │   → Zone is PIERCED
  │   → Next shape: BS or WL in OPPOSITE direction
  │
  ├── MINOR REACTION + retest, zone HOLDS
  │   → Zone absorbs the test
  │   → Long Consolidation begins (2-4 days)
  │   → Next shape: SS (Swing Scalps)
  │   → Map swing scalp setups within consolidation range
  │
  ├── Zone BREAKS but price RETURNS
  │   → Short Consolidation
  │   → Next shape: SS → BS or SS → WL
  │   → Transition setup: entry on the break of consolidation
  │
  └── NO PIERCE or sharp whiplash
      → Slow Consolidation around POI (2-4 days)
      → Consolidation ends in price retesting opposing liquidity
      → Then pierce through zone until reaching BoM Liquidity
      → Next shape: SS → BS (breakout to BoM target)
```

**Application:** The zone's reaction count predicts which branch activates:
- 0 reactions (virgin): Most likely MINOR REACTION branch
- 1-2 reactions (active): Could be any branch — assess surrounding liquidity
- 3+ reactions (depleted): Most likely PIERCED branch

**BoM zones are NOT subject to this decision tree** — they ALWAYS react (100% guarantee if unmitigated). A BoM zone reaction produces BS, WL, or RWL determined by the Direction Validation 6-check.

**Energy states behind each branch:**
- Sharp whiplash = ENERGY FULLY EXPENDED (all at once, violent, zone empty — entropy maximized)
- Minor reaction + hold = ENERGY PARTIALLY EXPENDED (zone cracked but standing — system in transition)
- Zone breaks + returns = ENERGY IN FLUX (battle ongoing, no clear winner — maximum uncertainty)
- No pierce = ENERGY SLOWLY BUILDING (gradual absorption, pressure accumulating — loaded spring)

### 4.18 Engine 1 → Engine 2 Data Flow

Engine 2 consumes the COMPLETE Engine 1 output. Every field matters:

1. **IP Zone Map** — All zones with ranges, pressure degrees, confluence scores, ZFP, POI tiers, BoM/MoM classification, mitigation levels, reaction counts, Measured Move Projections, LSZ status, Structural Extreme Bonus flags
2. **Hard Wall Detection** — Zones with ZFP < 15% AND confluence ≥ 8 → flagged as Hard Walls. These are the most critical inputs to Engine 2's ZFP-Conditioned Transition Rules.
3. **BoM/MoM Classification per zone** — Determines whether the HTF Zone Mechanics Decision Tree applies to that zone when tested
4. **Zone Reaction Counter per zone** — Determines which branch of the MoM Decision Tree activates
5. **LSZ Zones with bottom edge extensions** — Used for shape anchoring (WL/RWL require LSZ as rejection anchors)
6. **Three-Tier Option Classification** — Critical Option Walls and Significant Magnets form "cages" that confine SS ranges
7. **4H Zone Classification Overlay (POI Tiers)** — Tier 1 Confluent POIs are primary anchors for shape classification
8. **Intra-Zone Key Levels** — Precision for determining exactly WHERE within a zone a shape transition triggers
9. **Gap Scan Results** — Identify structural voids where shapes may accelerate (PBS through gaps)
10. **Clustering Scan Results** — High-Density Zones and Tight Confluence define where WLS oscillation cages form

---

---

## PART 5: ENGINE 2 — SHAPE PREDICTION

*CANON from v5.3.3 system prompt. ZERO deviation permitted. This is the most battle-tested part of the entire system.*

### 5.1 Purpose

Engine 2 answers: **WHAT path will price take through the walls mapped by Engine 1? WHICH setup types are valid this week?**

Engine 2 forward-maps the shape of the coming week's price action anchored to the IP zones produced by Engine 1. It predicts the sequence of macro shapes (SS→BS→R→WL) that price will follow, assigns each shape to specific trading days, and identifies the setup categories valid for each day.

**Primary analysis timeframe: 1H.** Shape classification, chain construction, and day-by-day mapping all operate on 1H bars.

**Timeframe hierarchy:**
- **1H (PRIMARY):** Shape classification, chain construction, day-by-day mapping
- **4H (STRUCTURAL):** Validates SS range boundaries and BS direction — never primary
- **30m (SUPPLEMENTARY):** Intra-session detail only — never used for shape classification
- **D1 (MACRO):** Regime context only — weekly trend direction

### 5.2 Shape Taxonomy — Complete Definitions

#### SS — Swing Scalps (Consolidation)

**Definition:** Price oscillates within a defined range bounded by IP zones above (resistance ceiling) and below (support floor), forming swing highs and lows that respect the boundaries. Each swing spans 1-3 trading sessions.

**Candle Anatomy:**
- Candle count: 8-30+ candles
- Body fraction: TINY (0.10-0.30) — most candles are dojis or spinning tops with very small bodies relative to their ranges
- Total range: SMALL (0.2-0.5× of context average candle range) — the entire SS phase occupies a tight horizontal channel
- Wicks: MODERATE (0.3-0.5 of range) — both upper and lower wicks present but not dominant
- Color pattern: MIXED — green and red candles alternate randomly with no sustained direction
- Progression: NONE — candles do not build in size; they maintain consistent small bodies throughout

**IP Zone Signature:** Both ceiling AND floor zones have ZFP below 30%. Option expiry positioning cages price between large strikes. The low ZFP on BOTH sides means both walls are strong enough to contain price — neither is about to break.

**Duration:** 2-5 trading sessions.

**Subtype — SS(DWL) (Double Whiplash):** Two rapid whiplash moves in succession within the SS range. Indicates heightened volatility often preceding a breakout attempt. NOT a separate shape — it's a subtype of SS that signals the range is under stress and may break soon.

**Zone Relationship:** Price consolidates BETWEEN supply (above) and demand (below). The zones define the range boundaries. SS continues until one boundary's ZFP rises above 45% — at that point, the boundary fails and SS transitions to BS.

**Energy State:** ACCUMULATING. Price is coiling like a spring, building pressure for release. The longer the SS, the more pressure accumulates. A 30-candle SS produces a more violent BS than a 10-candle SS because more liquidity has been accumulated during the consolidation.

**Setup Category:** Consolidation. Swing scalps at range boundaries — LONG at demand floor, SHORT at supply ceiling.

#### BS — Breakout Surge (HTF Swing)

**Definition:** Price breaks decisively through an IP zone (ZFP > 45%) and surges directionally toward the next IP zone or Structural Extreme Magnet. Breakout confirmed by sustained move beyond the zone (15+ minutes).

**Candle Anatomy:**
- Candle count: 4-8+ candles (up to 10-12 in extended surges)
- Body fraction on thrust candles: LARGE (0.65-0.95) — full-bodied marubozus
- Body fraction on retracement candles: SMALL (0.2-0.4)
- Total range on thrust candles: LARGE (3-5× SS candle range)
- Wicks on thrust candles: MINIMAL (<0.2 of range) — near-marubozu candles
- Wicks on retracement candles: MODERATE
- Pattern: PROGRESSION — candles build from small → medium → large → MASSIVE. The final candle is the LARGEST (massive marubozu with minimal wicks). Each thrust candle builds on the previous — sustained momentum.
- Retracements: SMALL (<30% of thrust candle range). They are pauses, not reversals.

**IP Zone Signature:** The FAILING zone has ZFP above 45%, with active breakout pre-conditions (momentum building, macro catalyst aligned).

**Duration:** 1-3 sessions.

**Variant — PBS (Piercing Breakout Surge):** BS so powerful it pierces directly through one or more intermediate IP zones without pausing. Occurs when failing zone ZFP > 70%. All intermediate zones have ZFP > 50%.

**Zone Relationship:** Moves TOWARDS the next BoM zone of opposite liquidity. BS/WL always target BoM zones, NOT MoM zones. MoM zones are IGNORED — they get pierced and broken.

**Energy State:** PIERCING. Sustained directional momentum that keeps going and going. Impales through zones with full-bodied candles.

**Setup Category:** HTF Swing. Directional move entries at the origin of the BS.

#### R — Recovery (Consolidation/Reversal)

**Definition:** Temporary stabilization or mild retracement immediately after BS or WL. Price consolidates or slowly drifts back toward the prior IP zone level.

**Candle Anatomy:**
- Candle count: 6-24 candles (often the longest phase)
- Body fraction: MEDIUM (0.40-0.60) — moderate body sizes
- Total range: MODERATE (0.8-2.0× context average)
- Wicks: MODERATE — present but not dominant
- Pattern: V-SHAPED — first half is a trend in the OPPOSITE direction of BS (correction phase), second half is a recovery back toward the BS direction
- Color: MIXED with a trend — alternating green/red but with a directional bias

**IP Zone Signature:** Recovery zone has ZFP 20-40% — moderate strength, enough to cause price to pause but not hard-reject.

**Duration:** Less than 1 session. ALWAYS TRANSITIONAL.

**Variant — RS (Recovery Surge):** Instead of slow consolidation, Recovery takes the form of a sharp directional move back toward pre-breakout level.

**Zone Relationship:** Happens after BS hits a MITIGATED zone (soft recovery). The zone's orders are weakened but present — enough to cause a pause but not a violent reversal.

**Energy State:** CORRECTING. Orderly with pullbacks. "Two steps forward, one step back."

**Setup Category:** Consolidation (if stabilizing) or Reversal (if reversing). Also produces Reinforcement entries for existing BS positions.

#### WL — Whiplash (HTF Swing)

**Definition:** A rapid, violent directional move (1-3 candles) that immediately reverses — spike-and-reject pattern. The key characteristic is the REJECTION at the IP zone, not the initial surge.

**Candle Anatomy:**
- Candle count: 1-3 candles (NOT always 3 — can be 1-2 in some examples)
- Body fraction on momentum candles: MODERATE-HIGH (0.5-0.7)
- Body fraction on grab candles: MODERATE (0.3-0.5)
- Total range: LARGE (2-4× context average) — explosive spike
- Wicks on grab candles: LONG (~1× body length) — the wick is about the same length as the body
- Wicks on momentum candles: SMALL
- Pattern: GRAB → MOMENTUM → GRAB. First candle has long wick (liquidity grab), second candle has large body (momentum confirming direction), third candle has long wick (another liquidity grab).
- Color: ALL SAME COLOR (unidirectional) — all green for bullish WL, all red for bearish WL

**IP Zone Signature:** Rejection zone has ZFP < 20% (Hard Wall). Confluence ≥ 8. LSZ identified. The zone is overwhelmingly defended — price WILL be rejected.

**Duration:** Less than 1 session.

**Variant — RWL (Reverse Whiplash):** A Whiplash in the OPPOSITE direction of the preceding BS. Most common follow-on shape after BS reaches a Hard Wall. 6+ candles, moderate bodies (0.3-0.5), mixed colors with reverse direction dominant, retracements 30-60% of thrust candle range.

**Variant — PWL (Piercing Whiplash):** Initial surge so powerful it pierces through multiple IP zones before rejection.

**Variant — PRWL (Piercing Reverse Whiplash):** RWL with piercing characteristics. **STRONGEST REVERSAL SIGNAL in the entire taxonomy.**

**Zone Relationship:** Moves TOWARDS BoM zone of opposite liquidity. At the zone: rejected violently.

**Energy State:** GRABBING. Whips forward to grab liquidity at zones, then dies immediately. Isolated — not sustained like BS.

**Setup Category:** HTF Swing. Reversal entries at the rejection point.

**CRITICAL DISTINCTION — BS vs WL:**
- BS has NO long wicks on thrust candles. WL has LONG wicks on grab candles.
- BS has PROGRESSION (small → large → massive). WL has NO progression — appears at full size.
- BS is SUSTAINED (4-8+ candles). WL is ISOLATED (1-3 candles, then dies).
- BS retracements are SMALL (<30%). WL has no retracements (isolated).
- BS color is MIXED with dominant direction. WL color is ALL SAME.

#### WLS — Whiplash Storm (Consolidation)

**Definition:** Multiple back-to-back WL/RWL chains with clear whiplash candles (long wicks, liquidity grabs on BOTH sides) oscillating within a defined range. A hyper-volatile SS happening on the HTF.

**What WLS looks like on a chart:** 14-15+ candles in violent oscillation within a ~100 pip range. Each candle has prominent wicks on BOTH sides — liquidity is being grabbed on every oscillation. The candles alternate between green and red rapidly. Between whiplashes, there are brief pauses (1-3 candles of small bodies) but NOT full SS consolidation.

**WLS is NOT "extended RWL."** RWL is a REVERSAL pattern — directional, producing directional entries. WLS is a RANGE-BOUND pattern with high volatility — consolidation structure but with WL-type candles in sequence. The distinction matters: RWL produces reversal entries, WLS produces range-bound entries (scalp at boundaries).

**What makes it a "storm":** The oscillation is HYPER-VOLATILE. Each WL/RWL in the sequence grabs liquidity on both sides before the next reversal grabs it back. Both buyers and sellers are aggressively fighting at the boundaries, with neither side winning decisively, but the FIGHTING itself is violent.

**Lifecycle:** WLS either dissipates into SS (volatility decreases, candles get smaller, range tightens) OR comes AFTER SS/R and precedes PBS (accumulated energy from all the whipsawing eventually powers a breakout). The chain is typically: PBS → R → WLS → (either SS or PBS).

**Candle Anatomy:**
- Candle count: 14-15+ candles
- Body fraction: MODERATE (0.3-0.5)
- Total range: MODERATE (1.0-2.0× context average)
- Wicks: MODERATE on all candles, with prominent wicks on BOTH sides
- Color: MIXED — rapid alternation with no sustained direction

**IP Zone Signature:** Multiple IP zones of similar pressure degree within narrow range (0.30-0.50 DXY). Price oscillating violently between them.

**Duration:** 2-5 sessions. Almost always resolves into BS.

**Setup Category:** Consolidation. Range-bound scalps at the storm boundaries.

### 5.3 Shape Classification Decision Matrix

Apply in SEQUENCE — check highest-priority condition first. If it matches, assign that shape and stop.

| Priority | Condition | Shape | Confidence |
|----------|-----------|-------|-----------|
| 1 | Price breaks through zone with ZFP > 45% AND confirms 15+ min; Measured Move target exists | BS (PBS if pierces multiple zones) | HIGH |
| 2 | Price surges to zone with ZFP < 20%, briefly pierces, then rejects; LSZ identified | WL (PWL if multiple zones pierced) | HIGH |
| 3 | After BS/WL: price stabilizes at mid-range zone (ZFP 20-40%); duration < 1 session | R (RS if sharp retracement) | MODERATE |
| 4 | 3+ IP zones in narrow range (0.30-0.50 DXY); price oscillating violently; 4H shows consolidation | WLS | HIGH |
| 5 | Price oscillating between Heavy/Extreme ceiling and floor zones; both ZFP < 30%; duration > 1 session | SS | HIGH |
| 6 | After BS: violent reversal through origin; Hard Wall rejection | RWL (PRWL if piercing) | MODERATE-HIGH |

**WHY this priority order:** Breakouts (BS) are checked first because they are the highest-impact events. A breakout that looks like SS (brief consolidation before breaking) should be classified as BS, not SS. If you check SS first, you'd classify the brief consolidation as SS and miss the imminent breakout. Whiplash is checked before R because WL's violent rejection looks similar to R's stabilization but has opposite implications (WL = reversal entry opportunity, R = wait for next shape). WLS is checked before SS because the violent oscillation could be mistaken for normal consolidation if you don't check for the 3+ zone cage condition.

### 5.4 ZFP-Conditioned Transition Matrix — With First-Principles Logic

The ZFP of the TARGET zone determines the next shape, NOT the momentum of the current move. This is the MOST IMPORTANT Engine 2 correction — the operator explicitly stated this was the #1 Engine 2 error that caused mispredictions.

| Current Shape | Target Zone ZFP | Predicted Next | Confidence | First-Principles Logic |
|---------------|----------------|---------------|------------|----------------------|
| BS | < 20% (Hard Wall) | **RWL** | HIGH | The zone has EXTREME or HEAVY pressure (confluence ≥ 8). 5-6 independent dimensions agree on this level. Overwhelming institutional defense. Price CANNOT break through — it WILL be rejected. The rejection IS a RWL. Predicting continuation (R or PBS) here ignores the DENSITY OF THE WALL. Walls don't care about momentum. |
| BS | 20-40% (Mid-range) | **R** | HIGH | The zone has MODERATE or MODERATE-HEAVY pressure. Strong enough to cause price to pause and stabilize, but not strong enough to guarantee a hard rejection. Price will consolidate here briefly before either continuing or reversing. |
| BS | > 60% (Very weak) | **PBS** | MODERATE | The zone is already failing. Multiple signals (option expiry, cascade, momentum) have eroded its structural integrity. Price will punch through. The cascade continues. |
| BS | > 80% (Nearly broken) | **PBS** (strong cascade) | HIGH | The zone is effectively broken. Continuation with maximum momentum. |
| SS | > 45% (bounding zone failing) | **BS** | HIGH | One side of the range is failing. The consolidation prison's wall is cracking. Breakout is imminent in the direction of the failing wall. |
| SS | All zones < 30% (both sides hold) | **SS continues** | HIGH | Both bounding zones are solid. Consolidation continues. Price remains caged. |
| WLS | Any bounding zone fails | **BS** | VERY HIGH | WLS almost always resolves into BS. The accumulated energy from violent oscillation powers the breakout. The only question is direction. |
| R | Persists > 1 full session | **SS** (reclassify) | MODERATE-HIGH | If stabilization persists for more than 1 session, it IS consolidation now. Reclassify to SS and map swing scalp setups. Don't continue calling it R when it has become SS. |
| R | < 1 session, opposing zone near | **WL/RWL** | MODERATE | Brief pause then rejection at opposing zone. The recovery didn't last — price hit the next wall. |
| WL | Rejection momentum builds in opposite direction | **RWL** | MODERATE-HIGH | The whiplash rejection is the entry for the reverse move. Traders who got trapped by the WL now reverse. |
| WL | No opposite momentum builds | **SS** | MODERATE | Whiplash exhausts into range. No one has energy to continue. Consolidation begins. |
| RWL | Any | **SS** | HIGH | Reversal energy dissipates. New range forms around the reversal point. |

**ZFP Override Rules:**
- ZFP < 15% (extreme concentration) → force SS (price magnetically drawn to the zone but cannot break it — oscillates around it)
- Consolidation + prior R + ZFP < 30% → continue R (the zone is weak enough that the recovery can push through)

**The Fundamental Insight:** The ZFP of the TARGET zone — not the MOMENTUM of the current move — determines what happens next. A powerful BS with extreme momentum that hits a Hard Wall (ZFP < 20%) will STILL produce an RWL — because the wall is DENSER than the move. Momentum does not override density. This is analogous to physics: a fast-moving car hitting a concrete wall does not pass through the wall — it bounces back (or stops). The wall's density exceeds the car's momentum.

This is why the April 20-24 misprediction occurred: the engine predicted upside continuation when a Hard Wall sat directly above. It looked at the BS momentum and assumed continuation. It should have looked at the TARGET zone's ZFP and predicted rejection.

### 5.5 Shape Transition Rules — Base Matrix

| Current → Next | IP Zone Trigger | Probability |
|----------------|----------------|-------------|
| SS → BS | Bounding zone ZFP > 45% fails with confirmation | HIGH (especially if ZFP > 60%) |
| SS → WLS | 3+ zones in narrow range; volatility triggers amplify | MODERATE |
| BS → R | Price reaches Measured Move target zone (ZFP 20-40%) | HIGH |
| BS → RWL | Price reaches Hard Wall / Institutional Magnet | HIGH (at Hard Walls) |
| BS → PBS | Zone fails with extreme momentum; distant target | MODERATE |
| R → SS | Stabilization persists > 1 session; both bounding zones hold | MODERATE-HIGH |
| R → WL/RWL | Recovery reaches opposing IP zone | MODERATE |
| R → BS (2nd leg) | Recovery at mid-range zone that also fails | MODERATE |
| WL → RWL | Whiplash rejected at zone; opposite momentum builds | MODERATE-HIGH |
| WL → SS | Whiplash exhausts; consolidation near rejection point | MODERATE |
| RWL → SS | Reversal exhausts; new range established | HIGH |
| RWL → BS (new direction) | Reversal breaks through opposing zone | MODERATE |
| WLS → BS | Bounding zone of the storm finally fails | VERY HIGH |
| WLS → SS | Volatility diminishes; oscillation range narrows | MODERATE |

### 5.6 Shape Chain Patterns (By Frequency)

| Chain | Frequency | Description |
|-------|-----------|-------------|
| SS → BS → R → WL | **HIGHEST** | Default weekly storyline. SS builds pressure, zone fails, BS surges, R at mid-range zone, WL at target zone. |
| SS → BS | **VERY HIGH** | Abbreviated default. Week ends before R/WL materialize. |
| BS → R → RWL | **HIGH** | Week opens with BS. Recovery follows, then RWL rejects at Hard Wall. Signals false breakout. |
| BS → RWL → SS → BS | **HIGH** | Complete false breakout cycle. Second BS often succeeds. |
| WL → RWL → SS → BS | MODERATE | Opening Whiplash reversed, consolidation, then breakout. |
| R → RWL → SS → BS | MODERATE | Recovery from prior week BS reversed, new consolidation and breakout. |
| BS → RWL → PBS | MODERATE | Initial BS reversed, but reversal triggers even more powerful PBS. |
| BS → R → PBS | MODERATE | BS followed by Recovery, then even stronger second leg. |
| SS → BS → SS → BS | MODERATE | Double consolidation-breakout. |
| WLS → BS → WLS | MODERATE | WLS resolves into BS, triggers another WLS. |
| WLS → SS → PBS | MODERATE | WLS exhausts into SS, then Piercing BS breaks out. |
| PBS → R/SS → PRWL → SS | LOW-MOD | PBS reversed by PRWL, then settles. |

**Master Pattern:** SS → BS → R → WL takes one FULL WEEK to play out. One full cycle = one week. This is the most frequently observed sequence on both HTF and LTF.

### 5.7 Conservation of Energy and the Shape Cycle

**WL (MAXIMUM energy) → RWL (declining) → SS (recharging) → BS (recharged)**

After 2 strong piercing swing moves → 1-2 full days of HTF consolidation. Liquidity must be absorbed before it can surge again. This is a universal mechanic — it applies to every market, every timeframe, every asset class.

**Energy Model — Quantitative Framework:**

Markets spend approximately **70-80%** of their time in accumulation/recovery phases (SS, R, WLS) and only **20-30%** in explosive release (BS, WL). Total BS/WL moves across a heavy week can span 3-5 trading sessions out of ~15 total sessions.

The recharge:consumption ratio is approximately **10:1 to 24:1** in candle count. A BS that consumes 4-8 candles requires 48-96 candles of SS to replenish the energy. This means the vast majority of trading time is spent WAITING for energy to build.

Energy accumulation scales sub-linearly — approximately **t^0.375** (sub-square-root). This means a 20-candle SS does not produce twice the energy of a 10-candle SS — it produces approximately 1.5× the energy. But a 30-candle SS produces significantly more violent BS than a 10-candle SS because the non-linear accumulation means longer consolidations build disproportionately more pressure.

**Critical Prediction:** In a BS → R → BS (Double Surge) sequence, the second BS MUST be weaker than the first because the energy budget is partially depleted. R recovers approximately 33% of consumed energy — not enough for a full-strength second surge. The second BS will have fewer candles, smaller bodies, and less zone penetration.

### 5.8 IP Zone Anchoring by Shape

| Shape | Entry Zone | Target Zone | Key ZFP Range | Duration |
|-------|-----------|-------------|---------------|----------|
| SS | Ceiling AND Floor, both ZFP < 30%, Conf ≥ 6 | N/A (range-bound) | Ceiling < 30%, Floor < 30% | 2-5 sessions |
| BS (up) | Resistance zone ZFP > 45% | Next Resistance or Structural Extreme | Source > 45% | 1-3 sessions |
| BS (down) | Support zone ZFP > 45% | Next Support or Structural Extreme | Source > 45% | 1-3 sessions |
| PBS | Multiple zones ZFP > 50% | Deep Structural Extreme | All intermediate > 50% | 1-2 sessions |
| WL | Zone ZFP < 20% (Hard Wall) | Origin zone (return) | Rejection zone < 20% | < 1 session |
| RWL | Hard Wall or Institutional Magnet | Prior origin | Rejection zone < 15% | < 1 session |
| WLS | 3+ zones ZFP 15-40% each | BS resolution target | Cluster 15-40% | 2-5 sessions |
| R | Mid-range zone ZFP 20-40% | N/A (transitional) | 20-40% | < 1 session |

### 5.9 Forward Mapping Procedure (5 Steps — MANDATORY)

**Step 1: Current Shape Identification.**
Apply the Shape Classification Decision Matrix (Section 5.3). State the current shape, the anchoring IP zone, the ZFP of the anchoring zone, the 1H structure description, and the 4H validation.

**Step 2: Transition Probability Assessment.**
Apply the Shape Transition Rules (Section 5.5) AND the ZFP-Conditioned Transition Rules (Section 5.4). Assign confidence level. If the current shape is SS, also assess the consolidation phase (Section 5.10).

**Step 3: Chain Extension with Audit Trail.**
Extend the shape chain shape-by-shape through the trading week. For EACH extension, document:
(a) Current shape
(b) IP zone trigger (which zone, what ZFP)
(c) Transition conditions (ZFP value, confirmation requirements)
(d) Predicted next shape
(e) Confidence level

Format: `Shape A → [Trigger: zone name, ZFP X%] → Shape B → [Trigger: ...] → Shape C [confidence: Y%]`

**Maximum chain length: 5 shapes. Terminate if cumulative confidence drops below 25%.**

**Step 4: Alternative Chain Analysis.**
For every primary chain, construct at least one alternative chain that activates if the primary fails at a Decision Zone. Document:
(a) Decision Zone (the IP zone whose ZFP determines which chain activates)
(b) ZFP threshold triggering the alternative
(c) Alternative chain
(d) Alternative chain confidence

Format: `PRIMARY: A→B→C | DECISION ZONE: [zone name] ZFP > [threshold]% → ALTERNATIVE: A→X→Y`

**Step 5: Session/Day-Level Decomposition.**
Decompose the weekly chain into day-by-day predictions. For each day (Mon-Fri):
(a) Predicted shape
(b) Directional bias (up/down/range)
(c) Key IP zone for that day
(d) Volatility triggers (auctions, expiries, economic events)
(e) Confidence

Format: `Mon: [SHAPE] [direction] | Key Zone: [name] | Triggers: [list] | Confidence: X%`

**Apply Trading Speed Rule:** Add +1 day to expected timing. "Today's move" often becomes "tomorrow's move." Price moves at 30-50% of expected speed.

**Day-element mapping is DYNAMIC, not hardcoded.** Any day can be any element. The elemental cycle (Earth→Fire→Water→Air→Earth) describes a general weekly rhythm — Earth accumulates during SS, Fire ignites during BS, Water materializes as shapes, Air maps trajectory — but which day is which element depends entirely on the shape chain decomposition. If Wednesday's shape is BS (Fire/ignition), then Wednesday IS the Fire day for that week. A different week might have BS on Monday.

### 5.10 Consolidation Phase Detection

For each SS/WLS/R shape, detect the consolidation phase:

| Phase | Condition | Valid Setup Types | Timeframe Stack |
|-------|-----------|-------------------|-----------------|
| Early consolidation | SS/WLS just started (< 1 session) | Swing Scalps (both directions) | Scalp Stack (30m/15m/5m) |
| Mid consolidation | SS/WLS ongoing (1-3 sessions) | Swing Scalps + Double Whiplash Inverse | Scalp Stack |
| Late consolidation (near HTF zone) | ZFP trending up on bounding zone | Swing Scalps + BS Transition Entry | Both Stacks |
| Post-BS (early breakout) | BS confirmed, move in progress | Reinforcement entries only | Swing Stack |
| Post-BS (recovery) | BS complete, price recovering | Whiplash/Recovery Surge entries | Swing Stack |
| Mid-breakout | Directional move in progress | Reinforcement entries at liquidity zones | Swing Stack |

**Key rule:** "If not right near a strong 4H pressure zone right now — BS is most likely days away. This is swing scalp valley — milk the cow on the 15m timeframe."

**SS→BS Trigger signal:** "4+ SS trades over 1-2 days → NY session = BS begins." "If price has been consolidating/SS for 1+ days → BS is likely imminent."

### 5.11 Trading Speed Rule

"Assume price moves at 30-50% of the speed you think it will."

1. **Shape chain timing:** "Today's move" often ends up being TOMORROW's move. When predicting day-level shape assignments, add +1 day to expected timing.
2. **4H move duration:** "The move that I see on the 4H chart — expect it to take twice as long as I think it will." A 4H breakout that appears imminent may take 2-3 more 4H candles to complete.
3. **Reinforcement rocket spacing:** Rockets should be spaced further apart to avoid clustering.
4. **AUD/USD specific:** "Molasses. Expect 2-4 days before HTF move completes." AU is the slowest pair.
5. **Consolidation duration:** "If the price does not pierce or sharply whiplash upon testing the zone, expect a slow consolidation around this POI for 2-4 days." Consolidation lasts longer than expected.

### 5.12 MoM Piercing Logic

If the MoM is fully unmitigated, there will be a MINOR reaction from BS (few small counter-trend candles) and then it pierces through and continues. This is a great entry point for reinforcements — the LQZ beneath the MoM provides the Earth anchor for a trend-aligned reinforcement. The minor reaction sweeps the LQZ, providing fuel for continuation.

WL will often just pierce through MoM zones without any reaction — WL's isolated energy doesn't even produce a minor pause at MoM zones before piercing.

### 5.13 Timeframe Element Matching

Each timeframe's liquidity is its own element. Moves originating from a specific TF's zone tend to target the same TF's zone on the other side:

| Source TF | Target TF | Notes |
|-----------|----------|-------|
| 4H | 4H (1H acceptable) | 1H and 4H react to one another as similar elements |
| 1H | 1H (30m acceptable) | |
| 30m | 30m (15m acceptable) | |
| 15m | 30m or 1H (up to 2 TF dimensions higher) | Cannot target 4H — too far |
| 5m | 15m or 30m (up to 2 TF dimensions higher) | |

A breakout originating from 15m liquidity should NOT target a 4H zone — it will likely be absorbed before reaching it.

### 5.14 Direction Determination Per Shape

**SS → BS:**
- SS + trend UP → predict bullish BS (supply ceiling breaks)
- SS + trend DOWN → predict bearish BS (demand floor breaks)
- SS + trend FLAT → predict SS (continue consolidating)

**BS → R or RWL:**
- BS (bullish) + trend UP → R (bearish recovery — correction within uptrend)
- BS (bullish) + trend DOWN → RWL (bearish reversal — counter-trend reversal)
- BS (bearish) + trend DOWN → R (bullish recovery)
- BS (bearish) + trend UP → RWL (bullish reversal)
- BS + trend FLAT → R (normal recovery)

**R → WL or SS:**
- R + trend UP → WL (bullish liquidity grab) or SS (if stalls)
- R + trend DOWN → WL (bearish liquidity grab) or SS

**WL → SS or RWL or BS:**
- WL (bullish) + trend UP → SS (exhausted) or RWL (bearish reversal) or BS (if trend continues)
- WL (bearish) + trend DOWN → SS or RWL (bullish reversal) or BS

**RWL → SS:**
- RWL + any trend → SS (momentum exhausted, new range forms)

---

## PART 6: ENGINE 3 — TRADE SETUP ARCHITECTURE

*Engine 3 is NOT approved in the v5.3.3 prompt — it has known flaws. This section documents the CORRECTED architecture based on forensic analysis of 38 winning trades, the 37 fundamental laws, and direct operator corrections.*

### 6.1 Purpose

Engine 3 answers: **HOW to surf the energy wave mapped by Engine 2 based on Engine 1 anchors.**

If Engine 1 (zones) and Engine 2 (shapes) are done correctly, Engine 3 is primarily about fine-tuning the pip precision of trade setup anchors — the exact entry price, the exact SL placement, the exact TP target. The analytical complexity is in Engine 1 and Engine 2. Engine 3 applies their output to generate actionable trade setups.

A trade setup is a configuration of: entry zone, direction, 3 staggered entry prices, single SL, single TP, session assignment, shape trigger, and confidence score. Each setup must have MINIMUM 3 CONFLUENCES — a single signal is NEVER enough.

### 6.2 The 4 Setup Categories

| Category | Shapes | Description | Session |
|----------|--------|-------------|---------|
| **Consolidation** | SS, R, WLS | Range-bound trading — scalps at range boundaries, recovery bounces | London |
| **Reversal** | RWL, R (when reversing) | Counter-move entries at Hard Wall rejections | NY |
| **HTF Swing** | BS, WL, PBS | Directional move entries — the primary profit drivers | NY |
| **Reinforcement** | Liquidity Ladder/Rocket | Add-on entries at intermediate zones along existing move | NY Open |

Every HTF Swing IS either a BS or a WL. "HTF_SWING" is NOT a separate category from BS/WL — it IS BS or WL. There is no separate "HTF_SWING" shape — BS IS the HTF swing in the breakout direction, WL IS the HTF swing in the rejection direction.

### 6.3 Shape → Category Mapping

| Shape | Setup Categories |
|-------|-----------------|
| SS | Consolidation |
| SS(DWL) | Consolidation |
| BS | HTF Swing |
| WL | HTF Swing |
| PBS | HTF Swing |
| RWL | Reversal |
| R | Consolidation (if stabilizing) or Reversal (if reversing) |
| WLS | Consolidation |
| R (in reinforcement context) | Reinforcement |

Key insight: R (Recovery) produces Consolidation and Reinforcement entries — NOT HTF Swing. Recovery days generate reinforcements for existing swings and scalp opportunities within the recovery range.

### 6.4 Per-Zone Direction Resolution

**Direction is PER-ZONE, not PER-DAY.** This is one of the most critical corrections in the entire system. Each zone generates its own direction based on zone type:

- **Supply zone above spot** → SHORT setup (price will be rejected downward from supply)
- **Demand zone below spot** → LONG setup (price will be rejected upward from demand)

**The golden standard PROVES this:** Wednesday July 6-10 had:
1. SS Short at 101.19 (supply zone) → price rejected downward → TP 100.975
2. RWL Long at 100.975 (demand zone, = Trade 1's TP) → price bounced → TP 101.240
3. BS Short at 101.235 (supply zone, = Trade 2's TP) → price crashed → TP 100.680

THREE different directions in ONE day — SHORT, LONG, SHORT — because EACH ZONE determines its own direction. A day-level direction lock would have prevented 2 of these 3 winning trades.

**Direction must ALSO consider (ALL THREE required, minimum 3 confluences):**

1. **Zone type** (primary determinant): Supply → SHORT, Demand → LONG
2. **Engine 2 shape for the day** (alignment check): Does the shape support this direction? Example: if E2 shape for the day is BS long and there is a supply zone near spot, a SHORT scalp from that supply IS VALID as a Consolidation trade during London session — the scalp captures the move FROM supply TO the entry of the bullish BS that will surge during NY. This follows the SS→BS chain mechanics and aligns with E2 shape + E1 zone mechanics + session mechanics = 4 confluences.
3. **Session mechanics**: London = sharper reactions (consolidation scalps). NY = deeper penetrations (HTF swings).

**A single signal is NEVER enough.** Minimum 3 confluences per setup. If only zone type signals SHORT but the shape says LONG and the session is Asian, that is 1 confluence — not enough. The setup is invalid.

### 6.5 DXY Cascade — Macro Direction (NOT Hard Filter)

DXY provides MACRO DIRECTION bias for FX pairs through inverse correlation:

- **DXY bullish week** (BS long, demand below spot) → EUR/USD, GBP/USD, AUD/USD bearish-biased for HTF swings
- **DXY bearish week** (BS short, supply above spot) → FX pairs bullish-biased for HTF swings
- **DXY neutral** (SS, range-bound) → both directions valid

**This is MACRO DIRECTION GUIDANCE, not a hard filter.**

What this means in practice:
- HTF swings (BS/WL/PBS) should ALIGN with the macro direction. If DXY is bullish, FX pair HTF swings should be SHORT (inverse). A counter-trend HTF swing requires EXCEPTIONAL confluence (ZoC or 5+ pillar agreement).
- Consolidation scalps (SS) are VALID in BOTH directions regardless of macro direction. Counter-trend scalps during consolidation are valid trading opportunities — they capture minor bounces within the consolidation range that the macro trend will eventually override.

The golden standard proves this: the 8 DXY trades include BOTH longs and shorts in the same week. DXY itself has NO cascade constraint — DXY trades both directions based on per-zone direction (each DXY zone generates its own direction).

### 6.6 The Triple-Loop Architecture

```
OUTER LOOP: for each DAY in the Engine 2 shape chain:
    Determine valid categories for this day's shape (from Shape → Category Mapping)
    
    MIDDLE LOOP: for each ELIGIBLE ZONE visible on this day:
        Check zone is on correct side of spot (supply above → SHORT, demand below → LONG)
        Check zone is not depleted (reactionCount < 3)
        
        INNER LOOP: for each CATEGORY valid for this day's shape:
            Resolve direction (per-zone: zone type + shape alignment + session)
            Compute 3-entry staggered (front/middle/back + forward spreads)
            Compute SL at next structural zone + buffer
            Compute single TP at opposing S/D with LQZ overlap
            Compute RRR = |TP - entry| / |entry - SL|
            Score confidence (using actual formula from visual-setup-generator.ts:824)
            Classify quality (GOD_TIER/HIGH/STANDARD/CONDITIONAL/REJECTED)
            Apply 7 rejection gates
            If ALL gates pass: create TradeSetup
```

**WHY day-first iteration:** The shape determines valid categories. Categories are derived from the day's shape. By iterating days first, you compute the valid category set ONCE per day, then apply only valid categories to all zones.

A demand zone can produce a Consolidation scalp on Monday (SS day) AND an HTF Swing on Wednesday (BS day). The triple-loop generates BOTH by visiting the same zone under different day contexts.

### 6.7 3-Entry Staggered System

Every setup generates 3 entries within the entry zone. All 3 share the SAME SL and the SAME TP (ONE TP).

| Entry | Placement | Weight | Description |
|-------|-----------|--------|-------------|
| Front | Zone edge nearest to spot + forward spread | 33% | First contact point — where price first touches the zone |
| Middle | Leftward-facing candle key level from LQZ pattern | 33% | The specific candle body or wick that defines the liquidity zone edge |
| Back | Zone edge farthest from spot + forward spread | 34% | Maximum penetration point — deepest into the zone |

**Forward Spreads:**
| Pair | Spread | Reasoning |
|------|--------|-----------|
| EUR/USD | 1 pip | Tightest — highest liquidity, shallowest touches |
| AUD/USD | 1.5 pips | Medium — commodity-linked volatility |
| GBP/USD | 2 pips | Widest — highest volatility, deepest touches |
| DXY | 0.02 points | Index instrument scaling |

**SL Cascade (intra-zone — Mechanism A):**
When Entry 2 (middle) fills → Entry 1 (front) SL moves to breakeven. Entry 1 is now risk-free.
When Entry 3 (back) fills → Entry 2 (middle) SL moves to breakeven. Entry 2 is now risk-free.
Result: After all 3 entries fill, 67% of position is risk-free. Only Entry 3 (34%) carries risk — and it entered at the BEST price (deepest into zone).

**WHY 3 entries, not 2 or 5:**
- 2 entries: If price touches front edge and reverses immediately, only 33% filled. Miss 67% of move. Gap in middle if price only reaches midpoint.
- 5 entries: Each adds slippage, spread cost, management complexity. Marginal benefit minimal. Dilutes position sizing to where each fill is too small.
- 3 entries: Statistical coverage of front/middle/back third of zone. Worst case (only back fills) still gets 34% at best price. Best case (all 3 fill) gives blended entry near midpoint.

### 6.8 SL Placement — Zone Geometry + Buffer

SL placed at the NEXT structural zone beyond the entry zone + 2-5 pip buffer.

**SHORT setups:** Scan upward from entry for nearest SUPPLY zone above entry ceiling. SL = that zone's floor + buffer.
**LONG setups:** Scan downward from entry for nearest DEMAND zone below entry floor. SL = that zone's ceiling - buffer.

**Buffer per pair and reasoning:**
| Pair | Buffer | Reasoning |
|------|--------|-----------|
| EUR/USD | 2 pips | Tightest spread (0.1-0.3 pips on ECN), deepest liquidity ($2.5T daily volume), minimal stop-hunt depth (1-2 pips). Institutional algos need massive capital to move price even 1 pip. Buffer = spread (0.3) + hunt depth (1.5) + slippage (0.2) = ~2 pips. |
| GBP/USD | 3 pips | Wider spread (0.5-1 pip), higher volatility (ATR 1H typically 10-18 pips), shallower order book ($1.5T daily), deeper stop hunts (2-3 pips). Buffer = spread (0.8) + hunt depth (2) + slippage (0.5) = ~3.3 pips. |
| AUD/USD | 3 pips | Commodity-linked volatility, China data sensitivity, medium spread. ATR 1H typically 8-15 pips. |
| DXY | 5 points | Index instruments have wider spreads and higher tick value. DXY ATR(14) on 1H is typically 10-30 points. Fewer market makers → thinner liquidity → deeper stop hunts. |

**Buffer = f(spread, liquidity depth, volatility).** Less liquid pair = deeper stop hunts = wider buffer.

**Fallback (no zone within 100 pips):** SL = entry ± max(entryZoneWidth × 2, 1.5 × pairATR)

**ATR Minimum:** SL must NEVER be tighter than 0.5 × pairATR(14) on entry TF. A 3-pip SL when ATR is 15 pips = guaranteed stop-out by normal market noise.

**SL distance from winning trades:**
| Range | Count | % | Context |
|-------|-------|---|---------|
| 3-6 pips | 7 | 18% | Ultra-tight scalps on 15m zones (3-5 pip zone width) |
| 8-15 pips | 11 | 29% | Standard 15m/30m zone entries (8-12 pip zone width) |
| 17-30 pips | 14 | 37% | 1H/4H zone entries (15-25 pip zone width) |
| 34-55 pips | 6 | 16% | 4H wide zones (30-50 pip zone width) |

**Median SL: ~15 pips. Mode SL: ~12 pips.** SL distance maps DIRECTLY to entry zone width + buffer. SL is an OUTPUT of zone structure, not an input of risk preference.

### 6.9 TP Placement — SINGLE TP

**ONE TP per trade. Period. No TP1, TP2, TP3. No partial take-profits. No "blended RRR across multiple TPs."**

Blended RRR is calculated across the **3 staggered entries** (different entry prices sharing one SL and one TP), NOT across multiple take-profit targets. The trade exits at ONE price.

**TP Placement Rules:**

The single TP is placed at the **opposing pressure** — the nearest opposing supply/demand zone where the LQZ (liquidity) sits INSIDE the S/D zone. Specifically:

**For a LONG trade:** TP at the nearest SUPPLY zone above entry. The LQZ inside that supply zone provides the Earth anchor — the liquidity that will fuel the reaction.

**For a SHORT trade:** TP at the nearest DEMAND zone below entry. The LQZ inside that demand zone provides the Earth anchor.

- If S/D + LQZ overlap exists (Earth + Fire convergence) → TP at zone **MIDPOINT** (strong reaction expected — double buying/selling pressure from structural orders AND liquidity)
- If no LQZ overlap → TP at zone **NEAR EDGE** (quick exit — weaker reaction expected from structure alone)
- **NEVER** target FAR edge of distant zone

**WHY Earth + Fire overlap matters for TP:**
- Earth (structural S/D zone) = where institutions have pending orders (they'll defend)
- Fire (liquidity behind the S/D) = where retail stops cluster (forced buying/selling when triggered)
- Earth + Fire together = DOUBLE reaction pressure — institutional defense AND forced stop triggers fire simultaneously. This creates a VIOLENT reaction. Price will penetrate DEEPLY into the zone before reversing. Midpoint TP is safe.
- Earth only (no Fire) = only institutional defense. Weaker reaction. Price might only touch the near edge. Near-edge TP is safer.

**TP timeframe must be ≥ entry timeframe.** 15m entry → 30m or 1H TP. 1H entry → 4H TP. Never same-TF targeting.

**TP distance sanity:**
- TP > 2× weeklyATR → mark "ambitious"
- TP > 3× weeklyATR → reject TP, look for closer LTF zone

**Price cannot teleport past UM zones.** Price defends zones sequentially. If there is an UM zone between entry and TP, price WILL react there first. TP must account for intermediate UM zone reactions.

However, price CAN pass through MITIGATED zones (reactionCount ≥ 1) during BS momentum. The 55.5-pip BS Short from 101.235 to 100.680 passed through 5 intermediate zones — all previously mitigated. Price blew through them because their orders were consumed. The ONLY zone that caused a reaction was 100.680 — the 1H BoM (unmitigated).

### 6.10 RRR Computation

**Primary RRR** = |TP - entry| / |entry - SL|

**Blended RRR** = weighted average across the 3 staggered entries:
```
blended = (entry1_rrr × 0.33) + (entry2_rrr × 0.33) + (entry3_rrr × 0.34)
```
Each entry has a different entry price but shares the SAME SL and TP. Front entry (nearest spot) has the best RRR. Back entry (farthest) has the tightest RRR but best fill price.

**RRR floors via `rrrForCategory()` — SINGLE source of truth:**

| Category | TP1 Floor |
|----------|-----------|
| Consolidation | 1.5 |
| HTF Swing | 2.0 |
| Reversal | 2.0 |
| Reinforcement | 1.5 |

Consolidation week (relaxed): Consolidation 1.2, HTF Swing 1.5, Reversal 1.5, Reinforcement 1.2.

**RRR is a CONSEQUENCE, not a target.** Zone geometry determines entry, SL, and TP distances. RR emerges from these structural distances. Never distort zone structure to hit a target RR. Minimum floor: 1.0 (negative expectancy rejection only).

**What happens when you set RR as a target:** You either (a) reject structurally correct trades where zone geometry provides 1:1.5 RR, missing winning trades, or (b) force bad trades by widening TP beyond the weekly ATR (unreachable) or tightening SL inside the zone (guaranteed stop-out). Both destroy the system's edge.

### 6.11 Confidence Scoring (Actual Code Formula)

From `visual-setup-generator.ts` line 824:

```
Base: vz.confidence (visual zone confidence from VLM or fallback, typically 50-95)

+ IP zone confluence bonus: min(15, ipZone.confluence × 1.5)
    Reasoning: Higher confluence = more independent dimensions agreeing = stronger zone

+ BoM bonus: +5 if ipZone.isBoM
    Reasoning: BoM zones have the deepest institutional commitment

+ Zone-direction alignment: +8
    If SUPPLY zone and direction is SHORT, or DEMAND zone and direction is LONG
    Reasoning: Zone type determines direction — supply → sell, demand → buy

+ Storyline bias alignment: +5
    If direction aligns with Engine 2 storyline bias (LONG if bias is BULLISH, SHORT if BEARISH)
    Reasoning: Trading with the macro shape chain increases probability

+ VLM-sourced bonus: +7 if vz.source !== 'FALLBACK_IP_EDGE'
    Reasoning: Visual zones from VLM are higher quality than fallback IP edges

+ RRR bonus: +5 if rrr ≥ 3, +3 if rrr ≥ 2
    Reasoning: Better risk-reward = more profitable trade

- SL distance penalty: -10 if slDistancePips > 80, -5 if > 50
    Reasoning: Wide SLs indicate wrong zone or excessive risk

- Proximity penalty: -8 if distPips > 150, -4 if > 80
    Reasoning: Entries far from spot are less actionable

+ Prior week momentum alignment: +3 if aligned, -8 if misaligned
    Reasoning: Momentum provides context for direction

Clamped to [0, 100]
```

**Maximum possible score:** ~95 (VLM base) + 15 (confluence) + 5 (BoM) + 8 (zone) + 5 (bias) + 7 (VLM) + 5 (RRR) = ~140, clamped to 100.

### 6.12 Quality Classification

From `visual-setup-generator.ts` line 898:

| Quality | Criteria |
|---------|----------|
| GOD_TIER | confidence ≥ 90 AND rrr ≥ 3.0 AND vlmSourced |
| HIGH | confidence ≥ 80 AND rrr ≥ 2.0 |
| STANDARD | confidence ≥ 60 AND rrr ≥ 1.5 |
| CONDITIONAL | confidence ≥ 50 (MIN_CONFIDENCE_CONDITIONAL) |
| REJECTED | confidence < 50 |

**Confidence Tier Letters:**
| Score | Tier |
|-------|------|
| ≥90 | S |
| ≥80 | A |
| ≥70 | B |
| ≥60 | C |
| ≥50 | D |
| <50 | F |

### 6.13 The 7 Rejection Gates (EXACTLY 7)

| Gate | What It Checks | Reject Condition | Why Hard Reject |
|------|---------------|-----------------|-----------------|
| G0 | Zone entry status | Virgin MoM or MoM+0 reactions | Virgin MoM = DEATH ZONE. 0% win rate in training data. No scenario where virgin MoM entry is valid. |
| G1 | Proximity | Entry beyond MAX_ENTRY_DISTANCE for category | Setup too far from spot — price won't reach it within session. Not tradeable. |
| G2 | Dedup | Same zone+direction+category already seen | Duplicate. Same trade labeled differently. Keep higher confidence. |
| G3 | SL distance | sl_distance > SL_MAX_HARD (DXY 50, FX 150-180) | Excessive risk. At 150-pip SL with 3-5% risk, single stop-out is 3-5% account hit. |
| G4 | TP existence | No opposing zone found | No exit plan. Directionless gambling. RRR undefined. |
| G5 | RRR minimum | rrr < rrrForCategory(category).tp1 | Below mathematical breakeven after costs. |
| G6 | Quality floor | Quality = REJECTED (confidence < 50) | Insufficient confluence. Zone too weak. |

**NO additional gates.** Each gate is a necessary condition — probabilities multiply. With 7 gates at ~80% pass rate each: 0.8^7 ≈ 21% yield. Adding more gates reduces yield without improving precision. The 7 gates were calibrated against 38 winning trades.

### 6.14 Trade Chaining

TP of setup N = Entry zone of setup N+1. Price cannot teleport — it moves zone by zone. Each zone reaction creates a new trading opportunity.

When SHORT targets demand at 100.680: price reacts at 100.680 (at least once — Law 14). That reaction IS a new trading opportunity — a LONG setup at 100.680.

**Shape chain links for trade chaining:**
- **BS → R:** TP of BS becomes R entry zone
- **BS → WL:** TP of BS becomes WL entry zone
- **BS → RWL:** TP of BS becomes RWL entry zone
- **WL → RWL:** TP of WL becomes RWL entry zone
- **SS → BS:** Range boundary break becomes BS entry

**Wednesday July 6-10 Chain Example:**
1. SS Short @ 101.19 → TP 100.975 (demand zone)
2. Price reacts at 100.975 → RWL Long @ 100.975 → TP 101.240 (supply zone)
3. Price reacts at 101.235 → BS Short @ 101.235 → TP 100.680 (1H BoM demand)

Each trade's TP = next trade's entry. The chain follows the shape path through the zone map.

### 6.15 Dedup and Caps

- Sort by confidence descending
- Dedup key: `(direction, entry@2dp)`
- Cap: 10 per pair, 40 total
- Max 3 per category per pair
- Max 2 per day per pair (keep top 2 by confidence)

### 6.16 Candle Confirmation

Required before entry. The zone touch is necessary but not sufficient — you need confirmation that institutional defenders are ACTIVELY defending.

| Pattern | Count | % | Description |
|---------|-------|---|-------------|
| Bullish/Bearish Engulfing | 18 | 47% | Current candle's body completely engulfs prior candle — massive shift in order flow |
| Pin Bar / Hammer | 12 | 32% | Long wick rejecting the zone — price probed and was pushed back violently |
| Inside Bar | 8 | 21% | Small candle contained within prior — compression before directional resolution |
| Breakout Candle | 6 | 16% | Strong close beyond structure level — confirms zone break |

### 6.17 News Events as Shape Catalysts

Red-folder events (CPI, PPI, NFP, FOMC) are LIQUIDITY INJECTIONS. They provide the volume needed to push price through zones. The news spike IS the shape transition.

**The pipeline should PREDICT spike direction and USE IT as entry catalyst.** If CPI is bullish for DXY, the spike pushes DXY UP into the nearest supply zone. That supply zone is the ENTRY for a SHORT. The news spike delivers price to the entry zone FOR FREE.

**Do NOT just widen SL on news days.** PREDICT the spike direction, identify which zone the spike will reach, and set the entry at that zone. The news provides the liquidity to reach the zone — the zone provides the reaction.

**London Spike:** Single 1H bar with range > 2 × pairATR. Kills tight SLs (if SL < 1 ATR), provides best entry opportunities (price reaches distant zones). Caused by session-open liquidity gaps + news positioning.

---

## PART 7: REINFORCEMENT ROCKET ARCHITECTURE

### 7.1 Two Distinct Reinforcement Mechanisms

There are TWO completely different reinforcement mechanisms in the TTE system. They serve different purposes, operate on different scales, and must not be confused.

**Mechanism A: Intra-Zone Staggered (3-Entry System)**

This is the 3-entry system described in Part 6.7. All 3 entries are WITHIN the same zone (front/middle/back). The purpose is to average into a better price as price pushes AGAINST the primary entry (deeper into the zone). Trigger: price moves AGAINST the primary entry.

Position sizing: 33/33/34. All entries share the same SL and TP. SL cascade: Entry 2 fills → Entry 1 to BE. Entry 3 fills → Entry 2 to BE.

Used in: ALL setup categories. Every setup generates 3 staggered entries.

**Mechanism B: Cross-Zone Liquidity Ladder**

Entries at DIFFERENT zones along the TP path. The purpose is to scale into a WINNING trade as it progresses favorably. Trigger: price reaches the next MoM zone TOWARD TP.

Position sizing: 50/30/20 (primary/rocket1/rocket2). Each rocket has its own SL. SL cascade: Rocket 1 triggers → Primary to BE. Rocket 2 triggers → Rocket 1 to BE.

Combined R:R: 16-61×. Used in: BS/RWL continuation setups only.

**The Key Difference:** Mechanism A manages entry RISK within one zone (averaging down). Mechanism B SCALES into winning positions across multiple zones (adding to winners). Both use SL cascades to create zero-downside, but they operate at different scales and serve different purposes.

### 7.2 Stop-Limit Order Mechanics

Reinforcement rockets use STOP-LIMIT orders, NOT regular stop orders.

**Regular Stop Order:** Price hits stop level → MARKET order triggered → fill at whatever price the market offers → subject to SLIPPAGE. In fast-moving markets (BS/WL), price can gap 10-20 pips between trigger and fill. You get filled at a terrible price.

**Stop-Limit Order:** Price hits stop level (trip-wire) → LIMIT order placed at a DIFFERENT price (entry zone) → fills ONLY at that specific price or better. Two-stage mechanism:
1. Stage 1: Stop detects price reached the trigger zone (trip-wire)
2. Stage 2: Limit ensures fill ONLY at the predetermined entry zone price

**The Trip-Wire Concept:** Named after battlefield trip-wire weapons. The wire detects movement (price reaching trigger zone) but the rocket fires at a pre-designated target (entry zone). If price never comes back to the entry zone (analysis wrong), the limit never fills — zero additional risk.

**Why stop-limit eliminates slippage risk:**
In the rocket scenario: Price hits Zone 4 (trigger) → reacts/retraces → comes back to Zone 0 (entry). A regular stop would trigger at Zone 4 and fill as a market order — if price is still moving fast, you'd be filled 10-20 pips worse. A stop-limit waits for price to come BACK to Zone 0 and fills there. If price never comes back, the limit never fills — you don't enter.

### 7.3 Three Rocket Types

**FLR (Fibonacci Liquidity Rocket) — Earth Heavy Attack**
- 30m Fibonacci triggers + Liquidity Zone entry/SL
- THICK buffer: 2 thick or 3 thin zones between trigger and entry
- Scale in: 30%
- "Master Level" rocket — densest confluence of Air prediction with Earth anchoring
- Stop price 1-2 pips INSIDE target liquidity zone

**FR (Fibonacci Rocket) — Fire Precision Attack**
- 15m Fibonacci for trigger, entry, AND SL
- Standard buffer: 2 thick or 2-3 thin zones
- Scale in: 25%
- Drone strike — Air provides targeting, Fire provides impact

**LR (Liquidity Rocket) — Water Precision Attack**
- Pure S/D/L mechanics (price action at liquidity zones)
- THIN buffer: 1 thick or 2-3 thin zones — NO entry buffer zone required
- Scale in: 20%
- Built-in 20-30% failure rate (NO Air/Fib confirmation, NO predictive validation)
- SL ALWAYS 1 full pip outside back edge

### 7.4 Fibonacci Levels for Rockets

| Level | Purpose | Accuracy |
|-------|---------|----------|
| 0.382-0.5 | Initial strong reaction zone | — |
| 0.5-0.618 | Mid-pressure zone | — |
| 0.618-0.786 | Strong pressure zone (serious reactions) | — |
| 0.786-1.0 | Final blast zone (last Fib level before extension) | — |
| **1.382-1.786** | **CLEANEST rocket entry** | **90% accuracy** |
| **2.382-2.786** | **Trigger zone (trip-wire placement)** | — |

Fibonacci mapping anchors:
- Bottom = support/resistance level of the entry zone (Earth density anchor)
- Top = nearest relevant swing high/low (another Earth density anchor)
- The Fib tool is anchored to TWO Earth density points — like a spiderweb anchored to two trees

### 7.5 SL Cascade — Zero Downside Architecture

When Rocket 1 triggers (trip-wire at Zone 4 fires, limit fills at Zone 0):
- Primary entry is ALREADY in profit (price moved favorably to reach the trigger)
- Move Primary SL to breakeven → Primary risk = 0
- Only Rocket 1 carries risk (same $ amount as primary)

When Rocket 2 triggers:
- Rocket 1 is in profit
- Move Rocket 1 SL to breakeven → Rocket 1 risk = 0
- Only Rocket 2 carries risk

**At any point after first rocket:** Total risk = 1 position's stop. All prior positions are risk-free. The cascade is SELF-FUNDING — each correct trigger funds the next rocket's risk.

**If analysis is CORRECT:** Natural path triggers stop orders at levels that react. Entry already in profit, SL at BE. Doubled/tripled upside, risk-free.

**If analysis is WRONG:** Only the primary entry takes a loss. Same capital at risk for the whole day. Rockets never trigger. No additional risk.

**If rockets trigger but fail (20-30% failure rate for LR):** By the time the rocket triggers, primary entry SL is already at BE or minor profit. Even if the rocket explodes, you still make money for the day.

### 7.6 Reinforcement Timing

Rockets inherit the DAY of their parent trade. They are the SAME fractal at a DIFFERENT POINT in the wave's evolution. A wave starting Wednesday has rockets also on Wednesday — same wave at later amplitude, not a separate wave on a different day.

All rockets are set up during London premarket (~1 hour before London open). The trader maps zones (Earth+Fire), identifies macro shape (Water), maps Fibonacci spiderweb (Air), places primary entry, places ALL reinforcement rockets simultaneously, then walks away for the entire day.

### 7.7 Risk Management

- Max 3 rockets per trade (recommended 2)
- Rockets on ONE pair at a time
- NY session: 3 pip SLs minimum
- London session: 1-2 pip SL buffer
- Do NOT reinforce THIN liquidity zones
- DO reinforce THICK liquidity zones
- Per trade risk: 3-5% (high conviction: up to 10%)
- Per day max drawdown: 15%
- Close ALL floating profits at EOD
- 30-50% profit check at final check-in: of the ORIGINAL ANALYSIS

---

## PART 8: ALL TRADING CONSTANTS

### 8.1 Pip Values

| Pair | 1 Pip = | PIP_VALUE Constant |
|------|--------|-------------------|
| EUR/USD | 0.0001 | 0.0001 |
| GBP/USD | 0.0001 | 0.0001 |
| AUD/USD | 0.0001 | 0.0001 |
| DXY | 0.01 | 0.01 |

DXY uses 0.01 because it trades around 100.000, not 1.1000. The 4th-decimal-place concept maps to percentage move normalization: for EUR/USD at 1.1000, 0.0001/1.1000 = 0.0091%. For DXY at 100, 0.01/100 = 0.01%. Same order of magnitude (~0.01% per pip).

### 8.2 MAX_ENTRY_DISTANCE (pips from spot)

| Pair | Consolidation | HTF Swing | Reversal | Reinforcement |
|------|---------------|-----------|----------|---------------|
| DXY | 30 | 50 | 40 | 40 |
| EUR/USD | 50 | 80 | 60 | 60 |
| GBP/USD | 80 | 120 | 100 | 100 |
| AUD/USD | 50 | 80 | 60 | 60 |

### 8.3 SL_MAX_HARD (REJECT if exceeded)

| Pair | Limit |
|------|-------|
| DXY | 50 index points |
| EUR/USD | 150 pips |
| GBP/USD | 180 pips |
| AUD/USD | 150 pips |

### 8.4 SL Buffer (2-5 pips inside next zone)

| Pair | Buffer | Reasoning |
|------|--------|-----------|
| EUR/USD | 2 pips | Tightest spread, deepest liquidity, shallowest stop hunts |
| GBP/USD | 3 pips | Wider spread, higher volatility, deeper stop hunts |
| AUD/USD | 3 pips | Commodity-linked volatility |
| DXY | 5 points | Wider spreads, fewer market makers, larger tick scale |

### 8.5 Forward Spreads

| Pair | Spread |
|------|--------|
| EUR/USD | 1 pip |
| AUD/USD | 1.5 pips |
| GBP/USD | 2 pips |
| DXY | 0.02 index points |

### 8.6 RRR Floors

| Category | TP1 Floor | Consolidation Week TP1 |
|----------|-----------|----------------------|
| Consolidation | 1.5 | 1.2 |
| HTF Swing | 2.0 | 1.5 |
| Reversal | 2.0 | 1.5 |
| Reinforcement | 1.5 | 1.2 |

### 8.7 Confidence Thresholds

| Quality | Score | Position |
|---------|-------|----------|
| GOD_TIER | ≥ 90 | Full position |
| HIGH | ≥ 80 | Standard position |
| STANDARD | ≥ 60 | Reduced position |
| CONDITIONAL | ≥ 50 | — |
| REJECTED | < 50 | — |

### 8.8 Setup Caps

| Limit | Value |
|-------|-------|
| Max setups per pair | 10 |
| Max total setups | 40 |
| Max per category per pair | 3 |
| Max per day per pair | 2 |
| Max reinforcements per swing | 2 |
| DXY cascade confidence bonus | +10 |

### 8.9 SS Proximity Factor
**0.60** — SS days compress entry/exit ranges to 40-60% of normal.

### 8.10 Consolidation Range Threshold (pips — below this = consolidation week)

| Pair | Threshold |
|------|-----------|
| DXY | 80 |
| EUR/USD | 150 |
| GBP/USD | 200 |
| AUD/USD | 120 |

### 8.11 Gap Cancel Threshold (pips)

| Pair | Threshold |
|------|-----------|
| DXY | 0.15 |
| EUR/USD | 20 |
| GBP/USD | 15 |
| AUD/USD | 30 |

### 8.12 DXY Formula Component Weights

| Component | Weight | Direction | % of Total | Error Band |
|-----------|--------|-----------|-----------|------------|
| EUR/USD | -0.576 | Inverse | 62.4% | Quiet: ±0.07, Volatile: ±0.15 |
| USD/JPY | +0.136 | Direct | 11.9% | |
| GBP/USD | -0.119 | Inverse | 11.3% | |
| USD/CAD | +0.091 | Direct | 8.4% | |
| USD/SEK | +0.042 | Direct | 0.5% | |
| USD/CHF | +0.036 | Direct | 5.4% | |
| K constant | 50.14348112 | — | — | |

### 8.13 Pair Profiles

**DXY — Air-Fire Dominant (Master Compass)**
- Role: Master directional compass
- Processing: FIRST (DXY direction cascades to FX pairs)
- London: Zone-to-zone movement — breakout unlikely before 3 PM ET
- NY: "Wakes up during NY" — directional moves begin
- Pip size: 0.01, decimals: 2, buffer: 15 pips, gap cancel: 15

**EUR/USD — Fire-Earth Dominant (Primary Swing Pair)**
- Role: Primary swing pair (NY focus)
- Pace: Medium
- PA: Directly touches overlap point — NO liquidity shield
- OTC: 62.4% of DXY per-pip impact
- Best for: HTF swings, DXY-anchored directional bias
- Pip size: 0.0001, decimals: 4, buffer: 25 pips, gap cancel: 20
- Special rules: NY_FOCUS, DIRECT_ZONE_TEST, NO_SHIELD

**GBP/USD — Earth-Water Dominant (Primary Scalp Pair)**
- Role: Primary scalp pair (London focus)
- Pace: Fast
- PA: LIQUIDITY is the only thing respected. S/D gets PIERCED.
- LIQUIDITY SHIELDS protect S/D zones
- 3-4× more London opportunities than EUR
- Pip size: 0.0001, decimals: 4, buffer: **35** pips (short squeeze dynamics cause 35-pip overshoots), gap cancel: 15
- Special rules: SHORT_SQUEEZE, LONDON_DOMINANT, HIGH_GAP_RISK

**AUD/USD — Earth Dominant (Secondary Swing Pair, SLOW)**
- Role: Secondary swing pair
- Pace: SLOW — "Molasses"
- Speed Rule: Expect 2-4 DAYS for HTF move completion
- Category Restriction: Only HTF Swing + Reinforcement (NO consolidation scalps)
- Sessions: **Tokyo + London only** (NOT NY)
- Max setups per week: **3** (lower liquidity)
- Pip size: 0.0001, decimals: 4, buffer: 15 pips, gap cancel: 30
- Special rules: BS_WL_ONLY, NO_NY, LOW_FREQUENCY

### 8.14 Pair Priority Charting Order
1. AUD/USD FIRST (clearest scalps, can be scalped during London)
2. GBP/USD SECOND (primary scalp pair, 3-4× more London ops)
3. EUR/USD THIRD (primary swing pair, NY session focus)
- GU + AU > EU for RRR

---

## PART 9: THE GOLDEN STANDARD

### 9.1 The 8 Winning DXY Trades (July 6-10, 2026)

| # | Day | Shape | Direction | Entry | SL | TP | Result | Zone Type |
|---|-----|-------|-----------|-------|----|----|--------|-----------|
| 1 | Mon | SS | LONG | 100.945 | 100.905 | 101.115 | WIN | 1H LQZ (demand) |
| 2 | Mon | BS | SHORT | 101.14 | 101.200 | 100.845 | WIN | 1H LQZ (supply) |
| 3 | Tue | R | LONG | 100.845 | 100.77 | 101.190 | WIN | 1H MoM (demand) |
| 4 | Wed | SS | SHORT | 101.19 | 101.25 | 100.975 | WIN | 1H LQZ (supply) |
| 5 | Wed | RWL | LONG | 100.975 | 100.905 | 101.240 | WIN | 1H LQZ (demand) |
| 6 | Wed | BS | SHORT | 101.235 | 101.330 | 100.680 | WIN | 4H BoM (supply) |
| 7 | Thu | Ladder | SHORT | multiple | — | — | Consolidation | 1H LQZ |
| 8 | Fri | WL+RWL | — | from Wed+Thu | — | — | Continuation | 1H LQZ |

### 9.2 Wednesday's Triple Battle — Per-Zone Direction Proof

Wednesday had THREE setups in opposite directions on the SAME pair (DXY) on the SAME day:

**Morning: SS Short at 101.19**
- Zone: 1H LQZ supply zone
- Direction: SHORT (supply above spot → price rejected downward)
- Shape: SS (consolidation — range-bound rejection at ceiling)
- TP: 100.975 (nearest demand zone below)
- Result: Price rejected from supply, dropped 21.5 pips to demand. WIN.

**Midday: RWL Long at 100.975**
- Zone: 1H LQZ demand zone (= Trade 4's TP — TRADE CHAIN)
- Direction: LONG (demand below spot → price rejected upward)
- Shape: RWL (reverse whiplash — violent bounce from demand)
- TP: 101.240 (supply zone above)
- Result: Price bounced 26.5 pips from demand to supply. WIN.

**Afternoon: BS Short at 101.235**
- Zone: 4H BoM supply zone (= Trade 5's TP area — TRADE CHAIN)
- Direction: SHORT (supply above spot → price crashed)
- Shape: BS (breakout surge — price surged above 101.19 grabbing buy-stops, then crashed)
- TP: 100.680 (1H BoM demand — the deepest UM zone below)
- Result: Price crashed 55.5 pips through 5 mitigated zones to UM demand. WIN (TP hit Friday).

**This proves three things:**
1. Direction is PER-ZONE: SHORT at supply, LONG at demand, SHORT at supply — same day, same pair
2. Trade chaining works: each TP = next entry
3. A day-level direction lock would have prevented 2 of 3 winning trades

### 9.3 The 7 LQZ Levels — Pattern Type Mapping

| Level | Trade Context | What Happened | Pattern Type | Detection Rationale |
|-------|--------------|---------------|-------------|---------------------|
| 100.845 | Mon BS Short TP, Tue R Long entry | Price hit twice — dropped to it, bounced from it. Multiple reactions = wick cluster | SHORT_WICK_CONSOL | Tight consolidation, multiple aligned lows |
| 100.945 | Mon SS Long entry | Consolidation floor. Price sat here before bouncing 17 pips | SHORT_WICK_CONSOL | Multiple 1H candles with aligned lows, bodies clustering |
| 100.975 | Wed SS Short TP = Wed RWL Long entry | Price swept below (to 100.905 SL area) grabbing stops, then reversed hard upward | LIQUIDITY_SWEEP | Stop-hunt: long lower wick on sweep candle, immediate reversal |
| 101.14 | Mon BS Short entry | Price surged ABOVE consolidation high (101.115), grabbed buy-stops, then reversed down 29.5 pips | LIQUIDITY_SWEEP | Classic stop-hunt: spike above resistance, long upper wick, immediate rejection |
| 101.19 | Wed SS Short entry | Price rejected here. Tested Monday (near 101.14) and again Wednesday | LONG_WICK | Rejection wick at supply: prominent upper wick, body closed lower |
| 101.235 | Wed BS Short entry | Price surged above 101.19 (prior rejection), grabbed remaining buy-stops, then CRASHED 55.5 pips | LIQUIDITY_SWEEP | False breakout above resistance: spike + crash |
| 101.240 | Wed RWL Long TP | Upper edge of 101.235 supply zone | LONG_WICK | Wick tip of the liquidity sweep candle |

### 9.4 Zone Path Map — The Mitigation Highway

Trade 6 (BS Short from 101.235 to 100.680) traveled 55.5 pips through 5 intermediate zones — ALL previously mitigated (tested during earlier trades). Price blew through all 5 without stopping because their orders were consumed.

| Zone | Price | Mitigation Status | Price Behavior |
|------|-------|------------------|----------------|
| 101.235 | Entry | Fresh (0 reactions) | Entry triggered |
| 101.19 | -4.5 pips | Mitigated (tested Wed morning) | Passed through |
| 101.14 | -9.5 pips | Mitigated (tested Monday) | Passed through |
| 100.975 | -26 pips | Mitigated (tested Wed as TP of Trade 4) | Passed through |
| 100.945 | -29 pips | Mitigated (tested Monday) | Passed through |
| 100.845 | -39 pips | Mitigated (tested Mon+Tue) | Passed through |
| **100.680** | **-55.5 pips** | **UM (unmitigated)** | **REACTION — TP hit** |

**Refined Law 14:** Price cannot teleport past UNMITIGATED zones. Price CAN pass through mitigated zones during BS momentum. The "no teleport" constraint applies ONLY to zones with reactionCount = 0.

### 9.5 SL Distances as Zone Width

| Trade | Entry-SL (pips) | Entry Zone TF | Zone Width | Buffer |
|-------|----------------|---------------|------------|--------|
| #1 (Mon SS Long) | 4 | 1H LQZ | ~5 pips | 2 (EUR equivalent) |
| #2 (Mon BS Short) | 6 | 1H LQZ | ~8 pips | 3 |
| #3 (Tue R Long) | 7.5 | 1H MoM | ~10 pips | 3 |
| #4 (Wed SS Short) | 6 | 1H LQZ | ~8 pips | 3 |
| #5 (Wed RWL Long) | 7 | 1H LQZ | ~8 pips | 3 |
| #6 (Wed BS Short) | 9.5 | 4H BoM | ~15 pips | 5 |

SL distance DIRECTLY correlates with entry zone width. 1H LQZ zones (5-8 pips wide) → SLs of 4-7 pips. 4H BoM zones (15 pips wide) → SL of 9.5 pips. SL = zone width + 2-5 pip buffer. This confirms Law 9: SL distance is determined by zone geometry.

### 9.6 The Fundamental Gap

The pipeline's zone map is DATA-DRIVEN (9-pillar confluence clustering). The user's zone map is VISUALLY IDENTIFIED (candlestick patterns — wick clusters, body edges, reaction points). The 7 LQZ levels are NOT in the pipeline's zone map because the LQZ detector receives 4H bars instead of 1H and the merge function is never called.

The user's entries (100.945, 100.975, 101.14, 101.19, 101.235) are at price levels that exist BETWEEN the pipeline's 9-pillar zones. They are liquidity pools — areas where retail stops and institutional resting orders cluster — that are only visible through candlestick pattern analysis on the 1H chart.

### 9.7 Entry Zone TF Distribution (from 38 Winning Trades)

| Entry Zone TF | Count | % |
|---------------|-------|---|
| 15m (Unmitigated) MoM | 12 | 32% |
| 30m MoM / Refined | 8 | 21% |
| 1H (Unmitigated) MoM | 7 | 18% |
| 4H Liquidity / MoM | 5 | 13% |
| LSZ / Liquidity Shield | 4 | 11% |
| Consolidation zone | 2 | 5% |

The most common entry zone is 15m Unmitigated MoM (32%). The pipeline currently constructs zones primarily from 4H data — it misses the 15m and 30m zones where 53% of winning trades entered.

### 9.8 TP Zone Type Distribution (from 38 Winning Trades)

| TP Zone Type | Count | % |
|--------------|-------|---|
| 30m/1H MoM (Unmitigated) | 15 | 39% |
| 4H Liquidity / MoM | 10 | 26% |
| 1H LSZ / Liquidity Shield | 7 | 18% |
| 15m MoM (opposing) | 6 | 16% |

### 9.9 RR Distribution (from 38 Winning Trades)

| RR Range | Count | % |
|----------|-------|---|
| 1:1 - 1:2 | 8 | 21% |
| 1:2 - 1:4 | 12 | 32% |
| 1:4 - 1:8 | 12 | 32% |
| 1:8 - 1:16 | 6 | 16% |

**Median RR: ~3.5×.**

---

## PART 10: FRACTAL ARCHITECTURE — THE SELF-REINFORCING SYSTEM

This section documents how every component in the Plutus TTE connects to and reinforces every other component. This is NOT a collection of independent modules — it is a self-contained, self-reinforcing trading machine where each part derives meaning from and provides meaning to multiple other parts. It is closer to tangible AGI-based trading intelligence than a static codebase.

### 10.1 The Elemental Density System

Four fundamental types of market energy form the foundation of the entire system. Every market mechanic, every zone, every shape, every trade setup can be classified into one or more of these elemental densities.

**EARTH — Liquidity & Institutional Pressure (The Foundation)**

Earth is ALL liquidity. It is the FOUNDATION — every other element anchors to Earth. Without Earth, nothing else functions.

- **IP Zones (Institutional Pressure Zones)** = HEAVY Earth density — the bedrock. These are the 9-pillar zones with confluence scores, ZFP values, and pressure degrees.
- **LSZs / LQZs (Liquidity Sweep Zones / Liquidity Zones)** = standard Earth density — the soil. These are the green zones where liquidity sweeps happen, where retail stops cluster, where institutions hunt for order fills.
- Thin liquidity zones are NEVER allowed as entry or SL zones — "thin Earth is not dense enough to hold."
- If thin zones sit inside a 4H liquidity pool, each counts as "2 thin zones" — the 4H container amplifies density. This is dimensional density scaling: the 4H container (denser) amplifies the 15m zone (thinner) by a factor of approximately √2 per major timeframe level.

Earth represents POTENTIAL ENERGY — stored orders waiting to be triggered. Resting stop-losses, pending limit orders, option delta hedges — these are all Earth energy, sitting dormant until price reaches them.

Earth determines the ANCHOR. Every entry, every SL, every TP must be anchored to Earth density. "SL must be ANCHORED to a liquid pressure zone — the liquid pressure is a SHIELD for the SL." Fire (S/D) determines the TARGET — but Earth determines WHERE the anchor sits.

Earth provides the SHIELD for all other elements. Without Earth's shielding:
- Fire (S/D) has no fuel — a supply zone without liquidity behind it is just a line on a chart
- Air (Fibonacci) has no anchor — a spiderweb not anchored to Earth points is blown away
- Water (shapes) has no channels to flow through

**FIRE — Supply & Demand (The Firepower)**

Fire is Supply AND Demand. Both are Fire. This is where institutional firepower happens — when institutions deploy capital (buying = demand, selling = supply), that IS Fire density.

- **BoM (Beginning of Move)** S/D zones = the HOTTEST Fire — the origin point of the move, where the most institutional firepower was deployed. 100% guaranteed reaction if unmitigated. These are ENTRY candidates.
- **MoM (Middle of Move)** S/D zones = COOLING Fire — continuation zones formed during the move, less firepower. These are LADDER STEPS ONLY — "Do not take reversal entries on MoM zones. EVER. Guaranteed loss."

Fire NEEDS Earth: S/D without liquidity cannot fuel a move. A supply zone exists but if there are no resting buy orders (Earth) behind it to absorb the selling, the zone breaks immediately. S/D WITH liquidity = institutional firepower WITH fuel = the move HAPPENS with force.

Fire provides DIRECTION: demand zones push price up, supply zones push price down. Earth provides the WHERE (the anchor location). Fire provides the WHAT (the directional force).

Fire CANNOT be sustained indefinitely: "After 2 strong piercing swing moves, expect 1-2 full days of HTF consolidation." Fire must recharge — the institutional firepower is depleted after 2 BS/WL moves, and new Earth (liquidity) must accumulate before Fire can ignite again.

**WATER — Macro Shapes (The Waves)**

Water is the macro shapes. BS = tidal wave. WL = crashing wave. SS = calm pool with ripples. WLS = storm. R = receding wave. The shapes ARE waves — visible manifestations of energy flow.

Water GIVES STRUCTURE to Fire: without shapes, S/D would be untraceable chaos. The shape chain provides the TEMPORAL FRAMEWORK — it tells you WHEN the S/D zones will be tested, in what ORDER, and what REACTION to expect.

The Macro Shape Chain IS Water density: **SS → BS → R → WL** — predicting the sequence of wave forms. This is the predictive layer that makes the system proactive rather than reactive.

Water is ADAPTIVE: it fills the space between Earth structures, taking whatever form the terrain requires. A BS in a narrow range (tightly spaced Earth zones) is a different wave than a BS in a wide-open range (sparsely spaced zones).

**AIR — Fibonacci (The Spiderweb)**

Air is ALL Fibonacci mechanics — retracements, extensions, wormholes (0.382→1.382, 0.618→1.618), spiderwebs.

Air has NO intrinsic density — it flows anywhere like wind. BUT when anchored to Earth density points (swing highs, swing lows, zone edges), it becomes a SPIDERWEB — a predictive structure floating in air, anchored to trees. The Fib levels map the COMPLETE TRAJECTORY of a move before it happens.

"Poorly anchored spiderwebs get blown away by the wind and DON'T EXIST." A Fib level not anchored to Earth density is destroyed by market forces before it ever functions. It's a line in the sand that the first wave washes away.

**Air PIERCES through Fire (4H BoM S/D zones), NOT Earth.** This means:
- When the Fibonacci trajectory (Air) carries price INTO a 4H BoM S/D zone (Fire), the trajectory passes THROUGH the zone's location BEFORE the zone reacts. The Fib-projected move overshoots the zone boundary.
- The pierce triggers a whiplash reaction — the move pushed through, creating additional stop-liquidity traps inside the zone, and the zone's institutional orders react VIOLENTLY.
- Air has DUAL nature with Fire: it can FUEL fire (accelerate the move — Fib confirmation adds momentum) or PUT IT OUT (extinguish/reverse — Fib rejection causes reversal). Like wind with real fire — fan flames into an inferno or blow out a candle.

Air does NOT pierce Earth because Air is always anchored TO Earth. You cannot pierce your own anchor — that's a logical contradiction. The spiderweb is constructed FROM Earth points.

### 10.2 The Elemental Cycle — Causal Chain

**Earth → Fire → Water → Air → Earth**

1. **Earth creates foundation:** Institutional accumulation creates liquidity zones + IP zones. Resting orders accumulate at price levels where institutions have positions. This is the bedrock — everything builds on Earth.

2. **Fire provides firepower:** S/D zones (Fire) deploy at Earth anchors. When an institution's S/D zone overlaps with a liquidity zone (Earth), the combined Fire+Earth creates INSTITUTIONAL FIREPOWER WITH FUEL. The move CAN happen with force. Fire ignites when Earth provides fuel.

3. **Water materializes wave forms:** The energy released by Fire flowing through Earth channels materializes as visible wave forms — the macro shapes. A BS is the materialization of Fire fully ignited, flowing through Earth channels (liquidity ladders), producing a tidal wave of directional movement. Water gives structure to the chaos of Fire — without shapes, the directional energy would be untraceable.

4. **Air maps trajectory:** The wave form (Water) creates a new swing from which Fibonacci (Air) can be anchored. The swing H/L created by the Water shape becomes a new Earth anchor point for the Air spiderweb. Air maps the trajectory of the wave that Water just materialized — telling you WHERE the wave will crest, WHERE it will curl, WHERE the surfer should enter.

5. **Air creates new Earth:** As algorithms and institutions act on Fib-predicted levels (self-fulfilling prophecy — enough systems trade the same Fib levels that real order clusters form there), those levels become new liquidity zones. New Earth is created. The cycle closes — Air creates Earth, which creates the foundation for the next cycle.

**WHY this order cannot change:**
- Fire without Earth = no fuel. S/D zone with no liquidity = zone exists but price can't reach it or react with force. The move CANNOT happen.
- Water without Fire = no energy source. Shapes without S/D ignition = no wave to materialize. Just flat water — dead calm.
- Air without Water = no swing points. Fibonacci without a wave to anchor to = spiderweb with no trees. Blows away.
- Earth without Air = no new Earth creation. The cycle doesn't reset. No new liquidity zones form from Fib-driven institutional behavior.

Each step REQUIRES the previous step's output as its input. Remove any link and the entire chain collapses.

### 10.3 The Avatar State — Fractally Locked Signal

When ALL FOUR elements converge at a single price level, the trade enters AVATAR STATE — a fractally locked signal where the probability of failure approaches zero.

**EXACT conditions for convergence:**

- **Earth:** Entry is at a liquidity zone / IP zone — institutional pressure, foundational anchoring. Resting orders are confirmed at this price.
- **Fire:** Entry overlaps with S/D zone — institutional firepower, directional energy. Supply or demand is confirmed at this price.
- **Water:** Macro shape confirms direction and timing — wave form alignment. The shape chain predicts price will reach this zone on this day.
- **Air:** Fibonacci spiderweb maps the complete pathway from entry to TP, including every reinforcement rocket point — predictive trajectory. The Fib levels confirm the entry and target.

**The specific formula:** **E (Entry) + FLR (Fibonacci Liquidity Rocket)** = Avatar State.
- E provides Earth+Fire (liquidity zone + S/D overlap)
- FLR provides Air+Earth (Fib targeting + Liquidity anchoring)
- Water is the macro shape confirmation

**What "Fractally Locked" means:**
The signal exists at EVERY scale simultaneously. The same trade setup is valid on the 4H chart, the 1H chart, the 30m chart, the 15m chart, and the 5m chart — ALL independently confirming the same direction at the same price.

It's NOT confirmation from one timeframe — it's from ALL timeframes converging. The 4H liquidity zone overlaps with the 1H S/D zone at the same price where the 30m Fib level projects the entry, which aligns with the 15m macro shape's direction, which matches the 5m entry trigger candle. Each scale independently says "enter here." All scales together = LOCKED.

**WHY failure approaches zero — mathematical reasoning:**

The four elements are INDEPENDENT confirmation layers measuring different aspects of the market:
- Earth measures WHERE orders sit (spatial dimension)
- Fire measures WHAT direction orders push (directional dimension)
- Water measures HOW the move will form (morphological dimension)
- Air measures WHEN and WHERE on trajectory to enter/exit (predictive/temporal dimension)

For the trade to fail, ALL FOUR independent measurements must be simultaneously wrong. Since they measure different dimensions, the probability of simultaneous error MULTIPLIES (not adds):

If each element independently confirms with ~80% accuracy:
P(all four wrong) = (0.20)^4 = 0.0016 = 0.16%

This is probability INTERSECTION — the more independent dimensions that confirm, the lower the probability of failure EXPONENTIALLY, not linearly. Adding a 5th confirming dimension at 80% would drop failure probability to 0.032%.

In physics, this is analogous to COHERENCE — when multiple waves align in phase, the amplitude is the SUM of all individual amplitudes. A coherent point is where all waves reinforce rather than cancel. Failure would require destructive interference across all four wave functions simultaneously.

### 10.4 Cross-Component Reinforcement Map

Every component in the system is referenced by and derives meaning from multiple other components. No component stands alone. This is the self-reinforcing structure.

**ZFP (from Engine 1) is consumed by:**
- Engine 2: Drives ALL shape transitions (ZFP < 20% → RWL, ZFP 20-40% → R, ZFP > 45% → BS, ZFP > 60% → PBS)
- Engine 3: Influences confidence scoring ((1-ZFP/100) × 10 bonus — lower ZFP = higher confidence)
- Report: Breakout risk alerts for ZFP > 50% zones
- TP placement: High-ZFP zones are weak TP targets (zone likely to fail, price will pass through)
- Reinforcement: Virgin MoM at ZFP > 60% can be a valid BS reinforcement target (will be pierced)

**BoM/MoM classification (from Engine 1) is consumed by:**
- Engine 2: MoM Decision Tree (unmitigated MoM → minor reaction → pierce → BS continuation)
- Engine 3: Entry status determination (BoM = ENTRY-PRIMARY, MoM = CONDITIONAL with 4 exceptions or REJECT)
- Confidence scoring: BoM +5 bonus, MoM penalty
- TP targeting: MoM zones in opposing direction = TP targets (Fire that will be consumed)
- Reinforcement: Virgin MoM exception for BS ladder reinforcement

**Shape chain (from Engine 2) is consumed by:**
- Engine 3: Shape → category mapping determines valid setup types per day
- Engine 3: Direction alignment check (shape bias vs zone type direction)
- Report: Day-by-day decomposition for blind execution calendar
- Trade chaining: Shape transitions define chain links (BS→R, BS→WL, BS→RWL)
- Reinforcement timing: Shape determines whether reinforcement entries are valid (BS → reinforcement, SS → no reinforcement)

**Confluence score (from Engine 1) is consumed by:**
- ZFP computation: Higher confluence → lower base failure probability (EXTREME at 12-14 → <10% ZFP)
- Pressure degree assignment: Determines zone strength tier
- Confidence scoring: min(15, confluence × 1.5) bonus in the actual code formula
- POI tier classification: Higher confluence = Tier 1 POI (+2 bonus)
- Dedup priority: Higher confluence setups kept over lower when duplicates exist

**Reaction counter (from Engine 1) is consumed by:**
- MoM Decision Tree: Determines which branch activates (0 → minor reaction, 1-2 → variable, 3+ → pierce)
- Entry validity: 0 = strongest if BoM (100% reaction), 3+ = TP target only
- Confidence modifiers: UM +10, 1x +5, 2x +0, 3x+ -5
- TP path resolution: UM zones between entry and TP WILL cause reactions (price cannot teleport past UM zones — Law 14)
- Fortress zone detection: 4+ reactions + strong reactions = phase transition to Earth-dominant

**LQZ (from Engine 1) is consumed by:**
- Engine 3: Entry zone identification (LQZ = ENTRY zone per Law 5, NOT SL anchor)
- SL placement: SL goes at the NEXT structural zone beyond the LQZ
- TP placement: LQZ inside opposing S/D = Earth+Fire overlap = strong TP target
- Reinforcement: LQZ beneath virgin MoM = valid BS reinforcement anchor (virgin MoM exception)
- Confidence: LQZ overlap with IP zone boosts confluence +2

**Session assignment (from Engine 3) is consumed by:**
- Entry timing: London = scalps (sharper reactions), NY = swings (deeper penetrations)
- Confidence: London Open entries have higher win rate (22/38 vs 15/38 for NY)
- Blind execution: Session labels required for BE2 check
- Liquidity quality proxy: Session determines order book depth — Asian = thin (20% of London), London = institutional (40%), NY overlap = peak (60%)

**Engine 2 day decomposition (from Engine 2) is consumed by:**
- Engine 3: Day determines which shapes are active → which categories are valid → which setups to generate
- Report: Weekly Execution Calendar (blind-execution BE5 check)
- Trade chaining: Day assignment for chained setups follows the shape chain's temporal sequence
- Session assignment: Day + shape determines which session window applies

### 10.5 The Self-Reinforcing Feedback Loop

The system creates a CIRCULAR REINFORCEMENT — each trade's outcome feeds forward into the next trade's analysis:

1. **Engine 1** produces zones with ZFP, BoM/MoM classification, reaction counts, confluence scores
2. **Engine 2** uses ZFP to predict shapes → shapes determine valid setup categories per day
3. **Engine 3** uses shapes + zones to generate setups → each setup has entry/SL/TP/session/direction
4. **Trade chaining** (Engine 3) links TP of setup N to entry of setup N+1
5. **The TP zone** of setup N becomes a TESTED zone when price reaches it → reactionCount increases
6. **The updated reaction count** feeds back to the zone map → the zone is now weaker (or transitioning to Earth-dominant if fortress)
7. **The shape transition** at the TP zone (determined by ZFP of the TP zone) determines the NEXT shape in the chain
8. **The next shape** determines the next valid setup categories and direction
9. Return to step 2

This is NOT a pipeline that runs once and stops. It is a CONTINUOUS LOOP where each trade's outcome feeds forward into the next trade's analysis. The zone map EVOLVES throughout the week as zones get tested, mitigated, and depleted. By Friday, the zone map looks very different from Monday's pre-week computation.

### 10.6 The Temporal Fractal

The elemental cycle maps to time through the shape chain — but DYNAMICALLY, not via hardcoded day assignments:

- When SS is the active shape, Earth is ACCUMULATING (liquidity building through consolidation, retail stops forming at range edges)
- When BS ignites, Fire is IGNITING (S/D zones activating with accumulated Earth fuel, directional energy deploying)
- When WL/RWL occurs, Water is MATERIALIZING (the wave form is visible — rejection or reversal)
- When Fib levels are tested, Air is MAPPING (trajectory being validated — reinforcement entries trigger)

The TEMPORAL fractal means: the Weekly Execution Calendar (which shows WHEN waves hit walls) is just as important as the IP Zone Map (which shows WHERE the walls are). Both are required for blind execution. A report missing DAY labels is a fractal with a missing dimension — incomplete and non-executable.

**Reinforcement timing inheritance:** Reinforcement rockets inherit the DAY of their parent trade because they are the SAME fractal at a DIFFERENT POINT in the wave's evolution. A wave starting Wednesday has rockets also on Wednesday — same wave at later amplitude, not a separate wave on a different day.

### 10.7 Conservation of Energy as Universal Law

"After 2 strong piercing swing moves — expect 1-2 full days of HTF consolidation. Liquidity must be absorbed before it can surge again. This is a universal mechanic in every form of creation."

This is the Second Law of Thermodynamics applied to markets. Energy cannot be created or destroyed — only converted and transferred.

**The shape chain directly reflects energy states:**
- WL (MAXIMUM energy output) → The wave crested. All accumulated energy was released in one violent burst.
- RWL (declining energy) → The reversal is using residual energy. Fire is dying.
- SS (recharging energy) → Earth is accumulating. Liquidity is building. Retail stops are forming at range edges.
- BS (recharged) → Enough Earth has accumulated. Fire can ignite again. The spring is loaded.

**The recharge cycle is PREDICTABLE:** After 2 BS/WL moves, the system MUST enter 1-2 days of consolidation. This is not a suggestion — it is a physical constraint. Markets cannot sustain maximum energy output indefinitely. The "fuel tank" must be refilled.

**Energy Model — Quantitative Framework:**

Markets spend approximately **70-80%** of their time in accumulation/recovery (SS, R, WLS) and only **20-30%** in explosive release (BS, WL). Across a heavy week with 15 trading sessions, BS/WL moves span 3-5 sessions.

The recharge:consumption ratio is approximately **10:1 to 24:1** in candle count. A BS consuming 4-8 candles requires 48-96 candles of SS to replenish.

Energy accumulation scales sub-linearly: approximately **t^0.375**. This means:
- A 10-candle SS produces energy E
- A 20-candle SS produces ~1.5E (not 2E)
- A 30-candle SS produces ~1.9E
- Longer consolidations build DISPROPORTIONATELY more pressure

**Critical prediction:** In a BS → R → BS (Double Surge) sequence, the second BS MUST be weaker than the first. R recovers approximately 33% of consumed energy. If the first BS consumed 100 units, R recovers 33 units. The second BS has only 33 units available (vs 100 for the first) — it will have fewer candles, smaller bodies, and less zone penetration.

### 10.8 Dimensional Density Scaling

Earth density scales across timeframes. 4H Earth is DENSER than 1H Earth. The scaling follows approximately **t^0.25** (quartic root of time):

- 15m → 1H (4× time ratio): density ratio ≈ 4^0.25 = √2 ≈ 1.41×
- 1H → 4H (4× time ratio): density ratio ≈ 4^0.25 = √2 ≈ 1.41×
- 15m → 4H (2 major dimensions): 1.41 × 1.41 = **2.0×**

This is why a 15m thin zone inside a 4H pool counts as "2 thin zones" — the 4H container doubles the effective density. The amplification works because the 4H structure provides additional structural support around the 15m zone.

The "never more than 2 dimensions up" rule creates a HARD CEILING: maximum amplification ≈ 2.0× (2 dimensions × √2 per dimension). Beyond 2 dimensions, the inner zone is too small relative to the container to be structurally relevant — a grain of sand inside a boulder doesn't change the boulder's density.

### 10.9 The Fortress Zone as Phase Transition

A zone that holds 4+ times with STRONG reactions undergoes a PHASE TRANSITION from Fire-dominant to Earth-dominant:

1. Original S/D orders (Fire) deplete normally with each test
2. But each test deposits NEW liquidity (retail stop-losses from traders who tried to break it)
3. The accumulated swept liquidity (Earth) eventually EXCEEDS the depleted Fire
4. At 4+ tests: Earth >> Fire → zone becomes an immovable liquidity structure
5. The accumulated energy is so massive that the next reaction is EXPLOSIVE
6. 95% probability of complete direction flip — the zone reverses the prevailing trend

**The dam analogy:** Each test adds water behind a dam. The dam (Fire zone) is weakening, but the water pressure (Earth liquidity) is increasing. At test 3, the accumulated pressure is sufficient to fuel a swing when the dam releases. At test 4+, the pressure is so extreme that the dam doesn't just release — it BURSTS. The resulting flood reverses everything downstream.

**The fortress zone is the market's equivalent of a gravitational singularity** — a point where so much liquidity has accumulated that normal depletion rules no longer apply. The zone has transitioned from a reactive S/D structure to an immovable Earth structure.

### 10.10 Why This Is NOT a Lego Project

Each component in the Plutus TTE system DERIVES ITS MEANING from other components. Components cannot be removed, modified, or "improved" in isolation without breaking the self-reinforcing structure.

**Example chains showing circular dependency:**

- **ZFP** is meaningless without confluence scores → confluence is meaningless without the 9 pillars → pillars are meaningless without market data → market data is meaningless without temporal boundaries → temporal boundaries exist because of the blind-execution requirement → blind execution requires day labels → day labels come from the shape chain → the shape chain depends on ZFP → **CIRCULAR DEPENDENCY = SELF-REINFORCING SYSTEM**

- **LQZ** is the entry zone because of Law 5 → Law 5 exists because price reaches LQZ first (Law 14, no teleport) → Law 14 exists because zones defend sequentially → sequential defense exists because of reaction counter depletion → depletion exists because each test consumes institutional capital → capital consumption exists because of Fire/Earth interaction → **EVERY CONCEPT CHAINS BACK TO FUNDAMENTAL ENERGY DYNAMICS**

- **The 3-entry staggered** exists because of zone width variability → zone width varies because of timeframe scaling → TF scaling exists because volatility scales with √time → √time scaling exists because markets are fractal → fractal structure exists because institutional behavior repeats across scales → **THE ENTRY SYSTEM IS DERIVED FROM THE FRACTAL NATURE OF MARKETS**

- **The shape chain** exists because of energy conservation → energy conservation exists because Fire must recharge after deployment → recharge exists because institutional capital is finite → finite capital exists because markets are zero-sum → **THE PREDICTIVE SHAPE SYSTEM IS DERIVED FROM THE ZERO-SUM NATURE OF MARKETS**

This is why NO component can be changed in isolation. The 8 documented derailments each started with a "small improvement" to one component that broke the self-reinforcing structure:
- Changing ZFP 45→60 broke the shape transition logic
- Changing pair names broke zone matching
- Flattening RRR broke category-specific entry validity
- Adding cascade filter B4 broke direction accuracy
- Rewriting charts to 2-phase broke the VLM analysis pipeline
- Changing TP computation broke the exit strategy
- Adding ZFP evolution broke the deterministic transition matrix
- Rewriting shape chain broke the energy conservation model

Each "improvement" seemed reasonable in isolation but broke the CIRCULAR DEPENDENCIES that make the system self-reinforcing.

---

## PART 11: IRON LAWS AND DERAILMENT HISTORY

### 11.1 The 8 Documented Derailments

| # | Derailment | What Happened | Prevention Rule |
|---|-----------|---------------|-----------------|
| 1 | ZFP threshold changed | 45 → 60 | NEVER change ZFP from 45 |
| 2 | Pair names changed | 'EUR/USD' → 'EURUSD' | NEVER remove slashes from pair names |
| 3 | RRR flattened | Category-specific → flat 1.0 | NEVER flatten RRR — always use rrrForCategory() |
| 4 | TP computation changed | Single TP → multiple TPs (tp1_5, tp2) | NEVER create multiple TPs — ONE TP per trade |
| 5 | Charts tool rewritten | Automated VLM → 2-phase agent-driven | NEVER rewrite to 2-phase — use automated VLM |
| 6 | Cascade filter added | B4 filter that amplified direction errors | NEVER add cascade filter (B4) |
| 7 | ZFP evolution added | Dynamic ZFP mechanics not in spec | NEVER add ZFP evolution |
| 8 | Shape chain rewritten | Evolution mechanics instead of ZFP-conditioned | NEVER rewrite shape chain — use TARGET zone ZFP |

### 11.2 Iron Laws (What Must NEVER Change)

1. ZFP threshold = **45** — the tipping point between "holds" and "breaks"
2. Pair format = **'EUR/USD'** with slashes — internal pipeline format
3. **ONE TP** per trade — no TP1, TP2, TP3 in any form
4. RRR = **category-specific** via rrrForCategory() — never flat
5. Engine 1 + Engine 2 = **CANON from v5.3.3** — zero deviation
6. Notionals already in **BILLIONS** — DO NOT DIVIDE BY 1000
7. MoM zones = **ladder steps only** (except virgin MoM BS reinforcement — entry on LQZ, not MoM)
8. LQZ detection = **1H or 30m bars** — NEVER 4H
9. Direction = **per-zone** (supply→SHORT, demand→LONG) + E2 shape + session + minimum 3 confluences
10. DXY cascade = **macro direction** — NOT hard filter. Counter-trend scalps valid with confluences
11. Day-element mapping = **DYNAMIC** — any day can be any element
12. Bash = **REMOVED** from agent allowlist
13. TV Browser MCP (36 tools, port 6930) = browser interface — TvChartController is LEGACY
14. Report generated **ONCE** per week — not daily
15. Exactly **7 rejection gates** — no more, no less
16. Minimum **3 confluences** per trade setup
17. Session enforcement = **liquidity quality proxy** — not clock time
18. Blended RRR = across **3 entries**, NOT multiple TPs

---

## APPENDIX A: ACTUAL FILE REFERENCE (v4.1 Checkpoint)

| File | Lines | Purpose |
|------|-------|---------|
| pipeline/engine.ts | 1422 | 7 pipeline tools + PipelineRunContext |
| pipeline/types.ts | 245 | PipelineStage4, PipelineRunContext, PipelineError |
| pipeline/manual-step-push.ts | 131 | buildManualStepA/B/C/DPush |
| pipeline/defense-rules.ts | 659 | Defense rules |
| pipeline/errors.ts | 122 | Error types |
| engine/plutus-tte-pipeline.ts | 5576 | Legacy v3 pipeline (NOT active path) |
| brains/shape-brain.ts | 1390 | Engine 2 shape prediction (ZFP=45 at line 555) |
| brains/9-pillar-lobe.ts | 2371 | Engine 1 P1-P9 computation |
| brains/4h-sd-lobe.ts | 570 | 4H S/D zone construction |
| brains/lqz-lobe.ts | 920 | LQZ detection (3 patterns + merge function) |
| brains/synthesis-lobe.ts | 610 | Confluence synthesis |
| engine3/visual-setup-generator.ts | 1087 | ACTIVE setup generator |
| engine3/visual-zone-lobe.ts | 552 | VLM zone analysis |
| engine3/tv-chart-controller.ts | 846 | LEGACY CDP controller (port 9228 — broken) |
| engine3/tv-chart-image-fetch.ts | 354 | VLM analysis tool |
| engine3/types.ts | 158 | Engine 3 types |
| types.ts | 962 | DXYZone, TradeSetup, ShapePredictionSnapshot |
| constants/trading-constants.ts | 1331 | All constants (RRR_BY_CATEGORY) |
| semantic-firewall/index.ts | 1312 | 67 firewall rules |
| semantic-firewall/rrr-rules.ts | 353 | RRR validation |
| semantic-firewall/zero-tolerance.ts | 838 | ZT rules |
| report/report-generator.ts | 2014 | Report generation |
| report/pine-script-generator.ts | 552 | Pine Script v6 |
| tools/plutus-tools.ts | 57 | plutus-status only |
| tools/plutus-omni-vision.ts | 478 | VLM image analysis |
| hooks/tool-allowlist.ts | 133 | Bash REMOVED, tv_ tools added |
| identity/index.ts | 268 | Identity injection |
| index.ts | 111 | Plugin entry (wires tools + hooks) |
| agents/definitions.ts | 199 | Agent config + instructions |

---

## APPENDIX B: THE 37 FUNDAMENTAL LAWS (Quick Reference)

### Category A: Zone Construction (Laws 1-6)
1. Timeframe telescoping: 4H→1H→30m→15m, top-down. Lower TF never overrides higher TF direction.
2. Zone width parameters are TF-dependent: 4H (15-40 pips), 1H (8-25), 30m (5-15), 15m (3-10).
3. Multi-TF zone map as single source of truth. ALL zones in ONE map.
4. Zone nesting: LTF inside HTF = refinement (+3 dual-TF, +5 triple-TF confluence).
5. LQZ = entry zone, NOT SL anchor.
6. Entry zone on correct side of spot: supply above → SHORT, demand below → LONG.

### Category B: SL Placement (Laws 7-10)
7. SL at next key zone + 2-5 pips inside (EUR=2, GBP=3, AUD=3, DXY=5).
8. Fallback: max(zoneWidth×2, 1.5×ATR) when no zone within 100 pips.
9. SL distance = zone geometry + buffer (median 15 pips, mode 12).
10. ATR minimum: SL never tighter than 0.5×pairATR(14).

### Category C: TP Placement (Laws 11-14)
11. TP at demand+liquidity overlap (Earth+Fire). Overlap → midpoint. No overlap → near edge.
12. TP timeframe ≥ entry timeframe.
13. TP > 2×weeklyATR = ambitious. > 3× = reject.
14. Price cannot teleport past UM zones (CAN pass mitigated zones during BS).

### Category D: Entry Mechanics (Laws 15-19)
15. 3-entry staggered: front+spread (33%), middle key level (33%), back+spread (34%).
16. Forward spreads mandatory: EUR=1, AUD=1.5, GBP=2, DXY=0.02.
17. Entry at zone edge (74%) or inside (26%).
18. Candle confirmation required: engulfing (47%), pin bar (32%), inside bar (21%), breakout (16%).
19. ZoC (Zone of Conquest): 3+ TF overlap + LQZ shield + BoM → dual-direction.

### Category E: Direction (Laws 20-22)
20. DXY cascade = macro direction bias. HTF swings align. Counter-trend scalps valid with 3+ confluences.
21. Direction analysis is 70% correct — execution is the problem.
22. MFE before SL = right zone, wrong SL placement.

### Category F: Session (Laws 23-25)
23. Session enforcement = liquidity quality proxy (London: 22/38, NY: 15/38).
24. News events = shape catalysts. PREDICT spike direction, use as entry catalyst.
25. London Spike: 1H bar range > 2×ATR. Kills tight SLs, provides entry opportunities.

### Category G: War Narrative (Laws 26-30)
26. War narrative = connecting tissue: zones=positions, shapes=phases, setups=deployments.
27. Trade chaining: TP of N = entry of N+1.
28. Zone defense tracking: DEFENDED/BROKEN/UNTESTED.
29. Prior week context required (defended zones depleted? broken zones role-reversed?).
30. London: sharper reactions. NY: deeper penetrations.

### Category H: Zone Quality (Laws 31-34)
31. UM zones: 100% reaction. 1x: 80%. 2x: 50%. 3x+: TP target only.
32. Multi-TF confluence: dual-TF +3, triple-TF +5.
33. LiquidityScore 0-10. TP zones need ≥5. "Wood for the fire."
34. Zone depletion is per-timeframe. 15m depleted ≠ 1H depleted.

### Category I: Validation (Laws 35-37)
35. RR is consequence, not target. Floor 1.0. Let zone structure determine RR.
36. Dedup key: `direction_entry_sl_tp_day`.
37. Visual verification: Data 80%, Vision 20%.

---

## APPENDIX C: SHAPE CANDLE ANATOMY (Quick Reference)

| Shape | Candles | Body | Range | Wicks | Color | Energy |
|-------|---------|------|-------|-------|-------|--------|
| SS | 8-30+ | TINY (0.10-0.30) | SMALL (0.2-0.5×) | MODERATE (0.3-0.5) | MIXED | Accumulating |
| BS | 4-8+ | LARGE thrust (0.65-0.95), small retracement (0.2-0.4) | LARGE thrust (3-5×), small retracement | MINIMAL thrust (<0.2), moderate retracement | MIXED, dominant direction | Piercing (sustained) |
| R | 6-24 | MEDIUM (0.40-0.60) | MODERATE (0.8-2.0×) | MODERATE | MIXED, V-shaped | Correcting |
| WL | 1-3 | MOMENTUM (0.5-0.7), grab (0.3-0.5) | LARGE (2-4×) | LONG grabs (~1× body), small momentum | ALL SAME | Grabbing (isolated) |
| RWL | 6+ | MODERATE (0.3-0.5) | MOD-LARGE (1.5-3×) | MODERATE (~0.3-0.5) | MIXED, reverse dominant | Choppy reversal |
| WLS | 14-15+ | MODERATE (0.3-0.5) | MODERATE (1.0-2.0×) | LONG BOTH SIDES | MIXED, rapid alternation | Hyper-volatile SS |

**Five KEY Distinguishing Features:**
1. BS vs WL: BS has NO long wicks on thrust candles. WL has LONG wicks on grab candles.
2. BS vs RWL: BS retracements SMALL (<30%). RWL retracements MODERATE (30-60%).
3. WL vs RWL: WL is ALL same color. RWL is MIXED colors.
4. BS vs R: BS has LARGE bodies and sustained momentum. R has MEDIUM bodies and V-shaped correction.
5. WL vs SS: WL has LARGE total range and long wicks. SS has SMALL total range and moderate wicks.

---

## APPENDIX D: SESSION MECHANICS

### Session Windows (ET)

| Session | Time | Liquidity | Primary Use | Win Rate |
|---------|------|-----------|-------------|----------|
| London Open | 02:00-05:00 | ~$800B/hr | Consolidation scalps | 22/38 (58%) |
| London/NY Overlap | 08:00-10:00 | ~$1,200B/hr (peak) | HTF Swing (BS) entries | 15/38 (39%) |
| NY Mid | 10:00-14:00 | High | HTF Swing TPs hit | 18/38 (47%) |
| NY Open | 08:30-10:00 | High | Reinforcement triggers | 8/38 (21%) |
| Asian | 00:00-02:00 | ~$200B/hr | RARE — only at high-liquidity zones | 3/38 (8%) |

### WHY Asian Session Fills Fail

Asian session has ~20% of London/NY liquidity. The order book is 4-6× thinner. No institutional defense orders at zones — price touches the zone, nobody defends, price continues through. When London opens, institutional flow reverses the Asian session's price levels — hitting SLs.

The real filter should be LIQUIDITY QUALITY, not clock time. A zone with liquidityScore ≥ 7 might react even during Asian hours. The session filter should be CONDITIONAL on liquidity score.

---

## APPENDIX E: MULTI-PAIR TRANSLATION PROTOCOL

**CRITICAL RULE: DXY provides DIRECTION. The PAIR provides LEVELS.**

### PROHIBITED Methods
1. Mathematical Conversion (DXY formula reverse) — FORBIDDEN
2. Inverse Correlation Ratio — FORBIDDEN
3. Arithmetic Inversion — FORBIDDEN
4. Percentage-Based Conversion — FORBIDDEN
5. Pip Equivalence Conversion — FORBIDDEN

### APPROACH B — Structural Equivalence
1. Complete DXY Report (Phase 1)
2. Map DXY Zones to Pair Direction Assignments (Phase 2)
3. Harvest Pair-Specific Data (TradingView, forex.com, etc.)
4. Identify Pair-Specific Zones
5. Match DXY Conviction to Pair Levels
6. Cross-Validate (7 requirements)
7. Assemble Cross-Pair Matrix

### Zone Translation Mapping

| DXY Zone Role | Pair Zone Role | Conviction Transfer |
|---------------|---------------|-------------------|
| RESISTANCE CEILING | SUPPORT FLOOR | DIRECT |
| UPPER RESISTANCE | LOWER SUPPORT | DIRECT |
| EQUILIBRIUM | EQUILIBRIUM | NEUTRAL (score-2) |
| MID-RANGE SUPPORT | MID-RANGE RESISTANCE | INVERTED |
| KEY SUPPORT BAND | KEY RESISTANCE BAND | INVERTED |
| LSZ (demand) | LSZ (supply) | INVERTED |

---

*This document is the single source of truth for the Plutus TTE trading machine. It supersedes all previous bibles, handovers, and architecture documents. For codebase-specific issues and cleanup tasks, refer to CODEBASE_CLEANUP_TASKS.md. For liquidity zone detection reference, refer to LIQUIDITY_MASTER_REFERENCE.md.*

**© 2026 PLUTUS TTE — The Trident Trading Engine**

---

## APPENDIX F: ENGINE 1 QUANTITATIVE WORKED EXAMPLE

This appendix walks through a complete numerical example of Engine 1's zone construction process with specific numbers.

### Given Data
- DXY spot: 100.50
- Prior week: H=101.00, L=100.20, C=100.60
- EUR/USD option strike: 1.0850, notional: €2B
- Component spots: USDJPY=149.50, GBPUSD=1.2700, USDCAD=1.3600, USDSEK=10.500, USDCHF=0.8800

### Step 1: Pivot Calculation (Pillar 1, Classic, Weekly)
```
PP = (101.00 + 100.20 + 100.60) / 3 = 100.60
R1 = 2×100.60 - 100.20 = 101.00
S1 = 2×100.60 - 101.00 = 100.20
R2 = 100.60 + (101.00 - 100.20) = 101.40
S2 = 100.60 - 0.80 = 99.80
R3 = 101.00 + 2×(100.60 - 100.20) = 101.80
S3 = 100.20 - 2×(101.00 - 100.60) = 99.40
```

Note: PP = 100.60 = Close. This happens when Close = (H+L)/2 — the close was at the range midpoint. This makes R1 = H and S1 = L exactly — a mathematical identity that creates natural confluence between pivots and structural extremes.

### Step 2: K Factor Computation (Pillar 3/8)
```
USDJPY^0.136 = 149.50^0.136 = e^(0.136 × 5.0073) = 1.9758
GBPUSD^(-0.119) = 1.27^(-0.119) = e^(-0.119 × 0.2390) = 0.9719
USDCAD^0.091 = 1.36^0.091 = e^(0.091 × 0.3075) = 1.0284
USDSEK^0.042 = 10.50^0.042 = e^(0.042 × 2.3514) = 1.1038
USDCHF^0.036 = 0.88^0.036 = e^(0.036 × -0.1278) = 0.9954

K = 50.14348112 × 1.9758 × 0.9719 × 1.0284 × 1.1038 × 0.9954
K ≈ 108.78
```

### Step 3: EUR/USD Strike → DXY Conversion (Pillar 8)
```
DXY_equiv = K × EURUSD^(-0.576)
          = 108.78 × 1.0850^(-0.576)

1.0850^(-0.576) = e^(-0.576 × ln(1.0850))
                = e^(-0.576 × 0.08158)
                = e^(-0.04699)
                = 0.95410

DXY_equiv = 108.78 × 0.95410 = 103.78
```

The €2B EUR/USD option at 1.0850 creates a DXY institutional pressure zone at ~103.78.

### Step 4: Notional Classification
€2B × 1.0850 = $2.17B equivalent → **CRITICAL OPTION WALL** (≥$1.5B)
- Options-Derived dimension = 2 (maximum)
- Confluence score +3
- Confidence band = ±0.07 DXY

### Step 5: Confluence Scoring for Zone at 103.78
Assume alignment with:
- Pillar 2 (MA): EMA 50 at 103.70 → zone match (within 10 pips) → 1 pt Technical
- Pillar 5: Prior swing high at 103.75 from 45 days ago → exact match → 2 pts Structural
- Pillar 5 Step 0.5: Same level hit 2× in past 90 days → Repeated Extreme Magnet → +1.5 bonus
- Pillar 6: 103.78 → NOT a round number → 0 pts Psychological
- Pillar 4: forex.com mentions "103.80 resistance" → 1 pt Analyst

```
Technical: 0 (pivot) + 1 (MA) = 1
Options: 2 (CRITICAL WALL)
Analyst: 1
Structural: 2
Psychological: 0
Regime: 1 (zone in momentum)

Base Score = 1 + 2 + 1 + 2 + 0 + 1 = 7
+ Structural Extreme Bonus: +1.5
Total = 8.5 → 8 or 9

Pressure Degree = MODERATE-HEAVY (8-9)
ZFP Range = 20-35%
```

### Step 6: ZFP Refinement
```
Base (CRITICAL WALL + multiple pillars): ~10%

Modifiers (pre-10 AM):
+ No Spring Release yet: 0%
+ No cascade: 0%
Pre-expiry ZFP: ~10% (Hard Wall behavior)

Modifiers (post-10 AM, after Spring Release):
+ Spring Release: +25%
Post-expiry ZFP: ~35% (Mid-range behavior)
```

The temporal cliff: at 10:00 AM NY, this zone transitions from Hard Wall (ZFP < 20%) to Mid-range (ZFP 20-40%). Shape prediction flips from WL (rejection) to R (recovery).

---

## APPENDIX G: FORWARD MAPPING WORKED EXAMPLE

Complete forward mapping for DXY week of July 6-10, 2026.

### Step 1: Current Shape Identification
- Spot: ~101.00 (Friday close)
- Both bounding zones: ceiling at ~101.14, floor at ~100.845
- Both ZFP < 30% (option cages pinning price)
- Duration > 1 session
- Shape: **SS (Swing Scalps)**
- Anchoring zone: ceiling at 101.14 (ZFP ~25%), floor at 100.845 (ZFP ~20%)
- 4H validation: range-bound structure confirmed

### Step 2: Transition Assessment
Primary: ceiling ZFP trending upward (Monday options approaching expiry)
- If ceiling ZFP crosses 45%: SS → BS (breakout through ceiling upward)
- If floor ZFP crosses 45%: SS → BS (breakout through floor downward)
- If both stay below 30%: SS continues

### Step 3: Chain Extension
```
SS (Mon-Tue) → [Trigger: ceiling ZFP > 45% from Monday expiry Spring Release]
→ BS (Wed, SHORT direction — ceiling breaks upward = price surges up then reverses)
→ [Trigger: reaches Hard Wall at 101.235 (ZFP < 20%)]
→ RWL (Wed, LONG — violent bounce from Hard Wall)
→ [Trigger: RWL reaches supply at 101.235+ (ZFP < 20%)]
→ BS (Wed afternoon, SHORT — final crash from supply)
→ [Trigger: reaches UM demand at 100.680 (ZFP < 10%)]
→ WL/R (Thu-Fri, LONG — reaction at deepest UM zone)

Chain confidence: 65%
```

### Step 4: Alternative Chain
```
PRIMARY: SS → BS → RWL → BS → WL
DECISION ZONE: 101.14 ceiling
If ZFP at 101.14 stays < 30% (option cage holds):
  ALTERNATIVE: SS continues → SS → SS → late BS on Thursday/Friday
  Alternative confidence: 30%
```

### Step 5: Day Decomposition (with Trading Speed Rule +1 day)
```
Mon: SS (range-bound) | Key zones: 100.945 (floor), 101.14 (ceiling) | Triggers: Monday option expiry 10AM
Tue: SS → early BS signs | Key zone: 101.14 ceiling under pressure | Triggers: post-expiry drift
Wed: BS (SHORT surge + crash) + RWL (bounce) | Key zones: 101.19, 100.975, 101.235 | Triggers: CPI release
Thu: R/SS (consolidation at bottom) | Key zone: 100.680 UM demand | Triggers: Thursday auctions
Fri: WL/R (reaction at UM demand) | Key zone: 100.680 | Triggers: Friday option expiry 10AM
```

---

## APPENDIX H: ZONE PATH ANALYSIS FOR ALL 8 TRADES

### Trade 1: Mon SS Long @ 100.945 → TP 101.115
```
Entry: 100.945 (1H LQZ demand)
SL: 100.905 (4 pips below — at zone floor - buffer)
TP: 101.115 (nearest supply above)

Zone Path: [100.945 DEMAND] →UP→ [101.115 SUPPLY]
Intermediate zones: NONE (17 pip direct travel)
UM zones bypassed: NONE
Confirms Law 14: ✅ Direct path to nearest opposing zone
```

### Trade 2: Mon BS Short @ 101.14 → TP 100.845
```
Entry: 101.14 (1H LQZ supply — stop hunt above 101.115)
SL: 101.200 (6 pips above — at next supply zone + buffer)
TP: 100.845 (demand zone 29.5 pips below)

Zone Path: [101.14 SUPPLY] →DOWN→ [100.945 DEMAND (mitigated)] →DOWN→ [100.845 DEMAND (TP)]
Intermediate zones: 100.945 (mitigated by Trade 1)
UM zones bypassed: NONE (100.945 was already tested)
Confirms Law 14: ✅ Price passed through mitigated zone during BS momentum
```

### Trade 3: Tue R Long @ 100.845 → TP 101.190
```
Entry: 100.845 (1H MoM demand — = Trade 2's TP, TRADE CHAIN)
SL: 100.77 (7.5 pips below — at next demand zone - buffer)
TP: 101.190 (supply zone 34.5 pips above)

Zone Path: [100.845] →UP→ [100.945 (mitigated)] →UP→ [100.975 (unmitigated)]
→UP→ [101.14 (mitigated)] →UP→ [101.190 SUPPLY (TP)]
Intermediate zones: 100.945, 100.975, 101.14
UM zones bypassed: 100.975 (UM but R momentum sufficient to pass through)

Wait — this violates Law 14 if 100.975 was UM. Resolution:
100.975 was NOT tested before Trade 3 (Trade 4 tests it on Wednesday).
So during Tuesday's R, 100.975 was UM. Price DID react at 100.975
during the R — it paused there before continuing to 101.190.
This is consistent with Law 14: price reacted at the UM zone.
```

### Trade 4: Wed SS Short @ 101.19 → TP 100.975
```
Entry: 101.19 (1H LQZ supply)
SL: 101.25 (6 pips above — at next supply + buffer)
TP: 100.975 (demand zone 21.5 pips below)

Zone Path: [101.19 SUPPLY] →DOWN→ [101.14 (mitigated)] →DOWN→ [100.975 DEMAND (TP)]
Intermediate zones: 101.14 (mitigated)
Confirms Law 14: ✅ UM zone at 100.975 caused the reaction
```

### Trade 5: Wed RWL Long @ 100.975 → TP 101.240
```
*** TRADE CHAIN: Trade 4 TP = Trade 5 Entry ***

Entry: 100.975 (1H LQZ demand — same as Trade 4's TP)
SL: 100.905 (7 pips below — at next demand - buffer)
TP: 101.240 (supply zone 26.5 pips above)

Zone Path: [100.975 DEMAND] →UP→ [101.14 (mitigated)] →UP→ [101.19 (mitigated by Trade 4)]
→UP→ [101.235 SUPPLY] →UP→ [101.240 SUPPLY (TP)]
Intermediate zones: 101.14, 101.19 (both mitigated — passed through during RWL momentum)
Confirms Law 14: ✅ UM zone at 101.235/101.240 caused the reaction (TP hit)
```

### Trade 6: Wed BS Short @ 101.235 → TP 100.680
```
*** TRADE CHAIN: Trade 5 TP = Trade 6 Entry ***
*** THE DEFINITIVE LAW 14 PROOF ***

Entry: 101.235 (4H BoM supply)
SL: 101.330 (9.5 pips above — at 4H BoM ceiling + buffer)
TP: 100.680 (1H BoM demand — 55.5 pips below)

Zone Path: [101.235] →DOWN→ [101.19 (mitigated)] →DOWN→ [101.14 (mitigated)]
→DOWN→ [100.975 (mitigated by Trade 4)] →DOWN→ [100.945 (mitigated)]
→DOWN→ [100.845 (mitigated)] →DOWN→ [100.680 UM DEMAND (TP)]

5 intermediate zones — ALL mitigated. Price blew through ALL 5 without stopping.
The ONLY zone that caused a reaction was 100.680 — the 1H BoM (unmitigated).

THIS IS THE DEFINITIVE PROOF OF LAW 14:
Price traveled 55.5 pips through 5 zones without stopping — because ALL 5
were previously tested (mitigated). Their institutional orders were consumed.
The only zone with fresh orders (100.680 UM) caused the reaction.
```

---

## APPENDIX I: DXY CASCADE DETAILED EXAMPLE

### Scenario: DXY Bullish Week

DXY Engine 2 shape chain predicts: SS (Mon-Tue) → BS UP (Wed) → R (Thu) → WL (Fri)

DXY direction: BULLISH (BS up = demand below spot wins, supply above fails)

**Macro direction implication for FX pairs (inverse):**
- EUR/USD: bearish-biased for HTF swings. Primary HTF swing direction = SHORT
- GBP/USD: bearish-biased for HTF swings. Primary direction = SHORT
- AUD/USD: bearish-biased for HTF swings. Primary direction = SHORT

**What this DOES NOT mean:**
- Does NOT mean EUR/USD LONG setups are rejected
- Does NOT mean GBP/USD Consolidation scalps at demand are invalid
- Does NOT mean all counter-trend trades are forbidden

**What it DOES mean:**
- EUR/USD BS (HTF swing) should be SHORT (aligned with DXY bullish inverse)
- EUR/USD SS scalps at supply → SHORT is preferred (aligned with macro)
- EUR/USD SS scalps at demand → LONG is VALID (counter-trend scalp within consolidation — captures the bounce before the macro direction resumes)
- GBP/USD WL rejection at demand → LONG is VALID (reversal setup at Hard Wall — the zone doesn't care about macro direction)

**Wednesday equivalent on EUR/USD:** If DXY is bullish on Wednesday (BS up), EUR/USD should be bearish (BS down). But EUR/USD may have a supply zone near spot where price bounces briefly (SS scalp LONG during London) before the BS down begins during NY. The LONG scalp is valid because:
1. Zone type says LONG (demand below spot)
2. Shape for the day eventually says SHORT (BS down during NY) — but during London it's still SS
3. Session says London (scalps valid)
4. Minimum 3 confluences met: zone type + shape context + session = 3

---

## APPENDIX J: THE SEMANTIC FIREWALL — DETAILED RULE CATALOG

### Key Rules (from 67 total)

| Rule | Type | Check | Impact |
|------|------|-------|--------|
| ZT-1 | BLOCK | Virgin MoM (DEATH ZONE) | Prevents entries at zones with 0% win rate |
| ZT-2 | BLOCK/SKIP | Open position (needs mode flag) | When isReportGeneration=true: skips |
| ZT-13 | BLOCK | Invalid entry zone | Entry zone doesn't meet structural requirements |
| ZT-14 | BLOCK | Invalid SL zone | SL not at structural level |
| ZT-16 | BLOCK | Invalid TP zone | TP not at opposing S/D with liquidity |
| ZT-17 | FLAG | Breakout surge during EARLY consolidation | Not a block — a warning flag |
| CS1-CS18 | Various | Core semantic rules | Various setup quality checks |
| CS12 | BLOCK | Direction validation requires 6 checks | Fewer than 6 → ALL setups rejected |
| RRR-1 | BLOCK | Category-specific RRR floor | Below rrrForCategory().tp1 |
| SL-1 | BLOCK | SL exceeds SL_MAX_HARD | DXY > 50, FX > 150-180 |
| PROX-1 | BLOCK | Entry proximity maximum | Beyond MAX_ENTRY_DISTANCE |
| BE1-BE12 | Various | Blind-execution checks | Day labels, session windows, shape triggers |
| BE17 | CHECK | Session text in setup notes | Must mention assigned session |
| BE18 | CHECK | Candle confirmation note | Must mention required pattern |

### CS12 Direction Validation (6 Checks Required)

1. **Zone Category** — RES (resistance) / SUP (support) / MID (equilibrium)
2. **Shape Alignment** — Does the Engine 2 shape for the day support this direction?
3. **Confluence Threshold** — Does the zone meet minimum confluence for the direction?
4. **RRR Check** — Does the risk-reward meet the category floor?
5. **Session Timing** — Is the assigned session appropriate for the setup category?
6. **Sniper Entry Precision** — Is the entry at the zone edge (not random)?

### Firewall Mode Flag

```typescript
interface RuleCheckContext {
    isReportGeneration?: boolean;
}
```

When `isReportGeneration = true`:
- ZT-2 (open position): SKIP — predictions are not positions
- ZT-5 (correlations): SKIP — predictions don't correlate
- ZT-8, ZT-9: SKIP
- ZT-12 (overfitting): SKIP
- ZT-15 (MoM conditional): WARN instead of BLOCK
- CS9 (all MoM entries): WARN instead of BLOCK

When `isReportGeneration = false` (live trading mode):
All rules are active and enforce hard blocks.

---

## APPENDIX K: BLIND-EXECUTION PROTOCOL (12 Checks)

| # | Check | Pass Condition |
|---|-------|---------------|
| BE1 | Every setup has DAY label | Mon/Tue/Wed/Thu/Fri |
| BE2 | Every setup has SESSION WINDOW | London/NY with time |
| BE3 | Every setup has SHAPE TRIGGER | Which macro shape activates |
| BE4 | Every setup has SETUP CATEGORY | Consolidation/HTF Swing/Reversal/Reinforcement |
| BE5 | Weekly Execution Calendar populated | All setups by day |
| BE6 | All anchor points have WHEN + WHERE | Expected hit timing |
| BE7 | No setup requires real-time chart analysis | Pre-set levels only |
| BE8 | Day Catalysts listed | Expiries/events/auctions |
| BE9 | Reinforcement entries have parent reference | Parent trade + day |
| BE10 | All 5 trading days covered | ≥1 setup/day or stated reason |
| BE11 | Profit Taking Law documented | Close ALL by NY close Friday |
| BE12 | Trading Speed adjustment applied | +1 day from raw timing |

---

## APPENDIX L: SMC CONCEPT CROSS-REFERENCE

| SMC Concept | TTE Element | Classification | Key Difference |
|-------------|-------------|----------------|----------------|
| Order Block | Fire density | BoM or MoM | SMC treats all OBs same. TTE adds critical BoM/MoM distinction. |
| Supply/Demand Zone | Fire density | BoM or MoM | Identical identification, TTE adds classification |
| Liquidity | Earth density | LSZ (standard) or IP Zone (heavy) | TTE graduates density: thin/standard/heavy |
| Liquidity Sweep | Earth event + Water shape | WL (isolated) or BS (sustained) | SMC sees event. TTE sees shape materialization. |
| Break of Structure | Fire ignition | SS→BS transition candle | SMC structural. TTE adds shape chain context. |
| Fair Value Gap | Fire evidence | Space Fire burned through | TTE sees as evidence of Fire density |
| Flip Zone | Fortress Zone | Earth-dominant transition | TTE maps to 4+ test phase transition |
| Mitigation Block | Heavily mitigated Fire | MoM at reactionCount 3+ | TTE tracks per-TF mitigation |
| Fibonacci | Air density | Air density | Identical mapping |

### TTE Concepts WITHOUT SMC Equivalent

1. **Earth-Fire overlap requirement** — TTE requires S/D + liquidity overlap for valid entries. SMC doesn't.
2. **Conservation of energy** — TTE predicts mandatory consolidation after 2 piercing moves. SMC has no equivalent.
3. **Rocket reinforcement architecture** — TME's stop-limit order system. SMC has nothing similar.
4. **Pair-specific elemental profiles** — TTE classifies pairs by dominant element. SMC doesn't.
5. **Shape chain prediction** — TTE predicts macro shape sequences. SMC is reactive only.

**TTE is a SUPERSET of SMC.** SMC is reactive — identifies zones and waits. TTE is predictive — maps energy trajectory and predicts what happens when price arrives.

---

*END OF PLUTUS ARCHITECTURE BIBLE 4.0*

---

## APPENDIX M: THE 37 FUNDAMENTAL LAWS — FULL DETAIL WITH EVIDENCE

These 37 laws are derived from VLM analysis of all 38 winning trade images, user's manual chart annotations, July 6-10 backtest results, the Trident System Prompt v5.3.3, and SMC Notes. Every law has been empirically validated. NON-NEGOTIABLE.

### Category A: Zone Construction (Laws 1-6)

**Law 1: TIMEFRAME TELESCOPING — TOP-DOWN**
Zone construction processes 4H → 1H → 30m → 15m, top-down. Each lower TF validates and refines the higher TF. A lower TF can NEVER override a higher TF's strategic direction.
- Evidence: All 38 winning trades show multi-TF awareness. The DXY god-vision chart shows 4H BoM Supply at 101.30-101.45 (strategic), 1H LQZ at 101.19-101.24 (tactical entry), 1H UM BoM Demand at 100.61-100.68 (TP). The user NEVER enters from a single timeframe.
- If violated: A 15m zone generating LONG while 4H says SHORT would be entering against the institutional tide. The 4H bar captures the macro institutional position — banks, sovereign flows — that dwarf whatever microstructure the 15m reveals.
- Reasoning: Markets are fractal — self-similar across scales. But NOT symmetric in power. Higher TFs have MORE institutional order flow (4H = 16 hours of accumulated positions vs 15m = 15 minutes). The 4H is the OVERLORD, 15m is the SNIPER.

**Law 2: ZONE WIDTH PARAMETERS ARE TF-DEPENDENT**
4H: min 15, max 40 pips. 1H: min 8, max 25. 30m: min 5, max 15. 15m: min 3, max 10.
- Evidence: 15m zones in winning trades are 3-8 pips wide. A hardcoded 15-pip minimum from the 4H lobe would REJECT every valid 15m zone.
- If violated: Wider zones → wider SLs → worse R:R → setup rejected by firewall. The cascade is: wrong width → wrong SL → wrong RR → no trade.
- Reasoning: Volatility scales with √time. 4H/15m ratio = 64:1. √64 = 8×. So 4H zones should be ~8× wider than 15m zones. 15-40 / 8 ≈ 2-5 pips for 15m — matches the observed 3-8 range.

**Law 3: MULTI-TF ZONE MAP AS SINGLE SOURCE OF TRUTH**
ALL zones from ALL TFs live in ONE zone map. No overlay-only zones. No hidden LTF zones.
- Evidence: V1-V2 had LTF zones as "overlays" — invisible to TP selection, direction analysis, and path mapping. The 1H LQZ at 101.200 was invisible. Setups generated at 4H distances (85-100 pips from spot) instead of LTF distances (0-50 pips).
- If violated: The setup engine picks the next VISIBLE zone — a 4H zone 50-100 pips away. Entry never fills within the session window.

**Law 4: ZONE NESTING — LTF INSIDE HTF**
When 15m zone is entirely within 4H zone: refinedLabel = "15m Refined 4H". Inherits type/direction. Confluence = sum (capped 14). Dual-TF: +3. Triple-TF: +5.
- Evidence: "15m Refined 30m" zones are the highest-probability entries in the winning trade library.
- Reasoning: A zone visible on MULTIPLE scales has orders from MULTIPLE timeframe populations — deeper order book, stronger reaction.

**Law 5: LQZ = ENTRY ZONE (NOT SL ANCHOR)**
LQZ (Liquidity Zone, formerly LSZ) = FIRST zone price reaches on path from spot to HTF objective. These are ENTRY zones.
- Evidence: User screenshot shows LQZ at 101.200 between spot (~101.15) and 4H BoM Supply (~101.30-101.45). Entry for DXY SHORT is at the LQZ. SL goes INTO the 4H BoM above. In 32/38 trades (84%), entry zone IS the shield.
- If violated: SL at the LQZ = too tight (inside zone, stopped by normal wick). Skipping LQZ and entering at 4H BoM = 50-100 pips from spot, trade won't fill for days.

**Law 6: ENTRY ZONE MUST BE ON CORRECT SIDE OF SPOT**
SHORT only from SUPPLY/LQZ zones ABOVE spot. LONG only from DEMAND/LQZ zones BELOW spot.
- If violated: SHORT at demand below spot = selling into buying pressure. Guaranteed stop-out.
- Reasoning: Direction = asymmetry. To SHORT, sell high (at supply above). To LONG, buy low (at demand below).

### Category B: SL Placement (Laws 7-10)

**Law 7: SL AT NEXT KEY ZONE + 2-5 PIPS INSIDE**
SHORT: scan upward for nearest supply above entry ceiling. SL = zone floor + buffer. LONG: scan downward for nearest demand below entry floor. SL = zone ceiling - buffer.
- Buffer: EUR=2, GBP=3, AUD=3, DXY=5.
- Evidence: 38/38 winning trades. Entry at 1H LQZ 101.191-101.240, SL at 101.330 (inside 4H BoM). NOT at opposite edge of entry zone.
- Reasoning for buffer: Covers spread + stop-hunt depth + slippage. Spread (0.3-1 pip) + hunt depth (1-3 pips) + slippage (0.2-2 pips) = 2-5 pips. Less liquid pair = deeper hunts = wider buffer.

**Law 8: SL FALLBACK WHEN NO NEXT ZONE**
If no zone within 100 pips: SL = entry ± max(entryZoneWidth × 2, 1.5 × pairATR). pairATR = ATR(14) on 1H.
- Reasoning: Zone width × 2 accounts for a full zone-width wick. 1.5 × ATR accounts for a London Spike. MAX ensures protection against whichever threat is larger.

**Law 9: SL DISTANCE DETERMINED BY ZONE GEOMETRY**
SL = distance from entry to next zone's inner edge + buffer. NOT a fixed pip constant.
- Distribution: 3-6 pips (18%), 8-15 pips (29%), 17-30 pips (37%), 34-55 pips (16%). Median: ~15 pips. Mode: ~12 pips.
- If violated (fixed buffer): Fixed 8-pip buffer is TOO WIDE for 3-pip zones (terrible RR) and TOO NARROW for 15-pip zones (inside the zone, guaranteed stop-out). The fixed buffer is disconnected from market structure.

**Law 10: ATR-BASED SL MINIMUM**
SL must NEVER be tighter than 0.5 × pairATR(14) on entry TF.
- Evidence: July 6-10 backtest — setups with 8-pip SLs stopped out by 15-pip ATR bars. Wednesday London Spike: 18.9 index points in one bar.
- If violated: A 3-pip SL when ATR is 15 pips = guaranteed stop-out by normal market noise. You need price to move favorably on the FIRST bar or you're stopped.

### Category C: TP Placement (Laws 11-14)

**Law 11: TP AT DEMAND + LIQUIDITY OVERLAP (EARTH + FIRE)**
TP at nearest opposing zone where structural demand overlaps with liquidity. Earth (liquidity pool) + Fire (structural demand zone). If overlap: MIDPOINT. If no overlap: NEAR EDGE. NEVER far edge.
- Evidence: User screenshot — TP at 1H UM BoM Demand 100.61-100.68. "This is the perfect exit. It overlaps with liquidity. There is wood to fuel the fire."
- Reasoning: Earth+Fire = double buying/selling pressure. Institutional defense AND forced stop triggers fire simultaneously. Violent reaction. Price penetrates deeply. Midpoint is safe. Without Fire (no liquidity), only structural defense. Weaker reaction. Near edge safer.

**Law 12: TP TIMEFRAME ≥ ENTRY TIMEFRAME**
15m entry → 30m/1H TP. 1H entry → 4H TP.
- Reasoning: A 15m zone is a scouting outpost. You don't target another scouting outpost — you target the HEADQUARTERS (30m or 1H). Meaningful move requires structurally significant target.

**Law 13: TP DISTANCE SANITY CHECK**
TP > 2× weeklyATR → "ambitious." TP > 3× → reject.
- Evidence: V2 EUR/USD TP at 1.15393 was 117 pips. Weekly ATR ~60 pips. TP unreachable (2× ATR). MFE was +3.2R but TP never hit.

**Law 14: PRICE CANNOT TELEPORT**
Price defends zones sequentially. Must map FULL PATH and set TP at FIRST UM zone price will react at. CAN pass through mitigated zones during BS momentum.
- Evidence: BS Short from 101.235 to 100.680 traveled 55.5 pips through 5 mitigated zones without stopping. ALL had reactionCount ≥ 1. Only UM zone (100.680) caused reaction.
- Refined: "Price cannot teleport past UNMITIGATED zones." Mitigated zones are pass-through during momentum.

### Category D: Entry Mechanics (Laws 15-19)

**Law 15: 3-ENTRY STAGGERED SYSTEM**
Entry 1 (Front): zone edge nearest spot + forward spread. 33%. Entry 2 (Middle): leftward-facing candle key level. 33%. Entry 3 (Back): zone edge farthest from spot + forward spread. 34%. All share same SL and TP.
- Cascade: Entry 2 fills → Entry 1 to BE. Entry 3 fills → Entry 2 to BE.
- Evidence: User screenshot — 3 entries at 101.240 / 101.216 / 101.191.
- Why 3: Statistical coverage of front/middle/back third of zone. Worst case (only back fills) gets 34% at best price.

**Law 16: FORWARD SPREADS MANDATORY**
EUR=1, AUD=1.5, GBP=2, DXY=0.02.
- Evidence: User stated Entry 3 only triggered because of 1.5 pip forward spread. Without it, 2/3 entries would have missed by 0.5 pips.
- Reasoning: Limit at exact zone edge misses on shallow touches. Forward spread moves limit INTO the zone, guaranteeing fills.

**Law 17: ENTRY AT ZONE EDGE (74%) OR INSIDE (26%)**
Edge: ceiling for LONG, floor for SHORT. 28/38 = edge. 10/38 = inside.
- Reasoning: Zone edges have the THICKEST order book (where institutions placed original orders). Maximum liquidity = tightest spread = best fill.

**Law 18: CANDLE CONFIRMATION REQUIRED**
Engulfing: 18/38 (47%). Pin Bar: 12/38 (32%). Inside Bar: 8/38 (21%). Breakout: 6/38 (16%).
- Reasoning: Zone touch is necessary but NOT sufficient. You need PROOF that defenders are actively defending. Bullish engulfing at demand = DIRECT EVIDENCE of institutional defense.

**Law 19: ZOC — ZONE OF CONQUEST**
High-confluence zone (3+ TF overlap + LQZ shield + BoM status) generates DUAL setups (both directions). ONLY exception to Laws 6 and 1.
- Score ≥ 4 = ZoC. Multi-TF overlap: +1-3. LSZ shielding: +2. BoM status: +1.
- Reasoning: At a ZoC, both armies committed massive forces. Outcome uncertain — could go either way. Generate BOTH: if zone holds → reversal setup. If zone breaks → breakout setup.

### Category E: Direction & Cascade (Laws 20-22)

**Law 20: DXY CASCADE — MACRO DIRECTION (NOT HARD FILTER)**
DXY bearish → FX pairs LONG-biased for HTF swings. DXY bullish → FX pairs SHORT-biased. Counter-trend Consolidation scalps VALID with 3+ confluences.
- Evidence: The 8 winning DXY trades include BOTH longs and shorts in the same week. Wednesday had SHORT, LONG, SHORT — same pair, same day.
- Reasoning: DXY provides the macro tide. HTF swings (multi-day) should follow the tide. Consolidation scalps (intra-day) can trade against the tide at strong zones — the zone's institutional defense is strong enough to produce a bounce regardless of macro direction.

**Law 21: DIRECTION ANALYSIS IS 70% CORRECT**
Losses from execution (SL, timing, TP), NOT direction.
- Evidence: V1: 7/10 direction correct but hit SL. V2: 11/18 direction correct.
- Implication: Fixing execution (SL placement, session timing, TP targeting) improves win rate WITHOUT changing direction analysis.

**Law 22: MFE BEFORE SL = RIGHT ZONE, WRONG SL**
Setup with MFE of 2+R before hitting SL = SL placement failure, not analytical failure.
- Evidence: V2 setups #1-4 had +3.0-3.2R MFE before SL hit.
- Implication: If price moved 3R in your favor, your entry zone was CORRECT. But SL was at a random level, not the structural level. Price doesn't care about your 8-pip buffer.

### Category F: Session & Timing (Laws 23-25)

**Law 23: SESSION ENFORCEMENT IS FUNCTIONAL**
London Open: 02:00-05:00 ET. NY Overlap: 08:00-10:00 ET. NY Mid: 10:00-14:00 ET.
- Evidence: July 6-10: 0/10 pipeline setups filled during assigned session. All filled during Asian (00:00-02:00 ET). All reversed and hit SL.
- Root cause: Asian session = ~20% of London/NY liquidity. Order book 4-6× thinner. No institutional defense at zones. Price touches, nobody defends, continues through.
- Fix direction: Session filter should be CONDITIONAL on liquidity score, not purely time-based.

**Law 24: NEWS EVENTS ARE SHAPE CATALYSTS**
Red-folder events (CPI, PPI, NFP) provide liquidity to push price into zones. News spike IS the shape transition.
- Action: PREDICT spike direction. If CPI is bullish for DXY, spike pushes DXY UP into supply → supply is the ENTRY for SHORT. News delivers price to entry zone FOR FREE.

**Law 25: LONDON SPIKE / VOLATILITY EVENTS**
London Spike = 1H bar with range > 2 × pairATR. Kills tight SLs. Provides best entry opportunities.
- Evidence: July 6-10 Wednesday London Spike: DXY bar O 100.975, H 100.975, L 100.786, C 100.820. Range 18.9 points. One bar killed half the portfolio AND provided entries at distant zones.

### Category G: War Narrative (Laws 26-30)

**Law 26: WAR NARRATIVE IS CONNECTING TISSUE**
Zones = military positions. Shapes = campaign phases. Setups = troop deployments. TP→Entry chains = sequential battle outcomes.
- Purpose: The human brain understands STORIES better than tables. A war narrative transforms data into cause-and-effect understanding.

**Law 27: TRADE CHAINING — TP OF ONE = ENTRY OF NEXT**
- BS → R: TP of BS becomes R entry zone
- BS → WL: TP of BS becomes WL entry zone
- WL → RWL: TP of WL becomes RWL entry zone
- Evidence: Wednesday chain: Trade 4 TP (100.975) = Trade 5 Entry. Trade 5 TP (101.240) = Trade 6 Entry.

**Law 28: ZONE DEFENSE TRACKING**
Track per zone: lastTestedSession, lastReactionPips, defenseStatus (DEFENDED/BROKEN/UNTESTED).
- DEFENDED = higher reaction probability. BROKEN = role reversal (broken support = new resistance).

**Law 29: PRIOR WEEK CONTEXT**
Consider: defended zones (depleted?), broken zones (role reversal?), close position relative to key zones.
- If price closed inside a zone → that zone is the "no man's land" at week open.

**Law 30: SESSION-SPECIFIC ZONE BEHAVIOR**
London: sharper reactions (22/38 winning entries). NY: deeper penetrations (15/38).
- Reasoning: London banks are INSTITUTIONAL (large orders at zone edges → sharp bounce). NY desks are MOMENTUM-DRIVEN (push deeper into zones before reacting).

### Category H: Zone Quality (Laws 31-34)

**Law 31: UM ZONES HAVE 100% REACTION RATE**
0x (UM): 100%. 1x: ~80%. 2x: ~50%. 3x+: TP target only.
- Freshness bonus: UM +10, 1x +5, 2x +0, 3x+ -5.
- Reasoning: UM zone = fresh order book, full institutional positions. Each test depletes. After 3 tests, most orders consumed.

**Law 32: MULTI-TF CONFLUENCE = STRONGER ZONE**
Dual-TF: +3. Triple-TF: +5. Refined zones preferred for entry.
- Reasoning: Multiple timeframe populations have orders at same level = deeper order book = stronger reaction.

**Law 33: LIQUIDITY QUANTIFICATION ("WOOD FOR THE FIRE")**
liquidityScore: 0-10. TP zones need ≥5.
- Factors: prior reaction strength, options notional, reaction count, session of last test.
- Without liquidity, even UM zone produces weak reaction — no "fuel" to sustain the bounce.

**Law 34: ZONE DEPLETION IS PER-TIMEFRAME**
Zone depleted on 15m might be UM on 1H. Track per TF.
- Merged zones use LOWER reactionCount (fresher of the two).

### Category I: Validation (Laws 35-37)

**Law 35: RR IS A CONSEQUENCE, NOT A TARGET**
Min RR: 1.0 (conditional), 1.2 (primary). Let zone structure determine RR.
- If you set RR as target: (a) reject structurally correct trades, (b) force bad trades by widening TP beyond ATR, (c) tighten SL inside zone.
- Logical chain: Zone structure exists → entry/SL/TP identified → distances measured → RR computed → RR IS what the market offers.

**Law 36: DUPLICATE ELIMINATION**
Dedup key: `direction_entry_sl_tp_day`. 3 staggered entries (different prices) are NOT duplicates.
- Same zone+direction+category on different days = NOT duplicate (different day context).

**Law 37: VISUAL VERIFICATION — DATA = 80%, VISION = 20%**
Screenshot → VLM confirms zone visible/intact → flag mismatches → remove broken → add missed.
- Trades execute on VISUALLY TRADEABLE, not mathematically calculated alone.

---

## APPENDIX N: GLOSSARY

**Avatar State:** When all four elemental densities (Earth, Fire, Water, Air) converge at a single price. Fractally locked signal. Failure probability approaches zero.

**BoM (Beginning of Move):** Supply/demand zone formed by the order block candle at the very beginning of a BS/WL move. 100% guaranteed reaction if unmitigated. The hottest Fire.

**BS (Breakout Surge):** Price breaks decisively through an IP zone (ZFP > 45%) and surges directionally. 4-8+ candles, large bodies, minimal wicks, progression small→massive.

**Confluence Score:** 0-14 point system measuring how many independent dimensions confirm a zone. 6 dimensions × 2 points + Structural Extreme Bonus (up to +2).

**DXY Cascade:** DXY's macro direction bias for FX pairs (inverse correlation). NOT a hard filter.

**Earth Density:** Liquidity and institutional pressure. The foundation. LSZ = standard Earth. IP Zone = heavy Earth.

**Fire Density:** Supply and demand. Institutional firepower. BoM = hottest. MoM = cooling.

**Fortress Zone:** Zone that holds 4+ times with strong reactions. Phase transitions from Fire-dominant to Earth-dominant. 95% direction flip probability.

**LQZ (Liquidity Zone):** First zone price reaches on path from spot to HTF objective. Entry zone (NOT SL anchor). Formerly called LSZ.

**MoM (Middle of Move):** Supply/demand zone formed by OB candles in the middle of a BS/WL move. Cooling Fire. Ladder steps only. Never reversal entries.

**PBS (Piercing Breakout Surge):** BS so powerful it pierces through multiple intermediate zones without pausing. ZFP > 70%.

**RWL (Reverse Whiplash):** Whiplash in opposite direction of preceding BS. Most common follow-on after BS reaches a Hard Wall. 6+ candles, mixed colors.

**Shape Chain:** Sequence of macro shapes predicted for the trading week. SS→BS→R→WL is the master pattern.

**SS (Swing Scalps):** Consolidation. Price oscillates between bounding zones. 8-30+ candles, tiny bodies, tight range.

**Spring Release:** At 10:01 AM NY, option contracts expire. Delta-hedging constraints instantly removed. Price violently breaks out or reverses.

**TP (Take Profit):** SINGLE exit price per trade. At opposing S/D with LQZ overlap (Earth+Fire). ONE TP. No TP1/TP2/TP3.

**Water Density:** Macro shapes. BS = tidal wave. WL = crashing wave. SS = calm pool. The shape chain IS Water density.

**WLS (Whiplash Storm):** Hyper-volatile SS. Multiple back-to-back WL/RWL chains with clear whiplash candles. Either dissipates into SS or precedes PBS.

**WL (Whiplash):** Rapid violent move (1-3 candles) that immediately reverses. Rejection at Hard Wall (ZFP < 20%).

**ZFP (Zone Failure Probability):** Probability that institutional defense of a zone will fail. Drives ALL shape transitions. ZFP > 45% = breakout. ZFP < 20% = Hard Wall.

**ZoC (Zone of Conquest):** High-confluence zone (3+ TF overlap + LQZ shield + BoM). Generates dual-direction setups. Not "Zone of Choice" — it determines the war's outcome.

---

## APPENDIX O: THE 8 WINNING TRADE PATTERNS — FULL DETAIL

These 8 patterns were identified through VLM analysis of the user's winning trade library (38 images across 10 folders). They represent EVERY type of trade the user executes. The pipeline must be able to generate ALL 8 pattern types. Each pattern includes the Engine 2 shape chain that produces it, the zones involved, and the elemental convergence.

### Pattern 1: SS → BS (Consolidation to Breakout Surge)

**Shape Chain:** SS (accumulation phase, 2-5 sessions) → BS (breakout through failing boundary)

**What happens:** Price consolidates in a tight range (SS) between supply above and demand below. One boundary's ZFP rises above 45% (options expiring, momentum building). The boundary fails. Price breaks through and surges directionally.

**Reference Trade:** GBP/USD 15m, Feb 27-Mar 3, 2025
- Consolidation Range: 1.2735-1.2795 (60 pip range)
- Breakout Direction: SHORT (bearish — supply ceiling broke from below, price surged up to grab buy-stops above, then reversed and crashed)
- Breakout Trigger: Liquidity sweep below consolidation support at 1.2735
- Entry: 1.2730 (on breakout candle close below consolidation floor)
- SL: 1.2795 (above consolidation high — the ceiling that was tested)
- TP: 1.2650-1.2660 (lower liquidity zone — demand zone below)
- Move: 85 pips
- RRR: ~12:1

**Zones involved:**
- Entry zone: 1.2735-1.2740 (consolidation support / liquidity shield) — Earth density
- SL zone: 1.2790-1.2795 (consolidation top) — the boundary that was tested
- TP zone: 1.2650-1.2660 (prior demand zone with liquidity) — Earth+Fire overlap
- Prior high supply: 1.2845-1.2855 (secondary supply, not reached)

**Fibonacci:** 50%-61.8% = consolidation midpoint. 0% = final target.

**Elemental Convergence:** Earth (consolidation accumulated liquidity at boundaries) + Fire (supply zone at ceiling) + Water (SS→BS shape transition) + Air (Fib 50% at consolidation midpoint).

**Pipeline requirement:** Must detect SS consolidation range, identify which boundary's ZFP is rising, predict breakout direction, and generate BS entry at the boundary break.

---

### Pattern 2: Swing Scalps (Pure Consolidation Week)

**Shape Chain:** SS (entire week — no breakout materializes)

**What happens:** Price stays range-bound ALL WEEK. Both boundaries hold (ZFP < 30% on both sides). The user trades swing scalps at the range boundaries — LONG at demand floor, SHORT at supply ceiling. Each scalp captures the bounce from the boundary.

**Reference Trade:** GBP/USD 15m, April 17, 2026
- Range: 1.3508-1.3548 (40 pip range)
- Scalps visible: 3 (LONG at floor, SHORT at ceiling, LONG at floor again)
- Primary Scalp: Entry 1.35060, SL 1.34998 (6.2 pips), TP 1.35398 (33.8 pips)
- RRR: 6.5:1
- Session: London Open (09:00 UTC+4)

**Zone strategy:** BoM (4H liquidity) structural floor + MoM (15m/30m) entry refinement.

**Multi-TF Confluence:** 4H demand + 30m demand + 15m supply = bounce targets. The 4H provides the structural anchor. The 30m refines the entry zone. The 15m supply provides the scalp target within the range.

**Elemental Convergence:** Earth (liquidity at range boundaries) + Fire (S/D at boundaries) + Water (SS shape — range oscillation). Air is less relevant (no directional move to map with Fib).

**Pipeline requirement:** Must detect SS shape with both boundaries < 30% ZFP, generate Consolidation category setups at BOTH boundaries, assign London session, and compute scalp SL/TP within the range.

---

### Pattern 3: R → BS/WL (Recovery to Breakout/Whiplash)

**Shape Chain:** BS → R → BS/WL (recovery from first move, then second directional push)

**What happens:** After a BS completes and price recovers (R), the recovery reaches an opposing zone. At that zone, either a new BS ignites (continuation in original direction) or a WL fires (rejection and reversal).

**Reference Trade:** GBP/USD 15m, Feb 18, 2026
- Recovery Zone: 1.3530-1.3560 (1x Mitigated MoM)
- Recovery Base: 1.3510-1.3520 (demand floor)
- Whiplash Trigger: 1.3580-1.3585 (30m Unmitigated MoM Supply)
- Recovery Entry (LONG): Entry 1.3535, SL 1.3510, TP 1.3580. Profit: +45 pips.
- Whiplash Entry (SHORT): Entry 1.35615, SL 1.3674, TP 1.35255. Profit: +36 pips.
- Reinforcement Rockets: 1.3555, 1.3540, 1.3520 (scaling in as bearish move confirms)
- Combined RRR: 10.8:1 ($6,800 reward / $625 risk)

**Fibonacci:** 38.2% = 1.3570, 61.8% = 1.3555, 127.2% ext = 1.3505

**Elemental Convergence:** Earth (recovery zone demand + LQZ at 1.3510) + Fire (MoM supply at 1.3580) + Water (R→WL shape transition) + Air (Fib 61.8% at 1.3555 = reinforcement entry).

**Pipeline requirement:** Must predict R phase, identify opposing MoM zone as whiplash trigger, generate BOTH recovery LONG and whiplash SHORT as trade chain, and place reinforcement rockets at Fib levels within the recovery zone.

---

### Pattern 4: BS → R/RWL (Breakout to Recovery/Reverse Whiplash)

**Shape Chain:** BS → R or BS → RWL (the highest R:R pattern — multiple entries in both directions)

**What happens:** A strong BS move reaches its target BoM zone. If the BoM is unmitigated → RWL (violent reversal). If mitigated → R (soft recovery). Either way, the user enters at the reaction point for the reversal/recovery.

**Reference Trade:** GBP/USD 15m
- BoM Origin: 1.2300-1.2350 (1H UM BoM Demand) + 1.2250-1.2300 (4H UM BoM Demand)
- Breakout Peak: ~1.3650 (~1300 pips from origin — massive multi-week BS)
- Recovery Zone: Liquidity Shield Zone 1.3500-1.3550
- SL Management: Initial SL below 4H BoM (1.2250) → breakeven at 1.2350 after 100 pip move
- Key Resistance: 1.3600-1.3650 (1H Refined 4H 3x Mitigated BoM)
- Combined RRR: 3:1+ across stacked entries

**Elemental Convergence:** Earth (BoM zones + LSZ) + Fire (multiple S/D zones) + Water (BS→RWL shape chain) + Air (multi-TF Fib confluence from 1300 pip move).

**Pipeline requirement:** Must track the BS from its BoM origin, predict the RWL at the target BoM zone, generate reversal entry at the BoM reaction, and manage the SL cascade as the reversal progresses.

---

### Pattern 5: PBS → R → WL(S) (Piercing Breakout → Recovery → Whiplash Sequence)

**Shape Chain:** PBS → R → WLS (or WL sequence — the most complex weekly pattern)

**What happens:** A piercing breakout surge blasts through multiple zones. Price then recovers (R) into a consolidation. During the consolidation, a WLS (Whiplash Storm) develops — hyper-volatile oscillation with WL-type candles on both sides. The WLS eventually resolves into a directional move.

**Reference Trade:** GBP/USD 1H (the WLS screenshot the user referenced)
- Piercing Breakout: From 1.3100 to 1.3520 (~420 pips — massive PBS)
- Recovery Consolidation: 1.3280-1.3380 (multi-day)
- Whiplash Storm: 14-15+ candles oscillating violently between 1.34200-1.35250 (~100 pip range)
  - Each candle has LONG wicks on BOTH sides
  - Liquidity is being grabbed on EVERY oscillation
  - This is a hyper-volatile SS — consolidation structure but with WL intensity
- WLS resolves into either SS (volatility decreases) or PBS (energy powers a new breakout)

**Entry opportunities during WLS:**
- LONG at bottom of storm range (~1.34200): Entry 1.3280-1.3300, SL 1.3220, TP 1.3400-1.3500. RRR 2:1 to 3.67:1
- SHORT at top of storm range (~1.3380): Entry 1.3370-1.3380, SL 1.3400, TP 1.3280-1.3200. RRR 5:1 to 9:1

**Fibonacci:** 38.2% = 1.3330, 50% = 1.3310, 61.8% = 1.3290, 78.6% = 1.3250, 1.618 ext = 1.3500

**Day Assignment:** PBS = Mar 24-25, Recovery = Mar 25-Apr 28, Whiplash = Apr 28, Scalps = post Apr 28

**Elemental Convergence:** Earth (multiple LQZ within storm range) + Fire (S/D zones at range boundaries) + Water (PBS → R → WLS shape chain) + Air (Fib levels within the recovery zone map reinforcement entries).

**Pipeline requirement:** Must detect PBS, predict R phase, identify WLS by its candle anatomy (long wicks both sides, rapid alternation, 14+ candles), generate Consolidation scalps at storm boundaries, and predict WLS resolution direction.

---

### Pattern 6: R → WL (Recovery to Whiplash)

**Shape Chain:** R → WL (recovery exhausts at liquidity, producing a whiplash)

**What happens:** After a BS, price recovers (R). At the extreme of the recovery, a long-wick candle appears — this is a LIQUIDITY GRAB. Price spiked to grab resting orders at the recovery extreme, then snapped back. This liquidity grab IS the WL.

**Reference Trade:** GBP/USD 30m, Apr 15-17, 2024
- Entry: 1.3515 (at start of sharp downward candle post-rejection)
- SL: 1.3540 (above upper liquidity spike wick, OUTSIDE supply zone)
- TP: 1.3425 (lower unmitigated demand/liquidity zone)
- RRR: 7-9:1 (10-15 pip risk, 80-90 pip reward)
- Session: Post-London rejection → NY continuation

**Fibonacci:** 0.786 retracement = TP zone confluence. 1.272/1.618 extension = whiplash spike confirmation.

**Elemental Convergence:** Earth (liquidity at recovery extreme) + Fire (supply zone causing rejection) + Water (R→WL transition) + Air (0.786 Fib at TP zone).

**Pipeline requirement:** Must predict R phase, identify the liquidity grab candle at recovery extreme (LONG_WICK pattern), generate WL entry at the rejection, and set TP at nearest opposing demand with LQZ overlap.

---

### Pattern 7: WL → RWL/R (Whiplash to Reverse Whiplash/Recovery)

**Shape Chain:** WL → RWL (whiplash rejection reverses)

**What happens:** A WL fires at a Hard Wall. Price spikes to the zone, grabs liquidity, then snaps back. The snap-back IS the RWL — price reverses in the opposite direction of the WL. Both the WL entry and the RWL entry are valid — they capture opposite sides of the same liquidity event.

**Reference Trade:** GBP/USD 1H
- Initial Whiplash: ~1.3900 (stop hunt above resistance — buy-stops grabbed)
- WL Entry (LONG): ~1.3850, SL 1.3800, TP 1.3900. RRR 1:1 (short bounce)
- RWL Entry (SHORT): ~1.3900, SL 1.3950, TP 1.3750. RRR 3:1 (the REAL trade)
- Energy Cycle: WL (MAXIMUM energy) → RWL (partial recovery) → R (full recovery)

**The key insight:** The WL entry captures the bounce FROM the Hard Wall. The RWL entry captures the reversal BACK from the bounce point. The RWL is the higher-value trade (3:1 vs 1:1) because the reversal has more room to run.

**Elemental Convergence:** Earth (Hard Wall at 1.3900 with massive liquidity) + Fire (supply zone causing rejection) + Water (WL→RWL transition) + Air (Fib extension targets for RWL TP).

**Pipeline requirement:** Must detect WL at Hard Wall, generate WL entry at the rejection, then IMMEDIATELY chain to RWL entry at the WL's TP zone. The RWL is the higher-value follow-on trade.

---

### Pattern 8: LIQUIDITY LADDERS (Highest R:R — 25-30x Combined)

**Shape Chain:** BS (sustained directional move with multiple reinforcement entries)

**What happens:** The user enters a primary position at a BoM zone, then places STOP-LIMIT orders at each subsequent liquidity zone along the TP path. As price progresses toward TP, each liquidity zone triggers a reinforcement entry. Each trigger moves the prior entry's SL to breakeven. By the time TP is reached, the combined R:R is 25-30x with ZERO DOWNSIDE after the first reinforcement triggers.

**Reference Trade:** GBP/USD 1H
- Primary Entry Zone: 1.31800-1.31800 (15m Unmitigated MoM — Earth+Fire overlap)
- 3-Step Ladder:
  1. **Base Entry:** Entry 1.31800, SL 1.31100, TP 1.33000
     - Risk: 70 pips. Reward: 120 pips. R:R = 1.7:1
  2. **Middle Rocket:** Entry 1.33000, SL 1.32700, TP 1.33670
     - Trigger: Price reaches 1.33000 (next MoM zone). Base SL → BE at 1.31800.
     - Risk: 30 pips (but Base is now risk-free). Reward: 67 pips.
  3. **Upper Rocket:** Entry 1.33670, SL 1.33300, TP 1.34915
     - Trigger: Price reaches 1.33670 (next MoM zone). Middle SL → BE at 1.33000.
     - Risk: 37 pips (but Base AND Middle are now risk-free). Reward: 124 pips.
- **Combined R:R:** 25-30x
  - Total risk: 70 pips (only the Base entry — all others are risk-free after cascade)
  - Total reward: 120 + 67 + 124 = 311 pips
  - Combined: 311 / 70 = 4.4x per entry, but 25-30x when accounting for position sizing (50/30/20)

**Fibonacci Mapping:**
- Base 1.31800 = 0.0 Fib (swing low)
- Middle 1.33000 = 0.5 Fib (equilibrium)
- Upper 1.33670 = 0.618 Fib (golden ratio)
- Final TP 1.34915 = 1.618 Fib (golden extension)

**SL Cascade step-by-step:**
1. Base entry fills at 1.31800. SL at 1.31100. Risk = 70 pips on 50% of position.
2. Price moves to 1.33000. Middle rocket triggers (stop-limit fills).
3. Base SL moves to 1.31800 (breakeven). Base is now RISK-FREE.
4. Only Middle carries risk: 30 pips on 30% of position.
5. Price moves to 1.33670. Upper rocket triggers.
6. Middle SL moves to 1.33000 (breakeven). Middle is now RISK-FREE.
7. Only Upper carries risk: 37 pips on 20% of position.
8. Price reaches TP at 1.34915. All three positions close in profit.
9. Total realized: Base +120, Middle +67, Upper +124 = +311 pips.
10. Maximum risk at any point: 70 pips (only before first rocket trigger).

**Elemental Convergence:** Earth (LQZ at each MoM zone along path) + Fire (MoM S/D zones providing reaction points) + Water (BS sustained directional move) + Air (Fib levels mapping each rocket entry: 0.0 → 0.5 → 0.618 → 1.618).

**Pipeline requirement:** Must generate the primary entry at the BoM zone, identify MoM zones along the TP path, place stop-limit orders at each MoM, implement SL cascade (each trigger → prior SL to BE), and compute combined R:R across all positions.

---

## APPENDIX P: THE 5 CRITICAL BUGS — COMPLETE MECHANICAL ANALYSIS

These 5 bugs were identified through forensic VLM analysis of all 38 winning trades compared against the pipeline's V2 output. Each bug includes the EXACT failure mechanism, the EVIDENCE, and the CORRECT BEHAVIOR.

### Bug #1: SL CALCULATION IS STRUCTURALLY WRONG — CRITICAL

**Current behavior:** `SL = zone_edge + SNIPER_BUFFER[pair][category]` — a FIXED buffer of 8-15 pips per pair and category.

**Correct behavior:** `SL = next_structural_zone_edge + 2-5 pip buffer` — the SL is at the NEXT zone beyond the entry zone, not at a fixed distance from the entry.

**The EXACT failure — step by step with numbers:**

Given a 15m demand zone:
- Zone floor: 1.36220
- Zone ceiling: 1.36327
- Zone width = 1.36327 - 1.36220 = 0.00107 = **10.7 pips**
- Entry: 1.36327 (ceiling, LONG — entering at the top of demand)
- Winning trade SL: 1.36220 (floor) = exactly at opposite zone edge
- Winning trade SL distance: 10.7 pips (= zone width)

What Engine 3 does:
- SL = entry - SNIPER_BUFFER = 1.36327 - (8 pips × 0.0001) = 1.36327 - 0.00080 = **1.36247**
- SL distance: 8 pips

Where is 1.36247?
- Zone floor: 1.36220
- Zone ceiling: 1.36327
- Zone midpoint: 1.362735
- Engine SL: 1.36247

**1.36247 is ABOVE the zone floor and BELOW the midpoint. The SL is INSIDE THE ZONE.**

**Mechanical consequence:** When price tests a demand zone, it typically:
1. Touches the ceiling (entry trigger)
2. Penetrates INTO the zone (1-5 pips deep)
3. Wicks down to near the floor (testing full zone depth)
4. Reverses upward (the reaction)

The winning trade survives step 3 because its SL is at the FLOOR (1.36220). The wick reaches 1.36230 (5 pips above floor) and reverses. SL not hit. Trade proceeds to TP.

Engine 3's SL at 1.36247 is hit DURING step 3. The wick reaches 1.36230 — that's BELOW 1.36247. SL triggered. Trade CLOSED at a loss.

But the zone HELD — price reversed from 1.36230 and would have gone to TP. Engine 3 was stopped out by a NORMAL WICK that the winning trade survived.

**Cascading damage from this single bug:**
1. Trade that SHOULD have been a WIN is recorded as a LOSS
2. Win rate drops from potential 70%+ to actual 30%
3. Confidence calculations use historical win rate → low confidence → setups downgraded
4. RR appears terrible (losses at -1R instead of wins at +3R)
5. Pipeline rejects similar setups in future because "this zone type produces losses"

**WHY fixed buffer is structurally wrong:**
- Fixed 8 pips is TOO WIDE for a 3-pip zone (SL is 2.67× zone width — excessively cautious, terrible RR)
- Fixed 8 pips is TOO NARROW for a 15-pip zone (SL is at 53% of zone width — inside the zone, guaranteed stop-out)
- Fixed 8 pips is PERFECT for a ~10-pip zone (coincidence — this is why SOME Engine 3 setups survived)

The SL must scale with zone geometry: SL = next zone edge + 2-5 pip buffer. This ensures the SL is always at the STRUCTURAL INVALIDATION POINT, not at a random pip distance.

---

### Bug #2: TOO MANY TRADES ON ONE DAY — HIGH

**Current behavior:** Pipeline iterates ALL zones × ALL days × ALL categories. Same zone+direction+category generates a DIFFERENT setup for each day (because dedup key includes day).

**Evidence:** 5 trades on Tuesday because every eligible zone generated a setup for Tuesday, Wednesday, Thursday separately.

**Correct behavior:** Maximum 2 setups per day per pair. Keep top 2 by confidence.

**Winning trade evidence:** 1-2 setups per pair per WEEK in the golden standard. The user does NOT overtrade — they wait for the BEST setups.

**Impact of bug:** Report fills with redundant entries. Per-category caps consumed by duplicates. Operator wastes time evaluating copies. System appears to have 3× more opportunities than reality.

---

### Bug #3: SESSION TIMING IS DECORATIVE — HIGH

**Current behavior:** Session assigned by category (Consolidation → London, HTF Swing → NY). But entry is a LIMIT ORDER at zone edge that fills ANY TIME — including Asian session.

**Evidence:** July 6-10 backtest: 0/10 setups filled during assigned session. ALL filled during Asian session (00:00-02:00 ET). Price touched entry during low-liquidity hours, filled, then reversed and hit SL.

**Mechanical difference between Asian and London fills:**

| Property | Asian Fill | London Fill |
|----------|-----------|-------------|
| Liquidity depth | ~$200B/hr (20% of London) | ~$800B/hr |
| Order book | Thin — few resting orders | Thick — institutional orders stacked |
| Spread | Wide (1.5-3 pips EUR/USD) | Tight (0.1-0.5 pips) |
| Post-fill behavior | REVERSES — no sustaining volume | CONTINUES — institutional momentum |
| Stop vulnerability | HIGH — thin book, price spikes easily hit SL | LOW — thick book absorbs spikes |
| Reaction at zone | WEAK — few orders to trigger reaction | STRONG — institutional defense fires |

**WHY Asian fills reverse:**
1. No institutional participation — major banks inactive
2. Spread widening — effective entry price 1.5-3 pips worse than limit
3. False breakouts — thin liquidity means small orders move price beyond zone edges
4. Session transition gap — when London opens, European banks REPOSITION and aggressively reverse Asian session levels

**Correct behavior:** Session filter should be CONDITIONAL on liquidity score:
- liquidityScore ≥ 7: allow entry in any session (enough institutional orders to react regardless)
- liquidityScore ≥ 5: allow entry in London/NY only
- liquidityScore < 5: reject (no "wood for the fire")

This explains why 3/38 winning trades DID enter during Asian session — those were zones with very high liquidity scores.

---

### Bug #4: REINFORCEMENT ROCKETS AT WRONG EDGE — MEDIUM

**Current behavior (V2):** Reinforcement entry at the FAR edge of the zone (opposite from primary). Primary at ceiling, reinforcement at floor.

**Correct behavior:** Two DIFFERENT mechanisms exist (see Part 7):
- **Mechanism A (intra-zone staggered):** Rockets go DEEPER into zone from primary, toward SL. Primary at ceiling, R1 at 1/3 into zone, R2 at 2/3. This averages DOWN into the zone.
- **Mechanism B (cross-zone ladder):** Rockets at FURTHER zones (2-3 zones ahead toward TP). These scale INTO a winning trade as it progresses.

The V2 bug confused these two mechanisms. It placed Mechanism B rockets (at further zones) using Mechanism A logic (within the same zone) — resulting in reinforcements at the WRONG edge of the SAME zone.

**Correct Mechanism A placement:**
```
LONG at demand zone (floor=100.80, ceiling=100.90):
  Entry 1 (Front):  100.90 - 1 pip spread = 100.89  (ceiling, 33%)
  Entry 2 (Middle): 100.85                        (midpoint, 33%)
  Entry 3 (Back):   100.80 + 1 pip spread = 100.81 (floor, 34%)
  SL: 100.75 (next demand zone below - buffer)
  TP: 101.15 (opposing supply)
```

Entry 3 (Back) is DEEPER into the zone from Entry 1 — closer to the floor, further from spot. This is averaging DOWN (for LONG) into the zone. Each deeper entry gets a BETTER price but requires price to penetrate deeper into the zone.

**Correct Mechanism B placement (cross-zone ladder):**
```
Primary: BoM zone at 100.80-100.90. Entry 100.89. SL 100.75.
Rocket 1: MoM zone at 101.00-101.05. Trigger at 101.05. Entry at 101.00.
Rocket 2: MoM zone at 101.15-101.20. Trigger at 101.20. Entry at 101.15.
TP: BoM supply at 101.30-101.35.
```

Rockets are at DIFFERENT zones further along the TP path. Each triggers when price reaches the next MoM zone TOWARD TP.

---

### Bug #5: LSZ ENFORCEMENT SOLVING A NON-PROBLEM — MEDIUM

**Current behavior (V2 with Wave 2 fixes):** Mandatory LSZ shield check between entry and SL. If no LSZ found, uses structural shields (entry zone itself) as fallback.

**Evidence:** In 84% (32/38) of winning trades, there is NO separate LSZ between entry and SL. The entry zone ITSELF is the shield. SL at opposite edge of entry zone + buffer.

In 6/38 (16%), there IS a separate LSZ between entry and SL. SL placed behind it.

**Problem:** The mandatory LSZ check REJECTS valid setups where the entry zone IS the shield (84% of winning trades). This caused false rejections.

**Correct behavior:** Remove mandatory LSZ check. Use zone geometry for SL (Bug #1 fix). The SL is already at the next structural zone — that IS the shield. The entry zone doesn't need a separate LSZ between it and the SL because the SL IS at a structural zone.

---

## APPENDIX Q: REPORT GENERATION PIPELINE

### Report Structure (36 Sections)

The weekly TTE report contains 36 sections organized into logical groups:

**Sections 1-2: Market Context**
1. OTC Option Expiries — three-tier classified (CRITICAL/SIGNIFICANT/EXCLUDED), with notional, pair, strike, DXY equivalent
2. OHLC Data + Economic Calendar — prior week OHLC for all 4 pairs, red-folder events for target week

**Sections 3-4: Engine Output**
3. Engine 1 Zone Maps — per pair: all zones with ranges, pressure degrees, confluence scores, ZFP, BoM/MoM, POI tiers, LSZ flags
4. Engine 2 Shape Chain — per pair: current shape, primary chain (max 5 shapes), alternative chain, day decomposition (Mon-Fri)

**Sections 5-16: Engine 1 Detailed**
5. Pillar 1: Pivot Grid — all 42 calculated levels with verification checks
6. Pillar 2: MA Confluence — 12 MAs with weights, clusters, recapture flags
7. Pillar 3: S/D Overlap — binary overlap detection
8. Pillar 4: Analyst Consensus — extracted levels with source URLs and tiers
9. Pillar 5: Structural Extremes — swing H/L with wicks, order blocks, confluent floors/ceilings, repeated magnets
10. Pillar 6: Round Numbers — .00/.25/.50/.75 levels with confluence
11. Pillar 7: Derivatives Arena — (SUPPLEMENTARY — usually empty due to blocked sources)
12. Pillar 8: EUR/USD Options — K factor audit trail, three-tier classification, confidence bands
13. Pillar 9: Regime + ZFP — per-zone ZFP with modifiers, Measured Move projections, breakout alerts
14. Protocol A: OTC Options — full expiry table with pairs, strikes, notionals
15. Protocol B: K Factor — computed K with component pair spots
16. Synthesis: Confluence + ZFP — assembled zone map with all scores

**Sections 17-18: Engine 2 + Engine 3**
17. Shape Chain (full transition matrix with audit trail, alternative chains, consolidation phases)
18. Trade Setup Architecture (per setup type: entry, SL, TP, session, confidence, shape trigger)

**Sections 19-20: Compliance**
19. Filter Checkpoint — which setups passed/failed firewall and WHY
20. Compliance Sweep — 7 checks + BE1-BE12 blind-execution verification

**Sections 21-36: Multi-Pair**
21-24: DXY → EUR/USD Translation (direction mapping, pair-specific zones, conviction matching, cross-validation)
25-28: DXY → GBP/USD Translation
29-32: DXY → AUD/USD Translation
33-34: Cross-Pair Matrix (all setups side-by-side, direction balance, category distribution)
35-36: Weekly Execution Calendar + Pine Script v6

### Weekly Execution Calendar Format

```
| Day  | Pair   | Dir   | Category      | Entry    | SL      | TP      | Shape | Session | Conf | Notes                    |
|------|--------|-------|---------------|----------|---------|---------|-------|---------|------|--------------------------|
| Mon  | DXY    | LONG  | Consolidation | 100.945  | 100.905 | 101.115 | SS    | London  | 72   | Demand floor bounce      |
| Mon  | DXY    | SHORT | HTF Swing    | 101.14   | 101.200 | 100.845 | BS    | NY      | 78   | Supply ceiling rejection |
| Tue  | DXY    | LONG  | Consolidation | 100.845  | 100.77  | 101.190 | R     | London  | 75   | Recovery from Mon BS TP  |
| Wed  | DXY    | SHORT | Consolidation | 101.19   | 101.25  | 100.975 | SS    | London  | 80   | Range top scalp          |
| Wed  | DXY    | LONG  | Reversal     | 100.975  | 100.905 | 101.240 | RWL   | NY      | 82   | Hard Wall bounce         |
| Wed  | DXY    | SHORT | HTF Swing    | 101.235  | 101.330 | 100.680 | BS    | NY      | 85   | 4H BoM supply rejection  |
| Thu  | DXY    | SHORT | Reinforcement| multiple | —       | 100.680 | R     | NY      | 70   | Ladder at LQZ            |
| Fri  | DXY    | SHORT | HTF Swing    | from Wed | —       | 100.680 | WL    | NY      | 68   | Continuation             |
```

### Pine Script v6

Generated alongside the report for TradingView visualization. Includes:
- Zone rectangles (supply=red, demand=blue, LQZ=green) at each zone's floor/ceiling
- Entry lines with labels (Entry 1/2/3 for staggered)
- SL lines with labels
- TP lines with labels
- Shape annotations (SS/BS/R/WL/RWL at appropriate chart positions)
- Session markers (London/NY boxes on chart)
- Reinforcement rocket trigger zones

### Report Generation Requirements

1. Report generated ONCE at start of week. NOT regenerated daily.
2. Report is the ANCHOR for the entire week's trading.
3. Daily re-analysis checks for invalidation but does NOT overwrite the weekly report.
4. Every setup must have: DAY, SESSION, SHAPE TRIGGER, CATEGORY, ENTRY, SL, TP, CONFIDENCE.
5. Report must pass ALL 12 blind-execution checks (BE1-BE12).
6. Close ALL positions by NY close Friday (Profit Taking Law).

---

## APPENDIX R: MULTI-PAIR TRANSLATION — COMPLETE WORKED EXAMPLE

### Scenario: Translating DXY Bullish Week to EUR/USD

**DXY Analysis:** SS (Mon-Tue) → BS UP (Wed) → R (Thu) → WL (Fri)

**DXY Direction:** BULLISH (BS up = demand wins, supply fails, DXY rises)

**Step 1: Map DXY Direction to EUR/USD**

DXY bullish → EUR/USD bearish (inverse correlation — when dollar strengthens, EUR weakens).

EUR/USD macro direction for HTF swings: **SHORT** (bearish-biased)

**Step 2: Harvest EUR/USD Specific Data**

Fetch EUR/USD OHLC (4H, 1H, 15m), options data (EUR/USD strikes), analyst commentary (EUR/USD specific levels), economic calendar (ECB events).

**Step 3: Identify EUR/USD Specific Zones**

Using the same 9-pillar analysis on EUR/USD data:
- EUR/USD supply zones (above spot) → SHORT entries
- EUR/USD demand zones (below spot) → LONG entries or TP targets
- EUR/USD LQZ (1H candlestick patterns) → entry zones

**Step 4: Match DXY Conviction to EUR/USD Levels**

DXY has a CRITICAL OPTION WALL at 101.50 (ZFP < 10%, Hard Wall). This maps to EUR/USD support at approximately 1.0800 (using the inverse DXY formula: EURUSD = (K/DXY)^(1/0.576)).

If EUR/USD has its own demand zone at 1.0795-1.0805 (from 9-pillar analysis), the DXY Hard Wall at 101.50 CONFIRMS this EUR/USD level as a strong support. The conviction transfers: DXY EXTREME pressure → EUR/USD strong demand.

**Step 5: Cross-Validate (7 Requirements)**
1. EUR/USD spot verified from 2+ sources (within 5 pips): TradingView + forex.com ✓
2. 200-day MA value: 1.0850 ✓
3. 3+ institutional S/R levels from 2+ sources: ING "1.0800 support", forex.com "1.0795 demand" ✓
4. MA signal consensus: EMA 50 below spot (bearish), EMA 200 at 1.0850 (above spot = resistance) ✓
5. Prior week H/L/C: H=1.0920, L=1.0780, C=1.0850 ✓
6. EUR/USD options data: €1.8B strike at 1.0800 (Friday expiry) ✓
7. Cross-validation: translated zone within 100 pips of verified level: 1.0800 vs 1.0795 = 5 pips ✓

**Step 6: Generate EUR/USD Setups**

Based on the DXY bearish macro direction for EUR/USD:
- **Primary HTF Swing:** SHORT from EUR/USD supply at 1.0920 (prior week high, now supply). Entry 1.0915, SL 1.0950, TP 1.0800. Shape: BS down (EUR/USD mirrors DXY BS up).
- **Consolidation Scalp:** LONG at EUR/USD demand 1.0800 during London (bounce from support before the BS down resumes during NY). Entry 1.0805, SL 1.0775, TP 1.0850. Shape: SS scalp within the bearish context.
- **Reinforcement:** Rockets at intermediate MoM zones between 1.0920 and 1.0800 (e.g., 1.0880, 1.0850).

**Step 7: Assemble Cross-Pair Matrix**

| Pair | Macro Dir | Primary Swing | Scalp Direction | Key Zone | Session |
|------|-----------|--------------|----------------|----------|---------|
| DXY | BULLISH | LONG from demand | Both (SS range) | 100.945 / 101.14 | London/NY |
| EUR/USD | BEARISH | SHORT from supply | LONG at demand (counter-trend scalp) | 1.0920 / 1.0800 | London/NY |
| GBP/USD | BEARISH | SHORT from supply | LONG at demand | 1.2700 / 1.2600 | London |
| AUD/USD | BEARISH | SHORT from supply | (No scalps — BS/WL only) | 0.6700 / 0.6600 | Tokyo/London |

**Key insight:** Each pair has BOTH a primary HTF swing direction (aligned with DXY macro) AND valid counter-trend scalps (at strong zones during London). The macro direction does NOT eliminate counter-trend opportunities — it prioritizes which setups are primary vs secondary.

---

## APPENDIX S: THE 25 PROPOSED KNOWLEDGE GRAPH ENTRIES

These 25 curated rules are the institutional trading knowledge that should be injected into the system's knowledge base. Each encodes a specific trading law with its rationale.

1. `plutus:fundamental-laws:v4` — All 37 laws as canonical reference
2. `plutus:rule:sl-placement` — SL at next zone + buffer (EUR=2, GBP=3, AUD=3, DXY=5), fallback max(zoneWidth×2, 1.5×ATR), minimum 0.5×ATR
3. `plutus:rule:tp-placement` — TP at nearest opposing zone with demand+liquidity (Earth+Fire), midpoint if overlap, near edge if not, max 2×weeklyATR
4. `plutus:rule:forward-spread` — EUR=1pip, AUD=1.5, GBP=2, DXY=0.02pts
5. `plutus:rule:staggered-entries` — 3 entries: Front+spread (33%), Middle key level (33%), Back+spread (34%)
6. `plutus:rule:lqz-entry` — LQZ = first zone on path, ENTRY zone not SL anchor
7. `plutus:rule:no-teleport` — Price defends zones sequentially. Cannot skip UM zones.
8. `plutus:rule:tf-telescoping` — 4H→1H→30m→15m top-down with TF-scaled params
9. `plutus:rule:dxy-cascade` — DXY macro direction → FX pairs inverse for HTF swings. Counter-trend scalps valid with 3+ confluences.
10. `plutus:rule:session-enforcement` — London 02:00-05:00ET, NY 08:00-10:00, NY Mid 10:00-14:00. Conditional on liquidity score.
11. `plutus:rule:candle-confirmation` — Engulfing (47%), pin bar (32%), inside bar (21%), breakout (16%)
12. `plutus:rule:news-catalyst` — Red-folder events = shape transition catalysts. Predict spike direction.
13. `plutus:rule:um-priority` — UM 100%, 1x 80%, 2x 50%, 3x+ depleted. Prioritize UM for entries.
14. `plutus:rule:war-narrative` — Zones=battlefronts, shapes=phases, setups=deployments
15. `plutus:rule:visual-verification` — Data 80%, Vision 20%. VLM confirms zone visible/intact.
16. `plutus:rule:tf-zone-params` — 4H (15-40), 1H (8-25), 30m (5-15), 15m (3-10) pip widths
17. `plutus:rule:atr-requirement` — ATR(14) on 1H per pair. SL minimum 0.5×ATR.
18. `plutus:rule:liquidity-score` — 0-10 scale, TP zones need ≥5. "Wood for the fire."
19. `plutus:rule:trade-chaining` — TP of setup N = entry of setup N+1. Shape transitions define chain links.
20. `plutus:rule:dedup` — direction+entry@2dp. Different entries at same zone are NOT duplicates.
21. `plutus:rule:daily-cap` — Max 2 setups/day/pair. Keep top 2 by confidence.
22. `plutus:rule:entry-side` — SHORT from supply above spot, LONG from demand below spot. PER-ZONE.
23. `plutus:rule:sl-fallback` — entry±max(zoneWidth×2, 1.5×ATR) when no zone within 100 pips
24. `plutus:rule:tp-sanity` — >2×weeklyATR = ambitious, >3× = reject
25. `plutus:rule:backtest-session` — Filter fills to session window. Conditional on liquidity score.

---

## APPENDIX T: CHECKPOINT HISTORY

| Checkpoint | Description | Status |
|-----------|-------------|--------|
| v3.3_2026-07-14_TEMPORAL_SCOPING | Original pre-overhaul | Reference |
| v3.3_ENGINE3_FUNCTIONAL_BASELINE | V2 with zone-geometry SL | Reference |
| v3.3_WORKING_ENGINE_3_BASELINE | V4 with LTF entries + staggered | Reference |
| v3.3_V4_FULL_ARCHITECTURAL_OVERHAUL | Complete V4 with 37 laws | Reference |
| v3.3_3ENGINE_COMPLIANCE_OVERHAUL | Engine 1+2+3 compliance | SHA: 044e208... |
| v3.3_HANDOVER_2026-07-17 | Full handover | SHA: c2b6341... |
| v3.3_COMPACTION_PROOF_2026-07-18 | LQZ + identity wired | SHA: 840f4aa... |
| v4.0_6_SETUPS_BASELINE | 6 correct setups, 3/3 direction | Source for merge |
| v4.0_WORKING_TOOLS_BROWSER_BASELINE | Browser MCP, Docker infra | Source for merge |
| **v4.1_WORKING_BASELINE_CLEAN** | Clean merge target | **CURRENT** SHA: 03f6fdb... |

---

## APPENDIX U: V7.7 PHASE LOSS DISTINGUISHING METRICS

For shape prediction accuracy, each shape's candle tokens must be measured against these metrics:

### BS Phase Tokens Must Have:
- **bodyFraction:** HIGH on thrust candles (0.65-0.95). SMALL on retracements (0.2-0.4)
- **wickRatio:** SMALL (<0.2) on thrust candles. MODERATE on retracements
- **candleProgression:** Small → medium → large → MASSIVE (final candle = largest)
- **retracementSize:** SMALL (<30% of thrust candle range)
- **colorConsistency:** MIXED but dominant direction clear
- **candleCount:** 4-8+
- **zoneRelationship:** Must move TOWARDS a BoM zone of opposite liquidity
- **zoneType:** Must target BoM zones, ignore MoM zones
- **zoneMitigation:** At zone: RWL if unmitigated, R if mitigated

### WL Phase Tokens Must Have:
- **bodyFraction:** MODERATE-HIGH on momentum candles (0.5-0.7). MODERATE on grab candles (0.3-0.5)
- **wickRatio:** LONG (~1× body length) on grab candles. SMALL on momentum candles
- **candleProgression:** No progression — appears at full size
- **colorConsistency:** ALL same color (unidirectional)
- **candleCount:** 1-3
- **zoneRelationship:** Must move TOWARDS a BoM zone of opposite liquidity
- **zoneType:** Must target BoM zones, ignore MoM zones

### RWL Phase Tokens Must Have:
- **bodyFraction:** MODERATE on all candles (0.3-0.5)
- **wickRatio:** MODERATE (~0.3-0.5) on grab candles
- **retracementSize:** MODERATE (30-60% of thrust candle range)
- **colorConsistency:** MIXED with reverse direction dominant
- **candleCount:** 6+
- **zoneRelationship:** Happens when BS touches opposing zone
- **zoneMitigation:** Happens at unmitigated zones

### SS Phase Tokens Must Have:
- **bodyFraction:** TINY (0.10-0.30)
- **totalRange:** SMALL (0.2-0.5 of context average)
- **wickRatio:** MODERATE (0.3-0.5)
- **colorConsistency:** MIXED (alternating)
- **candleCount:** 8-30+
- **zoneRelationship:** Consolidates BETWEEN supply and demand

### R Phase Tokens Must Have:
- **bodyFraction:** MEDIUM (0.40-0.60)
- **totalRange:** MODERATE (0.8-2.0)
- **candleCount:** 6-24
- **shape:** V-shaped (first half correction, second half recovery)

### Five KEY Distinguishing Features:
1. BS vs WL: BS has NO long wicks on thrust. WL has LONG wicks on grabs.
2. BS vs RWL: BS retracements SMALL (<30%). RWL MODERATE (30-60%).
3. WL vs RWL: WL ALL same color. RWL MIXED colors.
4. BS vs R: BS LARGE bodies + sustained. R MEDIUM bodies + V-shaped.
5. WL vs SS: WL LARGE range + long wicks. SS SMALL range + moderate wicks.

---

## APPENDIX V: TRANSITION CANDLE CHARACTERISTICS

| Transition | bodyFraction | wickRatio | totalRange | Signal |
|-----------|-------------|-----------|------------|--------|
| SS → BS | > 0.65 (marubozu) | < 0.2 | > 2.0 (3-5× SS) | Energy releasing |
| BS → R | < 0.35 (exhaustion) | > 0.3 | > 1.5 | Energy spent |
| BS → RWL | 0.2-0.5 | > 0.3 | > 1.5 | Hard Wall rejection |
| R → WL | 0.2-0.5 | > 0.4 | > 1.5 | Liquidity grab at recovery extreme |
| WL → SS | < 0.20 | > 0.2 | < 0.5 | Energy dissipated |
| R → BS | > 0.65 | < 0.2 | > 2.0 | Second surge |
| BS → WL | 0.2-0.5 | > 0.4 | > 1.5 | Target reached, whiplash |
| RWL → SS | < 0.20 | > 0.2 | < 0.5 | Reversal exhausted |

---

## APPENDIX W: COMMON MISTAKES IN SHAPE IDENTIFICATION

1. **"WL is small"** — WRONG. WL total range is 2-4× context average. Explosive.
2. **"WL = exactly 3 candles"** — Partially true. Clearest = 3. But 1-2 exist.
3. **"Wick is 4-7× body"** — WRONG. Wick ≈ 1× body on grab candles.
4. **"WL body fraction 0.10-0.25"** — WRONG. Momentum bf 0.5-0.7. Grab bf 0.3-0.5.
5. **"BS = all large green"** — Partially true. BS has PROGRESSION small→massive.
6. **"RWL = 1-2 candles"** — WRONG. RWL = 6+ candles.
7. **"WL is largest candle"** — WRONG. BS candles usually larger.
8. **"BS has no retracements"** — WRONG. Small (<30%) but present.
9. **"MoM zones are BS/WL targets"** — WRONG. MoM gets PIERCED. Only BoM matters.
10. **"Mitigation doesn't matter"** — WRONG. Determines RWL vs R vs pierce.
11. **"Zones move with candles"** — WRONG. Zones are FIXED to origin candle.
12. **"Mitigation = touching"** — WRONG. Mitigation = price RETURNS to zone value range.

---

## APPENDIX X: THE 15 CRITICAL GAPS (V7.7)

1. Zone type (BoM/MoM) and mitigation features NOT in shape model
2. Zone shape expectation feature NOT computed
3. Zone relationship NOT wired into phase loss verification
4. Mitigation logic NOT wired (unmitigated→RWL vs mitigated→R)
5. MoM piercing logic NOT wired (model predicts reversal at MoM that gets pierced)
6. Shape chain direction doesn't consider zone context
7. WL 2nd surge attempt NOT modeled (WL tests zone: holds→SS or breaks→PBS)
8. Zone formation at WL bottom NOT modeled (new demand zone creation)
9. Mitigation weakening NOT tracked (each test weakens zone)
10. Fortress zone logic NOT modeled (4+ holds → 95% flip)
11. MoM reinforcement entry point NOT modeled
12. Zone type determination (BoM vs MoM) NOT performed
13. Mitigation tracking (per-zone reaction count) NOT maintained
14. Zone-to-candle mapping NOT performed
15. Chain dependency (shape + trend + zone context) NOT fully modeled

---

## APPENDIX Y: RISK MANAGEMENT

### Per Trade
- Default risk: 3-5% of account
- High conviction: up to 10%
- All setups need minimum 3 confluences

### Per Day
- Maximum drawdown: 15% before cutoff
- Close ALL floating profits at EOD

### Per Week
- Weekly PnL is the performance metric
- "One obvious trade a day = average 15× RR for the week on 5 trades"

### The 30-50% Rule
At final check-in, the ONLY decision: Can ALL trades move 30-50% into profit of ORIGINAL ANALYSIS?
- YES → Move SL, let run
- NO → CLOSE ALL. MANDATORY.

---

*This is the complete Plutus Architecture Bible 4.0. Every component documented. Every connection traced. Every constant verified. Every correction incorporated.*

**© 2026 PLUTUS TTE — The Trident Trading Engine**