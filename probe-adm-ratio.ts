import { buildChartModel } from './src/mdve/index.js';
import { lockAnalysisPoint } from './src/mdve/temporal.js';
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

for (const [pair, p] of Object.entries(pip)) {
  const m = models[pair]!;
  console.log(`=== ${pair} map-derived ratio (width>=5p filter) ===`);
  const fracsAll: number[] = [];
  const fracsWide: number[] = [];
  for (const z of m.zones) {
    const evs = (z.reactionEvents ?? []) as Array<{ price: number }>;
    if (evs.length === 0) continue;
    const width = (z.top - z.bottom) / p;
    if (width <= 0) continue;
    const edge = z.type === 'SUPPLY' ? z.bottom : z.top;
    const dispersions = evs.map((ev) => Math.abs(ev.price - edge) / p).sort((a, b) => a - b);
    const med = dispersions[Math.floor(dispersions.length / 2)];
    const frac = med / width;
    fracsAll.push(frac);
    if (width >= 5) fracsWide.push(Math.min(frac, 1.0));
    console.log(`  ${z.id.slice(-30)} ${z.type} w ${width.toFixed(1)}p medDisp ${med.toFixed(1)}p frac ${frac.toFixed(2)}${width >= 5 ? ' [WIDE]' : ''}`);
  }
  const medAll = fracsAll.sort((a, b) => a - b)[Math.floor(fracsAll.length / 2)];
  const sortedWide = [...fracsWide].sort((a, b) => a - b);
  const medWide = sortedWide.length > 0 ? sortedWide[Math.floor(sortedWide.length / 2)] : null;
  const medWideCapped = medWide !== null ? Math.min(medWide, 0.5) : null;
  console.log(`  ALL zones median frac: ${medAll.toFixed(3)} (n=${fracsAll.length})`);
  console.log(`  WIDE(>=5p) median frac (capped 1.0): ${medWide?.toFixed(3)} (n=${fracsWide.length})`);
  console.log(`  WIDE median capped at 0.5: ${medWideCapped?.toFixed(3)}`);
  console.log(`  EU-SHORT-equivalent width 11.1p × ratio ${medWideCapped?.toFixed(2)} × 1.0 = ${(11.1 * (medWideCapped ?? 0) * 1.0).toFixed(2)}p`);
}
