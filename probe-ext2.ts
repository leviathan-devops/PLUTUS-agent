import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const q = (n:number)=>Math.round(n*1e6)/1e6;
const centerOf = (id:string)=>{const m=/([0-9.]+)$/.exec(id);return m?Number(m[1]):0;};
const candlesOf = (id:string) => { const c=centerOf(id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.candles.length:0; };
const defEdgeOf = (id:string) => { const c=centerOf(id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.defendedEdge:0; };

// Deep-dip Mon structure
const s = { kind:'ORDER_BLOCK', id:'DXY|1H|1783087200000|100.779', direction:'LONG', top:100.853, bottom:100.779 };
const wantType = 'DEMAND';
// Extended pool: rungs whose bands overlap-or-sit-above the anchor, within day's recovery reach.
// "within the day's recovery reach" = the rung's top <= the day's HIGH. For Monday, day high ~100.97? Actually Mon high was 101.145 (10:00Z). Let's use the structure battle-day high.
// Simpler interpretation per task: "the rungs whose bands overlap-or-sit-above the anchor". For the deep-dip, rung.bottom >= s.top (sits above) OR overlap.
const overlapAbove = model.zones.filter(z =>
  z.id.startsWith('LMV|') && z.type===wantType &&
  z.top >= s.bottom - 1e-9 && z.bottom >= s.bottom - 1e-9 && // not fully below
  z.top > s.top - 1e-9); // top above anchor's top (overlap or sit-above)
console.log('=== Extended pool (overlap-or-sit-above) for deep-dip [100.779-100.853] ===');
const seen = new Set<string>();
for (const z of overlapAbove) {
  if (seen.has(z.id)) continue; seen.add(z.id);
  console.log(`  ${z.id} band=[${z.bottom.toFixed(3)},${z.top.toFixed(3)}] candles=${candlesOf(z.id)} defEdge=${defEdgeOf(z.id)}`);
}
// Sort by candles desc, then |center - sweepEdge| (s.bottom=100.779), then bottom, id
const sweepEdge = 100.779;
const rung = [...overlapAbove].sort((a,b) =>
  (candlesOf(b.id)-candlesOf(a.id)) ||
  (q(Math.abs(centerOf(a.id)-sweepEdge))-q(Math.abs(centerOf(b.id)-sweepEdge))) ||
  (a.bottom-b.bottom) || (a.id<b.id?-1:1))[0]!;
console.log('\nWinner:', rung.id, 'band=[',rung.bottom,',',rung.top,'] candles=',candlesOf(rung.id),'defEdge=',defEdgeOf(rung.id));
console.log('Entry (defendedEdge, per task: recovery shelf → defendedEdge):', defEdgeOf(rung.id));
console.log('Entry (near edge, old behavior):', rung.top);
