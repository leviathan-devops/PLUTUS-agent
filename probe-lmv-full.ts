import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));

// What does the deep-dip Mon [100.779-100.853] emit if entry resolves to the shelf defendedEdge?
// The LMV rung c=100.940 band=[100.936,100.972] defEdge=100.940. Is that in model.zones?
console.log('Shelf rung in model.zones:');
for (const z of model.zones.filter(z => z.id.startsWith('LMV|') && z.type==='DEMAND' && Math.abs(z.bottom-100.936)<1e-9 && Math.abs(z.top-100.972)<1e-9)) {
  const row = model.lmv.table.find(r=>Math.abs(r.center - Number(z.id.match(/([0-9.]+)$/)![1]))<1e-9);
  console.log(`  ${z.id} defEdge=${row?row.defendedEdge:'?'} candles=${row?row.candles.length:'?'}`);
}
