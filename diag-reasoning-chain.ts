/**
 * DIAG-REASONING-CHAIN — the Monday-anchored run with the REASONING CHAIN active.
 * (PLUTUS_V4.5.4_REASONING_CHAIN_L1_SPEC §12.3 + §16 — the diagnostic; the
 *  golden gate diag-reasoning-chain-golden.ts is a LATER wave — this diag prints
 *  the TradeProjections + the validation verdicts + the failure synthesis.)
 *
 * THE PIPELINE PATH (the diag-monday.ts harness): the models (E1) → the native
 *   setups → the prior-week storylines → buildE2Core (E2) → cascadeV45 → THE
 *   REASONING CHAIN (the 11-token sequence, per pair) → the TradeProjections →
 *   the validation verdicts → the failure synthesis.
 *
 * THE MEASUREMENT ORACLE: the Monday goldens exist ONLY here (the acceptance
 *   oracle — never a pipeline input). The 1783321200000 anchor is the run input.
 *
 * THE SHADOW AGENT: created via createShadowAgentClient — the deepseek v4 flash
 *   call is ATTEMPTED; the honest availability + lastError are reported; the
 *   deterministic fallback ALWAYS runs (the chain never hangs).
 */

import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildReasoningChain,
  buildMacroAuthority,
  type ReasoningChainInput,
  type TradeProjection,
  type PairKey,
  type Direction,
} from './src/mdve/reasoning-chain.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import { synthesizeFailures, formatSynthesis, failuresForWeek } from './src/mdve/failure-store.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

// ═══ THE MONDAY RUN ANCHOR — LOCKED FIRST (the operator's temporal law:
//   today = 2026-07-06 07:00 UTC (1783321200000); every bar past it is
//   physically DROPPED by the gate — no forward looking, ever) ═══
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

// THE MONDAY GOLDENS — the MEASUREMENT ORACLE ONLY (the hardcode ban holds:
//   the golden levels never enter the chain's computation input).
const GOLDEN: Record<string, { dir: Direction; entry: number }[]> = {
  DXY: [{ dir: 'LONG', entry: 100.945 }, { dir: 'SHORT', entry: 101.14 }],
  'EUR/USD': [{ dir: 'SHORT', entry: 1.14395 }, { dir: 'LONG', entry: 1.14110 }],
  'GBP/USD': [{ dir: 'LONG', entry: 1.33330 }],
};
const TOLERANCE_PIPS = 3;

console.log('[diag] building the E1 models + the native setups...');
const nativeSetups = {
  DXY: generateSourceSetupsV45(models.DXY),
  'EUR/USD': generateSourceSetupsV45(models['EUR/USD']),
  'GBP/USD': generateSourceSetupsV45(models['GBP/USD']),
};
console.log(`[native] setup counts: DXY ${nativeSetups.DXY.length} | EU ${nativeSetups['EUR/USD'].length} | GU ${nativeSetups['GBP/USD'].length}`);

const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await runPriorWeekPreflight(pair, {
    barsByTf: {
      '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'),
      '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m'),
    },
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

// ═══════════════════════════════════════════════════════════════════════
// THE E2 DESIGNATIONS (the chain's inputs)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== THE MONDAY E2 DESIGNATIONS (the chain\'s inputs) ===');
{
  const chains: Array<[string, string]> = [
    ['DXY', e2.dxyChain ? 'dxy' : 'none'],
    ['EUR/USD', e2.euCoreChain ? 'eu' : 'none'],
    ['GBP/USD', e2.guCoreChain ? 'gu' : 'none'],
  ];
  for (const [pair, key] of chains) {
    const chain = key === 'dxy' ? e2.dxyChain : key === 'eu' ? e2.euCoreChain : key === 'gu' ? e2.guCoreChain : null;
    const monday = chain?.days?.[0];
    if (!monday) {
      console.log(`  ${pair.padEnd(7)}: no E2 core chain`);
      continue;
    }
    console.log(
      `  ${pair.padEnd(7)}: ${monday.day} ${monday.shape}:${monday.direction} (S:${monday.supplyZoneId ?? '-'}/D:${monday.demandZoneId ?? '-'}/DD:${monday.deepDemandZoneId ?? '-'}/KT:${monday.keyZoneType ?? '-'}/open:${monday.dayOpenSpot !== undefined ? monday.dayOpenSpot.toFixed(5) : '-'})`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// THE UNIFIED MACRO AUTHORITY (the L1 §10)
// ═══════════════════════════════════════════════════════════════════════
const macro = buildMacroAuthority(models, e2, pip);
console.log('\n=== THE UNIFIED MACRO AUTHORITY (Monday) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const m = macro[pair]!;
  console.log(`  ${pair.padEnd(7)}: ${m.direction} (mirror ${m.mirrorPair ?? '-'}${m.inverted ? ' inverted' : ''}) — ${m.source}`);
}

// ═══════════════════════════════════════════════════════════════════════
// THE SHADOW AGENT (deepseek v4 flash via opencode go — attempted, honest)
// ═══════════════════════════════════════════════════════════════════════
const shadow = createShadowAgentClient();
console.log('\n=== THE SHADOW AGENT (the embedded LLM hook) ===');
console.log(`  provider: ${shadow.provider}`);
console.log(`  available: ${shadow.available}${shadow.available ? '' : ' — the OPENCODE_API_KEY is not set; the deterministic fallback runs (the chain never hangs)'}`);

const e2DaysFor = (pair: PairKey) =>
  pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain;

// ═══════════════════════════════════════════════════════════════════════
// THE REASONING CHAIN (per pair — the Monday-anchored run)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== THE REASONING CHAIN (the 11-token sequence, Monday) ===');
// THE C3 PARALLEL RUN (the L2 spec PART 7 — the operator's topology ruling:
// "3 pairs - each pair can be done async. N parallel pipelines can run per
// pair... each micro level pair specific pipeline can run in parallel").
// The three pairs are fully independent (their own models, zones, storylines,
// macro authorities) — sequential execution serialized up to 24 LLM calls at
// effort:max = 30-50 min. Promise.all runs them concurrently — the wall time
// = the slowest pair. The DXY cascade layers ON TOP afterward (the macro level).
const chainRuns = await Promise.all([
  buildReasoningChain(buildChainInput('DXY')),
  buildReasoningChain(buildChainInput('EUR/USD')),
  buildReasoningChain(buildChainInput('GBP/USD')),
]);
const results: Record<PairKey, Awaited<ReturnType<typeof buildReasoningChain>>> = {
  DXY: chainRuns[0],
  'EUR/USD': chainRuns[1],
  'GBP/USD': chainRuns[2],
};

function buildChainInput(pair: PairKey): ReasoningChainInput {
  const model = models[pair]!;
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
    e2Days: e2DaysFor(pair),
    dxySetups: nativeSetups.DXY,
    cascade: { eu: cascade.eu, gu: cascade.gu },
    barsByTf: {
      '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'),
      '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m'),
    },
    macro: macro[pair]!,
    shadow,
    pip: pip[pair]!,
    atr1hPips: proxyAtr1hPips(model, pip[pair]!),
    days: ['Monday'],
  };
}

for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const r = results[pair]!;
  console.log(`\n--- ${pair} (macro ${macro[pair]!.direction}) ---`);
  if (r.projections.length === 0) {
    console.log('  no projections emitted for Monday (honest absence)');
  }
  for (const p of r.projections) {
    printProjection(p);
    if (pair === 'EUR/USD' && p.direction === 'LONG') {
      console.log('  --- the EU LONG 11-token ledger (the forward-reasoning evidence) ---');
      for (const t of p.tokenLedger) {
        console.log(`    [${String(t.token)}]${t.llmRefined ? ' (llm)' : ''} ${t.verdict}`);
      }
    }
  }
  if (r.ledger.divergences.length > 0) {
    console.log('  divergences (the macro wins; recorded, never suppressed):');
    for (const d of r.ledger.divergences) console.log(`    - ${d}`);
  }
  console.log(
    `  stats: deterministic ${r.stats.deterministicTokens} | llm ${r.stats.llmTokens} | refinements ${r.stats.refinements} | hardThrows ${r.stats.hardThrows}`,
  );
}

function printProjection(p: TradeProjection): void {
  const risk = Math.abs(p.E - p.SL) / pip[p.pair]!;
  const reward = Math.abs(p.TP - p.E) / pip[p.pair]!;
  const method = p.anchors.map((a) => `${a.role}@${a.price.toFixed(5)}(${a.method})`).join(' ');
  console.log(
    `  ${p.direction.padEnd(5)} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)} (${risk.toFixed(1)}R / ${reward.toFixed(1)}R) conf ${p.confidence.toFixed(2)} | ${p.validation.valid ? 'VALID' : 'INVALID'}`,
  );
  console.log(`      zone ${p.entryZoneId} | E2 ${p.e2ProjectionId} | ${p.chainContext}`);
  console.log(`      anchors: ${method}`);
  if (p.validation.warnings.length > 0) {
    for (const w of p.validation.warnings) {
      console.log(`      [${w.check}] ${w.proposed}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// THE GOLDEN MEASUREMENT (the oracle — the acceptance, never the input)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== THE GOLDEN MEASUREMENT (the Monday oracle — tolerance ' + TOLERANCE_PIPS + ' pips) ===');
{
  let hits = 0;
  let total = 0;
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const goldens = GOLDEN[pair] ?? [];
    const projs = results[pair]!.projections;
    const line: string[] = [];
    for (const g of goldens) {
      total += 1;
      const deltas = projs
        .filter((p) => p.direction === g.dir)
        .map((p) => Math.abs(p.E - g.entry) / pip[pair]!);
      const best = deltas.length > 0 ? Math.min(...deltas) : -1;
      const hit = best >= 0 && best <= TOLERANCE_PIPS;
      if (hit) hits += 1;
      line.push(`${g.dir} ${g.entry.toFixed(5)} -> ${best < 0 ? 'NONE' : `Δ${best.toFixed(1)}p`} (${best < 0 ? 'MISSING' : hit ? 'HIT' : 'MISS'})`);
    }
    console.log(`  ${pair.padEnd(7)}: ${line.join(' | ')}`);
  }
  console.log(`  golden hits: ${hits}/${total} (<= ${TOLERANCE_PIPS} pip)`);
}

// ═══════════════════════════════════════════════════════════════════════
// THE FAILURE SYNTHESIS (the end-of-pipeline — the enforcement law §8.3)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n' + formatSynthesis(synthesizeFailures(WEEK)));
console.log(`[FAILURE-STORE] the week's stored rows: ${failuresForWeek(WEEK).length}`);
if (!shadow.available && shadow.lastError) {
  console.log(`[SHADOW] lastError: ${shadow.lastError}`);
}

console.log('\n[DONE]');
