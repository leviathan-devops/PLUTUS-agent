/**
 * PLUTUS 4.0 Pipeline — Harvest Tool Body (Tool 1)
 *
 * Implements the `body` field of ToolSpec for plutus-pipeline-harvest.
 *
 * Temporal anchoring: any OHLC bar with `timestamp > ctx.temporalAnchor`
 * is REJECTED with a FATAL PipelineError. This is the only leak-proof
 * way to enforce "today = anchor" (BS-5). The check fires inside the
 * harvest body, not in a post-hoc auditor.
 *
 * INTEGRATION: NEW FILE src/pipeline/harvest-tool.ts
 * Source: L2 Spec Section 6.3
 */

import type { HarvestArgs, HarvestOutput } from './tools.js';
import type { MacroCalendarEntry, PipelineContext, PhaseResult } from './types.js';
import type { OHLCBar } from '../types.js';
import { TemporalAnchorViolation, toPipelineError } from './errors.js';
import { buildTemporalAnchor, assertNoFutureLeak } from './temporal-anchor.js';

/**
 * HARVEST_PAIR_ORDER BECAUSE DXY must be harvested first — it is the
 * structural driver and its spot feeds the multi-pair translator.
 * EUR/USD second because it has the tightest spread and is the most
 * sensitive to DXY movements. GBP/USD third, AUD/USD last (commodity
 * currency, slowest to react).
 */
export const HARVEST_PAIR_ORDER = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

/**
 * HarvestDeps BECAUSE the harvest tool must be testable without real
 * network calls. Each dependency is an integration point bound to the
 * existing engine at deployment time.
 */
export interface HarvestDeps {
  fetchOhlc(pair: string, fromMs: number, toMs: number): Promise<OHLCBar[]>;
  fetchSpot(pair: string): Promise<number>;
  fetchAnalystBias(pair: string): Promise<'BULLISH' | 'BEARISH' | 'NEUTRAL'>;
  fetchMacroCalendar(fromMs: number, toMs: number): Promise<MacroCalendarEntry[]>;
}

/**
 * runHarvest BECAUSE the harvest phase is the pipeline's data ingress.
 *
 * Pseudocode:
 *   1. Build temporal anchor from args.weekStart.
 *   2. For each pair in HARVEST_PAIR_ORDER, fetch OHLC for [anchor-lookbackDays, anchor].
 *   3. For each bar, run assertNoFutureLeak. On violation → FATAL.
 *   4. Fetch spots, analystBias, macro calendar.
 *   5. Return HarvestOutput with optionsDateLink.
 *
 * The body never calls the agent's VLM — there is no image in this phase.
 */
export async function runHarvest(
  args: HarvestArgs,
  ctx: PipelineContext,
  deps: HarvestDeps,
): Promise<PhaseResult<HarvestOutput>> {
  const errors: PhaseResult<HarvestOutput>['errors'] = [];
  const anchor = buildTemporalAnchor(args.weekStart);
  ctx.temporalAnchor = anchor.anchorMs;
  const fromMs = anchor.anchorMs - args.lookbackDays * 86_400_000;

  const ohlc: Record<string, OHLCBar[]> = {};
  for (const pair of HARVEST_PAIR_ORDER) {
    try {
      const bars = await deps.fetchOhlc(pair, fromMs, anchor.anchorMs);
      for (const bar of bars) {
        assertNoFutureLeak(bar, anchor, pair);
      }
      ohlc[pair] = bars;
    } catch (err) {
      if (err instanceof TemporalAnchorViolation) {
        errors.push(toPipelineError(err, 'plutus-pipeline-harvest', pair));
        throw err; // FATAL — abort entire pipeline
      }
      errors.push(toPipelineError(err, 'plutus-pipeline-harvest', pair));
    }
  }

  const spots: Record<string, number> = {};
  const analystBias: Record<string, 'BULLISH' | 'BEARISH' | 'NEUTRAL'> = {};
  for (const pair of HARVEST_PAIR_ORDER) {
    try {
      spots[pair] = await deps.fetchSpot(pair);
      analystBias[pair] = await deps.fetchAnalystBias(pair);
    } catch (err) {
      errors.push(toPipelineError(err, 'plutus-pipeline-harvest', pair));
    }
  }

  let calendar: MacroCalendarEntry[] = [];
  try {
    calendar = await deps.fetchMacroCalendar(fromMs, anchor.anchorMs);
  } catch (err) {
    errors.push(toPipelineError(err, 'plutus-pipeline-harvest', 'DXY'));
  }

  return {
    data: {
      ohlc,
      macro: { spots, analystBias, calendar },
      optionsDateLink: {
        url: `https://investinglive.com/archive/${anchor.fridayUrlSlug}`,
        label: `${anchor.fridayIso} Options Expiry`,
        weekStartIso: anchor.weekStartIso,
        fridayIso: anchor.fridayIso,
      },
    },
    errors,
    metadata: { anchorMs: anchor.anchorMs, lookbackDays: args.lookbackDays },
  };
}
