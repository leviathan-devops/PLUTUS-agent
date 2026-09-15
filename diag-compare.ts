import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { runChainV452 } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const plain = generateSourceSetupsV45(dxy);
console.log(`=== PLAIN model (no pillar): ${plain.length} setups ===`);
for (const s of plain) console.log(`${s.setupId} ${s.direction} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} rrr=${s.rrr.toFixed(2)} ${s.day}`);
console.log('\n=== REPORT chain (with pillar): ===');
const c = await runChainV452();
console.log(`dxySource (${c.dxySource.length}):`);
for (const s of c.dxySource) console.log(`${s.setupId} ${s.direction} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} rrr=${s.rrr.toFixed(2)} ${s.day}`);
console.log('\n=== DXY dedup unique trades (report) ===');
for (const t of c.dedup.uniqueTrades.filter(t => t.pair === 'DXY')) console.log(`${t.pair} ${t.direction} E=${t.entry} SL=${t.sl} TP=${t.tp} | ${t.setupId}`);
