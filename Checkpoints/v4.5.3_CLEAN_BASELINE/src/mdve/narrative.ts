/**
 * MDVE Weekly Narrative — the GOD-VISION autopsy, computed
 * (PLUTUS_V4.4_MDVE_SPEC §6.5, algorithm §6.5.1 implemented COMPLETE).
 *
 * ═══════════════════════════════════════════════════════════════
 * Computes the operator's weekly read from data alone:
 *   1. Sweep origin   — the week's extreme candle with sweep anatomy
 *   2. Range boundaries — the consolidation top/bottom from the LQZ matrix
 *   3. Reactions      — event-granularity battles at each boundary
 *   4. The break      — the displacement candle that pierced a boundary
 *   5. Post-break     — the first zone of significance with a battle
 *
 * Honest nulls (§12 Law 3): no sweep → sweepOrigin null; unbroken range →
 * theBreak null. Never fabricated.
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import type {
  LqzMatrixEntry,
  ReactionEvent,
  WeeklyNarrative,
  ZoneModel,
} from './types.js';
import { computeAtr, isoWeekKey, sessionOf } from './util.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sweep wick-close fraction = 0.5.
 * BECAUSE: §6.5.1 verbatim — "lower-wick ≥ 50% of range — sweep anatomy".
 */
const SWEEP_CLOSE_FRACTION = 0.5;

/**
 * Break displacement floor = 1.5 × ATR(14, 1H).
 * BECAUSE: §6.5.1 Step 4 verbatim — "displacement ≥ 1.5" (the Friday Tokyo
 * BS through the range bottom). ATR period 14 = canon (lqz-lobe.ts:209).
 */
const BREAK_DISPLACEMENT_ATR = 1.5;
const ATR_PERIOD = 14;

/**
 * Post-sweep gap before the consolidation window opens = 24h.
 * BECAUSE: the operator's week anatomy is sweep → MOVE → range → break —
 * the post-sweep displacement leg runs ~1 trading day before the
 * consolidation forms (golden trace: Jul 6 06:00 sweep, range Jul 7-9).
 * Without the gap, the sweep-day reaction shelves (e.g. the 100.845 MoM
 * retest at Jul 6 18:00) would be misread as the range bottom.
 */
const SWEEP_TO_RANGE_GAP_MS = 24 * 3_600_000;

/**
 * Sweep scan context = 7 days.
 * BECAUSE: a sweep is measured against the PRIOR WEEK's extreme — the
 * structural level the current auction traded against (canon sweep
 * doctrine: the grab takes out the recent structure's high/low). The
 * scan window (week + prior-week context) uses the same 7-day unit so
 * the origin that printed on the prior Friday is visible.
 */
const SWEEP_CONTEXT_MS = 7 * 24 * 3_600_000;

/**
 * Sweep reclaim window = 3 bars.
 * BECAUSE: canon sharp-move window (lqz-lobe.ts:160) — the market proves
 * a move within 3 bars; the same window proves the REJECTION (the
 * departure leg of the battle, canon event granularity).
 */
const SWEEP_RECLAIM_WINDOW_BARS = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface NarrativeInput {
  /** 1H bars for [weekStartMs − 7d, anchorMs] (week + prior-week context). */
  bars1H: OHLCBar[];
  weekStartMs: number;
  anchorMs: number;
  zones: ZoneModel[];
  lqzMatrix: LqzMatrixEntry[];
}

/**
 * Build the weekly narrative (§6.5.1 — the five steps, in order).
 * Total: any bar set yields a narrative (fields null when absent).
 */
export function buildWeeklyNarrative(input: NarrativeInput): WeeklyNarrative {
  const { bars1H, weekStartMs, anchorMs, zones, lqzMatrix } = input;

  const weekBars = bars1H.filter((b) => b.timestamp >= weekStartMs && b.timestamp <= anchorMs);
  const priorBars = bars1H.filter((b) => b.timestamp < weekStartMs);

  // ── Step 1: SWEEP ORIGIN ──
  const sweepOrigin = findSweepOrigin(weekBars, priorBars);

  // ── Steps 2+4: RANGE BOUNDARIES + THE BREAK (two-pass — the window
  //    ends AT the break, but the break is found FROM the boundaries) ──
  // Consolidation window: "the week's mid-section after the sweep, before
  // the break" (§6.5.1 Step 2). Pass 1 bounds the window at the anchor to
  // discover the break; pass 2 re-bounds the window AT the break so the
  // post-break battle zones never contaminate the range boundaries.
  const windowStart = (sweepOrigin?.ms ?? weekStartMs) +
    (sweepOrigin ? SWEEP_TO_RANGE_GAP_MS : 0);
  // Rolling ATR(14) per bar — displacement is measured against the
  // volatility regime AT THE TIME of the candidate (canon adaptive-
  // threshold doctrine: every threshold derives from the ATR window
  // PRECEDING the event). The v4.4.0 anchor-ATR was blind to the break
  // that STARTED a volatile move: the break's own bars inflate the
  // anchor ATR, and 1.5× the inflated unit exceeds the break itself.
  const atrByMs = rollingAtrMap(bars1H, ATR_PERIOD);
  // The break pierces the RANGE — temporally it must follow the
  // consolidation it breaks (§6.5.1 Step 2: the window is "after the
  // sweep, BEFORE THE BREAK" — the break closes the window, so it is
  // sought only after the window opens). Without this bound the
  // pre-range displacement leg (the sweep bar, the OB candle itself)
  // would false-fire as a break through a boundary that did not yet exist.
  const breakCandidates = weekBars.filter((b) => b.timestamp >= windowStart);

  // ── Origin-zone ownership (§6.2: ORDER_BLOCK > LQZ) ──
  // "The matrix never double-counts a level an order block already owns."
  // The level the NARRATIVE already accounts for is the SWEEP ORIGIN's
  // own zone: the origin's battle history is the origin story, not a
  // range boundary. The origin's order block is the candle structure AT
  // the origin — it must lie within the origin bar's own auction range
  // of the sweep price (the grab probed THROUGH it). Zones the move
  // ARRIVED at (the range-top supplies formed from the range reactions)
  // are not the origin — their levels are the matrix's subject matter.
  let originZone: ZoneModel | null = null;
  if (sweepOrigin) {
    const originBar = bars1H.find((b) => b.timestamp === sweepOrigin!.ms);
    const originRange = originBar ? originBar.high - originBar.low : 0;
    let bestDist = Infinity;
    for (const z of zones) {
      const dist = sweepOrigin.price < z.bottom
        ? z.bottom - sweepOrigin.price
        : sweepOrigin.price > z.top
          ? sweepOrigin.price - z.top
          : 0;
      if (dist <= originRange && dist < bestDist) {
        bestDist = dist;
        originZone = z;
      }
    }
  }
  const boundaryCandidates = lqzMatrix.filter((e) =>
    !(originZone && e.priceCenter >= originZone.bottom && e.priceCenter <= originZone.top),
  );

  const pass1 = findRangeBoundaries(boundaryCandidates, windowStart, anchorMs);
  const breakGuess = findTheBreak(
    breakCandidates,
    pass1.top ? { price: pass1.top.priceCenter } : null,
    pass1.bottom ? { price: pass1.bottom.priceCenter } : null,
    atrByMs,
  );

  const windowEnd = breakGuess?.ms ?? anchorMs;
  const { top, bottom } = breakGuess
    ? findRangeBoundaries(boundaryCandidates, windowStart, windowEnd)
    : pass1;

  // ── Step 3: REACTIONS AT BOUNDARIES (event-granularity — canon) ──
  const rangeTop = top
    ? { price: top.priceCenter, reactions: countReactions(top, weekBars) }
    : null;
  const rangeBottom = bottom
    ? { price: bottom.priceCenter, reactions: countReactions(bottom, weekBars) }
    : null;

  // ── Step 4: THE BREAK (re-resolved against the final boundaries) ──
  const theBreak = findTheBreak(breakCandidates, rangeTop, rangeBottom, atrByMs);

  // ── Step 5: POST-BREAK REACTION ──
  const barsAfter = theBreak
    ? bars1H.filter((b) => b.timestamp > theBreak.ms)
    : [];
  const postBreak = theBreak
    ? postBreakReaction(theBreak, zones, barsAfter)
    : null;

  // reactionsAtBoundaries: total distinct battle events at BOTH boundaries
  // (e.g. "2 distinct reactions at the range top before the break" — the
  // per-boundary counts live in rangeTop/rangeBottom.reactions).
  const reactionsAtBoundaries =
    (rangeTop?.reactions.length ?? 0) + (rangeBottom?.reactions.length ?? 0);

  return {
    sweepOrigin,
    rangeTop,
    rangeBottom,
    theBreak,
    reactionsAtBoundaries,
    postBreakZoneId: postBreak?.id ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — SWEEP ORIGIN (§6.5.1, verbatim)
// ═══════════════════════════════════════════════════════════════════════════════

export function findSweepOrigin(
  weekBars: OHLCBar[],
  priorBars: OHLCBar[],
): { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH' } | null {
  if (weekBars.length === 0 || priorBars.length === 0) return null;

  // The scan window: the week + its prior-week context (§6.5.1 — the
  // sweep ORIGIN is the first liquidity grab of the current structure;
  // it may print in the final days of the prior week — the operator's
  // gold-standard origin printed on the prior Friday).
  const scanStartMs = weekBars[0]!.timestamp - SWEEP_CONTEXT_MS;
  const context = [...priorBars, ...weekBars]
    .sort((a, b) => a.timestamp - b.timestamp);

  // Chronological scan — collect every valid sweep candidate; the
  // ORIGIN is selected below (the grab that HELD), not the first grab
  // (sub-structure grabs fire earlier and die later).
  const candidates: { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH'; index: number }[] = [];
  for (let i = 0; i < context.length; i++) {
    const b = context[i]!;
    if (b.timestamp < scanStartMs) continue;

    // Rolling prior-week extreme (bars in [t−7d, t)) — measured on
    // CLOSES, not wicks.
    // BECAUSE: a wick is an excursion; a CLOSE is the auction's verdict.
    // The level a sweep takes out (and then fails to hold) is the prior
    // week's CLOSE-defined extreme: the grab wicks through the close-
    // level, and the failure to CLOSE beyond it is the rejection.
    // Measuring against the prior week's absolute wick extreme fails on
    // real structure: the origin sweep prints as a HIGHER wick low after
    // the terminal spike (the spike's own wick becomes the "extreme" and
    // the origin — the bar the operator marks — never "pierces" it), and
    // measuring against all-time loaded history makes every week
    // sweep-free (the v4.4.0 failure → sweepOrigin null).
    let priorExtremeLow = Infinity;
    let priorExtremeHigh = -Infinity;
    let priorCount = 0;
    for (let j = i - 1; j >= 0; j--) {
      const p = context[j]!;
      if (p.timestamp < b.timestamp - SWEEP_CONTEXT_MS) break;
      if (p.close < priorExtremeLow) priorExtremeLow = p.close;
      if (p.close > priorExtremeHigh) priorExtremeHigh = p.close;
      priorCount++;
    }
    if (priorCount === 0) continue;

    const range = b.high - b.low;
    if (range <= 0) continue;

    // The reclaim (event granularity — canon: a battle is arrival +
    // battle + DEPARTURE, and the departure can print up to 3 bars after
    // the probe, lqz-lobe.ts:160's sharp-move window): the grab FAILED
    // if the sweep bar OR any of the next RECLAIM_WINDOW_BARS bars
    // closes back through the pierced level. Without the window, a
    // 14-pip sweep bar that closes 1.6 pips short of the level and
    // reclaims it two bars later is misread as a successful breakdown.
    let reclaimLow = b.close;
    let reclaimHigh = b.close;
    for (let j = i + 1; j <= Math.min(i + SWEEP_RECLAIM_WINDOW_BARS, context.length - 1); j++) {
      if (context[j]!.close > reclaimLow) reclaimLow = context[j]!.close;
      if (context[j]!.close < reclaimHigh) reclaimHigh = context[j]!.close;
    }

    // Rejection anatomy (two forms of the SAME event — the failed
    // continuation): (a) the dominant-wick rejection — the bar closed
    // in the far half of its range; (b) the shallow probe — the market
    // could not trade beyond the level (pierce depth ≤ half the bar's
    // range). Both prove the grab lacked conviction.
    // SWEEP_LOW: wick pierced the prior close-low, auction reclaimed it.
    if (b.low < priorExtremeLow && reclaimLow > priorExtremeLow) {
      const wickFraction = (b.close - b.low) / range;
      const probeFraction = (priorExtremeLow - b.low) / range;
      if (wickFraction >= SWEEP_CLOSE_FRACTION || probeFraction <= SWEEP_CLOSE_FRACTION) {
        candidates.push({ price: b.low, ms: b.timestamp, anatomy: 'SWEEP_LOW', index: i });
      }
    }
    // SWEEP_HIGH: mirror image.
    if (b.high > priorExtremeHigh && reclaimHigh < priorExtremeHigh) {
      const wickFraction = (b.high - b.close) / range;
      const probeFraction = (b.high - priorExtremeHigh) / range;
      if (wickFraction >= SWEEP_CLOSE_FRACTION || probeFraction <= SWEEP_CLOSE_FRACTION) {
        candidates.push({ price: b.high, ms: b.timestamp, anatomy: 'SWEEP_HIGH', index: i });
      }
    }
  }

  // THE ORIGIN IS THE GRAB THAT HELD — AT THE FRESHEST TERMINAL EXTREME.
  // A sweep whose level is later CLOSED through was a failed grab — a
  // breakdown step inside the move, not the origin of it. Among the
  // grabs that held (no subsequent close beyond the sweep price in the
  // sweep direction), the origin is a grab AT the scan window's terminal
  // extreme (within 1×ATR — the canon ATR-scaled alignment unit): mid-
  // range grabs that held are shelves, not origins. When both sides have
  // qualifying grabs, the origin is on the side whose terminal extreme
  // printed MOST RECENTLY — the auction's freshest extreme is the one it
  // is still working from; the stale extreme is completed history.
  const respected = candidates.filter((c) => {
    for (let j = c.index + 1; j < context.length; j++) {
      const later = context[j]!;
      if (c.anatomy === 'SWEEP_LOW' && later.close < c.price) return false;
      if (c.anatomy === 'SWEEP_HIGH' && later.close > c.price) return false;
    }
    return true;
  });
  if (respected.length === 0) return null; // no grab held — honest null (§6.5.1)

  const scanBars = context.filter((b) => b.timestamp >= scanStartMs);
  let minLow = Infinity;
  let minLowMs = 0;
  let maxHigh = -Infinity;
  let maxHighMs = 0;
  for (const b of scanBars) {
    if (b.low < minLow) { minLow = b.low; minLowMs = b.timestamp; }
    if (b.high > maxHigh) { maxHigh = b.high; maxHighMs = b.timestamp; }
  }
  const tol = computeAtr(scanBars, ATR_PERIOD);
  const lowGrabs = respected.filter(
    (c) => c.anatomy === 'SWEEP_LOW' && c.price - minLow <= tol,
  );
  const highGrabs = respected.filter(
    (c) => c.anatomy === 'SWEEP_HIGH' && maxHigh - c.price <= tol,
  );
  const preferLow = minLowMs >= maxHighMs;
  const primary = (preferLow ? lowGrabs : highGrabs).sort((a, b) => a.ms - b.ms);
  const fallback = (preferLow ? highGrabs : lowGrabs).sort((a, b) => a.ms - b.ms);
  const pick = primary[0] ?? fallback[0] ?? null;
  return pick ? { price: pick.price, ms: pick.ms, anatomy: pick.anatomy } : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — RANGE BOUNDARIES (§6.5.1: highest/lowest matrix entries with
// touches inside the consolidation window)
// ═══════════════════════════════════════════════════════════════════════════════

export function findRangeBoundaries(
  lqzMatrix: LqzMatrixEntry[],
  windowStartMs: number,
  windowEndMs: number,
): { top: LqzMatrixEntry | null; bottom: LqzMatrixEntry | null } {
  const inWindow = lqzMatrix.filter((e) =>
    e.touchEvents.some((t) => t.firstTouchMs >= windowStartMs && t.firstTouchMs <= windowEndMs),
  );
  let top: LqzMatrixEntry | null = null;
  let bottom: LqzMatrixEntry | null = null;
  for (const e of inWindow) {
    if (e.side === 'BUY_SIDE' && (top === null || e.priceCenter > top.priceCenter)) top = e;
    if (e.side === 'SELL_SIDE' && (bottom === null || e.priceCenter < bottom.priceCenter)) bottom = e;
  }
  return { top, bottom };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — REACTIONS AT A BOUNDARY (event-granularity — canon)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A "reaction" = arrival (bar enters the boundary zone) + rejection
 * anatomy (wick/engulfing AWAY from the boundary) + departure (close back
 * inside the range). Contiguous touching bars merge into ONE event (canon:
 * a multi-bar battle is ONE event); an event with no rejection anatomy
 * (pure dwell) is not a reaction (Bible 4.14: consolidation dwell is not
 * a retest).
 */
export function countReactions(
  boundary: LqzMatrixEntry,
  weekBars: OHLCBar[],
): ReactionEvent[] {
  const events: ReactionEvent[] = [];
  let group: OHLCBar[] = [];
  let pierced = false;

  const flush = (): void => {
    if (group.length === 0) return;
    // Rejection anatomy: a bar in the battle whose wick probed the boundary
    // and whose body closed back AWAY from it.
    const hasRejection = group.some((b) => {
      const bodyTop = Math.max(b.open, b.close);
      const bodyBottom = Math.min(b.open, b.close);
      const lowerProbe = b.low <= boundary.top && b.low >= boundary.bottom - (boundary.top - boundary.bottom);
      const upperProbe = b.high >= boundary.bottom && b.high <= boundary.top + (boundary.top - boundary.bottom);
      // Rejection at a SELL_SIDE (lower) boundary: lower wick in, bullish close.
      if (boundary.side === 'SELL_SIDE') {
        return b.low < bodyBottom && lowerProbe && b.close > b.open;
      }
      // Rejection at a BUY_SIDE (upper) boundary: upper wick in, bearish close.
      return b.high > bodyTop && upperProbe && b.close < b.open;
    });
    if (hasRejection) {
      const first = group[0]!;
      const last = group[group.length - 1]!;
      let price = boundary.side === 'SELL_SIDE' ? Infinity : -Infinity;
      for (const b of group) {
        price = boundary.side === 'SELL_SIDE' ? Math.min(price, b.low) : Math.max(price, b.high);
      }
      events.push({
        firstTouchMs: first.timestamp,
        lastTouchMs: last.timestamp,
        price,
        anatomy: 'WICK_REJECT',
        session: sessionOf(first.timestamp),
        isoWeek: isoWeekKey(first.timestamp),
        bars: group.length,
        pierced,
      });
    }
    group = [];
    pierced = false;
  };

  for (const b of weekBars) {
    const touches = b.low <= boundary.top && b.high >= boundary.bottom;
    if (touches) {
      group.push(b);
      const closedBeyond = boundary.side === 'SELL_SIDE'
        ? b.close < boundary.bottom
        : b.close > boundary.top;
      if (closedBeyond) pierced = true;
    } else {
      flush();
    }
  }
  flush();

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — THE BREAK (§6.5.1, verbatim: first displacement bar through a boundary)
// ═══════════════════════════════════════════════════════════════════════════════

export function findTheBreak(
  weekBars: OHLCBar[],
  rangeTop: { price: number } | null,
  rangeBottom: { price: number } | null,
  atrByMs: ReadonlyMap<number, number>,
): { direction: 'UP' | 'DOWN'; ms: number; piercedLevel: number; displacement: number } | null {
  for (const bar of weekBars) {
    const atr = atrByMs.get(bar.timestamp) ?? 0;
    if (atr <= 0) continue; // no volatility baseline at this bar → no displacement claim (totality)
    const displacement = Math.abs(bar.close - bar.open) / atr;
    if (displacement < BREAK_DISPLACEMENT_ATR) continue;
    if (rangeBottom && bar.close < rangeBottom.price && bar.close < bar.open) {
      return { direction: 'DOWN', ms: bar.timestamp, piercedLevel: rangeBottom.price, displacement };
    }
    if (rangeTop && bar.close > rangeTop.price && bar.close > bar.open) {
      return { direction: 'UP', ms: bar.timestamp, piercedLevel: rangeTop.price, displacement };
    }
  }
  return null; // consolidation unbroken — honest null (§6.5.1)
}

/**
 * rollingAtrMap — ATR(period) ENDING at each bar (the volatility regime
 * at the time). Deterministic: sorted by candle timestamp, true-range
 * prefix sums; a bar with no prior bar gets ATR 0 (no baseline).
 */
function rollingAtrMap(bars: OHLCBar[], period: number): Map<number, number> {
  const sorted = [...bars].sort((a, b) => a.timestamp - b.timestamp);
  const prefix = new Array<number>(sorted.length + 1).fill(0);
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const prev = sorted[i - 1]!;
    prefix[i + 1] = prefix[i]! + Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close),
    );
  }
  const map = new Map<number, number>();
  for (let i = 1; i < sorted.length; i++) {
    const start = Math.max(1, i - period + 1);
    const count = i - start + 1;
    map.set(sorted[i]!.timestamp, (prefix[i + 1]! - prefix[start]!) / count);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — POST-BREAK REACTION (§6.5.1: first zone of significance with a battle)
// ═══════════════════════════════════════════════════════════════════════════════

export function postBreakReaction(
  theBreak: { direction: 'UP' | 'DOWN'; piercedLevel: number },
  zones: ZoneModel[],
  barsAfter: OHLCBar[],
): ZoneModel | null {
  // The break path: zones beyond the pierced level in the break direction.
  const path = zones.filter((z) =>
    theBreak.direction === 'DOWN'
      ? z.top <= theBreak.piercedLevel
      : z.bottom >= theBreak.piercedLevel,
  );

  // "The FIRST ZONE OF SIGNIFICANCE in the break direction where a battle
  // occurred" (§6.5.1): among battled path zones, significance = canon zfp
  // (the Hard Wall doctrine — the strongest, least-mitigated zone is the
  // significant one; the golden post-break zone is the fresh 1H BoM Hard
  // Wall, not a weaker multi-tested shelf at a nearer price). Ties break
  // by proximity to the pierced level (nearest first).
  const battled = path.filter((z) => battleOccurredAt(z, barsAfter));
  battled.sort((a, b) =>
    (a.zfp - b.zfp) ||
    (theBreak.direction === 'DOWN' ? b.top - a.top : a.bottom - b.bottom),
  );
  return battled[0] ?? null;
}

/** battleOccurredAt: any bar whose range intersects the zone WITHOUT
 * closing through the zone's far edge (canon pierce semantics, per type:
 * demand pierces below the floor, supply above the ceiling). A bar that
 * probes INTO the zone and closes back outside on the approach side IS a
 * battle — that is the defense (the Friday pierce-and-react). */
function battleOccurredAt(zone: ZoneModel, bars: OHLCBar[]): boolean {
  for (const b of bars) {
    const intersects = b.low <= zone.top && b.high >= zone.bottom;
    if (!intersects) continue;
    const pierced = zone.type === 'DEMAND'
      ? b.close < zone.bottom   // closed through demand's floor
      : b.close > zone.top;     // closed through supply's ceiling
    if (!pierced) return true;
  }
  return false;
}
