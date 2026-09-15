// THE C-2 EU ZONE-MAP PROBE — does the golden rung exist in model.zones?
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
  // the LMV zones in model.zones with a center in [1.1435,1.1445]
  const lmv = model.zones.filter((z: any) => z.id.startsWith('LMV|') && Number(z.id.split('|')[2]) > 1.1435 && Number(z.id.split('|')[2]) < 1.1445);
  console.log('LMV zones center in [1.1435,1.1445]: ' + lmv.length);
  for (const z of lmv) console.log(`  ${z.id} [${z.bottom},${z.top}] type=${z.type} zfp=${z.zfp}`);
  // ALL zones whose band overlaps [1.1438,1.1443]
  const overlap = model.zones.filter((z: any) => z.bottom < 1.1443 && z.top > 1.1438);
  console.log('ALL zones overlapping [1.1438,1.1443]: ' + overlap.length);
  for (const z of overlap.slice(0, 12)) console.log(`  ${z.id} [${z.bottom},${z.top}] type=${z.type} zfp=${z.zfp} tf=${z.timeframe}`);
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
