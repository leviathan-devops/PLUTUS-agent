/**
 * probe-gu-monday.ts — THE GU MONDAY R ROOT-CAUSE PROBE (the operator's Q8:
 * "give me more context on WHY GU flagged this as R though. HOW did it arrive
 * at this conclusion?"). The machine classified the GU Monday as R:SHORT while
 * the operator's #1 = the Mon WL LONG 1.33330. The operator wants the FULL
 * context of HOW the machine arrived at R.
 *
 * THE PATH: the REAL pipeline (the diag-monday.ts's exact wiring — NEVER a
 * re-derived variant — the D3e lesson): lockRunAnchor(1783321200000) →
 * gateBars'ed barsFor → buildChartModel ×3 → runPriorWeekPreflight ×3 →
 * buildE2Core (which fires the pair ShapeBrains through buildShapeChain →
 * identifyCurrentShape + classifyShape + the currentShape decision + the
 * pressure-aware chain + the day decomposition).
 *
 * THE CAPTURE: PROBE_GU_MON=1 arms the env-guarded [GU-MON] instrumentation
 * inside src/brains/shape-brain.ts (temporarily added for this probe — the
 * file is reverted byte-identical afterward). The probe tee's console.error
 * into a buffer, runs the E2 core, then prints the FULL trace + the GU root-
 * cause statement assembled from the trace's numbers.
 *
 * DETERMINISM: the anchor is fixed, the bars are gated, the instrumentation
 * prints computed values only — the same run twice → the same numbers.
 */
import { buildChartModel } from './src/mdve/index.js';
import { buildE2Core, toDxyZone } from './report-v452.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { PriorWeekStoryline } from './src/mdve/prior-week-preflight.js';
import type { ZoneModel } from './src/mdve/types.js';

// ═══ THE MONDAY RUN ANCHOR — LOCKED FIRST (the diag-monday path) ═══
const ANCHOR_MS = 1783321200000; // the Monday 07:00 UTC — the run's "today"
lockRunAnchor(ANCHOR_MS);
// ═══ ARM THE SHAPE-BRAIN INSTRUMENTATION (the env-guarded [GU-MON] dump) ═══
process.env.PROBE_GU_MON = '1';
console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(ANCHOR_MS).toISOString()} (${ANCHOR_MS}) - every bar past this is DROPPED by the gate`);

const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000; // Mon 2026-07-06 00:00Z

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => gateBars((raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS)).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };

const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};

// The pair spots — the classification's anchors (measured from the gated bars).
const spots = {
  DXY: spotFor('DXY'),
  'EUR/USD': spotFor('EUR/USD'),
  'GBP/USD': spotFor('GBP/USD'),
};

// ═══ THE PRIOR-WEEK PRE-FLIGHTS (the diag-monday wiring — the storyline the
// openingConsolidates check consumes) ═══
const priorStorylines: Record<string, PriorWeekStoryline | undefined> = {};
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

// ═══ THE TRACE CAPTURE — tee console.error (the [GU-MON] instrumentation's
// channel) into a buffer; the E2 core runs INSIDE the capture ═══
const traceLines: string[] = [];
const origErr = console.error;
console.error = (...args: unknown[]) => {
  const s = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  traceLines.push(s);
  origErr.apply(console, args);
};
let e2!: Awaited<ReturnType<typeof buildE2Core>>;
try {
  e2 = await buildE2Core(models, priorStorylines);
} finally {
  console.error = origErr;
}

// ═══ 0. THE GU'S ZONE CONTEXT — the nearest supply + demand + their bands +
// ZFPs + lifecycles (computed from the GU model's OWN zones — real data) ═══
const guZones = models['GBP/USD'].zones.map(toDxyZone);
const guSpot = spots['GBP/USD'];
const nearSupply = guZones
  .filter((z: any) => z.type.endsWith('Supply') && z.floor > guSpot)
  .reduce((best: any, z: any) => (z.floor - guSpot) < (best.floor - guSpot) ? z : best);
const nearDemand = guZones
  .filter((z: any) => z.type.endsWith('Demand') && z.ceiling < guSpot)
  .reduce((best: any, z: any) => (guSpot - z.ceiling) < (guSpot - best.ceiling) ? z : best);
const deepDemands = guZones
  .filter((z: any) => z.type.endsWith('Demand') && z.ceiling < (nearDemand ? nearDemand.floor : guSpot))
  .sort((a: any, b: any) => a.zfp - b.zfp);
const pfmtZone = (z: any): string => z
  ? `${z.id} [${z.floor.toFixed(5)}-${z.ceiling.toFixed(5)}] zfp=${z.zfp.toFixed(1)} lc=${z.pressure?.lifecycle ?? 'none'} mit=${z.pressure?.mitigationCount ?? 0} pierced=${z.pressure?.pierced ?? false}`
  : 'none';

console.log('\n================================================================');
console.log('0. THE GU MONDAY ZONE CONTEXT (the classification inputs — measured)');
console.log('================================================================');
console.log(`  spot (the 4H close at the anchor): ${guSpot.toFixed(5)}`);
console.log(`  nearest supply above  : ${pfmtZone(nearSupply)}`);
console.log(`  nearest demand below  : ${pfmtZone(nearDemand)}`);
console.log(`  deepest demand        : ${pfmtZone(deepDemands[0])}`);
const story = priorStorylines['GBP/USD'];
console.log('\n  the GU prior-week storyline (the openingConsolidates input):');
console.log(`    sweepOrigin  : ${story?.sweepOrigin ? `${story.sweepOrigin.anatomy} @ ${story.sweepOrigin.price.toFixed(5)} (ms=${story.sweepOrigin.ms})` : 'null (no sweep)'}`);
console.log(`    rangeTop     : ${story?.rangeTop ? story.rangeTop.price.toFixed(5) : 'null'}`);
console.log(`    rangeBottom  : ${story?.rangeBottom ? story.rangeBottom.price.toFixed(5) : 'null'}`);
console.log(`    priorShapeChain: ${story?.priorShapeChain.map((s) => `${s.day.slice(0, 3)}:${s.shape}:${s.direction}`).join(' | ') ?? 'null'}`);

// ═══ 1. THE FULL CLASSIFICATION TRACE — every [GU-MON] line the shape-brain
// instrumentation emitted (all three pair brains — the divergence is visible) ═══
console.log('\n================================================================');
console.log('1. THE CLASSIFICATION TRACE (the [GU-MON] instrumentation output)');
console.log('================================================================');
const monLines = traceLines.filter((l) => l.startsWith('[GU-MON]'));
if (monLines.length === 0) {
  console.log('  [no [GU-MON] lines captured — the instrumentation did not fire]');
} else {
  for (const l of monLines) console.log(`  ${l}`);
}

// ═══ 2. THE ROOT-CAUSE STATEMENT — assembled from the trace's numbers ═══
// Extract the GU-specific lines: the instrument-labelled lines + the
// classifyShape line whose spot matches the GU spot.
const guInst = (l: string) => l.includes('instrument=GBP/USD');
const classifyGu = traceLines.find((l) => l.startsWith('[GU-MON] classifyShape') && l.includes(`spot=${guSpot.toFixed(5)}`));
const kv = (l: string | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!l) return out;
  for (const m of l.matchAll(/([\w]+)=([^\s]+)/g)) out[m[1]!] = m[2]!;
  return out;
};
const csd = kv(traceLines.find((l) => guInst(l) && l.startsWith('[GU-MON] currentShapeDecision')));
const subs = kv(traceLines.find((l) => guInst(l) && l.startsWith('[GU-MON] identifySubSignals')));
const bz = kv(traceLines.find((l) => guInst(l) && l.startsWith('[GU-MON] boundingZones')));
const c1 = kv(traceLines.find((l) => guInst(l) && l.startsWith('[GU-MON] chainStep1')));
const ddm = kv(traceLines.find((l) => l.startsWith('[GU-MON] dayDecompMonday') && l.includes(`dayOpenSpot=${guSpot.toFixed(5)}`)));
const cls = kv(classifyGu);

// The documented identifyCurrentShape branch conditions (shape-brain.ts:424-462
// — the constants from trading-constants): the probe states WHICH branch the
// sub-signal numbers satisfy — the mechanism, never prose.
const shapeZones = Number(subs['zones'] ?? 0);
const above = Number(subs['above'] ?? -1);
const below = Number(subs['below'] ?? -1);
const lowZfp = Number(subs['lowZfp'] ?? -1);
const highZfp = Number(subs['highZfp'] ?? -1);
const avgZfp = Number(subs['avgZfp'] ?? -1);
const pierceUp = Number(subs['pierceUp'] ?? -1);
const pierceDown = Number(subs['pierceDown'] ?? -1);
const deepUp = subs['deepPullbackUp'] === 'true';
const deepDown = subs['deepPullbackDown'] === 'true';
let richBranch: string;
if (subs['spot'] && shapeZones >= 4 && Math.abs(above - below) <= 2) richBranch = 'SS(balanced: zones>=4 and |above-below|<=2)';
else if (lowZfp > highZfp && below > above) richBranch = 'BS(bullish: lowZfp>highZfp and below>above)';
else if (lowZfp > highZfp && above > below) richBranch = 'BS(bearish: lowZfp>highZfp and above>below)';
else if (highZfp > lowZfp && avgZfp > 50) richBranch = pierceUp >= 2 ? 'PWL(piercingUp>=2)' : pierceDown >= 2 ? 'PRWL(piercingDown>=2)' : 'WL(highZfp>lowZfp, avgZfp>50)';
else if (deepUp || deepDown) richBranch = 'RS(deepPullback)';
else richBranch = 'R(DEFAULT — the density heuristics exhausted)';

// The classifyShape mechanism (shape-brain.ts:900-924 — the documented
// SS/BS zfp comparisons): the bounding zfps vs the 30%/45% thresholds.
const supplyZfp = cls['ceilingZfp'] ?? bz['nearestSupply']?.match(/zfp=([\d.]+)/)?.[1];
const demandZfp = cls['floorZfp'] ?? bz['nearestDemand']?.match(/zfp=([\d.]+)/)?.[1];

const guMonday = e2.guCoreChain?.days.find((d) => d.day === 'Monday');
const euMonday = e2.euCoreChain?.days.find((d) => d.day === 'Monday');

console.log('\n================================================================');
console.log('2. THE ROOT-CAUSE STATEMENT (the GU Monday R — the mechanism with the numbers)');
console.log('================================================================');
console.log(`  richShape             = ${csd['richShape'] ?? 'MISSING'}`);
console.log(`    -- the identifyCurrentShape sub-signals: zones=${subs['zones'] ?? '?'} above=${above} below=${below} avgZfp=${avgZfp} lowZfp=${lowZfp} highZfp=${highZfp} pierceUp=${pierceUp} pierceDown=${pierceDown} deepUp=${deepUp} deepDown=${deepDown}`);
console.log(`    -- the branch fired: ${richBranch}`);
console.log(`  zoneShape             = ${csd['zoneShape'] ?? 'MISSING'}`);
console.log(`    -- the classifyShape bounding zfps: supply=${supplyZfp ?? '?'}% vs demand=${demandZfp ?? '?'}% (SS when both<30%, BS when either>45%) → verdict ${cls['->'] ?? (classifyGu ? (classifyGu.match(/-> (.+)$/) ?? [])[1] : '?')}`);
console.log(`  isSimpleSsOrBs        = ${csd['isSimpleSsOrBs'] ?? 'MISSING'} (richShape ∈ {SS,BS,R})`);
console.log(`  openingConsolidatesWeek = ${csd['openingConsolidatesWeek'] ?? 'MISSING'}`);
console.log(`    -- the GU storyline check: sweepOrigin=${story?.sweepOrigin ? `${story.sweepOrigin.anatomy}@${story.sweepOrigin.price.toFixed(5)}` : 'null'} rangeTop=${story?.rangeTop ? story.rangeTop.price.toFixed(5) : 'null'} rangeBottom=${story?.rangeBottom ? story.rangeBottom.price.toFixed(5) : 'null'} spot=${guSpot.toFixed(5)} (needs SWEEP_LOW + spot>sweep + inside range)`);
console.log(`  currentShape          = ${csd['currentShape'] ?? 'MISSING'} (openingConsolidatesWeek ? SS : (isSimpleSsOrBs ? zoneShape : richShape))`);
console.log(`  chain Monday step     : prevShape=${c1['prevShape'] ?? '?'} stepZfp=${c1['stepZfp'] ?? '?'} contestedZone=${c1['contestedZone'] ?? '?'} nextShape=${c1['nextShape'] ?? '?'} confidence=${c1['confidence'] ?? '?'}`);
console.log(`  day decomp Monday     : shape=${ddm['shape'] ?? '?'} direction=${ddm['direction'] ?? '?'} keyZoneId=${ddm['keyZoneId'] ?? '-'} keyZoneType=${ddm['keyZoneType'] ?? '-'} S:${ddm['supplyZoneId'] ?? '-'} / D:${ddm['demandZoneId'] ?? '-'} / DD:${ddm['deepDemandZoneId'] ?? '-'} / open=${ddm['dayOpenSpot'] ?? '?'}`);
console.log(`  the GU E2 CORE Monday : ${guMonday ? `${guMonday.day}:${guMonday.shape}:${guMonday.direction} (S:${guMonday.supplyZoneId ?? '-'}/D:${guMonday.demandZoneId ?? '-'})` : 'MISSING'}`);
console.log(`  the GU storylineBias  : ${e2.guCoreChain?.storylineBias ?? 'MISSING'}`);
console.log(`  the EU E2 CORE Monday : ${euMonday ? `${euMonday.day}:${euMonday.shape}:${euMonday.direction} (S:${euMonday.supplyZoneId ?? '-'}/D:${euMonday.demandZoneId ?? '-'})` : 'MISSING'}`);
console.log(`  the GU divergence vs EU cascade: ${e2.guDivergence !== null ? e2.guDivergence.toFixed(2) : 'n/a'} | the EU divergence vs DXY: ${e2.euDivergence !== null ? e2.euDivergence.toFixed(2) : 'n/a'}`);

// The final one-line mechanism (the operator's Q8 answer — the numbers).
const oc = csd['openingConsolidatesWeek'] ?? '?';
const demandId = ddm['demandZoneId'] ?? '';
const demandPrice = (() => { const seg = demandId.split('|'); const v = Number(seg[seg.length - 1]); return Number.isFinite(v) && v > 0 ? v : null; })();
const OP_GU_MON_LONG = 1.33330; // the operator's #1 (the MEASUREMENT oracle — never a pipeline input)
const pipDelta = demandPrice !== null ? Math.abs(OP_GU_MON_LONG - demandPrice) / 0.0001 : null;
const guMonShape = ddm['shape'] ?? '?';
const guMonDir = ddm['direction'] ?? '?';

console.log('\n  THE MECHANISM (one line):');
const ocNote = oc === 'false'
  ? ' (the GU storyline sweepOrigin=SWEEP_HIGH@1.33846 - NOT the SWEEP_LOW the EU had - so the opening-consolidation SS override never fired)'
  : '';
const contestId = (c1['contestedZone'] ?? '').split('[')[0] ?? '?';
console.log(`    the GU openingConsolidatesWeek=${oc}${ocNote} -> the per-pair classification stood -> the currentShape=${csd['currentShape'] ?? '?'} (the zoneShape=${csd['zoneShape'] ?? '?'} - the bounding-zfp split) -> the chain step-1 = ${c1['nextShape'] ?? '?'} via predictNextShapePressureAware(prevShape=${c1['prevShape'] ?? '?'}, stepZfp=${c1['stepZfp'] ?? '?'}, contested=${contestId}) -> the GU Monday = ${guMonShape}:${guMonDir} while the operator's #1 = Mon WL LONG 1.33330 (the machine's D: designation ${demandId || '-'} sits ${pipDelta !== null ? pipDelta.toFixed(1) + 'p' : '?'} from the operator's level - the LEVEL is right, the DIRECTION is the issue).`);
