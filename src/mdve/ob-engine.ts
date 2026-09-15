/**
 * MDVE OB Engine — the multi-TF order-block driver (PLUTUS_V4.4_MDVE_SPEC §6.1).
 *
 * ═══════════════════════════════════════════════════════════════
 * Detection strategy per timeframe (v4.4.1):
 *   4H — the frozen canon construct4HZones (WRAPPED, never rewritten —
 *        §12 Law 4). The canon's 50-pips/3-trading-days singular-origin
 *        detection is CALIBRATED for the 4H scale and finds the 4H BoM
 *        supply correctly.
 *   1H / 30m — MDVE's OWN detector (detectTfOrderBlocks). The canon is
 *        structurally blind at these TFs on real data: its recent-window
 *        truncation (canon maxBars = 120 1H bars ≈ 5 trading days) cuts
 *        prior-week formations, and its 50-pip/3-day displacement floor
 *        is a 4H-scale threshold — a 1H order block precedes a 1H-SCALE
 *        move (~30 pips over 1-2 trading days), which the canon gate
 *        rejects. The detector below is the same DOCTRINE at the correct
 *        scale: the OB is the last opposite-color candle before a
 *        displacement leg; zone = [ob.low, ob.high]; a bull leg implies
 *        a DEMAND base, a bear leg a SUPPLY base.
 *
 * MDVE extensions on top of detection (both paths):
 *   1. Multi-TF as first-class: 4H + 1H + 30m run ALWAYS, co-equal
 *      citizens of the zone map (§6.1.1).
 *   2. formationMs on every zone — the OB candle's timestamp (§6.1.3;
 *      the mirror engine's matching key, §9.2).
 *   3. The formal piecewise-total BoM/MoM classifier (§6.3 — bom-mom.ts).
 *   4. The explicit freshness recurrence (§6.4 — freshness.ts).
 *   5. Deterministic zone ids: `${pair}|${tf}|${obTimestamp}|${floor}`
 *      (§5 ZoneModel.id) — the canon lobe's wall-clock id suffix is
 *      discarded (§12 Law 2: same bars → byte-identical model).
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar } from '../types.js';
import { ZoneType } from '../types.js';
import { construct4HZones, TF_CONSTRUCTION_PARAMS } from '../brains/4h-sd-lobe.js';
import { SINGULAR_CANDLE } from '../constants/trading-constants.js';
import type { PillarResult } from '../brains/9-pillar-lobe.js';
import type { ZoneModel } from './types.js';
import { classifyBoMMoM } from './bom-mom.js';
import { extractReactionEvents, runFreshnessMachine, zfpFromState } from './freshness.js';
import { priceDecimals } from './util.js';
import { buildObcv } from './obcv.js';
import type { ObZone } from './obcv.js';

/** The MDVE zone timeframes (§6.1.1 — 4H + 1H + 30m ALWAYS). */
export const MDVE_TIMEFRAMES = ['4H', '1H', '30m'] as const;
export type MdveTimeframe = (typeof MDVE_TIMEFRAMES)[number];

// ═══════════════════════════════════════════════════════════════════════════════
// MDVE 1H/30m DETECTION PARAMS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

interface TfObParams {
  /** Detection lookback in bars (the structural horizon of the TF). */
  lookbackBars: number;
  /** Minimum forward displacement that proves the leg (pips). */
  minMovePips: number;
  /** Window over which the displacement must complete (bars). */
  moveWindowBars: number;
  /** Zone width ceiling (pips) — a wider candle's range is not a refined OB. */
  maxZoneWidthPips: number;
}

const MDVE_TF_OB_PARAMS: Record<'1H' | '30m', TfObParams> = {
  '1H': {
    /**
     * Lookback 300 bars ≈ 12.5 trading days (2.5 weeks).
     * BECAUSE: a 1H order block's structural relevance horizon is the
     * prior WEEKS, not the prior days — the operator's 1H BoM/MoM zones
     * form at the prior week's sweep origins and mid-rally shelves. The
     * canon's 120-bar window (≈ 5 trading days) structurally cannot see
     * them; ~2.5 weeks covers the formation plus the rally that proves it.
     */
    lookbackBars: 300,
    /**
     * Displacement floor 30 pips over 36 bars (≈ 1.5 trading days).
     * BECAUSE: a 1H order block precedes a 1H-SCALE move — on an FX
     * index the 1H swing scale is tens of pips over 1-2 sessions, not
     * the canon's 4H-scale 50 pips over 3 days (SINGULAR_CANDLE).
     * 30 pips / 1.5 days is the 4H doctrine re-scaled to the TF whose
     * structure is being detected (canon Law 2: TF-scaled construction).
     */
    minMovePips: 30,
    moveWindowBars: 36,
    /**
     * Width ceiling 25 pips — canon TF_CONSTRUCTION_PARAMS['1H']
     * (4h-sd-lobe.ts:66), cited not imported: the value is canon and the
     * lobe is frozen.
     */
    maxZoneWidthPips: 25,
  },
  '30m': {
    /**
     * Lookback 576 bars ≈ 12 trading days — the SAME time horizon as the
     * 1H window, expressed in 30m bars (canon Law 2: equal doctrine,
     * TF-scaled bar counts).
     */
    lookbackBars: 576,
    /**
     * Displacement floor 20 pips over 48 bars (≈ 1 trading day).
     * BECAUSE: a 30m order block precedes a SESSION-scale leg — finer
     * timeframe, finer structural scale (the same re-scaling doctrine
     * as the 1H params).
     */
    minMovePips: 20,
    moveWindowBars: 48,
    /** Width ceiling 15 pips — canon TF_CONSTRUCTION_PARAMS['30m']
     *  (4h-sd-lobe.ts:67), cited. */
    maxZoneWidthPips: 15,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MDVE 1H/30m ORDER-BLOCK DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/** A detected OB candidate, in the LOOKBACK WINDOW's index space. */
interface RawOb {
  obIndex: number;
  floor: number;
  ceiling: number;
  type: 'SUPPLY' | 'DEMAND';
}

/**
 * detectTfOrderBlocks — MDVE's native 1H/30m detector.
 *
 * The doctrine (canon singular-origin, re-scaled): an order block is the
 * LAST opposite-color candle before a displacement leg. A candidate is a
 * bear candle (for demand) / bull candle (for supply) whose forward
 * displacement — the maximum excursion of the following
 * `moveWindowBars` bars from the candidate's close — reaches
 * `minMovePips`. Contiguous qualifying candles form ONE base (a
 * multi-bar base is one origin, canon event-granularity); the base's OB
 * is its LAST candle — the candle immediately before the leg.
 *
 * Total: any bar set (including empty/flat) yields a list (possibly
 * empty) — flat data has zero displacement, so zero candidates.
 */
function detectTfOrderBlocks(
  bars: OHLCBar[],
  params: TfObParams,
  pipValue: number,
): RawOb[] {
  const minMove = params.minMovePips * pipValue;
  const maxWidth = params.maxZoneWidthPips * pipValue;
  const zones: RawOb[] = [];

  for (const direction of ['bull', 'bear'] as const) {
    let runLast = -1; // last qualifying candle of the current contiguous run
    const flush = (): void => {
      if (runLast < 0) return;
      const ob = bars[runLast]!;
      if (ob.high - ob.low <= maxWidth) {
        zones.push({
          obIndex: runLast,
          floor: ob.low,
          ceiling: ob.high,
          type: direction === 'bull' ? 'DEMAND' : 'SUPPLY',
        });
      }
      runLast = -1;
    };

    for (let i = 0; i < bars.length; i++) {
      const b = bars[i]!;
      const opposite = direction === 'bull' ? b.close < b.open : b.close > b.open;
      let qualifies = false;
      if (opposite) {
        let displacement = 0;
        const end = Math.min(bars.length, i + 1 + params.moveWindowBars);
        for (let j = i + 1; j < end; j++) {
          if (direction === 'bull') {
            const d = bars[j]!.high - b.close;
            if (d > displacement) displacement = d;
          } else {
            const d = b.close - bars[j]!.low;
            if (d > displacement) displacement = d;
          }
        }
        qualifies = displacement >= minMove;
      }
      if (qualifies) {
        runLast = i; // extend the run — the LAST qualifying candle is the OB
      } else {
        flush();
      }
    }
    flush();
  }

  return zones;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE DRIVER
// ═══════════════════════════════════════════════════════════════════════════════

export interface ObEngineInput {
  pair: string;
  spot: number;
  pipValue: number;
  barsByTf: Record<MdveTimeframe, OHLCBar[]>;
  /**
   * 9-pillar result for per-zone confluence (count of pillar levels inside
   * the zone). Absent → confluence 0 (§12 Law 3: no invented truth).
   */
  pillarResult?: PillarResult;
}

/** Assemble a ZoneModel from a detected OB (shared by both detection paths). */
function assembleZone(input: {
  pair: string;
  tf: MdveTimeframe;
  windowBars: OHLCBar[];
  obIndex: number;
  floor: number;
  ceiling: number;
  type: 'SUPPLY' | 'DEMAND';
  moveWindowBars: number;
  minMovePrice: number;
  pillarResult?: PillarResult;
}): ZoneModel {
  const { pair, tf, windowBars, obIndex, floor, ceiling, type, pillarResult } = input;
  const ob = windowBars[obIndex]!;
  const formationMs = ob.timestamp;
  const direction = type === 'DEMAND' ? 'bull' : 'bear';

  // §6.3 formal classifier — TF-scaled window + displacement (the same
  // scale the detection used: classification must judge the move at the
  // TF's own structural scale, not the canon's 4H scale).
  const classification = classifyBoMMoM({
    bars: windowBars,
    obIndex,
    direction,
    moveWindowBars: input.moveWindowBars,
    minMovePrice: input.minMovePrice,
    // W6 (the §2.7.5 — the M-6 kill): the source timeframe rides the input —
    // the 30m/15m-is-never-a-BoM-origin telescoping law is folded INSIDE the
    // classifier's branch order (bom-mom.ts:118 — the ONE copy). The two
    // belt-and-suspenders forces (ob-engine.ts:399/:459) are REMOVED.
    timeframe: tf,
  });

  // §6.4 freshness recurrence over event-granularity retests, scanned
  // from the bar after the OB candle.
  const reactionEvents = extractReactionEvents(
    windowBars,
    obIndex + 1,
    floor,
    ceiling,
    type === 'DEMAND' ? 'demand' : 'supply',
  );
  const freshness = runFreshnessMachine(reactionEvents);
  const zfp = zfpFromState(classification, freshness);

  const confluence = pillarResult
    ? pillarResult.levels.filter((l) => l.price >= floor && l.price <= ceiling).length
    : 0;

  return {
    // §5 id — deterministic: pair | tf | OB candle timestamp | floor.
    id: `${pair}|${tf}|${formationMs}|${floor.toFixed(priceDecimals(pair))}`,
    type,
    top: ceiling,
    bottom: floor,
    timeframe: tf,
    classification,
    formationMs,
    freshness,
    reactionEvents,
    zfp,
    confluence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBCV LANE BRIDGE (Phase 4, operator 2026-07-31)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * obZoneToZoneModel — bridge an OBCV ObZone into the MDVE ZoneModel shape.
 *
 * Field-fidelity (the REAL ZoneModel interface, types.ts:131-149):
 *   - `id/type/top/bottom/timeframe/classification/formationMs/zfp` — direct
 *     pass-through. The ObZone carries the deterministic
 *     `OB|pair|tf|originMs|floor` id namespace; ZoneModel.timeframe
 *     ('4H'|'1H'|'30m'|'15m') accepts ObcvTf ('4H'|'1H'|'30m').
 *   - `freshness: 'FRESH'` — the OBCV lane runs no §6.4 recurrence (the same
 *     reduction as the LMV bridge, index.ts:361-362); FRESH is the group-0
 *     alive state that keeps the zone admissible to the mirror engine.
 *   - `reactionEvents: []` — the OBCV machine is displacement-field + origin-
 *     matrix detection, not event-granular battle extraction; synthesizing
 *     ReactionEvents would fabricate canon structure (§12 Law 3 — honest
 *     emptiness).
 *   - `confluence: 0` — no 9-pillar data on the OBCV lane (§12 Law 3).
 *   - `ObZone.parent` (a parent zone ID STRING) is NOT mapped to
 *     `ZoneModel.parent` (a ZoneModel OBJECT, types.ts:148) — a type and
 *     semantics mismatch; the T2/T3 nesting passes own the telescoping links
 *     (and set nestedWithin from containment, not from ObZone.parent).
 *   - `center` is NOT emitted — ZoneModel has no such field (the phase sketch's
 *     `center: (top + bottom) / 2` line is dropped: "include only existing
 *     fields").
 *   - `originIdx/bw/bf/prior` are OBCV-internal provenance — not ZoneModel
 *     fields; the provenance survives in the id namespace.
 */
function obZoneToZoneModel(z: ObZone): ZoneModel {
  return {
    id: z.id,
    type: z.type,
    top: z.top,
    bottom: z.bottom,
    timeframe: z.timeframe,
    classification: z.classification,
    formationMs: z.formationMs,
    freshness: 'FRESH',   // OBCV lane: no §6.4 recurrence — always admissible
    reactionEvents: [],   // honest emptiness (§12 Law 3)
    zfp: z.zfp,
    confluence: 0,        // no pillar data on the OBCV lane (§12 Law 3)
  };
}

/**
 * Build the MDVE zone map: 4H canon detection (wrapped) + MDVE native
 * 1H/30m detection, each zone re-classified by the formal §6.3 anatomy
 * classifier, freshness-computed by the §6.4 recurrence, and stamped
 * with a deterministic id + formationMs.
 *
 * Total: any bar set (including empty) produces a zone list (possibly
 * empty).
 */
export function buildZoneMap(input: ObEngineInput): ZoneModel[] {
  const { pair, spot, pipValue, barsByTf, pillarResult } = input;
  const zones: ZoneModel[] = [];

  for (const tf of MDVE_TIMEFRAMES) {
    const bars = barsByTf[tf] ?? [];

    if (tf === '4H') {
      // ── CANON PATH (WRAPPED — the lobe is NOT modified) ──
      const canonZones = construct4HZones({ bars, instrument: pair, spot, pipValue, timeframe: tf });
      const tfParams = TF_CONSTRUCTION_PARAMS[tf] ?? TF_CONSTRUCTION_PARAMS['4H']!;
      const recentBars = bars.length > tfParams.maxBars
        ? bars.slice(bars.length - tfParams.maxBars)
        : bars;
      const barsPerDay = SINGULAR_CANDLE.BARS_PER_DAY[tf] ?? SINGULAR_CANDLE.BARS_PER_DAY['4H']!;
      const moveWindowBars = barsPerDay * SINGULAR_CANDLE.MIN_MOVE_TRADING_DAYS;
      const minMovePrice = SINGULAR_CANDLE.MIN_MOVE_PIPS * pipValue;

      for (const z of canonZones) {
        const formationMs = z.createdAt;
        const obIndex = recentBars.findIndex((b) => b.timestamp === formationMs);
        const type: 'SUPPLY' | 'DEMAND' =
          z.type === ZoneType.BOM_SUPPLY || z.type === ZoneType.MOM_SUPPLY ? 'SUPPLY' : 'DEMAND';

        if (obIndex < 0) {
          // OB candle unrecoverable (degenerate — never expected): keep the
          // canon's own verdict with an empty event scan (honest, total).
          const classification = z.isBoM ? 'BoM' : 'MoM';
          const freshness = runFreshnessMachine([]);
          zones.push({
            id: `${pair}|${tf}|${formationMs}|${z.floor.toFixed(priceDecimals(pair))}`,
            type,
            top: z.ceiling,
            bottom: z.floor,
            timeframe: tf,
            classification,
            formationMs,
            freshness,
            reactionEvents: [],
            zfp: zfpFromState(classification, freshness),
            confluence: 0,
          });
          continue;
        }
        zones.push(assembleZone({
          pair, tf, windowBars: recentBars, obIndex,
          floor: z.floor, ceiling: z.ceiling, type,
          moveWindowBars, minMovePrice, pillarResult,
        }));
      }
      continue;
    }

    // ── MDVE NATIVE PATH (1H / 30m) ──
    const params = MDVE_TF_OB_PARAMS[tf];
    const windowBars = bars.length > params.lookbackBars
      ? bars.slice(bars.length - params.lookbackBars)
      : bars;
    const minMovePrice = params.minMovePips * pipValue;
    for (const raw of detectTfOrderBlocks(windowBars, params, pipValue)) {
      const zone = assembleZone({
        pair, tf, windowBars,
        obIndex: raw.obIndex, floor: raw.floor, ceiling: raw.ceiling, type: raw.type,
        moveWindowBars: params.moveWindowBars, minMovePrice, pillarResult,
      });
      // W6 (the §2.7.5 — the M-6 kill): the T4 30m-is-never-a-BoM-origin force
      // was REMOVED — assembleZone now passes `timeframe: tf` (ob-engine.ts:233)
      // and the classifier's OWN branch order folds the law (bom-mom.ts:118 —
      // the ONE copy). A 30m BoM-shaped OB still classifies MoM via the
      // classifier's timeframe gate — the behavior is unchanged, the copies die.
      zones.push(zone);
    }
  }

  // ── OBCV (Phase 4, operator 2026-07-31): the Order Block Candle Vision machine —
  //    every BoM/MoM order block from the displacement field + origin-candle
  //    matrix + prior-move classifier + telescoping incidence. Supplements
  //    detectTfOrderBlocks (the OBCV zones are the deterministic, MPSE-clean OB
  //    source; both lanes coexist — dedup by id). ──
  //
  //    anchorMs: ObEngineInput does not carry it (index.ts derives it for the
  //    narrative). Derive it deterministically HERE — the latest bar timestamp
  //    across all timeframes (the same "last available bar" fallback index.ts:157
  //    uses). Same bars → same anchor (§12 Law 2); empty bars → 0 → empty OBCV
  //    zones (total).
  let obcvAnchorMs = 0;
  for (const tf of MDVE_TIMEFRAMES) {
    const tfBars = barsByTf[tf] ?? [];
    if (tfBars.length > 0) {
      const lastTs = tfBars[tfBars.length - 1]!.timestamp;
      if (lastTs > obcvAnchorMs) obcvAnchorMs = lastTs;
    }
  }
  const obcvZones = buildObcv({ barsByTf, anchorMs: obcvAnchorMs, pair, pipValue });

  // Convert + append BEFORE the T2/T3 nesting passes — the nesting applies to the
  // OBCV zones too (a 1H OBCV BoM inside a 4H zone gets '1H Refined 4H'; a 30m
  // OBCV MoM inside a 1H zone gets '30m Refined 1H'). Dedup by id: the
  // `OB|pair|tf|originMs|floor` namespace is unique and the native lane's
  // `${pair}|${tf}|${formationMs}|${floor}` namespace never collides — the guard
  // is belt+suspenders (and is total against duplicates WITHIN the OBCV list).
  const existingZoneIds = new Set(zones.map((z) => z.id));
  for (const oz of obcvZones) {
    if (existingZoneIds.has(oz.id)) continue; // id collision — skip (never expected)
    const zone = obZoneToZoneModel(oz);
    // Wave ZR-3.6 (2026-08-04 — the Law-14 data gap): the OBCV zones carried
    //    reactionEvents: [] + freshness FRESH ("honest emptiness") — every OB
    //    zone read VIRGIN/UM forever, so the Law-14 "price cannot teleport past
    //    UNMITIGATED zones" check misfired on heavily-traversed shelves (the
    //    Friday wall [100.803-100.937]: 42 in-week bars closed INSIDE it, 7
    //    BELOW — but 0 recorded events). The battles are REAL data in the bars —
    //    extract them exactly like the native lane (:243-250): the event-
    //    granularity machine reads the zone's own timeframe bars from the origin
    //    candle forward; the freshness + the zfp derive from the battles (the
    //    native lane's zfpFromState). The E1 pressure state is now TRUE for the
    //    OBCV lane too (the ZR-1 full-pressure-state doctrine). ──
    const ozBars = barsByTf[oz.timeframe] ?? [];
    if (ozBars.length > 0 && oz.originIdx >= 0 && oz.originIdx < ozBars.length) {
      const ozEvents = extractReactionEvents(
        ozBars, oz.originIdx, zone.bottom, zone.top,
        zone.type === 'DEMAND' ? 'demand' : 'supply',
      );
      zone.reactionEvents = ozEvents;
      zone.freshness = runFreshnessMachine(ozEvents);
      zone.zfp = zfpFromState(zone.classification, zone.freshness);
    }
    // W6 (the §2.7.5 — the M-6 kill): the T4 30m-is-never-a-BoM-origin force
    // was REMOVED — the OBCV machine ALREADY rejects 30m BoM (orphan rule +
    // prior-move classifier — its own classification is 'MoM' for 30m). The
    // belt-and-suspenders copy dies; the behavior is unchanged.
    zones.push(zone);
    existingZoneIds.add(oz.id);
  }

  // ── T2: 4H→1H telescoping nesting (operator 2026-07-31) — a 1H zone entirely
  //    inside a same-type 4H zone is a REFINEMENT, not a separate zone. Tag the
  //    1H child, link the parent id, stamp the child as the parent's finer
  //    edge, and boost the parent's confluence (dual-TF bonus, Law 32, cap 14). ──
  for (const z1 of zones.filter(z => z.timeframe === '1H')) {
    for (const z4 of zones.filter(z => z.timeframe === '4H')) {
      if (z1.type !== z4.type) continue;                       // same-type only (SUPPLY|DEMAND)
      if (z1.bottom >= z4.bottom && z1.top <= z4.top) {        // containment: [z1] ⊆ [z4]
        z1.refinedLabel = '1H Refined 4H';
        z1.nestedWithin = z4.id;
        z4.refinedBy = z1.id;                                  // the finer edge wins for entry
        z4.confluence = Math.min(14, (z4.confluence ?? 0) + 3); // dual-TF bonus (Law 32, cap 14)
        break;
      }
    }
    // no parent found → z1 is an INDEPENDENT top-level zone (kept as-is)
  }

  // ── T3: 1H→30m minor refinement (operator 2026-07-31 — CME §1.3 T3 verbatim:
  //    "30m zones entirely within a 1H zone (same type) refine the 1H zone's
  //    minor edge; tag '30m Refined 1H'"). A 30m zone inside a same-type 1H
  //    zone refines the 1H zone's MINOR edge (the operator's telescoping
  //    doctrine: "S/D zones are charted on 4H and refined down to 1H, also can
  //    be charted on 1H and refined down to 30m — nested S/D zones can exist").
  //    The 30m zone is KEPT with its refinement tag + the telescoping parent
  //    link (Phase 4). The completion adds the two doctrine effects the E1
  //    telescoping acceptance requires: (a) the parent's minor edge refines
  //    toward the 30m edge, and (b) the parent's confluence gains the dual-TF
  //    +3 / triple-TF +5 bonus (Law 32, cap 14).
  //
  //    Phase 1 — the CONTAINMENT pass (against the parents' UNMUTATED
  //    geometry): tag every 30m child + record the parent link. The edge
  //    refinement is deferred to Phase 2 so a tightened parent can NEVER
  //    invalidate a sibling child's containment mid-iteration.
  const t3ChildrenByParent = new Map<string, ZoneModel[]>();
  for (const z30 of zones.filter(z => z.timeframe === '30m')) {
    const parent = zones.find(z => z.timeframe === '1H' && z.type === z30.type
                                && z30.bottom >= z.bottom && z30.top <= z.top);
    if (parent) {
      z30.refinedLabel = '30m Refined 1H';
      z30.nestedWithin = parent.id;
      z30.parent = parent;
      const children = t3ChildrenByParent.get(parent.id);
      if (children) children.push(z30);
      else t3ChildrenByParent.set(parent.id, [z30]);
    }
    // NO parent → the zone remains (it may be a top-level 30m MoM reaction point — still valid)
  }
  // Phase 2 — the PARENT-SIDE refinement (applied once per parent, AFTER all
  // containment tests). The MINOR edge = the edge OPPOSITE the operative
  // (active) edge — the SUPPLY's floor (its operative edge is the ceiling —
  // price attacks from below) and the DEMAND's ceiling (its operative edge is
  // the floor). It tightens TOWARD the nested 30m edge (the SUPPLY floor moves
  // UP to the most-refined nested 30m floor; the DEMAND ceiling moves DOWN to
  // the most-refined nested 30m ceiling — the tightest child edge wins, the
  // most precise minor boundary). The telescoping confluence bonus follows:
  // dual-TF (1H + 30m) +3; triple-TF (4H + 1H + 30m) +5 when the 1H parent is
  // ITSELF the 4H→1H refinement (tagged '1H Refined 4H' by the T2 pass) —
  // Math.min cap 14 (the same Law-32 cap the T2 pass uses).
  for (const [parentId, children] of t3ChildrenByParent) {
    const parent = zones.find(z => z.id === parentId);
    if (!parent) continue; // never expected — the children reference a live parent
    if (parent.type === 'SUPPLY') {
      const refinedFloor = Math.max(...children.map(c => c.bottom));
      if (refinedFloor > parent.bottom) parent.bottom = refinedFloor;
    } else {
      const refinedCeiling = Math.min(...children.map(c => c.top));
      if (refinedCeiling < parent.top) parent.top = refinedCeiling;
    }
    const isTripleTf = parent.refinedLabel === '1H Refined 4H';
    parent.confluence = Math.min(14, (parent.confluence ?? 0) + (isTripleTf ? 5 : 3));
  }

  // Deterministic output order: timeframe (4H→1H→30m), then price ascending.
  const tfOrder: Record<string, number> = { '4H': 0, '1H': 1, '30m': 2 };
  zones.sort((a, b) =>
    (tfOrder[a.timeframe]! - tfOrder[b.timeframe]!) ||
    (a.bottom - b.bottom) ||
    (a.formationMs - b.formationMs),
  );

  return zones;
}
