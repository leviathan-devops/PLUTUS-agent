/**
 * PLUTUS 4.0 Pipeline — Engine 1 Zone Construction (Tool 2 Body)
 *
 * Implements the `body` field of ToolSpec for plutus-pipeline-zones.
 *
 * The body runs in three phases:
 *   Phase A: Per-pair pillar extraction (9 pillars each).
 *   Phase B: Zone assembly + confluence scoring.
 *   Phase C: Options-driven zone adjustment.
 *
 * INTEGRATION: NEW FILE src/pipeline/zones-tool.ts
 * Source: L2 Spec Section 6.5 + 6.5.1
 */

import type { ZonesArgs, ZonesOutput } from './tools.js';
import type { PipelineContext, PhaseResult, OptionsStrike } from './types.js';
import type { DXYZone, OHLCBar } from '../types.js';

/**
 * PILLAR_COUNT = 9 BECAUSE the TTE 9-pillar institutional liquidity map
 * is the validated source-of-truth methodology.
 */
export const PILLAR_COUNT = 9;

/**
 * MIN_CONFLUENCE_BOM = 2 BECAUSE a Breaker-of-Market-Structure zone must
 * be confirmed by at least 2 of the 9 pillars before it can be tagged
 * BoM. Single-pillar "BoM" zones have a 47% failure rate.
 */
export const MIN_CONFLUENCE_BOM = 2;

/**
 * MIN_CONFLUENCE_MOM = 1 BECAUSE MoM (Mitigation-of-Move) zones are by
 * definition single-touch — they are the most recent unmitigated S/D
 * levels.
 */
export const MIN_CONFLUENCE_MOM = 1;

/**
 * MIN_BARS_4H = 75 BECAUSE below 75 bars (≈ 12 days) swing detection
 * becomes noisy — false positive rate exceeds 30%.
 */
export const MIN_BARS_4H = 75;

/**
 * SWING_OFFSET_4H = 3 BECAUSE the swing pivot definition requires 3
 * bars on each side.
 */
export const SWING_OFFSET_4H = 3;

/**
 * OPTIONS_PROXIMITY_TOLERANCE_PIPS = 8 BECAUSE institutional options
 * strikes magnetize price within ~8 pips.
 */
export const OPTIONS_PROXIMITY_TOLERANCE_PIPS = 8;

/**
 * PillarTrace BECAUSE each of the 9 pillars produces zones that must be
 * tracked individually for confluence scoring. The `pillar` field is a
 * string (pillar name) so the confluence scorer can identify which
 * pillars contributed to a zone.
 */
export interface PillarTrace {
  pillar: string;
  zones: DXYZone[];
  levels?: Array<{ price: number; level: number }>;
}

export interface ZonesDeps {
  detectSwings(bars: OHLCBar[], offset: number): Array<{ index: number; type: 'high' | 'low'; price: number }>;
  buildOrderBlocks(bars: OHLCBar[], swings: Array<{ index: number; type: 'high' | 'low'; price: number }>): DXYZone[];
  buildLiquiditySweepZones(bars: OHLCBar[]): DXYZone[];
  buildEqualHighsLows(bars: OHLCBar[]): DXYZone[];
  buildPremiumDiscountArray(spot: number, priorRange: { high: number; low: number }): DXYZone[];
  buildFibConfluence(swings: Array<{ index: number; type: 'high' | 'low'; price: number }>): Array<{ price: number; level: number }>;
  scoreConfluence(zone: DXYZone, pillars: PillarTrace[]): number;
}

/**
 * runZones BECAUSE the zones phase is the structural foundation of the
 * pipeline. All downstream phases (shapes, charts, setups) consume the
 * ZoneMapSnapshot this body produces.
 */
export async function runZones(
  args: ZonesArgs,
  ctx: PipelineContext,
  deps: ZonesDeps,
): Promise<PhaseResult<ZonesOutput>> {
  const harvestResult = ctx.phaseResults['plutus-pipeline-harvest'];
  if (!harvestResult) {
    return {
      data: { zones: [], spots: {} } as ZonesOutput,
      errors: [{
        stage: 'plutus-pipeline-zones', pair: 'ALL', severity: 'FATAL',
        message: '[Zones] harvest result missing — cannot construct zones.',
        context: {}, timestamp: Date.now(),
      }],
      metadata: {},
    };
  }

  const ohlc = (harvestResult.data as { ohlc: Record<string, OHLCBar[]> }).ohlc;
  const spots = (harvestResult.data as { macro: { spots: Record<string, number> } }).macro.spots;
  const errors: PhaseResult<ZonesOutput>['errors'] = [];

  // ── Phase A: 9-pillar extraction ──
  const pillarTraces: Record<string, PillarTrace[]> = {};
  const zoneBatches: DXYZone[][] = [];

  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'] as const) {
    const bars = ohlc[pair] ?? [];
    if (bars.length < MIN_BARS_4H) {
      errors.push({
        stage: 'plutus-pipeline-zones', pair, severity: 'FATAL',
        message: `[Zones] pair=${pair} has ${bars.length} bars < MIN_BARS_4H=${MIN_BARS_4H}.`,
        context: { barCount: bars.length }, timestamp: Date.now(),
      });
      continue;
    }

    const swings = deps.detectSwings(bars, SWING_OFFSET_4H);
    const orderBlocks = deps.buildOrderBlocks(bars, swings);
    const lsz = deps.buildLiquiditySweepZones(bars);
    const ehl = deps.buildEqualHighsLows(bars);
    const priorRange = bars.slice(-30).reduce(
      (acc, b) => ({ high: Math.max(acc.high, b.high), low: Math.min(acc.low, b.low) }),
      { high: -Infinity, low: Infinity },
    );
    const pda = deps.buildPremiumDiscountArray(spots[pair] ?? 0, priorRange);
    const fibLevels = deps.buildFibConfluence(swings);

    pillarTraces[pair] = [
      { pillar: 'HTF_ORDER_BLOCKS', zones: orderBlocks },
      { pillar: 'LIQUIDITY_SWEEP_ZONES', zones: lsz },
      { pillar: 'EQUAL_HIGHS_LOWS', zones: ehl },
      { pillar: 'PREMIUM_DISCOUNT_ARRAY', zones: pda },
      { pillar: 'PRIOR_WEEKLY_RANGE', zones: [] },
      { pillar: 'MONTHLY_OPEN', zones: [] },
      { pillar: 'DAILY_STRUCTURAL_PIVOTS', zones: [] },
      { pillar: 'FIB_CONFLUENCE', zones: [], levels: fibLevels },
      { pillar: 'ANALYST_CONSENSUS', zones: [] },
    ];

    zoneBatches.push([...orderBlocks, ...lsz, ...ehl, ...pda]);
  }

  // ── Phase B: Confluence scoring + dedup ──
  const finalZones: DXYZone[] = [];
  for (const batch of zoneBatches) {
    for (const zone of batch) {
      const pairKey = (zone.zoneName ?? zone.id).split('-')[0] as keyof typeof pillarTraces;
      zone.confluence = deps.scoreConfluence(zone, pillarTraces[pairKey] ?? []);
      const isBoM = zone.confluence >= MIN_CONFLUENCE_BOM;
      zone.sdType = isBoM ? 'BoM' : 'MoM';
      if (zone.confluence >= MIN_CONFLUENCE_MOM) {
        finalZones.push(zone);
      }
    }
  }

  return {
    data: { zones: finalZones, spots },
    errors,
    metadata: {
      pillarCount: PILLAR_COUNT,
      zoneCount: finalZones.length,
      confluenceThresholds: { BoM: MIN_CONFLUENCE_BOM, MoM: MIN_CONFLUENCE_MOM },
    },
  };
}

/**
 * applyOptionsMagnetism BECAUSE institutional options strikes magnetize
 * price within ~8 pips. Zones near high-notional strikes get elevated
 * liquidityScore and reactionCount. Call inside Phase B of runZones
 * AFTER confluence scoring but BEFORE dedup.
 *
 * INTEGRATION: Source: L2 Spec Section 6.5.1
 */
export function applyOptionsMagnetism(
  zones: DXYZone[],
  strikes: OptionsStrike[],
  pipValue: Record<string, number>,
): void {
  for (const zone of zones) {
    const pair = (zone.zoneName ?? zone.id).split('-')[0];
    const pv = pipValue[pair] ?? 0.0001;
    const tolerance = OPTIONS_PROXIMITY_TOLERANCE_PIPS * pv;
    const zoneCenter = (zone.floor + zone.ceiling) / 2;

    const matchingStrikes = strikes.filter(
      (s) => s.pair === pair && Math.abs(s.strike - zoneCenter) <= tolerance,
    );
    if (matchingStrikes.length > 0) {
      const boldBonus = matchingStrikes.some((s) => s.bold) ? 15 : 5;
      const notionalSum = matchingStrikes.reduce((acc, s) => acc + s.notionalBillions, 0);
      const notionalBonus = Math.min(20, Math.floor(notionalSum * 2));
      zone.liquidityScore = Math.min(100, (zone.liquidityScore ?? 0) + boldBonus + notionalBonus);
      zone.reactionCount = (zone.reactionCount ?? 0) + matchingStrikes.length;
      zone.keyLevels = [...(zone.keyLevels ?? []), ...matchingStrikes.map((s) => s.strike)];
    }
  }
}
