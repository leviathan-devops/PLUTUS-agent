import { buildChartModel } from './src/mdve/index.js';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';

const ANCHOR_MS = 1783317600000;
lockAnalysisPoint(ANCHOR_MS);
const WEEK = '2026-07-06';

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= limitMs).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

const models: Record<string, ChartModel | null> = {
  DXY: await buildChartModel('DXY', WEEK, barsFor('DXY', '1H', ANCHOR_MS), barsFor('DXY', '4H', ANCHOR_MS), barsFor('DXY', '30m', ANCHOR_MS), spotFor('DXY', ANCHOR_MS), undefined, barsFor('DXY', '15m', ANCHOR_MS)),
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H', ANCHOR_MS), barsFor('EUR/USD', '4H', ANCHOR_MS), barsFor('EUR/USD', '30m', ANCHOR_MS), spotFor('EUR/USD', ANCHOR_MS), undefined, barsFor('EUR/USD', '15m', ANCHOR_MS)),
  'GBP/USD': await buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H', ANCHOR_MS), barsFor('GBP/USD', '4H', ANCHOR_MS), barsFor('GBP/USD', '30m', ANCHOR_MS), spotFor('GBP/USD', ANCHOR_MS), undefined, barsFor('GBP/USD', '15m', ANCHOR_MS)),
};

console.log('=== DXY DEMAND zones around 100.9-101.2 ===');
for (const z of models.DXY!.zones.filter((z) => z.type === 'DEMAND' && z.bottom >= 100.8 && z.top <= 101.3)) {
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
console.log('=== DXY SUPPLY zones around 101.0-101.2 ===');
for (const z of models.DXY!.zones.filter((z) => z.type === 'SUPPLY' && z.bottom >= 100.9 && z.top <= 101.3)) {
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
console.log('=== GU rungs 1.33-1.34 ===');
for (const r of models['GBP/USD']!.lmv.table.filter((r) => r.bottom >= 1.33000 && r.top <= 1.34000)) {
  console.log(`  LMV|GBP/USD|${r.center.toFixed(5)} ${r.side} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] zfp ${r.zfp}`);
}
console.log('=== GU SUPPLY zones around 1.335-1.34 ===');
for (const z of models['GBP/USD']!.zones.filter((z) => z.type === 'SUPPLY' && z.bottom >= 1.334 && z.top <= 1.340)) {
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
console.log('=== EU DEMAND zones 1.140-1.145 (the fortress + internals) ===');
for (const z of models['EUR/USD']!.zones.filter((z) => z.type === 'DEMAND' && z.bottom >= 1.1395 && z.top <= 1.145)) {
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
console.log('=== EU rungs (BUY_SIDE) around 1.140-1.143 ===');
for (const r of models['EUR/USD']!.lmv.table.filter((r) => r.side === 'BUY_SIDE' && r.bottom >= 1.1395 && r.top <= 1.1430)) {
  console.log(`  LMV|EUR/USD|${r.center.toFixed(5)} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] zfp ${r.zfp}`);
}
console.log('=== EU rungs (SELL_SIDE) around 1.1435-1.1450 ===');
for (const r of models['EUR/USD']!.lmv.table.filter((r) => r.side === 'SELL_SIDE' && r.bottom >= 1.1435 && r.top <= 1.1450)) {
  console.log(`  LMV|EUR/USD|${r.center.toFixed(5)} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] zfp ${r.zfp}`);
}
