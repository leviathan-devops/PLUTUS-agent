// THE C-2 DXY CONFLICT PROBE — the rungs + their containers near the DXY Monday
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
  const pair = 'DXY';
  const model = await buildChartModel(pair, WEEK, gateBars(barsFor(pair, '1H')), gateBars(barsFor(pair, '4H')), gateBars(barsFor(pair, '30m')), spotFor(pair), undefined, gateBars(barsFor(pair, '15m')));
  // the rungs above the open 101.048 with their final types
  const open = 101.048;
  const rungs = model.zones.filter((z: any) => z.id.startsWith('LMV|') && z.id.includes('101.13000'));
  console.log('LMV rungs above ' + open + ' (' + rungs.length + '):');
  for (const z of rungs.slice(0, 20)) {
    // find the narrowest non-LMV container
    const containers = model.zones.filter((c: any) => !String(c.id).startsWith('LMV|') && z.bottom >= c.bottom - 1e-9 && z.top <= c.top + 1e-9)
      .sort((a: any, b: any) => (a.top - a.bottom) - (b.top - b.bottom));
    const c = containers[0];
    const wPips = (z.top - z.bottom) / 0.01;
    console.log(`  ${z.id} [${z.bottom},${z.top}] w=${wPips.toFixed(1)}p type=${z.type} side=${z.side} zfp=${z.zfp} container=${c ? c.id + ' [' + c.bottom + ',' + c.top + '] ' + c.type : 'NONE'}`);
  }
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
