/**
 * PROBE-WADM5-DIAG — the W-ADM-5 OUTCOME-SIDE diagnosis: the three losing
 * lanes' FULL geometry (E/SL/TP/RRR + the SL method + the TP method + the
 * measurements + the containing-zone resolution + the reaction history).
 * Read-only instrumentation; NO source changes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildReasoningChain,
  buildMacroAuthority,
  resolveOperativeZone,
  zoneToOperative,
  rungToOperative,
  isDegenerateRung,
  type ReasoningChainInput,
  type TradeProjection,
  type PairKey,
  type Direction,
  type OperativeZone,
} from './src/mdve/reasoning-chain.js';
import {
  containingStructuralZone,
  measureDefendedExtreme,
  measureReactionWickExtreme,
  measureWickDispersion,
  measureZoneWidthScale,
  measureNestingDepth,
  resolveSlDepth,
  resolveTp,
  resolveEntry,
  anchorTrade,
  type AdmInput,
} from './src/mdve/anchor-decision-machine.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import type { OHLCBar } from './src/types.js';
import type { ChartModel } from './src/mdve/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';

const ANCHOR_MS = 1783317600000;
lockRunAnchor(ANCHOR_MS);
const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));

const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string, limitMs: number): number => {
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

const models: Record<PairKey, ChartModel> = {
  DXY: buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))),
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
    barsByTf: {
      '1H': gateBars(barsFor(pair, '1H', ANCHOR_MS)), '4H': gateBars(barsFor(pair, '4H', ANCHOR_MS)),
      '30m': gateBars(barsFor(pair, '30m', ANCHOR_MS)), '15m': gateBars(barsFor(pair, '15m', ANCHOR_MS)),
    },
    weekStartMs: WEEK_START_MS,
    anchorMs: ANCHOR_MS,
  });
}

const e2 = await buildE2Core(models as never, priorStorylines as never);
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = await cascadeV45(nativeSetups.DXY, models as never, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
});
const macro = buildMacroAuthority(models as never, e2, pip);

const e2DaysFor = (pair: PairKey) =>
  pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain;
const shadow = createShadowAgentClient();

function buildChainInput(pair: PairKey, limitMs: number = ANCHOR_MS): ReasoningChainInput {
  const model = models[pair];
  return {
    pair, week: WEEK, anchorMs: limitMs, model,
    lmvTable: (model.lmv as unknown as { table: LqzZoneMatrix[] }).table,
    e2: { dxyChain: e2.dxyChain, euCoreChain: e2.euCoreChain, guCoreChain: e2.guCoreChain, euCascaded: e2.euCascaded, guCascaded: e2.guCascaded },
    e2Days: e2DaysFor(pair),
    dxySetups: nativeSetups.DXY,
    cascade: { eu: cascade.eu, gu: cascade.gu },
    barsByTf: {
      '1H': barsFor(pair, '1H', limitMs), '4H': barsFor(pair, '4H', limitMs),
      '30m': barsFor(pair, '30m', limitMs), '15m': barsFor(pair, '15m', limitMs),
    },
    macro: macro[pair],
    shadow, pip: pip[pair],
    atr1hPips: proxyAtr1hPips(model, pip[pair]),
    days: ['Monday'],
  };
}

// ═══ THE CHAIN RUNS (parallel, the diag's primary topology) ═══
const runs = await Promise.all(['DXY', 'EUR/USD', 'GBP/USD'].map((p) => buildReasoningChain(buildChainInput(p as PairKey))));

function simulate(E: number, SL: number, TP: number, dir: Direction, pair: PairKey): { outcome: string; trig: string; exit: string; mae: number; mfe: number; r: number | null } {
  const px = pip[pair];
  const bars = barsFor(pair, '1H', Number.MAX_SAFE_INTEGER);
  if (dir === 'LONG' && !(SL < E && E < TP)) return { outcome: 'INVALID', trig: '-', exit: '-', mae: 0, mfe: 0, r: null };
  if (dir === 'SHORT' && !(TP < E && E < SL)) return { outcome: 'INVALID', trig: '-', exit: '-', mae: 0, mfe: 0, r: null };
  let trig: number | null = null; let mae = 0; let mfe = 0;
  for (const b of bars) {
    if (b.timestamp <= ANCHOR_MS) continue;
    if (trig === null) {
      if (dir === 'LONG' && b.low <= E) trig = b.timestamp;
      else if (dir === 'SHORT' && b.high >= E) trig = b.timestamp;
      else continue;
    }
    const slHit = dir === 'LONG' ? b.low <= SL : b.high >= SL;
    const tpHit = dir === 'LONG' ? b.high >= TP : b.low <= TP;
    if (dir === 'LONG') { mae = Math.max(mae, (E - b.low) / px); mfe = Math.max(mfe, (b.high - E) / px); }
    else { mae = Math.max(mae, (b.high - E) / px); mfe = Math.max(mfe, (E - b.low) / px); }
    if (slHit && tpHit) return { outcome: 'LOSS', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: -1 };
    if (slHit) return { outcome: 'LOSS', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: -1 };
    if (tpHit) return { outcome: 'WIN', trig: new Date(trig).toISOString(), exit: new Date(b.timestamp).toISOString(), mae, mfe, r: Math.abs(TP - E) / Math.abs(E - SL) };
  }
  return { outcome: 'OPEN', trig: trig ? new Date(trig).toISOString() : '-', exit: '-', mae, mfe, r: null };
}

console.log('\n════════ THE EMITTED PROJECTIONS + THE OUTCOME SIMS ════════');
for (const r of runs) {
  for (const p of r.projections) {
    const s = simulate(p.E, p.SL, p.TP, p.direction, p.pair);
    const slA = p.anchors.find((a) => a.role === 'SL');
    const tpA = p.anchors.find((a) => a.role === 'TP');
    console.log(`${p.pair.padEnd(7)} ${p.direction.padEnd(5)} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)}`);
    console.log(`    zone ${p.entryZoneId} | E2 ${p.e2ProjectionId} | src ${p.source}`);
    console.log(`    SL: ${slA?.method}`);
    console.log(`    TP: ${tpA?.method}`);
    console.log(`    SIM: ${s.outcome} r ${s.r !== null ? s.r.toFixed(2) : '-'} | trig ${s.trig} exit ${s.exit} MAE ${s.mae.toFixed(1)}p MFE ${s.mfe.toFixed(1)}p`);
  }
}

// ═══ THE MODEL ZONES + REACTIONS (the measurement substrate) ═══
console.log('\n════════ THE MODEL ZONES (S/D) + REACTION EVENTS ════════');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const m = models[pair];
  console.log(`\n--- ${pair} zones (${m.zones.length}) — 4H/1H/30m — spot ${m.spot.toFixed(5)} ---`);
  for (const z of m.zones) {
    const evs = (z.reactionEvents ?? []) as Array<{ lastTouchMs: number; price: number; anatomy?: string }>;
    const evStr = evs.map((e) => `${new Date(e.lastTouchMs).toISOString().slice(5, 16)}@${e.price.toFixed(5)}`).join(' ');
    console.log(`  ${z.type.padEnd(6)} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.classification} ${z.timeframe} frm ${z.formationMs ? new Date(z.formationMs).toISOString().slice(5, 10) : '?'} reactions=${evs.length}${evs.length ? '  ' + evStr : ''}`);
  }
}

// ═══ THE LMV TABLE (the rungs) ═══
console.log('\n════════ THE LMV TABLE (the rungs) ════════');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const table = (models[pair].lmv as unknown as { table: LqzZoneMatrix[] }).table;
  console.log(`\n--- ${pair} rungs (${table.length}) ---`);
  for (const r of table) {
    const w = (r.top - r.bottom) / pip[pair];
    const deg = isDegenerateRung(r, pair) ? ' DEG' : '';
    console.log(`  ${r.side.padEnd(10)} [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] ctr ${r.center.toFixed(5)} w ${w.toFixed(1)}p zfp ${r.zfp} defEdge ${r.defendedEdge?.toFixed(5) ?? '-'}${deg}`);
  }
}

// ═══ THE GU LONG: the containing-zone resolution trace ═══
console.log('\n════════ THE GU LONG — THE CONTAINING-ZONE RESOLUTION ════════');
{
  const model = models['GBP/USD'];
  const input = buildChainInput('GBP/USD');
  const e2Day = input.e2Days?.days?.[0];
  console.log(`E2 day ${e2Day?.day} shape ${e2Day?.shape} dir ${e2Day?.direction} demandZoneId ${e2Day?.demandZoneId}`);
  const z = resolveOperativeZone(model, 'GBP/USD', e2Day?.demandZoneId ?? undefined);
  if (z) {
    console.log(`operative zone: ${z.id} [${z.floor.toFixed(5)}-${z.ceiling.toFixed(5)}] type ${z.type} class ${z.classification} reactions ${z.reactionCount}`);
    const containing = containingStructuralZone(z, model.zones);
    console.log(`containing structural zone: ${containing ? `${containing.id} [${containing.bottom.toFixed(5)}-${containing.top.toFixed(5)}] reactions ${(containing.reactionEvents ?? []).length}` : 'NONE'}`);
    const defended = measureDefendedExtreme(z, 'LONG');
    console.log(`m5 defended extreme (operative): ${defended.present ? defended.value.toFixed(5) : 'absent'} — ${defended.evidence.join('; ')}`);
    if (containing) {
      const cOp = zoneToOperative(containing);
      const defendedC = measureDefendedExtreme(cOp, 'LONG');
      console.log(`m5 defended extreme (containing): ${defendedC.present ? defendedC.value.toFixed(5) : 'absent'} — ${defendedC.evidence.join('; ')}`);
      const evs = (containing.reactionEvents ?? []) as Array<{ lastTouchMs: number; price: number; anatomy?: string }>;
      for (const e of evs) console.log(`    containing reaction ${new Date(e.lastTouchMs).toISOString()} @ ${e.price.toFixed(5)} anatomy ${e.anatomy ?? '?'}`);
    }
    const m1 = measureReactionWickExtreme(z, 'LONG', ANCHOR_MS);
    const m2 = measureWickDispersion(z, 'LONG', ANCHOR_MS, pip['GBP/USD']);
    const m3 = measureZoneWidthScale(z, model.zones, pip['GBP/USD'], input.atr1hPips);
    const m4 = measureNestingDepth(z, model.zones, 'LONG', ANCHOR_MS, pip['GBP/USD']);
    console.log(`m1 wick: ${m1.present ? m1.value.toFixed(5) : 'absent'} · m2 disp: ${m2.present ? m2.value.toFixed(2) + 'p' : 'absent'} · m3 width: ${m3.value.toFixed(2)}p · m4 nesting: ${m4.present ? m4.value.toFixed(2) + 'p' : 'absent'}`);
    const slRes = resolveSlDepth(z, 'LONG', model.zones, pip['GBP/USD'], ANCHOR_MS, input.atr1hPips, 1.33560, 1.33343);
    console.log(`resolveSlDepth depth ${slRes.depthPips.toFixed(2)}p entryLever ${slRes.entryLever} method ${slRes.method}`);
    // The chain's actual SL: entry inside zone → entry - depth
    console.log(`chain SL = entry 1.33343 - ${slRes.depthPips.toFixed(2)}p = ${(1.33343 - slRes.depthPips * 0.0001).toFixed(5)}`);
    // The ADM's own SL (anchorTrade full)
    const admInput: AdmInput = {
      model: model.zones, lmvTable: input.lmvTable, pair: 'GBP/USD', pip: pip['GBP/USD'],
      operativeZone: z, direction: 'LONG', dayOpenSpot: e2Day?.dayOpenSpot ?? model.spot,
      e1ZoneId: z.id, e2ProjectionId: 'GBP/USD|Monday|SS|LONG', atr1hPips: input.atr1hPips,
    };
    const adm = anchorTrade(admInput);
    console.log(`ADM anchorTrade: ${adm.verdict}${adm.verdict === 'REJECT' ? ' ' + adm.rejectReason : ''} E ${adm.entry.toFixed(5)} SL ${adm.sl.toFixed(5)} TP ${adm.tp.toFixed(5)} RRR ${adm.rrr.toFixed(2)}`);
    console.log(`  SL method: ${adm.slMethod}`);
    console.log(`  TP method: ${adm.tpMethod}`);
  }
}

// ═══ THE DXY LONG: the TP walk candidates ═══
console.log('\n════════ THE DXY LONG — THE TP WALK CANDIDATES ════════');
{
  const model = models.DXY;
  const input = buildChainInput('DXY');
  const e2Day = input.e2Days?.days?.[0];
  const zone = resolveOperativeZone(model, 'DXY', 'DXY|1H|1782108000000|100.860');
  if (zone) {
    console.log(`operative zone: ${zone.id} [${zone.floor.toFixed(5)}-${zone.ceiling.toFixed(5)}]`);
    const containing = containingStructuralZone(zone, model.zones);
    console.log(`containing: ${containing ? containing.id + ' [' + containing.bottom.toFixed(5) + '-' + containing.top.toFixed(5) + ']' : 'NONE'}`);
    const opposingSupplies = model.zones
      .filter((z2) => z2.type === 'SUPPLY' && z2.bottom > zone.ceiling)
      .sort((a, b) => a.bottom - b.bottom);
    console.log(`opposing SUPPLY zones above ${zone.ceiling.toFixed(5)}:`);
    for (const z2 of opposingSupplies) console.log(`  ${z2.id} [${z2.bottom.toFixed(5)}-${z2.top.toFixed(5)}] reactions ${(z2.reactionEvents ?? []).length}`);
    const tpRes = resolveTp(zone, 'LONG', input.lmvTable, pip.DXY, model.zones, 100.918);
    console.log(`ADM resolveTp: ${tpRes ? `tp ${tpRes.tp.toFixed(5)} ${tpRes.method}` : 'null (NO_STRUCTURAL_TP)'} — ${tpRes ? tpRes.measurement.evidence.join('; ') : ''}`);
    // The continuation targets
    const supZones = model.zones.filter((z2) => z2.type === 'SUPPLY' && z2.bottom > zone.ceiling).map((z2) => z2.bottom);
    console.log(`continuation candidates (supply bottoms): ${[...new Set(supZones)].sort((a, b) => a - b).map((v) => v.toFixed(5)).join(' ')}`);
  }
}

// ═══ THE EU LONG: the TP walk candidates ═══
console.log('\n════════ THE EU LONG — THE TP WALK CANDIDATES ════════');
{
  const model = models['EUR/USD'];
  const input = buildChainInput('EUR/USD');
  const e2Day = input.e2Days?.days?.[0];
  const longZone = resolveOperativeZone(model, 'EUR/USD', e2Day?.demandZoneId ?? undefined);
  console.log(`E2 day ${e2Day?.day} shape ${e2Day?.shape} dir ${e2Day?.direction} demandZoneId ${e2Day?.demandZoneId}`);
  if (longZone) {
    console.log(`operative zone: ${longZone.id} [${longZone.floor.toFixed(5)}-${longZone.ceiling.toFixed(5)}]`);
    const opposingSupplies = model.zones
      .filter((z2) => z2.type === 'SUPPLY' && z2.bottom > longZone.ceiling)
      .sort((a, b) => a.bottom - b.bottom);
    console.log(`opposing SUPPLY zones above ${longZone.ceiling.toFixed(5)}:`);
    for (const z2 of opposingSupplies) console.log(`  ${z2.id} [${z2.bottom.toFixed(5)}-${z2.top.toFixed(5)}] reactions ${(z2.reactionEvents ?? []).length}`);
    const tpRes = resolveTp(longZone, 'LONG', input.lmvTable, pip['EUR/USD'], model.zones, 1.14095);
    console.log(`ADM resolveTp: ${tpRes ? `tp ${tpRes.tp.toFixed(5)} ${tpRes.method}` : 'null (NO_STRUCTURAL_TP)'} — ${tpRes ? tpRes.measurement.evidence.join('; ') : ''}`);
    // the rung-only candidates
    const seRungs = input.lmvTable
      .filter((r) => r.side === 'SELL_SIDE' && r.bottom > longZone.ceiling && !isDegenerateRung(r, 'EUR/USD'))
      .sort((a, b) => a.bottom - b.bottom);
    console.log(`SELL_SIDE rungs above the ceiling:`);
    for (const r of seRungs) console.log(`  [${r.bottom.toFixed(5)}-${r.top.toFixed(5)}] ctr ${r.center.toFixed(5)} defEdge ${r.defendedEdge?.toFixed(5) ?? '-'}`);
    const slRes = resolveSlDepth(longZone, 'LONG', model.zones, pip['EUR/USD'], ANCHOR_MS, input.atr1hPips, 1.14480, 1.14095);
    console.log(`resolveSlDepth depth ${slRes.depthPips.toFixed(2)}p entryLever ${slRes.entryLever} — ${slRes.method}`);
  }
}

// ═══ THE REAL-BAR OUTCOME WINDOWS (post-anchor extremes per pair) ═══
console.log('\n════════ THE REAL-BAR EXTREMES (post-anchor 1H) ════════');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const bars = barsFor(pair, '1H', Number.MAX_SAFE_INTEGER).filter((b) => b.timestamp > ANCHOR_MS);
  const maxH = Math.max(...bars.map((b) => b.high));
  const minL = Math.min(...bars.map((b) => b.low));
  const first = bars[0];
  const last = bars[bars.length - 1];
  console.log(`${pair}: post-anchor bars ${bars.length} | high ${maxH.toFixed(5)} low ${minL.toFixed(5)} | first ${first ? new Date(first.timestamp).toISOString() : '?'} last ${last ? new Date(last.timestamp).toISOString() : '?'}`);
}
