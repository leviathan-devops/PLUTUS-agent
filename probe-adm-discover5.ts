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
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H', ANCHOR_MS), barsFor('EUR/USD', '4H', ANCHOR_MS), barsFor('EUR/USD', '30m', ANCHOR_MS), spotFor('EUR/USD', ANCHOR_MS), undefined, barsFor('EUR/USD', '15m', ANCHOR_MS)),
};

console.log('=== EU SELL_SIDE rungs 1.13950-1.14250 ===');
for (const r of models['EUR/USD']!.lmv.table.filter((r) => r.side === 'SELL_SIDE' && r.bottom >= 1.13950 && r.top <= 1.14250)) {
  console.log(`  LMV|EUR/USD|${r.center.toFixed(5)} SELL [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] width ${((r.top-r.bottom)/0.0001).toFixed(1)}p`);
}
console.log('=== EU BUY_SIDE rungs 1.13950-1.14250 ===');
for (const r of models['EUR/USD']!.lmv.table.filter((r) => r.side === 'BUY_SIDE' && r.bottom >= 1.13950 && r.top <= 1.14250)) {
  console.log(`  LMV|EUR/USD|${r.center.toFixed(5)} BUY  [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] width ${((r.top-r.bottom)/0.0001).toFixed(1)}p`);
}
