// PROBE-7 — the center-field semantics: print center + band for every rung in the region.
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
console.log('=== every rung: center + band + side (sorted by center) ===');
const seen = new Set<string>();
for (const r of table) {
  const key = `${r.center?.toFixed(5)}|${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}|${r.side}`;
  if (seen.has(key)) continue; seen.add(key);
  const lo = Math.min(r.top ?? Infinity, r.bottom ?? -Infinity);
  const hi = Math.max(r.top ?? -Infinity, r.bottom ?? -Infinity);
  if (hi >= 1.1385 && lo <= 1.1440) {
    console.log(`  center=${r.center?.toFixed(5)}  band=[${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}]  side=${r.side}  zfp=${r.zfp}  weekSpan=${r.weekSpan}`);
  }
}
console.log('\n=== the DEMAND-side (BUY_SIDE) rungs ONLY in the same band (the demandCands ground truth) ===');
for (const r of table) {
  const key = `${r.center?.toFixed(5)}|${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}|${r.side}`;
  if (seen.has(key)) { continue; } seen.add(key);
}
// second pass for the demand-only
const seen2 = new Set<string>();
for (const r of table) {
  const key = `${r.center?.toFixed(5)}|${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}|${r.side}`;
  if (seen2.has(key) || r.side !== 'BUY_SIDE') continue; seen2.add(key);
  const lo = Math.min(r.top ?? Infinity, r.bottom ?? -Infinity);
  const hi = Math.max(r.top ?? -Infinity, r.bottom ?? -Infinity);
  if (hi >= 1.1385 && lo <= 1.1440) {
    console.log(`  center=${r.center?.toFixed(5)}  band=[${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}]  zfp=${r.zfp}  weekSpan=${r.weekSpan}`);
  }
}
