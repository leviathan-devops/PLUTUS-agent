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

console.log('=== ALL EU rungs (any band touching [1.14004,1.14147], both sides) ===');
const rows = models['EUR/USD']!.lmv.table
  .filter((r) => r.bottom <= 1.14147 && r.top >= 1.14004)
  .sort((a, b) => a.bottom - b.bottom);
for (const r of rows) {
  console.log(`  center ${r.center.toFixed(5)} ${r.side.padEnd(9)} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] width ${((r.top-r.bottom)/0.0001).toFixed(1)}p defEdge ${r.defendedEdge.toFixed(5)} candles ${r.candles.length}`);
}
console.log(`TOTAL: ${rows.length} rungs touching the fortress band`);
