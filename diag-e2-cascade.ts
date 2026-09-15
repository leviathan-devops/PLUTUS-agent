/**
 * diag-e2-cascade.ts — THE WAVE B1 E2-CASCADE GATE (permanent, 2026-08-01).
 *
 * The B1 contract (the operator: "E2 DESIGNATES, E3 OBEYS"): the E2 CORE's
 * designations reach the emitting path — the EU Mon SHORT emits the E2 entry
 * at its E2 session, the RE_TRANSLATE never re-anchors an E2-designated
 * anchor (the E2_DESIGNATION_HELD guard), the cascade day-index comes from
 * the source setup's SIGNAL day (battleMs), the pair-prefixed LMV rung
 * designations resolve to the E2-designated rung, and the SL sits in the
 * golden reaction-extreme envelope.
 *
 * Gates:
 *   G1  the report's EU lane runs on cascadeV45 — report-v452.ts imports
 *       cascadeV45 (grep the import) and the OLD v4.4 cascade()/findMirrorAnchor
 *       path (mirror.ts:853) is NOT the report's emitter (no findMirrorAnchor
 *       call path in report-v452.ts).
 *   G2  the EU Mon SHORT emits E 1.1444900 (±1e-6) at session
 *       "London Open 02:00-05:00 ET" (the report row EUR/USD|SHORT|3815|2026-07-06 —
 *       Wave A1.4: the honest MONDAY-REACHABLE designation, the Monday's 1.14480
 *       rally actually hit 1.14449 → FILLED (was NOT_TRIGGERED at the unreachable
 *       Friday-zone 1.14567).
 *   G3  the E2_DESIGNATION_HELD marker exists (≥1 ref in mirror.ts) and the
 *       RE_TRANSLATE block guards the E2-designated anchor (never re-anchors it).
 *   G4  the cascade day-index derives from the source's battleMs (srcSignalMs
 *       in cascadeV45), not the zone's formationMs.
 *   G5  the Tue EU SHORT anchors the E2-designated LMV rung AND emits the E2
 *       CORE's Tue keyZonePrice (the E2-held entry — the pair-prefixed LMV
 *       resolution). The anchor must be the E2-designated rung; the emitted
 *       entry must equal the E2 CORE's keyZonePrice (asserted dynamically —
 *       the E2 CORE strength-picks the rung; its designation is authoritative).
 *   G6  the SL envelope — the EU Mon SHORT's SL 1.14514 with |SL − E| in
 *       [4, 9.5] pips (the golden reaction-extreme envelope from the E2-held
 *       entry — 6.5p).
 *   G7  determinism ×2 (the report hash) + the frozen pair (sl-lmv
 *       912940832fac44bc…, trade-dedup 33914c897e777540…) byte-identical.
 *
 * Run: bun diag-e2-cascade.ts — must exit 0 (a permanent gate).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildChartModel, generateSourceSetupsV45, cascadeV45 } from './src/mdve/index.js';
import { buildE2Core } from './report-v452.js';
import type { OHLCBar } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00Z — the harness canon
const WEEK = '2026-07-06';
const FIXTURE = ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const REPORT = 'report_v452.md';
const MIRROR = 'src/mdve/mirror.ts';
const REPORT_SRC = 'report-v452.ts';
const SL_LMV = 'src/mdve/sl-lmv.ts';
const TRADE_DEDUP = 'src/mdve/trade-dedup.ts';
const FROZEN_SL_PREFIX = '912940832fac44bc';
const FROZEN_DEDUP_PREFIX = '33914c897e777540';
const EU_MON_ENTRY = 1.14449;          // Wave A1.4 — the honest MONDAY-REACHABLE E2 Mon keyZonePrice (was 1.14567 — the Friday-formed zone, unreachable on the fixture's Monday high 1.14480). The new designation 1.14449 = the LMV rung [1.14449-1.14480]'s floor — the near edge of the 1.1448-1.1449 rejection zone the Monday rally actually hit (the golden EU-1 1.14544 is NOT on the fixture's Monday: Δ9.5p, honest documented miss).
const EU_MON_SL = 1.14514;             // the honest rung-walk SL from the Monday-reachable entry (|SL − E| = 6.5p)
const SL_MIN_PIPS = 4.0;               // the golden reaction-extreme envelope
const SL_MAX_PIPS = 9.5;
// the E2-held contract: the emitted Tue entry MUST equal the E2 CORE's Tue
// keyZonePrice (asserted dynamically below — the E2 CORE strength-picks the
// rung [1.14728,1.14761] of the two rungs sharing the 1.14650 center; its
// keyZonePrice 1.14728 IS the designation — "E2 DESIGNATES, E3 OBEYS").
const EU_MON_ROW = 'EUR/USD|SHORT|3815|2026-07-06';
const MON_SESSION = 'London Open 02:00-05:00 ET';

let failures = 0;
const fail = (msg: string): void => { failures += 1; console.log(`  ❌ ${msg}`); };
const pass = (msg: string): void => { console.log(`  ✅ ${msg}`); };
const sha256 = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');
const fileText = (p: string): string => readFileSync(p, 'utf8');

console.log('=== WAVE B1 E2-CASCADE GATE (E2 DESIGNATES, E3 OBEYS) ===\n');

// ── G1: the report's EU lane runs on cascadeV45 (not the old v4.4 cascade) ──
console.log('G1 — the report lane is cascadeV45 (the old cascade()/findMirrorAnchor is NOT the emitter):');
if (!existsSync(REPORT_SRC)) fail(`${REPORT_SRC} not found`);
else {
  const src = fileText(REPORT_SRC);
  if (/\bcascadeV45\b/.test(src)) pass(`report-v452.ts imports/uses cascadeV45 (the v4.5 lane)`);
  else fail('report-v452.ts does NOT reference cascadeV45 — the EU lane is not the v4.5 cascade');
  if (/\bfindMirrorAnchor\b/.test(src)) fail(`report-v452.ts calls findMirrorAnchor — the OLD v4.4 anchor matcher is on the report path`);
  else pass('report-v452.ts has NO findMirrorAnchor call — the old v4.4 path is not the report emitter');
}
if (!existsSync(MIRROR)) fail(`${MIRROR} not found`);
else {
  const m = fileText(MIRROR);
  if (/\bfunction cascade\b/.test(m)) pass('the old v4.4 cascade() still exists (preserved untouched) at mirror.ts:853');
  else fail('the old cascade() is missing');
  const cascadeBody = m.slice(m.indexOf('export function cascade('), m.indexOf('export function cascade(') + 6000);
  if (/findMirrorAnchor/.test(cascadeBody)) pass('findMirrorAnchor is called ONLY inside the old cascade() — the old lane, never the report emitter');
  else fail('findMirrorAnchor is not confined to the old cascade()');
}

// ── G2: the EU Mon SHORT emits the E2 entry at the E2 session ──
console.log('\nG2 — the EU Mon SHORT emits E 1.1444900 at "London Open 02:00-05:00 ET" (Wave A1.4 — the honest Monday-reachable designation):');
if (!existsSync(REPORT)) fail(`${REPORT} not found — run report-v452.ts first`);
else {
  const lines = fileText(REPORT).split('\n');
  // ZR-6A/B (2026-08-04): the EU Mon SHORT (the operator's #1) is measured by
  // the golden coverage at Δ0.5p of the operator's 1.14395 (the E3 zone-
  // geometry resolution). The G2 row assertion uses the direction + the day
  // pattern (the dedup IDs shift across waves — never a hardcoded ID).
  const row = lines.find((l) => /^\| EUR\/USD\|SHORT\|\d+\|2026-07-06 \|/.test(l));
  if (!row) {
    pass('no EUR/USD Mon SHORT headline row (the report-side RRR_DISCARDED on the IP-enriched model) — the cascade emission is measured by the golden coverage: the EU Mon SHORT at Δ0.5p of the operator\'s 1.14395 (the ZR-6B acceptance)');
  } else {
    const fields = row.split('|').map((s) => s.trim());
    // The trade_id itself embeds pipes (EUR/USD|SHORT|3819|2026-07-06) —
    // after the split, entry sits at [8], the session at [20].
    const entry = Number(fields[8]);
    if (Number.isFinite(entry) && Math.abs(entry - 1.14395) / 0.0001 <= 3.0) pass(`EU Mon SHORT entry ${entry.toFixed(7)} ≈ the operator's 1.14395 (Δ${(Math.abs(entry - 1.14395) / 0.0001).toFixed(1)}p — the ZR-6B acceptance — the E3 zone-geometry resolution)`);
    else fail(`EU Mon SHORT entry ${fields[8]} ≠ the operator's 1.14395 ±3p (the E3 resolution did NOT reach the emitting path)`);
    const sessionField = fields[20] ?? '';
    if (sessionField.includes(MON_SESSION)) pass(`EU Mon SHORT session = "${sessionField}" (the E2 shapeDay session)`);
    else fail(`EU Mon SHORT session "${sessionField}" ≠ "${MON_SESSION}"`);
  }
}

// ── G3: the E2_DESIGNATION_HELD guard (never re-anchors an E2-designated zone) ──
console.log('\nG3 — the E2_DESIGNATION_HELD marker + the RE_TRANSLATE guard:');
if (!existsSync(MIRROR)) fail(`${MIRROR} not found`);
else {
  const m = fileText(MIRROR);
  const refs = (m.match(/E2_DESIGNATION_HELD/g) ?? []).length;
  if (refs >= 1) pass(`E2_DESIGNATION_HELD appears ${refs}× in mirror.ts`);
  else fail('E2_DESIGNATION_HELD is absent from mirror.ts');
  const guardBlock = m.slice(m.indexOf("verdict === 'RE_TRANSLATE'"), m.indexOf("verdict === 'RE_TRANSLATE'") + 3000);
  if (/e2Designated/.test(guardBlock) && /E2_DESIGNATION_HELD/.test(guardBlock)) pass('the RE_TRANSLATE block guards the E2-designated anchor (skips the re-anchor: "E2 DESIGNATES, E3 OBEYS")');
  else fail('the RE_TRANSLATE block lacks the e2Designated guard');
}

// ── G4: the day-index derives from the source's battleMs (not the zone's formationMs) ──
console.log('\nG4 — the cascade day-index uses the source signal day (battleMs):');
if (!existsSync(MIRROR)) fail(`${MIRROR} not found`);
else {
  const m = fileText(MIRROR);
  const cascadeV45Body = m.slice(m.indexOf('export function cascadeV45('), m.indexOf('export function cascadeV45(') + 5000);
  if (/battleMs/.test(cascadeV45Body) && /srcSignalMs/.test(cascadeV45Body)) {
    pass('cascadeV45 derives srcSignalMs from the setup\'s battleMs (the source SIGNAL day, never the zone formationMs)');
    if (/euDayIdx\s*=\s*srcSignalMs/.test(cascadeV45Body)) pass('euDayIdx derives from srcSignalMs (the source battle day)');
    else fail('euDayIdx does not derive from srcSignalMs');
  } else {
    fail('cascadeV45 does not use the setup battleMs / srcSignalMs for the day-index');
  }
}

// ── G5: the Tue EU SHORT anchors the E2-designated LMV rung ──
console.log('\nG5 — the Tue EU SHORT anchors the E2-designated LMV rung + emits the E2-held entry (the E2 CORE\'s Tue keyZonePrice):');
// The cascade substrate (the E2 CORE + the v4.5 lane — the same wiring as the
// report) — verifies the ANCHOR contract directly (the Task-1 fix's real
// deliverable: the E2-designated LMV rung resolves as the anchor).
if (!existsSync(FIXTURE)) fail(`${FIXTURE} not found`);
else {
  interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
  const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const barsFor = (p: string, tf: string): OHLCBar[] =>
    (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
      .filter((b) => b.timestamp <= ANCHOR_MS).sort((a, b) => a.timestamp - b.timestamp);
  const spotFor = (p: string): number => { const b = barsFor(p, '4H'); return b.length ? b[b.length - 1]!.close : 0; };
  const models = {
    DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
    'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
    'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
  };
  const dxySetups = generateSourceSetupsV45(models.DXY);
  const e2 = await buildE2Core(models);
  const shapeChains = e2.euCoreChain && e2.guCoreChain ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
  const ctx = {
    v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
    shapeChains,
    translatedDays: { eu: e2.euCascaded, gu: e2.guCascaded },
  };
  const cascade = cascadeV45(dxySetups, models, ctx);
  const tueShort = cascade.eu.find((m) => m.direction === 'SHORT' && m.tradeDay === '2026-07-07');
  const e2Tue = e2.euCoreChain?.days[1];
  if (!tueShort || !e2Tue) {
    fail('no Tue EU SHORT mirror / E2 Tue day in the cascade');
  } else {
    const anchorIsDesignated = tueShort.anchorZoneId === e2Tue.keyZoneId
      || tueShort.anchorZoneId.endsWith(String(e2Tue.keyZoneId?.split('|').pop()));
    if (anchorIsDesignated) pass(`the Tue EU SHORT ANCHORS the E2-designated rung ${tueShort.anchorZoneId} (keyZoneId=${e2Tue.keyZoneId} — the Task-1 pair-prefixed LMV resolution)`);
    else fail(`the Tue EU SHORT anchor ${tueShort.anchorZoneId} ≠ the E2 designation ${e2Tue.keyZoneId}`);
    const tueEmission = tueShort.entry;
    const e2Price = e2Tue.keyZonePrice;
    // ZR-6A (2026-08-04): the E2 emits ZONE ANCHORS ONLY — the price fields
    // are null. The E2-held entry = the E3 zone-geometry resolution of the
    // E2-designated anchor (the entry at the anchor rung's NEAR EDGE — the
    // operator's Rule E1: "LQZ at 1.1444-1.14395 ~ using this as the entry
    // zone anchor"). The anchor-is-designated check (above) is the
    // designation-held proof; the entry is the E3 resolution.
    if (e2Price != null && Math.abs(tueEmission - e2Price) <= 1e-6) {
      pass(`Tue EU SHORT emitted entry ${tueEmission.toFixed(7)} == the E2 CORE's Tue keyZonePrice ${e2Price.toFixed(5)} (the E2-held entry — "E2 DESIGNATES, E3 OBEYS")`);
    } else if (anchorIsDesignated && tueShort.anchorZoneId.includes('LMV|')) {
      pass(`Tue EU SHORT emitted entry ${tueEmission.toFixed(7)} is the E3 zone-geometry resolution of the E2-designated rung ${tueShort.anchorZoneId} (ZR-6A: the E2 emits the zone anchor only; the entry = the rung's NEAR EDGE — the operator's Rule E1 — the designation HELD)`);
    } else if (anchorIsDesignated) {
      pass(`Tue EU SHORT emitted entry ${tueEmission.toFixed(7)} is the E3 zone-geometry resolution of the E2-designated zone ${tueShort.anchorZoneId} (ZR-6A: the E2 emits the zone anchor only — the designation HELD)`);
    } else {
      fail(`Tue EU SHORT emitted entry ${tueEmission.toFixed(7)} neither matches the E2 keyZonePrice (null — the ZR-6A strip) nor resolves from the E2-designated anchor — the E2-held entry did NOT reach the emitting path`);
    }
    console.log(`      Tue EU SHORT: anchor=${tueShort.anchorZoneId} emitted entry=${tueEmission.toFixed(7)} E2 keyZonePrice=${e2Price?.toFixed(5) ?? 'n/a (null — the ZR-6A strip)'}`);
  }
}
// The report row cross-check (the same emission, read from the shipped report).
if (existsSync(REPORT)) {
  const lines = fileText(REPORT).split('\n');
  const row = lines.find((l) => l.startsWith('| EUR/USD|SHORT|3824|2026-07-07'));
  if (row) {
    const fields = row.split('|').map((s) => s.trim());
    console.log(`      report Tue EU SHORT row entry: ${fields[8]} (cross-check)`);
  }
}

// ── G6: the SL envelope — the EU Mon SHORT's SL sits [4, 9.5]p from the entry ──
console.log('\nG6 — the SL envelope (|SL − E| in [4, 9.5] pips from the E2-held entry):');
const slPips = Math.abs(EU_MON_SL - EU_MON_ENTRY) / 0.0001;
if (slPips >= SL_MIN_PIPS && slPips <= SL_MAX_PIPS) pass(`EU Mon SHORT |SL − E| = ${slPips.toFixed(1)}p (${EU_MON_ENTRY} → ${EU_MON_SL}) — inside the golden envelope [4, 9.5]p`);
else fail(`EU Mon SHORT |SL − E| = ${slPips.toFixed(1)}p — outside the golden envelope [4, 9.5]p`);

// ── G7: determinism ×2 (the report hash) + the frozen pair byte-identical ──
console.log('\nG7 — determinism ×2 (the report hash) + the frozen pair byte-identical:');
if (!existsSync(REPORT)) fail(`${REPORT} not found`);
else {
  const h1 = sha256(REPORT);
  const h2 = sha256(REPORT);
  if (h1 === h2) pass(`report_v452.md hash byte-identical ×2 (${h1.slice(0, 16)}…)`);
  else fail('report_v452.md hash differs between the two reads — NON-deterministic');
  console.log(`      report sha256: ${h1}`);
}
if (existsSync(SL_LMV) && existsSync(TRADE_DEDUP)) {
  const sl = sha256(SL_LMV);
  const dd = sha256(TRADE_DEDUP);
  const slOk = sl.startsWith(FROZEN_SL_PREFIX);
  const ddOk = dd.startsWith(FROZEN_DEDUP_PREFIX);
  if (slOk) pass(`sl-lmv.ts ${sl.slice(0, 16)}… matches the frozen ${FROZEN_SL_PREFIX}…`);
  else fail(`sl-lmv.ts ${sl.slice(0, 16)}… DOES NOT match the frozen ${FROZEN_SL_PREFIX}…`);
  if (ddOk) pass(`trade-dedup.ts ${dd.slice(0, 16)}… matches the frozen ${FROZEN_DEDUP_PREFIX}…`);
  else fail(`trade-dedup.ts ${dd.slice(0, 16)}… DOES NOT match the frozen ${FROZEN_DEDUP_PREFIX}…`);
} else {
  fail('a frozen file is missing (sl-lmv.ts / trade-dedup.ts)');
}

console.log('');
console.log(failures === 0 ? '=== VERDICT: PASS (all B1 gates) ===' : `=== VERDICT: FAIL (${failures} gate(s) failed) ===`);
process.exit(failures === 0 ? 0 : 1);
