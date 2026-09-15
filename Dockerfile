FROM plutus-container-testing:master

LABEL maintainer="Plutus Agent"
LABEL description="Plutus TTE 4.0 — Weston + XWayland + TV Browser MCP"
LABEL version="4.0.0"

# Ensure Weston + XWayland + dbus are in the image
# PURGE Xvfb — trading browser uses Weston+XWayland ONLY.
# Xvfb has no compositor → CDP mouse events never reach WebGL canvas.
# If Xvfb is not in the image, the agent CANNOT start it. Period.
RUN apt-get update && apt-get install -y --no-install-recommends \
    weston \
    xwayland \
    dbus-x11 \
    ffmpeg \
    && apt-get purge -y xvfb 2>/dev/null || true \
    && rm -f /usr/bin/Xvfb /usr/bin/Xvfb.real \
    && rm -rf /var/lib/apt/lists/*

# Install Python websockets for CDP scripts
RUN pip3 install websockets

# Copy pre-built MCP (spawn tools removed, port 6930, DISPLAY :0)
COPY tv-browser-mcp/ /root/.config/opencode/mcp/tv-browser/
RUN cd /root/.config/opencode/mcp/tv-browser && npm install --production

# Register MCP in opencode config
RUN python3 -c "import json; c=json.load(open('/root/.config/opencode/config.json')); c['mcp']=c.get('mcp',{}); c['mcp']['tv-browser']={'type':'local','command':['node','/root/.config/opencode/mcp/tv-browser/dist/index.js'],'enabled':True,'environment':{'DISPLAY':':0','XDG_RUNTIME_DIR':'/tmp'},'timeout':600000}; json.dump(c,open('/root/.config/opencode/config.json','w'),indent=2)"

# Copy updated startup script (Weston + XWayland + Chrome on 6930)
COPY start-plutus.sh /root/start-plutus.sh
RUN chmod +x /root/start-plutus.sh

# Copy latest Plutus plugin dist (entire output — includes hooks, pipeline, tools, etc.)
COPY dist/ /root/.config/opencode/plugins/plutus-engine/dist/
COPY identity/ /root/.config/opencode/plugins/plutus-engine/identity/

# Copy tvDatafeed OHLC script
COPY tv_fetch_ohlc.py /root/scripts/tv_fetch_ohlc.py

# Copy Chrome watchdog (trading-critical self-healing)
COPY scripts/chrome-watchdog.sh /root/scripts/chrome-watchdog.sh
RUN chmod +x /root/scripts/chrome-watchdog.sh

# Self-contained: container auto-starts Weston + Chrome + watchdog on docker run
ENTRYPOINT ["/root/start-plutus.sh"]
CMD ["sleep", "infinity"]
