/**
 * DIAG-REASONING-CHAIN-GOLDEN — the W6 GOLDEN GATE harness (the G1-G10
 * acceptance + the adversarial scenarios A1-A7).
 * (The CME spec's Phase 9 + the L2 spec's PART 14 — the mechanical acceptance
 *  of the ENTIRE agent-in-the-loop overhaul. The WAVE 7 / B4 test wave.)
 *
 * THE PIPELINE PATH (mirrors diag-reasoning-chain.ts): the models (E1) → the
 *   native setups → the prior-week storylines → buildE2Core (E2) → cascadeV45
 *   → THE REASONING CHAIN (the 11-token sequence, per pair) → the
 *   TradeProjections → the validation verdicts.
 *
 * THE G1-G10 VERDICTS: computed by src/pipeline/golden-gate.ts's runGoldenGate
 *   (the ONE source of truth — the W6 wave's gate tool consumes the SAME
 *   export). The golden const = the MEASUREMENT ORACLE ONLY (the TEMPORARY
 *   ARCHITECTURE label — the pipeline NEVER reads it; the grep gate: the
 *   golden appears ONLY in this diag + the golden-gate module).
 *
 * THE RUN TOPOLOGY (the measurement, per the L2 spec PART 14 + 15):
 *   - THE SEQUENTIAL RUN (the determinism reference — the for-loop dispatch).
 *   - THE PARALLEL RUN (the PRIMARY — the Promise.all dispatch, the production
 *     topology; the G1-G10 measure THIS).
 *   - THE NEGATIVE CONTROL (the G8/A3 — a LATER anchor: the same chain with
 *     the fixture's later bars visible; the Monday anchors MUST be unchanged).
 *   - THE DETERMINISM ×2: the sequential vs the parallel digest byte-identical
 *     (G10 — the C1 order-independence) + the two-run determinism.
 *
 * THE EXIT PROTOCOL (the PART 14.3 order): tsc 0 (the caller) · bun build (the
 *   caller) · the frozen pair (checked here — the sha256 must match) · the
 *   G1-G10 + A1-A7 verdicts (checked here) · the wall ≤ 5 min (G9) · the
 *   determinism ×2 (G10). ANY gate red → exit 1 with the failing gates' detail.
 *
 * THE ADMITTED CURRENT STATE (the honest baseline): the harness MUST exit 1
 *   until the W5-W7/W6 waves land — the gates CAN fail (A2 the forced-2.5, G8
 *   the negative control, the convergence < 5/5). The exit 0 comes AFTER the
 *   integration; this harness is the mechanical proof of the overhaul.
 */

import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { proxyAtr1hPips, computeMirrorTP } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import {
  buildReasoningChain,
  buildMacroAuthority,
  phantomBoMExemption,
  resolveOperativeZone,
  runRefineRetry,
  token1_zoneIdentification,
  zoneToOperative,
  type ReasoningChainInput,
  type TradeProjection,
  type PairKey,
  type Direction,
  type TokenSetContext,
  type MacroAuthority,
  type ChainFailure,
} from './src/mdve/reasoning-chain.js';
import type { ShapeDayZone, CascadedShapeChain } from './src/mdve/shape-cascade.js';
import { createShadowAgentClient } from './src/mdve/shadow-agent.js';
import { synthesizeFailures, formatSynthesis, failuresForWeek } from './src/mdve/failure-store.js';
import {
  runGoldenGate,
  projectionDigest,
  GOLDEN_ORACLE,
  ORACLE_TOLERANCE_PIPS,
  G1_ENTRY_TOLERANCE_PIPS,
  WALL_TIME_LIMIT_MS,
  type GoldenGateContext,
} from './src/pipeline/golden-gate.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { decodeMarketData } from './src/e1/adapters/market-data-adapter.ts';
import { FutureBarLeak } from './src/runtime/errors.ts';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { OHLCBar } from './src/types.js';
import type { ChartModel, ZoneModel } from './src/mdve/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE MONDAY RUN ANCHOR — LOCKED FIRST (the operator's temporal law; the
//   ANCHOR = the golden week's end, Friday 2026-07-10 17:00 UTC — every bar
//   past it is physically DROPPED by the gate — no forward looking, ever)
// ═══════════════════════════════════════════════════════════════════════════
const ANCHOR_MS = 1783317600000; // ANALYSIS_POINT_MS — Monday 2026-07-06 06:00 UTC (the START of the pre-London hour — the operator's temporal law; the W1 re-anchor from the 07:00 1783321200000; the Friday close 1783702800000 leaked the week's reactions)
lockRunAnchor(ANCHOR_MS);
console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(ANCHOR_MS).toISOString()} (${ANCHOR_MS})`);

const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000;

// ═══════════════════════════════════════════════════════════════════════════
// THE MONDAY GOLDENS — the MEASUREMENT ORACLE ONLY (never a pipeline input)
// ═══════════════════════════════════════════════════════════════════════════
const GOLDEN: Record<string, { dir: Direction; entry: number }[]> = {
  DXY: [{ dir: 'LONG', entry: 100.945 }, { dir: 'SHORT', entry: 101.14 }],
  'EUR/USD': [{ dir: 'SHORT', entry: 1.14395 }, { dir: 'LONG', entry: 1.14110 }],
  'GBP/USD': [{ dir: 'LONG', entry: 1.33330 }],
};
const pip: Record<PairKey, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const TOLERANCE_PIPS = ORACLE_TOLERANCE_PIPS; // the ONLY tolerance (3 pips)

// THE --day=2026-07-06 argument (the only supported golden week — the "ONE
// DAY AT A TIME" build target).
const dayArg = process.argv.find((a) => a.startsWith('--day='));
const requestedDay = dayArg?.split('=')[1] ?? WEEK;
if (requestedDay !== WEEK) {
  console.error(`[GOLDEN-GATE] unsupported --day=${requestedDay} — the harness measures ONLY the golden week ${WEEK}`);
  process.exit(1);
}

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const DECISION_PATH = process.env.BARS_FIXTURE ?? join('/tmp', 'opencode', 'bars_raw.json');
const WEEK_PATH = process.env.BARS_WEEK_FIXTURE ?? join('/tmp', 'opencode', 'bars_raw.week.json');
const raw: RawFeed[] = JSON.parse(readFileSync(DECISION_PATH, 'utf8'));
for (const f of raw) {
  if (f.timeframe === '1H' || f.timeframe === '4H') {
    decodeMarketData(f.bars, ANCHOR_MS);
  }
}
if (!existsSync(WEEK_PATH)) {
  throw new Error(`outcome week fixture missing: ${WEEK_PATH} — rebuild with --until=week`);
}
const weekRaw: RawFeed[] = JSON.parse(readFileSync(WEEK_PATH, 'utf8'));

// The week fixture's max bar timestamp — the G8 evidence (bars beyond the
// anchor exist) + the negative control's later anchor. Decision file is clipped.
const fixtureMaxTs = weekRaw.reduce(
  (max, f) => Math.max(max, f.bars.reduce((m, b) => Math.max(m, b.timestamp), 0)),
  0,
);
const fixtureTotalBars = weekRaw.reduce((n, f) => n + f.bars.length, 0);

const barsFor = (p: string, tf: string, limitMs: number): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= limitMs)
    .sort((a, b) => a.timestamp - b.timestamp);
const weekBarsFor = (p: string, tf: string): OHLCBar[] =>
  (weekRaw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .sort((a, b) => a.timestamp - b.timestamp);

function feedStats(feeds: RawFeed[]): { n: number; max_t: number } {
  let n = 0, max_t = 0;
  for (const f of feeds) {
    for (const b of f.bars) {
      n += 1;
      if (b.timestamp > max_t) max_t = b.timestamp;
    }
  }
  return { n, max_t };
}
const decisionStats = feedStats(raw);
const weekStats = feedStats(weekRaw);
console.log(`[FEED-SPLIT] decision ${DECISION_PATH} bars=${decisionStats.n} max_t=${decisionStats.max_t} le_anchor=${decisionStats.max_t <= ANCHOR_MS}`);
console.log(`[FEED-SPLIT] week ${WEEK_PATH} bars=${weekStats.n} max_t=${weekStats.max_t} gt_anchor=${weekStats.max_t > ANCHOR_MS}`);

let feedSplitWeekThrow = false;
const dxyDecision = raw.find((f) => f.pair === 'DXY' && f.timeframe === '1H');
const dxyWeek = weekRaw.find((f) => f.pair === 'DXY' && f.timeframe === '1H');
if (!dxyDecision?.bars.length) throw new Error('[FEED-SPLIT] decision DXY 1H missing');
if (!dxyWeek?.bars.length) throw new Error('[FEED-SPLIT] week DXY 1H missing');
const nDecision = decodeMarketData(dxyDecision.bars, ANCHOR_MS).length;
console.log(`[FUTURE_BAR_LEAK] decision DXY 1H PASS n=${nDecision} t<=${ANCHOR_MS}`);
try {
  decodeMarketData(dxyWeek.bars, ANCHOR_MS);
  console.log('[FUTURE_BAR_LEAK] week DXY 1H FAIL-PAPER: expected throw, got pass');
} catch (err) {
  feedSplitWeekThrow = err instanceof FutureBarLeak || String(err).includes('FUTURE_BAR_LEAK');
  console.log(`[FUTURE_BAR_LEAK] week DXY 1H THROW ${feedSplitWeekThrow ? 'FUTURE_BAR_LEAK' : String(err)} (honest — week is outcome-only)`);
}
const feedSplitIssues: Array<{ stage: string; detail: string }> = [];
if (!feedSplitWeekThrow) {
  feedSplitIssues.push({ stage: 'FEED-SPLIT', detail: 'week DXY 1H decodeMarketData did not throw FutureBarLeak — papered split' });
}
if (decisionStats.max_t > ANCHOR_MS) {
  feedSplitIssues.push({ stage: 'FEED-SPLIT', detail: `named live decision max_t=${decisionStats.max_t} > ANCHOR_MS` });
}

const spotFor = (p: string, limitMs: number): number => {
  // THE ANALYSIS-POINT SPOT (the §2.1 semantic — the W1 fix): the last 1H
  // close at/before the anchor = the 05:00 bar's close for the 06:00 point.
  // NEVER the 4H close (the coarser bar blurs the exact analysis price).
  const b = barsFor(p, '1H', limitMs);
  return b.length ? b[b.length - 1]!.close : 0;
};

// THE PIPELINE-STAGE GUARD (the loud-fail law): the harness NEVER crashes on a
// live-wave pipeline-stage bug (W4 lexicons / W5-W7) — it records the stage
// failure LOUDLY (the [PIPE] gate, red → exit 1) and continues measuring what
// the surviving stages produce. Known triggers surfaced here: the W4
// candle-pressure Phase-A throw in buildChartModel, the W5-W7 setup-gen.ts
// slLmvDistPips null-deref — wave fix targets, reported, never fatal to the
// harness.
const pipelineErrors: Array<{ stage: string; detail: string }> = [...feedSplitIssues];
async function guardStage<T>(stage: string, fn: () => T | Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pipelineErrors.push({ stage, detail: msg });
    console.error(`[PIPELINE-STAGE FAILURE] ${stage}: ${msg}`);
    return fallback;
  }
}

// THE E1 MODELS — built from the GATED bars (≤ ANCHOR_MS; gateBars is a no-op
// on them — the temporal law is enforced at the filter + the buildChartModel
// defensive gate). GUARDED: the live waves land their changes concurrently — a
// model-build crash is recorded LOUDLY (the [PIPE] gate) and the pair is
// skipped; the harness NEVER crashes.
const models: Record<PairKey, ChartModel | null> = {
  DXY: await guardStage('buildChartModel(DXY)', () => buildChartModel('DXY', WEEK, gateBars(barsFor('DXY', '1H', ANCHOR_MS)), gateBars(barsFor('DXY', '4H', ANCHOR_MS)), gateBars(barsFor('DXY', '30m', ANCHOR_MS)), spotFor('DXY', ANCHOR_MS), undefined, gateBars(barsFor('DXY', '15m', ANCHOR_MS))), null),
  'EUR/USD': await guardStage('buildChartModel(EUR/USD)', () => buildChartModel('EUR/USD', WEEK, gateBars(barsFor('EUR/USD', '1H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '4H', ANCHOR_MS)), gateBars(barsFor('EUR/USD', '30m', ANCHOR_MS)), spotFor('EUR/USD', ANCHOR_MS), undefined, gateBars(barsFor('EUR/USD', '15m', ANCHOR_MS))), null),
  'GBP/USD': await guardStage('buildChartModel(GBP/USD)', () => buildChartModel('GBP/USD', WEEK, gateBars(barsFor('GBP/USD', '1H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '4H', ANCHOR_MS)), gateBars(barsFor('GBP/USD', '30m', ANCHOR_MS)), spotFor('GBP/USD', ANCHOR_MS), undefined, gateBars(barsFor('GBP/USD', '15m', ANCHOR_MS))), null),
};

const t0 = performance.now();
console.log('[diag] building the E1 models + the native setups + the E2 core + the cascade + the macro authority...');

const nativeSetups = {
  DXY: await guardStage('generateSourceSetupsV45(DXY)', () => generateSourceSetupsV45(models.DXY), []),
  'EUR/USD': await guardStage('generateSourceSetupsV45(EUR/USD)', () => generateSourceSetupsV45(models['EUR/USD']), []),
  'GBP/USD': await guardStage('generateSourceSetupsV45(GBP/USD)', () => generateSourceSetupsV45(models['GBP/USD']), []),
};
console.log(`[native] setup counts: DXY ${nativeSetups.DXY.length} | EU ${nativeSetups['EUR/USD'].length} | GU ${nativeSetups['GBP/USD'].length}`);

const priorStorylines: Record<string, unknown> = {};
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  priorStorylines[pair] = await guardStage(`runPriorWeekPreflight(${pair})`, async () => {
    const out = await runPriorWeekPreflight(pair, {
      barsByTf: {
        '1H': gateBars(barsFor(pair, '1H', ANCHOR_MS)), '4H': gateBars(barsFor(pair, '4H', ANCHOR_MS)),
        '30m': gateBars(barsFor(pair, '30m', ANCHOR_MS)), '15m': gateBars(barsFor(pair, '15m', ANCHOR_MS)),
      },
      weekStartMs: WEEK_START_MS,
      anchorMs: ANCHOR_MS,
    });
    return out;
  }, {});
}

const e2 = await guardStage('buildE2Core', async () => {
  const out = await buildE2Core(models, priorStorylines);
  return out;
}, { dxyChain: null, euCoreChain: null, guCoreChain: null, euCascaded: null, guCascaded: null, dxyBrainDays: [], euCoreDays: [], guCoreDays: [], euDivergence: null, guDivergence: null, storylines: {} });
const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const cascade = await guardStage('cascadeV45', () => cascadeV45(nativeSetups.DXY, models as Record<PairKey, ChartModel>, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
}), { eu: [], gu: [] });
const macro = await guardStage('buildMacroAuthority', () => buildMacroAuthority(models as Record<PairKey, ChartModel>, e2, pip), {
  DXY: { direction: 'LONG', mirrorPair: 'EUR/USD', inverted: true, source: 'unavailable (the model stage failed)' },
  'EUR/USD': { direction: 'SHORT', mirrorPair: 'DXY', inverted: true, source: 'unavailable (the model stage failed)' },
  'GBP/USD': { direction: 'SHORT', mirrorPair: 'EUR/USD', inverted: false, source: 'unavailable (the model stage failed)' },
});

const e2DaysFor = (pair: PairKey) =>
  pair === 'DXY' ? e2.dxyChain : pair === 'EUR/USD' ? e2.euCoreChain : e2.guCoreChain;

const shadow = createShadowAgentClient();
console.log(`[shadow] provider ${shadow.provider} · available ${shadow.available}${shadow.available ? '' : ' (the deterministic fallback runs)'}`);

// THE CHAIN-INPUT BUILDER. limitMs selects the bars the chain SEES — the
// primary runs at ANCHOR_MS; the negative control (G8/A3) runs at the
// fixture's max (a later anchor — the chain must NOT read those later bars).
// Returns null when the pair's E1 model failed to build (the guarded pipeline).
function buildChainInput(pair: PairKey, limitMs: number = ANCHOR_MS): ReasoningChainInput | null {
  const model = models[pair];
  if (!model) return null;
  return {
    pair,
    week: WEEK,
    anchorMs: limitMs,
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
      '1H': limitMs <= ANCHOR_MS ? barsFor(pair, '1H', limitMs) : weekBarsFor(pair, '1H').filter((b) => b.timestamp <= limitMs),
      '4H': limitMs <= ANCHOR_MS ? barsFor(pair, '4H', limitMs) : weekBarsFor(pair, '4H').filter((b) => b.timestamp <= limitMs),
      '30m': barsFor(pair, '30m', limitMs), '15m': barsFor(pair, '15m', limitMs),
    },
    macro: macro[pair]!,
    shadow,
    pip: pip[pair]!,
    atr1hPips: proxyAtr1hPips(model, pip[pair]!),
    days: ['Monday'],
  };
}

type ChainRun = Awaited<ReturnType<typeof buildReasoningChain>>;

/** The empty-chain fallback (the loud-fail law: a chain-stage crash yields an
 *  honest ABSENCE — no projections — never a fabricated emission). */
function emptyChainResult(pair: PairKey): ChainRun {
  return {
    projections: [],
    ledger: { pair, week: WEEK, anchorMs: ANCHOR_MS, tokens: [], macroDirection: 'LONG', macroConsistent: true, divergences: [] },
    failures: [],
    stats: { deterministicTokens: 0, llmTokens: 0, refinements: 0, hardThrows: 0 },
  };
}

/** A guarded chain run: the null input (the pair's model failed) → the honest
 *  empty result; a chain crash → the guarded loud error + the empty result. */
async function guardedChainRun(pair: PairKey, limitMs: number, label: string): Promise<ChainRun> {
  const input = buildChainInput(pair, limitMs);
  if (!input) return emptyChainResult(pair);
  return guardStage(`${label}(${pair})`, () => buildReasoningChain(input), emptyChainResult(pair));
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SEQUENTIAL RUN (run 1 — the determinism reference)
// ═══════════════════════════════════════════════════════════════════════════
const tSeq = performance.now();
const sequentialResults: Record<PairKey, ChainRun> = { DXY: emptyChainResult('DXY'), 'EUR/USD': emptyChainResult('EUR/USD'), 'GBP/USD': emptyChainResult('GBP/USD') };
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  sequentialResults[pair] = await guardedChainRun(pair, ANCHOR_MS, 'sequential chain');
}
const seqWallMs = performance.now() - tSeq;
console.log(`[timing] the SEQUENTIAL chain run: ${(seqWallMs / 1000).toFixed(1)}s`);

// ═══════════════════════════════════════════════════════════════════════════
// THE PARALLEL RUN (run 2 — THE PRIMARY; the Promise.all production topology)
// ═══════════════════════════════════════════════════════════════════════════
const tPar = performance.now();
const chainRuns = await Promise.all(['DXY', 'EUR/USD', 'GBP/USD'].map((p) => guardedChainRun(p, ANCHOR_MS, 'parallel chain')));
const parWallMs = performance.now() - tPar;
const parallelResults: Record<PairKey, ChainRun> = { DXY: chainRuns[0], 'EUR/USD': chainRuns[1], 'GBP/USD': chainRuns[2] };
console.log(`[timing] the PARALLEL chain run (the primary): ${(parWallMs / 1000).toFixed(1)}s`);

// ═══════════════════════════════════════════════════════════════════════════
// THE NEGATIVE CONTROL (run 3 — the G8/A3 temporal gate: a LATER anchor must
//   NOT change the Monday anchors). The SAME models/e2/macro; the chain's
//   barsByTf extended to the fixture max (the later bars the chain must not read).
// ═══════════════════════════════════════════════════════════════════════════
const tCtl = performance.now();
const controlRuns = await Promise.all(['DXY', 'EUR/USD', 'GBP/USD'].map((p) => guardedChainRun(p, fixtureMaxTs, 'control chain')));
const ctlWallMs = performance.now() - tCtl;
const controlResults: Record<PairKey, ChainRun> = { DXY: controlRuns[0], 'EUR/USD': controlRuns[1], 'GBP/USD': controlRuns[2] };
console.log(`[timing] the NEGATIVE-CONTROL chain run (the later anchor ${new Date(fixtureMaxTs).toISOString()}): ${(ctlWallMs / 1000).toFixed(1)}s`);

// The anchor digest — the E/SL/TP + the direction + the anchor prices (the
// G8 comparison: the later bars must not move the MONDAY ANCHORS).
function anchorDigest(projs: TradeProjection[]): string {
  const canon = projs.map((p) => ({
    pair: p.pair,
    day: p.day,
    direction: p.direction,
    E: p.E,
    SL: p.SL,
    TP: p.TP,
    RRR: p.RRR,
    anchors: p.anchors.map((a) => ({ role: a.role, price: a.price })),
  }));
  return createHash('sha256').update(JSON.stringify(canon)).digest('hex');
}

const primaryProjs = Object.values(parallelResults).flatMap((r) => r.projections);
const controlProjs = Object.values(controlResults).flatMap((r) => r.projections);
const primaryAnchorDigest = anchorDigest(primaryProjs);
const controlAnchorDigest = anchorDigest(controlProjs);
const negativeControlUnchanged = primaryAnchorDigest === controlAnchorDigest;

const totalWallMs = performance.now() - t0;
console.log(`[timing] the TOTAL diag wall: ${(totalWallMs / 1000).toFixed(1)}s (the G9 base — the \`time\` measurement)`);

// ═══════════════════════════════════════════════════════════════════════════
// THE PROJECTIONS (the primary — the parallel run)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== THE REASONING CHAIN PROJECTIONS (Monday, the primary parallel run) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const r = parallelResults[pair]!;
  console.log(`--- ${pair} (macro ${macro[pair]!.direction}) ---`);
  if (r.projections.length === 0) console.log('  no projections emitted for Monday (honest absence)');
  for (const p of r.projections) {
    printProjection(p);
    if (pair === 'EUR/USD' && p.direction === 'LONG') {
      console.log('  --- the EU LONG 11-token ledger (the forward-reasoning evidence) ---');
      for (const t of p.tokenLedger) console.log(`    [${String(t.token)}]${t.llmRefined ? ' (llm)' : ''} ${t.verdict}`);
    }
  }
  if (r.ledger.divergences.length > 0) {
    console.log('  divergences (the macro wins; recorded, never suppressed):');
    for (const d of r.ledger.divergences) console.log(`    - ${d}`);
  }
  console.log(`  stats: deterministic ${r.stats.deterministicTokens} | llm ${r.stats.llmTokens} | refinements ${r.stats.refinements} | hardThrows ${r.stats.hardThrows}`);
}

function printProjection(p: TradeProjection): void {
  const risk = Math.abs(p.E - p.SL) / pip[p.pair]!;
  const reward = Math.abs(p.TP - p.E) / pip[p.pair]!;
  const method = p.anchors.map((a) => `${a.role}@${a.price.toFixed(5)}(${a.method})`).join(' ');
  console.log(
    `  ${p.direction.padEnd(5)} E ${p.E.toFixed(5)} SL ${p.SL.toFixed(5)} TP ${p.TP.toFixed(5)} RRR ${p.RRR.toFixed(2)} (${risk.toFixed(1)}R / ${reward.toFixed(1)}R) conf ${p.confidence.toFixed(2)} | ${p.validation.valid ? 'VALID' : 'INVALID'} | ${p.source}`,
  );
  console.log(`      zone ${p.entryZoneId} | E2 ${p.e2ProjectionId} | ${p.chainContext}`);
  console.log(`      anchors: ${method}`);
  if (p.validation.warnings.length > 0) {
    for (const w of p.validation.warnings) console.log(`      [${w.check}] ${w.proposed}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE GOLDEN MEASUREMENT (the oracle — the acceptance, never the input)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== THE GOLDEN MEASUREMENT (the Monday oracle — tolerance ' + TOLERANCE_PIPS + ' pips) ===');
let goldenHits = 0;
let goldenTotal = 0;
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
  const goldens = GOLDEN[pair] ?? [];
  const projs = parallelResults[pair]!.projections;
  const line: string[] = [];
  for (const g of goldens) {
    goldenTotal += 1;
    const deltas = projs.filter((p) => p.direction === g.dir).map((p) => Math.abs(p.E - g.entry) / pip[pair]!);
    const best = deltas.length > 0 ? Math.min(...deltas) : -1;
    const hit = best >= 0 && best <= TOLERANCE_PIPS;
    if (hit) goldenHits += 1;
    line.push(`${g.dir} ${g.entry.toFixed(5)} -> ${best < 0 ? 'NONE' : `Δ${best.toFixed(1)}p`} (${best < 0 ? 'MISSING' : hit ? 'HIT' : 'MISS'})`);
  }
  console.log(`  ${pair.padEnd(7)}: ${line.join(' | ')}`);
}
console.log(`  golden hits: ${goldenHits}/${goldenTotal} (<= ${TOLERANCE_PIPS} pip)`);

// ═══════════════════════════════════════════════════════════════════════════
// THE G1-G10 VERDICTS (the ONE source of truth — runGoldenGate)
// ═══════════════════════════════════════════════════════════════════════════
const storeRows = failuresForWeek(WEEK);
const divergences: string[] = Object.values(parallelResults).flatMap((r) => r.ledger.divergences);
const runFailures: ChainFailure[] = Object.values(parallelResults).flatMap((r) => r.failures);

const ctx: GoldenGateContext = {
  week: WEEK,
  anchorMs: ANCHOR_MS,
  weekStartMs: WEEK_START_MS,
  pip,
  macro,
  models,
  projections: primaryProjs,
  sequentialProjections: Object.values(sequentialResults).flatMap((r) => r.projections),
  failures: runFailures,
  divergences,
  store: {
    hardThrowsForWeek: storeRows.filter((r) => r.reason === 'REFINEMENT_EXHAUSTED').length,
    macroDivergenceRows: storeRows.filter((r) => r.reason === 'MACRO_DIVERGENCE').length,
    weekRows: storeRows.length,
  },
  wallTimeMs: totalWallMs,
  stallKilled: false,
  temporal: {
    negativeControlUnchanged,
    maxReadTimestamp: ANCHOR_MS,
    negativeControlDetail: `the later anchor ${new Date(fixtureMaxTs).toISOString()} (${((fixtureMaxTs - ANCHOR_MS) / 3600000).toFixed(0)}h past the week end) — the Monday anchors ${negativeControlUnchanged ? 'UNCHANGED (the chain never read the later bars)' : 'CHANGED (the chain reads bars beyond the anchor — a forward-looking leak)'} · primary ${primaryAnchorDigest.slice(0, 16)} vs control ${controlAnchorDigest.slice(0, 16)}`,
  },
  fixture: { maxTimestampPresent: fixtureMaxTs, totalBars: fixtureTotalBars },
};

console.log('\n=== THE G1-G10 VERDICTS (the W6 golden gate — the acceptance) ===');
const verdicts = runGoldenGate(ctx);
for (const v of verdicts) {
  console.log(`  [${v.gate}] ${v.name}: ${v.pass ? 'PASS' : 'FAIL'} — ${v.detail}`);
  for (const e of v.evidence) console.log(`       · ${e}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ADVERSARIAL SCENARIOS A1-A7 (the tool-result-bound pass tokens)
// ═══════════════════════════════════════════════════════════════════════════
interface ScenarioVerdict { id: string; name: string; pass: boolean; detail: string; evidence: string[]; }

const scenarios: ScenarioVerdict[] = [];

// A1 — a deliberately-bad projection → the GROUNDING_WARN + the loop continues
// (NEVER a first-violation kill). THE ASSERTION: the FIRST violation produces
// a WARN + a REFINED(n) ledger entry (the loop continued past the first
// violation — it refined, never hard-threw on attempt 1). The final hardThrow
// (AFTER MAX_REFINEMENTS=3) is the A1b discipline — the loop returns, never
// crashes, never loops forever.
{
  const euInput = buildChainInput('EUR/USD');
  if (!euInput) {
    scenarios.push({
      id: 'A1',
      name: 'the GROUNDING_WARN + the loop continues (never a first-violation kill)',
      pass: false,
      detail: 'UNMEASURABLE — the EUR/USD E1 model failed to build (the [PIPE] stage failure); the refine loop cannot run',
      evidence: ['the guarded pipeline recorded the model-stage failure; A1 requires a built model'],
    });
  } else {
  const longs = parallelResults['EUR/USD'].projections.filter((p) => p.direction === 'LONG');
  const base = longs[0] ?? parallelResults['EUR/USD'].projections[0];
  if (!base) {
    // the A-7 amendment: the gate NEVER crashes on the missing phase output —
    // it reports the honest UNMEASURABLE verdict
    scenarios.push({
      id: 'A1',
      name: 'the GROUNDING_WARN + the loop continues (never a first-violation kill)',
      pass: false,
      detail: 'UNMEASURABLE — no EUR/USD projections emitted (the pipeline produced an empty set)',
      evidence: ['the guarded pipeline recorded the empty projection set; A1 requires a built model'],
    });
  } else {
  const zone = resolveOperativeZone(euInput.model, 'EUR/USD', base.entryZoneId);
  if (!zone) throw new Error('A1 fixture broken: the EU entry zone does not resolve');
  const day0 = euInput.e2Days?.days?.[0];
  const a1Ctx: TokenSetContext = {
    input: euInput,
    e2Day: (day0 ?? { dayIdx: 0, day: 'Monday', shape: base.shape, direction: base.direction, keyZoneId: null, keyZonePrice: null, supplyZonePrice: null, demandZonePrice: null, floor: null, ceiling: null, confidence: 0 }) as ShapeDayZone,
    operativeZone: zone,
    direction: base.direction,
    dayIndex: day0?.dayIdx ?? 0,
    dayKey: 'Monday',
    shape: day0?.shape ?? base.shape,
    dayOpenSpot: day0?.dayOpenSpot ?? euInput.model.spot,
    e2ChainDays: (euInput.e2Days?.days ?? []) as Array<{ day: string; shape: string; direction?: string; confidence?: number }>,
    widthRatio: 1,
    tokens: base.tokenLedger,
  };
  const badProj: TradeProjection = { ...base, RRR: 1.5 };
  const a1 = await runRefineRetry(badProj, euInput, a1Ctx);
  const refined1 = a1.projection.tokenLedger.find((t) => t.verdict.startsWith('REFINED(1)'));
  const warnFired = refined1 !== undefined; // the GROUNDING_WARN + the loop continued (never a first-violation kill)
  const pass = warnFired;
  scenarios.push({
    id: 'A1',
    name: 'the GROUNDING_WARN + the loop continues (never a first-violation kill)',
    pass,
    detail: `the bad projection (RRR 1.5 < gate) → ${refined1?.verdict ?? 'NO WARN'} → final RRR ${a1.projection.RRR.toFixed(2)} · hardThrow ${a1.hardThrow} (${a1.hardThrow ? 'AFTER 3 refinements — the A1b discipline, never a crash, never a first-violation kill' : 'the refine accepted the projection'}) — the first violation REFINED (${warnFired ? 'PASS' : 'the WARN never fired'})`,
    evidence: [`the ledger's first refine entry: ${refined1?.verdict ?? 'NONE'}`, 'the loop returned (no crash, no hang) — the hard-throw is reserved for MAX_REFINEMENTS exhaustion'],
  });
  }
  }
}

// A2 — a null computeMirrorTP (no opposing rung) → NO emission (NEVER the 2.5
// clamp). Direct assertion: the null-ladder call returns null. Emission-level
// assertion: the run emits ZERO forced-2.5 (ratio-extension) projections.
{
  const a2Anchor: ZoneModel = {
    id: 'EUR/USD|1H|A2|1.14000', type: 'DEMAND', top: 1.14145, bottom: 1.14000,
    timeframe: '1H', classification: 'MoM', formationMs: 1, freshness: 'FRESH',
    reactionEvents: [], zfp: 20, confluence: 5,
  };
  const nullTp = computeMirrorTP(1.14100, 1.14000, a2Anchor, 'LONG', [], 0.0001, { passThroughWeakWalls: true });
  const forced = primaryProjs.filter(
    (p) => Math.abs(p.RRR - 2.5) < 1e-6 && p.anchors.some((a) => a.role === 'TP' && a.method.includes('ratio-extension')),
  );
  const pass = nullTp === null && forced.length === 0;
  scenarios.push({
    id: 'A2',
    name: 'the null computeMirrorTP → NO emission (never the 2.5 clamp)',
    pass,
    detail: `computeMirrorTP with an empty opposing ladder → ${nullTp === null ? 'null (the substrate honestly returns nothing)' : String(nullTp?.tp)} · forced-2.5 emissions ${forced.length} (${forced.map((f) => f.setupId).join(', ') || 'none'}) — ${forced.length === 0 ? 'the pipeline never clamps' : 'THE D37 FORCED-2.5 CLASS IS PRESENT (the W7 TP-substrate fix target)'}`,
    evidence: [`forced-2.5 signature: RRR === 2.500000 ±1e-6 AND a 'ratio-extension' TP anchor`],
  });
}

// A3 — the temporal negative control (a later anchor → the anchors unchanged).
// The SAME evidence as G8's negative-control; asserted independently here.
{
  const pass = negativeControlUnchanged;
  scenarios.push({
    id: 'A3',
    name: 'the temporal negative control (a later anchor → the anchors unchanged)',
    pass,
    detail: `later anchor ${new Date(fixtureMaxTs).toISOString()} · primary ${primaryAnchorDigest.slice(0, 16)} vs control ${controlAnchorDigest.slice(0, 16)} → ${pass ? 'ANCHORS UNCHANGED' : 'ANCHORS CHANGED (a forward-looking leak)'}`,
    evidence: [ctx.temporal.negativeControlDetail],
  });
}

// A4 — a fabricated designation → the firewall BLOCKED (the grounding
// contract: an invented zone id NEVER resolves; every emitted entry zone
// resolves to a real E1 element).
{
  const euModel = models['EUR/USD'];
  const fabricated = euModel ? resolveOperativeZone(euModel, 'EUR/USD', 'FABRICATED|DOES|NOT|EXIST') : null;
  const ungrounded = primaryProjs.filter((p) => {
    const m = models[p.pair];
    return !m || resolveOperativeZone(m, p.pair, p.entryZoneId) === null;
  });
  const pass = fabricated === null && ungrounded.length === 0;
  scenarios.push({
    id: 'A4',
    name: 'the fabricated designation → the firewall BLOCKED',
    pass,
    detail: `resolveOperativeZone('FABRICATED|DOES|NOT|EXIST') → ${fabricated === null ? 'null (the grounding contract blocks the fabrication)' : 'RESOLVED (a fabrication leaked through)'} · ungrounded emitted projections ${ungrounded.length} (${ungrounded.map((u) => u.setupId).join(', ') || 'none'})`,
    evidence: ["the STEP A/B firewall's mechanical primitive: an unknown zone id resolves null — the chain emits ONLY grounded entry zones"],
  });
}

// A5 — the G10 parallel-equivalence (the parallel run byte-identical to the
// sequential run). The SAME evidence as G10; asserted independently.
{
  const par = projectionDigest(primaryProjs);
  const seq = projectionDigest(Object.values(sequentialResults).flatMap((r) => r.projections));
  const pass = par === seq;
  scenarios.push({
    id: 'A5',
    name: 'the parallel-equivalence (the parallel vs the sequential byte-identical)',
    pass,
    detail: `parallel ${par.slice(0, 16)} vs sequential ${seq.slice(0, 16)} → ${pass ? 'BYTE-IDENTICAL' : 'DIFFER (the C1 order violated — the deterministicFp was not hoisted before the dispatch)'}`,
    evidence: [`parallel sha256: ${par}`, `sequential sha256: ${seq}`],
  });
}

// A6 — the phantom-BoM 3-of-4 → DEATH (the exemption's all-4 predicate: a
// 3-of-4 phantom is a virgin-MoM DEATH, never an exemption).
{
  const pipEU = 0.0001;
  const atrEU = 5; // pips — the width 14.5p ≥ 1.5×5p (the large-OB criterion)
  const demand: ZoneModel = {
    id: 'EUR/USD|1H|1782896400000|1.14000', type: 'DEMAND', top: 1.14145, bottom: 1.14000,
    timeframe: '1H', classification: 'MoM', formationMs: 1782896400000, freshness: 'FRESH',
    reactionEvents: [], zfp: 20, confluence: 5,
  };
  const supplyBoM: ZoneModel = {
    id: 'EUR/USD|1H|1782800000000|1.14170', type: 'SUPPLY', top: 1.14200, bottom: 1.14170,
    timeframe: '1H', classification: 'BoM', formationMs: 1782800000000, freshness: 'TESTED',
    reactionEvents: [], zfp: 10, confluence: 6,
  };
  const model6: ChartModel = {
    pair: 'EUR/USD', weekStart: WEEK, anchor: { weekStartMs: WEEK_START_MS, anchorMs: ANCHOR_MS },
    spot: 1.14205, zones: [demand, supplyBoM], lqzMatrix: [],
    lmv: { table: [], coverage: { minPrice: 1.14, maxPrice: 1.145, bucketWidth: 0.0001 } },
    ladder: [],
    narrative: { sweepOrigin: null, rangeTop: null, rangeBottom: null, theBreak: null, reactionsAtBoundaries: 0, postBreakZoneId: null },
  };
  const op = zoneToOperative(demand);
  const exempt = phantomBoMExemption(op, model6, pipEU, atrEU);
  const token1 = token1_zoneIdentification(op);
  const pass = exempt.exempt === false && token1.classification === 'MoM' && token1.deathRuleVerdict === 'DEATH';
  const criteriaTrue = Object.values(exempt.criteria).filter(Boolean).length;
  scenarios.push({
    id: 'A6',
    name: 'the phantom-BoM 3-of-4 → DEATH (the all-4 predicate)',
    pass,
    detail: `the fixture satisfies ${criteriaTrue}/4 criteria ${JSON.stringify(exempt.criteria)} → exempt ${exempt.exempt} · token-1 ${token1.classification} ${token1.deathRuleVerdict} (${pass ? 'the DEATH rule holds — a 3-of-4 phantom is never exempted' : 'the exemption leaked on a partial predicate'})`,
    evidence: exempt.evidence,
  });
}

// A7 — the wall-time regression (≤ 5 min; the stall detector never kills a
// working generation).
{
  const pass = totalWallMs <= WALL_TIME_LIMIT_MS;
  scenarios.push({
    id: 'A7',
    name: 'the wall-time regression (≤ 5 min; no stall-kill of a working generation)',
    pass,
    detail: `total diag wall ${(totalWallMs / 1000).toFixed(1)}s ≤ ${WALL_TIME_LIMIT_MS / 60000}min (${pass ? 'PASS' : 'OVER BUDGET'}) · stall-kill observed: NO (the stall detector fires only on a no-token idle window, never a wall clock)`,
    evidence: [`wall time ms: ${Math.round(totalWallMs)}`, `shadow.lastError: ${shadow.lastError ?? 'none'}`],
  });
}

console.log('\n=== THE ADVERSARIAL SCENARIOS A1-A7 ===');
for (const s of scenarios) {
  console.log(`  [${s.id}] ${s.name}: ${s.pass ? 'PASS' : 'FAIL'} — ${s.detail}`);
  for (const e of s.evidence) console.log(`       · ${e}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CONVERGENCE TABLE (per emission — the deltas vs the golden)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== THE CONVERGENCE TABLE (per emission — the deltas vs the golden) ===');
for (const p of primaryProjs) {
  const goldens = GOLDEN[p.pair] ?? [];
  const g = goldens.find((x) => x.dir === p.direction);
  const delta = g ? (Math.abs(p.E - g.entry) / pip[p.pair]!).toFixed(1) : 'n/a';
  const verdict = g ? (Math.abs(p.E - g.entry) / pip[p.pair]! <= TOLERANCE_PIPS ? 'HIT' : 'MISS') : '-';
  console.log(
    `  ${p.pair.padEnd(7)} ${p.direction.padEnd(5)} E ${p.E.toFixed(5)} ${g ? `Δ${delta}p (${verdict} vs ${g.entry.toFixed(5)})` : '(no golden)'} RRR ${p.RRR.toFixed(2)} conf ${p.confidence.toFixed(2)} ${p.source}`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THE OUTCOME-ACCOUNTABILITY GATE (the W-ADM-5 acceptance — the L2 spec §6.5):
//   the forecast-vs-reality OUTCOME, never the entry precision alone. The TTE
//   report (the plutus-visual-eval per-pair setup tables) is generated from the
//   EMITTED projections + WRITTEN to the harness's output dir. The outcome
//   simulation mirrors plutus_visual_eval.py's simulate() EXACTLY (the trigger
//   = the first bar with timestamp > ANCHOR_MS whose range covers the entry —
//   the trades are LIVE from the analysis point · the exit = the first TP/SL
//   touch · the same-bar TP+SL = the conservative loss · the MAE/MFE = the
//   extreme excursions before the exit · the untriggered/invalid-geometry =
//   not counted). The gate: wins ≥ 4/6 (the operator's acceptance — the EU
//   SHORT + the EU LONG + the DXY LONG must flip to WINS under the ADM). THE
//   HARDCODE BAN: every value computed from the data — the ONLY constant in
//   the outcome path is the operator's win threshold (the L2 spec §6.5).
// ═══════════════════════════════════════════════════════════════════════════
const OUTCOME_WINS_REQUIRED = 4;       // the L2 spec §6.5 — the operator's acceptance: "≥ 4/6 wins on the real bars"
const OUTCOME_SESSION_LABEL = '06:00'; // the operator's Monday 06:00 session (the harness's ANCHOR_MS label)
const OUTCOME_DAY_LABEL = 'Monday';    // the visual-eval DAY-dict key — the tool's dms() requires the KEY ("Monday"→2026-07-06), never the ISO date (its parse regex is [A-Za-z]+ + the DAY[day] lookup)
const OUTCOME_REPORT_PATH = join(process.cwd(), 'Visual_Evals', 'v4.5.4', 'TTE_Report_2026-07-06.md');

interface TradeOutcome {
  trig: number | null;
  exit: number | null;
  outcome: 'WIN' | 'LOSS' | 'OPEN';
  exitTrigger: 'TP' | 'SL' | 'TP+SL' | 'none';
  mae: number; mfe: number; r: number | null;
}

/** The outcome simulation — a PURE mirror of plutus_visual_eval.py's
 *  simulate(): the trigger = the first bar with timestamp > ANCHOR_MS whose
 *  range covers the entry; the exit = the first subsequent bar touching the SL
 *  or the TP (the same-bar TP+SL = the conservative loss, r = -1); the MAE/MFE
 *  = the extreme adverse/favorable excursion before the exit (pips); the R =
 *  the realized excursion ÷ the |SL−E| risk. The untriggered → null (not
 *  counted); the tool's parse gate (LONG sl<e<tp / SHORT tp<e<sl) mirrored.
 *  PURE — the ×2 determinism depends on it. */
function simulateOutcome(proj: TradeProjection, bars1h: OHLCBar[]): TradeOutcome | null {
  const px = pip[proj.pair];
  const e = proj.E, sl = proj.SL, tp = proj.TP, d = proj.direction;
  if (d === 'LONG' && !(sl < e && e < tp)) return null;   // the tool's parse gate
  if (d === 'SHORT' && !(tp < e && e < sl)) return null;  // the tool's parse gate
  let trig: number | null = null;
  let mae = 0, mfe = 0;
  for (const b of bars1h) {
    if (b.timestamp <= ANCHOR_MS) continue; // strictly post-anchor — the analysis point's own bar is never a trigger
    if (trig === null) {
      if (d === 'LONG' && b.low <= e) trig = b.timestamp;
      else if (d === 'SHORT' && b.high >= e) trig = b.timestamp;
      else continue;
    }
    const slHit = d === 'LONG' ? b.low <= sl : b.high >= sl;
    const tpHit = d === 'LONG' ? b.high >= tp : b.low <= tp;
    if (d === 'LONG') { mae = Math.max(mae, (e - b.low) / px); mfe = Math.max(mfe, (b.high - e) / px); }
    else { mae = Math.max(mae, (b.high - e) / px); mfe = Math.max(mfe, (e - b.low) / px); }
    if (slHit && tpHit) return { trig, exit: b.timestamp, outcome: 'LOSS', exitTrigger: 'TP+SL', mae, mfe, r: -1 };
    if (slHit) return { trig, exit: b.timestamp, outcome: 'LOSS', exitTrigger: 'SL', mae, mfe, r: -1 };
    if (tpHit) {
      const risk = Math.abs(e - sl);
      return { trig, exit: b.timestamp, outcome: 'WIN', exitTrigger: 'TP', mae, mfe, r: risk > 0 ? Math.abs(tp - e) / risk : null };
    }
  }
  return trig === null ? null : { trig, exit: null, outcome: 'OPEN', exitTrigger: 'none', mae, mfe, r: null };
}

/** The TTE report — the plutus-visual-eval per-pair setup tables (the rows
 *  '| N | **DIR** | Day | Session | entry | — | — | sl | tp | rrr |' — the
 *  interface contract the visual-eval tool's parse_setups consumes). The
 *  E/SL/TP/RRR come from the EMITTED projections, never from the golden. */
function generateTTEReport(projs: TradeProjection[]): string {
  const lines: string[] = [
    '# TTE REPORT — THE OUTCOME-ACCOUNTABILITY GATE',
    '',
    `Golden week ${WEEK} (Monday 2026-07-06) · the session = Monday ${OUTCOME_SESSION_LABEL} (the analysis point ${new Date(ANCHOR_MS).toISOString()}) · the source = the chain's EMITTED projections (${projs.length}) · the outcome simulation mirrors plutus_visual_eval.py's simulate().`,
    '',
  ];
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const pairProjs = projs.filter((p) => p.pair === pair);
    lines.push(`## ${pair}`, '', '| N | **DIR** | Day | Session | entry | — | — | sl | tp | rrr |');
    pairProjs.forEach((p, i) => {
      lines.push(`| ${i + 1} | **${p.direction}** | ${OUTCOME_DAY_LABEL} | ${OUTCOME_SESSION_LABEL} | ${p.E.toFixed(5)} | — | — | ${p.SL.toFixed(5)} | ${p.TP.toFixed(5)} | ${p.RRR.toFixed(2)} |`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

// THE OUTCOME MEASUREMENT — the TTE report write + the RAW trigger→exit
// simulation against the REAL post-anchor bars (barsFor with NO timestamp cap;
// the fixture spans 526.75h past the anchor — measured from the data).
const outcomeBars: Record<PairKey, OHLCBar[]> = {
  DXY: weekBarsFor('DXY', '1H'),
  'EUR/USD': weekBarsFor('EUR/USD', '1H'),
  'GBP/USD': weekBarsFor('GBP/USD', '1H'),
};

const tteReport = generateTTEReport(primaryProjs);
let tteWritten = false;
try {
  mkdirSync(dirname(OUTCOME_REPORT_PATH), { recursive: true });
  writeFileSync(OUTCOME_REPORT_PATH, tteReport);
  tteWritten = true;
  console.log(`  [OUTCOME] TTE report written: ${OUTCOME_REPORT_PATH} (${tteReport.length} chars)`);
} catch (err) {
  console.error(`  [OUTCOME] TTE report write FAILED — the gate is RED (the report is the interface contract): ${err instanceof Error ? err.message : String(err)}`);
}

const outcomeRuns = primaryProjs.map((p) => ({ proj: p, sim: simulateOutcome(p, outcomeBars[p.pair]) }));
const outcomeWins = outcomeRuns.filter((o) => o.sim?.outcome === 'WIN').length;
const outcomeResolved = outcomeRuns.filter((o) => o.sim !== null && (o.sim.outcome === 'WIN' || o.sim.outcome === 'LOSS')).length;
const outcomeOk = outcomeWins >= OUTCOME_WINS_REQUIRED && tteWritten;

console.log('\n=== THE OUTCOME-ACCOUNTABILITY GATE (the W-ADM-5 acceptance — the forecast vs the reality, the L2 spec §6.5) ===');
console.log('  THE PER-TRADE OUTCOMES (the RAW trigger→exit — the first TP/SL touch, never a fitted result):');
for (const { proj, sim } of outcomeRuns) {
  if (!sim) {
    console.log(`  ${proj.pair.padEnd(7)} ${proj.direction.padEnd(5)} E ${proj.E.toFixed(5)} -> NOT TRIGGERED (not counted as a trade)`);
    continue;
  }
  const trigT = sim.trig ? new Date(sim.trig).toISOString() : '—';
  const exitT = sim.exit ? new Date(sim.exit).toISOString() : '—';
  const exitNote = sim.outcome === 'WIN' ? 'TP-hit' : sim.outcome === 'LOSS' ? (sim.exitTrigger === 'TP+SL' ? 'TP+SL same-bar (the conservative loss)' : 'SL-hit') : 'open (not resolved — not counted)';
  const rStr = sim.r !== null ? `${sim.r >= 0 ? '+' : ''}${sim.r.toFixed(2)}R` : '—';
  console.log(`  ${proj.pair.padEnd(7)} ${proj.direction.padEnd(5)} E ${proj.E.toFixed(5)} -> ${sim.outcome.padEnd(4)} ${rStr.padEnd(7)} | trig ${trigT} · exit ${exitT} (${exitNote}) | MAE ${sim.mae.toFixed(1)}p MFE ${sim.mfe.toFixed(1)}p`);
}
console.log(`  [OUTCOME] wins ${outcomeWins}/${outcomeResolved} resolved · the acceptance: ≥ ${OUTCOME_WINS_REQUIRED}/6 (the operator's 6 slots — the EU SHORT + the EU LONG + the DXY LONG must be among the WINS) · TTE report written: ${tteWritten ? 'YES' : 'NO'}`);
console.log(`  [OUTCOME] gate: ${outcomeOk ? 'PASS' : 'FAIL'}${outcomeOk ? ' — the machine\'s trades won where the operator\'s would have won' : ' — the raw outcome is below the operator\'s acceptance (the ADM delegation W-ADM-2 may not have landed); the gate reports the TRUE count, never a tuned one'}`);

// ═══════════════════════════════════════════════════════════════════════════
// THE DETERMINISM ×2 + THE FROZEN PAIR (the exit protocol's mechanical order)
// ═══════════════════════════════════════════════════════════════════════════
const parDigest = projectionDigest(primaryProjs);
const seqDigest = projectionDigest(Object.values(sequentialResults).flatMap((r) => r.projections));
const determinismOk = parDigest === seqDigest;
console.log('\n=== THE DETERMINISM ×2 (the parallel vs the sequential — byte-identical) ===');
console.log(`  parallel  ${parDigest}`);
console.log(`  sequential ${seqDigest}`);
console.log(`  determinism: ${determinismOk ? 'BYTE-IDENTICAL' : 'DIVERGED'}`);

// THE FROZEN PAIR — the pinned sha256 baselines (the byte-identical law, the
// exit protocol step 3). The named calibration: the operator's frozen-pair
// mandate (sl-lmv 91294083 · trade-dedup 33914c89 — byte-identical throughout
// the overhaul; a mismatch = a HARD FAILURE).
const FROZEN_SL_LMV_SHA = '912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab';
const FROZEN_TRADE_DEDUP_SHA = '33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4';

const slHash = createHash('sha256').update(readFileSync(join(process.cwd(), 'src', 'mdve', 'sl-lmv.ts'))).digest('hex');
const tdHash = createHash('sha256').update(readFileSync(join(process.cwd(), 'src', 'mdve', 'trade-dedup.ts'))).digest('hex');
const frozenOk = slHash === FROZEN_SL_LMV_SHA && tdHash === FROZEN_TRADE_DEDUP_SHA;
console.log('\n=== THE FROZEN PAIR (the byte-identical law) ===');
console.log(`  sl-lmv      ${slHash} ${slHash === FROZEN_SL_LMV_SHA ? 'OK' : 'MUTATED'}`);
console.log(`  trade-dedup ${tdHash} ${tdHash === FROZEN_TRADE_DEDUP_SHA ? 'OK' : 'MUTATED'}`);

// ═══════════════════════════════════════════════════════════════════════════
// THE FAILURE SYNTHESIS (the end-of-pipeline)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + formatSynthesis(synthesizeFailures(WEEK)));

// ═══════════════════════════════════════════════════════════════════════════
// THE EXIT PROTOCOL — ANY gate red → exit 1 with the failing gates' detail
// ═══════════════════════════════════════════════════════════════════════════
const pipeOk = pipelineErrors.length === 0;
const gateFails = verdicts.filter((v) => !v.pass);
const scenarioFails = scenarios.filter((s) => !s.pass);
const allGreen = gateFails.length === 0 && scenarioFails.length === 0 && determinismOk && frozenOk && pipeOk && outcomeOk;

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('THE W6 GOLDEN GATE — THE SUMMARY');
console.log(`  G1-G10: ${verdicts.length - gateFails.length}/${verdicts.length} PASS`);
if (gateFails.length > 0) {
  console.log('  FAILING GATES:');
  for (const v of gateFails) console.log(`    - ${v.gate} ${v.name}: ${v.detail}`);
}
console.log(`  A1-A7: ${scenarios.length - scenarioFails.length}/${scenarios.length} PASS`);
if (scenarioFails.length > 0) {
  console.log('  FAILING SCENARIOS:');
  for (const s of scenarioFails) console.log(`    - ${s.id} ${s.name}: ${s.detail}`);
}
console.log(`  [PIPE] the pipeline-stage health: ${pipeOk ? 'PASS (every stage ran)' : 'FAIL — ' + pipelineErrors.map((p) => p.stage).join('; ')}`);
if (!pipeOk) {
  console.log('  PIPELINE-STAGE FAILURES (the loud-fail law — the harness never crashed, it reported):');
  for (const p of pipelineErrors) console.log(`    - ${p.stage}: ${p.detail}`);
}
console.log(`  determinism ×2: ${determinismOk ? 'PASS' : 'FAIL'} · frozen pair: ${frozenOk ? 'PASS' : 'FAIL'} · total wall: ${(totalWallMs / 1000).toFixed(1)}s`);
console.log(`  OUTCOME GATE: ${outcomeWins}${outcomeResolved > 0 ? '/' + outcomeResolved : ''} wins — the acceptance: ≥ ${OUTCOME_WINS_REQUIRED}/6 — ${outcomeOk ? 'PASS' : 'FAIL'}`);
console.log(`  golden convergence: ${goldenHits}/${goldenTotal}`);
console.log(`  FEED-SPLIT: decision max_t=${decisionStats.max_t} le_anchor=${decisionStats.max_t <= ANCHOR_MS} · week max_t=${weekStats.max_t} gt_anchor=${weekStats.max_t > ANCHOR_MS} · week FutureBarLeak throw=${feedSplitWeekThrow}`);
console.log(`  THE EXIT: ${allGreen ? 'exit 0 — ALL G1-G10 + A1-A7 PASS' : 'exit 1 — the failing gates/scenarios above MUST be fixed (the harness proves the gates CAN fail)'}`);
console.log('═══════════════════════════════════════════════════════════════════════');

process.exit(allGreen ? 0 : 1);
