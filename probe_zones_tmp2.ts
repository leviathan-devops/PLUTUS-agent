import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const m = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
console.log('keys:', Object.keys(m));
const zones = m.zones as any[];
console.log('zones length:', zones.length);
console.log('sample zone:', JSON.stringify(zones[0], (k,v) => k==='candles'?`<${(v as any[]).length} candles>`:v, 2).slice(0,800));
console.log('first 10 ids:', zones.slice(0,10).map(z => z.id).join('\n'));
// print all 1H zones
const h1 = zones.filter(z => String(z.id).includes('|1H|'));
console.log('--- 1H zones:', h1.length);
for (const z of h1.slice(0,15)) console.log('  ', z.id, 'floor='+z.floor?.toFixed(5), 'ceil='+z.ceiling?.toFixed(5), 'zfp='+z.zfp, 'type='+z.type, 'side='+z.side);
