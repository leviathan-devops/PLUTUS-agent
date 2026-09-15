import { runChainV452 } from './report-v452.js';
// Understand what happens to the Wed LONG if entry resolves differently.
// First look at how the sim decides outcome — replicate simulateUniqueTrade for candidate geometries.
import { buildChartModel } from './src/mdve/index.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import { computeMirrorTP, computeLmvTP, proxyAtr1hPips } from './src/mdve/mirror.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000;
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const model = buildChartModel('DXY', '2026-07-06', barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), 101.24, undefined, barsFor('DXY','15m'));
const simBars = barsFor('DXY','1H').sort((a,b)=>a.timestamp-b.timestamp);

// Simulate: LONG at given entry/sl/tp, trigger at battleMs, session bracket London Open 06:00-09:00Z, end 21:00Z
function simulate(E:number, SL:number, TP:number, battleMs:number) {
  const dayStart = Date.UTC(2026,6,8);
  const bracket = { start: dayStart+6*3600000, end: dayStart+21*3600000 };
  const activation = Math.max(bracket.start, battleMs);
  const startIdx = simBars.findIndex(b=>b.timestamp>=activation);
  if (startIdx<0) return 'NOTRIG';
  for (let i=startIdx;i<simBars.length;i++){
    const b=simBars[i]!;
    if (b.timestamp>=bracket.end) break;
    if (b.low<=E) {
      // triggered at this bar
      for (let j=i;j<simBars.length;j++){
        const x=simBars[j]!;
        if (x.low<=SL) return `LOSS sl@${new Date(x.timestamp).toISOString().slice(0,16)}Z`;
        if (x.high>=TP) return `WIN tp@${new Date(x.timestamp).toISOString().slice(0,16)}Z`;
      }
      return 'OPEN';
    }
  }
  return 'NOTRIG';
}

// Wed battle is Wed 07-08 06:00Z (TOKYO WICK_REJECT). Try golden geometry.
console.log('=== WED LONG candidate geometries ===');
console.log('E=100.975 SL=100.905 TP=101.240:', simulate(100.975,100.905,101.240,1783443600000+6*3600000));
console.log('E=100.972 SL=100.893 TP=101.207:', simulate(100.972,100.893,101.207,1783443600000+6*3600000));
console.log('E=100.972 SL=100.893 TP=101.130:', simulate(100.972,100.893,101.130,1783443600000+6*3600000));
console.log('E=100.972 SL=100.893 TP=101.070:', simulate(100.972,100.893,101.070,1783443600000+6*3600000));

// Mon battle: deep-dip Mon 00:00Z. Try golden Mon geometry E=100.940 SL=100.905 TP=101.115
function simulateMon(E:number, SL:number, TP:number, battleMs:number) {
  const dayStart = Date.UTC(2026,6,6);
  const bracket = { start: dayStart+0*3600000, end: dayStart+21*3600000 };
  const activation = Math.max(bracket.start, battleMs);
  const startIdx = simBars.findIndex(b=>b.timestamp>=activation);
  if (startIdx<0) return 'NOTRIG';
  for (let i=startIdx;i<simBars.length;i++){
    const b=simBars[i]!;
    if (b.timestamp>=bracket.end) break;
    if (b.low<=E) {
      for (let j=i;j<simBars.length;j++){
        const x=simBars[j]!;
        if (x.low<=SL) return `LOSS sl@${new Date(x.timestamp).toISOString().slice(0,16)}Z`;
        if (x.high>=TP) return `WIN tp@${new Date(x.timestamp).toISOString().slice(0,16)}Z`;
      }
      return 'OPEN';
    }
  }
  return 'NOTRIG';
}
console.log('\n=== MON LONG candidate geometries (battle Mon 00:00Z) ===');
console.log('E=100.940 SL=100.905 TP=101.115:', simulateMon(100.940,100.905,101.115,1783296000000));
console.log('E=100.940 SL=100.847 TP=101.207:', simulateMon(100.940,100.847,101.207,1783296000000));
console.log('E=100.945 SL=100.905 TP=101.115:', simulateMon(100.945,100.905,101.115,1783296000000));
console.log('E=100.842 SL=100.762 TP=101.207:', simulateMon(100.842,100.762,101.207,1783296000000));
