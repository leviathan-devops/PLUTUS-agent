import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WK = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('=== ALL lmv.table BUY_SIDE rungs (band contains 100.94±0.03) with candles within week ===');
for (const z of dxy.lmv.table.filter(z => z.side === 'BUY_SIDE' && z.top > 100.90 && z.bottom < 101.02)) {
  const weekCandles = z.candles.filter(c => c.timestamp >= WK && c.timestamp <= ANCHOR_MS);
  if (weekCandles.length === 0) continue;
  const times = weekCandles.map(c => new Date(c.timestamp).toISOString().slice(5,16)+'Z').join(', ');
  console.log(`  c=${z.center.toFixed(3)} de=${z.defendedEdge.toFixed(3)} [${z.bottom}-${z.top}] n_week=${weekCandles.length} :: ${times}`);
}
console.log('\n=== SELL_SIDE rungs band 100.94-101.28 with week candles ===');
for (const z of dxy.lmv.table.filter(z => z.side === 'SELL_SIDE' && z.top > 101.0 && z.bottom < 101.30)) {
  const weekCandles = z.candles.filter(c => c.timestamp >= WK && c.timestamp <= ANCHOR_MS);
  if (weekCandles.length === 0) continue;
  const times = weekCandles.map(c => new Date(c.timestamp).toISOString().slice(5,16)+'Z').join(', ');
  console.log(`  c=${z.center.toFixed(3)} de=${z.defendedEdge.toFixed(3)} [${z.bottom}-${z.top}] n_week=${weekCandles.length} :: ${times}`);
}
