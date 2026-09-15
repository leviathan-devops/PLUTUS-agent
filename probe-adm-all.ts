import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { resolveOperativeZone, zoneToOperative, rungToOperative, isDegenerateRung, type PairKey, type Direction } from './src/mdve/reasoning-chain.js';
import { resolveTp, resolveSlDepth, containingStructuralZone, type AdmInput, anchorTrade } from './src/mdve/anchor-decision-machine.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';

const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, lim: number) => (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b) => b.timestamp <= lim).sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, lim: number) => { const b = barsFor(p, '1H', lim); return b.length ? b[b.length - 1]!.close : 0; };
const models: Record<PairKey, ChartModel> = {
  DXY: buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))),
};
const pip: Record<PairKey, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

// The emitted lanes: {pair, zoneId, dir, E, SL, TP}
const lanes = [
  { pair: 'DXY' as PairKey, zoneId: 'DXY|1H|1782990000000|101.027', dir: 'SHORT' as Direction, E: 101.120, SL: 101.169, TP: 100.918 },
  { pair: 'DXY' as PairKey, zoneId: 'DXY|1H|1782108000000|100.860', dir: 'LONG' as Direction, E: 100.918, SL: 100.83267, TP: 101.240 },
  { pair: 'EUR/USD' as PairKey, zoneId: 'EUR/USD|1H|1783076400000|1.14460', dir: 'SHORT' as Direction, E: 1.14390, SL: 1.14484, TP: 1.14040 },
  { pair: 'EUR/USD' as PairKey, zoneId: 'EUR/USD|1H|1782990000000|1.14004', dir: 'LONG' as Direction, E: 1.14095, SL: 1.14023, TP: 1.14620 },
  { pair: 'GBP/USD' as PairKey, zoneId: 'LMV|GBP/USD|1.33380', dir: 'LONG' as Direction, E: 1.33343, SL: 1.33318, TP: 1.33560 },
];
for (const lane of lanes) {
  const model = models[lane.pair];
  const zone = resolveOperativeZone(model, lane.pair, lane.zoneId);
  if (!zone) { console.log(`${lane.pair} ${lane.dir}: ZONE NOT RESOLVED`); continue; }
  const atr = proxyAtr1hPips(model, pip[lane.pair]);
  const containing = containingStructuralZone(zone, model.zones);
  console.log(`\n=== ${lane.pair} ${lane.dir} (emitted E ${lane.E} SL ${lane.SL} TP ${lane.TP}) ===`);
  console.log(`  zone ${zone.id} [${zone.floor}-${zone.ceiling}] containing ${containing ? containing.id + ' [' + containing.bottom.toFixed(5) + '-' + containing.top.toFixed(5) + '] reac ' + (containing.reactionEvents ?? []).length : 'NONE'}`);
  const tpRes = resolveTp(zone, lane.dir, (model.lmv as unknown as { table: LqzZoneMatrix[] }).table, pip[lane.pair], model.zones, lane.E);
  console.log(`  ADM resolveTp → ${tpRes ? `TP ${tpRes.tp.toFixed(5)} (${tpRes.measurement.evidence.join('; ')})` : 'null (NO_STRUCTURAL_TP)'}`);
  const slRes = resolveSlDepth(zone, lane.dir, model.zones, pip[lane.pair], ANCHOR_MS, atr, lane.TP, lane.E);
  console.log(`  ADM resolveSlDepth (tpPrelim=${lane.TP}) → depth ${slRes.depthPips.toFixed(2)}p entryLever ${slRes.entryLever} — ${slRes.method}`);
}
