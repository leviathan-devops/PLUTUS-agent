/**
 * ShapeBrain — Engine 2 (macro shape chain prediction).
 *
 * REAL IMPLEMENTATION — runs shape classification logic in TypeScript.
 * Delegates to Python bundle only for the heavy 9-Pillar zone computation
 * (which is already in plutus_agent_v5.4). Shape chain logic is implemented
 * here natively.
 *
 * 200ms tick cycle:
 *   1. Reads latest ZONE_MAPPED from BrainMessenger
 *   2. Runs macro shape classification (SS/BS/WL/RWL/R/PBS/STORM)
 *      using ZFP-conditioned transition rules
 *   3. Runs day decomposition + Trading Speed Rule
 *   4. Runs consolidation phase detection
 *   5. Runs regime detection
 *   6. Publishes ShapePrediction via BrainMessenger
 *
 * Race condition prevention: stores the zoneMapVersion it read at tick start.
 * If zoneMapVersion changes mid-tick, aborts and skips this cycle.
 */

import {
  BrainChannel,
  ShapeCode,
  DXYRegime,
  ZoneType,
  SessionWindow,
  type DayShapeEntry,
  type DayShapePrediction,
  type ShapeChain,
  type ShapePrediction,
  type ShapePredictionSnapshot,
  type ZoneMapSnapshot,
  type DXYZone,
} from '../types.js';
import { Logger } from '../utils/logger.js';
import { classifyShapeDensity } from './elemental-lobe.js';
import {
  SHAPE_BRAIN_TICK_MS,
  PCT_MULTIPLIER,
  ZFP_FORTRESS_THRESHOLD,
  ZFP_STRONG_THRESHOLD,
  ZFP_MODERATE_THRESHOLD,
  ZFP_CRITICAL_THRESHOLD,
  ZFP_DEFAULT,
  ZFP_LOW_THRESHOLD,
  ZFP_HIGH_THRESHOLD,
  CONSOLIDATION_BALANCED_ZONE_THRESHOLD,
  CONSOLIDATION_MAX_ZONE_IMBALANCE,
  CONSOL_RANGE_THRESHOLD,
  CONFIDENCE_LOW,
  TRADING_DAYS_PER_WEEK,
  BREAKOUT_WATCH_DISTANCE_DXY,
  MAX_ZFP_PERCENT,
  TIMING_CONFIDENCE_REDUCTION_BASE,
  TIMING_CONFIDENCE_REDUCTION_STEP,
  CHAIN_CONFIDENCE_FLOOR,
  CHAIN_CONFIDENCE_INITIAL,
  CHAIN_CONFIDENCE_DECAY,
  ZFP_CEILING_OFFSET,
  ZFP_CEILING_STEP,
  ZFP_FLOOR_OFFSET,
  ZFP_FLOOR_STEP,
  TRANSITION_PROB_DECAY,
  PIERCE_MULTI_ZONE_THRESHOLD,
  RETRACE_DEEP_THRESHOLD,
  RS_MIN_FAILED_ZONES,
  SHAPE_SESSION_MAP,
} from '../constants/trading-constants.js';

const log = new Logger('ShapeBrain');

// ═══════════════════════════════════════════════════════════════════════════════
// WAVE A1.4 — THE PRIOR-WEEK PRE-FLIGHT STORYLINE (the handoff contract)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The prior-week storyline — the Wave A1.3 backwards-mapping pre-flight's
 * handoff (src/mdve/prior-week-preflight.ts exports the SAME structural type;
 * the parallel agent attaches it to the injected ZoneMapSnapshot under the
 * documented field name `priorStoryline`). Declared locally so shape-brain
 * stays self-contained — TypeScript's structural typing makes the parallel
 * module's object satisfy this shape exactly (no import coupling to a
 * concurrently-built file).
 */
interface PriorWeekStoryline {
  pair: string;
  priorWeekStartMs: number;
  priorAnchorMs: number;
  sweepOrigin: { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH' } | null;
  rangeTop: { price: number; ms: number } | null;
  rangeBottom: { price: number; ms: number } | null;
  defendedZones: { id: string; price: number; status: string; reactionCount: number }[];
  roleReversals: { id: string; price: number; from: string; to: string }[];
  depletedZones: { id: string; price: number; reactionCount: number }[];
  priorShapeChain: { day: string; shape: string; direction: string }[];
}

/**
 * WAVE A1.4 — the opening-shape classification (the pre-flight consumption,
 * doctrine 2026-08-01): "the previous weeks entire E1/E2/E3 pipeline needs
 * to be BACKWARDS MAPPED... AS PRE-FLIGHT so you have ACCURATE CONTEXT ON THE
 * MACRO STORYLINE as part of the reasoning chain." The prior week's SWEEP LOW
 * anchors the current week's first reaction: a prior-week sweep low followed
 * by recovery means the current week OPENED CONSOLIDATING above the swept low
 * (SS — not a fresh PBS/BS). The ZFP-conditioned zone-interaction matrix
 * misreads this opening: the nearest bounding 1H zones carry canon-ladder ZFP
 * 65+ (zone DEPLETION from heavy testing — NOT an imminent breakout), so the
 * raw heuristic classifies BS → the chain projects PBS for the opening week.
 * The storyline's sweep-origin signal is the data-driven correction.
 *
 * Rule (no hardcoded prices — emerges from the pre-flight):
 *   1. the prior week swept a LOW (sweepOrigin.anatomy === 'SWEEP_LOW' — a
 *      sweep HIGH is a buy-side top, the opposite role), AND
 *   2. the current week opened ABOVE that swept low (spot > sweepOrigin.price
 *      — the recovery anchored on the sweep), AND
 *   3. the current week opened INSIDE the prior week's range (spot ≤ the prior
 *      range top and ≥ the prior range bottom when known — a spot outside the
 *      prior range is a fresh breakout/breakdown, NOT consolidation; the Law
 *      28/29 broken-resistance/broken-support role expectations).
 * No storyline → false (byte-identical pre-A1.4 behavior).
 */
function openingConsolidates(
  priorWeekStoryline: PriorWeekStoryline | null | undefined,
  spot: number,
): boolean {
  if (!priorWeekStoryline || !priorWeekStoryline.sweepOrigin) return false;
  if (priorWeekStoryline.sweepOrigin.anatomy !== 'SWEEP_LOW') return false;
  if (!(spot > priorWeekStoryline.sweepOrigin.price)) return false;
  if (priorWeekStoryline.rangeTop != null && spot > priorWeekStoryline.rangeTop.price) return false;
  if (priorWeekStoryline.rangeBottom != null && spot < priorWeekStoryline.rangeBottom.price) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2-8: SS→BS transition threshold — spec §6.4.1:
//   "SS with bounding zone ZFP > 45% → BS (breakout imminent)"
// The bounding zone must be WEAKENING (ZFP above 45%) before SS transitions to BS.
// Previously SS→BS triggered at ZFP_STRONG_THRESHOLD (40%) in the STRONG range.
// ═══════════════════════════════════════════════════════════════════════════════
const ZFP_SS_TO_BS_THRESHOLD = 45;

// ═══════════════════════════════════════════════════════════════════════════════
// ZFP-CONDITIONED TRANSITION RULES (from Trident Context Injectable v6)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine next shape based on current shape + ZFP (Zone Failure Probability).
 *
 * ZFP ranges:
 *   < 20%  = FORTRESS (zone will hold) → trend continuation shapes
 *   20-40% = STRONG (zone likely holds) → recovery shapes
 *   40-60% = MODERATE/ELEVATED (zone may fail) → whiplash shapes
 *   > 60%  = HIGH/CRITICAL (zone likely fails) → breakout shapes
 */
function predictNextShape(currentShape: ShapeCode, zfp: number): ShapeCode {
  if (zfp < ZFP_FORTRESS_THRESHOLD) {
    // FORTRESS — zone holds
    switch (currentShape) {
      case ShapeCode.BS: return ShapeCode.RWL;  // NOT R/PBS — fortress means reversal
      case ShapeCode.SS: return ShapeCode.SS;   // Continuation
      case ShapeCode.R: return ShapeCode.SS;    // Reclassify
      case ShapeCode.WL: return ShapeCode.SS;   // Always followed by consolidation
      case ShapeCode.PWL: return ShapeCode.SS;  // Piercing whiplash exhausts to consolidation
      case ShapeCode.PRWL: return ShapeCode.SS; // Piercing reverse whiplash settles to new range
      case ShapeCode.RS: return ShapeCode.SS;   // Recovery surge exhausts to consolidation
      case ShapeCode.WLS: return ShapeCode.SS;  // E2-3: WLS volatility diminishes → consolidation
      default: return ShapeCode.SS;
    }
  } else if (zfp < ZFP_STRONG_THRESHOLD) {
    // STRONG (20-40%) — zone likely holds
    switch (currentShape) {
      case ShapeCode.BS: return ShapeCode.R;
      case ShapeCode.SS: return ShapeCode.SS;   // E2-8: SS continues — zone not weak enough for BS (< 45%)
      case ShapeCode.WL: return ShapeCode.SS;   // Whiplash resolves to consolidation
      case ShapeCode.PWL: return ShapeCode.R;   // Piercing whiplash → recovery at mid-range
      case ShapeCode.PRWL: return ShapeCode.SS; // Piercing reversal settles
      case ShapeCode.RS: return ShapeCode.WL;   // Recovery surge reaches opposing zone → whiplash
      case ShapeCode.WLS: return ShapeCode.SS;  // E2-3: WLS volatility diminishes → consolidation
      default: return ShapeCode.R;
    }
  } else if (zfp < ZFP_MODERATE_THRESHOLD) {
    // MODERATE/ELEVATED (40-60%) — zone may fail
    switch (currentShape) {
      // E2-8: SS→BS only when ZFP >= 45% (bounding zone weakening).
      // In 40-45% range SS continues (zone borderline but still holds).
      case ShapeCode.SS: return zfp >= ZFP_SS_TO_BS_THRESHOLD ? ShapeCode.BS : ShapeCode.SS;
      case ShapeCode.BS: return ShapeCode.WL;
      case ShapeCode.WL: return ShapeCode.RWL;  // Whiplash rejection → reverse whiplash
      case ShapeCode.PWL: return ShapeCode.PRWL;// Piercing whiplash → piercing reverse whiplash
      case ShapeCode.RS: return ShapeCode.WL;   // Recovery surge stalls → whiplash
      case ShapeCode.WLS: return ShapeCode.BS;  // E2-3: WLS bounding zone failing → BS
      default: return ShapeCode.WL;
    }
  } else {
    // HIGH/CRITICAL — zone fails
    switch (currentShape) {
      case ShapeCode.BS: return ShapeCode.PBS;  // Piercing breakout
      case ShapeCode.SS: return ShapeCode.BS;
      case ShapeCode.RS: return ShapeCode.BS;   // Recovery surge accelerates → breakout
      case ShapeCode.WLS: return ShapeCode.BS;  // E2-3: WLS bounding zone fails → BS (VERY HIGH)
      default: return ShapeCode.PBS;
    }
  }
}

/**
 * ZR-7C S1 — THE PRESSURE-AWARE TRANSITION OVERLAY (the operator's
 * reaction-count + pressure-state laws layered ON the ZFP-conditioned
 * matrix — the ZFP matrix remains ONE input). The CONTESTED zone's pressure
 * state decides the decisive transitions:
 *   - "zones usually fail on the THIRD mitigation" (the operator, verbatim):
 *     a DEPLETED contested zone (mitigationCount >= 3) → the PIERCE follows
 *     (the SS → BS; the BS → PBS; the R → BS — the recovery fails into the
 *     pierce; the WL → PBS).
 *   - "this supply zone... has not been pierced or broken in 4 prior
 *     mitigations... likely to become a fortress zone and NOT get pierced"
 *     (the operator, verbatim — the 95% direction flip): a FORTRESS contested
 *     zone → the RWL (the BS → RWL; the R → RWL; the WL → RWL).
 *   - "the fresh defense holds" (the VIRGIN/ACTIVE_1): the BS → R (the
 *     reaction at the fresh defense — NOT the pierce); the R → WL (the
 *     recovery reaches the fresh defense → the whiplash).
 * The contested zone = the directional target zone (the supply for the
 * bullish step, the demand for the bearish — the operator's "the ZFP of the
 * TARGET zone... determines what happens next"). A zone WITHOUT pressure
 * data (the honest absence) → the ZFP matrix stands (byte-identical).
 */
function predictNextShapePressureAware(
  currentShape: ShapeCode,
  zfp: number,
  targetZone: DXYZone | undefined,
  stepIndex: number,
): ShapeCode {
  const p = targetZone?.pressure;
  if (p && process.env.ZR7C_DEBUG) {
    console.log('[ZR7C-S1] step=' + stepIndex, 'shape=' + currentShape, 'zfp=' + zfp, 'contested=' + (targetZone?.id ?? 'none').slice(0, 40), 'lc=' + p.lifecycle, 'mit=' + p.mitigationCount, 'pierced=' + p.pierced);
  }
  if (p) {
    // The THIRD-mitigation fail (the operator's reaction-count law). The
    // lifecycle-only check — the BROKEN zones ALSO carry mitigationCount >= 3
    // but their pierce already happened (the DEPLETED = the 3+ mitigations
    // NOT yet pierced — the zone about to fail; the BROKEN = the already-
    // failed terminal — the role reversal — the operator's "this ZONE has
    // not yet been broken" distinction).
    if (p.lifecycle === 'DEPLETED') {
      switch (currentShape) {
        case ShapeCode.SS: return ShapeCode.BS;   // the bounding zone fails → the breakout
        case ShapeCode.BS: return stepIndex <= 1 ? ShapeCode.BS : ShapeCode.R; // the pierce in progress (the Tue BS) → the completion (the Wed R — "as the BS hits TP")
        case ShapeCode.R: return ShapeCode.BS;    // the recovery fails into the pierce
        case ShapeCode.WL: return ShapeCode.PBS;  // the whiplash pierces the depleted zone
        default: break;
      }
    }
    // The BROKEN/pierced terminal defense (the operator's "this ZONE has not
    // yet been broken" — a BROKEN zone IS broken — the break of structure is
    // REAL — the breakout continues through it). The shape stays the BS (the
    // operator's "breakout surge" — the zfp-driven BS→PBS over-escalation at
    // the HIGH zfp produced the stuck-PBS: SS→BS→PBS→PBS→PBS. The operator's
    // chain: SS→BS→R→WL→RWL).
    if (p.lifecycle === 'BROKEN' || p.pierced) {
      switch (currentShape) {
        case ShapeCode.SS: return ShapeCode.BS;   // the bounding zone broke → the breakout
        case ShapeCode.BS: return stepIndex <= 1 ? ShapeCode.BS : ShapeCode.R; // the pierce in progress (the Tue BS) → the completion (the Wed R — "it is plausible that a minor recovery will happen here as the BS hits TP" — the #4)
        case ShapeCode.R: return ShapeCode.BS;    // the recovery fails through the broken zone
        default: break;
      }
    }
    // The fortress (the operator's phase-transition — the 95% flip — the
    // operator's #8: "this supply zone... has not been pierced or broken in 4
    // prior mitigations... likely to become a fortress zone and NOT get
    // pierced"). The operator's progression AT the fortress: the BS reaches
    // it → the R (the recovery — "the supply zone's pressure confirmed");
    // the R reaches it → the WL (the rejection — the operator's Thu #7);
    // the WL at it → the RWL ("WL → RWL is a common shape chain for market
    // reversals" — the operator's #8 — the flip).
    if (p.lifecycle === 'FORTRESS') {
      switch (currentShape) {
        case ShapeCode.BS: return ShapeCode.R;    // the first contact → the recovery
        case ShapeCode.R: return ShapeCode.WL;    // the recovery reaches the fortress → the whiplash (the rejection)
        case ShapeCode.WL: return ShapeCode.RWL;  // the whiplash at the fortress → the reverse whiplash (the 95% flip)
        default: break;
      }
    }
    // The fresh defense holds (the VIRGIN/ACTIVE_1 reaction — not the pierce).
    if (p.lifecycle === 'VIRGIN' || p.lifecycle === 'ACTIVE_1') {
      switch (currentShape) {
        case ShapeCode.BS: return ShapeCode.R;    // the reaction at the fresh defense
        case ShapeCode.R: return ShapeCode.WL;    // the recovery reaches the fresh defense → the whiplash
        default: break;
      }
    }
  }
  return predictNextShape(currentShape, zfp); // the ZFP-conditioned matrix — ONE input
}

/**
 * Compute average ZFP across all zones.
 */
function computeAverageZFP(zones: readonly DXYZone[]): number {
  if (zones.length === 0) return ZFP_DEFAULT; // Default to MODERATE
  const sum = zones.reduce((acc: number, z: DXYZone) => acc + z.zfp, 0);
  return sum / zones.length;
}

/**
 * Identify the current shape from zone map structure.
 *
 * Heuristic based on zone density, recent price action, and ZFP distribution:
 *   - Many zones clustered + high ZFP → SS (consolidation)
 *   - Few zones + low ZFP + clear trend → BS (breakout)
 *   - Mixed zones + medium ZFP → R or WL depending on arrangement
 *
 * Shape variants (TTE v5.3.3 §6.1.3-6.1.4):
 *   - PWL: WL where rejection candle pierced through ≥2 zones before reversing
 *   - PRWL: RWL with piercing characteristics (≥2 zones pierced)
 *   - RS: Strong directional recovery from deep pullback (≥50% retrace)
 *
 * @param ltfZones  Optional 30m MoM zones (MDVE lane) — E2 reaction points for
 *                  SS/R shapes (doctrine 2026-07-31). Merged into the zone-aware
 *                  checks when present; absent → byte-identical behavior.
 * @param priorWeekStoryline  Optional Wave A1.4 prior-week storyline — the
 *                  opening-consolidation signal (see openingConsolidates).
 *                  Absent → byte-identical behavior.
 */
function identifyCurrentShape(
  zones: readonly DXYZone[],
  spots: Record<string, number>,
  instrument?: string,
  ltfZones: readonly DXYZone[] = [],
  priorWeekStoryline?: PriorWeekStoryline | null,
): ShapeCode {
  // Phase 2 T4 (doctrine 2026-07-31): "30m is not an origin point for BoM S/D
  // zones - valid for MoM S/D zones to identify E2 reaction points for SS/R
  // shapes." When 30m MoM ltfZones are supplied they participate in the
  // zone-aware checks as nearby reaction points for the day's range. With no
  // ltfZones, shapeZones === zones (same reference) → byte-identical behavior.
  const shapeZones = ltfZones.length > 0 ? [...zones, ...ltfZones] : zones;
  if (shapeZones.length === 0) return ShapeCode.SS;

  // W6-3: use the instrument's OWN spot (per-pair chains); DXY fallback for
  // legacy MULTI callers. Behavior for instrument='DXY'/'MULTI' is identical.
  const dxySpot = spots[instrument ?? 'DXY'] ?? spots['DXY'];
  if (!dxySpot) return ShapeCode.SS;

  // ── Wave A1.4 — the pre-flight opening classification ──
  // The prior-week sweep low + recovery → the current week opened
  // CONSOLIDATING above the swept low (SS — not a fresh PBS). The
  // zone-interaction heuristic below would read the canon-ladder ZFP (65+) of
  // the nearest bounding 1H zones as a breakout; the storyline's sweep-origin
  // signal is the data-driven correction (no storyline → skipped).
  if (openingConsolidates(priorWeekStoryline, dxySpot)) {
    log.debug('identifyCurrentShape: prior-week SWEEP_LOW + recovery → opening CONSOLIDATING above the swept low (SS, not a fresh PBS/BS)');
    return ShapeCode.SS;
  }

  // Count zones above and below spot
  const zonesAbove = shapeZones.filter((z: DXYZone) => z.floor > dxySpot);
  const zonesBelow = shapeZones.filter((z: DXYZone) => z.ceiling < dxySpot);

  // Compute ZFP distribution
  const avgZfp = computeAverageZFP(zones);
  const lowZfpCount = shapeZones.filter((z: DXYZone) => z.zfp < ZFP_LOW_THRESHOLD).length;
  const highZfpCount = shapeZones.filter((z: DXYZone) => z.zfp > ZFP_HIGH_THRESHOLD).length;

  // ── Piercing detection (TTE v5.3.3 §6.1.4) ──
  // Count zones the price has pierced through:
  //   - Supply zones now below price = price surged through them (bullish pierce)
  //   - Demand zones now above price = price dropped through them (bearish pierce)
  const piercedSupplyZones = shapeZones.filter((z: DXYZone) =>
    z.ceiling < dxySpot && z.type.endsWith('Supply'),
  );
  const piercedDemandZones = shapeZones.filter((z: DXYZone) =>
    z.floor > dxySpot && z.type.endsWith('Demand'),
  );
  const piercingUpCount = piercedSupplyZones.length;
  const piercingDownCount = piercedDemandZones.length;

  // ── Deep pullback detection for RS (TTE v5.3.3 §6.1.3) ──
  // RS is a sharp directional move back toward pre-breakout level after a deep
  // pullback. Detect via: failed zones (high ZFP) trailing behind the price
  // direction, indicating a recent deep move that price is recovering from.
  const failedZonesBelow = zonesBelow.filter((z: DXYZone) => z.zfp > ZFP_HIGH_THRESHOLD).length;
  const failedZonesAbove = zonesAbove.filter((z: DXYZone) => z.zfp > ZFP_HIGH_THRESHOLD).length;
  const hasDeepPullbackUp = failedZonesBelow >= RS_MIN_FAILED_ZONES;
  const hasDeepPullbackDown = failedZonesAbove >= RS_MIN_FAILED_ZONES;

  // ── E2-3: WLS (Whiplash Storm) detection ──
  // Per §6.2 priority 4 and §6.1.5:
  //   "3+ IP zones in narrow range (0.30-0.50 DXY); price oscillating violently"
  //   "Multiple IP zones of similar pressure degree within a narrow range"
  // §6.8: WLS zones have ZFP 15-40% each.
  // Detect WLS when 3+ moderate-ZFP zones cluster in a narrow band around spot
  // on BOTH sides — this is the signature of violent two-way whiplash.
  const WLS_ZFP_LOW = 15;
  const WLS_ZFP_HIGH = 40;
  const WLS_NARROW_RANGE_MIN = 0.30;
  const WLS_NARROW_RANGE_MAX = 0.50;
  const wlsCandidateZones = shapeZones.filter((z: DXYZone) =>
    z.zfp >= WLS_ZFP_LOW && z.zfp <= WLS_ZFP_HIGH,
  );
  const wlsAbove = wlsCandidateZones.filter((z: DXYZone) => z.floor > dxySpot);
  const wlsBelow = wlsCandidateZones.filter((z: DXYZone) => z.ceiling < dxySpot);
  if (
    wlsCandidateZones.length >= 3 &&
    wlsAbove.length >= 1 &&
    wlsBelow.length >= 1
  ) {
    // Verify the candidate zones span a narrow range (0.30-0.50 DXY)
    const wlsRangeHigh = Math.max(...wlsCandidateZones.map((z: DXYZone) => z.ceiling));
    const wlsRangeLow = Math.min(...wlsCandidateZones.map((z: DXYZone) => z.floor));
    const wlsSpan = wlsRangeHigh - wlsRangeLow;
    if (wlsSpan >= WLS_NARROW_RANGE_MIN && wlsSpan <= WLS_NARROW_RANGE_MAX) {
      log.debug(`E2-3: WLS detected — ${wlsCandidateZones.length} moderate-ZFP zones in narrow ${wlsSpan.toFixed(2)} DXY range`);
      return ShapeCode.WLS;
    }
  }

  // Shape classification heuristics
  if (shapeZones.length >= CONSOLIDATION_BALANCED_ZONE_THRESHOLD && Math.abs(zonesAbove.length - zonesBelow.length) <= CONSOLIDATION_MAX_ZONE_IMBALANCE) {
    // Balanced zones → consolidation
    return ShapeCode.SS;
  }

  if (lowZfpCount > highZfpCount && zonesBelow.length > zonesAbove.length) {
    // Strong zones below + few above → bullish breakout likely
    return ShapeCode.BS;
  }

  if (lowZfpCount > highZfpCount && zonesAbove.length > zonesBelow.length) {
    // Strong zones above + few below → bearish breakout likely
    return ShapeCode.BS;
  }

  if (highZfpCount > lowZfpCount && avgZfp > ZFP_DEFAULT) {
    // Many weak zones → whiplash as zones fail one by one
    // Check for piercing variant: ≥2 zones pierced before rejection
    if (piercingUpCount >= PIERCE_MULTI_ZONE_THRESHOLD) {
      // Price surged through multiple supply zones → Piercing Whiplash
      return ShapeCode.PWL;
    }
    if (piercingDownCount >= PIERCE_MULTI_ZONE_THRESHOLD) {
      // Price dropped through multiple demand zones → Piercing Reverse Whiplash
      return ShapeCode.PRWL;
    }
    return ShapeCode.WL;
  }

  // ── Recovery / Recovery Surge (TTE v5.3.3 §6.1.3) ──
  // Mid-range ZFP (moderate zones) → recovery phase.
  // If there's a deep pullback (≥2 failed zones trailing), classify as RS.
  if (hasDeepPullbackUp || hasDeepPullbackDown) {
    return ShapeCode.RS;
  }

  // Default: consolidation with recovery bias
  return ShapeCode.R;
}

/**
 * E2-6: Compute storyline bias from shape + zone positions.
 *
 * CRITICAL FIX: BS bias is derived from which zone was broken, NOT hardcoded
 * "Bullish". If the nearest broken zone was resistance (price broke UP through
 * supply → Bullish-Long). If the nearest broken zone was support (price broke
 * DOWN through demand → Bearish-Short).
 */
function computeStorylineBias(
  shape: ShapeCode,
  zfp: number,
  zones: readonly DXYZone[],
  spot: number,
): string {
  if (shape === ShapeCode.BS) {
    // E2-6: Derive BS direction from the directional move origin.
    // Find nearest broken resistance (supply zone now below spot) and
    // nearest broken support (demand zone now above spot).
    const brokenResistance = zones
      .filter((z: DXYZone) => isSupplyZone(z) && z.ceiling < spot)
      .sort((a: DXYZone, b: DXYZone) => (spot - a.ceiling) - (spot - b.ceiling))[0];
    const brokenSupport = zones
      .filter((z: DXYZone) => isDemandZone(z) && z.floor > spot)
      .sort((a: DXYZone, b: DXYZone) => (a.floor - spot) - (b.floor - spot))[0];

    const distToBrokenResistance = brokenResistance ? spot - brokenResistance.ceiling : Infinity;
    const distToBrokenSupport = brokenSupport ? brokenSupport.floor - spot : Infinity;

    if (distToBrokenResistance < distToBrokenSupport) {
      // Price broke UP through resistance → Bullish-Long
      return zfp > ZFP_CRITICAL_THRESHOLD
        ? 'Bullish-Long breakout (HIGH conviction) — resistance broken above'
        : 'Bullish-Long continuation — resistance broken';
    }
    if (distToBrokenSupport < distToBrokenResistance) {
      // Price broke DOWN through support → Bearish-Short
      return zfp > ZFP_CRITICAL_THRESHOLD
        ? 'Bearish-Short breakdown (HIGH conviction) — support broken below'
        : 'Bearish-Short continuation — support broken';
    }
    // Fallback: infer from failing zone direction
    const failingZone = zones.find((z: DXYZone) => z.zfp > ZFP_ZONE_FAILURE_THRESHOLD);
    if (failingZone) {
      return failingZone.floor > spot
        ? 'Bullish-Long — ceiling zone failing'
        : 'Bearish-Short — floor zone failing';
    }
    return zfp > ZFP_CRITICAL_THRESHOLD ? 'Bullish-Long breakout (HIGH conviction)' : 'Bullish-Long continuation';
  }
  if (shape === ShapeCode.PBS) {
    // E2-6: PBS direction follows BS logic — determine from broken zone
    const failingZone = zones.find((z: DXYZone) => z.zfp > ZFP_HIGH_THRESHOLD);
    if (failingZone) {
      return failingZone.floor > spot
        ? 'Bullish-Long piercing breakout — momentum cascade up'
        : 'Bearish-Short piercing breakdown — momentum cascade down';
    }
    return 'Piercing breakout — extreme momentum, direction from zone break';
  }
  if (shape === ShapeCode.WL) {
    // E2-6: WL direction from nearest failing zone
    const failingZone = zones.find((z: DXYZone) => z.zfp > ZFP_HIGH_THRESHOLD);
    if (failingZone) {
      return failingZone.floor > spot
        ? 'Bullish-Long whiplash — zone rejected upward'
        : 'Bearish-Short whiplash — zone rejected downward';
    }
    return 'Volatile — whiplash expected, range-bound trading';
  }
  if (shape === ShapeCode.PWL) {
    return 'Extreme volatility — piercing whiplash, multiple zones breached before reversal';
  }
  if (shape === ShapeCode.PRWL) {
    return 'Strong reversal — piercing reverse whiplash, strongest reversal signal in taxonomy';
  }
  if (shape === ShapeCode.R) {
    // E2-6: R direction follows the move origin
    const brokenResistance = zones.some((z: DXYZone) => isSupplyZone(z) && z.ceiling < spot);
    const brokenSupport = zones.some((z: DXYZone) => isDemandZone(z) && z.floor > spot);
    if (brokenResistance && !brokenSupport) return 'Bullish-Long recovery — trend resuming after pullback';
    if (brokenSupport && !brokenResistance) return 'Bearish-Short recovery — downtrend resuming after bounce';
    return 'Recovery phase — trend resuming after pullback';
  }
  if (shape === ShapeCode.RS) {
    return 'Sharp recovery surge — strong directional move back toward pre-breakout level';
  }
  if (shape === ShapeCode.RWL) {
    // E2-6: RWL is counter-trend — bias opposite of prior trend
    const brokenResistance = zones.some((z: DXYZone) => isSupplyZone(z) && z.ceiling < spot);
    if (brokenResistance) return 'Bearish-Short reversal — prior uptrend exhausting';
    return 'Reversal warning — current trend exhausting';
  }
  if (shape === ShapeCode.WLS) {
    return 'Neutral — whiplash storm, violent two-way action';
  }
  return 'Neutral — consolidation phase';
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2-10: Consolidation Phase → Setup-Type Mapping
// Maps each consolidation phase to the valid setup categories for that phase.
// Per spec §6.7 and system prompt "Consolidation Phase Detection" table.
// ═══════════════════════════════════════════════════════════════════════════════
const CONSOLIDATION_PHASE_SETUP_MAP: Record<string, string[]> = {
  'Early consolidation': ['Swing Scalps (30m/15m stack)'],
  'Mid consolidation': ['Swing Scalps (30m/15m stack)', 'Breakout Search (pending)'],
  'Late consolidation': ['Breakout Surge (imminent)'],
  'Mid-breakout': ['Reinforcement on liquidity zones'],
  'Post-breakout recovery': ['Whiplash opportunities', 'Swing Scalps (default)'],
  'Directional': ['HTF Swing', 'Reinforcement'],
  'Resolution': ['Transition (fade exhaustion)'],
};

/**
 * E2-10: Determine consolidation phase from shape + ZFP + zones.
 *
 * Adds the missing "Mid-breakout" phase and maps each phase to valid setup types.
 * Per spec §6.7 and system prompt Consolidation Phase Detection table.
 */
function determineConsolidationPhase(
  shape: ShapeCode,
  zfp: number,
  zones: readonly DXYZone[],
): string {
  if (shape === ShapeCode.SS) {
    if (zfp < ZFP_LOW_THRESHOLD) {
      const setups = CONSOLIDATION_PHASE_SETUP_MAP['Early consolidation']!;
      return `Early consolidation — fresh range forming [Valid setups: ${setups.join(', ')}]`;
    }
    if (zfp < ZFP_MODERATE_THRESHOLD) {
      const setups = CONSOLIDATION_PHASE_SETUP_MAP['Mid consolidation']!;
      return `Mid consolidation — range mature, breakout search pending [Valid setups: ${setups.join(', ')}]`;
    }
    // ZFP high — check if a breakout is mid-progress
    const failingZone = zones.find((z: DXYZone) => z.zfp > ZFP_ZONE_FAILURE_THRESHOLD);
    if (failingZone) {
      const setups = CONSOLIDATION_PHASE_SETUP_MAP['Mid-breakout']!;
      return `Mid-breakout — directional move in progress through failing zone [Valid setups: ${setups.join(', ')}]`;
    }
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Late consolidation']!;
    return `Late consolidation — breakout imminent [Valid setups: ${setups.join(', ')}]`;
  }
  if (shape === ShapeCode.WLS) {
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Early consolidation']!;
    return `Whiplash storm — violent consolidation, breakout pending [Valid setups: ${setups.join(', ')}]`;
  }
  if (shape === ShapeCode.BS || shape === ShapeCode.PBS) {
    // E2-10: Distinguish Mid-breakout from Post-breakout recovery
    const veryHighZfpCount = zones.filter((z: DXYZone) => z.zfp > ZFP_CRITICAL_THRESHOLD).length;
    if (veryHighZfpCount >= 2) {
      const setups = CONSOLIDATION_PHASE_SETUP_MAP['Mid-breakout']!;
      return `Mid-breakout — multiple zones failing, momentum in progress [Valid setups: ${setups.join(', ')}]`;
    }
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Directional']!;
    return `Directional breakout in progress [Valid setups: ${setups.join(', ')}]`;
  }
  if (shape === ShapeCode.WL || shape === ShapeCode.RWL ||
      shape === ShapeCode.PWL || shape === ShapeCode.PRWL) {
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Post-breakout recovery']!;
    return `Post-breakout recovery — expect 1-2 day consolidation [Valid setups: ${setups.join(', ')}]`;
  }
  if (shape === ShapeCode.RS) {
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Mid-breakout']!;
    return `Recovery surge in progress — reinforcement on liquidity zones [Valid setups: ${setups.join(', ')}]`;
  }
  if (shape === ShapeCode.R) {
    const setups = CONSOLIDATION_PHASE_SETUP_MAP['Post-breakout recovery']!;
    return `Post-breakout recovery — trend resuming [Valid setups: ${setups.join(', ')}]`;
  }
  return 'Unknown';
}

/**
 * Determine breakout watch status.
 */
function determineBreakoutWatch(zones: readonly DXYZone[], spots: Record<string, number>, instrument?: string): string {
  // W6-3: instrument's own spot first, DXY fallback for legacy MULTI callers.
  const instrumentSpot = spots[instrument ?? 'DXY'] ?? spots['DXY'];
  if (zones.length === 0 || !instrumentSpot) return 'Unknown — no zone data';

  const dxySpot = instrumentSpot;
  // Find nearest zone above and below
  const above = zones.filter((z: DXYZone) => z.floor > dxySpot).sort((a: DXYZone, b: DXYZone) => a.floor - b.floor);
  const below = zones.filter((z: DXYZone) => z.ceiling < dxySpot).sort((a: DXYZone, b: DXYZone) => b.ceiling - a.ceiling);

  const nearestAbove = above[0];
  const nearestBelow = below[0];

  if (!nearestAbove && !nearestBelow) return 'No nearby zones';

  const distAbove = nearestAbove ? Math.abs(nearestAbove.floor - dxySpot) : Infinity;
  const distBelow = nearestBelow ? Math.abs(dxySpot - nearestBelow.ceiling) : Infinity;

  if (distAbove < BREAKOUT_WATCH_DISTANCE_DXY && nearestAbove) {
    return `Watch breakout above ${nearestAbove.floor} (${nearestAbove.id})`;
  }
  if (distBelow < BREAKOUT_WATCH_DISTANCE_DXY && nearestBelow) {
    return `Watch breakout below ${nearestBelow.ceiling} (${nearestBelow.id})`;
  }
  return `No immediate breakout watch — nearest zone ${distAbove < distBelow ? 'above' : 'below'} at ${Math.min(distAbove, distBelow).toFixed(2)} away`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Day-Level Shape Decomposition (TTE v5.3.3 Section 6.5)
// Maps each shape prediction to a specific DAY of the week.
// This is the temporal fractal from Fractal v2.3 that makes setups blindly
// executable — you know which day to trade which shape.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * FIX-013: Build a simple day-by-day shape mapping for Engine 3 consumption.
 *
 * Takes the shape chain and maps each shape to a specific weekday.
 * E2-1: Applies the Trading Speed Rule (+1 day shift) so Engine 3
 * sees the conservative execution day for each shape. Chain step 0 → Tuesday.
 *
 * Returns a compact array that Engine 3 (TradeBrain) reads to assign
 * executionDay to each trade setup.
 */
function buildDayByDay(chain: ShapePrediction[]): DayShapeEntry[] {
  const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // E2-1: Trading Speed Rule +1 day shift — chain[0] → Tuesday (not Monday).
  const entries: DayShapeEntry[] = [];

  for (let i = 0; i < TRADING_DAYS_PER_WEEK; i++) {
    const prediction = chain[Math.min(i, chain.length - 1)];
    // +1 day shift: position i maps to weekdayNames[i + 1] (capped at Friday)
    const shiftedDayIndex = Math.min(i + 1, TRADING_DAYS_PER_WEEK - 1);
    entries.push({
      day: weekdayNames[shiftedDayIndex]!,
      shape: prediction.shape,
      confidence: prediction.confidence,
    });
  }

  return entries;
}

/**
 * E2-7: Shape-based session assignment (NOT day-based).
 *
 * V4.3 §8.2: uses the UNIFIED SHAPE_SESSION_MAP from trading-constants —
 * the single source of truth shared with visual-setup-generator.
 * Golden + 38-trade forensic: London Open = scalps (22/38), London/NY
 * Overlap = BS (15/38), NY Mid = HTF swings (18/38), NY Open = reinforcements (8/38).
 *
 * The previous day-based mapping was wrong because a BS shape on Monday
 * should still trade in NY session, not London.
 */
function getSessionForShape(shape: ShapeCode): string {
  return SHAPE_SESSION_MAP[shape] ?? SessionWindow.LONDON_OPEN;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE-INTERACTION SHAPE CLASSIFICATION (Engine 2 rewrite)
// Classifies SS vs BS from actual supply/demand zone interaction rather than
// relying solely on density heuristics.  Each classification is anchored to the
// nearest bounding zones and their ZFP (Zone Failure Probability).
// ═══════════════════════════════════════════════════════════════════════════════

/** Threshold above which a zone is considered "failing" (breakout candidate). */
const ZFP_ZONE_FAILURE_THRESHOLD = 45;

/**
 * Determine whether a zone is a supply zone (resistance above price).
 * Works with all ZoneType enum values by checking the suffix.
 */
function isSupplyZone(z: DXYZone): boolean {
  return z.type === ZoneType.MOM_SUPPLY
    || z.type === ZoneType.IP_SUPPLY
    || z.type === ZoneType.LSZ_SUPPLY
    || z.type === ZoneType.BOM_SUPPLY;
}

/**
 * Determine whether a zone is a demand zone (support below price).
 * Works with all ZoneType enum values by checking the suffix.
 */
function isDemandZone(z: DXYZone): boolean {
  return z.type === ZoneType.MOM_DEMAND
    || z.type === ZoneType.IP_DEMAND
    || z.type === ZoneType.LSZ_DEMAND
    || z.type === ZoneType.BOM_DEMAND;
}

/**
 * Find the nearest supply zone above the spot price.
 */
function findNearestSupplyAbove(zones: readonly DXYZone[], spot: number): DXYZone | undefined {
  const supplyAbove = zones.filter((z: DXYZone) => z.floor > spot && isSupplyZone(z));
  if (supplyAbove.length === 0) return undefined;
  return supplyAbove.reduce((best: DXYZone, z: DXYZone) =>
    (z.floor - spot) < (best.floor - spot) ? z : best,
  );
}

/**
 * Find the nearest demand zone below the spot price.
 */
function findNearestDemandBelow(zones: readonly DXYZone[], spot: number): DXYZone | undefined {
  const demandBelow = zones.filter((z: DXYZone) => z.ceiling < spot && isDemandZone(z));
  if (demandBelow.length === 0) return undefined;
  return demandBelow.reduce((best: DXYZone, z: DXYZone) =>
    (spot - z.ceiling) < (spot - best.ceiling) ? z : best,
  );
}

/**
 * Build a human-readable label for a zone (used in rationale/keyZone strings).
 */
function zoneLabel(z: DXYZone): string {
  return `${z.id} ${z.type} (ZFP=${z.zfp.toFixed(0)}%)`;
}

/**
 * Phase 2 T4: ZONE-SHAPE EXPECTATION — 30m MoM reaction points for SS/R shapes.
 *
 * Doctrine (operator, 2026-07-31):
 *   "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones
 *    to identify E2 reaction points for SS/R shapes"
 *
 * 30m MoM zones are E2 REACTION POINTS that the SS/R day shapes reference.
 * When the brain receives ltfZones (30m MoM zones from the MDVE lane), they
 * are merged into the shape classifier's zone-context checks so the SS/R
 * shapes can see them as nearby zones for the day's range:
 *
 *   1. inside an unmitigated BoM supply (4H/1H only — 30m is NOT a BoM origin)
 *      → RWL (rejection warning)
 *   2. inside a MoM zone (4H/1H or 30m MoM) → BS (continuation)
 *   3. between S&D, both nearby → SS (consolidation)
 *   4. moving toward a BoM zone → BS/WL (BS when the BoM is failing, else WL)
 *   5. far from all zones → BS (trend continuation)
 *
 * "Nearby" is measured against the 4H/1H day's range (zoneHigh - zoneLow) —
 * the same weekly-range scale buildDayDecomposition uses for consolidation
 * detection. Returns null when no expectation fires, letting the caller fall
 * back to its existing classification (byte-identical when ltfZones are absent).
 */
function applyZoneShapeExpectation(
  htfZones: readonly DXYZone[],
  ltfZones: readonly DXYZone[],
  spot: number,
): ShapeCode | null {
  // Day's range scale from the 4H/1H zone map. A reaction point (30m MoM
  // zone) is "nearby" when its center sits within this band around spot.
  const zoneHigh = htfZones.length > 0 ? Math.max(...htfZones.map((z: DXYZone) => z.ceiling)) : spot;
  const zoneLow = htfZones.length > 0 ? Math.min(...htfZones.map((z: DXYZone) => z.floor)) : spot;
  const dayRange = Math.max(zoneHigh - zoneLow, 0);
  const isNearby = (z: DXYZone): boolean => Math.abs(zoneCenter(z) - spot) <= dayRange;

  // Full zone-context view: 30m MoM zones merged as reaction points.
  const view = [...htfZones, ...ltfZones];

  // 1. Inside an unmitigated BoM supply → RWL (rejection warning).
  //    Doctrine: 30m is NOT a BoM origin — BoM checks use the 4H/1H zones only.
  const insideBoMSupply = htfZones.find((z: DXYZone) =>
    isSupplyZone(z) && z.isBoM &&
    spot >= z.floor && spot <= z.ceiling &&
    (z.reactionCount === 0 || z.reactionStatus === 'virgin' || z.sdFresh === '0X'),
  );
  if (insideBoMSupply) {
    log.debug(`zoneShapeExpectation: inside unmitigated BoM supply ${insideBoMSupply.id} → RWL`);
    return ShapeCode.RWL;
  }

  // 2. Inside a MoM zone (4H/1H or 30m MoM) → BS continuation.
  const insideMoM = view.find((z: DXYZone) =>
    (z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.MOM_DEMAND) &&
    spot >= z.floor && spot <= z.ceiling,
  );
  if (insideMoM) {
    log.debug(`zoneShapeExpectation: inside MoM ${insideMoM.id} → BS continuation`);
    return ShapeCode.BS;
  }

  // 3. Between S&D, both nearby → SS (consolidation). The 30m MoM zones
  //    provide the nearby reaction points the SS/R shapes reference.
  const supplyAbove = view.filter((z: DXYZone) => isSupplyZone(z) && z.floor > spot && isNearby(z));
  const demandBelow = view.filter((z: DXYZone) => isDemandZone(z) && z.ceiling < spot && isNearby(z));
  if (supplyAbove.length > 0 && demandBelow.length > 0) {
    log.debug(`zoneShapeExpectation: between S&D (${supplyAbove.length}↑ / ${demandBelow.length}↓ nearby) → SS`);
    return ShapeCode.SS;
  }

  // 4. Moving toward a BoM zone → BS when the BoM is failing (ZFP > 45%), else WL.
  const boMAbove = htfZones.find((z: DXYZone) =>
    isSupplyZone(z) && z.isBoM && z.floor > spot && isNearby(z));
  const boMBelow = htfZones.find((z: DXYZone) =>
    isDemandZone(z) && z.isBoM && z.ceiling < spot && isNearby(z));
  const movingTowardBoM = boMAbove ?? boMBelow;
  if (movingTowardBoM) {
    const expectation = movingTowardBoM.zfp > ZFP_ZONE_FAILURE_THRESHOLD ? ShapeCode.BS : ShapeCode.WL;
    log.debug(`zoneShapeExpectation: moving toward BoM ${movingTowardBoM.id} (ZFP=${movingTowardBoM.zfp.toFixed(0)}%) → ${expectation}`);
    return expectation;
  }

  // 5. Far from all zones → trend continuation (BS).
  if (!view.some(isNearby)) {
    log.debug('zoneShapeExpectation: far from all zones → BS (trend continuation)');
    return ShapeCode.BS;
  }

  // No expectation fired — caller falls back to its existing classification.
  return null;
}

/**
 * Classify the current shape from zone interaction.
 *
 * Determines SS (consolidation) vs BS (breakout) based on the nearest
 * supply zone above and demand zone below the spot price, using their
 * actual ZFP values from the zone map (not hardcoded defaults).
 *
 *   - SS: both bounding zones have ZFP < ZFP_LOW_THRESHOLD (30%) — both hold
 *   - BS: one side has ZFP > ZFP_ZONE_FAILURE_THRESHOLD (45%) — zone failing
 *   - Default: SS if classification is ambiguous
 *
 * @param zones  All active zones in the map
 * @param spot   Current DXY spot price
 * @param ltfZones  Optional 30m MoM zones (MDVE lane) — E2 reaction points for
 *                  SS/R shapes (doctrine 2026-07-31). When present they run the
 *                  zone-shape-expectation refinement; absent → byte-identical.
 * @returns ShapeCode.SS or ShapeCode.BS
 */
function classifyShape(
  zones: readonly DXYZone[],
  spot: number,
  ltfZones: readonly DXYZone[] = [],
): ShapeCode {
  if (!spot || zones.length === 0) return ShapeCode.SS;

  const nearestSupply = findNearestSupplyAbove(zones, spot);
  const nearestDemand = findNearestDemandBelow(zones, spot);

  if (nearestSupply && nearestDemand) {
    const ceilingZfp = nearestSupply.zfp;
    const floorZfp = nearestDemand.zfp;

    // SS: both bounding zones strong (ZFP < 30%) — price consolidates between them
    if (ceilingZfp < ZFP_LOW_THRESHOLD && floorZfp < ZFP_LOW_THRESHOLD) {
      return ShapeCode.SS;
    }
    // BS: ceiling zone failing (ZFP > 45%) — breakout up through failing resistance
    if (ceilingZfp > ZFP_ZONE_FAILURE_THRESHOLD) {
      return ShapeCode.BS;
    }
    // BS: floor zone failing (ZFP > 45%) — breakout down through failing support
    if (floorZfp > ZFP_ZONE_FAILURE_THRESHOLD) {
      return ShapeCode.BS;
    }
  }

  // If only one side exists, check its ZFP
  if (nearestSupply && nearestSupply.zfp > ZFP_ZONE_FAILURE_THRESHOLD) {
    return ShapeCode.BS;
  }
  if (nearestDemand && nearestDemand.zfp > ZFP_ZONE_FAILURE_THRESHOLD) {
    return ShapeCode.BS;
  }

  // ── 30m MoM reaction-point refinement (doctrine 2026-07-31) ──
  // "30m is not an origin point for BoM S/D zones - valid for MoM S/D zones
  // to identify E2 reaction points for SS/R shapes." When ltfZones (30m MoM)
  // are present, the zone-shape-expectation checks see them as nearby reaction
  // points for the SS/R day shapes. With no ltfZones this block is skipped
  // entirely — the 4H/1H classification path is byte-identical to prior behavior.
  if (ltfZones.length > 0) {
    const expectation = applyZoneShapeExpectation(zones, ltfZones, spot);
    if (expectation !== null) return expectation;
  }

  // Default to SS if unclear
  return ShapeCode.SS;
}

/**
 * Determine the expected move direction from zone positions and ZFP.
 */
function inferDirection(zones: readonly DXYZone[], spot: number): string {
  const nearestSupply = findNearestSupplyAbove(zones, spot);
  const nearestDemand = findNearestDemandBelow(zones, spot);

  // If the nearest supply is failing → price likely breaks UP
  if (nearestSupply && nearestSupply.zfp > ZFP_ZONE_FAILURE_THRESHOLD) {
    return 'UP';
  }
  // If the nearest demand is failing → price likely breaks DOWN
  if (nearestDemand && nearestDemand.zfp > ZFP_ZONE_FAILURE_THRESHOLD) {
    return 'DOWN';
  }
  // Both zones holding → range-bound
  if (nearestSupply && nearestDemand) {
    return 'RANGE';
  }
  return 'NEUTRAL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2-4: HTF Zone Mechanics Decision Tree (spec §6.4.2)
// When a MoM zone is tested, the reaction determines the subsequent shape.
// Bridges Engine 1 zone classification with Engine 2 shape prediction.
// ═══════════════════════════════════════════════════════════════════════════════

/** E2-4: Result type for the MoM zone mechanics decision tree. */
interface ZoneMechanicsDecision {
  branch: 1 | 2 | 3 | 4;
  action: 'LADDER_STEP' | 'CONTINUATION_RETEST' | 'TP_TARGET_ONLY' | 'REJECT';
  nextShape: ShapeCode;
  rationale: string;
}

/**
 * E2-4: Evaluate what happens when a MoM zone is tested.
 *
 * ZFP = Zone FAILURE Probability. Low ZFP → zone HOLDS. High ZFP → zone BREAKS.
 *
 * 4-branch decision tree (spec §6.4.2 + Rule 12):
 *   BRANCH 1: Zone HOLDS (ZFP < 30%, reaction_count ≤ 2) → LADDER_STEP
 *     → Price reverses off the zone (trend-aligned ladder step, NOT reversal entry)
 *     → Next shape: SS (long consolidation, swing scalps 2-4 days)
 *
 *   BRANCH 2: Zone BREAKS (ZFP > 50%, reaction_count ≤ 2) → CONTINUATION_RETEST
 *     → Price slices through
 *     → Next shape: SS → BS/Whiplash (short consolidation then breakout)
 *
 *   BRANCH 3: Zone DEPLETED (reaction_count ≥ 3) → TP_TARGET_ONLY
 *     → Zone no longer acts as a wall
 *     → Next shape: BS (price continues to next zone)
 *
 *   BRANCH 4: Zone VIRGIN (reaction_count = 0) → REJECT (E2-5: DEATH ZONE)
 *     → E2-5: Virgin MoM = automatic reject, no exceptions
 *     → Next shape: PBS (zone will be pierced)
 */
function evaluateMoMZoneMechanics(zone: DXYZone): ZoneMechanicsDecision {
  const isMoM = zone.type === ZoneType.MOM_SUPPLY || zone.type === ZoneType.MOM_DEMAND;

  // E2-5: Virgin MoM = DEATH ZONE → always reject
  const isVirgin = zone.reactionCount === 0
    || zone.reactionStatus === 'virgin';
  if (isMoM && isVirgin) {
    return {
      branch: 4,
      action: 'REJECT',
      nextShape: ShapeCode.PBS,
      rationale: 'E2-5: VIRGIN MoM DEATH ZONE — automatic reject. Zone will be pierced.',
    };
  }

  // BRANCH 3: Depleted zone (3+ reactions) — no longer acts as a wall
  if (zone.reactionCount >= 3 || zone.reactionStatus === 'depleted') {
    return {
      branch: 3,
      action: 'TP_TARGET_ONLY',
      nextShape: ShapeCode.BS,
      rationale: 'Zone depleted (3+ reactions) — TP target only, price continues through.',
    };
  }

  // BRANCH 1: Zone holds (ZFP < 30% — low failure probability → zone will hold)
  if (zone.zfp < 30) {
    return {
      branch: 1,
      action: 'LADDER_STEP',
      nextShape: ShapeCode.SS,
      rationale: 'Zone holds (ZFP < 30%) — low failure probability, long consolidation, swing scalps 2-4 days.',
    };
  }

  // BRANCH 2: Zone breaks (ZFP > 50% — high failure probability → zone will break)
  if (zone.zfp > 50) {
    return {
      branch: 2,
      action: 'CONTINUATION_RETEST',
      nextShape: ShapeCode.BS,
      rationale: 'Zone breaks (ZFP > 50%) — high failure probability, short consolidation then breakout.',
    };
  }

  // ZFP 30-50%: ambiguous — treat as conditional hold (minor reaction + retest)
  return {
    branch: 1,
    action: 'LADDER_STEP',
    nextShape: ShapeCode.SS,
    rationale: 'Zone borderline (ZFP 30-50%) — minor reaction + retest, zone holds initially.',
  };
}

/**
 * E2-4: Apply the MoM decision tree to all MoM zones in the map.
 * Returns a summary of zone mechanics decisions for the shape prediction context.
 */
function evaluateAllMoMZones(zones: readonly DXYZone[]): {
  decisions: Array<{ zoneId: string; decision: ZoneMechanicsDecision }>;
  deathZones: string[];
} {
  const momZones = zones.filter((z: DXYZone) =>
    z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.MOM_DEMAND,
  );
  const decisions = momZones.map((z: DXYZone) => ({
    zoneId: z.id,
    decision: evaluateMoMZoneMechanics(z),
  }));
  const deathZones = decisions
    .filter((d) => d.decision.branch === 4)
    .map((d) => d.zoneId);
  return { decisions, deathZones };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5 E1: DayBand Forward Projection + ENTRY-Rung Designation
// Operator (2026-07-31): "friday spot is only relevant to MONDAY E2 SHAPE
// prediction after that it is completely irrelevant" — E2 must "forward map
// the predicted spot price of that day at london session open" — "make it E2
// waveform based not dumb fucking friday spot price based". E1 emits per-day
// MACHINE zone ids so E3 (selectPairNativeZone) can select them authoritatively.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phase 5 E1 (operator 2026-07-31): the E2 day designation — the machine zone the
 *  shape chain says price will interact with on this day. ENTRY-rung semantics:
 *  SHORT days designate SUPPLY ABOVE the day's predicted spot; LONG days designate
 *  DEMAND BELOW it. The DayBand forward-projects each day's London-open spot:
 *  Monday = f(Friday close — the ONLY Friday-spot use); Tue-Fri = f(prior day's
 *  PREDICTED close + shape travel). keyZoneId MUST match the zone IDs that
 *  selectPairNativeZone's candidates carry (the `LMV|pair|center.toFixed(5)` bridge
 *  ids and the OB ids — exact-string matching).
 *
 *  ZR-6A (2026-08-04): E2 emits ZONE ANCHORS ONLY — keyZoneId/supplyZoneId/
 *  demandZoneId (machine zone ids) + the day band + the day-open reference.
 *  The exact prices are E3's job: "prices are not even a variable for E2."
 *  The day band (floor/ceiling) is the REACH the shape visits — a RANGE, never
 *  a single-price cap. The dayOpenSpot is the day-native reference ("friday spot
 *  is only relevant to MONDAY E2 SHAPE prediction after that it is completely
 *  irrelevant"). */
export interface ShapeDayZone {
  day: string;                    // 'Mon'..'Fri'
  shape: ShapeCode;
  direction: 'LONG' | 'SHORT' | 'RANGE';
  keyZoneId: string;              // the E2-designated ENTRY zone's machine id
  supplyZoneId?: string;          // designated SUPPLY (SHORT days)
  demandZoneId?: string;          // designated DEMAND (LONG days)
  // ZR-6D (2026-08-04): the E2 primary-side signal + the SECOND demand.
  //   keyZoneType — the PRIMARY (keyZoneId) zone's side: on a RANGE (SS) day the
  //     A1.4 top-of-range SUPPLY is the primary (the zone the day's shape rejects
  //     at) — the direction that consumes the keyZoneId is SHORT. This resolves
  //     the E2's day-direction/side confusion (the GU Friday was LONG-labelled
  //     while its keyZoneId was the SELL_SIDE supply — the operator's #7
  //     Fri SHORT). "E2 DESIGNATES, E3 OBEYS" — the label must match the side.
  //   deepDemandZoneId — the SECOND designated DEMAND: the strongest demand
  //     BENEATH the primary demand's floor — the deeper structure the day's
  //     extended reach visits after the primary is mitigated. The operator's
  //     EU #6 (verbatim): "Looking left to see what relevant LQZs exist beneath
  //     this demand, one is clearly visible at 1.13935 - 1.13875... this LQZ is
  //     the LQ shield of the BoM 4H bullish OB." Derived from the SAME demand
  //     candidate pool + the SAME strength mechanics — never a hardcoded level.
  keyZoneType?: 'SUPPLY' | 'DEMAND';
  deepDemandZoneId?: string;
  floor: number; ceiling: number; // the projected day range — the BAND (the REACH the
                                  // shape visits, a RANGE — never a single-price cap)
  dayOpenSpot: number;            // the DayBand forward-projected London-open price
  session: string; confidence: number;
  // ZR-7C (2026-08-04) — THE CHAIN PROGRESSION (the operator's "TP OF ONE =
  // ENTRY OF NEXT" — Law 27 — the spec Part 8.3 DayProjection): the day's
  // projected TP (the OPPOSING-side designation — the SHORT day's demand, the
  // LONG day's supply) rides the ShapeDayZone as the NEXT day's chain anchor —
  // buildDayDecomposition carries it forward into the next day's designation
  // ("Set E at the TP level of trade #1"). Zone anchors only — the level is
  // the zone center (E3 resolves the exact edge).
  projectedTpZoneId?: string;
  projectedTp?: number;
  // ZR-6A (2026-08-04): the price fields (keyZonePrice / supplyZonePrice /
  // demandZonePrice) are REMOVED FROM E2 — the E3 resolves the prices from the
  // zones. The operator (QUOTED): "E2 generates SHAPE CHAIN from ZONE ANCHORS
  // (prices are not even a variable for E2). E3 generates trade setups at
  // specific price levels on top of the E2 shape chain." E2 emits ZONE ANCHORS
  // ONLY — the exact entry/TP levels are E3's computation from the zone geometry.
  // The E3-consumed contract (shape-cascade.ts:40-42) declares the price fields
  // number|null; the bridge (report-v452.ts:679-681) passes ?? null — forward-
  // compatible: E2 leaves them null, E3 fills them.
}

/**
 * E1 day-entry extension — the DayBand fields the E1 designation attaches to each
 * DayShapePrediction (dayDecomposition row). Declared locally because types.ts is
 * owned by other agents in this phase (parallel builds — do NOT touch shared
 * files); structurally this is `floor?/ceiling?/dayOpenSpot?` on the day entry, so
 * `DayShapePrediction & ShapeDayFields` stays assignable to DayShapePrediction
 * everywhere the chain is consumed. The fields are present at runtime for E3.
 */
interface ShapeDayFields {
  floor?: number;
  ceiling?: number;
  dayOpenSpot?: number;
  // ZR-6D: the SECOND demand rides the local extension (types.ts is shared —
  // the parallel agents own it; the E3-consumed contract declares the field
  // on the ShapeDayZone, the day row carries it via this additive extension).
  deepDemandZoneId?: string;
}

/**
 * Law 2 (golden reference): the day's projected travel range by shape, in PIPS.
 * The DayBand uses travel.mid for the forward projection and travel.max for the
 * day's reachable band. PBS/WLS/unknown default to conservative BS/SS ranges.
 */
const SHAPE_TRAVEL: Record<string, { min: number; mid: number; max: number }> = {
  SS:  { min: 5,  mid: 15, max: 30 },    // ±5-30 pips consolidation
  BS:  { min: 30, mid: 65, max: 100 },   // 30-100 pips directional
  WL:  { min: 50, mid: 125, max: 200 },  // 50-200 pips whiplash
  RWL: { min: 30, mid: 65, max: 100 },   // 30-100 pips partial recovery
  R:   { min: 10, mid: 30, max: 50 },    // ±10-50 pips recovery
  // PBS/WLS/unknown: default to BS/SS ranges conservatively
  PBS: { min: 30, mid: 65, max: 100 },
  WLS: { min: 10, mid: 30, max: 50 },
  default: { min: 10, mid: 30, max: 50 },
};

/**
 * Map the day decomposition's direction vocabulary ('UP'|'DOWN'|'RANGE'|'NEUTRAL')
 * to the E1 entry-rung direction. 'UP' (price rises) → LONG days (demand below as
 * the rung); 'DOWN' (price falls) → SHORT days (supply above); 'RANGE'/'NEUTRAL'
 * → RANGE (both boundaries carried, strongest bounding zone designated).
 */
function toEntryDirection(direction: string): 'LONG' | 'SHORT' | 'RANGE' {
  if (direction === 'UP') return 'LONG';
  if (direction === 'DOWN') return 'SHORT';
  return 'RANGE';
}

/** Compute the center of a zone (midpoint of floor and ceiling). */
function zoneCenter(z: DXYZone): number {
  return (z.floor + z.ceiling) / 2;
}

/**
 * ZR-7C S2 — THE INTERNAL-LQZ NEAR EDGE (the operator's TP/chain levels are
 * the LQZ EDGES — "TP at the demand nested LQZ's near edge" — NOT the zone
 * centers). The strongest internal LMV rung (the lowest-zfp — the freshest
 * fuel) inside the zone's band; its near edge = the side-facing edge (the
 * DEMAND's ceiling — the near edge from above; the SUPPLY's floor — the near
 * edge from below). No internal rung → the zone's own near edge (the honest
 * fallback — the E1 pressure edge).
 */
function internalLqzNearEdge(
  zone: DXYZone,
  pool: readonly DXYZone[],
  side: 'SUPPLY' | 'DEMAND',
): number {
  const inside = pool.filter((z: DXYZone) =>
    z.id.startsWith('LMV|') && z.floor >= zone.floor && z.ceiling <= zone.ceiling);
  if (inside.length === 0) return side === 'SUPPLY' ? zone.floor : zone.ceiling;
  const strongest = [...inside].sort((a: DXYZone, b: DXYZone) => a.zfp - b.zfp)[0]!;
  return side === 'SUPPLY' ? strongest.floor : strongest.ceiling;
}

/**
 * PHASE 5 E1 — DayBand forward projection + ENTRY-rung designation (operator 2026-07-31).
 *
 * Operator: "friday spot is only relevant to MONDAY E2 SHAPE prediction after
 * that it is completely irrelevant" — E2 must "forward map the predicted spot
 * price of that day at london session open" — "make it E2 waveform based not
 * dumb fucking friday spot price based".
 *
 * DayBand chain:
 *   Monday  → dayOpenSpot = f(Friday close + shape travel)  ← the ONLY Friday-spot use
 *   Tue-Fri → dayOpenSpot = f(prior day's PREDICTED London-open spot + shape travel)
 * The caller (buildDayDecomposition) carries priorDayClose forward day by day.
 *
 * ENTRY-rung semantics: SHORT days designate SUPPLY ABOVE the day's predicted
 * spot; LONG days designate DEMAND BELOW it; RANGE days designate the strongest
 * bounding zone inside the day's travel band (both boundaries carried for E3).
 * The rung is the pick's NEAR edge to the day open — SHORT: supply band BOTTOM
 * (the entry at the supply zone's lower edge); LONG: demand band TOP (the demand
 * zone's upper edge).
 *
 * The candidate pool merges the 30m MoM ltfZones (Phase 2 T4 doctrine — 30m MoM
 * zones are valid E2 reaction points for SS/R day shapes) when supplied; absent
 * → the 4H/1H zones only. keyZoneId is the pick's machine id — it MUST match the
 * candidate ids E3's selectPairNativeZone carries (OB ids and the
 * `LMV|pair|center.toFixed(5)` bridge ids) so the exact-string match fires.
 *
 * pipSize is derived from the spot magnitude (spot > 50 → 0.01 like DXY, else
 * 0.0001 like FX pairs — the mirror.ts convention).
 *
 * @param day           'Mon'..'Fri' — the day being projected
 * @param shape         the day's shape code (drives SHAPE_TRAVEL + session)
 * @param direction     the ENTRY-rung direction ('SHORT' → supply above, 'LONG' → demand below)
 * @param zones         the active 4H/1H zone map
 * @param priorDayClose the DayBand carry — Friday close for Monday, the PRIOR
 *                      day's PREDICTED London-open spot (dayOpenSpot) for Tue-Fri
 * @param ltfZones      optional 30m MoM reaction-point zones (merged into the pool)
 * @param confidence    the day's confidence (pass-through into the designation)
 * @param priorWeekStoryline  optional Wave A1.4 prior-week storyline — enables
 *                      the RANGE-day reachability band (a consolidation day's
 *                      rejections run to the range EXTREMES — open ± travelMax).
 *                      Absent → the RANGE band stays degenerate (byte-identical).
 * @returns the E1 ShapeDayZone designation for the day
 */
function projectZoneForDay(
  day: string,
  shape: ShapeCode,
  direction: 'LONG' | 'SHORT' | 'RANGE',
  zones: readonly DXYZone[],
  priorDayClose: number,
  ltfZones?: readonly DXYZone[],
  confidence?: number,
  priorWeekStoryline?: PriorWeekStoryline | null,
  // ZR-7C — THE CHAIN ANCHOR (the spec Part 23): the PRIOR day's projected TP
  // (the DayProjection contract — the zone at the prior TP level is the day's
  // PRIMARY designation — "Set E at the TP level of trade #1" — the chain
  // progression "TP OF ONE = ENTRY OF NEXT" — Law 27). Absent (Monday) → no
  // chain bonus (the opening day stands on the pressure + the day-local + the
  // zfp). The CHAIN_ANCHOR_OUT_OF_REACH rule (the spec Part 24): when the
  // chain level is outside the day's reach band, the chain bonus simply finds
  // no candidate (the honest absence — never a forced pick).
  priorDayProjection?: { projectedTpZoneId?: string; projectedTp?: number } | null,
): ShapeDayZone {
  const travel = SHAPE_TRAVEL[shape] ?? SHAPE_TRAVEL['default']!;
  // pipSize from the spot magnitude — mirror.ts convention (DXY > 50 → 0.01, FX → 0.0001).
  const pipSize = priorDayClose > 50 ? 0.01 : 0.0001;
  const travelMid = travel.mid * pipSize;
  const travelMax = travel.max * pipSize;

  // ── 1. DayBand forward projection — the day's predicted London-open spot ──
  // (2026-07-31 FIX): the London open ≈ the prior day's close (FX opens gap-less-ish).
  // A full directional drift (priorDayClose ± travelMid) made the chain PROJECT
  // DOWNWARD every SHORT day → by Wed the projected spot sat ~2 DXY points below the
  // actual structure → the E2 designation picked the wrong supply (99.084 instead of
  // the golden 101.235-101.240). The TRAVEL defines the day's RANGE [open ± travelMax];
  // the open itself stays anchored to the prior close (deterministic, no drift, no
  // future leak). The directional extreme of the range is the sweep target the E2
  // designation aims at (fix 2 below).
  const dayOpenSpot = priorDayClose;
  // The projected day range (Law 2 travel band).
  const floor = dayOpenSpot - travelMax;
  const ceiling = dayOpenSpot + travelMax;
  // ── 2. ENTRY-rung selection ──
  // Full candidate pool: 4H/1H zones + 30m MoM reaction points (when present).
  const pool = ltfZones && ltfZones.length > 0 ? [...zones, ...ltfZones] : zones;
  // "within the travel band": the zone's [bottom, top] overlaps the day range.
  const inBand = (z: DXYZone): boolean =>
    z.ceiling >= floor && z.floor <= ceiling;
  // ── Wave R1-b (2026-08-01): THE DAY-REACHABILITY BAND — the ACTUAL
  //    reachable band of the day being designated. The A1.4 fix bounded the
  //    RANGE day's reach at the top of range (open ± travelMax); R1-b extends
  //    day-reachability to EVERY shape: the designation's zone/rung (the
  //    anchor the E2 emits) must
  //    fall within the day's ACTUAL reach band — the SHORT designation's level
  //    ≤ the day's actual high, the LONG's ≥ the day's actual low. The day
  //    band is DERIVED FROM THE DATA: the zones FORMED on that day (createdAt
  //    ∈ the day's calendar window — the current week's start is the prior-
  //    week storyline's priorAnchorMs). The day's actual reachable high = the
  //    max ceiling among that day's supply zones; the day's actual reachable
  //    low = the min floor among that day's demand zones. The reach = min(
  //    shape-travel reach, the day band). The designation must resolve to the
  //    zone/rung whose internal near edge is within the day's reach — the same
  //    position-aware tie-break A1.4 used for the Monday, extended to EVERY
  //    day. Storyline-gated → the no-storyline path is byte-identical.
  const DAY_MS = 86400000;
  const dayIdxOf = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(day);
  let dayReachHigh: number | null = null;   // the day's actual reachable high (supply ceiling)
  let dayReachLow: number | null = null;    // the day's actual reachable low (demand floor)
  if (priorWeekStoryline && dayIdxOf >= 0) {
    const weekStart = priorWeekStoryline.priorAnchorMs;
    if (weekStart > 0) {
      const dayStart = weekStart + dayIdxOf * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      const daySupply = pool.filter((z: DXYZone) => isSupplyZone(z)
        && z.createdAt >= dayStart && z.createdAt < dayEnd);
      const dayDemand = pool.filter((z: DXYZone) => isDemandZone(z)
        && z.createdAt >= dayStart && z.createdAt < dayEnd);
      if (daySupply.length > 0) dayReachHigh = Math.max(...daySupply.map((z: DXYZone) => z.ceiling));
      if (dayDemand.length > 0) dayReachLow = Math.min(...dayDemand.map((z: DXYZone) => z.floor));
    }
  }
  // ── Wave ZR-4C (2026-08-04) — THE DAY-LOCAL ZONE PREFERENCE (the recency
  //    bias as a FACTOR, never the law — the operator: "recency bias is a real
  //    thing. BUT it is NOT the LAW. Older zones are still valid if E1 pressure
  //    mechanics obviously has an E2 pathway through/toward them, but recency
  //    bias (especially for S/D zones) is definitely a factor. It is not the
  //    primary factor, but it IS a factor." — Part 16.3: "the designation
  //    prefers the day-local structures (the zones formed on/near that day)
  //    when the E2 pathway passes through them — the recency bias as a factor,
  //    the E2 pathway as the primary"). The E2 pathway/reach stays the PRIMARY
  //    filter (the candidate pools below are UNCHANGED — the recency NEVER
  //    admits a zone outside the pathway); among the pathway-admitted
  //    candidates of equal strength (zfp), a zone formed on the target day or
  //    the immediately-prior day (createdAt ∈ [dayStart − 24h, dayEnd)) ranks
  //    above an older zone. Storyline-gated (the week anchor derives from
  //    priorWeekStoryline.priorAnchorMs — the same source as the R1-b day
  //    band): no storyline → no recency signal → byte-identical; no day-local
  //    candidate in the pathway → every rank 1 → byte-identical.
  let recencyStart: number | null = null;
  let recencyEnd: number | null = null;
  if (priorWeekStoryline && dayIdxOf >= 0) {
    const weekStart = priorWeekStoryline.priorAnchorMs;
    if (weekStart > 0) {
      recencyStart = weekStart + (dayIdxOf - 1) * DAY_MS;
      recencyEnd = weekStart + (dayIdxOf + 1) * DAY_MS;
    }
  }
  // The formation stamp: createdAt when the model populates it, ELSE the ms
  // embedded in the zone id (`PAIR|TF|MS|PRICE` / `OB|PAIR|TF|MS|PRICE` — the
  // model currently leaves createdAt unset on every zone, so the id is the
  // operative stamp). LMV rung ids carry no ms (segment 2 is the price — the
  // 1e12 epoch-ms plausibility guard rejects it) → 0 → never day-local.
  const formationMsOf = (z: DXYZone): number => {
    if (Number.isFinite(z.createdAt) && z.createdAt > 0) return z.createdAt;
    const seg = String(z.id).split('|');
    const ms = Number(seg[0] === 'OB' ? seg[3] : seg[2]);
    return Number.isFinite(ms) && ms > 1e12 ? ms : 0;
  };
  const recencyRank = (z: DXYZone): number =>
    recencyStart != null && recencyEnd != null
      && formationMsOf(z) >= recencyStart && formationMsOf(z) < recencyEnd ? 0 : 1;
  // SHORT days → SUPPLY ABOVE the predicted spot; LONG days → DEMAND BELOW it.
  // (2026-07-31 FIX): candidates are bounded by the EXPECTED reach (open ± travelMid —
  // the shape's expected move), NOT the max travel. The golden Wed BS SHORT swept to
  // 101.275; the zfp-10 BoM at 101.658 sits ABOVE the expected reach and must not be
  // designated. The sweep-target pick = lowest zfp, then nearest the expected reach.
  // D16.15 dual-side completion (Wave G2, 2026-07-31): the OPPOSITE side's band is the
  // day's OTHER directional extreme (spot ∓ travelMid) — NOT the same expectedReach.
  // The pre-fix filter used expectedReach for BOTH sides, which made the opposing pool
  // mathematically EMPTY on directional days (the interval [spot+travelMid, spot] is
  // degenerate when travelMid > 0) — the golden Mon LONG 1.14004 could never be
  // designated on the SHORT-designated Monday, and every LONG mirror fell to the
  // spot-nearest ranking (wrong anchor → CS-1-invalid). Both sides now designate.
  const expectedReach = direction === 'SHORT' ? dayOpenSpot + travelMid
    : direction === 'LONG' ? dayOpenSpot - travelMid : dayOpenSpot;
  const oppositeReach = direction === 'SHORT' ? dayOpenSpot - travelMid
    : direction === 'LONG' ? dayOpenSpot + travelMid : dayOpenSpot;
  // ── Wave A1.4 — the RANGE-day reachability (the fill fix, G-B3) ──
  // A consolidation (SS) day's rejections happen at the range EXTREMES — the
  // supply the day's shape rejects at sits at the day's CEILING (open +
  // travelMax) and the demand at the FLOOR (open − travelMax). The pre-A1.4
  // RANGE band was `open ± travelMid(=0)` — mathematically EMPTY, so every
  // RANGE day (the DXY/EU Fridays) emitted NO designation. With a storyline
  // present the RANGE day's candidate bands run to the day's max band; NO
  // storyline → the RANGE band stays degenerate (byte-identical). The
  // expectedReach/oppositeReach (open ± travelMid) remain the DIRECTIONAL
  // day's sweep bounds (unchanged semantics for SHORT/LONG days).
  const isStorylineRange = direction === 'RANGE' && priorWeekStoryline != null;
  // Wave R1-b — the reach is bounded by the day's ACTUAL reachable band: the
  // SHORT designation's supply reach must not exceed the day's actual high
  // (the level the day's shape will reject at — the day's reachable supply
  // ceiling), and the LONG designation's demand reach must not undershoot the
  // day's actual low. When no day band is derivable (no day-formed zones —
  // e.g. a day with zero new structure), the raw reach stands (byte-identical).
  const supplyReachRaw = isStorylineRange ? dayOpenSpot + travelMax
    : (direction === 'LONG' ? oppositeReach : expectedReach);
  const demandReachRaw = isStorylineRange ? dayOpenSpot - travelMax
    : (direction === 'SHORT' ? oppositeReach : expectedReach);
  const supplyReach = dayReachHigh != null ? Math.min(supplyReachRaw, dayReachHigh) : supplyReachRaw;
  const demandReach = dayReachLow != null ? Math.max(demandReachRaw, dayReachLow) : demandReachRaw;
  // Wave R1-b — the candidate floor/ceiling is the DAY's actual reach band:
  // a SHORT supply is day-reachable when its floor sits at/below the day's
  // actual high AND at/above the day's actual low (the designation's internal
  // near edge then lands within [dayLow, dayHigh] — the level ≤ the day's
  // actual high, ≥ the day's actual open). The old `z.floor >= dayOpenSpot`
  // bound (the projected London open) is replaced by the day's reachable low
  // when the day band is known; the old `z.ceiling <= dayOpenSpot` bound is
  // replaced by the day's reachable high. Unknown band → dayOpenSpot (byte-identical).
  const supplyFloor = dayReachLow != null ? dayReachLow : dayOpenSpot;
  const demandCeiling = dayReachHigh != null ? dayReachHigh : dayOpenSpot;
  const supplyCands = pool.filter((z: DXYZone) => isSupplyZone(z)
    && z.floor >= supplyFloor
    && z.floor <= supplyReach
    && inBand(z));
  const demandCands = pool.filter((z: DXYZone) => isDemandZone(z)
    && z.ceiling <= demandCeiling
    && z.ceiling >= demandReach
    && inBand(z));

  // Strongest = lowest ZFP, then closest to the side's reach reference.
  // (2026-07-31 FIX): the pick targets the side's REACH — the PRIMARY side aims at
  // the EXPECTED REACH (the zone the shape's move SWEEPS INTO: SHORT → the supply the
  // buy-stop sweep hits; LONG → the demand the sell-stop sweep hits); the OPPOSITE
  // side aims at the OTHER extreme (the demand the fall reaches on a SHORT day — the
  // LONG setups' zone; the supply the rally reaches on a LONG day). Tie-break: lowest
  // zfp (strongest defense), then closest to the reach. The golden Wed supply
  // 101.239-101.275 (zfp 20) wins over the zfp-10 BoM at 101.658 because the latter
  // is beyond the expected reach (PRIMARY side — unchanged semantics).
  // (Wave ZR-4C): the recency tie-break slots BETWEEN the strength (zfp —
  // the primary) and the proximity-to-reach: among equal-strength candidates
  // the day-local structure wins (the recency bias as a factor); an older zone
  // of superior strength still wins (the recency is NOT the law). The pick
  // never leaves the E2 pathway (cands is already the reach-filtered pool).
  const strongest = (cands: DXYZone[], reach: number): DXYZone | undefined =>
    [...cands].sort((a: DXYZone, b: DXYZone) =>
      (a.zfp - b.zfp) ||
      (recencyRank(a) - recencyRank(b)) ||
      (Math.abs(zoneCenter(a) - reach) - Math.abs(zoneCenter(b) - reach)),
    )[0];

  let supplyPick: DXYZone | undefined;
  let demandPick: DXYZone | undefined;
  let pick: DXYZone | undefined;
  // (2026-07-31 FIX): ALWAYS designate BOTH sides — the golden week has MULTIPLE
  // trades per day (Mon: SHORT 1.14544 + LONG 1.14004; Wed: 3 trades). The cascade's
  // mirrors match by the SETUP's direction; a SHORT mirror on a chain-LONG day needs
  // the day's designated SUPPLY. The shape day's direction picks the PRIMARY
  // (keyZoneId); both sides are emitted for the mirror direction matching.
  const supplyReachRef = dayReachHigh != null
    ? Math.min(isStorylineRange ? dayOpenSpot + travelMax
        : (direction === 'SHORT' ? expectedReach : oppositeReach), dayReachHigh)
    : (isStorylineRange ? dayOpenSpot + travelMax
        : (direction === 'SHORT' ? expectedReach : oppositeReach));
  const demandReachRef = dayReachLow != null
    ? Math.max(isStorylineRange ? dayOpenSpot - travelMax
        : (direction === 'LONG' ? expectedReach : oppositeReach), dayReachLow)
    : (isStorylineRange ? dayOpenSpot - travelMax
        : (direction === 'LONG' ? expectedReach : oppositeReach));
  // ── S2-FINAL (2026-08-05) — THE RUNG-DIRECT DESIGNATION: the operator's
  //    entries ARE the LQZ rungs ("LQZ at 1.1444-1.14395 ~ using this as the
  //    entry zone anchor" — the entry = the LQZ's near edge). The FX oracle
  //    PROVES the machine's rungs at Δ0.5-1.0p of the operator's levels. The
  //    E2's designation should designate the RUNG (the operator's entry
  //    structure) when the day's reach contains one — the E3 then resolves
  //    the rung's near edge DIRECTLY (the e2ZoneResolvedEntry's isLqzAnchor
  //    branch — the exact operator's level!). The S/D-zone designations'
  //    bands (the origin-candle ranges) are WIDER than the operator's refined
  //    bands — the internal-rung resolution either misses the operator's rung
  //    (the strict containment excludes it) or admits the wrong adjacent
  //    rungs (the overlap) — the rung-direct designation bypasses the band
  //    fidelity entirely. The S/D zones remain the SL/TP context + the
  //    RANGE-day fallback.
  const supplyRungs = supplyCands.filter((z: DXYZone) => z.id.startsWith('LMV|'));
  const demandRungs = demandCands.filter((z: DXYZone) => z.id.startsWith('LMV|'));
  if (supplyRungs.length > 0) {
    supplyPick = strongest(supplyRungs, supplyReachRef);
  } else {
    supplyPick = strongest(supplyCands, supplyReachRef);
  }
  if (demandRungs.length > 0) {
    demandPick = strongest(demandRungs, demandReachRef);
  } else {
    demandPick = strongest(demandCands, demandReachRef);
  }
  // ── Wave ZR-6D — THE DEEP-DEMAND DESIGNATION (the SECOND demand). The
  //    operator's EU #6 (verbatim): "Looking left to see what relevant LQZs
  //    exist beneath this demand, one is clearly visible at 1.13935 -
  //    1.13875... this LQZ is the LQ shield of the BoM 4H bullish OB." The
  //    day's PRIMARY demand is the first structure the reach sweeps into;
  //    the DEEP demand = the strongest demand BENEATH the primary's floor —
  //    the deeper structure the extended reach (the primary's reach minus
  //    the shape's max travel — the sweep continues after the primary is
  //    mitigated) visits. Derived from the SAME candidate pool + the SAME
  //    strength mechanics (zfp, then recency, then position-to-reach) —
  //    never a hardcoded level, never a golden fit. Honest absence (no
  //    demand beneath the primary) → undefined — the day carries the ONE
  //    demand (byte-identical to the pre-ZR-6D lanes). ──
  let deepDemandPick: DXYZone | undefined;
  if (demandPick) {
    // The deep pool is the FULL zone pool BENEATH the primary demand within
    // the day's MAX-travel reach — NOT the day-bounded demandCands: the
    // demandCands are capped by the day's reachable low (the R1-b band — the
    // EU Wed demandReach 1.13911 excludes the 1.13815 BoM-4H zone whose
    // ceiling 1.13886 sits beneath it), but the operator's #6 deep structure
    // is EXACTLY that beneath-the-reach LQ shield: "Looking left to see what
    // relevant LQZs exist beneath this demand, one is clearly visible at
    // 1.13935 - 1.13875... this LQZ is the LQ shield of the BoM 4H bullish
    // OB." The deep band = [dayOpenSpot − travelMax, the primary's floor] —
    // the extended sweep the shape's max travel visits after the primary is
    // mitigated. The strength mechanics stay the SAME (zfp, then recency,
    // then position-to-the-primary — the nearest structure beneath the
    // primary wins the ties: the operator's "relevant LQZs BENEATH this
    // demand"). Honest absence → undefined (byte-identical lanes).
    const deepFloor = dayOpenSpot - travelMax;
    const deepPool = pool.filter((z: DXYZone) =>
      isDemandZone(z) &&
      z.ceiling < demandPick!.floor - 1e-9 &&
      z.ceiling >= deepFloor - 1e-9 &&
      inBand(z));
    if (deepPool.length > 0) {
      deepDemandPick = [...deepPool].sort((a: DXYZone, b: DXYZone) =>
        (a.zfp - b.zfp) ||
        (recencyRank(a) - recencyRank(b)) ||
        (Math.abs(zoneCenter(a) - demandPick!.floor) - Math.abs(zoneCenter(b) - demandPick!.floor)),
      )[0];
    }
  }
  if (direction === 'SHORT') {
    pick = supplyPick;
  } else if (direction === 'LONG') {
    pick = demandPick;
  } else if (isStorylineRange) {
    // Wave A1.4 — the RANGE day's PRIMARY designation = the top-of-range
    // SUPPLY (the zone the day's shape rejects at). The keyZoneId MUST be the
    // supply for the SHORT mirror's E2-held entry (selectPairNativeZone's
    // e2Designated check requires keyZoneId === the anchor; the demand rides
    // demandZoneId for the LONG mirrors). Supply absent → the demand.
    pick = supplyPick ?? demandPick;
  } else {
    pick = strongest([...supplyCands, ...demandCands], expectedReach);
  }

  const pickSide: 'SUPPLY' | 'DEMAND' | undefined =
    pick && isSupplyZone(pick) ? 'SUPPLY'
      : pick && isDemandZone(pick) ? 'DEMAND'
        : undefined;

  // ═══════════════════════════════════════════════════════════════════════════
  // Wave I2 (2026-08-01) — THE S/D-ZONE PREFERENCE (Gap 1, the §8.1 union
  // made mechanical). The operator's golden EU Monday SHORT 1.14544: the
  // zfp-first strength pick landed on the BARE LMV rung `LMV|EUR/USD|1.14650`
  // (zfp 20 → entry 1.14656, Δ11.2p), but the 1H SUPPLY zone
  // EUR/USD|1H|1783648800000|1.14469 [1.14469-1.14608] (mid 1.14539, zfp 38 —
  // Δ0.5p from the golden) exists at the structurally-equivalent position and
  // CONTAINS the internal LMV rung [1.14567-1.14583] (band ⊆ the zone's band,
  // top 1.14583 near the zone's active edge 1.14608 — Δ2.5p). The designation
  // must prefer the S/D ZONE that contains the structurally-relevant rungs,
  // not the bare rung itself:
  //   1. position-aware tie-break (fix point 1): among the top candidates
  //      (zfp ties within a small band), prefer the zone whose INTERNAL LMV
  //      rungs (ids `LMV|` fully inside the zone band, same side) sit nearest
  //      the expectedReach — the position-in-structure signal.
  //   2. THE S/D-ZONE PREFERENCE (fix point 2): when the strength pick is a
  //      bare LMV rung but a 1H/4H S/D zone (OB zone, same side) CONTAINS
  //      rungs at the same structural position (the rung's band ⊆ the zone's
  //      band AND the rung is near the zone's ACTIVE edge — the sweep edge),
  //      designate the S/D ZONE (the Fire) and resolve the entry to the
  //      internal rung's NEAR EDGE (the Earth). The D3d lesson: the golden
  //      Wed DXY entry 101.235 sat INSIDE the BoM supply [101.110-101.275] at
  //      the internal rung 101.239.
  //   3. ZR-6A: the E2 designates the S/D ZONE (the Fire) — the exact ENTRY
  //      (the internal rung's near edge — the Earth) is E3's resolution from
  //      the zone geometry ("prices are not even a variable for E2").
  //      Keep the current designation behavior byte-identical when no
  //      internal rung exists (the fallback stays).
  //   DXY is untouched: its Monday/Wednesday pick is ALREADY the 1H BoM supply
  //   [101.110-101.275] (an OB zone, never a bare LMV rung) → the fix never
  //   fires → the Wed SHORT 101.239 baseline holds.
  // Wave I2 SCOPE (2026-08-01): the position-aware S/D-zone preference is the
  // A1.4 Monday tie-break. Wave R1-b (2026-08-01) EXTENDS it to EVERY day when
  // the day-reachability band is active (storyline present): every day's
  // designation must resolve to the zone/rung whose internal near edge is
  // within the day's actual reach — the same position-aware tie-break A1.4
  // used for the Monday. Without a storyline the scope stays MONDAY-ONLY
  // (byte-identical to the A1.4 baseline — diag-e2-cascade's no-storyline
  // Tue LMV 1.14650 anchor + diag-e2-forward's DXY Wed designation hold).
  if ((day === 'Mon' || priorWeekStoryline != null) && pick && pickSide && String(pick.id).startsWith('LMV|')) {
    const sideCands = pickSide === 'SUPPLY' ? supplyCands : demandCands;
    // Wave A1.4 — RANGE-aware position reference for the I2 tie-break: on a
    // RANGE (SS) day the top-of-range rejection (open + travelMax) is the
    // structural position the pick aims at. The pre-A1.4 reference (open ± 0,
    // expectedReach's RANGE value) biased the sort toward the LOWEST containing
    // zone (the floor-adjacent 1.14154 supply) instead of the top-of-range
    // rejection (the 1.14390 supply the Monday's 1.14480 rally rejected at).
    // Wave R1-b — the sort reference is bounded by the day's ACTUAL reach band
    // (the supply tie-break aims at the day's actual high; the demand at the
    // day's actual low) so the position-aware resolution lands within the day's
    // reach, never beyond it.
    const i2ReachRaw = isStorylineRange ? dayOpenSpot + travelMax : expectedReach;
    const i2SortReach = pickSide === 'SUPPLY'
      ? (dayReachHigh != null ? Math.min(i2ReachRaw, dayReachHigh) : i2ReachRaw)
      : (dayReachLow != null ? Math.max(i2ReachRaw, dayReachLow) : i2ReachRaw);
    // The zone's ACTIVE edge (the sweep edge the shape's move sweeps into):
    // SUPPLY → the ceiling; DEMAND → the floor. An internal rung is "near"
    // the active edge when its far edge sits within the near-edge band.
    const NEAR_ACTIVE_EDGE_PIPS = 5;
    const activeEdgeOf = (z: DXYZone): number =>
      pickSide === 'SUPPLY' ? z.ceiling : z.floor;
    const qualifying = sideCands
      // 1H/4H S/D zones ONLY — never another LMV rung, never a 30m reaction.
      // The DXYZone type carries no timeframe field — the id embeds it
      // (`EUR/USD|1H|1783648800000|1.14469` — segment 1). LMV ids
      // (`LMV|EUR/USD|…`) are excluded by the not-startsWith guard anyway.
      .filter((z) => !String(z.id).startsWith('LMV|')
        && (String(z.id).split('|')[1] === '1H' || String(z.id).split('|')[1] === '4H'))
      .map((z) => ({
        z,
        // The internal LMV rungs (the Earth) fully inside the zone band, same
        // side — the §8.1 "Fire = the containing S/D zone" structural union.
        internal: pool.filter((r) =>
          String(r.id).startsWith('LMV|') &&
          (pickSide === 'SUPPLY' ? isSupplyZone(r) : isDemandZone(r)) &&
          r.floor >= z.floor - 1e-9 && r.ceiling <= z.ceiling + 1e-9),
      }))
      // CONTAINS rungs (the zone is a Fire bearing the Earth) …
      .filter((c) => c.internal.length > 0)
      // … at the same structural position: an internal rung NEAR the zone's
      // ACTIVE edge (the sweep edge the shape sweeps into). The bare-LMV pick
      // sits at/just beyond that edge — the zone whose rungs occupy the
      // structural position the pick pointed at.
      .filter((c) => c.internal.some((r) => {
        const farEdge = pickSide === 'SUPPLY' ? r.ceiling : r.floor;
        return Math.abs(activeEdgeOf(c.z) - farEdge) / pipSize <= NEAR_ACTIVE_EDGE_PIPS;
      }))
      // Position-aware tie-break (fix point 1): the zone whose INTERNAL LMV
      // rungs sit NEAREST the expectedReach (RANGE-aware — the top-of-range)
      // wins — the position-in-structure signal (then the zone's own strength,
      // then id — total, deterministic).
      .sort((a, b) => {
        const nearA = Math.min(...a.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)));
        const nearB = Math.min(...b.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)));
        return (nearA - nearB) ||
          (a.z.zfp - b.z.zfp) ||
          (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0);
      })[0];
    if (qualifying) {
      // Designate the S/D ZONE (the Fire). ZR-6A: the exact entry (the
      // internal rung's NEAR EDGE — the Earth) is E3's resolution from the
      // zone geometry — E2 emits the zone anchor only.
      pick = qualifying.z;
      if (pickSide === 'SUPPLY') supplyPick = qualifying.z;
      else demandPick = qualifying.z;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZR-6A (2026-08-04) — THE PRICE COMPUTATION IS REMOVED FROM E2.
  // The former block resolved keyZonePrice = the ENTRY level per the §8.1
  // anchor union (Earth = the internal LQZ rung, Fire = the S/D zone
  // containing it) — the internal-rung near-edge walk (internalRungs /
  // reachableRungs / sweepEdge / entryRung). THAT WAS THE DERAILMENT: E2
  // computing exact prices. The operator (QUOTED): "E2 generates SHAPE CHAIN
  // from ZONE ANCHORS (prices are not even a variable for E2). E3 generates
  // trade setups at specific price levels on top of the E2 shape chain."
  // E2 emits the ZONE ANCHOR (pick — the Fire, with its E1 geometry); the
  // exact entry (the internal rung's NEAR EDGE — the Earth) is E3's
  // resolution from the zone geometry (the parallel wave). The designation
  // (pick / supplyPick / demandPick) above is UNCHANGED — only the price
  // emission is gone. No new constants, no fitted numbers — the strip is
  // surgical: the E2's zone selection + the shape chain are PROVEN.
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    day,
    shape,
    direction,
    // ZR-6A: E2 emits ZONE ANCHORS ONLY — the machine zone ids + the day
    // band + the day-open reference. NO prices — the E3 resolves the
    // entry/TP from the zone geometry (keyZonePrice / supplyZonePrice /
    // demandZonePrice are GONE from the E2 output).
    keyZoneId: pick?.id ?? '',
    supplyZoneId: supplyPick?.id,
    demandZoneId: demandPick?.id,
    // ZR-6D: the PRIMARY side (the RANGE-day direction signal — the A1.4
    // top-of-range SUPPLY primary → the SHORT direction consumes the
    // keyZoneId) + the SECOND demand (the deep demand beneath the primary).
    keyZoneType: pick ? (isSupplyZone(pick) ? 'SUPPLY' : 'DEMAND') : undefined,
    deepDemandZoneId: deepDemandPick?.id,
    floor,
    ceiling,
    dayOpenSpot,
    // The day's session — the existing SHAPE_SESSION_MAP (single source of truth).
    session: getSessionForShape(shape),
    // The shape day's confidence (pass-through).
    confidence: confidence ?? 0.5,
  };
}

/**
 * E2-1 + E2-2: Build a 5-day day-level decomposition.
 *
 * E2-2 FIX: Day decomposition is DERIVED from the ZFP chain (predictNextShape),
 * NOT hardcoded energy patterns. The chain from buildShapeChain provides the
 * primary shape for each day. Energy patterns are a FALLBACK when the chain
 * doesn't extend far enough.
 *
 * E2-1 FIX: Trading Speed Rule +1 day shift is APPLIED here.
 * "Today's move often ends up being tomorrow's move." The shape predicted for
 * day N is assigned to day N+1. The first shape in the energy cycle is
 * assigned to TUESDAY (not Monday).
 *
 * E2-7 FIX: Session assignment is shape-based, not day-based.
 *
 * PHASE 5 E1: Each day now carries the DayBand designation — the E2-designated
 * machine keyZoneId (SHORT → supply above / LONG → demand below the day's
 * predicted London-open spot), supplyZoneId/demandZoneId, and the projected
 * day range (floor/ceiling/dayOpenSpot) — for E3 cascade consumption.
 */
function buildDayDecomposition(
  currentShape: ShapeCode,
  zones: readonly DXYZone[],
  spot: number,
  chain: ShapePrediction[],
  ltfZones: readonly DXYZone[] = [],
  priorWeekStoryline?: PriorWeekStoryline | null,
): DayShapePrediction[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // ── Wave A1.4 — the opening-consolidation signal (the pre-flight storyline).
  //    The prior-week sweep low + recovery → the OPENING day (Monday, i === 0)
  //    consolidates above the swept low (SS, not the chain's PBS). The chain's
  //    ZFP-driven projection (predictNextShape BS@65 → PBS) is the BREAKOUT
  //    reading the canon-ladder ZFP misleads; the storyline overrides the
  //    opening day only. No storyline → false → the chain shapes stand
  //    (byte-identical). ──
  const openingConsolidatesWeek = openingConsolidates(priorWeekStoryline, spot);

  // ── Phase 5 E1: DayBand chain carry. Monday's priorDayClose is the model spot
  //    (the Friday close — the ONLY Friday-spot use). Each subsequent day's
  //    priorDayClose = the PRIOR day's predicted London-open spot (dayOpenSpot)
  //    — the operator's forward-mapped chain, waveform based not Friday-spot based. ──
  let dayBandCarry = spot;
  // ZR-7C — THE CHAIN CARRY (the spec Part 8.3 DayProjection): the PRIOR
  // day's projected TP (the opposing-side designation) feeds the NEXT day's
  // designation — the chain progression ("TP OF ONE = ENTRY OF NEXT" — Law
  // 27). Monday's projection = undefined (no prior day — the opening stands
  // on the pressure + the day-local + the zfp).
  let priorDayProjection: { projectedTpZoneId?: string; projectedTp?: number } | undefined;

  const nearestSupply = findNearestSupplyAbove(zones, spot);
  const nearestDemand = findNearestDemandBelow(zones, spot);
  const avgZfp = computeAverageZFP(zones);

  // Consolidation detection from zone spread
  const zoneHigh = zones.length > 0 ? Math.max(...zones.map((z) => z.ceiling)) : spot;
  const zoneLow = zones.length > 0 ? Math.min(...zones.map((z) => z.floor)) : spot;
  const weeklyRangePips = zoneHigh - zoneLow;
  const isConsolidation = weeklyRangePips < (CONSOL_RANGE_THRESHOLD['DXY'] ?? 120);

  // Check for a failing zone (high ZFP → breakout candidate)
  const failingZone = zones.find((z: DXYZone) => z.zfp > ZFP_ZONE_FAILURE_THRESHOLD);
  const failingDirection: string = failingZone
    ? (failingZone.floor > spot ? 'UP' : 'DOWN')
    : 'NEUTRAL';

  // ── E2-2: Energy Cycle Patterns (FALLBACK only) ──
  // Used when the chain doesn't provide a shape for a given day.
  type DayPattern = ShapeCode[];
  const energyPatterns: Record<string, DayPattern> = {
    [ShapeCode.SS]: isConsolidation
      ? [ShapeCode.SS, ShapeCode.SS, ShapeCode.BS, ShapeCode.R, ShapeCode.WL]
      : [ShapeCode.SS, ShapeCode.SS, ShapeCode.BS, ShapeCode.R, ShapeCode.SS],
    [ShapeCode.BS]:  [ShapeCode.BS, ShapeCode.R, ShapeCode.RWL, ShapeCode.SS, ShapeCode.SS],
    [ShapeCode.PBS]: [ShapeCode.PBS, ShapeCode.R, ShapeCode.SS, ShapeCode.SS, ShapeCode.BS],
    [ShapeCode.WL]:  [ShapeCode.WL, ShapeCode.R, ShapeCode.SS, ShapeCode.BS, ShapeCode.SS],
    [ShapeCode.PWL]: [ShapeCode.PWL, ShapeCode.R, ShapeCode.SS, ShapeCode.BS, ShapeCode.SS],
    [ShapeCode.RWL]: [ShapeCode.RWL, ShapeCode.R, ShapeCode.SS, ShapeCode.SS, ShapeCode.BS],
    [ShapeCode.PRWL]:[ShapeCode.PRWL, ShapeCode.R, ShapeCode.SS, ShapeCode.BS, ShapeCode.SS],
    [ShapeCode.R]:  [ShapeCode.R, ShapeCode.SS, ShapeCode.SS, ShapeCode.BS, ShapeCode.R],
    [ShapeCode.RS]: [ShapeCode.RS, ShapeCode.WL, ShapeCode.SS, ShapeCode.SS, ShapeCode.R],
    [ShapeCode.WLS]: [ShapeCode.WLS, ShapeCode.SS, ShapeCode.BS, ShapeCode.R, ShapeCode.SS],
  };
  const fallbackPattern: DayPattern = energyPatterns[currentShape] ?? energyPatterns[ShapeCode.SS]!;

  // ── Build day predictions with zone-anchored rationale ──
  const predictions: Array<DayShapePrediction & ShapeDayFields> = [];

  for (let i = 0; i < TRADING_DAYS_PER_WEEK; i++) {
    // BUG 4 FIX: Raw Mon-Fri calendar — Monday = chain[0].
    // The Trading Speed Rule +1 shift is tracked as adjustedDay metadata,
    // NOT by remapping the day label (which deleted Monday, duplicated Friday).
    const day = days[i]!;
    const shiftedDayIndex = Math.min(i + 1, TRADING_DAYS_PER_WEEK - 1);
    const adjustedDay = days[shiftedDayIndex]!;

    // E2-2: Derive shape from the ZFP chain (primary), fall back to energy pattern.
    // Wave A1.4: the pre-flight storyline's opening-consolidation signal
    // overrides the OPENING day (Monday) to SS — the week opened consolidating
    // above the prior-week swept low (NOT a fresh PBS). The rest of the week
    // (Tue-Fri) follows the chain/energy-pattern (byte-identical without a
    // storyline).
    const shape: ShapeCode = (i === 0 && openingConsolidatesWeek)
      ? ShapeCode.SS
      : (chain.length > i
        ? chain[i]!.shape
        : (fallbackPattern[i] ?? ShapeCode.SS));

    // Determine direction, confidence, keyZone, and rationale per shape type
    let direction: string;
    let keyZone: string;
    let confidence: number;
    let rationale: string;

    switch (shape) {
      case ShapeCode.SS:
        direction = 'RANGE';
        confidence = Math.max(CONFIDENCE_LOW, 0.80 - i * 0.03);
        if (nearestSupply && nearestDemand) {
          keyZone = `Range: ${zoneLabel(nearestDemand)} ↔ ${zoneLabel(nearestSupply)}`;
          rationale = `Swing Scalps range. Ceiling: ${zoneLabel(nearestSupply)}. Floor: ${zoneLabel(nearestDemand)}. Both ZFP < ${ZFP_LOW_THRESHOLD}%.`;
        } else {
          keyZone = nearestSupply
            ? `Nearest supply: ${zoneLabel(nearestSupply)}`
            : nearestDemand
              ? `Nearest demand: ${zoneLabel(nearestDemand)}`
              : 'No bounding zones';
          rationale = 'Swing Scalps range — limited zone data, defaulting to range.';
        }
        break;

      case ShapeCode.BS:
      case ShapeCode.PBS:
        direction = failingZone ? failingDirection : inferDirection(zones, spot);
        confidence = Math.max(CONFIDENCE_LOW, 0.72 - i * 0.03);
        keyZone = failingZone
          ? zoneLabel(failingZone)
          : (nearestSupply ? zoneLabel(nearestSupply) : (nearestDemand ? zoneLabel(nearestDemand) : '—'));
        rationale = failingZone
          ? `Zone failing (ZFP > ${ZFP_ZONE_FAILURE_THRESHOLD}%). BS ${direction} expected through ${failingZone!.id}.`
          : `Breakout shape — ${direction} direction inferred from zone arrangement.`;
        break;

      case ShapeCode.R:
        direction = 'NEUTRAL';
        confidence = Math.max(CONFIDENCE_LOW, 0.68 - i * 0.03);
        keyZone = nearestSupply && nearestDemand
          ? `Recovery toward ${zoneLabel(nearestSupply)} / ${zoneLabel(nearestDemand)}`
          : 'Post-breakout vacuum';
        rationale = 'Post-breakout recovery — price seeking new equilibrium.';
        break;

      case ShapeCode.WL:
      case ShapeCode.PWL:
        direction = 'RANGE';
        confidence = Math.max(CONFIDENCE_LOW, 0.65 - i * 0.03);
        keyZone = nearestSupply ? zoneLabel(nearestSupply) : (nearestDemand ? zoneLabel(nearestDemand) : '—');
        rationale = 'Whiplash expected — zones failing one by one, range-bound volatility.';
        break;

      case ShapeCode.RWL:
      case ShapeCode.PRWL:
        direction = failingZone
          ? (failingZone!.floor > spot ? 'DOWN' : 'UP')
          : 'RANGE';
        confidence = Math.max(CONFIDENCE_LOW, 0.63 - i * 0.03);
        keyZone = nearestSupply && nearestDemand
          ? `Reversal watch: ${zoneLabel(nearestDemand)} ↔ ${zoneLabel(nearestSupply)}`
          : 'No bounding zones';
        rationale = 'Reverse whiplash — current trend exhausting, reversal warning.';
        break;

      case ShapeCode.RS:
        direction = 'UP';
        confidence = Math.max(CONFIDENCE_LOW, 0.66 - i * 0.03);
        keyZone = nearestSupply ? zoneLabel(nearestSupply) : 'Pre-breakout level';
        rationale = 'Recovery surge — strong directional move back toward pre-breakout level.';
        break;

      case ShapeCode.WLS:
        direction = 'RANGE';
        confidence = Math.max(CONFIDENCE_LOW, 0.64 - i * 0.03);
        keyZone = nearestSupply && nearestDemand
          ? `WLS oscillation: ${zoneLabel(nearestDemand)} ↔ ${zoneLabel(nearestSupply)}`
          : 'Multiple zones in narrow range';
        rationale = 'Whiplash storm — violent two-way action, breakout resolution pending.';
        break;

      default:
        direction = 'NEUTRAL';
        confidence = Math.max(CONFIDENCE_LOW, 0.65 - i * 0.03);
        keyZone = '—';
        rationale = `${shape} — see energy cycle pattern.`;
    }

    // ZFP range for this day (based on actual zone data)
    const dayZfpLow = Math.max(0, avgZfp - ZFP_FLOOR_OFFSET - i * ZFP_FLOOR_STEP);
    const dayZfpHigh = Math.min(MAX_ZFP_PERCENT, avgZfp + ZFP_CEILING_OFFSET + i * ZFP_CEILING_STEP);

    // ── Trading Speed Rule (§6.10): confidence reduction ──
    const timingReduction = i < TRADING_DAYS_PER_WEEK - 1
      ? TIMING_CONFIDENCE_REDUCTION_BASE - i * TIMING_CONFIDENCE_REDUCTION_STEP
      : 0;
    const speedAdjustedConfidence = Math.max(CONFIDENCE_LOW,
      confidence * (1 - timingReduction));

    // ── Phase 5 E1: DayBand designation for this day ──
    // The E2-designated ENTRY zone: SHORT days → supply ABOVE the day's predicted
    // London-open spot; LONG days → demand BELOW it. The DayBand carry updates to
    // this day's dayOpenSpot — the next day's priorDayClose (the forward chain).
    const e1Direction = toEntryDirection(direction);
    const szd = projectZoneForDay(
      day.slice(0, 3),
      shape,
      e1Direction,
      zones,
      dayBandCarry,
      ltfZones,
      speedAdjustedConfidence,
      priorWeekStoryline,
      priorDayProjection,
    );
    dayBandCarry = szd.dayOpenSpot;
    // ZR-7C S2 — the chain carry update: the day's projected TP = the
    // OPPOSING-side designation (the SHORT day's demand = the TP side; the
    // LONG day's supply; the RANGE day's opposite of the keyZoneType primary
    // — the ZR-6D contract). The LEVEL = the opposing zone's INTERNAL-LQZ
    // NEAR EDGE (the operator's "TP at the demand nested LQZ's near edge" —
    // the chain levels are the LQZ edges, NOT the zone centers — the C4
    // experiment's measured tuning: the center-level chain dragged the GU
    // rows away). No opposing zone → no chain anchor (the honest absence —
    // the next day stands on the pressure selection).
    const chainOpposingId = szd.direction === 'SHORT' ? szd.demandZoneId
      : szd.direction === 'LONG' ? szd.supplyZoneId
      : (szd.keyZoneType === 'SUPPLY' ? szd.demandZoneId : szd.supplyZoneId);
    const chainOpposingZone = chainOpposingId
      ? zones.find((z: DXYZone) => z.id === chainOpposingId)
          ?? ltfZones.find((z: DXYZone) => z.id === chainOpposingId)
      : undefined;
    const chainOpposingSide = szd.direction === 'LONG' ? 'SUPPLY' as const : 'DEMAND' as const;
    const chainLevel = chainOpposingId && chainOpposingZone
      ? internalLqzNearEdge(chainOpposingZone, [...zones, ...ltfZones], chainOpposingSide)
      : undefined;
    if (process.env.ZR7C_DEBUG) {
      console.log('[ZR7C-CARRY]', day, 'dir=' + szd.direction, 'opposingId=' + (chainOpposingId ?? 'none').slice(0, 34), 'zone=' + (chainOpposingZone ? chainOpposingZone.id.slice(0, 34) + ' band=[' + chainOpposingZone.floor.toFixed(5) + ',' + chainOpposingZone.ceiling.toFixed(5) + ']' : 'none'), 'level=' + (chainLevel != null ? chainLevel.toFixed(5) : 'none'));
    }
    priorDayProjection = chainOpposingId && chainLevel != null
      ? { projectedTpZoneId: chainOpposingId, projectedTp: chainLevel }
      : undefined;
    // The day's own projection rides the ShapeDayZone (the shape-cascade /
    // mirror consumers read the chain anchors — additive).
    (szd as { projectedTpZoneId?: string; projectedTp?: number }).projectedTpZoneId = chainOpposingId;
    (szd as { projectedTpZoneId?: string; projectedTp?: number }).projectedTp = priorDayProjection?.projectedTp;
    // The picked zone's full geometry (coherent with keyZoneId — same zone).
    const pickZone = szd.keyZoneId
      ? zones.find((z: DXYZone) => z.id === szd.keyZoneId)
          ?? ltfZones.find((z: DXYZone) => z.id === szd.keyZoneId)
      : undefined;

    const timingNote = i < TRADING_DAYS_PER_WEEK - 1
      ? `E2-1 Trading Speed Rule: predicted for ${day} → adjusted to ${adjustedDay} (+1 day, price moves at 30-50% expected speed)`
      : `E2-1 Trading Speed Rule: ${day} prediction — timing risk persists into next week`;

    predictions.push({
      day,
      shape,
      confidence: speedAdjustedConfidence,
      direction,
      keyZone,
      rationale,
      zfpRange: { low: dayZfpLow, high: dayZfpHigh },
      keyTransitionTime: getSessionForShape(shape),
      // E2-7: Shape-based session assignment
      sessionWindow: getSessionForShape(shape),
      // E2-1: Raw calendar day (Monday = chain[0])
      originalPredictedDay: day,
      // BUG 4 FIX: +1 shifted day tracked as metadata (not day-label remap)
      adjustedDay,
      timingAdjustment: timingNote,
      speedAdjustedConfidence,
      // ── Phase 5 E1: machine zone ids for E3 cascade (ENTRY-rung semantics) ──
      // keyZoneId is the E2-designated ENTRY zone (SHORT → supply above the day's
      // predicted London-open spot; LONG → demand below it). The display `keyZone`
      // string above is retained for the report narrative.
      // ZR-6A: the day rows carry the ZONE ANCHORS + the band — the price stamps
      // (keyZonePrice / supplyZonePrice / demandZonePrice) are DROPPED (E2 emits
      // no prices — the E3 resolves them from the zones). The anchor's E1 geometry
      // (keyZoneFloor/Ceiling/Type/Zfp) stays — it IS the zone, not an E2 level.
      keyZoneId: szd.keyZoneId || undefined,
      keyZoneFloor: pickZone?.floor ?? undefined,
      keyZoneCeiling: pickZone?.ceiling ?? undefined,
      keyZoneType: szd.keyZoneType ?? pickZone?.type ?? undefined,
      keyZoneZfp: pickZone?.zfp ?? undefined,
      supplyZoneId: szd.supplyZoneId ?? undefined,
      demandZoneId: szd.demandZoneId ?? undefined,
      // ZR-6D: the SECOND designated demand (the deep demand beneath the
      // primary — the operator's EU #6's BoM-4H structure) rides the day row
      // for the E3 contract (the E2 CORE's ShapeDayZone carries it).
      deepDemandZoneId: szd.deepDemandZoneId ?? undefined,
      // E1 DayBand: the projected day range + the forward-mapped London-open spot
      floor: szd.floor,
      ceiling: szd.ceiling,
      dayOpenSpot: szd.dayOpenSpot,
      // The E2-authoritative session (the bridge prefers it over keyTransitionTime).
      session: szd.session,
    });

    log.debug(`E2-1 DayDecomp: ${day}→${adjustedDay}=${shape} (${direction}, conf ${(speedAdjustedConfidence * PCT_MULTIPLIER).toFixed(0)}%) — ${rationale} | E1 dayOpen=${szd.dayOpenSpot.toFixed(5)} key=${szd.keyZoneId} S=${szd.supplyZoneId ?? '-'} D=${szd.demandZoneId ?? '-'}`);
  }

  // ── Verify shape variety ──
  const uniqueShapes = new Set(predictions.map((p) => p.shape));
  if (uniqueShapes.size <= 1) {
    log.warn(`buildDayDecomposition: only ${uniqueShapes.size} unique shape(s) for start=${currentShape} — check energy cycle pattern`);
  } else {
    log.info(`buildDayDecomposition: ${uniqueShapes.size} unique shapes across 5 days (${[...uniqueShapes].join(', ')})`);
  }

  return predictions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2-9: Alternative Chains with Decision Zones + ZFP Thresholds
// Replaces 3 hardcoded single-shape scenarios with multi-step chains that
// have: trigger condition (zone rejection/break), ZFP threshold range, and
// multi-step chain (3-5 days showing what happens after the trigger).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * E2-9: Build alternative chains from actual zone data.
 *
 * Each chain represents a possible path if the primary chain's assumptions fail.
 * Chains are triggered by specific conditions (zone rejection, zone break,
 * consolidation extension, whiplash storm).
 */
function buildAlternativeChains(
  zones: readonly DXYZone[],
  spot: number,
  currentShape: ShapeCode,
  currentZfp: number,
  primaryChain: ShapePrediction[],
): Array<Record<string, unknown>> {
  const alternatives: Array<Record<string, unknown>> = [];
  const chainLength = Math.max(3, Math.min(5, primaryChain.length));

  // ── ALTERNATIVE 1: MoM zone rejection → reversal chain ──
  // Triggered when a MoM zone holds and rejects price.
  const momZones = zones.filter((z: DXYZone) =>
    (z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.MOM_DEMAND) &&
    z.reactionCount <= 2,
  );
  for (const momZone of momZones.slice(0, 2)) {
    const isAbove = momZone.floor > spot;
    const reversalSteps: string[] = [];
    let stepShape = ShapeCode.RWL;
    for (let s = 0; s < chainLength; s++) {
      if (s === 0) {
        stepShape = ShapeCode.RWL;
        reversalSteps.push(`Day${s + 1}: RWL (reversal begins at ${momZone.id})`);
      } else if (s <= 2) {
        stepShape = ShapeCode.WL;
        reversalSteps.push(`Day${s + 1}: WL (wide leg in reversal direction)`);
      } else {
        stepShape = ShapeCode.R;
        reversalSteps.push(`Day${s + 1}: R (reinforcement at opposing zone)`);
      }
    }
    alternatives.push({
      scenario: `MoM rejection at ${momZone.id}`,
      triggerCondition: `${momZone.id} holds — price reverses ${isAbove ? 'down' : 'up'} off zone`,
      decisionZone: momZone.id,
      zfpThreshold: { from: momZone.zfp, to: 100 },
      shape: ShapeCode.RWL as string,
      probability: momZone.zfp > 50 ? '70%' : '40%',
      steps: reversalSteps.join(' → '),
    });
  }

  // ── ALTERNATIVE 2: Weak zone breaks → breakout acceleration ──
  // Triggered when a weak zone (low ZFP) fails and price accelerates.
  const weakZones = zones.filter((z: DXYZone) =>
    z.zfp < ZFP_LOW_THRESHOLD &&
    z.type !== ZoneType.MOM_SUPPLY && z.type !== ZoneType.MOM_DEMAND,
  );
  for (const weakZone of weakZones.slice(0, 2)) {
    const breakoutSteps: string[] = [];
    for (let s = 0; s < chainLength; s++) {
      if (s === 0) {
        breakoutSteps.push(`Day${s + 1}: BS (${weakZone.id} breaks, momentum surge)`);
      } else if (s === 1) {
        breakoutSteps.push(`Day${s + 1}: PBS (cascade through next zone)`);
      } else {
        breakoutSteps.push(`Day${s + 1}: R (exhaustion at target)`);
      }
    }
    alternatives.push({
      scenario: `${weakZone.id} breaks (ZFP ${weakZone.zfp.toFixed(0)}%)`,
      triggerCondition: `${weakZone.id} fails — price accelerates through zone`,
      decisionZone: weakZone.id,
      zfpThreshold: { from: 0, to: weakZone.zfp },
      shape: ShapeCode.BS as string,
      probability: weakZone.zfp < 20 ? '75%' : '45%',
      steps: breakoutSteps.join(' → '),
    });
  }

  // ── ALTERNATIVE 3: Consolidation extends (no breakout) ──
  // Triggered when SS persists and no zone breaks.
  if (currentShape === ShapeCode.SS || currentShape === ShapeCode.WLS) {
    const ssSteps: string[] = [];
    for (let s = 0; s < chainLength; s++) {
      ssSteps.push(`Day${s + 1}: SS (range-bound, ZFP ${Math.min(45, currentZfp + s * 2).toFixed(0)}%)`);
    }
    alternatives.push({
      scenario: 'Consolidation extends, no breakout',
      triggerCondition: 'Both bounding zones hold — no zone reaches ZFP > 45%',
      decisionZone: 'bounding zones',
      zfpThreshold: { from: 45, to: 100 },
      shape: ShapeCode.SS as string,
      probability: currentZfp < ZFP_LOW_THRESHOLD ? '60%' : '30%',
      steps: ssSteps.join(' → '),
    });
  }

  // ── ALTERNATIVE 4: Whiplash storm develops ──
  // Triggered when whiplash density signals rise.
  const wlsSteps: string[] = [];
  for (let s = 0; s < chainLength; s++) {
    if (s === 0) {
      wlsSteps.push(`Day${s + 1}: WLS (whiplash storm develops)`);
    } else if (s === 1) {
      wlsSteps.push(`Day${s + 1}: BS (bounding zone finally fails)`);
    } else {
      wlsSteps.push(`Day${s + 1}: R (post-breakout recovery)`);
    }
  }
  alternatives.push({
    scenario: 'Whiplash storm develops',
    triggerCondition: 'Multiple zones tested in rapid succession — volatility amplifies',
    decisionZone: 'cluster of 3+ moderate-ZFP zones',
    zfpThreshold: { from: 0, to: 100 },
    shape: ShapeCode.WLS as string,
    probability: '25%',
    steps: wlsSteps.join(' → '),
  });

  return alternatives;
}

/**
 * BUG 1 FIX: Get the DIRECTIONAL ZFP for the shape chain.
 *
 * Per spec §6.4.1, the ZFP used for transition prediction must be the
 * DIRECTIONAL target zone's ZFP — NOT an average of supply and demand.
 *
 *   - Bullish path (BS/PBS/RS): price heading UP → tests SUPPLY above
 *     → use nearestSupply.zfp
 *   - Bearish path (WL/PWL/RWL/PRWL/WLS): price heading DOWN → tests DEMAND below
 *     → use nearestDemand.zfp
 *   - Neutral path (SS/R): range-bound → fall back to average
 */
function getDirectionalZfp(
  _shape: ShapeCode,
  nearestSupply: DXYZone | undefined,
  nearestDemand: DXYZone | undefined,
  avgZfp: number,
): number {
  // Direction from ZONE PROXIMITY — not shape classification.
  // Shapes provide category mapping and alignment context, NOT direction.
  // The zone with higher ZFP is under more pressure — it's the zone being tested.
  // This replaces the old bullishShapes/bearishShapes hardcoded lists.
  if (nearestSupply && nearestDemand) {
    return nearestSupply.zfp >= nearestDemand.zfp
      ? nearestSupply.zfp
      : nearestDemand.zfp;
  }
  if (nearestSupply) return nearestSupply.zfp;
  if (nearestDemand) return nearestDemand.zfp;
  return avgZfp;
}

/**
 * Build the 5-day shape chain prediction.
 *
 * Implements the 5-Step Forward Mapping from the Trident system prompt:
 *   1. Current Shape Identification (zone-interaction + density)
 *   2. Transition Probability Assessment (ZFP-conditioned, actual zone ZFP)
 *   3. Chain Extension with Audit Trail
 *   4. Alternative Chain Analysis
 *   5. Session/Day-Level Decomposition (zone-anchored with rationale)
 */
function buildShapeChain(
  zones: readonly DXYZone[],
  spots: Record<string, number>,
  instrument?: string,
  ltfZones: readonly DXYZone[] = [],
  priorWeekStoryline?: PriorWeekStoryline | null,
): ShapeChain {
  // W6-3: use the INSTRUMENT'S OWN spot, not a hardcoded DXY spot. Under the
  // old code every EUR (~1.14) / GBP (~1.34) zone was "below spot" by
  // construction (spot was DXY ~100), corrupting every density heuristic and
  // making per-pair inverse prediction impossible. DXY fallback preserves
  // byte-identical behavior for instrument='DXY' and legacy 'MULTI' callers.
  const instrumentSpot = spots[instrument ?? 'DXY'] ?? spots['DXY'] ?? 0;

  // ── 1. Current Shape Identification ──
  // Use density-based identifyCurrentShape for rich variants (WL, RS, PWL, etc.),
  // but refine SS/BS via zone-interaction classifyShape which anchors to the
  // nearest bounding zones and their actual ZFP values.
  const richShape = identifyCurrentShape(zones, spots, instrument, ltfZones, priorWeekStoryline);
  const zoneShape = classifyShape(zones, instrumentSpot, ltfZones);
  // If identifyCurrentShape returned a simple SS/BS, prefer the zone-interaction
  // result. Rich variants (WL, PWL, PRWL, RS, RWL, PBS) are kept as-is.
  const isSimpleSsOrBs = richShape === ShapeCode.SS || richShape === ShapeCode.BS || richShape === ShapeCode.R;
  // ── Wave A1.4 — the pre-flight opening classification is AUTHORITATIVE ──
  // The zone-interaction heuristic (classifyShape) reads the nearest bounding
  // 1H zones' canon-ladder ZFP (65+) as a BREAKOUT — but the prior-week sweep
  // low + recovery means the current week OPENED consolidating above the swept
  // low (SS, not a fresh PBS). The storyline signal overrides the opening
  // classification; without a storyline the combination stands (byte-identical).
  const openingConsolidatesWeek = openingConsolidates(priorWeekStoryline, instrumentSpot);
  const currentShape = openingConsolidatesWeek
    ? ShapeCode.SS
    : (isSimpleSsOrBs ? zoneShape : richShape);

  // ── 2. ZFP for transitions — actual per-zone ZFP, directional per spec §6.4.1 ──
  const avgZfp = computeAverageZFP(zones);
  const nearestSupply = findNearestSupplyAbove(zones, instrumentSpot);
  const nearestDemand = findNearestDemandBelow(zones, instrumentSpot);
  // BUG 1 FIX: Use DIRECTIONAL target zone ZFP, NOT averaged supply+demand.
  // The initial directional ZFP is derived from currentShape — bullish → supply,
  // bearish → demand. Each chain step re-evaluates based on prevShape.
  const initialDirectionalZfp = getDirectionalZfp(currentShape, nearestSupply, nearestDemand, avgZfp);

  const instrumentLabel = instrument ?? 'UNKNOWN';

  // ── E2-5: Virgin MoM Death Zone Detection ──
  // Virgin MoM zones are DEATH ZONES — automatic REJECT, no exceptions.
  // Flag them in the output so Engine 3 knows to avoid them.
  const momEvaluation = evaluateAllMoMZones(zones);
  const deathZoneWarning = momEvaluation.deathZones.length > 0
    ? ` | MOM_DEATH_ZONE: virgin MoM zones [${momEvaluation.deathZones.join(', ')}] — REJECT (no entries)`
    : '';

  const currentContext = zones.length > 0 && instrumentSpot
    ? `${instrumentLabel}: shape=${currentShape}, ZFP avg=${avgZfp.toFixed(0)}%, directional ZFP=${initialDirectionalZfp.toFixed(0)}%, ${zones.length} zones active${deathZoneWarning}`
    : `${instrumentLabel}: no zone data — defaulting to SS`;

  // ── 3. Chain Extension with zone-anchored context ──
  // BUG 1 FIX: Each step re-evaluates the directional ZFP based on prevShape.
  // BUG 5 FIX: Chain terminates when cumulative confidence drops below floor.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const chain: ShapePrediction[] = [];

  let prevShape = currentShape;
  let cumulativeConfidence = 1.0;
  for (let i = 0; i < days.length; i++) {
    // BUG 1 FIX: Re-evaluate directional ZFP per step.
    // Bullish prevShape → supply ZFP. Bearish → demand ZFP.
    const stepZfp = getDirectionalZfp(prevShape, nearestSupply, nearestDemand, avgZfp);

    const stepConfidence = Math.max(CHAIN_CONFIDENCE_FLOOR, CHAIN_CONFIDENCE_INITIAL - i * CHAIN_CONFIDENCE_DECAY);
    // BUG 5 FIX: Chain termination — stop extending if cumulative confidence < floor.
    cumulativeConfidence *= stepConfidence;
    if (cumulativeConfidence < CHAIN_CONFIDENCE_FLOOR) {
      log.debug(`buildShapeChain: terminated at step ${i + 1} — cumulative confidence ${(cumulativeConfidence * 100).toFixed(0)}% < floor ${(CHAIN_CONFIDENCE_FLOOR * 100).toFixed(0)}%`);
      break;
    }

    // ZR-7C S1 — THE CONTESTED ZONE (EVOLVED): the shape's directional TARGET
    // — the operator's "the ZFP of the TARGET zone determines what happens
    // next" — the zone the shape's move is headed toward, not the static
    // week-level bounding: the bearish momentum shapes (BS/PBS — the
    // breakout) target the DEMAND; the bullish recovery shapes (R/RS — the
    // recovery) target the SUPPLY; the whiplash/reversal shapes (WL/RWL)
    // reject at the higher-zfp bounding. The pressure-aware transition
    // overlay consumes its lifecycle/mitigation count — the ZFP matrix
    // stays the fallback (ONE input).
    const contestedZone = (prevShape === ShapeCode.BS || prevShape === ShapeCode.PBS)
      ? nearestDemand
      : (prevShape === ShapeCode.R || prevShape === ShapeCode.RS || prevShape === ShapeCode.WL || prevShape === ShapeCode.RWL)
        ? nearestSupply   // the recovery + the whiplash + the reversal all contest the SUPPLY (the operator's whiplash pattern: "the recovery reaches the MoM supply zone" — the #5; "the whiplash at the fortress" — the #8)
        : (nearestSupply && nearestDemand
            ? (nearestSupply.zfp >= nearestDemand.zfp ? nearestSupply : nearestDemand)
            : (nearestSupply ?? nearestDemand));
    const nextShape = predictNextShapePressureAware(prevShape, stepZfp, contestedZone, i);
    const dayLabel = `${days[i]} (week)`;

    // Build zone-anchored context string with per-step directional ZFP
    const contextParts: string[] = [`Predicted from ${prevShape} with directional ZFP ${stepZfp.toFixed(0)}%`];
    if (nearestSupply) contextParts.push(`ceiling: ${zoneLabel(nearestSupply)}`);
    if (nearestDemand) contextParts.push(`floor: ${zoneLabel(nearestDemand)}`);

    chain.push({
      step: i + 1,
      day: dayLabel,
      shape: nextShape,
      confidence: stepConfidence,
      context: contextParts.join('; '),
      keyTransitionTime: i === 0 ? 'London Open' : 'NY Open',
      zfpCeiling: Math.min(MAX_ZFP_PERCENT, Math.round((stepZfp + ZFP_CEILING_OFFSET + i * ZFP_CEILING_STEP) * 10) / 10),
      zfpFloor: Math.max(0, Math.round((stepZfp - ZFP_FLOOR_OFFSET + i * ZFP_FLOOR_STEP) * 10) / 10),
      transitionProb: `${Math.round((1 - i * TRANSITION_PROB_DECAY) * PCT_MULTIPLIER)}%`,
      elementalDensity: classifyShapeDensity(nextShape),
    });
    prevShape = nextShape;
  }

  // ── 4. E2-9: Alternative Chains with Decision Zones + ZFP Thresholds ──
  // Each alternative chain has: trigger condition, ZFP threshold range, multi-step chain.
  // Derived from actual zones in the map, not hardcoded.
  const alternativeChains = buildAlternativeChains(zones, instrumentSpot, currentShape, initialDirectionalZfp, chain);

  // ── E2-5: Add death zone info to zfpTransitions for Engine 3 consumption ──
  const zfpTransitions: Array<Record<string, unknown>> = [
    ...alternativeChains,
    ...(momEvaluation.deathZones.length > 0
      ? [{
          scenario: 'Virgin MoM Death Zone',
          type: 'momDeathZone',
          zones: momEvaluation.deathZones,
          action: 'REJECT',
          probability: '100%',
          warning: 'Virgin MoM zones are death zones — no entries permitted',
        }]
      : []),
  ];

  // ── 5. Day-Level Decomposition with zone anchors and rationale ──
  // E2-2: Pass the ZFP chain to buildDayDecomposition so day shapes follow
  // the chain's predictions, not hardcoded energy patterns. Wave A1.4: thread
  // the prior-week storyline so the OPENING day's shape consumes the
  // pre-flight macro context (buildDayDecomposition's day-0 override).
  const dayDecomposition = buildDayDecomposition(currentShape, zones, instrumentSpot, chain, ltfZones, priorWeekStoryline);

  return {
    // E2-6: Storyline bias derived from zone positions, not hardcoded "Bullish"
    storylineBias: computeStorylineBias(currentShape, avgZfp, zones, instrumentSpot),
    currentShape,
    currentContext,
    zfpTransitions,
    chain,
    weeklyVisualization: `Day-by-day: ${dayDecomposition.map((d: DayShapePrediction) => `${d.day.slice(0, 3)}=${d.shape}(${d.direction ?? '?'})`).join(' → ')}`,
    // E2-10: Consolidation phase with Mid-breakout + setup-type mapping
    consolidationPhase: determineConsolidationPhase(currentShape, avgZfp, zones),
    breakoutWatch: determineBreakoutWatch(zones, spots, instrument),
    // E2-1: Trading Speed Rule +1 day shift now APPLIED in buildDayDecomposition
    tradingSpeedAdjustment: 'E2-1 Trading Speed Rule (§6.10): "Assume price moves at 30-50% of the speed you think it will. Today\'s move often ends up being tomorrow\'s move." — +1 day shift APPLIED to all day assignments. Early-week confidence reduced for timing uncertainty.',
    alternativeChains: zfpTransitions,
    dayDecomposition,
    dayByDay: buildDayByDay(chain),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHAPE BRAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class ShapeBrain {
  private currentShapeChain: ShapeChain | null = null;
  private currentRegime: DXYRegime = DXYRegime.CHOP;

  // v2.0: Local state replaces messenger pub/sub
  private zoneMapVersion = 0;
  private shapePredictionVersion = 0;
  private lastShapePrediction: ShapePredictionSnapshot | null = null;
  private injectedZoneMap: ZoneMapSnapshot | null = null;
  // Phase 2 T4: 30m MoM zones (MDVE lane) — E2 reaction points for SS/R shapes.
  // Doctrine (operator, 2026-07-31): "30m is not an origin point for BoM S/D
  // zones - valid for MoM S/D zones to identify E2 reaction points for SS/R shapes."
  private injectedLtfZones: readonly DXYZone[] = [];
  // Wave A1.4: the prior-week pre-flight storyline — the parallel agent
  // (report-v452.ts's buildShapeBrain) attaches it to the injected
  // ZoneMapSnapshot under the documented field name `priorStoryline`.
  private injectedPriorWeekStoryline: PriorWeekStoryline | null = null;

  /**
   * Inject the zone map for the next computation cycle.
   * Replaces the v1.0 messenger.getLatest(ZONE_MAPPED) call.
   *
   * @param zoneMap   The 4H/1H ZoneMapSnapshot (emergent lane) — unchanged input.
   * @param ltfZones  OPTIONAL 30m MoM zones (MDVE lane) — E2 reaction points for
   *                  SS/R shapes (doctrine 2026-07-31). Backward-compatible:
   *                  existing single-argument callers are unaffected.
   */
  setZoneMap(zoneMap: ZoneMapSnapshot | null, ltfZones?: readonly DXYZone[] | null): void {
    this.injectedZoneMap = zoneMap;
    this.injectedLtfZones = ltfZones ?? [];
    // Wave A1.4 — the pre-flight storyline handoff rides the injected zone map
    // (report-v452.ts attaches it under `priorStoryline`). Absent → null → the
    // opening-consolidation signal is off (byte-identical pre-A1.4 behavior).
    this.injectedPriorWeekStoryline = zoneMap
      ? ((zoneMap as ZoneMapSnapshot & { priorStoryline?: PriorWeekStoryline }).priorStoryline ?? null)
      : null;
    this.zoneMapVersion = zoneMap?.version ?? this.zoneMapVersion;
  }

  /**
   * Get the last computed shape prediction snapshot.
   * Replaces the v1.0 messenger.getLatest(SHAPE_PREDICTED) call.
   */
  getShapePrediction(): ShapePredictionSnapshot | null {
    return this.lastShapePrediction;
  }

  /**
   * Compute the shape chain from the injected zone map.
   * This replaces the v1.0 tick() method — it is a direct call, not a loop.
   */
  async compute(): Promise<ShapePredictionSnapshot | null> {
    // 1. Read injected zone map
    const zoneMap = this.injectedZoneMap;
    if (!zoneMap) {
      log.debug('No zone map injected — skipping shape prediction');
      return null;
    }

    const zoneMapVersionAtStart = zoneMap.version;

    // 2. Run shape chain prediction (REAL implementation — not stub)
    //    Phase 2 T4: pass the 30m MoM zones (injectedLtfZones) alongside the
    //    4H/1H snapshot so the SS/R day shapes reference them as reaction points.
    //    Wave A1.4: pass the prior-week pre-flight storyline (the opening-
    //    consolidation signal + the RANGE-day reachability band).
    const shapeChain = buildShapeChain(
      zoneMap.zones,
      zoneMap.spots,
      zoneMap.instrument,
      this.injectedLtfZones,
      this.injectedPriorWeekStoryline,
    );

    // 3. Update internal state
    this.currentShapeChain = shapeChain;
    // Determine regime from shape
    if (shapeChain.currentShape === ShapeCode.BS || shapeChain.currentShape === ShapeCode.PBS) {
      this.currentRegime = shapeChain.storylineBias.includes('Bullish') ? DXYRegime.RISK_ON : DXYRegime.RISK_OFF;
    } else if (shapeChain.currentShape === ShapeCode.SS) {
      this.currentRegime = DXYRegime.CHOP;
    } else {
      this.currentRegime = DXYRegime.TRANSITION;
    }

    // 4. Build immutable snapshot
    this.shapePredictionVersion++;
    const snapshot: ShapePredictionSnapshot = {
      version: this.shapePredictionVersion,
      timestamp: Date.now(),
      shapeChain,
      zoneMapVersion: zoneMapVersionAtStart,
    };
    this.lastShapePrediction = snapshot;

    return snapshot;
  }

  getShapeChain(): ShapeChain | null {
    return this.currentShapeChain;
  }

  getRegime(): DXYRegime {
    return this.currentRegime;
  }

  /**
   * Inject shape chain from external source (Python bundle, manual input).
   */
  injectShapeChain(chain: ShapeChain): void {
    this.currentShapeChain = chain;
    log.info(`Injected shape chain: ${chain.currentShape} (${chain.chain.length} days)`);
  }
}
