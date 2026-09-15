import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WK = 1783296000000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));

// replicate lmvZoneForStructure LQZ branch for structure LQZ_M_100_949
const s = { kind: 'LQZ' as const, direction: 'LONG' as const, top: 100.972, bottom: 100.936, defenseEdge: 100.936 };
const overlapping = dxy.lmv.table.filter(z => z.side === 'BUY_SIDE' && z.bottom <= s.top && z.top >= s.bottom);
const pool = [...overlapping].sort((a, b) =>
  (b.candles.length - a.candles.length) ||
  (a.zfp - b.zfp) ||
  (Math.abs(a.center - s.defenseEdge) - Math.abs(b.center - s.defenseEdge)) ||
  (a.center - b.center));
console.log('LQZ_M_100_949 lmvZoneForStructure → pool[0]:');
const top5 = pool.slice(0, 5);
for (const z of top5) console.log(`  c=${z.center.toFixed(3)} de=${z.defendedEdge.toFixed(3)} candles=${z.candles.length} zfp=${z.zfp} [${z.bottom}-${z.top}]`);
console.log(`  => lmvZone = c=${pool[0]!.center} defendedEdge=${pool[0]!.defendedEdge}`);

// replicate internalLmvRungEntry
const wantType = 'DEMAND';
const internal = dxy.zones.filter(z =>
  z.id.startsWith('LMV|') && z.type === wantType &&
  z.bottom >= s.bottom - 1e-9 && z.top <= s.top + 1e-9);
console.log(`\ninternalLmvRungEntry: internal LMV zones fully inside [${s.bottom}-${s.top}] = ${internal.length}`);
const candlesOf = (z: any): number => {
  const m = /([0-9.]+)$/.exec(z.id); const c = m ? Number(m[1]) : 0;
  const row = dxy.lmv.table.find(r => Math.abs(r.center - c) < 1e-9);
  return row ? row.candles.length : 0;
};
const sortedInternal = [...internal].sort((a, b) =>
  (candlesOf(b) - candlesOf(a)) ||
  (Math.abs(Number(/([0-9.]+)$/.exec(a.id)![1]) - s.bottom) - Math.abs(Number(/([0-9.]+)$/.exec(b.id)![1]) - s.bottom)) ||
  (a.bottom - b.bottom) ||
  (a.id < b.id ? -1 : 1));
for (const z of sortedInternal.slice(0,5)) console.log(`  ${z.id} c=${Number(/([0-9.]+)$/.exec(z.id)![1])} candles=${candlesOf(z)} [${z.bottom}-${z.top}]`);
const best = sortedInternal[0];
console.log(`  => internalLmvRungEntry returns ${best ? (s.direction === 'LONG' ? best.top : best.bottom) : 'null'}`);
