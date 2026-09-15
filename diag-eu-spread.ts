import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD')),
};
const dxySetups = generateSourceSetupsV45(models.DXY);
const cascade = cascadeV45(dxySetups, models, { v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true } });

console.log('=== EU ZONE DISTRIBUTION ===');
const euActive = cascade.eu.filter(m => m.status === 'ACTIVE');
const zoneCount = new Map<string, number>();
for (const m of euActive) {
  const key = `${m.anchorZoneId.substring(0,40)}@${m.entry.toFixed(5)}`;
  zoneCount.set(key, (zoneCount.get(key) ?? 0) + 1);
}
for (const [k,v] of [...zoneCount].sort((a,b) => b[1]-a[1])) console.log(`  ${v}x ${k}`);
console.log(`EU unique zones: ${zoneCount.size}`);

console.log('\n=== EU ALL ACTIVE ENTRIES ===');
for (const m of euActive) {
  const rrr = Math.abs(m.tp - m.entry) / Math.abs(m.entry - m.sl);
  console.log(`  ${m.direction} E=${m.entry.toFixed(5)} SL=${m.sl.toFixed(5)} TP=${m.tp.toFixed(5)} RRR=${rrr.toFixed(2)} ${m.anchorZoneId.substring(0,35)}`);
}
