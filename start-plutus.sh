#!/bin/bash
set -e
echo "Starting Plutus Virtual Browser Environment..."

# Kill old processes
pkill -9 -f chromium 2>/dev/null || true
pkill -9 -f Xvfb 2>/dev/null || true
pkill -9 -f weston 2>/dev/null || true
pkill -9 -f Xwayland 2>/dev/null || true
sleep 2

# Environment
export XDG_RUNTIME_DIR=/tmp
export HOME=/root
export PATH=/usr/bin:/usr/local/bin:/usr/sbin:/sbin:/bin:$PATH
mkdir -p /tmp

# Start dbus
eval $(/usr/bin/dbus-launch --sh-syntax) 2>/dev/null || true

# Start Weston headless compositor with XWayland
/usr/bin/weston --backend=headless-backend.so --width=1920 --height=1080 --modules=xwayland.so --log=/tmp/weston.log &
sleep 5

# Verify display
if [ -S /tmp/.X11-unix/X0 ]; then
    export DISPLAY=:0
    echo "XWayland display :0 ready"
else
    echo "FATAL: XWayland display not found"
    exit 1
fi

# Start Chrome with keep-alive + anti-throttling flags (24+ hour uptime)
/usr/lib/chromium/chromium \
    --no-sandbox \
    --disable-gpu \
    --disable-dev-shm-usage \
    --ozone-platform=x11 \
    --remote-debugging-port=6930 \
    --remote-debugging-address=0.0.0.0 \
    --remote-allow-origins=* \
    --user-data-dir=/tmp/tv-browser-profile \
    --no-first-run \
    --no-default-browser-check \
    --disable-features=Translate \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-backgrounding-occluded-windows \
    --keep-alive-for-test \
    --disable-component-extensions-with-background-pages \
    "https://www.tradingview.com/chart/?symbol=TVC:DXY" &

sleep 8

# Verify Chrome
if curl -s http://127.0.0.1:6930/json/version > /dev/null 2>&1; then
    echo "Chrome running on CDP port 6930"
else
    echo "WARNING: Chrome failed to start"
fi

echo ""
echo "=== Virtual Browser Environment Ready ==="
echo "Display: $DISPLAY"
echo "CDP: http://127.0.0.1:6930"
echo "Weston: $(pgrep -x weston > /dev/null && echo running || echo FAILED)"
echo "Chrome: $(curl -s http://127.0.0.1:6930/json/version 2>/dev/null | grep Browser || echo FAILED)"
echo "MCP: registered as tv-browser in opencode config"

# Start Chrome watchdog (trading-critical self-healing)
nohup bash /root/scripts/chrome-watchdog.sh &
echo "Chrome watchdog started (PID: $!)"
echo "========================================="

# Hand off to CMD (e.g. "sleep infinity") so container stays alive
exec "$@"
