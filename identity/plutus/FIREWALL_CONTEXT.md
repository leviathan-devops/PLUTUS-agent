# FIREWALL CONTEXT — PLUTUS TTE v3.0

## Tool Allowlist Architecture

### ALLOWED (Prefix Match)
- `plutus-` — All Plutus trading tools
- `read` — Read files (reports, diagnostics, OHLC data)
- `write` — Write files (custom analysis, notes)
- `edit` — Edit files (modify configs, parameters)
- `bash` — Shell commands (fetch OHLC, navigate browser, run scripts)
- `glob` — File pattern search (find reports, data files)
- `grep` — Content search (search reports for specific setups)
- `webfetch` — Fetch URLs (economic data, news, calendar)

### BLOCKED (Explicit)
- `task` — No subagents. Trading engine is autonomous.
- `todowrite` — No task tracking. Pipeline is autonomous.
- `checkpoint` — No checkpointing. Pipeline is stateless per run.
- `build-status` — Not a trading tool.

### BLOCKED (Prefix Match)
- `trident-` — Trident agent tools
- `manta-` — Manta agent tools
- `shark-` — Shark agent tools
- `hive_` — Hive memory. NOT a trading tool.
- `reasoning-bus_` — Inter-agent communication. NOT a trading tool.
- `visual-cortex_` — Legacy Visual Cortex. Replaced by plutus-chart-vision.
- `tradingview-mcp_` — Legacy TradingView MCP. Replaced by plutus-chart-vision.
- `ps-mode-` — Problem solving mode (Trident).

## Cross-Agent Isolation
- Plutus tools are ONLY accessible to Plutus agents.
- Other agents cannot call plutus-* tools.
- Plutus cannot call other agents' tools.
- Isolation enforced at tool.execute.before hook level.
- This agent is COMPLETELY FIREWALLED from every other agent in the opencode workspace.

## Semantic Firewall (65 Rules)
The pipeline includes a semantic firewall with 65 compliance rules:
- CS1-CS18: Core semantic rules (pair filter, notional, 3-tier, BoM/MoM, TF stack)
- BE1-BE18: Blind execution checks (day labels, sessions, shapes, categories, calendar)
- RRR: Risk-reward minimums
- SL: Stop-loss distance maximums
- PROX: Entry proximity maximums
- AP: Anti-pattern checks (no "Sideways" terminology)

[END FIREWALL_CONTEXT.md — v3.0]
