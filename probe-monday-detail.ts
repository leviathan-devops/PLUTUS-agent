// PROBE-MONDAY-DETAIL — the Monday native-lane emissions + the E1/E2/E3 breakdown:
// the native setups per pair (entries + SL/TP), the E1 designations (the S/D zones with bands),
// the E2 shapes, and the E3 resolutions vs the operator's Monday goldens.
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { dedupTrades } from './src/mdve/trade-dedup.js';
import { floorSetupsToDedupRows } from './src/pipeline/mdve-stage.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783321200000; // the Monday 07:00 UTC
lockRunAnchor(ANCHOR_MS);
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => gateBars(
  (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b: any) => b.timestamp <= ANCHOR_MS)).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m')),
  'EUR/USD': buildChartModel('EUR/USD', '2026-07-06', barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m')),
  'GBP/USD': buildChartModel('GBP/USD', '2026-07-06', barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m')),
};
console.log("=== E1 — the Monday zone designations (the day S/D zones with the bands) ===");
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const m = models[pair];
  // the day's formed zones near the spot: print the SUPPLY + DEMAND zones within 200p of the spot
  const spot = spotFor(pair);
  const pip = pair === 'DXY' ? 0.01 : 0.0001;
  console.log(`\n-- ${pair} (spot ${spot.toFixed(5)}) --`);
  for (const z of m.zones) {
    const lo = Math.min((z as any).bottom ?? Infinity, (z as any).floor ?? Infinity);
    const hi = Math.max((z as any).top ?? -Infinity, (z as any).ceiling ?? -Infinity);
    if (hi >= spot - 2 * pip && lo <= spot + 2 * pip && String(z.id).startsWith('LMV|')) {
      console.log(`  ${z.id} type=${z.type} band=[${lo.toFixed(5)}, ${hi.toFixed(5)}] zfp=${(z as any).zfp} class=${(z as any).classification}`);
    }
  }
}
console.log('\n=== E2 — the Monday day shapes (from the E2-CORE) ===');
console.log('  DXY: SS · EU: SS · GU: R (the machine\'s Monday classifications)');
console.log('\n=== E3 — the NATIVE-lane Monday emissions (the DXY pipeline on each pair, NO cascade) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const setups = generateSourceSetupsV45(models[pair]);
  const rows = floorSetupsToDedupRows(setups, []);
  const dedup = dedupTrades(rows);
  console.log(`\n-- ${pair} (${dedup.uniqueTrades.length} unique native trades) --`);
  for (const t of dedup.uniqueTrades) {
    console.log(`  ${t.direction.padEnd(5)} entry=${t.entry.toFixed(pair === 'DXY' ? 3 : 5)} sl=${(t as any).sl?.toFixed(pair === 'DXY' ? 3 : 5) ?? '?'} tp=${(t as any).tp?.toFixed(pair === 'DXY' ? 3 : 5) ?? '?'} src=${String((t as any).source ?? '').slice(0, 60)}`);
  }
}
const goldens: Record<string, Array<{ dir: string; entry: number }>> = {
  DXY: [{ dir: 'LONG', entry: 100.945 }, { dir: 'SHORT', entry: 101.14 }],
  'EUR/USD': [{ dir: 'SHORT', entry: 1.14395 }, { dir: 'LONG', entry: 1.14110 }],
  'GBP/USD': [{ dir: 'LONG', entry: 1.33330 }],
};
const pipOf: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
console.log('\n=== the native-lane deltas vs the operator\'s Monday goldens ===');
for (const [pair, gs] of Object.entries(goldens)) {
  const setups = generateSourceSetupsV45(models[pair as keyof typeof models]);
  const rows = floorSetupsToDedupRows(setups, []);
  const dedup = dedupTrades(rows);
  for (const g of gs) {
    const deltas = dedup.uniqueTrades.filter(t => t.pair === pair && t.direction === g.dir)
      .map(t => Math.abs(t.entry - g.entry) / pipOf[pair]!);
    const best = deltas.length ? Math.min(...deltas) : -1;
    console.log(`  ${pair.padEnd(8)} ${g.dir.padEnd(5)} golden=${g.entry.toFixed(pair === 'DXY' ? 3 : 5)} -> bestDelta ${best >= 0 ? best.toFixed(1) + 'p' : 'NONE'} ${best >= 0 && best <= 3 ? 'HIT' : 'MISS'}`);
  }
}
