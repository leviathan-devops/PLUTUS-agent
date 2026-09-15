import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('=== model.zones (all) ===');
for (const z of dxy.zones) {
  console.log(`  ${z.id} type=${z.type} tf=${z.timeframe} cls=${z.classification} zfp=${z.zfp} [${z.bottom}-${z.top}] fresh=${z.freshness} ev=${z.reactionEvents.length}`);
}
console.log(`\n=== model.lqzMatrix (${dxy.lqzMatrix.length}) ===`);
for (const e of dxy.lqzMatrix) {
  console.log(`  id=LMQZ side=${e.side} zfp=${e.zfp} [${e.bottom}-${e.top}] c=${e.priceCenter} ev=${e.touchEvents.length}`);
}
console.log(`\n=== model.lmv.table BUY_SIDE rungs near 100.9-101.0 ===`);
for (const z of dxy.lmv.table.filter(z => z.side === 'BUY_SIDE' && z.center > 100.85 && z.center < 101.1)) {
  console.log(`  c=${z.center.toFixed(5)} de=${z.defendedEdge.toFixed(5)} rxExt=${z.reactionExtreme.toFixed(5)} zfp=${z.zfp} sweep=${z.sweepCount} candles=${z.candles.length} [${z.bottom}-${z.top}]`);
}
console.log(`\n=== model.lmv.table SELL_SIDE rungs near 101.0-101.4 ===`);
for (const z of dxy.lmv.table.filter(z => z.side === 'SELL_SIDE' && z.center > 101.0 && z.center < 101.4)) {
  console.log(`  c=${z.center.toFixed(5)} de=${z.defendedEdge.toFixed(5)} rxExt=${z.reactionExtreme.toFixed(5)} zfp=${z.zfp} sweep=${z.sweepCount} candles=${z.candles.length} [${z.bottom}-${z.top}]`);
}
