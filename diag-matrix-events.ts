import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));

console.log('=== lqzMatrix entries: [100.93-100.98] band & touch events ===');
for (const e of dxy.lqzMatrix.filter(x => x.top > 100.9 && x.bottom < 101.05)) {
  console.log(`\n  entry [${e.bottom}-${e.top}] c=${e.priceCenter} side=${e.side} zfp=${e.zfp}`);
  for (const ev of e.touchEvents.sort((a,b) => a.firstTouchMs - b.firstTouchMs)) {
    const d = new Date(ev.firstTouchMs);
    console.log(`    ${d.toISOString().slice(0,16)}Z sess=${ev.session} anat=${ev.anatomy} price=${ev.price} pierced=${ev.pierced}`);
  }
}

console.log('\n=== lmv.table rows: band [100.936-100.972] candles ===');
for (const z of dxy.lmv.table.filter(z => Math.abs(z.top - 100.972) < 0.001 && Math.abs(z.bottom - 100.936) < 0.001)) {
  console.log(`\n  rung c=${z.center.toFixed(5)} de=${z.defendedEdge.toFixed(5)} side=${z.side} zfp=${z.zfp} sweep=${z.sweepCount}`);
  for (const c of z.candles.sort((a,b) => a.timestamp - b.timestamp)) {
    const d = new Date(c.timestamp);
    console.log(`    ${d.toISOString().slice(0,16)}Z o=${c.open} h=${c.high} l=${c.low} cl=${c.close} kind=${c.touchKind} wick=${c.wickTip} bc=${c.bodyClose}`);
  }
}
