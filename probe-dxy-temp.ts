/**
 * PROBE (TEMP — deleted after use): DXY lmv.table rungs near the 7 golden levels.
 * Confirms the 0.5-pip width gate + the 2p id-center gate never reject a golden rung.
 */
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor } from './src/mdve/temporal.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const raw = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string) =>
  (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b: any) => b.timestamp <= ANCHOR_MS).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spot = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };

const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spot('DXY'), undefined, barsFor('DXY','15m'));

const pip = 0.01;
const GOLDEN = [100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240];
console.log('DXY golden levels vs nearest rungs:');
for (const lvl of GOLDEN) {
  let best: any = null; let bd = Infinity;
  for (const z of dxy.lmv.table) {
    const d = Math.abs(z.center - lvl);
    if (d < bd) { bd = d; best = z; }
  }
  if (best) {
    const widthPips = (best.top - best.bottom) / pip;
    const bandC = (best.bottom + best.top) / 2;
    const idToBandC = Math.abs(best.center - bandC) / pip;
    console.log(`  ${lvl.toFixed(3)} -> rung ${best.center.toFixed(3)} d${(bd/pip).toFixed(1)}p width ${widthPips.toFixed(2)}p [${best.bottom.toFixed(3)}-${best.top.toFixed(3)}] idToBandC ${idToBandC.toFixed(1)}p | widthOK=${widthPips>=0.5} idOK=${idToBandC<=2}`);
  }
}
console.log(`Total DXY rungs: ${dxy.lmv.table.length}`);
console.log(`DXY spot: ${dxy.spot}`);
