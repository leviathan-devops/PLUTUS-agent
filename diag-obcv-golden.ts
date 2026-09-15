/**
 * diag-obcv-golden.ts — THE PHASE-4 GATE (OBCV acceptance, operator ruling 2026-07-31).
 *
 * The OBCV acceptance (Bible 4.5 §16.6 + PLUTUS_V4.5.2_OVERHAUL_ENGINEERING_SPEC §4.9-4.10):
 *   O1-O3  The golden order blocks reconstructed from DATA ALONE (the levels live in
 *          THIS oracle only — never hardcoded into the machine):
 *            • 1H BoM demand  [100.68-100.73]  — golden T6's TP (the deepest UM zone)
 *            • 4H BoM supply  [101.19-101.35]  — golden T6's entry band (101.235 supply)
 *            • 1H MoM demand  100.845          — golden T3's entry
 *          Inspected on dxyModel.zones (the acceptance), cross-checked on the OBCV
 *          machine's OWN output (direct buildObcv call with the fixture bars).
 *   O4      96%+ agreement vs the operator's drawn OB map (ANCHOR_DOCTRINE §11):
 *          SUPPLY 101.235/101.240/101.250 band + 101.330 (4H BoM) · DEMAND 100.680
 *          (1H BoM) + 100.845 (1H MoM) — every drawn level within 3 pips (floor 5/5).
 *   O5      Doctrine gates (REQUIRED): ZERO 30m BoM zones (BoM-origin law, ALL models)
 *          · ZERO orphan 30m zones (orphan law — the OBCV zones' parent field, verified
 *          on buildObcv's direct output: no 30m zone has parent === undefined)
 *          · partition clean (every ObZone ∈ {BoM, MoM}, never anything else).
 *   O6      BoM quality: every BoM zone bw ≥ 3.0 ∧ bf ≥ 0.65 (first 5 spot-checked).
 *   O7      Determinism: buildObcv × 2 on the same bars → byte-identical serialization.
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Gate protocol:
 *   bun diag-obcv-golden.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for DXY/EUR/USD/GBP/USD,
 * anchored at ANCHOR_MS (week 2026-07-06).
 */
import { buildChartModel } from './src/mdve/index.js';
import { buildObcv } from './src/mdve/obcv.js';
import type { ObZone } from './src/mdve/obcv.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const DXY_PIP = 0.01; // PIP_VALUE_DXY (trading-constants.ts:80)

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => (raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b: any) => b.timestamp <= ANCHOR_MS).sort((a: any, b: any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
// 8-arg call — bars15m is the LAST argument (Phase 2 T5b telescoped tier).
const build = (p: string) => buildChartModel(p, WEEK, barsFor(p, '1H'), barsFor(p, '4H'), barsFor(p, '30m'), spotFor(p), undefined, barsFor(p, '15m'));

const dxy = build('DXY');
const eu  = build('EUR/USD');
const gu  = build('GBP/USD');

// ── the OBCV machine's OWN output — the ORDER_BLOCK source (direct call, per the
//    Phase-4 interface buildObcv({ barsByTf, anchorMs, pair, pipValue }): ObZone[]) ──
const obcvInput = {
  barsByTf: { '4H': barsFor('DXY', '4H'), '1H': barsFor('DXY', '1H'), '30m': barsFor('DXY', '30m') },
  anchorMs: ANCHOR_MS,
  pair: 'DXY',
  pipValue: DXY_PIP,
};
const obZones1: ObZone[] = buildObcv(obcvInput) ?? [];
const obZones2: ObZone[] = buildObcv(obcvInput) ?? [];

const failures: string[] = [];

// ── THE ORACLE (hardcoded HERE — NEVER into the machine; the machine must derive
//    these levels from the week's OWN bars, not from this list) ──
const GOLDEN_OB: { label: string; type: 'SUPPLY' | 'DEMAND'; band: [number, number]; goldenClass: string }[] = [
  { label: '1H BoM demand [100.68-100.73]', type: 'DEMAND', band: [100.68, 100.73], goldenClass: 'BoM' },
  { label: '4H BoM supply [101.19-101.35]', type: 'SUPPLY', band: [101.19, 101.35], goldenClass: 'BoM' },
  { label: '1H MoM demand 100.845',         type: 'DEMAND', band: [100.845 - 0.02, 100.845 + 0.02], goldenClass: 'MoM' },
];
// The operator's drawn OB map (ANCHOR_DOCTRINE §11 — the visual ground truth).
const DRAWN_LEVELS: { label: string; type: 'SUPPLY' | 'DEMAND'; level: number }[] = [
  { label: 'SUPPLY 101.235 (T6 entry)',             type: 'SUPPLY', level: 101.235 },
  { label: 'SUPPLY 101.240 (T5 TP / T6 entry top)', type: 'SUPPLY', level: 101.240 },
  { label: 'SUPPLY 101.250 (T4 SL)',                type: 'SUPPLY', level: 101.250 },
  { label: 'SUPPLY 101.330 (4H BoM — T6 SL)',       type: 'SUPPLY', level: 101.330 },
  { label: 'DEMAND 100.680 (1H BoM — T6 TP)',       type: 'DEMAND', level: 100.680 },
  { label: 'DEMAND 100.845 (1H MoM — T3 entry)',    type: 'DEMAND', level: 100.845 },
];

/** A zone's band overlap with [lo, hi], in pips (0 = no overlap). */
function overlapPips(z: { bottom: number; top: number }, lo: number, hi: number): number {
  return Math.max(0, Math.min(z.top, hi) - Math.max(z.bottom, lo)) / DXY_PIP;
}

/** Best type-matched zone overlapping the oracle band (max overlap wins). */
function findZoneOverlap(zones: { id: string; type: string; top: number; bottom: number; timeframe: string; classification: string }[], type: 'SUPPLY' | 'DEMAND', band: [number, number]) {
  let best: (typeof zones)[number] | null = null; let bestOv = 0;
  for (const z of zones) {
    if (z.type !== type) continue;
    const ov = overlapPips(z, band[0], band[1]);
    if (ov > bestOv) { bestOv = ov; best = z; }
  }
  return best ? { zone: best, overlapPips: bestOv } : null;
}

/** Best type-matched zone within tolPips of a drawn level (inside, else nearest edge). */
function matchDrawnLevel(zones: { id: string; type: string; top: number; bottom: number; timeframe: string; classification: string }[], type: 'SUPPLY' | 'DEMAND', level: number, tolPips: number) {
  let best: (typeof zones)[number] | null = null; let bestD = Infinity;
  for (const z of zones) {
    if (z.type !== type) continue;
    const d = z.bottom <= level && z.top >= level ? 0 : Math.min(Math.abs(z.bottom - level), Math.abs(z.top - level));
    if (d <= tolPips * DXY_PIP && d < bestD) { bestD = d; best = z; }
  }
  return best ? { zone: best, deltaPips: bestD / DXY_PIP } : null;
}

console.log('=== OBCV GOLDEN ORACLE (Phase 4) ===\n');

// ═══ O1-O3 — the golden OB reconstruction (the acceptance) ═══
// Gate source: dxyModel.zones (the task's contract). buildObcv's direct output is
// cross-checked to distinguish "machine can't see it" from "wiring not landed".
const o13Hits: { label: string; model: boolean; machine: boolean; info: string }[] = [];
for (const g of GOLDEN_OB) {
  const modelHit = findZoneOverlap(dxy.zones, g.type, g.band);
  const machineHit = findZoneOverlap(obZones1, g.type, g.band);
  const hit = modelHit ?? machineHit;
  const info = hit
    ? `${hit.zone.type} ${hit.zone.classification} ${hit.zone.timeframe} ${hit.zone.id} (overlap ${hit.overlapPips.toFixed(1)}p, golden ${g.goldenClass})`
    : 'MISSING';
  o13Hits.push({ label: g.label, model: modelHit !== null, machine: machineHit !== null, info });
  if (!modelHit) {
    failures.push(`O1-O3: ${g.label} not in dxyModel.zones${machineHit ? ' (buildObcv found it — model wiring pending)' : ''}`);
  }
}
console.log(`Golden OB reconstruction: ${o13Hits.filter(h => h.model).length}/3 present (${o13Hits.map(h => `${h.label} ${h.model ? '✓' : '✗'}`).join(' · ')}):`);
for (const h of o13Hits) {
  console.log(`  ${h.label} → ${h.model ? '✓ model' : '✗'} ${h.info}${h.machine && !h.model ? ' [machine: ✓]' : ''}`);
}

// ═══ O4 — 96%+ agreement vs the operator's drawn OB map (ANCHOR_DOCTRINE §11) ═══
// The drawn map is the ground truth; a level is matched by a type-correct zone whose
// [bottom, top] band is within 3 pips. Model first; the OBCV machine's direct output
// answers the same reconstruction (either source proves the level exists).
const drawnHits: { label: string; ok: boolean; info: string }[] = [];
for (const lvl of DRAWN_LEVELS) {
  const modelHit = matchDrawnLevel(dxy.zones, lvl.type, lvl.level, 3);
  const machineHit = matchDrawnLevel(obZones1, lvl.type, lvl.level, 3);
  const hit = modelHit ?? machineHit;
  const info = hit
    ? `${hit.zone.type} ${hit.zone.classification} ${hit.zone.timeframe} ${hit.zone.id} @Δ${hit.deltaPips.toFixed(1)}p [${modelHit ? 'model' : 'machine'}]`
    : `✗ no ${lvl.type} zone within 3 pips`;
  drawnHits.push({ label: lvl.label, ok: hit !== null, info });
  if (!hit) failures.push(`O4: drawn level ${lvl.label} (${lvl.level}) unmatched within 3 pips`);
}
const drawnOkCount = drawnHits.filter(h => h.ok).length;
console.log(`\nDrawn-map agreement: ${drawnOkCount}/${DRAWN_LEVELS.length} within 3 pips (required: 5/5 → 100%):`);
for (const h of drawnHits) {
  console.log(`  ${h.label} → ${h.ok ? '✓' : '✗'} ${h.info}`);
}

// ═══ O5 — the doctrine gates (REQUIRED) ═══
// BoM-origin law: ZERO 30m BoM zones across ALL models (dxy/eu/gu) + the machine.
const allModelZones = [...dxy.zones, ...eu.zones, ...gu.zones];
const boM30Model = allModelZones.filter(z => z.timeframe === '30m' && z.classification === 'BoM').length;
const boM30Obcv = obZones1.filter(z => z.timeframe === '30m' && z.classification === 'BoM').length;
if (boM30Model > 0) failures.push(`O5: ${boM30Model} 30m BoM zones across models (BoM-origin law)`);
if (boM30Obcv > 0) failures.push(`O5: ${boM30Obcv} 30m BoM zones in buildObcv output (BoM-origin law)`);

// Orphan law: the OBCV zones' parent field — verified on buildObcv's direct output
// (the authoritative machine contract: 30m OB REQUIRES a 1H parent, orphan → REJECT).
const orphan30Obcv = obZones1.filter(z => z.timeframe === '30m' && z.parent === undefined).length;
if (orphan30Obcv > 0) failures.push(`O5: ${orphan30Obcv} orphan 30m zones in buildObcv output (parent === undefined)`);
const orphan30Model = dxy.zones.filter(z => z.timeframe === '30m' && z.parent === undefined).length;

// Partition law: every ObZone has classification 'BoM' or 'MoM' — never anything else.
const partitionBad = obZones1.filter(z => z.classification !== 'BoM' && z.classification !== 'MoM');
if (partitionBad.length > 0) failures.push(`O5: partition violation — ${partitionBad.length} ObZones with classification ∉ {BoM, MoM}`);

console.log(`\n30m BoM zones: ${boM30Model} (models, REQUIRED 0) / ${boM30Obcv} (machine) · orphan 30m: ${orphan30Obcv} (machine, REQUIRED 0; model: ${orphan30Model}) · partition: ${partitionBad.length === 0 ? 'clean' : `${partitionBad.length} VIOLATIONS`}`);

// ═══ O6 — the quality gates (every BoM: bw ≥ 3.0 ∧ bf ≥ 0.65; first 5 spot-checked) ═══
const bomZones = obZones1.filter(z => z.classification === 'BoM');
const bomBad = bomZones.filter(z => !(z.bw >= 3.0 && z.bf >= 0.65));
if (bomBad.length > 0) failures.push(`O6: ${bomBad.length} BoM zones with bw < 3.0 or bf < 0.65 (first: ${bomBad[0]!.id})`);
const spot = bomZones.slice(0, 5).map(z => `${z.id}: bw=${z.bw} bf=${z.bf} prior=${z.prior}`).join(' | ') || '(none)';
console.log(`\nBoM quality (${bomZones.length} BoM zones, first 5): ${spot}`);
console.log(`  all bw≥3.0 ∧ bf≥0.65: ${bomBad.length === 0 ? 'yes' : `no (${bomBad.length} failed)`}`);

// ═══ O7 — determinism (two buildObcv runs on the same bars → byte-identical) ═══
// Serialized as a flat projection (parent → parentId) — JSON.stringify on the raw
// zones would throw on the circular parent link; the projection is the honest
// deterministic fingerprint of every zone's identity + geometry + classification.
const fingerprint = (zs: ObZone[]): string => JSON.stringify(zs.map(z => [
  z.id, z.type, z.top, z.bottom, z.timeframe, z.classification, z.formationMs,
  z.originIdx, z.bw, z.bf, z.prior, z.zfp,
  z.parent === undefined || z.parent === null ? null : (typeof z.parent === 'string' ? z.parent : z.parent.id),
]));
const det = fingerprint(obZones1) === fingerprint(obZones2);
if (!det) failures.push('O7: determinism mismatch between two buildObcv runs');
console.log(`\nDeterminism: ${det ? 'IDENTICAL' : 'MISMATCH'} (${obZones1.length} zones vs ${obZones2.length} zones)`);

// ═══ VERDICT ═══
console.log('');
if (failures.length === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
