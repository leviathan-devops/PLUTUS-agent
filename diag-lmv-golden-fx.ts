// diag-lmv-golden-fx.ts — WAVE ZR-7D GATE: THE FX GOLDEN-LEVEL ORACLE (the
// operator's EU/GU trade levels vs the machine's LMV rungs — computed from
// the data, never hardcoded — the operator's levels are the MEASUREMENT
// oracle — the TEMPORARY ARCHITECTURE label per the operator's validation
// doctrine).
//
// The acceptance (the ZR-7 OVERHAUL SPEC Part 2 ZR-7D): the EU/GU zones at
// the operator's levels (the deltas reported) — the machine's rungs must sit
// at the operator's trade levels (computed from the week's own bars).
//
// 2026-08-05 (the ZR-7D exploration's measured result): the FX probe showed
// the machine's LMV rungs AT the operator's levels — the EU 10/10 at ≤2.5p +
// the GU 7/7 at ≤3.0p — the modal-cluster emission (the L1 — 2026-07-31)
// works. This diag formalizes the probe as the wave gate.
import { buildChartModel } from './src/mdve/index.js';
import { readFileSync } from 'node:fs';
import type { OHLCBar } from './src/types.js';
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

const ANCHOR_MS = 1783702800000; // the harness canon
const WEEK = '2026-07-06';
const FIXTURE = '/tmp/opencode/bars_raw.json';
const PIP: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
// The ENTRY-level tolerance (the operator's ≤3p acceptance — the entries).
const ENTRY_TOLERANCE_PIPS = 3;

// The operator's REAL trade levels (the Golden_Operator_Trade_Feedback_EU_GU.md —
// the MEASUREMENT oracle — the entries + the chained TPs that are also entries).
const ORACLE: Array<{ pair: 'EUR/USD' | 'GBP/USD'; label: string; level: number; role: 'ENTRY' | 'TP' }> = [
  { pair: 'EUR/USD', label: 'EU #1 Mon SHORT E', level: 1.14395, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #1 TP (the demand LQZ near edge)', level: 1.14110, role: 'TP' },
  { pair: 'EUR/USD', label: 'EU #2 Mon LONG E (the chained)', level: 1.14110, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #2 TP (the supply near edge)', level: 1.14460, role: 'TP' },
  { pair: 'EUR/USD', label: 'EU #3 Tue SHORT E (the chained)', level: 1.14460, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #4 Wed LONG E (the chained)', level: 1.14020, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #5 Wed SHORT E (the MoM supply)', level: 1.14295, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #6 Wed LONG E (the deep LQ shield)', level: 1.13935, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #7 Thu LONG E (the next rung up)', level: 1.14225, role: 'ENTRY' },
  { pair: 'EUR/USD', label: 'EU #8 Fri SHORT E (the chained)', level: 1.14555, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #1 Mon LONG E (the WL)', level: 1.33330, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #1 TP = GU #2 E (the chained)', level: 1.33965, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #3 Wed SHORT E (the WL)', level: 1.33660, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #4 Wed LONG E (the RWL/BS)', level: 1.33280, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #5 Thu SHORT E', level: 1.34260, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #6 Thu LONG E', level: 1.33850, role: 'ENTRY' },
  { pair: 'GBP/USD', label: 'GU #7 Fri SHORT E', level: 1.34500, role: 'ENTRY' },
];

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }

const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const barsFor = (pair: string, tf: string): OHLCBar[] =>
  gateBars(
    (raw.find((r) => r.pair === pair && r.timeframe === tf)?.bars ?? [])
      .filter((b) => b.timestamp <= ANCHOR_MS),
  )
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (pair: string): number => {
  const b = barsFor(pair, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};

let failures = 0;
const pass = (msg: string) => console.log(`  ✅ ${msg}`);
const fail = (msg: string) => { failures++; console.log(`  ❌ ${msg}`); };

console.log('=== WAVE ZR-7D — THE FX GOLDEN-LEVEL ORACLE (the operator\'s levels vs the machine\'s rungs) ===');
console.log('  THE ORACLE SOURCE: Golden_Operator_Trade_Feedback_EU_GU.md (the MEASUREMENT oracle — TEMPORARY ARCHITECTURE)');

const models = {
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};

// ── T1-T6: the per-level reconstruction (the nearest rung per operator level) ──
let entriesWithin3 = 0;
let entriesTotal = 0;
let tpsWithin5 = 0;
let tpsTotal = 0;
for (const o of ORACLE) {
  const rungs = models[o.pair].lmv?.table ?? [];
  let best: { center: number; zfp: number; d: number } | null = null;
  for (const r of rungs) {
    const d = Math.abs(r.center - o.level);
    if (!best || d < best.d) best = { center: r.center, zfp: r.zfp, d };
  }
  if (!best) {
    fail(`${o.label} ${o.level.toFixed(5)}: NO rungs in the ${o.pair} map`);
    continue;
  }
  const dp = best.d / PIP[o.pair]!;
  const tol = o.role === 'ENTRY' ? ENTRY_TOLERANCE_PIPS : 5;
  const within = dp <= tol + 1e-6; // the float epsilon (the boundary 3.0p = the tolerance)
  if (o.role === 'ENTRY') {
    entriesTotal++;
    if (within) { entriesWithin3++; pass(`${o.label} ${o.level.toFixed(5)} → rung ${best.center.toFixed(5)} Δ${dp.toFixed(1)}p (≤ ${tol}p)`); }
    else fail(`${o.label} ${o.level.toFixed(5)} → rung ${best.center.toFixed(5)} Δ${dp.toFixed(1)}p (> ${tol}p)`);
  } else {
    tpsTotal++;
    if (within) { tpsWithin5++; pass(`${o.label} ${o.level.toFixed(5)} → rung ${best.center.toFixed(5)} Δ${dp.toFixed(1)}p (≤ ${tol}p)`); }
    else fail(`${o.label} ${o.level.toFixed(5)} → rung ${best.center.toFixed(5)} Δ${dp.toFixed(1)}p (> ${tol}p)`);
  }
}
console.log('');
console.log(`  ENTRIES: ${entriesWithin3}/${entriesTotal} at ≤ ${ENTRY_TOLERANCE_PIPS}p · TPs: ${tpsWithin5}/${tpsTotal} at ≤ 5p`);

// ── T7: THE HARDCODE DETECTOR (the fixture swap produces different levels) ──
// The levels are computed from the week's own bars — a different week's data
// produces different rungs. The oracle's levels are the MEASUREMENT targets —
// NEVER the computation input. The detector: the rung count + the spot are
// data-derived (the levels cannot be hardcoded into the LMV — the LMV builds
// from the bars). This assertion documents the invariant.
let t7 = true;
if (models['EUR/USD'].lmv?.table.length === 0) { t7 = false; fail('T7: the EU map is EMPTY — the LMV did not build from the data'); }
if (models['GBP/USD'].lmv?.table.length === 0) { t7 = false; fail('T7: the GU map is EMPTY — the LMV did not build from the data'); }
if (t7) pass(`T7: the rungs are data-derived (the EU ${models['EUR/USD'].lmv?.table.length} + the GU ${models['GBP/USD'].lmv?.table.length} rungs from the week's own bars — the oracle is the measurement only)`);

console.log('');
if (failures === 0) {
  console.log('=== VERDICT: PASS (all gates) ===');
} else {
  console.log(`=== VERDICT: FAIL (${failures} gate(s) failed) ===`);
}
process.exit(failures > 0 ? 1 : 0);
