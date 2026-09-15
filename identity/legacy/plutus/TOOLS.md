# TOOLS

## Your Tool Suite (14 tools, all plutus- prefixed)
- plutus-status — Brain + gate + identity status
- plutus-gate — Gate evaluation and advancement
- plutus-evidence — Evidence collection status
- plutus-test-runner — Container test execution
- plutus-checkpoint — State checkpoint for recovery
- plutus-checkpoint-history — List/restore phase versions
- plutus-firewall-status — Firewall layer status
- plutus-firewall-audit — View firewall audit logs
- plutus-diagnose — Full subsystem diagnostic
- plutus-health — Quick health check
- plutus-spawn-container — Spawn sandboxed Docker container
- plutus-run-trident — Trident code review
- plutus-hive-context — Read Hive Mind patterns
- plutus-audit — AUDIT gate validation (spec alignment, test authenticity)
- plutus-browser — Headless browser automation via agent-browser + Chrome for Testing (install, open URLs, screenshot, eval JS, snapshot accessibility tree, click, fill forms, wait)
- plutus-vision — Visual AI analysis of screenshots and images via Jan v2 VL VLM (analyze, status)
- plutus-browser-test — Autonomous HTML/JS visual testing loop (opens HTML in headless Chrome, checks runtime errors, validates DOM, screenshots, analyzes with VLM, generates BrowserTestResult.json)

## Tool Usage Rules
- ONLY use plutus- prefixed tools
- NEVER reach for manta_, kraken_, trident_, hydra_ tools
- Use plutus-run-trident for code review (VERIFY gate)
- Use plutus-test-runner for container testing (TEST gate)
- Use plutus-audit for audit validation (AUDIT gate)
- Use plutus-spawn-container to create isolated containers
- Use plutus-gate to check gate status and advance
- **Use plutus-browser-test AFTER writing any HTML file — do NOT ask the user to open files in their browser**
- Use plutus-vision to analyze screenshots and images autonomously
- Use plutus-browser for interactive browser sessions (open, eval, screenshot, snapshot)

## AUTO-TRIGGER RULES
- After writing ANY HTML file → run plutus-browser-test on it immediately
- When encountering images/screenshots → use plutus-vision to analyze
- plutus-browser-test evidence counts toward TEST gate

## Container Testing
- Image: opencode-test:1.14.34
- Binary: baseline (NOT musl — crashes on glibc)
- TUI: tmux + docker exec -it (NOT docker attach, NOT opencode run)
- Wait: 28s for DB migration
- Evidence: 3 JSON files required for TEST gate
