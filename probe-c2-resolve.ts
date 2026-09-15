// THE C-2 RESOLVE PROBE — what resolveOperativeZone returns for the E2's DXY demand id
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { resolveOperativeZone } from './src/mdve/reasoning-chain.js';
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
  // the LMV rungs near 100.95 in the model's zone list (the DXYZone form)
  const rungs = (model.lmv as unknown as { table: Array<{ center: number; bottom: number; top: number; side: string; zfp: number }> }).table
    .filter((r) => Math.abs(r.center - 100.95) < 0.2);
  console.log('LMV rungs near 100.95 (' + rungs.length + '):');
  for (const r of rungs.slice(0, 10)) console.log(`  center=${r.center} [${r.bottom},${r.top}] side=${r.side} zfp=${r.zfp}`);
  for (const id of ['LMV|DXY|100.95000', 'LMV|DXY|100.86000', 'LMV|DXY|100.94000']) {
    const op = resolveOperativeZone(model, pair, id);
    console.log(`resolveOperativeZone('${id}') ->`, op ? `[${op.floor},${op.ceiling}] id=${op.id}` : 'NULL');
  }
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
