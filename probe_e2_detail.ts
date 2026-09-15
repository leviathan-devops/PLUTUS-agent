import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core, toDxyZone } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m')),
};
const dxySetups = generateSourceSetupsV45(models.DXY);
const priorStorylines = runPriorWeekPreflight(models, dxySetups);
console.log('storylines:', JSON.stringify(priorStorylines, (k,v) => k==='defendedZones'||k==='roleReversals'||k==='depletedZones' ? `[${(v as any[]).length} entries]` : v, 2).slice(0,2000));
const e2 = await buildE2Core(models, priorStorylines);
console.log('\n=== EU core days (full) ===');
for (const d of e2.euCoreChain!.days) {
  console.log(`${d.day}: shape=${d.shape} dir=${d.direction} key=${d.keyZoneId}@${d.keyZonePrice} floor=${d.floor?.toFixed(5)} ceil=${d.ceiling?.toFixed(5)} open=${d.dayOpenSpot?.toFixed(5)} S=${d.supplyZoneId}@${d.supplyZonePrice} D=${d.demandZoneId}@${d.demandZonePrice}`);
}
console.log('\n=== GU core days (full) ===');
for (const d of e2.guCoreChain!.days) {
  console.log(`${d.day}: shape=${d.shape} dir=${d.direction} key=${d.keyZoneId}@${d.keyZonePrice} floor=${d.floor?.toFixed(5)} ceil=${d.ceiling?.toFixed(5)} open=${d.dayOpenSpot?.toFixed(5)} S=${d.supplyZoneId}@${d.supplyZonePrice} D=${d.demandZoneId}@${d.demandZonePrice}`);
}
console.log('\n=== DXY core days (full) ===');
for (const d of e2.dxyChain!.days) {
  console.log(`${d.day}: shape=${d.shape} dir=${d.direction} key=${d.keyZoneId}@${d.keyZonePrice} floor=${d.floor?.toFixed(5)} ceil=${d.ceiling?.toFixed(5)} open=${d.dayOpenSpot?.toFixed(5)} S=${d.supplyZoneId}@${d.supplyZonePrice} D=${d.demandZoneId}@${d.demandZonePrice}`);
}
