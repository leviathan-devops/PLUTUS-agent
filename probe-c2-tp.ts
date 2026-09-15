// THE C-2 TP PROBE — computeLmvTP with the exact chain args + the e2Day
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { computeLmvTP } from './src/mdve/mirror.js';
import type { OHLCBar } from './src/mdve/types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ANCHOR_MS = 1783317600000;
const WEEK = '2026-07-06';
lockRunAnchor(ANCHOR_MS);
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS);
const spotFor = (p: string): number => {
  const h1 = barsFor(p, '1H');
  return h1.length ? h1[h1.length - 1]!.close : 0;
};

async function main() {
  const pair = 'DXY';
  const model = await buildChartModel(pair, WEEK, gateBars(barsFor(pair, '1H')), gateBars(barsFor(pair, '4H')), gateBars(barsFor(pair, '30m')), spotFor(pair), undefined, gateBars(barsFor(pair, '15m')));
  // the chain's e2Day for the DXY Monday (from the C2-LANE trace)
  // the EU SHORT's TP over the fortress demand
  const e2DayEU = {
    day: 'Monday', shape: 'SS', direction: 'SHORT' as const,
    supplyZoneId: 'LMV|EUR/USD|1.14370',
    demandZoneId: 'EUR/USD|1H|1782990000000|1.14004',
    keyZoneType: 'SUPPLY' as const,
    floor: 1.1398, ceiling: 1.1446, dayOpenSpot: 1.1423, session: 'NY', confidence: 0.7,
  };
  const euModel = await buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H')), gateBars(barsFor('EUR/USD', '4H')), gateBars(barsFor('EUR/USD', '30m')), spotFor('EUR/USD'), undefined, gateBars(barsFor('EUR/USD', '15m')));
  const tpEU = computeLmvTP(1.14390, 1.14649, 'SHORT', euModel, 'EUR/USD', 0.0001,
    { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: true }, e2DayEU as never);
  console.log('EU SHORT computeLmvTP:', JSON.stringify(tpEU));
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
