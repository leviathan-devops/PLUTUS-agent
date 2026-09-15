import { buildChartModel } from './src/mdve/index.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import { computeMirrorTP, proxyAtr1hPips } from './src/mdve/mirror.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), 101.24, undefined, barsFor('DXY','15m'));
const pip = 0.01;
const atr = proxyAtr1hPips(model, pip);
const lmvWed = model.lmv.table.find(z=>Math.abs(z.center-100.95)<1e-9 && Math.abs(z.bottom-100.936)<1e-9)!;
const anchor: any = { id:'x', type:'DEMAND', top:100.996, bottom:100.935, timeframe:'1H', classification:'MoM', formationMs:1783443600000, freshness:'FRESH', reactionEvents:[], zfp:70, confluence:0 };

console.log('=== WED LONG raw geometry vs entry (SL via computeSL_LMV, TP via mirror) ===');
for (const E of [100.960,100.965,100.968,100.970,100.972,100.975,100.978]) {
  const sl = computeSL_LMV(E, lmvWed, 'LONG', model.lmv.table, 'DXY', { atrPips:atr, weekExtreme: model.lmv.coverage.minPrice });
  const tp = computeMirrorTP(E, sl.sl, anchor, 'LONG', model.ladder, pip, { passThroughWeakWalls:true });
  const rrr = tp ? Math.abs(tp.tp-E)/Math.abs(E-sl.sl) : NaN;
  console.log(`  E=${E.toFixed(3)}: SL=${sl.sl.toFixed(3)}(${sl.distPips.toFixed(1)}p) TP=${tp?tp.tp.toFixed(3):'null'} RRR=${rrr.toFixed(2)} ${rrr>=3.0?'PASS':''}`);
}
