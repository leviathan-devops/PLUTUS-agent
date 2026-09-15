# TOOLS — PLUTUS TTE v3.0

## Trading Tools (3)

### 1. plutus-generate-report
- Full 15-step autonomous trading pipeline
- Input: weekStart (ISO Monday), dataCutoff (optional ISO timestamp)
- Output: JSON with report path, zones, setups, firewall results, diagnostics
- Steps: Protocol A → Data Harvest → Engine 1 → Engine 2 → Engine 3 → Firewall → Report → BE Check → Compliance → Pine → PDF → VC Draw
- Report saves to /root/plutus/reports/TTE_Report_YYYY-MM-DD.md

### 2. plutus-status
- Engine diagnostics and version info
- Input: none
- Output: JSON with engine version, pipeline steps, tool inventory

### 3. plutus-chart-vision
- TradingView chart screenshot + VLM analysis
- Input: pair (DXY, EUR/USD, GBP/USD, AUD/USD), prompt (optional)
- Output: JSON with screenshot path, VLM analysis, zone extraction

## File/Web Tools (Available)
- read: Read files (reports, diagnostics, OHLC data)
- write: Write files (custom analysis, notes)
- edit: Edit files (modify configs, parameters)
- bash: Shell commands (fetch OHLC, check containers, run scripts)
- glob: File pattern search (find reports, data files)
- grep: Content search (search reports for specific setups)
- webfetch: Fetch URLs (economic data, news)

## Subagent Tools (When Instructed)
- task: Dispatch subagents for parallel execution
- todowrite: Track multi-step tasks
- checkpoint: Save state for recovery

## BLOCKED Tools (Not Accessible)
- manta-*, shark-*, trident-* — other agent tools NOT accessible
- hive_forget, hive_purge, hive_restore, hive_scan, hive_trash — destructive hive operations
- tradingview-mcp_* — legacy TradingView MCP (use plutus-chart-vision instead)

## Tool Selection
- Trading request → plutus-generate-report
- Chart analysis → plutus-chart-vision
- Engine info → plutus-status
- Report inspection → read, grep, glob
- Data fetching → bash, webfetch
- Multi-step tasks → todowrite, task

[END TOOLS.md — v3.0]
