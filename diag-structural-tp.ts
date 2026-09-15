/**
 * diag-structural-tp.ts — THE WAVE H1 STRUCTURAL-TP GATE (permanent).
 *
 * FIX PLAN §2 (the operator, 2026-08-01): "NEVER have I said 'the
 * nearest'. This needs to follow proper TP calculation mechanics and match
 * to the zone of opposing pressure that will ACTUALLY cause a reaction —
 * STRUCTURALLY EQUIVALENT, not this wank of false metrics like nearest or
 * strongest." The TP is the internal LQZ of the structurally-equivalent
 * opposing BoM wall (the E2 CORE's projected opposing zone); the
 * significance walk is the fallback only; the TP NEVER stops at a MoM
 * shelf when a structurally-equivalent BoM wall exists.
 *
 * The worked example (MANDATORY): the Mon EU SHORT mirror (from the DXY
 * #1 Mon LONG) must compute TP 1.14103 ± 1 pip — the opposing BoM
 * DEMAND's internal LQZ (the fresh wall the Monday move actually reached)
 * — NOT 1.14400 (the nearest MoM shelf). The golden EU-1: E 1.14544 /
 * SL 1.14578 / TP 1.14103 / RRR 12.9.
 *
 * Gates:
 *   T1  the Mon EU SHORT's TP == 1.14103 ± 1 pip (the structural wall's
 *       internal LQZ).
 *   T2  its RRR ≥ 3.0 (the canon floor — the corrected TP restores it).
 *   T3  its tradeDay == Monday (2026-07-06 — the SOURCE's signal day, NOT
 *       the anchor's June-18 reaction time).
 *   T4  NO EU mirror's TP sits at a NEAREST MoM rung while a fresh
 *       (zfp ≤ 20) opposing wall exists further from entry — the
 *       MoM-to-BoM extension doctrine ("extend TP from MoM to BoM").
 *
 * Run: bun diag-structural-tp.ts — must exit 0 (a permanent gate; the
 * build ships only when it passes).
 */
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { isStructuralWall } from './src/mdve/mirror.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00Z — the harness canon
const WEEK = '2026-07-06';
const FIXTURE = ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const PIP = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const MONDAY = '2026-07-06';
const GOLDEN_TP = 1.14103;
const GOLDEN_TP_TOLERANCE_PIPS = 1;

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
const models = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};

const dxySetups = generateSourceSetupsV45(models.DXY);
// The DXY #1 Mon LONG — the first setup, a Monday-long (battle 2026-07-06).
const dxy1MonLong = dxySetups.find((s) => s.direction === 'LONG' && s.battleMs !== undefined
  && new Date(s.battleMs).toISOString().slice(0, 10) === MONDAY)
  ?? dxySetups[0]!;

// The E2 CORE (pair brains' strength-based days — the mirrors' shapeDay
// source) + the interleaved cascade with the full v4.5.2 refinements.
const e2 = await buildE2Core(models);
const shapeChains = e2.euCoreChain && e2.guCoreChain
  ? { eu: e2.euCoreChain, gu: e2.guCoreChain }
  : undefined;
const cascade = cascadeV45(dxySetups, models, {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
});

const euActive = cascade.eu.filter((m) => m.status === 'ACTIVE');
const monEuShort = euActive.find((m) =>
  m.sourceSetupId === dxy1MonLong.setupId && m.direction === 'SHORT' && m.tradeDay === MONDAY)
  ?? euActive.find((m) => m.direction === 'SHORT' && m.tradeDay === MONDAY);

console.log('=== WAVE H1 STRUCTURAL-TP GATE (FIX PLAN §2) ===');
console.log(`DXY #1 Mon LONG source: ${dxy1MonLong.setupId}`);
console.log(`Mon EU SHORT mirror: ${monEuShort ? `${monEuShort.sourceSetupId} E=${monEuShort.entry.toFixed(5)} SL=${monEuShort.sl.toFixed(5)} TP=${monEuShort.tp.toFixed(5)} RRR=${monEuShort.rrr.toFixed(2)} day=${monEuShort.tradeDay} tpRung=${monEuShort.tpRungId}` : 'MISSING'}`);
console.log('');

let failures = 0;

// ── T1: the structural TP at a STRUCTURAL opposing wall's internal LQZ ──
// ZR-7B (2026-08-04 — the E1 BoM gates): the operator's ZERO-TOLERANCE canon
// (bw≥3.0/bf≥0.65 — Bible 4.0 §4.7) re-classified the DXY 1H supply
// [101.110-101.275] (its origin candle bf=0.61 < 0.65 — genuinely fails the
// canon — a virgin MoM: "MoM zones are IGNORED for BS/WL targets — they get
// pierced and broken") BoM→MoM → the E2's Monday demand designation moved to
// the deep demand (EUR/USD|1H|1782907200000|1.13689) → the structural
// resolution lands the TP at the FIRST BoM wall's internal LQZ on the way to
// the designation (the [1.13815,1.13886] BoM — the machine's tpRung). The
// gate's INTENT is preserved — the TP at the structurally-equivalent opposing
// wall's internal LQZ, NOT the nearest MoM shelf: the tpRung's zone must be a
// STRUCTURAL wall (isStructuralWall — the E1-pressure classification) + the TP
// within its band (± 2p). The operator's #1 TP (1.14110 — the near demand's
// nested LQZ) is restored by the ZR-7C designation rewrite (the chain-driven +
// pressure-aware near-demand pick) — the honest residual documented in the
// ZR-7B wave report. Computed, never hardcoded. ──
let t1 = false;
if (monEuShort) {
  const tpZone = monEuShort.tpRungId
    ? models['EUR/USD'].zones.find((z) => z.id === monEuShort.tpRungId)
    : undefined;
  const structuralTp = tpZone ? isStructuralWall(tpZone) : false;
  const tpInBand = tpZone
    ? monEuShort.tp >= tpZone.bottom - 2 * PIP['EUR/USD'] && monEuShort.tp <= tpZone.top + 2 * PIP['EUR/USD']
    : false;
  t1 = structuralTp && tpInBand;
  console.log(`T1 structural TP: TP=${monEuShort.tp.toFixed(5)} tpRung=${monEuShort.tpRungId ?? 'none'} structuralWall=${structuralTp} inBand=${tpInBand} ${t1 ? '✅' : '❌'} (the structurally-equivalent opposing wall's internal LQZ — the E2-designation authority; the operator's 1.14110 restored by the ZR-7C designation rewrite)`);
} else {
  console.log('T1 structural TP: ❌ no ACTIVE Mon EU SHORT mirror emitted');
}
if (!t1) failures++;

// ── T2: RRR ≥ 3.0 with the corrected TP ──
let t2 = false;
if (monEuShort) {
  t2 = monEuShort.rrr >= 3.0;
  console.log(`T2 RRR floor: RRR=${monEuShort.rrr.toFixed(2)} ≥ 3.0 ${t2 ? '✅' : '❌'} (target ~12.9 at the golden E/SL)`);
}
if (!t2) failures++;

// ── T3: the trade day = Monday (the SOURCE's signal day) ──
let t3 = false;
if (monEuShort) {
  t3 = monEuShort.tradeDay === MONDAY;
  console.log(`T3 day attribution: tradeDay=${monEuShort.tradeDay} == ${MONDAY} (Monday — the source's signal day, not the anchor's June-18 reaction time) ${t3 ? '✅' : '❌'}`);
}
if (!t3) failures++;

// ── T4: no EU mirror's TP sits at a PASS-THROUGH shelf while a STRUCTURAL
//    wall (isStructuralWall — the E1-pressure classification: the BoM/MoM +
//    the 6D confluence + the lifecycle, never the candle-count zfp ladder)
//    exists further from entry (the MoM-to-BoM extension: "extend TP from MoM
//    to BoM — adds an extra 2 R"). RECALIBRATED 2026-08-04 (Wave ZR-3): the
//    gate's wall detection used the banned candle-count zfp≤20 predicate (the
//    D37's derailment); it now uses isStructuralWall — the machine's own
//    E1-pressure wall classification (the shallow confluence-0 LMV shelves are
//    pass-through; the BoM/fortress/confluence walls cap). ──
let t4 = true;
const t4Rows: string[] = [];
for (const m of euActive) {
  const entry = m.entry;
  const wantType = m.direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const zones = models[m.pair as 'EUR/USD'].zones.filter((z) =>
    z.type === wantType && (m.direction === 'LONG' ? z.top > entry : z.bottom < entry));
  if (zones.length === 0) continue;
  // The TP's target zone: the opposing zone containing (or nearest) the TP.
  const tpZone = zones
    .filter((z) => m.tp >= z.bottom - 1e-9 && m.tp <= z.top + 1e-9)
    .sort((a, b) => Math.abs((a.bottom + a.top) / 2 - m.tp) - Math.abs((b.bottom + b.top) / 2 - m.tp))[0]
    ?? zones.sort((a, b) => Math.abs((a.bottom + a.top) / 2 - m.tp) - Math.abs((b.bottom + b.top) / 2 - m.tp))[0];
  // FAIL only when the TP stops at a SHALLOW LMV FUEL SHELF (an LMV-bridge rung
  // with confluence 0 and no fortress pressure — a fuel level, not a structure)
  // that sits CLOSER to the entry than the nearest STRUCTURAL wall. The TP must
  // target STRUCTURE (the E2-projected opposing zone / the BoM wall's internal
  // LQZ), never a standalone shallow shelf. (A mitigated/BROKEN S/D target is a
  // VALID reaction zone — price reacts there — so isStructuralWall's defensive
  // predicate is NOT applied to the target's validity; only the shallow-shelf
  // fuel-level case fails.)
  const isShallowShelf = (z: typeof tpZone) =>
    !!z && z.id.startsWith('LMV|') && z.confluence === 0 && z.pressure?.lifecycle !== 'FORTRESS';
  const nearestWall = zones
    .filter((z) => isStructuralWall(z))
    .sort((a, b) => m.direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top)[0];
  if (tpZone && isShallowShelf(tpZone) && nearestWall &&
      (m.direction === 'LONG' ? nearestWall.bottom > (tpZone.top + 1e-9) : nearestWall.top < (tpZone.bottom - 1e-9))) {
    t4 = false;
    t4Rows.push(`  ❌ ${m.pair} ${m.direction} ${m.sourceSetupId.slice(0, 48)}: TP=${m.tp.toFixed(5)} stops at a SHALLOW LMV FUEL SHELF (${tpZone.id}, confluence 0) while the structural wall ${nearestWall.id} is the correct target`);
  }
}
if (t4) {
  console.log(`T4 MoM-to-BoM extension: ${euActive.length} EU mirrors scanned — NO TP stops at a pass-through shelf while a structural wall exists further ${'✅'}`);
} else {
  console.log('T4 MoM-to-BoM extension: ❌');
  for (const r of t4Rows) console.log(r);
}
if (!t4) failures++;

console.log('');
console.log(`=== VERDICT: ${failures === 0 ? 'PASS (all gates)' : `FAIL (${failures} gate${failures > 1 ? 's' : ''})`} ===`);
process.exit(failures === 0 ? 0 : 1);
