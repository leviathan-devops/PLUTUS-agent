import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const E = 100.972;
const buffer = 0.05;
console.log('Adverse rungs (rxExt < E) sorted by |center-E|:');
const cands = model.lmv.table
  .filter(z => z.reactionExtreme < E)
  .sort((a,b) => Math.abs(a.center-E)-Math.abs(b.center-E) || a.center-b.center || a.bottom-b.bottom);
for (const z of cands.slice(0, 25)) {
  const sl = z.reactionExtreme - buffer;
  const dist = Math.abs(E - sl)/0.01;
  const accept = dist >= 5 && dist <= 9.5;
  console.log(`  c=${z.center.toFixed(3)} band=[${z.bottom.toFixed(3)},${z.top.toFixed(3)}] rxExt=${z.reactionExtreme.toFixed(3)} sl=${sl.toFixed(3)} dist=${dist.toFixed(1)}p ${accept?'ACCEPT':'reject'}`);
}
