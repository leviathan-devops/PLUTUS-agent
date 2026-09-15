// THE C-2 EU CANDIDATE PROBE — the supplyCands the E2 actually evaluates
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildShapeBrain } from './report-v452.js';
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
  const priorStorylines: Record<string, unknown> = {};
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
    weekStartMs: 1783296000000, anchorMs: ANCHOR_MS,
  });
  const snap = await buildShapeBrain(pair, model, priorStorylines[pair] as never);
  const dec = snap?.shapeChain.dayDecomposition ?? [];
  const mon = dec[0];
  console.log('EU Monday: S=' + (mon?.supplyZoneId ?? '-') + ' D=' + (mon?.demandZoneId ?? '-'));
  // the model zones with type SUPPLY + floor in [1.1423, 1.146]
  const sup = model.zones.filter((z: any) => z.type === 'SUPPLY' && z.bottom >= 1.1423 && z.bottom < 1.146);
  sup.sort((a: any, b: any) => a.bottom - b.bottom);
  console.log('SUPPLY zones floor in [1.1423,1.146] (' + sup.length + '):');
  for (const z of sup) console.log(`  ${z.id} [${z.bottom},${z.top}] zfp=${z.zfp} rs=${z.reactionStatus} type=${z.type}`);
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
