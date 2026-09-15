/**
 * cascade-translation.ts — the E2 CASCADE TRANSLATION ENGINE (Wave G1).
 *
 * ═══════════════════════════════════════════════════════════════
 * The operator's 2026-08-01 ruling (QUOTED — doctrine is never synthesized):
 *
 *   "No cascade is literally a translation of the exact map/data that
 *    currently exists on the cascade pair to the receiving pair. THIS IS
 *    WHY E1 OF THAT SPECIFIC PAIR NEEDS TO BE RUN FIRST SO ZONES OF THE
 *    SAME ELEMENT CAN BE PROPERLY MATCHED. BoM --> BoM, MoM --> MoM,
 *    S/D --> D/S (DXY/EU), S/D --> S/D (EU --> GU), PAIR SPECIFIC LQZ
 *    GENERATED UNBIASED FROM CASCADE"
 *
 *   "cascade needs to match to structurally equivalent as primary
 *    confluence and strength as secondary confluence (in case the primary
 *    incorrectly selects some weak penetrated high ZFP zone by accident
 *    and misses the ACTUAL structurally equivalent zone that is causing
 *    the move. this is mainly a noise filter for the occasional fuck up
 *    on signal #1)"
 *
 * THE ENGINE — translateCascadeDayMap replaces the strength-ranked
 * round-robin designation (the old shape-cascade assignZonesByDay) with
 * STRUCTURAL-EQUIVALENCE matching:
 *
 *   PRIMARY (structural — the operator's "structurally equivalent"):
 *     element  — BoM→BoM, MoM→MoM, LQZ→LQZ (the receiving pair's OWN LQZ
 *                rungs, ids `LMV|...` — never the cascade's LQZ price)
 *     role     — S/D→D/S for INVERSE (DXY/EU), S/D→S/D for KEPT (EU/GU)
 *     window   — |formation delta| ≤ 48h OR |reaction delta| ≤ 48h (the
 *                mirror's own ±48h structural pool, mirror.ts:1391)
 *     position — the zone the receiving day's shape rejects at (the
 *                designated level sits in the zone band ± 3 pips)
 *   SECONDARY (strength — the operator's noise filter ONLY):
 *     lowest zfp, most reactions; a weak penetrated (DEPLETED/VIOLATED,
 *     zfp > 55) top pick is overridden by the strongest low-zfp
 *     structural equivalent (the "occasional fuck up" guard).
 *
 *   NO structural candidate → translatedZoneId = null — the receiving
 *   pair's E2 CORE runs free (honest absence, §12 Law 3 — never invent).
 *
 * DETERMINISM (§12): no wall-clock, no randomness. Same models + same
 * cascade days → byte-identical map. No hardcoded Jul-6-10 levels —
 * every level emerges from the models' zones. No price conversion, ever
 * (the §15 anti-goal — the receiving level is the receiving pair's own).
 *
 * THE ELEMENT-MATCHING MATRIX (the operator's exact table):
 *   ┌───────────────┬──────────────────┬──────────────────┐
 *   │ Cascade zone  │ EU (INVERSE)     │ GU (KEPT)        │
 *   ├───────────────┼──────────────────┼──────────────────┤
 *   │ BoM SUPPLY    │ BoM DEMAND       │ BoM SUPPLY       │
 *   │ BoM DEMAND    │ BoM SUPPLY       │ BoM DEMAND       │
 *   │ MoM SUPPLY    │ MoM DEMAND       │ MoM SUPPLY       │
 *   │ MoM DEMAND    │ MoM SUPPLY       │ MoM DEMAND       │
 *   │ LQZ (supply)  │ pair LQZ (demand)│ pair LQZ (supply)│
 *   └───────────────┴──────────────────┴──────────────────┘
 * ═══════════════════════════════════════════════════════════════
 */
import type { ChartModel, ZoneModel } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * The PRIMARY structural window = 48h.
 * BECAUSE: the mirror's own structural-equivalence pool is the reaction-time
 * ±48h preference (mirror.ts:1391 uses 2 × FORMATION_TIME_TOLERANCE_MS for
 * the SAME purpose — "Zones that reacted near the DXY signal time are the
 * structural equivalents — created by the same market event"). The cascade
 * translation reuses the identical doctrine: a receiving zone formed OR
 * reacted within ±48h of the cascade zone is the same macro-event's twin.
 */
const STRUCTURAL_WINDOW_MS = 48 * HOUR_MS;

/**
 * The position-match band tolerance = 3 pips.
 * BECAUSE: the operator's golden Mon EU SHORT level (1.14544) is matched to
 * the structurally-equivalent supply "within 3 pips" — the tolerance of the
 * mission's own acceptance test. A zone whose band contains the designated
 * level within ±3 pips is the day's rejection point.
 */
const POSITION_TOLERANCE_PIPS = 3;

/**
 * The weak-penetrated override threshold = zfp 55.
 * BECAUSE: the operator's noise filter ("some weak penetrated high ZFP zone
 * by accident") targets zones the market has already consumed — canon zfp
 * climbs with exhaustion (zfp 20 = fresh hard wall; zfp 55+ = heavily
 * tested/penetrated per the ladder, lmv.ts:270-279). A zfp > 55 zone whose
 * freshness is DEPLETED/VIOLATED is the "weak penetrated" case.
 */
const WEAK_ZFP = 55;

/**
 * The validated chain-divergence ceiling (interface doc): ≤ 0.35 = validated.
 * BECAUSE: the operator's divergence doctrine — the cascade's translated
 * waveform may lead/lag the receiving pair's own structure by at most a
 * fraction of the week; 0.35 (≈ 2 of 5 days disagreeing) is the noise
 * filter's tolerance, beyond which the translation is suspect.
 */
export const CASCADE_DIVERGENCE_VALIDATED = 0.35;

// ═══════════════════════════════════════════════════════════════════════════════
// THE FIXED CONTRACT (agent G2 imports these EXACTLY)
// ═══════════════════════════════════════════════════════════════════════════════

export interface TranslatedDayEntry {
  /** 'Mon'..'Fri' — the canonical cascade day label. */
  day: string;
  /** The cascade pair's E2 CORE designation for that day (the resolved
   *  cascade-zone id; the raw keyZoneId when unresolved; null when the
   *  day carried no designation). */
  cascadeZoneId: string | null;
  /** The receiving pair's structurally-equivalent zone (null = HONEST
   *  ABSENCE — never invent: the pair's E2 CORE runs free). */
  translatedZoneId: string | null;
  /** The cascade zone's element (BoM | MoM | LQZ). Null when the cascade
   *  designation is unresolved (keyZoneId null / absent) — honest. */
  element: 'BoM' | 'MoM' | 'LQZ' | null;
  /** The RECEIVING-side role — the matrix's translated role (INVERSE flips
   *  S/D→D/S, KEPT preserves). Null when the cascade role is unresolved. */
  role: 'SUPPLY' | 'DEMAND' | null;
  /** The |formation or reaction delta| of the matched zone — the ±48h
   *  match evidence. Null when the cascade zone is unresolved (no window
   *  reference) or the matched zone lacks timestamps — honest. */
  windowDeltaMs: number | null;
  /** Same position-in-structure: the designated level sits in the matched
   *  zone's band (±3 pips) AND the role agrees with the day's direction. */
  positionMatch: boolean;
  /** The matched zone's zfp — the SECONDARY, the operator's noise filter
   *  (lowest-zfp wins among primary ties). Null when no match. */
  strengthScore: number | null;
}

export interface TranslatedDayMap {
  /** The receiving pair. */
  pair: string;
  /** The receiving pair's translation mode (INVERSE = DXY/EU, KEPT = EU/GU). */
  direction: 'INVERSE' | 'KEPT';
  /** One entry per cascade day, in cascade order. */
  entries: TranslatedDayEntry[];
  /** 0..1 — chain divergence vs the cascade (≤ CASCADE_DIVERGENCE_VALIDATED
   *  = validated). Null when the receiving model carries no week anchor
   *  (the macro-signal day windows are unknowable — honest). */
  divergence: number | null;
}

/**
 * The minimal structural shape — structurally compatible with the REAL
 * ChartModel (types.ts:104): a real ChartModel is assignable to this
 * interface. Zones are the REAL ZoneModel (types.ts:131) — no parallel
 * zone type is invented. The bridged LQZ rungs (ids `LMV|...`,
 * index.ts:353) are first-class members of model.zones and ARE the
 * receiving pair's OWN LQZ candidates.
 */
export interface ChartModelLike {
  pair: string;
  zones: ZoneModel[];
  /** Pair spot — the pip-size identity (mirror.ts:1322: DXY 0.01 / FX
   *  0.0001). Absent → FX pip (0.0001) — the common receiving target. */
  spot?: number;
  /** The deterministic week anchor — the macro-signal day windows for the
   *  divergence check. Absent → divergence null (honest). */
  anchor?: { weekStartMs: number; anchorMs: number };
}

export type TranslationMode = 'INVERSE' | 'KEPT';

/** The cascade's zone element — LQZ is discriminated by the `LMV|` id
 *  namespace (the bridged rungs are MoM-class per canon, index.ts:360 —
 *  classification alone cannot see the LQZ identity). */
export type ZoneElement = 'BoM' | 'MoM' | 'LQZ';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNALS
// ═══════════════════════════════════════════════════════════════════════════════

/** Element of a receiving/cascade zone — `LMV|` id prefix → LQZ, else the
 *  §6.3 classification. Total: every ZoneModel yields an element. */
function elementOfZone(z: ZoneModel): ZoneElement {
  return z.id.startsWith('LMV|') ? 'LQZ' : z.classification;
}

/** The zone's LATEST reaction ms (the mirror's reaction-time doctrine,
 *  mirror.ts:1381-1389: reaction time is when price actually tested the
 *  zone — the structural twin of a cascade zone). Null when the zone has
 *  no reactions (the LMV bridge emits none — honest emptiness). */
function lastReactionMsOf(z: ZoneModel): number | null {
  if (z.reactionEvents.length === 0) return null;
  let mx = -Infinity;
  for (const ev of z.reactionEvents) {
    if (ev.lastTouchMs > mx) mx = ev.lastTouchMs;
  }
  return mx;
}

/** The matrix's translated role (the receiving-side role):
 *  INVERSE (DXY/EU) flips S/D → D/S; KEPT (EU/GU) preserves. Total. */
function translatedRoleOf(role: 'SUPPLY' | 'DEMAND', mode: TranslationMode): 'SUPPLY' | 'DEMAND' {
  return mode === 'INVERSE'
    ? role === 'SUPPLY' ? 'DEMAND' : 'SUPPLY'
    : role;
}

/** Pip size by pair identity — the mirror's exact rule (mirror.ts:1322):
 *  spot > 50 → index (DXY, 0.01); else FX (0.0001). Total. */
function pipSizeOf(model: ChartModelLike): number {
  return (model.spot ?? 0) > 50 ? 0.01 : 0.0001;
}

/** Canonical 'Mon'..'Fri' label from any chain day label ('Mon (week)',
 *  'Monday', 'Tue', ...). Unknown/absent → the positional canonical day.
 *  Total. */
function canonicalDay(label: string | undefined, idx: number): string {
  const m = /^(Mon|Tue|Wed|Thu|Fri)/i.exec((label ?? '').trim());
  if (m) {
    const s = m[1]!;
    return s[0]!.toUpperCase() + s.slice(1).toLowerCase();
  }
  const byIdx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][idx];
  return byIdx ?? `day-${idx}`;
}

/**
 * Resolve the cascade pair's E2 CORE designation for a day: the zone id
 * (keyZoneId, then the direction-appropriate supply/demand id — the E1
 * chain's fallback designation) → the cascade zone in the cascade model.
 * Total: unresolvable → zone null (the day's element/role are honestly
 * unknown); the designated LEVEL (keyZonePrice) is carried independently —
 * it is the receiving day's structural reference, never the cascade's price
 * converted.
 */
function resolveCascadeZone(
  cascadeModel: ChartModelLike,
  day: {
    keyZoneId: string | null; keyZonePrice: number | null;
    direction: string; supplyZoneId?: string | null; demandZoneId?: string | null;
  },
): { zone: ZoneModel | null; level: number | null } {
  const id = day.keyZoneId
    ?? (day.direction === 'SHORT' ? day.supplyZoneId ?? null : day.demandZoneId ?? null);
  const zone = id === null ? null : cascadeModel.zones.find((z) => z.id === id) ?? null;
  return { zone, level: day.keyZonePrice };
}
/**
 * Resolve the RECEIVING day's position level from the receiving pair's OWN
 * model — the pair-native price reference (FIX PLAN §1.2 step 4). When the
 * receiving day carries a keyZonePrice, that wins; otherwise the receiving
 * day's designated zone (keyZoneId, or the direction's supply/demand id) is
 * looked up in the receiving model and its CENTER becomes the reference —
 * the zone the pair's shape chain will reject at. The cascade pair's price
 * space is NEVER used (DXY 101.239 cannot match EU 1.14x zones).
 */
function resolveReceivingLevel(
  receivingModel: ChartModelLike,
  receivingDay: {
    keyZoneId?: string | null; keyZonePrice: number | null;
    supplyZoneId?: string | null; demandZoneId?: string | null;
    direction?: string;
  } | null | undefined,
): number | null {
  if (!receivingDay) return null;
  if (receivingDay.keyZonePrice !== null && receivingDay.keyZonePrice !== undefined) {
    return receivingDay.keyZonePrice;
  }
  let id: string | null = null;
  if (receivingDay.keyZoneId != null) id = receivingDay.keyZoneId;
  else if (receivingDay.direction === 'SHORT' && receivingDay.supplyZoneId != null) id = receivingDay.supplyZoneId;
  else if (receivingDay.direction === 'LONG' && receivingDay.demandZoneId != null) id = receivingDay.demandZoneId;
  else if (receivingDay.supplyZoneId != null) id = receivingDay.supplyZoneId;
  else if (receivingDay.demandZoneId != null) id = receivingDay.demandZoneId;
  if (id === null) return null;
  const zone = receivingModel.zones.find((z) => z.id === id);
  if (!zone) return null;
  return (zone.top + zone.bottom) / 2;
}

/** The candidate's ±48h window evidence vs the cascade zone: the MIN of
 *  the |formation delta| and the |reaction delta| (either within ±48h is
 *  the structural twin — the mirror's OR-doctrine, mirror.ts:1391).
 *  Null when the cascade zone is unresolved or the candidate has no
 *  timestamps (honest — the window cannot be judged). */
function windowDeltaMsOf(
  candidate: ZoneModel,
  cascadeZone: ZoneModel | null,
): number | null {
  if (cascadeZone === null) return null;
  const dForm = Math.abs(candidate.formationMs - cascadeZone.formationMs);
  const cReact = lastReactionMsOf(cascadeZone);
  const rReact = lastReactionMsOf(candidate);
  if (cReact !== null && rReact !== null) {
    const dReact = Math.abs(rReact - cReact);
    return dReact < dForm ? dReact : dForm;
  }
  return dForm;
}

/**
 * Position-in-structure (the MACRO-ALIGNED POSITION, §1.2 step 4): the
 * zone the receiving day's shape will reject at. A SHORT day rejects at
 * SUPPLY whose band contains the day's structural level; a LONG day at
 * DEMAND. The designated level (keyZonePrice — the receiving day's E2
 * level, not a converted cascade price) is the day-open reference: the
 * contract carries no dayOpenSpot, and inventing a price violates §12
 * Law 3 — the level IS the day's structural reference. Total: unknown
 * level or direction → false (honest). */
function positionMatchOf(
  candidate: ZoneModel,
  level: number | null,
  dayDirection: string,
  pipSize: number,
): boolean {
  if (level === null) return false;
  const wantType = dayDirection === 'SHORT' ? 'SUPPLY' : dayDirection === 'LONG' ? 'DEMAND' : null;
  if (wantType === null || candidate.type !== wantType) return false;
  const tol = POSITION_TOLERANCE_PIPS * pipSize;
  return candidate.bottom - tol <= level && candidate.top + tol >= level;
}

/** The role a candidate must carry: the matrix's translated role when the
 *  cascade zone is resolved; otherwise the receiving day's direction
 *  preference (a SHORT day's structural rejection is SUPPLY — the E2
 *  core's own identity for the day). Null → no role constraint (honest). */
function requiredRole(
  cascadeZone: ZoneModel | null,
  translatedRole: 'SUPPLY' | 'DEMAND' | null,
  dayDirection: string,
): 'SUPPLY' | 'DEMAND' | null {
  if (translatedRole !== null) return translatedRole;
  if (cascadeZone === null && dayDirection === 'SHORT') return 'SUPPLY';
  if (cascadeZone === null && dayDirection === 'LONG') return 'DEMAND';
  return null;
}

/** The weak-penetrated predicate — the operator's noise-filter trigger: a
 *  zone the market has consumed (DEPLETED/VIOLATED) with a high canon zfp
 *  (> WEAK_ZFP). Total. */
function isWeakPenetrated(z: ZoneModel): boolean {
  return (z.freshness === 'DEPLETED' || z.freshness === 'VIOLATED') && z.zfp > WEAK_ZFP;
}

/**
 * The receiving model's per-day macro-signal direction — the SAME
 * supply/demand strength doctrine as the cascade's collectWeekZones
 * (shape-cascade.ts:68: strength = confluence×2 + (100 − zfp)), summed per
 * side over the zones active in the day's window. This is the
 * assignZonesByDay macro-signal feed for the divergence check (the
 * designation role is retired — the signal gates only, never designates).
 * Total: no zones active that day → null (no signal — the E2 CORE runs
 * free, not "diverged"). */
function dayDirectionMacro(
  model: ChartModelLike,
  weekStartMs: number,
  dayIdx: number,
): 'LONG' | 'SHORT' | null {
  const dayStart = weekStartMs + dayIdx * DAY_MS;
  const dayEnd = dayStart + DAY_MS;
  let supplyStrength = 0;
  let demandStrength = 0;
  for (const z of model.zones) {
    if (z.freshness === 'VIOLATED') continue;
    const reactedInDay = z.reactionEvents.some(
      (ev) => ev.lastTouchMs >= dayStart && ev.lastTouchMs < dayEnd,
    );
    const formedInDay = z.formationMs >= dayStart && z.formationMs < dayEnd;
    if (!reactedInDay && !formedInDay) continue;
    const strength = (z.confluence ?? 0) * 2 + (100 - (z.zfp ?? 50));
    if (z.type === 'SUPPLY') supplyStrength += strength;
    else demandStrength += strength;
  }
  if (supplyStrength === 0 && demandStrength === 0) return null;
  return supplyStrength >= demandStrength ? 'SHORT' : 'LONG';
}

/** One cascade day's translation — the §1.2 algorithm, total. */
function translateDay(
  day: {
    day: string; shape: string; direction: string;
    keyZoneId: string | null; keyZonePrice: number | null;
    supplyZoneId?: string | null; demandZoneId?: string | null;
  },
  dayIdx: number,
  cascadeModel: ChartModelLike,
  receivingModel: ChartModelLike,
  mode: TranslationMode,
  receivingLevel: number | null = null,
): TranslatedDayEntry {
  const { zone: cascadeZone, level } = resolveCascadeZone(cascadeModel, day);
  // ── The POSITION reference (FIX PLAN §1.2 step 4): the receiving day's
  //    OWN designated level — "the zone the pair's shape chain will reject
  //    at that day". The cascade pair's keyZonePrice lives in a DIFFERENT
  //    price space (DXY 101.239 vs EU 1.14x) and can never match the
  //    receiving pair's zones — a cross-pair comparison that nulls every
  //    translation. The receiving E2 CORE's keyZonePrice is the correct
  //    reference (the operator: "the cascade is a macro signal to validate
  //    the pair specific output against"). ──
  const posLevel = receivingLevel ?? level;
  const element: ZoneElement | null = cascadeZone === null ? null : elementOfZone(cascadeZone);
  const role: 'SUPPLY' | 'DEMAND' | null = cascadeZone === null ? null : cascadeZone.type;
  const translated = role === null ? null : translatedRoleOf(role, mode);
  const wantType = requiredRole(cascadeZone, translated, day.direction);
  const pipSize = pipSizeOf(receivingModel);

  // ── No designation at all → the pair's E2 CORE runs free (honest). ──
  if (cascadeZone === null && level === null) {
    return {
      day: canonicalDay(day.day, dayIdx),
      cascadeZoneId: null, translatedZoneId: null,
      element: null, role: null,
      windowDeltaMs: null, positionMatch: false, strengthScore: null,
    };
  }

  // ── PRIMARY structural candidates: element + role + window + POSITION
  //    (hard gates; each is skipped only when honestly unknowable — never
  //    invented). Position is a GATE when the designated level is known:
  //    a zone that does not sit at the day's rejection point is NOT the
  //    structurally-equivalent level (the operator's "structurally
  //    equivalent as primary confluence" — a stray zone at a different
  //    level is a structural mismatch, not a candidate). ──
  const candidates: ZoneModel[] = [];
  for (const z of receivingModel.zones) {
    // Wave A1.1 (2026-08-01) — DECISION-1: the IP zones (source==='PILLAR',
    // merged into the ONE zone map by the E1 reintegration) are confluence/
    // ZFP/context + SL/TP rungs, NEVER structural twins for the RE_TRANSLATE
    // re-anchor (an IP translatedZoneId would re-anchor a mirror's ENTRY to a
    // passive level). Additive — no pre-existing zone carries the tag.
    if ((z as { source?: string }).source === 'PILLAR') continue;
    if (element !== null && elementOfZone(z) !== element) continue;       // BoM→BoM, MoM→MoM, LQZ→LQZ
    if (wantType !== null && z.type !== wantType) continue;               // translated role (or day-direction preference)
    const windowDelta = windowDeltaMsOf(z, cascadeZone);
    if (windowDelta !== null && windowDelta > STRUCTURAL_WINDOW_MS) continue; // ±48h formation OR reaction
    if (posLevel !== null && !positionMatchOf(z, posLevel, day.direction, pipSize)) continue; // the rejection point (the RECEIVING pair's own level — never the cascade pair's price space)
    candidates.push(z);
  }

  if (candidates.length === 0) {
    return {
      day: canonicalDay(day.day, dayIdx),
      cascadeZoneId: cascadeZone?.id ?? day.keyZoneId,
      translatedZoneId: null, element, role,
      windowDeltaMs: null, positionMatch: false, strengthScore: null,
    };
  }

  // ── Rank: PRIMARY (element + role + window + position — hard-gated
  //    above, so the survivors are the structural set) then, within it:
  //    POSITION ACCURACY (distance to the designated level — the operator's
  //    "structurally equivalent as primary confluence": the zone that sits
  //    AT the rejection point) then SECONDARY (lowest zfp — the strength
  //    noise filter, then most reactions), deterministic id tiebreak. ──
  const scored = candidates.map((z) => {
    const windowDelta = windowDeltaMsOf(z, cascadeZone);
    const position = positionMatchOf(z, posLevel, day.direction, pipSize);
    const center = (z.top + z.bottom) / 2;
    const distance = posLevel === null ? 0 : Math.abs(center - posLevel);
    const reactions = z.reactionEvents.length;
    let primary = 0;
    if (element === null || elementOfZone(z) === element) primary += 1;
    if (wantType === null || z.type === wantType) primary += 1;
    if (windowDelta === null || windowDelta <= STRUCTURAL_WINDOW_MS) primary += 1;
    if (position) primary += 1;
    return { z, windowDelta, position, primary, distance, reactions };
  });

  scored.sort((a, b) =>
    (b.primary - a.primary) ||                     // PRIMARY: structural confluence
    (a.distance - b.distance) ||                   // POSITION ACCURACY: at the rejection point
    (a.z.zfp - b.z.zfp) ||                         // SECONDARY: lowest zfp (strength — the noise filter)
    (b.reactions - a.reactions) ||                 // SECONDARY: most reactions (most-battled level)
    (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0)); // deterministic tiebreak

  // ── The operator's noise filter: if the primary pick is a WEAK
  //    PENETRATED high-ZFP zone (a consumed level the primary selected "by
  //    accident") and a strong structural equivalent exists, re-pick the
  //    strongest low-zfp equivalent (the ACTUAL zone causing the move). ──
  let top = scored[0]!;
  if (isWeakPenetrated(top.z)) {
    const strong = scored.find((c) => c.z.zfp <= WEAK_ZFP);
    if (strong) top = strong;
  }

  return {
    day: canonicalDay(day.day, dayIdx),
    cascadeZoneId: cascadeZone?.id ?? day.keyZoneId,
    translatedZoneId: top.z.id,
    element, role,
    windowDeltaMs: top.windowDelta,
    positionMatch: top.position,
    strengthScore: top.z.zfp,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * translateCascadeDayMap — the E2 cascade translation (the fixed contract).
 *
 * For each cascade day: resolve the cascade pair's designation (element +
 * role from the cascade zone, the receiving day's designated level), then
 * match the receiving pair's OWN structurally-equivalent zone by the
 * PRIMARY matrix (element + translated role + ±48h window + position),
 * ranked by the SECONDARY strength noise filter. No structural candidate →
 * translatedZoneId null (honest absence — the E2 CORE runs free).
 *
 * The divergence: the receiving model's OWN zone macro-signal day
 * directions vs the cascade's translated day directions (the §1.5
 * directionMatch clause — the pair's structure agreeing with the cascade).
 * Shape-family alignment is the caller's computeChainDivergence (the
 * receiving pair's own E1 waveform vs the cascade). Null when the model
 * carries no week anchor (honest).
 */
export function translateCascadeDayMap(
  cascadeDays: Array<{
    day: string; shape: string; direction: string;
    keyZoneId: string | null; keyZonePrice: number | null;
    supplyZoneId?: string | null; demandZoneId?: string | null;
  }>,
  cascadeModel: ChartModelLike,
  receivingModel: ChartModelLike,
  direction: TranslationMode,
  receivingDays?: Array<{
    day: string; keyZoneId?: string | null; keyZonePrice: number | null;
    supplyZoneId?: string | null; demandZoneId?: string | null;
  }>,
): TranslatedDayMap {
  const entries = cascadeDays.map((d, i) =>
    translateDay(d, i, cascadeModel, receivingModel, direction,
      resolveReceivingLevel(receivingModel, receivingDays?.[i])));

  // ── The chain divergence (FIX PLAN §1.5, directionMatch clause): per
  //    day, the receiving model's macro-signal direction vs the cascade's
  //    translated day direction. A missing cascade day counts as NOT
  //    aligned; a present day with NO macro signal is honestly unchecked
  //    (the E2 CORE runs free — no evidence of divergence, none counted). ──
  let divergence: number | null = null;
  const weekStartMs = receivingModel.anchor?.weekStartMs;
  if (weekStartMs !== undefined) {
    let notAligned = 0;
    for (let i = 0; i < 5; i++) {
      const c = cascadeDays[i];
      if (!c) { notAligned += 1; continue; }                     // cascade didn't designate — incomplete
      const macro = dayDirectionMacro(receivingModel, weekStartMs, i);
      const translatedDir = c.direction === 'SHORT' ? 'SHORT' : c.direction === 'LONG' ? 'LONG' : null;
      if (macro === null || translatedDir === null) continue;    // honestly unchecked
      if (macro !== translatedDir) notAligned += 1;              // the pair's structure contradicts the cascade
    }
    divergence = notAligned / 5;
  }

  return { pair: receivingModel.pair, direction, entries, divergence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE CHAIN-DIVERGENCE COMPARATOR (FIX PLAN §1.5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The shape families (the operator's exact grouping): SS≈SS/RWL,
 * BS≈BS/PBS, R≈R, WL≈WL/WLS. Documented variants join their base family
 * (STORM = "SS + delayed whiplash", PRWL = "RWL with piercing
 * characteristics", PWL = "WL that pierces" — the ShapeCode enum comments).
 * Unlisted shapes (DWL, RS) → null (honest — unknown shapes do not align).
 */
const SHAPE_FAMILIES: Record<string, string> = {
  SS: 'SS', RWL: 'SS', STORM: 'SS', PRWL: 'SS',
  BS: 'BS', PBS: 'BS',
  R: 'R',
  WL: 'WL', WLS: 'WL', PWL: 'WL',
};

/** The master sequence SS→BS→R→WL (the operator's narrative order) with
 *  the one-step tolerance positions. */
const MASTER_SEQUENCE: readonly string[] = ['SS', 'BS', 'R', 'WL'];

function familyOf(shape: string): string | null {
  const fam = SHAPE_FAMILIES[shape];
  return fam ?? null;
}

/** Two shapes are aligned per §1.5: same family OR within ONE step of the
 *  master sequence SS→BS→R→WL. Unknown shape → not aligned (honest). */
function shapesAligned(a: string, b: string): boolean {
  const fa = familyOf(a);
  const fb = familyOf(b);
  if (fa === null || fb === null) return false;
  if (fa === fb) return true;
  const ia = MASTER_SEQUENCE.indexOf(fa);
  const ib = MASTER_SEQUENCE.indexOf(fb);
  if (ia < 0 || ib < 0) return false;
  return Math.abs(ia - ib) <= 1;
}

/**
 * computeChainDivergence — the shape-waveform divergence between the
 * receiving pair's OWN E1 day decomposition and the cascade's translated
 * days (FIX PLAN §1.5). Per day: aligned = same shape-family (SS≈SS/RWL,
 * BS≈BS/PBS, R≈R, WL≈WL/WLS) OR within ONE step of the master sequence
 * SS→BS→R→WL. chainDivergence = (days not aligned) / 5. A missing day on
 * either side counts as NOT aligned (incomplete chains cannot validate).
 *
 * NOTE (honest): the §1.5 directionMatch clause ("the pair's day direction
 * agrees with the translated direction") is expressed by
 * translateCascadeDayMap's divergence — the fixed 2-arg signature carries
 * no direction fields, so THIS comparator is shape-alignment only; the
 * master sequence itself encodes the directional narrative, and the
 * one-step tolerance IS the operator's waveform-agreement window.
 * Total: any day arrays (empty/partial) → a defined fraction in [0,1].
 */
export function computeChainDivergence(
  pairDays: Array<{ day: string; shape: string }>,
  cascadeDays: Array<{ day: string; shape: string }>,
): number {
  let aligned = 0;
  for (let i = 0; i < 5; i++) {
    const p = pairDays[i];
    const c = cascadeDays[i];
    if (!p || !c) continue;
    if (shapesAligned(p.shape, c.shape)) aligned += 1;
  }
  return (5 - aligned) / 5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE-LEVEL PROOF: the REAL ChartModel is assignable to ChartModelLike
// (compile-time only — emits zero runtime code; the runtime proof is the
// golden smoke probe passing real buildChartModel outputs).
// ═══════════════════════════════════════════════════════════════════════════════
type _ChartModelAssignable = ChartModel extends ChartModelLike ? true : never;
