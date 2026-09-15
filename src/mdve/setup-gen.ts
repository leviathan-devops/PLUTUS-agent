/**
 * MDVE Source Setup Generator — the DXY trade-set emitter (v4.4.0c).
 * (PLUTUS_V4.4_MDVE_SPEC §8 — the source lane feeding the §9 mirror cascade)
 *
 * ═══════════════════════════════════════════════════════════════
 * Doctrine (§8.1, the RESOLVED passive-level ruling): a trade setup is
 * produced ONLY from a STRUCTURAL anchor — an ORDER_BLOCK-derived zone
 * (§6.1; a ZoneModel is OB-derived by construction) or an LQZ matrix rung
 * (§6.2) — and ONLY when price BATTLED at that anchor (a touch with
 * rejection anatomy: SWEEP / WICK_REJECT / BODY_DEFEND / CONSOL_DWELL;
 * PASS_THROUGH is noise, and a PIERCED event is the zone LOSING — no
 * entry against a closed-through level).
 *
 * Geometry doctrine is NOT re-implemented here: SL and TP are placed by
 * the mirror engine's own helpers (computeMirrorSL / computeMirrorTP /
 * proxyAtr1hPips, imported from mirror.ts) over the model's §7 ladder
 * (enriched with the §6.2 matrix rungs — the §6.2→§7 bridge in
 * index.ts). Source and mirror share ONE SL/TP code path:
 *   SL: inside the NEXT rung beyond the anchor (Law 7 pair buffer,
 *       Law-10 0.5×ATR floor, D17 36-pip ceiling with the rung walk).
 *   TP: the opposing rung of significance via the Law-14 walk
 *       (UM BoM > liquidityScore ≥ 5 > BoM > MoM ≤1x; mitigated rungs
 *       passed through; the first effectively-unmitigated fresh rung
 *       caps; viable-RRR precondition ≥ 1.2×SL).
 *
 * Trade identity (§8.3/§8.4, the corrected dedup):
 *   same structure + same day + same session = ONE trade;
 *   different day OR different session = DISTINCT trades
 *   (the range top reacting Jul 7 AND Jul 8 = 2 trades).
 * Plus the cross-structure merge: two same-direction structures whose
 * entries lie within the Law-7 buffer of each other, battled in the same
 * (day, session) window, are ONE trade — the higher-significance
 * structure represents it (OB > LQZ, BoM > MoM, higher timeframe, zfp,
 * id — total order, deterministic). This is what stops the overlapping
 * OB-slice cluster (ten demand slices over 25 pips) from re-inflating
 * into the DXY=39 slop the §8.1 ruling killed.
 *
 * Viability: a candidate whose geometry cannot pay its category floor
 * (canon rrrForCategory — the SAME bar the mirror applies on target-pair
 * geometry) is not a valid trade — skipped with a logged reason, never
 * emitted. "Cap nothing": every valid structural setup is emitted.
 *
 * Zero pixels, zero LLM (§12 Law 1). Deterministic (§12 Law 2): same
 * model → byte-identical setups. Every comparator is total.
 * ═══════════════════════════════════════════════════════════════
 */

import type { TradeSetup } from '../types.js';
import {
  ConfidenceTier,
  SessionWindow,
  SetupCategory,
  ShapeCode,
  TradeDirection,
  ZoneType,
} from '../types.js';
import { PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT, rrrForCategory } from '../constants/trading-constants.js';
import type {
  ChartModel,
  ReactionEvent,
  SessionLabel,
  ZoneModel,
} from './types.js';
import {
  computeMirrorSL,
  computeMirrorTP,
  computeLmvTP,
  LAW7_SL_BUFFER_PIPS,
  proxyAtr1hPips,
} from './mirror.js';
import { sessionOf, priceDecimals } from './util.js';
import type { LqzZoneMatrix } from './lmv.js';
import type { ShapeDayZone } from './shape-cascade.js';
import { computeSL_LMV, entryPrice_LMV, GOLDEN_SL_MAX_PIPS } from './sl-lmv.js';
import { refineSetup } from './refinement-machine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** The structural anchor a setup can originate from (§8.1 ruling 1). */
interface StructureRef {
  /** 'ORDER_BLOCK' = a §6.1 ZoneModel; 'LQZ' = a §6.2 matrix entry. */
  readonly kind: 'ORDER_BLOCK' | 'LQZ';
  /** Zone id, or the deterministic LQZ rung id (`${pair}|LQZ_M|${center}`). */
  readonly id: string;
  /** SUPPLY/BUY_SIDE → SHORT; DEMAND/SELL_SIDE → LONG (§8.1 + ICT side doctrine). */
  readonly direction: 'LONG' | 'SHORT';
  readonly top: number;
  readonly bottom: number;
  readonly timeframe: '4H' | '1H' | '30m' | '15m';
  readonly classification: 'BoM' | 'MoM';
  readonly zfp: number;
  /** The structure's battle events (zone reactionEvents / matrix touchEvents). */
  readonly events: ReactionEvent[];
}

/** A skipped candidate — honest emission accounting (§12 Law 3). */
export interface SourceSetupReject {
  readonly structureId: string;
  readonly day: string;
  readonly session: SessionLabel;
  readonly reason: 'SL_INVALID' | 'TP_NULL' | 'RRR_BELOW_FLOOR';
  readonly detail: string;
}

export interface SourceSetupOptions {
  /**
   * Battle window [fromMs, toMs]: only battles INSIDE produce setups.
   * Default: [model.anchor.weekStartMs, model.anchor.anchorMs] — the
   * trade week. Prior-week battles are the model's CONTEXT (the Jul 3
   * sweep shapes the week; its setups belong to the prior week's set).
   */
  readonly fromMs?: number;
  readonly toMs?: number;
  /**
   * Count PIERCED events as battles? Default FALSE — a pierce is a close
   * through the zone's far edge: the level LOST the battle; entering
   * against it is entry-against-breakdown (§8.1 anatomy doctrine:
   * rejection, not violation).
   */
  readonly includePierced?: boolean;
  /**
   * Category inference (shape context, §8.1 ruling 3's consumption).
   * Default: 4H timeframe OR BoM classification → HTF_SWING (the
   * higher-timeframe beginning-of-move structures carry the swing
   * trades); everything else → SWING_SCALP (the SS doctrine: range trade
   * from zone edge to opposing zone edge — ShapeCode.SS's ONLY
   * acceptable meaning, AP22). Default category when no signal differs:
   * HTF Swing (the task doctrine).
   */
  readonly categoryFor?: (structure: {
    kind: 'ORDER_BLOCK' | 'LQZ';
    timeframe: '4H' | '1H' | '30m' | '15m';
    classification: 'BoM' | 'MoM';
  }) => SetupCategory;
  /** Sink for skipped candidates (debugging/verification evidence). */
  readonly onReject?: (reject: SourceSetupReject) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETERMINISTIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** UTC day key of a candle timestamp — the §8.4 dedup-key component. */
function dayKeyOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Weekday name (UTC) for the TradeSetup.day display field. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Session sort rank — total order over SessionLabel. */
const SESSION_RANK: Record<SessionLabel, number> = { TOKYO: 0, LONDON: 1, NY: 2, OFF: 3 };

/**
 * Display mapping SessionLabel → SessionWindow (the TradeSetup field is
 * the ET-window enum, which has no Tokyo member). Nearest ET window by
 * UTC overlap: TOKYO(00-07 UTC) → London Open; LONDON(07-13) → London
 * Mid; NY(13-21) → NY Mid; OFF(21-24) → NY Close. DISPLAY-ONLY — the
 * canonical session is the SessionLabel (carried in shapeTrigger/notes);
 * nothing in the cascade reads this field.
 */
const SESSION_DISPLAY: Record<SessionLabel, SessionWindow> = {
  TOKYO: SessionWindow.LONDON_OPEN,
  LONDON: SessionWindow.LONDON_MID,
  NY: SessionWindow.NY_MID,
  OFF: SessionWindow.NY_CLOSE,
};

/** Significance order for the cross-structure merge — TOTAL comparator. */
function significanceOf(s: StructureRef): number {
  const tfRank = s.timeframe === '4H' ? 3 : s.timeframe === '1H' ? 2 : 1;
  return (s.kind === 'ORDER_BLOCK' ? 1000 : 0)
    + (s.classification === 'BoM' ? 100 : 0)
    + tfRank * 10
    + s.zfp / 100;
}

/** The default category inference (see SourceSetupOptions.categoryFor). */
function defaultCategoryFor(structure: {
  timeframe: '4H' | '1H' | '30m' | '15m';
  classification: 'BoM' | 'MoM';
}): SetupCategory {
  return structure.timeframe === '4H' || structure.classification === 'BoM'
    ? SetupCategory.HTF_SWING
    : SetupCategory.SWING_SCALP;
}

/** Deterministic confidence from structure quality (never wall-clock). */
function confidenceOf(s: StructureRef): number {
  const c = 75
    + (s.classification === 'BoM' ? 10 : 0)
    + (s.timeframe === '4H' ? 5 : 0)
    + Math.min(10, Math.floor(s.zfp / 10));
  return Math.min(95, c);
}

function tierOf(confidence: number): ConfidenceTier {
  if (confidence >= 90) return ConfidenceTier.S;
  if (confidence >= 80) return ConfidenceTier.A;
  if (confidence >= 70) return ConfidenceTier.B;
  if (confidence >= 60) return ConfidenceTier.C;
  if (confidence >= 50) return ConfidenceTier.D;
  return ConfidenceTier.F;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateSourceSetups — emit the pair's structural trade setups from its
 * ChartModel. On the DXY model this is the mirror cascade's SOURCE set
 * (§9.6 Stage 3 input); the function is pair-agnostic (the same doctrine
 * generates the emergent lane on EU/GU, §9.4).
 *
 * The v4.4 geometry path — PRESERVED byte-identical (zero broken
 * windows): entry = the anchor's canon front edge, SL = computeMirrorSL
 * (the next-rung walk), TP = computeMirrorTP (the Law-14 walk).
 *
 * @param model  The ChartModel (zones + matrix + ENRICHED ladder + narrative).
 * @param opts   Battle window + pierce policy + category inference + reject sink.
 * @returns TradeSetup[] sorted by (battleMs, direction, entry, setupId) —
 *          deterministic, byte-identical for the same model.
 */
export function generateSourceSetups(
  model: ChartModel,
  opts?: SourceSetupOptions,
): TradeSetup[] {
  return generateSourceSetupsImpl(model, opts, 'v44');
}

/**
 * generateSourceSetupsV45 — the v4.5 LMV-refined source lane
 * (PLUTUS_V4.5_SPEC §3 Fix 1 SL-WIDTH + §4 Fix 2 ENTRY-PRECISION).
 *
 * IDENTICAL candidate universe, battle grouping, freshness gates, RRR
 * viability, cross-structure merge, and TP walk as the v4.4 path — the
 * refinement is GEOMETRY-ONLY, exactly per the spec:
 *   ENTRY (§4.2): entryPrice_LMV — the zone's defendedEdge (the level
 *     price ACTUALLY reverses from, the modal body-close of the zone's
 *     defending candles), not the zone's geometric edge.
 *   SL (§3.2): computeSL_LMV — just beyond the DEFENDED EXTREME
 *     (reactionExtreme) of the nearest LMV rung beyond the entry,
 *     accepted inside [Law-10 floor, GOLDEN_SL_MAX 9.5p]. THE SELECTIVE
 *     GUARD IS PRESERVED BY CONSTRUCTION: the entry zone's OWN
 *     reactionExtreme (the deepest actual probe) is the first candidate
 *     — when the entry was early (the util>0.70 case) the SL lands just
 *     beyond the real probe (the CORRECT structural SL), never blindly
 *     tightened past it; the SWEEP_ORIGIN exception keeps the
 *     structurally-required wide SL at sweep catches. The consumed
 *     `method`/`distPips` are recorded in the setup's notes (audit).
 *   LMV MISS: a structure with no overlapping LMV zone degrades
 *     honestly to the v4.4 geometry (never fabricated levels, §12 Law 3).
 *
 * The refinement is ADDITIVE — the v4.4 export is untouched and the
 * v4.4 cascade contract (verify-cascade 13/13) is preserved.
 */
export function generateSourceSetupsV45(
  model: ChartModel,
  opts?: SourceSetupOptions,
): TradeSetup[] {
  return generateSourceSetupsImpl(model, opts, 'v45');
}

/**
 * lmvZoneForStructure — resolve the structure's LMV zone-matrix (the
 * E/SL anchor source). SIDE: the trade's defending side (LONG →
 * BUY_SIDE demand, SHORT → SELL_SIDE supply — the LMV side semantics,
 * lmv.ts LqzZoneMatrix.side). MATCH: band overlap with the structure.
 *
 * RANK — kind-dependent (the measured doctrine):
 *   ORDER_BLOCK: the match must anchor to the BATTLE'S OWN probe — the
 *     wick tip the trade's battle group actually printed (the level
 *     price turned at). Candidates are restricted to zones whose
 *     defendedEdge sits ON THE DEFENDED SIDE of the probe (LONG: at or
 *     above the wick tip; SHORT: at or below it) — a defendedEdge BEYOND
 *     the wick tip never fills during the battle week (measured: the
 *     100.793 shelf under Monday's 100.847 wick — the entry starved 4
 *     days, then filled into Friday's crash → a v4.4 win CONVERTED to a
 *     loss), then ranked by |defendedEdge − probe| (the zone whose
 *     turn-level IS the battle's turn level), then candles, zfp. Without
 *     battle events, the OB's own wick (its bottom/top) is the probe
 *     reference. The probe-side predicate is the entry-precision
 *     doctrine (§4.2: the entry is AT the level price actually reverses
 *     from — never deeper than the observed reversal).
 *   LQZ: the matrix rung's own level IS its band — the strongest
 *     overlapping zone (most reaction candles = the most-proven turn
 *     level, then lowest zfp, then nearest the rung's defense edge) —
 *     the mirror.ts defendedEdgeEntry overlap semantics (verified).
 */
function lmvZoneForStructure(
  s: StructureRef,
  model: ChartModel,
  battleProbe?: number,
): LqzZoneMatrix | null {
  const wantSide = s.direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE';
  const defenseEdge = s.direction === 'LONG' ? s.bottom : s.top;
  const overlapping = model.lmv.table
    .filter((z) => z.side === wantSide && z.bottom <= s.top && z.top >= s.bottom);
  if (overlapping.length === 0) return null;
  let pool: LqzZoneMatrix[];
  if (s.kind === 'ORDER_BLOCK') {
    const probe = battleProbe ?? defenseEdge;
    // The probe-side pool: defendedEdge on the defended side of the
    // battle probe (fillable during the battle week — never a sniper
    // entry beyond the observed wick).
    const probeSide = overlapping.filter((z) =>
      s.direction === 'LONG' ? z.defendedEdge >= probe - 1e-9 : z.defendedEdge <= probe + 1e-9);
    pool = probeSide.length > 0 ? probeSide : overlapping;
    pool.sort((a, b) =>
      (Math.abs(a.defendedEdge - probe) - Math.abs(b.defendedEdge - probe)) ||
      (b.candles.length - a.candles.length) ||
      (a.zfp - b.zfp) ||
      (a.center - b.center));
  } else {
    pool = overlapping;
    pool.sort((a, b) =>
      (b.candles.length - a.candles.length) ||
      (a.zfp - b.zfp) ||
      (Math.abs(a.center - defenseEdge) - Math.abs(b.center - defenseEdge)) ||
      (a.center - b.center));
  }
  return pool[0]!;
}

/**
 * centerOfLmvZoneId — the numeric center of a bridged LMV zone id
 * (`LMV|pair|center` — index.ts matrixZonesToZoneModels, toFixed(5)).
 */
function centerOfLmvZoneId(id: string): number {
  const m = /([0-9.]+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

/**
 * qDist — quantize a price distance to 1e-6 (the comparator stability
 * guard). Float centers (101.24 / 101.31) vs a sweep edge like
 * 101.27500000000001 differ by ~1.4e-14 — a RAW comparator lets that
 * epsilon decide the rung pick (the measured case: the earth rung flipped
 * to c=101.310 → TP 101.310 instead of the operator's 101.240). Every
 * distance comparator is quantized — deterministic on identical inputs
 * (§12 Law 2).
 */
function qDist(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * v4.5.5 F1-D — THE RWL BOUNCE-INSET constants (the operator's #5 Wed RWL
 * LONG): the §8.1 internal near-edge LONG entry lands ON the rung's CEILING
 * (the Wed shelf ceiling 100.972), where the RRR misses the floor by a hair
 * (2.97 < 3.0) — and the refinement machine's LONG floor-adjust (band floor
 * + 1 pip) would PULL the bounce entry down INTO the sweep (100.945 — the
 * measured v4.5.5 loss: SL 100.893 hit after the late fill). The operator's
 * RWL LONG sits at the bounce-BACK level 0.2p inside the ceiling (his #5 Wed
 * E 100.970-100.975 ≈ the shelf ceiling 100.972 − 0.2p = 100.970 — the level
 * the retracement actually bounced from, the 08:00Z Wed bar low). A genuine
 * hair is RRR within [floor − 0.1, floor) — never a wide miss (those belong
 * to the refinement machine).
 */
const RWL_BOUNCE_INSET_PIPS = 0.2;
const RWL_HAIR_MISS_RRR_DELTA = 0.1;
// The recovery-shelf LONG best-fill (band floor + 1 pip) — the refinement
// machine's MAX_ENTRY_BAND_ADJUST_PIPS doctrine (refinement-machine.ts:95).
// Replicated, not imported: the machine module is frozen (same pattern as
// sl-lmv.ts replicating LAW7_SL_BUFFER_PIPS).
const RWL_SHELF_LONG_ADJUST_PIPS = 1;

/**
 * internalLmvRungEntry — the §8.1 INTERNAL-RUNG ENTRY (the Phase-5 E1 fix
 * brought to the SOURCE lane; the operator's #1 Mon SS Long at the 100.945
 * LQZ — "Earth = the internal LQZ, Fire = the containing S/D zone"). The
 * entry anchors to the level the candles' wicks ACTUALLY aligned at — the
 * strongest internal LMV rung (the LmvTable's zone-matrices bridged into
 * model.zones — ids `LMV|pair|center`, same side) FULLY INSIDE the entry
 * S/D zone (rung band ⊆ zone band) — its NEAR edge (SHORT → the rung's
 * floor; LONG → the rung's ceiling) — NOT the zone's defendedEdge (the
 * modal body-close: the REINFORCEMENT level, a separate trade).
 *
 * Mirrors shape-brain.ts projectZoneForDay's keyZonePrice selection
 * (shape-brain.ts:1124-1137): the internal-rung pool (LMV ids fully inside
 * the pick) → nearest the sweep edge (the zone's floor for DEMAND /
 * ceiling for SUPPLY) → the near edge. The candle-count tiebreak is the
 * lmvZoneForStructure LQZ doctrine (most reaction candles = the most-proven
 * turn level) — deterministic.
 *
 * v4.5.5 F1-E — THE PRIOR-WEEK RECOVERY SHELF (the operator's #1 Mon SS
 * Long at the 100.945 LQZ): a PRIOR-WEEK ORDER_BLOCK LONG anchor (its
 * formation predates the week — the deep-dip wick zone) is the DEEP
 * LIQUIDITY SWEEP, not the operator's entry: his #1 entered at the MONDAY
 * FLOOR SHELF — the level the day's recovery CONSOLIDATED at (the LQZ
 * 100_949 [100.936,100.972] shelf; the Monday 03:00Z defended transit:
 * probed through the shelf bottom, closed back above the center; three
 * Monday closes inside the band). The shelf search: the DEMAND rungs ABOVE
 * the anchor (band.bottom ≥ the anchor's top) within the day's recovery
 * reach (band.top ≤ the day's high) whose own candle matrix carries a
 * defended bullish transit on the candidate day AND ≥ 2 day-closes inside
 * the band — the CONSOLIDATION, not a through-probe (the [100.885,100.918]
 * band's 01:00Z wick-through carries a transit but a single close — it is
 * the transit, not the floor). The LOWEST such band is the floor shelf; the
 * entry = its LONG best-fill (band floor + 1 pip — the refinement machine's
 * MAX_ENTRY_BAND_ADJUST_PIPS doctrine, the level the shelf defends on the
 * entry side: E 100.946 ≈ his 100.945) — NOT the near edge (the ceiling:
 * the reinforcement level, a separate trade) and NOT the deep wick's near
 * edge (the sniper fill below the shelf). Deterministic on identical inputs.
 *
 * No internal rung (and no recovery shelf) → null (the caller keeps the
 * defendedEdge behavior — byte-identical fallback, §12 Law 3: never
 * fabricated levels).
 */
function internalLmvRungEntry(
  s: StructureRef,
  model: ChartModel,
  opts?: { weekStartMs?: number; battleMs?: number },
): { entry: number; recoveryShelf?: { bottom: number; top: number; transitMs: number } } | null {
  // ── v4.5.5 F1-E — THE PRIOR-WEEK RECOVERY SHELF (see the doc block above) ──
  if (s.direction === 'LONG' && s.kind === 'ORDER_BLOCK' &&
      opts?.battleMs !== undefined && opts?.weekStartMs !== undefined) {
    // The anchor is a PRIOR-WEEK zone: its earliest battle predates the week.
    const priorWeek = s.events.some((e) => e.firstTouchMs < opts.weekStartMs!);
    if (priorWeek) {
      const day = dayKeyOf(opts.battleMs);
      // The day's recovery high (the highest wick any LMV row printed on the
      // candidate day — the reach cap for the shelf search).
      const dayHigh = model.lmv.table.reduce((h, r) =>
        r.candles.reduce((m, c) =>
          dayKeyOf(c.timestamp) === day ? Math.max(m, c.high) : m, h), 0);
      const pip = PIP_VALUE[model.pair] ?? PIP_VALUE_DEFAULT;
      const shelf = model.lmv.table
        .filter((z) =>
          z.side === 'BUY_SIDE' &&                    // DEMAND rungs only
          z.bottom >= s.top - 1e-9 &&                 // sits above the anchor
          z.top <= dayHigh + 1e-9 &&                  // within the day's reach
          // the day's DEFENDED BULLISH TRANSIT in the rung's own matrix
          // (the F1-B predicate — probed through the floor, closed back at
          // or above the center: the shelf HELD)
          z.candles.some((c) => c.high > c.low && dayKeyOf(c.timestamp) === day &&
            ((c.open < z.bottom + 1e-9 && c.close >= z.center - 1e-9 && (c.close - c.open) / (c.high - c.low) >= 0.5) ||
             (c.low < z.bottom + 1e-9 && c.close >= z.center - 1e-9))) &&
          // ≥ 2 day-closes inside the band — the day CONSOLIDATED here (the
          // floor shelf), not merely wicked through
          z.candles.filter((c) => dayKeyOf(c.timestamp) === day &&
            c.close >= z.bottom - 1e-9 && c.close <= z.top + 1e-9).length >= 2)
        .sort((a, b) =>
          (a.bottom - b.bottom) ||                    // the LOWEST band = the floor
          (b.candles.length - a.candles.length) ||    // most-proven turn level
          (a.center - b.center))[0];
      if (shelf) {
        // The LONG best-fill on the shelf (band floor + 1 pip — the machine's
        // own MAX_ENTRY_BAND_ADJUST_PIPS doctrine: E 100.946 ≈ his 100.945).
        // The shelf band + the DEFENDED TRANSIT's candle time ride out — the
        // F1-E geometry block uses the band to exclude the deep-wick sweep
        // from the SL probe and to shape the TP; the transit time becomes the
        // setup's activation (the operator's fill at the reclaim, NOT the
        // deep-wick sweep).
        const transitMs = shelf.candles.find((c) =>
          c.high > c.low && dayKeyOf(c.timestamp) === day &&
          ((c.open < shelf.bottom + 1e-9 && c.close >= shelf.center - 1e-9 && (c.close - c.open) / (c.high - c.low) >= 0.5) ||
           (c.low < shelf.bottom + 1e-9 && c.close >= shelf.center - 1e-9)))?.timestamp ?? opts.battleMs!;
        return {
          entry: shelf.bottom + RWL_SHELF_LONG_ADJUST_PIPS * pip,
          recoveryShelf: { bottom: shelf.bottom, top: shelf.top, transitMs },
        };
      }
    }
  }
  const wantType = s.direction === 'LONG' ? 'DEMAND' : 'SUPPLY';
  const internal = model.zones.filter((z) =>
    z.id.startsWith('LMV|') &&
    z.type === wantType &&
    z.bottom >= s.bottom - 1e-9 &&
    z.top <= s.top + 1e-9);
  if (internal.length === 0) return null;
  const candlesOf = (z: ZoneModel): number => {
    const c = centerOfLmvZoneId(z.id);
    const row = model.lmv.table.find((r) => Math.abs(r.center - c) < 1e-9);
    return row ? row.candles.length : 0;
  };
  const sweepEdge = s.direction === 'LONG' ? s.bottom : s.top;
  const rung = [...internal].sort((a, b) =>
    (candlesOf(b) - candlesOf(a)) ||
    (qDist(Math.abs(centerOfLmvZoneId(a.id) - sweepEdge)) -
      qDist(Math.abs(centerOfLmvZoneId(b.id) - sweepEdge))) ||
    (a.bottom - b.bottom) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0]!;
  return { entry: s.direction === 'LONG' ? rung.top : rung.bottom };
}

/**
 * sourceLaneShapeDayFor — the source lane's E3 TP target for the refinement
 * machine (Tier C ruling #1: "TP = the LQZ WITHIN the opposing S/D zone to
 * the entry zone" — Earth = the internal LQZ; Fire = the opposing S/D zone
 * that contains it). The machine's attempt-2 TP path (computeLmvTP with the
 * E2-projected opposing zone FIRST) needs the projected opposing-zone id;
 * the source lane carries no E2 chain — the projection is derived from the
 * model's OWN structure, deterministically:
 *   Fire  = the strongest opposing-side S/D zone beyond the entry that
 *           CONTAINS an internal LMV rung (the TP is the LQZ within it — a
 *           zone bearing no internal LQZ carries no LQZ-level target, and
 *           the measured case: the narrow [101.05-101.066] BoM shelf would
 *           otherwise starve the projection). Ranked BoM > MoM, lowest zfp,
 *           then nearest; a VIOLATED zone is a dead target (the level
 *           LOST — excluded).
 *   Earth = the internal LMV rung fully inside the Fire (same side),
 *           nearest the Fire's far edge (the sweep edge — shape-brain's
 *           internal-rung pick)
 *   projected id = `${pair}|LMV|<center>` — the mirror's OWN lmvAnchorId
 *           format (mirror.ts:1102) so computeLmvTP's E3 exact-match lands
 *           on the rung's defendedEdge: the operator's Wed RWL LONG TP
 *           101.240 = the [101.239-101.275] rung's defendedEdge 101.240,
 *           inside the 1H BoM supply [101.110-101.275].
 * No opposing zone / no internal rung → undefined (the machine falls back
 * to its significance walk — honest degradation, §12 Law 3).
 */
function sourceLaneShapeDayFor(
  direction: 'LONG' | 'SHORT',
  entry: number,
  model: ChartModel,
  pair: string,
): ShapeDayZone | undefined {
  const wantType = direction === 'LONG' ? 'SUPPLY' : 'DEMAND';
  const fire = model.zones
    .filter((z) =>
      // Wave A1.1 (2026-08-01) — DECISION-1: the IP zones (source==='PILLAR')
      // never become the source lane's TP fire — they are confluence/SL-TP
      // rungs, never structural anchors. Additive (no pre-existing tag).
      (z as { source?: string }).source !== 'PILLAR' &&
      z.type === wantType &&
      z.freshness !== 'VIOLATED' &&
      (direction === 'LONG' ? z.bottom > entry + 1e-9 : z.top < entry - 1e-9))
    .map((z) => ({
      fire: z,
      internal: model.zones.filter((r) =>
        r.id.startsWith('LMV|') && r.type === wantType &&
        r.bottom >= z.bottom - 1e-9 && r.top <= z.top + 1e-9),
    }))
    .filter((c) => c.internal.length > 0)
    .sort((a, b) => {
      // THE DAY-FIRST-REACTION SELECTION (the 2026-08-01 regression fix):
      // the NEAREST supply/demand zone whose NEAR EDGE the day's move hits
      // FIRST — the golden Mon LONG TP 101.115 = the [101.109,101.148]
      // supply (filled Monday); the range-top 101.240 (the Wed BS level)
      // made the Mon LONG carry into Wednesday's crash and DIE. The zone's
      // near-edge distance from the entry ranks before the midpoint (the
      // first opposing zone on the day's path), after the BoM/zfp strength
      // (the doctrine's structural preference is preserved).
      const rankA = a.fire.classification === 'BoM' ? 0 : 1;
      const rankB = b.fire.classification === 'BoM' ? 0 : 1;
      const nearA = direction === 'LONG' ? a.fire.bottom : a.fire.top;
      const nearB = direction === 'LONG' ? b.fire.bottom : b.fire.top;
      return (rankA - rankB) ||
        (a.fire.zfp - b.fire.zfp) ||
        (qDist(Math.abs(nearA - entry)) - qDist(Math.abs(nearB - entry))) ||
        (a.fire.bottom - b.fire.bottom);
    })[0];
  if (!fire) return undefined;
  // The EARTH selection (the 2026-08-01 regression fix): the internal rung
  // nearest the zone's NEAR EDGE — the level the day's move actually hits
  // first (the golden Mon LONG TP 101.115 = the rung near the [101.109,
  // 101.148] supply's near edge; the range-top 101.240 rung made the trade
  // carry and die). The old sweep-edge-flush tiebreak biased to the
  // range-top LQZ — the Wed-level bias — wrong for the day scalp.
  const nearEdge = direction === 'LONG' ? fire.fire.bottom : fire.fire.top;
  const earth = [...fire.internal].sort((a, b) =>
    (qDist(Math.abs(centerOfLmvZoneId(a.id) - nearEdge)) -
      qDist(Math.abs(centerOfLmvZoneId(b.id) - nearEdge))) ||
    (qDist(Math.abs((direction === 'LONG' ? a.bottom : a.top) - nearEdge)) -
      qDist(Math.abs((direction === 'LONG' ? b.bottom : b.top) - nearEdge))) ||
    (a.bottom - b.bottom) ||
    (a.id < b.id ? -1 : 1))[0]!;
  const projectedId =
    `${pair}|LMV|${centerOfLmvZoneId(earth.id).toFixed(priceDecimals(pair))}`;
  const projectedPrice = centerOfLmvZoneId(earth.id);
  // ── THE DAY-PROJECTED PRICE (the 2026-08-01 regression fix): the source
  //    lane's shapeDay must carry the day's projected opposing LEVEL so the
  //    refinement machine's TP cap can enforce it. The operator's golden Mon
  //    LONG TP 101.115 = the Monday supply's internal rung — the day's near
  //    opposing zone. The repair machine must NEVER stretch the TP past this
  //    level to inflate the RRR (the range-top 101.240 made the Mon LONG
  //    carry into Wednesday's crash and DIE). Previously null → the cap was
  //    dead. ──
  return {
    dayIdx: 0, day: '', shape: 'SS', direction,
    keyZoneId: null, keyZonePrice: null,
    supplyZonePrice: direction === 'LONG' ? projectedPrice : null,
    demandZonePrice: direction === 'SHORT' ? projectedPrice : null,
    floor: null, ceiling: null, confidence: 0.5,
    supplyZoneId: direction === 'LONG' ? projectedId : null,
    demandZoneId: direction === 'SHORT' ? projectedId : null,
  };
}

function generateSourceSetupsImpl(
  model: ChartModel,
  opts: SourceSetupOptions | undefined,
  geometry: 'v44' | 'v45',
): TradeSetup[] {
  const pair = model.pair;
  const pipValue = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const fromMs = opts?.fromMs ?? model.anchor.weekStartMs;
  const toMs = opts?.toMs ?? model.anchor.anchorMs;
  const includePierced = opts?.includePierced ?? false;
  const categoryFor = opts?.categoryFor ?? defaultCategoryFor;
  const mergeTolerance = (LAW7_SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
  const atr1hPips = proxyAtr1hPips(model, pipValue);

  // ── 1. STRUCTURAL UNIVERSE (§8.1 ruling 1 — OB zones + LQZ rungs ONLY) ──
  const structures: StructureRef[] = [
    ...model.zones.map((z): StructureRef => ({
      kind: 'ORDER_BLOCK',
      id: z.id,
      direction: z.type === 'SUPPLY' ? 'SHORT' : 'LONG',
      top: z.top,
      bottom: z.bottom,
      timeframe: z.timeframe,
      classification: z.classification,
      zfp: z.zfp,
      events: z.reactionEvents,
    })),
    ...model.lqzMatrix.map((e): StructureRef => ({
      kind: 'LQZ',
      id: `${pair}|LQZ_M|${e.priceCenter.toFixed(pair === 'DXY' ? 3 : 5)}`,
      // ICT side doctrine: BUY_SIDE liquidity rests ABOVE (buy stops) —
      // a battle there that rejects is a SHORT; SELL_SIDE below → LONG.
      direction: e.side === 'BUY_SIDE' ? 'SHORT' : 'LONG',
      top: e.top,
      bottom: e.bottom,
      timeframe: '1H',
      classification: 'MoM',
      zfp: e.zfp,
      events: e.touchEvents,
    })),
  ];

  // ── 2. BATTLE GROUPS — (structure, day, session) = one candidate (§8.4) ──
  //    TEMPORAL FRESHNESS GATE (§6.4 — the recurrence, applied AT BATTLE
  //    TIME): the model's zone.freshness is the END-state at the anchor;
  //    the trade decision happens at the battle. A battle is admissible
  //    only when the structure was still ALIVE at that moment:
  //      (a) prior battles ≤ 2 — the battle is the structure's 1st, 2nd
  //          or 3rd (FRESH / TESTED_1X / TESTED_2X). DEPLETED (3x+) is
  //          consumed structure — trading the 6th touch of a level is the
  //          DXY=39 slop the §8.1 ruling killed. Count = the model's
  //          event-granularity battle count, pierced events included
  //          (a pierce consumes the most).
  //      (b) NO prior pierced event — a pierce is VIOLATED, the
  //          recurrence's TERMINAL state: the level closed through and
  //          never offers an entry again.
  //    Admissibility is evaluated on each (day, session) group's EARLIEST
  //    clean battle (the moment the entry decision was made). ──
  interface Candidate {
    structure: StructureRef;
    day: string;        // UTC ISO day
    session: SessionLabel;
    battleMs: number;   // representative event's firstTouchMs (earliest in group)
    anatomies: string;  // sorted distinct battle kinds in the group
    /** v4.5.5 F1-B: a defended-transit candidate — the entry anchors to the
     *  rung's CENTER (the level the move transited through — his E 100.945),
     *  not the defendedEdge (the reinforcement level 100.977). */
    transit?: boolean;
  }
  const candidates: Candidate[] = [];
  for (const s of structures) {
    const allEvents = [...s.events].sort((a, b) => a.firstTouchMs - b.firstTouchMs);
    // The structure's battle history up to each moment (consumption count
    // + terminal-violation flag), indexed by event order.
    const groups = new Map<string, { day: string; session: SessionLabel; events: ReactionEvent[] }>();
    for (let i = 0; i < allEvents.length; i++) {
      const ev = allEvents[i]!;
      if (ev.firstTouchMs < fromMs || ev.firstTouchMs > toMs) continue;
      if (ev.pierced && !includePierced) continue; // the level LOST — no entry
      // (a) DEPLETED at battle time: this is the 4th+ battle (priorCount > 2).
      if (i > 2) continue;
      // (b) VIOLATED before battle time: any prior pierce is terminal.
      let violated = false;
      for (let j = 0; j < i; j++) {
        if (allEvents[j]!.pierced) { violated = true; break; }
      }
      if (violated) continue;
      const day = dayKeyOf(ev.firstTouchMs);
      const key = `${day}|${ev.session}`;
      let g = groups.get(key);
      if (!g) { g = { day, session: ev.session, events: [] }; groups.set(key, g); }
      g.events.push(ev);
    }
    for (const g of [...groups.values()].sort((a, b) =>
      (a.day < b.day ? -1 : a.day > b.day ? 1 : 0) ||
      (SESSION_RANK[a.session] - SESSION_RANK[b.session]))) {
      const sorted = [...g.events].sort((a, b) => a.firstTouchMs - b.firstTouchMs);
      candidates.push({
        structure: s,
        day: g.day,
        session: g.session,
        battleMs: sorted[0]!.firstTouchMs,
        anatomies: [...new Set(sorted.map((e) => e.anatomy))].sort().join('+'),
      });
    }

    // ── v4.5.5 F1-B — THE DEFENDED-TRANSIT ENTRY (the operator's #1 Mon
    //    SS Long at the 100.945 shelf): a DIRECTIONAL TRANSIT through a
    //    rung IS the battle — the shelf acted as the springboard for the
    //    move (his entry sits at the rung's level: E 100.945 ≈ the shelf
    //    center 100.949, Δ0.4p). The LQZ matrix only logs REACTION battles
    //    (SWEEP/WICK_REJECT/BODY_DEFEND/DWELL) — a bullish transit bar
    //    (open below the rung, close at/above its center, body ≥ 50%) is
    //    filtered as PASS_THROUGH noise, so the operator's Monday transit
    //    trade was invisible to every downstream gate. The detection runs
    //    over the rung's own LMV candle matrix (which includes the transit
    //    bars) and emits a candidate on the transit's day+session when no
    //    reaction group already exists for it. ──
    if (s.kind === 'LQZ' && geometry === 'v45') {
      // v4.5.5 F1-B FIND FIX (Wave H2 — the #1 Mon SS Long's transit was
      // starved): the LmvTable holds MANY zone-matrix rows sharing a band
      // (per-center rows over one cluster — the [100.936-100.972] shelf has
      // rows c=100.900…101.030). `.find` returned the FIRST in table order
      // (c=100.9 — candles WITHOUT the operator's Monday 03:00Z transit),
      // so the Monday springboard bar (the #1's evidence, living in the
      // c=100.950 row) never reached the transit detector. The selection is
      // now the row AT the structure's level: nearest center to the
      // structure's own center (|100.950 − 100.954| = 0.004 < every other
      // row), candles tiebreak — deterministic, level-true.
      const structureCenter = (s.top + s.bottom) / 2;
      const lmvRung = model.lmv.table
        .filter((z) =>
          z.bottom <= s.top + 1e-9 && z.top >= s.bottom - 1e-9 &&
          Math.abs(z.center - structureCenter) < 10 * pipValue)
        .sort((a, b) =>
          (Math.abs(a.center - structureCenter) - Math.abs(b.center - structureCenter)) ||
          (b.candles.length - a.candles.length) ||
          (a.center - b.center))[0];
      if (lmvRung) {
        // v4.5.5 (Law-31 freshness): only the rung's FIRST defended transit
        // of the week emits — the springboard move. Revisits (the
        // Thursday/Friday re-transits at shelves the week already consumed)
        // are 2x/3x+ touches — TP-only at best, noise at worst (the
        // recurrence's own ladder: UM 100% / 1x 80% / 2x 50% / 3x+ TP-only).
        const firstTransitMsByDir = new Map<string, number>();
        for (const c of [...lmvRung.candles].sort((a, b) => a.timestamp - b.timestamp)) {
          if (c.timestamp < fromMs || c.timestamp > toMs) continue;
          const range = c.high - c.low;
          if (range <= 0) continue;
          const isBull = (c.open < lmvRung.bottom + 1e-9 && c.close >= lmvRung.center - 1e-9 && (c.close - c.open) / range >= 0.5) ||
            (c.low < lmvRung.bottom + 1e-9 && c.close >= lmvRung.center - 1e-9);
          const isBear = (c.open > lmvRung.top - 1e-9 && c.close <= lmvRung.center + 1e-9 && (c.open - c.close) / range >= 0.5) ||
            (c.high > lmvRung.top - 1e-9 && c.close <= lmvRung.center + 1e-9);
          if (isBull && !firstTransitMsByDir.has('LONG')) firstTransitMsByDir.set('LONG', c.timestamp);
          if (isBear && !firstTransitMsByDir.has('SHORT')) firstTransitMsByDir.set('SHORT', c.timestamp);
        }
        const firstTransitMs = firstTransitMsByDir.get(s.direction) ?? Infinity;
        const transitGroups = new Map<string, { day: string; session: SessionLabel; ms: number }>();
        for (const c of lmvRung.candles) {
          if (c.timestamp < fromMs || c.timestamp > toMs) continue;
          const range = c.high - c.low;
          if (range <= 0) continue;
          // The defended probe-and-reclaim (the operator's #1 Mon SS Long):
          // the bar probes THROUGH the rung's far edge and closes back at or
          // beyond the rung's center — the shelf's defense held (the 03:00Z
          // Monday candle: low 100.914 < the shelf bottom, close 100.951 ≥
          // the center). The pure transit (open beyond the rung, close
          // through it, strong body) is the same defense in one bar.
          const bullishTransit = s.direction === 'LONG' &&
            ((c.open < lmvRung.bottom + 1e-9 && c.close >= lmvRung.center - 1e-9 && (c.close - c.open) / range >= 0.5) ||
             (c.low < lmvRung.bottom + 1e-9 && c.close >= lmvRung.center - 1e-9));
          const bearishTransit = s.direction === 'SHORT' &&
            ((c.open > lmvRung.top - 1e-9 && c.close <= lmvRung.center + 1e-9 && (c.open - c.close) / range >= 0.5) ||
             (c.high > lmvRung.top - 1e-9 && c.close <= lmvRung.center + 1e-9));
          if (!bullishTransit && !bearishTransit) continue;
          // Law-31 freshness: only the rung's FIRST defended transit of the
          // week in this direction emits; revisits are consumed (killed).
          if (c.timestamp !== firstTransitMs) continue;
          const day = dayKeyOf(c.timestamp);
          const session = sessionOf(c.timestamp);
          const key = `${day}|${session}`;
          // Never duplicate an existing reaction group or a prior transit.
          if (groups.has(key) || transitGroups.has(key)) continue;
          transitGroups.set(key, { day, session, ms: c.timestamp });
        }
        for (const g of [...transitGroups.values()].sort((a, b) => a.ms - b.ms)) {
          candidates.push({
            structure: s,
            day: g.day,
            session: g.session,
            battleMs: g.ms,
            anatomies: 'TRANSIT_DEFEND',
            transit: true,
          });
        }
      }
    }
  }

  // ── 3. GEOMETRY — SL/TP through the MIRROR engine's helpers (one code path) ──
  interface Priced extends Candidate {
    setup: TradeSetup;
    /** v4.5.4 FIX 5: the shelf-edge role — 'BATTLE_ORIGIN' entries (the
     *  move-origin battle level) and the PRIMARY (defendedEdge/
     *  reinforcement) entry of the SAME shelf are DISTINCT trades (the
     *  operator: origin vs reinforcement = separate), never merge-collapsed. */
    edgeRole?: 'PRIMARY' | 'BATTLE_ORIGIN';
  }
  const priced: Priced[] = [];
  for (const c of candidates) {
    const s = c.structure;
    const direction = s.direction;

    // ── v4.5 GEOMETRY (§3/§4): the LMV-refined E/SL. The structure's
    //    overlapping LMV zone-matrix supplies the defended-edge entry +
    //    the reaction-extreme SL; a structure with NO LMV overlap
    //    degrades honestly to the v4.4 geometry (never fabricated).
    //    The BATTLE PROBE (the group's own wick extreme) anchors the OB
    //    zone match (the entry is AT the level the battle turned at) and
    //    arms the selective SL guard below. ──
    const groupEvents = s.events
      .filter((ev) => !ev.pierced && dayKeyOf(ev.firstTouchMs) === c.day && ev.session === c.session);
    const battleProbe = groupEvents.length > 0
      ? (direction === 'LONG'
        ? Math.min(...groupEvents.map((e) => e.price))
        : Math.max(...groupEvents.map((e) => e.price)))
      : undefined;
    const lmvZone = geometry === 'v45' ? lmvZoneForStructure(s, model, battleProbe) : null;

    // Entry: v4.5 → the defendedEdge (§4.2, the level price ACTUALLY
    // reverses from); v4.4 → the anchor's canon front edge (ceiling for
    // demand-long, floor for supply-short, gen:1082-1091).
    let entry = lmvZone
      ? entryPrice_LMV(lmvZone, direction)
      : direction === 'LONG' ? s.top : s.bottom;
    // v4.5.5 F1-B: a defended-transit candidate's entry anchors to the
    // rung's CENTER — the level the move transited through (his E 100.945 ≈
    // the shelf center 100.949, Δ0.4p); the defendedEdge is the
    // reinforcement level (his #5 Wed E 100.977), a separate trade.
    if (c.transit === true && lmvZone) entry = lmvZone.center;

    // ── v4.5.5 F1-A — THE SHORT-ENTRY EDGE (the operator's documented
    //    levels): his SHORT entries sit at the supply zone's TOP region
    //    (the best short fill — #2 Mon E 101.14 ≈ the [101.027-101.153]
    //    top 101.153 Δ1.3p; GU 1.3436 ≈ the rung top 1.34369 Δ0.9p; the
    //    Wednesday shorts 101.210/101.236 = the defEdges near the tops).
    //    When the resolved entry (the defEdge or the front edge) lands in
    //    the LOWER half of the supply band, it is the worst fill — the
    //    Monday candidates entered at the band bottom 101.027 / defEdge
    //    101.092 → RRR 1.79 → rejected, where his 101.14 yields RRR 4.92
    //    at the SAME SL/TP walk. The lift: entry → band top − 1 pip (his
    //    proven level, ±1.3p of every documented short entry). LONGs are
    //    untouched (the defEdge path is the proven v4.5.1 behavior).
    //    SCOPE (v4.5.5 consolidation): ORDER_BLOCK structures ONLY — the
    //    OB supply's band top is the documented fill (his #2). The LQZ-
    //    rung lifts (the 3367/3371 losses) entered rungs whose defEdges
    //    already carry the level — the lift moved them into the rally's
    //    wick. ──
    if (direction === 'SHORT' && s.kind === 'ORDER_BLOCK' && geometry === 'v45' && entry < (s.top + s.bottom) / 2) {
      entry = s.top - 1 * pipValue;
    }

    // ── v4.5.5 F1-C — THE §8.1 INTERNAL-RUNG ENTRY (the operator's #1 Mon
    //    SS Long at the 100.945 LQZ; the Phase-5 E1 fix brought to the
    //    SOURCE lane): Earth = the internal LQZ, Fire = the containing S/D
    //    zone — when the entry's S/D zone (the structure band) CONTAINS an
    //    internal LMV rung (the LmvTable zone-matrices bridged into
    //    model.zones, ids `LMV|pair|center`, same side), the entry = that
    //    rung's NEAR edge (SHORT → rung floor; LONG → rung ceiling) — the
    //    level the candles' wicks actually aligned at — NOT the zone's
    //    defendedEdge (the modal body-close: the REINFORCEMENT level, a
    //    separate trade). No internal rung → the defendedEdge behavior
    //    (byte-identical fallback, §12 Law 3). ──
    let entryNote: string | null = null;
    let recoveryShelf: { bottom: number; top: number; transitMs: number } | null = null;
    // v4.5.5 F1-E: the recovery-shelf setup's activation + anatomy — the
    // shelf's DEFENDED TRANSIT (the reclaim candle) rides as the battle time
    // and the anatomy labels the trade TRANSIT_DEFEND (the operator's #1 Mon
    // SS Long IS the shelf's defended transit — the deep-wick battle is the
    // sweep, a different trade). mdve-stage.ts:1222-1229's canonical-session
    // rule then gives the leg the raw TOKYO bracket → the fill lands at the
    // shelf reclaim (03:00Z), not the deep-wick sweep.
    let effectiveBattleMs = c.battleMs;
    let effectiveAnatomy = c.anatomies;
    if (geometry === 'v45') {
      const internalEntry = internalLmvRungEntry(s, model, {
        weekStartMs: fromMs, battleMs: c.battleMs,
      });
      if (internalEntry !== null) {
        if (internalEntry.recoveryShelf) {
          // v4.5.5 F1-E — the PRIOR-WEEK RECOVERY SHELF (the operator's #1 Mon
          // SS Long): the entry anchors to the Monday floor shelf's LONG
          // best-fill (band floor + 1 pip), NOT the deep wick's near edge.
          // The setup is a DEFENDED-TRANSIT trade: the activation rides the
          // shelf's defended transit (the reclaim candle — mdve-stage's
          // canonical-session rule gives it the raw TOKYO bracket so the fill
          // lands at the shelf, not the deep-wick sweep).
          recoveryShelf = internalEntry.recoveryShelf;
          effectiveBattleMs = recoveryShelf.transitMs;
          effectiveAnatomy = 'TRANSIT_DEFEND';
          entryNote = `v4.5.5 §8.1 PRIOR-WEEK RECOVERY-SHELF ENTRY: entry=shelf LONG best-fill ${internalEntry.entry.toFixed(pair === 'DXY' ? 3 : 5)} (the ${s.direction === 'LONG' ? 'demand' : 'supply'} ${s.kind} deep-wick band [${s.bottom.toFixed(3)}-${s.top.toFixed(3)}] recovered to the floor shelf [${recoveryShelf.bottom.toFixed(3)}-${recoveryShelf.top.toFixed(3)}] — the defended-transit consolidation; the deep wick's near edge ${entry.toFixed(pair === 'DXY' ? 3 : 5)} is the sweep fill, a separate trade)`;
        } else {
          entryNote = `v4.5.5 §8.1 INTERNAL-RUNG ENTRY: entry=internal LQZ near edge ${internalEntry.entry.toFixed(pair === 'DXY' ? 3 : 5)} (Earth = the internal LMV rung inside the ${s.direction === 'LONG' ? 'demand' : 'supply'} ${s.kind} band [${s.bottom.toFixed(3)}-${s.top.toFixed(3)}]; the defendedEdge ${entry.toFixed(pair === 'DXY' ? 3 : 5)} is the reinforcement, a separate trade)`;
        }
        entry = internalEntry.entry;
      }
    }

    // The anchor as a ZoneModel (the helpers' mandated shape — only
    // top/bottom/timeframe are read; LQZ anchors carry their rung band).
    const anchor: ZoneModel = {
      id: s.id,
      type: direction === 'LONG' ? 'DEMAND' : 'SUPPLY',
      top: s.top,
      bottom: s.bottom,
      timeframe: s.timeframe,
      classification: s.classification,
      formationMs: c.battleMs,
      freshness: 'FRESH',
      reactionEvents: [],
      zfp: s.zfp,
      confluence: 0,
    };

    // SL: v4.5 → computeSL_LMV (§3.2 — the reaction-extreme SL with the
    //    selective guard built in: the entry zone's OWN deepest probe is
    //    the first candidate, so an early entry keeps its correct
    //    structural SL just beyond the actual probe; SWEEP_ORIGIN keeps
    //    the structurally-required wide SL at sweep catches). v4.4 →
    //    computeMirrorSL (the frozen next-rung walk, one shared path).
    let slResult: { sl: number; method: string; rungId: string } | null;
    let slLmvDistPips: number | null = null;
    if (lmvZone) {
      const slLmv = computeSL_LMV(entry, lmvZone, direction, model.lmv.table, pair, {
        atrPips: atr1hPips,
        weekExtreme: direction === 'LONG'
          ? model.lmv.coverage.minPrice
          : model.lmv.coverage.maxPrice,
      });
      slResult = {
        sl: slLmv.sl,
        method: `lmv-${slLmv.method}`,
        rungId: `LMV|${lmvZone.center.toFixed(pair === 'DXY' ? 3 : 5)}`,
      };
      slLmvDistPips = slLmv.distPips;

      // ── THE SELECTIVE GUARD (the task's util>0.70 doctrine, mechanized
      //    at the wiring level): when the computed SL would land INSIDE
      //    the ACTUAL probe — the deepest wick the battle group itself
      //    printed (ReactionEvent.price = the wick tip) — the entry was
      //    EARLY, not the SL wide. KEEP the correct structural SL just
      //    beyond the battle's own probe (Law-7 buffer), tagged
      //    PROBE_GUARD. NEVER blindly tighten past the actual probe:
      //    the measured case — Monday/Tuesday TOKYO battles whose wicks
      //    exceeded the matched zone's historical reactionExtreme by
      //    <1p, converting v4.4 wins to losses; the guard restores the
      //    structural SL (the honest RRR floor then decides viability). ──
      if (groupEvents.length > 0 && battleProbe !== undefined) {
        const probeBuffer = (LAW7_SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
        const probe = battleProbe;
        const insideProbe = direction === 'LONG'
          ? slResult.sl > probe + 1e-9
          : slResult.sl < probe - 1e-9;
        if (insideProbe) {
          slResult = {
            sl: direction === 'LONG' ? probe - probeBuffer : probe + probeBuffer,
            method: `PROBE_GUARD(${slResult.method} — inside the battle probe ${probe})`,
            rungId: slResult.rungId,
          };
          slLmvDistPips = Math.abs(entry - slResult.sl) / pipValue;
        }
      }
    } else {
      slResult = computeMirrorSL(entry, anchor, direction, model.ladder, pair, pipValue, atr1hPips);
    }
    if (!slResult) {
      opts?.onReject?.({
        structureId: s.id, day: c.day, session: c.session, reason: 'SL_INVALID',
        detail: `no rung within the D17 36-pip ceiling beyond [${s.bottom},${s.top}]`,
      });
      continue;
    }
    // TP: the Law-14 walk (one shared code path). v4.5 → the refined walk
    //    (v4.5.x REFINEMENT 1 — the golden TP doctrine: WEAK walls pass
    //    through; the TP caps at the first STRONG opposing rung — the
    //    range-top significance target, FURTHER than the weak wall that
    //    capped v4.5.0). v4.4 → the frozen semantics (byte-identical).
    //    v4.5.5 F1-B: the DEFENDED-TRANSIT scalp (the operator's #1 Mon SS
    //    Long) takes the SS range target — the NEAREST opposing LQZ rung
    //    (the consolidation-scalp doctrine: the range edge, not the range
    //    top). His #1's TP 101.115 filled Monday; the range-top 101.207
    //    never did, and Tuesday's 100.803 dip killed the trade. The transit
    //    scalp needs the near rung to bank the move before the pullback.
    let tpResult = c.transit === true && lmvZone && geometry === 'v45'
      ? computeLmvTP(entry, slResult.sl, direction, model, pair, pipValue)
      : computeMirrorTP(
          entry, slResult.sl, anchor, direction, model.ladder, pipValue,
          geometry === 'v45' ? { passThroughWeakWalls: true } : undefined,
        );
    if (!tpResult) {
      opts?.onReject?.({
        structureId: s.id, day: c.day, session: c.session, reason: 'TP_NULL',
        detail: `no opposing rung of significance passes the Law-14 walk (≥1.2× SL)`,
      });
      continue;
    }

    // ── v4.5.5 F1-E — THE RECOVERY-SHELF GEOMETRY (the operator's #1 Mon SS
    //    Long — see the internalLmvRungEntry doc): the shelf trade's E/SL/TP
    //    is the operator's PROVEN level set, emitted directly (NEVER a machine
    //    repair — the machine's probeAtAnchor would force the SL below the
    //    deep-wick SWEEP that ALREADY happened pre-entry, killing the RRR; the
    //    golden SL sits ABOVE the sweep, banking via the quick day TP):
    //      E  = the shelf's LONG best-fill (band floor + 1 pip — done above)
    //      SL = the TIGHTEST in-band law7 candidate (the machine's tight→wide
    //           walk: rxExt − Law-7 buffer, dist ∈ [Law-10 floor, 9.5]) — the
    //           operator's #1 SL 100.905 ≈ the tight 100.893
    //      TP = the DAY-PROJECTED opposing supply (sourceLaneShapeDayFor —
    //           the operator's #1 TP 101.115 ≈ the [101.109,101.148] BoM's
    //           internal rung 101.130, filled Monday 10:00Z before the re-dip)
    //    The Law-14 TP-vs-SL precondition (≥1.2× SL) gates the projection. ──
    if (recoveryShelf !== null && lmvZone) {
      const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
      const buffer = bufferPips * pipValue;
      const floorPips = atr1hPips > 0 ? Math.max(0.5 * atr1hPips, bufferPips) : bufferPips;
      const tightSl = model.lmv.table
        .filter((z) => direction === 'LONG' ? z.reactionExtreme < entry : z.reactionExtreme > entry)
        .map((z) => ({
          sl: direction === 'LONG' ? z.reactionExtreme - buffer : z.reactionExtreme + buffer,
          center: z.center,
        }))
        .filter((c) => {
          const d = Math.abs(entry - c.sl) / pipValue;
          return d >= floorPips - 1e-9 && d <= GOLDEN_SL_MAX_PIPS + 1e-9;
        })
        .sort((a, b) => Math.abs(entry - a.sl) - Math.abs(entry - b.sl))[0];
      if (tightSl) {
        slResult = {
          sl: tightSl.sl,
          method: `law7-below-rung (F1-E shelf tight — the operator's #1 SL; the deep-wick sweep is pre-entry)`,
          rungId: `LMV|${tightSl.center.toFixed(pair === 'DXY' ? 3 : 5)}`,
        };
        slLmvDistPips = Math.abs(entry - tightSl.sl) / pipValue;
      }
      const sd = sourceLaneShapeDayFor(direction, entry, model, pair);
      // ── ZR-6A/B (2026-08-04) — THE TP RESOLVES FROM THE OPPOSING ZONE'S
      //    GEOMETRY, never the E2 price fields (supplyZonePrice /
      //    demandZonePrice are GONE from the E2 output — "prices are not even
      //    a variable for E2"). The designated opposing zone (supplyZoneId for
      //    LONG / demandZoneId for SHORT) IS the Earth+Fire rung — the
      //    internal LQZ within the opposing S/D zone; the TP = its DEFENDED
      //    EDGE (the level the move ACTUALLY reacts at — the mirror lane's
      //    structuralOpposingLqz semantics; the DXY earth rungs carry
      //    defendedEdge === their id center, so the golden Mon LONG TP
      //    101.130 ≈ the operator's 101.115 holds). Honest absence (no
      //    designation / rung unresolved) → the existing TP walk stands (the
      //    fallback path, byte-identical). ──
      const projectedRung = sd
        ? (direction === 'LONG' ? sd.supplyZoneId : sd.demandZoneId)
        : null;
      const projectedTp = projectedRung
        ? (() => {
            const center = centerOfLmvZoneId(projectedRung);
            if (center <= 0) return null;
            const rung = model.lmv.table.find((z) => Math.abs(z.center - center) < 1e-6) ?? null;
            return rung ? rung.defendedEdge : null;
          })()
        : null;
      if (projectedTp !== null) {
        const tpDist = Math.abs(projectedTp - entry) / pipValue;
        if (tpDist >= 1.2 * (slLmvDistPips ?? 0) - 1e-9) {
          tpResult = {
            tp: projectedTp,
            rungId: projectedRung ?? `LMV|${projectedTp.toFixed(pair === 'DXY' ? 3 : 5)}`,
          };
        }
      }
    }

    let rrr = Math.abs(tpResult.tp - entry) / Math.abs(entry - slResult.sl);
    const category = categoryFor(s);
    const floor = rrrForCategory(category).tp1;
    // ── v4.5.5 F1-D — THE RWL BOUNCE-INSET (the operator's #5 Wed RWL LONG;
    //    see the constants doc above): the §8.1 internal near-edge LONG entry
    //    landed ON the rung's CEILING and the RRR missed the floor by a hair
    //    (2.97 < 3.0). The refinement machine's LONG floor-adjust would pull
    //    the BOUNCE entry down INTO the sweep (the measured v4.5.5 loss) — so
    //    the entry re-places at the operator's bounce-BACK level 0.2p inside
    //    the ceiling and the geometry recomputes; a cleared floor emits
    //    WITHOUT the machine (the bounce level is the operator's proven entry,
    //    never a machine repair). SCOPE: the §8.1 internal-rung LONG path ONLY,
    //    RRR within [floor − 0.1, floor) — a genuine hair, never a wide miss.
    //    Deterministic (the recompute reuses the exact same SL/TP machinery).
    //    ──
    if (geometry === 'v45' && entryNote !== null && direction === 'LONG' &&
        rrr < floor && rrr >= floor - RWL_HAIR_MISS_RRR_DELTA) {
      const bounce = entry - RWL_BOUNCE_INSET_PIPS * pipValue;
      // Recompute the SL at the bounce entry (computeSL_LMV + the selective
      // PROBE_GUARD — the exact same machinery as the primary path).
      let bounceSlResult: { sl: number; method: string; rungId: string } | null = null;
      let bounceSlDistPips: number | null = null;
      if (lmvZone) {
        const slLmv = computeSL_LMV(bounce, lmvZone, direction, model.lmv.table, pair, {
          atrPips: atr1hPips,
          weekExtreme: direction === 'LONG'
            ? model.lmv.coverage.minPrice
            : model.lmv.coverage.maxPrice,
        });
        bounceSlResult = {
          sl: slLmv.sl,
          method: `lmv-${slLmv.method}`,
          rungId: `LMV|${lmvZone.center.toFixed(pair === 'DXY' ? 3 : 5)}`,
        };
        bounceSlDistPips = slLmv.distPips;
      if (groupEvents.length > 0 && battleProbe !== undefined && recoveryShelf === null) {
          const probeBuffer = (LAW7_SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
          const insideProbe = direction === 'LONG'
            ? bounceSlResult.sl > battleProbe + 1e-9
            : bounceSlResult.sl < battleProbe - 1e-9;
          if (insideProbe) {
            bounceSlResult = {
              sl: direction === 'LONG' ? battleProbe - probeBuffer : battleProbe + probeBuffer,
              method: `PROBE_GUARD(${bounceSlResult.method} — inside the battle probe ${battleProbe})`,
              rungId: bounceSlResult.rungId,
            };
            bounceSlDistPips = Math.abs(bounce - bounceSlResult.sl) / pipValue;
          }
        }
      } else {
        bounceSlResult = computeMirrorSL(bounce, anchor, direction, model.ladder, pair, pipValue, atr1hPips);
      }
      if (bounceSlResult) {
        const bounceTp = c.transit === true && lmvZone && geometry === 'v45'
          ? computeLmvTP(bounce, bounceSlResult.sl, direction, model, pair, pipValue)
          : computeMirrorTP(
              bounce, bounceSlResult.sl, anchor, direction, model.ladder, pipValue,
              geometry === 'v45' ? { passThroughWeakWalls: true } : undefined,
            );
        if (bounceTp) {
          const rrrBounce = Math.abs(bounceTp.tp - bounce) / Math.abs(bounce - bounceSlResult.sl);
          if (rrrBounce >= floor - 1e-9) {
            entry = bounce;
            slResult = bounceSlResult;
            slLmvDistPips = bounceSlDistPips;
            tpResult = bounceTp;
            rrr = rrrBounce;
            entryNote = `${entryNote} → RWL bounce inset ${bounce.toFixed(pair === 'DXY' ? 3 : 5)} (the operator's RWL bounce-BACK level, RRR ${rrrBounce.toFixed(2)} ≥ ${floor}, no machine)`;
          }
        }
      }
    }
    // v4.5.5 R2 (Wave H2) — THE REFINEMENT MACHINE WIRED INTO THE SOURCE
    //    LANE (the mirror.ts:2320 reference wiring — refinement-machine.ts
    //    refineSetup): an RRR-failed setup is NOT dead — the E/SL/TP is
    //    wrong on a correct analysis (the operator: "Most of these 1.5-2 R
    //    trades can easily be 3-4 R trades with properl E/SL/TP anchors on
    //    the exact same zones"). Up to 3 surgical repair attempts on the
    //    SAME zone anchors target RRR ≥ floor; a repaired setup emits with
    //    the 🔧 REPAIRED annotation; only a failed repair hard-rejects
    //    with the full 3-attempt audit trail (D36) as the reason.
    let repairNote: string | null = null;
    if (rrr < floor) {
      if (geometry === 'v45') {
        const refined = refineSetup({
          entry, sl: slResult.sl, tp: tpResult.tp,
          direction, pair, pipValue, categoryFloor: floor,
          targetModel: model,
          // The source lane's E3 TP target: no E2 chain — the projected
          // opposing-zone id is derived from the model's own structure
          // (Tier C #1: TP = the LQZ WITHIN the opposing S/D zone).
          shapeDay: sourceLaneShapeDayFor(direction, entry, model, pair),
          anchor,
          entryZone: { defendedEdge: entry, floor: s.bottom, ceiling: s.top },
          slLmv: computeSL_LMV,
          probeAtAnchor: (a, e) => {
            // The source-lane week probe (mirror.ts weekProbeAtAnchor's OB
            // semantics): the structure's own NON-pierced week battles
            // beyond the entry — the deepest adverse wick at the anchor.
            // (Wave I2 — THE PROBE WINDOW, doctrine 2026-08-01): the probe
            // only considers battles AT OR AFTER the battle's formation
            // timestamp (battleMs — the anchor's formationMs). Pre-formation
            // anatomy is a DIFFERENT battle — the battle group's OWN probe
            // (post-formation) is the only evidence that can lift the SL.
            const adverse = s.events.filter((ev) =>
              !ev.pierced &&
              ev.firstTouchMs >= c.battleMs && ev.firstTouchMs <= toMs &&
              (direction === 'LONG' ? ev.price < e - 1e-9 : ev.price > e + 1e-9));
            if (adverse.length === 0) return null;
            const worst = direction === 'LONG'
              ? Math.min(...adverse.map((ev) => ev.price))
              : Math.max(...adverse.map((ev) => ev.price));
            return { price: worst, source: `source-lane ${s.kind} week probe` };
          },
        });
        if (refined.setup && refined.setup.rrr >= floor - 1e-9) {
          // Repaired — the setup emits with the repaired E/SL/TP; the zone
          // anchors NEVER change (only the placement on them).
          const rs = refined.setup;
          entry = rs.entry;
          slResult = { sl: rs.sl, method: rs.slMethod, rungId: slResult.rungId };
          tpResult = { tp: rs.tp, rungId: rs.tpRungId ?? tpResult.rungId };
          rrr = rs.rrr;
          slLmvDistPips = Math.abs(entry - slResult.sl) / pipValue;
          repairNote = refined.annotation; // '🔧 REPAIRED(n): <action>, RRR x.x→y.y'
        } else {
          // Hard-reject — the full 3-attempt audit trail IS the discard reason (D36).
          opts?.onReject?.({
            structureId: s.id, day: c.day, session: c.session, reason: 'RRR_BELOW_FLOOR',
            detail: `RRR ${rrr.toFixed(2)} < ${category} floor ${floor} — ${refined.annotation}`,
          });
          continue;
        }
      } else {
        opts?.onReject?.({
          structureId: s.id, day: c.day, session: c.session, reason: 'RRR_BELOW_FLOOR',
          detail: `RRR ${rrr.toFixed(2)} < ${category} floor ${floor} — the geometry cannot pay for the risk (canon viable-RRR bar)`,
        });
        continue;
      }
    }

    const confidence = confidenceOf(s);
    const dateCompact = c.day.replace(/-/g, '');
    const setup: TradeSetup = {
      setupId: `SRC-${pair}-${s.id.replace(/[^A-Za-z0-9]+/g, '_')}-${dateCompact}-${c.session}`,
      pair,
      direction: direction === 'LONG' ? TradeDirection.LONG : TradeDirection.SHORT,
      category,
      entry,
      sl: slResult.sl,
      tp: tpResult.tp,
      confidence,
      confidenceTier: tierOf(confidence),
      shapeAlignment: ShapeCode.SS, // range doctrine: zone edge → opposing zone edge (AP22)
      session: SESSION_DISPLAY[c.session],
      day: WEEKDAYS[new Date(c.battleMs).getUTCDay()]!,
      shapeTrigger: `${effectiveAnatomy} @ ${c.day} ${c.session}`,
      battleMs: effectiveBattleMs,
      rrr,
      slPips: Math.abs(entry - slResult.sl) / pipValue,
      zoneName: s.id,
      isBoMEntry: s.classification === 'BoM',
      zoneType: s.kind === 'LQZ'
        ? (direction === 'LONG' ? ZoneType.LSZ_DEMAND : ZoneType.LSZ_SUPPLY)
        : s.classification === 'BoM'
          ? (direction === 'LONG' ? ZoneType.BOM_DEMAND : ZoneType.BOM_SUPPLY)
          : (direction === 'LONG' ? ZoneType.MOM_DEMAND : ZoneType.MOM_SUPPLY),
      directionValidation: [],
      notes: `§8.1 structural ${s.kind} battled ${c.day} ${c.session} (${c.anatomies}); ` +
        (entryNote ?? (lmvZone
          ? `v4.5 LMV-REFINED: entry=defendedEdge ${lmvZone.defendedEdge} (§4.2), ` +
            `SL ${slResult.method} ${slLmvDistPips!.toFixed(1)}p (rung ${slResult.rungId}, ` +
            `rxExt ${lmvZone.reactionExtreme}, §3.2); `
          : `SL ${slResult.method} (rung ${slResult.rungId}); `)) +
        (entryNote ? `SL ${slResult.method} ${slLmvDistPips!.toFixed(1)}p (rung ${slResult.rungId}${lmvZone ? `, rxExt ${lmvZone.reactionExtreme}` : ''}, §3.2); ` : '') +
        `TP Law-14 rung ${tpResult.rungId}; ` +
        `RRR ${rrr.toFixed(2)} ≥ ${category} floor ${floor}` +
        (repairNote ? ` ${repairNote}` : ''),
    };
    priced.push({ ...c, setup });

    // ── v4.5.4 FIX 5 / v4.5.5 FIX 4 — THE SHELF DUAL-ENTRY (the operator,
    //    verbatim): "both entries on the 1 trade need to be properly
    //    emitted — this is not a 'pick the best one' option… 1 was a LL
    //    reinforcement while the other was from the start of the move.
    //    These are 2 separate trades… **multiple entries that are all
    //    within 5-15 or so pips of each other are multiple entries of 1
    //    trade; a LL reinforcement 30+ pips away is obviously a separate
    //    trade**". The v4.5.4 implementation emitted edges at the 3-pip
    //    bucket — TOO TIGHT: it split the Wednesday shelf's 2.7-pip
    //    variants into a spurious separate trade (the 100.950 EDGE that
    //    lost). The threshold is now the operator's band: the battle edge
    //    emits ONLY when it sits ≥ 15 pair-pips from the defendedEdge
    //    (below the band → the stagger ladder absorbs it as legs of the
    //    primary trade; beyond → a structurally distinct trade). ──
    if (s.kind === 'LQZ' && groupEvents.length > 0 && geometry === 'v45') {
      const DUAL_ENTRY_MIN_SEPARATION_PIPS = 15; // the operator's one-trade band (FIX 4)
      const bucketOf = (px: number): number => Math.round(px / (3 * pipValue));
      const seenBuckets = new Set<number>([bucketOf(entry)]);
      const battleBuckets = new Map<number, { sum: number; n: number }>();
      for (const ev of groupEvents) {
        const b = bucketOf(ev.price);
        const agg = battleBuckets.get(b) ?? { sum: 0, n: 0 };
        agg.sum += ev.price;
        agg.n += 1;
        battleBuckets.set(b, agg);
      }
      for (const [b, agg] of [...battleBuckets.entries()].sort((x, z) => x[0] - z[0])) {
        if (seenBuckets.has(b)) continue;
        seenBuckets.add(b);
        const edgeEntry = agg.sum / agg.n;
        if (Math.abs(edgeEntry - entry) < DUAL_ENTRY_MIN_SEPARATION_PIPS * pipValue) continue; // inside the one-trade band → legs, not a separate trade
        // SL/TP through the SAME machinery (the shared code path) — the
        // edge entry walks the rungs from its own level.
        let edgeSl: { sl: number; method: string; rungId: string } | null = null;
        if (lmvZone) {
          const slLmv = computeSL_LMV(edgeEntry, lmvZone, direction, model.lmv.table, pair, {
            atrPips: atr1hPips,
            weekExtreme: direction === 'LONG' ? model.lmv.coverage.minPrice : model.lmv.coverage.maxPrice,
          });
          edgeSl = { sl: slLmv.sl, method: `lmv-${slLmv.method}`, rungId: `LMV|${lmvZone.center.toFixed(pair === 'DXY' ? 3 : 5)}` };
          if (battleProbe !== undefined) {
            const probeBuffer = (LAW7_SL_BUFFER_PIPS[pair] ?? 3) * pipValue;
            const insideProbe = direction === 'LONG' ? edgeSl.sl > battleProbe + 1e-9 : edgeSl.sl < battleProbe - 1e-9;
            if (insideProbe) {
              edgeSl = {
                sl: direction === 'LONG' ? battleProbe - probeBuffer : battleProbe + probeBuffer,
                method: `PROBE_GUARD(${edgeSl.method} — inside the battle probe ${battleProbe})`,
                rungId: edgeSl.rungId,
              };
            }
          }
        } else {
          edgeSl = computeMirrorSL(edgeEntry, anchor, direction, model.ladder, pair, pipValue, atr1hPips);
        }
        if (!edgeSl) continue;
        const edgeTp = computeMirrorTP(edgeEntry, edgeSl.sl, anchor, direction, model.ladder, pipValue,
          geometry === 'v45' ? { passThroughWeakWalls: true } : undefined);
        if (!edgeTp) continue;
        const edgeRrr = Math.abs(edgeTp.tp - edgeEntry) / Math.abs(edgeEntry - edgeSl.sl);
        if (edgeRrr < floor) continue; // the canon floor binds the edge equally (honest casualty, never stretched)
        priced.push({
          ...c,
          edgeRole: 'BATTLE_ORIGIN',
          setup: {
            ...setup,
            setupId: `SRC-${pair}-${s.id.replace(/[^A-Za-z0-9]+/g, '_')}_EDGE${b}-${dateCompact}-${c.session}`,
            entry: edgeEntry,
            sl: edgeSl.sl,
            tp: edgeTp.tp,
            rrr: edgeRrr,
            slPips: Math.abs(edgeEntry - edgeSl.sl) / pipValue,
            notes: `§8.1 structural ${s.kind} battled ${c.day} ${c.session} (${c.anatomies}); ` +
              `v4.5.4 SHELF DUAL-ENTRY: entry=battle-level ${edgeEntry.toFixed(pair === 'DXY' ? 3 : 5)} (the move-origin edge — ` +
              `the price the group's reactions turned at; the defendedEdge ${entry} emitted separately as the reinforcement); ` +
              `SL ${edgeSl.method}; TP Law-14 rung ${edgeTp.rungId}; RRR ${edgeRrr.toFixed(2)} ≥ ${category} floor ${floor}`,
          },
        });
      }
    }
  }

  // ── 4. CROSS-STRUCTURE MERGE — one trade per (direction, day, session,
  //    ~entry) band; the highest-significance structure represents it. ──
  const ordered = [...priced].sort((a, b) =>
    (a.day < b.day ? -1 : a.day > b.day ? 1 : 0) ||
    (SESSION_RANK[a.session] - SESSION_RANK[b.session]) ||
    (a.structure.direction < b.structure.direction ? -1 : a.structure.direction > b.structure.direction ? 1 : 0) ||
    (significanceOf(b.structure) - significanceOf(a.structure)) ||
    (a.setup.entry - b.setup.entry) ||
    (a.setup.setupId < b.setup.setupId ? -1 : a.setup.setupId > b.setup.setupId ? 1 : 0));
  const kept: Priced[] = [];
  for (const c of ordered) {
    const dupe = kept.some((k) =>
      k.day === c.day &&
      k.session === c.session &&
      k.structure.direction === c.structure.direction &&
      Math.abs(k.setup.entry - c.setup.entry) <= mergeTolerance &&
      // v4.5.4 FIX 5: the merge is a same-PHYSICAL-level dedup — it binds
      // PRIMARY candidates only. A BATTLE_ORIGIN edge (the shelf's move-
      // origin level, emitted per the operator's dual-entry doctrine:
      // "origin vs reinforcement = 2 separate trades") is NEVER merge-
      // killed — not by its own structure's reinforcement, not by a
      // cross-structure candidate inside the tolerance band.
      (k.edgeRole ?? 'PRIMARY') === 'PRIMARY' &&
      (c.edgeRole ?? 'PRIMARY') === 'PRIMARY');
    if (!dupe) kept.push(c);
  }

  // ── 5. FINAL ORDER — battle chronology, then direction, entry, id. ──
  return kept
    .map((k) => k.setup)
    .sort((a, b) => {
      const ka = kept.find((k) => k.setup === a)!;
      const kb = kept.find((k) => k.setup === b)!;
      return (ka.battleMs - kb.battleMs) ||
        (a.direction < b.direction ? -1 : a.direction > b.direction ? 1 : 0) ||
        (a.entry - b.entry) ||
        (a.setupId < b.setupId ? -1 : a.setupId > b.setupId ? 1 : 0);
    });
}
