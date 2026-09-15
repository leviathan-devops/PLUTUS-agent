/**
 * MDVE + MIRROR PIPELINE STAGE — the deterministic v4.4 lane inside the
 * 5-tool pipeline (PLUTUS_V4.4_MDVE_SPEC §8 source lane + §9 mirror cascade
 * + §8.1 structural-anchor gate + §11 mirror-floor contract).
 *
 * ═══════════════════════════════════════════════════════════════
 * ADDITIVE BY LAW: this stage sits ON TOP of the emergent lane. It never
 * modifies the frozen machinery (visual-setup-generator.ts,
 * ladder-scaffold.ts, canon lobes) and it never gates the report: if ANY
 * part of the MDVE stage is unavailable or throws, the caller falls back
 * to emergent-only output (the VEI fail-safe philosophy — log prominently,
 * never silently pass, never break the report).
 *
 * Zero pixels, zero LLM (§12 Law 1). Deterministic (§12 Law 2): same
 * harvested bars → byte-identical stage output. The stage consumes ONLY
 * the bars already in the pipeline ctx — it never re-fetches.
 *
 * The lane split (§9.4):
 *   FLOOR   = DXY source setups (§8) + EU/GU ACTIVE mirrors (§9.6) — the
 *             doctrine's PRIMARY setups. EU/GU can NEVER have less than
 *             DXY minus documented casualties (§11).
 *   SURPLUS = the emergent generator's setups AFTER the §8.1 anchor gate
 *             (structural anchors ONLY — ORDER_BLOCK-derived or LQZ;
 *             passive pillar levels PIVOT/MA/OPTION_WALL/FIB_RETRACE/
 *             SWING_EXTREME are rungs/SL-TP anchors/confluence, NEVER
 *             entries — the DXY=39 slop-killer).
 *   MERGE   = floor + surplus, deduped by the corrected identity (§8.4:
 *             same zone + same day + same session = same trade).
 * ═══════════════════════════════════════════════════════════════
 */

import type { OHLCBar, TradeSetup } from '../types.js';
import { PIP_VALUE } from '../types.js';
import {
  ConfidenceTier,
  SessionWindow,
  SetupCategory,
  ShapeCode,
  TradeDirection,
  ZoneType,
} from '../types.js';
import type { PillarResult } from '../brains/9-pillar-lobe.js';
import type { ScaffoldRung } from '../engines/ladder-scaffold.js';
import {
  buildChartModel,
  cascade,
  cascadeV45,
  checkMirrorFloor,
  checkMirrorFloorV45,
  generateSourceSetups,
  generateSourceSetupsV45,
  isValidEntryAnchor,
  narrativeAligned,
  sessionOf,
  structurallyValid,
} from '../mdve/index.js';
import type {
  ChartModel,
  MirrorCascadeResult,
  MirrorCascadeResultV45,
  MirrorOutcome,
  MirrorOutcomeV45,
  SessionLabel,
} from '../mdve/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — every constant has a BECAUSE (§12 Law 5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The doctrine's golden weekly total: 8 DXY + 8 EU + 8 GU = 24 trades.
 * BECAUSE: the operator's gold-standard week (the 23-24 trade target) is
 * the f(T) firewall's reference load — the mirror cascade must account for
 * EVERY one of the 24: an ACTIVE trade or a DOCUMENTED casualty. The
 * firewall evaluates f(T) = |DXY.active| + |EU.active| + |GU.active| +
 * |documented casualties| ≥ GOLDEN_FLOOR_TOTAL − |casualties|.
 */
export const GOLDEN_FLOOR_TOTAL = 24;

/**
 * Structural entry-anchor rung sources (§8.1 ruling 1, verbatim):
 * `structural(zone) ⟺ zone.source ∈ {ORDER_BLOCK, LQZ}`. Mirrors the
 * mirror.ts STRUCTURAL_ENTRY_SOURCES set over ScaffoldRung.source space
 * (the emergent lane's anchor identity comes from scaffold rungs).
 */
const STRUCTURAL_RUNG_SOURCES: ReadonlySet<string> = new Set(['ORDER_BLOCK', 'LQZ']);

/**
 * Passive pillar-level rung sources — RETIRED from the entry pool (§8.1
 * ruling 1). They remain rungs, SL/TP anchors, Law-14 walk points and
 * confluence context — NEVER entries. (The DXY=39 evidence: all 39 slop
 * setups anchored on passive levels; the golden standard's 8 trades all
 * anchor on OB/LQZ.)
 */
const PASSIVE_RUNG_SOURCES: ReadonlySet<string> = new Set([
  'PIVOT', 'MA', 'OPTION_WALL', 'FIB_RETRACE', 'SWING_EXTREME',
]);

/**
 * Cross-lane merge entry tolerance = 3 pips.
 * BECAUSE: canon scaffold dedup tolerance (engine.ts SCAFFOLD_TOL =
 * 3 × pipValue) — two setups whose entries lie within the scaffold's own
 * dedup band, same pair/direction/day/session, are ONE trade.
 */
const MERGE_ENTRY_TOLERANCE_PIPS = 3;

/**
 * Display mapping SessionLabel → SessionWindow. REPLICATED from
 * setup-gen.ts:159-164 (module-private there — the frozen-module law:
 * replicate, never modify). DISPLAY-ONLY: the canonical session is the
 * SessionLabel carried in shapeTrigger/notes; nothing in the merge reads
 * this field's exact value beyond the dedup key.
 */
const SESSION_DISPLAY: Record<SessionLabel, SessionWindow> = {
  TOKYO: SessionWindow.LONDON_OPEN,
  LONDON: SessionWindow.LONDON_MID,
  NY: SessionWindow.NY_MID,
  OFF: SessionWindow.NY_CLOSE,
};

/** Weekday names for the day fallback (same convention as setup-gen). */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Weekday-name → day offset from weekStartMs (Monday = 0). */
const DAY_OFFSETS: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** The harvest slice the MDVE stage consumes (already anchor-filtered by Tool 1). */
export interface MdveHarvestSlice {
  ohlcByPairTf: Record<string, Record<string, OHLCBar[]>>;
  spots: Record<string, number>;
}

/** The pipeline-ctx projection the stage reads (never the whole ctx — minimal blast radius). */
export interface MdveStageContext {
  weekStart: string;
  harvestData: MdveHarvestSlice;
  scaffoldByPair: Record<string, ScaffoldRung[]> | null;
  chartModelsByPair: Record<string, ChartModel> | null;
}

/** A documented casualty (§11 temporal clause: every discard carries a reason, forever). */
export interface MirrorCasualty {
  pair: string;
  sourceSetupId: string;
  status: string;
  reason: string;
}

/** The mirror stage's full output (the floor + the firewall evidence). */
export interface MdveStageResult {
  /** false → fail-safe fallback (emergent-only); failureReason says why. */
  ran: boolean;
  failureReason?: string;
  /** The §8 DXY source setups (the cascade's source lane). */
  dxySource: TradeSetup[];
  /** The FLOOR: DXY source + EU/GU ACTIVE mirrors as TradeSetup[] (mirrorOf provenance on mirrors). */
  mirrorSetups: TradeSetup[];
  cascadeResult: MirrorCascadeResult | null;
  floor: { ok: boolean; violations: string[] } | null;
  casualties: MirrorCasualty[];
  failedAnchors: Array<{ sourceSetupId: string; targetPair: string; reason: string }>;
  /** The f(T) firewall + §11 mirror-floor evaluation lines (log verbatim). */
  firewallLog: string[];
}

/** One emergent setup's anchor-gate verdict (kept setups carry their classification in `log`). */
export interface AnchorGateVerdict {
  setup: TradeSetup;
  kept: boolean;
  /** The source→structural mapping path, e.g. "STRUCTURAL(ORDER_BLOCK) via rung DXY|ORDER_BLOCK|100.73". */
  classification: string;
  reason: string;
}

export interface AnchorGateResult2 {
  kept: TradeSetup[];
  dropped: AnchorGateVerdict[];
  log: string[];
}

/** The report-facing summary (consumed by md-report-generator Section 26). */
export interface MdveStageSummary {
  dxySourceCount: number;
  euActive: number;
  euConstructed: number;
  guActive: number;
  guConstructed: number;
  casualties: MirrorCasualty[];
  failedAnchors: Array<{ sourceSetupId: string; targetPair: string; reason: string }>;
  floorOk: boolean;
  floorViolations: string[];
  firewallLog: string[];
  emergentBefore: number;
  emergentAfterGate: number;
  passiveSlopDropped: number;
  duplicatesDropped: number;
  mergedTotal: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 0 — CHART MODEL CONSTRUCTION (the zones tool's MDVE half)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildChartModelsFromHarvest — build one ChartModel per pair from the
 * ALREADY-HARVESTED, already-anchor-filtered bars in the pipeline ctx.
 * NEVER re-fetches. Per-pair isolation: one pair's failure (e.g. spot = 0
 * on a thin feed) never kills the others, and never kills the zones tool —
 * the pair is simply absent from the returned map (honest emptiness, §12
 * Law 3) and the mirror stage declares itself unavailable downstream.
 *
 * @param harvest            ctx.harvestData projection (ohlcByPairTf + spots)
 * @param pillarResultByPair The zones tool's per-pair pillarEngine outputs
 * @param weekStart          ISO Monday 'YYYY-MM-DD'
 * @param pairs              Pair list (DXY, EUR/USD, GBP/USD [, AUD/USD])
 * @param logFn              Log sink (the engine's Logger.info)
 */
export function buildChartModelsFromHarvest(
  harvest: MdveHarvestSlice,
  pillarResultByPair: Record<string, PillarResult | undefined>,
  weekStart: string,
  pairs: string[],
  logFn: (msg: string) => void,
): Record<string, ChartModel> {
  const models: Record<string, ChartModel> = {};
  for (const pair of pairs) {
    try {
      const spot = harvest.spots[pair] ?? 0;
      if (!(spot > 0)) {
        logFn(`MDVE model ${pair}: SKIPPED — spot ${spot} (no honest model without a price)`);
        continue;
      }
      // Bars are ALREADY temporal-filtered by the harvest tool
      // (timestamp <= anchor + 60_000). 30m may be empty for old weeks —
      // buildChartModel handles sparse/empty TFs (totality, §5).
      models[pair] = buildChartModel(
        pair,
        weekStart,
        harvest.ohlcByPairTf[pair]?.['1H'] ?? [],
        harvest.ohlcByPairTf[pair]?.['4H'] ?? [],
        harvest.ohlcByPairTf[pair]?.['30m'] ?? [],
        spot,
        { pillarResult: pillarResultByPair[pair] },
        // Phase 2 T5: the 15m bars thread in as the LAST param
        // (index.ts:136 `bars15m?: OHLCBar[]`, after `options`). Empty 15m
        // feed → the 15m tier is skipped inside buildChartModel (index.ts:203
        // `bars15m && bars15m.length > 0`) — backward compatible.
        harvest.ohlcByPairTf[pair]?.['15m'] ?? [],
      );
      logFn(
        `MDVE model ${pair}: zones=${models[pair].zones.length} ` +
        `matrix=${models[pair].lqzMatrix.length} ladder=${models[pair].ladder.length} spot=${spot}`,
      );
    } catch (e) {
      logFn(`MDVE model ${pair}: FAILED (non-fatal — emergent lane unaffected): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return models;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 — MIRROR → TradeSetup CONVERSION (the floor's report identity)
// ═══════════════════════════════════════════════════════════════════════════════

/** Deterministic confidence from target-pair RRR (never wall-clock). */
function mirrorConfidence(rrr: number): number {
  return Math.min(95, 70 + Math.floor(rrr * 5));
}

function tierOf(confidence: number): ConfidenceTier {
  if (confidence >= 90) return ConfidenceTier.S;
  if (confidence >= 80) return ConfidenceTier.A;
  if (confidence >= 70) return ConfidenceTier.B;
  if (confidence >= 60) return ConfidenceTier.C;
  if (confidence >= 50) return ConfidenceTier.D;
  return ConfidenceTier.F;
}

/**
 * mirrorToTradeSetup — convert ONE ACTIVE MirrorOutcome into the report's
 * TradeSetup shape. Geometry comes EXCLUSIVELY from the mirror (the target
 * pair's own chart model — §9.3: the mirror maps STRUCTURE, never price
 * arithmetic). Provenance: `mirrorOf` = the chain root (the DXY source
 * setup id), carried on the setup AND in notes so the report can show it.
 *
 * Day: inherited from the DXY source setup (the cascade's temporal
 * identity chains to the source; §8.3 trade identity = (zone, reaction
 * time) and the mirror's reaction is the source's battle mapped across).
 * Fallback: the anchor zone's latest reaction event's weekday; final
 * fallback 'Monday' (a mirror with no temporal anchor anywhere is still
 * structurally real — the day is a display field).
 */
export function mirrorToTradeSetup(
  m: MirrorOutcome,
  models: { DXY: ChartModel; 'EUR/USD': ChartModel; 'GBP/USD': ChartModel },
  dxyById: Map<string, TradeSetup>,
): TradeSetup {
  const pair = m.pair;
  const pipValue = PIP_VALUE[pair] ?? 0.0001;
  const model = pair === 'EUR/USD' ? models['EUR/USD'] : models['GBP/USD'];
  const anchor = model.zones.find((z) => z.id === m.anchorZoneId);
  const mirrorOf = m.mirrorOf ?? m.sourceSetupId;

  // Day: source setup's day → anchor's latest reaction weekday → 'Monday'.
  let day = dxyById.get(m.sourceSetupId)?.day;
  if (!day && anchor && anchor.reactionEvents.length > 0) {
    let latest = anchor.reactionEvents[0]!;
    for (const ev of anchor.reactionEvents) {
      if (ev.lastTouchMs > latest.lastTouchMs) latest = ev;
    }
    day = WEEKDAYS[new Date(latest.lastTouchMs).getUTCDay()]!;
  }
  if (!day) day = 'Monday';

  const confidence = mirrorConfidence(m.rrr);
  const category = (Object.values(SetupCategory) as string[]).includes(m.category)
    ? (m.category as SetupCategory)
    : SetupCategory.HTF_SWING;
  const isBoM = anchor?.classification === 'BoM';

  return {
    setupId: `MIR-${pair}-${m.sourceSetupId}`.replace(/[^A-Za-z0-9]+/g, '_'),
    pair,
    direction: m.direction === 'LONG' ? TradeDirection.LONG : TradeDirection.SHORT,
    category,
    entry: m.entry,
    sl: m.sl,
    tp: m.tp,
    confidence,
    confidenceTier: tierOf(confidence),
    shapeAlignment: ShapeCode.SS, // range doctrine: zone edge → opposing zone edge (AP22)
    session: SESSION_DISPLAY[m.session ?? 'NY'],
    day,
    shapeTrigger: `MIRROR of ${mirrorOf} → ${pair} @ ${m.anchorZoneId} (${m.session ?? 'no-touch'})`,
    rrr: m.rrr,
    slPips: Math.abs(m.entry - m.sl) / pipValue,
    zoneName: m.anchorZoneId,
    isBoMEntry: isBoM,
    zoneType: isBoM
      ? (m.direction === 'LONG' ? ZoneType.BOM_DEMAND : ZoneType.BOM_SUPPLY)
      : (m.direction === 'LONG' ? ZoneType.MOM_DEMAND : ZoneType.MOM_SUPPLY),
    directionValidation: [],
    notes:
      `§9.6 MIRROR of ${mirrorOf} (source ${m.sourceSetupId}); ` +
      `anchor = ${pair}-native zone ${m.anchorZoneId}; ` +
      `SL ${m.slMethod}; TP Law-14 rung ${m.tpRungId ?? 'null'}; ` +
      `RRR ${m.rrr.toFixed(2)} recomputed on ${pair} geometry (single-entry — documented); ` +
      `session from ${pair}'s own reaction at the anchor: ${m.session ?? 'none (anchor untouched in window)'}`,
    mirrorOf,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — THE MIRROR STAGE (§8 source + §9.6 cascade + §11 floor + f(T))
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * runMirrorStage — the deterministic floor. NEVER throws for missing data:
 * unavailable → { ran: false, failureReason } and the caller falls back to
 * emergent-only output. Genuine exceptions propagate to the caller's
 * try/catch (the engine wraps this whole stage in the VEI fail-safe).
 */
export function runMirrorStage(ctx: MdveStageContext): MdveStageResult {
  const empty: MdveStageResult = {
    ran: false,
    dxySource: [],
    mirrorSetups: [],
    cascadeResult: null,
    floor: null,
    casualties: [],
    failedAnchors: [],
    firewallLog: [],
  };

  const models = ctx.chartModelsByPair;
  if (!models) {
    return { ...empty, failureReason: 'no chart models in ctx (zones tool MDVE stage did not run or failed)' };
  }
  const dxyModel = models['DXY'];
  const euModel = models['EUR/USD'];
  const guModel = models['GBP/USD'];
  if (!dxyModel || !euModel || !guModel) {
    const missing = ['DXY', 'EUR/USD', 'GBP/USD'].filter((p) => !models[p]);
    return { ...empty, failureReason: `chart models missing for [${missing.join(', ')}] — mirror cascade requires all three` };
  }

  // ── §8: the DXY source lane ──
  const dxySource = generateSourceSetups(dxyModel);
  const dxyById = new Map(dxySource.map((s) => [s.setupId, s]));

  // ── §9.6: the mirror cascade ──
  const cascadeModels = { DXY: dxyModel, 'EUR/USD': euModel, 'GBP/USD': guModel };
  const result = cascade(dxySource, cascadeModels);

  // ── §11: the mirror-floor contract ──
  const floor = checkMirrorFloor(result, dxySource.length);

  // ── The FLOOR as TradeSetup[]: DXY source (§8) + ACTIVE mirrors (§9.6) ──
  const activeMirrors = [...result.eu, ...result.gu].filter((m) => m.status === 'ACTIVE');
  const mirrorSetups: TradeSetup[] = [
    ...dxySource,
    ...activeMirrors.map((m) => mirrorToTradeSetup(m, cascadeModels, dxyById)),
  ];

  // ── Documented casualties (§11 temporal clause) ──
  const casualties: MirrorCasualty[] = result.discarded.map((m) => ({
    pair: m.pair,
    sourceSetupId: m.sourceSetupId,
    status: m.status,
    reason: m.discardReason ?? 'NO REASON LOGGED — §11 TEMPORAL VIOLATION',
  }));

  // ── f(T) FIREWALL — every one of the golden 24 accounted for ──
  const euActive = result.eu.filter((m) => m.status === 'ACTIVE').length;
  const guActive = result.gu.filter((m) => m.status === 'ACTIVE').length;
  const total = dxySource.length + euActive + guActive + casualties.length;
  const rhs = GOLDEN_FLOOR_TOTAL - casualties.length;
  const ftOk = total >= rhs;
  const firewallLog: string[] = [
    `[MDVE-F(T)] f(T) = |DXY.active|=${dxySource.length} + |EU.active|=${euActive} + |GU.active|=${guActive} ` +
      `+ |documented casualties|=${casualties.length} = ${total} ≥ ${GOLDEN_FLOOR_TOTAL} − ${casualties.length} = ${rhs} → ${ftOk ? 'OK' : 'VIOLATION'}`,
    `[MDVE-FLOOR] §11 checkMirrorFloor(result, ${dxySource.length}) → ${floor.ok ? 'OK' : 'VIOLATION'}`,
  ];
  for (const v of floor.violations) firewallLog.push(`  ${v}`);
  for (const c of casualties) firewallLog.push(`  [casualty:${c.status}] ${c.reason}`);
  for (const f of result.failedAnchors) firewallLog.push(`  [failed-anchor] ${f.sourceId} → ${f.targetPair}: ${f.reason}`);

  return {
    ran: true,
    dxySource,
    mirrorSetups,
    cascadeResult: result,
    floor,
    casualties,
    failedAnchors: result.failedAnchors.map((f) => ({
      sourceSetupId: f.sourceId,
      targetPair: f.targetPair,
      reason: f.reason,
    })),
    firewallLog,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — THE §8.1 ANCHOR GATE (the emergent lane's slop-killer)
// ═══════════════════════════════════════════════════════════════════════════════

/** Resolve the setup's trading day → that day's 1H bars (UTC day buckets from weekStartMs). */
function dayBarsFor(setup: TradeSetup, ctx: MdveStageContext): OHLCBar[] {
  const bars1H = ctx.harvestData.ohlcByPairTf[setup.pair]?.['1H'] ?? [];
  const weekStartMs = Date.parse(`${ctx.weekStart}T00:00:00Z`);
  if (!Number.isFinite(weekStartMs)) return [];
  let dayStartMs: number | null = null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(setup.day);
  if (iso) {
    dayStartMs = Date.parse(`${setup.day}T00:00:00Z`);
  } else {
    const offset = DAY_OFFSETS[setup.day.toLowerCase()];
    if (offset !== undefined) dayStartMs = weekStartMs + offset * 86_400_000;
  }
  if (dayStartMs === null || !Number.isFinite(dayStartMs)) return [];
  const dayEndMs = dayStartMs + 86_400_000;
  return bars1H.filter((b) => b.timestamp >= dayStartMs && b.timestamp < dayEndMs);
}

/** Normalize the setup's day field to a weekday name ('Monday'…), ISO input included. */
function weekdayOfSetup(setup: TradeSetup): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(setup.day)) {
    return WEEKDAYS[new Date(Date.parse(`${setup.day}T00:00:00Z`)).getUTCDay()]!;
  }
  const hit = Object.keys(DAY_OFFSETS).find((d) => d === setup.day.toLowerCase());
  return hit ? hit[0]!.toUpperCase() + hit.slice(1) : setup.day;
}

/**
 * The model's OWN battle record at the anchor on the setup's day (§6.2/§6.4
 * ground truth — event-granularity, computed with the model's full-lookback
 * ATR). A re-classification with a different ATR window CONTRADICTS this
 * record (measured: the matrix's Monday BODY_DEFEND+2×SWEEP at EU 1.14466
 * re-classifies PASS_THROUGH under a 24-bar day ATR) — the model's events
 * are canonical, never second-guessed.
 */
function modelBattleOnDay(events: ReadonlyArray<{ firstTouchMs: number; pierced: boolean }>, setup: TradeSetup): boolean {
  const want = weekdayOfSetup(setup);
  return events.some((ev) =>
    !ev.pierced && WEEKDAYS[new Date(ev.firstTouchMs).getUTCDay()] === want);
}

/**
 * Resolve the emergent setup's anchor rung by PROXIMITY (the weakest
 * identity — used only when the setup carries no intrinsic identity):
 * |entry − rung.price| ≤ 3 pips (the canon scaffold dedup tolerance),
 * nearest rung wins, id tiebreak (total order).
 */
function proximityRung(setup: TradeSetup, rungs: ScaffoldRung[], pipValue: number): ScaffoldRung | null {
  if (rungs.length === 0) return null;
  const tol = MERGE_ENTRY_TOLERANCE_PIPS * pipValue;
  const near = rungs
    .map((r) => ({ r, d: Math.abs(r.price - setup.entry) }))
    .filter((c) => c.d <= tol)
    .sort((a, b) => (a.d - b.d) || (a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0));
  return near.length > 0 ? near[0]!.r : null;
}

/**
 * The source→structural mapping (§8.1 ruling 1 mechanized over the
 * emergent lane's anchor identities), STRONGEST identity first:
 *
 *   a. zoneName = an exact scaffold/matrix rung id   → that rung's source
 *   b. zoneName = a ChartModel zone id               → ORDER_BLOCK
 *      (ZoneModels are OB-derived BY CONSTRUCTION, §6.1)
 *   c. zoneName id-pattern |ORDER_BLOCK|/|LQZ|/LQZ_M → STRUCTURAL
 *   d. zoneType BoM-x/MoM-x → ORDER_BLOCK; LSZ-x → LQZ; IP-x → PILLAR
 *      (the generator stamps zoneType from the anchor Engine-1 zone's
 *      candle-anatomy type — visual-setup-generator.ts:838)
 *   e. isBoMEntry → ORDER_BLOCK (a BoM is an order block by definition)
 *   f. proximity rung (≤3 pips) → that rung's source (last resort — the
 *      ladder is the deterministic backbone; an entry AT a passive rung
 *      with NO structural identity anywhere is the DXY=39 slop pattern)
 *
 * Passive sources (PIVOT/MA/OPTION_WALL/FIB_RETRACE/SWING_EXTREME/PILLAR)
 * NEVER produce entries (§8.1 ruling 1).
 *
 * The §8.1 ruling-2 battle predicate is evaluated on the anchor's OWN
 * evidence only: the ChartModel's reaction/touch events when the anchor
 * has a model identity (a/b/c-exact), else isValidEntryAnchor on the
 * identity-resolved band; proximity-resolved anchors (f) stand on source
 * classification alone (re-judging an approximate band with a different
 * ATR window produces false kills — measured, never repeated).
 */
export function anchorGateEmergent(
  setups: TradeSetup[],
  ctx: MdveStageContext,
): AnchorGateResult2 {
  const kept: TradeSetup[] = [];
  const dropped: AnchorGateVerdict[] = [];
  const log: string[] = [];

  for (const setup of setups) {
    const pipValue = PIP_VALUE[setup.pair] ?? 0.0001;
    const rungs =
      ctx.scaffoldByPair?.[setup.pair] ??
      ctx.chartModelsByPair?.[setup.pair]?.ladder ??
      [];
    const model = ctx.chartModelsByPair?.[setup.pair];
    const direction: 'LONG' | 'SHORT' = String(setup.direction) === 'LONG' ? 'LONG' : 'SHORT';

    // ── 1. Source classification (identity chain, strongest first) ──
    let anchorSource: string | null = null;
    let via = '';
    let band: { top: number; bottom: number } | null = null;       // identity-certain band
    let modelEvents: ReadonlyArray<{ firstTouchMs: number; pierced: boolean }> | null = null;

    const exactRung = rungs.find((r) => r.id === setup.zoneName) ?? null;
    const modelZone = model?.zones.find((z) => z.id === setup.zoneName) ?? null;
    const lqzMDec = setup.pair === 'DXY' ? 3 : 5;
    const matrixEntry = model?.lqzMatrix.find(
      (e) => `${setup.pair}|LQZ_M|${e.priceCenter.toFixed(lqzMDec)}` === setup.zoneName,
    ) ?? null;

    if (exactRung) {
      anchorSource = exactRung.source;
      via = `rung ${exactRung.id}`;
      band = { top: exactRung.top, bottom: exactRung.bottom };
      if (matrixEntry) modelEvents = matrixEntry.touchEvents;
    } else if (modelZone) {
      anchorSource = 'ORDER_BLOCK';
      via = `ChartModel zone ${modelZone.id} (OB-derived by construction, §6.1)`;
      band = { top: modelZone.top, bottom: modelZone.bottom };
      modelEvents = modelZone.reactionEvents;
    } else if (matrixEntry) {
      anchorSource = 'LQZ';
      via = `LQZ matrix entry ${setup.zoneName}`;
      band = { top: matrixEntry.top, bottom: matrixEntry.bottom };
      modelEvents = matrixEntry.touchEvents;
    } else if (/\|ORDER_BLOCK\|/.test(setup.zoneName)) {
      anchorSource = 'ORDER_BLOCK';
      via = `zoneName id-pattern (${setup.zoneName})`;
    } else if (/\|LQZ(_M)?\|/.test(setup.zoneName) || /LQZ/.test(setup.zoneName)) {
      anchorSource = 'LQZ';
      via = `zoneName id-pattern (${setup.zoneName})`;
    } else if (/^pillar\b|\bcamarilla\b|\bExtremeMagnet\b|\bExtreme Magnet\b/i.test(setup.zoneName)) {
      // The anchor's LEADING identity is a passive pillar level — e.g.
      // "pillar P5-ExtremeMagnet(...)", "pillar P1-R3-D1-camarilla...",
      // "pillar P1-PP-D4-classic...". §8.1 ruling 1: passive levels NEVER
      // produce entries — even when the generator stamps a BoM/MoM zoneType
      // from Engine-1's synthesis or sets isBoMEntry (the container leak:
      // 6 CONDITIONAL pillar-anchored setups survived via the zoneType branch).
      // Structural OB anchors name the block itself ("1H BoM order block [..]",
      // "4H MoM order block [..]") and NEVER lead with "pillar"/camarilla/ExtremeMagnet.
      anchorSource = 'PILLAR';
      via = `zoneName passive-pattern (${setup.zoneName.slice(0, 48)})`;
    } else if (setup.zoneType === ZoneType.BOM_SUPPLY || setup.zoneType === ZoneType.BOM_DEMAND ||
               setup.zoneType === ZoneType.MOM_SUPPLY || setup.zoneType === ZoneType.MOM_DEMAND) {
      anchorSource = 'ORDER_BLOCK';
      via = `zoneType ${setup.zoneType} (OB-derived candle anatomy)`;
    } else if (setup.zoneType === ZoneType.LSZ_SUPPLY || setup.zoneType === ZoneType.LSZ_DEMAND) {
      anchorSource = 'LQZ';
      via = `zoneType ${setup.zoneType} (liquidity zone)`;
    } else if (setup.zoneType === ZoneType.IP_SUPPLY || setup.zoneType === ZoneType.IP_DEMAND) {
      anchorSource = 'PILLAR';
      via = `zoneType ${setup.zoneType} (passive pillar level)`;
    } else if (setup.isBoMEntry) {
      anchorSource = 'ORDER_BLOCK';
      via = 'isBoMEntry (a BoM is an order block by definition)';
    } else {
      const near = proximityRung(setup, rungs, pipValue);
      if (near) {
        anchorSource = near.source;
        via = `proximity rung ${near.id} (≤${MERGE_ENTRY_TOLERANCE_PIPS}p — no intrinsic identity)`;
      }
    }

    // Passive → DROP (the DXY=39 slop-killer; §8.1 ruling 1).
    if (anchorSource === null || PASSIVE_RUNG_SOURCES.has(anchorSource) || anchorSource === 'PILLAR') {
      const reason = anchorSource === null
        ? `ANCHOR_UNRESOLVED: no rung id, no model zone, no OB/LQZ id-pattern, no structural zoneType ` +
          `(zoneType=${setup.zoneType}, zoneName=${setup.zoneName}) — §8.1 admits ONLY structural anchors`
        : `PASSIVE_SOURCE(${anchorSource}): passive pillar levels (PIVOT/MA/OPTION_WALL/FIB_RETRACE/SWING_EXTREME) ` +
          `are rungs/SL-TP anchors/confluence only, NEVER entries (§8.1 ruling 1 — the DXY=39 slop-killer)`;
      dropped.push({ setup, kept: false, classification: `PASSIVE via ${via || 'unresolved'}`, reason });
      continue;
    }

    // ── 2. Battle predicate (§8.1 ruling 2) — on the anchor's OWN evidence ──
    let battleNote = 'source-only (no identity-certain band — §8.1 ruling-2 check not applicable)';
    if (modelEvents && modelEvents.length > 0) {
      // The model's own battle record is canonical ground truth.
      if (!modelBattleOnDay(modelEvents, setup)) {
        dropped.push({
          setup,
          kept: false,
          classification: `STRUCTURAL(${anchorSource}) via ${via} — battle gate FAILED`,
          reason: `NO_BATTLE: the ChartModel's own reaction record has no non-pierced battle on ${weekdayOfSetup(setup)} ` +
            `at this anchor (§8.1 ruling 2 — event-granularity ground truth)`,
        });
        continue;
      }
      battleNote = `model battle record: non-pierced battle on ${weekdayOfSetup(setup)} (§6.2/§6.4 events)`;
    } else if (band) {
      const dayBars = dayBarsFor(setup, ctx);
      if (dayBars.length > 0) {
        const gate = isValidEntryAnchor(
          { source: anchorSource, top: Math.max(band.top, band.bottom), bottom: Math.min(band.top, band.bottom) },
          dayBars,
          direction,
          setup.pair,
        );
        if (!gate.valid) {
          dropped.push({
            setup,
            kept: false,
            classification: `STRUCTURAL(${anchorSource}) via ${via} — battle gate FAILED`,
            reason: gate.reason,
          });
          continue;
        }
        battleNote = gate.reason;
      }
    }

    kept.push(setup);
    log.push(
      `[ANCHOR-GATE] KEEP ${setup.pair} ${setup.direction} @ ${setup.entry} ` +
      `— STRUCTURAL(${anchorSource}) via ${via}; ${battleNote}`,
    );
  }

  for (const d of dropped) {
    log.push(
      `[ANCHOR-GATE] DROP ${d.setup.pair} ${d.setup.direction} @ ${d.setup.entry} ` +
      `(${d.setup.zoneName}) — ${d.classification}: ${d.reason}`,
    );
  }

  return { kept, dropped, log };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4 — THE MERGE (§8.4 corrected identity — floor first, surplus deduped)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * mergeMirrorWithEmergent — floor + surplus with the corrected identity:
 * same pair + same direction + same day + same session + entries within
 * the canon 3-pip dedup band = ONE trade. The MIRROR setup always wins
 * (the floor is the doctrine's primary; an emergent duplicate is the same
 * trade seen by the other lane).
 */
export function mergeMirrorWithEmergent(
  mirrorSetups: TradeSetup[],
  gatedEmergent: TradeSetup[],
): { merged: TradeSetup[]; duplicatesDropped: number } {
  const identity = (s: TradeSetup): string => {
    const pipValue = PIP_VALUE[s.pair] ?? 0.0001;
    const bucket = Math.round(s.entry / (MERGE_ENTRY_TOLERANCE_PIPS * pipValue));
    return `${s.pair}|${s.direction}|${s.day}|${s.session}|${bucket}`;
  };

  const seen = new Set<string>();
  const merged: TradeSetup[] = [];
  let duplicatesDropped = 0;

  // Floor FIRST — mirror provenance wins every collision.
  for (const s of mirrorSetups) {
    const key = identity(s);
    if (seen.has(key)) { duplicatesDropped++; continue; }
    seen.add(key);
    merged.push(s);
  }
  for (const s of gatedEmergent) {
    const key = identity(s);
    if (seen.has(key)) { duplicatesDropped++; continue; }
    seen.add(key);
    merged.push(s);
  }

  return { merged, duplicatesDropped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5 — THE REPORT-FACING SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

/** Build the Section-26 summary from the stage pieces. */
export function buildStageSummary(
  stage: MdveStageResult,
  emergentBefore: number,
  gate: AnchorGateResult2,
  duplicatesDropped: number,
  mergedTotal: number,
): MdveStageSummary {
  const result = stage.cascadeResult;
  return {
    dxySourceCount: stage.dxySource.length,
    euActive: result?.eu.filter((m) => m.status === 'ACTIVE').length ?? 0,
    euConstructed: result?.eu.length ?? 0,
    guActive: result?.gu.filter((m) => m.status === 'ACTIVE').length ?? 0,
    guConstructed: result?.gu.length ?? 0,
    casualties: stage.casualties,
    failedAnchors: stage.failedAnchors,
    floorOk: stage.floor?.ok ?? false,
    floorViolations: stage.floor?.violations ?? [],
    firewallLog: stage.firewallLog,
    emergentBefore,
    emergentAfterGate: gate.kept.length,
    passiveSlopDropped: gate.dropped.length,
    duplicatesDropped,
    mergedTotal,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 6 — THE v4.5 LANE (PLUTUS_V4.5_SPEC §9.2 Wave C: the LMV-refined
// source + the 80/20 re-anchored mirror + the common-sense guards)
// ═══════════════════════════════════════════════════════════════════════════════
//
// THE SWITCH (the task doctrine): the pipeline's mirror stage runs the
// v4.5 lane — generateSourceSetupsV45 (§3/§4 LMV-refined E/SL) feeding
// cascadeV45 (§5 pair-native re-anchor + §6 CS-1 guard + §7 narrative
// gate) checked by checkMirrorFloorV45 (§11 v4.5 casualty contract).
// FAIL-SAFE BY LAW (unchanged): ANY failure in the v4.5 lane degrades to
// the v4.4 lane (runMirrorStage internals), tagged lane='v4.4-fallback'
// and logged PROMINENTLY — the report always ships, never silently.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canon session UTC start hours (sessionOf's fixed boundaries):
 * TOKYO 00 / LONDON 07 / NY 13 / OFF 21. Replicated from
 * verify-mirror-fix.ts (the harness canon) — the CS-1 guard's
 * session-window math.
 */
const SESSION_HOUR_UTC: Record<SessionLabel, number> = { TOKYO: 0, LONDON: 7, NY: 13, OFF: 21 };

/**
 * sessionStartPriceProvider — the CS-1 guard's input from the ALREADY-
 * HARVESTED bars in the pipeline ctx (never re-fetches): the OPEN of the
 * first 1H bar of the session containing `ms` on `pair` (null when no
 * bar exists — the guard is then honestly unarmed, flagged CS1_UNCHECKED
 * inside cascadeV45).
 */
export function sessionStartPriceProvider(
  ctx: MdveStageContext,
): (pair: string, ms: number) => number | null {
  return (pair: string, ms: number): number | null => {
    const bars = ctx.harvestData.ohlcByPairTf[pair]?.['1H'] ?? [];
    const d = new Date(ms);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const sess = sessionOf(ms);
    const wStart = dayStart + (SESSION_HOUR_UTC[sess] ?? 0) * 3_600_000;
    const wEnd = wStart + 7 * 3_600_000; // window superset; the sessionOf match constrains it
    const bar = bars.find((b) => b.timestamp >= wStart && b.timestamp < wEnd && sessionOf(b.timestamp) === sess);
    return bar ? bar.open : null;
  };
}

/**
 * dayOpenPriceProvider — v4.5.4 FIX 4 (the day-native mirror gate): the
 * first 1H bar of the source's signal day on the target pair. The mirror's
 * onSide anchor gate references THIS — not the week-anchor model spot (the
 * operator: "spot price is practically irrelevant… it needs to be day
 * native"; his Monday GU 1.3380 winner died to the Friday spot gate).
 */
export function dayOpenPriceProvider(
  ctx: MdveStageContext,
): (pair: string, dayStartMs: number) => number | null {
  return (pair: string, dayStartMs: number): number | null => {
    const bars = ctx.harvestData.ohlcByPairTf[pair]?.['1H'] ?? [];
    const bar = bars.find((b) => b.timestamp >= dayStartMs && b.timestamp < dayStartMs + 24 * 3_600_000);
    return bar ? bar.open : null;
  };
}

/** The v4.5 mirror stage's output (the v4.4 shape + the lane tag + the V45 cascade). */
export interface MdveStageResultV45 {
  /** false → fail-safe fallback (emergent-only); failureReason says why. */
  ran: boolean;
  /** 'v4.5' = the LMV lane; 'v4.4-fallback' = the v4.5 lane failed, the v4.4 lane carried the floor. */
  lane: 'v4.5' | 'v4.4-fallback';
  failureReason?: string;
  /** The §8 DXY source setups (v4.5 LMV-refined geometry on the v4.5 lane). */
  dxySource: TradeSetup[];
  /** The FLOOR: DXY source + EU/GU ACTIVE mirrors as TradeSetup[] (mirrorOf provenance). */
  mirrorSetups: TradeSetup[];
  cascadeResult: MirrorCascadeResultV45 | null;
  floor: { ok: boolean; violations: string[] } | null;
  casualties: MirrorCasualty[];
  failedAnchors: Array<{ sourceSetupId: string; targetPair: string; reason: string }>;
  /** The f(T) firewall + §11 v4.5 floor evaluation lines (log verbatim). */
  firewallLog: string[];
}

/**
 * mirrorToTradeSetupV45 — convert ONE ACTIVE MirrorOutcomeV45 into the
 * report's TradeSetup shape. Same doctrine as mirrorToTradeSetup (§9.3:
 * geometry EXCLUSIVELY from the target pair's own model) plus the v4.5
 * provenance: the pair-native anchor kind/id, the defended-edge entry,
 * the reaction-extreme SL method, the zone class (BoM/MoM/LQZ → the
 * BOM/MOM/LSZ zoneType family), and the common-sense flags. The anchor
 * may be an LMV row (`PAIR|LMV|center` — NOT in model.zones), so the
 * zone identity comes from the OUTCOME's own fields, never a zone lookup
 * that could miss.
 */
export function mirrorToTradeSetupV45(
  m: MirrorOutcomeV45,
  dxyById: Map<string, TradeSetup>,
): TradeSetup {
  const pair = m.pair;
  const pipValue = PIP_VALUE[pair] ?? 0.0001;
  const mirrorOf = m.mirrorOf ?? m.sourceSetupId;

  // Day: the trade's target-native ISO day → weekday; fallback to the
  // source setup's day; final fallback 'Monday' (display-only field).
  let day = m.tradeDay
    ? WEEKDAYS[new Date(Date.parse(`${m.tradeDay}T00:00:00Z`)).getUTCDay()]!
    : undefined;
  if (!day) day = dxyById.get(m.sourceSetupId)?.day;
  if (!day) day = 'Monday';

  const confidence = mirrorConfidence(m.rrr);
  const category = (Object.values(SetupCategory) as string[]).includes(m.category)
    ? (m.category as SetupCategory)
    : SetupCategory.HTF_SWING;
  const isBoM = m.zoneClass === 'BoM';

  return {
    setupId: `MIR45-${pair}-${m.sourceSetupId}`.replace(/[^A-Za-z0-9]+/g, '_'),
    pair,
    direction: m.direction === 'LONG' ? TradeDirection.LONG : TradeDirection.SHORT,
    category,
    entry: m.entry,
    sl: m.sl,
    tp: m.tp,
    confidence,
    confidenceTier: tierOf(confidence),
    shapeAlignment: ShapeCode.SS, // range doctrine: zone edge → opposing zone edge (AP22)
    session: SESSION_DISPLAY[m.session ?? 'NY'],
    day,
    shapeTrigger: `MIRROR-V45 of ${mirrorOf} → ${pair} @ ${m.anchorZoneId} (${m.session ?? 'no-touch'})`,
    rrr: m.rrr,
    slPips: Math.abs(m.entry - m.sl) / pipValue,
    zoneName: m.anchorZoneId,
    isBoMEntry: isBoM,
    zoneType: m.zoneClass === 'LQZ'
      ? (m.direction === 'LONG' ? ZoneType.LSZ_DEMAND : ZoneType.LSZ_SUPPLY)
      : isBoM
        ? (m.direction === 'LONG' ? ZoneType.BOM_DEMAND : ZoneType.BOM_SUPPLY)
        : (m.direction === 'LONG' ? ZoneType.MOM_DEMAND : ZoneType.MOM_SUPPLY),
    directionValidation: [],
    notes:
      `§9.6 v4.5 MIRROR of ${mirrorOf} (source ${m.sourceSetupId}); ` +
      `80% signal cls=${m.zoneClass} → 20% pair-native anchor ${m.anchorZoneId} (${m.anchorKind}, zfp ${m.anchorZfp}); ` +
      `entry=defendedEdge ${m.anchorDefendedEdge} (§5.2); SL ${m.slMethod}` +
      `${m.anchorReactionExtreme !== null ? ` (rxExt ${m.anchorReactionExtreme}, §5.4)` : ''}; ` +
      `TP Law-14 rung ${m.tpRungId ?? 'null'}; RRR ${m.rrr.toFixed(2)} on ${pair} geometry; ` +
      `trade day ${m.tradeDay || 'unknown'}${m.flags.length > 0 ? `; flags: ${m.flags.join(' | ')}` : ''}`,
    mirrorOf,
  };
}

/**
 * runMirrorStageV45 — the v4.5 deterministic floor. The pipeline's mirror
 * stage: §8 source lane with the LMV-refined E/SL (generateSourceSetupsV45)
 * → cascadeV45 (the 80/20 re-anchor, CS-1 guard ARMED via the harvested
 * session-start prices, narrative gate ON) → checkMirrorFloorV45 (§11
 * v4.5 casualty contract) → the f(T) firewall.
 *
 * FAIL-SAFE (the hard constraint): if the LMV refinement THROWS anywhere
 * (source gen or cascade), the stage falls back to the v4.4 lane —
 * generateSourceSetups + cascade + checkMirrorFloor — tagged
 * lane='v4.4-fallback' with the failure logged in firewallLog. Missing
 * models → ran=false exactly like the v4.4 stage (the emergent-only
 * fallback the engine relies on). NEVER breaks the pipeline.
 */
export function runMirrorStageV45(ctx: MdveStageContext): MdveStageResultV45 {
  const empty: MdveStageResultV45 = {
    ran: false,
    lane: 'v4.5',
    dxySource: [],
    mirrorSetups: [],
    cascadeResult: null,
    floor: null,
    casualties: [],
    failedAnchors: [],
    firewallLog: [],
  };

  const models = ctx.chartModelsByPair;
  if (!models) {
    return { ...empty, failureReason: 'no chart models in ctx (zones tool MDVE stage did not run or failed)' };
  }
  const dxyModel = models['DXY'];
  const euModel = models['EUR/USD'];
  const guModel = models['GBP/USD'];
  if (!dxyModel || !euModel || !guModel) {
    const missing = ['DXY', 'EUR/USD', 'GBP/USD'].filter((p) => !models[p]);
    return { ...empty, failureReason: `chart models missing for [${missing.join(', ')}] — mirror cascade requires all three` };
  }

  // ── THE FAIL-SAFE WRAPPER: any v4.5-lane throw → the v4.4 lane carries
  //    the floor (tagged + logged, never silent, never broken). ──
  let dxySource: TradeSetup[];
  let result: MirrorCascadeResultV45;
  try {
    // ── §8 v4.5: the LMV-refined DXY source lane (defended-edge entries,
    //    reaction-extreme SLs, the selective guard inside computeSL_LMV). ──
    dxySource = generateSourceSetupsV45(dxyModel);
    // ── §9.6 v4.5: the 80/20 re-anchored cascade (CS-1 armed, narrative ON) ──
    const cascadeModels = { DXY: dxyModel, 'EUR/USD': euModel, 'GBP/USD': guModel };
    result = cascadeV45(dxySource, cascadeModels, {
      sessionStartPrice: sessionStartPriceProvider(ctx),
    });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const v44 = runMirrorStage(ctx);
    return {
      ran: v44.ran,
      lane: 'v4.4-fallback',
      failureReason: v44.failureReason,
      dxySource: v44.dxySource,
      mirrorSetups: v44.mirrorSetups,
      cascadeResult: null,
      floor: v44.floor,
      casualties: v44.casualties,
      failedAnchors: v44.failedAnchors,
      firewallLog: [
        `[MDVE-V45-FAILSAFE] v4.5 lane THREW (${reason}) — FELL BACK to the v4.4 lane (fail-safe: the report ships, the failure is PROMINENT)`,
        ...v44.firewallLog,
      ],
    };
  }

  const dxyById = new Map(dxySource.map((s) => [s.setupId, s]));

  // ── §11 v4.5: the mirror-floor contract (v4.5 casualty model) ──
  const floor = checkMirrorFloorV45(result, dxySource.length);

  // ── The FLOOR as TradeSetup[]: DXY source + ACTIVE v4.5 mirrors ──
  const activeMirrors = [...result.eu, ...result.gu].filter((m) => m.status === 'ACTIVE');
  const mirrorSetups: TradeSetup[] = [
    ...dxySource,
    ...activeMirrors.map((m) => mirrorToTradeSetupV45(m, dxyById)),
  ];

  // ── Documented casualties (§11 temporal clause — CS1_INVALID and
  //    NARRATIVE_SUPPRESSED are first-class v4.5 casualty classes) ──
  const casualties: MirrorCasualty[] = result.discarded.map((m) => ({
    pair: m.pair,
    sourceSetupId: m.sourceSetupId,
    status: m.status,
    reason: m.discardReason ?? 'NO REASON LOGGED — §11 TEMPORAL VIOLATION',
  }));

  // ── f(T) FIREWALL + the §11 v4.5 floor — every one of the golden 24
  //    accounted for, the v4.5 lane tagged. ──
  const euActive = result.eu.filter((m) => m.status === 'ACTIVE').length;
  const guActive = result.gu.filter((m) => m.status === 'ACTIVE').length;
  const total = dxySource.length + euActive + guActive + casualties.length;
  const rhs = GOLDEN_FLOOR_TOTAL - casualties.length;
  const ftOk = total >= rhs;
  const cs1Count = result.discarded.filter((m) => m.status === 'CS1_INVALID').length;
  const narrCount = result.discarded.filter((m) => m.status === 'NARRATIVE_SUPPRESSED').length;
  const flaggedCount = [...result.eu, ...result.gu].filter((m) =>
    m.flags.some((f) => f.startsWith('COUNTER_STRUCTURE_FLAG'))).length;
  const firewallLog: string[] = [
    `[MDVE-V45] lane=v4.5 — generateSourceSetupsV45 → cascadeV45 (80/20 re-anchor, CS-1 armed, narrative gate ON) → checkMirrorFloorV45`,
    `[MDVE-F(T)] f(T) = |DXY.active|=${dxySource.length} + |EU.active|=${euActive} + |GU.active|=${guActive} ` +
      `+ |documented casualties|=${casualties.length} = ${total} ≥ ${GOLDEN_FLOOR_TOTAL} − ${casualties.length} = ${rhs} → ${ftOk ? 'OK' : 'VIOLATION'}`,
    `[MDVE-FLOOR] §11 checkMirrorFloorV45(result, ${dxySource.length}) → ${floor.ok ? 'OK' : 'VIOLATION'}`,
    `[MDVE-V45-GUARDS] CS-1 discards=${cs1Count} narrative suppressions=${narrCount} Hard-Wall flags=${flaggedCount}`,
  ];
  for (const v of floor.violations) firewallLog.push(`  ${v}`);
  for (const c of casualties) firewallLog.push(`  [casualty:${c.status}] ${c.reason}`);
  for (const f of result.failedAnchors) firewallLog.push(`  [failed-anchor] ${f.sourceId} → ${f.targetPair}: ${f.reason}`);

  return {
    ran: true,
    lane: 'v4.5',
    dxySource,
    mirrorSetups,
    cascadeResult: result,
    floor,
    casualties,
    failedAnchors: result.failedAnchors.map((f) => ({
      sourceSetupId: f.sourceId,
      targetPair: f.targetPair,
      reason: f.reason,
    })),
    firewallLog,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 7 — THE COMMON-SENSE GATE (§6 CS-1 + §7 narrative) FOR THE
// EMERGENT LANE — the anchor gate already kills passive anchors; THIS gate
// kills the structurally-un-enterable and the counter-narrative survivors.
// ═══════════════════════════════════════════════════════════════════════════════

/** Parse a setup-gen shapeTrigger's battle ms (`… @ YYYY-MM-DD SESSION`). NaN when foreign. */
function battleMsOfTrigger(trigger: string): number {
  const m = /@ (\d{4})-(\d{2})-(\d{2}) (TOKYO|LONDON|NY|OFF)$/.exec(trigger);
  if (!m) return NaN;
  const hour = m[4] === 'LONDON' ? 7 : m[4] === 'NY' ? 13 : m[4] === 'OFF' ? 21 : 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour);
}

/** SessionWindow (ET display) → the canon UTC session start hour. */
function sessionHourOfWindow(w: SessionWindow): number {
  return w === SessionWindow.LONDON_OPEN || w === SessionWindow.LONDON_MID ? 7 : 13;
}

/**
 * commonSenseGateEmergent — apply the v4.5 common-sense guards to the
 * emergent lane's (already anchor-gated) setups:
 *   CS-1 (§6.2, MANDATORY): a setup whose SL the session-open price has
 *     already violated is un-enterable — DROPPED with the logged reason.
 *   NARRATIVE (§7.2): a weak-zone (zfp > 30) setup fighting the weekly
 *     narrative is SUPPRESSED; a Hard-Wall (zfp ≤ 30) counter-structure
 *     setup is KEPT with the COUNTER_STRUCTURE_FLAG logged (Law-20).
 * The zfp input resolves from the setup's model zone (exact id match),
 * else its overlapping LMV zone, else 40 (honest weak default: an
 * unresolvable anchor gets NO strength benefit of the doubt).
 * Never throws: a setup whose trade window cannot be resolved is kept
 * with a CS1_UNCHECKED log line (honest absence — the v4.4 lane shipped
 * these setups; the gate only REMOVES provable violations).
 */
export function commonSenseGateEmergent(
  setups: TradeSetup[],
  ctx: MdveStageContext,
): AnchorGateResult2 {
  const kept: TradeSetup[] = [];
  const dropped: AnchorGateVerdict[] = [];
  const log: string[] = [];
  const priceOf = sessionStartPriceProvider(ctx);
  const weekStartMs = Date.parse(`${ctx.weekStart}T00:00:00Z`);

  for (const setup of setups) {
    const direction: 'LONG' | 'SHORT' = String(setup.direction) === 'LONG' ? 'LONG' : 'SHORT';
    const model = ctx.chartModelsByPair?.[setup.pair];

    // ── The trade's window: the battle ms (setup-gen identity), else the
    //    day+session window (the emergent lane's display identity). ──
    let tradeMs = battleMsOfTrigger(setup.shapeTrigger);
    if (!Number.isFinite(tradeMs) && Number.isFinite(weekStartMs)) {
      const iso = /^\d{4}-\d{2}-\d{2}$/.exec(setup.day);
      const dayStart = iso
        ? Date.parse(`${setup.day}T00:00:00Z`)
        : weekStartMs + (DAY_OFFSETS[setup.day.toLowerCase()] ?? 0) * 86_400_000;
      tradeMs = dayStart + sessionHourOfWindow(setup.session) * 3_600_000;
    }
    const tradeDay = Number.isFinite(tradeMs) ? new Date(tradeMs).toISOString().slice(0, 10) : '';

    // ── CS-1 (§6.2) ──
    if (Number.isFinite(tradeMs)) {
      const openPrice = priceOf(setup.pair, tradeMs);
      if (openPrice !== null) {
        const cs1 = structurallyValid({ sl: setup.sl }, openPrice, direction);
        if (!cs1.valid) {
          dropped.push({
            setup,
            kept: false,
            classification: 'CS1_INVALID (§6.2 structural-validity guard)',
            reason: cs1.reason,
          });
          continue;
        }
      } else {
        log.push(`[CS-GATE] CS1_UNCHECKED ${setup.pair} ${setup.direction} @ ${setup.entry} — no 1H bar in the trade session (honest absence)`);
      }
    } else {
      log.push(`[CS-GATE] CS1_UNCHECKED ${setup.pair} ${setup.direction} @ ${setup.entry} — trade window unresolvable (day='${setup.day}')`);
    }

    // ── NARRATIVE (§7.2) ──
    if (model && tradeDay !== '') {
      const pipValue = PIP_VALUE[setup.pair] ?? 0.0001;
      const zone = model.zones.find((z) => z.id === setup.zoneName);
      let zfp = zone?.zfp;
      if (zfp === undefined) {
        const wantSide = direction === 'LONG' ? 'BUY_SIDE' : 'SELL_SIDE';
        const overlap = model.lmv.table
          .filter((z) => z.side === wantSide && setup.entry >= z.bottom - 2 * pipValue && setup.entry <= z.top + 2 * pipValue)
          .sort((a, b) => (Math.abs(a.center - setup.entry) - Math.abs(b.center - setup.entry)) || (a.center - b.center));
        zfp = overlap.length > 0 ? overlap[0]!.zfp : 40; // honest weak default — no strength benefit of the doubt
      }
      const gate = narrativeAligned(
        { direction, entry: setup.entry, zfp },
        model.narrative,
        tradeDay,
        { spot: model.spot, atrPips: (4 * model.lmv.coverage.bucketWidth) / pipValue, pipValue },
      );
      if (!gate.aligned) {
        dropped.push({
          setup,
          kept: false,
          classification: 'NARRATIVE_SUPPRESSED (§7.2 counter-structure gate)',
          reason: gate.reason,
        });
        continue;
      }
      if (gate.flagged) {
        log.push(`[CS-GATE] COUNTER_STRUCTURE_FLAG ${setup.pair} ${setup.direction} @ ${setup.entry} — ${gate.reason}`);
      }
    }

    kept.push(setup);
  }

  for (const d of dropped) {
    log.push(
      `[CS-GATE] DROP ${d.setup.pair} ${d.setup.direction} @ ${d.setup.entry} ` +
      `(${d.setup.zoneName}) — ${d.classification}: ${d.reason}`,
    );
  }
  log.unshift(`[CS-GATE] emergent common-sense gate: ${setups.length} in → ${kept.length} kept, ${dropped.length} dropped (CS-1 + §7.2 narrative)`);
  return { kept, dropped, log };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 8 — THE v4.5.2 STATS-INTEGRITY WIRING (PLUTUS_V4.5.2_SPEC §9)
// ═══════════════════════════════════════════════════════════════════════════════
//
// §9.1: the dedup runs as a POST-PROCESSING stage after the setup
// generation + the mirror cascade, BEFORE the report:
//   generateSourceSetupsV45(DXY) → cascadeV45(EU/GU mirrors, v4.5.2
//   refinements ON) → EMISSION CAP (§4.2, inside the cascade) →
//   TRADE-DEDUP (the stats-integrity engine) → the deduplicated
//   UniqueTrade[] → ACCURATE-STATS (the report's unique-set stats).
// ═══════════════════════════════════════════════════════════════════════════════

import {
  toDedupSetup,
} from '../mdve/trade-dedup.js';
import type { DedupSetup } from '../mdve/trade-dedup.js';
import { mirrorToDedupSetupV452 } from '../mdve/mirror.js';

/** The DXY source setup's battle ms from its §8.4 shapeTrigger identity
 *  (`… @ YYYY-MM-DD SESSION`). NaN when foreign (honest — the leg sorts
 *  last, deterministically). */
function battleMsOfShapeTrigger(trigger: string): number {
  const m = /@ (\d{4})-(\d{2})-(\d{2}) (TOKYO|LONDON|NY|OFF)$/.exec(trigger);
  if (!m) return NaN;
  const hour = m[4] === 'LONDON' ? 7 : m[4] === 'NY' ? 13 : m[4] === 'OFF' ? 21 : 0;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), hour);
}

/** The DXY source setup's ISO day from its shapeTrigger ('' when foreign). */
function dayIsoOfShapeTrigger(trigger: string): string {
  const m = /@ (\d{4}-\d{2}-\d{2}) (TOKYO|LONDON|NY|OFF)$/.exec(trigger);
  return m ? m[1]! : '';
}

/**
 * floorSetupsToDedupRows — the §9.1 row adapter: the DXY source lane +
 * the ACTIVE EU/GU mirrors as DedupSetup rows for the stats-integrity
 * engine. DXY rows anchor on the entry (the LMV defendedEdge IS the
 * entry on the v4.5 source lane — §4.2 entryPrice_LMV); mirror rows via
 * mirrorToDedupSetupV452 (the mirror's own defendedEdge + tradeDay).
 */
export function floorSetupsToDedupRows(
  dxySource: TradeSetup[],
  activeMirrors: MirrorOutcomeV45[],
): DedupSetup[] {
  const rows: DedupSetup[] = [];
  for (const s of dxySource) {
    const dayIso = dayIsoOfShapeTrigger(s.shapeTrigger);
    // v4.5.5: the setup's OWN battleMs (when it FORMED) drives the sim's
    // activation — an order cannot exist before its setup. The legacy
    // fallback (the shapeTrigger's day+session bucket) is unchanged for
    // rows that predate the field.
    const ms = s.battleMs ?? battleMsOfShapeTrigger(s.shapeTrigger);
    const row = toDedupSetup(s, dayIso, {
      triggerMs: Number.isFinite(ms) ? ms : undefined,
      anchor: s.entry,
    });
    // v4.5.5 F1-B: a defended-transit setup's session label is the battle's
    // CANONICAL session (the transit candle's actual session — the display
    // SessionWindow maps TOKYO→"London Open", which would defer the
    // activation 6h past the reclaim and starve the fill).
    if (s.shapeTrigger.includes('TRANSIT_DEFEND')) {
      const canon = / (TOKYO|LONDON|NY|OFF)$/.exec(s.shapeTrigger)?.[1];
      if (canon) row.session = canon;
    }
    rows.push(row);
  }
  for (const m of activeMirrors) rows.push(mirrorToDedupSetupV452(m));
  return rows;
}
