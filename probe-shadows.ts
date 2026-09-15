// PROBE-SHADOWS — the real shadow centers for the visual (the #2 pocket + the demand band + the deep band).
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const raw: any = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string) => (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
const model = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m'));
const table: any[] = (model.lmv as any).table;
const dump = (lo: number, hi: number, label: string) => {
  console.log(`=== ${label} [${lo}, ${hi}] shadows ===`);
  for (const r of table) if (Math.abs(r.bottom - lo) < 1e-5 && Math.abs(r.top - hi) < 1e-5) {
    console.log(`  center=${r.center.toFixed(5)} side=${r.side} zfp=${r.zfp} candles=${r.candles.length} wickTip=${r.reactionExtreme?.toFixed(5) ?? '?'}`);
  }
};
dump(1.14080, 1.14120, '#2 pocket (the mislabelled)');
dump(1.14122, 1.14154, 'demand band (the designation)');
dump(1.13983, 1.14013, 'deep band');
