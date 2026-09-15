// PROBE-3 — the full LqzZoneMatrix structure: dump one rung's ENTIRE object
// + find the rungs whose bands contain 1.14110 / the operator's LQZ [1.14110-1.14020].
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
const table: any[] = (model.lmv as any).table;
console.log('=== the FULL first-rung object (the field names) ===');
console.log(JSON.stringify(table[0], null, 1).slice(0, 2000));
console.log('\n=== ALL rungs whose band straddles 1.1400-1.1420 (the golden band) ===');
for (const r of table) {
  const lo = Math.min(r.top ?? r.ceiling ?? r.high ?? Infinity, r.bottom ?? r.floor ?? r.low ?? -Infinity);
  const hi = Math.max(r.top ?? r.ceiling ?? r.high ?? -Infinity, r.bottom ?? r.floor ?? r.low ?? -Infinity);
  if (hi >= 1.1400 && lo <= 1.1420) {
    console.log(`  id=${JSON.stringify(r.id ?? r.label ?? r.name)} band=[${lo.toFixed(5)}, ${hi.toFixed(5)}] side=${r.side ?? r.type ?? r.classification ?? '?'} zfp=${r.zfp ?? r.pressure?.zfp ?? '?'}`);
  }
}
