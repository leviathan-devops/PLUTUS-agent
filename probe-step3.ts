// PROBE-10 — the GU Wed's deep region: the SELL rungs in [1.3315, 1.3330] (the deep pockets
// below the Wed demand-anchor's floor 1.33286) + the BUY rungs inside [1.33286, 1.33323].
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m'));
const table: any[] = (model.lmv as any).table;
console.log('=== the GU SELL rungs in [1.3315, 1.3345] ===');
const seen = new Set<string>();
for (const r of table) {
  const key = `${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}`;
  if (r.side !== 'SELL_SIDE' || seen.has(key)) continue; seen.add(key);
  if (r.bottom >= 1.3315 && r.bottom <= 1.3345) console.log(`  SELL [${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}] center=${r.center?.toFixed(5)} zfp=${r.zfp}`);
}
console.log('=== the GU BUY rungs in [1.3320, 1.3340] (the Wed demand-anchor [1.33286, 1.33323] internal!) ===');
for (const r of table) {
  const key = `${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}`;
  if (r.side !== 'BUY_SIDE' || seen.has(key)) continue; seen.add(key);
  if (r.bottom >= 1.3320 && r.bottom <= 1.3340) console.log(`  BUY  [${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}] center=${r.center?.toFixed(5)} zfp=${r.zfp}`);
}
console.log('\n=== the GU Thu: SELL rungs in [1.3365, 1.3395] (the Thu-anchor [1.33779, 1.33810] region!) ===');
for (const r of table) {
  const key = `${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}`;
  if (r.side !== 'SELL_SIDE' || seen.has(key)) continue; seen.add(key);
  if (r.bottom >= 1.3365 && r.bottom <= 1.3395) console.log(`  SELL [${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}] center=${r.center?.toFixed(5)} zfp=${r.zfp}`);
}
