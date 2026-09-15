// PROBE-2 — the rung table ground truth: dump the EUR/USD LMV rungs near the golden band
// (the bands + zfp + side) to see why the rung 1.14120 wins the strongest() over the 1.14100.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
console.log('=== the EUR/USD LMV rung table (the DEMAND-side rungs in the golden band) ===');
const table = (model.lmv as any).table ?? (model as any).lmv;
const rungs: any[] = Array.isArray(table) ? table : [];
const inBand = rungs.filter((r: any) => (r as any).top != null && (r as any).bottom != null && (r as any).top <= 1.1440 && (r as any).bottom >= 1.1380);
for (const r of inBand.sort((a: any, b: any) => (b.top - a.top))) {
  const side = (r as any).side ?? (r as any).type ?? '?';
  const zfp = (r as any).zfp ?? (r as any).pressure?.zfp ?? '?';
  console.log(`  id=${String((r as any).id ?? (r as any).label).padEnd(34)} floor=${(r as any).bottom.toFixed(5)} top=${(r as any).top.toFixed(5)} side=${side} zfp=${zfp}`);
}
console.log(`\ntable type: ${Array.isArray(table) ? 'array' : typeof table}, len=${rungs.length}`);
console.log('model.lmv keys:', Object.keys(model.lmv ?? {}).join(', '));
