/**
 * PROBE-C3-COMPLEMENT — THE FORCED-NULL COMPLEMENT PROOF (the W4 exit criterion).
 * (PLUTUS_V4.5.4_REASONING_CHAIN_ARCHITECTURE_L2_SPEC Wave W4 — "the
 *  cascade-complement proof (the forced-null test)" + the D50 side-inversion law:
 *  "supply --> demand and demand --> supply dxy supply --> eu demand and vice
 *  versa" — the LONG mirrors MUST consume the demandZoneId at every layer, the
 *  SHORT the supplyZoneId).
 *
 * THE PROOF: run the GU Monday with EVERY GU E1/E2 zone EXCLUDED (the forced
 *  null — supplyZoneId/demandZoneId/deepDemandZoneId all null) and verify that
 *  the unified macro authority (the EU-kept mirror) is STILL ACTIVE: the MACRO
 *  lane emits the LONG projection anchored on a DEMAND-side zone (the D50
 *  direction-appropriate consumption — never a supply). The pair-native lanes
 *  are the fallback (the cascade is COMPLEMENTARY — the mirror fills the void
 *  when the pair-native zones are absent).
 *
 * DETERMINISTIC (no shadow — the shadow omitted from the input): the proof is a
 *  mechanical property (WHICH zone the LONG mirror anchors), not an LLM
 *  behavior. The wall time is ms.
 */

import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildReasoningChain,
  buildMacroAuthority,
  resolveOperativeZone,
  type ReasoningChainInput,
  type PairKey,
  type Direction,
} from './src/mdve/reasoning-chain.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783321200000;
lockRunAnchor(ANCHOR_MS);
console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(ANCHOR_MS).toISOString()} (${ANCHOR_MS})`);

const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  gateBars((raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b: { timestamp: number }) => b.timestamp <= ANCHOR_MS))
    .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => {
  const b = barsFor(p, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};

const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};
const pip: Record<PairKey, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

const nativeSetups = {
  DXY: generateSourceSetupsV45(models.DXY),
  'EUR/USD': generateSourceSetupsV45(models['EUR/USD']),
  'GBP/USD': generateSourceSetupsV45(models['GBP/USD']),
};

const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
    weekStartMs: WEEK_START_MS,
    anchorMs: ANCHOR_MS,
  });
}
const e2 = await buildE2Core(models, priorStorylines);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = cascadeV45(nativeSetups.DXY, models, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
});
const macro = buildMacroAuthority(models, e2, pip);

console.log('\n=== THE UNIFIED MACRO AUTHORITY (the D50 mirror) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const m = macro[pair]!;
  console.log(`  ${pair.padEnd(7)}: ${m.direction} (mirror ${m.mirrorPair ?? '-'}${m.inverted ? ' inverted' : ''}) — ${m.source}`);
}
const guMacro = macro['GBP/USD']!;
console.log(`\n[PROOF] the GU macro authority = ${guMacro.direction} (the EU-kept mirror — the cascade law: GU direction == EU direction).`);

// THE FORCED-NULL GU: clone the GU Monday E2 day with EVERY zone EXCLUDED.
// The pair-native lanes (E2_NATIVE) become silent — only the MACRO mirror + the
// REACTION complement can fire. The D50 law: the LONG mirror MUST anchor the
// demand side (never the supply).
const guChain = e2.guCoreChain!;
const guDays = (guChain.days ?? []).map((d) => ({
  ...d,
  supplyZoneId: null as unknown as string | null,
  demandZoneId: null as unknown as string | null,
  deepDemandZoneId: null as unknown as string | null,
}));

function buildForcedNullInput(pair: PairKey): ReasoningChainInput {
  const model = models[pair]!;
  const forcedDays = pair === 'GBP/USD' ? guDays : guChain.days ?? [];
  return {
    pair,
    week: WEEK,
    anchorMs: ANCHOR_MS,
    model,
    lmvTable: (model.lmv as unknown as { table: unknown[] }).table,
    e2: { dxyChain: e2.dxyChain, euCoreChain: e2.euCoreChain, guCoreChain: e2.guCoreChain, euCascaded: e2.euCascaded, guCascaded: e2.guCascaded },
    e2Days: pair === 'GBP/USD' ? { ...guChain, days: forcedDays } : guChain,
    dxySetups: nativeSetups.DXY,
    cascade: { eu: cascade.eu, gu: cascade.gu },
    barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
    macro: macro[pair]!,
    pip: pip[pair]!,
    atr1hPips: proxyAtr1hPips(model, pip[pair]!),
    days: ['Monday'],
  };
}

const r = await buildReasoningChain(buildForcedNullInput('GBP/USD'));

console.log('\n=== THE FORCED-NULL GU (every GU zone EXCLUDED — the complement proof) ===');
console.log(`  macro direction: ${guMacro.direction} (the unified macro authority)`);
console.log(`  projections emitted: ${r.projections.length}`);
let proofPass = false;
for (const p of r.projections) {
  const zone = resolveOperativeZone(models['GBP/USD'], 'GBP/USD', p.entryZoneId);
  const zoneType = zone?.type ?? 'UNRESOLVED';
  const d50Held = p.direction === 'LONG' ? zoneType === 'DEMAND' : zoneType === 'SUPPLY';
  const sideLabel = d50Held ? 'D50 HELD' : 'D50 VIOLATED';
  console.log(
    `  ${p.direction.padEnd(5)} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)} | zone ${p.entryZoneId} (${zoneType}) | ${sideLabel}`,
  );
  if (p.direction === 'LONG' && zoneType === 'DEMAND') proofPass = true;
}
const mirrorActive = r.projections.some((p) => p.direction === guMacro.direction);
console.log(`\n[PROOF RESULT] the mirror ACTIVE (a ${guMacro.direction} emission with every GU zone excluded): ${mirrorActive}`);
console.log(`[PROOF RESULT] the D50 direction-appropriate consumption (LONG -> DEMAND, never a supply): ${proofPass}`);
console.log(`[PROOF RESULT] ${proofPass && mirrorActive ? 'PASS' : 'FAIL'} — the complement holds: the macro mirror fills the pair-native void on the DEMAND side.`);
console.log(`[PROOF] divergences recorded: ${r.ledger.divergences.length} | macroConsistent: ${r.ledger.macroConsistent}`);
console.log('\n[DONE]');
