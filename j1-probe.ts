// PROBE — the fixture run's rejection anatomy (Wave J1 pre-build probe)
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000;
const WEEK = '2026-07-06';
const raw: { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null }[] =
  JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= ANCHOR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => {
  const b = barsFor(p, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};
const dxySetups = generateSourceSetupsV45(models.DXY);
const rejects: string[] = [];
const dxySetups2 = generateSourceSetupsV45(models.DXY, {
  onReject: (rej) => rejects.push(`[SRC-REJECT] ${rej.reason}: ${rej.detail}`),
});
console.log(`dxy source setups: ${dxySetups.length} (with onReject: ${dxySetups2.length}), source rejects: ${rejects.length}`);
for (const r of rejects) console.log(r);
const e2 = await buildE2Core(models);
const shapeChains = e2.euCoreChain && e2.guCoreChain
  ? { ...(e2.dxyChain ? { dxy: e2.dxyChain } : {}), eu: e2.euCoreChain, gu: e2.guCoreChain }
  : null;
const cascade = cascadeV45(dxySetups, models, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: { eu: e2.euCascaded, gu: e2.guCascaded },
});
console.log('\n=== DISCARDED MIRRORS ===');
console.log(`eu=${cascade.eu.length} gu=${cascade.gu.length} discarded=${cascade.discarded.length} failedAnchors=${cascade.failedAnchors.length}`);
for (const m of cascade.discarded) {
  console.log(`[${m.pair}] ${m.status} src=${m.sourceSetupId} dir=${m.direction} day=${m.tradeDay ?? '-'} rrr=${m.rrr}`);
  console.log(`    reason: ${m.discardReason}`);
  console.log(`    auditCard: ${m.auditCard ? `verdict=${m.auditCard.verdict} trig=${m.auditCard.hallucinationTrigger}` : 'NONE'}`);
}
console.log('\n=== FAILED ANCHORS ===');
for (const f of cascade.failedAnchors) console.log(`[${f.targetPair}] ${f.sourceId}: ${f.reason}`);
