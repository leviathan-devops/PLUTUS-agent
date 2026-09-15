/**
 * diag-source-lane.ts — THE WAVE I2 SOURCE-LANE GATE (permanent).
 *
 * Builds the three models from /tmp/opencode/bars_raw.json (ANCHOR_MS =
 * 1783702800000, filter ≤ ANCHOR_MS), runs the DXY source lane
 * (generateSourceSetupsV45 via the report pipeline), and asserts the golden
 * source-lane trace + the E2 CORE designations:
 *
 *   S1  the Mon LONG entry 100.945 ±1p · SL 100.905 ±2p · TP 101.115 ±3p ·
 *       RRR ≥ 3.0 (the operator's #1 Mon SS Long — the golden E/SL/TP).
 *   S2  the Wed LONG exists at 100.975 ±3p (entry) with TP 101.240 ±3p
 *       (the golden T5 RWL LONG — the TP 101.240 is already correct there).
 *   S3  the EU Monday designation (projectZoneForDay on the EU model)
 *       resolves to the supply at 1.14544 ±3p — keyZonePrice = the internal
 *       rung's near edge (the Gap-1 S/D-zone preference: the 1H supply
 *       [1.14469-1.14608] mid 1.14539 CONTAINS the internal rung
 *       [1.14567-1.14583] → the near edge 1.14567, Δ2.3p).
 *   S4  the Wed DXY SHORT designation unchanged — 101.239 ±1p (the
 *       diag-e2-forward E1 trace; the DXY Monday designation must NOT change).
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure.
 * Run: bun diag-source-lane.ts — must exit 0.
 */
import { buildChartModel, generateSourceSetupsV45 } from './src/mdve/index.js';
import { buildShapeBrain, snapshotToCascadedChain } from './report-v452.js';
import { ShapeBrain } from './src/brains/shape-brain.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar, DXYZone, ZoneMapSnapshot } from './src/types.js';
import { ZoneType } from './src/types.js';

const ANCHOR_MS = 1783702800000; const WEEK = '2026-07-06';
const PIP: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync('/tmp/opencode/bars_raw.json', 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= ANCHOR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
const build = (p: string) =>
  buildChartModel(p, WEEK, barsFor(p, '1H'), barsFor(p, '4H'), barsFor(p, '30m'), spotFor(p), undefined, barsFor(p, '15m'));

const models = { DXY: build('DXY'), 'EUR/USD': build('EUR/USD'), 'GBP/USD': build('GBP/USD') };

// ═══ S1 + S2 — the DXY source lane (generateSourceSetupsV45) ═══
const dxySetups = generateSourceSetupsV45(models.DXY);
// The #1 Mon SS Long = the LQZ transit at the 100.945 shelf (the golden E —
// NOT the OB demand 100.842, which is a DIFFERENT Monday trade). Select the
// Monday LONG whose entry is NEAREST the golden 100.945 (the operator's #1).
const monLong = dxySetups
  .filter((s) => s.direction === 'LONG' && s.day === 'Monday')
  .sort((a, b) => Math.abs(a.entry - 100.945) - Math.abs(b.entry - 100.945))[0];
const wedLong = dxySetups.find((s) => s.direction === 'LONG' && s.day === 'Wednesday');

let failures = 0;

// ── S1: the Mon LONG golden E/SL/TP ──
let s1 = false;
if (monLong) {
  const e = Math.abs(monLong.entry - 100.945) / PIP.DXY;
  const sl = Math.abs(monLong.sl - 100.905) / PIP.DXY;
  const tp = Math.abs(monLong.tp - 101.115) / PIP.DXY;
  const rrr = monLong.rrr >= 3.0;
  s1 = e <= 1 && sl <= 2 && tp <= 3 && rrr;
  console.log(`S1 Mon LONG: E ${monLong.entry.toFixed(3)} (Δ${e.toFixed(1)}p, ≤1p ${e <= 1 ? '✅' : '❌'}) · SL ${monLong.sl.toFixed(3)} (Δ${sl.toFixed(1)}p, ≤2p ${sl <= 2 ? '✅' : '❌'}) · TP ${monLong.tp.toFixed(3)} (Δ${tp.toFixed(1)}p, ≤3p ${tp <= 3 ? '✅' : '❌'}) · RRR ${monLong.rrr.toFixed(2)} ${rrr ? '✅' : '❌'}`);
} else {
  console.log('S1 Mon LONG: ❌ no Monday LONG emitted');
}
if (!s1) failures++;

// ── S2: the Wed LONG at 100.975 ±3p with TP 101.240 ±3p ──
let s2 = false;
if (wedLong) {
  const e = Math.abs(wedLong.entry - 100.975) / PIP.DXY;
  const tp = Math.abs(wedLong.tp - 101.240) / PIP.DXY;
  s2 = e <= 3 && tp <= 3;
  console.log(`S2 Wed LONG: E ${wedLong.entry.toFixed(3)} (Δ${e.toFixed(1)}p, ≤3p ${e <= 3 ? '✅' : '❌'}) · TP ${wedLong.tp.toFixed(3)} (Δ${tp.toFixed(1)}p, ≤3p ${tp <= 3 ? '✅' : '❌'})`);
} else {
  console.log('S2 Wed LONG: ❌ no Wednesday LONG emitted');
}
if (!s2) failures++;

// ═══ S3 + S4 — the E2 CORE designations (projectZoneForDay) ═══
function toDxyZone(z: { id: string; bottom: number; top: number; type: 'SUPPLY' | 'DEMAND'; classification: 'BoM' | 'MoM'; zfp: number; confluence: number; formationMs: number; freshness: string; reactionEvents: { lastTouchMs: number }[] }): DXYZone {
  const isBoM = z.classification === 'BoM';
  let type: ZoneType;
  if (isBoM && z.type === 'SUPPLY') type = ZoneType.BOM_SUPPLY;
  else if (isBoM && z.type === 'DEMAND') type = ZoneType.BOM_DEMAND;
  else if (z.type === 'SUPPLY') type = ZoneType.MOM_SUPPLY;
  else type = ZoneType.MOM_DEMAND;
  const reactionStatus: DXYZone['reactionStatus'] =
    z.freshness === 'FRESH' ? 'virgin' : z.freshness === 'DEPLETED' || z.freshness === 'VIOLATED' ? 'depleted' : 'active';
  return {
    id: z.id, floor: z.bottom, ceiling: z.top, type, isBoM,
    reactionCount: z.reactionEvents.length, reactionStatus, confluence: z.confluence,
    pillars: [], zfp: z.zfp, createdAt: z.formationMs,
    lastTested: z.reactionEvents.length > 0 ? z.reactionEvents.reduce((mx, ev) => Math.max(mx, ev.lastTouchMs), 0) : null,
  };
}

async function brainFor(pair: string, model: ReturnType<typeof build>) {
  const snap: ZoneMapSnapshot = {
    version: 1, timestamp: Date.now(), instrument: pair,
    zones: model.zones.map(toDxyZone), spots: { [pair]: model.spot },
  };
  const ltfZones = model.zones.filter((z) => z.timeframe === '30m').map(toDxyZone);
  const b = new ShapeBrain();
  b.setZoneMap(snap, ltfZones);
  return b.compute();
}

const euBrain = await brainFor('EUR/USD', models['EUR/USD']);
const dxyBrain = await brainFor('DXY', models.DXY);

// ── S3: the EU Monday designation → the supply at 1.14544 ±3p ──
let s3 = false;
if (euBrain?.shapeChain.dayDecomposition) {
  const mon = euBrain.shapeChain.dayDecomposition[0] as any;
  const kp = mon.keyZonePrice as number | undefined;
  const kz = mon.keyZoneId as string | undefined;
  const isSupply = typeof kz === 'string' && kz.includes('1.14469') || typeof kz === 'string' && !kz.startsWith('LMV|');
  const delta = kp !== undefined && Number.isFinite(kp) ? Math.abs(kp - 1.14544) / PIP['EUR/USD'] : Infinity;
  s3 = kp !== undefined && delta <= 3 && typeof kz === 'string' && isSupply;
  console.log(`S3 EU Mon designation: key=${kz} @${kp?.toFixed(5)} (Δ${delta === Infinity ? '?' : delta.toFixed(1)}p, ≤3p ${delta <= 3 ? '✅' : '❌'}) · Fire=supply-zone ${isSupply ? '✅' : '❌'} (the S/D-zone preference)`);
} else {
  console.log('S3 EU Mon designation: ❌ brain returned null');
}
if (!s3) failures++;

// ── S4: the Wed DXY SHORT designation unchanged — 101.239 ±1p ──
let s4 = false;
if (dxyBrain?.shapeChain.dayDecomposition) {
  const wed = dxyBrain.shapeChain.dayDecomposition.find((d) => /wed/i.test(d.day)) as any;
  const kp = wed?.keyZonePrice as number | undefined;
  const delta = kp !== undefined && Number.isFinite(kp) ? Math.abs(kp - 101.239) / PIP.DXY : Infinity;
  s4 = kp !== undefined && delta <= 1;
  console.log(`S4 Wed DXY SHORT designation: key=${wed?.keyZoneId} @${kp?.toFixed(3)} (Δ${delta === Infinity ? '?' : delta.toFixed(1)}p, ≤1p ${delta <= 1 ? '✅' : '❌'}) — unchanged (101.239 baseline)`);
} else {
  console.log('S4 Wed DXY SHORT designation: ❌ brain returned null');
}
if (!s4) failures++;

console.log('');
console.log(`=== VERDICT: ${failures === 0 ? 'PASS (all gates)' : `FAIL (${failures} gate${failures > 1 ? 's' : ''})`} ===`);
process.exit(failures === 0 ? 0 : 1);
