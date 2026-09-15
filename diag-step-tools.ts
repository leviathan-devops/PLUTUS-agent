/**
 * DIAG-STEP-TOOLS — the Phase-7 test spec (PLUTUS_V4.5.4_AGENT_IN_THE_LOOP_
 * ENGINEERING_SPEC §7.5 — the P-1..P-9 tests, written BEFORE the code).
 *
 * THE HOST-BASED TEST LOOP (the operator's directive D10 — no container):
 * the diag harnesses run DIRECTLY on the host (bun). This one drives the
 * STEP A/B/gate tools' MECHANICAL FIREWALLS via their real execute() paths
 * with a seeded module context (the __seedPipelineContextForTest hook in
 * engine.ts) — the A4/A4b fabricated-data blocks, the A1 WARN + loop
 * continuation, the assemble + the E3-NEVER contract, the NEXT chain, the
 * context lifecycle, and the empty-input adversarial cases.
 *
 * THE PASS/FAIL PROTOCOL: every assertion is counted; ANY failure prints a
 * FAIL line + the process exits 1. All green → exit 0 (the acceptance gate).
 *
 * THE FIXTURE: a real zone map (real ids), a real per-pair shape chain, and
 * real spots — derived from the MACHINE'S OWN LEDGER where the decision must
 * be a valid member (e1ZoneId / e2ProjectionId / chosenTarget come FROM
 * buildTokenLedger — never hardcoded against an oracle; the hardcode ban).
 */

import { createPipeline7Tools, __seedPipelineContextForTest, __getPipelineContextForTest } from './src/pipeline/engine.js';
import { buildTokenLedger } from './src/pipeline/reason-step-b.js';
import { assertProjectionContract } from './src/mdve/reasoning-chain.js';
import { failuresForWeek, type StoredFailure } from './src/mdve/failure-store.js';
import { ZoneType, type DXYZone, type ShapePredictionSnapshot } from './src/types.js';
import type { ToolContext } from '@opencode-ai/plugin';

// ═══════════════════════════════════════════════════════════════════════════
// THE ASSERTION HARNESS (the pass/fail tally)
// ═══════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed += 1;
    console.log(`  [PASS] ${name}`);
  } else {
    failed += 1;
    const msg = `  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`;
    failures.push(msg);
    console.log(msg);
  }
}

function parseOutput<T = Record<string, unknown>>(result: unknown): T {
  const r = result as { output: string };
  return JSON.parse(r.output) as T;
}

// The fake ToolContext (the tools only use args + the module context — the
// harness context is a minimal shape satisfying the ToolContext type).
const fakeToolContext: ToolContext = {
  sessionID: 'diag-step-tools',
  messageID: 'diag-1',
  agent: 'trident',
  directory: process.cwd(),
  worktree: process.cwd(),
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
};

// ═══════════════════════════════════════════════════════════════════════════
// THE FIXTURE (the real zone map + the real shape chain + the real spots)
// ═══════════════════════════════════════════════════════════════════════════

const WEEK = '2026-07-06';

function makeZone(id: string, floor: number, ceiling: number, isDemand: boolean): DXYZone {
  return {
    id,
    floor,
    ceiling,
    type: isDemand ? ZoneType.MOM_DEMAND : ZoneType.MOM_SUPPLY,
    isBoM: false,
    reactionCount: isDemand ? 1 : 0,
    confluence: 6,
    pillars: [6],
    zfp: 30,
    createdAt: 1783296000000,
    lastTested: null,
    sdType: isDemand ? 'MoM' : 'MoM',
    sdFresh: isDemand ? '1S' : '0X',
    keyLevels: [floor, ceiling],
  };
}

const fixtureZones: DXYZone[] = [
  makeZone('EUR/USD|4H|1783296000000|1.08400', 1.08400, 1.08500, true),
  makeZone('EUR/USD|1H|1783296000000|1.08650', 1.08650, 1.08750, false),
  makeZone('EUR/USD|30m|1783296000000|1.08550', 1.08550, 1.08600, true),
];

const fixtureSpot = 1.08500;

const fixtureShape: ShapePredictionSnapshot = {
  version: 4,
  timestamp: 1783296000000,
  zoneMapVersion: 4,
  shapeChain: {
    storylineBias: 'Bearish-Short breakdown',
    currentShape: 'SS',
    currentContext: 'range trade from zone edge to opposing zone edge',
    zfpTransitions: [],
    chain: [
      { step: 0, day: 'Monday', shape: 'SS', confidence: 0.8, context: 'range', keyTransitionTime: '10:00', zfpCeiling: 40, zfpFloor: 20, transitionProb: '60%' },
    ],
    weeklyVisualization: 'SS',
    consolidationPhase: 'range',
    breakoutWatch: 'none',
    tradingSpeedAdjustment: 'normal',
    dayByDay: [
      { day: 'Monday', shape: 'SS', confidence: 0.8, direction: 'DOWN', session: 'NY' },
    ],
  },
};

const fixture = {
  // NOTE: weekStart is deliberately ABSENT — ensureContext sets it from the
  // weekStart arg, and the seed's Object.assign must NOT overwrite it (a
  // mismatch would make ensureContext re-create a fresh empty context).
  zoneMapSnapshot: {
    version: 4,
    timestamp: 1783296000000,
    instrument: 'MULTI',
    zones: fixtureZones,
    spots: { 'EUR/USD': fixtureSpot, DXY: 101.2, 'GBP/USD': 1.33 },
  } as const,
  zonesByPair: { 'EUR/USD': fixtureZones },
  shapeByPair: { 'EUR/USD': fixtureShape },
  harvestData: {
    ohlc: {},
    ohlcByPairTf: {},
    spots: { 'EUR/USD': fixtureSpot, DXY: 101.2, 'GBP/USD': 1.33 },
    optionsDateLink: { indexUrl: '', dateToken: '', hrefPattern: '', label: '', weekStartIso: WEEK, fridayIso: '2026-07-10' },
    options: [],
    calendar: [],
  } as never,
  chartModelsByPair: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// THE TOOLS (the registry — the D5 order)
// ═══════════════════════════════════════════════════════════════════════════

const tools = createPipeline7Tools();

// ═══════════════════════════════════════════════════════════════════════════
// P-1  the registry: all 7 tools registered (the tool list includes the 3 new)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-1 the registry (the D5 order) ===');
{
  const keys = Object.keys(tools);
  const D5 = [
    'plutus-pipeline-harvest',
    'plutus-pipeline-zones',
    'plutus-pipeline-reason-step-a',
    'plutus-pipeline-shapes',
    'plutus-pipeline-reason-step-b',
    'plutus-pipeline-setups',
    'plutus-pipeline-gate',
  ];
  check('the 3 new tools are registered', D5.every((k) => keys.includes(k)));
  check('the D5 chain order is preserved (new tools interleaved)', (() => {
    const idx = (k: string) => keys.indexOf(k);
    return idx('plutus-pipeline-harvest') < idx('plutus-pipeline-zones')
      && idx('plutus-pipeline-zones') < idx('plutus-pipeline-reason-step-a')
      && idx('plutus-pipeline-reason-step-a') < idx('plutus-pipeline-shapes')
      && idx('plutus-pipeline-shapes') < idx('plutus-pipeline-reason-step-b')
      && idx('plutus-pipeline-reason-step-b') < idx('plutus-pipeline-setups')
      && idx('plutus-pipeline-setups') < idx('plutus-pipeline-gate');
  })(), `registry keys: ${keys.join(', ')}`);
  check('the retained legacy tools still registered', ['plutus-pipeline-charts', 'plutus-browse-screenshot', 'plutus-backtest-setups', 'plutus-save-screenshot'].every((k) => keys.includes(k)));
  check('the 3 new tools carry the plutus- prefix (the allowlist unchanged)', D5.slice(2, 3).concat(D5.slice(4, 5)).concat([D5[6]!]).every((k) => k.startsWith('plutus-')));
}

// ═══════════════════════════════════════════════════════════════════════════
// P-2  the A4 test: a fabricated zoneId in the designation → BLOCKED
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-2 the A4 test (fabricated zoneId → BLOCKED) ===');
{
  __seedPipelineContextForTest(WEEK, fixture);
  const stepA = tools['plutus-pipeline-reason-step-a'];
  const out = await stepA.execute({
    weekStart: WEEK,
    designation: [{
      pair: 'EUR/USD',
      day: 'Mon',
      zoneId: 'FABRICATED-ZONE-999',   // NOT in the fixture zone map
      role: 'DEMAND',
      classification: 'MoM',
      rationale: 'The fabricated level is not a real E1 zone — this must be blocked. The real edge at 1.08450 is the demand.',
      pressureRead: 'VIRGIN zfp30',
    }],
  }, fakeToolContext);
  const parsed = parseOutput(out);
  check('a fabricated zoneId returns BLOCKED', parsed.status === 'BLOCKED', `status=${String(parsed.status)}`);
  check('the BLOCK names the invented zone', String(parsed.error ?? '').includes('FABRICATED-ZONE-999'));
}

// ═══════════════════════════════════════════════════════════════════════════
// P-3  the A4b test: a generic rationale (<40c / no price) → BLOCKED
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-3 the A4b test (generic rationale → BLOCKED) ===');
{
  const stepA = tools['plutus-pipeline-reason-step-a'];
  const out = await stepA.execute({
    weekStart: WEEK,
    designation: [{
      pair: 'EUR/USD',
      day: 'Mon',
      zoneId: fixtureZones[0]!.id,     // a REAL zone id
      role: 'DEMAND',
      classification: 'MoM',
      rationale: 'zone confirmed',      // <40 chars, no price reference
      pressureRead: 'VIRGIN zfp30',
    }],
  }, fakeToolContext);
  const parsed = parseOutput(out);
  check('a generic rationale (<40c / no price) returns BLOCKED', parsed.status === 'BLOCKED', `status=${String(parsed.status)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// P-4  the A1 test: a bad projection → the WARNs fire + the loop continues
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-4 the A1 test (bad projection → WARNs fire + loop continues) ===');
{
  const stepB = tools['plutus-pipeline-reason-step-b'];
  // A deliberately-bad projection: an invented e1ZoneId + an invented
  // e2ProjectionId + an out-of-set chosenTarget + a non-finite forwardPosition.
  // The machine must WARN (W-1 · W-4 · W-5 · W-6) and CONTINUE — never a
  // hard-kill, never a crash (the D2 law).
  //
  // RUN-UNIQUE COMPONENT: the failure store persists across diag runs — a
  // repeated (week, component) would accumulate prior GROUNDING_WARN rows and
  // trip the REFINEMENT_EXHAUSTED boundary from THE OTHER RUNS' rows (not this
  // test's). A run-unique day token (timestamp-suffixed) makes the component
  // unique, so priorWarns starts at 0 and THIS run's GROUNDING_WARN rows are
  // the honest delta the loop-continuation assertion measures.
  const A1_WEEK = '2099-01-05';
  const A1_DAY = `Monday-Diag-${Date.now()}`;
  __seedPipelineContextForTest(A1_WEEK, fixture);
  const warnCountBefore = failuresForWeek(A1_WEEK).filter((r) => r.reason === 'GROUNDING_WARN').length;
  const out = await stepB.execute({
    weekStart: A1_WEEK,
    decisions: [{
      pair: 'EUR/USD',
      day: A1_DAY,
      direction: 'SHORT',
      forwardPosition: Number.NaN,               // W-1
      chosenTarget: 'not-in-the-closed-set',     // W-4
      E: 1.08600,
      SL: 1.08800,
      TP: 1.08400,
      e1ZoneId: 'INVENTED-E1-ZONE',              // W-5
      e2ProjectionId: 'INVENTED-E2-PROJ',        // W-6
      confidence: 0.7,
      rationale: 'A deliberately-bad projection to exercise the WARN set without crashing.',
    }],
  }, fakeToolContext);
  const parsed = parseOutput(out);
  check('the WARN set fires (not a hard kill, not a crash)', parsed.status === 'success_with_warnings', `status=${String(parsed.status)}`);
  const warns = (parsed.warnings as Array<{ check: string }>) ?? [];
  check('the W-1 WARN fired (forwardPosition non-finite)', warns.some((w) => w.check.startsWith('W-1')));
  check('the W-4 WARN fired (chosenTarget outside the closed set)', warns.some((w) => w.check.startsWith('W-4')));
  check('the W-5 WARN fired (invented e1ZoneId)', warns.some((w) => w.check.startsWith('W-5')));
  check('the W-6 WARN fired (invented e2ProjectionId)', warns.some((w) => w.check.startsWith('W-6')));
  const warnCountAfter = failuresForWeek(A1_WEEK).filter((r) => r.reason === 'GROUNDING_WARN').length;
  check('the GROUNDING_WARN rows were recorded in the failure store (the D2 audit trail)', warnCountAfter > warnCountBefore, `before=${warnCountBefore} after=${warnCountAfter}`);
  check('the loop CONTINUES — no projection was emitted for the WARNed decision (the refine loop, not a kill)', (parsed.projections as unknown[]).length === 0, `projections=${(parsed.projections as unknown[]).length}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// P-5  the assemble: the decisions → the full TradeProjections (contract clean)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-5 the assemble (clean decisions → contract-clean projections) ===');
{
  const stepB = tools['plutus-pipeline-reason-step-b'];
  const ctx = __seedPipelineContextForTest(WEEK, fixture);
  // Derive the decision FROM THE MACHINE'S OWN LEDGER (the hardcode ban: the
  // e1ZoneId / e2ProjectionId / chosenTarget are the ledger's real members).
  const ledger = buildTokenLedger(ctx, 'EUR/USD', 'Monday');
  check('the ledger exposes real e1ZoneIds', (ledger.e1ZoneIds ?? []).length > 0, `e1ZoneIds=${JSON.stringify(ledger.e1ZoneIds)}`);
  check('the ledger exposes real e2ProjectionIds', (ledger.e2ProjectionIds ?? []).length > 0, `e2ProjectionIds=${JSON.stringify(ledger.e2ProjectionIds)}`);
  check('the ledger exposes the CLOSED continuation-targets set', (ledger.continuationTargets ?? []).length > 0);

  const e1ZoneId = ledger.e1ZoneIds[0]!;
  const e2ProjectionId = ledger.e2ProjectionIds[0]!;
  const chosenTarget = ledger.continuationTargets[0]!;
  // SHORT anchors in the E3-NEVER order (TP < E < SL) — derived from the spot.
  const E = fixtureSpot + 0.00100;
  const SL = fixtureSpot + 0.00300;
  const TP = fixtureSpot - 0.00150;

  const out = await stepB.execute({
    weekStart: WEEK,
    decisions: [{
      pair: 'EUR/USD',
      day: 'Monday',
      direction: 'SHORT',
      forwardPosition: 5,
      chosenTarget,
      E,
      SL,
      TP,
      e1ZoneId,
      e2ProjectionId,
      confidence: 0.7,
      rationale: 'The short is halfway to the demand — the reaction WILL happen at the designated zone (the 1.08450 edge) with the 1.08650 supply as the shield.',
    }],
  }, fakeToolContext);
  const parsed = parseOutput(out);
  check('the clean decisions assemble (no WARNs)', parsed.status === 'success', `status=${String(parsed.status)}`);
  const projs = (parsed.projections as unknown[]) ?? [];
  check('the projections array is populated', projs.length === 1, `projections=${projs.length}`);
  if (projs.length === 1) {
    const p = projs[0] as { E: number; SL: number; TP: number; RRR: number; direction: string; anchors: Array<{ e1ZoneId: string; e2ProjectionId: string }> };
    check('the projection carries the machine-computed RRR', p.RRR > 0 && Number.isFinite(p.RRR), `RRR=${p.RRR}`);
    check('the E3-NEVER anchors carry the e1ZoneId + e2ProjectionId', p.anchors.every((a) => a.e1ZoneId === e1ZoneId && a.e2ProjectionId === e2ProjectionId));
    try {
      assertProjectionContract(p as never);
      check('assertProjectionContract passes (the E3-NEVER — 0 violations)', true);
    } catch (e) {
      check('assertProjectionContract passes (the E3-NEVER — 0 violations)', false, e instanceof Error ? e.message : String(e));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// P-6  the NEXT chain: every tool's output carries the NEXT instruction
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-6 the NEXT-instruction chain ===');
{
  // STEP A's output must carry the NEXT: call shapes
  const stepA = tools['plutus-pipeline-reason-step-a'];
  const outA = await stepA.execute({
    weekStart: WEEK,
    designation: [{
      pair: 'EUR/USD',
      day: 'Mon',
      zoneId: fixtureZones[0]!.id,
      role: 'DEMAND',
      classification: 'MoM',
      rationale: 'The 1.08450 demand is the fortress — 1 reaction, unbroken, the path WILL visit it before the supply at 1.08650 rejects.',
      pressureRead: 'ACTIVE_1 zfp30',
    }],
  }, fakeToolContext);
  const parsedA = parseOutput(outA);
  check('STEP A output carries the NEXT: call shapes', String(parsedA.nextStep ?? '').includes('plutus-pipeline-shapes'));

  // STEP B's output must carry the NEXT: call setups
  const stepB = tools['plutus-pipeline-reason-step-b'];
  const ctxB = __seedPipelineContextForTest(WEEK, fixture);
  const ledgerB = buildTokenLedger(ctxB, 'EUR/USD', 'Monday');
  const outB = await stepB.execute({
    weekStart: WEEK,
    decisions: [{
      pair: 'EUR/USD',
      day: 'Monday',
      direction: 'SHORT',
      forwardPosition: 5,
      chosenTarget: ledgerB.continuationTargets[0]!,
      E: fixtureSpot + 0.00100,
      SL: fixtureSpot + 0.00300,
      TP: fixtureSpot - 0.00150,
      e1ZoneId: ledgerB.e1ZoneIds[0]!,
      e2ProjectionId: ledgerB.e2ProjectionIds[0]!,
      confidence: 0.7,
      rationale: 'The path from the day open reaches the demand edge at 1.08450; the 1.08650 supply is the shield the short is halfway to.',
    }],
  }, fakeToolContext);
  const parsedB = parseOutput(outB);
  check('STEP B output carries the NEXT: call setups', String(parsedB.nextStep ?? '').includes('plutus-pipeline-setups'));
}

// ═══════════════════════════════════════════════════════════════════════════
// P-7  the context lifecycle: ensureContext/resetContext across the chain
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-7 the context lifecycle (ensureContext → carry → resetContext at the gate) ===');
{
  // STEP A wrote stepADesignation into the context (P-6's first call).
  const ctxAfterA = __getPipelineContextForTest();
  check('STEP A stored the designation in the context', Array.isArray(ctxAfterA?.stepADesignation) && (ctxAfterA?.stepADesignation ?? []).length === 1);

  // STEP B stored the projections in the context (P-6's second call).
  check('STEP B stored the projections in the context', Array.isArray(ctxAfterA?.projections) && (ctxAfterA?.projections ?? []).length === 1);

  // The gate tool runs the G1-G10 verdicts AND calls resetContext() at the chain's end.
  const gate = tools['plutus-pipeline-gate'];
  const outGate = await gate.execute({ weekStart: WEEK }, fakeToolContext);
  const parsedGate = parseOutput(outGate);
  const verdicts = (parsedGate.verdicts as Array<{ gate: string; pass: boolean }>) ?? [];
  check('the gate returns the G1-G10 verdicts', verdicts.length === 10, `verdicts=${verdicts.length}`);
  check('the gate reports a verdict (pass or FAILED — never crashes)', parsedGate.status === 'success' || parsedGate.status === 'FAILED');
  const afterGate = __getPipelineContextForTest();
  check('resetContext() at the gate — the context is cleared', afterGate === null);
}

// ═══════════════════════════════════════════════════════════════════════════
// P-8  the adversarial: the designation empty → BLOCKED (min 1 required)
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-8 the adversarial (empty designation → BLOCKED) ===');
{
  __seedPipelineContextForTest(WEEK, fixture);
  const stepA = tools['plutus-pipeline-reason-step-a'];
  const out = await stepA.execute({ weekStart: WEEK, designation: [] }, fakeToolContext);
  const parsed = parseOutput(out);
  check('an empty designation returns BLOCKED', parsed.status === 'BLOCKED', `status=${String(parsed.status)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// P-9  the adversarial: the projections empty → BLOCKED
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n=== P-9 the adversarial (empty decisions → BLOCKED) ===');
{
  const stepB = tools['plutus-pipeline-reason-step-b'];
  const out = await stepB.execute({ weekStart: WEEK, decisions: [] }, fakeToolContext);
  const parsed = parseOutput(out);
  check('an empty decisions array returns BLOCKED', parsed.status === 'BLOCKED', `status=${String(parsed.status)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TALLY + THE EXIT PROTOCOL
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════════');
console.log(`diag-step-tools: ${passed} passed · ${failed} failed`);
if (failed > 0) {
  console.log('FAILURES:');
  for (const f of failures) console.log(f);
  process.exit(1);
}
console.log('[DONE] all P-1..P-9 green');
