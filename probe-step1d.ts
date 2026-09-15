// PROBE-4 — the rungs' FULL DXYZone fields: side vs type vs id vs zfp,
// for the rungs in the 1.1390-1.1420 band (the Mon/Wed designation region).
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
console.log('=== the rungs in [1.1390, 1.1425] — the FULL fields ===');
const keys = new Set<string>();
for (const r of table) {
  const lo = Math.min(r.top ?? Infinity, r.bottom ?? -Infinity);
  const hi = Math.max(r.top ?? -Infinity, r.bottom ?? -Infinity);
  if (hi >= 1.1390 && lo <= 1.1425) {
    Object.keys(r).forEach(k => keys.add(k));
    console.log(`  id=${JSON.stringify(r.id)} label=${JSON.stringify(r.label)} priceCenter=${r.priceCenter} band=[${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}] side=${r.side} type=${r.type} zfp=${r.zfp} timeframe=${r.timeframe} weekSpan=${r.weekSpan}`);
  }
}
console.log('\nall keys:', [...keys].join(', '));
console.log('--- the day-open + the non-rung demand zones (the Mon/Wed region) ---');
for (const z of model.zones) {
  if (z.type === 'MOM_DEMAND' || z.type === 'BOM_DEMAND') {
    if (z.ceiling >= 1.1385 && z.floor <= 1.1420) {
      console.log(`  ${z.id} ${z.type} [${z.floor.toFixed(5)}, ${z.ceiling.toFixed(5)}] zfp=${z.zfp}`);
    }
  }
}
