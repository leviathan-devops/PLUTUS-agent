import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { dedupTrades } from './src/mdve/trade-dedup.js';
import { floorSetupsToDedupRows } from './src/pipeline/mdve-stage.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m')),
};
const dxySetups = generateSourceSetupsV45(models.DXY);
const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
    weekStartMs: WEEK_START_MS, anchorMs: ANCHOR_MS,
  });
}
const e2 = await buildE2Core(models, priorStorylines);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = cascadeV45(dxySetups, models, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
});
const activeMirrors = [...cascade.eu, ...cascade.gu].filter(m => m.status === 'ACTIVE');
const rows = floorSetupsToDedupRows(dxySetups, activeMirrors);
console.log(`=== ROWS (${rows.length}) ===`);
for (const r of rows) {
  console.log(`${r.pair} ${r.direction.padEnd(5)} ${r.entry} ${r.sl} ${r.tp} | ${r.setupId}`);
}
const dedup = dedupTrades(rows);
console.log(`\n=== UNIQUE TRADES (${dedup.uniqueTrades.length}) ===`);
for (const t of dedup.uniqueTrades.filter(t => t.pair === 'DXY')) {
  console.log(`${t.pair} ${t.direction.padEnd(5)} ${t.entry} ${t.sl} ${t.tp} | ${t.setupId}`);
}
