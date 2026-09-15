/**
 * MDVE SL-LMV — the v4.5 reaction-extreme SL + defended-edge entry
 * (PLUTUS_V4.5_SPEC §3 Fix 1 SL-WIDTH + §4 Fix 2 ENTRY-PRECISION, EXACT).
 *
 * ═══════════════════════════════════════════════════════════════
 * THE DEFECT (§3.1/§4.1 — evidence-backed):
 *   The frozen computeSLNextLqzRung places the SL at the next
 *   *significant* rung (10-22 pips), where the golden standard uses
 *   4-9.5 pips — 12/17 golden-week wins (71%) used <40% of their SL
 *   room (util = MAE/SL-dist < 0.40). And 5/17 wins (util > 0.70)
 *   entered a few pips EARLY — at the zone's geometric edge, not at
 *   the level price actually reversed from.
 *
 * THE FIX (§3.2/§4.2):
 *   computeSL_LMV — the SL goes just beyond the DEFENDED EXTREME
 *   (reactionExtreme) of the nearest LMV rung beyond the entry, with
 *   the Law-7 pair buffer, accepted only inside [Law-10 floor,
 *   GOLDEN_SL_MAX]. The rungs are the LmvTable's zone-matrices — the
 *   reactionExtreme is a matrix reduction (min/max of the wick-tip
 *   column, lmv.ts §2.4), COMPUTED from the bars, never assumed.
 *   entryPrice_LMV — the entry anchors to the zone's defendedEdge
 *   (the modal body-close of the defending candles — the level price
 *   consistently turned at), not the zone's geometric edge.
 *
 * FROZEN-MACHINERY BOUNDARY (§3.4): computeSLNextLqzRung is FROZEN
 * (used by the emergent lane). computeSL_LMV is a NEW function —
 * nothing here edits the frozen SL path, lmv.ts, or mirror.ts.
 *
 * DETERMINISM + TOTALITY LAWS (§2.5, §11):
 *   1. Same inputs → byte-identical SL/entry. No wall-clock, no
 *      randomness, no pixels, no LLM.
 *   2. Total: empty table → the zone-width fallback (the entry zone
 *      is always given); degenerate zones still yield a defined SL
 *      on the adverse side of entry. Never throws on data shape.
 *   3. Every constant has a BECAUSE (§12 Law 5).
 *   4. No hardcoded levels — every SL/entry derives from the
 *      LmvTable's computed zone-matrices.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { PIP_VALUE } from '../types.js';
import { PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';
import type { LqzZoneMatrix, LmvTable } from './lmv.js';
import type { ZoneModel } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Law-7 SL buffer (pips): EUR 2 / GBP 3 / AUD 3 / DXY 5.
 * BECAUSE: canon Law 7 (visual-setup-generator.ts — "buffer in from
 * the rung's NEAR edge"; replicated in mirror.ts:60-65 as
 * LAW7_SL_BUFFER_PIPS). Replicated, not imported: mirror.ts is another
 * agent's file this wave (the canon-replica precedent — ladder-scaffold
 * CANON REPLICAS, mirror.ts:57). The buffer absorbs the pair's
 * stop-hunt overshoot beyond a defended extreme — DXY's index wicks
 * run deeper than FX pair wicks, hence the larger 5-pip pad.
 */
const LAW7_SL_BUFFER_PIPS: Record<string, number> = {
  'EUR/USD': 2, 'GBP/USD': 3, 'AUD/USD': 3, 'DXY': 5,
};

/**
 * Law-10 ATR fraction = 0.5 × ATR(14, 1H) — the SL noise floor.
 * BECAUSE: canon Law 10 (visual-setup-generator.ts:1238-1249 — "an
 * 8-pip SL into a 15-pip ATR bar dies to ordinary noise"; mirror.ts:78-82
 * LAW10_ATR_FRACTION). A SL tighter than half the average 1H bar's true
 * range is stopped by quoting noise, not by structure — rungs yielding
 * a sub-floor SL are SKIPPED (§3.2 accept predicate), and the zone-width
 * fallback is CLAMPED up to the floor (mirror.ts:389-396 canon semantics).
 */
const LAW10_ATR_FRACTION = 0.5;

/**
 * The golden SL ceiling = 9.5 pips.
 * BECAUSE (§3.2 — bible §9.5): the operator's golden standard caps the
 * SL at the 4H BoM's 9.5-pip stop; the golden rungs sit 3-10 pips
 * apart, so a defended-extreme SL within 9.5 pips is always reachable.
 * Beyond the cap the rung is a FAR significant zone (the v4.4 defect),
 * not the nearest defended rung — rejected.
 */
export const GOLDEN_SL_MAX_PIPS = 9.5;

/**
 * Sweep-origin extreme tolerance = 2 pips.
 * BECAUSE: the canon cluster linkage ε (lmv.ts CLUSTER_TOLERANCE_PIPS =
 * 2, cited from lqz-matrix.ts:78). A zone IS the week's sweep origin
 * when its reactionExtreme (the deepest wick tip of its candle matrix)
 * sits within ε of the observed week extreme — the sweep low/high IS
 * the zone's defended extreme by construction (§3.2: "the sweep low IS
 * the defended extreme").
 */
const SWEEP_ORIGIN_EXTREME_TOL_PIPS = 2;

// ═══════════════════════════════════════════════════════════════════════════════
// THE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SlLmvMethod =
  /** The reaction-extreme SL — a rung's defended extreme ± Law-7 buffer,
   *  accepted inside [Law-10 floor, GOLDEN_SL_MAX] (§3.2 primary path). */
  | 'REACTION_EXTREME'
  /** The sweep-catch exception (§3.2): the entry zone IS the week's sweep
   *  origin — the SL goes just beyond the sweep low/high (the structural
   *  invalidation), which MAY exceed GOLDEN_SL_MAX (correct, documented). */
  | 'SWEEP_ORIGIN'
  /** The golden zone-width SL (§3.2 fallback): the entry zone's own far
   *  edge + Law-7 buffer. */
  | 'ZONE_WIDTH'
  /** The zone-width fallback clamped UP to the Law-10 noise floor
   *  (mirror.ts:389-396 canon — never tighter than max(0.5×ATR, buffer)). */
  | 'ZONE_WIDTH+LAW10_FLOOR';

export interface SlLmvResult {
  /** The stop-loss price (always on the adverse side of entry). */
  sl: number;
  /** Which §3.2 path produced it (the audit trail). */
  method: SlLmvMethod;
  /** |entry − sl| in pips. */
  distPips: number;
}

export interface SlLmvOptions {
  /**
   * ATR(14, 1H) in pips — the Law-10 noise-floor unit. When absent or
   * ≤ 0 the ATR leg of the floor is skipped (mirror.ts:389 canon: "the
   * Law-10 floor is skipped when ATR is unknown") and the floor is the
   * Law-7 buffer alone.
   */
  atrPips?: number;
  /** Override of GOLDEN_SL_MAX_PIPS (default 9.5 — the golden standard). */
  goldenSlMaxPips?: number;
  /**
   * The observed week extreme on the ADVERSE side (LONG → the week's
   * low; SHORT → the week's high) — the sweep-origin detector's
   * reference. The caller passes the LmvResult coverage extreme
   * (coverage.minPrice / coverage.maxPrice). When absent, the table's
   * own min/max reactionExtreme is used (deterministic — a sweep wick
   * that formed a zone is in the table by construction).
   */
  weekExtreme?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// computeSL_LMV — the reaction-extreme SL (§3.2, EXACT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computeSL_LMV(entry, entryZone, direction, lmvTable, pair, opts?).
 *
 * §3.2 algorithm:
 *   1. CANDIDATES — the rungs whose defended extreme lies BEYOND the
 *      entry on the adverse side (LONG: reactionExtreme < entry;
 *      SHORT: reactionExtreme > entry), nearest-to-entry first
 *      (|center − entry| ascending, deterministic tie-breaks). The
 *      entry zone itself is a candidate when its own reactionExtreme
 *      lies beyond the entry — §2.4's worked example anchors the SL
 *      to the ENTRY ZONE'S OWN deepest defended wick (the 100.845
 *      demand's 100.803 probe).
 *   2. ACCEPT the first rung whose SL distance sits inside
 *      [max(0.5×ATR, buffer), GOLDEN_SL_MAX] — the Law-10 floor keeps
 *      the SL out of quoting noise; the golden ceiling keeps it off
 *      the far significant rungs (the v4.4 defect).
 *   3. SWEEP-CATCH — when no golden rung qualified AND the entry zone
 *      IS the week's sweep origin (its reactionExtreme within ε of the
 *      week extreme, sweepCount > 0), the SL goes just beyond the
 *      sweep extreme ± buffer — the structural invalidation, which may
 *      exceed the golden cap (correct, documented §3.2).
 *   4. FALLBACK — the entry zone's own far edge + buffer (the golden
 *      zone-width SL), clamped UP to the Law-10 floor (canon).
 *
 * Total: an empty table walks zero candidates straight to the
 * fallback; the result is always on the adverse side of entry.
 */
export function computeSL_LMV(
  entry: number,
  entryZone: LqzZoneMatrix,
  direction: 'LONG' | 'SHORT',
  lmvTable: LmvTable,
  pair: string,
  opts?: SlLmvOptions,
): SlLmvResult {
  const pip = PIP_VALUE[pair] ?? PIP_VALUE_DEFAULT;
  const bufferPips = LAW7_SL_BUFFER_PIPS[pair] ?? 3;
  const buffer = bufferPips * pip;
  const atrPips = opts?.atrPips ?? 0;
  const capPips = opts?.goldenSlMaxPips ?? GOLDEN_SL_MAX_PIPS;
  // Law-10 floor (mirror.ts:391 canon): max(0.5×ATR, buffer); the ATR
  // leg is skipped when ATR is unknown (≤ 0) — the buffer alone floors.
  const floorPips =
    atrPips > 0 ? Math.max(LAW10_ATR_FRACTION * atrPips, bufferPips) : bufferPips;

  const distOf = (sl: number): number => Math.abs(entry - sl) / pip;

  // ── 1+2. THE RUNG WALK (nearest defended extreme beyond entry) ──
  const candidates = lmvTable
    .filter((z) =>
      direction === 'LONG' ? z.reactionExtreme < entry : z.reactionExtreme > entry,
    )
    .sort(
      (a, b) =>
        Math.abs(a.center - entry) - Math.abs(b.center - entry) ||
        a.center - b.center ||
        a.bottom - b.bottom,
    );

  for (const rung of candidates) {
    const sl =
      direction === 'LONG'
        ? rung.reactionExtreme - buffer
        : rung.reactionExtreme + buffer;
    const distPips = distOf(sl);
    if (distPips >= floorPips - 1e-9 && distPips <= capPips + 1e-9) {
      return { sl, method: 'REACTION_EXTREME', distPips };
    }
  }

  // ── 3. THE SWEEP-CATCH (§3.2 — the structural invalidation) ──
  // The entry zone IS the week's sweep origin: its reactionExtreme IS
  // the sweep low/high (within the canon ε), and sweeps consumed
  // liquidity there. The SL belongs just beyond that extreme — wider
  // than the golden cap is CORRECT here (the sweep's structural
  // invalidation, not an arbitrary far rung).
  const tableExtreme =
    lmvTable.length === 0
      ? entryZone.reactionExtreme
      : direction === 'LONG'
        ? Math.min(...lmvTable.map((z) => z.reactionExtreme))
        : Math.max(...lmvTable.map((z) => z.reactionExtreme));
  const weekExtreme = opts?.weekExtreme ?? tableExtreme;
  if (
    entryZone.sweepCount > 0 &&
    Math.abs(entryZone.reactionExtreme - weekExtreme) <=
      SWEEP_ORIGIN_EXTREME_TOL_PIPS * pip
  ) {
    const sl =
      direction === 'LONG'
        ? entryZone.reactionExtreme - buffer
        : entryZone.reactionExtreme + buffer;
    // Totality guard: the sweep extreme must sit on the adverse side of
    // entry (a degenerate zone overlapping entry falls through to the
    // zone-width fallback instead of emitting a same-side stop).
    if ((direction === 'LONG' && sl < entry) || (direction === 'SHORT' && sl > entry)) {
      return { sl, method: 'SWEEP_ORIGIN', distPips: distOf(sl) };
    }
  }

  // ── 4. THE ZONE-WIDTH FALLBACK (§3.2 — the golden zone-width SL) ──
  let sl =
    direction === 'LONG' ? entryZone.bottom - buffer : entryZone.top + buffer;
  let method: SlLmvMethod = 'ZONE_WIDTH';
  // Law-10 clamp (mirror.ts:389-396 canon semantics): never tighter
  // than the noise floor — a razor-thin zone's edge SL is widened to
  // the floor, and a degenerate zone whose edge lands on the wrong
  // side of entry is pulled to the adverse side at the floor.
  if (
    (direction === 'LONG' && sl >= entry) ||
    (direction === 'SHORT' && sl <= entry) ||
    distOf(sl) < floorPips
  ) {
    sl =
      direction === 'LONG'
        ? entry - floorPips * pip
        : entry + floorPips * pip;
    method = 'ZONE_WIDTH+LAW10_FLOOR';
  }
  return { sl, method, distPips: distOf(sl) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// entryPrice_LMV — the defended-edge entry (§4.2, EXACT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * entryPrice_LMV(zone, direction, opts?) → the entry anchor.
 *
 * §4.2: the entry is the zone's defendedEdge — the modal body-close of
 * the zone's DEFENDING candles (lmv.ts §2.4: the level price
 * consistently turned at), NOT the zone's geometric edge. The frozen
 * 0.33/0.33/0.34 stagger ladder spreads from this anchor (the stagger
 * machinery is untouched — only the anchor moves).
 *
 * For an LqzZoneMatrix the defendedEdge is a matrix reduction already
 * computed by buildLmvTable — returned directly.
 *
 * For an ORDER_BLOCK ZoneModel the model carries no candle matrix; the
 * defended edge is the OB candle's BODY EDGE nearest the defended side
 * (§4.2): LONG/DEMAND → min(open, close) (the lower body edge the
 * buyers defended); SHORT/SUPPLY → max(open, close). The caller passes
 * the OB candle via opts.obCandle (the model's formationMs is its
 * timestamp — the caller owns the bars). Without the candle the honest
 * degradation is the zone's defended-side geometric edge (bottom for
 * LONG, top for SHORT) — the v4.4 anchor, never an invented level.
 */
export function entryPrice_LMV(
  zone: LqzZoneMatrix | ZoneModel,
  direction: 'LONG' | 'SHORT',
  opts?: { obCandle?: OHLCBar },
): number {
  // LqzZoneMatrix — the defended edge is a computed matrix reduction.
  if ('defendedEdge' in zone) {
    return zone.defendedEdge;
  }
  // ORDER_BLOCK ZoneModel — the OB candle's body edge nearest the
  // defended side (§4.2).
  const ob = opts?.obCandle;
  if (ob) {
    return direction === 'LONG'
      ? Math.min(ob.open, ob.close)
      : Math.max(ob.open, ob.close);
  }
  // Honest degradation (no candle available): the zone's defended-side
  // geometric edge — the v4.4 anchor, documented, never fabricated.
  return direction === 'LONG' ? zone.bottom : zone.top;
}
