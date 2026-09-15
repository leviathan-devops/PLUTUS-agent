import { buildChartModel } from './src/mdve/index.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import { computeMirrorTP, computeLmvTP, computeMirrorSL, proxyAtr1hPips, LAW7_SL_BUFFER_PIPS } from './src/mdve/mirror.js';
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

// Mon deep-dip structure 100_779
const lmvMon = model.lmv.table.find(z => Math.abs(z.center-100.85)<1e-9)!;
const anchorMon: any = { id:'x', type:'DEMAND', top:100.853, bottom:100.779, timeframe:'1H', classification:'MoM', formationMs: 1783087200000, freshness:'FRESH', reactionEvents:[], zfp:70, confluence:0 };
console.log('=== MON LONG golden E≈100.940 (shelf defendedEdge) ===');
for (const E of [100.940, 100.945]) {
  const sl = computeSL_LMV(E, lmvMon, 'LONG', model.lmv.table, 'DXY', { atrPips: atr, weekExtreme: model.lmv.coverage.minPrice });
  const tp = computeMirrorTP(E, sl.sl, anchorMon, 'LONG', model.ladder, pip, { passThroughWeakWalls: true });
  console.log(`  E=${E.toFixed(3)}: SL=${sl.sl.toFixed(3)} (${sl.distPips.toFixed(1)}p ${sl.method}) | TP=${tp?tp.tp.toFixed(3):'null'} (${tp?.rungId}) | RRR=${tp?(Math.abs(tp.tp-E)/Math.abs(E-sl.sl)).toFixed(2):'n/a'}`);
}

// Wed 100_935 structure
const lmvWed = model.lmv.table.find(z => Math.abs(z.center-100.95)<1e-9 && Math.abs(z.bottom-100.936)<1e-9)!;
const anchorWed: any = { id:'x', type:'DEMAND', top:100.996, bottom:100.935, timeframe:'1H', classification:'MoM', formationMs: 1783443600000, freshness:'FRESH', reactionEvents:[], zfp:70, confluence:0 };
console.log('=== WED LONG golden E≈100.972-100.975 (rung top) ===');
for (const E of [100.972, 100.975]) {
  const sl = computeSL_LMV(E, lmvWed, 'LONG', model.lmv.table, 'DXY', { atrPips: atr, weekExtreme: model.lmv.coverage.minPrice });
  const tp = computeMirrorTP(E, sl.sl, anchorWed, 'LONG', model.ladder, pip, { passThroughWeakWalls: true });
  console.log(`  E=${E.toFixed(3)}: SL=${sl.sl.toFixed(3)} (${sl.distPips.toFixed(1)}p ${sl.method}) | TP=${tp?tp.tp.toFixed(3):'null'} (${tp?.rungId}) | RRR=${tp?(Math.abs(tp.tp-E)/Math.abs(E-sl.sl)).toFixed(2):'n/a'}`);
}

// What TP gives RRR>=3.0 at each golden entry? Find computeLmvTP output too.
console.log('\n=== computeLmvTP (the LMV TP walk) ===');
for (const E of [100.940, 100.945, 100.972, 100.975]) {
  const sl = computeSL_LMV(E, (E<100.95?lmvMon:lmvWed), 'LONG', model.lmv.table, 'DXY', { atrPips: atr, weekExtreme: model.lmv.coverage.minPrice });
  const tp2 = computeLmvTP(E, sl.sl, 'LONG', model, 'DXY', pip);
  console.log(`  E=${E.toFixed(3)}: SL=${sl.sl.toFixed(3)} | TP(lmv)=${tp2?tp2.tp.toFixed(3):'null'} (${tp2?.rungId}) | RRR=${tp2?(Math.abs(tp2.tp-E)/Math.abs(E-sl.sl)).toFixed(2):'n/a'}`);
}
