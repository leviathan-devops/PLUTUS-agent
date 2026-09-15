import { buildChartModel } from './src/mdve/index.js';
import { computeMirrorSL, computeMirrorTP, proxyAtr1hPips } from './src/mdve/mirror.js';
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

// computeMirrorSL for the Wed 100_935 anchor and Mon deep-dip anchor at golden entries
function mkAnchor(top:number,bottom:number,formationMs:number):any { return { id:'x', type:'DEMAND', top, bottom, timeframe:'1H', classification:'MoM', formationMs, freshness:'FRESH', reactionEvents:[], zfp:70, confluence:0 }; }
const anchorWed = mkAnchor(100.996,100.935,1783443600000);
const anchorMon = mkAnchor(100.853,100.779,1783087200000);

console.log('=== computeMirrorSL (v4.4 frozen SL) ===');
for (const [name,E,anchor] of [['Wed',100.975,anchorWed],['Mon',100.940,anchorMon],['Mon',100.945,anchorMon]] as const) {
  const sl = computeMirrorSL(E, anchor, 'LONG', model.ladder, 'DXY', pip, atr);
  console.log(`  ${name} E=${E}: SL=${sl?sl.sl.toFixed(3):'null'} method=${sl?.method} rung=${sl?.rungId}`);
}

console.log('\n=== Ladder rungs around [100.885-100.918] and the SL candidates ===');
const adverse = model.ladder.filter(r => r.source==='LQZ' && r.top <= 100.975).sort((a,b)=>b.top-a.top);
for (const r of adverse.slice(0,10)) console.log(`  LQZ rung ${r.id} top=${r.top.toFixed(3)} bottom=${r.bottom.toFixed(3)}`);

console.log('\n=== What TP would the Wed LONG get via mirror at E=100.975 SL=100.905? ===');
const tp = computeMirrorTP(100.975, 100.905, anchorWed, 'LONG', model.ladder, pip, { passThroughWeakWalls: true });
console.log(`  TP=${tp?tp.tp.toFixed(3):'null'} rung=${tp?.rungId} RRR=${tp?(Math.abs(tp.tp-100.975)/Math.abs(100.975-100.905)).toFixed(2):'n/a'}`);

console.log('\n=== Mon LONG golden: E=100.940/100.945 SL=100.905 TP=101.115 ===');
const tpMon = computeMirrorTP(100.940, 100.905, anchorMon, 'LONG', model.ladder, pip, { passThroughWeakWalls: true });
console.log(`  TP=${tpMon?tpMon.tp.toFixed(3):'null'} rung=${tpMon?.rungId} RRR=${tpMon?(Math.abs(tpMon.tp-100.940)/Math.abs(100.940-100.905)).toFixed(2):'n/a'}`);
