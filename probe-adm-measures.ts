import { buildChartModel } from './src/mdve/index.js';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { resolveOperativeZone } from './src/mdve/reasoning-chain.js';
import {
  measureReactionWickExtreme, measureWickDispersion, measureZoneWidthScale,
  measureNestingDepth, measureDefendedExtreme, measureMinViableDefensePips,
} from './src/mdve/anchor-decision-machine.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';

const ANCHOR_MS = 1783317600000;
lockAnalysisPoint(ANCHOR_MS);
const WEEK = '2026-07-06';

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= limitMs).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

const models: Record<string, ChartModel | null> = {
  DXY: await buildChartModel('DXY', WEEK, barsFor('DXY', '1H', ANCHOR_MS), barsFor('DXY', '4H', ANCHOR_MS), barsFor('DXY', '30m', ANCHOR_MS), spotFor('DXY', ANCHOR_MS), undefined, barsFor('DXY', '15m', ANCHOR_MS)),
  'EUR/USD': await buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H', ANCHOR_MS), barsFor('EUR/USD', '4H', ANCHOR_MS), barsFor('EUR/USD', '30m', ANCHOR_MS), spotFor('EUR/USD', ANCHOR_MS), undefined, barsFor('EUR/USD', '15m', ANCHOR_MS)),
  'GBP/USD': await buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H', ANCHOR_MS), barsFor('GBP/USD', '4H', ANCHOR_MS), barsFor('GBP/USD', '30m', ANCHOR_MS), spotFor('GBP/USD', ANCHOR_MS), undefined, barsFor('GBP/USD', '15m', ANCHOR_MS)),
};

const pip: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

for (const [pair, zoneId, dir] of [
  ['EUR/USD', 'EUR/USD|1H|1783076400000|1.14460', 'SHORT'],
  ['DXY', 'DXY|1H|1782990000000|101.027', 'SHORT'],
  ['DXY', 'DXY|1H|1781841600000|100.945', 'LONG'],
  ['GBP/USD', 'LMV|GBP/USD|1.33380', 'LONG'],
  ['GBP/USD', 'GBP/USD|1H|1783062000000|1.33623', 'SHORT'],
] as const) {
  const m = models[pair]!;
  const op = resolveOperativeZone(m, pair, zoneId)!;
  const p = pip[pair]!;
  const m1 = measureReactionWickExtreme(op, dir, ANCHOR_MS);
  const m2 = measureWickDispersion(op, dir, ANCHOR_MS, p);
  const m3 = measureZoneWidthScale(op, m.zones, p, proxyAtr1hPips(m, p));
  const m4 = measureNestingDepth(op, m.zones, dir, ANCHOR_MS, p);
  const m5 = measureDefendedExtreme(op, dir);
  const closeEdge = dir === 'SHORT' ? op.floor : op.ceiling;
  const wickPlacement = m1.present ? Math.abs(m1.value - closeEdge) / p + m2.value : 0;
  const defendedPlacement = m5.present ? Math.abs(m5.value - closeEdge) / p : 0;
  const depth = Math.max(wickPlacement, m3.value, m4.value, defendedPlacement);
  console.log(`[${pair} ${dir} ${zoneId}]`);
  console.log(`  m1 wickExtreme: ${m1.present ? m1.value.toFixed(5) : 'ABSENT'} (${m1.evidence.join(';')})`);
  console.log(`  m2 dispersion: ${m2.present ? m2.value.toFixed(2) : 'ABSENT'} | m3 widthScale: ${m3.value.toFixed(2)} (${m3.evidence.join(';')}) | m4 nesting: ${m4.present ? m4.value.toFixed(2) : 'ABSENT'} | m5 defended: ${m5.present ? m5.value.toFixed(5) : 'ABSENT'}`);
  console.log(`  closeEdge ${closeEdge.toFixed(5)} | wickPlacement ${wickPlacement.toFixed(2)}p | defendedPlacement ${defendedPlacement.toFixed(2)}p | uncapped depth ${depth.toFixed(2)}p`);
  console.log(`  minViableDefense(model): ${measureMinViableDefensePips(m.zones, p).toFixed(2)}p`);
}
