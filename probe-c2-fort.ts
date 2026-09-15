// the EU fortress [1.14004,1.14147] internal rungs
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import type { OHLCBar } from './src/mdve/types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000;
const WEEK = '2026-07-06';
lockRunAnchor(ANCHOR_MS);
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS);
const spotFor = (p: string): number => {
  const h1 = barsFor(p, '1H');
  return h1.length ? h1[h1.length - 1]!.close : 0;
};

async function main() {
  const model = await buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H')), gateBars(barsFor('EUR/USD', '4H')), gateBars(barsFor('EUR/USD', '30m')), spotFor('EUR/USD'), undefined, gateBars(barsFor('EUR/USD', '15m')));
  const table = (model.lmv as unknown as { table: Array<Record<string, unknown>> }).table;
  const inside = table.filter((r) => Number(r.bottom) >= 1.14004 - 1e-9 && Number(r.top) <= 1.14147 + 1e-9);
  inside.sort((a, b) => Number(a.center) - Number(b.center));
  console.log('rungs inside the fortress [1.14004,1.14147]: ' + inside.length);
  for (const r of inside) console.log(`  center=${r.center} band=[${r.bottom},${r.top}] side=${r.side} edge=${r.defendedEdge} zfp=${r.zfp}`);
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
