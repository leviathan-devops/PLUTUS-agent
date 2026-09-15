import { buildChartModel } from './src/mdve/index.js';
import { pillarEngine } from './src/brains/9-pillar-lobe.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import { computeMirrorTP, computeLmvTP, proxyAtr1hPips } from './src/mdve/mirror.js';
import { refineSetup } from './src/mdve/refinement-machine.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
function buildModel(withIP:boolean) {
  const m = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
  if (withIP) {
    const pr = pillarEngine({ instrument: 'DXY', bars: barsFor('DXY','1H'), currentPrice: m.spot });
    const zfp = (c:number)=> c>=12?10:c>=10?20:c>=8?30:c>=6?40:c>=4?55:65;
    const ipZones = pr.levels.filter(l=> !(l.source.includes('→DXY')||l.source.startsWith('P8-StrikeDXY'))).map(l => {
      const isSupply = l.price > m.spot;
      return { id: `IP|DXY|${l.price.toFixed(5)}`, type: isSupply?'SUPPLY':'DEMAND', top: l.price + 0.01*10, bottom: l.price, timeframe:'1H', classification:'MoM', formationMs: ANCHOR_MS, freshness:'FRESH', reactionEvents: [], zfp: zfp(pr.compositeScore), confluence: pr.compositeScore, source:'PILLAR' };
    });
    m.zones = [...m.zones, ...ipZones as any];
  }
  return m;
}

// sourceLaneShapeDayFor replica for the Wed LONG (direction LONG, entry ~100.972)
function shapeDayFor(direction:'LONG'|'SHORT', entry:number, model:any, pair:string): any {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const q = (n:number)=>Math.round(n*1e6)/1e6;
  const centers = (id:string)=>{const m=/([0-9.]+)$/.exec(id);return m?Number(m[1]):0;};
  const fire = model.zones
    .filter(z => (z as any).source !== 'PILLAR' && z.type===wantType && z.freshness!=='VIOLATED' && (direction==='LONG'?z.bottom>entry+1e-9:z.top<entry-1e-9))
    .map(z => ({ fire:z, internal: model.zones.filter(r => r.id.startsWith('LMV|') && r.type===wantType && r.bottom>=z.bottom-1e-9 && r.top<=z.top+1e-9) }))
    .filter(c=>c.internal.length>0)
    .sort((a,b)=>(a.fire.classification==='BoM'?0:1)-(b.fire.classification==='BoM'?0:1) || a.fire.zfp-b.fire.zfp || q(Math.abs(a.fire.bottom-entry))-q(Math.abs(b.fire.bottom-entry)) || a.fire.bottom-b.fire.bottom)[0];
  if (!fire) return undefined;
  const nearEdge = direction==='LONG'?fire.fire.bottom:fire.fire.top;
  const earth = [...fire.internal].sort((a,b)=>
    q(Math.abs(centers(a.id)-nearEdge))-q(Math.abs(centers(b.id)-nearEdge)) ||
    q(Math.abs((direction==='LONG'?a.bottom:a.top)-nearEdge))-q(Math.abs((direction==='LONG'?b.bottom:b.top)-nearEdge)) ||
    a.bottom-b.bottom || (a.id<b.id?-1:1))[0]!;
  return { supplyZonePrice: direction==='LONG'?centers(earth.id):null, demandZonePrice: direction==='SHORT'?centers(earth.id):null, supplyZoneId: direction==='LONG'?`${pair}|LMV|${centers(earth.id).toFixed(5)}`:null, demandZoneId: direction==='SHORT'?`${pair}|LMV|${centers(earth.id).toFixed(5)}`:null };
}

for (const withIP of [false, true]) {
  const model = buildModel(withIP);
  const pip = 0.01;
  const atr = proxyAtr1hPips(model, pip);
  const E = 100.972;
  const lmvWed = model.lmv.table.find(z=>Math.abs(z.center-100.95)<1e-9 && Math.abs(z.bottom-100.936)<1e-9)!;
  const sl = computeSL_LMV(E, lmvWed, 'LONG', model.lmv.table, 'DXY', { atrPips:atr, weekExtreme: model.lmv.coverage.minPrice });
  const sd = shapeDayFor('LONG', E, model, 'DXY');
  console.log(`\n=== ${withIP?'IP model':'plain model'} ===`);
  console.log(`SL=${sl.sl.toFixed(3)} (${sl.method}) TPmirror=${(computeMirrorTP(E,sl.sl,{top:100.996,bottom:100.935} as any,'LONG',model.ladder,pip,{passThroughWeakWalls:true})??{tp:NaN}).tp} RRR_mirror=${(Math.abs(101.207-E)/Math.abs(E-sl.sl)).toFixed(2)}`);
  console.log(`shapeDay supplyZonePrice=${sd?.supplyZonePrice?.toFixed(3) ?? 'none'} supplyZoneId=${sd?.supplyZoneId ?? 'none'}`);
  const tpShape = sd;
  const tpLmv = computeLmvTP(E, sl.sl, 'LONG', model, 'DXY', pip, undefined, tpShape as any);
  console.log(`TP(lmv+shape)=${tpLmv?tpLmv.tp.toFixed(3):'null'} rung=${tpLmv?.rungId} RRR=${tpLmv?(Math.abs(tpLmv.tp-E)/Math.abs(E-sl.sl)).toFixed(2):'n/a'}`);
}
