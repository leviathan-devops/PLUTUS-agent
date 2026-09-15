// THE C-2 RUNG PROBE — the LMV matrix entry for the DXY 100.95000 rung
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { computeLmvTP } from './src/mdve/mirror.js';
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
  const table = (model.lmv as unknown as { table: Array<Record<string, unknown>> }).table;
  const target = table.filter((r) => Math.abs(Number(r.center) - 100.95) < 0.02);
  console.log('matrix entries center~100.95: ' + target.length);
  for (const r of target.slice(0, 6)) {
    console.log(`  center=${r.center} band=[${r.bottom},${r.top}] defendedEdge=${r.defendedEdge} zfp=${r.zfp} side=${r.side}`);
  }
  // the TP compute for the DXY SHORT E 101.120 SL 101.169
  try {
    const tp = computeLmvTP(101.120, 101.169, 'SHORT', model, 'DXY', 0.01, { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: true }, undefined);
    console.log('computeLmvTP(SHORT E101.120 SL101.169) ->', JSON.stringify(tp));
  } catch (e) { console.log('computeLmvTP ERR', String(e).slice(0, 200)); }
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
