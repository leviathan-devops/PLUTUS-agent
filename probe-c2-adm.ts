// THE C-2 ADM PROBE — the EU Monday SHORT's full anchor geometry
import { buildChartModel } from './src/mdve/index.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { anchorTrade } from './src/mdve/anchor-decision-machine.js';
import { resolveOperativeZone } from './src/mdve/reasoning-chain.js';
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
  const pair = 'EUR/USD';
  const model = await buildChartModel(pair, WEEK, gateBars(barsFor(pair, '1H')), gateBars(barsFor(pair, '4H')), gateBars(barsFor(pair, '30m')), spotFor(pair), undefined, gateBars(barsFor(pair, '15m')));
  const zone = resolveOperativeZone(model, pair, 'LMV|EUR/USD|1.14370');
  console.log('operative plain:', JSON.stringify(zone && { id: zone.id, floor: zone.floor, ceiling: zone.ceiling, side: (zone as { side?: string }).side }));
  const zoneB = resolveOperativeZone(model, pair, 'LMV|EUR/USD|1.14370|1.14390|1.14415');
  console.log('operative band-q:', JSON.stringify(zoneB && { id: zoneB.id, floor: zoneB.floor, ceiling: zoneB.ceiling, side: (zoneB as { side?: string }).side }));
  // the DXY band-qualified
  const dxy = model.zones.filter((z: any) => z.id === 'LMV|DXY|101.13000');
  console.log('DXY dups:', dxy.map((z: any) => '[' + z.bottom + ',' + z.top + '] side=' + z.side).join(' | '));
  const dxyQ = resolveOperativeZone(model, pair, 'LMV|DXY|101.13000|101.12000|101.15400');
  console.log('DXY band-q:', JSON.stringify(dxyQ && { id: dxyQ.id, floor: dxyQ.floor, ceiling: dxyQ.ceiling, side: (dxyQ as { side?: string }).side }));
  // the model.zones with the LMV|EUR/USD|1.14370 id
  const dup = model.zones.filter((z: any) => z.id === 'LMV|EUR/USD|1.14370');
  console.log('duplicates:', dup.map((z: any) => '[' + z.bottom + ',' + z.top + '] side=' + z.side + ' fr=' + z.freshness).join(' | '));
  if (!zone) return;
  const zone2 = resolveOperativeZone(model, pair, 'LMV|EUR/USD|1.14370|1.14390|1.14415');
  console.log('golden operative:', JSON.stringify(zone2 && { id: zone2.id, floor: zone2.floor, ceiling: zone2.ceiling, side: (zone2 as { side?: string }).side }));
  const adm = anchorTrade({
    model: model.zones, lmvTable: (model.lmv as unknown as { table: unknown[] }).table,
    pair, pip: 0.0001, operativeZone: zone2!, direction: 'SHORT' as const,
    dayOpenSpot: 1.1423, e1ZoneId: zone2!.id, atr1hPips: 40,
  });
  const adm3 = anchorTrade({
    model: model.zones, lmvTable: (model.lmv as unknown as { table: unknown[] }).table,
    pair, pip: 0.0001, operativeZone: zone2!, direction: 'SHORT' as const,
    dayOpenSpot: 1.1423, e1ZoneId: zone2!.id, atr1hPips: 40,
  });
  console.log('ADM atr40:', JSON.stringify({ verdict: adm3.verdict, entry: adm3.entry, sl: adm3.sl, tp: adm3.tp, rrr: adm3.rrr, rejectReason: adm3.rejectReason }));
  for (const atr of [50, 60, 70, 80]) {
    const a = anchorTrade({ model: model.zones, lmvTable: (model.lmv as unknown as { table: unknown[] }).table, pair, pip: 0.0001, operativeZone: zone2!, direction: 'SHORT' as const, dayOpenSpot: 1.1423, e1ZoneId: zone2!.id, atr1hPips: atr });
    console.log('atr' + atr + ':', JSON.stringify({ entry: a.entry, sl: a.sl, tp: a.tp, rrr: a.rrr }));
  }
  console.log('ADM:', JSON.stringify({ verdict: adm.verdict, entry: adm.entry, sl: adm.sl, tp: adm.tp, rrr: adm.rrr, rejectReason: adm.rejectReason, rejectEvidence: adm.rejectEvidence }));
}
main().catch((e) => { console.error('PROBE FAIL', e); process.exit(1); });
