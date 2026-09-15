/**
 * PLUTUS 4.0 Pipeline — Visual Setup Generation (Tool 5 Body)
 *
 * Implements the `body` field of ToolSpec for plutus-pipeline-setups.
 *
 * Algorithm:
 *   1. For each pair, take validatedZones for that pair.
 *   2. For each day (5 days), construct the primary setup.
 *   3. Validate each setup against SL/RRR/session rules.
 *   4. Emit TradeSetup[] with source = 'VISUAL'.
 *
 * INTEGRATION: NEW FILE src/pipeline/setups-tool.ts
 * Source: L2 Spec Section 6.9
 */

import type { SetupsArgs, SetupsOutput } from './tools.js';
import type {
  PipelineContext, PhaseResult, PipelineError,
  TradeSetup, VisualSDZone, SetupCategory, TradeDirection, SessionWindow,
} from './types.js';

/**
 * MIN_SETUPS_PER_PAIR = 8 BECAUSE T1-T4 require ≥8 setups per pair.
 */
export const MIN_SETUPS_PER_PAIR = 8;

/**
 * TARGET_SETUPS_PER_PAIR = 10 BECAUSE 8 is the floor; 10 provides
 * redundancy for the trader to choose.
 */
export const TARGET_SETUPS_PER_PAIR = 10;

/**
 * REQUIRED_CATEGORIES BECAUSE T5 requires categories to include
 * SS, BS, RWL, Whiplash — not just HTF Swing.
 */
export const REQUIRED_CATEGORIES: SetupCategory[] = [
  'HTF_SWING',
  'SWING_SCALP',
  'BREAKOUT_SURGE',
  'WHIPLASH',
];

/**
 * SL_DISTANCE_MIN_PIPS = 5 BECAUSE below 5 pips, forex spreads consume
 * >50% of the SL.
 */
export const SL_DISTANCE_MIN_PIPS = 5;

/**
 * SL_DISTANCE_MAX_PIPS = 15 BECAUSE above 15 pips, the R:R ratio degrades
 * below the TTE minimum.
 */
export const SL_DISTANCE_MAX_PIPS = 15;

/**
 * SL_DISTANCE_MEDIAN_PIPS = 12 BECAUSE the user's 8 winning trades had
 * a median SL of 12 pips.
 */
export const SL_DISTANCE_MEDIAN_PIPS = 12;

/**
 * MIN_RRR_BY_CATEGORY BECAUSE each setup category has a TTE-defined
 * minimum R:R.
 */
export const MIN_RRR_BY_CATEGORY: Record<SetupCategory, number> = {
  HTF_SWING: 2.0,
  SWING_SCALP: 1.5,
  BREAKOUT_SURGE: 2.5,
  REINFORCEMENT: 1.5,
  TRANSITION: 1.8,
  WHIPLASH: 2.0,
};

export interface SetupsDeps {
  findOpposingZone(validatedZones: VisualSDZone[], entry: number, direction: TradeDirection): VisualSDZone | null;
  findLiquidityOverlap(zones: VisualSDZone[], spot: number): { earth: boolean; fire: boolean };
  computeRrr(entry: number, sl: number, tp: number): number;
  getCurrentSession(): SessionWindow;
}

/**
 * runSetups BECAUSE the setups phase is the final output of the pipeline.
 * It consumes validated zones + shape chain + spots to produce ≥8 setups
 * per pair.
 */
export async function runSetups(
  args: SetupsArgs,
  ctx: PipelineContext,
  deps: SetupsDeps,
): Promise<PhaseResult<SetupsOutput>> {
  const errors: PipelineError[] = [];
  const allSetups: TradeSetup[] = [];

  const validatedZones = args.validatedZones as unknown as VisualSDZone[];
  const pairs = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const;

  for (const pair of pairs) {
    const pairZones = validatedZones.filter((z) => z.pair === pair);
    if (pairZones.length < 3) {
      errors.push({
        stage: 'plutus-pipeline-setups', pair, severity: 'FATAL',
        message: `[Setups] pair=${pair} has ${pairZones.length} validated zones < 3. Cannot construct setups.`,
        context: { zoneCount: pairZones.length }, timestamp: Date.now(),
      });
      continue;
    }

    const shapesResult = ctx.phaseResults['plutus-pipeline-shapes'];
    const chain = (shapesResult?.data as { chain: Array<{ day: string; predictedShape?: string }> })?.chain ?? [];
    const harvestResult = ctx.phaseResults['plutus-pipeline-harvest'];
    const spot = (harvestResult?.data as { macro: { spots: Record<string, number> } })?.macro.spots[pair] ?? 0;

    const pairSetups: TradeSetup[] = [];

    for (let dayIdx = 0; dayIdx < 5; dayIdx++) {
      const day = chain[dayIdx]?.day ?? `day-${dayIdx}`;
      const predictedShape = chain[dayIdx]?.predictedShape ?? 'SS';

      const setup = constructSetupForDay(pair, dayIdx, day, predictedShape, pairZones, spot, deps);
      if (setup) {
        pairSetups.push(setup);
      }
    }

    // Ensure category diversity (T5).
    const categories = new Set(pairSetups.map((s) => s.category));
    if (categories.size < 4) {
      errors.push({
        stage: 'plutus-pipeline-setups', pair, severity: 'WARN',
        message: `[Setups] pair=${pair} only has ${categories.size} categories. Need ≥4.`,
        context: { categories: [...categories] }, timestamp: Date.now(),
      });
    }

    // Ensure ≥ 8 setups (T1-T4).
    if (pairSetups.length < MIN_SETUPS_PER_PAIR) {
      errors.push({
        stage: 'plutus-pipeline-setups', pair, severity: 'FATAL',
        message: `[Setups] pair=${pair} produced ${pairSetups.length} setups < ${MIN_SETUPS_PER_PAIR}.`,
        context: { setupCount: pairSetups.length }, timestamp: Date.now(),
      });
    }

    allSetups.push(...pairSetups);
  }

  return {
    data: { setups: allSetups, reportPath: '' },
    errors,
    metadata: {
      totalSetups: allSetups.length,
      setupsPerPair: pairs.map((p) => ({ pair: p, count: allSetups.filter((s) => s.pair === p).length })),
    },
  };
}

/**
 * constructSetupForDay BECAUSE each day's predicted shape determines the
 * setup category and direction. This function is the heart of the
 * VisualSetupGenerator.
 */
function constructSetupForDay(
  pair: string,
  dayIdx: number,
  day: string,
  predictedShape: string,
  zones: VisualSDZone[],
  spot: number,
  deps: SetupsDeps,
): TradeSetup | null {
  const direction: TradeDirection = inferDirection(predictedShape, zones, spot);
  const entryZone = selectEntryZone(zones, direction, spot);
  if (!entryZone) return null;

  const entry = direction === 'LONG' ? entryZone.bottom : entryZone.top;
  const sl = computeSL(entry, direction);
  const opposing = deps.findOpposingZone(zones, entry, direction);
  if (!opposing) return null;
  const tp = direction === 'LONG' ? opposing.top : opposing.bottom;
  const rrr = deps.computeRrr(entry, sl, tp);

  const category = categorizeShape(predictedShape);
  if (rrr < MIN_RRR_BY_CATEGORY[category]) return null;

  return {
    id: `${pair}-${day}-VISUAL-${dayIdx}`,
    pair,
    direction,
    category,
    day,
    entries: {
      front: entry,
      mid: entry + (direction === 'LONG' ? -0.0005 : 0.0005),
      back: entry + (direction === 'LONG' ? -0.001 : 0.001),
    },
    sl,
    tp,
    rrr,
    confidence: entryZone.confidence,
    session: deps.getCurrentSession(),
    candleConfirmation: inferCandleConfirmation(predictedShape, direction),
    shape: predictedShape,
    zoneRef: entryZone.mappedIPZoneName ?? entryZone.pair,
    source: 'VISUAL',
  };
}

function inferDirection(shape: string, zones: VisualSDZone[], spot: number): TradeDirection {
  const supplyAbove = zones.filter((z) => z.type === 'SUPPLY' && z.bottom > spot).length;
  const demandBelow = zones.filter((z) => z.type === 'DEMAND' && z.top < spot).length;
  if (shape === 'BS' || shape === 'PBS') return supplyAbove < demandBelow ? 'LONG' : 'SHORT';
  if (shape === 'WL' || shape === 'RWL') return 'SHORT';
  return demandBelow > supplyAbove ? 'LONG' : 'SHORT';
}

function selectEntryZone(zones: VisualSDZone[], direction: TradeDirection, spot: number): VisualSDZone | null {
  const candidates = zones.filter((z) => {
    if (direction === 'LONG') return z.type === 'DEMAND' && z.top < spot;
    return z.type === 'SUPPLY' && z.bottom > spot;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0] ?? null;
}

function computeSL(entry: number, direction: TradeDirection): number {
  const slDistance = SL_DISTANCE_MEDIAN_PIPS * 0.0001;
  return direction === 'LONG' ? entry - slDistance : entry + slDistance;
}

function categorizeShape(shape: string): SetupCategory {
  switch (shape) {
    case 'BS':
    case 'PBS':
      return 'BREAKOUT_SURGE';
    case 'WL':
    case 'RWL':
    case 'STORM':
      return 'WHIPLASH';
    case 'SS':
    case 'WLS':
      return 'SWING_SCALP';
    default:
      return 'HTF_SWING';
  }
}

function inferCandleConfirmation(shape: string, direction: TradeDirection): string {
  const dir = direction === 'LONG' ? 'bullish' : 'bearish';
  switch (shape) {
    case 'BS':
      return `${dir} engulfing candle closing above prior high`;
    case 'WL':
      return `${dir} pin bar rejection at zone edge`;
    case 'SS':
      return `${dir} inside-bar breakout`;
    default:
      return `${dir} close beyond zone boundary`;
  }
}
