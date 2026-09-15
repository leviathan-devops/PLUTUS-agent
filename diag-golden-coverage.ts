import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { dedupTrades } from './src/mdve/trade-dedup.js';
import { floorSetupsToDedupRows } from './src/pipeline/mdve-stage.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
// THE TEMPORAL ENGINE (the operator's temporal law): the --day/--time input
// locks the run anchor ONE-WAY as the FIRST action — before ANY bar read;
// gateBars PHYSICALLY BLOCKS every future bar past it. The gate is inert
// until the lock — the no-arg legacy path stays byte-identical.
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
/**
 * parseRunAnchor — THE TEMPORAL RUN ANCHOR PARSER (the operator's "today").
 * IDENTICAL COPY in all four runners — a divergence is a defect.
 */
function parseRunAnchor(argv: string[]): number | null {
  const dayArg = argv.find((a) => a.startsWith('--day='));
  if (!dayArg) return null; // the legacy path — the ANCHOR_MS fallback
  const token = dayArg.slice('--day='.length);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
  if (!m) throw new Error(`TEMPORAL PARSE: invalid --day '${token}' - expected YYYY-MM-DD`);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`TEMPORAL PARSE: invalid --day '${token}' - expected YYYY-MM-DD`);
  }
  let hh = 7, mm = 0; // the London-open default (the operator's run moment)
  const timeArg = argv.find((a) => a.startsWith('--time='));
  if (timeArg) {
    const t = /^(\d{2}):(\d{2})$/.exec(timeArg.slice('--time='.length));
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) {
      throw new Error(`TEMPORAL PARSE: invalid --time - expected HH:MM with HH 0-23, MM 0-59`);
    }
    hh = Number(t[1]); mm = Number(t[2]);
  }
  return Date.UTC(Number(m[1]), month - 1, day, hh, mm);
}
// ═══ THE TEMPORAL LOCK-FIRST (before ANY bar read — the fixture load below
//   is the first data touch; the lock precedes it) ═══
const anchorMs = parseRunAnchor(process.argv);
if (anchorMs !== null) {
  lockRunAnchor(anchorMs);
  console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(anchorMs).toISOString()} (${anchorMs}) - every bar past this is DROPPED by the gate`);
}
const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000; // Mon 2026-07-06 00:00Z — the report's week start
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => gateBars((raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS)).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY','1H'), barsFor('DXY','4H'), barsFor('DXY','30m'), spotFor('DXY'), undefined, barsFor('DXY','15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD','1H'), barsFor('EUR/USD','4H'), barsFor('EUR/USD','30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD','15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD','1H'), barsFor('GBP/USD','4H'), barsFor('GBP/USD','30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD','15m')),
};
const dxySetups = generateSourceSetupsV45(models.DXY);
// Wave A1 (2026-08-01): the REPORT's E2 path — the prior-week pre-flight +
// buildE2Core (the day-reachability). The OLD direct buildShapeBrain calls
// measured the NO-storyline path — the phantom "1.14544 Δ2.3p" hit (an
// emission that NEVER FILLED — the level is Friday-only on the fixture; the
// Monday high is 1.14480). The D3e lesson: the gate must measure the
// pipeline it ships, not a re-derived variant.
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
const cascade = cascadeV45(dxySetups, models, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: e2.euCascaded && e2.guCascaded ? { eu: e2.euCascaded, gu: e2.guCascaded } : undefined,
});
const activeMirrors = [...cascade.eu, ...cascade.gu].filter(m => m.status === 'ACTIVE');
const rows = floorSetupsToDedupRows(dxySetups, activeMirrors);
const dedup = dedupTrades(rows);

// Golden entries
// ═══════════════════════════════════════════════════════════════════════════
// TEMPORARY ARCHITECTURE — THE MEASUREMENT ORACLE (the operator's ruling,
// 2026-08-04): "this should NOT BE CORE INFRA once everything is solid this
// should be removed complately. The agent/codebase must be able to self
// validate based on RULES and LOGIC not a hardcoded data set." This `golden`
// const is the PHASE-1 MEASUREMENT ORACLE ONLY — the pipeline NEVER reads it;
// this diag measures the emissions against it. REMOVE once the self-validation
// protocol (diag-self-validation.ts) is the primary gate.
// THE NEW ORACLE (2026-08-04): the operator's REAL EU/GU trades — verbatim from
// MASTER_CONTEXT/Golden_Operator_Trade_Feedback_EU_GU.md. THE OLD TIER-D WAS
// HALLUCINATED (the pixel-inferred rows — the GU's direction was even inverted).
// ═══════════════════════════════════════════════════════════════════════════
const golden = {
  DXY: [  // Tier A — the documented-exact DXY levels (unchanged)
    {dir: 'LONG', entry: 100.945}, {dir: 'SHORT', entry: 101.14},
    {dir: 'LONG', entry: 100.845}, {dir: 'SHORT', entry: 101.19},
    {dir: 'LONG', entry: 100.975}, {dir: 'SHORT', entry: 101.235},
  ],
  'EUR/USD': [  // the operator's REAL EU 8 (Mon→Fri)
    {dir: 'SHORT', entry: 1.14395}, {dir: 'LONG', entry: 1.14110},
    {dir: 'SHORT', entry: 1.14460}, {dir: 'LONG', entry: 1.14020},
    {dir: 'SHORT', entry: 1.14295}, {dir: 'LONG', entry: 1.13935},
    {dir: 'LONG', entry: 1.14225}, {dir: 'SHORT', entry: 1.14555},
  ],
  'GBP/USD': [  // the operator's REAL GU 7 (Mon→Fri)
    {dir: 'LONG', entry: 1.33330}, {dir: 'SHORT', entry: 1.33965},
    {dir: 'SHORT', entry: 1.33660}, {dir: 'LONG', entry: 1.33280},
    {dir: 'SHORT', entry: 1.34260}, {dir: 'LONG', entry: 1.33850},
    {dir: 'SHORT', entry: 1.34500},
  ],
};

const pip = {DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001};
// ⚠ OPERATOR RULING 2026-07-31: "PRECISION IS THE ONLY METRIC — 3-pip count; never report a looser tolerance."
// The 30-pip "100% coverage" was THE delusion that derailed the v4.5.2 session. BANNED FOREVER.
const TOLERANCES = [3, 5, 10]; // 3 = THE metric. 5/10 = reference breakdown ONLY.

console.log('=== GOLDEN COVERAGE CHECK (3-pip PRIMARY — the only metric that counts) ===\n');
const totalGolden = Object.values(golden).reduce((n, t) => n + t.length, 0);
const counts: Record<number, number> = { 3: 0, 5: 0, 10: 0 };
const misses: Array<{pair: string; dir: string; entry: number; best: number; delta: number}> = [];

for (const [pair, trades] of Object.entries(golden)) {
  const ourTrades = dedup.uniqueTrades.filter(t => t.pair === pair);
  console.log(`${pair} (${ourTrades.length} unique trades):`);
  for (const g of trades) {
    const deltas = ourTrades
      .filter(t => t.direction === g.dir)
      .map(t => Math.abs(t.entry - g.entry) / pip[pair as keyof typeof pip]);
    const best = deltas.length ? Math.min(...deltas) : -1;
    for (const tol of TOLERANCES) if (best >= 0 && best <= tol) counts[tol]++;
    const status = best >= 0
      ? `Δ${best.toFixed(1)}p ${best <= 3 ? '✅' : best <= 5 ? '🟡' : best <= 10 ? '🟠' : '🔴'}`
      : `✗ MISSING`;
    if (best < 0 || best > 3) misses.push({pair, dir: g.dir, entry: g.entry, best, delta: best});
    console.log(`  ${g.dir.padEnd(5)} ${g.entry.toFixed(5)} → ${status}`);
  }
  console.log('');
}

console.log(`\n=== SUMMARY (TOLERANCE-STRICT — 3 pip is THE metric) ===`);
console.log(`  ≤3 pip : ${counts[3]}/${totalGolden}  ← THE ONLY NUMBER THAT COUNTS`);
console.log(`  ≤5 pip : ${counts[5]}/${totalGolden}  (reference)`);
console.log(`  ≤10 pip: ${counts[10]}/${totalGolden}  (reference — NOT acceptance)`);
console.log(`\nMISSES/POOR (>3 pip) — ${misses.length}:`);
for (const m of misses) console.log(`  ${m.pair} ${m.dir} golden=${m.entry.toFixed(5)} bestΔ=${m.best >= 0 ? m.best.toFixed(1) + 'p' : 'NONE'}`);
console.log(`\nTotal unique trades: ${dedup.uniqueTrades.length}`);
console.log(`  DXY: ${dedup.uniqueTrades.filter(t => t.pair === 'DXY').length}`);
console.log(`  EU:  ${dedup.uniqueTrades.filter(t => t.pair === 'EUR/USD').length}`);
console.log(`  GU:  ${dedup.uniqueTrades.filter(t => t.pair === 'GBP/USD').length}`);
