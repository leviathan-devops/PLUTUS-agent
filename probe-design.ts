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
const q = (n:number)=>Math.round(n*1e6)/1e6;
const centerOf = (id:string)=>{const m=/([0-9.]+)$/.exec(id);return m?Number(m[1]):0;};
const defEdgeOf = (id:string)=>{ const c=centerOf(id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.defendedEdge:NaN; };
const candlesOf = (id:string)=>{ const c=centerOf(id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.candles.length:0; };

// The day's recovery reach for a LONG: the rungs the day's price actually reached.
// For the deep-dip Mon [100.779-100.853] battling Monday, Monday's price reached the shelf.
// The "recovery shelf" = the strongest LMV DEMAND rung whose band SITS ABOVE the anchor (rung.bottom >= s.top)
// and is within the day's recovery reach (rung.top <= the day's high). For Monday, day high ~100.97 (the shelf).
// But we need to bound to the shelf, not higher rungs. Let's define recovery reach as <= the day's consolidation high (~100.97 = Monday's 03:00Z high 100.978).

function recoveryShelfEntry(s:{top:number;bottom:number}, dayMax:number) {
  const pool = model.zones.filter(z =>
    z.id.startsWith('LMV|') && z.type==='DEMAND' &&
    z.top <= dayMax + 1e-9 &&          // within the day's recovery reach
    z.bottom >= s.top - 1e-9);         // sits above the anchor (no overlap)
  if (pool.length===0) return null;
  const sweepEdge = s.bottom;
  const rung = [...pool].sort((a,b) =>
    (candlesOf(b.id)-candlesOf(a.id)) ||
    (q(Math.abs(centerOf(a.id)-sweepEdge))-q(Math.abs(centerOf(b.id)-sweepEdge))) ||
    (a.bottom-b.bottom) || (a.id<b.id?-1:1))[0]!;
  return { id:rung.id, defEdge:defEdgeOf(rung.id), candles:candlesOf(rung.id), band:`[${rung.bottom.toFixed(3)},${rung.top.toFixed(3)}]` };
}
console.log('Deep-dip Mon [100.779-100.853], dayMax=100.978 (Mon shelf high):', recoveryShelfEntry({top:100.853,bottom:100.779}, 100.978));
console.log('Deep-dip Mon, dayMax=101.145 (Mon absolute high):', recoveryShelfEntry({top:100.853,bottom:100.779}, 101.145));
console.log('Tue 100_803 [100.803-100.908], dayMax=101.194 (Tue high):', recoveryShelfEntry({top:100.908,bottom:100.803}, 101.194));
console.log('Tue 100_852 [100.852-100.942], dayMax=101.194 (Tue high):', recoveryShelfEntry({top:100.942,bottom:100.852}, 101.194));
