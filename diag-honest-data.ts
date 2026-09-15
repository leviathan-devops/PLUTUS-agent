/**
 * diag-honest-data.ts — THE ZR-7A GATE (the honest-data purge — spec Part
 * 10.1 + Part 4 verification battery). The operator's law (2026-08-04,
 * verbatim): "NO FABRICATED DATA ANYWHERE. GET THE CORRECT FUCKING DATA OR
 * THROW ERROR. BLACK AND WHITE, NO MIDDLE GROUND, NO FALLBACK FABRICATED
 * BULLSHIT."
 *
 * THE GATES:
 *   T1: the GBP options dimension scores 0 (no walls → the P3_NO_DATA honest
 *       zero — the Gamma-histogram proxy GONE).
 *   T2: the Analyst dimension scores 0 (no commentary → the P4_NO_DATA honest
 *       zero — the HP-trend proxy GONE).
 *   T3: the Derivatives dimension scores 0 (the P7_NO_DATA honest zero — the
 *       zone-clustering arena GONE).
 *   T4: the Regime dimension scores 0 + NO RegimeMA level (the P9_NO_DATA
 *       honest zero — the incoherent score-0-with-a-level half-state GONE).
 *   T5: ZERO fabricated levels in the zone map (the provenance scan: every
 *       level's provenance.source is a REAL tag — the NO_DATA pillars emitted
 *       NO levels, and buildIpZones' firewall skips any NO_DATA provenance —
 *       every zone traces to a REAL level).
 *   T6: the frozen pair byte-identical (the plan's stated hashes — sl-lmv.ts
 *       912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab,
 *       trade-dedup.ts
 *       33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4)
 *       + the pillarEngine determinism (two runs — identical source tags,
 *       scores, and provenance).
 *
 * The golden 10/21 + the report determinism ×2 are verified by the ZR-7A
 * battery's OTHER steps (diag-golden-coverage.ts + report-v452.ts ×2) — this
 * gate measures the PURGE itself (the D7 discipline: measure the shipped
 * pipeline — the report's own loadOptionsWalls + buildIpZones are imported
 * and exercised, never re-derived).
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Run: bun diag-honest-data.ts
 */
import { buildChartModel } from './src/mdve/index.js';
import { buildIpZones, loadOptionsWalls } from './report-v452.js';
import { pillarEngine } from './src/brains/9-pillar-lobe.js';
import type { PillarResult } from './src/brains/9-pillar-lobe.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00:00Z — the report's anchor
const WEEK = '2026-07-06';
const FIXTURE = process.env.BARS_FIXTURE ?? join('/tmp', 'opencode', 'bars_raw.json');
const PAIRS = ['DXY', 'EUR/USD', 'GBP/USD'] as const;

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= ANCHOR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => {
  const b = barsFor(p, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};

// The report's exact model build (report-v452.ts:312-314) — the shipped path.
const MODELS: Record<string, ReturnType<typeof buildChartModel>> = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};

// The report's exact pillar wiring (report-v452.ts:354-367) — DXY receives the
// FULL walls + the real component spots; EUR/USD its OWN walls (pair-native);
// GBP has NO walls in the JUL-6 image → the honest [NO DATA]. No analyst
// commentary, no derivatives data, no dxyRegime on the report path.
const WALLS = loadOptionsWalls();
const pillarByPair: Record<string, PillarResult> = {};
for (const pair of PAIRS) {
  const model = MODELS[pair];
  const optionsData = pair === 'DXY' ? WALLS?.data : WALLS?.perPair[pair];
  const componentSpots = pair === 'DXY' ? WALLS?.componentSpots : undefined;
  pillarByPair[pair] = pillarEngine({
    instrument: pair,
    bars: barsFor(pair, '1H'),
    currentPrice: model.spot,
    optionsData,
    componentSpots,
  });
}

/** The fabricated source patterns the purge DELETES (spec 6.1 + Part 2). */
const FABRICATED_PATTERNS = [
  'P3-Gamma',          // the Gamma-histogram proxy (computeP3's deleted block)
  'HP Trend',          // the HP-trend proxy (computeP4's deleted block)
  'HP Cycle Reversion',// the HP-cycle proxy (computeP4's deleted block)
  'P7-ArenaBoundary',  // the zone-clustering arena (computeP7's deleted block)
  'P9-RegimeMA',       // the regime half-state level (emitted without data)
];

let failures = 0;
const check = (name: string, cond: boolean, detail: string): void => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
  if (!cond) failures++;
};

console.log('=== ZR-7A GATE — THE HONEST-DATA PURGE (diag-honest-data.ts) ===\n');
console.log(`Options walls bundle: ${WALLS ? `${WALLS.data.strikes.length} strikes (${WALLS.wallDays.join(', ')})` : 'ABSENT (honest [NO DATA])'}\n`);

// ── T1: the GBP Options-Derived dimension scores 0 (no walls → no histogram) ──
console.log('T1 — the GBP Options-Derived dimension (no walls → the honest zero):');
{
  const gbp = pillarByPair['GBP/USD'];
  const p3Levels = gbp.levels.filter((l) => l.provenance?.pillar === 'P3');
  const p3NoData = gbp.levels.filter((l) => l.provenance?.source === 'P3_NO_DATA');
  check('GBP options dimension === 0', gbp.confluenceDimensions.options === 0,
    `options dim = ${gbp.confluenceDimensions.options} (the honest zero — was 1.0/2 via the histogram)`);
  check('GBP P3 score === 0', gbp.scores['P3'] === 0, `P3 score = ${gbp.scores['P3']}`);
  check('GBP emits ZERO P3 levels', p3Levels.length === 0, `${p3Levels.length} P3 levels`);
  check('GBP emits ZERO P3_NO_DATA levels', p3NoData.length === 0,
    `${p3NoData.length} NO_DATA levels (the honest pillar returns [] — the absence, never a level)`);
}

// ── T2: the Analyst dimension scores 0 (no commentary → no HP proxy) ──
console.log('\nT2 — the Analyst dimension (no commentary → the honest zero):');
for (const pair of PAIRS) {
  const r = pillarByPair[pair];
  const p4Levels = r.levels.filter((l) => l.provenance?.pillar === 'P4');
  check(`${pair} analyst dimension === 0`, r.confluenceDimensions.analyst === 0,
    `analyst dim = ${r.confluenceDimensions.analyst}`);
  check(`${pair} emits ZERO P4 levels`, p4Levels.length === 0, `${p4Levels.length} P4 levels (the HP proxy GONE)`);
}

// ── T3: the Derivatives dimension scores 0 (no arena level) ──
console.log('\nT3 — the Derivatives dimension (no arena level):');
for (const pair of PAIRS) {
  const r = pillarByPair[pair];
  const p7Levels = r.levels.filter((l) => l.provenance?.pillar === 'P7');
  check(`${pair} P7 score === 0`, r.scores['P7'] === 0, `P7 score = ${r.scores['P7']}`);
  check(`${pair} emits ZERO P7 levels`, p7Levels.length === 0, `${p7Levels.length} P7 levels (the arena GONE)`);
}

// ── T4: the Regime dimension scores 0 + NO RegimeMA level ──
console.log('\nT4 — the Regime dimension (no dxyRegime → the honest zero):');
for (const pair of PAIRS) {
  const r = pillarByPair[pair];
  const regimeMa = r.levels.filter((l) => l.source === 'P9-RegimeMA');
  check(`${pair} P9 score === 0`, r.scores['P9'] === 0, `P9 score = ${r.scores['P9']}`);
  check(`${pair} regime dimension === 0`, r.confluenceDimensions.regime === 0,
    `regime dim = ${r.confluenceDimensions.regime} (was inflated by the arena)`);
  check(`${pair} emits ZERO P9-RegimeMA levels`, regimeMa.length === 0,
    `${regimeMa.length} RegimeMA levels (the half-state GONE — the level must not exist without the data)`);
}

// ── T5: ZERO fabricated levels in the zone map (the provenance scan) ──
console.log('\nT5 — the provenance scan (ZERO fabricated levels in the zone map):');
{
  let totalZones = 0;
  for (const pair of PAIRS) {
    const r = pillarByPair[pair];
    const noDataLevels = r.levels.filter((l) => l.provenance?.source.endsWith('_NO_DATA'));
    const fabricated = r.levels.filter((l) =>
      FABRICATED_PATTERNS.some((p) => l.source.includes(p)));
    // The SHIPPED firewall (report-v452.ts's buildIpZones — imported, not
    // re-derived): the NO_DATA-provenance levels are skipped; every surviving
    // zone must trace to a REAL level.
    const zones = buildIpZones(MODELS[pair], r, pair);
    totalZones += zones.length;
    const realPrices = new Set(r.levels
      .filter((l) => !l.provenance?.source.endsWith('_NO_DATA'))
      .map((l) => l.price.toFixed(5)));
    const untraceable = zones.filter((z) => {
      const price = z.id.split('|').pop() ?? '';
      return !realPrices.has(price);
    });
    check(`${pair}: zero NO_DATA-provenance levels`, noDataLevels.length === 0,
      `${noDataLevels.length} NO_DATA levels (the absent pillars contributed NOTHING)`);
    check(`${pair}: zero fabricated sources`, fabricated.length === 0,
      `fabricated levels = ${fabricated.length} (${FABRICATED_PATTERNS.join(' / ')})`);
    check(`${pair}: every zone traces to a REAL level`, untraceable.length === 0,
      `${zones.length} IP zones → ${untraceable.length} untraceable (the firewall kept ONLY the real levels)`);
  }
  console.log(`\n  TOTAL IP zones in the shipped map: ${totalZones}`);
}

// ── T6: the frozen pair byte-identical + the engine determinism ──
console.log('\nT6 — the frozen pair + the engine determinism:');
{
  const root = import.meta.dir;
  const slSha = createHash('sha256').update(readFileSync(join(root, 'src', 'mdve', 'sl-lmv.ts'))).digest('hex');
  const tdSha = createHash('sha256').update(readFileSync(join(root, 'src', 'mdve', 'trade-dedup.ts'))).digest('hex');
  check('sl-lmv.ts frozen hash', slSha === '912940832fac44bc838d53423cbb921eff501de60a9f2641bf20c1d1497eaeab', slSha);
  check('trade-dedup.ts frozen hash', tdSha === '33914c897e7775402eefd7d13a5d3675667a2ace576b55a689bc864401a680e4', tdSha);

  // Determinism: two pillarEngine runs on identical inputs → identical
  // scores, sources, and provenance tags (the honest zeros are pure — the
  // absent data → the zero, no wall-clock, no fitted constants).
  const gbpModel = MODELS['GBP/USD'];
  const run = (): string => {
    const r = pillarEngine({
      instrument: 'GBP/USD',
      bars: barsFor('GBP/USD', '1H'),
      currentPrice: gbpModel.spot,
    });
    return JSON.stringify({
      scores: r.scores,
      dims: r.confluenceDimensions,
      levels: r.levels.map((l) => [l.source, l.price, l.provenance?.source]),
    });
  };
  const runA = run();
  const runB = run();
  check('pillarEngine determinism (two runs identical)', runA === runB,
    `${runA.length} chars — byte-identical source tags + scores + provenance`);
}

// ── THE PER-PAIR SUMMARY (the honest state the report ships) ──
console.log('\n=== THE SHIPPED PER-PAIR STATE (after the purge) ===');
console.log('| pair | IP zones | 6D composite | IP ZFP | options dim | analyst dim | regime dim |');
console.log('|---|---|---|---|---|---|---|');
for (const pair of PAIRS) {
  const r = pillarByPair[pair];
  const zones = buildIpZones(MODELS[pair], r, pair);
  const zfp = r.compositeScore >= 12 ? 10 : r.compositeScore >= 10 ? 20 : r.compositeScore >= 8 ? 30 : r.compositeScore >= 6 ? 40 : r.compositeScore >= 4 ? 55 : 65;
  console.log(`| ${pair} | ${zones.length} | ${r.compositeScore} | ${zfp}% | ${r.confluenceDimensions.options.toFixed(1)}/2 | ${r.confluenceDimensions.analyst.toFixed(1)}/2 | ${r.confluenceDimensions.regime.toFixed(1)}/2 |`);
}

console.log(`\n=== VERDICT: ${failures === 0 ? 'PASS (all gates)' : `FAIL (${failures} gate${failures > 1 ? 's' : ''})`} ===`);
process.exit(failures === 0 ? 0 : 1);
