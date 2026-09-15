/**
 * PROBE-DXY-LONG-TRACE — trace the DXY LONG lane end-to-end (the DEFECT-N
 * diagnosis): the longDemand resolution → the lane pushes → the ADM verdict.
 * Read-only instrumentation; NO source changes.
 */
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildReasoningChain,
  buildMacroAuthority,
  resolveOperativeZone,
  zoneToOperative,
  rungToOperative,
  phantomBoMExemption,
  isDegenerateRung,
  deterministicAnchors,
  continuationTargetsFor,
  token9_chaining,
  type ReasoningChainInput,
  type TokenSetContext,
  type OperativeZone,
  type Direction,
} from './src/mdve/reasoning-chain.js';
import { anchorTrade, type AdmInput } from './src/mdve/anchor-decision-machine.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

const models: Record<string, ChartModel | null> = {
  DXY: buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))),
};

const nativeSetups = {
  DXY: generateSourceSetupsV45(models.DXY!),
  'EUR/USD': generateSourceSetupsV45(models['EUR/USD']!),
  'GBP/USD': generateSourceSetupsV45(models['GBP/USD']!),
};

const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: {
      '1H': gateBars(barsFor(pair, '1H', ANCHOR_MS)), '4H': gateBars(barsFor(pair, '4H', ANCHOR_MS)),
      '30m': gateBars(barsFor(pair, '30m', ANCHOR_MS)), '15m': gateBars(barsFor(pair, '15m', ANCHOR_MS)),
    },
    weekStartMs: WEEK_START_MS,
    anchorMs: ANCHOR_MS,
  });
}

const e2 = await buildE2Core(models as never, priorStorylines as never);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = await cascadeV45(nativeSetups.DXY, models as never, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
});
const pip = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const macro = buildMacroAuthority(models as never, e2, pip);

console.log('=== MACRO ===');
for (const p of ['DXY', 'EUR/USD', 'GBP/USD'] as const) console.log(`  ${p}: ${macro[p].direction} (${macro[p].source})`);

const e2DaysFor = (pair: string) =>
  pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain;

const shadow = createShadowAgentClient();

function buildChainInput(pair: string, limitMs: number = ANCHOR_MS): ReasoningChainInput | null {
  const model = models[pair as 'DXY' | 'EUR/USD' | 'GBP/USD'];
  if (!model) return null;
  return {
    pair: pair as 'DXY' | 'EUR/USD' | 'GBP/USD',
    week: WEEK,
    anchorMs: limitMs,
    model,
    lmvTable: (model.lmv as unknown as { table: LqzZoneMatrix[] }).table,
    e2: { dxyChain: e2.dxyChain, euCoreChain: e2.euCoreChain, guCoreChain: e2.guCoreChain, euCascaded: e2.euCascaded, guCascaded: e2.guCascaded },
    e2Days: e2DaysFor(pair),
    dxySetups: nativeSetups.DXY,
    cascade: { eu: cascade.eu, gu: cascade.gu },
    barsByTf: {
      '1H': barsFor(pair, '1H', limitMs), '4H': barsFor(pair, '4H', limitMs),
      '30m': barsFor(pair, '30m', limitMs), '15m': barsFor(pair, '15m', limitMs),
    },
    macro: macro[pair as 'DXY' | 'EUR/USD' | 'GBP/USD']!,
    shadow,
    pip: pip[pair as 'DXY' | 'EUR/USD' | 'GBP/USD']!,
    atr1hPips: proxyAtr1hPips(model, pip[pair as 'DXY' | 'EUR/USD' | 'GBP/USD']!),
    days: ['Monday'],
  };
}

// The replicated findFortressDemand + nearestDemandBelow (the reasoning-chain
// copies — same logic, probe-local).
function findFortressDemandLocal(model: ChartModel, dayOpenSpot: number, input: ReasoningChainInput): OperativeZone | null {
  const atr = input.atr1hPips;
  const exempted = model.zones
    .filter((z) => !String(z.id).startsWith('LMV|'))
    .filter((z) => z.type === 'DEMAND' && z.top <= dayOpenSpot)
    .map((z) => zoneToOperative(z))
    .map((z) => ({ z, ph: phantomBoMExemption(z, model, input.pip, atr) }))
    .filter((x) => x.ph.exempt)
    .sort((a, b) => b.z.ceiling - a.z.ceiling);
  if (exempted.length === 0) return null;
  return { ...exempted[0]!.z, phantom: true };
}

function nearestDemandBelowLocal(model: ChartModel, dayOpenSpot: number): OperativeZone | null {
  const zones = model.zones
    .filter((z) => z.type === 'DEMAND' && z.bottom <= dayOpenSpot)
    .map((z) => ({ zone: zoneToOperative(z), ceiling: z.top }));
  const rungs = model.lmv.table
    .filter((r) => r.side === 'BUY_SIDE' && r.bottom <= dayOpenSpot && !isDegenerateRung(r, model.pair))
    .map((r) => ({ zone: rungToOperative(model.pair, r), ceiling: r.top }));
  const pool = [...zones, ...rungs].sort((a, b) => b.ceiling - a.ceiling);
  return pool[0]?.zone ?? null;
}

// ═══ THE DXY MONDAY LANE TRACE ═══
const input = buildChainInput('DXY')!;
const dxyModel = models.DXY!;
const e2Day = input.e2Days?.days?.[0];
console.log('\n=== DXY MONDAY E2 DAY ===');
console.log(`  day ${e2Day?.day} shape ${e2Day?.shape} dir ${e2Day?.direction} open ${e2Day?.dayOpenSpot}`);
console.log(`  supplyZoneId ${e2Day?.supplyZoneId} demandZoneId ${e2Day?.demandZoneId} deepDemandZoneId ${e2Day?.deepDemandZoneId}`);

const dayOpenSpot = e2Day?.dayOpenSpot ?? dxyModel.spot;
const dayDir = e2Day?.direction as Direction | undefined;

const supply = resolveOperativeZone(dxyModel, 'DXY', e2Day?.supplyZoneId ?? undefined);
const demand = resolveOperativeZone(dxyModel, 'DXY', e2Day?.demandZoneId ?? undefined);
const deepDemand = resolveOperativeZone(dxyModel, 'DXY', e2Day?.deepDemandZoneId ?? undefined);
const longDemand = findFortressDemandLocal(dxyModel, dayOpenSpot, input) ?? demand ?? deepDemand ?? nearestDemandBelowLocal(dxyModel, dayOpenSpot);

console.log('\n=== THE RESOLUTIONS ===');
console.log(`  supply      ${supply ? `${supply.id} [${supply.floor}-${supply.ceiling}]` : 'null'}`);
console.log(`  demand      ${demand ? `${demand.id} [${demand.floor}-${demand.ceiling}]` : 'null'}`);
console.log(`  deepDemand  ${deepDemand ? `${deepDemand.id} [${deepDemand.floor}-${deepDemand.ceiling}]` : 'null'}`);
console.log(`  longDemand  ${longDemand ? `${longDemand.id} [${longDemand.floor}-${longDemand.ceiling}]` : 'null'}`);

const lanes: Array<{ direction: Direction; zone: OperativeZone | null; lane: 'E2_NATIVE' | 'MACRO' | 'REACTION' }> = [];
if (dayDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'E2_NATIVE' });
if (dayDir === 'LONG' && (demand ?? deepDemand)) lanes.push({ direction: 'LONG', zone: demand ?? deepDemand, lane: 'E2_NATIVE' });
const reactionDir: Direction = dayDir === 'SHORT' ? 'LONG' : 'SHORT';
if (reactionDir === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'REACTION' });
if (reactionDir === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'REACTION' });
if (macro.DXY.direction === 'SHORT' && supply) lanes.push({ direction: 'SHORT', zone: supply, lane: 'MACRO' });
if (macro.DXY.direction === 'LONG' && longDemand) lanes.push({ direction: 'LONG', zone: longDemand, lane: 'MACRO' });

console.log('\n=== THE LANES (pre-dedupe) ===');
for (const l of lanes) console.log(`  ${l.lane.padEnd(10)} ${l.direction} ${l.zone ? `${l.zone.id} [${l.zone.floor}-${l.zone.ceiling}]` : 'NO ZONE'}`);

const rank: Record<'E2_NATIVE' | 'MACRO' | 'REACTION', number> = { E2_NATIVE: 0, REACTION: 1, MACRO: 2 };
const unique = new Map<Direction, (typeof lanes)[number]>();
for (const l of lanes) if (l.zone && !unique.has(l.direction)) unique.set(l.direction, l);
const ordered = [...unique.values()].sort((a, b) => rank[a.lane] - rank[b.lane]);

console.log('\n=== THE ORDERED (deduped) LANES ===');
for (const l of ordered) console.log(`  ${l.lane.padEnd(10)} ${l.direction} ${l.zone!.id} [${l.zone!.floor}-${l.zone!.ceiling}]`);

// Now simulate the LONG lane's anchor construction.
const longLane = ordered.find((l) => l.direction === 'LONG');
if (!longLane) {
  console.log('\n=== THE LONG LANE: NEVER PUSHED (no LONG lane in the ordered set) ===');
} else {
  const zone = longLane.zone as OperativeZone;
  const priorTp = 100.918; // the DXY SHORT's TP (measured from the diag: TP@100.91800)
  const chainedEntry = token9_chaining(priorTp);
  console.log(`\n=== THE LONG LANE ANCHOR TRACE (chainedEntry = priorTp = ${chainedEntry}) ===`);
  const ctx: TokenSetContext = {
    input,
    e2Day: e2Day!,
    operativeZone: zone,
    direction: 'LONG',
    dayIndex: e2Day?.dayIdx ?? 0,
    dayKey: 'Monday',
    shape: e2Day?.shape ?? 'SS',
    dayOpenSpot,
    priorTp,
    e2ChainDays: (input.e2Days?.days ?? []).map((d) => ({ day: d.day, shape: d.shape, direction: d.direction, confidence: d.confidence })),
    widthRatio: input.atr1hPips > 0 ? (zone.ceiling - zone.floor) / input.pip / input.atr1hPips : 0,
    tokens: [],
  };
  const targets = continuationTargetsFor(input.model, zone, 'LONG');
  const admInput: AdmInput = {
    model: input.model.zones,
    lmvTable: input.model.lmv.table,
    pair: 'DXY',
    pip: input.pip,
    operativeZone: zone,
    direction: 'LONG',
    dayOpenSpot,
    priorTp: chainedEntry > 0 ? chainedEntry : undefined,
    e1ZoneId: zone.id,
    e2ProjectionId: 'DXY|Monday|SS|LONG',
    atr1hPips: input.atr1hPips,
  };
  const adm = anchorTrade(admInput);
  console.log(`  ADM verdict ${adm.verdict}${adm.verdict === 'REJECT' ? ` reason=${adm.rejectReason}` : ''}`);
  console.log(`  ADM entry ${adm.entry.toFixed(5)} (${adm.entryMethod})`);
  console.log(`  ADM sl    ${adm.sl.toFixed(5)} (${adm.slMethod})`);
  console.log(`  ADM tp    ${adm.tp.toFixed(5)} (${adm.tpMethod})`);
  console.log(`  ADM rrr   ${adm.rrr.toFixed(2)}`);
  console.log(`  measurements slDepth ${adm.measurements.slDepth.value.toFixed(2)}p entry ${adm.measurements.entryLevel.value.toFixed(5)} tp ${adm.measurements.tpLevel.value.toFixed(5)}`);
  for (const e of adm.rejectEvidence ?? []) console.log(`  rejectEvidence: ${e}`);
  for (const t of adm.triplets) console.log(`  triplet ${t.pattern}: ${t.state} — ${t.evidence}`);
  const det = deterministicAnchors(ctx, { forwardPosition: 0, chosenTarget: 0, positionVerdict: 'NOT_FORWARD', reasonTrace: [], llmRefined: false }, chainedEntry);
  console.log(`\n  deterministicAnchors → ${det === null ? 'null (the lane emits NOTHING)' : `E ${det.entry.toFixed(5)} SL ${det.sl.toFixed(5)} TP ${det.tp.toFixed(5)} RRR ${det.rrr.toFixed(2)}`}`);
}

// The full chain run — the stats.
console.log('\n=== THE FULL DXY CHAIN RUN ===');
const full = await buildReasoningChain(input);
console.log(`  projections: ${full.projections.length}`);
for (const p of full.projections) console.log(`    ${p.direction} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)} source ${p.source} lane-ctx ${p.chainContext}`);
console.log(`  failures: ${full.failures.length} (${full.failures.map((f) => `${f.failureType}:${f.setupId}`).join(' | ')})`);
console.log(`  stats: ${JSON.stringify(full.stats)}`);
console.log(`  divergences: ${full.ledger.divergences.join(' | ') || 'none'}`);
