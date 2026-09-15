// PROBE — the Step-1 forensics: dump the EU LONG unique-trade emissions vs the golden 1.14110.
// Reuses the diag-golden-coverage pipeline verbatim (the measurement must match the gate).
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
const dedup = dedupTrades(rows);

const GOLDEN = 1.14110; const PIP = 0.0001;
console.log('=== ALL EU LONG unique-trade emissions (vs golden 1.14110) ===');
for (const t of dedup.uniqueTrades.filter(t => t.pair === 'EUR/USD' && t.direction === 'LONG')) {
  const d = (t.entry - GOLDEN) / PIP;
  console.log(`  ${t.session ?? '??'.padEnd(20)} entry=${t.entry.toFixed(5)}  Δ${d >= 0 ? '+' : ''}${d.toFixed(1)}p  src=${(t as any).source ?? t.strategy ?? ''}`);
}
console.log('--- all SHORT (reference) ---');
for (const t of dedup.uniqueTrades.filter(t => t.pair === 'EUR/USD' && t.direction === 'SHORT')) {
  console.log(`  ${t.session ?? '??'.padEnd(20)} entry=${t.entry.toFixed(5)}  src=${(t as any).source ?? t.strategy ?? ''}`);
}

// ── the GU LONG emissions (appended) ──
console.log('\n=== ALL GU LONG unique-trade emissions ===');
for (const t of dedup.uniqueTrades.filter(t => t.pair === 'GBP/USD' && t.direction === 'LONG')) {
  console.log(`  ${t.session ?? '??'.padEnd(20)} entry=${t.entry.toFixed(5)}  src=${(t as any).source ?? t.strategy ?? ''}`);
}
