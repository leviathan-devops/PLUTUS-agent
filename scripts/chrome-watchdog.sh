#!/bin/bash
# PLUTUS CHROME WATCHDOG — Trading-Critical Self-Healing
# Monitors Chrome CDP on port 6930. If Chrome dies, restarts it.
# Runs as a background process inside the container.
# 
# Usage: nohup bash /root/scripts/chrome-watchdog.sh &

CDP_PORT=6930
CHECK_INTERVAL=10  # seconds between health checks
RENDERER_TIMEOUT=5  # seconds to wait for a CDP WebSocket response
MAX_RESTARTS=5
RESTART_COUNT=0
LOG=/tmp/chrome-watchdog.log

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [WATCHDOG] $1" >> "$LOG"
}

get_display() {
  # Auto-detect XWayland display from weston.log
  local disp=$(grep -oP 'xserver listening on display :\K\d+' /tmp/weston.log 2>/dev/null | tail -1)
  echo "${disp:-0}"
}

start_chrome() {
  local DISPLAY_NUM=$(get_display)
  export DISPLAY=:$DISPLAY_NUM
  export XDG_RUNTIME_DIR=/tmp
  
  log "Starting Chrome on DISPLAY=:$DISPLAY_NUM, CDP port $CDP_PORT"
  
  /usr/lib/chromium/chromium \
    --no-sandbox --disable-gpu --disable-dev-shm-usage \
    --ozone-platform=x11 \
    --remote-debugging-port=$CDP_PORT \
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
  
  local CHROME_PID=$!
  log "Chrome started with PID $CHROME_PID"
  
  # Wait for CDP to be ready
  for i in $(seq 1 15); do
    if curl -s http://127.0.0.1:$CDP_PORT/json/version > /dev/null 2>&1; then
      log "Chrome CDP ready on port $CDP_PORT (attempt $i)"
      return 0
    fi
    sleep 2
  done
  
  log "ERROR: Chrome CDP not ready after 30s"
  return 1
}

check_chrome() {
  # Browser-process health: does Chrome's HTTP server respond?
  curl -s http://127.0.0.1:$CDP_PORT/json/version > /dev/null 2>&1
}

check_renderer() {
  # Renderer-process health: sends an actual CDP command (Runtime.evaluate)
  # over WebSocket and waits for a response within RENDERER_TIMEOUT seconds.
  # The browser process can stay alive while the renderer is dead ("zombie Chrome"),
  # so this catches cases that the HTTP check above cannot.
  node -e "
const { WebSocket } = require('/root/.config/opencode/mcp/tv-browser/node_modules/ws');
const http = require('http');
http.get('http://127.0.0.1:${CDP_PORT}/json/list', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const tabs = JSON.parse(body);
      const page = tabs.find(t => t.type === 'page');
      if (!page) { console.log('DEAD'); process.exit(0); }
      const ws = new WebSocket(page.webSocketDebuggerUrl.replace('localhost','127.0.0.1'));
      ws.on('open', () => {
        ws.send(JSON.stringify({id:1, method:'Runtime.evaluate', params:{expression:'1+1'}}));
      });
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1) { console.log('ALIVE'); ws.close(); process.exit(0); }
      });
      ws.on('error', () => { console.log('DEAD'); process.exit(0); });
      setTimeout(() => { console.log('DEAD'); process.exit(0); }, ${RENDERER_TIMEOUT}000);
    } catch { console.log('DEAD'); process.exit(0); }
  });
}).on('error', () => { console.log('DEAD'); process.exit(0); });
" 2>/dev/null
}

# ── Main Loop ──
log "Watchdog started. Monitoring Chrome CDP on port $CDP_PORT every ${CHECK_INTERVAL}s"

# Initial start if Chrome not running
if ! check_chrome; then
  log "Chrome not running on startup. Starting..."
  start_chrome
fi

while true; do
  sleep $CHECK_INTERVAL
  
  if ! check_chrome; then
    RESTART_COUNT=$((RESTART_COUNT + 1))
    log "ALERT: Chrome CDP not responding on port $CDP_PORT (restart $RESTART_COUNT/$MAX_RESTARTS)"
    
    if [ $RESTART_COUNT -gt $MAX_RESTARTS ]; then
      log "FATAL: Max restarts ($MAX_RESTARTS) exceeded. Giving up. Manual intervention required."
      # Don't exit — keep checking in case someone fixes it manually
      RESTART_COUNT=0
      sleep 60
      continue
    fi
    
    # Kill zombie Chrome processes
    pkill -9 -f "chromium.*remote-debugging-port=$CDP_PORT" 2>/dev/null
    sleep 2
    
    # Restart Chrome
    start_chrome
    
    if check_chrome; then
      log "RECOVERED: Chrome CDP back online on port $CDP_PORT"
      RESTART_COUNT=0  # Reset counter on successful recovery
    fi
  else
    # HTTP check passed — now verify the RENDERER process is actually alive.
    # A dead renderer ("zombie Chrome") will pass the HTTP check but silently
    # drop all CDP WebSocket commands. This catches that failure mode.
    RENDERER_OK=$(check_renderer)
    if [ "$RENDERER_OK" != "ALIVE" ]; then
      RESTART_COUNT=$((RESTART_COUNT + 1))
      log "ALERT: Renderer DEAD (zombie Chrome) — CDP WebSocket unresponsive (restart $RESTART_COUNT/$MAX_RESTARTS)"
      
      if [ $RESTART_COUNT -gt $MAX_RESTARTS ]; then
        log "FATAL: Max restarts ($MAX_RESTARTS) exceeded. Giving up. Manual intervention required."
        RESTART_COUNT=0
        sleep 60
        continue
      fi
      
      # Kill zombie Chrome processes
      pkill -9 -f "chromium.*remote-debugging-port=$CDP_PORT" 2>/dev/null
      sleep 2
      
      # Restart Chrome
      start_chrome
      
      if check_chrome; then
        log "RECOVERED: Chrome CDP back online on port $CDP_PORT"
        RESTART_COUNT=0  # Reset counter on successful recovery
      fi
    else
      log "OK: Chrome healthy (browser + renderer responsive)"
    fi
  fi
done
