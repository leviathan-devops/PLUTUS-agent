// PROBE-9 — the strongestInternalEntryRung direct test: the Tue anchor [1.14307, 1.14494].
// Replicates the strongestInternalLqzRung sort with the ACTUAL table values.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
const table: any[] = (model.lmv as any).table;
const zone = { bottom: 1.14307, top: 1.14494 };
console.log('=== the strongestInternalLqzRung replication (SHORT — wantSide=SELL_SIDE, edge=zone.top 1.14494) ===');
const inside = table.filter((z) => z.side === 'SELL_SIDE' && z.zfp <= 20 && z.bottom >= zone.bottom - 1e-9 && z.top <= zone.top + 1e-9);
console.log(`inside count: ${inside.length}`);
for (const z of inside) {
  console.log(`  band=[${z.bottom}, ${z.top}] center=${z.center} zfp=${z.zfp} candles=${z.candles.length} |center-edge|=${Math.abs(z.center - zone.top).toFixed(6)}`);
}
const sorted = [...inside].sort((a, b) =>
  (a.zfp - b.zfp) ||
  (Math.abs(a.center - zone.top) - Math.abs(b.center - zone.top)) ||
  (b.candles.length - a.candles.length) ||
  (a.center - b.center));
console.log('sorted[0]:', sorted[0] ? `[${sorted[0].bottom}, ${sorted[0].top}] center=${sorted[0].center}` : 'NULL');
