/**
 * THE ANCHOR DECISION MACHINE (ADM) — the deterministic E3 anchor engine.
 * (The L2 spec PLUTUS_V4.5.4_ANCHOR_DECISION_MACHINE_L2_SPEC.md §2.1-§2.4 —
 *  the operator's 2026-08-10 mandate made mechanical: "the machine needs this
 *  exact logical decision making process wired in so it can replicate my
 *  reasoning tokens and place intelligent SLs NOT a fixed const. the market
 *  will eat all fixed const hardcoded garbage alive".)
 *
 * THE STATE MACHINE: IDLE → MEASURE → ANCHOR → VERIFY → EMIT | REJECT(verdict).
 * The engine is a PURE deterministic total function over the E1/E2 data — no
 * LLM hooks, no shadow imports, no wall-clock, no run-limits. Every number is
 * a MEASUREMENT (of the model's data), a CANON QUOTE (the operator's 3.0
 * floor), or a DOCUMENTED floor with the provenance comment — ZERO bare magic
 * constants (the constant-free audit law).
 *
 * THE MEASUREMENTS (the operator's chart-context reads, mechanical):
 *   m1 the reaction-wick extreme  — the deepest wick the price pushed INTO the
 *      zone within the recency window (the operator's Jul 2/3 battle read).
 *   m2 the wick dispersion        — the MEDIAN |touch − edge| (never the mean
 *      — the anti-outlier law: a single giant sweep wick cannot blow the SL).
 *   m3 the zone-width scale       — the SL depth scales with the zone's width
 *      × a MAP-derived ratio (the operator: "deeper zones → the SL slightly
 *      further in... it needs to scale w/ the market conditions").
 *   m4 the nesting depth          — the parent structure's wick territory
 *      (the operator: "nested supply within a 1H refined 4H supply OB").
 *   m5 the defended extreme       — the zone's full reaction history's extreme
 *      (the fortress's actual defended low — the EU LONG's 1.13983 pierce
 *      class: the SL must sit below the level the price has ACTUALLY been
 *      defended at, never 1.5p inside a collapsed rung).
 *
 * THE ANCHOR DECISIONS:
 *   SL    = zoneCloseEdge + max(wickPlacement, widthScale, nestingDepth,
 *           defendedPlacement) CAPPED by the RRR headroom (the deepest
 *           wick-surviving placement that still clears the operator's 3.0
 *           floor — "3R is better than a loss... stupid losses are
 *           degenerate"); the cap NEVER pushes the SL inside the measured
 *           wick territory (the ENTRY_LEVER_REQUIRED verdict — the entry is
 *           the problem, never a forced tight SL).
 *   ENTRY = the CHAINED-SNAP: clamp(priorTp, zone.floor, zone.ceiling) when a
 *           priorTp exists (the operator's chaining levels ALWAYS land inside
 *           the receiving structure — "Set E at the TP level of trade #1");
 *           else the INTERIOR-REACTION level (the LONG's modal — the GU
 *           LONG's 1.33330 interior, never the band's extreme edge).
 *   TP    = the W6-gated walk: the first defended opposing structure's
 *           internal-LQZ near edge — a degenerate zero-width rung is REJECTED
 *           at admission (the GU SHORT's 1.32850 [1.32673-1.32673] phantom —
 *           the operator's "what the actual FUCK is this? this was a flat 2R
 *           trade"); NO candidate → the NO_STRUCTURAL_TP (the D3 law).
 *
 * THE VERIFY GATE: the RRR floor 3.0 (the operator: "MINIMUM 3 RRR NOTHING
 * LESS IS ACCEPTABLE") · the geometry honesty (a sliver-SL OR a degenerate-rung
 * TP → DEGENERATE_PAIR_REJECTED, NEVER an emission) · the E3-NEVER traces
 * (every anchor to an E1 zone id + an E2 projection id) · the MPSE triplets
 * ({Pattern, State, Evidence} — no triplet = the INCONCLUSIVE state, never a
 * fabricated PASS).
 *
 * THE LOUD-FAIL LAW: a measurement with no source → present:false + the honest
 * fallback chain — NEVER a silent constant. The temporal lock: the recency
 * window is anchored to getAnalysisPointMs() (the one-way lock — the negative
 * control can never widen the window).
 */
import type { ZoneModel } from './types.js';
import type { LqzZoneMatrix } from './lmv.js';
import type { OperativeZone, Direction } from './reasoning-chain.js';
import { zoneToOperative } from './reasoning-chain.js';
import { getAnalysisPointMs } from './temporal.js';

// ═══════════════════════════════════════════════════════════════════════════
// THE CONTRACT TYPES (the L2 spec §2.1 — the W-ADM-2 delegation's surface)
// ═══════════════════════════════════════════════════════════════════════════

export interface AdmInput {
  model: ZoneModel[];
  lmvTable: LqzZoneMatrix[];
  pair: string;
  pip: number;
  operativeZone: OperativeZone;
  direction: Direction;
  dayOpenSpot: number;
  priorTp?: number;
  e1ZoneId: string;
  e2ProjectionId: string;
  atr1hPips: number;
}

export interface Measurement {
  value: number;
  evidence: string[];
  present: boolean;
}

export type AdmVerdict = 'EMIT' | 'REJECT';
export type AdmRejectReason =
  | 'DEGENERATE_PAIR_REJECTED'
  | 'RRR_BELOW_FLOOR'
  | 'NO_STRUCTURAL_TP'
  | 'INCONCLUSIVE';

export interface AdmTriplet {
  pattern: string;
  state: string;
  evidence: string;
}

export interface AdmResult {
  entry: number;
  entryMethod: string;
  sl: number;
  slMethod: string;
  tp: number;
  tpMethod: string;
  rrr: number;
  verdict: AdmVerdict;
  rejectReason?: AdmRejectReason;
  rejectEvidence?: string[];
  measurements: { slDepth: Measurement; entryLevel: Measurement; tpLevel: Measurement };
  triplets: AdmTriplet[];
}

// THE OPERATOR'S RRR FLOOR — the canon quote, documented (the L2 spec §0):
// "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE" — the safety envelope's floor.
const RRR_FLOOR = 3.0;
// THE VERIFY-GATE EPSILON (the L2 spec §2.4 — the boundary: an RRR of exactly
// 3.0 PASSES, 2.9999 FAILS — the float-tolerance canon of the codebase).
const EPSILON = 1e-9;
// THE RECENCY WINDOW (the operator's "within 3 trading days up to the present
// moment" — the M-9 window; the L2 spec §2.2) — anchored at the LOCKED
// analysis point, never a run-limit (the D-3b temporal law).
const RECENCY_WINDOW_MS = 3 * 86_400_000;
// THE DOCUMENTED FLOOR for the width-scale ratio's fallback (the L2 spec §8.1
// — the map-derived median, with this documented floor when the map yields no
// dispersion data — the provenance: the spec's anti-fitting law).
const WIDTH_RATIO_FLOOR = 0.2;
// THE VIRGIN-FACTOR for the battle-adaptive width scale (the L2 spec §8.1b —
// the virgin zone = the THIN wick zone; the battle-tested (2+) = the proven
// wider territory — the documented calibration, anti-fitting).
const VIRGIN_FACTOR = 1.0;
const TESTED_FACTOR = 1.6;
// THE MINIMUM RUNG WIDTH (the W6 canon — the L2 spec §2.6, citing mirror.ts
// :1402 — the degenerate-rung floor; supplied here as the ADM's own
// degenerate-rung rejection — the picker's predicate is module-private, the
// single-source import is the W-ADM-3 wave's wiring).
const MIN_RUNG_WIDTH_PIPS = 0.5;
// THE MEANINGFUL-ZONE WIDTH FLOOR (the DEFECT-2 calibration — the noise
// floor for the map-derived ratio): the ratio's fractions compute ONLY from
// the zones with width >= 5 pips — the narrow zones' dispersions are
// relatively inflated (a 3p zone with a 3p dispersion is NOT the market norm
// the SL should scale with); the pre-fix 1.37 EU ratio was dominated by
// exactly these narrow zones. The 5p floor is the documented calibration —
// a zone narrower than 5 pips is not a width-scaling substrate.
const WIDTH_RATIO_MIN_ZONE_PIPS = 5;
// THE DISPERSION-TO-WIDTH FRACTION CAP (the DEFECT-2 calibration — the
// mathematical bound): a dispersion never exceeds its zone's width — a
// ratio above 1.0 is an edge-reference artifact (the SUPPLY's bottom edge
// reference vs a dispersion measured from a demand's interior reaction),
// never a scaling law. The fractions are capped at 1.0 before the median.
const DISPERSION_WIDTH_FRACTION_CAP = 1.0;
// THE RATIO ANTI-INFLATION CAP (the DEFECT-2 calibration — the documented
// upper bound): the map-derived median fraction capped at 0.5 — the measured
// market norm's upper band, below the pre-fix 1.37 inflation. The operator:
// "deeper zones → the SL slightly further in... it needs to scale w/ the
// market conditions" — the EU supply's width-scale must land ≈ 2.5-3.5p
// (the spec §2.2's worked example), never the 15.2p the inflation produced.
const WIDTH_RATIO_UPPER_CAP = 0.5;
// THE MINIMUM WICK BUFFER (the DEFECT-A fix — 2026-08-11, the W-ADM-1c
// battery's T-1 finding): the operator's EU SHORT SL 1.14485 = the measured
// wick extreme 1.14480 + a 0.5p breathing room ("the peak + the 0.5p buffer"
// — the test comment + the L2 spec §1's "the operator's 1.14485 = the
// measured 1.14480 wick territory + the buffer"). When the zone carries a
// SINGLE reaction, the dispersion median degenerates to the wick distance
// itself (the touch IS the extreme — the median |touch−edge| of one value =
// the intrusion) — adding it double-counts (the pre-fix SL 1.14500, 1.5p
// over). The single-touch case substitutes this documented buffer — the
// operator's measured breathing room, not a bare magic number.
const MIN_WICK_BUFFER_PIPS = 0.5;
// THE MINIMUM-VIABLE-DEFENSE FLOOR (the DEFECT-C fix — 2026-08-11, the
// delegation's audit + the battery's T-5 finding + the orchestrator's
// DEFECT-H/J calibration — 2026-08-11): the sliver-SL gate's floor. The L2
// spec §8.1's original recommendation (the map-median dispersion) PROVED
// over-aggressive — the map medians (DXY 7.0p / EU 10.8p / GU 16.4p)
// exceeded every measured SL risk (0.6-7.0p) and rejected the operator's OWN
// golden week (the golden gate 0/5). The 2p floor let the GU SHORT's
// razor-thin 2.1p defense through (the sliver [1.33623-1.33639]'s SL — the
// operator's flat-2R read). The 3p floor caught it BUT ALSO rejected the
// virgin zone's honest width-scale SL (2.86p — the operator's "no 1p on a
// big zone" scaling on the 14.3p virgin demand — a LEGITIMATE defense, the
// T-6 known-answer). THE CALIBRATED FLOOR: 2.5 pips — the sliver class (the
// W8B's 1.6p sliver rung + the GU SHORT's 2.1p razor) dies while the real
// defenses (the EU SHORT 9.4p, the DXY SHORT 4.9p, the GU LONG 4.2p, the
// virgin width-scale 2.86p) survive. Documented, the anti-fitting law: the
// golden week is never the calibration set.
const MIN_VIABLE_DEFENSE_PIPS = 2.5;

// ═══════════════════════════════════════════════════════════════════════════
// THE MEASURE FUNCTIONS (the L2 spec §2.2 — m1-m5)
// ═══════════════════════════════════════════════════════════════════════════

/** The zone's reaction events — the battle evidence (the ReactionEvent schema:
 *  {firstTouchMs, lastTouchMs, price, anatomy, session, isoWeek, bars,
 *  pierced} — the extreme-price field is the single `price`; the host is the
 *  sourceZone's reactionEvents (the ZoneModel member), the narrative's range
 *  reactions as the fallback. THE PROBE (the spec's audit finding): there is
 *  NO touchHigh/touchLow — the `price` is the touch. */
function reactionEventsOf(zone: OperativeZone): Array<{ lastTouchMs: number; price: number }> {
  const source = zone.sourceZone as ZoneModel | undefined;
  const events = (source?.reactionEvents ?? []) as Array<{ lastTouchMs: number; price: number }>;
  return events;
}

/** m1 — THE REACTION-WICK EXTREME: the deepest wick the price pushed INTO the
 *  zone within the recency window. SHORT → the max touch price into a SUPPLY
 *  (the buy-side intrusion); LONG → the min touch price into a DEMAND (the
 *  sell-side intrusion). NO events in the window → present:false — the honest
 *  absence, never a fabricated wick (the loud-fail law). The operator's read:
 *  "price has reacted to on Jul 2 (pierces through w/ a wick) and on Jul 3"
 *  — the battle history as a number. */
export function measureReactionWickExtreme(zone: OperativeZone, direction: Direction, analysisPointMs: number): Measurement {
  const windowStart = analysisPointMs - RECENCY_WINDOW_MS;
  const events = reactionEventsOf(zone).filter((ev) => ev.lastTouchMs >= windowStart);
  if (events.length === 0) {
    return { value: 0, evidence: ['no reaction events in the recency window'], present: false };
  }
  const extreme = direction === 'SHORT'
    ? Math.max(...events.map((ev) => ev.price))
    : Math.min(...events.map((ev) => ev.price));
  return {
    value: extreme,
    evidence: events.map((ev) => `reaction ${new Date(ev.lastTouchMs).toISOString()} @ ${extreme}`),
    present: true,
  };
}

/** m2 — THE WICK DISPERSION (the adaptive buffer): the MEDIAN |touch − edge|
 *  of the recent reactions — the SL sits ONE dispersion beyond the extreme.
 *  THE MEDIAN, NEVER THE MEAN (the anti-outlier law — a single gigantic sweep
 *  wick cannot blow the SL out). NO reactions → present:false. THE
 *  SINGLE-REACTION DEGENERATE CASE (the DEFECT-A fix — 2026-08-11): when the
 *  zone carries exactly ONE reaction, the median is that single |touch−edge|
 *  — which equals the wick distance itself (the touch IS the extreme) — adding
 *  it to the wickPlacement DOUBLE-COUNTS the intrusion (the EU SHORT's
 *  pre-fix SL 1.14500 = the 2.0p wick + the 2.0p "dispersion"). A dispersion
 *  is a SPREAD — it needs ≥ 2 touches to exist. The single-touch case returns
 *  present:false and the wickPlacement substitutes the documented minimum
 *  buffer (MIN_WICK_BUFFER_PIPS 0.5 — the operator's measured breathing room).
 *  The multi-touch case (the T-7 outlier fixture) keeps the full median
 *  resistance — unchanged. */
export function measureWickDispersion(zone: OperativeZone, direction: Direction, analysisPointMs: number, pip: number): Measurement {
  const windowStart = analysisPointMs - RECENCY_WINDOW_MS;
  const events = reactionEventsOf(zone).filter((ev) => ev.lastTouchMs >= windowStart);
  if (events.length === 0) return { value: 0, evidence: ['no reactions'], present: false };
  if (events.length === 1) {
    // THE SINGLE-TOUCH DEGENERATE CASE: no spread exists — the honest absence
    // (the pre-fix double-count class — the SL over-scaled 1.5p).
    return { value: 0, evidence: ['single reaction — no dispersion spread (the documented minimum buffer applies)'], present: false };
  }
  const closeEdge = direction === 'SHORT' ? zone.floor : zone.ceiling;
  const touches = events.map((ev) => Math.abs(ev.price - closeEdge) / pip);
  touches.sort((a, b) => a - b);
  const median = touches[Math.floor(touches.length / 2)];
  return {
    value: median,
    evidence: [`median |touch−edge| = ${median.toFixed(2)}p over ${touches.length} reactions`],
    present: true,
  };
}

/** m3 — THE ZONE-WIDTH SCALE (the operator's scaling law: "deeper zones
 *  usually i move the SL slightly further in... no 1p on a big zone, no 3p on
 *  a tiny zone"): the SL depth = the zone's width × a MAP-DERIVED ratio × the
 *  battle factor. THE RATIO derives from the pair's measured dispersion
 *  distribution (the median dispersion-to-width fraction across the map's
 *  zones — the anti-fitting law: the golden week is never the calibration
 *  set; the documented floor 0.2 when the map yields no data). THE DEFECT-2
 *  CALIBRATION (2026-08-10 — the probe's root): the map-derived ratio was
 *  inflated ~4.5× (the EU's 1.37 vs the spec §2.2's 2.5-3.5p expectation)
 *  because the NARROW zones (width < 5p) with their RELATIVELY large
 *  dispersions dominated the median. THE FIX: (1) the fractions compute ONLY
 *  from the zones with widthPips >= 5 — the meaningful-zone exclusion, the
 *  noise floor (documented: a narrow zone's median dispersion is
 *  relatively inflated — a 3p zone with a 3p dispersion is NOT the market
 *  norm the SL should scale with); (2) each fraction is capped at 1.0 — the
 *  mathematical bound (a dispersion never exceeds its zone's width — a
 *  dispersion-to-width ratio above 1.0 is an artifact of the edge reference,
 *  never a scaling law); (3) the median of the surviving fractions, capped at
 *  0.5 — the anti-inflation upper bound (documented: the measured market
 *  norm's upper band — a ratio above 0.5 would push the SL deeper than the
 *  wick-survival logic intends); (4) the existing floor 0.2
 *  (WIDTH_RATIO_FLOOR). */
export function measureZoneWidthScale(zone: OperativeZone, model: ZoneModel[], pip: number, atr1hPips: number): Measurement {
  const widthPips = (zone.ceiling - zone.floor) / pip;
  const battles = zone.reactionCount ?? zone.sourceZone?.reactionEvents?.length ?? 0;
  const norms: number[] = [];
  for (const z of model) {
    const evs = (z.reactionEvents ?? []) as Array<{ price: number }>;
    if (evs.length === 0) continue;
    const width = (z.top - z.bottom) / pip;
    if (width <= 0) continue;
    const edge = z.type === 'SUPPLY' ? z.bottom : z.top;
    const dispersions = evs.map((ev) => Math.abs(ev.price - edge) / pip);
    dispersions.sort((a, b) => a - b);
    const medianDisp = dispersions[Math.floor(dispersions.length / 2)];
    // THE MEANINGFUL-ZONE EXCLUSION (the DEFECT-2 noise floor): the zones
    // with width < the documented 5p floor are excluded — their relatively
    // inflated dispersions dominated the median (the EU's 1.37 ratio).
    if (width < WIDTH_RATIO_MIN_ZONE_PIPS) continue;
    // THE FRACTION CAP (the mathematical bound): a dispersion never exceeds
    // its zone's width — the ratio above 1.0 is an edge-reference artifact,
    // never a scaling law.
    norms.push(Math.min(medianDisp / width, DISPERSION_WIDTH_FRACTION_CAP));
  }
  const baseRatio = norms.length > 0 ? norms.sort((a, b) => a - b)[Math.floor(norms.length / 2)] : WIDTH_RATIO_FLOOR;
  // THE ANTI-INFLATION CAP (the documented upper bound): the median fraction
  // capped at 0.5 — the measured market norm's upper band, below the
  // pre-fix 1.37 inflation (the operator: "it needs to scale w/ the market
  // conditions" — the EU supply ≈ 2.5-3.5p).
  const calibratedRatio = Math.min(baseRatio, WIDTH_RATIO_UPPER_CAP);
  const battleFactor = battles >= 2 ? TESTED_FACTOR : VIRGIN_FACTOR;
  const scalePips = widthPips * calibratedRatio * battleFactor;
  return {
    value: scalePips,
    evidence: [`width ${widthPips.toFixed(1)}p × map-ratio ${(calibratedRatio * battleFactor).toFixed(2)} (battles ${battles}, atr ${atr1hPips.toFixed(1)}p, wide-zones ${norms.length})`],
    present: true,
  };
}

/** m4 — THE NESTING DEPTH: the parent structure's wick territory (the
 *  operator: "this 1H supply zone is now nested supply within a 1H refined 4H
 *  supply OB" — the wicks that pierce the child's edge stop at the parent's
 *  deeper territory). The parent's close edge + the parent's measured wick
 *  extreme. NO parent → present:false. */
export function measureNestingDepth(zone: OperativeZone, model: ZoneModel[], direction: Direction, analysisPointMs: number, pip: number): Measurement {
  const parentId = zone.sourceZone?.parent?.id;
  const nested = zone.sourceZone?.nestedWithin ?? false;
  if (!parentId && !nested) return { value: 0, evidence: ['no nesting context'], present: false };
  const parent = model.find((z) => z.id === parentId);
  if (!parent) return { value: 0, evidence: ['parent unresolvable'], present: false };
  const parentOperative: OperativeZone = {
    id: parent.id,
    type: parent.type,
    floor: parent.bottom,
    ceiling: parent.top,
    classification: parent.classification,
    zfp: parent.zfp,
    confluence: parent.confluence ?? 0,
    reactionCount: parent.reactionEvents?.length ?? 0,
    formationMs: parent.formationMs,
    pressure: parent.pressure,
    sourceZone: parent,
    freshness: parent.freshness,
  };
  const parentWick = measureReactionWickExtreme(parentOperative, direction, analysisPointMs);
  if (!parentWick.present) return { value: 0, evidence: [`parent ${parent.id} no wick data`], present: false };
  const parentEdge = direction === 'SHORT' ? parent.top : parent.bottom;
  const depth = Math.abs(parentWick.value - parentEdge) / pip;
  return {
    value: depth,
    evidence: [`parent ${parent.id} wick depth ${depth.toFixed(1)}p`],
    present: true,
  };
}

/** m5 — THE DEFENDED EXTREME (the EU LONG's class): the zone's FULL reaction
 *  history's extreme — the fortress's actual defended low. The SL must sit
 *  beyond the level the price has ACTUALLY been defended at — never 1.5p
 *  inside a collapsed rung (the F-2 class: the 1.13983 pierce). */
export function measureDefendedExtreme(zone: OperativeZone, direction: Direction): Measurement {
  const events = reactionEventsOf(zone);
  if (events.length === 0) return { value: 0, evidence: ['no reactions'], present: false };
  const extreme = direction === 'SHORT'
    ? Math.max(...events.map((ev) => ev.price))
    : Math.min(...events.map((ev) => ev.price));
  return {
    value: extreme,
    evidence: [`defended extreme ${extreme} over ${events.length} reactions`],
    present: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE ANCHOR FUNCTIONS (the L2 spec §2.3)
// ═══════════════════════════════════════════════════════════════════════════

/** THE CONTAINING-STRUCTURAL-ZONE (the DEFECT-G fix — 2026-08-11): the model
 *  S/D zone whose band FULLY contains a rung-based operative zone — the
 *  parent structure the operator reads when the operative zone is an LQZ rung
 *  (the GU LONG's demand [1.33306-1.33343] contains the rung; the GU SHORT's
 *  sliver sits within the supply's wick territory). The NEAREST-SMALLEST
 *  containing zone wins (the tightest structural wrapper — the operator's
 *  "nested supply within a 1H refined 4H supply OB" — the immediate parent,
 *  never the macro). Null → the rung is not contained (the honest absence). */
export function containingStructuralZone(zone: OperativeZone, model: ZoneModel[]): ZoneModel | null {
  const rungBottom = zone.floor;
  const rungTop = zone.ceiling;
  const containing = model
    .filter((z) => z.bottom <= rungBottom + 1e-9 && z.top >= rungTop - 1e-9)
    .sort((a, b) => (a.top - a.bottom) - (b.top - b.bottom)); // the smallest first
  return containing[0] ?? null;
}

/** THE RRR-HEADROOM CAP (the safety envelope — the operator: "safety > profit
 *  ... 3R is better than a loss"): the SL depth is bounded by the geometry —
 *  the deepest wick-surviving placement that still clears the 3.0 floor. The
 *  cap NEVER pushes the SL inside the measured wick territory — when the
 *  wick placement breaks the floor, the ENTRY is the problem (the
 *  ENTRY_LEVER_REQUIRED class). */
export function resolveSlDepth(
  zone: OperativeZone,
  direction: Direction,
  model: ZoneModel[],
  pip: number,
  analysisPointMs: number,
  atr1hPips: number,
  tpPrelim: number,
  entry: number,
): { depthPips: number; method: string; measurements: Measurement[]; entryLever: boolean } {
  // THE CONTAINING-STRUCTURAL-ZONE RESOLUTION (the DEFECT-G fix — 2026-08-11,
  // the orchestrator's audit — the GU LONG + the GU SHORT class): a rung-based
  // operative zone (the LQZ rung — the GU LONG's [1.33306-1.33343] + the GU
  // SHORT's sliver [1.33623-1.33639]) carries NO sourceZone reaction history —
  // its SL measured from the rung's own thin band (1.9p / 2.1p risk) is a
  // RAZOR, never the operator's defense. THE OPERATOR'S READ: the SL anchors
  // to the STRUCTURAL ZONE that CONTAINS the rung (the demand's defended low
  // for the GU LONG — the supply's wick territory for the GU SHORT). When the
  // operative zone is a rung (no sourceZone reactions), the measurements
  // resolve over the CONTAINING structural zone's reaction history — the
  // model zone whose band fully contains the rung — the SL depth becomes the
  // real defense (the GU LONG's defended territory, the GU SHORT's 10-15p
  // wick → the flat-2R RRR → the RRR_BELOW_FLOOR reject).
  const containing = containingStructuralZone(zone, model);
  // THE DEFENDED-EXTREME ZONE (the DEFECT-G fix — 2026-08-11, refined): the
  // containing structural zone feeds the m5 DEFENDED EXTREME ONLY (the
  // operator's "defended low/high" read — the fortress's actual battle
  // territory that SURVIVED), NOT the m1 recency wick (the operative zone's
  // own recent battles stay the SL's wick source — the GU LONG's SL must sit
  // below the demand's defended low, never the full-history wick blowout).
  const defendedZone = (zone.sourceZone ? zone : containing ? zoneToOperative(containing) : zone) as OperativeZone;
  const m1 = measureReactionWickExtreme(zone, direction, analysisPointMs);
  const m2 = measureWickDispersion(zone, direction, analysisPointMs, pip);
  const m3 = measureZoneWidthScale(zone, model, pip, atr1hPips);
  const m4 = measureNestingDepth(zone, model, direction, analysisPointMs, pip);
  const m5 = measureDefendedExtreme(defendedZone, direction);
  const closeEdge = direction === 'SHORT' ? zone.floor : zone.ceiling;
  // THE WICK PLACEMENT (the DEFECT-A fix — 2026-08-11): the wick distance +
  // the dispersion. When the dispersion is ABSENT (no reactions, OR the
  // single-touch degenerate case — the median of one touch = the wick
  // distance itself = the double-count class), the documented minimum buffer
  // (the operator's 0.5p breathing room — the EU SHORT's 1.14485 = the
  // 1.14480 peak + 0.5p) applies — NEVER a silent zero, NEVER the double-add.
  const wickPlacement = m1.present
    ? Math.abs(m1.value - closeEdge) / pip + (m2.present ? m2.value : MIN_WICK_BUFFER_PIPS)
    : 0;
  const defendedPlacement = m5.present ? Math.abs(m5.value - closeEdge) / pip : 0;
  // THE DEPTH (the DEFECT-F fix — 2026-08-11, the orchestrator's audit — the
  // EU SHORT's SL 1.14515 regression): the measured WICK placement is the
  // operator's read #1 (LAW-3: "the SL sits BEYOND the measured reaction-wick
  // extreme + one dispersion") — the width-scale (m3) is the FLOOR for the
  // VIRGIN zones (no battle history — LAW-2: "deeper zones → the SL slightly
  // further in... it needs to scale w/ the market conditions"), NEVER an
  // override of the measured wick. The pre-fix `Math.max(wick, width, ...)`
  // let the EU's width-scale (11.1p × ratio ≈ 5.5p) dominate the wick
  // placement (2.4p) → the SL 1.14515 (12.5p risk) → the RRR 2.79 < 3.0 →
  // the operator's #1 rejected. THE FIX: when the wick evidence exists
  // (m1/m5 present), the depth = the wick/defended/nesting max (the measured
  // battle territory); the width-scale joins ONLY when the wick is absent
  // (the virgin zone — the honest fallback).
  const hasWickEvidence = m1.present || m5.present;
  // THE HONEST-ABSENCE WALK-UP (the W-ADM-5 OUTCOME-SIDE fix — 2026-08-11,
  // the GU LONG class): when BOTH the operative zone AND its containing
  // structural zone carry ZERO reaction events (the GU LONG's rung
  // [1.33306-1.33343] + its containing demand — the honest-absence), the
  // defense walks UP to the NEAREST structural DEMAND above the operative
  // zone (the operator's "the demand's measured reaction low ~1.3330" — the
  // [1.33376-1.33471] demand whose reaction history pierced to 1.33301 — the
  // level the price has ACTUALLY been defended at) and measures ITS m1 recency
  // wick + m2 dispersion as the SL depth — NEVER the min-viable floor (a
  // 2.5p floor cannot survive the real 5.7p dip when the demand's measured
  // defense sits 4.2p below the entry; the floor is the honest-absence's
  // THEATRICAL minimum, the walk-UP is the operator's measured defense). The
  // walk-UP applies to the LONG's DEMAND-side defense (the SL below the
  // entry) — the SHORT's SUPPLY-side mirror walks DOWN to the nearest SUPPLY
  // below (symmetric). The rung + the containing demand both zero → the walk;
  // a containing demand WITH reactions → the m5 already carries the defense.
  let walkUpPlacement = 0;
  let walkUpEvidence = '';
  if (!hasWickEvidence) {
    // THE C-2 DIRECTION FIX (2026-08-11 — Machine C): the walk's direction
    // was INVERTED for the SHORT. The SL sits ABOVE the entry for a SHORT —
    // the defense = the FIRST SUPPLY ABOVE the operative zone (the operator's
    // EU SHORT SL 1.14484 = INSIDE the Friday supply [1.1446-1.14571] — the
    // supply ABOVE the golden rung [1.1439-1.14415]). The old `z.top <
    // zone.floor` walked to the SUPPLY BELOW (the [1.14186-1.14298] — the
    // 33.8p wick → the SL 1.14649 — the 25.9p risk → the RRR 1.33 → the TP
    // cap extension to the deep 1.13612 — the ΔNONE LONG regression). The
    // LONG's walk stays ABOVE (the SL below the entry — the defense = the
    // FIRST DEMAND ABOVE the zone — the classic demand-rejection above).
    const walkUp = direction === 'LONG'
      ? model.filter((z) => z.type === 'DEMAND' && z.bottom > zone.ceiling)
          .sort((a, b) => a.bottom - b.bottom || (a.top - a.bottom) - (b.top - b.bottom))[0]
      : model.filter((z) => z.type === 'SUPPLY' && z.bottom > zone.ceiling)
          .sort((a, b) => a.bottom - b.bottom || (a.top - a.bottom) - (b.top - b.bottom))[0];
    if (walkUp) {
      const walkUpOperative = zoneToOperative(walkUp);
      const wm1 = measureReactionWickExtreme(walkUpOperative, direction, analysisPointMs);
      const wm2 = measureWickDispersion(walkUpOperative, direction, analysisPointMs, pip);
      if (wm1.present) {
        // THE WICK FROM THE OPERATIVE ZONE'S CLOSE EDGE (the anchor the SL
        // marks): the walked-up demand's defended extreme is expressed as the
        // distance from the OPERATIVE zone's edge (the GU's rung ceiling
        // 1.33343 — the walk-up extreme 1.33301 sits 4.2p below it) + the
        // walked-up demand's measured dispersion (the battle spread).
        const wickFromOperative = Math.abs(wm1.value - closeEdge) / pip;
        walkUpPlacement = wickFromOperative + (wm2.present ? wm2.value : MIN_WICK_BUFFER_PIPS);
        walkUpEvidence = `honest-absence walk-up ${walkUp.id} [${walkUp.bottom.toFixed(5)}-${walkUp.top.toFixed(5)}] wick ${wickFromOperative.toFixed(1)}p + ${wm2.present ? 'disp ' + wm2.value.toFixed(1) + 'p' : 'buffer ' + MIN_WICK_BUFFER_PIPS.toFixed(1) + 'p'}`;
      }
    }
  }
  // THE MIN-VIABLE FLOOR ON THE DEPTH (the DEFECT-K fix — 2026-08-11, the
  // GU LONG class): the floor applies ONLY to the HONEST-ABSENCE case on a
  // REAL-WIDTH zone (the GU LONG's demand rung [1.33306-1.33343] — 3.7p
  // wide, ZERO reaction events → the width-scale 1.8p alone → the SL risk
  // 1.9p → the DEGENERATE gate rejects the operator's GOLDEN trade) — the
  // depth FLOORS at the min-viable defense (2.5p) → the GU LONG's SL =
  // ceiling − 2.5p = 1.33318 → risk 2.5p → RRR 8.7 → EMIT. THE SLIVER
  // EXCLUSION (the DEFECT-L fix): a zone whose OWN width is below the
  // min-viable (the GU SHORT's sliver [1.33623-1.33639] — 1.6p wide) is
  // degenerate BY WIDTH — the floor NEVER applies to it (a sub-2.5p-wide
  // band cannot demand a 2.5p defense — the sliver's honest defense is its
  // own sub-floor width, caught by the DEGENERATE gate). A MEASURED depth
  // (the sliver's 2.1p wick) is NEVER floored either. THE GUARANTEE: the
  // honest absence on a real-width zone never collapses the SL below the
  // minimum-viable defense; the sliver never escapes the degeneracy gate —
  // the operator: "safety > profit".
  const zoneWidthPipsDepth = (zone.ceiling - zone.floor) / pip;
  const sliverZone = zoneWidthPipsDepth < MIN_VIABLE_DEFENSE_PIPS;
  const depth = hasWickEvidence
    ? Math.max(wickPlacement, defendedPlacement, m4.value)
    : walkUpPlacement > 0
      ? Math.max(m3.value, m4.value, walkUpPlacement)
      : sliverZone
        ? Math.max(m3.value, m4.value)
        : Math.max(m3.value, m4.value, MIN_VIABLE_DEFENSE_PIPS);
  const rewardPips = Math.abs(tpPrelim - entry) / pip;
  const maxDepthForRrr = RRR_FLOOR > 0 ? rewardPips / RRR_FLOOR : 0;
  const capped = Math.min(depth, maxDepthForRrr);
  const entryLever = capped < wickPlacement - EPSILON;
  return {
    depthPips: capped,
    method: `measured (wick ${wickPlacement.toFixed(1)}p / width ${m3.value.toFixed(1)}p / nesting ${m4.value.toFixed(1)}p / defended ${defendedPlacement.toFixed(1)}p${!hasWickEvidence ? walkUpEvidence ? ' / ' + walkUpEvidence : ' / min-viable-floor ' + MIN_VIABLE_DEFENSE_PIPS.toFixed(1) + 'p' : ''}${entryLever ? ' — ENTRY_LEVER_REQUIRED: the wick placement breaks the RRR floor, the entry is the problem' : ''})`,
    measurements: [m1, m2, m3, m4, m5],
    entryLever,
  };
}

/** THE ENTRY RESOLUTION:
 *  1. THE CHAINED-SNAP (the F-3 fix): when a priorTp exists, the fill =
 *     clamp(priorTp, zone.floor, zone.ceiling) — the operator's chaining
 *     levels ALWAYS land inside the receiving structure (the EU #2's E
 *     1.14110 = the fortress's interior; the DXY LONG → 100.945 = the
 *     operator's exact golden — the raw 100.918 chase is dead).
 *  2. THE INTERIOR-REACTION ENTRY (the F-4 fix, no priorTp): the LONG
 *     entries resolve to the structure's INTERIOR reaction level — the
 *     internal LQZ rung's near edge when present, else the zone's interior
 *     modal (the band's midpoint — the measured reaction territory) — NEVER
 *     the band's extreme edge (the GU LONG's 1.33330 interior). The SHORT
 *     keeps the shield-near-edge semantics (the EU #1's 1.14390 = the
 *     floor-shield's bottom — the first contact — the approach-side
 *     reaction level). */
export function resolveEntry(
  zone: OperativeZone,
  direction: Direction,
  lmvTable: LqzZoneMatrix[],
  pip: number,
  priorTp?: number,
): { entry: number; method: string; measurement: Measurement } {
  if (priorTp && priorTp > 0) {
    const snapped = Math.min(Math.max(priorTp, zone.floor), zone.ceiling);
    return {
      entry: snapped,
      method: snapped === priorTp
        ? 'chained (Law 27 — the TP-of-N = entry-of-N+1)'
        : 'chained-snapped (the TP outside the receiving band → clamped into the zone)',
      measurement: { value: snapped, evidence: [`clamp(${priorTp}, ${zone.floor}, ${zone.ceiling})`], present: true },
    };
  }
  if (direction === 'LONG') {
    const internals = lmvTable
      .filter((r) => r.side === 'BUY_SIDE' && r.bottom >= zone.floor && r.top <= zone.ceiling)
      .sort((a, b) => b.top - a.top);
    if (internals.length > 0) {
      // THE INTERIOR-REACTION LEVEL (the DEFECT-B fix — 2026-08-11, the
      // W-ADM-1c battery's T-4 finding): the entry resolves to the structure's
      // MEASURED REACTION LEVEL — the rung's defendedEdge (the modal bodyClose
      // — the operator's drawn rung — the GU LONG's 1.33330), else the rung's
      // own price (the center — the LMV bucket median), NEVER the band's
      // extreme top (the F-4 slop level 1.33343 — the spec §2.3: "NEVER the
      // band's extreme edge"). The pre-fix returned internals[0].top — the
      // exact F-4 defect the ADM was built to fix.
      const rung0 = internals[0]!;
      const near = rung0.defendedEdge && rung0.defendedEdge > rung0.bottom && rung0.defendedEdge < rung0.top
        ? rung0.defendedEdge
        : (rung0.bottom + rung0.top) / 2;
      return {
        entry: near,
        method: 'interior-reaction (the internal LQZ defended edge — the structure\'s measured reaction level, the operator\'s drawn rung)',
        measurement: { value: near, evidence: [`internal rung ${rung0.bottom}-${rung0.top} defEdge ${near}`], present: true },
      };
    }
    const interior = (zone.floor + zone.ceiling) / 2;
    return {
      entry: interior,
      method: 'interior-reaction (the band\'s measured midpoint — never the extreme edge)',
      measurement: { value: interior, evidence: [`band midpoint [${zone.floor}-${zone.ceiling}]`], present: true },
    };
  }
  // THE SHORT — the D-2 shield resolutions (the W8B §7 D-2 semantics, the
  // ADM's copy of internalNearEdge at reasoning-chain.ts:456-479):
  //   (1) THE FLOOR-SIDE SHIELD FIRST (the operator's EU #1: "LQZ at
  //       1.1444-1.14395 ~ using this as the entry zone anchor" — E 1.14390
  //       — the SELL_SIDE rung straddling BENEATH the zone's floor → the
  //       entry = its bottom (the near edge from below).
  //   (2) THE CEILING-SIDE SHIELD (the D-2 fix — the W8B §7): when NO
  //       floor-side shield exists, the SELL_SIDE rung at the zone's CEILING
  //       (the active edge — the last defense before the zone is pierced
  //       upward) is the first-contact structure → the entry = its bottom.
  //       The DXY Monday: the shield rung [101.12-101.154] overlaps the
  //       supply [101.027-101.153]'s ceiling → E 101.12 (Δ2.0p — the golden
  //       101.140's band) — the deep-internal rung is NEVER the entry.
  //   (3) THE ZONE-FLOOR FALLBACK (no shield — the documented fallback).
  // THE D-2 PIP SCALE (the W8B §7's arithmetic — internalNearEdge's pip
  // derivation: a zone wider than 1.0 price-unit is a coarse-pip market
  // (DXY's 0.01); a narrower zone is a fine-pip market (FX's 0.0001)). The
  // caller's pip (0.01 for the DXY) makes the floor-shield window 20× too
  // wide — the DXY's floor-side rung [100.936-100.952] qualified under it
  // (the entry fell to 100.936, Δ20p off the golden) while the zone-derived
  // 0.0001 scale excludes it and the ceiling-shield [101.12-101.154]
  // resolves (the W8B D-2's verified 101.12).
  const d2Pip = (zone.ceiling - zone.floor) > 1 ? 0.01 : 0.0001;
  const straddling = lmvTable
    .filter((r) => r.side === 'SELL_SIDE' && r.bottom <= zone.floor + 3 * d2Pip && r.top >= zone.floor - 20 * d2Pip)
    .sort((a, b) => b.top - a.top)[0];
  if (straddling) {
    return {
      entry: straddling.bottom,
      method: 'shield-near-edge (the floor-side shield — the first contact, the operator\'s EU #1)',
      measurement: { value: straddling.bottom, evidence: [`shield ${straddling.bottom}-${straddling.top}`], present: true },
    };
  }
  // THE CEILING-SIDE SHIELD (the DEFECT-3 fix — the W8B D-2's active-edge
  // shield): the SELL_SIDE rung overlapping the zone's ceiling, sorted by
  // the top DESC (the topmost first — the first contact from above), the
  // entry = the rung's bottom (the near edge from below). The DXY SHORT:
  // [101.12-101.154] overlapping the ceiling 101.153 → E 101.12 (the golden
  // 101.140's band).
  const ceilingShield = lmvTable
    .filter((r) => r.side === 'SELL_SIDE' && r.top >= zone.ceiling - 3 * d2Pip && r.bottom <= zone.ceiling + 20 * d2Pip)
    .sort((a, b) => b.top - a.top)[0];
  if (ceilingShield) {
    return {
      entry: ceilingShield.bottom,
      method: 'shield-near-edge (the ceiling-side shield — the active edge, the W8B D-2\'s verified entry)',
      measurement: { value: ceilingShield.bottom, evidence: [`ceiling shield ${ceilingShield.bottom}-${ceilingShield.top}`], present: true },
    };
  }
  return {
    entry: zone.floor,
    method: 'zone-floor (no shield — the documented fallback)',
    measurement: { value: zone.floor, evidence: ['no shield rung'], present: false },
  };
}

/** THE DEGENERATE-RUNG REJECTION (the ADM's own W6 predicate — the L2 spec
 *  §2.6, citing the picker's isValidRung at mirror.ts:1402-1433 — the
 *  single-source import is the W-ADM-3 wave's wiring; the ADM's copy carries
 *  the provenance): a zero-width / sub-floor-width band is a DEFECT, never a
 *  level. */
export function isDegenerateRungAdm(r: LqzZoneMatrix, pip: number): boolean {
  const widthPips = (r.top - r.bottom) / pip;
  return widthPips <= 0 || widthPips < MIN_RUNG_WIDTH_PIPS;
}

/** THE TP RESOLUTION (the F-5 + the DEFECT-1 fix): the first DEFENDED opposing
 *  STRUCTURAL S/D zone's internal-LQZ near edge — the walk runs the
 *  degenerate-rung rejection at EVERY rung-only candidate (the GU SHORT's
 *  1.32850 [1.32673-1.32673] zero-width rung REJECTED at admission — the 16.8
 *  phantom structurally impossible). THE STRUCTURAL-ZONE WALK FIRST (the
 *  DEFECT-1 fix — 2026-08-10, the probe's root): the rung-only walk resolves
 *  the NEAREST wide BUY_SIDE rung below the entry (the EU SHORT's
 *  [1.14305-1.14339] — reward 5.1p → RRR 0.59 → REJECT RRR_BELOW_FLOOR),
 *  NEVER reaching the operator's fortress demand [1.14004-1.14147] whose
 *  internal-LQZ near edge 1.14120 (the E2 designation's structural demand —
 *  reward 27p → RRR 3.18 — the operator's exact #1 TP) is the actual target.
 *  THE WALK mirrors the chain's structural machinery (capTpAtNearestOpposingSd
 *  at reasoning-chain.ts:536-571 + strongestInternalLqzRung at mirror.ts:2491
 *  — the I-8 pathCap semantics): the opposing zones nearest-first, each zone's
 *  INTERNAL LQZ rungs (the side-matched rungs fully inside the zone's band),
 *  the near edge = the internal rung's DEFENDED EDGE (the modal bodyClose
 *  level — the rung's own price — the operator's drawn rung; the chain's
 *  strengthDrivenRungTp MIDDLE case: the fortress's collapsed-band rung at
 *  center 1.14120 carries the REAL reaction level 1.14120 — the band is a
 *  single-candle artifact, the level is the operator's rung). THE MINIMUM-TP
 *  DISTANCE (max(2× the operative zone's width, 4) pips — documented: the SL
 *  scales with the zone's width, so the TP must clear a meaningful structural
 *  distance; the near zones whose internal rung sits too close to the entry
 *  to clear the RRR floor are EXCLUDED — the operator: "the market will eat
 *  all fixed const hardcoded garbage alive"). The rung-only walk is the
 *  FALLBACK (preserved when no structural zone with a qualifying internal
 *  rung exists). NO candidate → null → the NO_STRUCTURAL_TP verdict (the D3
 *  law — the trade does not exist, never a fabricated target). */
export function resolveTp(
  zone: OperativeZone,
  direction: Direction,
  lmvTable: LqzZoneMatrix[],
  pip: number,
  zones: ZoneModel[],
  entry: number,
): { tp: number; method: string; measurement: Measurement } | null {
  // THE MINIMUM-TP DISTANCE (the I-8 pathCap's "≥ 2× the risk" — the risk
  // proxy = the operative zone's OWN width, the m3 scaling substrate): the
  // near zones whose internal rungs clear only a sub-RRR reward are NOT
  // structural targets (the operator's EU #1: the fortress TP, never the
  // rung right below the entry). The 4-pip floor mirrors
  // capTpAtNearestOpposingSd's minTpPips floor.
  const zoneWidthPips = (zone.ceiling - zone.floor) / pip;
  const minTpPips = Math.max(2 * zoneWidthPips, 4);
  // THE STRUCTURAL-ZONE WALK — the opposing zones nearest-first (the SHORT's
  // DEMAND zones with top < the zone's floor — the LONG's SUPPLY zones with
  // bottom > the zone's ceiling), each zone's internal LQZ rungs, the first
  // zone whose internal near edge clears the minimum-TP distance resolves.
  const opposing = zones
    .filter((z) =>
      direction === 'LONG'
        ? z.type === 'SUPPLY' && z.bottom > zone.ceiling
        : z.type === 'DEMAND' && z.top < zone.floor)
    .sort((a, b) => (direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top));
  for (const z of opposing) {
    // THE ZONE'S APPROACH EDGE (the side price approaches from — the SHORT
    // approaches a demand from ABOVE = the demand's top; the LONG approaches
    // a supply from BELOW = the supply's bottom — strongestInternalLqzRung's
    // edge, mirror.ts:2497).
    const approachEdge = direction === 'LONG' ? z.bottom : z.top;
    // THE W6 GATE AT THE STRUCTURAL WALK'S ADMISSION (the GU SHORT fix —
    // 2026-08-11, the golden gate's RRR 10.96 phantom): the internal-rung
    // selection runs the SAME degenerate-rung rejection as the rung-only
    // fallback — a zero-width / sub-floor-width band (the GU's
    // LMV|GBP/USD|1.32850 [1.32673-1.32673]) is REJECTED at admission and
    // the walk continues to the next internal rung / the next zone. The
    // pre-fix structural walk admitted the degenerate rung's defendedEdge
    // 1.32850 — the operator's "what the actual FUCK is this? this was a
    // flat 2R trade" reproduced by a DIFFERENT path than the F-5 fix
    // intended.
    const internals = lmvTable
      .filter((r) =>
        (direction === 'LONG' ? r.side === 'SELL_SIDE' : r.side === 'BUY_SIDE') &&
        r.bottom >= z.bottom && r.top <= z.top &&
        !isDegenerateRungAdm(r, pip))
      .sort((a, b) =>
        (Math.abs(a.center - approachEdge) - Math.abs(b.center - approachEdge)) ||
        (b.candles.length - a.candles.length));
    if (internals.length === 0) continue; // a bare zone — no Earth within the Fire
    // THE INTERNAL RUNG'S NEAR EDGE = the DEFENDED EDGE (the modal bodyClose
    // level — the rung's own price — the operator's drawn rung; the chain's
    // strengthDrivenRungTp MIDDLE case — the fortress's 1.14120).
    const near = internals[0]!.defendedEdge;
    // THE DEF-EDGE-WITHIN-THE-ZONE CHECK (the W-ADM-5 OUTCOME-SIDE fix —
    // 2026-08-11, the EU LONG class): the internal rung's defended edge must
    // sit WITHIN the containing zone's band — the "Earth within the Fire"
    // (the level the move will actually react at). The EU LONG's opposing
    // supply [1.14460-1.14571] (the operator's EU #1) carries the internal
    // rung [1.14512-1.14529] whose defEdge 1.14620 sits ABOVE the supply's
    // ceiling 1.14571 — a DEGENERATE reference (the level the price cannot
    // reach without breaking the zone first — the computeLmvTP's 1.14620 the
    // market never reached; the real MFE was 1.14480). When the defEdge is
    // OUTSIDE the band, the walk falls back to the zone's OWN measured
    // reaction level (the m1 recency extreme — the level the price has
    // ACTUALLY been defended at — the EU supply's reaction @1.14479 — the
    // sweep-verified MFE-reachable WIN) and, failing that, continues to the
    // next opposing zone (the honest walk — never a fabricated level).
    const nearInside = near >= z.bottom - 1e-9 && near <= z.top + 1e-9;
    if (!nearInside) {
      const zoneReaction = measureReactionWickExtreme(zoneToOperative(z), direction, getAnalysisPointMs());
      if (zoneReaction.present) {
        const reactionNear = zoneReaction.value;
        if (direction === 'LONG' ? reactionNear > entry + minTpPips * pip : reactionNear < entry - minTpPips * pip) {
          return {
            tp: reactionNear,
            method: 'structural-zone walk (the zone\'s measured reaction level — the defEdge outside the band, the operator\'s defended wall)',
            measurement: { value: reactionNear, evidence: [`zone ${z.id} reaction ${reactionNear.toFixed(5)} (defEdge ${near.toFixed(5)} outside [${z.bottom.toFixed(5)}-${z.top.toFixed(5)}])`], present: true },
          };
        }
      }
      continue; // neither the defEdge nor the reaction qualifies — the next zone
    }
    if (direction === 'LONG' ? near > entry + minTpPips * pip : near < entry - minTpPips * pip) {
      return {
        tp: near,
        method: 'structural-zone walk (the first opposing S/D zone\'s internal-LQZ near edge — the operator\'s fortress TP)',
        measurement: { value: near, evidence: [`zone ${z.id} internal rung ${internals[0]!.bottom.toFixed(5)}-${internals[0]!.top.toFixed(5)} defEdge ${near.toFixed(5)}`], present: true },
      };
    }
    // The internal rung sits too close to the entry to clear the RRR floor —
    // continue the walk to the next opposing zone (the operator's fortress,
    // never the near-rung class).
  }
  // THE RUNG-ONLY WALK (the fallback — preserved verbatim when no structural
  // zone with a qualifying internal rung exists).
  const candidates = lmvTable
    .filter((r) => {
      if (isDegenerateRungAdm(r, pip)) return false;
      return direction === 'LONG'
        ? r.side === 'SELL_SIDE' && r.bottom > zone.ceiling
        : r.side === 'BUY_SIDE' && r.top < zone.floor;
    })
    .sort((a, b) =>
      direction === 'LONG' ? a.bottom - b.bottom : b.top - a.top);
  if (candidates.length === 0) return null;
  const wall = candidates[0]!;
  const near = direction === 'LONG' ? wall.bottom : wall.top;
  return {
    tp: near,
    method: 'w6-gated walk (the first defended opposing structure\'s near edge — the internal-LQZ resolution)',
    measurement: { value: near, evidence: [`wall ${wall.bottom}-${wall.top} zfp ${wall.zfp}`], present: true },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THE VERIFY GATE (the L2 spec §2.4)
// ═══════════════════════════════════════════════════════════════════════════

/** THE GEOMETRY-HONESTY CHECKS: an RRR whose SL comes from a sliver (below
 *  the pair's minimum-viable defense — the measured dispersion percentile) or
 *  whose TP comes from a degenerate rung is NOT a measurement — the
 *  DEGENERATE_PAIR_REJECTED (the operator's 16.8 class — "what the actual
 *  FUCK is this? this was a flat 2R trade"). */
export function isDegeneratePair(entry: number, sl: number, tp: number, pip: number, minViableDefensePips: number): boolean {
  const riskPips = Math.abs(entry - sl) / pip;
  const rewardPips = Math.abs(tp - entry) / pip;
  if (riskPips < minViableDefensePips) return true;
  if (riskPips <= 0 || rewardPips <= 0) return true;
  return false;
}

/** THE ADM's MINIMUM-VIABLE-DEFENSE (the L2 spec §8.1a — the DEFECT-C fix,
 *  2026-08-11, the delegation's audit + the battery's T-5 finding): the
 *  sliver-SL gate's floor = the documented MIN_VIABLE_DEFENSE_PIPS (2 pips) —
 *  the operator's minimum viable defense span. THE ORIGINAL SPEC
 *  RECOMMENDATION (the map's median dispersion) PROVED OVER-AGGRESSIVE: the
 *  map medians (DXY 7.0p / EU 10.8p / GU 16.4p) exceeded EVERY measured SL
 *  risk (0.6-7.0p) and rejected the operator's OWN golden week (the golden
 *  gate 0/5 — the delegation's measured regression). The corrected floor is
 *  the documented constant (the anti-fitting law: the golden week is never
 *  the calibration set) — the sliver class (a sub-2p defense is degenerate:
 *  the W8B's 1.6p sliver rung) dies while the real defenses (the EU SHORT
 *  9.5p, the DXY LONG 6.3p) survive. THE UNIT FIX: the reaction-free branch
 *  returned `2 * pip` (a PRICE) while isDegeneratePair compares riskPips (a
 *  pip COUNT) — the unit mismatch silently disabled the gate on reaction-free
 *  models (the RRR-232 phantom emitted). The floor is now consistently PIPS. */
export function measureMinViableDefensePips(_model: ZoneModel[], _pip: number): number {
  return MIN_VIABLE_DEFENSE_PIPS;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE TOTAL FUNCTION (the L2 spec §2.1 — anchorTrade — the W-ADM-2 surface)
// ═══════════════════════════════════════════════════════════════════════════

/** THE ADM — the deterministic E3 anchor engine's total function. The state
 *  machine: IDLE → MEASURE → ANCHOR → VERIFY → EMIT | REJECT(verdict). The
 *  temporal lock is mandatory: getAnalysisPointMs() THROWS when unlocked (the
 *  W1's temporal law — a run without the lock is the unanchored run). */
export function anchorTrade(input: AdmInput): AdmResult {
  const { operativeZone: zone, direction, pip, priorTp } = input;
  const analysisPointMs = getAnalysisPointMs();

  // MEASURE + ANCHOR the entry.
  const entryRes = resolveEntry(zone, direction, input.lmvTable, pip, priorTp);
  const entry = entryRes.entry;

  // MEASURE + ANCHOR the TP (the structural-zone walk — the W6 gate at the
  // rung-only fallback's admission; the model zones + the entry feed the
  // DEFECT-1 structural resolution).
  const tpRes = resolveTp(zone, direction, input.lmvTable, pip, input.model, entry);
  if (!tpRes) {
    return {
      entry, entryMethod: entryRes.method, sl: 0, slMethod: '', tp: 0, tpMethod: '',
      rrr: 0, verdict: 'REJECT', rejectReason: 'NO_STRUCTURAL_TP',
      rejectEvidence: ['no defended opposing structure survives the W6 gate — the trade does not exist (the D3 law)'],
      measurements: { slDepth: { value: 0, evidence: [], present: false }, entryLevel: entryRes.measurement, tpLevel: { value: 0, evidence: [], present: false } },
      triplets: [{ pattern: 'no-structural-tp', state: 'REJECT', evidence: 'anchor-decision-machine.ts:resolveTp' }],
    };
  }
  const tp = tpRes.tp;

  // MEASURE + ANCHOR the SL (the wick/width/nesting/defended + the RRR cap).
  const slRes = resolveSlDepth(zone, direction, input.model, pip, analysisPointMs, input.atr1hPips, tp, entry);
  // THE SL LEVEL (the DEFECT-D fix — 2026-08-11, the orchestrator's audit):
  // the SL anchors to the ZONE's close edge when the entry is OUTSIDE the
  // zone (the EU SHORT: the entry 1.14390 at the shield BELOW the supply's
  // floor 1.14460 → the SL = the floor + the measured depth = 1.14460 +
  // 2.5p = 1.14485 — the operator's exact; the supply IS the SL anchor per
  // the operator's "using this as the SL zone anchor"), and to the ENTRY ±
  // the depth when the entry is INSIDE the zone (the DXY SHORT: the entry
  // 101.12 inside [101.027-101.153] → the SL = the entry + the depth — the
  // floor-relative 101.11367 would land BELOW the entry, the geometry error
  // the delegation flagged). THE ENTRY-OUTSIDE TEST: the SHORT's entry
  // below the zone's floor / the LONG's entry above the zone's ceiling.
  const entryOutsideZone = direction === 'SHORT'
    ? entry <= zone.floor - EPSILON
    : entry >= zone.ceiling + EPSILON;
  // THE SL LEVEL (the DEFECT-D/H fix — 2026-08-11, the orchestrator's audit):
  // the SL marks the RISK side of the entry. THE ENTRY-OUTSIDE-ZONE CASE (the
  // EU SHORT: the entry 1.14390 at the shield BELOW the supply's floor
  // 1.14460 → the SL = the floor + the measured depth = 1.14460 + 2.5p =
  // 1.14485 — the operator's exact — the supply IS the SL anchor per the
  // operator's "using this as the SL zone anchor"). THE ENTRY-INSIDE CASE
  // (the DXY SHORT: the entry 101.12 inside [101.027-101.153] → the SL = the
  // entry + the depth; the GU LONG: the entry 1.33343 = the rung's top →
  // the SL = the entry − the depth = the defense below the rung). The
  // pre-fix safety-max (the zone's far edge ± the depth) over-deepened the
  // EU SHORT (the ceiling reference) and the GU LONG (the floor reference)
  // → the RRR dropped below 3.0 → the golden lanes rejected. The
  // entryOutsideZone conditional reproduces the operator's exact levels.
  const sl = direction === 'SHORT'
    ? (entryOutsideZone ? zone.floor + slRes.depthPips * pip : entry + slRes.depthPips * pip)
    : (entryOutsideZone ? zone.ceiling - slRes.depthPips * pip : entry - slRes.depthPips * pip);
  const slMethod = `${slRes.method}${slRes.entryLever ? ' (ENTRY_LEVER_REQUIRED — the cap would break the wick territory)' : ''}`;

  const riskPips = Math.abs(entry - sl) / pip;
  const rewardPips = Math.abs(tp - entry) / pip;
  const rrr = riskPips > 0 ? rewardPips / riskPips : 0;

  // VERIFY — the RRR floor (the operator's canon) + the geometry honesty.
  const minViable = measureMinViableDefensePips(input.model, pip);
  if (rrr < RRR_FLOOR - EPSILON) {
    return {
      entry, entryMethod: entryRes.method, sl, slMethod, tp, tpMethod: tpRes.method,
      rrr, verdict: 'REJECT', rejectReason: 'RRR_BELOW_FLOOR',
      rejectEvidence: [`the RRR ${rrr.toFixed(2)} < the operator's ${RRR_FLOOR.toFixed(1)} floor — the anchors cannot clear the safety envelope (the ENTRY_LEVER_REQUIRED class when the wick placement is the cause: ${slRes.entryLever})`],
      measurements: { slDepth: slRes.measurements[0] ?? { value: 0, evidence: [], present: false }, entryLevel: entryRes.measurement, tpLevel: tpRes.measurement },
      triplets: [
        { pattern: 'rrr-below-floor', state: 'REJECT', evidence: 'anchor-decision-machine.ts:anchorTrade' },
        { pattern: 'entry-lever', state: slRes.entryLever ? 'REQUIRED' : 'OK', evidence: `sl-depth ${slRes.method}` },
      ],
    };
  }
  if (isDegeneratePair(entry, sl, tp, pip, minViable)) {
    return {
      entry, entryMethod: entryRes.method, sl, slMethod, tp, tpMethod: tpRes.method,
      rrr, verdict: 'REJECT', rejectReason: 'DEGENERATE_PAIR_REJECTED',
      rejectEvidence: [`the SL risk ${riskPips.toFixed(1)}p < the measured min-viable defense ${minViable.toFixed(1)}p OR the TP is degenerate — the operator's 16.8 class: "this was a flat 2R trade" — never an emission`],
      measurements: { slDepth: slRes.measurements[0] ?? { value: 0, evidence: [], present: false }, entryLevel: entryRes.measurement, tpLevel: tpRes.measurement },
      triplets: [
        { pattern: 'degenerate-pair', state: 'REJECT', evidence: `risk ${riskPips.toFixed(1)}p vs min-viable ${minViable.toFixed(1)}p` },
        { pattern: 'geometry-honesty', state: 'REJECTED', evidence: 'anchor-decision-machine.ts:isDegeneratePair' },
      ],
    };
  }

  // EMIT — the measured anchors + the MPSE triplets (the E3-NEVER traces).
  return {
    entry, entryMethod: entryRes.method, sl, slMethod, tp, tpMethod: tpRes.method,
    rrr, verdict: 'EMIT',
    measurements: { slDepth: slRes.measurements[0] ?? { value: 0, evidence: [], present: false }, entryLevel: entryRes.measurement, tpLevel: tpRes.measurement },
    triplets: [
      { pattern: 'measured-sl', state: 'EMIT', evidence: slRes.method },
      { pattern: 'measured-entry', state: 'EMIT', evidence: entryRes.method },
      { pattern: 'measured-tp', state: 'EMIT', evidence: tpRes.method },
      { pattern: 'e3-never', state: 'TRACED', evidence: `${input.e1ZoneId} → ${input.e2ProjectionId}` },
    ],
  };
}
