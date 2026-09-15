# Container Browser — Login Process & Session Persistence

**Date**: 2026-07-21  
**Container**: trident-plutus-agent  
**Image**: plutus-container-testing:master (4.0.0)  
**Status**: PROVEN WORKING — Logged in, popup eliminated, drawing confirmed visible

---

## 1. The Problem (Before Login)

When the container starts with a fresh Chrome profile (`--user-data-dir=/tmp/tv-browser-profile`), TradingView shows a **sign-up popup overlay** ("Look first / Then leap. Join for free.") that:

- Blocks the center of the chart
- Intercepts clicks on the toolbar
- Prevents ALL drawing tools from working
- The MCP's `openFlyout()` clicks land on the popup overlay, not the toolbar

**Proof of the popup blocking everything:**
- MCP `tv_draw_rectangle` calls `openFlyout` → clicks at toolbar position → popup steals the click → flyout never opens
- `selectTool("Rectangle")` searches aria-labels in a non-existent flyout → "Tool not found"
- Direct CDP test confirmed: flyout contents showed "Look first / Then leap." popup text instead of tool buttons

**The fix: Sign in to TradingView.** Logged-in accounts don't see the sign-up popup.

---

## 2. The Login Process (Step by Step)

### Step 1: Navigate to TradingView Login Page

```python
await cdp("Page.navigate", {"url": "https://www.tradingview.com/accounts/signin/"})
await asyncio.sleep(5)  # Wait for page load
```

The login page shows a "Sign in" screen with three options:
- "Continue with Google" button
- "Show more options" link
- "Email" button (what we need)

### Step 2: Click "Email" Button

The "Email" button is positioned approximately at **(480, 580)** on a 952×887 viewport.

```python
await click(480, 580)  # Click Email button
await asyncio.sleep(3)  # Wait for form to render
```

After clicking, TradingView shows the email/password form:
- Header: "Sign in with email"
- "Email or Username" input field
- "Password" input field
- "Remember me" checkbox (ALREADY CHECKED — critical for persistence!)
- "Sign in" button

### Step 3: Fill in Credentials

First, find the exact field positions via DOM query:
```python
r = await cdp("Runtime.evaluate", {
    "expression": """(() => {
        var inputs = document.querySelectorAll('input');
        var out = [];
        for (var inp of inputs) {
            var rect = inp.getBoundingClientRect();
            out.push({name: inp.name, type: inp.type, 
                       x: Math.round(rect.left+rect.width/2), 
                       y: Math.round(rect.top+rect.height/2)});
        }
        return JSON.stringify(out);
    })()""",
    "returnByValue": True
})
inputs = json.loads(r["result"]["result"]["value"])
# Fields found: id_username at (473, 386), id_password at (451, 499)
```

Click email field → type email → click password field → type password:
```python
# Email field at (473, 386) — click center of input
await click(473, 386)
await asyncio.sleep(0.5)
await cdp("Input.insertText", {"text": "smcliquiditysniper@proton.me"})
await asyncio.sleep(0.5)

# Password field at (451, 499)
await click(451, 499)
await asyncio.sleep(0.5)
await cdp("Input.insertText", {"text": "AgentTrading369!"})
await asyncio.sleep(0.5)
```

### Step 4: Click "Sign in"

```python
# Find Sign in button
r = await cdp("Runtime.evaluate", {
    "expression": """(() => {
        var btns = document.querySelectorAll('button');
        for (var b of btns) {
            var text = (b.textContent || '').trim();
            if (text === 'Sign in') {
                var rect = b.getBoundingClientRect();
                return JSON.stringify({x: Math.round(rect.left+rect.width/2), y: Math.round(rect.top+rect.height/2)});
            }
        }
        return 'NOT_FOUND';
    })()""",
    "returnByValue": True
})
signin_btn = json.loads(r["result"]["result"]["value"])
await click(signin_btn["x"], signin_btn["y"])
await asyncio.sleep(8)  # Wait for redirect
```

### Step 5: Navigate to Chart + Verify

```python
await cdp("Page.navigate", {"url": "https://www.tradingview.com/chart/?symbol=TVC:DXY"})
await asyncio.sleep(8)

# Check popup is gone
r = await cdp("Runtime.evaluate", {
    "expression": """(() => {
        var body = document.body.textContent || '';
        if (body.includes('Look first') || body.includes('Join for free')) return 'POPUP_STILL_VISIBLE';
        return 'LOGGED_IN - no popup';
    })()""",
    "returnByValue": True
})
```

**Expected result:** `LOGGED_IN - no popup`

### Step 6: Verify Drawing Works

```python
# Open flyout → select Rectangle → draw
await cdp("Input.dispatchMouseEvent", {"type":"mouseMoved","x":47,"y":257,"button":"none"})
await asyncio.sleep(0.5)
await click(47, 257)
await asyncio.sleep(1.0)

# Find Rectangle tool
r = await cdp("Runtime.evaluate", {
    "expression": """(() => {
        var b = document.querySelectorAll('[aria-label]');
        for (var el of b) {
            var l = (el.getAttribute('aria-label') || '').toLowerCase();
            if (l.includes('rectangle')) {
                var rect = el.getBoundingClientRect();
                return JSON.stringify({x: Math.round(rect.left+rect.width*0.25), y: Math.round(rect.top+rect.height/2)});
            }
        }
        return 'NOT_FOUND';
    })()""",
    "returnByValue": True
})
```

**Expected:** Rectangle tool found at (124, 553), rectangle drawn visible on chart.

---

## 3. Session Persistence Architecture

### The Problem
Chrome's `--user-data-dir` stores session state (cookies, localStorage, login sessions) in a directory. In our current setup, this is `/tmp/tv-browser-profile` inside the container. When the container restarts, `/tmp/` is wiped, and the login is lost.

### The Fix: Host-Mounted Profile Directory

Mount the browser profile from the HOST filesystem into the container:

```
Host: container_data/browser_profile/  (57MB, persistent)
    ↓ docker bind mount
Container: /tmp/tv-browser-profile/     (Chrome --user-data-dir)
```

This means:
1. Chrome writes cookies/session data to `/tmp/tv-browser-profile`
2. This directory is a bind mount from the host
3. When the container restarts, the host directory still has the cookies
4. Chrome reconnects to the SAME session — already logged in

### Files That Must Persist

```
/tmp/tv-browser-profile/
├── Default/
│   ├── Cookies              ← TradingView session cookies (20KB)
│   ├── Local State          ← Browser state
│   ├── Preferences          ← Chrome settings
│   ├── Secure Preferences   ← Chrome secure settings
│   ├── Login Data            ← Saved passwords
│   ├── Web Data              ← Autofill data
│   ├── History               ← Browsing history
│   └── Session Storage/      ← Tab state
├── Default_*/               ← Additional profiles
└── [other Chrome internals]
```

### The Critical File: `Default/Cookies`
This SQLite database contains all TradingView session cookies. When the user logged in, TradingView set session cookies here. If this file persists across container restarts, the login persists.

---

## 4. Startup Script with Persistent Profile

```bash
#!/bin/bash
# /root/start-plutus.sh — Updated for persistent browser profile

set -e
echo "Starting Plutus Virtual Browser Environment..."

# Kill old processes
pkill -9 -f chromium 2>/dev/null || true
pkill -9 -f weston 2>/dev/null || true
pkill -9 -f Xwayland 2>/dev/null || true
sleep 2

# Environment
export XDG_RUNTIME_DIR=/tmp
export HOME=/root
export PATH=/usr/bin:/usr/local/bin:/usr/sbin:/sbin:/bin:$PATH

# Start dbus
eval $(/usr/bin/dbus-launch --sh-syntax) 2>/dev/null || true

# Start Weston headless compositor with XWayland
/usr/bin/weston --backend=headless-backend.so --width=1920 --height=1080 \
    --modules=xwayland.so --log=/tmp/weston.log &
sleep 5

# Verify display
if [ -S /tmp/.X11-unix/X0 ]; then
    export DISPLAY=:0
    echo "XWayland display :0 ready"
else
    echo "FATAL: XWayland display not found"
    exit 1
fi

# Start Chrome with persistent profile directory
# The --user-data-dir points to where cookies/sessions are stored
# If mounted from host, cookies persist across container restarts
/usr/lib/chromium/chromium \
    --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --ozone-platform=x11 \
    --remote-debugging-port=9333 \
    --remote-debugging-address=0.0.0.0 \
    --remote-allow-origins=* \
    --user-data-dir=/tmp/tv-browser-profile \
    --no-first-run --no-default-browser-check \
    --disable-features=Translate \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --keep-alive-for-test \
    --disable-component-extensions-with-background-pages \
    "https://www.tradingview.com/chart/?symbol=TVC:DXY" &

sleep 8

if curl -s http://127.0.0.1:9333/json/version > /dev/null 2>&1; then
    echo "Chrome running on CDP port 9333"
fi
```

### Container Launch with Persistent Profile

```bash
docker run -d \
  --name trident-plutus-agent \
  --network host \
  --init \
  -v /path/to/host/container_data/browser_profile:/tmp/tv-browser-profile \
  plutus-container-testing:master \
  bash -c "/root/start-plutus.sh && sleep infinity"
```

The `-v` flag bind-mounts the host directory into the container. Chrome writes cookies there, host sees them, container restarts preserve them.

---

## 5. Backup & Restore

### After Login (Manual Backup)
```bash
# Copy profile from running container to host
docker cp trident-plutus-agent:/tmp/tv-browser-profile/. /path/to/host/container_data/browser_profile/
```

### Before Container Restart (Auto-Restore)
```bash
# The -v mount handles this automatically
# Host directory → Container /tmp/tv-browser-profile
# Chrome reads the existing profile → session restored → still logged in
```

### Crash Recovery
If the container crashes:
1. The host directory (`container_data/browser_profile/`) still has all cookies
2. Start a new container with the same `-v` mount
3. Chrome reads the existing profile → TradingView session restored
4. No re-login needed

### If Login Expires
1. The browser profile still has old cookies (expired)
2. TradingView will show the sign-up popup again
3. Re-run the login script (Steps 1-5 above)
4. New cookies written to the host directory
5. Persistent again

---

## 6. Verification After Login

After login, verify:
1. **No popup** — The sign-up overlay is gone
2. **Chart renders** — DXY 1D chart with candlesticks visible
3. **Drawing works** — flyout opens, Rectangle tool found, rectangle visible on chart
4. **Cookies persist** — `container_data/browser_profile/Default/Cookies` file exists and is >0 bytes
5. **Session survives restart** — Kill container → restart with same `-v` mount → chart loads without popup

---

## 7. The Complete Login Script

The full automated login script (used in this session):

```python
# tv_signin.py — Full automated login to TradingView
# Run inside the container after Weston + Chrome are started

import json, asyncio, websockets, urllib.request, base64

resp = urllib.request.urlopen('http://127.0.0.1:6930/json/list')
tabs = json.loads(resp.read())
ws_url = tabs[0]['webSocketDebuggerUrl'].replace('localhost', '127.0.0.1')

async def signin():
    async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
        mid = [0]
        async def cdp(m, p=None):
            mid[0] += 1
            await ws.send(json.dumps({"id": mid[0], "method": m, "params": p or {}}))
            for _ in range(200):
                r = json.loads(await ws.recv())
                if r.get("id") == mid[0]: return r
            return {}

        async def click(x, y):
            await cdp("Input.dispatchMouseEvent", {"type":"mouseMoved","x":x,"y":y,"button":"none"})
            await asyncio.sleep(0.25)
            await cdp("Input.dispatchMouseEvent", {"type":"mousePressed","x":x,"y":y,"button":"left","clickCount":1})
            await asyncio.sleep(0.1)
            await cdp("Input.dispatchMouseEvent", {"type":"mouseReleased","x":x,"y":y,"button":"left","clickCount":1})

        async def type_text(text):
            await cdp("Input.insertText", {"text": text})

        await cdp("Page.enable")

        # 1. Go to login page
        await cdp("Page.navigate", {"url": "https://www.tradingview.com/accounts/signin/"})
        await asyncio.sleep(5)

        # 2. Click Email button
        await click(480, 580)
        await asyncio.sleep(3)

        # 3. Fill credentials (DOM-queried positions)
        r = await cdp("Runtime.evaluate", {
            "expression": """(() => {
                var inputs = document.querySelectorAll('input');
                var out = [];
                for (var inp of inputs) {
                    var rect = inp.getBoundingClientRect();
                    out.push({name: inp.name, type: inp.type,
                               x: Math.round(rect.left+rect.width/2),
                               y: Math.round(rect.top+rect.height/2)});
                }
                return JSON.stringify(out);
            })()""",
            "returnByValue": True
        })
        inputs = json.loads(r["result"]["result"]["value"])
        email_field = next((i for i in inputs if 'username' in i.get('name','').lower() or 'email' in i.get('name','').lower()), None)
        pwd_field = next((i for i in inputs if i.get('type') == 'password'), None)

        if email_field:
            await click(email_field['x'], email_field['y'])
            await asyncio.sleep(0.5)
            await type_text("smcliquiditysniper@proton.me")
            await asyncio.sleep(0.5)

        if pwd_field:
            await click(pwd_field['x'], pwd_field['y'])
            await asyncio.sleep(0.5)
            await type_text("AgentTrading369!")
            await asyncio.sleep(0.5)

        # 4. Click Sign in
        r2 = await cdp("Runtime.evaluate", {
            "expression": """(() => {
                var btns = document.querySelectorAll('button');
                for (var b of btns) {
                    if ((b.textContent||'').trim() === 'Sign in') {
                        var rect = b.getBoundingClientRect();
                        return JSON.stringify({x: Math.round(rect.left+rect.width/2), y: Math.round(rect.top+rect.height/2)});
                    }
                }
                return 'NOT_FOUND';
            })()""",
            "returnByValue": True
        })
        signin_btn = json.loads(r2["result"]["result"]["value"])
        await click(signin_btn['x'], signin_btn['y'])
        await asyncio.sleep(8)

        # 5. Navigate to chart + verify
        await cdp("Page.navigate", {"url": "https://www.tradingview.com/chart/?symbol=TVC:DXY"})
        await asyncio.sleep(8)

        r3 = await cdp("Runtime.evaluate", {
            "expression": "(() => { var body = document.body.textContent || ''; return body.includes('Look first') || body.includes('Join for free') ? 'STILL_POPUP' : 'LOGGED_IN'; })()",
            "returnByValue": True
        })
        status = r3["result"]["result"]["value"]
        print(f"STATUS: {status}")

asyncio.run(signin())
```

---

## 8. Key Timestamps

| Time | Event |
|------|-------|
| 12:46 UTC | Fresh container started (Weston + XWayland + Chrome on 9333) |
| 12:46 UTC | Login script executed — navigated to tradingview.com/accounts/signin |
| 12:46 UTC | Email button clicked → login form appeared |
| 12:47 UTC | Credentials filled → Sign in clicked |
| 12:47 UTC | Redirected to chart → popup GONE → "LOGGED_IN" confirmed |
| 12:47 UTC | Rectangle drawn via CDP → verified visible in screenshot |
| 12:52 UTC | Cookies file written (20KB) → session persisted |
| 12:53 UTC | Browser profile copied to host (57MB) |
