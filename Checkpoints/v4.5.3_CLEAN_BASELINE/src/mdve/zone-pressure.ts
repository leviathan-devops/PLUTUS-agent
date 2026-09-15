/**
 * zone-pressure.ts — the E1 ZONE-PRESSURE ENGINE (Wave ZR-1A).
 *
 * Every zone in the ChartModel carries its FULL pressure state (the
 * lifecycle with FORTRESS, the mitigation count, the absorption, the
 * liquidity links) and computeOperativeDefense selects the currently-
 * operative defense structure for a trade from the pressure state — not
 * a static role.
 *
 * The doctrine (the operator, verbatim — the law this code implements):
 *  - "pressure mechanics are the fundamental reality everything is built
 *    on top of."
 *  - "S/D are the pressure zones, LQZ are the fuel zones... LQ is what the
 *    candles need to actually eat and absorb before a move. The candles
 *    eat the liquidity in front of the S/D and in doing so the S/D (and
 *    its internal nested liquidity) is protected from mitigation and thus
 *    has a longer lifespan."
 *  - "zones usually fail on the THIRD mitigation."
 *  - The zone relevance (trade #4): fuel INTACT → the LQZ defends first;
 *    fuel ABSORBED → the S/D zone itself is the defense.
 *  - The fortress (trade #8): 4+ mitigations, zero pierces → "likely to
 *    become a fortress zone and NOT get pierced."
 *
 * E1 infrastructure only: DATA computed from the E1 zone map — no trade
 * logic, no SL/TP computation, no invented rules. Deterministic (§12
 * Law 1): same bars → byte-identical pressure states. No wall-clock.
 */

import { PIP_VALUE } from '../types.js';
import type { OHLCBar } from '../types.js';
import { PIP_VALUE_DEFAULT } from '../constants/trading-constants.js';
import type { LqzZoneMatrix } from './lmv.js';
import type {
  ChartModel,
  FreshnessState,
  LiquidityLink,
  OperativeDefense,
  ReactionEvent,
  ZoneLifecycle,
  ZoneModel,
} from './types.js';

/**
 * The shield-proximity band, in pips.
 *
 * BECAUSE: the operator's shields sit DIRECTLY adjacent to the zone they
 * shield — the EU trade #3's shield [1.1444-1.14395] is ~2-6 pips from
 * the BoM supply [1.14460-1.14530]; trade #4's shields at 1.14195-1.14225
 * (front) and 1.14265-1.14300 (rear) sandwich the MoM supply
 * [1.14220-1.14295]. 20 pips is the generous bound that keeps the
 * relation "the immediate front rung" — beyond that a rung is an
 * independent structure, not a shield. (Doctrine citations only — the
 * levels are never used in computation.)
 */
export const SHIELD_PROXIMITY_PIPS = 20;

/** The bridged ZoneModel id of an LMV rung (mirrors index.ts:355). */
function rungId(pair: string, rung: LqzZoneMatrix): string {
  return `LMV|${pair}|${rung.center.toFixed(5)}`;
}

/**
 * The operator's lifecycle mapped on the battle data:
 *   any pierce → BROKEN (the role reversal — the terminal state)
 *   4+ battles, zero pierces → FORTRESS ("not been pierced or broken in 4
 *     prior mitigations... likely to become a fortress zone and NOT get
 *     pierced" — the 95% direction-flip phase transition)
 *   3+ battles → DEPLETED ("zones usually fail on the THIRD mitigation" —
 *     the knife's edge)
 *   2 → ACTIVE_2 · 1 → ACTIVE_1 · 0 → VIRGIN.
 * Pure, deterministic, unit-testable.
 */
export function classifyLifecycle(
  events: ReactionEvent[],
  freshness: FreshnessState,
): ZoneLifecycle {
  const battles = events.length;
  const pierced = freshness === 'VIOLATED' || events.some((e) => e.pierced);
  if (pierced) return 'BROKEN';
  if (battles >= 4) return 'FORTRESS';
  if (battles >= 3) return 'DEPLETED';
  if (battles === 2) return 'ACTIVE_2';
  if (battles === 1) return 'ACTIVE_1';
  return 'VIRGIN';
}

/**
 * The rung's consumption state — EVENT-SEQUENCE scoped (the 2026-08-04
 * contract revision — the lifetime-scoped predicate degenerated: over a
 * 6-week lookback EVERY rung in the traded range gets closed through, so
 * every rung reported eaten and the operative defense collapsed to
 * PRESSURE_STRUCTURE always). Eaten ⟺ the LAST classified interaction
 * with the rung's band (at ≤ anchorMs) is a CONSUMPTION. A bar
 * interacting with the band [bottom − ε, top + ε] (ε = 2 pips — the LMV
 * reaction-band canon) classifies as:
 *   CONSUMPTION: the bar closes BEYOND the rung's far edge (through and
 *     stayed) — BUY_SIDE (demand-side, approach from above): close <
 *     bottom; SELL_SIDE (supply-side, approach from below): close > top.
 *   DEFENSE: the bar interacts and holds at/inside the far edge AND the
 *     next bar turns ≥ 2 pips back to the approach side (the LMV canon's
 *     own BODY_DEFEND rejection predicate — MIN_TOUCH_DEPTH_PIPS).
 * A SWEEP-and-reverse (the wick through + the body closed back) is a
 * DEFENSE — the level held after the grab, NOT a consumption. A
 * gap-through (the bar never intersects the band) is being-left-behind,
 * NOT eaten (the canon depletion doctrine). Neutral bars (no band
 * interaction) never change the state. eaten = the last event is a
 * consumption; eatenAtMs = the LAST consumption's timestamp;
 * defendedAtMs = the LAST defense's timestamp (a defense AFTER a
 * consumption re-establishes the fuel — "each test deposits NEW
 * liquidity"). eaten-as-of-T ⟺ eatenAtMs ≤ T AND eatenAtMs >
 * (defendedAtMs ?? 0).
 */
function computeRungEaten(
  rung: LqzZoneMatrix,
  bars: OHLCBar[],
  anchorMs: number,
  pipValue: number,
): { eaten: boolean; eatenAtMs?: number; defendedAtMs?: number } {
  const EPS = 2 * pipValue;     // the LMV reaction-band canon
  const REJECT = 2 * pipValue;  // the LMV BODY_DEFEND rejection predicate
  let lastConsumptionMs: number | undefined;
  let lastDefenseMs: number | undefined;
  const scoped = bars.filter((b) => b.timestamp <= anchorMs);
  for (let i = 0; i < scoped.length; i++) {
    const b = scoped[i]!;
    if (b.low > rung.top + EPS || b.high < rung.bottom - EPS) continue;
    const consumed =
      rung.side === 'BUY_SIDE' ? b.close < rung.bottom : b.close > rung.top;
    if (consumed) {
      lastConsumptionMs = b.timestamp;
      continue;
    }
    const next = scoped[i + 1];
    if (!next) continue;
    const rejected =
      rung.side === 'BUY_SIDE'
        ? next.close - b.close >= REJECT
        : b.close - next.close >= REJECT;
    if (rejected) lastDefenseMs = b.timestamp;
  }
  const eaten =
    lastConsumptionMs !== undefined &&
    lastConsumptionMs > (lastDefenseMs ?? 0);
  return {
    eaten,
    ...(lastConsumptionMs !== undefined ? { eatenAtMs: lastConsumptionMs } : {}),
    ...(lastDefenseMs !== undefined ? { defendedAtMs: lastDefenseMs } : {}),
  };
}

/**
 * The zone's NESTED + SHIELD rung links (at most one of each):
 *  - NESTED: rungs whose [bottom, top] is FULLY contained within
 *    [zone.bottom, zone.top] — "the Earth within the Fire" (the zone's
 *    internal fuel). The one with the most candles wins (the strongest
 *    internal fuel); ties break by rung center ascending.
 *  - SHIELD: rungs on the approach side within SHIELD_PROXIMITY_PIPS of
 *    the zone's approach edge — DEMAND: center in (zone.top, zone.top +
 *    20×pip]; SUPPLY: center in [zone.bottom − 20×pip, zone.bottom). The
 *    nearest to the zone wins; ties break by rung center ascending.
 * Deterministic: the rung list is pre-sorted by center ascending.
 */
function computeLiquidityLinks(
  zone: ZoneModel,
  rungs: LqzZoneMatrix[],
  pair: string,
  pipValue: number,
  bars: OHLCBar[],
  anchorMs: number,
): LiquidityLink[] {
  const mk = (r: LqzZoneMatrix, kind: 'NESTED' | 'SHIELD'): LiquidityLink => {
    const e = computeRungEaten(r, bars, anchorMs, pipValue);
    const link: LiquidityLink = {
      rungId: rungId(pair, r),
      kind,
      eaten: e.eaten,
      projectedPressure: r.zfp,
    };
    if (e.eatenAtMs !== undefined) link.eatenAtMs = e.eatenAtMs;
    if (e.defendedAtMs !== undefined) link.defendedAtMs = e.defendedAtMs;
    return link;
  };

  const nested = rungs
    .filter((r) => r.bottom >= zone.bottom && r.top <= zone.top)
    .sort((a, b) => b.candles.length - a.candles.length || a.center - b.center)[0];

  const band = SHIELD_PROXIMITY_PIPS * pipValue;
  const shield = rungs
    .filter((r) =>
      zone.type === 'DEMAND'
        ? r.center > zone.top && r.center <= zone.top + band
        : r.center >= zone.bottom - band && r.center < zone.bottom,
    )
    .sort((a, b) =>
      zone.type === 'DEMAND'
        ? a.center - b.center
        : b.center - a.center || a.center - b.center,
    )[0];

  const links: LiquidityLink[] = [];
  if (nested) links.push(mk(nested, 'NESTED'));
  if (shield) links.push(mk(shield, 'SHIELD'));
  return links;
}

/**
 * Stamp every zone in model.zones with its full pressure state (in place —
 * the model is locally constructed; the computation is pure from the bars
 * → deterministic and idempotent: calling twice yields identical state).
 *
 * S/D zones: mitigationCount = reactionEvents.length (battles, canon);
 * lifecycle from classifyLifecycle; pierced = any battle closed beyond
 * the far edge or freshness VIOLATED; liquidity = the NESTED/SHIELD
 * links with their eaten state; absorption = ABSORBED when the primary
 * fuel (NESTED, else SHIELD) is eaten; shieldZoneId = the SHIELD rungId.
 *
 * LMV-bridge zones (id 'LMV|…'): mitigationCount = the rung's candle
 * count (touches, NOT battles — the LMV lane is bar-granular, index.ts:347);
 * lifecycle = 'VIRGIN' by convention (the consumption state lives in
 * absorption, not the battle lifecycle); pierced = false (a sweep ≠ a
 * pierce of the zone); liquidity = [].
 */
export function stampZonePressureStates(model: ChartModel, bars: OHLCBar[]): void {
  const pipValue = PIP_VALUE[model.pair] ?? PIP_VALUE_DEFAULT;
  const anchorMs = model.anchor.anchorMs;
  const rungs = [...(model.lmv?.table ?? [])].sort((a, b) => a.center - b.center);
  const rungById = new Map<string, LqzZoneMatrix>(
    rungs.map((r) => [rungId(model.pair, r), r]),
  );

  for (const zone of model.zones) {
    if (zone.id.startsWith('LMV|')) {
      const rung = rungById.get(zone.id);
      const e = rung ? computeRungEaten(rung, bars, anchorMs, pipValue) : { eaten: false };
      zone.pressure = {
        mitigationCount: rung ? rung.candles.length : 0,
        lifecycle: 'VIRGIN',
        pierced: false,
        absorption: e.eaten ? 'ABSORBED' : 'INTACT',
        liquidity: [],
      };
      continue;
    }

    const events = zone.reactionEvents;
    const pierced =
      zone.freshness === 'VIOLATED' || events.some((ev) => ev.pierced);
    const liquidity = computeLiquidityLinks(
      zone, rungs, model.pair, pipValue, bars, anchorMs,
    );
    const primary =
      liquidity.find((l) => l.kind === 'NESTED') ??
      liquidity.find((l) => l.kind === 'SHIELD');
    zone.pressure = {
      mitigationCount: events.length,
      lifecycle: classifyLifecycle(events, zone.freshness),
      pierced,
      absorption: primary && primary.eaten ? 'ABSORBED' : 'INTACT',
      liquidity,
    };
    const shield = liquidity.find((l) => l.kind === 'SHIELD');
    if (shield) zone.shieldZoneId = shield.rungId;
    else delete zone.shieldZoneId;
  }
}

/**
 * The zone-relevance function: WHICH structure currently defends a trade
 * entering at entryZoneId.
 *
 * The doctrine (the operator's trade #2/#4 switch — the SAME EU demand
 * zone with the SAME nested LQZ): Monday, fuel INTACT → the LQZ defends
 * first (SHIELD_FUEL — the SL anchors to the LQZ's far edge); Wednesday,
 * fuel ABSORBED ("all the bullish pressure from the demand zone is
 * absorbed") → the S/D zone itself is the operative defense
 * (PRESSURE_STRUCTURE — the SL anchors to the zone's own far edge). The
 * asOfMs parameter reproduces this transition from the data.
 *
 * nextStep = the adverse-side ladder beyond the defense (SHORT → the next
 * zone up; LONG → the next zone down), skipping BROKEN zones.
 * Null only when the entry zone id is absent from the model.
 */
export function computeOperativeDefense(
  model: ChartModel,
  entryZoneId: string,
  direction: 'LONG' | 'SHORT',
  asOfMs?: number,
): OperativeDefense | null {
  const zone = model.zones.find((z) => z.id === entryZoneId);
  if (!zone) return null;

  const links = zone.pressure?.liquidity ?? [];
  const fuel =
    links.find((l) => l.kind === 'NESTED') ??
    links.find((l) => l.kind === 'SHIELD');
  const asOf = asOfMs ?? model.anchor.anchorMs;
  // eaten-as-of-T ⟺ the last consumption ≤ T post-dates the last defense
  // (a defense AFTER a consumption re-establishes the fuel — the re-fuel).
  const fuelEaten =
    !!fuel &&
    fuel.eatenAtMs !== undefined &&
    fuel.eatenAtMs <= asOf &&
    fuel.eatenAtMs > (fuel.defendedAtMs ?? 0);

  let defense: ZoneModel = zone;
  let defenseKind: 'SHIELD_FUEL' | 'PRESSURE_STRUCTURE' = 'PRESSURE_STRUCTURE';
  if (fuel && !fuelEaten) {
    const rungZone = model.zones.find((z) => z.id === fuel.rungId);
    if (rungZone) {
      defense = rungZone;
      defenseKind = 'SHIELD_FUEL';
    }
  }

  const adverse =
    direction === 'SHORT'
      ? model.zones
          .filter((z) => z.bottom > defense.top)
          .sort((a, b) => a.bottom - b.bottom)
      : model.zones
          .filter((z) => z.top < defense.bottom)
          .sort((a, b) => b.top - a.top);
  const nextStep = adverse.find(
    (z) => z.id !== defense.id && z.pressure?.lifecycle !== 'BROKEN',
  );

  const rung = fuel
    ? (model.lmv?.table ?? []).find(
        (r) => rungId(model.pair, r) === fuel.rungId,
      )
    : undefined;
  const farEdge = rung
    ? rung.side === 'BUY_SIDE'
      ? rung.bottom
      : rung.top
    : undefined;
  const ladderSide = direction === 'SHORT' ? 'up' : 'down';
  const nextStr = nextStep
    ? `; next step ${ladderSide}: ${nextStep.id}`
    : `; no next step ${ladderSide}`;

  let reason: string;
  if (fuel && fuelEaten) {
    reason =
      `entry zone ${zone.id}'s ${fuel.kind} fuel ${fuel.rungId} eaten at ` +
      `${fuel.eatenAtMs}` +
      (farEdge !== undefined ? ` (the candles closed through ${farEdge})` : '') +
      ` → defense moved to the zone itself (PRESSURE_STRUCTURE)${nextStr}`;
  } else if (fuel) {
    reason =
      `entry zone ${zone.id}'s ${fuel.kind} fuel ${fuel.rungId} INTACT as of ` +
      `${asOf} → the fuel defends first (SHIELD_FUEL): defense = ${defense.id} ` +
      `[${defense.bottom}-${defense.top}]${nextStr}`;
  } else {
    reason =
      `entry zone ${zone.id} carries no liquidity link → the zone itself is ` +
      `the operative defense (PRESSURE_STRUCTURE)${nextStr}`;
  }

  return {
    entryStep: zone,
    defense,
    defenseKind,
    ...(nextStep ? { nextStep } : {}),
    reason,
  };
}
