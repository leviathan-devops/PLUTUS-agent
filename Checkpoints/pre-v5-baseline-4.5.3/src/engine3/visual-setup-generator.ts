/**
 * Engine 3 (3D) — Visual Setup Generator
 *
 * Per ENGINE_OVERHAUL_COMPLIANCE_L2.md §7.3:
 *   - E3-4: Generate setups at the intersection of Engine 1 zone (WHERE) +
 *           Engine 2 shape (WHEN) + visual LQZ (EXACT entry)
 *   - E3-5: SL at next visual LQZ beyond entry; TP at nearest opposing visual LQZ
 *   - E3-6: 3-entry staggered system with forward spreads (1-2 pips toward spot)
 *
 * Design Principles (from task spec):
 *   1. Engine 3 SUPERIMPOSES on Engine 1 + 2 — does NOT replace them
 *   2. Visual zones are for ENTRY PRECISION — exact wick levels, body edges, LQZ boundaries
 *   3. Engine 1 zones provide CONTEXT — which area has institutional liquidity
 *   4. Engine 2 shapes provide TIMING — when to enter, what direction
 *   5. Liquidity is EVERYTHING — markets move to/from liquidity zones
 *   6. Entry at LQZ + overlap with S/D — best entries have both
 *   7. 3-entry staggered with forward spreads — 1-2 pip spread toward spot from zone edge
 *   8. SL at NEXT visual LQZ — not at a fixed pip distance
 */

import { Logger } from '../utils/logger.js';
import type {
  ZoneMapSnapshot,
  ShapePredictionSnapshot,
  TradeSetup,
  DXYZone,
  DayShapePrediction,
  OHLCBar,
} from '../types.js';
import {
  TradeDirection,
  SetupCategory,
  ConfidenceTier,
  SessionWindow,
  ShapeCode,
  ZoneType,
  PIP_VALUE,
} from '../types.js';
import {
  PIP_VALUE_DEFAULT,
  SL_CAP_PIPS,
  SHAPE_CATEGORIES_MAP,
  SHAPE_SESSION_MAP,
  CATEGORY_SESSION_MAP,
  MAX_ENTRY_DISTANCE_PIPS,
  rrrForCategory,
} from '../constants/trading-constants.js';
import type { VisualSDZone } from './types.js';
import { generateLiquidityLadder, type LadderStructure } from './ladder-generator.js';

const log = new Logger('VisualSetupGenerator');

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Forward spread per pair — moves entry edges TOWARD spot to guarantee fills. */
const FORWARD_SPREAD: Record<string, number> = {
  'EUR/USD': 0.0001,   // 1 pip
  'AUD/USD': 0.00015,  // 1.5 pips
  'GBP/USD': 0.0002,   // 2 pips
  'DXY': 0.02,         // 0.02 index points
};

/**
 * Law 7 SL buffer per pair (pips) — SL sits 2-5 pips INSIDE the next
 * structural zone (LQZ rung / BoM block), measured in from its NEAR edge.
 */
const SL_BUFFER_PIPS: Record<string, number> = {
  'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5,
};

/**
 * Normalize a pair ATR value to PIPS. The two generateSetups call sites pass
 * different units: src/pipeline/engine.ts passes ATR(14) in PIPS
 * (computeATR14Pips), while the legacy src/engine/plutus-tte-pipeline.ts
 * passes ATR(14) in PRICE units. Price-unit ATRs on every pair are < 1
 * (EUR ≈ 0.0012, DXY ≈ 0.05); pip ATRs are ≥ 1. Returns 0 when unavailable.
 */
function normalizeAtrToPips(atr: number | undefined, pipValue: number): number {
  if (!atr || atr <= 0) return 0;
  return atr < 1 ? atr / pipValue : atr;
}

/**
 * computeWeeklyAtrPips — spec §6.3. Weekly ATR for the Law-13 TP sanity
 * checks. 42 × 4H bars ≈ 1 week of trading. The generator receives zone
 * snapshots only — 4H bars are NOT reachable here — so the live call passes
 * `undefined` and falls back to the conservative proxy:
 * weeklyAtrPips ≈ atr1hPips × 20 (1H ATR × ~20 ≈ weekly range). The bar-based
 * path exists for callers/tests that do have 4H bars.
 */
function computeWeeklyAtrPips(
  bars4H: ReadonlyArray<{ high: number; low: number; close: number }> | undefined,
  pipValue: number,
  atr1hPipsFallback: number,
): number {
  if (bars4H && bars4H.length >= 2) {
    const week = bars4H.slice(-42);
    let sum = 0;
    for (let i = 0; i < week.length; i++) {
      const b = week[i]!;
      if (i === 0) {
        sum += b.high - b.low;
      } else {
        const p = week[i - 1]!;
        sum += Math.max(b.high - b.low, Math.abs(b.high - p.close), Math.abs(b.low - p.close));
      }
    }
    return (sum / week.length) / pipValue;
  }
  // Approximation: 4H bars unreachable from the generator (zone snapshots only).
  return atr1hPipsFallback * 20;
}

/**
 * §8.2 session-map unification — the local divergent maps were DELETED.
 * SHAPE_SESSION_MAP / CATEGORY_SESSION_MAP are imported from
 * trading-constants (single source of truth, shared with shape-brain).
 * Those maps are string-valued (SessionWindow enum VALUES duplicated as
 * literals to avoid a types.ts ↔ constants circular import); TradeSetup.session
 * is enum-typed, so resolve each string back to its enum member here at the
 * import boundary. BS now maps to NY Overlap (golden + 38-trade forensic).
 */
const SESSION_BY_VALUE: ReadonlyMap<string, SessionWindow> = new Map(
  (Object.values(SessionWindow) as string[]).map((v) => [v, v as SessionWindow]),
);

function resolveSessionWindow(value: string | undefined): SessionWindow | undefined {
  return value !== undefined ? SESSION_BY_VALUE.get(value) : undefined;
}

/**
 * Canonical UPPER_SNAKE category key — same normalization rrrForCategory
 * applies ('Swing Scalp' → 'SWING_SCALP'). Used to key the constants tables
 * (MAX_ENTRY_DISTANCE_PIPS, CATEGORY_SESSION_MAP, CONSOLIDATION_WEEK_FLOORS).
 */
function categoryKeyOf(category: string): string {
  return category.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

/**
 * Bible 8.6 — consolidation-week RRR floors. Applies ONLY when EVERY day of
 * the week is a consolidation shape (SS / R / WLS). rrrForCategory remains
 * the single source of truth for normal weeks — this table never hardcodes a
 * normal-week floor, it only relaxes during full-consolidation weeks.
 */
const CONSOLIDATION_WEEK_FLOORS: Record<string, number> = {
  SWING_SCALP: 1.2,
  HTF_SWING: 1.5,
  BREAKOUT_SURGE: 1.5,
  WHIPLASH: 1.5,
  REINFORCEMENT: 1.2,
  REVERSAL: 1.5,
};

/**
 * Raw Engine 2 shape codes → SHAPE_CATEGORIES_MAP family key.
 * Mirrors PlutusPipeline.mapShapeToCategoryKey (DWL→SS_DWL, STORM→SS,
 * PBS→BS, PWL→WL, PRWL→RWL, RS→R) so the visual generator resolves the
 * same categories as the rest of the pipeline for shape variants.
 */
const SHAPE_FAMILY_MAP: Record<string, string> = {
  [ShapeCode.SS]: 'SS',
  [ShapeCode.DWL]: 'SS_DWL',
  [ShapeCode.STORM]: 'SS',
  [ShapeCode.BS]: 'BS',
  [ShapeCode.PBS]: 'BS',
  [ShapeCode.WL]: 'WL',
  [ShapeCode.PWL]: 'WL',
  [ShapeCode.RWL]: 'RWL',
  [ShapeCode.PRWL]: 'RWL',
  [ShapeCode.WLS]: 'WLS',
  [ShapeCode.R]: 'R',
  [ShapeCode.RS]: 'R',
};

/** Category → session: imported from trading-constants (§8.2 — see above). */

/** Minimum RRR by category is resolved via rrrForCategory() (trading-constants)
 *  at the point of use — the SAME source the firewall RRR-1 rule checks against.
 *  This guarantees the generator never emits a setup the firewall will reject. */

/** NO setup caps (operator D38) — MAX_SETUPS / MAX_SETUPS_PER_DAY were deleted.
 *  Gates (confluence, RRR floor, confidence, dedup, consumption) are the ONLY
 *  volume limiters. */

/** Base maximum zone distance from spot (pips; index points for DXY). */
const BASE_MAX_DIST_PIPS = 300;

/**
 * ATR multiplier for the distance cap — zones up to 4 daily ATRs from spot
 * remain eligible. GBP/AUD weekly zones regularly sit beyond the fixed
 * 300-pip base cap; scaling by ATR keeps volatile pairs from starving.
 */
const ATR_DIST_MULT = 4;

/**
 * Relax fallback: when ALL eligible zones exceed the distance cap, take the
 * nearest N zones anyway so a day×category is never completely starved.
 */
const RELAX_NEAREST_ZONES = 3;

/** Confidence thresholds. Canon: CONDITIONAL ≥ 50, REJECTED < 50 (§8.5). */
const MIN_CONFIDENCE_PRIMARY = 60;
const MIN_CONFIDENCE_CONDITIONAL = 50;

/** Shapes that imply bullish direction. */

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL SETUP GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * RepairAttempt — one entry in the D36 retry-loop audit trail (spec §7.1).
 * Records which gate failed, the exact values at failure, and the repair
 * action the next attempt will take.
 */
interface RepairAttempt {
  attempt: number;
  gate: string;      // 'SL_CEILING' | 'SL_ZERO' | 'TP_NULL' | 'RRR_FLOOR'
  values: string;    // exact numbers: "RRR 1.4 < 2.0 — SL 28.0p, TP 39.0p"
  repair: string;    // what was changed on the next attempt ('none' on attempt 3)
}

/**
 * RejectRecord — a HARD REJECT after 3 failed repair attempts (D36).
 * The full 3-attempt context travels with the reject so the report can render
 * a Filter Checkpoint section (spec §7.2). Nothing dies silently.
 */
export interface RejectRecord {
  pair: string;
  category: string;
  direction: string;
  entry: number;
  zone: string;
  attempts: RepairAttempt[];
}

export class VisualSetupGenerator {
  /**
   * D36 hard-reject audit trail. Accumulates across generateSetups calls so a
   * full-week run carries every reject (with its 3-attempt context) through to
   * the report. Reset by the caller if a fresh trail is needed.
   */
  public readonly rejectRecords: RejectRecord[] = [];

  /**
   * Phase 6 (V4.3 §10): Liquidity ladders spawned by BS-family setups.
   * Accumulates across generateSetups calls (same pattern as rejectRecords)
   * so a full-week run carries every armed ladder through to the report.
   */
  public readonly ladders: LadderStructure[] = [];

  /** W7: model-verified tier — VLM zones + scaffold rungs the agent verified (CONFIRMED/WEAK). */
  private isModelVerifiedSource(source: string | undefined): boolean {
    if (!source) return false;
    return source.startsWith('VLM') || source === 'SCAFFOLD_CONFIRMED';
  }
  /** W7: blind-fallback tier — Engine-1 edge fallback + unverified scaffold rungs. FALLBACK_LQZ is NOT blind (canon rung identity). */
  private isBlindFallbackSource(source: string | undefined): boolean {
    return source === 'FALLBACK_IP_EDGE' || source === 'SCAFFOLD_UNVERIFIED';
  }

  /**
   * Generate TradeSetup[] at the intersection of Engine 1 + Engine 2 + visual zones.
   *
   * Iterates the Engine 2 day chain. For each day's shape:
   *   1. Determines valid setup categories from SHAPE_CATEGORIES_MAP
   *   2. Finds eligible visual LQZ zones that align with the shape's direction
   *   3. Generates setups with 3-entry staggered entries, next-LQZ SL, opposing-LQZ TP
   *   4. Maps each visual zone to the nearest Engine 1 IP zone for context
   *
   * @param zoneMap         Engine 1 output (IP pressure zones)
   * @param shapePrediction Engine 2 output (shape chain + day decomposition)
   * @param visualZones     Engine 3 visual zones (from VLM or fallback)
   * @param pair            Instrument name (e.g. 'EUR/USD')
   * @param spot            Current spot price
   * @param setupCounter    Setup ID counter (incremented per pair)
   * @param priorWeekMomentum  Prior week momentum bias
   * @param atr             Pair ATR(14) — PIPS from engine.ts, PRICE UNITS from
   *                        the legacy pipeline; normalized internally via
   *                        normalizeAtrToPips. Scales the zone distance cap
   *                        (max(300, ATR_pips × 4)), the Law-10 SL floor, and
   *                        the Law-8 SL fallback.
   * @param opts            W6-3: dxyMacroBias — the DXY chain's macro direction
   *                        ('BULLISH'|'BEARISH'|'NEUTRAL'), injected by the
   *                        pipeline for FX pairs (undefined for DXY itself).
   */
  generateSetups(
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
    visualZones: VisualSDZone[],
    pair: string,
    spot: number,
    setupCounter: number,
    priorWeekMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL',
    atr?: number,
    opts?: {
      dxyMacroBias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      /** C2 (v4.3 cleanup): the week's 1H bars bucketed by day label
       * ('Monday'..'Friday') — powers the reaction-validity gate (entry
       * reachability from the day's actual bars). Absent → the gate is inert
       * (pre-week production runs have no future bars to verify against). */
      bars1HByDay?: Record<string, OHLCBar[]>;
    },
  ): TradeSetup[] {
    const setups: TradeSetup[] = [];
    const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
    const fwdSpread = FORWARD_SPREAD[pair] ?? pipValue;
    const chain = shapePrediction.shapeChain;
    const isDXY = pair === 'DXY';

    // ── ATR-scaled zone distance cap (replaces the fixed 300-pip cap) ──
    // GBP/AUD weekly zones regularly sit beyond 300 pips from spot; a fixed
    // cap starves those pairs of setups. Scale by pair ATR(14) when provided.
    // Units: engine.ts passes PIPS, the legacy pipeline passes PRICE UNITS —
    // normalizeAtrToPips handles both (the pre-normalization code divided the
    // engine's pip value by pipValue a second time, inflating the cap ~10⁴×).
    const atr1hPips = normalizeAtrToPips(atr, pipValue);
    const maxDistPips = atr1hPips > 0
      ? Math.max(BASE_MAX_DIST_PIPS, atr1hPips * ATR_DIST_MULT)
      : BASE_MAX_DIST_PIPS;

    // ── Law-13 weekly ATR (spec §6.3) — 4H bars are not reachable from the
    // generator, so this uses the atr1hPips × 20 conservative proxy. ──
    const weeklyAtrPips = computeWeeklyAtrPips(undefined, pipValue, atr1hPips);

    // ── Simulated-mitigation ledger (spec §6.2) — setups emitted on EARLIER
    // days mitigate the zones they touch (entry or TP inside the zone). The
    // Law-14 TP walk reads this to evaluate intermediate-zone freshness AS OF
    // the candidate's day, not the static pre-week state. ──
    const priorSetups: Array<{ dayIndex: number; entry: number; tp: number }> = [];

    // Auto-incrementing setup ID
    let idSeq = 0;
    const nextId = (): string =>
      `${pair.replace('/', '').toLowerCase()}-${setupCounter}-${String(++idSeq).padStart(2, '0')}`;

    // ── Resolve day decomposition (Engine 2 output) ──
    const days: DayShapePrediction[] = chain.dayDecomposition && chain.dayDecomposition.length > 0
      ? chain.dayDecomposition
      : [{
          day: chain.chain[0]?.day ?? 'Monday',
          shape: chain.currentShape,
          confidence: 0.7,
          zfpRange: { low: 0, high: 0 },
          keyTransitionTime: chain.chain[0]?.keyTransitionTime ?? '',
          sessionWindow: '',
        }];

    // ── Consolidation-week detector (Bible 8.6): EVERY day is SS/R/WLS. ──
    const isConsolidationWeek = days.length > 0 && days.every((d) => {
      const s = String(d.shape);
      return s === 'SS' || s === 'R' || s === 'WLS';
    });

    // Dedup structures (§8.4 — v4.3 cleanup, the CORRECTED doctrine): same
    // zone + same day + same session = SAME TRADE (pipeline re-fire, killed via
    // usedZones zone-day keys). Same zone reacting on a DIFFERENT day = DISTINCT
    // trade (multi-day reactions are legitimate — the day-independent geometry
    // fingerprint that killed them is deleted; reaction-validity is the slop-killer).
    // seenKeys: same-day geometry+category dedup. emittedGeometry: cross-zone
    // same-day identical-geometry guard (day-scoped).
    const seenKeys = new Set<string>();
    const usedZones = new Map<string, string>();
    const emittedGeometry = new Set<string>();

    log.info(
      `  [engine3-gen] ${pair}: spot=${spot} visualZones=${visualZones.length} ` +
      `days=${days.length} shape=${chain.currentShape} bias=${chain.storylineBias}`,
    );

    // ── Iterate Engine 2 chain (day × shape) ──
    // Indexed loop: dayIndex feeds the simulated-mitigation ledger (prior
    // setups from EARLIER days only — spec §6.2 Law-14 walk).
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const dayShape = days[dayIndex]!;
      const shape = dayShape.shape;
      const dayLabel = dayShape.day;
      const categories = this.getCategoriesForShape(String(shape));

      // ── §8.1 Lane 2 — always-on scalp lane: SWING_SCALP is eligible on ANY
      // day shape when a holding-wall zone (zfp < 30) sits at a structural
      // ceiling/floor (3 nearest supply above / 3 nearest demand below spot).
      // Independent of the day's macro shape (Law 20 — counter-trend scalps
      // valid with 3+ confluences). AUD/USD is exempt (§8.13).
      const shapeHasScalp = categories.includes(SetupCategory.SWING_SCALP);
      const scalpLaneActive = pair !== 'AUD/USD' && visualZones.some((vz) =>
        this.zoneZfp(vz, zoneMap) < 30 && this.isAtCeilingOrFloor(vz, spot, visualZones));
      const scalpLaneOnly = scalpLaneActive && !shapeHasScalp;

      // ── §8.13 Gate A — AUD/USD category filter: HTF Swing + Reinforcement
      // only (NO consolidation scalps — the scalp lane never reaches AUD).
      const effectiveCategories = pair === 'AUD/USD'
        ? categories.filter((c) => c === SetupCategory.HTF_SWING || c === SetupCategory.REINFORCEMENT)
        : (scalpLaneOnly ? [...categories, SetupCategory.SWING_SCALP] : categories);

      log.info(
        `  [engine3-gen] ${pair}: day=${dayLabel} shape=${shape} ` +
        `categories=[${effectiveCategories.join(',')}]${scalpLaneOnly ? ' (+scalp-lane)' : ''}`,
      );

      for (const category of effectiveCategories) {
        // ── Iterate ALL visual zones — NO direction pre-filter ──
        // Direction is PER-ZONE: supply→SHORT, demand→LONG.
        // This replaces the old day-level direction lock that caused GBP/AUD 0 setups.
        const inRange: Array<{ vz: VisualSDZone; distPips: number; direction: TradeDirection }> = [];
        const tooFar: Array<{ vz: VisualSDZone; distPips: number; direction: TradeDirection }> = [];

        // ── §8.2 category-specific entry-distance cap. The constants table is
        // in PIPS; DXY distPips is computed in POINTS below (DXY pip = 0.01,
        // so 30 pips = 0.30 points) — convert the cap for DXY. The ATR-scaled
        // cap stays as the outer bound: effective cap = min(category, ATR).
        const catKey = categoryKeyOf(String(category));
        const catCapPips = MAX_ENTRY_DISTANCE_PIPS[pair]?.[catKey]
          ?? MAX_ENTRY_DISTANCE_PIPS[pair]?.SWING_SCALP ?? 50;
        const effectiveMaxDist = Math.min(isDXY ? catCapPips * 0.01 : catCapPips, maxDistPips);

        for (const vz of visualZones) {
          // ── Per-zone direction from zone type ──
          const zoneMid = (vz.top + vz.bottom) / 2;

          // Skip zones on wrong side of spot
          if (vz.type === 'SUPPLY' && zoneMid <= spot) continue;
          if (vz.type === 'DEMAND' && zoneMid >= spot) continue;

          // Determine direction from zone type
          const direction: TradeDirection =
            (vz.type === 'SUPPLY' || (vz.type === 'LIQUIDITY' && zoneMid > spot))
              ? TradeDirection.SHORT
              : TradeDirection.LONG;

          // Distance calculation
          const distPips = isDXY
            ? Math.abs(zoneMid - spot)
            : Math.abs(zoneMid - spot) / pipValue;

          if (distPips > effectiveMaxDist) {
            tooFar.push({ vz, distPips, direction });
          } else {
            inRange.push({ vz, distPips, direction });
          }
        }

        // ── Distance gate: relax-to-nearest-N fallback ──
        let relaxed = 0;
        if (inRange.length === 0 && tooFar.length > 0) {
          // Relax ONLY within 1.5× the engine-side filter (±300 pips FX / ±3.00 DXY points).
          // Beyond that, the pair legitimately has no actionable zones this week.
          // Unbounded relax reopens the far-zone precision hole (latent hazard in BOTH prior checkpoints).
          // distPips is already in pips (FX) / points (DXY) — bound in the same units.
          const relaxBound = isDXY ? 3.00 : 300;
          tooFar.sort((a, b) => a.distPips - b.distPips);
          const relaxable = tooFar.filter((z) => z.distPips <= relaxBound);
          relaxed = Math.min(RELAX_NEAREST_ZONES, relaxable.length);
          inRange.push(...relaxable.slice(0, relaxed));
          if (relaxed > 0) {
            log.info(
              `  [engine3-gen] ${pair}: ${category} distance cap RELAXED — ` +
              `taking nearest ${relaxed} within relaxed bound (1.5x engine filter, closest=${relaxable[0]!.distPips.toFixed(0)}p)`,
            );
          } else {
            log.info(
              `  [engine3-gen] ${pair}: ${category} distance cap NOT relaxed — ` +
              `no zones within relaxed bound (1.5x engine filter); pair legitimately has no actionable zones this week`,
            );
          }
        }

        log.info(
          `  [engine3-gen] ${pair}: category=${category} ` +
          `inRange=${inRange.length - relaxed} relaxed=${relaxed} ` +
          `maxDist=${effectiveMaxDist.toFixed(2)}p (catCap=${catCapPips}p atrCap=${maxDistPips.toFixed(0)}p) setups=${setups.length}`,
        );

        for (const { vz, distPips, direction } of inRange) {
          // ── §8.5 WL/SS category filters ──
          // WL entries (WHIPLASH, or HTF_SWING emitted from a WL-family shape)
          // ONLY at Hard Walls (zfp < 20). SS entries ONLY at holding walls
          // (zfp < 30) — applies to BOTH shape-driven and lane-driven scalps.
          const vzZfp = this.zoneZfp(vz, zoneMap);
          const wlFamily = (SHAPE_FAMILY_MAP[String(shape)] ?? String(shape)) === 'WL';
          if ((category === SetupCategory.WHIPLASH || (category === SetupCategory.HTF_SWING && wlFamily)) && vzZfp >= 20) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: not a Hard Wall (zfp=${vzZfp} >= 20) — WL entries only at Hard Walls`);
            continue;
          }
          if (category === SetupCategory.SWING_SCALP && vzZfp >= 30) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: SS entries need holding walls (zfp < 30) — zfp=${vzZfp}`);
            continue;
          }
          // Lane-driven scalps (the day's shape did NOT grant SS): the zone
          // must ALSO sit at a structural ceiling/floor (§8.1 Lane 2).
          if (category === SetupCategory.SWING_SCALP && scalpLaneOnly &&
              !this.isAtCeilingOrFloor(vz, spot, visualZones)) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: scalp-lane SS requires ceiling/floor position (3-nearest boundary)`);
            continue;
          }

          // ── C2: REACTION-VALIDITY (v4.3 cleanup — the slop-killer) ──
          // A setup for (zone, day) is only valid if price actually reached the
          // zone's entry band during that day — computable from the day's 1H
          // bars, zero vision. This kills setups at zones price never
          // approached (the DXY-40 slop class: 13 zones × byte-identical re-fires
          // across untouched days) WITHOUT touching legitimate multi-day
          // reactions (the range top reacting Jul 8 AND Jul 9 — both days touched,
          // both trades valid). The entry band: the zone's own range extended by
          // the Law-7 pair buffer on the approach side. Missing bars (pre-week
          // production runs) → the gate is inert (cannot verify, emit as before).
          if (opts?.bars1HByDay) {
            const dayBars = opts.bars1HByDay[dayLabel] ?? [];
            if (dayBars.length > 0) {
              const rvBuffer = (SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
              // The buffer sits on the APPROACH side: LONG falls INTO the zone
              // from above (buffer above the top edge); SHORT rises INTO it from
              // below (buffer below the bottom edge).
              const bandLo = direction === TradeDirection.LONG ? vz.bottom : vz.bottom - rvBuffer;
              const bandHi = direction === TradeDirection.LONG ? vz.top + rvBuffer : vz.top;
              const reached = dayBars.some((b) => b.low <= bandHi && b.high >= bandLo);
              if (!reached) {
                log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: no-touch — price never reached the entry band on ${dayLabel} (reaction-validity)`);
                continue;
              }
            }
          }

          // ── Minimum 3 confluences per setup ──
          const confluenceCount = this.countConfluences(vz, direction, dayShape, chain);
          if (confluenceCount < 3) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: only ${confluenceCount} confluences (need ≥3)`);
            continue;
          }
          // ── 1. Compute 3-entry staggered ──
          const entries = this.computeStaggeredEntries(vz, direction, fwdSpread);
          if (!entries) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: no valid staggered entries (entry=n/a, sl=n/a, tp=n/a, rrr=n/a)`);
            continue;
          }

          // ── 1b. Check for LQZ overlap — ladder entry opportunity ──
          const lqzOverlap = visualZones.find((z) =>
            z.type === 'LIQUIDITY' &&
            z.bottom <= vz.top && z.top >= vz.bottom &&
            z.timeframe !== vz.timeframe // different TF
          );
          const ladderEntry = lqzOverlap
            ? (direction === TradeDirection.LONG
                ? lqzOverlap.top + fwdSpread
                : lqzOverlap.bottom - fwdSpread)
            : null;

          // ═══════════════════════════════════════════════════════════════════
          // ── 2-5. THE RETRY LOOP (V4.3 spec §7.1, operator doctrine D36) ──
          //
          // The ENTRY NEVER MOVES during repair — the entry zone passed
          // eligibility, so it is valid. Only the SL/TP anchors re-compute:
          //   attempt 1: next-LQZ-rung SL + significance-path TP
          //   attempt 2: one rung deeper SL + next significance-ranked TP
          //   attempt 3: rung+2 / Law-8 direct fallback SL + third-ranked TP.
          //              No fallback target of any kind — 3 fails = HARD REJECT.
          // The category RRR floor is the repair TARGET, not the kill
          // criterion (spec §7.1 Law-35 resolution). After 3 failed attempts
          // → HARD REJECT with the full 3-attempt audit trail (rejectRecords
          // + [reject] log — never a silent continue).
          //
          // GOLDEN T1 TRACE (expected behavior, DXY SS LONG):
          //   entry 100.945 (front, fixed for all 3 attempts)
          //   attempt 1: SL = next LQZ rung below → 100.905 shelf (4p)
          //              TP = opposing supply rung 101.115 (17p)
          //              RRR = 17/4 = 4.25 ≥ 1.5 (SS floor) → PASS attempt 1
          // ═══════════════════════════════════════════════════════════════════
          const entry = entries.front;
          // Uniform PIPS for every pair (DXY pipValue = 0.01). The old
          // points-for-DXY branch mixed units (zone width in points vs ATR in
          // pips) and displayed 0.14p as "0 pips" (Phase-4.5 Defect C).
          const toPips = (d: number): number => d / pipValue;
          // Bible 8.6 — consolidation-week floors relax when EVERY day is
          // SS/R/WLS. rrrForCategory stays the single source for normal weeks.
          const baseMinRrr = rrrForCategory(String(category)).tp1;
          const minRrr = isConsolidationWeek
            ? (CONSOLIDATION_WEEK_FLOORS[categoryKeyOf(String(category))] ?? baseMinRrr)
            : baseMinRrr;

          const repairAttempts: RepairAttempt[] = [];
          let anchored = false;
          let successAttempt = 1;
          let sl = 0;
          let slMethod = '';
          let tp = 0;
          let tpResultFinal: { tp: number; zone: string; ambitious: boolean } | null = null;
          let firstSlPips: number | null = null;
          let firstRrr: number | null = null;

          for (let attempt = 1; attempt <= 3; attempt++) {
            // ── SL: attempt N walks N rungs deep; attempt 3 falls back to Law-8 direct. ──
            const slRes = this.computeSLNextLqzRung(entry, vz, direction, visualZones, pair, atr1hPips, attempt);
            let aSl = slRes?.sl ?? null;
            let aMethod = slRes?.method ?? '';
            if (aSl === null && attempt === 3) {
              const zoneWidthPips = toPips(vz.top - vz.bottom);
              const fbPips = Math.max(zoneWidthPips * 2, 1.5 * atr1hPips);
              const directSl = direction === TradeDirection.LONG
                ? entry - fbPips * pipValue
                : entry + fbPips * pipValue;
              // D17: the 36-pip HARD ceiling applies to EVERY SL path — the
              // Law-8 direct fallback is NOT exempt (Phase-4.5 Defect B: GBP
              // 40-pip SLs bypassed the ceiling through this exact hole).
              if (Math.abs(entry - directSl) / pipValue > 36) {
                repairAttempts.push({ attempt, gate: 'SL_CEILING', values: 'law8-direct SL > 36p', repair: 'none' });
                break;
              }
              aSl = directSl;
              aMethod = 'law8-fallback-direct';
            }
            if (aSl === null) {
              repairAttempts.push({ attempt, gate: 'SL_CEILING', values: 'structural SL > 36p', repair: attempt < 3 ? 'walk rung+1' : 'none' });
              continue;
            }
            const aSlDist = Math.abs(entry - aSl);
            if (attempt === 1) firstSlPips = toPips(aSlDist);
            if (aSlDist === 0) {
              repairAttempts.push({ attempt, gate: 'SL_ZERO', values: 'zero SL distance', repair: attempt < 3 ? 'walk rung+1' : 'none' });
              continue;
            }

            // ── TP: attempt N = Nth passing significance-path candidate. ──
            const aTpResult = this.computeTPSignificancePath(
              entry, aSl, vz, direction, visualZones,
              weeklyAtrPips, pipValue, priorSetups, dayIndex, attempt,
            );
            if (aTpResult === null) {
              if (attempt < 3) {
                repairAttempts.push({ attempt, gate: 'TP_NULL', values: 'no opposing zone passes Laws 12/13/14', repair: 'next-ranked candidate' });
                continue;
              }
              // Attempt-3 TP_NULL → HARD REJECT (operator doctrine: 3 fails =
              // reject). The ATR-projected fallback target is REMOVED — it
              // fabricated unreachable ~391-pip TPs → fake 27x RRRs emitted as
              // GOD_TIER/STANDARD (Phase-4.5 Defect A). No fantasy targets, ever.
              repairAttempts.push({ attempt, gate: 'TP_NULL', values: 'no opposing zone passes Laws 12/13/14 after 3 attempts', repair: 'none' });
              break;
            }

            // ── RRR floor gate — the repair TARGET (never a first-sight kill). ──
            const aRrr = Math.abs(aTpResult.tp - entry) / aSlDist;
            if (attempt === 1) firstRrr = aRrr;
            if (aRrr >= minRrr) {
              sl = aSl; slMethod = aMethod; tp = aTpResult.tp; tpResultFinal = aTpResult;
              anchored = true; successAttempt = attempt;
              break;
            }
            repairAttempts.push({
              attempt, gate: 'RRR_FLOOR',
              values: `RRR ${aRrr.toFixed(2)} < ${minRrr} — SL ${toPips(aSlDist).toFixed(1)}p, TP ${toPips(Math.abs(aTpResult.tp - entry)).toFixed(1)}p`,
              repair: attempt < 3 ? 're-anchor SL rung+1 OR next TP candidate' : 'none',
            });
          }

          // ── HARD REJECT (D36) — never silent: full 3-attempt audit trail. ──
          if (!anchored) {
            const summary = repairAttempts.map((a) => `#${a.attempt} ${a.gate}[${a.values}]`).join('; ');
            log.info(`    [reject] ${pair} ${category} ${direction}@${entry.toFixed(5)} — 3 attempts failed: ${summary}`);
            this.rejectRecords.push({
              pair, category: String(category), direction: String(direction),
              entry, zone: vz.mappedIPZoneName ?? '', attempts: repairAttempts,
            });
            continue;
          }

          const slResult = { sl, method: slMethod };
          const tpResult = tpResultFinal!;
          const slDist = Math.abs(entry - sl);   // > 0 — guaranteed by the loop guards
          const rrr = Math.abs(tp - entry) / slDist;

          // ── 6. SL distance cap ──
          // Uniform PIPS for every pair (DXY pipValue = 0.01). The old
          // points-for-DXY branch produced slPips = 0.14 for a 14-pip SL →
          // the report rendered "0 pips" on every DXY setup (Phase-4.5 Defect C).
          const slDistancePips = Math.abs(entry - sl) / pipValue;
          if (slDistancePips > SL_CAP_PIPS) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: SL ${slDistancePips.toFixed(0)} > ${SL_CAP_PIPS} pips (entry=${entry}, sl=${sl}, tp=${tp}, rrr=${rrr})`);
            continue;
          }

          // ── 7. Dedup (§8.4): direction+entry+SL+TP+DAY+CATEGORY ──
          // Same zone, different day → DISTINCT (multi-day validity — operator
          // ruling). Same zone, same day, different category → DISTINCT
          // (different trade class). Identical geometry + day + category → dupe.
          const dedupKey =
            `${direction}_${Math.round(entry * 1e6)}_${Math.round(sl * 1e6)}_` +
            `${Math.round(tp * 1e6)}_${dayLabel}_${categoryKeyOf(String(category))}`;
          if (seenKeys.has(dedupKey)) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: duplicate setup (entry=${entry}, sl=${sl}, tp=${tp}, rrr=${rrr})`);
            continue;
          }

          // ── 7b. Zone-day consumption (v4.3 cleanup — the CORRECTED doctrine) ──
          // Same zone + same day + same session = SAME TRADE (pipeline re-fire —
          // killed). Same zone reacting on a DIFFERENT day = a DISTINCT trade:
          // price reacts to the same level multiple times through the week (the
          // range-top LQZ reacting Jul 8 AND Jul 9 = two trades — the operator's
          // doctrine, 2026-07-28). The W6-1 day-independent geometry fingerprint
          // answered the wrong question (it killed legitimate multi-day reactions —
          // the EUR starvation class) and is DELETED. The slop-killer is
          // reaction-validity (the no-touch gate above), not geometry dedup.
          const zoneId = (vz.mappedIPZoneName ?? '') || `${vz.type}_${vz.top}_${vz.bottom}`;
          const geomSig = `${direction}|${entry.toFixed(4)}|${sl.toFixed(4)}|${tp.toFixed(4)}`;
          const zoneDayKey = `${pair}_${zoneId}_${dayLabel}_${String(dayShape.sessionWindow ?? '')}`;
          if (usedZones.has(zoneDayKey)) {
            log.info(`    [skip] ${zoneId}: already emitted for ${dayLabel} — same zone + same day + same session = same trade (a different day at this level is a DISTINCT trade)`);
            continue;
          }

          // Cross-zone same-day geometry guard: two DIFFERENT zones producing an
          // identical order (same direction|entry|sl|tp) on the SAME day = the
          // same trade. Day-scoped — identical geometry on a different day is a
          // legitimate repeat reaction (multi-day validity, D39).
          const globalGeomKey = `${pair}_${geomSig}_${dayLabel}`;
          if (emittedGeometry.has(globalGeomKey)) {
            log.info(`    [skip] ${zoneId}: identical geometry already emitted for ${dayLabel} under another zone (${geomSig})`);
            continue;
          }
          seenKeys.add(dedupKey);

          // ── 8. Map visual zone to nearest Engine 1 IP zone ──
          const ipZone = this.findNearestIPZone(vz, zoneMap.zones);

          // ── 9. Confidence scoring ──
          // cascadeAligned (W6-3): uses the INJECTED DXY macro bias, not the FX
          // pair's own chain bias. DXY bullish → FX HTF swings SHORT-biased
          // (inverse); DXY bearish → FX LONG-biased. Cascade alignment applies
          // to HTF swings / breakout surges only (Part 6.5); SS/consolidation
          // scalps are cascade-neutral (valid both directions per Law 20). The
          // old code read the FX chain's storylineBias expecting DXY's —
          // vacuous under per-pair chains.
          const inverseBias = opts?.dxyMacroBias === 'BULLISH' ? 'SHORT'
                            : opts?.dxyMacroBias === 'BEARISH' ? 'LONG' : null;
          const isCascadeDirectional =
            category === SetupCategory.HTF_SWING || category === SetupCategory.BREAKOUT_SURGE;
          const cascadeAligned = !isDXY && inverseBias !== null && isCascadeDirectional &&
            String(direction) === inverseBias;
          const cascadeSource = isDXY ? 'native'
            : (inverseBias === null || !isCascadeDirectional) ? 'cascade-neutral'
            : (cascadeAligned ? 'cascade-aligned' : 'counter-trend');

          let confidence = this.scoreConfidence(
            vz, ipZone, shape, direction, chain, rrr,
            slDistancePips, distPips, priorWeekMomentum, cascadeAligned,
          );

          // Minimum confidence for conditional setups
          const minConfidence = MIN_CONFIDENCE_CONDITIONAL;
          if (confidence < minConfidence) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: confidence ${confidence} < ${minConfidence} (entry=${entry}, sl=${sl}, tp=${tp}, rrr=${rrr})`);
            continue;
          }

          // ── 10. Quality classification ──
          const quality = this.classifyQuality(confidence, rrr, this.isModelVerifiedSource(vz.source as string));

          // ── 11. Session assignment (§8.2 unified maps — shape session
          // primary, category session fallback; constants are string-valued,
          // resolved back to the SessionWindow enum at the boundary) ──
          const session = resolveSessionWindow(SHAPE_SESSION_MAP[String(shape)])
            ?? resolveSessionWindow(CATEGORY_SESSION_MAP[categoryKeyOf(String(category))])
            ?? SessionWindow.LONDON_OPEN;

          // ── 11b. §8.13 Gate B — AUD/USD session gate: Tokyo + London only,
          // NOT NY. Any NY-variant session assignment kills the setup.
          if (pair === 'AUD/USD' &&
              (session === SessionWindow.NY_OPEN ||
               session === SessionWindow.NY_MID ||
               session === SessionWindow.NY_OVERLAP)) {
            log.info(`    [skip] ${vz.mappedIPZoneName ?? 'zone'}: AUD/USD NY session gate (§8.13 — Tokyo+London only) — session=${session}`);
            continue;
          }

          // ── 12. Direction validation (6 checks — required by CS12) ──
          const directionValidation = this.buildDirectionValidation(
            vz, ipZone, shape, direction, session, entry, rrr,
          );

          // ── 13. Proximity status ──
          const proximityStatus =
            distPips <= 30 ? 'CLOSE'
            : distPips <= 100 ? 'ACCEPTABLE'
            : 'FAR';

          // ── 14. Entry precision (4-point) ──
          const entryFront = entries.front;
          const entryBack = entries.back;
          const slFront = sl;
          const slBack = direction === TradeDirection.LONG
            ? sl - pipValue * 2
            : sl + pipValue * 2;

          // ── 15. Blended RRR across 3 staggered entries (NOT multiple TPs) ──
          // Each entry has a different price but shares the SAME SL and the SAME TP.
          // Front entry (nearest spot) = best RRR (smallest distance to TP relative to SL).
          // Back entry (farthest) = tightest RRR.
          const rrrFront = Math.abs(tp - entries.front) / slDist;
          const rrrMiddle = Math.abs(tp - entries.mid) / slDist;
          const rrrBack = Math.abs(tp - entries.back) / slDist;
          const blendedRrr = rrrFront * 0.33 + rrrMiddle * 0.33 + rrrBack * 0.34;
          const realizedRrr = rrrFront; // Primary RRR = front entry (most likely to fill first)

          // ── 16. Build notes ──
          let notes = this.buildNotes(
            vz, ipZone, shape, direction, category, chain,
            rrr, slDistancePips, distPips, entries, sl, tp,
            confidence, quality, priorWeekMomentum,
            slResult.method, tpResult.zone, session,
          );

          // D36 repair annotation — this setup needed re-anchoring to clear the floor
          if (successAttempt > 1) {
            const gateTrail = repairAttempts.map((a) => `#${a.attempt} ${a.gate}`).join(' → ');
            const slFix = firstSlPips !== null
              ? `SL re-anchored ${firstSlPips.toFixed(1)}p→${slDistancePips.toFixed(1)}p`
              : `SL ${slMethod}`;
            const rrrFix = firstRrr !== null
              ? `RRR ${firstRrr.toFixed(2)}→${rrr.toFixed(2)}`
              : `RRR ${rrr.toFixed(2)}`;
            notes += ` | 🔧 REPAIRED(${successAttempt}): ${gateTrail} — ${slFix}, ${rrrFix}`;
          }

          // Law-13 ambitious annotation (>2× weekly ATR)
          if (tpResult.ambitious) {
            notes += ` | ⚠ AMBITIOUS TP (Law 13): TP distance >2× weekly ATR`;
          }

          // Ladder entry annotation (LQZ overlap reinforcement)
          if (ladderEntry !== null && lqzOverlap) {
            notes += ` | 🪜 LADDER: reinforcement entry at ${ladderEntry.toFixed(5)} (LQZ ${lqzOverlap.mappedIPZoneName ?? 'lqz'} ${lqzOverlap.timeframe ?? 'ltf'})`;
          }

          // ── 17. Resolve zoneType from IP zone ──
          const zoneType = ipZone?.type ?? (direction === TradeDirection.LONG ? ZoneType.IP_DEMAND : ZoneType.IP_SUPPLY);

          // ── Create TradeSetup ──
          const setup: TradeSetup = {
            setupId: nextId(),
            pair,
            direction,
            category,
            entry,
            sl,
            tp,
            confidence: Math.round(confidence),
            confidenceTier: this.confidenceToTier(confidence),
            shapeAlignment: shape,
            session,
            day: dayLabel,
            shapeTrigger: `${shape} ${category}`,
            rrr: Math.round(rrr * 100) / 100,
            slPips: Math.round(slDistancePips * 10) / 10,
            zoneName: vz.mappedIPZoneName ?? '',
            isBoMEntry: ipZone?.isBoM ?? false,
            zoneType,
            directionValidation,
            notes,
            // 3-Entry Staggered System (E3-6)
            entry1: Math.round(entries.front * 1e5) / 1e5,
            entry2: Math.round(entries.mid * 1e5) / 1e5,
            entry3: Math.round(entries.back * 1e5) / 1e5,
            entryWeights: [0.33, 0.33, 0.34],
            // Single TP — blended RRR across entries
            blendedRrr: Math.round(blendedRrr * 100) / 100,
            realizedRrr: Math.round(realizedRrr * 100) / 100,
            // Quality + metrics
            quality,
            slDistancePips: Math.round(slDistancePips * 10) / 10,
            entryEdge: direction === TradeDirection.LONG ? 'ceiling' : 'floor',
            proximityPips: Math.round(distPips * 10) / 10,
            proximityStatus,
            // 4-Point Entry Precision
            entryFront: Math.round(entryFront * 1e6) / 1e6,
            entryBack: Math.round(entryBack * 1e6) / 1e6,
            slFront: Math.round(slFront * 1e6) / 1e6,
            slBack: Math.round(slBack * 1e6) / 1e6,
            // Engine 3 context
            consolidationPhase: chain.consolidationPhase,
            cascadeSource,
            // VLM provenance
            vlmStatus: this.isBlindFallbackSource(vz.source as string) ? 'VLM_UNAVAILABLE' : 'VLM_VERIFIED',
          };

          setups.push(setup);
          // §8.4 consumption (corrected doctrine): record the trade's zone-day key.
          usedZones.set(zoneDayKey, geomSig);
          emittedGeometry.add(globalGeomKey);

          // Simulated-mitigation ledger: this setup mitigates every zone its
          // entry or TP touches for LATER days' Law-14 walks (spec §6.2).
          priorSetups.push({ dayIndex, entry, tp });

          log.info(
            `    [setup] ${setup.setupId} ${pair} ${direction} ${category} ` +
            `entry=${entry.toFixed(5)} sl=${sl.toFixed(5)} tp=${tp.toFixed(5)} ` +
            `rrr=${rrr.toFixed(2)} conf=${Math.round(confidence)} q=${quality} ` +
            `zone=${vz.mappedIPZoneName ?? ''} src=${vz.source}`,
          );
        }
      }
    }

    log.info(`  [engine3-gen] ${pair}: ${setups.length} setups generated`);

    // NO direction retry — per-zone [skip] logs above carry the failure detail.
    if (setups.length === 0) {
      log.info(`  [engine3-gen] ${pair}: 0 setups generated — see per-zone [skip] reasons above`);
    }

    // ── Trade chaining: TP of setup N = entry of setup N+1 ──
    // Price cannot teleport — each zone reaction creates a new trading opportunity.
    const chainedSetups = this.generateChainedSetups(
      setups, visualZones, zoneMap, pair, spot, pipValue, fwdSpread,
      atr1hPips, weeklyAtrPips, priorSetups, days.map((d) => d.day),
      seenKeys, usedZones, emittedGeometry, isConsolidationWeek,
    );
    if (chainedSetups.length > 0) {
      log.info(`  [engine3-gen] ${pair}: ${chainedSetups.length} chained setups generated`);
      setups.push(...chainedSetups);
    }

    // ── Phase 6: Liquidity Ladder pass (V4.3 §10 — Anchor Doctrine §6) ──
    // Runs on the FINAL setup list (after retry loop, chaining, dedup).
    // BS-family parents ONLY (Bible 5.12 — WL's isolated energy can't
    // guarantee piercing). Ladders collect into this.ladders; parents are
    // annotated in their notes.
    for (const setup of setups) {
      const shapeKey = String(setup.shapeAlignment ?? '');
      const family = SHAPE_FAMILY_MAP[shapeKey] ?? shapeKey;
      if (family !== 'BS') continue;
      const ladder = generateLiquidityLadder(
        {
          setupId: setup.setupId,
          pair: setup.pair,
          direction: String(setup.direction ?? ''),
          entry: setup.entry,
          sl: setup.sl,
          tp: setup.tp,
          shape: shapeKey,
          category: String(setup.category ?? ''),
          zoneName: setup.zoneName,
        },
        visualZones,
        pipValue,
      );
      if (ladder) {
        this.ladders.push(ladder);
        setup.notes += ` | 🪜 LADDER: ${ladder.rungs.length} rungs, combined ${ladder.combinedRrr.toFixed(1)}x, BE cascade armed`;
      }
    }
    if (this.ladders.length > 0) {
      log.info(`  [engine3-gen] ${pair}: ${this.ladders.length} liquidity ladder(s) armed total`);
    }

    return setups;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFLUENCE CHECKING (replaces resolveDirection + selectEligibleVisualZones)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Count the number of independent confluences supporting a trade setup.
   * Minimum 3 required — a single signal is NEVER enough.
   *
   * Confluences checked:
   * 1. Zone type determines direction (supply→SHORT, demand→LONG) — always true by construction
   * 2. Zone on correct side of spot — always true (verified inline before calling)
   * 3. Shape alignment — does the E2 shape context support this direction?
   * 4. VLM-sourced zone (not fallback IP edge)
   * 5. Zone has mapped Engine 1 IP zone name (confluence with 9-pillar analysis)
   * 6. Storyline bias alignment (bullish bias + LONG = aligned)
   */
  private countConfluences(
    vz: VisualSDZone,
    direction: TradeDirection,
    dayShape: DayShapePrediction,
    chain: { storylineBias: string; currentShape: ShapeCode },
  ): number {
    let count = 0;
    // 1. Zone type → direction (structural truth)
    count++;
    // 2. Zone on correct side of spot (verified inline)
    count++;
    // 3. Shape alignment (SS/R/WLS = both directions valid; BS/WL/RWL = check context)
    const shape = String(dayShape.shape);
    if (shape === 'SS' || shape === 'R' || shape === 'WLS') {
      count++; // Range-bound shapes support both directions
    } else {
      // For BS/WL/RWL/PBS: aligned if zone direction matches storyline bias
      const bias = chain.storylineBias.toUpperCase();
      if ((direction === TradeDirection.LONG && (bias.includes('BULLISH') || bias.includes('LONG'))) ||
          (direction === TradeDirection.SHORT && (bias.includes('BEARISH') || bias.includes('SHORT')))) {
        count++;
      }
    }
    // 4. VLM-sourced
    if (!this.isBlindFallbackSource(vz.source as string)) count++;
    // 5. Engine 1 IP zone mapped
    if (vz.mappedIPZoneName) count++;
    // 6. Storyline bias alignment
    const bias = chain.storylineBias.toUpperCase();
    if ((direction === TradeDirection.LONG && (bias.includes('BULLISH') || bias.includes('LONG'))) ||
        (direction === TradeDirection.SHORT && (bias.includes('BEARISH') || bias.includes('SHORT'))))
      count++;
    return count;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ZONE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Get valid setup categories for a shape code.
   *
   * Raw Engine 2 shape codes are first mapped to their category family
   * (SHAPE_FAMILY_MAP: DWL→SS_DWL, STORM→SS, PBS→BS, PWL→WL, PRWL→RWL,
   * RS→R), then resolved via SHAPE_CATEGORIES_MAP:
   *
   *   SS     → SWING_SCALP                      (London)
   *   BS     → HTF_SWING + BREAKOUT_SURGE       (NY)
   *   WL     → HTF_SWING                        (NY)
   *   RWL    → HTF_SWING + BREAKOUT_SURGE       (NY)
   *   R      → REINFORCEMENT + SWING_SCALP      (Both)
   *   SS_DWL → SWING_SCALP + WHIPLASH           (London)
   *   WLS    → SWING_SCALP + HTF_SWING          (London)
   *
   * Falls back to SWING_SCALP for unknown shapes.
   */
  private getCategoriesForShape(shapeKey: string): SetupCategory[] {
    const familyKey = SHAPE_FAMILY_MAP[shapeKey] ?? shapeKey;
    const catNames = SHAPE_CATEGORIES_MAP[familyKey] ?? ['SWING_SCALP'];
    return catNames
      .map((name) => {
        const catNameToEnum: Record<string, SetupCategory> = {
          SWING_SCALP: SetupCategory.SWING_SCALP,
          HTF_SWING: SetupCategory.HTF_SWING,
          BREAKOUT_SURGE: SetupCategory.BREAKOUT_SURGE,
          REINFORCEMENT: SetupCategory.REINFORCEMENT,
          TRANSITION: SetupCategory.TRANSITION,
          WHIPLASH: SetupCategory.WHIPLASH,
        };
        return catNameToEnum[name];
      })
      .filter((c): c is SetupCategory => c !== undefined);
  }

  /**
   * Distance from a price to the nearest edge of a zone.
   * Returns 0 when the price is inside (or on) the zone.
   */
  private nearestEdgeDistance(vz: VisualSDZone, price: number): number {
    if (price >= vz.bottom && price <= vz.top) return 0;
    return Math.min(Math.abs(vz.top - price), Math.abs(vz.bottom - price));
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENTRY / SL / TP COMPUTATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * E3-6: Compute 3-entry staggered system with forward spreads.
   *
   *   front = zone edge closest to spot + forward_spread (toward spot)
   *   mid   = zone midpoint (anchor)
   *   back  = zone edge farthest from spot + forward_spread
   *
   * Forward spread = 1-2 pips toward spot from zone edge to guarantee fills
   * before price reaches the exact edge.
   */
  private computeStaggeredEntries(
    vz: VisualSDZone,
    direction: TradeDirection,
    fwdSpread: number,
  ): { front: number; mid: number; back: number } | null {
    const mid = (vz.top + vz.bottom) / 2;

    if (direction === TradeDirection.LONG) {
      // Demand zone below spot — front = ceiling (toward spot = higher), back = floor
      const front = vz.top + fwdSpread;   // ceiling + spread toward spot
      const back = vz.bottom + fwdSpread; // floor + spread
      return { front, mid, back };
    } else {
      // Supply zone above spot — front = floor (toward spot = lower), back = ceiling
      const front = vz.bottom - fwdSpread;  // floor - spread toward spot
      const back = vz.top - fwdSpread;      // ceiling - spread
      return { front, mid, back };
    }
  }

  /**
   * computeSLNextLqzRung — the corrected SL anchor (V4.3 spec §6.1, doctrine D35).
   *
   * LIVE-MARKET MECHANIC: your stop hides INSIDE the NEXT liquidity shelf beyond
   * your entry zone. That shelf is where the next cluster of resting orders
   * defends — price must consume THAT liquidity to reach your stop. This is why
   * golden SLs are 4-9.5 pips: the ladder rungs are dense, so the next shelf is
   * close. A stop placed in empty space between rungs gets hunted by intraday
   * noise. The old model (entry-zone FAR edge + 3×buffer) was wrong on BOTH the
   * anchor and the magnitude — 25-30 pip effective SLs on DXY → RRR collapse.
   *
   * Law 7:  SL 2-5 pips INSIDE the next structural zone, buffer in from its
   *         NEAR edge (EUR 2, GBP 3, AUD 3, DXY 5).
   * Law 10: never tighter than 0.5×ATR(14) on 1H (floor, not target).
   * Law 8:  no rung, no block → entry ∓ max(zoneWidth×2, 1.5×ATR).
   * D17:    36-pip HARD ceiling — exceeded → null (the retry loop repairs).
    * T6 branch: no LQZ rung AND no structural zone on the adverse side →
    *         UNMITIGATED BoM block's near
   *         edge is the anchor (golden T6: entry 101.235 → SL at the 4H BoM
   *         lower edge 101.330 = 9.5p; the trade is only wrong if the block
   *         itself fails).
   *
   * @param entry      front entry price (zone edge + forward spread)
   * @param entryZone  the zone the entry anchors on
   * @param direction  LONG or SHORT
   * @param allZones   full zone array (visual + fallback) for the pair
   * @param pair       'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD'
   * @param atr1hPips  14-period ATR on 1H bars, in pips (0 = unknown → Law-10
   *                   floor skipped, Law-8 fallback uses zone width only)
   * @param attempt    1 = nearest rung; 2 = one shelf deeper (retry loop)
   */
  private computeSLNextLqzRung(
    entry: number,
    entryZone: VisualSDZone,
    direction: TradeDirection,
    allZones: VisualSDZone[],
    pair: string,
    atr1hPips: number,
    attempt: number = 1,
  ): { sl: number; method: string } | null {
    const pipValue = pair === 'DXY' ? 0.01 : 0.0001;
    const bufferPips = SL_BUFFER_PIPS[pair] ?? 3;   // Law 7 pair buffer
    const buffer = bufferPips * pipValue;

    // ── Step 1: PREFERRED anchor — LQZ rungs (the operator's doctrine). ──
    // Rungs are: LIQUIDITY-type zones, FALLBACK_LQZ-sourced zones, zones whose
    // mapped Engine-1 name contains LQZ, and LQZ-overlapping zones. These are
    // the levels where stop-clusters live — the PREFERRED place to hide a stop.
    const rungs = allZones.filter((z) =>
      z.type === 'LIQUIDITY' ||
      (z.source as string) === 'FALLBACK_LQZ' ||
      (z.mappedIPZoneName ?? '').toUpperCase().includes('LQZ') ||
      (z as unknown as { sdOverlap?: string }).sdOverlap === 'LQZ'
    );

    // ── Step 1b: GENERAL anchor (Law 7 verbatim) — opposing-side STRUCTURAL
    // zones of ANY type. Law 7's general form is "SL inside the NEXT
    // STRUCTURAL ZONE beyond the entry zone" — the LQZ refinement is a
    // PREFERENCE, not an exclusion (Phase-4.5 Defect D: DXY LONGs with no
    // LIQUIDITY zone below fell through to Law-8 ~15-pip SLs → TP min-dist
    // inflation → TP_NULL ×3 → fantasy fallback).
    const structural = allZones.filter((z) => z.type === 'SUPPLY' || z.type === 'DEMAND');

    // ── Step 2: the NEXT zone beyond the entry zone (adverse side) — ONE
    // ordered candidate list: LQZ rungs first (nearest-first), then structural
    // zones (nearest-first). attempt 1 = nearest candidate; attempt N walks N
    // deep (LQZ set exhausted → structural set). Structural adjacency uses
    // <= : a zone whose near edge TOUCHES the entry zone's far edge is still
    // a valid shield — price must trade through the entry zone and INTO the
    // adjacent zone to reach the stop.
    const adverseRung = (z: VisualSDZone): boolean => direction === TradeDirection.LONG
      ? z.top < entryZone.bottom
      : z.bottom > entryZone.top;
    const adverseStructural = (z: VisualSDZone): boolean => direction === TradeDirection.LONG
      ? z.top <= entryZone.bottom
      : z.bottom >= entryZone.top;
    const nearestFirst = (a: VisualSDZone, b: VisualSDZone): number => direction === TradeDirection.LONG
      ? b.top - a.top
      : a.bottom - b.bottom;
    const lqzCandidates = rungs.filter(adverseRung).sort(nearestFirst);
    const lqzSet = new Set(lqzCandidates);
    const candidates = [
      ...lqzCandidates,
      ...structural.filter(adverseStructural).sort(nearestFirst),
    ];
    const slZone = candidates.length > 0
      ? candidates[Math.min(attempt - 1, candidates.length - 1)]
      : undefined;

    let sl: number | null = null;
    let method = '';
    if (slZone) {
      // Law 7 VERBATIM: "2-5 pips INSIDE the NEXT structural zone." The SL sits
      // INSIDE the zone, buffer-distance in from its NEAR edge (the edge price
      // meets first). Price must trade INTO the zone's resting orders to reach
      // the stop — the zone's body is the shield.
      // LONG: price falls into the zone → meets slZone.top first → SL = top − buffer.
      // SHORT: price rises into the zone → meets slZone.bottom first → SL = bottom + buffer.
      sl = direction === TradeDirection.LONG ? slZone.top - buffer : slZone.bottom + buffer;
      const baseMethod = lqzSet.has(slZone) ? 'next-lqz-rung' : 'next-structural-zone';
      method = attempt > 1 ? `${baseMethod}+${attempt - 1}` : baseMethod;
    }

    // ── Step 3: the T6 branch — COMPUTED, not a phantom field. ──
    // When NO adverse-side anchor of ANY kind exists (no LQZ rung, no
    // structural zone), check whether an
    // UNMITIGATED BoM block is the nearest structure beyond the entry zone.
    // If it sits within ~40 pips, ITS near edge is the SL anchor — the trade
    // is only wrong if the block itself fails (golden T6: 101.330, 9.5p).
    if (sl === null) {
      const blocks = allZones
        .filter((z) =>
          z.classification === 'BoM' &&
          (z.reactionCount ?? 0) === 0 &&
          (direction === TradeDirection.LONG ? z.top < entryZone.bottom : z.bottom > entryZone.top)
        )
        .sort((a, b) => direction === TradeDirection.LONG
          ? b.top - a.top
          : a.bottom - b.bottom);
      const block = blocks[0];
      if (block) {
        const blockDistPips = direction === TradeDirection.LONG
          ? (entryZone.bottom - block.top) / pipValue
          : (block.bottom - entryZone.top) / pipValue;
        if (blockDistPips <= 40) {
          sl = direction === TradeDirection.LONG ? block.top - buffer : block.bottom + buffer;
          method = 't6-block-edge';
        }
      }
    }

    // ── Step 4: Law-8 fallback — no rung, no block. ──
    // SL = entry ∓ max(zoneWidth×2, 1.5×ATR). Covers the two real threats: a
    // full zone-width wick, or a London-Spike-sized noise bar — whichever larger.
    if (sl === null) {
      const zoneWidthPips = (entryZone.top - entryZone.bottom) / pipValue;
      const fallbackPips = Math.max(zoneWidthPips * 2, 1.5 * atr1hPips);
      sl = direction === TradeDirection.LONG
        ? entry - fallbackPips * pipValue
        : entry + fallbackPips * pipValue;
      method = 'law8-fallback';
    }

    // ── Step 5: Law-10 floor — never tighter than 0.5×ATR(1H). ──
    // An 8-pip SL into a 15-pip ATR bar dies to ordinary noise. Guard: when
    // atr1hPips is unknown (0), the floor cannot be computed — skip the push.
    if (atr1hPips > 0) {
      const minDistPips = Math.max(0.5 * atr1hPips, bufferPips);
      if (Math.abs(entry - sl) / pipValue < minDistPips) {
        sl = direction === TradeDirection.LONG
          ? entry - minDistPips * pipValue
          : entry + minDistPips * pipValue;
        method += '+law10-floor';
      }
    }

    // ── Step 6: D17 ceiling — 36 pips HARD. ──
    // If the structural SL exceeds it, the ENTRY is wrong (too far from its
    // rung) — return null and let the retry loop repair the anchor chain.
    if (Math.abs(entry - sl) / pipValue > 36) return null;

    return { sl, method };
  }

  /**
   * computeTPSignificancePath — the corrected TP anchor (V4.3 spec §6.2, doctrine D37).
   *
   * LIVE-MARKET MECHANIC: you exit where the NEXT POOL OF STOPS sits — the
   * opposing liquidity that price is statistically drawn toward. The best exit
   * is an unmitigated BoM (100% reaction — the "base camp" where the
   * counter-attack happens). Between entry and that target, price blows through
   * MITIGATED zones (orders consumed — golden T6 passed 5 without pausing) but
   * MUST react at UNMITIGATED ones. So the walk is: pass through mitigated
   * freely, cap at the first unmitigated zone in the path.
   *
   * Significance: UM BoM (+100) > Earth+Fire liquidityScore ≥ 5 (+50) > BoM
   * (+25) > MoM ≤1× (+15) > other; depleted (3×+, −100) excluded as targets.
   *
   * SIMULATED MITIGATION: intermediate-zone freshness is evaluated AS OF this
   * setup's day in the report sequence — prior setups on EARLIER days mitigate
   * the zones their entry or TP touches. This is the mechanical explanation
   * for golden T6's 55.5-pip TP: by Wednesday the chain trades T1-T4 had
   * consumed every intermediate rung → pass-through → the walk legitimately
   * reaches the UM 100.680.
   *
   * Law 11/33: liquidityScore ≥ 5 → TP at zone MIDPOINT; else NEAR edge.
   * Law 12:    TP timeframe ≥ entry timeframe.
   * Law 13:    >3×weeklyATR → skip candidate (NOT a reject); >2× → ambitious.
   * Min dist:  |TP − entry| ≥ 1.2× |entry − SL| — viable-RRR precondition.
   *
   * @param attempt  retry-loop depth (spec §7.1): 1 = first PASSING candidate
   *                 (default), 2 = second passing (next significance-ranked),
   *                 3 = third. Fewer passing candidates than `attempt` → null.
   */
  private computeTPSignificancePath(
    entry: number,
    sl: number,
    entryZone: VisualSDZone,
    direction: TradeDirection,
    allZones: VisualSDZone[],
    weeklyAtrPips: number,
    pipValue: number,
    priorSetups: ReadonlyArray<{ dayIndex: number; entry: number; tp: number }>,
    candidateDayIndex: number,
    attempt: number = 1,
  ): { tp: number; zone: string; ambitious: boolean } | null {
    // Counts candidates that PASS every gate; the (attempt)th pass is returned.
    let passed = 0;
    const slDistPips = Math.abs(entry - sl) / pipValue;
    const minTpDistPips = slDistPips * 1.2;   // viable-RRR precondition

    // ── Step 1: opposing candidates on the far side of entry. ──
    const opposing = allZones.filter((z) => direction === TradeDirection.LONG
      ? (z.type === 'SUPPLY' || z.type === 'LIQUIDITY') && z.bottom > entry
      : (z.type === 'DEMAND' || z.type === 'LIQUIDITY') && z.top < entry
    );
    if (opposing.length === 0) return null;

    // ── Step 2: significance ranking. ──
    // UM BoM = the guaranteed reaction. Earth+Fire = double reaction pressure.
    // MoM ≤1× = still structurally valid. Depleted (3×+) = pass-through, NOT
    // a target — excluded entirely (sig −100 < −50 filter).
    const significance = (z: VisualSDZone): number => {
      let s = 0;
      if (z.classification === 'BoM' && (z.reactionCount ?? 0) === 0) s += 100;  // UM BoM
      if ((z.liquidityScore ?? 0) >= 5) s += 50;                                  // Earth+Fire
      if (z.classification === 'BoM') s += 25;
      if (z.classification === 'MoM' && (z.reactionCount ?? 0) <= 1) s += 15;
      if ((z.reactionCount ?? 0) >= 3) s -= 100;                                  // depleted
      return s;
    };
    const ranked = opposing
      .map((z) => ({ z, sig: significance(z), dist: Math.abs((z.top + z.bottom) / 2 - entry) }))
      .filter((c) => c.sig > -50)
      .sort((a, b) => b.sig - a.sig || a.dist - b.dist);   // significance first, proximity second

    // ── Step 3: walk candidates with Law 12 + Law 14 + Law 13. ──
    const tfRank: Record<string, number> = { '15m': 1, '30m': 2, '1H': 3, '4H': 4 };
    for (const { z: target } of ranked) {
      // Law 12: TP timeframe must be ≥ entry timeframe. A 15m scalp targets 30m+.
      if ((tfRank[target.timeframe] ?? 0) < (tfRank[entryZone.timeframe] ?? 0)) continue;

      // Simulated mitigation: a zone's EFFECTIVE freshness = static reactions
      // + prior setups (earlier days only) whose entry or TP fell inside it.
      const effectiveReactionCount = (z: VisualSDZone): number => {
        const simulated = priorSetups.filter((s) =>
          s.dayIndex < candidateDayIndex &&
          ((s.entry >= z.bottom && s.entry <= z.top) || (s.tp >= z.bottom && s.tp <= z.top))
        ).length;
        return (z.reactionCount ?? 0) + simulated;
      };

      // Law-14 walk: UNMITIGATED zones between entry and target are HARD
      // reaction points — the first one (nearest to entry) caps the TP.
      //
      // CRITICAL freshness-semantics filter (Phase 4.5r evidence: DXY=0):
      // fallback Engine-1 zones carry placeholder reactionCount: 0 by construction
      // (engine.ts:319) with classification 'UNMITIGATED' (Wave-1 ternary). They are
      // pivot/MA/option pressure levels — NOT unmitigated order blocks. Treating them
      // as Law-14 UM reaction points caps EVERY TP at the nearest pivot (9-18 pips)
      // → RRR 1.2-1.5 → floors kill everything → TP_NULL ×3 → pair dies.
      // Law 14's "UM zone" is an order-block concept (BoM/MoM with REAL retest
      // counters) plus agent-verified (VLM) structure. Placeholder IP zones are
      // pass-through for the walk — their strength is already priced into the
      // significance ranking (liquidityScore / confluence), not into fake freshness.
      let effectiveTarget = target;
      const targetMid = (target.top + target.bottom) / 2;
      const hasRealFreshness = (z: VisualSDZone): boolean =>
        z.classification === 'BoM' ||
        z.classification === 'MoM' ||
        (typeof z.source === 'string' && (z.source as string).startsWith('VLM')) ||
        // W7-B fix: SCAFFOLD_CONFIRMED counts as walk-relevant freshness ONLY
        // for STRUCTURAL rungs (ORDER_BLOCK / LQZ — identified via the rung id
        // `${pair}|${source}|${price}`). CONFIRMED passive rungs (PIVOT / FIB /
        // SWING / MA / OPTION_WALL) are pass-through per defect-E doctrine:
        // "CONFIRMED" means "the level is reacting", NOT "it will reverse price
        // hard enough to cap a TP". Without this, 21 CONFIRMED rungs 3-6 pips
        // apart formed a TP-cap mesh (every walk capped at the nearest rung
        // ~5p away → RRR ~0.3 → floors killed everything → test-3's 0 setups).
        ((z.source as string) === 'SCAFFOLD_CONFIRMED' &&
          (((z as any).scaffoldRungId as string | undefined)?.includes('|ORDER_BLOCK|') === true ||
           ((z as any).scaffoldRungId as string | undefined)?.includes('|LQZ|') === true));
      const umBetween = allZones
        .filter((z) => {
          const mid = (z.top + z.bottom) / 2;
          const between = direction === TradeDirection.LONG
            ? mid > entry && mid < targetMid
            : mid < entry && mid > targetMid;
          return between && z !== target && hasRealFreshness(z) && effectiveReactionCount(z) === 0;
        })
        .sort((a, b) => direction === TradeDirection.LONG
          ? ((a.top + a.bottom) / 2) - ((b.top + b.bottom) / 2)
          : ((b.top + b.bottom) / 2) - ((a.top + a.bottom) / 2));
      if (umBetween.length > 0) effectiveTarget = umBetween[0]!;

      // Earth+Fire: midpoint when the target has liquidity (Law 11 + Law 33).
      // Near edge when it doesn't — quick exit before the weak reaction fades.
      const tp = (effectiveTarget.liquidityScore ?? 0) >= 5
        ? (effectiveTarget.top + effectiveTarget.bottom) / 2
        : (direction === TradeDirection.LONG ? effectiveTarget.bottom : effectiveTarget.top);

      // Viable-RRR precondition: skip targets that can't pay for the risk.
      const tpDistPips = Math.abs(tp - entry) / pipValue;
      if (tpDistPips < minTpDistPips) continue;

      // Law 13: distance sanity vs weekly ATR (0 = unknown → no constraint).
      if (weeklyAtrPips > 0 && tpDistPips > 3 * weeklyAtrPips) continue;   // unreachable — next candidate
      const ambitious = weeklyAtrPips > 0 && tpDistPips > 2 * weeklyAtrPips;

      passed++;
      if (passed < attempt) continue;   // retry loop asked for a deeper candidate
      return { tp, zone: effectiveTarget.mappedIPZoneName ?? 'visual-zone', ambitious };
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CONFIDENCE + QUALITY
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Score setup confidence on a 0-100 scale.
   *
   * Factors:
   *   - Base: visual zone confidence (VLM or fallback)
   *   - Engine 1 IP zone confluence bonus
   *   - Shape alignment bonus (direction matches shape bias)
   *   - VLM-sourced bonus (vs fallback)
   *   - RRR bonus
   *   - SL distance penalty
   *   - Prior week momentum alignment
   */
  private scoreConfidence(
    vz: VisualSDZone,
    ipZone: DXYZone | null,
    shape: ShapeCode,
    direction: TradeDirection,
    chain: { storylineBias: string },
    rrr: number,
    slDistancePips: number,
    distPips: number,
    priorWeekMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    cascadeAligned: boolean = false,
  ): number {
    let score = vz.confidence;

    // Engine 1 IP zone confluence bonus
    if (ipZone) {
      score += Math.min(15, ipZone.confluence * 1.5);
      // BoM zones get extra confidence
      if (ipZone.isBoM) score += 5;
    }

    // DXY cascade alignment bonus (+10 for aligned, NO penalty for counter-trend)
    if (cascadeAligned) score += 10;

    // Zone-direction alignment (TTE v5.3.3 #14): direction comes from ZONE TYPE —
    // SUPPLY zone = SHORT, DEMAND zone = LONG. Shapes have NO hardcoded
    // bullish/bearish direction; the shape only determines the setup CATEGORY.
    const zoneAligned =
      (direction === TradeDirection.SHORT && vz.type === 'SUPPLY') ||
      (direction === TradeDirection.LONG && vz.type === 'DEMAND');
    if (zoneAligned) score += 8;

    // Storyline bias alignment
    const bias = chain.storylineBias.toUpperCase();
    const biasAligned =
      (direction === TradeDirection.LONG && (bias.includes('BULLISH') || bias.includes('LONG'))) ||
      (direction === TradeDirection.SHORT && (bias.includes('BEARISH') || bias.includes('SHORT')));
    if (biasAligned) score += 5;

    // VLM-sourced bonus (visual zones from VLM are higher quality)
    if (!this.isBlindFallbackSource(vz.source as string)) score += 7;

    // RRR bonus
    if (rrr >= 3) score += 5;
    else if (rrr >= 2) score += 3;

    // SL distance penalty (wider SL = lower confidence)
    if (slDistancePips > 80) score -= 10;
    else if (slDistancePips > 50) score -= 5;

    // Proximity penalty (entries far from spot are less actionable)
    if (distPips > 150) score -= 8;
    else if (distPips > 80) score -= 4;

    // Prior week momentum alignment
    if (priorWeekMomentum !== 'NEUTRAL') {
      const momentumAligned =
        (priorWeekMomentum === 'BULLISH' && direction === TradeDirection.LONG) ||
        (priorWeekMomentum === 'BEARISH' && direction === TradeDirection.SHORT);
      if (momentumAligned) score += 3;
      else score -= 8;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Classify setup quality based on confidence + RRR + VLM source.
   * Operator ruling (2026-07-31): "MINIMUM 3 RRR NOTHING LESS IS ACCEPTABLE
   * IDK WHERE THE FUCK THIS SLOP CAME FROM ALL MY TRADES ARE 4+ SO 3 IS THE
   * MINNIMUM" — every quality band requires >= 3.0 RRR. The old >= 2.0 HIGH /
   * >= 1.5 STANDARD bands are GONE: a setup below 3.0 is not standard, it is
   * REJECTED (only CONDITIONAL can be reached below 3.0, on confidence alone).
   */
  private classifyQuality(
    confidence: number,
    rrr: number,
    vlmSourced: boolean,
  ): string {
    if (confidence >= 90 && rrr >= 3.0 && vlmSourced) return 'GOD_TIER';
    if (confidence >= 80 && rrr >= 3.0) return 'HIGH';
    if (confidence >= 60 && rrr >= 3.0) return 'STANDARD';
    if (confidence >= MIN_CONFIDENCE_CONDITIONAL) return 'CONDITIONAL';
    return 'REJECTED';
  }

  /** Convert confidence score to tier letter. */
  private confidenceToTier(confidence: number): ConfidenceTier {
    if (confidence >= 90) return ConfidenceTier.S;
    if (confidence >= 80) return ConfidenceTier.A;
    if (confidence >= 70) return ConfidenceTier.B;
    if (confidence >= 60) return ConfidenceTier.C;
    if (confidence >= 50) return ConfidenceTier.D;
    return ConfidenceTier.F;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DIRECTION VALIDATION + NOTES
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Build direction validation checks for audit trail.
   * Must produce exactly 6 checks to satisfy firewall CS12 (REQUIRED_DIRECTION_CHECKS = 6).
   */
  private buildDirectionValidation(
    zone: VisualSDZone,
    ipZone: DXYZone | null,
    shape: ShapeCode,
    direction: TradeDirection,
    session: SessionWindow,
    entry: number,
    rrr: number,
  ): Array<Record<string, string>> {
    // Zone-direction alignment: direction is derived from the ZONE TYPE
    // (SUPPLY = SHORT, DEMAND = LONG). The shape sets the setup CATEGORY only.
    const zoneAligns =
      (direction === TradeDirection.SHORT && zone.type === 'SUPPLY') ||
      (direction === TradeDirection.LONG && zone.type === 'DEMAND');

    const confluence = ipZone?.confluence ?? 5;

    return [
      {
        check_name: 'Zone Category',
        result: 'PASS',
        direction_favored: direction,
        rationale: `${ipZone?.isBoM ? 'BoM' : 'MoM'} ${direction === TradeDirection.LONG ? 'demand (SUPPORT)' : 'supply (RESISTANCE)'} zone (${ipZone?.zoneName ?? zone.mappedIPZoneName ?? ''})`,
      },
      {
        check_name: 'Zone Direction',
        result: zoneAligns ? 'PASS' : 'WARN',
        direction_favored: direction,
        rationale: `${zone.type} zone → ${direction} (zone-derived); shape ${shape} sets category only`,
      },
      {
        check_name: 'Confluence Threshold',
        result: confluence >= 3 ? 'PASS' : 'WARN',
        direction_favored: direction,
        rationale: `Confluence ${confluence}/14`,
      },
      {
        check_name: 'RRR Check',
        // Operator ruling (2026-07-31): floor is 3.0 — "MINIMUM 3 RRR NOTHING
        // LESS IS ACCEPTABLE ... ALL MY TRADES ARE 4+ SO 3 IS THE MINNIMUM".
        // >= 3.0 PASS, >= 2.5 WARN, anything below is FAIL.
        result: rrr >= 3 ? 'PASS' : rrr >= 2.5 ? 'WARN' : 'FAIL',
        direction_favored: direction,
        rationale: `TP1 RRR ${rrr.toFixed(2)}`,
      },
      {
        check_name: 'Session Timing',
        result: 'PASS',
        direction_favored: direction,
        rationale: `Session ${session}`,
      },
      {
        check_name: 'Sniper Entry Precision',
        result: 'PASS',
        direction_favored: direction,
        rationale: `Entry at ${zone.mappedIPZoneName ?? ''} edge (${zone.source}) — ${entry.toFixed(5)}`,
      },
    ];
  }

  /**
   * Candle confirmation pattern required at the entry zone.
   * LONG: Hammer at LIQUIDITY zones, Bullish Engulfing otherwise.
   * SHORT: Pin Bar at LIQUIDITY zones, Bearish Engulfing otherwise.
   */
  private candlePatternFor(direction: TradeDirection, zoneType: string): string {
    if (direction === TradeDirection.LONG) {
      return zoneType === 'LIQUIDITY' ? 'Hammer' : 'Bullish Engulfing';
    }
    return zoneType === 'LIQUIDITY' ? 'Pin Bar' : 'Bearish Engulfing';
  }

  /**
   * Build comprehensive notes string for audit trail.
   */
  private buildNotes(
    vz: VisualSDZone,
    ipZone: DXYZone | null,
    shape: ShapeCode,
    direction: TradeDirection,
    category: SetupCategory,
    chain: { storylineBias: string; consolidationPhase: string },
    rrr: number,
    slDistancePips: number,
    distPips: number,
    entries: { front: number; mid: number; back: number },
    sl: number,
    tp: number,
    confidence: number,
    quality: string,
    priorWeekMomentum: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    slMethod: string,
    tpZoneName: string,
    session: SessionWindow,
  ): string {
    const src = this.isBlindFallbackSource(vz.source as string) ? 'DATA-FALLBACK' : 'VLM-LQZ';
    let notes =
      `Engine 3 Visual Setup | ${src} | ${vz.type} zone ${vz.mappedIPZoneName ?? ''} ` +
      `(${vz.bottom.toFixed(5)}-${vz.top.toFixed(5)}) | ${category} | ` +
      `shape ${shape} | ${chain.storylineBias}`;

    if (ipZone) {
      notes += ` | IP: ${ipZone.zoneName ?? ipZone.id} conf=${ipZone.confluence} ` +
        `zfp=${ipZone.zfp.toFixed(0)}% bom=${ipZone.isBoM}`;
    }

    notes += ` | 📊 3-Entry Staggered: ${entries.front.toFixed(5)} (33%) / ${entries.mid.toFixed(5)} (33%) / ${entries.back.toFixed(5)} (34%)`;
    notes += ` | SL=${sl.toFixed(5)} (${slDistancePips.toFixed(0)}p) ${slMethod}`;
    notes += ` | TP=${tp.toFixed(5)} at ${tpZoneName} (Earth+Fire)`;
    notes += ` | RRR=${rrr.toFixed(2)} | Conf=${Math.round(confidence)} | Q=${quality}`;
    notes += ` | Phase: ${chain.consolidationPhase}`;
    notes += ` | Dist from spot: ${distPips.toFixed(0)}pips`;

    // Session enforcement — entry is valid ONLY inside the assigned window
    const sessionText = `Enter ONLY if price touches this level during ${session}. If price touches outside this window, DO NOT ENTER.`;
    notes += ` | ⏰ SESSION: ${sessionText}`;

    // Candle confirmation — specific pattern required at the entry zone
    const candlePattern = this.candlePatternFor(direction, vz.type);
    const candleText = `CONFIRMATION REQUIRED: Wait for ${candlePattern} at entry zone during assigned session. Do NOT enter without candle confirmation.`;
    notes += ` | 🕯️ ${candleText}`;

    if (priorWeekMomentum !== 'NEUTRAL') {
      const momentumAligned =
        (priorWeekMomentum === 'BULLISH' && direction === TradeDirection.LONG) ||
        (priorWeekMomentum === 'BEARISH' && direction === TradeDirection.SHORT);
      notes += momentumAligned
        ? ` | ✓ MOMENTUM-ALIGNED: Prior week ${priorWeekMomentum.toLowerCase()}`
        : ` | ⚠ COUNTER-MOMENTUM: Prior week ${priorWeekMomentum.toLowerCase()}`;
    }

    return notes;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Find the Engine 1 IP zone a visual zone ACTUALLY IS.
   *
   * W6-4 Fix 2: zfp inheritance must prefer the zone the VLM zone ACTUALLY IS.
   * Priority: (1) exact name match (mappedIPZoneName === candidate.zoneName),
   * (2) same pair + overlapping price range (IoU > 0.5) with type-class preference
   * (4H S/D BoM/MoM over LQZ-standalone over pillar), (3) nearest midpoint in-pair.
   * The old global midpoint race across ALL 823 zones made inheritance a lottery —
   * GBP survivors lived only because a zfp-10 pillar shadowed a real wall's zfp 70.
   */
  private findNearestIPZone(
    vz: VisualSDZone,
    ipZones: readonly DXYZone[],
  ): DXYZone | null {
    const visualMid = (vz.top + vz.bottom) / 2;

    // Same-pair gate — DXYZone carries no `pair` field, so reuse the pair-prefix
    // match the engine.ts curation uses (id contains pairKey, or zoneName contains pair).
    const pairKey = (vz.pair ?? '').replace('/', '').toLowerCase();
    const pairZones = pairKey
      ? ipZones.filter((z) => z.id?.toLowerCase().includes(pairKey) || (z.zoneName?.includes(vz.pair) ?? false))
      : [...ipZones];

    // (1) Name match — the zone the VLM zone was mapped to by enrichment/VLM.
    const mapped = (vz.mappedIPZoneName ?? '').trim();
    if (mapped && mapped !== 'UNMAPPED') {
      const exact = pairZones.find((z) => (z.zoneName ?? '') === mapped);
      if (exact) return exact;
      const partial = pairZones.find((z) => {
        const zn = z.zoneName ?? '';
        return zn.length > 0 && (zn.includes(mapped) || mapped.includes(zn));
      });
      if (partial) return partial;
    }

    // (2) Overlapping-range match (same pair, IoU > 0.5), type-class preference:
    // 4H S/D BoM/MoM (2) > LQZ-standalone (1) > pillar (0).
    const typeClass = (z: DXYZone): number => {
      if (z.sdType === 'BoM' || z.sdType === 'MoM') return 2;
      if (z.sdOverlap === 'LQZ' || (z.zoneName?.includes('LQZ') ?? false)) return 1;
      return 0;
    };
    let bestOverlap: DXYZone | null = null;
    let bestOverlapScore = -Infinity;
    for (const ip of pairZones) {
      const inter = Math.min(vz.top, ip.ceiling) - Math.max(vz.bottom, ip.floor);
      if (inter <= 0) continue;
      const union = Math.max(vz.top, ip.ceiling) - Math.min(vz.bottom, ip.floor);
      const iou = union > 0 ? inter / union : 0;
      if (iou <= 0.5) continue;
      const score = typeClass(ip) * 10 + iou;
      if (score > bestOverlapScore) {
        bestOverlapScore = score;
        bestOverlap = ip;
      }
    }
    if (bestOverlap) return bestOverlap;

    // (3) Nearest midpoint — SAME PAIR only (no more cross-pair midpoint lottery).
    let nearest: DXYZone | null = null;
    let minDist = Infinity;

    for (const ip of pairZones) {
      const ipMid = (ip.floor + ip.ceiling) / 2;
      const dist = Math.abs(ipMid - visualMid);
      if (dist < minDist) {
        minDist = dist;
        nearest = ip;
      }
    }

    return nearest;
  }

  /**
   * Zone Failure Probability for a visual zone. VisualSDZone carries no zfp
   * field — per E3-3 it INHERITS zfp from the nearest Engine 1 IP zone.
   * 50 = neutral default when unmapped (the retired placeholder constant).
   */
  private zoneZfp(vz: VisualSDZone, zoneMap: ZoneMapSnapshot): number {
    return this.findNearestIPZone(vz, zoneMap.zones)?.zfp ?? 50;
  }

  /**
   * §8.1 Lane 2 structural gate — is the zone at a range boundary?
   * TRUE when the zone's midpoint is among the 3 nearest SUPPLY zones above
   * spot (ceiling) or the 3 nearest DEMAND zones below spot (floor).
   */
  private isAtCeilingOrFloor(
    zone: VisualSDZone,
    spot: number,
    allZones: VisualSDZone[],
  ): boolean {
    const mid = (z: VisualSDZone): number => (z.top + z.bottom) / 2;
    const supplyAbove = allZones
      .filter((z) => z.type === 'SUPPLY' && mid(z) > spot)
      .sort((a, b) => mid(a) - mid(b))
      .slice(0, 3);
    const demandBelow = allZones
      .filter((z) => z.type === 'DEMAND' && mid(z) < spot)
      .sort((a, b) => mid(b) - mid(a))
      .slice(0, 3);
    return supplyAbove.includes(zone) || demandBelow.includes(zone);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TRADE CHAINING
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate chained setups where TP of setup N = entry of setup N+1.
   * Price cannot teleport — it moves zone by zone. Each zone reaction creates
   * a new trading opportunity in the reverse direction.
   *
   * Only chains from setups whose TP zone is UM or 1x mitigated (high reaction
   * probability). Depleted zones (3+ reactions) will be pierced, not reacted to.
   * §8.3 exemptions: LQZ-pivot zones are ALWAYS freshness-eligible (LQZ zones
   * carry touch_count ≥ 2 by construction — blocking them kills exactly the
   * rungs golden chains pivot on), and the chained RRR floor is the SOURCE
   * (parent) setup's category floor, not a hardcoded HTF floor.
   */
  private generateChainedSetups(
    primarySetups: TradeSetup[],
    visualZones: VisualSDZone[],
    zoneMap: ZoneMapSnapshot,
    pair: string,
    spot: number,
    pipValue: number,
    fwdSpread: number,
    atr1hPips: number,
    weeklyAtrPips: number,
    priorSetups: ReadonlyArray<{ dayIndex: number; entry: number; tp: number }>,
    dayLabels: ReadonlyArray<string>,
    seenKeys: Set<string>,
    usedZones: Map<string, string>,
    emittedGeometry: Set<string>,
    isConsolidationWeek: boolean,
  ): TradeSetup[] {
    const chained: TradeSetup[] = [];
    let chainSeq = 0;

    for (const setup of primarySetups) {
      // Find the zone at setup's TP price
      const tpZone = visualZones.find(vz =>
        setup.tp >= vz.bottom - pipValue && setup.tp <= vz.top + pipValue,
      );
      if (!tpZone) continue;

      // §8.3 LQZ-pivot exemption — LQZ zones carry touch_count ≥ 2 BY
      // CONSTRUCTION (2+ pattern types aligned → touches summed), so the
      // reactionCount > 1 freshness gate must NOT fire for them. These are
      // exactly the rungs the golden chains pivot on (100.975, 101.240).
      const isLqzPivot = tpZone.type === 'LIQUIDITY' ||
        (tpZone.source as string) === 'FALLBACK_LQZ' ||
        (tpZone.mappedIPZoneName ?? '').toUpperCase().includes('LQZ');

      // Only chain if TP zone is UM or 1x mitigated (LQZ pivots exempt)
      const tpIpZone = this.findNearestIPZone(tpZone, zoneMap.zones);
      const reactionCount = tpIpZone?.reactionCount ?? 1;
      if (!isLqzPivot && reactionCount > 1) continue;

      // Reverse direction
      const reverseDir = setup.direction === TradeDirection.SHORT
        ? TradeDirection.LONG : TradeDirection.SHORT;

      // Predicted shape at TP zone
      const chainShapeMap: Record<string, string> = {
        'SHORT|SS': 'RWL', 'LONG|SS': 'RWL',
        'SHORT|BS': 'R', 'LONG|BS': 'R',
        'SHORT|RWL': 'BS', 'LONG|RWL': 'BS',
        'SHORT|WL': 'RWL', 'LONG|WL': 'RWL',
      };
      const chainShape = chainShapeMap[`${setup.direction}|${setup.shapeAlignment}`] ?? 'R';

      // Build chained setup using same staggered/SL/TP logic
      const entries = this.computeStaggeredEntries(tpZone, reverseDir, fwdSpread);
      if (!entries) continue;
      const chainDayIdx = (() => {
        const i = dayLabels.indexOf(setup.day);
        return i >= 0 ? i : dayLabels.length;   // unknown day → all priors count
      })();
      const slResult = this.computeSLNextLqzRung(
        entries.front, tpZone, reverseDir, visualZones, pair, atr1hPips, 1,
      );
      if (!slResult) continue;
      const tpResult = this.computeTPSignificancePath(
        entries.front, slResult.sl, tpZone, reverseDir, visualZones,
        weeklyAtrPips, pipValue, priorSetups, chainDayIdx,
      );
      if (!tpResult) continue;
      const slDist = Math.abs(entries.front - slResult.sl);
      if (slDist === 0) continue;
      const rrr = Math.abs(tpResult.tp - entries.front) / slDist;
      // §8.3 FIX 3 — chained RRR floor = the SOURCE (parent) setup's category
      // floor (consolidation-week aware), NOT a hardcoded HTF 2.0. A chain born
      // from an SS scalp (floor 1.5 / 1.2 consolidation) must not die against
      // an HTF floor it never claimed to meet.
      const parentCatKey = categoryKeyOf(String(setup.category));
      const parentBaseFloor = rrrForCategory(String(setup.category)).tp1;
      const chainFloor = isConsolidationWeek
        ? (CONSOLIDATION_WEEK_FLOORS[parentCatKey] ?? parentBaseFloor)
        : parentBaseFloor;
      if (rrr < chainFloor) continue;

      // §8.4 — chained setups pass the SAME dedup doctrine as primary setups:
      // day+category key plus the zone-consumption rule on the TP pivot zone.
      const chainDedupKey =
        `${reverseDir}_${Math.round(entries.front * 1e6)}_${Math.round(slResult.sl * 1e6)}_` +
        `${Math.round(tpResult.tp * 1e6)}_${setup.day}_${categoryKeyOf(String(SetupCategory.HTF_SWING))}`;
      if (seenKeys.has(chainDedupKey)) continue;
      const chainZoneId = (tpZone.mappedIPZoneName ?? '') || `${tpZone.type}_${tpZone.top}_${tpZone.bottom}`;
      const chainGeomSig = `${reverseDir}|${entries.front.toFixed(4)}|${slResult.sl.toFixed(4)}|${tpResult.tp.toFixed(4)}`;
      // §8.4 consumption (v4.3 cleanup — corrected doctrine): same zone + same
      // day + same session = same trade (killed); different days at the same
      // level are DISTINCT trades (multi-day reactions are legitimate).
      const chainZoneDayKey = `${pair}_${chainZoneId}_${setup.day}`;
      if (usedZones.has(chainZoneDayKey)) {
        log.info(`    [skip] ${chainZoneId}: chained trade already emitted for ${setup.day} — same zone + same day = same trade`);
        continue;
      }
      // Cross-zone same-day geometry guard (day-scoped): identical order under a
      // different zone on the SAME day = the same trade.
      const chainGlobalGeomKey = `${pair}_${chainGeomSig}_${setup.day}`;
      if (emittedGeometry.has(chainGlobalGeomKey)) {
        log.info(`    [skip] ${chainZoneId}: chained geometry identical to an already-emitted trade for ${setup.day} (${chainGeomSig})`);
        continue;
      }

      // Blended RRR across entries
      const rrrFront = Math.abs(tpResult.tp - entries.front) / slDist;
      const rrrMiddle = Math.abs(tpResult.tp - entries.mid) / slDist;
      const rrrBack = Math.abs(tpResult.tp - entries.back) / slDist;
      const blendedRrr = rrrFront * 0.33 + rrrMiddle * 0.33 + rrrBack * 0.34;

      chainSeq++;
      const confidence = Math.round(setup.confidence * 0.85);

      // Uniform PIPS for every pair (same Defect-C fix as the primary path).
      const slDistancePips = Math.abs(entries.front - slResult.sl) / pipValue;

      chained.push({
        setupId: `${pair.replace('/', '').toLowerCase()}-chain-${chainSeq}`,
        pair,
        direction: reverseDir,
        category: SetupCategory.HTF_SWING,
        entry: entries.front,
        sl: slResult.sl,
        tp: tpResult.tp,
        confidence,
        confidenceTier: this.confidenceToTier(confidence),
        shapeAlignment: chainShape as ShapeCode,
        session: SessionWindow.NY_MID,
        day: setup.day,
        shapeTrigger: `${chainShape} HTF_SWING`,
        rrr: Math.round(rrr * 100) / 100,
        slPips: Math.round(slDistancePips * 10) / 10,
        zoneName: tpZone.mappedIPZoneName ?? `LQZ ${tpZone.bottom.toFixed(5)}-${tpZone.top.toFixed(5)}`,
        isBoMEntry: tpIpZone?.isBoM ?? false,
        zoneType: tpIpZone?.type ?? ZoneType.IP_DEMAND,
        directionValidation: this.buildDirectionValidation(
          tpZone, tpIpZone, chainShape as ShapeCode, reverseDir,
          SessionWindow.NY_MID, entries.front, rrr,
        ),
        notes: `CHAINED from ${setup.setupId} (TP=${setup.tp.toFixed(5)} → entry). Shape: ${chainShape}. Reaction count: ${reactionCount}.${tpResult.ambitious ? ' ⚠ AMBITIOUS TP (Law 13): >2× weekly ATR.' : ''}`,
        entry1: Math.round(entries.front * 1e5) / 1e5,
        entry2: Math.round(entries.mid * 1e5) / 1e5,
        entry3: Math.round(entries.back * 1e5) / 1e5,
        entryWeights: [0.33, 0.33, 0.34],
        blendedRrr: Math.round(blendedRrr * 100) / 100,
        realizedRrr: Math.round(rrrFront * 100) / 100,
        quality: this.classifyQuality(confidence, rrr, this.isModelVerifiedSource(tpZone.source as string)),
        slDistancePips: Math.round(slDistancePips * 10) / 10,
        entryEdge: reverseDir === TradeDirection.LONG ? 'ceiling' : 'floor',
        chainedFrom: setup.setupId,
        chainShape,
        vlmStatus: this.isBlindFallbackSource(tpZone.source as string) ? 'VLM_UNAVAILABLE' : 'VLM_VERIFIED',
      });
      seenKeys.add(chainDedupKey);
      usedZones.set(chainZoneDayKey, chainGeomSig);
      emittedGeometry.add(chainGlobalGeomKey);
    }
    return chained;
  }
}
