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

console.log('=== DXY ALL zones ===');
for (const z of models.DXY!.zones) {
  console.log(`  ${z.id} ${z.type} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
console.log('=== DXY ALL rungs 100.8-101.4 ===');
for (const r of models.DXY!.lmv.table.filter((r) => r.bottom >= 100.85 && r.top <= 101.35)) {
  console.log(`  LMV|DXY|${r.center.toFixed(5)} ${r.side} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] zfp ${r.zfp}`);
}
console.log('=== GU rungs 1.3325-1.3345 ===');
for (const r of models['GBP/USD']!.lmv.table.filter((r) => r.bottom >= 1.3320 && r.top <= 1.3348)) {
  console.log(`  LMV|GBP/USD|${r.center.toFixed(5)} ${r.side} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] zfp ${r.zfp}`);
}
console.log('=== GU DEMAND zones ===');
for (const z of models['GBP/USD']!.zones.filter((z) => z.type === 'DEMAND')) {
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.reactionEvents?.length ?? 0}ev`);
}
