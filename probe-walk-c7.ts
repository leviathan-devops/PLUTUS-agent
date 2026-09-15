import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { computeLmvTP, proxyAtr1hPips } from './src/mdve/mirror.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000;
const WEEK_START_MS = 1783296000000;
lockRunAnchor(ANCHOR_MS);

const raw = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number) =>
  (raw.find((r: any) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b: any) => b.timestamp <= limitMs).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number) => { const b = barsFor(p, '1H', limitMs); return b.length ? b[b.length - 1]!.close : 0; };

const PIP: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

async function main() {
  const model = await buildChartModel('DXY', '2026-07-06',
    gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)),
    gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined,
    gateBars(barsFor('DXY', '15m', ANCHOR_MS)));

  const pip = 0.01;
  const entry = 101.14;
  const sl = 101.19;
  console.log('=== DXY SHORT computeLmvTP (entry 101.14) — the BUY_SIDE rungs below ===');
  const rungs = model.lmv.table
    .filter((z: any) => z.side === 'BUY_SIDE' && z.center < entry)
    .sort((a: any, b: any) => b.center - a.center);
  for (const z of rungs) {
    console.log(`${z.center.toFixed(5)} [${z.bottom}-${z.top}] w=${((z.top - z.bottom) / pip).toFixed(1)}p zfp=${z.zfp} sweeps=${z.sweepCount} candles=${z.candles.length} defEdge=${z.defendedEdge}`);
  }
  console.log('\n=== THE CURRENT PICK (no opts — the DXY source lane) ===');
  const tp = computeLmvTP(entry, sl, 'SHORT', model, 'DXY', pip, undefined, undefined);
  console.log('tp:', tp ? JSON.stringify(tp) : 'null');
  const tpE1 = computeLmvTP(entry, sl, 'SHORT', model, 'DXY', pip, { e1PressureClassification: true }, undefined);
  console.log('tp (e1PressureClassification):', tpE1 ? JSON.stringify(tpE1) : 'null');
  console.log('\natr1hPips (proxy):', proxyAtr1hPips(model, pip));
}

main().catch((e) => { console.error('CRASH:', e); process.exit(1); });
