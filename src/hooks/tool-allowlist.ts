import type { Hooks } from '@opencode-ai/plugin';
import { isPlutusAgent } from '../identity/agent-identity.js';
import { getCurrentAgent } from './agent-state.js';

// ═══════════════════════════════════════════════════════════════════════════════
// PLUTUS TOOL ALLOWLIST — TRADING ONLY. NOTHING ELSE.
//
// This agent is a TRADING ENGINE. It is COMPLETELY FIREWALLED from every
// other agent in the opencode workspace. No hive, no checkpoint, no task,
// no shark, no manta, no trident, no reasoning-bus, no visual-cortex.
// Only what it needs to execute the TTE pipeline and navigate TradingView.
// ═══════════════════════════════════════════════════════════════════════════════

// Tools Plutus is ALLOWED to use — TRADING ONLY
const ALLOWED_PREFIXES = [
  'plutus-',          // Plutus trading tools (pipeline tools, status, omni-vision, backtest)
  'tv_',              // TV Browser MCP tools (direct names)
  'tv-browser_',      // TV Browser MCP tools (opencode server-prefixed names)
  'read',             // Read files (reports, diagnostics, OHLC data)
  'write',            // Write files (custom analysis, notes, trade data)
  'glob',             // File pattern search (find reports, data files)
  'grep',             // Content search (search reports for specific setups)
  'webfetch',         // Fetch URLs (economic data, news, calendar)
];

// Tools explicitly BLOCKED even if they match no prefix
const BLOCKED_TOOLS = [
  'task',             // No subagents — trading engine is autonomous
  'todowrite',        // No task tracking — pipeline is autonomous
  'checkpoint',       // No checkpointing — pipeline is stateless per run
  'build-status',     // Not a trading tool
  'plutus-generate-report',  // OLD v3 monolithic pipeline — REPLACED by plutus-pipeline-* tools
  'plutus-chart-vision',     // OLD v3 chart tool — REPLACED by tv_screenshot + plutus-omni-vision
];

// Prefixes explicitly BLOCKED — EVERYTHING NOT TRADING
const BLOCKED_PREFIXES = [
  'trident-',         // Trident agent tools
  'manta-',           // Manta agent tools
  'shark-',           // Shark agent tools
  'hive_',            // Hive memory — NOT a trading tool
  'reasoning-bus_',  // Inter-agent communication — NOT a trading tool
  'tradingview-mcp_', // Legacy TradingView MCP — replaced by plutus-chart-vision
  'ps-mode-',         // Problem solving mode (Trident)
];

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSER PROCESS FIREWALL — TRADING CRITICAL
// The Plutus agent must NEVER start/manage Chrome, Xvfb, Weston, or any browser
// process via bash. ALL browser interaction goes through MCP tools.
// A rogue browser process can crash the trading pipeline and lose real money.
// ═══════════════════════════════════════════════════════════════════════════════

const BROWSER_PROCESS_PATTERNS = [
  /chromium/i,
  /chrome/i,
  /xvfb/i,
  /weston/i,
  /xwayland/i,
  /xdpyinfo/i,
  /x11vnc/i,
  /vncserver/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /remote-debugging-port/i,
  /--no-sandbox.*chrom/i,
  /DISPLAY=.*chrom/i,
];

function isBrowserProcessCommand(toolName: string, args: any): boolean {
  if (toolName !== 'bash' && toolName !== 'Bash') return false;
  const cmd = typeof args === 'string' ? args : (args?.command || args?.cmd || '');
  if (!cmd || typeof cmd !== 'string') return false;
  return BROWSER_PROCESS_PATTERNS.some(pattern => pattern.test(cmd));
}

function isToolAllowed(toolName: string): boolean {
  // Check explicit blocklist
  if (BLOCKED_TOOLS.includes(toolName)) return false;

  // Check blocked prefixes
  for (const prefix of BLOCKED_PREFIXES) {
    if (toolName.startsWith(prefix)) return false;
  }

  // Check allowed prefixes
  for (const prefix of ALLOWED_PREFIXES) {
    if (toolName.startsWith(prefix)) return true;
  }

  return false;
}

export function createToolBeforeHook(): Hooks['tool.execute.before'] {
  return async (input: Record<string, unknown>, _output: Record<string, unknown>) => {
    // Cross-plugin isolation: check agent identity directly from hook input
    const agentName = (input as any)?.session?.agentName
      ?? (input as any)?.agent
      ?? getCurrentAgent((input as any)?.sessionID);
    if (!isPlutusAgent(agentName)) return;

    const toolName = ((input as any)?.tool as string) || ((input as any)?.name as string) || '';
    if (!toolName) return;

    // ═══════════════════════════════════════════════════════════════════════════
    // BROWSER PROCESS FIREWALL — Check BEFORE allowlist (trading-critical)
    // ═══════════════════════════════════════════════════════════════════════════
    if (isBrowserProcessCommand(toolName, (input as any)?.args)) {
      throw new Error(
        `[PLUTUS BROWSER FIREWALL] BLOCKED: "${toolName}" with browser process command. ` +
        `The Plutus agent must NEVER start Chrome, Xvfb, Weston, or any browser process via bash. ` +
        `Use MCP tools: tv_browser_container (connect), tv_navigate (go to URL), tv_screenshot (capture), ` +
        `tv_set_timeframe, tv_draw_rectangle, tv_draw_long_position, tv_draw_short_position. ` +
        `If the browser is not responding, call tv_browser_container to reconnect. ` +
        `NEVER attempt to start or manage browser processes directly. This is a TRADING ENGINE — ` +
        `unauthorized browser processes can crash the pipeline and lose real money.`
      );
    }

    if (!isToolAllowed(toolName)) {
      throw new Error(
        `[PLUTUS FIREWALL] BLOCKED: Tool "${toolName}" is not in the Plutus allowlist. ` +
        `Plutus is a TRADING ENGINE — NOT a coding agent. NO code execution. NO bash. ` +
        `Only allowed: plutus-* trading tools, tv_* / tv-browser_* browser tools, ` +
        `read/write/glob/grep/webfetch for data access. ` +
        `If you need to interact with TradingView, use tv_browser_container. ` +
        `If you need options data, use webfetch. Do NOT attempt to install packages, ` +
        `run scripts, or execute code. This is a TRADING ENGINE, not a developer agent.`
      );
    }
  };
}
