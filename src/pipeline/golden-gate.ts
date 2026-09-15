/**
 * THE W6 GOLDEN GATE — the G1-G10 acceptance checks.
 * (The CME spec's Phase 9 + the L2 spec's PART 14 — the mechanical acceptance
 *  of the ENTIRE agent-in-the-loop overhaul: the reasoning chain, the STEP A/B
 *  tools, the mirror cascade, the failure store.)
 *
 * runGoldenGate(ctx) is the ONE source of truth consumed by:
 *   - the W6 wave's gate tool (plutus-pipeline-gate — the Phase 9 harness):
 *       const ctx = ensureContext(args.weekStart);
 *       const verdicts = runGoldenGate(ctx);      // the G1-G10 checks (Phase 9)
 *       return { output: JSON.stringify({ status, verdicts }, null, 2) };
 *   - the diag-reasoning-chain-golden harness (the host acceptance run).
 *
 * THE GOLDEN CONST = THE MEASUREMENT ORACLE ONLY (the TEMPORARY ARCHITECTURE
 * label — the pipeline NEVER reads it; the gate measures the emissions against
 * it). The grep gate: the golden levels appear ONLY in this module + the diag
 * harness — nowhere in the emission path. The ≤3p tolerance is the ONLY
 * tolerance (the operator's mandate: "Test against the golden standard at 3
 * pips after EVERY change — not 30, not 10, THREE"); the G1 EU-LONG entry
 * tolerance is 2 pips (the CME spec §9.2).
 *
 * THE NEVER-CRASH CONTRACT (the A-7 amendment to the harness contract): the
 * gate MUST also run when the projections are absent (the failure path) — it
 * returns the FAILED verdicts with the reason named (the missing phase
 * outputs), it NEVER crashes, it reports.
 */

import { createHash } from 'node:crypto';
import {
  assertProjectionContract,
  resolveOperativeZone,
  type ChainFailure,
  type Direction,
  type MacroAuthority,
  type PairKey,
  type TradeProjection,
} from '../mdve/reasoning-chain.js';
import type { ChartModel } from '../mdve/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE GOLDEN ORACLE (the MEASUREMENT ORACLE ONLY — never a pipeline input)
// ═══════════════════════════════════════════════════════════════════════════
export const GOLDEN_ORACLE: Record<PairKey, Array<{ dir: Direction; entry: number }>> = {
  DXY: [{ dir: 'LONG', entry: 100.945 }, { dir: 'SHORT', entry: 101.14 }],
  'EUR/USD': [{ dir: 'SHORT', entry: 1.14395 }, { dir: 'LONG', entry: 1.14110 }],
  'GBP/USD': [{ dir: 'LONG', entry: 1.33330 }],
};

/** The ONLY tolerance (the operator's 3-pip mandate). */
export const ORACLE_TOLERANCE_PIPS = 3;
/** The G1 EU LONG entry tolerance (the CME spec §9.2). */
export const G1_ENTRY_TOLERANCE_PIPS = 2;
/** The G9 wall-time cap (≤ 5 min — the C1/C3/C4 fix's proof). */
export const WALL_TIME_LIMIT_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// THE VERDICT + THE CONTEXT CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════
export interface GateVerdict {
  gate: string;      // 'G1' .. 'G10'
  name: string;
  pass: boolean;
  /** The measured value — NEVER a bare pass/fail (the task's mandate: every
   *  gate's verdict carries the measured detail). */
  detail: string;
  evidence: string[];
}

export interface GoldenGateContext {
  week: string;
  anchorMs: number;
  weekStartMs: number;
  pip: Record<PairKey, number>;
  /** The unified macro authority (the G3/G4 mirror resolution). */
  macro: MacroAuthority;
  /** The pair models (the G4 ZONE-ELEMENTS resolution + the A4 grounding). */
  models: Record<PairKey, ChartModel>;
  /** The parallel run's emissions (the G1-G7 measurement). */
  projections: TradeProjection[];
  /** The sequential run's emissions (the G10 comparison — required). */
  sequentialProjections?: TradeProjection[];
  /** The parallel run's failures (the G6 hard-throw discipline). */
  failures: ChainFailure[];
  /** The run's ledger divergences (the G3 MACRO_DIVERGENCE evidence). */
  divergences: string[];
  store: {
    hardThrowsForWeek: number;       // the store's REFINEMENT_EXHAUSTED rows (G6)
    macroDivergenceRows: number;     // the store's MACRO_DIVERGENCE rows (G3)
    weekRows: number;                // the store's total week rows (informational)
  };
  /** The wall time of the Monday diag's PRIMARY (parallel) run — the G9 base. */
  wallTimeMs: number;
  /** Whether the stall detector killed a working generation (the G9/A7 — never). */
  stallKilled: boolean;
  temporal: {
    /** The G8/A3 negative-control verdict (a later anchor → anchors unchanged). */
    negativeControlUnchanged: boolean;
    /** The max bar timestamp fed to the chain (≤ anchorMs = the gate held). */
    maxReadTimestamp: number;
    negativeControlDetail: string;
  };
  fixture: {
    /** The fixture's max bar timestamp (proves bars beyond the anchor exist). */
    maxTimestampPresent: number;
    totalBars: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE G10 PROJECTION DIGEST (the byte-identical determinism measurement)
// ═══════════════════════════════════════════════════════════════════════════
/** The canonical byte-digest of a projection set — the G10 + the determinism
 *  ×2 comparison (the parallel run's ledgers byte-identical to the sequential
 *  run's — the C1 order-independence proof). */
export function projectionDigest(projections: TradeProjection[]): string {
  const canon = projections.map((p) => ({
    pair: p.pair,
    day: p.day,
    shape: p.shape,
    direction: p.direction,
    E: p.E,
    SL: p.SL,
    TP: p.TP,
    RRR: p.RRR,
    entryZoneId: p.entryZoneId,
    entryLqzId: p.entryLqzId ?? null,
    source: p.source,
    e2ProjectionId: p.e2ProjectionId,
    e2DayDirection: p.e2DayDirection,
    setupId: p.setupId,
    chainContext: p.chainContext,
    confidence: p.confidence,
    pressureRead: p.pressureRead,
    validation: p.validation,
    anchors: p.anchors,
    tokenLedger: p.tokenLedger,
  }));
  return createHash('sha256').update(JSON.stringify(canon)).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════
// THE PER-GATE CHECKS (G1-G10 — each carries the measured detail)
// ═══════════════════════════════════════════════════════════════════════════
function gateG1(ctx: GoldenGateContext): GateVerdict {
  const pipEU = ctx.pip['EUR/USD'];
  const euLongs = ctx.projections.filter((p) => p.pair === 'EUR/USD' && p.direction === 'LONG');
  const fortress = euLongs.find((p) =>
    p.tokenLedger.some((t) => t.token === 'zone-identification' && t.verdict.includes('PHANTOM_BOM')),
  );
  const deltas = euLongs.map((p) => Math.abs(p.E - GOLDEN_ORACLE['EUR/USD'][1]!.entry) / pipEU);
  const best = deltas.length > 0 ? Math.min(...deltas) : -1;
  const anchorsTrace = fortress !== undefined
    ? fortress.anchors.every((a) => Boolean(a.e1ZoneId) && Boolean(a.e2ProjectionId))
    : false;
  const pass = fortress !== undefined && best >= 0 && best <= G1_ENTRY_TOLERANCE_PIPS && anchorsTrace;
  return {
    gate: 'G1',
    name: 'the EU LONG phantom-BoM fortress emission',
    pass,
    detail: fortress === undefined
      ? 'NO EU LONG projection carries a token-1 PHANTOM_BOM verdict — the fortress is absent'
      : `fortress ${fortress.entryZoneId} — token-1 '${fortress.tokenLedger.find((t) => t.token === 'zone-identification')?.verdict}' · E ${fortress.E.toFixed(5)} vs the golden 1.14110 at Δ${best.toFixed(1)}p (≤ ${G1_ENTRY_TOLERANCE_PIPS}p) · anchors trace ${anchorsTrace ? 'YES' : 'NO'}`,
    evidence: [
      `token-1 verdict: ${fortress?.tokenLedger.find((t) => t.token === 'zone-identification')?.verdict ?? 'NONE'}`,
      `best entry delta: ${best < 0 ? 'NONE' : best.toFixed(1) + 'p'} (tolerance ${G1_ENTRY_TOLERANCE_PIPS}p)`,
      `anchors trace (E3-NEVER): ${anchorsTrace ? 'all ' + fortress?.anchors.length + ' anchors carry e1ZoneId+e2ProjectionId' : 'FAILED'}`,
    ],
  };
}

function gateG2(ctx: GoldenGateContext): GateVerdict {
  const euLongNative = ctx.projections.find(
    (p) => p.pair === 'EUR/USD' && p.direction === 'LONG' && p.source === 'NATIVE',
  );
  const cascadeDupes = ctx.projections.filter(
    (p) => p.pair === 'EUR/USD' && p.direction === 'LONG' && p.source === 'CASCADE',
  );
  const pass = euLongNative !== undefined && cascadeDupes.length === 0;
  return {
    gate: 'G2',
    name: 'the native-first cascade-complementary',
    pass,
    detail: `EU LONG native lane ${euLongNative !== undefined ? euLongNative.setupId : 'ABSENT'} · cascade duplicates ${cascadeDupes.length} (${cascadeDupes.map((d) => d.setupId).join(', ') || 'none'}) — the cascade complements, never overwrites/duplicates`,
    evidence: [
      `native source flags present: ${ctx.projections.filter((p) => p.source === 'NATIVE').length}`,
      `cascade source flags present: ${ctx.projections.filter((p) => p.source === 'CASCADE').length}`,
    ],
  };
}

function gateG3(ctx: GoldenGateContext): GateVerdict {
  const guLongs = ctx.projections.filter((p) => p.pair === 'GBP/USD' && p.direction === 'LONG');
  const macroDir = ctx.macro['GBP/USD']?.direction;
  const macroWins = guLongs.some((p) => p.direction === macroDir);
  const divergenceRecorded = ctx.divergences.some((d) => d.includes('GBP/USD') && d.includes('Monday'));
  const storeRecorded = ctx.store.macroDivergenceRows > 0;
  const pass = guLongs.length > 0 && macroWins && (divergenceRecorded || storeRecorded);
  return {
    gate: 'G3',
    name: 'the GU Monday direction = LONG (the WL)',
    pass,
    detail: `GU Monday LONGs ${guLongs.length} (${guLongs.map((p) => p.setupId).join(', ') || 'NONE'}) · macro direction ${macroDir} · macro wins ${macroWins ? 'YES' : 'NO'} · the R divergence recorded ${divergenceRecorded ? 'in the ledger' : 'NO'} + ${storeRecorded ? `${ctx.store.macroDivergenceRows} store row(s)` : 'NO store row'}`,
    evidence: [
      `divergence sample: ${ctx.divergences.find((d) => d.includes('GBP/USD')) ?? 'none'}`,
      `store MACRO_DIVERGENCE rows: ${ctx.store.macroDivergenceRows}`,
    ],
  };
}

function zoneElementType(ctx: GoldenGateContext, pair: PairKey, zoneId: string | undefined): string | null {
  if (!zoneId) return null;
  const model = ctx.models[pair];
  if (!model) return null; // the model stage failed — the element is unresolvable
  const op = resolveOperativeZone(model, pair, zoneId);
  return op?.type ?? null;
}

function gateG4(ctx: GoldenGateContext): GateVerdict {
  const euLongs = ctx.projections.filter((p) => p.pair === 'EUR/USD' && p.direction === 'LONG');
  const fortress = euLongs.find((p) =>
    p.tokenLedger.some((t) => t.token === 'zone-identification' && t.verdict.includes('PHANTOM_BOM')),
  );
  const dxyShorts = ctx.projections.filter((p) => p.pair === 'DXY' && p.direction === 'SHORT');
  const euMacro = ctx.macro['EUR/USD'];
  const dxyMacro = ctx.macro['DXY'];
  const mirrorResolves = euMacro?.mirrorPair === 'DXY' && euMacro?.inverted === true
    && dxyMacro?.mirrorPair === 'EUR/USD' && dxyMacro?.inverted === true;
  const euType = fortress ? zoneElementType(ctx, 'EUR/USD', fortress.entryZoneId) : null;
  const dxyType = dxyShorts.length > 0 ? zoneElementType(ctx, 'DXY', dxyShorts[0]!.entryZoneId) : null;
  const zoneElementsOpposed = euType === 'DEMAND' && dxyType === 'SUPPLY';
  const pass = fortress !== undefined && dxyShorts.length > 0 && mirrorResolves && zoneElementsOpposed;
  return {
    gate: 'G4',
    name: 'the EU/DXY 1:1 inverted mirror',
    pass,
    detail: `EU LONG fortress ${fortress?.entryZoneId ?? 'ABSENT'} (element ${euType ?? 'n/a'}) · DXY SHORT ${dxyShorts[0]?.setupId ?? 'ABSENT'} (element ${dxyType ?? 'n/a'}) · mirror resolves ${mirrorResolves ? 'YES (EU↔DXY inverted)' : 'NO'} · ZONE ELEMENTS opposed ${zoneElementsOpposed ? 'YES (DEMAND ↔ SUPPLY)' : 'NO'}`,
    evidence: [
      `euMacro: mirror ${euMacro?.mirrorPair ?? '-'} inverted ${euMacro?.inverted ?? '-'}`,
      `dxyMacro: mirror ${dxyMacro?.mirrorPair ?? '-'} inverted ${dxyMacro?.inverted ?? '-'}`,
    ],
  };
}

function gateG5(ctx: GoldenGateContext): GateVerdict {
  let violations = 0;
  const broken: string[] = [];
  for (const p of ctx.projections) {
    try {
      assertProjectionContract(p);
    } catch (err) {
      violations += 1;
      broken.push(`${p.setupId} (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  const anchorLess = ctx.projections.filter((p) => p.anchors.length === 0).length;
  const pass = violations === 0;
  return {
    gate: 'G5',
    name: 'the E3-NEVER compliance (100% pass assertProjectionContract)',
    pass,
    detail: `${ctx.projections.length} projections audited · ${violations} contract violations · ${anchorLess} anchor-less (${broken.slice(0, 3).join('; ') || 'none'})`,
    evidence: broken.length > 0 ? broken : [`assertProjectionContract passed on all ${ctx.projections.length} projections`],
  };
}

function gateG6(ctx: GoldenGateContext): GateVerdict {
  // THE PRIMARY SIGNAL: THIS run's REFINEMENT_EXHAUSTED count (the hard-throw
  // discipline of the measured emissions). The store's accumulated hard-throw
  // rows are EVIDENCE, not the pass driver — the store is APPEND-ONLY across
  // runs (the W5-W7 wave's design), so a historical row from a previous run
  // must not pin G6 red after the pipeline stops hard-throwing.
  const runThrows = ctx.failures.filter((f) => f.failureType === 'REFINEMENT_EXHAUSTED').length;
  const pass = runThrows === 0;
  return {
    gate: 'G6',
    name: 'the hard-throw discipline (0 REFINEMENT_EXHAUSTED)',
    pass,
    detail: `THIS run's REFINEMENT_EXHAUSTED ${runThrows} (${pass ? 'PASS — the run hard-threw nothing' : 'FAIL — the run hard-threw (the W7 TP-substrate fix target)'}) · the store's accumulated hard-throw rows ${ctx.store.hardThrowsForWeek} (append-only across runs — evidence; week rows ${ctx.store.weekRows})`,
    evidence: [
      `run failures by type: ${countBy(ctx.failures.map((f) => f.failureType))}`,
      `store accumulated REFINEMENT_EXHAUSTED rows: ${ctx.store.hardThrowsForWeek} (the store never clears — the run's own count is the acceptance signal)`,
    ],
  };
}

function gateG7(ctx: GoldenGateContext): GateVerdict {
  // (a) the golden convergence — the "correct trades still emit" proxy (the
  //     Monday-anchored harness's honest scope: the 5 Monday golden targets;
  //     the full 13-unique-trade set spans the report week — recorded as a
  //     scope note, the Monday targets are the build target per the operator's
  //     "ONE DAY AT A TIME" mandate).
  let hits = 0;
  let total = 0;
  const conv: string[] = [];
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    for (const g of GOLDEN_ORACLE[pair]) {
      total += 1;
      const deltas = ctx.projections
        .filter((p) => p.pair === pair && p.direction === g.dir)
        .map((p) => Math.abs(p.E - g.entry) / ctx.pip[pair]);
      const best = deltas.length > 0 ? Math.min(...deltas) : -1;
      const hit = best >= 0 && best <= ORACLE_TOLERANCE_PIPS;
      if (hit) hits += 1;
      conv.push(`${pair} ${g.dir} ${g.entry.toFixed(5)} -> ${best < 0 ? 'NONE' : `Δ${best.toFixed(1)}p`} (${hit ? 'HIT' : 'MISS'})`);
    }
  }
  // (b) the no fixed-width SL regression — the SL widths are ratio-anchored,
  //     never a single constant across the emissions (the audit's regression).
  const widths = ctx.projections.map((p) => Math.abs(p.E - p.SL) / ctx.pip[p.pair]);
  const distinctWidths = new Set(widths.map((w) => w.toFixed(4)));
  const fixedWidthRegression = widths.length > 1 && distinctWidths.size <= 1;
  const pass = hits >= 1 && !fixedWidthRegression;
  return {
    gate: 'G7',
    name: 'the no-regression of the correct trades',
    pass,
    detail: `golden convergence ${hits}/${total} at ≤${ORACLE_TOLERANCE_PIPS}p (${conv.join(' · ')}) · SL widths ${distinctWidths.size} distinct (${fixedWidthRegression ? 'FIXED-WIDTH REGRESSION' : 'ratio-anchored'}) — the 13 unique trades is the report-week scope (this Monday harness measures the Monday golden targets)`,
    evidence: conv,
  };
}

function gateG8(ctx: GoldenGateContext): GateVerdict {
  const maxRead = ctx.temporal.maxReadTimestamp;
  const anchor = ctx.anchorMs;
  const fixtureHasBeyond = ctx.fixture.maxTimestampPresent > anchor;
  const noForwardRead = maxRead <= anchor && fixtureHasBeyond;
  const negative = ctx.temporal.negativeControlUnchanged;
  const pass = noForwardRead && negative;
  return {
    gate: 'G8',
    name: 'the temporal gate respected',
    pass,
    detail: `max bar read ${maxRead} ≤ anchor ${anchor} (${noForwardRead ? 'YES' : 'NO — FORWARD READ'}) · fixture bars beyond the anchor exist: ${fixtureHasBeyond ? 'YES (' + (ctx.fixture.maxTimestampPresent - anchor) / 3600000 + 'h past)' : 'NO (the control is vacuous)'} · negative control (a later anchor → anchors unchanged): ${negative ? 'UNCHANGED' : 'CHANGED'}`,
    evidence: [
      ctx.temporal.negativeControlDetail,
      `fixture total bars: ${ctx.fixture.totalBars} · max present ${new Date(ctx.fixture.maxTimestampPresent).toISOString()}`,
    ],
  };
}

function gateG9(ctx: GoldenGateContext): GateVerdict {
  const pass = ctx.wallTimeMs <= WALL_TIME_LIMIT_MS && !ctx.stallKilled;
  return {
    gate: 'G9',
    name: 'the performance gate (≤ 5 min)',
    pass,
    detail: `wall ${(ctx.wallTimeMs / 1000).toFixed(1)}s ≤ ${WALL_TIME_LIMIT_MS / 60000}min (${pass ? 'PASS' : 'OVER BUDGET'}) · stall-killed a working generation: ${ctx.stallKilled ? 'YES — VIOLATION' : 'NO (the stall detector never fires on a working generation)'}`,
    evidence: [`wall time ms: ${Math.round(ctx.wallTimeMs)}`],
  };
}

function gateG10(ctx: GoldenGateContext): GateVerdict {
  if (!ctx.sequentialProjections) {
    return {
      gate: 'G10',
      name: 'the parallel-equivalence gate',
      pass: false,
      detail: 'the sequential run is ABSENT from the ctx — the G10 comparison cannot run (the gate reports, never crashes)',
      evidence: ['ctx.sequentialProjections undefined — the diag must supply the sequential run'],
    };
  }
  const par = projectionDigest(ctx.projections);
  const seq = projectionDigest(ctx.sequentialProjections);
  const pass = par === seq;
  return {
    gate: 'G10',
    name: 'the parallel-equivalence gate (byte-identical)',
    pass,
    detail: `parallel ${par.slice(0, 16)} vs sequential ${seq.slice(0, 16)} — ${pass ? 'BYTE-IDENTICAL (the C1 order-independence holds)' : 'DIFFER (the determinism broke under the Promise.all)'}`,
    evidence: [`parallel sha256: ${par}`, `sequential sha256: ${seq}`, `projection sets: ${ctx.projections.length} vs ${ctx.sequentialProjections.length}`],
  };
}

function countBy<T extends string>(items: T[]): string {
  const counts: Record<string, number> = {};
  for (const i of items) counts[i] = (counts[i] ?? 0) + 1;
  return Object.entries(counts).map(([k, v]) => `${k}×${v}`).join(' · ') || 'none';
}

function runChecks(ctx: GoldenGateContext): GateVerdict[] {
  return [gateG1(ctx), gateG2(ctx), gateG3(ctx), gateG4(ctx), gateG5(ctx), gateG6(ctx), gateG7(ctx), gateG8(ctx), gateG9(ctx), gateG10(ctx)];
}

/** THE GATE ENTRY — the G1-G10 verdicts. NEVER throws (the never-crash
 *  contract): a malformed/absent ctx returns the FAILED verdict with the
 *  reason named. */
export function runGoldenGate(ctx: GoldenGateContext): GateVerdict[] {
  try {
    return runChecks(ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return [
      {
        gate: 'G-ALL',
        name: 'the gate crashed (the never-crash contract)',
        pass: false,
        detail: `the gate NEVER crashes — a malformed ctx reports FAILED: ${msg}`,
        evidence: [`runGoldenGate caught: ${msg}`],
      },
    ];
  }
}
