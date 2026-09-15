# PLUTUS CONTAINER BROWSER — Complete Setup & Persistence Guide

**Date**: 2026-07-21  
**Checkpoint**: `v4.0_CONTAINER_BROWSER_WORKING`  
**Status**: PROVEN — Logged in, popup eliminated, drawing confirmed visible, cookies persist to host

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HOST MACHINE                              │
│                                                             │
│  container_data/browser_profile/  ←── Persistent cookies    │
│       │              (57MB, bind-mounted into container)    │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ DOCKER CONTAINER (--init for zombie reaping)        │    │
│  │                                                     │    │
│  │  /tmp/tv-browser-profile/  ←── bind mount          │    │
│  │       │              (Chrome --user-data-dir)        │    │
│  │       ▼                                              │    │
│  │  ┌──────────────┐    ┌──────────────────┐          │    │
│  │  │   dbus        │───▶│  Weston 9.0      │          │    │
│  │  │  (session)    │    │  headless backend │          │    │
│  │  └──────────────┘    └────────┬─────────┘          │    │
│  │                               │                      │    │
│  │                    ┌──────────▼──────────┐          │    │
│  │                    │  XWayland :0         │          │    │
│  │                    │  (X11 compat layer)  │          │    │
│  │                    └──────────┬──────────┘          │    │
│  │                               │                      │    │
│  │                    ┌──────────▼──────────┐          │    │
│  │                    │  Chromium 120        │          │    │
│  │                    │  CDP port 9333       │          │    │
│  │                    │  --keep-alive        │          │    │
│  │                    │  TradingView (LOGGED │          │    │
│  │                    │  IN, NO POPUP)       │          │    │
│  │                    └─────────────────────┘          │    │
│  │                                                     │    │
│  │  TV Browser MCP (36 tools) auto-attaches to 9333   │    │
│  │  Plutus plugin (1.36 MB) registers 6 tools          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Browser Login Credentials

| Field | Value |
|-------|-------|
| Email | smcliquiditysniper@proton.me |
| Password | AgentTrading369! |
| Platform | TradingView |
| Account | Dedicated Plutus trading account |
| Remember Me | ✅ Checked (browser auto-persists session) |

---

## Exact Login Process (Step by Step)

### Step 1: Navigate to Login Page
```
URL: https://www.tradingview.com/accounts/signin/
Wait: 5 seconds for page load
```

### Step 2: Click "Email" Button
```
Position: (480, 580) on the 952×887 viewport
Wait: 3 seconds for form to render
```

### Step 3: Fill Email/Username Field
```
DOM query: input#id_username
Position: (473, 386) — DOM-verified
Action: click → focus → Input.insertText("smcliquiditysniper@proton.me")
```

### Step 4: Fill Password Field
```
DOM query: input[type="password"]
Position: (451, 499) — DOM-verified
Action: click → focus → Input.insertText("AgentTrading369!")
```

### Step 5: Click Sign In
```
Button text: "Sign in"
Position: (473, 634) — DOM-verified
Wait: 8 seconds for redirect
```

### Step 6: Verify Login
```
Navigate to: https://www.tradingview.com/chart/?symbol=TVC:DXY
Check: document.body.textContent does NOT contain "Look first" or "Join for free"
Expected: "LOGGED_IN - no popup"
```

### Step 7: Verify Drawing Works
```
1. Open geometric-shapes flyout at (47, 257)
2. Find Rectangle tool via aria-label search
3. Click at 25%-from-left offset
4. Click two chart coordinates
5. Screenshot → verify rectangle visible
```

**Total time**: ~30 seconds from navigation to verified drawing

---

## Session Persistence Setup

### Host Directory
```
container_data/browser_profile/     (57MB, bind-mounted)
├── Default/
│   ├── Cookies                    ← TradingView session (SQLite)
│   ├── Local State                ← Browser state
│   ├── Preferences                ← Chrome settings
│   └── Session Storage/           ← Tab state
```

### Container Mount Command
```bash
docker run -d \
  --name trident-plutus-agent \
  --network host \
  --init \
  -v "$(pwd)/container_data/browser_profile:/tmp/tv-browser-profile" \
  plutus-container-testing:master \
  bash -c "/root/start-plutus.sh && sleep infinity"
```

### Crash Recovery Protocol

1. Container crashes → host directory (`container_data/browser_profile/`) is untouched
2. Start new container with same `-v` mount
3. Chrome reads existing profile → cookies intact → TradingView session restored
4. No re-login needed

### If Login Expires

1. Popup reappears (TradingView session cookies expired)
2. Run login script (Steps 1-6 above)
3. New cookies written to host directory via bind mount
4. Login persists across all future restarts

### Profile Backup After Login
```bash
# Manual backup from running container
docker cp trident-plutus-agent:/tmp/tv-browser-profile/. container_data/browser_profile/
```

### Profile Restore Before Restart
```bash
# Automatic via bind mount — host directory → container
# No manual action needed when using -v flag
```

---

## Dockerfile Additions for Persistence

```dockerfile
# In the Dockerfile, the bind mount is set at RUNTIME, not build time.
# The image itself just has the start script with --user-data-dir=/tmp/tv-browser-profile

# start-plutus.sh already uses:
--user-data-dir=/tmp/tv-browser-profile

# The -v flag on docker run maps the host directory to this path:
# docker run -v /host/path:/tmp/tv-browser-profile ...
```

### Updated start-plutus.sh (full)

```bash
#!/bin/bash
set -e

# Kill old processes
pkill -9 -f chromium 2>/dev/null || true
pkill -9 -f weston 2>/dev/null || true
pkill -9 -f Xwayland 2>/dev/null || true
sleep 2

# Environment
export XDG_RUNTIME_DIR=/tmp
export HOME=/root
export PATH=/usr/bin:/usr/local/bin:/usr/sbin:/sbin:/bin:$PATH

# dbus
eval $(/usr/bin/dbus-launch --sh-syntax) 2>/dev/null || true

# Weston headless compositor
/usr/bin/weston --backend=headless-backend.so --width=1920 --height=1080 \
    --modules=xwayland.so --log=/tmp/weston.log &
sleep 5

# Verify display
if [ -S /tmp/.X11-unix/X0 ]; then
    export DISPLAY=:0
else
    echo "FATAL: XWayland display not found"
    exit 1
fi

# Chrome with persistent profile
/usr/lib/chromium/chromium \
    --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --ozone-platform=x11 \
    --remote-debugging-port=9333 \
    --remote-debugging-address=0.0.0.0 \
    --remote-allow-origins=* \
    --user-data-dir=/tmp/tv-browser-profile \
    --no-first-run --no-default-browser-check \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --keep-alive-for-test \
    --disable-component-extensions-with-background-pages \
    "https://www.tradingview.com/chart/?symbol=TVC:DXY" &

sleep 8
curl -s http://127.0.0.1:9333/json/version > /dev/null 2>&1 && echo "Chrome ready on 9333"
```

---

## Container Image State

| Component | Version | Location |
|-----------|---------|----------|
| Chrome | 120.0.6099.224 | `/usr/lib/chromium/chromium` |
| Weston | 9.0 | `/usr/bin/weston` |
| XWayland | (weston module) | `/usr/lib/x86_64-linux-gnu/libweston-9/xwayland.so` |
| TV Browser MCP | v3.0 (36 tools) | `/root/.config/opencode/mcp/tv-browser/` |
| MCP CDP Port | **9333** | (host desktop = 9333, never touched) |
| MCP Display | **:0** | (Weston XWayland) |
| Plutus Plugin | 1.36 MB | `/root/.config/opencode/plugins/plutus-engine/` |
| Plutus Agent | plutus | opencode --agent plutus |
| Node.js | 20.x | System |
| Python | 3.9 | tvDatafeed, Pillow, pytesseract, websockets |

---

## Evidence Files

```
container_data/screenshots/
├── login_state.jpeg            ← Login page (before clicking Email)
├── after_email_click.jpeg      ← Email form appeared
├── after_signin.jpeg           ← Logged in (no popup)
├── logged_in.jpeg              ← Chart accessible (DXY 1D, no popup)
├── tv_test_draw.jpeg           ← Rectangle drawn on chart (purple, handles visible)
├── current_chart.jpeg          ← Chart state reference
├── mcp_dxy_screenshot.png      ← MCP screenshot capture proof
└── rect_final.jpeg             ← Drawing proof (rectangle with handles)

container_data/browser_profile/
└── Default/                    ← Chrome persistent profile (57MB, cookies + session)
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Sign-up popup appears | Session expired or profile lost | Re-run login script or restore from `container_data/browser_profile/` |
| Drawing fails | Popup blocking toolbar | Sign in first, or call `tv_reset` to dismiss |
| Chrome dies | Missing keep-alive flags | Verify `--keep-alive-for-test` in start script |
| MCP tools blocked | `tv-browser_` not in allowlist | Add to `ALLOWED_PREFIXES` in tool-allowlist.ts |
| DISPLAY errors | Weston not running | Check `pgrep weston`, restart Weston + XWayland |
| Zombies accumulate | No `--init` flag | Start container with `docker run --init` |
