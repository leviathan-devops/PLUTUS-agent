// PROBE-LABEL — the TRUE story of the [1.14080, 1.14120] rung's SELL_SIDE vote:
// dump EVERY reaction candle against the band + its vote, from the actual bars.
// Also the #3's bands ([1.14334,1.14374], [1.14390,1.14417], [1.14449,1.14480]).
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const bars1H = (raw.find(r => r.pair === 'EUR/USD' && r.timeframe === '1H')?.bars ?? [])
  .filter((b: any) => b.timestamp <= ANCHOR_MS).sort((a: any, b: any) => a.timestamp - b.timestamp);
const atr = (() => {
  const n = 14; let sum = 0; const c = bars1H;
  for (let i = 1; i < c.length; i++) {
    const h = c[i]!.high, l = c[i]!.low, pc = c[i - 1]!.close;
    sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return sum / (c.length - 1);
})();
const PIP = 0.0001;
const eps = 2 * PIP; // CLUSTER_TOLERANCE_PIPS
const d = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

function dumpBand(bottom: number, top: number, label: string) {
  const lo = bottom - eps, hi = top + eps;
  console.log(`\n════════ ${label} band=[${bottom}, ${top}] widened=[${lo}, ${hi}] ════════`);
  let buyV = 0, sellV = 0, lwm = 0, uwm = 0;
  let reactions = 0;
  const rows: string[] = [];
  for (let i = 0; i < bars1H.length; i++) {
    const bar = bars1H[i]!;
    // classifyTouch replica: touch = the bar's range overlaps the widened band
    if (bar.high <= lo || bar.low >= hi) continue; // no touch
    // pass-through: the bar's body/range covers the ENTIRE widened band (both edges)
    const coversAll = bar.low <= lo && bar.high >= hi;
    if (coversAll) continue;
    const refClose = i > 0 ? bars1H[i - 1]!.close : bar.open;
    const fromAbove = refClose >= hi;
    const fromBelow = refClose <= lo;
    const lowerWick = Math.min(bar.open, bar.close) - bar.low;
    const upperWick = bar.high - Math.max(bar.open, bar.close);
    lwm += lowerWick; uwm += upperWick;
    let vote: string;
    if (fromAbove && !fromBelow) { buyV++; vote = 'BUY (fell into it, closed back up)'; }
    else if (fromBelow && !fromAbove) { sellV++; vote = 'SELL (rose into it, closed back down)'; }
    else if (lowerWick > upperWick) { buyV++; vote = 'BUY (dwell, lower-wick)'; }
    else if (upperWick > lowerWick) { sellV++; vote = 'SELL (dwell, upper-wick)'; }
    else if (bar.close >= (bottom + top) / 2) { buyV++; vote = 'BUY (tie, closed above center)'; }
    else { sellV++; vote = 'SELL (tie, closed below center)'; }
    reactions++;
    rows.push(`  ${d(bar.timestamp)}  O=${bar.open.toFixed(5)} H=${bar.high.toFixed(5)} L=${bar.low.toFixed(5)} C=${bar.close.toFixed(5)}  ${fromAbove ? 'fromAbove' : fromBelow ? 'fromBelow' : 'dwell'}  → ${vote}`);
  }
  for (const r of rows) console.log(r);
  const side = buyV > sellV ? 'BUY_SIDE' : sellV > buyV ? 'SELL_SIDE' : lwm > uwm ? 'BUY_SIDE' : uwm > lwm ? 'SELL_SIDE' : 'TIE';
  console.log(`  reactions=${reactions}  buyVotes=${buyV}  sellVotes=${sellV}  lowerWickMass=${lwm.toFixed(6)}  upperWickMass=${uwm.toFixed(6)}  → ${side}`);
}
dumpBand(1.14080, 1.14120, 'THE #2 POCKET');
dumpBand(1.14334, 1.14374, '#3 internal 1');
dumpBand(1.14390, 1.14417, '#3 internal 2');
dumpBand(1.14449, 1.14480, '#3 internal 3 (the operator\'s 1.14460!)');
dumpBand(1.14494, 1.14529, '#8 internal 1');
dumpBand(1.14567, 1.14583, '#8 internal 2 (the operator\'s 1.14555!)');
