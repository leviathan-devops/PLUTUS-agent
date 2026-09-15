import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('=== LMV rung c=100.940 band=[100.936,100.972] (the Monday floor shelf candidate) ===');
for (const z of model.lmv.table.filter(r=>Math.abs(r.center-100.94)<1e-9)) {
  console.log(`center=${z.center} band=[${z.bottom},${z.top}] defEdge=${z.defendedEdge} candles=${z.candles.length}`);
  for (const c of z.candles) console.log(`  ${new Date(c.timestamp).toISOString().slice(0,16)}Z O=${c.open.toFixed(3)} H=${c.high.toFixed(3)} L=${c.low.toFixed(3)} C=${c.close.toFixed(3)}`);
}
console.log('\n=== All LMV rungs in band [100.936,100.972] with candle counts ===');
for (const z of model.lmv.table.filter(r=>Math.abs(r.bottom-100.936)<1e-9&&Math.abs(r.top-100.972)<1e-9)) {
  const mon = z.candles.filter(c=>new Date(c.timestamp).toISOString().slice(0,10)==='2026-07-06');
  console.log(`c=${z.center.toFixed(3)} defEdge=${z.defendedEdge.toFixed(3)} candles=${z.candles.length} mondayCandles=${mon.length} candleDays=${[...new Set(z.candles.map(c=>new Date(c.timestamp).toISOString().slice(0,10)))].join(',')}`);
}
