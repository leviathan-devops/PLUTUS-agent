// THE C-2 EU PROBE — the EU Monday supply candidates + sort keys
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
  const pair = 'EUR/USD';
  const model = await buildChartModel(pair, WEEK, gateBars(barsFor(pair, '1H')), gateBars(barsFor(pair, '4H')), gateBars(barsFor(pair, '30m')), spotFor(pair), undefined, gateBars(barsFor(pair, '15m')));
  const open = 1.1423;
  // all supplies with top > open, floor < 1.146
  const sup = model.zones.filter((z: any) => z.type === 'SUPPLY' && z.top > open && z.bottom < 1.146);
  sup.sort((a: any, b: any) => a.bottom - b.bottom);
  console.log('EU SUPPLIES above the open (' + sup.length + '):');
  for (const z of sup.slice(12, 30)) console.log(`  ${z.id} [${z.bottom},${z.top}] zfp=${z.zfp} cl=${z.classification} fr=${z.freshness}`);
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
