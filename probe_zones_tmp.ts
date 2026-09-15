import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
for (const pair of ['EUR/USD','GBP/USD']) {
  const m = buildChartModel(pair, WEEK, barsFor(pair,'1H'), barsFor(pair,'4H'), barsFor(pair,'30m'), spotFor(pair), undefined, barsFor(pair,'15m'));
  console.log('==== ', pair, ' spot=', spotFor(pair));
  const zones = m.zones as any[];
  console.log('  total zones:', zones.length);
  const lo = pair === 'EUR/USD' ? 1.1400 : 1.3300;
  const hi = pair === 'EUR/USD' ? 1.1700 : 1.3520;
  const lmv = zones.filter(z => String(z.id).startsWith('LMV')).sort((a,b)=>(a as any).center-(b as any).center);
  console.log('  --- LMV rungs in band ('+lmv.filter(z=>(z as any).center>=lo&&(z as any).center<=hi).length+') ---');
  for (const z of lmv) {
    const c = (z as any).center;
    if (c >= lo && c <= hi) {
      console.log('    ', z.id, 'center='+c.toFixed(5), 'floor='+(z as any).floor?.toFixed(5), 'ceil='+(z as any).ceiling?.toFixed(5), 'zfp='+(z as any).zfp);
    }
  }
  const ob = zones.filter(z => !String(z.id).startsWith('LMV')).sort((a,b)=>(a as any).floor-(b as any).floor);
  console.log('  --- OB/1H/4H zones in band ---');
  for (const z of ob) {
    const f = (z as any).floor, c = (z as any).ceiling;
    if (f >= lo && c <= hi) {
      console.log('    ', z.id, 'floor='+f.toFixed(5), 'ceil='+c.toFixed(5), 'zfp='+(z as any).zfp, 'type='+(z as any).type, 'side='+(z as any).side);
    }
  }
}
