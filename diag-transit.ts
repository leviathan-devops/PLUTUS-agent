import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WK = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const rejects: any[] = [];
const setups = generateSourceSetupsV45(dxy, { onReject: (r) => rejects.push(r) });
console.log(`=== ${setups.length} setups ===`);
for (const s of setups) console.log(`${s.setupId} ${s.direction} E=${s.entry} SL=${s.sl} TP=${s.tp} rrr=${s.rrr} day=${s.day}`);
console.log(`\n=== ${rejects.length} rejects ===`);
for (const r of rejects) console.log(`  ${r.structureId} ${r.day} ${r.session} ${r.reason}: ${r.detail}`);
console.log('\n=== structures in universe (LQZ kind) with battle in week ===');
for (const e of dxy.lqzMatrix) {
  const inWeek = e.touchEvents.filter(ev => ev.firstTouchMs >= WK && ev.firstTouchMs <= ANCHOR_MS);
  if (inWeek.length === 0) continue;
  console.log(`  [${e.bottom}-${e.top}] c=${e.priceCenter.toFixed(5)} side=${e.side} week=${inWeek.length} :: ${inWeek.map(ev=>new Date(ev.firstTouchMs).toISOString().slice(5,16)+'Z'+ev.anatomy).join(',')}`);
}
