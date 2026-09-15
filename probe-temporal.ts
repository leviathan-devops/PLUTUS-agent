/**
 * probe-temporal.ts — THE ANTI-BYPASS PROOF (the temporal gate must be
 * provably uncircumventable, not assumed). Runs in a FRESH process so the
 * gate starts unlocked:
 *   (a) getRunAnchorMs() BEFORE the lock THROWS (the unlocked fail-fast —
 *       never a silent 0/undefined that would pass everything);
 *   (b) lockRunAnchor(1783321200000) — the Monday 2026-07-06 07:00 UTC anchor
 *       (the operator's run moment);
 *   (c) a SAME-VALUE re-lock is a no-op (idempotent — no throw);
 *   (d) lockRunAnchor(1783702800000) — the old Friday anchor, four days past
 *       the run anchor — THROWS (the one-way lock violation);
 *   (e) gateBars drops the two future bars (1783702800000 + 1785211200000) —
 *       EXACTLY the anchor bar survives;
 *   (f) the final verdict.
 *
 * Run: bun probe-temporal.ts
 */
import { getRunAnchorMs, lockRunAnchor, gateBars } from './src/mdve/temporal.js';

let failures = 0;
const pass = (msg: string) => { console.log(`  ✅ PASS: ${msg}`); };
const fail = (msg: string) => { failures++; console.log(`  ❌ FAIL: ${msg}`); };

// ── (a) getRunAnchorMs() before the lock THROWS (fail-fast) ──
{
  let ok = false;
  try {
    getRunAnchorMs();
    fail('(a) getRunAnchorMs() before the lock did NOT throw');
  } catch (e) {
    ok = e instanceof Error && e.message.startsWith('TEMPORAL UNLOCKED');
    if (ok) pass('(a) getRunAnchorMs() before the lock THROWS (TEMPORAL UNLOCKED fail-fast)');
    else fail(`(a) threw the wrong error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── (b) lockRunAnchor(1783321200000) — the Monday 07:00 UTC anchor ──
{
  let ok = false;
  try {
    lockRunAnchor(1783321200000);
    ok = getRunAnchorMs() === 1783321200000;
    if (ok) pass('(b) lockRunAnchor(1783321200000) sets the anchor (getRunAnchorMs() === 1783321200000)');
    else fail('(b) the anchor value is wrong after the lock');
  } catch (e) {
    fail(`(b) the lock threw unexpectedly: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── (c) a SAME-VALUE re-lock is a no-op (no throw) ──
{
  let ok = false;
  try {
    lockRunAnchor(1783321200000);
    ok = getRunAnchorMs() === 1783321200000;
    if (ok) pass('(c) the same-value re-lock is a no-op (idempotent — no throw, anchor unchanged)');
    else fail('(c) the anchor changed after the same-value re-lock');
  } catch (e) {
    fail(`(c) the same-value re-lock THREW: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── (d) lockRunAnchor(1783702800000) THROWS (the different-value violation) ──
{
  let ok = false;
  try {
    lockRunAnchor(1783702800000);
    fail('(d) the different-value lock did NOT throw');
  } catch (e) {
    ok = e instanceof Error && e.message.startsWith('TEMPORAL LOCK VIOLATION');
    if (ok) pass('(d) the different-value lock THROWS (TEMPORAL LOCK VIOLATION — one-way, restart to re-anchor)');
    else fail(`(d) threw the wrong error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── (e) gateBars drops the two future bars (EXACTLY the anchor bar survives) ──
{
  const bars = [
    { timestamp: 1783321200000, open: 1.14, high: 1.14, low: 1.14, close: 1.14 },
    { timestamp: 1783702800000, open: 1.14, high: 1.14, low: 1.14, close: 1.14 },
    { timestamp: 1785211200000, open: 1.14, high: 1.14, low: 1.14, close: 1.14 },
  ];
  const gated = gateBars(bars);
  const ok = gated.length === 1 && gated[0]!.timestamp === 1783321200000;
  if (ok) pass(`(e) gateBars returns EXACTLY the anchor bar (${gated.length} kept — the 1783702800000 + 1785211200000 future bars DROPPED)`);
  else fail(`(e) gateBars returned ${gated.length} bars (expected 1 — the two future bars must be dropped)`);
}

// ── (f) the verdict ──
console.log('');
if (failures === 0) {
  console.log('=== VERDICT: PASS — the temporal gate is uncircumventable (all six assertions) ===');
} else {
  console.log(`=== VERDICT: FAIL (${failures} assertion(s) failed) ===`);
}
process.exit(failures > 0 ? 1 : 0);
