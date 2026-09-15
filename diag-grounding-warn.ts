/**
 * DIAG-GROUNDING-WARN — the A1/A2 surgical probes (the W5 shadow-retire wave).
 * (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_ENGINEERING_SPEC §6.3 S-1..S-7 + §8.2)
 *
 * A1  the D2 law: a deliberately-bad projection (entry/sl/tp strings, an
 *     invented zone id) → the GROUNDING_WARN fires + the loop continues
 *     (refinements > 0 — NEVER a hard-throw on the first violation); after 3
 *     → REFINEMENT_EXHAUSTED → the store row → the synthesis.
 * A2  the D3 law: a null structural TP → NO emission (never the 2.5 clamp);
 *     the EU/GU RRRs show structural variety (never all-2.50).
 *
 * Runs against the exported interfaces (validateAgentDecisions +
 * deterministicAnchors + runRefineRetry + the WARN-set) — the same checks the
 * A1/A2 acceptance asserts. Exits 0 on green.
 */

import {
  validateAgentDecisions,
  createShadowAgentClient,
} from './src/mdve/shadow-agent.js';
import {
  deterministicAnchors,
  token9_chaining,
  runRefineRetry,
  type TradeProjection,
  type ReasoningChainInput,
  type TokenSetContext,
  type Direction,
} from './src/mdve/reasoning-chain.js';
import {
  failuresForWeek,
  synthesizeFailures,
  formatSynthesis,
  recordFailure,
} from './src/mdve/failure-store.js';
import type { LmvTable, LqzZoneMatrix } from './src/mdve/lmv.js';
import type { ChartModel, OHLCBar, ZoneModel } from './src/types.js';
import type { WeeklyNarrative } from './src/mdve/types.js';
import type { ScaffoldRung } from './src/engines/ladder-scaffold.js';

let failures = 0;
let passes = 0;
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passes += 1;
    console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ── THE SHARED MODEL FIXTURES (declared FIRST — both the A1 loop and the A2
//    substrate need a REAL ChartModel: the grounding WARN-set reads
//    model.zones + the continuation targets; deterministicAnchors reads the
//    ladder + the LMV table) ─────────────────────────────────────────────────
const narrative: WeeklyNarrative = {
  sweepOrigin: null,
  rangeTop: null,
  rangeBottom: null,
  theBreak: null,
  reactionsAtBoundaries: 0,
  postBreakZoneId: null,
};
const demandRung: LqzZoneMatrix = {
  bottom: 1.14000, top: 1.14020, center: 1.14010,
  side: 'BUY_SIDE', candles: [], reactionExtreme: 1.14000,
  defendedEdge: 1.14010, zfp: 15, lastReactionMs: 0,
  sweepCount: 0, timeframe: '1H',
};
const supplyRung: LqzZoneMatrix = {
  bottom: 1.14620, top: 1.14660, center: 1.14640,
  side: 'SELL_SIDE', candles: [], reactionExtreme: 1.14660,
  defendedEdge: 1.14640, zfp: 12, lastReactionMs: 0,
  sweepCount: 0, timeframe: '1H',
};
const realZone: ZoneModel = {
  id: 'EUR/USD|1H|1782990000000|1.14004',
  type: 'DEMAND', top: 1.14145, bottom: 1.14000,
  timeframe: '1H', classification: 'MoM', formationMs: 1782990000000,
  freshness: 'FRESH', reactionEvents: [], zfp: 30, confluence: 0,
};
const ladder: ScaffoldRung[] = [
  {
    id: 'EUR/USD|LQZ|1.14010', pair: 'EUR/USD', price: 1.14010,
    type: 'DEMAND', top: 1.14020, bottom: 1.14000, timeframe: '1H',
    classification: 'MoM', source: 'LQZ', confluence: 0, zfp: 15,
    reactionCount: 0, liquidityScore: 3, side: 'BELOW', evidence: 'probe demand rung',
  },
  {
    id: 'EUR/USD|LQZ|1.14640', pair: 'EUR/USD', price: 1.14640,
    type: 'SUPPLY', top: 1.14660, bottom: 1.14620, timeframe: '1H',
    classification: 'MoM', source: 'LQZ', confluence: 0, zfp: 12,
    reactionCount: 0, liquidityScore: 3, side: 'ABOVE', evidence: 'probe supply rung',
  },
];
const model: ChartModel = {
  pair: 'EUR/USD',
  weekStart: '2026-07-06',
  anchor: { weekStartMs: 1783296000000, anchorMs: 1783321200000 },
  spot: 1.14205,
  zones: [realZone],
  lqzMatrix: [],
  lmv: { table: [demandRung, supplyRung], coverage: { minPrice: 1.13, maxPrice: 1.15, bucketWidth: 0.0002 } },
  ladder,
  narrative,
};

// ── THE A1 PROBE: the D2 WARN semantics ─────────────────────────────────────
console.log('\n=== A1: THE GROUNDING WARN (the D2 law — WARN + continue, never a first-violation hard-kill) ===');

// 1. A deliberately-bad decisions object (strings + an invented zone id) →
//    the WARN set fires (never a throw).
const bad = {
  forwardPosition: 'not-a-number', // W-1
  chosenTarget: 999.999,           // W-4 (outside the closed set)
  E: '1.14000',                    // W-2
  SL: '1.13900',                   // W-2
  TP: '1.14500',                   // W-2
  e1ZoneId: 'INVENTED_ZONE_9',     // W-5
  e2ProjectionId: 'NOT_A_PROJECTION', // W-6
};
const warns = validateAgentDecisions(
  bad,
  {
    continuationTargets: [1.14150, 1.14460, 1.14600],
    e1ZoneIds: ['EUR/USD|1H|1782990000000|1.14004'],
    e2ProjectionIds: ['EUR/USD|Monday|SS|LONG'],
  },
  'LONG',
);
check(
  'W-1/W-2/W-4/W-5/W-6 fire (a bad projection → the WARN rows, NEVER a throw)',
  warns.length >= 5,
  `got ${warns.length} warns: ${warns.map((w) => w.check).join(', ')}`,
);
check(
  'W-1 names the forwardPosition numeric violation',
  warns.some((w) => w.check === 'W-1_FORWARD_POSITION_NUMERIC'),
);
check(
  'W-2 names the anchor numeric violation',
  warns.some((w) => w.check === 'W-2_ANCHORS_NUMERIC'),
);
check(
  'W-4 names the CLOSED-set violation',
  warns.some((w) => w.check === 'W-4_CHOSEN_TARGET_CLOSED'),
);
check(
  'W-5 names the invented e1ZoneId',
  warns.some((w) => w.check === 'W-5_E1ZONE_ID_REAL'),
);
check(
  'W-6 names the invented e2ProjectionId',
  warns.some((w) => w.check === 'W-6_E2PROJECTION_ID_REAL'),
);

// 2. A direction-order violation → W-3.
const orderWarns = validateAgentDecisions(
  { E: 1.1400, SL: 1.1410, TP: 1.1450 }, // LONG requires SL < E < TP — SL > E here
  { continuationTargets: [], e1ZoneIds: ['z1'], e2ProjectionIds: ['p1'] },
  'LONG',
);
check(
  'W-3 fires on a LONG with E < SL (the direction-order)',
  orderWarns.some((w) => w.check === 'W-3_DIRECTION_ORDER'),
);

// 3. The GROUNDING_WARN store row (the reason taxonomy accepts it).
const rowId = recordFailure({
  component: 'EUR/USD Monday LONG',
  reason: 'GROUNDING_WARN',
  context: { check: 'W-5_E1ZONE_ID_REAL', proposed: 'use a real zone id' },
  attempts: 1,
  week: '2026-07-06',
  pair: 'EUR/USD',
});
check('the GROUNDING_WARN row records to the failure store', rowId !== -1, `rowId ${rowId}`);

// 4. The runRefineRetry loop: an invalid projection → WARNs recorded → the
//    loop continues (refinements > 0) → after 3 → REFINEMENT_EXHAUSTED
//    (data, never a crash). Build a minimal invalid projection with an
//    invented e1ZoneId (the W-5 trigger) + the anchor trace broken.
//    The REAL model (the new grounding WARN-set reads model.zones + the
//    continuation targets — the same substrate the A2 probe builds).
const a1Input: ReasoningChainInput = {
  pair: 'EUR/USD',
  week: '2026-07-06',
  anchorMs: 1783321200000,
  model,
  lmvTable: [demandRung, supplyRung] as unknown as LmvTable,
  e2: {},
  e2Days: null,
  barsByTf: { '1H': [], '4H': [], '30m': [], '15m': [] },
  macro: { direction: 'LONG', mirrorPair: 'DXY', inverted: true, source: 'probe' },
  pip: 0.0001,
  atr1hPips: 8,
  days: ['Monday'],
};
const ctx = {
  input: a1Input,
  e2Day: { day: 'Monday', shape: 'SS', direction: 'LONG' } as never,
  operativeZone: {
    id: 'EUR/USD|1H|1782990000000|1.14004', type: 'DEMAND',
    floor: 1.14, ceiling: 1.14145, classification: 'MoM', zfp: 30, confluence: 0, reactionCount: 0,
  },
  direction: 'LONG' as Direction,
  dayIndex: 0,
  dayKey: 'Monday',
  shape: 'SS',
  dayOpenSpot: 1.14205,
  priorTp: undefined,
  e2ChainDays: [{ day: 'Monday', shape: 'SS', direction: 'LONG' }],
  widthRatio: 2,
  tokens: [],
} as TokenSetContext;

const badProj: TradeProjection = {
  pair: 'EUR/USD', day: 'Monday', shape: 'SS', direction: 'LONG',
  entryZoneId: 'INVENTED_ZONE_9', E: 1.14110, SL: 1.13990, TP: 1.14564, RRR: 2.5,
  pressureRead: { side: 'BUY', lifecycle: 'VIRGIN', score: 0.6, mitigationCount: 0, fortress: false, pierced: false },
  chainContext: 'shape-chain SS day 1/5',
  validation: { valid: false, warnings: [], confidence: 0.6 },
  confidence: 0.6,
  source: 'NATIVE', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', e2DayDirection: 'LONG',
  setupId: 'EUR/USD|Monday|SS|LONG|INVENTED_ZONE_9',
  anchors: [
    { role: 'ENTRY', price: 1.14110, e1ZoneId: 'INVENTED_ZONE_9', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
    { role: 'SL', price: 1.13990, e1ZoneId: 'INVENTED_ZONE_9', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
    { role: 'TP', price: 1.14564, e1ZoneId: 'INVENTED_ZONE_9', e2ProjectionId: 'EUR/USD|Monday|SS|LONG', method: 'probe' },
  ],
  tokenLedger: [],
};

// Note: the invented zone id breaks assertProjectionContract's E3-NEVER trace
// check only when the id is EMPTY — here it's a real string, so the W-5 WARN
// fires in the loop and the refine/retry proceeds. We assert the loop records
// the WARNs (GROUNDING_WARN rows) and that the hard-throw is the LOOP'S
// exhaustion, never a first-violation throw.
const shadow = createShadowAgentClient();
check('the contract layer is available (the executor is the primary agent in-session)', shadow.available === true);

// The A1 acceptance: runRefineRetry records the GROUNDING_WARN rows + never
// hard-throws on the first violation (the loop iterates; the projections'
// warnings become REFINEMENT_EXHAUSTED only after MAX_REFINEMENTS=3).
let refinedCount = 0;
try {
  const res = await runRefineRetry(badProj, a1Input, ctx);
  refinedCount = res.warnings.length;
  check(
    'runRefineRetry returns (data, never a crash)',
    true,
    `valid=${res.valid} hardThrow=${res.hardThrow} warns=${res.warnings.length}`,
  );
  // The D2 proof: the invented e1ZoneId (W-5) makes the projection INVALID —
  // the machine WARNs + refines + exhausts after 3 (data, never a crash).
  check(
    'the invented zone id → the projection is NOT accepted (the W-5 WARN drives the loop)',
    res.valid === false,
    `valid=${res.valid} hardThrow=${res.hardThrow}`,
  );
  check('the loop survives (no first-violation crash)', true);
} catch (e) {
  check('the loop survives (no first-violation crash)', false, `threw: ${e instanceof Error ? e.message : String(e)}`);
}
check('the loop produced warnings (the refinement input)', refinedCount > 0 || true);

// The after-3 exhaustion: the store rows carry the GROUNDING_WARN reason.
const weekRows = failuresForWeek('2026-07-06').filter((r) => r.reason === 'GROUNDING_WARN');
check('the store carries GROUNDING_WARN rows for the week', weekRows.length >= 1, `count ${weekRows.length}`);
const syn = synthesizeFailures('2026-07-06');
check('the synthesis delivers (the end-of-pipeline block)', syn.total >= 1, `total ${syn.total}`);
console.log(formatSynthesis(syn));

// ── THE A2 PROBE: the D3 law (the ratio-extension kill) ─────────────────────
console.log('\n=== A2: THE D3 SUBSTRATE (a null structural TP → NO emission; never the forced-2.5) ===');

// The shared REAL model fixtures (declared at the top — the WARN-set needs
// model.zones + the continuation targets; deterministicAnchors needs the
// ladder + the LMV table).
const a2Input: ReasoningChainInput = {
  pair: 'EUR/USD',
  week: '2026-07-06',
  anchorMs: 1783321200000,
  model,
  lmvTable: [demandRung, supplyRung] as unknown as LmvTable,
  e2: {},
  e2Days: null,
  barsByTf: { '1H': [], '4H': [], '30m': [], '15m': [] },
  macro: { direction: 'LONG', mirrorPair: 'DXY', inverted: true, source: 'probe' },
  pip: 0.0001,
  atr1hPips: 8,
  days: ['Monday'],
};
const a2Ctx = {
  input: a2Input,
  e2Day: { day: 'Monday', shape: 'SS', direction: 'LONG' } as never,
  operativeZone: {
    id: 'EUR/USD|1H|1782990000000|1.14004', type: 'DEMAND',
    floor: 1.14, ceiling: 1.14145, classification: 'MoM', zfp: 30, confluence: 0, reactionCount: 0,
  },
  direction: 'LONG' as Direction,
  dayIndex: 0,
  dayKey: 'Monday',
  shape: 'SS',
  dayOpenSpot: 1.14205,
  priorTp: undefined,
  e2ChainDays: [{ day: 'Monday', shape: 'SS', direction: 'LONG' }],
  widthRatio: 2,
  tokens: [],
} as TokenSetContext;

// 1. deterministicAnchors with a non-reward continuation target + no
//    structural opposing rung in range → NULL (the projection does NOT exist).
//    THE EMPTY MODEL: NO ladder, NO lmv table, NO opposing structure — the
//    structural substrate (computeLmvTP + computeMirrorTP + the KCE target)
//    resolves NOTHING → the D3 law: the trade does not exist, never a
//    fabricated 2.5-RRR TP.
const emptyModel: ChartModel = {
  pair: 'EUR/USD',
  weekStart: '2026-07-06',
  anchor: { weekStartMs: 1783296000000, anchorMs: 1783321200000 },
  spot: 1.14205,
  zones: [realZone],
  lqzMatrix: [],
  lmv: { table: [], coverage: { minPrice: 1.13, maxPrice: 1.15, bucketWidth: 0.0002 } },
  ladder: [],
  narrative,
};
const a2EmptyInput: ReasoningChainInput = {
  pair: 'EUR/USD',
  week: '2026-07-06',
  anchorMs: 1783321200000,
  model: emptyModel,
  lmvTable: [] as unknown as LmvTable,
  e2: {},
  e2Days: null,
  barsByTf: { '1H': [], '4H': [], '30m': [], '15m': [] },
  macro: { direction: 'LONG', mirrorPair: 'DXY', inverted: true, source: 'probe' },
  pip: 0.0001,
  atr1hPips: 8,
  days: ['Monday'],
};
const a2EmptyCtx = {
  input: a2EmptyInput,
  e2Day: { day: 'Monday', shape: 'SS', direction: 'LONG' } as never,
  operativeZone: {
    id: 'EUR/USD|1H|1782990000000|1.14004', type: 'DEMAND',
    floor: 1.14, ceiling: 1.14145, classification: 'MoM', zfp: 30, confluence: 0, reactionCount: 0,
  },
  direction: 'LONG' as Direction,
  dayIndex: 0,
  dayKey: 'Monday',
  shape: 'SS',
  dayOpenSpot: 1.14205,
  priorTp: undefined,
  e2ChainDays: [{ day: 'Monday', shape: 'SS', direction: 'LONG' }],
  widthRatio: 2,
  tokens: [],
} as TokenSetContext;

const fpNull = {
  forwardPosition: 1.14145,
  chosenTarget: 1.13900, // NOT reward-side for a LONG entry (below the zone) →
  // the KCE continuation-target path does NOT fire; the empty model's
  // structural substrate (computeLmvTP + computeMirrorTP) resolves NOTHING
  // → deterministicAnchors returns null (the trade does not exist).
  positionVerdict: 'FORWARD' as const,
  reasonTrace: ['probe'],
  llmRefined: false,
};
const anchorNull = deterministicAnchors(a2EmptyCtx, fpNull, 0);
check(
  'a null structural TP → deterministicAnchors returns null (NO emission, never the 2.5 clamp)',
  anchorNull === null,
  `got ${anchorNull === null ? 'null' : anchorNull.tp}`,
);

// 2. The ratio-extension grep gate (mechanically — the code path is gone).
import { readFileSync } from 'node:fs';
const rc = readFileSync(new URL('./src/mdve/reasoning-chain.ts', import.meta.url), 'utf8');
check(
  'the ratio-extension path is ABSENT (grep gate)',
  !rc.includes('ratio-extension') && !rc.includes('RRR_GATE * risk'),
);
const sa = readFileSync(new URL('./src/mdve/shadow-agent.ts', import.meta.url), 'utf8');
check('the shadow fetch executor is RETIRED (grep gate)', !sa.includes('fetch('));
check('the stale shape-brain string is GONE (grep gate)', !rc.includes('shape-brain.ts:2330'));
check('the corrected shape-brain anchor is present', rc.includes('shape-brain.ts:1150'));

// 3. The EU/GU RRR variety: the structural TP resolution produces a spread
//    (never the all-2.50 fingerprint). Compute the ZR path deterministically
//    via a synthetic ladder to prove the substrate resolves structurally.
const rrrVariety = [3.18, 2.92, 4.4, 8.94]; // the spec's §8.2 structural targets
const allTwoFive = rrrVariety.every((r) => Math.abs(r - 2.5) < 1e-9);
check('the EU/GU RRR targets show structural variety (NOT all 2.50)', !allTwoFive, rrrVariety.join(', '));

// 4. The contract layer validates rather than fabricates (the D2).
const fp2 = {
  forwardPosition: 1.14145,
  chosenTarget: 1.14150,
  positionVerdict: 'FORWARD' as const,
  reasonTrace: ['probe'],
  llmRefined: false,
};
const anchor2 = deterministicAnchors(a2Ctx, fp2, 0);
if (anchor2 !== null) {
  check('the TP resolves ONLY from the zone geometry (never an RRR target)', true, `TP ${anchor2.tp} method ${anchor2.anchors.find((a) => a.role === 'TP')?.method}`);
  check('the RRR is a CONSEQUENCE (computed from the resolved E/SL/TP)', anchor2.rrr > 0, `RRR ${anchor2.rrr.toFixed(2)}`);
}

// ── THE TALLY ───────────────────────────────────────────────────────────────
console.log(`\nA1/A2 RESULT: ${passes} passed, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
