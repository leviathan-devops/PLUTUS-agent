import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));

// SUPPLY zones above the Wed entry 100.972 with internal LMV rungs
const entry = 100.972;
const wantType = 'SUPPLY';
const q = (n:number)=>Math.round(n*1e6)/1e6;
const centers = (id:string)=>{ const m=/([0-9.]+)$/.exec(id); return m?Number(m[1]):0; };
console.log('=== SUPPLY zones beyond entry with internal LMV rungs (sourceLaneShapeDayFor fire pool) ===');
const fires = model.zones
  .filter(z => (z as any).source !== 'PILLAR' && z.type===wantType && z.freshness!=='VIOLATED' && z.bottom > entry + 1e-9)
  .map(z => ({ fire: z, internal: model.zones.filter(r => r.id.startsWith('LMV|') && r.type===wantType && r.bottom >= z.bottom-1e-9 && r.top <= z.top+1e-9) }))
  .filter(c => c.internal.length > 0)
  .sort((a,b) => (a.fire.classification==='BoM'?0:1)-(b.fire.classification==='BoM'?0:1) || a.fire.zfp-b.fire.zfp || q(Math.abs(a.fire.bottom-entry))-q(Math.abs(b.fire.bottom-entry)) || a.fire.bottom-b.fire.bottom);
for (const c of fires) {
  const nearEdge = c.fire.bottom;
  const earth = [...c.internal].sort((a,b) =>
    q(Math.abs(centers(a.id)-nearEdge))-q(Math.abs(centers(b.id)-nearEdge)) ||
    q(Math.abs(a.bottom-nearEdge))-q(Math.abs(b.bottom-nearEdge)) || a.bottom-b.bottom || (a.id<b.id?-1:1))[0]!;
  console.log(`  fire=${c.fire.id} cls=${c.fire.classification} band=[${c.fire.bottom.toFixed(3)},${c.fire.top.toFixed(3)}] zfp=${c.fire.zfp} | earth=${earth.id} earthCenter=${centers(earth.id).toFixed(3)} earthBand=[${earth.bottom.toFixed(3)},${earth.top.toFixed(3)}]`);
}
