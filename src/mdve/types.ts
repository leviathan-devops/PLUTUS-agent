/**
 * MDVE Types — the Chart Mental Model (PLUTUS_V4.4_MDVE_SPEC §5, EXACT).
 *
 * ═══════════════════════════════════════════════════════════════
 * MDVE is the EYES of the Plutus v4.4 triad: a deterministic mathematical
 * engine that constructs the complete mental model of the chart from raw
 * OHLC data — every S/D zone, every liquidity zone, every order block,
 * every freshness state, the weekly narrative — with ZERO pixel input and
 * ZERO LLM inference (§12 Determinism Law 1).
 *
 * Determinism (§5): ChartModel contains no wall-clock fields (all
 * timestamps are candle timestamps). Same bars → byte-identical model.
 * ═══════════════════════════════════════════════════════════════
 */

import type { ScaffoldRung } from '../engines/ladder-scaffold.js';
import type { LmvResult } from './lmv.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TOUCH / REACTION PRIMITIVES (§6.2 touch semantics, §8.3 reaction identity)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The 5 touch kinds (§6.2.1 Stage 1 — total predicate: every bar's
 * interaction with a level classifies to EXACTLY ONE branch).
 *
 * The matrix's signal is REACTION, not coverage: PASS_THROUGH is NOT a
 * touch (excluded from the matrix) — a level traversed 40 times without
 * reacting is noise, not liquidity (§6.2 doctrine).
 */
export type TouchKind =
  | 'SWEEP'         // spiked through the level, closed back — the liquidity event
  | 'WICK_REJECT'   // wick tested the level, body reversed — defended
  | 'BODY_DEFEND'   // body sat at the level and price turned
  | 'CONSOL_DWELL'  // consolidation dwelling AT the level — the shelf
  | 'PASS_THROUGH'; // traversed without reacting — NOT a touch (excluded)

/** The battle kinds — the §8.1 `battled` predicate's accepted anatomy set. */
export const BATTLE_KINDS: readonly TouchKind[] = [
  'SWEEP',
  'WICK_REJECT',
  'BODY_DEFEND',
  'CONSOL_DWELL',
];

/**
 * Session label — the dedup-key component (§8.4: same zone + same day +
 * same session = DUPLICATE; different session = DISTINCT trade).
 * UTC-hour bucketing (deterministic — no exchange calendars):
 *   TOKYO  00-07 UTC, LONDON 07-13 UTC, NY 13-21 UTC, OFF 21-24 UTC.
 * BECAUSE: the operator's sessions are Tokyo/London/NY; the v4.3 dedup
 * used session windows; UTC boundaries are the deterministic canonical form.
 */
export type SessionLabel = 'TOKYO' | 'LONDON' | 'NY' | 'OFF';

/**
 * A reaction event — event-granularity (canon: battles, not bars).
 * One event = arrival + battle anatomy + departure. A 2-day retest is ONE
 * event; consolidation dwell is not a retest (Bible 4.14 / §6.4).
 *
 * This is the trade's temporal identity (§8.3): trade identity =
 * (zoneId, reactionEvent.ms) — same zone reacting at different times =
 * DISTINCT trades.
 */
export interface ReactionEvent {
  /** unix ms of the first bar of the event (arrival). Candle timestamp. */
  firstTouchMs: number;
  /** unix ms of the last bar of the event (departure). Candle timestamp. */
  lastTouchMs: number;
  /** The extreme price touched during the event (wick tip / body edge). */
  price: number;
  /** The event's dominant battle anatomy (never PASS_THROUGH — excluded). */
  anatomy: Exclude<TouchKind, 'PASS_THROUGH'>;
  /** Session of the arrival bar — the dedup-key component (§8.4). */
  session: SessionLabel;
  /** ISO week key (e.g. '2026-W28') — the matrix's time axis (§6.2). */
  isoWeek: string;
  /** Number of bars in the event (a multi-bar battle is still ONE event). */
  bars: number;
  /** True when any bar in the event CLOSED beyond the zone's far edge. */
  pierced: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS STATE MACHINE (§6.4 — recurrence, canon)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The freshness recurrence states (§6.4):
 *   FRESH(0x) → TESTED_1X → TESTED_2X → DEPLETED(3x+) | VIOLATED(pierced)
 * Pierce requires a battle; gap-through (being-left-behind) ≠ depletion.
 */
export type FreshnessState =
  | 'FRESH'
  | 'TESTED_1X'
  | 'TESTED_2X'
  | 'DEPLETED'
  | 'VIOLATED';

// ═══════════════════════════════════════════════════════════════════════════════
// THE CHART MENTAL MODEL (§5 — EXACT)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChartModel {
  pair: string;
  weekStart: string;
  anchor: { weekStartMs: number; anchorMs: number };
  spot: number;

  /** The zone map — every S/D zone across 4H/1H/30m. */
  zones: ZoneModel[];              // §6.1 — OB-derived, BoM/MoM classified, freshness-annotated

  /** The liquidity matrix — every LQZ with its full touch structure. */
  lqzMatrix: LqzMatrixEntry[];     // §6.2 — clustered, week-spanning, matrix-complete

  /** The LMV dataset (v4.5 §2) — every LQZ as a candle-matrix with the
   *  reactionExtreme (SL anchor) + defendedEdge (entry anchor) reductions. */
  lmv: LmvResult;

  /** The deterministic ladder (§7 — the v4.3 scaffold, now model-fed). */
  ladder: ScaffoldRung[];          // sorted, deduped, range-filtered, source-annotated

  /** The weekly narrative (§6.5). */
  narrative: WeeklyNarrative;      // sweepOrigin, rangeTop, rangeBottom, reactions[], theBreak

  /** The mirror map (§9) — present on EU/GU models; DXY's model is the mirror SOURCE. */
  mirrorSource?: { pair: string;   // 'DXY' for EU; 'EUR/USD' for GU
                   mappings: MirrorMapping[] };
}

export interface ZoneModel {
  id: string;                      // deterministic: `${pair}|${tf}|${obTimestamp}|${floor}`
  type: 'SUPPLY' | 'DEMAND';
  top: number; bottom: number;
  timeframe: '4H' | '1H' | '30m' | '15m';
  classification: 'BoM' | 'MoM';   // §6.3 — from candle anatomy, never from a label
  formationMs: number;             // the OB candle's timestamp (mirror matching key, §9.2)
  freshness: FreshnessState;       // §6.4 — the recurrence state machine's output
  reactionEvents: ReactionEvent[]; // event-granularity (canon — battles, not bars)
  zfp: number;                     // canon zfp (type + freshness + LQZ ladder)
  confluence: number;              // 9-pillar composite at this level
  // ── Telescoping nesting (operator 2026-07-31) — LTF zones inside HTF zones
  //    are REFINEMENTS, never separate competing zones (T2/T3 set these in
  //    ob-engine buildZoneMap; the OBCV link reads them in Phase 4). ──
  refinedLabel?: string;    // '1H Refined 4H', '30m Refined 1H' — the telescoping refinement tag
  nestedWithin?: string;    // the parent zone's id
  refinedBy?: string;       // the child zone id that refines this zone's active edge
  parent?: ZoneModel;       // the telescoping parent (OBCV link, Phase 4)
  /** The full pressure state — stamped by stampZonePressureStates in
   *  buildChartModel (optional: unset on zones built outside the model). */
  pressure?: ZonePressureState;
  /** The LMV rung shielding this zone (S/D zones only — the SHIELD link's
   *  rungId, mirrored for O(1) lookup). */
  shieldZoneId?: string;
  /** THE C-2 FIX (2026-08-11 — Machine C): the LMV matrix side carried onto
   *  the bridged zone (BUY_SIDE/SELL_SIDE — the battle vote) so the
   *  resting-side pass can honor a CONFLICT (the container's type never
   *  overrides the rung's own vote). Non-LMV zones have no side (undefined). */
  side?: 'BUY_SIDE' | 'SELL_SIDE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE-PRESSURE STATE (Wave ZR-1A — the E1 pressure-state layer)
// ═══════════════════════════════════════════════════════════════════════════════

/** The zone's pressure lifecycle (the operator's vocabulary mapped on the
 *  battle data): VIRGIN(0 battles) → ACTIVE_1(1) → ACTIVE_2(2) → DEPLETED(3+
 *  — "zones usually fail on the THIRD mitigation") → FORTRESS(4+ battles, zero
 *  pierces — the 95% direction-flip phase transition) → BROKEN (any pierce). */
export type ZoneLifecycle =
  | 'VIRGIN'
  | 'ACTIVE_1'
  | 'ACTIVE_2'
  | 'DEPLETED'
  | 'FORTRESS'
  | 'BROKEN'
  // ZR-7B (the E2ZoneInput contract — the ZR-7 OVERHAUL SPEC Part 8.1): the
  // confluence levels (the IP zones) are NOT S/D battle structures — their
  // honest lifecycle is 'CONFLUENCE'. They carry no battle semantics (no
  // mitigation lifecycle) — the E2's pressureScore reads it as a zero from
  // the lifecycle terms (honest — the confluence zones are never battle-
  // driven; their pressure comes from the 6D confluence + the ZFP).
  | 'CONFLUENCE';

/** A liquidity link between an S/D zone and an LMV rung: NESTED = the rung is
 *  fully inside the zone (the zone's internal fuel — "the Earth within the
 *  Fire"); SHIELD = the rung sits in front of the zone between it and the
 *  week's spot (the candles eat it first → the S/D lasts longer; the shield
 *  projects the shielded zone's pressure, weaker). */
export interface LiquidityLink {
  /** The bridged ZoneModel id of the rung: `LMV|${pair}|${center.toFixed(5)}`. */
  rungId: string;
  kind: 'NESTED' | 'SHIELD';
  /** True when the candles have consumed the rung's liquidity (the LAST
   *  classified band interaction is a close-through). eatenAtMs = the LAST
   *  consumption event; defendedAtMs = the LAST defense event (a rejection
   *  at the band — a defense AFTER a consumption re-establishes the fuel).
   *  eaten-as-of-T ⟺ eatenAtMs ≤ T AND eatenAtMs > (defendedAtMs ?? 0). */
  eaten: boolean;
  eatenAtMs?: number;
  defendedAtMs?: number;
  /** The shielding zone's zfp — the pressure the shield projects (weaker than
   *  the zone's own; the projection SOURCE, never a fabricated modifier). */
  projectedPressure: number;
}

/** The zone's full pressure state (computed by stampZonePressureStates). */
export interface ZonePressureState {
  /** The battles fought (S/D zones: reactionEvents.length; LMV-bridge rungs:
   *  the rung's candle count — touches, documented as touches-not-battles). */
  mitigationCount: number;
  /** The pressure lifecycle. LMV-bridge rungs carry 'VIRGIN' by convention —
   *  their consumption state lives in absorption/LiquidityLink.eaten, not the
   *  battle lifecycle (their data is touch-granular, not event-granular). */
  lifecycle: ZoneLifecycle;
  /** Any battle closed beyond the zone's far edge (S/D zones only). */
  pierced: boolean;
  /** The zone's OWN fuel state: ABSORBED when its primary liquidity (the
   *  NESTED rung, else the SHIELD) is eaten; INTACT otherwise. */
  absorption: 'INTACT' | 'ABSORBED';
  /** The zone's liquidity links (nested + shield rungs; empty for rungs). */
  liquidity: LiquidityLink[];
}

/** The operative defense for a trade — WHICH structure currently defends.
 *  The zone relevance is a pressure-state function: fuel INTACT → the LQZ
 *  (nested/shield) defends first (SHIELD_FUEL); fuel ABSORBED → the S/D zone
 *  itself is the operative defense (PRESSURE_STRUCTURE). */
export interface OperativeDefense {
  /** The current ladder step (the trade's entry zone). */
  entryStep: ZoneModel;
  /** The operative defense structure (the SL anchor's zone). */
  defense: ZoneModel;
  defenseKind: 'SHIELD_FUEL' | 'PRESSURE_STRUCTURE';
  /** The next ladder step away (the next zone on the adverse side beyond the
   *  defense — the ladder rule's second branch). Undefined when none exists. */
  nextStep?: ZoneModel;
  /** The mechanical explanation — layer-evidenced (zone ids, prices, times,
   *  the absorption state), never generic. */
  reason: string;
}

export interface LqzMatrixEntry {
  priceCenter: number;             // the equivalence-class center
  top: number; bottom: number;
  side: 'BUY_SIDE' | 'SELL_SIDE';
  touchEvents: ReactionEvent[];    // every touch, with timestamps + candle refs
  weekSpan: number;                // how many distinct weeks touched this level
  confirmationPatterns: string[];  // sweep/long-wick/consolidation pattern types (canon ≥2)
  zfp: number;                     // canon LQZ ladder
}

export interface WeeklyNarrative {
  sweepOrigin: { price: number; ms: number; anatomy: 'SWEEP_LOW' | 'SWEEP_HIGH' } | null;
  rangeTop: { price: number; reactions: ReactionEvent[] } | null;
  rangeBottom: { price: number; reactions: ReactionEvent[] } | null;
  theBreak: { direction: 'UP' | 'DOWN'; ms: number; piercedLevel: number; displacement: number } | null;
  reactionsAtBoundaries: number;   // e.g. "2 distinct reactions at the range top before the break"
  /** §6.5 Step 5 — where the break went (first zone of significance with a battle). */
  postBreakZoneId: string | null;
}

export interface MirrorMapping {
  sourceSetupId: string;           // the DXY (or EU) setup this mirrors
  direction: 'LONG' | 'SHORT';     // inverted from source for DXY→EU; same as source for EU→GU
  anchorZoneId: string;            // the pair's OWN zone (structurally equivalent, §9.2)
  entry: number; sl: number; tp: number;
  status: 'ACTIVE' | 'RRR_DISCARDED';
  discardReason?: string;          // e.g. "GU volatility: RRR 1.3 < floor 2.0 after re-anchor"
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE OPTIONS (buildChartModel's optional inputs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Optional inputs to buildChartModel. Absence is honest emptiness, never a
 * proxy (§12 Law 3: no invented truth — absence of options data → the
 * options pillar is empty, not proxied).
 */
export interface ChartModelOptions {
  /**
   * 9-pillar result for ladder PILLAR rungs + per-zone confluence.
   * BECAUSE: the scaffold's Source 3 (pivot grid / MAs / option walls) is a
   * first-class ladder source (§7); when absent the ladder emits zero
   * pillar rungs and zone confluence is 0 (honest — no fabricated confluence).
   */
  pillarResult?: import('../brains/9-pillar-lobe.js').PillarResult;
  /**
   * LQZ lookback in 1H bars. Default LQZ_LOOKBACK_BARS = 720 (canon:
   * 6 weeks of 1H — operator-ruled sweet spot 3-6 weeks, lqz-lobe.ts:119).
   */
  lqzLookbackBars?: number;
}
