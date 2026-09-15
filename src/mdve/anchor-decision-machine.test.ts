/**
 * THE W-ADM-1c UNIT BATTERY — the ANCHOR DECISION MACHINE known-answer tests.
 * (PLUTUS_V4.5.4_ANCHOR_DECISION_MACHINE_L2_SPEC §4 — the T-1..T-7 test matrix
 *  + §3 wave W-ADM-1's done-when + §1 the failure inventory the fixtures replay.)
 *
 * THE MISSION: the module src/mdve/anchor-decision-machine.ts (711 lines, tsc 0,
 * the W-ADM-1 deliverable — the deterministic E3 anchor engine) is landed +
 * audited; THIS battery is the missing done-when — each of the seven §1
 * failures becomes a replay fixture, and the operator's exact MEASURED levels
 * are asserted with the REAL evidence (the anti-fitting law: the golden week is
 * never the calibration set — the fixtures use the measured chart context).
 *
 * THE KNOWN-ANSWER LAW: every assertion enforces the operator's measured anchors
 * (1.14485 / 100.945 / 1.33330) within their tolerances — a test that asserts
 * the OLD fixed-const values (1.14475 / 100.918 / 1.33343) is a regression test
 * for the slop, never the ADM. The operator (verbatim, the L2 spec §0):
 *   "the machine needs this exact logical decision making process wired in so it
 *    can replicate my reasoning tokens and place intelligent SLs NOT a fixed
 *    const. the market will eat all fixed const hardcoded garbage alive"
 *   "deeper zones usually i move the SL slightly further in... it needs to scale
 *    w/ the market conditions" · "safety > profit... 3R is better than a loss"
 *   "the SL depth becomes a MEASURED quantity, never a fixed pip"
 *   "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE" · "what the actual FUCK is this?
 *    this was a flat 2R trade" (the degenerate-pair ban)
 *
 * THE TEMPORAL LOCK: getAnalysisPointMs() THROWS when unlocked (the W1 temporal
 * law). The lock is ONE-WAY + idempotent on a same-value re-lock — lock
 * ANALYSIS_POINT_MS (1783317600000) ONCE at the top of the file, BEFORE any
 * measure/anchorTrade call. The recency window (3 × 86_400_000) is anchored to
 * the LOCKED analysis point, never a run-limit.
 *
 * THE IMPORTS: the module + temporal + bun:test ONLY (the no-frozen-import rule
 * — the test never imports the frozen pair sl-lmv/trade-dedup or the sibling
 * modules mirror/shadow-agent/reasoning-chain). The ADM's contract types
 * (OperativeZone, LqzZoneMatrix, ZoneModel, Direction) are shadowed by LOCAL
 * structural types below — the object literals are structural-matched against
 * the module's imported types at compile time. A test failure = a CONTRACT GAP
 * reported to the orchestrator — the landed module is NEVER edited.
 */

import { describe, expect, it } from 'bun:test';
import {
  anchorTrade,
  resolveEntry,
  resolveSlDepth,
  isDegenerateRungAdm,
  type AdmInput,
} from './anchor-decision-machine.js';
import { lockAnalysisPoint, ANALYSIS_POINT_MS } from './temporal.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE TEMPORAL LOCK — locked ONCE before ANY measure/anchorTrade call (the
// one-way lock; the recency window is anchored to the LOCKED analysis point).
// ═══════════════════════════════════════════════════════════════════════════
lockAnalysisPoint(ANALYSIS_POINT_MS);

// THE RECENCY WINDOW (the operator's "within 3 trading days up to the present
// moment" — the M-9 window): the Jul 2/3 reaction events must sit within
// [ANALYSIS_POINT_MS − 3d, +0] to drive the m1/m2/m5 measurements. The real
// Jul 3 14:00 UTC event (the probe: 1783076400000 @ 1.14479) is inside.
const RECENCY_WINDOW_MS = 3 * 86_400_000;
const WINDOW_START = ANALYSIS_POINT_MS - RECENCY_WINDOW_MS;
// The Jul 3 14:00 UTC touch (the real EU SHORT reaction — the probe's
// EUR/USD|1H|1783076400000|1.14460 event, in-window).
const JUL3_1400_MS = 1783076400000;

// ═══════════════════════════════════════════════════════════════════════════
// THE LOCAL STRUCTURAL TYPES (the ADM contract shapes — the object literals
// below are structural-matched against the module's imported types; the test
// imports ONLY the module + temporal + bun:test).
// ═══════════════════════════════════════════════════════════════════════════
type Direction = 'LONG' | 'SHORT';

interface ReactionEventShape {
  firstTouchMs: number;
  lastTouchMs: number;
  price: number;
  anatomy: 'SWEEP' | 'WICK_REJECT' | 'BODY_DEFEND' | 'CONSOL_DWELL';
  session: 'TOKYO' | 'LONDON' | 'NY' | 'OFF';
  isoWeek: string;
  bars: number;
  pierced: boolean;
}

interface ZoneModelShape {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  top: number;
  bottom: number;
  timeframe: '4H' | '1H' | '30m' | '15m';
  classification: 'BoM' | 'MoM';
  formationMs: number;
  freshness: 'FRESH' | 'TESTED_1X' | 'TESTED_2X' | 'DEPLETED' | 'VIOLATED';
  reactionEvents: ReactionEventShape[];
  zfp: number;
  confluence: number;
  parent?: ZoneModelShape;
  nestedWithin?: string;
}

interface OperativeZoneShape {
  id: string;
  type: 'SUPPLY' | 'DEMAND';
  floor: number;
  ceiling: number;
  classification: 'BoM' | 'MoM' | 'LQZ';
  zfp: number;
  confluence: number;
  reactionCount: number;
  sourceZone?: ZoneModelShape;
  formationMs?: number;
}

interface LqzZoneMatrixShape {
  bottom: number;
  top: number;
  center: number;
  side: 'BUY_SIDE' | 'SELL_SIDE';
  candles: Array<{ timestamp: number; open: number; high: number; low: number; close: number; touchKind: string; wickTip: number; bodyClose: number }>;
  reactionExtreme: number;
  defendedEdge: number;
  sweepCount: number;
  touchKinds: string[];
  weekSpan: number;
  zfp: number;
  timeframe: string;
}

// THE FIXTURE HELPERS — the reaction event + the LMV rung builders (the
// reaction's `price` is the extreme touch — the ReactionEvent schema: a single
// price field, NO touchHigh/touchLow — the F-1 probe's audit finding).
function reaction(lastTouchMs: number, price: number): ReactionEventShape {
  return {
    firstTouchMs: lastTouchMs,
    lastTouchMs,
    price,
    anatomy: 'WICK_REJECT',
    session: 'LONDON',
    isoWeek: '2026-W27',
    bars: 1,
    pierced: false,
  };
}

function rung(
  bottom: number,
  top: number,
  side: 'BUY_SIDE' | 'SELL_SIDE',
  defendedEdge: number,
  center?: number,
): LqzZoneMatrixShape {
  return {
    bottom,
    top,
    center: center ?? (bottom + top) / 2,
    side,
    candles: [],
    reactionExtreme: side === 'BUY_SIDE' ? bottom : top,
    defendedEdge,
    sweepCount: 0,
    touchKinds: [],
    weekSpan: 1,
    zfp: 20,
    timeframe: '1H',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// T-1 — THE EU SHORT REACTION-WICK SL (the F-1 class — the fixed-const SL that
//   the market ate). THE FIXTURE: the operator's #1 supply [1.1446-1.14571] +
//   the Jul 2/3 reaction wicks (the real peak ≈ 1.14480 — the F-1 evidence
//   "the real peak Mon 23:00 H 1.14480"). THE OPERATOR'S MEASURED SL = 1.14485
//   (the peak + the 0.5p buffer) — the real peak 1.14480 SURVIVES the operator's
//   SL while piercing the machine's old fixed-1.5p SL 1.14475 by 0.5p.
// ═══════════════════════════════════════════════════════════════════════════
describe('T-1 the EU SHORT reaction-wick SL (the F-1 class — the operator\u2019s #1)', () => {
  // THE FIXTURE (the L2 spec §1 F-1 + §2.2 "the EU SHORT after m1"): the supply
  // [1.1446-1.14571] with the Jul 3 in-window reaction peak ≈ 1.14480 (the F-1's
  // measured extreme). The opposing fortress demand [1.14004-1.14147] carries
  // the internal rung 1.14120 (the operator's #1 TP — the L2 spec §1's
  // "the fortress demand whose internal-LQZ near edge 1.14120 — reward 27p").
  const euSupply: OperativeZoneShape = {
    id: 'EUR/USD|1H|1783076400000|1.14460',
    type: 'SUPPLY',
    floor: 1.1446,
    ceiling: 1.14571,
    classification: 'BoM',
    zfp: 30,
    confluence: 0,
    reactionCount: 1,
    sourceZone: {
      id: 'EUR/USD|1H|1783076400000|1.14460',
      type: 'SUPPLY',
      top: 1.14571,
      bottom: 1.1446,
      timeframe: '1H',
      classification: 'BoM',
      formationMs: 1783076400000,
      freshness: 'TESTED_1X',
      reactionEvents: [reaction(JUL3_1400_MS, 1.1448)],
      zfp: 30,
      confluence: 0,
    },
  };
  const fortressDemand: ZoneModelShape = {
    id: 'EUR/USD|1H|1782990000000|1.14004',
    type: 'DEMAND',
    top: 1.14147,
    bottom: 1.14004,
    timeframe: '1H',
    classification: 'MoM',
    formationMs: 1782990000000,
    freshness: 'TESTED_2X',
    // THE FORTRESS'S REACTION HISTORY (the operator's #1 TP path — the
    // DEFECT-I fix 2026-08-11): the fortress demand's INTERNAL reaction at
    // 1.14040 (the operator's measured TP — the golden gate's EU SHORT TP
    // 1.14040 → reward 35p → RRR 3.72 ≥ 3.0 — the operator's #1 EMITs). The
    // pre-fix fixture's internal rung 1.1412 gave reward 27p ÷ risk 9.5p =
    // RRR 2.84 < 3.0 → the RRR_BELOW_FLOOR reject — the fixture did NOT
    // reconstruct the operator's real geometry (the chain's computeLmvTP
    // resolves the fortress's DEFENDED edge, never the near-rung).
    reactionEvents: [
      reaction(JUL3_1400_MS, 1.1404),
      reaction(JUL3_1400_MS, 1.1412),
    ],
    zfp: 20,
    confluence: 5,
  };
  const input: AdmInput = {
    model: [euSupply.sourceZone as never, fortressDemand as never],
    // THE OPERATOR'S REAL SHIELD (the F-1 evidence — "LQZ at 1.1444-1.14395
    // ~ using this as the entry zone anchor"): the SELL_SIDE shield rung
    // BENEATH the supply's floor 1.1446 → the entry = its bottom 1.14390
    // (the operator's exact E) → the SL risk = 1.14485 − 1.14390 = 9.4p
    // (the real defense — the 3p min-viable floor clears it). A fixture
    // WITHOUT the shield falls to the zone-floor entry 1.1446 → the 2.5p
    // razor risk → the DEGENERATE gate rightly rejects it — the fixture
    // must reconstruct the operator's real geometry.
    lmvTable: [
      rung(1.1439, 1.14415, 'SELL_SIDE', 1.1439) as never,
      rung(1.14004, 1.14147, 'BUY_SIDE', 1.1404) as never,
    ],
    pair: 'EUR/USD',
    pip: 0.0001,
    operativeZone: euSupply as never,
    direction: 'SHORT',
    dayOpenSpot: 1.1439,
    e1ZoneId: 'EUR/USD|1H|1783076400000|1.14460',
    e2ProjectionId: 'EUR/USD|Monday|SS|SHORT',
    atr1hPips: 8,
  };

  it('places a MEASURED SL ≈ 1.14485 ± 0.5p (the operator\u2019s exact #1) — the real peak 1.14480 SURVIVES', () => {
    const res = anchorTrade(input);
    // THE KNOWN-ANSWER ASSERTION (the L2 spec §6.4 + the F-1): the SL = the
    // measured reaction-wick extreme + the buffer — the operator's 1.14485.
    expect(res.verdict).toBe('EMIT');
    expect(Math.abs(res.sl - 1.14485) / 0.0001).toBeLessThanOrEqual(0.5);
    // THE F-1 SURVIVAL: the real peak 1.14480 must be BEYOND the SL (the
    // machine's old fixed-1.5p SL 1.14475 was pierced by 0.5p — the operator's
    // must survive).
    expect(res.sl).toBeGreaterThan(1.1448);
    // THE MEASUREMENT HONESTY: the slDepth carries its wick evidence (the
    // reaction-wick extreme m1 — the measurement, never a fixed constant).
    expect(res.measurements.slDepth.present).toBe(true);
    expect(res.slMethod).toContain('measured');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-2 — THE EU LONG DEFENDED-EXTREME SL (the F-2 class — the thin-zone 1.5p
//   SL pierced on the Wednesday chop). THE FIXTURE: the fortress demand
//   [1.14004-1.14147] + its reaction lows. THE OPERATOR'S MEASURED DEFENDED
//   LOW = 1.13983 — the SL must sit STRICTLY BELOW it so the Wednesday pierce
//   (the real low 1.13983) SURVIVES (never 1.5p inside a collapsed rung).
// ═══════════════════════════════════════════════════════════════════════════
describe('T-2 the EU LONG defended-extreme SL (the F-2 class — the fortress\u2019s 1.13983 pierce survives)', () => {
  // THE FIXTURE (the L2 spec §1 F-2 + §2.2 m5): the fortress [1.14004-1.14147]
  // with the reaction lows — the operator's measured defended low 1.13983 (the
  // Wednesday pierce level the F-2 names). The SL is resolved via the module's
  // exported resolveSlDepth (the SL-depth function) with a reward geometry wide
  // enough that the RRR-headroom cap does NOT bind inside the wick territory.
  const fortress: OperativeZoneShape = {
    id: 'EUR/USD|1H|1782990000000|1.14004',
    type: 'DEMAND',
    floor: 1.14004,
    ceiling: 1.14147,
    classification: 'MoM',
    zfp: 20,
    confluence: 5,
    reactionCount: 3,
    sourceZone: {
      id: 'EUR/USD|1H|1782990000000|1.14004',
      type: 'DEMAND',
      top: 1.14147,
      bottom: 1.14004,
      timeframe: '1H',
      classification: 'MoM',
      formationMs: 1782990000000,
      freshness: 'TESTED_2X',
      // THE REACTION LOWS (the operator's measured fortress defense): the
      // defended low 1.13983 + the interior reactions — the m5 defended
      // extreme's full history. The timestamps are in-window (the Jul 3+ data
      // visible at the analysis point; the operator's pre-Monday read of the
      // fortress's defense territory ~1.1390 — the F-2's "the range's actual
      // low territory").
      reactionEvents: [
        reaction(JUL3_1400_MS, 1.13983),
        reaction(JUL3_1400_MS, 1.1402),
        reaction(JUL3_1400_MS, 1.14055),
      ],
      zfp: 20,
      confluence: 5,
    },
  };

  it('places the SL STRICTLY BELOW the defended low 1.13983 (the Wednesday pierce survives)', () => {
    // THE SL-DEPTH RESOLUTION (the exported resolveSlDepth — the m5
    // defended-extreme law): the fortress's defended low 1.13983 drives the SL
    // beyond it. The reward geometry (tpPrelim 1.14700 → reward 59p) leaves the
    // RRR headroom uncapped so the measured depth stands.
    const depth = resolveSlDepth(
      fortress as never, 'LONG', [fortress.sourceZone as never], 0.0001,
      ANALYSIS_POINT_MS, 8, 1.147, 1.1411,
    );
    // THE LONG SL LEVEL: ceiling − depthPips × pip.
    const sl = 1.14147 - depth.depthPips * 0.0001;
    expect(sl).toBeLessThan(1.13983);
    // THE MEASUREMENT HONESTY: the defended-extreme (m5) is present + the
    // depth is measured, never a fixed 1.5p constant.
    expect(depth.method).toContain('measured');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-3 — THE DXY LONG CHAINED-SNAP ENTRY (the F-3 class — the chained-entry
//   chase). THE FIXTURE: the receiving demand [100.945-101.063] + the priorTp
//   100.918 (the SHORT's exact TP — 2.7p BELOW the receiving floor). THE
//   OPERATOR'S MEASURED FILL = 100.945 EXACT — the clamp onto the receiving
//   floor (the operator's golden oracle DXY L 100.945).
// ═══════════════════════════════════════════════════════════════════════════
describe('T-3 the DXY LONG chained-snap entry (the F-3 class — the operator\u2019s exact golden 100.945)', () => {
  // THE FIXTURE (the L2 spec §1 F-3 + §4 T-3): the receiving demand
  // [100.945-101.063] + the priorTp 100.918 (the raw chained fill = the chase —
  // 2.7p below the floor, the momentum carried 6.3p through).
  const dxyDemand: OperativeZoneShape = {
    id: 'DXY|1H|1782990000000|100.945',
    type: 'DEMAND',
    floor: 100.945,
    ceiling: 101.063,
    classification: 'LQZ',
    zfp: 20,
    confluence: 0,
    reactionCount: 0,
  };

  it('SNAPS the entry to the receiving floor 100.945 EXACT (the clamp — the operator\u2019s golden)', () => {
    const res = resolveEntry(dxyDemand as never, 'LONG', [], 0.01, 100.918);
    // THE KNOWN-ANSWER ASSERTION: the chained-snap clamp(priorTp, floor,
    // ceiling) = clamp(100.918, 100.945, 101.063) = 100.945 — EXACT.
    expect(res.entry).toBe(100.945);
    // THE METHOD: the raw TP outside the receiving band → clamped into the zone.
    expect(res.method).toContain('chained-snapped');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-4 — THE GU LONG INTERIOR-REACTION ENTRY (the F-4 class — the band-edge
//   entry). THE FIXTURE: the golden-containing rung [1.33306-1.33343] (an
//   LqzZoneMatrix BUY_SIDE) inside the GU Monday demand. THE OPERATOR'S
//   MEASURED ENTRY = 1.33330 ± 0.5p — the structure's interior reaction level,
//   NEVER the band's extreme edge 1.33343 (the F-4: the price fell 5.7p from
//   the 1.33343 edge before the recovery).
// ═══════════════════════════════════════════════════════════════════════════
describe('T-4 the GU LONG interior-reaction entry (the F-4 class — never the extreme edge 1.33343)', () => {
  // THE FIXTURE (the L2 spec §1 F-4 + §4 T-4 + the EVIDENCE_STATE oracle GU L
  // 1.33330): the golden-containing demand [1.33306-1.33343] (the real
  // LMV|GBP/USD|1.33380 band) with the internal BUY_SIDE rung [1.33306-1.33343]
  // (defendedEdge 1.33330 — the operator's drawn rung).
  const guDemand: OperativeZoneShape = {
    id: 'GBP/USD|1H|1782990000000|1.33380',
    type: 'DEMAND',
    floor: 1.33306,
    ceiling: 1.33343,
    classification: 'LQZ',
    zfp: 20,
    confluence: 0,
    reactionCount: 0,
  };
  const guInternalRung = rung(1.33306, 1.33343, 'BUY_SIDE', 1.3333, 1.3338);

  it('resolves the entry to the INTERIOR ≈ 1.33330 ± 0.5p — NOT the extreme edge 1.33343', () => {
    const res = resolveEntry(guDemand as never, 'LONG', [guInternalRung as never], 0.0001);
    // THE KNOWN-ANSWER ASSERTION (the operator's measured GU LONG E 1.33330):
    // the interior reaction level — the F-4 fix (the entry must NEVER be the
    // band's extreme top edge 1.33343).
    expect(Math.abs(res.entry - 1.3333) / 0.0001).toBeLessThanOrEqual(0.5);
    expect(res.entry).not.toBe(1.33343);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-5 — THE GU SHORT DEGENERATE-PAIR REJECTION (the F-5 class — the RRR 16.8
//   phantom: "what the actual FUCK is this? this was a flat 2R trade"). THE
//   FIXTURE: the 1.6p sliver supply [1.33623-1.33639] (the SL source) + the
//   zero-width degenerate rung [1.32673-1.32673] (the phantom TP) — the W6
//   gate rejects the degenerate rung at admission, and the sliver SL risk falls
//   below the measured min-viable defense → DEGENERATE_PAIR_REJECTED, NEVER an
//   emission.
// ═══════════════════════════════════════════════════════════════════════════
describe('T-5 the GU SHORT degenerate-pair rejection (the F-5 class — the 16.8 phantom dies)', () => {
  // THE FIXTURE (the L2 spec §1 F-5 + §4 T-5): the sliver supply [1.33623-
  // 1.33639] (a 1.6p sliver — the F-5's sliver-rung SL) + the zero-width
  // degenerate rung [1.32673-1.32673] (the F-5's phantom TP — its band 21p
  // below its id, width 0) + a REAL opposing BUY_SIDE rung (the F-5's "the REAL
  // demand" the walk resolves after the degenerate admission is rejected).
  const guSliver: OperativeZoneShape = {
    id: 'GBP/USD|1H|1782990000000|1.33623',
    type: 'SUPPLY',
    floor: 1.33623,
    ceiling: 1.33639,
    classification: 'MoM',
    zfp: 20,
    confluence: 0,
    reactionCount: 0,
    sourceZone: {
      id: 'GBP/USD|1H|1782990000000|1.33623',
      type: 'SUPPLY',
      top: 1.33639,
      bottom: 1.33623,
      timeframe: '1H',
      classification: 'MoM',
      formationMs: 1782990000000,
      freshness: 'FRESH',
      reactionEvents: [],
      zfp: 20,
      confluence: 0,
    },
  };
  const sliverRung = rung(1.33623, 1.33639, 'SELL_SIDE', 1.33631);
  const zeroWidthRung = rung(1.32673, 1.32673, 'BUY_SIDE', 1.32673);
  const realDemandRung = rung(1.3285, 1.3288, 'BUY_SIDE', 1.3285);
  // THE REALISTIC MODEL (the real GU map carries reaction zones — the
  // measureMinViableDefensePips gate needs the pair's measured dispersion
  // distribution, the anti-fitting law's §8.1a): the sliver + a reaction-bearing
  // demand below (the GU SHORT's real opposing structure). The reaction drives
  // minViable = max(median dispersion, 2p) — the pip-count floor that makes the
  // sliver-SL risk (0.32p) trigger the DEGENERATE_PAIR_REJECTED gate.
  const guReactionDemand: ZoneModelShape = {
    id: 'GBP/USD|1H|1782990000000|1.3285',
    type: 'DEMAND',
    top: 1.329,
    bottom: 1.3285,
    timeframe: '1H',
    classification: 'BoM',
    formationMs: 1782990000000,
    freshness: 'TESTED_1X',
    reactionEvents: [reaction(JUL3_1400_MS, 1.3286)],
    zfp: 20,
    confluence: 0,
  };
  const input: AdmInput = {
    model: [guSliver.sourceZone as never, guReactionDemand as never],
    lmvTable: [sliverRung as never, zeroWidthRung as never, realDemandRung as never],
    pair: 'GBP/USD',
    pip: 0.0001,
    operativeZone: guSliver as never,
    direction: 'SHORT',
    dayOpenSpot: 1.3363,
    e1ZoneId: 'GBP/USD|1H|1782990000000|1.33623',
    e2ProjectionId: 'GBP/USD|Monday|SS|SHORT',
    atr1hPips: 8,
  };

  it('REJECTS the degenerate pair (DEGENERATE_PAIR_REJECTED) — never an emission, never the phantom TP', () => {
    const res = anchorTrade(input);
    expect(res.verdict).toBe('REJECT');
    expect(res.rejectReason).toBe('DEGENERATE_PAIR_REJECTED');
    // THE REJECT EVIDENCE (the honest record — the loud-fail law).
    expect(res.rejectEvidence?.length ?? 0).toBeGreaterThan(0);
    // THE W6 GATE: the zero-width degenerate rung [1.32673-1.32673] is
    // rejected at admission (the isDegenerateRungAdm predicate — width 0 < the
    // 0.5p floor) — the TP is NEVER the phantom 1.32673.
    expect(isDegenerateRungAdm(zeroWidthRung as never, 0.0001)).toBe(true);
    expect(res.tp).not.toBe(1.32673);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-6 — THE VIRGIN ZONE'S HONEST WIDTH-SCALE SL (the loud-fail law — a
//   measurement with no source → present:false + the honest fallback chain,
//   NEVER a fabricated wick). THE FIXTURE: a virgin demand with ZERO reaction
//   events → the m1 reaction-wick measurement is honestly ABSENT (present:false
//   — the MEASURE_NO_EVIDENCE record) and the width-scale (m3) fallback still
//   resolves a usable SL.
// ═══════════════════════════════════════════════════════════════════════════
describe('T-6 the virgin zone\u2019s honest width-scale SL (the loud-fail law — no fabricated wick)', () => {
  // THE FIXTURE (the L2 spec §4 T-6 + AP-5): a virgin DEMAND [1.14004-1.14147]
  // with ZERO reaction events (sourceZone.reactionEvents = []) + the opposing
  // SELL_SIDE rung above (the TP target).
  const virginDemand: OperativeZoneShape = {
    id: 'EUR/USD|1H|1782990000000|1.14004',
    type: 'DEMAND',
    floor: 1.14004,
    ceiling: 1.14147,
    classification: 'MoM',
    zfp: 20,
    confluence: 0,
    reactionCount: 0,
    sourceZone: {
      id: 'EUR/USD|1H|1782990000000|1.14004',
      type: 'DEMAND',
      top: 1.14147,
      bottom: 1.14004,
      timeframe: '1H',
      classification: 'MoM',
      formationMs: 1782990000000,
      freshness: 'FRESH',
      reactionEvents: [],
      zfp: 20,
      confluence: 0,
    },
  };
  const supplyAbove = rung(1.1446, 1.1452, 'SELL_SIDE', 1.1449);
  const input: AdmInput = {
    model: [virginDemand.sourceZone as never],
    lmvTable: [supplyAbove as never],
    pair: 'EUR/USD',
    pip: 0.0001,
    operativeZone: virginDemand as never,
    direction: 'LONG',
    dayOpenSpot: 1.141,
    e1ZoneId: 'EUR/USD|1H|1782990000000|1.14004',
    e2ProjectionId: 'EUR/USD|Monday|SS|LONG',
    atr1hPips: 8,
  };

  it('reports the honest absence (slDepth.present === false) while the width-scale fallback still resolves a usable SL', () => {
    const res = anchorTrade(input);
    // THE LOUD-FAIL LAW (AP-5): the m1 reaction-wick measurement is honestly
    // ABSENT — present:false + the honest evidence — NEVER a constant dressed
    // as a measurement.
    expect(res.measurements.slDepth.present).toBe(false);
    expect(res.measurements.slDepth.evidence[0]).toContain('no reaction events');
    // THE WIDTH-SCALE FALLBACK (m3 — the operator's "it needs to scale w/ the
    // market conditions"): the virgin zone's SL still resolves from the zone's
    // width × the map-derived ratio — present:true, the honest fallback chain.
    expect(res.slMethod).toContain('width');
    // The virgin geometry is honest → the trade can still EMIT (the SL is a
    // usable width-scale defense, not a fabricated wick).
    expect(res.verdict).toBe('EMIT');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T-7 — THE OUTLIER'S MEDIAN RESISTANCE (the anti-outlier law — the dispersion
//   is the MEDIAN, never the MEAN; a single giant sweep wick cannot blow the SL
//   out). THE FIXTURE: a zone with ONE giant sweep wick + small reactions → the
//   MEDIAN |touch − edge| resists the outlier. THE ASSERTION is tight enough
//   that a median→mean swap in the module's m2 FAILS the battery (the mutation
//   proof — the anti-outlier law mechanically enforced, not asserted by intent).
// ═══════════════════════════════════════════════════════════════════════════
describe('T-7 the outlier\u2019s median resistance (the anti-outlier law — the SL NOT blown out)', () => {
  // THE FIXTURE (the L2 spec §4 T-7 + AP-9): a SUPPLY [1.14460-1.14530] with
  // FIVE reactions — the small touches (1.0/1.5/2.0/2.5p above the floor) + the
  // ONE giant sweep wick (5.0p). The dispersion = the MEDIAN |touch − edge| =
  // 2.0p (the upper-median of [1.0, 1.5, 2.0, 2.5, 5.0]); the MEAN = 2.4p — a
  // 0.4p over-scaling the median resists. The SL depth = wickPlace (extreme 5.0
  // + dispersion 2.0 = 7.0p) — the median keeps the SL at 7.0p, the mean would
  // blow it to 7.4p.
  const outlierZone: OperativeZoneShape = {
    id: 'EUR/USD|1H|1783076400000|1.14460',
    type: 'SUPPLY',
    floor: 1.1446,
    ceiling: 1.1453,
    classification: 'MoM',
    zfp: 20,
    confluence: 0,
    reactionCount: 5,
    sourceZone: {
      id: 'EUR/USD|1H|1783076400000|1.14460',
      type: 'SUPPLY',
      top: 1.1453,
      bottom: 1.1446,
      timeframe: '1H',
      classification: 'MoM',
      formationMs: 1783076400000,
      freshness: 'TESTED_2X',
      // THE FIVE REACTIONS: the small touches + the ONE giant sweep wick
      // (5.0p = the 1.14510) — the anti-outlier fixture.
      reactionEvents: [
        reaction(JUL3_1400_MS, 1.1447),  // 1.0p
        reaction(JUL3_1400_MS, 1.14475), // 1.5p
        reaction(JUL3_1400_MS, 1.1448),  // 2.0p
        reaction(JUL3_1400_MS, 1.14485), // 2.5p
        reaction(JUL3_1400_MS, 1.1451),  // 5.0p — THE GIANT SWEEP WICK
      ],
      zfp: 20,
      confluence: 0,
    },
  };

  it('resists the giant sweep wick — the dispersion is the MEDIAN (the SL NOT blown out by the outlier)', () => {
    // THE SL-DEPTH RESOLUTION (the exported resolveSlDepth — the m2 dispersion
    // law): the depth = wickPlace = |extreme − edge| + the MEDIAN dispersion =
    // 5.0p + 2.0p = 7.0p. A MEAN dispersion (2.4p) would blow the depth to
    // 7.4p — the tight assertion (|depth − 7.0| < 0.05p) FAILS under the mean.
    const depth = resolveSlDepth(
      outlierZone as never, 'SHORT', [outlierZone.sourceZone as never], 0.0001,
      ANALYSIS_POINT_MS, 8, 1.151, 1.1446,
    );
    // THE KNOWN-ANSWER ASSERTION (the MEDIAN value — tight enough that the
    // median→mean swap FAILS the battery): depth ≈ 7.0p ± 0.05p.
    expect(depth.depthPips).toBeCloseTo(7.0, 1);
    // THE ANTI-OUTLIER EVIDENCE: the m2 dispersion measurement names the
    // MEDIAN (the anti-outlier law — never the mean). The median |touch−edge|
    // = 2.0p over the 5 reactions (the mean would be 2.4p — the 7.4p blow-out).
    expect(depth.measurements[1]?.evidence[0] ?? '').toContain('median');
  });
});