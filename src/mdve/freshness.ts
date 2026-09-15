/**
 * MDVE Freshness — the recurrence state machine (PLUTUS_V4.4_MDVE_SPEC §6.4).
 *
 * ═══════════════════════════════════════════════════════════════
 * States: FRESH(0x) → TESTED(1x) → TESTED(2x) → DEPLETED(3x+) | VIOLATED(pierced)
 *
 *   FRESH   --[battle at zone]--> TESTED_1X
 *   TESTED  --[battle]--> TESTED_2X --[battle]--> DEPLETED
 *   any     --[close beyond zone WITH battle]--> VIOLATED
 *   any     --[gap-through without battle]--> (no transition —
 *           being-left-behind ≠ depletion)
 *
 * The state machine is a pure recurrence (MPSE Structure 6):
 *   stateₙ₊₁ = f(stateₙ, touchEventₙ)
 * — no look-ahead, no history rewrite. Event-granularity is canon
 * (Bible 4.14: bars ≠ events; a 2-day retest is ONE battle; consolidation
 * dwell is NOT a retest; pierce requires a battle; gap-through is not
 * depletion — 4h-sd-lobe.ts countReactions, replicated here with event
 * records because MDVE needs the per-event timestamps/anatomy for §8.3
 * trade identity).
 *
 * Canon zfp per state per type (4h-sd-lobe.ts:180-182 — inverted-at-0x
 * doctrine, Bible 4.11/4.14):
 *   BoM: FRESH=10 (Hard Wall, Law 31), 1x=18, 2x=32, DEPLETED=65
 *   MoM: FRESH=65 (virgin pierces, Bible 4.13), 1x=22, 2x=38, DEPLETED=70
 *   VIOLATED = depleted tier (canon pierce terminality: "force the
 *   depleted tier regardless of event count").
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import type { FreshnessState, ReactionEvent } from './types.js';
import { isoWeekKey, sessionOf } from './util.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT EXTRACTION — canon event-granularity (4h-sd-lobe countReactions,
// replicated with event records — cited, not imported: that helper is not
// exported and the canon lobes must not be modified; ladder-scaffold
// CANON REPLICAS precedent)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract retest EVENTS after a zone's breakout candle.
 *
 * Event detection (canon): a NEW event starts when price enters the zone
 * from OUTSIDE (previous bar was fully outside). Consecutive bars inside
 * the zone are ONE event. An event ends when a bar is fully outside the
 * zone. If any bar in an event CLOSES beyond the zone's far edge, the
 * event PIERCED the zone.
 *
 * Gap-through (canon W6 doctrine): a bar that jumps over the zone without
 * intersecting it never starts an event — the zone's orders were never
 * consumed, so the zone keeps its freshness (being-left-behind ≠ depletion).
 *
 * Scan starts AFTER the breakout candle (fromIndex + 1): the breakout
 * originates FROM the zone — it is not itself a retest (canon).
 */
export function extractReactionEvents(
  bars: OHLCBar[],
  fromIndex: number,
  floor: number,
  ceiling: number,
  type: 'demand' | 'supply',
): ReactionEvent[] {
  const events: ReactionEvent[] = [];
  let inZone = false;
  let cur: ReactionEvent | null = null;

  for (let i = fromIndex + 1; i < bars.length; i++) {
    const bar = bars[i]!;
    // Zone-intersection test (canon): any wick/body overlap with [floor, ceiling].
    const intersects = bar.low <= ceiling && bar.high >= floor;
    const closesBeyond = type === 'demand'
      ? bar.close < floor        // closed through demand (pierce)
      : bar.close > ceiling;     // closed through supply (pierce)
    const fullyOutside = type === 'demand'
      ? bar.low > ceiling        // entirely above demand zone
      : bar.high < floor;        // entirely below supply zone

    if (intersects) {
      if (!inZone) {
        // New retest event — price came from outside (canon).
        cur = {
          firstTouchMs: bar.timestamp,
          lastTouchMs: bar.timestamp,
          price: type === 'demand' ? bar.low : bar.high,
          anatomy: 'WICK_REJECT', // refined below once the battle's outcome is known
          session: sessionOf(bar.timestamp),
          isoWeek: isoWeekKey(bar.timestamp),
          bars: 0,
          pierced: false,
        };
        events.push(cur);
        inZone = true;
      }
      const ev = cur!;
      ev.bars += 1;
      ev.lastTouchMs = bar.timestamp;
      const extreme = type === 'demand' ? bar.low : bar.high;
      ev.price = type === 'demand'
        ? Math.min(ev.price, extreme)
        : Math.max(ev.price, extreme);
      if (closesBeyond) {
        ev.pierced = true;
        // A pierce through the zone's body that still intersected the zone
        // is a battle the zone LOST — the anatomy is a body event.
        ev.anatomy = 'BODY_DEFEND';
      }
    } else if (fullyOutside) {
      inZone = false; // event ended — price left the zone (canon)
      cur = null;
    }
    // Bars partially inside but zone already occupied do NOT extend anatomy.
  }

  return events;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE RECURRENCE (MPSE Structure 6 — stateₙ₊₁ = f(stateₙ, touchEventₙ))
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Internal machine state: the freshness tier plus the running battle count.
 * The count is retained across VIOLATED so a re-establishing battle resumes
 * the canon count semantics (canon: "a later event re-establishes the
 * zone" — pierce terminality applies ONLY when the LAST event pierced).
 */
interface MachineState {
  state: FreshnessState;
  battles: number;
}

/**
 * f(state, event) — the transition function. Piecewise-TOTAL: every
 * (state, event) maps to exactly one successor.
 *
 *   event.pierced                → VIOLATED (close beyond WITH battle)
 *   FRESH     --[battle]--> TESTED_1X
 *   TESTED_1X --[battle]--> TESTED_2X
 *   TESTED_2X --[battle]--> DEPLETED
 *   DEPLETED  --[battle]--> DEPLETED (saturated — 3x+ is one tier)
 *   VIOLATED  --[battle]--> re-established: resume the count tier
 *                           (canon: later event re-establishes the zone)
 */
function transition(s: MachineState, event: ReactionEvent): MachineState {
  const battles = s.battles + 1;
  if (event.pierced) {
    return { state: 'VIOLATED', battles };
  }
  if (battles <= 1) return { state: 'TESTED_1X', battles };
  if (battles === 2) return { state: 'TESTED_2X', battles };
  return { state: 'DEPLETED', battles };
}

/**
 * Run the freshness recurrence over a zone's reaction events.
 * Events are applied in candle order (the input is already chronological —
 * extractReactionEvents scans bars ascending). Gap-through bars never
 * produced events, so they can never cause a transition (canon doctrine).
 */
export function runFreshnessMachine(events: ReactionEvent[]): FreshnessState {
  let s: MachineState = { state: 'FRESH', battles: 0 };
  for (const event of events) {
    s = transition(s, event);
  }
  return s.state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON ZFP (4h-sd-lobe.ts:180-182 — the inverted-at-0x doctrine)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon zfp from zone TYPE + freshness STATE.
 *
 * BECAUSE (canon citation, 4h-sd-lobe.ts:171-182): freshness semantics are
 * INVERTED between types at 0x — an unmitigated BoM is a Hard Wall (100%
 * reaction, Law 31); a virgin MoM is a death zone for counter-trend entries
 * (it pierces, Bible 4.13 MoM ladder-step rule).
 *   BoM: FRESH=10, TESTED_1X=18, TESTED_2X=32, DEPLETED=65
 *   MoM: FRESH=65, TESTED_1X=22, TESTED_2X=38, DEPLETED=70
 *   VIOLATED: depleted tier (canon pierce terminality — a zone that lost
 *   its last battle is depleted regardless of count).
 */
export function zfpFromState(
  classification: 'BoM' | 'MoM',
  state: FreshnessState,
): number {
  if (state === 'VIOLATED') return classification === 'BoM' ? 65 : 70;
  if (classification === 'BoM') {
    if (state === 'FRESH') return 10;
    if (state === 'TESTED_1X') return 18;
    if (state === 'TESTED_2X') return 32;
    return 65; // DEPLETED
  }
  // MoM
  if (state === 'FRESH') return 65;
  if (state === 'TESTED_1X') return 22;
  if (state === 'TESTED_2X') return 38;
  return 70; // DEPLETED
}
