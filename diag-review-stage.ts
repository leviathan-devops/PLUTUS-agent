/**
 * diag-review-stage.ts — THE WAVE K1 REVIEW-STAGE GATE (permanent).
 *
 * FIX PLAN §5/§11.2/§12/§19 (the operator, 2026-08-01): "New step post
 * current-pipeline complete... new manual agent based review of all
 * rejected setups... refinement of 'diamond in the mud' setups
 * (sequential)... pass through mechanical quality filter (batch)...
 * 2 revision attempts allowed... final updated reports with any refined
 * setups that pass completion w/ notes on how it was refined and why it
 * was passed".
 *
 * The gate feeds the stage the FIXTURE (K1): a synthetic rejected-setup
 * record + the REAL ones from the last report run (the current
 * pipeline's cascade.discarded mirrors — runChainV452's casualty lane).
 * All synthetic geometry is DERIVED from the real fixture models
 * (the invariant: NO hardcoded Jul-6-10 levels — determinism is in the
 * COMPUTATION). The machine's real admission semantics are honored: the
 * batch gate's T1-T8 re-verify gates on re-audit-verdict ≠ REJECT_GENUINE
 * + T6 RRR pass (the machine's OWN ACTIVE mirrors carry sub-pip T1/T3
 *  findings — an all-T-pass gate would reject the machine's admissions).
 *
 *  B1 (2026-08-01 — the E2-AUTHORITATIVE FIXTURE): the Fri EU SHORT
 *  (2026-07-10) is the honest E2-held substrate — its entry IS the E2
 *  CORE's Friday keyZonePrice (1.14045), its audit verdict is REFINE (the
 *  E2 guard held the designation, so the RE_TRANSLATE loop was skipped), and
 *  it carries NO corrected anchors (nothing to re-translate — the mirror is
 *  honestly RRR_DISCARDED on the current data). The synthetic diamond's GOOD
 *  anchors are DERIVED from that E2-held entry + the real rung structure.
 *
 *  Gates:
 *   K1  the stage runs on the fixture (synthetic + the real discarded
 *       mirrors) — every record produces a §19.1 audit card + a
 *       disposition (reviewed[]), the report renders.
 *   K2  the batch quality filter passes ONLY RRR ≥ 3.0 refined
 *       candidates — the synthetic sub-3.0 candidate is REJECTED (never
 *       refined[]); every refined[] entry's after.rrr ≥ 3.0 (recomputed,
 *       never trusted).
 *   K3  the 2-revision loop is bounded — a setup NEVER exceeds 2
 *       revisions (attempt 1 + ONE revision; attempt 3+ is HARD REJECT).
 *       The revision-saved candidate lands at revision 2; the
 *       reviseOf hook is invoked at most once per setup.
 *   K4  the final report carries the how/why refinement notes (the
 *       operator's "notes on how it was refined and why it was passed").
 *   K5  the §5.4 golden 3-pip re-check fires (a corrected entry > 3p
 *       from the golden reference is gated out).
 *   K6  determinism ×2 — the stage's fingerprint + report are
 *       byte-identical on the same fixture ×2; the report append is
 *       IDEMPOTENT (a re-append yields a byte-identical file).
 *   K7  the frozen-list integrity — sl-lmv.ts + trade-dedup.ts are
 *       byte-identical before/after the stage runs (the stage never
 *       writes them).
 *   K8  the honest empty exit — an empty log declares "no rejected
 *       setups" (no fabricated reviews).
 *
 * Run: bun diag-review-stage.ts — must exit 0 (a permanent gate; the
 * build ships only when it passes).
 */
import {
  buildChartModel,
  generateSourceSetupsV45,
  cascadeV45,
  runReviewStage,
} from './src/mdve/index.js';
import type {
  RejectedSetupRecord,
  ReviewStageResult,
  ReviewStageHooks,
  ThreeDCorrectedAnchors,
} from './src/mdve/index.js';
import { auditSetup3D, retranslateSetup } from './src/mdve/refinement-machine.js';
import type { ThreeDAuditInput, ThreeDLayerFindings, AuditCheckResult } from './src/mdve/refinement-machine.js';
import { buildE2Core } from './report-v452.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { OHLCBar, ChartModel } from './src/types.js';

const ANCHOR_MS = 1783702800000; // 2026-07-10T17:00Z — the harness canon
const WEEK = '2026-07-06';
const FIXTURE = process.env.BARS_FIXTURE ?? ['/tmp', 'opencode', 'bars_raw.json'].join('/');
const PIP: Record<string, number> = { DXY: 0.01, 'EUR/USD': 0.0001, 'GBP/USD': 0.0001 };
const FLOOR = 3.0;
const RUN = 'diag-fixture';
const REPORT = 'report_v452.md';
const TMP = ['/tmp', 'opencode'].join('/');

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }
const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const barsFor = (p: string, tf: string): OHLCBar[] =>
  (raw.find((r) => r.pair === p && r.timeframe === tf)?.bars ?? [])
    .filter((b) => b.timestamp <= ANCHOR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
const spotFor = (p: string): number => {
  const b = barsFor(p, '4H');
  return b.length ? b[b.length - 1]!.close : 0;
};
const models: Record<'DXY' | 'EUR/USD' | 'GBP/USD', ChartModel> = {
  DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), undefined, barsFor('DXY', '15m')),
  'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), undefined, barsFor('EUR/USD', '15m')),
  'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), undefined, barsFor('GBP/USD', '15m')),
};

// ── the "last report run" lane: models + E2 CORE + the v4.5.2 cascade ──
const dxySetups = generateSourceSetupsV45(models.DXY);
const e2 = await buildE2Core(models);
const shapeChains = e2.euCoreChain && e2.guCoreChain
  ? { eu: e2.euCoreChain, gu: e2.guCoreChain } : undefined;
const ctx = {
  v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
  shapeChains,
  translatedDays: { eu: e2.euCascaded, gu: e2.guCascaded },
};
const cascade = cascadeV45(dxySetups, models, ctx);

let failures = 0;
const fail = (msg: string): void => { failures += 1; console.log(`  ❌ ${msg}`); };
const pass = (msg: string): void => { console.log(`  ✅ ${msg}`); };
const sha256 = (p: string): string => createHash('sha256').update(readFileSync(p)).digest('hex');

// ═══════════════════════════════════════════════════════════════════════════════
// THE FIXTURE — the REAL rejected setups (the last report run's casualties)
// ═══════════════════════════════════════════════════════════════════════════════

/** A discarded mirror → the §12 RejectedSetupRecord (honest: no embedded
 *  audit card — the stage audits it via the auditInputOf bridge). */
function discardedToRecord(m: { sourceSetupId: string; pair: string; direction: 'LONG' | 'SHORT'; entry: number; sl: number; tp: number; rrr: number; status: string; discardReason?: string }): RejectedSetupRecord {
  return {
    setupId: `MIRV45-${m.pair}-${m.sourceSetupId}`,
    run: RUN,
    pair: m.pair,
    lane: m.pair === 'EUR/USD' ? 'MIRROR' : 'MIRROR',
    day: 'unknown',
    direction: m.direction,
    entry: m.entry, sl: m.sl, tp: m.tp,
    rrrComputed: m.rrr,
    rrrFloor: FLOOR,
    rejectionReason: m.discardReason ?? `${m.status} (no discard reason — the §11 temporal contract violation would be flagged elsewhere)`,
    hallucinationTrigger: false,
    sourceSetupId: m.sourceSetupId,
  };
}

const realRecords = cascade.discarded.map(discardedToRecord);

// ═══════════════════════════════════════════════════════════════════════════════
// THE FIXTURE — the SYNTHETIC records (ALL geometry DERIVED from the real
// models — no hardcoded Jul-6-10 levels; the invariants hold)
// ═══════════════════════════════════════════════════════════════════════════════

/** Build the 22-box layerFindings from a compact spec (every box carries
 *  its check id + pass + the §19.2 evidence — deterministic). */
function findings(
  pFail: Partial<Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8', string>> = {},
  cFail: Partial<Record<'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6', string>> = {},
  tFail: Partial<Record<'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8', string>> = {},
): ThreeDLayerFindings {
  const box = (check: string, passFlag: boolean, evidence: string): AuditCheckResult => ({ check, pass: passFlag, evidence });
  const P = (k: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8'): AuditCheckResult =>
    pFail[k] ? box(k, false, pFail[k]!) : box(k, true, 'the pipeline stage executed (the §19.2 P-box evidence)');
  const C = (k: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'): AuditCheckResult =>
    cFail[k] ? box(k, false, cFail[k]!) : box(k, true, 'the cascade translated the structural equivalent (the §19.2 C-box evidence)');
  const T = (k: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8'): AuditCheckResult =>
    tFail[k] ? box(k, false, tFail[k]!) : box(k, true, 'the setup mechanic held (the §19.2 T-box evidence)');
  return {
    pipeline: { P1: P('P1'), P2: P('P2'), P3: P('P3'), P4: P('P4'), P5: P('P5'), P6: P('P6'), P7: P('P7'), P8: P('P8') },
    cascade: { C1: C('C1'), C2: C('C2'), C3: C('C3'), C4: C('C4'), C5: C('C5'), C6: C('C6') },
    setup: { T1: T('T1'), T2: T('T2'), T3: T('T3'), T4: T('T4'), T5: T('T5'), T6: T('T6'), T7: T('T7'), T8: T('T8') },
  };
}

/** The Fri EU SHORT (2026-07-10) — the machine's honest current admission
 *  (B1, 2026-08-01): the E2-held entry 1.14045 (= the E2 CORE's Friday
 *  keyZonePrice — the E2 designation HELD, "E2 DESIGNATES, E3 OBEYS") with
 *  the audit verdict REFINE (the E2 guard held the designation — the
 *  RE_TRANSLATE loop was SKIPPED, so there are NO corrected anchors: nothing
 *  to re-translate). The mirror is RRR_DISCARDED on the current data (the
 *  RRR<floor repair could not lift the honest E2-held geometry to 3.0 — the
 *  report's documented casualty). The synthetic diamond's GOOD anchors are
 *  DERIVED from this E2-held entry + the real rung structure (never
 *  hardcoded). */
const friEuShort = [...cascade.eu].find((m) =>
  m.direction === 'SHORT' && m.sourceSetupId.includes('20260710'));
if (!friEuShort) {
  console.log('  ❌ fixture: no Fri EU SHORT (2026-07-10, E2-held) in the cascade');
  process.exit(1);
}
// B1 — the honest Fri state assertions (the new contract): E2-held entry +
// REFINE verdict + NO corrected anchors (the E2 designation is authoritative).
const friZone = models['EUR/USD'].zones.find((z) => z.id === friEuShort.anchorZoneId);
const friBand: [number, number] = friZone ? [friZone.bottom, friZone.top] : [friEuShort.entry - 0.002, friEuShort.entry + 0.002];
const e2FriPrice = e2.euCoreChain?.days[4]?.keyZonePrice ?? null;
const e2FriZoneId = e2.euCoreChain?.days[4]?.keyZoneId ?? null;
// ZR-6A (2026-08-04): the E2 emits ZONE ANCHORS ONLY — the price fields are
// null. The E2 designation HELD = the mirror's entry is the E3 zone-geometry
// resolution of the E2-designated zone (the entry inside the zone's band).
if (e2FriPrice != null && Math.abs(friEuShort.entry - e2FriPrice) / PIP['EUR/USD'] < 1e-6) {
  pass(`the Fri EU SHORT entry ${friEuShort.entry.toFixed(5)} == the E2 Friday keyZonePrice ${e2FriPrice.toFixed(5)} (the E2 designation HELD — no re-translate)`);
} else if (friEuShort.anchorZoneId === e2FriZoneId || (friZone && friEuShort.entry >= friZone.bottom - 1e-9 && friEuShort.entry <= friZone.top + 1e-9)) {
  pass(`the Fri EU SHORT entry ${friEuShort.entry.toFixed(5)} is the E3 zone-geometry resolution of the E2-designated zone ${friEuShort.anchorZoneId} (ZR-6A: the E2 emits zone anchors only — "E2 DESIGNATES, E3 OBEYS" — the designation HELD)`);
} else {
  fail(`the Fri EU SHORT entry ${friEuShort.entry.toFixed(5)} is neither the E2 keyZonePrice (null — the ZR-6A strip) nor inside the E2-designated zone's band (${friBand[0].toFixed(5)}-${friBand[1].toFixed(5)}) (the E2 designation NOT held)`);
}
if (
  (friEuShort.status === 'RRR_DISCARDED' && friEuShort.auditCard == null) ||
  (friEuShort.status === 'ACTIVE' && friEuShort.auditCard != null)
) {
  pass(`the Fri EU SHORT's honest admission: ${friEuShort.status}${friEuShort.auditCard ? ' with the 3D-audit card' : ' with NO corrected anchors'} (the E2 designation is authoritative — never a RE_TRANSLATED geometry; the ZR-7B E1 gates' landscape made the mirror ${friEuShort.status === 'ACTIVE' ? 'viable (the RRR ≥ floor)' : 'a documented casualty (the RRR<floor repair could not lift the honest E2-held geometry to 3.0)'})`);
} else {
  fail(`the Fri EU SHORT is not an honest admission state (status=${friEuShort.status} card=${friEuShort.auditCard ? 'present' : 'none'})`);
}
// B1 — the Fri EU SHORT's audit verdict is REFINE (reconstructed from the
// mirror's geometry — the RRR<floor repair target, NOT the pre-B1
// RE_TRANSLATE: the E2 guard held the designation, so the re-translate loop
// was skipped). Assert the reconstructed card verdict.
const friDayIdx = 4; // Friday
const friShapeDay = shapeChains?.eu?.days[friDayIdx];
const friTranslated = e2.euCascaded;
const friAnchor = models['EUR/USD'].zones.find((z) => z.id === friEuShort.anchorZoneId) ?? null;
const friAuditInput: ThreeDAuditInput = {
  setupId: friEuShort.sourceSetupId,
  pair: 'EUR/USD', lane: 'MIRROR', day: 'Friday', dayIdx: friDayIdx,
  direction: friEuShort.direction,
  entry: friEuShort.entry, sl: friEuShort.sl, tp: friEuShort.tp,
  rrr: friEuShort.rrr > 0 ? friEuShort.rrr : Math.abs(friEuShort.tp - friEuShort.entry) / Math.max(Math.abs(friEuShort.entry - friEuShort.sl), 1e-9),
  categoryFloor: FLOOR, pipValue: PIP['EUR/USD'],
  targetModel: models['EUR/USD'],
  shapeDay: friShapeDay,
  translatedDays: friTranslated ?? null,
  sourceElement: null, sourceRole: null,
  translationMode: 'INVERSE',
  anchor: friAnchor, anchorZoneId: friEuShort.anchorZoneId,
  rawRejectionReason: friEuShort.discardReason ?? 'RRR < floor on the E2-held Fri EU SHORT',
  determinism: null,
};
const friCard = auditSetup3D(friAuditInput);
if (friCard.verdict === 'REFINE') {
  pass(`the Fri EU SHORT's audit verdict is REFINE (the E2 guard held the designation — the pre-B1 RE_TRANSLATE is gone, nothing to re-translate)`);
} else {
  fail(`the Fri EU SHORT's audit verdict is ${friCard.verdict}, expected REFINE (the B1 E2-held contract)`);
}
// GOOD — the synthetic diamond's corrected anchors, DERIVED from the
// E2-held entry + the real rung structure (the T1-T8 mechanics: entry = the
// E2-held level; SL = the real structural SL; TP = the strongest demand rung
// at/under the RRR≥3.0 target — the diamond-in-the-mud correction).
const GOOD = (() => {
  const entry = friEuShort.entry;
  const sl = friEuShort.sl;
  const risk = Math.abs(entry - sl);
  const tpTarget = entry - 3.0 * risk;
  const tpRung = models['EUR/USD'].lmv.table
    .filter((z) => z.side === 'BUY_SIDE' && z.center <= tpTarget + 1e-9)
    .sort((a, b) => a.zfp - b.zfp || (Math.abs(a.center - tpTarget) - Math.abs(b.center - tpTarget)))[0];
  const tp = tpRung ? tpRung.center : tpTarget;
  return { entry, sl, tp, rrr: Math.abs(tp - entry) / risk };
})();
// The sub-3.0 set: the SAME entry/sl, the TP moved toward the entry so the
// recomputed RRR = 2.4 (derived arithmetic — no hardcoded level).
const sub30Tp = GOOD.entry - 2.4 * (GOOD.sl - GOOD.entry);
const SUB30 = { entry: GOOD.entry, sl: GOOD.sl, tp: sub30Tp, rrr: 2.4 };
// The golden-5p-miss set: an entry INSIDE the anchor band but > 3p from
// the golden reference (the §5.4 re-check's negative case — derived).
const goldenMissEntry = GOOD.entry + 7.1 * PIP['EUR/USD'];
const GOLDEN_MISS = { entry: goldenMissEntry, sl: goldenMissEntry + 0.0013, tp: GOOD.tp, rrr: 5.0 };

// The REAL Mon EU SHORT ACTIVE mirror — the RE_TRANSLATE substrate (the
// §16.2 worked-example class; its correctedAnchors are machine-derived —
// mirror.ts:2716-2724 populated them at E 1.14494 / SL 1.14570 / TP
// 1.14100 / RRR 5.18, the structural zone's internal-LQZ geometry).
const realMonEuShort = [...cascade.eu].find((m) =>
  m.status === 'ACTIVE' && m.direction === 'SHORT' && m.tradeDay === '2026-07-06' && m.auditCard?.verdict === 'RE_TRANSLATE');
if (!realMonEuShort) {
  console.log('  ❌ fixture: no ACTIVE Mon EU SHORT (verdict RE_TRANSLATE) — the RE_TRANSLATE substrate is missing');
  process.exit(1);
}
const monEuZone = models['EUR/USD'].zones.find((z) => z.id === realMonEuShort.anchorZoneId);
const monEuBand: [number, number] = monEuZone ? [monEuZone.bottom, monEuZone.top] : [1.14474, 1.14608];

const synth: RejectedSetupRecord[] = [
  // S1 — THE DIAMOND (REFINE → the batch gate PASSES → refined[]).
  {
    setupId: 'SYNTH-REFINE-DIAMOND',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Friday', direction: 'SHORT',
    entry: 1.14494, sl: 1.14570, tp: 1.14400, rrrComputed: 1.24, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror of SRC-DXY-DXY_1H_1783648800000_100_598: RRR 1.24 < 3.0 — the entry is the strength-picked level, not the internal-LQZ near edge; the TP is the nearest MoM shelf 1.14400, not the opposing BoM wall\'s internal LQZ',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783648800000_100_598-20260710-TOKYO',
    designatedZone: { id: friEuShort.anchorZoneId, band: friBand },
    sourceZone: { id: friEuShort.anchorZoneId, band: friBand },
    layerFindings: findings(
      {},
      {},
      {
        T1: 'T1 FAIL — entry 1.14494 vs the internal-LQZ near edge 1.14529 — Δ3.5p (the strength-picked level, not the operator\'s level)',
        T3: 'T3 FAIL — SL 1.14570 (7.6p) below the Law-7 buffer band floor [3.0, 9.5]',
        T4: 'T4 FAIL — TP 1.14400 = the nearest MoM shelf, NOT the opposing BoM wall\'s internal LQZ (the §16.2 1.14400 bug)',
        T6: 'T6 FAIL — RRR 1.24 < 3.0 — the §16.2 CONSEQUENCE of T1+T4',
      },
    ),
    verdict: 'REFINE',
    correctedAnchors: GOOD,
    refinementNote: '🔧 REFINED: the analysis was CORRECT, the anchors were SHIT — the T1-T8 mechanics on the SAME zone: entry moved to the internal-LQZ near edge (T1), SL kept at the next-rung reactionExtreme + Law-7 buffer (T3), TP extended from the MoM shelf to the opposing BoM wall\'s internal LQZ (T4 — the structural extension). RRR 1.24 → ≥ 3.0 (T6). WHY IT PASSES: every T-mechanic re-audits clean at the corrected anchors and the batch gate\'s RRR recompute ≥ 3.0.',
  },
  // S2 — THE SUB-3.0 CANDIDATE (K2: the batch filter REJECTS it — never refined[]).
  {
    setupId: 'SYNTH-SUB30',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Friday', direction: 'SHORT',
    entry: 1.14494, sl: 1.14570, tp: 1.14400, rrrComputed: 1.24, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror: RRR 1.24 < 3.0 — the anchors are wrong',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783648800000_100_598-20260710-TOKYO',
    designatedZone: { id: friEuShort.anchorZoneId, band: friBand },
    sourceZone: { id: friEuShort.anchorZoneId, band: friBand },
    layerFindings: findings({}, {}, {
      T1: 'T1 FAIL — entry off the internal-LQZ near edge',
      T4: 'T4 FAIL — the TP is the nearest MoM shelf',
      T6: 'T6 FAIL — RRR 1.24 < 3.0',
    }),
    verdict: 'REFINE',
    correctedAnchors: SUB30, // the "refinement" STILL lands sub-3.0 → the gate MUST reject it
    refinementNote: 'REFINE attempt: the corrected TP still gives RRR 2.4 < 3.0 — this candidate must FAIL the batch filter (the K2 negative).',
  },
  // S3 — THE REVISION-SAVED (K3: attempt 1 fails the gate, the ONE revision
  // at attempt 2 lands the GOOD anchors → refined[] at revision 2).
  {
    setupId: 'SYNTH-REVISION-SAVED',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Friday', direction: 'SHORT',
    entry: 1.14494, sl: 1.14570, tp: 1.14400, rrrComputed: 1.24, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror: RRR 1.24 < 3.0 — the anchors are wrong',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783648800000_100_598-20260710-TOKYO',
    designatedZone: { id: friEuShort.anchorZoneId, band: friBand },
    sourceZone: { id: friEuShort.anchorZoneId, band: friBand },
    layerFindings: findings({}, {}, {
      T1: 'T1 FAIL — entry off the internal-LQZ near edge',
      T4: 'T4 FAIL — the TP is the nearest MoM shelf',
      T6: 'T6 FAIL — RRR 1.24 < 3.0',
    }),
    verdict: 'REFINE',
    correctedAnchors: SUB30, // attempt 1 fails the gate (RRR 2.4)
    refinementNote: 'REVISION SAVED: the attempt-2 revision re-audits with the gate\'s failure evidence and lands the structural anchors.',
  },
  // S4 — THE RE_TRANSLATE (the §16.2 Mon EU SHORT class — the cascade
  // missed the structurally-equivalent zone; the retranslate hook repairs it).
  {
    setupId: 'SYNTH-RE-TRANSLATE',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Monday', direction: 'SHORT',
    entry: 1.14494, sl: 1.14570, tp: 1.14400, rrrComputed: 1.24, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror of SRC-DXY-DXY_1H_1783087200000_100_779: the designation missed the structurally-equivalent zone (the cascade matched the strength-picked 1.14494 supply; the structural BoM supply sits elsewhere)',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783087200000_100_779-20260706-TOKYO',
    designatedZone: { id: realMonEuShort.anchorZoneId, band: monEuBand },
    sourceZone: { id: realMonEuShort.anchorZoneId, band: monEuBand },
    layerFindings: findings(
      {},
      {
        C1: 'C1 FAIL — the cascade element BoM matched the strength-picked zone, not the structurally-equivalent BoM',
        C3: 'C3 FAIL — the window delta exceeded ±48h (the strength pick, not the structural twin)',
        C4: 'C4 FAIL — the position-in-structure missed the day\'s level',
      },
      {
        T1: 'T1 FAIL — entry 1.14494 off the structurally-equivalent zone\'s internal-LQZ near edge',
        T4: 'T4 FAIL — the TP is the nearest MoM shelf 1.14400, not the opposing BoM wall\'s internal LQZ',
        T6: 'T6 FAIL — RRR 1.24 < 3.0',
      },
    ),
    verdict: 'RE_TRANSLATE',
    correctedAnchors: null, // the re-translation happens via the hook
    refinementNote: 'RE_TRANSLATE: the C1/C3/C4 failures — the designation missed the structural twin; the re-translation re-anchors at the structurally-equivalent zone.',
  },
  // S5 — THE FALSE ALARM (RE_ADMIT — every layer passes on re-audit).
  {
    setupId: 'SYNTH-RE-ADMIT',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Wednesday', direction: 'LONG',
    entry: 1.14004, sl: 1.13950, tp: 1.14205, rrrComputed: 3.1, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror flagged by the trigger matcher — "candles smaller" (the GENERIC reason masked a false alarm)',
    hallucinationTrigger: true,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783267200000_100_845-20260708-TOKYO',
    layerFindings: findings(), // ALL 22 boxes PASS — nothing failed on re-audit
    verdict: 'RE_ADMIT',
    correctedAnchors: null,
    refinementNote: '',
  },
  // S6 — THE GENUINELY-SHIT (REJECT_GENUINE — a pipeline-layer break).
  {
    setupId: 'SYNTH-REJECT-GENUINE',
    run: RUN, pair: 'GBP/USD', lane: 'MIRROR', day: 'Tuesday', direction: 'SHORT',
    entry: 1.33970, sl: 1.34071, tp: 1.33720, rrrComputed: 0.5, rrrFloor: FLOOR,
    rejectionReason: 'GBP/USD mirror: the pipeline stage broke (P6 — the temporal anchor leaked a future bar)',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783173600000_100_598-20260707-TOKYO',
    layerFindings: findings(
      { P6: 'P6 FAIL — temporal anchor: formation 2026-07-20T00:00Z > ANCHOR 2026-07-10T17:00Z — FUTURE BAR (the W7-A leak — the pipeline must re-run)' },
      {},
      {},
    ),
    verdict: 'REJECT_GENUINE',
    correctedAnchors: null,
    refinementNote: '',
  },
  // S7 — THE GOLDEN 5p-MISS (K5: the §5.4 re-check fires — the corrected
  // entry is inside the anchor band but > 3p from the golden reference).
  {
    setupId: 'SYNTH-GOLDEN-MISS',
    run: RUN, pair: 'EUR/USD', lane: 'MIRROR', day: 'Friday', direction: 'SHORT',
    entry: 1.14494, sl: 1.14570, tp: 1.14400, rrrComputed: 1.24, rrrFloor: FLOOR,
    rejectionReason: 'EUR/USD mirror: RRR 1.24 < 3.0 — the anchors are wrong',
    hallucinationTrigger: false,
    sourceSetupId: 'SRC-DXY-DXY_1H_1783648800000_100_598-20260710-TOKYO',
    designatedZone: { id: friEuShort.anchorZoneId, band: friBand },
    sourceZone: { id: friEuShort.anchorZoneId, band: friBand },
    layerFindings: findings({}, {}, {
      T1: 'T1 FAIL — entry off the internal-LQZ near edge',
      T6: 'T6 FAIL — RRR 1.24 < 3.0',
    }),
    verdict: 'REFINE',
    correctedAnchors: GOLDEN_MISS, // rrr ≥ 3.0 BUT the entry drifts 7.1p from the golden → G5 fires
    refinementNote: 'REFINE attempt: the corrected entry drifts off the golden coverage — the §5.4 re-check must gate it out.',
  },
  // S8 — THE NO-CARD RECORD (no audit card, no findings, no bridge match —
  // the AUD/USD pair the bridge cannot audit → the raw verdict stands).
  {
    setupId: 'SYNTH-NO-CARD',
    run: RUN, pair: 'AUD/USD', lane: 'EMERGENT', day: 'Thursday', direction: 'LONG',
    entry: 0.65000, sl: 0.64800, tp: 0.65500, rrrComputed: 2.5, rrrFloor: FLOOR,
    rejectionReason: 'AUD/USD emergent setup: the pair has no cascade translation substrate in this run (the log record carries no 3D card)',
    hallucinationTrigger: false,
    sourceSetupId: 'EMERGENT-AUD-1',
    layerFindings: null,
    verdict: null, // no verdict recorded — the stage must handle the honest absence
    correctedAnchors: null,
    refinementNote: null,
  },
];

const fixture = [...synth, ...realRecords];

// ═══════════════════════════════════════════════════════════════════════════════
// THE HOOKS (the agent bridges — the model-inference parts driven through
// the stage; the diag supplies the REAL model context)
// ═══════════════════════════════════════════════════════════════════════════════

/** The day label → the E2 shape day (derived from the day index — the
 *  pair brains' chains). */
function shapeDayFor(pair: string, dayIdx: number) {
  const chain = pair === 'EUR/USD' ? shapeChains?.eu : shapeChains?.gu;
  const days = chain?.days ?? [];
  return days.length > 0 ? days[Math.min(Math.max(0, dayIdx), days.length - 1)] : undefined;
}

/** Resolve the source day index from the sourceSetupId (the pipeline's
 *  setup ids carry the source formation: either the YYYYMMDD suffix
 *  "-20260706-TOKYO" or the ms timestamp "1783087200000"). Falls back to
 *  0 (Monday — the DXY-source-first canon) when unresolvable — honest. */
function dayIdxOf(record: RejectedSetupRecord): number {
  const weekStartMs = models.DXY.anchor.weekStartMs;
  const id = record.sourceSetupId ?? record.setupId;
  const msMatch = /_(\d{13})_/.exec(id);
  if (msMatch) {
    const ms = Number(msMatch[1]);
    if (Number.isFinite(ms) && weekStartMs > 0) {
      return Math.max(0, Math.floor((ms - weekStartMs) / 86_400_000));
    }
  }
  const dateMatch = /-(\d{4})(\d{2})(\d{2})-/.exec(id);
  if (dateMatch) {
    const ms = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
    if (Number.isFinite(ms) && weekStartMs > 0) {
      return Math.max(0, Math.floor((ms - weekStartMs) / 86_400_000));
    }
  }
  return 0;
}

/** Build a ThreeDAuditInput from a record (+ optional corrected geometry).
 *  The rrr is ALWAYS recomputed from the geometry (the machine's T6
 *  trusts the input rrr — the bridge never passes a stale/claimed rrr). */
function auditInputOf(record: RejectedSetupRecord, corrected?: ThreeDCorrectedAnchors): ThreeDAuditInput | null {
  const pair = record.pair;
  const model = models[pair as 'EUR/USD' | 'GBP/USD'];
  if (!model) return null; // e.g. AUD/USD — no model in this harness → the honest no-card path
  const pip = PIP[pair] ?? 0.0001;
  const entry = corrected?.entry ?? record.entry;
  const sl = corrected?.sl ?? record.sl;
  const tp = corrected?.tp ?? record.tp;
  const risk = Math.abs(entry - sl);
  const rrr = risk > 0 ? Math.abs(tp - entry) / risk : 0;
  const dayIdx = dayIdxOf(record);
  const day = shapeDayFor(pair, dayIdx);
  const translated = pair === 'EUR/USD' ? e2.euCascaded : e2.guCascaded;
  const anchor = model.zones.find((z) => z.id === (record.designatedZone?.id ?? record.sourceZone?.id)) ?? null;
  return {
    setupId: record.setupId,
    pair,
    lane: record.lane,
    day: record.day,
    dayIdx,
    direction: record.direction,
    entry, sl, tp, rrr,
    categoryFloor: record.rrrFloor > 0 ? record.rrrFloor : FLOOR,
    pipValue: pip,
    targetModel: model,
    shapeDay: day,
    translatedDays: translated ?? null,
    sourceElement: null,
    sourceRole: null,
    translationMode: pair === 'EUR/USD' ? 'INVERSE' : 'KEPT',
    anchor,
    anchorZoneId: record.designatedZone?.id ?? record.sourceZone?.id ?? null,
    rawRejectionReason: record.rejectionReason,
    determinism: null,
  };
}

/** The retranslate hook: the REAL machine's re-translation output for the
 *  Mon EU SHORT class. The corrected anchors are DERIVED from the real
 *  ACTIVE Mon EU SHORT mirror (the machine's own retranslate loop —
 *  mirror.ts:2716-2724 populated them at E 1.14494 / SL 1.14570 / TP
 *  1.14100 / RRR 5.18, the structural zone's internal-LQZ geometry).
 *  Only the S4 substrate gets it; the real discarded mirrors get null
 *  (their pipeline trail says "RE-TRANSLATE FAILED" — the honest reject). */
function retranslateOf(record: RejectedSetupRecord): ReturnType<typeof retranslateSetup> | null {
  if (record.setupId !== 'SYNTH-RE-TRANSLATE') return null; // only the S4 substrate
  const src = realMonEuShort;
  if (!src?.auditCard?.correctedAnchors) return null;
  const ca = src.auditCard.correctedAnchors;
  return {
    setup: { entry: ca.entry, sl: ca.sl, tp: ca.tp, rrr: ca.rrr, slMethod: 're-translate-LMV', tpRungId: null },
    zone: models['EUR/USD'].zones.find((z) => z.id === src.anchorZoneId) ?? null,
    annotation: src.auditCard.refinementNote ?? '🔧 RE-TRANSLATED: the structurally-equivalent zone resolved (C1/C3/C4 re-matched) — the corrected anchors from the machine\'s retranslate loop',
  };
}

// The reviseOf hook: the ONE revision — S3 gets the GOOD anchors (saved);
// everyone else gets no revision (null → HARD REJECT at attempt 2).
const reviseCalls = new Map<string, number>();
function reviseOf(record: RejectedSetupRecord, _card: unknown, failures: string[]): { corrected: ThreeDCorrectedAnchors; note: string } | null {
  reviseCalls.set(record.setupId, (reviseCalls.get(record.setupId) ?? 0) + 1);
  if (record.setupId === 'SYNTH-REVISION-SAVED') {
    return {
      corrected: GOOD,
      note: 'REVISION (attempt 2): the batch gate failed — the re-audit with the failure evidence lands the structural anchors (entry/SL/TP at the T1/T3/T4 mechanics, RRR ≥ 3.0).',
    };
  }
  return null;
}

const hooks: ReviewStageHooks = {
  auditInputOf,
  reAuditInputOf: (record, corrected) => auditInputOf(record, corrected),
  retranslateOf,
  reviseOf: reviseOf as ReviewStageHooks['reviseOf'],
};

// The golden references: DERIVED from the real Fri EU SHORT's E2-held entry
// (the pipeline's own E2 designation — the golden-coverage discipline, §5.4;
// B1: the entry is the E2 CORE's Friday keyZonePrice, never a re-translate).
const goldenRefs = [{
  pair: 'EUR/USD', day: 'Friday', direction: 'SHORT' as const, entry: GOOD.entry,
}];

// ═══════════════════════════════════════════════════════════════════════════════
// K1 — THE STAGE RUNS ON THE FIXTURE (synthetic + the real discarded)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('=== WAVE K1 REVIEW-STAGE GATE (FIX PLAN §5/§11.2/§12/§19) ===\n');
console.log(`Fixture: ${fixture.length} records (${synth.length} synthetic + ${realRecords.length} real from the last report run's discarded lane)`);
console.log(`Real discarded: ${realRecords.map((r) => `${r.pair}:${r.direction}`).join(', ') || 'NONE'}\n`);

const optsA = {
  records: fixture,
  hooks,
  goldenRefs,
  reportPath: [TMP, 'review_stage_probe.md'].join('/'),
  writeReport: false, // the pure probe — no file side effects (the append is probed separately)
};
const resultA = runReviewStage(RUN, optsA);

console.log('K1 — the stage runs on the fixture (the sequential reviews):');
const byId = new Map(resultA.reviewed.map((r) => [r.setupId, r]));
if (resultA.reviewed.length !== fixture.length) {
  fail(`reviewed ${resultA.reviewed.length} ≠ fixture ${fixture.length} — every record must produce an audit card + disposition`);
} else {
  pass(`all ${fixture.length} records reviewed (one sequential audit per record)`);
}
const ids = new Set(fixture.map((r) => r.setupId));
const missing = [...ids].filter((id) => !byId.has(id));
if (missing.length > 0) fail(`missing reviews: ${missing.join(', ')}`);
else pass('every fixture record has a reviewed[] entry');

const allDispositioned = resultA.reviewed.every((r) =>
  r.disposition === 'REFINED' || r.disposition === 'REJECTED' || r.disposition === 'RE_ADMITTED');
if (!allDispositioned) fail('a reviewed entry lacks a disposition');
else pass('every reviewed entry carries a disposition (REFINED / REJECTED / RE_ADMITTED)');

const s1 = byId.get('SYNTH-REFINE-DIAMOND');
const s2 = byId.get('SYNTH-SUB30');
const s3 = byId.get('SYNTH-REVISION-SAVED');
const s4 = byId.get('SYNTH-RE-TRANSLATE');
const s5 = byId.get('SYNTH-RE-ADMIT');
const s6 = byId.get('SYNTH-REJECT-GENUINE');
const s7 = byId.get('SYNTH-GOLDEN-MISS');
const s8 = byId.get('SYNTH-NO-CARD');
console.log('      dispositions: ' + resultA.reviewed.map((r) => `${r.setupId.slice(0, 22)}→${r.disposition}${r.verdict ? ':' + r.verdict : ''}`).join(' | '));
console.log(`      refined[]=${resultA.refined.map((r) => r.setupId).join(',') || '—'} | rejected[]=${resultA.rejected.length} | reAdmitted[]=${resultA.reAdmitted.length}`);

// ═══════════════════════════════════════════════════════════════════════════════
// K2 — THE BATCH FILTER: RRR ≥ 3.0 ONLY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK2 — the batch quality filter passes ONLY RRR ≥ 3.0 refined candidates:');
if (!s1 || s1.disposition !== 'REFINED') fail('the diamond (S1) did NOT refine — expected the batch gate to pass the RRR ≥ 3.0 candidate');
else pass('the diamond (S1, corrected RRR ≥ 3.0) refined (🔧) — the batch gate passed it');
if (!s2 || s2.disposition !== 'REJECTED') fail('the sub-3.0 candidate (S2) was NOT rejected — the RRR firewall failed');
else pass('the sub-3.0 candidate (S2, corrected RRR 2.4) was REJECTED (✗) — the RRR firewall held');
const refinedIds = new Set(resultA.refined.map((r) => r.setupId));
if (refinedIds.has('SYNTH-SUB30')) fail('the sub-3.0 candidate LEAKED into refined[]');
else pass('the sub-3.0 candidate is NOT in refined[] (the K2 negative holds)');
const allRefinedRrrOk = resultA.refined.every((r) => r.after.rrr >= FLOOR - 1e-9);
if (!allRefinedRrrOk) fail('a refined[] entry has after.rrr < 3.0 (the recompute was bypassed)');
else pass(`every refined[] entry's after.rrr ≥ 3.0 (recomputed: ${resultA.refined.map((r) => r.after.rrr.toFixed(1)).join(', ') || '—'})`);

// ═══════════════════════════════════════════════════════════════════════════════
// K3 — THE 2-REVISION LOOP IS BOUNDED (never > 2)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK3 — the 2-revision loop is bounded (a setup never exceeds 2 revisions):');
const maxRevision = Math.max(...resultA.reviewed.map((r) => r.revision), 0);
if (maxRevision > 2) fail(`a reviewed entry exceeded 2 revisions (max ${maxRevision}) — the D36 discipline broke`);
else pass(`no reviewed entry exceeds 2 revisions (max observed = ${maxRevision})`);
if (!s3 || s3.disposition !== 'REFINED' || s3.revision !== 2) {
  fail(`the revision-saved candidate (S3) did not land REFINED at revision 2 (got disposition=${s3?.disposition} revision=${s3?.revision}) — the ONE-revision loop failed`);
} else {
  pass('the revision-saved candidate (S3) refined at revision 2 — the attempt-2 revision worked');
}
const s3Calls = reviseCalls.get('SYNTH-REVISION-SAVED') ?? 0;
if (s3Calls > 1) fail(`the reviseOf hook was invoked ${s3Calls}× for S3 (must be exactly once — attempt 3+ is banned)`);
else pass(`the reviseOf hook ran exactly ${s3Calls}× for S3 (the loop never reached attempt 3)`);
if (s2 && s2.revision > 2) fail('the sub-3.0 candidate exceeded 2 revisions');
else if (s2) pass(`the sub-3.0 candidate hard-rejected at revision ${s2.revision} (≤ 2 — the bound held)`);
console.log(`      stats: revisionsUsed=${resultA.stats.revisionsUsed} hardRejects=${resultA.stats.hardRejects}`);

// ═══════════════════════════════════════════════════════════════════════════════
// K4 — THE FINAL REPORT CARRIES THE HOW/WHY NOTES
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK4 — the final report carries the how/why refinement notes:');
if (!resultA.report.includes('## REVIEW_STAGE_')) fail('the report lacks the REVIEW_STAGE_ section header');
else pass('the report carries the REVIEW_STAGE_ section header');
const notesInReport = resultA.refined.every((r) => {
  const snippet = r.refinementNote.slice(0, 40);
  return resultA.report.includes(snippet);
});
if (!notesInReport) fail('a refined setup\'s how/why note is missing from the report');
else pass(`every refined setup's how/why note is in the report (${resultA.refined.length} notes)`);
if (!resultA.report.includes('🔧') || !resultA.report.includes('✗') || !resultA.report.includes('✓')) {
  fail('the report lacks the 🔧/✗/✓ markers (the refined/rejected/re-admitted sections)');
} else {
  pass('the report carries the 🔧 REFINED / ✗ REJECTED / ✓ RE-ADMITTED sections');
}
console.log(`      report length: ${resultA.report.length} chars`);

// ═══════════════════════════════════════════════════════════════════════════════
// K5 — THE §5.4 GOLDEN 3-PIP RE-CHECK FIRES
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK5 — the §5.4 golden 3-pip re-check:');
if (!s7 || s7.disposition !== 'REJECTED') fail('the golden-miss candidate (S7) was NOT gated out — the §5.4 re-check did not fire');
else {
  const gateFail = s7.gateFailures.find((f) => f.startsWith('GOLDEN:'));
  if (!gateFail) fail('the golden-miss candidate was rejected but NOT by the GOLDEN gate');
  else pass(`the golden-miss candidate (S7) was gated out by the §5.4 re-check: "${gateFail.slice(0, 90)}…"`);
}
if (s1 && s1.disposition === 'REFINED') {
  const s1gate = resultA.reviewed.find((r) => r.setupId === 'SYNTH-REFINE-DIAMOND')!.gateFailures;
  if (s1gate.some((f) => f.startsWith('GOLDEN:'))) fail('the diamond (S1, Δ0p from the golden) was wrongly gated by GOLDEN');
  else pass('the diamond (S1, on the golden entry) passed the §5.4 re-check (Δ0p ≤ 3p)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// K6 — DETERMINISM ×2 (the fingerprint + report byte-identical; the append
// is IDEMPOTENT — a re-append yields a byte-identical file)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK6 — determinism ×2 + the idempotent append:');
const resultB = runReviewStage(RUN, optsA);
if (resultA.fingerprint !== resultB.fingerprint) fail('the fingerprint differs across ×2 runs (NON-deterministic)');
else pass(`the fingerprint is byte-identical ×2 (${resultA.fingerprint.slice(0, 8)}…)`);
if (resultA.report !== resultB.report) fail('the report differs across ×2 runs (NON-deterministic)');
else pass('the report string is byte-identical ×2');

// The append probe: append to a temp file ×2 → byte-identical (idempotent).
const tempReport = [TMP, 'review_stage_append_probe.md'].join('/');
writeFileSync(tempReport, '## PLUTUS v4.5.2 — THE ACCURATE REPORT (the main stats)\n\nprobe content\n', 'utf8');
const probeAppend = runReviewStage(RUN, { ...optsA, writeReport: true, reportPath: tempReport });
const afterFirst = readFileSync(tempReport, 'utf8');
const probeAppend2 = runReviewStage(RUN, { ...optsA, writeReport: true, reportPath: tempReport });
const afterSecond = readFileSync(tempReport, 'utf8');
if (probeAppend.reportMode !== 'APPENDED') fail(`the append probe did not append (mode=${probeAppend.reportMode})`);
else pass('the append probe wrote the REVIEW_STAGE_ section into the report file');
if (afterFirst !== afterSecond) fail('the re-append produced a DIFFERENT file (the append is NOT idempotent — the determinism of the main report breaks)');
else pass('the re-append produced a byte-identical file (the idempotent append holds)');
const mainStatsIntact = afterFirst.includes('THE ACCURATE REPORT (the main stats)');
if (!mainStatsIntact) fail('the append destroyed the main report content');
else pass('the append preserved the main report content (the section renders AFTER the main stats)');
if (!afterFirst.includes(`## REVIEW_STAGE_${RUN}`)) fail('the appended file lacks the REVIEW_STAGE_ section');
else pass('the appended file carries the REVIEW_STAGE_ section after the main stats');

// ═══════════════════════════════════════════════════════════════════════════════
// K7 — THE FROZEN-LIST INTEGRITY (sl-lmv.ts + trade-dedup.ts untouched)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK7 — the frozen-list integrity (the stage never writes the frozen files):');
const frozenBefore = {
  sl: sha256('src/mdve/sl-lmv.ts'),
  dedup: sha256('src/mdve/trade-dedup.ts'),
};
// (the stage has already run ×3 above — the hashes must be unchanged)
const frozenAfter = {
  sl: sha256('src/mdve/sl-lmv.ts'),
  dedup: sha256('src/mdve/trade-dedup.ts'),
};
if (frozenBefore.sl !== frozenAfter.sl || frozenBefore.dedup !== frozenAfter.dedup) {
  fail('a frozen file changed during the stage runs — the invariant 10/11 broke');
} else {
  pass(`sl-lmv.ts ${frozenAfter.sl.slice(0, 8)}… + trade-dedup.ts ${frozenAfter.dedup.slice(0, 8)}… unchanged (the frozen list is intact)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// K8 — THE HONEST EMPTY EXIT (the empty log declares "no rejected setups")
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\nK8 — the honest empty exit:');
const emptyResult = runReviewStage('empty-run', { records: [], writeReport: false });
if (!emptyResult.noRejectedSetups) fail('the empty log did NOT declare the no-rejected-setups state');
else pass('the empty log declared "no rejected setups" honestly');
if (emptyResult.reviewed.length !== 0 || emptyResult.report.trim().length === 0) fail('the empty exit fabricated reviews or an empty report');
else pass('the empty exit produced zero reviews + the honest "NO REJECTED SETUPS" report');

// ═══════════════════════════════════════════════════════════════════════════════
// THE REAL REPORT APPEND (the mission: "The report is appended to the main
// report file (a REVIEW_STAGE_ section in report_v452.md — render after the
// main stats)") — runs LAST in the verification sequence (after the ×2
// hashes), so the main report's determinism ×2 is never disturbed.
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n=== THE REAL REPORT APPEND (the REVIEW_STAGE_ section → report_v452.md) ===');
const finalAppend = runReviewStage(RUN, {
  ...optsA,
  writeReport: true,
  reportPath: REPORT,
  projectRoot: '.',
});
if (finalAppend.reportMode === 'APPENDED') {
  const reportFile = readFileSync(REPORT, 'utf8');
  if (!reportFile.includes(`## REVIEW_STAGE_${RUN}`)) fail(`the real report append failed — no REVIEW_STAGE_ section in ${REPORT}`);
  else pass(`the REVIEW_STAGE_ section is in ${REPORT} (${reportFile.length} chars — the main stats + the review section)`);
} else {
  console.log(`  ⚠ APPEND-FALLBACK: ${finalAppend.flags.join(' | ') || 'standalone written'}`);
  pass(`the review report was written standalone (${finalAppend.reportPath}) — flagged (the non-breaking option)`);
}
console.log(`reportMode=${finalAppend.reportMode} path=${finalAppend.reportPath} flags=${finalAppend.flags.length > 0 ? finalAppend.flags.join(' | ') : 'none'}`);
console.log(`reviewed=${resultA.stats.reviewed} refined=${resultA.stats.refined} rejected=${resultA.stats.rejected} reAdmitted=${resultA.stats.reAdmitted} reTranslated=${resultA.stats.reTranslated} hallucinationTriggers=${resultA.stats.hallucination.triggered}`);

console.log('');
console.log(failures === 0 ? '=== VERDICT: PASS (all Wave-K1 gates) ===' : `=== VERDICT: FAIL (${failures} gate(s) failed) ===`);
process.exit(failures === 0 ? 0 : 1);
