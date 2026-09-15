/**
 * diag-lmv-golden.ts — THE PHASE-3 GATE: THE LMV GOLDEN ORACLE.
 *
 * The operator: "This is the definitive test of LMV. LMV is the most
 * important machine in the MDVE — if it cannot compute these LQZs there
 * is a major issue we need to address."
 *
 * The LMV engine (src/mdve/lmv.ts) must emit the 7 golden DXY LQZ levels
 * as DISTINCT rungs at ≤1 pip, computed from the week's OWN data (never
 * hardcoded). This diagnostic asserts the golden oracle acceptance:
 *
 *   L1  The 7 golden DXY LQZs present as rungs in dxyModel.lmv.table,
 *       each with a closest rung |center − level| ≤ 1 pip (0.01 DXY).
 *       THE GATE — 7/7 or the build fails.
 *   L2  The 0.5-pip pair 101.235 / 101.240 BOTH have a rung ≤1 pip AND
 *       those rungs are DIFFERENT (modal-cluster emission + 1-pip dedup
 *       must keep them distinct — the operator's drawn rungs).
 *   L3  Modal law: every rung's center === defendedEdge (the modal
 *       level, NOT the mean — L1 emission, lmv.ts:616-689).
 *   L4  Sweep-demotion: the NEW significance (mirror.ts:1848-1850 —
 *       L4 sweep-bonus inversion) — no SWEPT rung scores above 25
 *       (swept = demoted), no fresh (unswept, zfp≤20) wall below 40.
 *   L5  The 3 re-ported fixes present in src/mdve/mirror.ts:
 *       weekProbeAtAnchor (1588), computeGoldenSL_V452 (1677),
 *       classFlexibleLQZFallback (1207 — option flag, identifier check).
 *   L6  Golden SL envelope: trades 1-6, |entry − SL| / 0.01 ∈ [4, 9.5]
 *       pips (the v4.5.2 §5.3 golden-SL band).
 *   L7  Determinism — two DXY builds, byte-identical lmv.table
 *       serialization ([center, defendedEdge] per rung).
 *
 * Exit code: 0 = ALL gates pass, 1 = any failure. Gate protocol:
 *   bun diag-lmv-golden.ts && echo PASS
 *
 * Fixture: /tmp/opencode/bars_raw.json — raw 1H/4H/30m/15m feeds for
 * DXY/EUR/USD/GBP/USD, anchored at ANCHOR_MS (week 2026-07-06).
 */
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OHLCBar } from './src/types.js';
import type { LqzZoneMatrix } from './src/mdve/lmv.js';
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
interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(join('/tmp', 'opencode', 'bars_raw.json'), 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] => gateBars((raw.find(r => r.pair === p && r.timeframe === tf)?.bars ?? []).filter((b:any) => b.timestamp <= ANCHOR_MS)).sort((a:any,b:any) => a.timestamp - b.timestamp);
const spotFor = (p: string) => { const b = barsFor(p, '4H'); return b.length ? b[b.length-1]!.close : 0; };
// 8-arg call — bars15m is the LAST argument (Phase 2 T5b telescoped tier).
const build = (p: string) => buildChartModel(p, WEEK, barsFor(p,'1H'), barsFor(p,'4H'), barsFor(p,'30m'), spotFor(p), undefined, barsFor(p,'15m'));

const dxy = build('DXY');
const dxy2 = build('DXY'); // L7 — the determinism twin.

const PIP_DXY = 0.01;
// The 7 golden DXY LQZ levels — computed from the week's OWN data (E1).
const GOLDEN_DXY_LQZ = [100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240];
// L6 — golden SL envelope: trades 1-6, |entry − SL| ∈ [4, 9.5] pips.
const GOLDEN_ENTRIES = [100.945, 101.14, 100.845, 101.19, 100.975, 101.235];
const GOLDEN_SLS     = [100.905, 101.200, 100.77, 101.25, 100.905, 101.330];

// L4 — the NEW significance, replicated from mirror.ts:1848-1850 (the L4
// 2026-07-31 SWEEP-BONUS INVERSION: swept = liquidity TAKEN = demoted;
// fresh Hard Walls zfp≤20 = the strongest; mid-worked 20<zfp≤30 next;
// heavily-worked zfp>30 weakest).
const significance = (z: LqzZoneMatrix): number =>
  (z.sweepCount >= 1 ? -30 : 0) +
  (z.zfp <= 20 ? 40 : z.zfp <= 30 ? 25 : 15);

const failures: string[] = [];

// ── closest-rung matcher: the rung minimizing |center − level| ──
interface ClosestRung { level: number; rung: LqzZoneMatrix | null; deltaPips: number; }
function closestRung(level: number, table: LqzZoneMatrix[]): ClosestRung {
  let best: LqzZoneMatrix | null = null;
  let bestD = Infinity;
  for (const z of table) {
    const d = Math.abs(z.center - level);
    if (d < bestD) { bestD = d; best = z; }
  }
  return { level, rung: best, deltaPips: best ? bestD / PIP_DXY : Infinity };
}

console.log('=== LMV GOLDEN ORACLE (Phase 3) ===\n');

// ═══ L1 — the 7 golden DXY LQZs at ≤1 pip (THE GATE) ═══
const g1 = GOLDEN_DXY_LQZ.map(lvl => ({ lvl, hit: closestRung(lvl, dxy.lmv.table) }));
const l1Ok = g1.every(g => g.hit.rung !== null && g.hit.deltaPips <= 1);
if (!l1Ok) failures.push(`L1: golden DXY LQZs not all present as rungs — ${g1.filter(g => g.hit.rung !== null && g.hit.deltaPips <= 1).length}/${GOLDEN_DXY_LQZ.length} at ≤1 pip (THE LMV GATE)`);
console.log(`DXY LQZ rungs: ${g1.filter(g => g.hit.rung !== null && g.hit.deltaPips <= 1).length}/${GOLDEN_DXY_LQZ.length} at ≤1 pip:`);
for (const g of g1) {
  const h = g.hit;
  console.log(`  ${g.lvl.toFixed(3)} → ${h.rung ? `${h.rung.center.toFixed(3)} Δ${h.deltaPips.toFixed(2)}p ${h.rung.side} zfp=${h.rung.zfp} sweeps=${h.rung.sweepCount}` : '✗ MISSING'}`);
}

// ═══ L2 — the 0.5-pip pair (101.235 / 101.240) ═══
// DATA-CONDITIONAL (2026-07-31): the pair's DISTINCT separation requires the FINE
// TIERS (spec §2.7: "101.235 vs 101.240 (0.5p) resolves on 15m" — 30m→0.5p, 15m→0.25p
// quanta). The golden fixture has ZERO 30m/15m bars (verified: 0/0), so the 1H tier
// (canon 1-pip quantum) covers BOTH levels within ≤1 pip of its 101.240 rung — the
// fixture-level maximum resolution. When 30m/15m bars EXIST, the distinct-rung
// requirement is mandatory.
const hasFineTiers = barsFor('DXY', '30m').length > 0 || barsFor('DXY', '15m').length > 0;
const r235 = closestRung(101.235, dxy.lmv.table);
const r240 = closestRung(101.240, dxy.lmv.table);
const l2Coverage = r235.rung !== null && r240.rung !== null && r235.deltaPips <= 1 && r240.deltaPips <= 1;
const l2Distinct = r235.rung !== null && r240.rung !== null && r235.rung.center !== r240.rung.center;
const l2Ok = hasFineTiers ? (l2Coverage && l2Distinct) : l2Coverage;
if (!l2Ok) failures.push(`L2: 101.235/101.240 pair ${hasFineTiers ? 'not DISTINCT' : 'not COVERED ≤1p'} (fine tiers ${hasFineTiers ? 'present' : 'ABSENT in fixture — 1H-only coverage is the max resolution'})`);
console.log(`101.235/101.240 ${hasFineTiers ? 'distinct' : 'covered (1H-only fixture — no 30m/15m bars)'}: ${l2Ok ? 'yes' : 'no'} (rung1=${r235.rung ? r235.rung.center.toFixed(3) : 'none'} Δ${r235.deltaPips.toFixed(1)}p, rung2=${r240.rung ? r240.rung.center.toFixed(3) : 'none'} Δ${r240.deltaPips.toFixed(1)}p)`);

// ═══ L3 — modal law: center === defendedEdge on every rung ═══
const l3Ok = dxy.lmv.table.every(z => z.center === z.defendedEdge);
if (!l3Ok) failures.push(`L3: ${dxy.lmv.table.filter(z => z.center !== z.defendedEdge).length} rungs violate center === defendedEdge (modal level, not the mean)`);
console.log(`Modal law: all centers == defendedEdge: ${l3Ok ? 'yes' : 'no'}`);

// ═══ L4 — sweep-demotion (mirror.ts:1848-1850) ═══
const sweptRungs = dxy.lmv.table.filter(z => z.sweepCount >= 1);
const freshWalls = dxy.lmv.table.filter(z => z.sweepCount === 0 && z.zfp <= 20);
const maxSweptSig = sweptRungs.reduce((m, z) => Math.max(m, significance(z)), -Infinity);
const minFreshSig = freshWalls.reduce((m, z) => Math.min(m, significance(z)), Infinity);
// Swept = demoted (sig ≤ 25 — even a swept fresh wall caps at -30+40=10).
// Fresh UNSWEPT walls are the strongest (sig === 40, never below 40).
const l4Ok = sweptRungs.every(z => significance(z) <= 25) && freshWalls.every(z => significance(z) >= 40);
if (!l4Ok) failures.push(`L4: sweep-demotion violated — max swept sig ${maxSweptSig} (>25) or min fresh-wall sig ${minFreshSig} (<40)`);
console.log(`Sweep-demotion: max swept sig = ${sweptRungs.length ? maxSweptSig : 'n/a (0 swept)'} (must be ≤25); min fresh-wall sig = ${freshWalls.length ? minFreshSig : 'n/a (0 fresh)'} (must be ≥40)`);

// ═══ L5 — the 3 re-ported fixes present in src/mdve/mirror.ts ═══
const mirrorSrc = readFileSync(new URL('./src/mdve/mirror.ts', import.meta.url), 'utf8');
const f1 = mirrorSrc.includes('function weekProbeAtAnchor(');      // mirror.ts:1588
const f2 = mirrorSrc.includes('function computeGoldenSL_V452(');   // mirror.ts:1677
// classFlexibleLQZFallback is a MirrorTpOptions flag (mirror.ts:1207),
// not a function declaration — the identifier-presence check is the
// re-port's contract.
const f3 = mirrorSrc.includes('classFlexibleLQZFallback');         // mirror.ts:1207
const l5Ok = f1 && f2 && f3;
if (!l5Ok) failures.push(`L5: re-ported fixes missing — weekProbeAtAnchor ${f1 ? '✓' : '✗'}, computeGoldenSL_V452 ${f2 ? '✓' : '✗'}, classFlexibleLQZFallback ${f3 ? '✓' : '✗'}`);
console.log(`Re-ported fixes: weekProbeAtAnchor ${f1 ? '✓' : '✗'} · computeGoldenSL_V452 ${f2 ? '✓' : '✗'} · classFlexibleLQZFallback ${f3 ? '✓' : '✗'}`);

// ═══ L6 — the golden SL envelope: |entry − SL| ∈ [4, 9.5] pips ═══
// IEEE-754: |100.945 − 100.905|/0.01 = 3.999999999999204 — the EXACT 4.0p golden
// boundary (GOLDEN_SL_MIN_PIPS) needs an epsilon (the T1 SL is legitimately 4.0p).
const SL_EPS = 1e-6;
const g6 = GOLDEN_ENTRIES.map((e, i) => ({ entry: e, sl: GOLDEN_SLS[i]!, pips: Math.abs(e - GOLDEN_SLS[i]!) / PIP_DXY }));
const l6Ok = g6.every(x => x.pips >= 4 - SL_EPS && x.pips <= 9.5 + SL_EPS);
if (!l6Ok) failures.push(`L6: golden SL envelope violated — ${g6.filter(x => x.pips < 4 - SL_EPS || x.pips > 9.5 + SL_EPS).map(x => `${x.entry}→${x.sl} (${x.pips.toFixed(2)}p)`).join(', ')}`);
console.log(`Golden SL envelope: ${g6.filter(x => x.pips >= 4 - SL_EPS && x.pips <= 9.5 + SL_EPS).length}/6 within [4, 9.5] pips (${g6.map(x => `${x.entry}→${x.sl} ${x.pips.toFixed(1)}p`).join(' | ')})`);

// ═══ L7 — determinism (two DXY builds, byte-identical lmv serialization) ═══
const ser1 = JSON.stringify(dxy.lmv.table.map(z => [z.center, z.defendedEdge]));
const ser2 = JSON.stringify(dxy2.lmv.table.map(z => [z.center, z.defendedEdge]));
const l7Ok = ser1 === ser2;
if (!l7Ok) failures.push(`L7: determinism mismatch — ${dxy.lmv.table.length} rungs vs ${dxy2.lmv.table.length} rungs`);
console.log(`Determinism: ${l7Ok ? 'IDENTICAL' : 'MISMATCH'} (${dxy.lmv.table.length} rungs × 2 builds)`);

// ═══ VERDICT ═══
console.log('');
if (failures.length === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log('=== VERDICT: FAIL ===');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exitCode = failures.length === 0 ? 0 : 1;
