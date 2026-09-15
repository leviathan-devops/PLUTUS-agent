import { buildChartModel } from './src/mdve/index.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import { computeMirrorTP, computeLmvTP, proxyAtr1hPips } from './src/mdve/mirror.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const pip = 0.01;
const atr = proxyAtr1hPips(model, pip);
console.log('ATR pips:', atr.toFixed(2));
const lmvZone = model.lmv.table.find(z => Math.abs(z.center-100.95)<1e-9 && Math.abs(z.bottom-100.936)<1e-9)!;
console.log('lmvZone for 100_935:', lmvZone ? `c=${lmvZone.center} defEdge=${lmvZone.defendedEdge} rxExt=${lmvZone.reactionExtreme}` : 'not found');
const anchor: any = { id:'x', type:'DEMAND', top:100.996, bottom:100.935, timeframe:'1H', classification:'MoM', formationMs: 1783443600000, freshness:'FRESH', reactionEvents:[], zfp:70, confluence:0 };
for (const E of [100.972, 100.975]) {
  const sl = computeSL_LMV(E, lmvZone, 'LONG', model.lmv.table, 'DXY', { atrPips: atr, weekExtreme: model.lmv.coverage.minPrice });
  console.log(`\nE=${E.toFixed(3)}: SL=${sl.sl.toFixed(3)} method=${sl.method} dist=${sl.distPips.toFixed(1)}p`);
  const tp = computeMirrorTP(E, sl.sl, anchor, 'LONG', model.ladder, pip, { passThroughWeakWalls: true });
  console.log(`  TP(mirror)=${tp ? tp.tp.toFixed(3) : 'null'} rung=${tp?.rungId}`);
  const tp2 = computeLmvTP(E, sl.sl, 'LONG', model, 'DXY', pip);
  console.log(`  TP(lmv)=${tp2 ? tp2.tp.toFixed(3) : 'null'} rung=${tp2?.rungId}`);
  if (tp) console.log(`  RRR(mirror)=${(Math.abs(tp.tp-E)/Math.abs(E-sl.sl)).toFixed(2)}`);
  if (tp2) console.log(`  RRR(lmv)=${(Math.abs(tp2.tp-E)/Math.abs(E-sl.sl)).toFixed(2)}`);
}
