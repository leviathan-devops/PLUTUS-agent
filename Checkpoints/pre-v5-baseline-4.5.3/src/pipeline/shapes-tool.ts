/**
 * PLUTUS 4.0 Pipeline — Engine 2 Shape Chain (Tool 3 Body)
 *
 * Implements the `body` field of ToolSpec for plutus-pipeline-shapes.
 *
 * Algorithm:
 *   1. For each pair, take the 5 trading days ending at the temporal anchor.
 *   2. Classify each day's shape from OHLC.
 *   3. Use the prior day's shape + zone bias to predict the next day.
 *   4. Assemble the chain and storylineBias.
 *
 * INTEGRATION: NEW FILE src/pipeline/shapes-tool.ts
 * Source: L2 Spec Section 6.6
 */

import type { ShapesArgs, ShapesOutput } from './tools.js';
import type { PipelineContext, PhaseResult, ShapePredictionSnapshot, ShapePredictionDay, DayShape } from './types.js';
import type { OHLCBar } from '../types.js';

/**
 * SHAPE_CHAIN_LENGTH = 5 BECAUSE the TTE weekly report covers Monday
 * through Friday. Shorter chains miss the directional migration of
 * price through the week; longer chains introduce speculation.
 */
export const SHAPE_CHAIN_LENGTH = 5;

/**
 * SHAPE_CODES BECAUSE the TTE methodology defines a closed set of 9
 * macro shapes.
 *   SS  - Swing Scalp       (range-bound, small body, multiple wicks)
 *   BS  - Breakout Surge    (large body, breaks prior range)
 *   PBS - Pullback Surge    (BS that retraces then continues)
 *   WL  - Whiplash          (large range both directions, closes mid)
 *   RWL - Reverse Whiplash  (WL that closes opposite to open direction)
 *   R   - Recovery          (counter-trend day after a down/up move)
 *   WLS - Wide-Range Swing  (large body with mid-day reversal)
 *   STORM - Storm           (multiple whipsaws, no clear trend)
 *   DWL - Dead Whale        (failed whiplash, closes at extreme)
 */
export const SHAPE_CODES = ['SS', 'BS', 'PBS', 'WL', 'RWL', 'R', 'WLS', 'STORM', 'DWL'] as const;

/**
 * SHAPE_BODY_THRESHOLD_ATR = 1.2 BECAUSE a candle body must be ≥1.2× the
 * 14-period ATR to qualify as a "surge" (BS/PBS).
 */
export const SHAPE_BODY_THRESHOLD_ATR = 1.2;

/**
 * SHAPE_WHIP_THRESHOLD_ATR = 2.0 BECAUSE a whiplash requires a total
 * range (high-low) of ≥2.0× ATR with wicks on both sides.
 */
export const SHAPE_WHIP_THRESHOLD_ATR = 2.0;

export interface ShapesDeps {
  computeAtr(bars: OHLCBar[], period: number): number[];
  classifyDay(dayOpen: number, dayHigh: number, dayLow: number, dayClose: number, atr: number): DayShape['shape'];
  predictNext(currentShape: DayShape['shape'], zoneBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): ShapePredictionDay;
}

/**
 * runShapes BECAUSE the shapes phase predicts the expected daily price
 * path for the trading week. The shape chain drives setup category
 * selection in the setups phase.
 */
export async function runShapes(
  args: ShapesArgs,
  ctx: PipelineContext,
  deps: ShapesDeps,
): Promise<PhaseResult<ShapesOutput>> {
  const zonesResult = ctx.phaseResults['plutus-pipeline-zones'];
  const harvestResult = ctx.phaseResults['plutus-pipeline-harvest'];
  if (!zonesResult || !harvestResult) {
    return {
      data: { chain: [], currentShape: 'SS', dayDecomposition: [], storylineBias: 'NEUTRAL', consolidationPhase: false },
      errors: [{
        stage: 'plutus-pipeline-shapes', pair: 'ALL', severity: 'FATAL',
        message: '[Shapes] zones or harvest result missing.',
        context: {}, timestamp: Date.now(),
      }],
      metadata: {},
    };
  }

  const ohlc = (harvestResult.data as { ohlc: Record<string, OHLCBar[]> }).ohlc;
  const errors: PhaseResult<ShapesOutput>['errors'] = [];
  const chains: Record<string, ShapePredictionDay[]> = {};

  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const) {
    const bars = ohlc[pair] ?? [];
    if (bars.length < 30) continue;
    const atrSeries = deps.computeAtr(bars, 14);
    const last5Days = aggregateToDaily(bars).slice(-SHAPE_CHAIN_LENGTH);

    const dayDecomp: DayShape[] = [];
    for (let i = 0; i < last5Days.length; i++) {
      const day = last5Days[i];
      const atr = atrSeries[atrSeries.length - 1] ?? 0.001;
      const shape = deps.classifyDay(day.open, day.high, day.low, day.close, atr);
      dayDecomp.push({ day: day.date, shape, open: day.open, high: day.high, low: day.low, close: day.close });
    }

    const zoneBias = inferBiasFromZones(zonesResult.data as { zones: Array<{ floor: number; ceiling: number }> }, pair);
    const predictedChain: ShapePredictionDay[] = [];
    let prevShape: DayShape['shape'] = dayDecomp[0]?.shape ?? 'SS';
    for (let i = 0; i < SHAPE_CHAIN_LENGTH; i++) {
      const prediction = deps.predictNext(prevShape, zoneBias);
      predictedChain.push(prediction);
      prevShape = prediction.predictedShape ?? prediction.shape;
    }

    chains[pair] = predictedChain;
  }

  const primaryChain = chains['DXY'] ?? [];
  const snapshot: ShapePredictionSnapshot = {
    currentShape: primaryChain[0]?.predictedShape ?? 'SS',
    chain: primaryChain,
    dayDecomposition: [],
    storylineBias: inferStorylineBias(primaryChain),
    consolidationPhase: primaryChain.every((d) => (d.predictedShape ?? d.shape) === 'SS'),
  };

  return { data: snapshot, errors, metadata: { chainLength: SHAPE_CHAIN_LENGTH } };
}

/**
 * aggregateToDaily BECAUSE the OHLC source provides 4H (or finer) bars.
 * The shape classifier requires daily OHLC. This is the canonical
 * aggregator — do not duplicate this logic elsewhere.
 */
function aggregateToDaily(bars: OHLCBar[]): Array<{ date: string; open: number; high: number; low: number; close: number }> {
  const daily: Record<string, { date: string; open: number; high: number; low: number; close: number }> = {};
  for (const bar of bars) {
    const date = new Date(bar.timestamp).toISOString().slice(0, 10);
    if (!daily[date]) {
      daily[date] = { date, open: bar.open, high: bar.high, low: bar.low, close: bar.close };
    } else {
      daily[date].high = Math.max(daily[date].high, bar.high);
      daily[date].low = Math.min(daily[date].low, bar.low);
      daily[date].close = bar.close;
    }
  }
  return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

function inferBiasFromZones(
  zonesData: { zones: Array<{ floor: number; ceiling: number }> },
  _pair: string,
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const zones = zonesData.zones;
  if (zones.length === 0) return 'NEUTRAL';
  const aboveMid = zones.filter((z) => (z.floor + z.ceiling) / 2 > zones[0].floor).length;
  const belowMid = zones.length - aboveMid;
  if (aboveMid > belowMid * 1.5) return 'BEARISH';
  if (belowMid > aboveMid * 1.5) return 'BULLISH';
  return 'NEUTRAL';
}

function inferStorylineBias(chain: ShapePredictionDay[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  const surgeCount = chain.filter((d) => d.predictedShape === 'BS' || d.predictedShape === 'PBS').length;
  const whiplashCount = chain.filter((d) => d.predictedShape === 'WL' || d.predictedShape === 'RWL').length;
  if (surgeCount > whiplashCount) return 'BULLISH';
  if (whiplashCount > surgeCount) return 'NEUTRAL';
  return 'NEUTRAL';
}
