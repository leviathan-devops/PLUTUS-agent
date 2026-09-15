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

// Deep-dip Mon structure
const s = { kind:'ORDER_BLOCK', id:'DXY|1H|1783087200000|100.779', direction:'LONG', top:100.853, bottom:100.779, timeframe:'1H', classification:'MoM', zfp:70, events:[] };
const wantType = 'DEMAND';
const candlesOf = (z:any) => { const c=centerOf(z.id); const row=model.lmv.table.find(r=>Math.abs(r.center-c)<1e-9); return row?row.candles.length:0; };

// Current: fully inside
const fullyInside = model.zones.filter(z => z.id.startsWith('LMV|') && z.type===wantType && z.bottom >= s.bottom-1e-9 && z.top <= s.top+1e-9);
console.log('=== FULLY INSIDE pool for deep-dip [100.779-100.853] ===');
for (const z of fullyInside) console.log(`  ${z.id} band=[${z.bottom},${z.top}] candles=${candlesOf(z)}`);

// Extended: add rungs sitting above the anchor
const above = model.zones.filter(z => z.id.startsWith('LMV|') && z.type===wantType && z.bottom >= s.top - 1e-9 && z.top > s.top);
console.log('=== SITTING ABOVE pool (rung.bottom >= anchor.top 100.853) ===');
for (const z of above) console.log(`  ${z.id} band=[${z.bottom},${z.top}] candles=${candlesOf(z)}`);

// The extended pool sort: candles desc, |center - sweepEdge|, bottom, id
const sweepEdge = 100.779;
const ext = [...fullyInside, ...above];
const rung = [...ext].sort((a,b) =>
  (candlesOf(b)-candlesOf(a)) ||
  (q(Math.abs(centerOf(a.id)-sweepEdge))-q(Math.abs(centerOf(b.id)-sweepEdge))) ||
  (a.bottom-b.bottom) ||
  (a.id<b.id?-1:1))[0]!;
console.log('\nExtended pool winner:', rung.id, 'band=[',rung.bottom,',',rung.top,'] candles=',candlesOf(rung),' defEdge=', model.lmv.table.find(r=>Math.abs(r.center-centerOf(rung.id))<1e-9)?.defendedEdge);
console.log('Current winner (fully inside only):');
const cur = [...fullyInside].sort((a,b) =>
  (candlesOf(b)-candlesOf(a)) ||
  (q(Math.abs(centerOf(a.id)-sweepEdge))-q(Math.abs(centerOf(b.id)-sweepEdge))) ||
  (a.bottom-b.bottom) || (a.id<b.id?-1:1))[0]!;
console.log(' ', cur.id, 'candles=', candlesOf(cur));
