import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const bars = (raw.find(r => r.pair === 'DXY' && r.timeframe === '1H')?.bars ?? []);
const WK = 1783296000000; // Mon 2026-07-06 00:00Z
console.log('=== DXY 1H bars Mon 07-06 00:00Z through Tue 07-07 08:00Z ===');
for (const b of bars.filter(b => b.timestamp >= WK && b.timestamp < WK + 24*3600*1000*1.4).sort((a,c)=>a.timestamp-c.timestamp)) {
  const d = new Date(b.timestamp);
  console.log(`${d.toISOString().slice(5,16)}Z o=${b.open.toFixed(3)} h=${b.high.toFixed(3)} l=${b.low.toFixed(3)} c=${b.close.toFixed(3)}`);
}
console.log('\n=== DXY 1H bars Wed 07-08 00:00Z through Thu 07-09 08:00Z ===');
for (const b of bars.filter(b => b.timestamp >= WK + 24*3600*1000*2 && b.timestamp < WK + 24*3600*1000*3.35).sort((a,c)=>a.timestamp-c.timestamp)) {
  const d = new Date(b.timestamp);
  console.log(`${d.toISOString().slice(5,16)}Z o=${b.open.toFixed(3)} h=${b.high.toFixed(3)} l=${b.low.toFixed(3)} c=${b.close.toFixed(3)}`);
}
