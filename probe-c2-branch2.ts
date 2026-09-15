// the EU SHORT's branch-2 internal-rung resolution
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
  const euModel = await buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H')), gateBars(barsFor('EUR/USD', '4H')), gateBars(barsFor('EUR/USD', '30m')), spotFor('EUR/USD'), undefined, gateBars(barsFor('EUR/USD', '15m')));
  // the fortress zone
  const fort = euModel.zones.find((z: any) => z.id === 'EUR/USD|1H|1782990000000|1.14004');
  console.log('fortress:', JSON.stringify(fort && { id: fort.id, bottom: fort.bottom, top: fort.top, type: fort.type, zfp: fort.zfp, cl: fort.classification }));
  // the internal BUY_SIDE rungs
  const table = (euModel.lmv as unknown as { table: Array<Record<string, unknown>> }).table;
  const inside = table.filter((z: any) => z.side === 'BUY_SIDE' && z.zfp <= 20
    && z.bottom >= (fort?.bottom ?? 0) - 1e-9 && z.top <= (fort?.top ?? 0) + 1e-9);
  console.log('internal BUY_SIDE rungs:', inside.length, inside.map((z: any) => '[' + z.bottom + ',' + z.top + ']@' + z.center + ' z' + z.zfp).join(' | '));
  // the TUESDAY (BS:SHORT — the day's demand = the 1.14040 rung)
  const e2DayEU = {
    day: 'Tuesday', shape: 'BS', direction: 'SHORT' as const,
    supplyZoneId: 'LMV|EUR/USD|1.14200|1.14150|1.14189',
    demandZoneId: 'LMV|EUR/USD|1.14040|1.14027|1.14045',
    keyZoneType: 'SUPPLY' as const,
    floor: 1.1413, ceiling: 1.1446, dayOpenSpot: 1.14082, session: 'NY', confidence: 0.6,
  };
  const tp1 = computeLmvTP(1.14189, 1.14214, 'SHORT', euModel, 'EUR/USD', 0.0001,
    { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: true }, e2DayEU as never);
  console.log('TP Tue e1Walls:', JSON.stringify(tp1));
  const tp2 = computeLmvTP(1.14390, 1.14649, 'SHORT', euModel, 'EUR/USD', 0.0001,
    { passThroughWeakWalls: true, structuralExtension: true, e1PressureClassification: false }, e2DayEU as never);
  console.log('TP no-e1Walls:', JSON.stringify(tp2));
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
