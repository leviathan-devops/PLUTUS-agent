/**
 * VERIFY-ACCURATE-STATS — the PKG-REPORT acceptance harness (PLUTUS v4.5.2,
 * spec §6 + §7 + §10). Runs entirely on the independent audit's ORACLE
 * (Visual_Evals/v4.5.1/INDEPENDENT_AUDIT_v452.md §1) — the 13 unique trades,
 * transcribed below as a typed fixture.
 *
 * FIXTURE PROVENANCE / CROSS-CHECK METHOD:
 *   - Every trade's pair/dir/entry/SL/TP + trigger/exit timestamps + outcome
 *     are transcribed verbatim from the audit's per-pair tables (DXY §1 rows
 *     1-7, EU §1 rows 1-5, GU §1 row 1).
 *   - Staggered legs: the audit lists merged headline entries only. Legs are
 *     reconstructed symmetric around the audit headline entry (within the
 *     3-pip anchor tolerance) so the blended entry (spec §3.2) EQUALS the
 *     audit's headline entry to ≥5 decimals — the audit's per-trade R then
 *     reproduces to the cent. GU's 10 legs are all 1.34337 (the audit: the
 *     10 rows are byte-identical).
 *   - Every per-trade realized R is asserted against the audit's R ±0.01R
 *     (assertion block B below) BEFORE any aggregate is trusted.
 *
 * Assertions:
 *   A. Oracle stats: 13 unique, 11W/2L, 84.6% WR, +31.23R; per-pair DXY 7
 *      (6W/1L, 85.7%, +22.32R), EU 5 (4W/1L, 80.0%, +7.06R), GU 1 (1W/0L, +1.85R).
 *   B. Per-trade realized R = audit R ±0.01 (13 trades).
 *   C. STALE bucket: exactly 7 resolved_in_week=false, exactly 2
 *      triggered_in_week=false (EU1 "Fri"→Jul 14, EU5 "Fri"→Jul 13); the
 *      weekly headline (fully in-week) excludes all 7; the §7.2 operator
 *      default (in-week-triggered) excludes the 2.
 *   D. Mandatory fields (§6.3) on every output trade — no undefined.
 *   E. Session-label honesty (§7.3): the "Monday London Open" → 14:00 ET lie
 *      is corrected; genuine in-window London fills are kept; missing labels
 *      are UNVERIFIED.
 *   F. SL_vs_ENTRY dedup (§6.4): the embellished 30-win-row vote list
 *      (SL_vs_ENTRY_ANALYSIS.md: SL TOO WIDE=25) dedups to 11 unique win
 *      votes with the GU ×10 → 1 collapse; the full 36-row list dedups to 13.
 *   G. Determinism: the report JSON is byte-identical across two runs.
 */

import {
  computeAccurateStats,
  dedupSLvsEntry,
  sessionLabelHonesty,
  type SLvsEntryVoteRow,
  type UniqueTradeInput,
} from './src/report/accurate-stats.js';

// ─── assertion framework ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string, detail = ''): void {
  if (cond) { passed++; console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`); }
  else { failed++; console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}
function approx(a: number, b: number, tol: number): boolean { return Math.abs(a - b) <= tol; }

// ─── time helpers (all UTC; Jul 2026 = EDT = UTC-4 = ET_UTC_OFFSET) ────────

const T = (day: number, hourUTC: number): number => Date.UTC(2026, 6, day, hourUTC);
const W = [0.33, 0.33, 0.34];
const legs = (entries: number[], sessions: string[]) =>
  entries.map((entry, i) => ({ leg: `E${i + 1}`, entry, weight: W[i] ?? 0.34, session: sessions[i] }));

// ─── THE 13-TRADE ORACLE FIXTURE (from INDEPENDENT_AUDIT_v452.md §1) ───────

const EVAL_WEEK = { start: '2026-07-06', end: '2026-07-10' };

const FIXTURE: UniqueTradeInput[] = [
  // ── DXY (7 unique) — audit §1 DXY table ──
  { // DXY#1 Mon — the "Monday London Open" filled at 14:00 ET lie (audit §2.7)
    trade_id: 'DXY|LONG|3362|2026-07-06', pair: 'DXY', direction: 'LONG', day: '2026-07-06',
    intendedSession: 'Monday London Open',
    entry: 100.869, sl: 100.811, tp: 101.207,
    is_staggered: false, staggeredEntries: [],
    triggerMs: T(6, 18), exitMs: T(7, 1), exitPrice: 100.811, outcome: 'LOSS',
    provenance: ['DXY-Mon-LO-row1'],
  },
  { // DXY#2 Tue (LO+LM rows merge)
    trade_id: 'DXY|LONG|3362|2026-07-07', pair: 'DXY', direction: 'LONG', day: '2026-07-07',
    intendedSession: 'Tuesday London Open',
    entry: 100.869, sl: 100.811, tp: 101.207,
    is_staggered: true, staggeredEntries: legs([100.868, 100.870], ['London Open', 'London Mid']),
    triggerMs: T(7, 12), exitMs: T(8, 1), exitPrice: 101.207, outcome: 'WIN',
    provenance: ['DXY-Tue-LO-row1', 'DXY-Tue-LM-row2'],
  },
  { // DXY#3 Tue (LM+NY rows merge)
    trade_id: 'DXY|LONG|3364|2026-07-07', pair: 'DXY', direction: 'LONG', day: '2026-07-07',
    intendedSession: 'Tuesday London Mid',
    entry: 100.921, sl: 100.835, tp: 101.207,
    is_staggered: true, staggeredEntries: legs([100.920, 100.922], ['London Mid', 'NY Overlap']),
    triggerMs: T(7, 10), exitMs: T(8, 1), exitPrice: 101.207, outcome: 'WIN',
    provenance: ['DXY-Tue-LM-row3', 'DXY-Tue-NY-row4'],
  },
  { // DXY#4 Wed SHORT 101.210
    trade_id: 'DXY|SHORT|3374|2026-07-08', pair: 'DXY', direction: 'SHORT', day: '2026-07-08',
    intendedSession: 'Wednesday London Mid',
    entry: 101.210, sl: 101.276, tp: 100.901,
    is_staggered: false, staggeredEntries: [],
    triggerMs: T(8, 9), exitMs: T(9, 6), exitPrice: 100.901, outcome: 'WIN',
    provenance: ['DXY-Wed-LM-row5'],
  },
  { // DXY#5 Wed (LO+LM+NY rows merge — the phantom-loss trade, audit §2.5)
    trade_id: 'DXY|LONG|3366|2026-07-08', pair: 'DXY', direction: 'LONG', day: '2026-07-08',
    intendedSession: 'Wednesday London Open',
    entry: 100.977, sl: 100.900, tp: 101.207,
    is_staggered: true, staggeredEntries: legs([100.976, 100.977, 100.978], ['London Open', 'London Mid', 'NY Overlap']),
    triggerMs: T(8, 7), exitMs: T(8, 9), exitPrice: 101.207, outcome: 'WIN',
    provenance: ['DXY-Wed-LO-row6', 'DXY-Wed-LM-row8', 'DXY-Wed-NY-row11'],
  },
  { // DXY#6 Wed SHORT 101.236 (LM+NY rows merge; TP variants → wall-refined 100.901)
    trade_id: 'DXY|SHORT|3375|2026-07-08', pair: 'DXY', direction: 'SHORT', day: '2026-07-08',
    intendedSession: 'Wednesday London Mid',
    entry: 101.236, sl: 101.325, tp: 100.901,
    is_staggered: true, staggeredEntries: legs([101.235, 101.237], ['London Mid', 'NY Overlap']),
    triggerMs: T(8, 9), exitMs: T(9, 6), exitPrice: 100.901, outcome: 'WIN',
    provenance: ['DXY-Wed-LM-row7', 'DXY-Wed-NY-row9'],
  },
  { // DXY#7 Fri (LO+NY rows merge) — resolves POST-WEEK Mon Jul 13 (STALE by resolution)
    trade_id: 'DXY|LONG|3359|2026-07-10', pair: 'DXY', direction: 'LONG', day: '2026-07-10',
    intendedSession: 'Friday London Open',
    entry: 100.764, sl: 100.602, tp: 101.207,
    is_staggered: true, staggeredEntries: legs([100.763, 100.765], ['London Open', 'NY Overlap']),
    triggerMs: T(10, 6), exitMs: T(13, 1), exitPrice: 101.207, outcome: 'WIN',
    provenance: ['DXY-Fri-LO-row10', 'DXY-Fri-NY-row12'],
  },
  // ── EUR/USD (5 unique) — audit §1 EU table ──
  { // EU#1 SHORT 1.14572 "Fri" — NEVER TRIGGERED IN-WEEK (filled Tue Jul 14) — STALE FILL
    trade_id: 'EUR/USD|SHORT|3819|2026-07-10', pair: 'EUR/USD', direction: 'SHORT', day: '2026-07-10',
    intendedSession: 'Friday London Open',
    entry: 1.14572, sl: 1.14748, tp: 1.14082,
    is_staggered: true,
    staggeredEntries: [...legs([1.14571, 1.14572, 1.14572], ['London Open', 'London Mid', 'NY Overlap']),
      { leg: 'E4', entry: 1.14573, weight: 0.34, session: 'NY Mid' }],
    triggerMs: T(14, 12), exitMs: T(15, 12), exitPrice: 1.14082, outcome: 'WIN',
    provenance: ['EU-Fri-row13', 'EU-Fri-row14', 'EU-Fri-row15', 'EU-Fri-row16'],
  },
  { // EU#2 SHORT 1.14369 — resolves POST-WEEK Mon Jul 13
    trade_id: 'EUR/USD|SHORT|3812|2026-07-10', pair: 'EUR/USD', direction: 'SHORT', day: '2026-07-10',
    intendedSession: 'Friday NY Mid',
    entry: 1.14369, sl: 1.14697, tp: 1.13788,
    is_staggered: true, staggeredEntries: legs([1.14368, 1.14370], ['NY Mid', 'NY Close']),
    triggerMs: T(10, 15), exitMs: T(13, 20), exitPrice: 1.13788, outcome: 'WIN',
    provenance: ['EU-Fri-row17', 'EU-Fri-row18'],
  },
  { // EU#3 SHORT 1.14389/90 (0.1-pip stagger legs → ONE trade) — resolves POST-WEEK Sun Jul 12
    trade_id: 'EUR/USD|SHORT|3813|2026-07-10', pair: 'EUR/USD', direction: 'SHORT', day: '2026-07-10',
    intendedSession: 'Friday NY Mid',
    entry: 1.14389, sl: 1.14550, tp: 1.14082,
    is_staggered: true, staggeredEntries: legs([1.14388, 1.14389, 1.14390], ['London Mid', 'NY Mid', 'NY Close']),
    triggerMs: T(10, 15), exitMs: T(12, 21), exitPrice: 1.14082, outcome: 'WIN',
    provenance: ['EU-Fri-row19', 'EU-Fri-row20', 'EU-Fri-row21'],
  },
  { // EU#4 SHORT 1.14460 — resolves POST-WEEK Sun Jul 12
    trade_id: 'EUR/USD|SHORT|3815|2026-07-10', pair: 'EUR/USD', direction: 'SHORT', day: '2026-07-10',
    intendedSession: 'Friday London Open',
    entry: 1.14460, sl: 1.14697, tp: 1.14082,
    is_staggered: false, staggeredEntries: [],
    triggerMs: T(10, 6), exitMs: T(12, 21), exitPrice: 1.14082, outcome: 'WIN',
    provenance: ['EU-Fri-row22'],
  },
  { // EU#5 LONG 1.14082 "Fri" — NEVER TRIGGERED IN-WEEK (filled Mon Jul 13, stopped 1h later) — STALE FILL
    trade_id: 'EUR/USD|LONG|3803|2026-07-10', pair: 'EUR/USD', direction: 'LONG', day: '2026-07-10',
    intendedSession: 'Friday NY Mid',
    entry: 1.14082, sl: 1.14034, tp: 1.14269,
    is_staggered: true, staggeredEntries: legs([1.14081, 1.14082, 1.14083], ['London Open', 'London Mid', 'NY Mid']),
    triggerMs: T(13, 5), exitMs: T(13, 6), exitPrice: 1.14034, outcome: 'LOSS',
    provenance: ['EU-Fri-row23', 'EU-Fri-row24', 'EU-Fri-row25'],
  },
  { // GU#1 SHORT 1.34337 ×10 BYTE-IDENTICAL rows — resolves POST-WEEK Sun Jul 12 (Sunday gap TP)
    trade_id: 'GBP/USD|SHORT|4478|2026-07-10', pair: 'GBP/USD', direction: 'SHORT', day: '2026-07-10',
    intendedSession: 'Friday London Mid',
    entry: 1.34337, sl: 1.34567, tp: 1.33912,
    is_staggered: true,
    staggeredEntries: Array.from({ length: 10 }, (_, i) => ({ leg: `E${i + 1}`, entry: 1.34337, weight: W[i] ?? 0.34, session: 'London Mid' })),
    triggerMs: T(10, 10), exitMs: T(12, 21), exitPrice: 1.33912, outcome: 'WIN',
    provenance: Array.from({ length: 10 }, (_, i) => `GU-Fri-row${26 + i} (mirror of DXY source ${i + 1})`),
  },
];

/** The audit's per-trade R (§1 tables) in fixture order — the cross-check oracle. */
const AUDIT_R = [-1.00, 5.83, 3.33, 4.68, 2.99, 3.76, 2.73, 2.78, 1.77, 1.91, 1.59, -1.00, 1.85];

// ─── THE EMBELLISHED SL_vs_ENTRY VOTE ROWS (SL_vs_ENTRY_ANALYSIS.md, verbatim) ─

const VOTE_ROW = (pair: string, direction: 'LONG' | 'SHORT', anchorPrice: number, day: string,
  outcome: 'WIN' | 'LOSS', slDistPips: number, maePips: number): SLvsEntryVoteRow =>
  ({ pair, direction, anchorPrice, day, outcome, slDistPips, maePips });

const D = '2026-07-0';
const WIN_VOTES_30: SLvsEntryVoteRow[] = [
  // DXY wins 1-10 (analysis lines win 1..win 10)
  VOTE_ROW('DXY', 'LONG', 100.869, `${D}7`, 'WIN', 5.8, 1.7),   // win 1
  VOTE_ROW('DXY', 'LONG', 100.869, `${D}7`, 'WIN', 5.8, 1.7),   // win 2 (dup)
  VOTE_ROW('DXY', 'LONG', 100.921, `${D}7`, 'WIN', 8.6, 6.9),   // win 3
  VOTE_ROW('DXY', 'LONG', 100.921, `${D}7`, 'WIN', 8.6, 3.6),   // win 4 (dup)
  VOTE_ROW('DXY', 'SHORT', 101.210, `${D}8`, 'WIN', 6.6, 6.5),  // win 5
  VOTE_ROW('DXY', 'LONG', 100.977, `${D}8`, 'WIN', 7.7, 2.7),   // win 6
  VOTE_ROW('DXY', 'SHORT', 101.236, `${D}8`, 'WIN', 8.9, 3.9),  // win 7
  VOTE_ROW('DXY', 'SHORT', 101.236, `${D}8`, 'WIN', 8.9, 3.9),  // win 8 (dup)
  VOTE_ROW('DXY', 'LONG', 100.764, `${D}0`, 'WIN', 16.2, 5.0),  // win 9 — day overwritten below
  VOTE_ROW('DXY', 'LONG', 100.764, `${D}0`, 'WIN', 16.2, 3.7),  // win 10 (dup)
  // EU wins 11-20
  VOTE_ROW('EUR/USD', 'SHORT', 1.14572, `${D}0`, 'WIN', 17.6, 5.0),  // win 11
  VOTE_ROW('EUR/USD', 'SHORT', 1.14369, `${D}0`, 'WIN', 32.8, 8.9),  // win 12
  VOTE_ROW('EUR/USD', 'SHORT', 1.14389, `${D}0`, 'WIN', 16.1, 2.3),  // win 13
  VOTE_ROW('EUR/USD', 'SHORT', 1.14369, `${D}0`, 'WIN', 32.8, 8.9),  // win 14 (dup of 12)
  VOTE_ROW('EUR/USD', 'SHORT', 1.14390, `${D}0`, 'WIN', 16.0, 2.2),  // win 15 (0.1-pip stagger of 13)
  VOTE_ROW('EUR/USD', 'SHORT', 1.14389, `${D}0`, 'WIN', 16.1, 2.3),  // win 16 (dup of 13)
  VOTE_ROW('EUR/USD', 'SHORT', 1.14460, `${D}0`, 'WIN', 23.7, 1.4),  // win 17
  VOTE_ROW('EUR/USD', 'SHORT', 1.14572, `${D}0`, 'WIN', 17.6, 5.0),  // win 18 (dup of 11)
  VOTE_ROW('EUR/USD', 'SHORT', 1.14572, `${D}0`, 'WIN', 17.6, 5.0),  // win 19 (dup of 11)
  VOTE_ROW('EUR/USD', 'SHORT', 1.14572, `${D}0`, 'WIN', 17.6, 5.0),  // win 20 (dup of 11)
  // GU wins 21-30 — the ×10
  ...Array.from({ length: 10 }, () => VOTE_ROW('GBP/USD', 'SHORT', 1.34337, `${D}0`, 'WIN', 23.0, 3.6)),
];
// fix the DXY Friday votes' day (template literal above produced 2026-07-00)
WIN_VOTES_30[8]!.day = '2026-07-10';
WIN_VOTES_30[9]!.day = '2026-07-10';
for (let i = 10; i < 30; i++) WIN_VOTES_30[i]!.day = '2026-07-10';

// The 6 loss rows (the report's 36-row set = 30 win votes + 6 losses). Loss
// rows' MAE = SL distance by construction (a stopped trade moved against by
// the full SL). The 2 DXY Wed 100.977 "losses" are the audit's PHANTOM
// re-emissions (§2.5) — same trade_id as the Wed 100.977 WIN.
const LOSS_VOTES_6: SLvsEntryVoteRow[] = [
  VOTE_ROW('DXY', 'LONG', 100.869, '2026-07-06', 'LOSS', 5.8, 5.8),  // real Mon loss
  VOTE_ROW('DXY', 'LONG', 100.977, '2026-07-08', 'LOSS', 7.7, 7.7),  // phantom LM re-emission
  VOTE_ROW('DXY', 'LONG', 100.977, '2026-07-08', 'LOSS', 7.7, 7.7),  // phantom NY re-emission
  VOTE_ROW('EUR/USD', 'LONG', 1.14082, '2026-07-10', 'LOSS', 4.8, 4.8),  // EU#5 ×3 rows
  VOTE_ROW('EUR/USD', 'LONG', 1.14082, '2026-07-10', 'LOSS', 4.8, 4.8),
  VOTE_ROW('EUR/USD', 'LONG', 1.14082, '2026-07-10', 'LOSS', 4.8, 4.8),
];
const VOTES_36 = [...WIN_VOTES_30, ...LOSS_VOTES_6];

// ─── RUN ────────────────────────────────────────────────────────────────────

function buildResult() {
  const report = computeAccurateStats(FIXTURE, EVAL_WEEK);
  const dedup30 = dedupSLvsEntry(WIN_VOTES_30);
  const dedup36 = dedupSLvsEntry(VOTES_36);
  return { report, dedup30, dedup36 };
}

const { report, dedup30, dedup36 } = buildResult();

console.log('════════════════════════════════════════════════════════════════');
console.log('VERIFY-ACCURATE-STATS — PKG-REPORT acceptance (v4.5.2 spec §6+§7)');
console.log('════════════════════════════════════════════════════════════════');

// ── A. Oracle stats ──
console.log('\n[A] ORACLE STATS (audit: 13 unique, 11W/2L, 84.6%, +31.23R)');
assert(report.uniqueTradeCount === 13, 'unique trade count = 13', `got ${report.uniqueTradeCount}`);
assert(report.overall.n === 13, 'overall n = 13', `got ${report.overall.n}`);
assert(report.overall.wins === 11 && report.overall.losses === 2, '11W / 2L', `got ${report.overall.wins}W/${report.overall.losses}L`);
assert(report.overall.winRate === 84.6, 'win rate 84.6% (11/13 = 84.615… → 1dp)', `got ${report.overall.winRate}`);
assert(approx(report.overall.totalR, 31.23, 0.01), 'total R +31.23 (±0.01)', `got ${report.overall.totalR}`);
const dxy = report.perPair['DXY']!.overall;
assert(dxy.n === 7 && dxy.wins === 6 && dxy.losses === 1, 'DXY 7 unique 6W/1L', `got n=${dxy.n} ${dxy.wins}W/${dxy.losses}L`);
assert(dxy.winRate === 85.7, 'DXY win rate 85.7%', `got ${dxy.winRate}`);
assert(approx(dxy.totalR, 22.32, 0.01), 'DXY total R +22.32 (±0.01)', `got ${dxy.totalR}`);
const eu = report.perPair['EUR/USD']!.overall;
assert(eu.n === 5 && eu.wins === 4 && eu.losses === 1, 'EU 5 unique 4W/1L', `got n=${eu.n} ${eu.wins}W/${eu.losses}L`);
assert(eu.winRate === 80.0, 'EU win rate 80.0%', `got ${eu.winRate}`);
assert(approx(eu.totalR, 7.06, 0.01), 'EU total R +7.06 (±0.01)', `got ${eu.totalR}`);
const gu = report.perPair['GBP/USD']!.overall;
assert(gu.n === 1 && gu.wins === 1 && gu.losses === 0, 'GU 1 unique 1W/0L', `got n=${gu.n} ${gu.wins}W/${gu.losses}L`);
assert(gu.winRate === 100 && gu.n === 1, 'GU win rate shown as 100% WITH n=1', `got ${gu.winRate}% (n=${gu.n})`);
assert(approx(gu.totalR, 1.85, 0.01), 'GU total R +1.85 (±0.01)', `got ${gu.totalR}`);

// ── B. Per-trade R cross-check vs audit ──
console.log('\n[B] PER-TRADE REALIZED R vs AUDIT (±0.01R) — the fixture cross-check');
console.log('  pair      dir    anchor    day         auditR   engineR');
report.trades.forEach((t, i) => {
  const anchor = t.staggeredEntries.length > 0 ? t.blendedEntry : t.entry;
  console.log(`  ${t.pair.padEnd(9)} ${t.direction.padEnd(6)} ${anchor.toFixed(5).padStart(9)}  ${t.day}  ${AUDIT_R[i]!.toFixed(2).padStart(6)}  ${(t.realizedR ?? NaN).toFixed(4).padStart(8)}`);
  assert(t.realizedR != null && approx(t.realizedR, AUDIT_R[i]!, 0.01),
    `${t.trade_id} R = audit ${AUDIT_R[i]!}`, `engine ${t.realizedR?.toFixed(4)}`);
});

// ── C. STALE bucket ──
console.log('\n[C] STALE BUCKET (§7.2 — audit: 7 resolved post-week, 2 never triggered in-week)');
assert(report.staleCount === 7, 'stale count = 7', `got ${report.staleCount}`);
const notResolved = report.trades.filter(t => !t.resolved_in_week);
assert(notResolved.length === 7, 'resolved_in_week=false count = 7', `got ${notResolved.length}`);
const notTriggered = report.trades.filter(t => !t.triggered_in_week);
assert(notTriggered.length === 2, 'triggered_in_week=false count = 2', `got ${notTriggered.length}`);
const ntIds = notTriggered.map(t => t.trade_id).sort();
assert(ntIds.includes('EUR/USD|SHORT|3819|2026-07-10') && ntIds.includes('EUR/USD|LONG|3803|2026-07-10'),
  'the 2 never-triggered are the EU "Friday" stale fills (Jul 13-14)', ntIds.join(' + '));
assert(report.inWeek.every(t => t.triggered_in_week && t.resolved_in_week), 'headline contains only fully in-week trades');
assert(report.headline.n === 6 && report.headline.wins === 5 && report.headline.losses === 1,
  'weekly headline = 6 in-week trades (5W/1L)', `got n=${report.headline.n} ${report.headline.wins}W/${report.headline.losses}L`);
assert(approx(report.headline.totalR, 19.59, 0.01), 'headline total R +19.59 (the honest in-week number)', `got ${report.headline.totalR}`);
assert(report.inWeekTriggered.n === 11 && report.inWeekTriggered.wins === 10 && report.inWeekTriggered.losses === 1,
  '§7.2 operator default (in-week-triggered) = 11 trades (10W/1L) — excludes only the 2 stale fills',
  `got n=${report.inWeekTriggered.n} ${report.inWeekTriggered.wins}W/${report.inWeekTriggered.losses}L`);
assert(report.stale.every(t => !t.triggered_in_week || !t.resolved_in_week), 'STALE bucket = triggered=false OR resolved=false');

// ── D. Mandatory fields ──
console.log('\n[D] MANDATORY FIELDS (§6.3 — every output trade, no undefined)');
for (const t of report.trades) {
  const ok = typeof t.trade_id === 'string' && t.trade_id.length > 0
    && typeof t.is_staggered === 'boolean'
    && Array.isArray(t.staggeredEntries)
    && typeof t.triggered_in_week === 'boolean'
    && typeof t.resolved_in_week === 'boolean'
    && typeof t.n === 'number' && t.n > 0
    && Array.isArray(t.provenance) && t.provenance.length > 0
    && typeof t.outcome === 'string';
  assert(ok, `${t.trade_id} carries all 7 mandatory fields + outcome`,
    ok ? `n=${t.n} staggered=${t.is_staggered} prov=${t.provenance.length} rows` : 'MISSING FIELD');
}
const guTrade = report.trades.find(t => t.pair === 'GBP/USD')!;
assert(guTrade.is_staggered && guTrade.staggeredEntries.length === 10 && guTrade.provenance.length === 10,
  'GU ×10 collapse: ONE trade, 10 legs, 10-row provenance', `legs=${guTrade.staggeredEntries.length}`);

// ── E. Session-label honesty ──
console.log('\n[E] SESSION-LABEL HONESTY (§7.3)');
const t1 = report.trades[0]!;
assert(!t1.sessionHonesty.honest && t1.sessionHonesty.actualSession === 'NY Close',
  '"Monday London Open" filled 18:00 UTC = 14:00 ET → flagged (actual: NY Close)',
  t1.sessionHonesty.honestLabel);
assert(t1.sessionHonesty.honestLabel.includes('(intended)') && t1.sessionHonesty.honestLabel.includes('14:00 ET'),
  'dishonest label replaced by intended→actual form', t1.sessionHonesty.honestLabel);
const t5 = report.trades[4]!;
assert(t5.sessionHonesty.honest && t5.sessionHonesty.honestLabel === 'Wednesday London Open',
  '"Wednesday London Open" filled 07:00 UTC = 03:00 ET → label KEPT', t5.sessionHonesty.honestLabel);
const genuineLondon = sessionLabelHonesty({
  ...FIXTURE[1]!, intendedSession: 'Tuesday London Open', triggerMs: Date.UTC(2026, 6, 7, 8, 0),
});
assert(genuineLondon.honest && genuineLondon.honestLabel === 'Tuesday London Open',
  'genuine 08:00 UTC (04:00 ET) London Open fill → label KEPT', genuineLondon.honestLabel);
const noLabel = sessionLabelHonesty({ ...FIXTURE[1]!, intendedSession: null });
assert(!noLabel.honest && noLabel.honestLabel.startsWith('filled '),
  'no intended label → honest fill-timestamp label emitted', noLabel.honestLabel);
const staleFill = report.trades.find(t => t.trade_id === 'EUR/USD|SHORT|3819|2026-07-10')!;
assert(!staleFill.sessionHonesty.honest,
  'EU "Friday London Open" filled Tue Jul 14 12:00 UTC → flagged', staleFill.sessionHonesty.honestLabel);

// ── F. SL_vs_ENTRY dedup ──
console.log('\n[F] SL_vs_ENTRY DEDUP (§6.4 — the embellished "SL TOO WIDE=25" vs the unique truth)');
assert(dedup30.rawCount === 30 && dedup30.rawTally.SL_TOO_WIDE === 25,
  'raw (embellished) 30-row tally reproduces SL TOO WIDE=25', JSON.stringify(dedup30.rawTally));
assert(dedup30.uniqueCount === 11, 'the 30 win rows dedup to 11 unique win votes', `got ${dedup30.uniqueCount}`);
assert(dedup30.uniqueTally.SL_TOO_WIDE === 8 && dedup30.uniqueTally.ENTRY_TOO_EARLY === 2 && dedup30.uniqueTally.BALANCED === 1,
  'unique win tally: SL TOO WIDE=8 / ENTRY TOO EARLY=2 / BALANCED=1', JSON.stringify(dedup30.uniqueTally));
const guVote = dedup30.uniqueVotes.find(v => v.pair === 'GBP/USD')!;
assert(guVote.rowsCollapsed === 10, 'GU ×10 collapse: 10 identical votes → 1', `rowsCollapsed=${guVote.rowsCollapsed}`);
assert(dedup36.rawCount === 36, '36-row raw count (30 wins + 6 losses)', `got ${dedup36.rawCount}`);
assert(dedup36.uniqueCount === 13, 'the 36 rows dedup to exactly the 13 unique trades', `got ${dedup36.uniqueCount}`);
assert(dedup36.uniqueTally.SL_TOO_WIDE === 8,
  '36-row unique SL TOO WIDE=8 (phantom DXY losses collapse into the Wed 100.977 WIN identity)',
  JSON.stringify(dedup36.uniqueTally));

// ── G. Determinism ──
console.log('\n[G] DETERMINISM (byte-identical ×2)');
const run1 = JSON.stringify(buildResult());
const run2 = JSON.stringify(buildResult());
assert(run1 === run2, 'two full runs produce byte-identical JSON', `len=${run1.length}`);

// ── REPORT TABLE ──
console.log('\n════════════════ RECOMPUTED ACCURATE STATS (unique set) ════════════════');
console.log(`HEADLINE (fully in-week, n=${report.headline.n}): ${report.headline.wins}W/${report.headline.losses}L | WR ${report.headline.winRate}% | ${report.headline.totalR}R`);
console.log(`IN-WEEK-TRIGGERED (§7.2 default, n=${report.inWeekTriggered.n}): ${report.inWeekTriggered.wins}W/${report.inWeekTriggered.losses}L | WR ${report.inWeekTriggered.winRate}% | ${report.inWeekTriggered.totalR}R`);
console.log(`OVERALL UNIQUE (n=${report.overall.n}): ${report.overall.wins}W/${report.overall.losses}L | WR ${report.overall.winRate}% | ${report.overall.totalR}R | avgRrr ${report.overall.avgRrr}x`);
for (const [pair, s] of Object.entries(report.perPair)) {
  console.log(`  ${pair.padEnd(8)} overall n=${s.overall.n} ${s.overall.wins}W/${s.overall.losses}L WR ${s.overall.winRate}% ${s.overall.totalR}R avgRrr ${s.overall.avgRrr}x | headline n=${s.headline.n} ${s.headline.wins}W/${s.headline.losses}L ${s.headline.totalR}R`);
}
console.log(`STALE bucket (n=${report.staleCount}):`);
for (const t of report.stale) {
  console.log(`  ${t.trade_id}  trig_in_week=${t.triggered_in_week} res_in_week=${t.resolved_in_week} ${t.outcome} ${t.realizedR?.toFixed(2)}R  ${t.sessionHonesty.honestLabel}`);
}

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`RESULT: ${passed} PASS / ${failed} FAIL`);
console.log('════════════════════════════════════════════════════════════════');
if (failed > 0) process.exit(1);
