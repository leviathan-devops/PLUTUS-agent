/**
 * diag-zone-relevance.ts — THE WAVE ZR-1 GATE: THE ZONE-RELEVANCE GATE.
 *
 * The operator: "pressure mechanics are the fundamental reality everything
 * is built on top of." — and the zone relevance is a pressure-state
 * FUNCTION: fuel INTACT → the LQZ (nested/shield) defends first
 * (SHIELD_FUEL); fuel ABSORBED ("liquidity has been absorbed... set the SL
 * based on the DEMAND zone instead of the LQZ") → the S/D zone itself is
 * the operative defense (PRESSURE_STRUCTURE).
 *
 * This diagnostic asserts the Wave ZR-1 acceptance on the golden fixture:
 *
 *   Z1  Pressure stamped: every non-LMV S/D zone in all 3 models carries
 *       pressure with a defined lifecycle and mitigationCount ≥ 0.
 *   Z2  Liquidity relations: ≥ 1 liquidity link (NESTED or SHIELD) per pair.
 *   Z3  Absorption tracked: ≥ 1 EUR/USD link shows a state transition
 *       (eatenAtMs OR defendedAtMs) inside the golden week
 *       (2026-07-06T00:00Z…2026-07-10T21:00Z).
 *   Z4  Lifecycle unit assertions: [] → VIRGIN; 3 non-pierced → DEPLETED;
 *       4 non-pierced → FORTRESS; any pierced → BROKEN.
 *   Z5  THE KILLER PROBE — the trade #2/#4 SL-relevance switch: among ALL
 *       EUR/USD DEMAND zones whose band contains 1.14020, ≥ 1 exhibits
 *       SHIELD_FUEL on Monday 2026-07-06T12:00Z AND PRESSURE_STRUCTURE (the
 *       zone itself) on Wednesday 2026-07-08T18:00Z. The SL-implied levels
 *       vs the operator's reference (1.13990 Mon / 1.13970 Wed) print as
 *       EVIDENCE ONLY — never the pass criterion.
 *   Z6  Determinism: all 3 models built twice — the pressure states
 *       serialize identically by zone id.
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Gate protocol:
 *   bun diag-zone-relevance.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for
 * DXY/EUR/USD/GBP/USD, anchored at ANCHOR_MS (week 2026-07-06).
 */
import { buildChartModel } from './src/mdve/index.js';
import { classifyLifecycle, computeOperativeDefense } from './src/mdve/zone-pressure.js';
import type { ChartModel, ReactionEvent } from './src/mdve/types.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
// 8-arg call — bars15m is the LAST argument (Phase 2 T5b telescoped tier).
const build = (p: string) => buildChartModel(p, WEEK, barsFor(p,'1H'), barsFor(p,'4H'), barsFor(p,'30m'), spotFor(p), undefined, barsFor(p,'15m'));

const PAIRS = ['DXY', 'EUR/USD', 'GBP/USD'] as const;
const models: Record<string, ChartModel> = {};
const models2: Record<string, ChartModel> = {};
for (const p of PAIRS) { models[p] = build(p); models2[p] = build(p); } // twins for Z6

const failures: string[] = [];
const iso = (ms: number | undefined) => ms === undefined ? '—' : new Date(ms).toISOString();

console.log('=== ZONE-RELEVANCE GATE (Wave ZR-1) ===\n');

// ═══ Z1 — pressure stamped on every S/D zone ═══
let z1Ok = true;
for (const p of PAIRS) {
  const m = models[p]!;
  const sd = m.zones.filter(z => !z.id.startsWith('LMV|'));
  const stamped = sd.filter(z => z.pressure !== undefined && z.pressure.lifecycle !== undefined && z.pressure.mitigationCount >= 0);
  const links = sd.flatMap(z => z.pressure?.liquidity ?? []);
  const nested = links.filter(l => l.kind === 'NESTED').length;
  const shield = links.filter(l => l.kind === 'SHIELD').length;
  const eaten = links.filter(l => l.eaten).length;
  if (stamped.length !== sd.length) z1Ok = false;
  console.log(`${p}: ${m.zones.length} zones (${sd.length} S/D + ${m.zones.length - sd.length} LMV) — stamped ${stamped.length}/${sd.length} · links NESTED=${nested} SHIELD=${shield} eaten=${eaten}`);
}
if (!z1Ok) failures.push('Z1: unstamped S/D zones exist (pressure.lifecycle undefined or mitigationCount < 0)');

// ═══ Z2 — liquidity relations per pair ═══
console.log('');
let z2Ok = true;
for (const p of PAIRS) {
  const m = models[p]!;
  const withLinks = m.zones.filter(z => !z.id.startsWith('LMV|') && (z.pressure?.liquidity.length ?? 0) > 0);
  if (withLinks.length === 0) z2Ok = false;
  console.log(`${p}: ${withLinks.length} zones carry liquidity links${withLinks.length === 0 ? ' ✗ NONE' : ''}`);
  const first3 = withLinks.flatMap(z => (z.pressure?.liquidity ?? []).map(l => ({ zone: z.id, link: l }))).slice(0, 3);
  for (const { zone, link } of first3) {
    console.log(`  ${zone} → ${link.rungId} [${link.kind}] eaten=${link.eaten}`);
  }
}
if (!z2Ok) failures.push('Z2: a pair carries ZERO liquidity links (NESTED/SHIELD)');

// ═══ Z3 — absorption tracked inside the golden week (EUR/USD) ═══
console.log('');
const WEEK_START_MS = Date.UTC(2026, 6, 6);          // 2026-07-06T00:00Z
const WEEK_END_MS = Date.UTC(2026, 6, 10, 21);       // 2026-07-10T21:00Z
const euLinks = models['EUR/USD']!.zones
  .filter(z => !z.id.startsWith('LMV|'))
  .flatMap(z => (z.pressure?.liquidity ?? []).map(l => ({ zone: z, link: l })));
const inWeek = euLinks.filter(({ link }) =>
  (link.eatenAtMs !== undefined && link.eatenAtMs >= WEEK_START_MS && link.eatenAtMs <= WEEK_END_MS) ||
  (link.defendedAtMs !== undefined && link.defendedAtMs >= WEEK_START_MS && link.defendedAtMs <= WEEK_END_MS));
const z3Ok = inWeek.length > 0;
if (!z3Ok) failures.push('Z3: no EUR/USD liquidity link shows a state transition inside the golden week');
console.log(`EUR/USD links with an in-week transition: ${inWeek.length}${z3Ok ? '' : ' ✗ NONE'}`);
for (const { zone, link } of inWeek.slice(0, 5)) {
  console.log(`  ${zone.id} → ${link.rungId} [${link.kind}] eaten=${link.eaten} eatenAt=${iso(link.eatenAtMs)} defendedAt=${iso(link.defendedAtMs)}`);
}

// ═══ Z4 — lifecycle unit assertions (synthetic battles) ═══
console.log('');
const mkEvent = (pierced: boolean): ReactionEvent => ({
  firstTouchMs: 0, lastTouchMs: 0, price: 1, anatomy: 'BODY_DEFEND',
  session: 'LONDON', isoWeek: '2026-W28', bars: 1, pierced,
});
const z4a = classifyLifecycle([], 'FRESH') === 'VIRGIN';
const z4b = classifyLifecycle([mkEvent(false), mkEvent(false), mkEvent(false)], 'FRESH') === 'DEPLETED';
const z4c = classifyLifecycle([mkEvent(false), mkEvent(false), mkEvent(false), mkEvent(false)], 'FRESH') === 'FORTRESS';
const z4d = classifyLifecycle([mkEvent(true)], 'FRESH') === 'BROKEN';
const z4Ok = z4a && z4b && z4c && z4d;
if (!z4Ok) failures.push(`Z4: lifecycle classification violated — VIRGIN ${z4a ? '✓' : '✗'}, DEPLETED ${z4b ? '✓' : '✗'}, FORTRESS ${z4c ? '✓' : '✗'}, BROKEN ${z4d ? '✓' : '✗'}`);
console.log(`Lifecycle: [] → VIRGIN ${z4a ? '✓' : '✗'} · 3 battles → DEPLETED ${z4b ? '✓' : '✗'} · 4 battles → FORTRESS ${z4c ? '✓' : '✗'} · pierced → BROKEN ${z4d ? '✓' : '✗'}`);

// ═══ Z5 — THE KILLER PROBE: the trade #2/#4 SL-relevance switch ═══
console.log('');
const MON_MS = 1783339200000;   // 2026-07-06T12:00Z — trade #2 (fuel INTACT → the LQZ defends)
const WED_MS = 1783533600000;   // 2026-07-08T18:00Z — trade #4 (fuel ABSORBED → the DEMAND zone defends)
const PROBE_PRICE = 1.14020;    // the geometry locator — NEVER a hardcoded zone id
const PIP_EU = 0.0001;
const eu = models['EUR/USD']!;
const candidates = eu.zones.filter(z => z.type === 'DEMAND' && z.bottom <= PROBE_PRICE && z.top >= PROBE_PRICE);
console.log(`Z5 candidates: ${candidates.length} EUR/USD DEMAND zones containing ${PROBE_PRICE}:`);
const transitioning: { z: typeof candidates[number]; mon: NonNullable<ReturnType<typeof computeOperativeDefense>>; wed: NonNullable<ReturnType<typeof computeOperativeDefense>> }[] = [];
for (const z of candidates) {
  const mon = computeOperativeDefense(eu, z.id, 'LONG', MON_MS);
  const wed = computeOperativeDefense(eu, z.id, 'LONG', WED_MS);
  if (!mon || !wed) continue;
  console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] battles=${z.reactionEvents.length} · Mon=${mon.defenseKind} (${mon.defense.id}) · Wed=${wed.defenseKind} (${wed.defense.id})`);
  if (mon.defenseKind === 'SHIELD_FUEL' && wed.defenseKind === 'PRESSURE_STRUCTURE' && wed.defense.id === z.id) {
    transitioning.push({ z, mon, wed });
  }
}
const z5Ok = transitioning.length >= 1;
if (!z5Ok) failures.push('Z5: THE KILLER PROBE FAILED — no DEMAND zone containing 1.14020 exhibits the SHIELD_FUEL → PRESSURE_STRUCTURE switch (the trade #2/#4 mechanic does NOT reproduce)');
console.log(`Trade #2/#4 switch (SHIELD_FUEL Mon → PRESSURE_STRUCTURE Wed): ${transitioning.length >= 1 ? 'REPRODUCED' : '✗ NOT REPRODUCED'} (${transitioning.length} zone${transitioning.length === 1 ? '' : 's'})`);
// EVIDENCE ONLY — the SL-implied levels vs the operator's reference (never
// the pass criterion). LONG far edge = defense.bottom − 3 pips.
for (const { z, mon, wed } of transitioning.slice(0, 3)) {
  const monSL = mon.defense.bottom - 3 * PIP_EU;
  const wedSL = wed.defense.bottom - 3 * PIP_EU;
  console.log(`  EVIDENCE ${z.id}: Mon SL ${monSL.toFixed(5)} vs operator 1.13990 (Δ ${((monSL - 1.13990) / PIP_EU).toFixed(1)}p) · Wed SL ${wedSL.toFixed(5)} vs operator 1.13970 (Δ ${((wedSL - 1.13970) / PIP_EU).toFixed(1)}p)`);
}

// ═══ Z6 — determinism (two builds, identical pressure serialization by zone id) ═══
console.log('');
const pressureSer = (m: ChartModel) => JSON.stringify(
  m.zones
    .map(z => [z.id, z.pressure ?? null, z.shieldZoneId ?? null] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)),
);
let z6Ok = true;
for (const p of PAIRS) {
  const s1 = pressureSer(models[p]!);
  const s2 = pressureSer(models2[p]!);
  if (s1 !== s2) z6Ok = false;
  console.log(`${p}: pressure states ${s1 === s2 ? 'IDENTICAL' : '✗ MISMATCH'} (${models[p]!.zones.length} zones × 2 builds)`);
}
if (!z6Ok) failures.push('Z6: determinism mismatch — the pressure states differ across two builds of the same fixture');

// ═══ VERDICT ═══
console.log('');
if (failures.length === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
