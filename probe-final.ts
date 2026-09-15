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
const shapeCandlesOf = (id:string, day:string)=>{ const c=centerOf(id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.candles.filter(x=>new Date(x.timestamp).toISOString().slice(0,10)===day).length:0; };

// Determine the day's recovery high from the structure's battle events on the candidate day.
// For the deep-dip, candidate battles Monday (07-06). What is Monday's high?
const monHigh = Math.max(...barsFor('DXY','1H').filter(b=>new Date(b.timestamp).toISOString().slice(0,10)==='2026-07-06').map(b=>b.high));
const tueHigh = Math.max(...barsFor('DXY','1H').filter(b=>new Date(b.timestamp).toISOString().slice(0,10)==='2026-07-07').map(b=>b.high));
console.log('Mon high:', monHigh.toFixed(3), 'Tue high:', tueHigh.toFixed(3));

// Design: the recovery-shelf = the rung sitting above the anchor (band.bottom >= s.top)
// within the day's recovery reach (band.top <= dayRecoveryHigh), selected by the HIGHEST defendedEdge.
function recoveryShelf(s:{top:number;bottom:number}, dayHigh:number) {
  const pool = model.zones.filter(z =>
    z.id.startsWith('LMV|') && z.type==='DEMAND' &&
    z.bottom >= s.top - 1e-9 &&      // sits above the anchor (no overlap)
    z.top <= dayHigh + 1e-9);         // within the day's recovery reach
  if (pool.length===0) return null;
  // pick the rung with the highest defendedEdge the day reached
  const best = [...pool].sort((a,b) => defEdgeOf(b.id)-defEdgeOf(a.id) || candlesOf(b.id)-candlesOf(a.id) || (a.id<b.id?-1:1))[0]!;
  return { id:best.id, defEdge:defEdgeOf(best.id), candles:candlesOf(best.id), band:`[${best.bottom.toFixed(3)},${best.top.toFixed(3)}]` };
}
console.log('\nDeep-dip Mon [100.779-100.853], Mon high:', JSON.stringify(recoveryShelf({top:100.853,bottom:100.779}, monHigh)));
// But we must NOT affect Tue 100_803 (in-week). Check what it would get if extension applied:
console.log('Tue 100_803 [100.803-100.908] (should stay 100.842):', JSON.stringify(recoveryShelf({top:100.908,bottom:100.803}, tueHigh)));
