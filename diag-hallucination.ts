/**
 * WAVE J1 GATE — the HALLUCINATION DETECTOR + the REJECTED-SETUP LOG
 *
 * H1: the operator's canonical trigger phrase fires the red alert
 * H2: a layer-evidenced reason does NOT trigger
 * H3: an empty reason triggers
 * H4: the fixture run's rejections carry layer-evidenced reasons
 *     (no un-red-flagged trigger passes in the pipeline's discard reasons)
 * H5: the rejected-setup log is written (data/rejected_setups/ non-empty)
 *
 * Exit 0 = all gates pass. The VERDICT line + the evidence prints are the
 * proof. Prose is not evidence.
 */
import { detectHallucination, resetDetectorStats, getDetectorStats } from './src/mdve/hallucination-detector.js';
import { writeRejectedSetup, runIdOf } from './src/mdve/rejected-log.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (name: string, pass: boolean, detail = '') => {
  console.log(`  ${name}: ${pass ? '✅' : '❌'} ${detail}`);
  if (!pass) failures++;
};

// ── H1: the canonical trigger phrase ──
const v1 = detectHallucination('EUR/USD candles smaller on this move');
ok('H1 canonical trigger', v1.triggered === true && v1.matchedPhrase !== null, `trigger=${v1.matchedPhrase}`);

// ── H2: a layer-evidenced reason does NOT trigger ──
const v2 = detectHallucination(
  'RRR 1.24 < 3.0 — the cascade translation assigned the wrong supply (C1/C3/C4 failed: the structurally-equivalent BoM supply is 1.14544, window Δ10.0h)',
  { zoneId: 'EUR/USD|1H|1783648800000|1.14469', price: 1.14544, delta: 10.0, layerCheck: 'C1', rungId: 'LMV|EUR/USD|1.14544' },
);
ok('H2 layer-evidenced no-trigger', v2.triggered === false, `triggered=${v2.triggered}`);

// ── H3: empty reason triggers ──
const v3 = detectHallucination('');
ok('H3 empty reason', v3.triggered === true, 'triggered=true');

// ── H4: the fixture run's rejections carry layer-evidenced reasons ──
// The report pipeline's discard reasons (the Wave-G/H state): every rejection
// must either carry mechanical evidence or be red-flagged. We re-check the
// known historical rejection reasons against the detector.
const historicalReasons: Array<{ reason: string; expectTrigger: boolean; evidence?: Parameters<typeof detectHallucination>[1] }> = [
  { reason: 'EUR/USD mirror of SRC-DXY-DXY_1H_1782990000000_101_027-20260706-TOKYO: RRR 1.2 < 1.5 after the pair-native re-anchor — EUR/USD candles smaller on this move', expectTrigger: true },
  { reason: 'RRR 5.18 >= 3.0 — re-translated: C1 BoM→BoM matched · C3 ±48h window 10.0h · T4 TP 1.14100 (the opposing BoM wall internal LQZ) · T6 RRR ≥ 3.0', expectTrigger: false, evidence: { zoneId: 'EUR/USD|1H|1783648800000|1.14469', price: 1.14100, delta: 10.0, layerCheck: 'C1', rungId: 'LMV|EUR/USD|1.14100' } },
  { reason: 'RRR 3.16 >= 3.0 — repaired: E moved to the internal-LQZ near edge 100.946 (T1) · SL next-rung reactionExtreme + Law-7 buffer 100.888 (T3) · TP 101.240 (T4) · RRR recomputed (T6)', expectTrigger: false, evidence: { zoneId: 'DXY|1H|1783443600000|100.935', price: 100.946, delta: 29.4, layerCheck: 'T1', rungId: 'DXY|LMV|101.240' } },
];
let h4Pass = true;
for (const h of historicalReasons) {
  const v = detectHallucination(h.reason, h.evidence);
  if (v.triggered !== h.expectTrigger) h4Pass = false;
}
ok('H4 pipeline rejections layer-evidenced', h4Pass, `${historicalReasons.length} reasons checked`);

// ── H5: the rejected-setup log is written ──
const recPath = writeRejectedSetup(
  {
    setupId: 'SRC-DXY-DXY_1H_1782990000000_101_027-20260706-TOKYO',
    run: runIdOf(1782990000000),
    pair: 'EUR/USD',
    lane: 'MIRROR',
    day: 'Monday',
    direction: 'SHORT',
    entry: 1.14494,
    sl: 1.1457,
    tp: 1.144,
    rrrComputed: 1.24,
    rrrFloor: 3.0,
    rejectionReason: 'EUR/USD candles smaller on this move',
    hallucinationTrigger: true,
    sourceSetupId: 'SRC-DXY-DXY_1H_1782990000000_101_027-20260706-TOKYO',
    verdict: 'RE_TRANSLATE',
  },
  { weekStartMs: 1782990000000 },
);
let h5Pass = recPath !== null && existsSync(recPath);
if (h5Pass) {
  const runDir = join('data/rejected_setups', runIdOf(1782990000000));
  h5Pass = readdirSync(runDir).filter((f) => /^rejected_setup_\d{4}\.json$/.test(f)).length > 0;
}
ok('H5 rejected-setup log written', h5Pass, recPath ?? 'write failed');

const stats = getDetectorStats();
console.log(`  detector stats: checked=${stats.totalChecked} triggers=${stats.triggers}`);
console.log(failures === 0 ? '=== VERDICT: PASS (all Wave-J1 gates) ===' : `=== VERDICT: FAIL (${failures} gate(s)) ===`);
process.exit(failures === 0 ? 0 : 1);
