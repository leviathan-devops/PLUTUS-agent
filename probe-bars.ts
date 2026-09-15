import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const raw: any[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const dxy = raw.find(r => r.pair === 'DXY' && r.timeframe === '1H')!.bars;
for (const b of dxy.filter((b:any) => b.timestamp >= 1783443600000 && b.timestamp <= 1783616400000)) {
  console.log(`${new Date(b.timestamp).toISOString().slice(0,16)}Z O=${b.open.toFixed(3)} H=${b.high.toFixed(3)} L=${b.low.toFixed(3)} C=${b.close.toFixed(3)}`);
}
console.log('--- Monday (July 6) ---');
for (const b of dxy.filter((b:any) => b.timestamp >= 1783296000000 && b.timestamp <= 1783382400000)) {
  console.log(`${new Date(b.timestamp).toISOString().slice(0,16)}Z O=${b.open.toFixed(3)} H=${b.high.toFixed(3)} L=${b.low.toFixed(3)} C=${b.close.toFixed(3)}`);
}
console.log('--- Tuesday (July 7) ---');
for (const b of dxy.filter((b:any) => b.timestamp >= 1783382400000 && b.timestamp <= 1783468800000)) {
  console.log(`${new Date(b.timestamp).toISOString().slice(0,16)}Z O=${b.open.toFixed(3)} H=${b.high.toFixed(3)} L=${b.low.toFixed(3)} C=${b.close.toFixed(3)}`);
}
