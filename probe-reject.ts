import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const rejects: string[] = [];
const setups = generateSourceSetupsV45(model, { onReject: (r) => rejects.push(`${r.structureId} | ${r.day} ${r.session} | ${r.reason} | ${r.detail}`) });
console.log('=== REJECTS ===');
for (const r of rejects) console.log(r);
console.log('=== LQZ structures with events in week ===');
for (const s of [...model.lqzMatrix].filter(e => e.side === 'SELL_SIDE' && e.priceCenter > 100.9 && e.priceCenter < 101.0)) {
  const weekEvs = s.touchEvents.filter(ev => ev.firstTouchMs >= model.anchor.weekStartMs && ev.firstTouchMs <= model.anchor.anchorMs);
  console.log(`LQZ center=${s.priceCenter.toFixed(3)} band=[${s.bottom},${s.top}] weekEvents=${weekEvs.length}`);
}
