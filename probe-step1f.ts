// PROBE-6 — the raw LMV DXYZone structure: print 6 LMV zones + their fields.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
const lmvZones = model.zones.filter(z => String(z.id).startsWith('LMV|'));
console.log('=== 8 sample LMV zones (the raw fields) ===');
for (const z of lmvZones.slice(0, 8)) {
  const keys = Object.keys(z);
  console.log(`  ${z.id}: floor=${z.floor} ceiling=${z.ceiling} type=${z.type} zfp=${z.zfp} | ${keys.join(',')}`);
}
console.log('\n=== the LMV zones with the ceiling between 1.1390 and 1.1430 (any field order) ===');
for (const z of lmvZones) {
  const lo = Math.min(z.floor ?? Infinity, z.ceiling ?? -Infinity);
  const hi = Math.max(z.floor ?? -Infinity, z.ceiling ?? -Infinity);
  if (hi >= 1.1390 && lo <= 1.1430) {
    console.log(`  ${z.id}: floor=${z.floor} ceiling=${z.ceiling} type=${z.type} zfp=${z.zfp}`);
  }
}
console.log(`\nzones total: ${model.zones.length}; LMV: ${lmvZones.length}`);
