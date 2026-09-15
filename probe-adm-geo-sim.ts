/**
 * ADM-GEO-SIM — simulate BOTH geometries (the chain's emission vs the ADM's
 * own resolveTp) against the real post-anchor bars for the DXY LONG.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { resolveOperativeZone, type ReasoningChainInput } from './src/mdve/reasoning-chain.js';
import { anchorTrade, type AdmInput } from './src/mdve/anchor-decision-machine.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';

interface RawFeed { pair: string; timeframe: string; bars: {timestamp:number;open:number;high:number;low:number;close:number}[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;
const barsFor=(p:string,tf:string,lim:number)=>(raw.find(r=>r.pair===p&&r.timeframe===tf)?.bars??[]).filter(b=>b.timestamp<=lim).sort((a,b)=>a.timestamp-b.timestamp);
const spotFor=(p:string,lim:number)=>{const b=barsFor(p,'1H',lim);return b.length?b[b.length-1]!.close:0;};
const models: Record<string, any> = {
  DXY: buildChartModel('DXY',WEEK,gateBars(barsFor('DXY','1H',ANCHOR_MS)),gateBars(barsFor('DXY','4H',ANCHOR_MS)),gateBars(barsFor('DXY','30m',ANCHOR_MS)),spotFor('DXY',ANCHOR_MS),undefined,gateBars(barsFor('DXY','15m',ANCHOR_MS))),
  'EUR/USD': buildChartModel('EUR/USD',WEEK,gateBars(barsFor('EUR/USD','1H',ANCHOR_MS)),gateBars(barsFor('EUR/USD','4H',ANCHOR_MS)),gateBars(barsFor('EUR/USD','30m',ANCHOR_MS)),spotFor('EUR/USD',ANCHOR_MS),undefined,gateBars(barsFor('EUR/USD','15m',ANCHOR_MS))),
  'GBP/USD': buildChartModel('GBP/USD',WEEK,gateBars(barsFor('GBP/USD','1H',ANCHOR_MS)),gateBars(barsFor('GBP/USD','4H',ANCHOR_MS)),gateBars(barsFor('GBP/USD','30m',ANCHOR_MS)),spotFor('GBP/USD',ANCHOR_MS),undefined,gateBars(barsFor('GBP/USD','15m',ANCHOR_MS))),
};
const pip = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const nativeSetups = { DXY: generateSourceSetupsV45(models.DXY), 'EUR/USD': generateSourceSetupsV45(models['EUR/USD']), 'GBP/USD': generateSourceSetupsV45(models['GBP/USD']) };
const priorStorylines: Record<string, any> = {};
for (const pair of ['DXY','EUR/USD','GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, { barsByTf: { '1H': gateBars(barsFor(pair,'1H',ANCHOR_MS)), '4H': gateBars(barsFor(pair,'4H',ANCHOR_MS)), '30m': gateBars(barsFor(pair,'30m',ANCHOR_MS)), '15m': gateBars(barsFor(pair,'15m',ANCHOR_MS)) }, weekStartMs: WEEK_START_MS, anchorMs: ANCHOR_MS });
}
const e2 = await buildE2Core(models, priorStorylines);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = await cascadeV45(nativeSetups.DXY, models, { v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true }, shapeChains, translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined });
const shadow = createShadowAgentClient();
const input: ReasoningChainInput = {
  pair: 'DXY', week: WEEK, anchorMs: ANCHOR_MS, model: models.DXY,
  lmvTable: (models.DXY.lmv as any).table,
  e2: { dxyChain: e2.dxyChain, euCoreChain: e2.euCoreChain, guCoreChain: e2.guCoreChain, euCascaded: e2.euCascaded, guCascaded: e2.guCascaded },
  e2Days: e2.dxyChain, dxySetups: nativeSetups.DXY, cascade: { eu: cascade.eu, gu: cascade.gu },
  barsByTf: { '1H': barsFor('DXY','1H',ANCHOR_MS), '4H': barsFor('DXY','4H',ANCHOR_MS), '30m': barsFor('DXY','30m',ANCHOR_MS), '15m': barsFor('DXY','15m',ANCHOR_MS) },
  macro: { direction: 'SHORT', mirrorPair: 'EUR/USD', inverted: true, source: 'probe' },
  shadow, pip: 0.01, atr1hPips: proxyAtr1hPips(models.DXY, 0.01), days: ['Monday'],
};

const zone = resolveOperativeZone(input.model, 'DXY', 'DXY|1H|1782108000000|100.860')!;
console.log('receiving zone:', zone.id, `[${zone.floor} - ${zone.ceiling}]`);
const chainedEntry = 100.918;
const admInput: AdmInput = {
  model: input.model.zones, lmvTable: input.model.lmv.table, pair: 'DXY', pip: 0.01,
  operativeZone: zone, direction: 'LONG', dayOpenSpot: 101.048, priorTp: chainedEntry,
  e1ZoneId: zone.id, e2ProjectionId: 'DXY|Monday|SS|LONG', atr1hPips: input.atr1hPips,
};
const adm = anchorTrade(admInput);
console.log(`ADM: verdict ${adm.verdict}${adm.verdict==='REJECT'?` ${adm.rejectReason}`:''} E ${adm.entry.toFixed(5)} SL ${adm.sl.toFixed(5)} TP ${adm.tp.toFixed(5)} RRR ${adm.rrr.toFixed(2)}`);
console.log(`ADM tpMethod: ${adm.tpMethod}`);
console.log(`ADM slMethod: ${adm.slMethod}`);

function simulate(E: number, SL: number, TP: number, dir: string): { outcome: string; trig: string; exit: string; mae: number; mfe: number; r: number | null } {
  const bars = barsFor('DXY', '1H', Number.MAX_SAFE_INTEGER);
  if (dir === 'LONG' && !(SL < E && E < TP)) return { outcome: 'INVALID', trig: '-', exit: '-', mae: 0, mfe: 0, r: null };
  let trig: number | null = null; let mae = 0; let mfe = 0;
  for (const b of bars) {
    if (b.timestamp <= ANCHOR_MS) continue;
    if (trig === null) {
      if (dir === 'LONG' && b.low <= E) trig = b.timestamp; else continue;
    }
    const slHit = dir === 'LONG' ? b.low <= SL : b.high >= SL;
    const tpHit = dir === 'LONG' ? b.high >= TP : b.low <= TP;
    if (dir === 'LONG') { mae = Math.max(mae, (E - b.low) / 0.01); mfe = Math.max(mfe, (b.high - E) / 0.01); }
    if (slHit && tpHit) return { outcome: 'LOSS', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: -1 };
    if (slHit) return { outcome: 'LOSS', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: -1 };
    if (tpHit) return { outcome: 'WIN', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: Math.abs(TP - E) / Math.abs(E - SL) };
  }
  return { outcome: 'OPEN', trig: trig ? new Date(trig).toISOString() : '-', exit: '-', mae, mfe, r: null };
}

console.log('\nADM geometry sim:');
const s1 = simulate(adm.entry, adm.sl, adm.tp, 'LONG');
console.log(`  E ${adm.entry.toFixed(5)} SL ${adm.sl.toFixed(5)} TP ${adm.tp.toFixed(5)} RRR ${adm.rrr.toFixed(2)} -> ${s1.outcome} r ${s1.r !== null ? s1.r.toFixed(2) + 'R' : '-'} trig ${s1.trig} exit ${s1.exit} MAE ${s1.mae.toFixed(1)}p MFE ${s1.mfe.toFixed(1)}p`);

console.log('\nChain emission geometry sim:');
const s2 = simulate(100.918, 100.83267, 101.24000, 'LONG');
console.log(`  E 100.91800 SL 100.83267 TP 101.24000 RRR 3.77 -> ${s2.outcome} r ${s2.r !== null ? s2.r.toFixed(2) + 'R' : '-'} trig ${s2.trig} exit ${s2.exit} MAE ${s2.mae.toFixed(1)}p MFE ${s2.mfe.toFixed(1)}p`);

console.log('\nHybrid (ADM entry+SL, chain TP) sim:');
const s3 = simulate(adm.entry, adm.sl, 101.24000, 'LONG');
console.log(`  E ${adm.entry.toFixed(5)} SL ${adm.sl.toFixed(5)} TP 101.24000 -> ${s3.outcome} r ${s3.r !== null ? s3.r.toFixed(2) + 'R' : '-'} exit ${s3.exit} MAE ${s3.mae.toFixed(1)}p MFE ${s3.mfe.toFixed(1)}p`);
