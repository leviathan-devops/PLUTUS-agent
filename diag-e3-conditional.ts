/**
 * diag-e3-conditional.ts — THE WAVE ZR-3 GATE: THE E3-CONDITIONAL GATE.
 *
 * The D37 (the failure this gate proves killed): the GU Mon mirror
 * (E 1.33965) died at "RRR 1.9 < 3.0 — SL 13.1p, TP 24.5p (nearest-first)"
 * because (1) the cap-walk's zfp≤20 predicate fired on every LQZ rung (the
 * TP stopped at the 1.33720 shelf — the structural wall [1.33312-1.33516]
 * with internal LQZ 1.33347 was unreachable), (2) the E2-projected OB zone
 * never resolved, (3) the refinement search was substrate-bound. This gate
 * asserts the fixes:
 *
 *   E1  The ladder-steps SL + the zone-relevance switch: on the EU trade
 *       #2/#4 transition zone, computeLadderStepsSL anchors Monday's SL to
 *       the nested rung (SHIELD_FUEL — fuel INTACT) and Wednesday's SL to
 *       the zone itself (PRESSURE_STRUCTURE — fuel ABSORBED), with the SL
 *       at the defense's far edge ∓ 3p (the operator's ladder-steps rule,
 *       MACRO_CONTEXT Part 5.3 verbatim).
 *   E2  The strength-driven TP edge (Part 5.4 verbatim): STRONG zone →
 *       close edge + spread; WEAK zone → far edge. classifyZoneStrength
 *       must agree with the geometry-located STRONG/WEAK candidates.
 *   E3  The E2-projected TP resolution: the GU 4H MoM DEMAND OB
 *       [1.33312-1.33516] resolves its internal LQZ (the 1.33347 rung —
 *       the strongestInternalLqzRung path / the defended edge).
 *   E4  THE D37 KILL — the E1-pressure wall classification: the shallow
 *       LMV-bridge shelves between the GU Mon entry and the structural OB
 *       classify PASS-THROUGH (isStructuralWall === false); the 4H MoM OB
 *       classifies STRUCTURAL (true). The walk from E 1.33965 SHORT
 *       reaches the OB — never the 1.33720 shelf — and the implied RRR
 *       with SL 13.1p is ≥ 3.0.
 *   E5  The per-anchor state machine: refineSetup's result exposes the
 *       E/SL/TP tracks (attempts + locked) AND (repairs the D37 geometry
 *       to RRR ≥ 3.0 OR hard-rejects with a RejectionContext carrying a
 *       non-empty why AND how).
 *   E6  Determinism: the models built twice — E1/E4's computed values
 *       serialize identically.
 *
 * PARALLEL-WAVE GUARD: the ZR-3A exports (computeLadderStepsSL /
 * classifyZoneStrength / isStructuralWall — mirror.ts) and the ZR-3B
 * per-anchor state (refinement-machine.ts) are probed at load. Absent
 * exports → the dependent gates report BLOCKED (TRANSIENT) with the
 * missing names and the gate exits 1. This diag NEVER creates those
 * exports (ZR-3A/3B own their files). Both waves landed 2026-08-04 —
 * the gates run live; the probe remains as the regression guard.
 *
 * The golden levels (1.33965 / 1.33834 / 1.33720 / 1.33347 / RRR 4.7)
 * appear ONLY as printed reference evidence — never baked pass criteria
 * (the RRR ≥ 3.0 assertion is the criterion). Zones are located by
 * GEOMETRY (the band ranges), never by hardcoded zone id.
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Gate protocol:
 *   bun diag-e3-conditional.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for
 * DXY/EUR/USD/GBP/USD, anchored at ANCHOR_MS (week 2026-07-06).
 */
import { buildChartModel } from './src/mdve/index.js';
import * as MirrorZR3A from './src/mdve/mirror.js';
import { refineSetup } from './src/mdve/refinement-machine.js';
import type { RefineInput } from './src/mdve/refinement-machine.js';
import { computeSL_LMV } from './src/mdve/sl-lmv.js';
import type { ShapeDayZone } from './src/mdve/shape-cascade.js';
import type { ChartModel, ZoneModel } from './src/mdve/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';
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
for (const p of PAIRS) { models[p] = build(p); models2[p] = build(p); } // twins for E6

// ═══ THE ZR-3A EXPORT PROBE (the parallel-wave transient — never fabricated) ═══
type LadderStepsSLResult = { sl: number; defenseId: string; branch: 'CURRENT_STEP' | 'NEXT_STEP'; reason: string } | null;
type LadderStepsSLFn = (model: ChartModel, entryZoneId: string, entry: number, direction: 'LONG' | 'SHORT', pipValue: number, opts?: { asOfMs?: number }) => LadderStepsSLResult;
type ClassifyZoneStrengthFn = (zone: ZoneModel) => 'STRONG' | 'WEAK' | 'MIDDLE';
type IsStructuralWallFn = (zone: ZoneModel) => boolean;
const computeLadderStepsSL = (MirrorZR3A as any).computeLadderStepsSL as LadderStepsSLFn | undefined;
const classifyZoneStrength = (MirrorZR3A as any).classifyZoneStrength as ClassifyZoneStrengthFn | undefined;
const isStructuralWall = (MirrorZR3A as any).isStructuralWall as IsStructuralWallFn | undefined;
const absentZR3A: string[] = [];
if (typeof computeLadderStepsSL !== 'function') absentZR3A.push('computeLadderStepsSL');
if (typeof classifyZoneStrength !== 'function') absentZR3A.push('classifyZoneStrength');
if (typeof isStructuralWall !== 'function') absentZR3A.push('isStructuralWall');

const failures: string[] = [];
const PIP = 0.0001;               // EUR/USD + GBP/USD pip value
const MON_MS = 1783339200000;     // 2026-07-06T12:00Z — trade #2 (fuel INTACT → the rung defends)
const WED_MS = 1783533600000;     // 2026-07-08T18:00Z — trade #4 (fuel ABSORBED → the zone defends)
const WEEK_START_MS = Date.UTC(2026, 6, 6);          // 2026-07-06T00:00Z
const WEEK_END_MS = Date.UTC(2026, 6, 10, 21);       // 2026-07-10T21:00Z
const iso = (ms: number | undefined) => ms === undefined ? '—' : new Date(ms).toISOString();

console.log('=== E3-CONDITIONAL GATE (Wave ZR-3) ===\n');
if (absentZR3A.length > 0) {
  console.log(`ZR-3A TRANSIENT: absent mirror.ts exports — ${absentZR3A.join(', ')} (the dependent gates report BLOCKED; the parallel wave owns them)`);
}

/** Resolve a defense id to its band — the ZoneModel lane first, then the
 *  LMV table (the `LMV|pair|center` namespace is shared, index.ts:362). */
const resolveDefenseBand = (m: ChartModel, defenseId: string): { bottom: number; top: number } | null => {
  const z = m.zones.find(zz => zz.id === defenseId);
  if (z) return { bottom: z.bottom, top: z.top };
  const prefix = `LMV|${m.pair}|`;
  if (defenseId.startsWith(prefix)) {
    const center = Number(defenseId.slice(prefix.length));
    const rung = m.lmv.table.find(r => Math.abs(r.center - center) < 1e-9);
    if (rung) return { bottom: rung.bottom, top: rung.top };
  }
  return null;
};

// ═══ E1 — the ladder-steps SL + the zone-relevance switch ═══
console.log('');
const e1 = (eu: ChartModel, label: string): { ok: boolean; serialized: string } => {
  if (!computeLadderStepsSL) {
    console.log(`E1${label}: BLOCKED (ZR-3A TRANSIENT — computeLadderStepsSL absent)`);
    return { ok: false, serialized: 'BLOCKED' };
  }
  // Geometry-locate the trade #2/#4 transition zone: a DEMAND zone with a
  // NESTED link whose eatenAtMs is inside the golden week (the ZR-1 gate's
  // zone — never a hardcoded id).
  const candidates = eu.zones.filter(z =>
    z.type === 'DEMAND' && !z.id.startsWith('LMV|') &&
    (z.pressure?.liquidity ?? []).some(l =>
      l.kind === 'NESTED' && l.eatenAtMs !== undefined &&
      l.eatenAtMs >= WEEK_START_MS && l.eatenAtMs <= WEEK_END_MS));
  console.log(`E1${label} candidates: ${candidates.length} EUR/USD DEMAND zones with a NESTED link eaten inside the week:`);
  for (const z of candidates) {
    const nested = (z.pressure?.liquidity ?? []).find(l => l.kind === 'NESTED' && l.eatenAtMs !== undefined && l.eatenAtMs >= WEEK_START_MS && l.eatenAtMs <= WEEK_END_MS);
    console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] nested=${nested?.rungId} eatenAt=${iso(nested?.eatenAtMs)}`);
  }
  for (const z of candidates) {
    const entry = z.bottom + 2 * PIP;
    const mon = computeLadderStepsSL(eu, z.id, entry, 'LONG', PIP, { asOfMs: MON_MS });
    const wed = computeLadderStepsSL(eu, z.id, entry, 'LONG', PIP, { asOfMs: WED_MS });
    if (!mon || !wed) { console.log(`  ${z.id}: null result (Mon ${mon ? '✓' : '✗'} / Wed ${wed ? '✓' : '✗'}) — skipped`); continue; }
    console.log(`  ${z.id} entry=${entry.toFixed(5)}:`);
    console.log(`    Mon: sl=${mon.sl.toFixed(5)} defense=${mon.defenseId} branch=${mon.branch} — ${mon.reason}`);
    console.log(`    Wed: sl=${wed.sl.toFixed(5)} defense=${wed.defenseId} branch=${wed.branch} — ${wed.reason}`);
    // RECALIBRATED 2026-08-04 (the ZR-3 adjudication): the Monday fuel-INTACT
    // defense takes EITHER doctrine-legitimate branch — CURRENT_STEP (3p outside
    // the nested rung's far edge — trade #2) OR NEXT_STEP (1.5p inside the next
    // step's close edge when the 3p branch overshoots it — trade #7's thin-zone
    // branch). Both are the operator's rule ("It is either 3 pips outside the
    // far edge of the current step we enter on, or 1-2 pips inside the close
    // edge of the NEXT STEP away"). The switch assertion: Monday defends at the
    // FUEL/next-step (NOT the zone itself), Wednesday defends at the ZONE ITSELF.
    const monFuelDefense = mon.defenseId !== z.id && (mon.branch === 'CURRENT_STEP' || mon.branch === 'NEXT_STEP');
    if (!(monFuelDefense && wed.defenseId === z.id)) continue;
    // The SL placement per branch (within 0.5p):
    const monBand = resolveDefenseBand(eu, mon.defenseId);
    const wedBand = resolveDefenseBand(eu, wed.defenseId);
    const monExp = monBand
      ? (mon.branch === 'NEXT_STEP' ? monBand.top - 1.5 * PIP : monBand.bottom - 3 * PIP)  // LONG
      : null;
    const wedExp = wedBand ? wedBand.bottom - 3 * PIP : null;
    const tol = 0.5 * PIP;
    const monOk = monExp !== null && Math.abs(mon.sl - monExp) <= tol;
    const wedOk = wedExp !== null && Math.abs(wed.sl - wedExp) <= tol;
    console.log(`    SL edge rule: Mon ${mon.sl.toFixed(5)} vs far-edge−3p ${monExp?.toFixed(5) ?? 'unresolved'} ${monOk ? '✓' : '✗'} · Wed ${wed.sl.toFixed(5)} vs ${wedExp?.toFixed(5) ?? 'unresolved'} ${wedOk ? '✓' : '✗'}`);
    if (monOk && wedOk) {
      return { ok: true, serialized: JSON.stringify({ zone: z.id, entry, mon, wed }) };
    }
  }
  return { ok: false, serialized: 'NO-TRANSITION-ZONE' };
};
const e1r = e1(models['EUR/USD']!, '');
if (!e1r.ok) failures.push(`E1: the ladder-steps SL FAILED — no transition zone showed Mon=nested-rung (LMV|…, SHIELD_FUEL) ∧ Wed=zone-itself (PRESSURE_STRUCTURE) with the SL at the defense's far edge ∓ 3p (${e1r.serialized === 'BLOCKED' ? 'ZR-3A TRANSIENT' : 'see evidence'})`);

// ═══ E2 — the strength-driven TP edge ═══
console.log('');
if (!classifyZoneStrength) {
  console.log('E2: BLOCKED (ZR-3A TRANSIENT — classifyZoneStrength absent)');
  failures.push('E2: BLOCKED — classifyZoneStrength absent (ZR-3A TRANSIENT)');
} else {
  const eu = models['EUR/USD']!;
  const sd = eu.zones.filter(z => !z.id.startsWith('LMV|'));
  // Geometry-locate: STRONG = BoM OR lifecycle FORTRESS OR confluence ≥ 8;
  // WEAK = virgin MoM OR confluence ∈ (0,4) with zfp ≥ 40.
  const strongCand = sd.find(z => z.classification === 'BoM' || z.pressure?.lifecycle === 'FORTRESS' || z.confluence >= 8);
  const weakCand = sd.find(z => (z.classification === 'MoM' && z.pressure?.lifecycle === 'VIRGIN') || (z.confluence > 0 && z.confluence < 4 && z.zfp >= 40));
  const edgeRule = (z: ZoneModel, strength: string) => {
    // The TP approach: DEMAND ← SHORT from above (close=top, far=bottom);
    // SUPPLY ← LONG from below (close=bottom, far=top). Part 5.4 verbatim:
    // STRONG → close edge + 1-2p spread (the near-instant reaction);
    // WEAK → far edge (the delayed reaction — maximize the catch).
    const demand = z.type === 'DEMAND';
    const close = demand ? z.top : z.bottom;
    const far = demand ? z.bottom : z.top;
    const spread = 2 * PIP;
    const tp = strength === 'STRONG' ? (demand ? close + spread : close - spread) : far;
    return { close, far, tp };
  };
  let e2Ok = true;
  if (!strongCand) { console.log('E2: no STRONG candidate (BoM/FORTRESS/confluence≥8) in the EU model ✗'); e2Ok = false; }
  else {
    const s = classifyZoneStrength(strongCand);
    const e = edgeRule(strongCand, s);
    const why = strongCand.classification === 'BoM' ? 'BoM' : strongCand.pressure?.lifecycle === 'FORTRESS' ? 'FORTRESS' : `confluence ${strongCand.confluence}`;
    console.log(`E2 STRONG candidate ${strongCand.id} [${strongCand.bottom.toFixed(5)}-${strongCand.top.toFixed(5)}] (${why}) → classifyZoneStrength=${s} ${s === 'STRONG' ? '✓' : '✗'}`);
    console.log(`  edge rule: STRONG → close edge ${e.close.toFixed(5)} + 2p spread → TP ${e.tp.toFixed(5)} (far edge ${e.far.toFixed(5)} would leave money on the table)`);
    if (s !== 'STRONG') e2Ok = false;
  }
  if (!weakCand) {
    // HONEST FALLBACK — no WEAK zone exists: print the strength histogram.
    const hist: Record<string, number> = { STRONG: 0, MIDDLE: 0, WEAK: 0 };
    for (const z of sd) hist[classifyZoneStrength(z)] = (hist[classifyZoneStrength(z)] ?? 0) + 1;
    console.log(`E2: no WEAK candidate (virgin MoM / confluence∈(0,4)∧zfp≥40) — CONDITIONAL-PASS. Strength histogram (EU S/D zones): STRONG=${hist.STRONG} MIDDLE=${hist.MIDDLE} WEAK=${hist.WEAK}`);
  } else {
    const s = classifyZoneStrength(weakCand);
    const e = edgeRule(weakCand, s);
    const why = weakCand.classification === 'MoM' && weakCand.pressure?.lifecycle === 'VIRGIN' ? 'virgin MoM' : `confluence ${weakCand.confluence} ∧ zfp ${weakCand.zfp}`;
    console.log(`E2 WEAK candidate ${weakCand.id} [${weakCand.bottom.toFixed(5)}-${weakCand.top.toFixed(5)}] (${why}) → classifyZoneStrength=${s} ${s === 'WEAK' ? '✓' : '✗'}`);
    console.log(`  edge rule: WEAK → far edge ${e.far.toFixed(5)} → TP ${e.tp.toFixed(5)} (close edge ${e.close.toFixed(5)} would cut the sweep short)`);
    if (s !== 'WEAK') e2Ok = false;
  }
  if (!e2Ok) failures.push('E2: the strength-driven TP edge FAILED — the classifier disagreed with the geometry-located STRONG/WEAK candidates');
}

// ═══ E3 — the E2-projected TP resolution (the GU structural OB's internal LQZ) ═══
console.log('');
const e3 = (gu: ChartModel, label: string): { ob: ZoneModel | null; rung: LqzZoneMatrix | null } => {
  // Geometry-locate: a DEMAND OB zone with bottom ∈ [1.3330, 1.3340] and
  // top ∈ [1.3345, 1.3360] — never the hardcoded id.
  const obs = gu.zones.filter(z =>
    z.type === 'DEMAND' && !z.id.startsWith('LMV|') &&
    z.bottom >= 1.33300 && z.bottom <= 1.33400 &&
    z.top >= 1.33450 && z.top <= 1.33600);
  console.log(`E3${label}: ${obs.length} GU DEMAND OB candidates in the [1.3330-1.3340]×[1.3345-1.3360] band:`);
  for (const z of obs) console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${z.timeframe} ${z.classification} confluence=${z.confluence} zfp=${z.zfp} lifecycle=${z.pressure?.lifecycle ?? '—'}`);
  const ob = obs.find(z => z.timeframe === '4H' && z.classification === 'MoM') ?? obs[0] ?? null;
  if (!ob) { console.log(`E3${label}: the structural 4H MoM DEMAND OB does NOT resolve ✗`); return { ob: null, rung: null }; }
  // The internal LQZ resolution: BUY_SIDE rungs fully inside the OB band,
  // strongest first (zfp desc, center asc — deterministic). The NESTED
  // pressure links corroborate (the zone's own fuel map).
  const internal = gu.lmv.table
    .filter(r => r.side === 'BUY_SIDE' && r.bottom >= ob.bottom - 1e-9 && r.top <= ob.top + 1e-9)
    .sort((a, b) => b.zfp - a.zfp || a.center - b.center || a.bottom - b.bottom);
  const nestedLinks = (ob.pressure?.liquidity ?? []).filter(l => l.kind === 'NESTED');
  const rung = internal[0] ?? null;
  if (rung) {
    console.log(`  internal LQZ resolved: rung [${rung.bottom.toFixed(5)}-${rung.top.toFixed(5)}] center=${rung.center.toFixed(5)} defendedEdge=${rung.defendedEdge.toFixed(5)} zfp=${rung.zfp} (${internal.length} internal rung${internal.length === 1 ? '' : 's'}; golden reference 1.33347 — EVIDENCE ONLY)`);
  } else {
    console.log(`  internal LQZ: no LMV rung inside the band ✗ (NESTED links: ${nestedLinks.length})`);
  }
  for (const l of nestedLinks.slice(0, 3)) console.log(`  NESTED link ${l.rungId} eaten=${l.eaten} eatenAt=${iso(l.eatenAtMs)}`);
  return { ob, rung };
};
const e3r = e3(models['GBP/USD']!, '');
if (!e3r.ob) failures.push('E3: the GU 4H MoM DEMAND OB [1.33312-1.33516] region does NOT resolve in the model (the E2-projected TP zone is absent)');
else if (!e3r.rung) failures.push(`E3: the structural OB ${e3r.ob.id} carries NO resolvable internal LQZ (the strongestInternalLqzRung path is empty)`);

// ═══ E4 — THE D37 KILL: the E1-pressure wall classification + the walk ═══
console.log('');
const e4 = (gu: ChartModel, ob: ZoneModel | null, rung: LqzZoneMatrix | null, label: string): { ok: boolean; serialized: string } => {
  if (!isStructuralWall) {
    console.log(`E4${label}: BLOCKED (ZR-3A TRANSIENT — isStructuralWall absent)`);
    return { ok: false, serialized: 'BLOCKED' };
  }
  const ENTRY = 1.33965;   // the GU Mon mirror entry (the D37 geometry — printed reference)
  const SL = 1.33834;      // SL 13.1p (the D37 geometry — printed reference)
  // The DEMAND-side zones BETWEEN the entry and the structural floor — the
  // SHORT's walk path: strictly below the entry (top ≤ ENTRY), at/above the
  // floor (bottom ≥ 1.33300), and FORMED AS OF the Monday entry (a walk
  // from Monday 12:00Z cannot meet a zone born Wednesday — the D37 was the
  // Mon trade). Excluded zones print with their exclusion reason.
  const wide = gu.zones
    .filter(z => z.type === 'DEMAND' && z.top >= 1.33300 - 1e-9 && z.bottom <= ENTRY + 1e-9)
    .sort((a, b) => b.top - a.top || a.bottom - b.bottom || (a.id < b.id ? -1 : 1));
  const lane = wide.filter(z => z.top <= ENTRY + 1e-9 && z.bottom >= 1.33300 - 1e-9 && z.formationMs > 0 && z.formationMs <= MON_MS);
  const excluded = wide.filter(z => !lane.includes(z));
  console.log(`E4${label}: ${lane.length} DEMAND-side zones in the walk lane [1.33300, ${ENTRY.toFixed(5)}] formed as of the Mon entry (${excluded.length} excluded):`);
  for (const z of excluded) {
    const why = z.top > ENTRY + 1e-9 ? 'straddles/above the entry' : z.formationMs > MON_MS ? `formed ${iso(z.formationMs)} — AFTER the Mon entry` : 'below the floor';
    console.log(`  (excluded) ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] — ${why}`);
  }
  let laneOk = true;
  for (const z of lane) {
    const wall = isStructuralWall(z);
    const isBridge = z.id.startsWith('LMV|');
    const isOb = ob !== null && z.id === ob.id;
    // The assertion: LMV-bridge shelves (confluence 0) are PASS-THROUGH;
    // the structural OB is the WALL.
    let mark = '';
    if (isBridge && z.confluence === 0) { mark = wall ? ' ✗ shelf classified STRUCTURAL' : ' ✓ PASS-THROUGH'; if (wall) laneOk = false; }
    if (isOb) { mark = wall ? ' ✓ STRUCTURAL WALL' : ' ✗ the OB classified PASS-THROUGH'; if (!wall) laneOk = false; }
    console.log(`  ${z.id} [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}] ${isBridge ? 'LMV-bridge' : `${z.timeframe} ${z.classification}`} confluence=${z.confluence} zfp=${z.zfp} lifecycle=${z.pressure?.lifecycle ?? '—'} → isStructuralWall=${wall}${mark}`);
  }
  // The walk: from the entry SHORT, the first STRUCTURAL wall reached.
  const firstWall = lane.find(z => isStructuralWall(z));
  const wallIsOb = ob !== null && firstWall !== undefined && firstWall.id === ob.id;
  console.log(`  walk: first STRUCTURAL wall from E ${ENTRY.toFixed(5)} SHORT → ${firstWall ? `${firstWall.id} [${firstWall.bottom.toFixed(5)}-${firstWall.top.toFixed(5)}]` : 'NONE'} ${wallIsOb ? '✓ the structural OB (never the 1.33720 shelf)' : '✗ NOT the OB'}`);
  // The implied TP: the wall's internal LQZ defendedEdge (the E3
  // resolution), else the strength-driven edge of the wall itself.
  let tp: number | null = null;
  let tpSrc = '';
  if (firstWall) {
    if (rung && wallIsOb) { tp = rung.defendedEdge; tpSrc = `the wall's internal LQZ defendedEdge ${rung.defendedEdge.toFixed(5)}`; }
    else if (classifyZoneStrength) {
      const s = classifyZoneStrength(firstWall);
      tp = s === 'STRONG' ? firstWall.top + 2 * PIP : firstWall.bottom;
      tpSrc = `the strength-driven edge (${s} → ${s === 'STRONG' ? 'close+spread' : 'far'})`;
    }
  }
  if (tp === null) {
    console.log('  implied TP: unresolvable ✗');
    return { ok: false, serialized: 'TP-UNRESOLVED' };
  }
  const rrr = (ENTRY - tp) / (ENTRY - SL);
  const rrrOk = rrr >= 3.0 - 1e-9;
  console.log(`  implied TP ${tp.toFixed(5)} (${tpSrc}) · SL 13.1p → RRR ${rrr.toFixed(2)} ${rrrOk ? '✓ ≥ 3.0' : '✗ < 3.0'} (golden geometry reference: TP ≈ 1.33347 → RRR 4.7 — EVIDENCE ONLY)`);
  const ok = laneOk && wallIsOb && rrrOk;
  return { ok, serialized: JSON.stringify({ firstWall: firstWall?.id ?? null, tp, rrr }) };
};
const e4r = e4(models['GBP/USD']!, e3r.ob, e3r.rung, '');
if (!e4r.ok) failures.push(`E4: THE D37 KILL FAILED — ${e4r.serialized === 'BLOCKED' ? 'ZR-3A TRANSIENT' : 'the walk did not reach the structural OB with RRR ≥ 3.0 (see evidence)'}`);

// ═══ E5 — the per-anchor state machine (the refinement engine) ═══
console.log('');
{
  const gu = models['GBP/USD']!;
  // The D37 geometry: E 1.33965 / SL 1.33834 / TP 1.33720 — RRR 1.9 < 3.0.
  const ENTRY = 1.33965, SL = 1.33834, TP = 1.33720;
  // Geometry-locate the entry anchor: the SUPPLY zone containing the entry.
  const anchor = gu.zones.find(z => z.type === 'SUPPLY' && !z.id.startsWith('LMV|') && z.bottom <= ENTRY && z.top >= ENTRY)
    ?? gu.zones.filter(z => z.type === 'SUPPLY' && z.bottom <= ENTRY).sort((a, b) => b.top - a.top)[0]
    ?? null;
  if (!anchor) {
    console.log('E5: no GU SUPPLY anchor at/below 1.33965 — cannot construct the synthetic RefineInput ✗');
    failures.push('E5: the GU entry anchor for the D37 geometry does not resolve');
  } else {
    // The shapeDay projecting the structural demand (the E2 designation).
    const shapeDay: ShapeDayZone = {
      dayIdx: 0, day: '2026-07-06', shape: 'SYNTHETIC-D37-REPLAY', direction: 'SHORT',
      keyZoneId: e3r.ob?.id ?? null, keyZonePrice: e3r.ob ? (e3r.ob.bottom + e3r.ob.top) / 2 : null,
      supplyZonePrice: ENTRY, demandZonePrice: e3r.ob ? (e3r.ob.bottom + e3r.ob.top) / 2 : null,
      floor: e3r.ob?.bottom ?? null, ceiling: ENTRY, confidence: 1,
      supplyZoneId: anchor.id, demandZoneId: e3r.ob?.id ?? null,
    };
    const input: RefineInput = {
      entry: ENTRY, sl: SL, tp: TP,
      direction: 'SHORT', pair: 'GBP/USD', pipValue: PIP, categoryFloor: 3.0,
      targetModel: gu, shapeDay,
      anchor,
      entryZone: { defendedEdge: ENTRY, floor: anchor.bottom, ceiling: anchor.top },
      slLmv: computeSL_LMV,
      probeAtAnchor: () => null, // the synthetic replay carries no week probe
      anchorZoneId: anchor.id,   // ZR-3B: the E1 operative-defense lookup
    };
    const res = refineSetup(input) as any;
    console.log(`E5: refineSetup on the D37 geometry (E ${ENTRY} / SL ${SL} / TP ${TP} — RRR ${(Math.abs(TP - ENTRY) / Math.abs(ENTRY - SL)).toFixed(2)}) via anchor ${anchor.id}:`);
    console.log(`  annotation: ${res.annotation}`);
    console.log('  audit trail:');
    for (const a of res.attempts ?? []) {
      console.log(`    #${a.attempt}: E ${a.entry.toFixed(5)} SL ${a.sl.toFixed(5)} TP ${a.tp.toFixed(5)} RRR ${a.rrr.toFixed(2)} — ${a.reason}${a.action ? ` → ${a.action}` : ''}`);
    }
    // The ZR-3B contract: the per-anchor tracks (E/SL/TP — attempts +
    // locked + best + history) and the rejection contexts (WHY + HOW).
    const tracks = res.tracks ?? res.anchorTracks ?? res.anchorState ?? res.state;
    const trackOf = (k1: string, k2: string) => tracks?.[k1] ?? tracks?.[k2];
    const tE = trackOf('E', 'entry'), tSL = trackOf('SL', 'sl'), tTP = trackOf('TP', 'tp');
    const trackOk = (t: any) => t && typeof t.attempts === 'number' && typeof t.locked === 'boolean';
    const tracksOk = trackOk(tE) && trackOk(tSL) && trackOk(tTP);
    if (tracksOk) {
      console.log(`  per-anchor tracks: E attempts=${tE.attempts} locked=${tE.locked} · SL attempts=${tSL.attempts} locked=${tSL.locked} · TP attempts=${tTP.attempts} locked=${tTP.locked} ✓`);
    } else {
      console.log(`  per-anchor tracks: ABSENT (ZR-3B TRANSIENT — the result exposes [${Object.keys(res).join(', ')}]; the contract wants E/SL/TP tracks with attempts + locked) ✗`);
    }
    const rejection = res.rejection ?? res.rejectionContext ??
      (Array.isArray(res.rejections) && res.rejections.length > 0 ? res.rejections[0] : null);
    const rejectionOk = rejection && typeof rejection.why === 'string' && rejection.why.length > 0 && typeof rejection.how === 'string' && rejection.how.length > 0;
    if (Array.isArray(res.rejections)) {
      console.log(`  rejection contexts (${res.rejections.length}):`);
      for (const r of res.rejections.slice(0, 6)) console.log(`    [${r.anchor}] WHY: ${r.why} · HOW: ${r.how}`);
    }
    const repaired = res.setup !== null && res.setup !== undefined && res.setup.rrr >= 3.0 - 1e-9;
    if (repaired) console.log(`  repaired: E ${res.setup.entry.toFixed(5)} SL ${res.setup.sl.toFixed(5)} TP ${res.setup.tp.toFixed(5)} RRR ${res.setup.rrr.toFixed(2)} ≥ 3.0 ✓ (slMethod=${res.setup.slMethod})`);
    else if (res.setup == null) console.log(`  hard-reject: RejectionContext ${rejectionOk ? `why="${rejection.why}" how="${rejection.how}" ✓` : 'ABSENT or empty why/how ✗'}`);
    if (!tracksOk || (!repaired && !rejectionOk)) {
      failures.push(`E5: the per-anchor state machine FAILED — tracks ${tracksOk ? '✓' : '✗ (ZR-3B TRANSIENT)'} · ${repaired ? 'repaired ✓' : rejectionOk ? 'rejection-context ✓' : 'neither repaired nor contextual rejection ✗'}`);
    }
  }
}

// ═══ E6 — determinism (the models built twice; E1/E4 serialize identically) ═══
console.log('');
if (!computeLadderStepsSL || !isStructuralWall) {
  console.log('E6: BLOCKED (ZR-3A TRANSIENT — the E1/E4 computations need computeLadderStepsSL + isStructuralWall)');
  failures.push('E6: BLOCKED — ZR-3A TRANSIENT');
} else {
  const e1t = e1(models2['EUR/USD']!, ' (twin)');
  const e3t = e3(models2['GBP/USD']!, ' (twin)');
  const e4t = e4(models2['GBP/USD']!, e3t.ob, e3t.rung, ' (twin)');
  const e6Ok = e1r.serialized === e1t.serialized && e4r.serialized === e4t.serialized;
  console.log(`E6: E1 twin match ${e1r.serialized === e1t.serialized ? '✓' : '✗'} · E4 twin match ${e4r.serialized === e4t.serialized ? '✓' : '✗'}`);
  if (!e6Ok) failures.push('E6: determinism mismatch — the E1/E4 computed values differ across two builds of the same fixture');
}

// ═══ VERDICT ═══
console.log('');
if (failures.length === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
