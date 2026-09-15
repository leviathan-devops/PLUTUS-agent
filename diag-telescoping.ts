/**
 * diag-telescoping.ts — THE PHASE-2 GATE (operator ruling 2026-07-31).
 *
 * The operator: "If E1 is fucked everything that is built on top of it also
 * gets fucked." E1 = the 7 golden DXY levels, computed from the week's OWN
 * data (NEVER hardcoded), must be present in the zone map + ladder. This
 * diagnostic asserts the telescoping acceptance:
 *
 *   G1  The 7 golden DXY levels present in the zone map AND ladder (≤1 pip)
 *   G2  The EU ladder levels present (≤2 pips) — zones + ladder
 *   G3  The GU ladder levels present (≤2 pips) — zones + ladder
 *   G4  Determinism — same bars → byte-identical zone map (two DXY builds)
 *   U1  30m zones are MoM-only (ZERO 30m BoM zones — the doctrine gate)
 *   U2  Telescoping refinedLabel tags present (≥1 in DXY)
 *   U3  15m fine rungs distinct (no two 15m LQZ_M rungs within 1 pip)
 *   U4  No future leak (every zone formationMs ≤ ANCHOR_MS)
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Gate protocol:
 *   bun diag-telescoping.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for
 * DXY/EUR/USD/GBP/USD, anchored at ANCHOR_MS (week 2026-07-06).
 */
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { ZoneModel } from './src/mdve/types.js';
import type { ScaffoldRung } from './src/engines/ladder-scaffold.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
// 8-arg call — bars15m is the LAST argument (Phase 2 T5b telescoped tier).
const build = (p: string) => buildChartModel(p, WEEK, barsFor(p,'1H'), barsFor(p,'4H'), barsFor(p,'30m'), spotFor(p), undefined, barsFor(p,'15m'));

const dxy = build('DXY');
const eu  = build('EUR/USD');
const gu  = build('GBP/USD');

const PIP: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
// The 7 golden DXY levels — E1, computed from the week's OWN data.
const GOLDEN_DXY = [100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240];
const EU_LADDER  = [1.14544, 1.14205, 1.14004, 1.13950, 1.13953, 1.14325, 1.14408, 1.14505];
const GU_LADDER  = [1.33882, 1.33522, 1.33941, 1.33629, 1.34075, 1.34360, 1.34481];

const failures: string[] = [];

// ── level matcher: a zone hits if its [bottom, top] band contains the level
//    or an edge is within tolPips; a rung hits if its price is within tolPips.
interface Hit { kind: 'zone' | 'rung'; id: string; ref: number; deltaPips: number; }
function matchLevel(level: number, zones: ZoneModel[], ladder: ScaffoldRung[], pip: number, tolPips: number): Hit | null {
  let best: Hit | null = null;
  for (const z of zones) {
    const inside = z.bottom <= level && z.top >= level;
    const dEdge = Math.min(Math.abs(z.bottom - level), Math.abs(z.top - level)) / pip;
    if (inside || dEdge <= tolPips) {
      const ref = Math.abs(z.bottom - level) <= Math.abs(z.top - level) ? z.bottom : z.top;
      const hit: Hit = { kind: 'zone', id: z.id, ref, deltaPips: Math.abs(ref - level) / pip };
      if (!best || hit.deltaPips < best.deltaPips) best = hit;
    }
  }
  for (const r of ladder) {
    const d = Math.abs(r.price - level) / pip;
    if (d <= tolPips) {
      const hit: Hit = { kind: 'rung', id: r.id, ref: r.price, deltaPips: d };
      if (!best || hit.deltaPips < best.deltaPips) best = hit;
    }
  }
  return best;
}

console.log('=== TELESCOPING GATE (Phase 2) ===\n');

// ═══ G1 — the 7 golden DXY levels (THE GATE) ═══
const g1 = GOLDEN_DXY.map(lvl => ({ lvl, hit: matchLevel(lvl, dxy.zones, dxy.ladder, PIP.DXY, 1) }));
const g1Ok = g1.every(g => g.hit !== null);
if (!g1Ok) failures.push('G1: golden DXY levels not all present (E1 gate)');
console.log(`DXY golden levels: ${g1.filter(g => g.hit).length}/${GOLDEN_DXY.length} present (≤1 pip, zones + ladder):`);
for (const g of g1) {
  console.log(`  ${g.lvl.toFixed(3)} → ${g.hit ? `✅ ${g.hit.kind} ${g.hit.id} @${g.hit.ref.toFixed(3)} Δ${g.hit.deltaPips.toFixed(1)}p` : '✗ MISSING'}`);
}

// ═══ G2 — EU ladder levels (≤2 pips) ═══
const g2 = EU_LADDER.map(lvl => ({ lvl, hit: matchLevel(lvl, eu.zones, eu.ladder, PIP['EUR/USD'], 2) }));
const g2Ok = g2.every(g => g.hit !== null);
if (!g2Ok) failures.push('G2: EU ladder levels not all present');
console.log(`\nEU ladder: ${g2.filter(g => g.hit).length}/${EU_LADDER.length} present (≤2 pips):`);
for (const g of g2) {
  console.log(`  ${g.lvl.toFixed(5)} → ${g.hit ? `✅ ${g.hit.kind} ${g.hit.id} @${g.hit.ref.toFixed(5)} Δ${g.hit.deltaPips.toFixed(1)}p` : '✗ MISSING'}`);
}

// ═══ G3 — GU ladder levels (≤2 pips) ═══
const g3 = GU_LADDER.map(lvl => ({ lvl, hit: matchLevel(lvl, gu.zones, gu.ladder, PIP['GBP/USD'], 2) }));
const g3Ok = g3.every(g => g.hit !== null);
if (!g3Ok) failures.push('G3: GU ladder levels not all present');
console.log(`\nGU ladder: ${g3.filter(g => g.hit).length}/${GU_LADDER.length} present (≤2 pips):`);
for (const g of g3) {
  console.log(`  ${g.lvl.toFixed(5)} → ${g.hit ? `✅ ${g.hit.kind} ${g.hit.id} @${g.hit.ref.toFixed(5)} Δ${g.hit.deltaPips.toFixed(1)}p` : '✗ MISSING'}`);
}

// ═══ G4 — determinism (two DXY builds, byte-identical zone serialization) ═══
const dxy2 = build('DXY');
const ser1 = JSON.stringify(dxy.zones.map(z => [z.id, z.top, z.bottom]));
const ser2 = JSON.stringify(dxy2.zones.map(z => [z.id, z.top, z.bottom]));
const g4Ok = ser1 === ser2;
if (!g4Ok) failures.push('G4: determinism mismatch between two DXY builds');
console.log(`\nDeterminism: ${g4Ok ? 'IDENTICAL' : 'MISMATCH'} (${dxy.zones.length} zones vs ${dxy2.zones.length} zones)`);

const allZones: ZoneModel[] = [...dxy.zones, ...eu.zones, ...gu.zones];

// ═══ U1 — 30m MoM-only doctrine gate ═══
const boM30 = allZones.filter(z => z.timeframe === '30m' && z.classification === 'BoM');
const u1Ok = boM30.length === 0;
if (!u1Ok) failures.push(`U1: ${boM30.length} 30m BoM zones found (doctrine: 30m is MoM-only)`);
console.log(`30m BoM zones: ${boM30.length} (REQUIRED: 0)`);

// ═══ U2 — telescoping refinedLabel tags present ═══
const labelled = allZones.filter(z => typeof z.refinedLabel === 'string' && z.refinedLabel.length > 0);
const labelsSeen = [...new Set(labelled.map(z => z.refinedLabel))];
const dxyLabelled = dxy.zones.filter(z => typeof z.refinedLabel === 'string' && z.refinedLabel.length > 0);
const u2Ok = dxyLabelled.length >= 1;
if (!u2Ok) failures.push('U2: no refinedLabel zones in DXY (telescoping tags missing)');
console.log(`refinedLabels (${labelled.length} zones across models, ${dxyLabelled.length} in DXY): ${labelsSeen.join(', ') || '(none)'}`);

// ═══ U3 — 15m fine rungs distinct (LQZ_M namespace; no two within 1 pip) ═══
// Scoped to the 15m LQZ_M tier: cross-tier (1H LQZ_M vs 15m) nesting is the
// EXPECTED telescoping behavior — fine-rung separation applies within the
// 15m fine-rung set only.
const r15 = dxy.ladder.filter(r => r.timeframe === '15m' && r.id.includes('LQZ_M'));
let u3Ok = true;
for (let i = 0; i < r15.length; i++) {
  for (let j = i + 1; j < r15.length; j++) {
    if (Math.abs(r15[i].price - r15[j].price) <= PIP.DXY) { u3Ok = false; break; }
  }
  if (!u3Ok) break;
}
if (!u3Ok) failures.push('U3: two 15m LQZ_M rungs within 1 pip of each other');
const p15 = r15.map(r => r.price.toFixed(3));
console.log(`15m fine rungs (${r15.length}): [${p15.join(', ') || 'none'}] — distinct: ${u3Ok ? 'yes' : 'no'}`);

// ═══ U4 — no future leak (formationMs ≤ ANCHOR_MS) ═══
let u4Bad = 0;
for (const z of allZones) {
  if (typeof z.formationMs === 'number' && z.formationMs > ANCHOR_MS) u4Bad++;
}
const u4Ok = u4Bad === 0;
if (!u4Ok) failures.push(`U4: ${u4Bad} zones with formationMs > ANCHOR_MS (future leak)`);
console.log(`Future leak check: ${u4Ok ? 'CLEAN' : `${u4Bad} VIOLATIONS`} (formationMs ≤ ANCHOR_MS on ${allZones.length} zones)`);

// ═══ VERDICT ═══
console.log('');
if (failures.length === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
