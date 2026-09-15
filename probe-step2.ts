// PROBE-8 — the rungs ABOVE 1.1440 (the Tue anchor's [1.14307, 1.14494] internal set!)
// + the Fri anchor's [1.14469, 1.14608] internal set + the GU anchors' sets.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
for (const pair of ['EUR/USD', 'GBP/USD']) {
  const model = buildChartModel(pair, WEEK, barsFor(pair,'1H'), barsFor(pair,'4H'), barsFor(pair,'30m'), spotFor(pair), undefined, barsFor(pair,'15m'));
  const table: any[] = (model.lmv as any).table;
  console.log(`\n═══ ${pair} — the SELL_SIDE rungs in the 1.1430-1.1465 (EU) / 1.3340-1.3460 (GU) bands ═══`);
  const [lo, hi] = pair === 'EUR/USD' ? [1.1430, 1.1465] : [1.3340, 1.3460];
  const seen = new Set<string>();
  for (const r of table) {
    if (r.side !== 'SELL_SIDE') continue;
    const key = `${r.bottom?.toFixed(5)}|${r.top?.toFixed(5)}`;
    if (seen.has(key)) continue; seen.add(key);
    if (r.bottom >= lo - 1e-9 && r.bottom <= hi + 1e-9) {
      console.log(`  band=[${r.bottom?.toFixed(5)}, ${r.top?.toFixed(5)}] zfp=${r.zfp} center=${r.center?.toFixed(5)} candles=${r.candles?.length ?? '?'}`);
    }
  }
}
