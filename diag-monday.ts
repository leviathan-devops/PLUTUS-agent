import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { reAnchorMirror } from './src/mdve/mirror.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { dedupTrades } from './src/mdve/trade-dedup.js';
import { floorSetupsToDedupRows } from './src/pipeline/mdve-stage.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
// THE TEMPORAL ENGINE (the operator's temporal law): the Monday run anchor
// is locked ONE-WAY as the FIRST action — before ANY bar read; gateBars
// PHYSICALLY BLOCKS every future bar past it.
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
// THE DAY-END FILL SIMULATION — the operator's fill-model law (the temporal
// lock = the GENERATION; the day-end fast-forward = the DESIGN): for every
// generated trade, resolve what the E/SL/TP actually did during the day.
import { simulateDayFill } from './src/mdve/fill-sim.js';
import type { FillOutcome } from './src/mdve/fill-sim.js';

// ═══ THE MONDAY RUN ANCHOR — LOCKED FIRST (the operator's temporal law:
//   today = 2026-07-06 07:00 UTC (1783321200000); every bar past it is
//   physically DROPPED by the gate — no forward looking, ever) ═══
const ANCHOR_MS = 1783321200000; // the Monday 07:00 UTC — the run's "today"
lockRunAnchor(ANCHOR_MS);
console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(ANCHOR_MS).toISOString()} (${ANCHOR_MS}) - every bar past this is DROPPED by the gate`);

const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000; // Mon 2026-07-06 00:00Z — the report's week start

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => gateBars((raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS)).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m')),
};

// ═══════════════════════════════════════════════════════════════════════════
// THE MONDAY GOLDENS — the MEASUREMENT ORACLE ONLY (the pipeline NEVER reads
// them; the build target from ENTRY 1 of PLUTUS_V4.5.3_BUILD_REPORT.md:
// DXY Mon LONG 100.945 · SHORT 101.14; EU Mon SHORT 1.14395 · LONG 1.14110;
// GU Mon LONG 1.33330). The hardcode ban holds: these are the measurement
// oracle, never a pipeline input. The 1783321200000 anchor is the run input.
// ═══════════════════════════════════════════════════════════════════════════
const GOLDEN: Record<string, { dir: string; entry: number }[]> = {
  DXY: [{ dir: 'LONG', entry: 100.945 }, { dir: 'SHORT', entry: 101.14 }],
  'EUR/USD': [{ dir: 'SHORT', entry: 1.14395 }, { dir: 'LONG', entry: 1.14110 }],
  'GBP/USD': [{ dir: 'LONG', entry: 1.33330 }],
};
const pip: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const TOLERANCE_PIPS = 3; // the operator's 3-pip metric — THE only number that counts

// ═══════════════════════════════════════════════════════════════════════════
// THE MEASUREMENT — the diag-golden-coverage best-delta logic (the same
// Math.min |entry − golden| / pip over the pair's deduped trades, the same
// level-fidelity, day-agnostic). The Monday anchor makes it Monday-honest.
// ═══════════════════════════════════════════════════════════════════════════
interface MeasureLine { pair: string; dir: string; entry: number; best: number; hit: boolean; }
function measurePair(
  pair: string,
  trades: Array<{ pair?: string; direction: string; entry: number }>,
): { lines: MeasureLine[]; hits: number; total: number; uniqueCount: number } {
  const goldens = GOLDEN[pair] ?? [];
  // The diag-golden-coverage semantics (line 130): the pair's OWN unique
  // trades — `dedup.uniqueTrades.filter(t => t.pair === pair)`.
  const ourTrades = trades.filter(t => t.pair === undefined || t.pair === pair);
  let hits = 0;
  const lines: MeasureLine[] = [];
  for (const g of goldens) {
    const deltas = ourTrades
      .filter(t => t.direction === g.dir)
      .map(t => Math.abs(t.entry - g.entry) / pip[pair]!);
    const best = deltas.length ? Math.min(...deltas) : -1;
    const hit = best >= 0 && best <= TOLERANCE_PIPS;
    if (hit) hits++;
    lines.push({ pair, dir: g.dir, entry: g.entry, best, hit });
  }
  return { lines, hits, total: goldens.length, uniqueCount: ourTrades.length };
}

function fmtLine(l: MeasureLine): string {
  const verdict = l.best < 0 ? 'MISSING' : (l.hit ? 'HIT' : 'MISS');
  return `${l.dir.padEnd(5)} ${l.entry.toFixed(5)} -> ${l.best < 0 ? 'NONE' : `Δ${l.best.toFixed(1)}p`} (${verdict})`;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE NATIVE LANE — the SAME pipeline DXY uses to generate its setups, run
// on EACH pair INDIVIDUALLY with NO cascade (the operator's native-lane law,
// VERBATIM: "INSTEAD OF MAKING CASCADE THE PRIMARY, RUN THE SAME FUCKING
// PIPELINE THAT DXY USES TO GENERATE ITS SETUPS ON EU + GU W/ NO CASCADE.
// IT SHOULD LITERALLY GENERATE THE GOLDEN SETUPS BY DEFAULT"). Each pair's
// native setups → the REAL rows wiring (floorSetupsToDedupRows — the same
// §9.1 adapter the DXY source lane ships, with NO mirrors) → dedupTrades →
// the best-delta vs the Monday goldens. The honest absence prints the honest
// zeros — never a fabricated match.
// ═══════════════════════════════════════════════════════════════════════════
const nativeSetups = {
  DXY: generateSourceSetupsV45(models.DXY),
  'EUR/USD': generateSourceSetupsV45(models['EUR/USD']),
  'GBP/USD': generateSourceSetupsV45(models['GBP/USD']),
};
console.error(`[native] setup counts: DXY ${nativeSetups.DXY.length} | EU ${nativeSetups['EUR/USD'].length} | GU ${nativeSetups['GBP/USD'].length}`);
const nativeRows = {
  DXY: floorSetupsToDedupRows(nativeSetups.DXY, []),
  'EUR/USD': floorSetupsToDedupRows(nativeSetups['EUR/USD'], []),
  'GBP/USD': floorSetupsToDedupRows(nativeSetups['GBP/USD'], []),
};
const nativeDedup = {
  DXY: dedupTrades(nativeRows.DXY),
  'EUR/USD': dedupTrades(nativeRows['EUR/USD']),
  'GBP/USD': dedupTrades(nativeRows['GBP/USD']),
};
const nativeStats = {
  DXY: measurePair('DXY', nativeDedup.DXY.uniqueTrades),
  'EUR/USD': measurePair('EUR/USD', nativeDedup['EUR/USD'].uniqueTrades),
  'GBP/USD': measurePair('GBP/USD', nativeDedup['GBP/USD'].uniqueTrades),
};

// ═══════════════════════════════════════════════════════════════════════════
// THE CASCADE — the DXY setups cascaded ON TOP of the EU/GU pair-native
// E1 anchors (the operator's cascade law — COMPLEMENTARY, never overwriting;
// the regex matching: BoM→BoM, MoM→MoM, LQZ→LQZ, SUPPLY→DEMAND, DEMAND→
// SUPPLY for the DXY→EU inverse). The diag-golden-coverage wiring (the
// prior-week pre-flight + buildE2Core + cascadeV45 + floorSetupsToDedupRows
// + dedupTrades) — the SAME path the report ships, at the Monday anchor.
// ═══════════════════════════════════════════════════════════════════════════
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
const activeMirrors = [...cascade.eu, ...cascade.gu].filter(m => m.status === 'ACTIVE');
const cascadeRows = floorSetupsToDedupRows(nativeSetups.DXY, activeMirrors);
const cascadeDedup = dedupTrades(cascadeRows);
const cascadeStats = {
  DXY: measurePair('DXY', cascadeDedup.uniqueTrades),
  'EUR/USD': measurePair('EUR/USD', cascadeDedup.uniqueTrades),
  'GBP/USD': measurePair('GBP/USD', cascadeDedup.uniqueTrades),
};
console.error(`[cascade] mirrors: EU ACTIVE ${cascade.eu.filter(m => m.status === 'ACTIVE').length}/${cascade.eu.length} | GU ACTIVE ${cascade.gu.filter(m => m.status === 'ACTIVE').length}/${cascade.gu.length} | failed anchors ${cascade.failedAnchors.length}`);

// ═══════════════════════════════════════════════════════════════════════════
// THE REPORT — the operator's requested clear sections: the native lanes
// FIRST (the per-pair stats vs the Monday goldens), THEN the cascade.
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== THE MONDAY NATIVE LANES (the DXY pipeline on each pair, NO cascade) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD']) {
  const s = nativeStats[pair]!;
  const line = s.lines.map(fmtLine).join(' | ');
  console.log(`  ${pair.padEnd(7)}: ${line}  [${s.uniqueCount} unique native trades]`);
}
{
  const allHits = Object.values(nativeStats).reduce((n, s) => n + s.hits, 0);
  const allTotal = Object.values(nativeStats).reduce((n, s) => n + s.total, 0);
  console.log(`  native hits: ${allHits}/${allTotal} (<= ${TOLERANCE_PIPS} pip)`);
}

console.log('\n=== THE MONDAY CASCADE (the DXY setups cascaded on top) ===');
for (const pair of ['EUR/USD', 'GBP/USD']) {
  const s = cascadeStats[pair]!;
  const line = s.lines.map(fmtLine).join(' | ');
  console.log(`  ${pair.padEnd(7)}: ${line}  [${s.uniqueCount} unique cascade trades]`);
}
{
  const cascadePairs = ['EUR/USD', 'GBP/USD'];
  const allHits = cascadePairs.reduce((n, p) => n + cascadeStats[p]!.hits, 0);
  const allTotal = cascadePairs.reduce((n, p) => n + cascadeStats[p]!.total, 0);
  console.log(`  cascade hits: ${allHits}/${allTotal} (<= ${TOLERANCE_PIPS} pip)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE DAY-END FILL SIMULATION — the operator's fill-model law (VERBATIM:
// "temporal lock is for pipeline generation. once everything is generated you
// obviously need to fast forward to the END OF THE DAY END OF NY SESSION 1
// hour before market close to accurately see what E/SL/TP were actually
// hit"). The generation stays gated at the Monday anchor (the temporal lock!);
// the OUTCOMES fast-forward to the day-end using the FULL day's bars (the
// ungated 1H day bars 00:00-20:00 UTC — the sim's legitimate data, the same
// simBarsFor feed the report's fill model uses). Every generated trade (the
// native + the cascade!) gets its day-end verdict — the operator's requested
// stats now include the OUTCOMES, not just the entry deltas.
// ═══════════════════════════════════════════════════════════════════════════
const DAY_START_MS = 1783296000000; // Mon 2026-07-06 00:00Z — the sim's day start
const DAY_END_MS = 1783368000000;   // Mon 2026-07-06 20:00Z — the day-end (the NY close minus 1 hour — the operator's horizon)
const simDayBarsFor = (p: string): OHLCBar[] =>
  (raw.find(r => r.pair === p && r.timeframe === '1H')?.bars ?? [])
    .filter((b: any) => b.timestamp >= DAY_START_MS && b.timestamp < DAY_END_MS)
    .sort((a: any, b: any) => a.timestamp - b.timestamp);
const simTradeFor = (t: { pair: string; direction: string; entry: number; sl: number; tp: number }): Parameters<typeof simulateDayFill>[0] => ({
  pair: t.pair,
  direction: t.direction === 'LONG' ? 'LONG' : 'SHORT',
  entry: t.entry,
  sl: t.sl,
  tp: t.tp,
  sessionStartMs: DAY_START_MS,
  sessionEndMs: DAY_END_MS,
});
const outcomeSign = (o: FillOutcome): string => (o.status === 'WIN' ? '+' : o.status === 'LOSS' ? '-' : '');

console.log('\n=== THE MONDAY DAY-END OUTCOMES (the full-trading-day fill simulation) ===');
const simRows = [
  ...[['NATIVE', nativeDedup.DXY.uniqueTrades], ['NATIVE', nativeDedup['EUR/USD'].uniqueTrades], ['NATIVE', nativeDedup['GBP/USD'].uniqueTrades], ['CASCADE', cascadeDedup.uniqueTrades]] as const,
].flatMap(([lane, trades]) => trades.map(t => ({ lane, t })));
const outcomeTallies: Record<FillOutcome['status'], number> = { WIN: 0, LOSS: 0, NOT_TRIGGERED: 0, OPEN: 0 };
for (const { lane, t } of simRows) {
  const out = simulateDayFill(simTradeFor(t), simDayBarsFor(t.pair));
  outcomeTallies[out.status] = (outcomeTallies[out.status] ?? 0) + 1;
  const exit = out.exitPrice !== null ? ` exit=${out.exitPrice}` : '';
  console.log(`  [${lane.padEnd(7)}] ${t.pair.padEnd(7)} ${t.direction.padEnd(5)} E=${t.entry} SL=${t.sl} TP=${t.tp} -> ${out.status} ${outcomeSign(out)}${out.rrr.toFixed(2)}R${exit}`);
}
console.log(`  day-end tallies: WIN ${outcomeTallies.WIN} · LOSS ${outcomeTallies.LOSS} · NOT_TRIGGERED ${outcomeTallies.NOT_TRIGGERED} · OPEN ${outcomeTallies.OPEN} (${simRows.length} trades)`);

// ═══════════════════════════════════════════════════════════════════════════
// THE SUMMARY — the per-pair native vs cascade comparison table + the verdict
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== THE SUMMARY (native vs cascade) ===');
for (const pair of ['DXY', 'EUR/USD', 'GBP/USD']) {
  const n = nativeStats[pair]!;
  const c = cascadeStats[pair]!;
  const nativeUnique = nativeDedup[pair]!.stats.perPair[pair]?.unique ?? 0;
  const cascadeUnique = cascadeDedup.stats.perPair[pair]?.unique ?? 0;
  console.log(`  ${pair.padEnd(7)}: native ${n.hits}/${n.total} HIT (${nativeUnique} unique) | cascade ${c.hits}/${c.total} HIT (${cascadeUnique} unique)${pair === 'DXY' ? '  [cascade = N/A — DXY is the source]' : ''}`);
}
{
  const nHits = Object.values(nativeStats).reduce((n, s) => n + s.hits, 0);
  const nTotal = Object.values(nativeStats).reduce((n, s) => n + s.total, 0);
  const cHits = ['EUR/USD', 'GBP/USD'].reduce((n, p) => n + cascadeStats[p]!.hits, 0);
  const cTotal = ['EUR/USD', 'GBP/USD'].reduce((n, p) => n + cascadeStats[p]!.total, 0);
  const verdict = nHits >= 3 && cHits >= 1
    ? `native ${nHits}/${nTotal} + cascade ${cHits}/${cTotal} — the native lane generates the golden setups by default; the cascade complements (the operator's native-lane + cascade laws hold)`
    : `native ${nHits}/${nTotal} + cascade ${cHits}/${cTotal} — the Monday goldens NOT hit at <= ${TOLERANCE_PIPS}p (honest report — the mechanism, never a fabricated match)`;
  console.log(`\n  VERDICT: ${verdict}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE COMPLEMENT PROOF — the mirror's anchor resolution consumes the
// pair-NATIVE E1 anchors (the target pair's own zones) matched structurally
// (the classification + the side-inversion); the E2 designation is the
// complementary confirmation, never the sole selector; the D50 direction-
// appropriate consumption (the LONG → the demand-side anchor, the SHORT →
// the supply-side) is PRESERVED. Directly exercises reAnchorMirror:
//   (1) the NATIVE-FALLBACK test — when EVERY relevant target zone is
//       excluded (selectPairNativeZone returns null), the mirror STILL
//       anchors via resolveNativeAnchor (the honest pair-native structural
//       match) instead of a FAILED anchor.
//   (2) the BOTH-SIDES test — the emitted mirror's anchor sits on the
//       direction-appropriate side (the LONG → DEMAND, never the SUPPLY).
// ═══════════════════════════════════════════════════════════════════════════
{
  const euLong = nativeSetups['EUR/USD'].find(s => s.direction === 'LONG') ?? null;
  if (euLong) {
    const guExcluded = new Set<string>([
      ...models['GBP/USD'].zones.map(z => z.id),
      ...models['GBP/USD'].lmv.table.map(z => `LMV|GBP/USD|${z.center.toFixed(5)}`),
    ]);
    const fallbackMirror = reAnchorMirror(euLong, models['GBP/USD'], 'GBP/USD', {
      sourceFormationMs: euLong.battleMs ?? NaN,
      excludedAnchorIds: guExcluded,
    });
    const fired = fallbackMirror !== null && fallbackMirror.anchorZoneId !== 'NONE';
    console.log('\n=== THE COMPLEMENT PROOF (the pair-native fallback + the D50 side preservation) ===');
    console.log(`  source: EU native ${euLong.direction} @ ${euLong.entry} (${euLong.setupId})`);
    console.log(`  forced-null primary search (every GU zone excluded) -> mirror: ${fallbackMirror ? fallbackMirror.status : 'NULL'}`);
    if (fired) {
      const anchor = models['GBP/USD'].zones.find(z => z.id === fallbackMirror!.anchorZoneId)
        ?? models['GBP/USD'].lmv.table.find(z => `LMV|GBP/USD|${z.center.toFixed(5)}` === fallbackMirror!.anchorZoneId);
      const anchorSide = anchor
        ? ('type' in anchor ? anchor.type : (anchor.side === 'BUY_SIDE' ? 'DEMAND' : 'SUPPLY'))
        : 'UNKNOWN';
      const sideOk = fallbackMirror!.direction === 'LONG'
        ? anchorSide === 'DEMAND'
        : anchorSide === 'SUPPLY';
      console.log(`  anchor: ${fallbackMirror!.anchorZoneId} (${anchorSide} side, direction ${fallbackMirror!.direction})`);
      console.log(`  ${sideOk ? 'the D50 direction-appropriate consumption HOLDS — the LONG mirror anchored the DEMAND-side native zone (never the supply)' : 'FAILED — the wrong side!'}`);
    } else {
      console.log('  FAILED — the native-anchor fallback did not fire (selectPairNativeZone-null produced no mirror)');
    }
  } else {
    console.log('\n=== THE COMPLEMENT PROOF (skipped — no EU native LONG setup at the Monday anchor) ===');
  }
}
console.log('\n[DONE]');
