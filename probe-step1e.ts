// PROBE-5 — the LMV DXYZones (the model.zones): id + type + floor + ceiling + zfp,
// for the rungs in the 1.1390-1.1425 band. The rung-to-zone conversion's ground truth.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
console.log('=== the LMV DXYZones in [1.1390, 1.1425] ===');
for (const z of model.zones) {
  if (String(z.id).startsWith('LMV|') && z.ceiling >= 1.1390 && z.floor <= 1.1425) {
    console.log(`  ${z.id}  type=${z.type}  band=[${z.floor.toFixed(5)}, ${z.ceiling.toFixed(5)}]  zfp=${z.zfp}  classification=${z.classification ?? '?'}`);
  }
}
console.log('=== the non-LMV zones in [1.1360, 1.1450] (the S/D zones for reference) ===');
for (const z of model.zones) {
  if (!String(z.id).startsWith('LMV|') && z.ceiling >= 1.1360 && z.floor <= 1.1450) {
    console.log(`  ${z.id}  type=${z.type}  band=[${z.floor.toFixed(5)}, ${z.ceiling.toFixed(5)}]  zfp=${z.zfp}`);
  }
}
console.log(`\nzones total: ${model.zones.length}; LMV total: ${model.zones.filter(z => String(z.id).startsWith('LMV|')).length}`);
