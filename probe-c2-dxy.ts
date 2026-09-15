// THE C-2 PROBE — re-walk the DXY Monday designation, print the candidates
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { buildShapeBrain } from './report-v452.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
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
  const priorStorylines: Record<string, unknown> = {};
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
    weekStartMs: 1783296000000, anchorMs: ANCHOR_MS,
  });
  const snap = await buildShapeBrain(pair, model, priorStorylines[pair] as never);
  const dec = snap?.shapeChain.dayDecomposition ?? [];
  const mon = dec[0];
  if (!mon) { console.log('NO MONDAY'); return; }
  console.log('DXY Monday: shape=' + mon.shape + ' dir=' + mon.direction + ' open=' + mon.dayOpenSpot?.toFixed(5) + ' key=' + (mon.keyZoneId ?? 'none'));
  console.log('  S=' + (mon.supplyZoneId ?? '-') + ' D=' + (mon.demandZoneId ?? '-') + ' KT=' + (mon.keyZoneType ?? '-'));
  console.log('  band=[' + mon.floor + ',' + mon.ceiling + ']');
  // the golden supply zones near 101.0-101.3
  const near = model.zones.filter((z: any) => z.top > 101.0 && z.bottom < 101.35);
  console.log('  ZONES 101.0-101.35 (' + near.length + '):');
  for (const z of near.slice(0, 25)) console.log(`    ${z.id} [${z.bottom},${z.top}] type=${z.type} zfp=${z.zfp} cl=${z.classification} fr=${z.freshness}`);
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
