/**
 * Plutus Tools — Tool registration for the Plutus v4.0 pipeline.
 *
 * v3 tools (plutus-generate-report, plutus-chart-vision) have been REMOVED.
 * The v4 pipeline uses the 5-tool chain in pipeline/engine.ts instead:
 *   plutus-pipeline-harvest → zones → shapes → charts → setups
 *
 * This file now only registers plutus-status and performs data client
 * initialization (side effects like navigateHeadedBrowser).
 */

import type { PluginInput, ToolResult } from '@opencode-ai/plugin';
import { tool } from '@opencode-ai/plugin';
import { navigateHeadedBrowser } from '../engine/data-source-router.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('PlutusTools');

export function createPlutusTools(input: PluginInput): Record<string, ReturnType<typeof tool>> {
  log.info('Initializing Plutus v4.0 tool set...');

  // ── Navigate headed browser to TradingView so it's not on about:blank ──
  navigateHeadedBrowser('https://www.tradingview.com/chart/?symbol=OANDA:AUDUSD').catch(() => {});

  const plutusStatus = tool({
    description: 'Get Plutus engine status — engine version, pipeline architecture, and configuration.',
    args: {},
    async execute(): Promise<ToolResult> {
      return {
        output: JSON.stringify(
          {
            engine: 'PLUTUS v4.0 — Autonomous 3-Engine Trading Intelligence',
            pipeline: '5-tool chain: harvest → zones → shapes → charts → setups',
            pairPriority: ['AUD/USD', 'GBP/USD', 'EUR/USD', 'DXY'],
            tools: [
              'plutus-pipeline-harvest',
              'plutus-pipeline-zones',
              'plutus-pipeline-shapes',
              'plutus-pipeline-charts',
              'plutus-pipeline-setups',
              'plutus-browse-screenshot',
              'plutus-backtest-setups',
              'plutus-omni-vision',
              'plutus-status',
            ],
          },
          null,
          2,
        ),
      };
    },
  });

  return {
    'plutus-status': plutusStatus,
  };
}
