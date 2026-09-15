import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const setups = generateSourceSetupsV45(dxy);
console.log(`=== DXY SOURCE SETUPS (${setups.length}) ===`);
for (const s of setups) {
  console.log(`\n[${s.setupId}]`);
  console.log(`  day=${s.day} session=${s.session} dir=${s.direction} cat=${s.category}`);
  console.log(`  ENTRY=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} RRR=${s.rrr.toFixed(2)} slPips=${s.slPips.toFixed(1)}`);
  console.log(`  zone=${s.zoneName}`);
  console.log(`  trigger=${s.shapeTrigger}`);
  console.log(`  notes=${s.notes}`);
}
