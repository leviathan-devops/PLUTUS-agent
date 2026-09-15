/**
 * PROBE-C1-WIDTHS — the C-1 second layer: the EU/GU/DXY zone pool width
 * distributions at ANALYSIS_POINT. THE DEGENERATE-MIN-WIDTH HYPOTHESIS:
 * shapeBrainAtrProxyPips = (4 * minWidth) / pip — ONE sliver zone collapses
 * the whole day travel → sub-pip band → null ids → fallback slop.
 * READ-ONLY. Run: bun probe-c1-widths.ts
 */
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
interface BarLike { timestamp: number; open: number; high: number; low: number; close: number; volume?: number; }
type OHLCBar = BarLike;
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000;
const WEEK = '2026-07-06';
lockRunAnchor(ANCHOR_MS);

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter(b => b.timestamp <= ANCHOR_MS);
const spotFor = (p: string): number => {
  const h1 = barsFor(p, '1H');
  return h1.length ? h1[h1.length - 1]!.close : 0;
};

async function main() {
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const model = await buildChartModel(pair, WEEK, gateBars(barsFor(pair, '1H')), gateBars(barsFor(pair, '4H')), gateBars(barsFor(pair, '30m')), spotFor(pair), undefined, gateBars(barsFor(pair, '15m')));
    if (model.zones.length) {
    const sample = model.zones[0] as unknown as Record<string, unknown>;
    console.log('  SAMPLE ZONE keys:', Object.keys(sample).join(','), 'vals:', JSON.stringify(Object.fromEntries(Object.entries(sample).slice(0, 8))));
  }
  const zl = model.zones as unknown as Array<{ top?: number; bottom?: number; ceiling?: number; floor?: number; price?: number }>;
  const widths = zl.map(z => ((z.ceiling ?? z.top ?? z.price ?? NaN) - (z.floor ?? z.bottom ?? z.price ?? NaN)) as number).sort((a, b) => a - b);
    const pip = pair === 'DXY' ? 0.01 : 0.0001;
    const median = widths.length ? widths[Math.floor(widths.length / 2)] : 0;
    console.log(`${pair}: zones=${model.zones.length} minW=${(widths[0] ?? 0).toFixed(6)}pips=${((widths[0] ?? 0) / pip).toFixed(1)} medianW=${(median / pip).toFixed(1)}p maxW=${((widths[widths.length - 1] ?? 0) / pip).toFixed(1)}p`);
    console.log(`  first6 widths (pips): ${widths.slice(0, 6).map(w => (w / pip).toFixed(2)).join(' ')}`);
    if (widths.length) {
      const minZ = zl.find(z => (((z.ceiling ?? z.top ?? z.price ?? NaN) - (z.floor ?? z.bottom ?? z.price ?? NaN)) as number) === widths[0]);
      console.log(`  MIN-WIDTH ZONE: ${minZ?.id} [${minZ?.floor}, ${minZ?.ceiling}]`);
    }
  }
}
main().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
