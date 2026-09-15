import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));

// The deep-dip Mon structure battles Mon TOKYO (07-06 00:00Z). What rungs above the anchor
// [100.779,100.853] did MONDAY's price reach? i.e., rungs with candles on 07-06.
console.log('=== LMV DEMAND rungs with candles on Monday 07-06 (the day the deep-dip battled) ===');
const mondayCandles: Array<{rung:string; band:string; day:number; o:number;h:number;l:number;c:number}> = [];
for (const z of model.lmv.table.filter(x=>x.side==='BUY_SIDE')) {
  for (const c of z.candles) {
    const day = new Date(c.timestamp).toISOString().slice(0,10);
    if (day === '2026-07-06') mondayCandles.push({rung:z.center.toFixed(3), band:`[${z.bottom.toFixed(3)},${z.top.toFixed(3)}]`, day:c.timestamp, o:c.open,h:c.high,l:c.low,c:c.close});
  }
}
mondayCandles.sort((a,b)=>a.day-b.day);
for (const m of mondayCandles) console.log(`  rung=${m.rung} band=${m.band} ${new Date(m.day).toISOString().slice(0,16)}Z O=${m.o.toFixed(3)} H=${m.h.toFixed(3)} L=${m.l.toFixed(3)} C=${m.c.toFixed(3)}`);
