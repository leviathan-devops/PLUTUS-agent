import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const setups = generateSourceSetupsV45(model);
for (const s of setups) {
  console.log(`${s.setupId} | ${s.day} ${s.direction} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)} | ${s.shapeTrigger}`);
}
console.log('---LMV TABLE (DXY)---');
for (const z of model.lmv.table) {
  console.log(`c=${z.center.toFixed(5)} band=[${z.bottom.toFixed(5)},${z.top.toFixed(5)}] side=${z.side} defEdge=${z.defendedEdge.toFixed(5)} rxExt=${z.reactionExtreme.toFixed(5)} candles=${z.candles.length}`);
}
console.log('---ZONES (LMV bridged)---');
for (const z of model.zones.filter(z => z.id.startsWith('LMV|'))) {
  console.log(`id=${z.id} type=${z.type} band=[${z.bottom.toFixed(5)},${z.top.toFixed(5)}] tf=${z.timeframe}`);
}
