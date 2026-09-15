import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
const WEEK_START_MS = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
console.log('=== LONG ORDER_BLOCK DEMAND structures with battles, formation vs weekStart ===');
for (const z of model.zones) {
  if (z.type !== 'DEMAND' || z.classification === 'BoM') continue;
  const weekBattles = z.reactionEvents.filter(ev => ev.firstTouchMs >= WEEK_START_MS && ev.firstTouchMs <= ANCHOR_MS && !ev.pierced);
  if (weekBattles.length === 0) continue;
  const prior = z.formationMs < WEEK_START_MS;
  console.log(`${z.id} ${prior?'[PRIOR]':'[in-week]'} formation=${new Date(z.formationMs).toISOString().slice(0,16)}Z band=[${z.bottom},${z.top}] battles=${weekBattles.map(e=>new Date(e.firstTouchMs).toISOString().slice(5,10)+' '+e.session).join(',')}`);
}
