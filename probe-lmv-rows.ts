import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
for (const z of model.lmv.table) {
  const c = z.center;
  if (c > 100.88 && c < 101.05) {
    console.log(`center=${c.toFixed(5)} band=[${z.bottom.toFixed(3)},${z.top.toFixed(3)}] side=${z.side} defEdge=${z.defendedEdge.toFixed(5)} rxExt=${z.reactionExtreme.toFixed(5)} candles=${z.candles.length} zfp=${z.zfp} sweepCount=${z.sweepCount}`);
  }
}
