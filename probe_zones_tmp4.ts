import { buildChartModel } from './src/mdve/index.js';
import { toDxyZone } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const pair = 'GBP/USD';
const m = buildChartModel(pair, WEEK, barsFor(pair,'1H'), barsFor(pair,'4H'), barsFor(pair,'30m'), spotFor(pair), undefined, barsFor(pair,'15m'));
const zones = m.zones.map(toDxyZone);
const lmv = zones.filter(z => String(z.id).startsWith('LMV')).sort((a,b)=>a.floor-b.floor);
console.log('--- GU LMV rungs 1.335-1.346 ---');
for (const z of lmv) {
  if (z.floor >= 1.335 && z.ceiling <= 1.346) {
    console.log('    ', z.id, 'floor='+z.floor.toFixed(5), 'ceil='+z.ceiling.toFixed(5), 'zfp='+z.zfp, 'type='+z.type);
  }
}
const ob = zones.filter(z => !String(z.id).startsWith('LMV')).sort((a,b)=>a.floor-b.floor);
console.log('--- GU OB/1H/4H zones 1.335-1.346 ---');
for (const z of ob) {
  if (z.floor >= 1.335 && z.ceiling <= 1.346) {
    console.log('    ', z.id, 'floor='+z.floor.toFixed(5), 'ceil='+z.ceiling.toFixed(5), 'zfp='+z.zfp, 'type='+z.type);
  }
}
