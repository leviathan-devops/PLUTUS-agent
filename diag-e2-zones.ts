import { buildChartModel } from './src/mdve/index.js';
import { cascadeShapeChain } from './src/mdve/shape-cascade.js';
import type { ZoneMapSnapshot } from './src/types.js';
import { ShapeBrain } from './src/brains/shape-brain.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter(b => b.timestamp <= ANCHOR_MS).sort((a,b) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };

const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD')),
};

const snap: ZoneMapSnapshot = {
  version: 1, timestamp: Date.now(), instrument: 'DXY',
  zones: models.DXY.zones.map(z => ({
    floor: z.bottom, ceiling: z.top, zfp: z.zfp,
    type: z.classification === 'BoM' ? (z.type === 'SUPPLY' ? 'BoMSupply' : 'BoMDemand') :
          z.classification === 'MoM' ? (z.type === 'SUPPLY' ? 'MoMSupply' : 'MoMDemand') :
          (z.type === 'SUPPLY' ? 'LQZSupply' : 'LQZDemand'),
    confluence: z.confluence ?? 0, reactionCount: z.reactionEvents?.length ?? 0,
  })),
  spots: { DXY: models.DXY.spot },
};

const brain = new ShapeBrain();
brain.setZoneMap(snap);
const dxyShape = await brain.compute()!;

const cascaded = cascadeShapeChain(dxyShape, models['EUR/USD'], models['GBP/USD'], models.DXY.anchor.weekStartMs);

console.log('=== EU DAY-SPECIFIC ZONES ===');
for (const d of cascaded.eu.days) {
  console.log(`  Day ${d.dayIdx} (${d.day}): shape=${d.shape} dir=${d.direction}`);
  console.log(`    supplyZone: ${d.supplyZonePrice?.toFixed(5) ?? 'none'}`);
  console.log(`    demandZone: ${d.demandZonePrice?.toFixed(5) ?? 'none'}`);
  console.log(`    keyZone:    ${d.keyZonePrice?.toFixed(5) ?? 'none'} (${d.keyZoneId ?? 'none'})`);
}

console.log('\n=== GU DAY-SPECIFIC ZONES ===');
for (const d of cascaded.gu.days) {
  console.log(`  Day ${d.dayIdx} (${d.day}): shape=${d.shape} dir=${d.direction}`);
  console.log(`    supplyZone: ${d.supplyZonePrice?.toFixed(5) ?? 'none'}`);
  console.log(`    demandZone: ${d.demandZonePrice?.toFixed(5) ?? 'none'}`);
  console.log(`    keyZone:    ${d.keyZonePrice?.toFixed(5) ?? 'none'} (${d.keyZoneId ?? 'none'})`);
}

// Also check: how many EU zones are active per day?
const DAY_MS = 24 * 3_600_000;
const wStart = models.DXY.anchor.weekStartMs;
console.log('\n=== EU ACTIVE ZONES PER DAY ===');
for (let i = 0; i < 5; i++) {
  const dayMs = wStart + i * DAY_MS;
  const winStart = dayMs - DAY_MS;
  const winEnd = dayMs + 2 * DAY_MS;
  const obActive = models['EUR/USD'].zones.filter(z => 
    z.freshness !== 'VIOLATED' && (z.reactionEvents ?? []).some(e => e.lastTouchMs >= winStart && e.lastTouchMs <= winEnd)
  );
  const lmvActive = models['EUR/USD'].lmv.table.filter(z =>
    (z.candles ?? []).some(c => c.timestamp >= winStart && c.timestamp <= winEnd)
  );
  const supplies = obActive.filter(z => z.type === 'SUPPLY');
  const demands = obActive.filter(z => z.type === 'DEMAND');
  const lmvSupply = lmvActive.filter(z => z.side === 'SELL_SIDE');
  const lmvDemand = lmvActive.filter(z => z.side === 'BUY_SIDE');
  console.log(`  Day ${i}: OB ${obActive.length} (${supplies.length}S/${demands.length}D) LMV ${lmvActive.length} (${lmvSupply.length}S/${lmvDemand.length}D)`);
  if (supplies.length > 0) console.log(`    OB Supply: ${supplies.map(z => z.id.substring(0, 40) + '@' + ((z.top+z.bottom)/2).toFixed(5)).join(', ')}`);
  if (demands.length > 0) console.log(`    OB Demand: ${demands.map(z => z.id.substring(0, 40) + '@' + ((z.top+z.bottom)/2).toFixed(5)).join(', ')}`);
}
