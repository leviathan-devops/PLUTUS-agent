/**
 * Storyline Engine — Wave ZR-2A (the E2 narrative on the E1 pressure).
 *
 * ═══════════════════════════════════════════════════════════════
 * THE ARCHITECTURE: E1 (the zone map + the pressure state) PROVIDES THE
 * STRUCTURE → E2 (the shape chain + THE STORYLINE) BUILDS ON E1 → E3
 * (the setups) fits within. This module is E2's narrative layer: it READS
 * the E1 pressure (zone.pressure — ZR-1, frozen) + the E2 chain (the
 * ZFP-conditioned canon) and produces the macro NARRATIVE. It NEVER
 * changes the chain's shapes, NEVER selects zones, NEVER computes E/SL/TP.
 *
 * The operator's doctrine (PLUTUS_E1_E2_E3_MACRO_CONTEXT Part 2/16/23):
 *   "SPECIFICALLY HOW I AM LOOKING AT E1 PRESSURE MECHANICS ON ZONES AND
 *    HOW I AM USING E2 SHAPE CHAIN MECHANICS TO FORM THE STORYLINE
 *    NARRATIVE ON TOP OF THE E1 PRESSURE MECHANICS ... YOU WILL NOT HAVE
 *    'WATER ELEMENT' FLOW IF THIS IS FUCKED."
 *
 * The 7 components per day (Part 16.2):
 *   1. the current shape
 *   2. the contested zone's pressure state
 *   3. the projected next shape (the E1-pressure-driven transition)
 *   4. the break-of-structure validation
 *   5. the bullish-vs-bearish strength comparison
 *   6. the macro arc
 *   7. the warframe arc
 *
 * Determinism: no wall-clock, no Math.random, sorted/positional iteration —
 * same inputs → byte-identical storyline.
 * ═══════════════════════════════════════════════════════════════
 */

import type {
  ChartModel,
  ZoneLifecycle,
  ZoneModel,
} from '../mdve/types.js';
import type { PriorWeekStoryline } from '../mdve/prior-week-preflight.js';
import {
  ShapeCode,
  type DayShapePrediction,
  type OHLCBar,
  type ShapePrediction,
} from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// THE CONTRACT TYPES (VERBATIM — the parallel agents code against these)
// ═══════════════════════════════════════════════════════════════════════════════

/** The contested zone's pressure read (component 2 — the zone the battle is at). */
export interface ContestedZoneRead {
  zoneId: string;
  band: [number, number];
  classification: 'BoM' | 'MoM';
  lifecycle: ZoneLifecycle;              // from mdve/types.js
  mitigationCount: number;
  absorption: 'INTACT' | 'ABSORBED';
  /** The layer-evidenced prose — "the MoM DEMAND [1.14004-1.14090], 7 battles,
   *  BROKEN lifecycle, absorption ABSORBED (the nested LQZ eaten 2026-07-08T16:00Z)". */
  summary: string;
}

/** The break-of-structure validation (component 4 — the E1 pressure validates
 *  the break BEFORE the E2 shape respects it). */
export interface BreakValidation {
  claimedBreak: boolean;
  zoneId?: string;
  /** The E1 verdict: the allegedly-broken zone is ACTUALLY broken (pierced
   *  with a battle — lifecycle BROKEN). */
  validated: boolean;
  verdict: 'CLEAN_BREAK' | 'FALSE_POSITIVE' | 'NOT_A_BREAK_CLAIM';
  /** The mechanical reason — layer-evidenced, quoting the operator's false-positive doctrine when applicable. */
  reason: string;
}

/** The bullish-vs-bearish strength comparison (component 5). */
export interface StrengthComparison {
  bullishPips: number;
  bearishPips: number;
  verdict: 'BULLISH_STRONGER' | 'BEARISH_STRONGER' | 'BALANCED';
  /** "the Bearish BS from Tuesday (65.3p) was extremely weak compared to the
   *  Bullish BS from Thursday (112.1p) — bullish pressure definitively stronger" */
  reason: string;
}

/** The warframe arc phase (component 7). */
export type WarframePhase = 'TRENCHES' | 'ZOC_CONTEST' | 'BREAKTHROUGH' | 'COUNTER_ATTACK' | 'STABILIZATION';

/** The per-day storyline (the 7 components). */
export interface DayStoryline {
  day: string;                            // 'Monday'..'Friday'
  shape: ShapeCode;
  contestedZone?: ContestedZoneRead;      // the day's keyZoneId resolved
  projectedNext: { shape: ShapeCode; trigger: string; confidence: number };
  breakValidation?: BreakValidation;      // present on BS/PBS days
  strengthComparison?: StrengthComparison; // the week's comparison (attached per day for convenience)
  warframeArc: WarframePhase;
  /** The operator-style narrative paragraph — assembled from the computed
   *  fields (the structure of the operator's reasoning, never invented facts). */
  narrative: string;
}

/** The week's storyline. */
export interface WeekStoryline {
  pair: string;
  macroArc: {
    sweepOriginPrice?: number;
    rangeTop: number; rangeBottom: number;
    defendedZones: number; brokenZones: number;
    summary: string;
  };
  strengthComparison: StrengthComparison;
  warframePhase: WarframePhase;           // the week's current phase (the latest day's)
  days: DayStoryline[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS (deterministic primitives)
// ═══════════════════════════════════════════════════════════════════════════════

/** The pair's pip size (JPY quote pairs trade in 0.01 pips; indices without a
 *  '/' — DXY — read in 0.01 points; all else 0.0001). This keeps the strength
 *  magnitudes in the operator's "65.3p" convention across FX and the index. */
function pipSizeFor(pair: string): number {
  if (!pair.includes('/')) return 0.01;
  return pair.includes('JPY') ? 0.01 : 0.0001;
}

/** The weekday name from a candle timestamp (UTC — deterministic, no locale). */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
function weekdayOf(ms: number): string {
  return WEEKDAYS[new Date(ms).getUTCDay()]!;
}

/** The price band formatted to the contract's 5-decimal evidence style. */
function fmtBand(bottom: number, top: number): string {
  return `[${bottom.toFixed(5)}-${top.toFixed(5)}]`;
}

/** The day's direction normalized: the DayShapePrediction field carries
 *  'UP'|'DOWN'|'RANGE'|'NEUTRAL'; the contract vocabulary uses LONG/SHORT. */
type Direction = 'BULLISH' | 'BEARISH' | null;
function directionOf(day: DayShapePrediction): Direction {
  const d = (day.direction ?? '').toUpperCase();
  if (d === 'UP' || d === 'LONG') return 'BULLISH';
  if (d === 'DOWN' || d === 'SHORT') return 'BEARISH';
  return null;
}

/** S/D zones only — the LMV bridge rungs ('LMV|…' ids) are touch-granular
 *  liquidity data (lifecycle 'VIRGIN' by convention), never the structure a
 *  break-of-structure claim is validated against. */
function isStructuralZone(z: ZoneModel): boolean {
  return !z.id.startsWith('LMV|');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 1 — THE CONTESTED ZONE READ (component 2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve the day's contested zone + summarize its pressure state.
 * Resolution order (the contract): keyZoneId → direction-typed fallback
 * (SHORT/BEARISH → supplyZoneId, LONG/BULLISH → demandZoneId) → honest absence.
 * The read TRACES to zone.pressure (stamped by ZR-1) — never recomputed.
 */
function readContestedZone(model: ChartModel, day: DayShapePrediction): ContestedZoneRead | undefined {
  const byId = new Map(model.zones.map((z) => [z.id, z]));
  let zone: ZoneModel | undefined = day.keyZoneId ? byId.get(day.keyZoneId) : undefined;
  if (!zone) {
    const dir = directionOf(day);
    const fallbackId = dir === 'BEARISH' ? day.supplyZoneId
      : dir === 'BULLISH' ? day.demandZoneId
      : undefined;
    if (fallbackId) zone = byId.get(fallbackId);
  }
  if (!zone) return undefined; // honest absence — no contested zone read

  const p = zone.pressure;
  const mitigationCount = p?.mitigationCount ?? zone.reactionEvents.length;
  const lifecycle: ZoneLifecycle = p?.lifecycle ?? 'VIRGIN';
  const absorption: 'INTACT' | 'ABSORBED' = p?.absorption ?? 'INTACT';

  // The eaten-fuel evidence: the first eaten NESTED link's consumption stamp.
  const eatenNested = p?.liquidity.find((l) => l.kind === 'NESTED' && l.eaten && l.eatenAtMs != null);
  const eatenClause = eatenNested
    ? ` (the nested LQZ eaten ${new Date(eatenNested.eatenAtMs!).toISOString().replace('.000Z', 'Z')})`
    : '';

  const summary =
    `the ${zone.classification} ${zone.type} ${fmtBand(zone.bottom, zone.top)}, ` +
    `${mitigationCount} battles, ${lifecycle} lifecycle, absorption ${absorption}${eatenClause}`;

  return {
    zoneId: zone.id,
    band: [zone.bottom, zone.top],
    classification: zone.classification,
    lifecycle,
    mitigationCount,
    absorption,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 2 — THE PROJECTED NEXT SHAPE (component 3 — the reaction-count trigger)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The projected next shape = the chain's own next shape (the ZFP-conditioned
 * canon — UNCHANGED). The trigger TEXT narrates the contested zone's pressure
 * into the projection (the operator's Trade #4 / Trade #8 readings).
 */
function projectNext(
  chain: readonly ShapePrediction[],
  dayIndex: number,
  day: DayShapePrediction,
  contested: ContestedZoneRead | undefined,
): { shape: ShapeCode; trigger: string; confidence: number } {
  // Match the chain step for this day (by day name, else positional).
  let stepIdx = chain.findIndex((s) => s.day === day.day);
  if (stepIdx < 0) stepIdx = dayIndex < chain.length ? dayIndex : -1;
  const next = stepIdx >= 0 ? chain[stepIdx + 1] : undefined;
  const shape = next?.shape ?? day.shape;
  const confidence = next?.confidence ?? day.confidence;

  let trigger: string;
  if (!contested) {
    trigger = 'the chain transition (no contested zone read)';
  } else if (contested.lifecycle === 'FORTRESS') {
    trigger = `the contested zone is FORTRESS (${contested.mitigationCount} battles, zero pierces — "likely to become a fortress zone and NOT get pierced") → expect the RWL reversal`;
  } else if (contested.mitigationCount >= 3) {
    trigger = `the contested zone is ${contested.mitigationCount}x mitigated (${contested.lifecycle}) — "zones usually fail on the THIRD mitigation" — the next mitigation likely pierces`;
  } else if (contested.mitigationCount === 2) {
    trigger = `the contested zone is 2x mitigated (${contested.lifecycle}) — "zones usually fail on the THIRD mitigation" — a minor recovery is plausible, then the pierce on the next mitigation`;
  } else {
    trigger = `the contested zone is ${contested.mitigationCount}x mitigated (${contested.lifecycle}) — the chain's ZFP-conditioned transition`;
  }

  return { shape, trigger, confidence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 3 — THE BREAK-OF-STRUCTURE VALIDATION (component 4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * On BS/PBS days, validate the claimed structure break against the E1
 * pressure. The allegedly-broken zone = the nearest structural zone on the
 * broken side: bearish BS → the nearest DEMAND below the break origin;
 * bullish BS → the nearest SUPPLY above. validated ⟺ the zone is ACTUALLY
 * broken (lifecycle BROKEN or pierced with a battle). The verdict derives
 * from the zone's pressure — never from the shape.
 */
function validateBreak(model: ChartModel, day: DayShapePrediction): BreakValidation | undefined {
  if (day.shape !== ShapeCode.BS && day.shape !== ShapeCode.PBS) return undefined;

  // The direction: the day's explicit field, else inferred from the key
  // zone's type (breaking THROUGH a demand zone = the bearish break; through
  // a supply = the bullish break). Honest absence when neither resolves.
  let dir = directionOf(day);
  if (!dir && day.keyZoneId) {
    const key = model.zones.find((z) => z.id === day.keyZoneId);
    if (key) dir = key.type === 'DEMAND' ? 'BEARISH' : 'BULLISH';
  }
  if (!dir) {
    return {
      claimedBreak: true,
      validated: false,
      verdict: 'NOT_A_BREAK_CLAIM',
      reason: 'the break direction is unresolved (no direction field, no key zone type) — the break cannot be validated honestly',
    };
  }

  const origin = day.keyZonePrice ?? day.dayOpenSpot ?? model.spot;
  const candidates = model.zones
    .filter((z) => isStructuralZone(z))
    .filter((z) => (dir === 'BEARISH'
      ? z.type === 'DEMAND' && z.top < origin
      : z.type === 'SUPPLY' && z.bottom > origin));
  // Nearest on the broken side: bearish → the highest DEMAND top below the
  // origin; bullish → the lowest SUPPLY bottom above. Deterministic ties.
  candidates.sort((a, b) => dir === 'BEARISH'
    ? (b.top - a.top) || a.id.localeCompare(b.id)
    : (a.bottom - b.bottom) || a.id.localeCompare(b.id));
  const zone = candidates[0];

  if (!zone) {
    return {
      claimedBreak: true,
      validated: false,
      verdict: 'NOT_A_BREAK_CLAIM',
      reason: `no structural ${dir === 'BEARISH' ? 'DEMAND' : 'SUPPLY'} zone on the broken side of ${origin.toFixed(5)} — the break claim has no zone to validate against`,
    };
  }

  const p = zone.pressure;
  const mitigationCount = p?.mitigationCount ?? zone.reactionEvents.length;
  const validated = p?.lifecycle === 'BROKEN' || p?.pierced === true;
  const band = fmtBand(zone.bottom, zone.top);

  if (validated) {
    return {
      claimedBreak: true,
      zoneId: zone.id,
      validated: true,
      verdict: 'CLEAN_BREAK',
      reason: `the ${zone.classification} ${zone.type} ${band} is BROKEN (${mitigationCount} battles, pierced with a battle) — the structure break is clean`,
    };
  }
  return {
    claimedBreak: true,
    zoneId: zone.id,
    validated: false,
    verdict: 'FALSE_POSITIVE',
    reason: `the ${zone.classification} ${zone.type} ${band} though ${mitigationCount}x mitigated has still NOT been pierced — "this 'break of structure' could be a false positive as looking purely at E1 pressure mechanics, this ZONE has not yet been broken" — the macro structure is still ${zone.type === 'DEMAND' ? 'BULLISH' : 'BEARISH'} at the macro level`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 4 — THE STRENGTH COMPARISON (component 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The week's bullish-vs-bearish BS displacement from the bars: the LARGEST
 * single-direction run per side (the maximal cumulative close-to-close
 * displacement over a consecutive same-direction window of 2-8 bars), in
 * pips. verdict: ratio ≥ 1.5 → the stronger side; else BALANCED.
 * Deterministic: index-order scan, strict-greater max (first-max wins ties).
 */
function compareStrength(pair: string, bars: OHLCBar[]): StrengthComparison {
  const pip = pipSizeFor(pair);
  let bull = { pips: 0, ms: 0 };
  let bear = { pips: 0, ms: 0 };

  for (let i = 0; i + 1 < bars.length; i++) {
    const firstMove = bars[i + 1]!.close - bars[i]!.close;
    if (firstMove === 0) continue;
    const dir = Math.sign(firstMove);
    // Extend the same-direction window: bars i..j inclusive, 2..8 bars.
    for (let j = i + 1; j < bars.length && j - i + 1 <= 8; j++) {
      const move = bars[j]!.close - bars[j - 1]!.close;
      if (move === 0 || Math.sign(move) !== dir) break;
      const pips = Math.abs(bars[j]!.close - bars[i]!.close) / pip;
      if (dir > 0) {
        if (pips > bull.pips) bull = { pips, ms: bars[i]!.timestamp };
      } else {
        if (pips > bear.pips) bear = { pips, ms: bars[i]!.timestamp };
      }
    }
  }

  const bullishPips = Math.round(bull.pips * 10) / 10;
  const bearishPips = Math.round(bear.pips * 10) / 10;
  let verdict: StrengthComparison['verdict'] = 'BALANCED';
  if (bearishPips > 0 && bullishPips / bearishPips >= 1.5) verdict = 'BULLISH_STRONGER';
  else if (bullishPips > 0 && bearishPips / bullishPips >= 1.5) verdict = 'BEARISH_STRONGER';

  const bullDay = bull.ms ? weekdayOf(bull.ms) : 'n/a';
  const bearDay = bear.ms ? weekdayOf(bear.ms) : 'n/a';
  let reason: string;
  if (verdict === 'BALANCED') {
    reason = `the Bearish run from ${bearDay} (${bearishPips.toFixed(1)}p) vs the Bullish run from ${bullDay} (${bullishPips.toFixed(1)}p) — the pressure is balanced (ratio < 1.5)`;
  } else if (verdict === 'BULLISH_STRONGER') {
    reason = `the Bearish run from ${bearDay} (${bearishPips.toFixed(1)}p) was extremely weak compared to the Bullish run from ${bullDay} (${bullishPips.toFixed(1)}p) — bullish pressure definitively stronger`;
  } else {
    reason = `the Bullish run from ${bullDay} (${bullishPips.toFixed(1)}p) was extremely weak compared to the Bearish run from ${bearDay} (${bearishPips.toFixed(1)}p) — bearish pressure definitively stronger`;
  }

  return { bullishPips, bearishPips, verdict, reason };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 5 — THE WARFRAME ARC (component 7)
// ═══════════════════════════════════════════════════════════════════════════════

/** The shape → warframe phase map (the doctrine: zones=positions,
 *  shapes=phases — the war timeline). */
function warframePhaseOf(shape: ShapeCode): WarframePhase {
  switch (shape) {
    case ShapeCode.SS:
    case ShapeCode.DWL:   // the dead-whales drift — no army commits; the trenches hold
      return 'TRENCHES';
    case ShapeCode.WLS:
    case ShapeCode.STORM: // SS + delayed whiplash — the contested skirmish
      return 'ZOC_CONTEST';
    case ShapeCode.BS:
    case ShapeCode.PBS:
      return 'BREAKTHROUGH';
    case ShapeCode.WL:
    case ShapeCode.RWL:
    case ShapeCode.PRWL:
    case ShapeCode.PWL:   // the piercing whiplash — the counter-attack with reach
      return 'COUNTER_ATTACK';
    case ShapeCode.R:
    case ShapeCode.RS:
      return 'STABILIZATION';
    default:
      return 'TRENCHES';
  }
}

/** The phase prose (the warframe vocabulary, Part 2.3/2.5). */
function warframeProse(phase: WarframePhase): string {
  switch (phase) {
    case 'TRENCHES': return 'the trench-clearing — the candles eat the LQZ rungs';
    case 'ZOC_CONTEST': return "the contested storm before the ZoC's resolution";
    case 'BREAKTHROUGH': return 'the front line broken — the surge';
    case 'COUNTER_ATTACK': return 'the counter-attack — the defending army strikes back';
    case 'STABILIZATION': return 'the new defensive line — stabilization';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 6 — THE MACRO ARC (component 6)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The week's macro arc from the prior-week storyline (the 2-week pressure
 * narrative). Honest absence when priorStoryline is null. The range falls
 * back to the current model's narrative range only when the prior window
 * carried none (sourced, never invented).
 */
function computeMacroArc(
  model: ChartModel,
  priorStoryline: PriorWeekStoryline | null,
): WeekStoryline['macroArc'] {
  if (!priorStoryline) {
    return {
      sweepOriginPrice: undefined,
      rangeTop: model.narrative.rangeTop?.price ?? 0,
      rangeBottom: model.narrative.rangeBottom?.price ?? 0,
      defendedZones: 0,
      brokenZones: 0,
      summary: 'no prior-week storyline — the week opens without the 2-week macro arc (honest absence)',
    };
  }
  const defended = priorStoryline.defendedZones.filter((z) => z.status === 'DEFENDED').length;
  const broken = priorStoryline.defendedZones.filter((z) => z.status === 'BROKEN').length;
  const sweepOriginPrice = priorStoryline.sweepOrigin?.price;
  const rangeTop = priorStoryline.rangeTop?.price ?? model.narrative.rangeTop?.price ?? 0;
  const rangeBottom = priorStoryline.rangeBottom?.price ?? model.narrative.rangeBottom?.price ?? 0;
  const sweepText = sweepOriginPrice != null ? `${sweepOriginPrice.toFixed(5)}` : 'none (honest absence)';
  return {
    sweepOriginPrice,
    rangeTop,
    rangeBottom,
    defendedZones: defended,
    brokenZones: broken,
    summary: `the prior week's storyline: the sweep origin ${sweepText}, the range [${rangeBottom.toFixed(5)}-${rangeTop.toFixed(5)}], ${defended} defended zones, ${broken} broken — the macro context the week opens into`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TASK 7 — THE PER-DAY NARRATIVE + THE ASSEMBLY
// ═══════════════════════════════════════════════════════════════════════════════

/** The operator-style narrative paragraph — assembled from the computed
 *  fields (the STRUCTURE of the operator's reasoning, never invented facts). */
function composeNarrative(
  day: DayShapePrediction,
  direction: Direction,
  contested: ContestedZoneRead | undefined,
  projected: { shape: ShapeCode; trigger: string; confidence: number },
  breakValidation: BreakValidation | undefined,
  phase: WarframePhase,
  macroArcSummary: string,
  strength: StrengthComparison,
): string {
  const dirText = direction ?? (day.direction ?? 'UNRESOLVED');
  const sentences: string[] = [`${day.day}: ${day.shape} (${dirText}).`];
  if (contested) {
    sentences.push(
      `The contested ${contested.classification} ${zoneTypeWord(day)} ${fmtBand(contested.band[0], contested.band[1])} is ` +
      `${contested.mitigationCount}x mitigated (${contested.lifecycle}, absorption ${contested.absorption}).`,
    );
  } else {
    sentences.push('No contested zone read (honest absence).');
  }
  sentences.push(`${capitalize(projected.trigger)}.`);
  if (breakValidation && breakValidation.verdict !== 'NOT_A_BREAK_CLAIM') {
    sentences.push(`${capitalize(breakValidation.reason)}.`);
  }
  sentences.push(`The warframe: ${phase} — ${warframeProse(phase)}.`);
  if (day.day === 'Monday') sentences.push(`${capitalize(macroArcSummary)}.`);
  if (strength.verdict !== 'BALANCED') sentences.push(`${capitalize(strength.reason)}.`);
  return sentences.join(' ');
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** The zone type word for the narrative (SUPPLY/DEMAND from the resolved
 *  contested zone's day designation fields — best-effort, mechanical). */
function zoneTypeWord(day: DayShapePrediction): string {
  const t = (day.keyZoneType ?? '').toUpperCase();
  if (t.includes('SUPPLY')) return 'SUPPLY';
  if (t.includes('DEMAND')) return 'DEMAND';
  const dir = directionOf(day);
  if (dir === 'BEARISH') return 'SUPPLY';
  if (dir === 'BULLISH') return 'DEMAND';
  return 'ZONE';
}

/**
 * computeWeekStoryline — the E2 storyline engine's total function.
 * Assembles the 7 components per day + the week's macro arc, strength
 * comparison, and current warframe phase. READS the E1 pressure + the E2
 * chain; never mutates either. Deterministic: same inputs → byte-identical
 * storyline.
 */
export function computeWeekStoryline(
  model: ChartModel,
  chain: readonly ShapePrediction[],
  days: readonly DayShapePrediction[],
  priorStoryline: PriorWeekStoryline | null,
  bars: OHLCBar[],
): WeekStoryline {
  const macroArc = computeMacroArc(model, priorStoryline);
  const strength = compareStrength(model.pair, bars);

  const dayStorylines: DayStoryline[] = days.map((day, i) => {
    const contested = readContestedZone(model, day);
    const projected = projectNext(chain, i, day, contested);
    const breakValidation = validateBreak(model, day);
    const phase = warframePhaseOf(day.shape);
    const narrative = composeNarrative(
      day,
      directionOf(day),
      contested,
      projected,
      breakValidation,
      phase,
      macroArc.summary,
      strength,
    );
    return {
      day: day.day,
      shape: day.shape,
      contestedZone: contested,
      projectedNext: projected,
      breakValidation,
      strengthComparison: strength,
      warframeArc: phase,
      narrative,
    };
  });

  // The week's current phase: the LAST non-SS day's phase (or the last day's).
  let weekPhase: WarframePhase = dayStorylines.length > 0
    ? dayStorylines[dayStorylines.length - 1]!.warframeArc
    : 'TRENCHES';
  for (let i = dayStorylines.length - 1; i >= 0; i--) {
    if (dayStorylines[i]!.shape !== ShapeCode.SS) {
      weekPhase = dayStorylines[i]!.warframeArc;
      break;
    }
  }

  return {
    pair: model.pair,
    macroArc,
    strengthComparison: strength,
    warframePhase: weekPhase,
    days: dayStorylines,
  };
}
