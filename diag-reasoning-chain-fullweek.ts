/**
 * THE FULL-WEEK DIAG — Machine A (the chain path) over ALL FIVE WEEKDAYS.
 * (The operator's 2026-08-11 directive: "make a surgical change for this exact
 *  working mechanism to run the full week test".)
 *
 * THE SURGICAL DIFFERENCE vs diag-reasoning-chain-golden.ts: the chain input's
 *   `days: ['Monday']` → `days: ['Monday','Tuesday','Wednesday','Thursday','Friday']`
 *   — the SAME E1/E2 construction, the SAME buildReasoningChain, the SAME ADM.
 *
 * THE NON-CHANGES (locked): the checkpoint monday-gold-standard-achieved is
 *   immutable (chmod -R a-w) · the golden diag untouched · Machine B (the
 *   report path) untouched — NOT retired, NOT deleted (the operator decides).
 *
 * THE OUTPUT: the per-day projections (the E/SL/TP/RRR per lane) + the
 *   per-trade outcome simulation (the raw trigger→exit on the real bars).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lockAnalysisPoint, getAnalysisPointMs } from './src/mdve/temporal.js';
import { buildChartModel } from './src/mdve/index.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import { buildReasoningChain } from './src/mdve/reasoning-chain.js';
import type { ReasoningChainInput, PairKey } from './src/mdve/reasoning-chain.js';
import { buildMacroAuthority } from './src/mdve/reasoning-chain.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';

// ═══════════════════════════════════════════════════════════════════════
// THE ANCHOR (the operator's temporal law — the Monday 06:00 pre-London point)
// ═══════════════════════════════════════════════════════════════════════
const ANCHOR_MS = 1783317600000;
const WEEK = '2026-07-06';
lockAnalysisPoint(ANCHOR_MS);

const raw: Array<{ pair: string; timeframe: string; bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> }> =
  JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string, limitMs: number) =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs)
    .map((b) => ({ timestamp: b.timestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume ?? 0 }));

const pip: Record<PairKey, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

// THE FULL-WEEK DAYS (the surgical change — the golden diag runs only Monday).
const FULL_WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ═══════════════════════════════════════════════════════════════════════
// E1 — the models (the SAME construction as the golden diag)
// ═══════════════════════════════════════════════════════════════════════
const models = {} as Record<PairKey, Awaited<ReturnType<typeof buildChartModel>>>;
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as PairKey[]) {
  const spot = barsFor(pair, '1H', ANCHOR_MS).at(-1)?.close ?? 0;
  models[pair] = await buildChartModel(pair, WEEK, barsFor(pair, '1H', ANCHOR_MS), barsFor(pair, '4H', ANCHOR_MS), barsFor(pair, '30m', ANCHOR_MS), spot, undefined, barsFor(pair, '15m', ANCHOR_MS));
  console.log(`[E1] ${pair}: ${models[pair].zones.length} zones · ${models[pair].lmv.table.length} rungs · spot ${spot}`);
}

// ═══════════════════════════════════════════════════════════════════════
// E2 — the prior-week storylines + the E2 CORE (the SAME construction)
// ═══════════════════════════════════════════════════════════════════════
const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as PairKey[]) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: {
      '1H': barsFor(pair, '1H', ANCHOR_MS), '4H': barsFor(pair, '4H', ANCHOR_MS),
      '30m': barsFor(pair, '30m', ANCHOR_MS), '15m': barsFor(pair, '15m', ANCHOR_MS),
    },
    weekStartMs: 1783296000000,   // WEEK_START_MS (the golden diag's constant)
    anchorMs: ANCHOR_MS,
  });
}
const e2 = await buildE2Core(models, priorStorylines);
console.log('[E2] the E2 core built: DXY days', e2.dxyChain?.days?.length ?? 0, '· EU days', e2.euCoreChain?.days?.length ?? 0, '· GU days', e2.guCoreChain?.days?.length ?? 0);
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as PairKey[]) {
  const chain = pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain;
  console.log(`[E2] ${pair} days:`, (chain?.days ?? []).map((d) => `${d.day}:${d.shape}:${d.direction}`).join(' · '));
}

const macro = buildMacroAuthority(models as never, e2, pip);
const shadow = createShadowAgentClient();

// ═══════════════════════════════════════════════════════════════════════
// THE CHAIN INPUT — THE FULL WEEK (the surgical change)
// ═══════════════════════════════════════════════════════════════════════
function buildChainInput(pair: PairKey): ReasoningChainInput | null {
  const model = models[pair];
  if (!model) return null;
  return {
    pair,
    week: WEEK,
    anchorMs: ANCHOR_MS,
    model,
    lmvTable: (model.lmv as unknown as { table: unknown[] }).table,
    e2: {
      dxyChain: e2.dxyChain,
      euCoreChain: e2.euCoreChain,
      guCoreChain: e2.guCoreChain,
      euCascaded: e2.euCascaded,
      guCascaded: e2.guCascaded,
    },
    e2Days: pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain,
    dxySetups: undefined,
    cascade: { eu: undefined, gu: undefined },
    barsByTf: {
      '1H': barsFor(pair, '1H', ANCHOR_MS), '4H': barsFor(pair, '4H', ANCHOR_MS),
      '30m': barsFor(pair, '30m', ANCHOR_MS), '15m': barsFor(pair, '15m', ANCHOR_MS),
    },
    macro: macro[pair]!,
    shadow,
    pip: pip[pair]!,
    atr1hPips: proxyAtr1hPips(model, pip[pair]!),
    days: FULL_WEEK_DAYS, // ← THE FULL WEEK
  };
}

// ═══════════════════════════════════════════════════════════════════════
// THE RUN + THE REPORT
// ═══════════════════════════════════════════════════════════════════════
const allProjections: Array<{ pair: PairKey; day: string; direction: string; E: number; SL: number; TP: number; RRR: number; lane: string }> = [];
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as PairKey[]) {
  const input = buildChainInput(pair);
  if (!input) { console.log(`[CHAIN] ${pair}: the E1 model failed — the honest absence`); continue; }
  const result = await buildReasoningChain(input);
  console.log(`\n=== ${pair} — THE FULL-WEEK PROJECTIONS (${result.projections.length}) ===`);
  for (const p of result.projections) {
    console.log(`  ${p.day} ${p.direction} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)} · ${p.chainContext} · lane ${(p as unknown as { lane?: string }).lane ?? 'n/a'}`);
    allProjections.push({ pair, day: p.day, direction: p.direction, E: p.E, SL: p.SL, TP: p.TP, RRR: p.RRR, lane: (p as unknown as { lane?: string }).lane ?? 'n/a' });
  }
  if (result.failures.length > 0) {
    console.log(`  FAILURES (${result.failures.length}):`, result.failures.map((f) => `${f.pair} ${f.projection?.day ?? '?'} ${f.failureType}`).join(' · '));
  }
  console.log(`  stats: det ${result.stats.deterministicTokens} · llm ${result.stats.llmTokens} · refinements ${result.stats.refinements} · hardThrows ${result.stats.hardThrows}`);
}

// ═══════════════════════════════════════════════════════════════════════
// THE OUTCOME SIMULATION — the raw trigger→exit on the real bars
// (the SAME first-touch semantics as the golden diag's simulateOutcome)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== THE OUTCOME SIMULATION (the raw trigger→exit on the real bars) ===');
let wins = 0, losses = 0, open = 0;
for (const proj of allProjections) {
  const px = pip[proj.pair];
  const bars = barsFor(proj.pair, '1H', Number.MAX_SAFE_INTEGER).filter((b) => b.timestamp > ANCHOR_MS);
  const e = proj.E, sl = proj.SL, tp = proj.TP, d = proj.direction;
  let trig: number | null = null, mae = 0, mfe = 0, outcome = 'OPEN', exitNote = '';
  for (const b of bars) {
    if (trig === null) {
      if (d === 'LONG' && b.low <= e) trig = b.timestamp;
      else if (d === 'SHORT' && b.high >= e) trig = b.timestamp;
      else continue;
    }
    const slHit = d === 'LONG' ? b.low <= sl : b.high >= sl;
    const tpHit = d === 'LONG' ? b.high >= tp : b.low <= tp;
    if (d === 'LONG') { mae = Math.max(mae, (e - b.low) / px); mfe = Math.max(mfe, (b.high - e) / px); }
    else { mae = Math.max(mae, (b.high - e) / px); mfe = Math.max(mfe, (e - b.low) / px); }
    if (slHit && tpHit) { outcome = 'LOSS'; exitNote = 'same-bar (conservative)'; break; }
    if (slHit) { outcome = 'LOSS'; exitNote = 'SL-hit'; break; }
    if (tpHit) { outcome = 'WIN'; exitNote = 'TP-hit'; break; }
  }
  if (outcome === 'WIN') wins++;
  else if (outcome === 'LOSS') losses++;
  else open++;
  console.log(`  ${proj.pair} ${proj.day} ${proj.direction} E ${e.toFixed(5)} → ${outcome}${exitNote ? ' (' + exitNote + ')' : ''} · MAE ${mae.toFixed(1)}p · MFE ${mfe.toFixed(1)}p`);
}
console.log(`\n=== THE FULL-WEEK TALLY: ${wins} WINS · ${losses} LOSSES · ${open} OPEN (of ${allProjections.length} projections) ===`);
