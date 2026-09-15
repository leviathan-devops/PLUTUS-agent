import { buildChartModel } from './src/mdve/index.js';
import { ShapeBrain } from './src/brains/shape-brain.js';
import type { ZoneMapSnapshot } from './src/types.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };

const eu = buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'));

// Build zone map snapshot for EU
const euSnap: ZoneMapSnapshot = {
  version: 1, timestamp: Date.now(), instrument: 'EUR/USD',
  zones: eu.zones.map(z => ({
    floor: z.bottom, ceiling: z.top, zfp: z.zfp,
    type: z.classification === 'BoM' ? (z.type === 'SUPPLY' ? 'BoMSupply' : 'BoMDemand') :
          z.classification === 'MoM' ? (z.type === 'SUPPLY' ? 'MoMSupply' : 'MoMDemand') :
          (z.type === 'SUPPLY' ? 'LQZSupply' : 'LQZDemand'),
    confluence: z.confluence ?? 0, reactionCount: z.reactionEvents?.length ?? 0,
  })),
  spots: { 'EUR/USD': eu.spot },
};

console.log(`EU spot: ${eu.spot.toFixed(5)}, zones: ${eu.zones.length}`);
console.log('=== FIRING ShapeBrain ON EU DIRECTLY ===\n');

const brain = new ShapeBrain();
brain.setZoneMap(euSnap);
const euShape = await brain.compute();

if (!euShape) { console.log('ShapeBrain returned null!'); process.exit(1); }

console.log(`Shape: ${euShape.shapeChain.currentShape}`);
console.log(`Bias: ${euShape.shapeChain.storylineBias}`);
console.log(`DayDecomp: ${euShape.shapeChain.dayDecomposition?.length ?? 0}`);

const dayDecomp = euShape.shapeChain.dayDecomposition ?? [];
console.log('\n=== EU PER-DAY ZONE PROJECTIONS (from ShapeBrain) ===');
for (const d of dayDecomp) {
  console.log(`  ${d.day}: shape=${d.shape} dir=${d.direction}`);
  console.log(`    keyZone: ${d.keyZoneId ?? 'null'} @ ${d.keyZonePrice?.toFixed(5) ?? 'null'}`);
  console.log(`    supply:  ${d.supplyZoneId ?? 'null'} @ ${d.supplyZonePrice?.toFixed(5) ?? 'null'}`);
  console.log(`    demand:  ${d.demandZoneId ?? 'null'} @ ${d.demandZonePrice?.toFixed(5) ?? 'null'}`);
  console.log(`    confidence: ${d.confidence?.toFixed(2) ?? 'null'}`);
}

console.log('\n=== GOLDEN EU LEVELS ===');
console.log('EU golden SHORT: 1.14205, 1.14325, 1.14408, 1.14505, 1.14544');
console.log('EU golden LONG:  1.13950, 1.14004, 1.14082');
