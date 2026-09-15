import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('=== Shelf rung [100.936-100.972] candles (all rows) ===');
for (const z of model.lmv.table.filter(z => Math.abs(z.bottom-100.936)<1e-9 && Math.abs(z.top-100.972)<1e-9)) {
  console.log(`c=${z.center.toFixed(3)} defEdge=${z.defendedEdge.toFixed(3)} candles=${z.candles.length}`);
  for (const c of z.candles) console.log(`  ${new Date(c.timestamp).toISOString().slice(0,16)}Z O=${c.open.toFixed(3)} H=${c.high.toFixed(3)} L=${c.low.toFixed(3)} C=${c.close.toFixed(3)}`);
}
console.log('\n=== Which structures have a battle on which day ===');
for (const z of model.zones) {
  if (z.id.includes('100.779') || z.id.includes('100.803') || z.id.includes('100.852') || z.id.includes('100.935')) {
    const days = [...new Set(z.reactionEvents.map(e=>new Date(e.firstTouchMs).toISOString().slice(0,10)))].join(',');
    console.log(`${z.id} formation=${new Date(z.formationMs).toISOString().slice(0,10)} battleDays=${days}`);
  }
}
