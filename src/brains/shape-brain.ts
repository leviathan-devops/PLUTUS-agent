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
// Wave 3 (2026-08-06) — THE DAY-LEVEL TEMPORAL CONSTRAINT. The temporal
// engine (Wave 1) is the run-anchor gate; the shape-brain's day-designation
// consumes it: the dayLimit = min(day's end, the run anchor) — the belt+
// suspenders on the bar gate. isRunAnchorLocked() guards the getRunAnchorMs()
// fail-fast — the legacy unlocked runs never read it.
import { isRunAnchorLocked, getRunAnchorMs } from '../mdve/temporal.js';
// W5 (2026-08-07) — THE PHANTOM-BoM EXEMPTION (the operator's type-2 virgin
// MoM = the FORTRESS). The death rule (E2-5) must consult the SAME
// deterministic all-4 predicate the reasoning chain's findFortressDemand
// uses — phantomBoMExemption (reasoning-chain.ts:428). The import graph is
// acyclic (verified: nothing in reasoning-chain's transitive closure imports
// shape-brain; only prior-week-preflight does, and it is NOT in the chain's
// closure) and side-effect-free at module load (shadow-agent reads the key
// inside functions; failure-store opens the DB lazily).
import type { OperativeZone } from '../mdve/reasoning-chain.js';
// W4 — THE LEXICONS (the semantic intent layer, the operator's "pressure
// mechanics = semantic intent"). The zone-classification lexicon's PHANTOM_BOM
// intent feeds the E2 death-rule exemption (shape-brain.ts:1150) — the SAME
// deterministic all-4 predicate, routed through the lexicon machine; the
// zone-pressure lexicon's lifecycle intent feeds the pressure-aware designation
// + the SL-relevance switch. The lexicons import only types/util — acyclic.
import {
  zoneClassificationLexicon,
  isPhantomBoM,
  zonePressureLexicon,
  pressureScoreOf,
  candleShapeLexicon,
  shapeChainLexicon,
  unifiedMacroShape,
} from '../mdve/lexicons/index.js';
import type { LexiconData } from '../mdve/lexicons/index.js';
import type { ChartModel, ZoneModel } from '../mdve/types.js';
import { PIP_VALUE } from '../types.js';
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

// ═══════════════════════════════════════════════════════════════════════════════
// W5 — THE PHANTOM-BoM EXEMPTION (the type-2 virgin MoM = the FORTRESS)
// (the operator, verbatim — PLUTUS_V4.5.4_LEXICON_SPEC Lexicon 3 + the L2 spec
//  PART 3.3 / PART 11.5-11.7):
//   "a phantom BoM zone... a MoM-disguised BoM... functions as a BoM zone"
//   "clearly breaks (temporarily for only a couple of candles) the actual swing
//    move structure and is clearly a 'fake RWL' type or 'correction' fakeout
//    candle"
//   "there is an UM 1H BoM supply zone... that this correction instantly reacts
//    to before forming the big OB"
//   "the move actually CONTINUES FORWARD VIOLENTLY and completes the full swing
//    from the macro origin element"
//   "the 'virgin MoM zones = death' applies largely to 30m virgin MoM zones and
//    1H type 1 virgin MoMs" + "ALL 4H zones WILL have at least 1 reaction before
//    mitigation" (the virgin-death-scope law — the 4H zones are NEVER death zones)
//   "the OB's size is inherently a function of the move it precedes" (the SMC
//    ratio-based width — NEVER a fixed pip number)
// The exemption consults the SAME deterministic all-4 predicate the reasoning
// chain's findFortressDemand uses (phantomBoMExemption — reasoning-chain.ts:428)
// — zero drift by construction: the E2-side designation cannot kill the fortress
// the chain exempts. The adapter is an honest field mapping (the DXYZone's real
// data + the deterministic zone id contract `${pair}|${tf}|${obTimestamp}|${floor}`
// — types.ts:132); the model view carries ONLY the zones the predicate reads
// (phantomBoMExemption provably touches model.zones only — reasoning-chain.ts:
//  453/469). Absent data → the predicate's conservative fallbacks (the type-1
//  STAYS a death zone — a 3-of-4 is NOT exempted).
// ═══════════════════════════════════════════════════════════════════════════════

/** The zone's timeframe from the deterministic id contract (types.ts:132). */
function zoneTimeframeFromId(id: string): string | undefined {
  // `${pair}|${tf}|${obTimestamp}|${floor}` — segment 1 is the tf. The LMV
  // rung ids (`LMV|pair|center`) carry NO tf segment → undefined → the
  // predicate's isLtf gate fails conservatively (the rungs are never the
  // phantom — they are MoM by construction, bom-mom.ts:118).
  const seg = id.split('|');
  if (seg.length < 4) return undefined;
  const tf = seg[1];
  return tf === '4H' || tf === '1H' || tf === '30m' || tf === '15m' ? tf : undefined;
}

/** The DXYZone → OperativeZone adapter (the E2-side data, honestly mapped). */
function dxyZoneToOperative(z: DXYZone): OperativeZone {
  const isDemand = z.type === ZoneType.MOM_DEMAND || z.type === ZoneType.BOM_DEMAND
    || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND;
  const isBom = z.isBoM || z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.BOM_DEMAND;
  return {
    id: z.id,
    type: isDemand ? 'DEMAND' : 'SUPPLY',
    floor: z.floor,
    ceiling: z.ceiling,
    classification: isBom ? 'BoM' : 'MoM',
    timeframe: zoneTimeframeFromId(z.id),
    zfp: z.zfp,
    confluence: z.confluence ?? 0,
    reactionCount: z.reactionCount,
    formationMs: z.formationMs ?? z.createdAt,
    // The predicate reads ONLY zone.pressure?.mitigationCount (reasoning-chain.ts:441)
    // — the mitigation-count field, present verbatim on the E2-side pressure. The
    // liquidity sub-shape differs (zoneId vs rungId) — never read by the predicate
    // → typed cast of the REAL DXYZone pressure object (no fabricated data).
    pressure: z.pressure as unknown as OperativeZone['pressure'],
    freshness: z.reactionStatus === 'virgin' ? 'FRESH'
      : z.reactionStatus === 'depleted' ? 'DEPLETED' : 'TESTED_1X',
  };
}

/** W4 — the DXYZone → zone-pressure-LEXICON adapter (the E2-side lifecycle
 *  data, honestly mapped — the SAME fields the pressure-state machinery reads).
 *  The designation's pressureScore consumes it (the ZR7-spec:991-992 weight). */
function zoneToLexiconPressure(z: DXYZone): LexiconData {
  const isDemand = z.type === ZoneType.MOM_DEMAND || z.type === ZoneType.BOM_DEMAND
    || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND;
  const isBom = z.isBoM || z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.BOM_DEMAND;
  return {
    zoneType: isDemand ? 'DEMAND' : 'SUPPLY',
    zoneClassification: isBom ? 'BoM' : 'MoM',
    zoneTimeframe: (zoneTimeframeFromId(z.id) as LexiconData['zoneTimeframe']) ?? '1H',
    zoneZfp: z.zfp,
    reactionCount: z.reactionCount,
    mitigationCount: z.pressure?.mitigationCount ?? z.reactionCount,
    reactionEvents: z.pressure?.mitigationCount != null
      ? Array.from({ length: z.pressure.mitigationCount }, () => ({ pierced: z.pressure?.pierced ?? false }))
      : (z.reactionCount > 0 ? Array.from({ length: z.reactionCount }, () => ({ pierced: z.pressure?.pierced ?? false })) : []),
    freshness: z.reactionStatus === 'virgin' ? 'FRESH'
      : z.reactionStatus === 'depleted' ? 'DEPLETED'
      : (z.reactionCount === 0 ? 'FRESH' : z.reactionCount >= 3 ? 'DEPLETED' : 'TESTED_1X'),
    pierced: z.pressure?.pierced ?? false,
    strongHoldCount: z.reactionCount,
    absorption: z.pressure?.absorption,
  };
}

/** The DXYZone → ZoneModel adapter (the predicate's model.zones view). */
function dxyZoneToZoneModel(z: DXYZone): ZoneModel {
  const isDemand = z.type === ZoneType.MOM_DEMAND || z.type === ZoneType.BOM_DEMAND
    || z.type === ZoneType.LSZ_DEMAND || z.type === ZoneType.IP_DEMAND;
  const isBom = z.isBoM || z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.BOM_DEMAND;
  return {
    id: z.id,
    type: isDemand ? 'DEMAND' : 'SUPPLY',
    top: z.ceiling,
    bottom: z.floor,
    timeframe: (zoneTimeframeFromId(z.id) ?? '1H') as ZoneModel['timeframe'],
    classification: isBom ? 'BoM' : 'MoM',
    formationMs: z.formationMs ?? z.createdAt ?? 0,
    freshness: z.reactionStatus === 'virgin' ? 'FRESH'
      : z.reactionStatus === 'depleted' ? 'DEPLETED' : 'TESTED_1X',
    // The predicate reads the opposing zone's type/classification/formationMs/
    // bottom/top (reasoning-chain.ts:453-460) + the macro-origin's timeframe/
    // type/bottom/top (:469-471) — NEVER reactionEvents. The E2-side event
    // shape is the lastTouchMs/dir subset — typed cast (real touch data).
    reactionEvents: z.reactionEvents as unknown as ZoneModel['reactionEvents'],
    zfp: z.zfp,
    confluence: z.confluence ?? 0,
  };
}

/** The E2-side ATR proxy (the SMC ratio anchor — NEVER a fixed pip number):
 *  4 × the narrowest positive zone width / pip — the SAME formula the chain's
 *  proxyAtr1hPips uses (mirror.ts:367), computed from the map's own structures. */
function shapeBrainAtrProxyPips(zones: readonly DXYZone[], pip: number): number {
  // THE C-1 FIX (2026-08-11 — Machine C, second layer): the travel magnitude
  // MUST be the map's TYPICAL zone width — the MEDIAN of the positive widths —
  // never the MINIMUM. The min-width statistic is degenerate: every pool
  // carries 0.1-pip slivers (and zero-width LMV line zones), so proxy = 4 ×
  // 0.1 = 0.4 pips → travelMid 0.4p → the day band sub-pip → the inBand
  // search finds NOTHING → the E2 ids null at the source → the fallbacks slop.
  // The median (3.0-3.7 pips measured at ANALYSIS_POINT 1783317600000) is the
  // robust central tendency — one sliver never collapses the whole band. The
  // SMC ratio doctrine stands: "the OB's size is inherently a function of the
  // move it precedes — NEVER a fixed pip number" — the median of the ACTUAL
  // map is the market condition.
  const widths: number[] = [];
  for (const z of zones) {
    const w = z.ceiling - z.floor;
    if (w > 0 && isFinite(w)) widths.push(w);
  }
  if (widths.length === 0) return 0;
  widths.sort((a, b) => a - b);
  const median = widths.length % 2 === 1
    ? widths[Math.floor(widths.length / 2)]!
    : (widths[widths.length / 2 - 1]! + widths[widths.length / 2]!) / 2;
  return (4 * median) / pip;
}

/** THE DATA-DERIVED TRAVEL (§2.3 STAGE 1 — the W3 wave, 2026-08-10 — the
 *  C-1 fix): the day's travel = the map's actual structure, scaled by the ATR
 *  proxy (shapeBrainAtrProxyPips) — NEVER the fixed SHAPE_TRAVEL ladder. The
 *  SMC ratio doctrine: "the OB's size is inherently a function of the move it
 *  precedes — NEVER a fixed pip number". SHAPE_TRAVEL is retained ONLY as the
 *  last-resort fallback when the map yields no width (proxy = 0). */
function dataDerivedTravel(pool: readonly DXYZone[], pipSize: number): { min: number; mid: number; max: number; nearEdge: number } {
  const atrProxyPips = shapeBrainAtrProxyPips(pool, pipSize);
  if (atrProxyPips <= 0) return { min: 0, mid: 0, max: 0, nearEdge: 0 }; // the fallback signal — the caller uses SHAPE_TRAVEL
  return {
    min: 0.5 * atrProxyPips,
    mid: 1.0 * atrProxyPips,
    max: 1.5 * atrProxyPips,
    nearEdge: 0.25 * atrProxyPips,   // the edge-distance band for the §2.3 STAGE 5 nesting
  };
}

/**
 * THE W5 EXEMPTION LANE — consult the SAME deterministic all-4 predicate the
 * reasoning chain's findFortressDemand uses, NOW ROUTED THROUGH THE
 * ZONE-CLASSIFICATION LEXICON (W4 — the semantic intent layer: the operator's
 * "pressure mechanics = semantic intent"). The type-2 virgin MoM (the
 * phantom-BoM fortress) is EXEMPTED from the virgin-MoM death rule; the type-1
 * (the small OB + the uninterrupted mid-move → the all-4 fails) STAYS a death
 * zone (the conservative default — a 3-of-4 is NOT exempted). The lexicon's
 * PHANTOM_BOM intent IS the exemption decision — the E2 designation never
 * kills the fortress upstream.
 */
function isPhantomBoMFortress(
  zone: DXYZone,
  allZones: readonly DXYZone[],
  pip: number,
): boolean {
  const operative = dxyZoneToOperative(zone);
  const modelZones = allZones.map(dxyZoneToZoneModel);
  const atr = shapeBrainAtrProxyPips(allZones, pip);
  // The mid-swing position — the zone's vertical position within the model's
  // observed range (0 at the range floor, 1 at the ceiling). DATA-DERIVED,
  // never a hardcoded level: the macro-origin continuation (a same-type 4H
  // structure below) guarantees the exempted demand's position is interior
  // (ratio ∈ (0, 1)) — the mid-swing-recovery + the fakeout predicate's
  // position component. The honest absence (a degenerate flat range) → the
  // position is UNKNOWN → the predicate conservatively fails (a DEATH-zone
  // default — the all-4 cannot be confirmed).
  const rangeLow = allZones.length > 0 ? Math.min(...allZones.map((z) => z.floor)) : Infinity;
  const rangeHigh = allZones.length > 0 ? Math.max(...allZones.map((z) => z.ceiling)) : -Infinity;
  const midSwingPosition =
    rangeHigh > rangeLow && isFinite(rangeLow) && isFinite(rangeHigh)
      ? (zone.ceiling - rangeLow) / (rangeHigh - rangeLow)
      : undefined;
  const lexInput: LexiconData = {
    zoneId: zone.id,
    zoneType: operative.type,
    zoneFloor: operative.floor,
    zoneCeiling: operative.ceiling,
    zoneTimeframe: operative.timeframe as LexiconData['zoneTimeframe'],
    zoneClassification: operative.classification,
    zoneFormationMs: operative.formationMs,
    zoneZfp: operative.zfp,
    zoneConfluence: operative.confluence,
    reactionCount: operative.reactionCount,
    freshness: operative.freshness as LexiconData['freshness'],
    midSwingPosition,
    pipValue: pip,
    atrPips: atr,
    // the model's zone list — the pre-formation opposing-BoM reaction + the
    // macro-origin continuation scan (the model.zones equivalent)
    zones: modelZones.map((z) => ({
      type: z.type, classification: z.classification,
      formationMs: z.formationMs, top: z.top, bottom: z.bottom, timeframe: z.timeframe,
    })),
  };
  return isPhantomBoM(lexInput);
}

/** E2-4: Result type for the MoM zone mechanics decision tree. */
interface ZoneMechanicsDecision {
  branch: 1 | 2 | 3 | 4;
  action: 'LADDER_STEP' | 'CONTINUATION_RETEST' | 'TP_TARGET_ONLY' | 'REJECT' | 'EXEMPT';
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
function evaluateMoMZoneMechanics(
  zone: DXYZone,
  allZones: readonly DXYZone[],
  pip: number,
): ZoneMechanicsDecision {
  const isMoM = zone.type === ZoneType.MOM_SUPPLY || zone.type === ZoneType.MOM_DEMAND;

  // E2-5: Virgin MoM = DEATH ZONE → reject UNLESS the W5 phantom-BoM exemption
  // fires (the type-2 virgin MoM = the FORTRESS — the operator: "a phantom BoM
  // zone... a MoM-disguised BoM... functions as a BoM zone"). The exemption is
  // the SAME deterministic all-4 predicate the reasoning chain's
  // findFortressDemand consults (phantomBoMExemption) — the E2-side designation
  // never kills the fortress upstream. The type-1 (the all-4 fails) STAYS a
  // death zone — a 3-of-4 is NOT exempted (the conservative default).
  const isVirgin = zone.reactionCount === 0
    || zone.reactionStatus === 'virgin';
  if (isMoM && isVirgin) {
    if (isPhantomBoMFortress(zone, allZones, pip)) {
      return {
        branch: 4,
        action: 'EXEMPT',
        nextShape: ShapeCode.PBS,
        rationale: 'E2-5/W5: PHANTOM-BoM EXEMPTION — the type-2 virgin MoM = the FORTRESS (the all-4 predicate holds: the large-OB + the mid-swing fakeout + the pre-formation opposing-BoM reaction + the macro-origin continuation). Not a death zone — the E2 designation holds.',
      };
    }
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
function evaluateAllMoMZones(zones: readonly DXYZone[], pip: number): {
  decisions: Array<{ zoneId: string; decision: ZoneMechanicsDecision }>;
  deathZones: string[];
  fortressZones: string[];
} {
  const momZones = zones.filter((z: DXYZone) =>
    z.type === ZoneType.MOM_SUPPLY || z.type === ZoneType.MOM_DEMAND,
  );
  const decisions = momZones.map((z: DXYZone) => ({
    zoneId: z.id,
    decision: evaluateMoMZoneMechanics(z, zones, pip),
  }));
  const deathZones = decisions
    .filter((d) => d.decision.branch === 4 && d.decision.action === 'REJECT')
    .map((d) => d.zoneId);
  // W5 — the exempted fortress (the type-2 virgin MoM) — surfaced so the E2
  // designation + the E3 consumers see it as a VALID reaction point, never a
  // death zone.
  const fortressZones = decisions
    .filter((d) => d.decision.branch === 4 && d.decision.action === 'EXEMPT')
    .map((d) => d.zoneId);
  return { decisions, deathZones, fortressZones };
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
 * §2.4 — THE RECOVERY DIRECTION (the R-day semantics — the C-5 kill). The
 * operator's recovery: "the recovery RISES back toward the pre-breakout level —
 * the supply above is the recovery's TARGET, the demand below is the entry
 * fuel." The direction = the nearer bound with the stronger E1 pressure:
 *   no supply above → UP (nothing overhead); no demand below → DOWN;
 *   else the pressure comparison decides (the stronger-pressure side wins).
 * The MACRO AUTHORITY (the cascade direction — report-v452's applyDivergence,
 * the G3 contract) overrides this when the pair diverges > 0.35 — the GU
 * Monday = LONG via the kept EU cascade.
 */
function recoveryDirection(zones: readonly DXYZone[], spot: number): 'UP' | 'DOWN' {
  const supplyAbove = zones.filter((z: DXYZone) => isSupplyZone(z) && z.floor > spot)
    .sort((a: DXYZone, b: DXYZone) => a.floor - b.floor)[0];
  const demandBelow = zones.filter((z: DXYZone) => isDemandZone(z) && z.ceiling < spot)
    .sort((a: DXYZone, b: DXYZone) => b.ceiling - a.ceiling)[0];
  if (!supplyAbove) return 'UP';
  if (!demandBelow) return 'DOWN';
  return pressureScoreOf(zoneToLexiconPressure(supplyAbove))
    >= pressureScoreOf(zoneToLexiconPressure(demandBelow)) ? 'UP' : 'DOWN';
}

/**
 * Map the day decomposition's direction vocabulary ('UP'|'DOWN'|'RANGE'|'NEUTRAL')
 * to the E1 entry-rung direction. 'UP' (price rises) → LONG days (demand below as
 * the rung); 'DOWN' (price falls) → SHORT days (supply above); 'RANGE' → RANGE
 * (both boundaries carried, strongest bounding zone designated). 'NEUTRAL'
 * resolves via the §2.4 pressure evidence — the E1 pressure decides the side
 * (the ZR-6D "the label must match the side") — NEVER the old NEUTRAL→RANGE
 * collapse (the C-5 kill: the R→NEUTRAL→RANGE→supply-primary flattening).
 */
function toEntryDirection(
  direction: string,
  zones: readonly DXYZone[],
  spot: number,
): 'LONG' | 'SHORT' | 'RANGE' {
  if (direction === 'UP') return 'LONG';
  if (direction === 'DOWN') return 'SHORT';
  if (direction === 'RANGE') return 'RANGE';
  // NEUTRAL — the §2.4 pressure-evidence resolution (never the RANGE collapse):
  // the designation emits the side the E1 pressure supports (the demand below =
  // the LONG entry fuel on a recovery day; the supply above = the SHORT fuel).
  const supplyAbove = zones.filter((z: DXYZone) => isSupplyZone(z) && z.floor > spot)
    .sort((a: DXYZone, b: DXYZone) => a.floor - b.floor)[0];
  const demandBelow = zones.filter((z: DXYZone) => isDemandZone(z) && z.ceiling < spot)
    .sort((a: DXYZone, b: DXYZone) => b.ceiling - a.ceiling)[0];
  if (!supplyAbove && !demandBelow) return 'RANGE';
  if (!demandBelow) return 'SHORT';
  if (!supplyAbove) return 'LONG';
  return pressureScoreOf(zoneToLexiconPressure(supplyAbove))
    >= pressureScoreOf(zoneToLexiconPressure(demandBelow)) ? 'SHORT' : 'LONG';
}

/** Compute the center of a zone (midpoint of floor and ceiling). */
function zoneCenter(z: DXYZone): number {
  return (z.floor + z.ceiling) / 2;
}

/**
 * Wave 3 (2026-08-06) — the UTC Monday 00:00 of the run anchor's week (the
 * locked-run week-start fallback when no storyline is present). The run anchor
 * is "today at London open" (07:00 UTC); its UTC date's weekday index maps to
 * the Monday 00:00 that begins its week. getUTCDay(): 0=Sun..6=Sat → the
 * Monday offset = (getUTCDay() + 6) % 7 (Mon=0, Sun=6).
 */
function mondayUtcOf(anchorMs: number): number {
  const d = new Date(anchorMs);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - mondayOffset * 86400000;
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
  // pipSize from the spot magnitude — mirror.ts convention (DXY > 50 → 0.01, FX → 0.0001).
  const pipSize = priorDayClose > 50 ? 0.01 : 0.0001;
  // THE DATA-DERIVED TRAVEL (§2.3 STAGE 1 — the W3 wave, 2026-08-10): the
  // day's band = the map's actual structure scaled by the ATR proxy — NEVER
  // the fixed SHAPE_TRAVEL ladder (the C-1 fix: the DXY Monday's reach was
  // open + 30p = 101.369 — a fantasy extreme the 101.30 rung ladder "won"
  // by proximity). SHAPE_TRAVEL survives ONLY as the last-resort fallback
  // when the map yields no width (dataDerivedTravel returns zeros).
  const derivedTravel = dataDerivedTravel([...zones, ...(ltfZones ?? [])], pipSize);
  const travel = derivedTravel.max > 0
    ? derivedTravel
    : (SHAPE_TRAVEL[shape] ?? SHAPE_TRAVEL['default']!);
  const travelMid = travel.mid * pipSize;
  const travelMax = travel.max * pipSize;

  // ── 1. DayBand forward projection — the day's predicted London-open spot ──
  // THE C-1 FIX (2026-08-11 — Machine C): the design contract (:1539-1540) —
  // "Monday → dayOpenSpot = f(Friday close + shape travel); Tue-Fri → dayOpenSpot
  // = f(prior day's PREDICTED London-open spot + shape travel)". The 2026-07-31
  // anchoring (open = prior close, zero drift) created THE E2-NULL: every day's
  // band = [close ± travelMax] — identical Mon-Fri → the same/no zones qualify →
  // the EU/GU zone ids null at the source → Machine A's fallback slop + Machine
  // B's starvation. The 07-31 REJECTION of the drift is honored: a FULL directional
  // drift chained day-over-day overshot the actual structure (~2 DXY points by Wed
  // with the fixed SHAPE_TRAVEL ladder). The reconciliation: the forward projection
  // rides the W3 DATA-DERIVED travel (2026-08-10 — the map's actual mid width,
  // NEVER the fixed ladder when the map yields width) — the open advances by the
  // map-realistic travel, the day's RANGE [open ± travelMax] shifts with it, and
  // the per-day designation becomes possible. THE MONDAY EXCLUSION (2026-08-11 —
  // the golden gate's evidence): the Monday open = the Friday close EXACTLY (the
  // 07-31 gap-less anchor — "the ONLY Friday-spot use") — a Monday drift moved the
  // golden DXY SHORT 101.120 → 100.936 (a 20.4p golden MISS). The drift belongs to
  // the Tue-Fri carry ONLY. The directional extreme of the range stays the sweep
  // target the E2 designation aims at (fix 2 below).
  const isMonday = day === 'Mon';
  const dayOpenSpot = isMonday
    ? priorDayClose
    : priorDayClose +
      (direction === 'LONG' ? travelMid : direction === 'SHORT' ? -travelMid : 0);
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
  // ── Wave 3 (2026-08-06) — THE DAY-LEVEL TEMPORAL CONSTRAINT (the operator's
  //    day-by-day law — VERBATIM: "MONDAY - FULL PIPELINE WITH DATA AVAILABLE
  //    UP UNTIL MONDAY / TUESDAY - FULL PIPELINE WITH DATA AVAILABLE UP UNTIL
  //    TUESDAY / WEDNESDAY - ... / ETC"). The day-designation pool (the
  //    supplyCands/demandCands below) must NEVER include a zone formed AFTER
  //    the day being designated — the belt+suspenders on the Wave-1 bar gate
  //    (which already makes post-anchor zones unformable): this ALSO covers the
  //    multi-day runs where a Tuesday-anchored run designates Monday's zones —
  //    a zone formed Wednesday cannot be Monday's or Tuesday's designation.
  //    THE DAY STRING IS 'Mon'..'Fri' (the buildDayDecomposition canonical
  //    format — verified call site shape-brain.ts:1924 `day.slice(0,3)`), NOT
  //    'YYYY-MM-DD' — the day's ms window derives from the WEEK START (the
  //    storyline's priorAnchorMs = the current week's Mon 00:00 — the same
  //    R1-b/ZR-4C source; the locked run anchor's UTC week when no storyline
  //    is present) + the day index. dayLimitMs = min(dayEndMs, runAnchorMs) —
  //    the locked run caps at the anchor (the Monday-locked run: the Monday
  //    dayLimit = the Monday 07:00 anchor, earlier than the day's end); the
  //    legacy unlocked runs → the day's end ONLY (a deliberate change — the
  //    designations become day-honest even without the anchor). No week anchor
  //    (no storyline, no lock) → dayLimitMs null → the constraint is INERT
  //    (byte-identical legacy). ──
  const runAnchorMs = isRunAnchorLocked() ? getRunAnchorMs() : Infinity;
  const weekStartMs = priorWeekStoryline?.priorAnchorMs
    ?? (runAnchorMs !== Infinity ? mondayUtcOf(runAnchorMs) : 0);
  const dayStartMs = weekStartMs > 0 && dayIdxOf >= 0 ? weekStartMs + dayIdxOf * DAY_MS : null;
  const dayLimitMs = dayStartMs != null ? Math.min(dayStartMs + DAY_MS - 1, runAnchorMs) : null;
  // ── Wave 3 — THE DAY-LOCAL PREFERENCE (the operator's recency law — VERBATIM:
  //    "Whatever voting system you are using needs to be scoped to within 3
  //    trading days up to the present moment" — "RECENT CANDLES within the last
  //    2-3 trading days"). The strongest()'s window tie-break: a zone formed
  //    WITHIN the day's 3-day window (formationMs >= dayStartMs − 72h) ranks
  //    ABOVE an older zone at equal zfp — the day's OWN recent structures win
  //    over the week's-newest reuse (the GU Mon/Tue/Thu 1.33878 collapse dies).
  //    The window NEVER excludes (a pre-existing key level outside it stays
  //    eligible — the WHERE) — it only PREFERENCES at equal zfp. The
  //    windowStartMs is a pure integer-ms function of the formationMs —
  //    deterministic (the plan's 1e-9 epsilon is unnecessary for integer ms;
  //    the >= comparison is exact). ──
  const DAY_WINDOW_HOURS = 72;
  const windowStartMs = dayStartMs != null ? dayStartMs - DAY_WINDOW_HOURS * 3600 * 1000 : null;
  const dayWindowRank = (z: DXYZone): number =>
    windowStartMs != null && formationMsOf(z) >= windowStartMs ? 1 : 0;
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
  // THE MAP-DERIVED REACH (§2.3 STAGE 3 — the W3 wave, 2026-08-10 — the C-1
  // completion): the RANGE-day reach = the day's ACTUAL structures (the
  // dayReachHigh/dayReachLow or the nearest quality structure beyond the
  // open), NEVER the travel-band extreme alone. When the travel band (the
  // data-derived or the fallback) yields NO candidate on a side, the reach
  // extends to the FIRST quality structure beyond the open — the operator's
  // Friday supply 1.14460 (24.8p above the EU open) stays reachable even
  // with the tight ATR-proxy band, and the DXY's 101.14 structure (7.1p)
  // stays the near-open primary.
  const supplyReachRaw = isStorylineRange ? dayOpenSpot + travelMax
    : (direction === 'LONG' ? oppositeReach : expectedReach);
  const demandReachRaw = isStorylineRange ? dayOpenSpot - travelMax
    : (direction === 'SHORT' ? oppositeReach : expectedReach);
  // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law — SITE-4):
  // the reach extension targets the STRONGEST structural supply above the
  // open (the E1 MPSE: the pressure DESC — the +40 VIRGIN-BoM / +20 FORTRESS
  // — then the zfp ASC), NEVER the price-nearest. The operator: "NOTHING
  // SHOULD BE PRICE ANCHORED EVER" — the operator's structural zones (the
  // BoM 1.14460) stay reachable even when a closer sliver exists. The floor
  // distance (a.floor - b.floor) is the FINAL tie-break only.
  const nearestSupplyAbove = (z: readonly DXYZone[]): number | null => {
    const q = z.filter((x) => isSupplyZone(x) && x.floor > dayOpenSpot)
      .sort((a, b) =>
        (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||
        ((a.zfp ?? 99) - (b.zfp ?? 99)) ||
        (a.floor - b.floor))[0];
    return q ? q.ceiling : null;
  };
  // THE C-2 FIX (2026-08-11 — Machine C, the EU SHORT class): the reach
  // extension MUST target the FIRST QUALITY structure, never the nearest
  // VIOLATED sliver. The W8B §7 doctrine (:1810-1812 — "the reach extends to
  // the FIRST quality structure beyond the open — the operator's Friday
  // supply 1.14460 (24.8p above the EU open) stays reachable even with the
  // tight ATR-proxy band"). The EU Monday: the nearest supply above the open
  // was the VIOLATED zfp-70 sliver 1.14245 (ceiling 1.14293) — the reach
  // stayed 1.14378 — the operator's golden SELL_SIDE rung [1.1439-1.14415]
  // (zfp 20 — the entry 1.14390 = its near edge) was EXCLUDED → the E2
  // designated the sliver → the golden gate Δ14.2p MISS. The quality filter:
  // zfp ≤ 25 OR a FRESH/TESTED freshness — the operator's structures (the
  // golden rungs zfp 20, the Friday supply zfp 22 TESTED_1X) are admitted;
  // the VIOLATED zfp-70 slivers are not. Fallback to the nearest-ANY (the
  // pre-C-2 behavior) when no quality structure exists beyond the open.
  // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law — SITE-5):
  // the quality reach extension also sorts by the STRUCTURAL strength (the
  // pressure DESC, then the zfp ASC), never the floor distance — the
  // operator's structural zone (the BoM 1.14460) wins over a closer quality
  // rung. The floor distance is the final tie-break only.
  const nearestQualitySupplyAbove = (z: readonly DXYZone[]): number | null => {
    const isQuality = (x: DXYZone): boolean =>
      (x.zfp ?? 99) <= 25
      || x.reactionStatus === 'virgin'
      || x.reactionStatus === 'active';
    const q = z.filter((x) => isSupplyZone(x) && isQuality(x) && x.floor > dayOpenSpot)
      .sort((a, b) =>
        (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||
        ((a.zfp ?? 99) - (b.zfp ?? 99)) ||
        (a.floor - b.floor))[0];
    return q ? q.ceiling : null;
  };
  const nearestDemandBelow = (z: readonly DXYZone[]): number | null => {
    const q = z.filter((x) => isDemandZone(x) && x.ceiling < dayOpenSpot)
      .sort((a, b) => b.ceiling - a.ceiling)[0];
    return q ? q.floor : null;
  };
  // THE C-2 FIX (2026-08-11 — Machine C): the R1-b dayReachHigh clamp
  // CONTRADICTED the W3 map-derived-reach doctrine — `dayReachHigh != null ?
  // Math.min(supplyReachRaw, dayReachHigh)` EXCLUDED the operator's near-open
  // primary (the golden DXY SHORT supply 101.235-101.240, 24p above the open,
  // lost to the 12p travel band → the E2 picked the wrong supply 100.913 →
  // the golden gate 20.4p MISS). THE DOCTRINE (:1810-1812 — "the reach
  // extends to the FIRST quality structure beyond the open — the operator's
  // Friday supply 1.14460 (24.8p above the EU open) stays reachable even
  // with the tight ATR-proxy band, and the DXY's 101.14 structure (7.1p)
  // stays the near-open primary"): the near-open structure is ALWAYS
  // reachable — the travel band defines the SWEEP target, never the ceiling
  // of what the E2 may designate. The reach = max(shape reach, nearest
  // structure), then min with the day's ACTUAL high (the R1-b bound stands —
  // the designation never exceeds the day's reachable structure).
  // THE R1-B CLAMP RECONCILIATION (2026-08-11 — Machine C): the
  // dayReachHigh clamp (the R1-b "the designation never exceeds the day's
  // reachable structure") applies to the SHAPE reach ONLY — the QUALITY
  // extension (the operator's structure — the Friday supply 1.14460, formed
  // in the PRIOR week → absent from dayReachHigh's day-formed window) must
  // STAND. The W8B doctrine: "the operator's Friday supply 1.14460 (24.8p
  // above the EU open) stays reachable even with the tight ATR-proxy band".
  const qualitySupplyReach = nearestQualitySupplyAbove(pool) ?? nearestSupplyAbove(pool) ?? dayOpenSpot;
  const supplyReach = dayReachHigh != null
    ? Math.max(Math.min(supplyReachRaw, dayReachHigh), Math.min(qualitySupplyReach, dayReachHigh))
    : Math.max(supplyReachRaw, qualitySupplyReach);
  const demandReach = dayReachLow != null
    ? Math.max(Math.min(demandReachRaw, nearestDemandBelow(pool) ?? dayOpenSpot), dayReachLow)
    : Math.min(demandReachRaw, nearestDemandBelow(pool) ?? dayOpenSpot);
  // Wave R1-b — the candidate floor/ceiling is the DAY's actual reach band:
  // a SHORT supply is day-reachable when its floor sits at/below the day's
  // actual high AND at/above the day's actual low (the designation's internal
  // near edge then lands within [dayLow, dayHigh] — the level ≤ the day's
  // actual high, ≥ the day's actual open). The old `z.floor >= dayOpenSpot`
  // bound (the projected London open) is replaced by the day's reachable low
  // when the day band is known; the old `z.ceiling <= dayOpenSpot` bound is
  // replaced by the day's reachable high. Unknown band → dayOpenSpot (byte-identical).
  // THE C-2 FIX (2026-08-11 — Machine C): the R1-b day-reach bounds must
  // never REVERSE the entry-rung orientation (:1543-1548 — "SHORT days
  // designate SUPPLY ABOVE the day's predicted spot; LONG days designate
  // DEMAND BELOW it"). The R1-b rewrite replaced the open bound with the
  // day's reachable low/high UNCONDITIONALLY — a SHORT day's supplyFloor =
  // dayReachLow (the day's demand floor, below the open) ADMITTED the
  // below-open supply DXY|1H|...100.913 as the DXY Monday SHORT designation
  // (the golden gate Δ20.4p MISS — the operator's golden supply 101.14 was
  // reachable but the below-open sliver won by proximity). The day-reach
  // bound applies ONLY where it TIGHTENS the open bound on the side's own
  // orientation: the supply floor = max(dayLow, open) — never below the open;
  // the demand ceiling = min(dayHigh, open) — never above the open.
  const supplyFloor = dayReachLow != null
    ? Math.max(dayReachLow, dayOpenSpot)
    : dayOpenSpot;
  const demandCeiling = dayReachHigh != null
    ? Math.min(dayReachHigh, dayOpenSpot)
    : dayOpenSpot;
  // Wave 3 (2026-08-06) — the DAY-LEVEL TEMPORAL CONSTRAINT is added to BOTH
  // candidate pools: a zone formed AFTER the day being designated (formationMs
  // > dayLimitMs — the day's end capped by the run anchor) is EXCLUDED — the
  // belt+suspenders on the Wave-1 bar gate. The operator's day-by-day law: a
  // Tuesday-anchored run designating Monday's zones cannot use a Wednesday
  // formation. dayLimitMs null (no week anchor — the legacy no-storyline,
  // no-lock path) → the clause is inert (byte-identical). LMV rungs carry no
  // formation ms (formationMsOf → 0 ≤ dayLimitMs — never excluded — the WHERE).
  // THE C-2 FIX (2026-08-11 — Machine C, final): the ORIENTATION bound is the
  // zone's TOP above the open for supplies (its interior rungs — the
  // operator's entries — are reachable ABOVE the open: the golden DXY supply
  // [101.027-101.153] STRADDLES the open 101.048, its rung 101.14 = the
  // operator's entry), and the zone's BOTTOM below the open for demands. The
  // old `z.floor >= dayOpenSpot` excluded the straddling golden zone; the
  // R1-b `dayReachLow` admitted the below-open sliver 100.913. The top-above
  // bound admits the straddling zone AND excludes the fully-below sliver.
  // THE C-2 FIX (2026-08-11 — Machine C, FINAL): the SELL_SIDE rung
  // admission is UNCONDITIONAL on the SUPPLY lane (the operator's golden
  // SHORT structures ARE the SELL_SIDE rungs — the DXY entry 101.120 = the
  // rung [101.12-101.154]'s bottom, the EU entry 1.14390 = the rung
  // [1.1439-1.14415]'s bottom — "LQZ at 1.1444-1.14395 ~ using this as the
  // entry zone anchor"). The resting-side pass typed them DEMAND (inside
  // DEMAND containers) → the plain isSupplyZone filter EXCLUDED the
  // operator's entries → the E2 designated the VIOLATED slivers (the Δ14.2p
  // EU MISS + the DXY sliver). The BUY_SIDE lane stays UNCHANGED (the DEMAND
  // admission never extends to the rungs — the earlier attempt admitted
  // both sides and FLIPPED the DXY direction; the LONG structures resolve
  // through the plain demand zones + the fortress). The WIDTH tie-break
  // (the strongest() sort) then promotes the SUBSTANTIAL rung over the 0.5p
  // sliver at equal pressure/zfp — the operator's "I will not do 1 pip on a
  // big zone... it needs to scale w/ the market conditions".
  if (process.env.C2_DEBUG) console.log(`[C2-CANDS] ${day} dir=${direction} open=${dayOpenSpot} reach=${supplyReach.toFixed(5)} dayHigh=${dayReachHigh} qualityReach=${(nearestQualitySupplyAbove(pool) ?? -1).toFixed(5)}`);
  // THE C-2 FINAL FIX (2026-08-11 — Machine C): the SELL_SIDE rung admission
  // fires when NO quality plain SUPPLY zone OVERLAPS the rung's band — the
  // rung is then the operator's ENTRY structure (the entry rung sits BELOW
  // the quality zone: the EU golden rung [1.1439-1.14415] — the operator's
  // 1.14390 entry — under the Friday supply [1.1446-1.14571] which is the SL
  // context, NOT the entry; "LQZ at 1.1444-1.14395 ~ using this as the entry
  // zone anchor"). When a quality zone CONTAINS/overlaps the rung (the DXY
  // golden zone [101.027-101.153] contains the entry rung [101.12-101.154] —
  // the internal-rung resolution gives the operator's 101.120), the zone
  // suffices and the rung stays out (the 2/5 state — the DXY unchanged).
  // The substantial-rung floor also applies (the operator's "I will not do 1
  // pip on a big zone... it needs to scale" — the 0.5p sliver dies).
  const qualitySupplyZones = pool.filter((z: DXYZone) => isSupplyZone(z)
    && (z.zfp ?? 99) <= 25
    && z.ceiling > dayOpenSpot
    && z.floor <= supplyReach
    && inBand(z)
    && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));
  const rungOverlapsQualityZone = (z: DXYZone): boolean =>
    qualitySupplyZones.some((q) => z.ceiling > q.floor && z.floor < q.ceiling);
  const isAdmissibleRung = (z: DXYZone): boolean =>
    z.side === 'SELL_SIDE'
    && (z.ceiling - z.floor) >= pipSize
    && !rungOverlapsQualityZone(z);
  const supplyCands = pool.filter((z: DXYZone) => (isSupplyZone(z) || isAdmissibleRung(z))
    && z.ceiling > dayOpenSpot
    && z.floor <= supplyReach
    && inBand(z)
    && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));
  if (process.env.C2_DEBUG) console.log(`[C2-CANDS] supply cands=${supplyCands.length} first3=${supplyCands.slice(0,3).map(z => z.id + '@' + z.zfp).join(' | ')}`);
  if (process.env.C2_DEBUG) {
    const golden = pool.find((z: DXYZone) => z.id === 'LMV|EUR/USD|1.14370' && Math.abs(z.ceiling - 1.14415) < 1e-9);
    if (golden) {
      const qz = qualitySupplyZones.filter((q) => golden!.ceiling > q.floor && golden!.floor < q.ceiling);
      console.log(`[C2-CANDS] EU golden rung admitted=${supplyCands.some((z) => z.id === golden!.id)} overlapsQ=${qz.length} side=${golden!.side} type=${golden!.type} w=${((golden!.ceiling - golden!.floor) / (dayOpenSpot > 50 ? 0.01 : 0.0001)).toFixed(1)}p`);
    }
  }

  // THE DEMAND LANE (the 2/5 baseline restored): the plain DEMAND zones
  // first; the BUY_SIDE rung admission fires ONLY when no quality demand
  // zone exists (the DXY LONG's golden demand LMV|DXY|100.95000 [100.885-
  // 100.918] rides this path — the resting-side container-wins typed it
  // DEMAND so it IS in the plain lane; the fallback protects the fortress
  // lanes). The 0/5 regression came from removing this gate (the DXY LONG
  // demand pick shifted → Δ11.1p).
  const demandZoneCands = pool.filter((z: DXYZone) => isDemandZone(z)
    && z.floor < dayOpenSpot
    && z.ceiling >= demandReach
    && inBand(z)
    && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));
  const hasQualityDemandZone = demandZoneCands.some((z) => (z.zfp ?? 99) <= 25);
  const demandCands = hasQualityDemandZone
    ? demandZoneCands
    : pool.filter((z: DXYZone) => (isDemandZone(z) || z.side === 'BUY_SIDE')
        && z.floor < dayOpenSpot
        && z.ceiling >= demandReach
        && inBand(z)
        && (dayLimitMs == null || formationMsOf(z) <= dayLimitMs));

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
  const strongest = (cands: DXYZone[], reach: number): DXYZone | undefined => {
    // ── THE ZONE-ANCHORED TOTAL ORDER (the C-3B rewrite — 2026-08-11 — the
    //    operator's law VERBATIM: "NOTHING SHOULD BE PRICE ANCHORED EVER...
    //    E1 CALCULATES THE EXACT ZONES... I SPENT 2 FUCKING WEEKS BUILDING
    //    MPSE ENGINES FOR E1 FOR LITERALLY EXACTLY THIS. USE THEM.") ──
    //    The E1 MPSE structural outputs ARE the zone anchors. The ranking:
    //    1. THE VALIDITY GATES (the FILTERS — the C-2/C-3 class, STAY as
    //      demotions, never the ranking): the non-depleted (pressure > −30),
    //      the zfp ≤ 25 (quality), the side orientation (the SUPPLY floor
    //      ABOVE the open; the DEMAND ceiling within the 0.5p straddle — the
    //      C-3 per-day gate), the width ≥ 1 pip (the slivers die). A
    //      gate-failing candidate ranks AFTER every passing candidate
    //      (Infinity).
    //    2. THE PRESSURE DESC (the +40 VIRGIN-BoM / +20 FORTRESS / −30
    //      DEPLETED — the operator-confirmed W3 sign: "yeah thats an issue
    //      it should be the opposite" — the DEPLETED sorts LAST).
    //    3. THE ZFP ASC (the failure probability — the strength).
    //    4. THE CLASSIFICATION (the BoM over the MoM — the structural walls).
    //    5. THE WIDTH DESC (the operator's scale law — "I will not do 1 pip
    //      on a big zone... it needs to scale w/ the market conditions").
    //    6. THE REACTIONS DESC (the most-battled levels).
    //    7. THE DAYWINDOW + THE RECENCY (the factors, never the law).
    //    8. THE PRICE POSITION — THE FINAL TIE-BREAK ONLY (the ladder-steps:
    //      at EQUAL structural standing the near-open step wins). NEVER the
    //      primary — the price distance from the open is E3's job.
    //    THE PER-DAY VARIATION comes from the E2 shape-driven designation +
    //    the E3 chained entries — NOT the open-distance ranking (the D97
    //    fix — the 8 losses were the price-anchored selection: the EU Tue S
    //    1.14189 vs the operator's structural BoM 1.14460).
    const supplySide = cands.length > 0
      && (isSupplyZone(cands[0]!) || (cands[0] as { side?: string }).side === 'SELL_SIDE');
    const demandSide = cands.length > 0
      && (isDemandZone(cands[0]!) || (cands[0] as { side?: string }).side === 'BUY_SIDE');
    const gateOf = (z: DXYZone): boolean =>
      (pressureScoreOf(zoneToLexiconPressure(z)) <= -30 || (z.zfp ?? 99) > 25
        || (supplySide ? z.floor <= dayOpenSpot
            : demandSide ? z.ceiling > dayOpenSpot + 0.5 * pipSize : false)
        || (z.ceiling - z.floor) < pipSize);
    return [...cands].sort((a: DXYZone, b: DXYZone) =>
      // 1. THE VALIDITY GATES (the filters — the C-2/C-3 class, demoted).
      ((gateOf(a) ? 1 : 0) - (gateOf(b) ? 1 : 0)) ||
      // 2. THE PRESSURE DESC (the E1 MPSE — THE PRIMARY leg).
      (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||
      // 3. THE ZFP ASC.
      ((a.zfp ?? 99) - (b.zfp ?? 99)) ||
      // 4. THE CLASSIFICATION (the BoM over the MoM).
      ((b.isBoM ? 1 : 0) - (a.isBoM ? 1 : 0)) ||
      // 5. THE WIDTH DESC (the operator's scale law).
      ((b.ceiling - b.floor) - (a.ceiling - a.floor)) ||
      // 6. THE REACTIONS DESC (the most-battled).
      ((b.reactionCount ?? 0) - (a.reactionCount ?? 0)) ||
      // 7. THE DAYWINDOW + THE RECENCY (the factors, never the law).
      (dayWindowRank(b) - dayWindowRank(a)) ||
      (recencyRank(a) - recencyRank(b)) ||
      // 8. THE PRICE POSITION — the FINAL tie-break ONLY (the ladder-steps
      //    at equal structural standing; the center-distance from the open).
      (Math.abs(zoneCenter(a) - dayOpenSpot) - Math.abs(zoneCenter(b) - dayOpenSpot)) ||
      // The final id tie-break — TOTAL comparator (deterministic on exact ties).
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  }

  if (process.env.C2_DEBUG) console.log(`[C2-SORT] ${day} dir=${direction} supplyCands=${supplyCands.length} sorted=${[...supplyCands].sort((a: DXYZone, b: DXYZone) => (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) || ((a.zfp ?? 99) - (b.zfp ?? 99))).slice(0,5).map(z => z.id.split('|')[2] + '@z' + z.zfp + '@p' + pressureScoreOf(zoneToLexiconPressure(z)) + '@w' + ((z.ceiling - z.floor) / (dayOpenSpot > 50 ? 0.01 : 0.0001)).toFixed(1) + 'p').join(' | ')}`);
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
  // ── THE §8.1 UNION POOL (the §2.3 STAGE 2 rewrite — the W3 wave,
  //    2026-08-10): zones AND rungs are ONE candidate set. The old
  //    rung-direct bypass (if supplyRungs.length > 0 → pick = strongest
  //    (supplyRungs)) meant the operator's S/D zone [101.027-101.153] was
  //    NEVER evaluated once any LMV rung survived — the C-3 root. Now the
  //    rungs rank INSIDE the one pool (the pressure-DESC evidence order),
  //    and the I2 S/D-preference promotes the containing zone at equal
  //    structural position (the EU Monday's nearest-zone promotion is the
  //    TARGET behavior — the Friday supply 1.14460 win, preserved).
  if (process.env.C2_DEBUG) console.log(`[C2-PICK] ${day} supplyPick=${strongest(supplyCands, supplyReachRef)?.id ?? 'null'} demandPick=${strongest(demandCands, demandReachRef)?.id ?? 'null'}`);
  supplyPick = strongest(supplyCands, supplyReachRef);
  demandPick = strongest(demandCands, demandReachRef);
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
      // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law —
      // SITE-6): the deep demand ranks by the E1 MPSE STRUCTURAL outputs —
      // the pressure DESC (the BoM/fortress — the operator's #6 read: "this
      // LQZ is the LQ shield of the BoM 4H bullish OB"), then the zfp ASC,
      // then the reactions DESC — the PRICE distance (the center-to-primary
      // leg) demoted to the FINAL tie-break. The operator's deep read is
      // STRUCTURAL ("the deepest strong structure"), never "the nearest to
      // the primary's floor".
      deepDemandPick = [...deepPool].sort((a: DXYZone, b: DXYZone) =>
        (pressureScoreOf(zoneToLexiconPressure(b)) - pressureScoreOf(zoneToLexiconPressure(a))) ||
        (a.zfp - b.zfp) ||
        ((b.reactionCount ?? 0) - (a.reactionCount ?? 0)) ||
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

  // THE C-2 FIX (2026-08-11 — Machine C): the pickSide derives from the
  // pick's BATTLE SIDE too — a SELL_SIDE rung (container-typed DEMAND by the
  // resting-side pass) is the operator's SHORT structure (the DXY golden
  // entry rung [101.12-101.154] — the 101.120 SHORT): pickSide SUPPLY → the
  // RANGE-day keyZoneType SUPPLY → the direction SHORT (the operator's DXY
  // Monday read). The container-typed DEMAND would flip the day to LONG
  // (the Δ11.1p regression).
  const pickSide: 'SUPPLY' | 'DEMAND' | undefined =
    pick && (isSupplyZone(pick) || pick.side === 'SELL_SIDE') ? 'SUPPLY'
      : pick && (isDemandZone(pick) || pick.side === 'BUY_SIDE') ? 'DEMAND'
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
    // THE EDGE-DISTANCE BAND (§2.3 STAGE 5 — the W3 wave, 2026-08-10 — the
    // M-2 fix): the strict containment (r.ceiling <= z.ceiling + 1e-9) killed
    // the operator's 101.14 rung [101.12-101.154] promotion into its supply
    // [101.027-101.153] — the 0.1p overhang failed the bit-exact check. The
    // band = dataDerivedTravel(...).nearEdge (the ATR-proxy band — NEVER the
    // fixed 5).
    const edgeBandPips = derivedTravel.nearEdge > 0 ? derivedTravel.nearEdge : 5;
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
          // THE C-2 SIDE-AWARE INTERNAL FILTER (2026-08-11 — Machine C):
          // the internal rungs match by the BATTLE SIDE, never the
          // container-typed type — the operator's golden DXY rung
          // [101.12-101.154] (SELL_SIDE — typed DEMAND by the resting-side
          // pass) was EXCLUDED from the [101.027-101.153] zone's internal
          // search → the qualifying sort found only the 4H [101.226-101.432]
          // (zfp 38 — the quality gate rejected the override) → the E2's
          // supplyPick stayed the 3.8p rung (the Δ4.8p MISS). The side
          // (SELL_SIDE → SUPPLY) is the battle behavior.
          (pickSide === 'SUPPLY'
            ? (isSupplyZone(r) || (r as { side?: string }).side === 'SELL_SIDE')
            : (isDemandZone(r) || (r as { side?: string }).side === 'BUY_SIDE')) &&
          // THE M-2 EDGE-BAND CONTAINMENT (the C-2 completion — 2026-08-11):
          // the strict bit-exact containment (`r.ceiling <= z.ceiling +
          // 1e-9`) killed the operator's golden DXY rung [101.12-101.154]
          // promotion into its supply zone [101.027-101.153] — the rung's
          // ceiling 101.154 EXCEEDS the zone's 101.153 by 0.1p → the I2
          // qualifying search found NO internal rung → the zone-override
          // never fired → the E2's supplyPick stayed the 3.8p rung
          // [101.188-101.226] (the Δ4.8p MISS). The M-2 comment (:2271)
          // DESCRIBES this exact case — "the 0.1p overhang failed the
          // bit-exact check. The band = dataDerivedTravel(...).nearEdge" —
          // but the band was only applied to the ACTIVE-EDGE distance check
          // below, never to the CONTAINMENT. The containment now tolerates
          // the nearEdge overhang: `r.ceiling <= z.ceiling + nearEdge*pip`.
          r.floor >= z.floor - 1e-9
            && r.ceiling <= z.ceiling + (edgeBandPips > 0 ? edgeBandPips * pipSize : 1e-9)),
      }))
      // CONTAINS rungs (the zone is a Fire bearing the Earth) …
      .filter((c) => c.internal.length > 0)
      // … at the same structural position: an internal rung NEAR the zone's
      // ACTIVE edge (the sweep edge the shape sweeps into). The bare-LMV pick
      // sits at/just beyond that edge — the zone whose rungs occupy the
      // structural position the pick pointed at.
      .filter((c) => c.internal.some((r) => {
        const farEdge = pickSide === 'SUPPLY' ? r.ceiling : r.floor;
        return Math.abs(activeEdgeOf(c.z) - farEdge) / pipSize <= edgeBandPips;
      }))
      // Position-aware tie-break (fix point 1): the zone whose INTERNAL LMV
      // rungs sit NEAREST the expectedReach (RANGE-aware — the top-of-range)
      // wins — the position-in-structure signal (then the zone's own strength,
      // then id — total, deterministic). THE C-2 QUALITY-PRIORITY (2026-08-11
      // — Machine C): the QUALITY zones (zfp ≤ 25 — the operator's
      // structures) rank BEFORE the non-quality (the VIOLATED/DEPLETED
      // slivers — the DXY's 4H [101.226-101.432] zfp 38 sorted first by the
      // position, but the operator's golden zone [101.027-101.153] zfp 22 is
      // the override target). The zfp leg moves BEFORE the position leg.
      // THE C-3B REWRITE (2026-08-11 — Machine C, the zone-anchor law —
      // SITE-7): the I2 qualifying sort ranks by the E1 MPSE STRUCTURAL
      // outputs FIRST — the pressure DESC (the FORTRESS +20 / the VIRGIN-BoM
      // +40 over the bare), then the zfp ASC (the C-2 quality-priority
      // preserved — the operator's golden zone [101.027-101.153] zfp 22 over
      // the 4H [101.226-101.432] zfp 38) — the INTERNAL-RUNG REACH-DISTANCE
      // (the price position) demoted to the FINAL tie-break.
      .sort((a, b) => {
        return (pressureScoreOf(zoneToLexiconPressure(b.z)) - pressureScoreOf(zoneToLexiconPressure(a.z))) ||
          (a.z.zfp - b.z.zfp) ||
          (Math.min(...a.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)))
           - Math.min(...b.internal.map((r) => Math.abs(zoneCenter(r) - i2SortReach)))) ||
          (a.z.id < b.z.id ? -1 : a.z.id > b.z.id ? 1 : 0);
      })[0];
    // THE C-2 FIX (2026-08-11 — Machine C): the I2 S/D-zone override fires
    // ONLY when the qualifying zone is a QUALITY structure (zfp ≤ 25 — the
    // operator's structures). The EU Monday: the golden SELL_SIDE rung
    // [1.1439-1.14415] (zfp 20 — the operator's 1.14390 SHORT entry) would
    // be overridden by the VIOLATED zone [1.14245-1.14293] (zfp 70 — the
    // Δ14.2p MISS) whose internal 1.1425x rungs (container-typed SUPPLY)
    // qualified. The I2 was built to promote the operator's ZONE over a BARE
    // rung (the EU 1.14544 golden) — the promotion to a VIOLATED sliver is
    // the anti-fit ("the market will eat all fixed const hardcoded garbage
    // alive" — a zfp-70 zone is garbage). The DXY golden zone
    // [101.027-101.153] (zfp 22) still qualifies (the 2/5 state preserved).
    if (process.env.C2_DEBUG) console.log(`[C2-I2] ${day} pick=${pick?.id} pickSide=${pickSide} qualifying=${qualifying ? qualifying.z.id + '@z' + qualifying.z.zfp + ' internal=' + qualifying.internal.length : 'NONE'}`);
    if (qualifying && (qualifying.z.zfp ?? 99) <= 25) {
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
    // THE C-2 FIX (2026-08-11 — Machine C): the LMV designation carries the
    // BAND — the telescoped tiers share the `LMV|pair|center` id (the EU
    // Monday's 1.14370 center has THREE rungs); the band-qualified id pins
    // the EXACT tier the strongest() picked — the chain's resolver + the
    // mirror's exact-string consumers strip the suffix (stripBandSuffix —
    // backward compatible). The keyZoneId stays UNQUALIFIED.
    supplyZoneId: supplyPick?.id ? (supplyPick.id.startsWith('LMV|')
      ? `${supplyPick.id}|${supplyPick.floor.toFixed(5)}|${supplyPick.ceiling.toFixed(5)}`
      : supplyPick.id) : undefined,
    demandZoneId: demandPick?.id ? (demandPick.id.startsWith('LMV|')
      ? `${demandPick.id}|${demandPick.floor.toFixed(5)}|${demandPick.ceiling.toFixed(5)}`
      : demandPick.id) : undefined,
    // ZR-6D: the PRIMARY side (the RANGE-day direction signal — the A1.4
    // top-of-range SUPPLY primary → the SHORT direction consumes the
    // keyZoneId) + the SECOND demand (the deep demand beneath the primary).
    // THE C-2 FIX (2026-08-11 — Machine C): the keyZoneType derives from the
    // pick's BATTLE SIDE, not its container-typed type. The resting-side pass
    // types a SELL_SIDE rung inside a DEMAND container as DEMAND — the
    // golden DXY entry rung [101.12-101.154] (the operator's 101.120 SHORT)
    // would keyZoneType DEMAND → the E2 direction FLIPS to LONG (the Δ11.1p
    // regression). The operator's structure IS the SELL_SIDE rung — the
    // sellers defend the highs — the keyZoneType = SUPPLY → SHORT. The side
    // (carried from the LMV matrix) wins over the container type.
    keyZoneType: pick ? (isSupplyZone(pick) || pick.side === 'SELL_SIDE' ? 'SUPPLY'
      : isDemandZone(pick) || pick.side === 'BUY_SIDE' ? 'DEMAND'
      : (isSupplyZone(pick) ? 'SUPPLY' : 'DEMAND')) : undefined,
    deepDemandZoneId: deepDemandPick?.id,
    floor,
    ceiling,
    dayOpenSpot,
    // The day's session — the existing SHAPE_SESSION_MAP (single source of truth).
    session: getSessionForShape(shape),
    // THE EVIDENCE-DERIVED CONFIDENCE (§2.7.6 — the W3 wave, 2026-08-10 —
    // the M-8 fix): derived from the data the pick consumed (the zfp + the
    // pressure) — NEVER the fabricated 0.5 default. A designation with NO
    // evidence -> the honest low-confidence floor 0.05 + the loud log.
    confidence: pick
      ? Math.min(0.95, Math.max(0.05, 0.5 + 0.25 * (1 - (pick.zfp ?? 50) / 100)
        + 0.25 * ((pressureScoreOf(zoneToLexiconPressure(pick)) + 30) / 70)))
      : (() => {
          if (process.env.E2_NO_EVIDENCE_DEBUG) console.log('[E2] DESIGNATION_NO_EVIDENCE — day=' + day + ' shape=' + shape + ' (the honest 0.05 floor, never a fabricated 0.5)');
          return 0.05;
        })(),
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
        // THE C-5 KILL (§2.4 — the operator's recovery semantics): the R
        // (recovery) day is NOT directionless — the recovery RISES back
        // toward the pre-breakout level (the supply above = the recovery's
        // TARGET, the demand below = the entry fuel). The direction derives
        // from the E1 pressure evidence via recoveryDirection() — NEVER the
        // blanket NEUTRAL→RANGE→supply-primary flattening (the GU Monday was
        // SHORT at the 1.33623 supply; the operator's GU Monday is LONG at
        // the demand below). The MACRO AUTHORITY (the cascade — report-v452's
        // applyDivergence, the G3 contract) overrides at > 0.35 divergence.
        direction = recoveryDirection(zones, spot);
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
        // §2.4 — the ONLY remaining default — documented, never silent. A
        // shape outside the explicit cases (impossible per the 12-member
        // ShapeCode) → NEUTRAL → the §2.4 pressure-evidence resolution in
        // toEntryDirection (never the RANGE collapse).
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
    const e1Direction = toEntryDirection(direction, zones, spot);
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
  // THE C-3 FIX (2026-08-11 — Machine C): the INJECTED SHAPE SEQUENCE — the
  // operator's shared-waveform law ("why is the E2 shape chain for GU not
  // literally the exact same as EU with the only difference between the 2
  // being the E3 setups?"). The GU's own shape prediction degenerated to
  // SS×4+WL (its zone map collapses the transition chain) → the same
  // designation every day → the identical-trade slop. When the EU's chain
  // is injected (the EUR/USD + the GBP/USD share the SAME macro waveform),
  // the chain's SHAPES follow the EU's sequence (the SS/BS/R/BS/WL — the
  // shared waveform) while the ZONE DESIGNATIONS still resolve on THIS
  // pair's own zones (the E3's raw material — the only difference between
  // the EU and the GU). Absent → the pair's own prediction (unchanged).
  injectedChain?: Array<{ shape: ShapeCode }> | null,
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

  // ── W4 — THE CANDLE-SHAPE LEXICON consumes the E2 day classification (the
  //    operator's "shape chains = semantically intelligent algorithmic
  //    systems"). The lexicon classifies the day from the ZONE-DERIVED anatomy
  //    (the bounding zfp gates the ss/bs families — the same data classifyShape
  //    reads); its intent feeds the day-shape classification's AUDIT + the
  //    Phase-A unified-macro divergence guard (a day the lexicon says BS while
  //    the E2 said PBS → the hard violation). The E2's own shape is NOT
  //    overridden — the golden lane stays byte-identical; the lexicon's read is
  //    the semantic confirmation + the demand. ──
  const candleShapeAnatomy: LexiconData = {
    boundingZoneZfp: nearestSupply?.zfp ?? nearestDemand?.zfp ?? ZFP_DEFAULT,
    currentShape: currentShape as string,
    zoneZfp: avgZfp,
    // the zone-density proxy for the candle-count gates (the honest absence:
    // no candle data at the E2 boundary → the candle-count predicates stay
    // off — the ss/bs zfp families carry the read).
    candleCount: zones.length,
  };
  const candleShapeResult = candleShapeLexicon.classify(candleShapeAnatomy);
  // Phase A — the BS-vs-PBS divergence throw (fires only when the lexicon
  // classifies BS AND the E2's own read is the piercing PBS — the unified
  // macro check; the golden lane never hits it).
  candleShapeLexicon.enforce(candleShapeResult, 'A');
  // Phase B — the shape demand appended to the day's context (the audit trail).
  candleShapeLexicon.enforce(candleShapeResult, 'B');
  const candleShapeNote = candleShapeResult.demand
    ? ` | ${candleShapeResult.demand}`
    : '';

  // ── E2-5: Virgin MoM Death Zone Detection ──
  // Virgin MoM zones are DEATH ZONES — automatic REJECT, no exceptions.
  // Flag them in the output so Engine 3 knows to avoid them.
  // W5: the phantom-BoM exemption lane — the type-2 virgin MoM (the FORTRESS)
  // is EXEMPTED (the operator's all-4 predicate, consulted via the SAME
  // deterministic predicate the reasoning chain's findFortressDemand uses).
  const shapeBrainPip = PIP_VALUE[instrument ?? 'DXY'] ?? 0.0001;
  const momEvaluation = evaluateAllMoMZones(zones, shapeBrainPip);
  const deathZoneWarning = momEvaluation.deathZones.length > 0
    ? ` | MOM_DEATH_ZONE: virgin MoM zones [${momEvaluation.deathZones.join(', ')}] — REJECT (no entries)`
    : '';
  const fortressZoneNote = momEvaluation.fortressZones.length > 0
    ? ` | PHANTOM_BOM_FORTRESS: type-2 virgin MoM zones [${momEvaluation.fortressZones.join(', ')}] — EXEMPTED (the all-4 predicate — the operator's fortress)`
    : '';

  const currentContext = zones.length > 0 && instrumentSpot
    ? `${instrumentLabel}: shape=${currentShape}, ZFP avg=${avgZfp.toFixed(0)}%, directional ZFP=${initialDirectionalZfp.toFixed(0)}%, ${zones.length} zones active${deathZoneWarning}${fortressZoneNote}${candleShapeNote}`
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
    // THE C-3 SHAPE INJECTION: the injected (EU) sequence's i-th shape
    // OVERRIDES the pair's own transition — the shared waveform. The
    // confidence/zfp/context still derive from the pair's own zones.
    const nextShape = injectedChain && injectedChain[i]
      ? injectedChain[i]!.shape
      : predictNextShapePressureAware(prevShape, stepZfp, contestedZone, i);
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
    // W5 — the phantom-BoM fortress: the type-2 virgin MoM is a VALID reaction
    // point (the operator's fortress — "a phantom BoM zone... functions as a
    // BoM zone"). Exempted from the death rule — surfaced to E3 as EXEMPT.
    ...(momEvaluation.fortressZones.length > 0
      ? [{
          scenario: 'Phantom-BoM Fortress (type-2 virgin MoM)',
          type: 'phantomBomFortress',
          zones: momEvaluation.fortressZones,
          action: 'EXEMPT',
          probability: '100%',
          warning: 'Phantom-BoM exemption — the all-4 predicate holds: the zone FUNCTIONS as a BoM (the operator\'s fortress). Not a death zone — valid reaction point.',
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
  // THE C-3 FIX (2026-08-11 — Machine C): the injected shape sequence (the
  // EU's shared waveform for the GU) — see buildShapeChain's injectedChain.
  private injectedShapeSequence: Array<{ shape: ShapeCode }> | null = null;

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
      this.injectedShapeSequence,
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

  /** THE C-3 FIX — inject the SHAPE SEQUENCE (the EU's shared waveform) —
   *  the chain's shapes follow the injected sequence; the zone designations
   *  resolve on the pair's OWN zones (the E3 setups differ per pair). */
  injectShapeSequence(seq: Array<{ shape: ShapeCode }> | null): void {
    this.injectedShapeSequence = seq;
  }
}
