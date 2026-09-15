import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { pillarEngine } from './src/brains/9-pillar-lobe.js';
import { zfpFromConfluence6D } from './src/brains/9-pillar-lobe.js';
import { PIP_VALUE } from './src/types.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const dxy = buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m'));
const pipValue = PIP_VALUE['DXY'] ?? 0.01;
const pr = pillarEngine({ instrument: 'DXY', bars: barsFor('DXY','1H'), currentPrice: dxy.spot });
const zfp = zfpFromConfluence6D(pr.compositeScore);
const spot = dxy.spot;
const ipZones = pr.levels
  .filter((lvl: any) => !String(lvl.source).includes('OTC'))
  .map((lvl: any) => {
    const isSupply = lvl.price > spot;
    const z: any = {
      id: `IP|DXY|${lvl.price.toFixed(5)}`,
      type: isSupply ? 'SUPPLY' : 'DEMAND',
      top: lvl.price + pipValue * 10, bottom: lvl.price,
      timeframe: '1H', classification: 'MoM',
      formationMs: dxy.anchor.anchorMs, freshness: 'FRESH',
      reactionEvents: [], zfp, confluence: pr.compositeScore,
    };
    z.source = 'PILLAR'; z.ipZone = true;
    return z;
  });
dxy.zones = [...dxy.zones, ...ipZones];
const setups = generateSourceSetupsV45(dxy);
console.log(`=== pillar-model setups (${setups.length}) ===`);
for (const s of setups) console.log(`${s.setupId} ${s.direction} E=${s.entry.toFixed(5)} SL=${s.sl.toFixed(5)} TP=${s.tp.toFixed(5)} rrr=${s.rrr.toFixed(2)} ${s.day} ${s.shapeTrigger}`);
