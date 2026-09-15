/**
 * refinement-machine.ts — Phase 7 R2 (operator 2026-07-31).
 * The E/SL/TP REFINEMENT MACHINE: an RRR-failed setup is NOT dead — the E/SL/TP
 * is wrong on a correct analysis. Up to 3 surgical repair attempts on the SAME
 * zone anchors maximize RRR toward ≥ 3.0. "A rejected setup is not a dead setup.
 * The entry is the hard-won insight; SL/TP are engineering." (ANCHOR_DOCTRINE.md:157)
 *
 * OPERATOR (verbatim): "RRR failed does not mean instant hard reject often the
 * E/SL/TP is wrong on a correct analysis so we need the retry loop with an
 * intelligent E/SL/TP refinment machine... Most of these 1.5-2 R trades can
 * easily be 3-4 R trades with properl E/SL/TP anchors on the exact same zones
 * that are already thethered to. this is purely a lack of precision and dumb
 * trade setups."
 *
 * THE 3-ATTEMPT CYCLE (then hard-reject with the D36 audit trail):
 *   Attempt 1 — the current geometry, logged as-is (the audit baseline).
 *   Attempt 2 — surgical repair on the SAME zone anchors:
 *     (a) ENTRY micro-refine on the defendedEdge (≤ 3 pips — NEVER outside the
 *         zone band; the F1-A/B band adjustment: a SHORT in the lower half of
 *         its supply band sells too low → the band top − 1 pip; the LONG mirror
 *         buys too high in the upper half → the band floor + 1 pip).
 *     (b) SL — the Law-7 BIDIRECTIONAL rung walk (computeSL_LMV's substrate,
 *         sl-lmv.ts:198-217): the next rung IN (tighter) AND OUT (wider); every
 *         candidate must clear PROBE_GUARD + the week's deepest adverse probe at
 *         the anchor (a wick INTO the anchor band is adverse anatomy); accepted
 *         in [max(0.5×ATR, buffer), GOLDEN_SL_MAX_PIPS 9.5] with the D17 36-pip
 *         hard ceiling (a probe-forced lift may exceed 9.5 — never 36).
 *     (c) TP — the Law-14 walk (computeLmvTP): the E2-shapeDay-projected
 *         opposing zone's defendedEdge FIRST, then the significance walk with
 *         the L4 sweep inversion; fresh-wall (zfp ≤ 20) cap.
 *     (d) pick the (entry, sl, tp) combination maximizing RRR ≥ 3.0.
 *   Attempt 3 (last) — the next-best opposing zone/rung for TP (the pure
 *     significance walk when the E2-projected zone failed or was absent) + the
 *     next SL rungs; the entry STAYS on the same zone.
 *   Failure — HARD REJECT with the full 3-attempt audit trail (D36).
 *
 * ZONE ANCHORS NEVER CHANGE — only the E/SL/TP placement on them.
 *
 * WAVE ZR-3B (2026-08-04) — THE PER-ANCHOR 3-ATTEMPT DYNAMIC STATE MACHINE:
 * the trade-level 3-attempt cycle is replaced by the operator's per-anchor
 * machine (PLUTUS_E1_E2_E3_MACRO_CONTEXT Part 10 + ORCHESTRATOR_PRINCIPLES
 * Part 7/13): each trade's anchors (E, SL, TP) are tracked + locked
 * INDIVIDUALLY — 3 attempts each; the loop continues on the unlocked anchors
 * until RRR ≥ the 4R TARGET (the PASS gate stays the category floor — "the
 * TARGET is always 4R+ i dont want the machine optimizing everything for low
 * R just to pass the filter and leaving money on the table") or ALL 3 lock.
 * Every architecture rejection carries the RejectionContext { anchor, why
 * (the numbers + the violated constraint), how (the specific correction) }.
 * The machine's intelligence = the E1 pressure mechanics (zone-pressure.ts
 * computeOperativeDefense — the ladder-steps SL) + the E2 shape chain (the
 * shapeDay's opposing zone + the Law-14 walks — the TP maps to the
 * structurally-correct zone) + the E2 storyline (threaded via the input ctx
 * when available). It rejects the GENUINE violations the operator listed:
 * the same-side TP/SL, the entry off the designated zone band, the
 * direction-insane geometry, the Law-10 floor + the D17 36-pip ceiling.
 * WAVE ZR-6C (2026-08-04): the three mis-calibrated checks are DELETED —
 * the week-probe look-ahead (the SL is set by the DECISION-POINT E1/E2
 * mechanics, never the week's future), the E2 projected-price reach cap
 * (the E2's prices are gone — the TP extends to the structurally-correct
 * zone; the MoM→BoM extension is doctrine: "it adds an extra 2 R"), and
 * the zone-distance count ("the zones are ladder steps — 3 pips outside
 * the far edge of the current step, or 1-2 pips inside the close edge of
 * the NEXT STEP away"). The per-anchor 3-attempt state machine + the WHY+
 * HOW rejection contexts + the RRR_TARGET 4.0 are UNCHANGED.
 * THE PRIORITY ORDER (Part 10): TP first (the biggest RRR lever — "extend
 * TP from MoM to BoM. Nice it adds an extra 2 R"), then SL (tighten where
 * actually possible), then E (the micro-refine ≤ 3p in-zone, NEVER outside
 * — "the entry is the hard-won insight").
 *
 * DOCUMENTED DEVIATIONS:
 *   1. probeAtAnchor adapts the spec's simplified `(anchor, model, pair) => number`
 *      to the REAL weekProbeAtAnchor bridge (mirror.ts:1599): the probe needs
 *      direction/week/band-edge/lmv-table context only the caller's closure can
 *      supply, and the return carries {price, source} so the PROBE_GUARD
 *      annotations cite the anatomy that forced the lift.
 *   2. computeLmvTP is imported from ./mirror.js (the spec's own reference — "the
 *      next significance-ranked candidate from computeLmvTP"). The mirror.ts ⇄
 *      refinement-machine.ts cycle is SAFE: both exports are function
 *      declarations invoked only at runtime, never during module load (no TDZ).
 *   3. categoryFloor (3.0) is passed in — the machine never imports
 *      trading-constants (another agent's file this wave).
 */

import type { ChartModel, ZoneModel } from './types.js';
import type { LqzZoneMatrix } from './lmv.js';
import type { ShapeDayZone } from './shape-cascade.js';
import type { TranslatedDayMap } from './cascade-translation.js';
import { GOLDEN_SL_MAX_PIPS } from './sl-lmv.js';
import { computeSL_LMV } from './sl-lmv.js';
import { computeLmvTP } from './mirror.js';
import { computeOperativeDefense } from './zone-pressure.js';
import { priceDecimals } from './util.js';
import type { DayStoryline, WeekStoryline } from '../brains/storyline-engine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Law-7 SL buffer (pips): EUR 2 / GBP 3 / AUD 3 / DXY 5.
 * REPLICATED, not imported (the canon-replica precedent — sl-lmv.ts:51-63; the
 * mirror.ts export lives in a file this module already cycles with, so
 * replication keeps the cycle surface to the two function declarations only).
 */
const LAW7_SL_BUFFER_PIPS: Record<string, number> = {
  'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5,
};

/** Law-10 ATR fraction = 0.5 × ATR(14, 1H) — the SL noise floor (mirror.ts:87). */
const LAW10_ATR_FRACTION = 0.5;

/** D17 SL ceiling = 36 pips, HARD (mirror.ts:80). */
const D17_SL_CEILING_PIPS = 36;

/**
 * The entry micro-refine bound = 3 pips (the operator: the repair is "purely a
 * lack of precision" — surgical, ≤ 2-3 pips within the zone band, NEVER outside).
 */
const MAX_ENTRY_MICRO_MOVE_PIPS = 3;

/**
 * The F1-A/B band-adjustment quantum = 1 pip (a SHORT in the lower half of its
 * supply band → the band top − 1 pip; the LONG mirror buys too high in the
 * upper half → the band floor + 1 pip). BECAUSE: the defended edge of a
 * SELL_SIDE zone is the modal body-close — typically the LOWER part of the band;
 * shorting at the bottom of a supply zone is the worst fill + the lowest RRR.
 */
const MAX_ENTRY_BAND_ADJUST_PIPS = 1;

/** The per-anchor attempt cap (the operator, Part 10.1: "3 attempts on each
 *  anchor (3 E, 3 SL, 3 TP refinement attempts each tracked and locked
 *  individually per trade)"). */
const MAX_ANCHOR_ATTEMPTS = 3;

/** The operator's RRR TARGET = 4R ("anything that is 2.5 RR or above is valid
 *  as long as it is high probability. However the TARGET is always 4R+ i dont
 *  want the machine optimizing everything for low R just to pass the filter
 *  and leaving money on the table"). The loop refines toward the target while
 *  attempts remain; the PASS gate stays the category floor. */
const RRR_TARGET = 4.0;

/** The ladder-steps SL quanta (Part 19.3 #1): 3 pips outside the operative
 *  defense's far edge, or 1-2 pips inside the next step's close edge — the
 *  relevant zone BY THE PRESSURE STATE. */
const LADDER_STEP_OUTSIDE_PIPS = 3;
const LADDER_STEP_INSIDE_PIPS = 1.5;

/** The strength-driven TP edge's spread quantum (Part 19.3 #2: the strong →
 *  the close edge + the spread; the weak → the far edge). */
const TP_CLOSE_EDGE_SPREAD_PIPS = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// THE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** One repair attempt's audit record (the D36 trail). */
export interface RefinementAttempt {
  attempt: number;
  entry: number; sl: number; tp: number; rrr: number;
  reason: string;   // 'RRR 1.2 < 3.0 — E 1.14494, SL 7.6p, TP 9.4p (nearest-first)'
  action: string;   // 'TP re-anchored 9.4p→44.1p (E2-projected demand)'
  /** ZR-3B: the anchor this attempt refined (absent on the attempt-1 baseline). */
  anchor?: 'E' | 'SL' | 'TP';
  /** ZR-3B: the architecture-violation contexts recorded on this attempt. */
  contexts?: RejectionContext[];
}

/** The repaired geometry + the provenance the MirrorOutcomeV45 consumes. */
export interface RefinementSetup {
  entry: number; sl: number; tp: number; rrr: number;
  /** The repaired SL provenance (the Law-7 walk + guard label). */
  slMethod: string;
  /** The repaired TP's effective rung id (computeLmvTP's rungId). */
  tpRungId: string | null;
}

export interface RefinementResult {
  /** null = hard-reject (the zone anchors yielded no RRR ≥ floor geometry). */
  setup: RefinementSetup | null;
  attempts: RefinementAttempt[];
  /** '🔧 REPAIRED(n): <action>, RRR x.x→y.y' | 'HARD-REJECT — all anchors locked — [...]'. */
  annotation: string;
  /** ZR-3B: the per-anchor state machine's terminal state. */
  state?: TradeRefinementState;
  /** ZR-3B: every architecture-violation rejection context across the loop. */
  rejections?: RejectionContext[];
}

// ── ZR-3B — THE PER-ANCHOR STATE MACHINE TYPES (the operator's design,
//    Part 13.3 #1 — VERBATIM shape) ──

/** One anchor's track: 3 attempts, locked on exhaustion (or proven optimal),
 *  the best value found, and the full per-attempt history. */
export interface AnchorTrack {
  attempts: number;          // 0..3
  locked: boolean;           // true when attempts exhausted OR the anchor is proven optimal
  best: number;              // the best value found for this anchor
  history: Array<{ value: number; rrr: number; reason: string }>;
}

/** The per-trade refinement state — each anchor tracked + locked individually. */
export interface TradeRefinementState {
  entry: AnchorTrack;
  sl: AnchorTrack;
  tp: AnchorTrack;
  status: 'REFINING' | 'PASSED' | 'REJECTED';
}

/** Every architecture rejection: WHY (the mechanical reason — the numbers +
 *  the violated constraint) + HOW (the specific correction). */
export interface RejectionContext {
  anchor: 'E' | 'SL' | 'TP';
  why: string;   // the mechanical reason — the numbers + the violated constraint
  how: string;   // the specific correction — the exact fix direction
}

/** The week's deepest adverse probe at the anchor (WeekProbe — mirror.ts:1576). */
export interface WeekProbeRef {
  price: number;
  source: string;
}

export interface RefineInput {
  entry: number; sl: number; tp: number;
  direction: 'LONG' | 'SHORT';
  pair: string;
  pipValue: number;
  /** The RRR floor — 3.0 (rrrForCategory's tp1, the R1 table). */
  categoryFloor: number;
  /** The pair's model (lmv table + zones) — the rung/TP substrate. */
  targetModel: ChartModel;
  /** The E2 designation (Phase 5) — the shapeDay-projected opposing-zone TP. */
  shapeDay?: ShapeDayZone;
  /** The SAME zone anchors — NEVER re-anchored, only E/SL/TP placement. */
  anchor: ZoneModel | LqzZoneMatrix;
  entryZone: { defendedEdge?: number; floor: number; ceiling: number };
  /** The Law-7 rung walk (computeSL_LMV — sl-lmv.ts:177). */
  slLmv: typeof computeSL_LMV;
  /** The weekProbeAtAnchor bridge: the deepest adverse probe at the anchor. */
  probeAtAnchor: (anchor: ZoneModel | LqzZoneMatrix, entry: number) => WeekProbeRef | null;
  /** ZR-3B: the entry anchor's zone id (the E1 operative-defense lookup —
   *  computeOperativeDefense's ladder-steps SL). Absent → derived from the
   *  anchor (a ZoneModel's own id; an LqzZoneMatrix's LMV bridge id). */
  anchorZoneId?: string | null;
  /** ZR-3B: the E2 storyline (the day or the week — the machine consumes the
   *  E2 shape chain's narrative when the caller threads it; absent → honest
   *  degradation to the shapeDay's prices alone). */
  storyline?: DayStoryline | WeekStoryline | null;
}

/** ZR-3B: one anchor's refinement candidate (the E1/E2-informed provenance
 *  rides the label; the rungId rides when a Law-14 walk produced it). */
interface AnchorCandidate {
  value: number;
  label: string;
  rungId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attempt-2a — the ENTRY micro-refine on the defendedEdge (§4.2 entryPrice_LMV
 * semantics: the level price actually turned at, sl-lmv.ts:297). The candidate
 * is the zone's defendedEdge, then the F1-A/B band adjustment (a SHORT in the
 * lower half of its supply band sells too low → the band top − 1 pip; the LONG
 * mirror). The move is bounded ≤ 3 pips and NEVER leaves the zone band — a
 * target beyond the micro bound is rejected (the micro-refine is a precision
 * fix, not a re-anchor; the zone anchors NEVER change).
 */
function refineEntryMicro(input: RefineInput, entry: number): { entry: number; action: string } {
  const { direction, pipValue, entryZone } = input;
  const floor = entryZone.floor;
  const ceiling = entryZone.ceiling;
  const maxMove = MAX_ENTRY_MICRO_MOVE_PIPS * pipValue;
  const adjust = MAX_ENTRY_BAND_ADJUST_PIPS * pipValue;
  const fmt = (n: number): string => n.toFixed(priceDecimals(input.pair));

  let candidate = entry;
  if (entryZone.defendedEdge !== undefined) candidate = entryZone.defendedEdge;
  const mid = (floor + ceiling) / 2;
  if (direction === 'SHORT' && candidate < mid) candidate = ceiling - adjust;
  if (direction === 'LONG' && candidate > mid) candidate = floor + adjust;

  const moved = Math.abs(candidate - entry);
  if (moved > maxMove + 1e-9 || candidate < floor - 1e-9 || candidate > ceiling + 1e-9) {
    return { entry, action: 'E unchanged (micro-refine target outside the 3-pip in-zone bound)' };
  }
  if (moved < 1e-9) {
    return { entry, action: 'E unchanged (already on the defended edge)' };
  }
  const which = direction === 'LONG' ? 'defended-edge buy-fill' : 'defended-edge sell-fill';
  return {
    entry: candidate,
    action: `E micro-refined ${fmt(entry)} → ${fmt(candidate)} (${which}, in-zone)`,
  };
}

/**
 * The Law-10 SL noise floor in pips (the narrative-ATR proxy — mirror.ts:
 * 1084-1086: the LMV completeness grid fixes bucketWidth = max(0.25×ATR,
 * 1 pip) → 4 × bucketWidth ≈ ATR(14, 1H)). Shared by the bidirectional walk
 * and the ZR-3B architecture check.
 */
function slFloorPips(input: RefineInput): number {
  const bufferPips = LAW7_SL_BUFFER_PIPS[input.pair] ?? 3;
  const atrPips = (4 * input.targetModel.lmv.coverage.bucketWidth) / input.pipValue;
  return atrPips > 0 ? Math.max(LAW10_ATR_FRACTION * atrPips, bufferPips) : bufferPips;
}

/**
 * Attempt-2b — the SL Law-7 BIDIRECTIONAL walk. The substrate is computeSL_LMV's
 * rung walk (sl-lmv.ts:198-217 — adverse-side reactionExtreme rungs, nearest-
 * first): the golden seed (slLmv) covers the canon accepted rung + the sweep/
 * zone-width fallbacks; the direct walk enumerates EVERY adverse rung — the
 * next rung IN (tighter) and OUT (wider). Every candidate:
 *   - clears PROBE_GUARD + the week's deepest adverse probe (a wick INTO the
 *     anchor band is adverse anatomy — mirror.ts:1721-1727): a stop inside the
 *     probe is lifted just beyond it (+ buffer);
 *   - sits in [max(0.5×ATR, buffer), GOLDEN_SL_MAX_PIPS 9.5] — a probe-forced
 *     lift may exceed 9.5 but NEVER the D17 36-pip hard ceiling.
 */
function bidirectionalSlWalk(
  input: RefineInput,
  e: number,
): { sl: number; distPips: number; label: string }[] {
  const { direction, pair, pipValue, targetModel, anchor, entryZone, slLmv, probeAtAnchor } = input;
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  const buffer = bufferPips * pipValue;
  const atrPips = (4 * targetModel.lmv.coverage.bucketWidth) / pipValue;
  const floorPips = slFloorPips(input);

  const probe = probeAtAnchor(anchor, e);
  const clearsAnatomy = (s: number): boolean =>
    !probe || (direction === 'SHORT' ? s >= probe.price + buffer - 1e-9 : s <= probe.price - buffer + 1e-9);
  const liftToProbe = (sl: number): { sl: number; lifted: boolean } =>
    clearsAnatomy(sl) ? { sl, lifted: false } : {
      sl: direction === 'SHORT' ? probe!.price + buffer : probe!.price - buffer,
      lifted: true,
    };

  const out: { sl: number; distPips: number; label: string }[] = [];
  const pushIfAccept = (sl: number, label: string, lifted: boolean): void => {
    const d = Math.abs(e - sl) / pipValue;
    if (d < floorPips - 1e-9) return;
    // The golden band [floor, 9.5]; a probe-forced lift may exceed 9.5 but
    // never the D17 36-pip hard ceiling.
    if (d > GOLDEN_SL_MAX_PIPS + 1e-9 && !(lifted && d <= D17_SL_CEILING_PIPS + 1e-9)) return;
    out.push({ sl, distPips: d, label });
  };

  // The golden seed — the canon walk (computeSL_LMV). The entry zone is
  // synthesized from the structural band (sweepCount 0 → the sweep-catch is
  // disabled; the rung walk + zone-width fallback remain — honest degradation).
  const lmvZone: LqzZoneMatrix = {
    bottom: entryZone.floor,
    top: entryZone.ceiling,
    center: (entryZone.floor + entryZone.ceiling) / 2,
    side: direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE',
    candles: [],
    reactionExtreme: direction === 'LONG' ? entryZone.floor : entryZone.ceiling,
    defendedEdge: entryZone.defendedEdge ?? (direction === 'LONG' ? entryZone.ceiling : entryZone.floor),
    sweepCount: 0,
    touchKinds: [],
    weekSpan: 0,
    zfp: 20,
    timeframe: '1H',
  };
  const golden = slLmv(e, lmvZone, direction, targetModel.lmv.table, pair, {
    atrPips,
    weekExtreme: direction === 'LONG'
      ? targetModel.lmv.coverage.minPrice
      : targetModel.lmv.coverage.maxPrice,
  });
  if (golden) {
    const liftedG = liftToProbe(golden.sl);
    pushIfAccept(liftedG.sl, `golden-${golden.method}${liftedG.lifted ? '+PROBE_GUARD' : ''}`, liftedG.lifted);
  }

  // The direct rung walk (sl-lmv.ts:198-217 substrate — byte-identical
  // candidate predicate + sort): EVERY adverse rung, tight (IN) → wide (OUT).
  const rungs = targetModel.lmv.table
    .filter((z) => direction === 'LONG' ? z.reactionExtreme < e : z.reactionExtreme > e)
    .sort((a, b) =>
      Math.abs(a.center - e) - Math.abs(b.center - e) ||
      a.center - b.center ||
      a.bottom - b.bottom);
  for (const rung of rungs) {
    const raw = direction === 'LONG' ? rung.reactionExtreme - buffer : rung.reactionExtreme + buffer;
    const lifted = liftToProbe(raw);
    const label = `law7-${direction === 'LONG' ? 'below' : 'above'}-rung` +
      (lifted.lifted ? `+PROBE_GUARD(${probe!.source})` : '');
    pushIfAccept(lifted.sl, label, lifted.lifted);
  }

  // Dedupe (first occurrence wins) + tight→wide (deterministic — the IN rung
  // is the RRR-maximizer; the OUT rungs are the attempt-3 alternates).
  const seen = new Set<string>();
  const uniq: { sl: number; distPips: number; label: string }[] = [];
  for (const c of out) {
    const key = c.sl.toFixed(10);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(c);
  }
  uniq.sort((a, b) => a.distPips - b.distPips);
  return uniq;
}

// ═══════════════════════════════════════════════════════════════════════════════
// refineSetup — THE PER-ANCHOR 3-ATTEMPT DYNAMIC STATE MACHINE (ZR-3B)
// ═══════════════════════════════════════════════════════════════════════════════

// ── THE STATE-MACHINE HELPERS (the E1/E2 intelligence) ──

/** The model's structural S/D zones (the LMV-bridged rungs are the TP walk's
 *  own caps + the SL rung substrate — never "zones between" the entry and an
 *  anchor; T5 canon). */
function structuralZones(input: RefineInput): ZoneModel[] {
  return input.targetModel.zones.filter((z) => !z.id.startsWith(LMV_ID_PREFIX));
}

/** CHECK 1 substrate — the structural zones sitting strictly BETWEEN the
 *  entry and the SL on the adverse side (the entry's own anchor band
 *  excluded), nearest-first. */
function zonesBetweenEntryAndSl(input: RefineInput, e: number, sl: number): ZoneModel[] {
  const eps = 1e-9;
  return structuralZones(input)
    .filter((z) => {
      if (z.bottom - eps <= e && z.top + eps >= e) return false;   // the entry's own zone
      return input.direction === 'SHORT'
        ? z.bottom > e + eps && z.top <= sl + eps
        : z.top < e - eps && z.bottom >= sl - eps;
    })
    .sort((a, b) => input.direction === 'SHORT' ? a.bottom - b.bottom : b.top - a.top);
}

/** The opposing structural zones on the TP side of the entry, nearest-first. */
function opposingZones(input: RefineInput, e: number): ZoneModel[] {
  const wantType = input.direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const eps = 1e-9;
  return structuralZones(input)
    .filter((z) => z.type === wantType &&
      (input.direction === 'LONG' ? z.top > e + eps : z.bottom < e - eps))
    .sort((a, b) => input.direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top);
}

/** The zone's internal LQZ rung (the Earth+Fire — Part 13.1 #1): the
 *  strongest LMV rung fully inside the band (the candle-count tie-break by
 *  proximity to the projected price, then center ascending — deterministic). */
function internalRungOf(input: RefineInput, zone: ZoneModel, nearPrice?: number): LqzZoneMatrix | null {
  const inside = input.targetModel.lmv.table
    .filter((r) => r.bottom >= zone.bottom - 1e-9 && r.top <= zone.top + 1e-9)
    .sort((a, b) =>
      (b.candles.length - a.candles.length) ||
      (nearPrice !== undefined ? Math.abs(a.center - nearPrice) - Math.abs(b.center - nearPrice) : 0) ||
      (a.center - b.center));
  return inside[0] ?? null;
}

// ── THE PER-ANCHOR CANDIDATE GENERATORS (Part 10.2/10.3 + Part 13.1/13.2) ──

/** TP candidates (the priority-1 lever): (1) the MoM→BoM extension — the
 *  next structural wall beyond the current TP best's internal LQZ ("extend
 *  TP from MoM to BoM. Nice it adds an extra 2 R"); (2) the Law-14 walks
 *  (the E2-shapeDay walk, then the pure significance walk). The E2's
 *  projected PRICE is gone (Wave ZR-6A — the E2 now emits zone anchors
 *  only): the TP maps to the STRUCTURALLY-CORRECT zone via the shape chain
 *  + the pressure mechanics, never a day-cap reach clamp. */
function tpCandidates(input: RefineInput, state: TradeRefinementState): AnchorCandidate[] {
  const { direction, pair, pipValue, targetModel, shapeDay } = input;
  const e = state.entry.best;
  const out: AnchorCandidate[] = [];
  const seen = new Set<string>();
  const push = (value: number, label: string, rungId: string | null = null): void => {
    const k = value.toFixed(10);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ value, label, rungId });
  };

  // (1) the MoM→BoM extension — the next structural wall beyond the current
  //     TP best ("extend TP from MoM to BoM. Nice it adds an extra 2 R").
  const currentTp = state.tp.best;
  const nextWall = opposingZones(input, e).find((z) =>
    direction === 'LONG' ? z.bottom > currentTp + 1e-9 : z.top < currentTp - 1e-9);
  if (nextWall) {
    const rung = internalRungOf(input, nextWall);
    if (rung) {
      push(rung.defendedEdge, `the MoM→BoM extension — the next structural wall ${nextWall.id}'s internal LQZ`);
    } else {
      const spread = TP_CLOSE_EDGE_SPREAD_PIPS * pipValue;
      push(direction === 'LONG' ? nextWall.bottom + spread : nextWall.top - spread,
        `the MoM→BoM extension — ${nextWall.id}'s close edge (no internal LQZ)`);
    }
  }
  // (3) the Law-14 walks (the walk's own rung substrate + min-TP-distance).
  const tpE2 = computeLmvTP(e, state.sl.best, direction, targetModel, pair, pipValue, undefined, shapeDay);
  if (tpE2) push(tpE2.tp, `the Law-14 E2 walk (${tpE2.rungId})`, tpE2.rungId);
  const tpSig = computeLmvTP(e, state.sl.best, direction, targetModel, pair, pipValue, undefined, undefined);
  if (tpSig) push(tpSig.tp, `the Law-14 significance walk (${tpSig.rungId})`, tpSig.rungId);
  return out;
}

/** SL candidates (Part 13.2): (1) the ladder-steps rule on the E1 OPERATIVE
 *  DEFENSE (computeOperativeDefense — the pressure state selects the defense:
 *  the SHIELD_FUEL rung or the zone itself); (2) the Law-7 bidirectional rung
 *  walk (the E1 defended-edge density + the reaction extremes, probe-guarded
 *  at GENERATION via the walk's liftToProbe — cleared on the week's deepest
 *  adverse anatomy, never rejected by it). */
function slCandidates(input: RefineInput, state: TradeRefinementState): AnchorCandidate[] {
  const { direction, pair, pipValue, targetModel, anchor } = input;
  const e = state.entry.best;
  const out: AnchorCandidate[] = [];
  const seen = new Set<string>();
  const push = (value: number, label: string): void => {
    const k = value.toFixed(10);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ value, label, rungId: null });
  };

  // (1) the ladder-steps rule (19.3 #1).
  const anchorZoneId = input.anchorZoneId ??
    ('id' in anchor ? anchor.id : `LMV|${pair}|${(anchor as LqzZoneMatrix).center.toFixed(5)}`);
  const od = computeOperativeDefense(targetModel, anchorZoneId, direction);
  if (od) {
    const out3 = LADDER_STEP_OUTSIDE_PIPS * pipValue;
    const in15 = LADDER_STEP_INSIDE_PIPS * pipValue;
    const defFar = direction === 'SHORT' ? od.defense.top : od.defense.bottom;
    push(defFar + (direction === 'SHORT' ? out3 : -out3),
      `the ladder-steps rule — ${LADDER_STEP_OUTSIDE_PIPS}p outside the operative defense ${od.defense.id}'s far edge (${od.defenseKind})`);
    if (od.nextStep) {
      const closeEdge = direction === 'SHORT' ? od.nextStep.bottom : od.nextStep.top;
      push(closeEdge + (direction === 'SHORT' ? in15 : -in15),
        `the ladder-steps rule — ${LADDER_STEP_INSIDE_PIPS}p inside the next step ${od.nextStep.id}'s close edge`);
    }
  }
  // (2) the Law-7 bidirectional walk (the 3 tightest — the tightening is
  //     "where actually possible", the wider rungs are the alternates).
  for (const c of bidirectionalSlWalk(input, e).slice(0, 3)) {
    push(c.sl, `the Law-7 walk (${c.label})`);
  }
  return out;
}

/** E candidates (the micro-refine — the entry is the hard-won insight):
 *  (1) the internal LQZ rung's near edge; (2) the defendedEdge micro-refine
 *  (≤ 3p within the zone band, NEVER outside). */
function entryCandidates(input: RefineInput, state: TradeRefinementState): AnchorCandidate[] {
  const out: AnchorCandidate[] = [];
  const seen = new Set<string>();
  const push = (value: number, label: string): void => {
    const k = value.toFixed(10);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ value, label, rungId: null });
  };
  const band = { floor: input.entryZone.floor, ceiling: input.entryZone.ceiling };
  const near = internalRungNearEdge(band, input.direction, input.targetModel);
  if (near !== null) push(near, `the internal-LQZ rung's near edge (the §8.1 level)`);
  const micro = refineEntryMicro(input, state.entry.best);
  push(micro.entry, micro.action);
  return out;
}

// ── THE ARCHITECTURE CHECKS (Part 13.3 #5 — the 4 checks, each with the
//    RejectionContext the operator demanded: WHY the numbers + HOW the fix) ──

/** TP checks: the same-side TP (the opposing zone is the target); the
 *  Law-14 unmitigated-wall path (the unreachable-zone rejection). The E2
 *  projected-price reach cap is GONE (Wave ZR-6C) — the TP extends to the
 *  structurally-correct zone (the MoM→BoM doctrine), never capped by a
 *  day-cap price. */
function checkTpCandidate(input: RefineInput, state: TradeRefinementState, cand: AnchorCandidate): RejectionContext | null {
  const { direction, pair } = input;
  const e = state.entry.best;
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));
  // the same-side TP — the opposing zone is the target.
  if (direction === 'LONG' ? cand.value <= e + 1e-9 : cand.value >= e - 1e-9) {
    return {
      anchor: 'TP',
      why: `the TP ${fmt(cand.value)} is on the entry's side (entry ${fmt(e)}, ${direction}) — the opposing zone is the target`,
      how: `target the opposing ${direction === 'LONG' ? 'SUPPLY' : 'DEMAND'} zone — the next structural wall past the entry`,
    };
  }
  // the Law-14 path — an unmitigated opposing wall between the entry and the
  // TP makes the TP unreachable (price cannot teleport — T5 canon; mitigated
  // zones are BS pass-through).
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const um = structuralZones(input)
    .filter((z) => {
      if (z.type !== wantType || z.reactionEvents.length > 0) return false;
      // Law-14 cap = a BoM (or fortress) wall ONLY (2026-08-04): "BS/WL always
      // move to BoM zones, NOT MoM zones. MoM zones are IGNORED for BS/WL
      // targets — they get pierced and broken." A MoM shelf NEVER caps the TP
      // walk (it is pierced by doctrine). This also fixes the OBCV-lane
      // misfire: the OBCV zones carry reactionEvents [] (the honest-emptiness
      // gap) and read as fake-virgin — the Friday wall [100.803-100.937] (a
      // MoM, 42 in-week bars through it) wrongly capped the Friday LONG's TP.
      if (z.classification !== 'BoM' && z.pressure?.lifecycle !== 'FORTRESS') return false;
      if (z.bottom - 1e-9 <= cand.value && z.top + 1e-9 >= cand.value) return false;  // the target zone itself
      const mid = (z.bottom + z.top) / 2;
      return direction === 'LONG' ? mid > e + 1e-9 && mid < cand.value - 1e-9
        : mid < e - 1e-9 && mid > cand.value + 1e-9;
    })
    .sort((a, b) => direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top)[0];
  if (um) {
    const rung = internalRungOf(input, um);
    const wallTp = rung ? rung.defendedEdge : (direction === 'LONG' ? um.bottom : um.top);
    return {
      anchor: 'TP',
      why: `the TP ${fmt(cand.value)} sits past the unmitigated ${wantType} wall ${um.id} [${fmt(um.bottom)}-${fmt(um.top)}] — price cannot teleport through a fresh wall (the unreachable zone)`,
      how: `the TP must move to the wall's internal LQZ at ${fmt(wallTp)} — ${um.id} reacts first; the far target only opens once the wall is mitigated`,
    };
  }
  return null;
}

/** SL checks: the same-side SL (direction-insane); the Law-10 floor + the
 *  D17 ceiling band. The week-probe look-ahead + the zone-distance count
 *  are GONE (Wave ZR-6C) — the SL is the relevant zone's EDGE rule ("the
 *  zones are ladder steps"), probe-cleared at GENERATION (the Law-7 walk's
 *  liftToProbe), never rejected by the week's future anatomy. */
function checkSlCandidate(input: RefineInput, state: TradeRefinementState, cand: AnchorCandidate): RejectionContext | null {
  const { direction, pair, pipValue } = input;
  const e = state.entry.best;
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  // the same-side SL (direction-insane).
  if (direction === 'SHORT' ? cand.value <= e + 1e-9 : cand.value >= e - 1e-9) {
    return {
      anchor: 'SL',
      why: `the SL ${fmt(cand.value)} is not on the adverse side of the entry ${fmt(e)} (${direction}) — a same-side stop is direction-insane`,
      how: `the SL must sit ${direction === 'SHORT' ? 'ABOVE' : 'BELOW'} the entry — the next adverse structural defense + the Law-7 ${bufferPips}p buffer`,
    };
  }
  // The zone-distance computation survives for the D17 ceiling's how (the
  // nearest structural defense reference) — the count itself is no longer a
  // rejection (Wave ZR-6C: the SL is the relevant zone's edge rule).
  const between = zonesBetweenEntryAndSl(input, e, cand.value);
  // the Law-10 floor + the D17 ceiling band.
  const floorPips = slFloorPips(input);
  const d = Math.abs(e - cand.value) / pipValue;
  if (d < floorPips - 1e-9) {
    return {
      anchor: 'SL',
      why: `the SL ${fmt(cand.value)} (${d.toFixed(1)}p) sits inside the Law-10 noise floor ${floorPips.toFixed(1)}p (max(0.5×ATR, the Law-7 ${bufferPips}p buffer)) — the spread noise stops it out`,
      how: `the SL must clear ${floorPips.toFixed(1)}p — tighten the ENTRY toward the defense (the defended-edge micro-refine) instead of choking the stop`,
    };
  }
  if (d > D17_SL_CEILING_PIPS + 1e-9) {
    return {
      anchor: 'SL',
      why: `the SL ${fmt(cand.value)} (${d.toFixed(1)}p) breaches the D17 ${D17_SL_CEILING_PIPS}-pip hard ceiling — a stop this wide is a different trade`,
      how: `the SL must anchor inside the next REAL structural defense (${between.length > 0 ? between[0]!.id : 'the nearest adverse rung'}) — ${D17_SL_CEILING_PIPS}p is the hard ceiling`,
    };
  }
  return null;
}

/** E check: (4) the entry must stay within the designated zone's band. */
function checkEntryCandidate(input: RefineInput, cand: AnchorCandidate): RejectionContext | null {
  const { floor, ceiling } = input.entryZone;
  const fmt = (n: number): string => n.toFixed(priceDecimals(input.pair));
  if (cand.value < floor - 1e-9 || cand.value > ceiling + 1e-9) {
    return {
      anchor: 'E',
      why: `the entry ${fmt(cand.value)} is outside the zone [${fmt(floor)}-${fmt(ceiling)}] — the entry must stay on the designated zone`,
      how: `the entry is the hard-won insight — re-place it on the zone's internal LQZ near edge or the defendedEdge (≤ ${MAX_ENTRY_MICRO_MOVE_PIPS}p in-zone), NEVER outside the band`,
    };
  }
  return null;
}

// ── THE LOOP (Part 13.3 #3 — VERBATIM semantics) ──

type AnchorId = 'E' | 'SL' | 'TP';

function trackOf(state: TradeRefinementState, a: AnchorId): AnchorTrack {
  return a === 'E' ? state.entry : a === 'SL' ? state.sl : state.tp;
}

/** One anchor's refinement turn: generate the E1/E2-informed candidates,
 *  run the architecture checks (every violation → its RejectionContext),
 *  evaluate the architecture-valid candidates, return the RRR-maximizer
 *  (the 4R TARGET doctrine — never the first that barely clears the floor). */
function refineAnchor(
  input: RefineInput,
  state: TradeRefinementState,
  anchor: AnchorId,
): { candidate: AnchorCandidate | null; rrr: number; contexts: RejectionContext[]; generated: number } {
  const rrrWith = (a: AnchorId, v: number): number => {
    const e = a === 'E' ? v : state.entry.best;
    const s = a === 'SL' ? v : state.sl.best;
    const t = a === 'TP' ? v : state.tp.best;
    const risk = Math.abs(e - s);
    return risk > 1e-12 ? Math.abs(t - e) / risk : 0;
  };
  const track = trackOf(state, anchor);
  const gen = (anchor === 'TP' ? tpCandidates(input, state)
    : anchor === 'SL' ? slCandidates(input, state)
    : entryCandidates(input, state))
    .filter((c) => Math.abs(c.value - track.best) > 1e-9);   // no no-op turns
  const contexts: RejectionContext[] = [];
  let best: AnchorCandidate | null = null;
  let bestRrr = -1;
  for (const cand of gen) {
    const violation = anchor === 'TP' ? checkTpCandidate(input, state, cand)
      : anchor === 'SL' ? checkSlCandidate(input, state, cand)
      : checkEntryCandidate(input, cand);
    if (violation) { contexts.push(violation); continue; }
    const r = rrrWith(anchor, cand.value);
    if (r > bestRrr + 1e-9) { bestRrr = r; best = cand; }
  }
  return { candidate: best, rrr: best ? bestRrr : -1, contexts, generated: gen.length };
}

/**
 * refineSetup — the operator's per-anchor 3-attempt DYNAMIC STATE MACHINE
 * (ZR-3B): the anchors (E, SL, TP) are tracked + locked INDIVIDUALLY — 3
 * attempts each; the loop refines the next unlocked anchor (TP → SL → E, the
 * expected-RRR-gain priority) until RRR ≥ the 4R TARGET or ALL 3 lock; the
 * PASS gate stays the category floor. Every architecture rejection carries
 * its RejectionContext (WHY + HOW). The signature + the RefinementResult
 * contract are unchanged (the callers — mirror.ts's reAnchorMirror,
 * setup-gen's source lane — are untouched); the result exposes the terminal
 * state + the per-anchor contexts on `state`/`rejections` and in the
 * annotation/audit trail.
 */
export function refineSetup(input: RefineInput): RefinementResult {
  const { entry, sl, tp, direction, pair, pipValue, categoryFloor } = input;
  const attempts: RefinementAttempt[] = [];
  const rejections: RejectionContext[] = [];
  const rrrOf = (e: number, s: number, t: number): number => {
    const risk = Math.abs(e - s);
    return risk > 1e-12 ? Math.abs(t - e) / risk : 0;
  };
  const pipDist = (a: number, b: number): number => Math.abs(a - b) / pipValue;
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));

  const currentRrr = rrrOf(entry, sl, tp);
  const mkTrack = (best: number): AnchorTrack => ({
    attempts: 0, locked: false, best,
    history: [{ value: best, rrr: currentRrr, reason: 'the as-is baseline' }],
  });
  const state: TradeRefinementState = {
    entry: mkTrack(entry), sl: mkTrack(sl), tp: mkTrack(tp), status: 'REFINING',
  };

  // ── Attempt 1 — the current geometry, logged as-is (the audit baseline) ──
  //    The baseline anchors are ARCHITECTURE-CHECKED on admission (the
  //    operator: the machine "correctly rejects flawed shitty setups" — an
  //    incumbent that violates the architecture is NOT a legitimate best: the
  //    first valid candidate replaces it regardless of the RRR delta, and a
  //    trade can never PASS on an invalid anchor).
  const validate = (a: AnchorId, value: number): RejectionContext | null => {
    const cand: AnchorCandidate = { value, label: 'the incumbent', rungId: null };
    return a === 'TP' ? checkTpCandidate(input, state, cand)
      : a === 'SL' ? checkSlCandidate(input, state, cand)
      : checkEntryCandidate(input, cand);
  };
  const baselineContexts: RejectionContext[] = [];
  for (const a of ['E', 'SL', 'TP'] as AnchorId[]) {
    const v = validate(a, a === 'E' ? entry : a === 'SL' ? sl : tp);
    if (v) { baselineContexts.push(v); rejections.push(v); }
  }
  attempts.push({
    attempt: 1, entry, sl, tp, rrr: currentRrr,
    reason: `RRR ${currentRrr.toFixed(1)} < ${categoryFloor.toFixed(1)} — E ${fmt(entry)}, ` +
      `SL ${pipDist(entry, sl).toFixed(1)}p, TP ${pipDist(entry, tp).toFixed(1)}p (nearest-first)` +
      (baselineContexts.length > 0 ? ` — ${baselineContexts.length} baseline architecture violation(s)` : ''),
    action: 'as-is — the RRR-failed geometry (the E/SL/TP is wrong on a correct analysis)',
    contexts: baselineContexts.length > 0 ? baselineContexts : undefined,
  });

  if (currentRrr >= categoryFloor - 1e-9) {
    state.status = 'PASSED';
    return {
      setup: { entry, sl, tp, rrr: currentRrr, slMethod: 'as-is', tpRungId: null },
      attempts,
      annotation: `geometry re-confirmed — RRR ${currentRrr.toFixed(1)} ≥ ${categoryFloor.toFixed(1)} (no refinement needed)`,
      state, rejections,
    };
  }

  // ── THE PER-ANCHOR LOOP: TP first (the biggest lever), then SL (tighten
  //    where actually possible), then E (the micro-refine). The loop runs
  //    toward the 4R TARGET while attempts remain; it PASSES at the floor. ──
  const PRIORITY: AnchorId[] = ['TP', 'SL', 'E'];
  const provenance: Record<AnchorId, { label: string; rungId: string | null }> = {
    E: { label: 'as-is', rungId: null },
    SL: { label: 'as-is', rungId: null },
    TP: { label: 'as-is', rungId: null },
  };
  const actionLog: string[] = [];
  let turn = 1;
  while (state.status === 'REFINING') {
    const bestRrr = rrrOf(state.entry.best, state.sl.best, state.tp.best);
    // The 4R TARGET hit — the optimal — but never on an invalid anchor (the
    // machine keeps correcting the flawed anchor while attempts remain).
    const allValid = (['E', 'SL', 'TP'] as AnchorId[])
      .every((a) => !validate(a, trackOf(state, a).best));
    if (bestRrr >= RRR_TARGET - 1e-9 && allValid) { state.status = 'PASSED'; break; }
    const anchor = PRIORITY.find((a) => !trackOf(state, a).locked);
    if (!anchor) {
      state.status = bestRrr >= categoryFloor - 1e-9 ? 'PASSED' : 'REJECTED';
      break;
    }
    turn++;
    const track = trackOf(state, anchor);
    const res = refineAnchor(input, state, anchor);
    track.attempts++;
    if (track.attempts >= MAX_ANCHOR_ATTEMPTS) track.locked = true;
    rejections.push(...res.contexts);
    // The incumbent's validity (the anchors interlock — an E move changes the
    // SL's band; re-validated every turn).
    const incumbentValid = !validate(anchor, track.best);

    if (!res.candidate) {
      // No architecture-valid candidate this turn — the WHY + HOW of every
      // violation IS the attempt's audit record.
      if (res.generated === 0) track.locked = true;   // the generator is exhausted — proven optimal
      const why = res.contexts.length > 0
        ? res.contexts.map((c) => `${c.why} → HOW: ${c.how}`).join(' | ')
        : 'no further candidates (the generator is exhausted)';
      track.history.push({ value: track.best, rrr: bestRrr, reason: `rejected — ${why}` });
      attempts.push({
        attempt: turn, entry: state.entry.best, sl: state.sl.best, tp: state.tp.best, rrr: bestRrr,
        anchor, contexts: res.contexts,
        reason: `${anchor} attempt ${track.attempts}/${MAX_ANCHOR_ATTEMPTS} — no architecture-valid candidate (${res.generated} generated, ${res.contexts.length} rejected)`,
        action: why,
      });
      continue;
    }

    // A valid candidate ALWAYS replaces an invalid incumbent (the flawed
    // anchor is corrected, never ridden); against a valid incumbent only an
    // RRR improvement wins (the 4R TARGET doctrine).
    const improved = !incumbentValid || res.rrr > bestRrr + 1e-9;
    const from = track.best;
    if (improved) {
      track.best = res.candidate.value;
      provenance[anchor] = { label: res.candidate.label, rungId: res.candidate.rungId };
      track.history.push({
        value: res.candidate.value, rrr: res.rrr,
        reason: incumbentValid
          ? res.candidate.label
          : `the incumbent violated the architecture — corrected to ${res.candidate.label}`,
      });
      actionLog.push(`${anchor} ${fmt(from)} → ${fmt(res.candidate.value)} (${res.candidate.label})`);
    } else {
      track.history.push({
        value: track.best, rrr: bestRrr,
        reason: `candidate ${fmt(res.candidate.value)} (${res.candidate.label}) RRR ${res.rrr.toFixed(2)} did not improve on ${bestRrr.toFixed(2)} — the best stands`,
      });
    }
    attempts.push({
      attempt: turn, entry: state.entry.best, sl: state.sl.best, tp: state.tp.best,
      rrr: improved ? res.rrr : bestRrr,
      anchor, contexts: res.contexts.length > 0 ? res.contexts : undefined,
      reason: `${anchor} attempt ${track.attempts}/${MAX_ANCHOR_ATTEMPTS} — ${improved
        ? incumbentValid
          ? `${res.candidate.label} — RRR ${bestRrr.toFixed(2)} → ${res.rrr.toFixed(2)}`
          : `the invalid incumbent ${fmt(from)} corrected — ${res.candidate.label} (RRR ${bestRrr.toFixed(2)} → ${res.rrr.toFixed(2)})`
        : `best valid candidate ${fmt(res.candidate.value)} RRR ${res.rrr.toFixed(2)} ≤ current best ${bestRrr.toFixed(2)}`}` +
        (res.contexts.length > 0 ? ` (${res.contexts.length} architecture rejections)` : ''),
      action: improved
        ? `${anchor} re-anchored on ${res.candidate.label}`
        : `${anchor} holds at ${fmt(track.best)} (${provenance[anchor].label})`,
    });
  }

  const bestE = state.entry.best, bestS = state.sl.best, bestT = state.tp.best;
  const finalRrr = rrrOf(bestE, bestS, bestT);
  const tally = `E ${state.entry.attempts}/${MAX_ANCHOR_ATTEMPTS}${state.entry.locked ? '🔒' : ''} · ` +
    `SL ${state.sl.attempts}/${MAX_ANCHOR_ATTEMPTS}${state.sl.locked ? '🔒' : ''} · ` +
    `TP ${state.tp.attempts}/${MAX_ANCHOR_ATTEMPTS}${state.tp.locked ? '🔒' : ''}`;

  // The result-level rejections dedupe (the same violation re-fires every
  // turn the anchor is refined — the attempt records keep their own copies;
  // the summary carries each distinct WHY + HOW once).
  const seenCtx = new Set<string>();
  const rejectionsDedup = rejections.filter((c) => {
    const k = `${c.anchor}|${c.why}`;
    if (seenCtx.has(k)) return false;
    seenCtx.add(k);
    return true;
  });

  // THE FINAL VALIDITY GATE — a trade NEVER passes on an invalid anchor (the
  // anchors interlock: the last E micro-refine can invalidate the incumbent
  // SL's band; the terminal geometry is re-validated as a whole).
  const invalidFinal = (['E', 'SL', 'TP'] as AnchorId[])
    .map((a) => validate(a, a === 'E' ? bestE : a === 'SL' ? bestS : bestT))
    .filter((c): c is RejectionContext => c !== null);
  rejections.push(...invalidFinal);

  if ((state.status === 'PASSED' || finalRrr >= categoryFloor - 1e-9) && invalidFinal.length === 0) {
    const action = actionLog.length > 0 ? actionLog.join('; ') : 'geometry re-confirmed on the same zone anchors';
    const targetNote = finalRrr >= RRR_TARGET - 1e-9
      ? 'the 4R TARGET hit'
      : `≥ floor ${categoryFloor.toFixed(1)} (the 4R TARGET unreachable on these anchors — the best stands)`;
    return {
      setup: {
        entry: bestE, sl: bestS, tp: bestT, rrr: finalRrr,
        slMethod: provenance.SL.label, tpRungId: provenance.TP.rungId,
      },
      attempts,
      annotation: `🔧 REPAIRED(${turn}): ${action} [${tally}], RRR ${currentRrr.toFixed(1)}→${finalRrr.toFixed(1)} (${targetNote})`,
      state, rejections: rejectionsDedup,
    };
  }

  // ── HARD REJECT (D36) — all 3 anchors locked (or the terminal geometry
  //    still violates the architecture); the full per-anchor audit trail +
  //    every WHY + HOW rejection context IS the discard reason. ──
  if (invalidFinal.length > 0) state.status = 'REJECTED';
  const residual = invalidFinal.length > 0
    ? ` — the terminal geometry still violates: ${invalidFinal.map((c) => `[${c.anchor}] ${c.why}`).join(' | ')}`
    : '';
  const trail = attempts.map((a) => a.reason).join(' | ');
  const ctxTrail = rejectionsDedup.length > 0
    ? ` — rejections: ${rejectionsDedup.map((c) => `[${c.anchor}] ${c.why} → HOW: ${c.how}`).join(' | ')}`
    : '';
  return {
    setup: null, attempts,
    annotation: `HARD-REJECT — all anchors locked [${tally}]${residual} — [${trail}]${ctxTrail}`,
    state, rejections: rejectionsDedup,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAVE I1 — THE 3D REFINEMENT MACHINE (the deterministic 3-layer audit)
// (FIX PLAN §3 + §10 + §10.4 + §19 — the operator 2026-08-01: "refinement
// machine needs full awareness of pipeline mechanics and cascade mechanics
// AND trade setup mechanics (3D refinement machine)... it is 60-40
// deterministic/model inference". The machine's job (Wave I1) is the
// MECHANICAL card + the verdict matrix — the model inference reasons over
// the card in the MANUAL REVIEW STAGE (Wave K). Every check is a
// deterministic PASS/FAIL + the §19.2 evidence line — "earth density
// mechanical uncheatable".)
// ═══════════════════════════════════════════════════════════════════════════════

export type AuditVerdict = 'REJECT_GENUINE' | 'REFINE' | 'RE_ADMIT' | 'RE_TRANSLATE';

/** One deterministic check's finding — the check id + the §19.2 evidence. */
export interface AuditCheckResult {
  check: string;        // 'P1'..'P8' | 'C1'..'C6' | 'T1'..'T8'
  pass: boolean;
  evidence: string;
}

/** The 3-layer findings (the §19.1 audit-card boxes). */
export interface ThreeDLayerFindings {
  pipeline: Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8', AuditCheckResult>;
  cascade: Record<'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6', AuditCheckResult>;
  setup: Record<'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8', AuditCheckResult>;
}

export interface ThreeDCorrectedAnchors { entry: number; sl: number; tp: number; rrr: number; }

/** The FIX PLAN §19.1 REJECTED-SETUP AUDIT CARD (the mechanical scaffolding). */
export interface ThreeDAuditCard {
  setupId: string;
  pair: string;
  lane: string;
  day: string;
  direction: 'LONG' | 'SHORT';
  category: string;
  geometry: { entry: number; sl: number; tp: number; rrr: number; floor: number };
  layers: ThreeDLayerFindings;
  rawRejectionReason: string;
  hallucinationTrigger: boolean;
  verdict: AuditVerdict;
  correctedAnchors: ThreeDCorrectedAnchors | null;
  refinementNote: string;
}

/** The 3D audit's input — every optional field is null-guarded (honest
 *  absence → the check degrades or skips, never invents). */
export interface ThreeDAuditInput {
  setupId?: string;
  pair: string;
  lane?: string;
  day?: string;
  dayIdx?: number;
  direction: 'LONG' | 'SHORT';
  category?: string;
  entry: number; sl: number; tp: number; rrr: number;
  categoryFloor: number;
  pipValue: number;
  targetModel: ChartModel;
  /** The E2 CORE designation (the pair brain's day — the shapeDay). */
  shapeDay?: ShapeDayZone;
  /** CHANGE 2 — the threaded cascade translation (the RE_TRANSLATE substrate). */
  translatedDays?: TranslatedDayMap | null;
  /** The SOURCE setup's zone element (zoneClassOf — mirror.ts:1144). */
  sourceElement?: 'BoM' | 'MoM' | 'LQZ' | null;
  /** The SOURCE's zone role (from the source direction: SHORT→SUPPLY, LONG→DEMAND). */
  sourceRole?: 'SUPPLY' | 'DEMAND' | null;
  /** DXY→EU inverts; EU→GU keeps (mirror.ts:2466-2467). */
  translationMode?: 'INVERSE' | 'KEPT';
  anchor?: ZoneModel | LqzZoneMatrix | null;
  anchorZoneId?: string | null;
  tpRungId?: string | null;
  /** The source zone's formation ms (the ±48h window reference — the cascade
   *  thread's sourceFormationMs). */
  sourceFormationMs?: number;
  /** The trade's day ms (the fill-model evidence — the T7 bracket). */
  tradeMs?: number;
  session?: string | null;
  /** The report-hash canary (P7). Absent → honestly unchecked (never a fail —
   *  the machine's own construction is deterministic; the harness proves it). */
  determinism?: { hash1: string; hash2: string; identical: boolean } | null;
  rawRejectionReason?: string;
  /** The week's deepest adverse probe at the anchor (the T3 anatomy). */
  probe?: WeekProbeRef | null;
}

/** The RE_TRANSLATE loop's output (CHANGE 2). */
export interface ReTranslateResult {
  /** null → the re-translation still failed → HARD REJECT with the trail. */
  setup: RefinementSetup | null;
  /** The resolved structurally-equivalent zone (the re-anchor target). */
  zone: ZoneModel | null;
  /** '🔧 RE-TRANSLATED: <layer evidence>' | 'RE-TRANSLATE FAILED — <trail>'. */
  annotation: string;
}

// ── the 3D constants (every one has a BECAUSE — the FIX PLAN §10) ──

/** The ±48h formation/reaction window (C3 — the same market event created
 *  both zones; cascade-translation.ts:76 STRUCTURAL_WINDOW_MS canon). */
const THREE_D_WINDOW_MS = 48 * 3_600_000;

/** The ≤0.35 chain-divergence limit (P4 — CASCADE_DIVERGENCE_VALIDATED). */
const THREE_D_DIVERGENCE_LIMIT = 0.35;

/** The T1 entry tolerance = 1 pip (the mission's R2 ±1p — the golden Wed
 *  Δ0.4p precision; a sub-pip floor-vs-top distinction is quoting noise). */
const T1_ENTRY_TOL_PIPS = 1;

/** The T3 SL tolerance = 1 pip (the golden Mon SL 1.14578 vs the current
 *  structural 1.14581 — Δ0.3p — the T3 next-rung + buffer precision). */
const T3_SL_TOL_PIPS = 1;

/** The T4 TP tolerance = 1 pip (the golden TP 1.14103 vs the structural
 *  rung 1.14100 — Δ0.3p — the opposing-wall internal-LQZ precision). */
const T4_TP_TOL_PIPS = 1;

/** The T1 failure discriminator: the entry at the zone's geometric edge OR
 *  the defendedEdge is the §8.1 bug — FAIL when it is > 0.5p from the near
 *  edge (a 0.6p-wide rung's floor-vs-top is not an entry error; a 5p miss
 *  is — the §16.2 1.14494-vs-1.14544 case). */
const T1_EDGE_DISCRIMINATOR_PIPS = 0.5;

/** The C4 position tolerance = 3 pips (the §19.1 dedup identity's ±3pips —
 *  the position-in-structure check's band tolerance). */
const C4_POSITION_TOL_PIPS = 3;

/** The hallucination-trigger phrases (FIX PLAN §4.1 — ALL variations,
 *  case-insensitive — a generic rejection reason masks the real cause). */
const HALLUCINATION_TRIGGERS: readonly string[] = [
  'candles smaller', 'candles are smaller', 'smaller candles',
  'pair-native re-anchor', 'volatility differs', 'pair volatility',
  'candle size',
];

/** The LMV-bridged rung id namespace (the pair's OWN LQZ rungs — the C6
 *  unbiased-LQZ identity; canon index.ts:353). */
const LMV_ID_PREFIX = 'LMV|';

// ── the 3D helpers ──

/** The zone's element (LMV| prefix → LQZ — the bridged rungs are MoM-class
 *  per canon but their LQZ identity is the id namespace; else §6.3 class). */
function threeDElementOf(z: ZoneModel): 'BoM' | 'MoM' | 'LQZ' {
  return z.id.startsWith(LMV_ID_PREFIX) ? 'LQZ' : z.classification;
}

/** The matrix's translated role (INVERSE flips S/D→D/S; KEPT preserves —
 *  the operator's exact table, FIX PLAN §1.3). */
function threeDTranslatedRole(role: 'SUPPLY' | 'DEMAND', mode: 'INVERSE' | 'KEPT'): 'SUPPLY' | 'DEMAND' {
  return mode === 'INVERSE' ? (role === 'SUPPLY' ? 'DEMAND' : 'SUPPLY') : role;
}

/** Pair-native id? (the P5/C6 price-space identity: the setup's anchors are
 *  the pair's OWN zones — the LMV bridged rungs are the pair's own LQZ and
 *  the OBCV `OB|` namespace is the pair's own order-block vision output; a
 *  cross-pair prefixed id is the classic leak). */
function isPairNativeZoneId(id: string | null | undefined, pair: string): boolean {
  if (!id) return false;
  if (id.startsWith(LMV_ID_PREFIX)) return true;
  if (id.startsWith(`${pair}|`)) return true;
  if (id.startsWith(`OB|${pair}|`)) return true;
  return id.includes(`|${pair}|`);
}

/** The FIX PLAN §4.1 matcher — a generic rejection reason red-alerts. */
function hallucinationTriggered(reason: string | undefined): boolean {
  if (!reason) return false;
  const r = reason.toLowerCase();
  return HALLUCINATION_TRIGGERS.some((p) => r.includes(p));
}

/** The zone band of the anchor union (the T1 entry-zone substrate). */
function threeDBandOf(anchor: ZoneModel | LqzZoneMatrix | null | undefined): { floor: number; ceiling: number } | null {
  if (!anchor) return null;
  return { floor: anchor.bottom, ceiling: anchor.top };
}

/**
 * The T1 internal-LQZ-rung near edge inside the entry S/D zone (the §8.1
 * entry doctrine — "the entry == the internal LMV rung's near edge inside
 * the entry S/D zone (the E2 CORE's keyZonePrice — for SHORT: the rung's
 * floor; for LONG: the rung's ceiling)"). The strongest fresh internal
 * rung (zfp ≤ 20, band fully inside the zone) — its near edge; a partial
 * overlap falls to the zone's near geometric edge (the honest degenerate).
 */
function internalRungNearEdge(
  band: { floor: number; ceiling: number } | null,
  direction: 'LONG' | 'SHORT',
  targetModel: ChartModel,
): number | null {
  if (!band) return null;
  const wantSide = direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE';
  const edge = direction === 'LONG' ? band.ceiling : band.floor;
  const inside = targetModel.lmv.table
    .filter((z) =>
      z.side === wantSide && z.zfp <= 20 &&
      z.bottom >= band.floor - 1e-9 && z.top <= band.ceiling + 1e-9)
    .sort((a, b) =>
      (a.zfp - b.zfp) ||
      (Math.abs(a.center - edge) - Math.abs(b.center - edge)) ||
      (b.candles.length - a.candles.length) ||
      (a.center - b.center));
  if (inside.length > 0) {
    const rung = inside[0]!;
    return direction === 'LONG' ? rung.top : rung.bottom;
  }
  // A partial-overlap rung (the strongest overlapping fresh rung — the
  // zone's liquidity substrate).
  const overlap = targetModel.lmv.table
    .filter((z) =>
      z.side === wantSide && z.zfp <= 20 &&
      z.bottom <= band.ceiling + 1e-9 && z.top >= band.floor - 1e-9)
    .sort((a, b) =>
      (a.zfp - b.zfp) ||
      (Math.abs(a.center - edge) - Math.abs(b.center - edge)) ||
      (b.candles.length - a.candles.length) ||
      (a.center - b.center));
  if (overlap.length > 0) {
    const rung = overlap[0]!;
    return direction === 'LONG' ? rung.top : rung.bottom;
  }
  return null;
}

// ── LAYER 1 — PIPELINE MECHANICS (P1-P8, FIX PLAN §10.1) ──

function auditPipelineLayer(input: ThreeDAuditInput): ThreeDLayerFindings['pipeline'] {
  const { pair, entry, direction, targetModel, shapeDay, translatedDays, determinism, anchor } = input;
  const zones = targetModel.zones;
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));
  const byTf: Record<string, number> = {};
  for (const z of zones) byTf[z.timeframe] = (byTf[z.timeframe] ?? 0) + 1;

  // P1 — E1 executed (the pair's OWN zone map, telescoped, complete).
  const crossPairLeak = zones.find((z) => !isPairNativeZoneId(z.id, pair));
  const p1Pass = zones.length > 0 && !crossPairLeak;
  const tfSummary = Object.entries(byTf).map(([tf, n]) => `${tf}:${n}`).join(' ');
  const sample = zones.slice(0, 3).map((z) => z.id).join(' | ');
  const P1: AuditCheckResult = {
    check: 'P1', pass: p1Pass,
    evidence: crossPairLeak
      ? `E1 LEAK — cross-pair zone id ${crossPairLeak.id} in ${pair}'s map (the ${pair} model carries a foreign zone)`
      : `E1 executed — ${zones.length} zones (${tfSummary}) pair-native ids, e.g. ${sample}`,
  };

  // P2 — E2 CORE executed (the shapeDay carries the E1 fields).
  const day = shapeDay;
  const p2Pass = !!day && day.day.length > 0 &&
    (day.dayOpenSpot !== undefined || day.supplyZoneId != null || day.demandZoneId != null) &&
    (day.direction === 'LONG' || day.direction === 'SHORT');
  const P2: AuditCheckResult = {
    check: 'P2', pass: p2Pass,
    evidence: day
      ? `E2 CORE — ${day.day}:${day.shape}:${day.direction} open=${day.dayOpenSpot !== undefined ? fmt(day.dayOpenSpot) : '-'} key=${day.keyZoneId ?? 'none'} S=${day.supplyZoneId ?? '-'} D=${day.demandZoneId ?? '-'}`
      : 'E2 CORE NOT executed — no shapeDay (the pair brain did not designate the day)',
  };

  // P3 — the cascade translation executed (the TranslatedDayMap exists).
  const p3Pass = !!translatedDays && translatedDays.entries.length > 0;
  const P3: AuditCheckResult = {
    check: 'P3', pass: p3Pass,
    evidence: translatedDays && translatedDays.entries.length > 0
      ? `cascade translation executed — ${translatedDays.entries.length} translated-day entries (${translatedDays.direction})`
      : 'cascade translation NOT executed — no TranslatedDayMap (the structural-equivalence match never ran)',
  };

  // P4 — the divergence check ran (≤0.35).
  const div = translatedDays?.divergence;
  const p4Pass = div !== null && div !== undefined && div <= THREE_D_DIVERGENCE_LIMIT;
  const P4: AuditCheckResult = {
    check: 'P4', pass: p4Pass,
    evidence: div === null || div === undefined
      ? 'no divergence record (the validation was skipped — the cascade never validated)'
      : `divergence=${div.toFixed(2)} ${div <= THREE_D_DIVERGENCE_LIMIT ? '≤0.35 — VALIDATED' : '>0.35 — DIVERGED (flag only — the pair E2 stands)'}`,
  };

  // P5 — the bars are the pair's OWN (the price-space check).
  const p5Pass = pair === 'DXY' ? entry > 50 : entry < 10;
  const P5: AuditCheckResult = {
    check: 'P5', pass: p5Pass,
    evidence: `price-space check — ${pair} entry ${fmt(entry)} (${pair === 'DXY' ? 'index 1xx.xx' : 'FX 1.xx'}) ${p5Pass ? 'own-pair coordinates' : 'CROSS-PAIR PRICE (the classic leak)'}`,
  };

  // P6 — the temporal anchor held (no future bars).
  const anchorMs = targetModel.anchor?.anchorMs ?? 0;
  const formMs = anchor && 'formationMs' in anchor
    ? anchor.formationMs
    : anchor && anchor.candles.length > 0 ? anchor.candles[0]!.timestamp : 0;
  const p6Pass = anchorMs > 0 && formMs > 0 ? formMs <= anchorMs : true;
  const P6: AuditCheckResult = {
    check: 'P6', pass: p6Pass,
    evidence: anchorMs > 0 && formMs > 0
      ? `temporal anchor — formation ${new Date(formMs).toISOString()} ≤ ANCHOR ${new Date(anchorMs).toISOString()} ${p6Pass ? 'Held' : 'FUTURE BAR (W7-A leak)'}`
      : `temporal anchor — formation ${formMs > 0 ? new Date(formMs).toISOString() : 'unknown'} vs anchor ${anchorMs > 0 ? new Date(anchorMs).toISOString() : 'unknown'} (honest)`,
  };

  // P7 — determinism (the report-hash canary ×2; absent → harness-verified).
  const p7Pass = determinism ? determinism.identical : true;
  const P7: AuditCheckResult = {
    check: 'P7', pass: p7Pass,
    evidence: determinism
      ? `determinism — hash1 ${determinism.hash1.slice(0, 8)} / hash2 ${determinism.hash2.slice(0, 8)} ${determinism.identical ? 'IDENTICAL (the run is reproducible)' : 'MISMATCH (non-reproducible — untrustworthy)'}`
      : 'determinism — no report-hash provider at the mirror site (the card is a pure function of its inputs — the harness proves the ×2 canary)',
  };

  // P8 — the designated zone in the model map (the E2→E3 bridge worked).
  const keyId = day?.keyZoneId ?? null;
  const dirSideId = direction === 'SHORT'
    ? (day?.supplyZoneId ?? null)
    : (day?.demandZoneId ?? null);
  const designatedId = keyId ?? dirSideId;
  const p8Present = designatedId !== null ? zones.some((z) => z.id === designatedId) : true;
  const P8: AuditCheckResult = {
    check: 'P8', pass: p8Present,
    evidence: designatedId !== null
      ? `designated zone ${designatedId} ${p8Present ? 'present in the model map (the E2→E3 bridge worked)' : 'ABSENT from the model map (the bridge gap — E3 cannot anchor)'}`
      : 'no designated zone id (the day carried no keyZoneId — the E2 CORE runs free — the bridge is not judged)',
  };

  return { P1, P2, P3, P4, P5, P6, P7, P8 };
}

// ── LAYER 2 — CASCADE MECHANICS (C1-C6, FIX PLAN §10.2) ──

function auditCascadeLayer(input: ThreeDAuditInput): ThreeDLayerFindings['cascade'] {
  const { pair, direction, targetModel, translatedDays, shapeDay, sourceElement, sourceRole, translationMode, anchorZoneId } = input;
  const mode: 'INVERSE' | 'KEPT' = translationMode ?? (pair === 'EUR/USD' ? 'INVERSE' : 'KEPT');
  const dayIdx = input.dayIdx ?? (shapeDay?.dayIdx ?? 0);
  const entry = translatedDays?.entries[Math.min(Math.max(0, dayIdx), (translatedDays?.entries.length ?? 1) - 1)];
  // The cascade designation resolved for this day? (element non-null → the
  // cascade pair's E2 CORE designated a zone for the day.)
  const cascadeDesignated = entry !== undefined && entry.element !== null;

  // C1 — the zone element matched (BoM→BoM, MoM→MoM, LQZ→LQZ).
  let C1: AuditCheckResult;
  if (!cascadeDesignated) {
    C1 = { check: 'C1', pass: true, evidence: 'no cascade designation for the day — the E2 CORE runs free (honest: element not judged)' };
  } else if (!entry!.translatedZoneId) {
    C1 = { check: 'C1', pass: false, evidence: `element UNMATCHED — the cascade ${entry!.element} designation found NO structurally-equivalent ${pair} zone (translatedZoneId null — the translation MISSED)` };
  } else {
    const translated = targetModel.zones.find((z) => z.id === entry!.translatedZoneId);
    const translatedElement = translated ? threeDElementOf(translated) : null;
    const ok = translated !== undefined && translatedElement === entry!.element;
    C1 = { check: 'C1', pass: ok, evidence: `element ${entry!.element} → translated ${translatedElement ?? 'UNRESOLVED'} (${entry!.translatedZoneId}) ${ok ? 'MATCHED' : 'MISMATCHED (the LADDER-STEP vs ENTRY confusion)'}` };
  }

  // C2 — the role translated correctly (DXY/EU inverse, EU/GU kept).
  const srcRole = sourceRole ?? entry?.role ?? null;
  let C2: AuditCheckResult;
  if (srcRole === null) {
    C2 = { check: 'C2', pass: true, evidence: 'no source role reference (honest — the role translation not judged)' };
  } else {
    const expected = threeDTranslatedRole(srcRole, mode);
    const anchorType = direction === 'SHORT' ? 'SUPPLY' : 'DEMAND';
    const ok = anchorType === expected;
    C2 = { check: 'C2', pass: ok, evidence: `role translation — source ${srcRole} (${mode}) → expected ${expected}; the mirror anchors a ${anchorType} ${ok ? 'TRANSLATED CORRECTLY' : 'WRONG ROLE (the direction confusion)'}` };
  }

  // C3 — the formation/reaction window matched (±48h).
  let C3: AuditCheckResult;
  if (!cascadeDesignated) {
    C3 = { check: 'C3', pass: true, evidence: 'no cascade designation for the day — the window not judged (honest)' };
  } else if (entry!.windowDeltaMs === null) {
    C3 = { check: 'C3', pass: false, evidence: 'no window evidence — |formation/reaction delta| unknown (the structural twin was never timestamp-matched)' };
  } else {
    const ok = entry!.windowDeltaMs <= THREE_D_WINDOW_MS;
    C3 = { check: 'C3', pass: ok, evidence: `window delta ${(entry!.windowDeltaMs / 3_600_000).toFixed(1)}h ${ok ? '≤48h — MATCHED (the same market event)' : '>48h — MISMATCHED (different events — the structural equivalence is broken)'}` };
  }

  // C4 — the position-in-structure matched (the day's shape rejects at this zone).
  let C4: AuditCheckResult;
  if (!cascadeDesignated) {
    C4 = { check: 'C4', pass: true, evidence: 'no cascade designation for the day — the position not judged (honest)' };
  } else {
    C4 = { check: 'C4', pass: entry!.positionMatch, evidence: entry!.positionMatch
      ? 'position-in-structure MATCHED (the designated level sits in the matched zone\'s band ±3p with the day-direction role)'
      : 'position-in-structure MISMATCHED (the matched zone sits at a different structural point — not the day\'s rejection level)' };
  }

  // C5 — the strength filter was only SECONDARY (the structural match primary).
  // The translation engine's algorithm is structural-primary by construction
  // (element+role+window+position hard gates, zfp the tie-break); a day that
  // carries a translation record PROVES the structural matcher ran. FAIL only
  // when the translation never ran (the assignZonesByDay signature — the
  // strength-ranked designation the §16.2 story flags).
  const C5: AuditCheckResult = {
    check: 'C5', pass: !!translatedDays && translatedDays.entries.length > 0,
    evidence: translatedDays && translatedDays.entries.length > 0
      ? `strength SECONDARY — the structural matrix (element/role/window/position) ranked first; strength (zfp ${entry?.strengthScore ?? '?'}) is the tie-break noise filter`
      : 'strength PRIMARY — no translation record (the assignZonesByDay signature — the §16.2 Mon EU 1.14494 cause)',
  };

  // C6 — the pair-specific LQZ generated unbiased (no price conversion).
  const C6: AuditCheckResult = {
    check: 'C6', pass: isPairNativeZoneId(anchorZoneId, pair),
    evidence: isPairNativeZoneId(anchorZoneId, pair)
      ? `LQZ unbiased — anchor ${anchorZoneId} is ${pair}-native (the pair's OWN liquidity rung — no cascade price conversion)`
      : `LQZ CONVERTED — anchor ${anchorZoneId} is NOT ${pair}-native (the forbidden mathematical conversion)`,
  };

  return { C1, C2, C3, C4, C5, C6 };
}

// ── LAYER 3 — TRADE SETUP MECHANICS (T1-T8, FIX PLAN §10.3) ──

function auditSetupLayer(input: ThreeDAuditInput): ThreeDLayerFindings['setup'] {
  const { pair, direction, entry, sl, tp, rrr, categoryFloor, pipValue, targetModel, shapeDay, anchor, anchorZoneId, tpRungId, probe, tradeMs } = input;
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));
  const pipDist = (a: number, b: number): number => Math.abs(a - b) / pipValue;
  const band = threeDBandOf(anchor);

  // T1 — ENTRY at the internal-LQZ-rung near edge (the §8.1 level).
  const nearEdge = internalRungNearEdge(band, direction, targetModel)
    ?? (shapeDay?.keyZonePrice ?? null);
  const entryAtEdge = band !== null && (
    Math.abs(entry - (direction === 'LONG' ? band.floor : band.ceiling)) < 1e-9 ||
    (direction === 'LONG' ? entry === band.floor : entry === band.ceiling));
  const t1Delta = nearEdge !== null ? pipDist(entry, nearEdge) : Infinity;
  const t1Pass = nearEdge !== null && t1Delta <= T1_ENTRY_TOL_PIPS &&
    !(entryAtEdge && t1Delta > T1_EDGE_DISCRIMINATOR_PIPS);
  const T1: AuditCheckResult = {
    check: 'T1', pass: t1Pass,
    evidence: band === null
      ? `entry ${fmt(entry)} — no entry-zone band (honest: the internal-rung near edge not judged)`
      : `entry ${fmt(entry)} vs the internal-LQZ near edge ${nearEdge !== null ? fmt(nearEdge) : 'unknown'} (zone [${fmt(band.floor)},${fmt(band.ceiling)}]${entryAtEdge ? ', entry AT the zone edge — the §8.1 bug' : ''}) — Δ${t1Delta === Infinity ? '?' : t1Delta.toFixed(1)}p ${t1Pass ? 'PASS' : 'FAIL (not the operator\'s level)'}`,
  };

  // T2 — ENTRY on the correct side of the day's predicted spot.
  const dayOpen = shapeDay?.dayOpenSpot;
  const t2Pass = dayOpen === undefined
    ? true
    : direction === 'SHORT' ? entry >= dayOpen - 1e-9 : entry <= dayOpen + 1e-9;
  const T2: AuditCheckResult = {
    check: 'T2', pass: t2Pass,
    evidence: dayOpen === undefined
      ? `entry ${fmt(entry)} — no day-open reference (honest)`
      : `entry ${fmt(entry)} vs dayOpenSpot ${fmt(dayOpen)} (${direction === 'SHORT' ? 'supply above' : 'demand below'}) ${t2Pass ? 'PASS — on the correct side' : 'FAIL — wrong side of the open'}`,
  };

  // T3 — SL at the next rung's reactionExtreme + Law-7 buffer, probe-cleared,
  // in [max(0.5×ATR, buffer), 9.5], D17 36p ceiling.
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  const atrPips = (4 * targetModel.lmv.coverage.bucketWidth) / pipValue;
  const floorPips = atrPips > 0 ? Math.max(LAW10_ATR_FRACTION * atrPips, bufferPips) : bufferPips;
  const slDist = pipDist(entry, sl);
  const probeCleared = !probe || (direction === 'SHORT'
    ? sl >= probe.price + bufferPips * pipValue - 1e-9
    : sl <= probe.price - bufferPips * pipValue + 1e-9);
  const slInBand = slDist >= floorPips - 1e-9 && slDist <= GOLDEN_SL_MAX_PIPS + 1e-9;
  const t3Pass = slInBand && probeCleared;
  const T3: AuditCheckResult = {
    check: 'T3', pass: t3Pass,
    evidence: `SL ${fmt(sl)} (${slDist.toFixed(1)}p) — Law-7 ${bufferPips}p buffer, band [${floorPips.toFixed(1)},${GOLDEN_SL_MAX_PIPS}] ${slInBand ? '✓' : '✗'}, probe ${probe ? fmt(probe.price) + ' (' + probe.source + ')' : 'none'} ${probeCleared ? 'cleared' : 'NOT cleared (a wick INTO the SL band)'} ${t3Pass ? '— PASS' : '— FAIL'}`,
  };

  // T4 — TP at the structurally-equivalent opposing BoM wall's internal LQZ
  // (NEVER nearest — the §16.2 1.14400 MoM-shelf bug).
  const tpSane = direction === 'LONG' ? tp > entry : tp < entry;
  const tpRung = tpRungId
    ? targetModel.lmv.table.find((z) => {
        const id = `${pair}|LMV|${z.center.toFixed(priceDecimals(pair))}`;
        return id === tpRungId || id.endsWith(`|${z.center.toFixed(5)}`);
      })
    : undefined;
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const tpWall = tpRung
    ? targetModel.zones.find((z) =>
        z.classification === 'BoM' && z.type === wantType &&
        z.bottom <= tpRung.bottom + 1e-9 && z.top >= tpRung.top - 1e-9)
    : undefined;
  const t4Pass = tpSane && (tpWall !== undefined || (tpRung !== undefined && tpRung.zfp <= 20));
  const T4: AuditCheckResult = {
    check: 'T4', pass: t4Pass,
    evidence: tpWall
      ? `TP ${fmt(tp)} = the internal LQZ of the opposing BoM wall ${tpWall.id} [${fmt(tpWall.bottom)},${fmt(tpWall.top)}] — structural, NEVER nearest`
      : tpSane
        ? `TP ${fmt(tp)} (rung ${tpRungId ?? 'unknown'}) — ${tpRung && tpRung.zfp <= 20 ? 'a fresh wall rung (zfp ≤ 20)' : 'NO opposing BoM wall contains the TP — a nearest/MoM-shelf TP (the §16.2 1.14400 bug)'} ${t4Pass ? '— PASS' : '— FAIL'}`
        : `TP ${fmt(tp)} — same-side TP (direction-insane) — FAIL`,
  };

  // T5 — the Law-14 path clear (no UM zone between entry and TP).
  const umBetween = targetModel.zones
    .filter((z) => {
      if (z.id.startsWith(LMV_ID_PREFIX)) return false;   // the LMV rungs are the TP walk's own caps
      if (z.type !== wantType || z.reactionEvents.length > 0) return false;  // mitigated = pass-through
      if (z.classification !== 'BoM' && z.pressure?.lifecycle !== 'FORTRESS') return false;  // MoM shelves are pierced by doctrine — never a Law-14 wall (2026-08-04)
      const mid = (z.bottom + z.top) / 2;
      return direction === 'LONG' ? mid > entry && mid < tp : mid < entry && mid > tp;
    })
    .sort((a, b) => (direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top));
  const t5Pass = umBetween.length === 0;
  const T5: AuditCheckResult = {
    check: 'T5', pass: t5Pass,
    evidence: umBetween.length === 0
      ? 'Law-14 path CLEAR — no unmitigated opposing zone between entry and TP (mitigated zones are BS pass-through)'
      : `Law-14 path BLOCKED — UM zone ${umBetween[0]!.id} between entry and TP (price cannot teleport — the TP must move to it)`,
  };

  // T6 — RRR ≥ floor with the corrected anchors.
  const t6Pass = rrr >= categoryFloor - 1e-9;
  const T6: AuditCheckResult = {
    check: 'T6', pass: t6Pass,
    evidence: `RRR ${rrr.toFixed(2)} ${t6Pass ? '≥' : '<'} ${categoryFloor.toFixed(1)} — E ${fmt(entry)}, SL ${fmt(sl)}, TP ${fmt(tp)}` +
      ` (${t6Pass ? 'the refinement target is the ANCHOR precision, not the RRR' : 'the §16.2 CONSEQUENCE of T1+T4 — the repair target'})`,
  };

  // T7 — the fill model (activation at max(session start, battleMs), 21:00Z).
  const weekStartMs = targetModel.anchor?.weekStartMs ?? 0;
  const t7Pass = tradeMs === undefined || tradeMs <= 0 ? shapeDay !== undefined : tradeMs >= weekStartMs;
  const battleEv = tradeMs && tradeMs > 0 ? new Date(tradeMs).toISOString() : 'n/a';
  const T7: AuditCheckResult = {
    check: 'T7', pass: t7Pass,
    evidence: 'fill model — ' + (shapeDay
      ? `day-attributed to ${shapeDay.day} (battleMs ${battleEv}, session ${input.session ?? 'n/a'})`
      : 'no shapeDay — the anchor reaction day is the bracket') +
      ' — activation max(session start, battleMs) → 21:00Z ' + (t7Pass ? 'day-native' : 'ZOMBIE (multi-day / pre-week bracket)'),
  };

  // T8 — the dedup identity (pair, dir, zone_anchor±3pips, day) — the
  // reporting layer's global uniqueness; the card records the identity key.
  const T8: AuditCheckResult = {
    check: 'T8', pass: true,
    evidence: `dedup identity (${pair}, ${direction}, anchor ${anchorZoneId ?? 'n/a'}±3p, ${shapeDay?.day ?? input.day ?? 'n/a'}) — the reporting-layer key (dedupTrades enforces global uniqueness)`,
  };

  return { T1, T2, T3, T4, T5, T6, T7, T8 };
}

/** The §10.4 verdict matrix (how the 3 layers compose). */
function threeDVerdict(l1: boolean, l2: boolean, l3: boolean): AuditVerdict {
  if (!l1) return 'REJECT_GENUINE';
  if (!l2) return 'RE_TRANSLATE';
  if (!l3) return 'REFINE';
  return 'RE_ADMIT';
}

/**
 * auditSetup3D — THE DETERMINISTIC 3-LAYER AUDIT (Wave I1, NEW EXPORT).
 * Runs the P1-P8 / C1-C6 / T1-T8 mechanical checks (the FIX PLAN §10 rule
 * sets with the §19.2 evidence formats) and composes the §10.4 verdict.
 * Produces the §19.1 AUDIT CARD — the agent-facing scaffolding the model
 * reasons over in the MANUAL REVIEW STAGE (Wave K). Pure + deterministic
 * (the same input → the identical card — the diag's R4 proves the ×2).
 * The verdict matrix: L1 FAIL → REJECT_GENUINE · L2 FAIL → RE_TRANSLATE ·
 * L3 FAIL → REFINE · ALL PASS → RE_ADMIT.
 */
export function auditSetup3D(input: ThreeDAuditInput): ThreeDAuditCard {
  const pipeline = auditPipelineLayer(input);
  const cascade = auditCascadeLayer(input);
  const setup = auditSetupLayer(input);
  const l1Pass = Object.values(pipeline).every((c) => c.pass);
  const l2Pass = Object.values(cascade).every((c) => c.pass);
  const l3Pass = Object.values(setup).every((c) => c.pass);
  const verdict = threeDVerdict(l1Pass, l2Pass, l3Pass);
  const reason = input.rawRejectionReason ?? '';
  const trig = hallucinationTriggered(reason);
  const failed = [...Object.values(pipeline), ...Object.values(cascade), ...Object.values(setup)]
    .filter((c) => !c.pass).map((c) => c.check);
  const note = verdict === 'REJECT_GENUINE'
    ? `REJECT_GENUINE — the pipeline stage broke (${failed.join(', ')} fail) — the analysis is NOT refinable at the setup level; the pipeline must re-run`
    : verdict === 'RE_TRANSLATE'
      ? `RE_TRANSLATE — Layer 2 failed (${failed.filter((f) => f.startsWith('C')).join(', ')}) — the cascade translation missed; re-translate, then re-run E3 for this setup`
      : verdict === 'REFINE'
        ? `REFINE — the analysis is CORRECT, the anchors are SHIT (${failed.join(', ')} fail) — the diamond-in-the-mud; repair E/SL/TP on the SAME zone anchors (T1-T8 mechanics)`
        : `RE_ADMIT — no layer failed — the rejection was a FALSE ALARM (the setup is valid on re-audit)`;
  return {
    setupId: input.setupId ?? 'unknown',
    pair: input.pair,
    lane: input.lane ?? 'unknown',
    day: input.day ?? input.shapeDay?.day ?? 'unknown',
    direction: input.direction,
    category: input.category ?? 'unknown',
    geometry: { entry: input.entry, sl: input.sl, tp: input.tp, rrr: input.rrr, floor: input.categoryFloor },
    layers: { pipeline, cascade, setup },
    rawRejectionReason: reason,
    hallucinationTrigger: trig,
    verdict,
    correctedAnchors: null,
    refinementNote: note,
  };
}

/**
 * retranslateSetup — THE RE_TRANSLATE LOOP (Wave I1, CHANGE 2 — NEW EXPORT).
 * Fires when the audit verdict is RE_TRANSLATE (Layer 2 failed — the
 * cascade translation missed the structurally-equivalent zone). The loop:
 *   1. The machine's OWN structural resolution (the operator's design — the
 *      C1-C4 PRIMARY matrix, never the strength distribution): the element
 *      from the cascade day's designation (BoM→BoM/MoM→MoM/LQZ→LQZ), the
 *      translated role (DXY/EU inverse, EU/GU kept), the ±48h formation/
 *      reaction window (a PREFERENCE, not a gate — the §5.3 mirror doctrine),
 *      the position-in-structure (the zone band containing the day's
 *      structural level — the day-open/E2 level).
 *   2. Re-anchor at the resolved zone: entry = the internal-LQZ rung near
 *      edge (T1); SL = computeSL_LMV + the probe guard (T3); TP =
 *      computeLmvTP — the structurally-equivalent opposing BoM wall's
 *      internal LQZ (T4).
 *   3. Re-gate RRR ≥ the category floor. Emit the corrected setup with the
 *      '🔧 RE-TRANSLATED' annotation + the layer evidence; a still-failing
 *      re-translation → HARD REJECT with the full audit trail.
 */
export function retranslateSetup(input: ThreeDAuditInput): ReTranslateResult {
  const { pair, direction, categoryFloor, pipValue, targetModel, shapeDay, translatedDays, sourceRole, translationMode, sourceFormationMs } = input;
  const mode: 'INVERSE' | 'KEPT' = translationMode ?? (pair === 'EUR/USD' ? 'INVERSE' : 'KEPT');
  const dayIdx = input.dayIdx ?? (shapeDay?.dayIdx ?? 0);
  const entry = translatedDays?.entries[Math.min(Math.max(0, dayIdx), (translatedDays?.entries.length ?? 1) - 1)];
  const fmt = (n: number): string => n.toFixed(priceDecimals(pair));
  const pipDist = (a: number, b: number): number => Math.abs(a - b) / pipValue;

  // ── 1. THE STRUCTURAL RESOLUTION (C1-C4 primary; strength secondary) ──
  // The element reference = the cascade day's designation (C1: the translated
  // zone's classification == the cascade zone's classification).
  const element: 'BoM' | 'MoM' | 'LQZ' | null = entry?.element ?? input.sourceElement ?? null;
  // The receiving-side role = the source role translated (C2).
  const srcRole = sourceRole ?? entry?.role ?? null;
  const wantType: 'SUPPLY' | 'DEMAND' | null = srcRole ? threeDTranslatedRole(srcRole, mode) : null;
  const dayLevel = shapeDay?.keyZonePrice ?? shapeDay?.dayOpenSpot ?? null;
  const windowRef = sourceFormationMs ?? null;
  const pipSize = pair === 'DXY' ? 0.01 : 0.0001;

  const lastReactionMs = (z: ZoneModel): number | null =>
    z.reactionEvents.length === 0 ? null
      : z.reactionEvents.reduce((mx, ev) => (ev.lastTouchMs > mx ? ev.lastTouchMs : mx), -Infinity);

  const candidates = targetModel.zones.filter((z) => {
    // Wave A1.1 (2026-08-01) — DECISION-1: the IP zones (source==='PILLAR')
    // are confluence/ZFP/context + SL/TP rungs, NEVER the RE-TRANSLATE
    // re-anchor's ENTRY (a passive level can never host the mirrored entry).
    // Additive — no pre-existing zone carries the tag.
    if ((z as { source?: string }).source === 'PILLAR') return false;
    if (element !== null && threeDElementOf(z) !== element) return false;
    if (wantType !== null && z.type !== wantType) return false;
    return true;
  });

  const scored = candidates.map((z) => {
    const dForm = windowRef !== null ? Math.abs(z.formationMs - windowRef) : null;
    const rReact = lastReactionMs(z);
    const dReact = windowRef !== null && rReact !== null ? Math.abs(rReact - windowRef) : null;
    const windowOk = dForm === null || dForm <= THREE_D_WINDOW_MS || (dReact !== null && dReact <= THREE_D_WINDOW_MS);
    const level = dayLevel ?? null;
    const posOk = level !== null &&
      z.bottom - C4_POSITION_TOL_PIPS * pipSize <= level && z.top + C4_POSITION_TOL_PIPS * pipSize >= level;
    const center = (z.top + z.bottom) / 2;
    // The LOCAL structural correction: the distance from the current entry —
    // the re-translation corrects the designation NEAR the day's rejection
    // neighborhood (the entry the E2 already placed), never a global re-anchor
    // (the operator's "the cascade validates the pair-specific output against"
    // — the correction is local, the far-zone drift is a false structural match).
    const entryDist = Math.abs(center - input.entry);
    return { z, windowOk, posOk, windowDelta: dForm ?? (dReact ?? null), position: posOk, entryDist };
  });

  scored.sort((a, b) =>
    (a.entryDist - b.entryDist) ||                       // the LOCAL correction (the day's rejection neighborhood)
    (b.windowOk ? 1 : 0) - (a.windowOk ? 1 : 0) ||       // the ±48h window PREFERENCE (the structural twin)
    (b.posOk ? 1 : 0) - (a.posOk ? 1 : 0) ||             // the position-in-structure PREFERENCE (the day's level)
    (a.z.zfp - b.z.zfp) ||                                // SECONDARY: lowest zfp (the noise filter)
    (b.z.reactionEvents.length - a.z.reactionEvents.length) ||
    (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0));

  const zone = scored.length > 0 ? scored[0]!.z : null;
  if (!zone) {
    return {
      setup: null, zone: null,
      annotation: `RE-TRANSLATE FAILED — no ${element ?? 'any-element'} ${wantType ?? ''} zone on ${pair} matches the structural matrix (element/role/window/position) for ${shapeDay?.day ?? 'the day'} — the pair's E1 structure cannot host the translated designation (HARD REJECT, audit trail intact)`,
    };
  }

  // ── 2. RE-ANCHOR: entry = the internal-LQZ rung near edge (T1) ──
  const nearEdge = internalRungNearEdge(
    { floor: zone.bottom, ceiling: zone.top }, direction, targetModel)
    ?? (direction === 'LONG' ? zone.bottom : zone.top);
  const e2 = nearEdge;

  // ── SL = the golden T3 machinery (computeSL_LMV + the probe guard) ──
  const atrPips = (4 * targetModel.lmv.coverage.bucketWidth) / pipValue;
  const lmvZone: LqzZoneMatrix = {
    bottom: zone.bottom, top: zone.top,
    center: (zone.bottom + zone.top) / 2,
    side: direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE',
    candles: [], reactionExtreme: direction === 'LONG' ? zone.bottom : zone.top,
    defendedEdge: e2, sweepCount: 0, touchKinds: [], weekSpan: 0, zfp: zone.zfp,
    timeframe: '1H',
  };
  const slRes = computeSL_LMV(e2, lmvZone, direction, targetModel.lmv.table, pair, {
    atrPips,
    weekExtreme: direction === 'LONG'
      ? targetModel.lmv.coverage.minPrice : targetModel.lmv.coverage.maxPrice,
  });
  let slFinal = slRes ? slRes.sl : (direction === 'LONG' ? zone.bottom : zone.top);
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  if (input.probe) {
    const buffer = bufferPips * pipValue;
    if (direction === 'SHORT' && slFinal < input.probe.price + buffer - 1e-9) slFinal = input.probe.price + buffer;
    if (direction === 'LONG' && slFinal > input.probe.price - buffer + 1e-9) slFinal = input.probe.price - buffer;
  }

  // ── TP = the structural opposing BoM wall's internal LQZ (T4) ──
  const tpRes = computeLmvTP(e2, slFinal, direction, targetModel, pair, pipValue, { structuralExtension: true }, shapeDay);
  if (!tpRes) {
    return {
      setup: null, zone,
      annotation: `RE-TRANSLATE FAILED — the re-anchored ${pair} ${direction} at ${fmt(e2)} (zone ${zone.id}) found no opposing structural TP (Law-14 walk null) — HARD REJECT, audit trail intact`,
    };
  }

  // ── 3. RE-GATE RRR ≥ floor ──
  const rrrNew = Math.abs(tpRes.tp - e2) / Math.abs(e2 - slFinal);
  const passes = rrrNew >= categoryFloor - 1e-9;
  const windowEv = scored[0]!.windowOk
    ? (scored[0]!.windowDelta !== null ? `±48h window ${(scored[0]!.windowDelta / 3_600_000).toFixed(1)}h` : 'window n/a')
    : 'window preference missed (degraded to element+role+position — honest)';
  if (!passes) {
    return {
      setup: null, zone,
      annotation: `RE-TRANSLATE FAILED — re-anchored at ${zone.id} → E ${fmt(e2)}, SL ${fmt(slFinal)} (${pipDist(e2, slFinal).toFixed(1)}p), TP ${fmt(tpRes.tp)} — RRR ${rrrNew.toFixed(2)} < ${categoryFloor.toFixed(1)} — HARD REJECT, audit trail intact`,
    };
  }
  const layerEvidence = [
    `C1 ${element ?? '?'}→${threeDElementOf(zone)} matched`,
    `C2 ${srcRole ?? '?'}→${zone.type} (${mode})`,
    `C3 ${windowEv}`,
    `C4 position ${scored[0]!.posOk ? 'matched' : 'preference missed (honest)'}`,
    `C5 structural-primary (strength zfp ${zone.zfp} secondary)`,
    `C6 ${pair}-native LQZ`,
    `T1 entry = the internal-LQZ near edge ${fmt(e2)}`,
    `T3 SL ${fmt(slFinal)} (${pipDist(e2, slFinal).toFixed(1)}p, Law-7 ${bufferPips}p)`,
    `T4 TP ${fmt(tpRes.tp)} (the opposing BoM wall's internal LQZ)`,
    `T6 RRR ${rrrNew.toFixed(2)} ≥ ${categoryFloor.toFixed(1)}`,
  ].join(' · ');
  const annotation = `🔧 RE-TRANSLATED: the designation missed the structurally-equivalent zone — re-anchored at ${zone.id} [${fmt(zone.bottom)},${fmt(zone.top)}] — E → ${fmt(e2)}, SL → ${fmt(slFinal)}, TP → ${fmt(tpRes.tp)}, RRR → ${rrrNew.toFixed(2)} — ${layerEvidence}`;
  return {
    setup: { entry: e2, sl: slFinal, tp: tpRes.tp, rrr: rrrNew, slMethod: `re-translate-${slRes?.method ?? 'ZONE_WIDTH'}`, tpRungId: tpRes.rungId },
    zone,
    annotation,
  };
}
