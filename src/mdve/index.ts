/**
 * MDVE — the Mathematical Data Vision Engine (PLUTUS_V4.4_MDVE_SPEC).
 * The EYES of the Plutus v4.4 triad. v4.4.0a.
 *
 * ═══════════════════════════════════════════════════════════════
 * M: OHLC × Options × Anchor → ChartModel — a TOTAL function (Losslessness
 * Theorem: |I(S_math)| = 1 — every input data set produces exactly one
 * model). Zero pixel input, zero LLM inference (§12 Law 1). Same bars →
 * byte-identical model (§12 Law 2).
 *
 * Composition (§4.1 algebraic composition — each stage's output type is
 * the next stage's input type):
 *   detect (ob-engine §6.1) → classify (bom-mom §6.3) → freshness (§6.4)
 *   → matrix (lqz-matrix §6.2) → ladder (§7 scaffold) → narrate (§6.5)
 *
 * ABSORBED canon (§12 Law 4 — wrapped, never rewritten):
 *   src/brains/4h-sd-lobe.ts   — OB/S-D detection (multi-TF driver)
 *   src/brains/lqz-lobe.ts     — per-pattern LQZ confirmation thresholds
 *   src/engines/ladder-scaffold.ts — the deterministic ladder
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';
import { construct4HZones } from '../brains/4h-sd-lobe.js';
import { detectLiquidityZones, LQZ_LOOKBACK_BARS } from '../brains/lqz-lobe.js';
import type { PillarResult } from '../brains/9-pillar-lobe.js';
import { generateCandidateLadder } from '../engines/ladder-scaffold.js';
import type { ScaffoldRung } from '../engines/ladder-scaffold.js';
import { buildZoneMap } from './ob-engine.js';
import { buildLqzMatrix, matrixLadderRungs } from './lqz-matrix.js';
import type { Timeframe } from './lqz-matrix.js';
import { buildLmvTable } from './lmv.js';
import type { LmvResult, LqzZoneMatrix } from './lmv.js';
// THE RESTING-SIDE LAW (the operator's semantics fix): the LMV-bridged
// rungs' ZoneModel.type is reassigned by the STRUCTURE they sit in — fully
// inside a DEMAND zone → DEMAND (buy-side liquidity), inside a SUPPLY zone
// → SUPPLY (sell-side liquidity). The vote's verdict (the LqzMatrixEntry.
// side) stays the separate battle-behavior dimension — only the type the
// demandCands/supplyCands filters read is corrected by containment.
import { classifyRungsByStructure } from './resting-side.js';
import { buildWeeklyNarrative } from './narrative.js';
import type { ChartModel, ChartModelOptions, LqzMatrixEntry, ZoneModel } from './types.js';
import { MS_PER_DAY } from './util.js';
import { stampZonePressureStates } from './zone-pressure.js';
// THE TEMPORAL ENGINE (the operator's temporal law — the locked run-anchor
// gate). The DEFENSIVE re-gate at the model boundary: when the run anchor is
// locked, every timeframe input is gated again BEFORE the model consumes it
// (belt+suspenders — a caller that forgot the runner-level gate cannot
// smuggle future bars into the model). Idempotent — gateBars on already-
// gated bars is a deterministic no-op. Inert when unlocked — the legacy path
// is byte-identical.
import { isRunAnchorLocked, gateBars } from './temporal.js';

export * from './types.js';
export { buildZoneMap, MDVE_TIMEFRAMES } from './ob-engine.js';
export { classifyBoMMoM, displacementAfter, legEstablished, consolidationAnatomy, SWEEP_LOOKBACK_BARS } from './bom-mom.js';
export { extractReactionEvents, runFreshnessMachine, zfpFromState } from './freshness.js';
export { buildLqzMatrix, classifyTouch, matrixLadderRungs } from './lqz-matrix.js';
export type { LqzMatrixResult, LqzMatrixInput, TouchContext, Timeframe } from './lqz-matrix.js';
// ── v4.5: the LMV engine (PLUTUS_V4.5_SPEC §2) — the canonical LQZ source ──
export { buildLmvTable } from './lmv.js';
export type { OhlcRow, LqzZoneMatrix, LmvTable, LmvResult, LmvInput } from './lmv.js';
// ── v4.5: the LMV-refined E/SL (§3 Fix 1 + §4 Fix 2) ──
export { computeSL_LMV, entryPrice_LMV, GOLDEN_SL_MAX_PIPS } from './sl-lmv.js';
export type { SlLmvMethod, SlLmvResult, SlLmvOptions } from './sl-lmv.js';
export {
  buildWeeklyNarrative,
  findSweepOrigin,
  findRangeBoundaries,
  countReactions,
  findTheBreak,
  postBreakReaction,
} from './narrative.js';
export { sessionOf, isoWeekKey, computeAtr, barAnatomy } from './util.js';
// ── v4.4.0b: the mirror engine (§9) + the §8.1 structural-anchor gate ──
export {
  findMirrorAnchor,
  buildMirror,
  cascade,
  checkMirrorFloor,
  isValidEntryAnchor,
  FORMATION_TIME_TOLERANCE_MS,
} from './mirror.js';
export type {
  MirrorOutcome,
  MirrorCascadeResult,
  MirrorStatus,
  FailedAnchor,
  AnchorGateResult,
} from './mirror.js';
// ── v4.5: the mirror re-anchor + common-sense guards (§5 Fix 3, §6 Fix 4, §7 Fix 5) ──
export {
  cascadeV45,
  checkMirrorFloorV45,
  reAnchorMirror,
  selectPairNativeZone,
  structurallyValid,
  narrativeAligned,
  isWeakTpWall,
} from './mirror.js';
export type {
  MirrorOutcomeV45,
  MirrorCascadeResultV45,
  MirrorReanchorContext,
  ZoneClass,
  NarrativeSetupRef,
  NarrativeGateContext,
  NarrativeGateResult,
  MirrorTpOptions,
  PairNativeZoneOptions,
} from './mirror.js';
// ── v4.4.0c: the source setup generator (§8) — the mirror cascade's DXY source lane ──
//    v4.5: generateSourceSetupsV45 = the LMV-refined geometry lane (additive). ──
export { generateSourceSetups, generateSourceSetupsV45 } from './setup-gen.js';
export type { SourceSetupOptions, SourceSetupReject } from './setup-gen.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildChartModel — the MDVE total function.
 *
 * @param pair      Instrument key ('DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD')
 * @param weekStart Week start date, 'YYYY-MM-DD' (UTC midnight Monday)
 * @param bars1H    1H bars covering [weekStart − ≥6 weeks, week end] (canon
 *                  LQZ lookback = 6 weeks, lqz-lobe.ts:118-119) — must also
 *                  include the prior week for the narrative's sweep context
 * @param bars4H    4H bars (same span)
 * @param bars30m   30m bars (same span) — when present (non-empty), the
 *                  telescoped 30m tier runs on top of the 1H matrix/LMV
 *                  (Phase 2 T5b)
 * @param spot      Current/anchor price
 * @param options   Optional pillar data + LQZ lookback override
 * @param bars15m   Optional 15m bars — when present, the 15m tier runs
 *                  (Phase 2 T5b; default undefined — backward compatible)
 * @returns The complete ChartModel (§5) — total, deterministic.
 *
 * Domain guards (MPSE Structure 13): malformed weekStart is REJECTED at
 * the boundary — garbage never enters the model.
 */
export function buildChartModel(
  pair: string,
  weekStart: string,
  bars1H: OHLCBar[],
  bars4H: OHLCBar[],
  bars30m: OHLCBar[],
  spot: number,
  options?: ChartModelOptions,
  bars15m?: OHLCBar[],
): ChartModel {
  // ── Boundary guards (Structure 13) ──
  const weekStartMs = parseWeekStart(weekStart);
  if (!(spot > 0)) {
    throw new Error(`MDVE domain guard: spot must be > 0, got ${spot}`);
  }
  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;

  // ── THE TEMPORAL DEFENSIVE GATE (the operator's temporal law — future data
  //    physically cannot enter the model): when the run anchor is locked,
  //    every timeframe input is re-gated in place BEFORE the first use of the
  //    bar arrays (the anchor loop below). Idempotent — gateBars on already-
  //    gated bars is a no-op; the filter is deterministic. Inert when unlocked
  //    (the legacy no-lock paths — byte-identical). ──
  const locked = isRunAnchorLocked();
  if (locked) {
    bars1H = gateBars(bars1H);
    bars4H = gateBars(bars4H);
    bars30m = gateBars(bars30m);
    if (bars15m) bars15m = gateBars(bars15m);
  }

  // ── Anchor (deterministic — data-derived, NEVER wall-clock): the last
  //    1H bar inside the target week; falls back to the last available bar
  //    (sparse data), then to weekStart itself (empty data — totality). ──
  const weekEndMs = weekStartMs + 7 * MS_PER_DAY;
  let anchorMs = weekStartMs;
  let lastAny = -Infinity;
  for (const b of bars1H) {
    if (b.timestamp > lastAny) lastAny = b.timestamp;
    if (b.timestamp >= weekStartMs && b.timestamp < weekEndMs && b.timestamp > anchorMs) {
      anchorMs = b.timestamp;
    }
  }
  if (anchorMs === weekStartMs && lastAny > anchorMs) anchorMs = lastAny;

  // ── §6.1: the zone map (multi-TF OB + §6.3 classification + §6.4 freshness) ──
  const zones = buildZoneMap({
    pair,
    spot,
    pipValue,
    barsByTf: { '4H': bars4H, '1H': bars1H, '30m': bars30m },
    pillarResult: options?.pillarResult,
  });

  // ── §6.2: the LQZ matrix vision ──
  const matrix = buildLqzMatrix({
    pair,
    spot,
    pipValue,
    bars1H,
    lookbackBars: options?.lqzLookbackBars,
    timeframe: '1H',
  });

  // ── v4.5 §2: the LMV engine — the table of LQZ zone-matrices (the
  //    canonical LQZ source; every E/SL decision reads from it). Built
  //    from the SAME bars + lookback as the §6.2 matrix (deterministic). ──
  const lmv1H = buildLmvTable({
    pair,
    spot,
    pipValue,
    bars1H,
    lookbackBars: options?.lqzLookbackBars,
    timeframe: '1H',
  });

  // ── Phase 2 T5b: the TELESCOPED lower-TF tiers. The 1H matrix resolves
  //    4-10-pip rungs; the 30m/15m runs resolve the FINE rungs (the golden
  //    101.235/101.240 pair separates only below 1H — the 1H 2-pip cluster
  //    tolerance merges them into one blob). Each present tier runs the
  //    SAME total functions on ITS bars; the results merge into
  //    lqzMatrix / lmv / ladder below with a nested-refinement pass. ──
  const tierLookback = (bars: OHLCBar[]): number =>
    Math.min(options?.lqzLookbackBars ?? LQZ_LOOKBACK_BARS, bars.length);

  const tierNotes: string[] = [];
  const tier30m = bars30m && bars30m.length > 0
    ? buildMatrixTier(pair, spot, pipValue, bars30m, '30m', tierLookback(bars30m), lmv1H.table, '30m Refined 1H', tierNotes)
    : null;
  const tier15m = bars15m && bars15m.length > 0
    ? buildMatrixTier(pair, spot, pipValue, bars15m, '15m', tierLookback(bars15m), tier30m?.table ?? [], '15m Refined 30m', tierNotes)
    : null;

  // ── The tiered merges — every row/rung KEPT, never merged across tiers
  //    (the resolution principle: the lower-TF rungs ARE the fine-grained
  //    levels the golden map needs). Deterministic total comparators. ──
  const lqzMatrix = [
    ...matrix.entries,
    ...(tier30m?.entries ?? []),
    ...(tier15m?.entries ?? []),
  ].sort((a, b) => (a.priceCenter - b.priceCenter) || (a.top - b.top) || (a.bottom - b.bottom));

  const mergedTable = [
    ...lmv1H.table,
    ...(tier30m?.table ?? []),
    ...(tier15m?.table ?? []),
  ].sort(compareZoneMatrices);
  // completenessNotes key is OMITTED when no tier was skipped — the
  // 1H-only path's lmv keeps the exact {table, coverage} shape.
  const lmv: LmvResult = tierNotes.length > 0
    ? { table: mergedTable, coverage: lmv1H.coverage, completenessNotes: tierNotes }
    : { table: mergedTable, coverage: lmv1H.coverage };

  // ── §7: the deterministic ladder (absorbed scaffold — model-fed).
  //    Canon inputs re-derived (deterministic — same bars, same output);
  //    pillar rungs only when pillar data exists (§12 Law 3: absence is
  //    honest emptiness, never a proxy). ──
  const pillarResult: PillarResult = options?.pillarResult ?? EMPTY_PILLAR_RESULT;
  const scaffoldLadder = generateCandidateLadder({
    pair,
    spot,
    pipValue,
    weekStartMs,
    anchorMs,
    barsByTf: { '4H': bars4H, '1H': bars1H, '30m': bars30m },
    orderBlocks4H: construct4HZones({ bars: bars4H, instrument: pair, spot, pipValue, timeframe: '4H' }),
    lqzZones: detectLiquidityZones(pair, bars1H, options?.lqzLookbackBars),
    pillarResult,
  });

  // ── §7 ladder enrichment (v4.4.0c — the §6.2 → §7 bridge): merge the
  //    matrix's REFINED discrete rungs into the ladder. The scaffold's
  //    canon lqz-lobe source emits COARSE merged zones (one blob spanning
  //    the whole range on a ranging week); the matrix's swing-clustered
  //    rungs are the operator's drawn levels. The next-rung SL walk and
  //    the Law-14 TP walk (mirror.ts, setup-gen.ts) starve without them.
  //    Re-sorted with a TOTAL comparator (price, id) — deterministic. ──
  const ladder = [
    ...scaffoldLadder,
    ...matrixLadderRungs(pair, matrix.entries, '1H'),
    ...(tier30m?.rungs ?? []),
    ...(tier15m?.rungs ?? []),
  ].sort((a, b) => (a.price - b.price) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // ── §6.5: the weekly narrative ──
  const narrative = buildWeeklyNarrative({
    bars1H,
    weekStartMs,
    anchorMs,
    zones,
    lqzMatrix: matrix.entries,
  });

  // ── L3 (2026-07-31): the matrix LQZ levels join model.zones as
  //    first-class candidates (the §6.1 zone map is built above; the merged
  //    LMV table — 1H + telescoped tiers — is built above too). The mirror
  //    engine's anchor search (selectPairNativeZone) reads the OB/MoM lane
  //    of model.zones — the bridged LQZ rungs now answer it (Bible 4.0:2647:
  //    the LQZ rungs were never in the zone map; they lived only in
  //    lqzMatrix/lmv/ladder). The NARRATIVE keeps the pre-bridge zone map
  //    (byte-identical output — the bridge enriches model.zones only).
  //    Dedup guard: the `LMV|pair|center` id namespace is unique per center
  //    (mirror.ts:1275's centerKey `|${center.toFixed(5)}` fallback matches
  //    it); a zone whose id already exists in the map is skipped — the T5b
  //    tier rungs use different namespaces, so no collision. ──
  const bridgedZones = matrixZonesToZoneModels(lmv, pair);
  const existingZoneIds = new Set(zones.map((z) => z.id));
  const zonesFinal = bridgedZones.length > 0
    ? [...zones, ...bridgedZones.filter((bz) => !existingZoneIds.has(bz.id))]
    : zones;

  // ── THE RESTING-SIDE PASS (the operator's semantics law): AFTER the zone
  //    pool is fully assembled (the ob-engine zones + the LMV bridge + the
  //    telescoping + the sort) and BEFORE the pool is consumed, every LMV-
  //    bridged rung's TYPE is reassigned by the STRUCTURE it sits in (a rung
  //    fully inside a DEMAND zone = buy-side liquidity → type DEMAND; inside
  //    a SUPPLY zone = sell-side liquidity → type SUPPLY; the narrowest
  //    container wins). The rungs' side (the vote's verdict — the battle
  //    behavior) stays untouched — the type is what the demandCands/
  //    supplyCands filters read (shape-brain.ts:727-743). The pass runs
  //    BEFORE the E2 designation + the mirror anchor search consume the
  //    types. Inert when the bridge emitted no rungs (no LMV-typed zones —
  //    a defined no-op). ──
  classifyRungsByStructure(zonesFinal);

  const model: ChartModel = {
    pair,
    weekStart,
    anchor: { weekStartMs, anchorMs },
    spot,
    zones: zonesFinal,
    lqzMatrix,
    lmv,
    ladder,
    narrative,
    // mirrorSource: undefined — the mirror engine is v4.4.0b (§14 rollout);
    // DXY's model is the mirror SOURCE (§5).
  };

  // ── Wave ZR-1: the zone-pressure engine — every zone carries its FULL
  //    pressure state (the lifecycle with FORTRESS, the mitigation count, the
  //    absorption, the liquidity links) computed from the E1 data. ──
  stampZonePressureStates(model, bars1H);
  return model;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNALS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Honest-empty pillar result (§12 Law 3): absence of options/pillar data →
 * the pillar source is EMPTY, not proxied. Zero composite → zero pillar
 * rungs, zero confluence.
 */
const EMPTY_PILLAR_RESULT: PillarResult = {
  levels: [],
  scores: {},
  compositeScore: 0,
  confluenceDimensions: {
    technical: 0,
    options: 0,
    analyst: 0,
    structural: 0,
    psychological: 0,
    regime: 0,
    structuralExtreme: 0,
  },
  dominantPillars: [],
  pillarAudits: {},
};

/**
 * L3 (2026-07-31): matrix→model.zones bridge — every LqzZoneMatrix becomes
 * a first-class ZoneModel so the mirror engine's anchor search
 * (selectPairNativeZone) sees the matrix LQZ levels (closes Bible 4.0:2647:
 * the LQZ rungs were never in the zone map — they lived only in
 * lqzMatrix/lmv/ladder). LQZ rungs are MoM-class per canon (the operator:
 * LQZ = entry zone; passive pillars retired to SL/TP).
 *
 * Field-fidelity (the real ZoneModel interface, types.ts:131-148):
 *   - `center`/`defendedEdge`/`reactionExtreme` are DROPPED — ZoneModel has
 *     no such fields, and mirror.ts:1098 discriminates LQZ anchors via
 *     `'reactionExtreme' in a`: a ZoneModel carrying reactionExtreme would be
 *     narrowed to LqzZoneMatrix and crash on `.candles`. The provenance is
 *     carried by the id namespace `LMV|pair|center` instead.
 *   - `formationMs` = the zone's FIRST reaction candle (the LQZ's birth —
 *     the same reduction the mirror's own LQZ lane uses, mirror.ts:1281).
 *   - `freshness: 'FRESH'` — the LMV lane runs no §6.4 recurrence; the
 *     mirror documents "LMV rows carry no freshness recurrence — always
 *     admissible" (mirror.ts:1283). FRESH is the group-0 alive state that
 *     preserves that admissibility in the OB/MoM lane.
 *   - `reactionEvents: []` — the LMV lane is bar-granular (the candle
 *     matrix); synthesizing event-granular ReactionEvents from candles
 *     would fabricate canon structure (§12 Law 3 — honest emptiness).
 *   - `confluence: 0` — no 9-pillar data on the LMV lane (honest §12 Law 3).
 *   - `nestedWithin: undefined` — the ladder/nesting owns the parent links
 *     (Phase 4's OBCV link), never the bridge.
 */
function matrixZonesToZoneModels(lmv: LmvResult, pair: string): ZoneModel[] {
  return (lmv?.table ?? []).map((z) => ({
    id: `LMV|${pair}|${z.center.toFixed(5)}`,
    type: z.side === 'BUY_SIDE' ? 'DEMAND' : 'SUPPLY',
    top: z.top,
    bottom: z.bottom,
    timeframe: z.timeframe ?? '1H',
    classification: 'MoM' as const,   // LQZ rungs are MoM-class per canon
    formationMs: z.candles.length > 0 ? z.candles[0]!.timestamp : 0,
    freshness: 'FRESH',               // LMV lane: no recurrence — always admissible
    reactionEvents: [],               // bar-granular matrix ≠ event-granular battles
    zfp: z.zfp,
    confluence: 0,                    // no pillar data on the LMV lane
    refinedLabel: z.refinedLabel,
    nestedWithin: undefined,          // the ladder/nesting owns the parent links
    side: z.side,                     // the C-2 fix: the battle vote carried for the resting-side conflict rule
  }));
}

/**
 * Parse 'YYYY-MM-DD' → UTC midnight ms. Domain guard (Structure 13):
 * malformed input is rejected at the boundary with a descriptive error.
 * Manual parsing (not Date.parse) — Date.parse accepts implementation-
 * defined formats; determinism demands one grammar.
 */
function parseWeekStart(weekStart: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStart);
  if (!m) {
    throw new Error(
      `MDVE domain guard: weekStart must be 'YYYY-MM-DD', got '${weekStart}'`,
    );
  }
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Round-trip validation: rejects 2026-02-30-style overflows.
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== Number(m[1]) ||
    d.getUTCMonth() !== Number(m[2]) - 1 ||
    d.getUTCDate() !== Number(m[3])
  ) {
    throw new Error(`MDVE domain guard: invalid calendar date '${weekStart}'`);
  }
  return ms;
}

/**
 * Minimum bars for a lower-TF tier run = 96.
 * BECAUSE: the swing core needs a k=1 neighborhood + ≥3-point clusters +
 * the §8.4 recurrence gate (≥2 distinct (day, session) windows); below
 * ~2 days of 30m bars (48/day) the run is structurally starved — the
 * tier would emit only degenerate/empty results, so it is SKIPPED with a
 * completeness note (never thrown — totality §2.5 Law 2). The harvest's
 * old-week availability (30m ≈ 500, 15m ≈ 300 bars) clears it comfortably.
 */
const MIN_TIER_BARS = 96;

/** One telescoped tier's artifacts (Phase 2 T5b). */
interface MatrixTier {
  tf: Timeframe;
  entries: LqzMatrixEntry[];
  table: LqzZoneMatrix[];
  rungs: ScaffoldRung[];
}

/**
 * buildMatrixTier — run the LQZ matrix + LMV table + ladder rungs on ONE
 * lower-TF bar set (the telescoped tier), then apply the nested-refinement
 * pass against the PARENT tier's LMV table. Returns null when the tier has
 * too few bars (MIN_TIER_BARS) — the tier is skipped with a note, never
 * thrown. `bars1H` is the generic bars slot (vestigial name) — it receives
 * the tier's OWN bars (the TF is data, not behavior).
 */
function buildMatrixTier(
  pair: string,
  spot: number,
  pipValue: number,
  bars: OHLCBar[],
  tf: Timeframe,
  lookback: number,
  parentTable: LqzZoneMatrix[],
  refinedLabel: string,
  notes: string[],
): MatrixTier | null {
  if (bars.length < MIN_TIER_BARS) {
    notes.push(`${tf} tier skipped: ${bars.length} < ${MIN_TIER_BARS} bars — no meaningful matrix run`);
    return null;
  }
  const matrix = buildLqzMatrix({ pair, spot, pipValue, bars1H: bars, lookbackBars: lookback, timeframe: tf });
  const tierLmv = buildLmvTable({ pair, spot, pipValue, bars1H: bars, lookbackBars: lookback, timeframe: tf });
  return {
    tf,
    entries: matrix.entries,
    table: refineNestedTables(tierLmv.table, parentTable, refinedLabel),
    rungs: matrixLadderRungs(pair, matrix.entries, tf),
  };
}

/**
 * refineNestedTables — the nested-refinement pass (Phase 2 T5b). A child
 * tier's zone-matrix whose [bottom, top] is CONTAINED in a same-side
 * parent-tier zone-matrix is stamped refinedLabel ('30m Refined 1H' /
 * '15m Refined 30m'). The TIGHTEST containing parent wins (the most
 * specific provenance); an equal-span tie keeps the price-ascending first
 * parent (parent tables are price-sorted — deterministic). The child row
 * is ALWAYS kept — the label records the parent it refines; lower-TF
 * rungs are the fine-grained levels the golden map needs and are NEVER
 * merged into the parent (the resolution principle).
 */
function refineNestedTables(
  child: LqzZoneMatrix[],
  parent: LqzZoneMatrix[],
  refinedLabel: string,
): LqzZoneMatrix[] {
  return child.map((row) => {
    let best: LqzZoneMatrix | null = null;
    for (const p of parent) {
      if (p.side !== row.side) continue;
      if (row.bottom < p.bottom || row.top > p.top) continue;
      if (best === null || p.top - p.bottom < best.top - best.bottom) best = p;
    }
    return best === null ? row : { ...row, refinedLabel };
  });
}

/** TOTAL comparator for the merged LMV table (cited: lmv.ts:606 —
 *  price-ordered, deterministic). */
function compareZoneMatrices(a: LqzZoneMatrix, b: LqzZoneMatrix): number {
  return (a.center - b.center) || (a.bottom - b.bottom) || (a.top - b.top);
}

// ── v4.5.2: the E2 shape cascade (DXY → EU → GU) ──
export { cascadeShapeChain } from './shape-cascade.js';
export type { CascadedShapeChain, ShapeDayZone } from './shape-cascade.js';
// ── Wave K1 (2026-08-01): the MANUAL POST-PIPELINE REVIEW STAGE — the
//    operator's "new step post current-pipeline complete" (FIX PLAN §5):
//    the rejected-setup log → the sequential 3D reviews → the batch
//    quality filter → the bounded 2-revision loop → the final updated
//    report. The stage is the MACHINERY (the sequencing/cards/filter/
//    revisions/report); the agent drives the per-setup reasoning through
//    its hooks (auditInputOf/refineOf/retranslateOf/reviseOf). ──
export { runReviewStage } from './review-stage.js';
export type {
  RejectedSetupRecord,
  ReviewStageHooks,
  ReviewStageOptions,
  GoldenRef,
  AuditCard,
  RefinedSetup,
  RejectedSetup,
  ReAdmittedSetup,
  HallucinationStats,
  ReviewStageStats,
  ReviewStageResult,
} from './review-stage.js';
// ── Wave G1 (2026-08-01): the CASCADE TRANSLATION ENGINE — the
//    structural-equivalence designation (replaces the strength-ranked
//    round-robin; G2's report-v452/mirror rewire consumes it). ──
export {
  translateCascadeDayMap,
  computeChainDivergence,
  CASCADE_DIVERGENCE_VALIDATED,
} from './cascade-translation.js';
export type {
  TranslatedDayEntry,
  TranslatedDayMap,
  ChartModelLike,
  TranslationMode,
  ZoneElement,
} from './cascade-translation.js';
