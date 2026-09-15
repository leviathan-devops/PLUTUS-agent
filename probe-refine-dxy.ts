/**
 * PROBE-REFINE-DXY — trace the DXY LONG lane through deterministicAnchors →
 * runRefineRetry, printing every iteration (the SL anchor, the TP, the RRR,
 * the warnings). Read-only instrumentation; NO source changes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildMacroAuthority,
  resolveOperativeZone,
  zoneToOperative,
  rungToOperative,
  phantomBoMExemption,
  isDegenerateRung,
  deterministicAnchors,
  runRefineRetry,
  continuationTargetsFor,
  computeMechanicalFloor,
  type ReasoningChainInput,
  type TokenSetContext,
  type OperativeZone,
  type Direction,
} from './src/mdve/reasoning-chain.js';
import { containingStructuralZone } from './src/mdve/anchor-decision-machine.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';

const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= limitMs).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};
const models: Record<string, ChartModel> = {
  DXY: buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))),
};
const pip = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const nativeSetups = { DXY: generateSourceSetupsV45(models.DXY), 'EUR/USD': generateSourceSetupsV45(models['EUR/USD']), 'GBP/USD': generateSourceSetupsV45(models['GBP/USD']) };
const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, { barsByTf: { '1H': gateBars(barsFor(pair, '1H', ANCHOR_MS)), '4H': gateBars(barsFor(pair, '4H', ANCHOR_MS)), '30m': gateBars(barsFor(pair, '30m', ANCHOR_MS)), '15m': gateBars(barsFor(pair, '15m', ANCHOR_MS)) }, weekStartMs: WEEK_START_MS, anchorMs: ANCHOR_MS });
}
const e2 = await buildE2Core(models as never, priorStorylines as never);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = await cascadeV45(nativeSetups.DXY, models as never, { v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true }, shapeChains, translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined });
const macro = buildMacroAuthority(models as never, e2, pip);
const shadow = createShadowAgentClient();

const input: ReasoningChainInput = {
  pair: 'DXY', week: WEEK, anchorMs: ANCHOR_MS, model: models.DXY,
  lmvTable: (models.DXY.lmv as unknown as { table: LqzZoneMatrix[] }).table,
  e2: { dxyChain: e2.dxyChain, euCoreChain: e2.euCoreChain, guCoreChain: e2.guCoreChain, euCascaded: e2.euCascaded, guCascaded: e2.guCascaded },
  e2Days: e2.dxyChain, dxySetups: nativeSetups.DXY, cascade: { eu: cascade.eu, gu: cascade.gu },
  barsByTf: { '1H': barsFor('DXY', '1H', ANCHOR_MS), '4H': barsFor('DXY', '4H', ANCHOR_MS), '30m': barsFor('DXY', '30m', ANCHOR_MS), '15m': barsFor('DXY', '15m', ANCHOR_MS) },
  macro: macro.DXY, shadow, pip: pip.DXY, atr1hPips: proxyAtr1hPips(models.DXY, pip.DXY), days: ['Monday'],
};

const e2Day = input.e2Days?.days?.[0]!;
const dayOpenSpot = e2Day.dayOpenSpot ?? models.DXY.spot;
const zone = resolveOperativeZone(models.DXY, 'DXY', 'DXY|1H|1782108000000|100.860')!;
console.log('operative zone:', zone.id, `[${zone.floor} - ${zone.ceiling}]`);
const containing = containingStructuralZone(zone, models.DXY.zones);
console.log('containing structural zone:', containing ? `${containing.id} [${containing.bottom}-${containing.top}]` : 'NONE');

const priorTp = 100.918; // the DXY SHORT's TP (chained)
const ctx: TokenSetContext = {
  input, e2Day, operativeZone: zone, direction: 'LONG', dayIndex: e2Day.dayIdx ?? 0,
  dayKey: 'Monday', shape: e2Day.shape, dayOpenSpot, priorTp,
  e2ChainDays: (input.e2Days?.days ?? []).map((d) => ({ day: d.day, shape: d.shape, direction: d.direction, confidence: d.confidence })),
  widthRatio: input.atr1hPips > 0 ? (zone.ceiling - zone.floor) / input.pip / input.atr1hPips : 0,
  tokens: [],
};
const targets = continuationTargetsFor(input.model, zone, 'LONG');
console.log('continuation targets:', targets.map((t) => t.toFixed(5)).join(' '));

const det = deterministicAnchors(ctx, { forwardPosition: 0, chosenTarget: 0, positionVerdict: 'NOT_FORWARD', reasonTrace: [], llmRefined: false }, priorTp);
console.log('\ndeterministicAnchors →', det === null ? 'null' : `E ${det.entry.toFixed(5)} SL ${det.sl.toFixed(5)} TP ${det.tp.toFixed(5)} RRR ${det.rrr.toFixed(2)}`);
if (det) {
  for (const a of det.anchors) console.log(`  ${a.role}: ${a.price.toFixed(5)} (${a.method})`);
}

// Replicate the assembleProjection + the mechanical floor + the refine loop manually.
const proj0 = {
  pair: 'DXY' as const, day: 'Monday', shape: e2Day.shape, direction: 'LONG' as const,
  entryZoneId: zone.id, E: det!.entry, SL: det!.sl, TP: det!.tp, RRR: det!.rrr,
  pressureRead: { side: 'BUY' as const, lifecycle: 'ACTIVE_1', score: 0.5, mitigationCount: 0, fortress: false, pierced: false },
  chainContext: 'shape-chain SS day 1/1 LONG', validation: { valid: false, warnings: [], confidence: 0.5 },
  confidence: 0.5, source: 'NATIVE' as const, e2ProjectionId: 'DXY|Monday|SS|LONG', e2DayDirection: 'LONG' as Direction,
  setupId: 'DXY|Monday|SS|LONG|DXY|1H|1782108000000|100.860',
  anchors: det!.anchors, tokenLedger: [],
};
const floor0 = computeMechanicalFloor(proj0, input);
console.log('\nmechanical floor (initial):', JSON.stringify({ valid: floor0.valid, checks: floor0.warnings.map((w) => w.check) }));
const detFp = { forwardPosition: 0, chosenTarget: 0, positionVerdict: 'NOT_FORWARD' as const, reasonTrace: [] as string[], llmRefined: false };
const rr = await runRefineRetry(proj0, input, ctx);
console.log('\nrunRefineRetry → valid', rr.valid, 'hardThrow', rr.hardThrow, 'iterations', rr.projection.tokenLedger.filter((t) => t.verdict.startsWith('REFINED')).length);
console.log('final: E', rr.projection.E.toFixed(5), 'SL', rr.projection.SL.toFixed(5), 'TP', rr.projection.TP.toFixed(5), 'RRR', rr.projection.RRR.toFixed(2));
for (const t of rr.projection.tokenLedger) {
  if (t.verdict.startsWith('REFINED')) console.log(`  ${t.verdict} — ${t.evidence.join('; ')}`);
}
for (const a of rr.projection.anchors) console.log(`  ${a.role}: ${a.price.toFixed(5)} (${a.method})`);
