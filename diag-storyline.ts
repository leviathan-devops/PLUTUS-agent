/**
 * diag-storyline.ts — THE WAVE ZR-2 GATE: THE STORYLINE GATE.
 *
 * The storyline = the E2 narrative on the E1 pressure: (1) the current
 * shape, (2) the contested zone's pressure state, (3) the projected next
 * shape (reaction-count-conditioned), (4) the break-of-structure
 * validation, (5) the strength comparison, (6) the macro arc, (7) the
 * warframe arc (MACRO_CONTEXT Part 16 §16.2, Part 23).
 *
 * The operator's doctrine this gate proves mechanically:
 *   - Trade #6: "this 'break of structure' could be a false positive as
 *     looking purely at E1 pressure mechanics, this ZONE has not yet been
 *     broken... the market structure is still BULLISH at the macro level."
 *   - Trade #6: "the Bearish BS from Tuesday was extremely weak compared to
 *     the Bullish BS from Thursday. Bullish pressure is definitively
 *     stronger."
 *   - Trade #4: "zones usually fail on the THIRD mitigation."
 *   - Trade #8: "not been pierced or broken in 4 prior mitigations...
 *     likely to become a fortress zone and NOT get pierced."
 *
 * The gates:
 *
 *   S1  The structure computes: computeWeekStoryline returns a
 *       WeekStoryline per pair with 5 days, each carrying shape +
 *       projectedNext.trigger (non-empty) + warframeArc + narrative
 *       (non-empty); ≥ 1 day per pair has contestedZone.
 *   S2  The reaction-count conditioning: any contested zone with
 *       mitigationCount ≥ 3 → its day's projectedNext.trigger contains
 *       'THIRD mitigation'; any FORTRESS zone → trigger contains
 *       'FORTRESS'. (No such zone → mitigation histogram as the honest
 *       evidence — CONDITIONAL-PASS.)
 *   S3  THE TRADE #6 CASE — the false-positive break-validation: across
 *       the 3 pairs' storylines ∃ ≥ 1 day with breakValidation.verdict ===
 *       'FALSE_POSITIVE' whose reason asserts the macro structure is still
 *       intact (contains 'has still NOT been pierced' AND ('still BULLISH'
 *       OR 'still BEARISH')). (Chains with no BS/PBS day → CONDITIONAL-
 *       PASS with the chain shapes printed.)
 *   S4  The fortress case: IF any model zone has lifecycle FORTRESS, ≥ 1
 *       exists in the EU model AND any day whose contested zone is
 *       FORTRESS has 'FORTRESS' in its trigger.
 *   S5  The strength comparison: the EU storyline's strengthComparison has
 *       bullishPips ≥ 0 AND bearishPips ≥ 0 AND at least one > 0, with a
 *       non-empty reason citing magnitudes.
 *   S6  Determinism: all 3 models + storylines built twice — the
 *       storylines serialize identically (JSON compare per pair).
 *
 * Exit code: 0 = ALL gates pass (CONDITIONAL-PASS counts as pass — the
 * honest-absence path), 1 = any hard failure. Gate protocol:
 *   bun diag-storyline.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for
 * DXY/EUR/USD/GBP/USD, anchored at ANCHOR_MS (week 2026-07-06).
 *
 * The chain + days inputs are the REAL E2 core per pair: report-v452's
 * buildShapeBrain (the exact pipeline wiring) + runPriorWeekPreflight for
 * the prior-week storyline handoff.
 */
import { buildChartModel } from './src/mdve/index.js';
import { buildShapeBrain } from './report-v452.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { computeWeekStoryline } from './src/brains/storyline-engine.js';
import type { WeekStoryline, DayStoryline } from './src/brains/storyline-engine.js';
import type { ChartModel } from './src/mdve/types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const WEEK_START_MS = Date.UTC(2026, 6, 6);          // 2026-07-06T00:00Z
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
// 8-arg call — bars15m is the LAST argument (Phase 2 T5b telescoped tier).
const build = (p: string) => buildChartModel(p, WEEK, barsFor(p,'1H'), barsFor(p,'4H'), barsFor(p,'30m'), spotFor(p), undefined, barsFor(p,'15m'));

const PAIRS = ['DXY', 'EUR/USD', 'GBP/USD'] as const;

interface PairRun {
  model: ChartModel;
  storyline: WeekStoryline;
  chainShapes: string[];   // the input chain's shape codes (the S3 claimed-break probe)
  dayShapes: string[];     // the input dayDecomposition's shape codes
}

/** The full per-pair pipeline: the ZR-1-wired model (pressure states
 *  stamped inside buildChartModel) → the prior-week pre-flight (the macro
 *  arc handoff) → the REAL E2 core (report-v452's buildShapeBrain) → the
 *  storyline engine. Run twice for S6. */
async function runPair(p: typeof PAIRS[number]): Promise<PairRun> {
  const model = build(p);
  const priorStoryline = await runPriorWeekPreflight(p, {
    barsByTf: { '1H': barsFor(p,'1H'), '4H': barsFor(p,'4H'), '30m': barsFor(p,'30m'), '15m': barsFor(p,'15m') },
    weekStartMs: WEEK_START_MS,
    anchorMs: ANCHOR_MS,
  });
  const snap = await buildShapeBrain(p, model, priorStoryline);
  if (!snap) throw new Error(`${p}: buildShapeBrain returned null — no E2 core to narrate`);
  const chain = snap.shapeChain.chain ?? [];
  const days = snap.shapeChain.dayDecomposition ?? [];
  const storyline = computeWeekStoryline(model, chain, days, priorStoryline, barsFor(p,'1H'));
  return {
    model,
    storyline,
    chainShapes: chain.map(s => String(s.shape)),
    dayShapes: days.map(d => String(d.shape)),
  };
}

const failures: string[] = [];

console.log('=== STORYLINE GATE (Wave ZR-2) ===\n');

const runs: Record<string, PairRun> = {};
const runs2: Record<string, PairRun> = {};
for (const p of PAIRS) { runs[p] = await runPair(p); runs2[p] = await runPair(p); } // twins for S6

// ═══ S1 — the structure computes ═══
let s1Ok = true;
for (const p of PAIRS) {
  const st = runs[p]!.storyline;
  console.log(`${p}: macro arc [${st.macroArc.rangeBottom.toFixed(5)}-${st.macroArc.rangeTop.toFixed(5)}] defended=${st.macroArc.defendedZones} broken=${st.macroArc.brokenZones} · warframe=${st.warframePhase} · strength=${st.strengthComparison.verdict}`);
  console.log('  day       shape  warframe        contested-zone');
  if (st.days.length !== 5) { s1Ok = false; console.log(`  ✗ expected 5 days, got ${st.days.length}`); }
  let contested = 0;
  for (const d of st.days) {
    const triggerOk = typeof d.projectedNext?.trigger === 'string' && d.projectedNext.trigger.length > 0;
    const narrativeOk = typeof d.narrative === 'string' && d.narrative.length > 0;
    if (!d.shape || !triggerOk || !d.warframeArc || !narrativeOk) {
      s1Ok = false;
      console.log(`  ✗ ${d.day}: shape=${d.shape ?? '—'} trigger=${triggerOk ? '✓' : 'EMPTY'} warframe=${d.warframeArc ?? '—'} narrative=${narrativeOk ? '✓' : 'EMPTY'}`);
    }
    if (d.contestedZone) contested++;
    console.log(`  ${d.day.padEnd(9)} ${String(d.shape).padEnd(6)} ${String(d.warframeArc).padEnd(15)} ${d.contestedZone ? d.contestedZone.zoneId : '—'}`);
  }
  if (contested === 0) { s1Ok = false; console.log(`  ✗ ${p}: NO day carries a contestedZone`); }
}
if (!s1Ok) failures.push('S1: the storyline structure does not compute (days≠5, empty trigger/narrative, missing warframeArc, or a pair with zero contested zones)');

// ═══ S2 — the reaction-count conditioning (Trade #4 / Trade #8) ═══
console.log('');
const contestedAll: { pair: string; day: DayStoryline }[] = [];
for (const p of PAIRS) for (const d of runs[p]!.storyline.days) if (d.contestedZone) contestedAll.push({ pair: p, day: d });
const histogram = new Map<number, number>();
for (const { day } of contestedAll) {
  const n = day.contestedZone!.mitigationCount;
  histogram.set(n, (histogram.get(n) ?? 0) + 1);
}
console.log(`Contested-zone mitigation histogram: ${[...histogram.entries()].sort((a,b) => a[0]-b[0]).map(([n,c]) => `${n}×(${c})`).join(' ') || 'EMPTY'}`);
const thirdPlus = contestedAll.filter(({ day }) => day.contestedZone!.mitigationCount >= 3);
const fortressContested = contestedAll.filter(({ day }) => day.contestedZone!.lifecycle === 'FORTRESS');
let s2Ok = true; let s2Conditional = false;
if (thirdPlus.length === 0 && fortressContested.length === 0) {
  s2Conditional = true;
  console.log('S2 CONDITIONAL-PASS: no contested zone with mitigationCount ≥ 3 and no FORTRESS contested zone — the histogram above is the honest evidence');
} else {
  for (const { pair, day } of thirdPlus) {
    const ok = day.projectedNext.trigger.includes('THIRD mitigation');
    if (!ok) s2Ok = false;
    console.log(`  ${pair} ${day.day}: ${day.contestedZone!.zoneId} mitigations=${day.contestedZone!.mitigationCount} trigger "${day.projectedNext.trigger}" ${ok ? '✓' : '✗ MISSING \'THIRD mitigation\''}`);
  }
  for (const { pair, day } of fortressContested) {
    const ok = day.projectedNext.trigger.includes('FORTRESS');
    if (!ok) s2Ok = false;
    console.log(`  ${pair} ${day.day}: ${day.contestedZone!.zoneId} FORTRESS trigger "${day.projectedNext.trigger}" ${ok ? '✓' : '✗ MISSING \'FORTRESS\''}`);
  }
}
if (!s2Ok) failures.push('S2: the reaction-count conditioning failed — a ≥3-mitigation contested zone lacks \'THIRD mitigation\' or a FORTRESS zone lacks \'FORTRESS\' in its projected trigger');

// ═══ S3 — THE TRADE #6 CASE: the false-positive break-validation ═══
console.log('');
const breakRecords: { pair: string; day: string; verdict: string; reason: string }[] = [];
for (const p of PAIRS) for (const d of runs[p]!.storyline.days) {
  if (d.breakValidation) breakRecords.push({ pair: p, day: d.day, verdict: d.breakValidation.verdict, reason: d.breakValidation.reason });
}
console.log(`breakValidation records: ${breakRecords.length}`);
for (const r of breakRecords) console.log(`  ${r.pair} ${r.day}: ${r.verdict} — ${r.reason}`);
const anyClaimedBreak = PAIRS.some(p =>
  runs[p]!.chainShapes.some(s => s === 'BS' || s === 'PBS') ||
  runs[p]!.dayShapes.some(s => s === 'BS' || s === 'PBS'));
let s3Ok = true; let s3Conditional = false;
if (!anyClaimedBreak && breakRecords.length === 0) {
  s3Conditional = true;
  for (const p of PAIRS) console.log(`  ${p} chain: [${runs[p]!.chainShapes.join(' → ')}] days: [${runs[p]!.dayShapes.join(' → ')}]`);
  console.log('S3 CONDITIONAL-PASS: the chains contain no BS/PBS day (no claimed break) — the false-positive validation is unreachable on this fixture\'s chains');
} else {
  const fps = breakRecords.filter(r =>
    r.verdict === 'FALSE_POSITIVE' &&
    r.reason.includes('has still NOT been pierced') &&
    (r.reason.includes('still BULLISH') || r.reason.includes('still BEARISH')));
  s3Ok = fps.length >= 1;
  console.log(`Trade #6 false-positive (zone unbroken → macro structure intact): ${fps.length >= 1 ? 'REPRODUCED' : '✗ NOT REPRODUCED'} (${fps.length} record${fps.length === 1 ? '' : 's'})`);
  for (const r of fps) console.log(`  ✓ ${r.pair} ${r.day}: ${r.reason}`);
}
if (!s3Ok) failures.push('S3: THE TRADE #6 CASE FAILED — no FALSE_POSITIVE break-validation asserts the macro structure is still intact (\'has still NOT been pierced\' + \'still BULLISH/BEARISH\')');

// ═══ S4 — the fortress case (Trade #8) ═══
console.log('');
const fortressByPair: Record<string, { id: string; band: [number, number]; mitigations: number }[]> = {};
for (const p of PAIRS) {
  fortressByPair[p] = runs[p]!.model.zones
    .filter(z => z.pressure?.lifecycle === 'FORTRESS')
    .map(z => ({ id: z.id, band: [z.bottom, z.top] as [number, number], mitigations: z.pressure!.mitigationCount }));
}
const totalFortress = PAIRS.reduce((n, p) => n + fortressByPair[p]!.length, 0);
let s4Ok = true; let s4Conditional = false;
if (totalFortress === 0) {
  s4Conditional = true;
  console.log('S4 CONDITIONAL-PASS: no model zone carries lifecycle FORTRESS on this fixture');
} else {
  for (const p of PAIRS) {
    console.log(`${p}: ${fortressByPair[p]!.length} FORTRESS zone${fortressByPair[p]!.length === 1 ? '' : 's'}`);
    for (const f of fortressByPair[p]!) console.log(`  ${f.id} [${f.band[0].toFixed(5)}-${f.band[1].toFixed(5)}] mitigations=${f.mitigations}`);
  }
  if (fortressByPair['EUR/USD']!.length === 0) {
    s4Ok = false;
    console.log('  ✗ the EU model carries ZERO fortress zones (the ZR-1 evidence shows 3 across the models)');
  }
  const fortressDays = contestedAll.filter(({ day }) => day.contestedZone!.lifecycle === 'FORTRESS');
  for (const { pair, day } of fortressDays) {
    const ok = day.projectedNext.trigger.includes('FORTRESS');
    if (!ok) s4Ok = false;
    console.log(`  ${pair} ${day.day}: contested FORTRESS ${day.contestedZone!.zoneId} trigger "${day.projectedNext.trigger}" ${ok ? '✓' : '✗ MISSING \'FORTRESS\''}`);
  }
}
if (!s4Ok) failures.push('S4: the fortress case failed — the EU model has no FORTRESS zone, or a FORTRESS-contested day lacks \'FORTRESS\' in its trigger');

// ═══ S5 — the strength comparison (Trade #6: "Bullish pressure is definitively stronger") ═══
console.log('');
const sc = runs['EUR/USD']!.storyline.strengthComparison;
console.log(`EU strengthComparison: ${sc.verdict} — bullish ${sc.bullishPips.toFixed(1)}p vs bearish ${sc.bearishPips.toFixed(1)}p`);
console.log(`  reason: ${sc.reason}`);
const s5Ok = sc.bullishPips >= 0 && sc.bearishPips >= 0 && (sc.bullishPips > 0 || sc.bearishPips > 0) && sc.reason.length > 0 && /\d/.test(sc.reason);
if (!s5Ok) failures.push('S5: the EU strength comparison is degenerate (negative/zero magnitudes, or a reason that does not cite magnitudes)');
console.log(`S5: non-negative magnitudes, ≥1 non-zero, magnitude-citing reason: ${s5Ok ? '✓' : '✗ FAIL'}`);

// ═══ S6 — determinism (two full builds, identical storyline serialization per pair) ═══
console.log('');
let s6Ok = true;
for (const p of PAIRS) {
  const s1 = JSON.stringify(runs[p]!.storyline);
  const s2 = JSON.stringify(runs2[p]!.storyline);
  if (s1 !== s2) s6Ok = false;
  console.log(`${p}: storyline ${s1 === s2 ? 'IDENTICAL' : '✗ MISMATCH'} (${s1.length} bytes × 2 builds)`);
}
if (!s6Ok) failures.push('S6: determinism mismatch — the storylines differ across two builds of the same fixture');

// ═══ VERDICT ═══
console.log('');
const conditional = [s2Conditional ? 'S2' : null, s3Conditional ? 'S3' : null, s4Conditional ? 'S4' : null].filter(Boolean);
if (failures.length === 0) {
  if (conditional.length > 0) console.log(`(${conditional.join(', ')} CONDITIONAL-PASS — the honest-absence path, evidence printed above)`);
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
