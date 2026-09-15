import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
for (const z of model.zones) {
  if (z.id.includes('100.779') || z.id.includes('100.803') || z.id.includes('100.852') || z.id.includes('100.935') || z.id.includes('100.940')) {
    console.log(`ZONE ${z.id} type=${z.type} band=[${z.bottom},${z.top}] tf=${z.timeframe} cls=${z.classification} zfp=${z.zfp} formationMs=${new Date(z.formationMs).toISOString()}`);
    for (const ev of z.reactionEvents) console.log(`  ev ${new Date(ev.firstTouchMs).toISOString()} ${ev.session} ${ev.anatomy} price=${ev.price} pierced=${ev.pierced}`);
  }
}
console.log('--- LQZ structures 100.949 ---');
for (const e of model.lqzMatrix.filter(e => e.side === 'SELL_SIDE' && e.priceCenter > 100.93 && e.priceCenter < 100.97)) {
  console.log(`LQZ center=${e.priceCenter.toFixed(5)} band=[${e.bottom},${e.top}] side=${e.side} zfp=${e.zfp} sweepCount=${e.sweepCount}`);
  for (const ev of e.touchEvents) console.log(`  ev ${new Date(ev.firstTouchMs).toISOString()} ${ev.session} ${ev.anatomy} price=${ev.price} pierced=${ev.pierced}`);
}
