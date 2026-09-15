import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const plain = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('plain zones:', plain.zones.length, 'lmv table:', plain.lmv.table.length);

// Build report model WITH IP zones
import { pillarEngine } from './src/brains/9-pillar-lobe.js';
const ipModel = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const pr = pillarEngine({ instrument: 'DXY', bars: barsFor('DXY','1H'), currentPrice: ipModel.spot });
const zfp = (c:number)=> c>=12?10:c>=10?20:c>=8?30:c>=6?40:c>=4?55:65;
const ipZones = pr.levels.filter(l=> !(l.source.includes('→DXY')||l.source.startsWith('P8-StrikeDXY'))).map(l => {
  const isSupply = l.price > ipModel.spot;
  return { id: `IP|DXY|${l.price.toFixed(5)}`, type: isSupply?'SUPPLY':'DEMAND', top: l.price + 0.01*10, bottom: l.price, timeframe:'1H', classification:'MoM', formationMs: ANCHOR_MS, freshness:'FRESH', reactionEvents: [], zfp: zfp(pr.compositeScore), confluence: pr.compositeScore, source:'PILLAR' };
});
ipModel.zones = [...ipModel.zones, ...ipZones as any];
console.log('ip zones added:', ipZones.length, 'total zones:', ipModel.zones.length);

const plainSetups = generateSourceSetupsV45(plain);
const ipSetups = generateSourceSetupsV45(ipModel);
console.log('\n=== PLAIN MODEL setups ===');
for (const s of plainSetups) if (s.setupId.includes('100_935') || s.setupId.includes('100_949') || s.setupId.includes('100_779')) console.log(`${s.setupId} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)}`);
console.log('\n=== IP MODEL setups ===');
for (const s of ipSetups) if (s.setupId.includes('100_935') || s.setupId.includes('100_949') || s.setupId.includes('100_779')) console.log(`${s.setupId} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)}`);
