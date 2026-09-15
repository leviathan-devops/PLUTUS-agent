/**
 * verify-dedup.ts — the PKG-DEDUP adversarial harness (PLUTUS_V4.5.2_SPEC
 * §10.1 test 1 + §10.3; oracle: Visual_Evals/v4.5.1/INDEPENDENT_AUDIT_v452.md).
 *
 * Proves, mechanically:
 *   1. The 36-row v4.5.1 report dedups to EXACTLY 13 unique trades
 *      (DXY 7, EU 5, GU 1) — matched against the audit's unique-trade
 *      list row-by-row (pair/dir/anchor/day/legs/SL/TP).
 *   2. The §1.4 CI assertion FAILS the raw 36-row report and NAMES all
 *      23 duplicate rows; PASSES the deduplicated report.
 *   3. Boundary: anchors at exactly ±3 pips → adjacent buckets (never the
 *      same bucket, per the Appendix B formula); within-tolerance anchor
 *      → same bucket; same zone on different days → DISTINCT trades.
 *   4. A 3-leg staggered group merges to ONE trade with the hand-computed
 *      blended entry (1.34337/1.34347/1.34357 × 0.33/0.33/0.34 = 1.3434710).
 *   5. The GU ×10 fixture → 1 unique trade; capMirrorEmission keeps 1,
 *      drops 9 with logged reasons (§4.2); the consumed-pool re-admission
 *      qualifier (§4.4); the upstream zone-pool dedup (§4.5).
 *   6. Determinism: two full dedup runs → byte-identical JSON.
 *
 * Run: bun verify-dedup.ts   (exit 0 = all green, exit 1 = a FAIL line)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import {
  ANCHOR_TOLERANCE_PIPS,
  MAX_MIRRORS_PER_ANCHOR_PER_DAY,
  anchorBucket,
  assertRowCountIntegrity,
  blendedRrr,
  capMirrorEmission,
  dedupTrades,
  dedupZonePool,
  isRowCountIntegrityError,
  qualifyConsumedPoolReadmission,
  tradeIdentity,
  type DedupSetup,
} from './src/mdve/trade-dedup.js';

const REPORT_PATH = '../../Visual_Evals/v4.5.1/report_v45.md';
const OUT_PATH = 'verify-dedup-out.json'; // relative — SF-AST: no absolute paths

// ── tiny assertion kit ───────────────────────────────────────────────────────
let pass = 0;
let fail = 0;
function ok(cond: boolean, label: string, detail = ''): void {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function near(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PARSE the 36 setup rows from report_v45.md
//    Row shape: | n | **DIR** | Day | Session ET | entry | — | — | sl | tp | rrr |
// ═════════════════════════════════════════════════════════════════════════════
const DAY_ISO: Record<string, string> = {
  Monday: '2026-07-06',
  Tuesday: '2026-07-07',
  Wednesday: '2026-07-08',
  Thursday: '2026-07-09',
  Friday: '2026-07-10',
};

/** Session start → UTC ms (July = EDT, ET+4). Leg-ordering key only. */
function sessionStartMs(dayIso: string, session: string): number {
  const m = session.match(/(\d{1,2}):(\d{2})/);
  const hh = m ? Number(m[1]) : 0;
  const mm = m ? Number(m[2]) : 0;
  return Date.parse(`${dayIso}T00:00:00Z`) + (hh + 4) * 3_600_000 + mm * 60_000;
}

function parseReport(path: string): DedupSetup[] {
  const rows: DedupSetup[] = [];
  let pair = '';
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { pair = h[1]!; continue; }
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim());
    cells.shift(); // leading empty
    cells.pop();   // trailing empty
    if (cells.length !== 10 || !/^\d+$/.test(cells[0]!)) continue;
    const dirRaw = cells[1]!.replace(/\*/g, '');
    const dayName = cells[2]!;
    const session = cells[3]!;
    const dayIso = DAY_ISO[dayName];
    if (!dayIso) throw new Error(`unmapped day '${dayName}' in report`);
    rows.push({
      setupId: `${pair}#${cells[0]}`,
      pair,
      direction: dirRaw === 'LONG' ? 'LONG' : 'SHORT',
      entry: Number(cells[4]),
      sl: Number(cells[7]),
      tp: Number(cells[8]),
      day: dayIso,
      session,
      triggerMs: sessionStartMs(dayIso, session),
    });
  }
  return rows;
}

const rows = parseReport(REPORT_PATH);
console.log('═'.repeat(72));
console.log('PKG-DEDUP VERIFY — the stats-integrity engine vs the audit oracle');
console.log('═'.repeat(72));
console.log(`\n[1] Parsed ${rows.length} rows from report_v45.md`);
ok(rows.length === 36, 'parsed exactly 36 setup rows', `got ${rows.length}`);
ok(rows.filter((r) => r.pair === 'DXY').length === 13, 'DXY row count = 13');
ok(rows.filter((r) => r.pair === 'EUR/USD').length === 13, 'EUR/USD row count = 13');
ok(rows.filter((r) => r.pair === 'GBP/USD').length === 10, 'GBP/USD row count = 10');

// ═════════════════════════════════════════════════════════════════════════════
// 2. THE REAL FIXTURE — dedup must equal the audit EXACTLY (13 unique)
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n[2] dedupTrades on the real 36-row fixture vs the audit oracle');
const result = dedupTrades(rows);

/** The audit's unique-trade list (INDEPENDENT_AUDIT_v452 §1), row-by-row. */
const AUDIT: Array<{
  pair: string; dir: 'LONG' | 'SHORT'; day: string; anchor: number;
  legs: number; sl: number; tp: number;
}> = [
  { pair: 'DXY', dir: 'LONG',  day: '2026-07-06', anchor: 100.869, legs: 1, sl: 100.811, tp: 101.207 },
  { pair: 'DXY', dir: 'LONG',  day: '2026-07-07', anchor: 100.869, legs: 2, sl: 100.811, tp: 101.207 },
  { pair: 'DXY', dir: 'LONG',  day: '2026-07-07', anchor: 100.921, legs: 2, sl: 100.835, tp: 101.207 },
  { pair: 'DXY', dir: 'SHORT', day: '2026-07-08', anchor: 101.210, legs: 1, sl: 101.276, tp: 100.901 },
  { pair: 'DXY', dir: 'LONG',  day: '2026-07-08', anchor: 100.977, legs: 3, sl: 100.900, tp: 101.207 },
  // TP variants 100.938/100.901 → ONE trade, first leg's TP per §2.2 (the
  // wall-refined 100.901 is Wave B's TP-refinement job, not the dedup's).
  { pair: 'DXY', dir: 'SHORT', day: '2026-07-08', anchor: 101.236, legs: 2, sl: 101.325, tp: 100.938 },
  { pair: 'DXY', dir: 'LONG',  day: '2026-07-10', anchor: 100.764, legs: 2, sl: 100.602, tp: 101.207 },
  { pair: 'EUR/USD', dir: 'SHORT', day: '2026-07-10', anchor: 1.14572, legs: 4, sl: 1.14748, tp: 1.14082 },
  { pair: 'EUR/USD', dir: 'SHORT', day: '2026-07-10', anchor: 1.14369, legs: 2, sl: 1.14697, tp: 1.13788 },
  { pair: 'EUR/USD', dir: 'SHORT', day: '2026-07-10', anchor: 1.14389, legs: 3, sl: 1.14550, tp: 1.14082 },
  { pair: 'EUR/USD', dir: 'SHORT', day: '2026-07-10', anchor: 1.14460, legs: 1, sl: 1.14697, tp: 1.14082 },
  { pair: 'EUR/USD', dir: 'LONG',  day: '2026-07-10', anchor: 1.14082, legs: 3, sl: 1.14034, tp: 1.14269 },
  { pair: 'GBP/USD', dir: 'SHORT', day: '2026-07-10', anchor: 1.34337, legs: 10, sl: 1.34567, tp: 1.33912 },
];

ok(result.uniqueTrades.length === 13, 'EXACTLY 13 unique trades', `got ${result.uniqueTrades.length}`);
ok(result.stats.perPair['DXY']?.unique === 7, 'DXY → 7 unique (audit: 13 rows → 7)');
ok(result.stats.perPair['EUR/USD']?.unique === 5, 'EU → 5 unique (audit: 13 rows → 5)');
ok(result.stats.perPair['GBP/USD']?.unique === 1, 'GU → 1 unique (audit: 10 rows → 1)');
ok(result.droppedDuplicates.length === 23, '23 duplicate rows named (6 DXY + 7 EU + 10 GU)',
  `got ${result.droppedDuplicates.length}`);

const used = new Set<string>();
for (const exp of AUDIT) {
  const bucket = anchorBucket(exp.anchor, exp.pair);
  const id = `${exp.pair}|${exp.dir}|${bucket}|${exp.day}`;
  const t = result.uniqueTrades.find((u) => u.trade_id === id && !used.has(u.trade_id));
  if (!t) {
    ok(false, `audit trade ${exp.pair} ${exp.dir} ${exp.anchor} ${exp.day}`, 'no matching unique trade');
    continue;
  }
  used.add(t.trade_id);
  const legsOk = t.mergedRowCount === exp.legs && t.staggeredEntries.length === exp.legs;
  const slTpOk = near(t.sl, exp.sl) && near(t.tp, exp.tp);
  const anchorOk = anchorBucket(t.entryZone?.defendedEdge ?? t.entry, t.pair) === bucket;
  ok(legsOk && slTpOk && anchorOk,
    `${exp.pair} ${exp.dir} @${exp.anchor} ${exp.day} → ${exp.legs} leg(s), SL ${exp.sl}, TP ${exp.tp}`,
    `legs=${t.mergedRowCount} sl=${t.sl} tp=${t.tp}`);
}

// Hand-computed blends (independent of the implementation's arithmetic):
const euStagger = result.uniqueTrades.find(
  (t) => t.pair === 'EUR/USD' && t.direction === 'SHORT' && t.staggeredEntries.length === 3);
ok(!!euStagger && near(euStagger.entry, 1.1438934),
  'EU 1.14389/1.14390 stagger blend = 1.1438934 (hand-computed)',
  euStagger ? `got ${euStagger.entry}` : 'trade missing');
const gu = result.uniqueTrades.find((t) => t.pair === 'GBP/USD');
ok(!!gu && near(gu.entry, 1.34337) && gu.staggeredEntries.length === 10,
  'GU ×10 → ONE trade, blended entry = 1.34337 exactly', gu ? `got ${gu.entry}` : 'trade missing');
const dxyMon = result.uniqueTrades.find(
  (t) => t.pair === 'DXY' && t.day === '2026-07-06');
ok(!!dxyMon && dxyMon.is_staggered === false && dxyMon.staggeredEntries.length === 1,
  'DXY Monday 100.869 = a singleton (NOT staggered, 1 leg)');
ok(result.uniqueTrades.every((t) => t.trade_id === tradeIdentity(t)),
  'every unique trade re-identifies to its own trade_id (identity stability)');
ok(result.uniqueTrades.every((t) => t.provenance.length > 0),
  'every unique trade carries provenance (§6.3)');
const guRrr = gu ? blendedRrr(gu) : NaN;
ok(near(guRrr, Math.abs(1.33912 - 1.34337) / Math.abs(1.34337 - 1.34567), 1e-6),
  'GU blended RRR (§3.2) = plain RRR for identical legs', `got ${guRrr}`);

console.log('\n  THE 13 UNIQUE TRADES (trade_id | legs | blend | SL | TP | provenance):');
for (const t of result.uniqueTrades) {
  console.log(`    ${t.trade_id}  legs=${t.mergedRowCount}  entry=${t.entry.toFixed(5)}  sl=${t.sl}  tp=${t.tp}  prov=[${t.provenance}]`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE CI ASSERTION (§1.4) — catches all 23 duplicates, passes the clean set
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n[3] assertRowCountIntegrity — the regression guard');
let caught: unknown = null;
try {
  assertRowCountIntegrity({ rows, uniqueTrades: result.uniqueTrades });
} catch (e) {
  caught = e;
}
ok(isRowCountIntegrityError(caught), 'raw 36-row report FAILS the CI assertion');
if (isRowCountIntegrityError(caught)) {
  ok(caught.duplicates.length === 23, 'the thrown error NAMES all 23 duplicate rows',
    `got ${caught.duplicates.length}`);
  console.log(`  CI error message:\n    ${caught.message.split('; ').join('\n    ')}`);
}
let cleanThrew = false;
try {
  assertRowCountIntegrity({ rows: result.uniqueTrades, uniqueTrades: result.uniqueTrades });
} catch {
  cleanThrew = true;
}
ok(!cleanThrew, 'the DEDUPLICATED report passes the CI assertion (no false positive)');

// ═════════════════════════════════════════════════════════════════════════════
// 4. BOUNDARY CASES — tolerance, day-distinctness, stagger merge, GU ×10
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n[4] Boundary cases');
const mk = (over: Partial<DedupSetup>): DedupSetup => ({
  setupId: over.setupId ?? 'T#1',
  pair: 'EUR/USD',
  direction: 'SHORT',
  entry: 1.10000,
  sl: 1.10200,
  tp: 1.09500,
  day: '2026-07-10',
  ...over,
});

const base = mk({});
ok(ANCHOR_TOLERANCE_PIPS['EUR/USD'] === 3 && ANCHOR_TOLERANCE_PIPS['DXY'] === 3,
  'anchor tolerance = 3 pips per pair (§1.3)');
ok(anchorBucket(1.10000, 'EUR/USD') === anchorBucket(1.10020, 'EUR/USD'),
  'anchor +2 pips (within tolerance) → SAME bucket');
ok(anchorBucket(1.10000, 'EUR/USD') !== anchorBucket(1.10030, 'EUR/USD'),
  'anchor EXACTLY +3 pips → ADJACENT bucket (per the Appendix B formula)');
ok(anchorBucket(1.10000, 'EUR/USD') !== anchorBucket(1.09970, 'EUR/USD'),
  'anchor EXACTLY -3 pips → ADJACENT bucket (per the Appendix B formula)');
ok(tradeIdentity(mk({ entry: 1.10030 })) !== tradeIdentity(base),
  'anchors 3 pips apart → DISTINCT trade identities');
ok(tradeIdentity(mk({ day: '2026-07-09' })) !== tradeIdentity(base),
  'same zone, DIFFERENT DAY → DISTINCT (multi-day reactions are legitimate, §2.3)');
ok(tradeIdentity(mk({ session: 'London Open' })) === tradeIdentity(mk({ session: 'NY Mid' })),
  'session is NOT an identity component (§1.2 canon)');
ok(tradeIdentity(mk({ entry: 1.10001, entryZone: { defendedEdge: 1.10000 } })) === tradeIdentity(base),
  'identity anchors on the ZONE defendedEdge, not the entry (§1.2)');

// The 3-leg staggered merge — hand-computed blend:
// 0.33×1.34337 + 0.33×1.34347 + 0.34×1.34357 = 0.4433121 + 0.4433451 + 0.4568138 = 1.3434710
const staggerRows: DedupSetup[] = [
  { setupId: 'G#E1', pair: 'GBP/USD', direction: 'SHORT', entry: 1.34337, sl: 1.34567, tp: 1.33912, day: '2026-07-10', session: 'London Open', triggerMs: 1000, entryZone: { defendedEdge: 1.34337 } },
  { setupId: 'G#E2', pair: 'GBP/USD', direction: 'SHORT', entry: 1.34347, sl: 1.34577, tp: 1.33902, day: '2026-07-10', session: 'London Mid', triggerMs: 2000, entryZone: { defendedEdge: 1.34337 } },
  { setupId: 'G#E3', pair: 'GBP/USD', direction: 'SHORT', entry: 1.34357, sl: 1.34587, tp: 1.33892, day: '2026-07-10', session: 'NY Mid', triggerMs: 3000, entryZone: { defendedEdge: 1.34337 } },
];
const stagger = dedupTrades(staggerRows);
ok(stagger.uniqueTrades.length === 1, '3-leg staggered group → ONE trade');
const st = stagger.uniqueTrades[0]!;
ok(st.is_staggered && st.staggeredEntries.length === 3, 'is_staggered=true with E1/E2/E3 legs');
ok(near(st.entry, 1.343471), 'blended entry = 1.3434710 (hand-computed 0.33/0.33/0.34 ladder)',
  `got ${st.entry}`);
ok(near(st.staggeredEntries[0]!.weight, 0.33) && near(st.staggeredEntries[1]!.weight, 0.33) &&
  near(st.staggeredEntries[2]!.weight, 0.34), 'leg weights = the frozen 0.33/0.33/0.34 ladder');
ok(near(st.sl, 1.34567) && near(st.tp, 1.33912),
  'ONE SL + ONE TP from the FIRST leg (the structural anchor, §2.2)');
ok(st.provenance === 'G#E1 + G#E2 + G#E3', 'provenance = the merged source row ids, chronological');
ok(st.staggeredEntries.map((l) => l.setupId).join(',') === 'G#E1,G#E2,G#E3',
  'legs ordered by triggerMs (chronological fill ladder)');

// The GU ×10 fixture through the dedup AND the emission cap:
const gu10: DedupSetup[] = Array.from({ length: 10 }, (_, i) => ({
  setupId: `GU-X10#${i + 1}`, pair: 'GBP/USD', direction: 'SHORT',
  entry: 1.34337, sl: 1.34567, tp: 1.33912, day: '2026-07-10',
  session: 'London Mid 05:00-08:00 ET', triggerMs: 9_000_000 + i,
}));
ok(dedupTrades(gu10).uniqueTrades.length === 1, 'GU ×10 identical rows → 1 unique trade (§4.1)');
ok(MAX_MIRRORS_PER_ANCHOR_PER_DAY === 1, 'MAX_MIRRORS_PER_ANCHOR_PER_DAY = 1 (§4.2)');
const capped = capMirrorEmission(gu10);
ok(capped.kept.length === 1 && capped.dropped.length === 9,
  'capMirrorEmission: 10 mirrors on one anchor+day → 1 kept, 9 dropped');
ok(capped.kept[0]!.setupId === 'GU-X10#1', 'the FIRST (strongest-provenance) mirror is kept (§4.2)');
ok(capped.dropped.every((d) => d.reason === 'EMISSION_CAP' && d.detail.includes('§4.2')),
  'every capped emission carries a logged EMISSION_CAP reason');
const cappedTwoDays = capMirrorEmission([gu10[0]!, { ...gu10[1]!, day: '2026-07-11' }]);
ok(cappedTwoDays.kept.length === 2, 'same anchor on DIFFERENT days → both emitted (cap is per-day)');

// §4.4 — the consumed-pool re-admission qualifier:
const admit = qualifyConsumedPoolReadmission({
  pair: 'GBP/USD', anchorPrice: 1.34337, day: '2026-07-10', battlesInWeek: 3, volatilityCleared: true,
});
ok(admit.admitted, 'battled-3× + vol-cleared consumed anchor → RE-ADMITTED (the GU 1.34337 case)');
const noBattle = qualifyConsumedPoolReadmission({
  pair: 'GBP/USD', anchorPrice: 1.35000, day: '2026-07-10', battlesInWeek: 0, volatilityCleared: true,
});
ok(!noBattle.admitted, 'consumed with NO battle evidence → DENIED (§4.4.2: consumed ≠ reactive)');
const noVolClear = qualifyConsumedPoolReadmission({
  pair: 'GBP/USD', anchorPrice: 1.35100, day: '2026-07-10', battlesInWeek: 2, volatilityCleared: false,
});
ok(!noVolClear.admitted, 'battled but NOT vol-cleared → DENIED (§4.4.3)');

// §4.5 — the upstream zone-pool dedup (the audit's finding 10):
const pool = dedupZonePool([
  { zoneId: 'Z1', pair: 'DXY', class: 'IP Supply', anchorPrice: 101.2277 },
  { zoneId: 'Z2', pair: 'DXY', class: 'IP Supply', anchorPrice: 101.2278 }, // ×2 duplicate
  { zoneId: 'Z3', pair: 'DXY', class: 'IP Demand', anchorPrice: 100.8347 },
  { zoneId: 'Z4', pair: 'DXY', class: 'IP Demand', anchorPrice: 100.8346 }, // ×3 duplicate
  { zoneId: 'Z5', pair: 'DXY', class: 'IP Demand', anchorPrice: 100.8348 }, // ×3 duplicate
  { zoneId: 'Z6', pair: 'DXY', class: 'IP Supply', anchorPrice: 100.9000 }, // distinct
  { zoneId: 'Z7', pair: 'GBP/USD', class: 'IP Supply', anchorPrice: 1.34210 },
  { zoneId: 'Z8', pair: 'GBP/USD', class: 'IP Supply', anchorPrice: 1.34211 }, // GU ×3 duplicate
  { zoneId: 'Z9', pair: 'GBP/USD', class: 'IP Supply', anchorPrice: 1.34209 }, // GU ×3 duplicate
]);
ok(pool.unique.length === 4 && pool.dropped.length === 5,
  'zone pool: 9 listed → 4 unique (the v4.4 same-zone-listed-3× root generator killed, §4.5)',
  `unique=${pool.unique.length} dropped=${pool.dropped.length}`);
ok(pool.dropped.every((d) => d.reason === 'ZONE_POOL_DUPLICATE'),
  'every zone-pool drop carries a ZONE_POOL_DUPLICATE reason');

// ═════════════════════════════════════════════════════════════════════════════
// 5. DETERMINISM — two full runs → byte-identical JSON
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n[5] Determinism');
const run1 = JSON.stringify(dedupTrades(rows));
const run2 = JSON.stringify(dedupTrades(rows));
ok(run1 === run2, 'dedupTrades ×2 on the 36-row fixture → byte-identical JSON');
ok(JSON.stringify(dedupTrades(staggerRows)) === JSON.stringify(dedupTrades(staggerRows)),
  'dedupTrades ×2 on the stagger fixture → byte-identical JSON');
writeFileSync(OUT_PATH, JSON.stringify(result, null, 2) + '\n');
console.log(`  full dedup result written to ${OUT_PATH}`);

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log(`RESULT: ${pass} PASS, ${fail} FAIL`);
console.log('═'.repeat(72));
process.exit(fail === 0 ? 0 : 1);
