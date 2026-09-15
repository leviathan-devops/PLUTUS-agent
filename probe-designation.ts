/**
 * probe-designation.ts — Wave 3 (2026-08-06) — THE DESIGNATION CONSTRAINT +
 * THE DAY-LOCAL PREFERENCE proof (the operator's day-by-day + recency laws).
 *
 * Two lanes, both run in this fresh process:
 *   LANE 1 — THE FULL-WEEK REFERENCE LANE (unlocked — bars <= the Friday
 *     anchor 1783702800000, the diag-golden-coverage fallback): the lane the
 *     KNOWN pre-fix GU designations were measured in (the audit: GU Mon/Tue/Thu
 *     ALL = GBP/USD|1H|1783386000000|1.33878 — the week's-newest reuse; the
 *     Monday designation used a Thursday-formed zone 1783576800000 = the
 *     look-ahead). THE FIX must break both:
 *       (a) the FORMATION CONSTRAINT — the Monday-designated zones' formationMs
 *           are ALL <= min(Mon end, run anchor) — the Thursday zone 1783576800000
 *           would FAIL this (it must be excluded from the Monday pool);
 *       (b) the DAY-LOCAL PREFERENCE — the GU days' S: ids across Mon/Tue/Thu
 *           are >= 2 distinct (the pre-fix collapse = 1 distinct must break).
 *   LANE 2 — THE MONDAY-LOCKED LANE (the operator's run moment — lockRunAnchor
 *     at 1783321200000 = Mon 2026-07-06 07:00 UTC, bars gated at the anchor):
 *     the belt+suspenders — the Monday designation's formationMs are ALL <=
 *     min(Mon end, the Monday 07:00 anchor).
 *
 * Run: bun probe-designation.ts   (bun script run only — no container)
 */
import { buildChartModel } from './src/mdve/index.js';
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import { buildE2Core } from './report-v452.js';
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

let failures = 0;
const pass = (msg: string): void => { console.log(`  ✅ PASS: ${msg}`); };
const fail = (msg: string): void => { failures++; console.log(`  ❌ FAIL: ${msg}`); };

const WEEK = '2026-07-06';
const WEEK_START_MS = 1783296000000; // Mon 2026-07-06 00:00Z — the report's week start
const DAY_MS = 86400000;
const MONDAY_LOCK_MS = 1783321200000; // Mon 2026-07-06 07:00 UTC — the operator's run moment
const FRIDAY_FALLBACK_MS = 1783702800000; // the full-week lane's bar bound (diag-golden-coverage's ANCHOR_MS)

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));

// The formationMs extraction (the same rule the shape-brain uses — the
// id-embedded ms: `PAIR|TF|MS|PRICE` → seg[2]; `OB|PAIR|TF|MS|PRICE` → seg[3];
// LMV rung ids carry no ms → 0).
const formationMsOf = (id: string | null | undefined): number => {
  if (!id) return 0;
  const seg = String(id).split('|');
  const ms = Number(seg[0] === 'OB' ? seg[3] : seg[2]);
  return Number.isFinite(ms) && ms > 1e12 ? ms : 0;
};

// ── the shared model builder ──
const build = (barBound: number) => {
  const barsFor = (p: string, tf: string): OHLCBar[] =>
    (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? [])
      .filter((b: any) => b.timestamp <= barBound)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
  const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
  const models = {
    DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
    'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
    'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
  };
  const priorStorylines: Record<string, unknown> = {};
  const prep = async () => {
    for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
      priorStorylines[pair] = await runPriorWeekPreflight(pair, {
        barsByTf: { '1H': barsFor(pair, '1H'), '4H': barsFor(pair, '4H'), '30m': barsFor(pair, '30m'), '15m': barsFor(pair, '15m') },
        weekStartMs: WEEK_START_MS,
        anchorMs: barBound,
      });
    }
    return { models, priorStorylines };
  };
  return { models, prep };
};

console.log('=== THE DESIGNATION CONSTRAINT + THE DAY-LOCAL PREFERENCE PROBE ===\n');

// ═══════════════════════════════════════════════════════════════════════════
// LANE 1 — THE FULL-WEEK REFERENCE LANE (the KNOWN pre-fix measurement lane)
// ═══════════════════════════════════════════════════════════════════════════
console.log('── LANE 1 — THE FULL-WEEK REFERENCE LANE (unlocked — the KNOWN pre-fix lane) ──');
const lane1 = build(FRIDAY_FALLBACK_MS);
const lane1Ctx = await lane1.prep();
const e2Full = await buildE2Core(lane1Ctx.models, lane1Ctx.priorStorylines);
const guFull = e2Full.guCoreChain?.days ?? [];
const euFull = e2Full.euCoreChain?.days ?? [];

// (a) the formation constraint — the Monday designation zones all <= min(Mon end, run anchor)
console.log('');
console.log('── (a) THE FORMATION CONSTRAINT — the Monday designation zones (full week) ──');
const mondayDayEnd = WEEK_START_MS + DAY_MS - 1; // Mon 23:59:59.999 (unlocked → the day's end only)
const mondayZones: Array<{ pair: string; side: string; id: string }> = [];
for (const pair of ['EUR/USD', 'GBP/USD'] as const) {
  const days = pair === 'EUR/USD' ? euFull : guFull;
  const mon = days.find((d) => d.day === 'Monday');
  if (!mon) { fail(`(a) ${pair} has no Monday day entry in the E2-CORE`); continue; }
  for (const [side, id] of [['S', mon.supplyZoneId], ['D', mon.demandZoneId], ['K', mon.keyZoneId]] as const) {
    if (id) mondayZones.push({ pair, side, id: String(id) });
  }
}
if (mondayZones.length === 0) fail('(a) no Monday-designated zones found');
let aOk = true;
for (const z of mondayZones) {
  const fms = formationMsOf(z.id);
  const withinOrNoStamp = fms === 0 || (fms > 0 && fms <= mondayDayEnd); // LMV rungs carry no stamp — honest absence, never excluded
  if (!withinOrNoStamp) aOk = false;
  console.log(`  ${z.pair} ${z.side}: ${z.id}`);
  console.log(`      formationMs=${fms} (${fms > 0 ? new Date(fms).toISOString() : 'no stamp — LMV rung'})  limit=${mondayDayEnd} (${new Date(mondayDayEnd).toISOString()})  → ${withinOrNoStamp ? 'WITHIN ✓' : '❌ POST-DAY — the look-ahead would hold'}`);
}
if (aOk) pass(`(a) every Monday designation's formationMs <= Mon end (${mondayDayEnd}) — the Thursday zone ${1783576800000} (07-09 06:00) is EXCLUDED from the Monday pool (the look-ahead is dead)`);
else fail('(a) a Monday designation uses a zone formed after the Monday limit');

// (b) the day-local preference — the GU Mon/Tue/Thu S: ids are NOT all identical
console.log('');
console.log('── (b) THE DAY-LOCAL PREFERENCE — the GU days\' S: designation ids (full week) ──');
const guFullS = guFull.map((d) => ({ day: d.day, s: d.supplyZoneId ?? '(none)' }));
for (const g of guFullS) console.log(`  GU ${g.day.slice(0, 3)}: S:${g.s}`);
const monTueThuFull = guFullS.filter((g) => g.day === 'Monday' || g.day === 'Tuesday' || g.day === 'Thursday').map((g) => g.s);
const distinctFullMtt = new Set(monTueThuFull).size;
console.log(`  distinct across Mon/Tue/Thu: ${distinctFullMtt} (pre-fix: 1 — the 1.33878 week-newest reuse)`);
const bOk = distinctFullMtt >= 2;
if (bOk) pass('(b) the GU Mon/Tue/Thu S: ids are NOT the identical zone — the day-reuse collapse is broken');
else fail('(b) the GU Mon/Tue/Thu S: ids still collapse — the day-local preference did not fire');

// ═══════════════════════════════════════════════════════════════════════════
// LANE 2 — THE MONDAY-LOCKED LANE (the operator's run moment — the belt+suspenders)
// ═══════════════════════════════════════════════════════════════════════════
console.log('');
console.log(`── LANE 2 — THE MONDAY-LOCKED LANE (lockRunAnchor(${MONDAY_LOCK_MS}) — bars gated at the anchor) ──`);
lockRunAnchor(MONDAY_LOCK_MS);
console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(MONDAY_LOCK_MS).toISOString()} (${MONDAY_LOCK_MS}) - every bar past this is DROPPED by the gate`);
const lane2 = build(MONDAY_LOCK_MS);
const lane2Ctx = await lane2.prep();
const e2Mon = await buildE2Core(lane2Ctx.models, lane2Ctx.priorStorylines);
const guMon = e2Mon.guCoreChain?.days ?? [];
const euMon = e2Mon.euCoreChain?.days ?? [];

console.log('');
console.log('── (a-locked) THE FORMATION CONSTRAINT — the Monday designation zones (locked at the Monday 07:00 anchor) ──');
const mondayLockedLimit = Math.min(WEEK_START_MS + DAY_MS - 1, MONDAY_LOCK_MS); // = the Monday 07:00 anchor
const mondayLockedZones: Array<{ pair: string; side: string; id: string }> = [];
for (const pair of ['EUR/USD', 'GBP/USD'] as const) {
  const days = pair === 'EUR/USD' ? euMon : guMon;
  const mon = days.find((d) => d.day === 'Monday');
  if (!mon) { fail(`(a-locked) ${pair} has no Monday day entry in the E2-CORE`); continue; }
  for (const [side, id] of [['S', mon.supplyZoneId], ['D', mon.demandZoneId], ['K', mon.keyZoneId]] as const) {
    if (id) mondayLockedZones.push({ pair, side, id: String(id) });
  }
}
if (mondayLockedZones.length === 0) fail('(a-locked) no Monday-designated zones found');
let aLockedOk = true;
for (const z of mondayLockedZones) {
  const fms = formationMsOf(z.id);
  const withinOrNoStamp = fms === 0 || (fms > 0 && fms <= mondayLockedLimit);
  if (!withinOrNoStamp) aLockedOk = false;
  console.log(`  ${z.pair} ${z.side}: ${z.id}`);
  console.log(`      formationMs=${fms} (${fms > 0 ? new Date(fms).toISOString() : 'no stamp — LMV rung'})  limit=${mondayLockedLimit} (${new Date(mondayLockedLimit).toISOString()})  → ${withinOrNoStamp ? 'WITHIN ✓' : '❌ POST-DAY — the look-ahead would hold'}`);
}
if (aLockedOk) pass(`(a-locked) the Monday designation is day-honest even at the run-anchor cap (min(Mon end, ${MONDAY_LOCK_MS})) — the belt+suspenders`);
else fail('(a-locked) a Monday designation uses a zone formed after the locked Monday limit');

// ═══ THE VERDICT ═══
console.log('');
if (failures === 0) {
  console.log('=== VERDICT: PASS — the designation constraint + the day-local preference both hold ===');
} else {
  console.log(`=== VERDICT: FAIL (${failures} assertion(s) failed) ===`);
}
process.exit(failures > 0 ? 1 : 0);
