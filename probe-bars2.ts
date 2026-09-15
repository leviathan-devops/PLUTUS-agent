import { readFileSync } from 'node:fs';
const raw: any[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const dxy = raw.find(r => r.pair === 'DXY' && r.timeframe === '1H')!.bars;
for (const b of dxy.filter((b:any) => b.timestamp >= 1783616400000 && b.timestamp <= 1783784400000)) {
  console.log(`${new Date(b.timestamp).toISOString().slice(0,16)}Z O=${b.open.toFixed(3)} H=${b.high.toFixed(3)} L=${b.low.toFixed(3)} C=${b.close.toFixed(3)}`);
}
