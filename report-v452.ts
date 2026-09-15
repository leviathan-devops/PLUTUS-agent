/**
 * report-v452.ts — the v4.5.2 END-TO-END ACCURATE REPORT (PLUTUS_V4.5.2_SPEC
 * §9 integration + §6 accurate clean reporting + §7 stale-fill honesty).
 *
 * THE CHAIN (§9.1, exact; Phase 6 P1 + Wave G2 — the operator's 2026-07-31
 * INTERLEAVED order, arrow-notation-literal):
 *   load bars fixture (BARS_FIXTURE → /tmp/opencode/bars_raw.json)
 *   → buildChartModel(DXY/EU/GU) on bars ≤ the week anchor      [E1]
 *   → DXY FULL first: ShapeBrain(DXY) [E2 CORE] → generateSourceSetupsV45(DXY)
 *     [E3 — the frozen source lane, COMPLETE FIRST]
 *   → EU: DXY-inverse E2 CASCADE (translateCascadeDayMap — the TRANSLATION,
 *     structural equivalent, NOT designation) → EU E2 CORE (the EU brain's
 *     OWN strength-based chain + day designation, exactly like DXY)
 *     → divergence validation (computeChainDivergence ≤ 0.35 — the macro-wins
 *     law, the G3 contract + D59: when the cascade direction contradicts the
 *     pair's E2 core beyond the threshold, the MACRO AUTHORITY WINS — the
 *     direction + the designation flip to the cascade's, the divergence
 *     recorded in the store (MACRO_DIVERGENCE))
 *     → DXY-inverse E3 cascade (cascadeV45's EU lane — the EU CORE's
 *     ShapeDayZone days, ZONE-ANCHORED)
 *   → GU: EU E2 CASCADE (translateCascadeDayMap(euCoreDays, KEPT)) → GU E2
 *     CORE (the GU brain's OWN strength-based designation — the RESTORED
 *     per-pair brain run) → divergence validation → EU E3 cascade
 *     (cascadeV45's GU lane — sourced from the ACTIVE EU mirrors, NEVER the
 *     raw DXY setups, zone-anchored via the GU CORE's days)
 *   → cascadeV45(EU/GU mirrors, v4.5.2 refinements: weekly-wall TP §5.2,
 *     golden SL §5.3, consumed-pool qualifier §4.4) with
 *     shapeChains = { dxy: dxyBrain, eu: euCoreBrain, gu: guCoreBrain }
 *     — the PAIR BRAINS' days (NOT the cascade's)
 *   → capMirrorEmission (§4.2 — MAX 1 mirror per anchor+day, in-cascade)
 *   → dedupTrades (§1 identity + §2 staggered merge)
 *   → outcome simulation per unique trade (§3.1 trigger model + §7.2 +
 *     ZR-6E bracket: the order activates at the E2-designated session's
 *     start on the trade day and expires at the NEXT day's session start
 *     (the Friday bracket closes at the Friday 21:00Z NY close — the
 *     weekend rule; no "live to Jul 28" zombie fills)
 *   → computeAccurateStats (§6 unique-set stats + §7 STALE bucket +
 *     honest session labels)
 *   → dedupSLvsEntry (§6.4 — votes on unique trades only)
 *   → report_v452.md (this build dir — the accurate, deduplicated report)
 *
 * NO EMBELLISHED STATS: every number is computed on the unique set with
 * its n. DETERMINISTIC: same fixture → byte-identical markdown (no
 * wall-clock anywhere in the chain). Run: bun report-v452.ts
 */

import {
  buildChartModel,
  cascadeV45,
  generateSourceSetupsV45,
  sessionOf,
} from './src/mdve/index.js';
import { mirrorToDedupSetupV452 } from './src/mdve/mirror.js';
// THE TEMPORAL ENGINE (the operator's temporal law — the locked run-anchor
// gate): the --day/--time input locks the anchor ONE-WAY at the pipeline
// entry; gateBars PHYSICALLY BLOCKS every future bar past it from entering
// any model. The gate is inert until the lock — the legacy no-arg path stays
// byte-identical (the ANCHOR_MS fallback).
import { lockRunAnchor, gateBars } from './src/mdve/temporal.js';
import type { MirrorOutcomeV45 } from './src/mdve/mirror.js';
import { dedupTrades } from './src/mdve/trade-dedup.js';
import type { DedupSetup, UniqueTrade } from './src/mdve/trade-dedup.js';
import { generateChainedTrades } from './src/mdve/trade-chaining.js';
import type { ChainedTradeInput } from './src/mdve/trade-chaining.js';
import {
  computeAccurateStats,
  dedupSLvsEntry,
} from './src/report/accurate-stats.js';
import type {
  EvalWeek,
  ReportTrade,
  SLvsEntryVoteRow,
  UniqueTradeInput,
} from './src/report/accurate-stats.js';
import { floorSetupsToDedupRows } from './src/pipeline/mdve-stage.js';
import { PIP_VALUE, ZoneType } from './src/types.js';
import type { OHLCBar, TradeSetup, ZoneMapSnapshot, DXYZone, DayShapePrediction } from './src/types.js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { decodeMarketData } from './src/e1/adapters/market-data-adapter.ts';
import { pillarEngine } from './src/brains/9-pillar-lobe.js';
import type { PillarResult } from './src/brains/9-pillar-lobe.js';
import type { OptionsExpiryData, OptionStrike } from './src/clients/investinglive-client.js';
import type { ZoneModel } from './src/mdve/types.js';
import { ShapeBrain } from './src/brains/shape-brain.js';
import type { CascadedShapeChain } from './src/mdve/shape-cascade.js';
import { translateCascadeDayMap, computeChainDivergence, CASCADE_DIVERGENCE_VALIDATED } from './src/mdve/cascade-translation.js';
import type { TranslatedDayMap } from './src/mdve/cascade-translation.js';
// Wave W4 (2026-08-10 — the C-5 second half, the macro-wins law): the
// FAILURE STORE row (recordFailure) — the MACRO_DIVERGENCE record is the G3
// gate's evidence (golden-gate.ts's store.macroDivergenceRows), NEVER a
// log-only marker. The store degrades to the append-only fallback when
// bun:sqlite is unavailable (failure-store.ts:19-22) — a thrown write is
// caught + logged by the divergence handler, NEVER a silent skip.
import { recordFailure } from './src/mdve/failure-store.js';
import type { ShapePredictionSnapshot } from './src/types.js';
// Wave A1.3 (2026-08-01 — the operator's directive): the PRIOR-WEEK
// BACKWARDS-MAPPING PRE-FLIGHT. The prior week's E1/E2 pipeline runs on the
// available historical data (bars ≤ the prior anchor) and produces the macro
// storyline context the current week's E2 brain consumes (the parallel
// agent's shape-brain consumption wiring reads the handoff field — the
// `priorStoryline` property attached to the injected zone map).
import { runPriorWeekPreflight } from './src/mdve/prior-week-preflight.js';
import type { PriorWeekStoryline } from './src/mdve/prior-week-preflight.js';
// Wave ZR-2B (the storyline pipeline wiring): the E2 STORYLINE ENGINE — the
// narrative layer on top of the E1 pressure mechanics + the E2 shape chain
// (ZR-2A owns src/brains/storyline-engine.ts — this wave wires it into the
// report pipeline, the cascade ctx, and the report's THE STORYLINE section).
import { computeWeekStoryline } from './src/brains/storyline-engine.js';
import type { WeekStoryline } from './src/brains/storyline-engine.js';
import type { MirrorReanchorContext } from './src/mdve/mirror.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** The week's temporal anchor — THE ANALYSIS POINT (the operator's temporal law:
 *  "everything needs to be done temporally anchored to LONDON SESSION PRE-MARKET" —
 *  the Monday 2026-07-06 06:00 UTC, the START of the pre-London hour; the London
 *  open = 07:00 UTC. The Friday-close 1783702800000 is DEAD — it leaks the week's
 *  reactions into the model. The W1 sweep (2026-08-10). */
const ANCHOR_MS = 1783317600000; // ANALYSIS_POINT_MS — Monday 2026-07-06 06:00 UTC
const WEEK = '2026-07-06';
/** Wave A1.3: the current week's start (UTC midnight Monday) — the prior
 *  week's END. The pre-flight's priorAnchor = weekStartMs (bars ≤ it =
 *  the prior window, NEVER the current week's bars). */
const WEEK_START_MS = Date.UTC(2026, 6, 6); // 2026-07-06T00:00:00Z
const FIXTURE = process.env.BARS_FIXTURE ?? ['/tmp', 'opencode', 'bars_raw.json'].join('/');
/** Outcome/simBars only — never a decision input. */
const WEEK_FIXTURE = process.env.BARS_WEEK_FIXTURE ?? ['/tmp', 'opencode', 'bars_raw.week.json'].join('/');
const REPORT_PATH = 'report_v452.md'; // relative — SF-AST: no absolute paths
/** Wave A1.1: the parallel agent's parsed options walls (the operator's
 *  JUL-6 image). ABSENT → the honest [NO DATA] fallback (ZR-7A: P8's
 *  K-factor path degrades AND P3 returns the P3_NO_DATA honest zero — the
 *  Options-Derived dimension scores 0, NEVER the Gamma-histogram proxy).
 *  When present, the walls enter the zone map with the Options-Derived
 *  confluence. */
const OPTIONS_WALLS_PATH = process.env.OPTIONS_WALLS_FIXTURE ?? ['/tmp', 'opencode', 'options_walls.json'].join('/');

/**
 * parseRunAnchor — THE TEMPORAL RUN ANCHOR PARSER (the operator's "today").
 * --day=YYYY-MM-DD (+ optional --time=HH:MM) → the anchor ms; the default
 * hour is 07:00 UTC (the London session open — the operator's run moment).
 * ABSENT --day → null (the legacy ANCHOR_MS fallback — no lock, no gate,
 * byte-identical behavior). Malformed input THROWS with the remedy — the
 * parse NEVER silently defaults (the audit gate flags the silent failure).
 * IDENTICAL COPY in all four runners (report-v452.ts, diag-golden-coverage.ts,
 * diag-lmv-golden-fx.ts, diag-lmv-golden.ts) — a divergence is a defect.
 */
function parseRunAnchor(argv: string[]): number | null {
  const dayArg = argv.find((a) => a.startsWith('--day='));
  if (!dayArg) return null; // the legacy path — the ANCHOR_MS fallback
  const token = dayArg.slice('--day='.length);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
  if (!m) throw new Error(`TEMPORAL PARSE: invalid --day '${token}' - expected YYYY-MM-DD`);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`TEMPORAL PARSE: invalid --day '${token}' - expected YYYY-MM-DD`);
  }
  let hh = 7, mm = 0; // the London-open default (the operator's run moment)
  const timeArg = argv.find((a) => a.startsWith('--time='));
  if (timeArg) {
    const t = /^(\d{2}):(\d{2})$/.exec(timeArg.slice('--time='.length));
    if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) {
      throw new Error(`TEMPORAL PARSE: invalid --time - expected HH:MM with HH 0-23, MM 0-59`);
    }
    hh = Number(t[1]); mm = Number(t[2]);
  }
  return Date.UTC(Number(m[1]), month - 1, day, hh, mm);
}

/**
 * The expected options-walls file schema (the parallel agent's contract):
 *   { date: '2026-07-06', walls: [ { pair, strike, notional (BILLIONS),
 *     tier: 'CRITICAL'|'SIGNIFICANT', optionsDim: 2|1, day } ], spots?,
 *     dxyEquivalents? }
 * Absent or unparseable → undefined (honest [NO DATA] — never a proxy).
 */
interface OptionsWallsFile {
  date?: string;
  walls?: Array<{ pair: string; strike: number; notional: number; expiry?: string; tier?: string; optionsDim?: number; day?: string }>;
  strikes?: Array<{ pair: string; strike: number; notional: number; expiry?: string; tier?: string; optionsDim?: number; day?: string }>;
  /** The real component spot rates (the file's OCR spots — P8's ICE K-factor
   *  inputs; NEVER fabricated — provided by the parallel agent). */
  spots?: Record<string, number>;
}

interface OptionsWallsBundle {
  /** The full OptionsExpiryData (all strikes — used for DXY's P8 K-factor). */
  data: OptionsExpiryData;
  /** The pair-native OptionsExpiryData (a pair's OWN strikes — used for the
   *  pair's map at its native price space, P8's DXY conversion skipped). */
  perPair: Record<string, OptionsExpiryData | undefined>;
  /** The real component spot rates (the file's spots; undefined if absent). */
  componentSpots: Record<string, number> | undefined;
  /** The walls' expiry days (the NY-cut / Spring-Release temporal note). */
  wallDays: string[];
}

export function loadOptionsWalls(): OptionsWallsBundle | undefined {
  let data: OptionsWallsFile;
  try {
    data = JSON.parse(readFileSync(OPTIONS_WALLS_PATH, 'utf8')) as OptionsWallsFile;
  } catch {
    return undefined; // absent/unparseable → the [NO DATA] honest fallback
  }
  const walls = Array.isArray(data.walls) ? data.walls : Array.isArray(data.strikes) ? data.strikes : [];
  const allStrikes: OptionStrike[] = walls.map((w) => ({
    pair: w.pair,
    strike: w.strike,
    notional: w.notional, // BILLIONS USD (the 9-pillar-lobe contract — never divide)
    expiry: w.expiry ?? data.date ?? '',
    type: 'unknown' as const,
  }));
  if (allStrikes.length === 0) return undefined;
  const totalNotional = allStrikes.reduce((n, s) => n + s.notional, 0);
  const maxPain = allStrikes.reduce((best, s) => (s.notional > best.notional ? s : best), allStrikes[0]!).strike;
  const full: OptionsExpiryData = { date: data.date ?? allStrikes[0]!.expiry, strikes: allStrikes, maxPain, totalNotional };
  const perPair: Record<string, OptionsExpiryData | undefined> = {};
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD']) {
    const own = allStrikes.filter((s) => s.pair === pair);
    perPair[pair] = own.length > 0
      ? { date: full.date, strikes: own, maxPain, totalNotional: own.reduce((n, s) => n + s.notional, 0) }
      : undefined;
  }
  const componentSpots = data.spots && Object.keys(data.spots).length > 0 ? data.spots : undefined;
  return { data: full, perPair, componentSpots, wallDays: [...new Set(walls.map((w) => w.day ?? '').filter(Boolean))] };
}

/**
 * The IP-zone ZFP step function — the 6D CONFLUENCE pressure-degree table
 * (Bible 4.0 §4.11: 12-14 EXTREME <10% … 0-3 MINIMAL >60%). This is the
 * PIPELINE's computeZfpFromConfluence (engine.ts:124-136) — the IP zones'
 * ZFP is the 6D-confluence step, NOT the canon ladders (the ladders stay for
 * the MDVE-zone defaults). High confluence = strong institutional defense =
 * LOW ZFP (the brain's strength semantics: zfp < 30 = strong).
 */
function zfpFromConfluence6D(confluence: number): number {
  if (confluence >= 12) return 10;  // EXTREME
  if (confluence >= 10) return 20;  // HEAVY
  if (confluence >= 8) return 30;   // MODERATE-HEAVY
  if (confluence >= 6) return 40;   // MODERATE
  if (confluence >= 4) return 55;   // LIGHT
  return 65;                        // MINIMAL
}

/**
 * Wave A1.1 — buildIpZones: convert a pair's PillarResult.levels into IP
 * ZoneModels for the ONE zone map (the engine.ts:539-545 conversion pattern).
 *
 * DECISION-1 (canon): the IP zones are confluence/ZFP/context + SL/TP rungs,
 * NEVER entries. Each IP zone carries:
 *   - `source: 'PILLAR'` → the §8.1 structural gate (isValidEntryAnchor:
 *     mirror.ts:997) rejects a zone whose source ∉ {ORDER_BLOCK, LQZ}, and
 *     the mirror's anchor search skips source==='PILLAR' (additive guard).
 *   - `reactionEvents: []` → the DXY source lane (setup-gen's battle gate)
 *     requires a non-pierced battle on the day — a passive level with no
 *     battles NEVER produces a setup.
 *   - `zfp` from the 6D-confluence step (uniform per pair — the reference).
 *   - `formationMs = model.anchor.anchorMs` — deterministic (the report path
 *     bans wall-clock; the IP level's reference time is the week anchor).
 */
/** The known DXY-basket pair tags (P3's OTC source strings carry them). */
const PAIR_TAGS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'USD/CHF', 'USD/SEK', 'AUD/USD', 'NZD/USD'];

/**
 * Wave A1.1 — isForeignOtcLevel: an OTC option level whose price lives in a
 * DIFFERENT pair's price space must not enter this pillar's map.
 *   - '…→DXY' / 'P8-StrikeDXY' levels are DXY-converted (DXY price space) —
 *     DXY's map only.
 *   - 'P3-OTC-Option-…-<pairTag>' levels carry the strike's OWN pair price —
 *     the strike's own map only (an unconverted foreign strike belongs to its
 *     own pair, never another pillar). With the file's spots missing USD/SEK
 *     the DXY conversion returns null → the raw foreign strike would
 *     otherwise contaminate DXY's map at ~1.14 (wrong space).
 */
function isForeignOtcLevel(lvl: { source: string }, pair: string): boolean {
  if (lvl.source.includes('→DXY') || lvl.source.startsWith('P8-StrikeDXY')) return pair !== 'DXY';
  if (lvl.source.startsWith('P3-OTC-Option')) {
    for (const t of PAIR_TAGS) if (lvl.source.includes(t)) return t !== pair;
    return false;
  }
  return false;
}

export function buildIpZones(
  model: ReturnType<typeof buildChartModel>,
  pillarResult: PillarResult,
  pair: string,
): ZoneModel[] {
  const pipValue = PIP_VALUE[pair] ?? 0.0001;
  const spot = model.spot;
  const zfp = zfpFromConfluence6D(pillarResult.compositeScore);
  const anchorMs = model.anchor.anchorMs;
  return pillarResult.levels
    // Wave A1.1: skip foreign-price-space OTC levels (see isForeignOtcLevel).
    .filter((lvl) => !isForeignOtcLevel(lvl, pair))
    // ZR-7A (the honest-data firewall — spec 6.1): a level whose provenance
    // is a NO_DATA tag NEVER enters the zone map. The honest pillars return
    // [] when their data is absent, so nothing to skip in practice — this is
    // the defense-in-depth anti-fabrication layer: ZERO NO_DATA-scored zones
    // in the map, EVER (the operator's law — the honest zero, never the
    // proxy; a thrown error beats a fabricated level).
    .filter((lvl) => !lvl.provenance?.source.endsWith('_NO_DATA'))
    .map((lvl) => {
    const isSupply = lvl.price > spot;
    const z: ZoneModel = {
      id: `IP|${pair}|${lvl.price.toFixed(5)}`,
      type: isSupply ? 'SUPPLY' : 'DEMAND',
      top: lvl.price + pipValue * 10,
      bottom: lvl.price,
      timeframe: '1H',
      // ZR-7B (DERAILMENT-5 — the spec Part 6.5): the IP levels are confluence-
      // scored — NEVER 'MoM'. The operator: "IP ZONES ARE NOT SUPPLY/DEMAND
      // ZONES THEY ARE MACRO LIQUIDITY ZONES BASED ON INSTITUTIONAL PRESSURE
      // AND WORK *IN CONJUNCTION* WITH S/D/L ZONES ONE CANNOT REPLACE THE
      // OTHER" — a 'MoM' label would drag the IP zones into the S/D battle
      // semantics (the virgin-MoM death-zone rules) — the honest label is
      // 'CONFLUENCE' (the E2's isSupplyZone/isDemandZone still rejects them
      // via the toDxyZone suffix — DECISION-1: the IP zones are NEVER entries).
      classification: 'CONFLUENCE',
      formationMs: anchorMs,
      freshness: 'FRESH',
      reactionEvents: [],
      zfp,
      confluence: pillarResult.compositeScore,
      // ZR-7B (the honest minimal pressure state — the spec Part 6.5): the
      // confluence levels carry the E2ZoneInput pressure field by construction
      // (the S/D battle stamp cannot apply — they have no battles; the stamp
      // runs inside buildChartModel BEFORE this merge — the constructed state
      // is the honest one: lifecycle 'CONFLUENCE', zero battles, fuel intact).
      pressure: {
        lifecycle: 'CONFLUENCE',
        mitigationCount: 0,
        pierced: false,
        absorption: 'INTACT',
        liquidity: [],
      },
    };
    (z as { source?: string }).source = 'PILLAR';
    (z as { ipZone?: boolean }).ipZone = true;
    return z;
  });
}

/** The golden eval week (§7.2 — the STALE bucket's reference window). */
export const EVAL_WEEK: EvalWeek = { start: '2026-07-06', end: '2026-07-10' };

/** Canon session UTC start hours (sessionOf's fixed boundaries). */
const SESSION_HOUR: Record<string, number> = { TOKYO: 0, LONDON: 7, NY: 13, OFF: 21 };

/**
 * ET→UTC offset (canon trading-constants.ts:277 — EDT, July). The ET
 * sub-session labels carry their window verbatim ("London Open 02:00-05:00
 * ET") — this offset converts them to UTC.
 */
const ET_UTC_OFFSET_H = 4;
/** "HH:MM-HH:MM ET" inside a session label (e.g. "London Open 02:00-05:00 ET"). */
const LABELED_WINDOW_RE = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*ET/;

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURE + MODELS
// ═══════════════════════════════════════════════════════════════════════════════

interface RawFeed { pair: string; timeframe: string; bars: OHLCBar[]; error: string | null; }

function loadFixture(): {
  models: { DXY: ReturnType<typeof buildChartModel>; 'EUR/USD': ReturnType<typeof buildChartModel>; 'GBP/USD': ReturnType<typeof buildChartModel> };
  simBars: Record<string, OHLCBar[]>;
  sessionStartPrice: (pair: string, ms: number) => number | null;
  dayOpenPrice: (pair: string, dayStartMs: number) => number | null;
  /** Wave A1.1: the per-pair pillarEngine results (the E1 reintegration). */
  pillarByPair: Record<string, PillarResult>;
  /** Wave A1.1: the parsed options walls bundle (undefined = [NO DATA] honest). */
  optionsWalls: OptionsWallsBundle | undefined;
  /** Wave A1.3: the per-pair scoped bars (≤ ANCHOR_MS) keyed by timeframe —
   *  the prior-week pre-flight's input (the module scopes to ≤ priorAnchor). */
  barsByTf: Record<string, Record<string, OHLCBar[]>>;
} {
  const raw: RawFeed[] = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  // FutureBarLeak at the decision entry — named live file must be clipped.
  for (const f of raw) {
    if (f.timeframe === '1H' || f.timeframe === '4H') {
      decodeMarketData(f.bars, ANCHOR_MS);
    }
  }
  if (!existsSync(WEEK_FIXTURE)) {
    throw new Error(`outcome week fixture missing: ${WEEK_FIXTURE} — rebuild with --until=week`);
  }
  const weekRaw: RawFeed[] = JSON.parse(readFileSync(WEEK_FIXTURE, 'utf8'));
  const barsFor = (pair: string, tf: string): OHLCBar[] =>
    gateBars(
      (raw.find((r) => r.pair === pair && r.timeframe === tf)?.bars ?? [])
        .filter((b) => b.timestamp <= ANCHOR_MS),
    )
      .sort((a, b) => a.timestamp - b.timestamp);
  const simBarsFor = (pair: string): OHLCBar[] =>
    (weekRaw.find((r) => r.pair === pair && r.timeframe === '1H')?.bars ?? [])
      .sort((a, b) => a.timestamp - b.timestamp);
  const spotFor = (pair: string): number => {
    // THE ANALYSIS-POINT SPOT (the §2.1 semantic — the W1 fix): the last 1H
    // close at/before the anchor = the 05:00 bar's close for the 06:00 point
    // (the state the operator sees at the London pre-market analysis moment).
    // NEVER the 4H close (the coarser bar blurs the exact analysis price).
    const b = barsFor(pair, '1H');
    return b.length ? b[b.length - 1]!.close : 0;
  };
  // ── ZR-7B (DERAILMENT-8 — the spec Part 2 Wave ZR-7B change 4): the
  //    pillarEngine runs BEFORE buildChartModel — the ladder build inside the
  //    MDVE (src/mdve/index.ts:232 `options?.pillarResult ?? EMPTY_PILLAR_RESULT`)
  //    receives the REAL pillar result, so the LQZ×IP merge (mergeLqzWithIpZones
  //    — the canon promotion: confluence +2, zfp −5) FIRES with the real
  //    confluence instead of the EMPTY_PILLAR_RESULT. The pillar inputs (bars,
  //    spot, options walls) are all model-independent — no double compute. ──
  const optionsWalls = loadOptionsWalls();
  const pillarByPair: Record<string, PillarResult> = {};
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    // Options wiring (Wave A1.1): DXY receives the FULL walls + the real
    // component spots (the canon's DXY-primacy — EUR/USD strikes → DXY
    // equivalents via P8's ICE K-factor, the file's spots, never fabricated);
    // EUR/USD receives its OWN walls WITHOUT the K-factor spots (its P3 walls
    // stay in pair-native price space — the DXY conversion belongs to DXY's
    // map); GBP has no walls in the image → [NO DATA] (honest — the JUL-6
    // image is EUR/USD-only).
    const optionsData = pair === 'DXY' ? optionsWalls?.data : optionsWalls?.perPair[pair];
    const componentSpots = pair === 'DXY' ? optionsWalls?.componentSpots : undefined;
    // spotFor(pair) === the model's spot (the models literal passes exactly
    // this value) — the pillarEngine's currentPrice is identical either way.
    const pillarResult = pillarEngine({
      instrument: pair,
      bars: barsFor(pair, '1H'),
      currentPrice: spotFor(pair),
      // options_walls.json when present; else undefined — the honest [NO DATA]
      // path (ZR-7A: P8's K-factor scores 0; P3 returns the P3_NO_DATA honest
      // zero — the Options-Derived dimension scores 0, NEVER the histogram).
      optionsData,
      // componentSpots: the file's real spots for DXY (P8's ICE K-factor);
      // FX pairs stay in pair-native space (the K-factor DXY conversion
      // belongs to DXY's map). Never fabricated — the canon.
      componentSpots,
    });
    pillarByPair[pair] = pillarResult;
  }
  const models = {
    // Phase 2 T5: the 15m bars thread in as the LAST param (index.ts:136
    // `bars15m?: OHLCBar[]`, after `options`). The 7th arg (options) now
    // carries the REAL pillarResult (ZR-7B — the LQZ×IP merge wiring). Empty
    // 15m feed → the 15m tier is skipped inside buildChartModel (index.ts:203).
    DXY: buildChartModel('DXY', WEEK, barsFor('DXY', '1H'), barsFor('DXY', '4H'), barsFor('DXY', '30m'), spotFor('DXY'), { pillarResult: pillarByPair['DXY']! }, barsFor('DXY', '15m')),
    'EUR/USD': buildChartModel('EUR/USD', WEEK, barsFor('EUR/USD', '1H'), barsFor('EUR/USD', '4H'), barsFor('EUR/USD', '30m'), spotFor('EUR/USD'), { pillarResult: pillarByPair['EUR/USD']! }, barsFor('EUR/USD', '15m')),
    'GBP/USD': buildChartModel('GBP/USD', WEEK, barsFor('GBP/USD', '1H'), barsFor('GBP/USD', '4H'), barsFor('GBP/USD', '30m'), spotFor('GBP/USD'), { pillarResult: pillarByPair['GBP/USD']! }, barsFor('GBP/USD', '15m')),
  };
  const sessionStartPrice = (pair: string, ms: number): number | null => {
    const bars = barsFor(pair, '1H');
    const d = new Date(ms);
    const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const sess = sessionOf(ms);
    const wStart = dayStart + (SESSION_HOUR[sess] ?? 0) * 3_600_000;
    const wEnd = wStart + 7 * 3_600_000;
    const bar = bars.find((b) => b.timestamp >= wStart && b.timestamp < wEnd && sessionOf(b.timestamp) === sess);
    return bar ? bar.open : null;
  };
  // v4.5.4 FIX 4 — the day-native reference: the first 1H bar of the
  // signal day on the target pair (the mirror's onSide gate input).
  const dayOpenPrice = (pair: string, dayStartMs: number): number | null => {
    const bars = barsFor(pair, '1H');
    const bar = bars.find((b) => b.timestamp >= dayStartMs && b.timestamp < dayStartMs + 24 * 3_600_000);
    return bar ? bar.open : null;
  };

  // ── Wave A1.1 (2026-08-01 — the operator's directive): THE E1
  //    REINTEGRATION — the IP zones MERGED into the ONE zone map (ADDITIVE —
  //    the S/D/L lane byte-identical; the MDVE lane emission untouched).
  //    DECISION-1: the IP zones are confluence/ZFP/context + SL/TP rungs,
  //    NEVER entries — tagged source='PILLAR' so the §8.1 gate rejects them.
  //    ZR-7B: the pillarEngine results are PRECOMPUTED above (the pillar
  //    inputs are model-independent) — this loop only merges (no recompute). ──
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const model = models[pair];
    const pillarResult = pillarByPair[pair]!;
    model.zones = [...model.zones, ...buildIpZones(model, pillarResult, pair)];
  }
  return { models, simBars: { DXY: simBarsFor('DXY'), 'EUR/USD': simBarsFor('EUR/USD'), 'GBP/USD': simBarsFor('GBP/USD') }, sessionStartPrice, dayOpenPrice, pillarByPair, optionsWalls, barsByTf: { DXY: { '1H': barsFor('DXY', '1H'), '4H': barsFor('DXY', '4H'), '30m': barsFor('DXY', '30m'), '15m': barsFor('DXY', '15m') }, 'EUR/USD': { '1H': barsFor('EUR/USD', '1H'), '4H': barsFor('EUR/USD', '4H'), '30m': barsFor('EUR/USD', '30m'), '15m': barsFor('EUR/USD', '15m') }, 'GBP/USD': { '1H': barsFor('GBP/USD', '1H'), '4H': barsFor('GBP/USD', '4H'), '30m': barsFor('GBP/USD', '30m'), '15m': barsFor('GBP/USD', '15m') } } };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE OUTCOME SIMULATION (§3.1 trigger model + §7.2 session-bracketed expiry)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The session bracket [start, end) of a candle ms — the Wave ZR-6E fill
 * model (the operator's 2026-08-04 fill reality — "the trades fill when
 * the market reaches the level — the bracket must cover the pair's ACTUAL
 * reaction time, not the same-day 21:00Z cut"):
 *   ACTIVATION = the E2-designated session window's start on the trade day
 *     (the ET label verbatim: "London Open 02:00-05:00 ET" = 06:00Z; coarse
 *     labels TOKYO/LONDON/NY/OFF = 00/07/13/21Z — sessionOf's canon
 *     boundaries). Orders are NOT live before their intended session (the
 *     pre-session dip is NOT our fill — the audit's phantom-loss class).
 *   EXPIRY = the NEXT trading day's session start (the same session window
 *     on the following day) — the order stays live through the overnight
 *     into the next day's reaction window (the operator's #7 filled
 *     Thursday NY and its TP ran into Friday; the Thursday bracket must
 *     cover the overnight into the Friday reaction). The v4.5.3 same-day
 *     21:00Z cut KILLED the next-day reactions — the STALE/NOT_TRIGGERED
 *     rows (the DXY Tue chain filled Wed 01:00Z — 4 hours past the cut).
 *   WEEKEND RULE (the operator, verbatim: "no holding trades over the
 *     weekend. all trades CLOSE ON FRIDAY before markets close and the
 *     next weeks starts fresh based on Monday market open price action"):
 *     a FRIDAY trade's bracket expires at the trade day's 21:00Z NY close —
 *     the next-day extension NEVER crosses the weekend (a defensive
 *     Sat/Sun anchor clamps the same way — the report path never emits
 *     one). The SL/TP resolution AFTER a fill stays UNBOUNDED (the first
 *     SL/TP touch — the operator's "by market close we can simply move the
 *     trade into breakeven and let it play out for Friday").
 */
export function sessionBracketOf(ms: number, sessionLabel?: string | null): { start: number; end: number } {
  const d = new Date(ms);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = d.getUTCDay();
  const m = sessionLabel ? LABELED_WINDOW_RE.exec(sessionLabel) : null;
  const startMin = m
    ? (Number(m[1]) + ET_UTC_OFFSET_H) * 60 + Number(m[2])
    : (SESSION_HOUR[sessionOf(ms)] ?? 0) * 60;
  const start = dayStart + startMin * 60_000;
  // The weekend rule: Friday (and a defensive Sat/Sun anchor) closes at the
  // trade day's 21:00Z NY close — the extension NEVER crosses the weekend.
  const end = dow === 5 || dow === 6 || dow === 0
    ? dayStart + 21 * 3_600_000
    : dayStart + 86_400_000 + startMin * 60_000; // the NEXT day's session start
  return { start, end };
}

export interface UniqueSimResult {
  outcome: 'WIN' | 'LOSS' | 'OPEN' | 'NOT_TRIGGERED';
  triggerMs: number | null;
  exitMs: number | null;
  exitPrice: number | null;
  /** The leg that filled (E1/E2/…) — null when no leg filled in its bracket. */
  fillLeg: string | null;
  /** Order legs that expired unfilled at their session close (§7.2 evidence). */
  expiredLegs: string[];
  /** Max adverse excursion vs the trade's (blended) entry, in pips — the §6.4 vote input. */
  maePips: number | null;
  detail: string;
}

/**
 * simulateUniqueTrade — the §3.1 model with the §7.2 expiry:
 *   - Each entry leg (E1/E2/E3 — the staggered fill ladder) is an order
 *     bracketed to ITS labeled session; it fills only within that bracket.
 *   - The trade triggers at the FIRST leg that fills (chronological leg
 *     order — the §2.2 merge's total order).
 *   - After the trigger: first SL touch = LOSS, first TP touch = WIN
 *     (pessimistic within-bar ordering: SL checked before TP — the
 *     adversarial canon, verify-mirror-fix.ts:145). One SL, one TP (§2.2).
 *   - MAE is tracked against the trade's (blended) entry for the §6.4
 *     SL_vs_ENTRY vote.
 *   - A trade whose legs ALL expire unfilled is NOT_TRIGGERED (the zombie
 *     "live to Jul 28" fill is dead — audit finding 4/6).
 */
export function simulateUniqueTrade(t: UniqueTrade, bars: OHLCBar[]): UniqueSimResult {
  const pip = PIP_VALUE[t.pair] ?? 0.0001;
  const legs = t.staggeredEntries.length > 0
    ? t.staggeredEntries
    : [{ leg: 'E1', entry: t.entry, weight: 1, session: t.session, triggerMs: t.triggerMs, setupId: t.setupId }];
  const noTrade = (detail: string, expiredLegs: string[] = []): UniqueSimResult => ({
    outcome: 'NOT_TRIGGERED', triggerMs: null, exitMs: null, exitPrice: null,
    fillLeg: null, expiredLegs, maePips: null, detail,
  });
  if (bars.length === 0 || Math.abs(t.entry - t.sl) <= 0) return noTrade('no bars / degenerate geometry');

  const expiredLegs: string[] = [];
  for (const leg of legs) {
    const baseMs = leg.triggerMs ?? t.triggerMs ?? 0;
    if (baseMs <= 0) { expiredLegs.push(`${leg.leg}(no temporal anchor)`); continue; }
    // Wave ZR-6E — the E2-designated session drives the activation:
    //   * the MIRROR lane (EUR/USD, GBP/USD) carries the E2-designated
    //     session VERBATIM (reAnchorMirror's shapeDay.session — mirror.ts
    //     :3546 — "E2 DESIGNATES, E3 OBEYS"; the B1.3 comment names the
    //     fill model as the consumer).
    //   * the DXY SOURCE lane's session field is the DISPLAY mapping
    //     (setup-gen.ts:165-170 — TOKYO→"London Open 02:00-05:00 ET"),
    //     which DEFERS the activation 6h past the battle's canonical
    //     session (the DXY Tue 100.842 Tokyo fill at 01:00-03:00Z was
    //     missed → 3361 STALE). The canonical session of the signal time
    //     (sessionOf(baseMs)) IS the E2 reaction window for the DXY lane —
    //     the mdve-stage TRANSIT_DEFEND precedent (mdve-stage.ts:1226)
    //     resolves the canonical session the same way.
    // The v4.5.3 formation floor is PRESERVED (an order cannot exist before
    // its setup forms — the defended-transit reclaim; the floor never
    // defers the activation past the E2 session's DAY).
    const sessionLabel = t.pair === 'DXY'
      ? sessionOf(baseMs)
      : (leg.session ?? t.session ?? null);
    const bracket = sessionBracketOf(baseMs, sessionLabel);
    const activationMs = Math.max(bracket.start, baseMs);
    const startIdx = bars.findIndex((b) => b.timestamp >= activationMs);
    if (startIdx < 0) { expiredLegs.push(`${leg.leg}(no bars in bracket)`); continue; }
    for (let i = startIdx; i < bars.length; i++) {
      const b = bars[i]!;
      if (b.timestamp >= bracket.end) break;
      const fills = t.direction === 'LONG' ? b.low <= leg.entry : b.high >= leg.entry;
      if (!fills) continue;
      // ── TRIGGERED at this bar — resolve SL/TP from here (SL first, pessimistic) ──
      const triggerMs = b.timestamp;
      let mae = 0;
      for (let j = i; j < bars.length; j++) {
        const x = bars[j]!;
        mae = t.direction === 'LONG'
          ? Math.max(mae, t.entry - x.low)
          : Math.max(mae, x.high - t.entry);
        if (t.direction === 'LONG') {
          if (x.low <= t.sl) {
            return { outcome: 'LOSS', triggerMs, exitMs: x.timestamp, exitPrice: t.sl, fillLeg: leg.leg, expiredLegs, maePips: mae / pip, detail: `SL hit ${new Date(x.timestamp).toISOString()}` };
          }
          if (x.high >= t.tp) {
            return { outcome: 'WIN', triggerMs, exitMs: x.timestamp, exitPrice: t.tp, fillLeg: leg.leg, expiredLegs, maePips: mae / pip, detail: `TP hit ${new Date(x.timestamp).toISOString()}` };
          }
        } else {
          if (x.high >= t.sl) {
            return { outcome: 'LOSS', triggerMs, exitMs: x.timestamp, exitPrice: t.sl, fillLeg: leg.leg, expiredLegs, maePips: mae / pip, detail: `SL hit ${new Date(x.timestamp).toISOString()}` };
          }
          if (x.low <= t.tp) {
            return { outcome: 'WIN', triggerMs, exitMs: x.timestamp, exitPrice: t.tp, fillLeg: leg.leg, expiredLegs, maePips: mae / pip, detail: `TP hit ${new Date(x.timestamp).toISOString()}` };
          }
        }
      }
      return {
        outcome: 'OPEN', triggerMs, exitMs: null, exitPrice: null, fillLeg: leg.leg,
        expiredLegs, maePips: mae / pip, detail: 'open at data end (triggered, never resolved)',
      };
    }
    expiredLegs.push(`${leg.leg}(${leg.session ?? 'session?'})`);
  }
  return noTrade('every order leg expired unfilled within its bracket (§7.2 + ZR-6E next-day session start)', expiredLegs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE CHAIN
// ═══════════════════════════════════════════════════════════════════════════════

export interface WallMapRow {
  pair: string;
  sourceSetupId: string;
  direction: 'LONG' | 'SHORT';
  before: { entry: number; sl: number; tp: number; status: string } | null;
  after: { entry: number; sl: number; tp: number; status: string; slMethod: string; flags: string[] };
}

export interface ChainResult {
  dxySource: TradeSetup[];
  before: { eu: MirrorOutcomeV45[]; gu: MirrorOutcomeV45[] };
  cascade: ReturnType<typeof cascadeV45>;
  dedup: ReturnType<typeof dedupTrades>;
  sims: Map<string, UniqueSimResult>;
  trades: UniqueTradeInput[];
  report: ReturnType<typeof computeAccurateStats>;
  slVsEntry: ReturnType<typeof dedupSLvsEntry>;
  wallMap: WallMapRow[];
  markdown: string;
  /** Wave A1.1: the per-pair 9-pillar results (the E1 reintegration). */
  pillarByPair: Record<string, PillarResult>;
  /** Wave A1.1: the parsed options walls bundle (undefined = [NO DATA] honest). */
  optionsWalls: OptionsWallsBundle | undefined;
  /** Wave A1.3: the per-pair prior-week storylines (the backwards-mapped
   *  macro context the current week's E2 consumes). */
  priorStorylines: Record<string, PriorWeekStoryline>;
  /** Wave ZR-2B: the per-pair CURRENT-week storylines (the E2 narrative on
   *  the E1 pressure — computeWeekStoryline per pair at the E2-core point).
   *  Narrative-only: the selection logic never reads it. */
  storylines: Record<string, WeekStoryline>;
}

/**
 * toDxyZone — converts the MDVE ChartModel's ZoneModel (the zone-map
 * engine's OB-derived S/D zone) into the ShapeBrain's DXYZone input.
 * Maps classification + type → ZoneType enum, freshness → reactionStatus,
 * reactionEvents → reactionCount. Pillars are empty (the mirror lane has
 * no 9-pillar breakdown — honest absence, never fabricated).
 *
 * Wave A1.1 — the IP zones (source==='PILLAR'): converted to a ZoneType
 * string the E2 brain's isSupplyZone/isDemandZone REJECTS ('IP Confluence
 * Supply/Demand' — a suffix-compatible but non-enum string), so
 * projectZoneForDay's designation candidate pools never include them
 * (DECISION-1: the IP zones are NEVER entries). They STILL feed the E2's
 * transition landscape — identifyCurrentShape's zfp distribution / avgZfp /
 * WLS / zonesAbove-Below read floor/ceiling/zfp (type-free) and the
 * '.endsWith("Supply")' piercing detection matches the suffix. The 6D
 * confluence ZFP (zfpFromConfluence6D) drives the E2's shape transitions.
 * EXPORTED — the gate diags (diag-golden-coverage.ts) reuse the pipeline's
 * exact brain input.
 */
export function toDxyZone(z: { id: string; bottom: number; top: number; type: 'SUPPLY' | 'DEMAND'; classification: 'BoM' | 'MoM' | 'CONFLUENCE'; zfp: number; confluence: number; formationMs: number; freshness: string; reactionEvents: { lastTouchMs: number }[]; source?: string; pressure?: { lifecycle: string; mitigationCount: number; pierced: boolean; absorption: string; liquidity: Array<{ kind: string; rungId: string; eaten: boolean; eatenAtMs?: number; defendedAtMs?: number }> } }): DXYZone {
  // ZR-7C — THE E2ZONEINPUT BOUNDARY (the spec Part 8.1): the FULL pressure
  // state crosses into the E2. "Engine 2 consumes the COMPLETE Engine 1
  // output. Every field matters" (Bible 4.0 §4.18). The lifecycle/absorption/
  // liquidity map verbatim; the operativeDefense is computed by the E3-side
  // zone-relevance engine (honest absence here — never fabricated); the
  // reaction direction derives from the battle anatomy (the honest mapping:
  // SWEEP/WICK_REJECT = the attack 're-act', the BODY_DEFEND/CONSOL_DWELL =
  // the approach 'enter').
  const pressure = z.pressure
    ? {
        lifecycle: z.pressure.lifecycle as 'VIRGIN' | 'ACTIVE_1' | 'ACTIVE_2' | 'DEPLETED' | 'FORTRESS' | 'BROKEN' | 'CONFLUENCE',
        mitigationCount: z.pressure.mitigationCount,
        pierced: z.pressure.pierced,
        absorption: z.pressure.absorption as 'INTACT' | 'ABSORBED',
        liquidity: z.pressure.liquidity.map((l) => ({ kind: l.kind as 'NESTED' | 'SHIELD', zoneId: l.rungId, eaten: l.eaten, eatenAtMs: l.eatenAtMs, defendedAtMs: l.defendedAtMs })),
      }
    : undefined;
  const reactionEvents = (z.reactionEvents as Array<{ lastTouchMs: number; anatomy?: string }> | undefined)?.map((e) => ({
    lastTouchMs: e.lastTouchMs,
    dir: (e.anatomy === 'SWEEP' || e.anatomy === 'WICK_REJECT' ? 're-act' : 'enter') as 'enter' | 're-act' | 'leave',
  }));
  // Wave A1.1: the IP-zone branch — DECISION-1 (the §8.1 structural gate +
  // the entry-lane filters exclude the tagged zones; they are confluence/
  // ZFP/context + SL/TP rungs, never entries).
  if (z.source === 'PILLAR') {
    return {
      id: z.id,
      floor: z.bottom,
      ceiling: z.top,
      type: (z.type === 'SUPPLY' ? 'IP Confluence Supply' : 'IP Confluence Demand') as unknown as ZoneType,
      isBoM: false,
      reactionCount: 0,
      reactionStatus: 'virgin',
      confluence: z.confluence,
      pillars: [],
      zfp: z.zfp,
      createdAt: z.formationMs,
      lastTested: null,
      // ZR-7C — the E2ZoneInput boundary: the IP zones' honest CONFLUENCE
      // pressure state (the ZR-7B construction) + the formation + the
      // reaction events cross into the E2.
      pressure,
      formationMs: z.formationMs,
      reactionEvents,
    };
  }
  const isBoM = z.classification === 'BoM';
  let type: ZoneType;
  if (isBoM && z.type === 'SUPPLY') type = ZoneType.BOM_SUPPLY;
  else if (isBoM && z.type === 'DEMAND') type = ZoneType.BOM_DEMAND;
  else if (z.type === 'SUPPLY') type = ZoneType.MOM_SUPPLY;
  else type = ZoneType.MOM_DEMAND;

  const reactionStatus: DXYZone['reactionStatus'] =
    z.freshness === 'FRESH' ? 'virgin' :
    z.freshness === 'DEPLETED' || z.freshness === 'VIOLATED' ? 'depleted' : 'active';

  return {
    id: z.id,
    floor: z.bottom,
    ceiling: z.top,
    type,
    isBoM,
    reactionCount: z.reactionEvents.length,
    reactionStatus,
    confluence: z.confluence,
    pillars: [],
    zfp: z.zfp,
    createdAt: z.formationMs,
    lastTested: z.reactionEvents.length > 0
      ? z.reactionEvents.reduce((mx, ev) => Math.max(mx, ev.lastTouchMs), 0)
      : null,
    // ZR-7C — the E2ZoneInput boundary: the FULL pressure state crosses into
    // the E2 (the S/D zones' stamped lifecycle/absorption/liquidity — the
    // ZR-7A/B E1 layer) + the formation + the reaction events.
    pressure,
    formationMs: z.formationMs,
    reactionEvents,
    side: (z as { side?: 'BUY_SIDE' | 'SELL_SIDE' }).side, // the C-2 fix: the LMV battle vote carried for the E2 candidate admission
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// E2 CORE (Wave G2) — the pair-brain day projection helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The E2 day-direction mapper (the shape-cascade's ShapeDayZone contract):
 * UP → LONG, DOWN → SHORT, RANGE/NEUTRAL → the side with a designated zone
 * (deterministic — a RANGE day designates the side its strongest zone sits
 * on; both sides are emitted by projectZoneForDay anyway, and the mirror's
 * authoritative keyZoneId + mirrorDir paths dominate the fallback).
 */
/**
 * toEntryDir — the E2 CORE day's trade direction from its raw decomposition
 * direction. UP → LONG, DOWN → SHORT. RANGE/NEUTRAL → the E2 PRIMARY SIDE
 * (ZR-6D): the A1.4 RANGE-day designation's keyZoneId IS the top-of-range
 * SUPPLY ("the keyZoneId MUST be the supply for the SHORT mirror's E2-held
 * entry") — the direction that consumes the keyZoneId is SHORT; a DEMAND
 * primary → LONG. This resolves the designation direction/side confusion
 * (the GU Friday was LONG-labelled while its keyZoneId was the SELL_SIDE
 * supply — the operator's #7 Fri SHORT RWL). Unknown primary → the sides
 * heuristic (unchanged): SHORT when a supply designation exists without a
 * demand, else LONG.
 */
function toEntryDir(
  dir: string | undefined,
  sides: { supplyZoneId?: string | null; demandZoneId?: string | null },
  keyZoneType?: string | null,
): 'LONG' | 'SHORT' {
  if (dir === 'UP') return 'LONG';
  if (dir === 'DOWN') return 'SHORT';
  // RANGE / NEUTRAL: the E2's primary side is authoritative — the A1.4
  // RANGE-day top-of-range SUPPLY primary (the direction that consumes the
  // keyZoneId = SHORT); a DEMAND primary → LONG.
  if (keyZoneType === 'SUPPLY') return 'SHORT';
  if (keyZoneType === 'DEMAND') return 'LONG';
  return sides.supplyZoneId && !sides.demandZoneId ? 'SHORT' : 'LONG';
}

/**
 * brainDaysForTranslation — project a ShapeBrain snapshot's dayDecomposition
 * into the cascade-translation contract's cascadeDays input shape
 * ({day, shape, direction, keyZoneId, keyZonePrice, supplyZoneId?,
 * demandZoneId?}). The pair brain's OWN strength-based designations
 * (projectZoneForDay's E1 output — the E2 CORE) feed the GU cascade source
 * and the divergence validation. EXPORTED — the gate diags reuse it.
 */
export function brainDaysForTranslation(snap: ShapePredictionSnapshot): Array<{
  day: string; shape: string; direction: string;
  keyZoneId: string | null; keyZonePrice: number | null;
  supplyZoneId?: string | null; demandZoneId?: string | null;
  // ZR-6D (additive): the E2 primary-side signal + the second demand (the
  // deep demand) — carried for the cascade-translation + the E3 contract.
  keyZoneType?: 'SUPPLY' | 'DEMAND' | null;
  deepDemandZoneId?: string | null;
}> {
  const dec = snap.shapeChain.dayDecomposition ?? [];
  return dec.map((d) => ({
    day: d.day,
    shape: d.shape,
    direction: d.direction ?? 'RANGE',
    keyZoneId: d.keyZoneId ?? null,
    keyZonePrice: d.keyZonePrice ?? null,
    supplyZoneId: d.supplyZoneId ?? null,
    demandZoneId: d.demandZoneId ?? null,
    keyZoneType: (d.keyZoneType as 'SUPPLY' | 'DEMAND' | undefined) ?? null,
    deepDemandZoneId: (d as DayShapePrediction & { deepDemandZoneId?: string }).deepDemandZoneId ?? null,
  }));
}

/**
 * snapshotToCascadedChain — convert a ShapeBrain snapshot (the pair's E2
 * CORE: projectZoneForDay's strength-based day designation) into the
 * CascadedShapeChain shape the mirrors consume. The ShapeDayZone days carry
 * the FULL E2-authoritative contract — dayOpenSpot (the DayBand
 * forward-projected London-open), keyZoneId/keyZonePrice, and BOTH
 * supplyZoneId + demandZoneId (the D16.15 dual-side designation — a SHORT
 * mirror on a chain-LONG day still resolves the day's designated SUPPLY via
 * selectPairNativeZone's mirrorDir path) — the mirrors' shapeDay source.
 * EXPORTED — the gate diags reuse it.
 */
export function snapshotToCascadedChain(snap: ShapePredictionSnapshot, pair: string): CascadedShapeChain {
  const dec = snap.shapeChain.dayDecomposition ?? [];
  return {
    pair,
    storylineBias: snap.shapeChain.storylineBias,
    days: dec.map((d, i) => ({
      dayIdx: i,
      day: d.day,
      shape: d.shape,
      direction: toEntryDir(d.direction, { supplyZoneId: d.supplyZoneId, demandZoneId: d.demandZoneId }, d.keyZoneType),
      keyZoneId: d.keyZoneId ?? null,
      keyZonePrice: d.keyZonePrice ?? null,
      supplyZonePrice: d.supplyZonePrice ?? null,
      demandZonePrice: d.demandZonePrice ?? null,
      floor: d.floor ?? null,
      ceiling: d.ceiling ?? null,
      confidence: d.confidence ?? 0.5,
      dayOpenSpot: d.dayOpenSpot,
      supplyZoneId: d.supplyZoneId ?? null,
      demandZoneId: d.demandZoneId ?? null,
      // ZR-6D (additive): the E2 primary side + the second demand — the E3
      // contract's RANGE-day direction signal + the deep-demand structure.
      keyZoneType: (d.keyZoneType as 'SUPPLY' | 'DEMAND' | undefined) ?? null,
      deepDemandZoneId: (d as DayShapePrediction & { deepDemandZoneId?: string }).deepDemandZoneId ?? null,
      session: d.session ?? d.keyTransitionTime ?? undefined,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE MACRO-WINS FLIP HELPERS (Wave W4 — the C-5 second half, the spec §2.4)
// ═══════════════════════════════════════════════════════════════════════════════

/** Canonical 'Mon'..'Fri' day label (mirror of cascade-translation.ts's
 *  canonicalDay): the cascaded entries carry the SHORT canonical labels
 *  ('Mon', ...); the core chain days carry the decomposition's raw labels
 *  ('Mon (week)', ...) — the flip must normalize BOTH sides to match. Total:
 *  unknown/absent → the label unchanged. */
function flipDayLabel(day: string): string {
  const m = /^(Mon|Tue|Wed|Thu|Fri)/i.exec(day.trim());
  return m ? m[1]![0]!.toUpperCase() + m[1]!.slice(1).toLowerCase() : day;
}

/** THE MACRO-DIVERGENCE STORE ROW (the G3 evidence — data, never dropped):
 *  recordFailure({ component, reason: 'MACRO_DIVERGENCE', context, attempts,
 *  week, pair }) — the EXACT FailureRecord fields (failure-store.ts:50-63;
 *  the reason union at :43 includes 'MACRO_DIVERGENCE'). The store degrades
 *  to the append-only fallback when bun:sqlite is unavailable
 *  (failure-store.ts:19-22) — a thrown write is caught + logged, NEVER a
 *  silent skip. The coreDirection is captured BEFORE the flip (the pre-flip
 *  state — what the macro authority overrode); the macroDirection is the
 *  cascaded Monday's role-derived direction. */
function recordMacroDivergence(
  pair: string,
  divergence: number,
  coreChain: CascadedShapeChain | null,
  cascaded: TranslatedDayMap | null,
): void {
  const coreMonday = coreChain?.days?.[0];
  const cascMonday = cascaded?.entries?.find((e) => e.day === (coreMonday ? flipDayLabel(coreMonday.day) : 'Mon'));
  const coreDirection = coreMonday?.direction ?? null;
  const macroDirection = cascMonday?.role == null ? null : cascMonday.role === 'DEMAND' ? 'LONG' : 'SHORT';
  try {
    recordFailure({
      component: `E2-DIVERGENCE:${pair}`,
      reason: 'MACRO_DIVERGENCE',
      context: { pair, week: WEEK, divergence, coreDirection, macroDirection },
      attempts: 1,
      week: WEEK,
      pair,
    });
  } catch (err) {
    console.error(`[E2-divergence] the MACRO_DIVERGENCE store write failed (${pair}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** THE MACRO-WINS FLIP (the C-5 second half — the OVERHAUL SPEC V2 §2.4):
 *  when a lane's divergence > CASCADE_DIVERGENCE_VALIDATED, the macro
 *  authority wins — each core day whose direction contradicts the cascaded
 *  day's flips to the cascade's direction + designation (the G3 contract:
 *  "the GBP/USD Monday projection direction === 'LONG'; the R divergence
 *  recorded (MACRO_DIVERGENCE); the macro wins" + D59: "the DIRECTION is the
 *  derailment — the unified macro authority must fix it (the mirror law!)").
 *  IDEMPOTENT: only the direction-DIFFERING days copy; an already-flipped
 *  day matches the cascade → no change (a second run double-flips nothing).
 *  The honest absences never flip: a null chain/cascade, a core day with NO
 *  matching cascaded entry, or an unresolved cascade entry (null role/zone) —
 *  the day stands unchanged. The deep demand is nulled (the cascade
 *  designates ONE zone per day — no second-demand evidence; a stale deep
 *  demand from the pre-flip direction would mis-designate). Returns the
 *  flipped-day count. */
function applyDivergenceFlip(
  coreChain: CascadedShapeChain | null,
  cascaded: TranslatedDayMap | null,
  divergence: number | null,
): number {
  if (!coreChain || !cascaded) return 0;                                          // honest absence — no flip, no crash
  if (divergence === null || divergence <= CASCADE_DIVERGENCE_VALIDATED) return 0; // VALIDATED — the core stands (the threshold is STRICTLY GREATER: exactly 0.35 = no flip)
  const entriesByDay = new Map(cascaded.entries.map((e) => [e.day, e]));
  let flipped = 0;
  for (const day of coreChain.days) {
    const entry = entriesByDay.get(flipDayLabel(day.day));
    if (!entry) continue;                                                          // a core day with NO matching cascaded entry stands
    if (entry.role === null || entry.translatedZoneId === null) continue;          // an unresolved cascade day stands (honest absence)
    const macroDirection = entry.role === 'DEMAND' ? 'LONG' : 'SHORT';
    if (day.direction === macroDirection) continue;                                // idempotent — the differing days only
    // THE MACRO WINS — the direction + the designation flip to the cascade's
    day.direction = macroDirection;
    day.keyZoneId = entry.translatedZoneId;
    day.keyZoneType = entry.role;
    day.supplyZoneId = entry.role === 'SUPPLY' ? entry.translatedZoneId : null;
    day.demandZoneId = entry.role === 'DEMAND' ? entry.translatedZoneId : null;
    day.deepDemandZoneId = null;                                                   // no second-demand evidence (honest)
    flipped += 1;
  }
  return flipped;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE E2 CORE BUILDER (Wave G2 — shared by runChainV452 + the gate diags)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * buildShapeBrain — fire ShapeBrain on a pair's OWN zones + its 30m MoM
 * ltfZones (the E2 reaction points). The EXACT pipeline brain input
 * (report-v452's former inline buildShapeForPair — extracted so the gate
 * diags reuse the identical wiring).
 *
 * Wave A1.3 — the prior-week storyline handoff: when a PriorWeekStoryline
 * is supplied, it is attached to the injected ZoneMapSnapshot under the
 * documented field name `priorStoryline` (the parallel agent's shape-brain
 * consumption reads it for buildDayDecomposition + projectZoneForDay — the
 * prior sweep origin anchors the current week's first reaction, the prior
 * defended/broken zones set the current week's role expectations). Absent
 * → the brain runs unchanged (backward compatible — the gate diags call
 * with 2 args).
 */
export async function buildShapeBrain(
  pair: 'DXY' | 'EUR/USD' | 'GBP/USD',
  model: ReturnType<typeof buildChartModel>,
  priorStoryline?: PriorWeekStoryline,
): Promise<ShapePredictionSnapshot | null> {
  const snap: ZoneMapSnapshot = {
    version: 1, timestamp: Date.now(), instrument: pair,
    zones: model.zones.map(toDxyZone),
    spots: { [pair]: model.spot },
  };
  if (priorStoryline) {
    // Wave A1.3: the handoff — the storyline rides the injected zone map
    // (the same object the ShapeBrain's buildDayDecomposition reads). The
    // parallel agent's consumption reads `zoneMap.priorStoryline`.
    (snap as ZoneMapSnapshot & { priorStoryline?: PriorWeekStoryline }).priorStoryline = priorStoryline;
  }
  // T4: 30m MoM zones are E2 reaction points for SS/R shapes (operator
  // 2026-07-31 — "30m is not an origin point for BoM S/D zones - valid for
  // MoM S/D zones to identify E2 reaction points for SS/R shapes"). The
  // snapshot and the model are separate objects — the 30m zones come from
  // the MODEL, mapped through the same toDxyZone converter as the
  // snapshot's zones (setZoneMap's ltfZones arg is DXYZone[]). 30m zones
  // are MoM by construction (bom-mom.ts:118) — the doctrine's exact lane.
  const ltfZones = model.zones
    .filter((z) => z.timeframe === '30m')
    .map(toDxyZone);
  const b = new ShapeBrain();
  b.setZoneMap(snap, ltfZones);
  return b.compute();
}

export interface E2CoreResult {
  dxyChain: CascadedShapeChain | null;
  euCoreChain: CascadedShapeChain | null;
  guCoreChain: CascadedShapeChain | null;
  euCascaded: TranslatedDayMap | null;
  guCascaded: TranslatedDayMap | null;
  dxyBrainDays: ReturnType<typeof brainDaysForTranslation>;
  euCoreDays: ReturnType<typeof brainDaysForTranslation>;
  guCoreDays: ReturnType<typeof brainDaysForTranslation>;
  euDivergence: number | null;
  guDivergence: number | null;
  /** Wave ZR-2B: the per-pair storylines (populated when barsByPairTf is
   *  supplied — the report lane; the diag callers omit it and get the empty
   *  record, their lane unchanged). */
  storylines: Record<string, WeekStoryline>;
}

/**
 * buildE2Core — THE Wave G2 E2 CORE (the operator's three-role architecture):
 *   1. DXY E2 CORE (the pair brain — strength-based, unchanged).
 *   2. EU: DXY-inverse E2 CASCADE (translateCascadeDayMap — structural
 *      equivalent, INVERSE) + the EU E2 CORE (the EU brain's OWN
 *      strength-based days) + computeChainDivergence validation (≤0.35 —
 *      the macro-wins law: beyond the threshold the macro authority wins).
 *   3. GU: EU E2 CASCADE (translateCascadeDayMap(euCoreDays, KEPT)) + the
 *      GU E2 CORE (the RESTORED GU brain run) + the divergence validation.
 * Returns the pair brains' chains (the mirrors' shapeDay source — shapeChains
 * = { dxy, eu: euCoreChain, gu: guCoreChain }) + the cascade translations +
 * the divergence values. Deterministic (no wall-clock). Shared with the gate
 * diags (diag-golden-coverage.ts) so the E2 lane is measured identically.
 *
 * Wave A1.3 — the prior-week storylines (optional): when supplied, each
 * pair's storyline is attached to its brain's injected zone map (the
 * `priorStoryline` handoff field) BEFORE the E2 core runs, so the current
 * week's E2 consumes the prior macro context (buildE2Core reads the pre-
 * flight output; the consumption INSIDE the brain is the parallel agent's
 * wiring — this function only threads the object through).
 */
export async function buildE2Core(
  models: Record<string, ReturnType<typeof buildChartModel>>,
  priorStorylines?: Record<string, PriorWeekStoryline | undefined>,
  // Wave ZR-2B (additive, optional): the fixture's scoped bars keyed by
  // pair → timeframe — the storyline engine's 1H bar input. The diag
  // callers omit it (their lane unchanged, storylines = {}).
  barsByPairTf?: Record<string, Record<string, OHLCBar[]>>,
): Promise<E2CoreResult> {
  const dxyModel = models['DXY']!;
  const euModel = models['EUR/USD']!;
  const guModel = models['GBP/USD']!;

  // ── the three PAIR BRAIN runs (E2 CORE — strength-based designation) ──
  const dxyShape = await buildShapeBrain('DXY', dxyModel, priorStorylines?.['DXY']);
  const euShape = await buildShapeBrain('EUR/USD', euModel, priorStorylines?.['EUR/USD']);
  // THE C-3 FIX (2026-08-11 — Machine C): the GU brain runs with the EU's
  // shape chain INJECTED (the operator VERBATIM — "why is the E2 shape
  // chain for GU not literally the exact same as EU with the only difference
  // between the 2 being the E3 setups?"). The EUR/USD and the GBP/USD share
  // the SAME macro waveform — the GU's E2 designation must consume the EU's
  // SS/BS/R/BS/WL shapes over the GU's OWN zones (the E3 setups differ per
  // pair — the GU's zones → the GU's entries). The GU's OWN shape
  // prediction was degenerate (SS×4+WL — its zone map collapses the chain)
  // → the same designation every day → the identical-trade slop. The EU
  // chain injection makes the GU's day decomposition designate the GU zones
  // per the shared waveform — the per-day variation restored, the ONLY
  // difference between the EU and the GU being the zones (the E3 setups).
  let guShape: ShapePredictionSnapshot | null = null;
  {
    const guBrain = new ShapeBrain();
    const guSnap: ZoneMapSnapshot = {
      version: 1, timestamp: Date.now(), instrument: 'GBP/USD',
      zones: guModel.zones.map(toDxyZone),
      spots: { 'GBP/USD': guModel.spot },
    };
    if (priorStorylines?.['GBP/USD']) {
      (guSnap as ZoneMapSnapshot & { priorStoryline?: PriorWeekStoryline }).priorStoryline = priorStorylines['GBP/USD'];
    }
    const guLtf = guModel.zones.filter((z) => z.timeframe === '30m').map(toDxyZone);
    guBrain.setZoneMap(guSnap, guLtf);
    // INJECT the EU's SHAPE SEQUENCE — the GU's E2 waveform = the EU's (the
    // shared macro — SS/BS/R/BS/WL), the GU's own zones = the E3's raw
    // material (the ONLY difference between the EU and the GU is the E3
    // setups — the operator VERBATIM).
    if (euShape?.shapeChain?.dayDecomposition) {
      guBrain.injectShapeSequence(euShape.shapeChain.dayDecomposition.map((d) => ({ shape: d.shape })));
    }
    guShape = await guBrain.compute();
  }

  // ── Wave ZR-2B — THE STORYLINE per pair (the E2 narrative on the E1
  //    pressure): computeWeekStoryline rides the pair's model (the ZR-1
  //    pressure states on model.zones) + the brain's shape chain + the day
  //    decomposition + the prior-week storyline + the pair's 1H bars.
  //    Narrative-only — the record feeds the cascade ctx (ZR-3's E3
  //    conditional anchors) + the report's THE STORYLINE section; the
  //    selection logic NEVER reads it. Honest absence: a null brain skips
  //    the pair with a log line. Absent barsByPairTf (the diag callers) →
  //    the record stays empty. ──
  const storylines: Record<string, WeekStoryline> = {};
  if (barsByPairTf) {
    const brainRuns: Array<['DXY' | 'EUR/USD' | 'GBP/USD', ReturnType<typeof buildChartModel>, ShapePredictionSnapshot | null]> = [
      ['DXY', dxyModel, dxyShape],
      ['EUR/USD', euModel, euShape],
      ['GBP/USD', guModel, guShape],
    ];
    for (const [pair, model, snap] of brainRuns) {
      if (!snap) {
        console.log(`[storyline] ${pair}: brain null — storyline skipped (honest absence)`);
        continue;
      }
      storylines[pair] = computeWeekStoryline(
        model,
        snap.shapeChain.chain,
        snap.shapeChain.dayDecomposition ?? [],
        priorStorylines?.[pair] ?? null,
        barsByPairTf[pair]?.['1H'] ?? [],
      );
      console.log(`[storyline] ${pair}: warframe=${storylines[pair]!.warframePhase} strength=${storylines[pair]!.strengthComparison.verdict} (${storylines[pair]!.strengthComparison.bullishPips.toFixed(1)}p vs ${storylines[pair]!.strengthComparison.bearishPips.toFixed(1)}p) days=${storylines[pair]!.days.length}`);
    }
  }

  const dxyBrainDays = dxyShape ? brainDaysForTranslation(dxyShape) : [];
  const euCoreDays = euShape ? brainDaysForTranslation(euShape) : [];
  const guCoreDays = guShape ? brainDaysForTranslation(guShape) : [];

  // ── the CASCADE TRANSLATIONS (structural equivalent — never designation) ──
  // DXY-inverse E2 CASCADE → EU: the DXY waveform's day decomposition over
  // EU's OWN zones, side-flipped (INVERSE — DXY SHORT day → EU LONG day).
  const euCascaded: TranslatedDayMap | null = dxyShape
    ? translateCascadeDayMap(dxyBrainDays, dxyModel, euModel, 'INVERSE', euCoreDays)
    : null;
  // EU E2 CASCADE → GU: the EU CORE's days over GU's OWN zones, preserved
  // (KEPT — the operator's "EU E2 Cascade → E2").
  const guCascaded: TranslatedDayMap | null = euShape
    ? translateCascadeDayMap(euCoreDays, euModel, guModel, 'KEPT', guCoreDays)
    : null;

  // ── the PAIR BRAINS' E2 CORE chains (the mirrors' shapeDay source) ──
  const dxyChain: CascadedShapeChain | null = dxyShape
    ? snapshotToCascadedChain(dxyShape, 'DXY')
    : null;
  const euCoreChain: CascadedShapeChain | null = euShape
    ? snapshotToCascadedChain(euShape, 'EUR/USD')
    : null;
  // THE C-3 FIX (2026-08-11 — Machine C): the GU's E2 chain = the GU brain
  // run WITH THE EU's SHAPE SEQUENCE INJECTED (see the guShape construction
  // above — the operator VERBATIM: "why is the E2 shape chain for GU not
  // literally the exact same as EU with the only difference between the 2
  // being the E3 setups?"). The GU's own day decomposition now designates
  // the GU zones per the EU's SS/BS/R/BS/WL waveform — the per-day variation
  // restored, the dayOpenSpot = the GU's OWN day-band (1.33342-based), the
  // zones = the GU's own (the E3 setups differ per pair).
  const guCoreChain: CascadedShapeChain | null = guShape
    ? snapshotToCascadedChain(guShape, 'GBP/USD')
    : null;

  // ── DIVERGENCE VALIDATION (the macro-wins law — the G3 contract + D59):
  //    when the cascade direction contradicts the pair's E2 core beyond the
  //    threshold (CASCADE_DIVERGENCE_VALIDATED — imported, never re-declared),
  //    the MACRO AUTHORITY WINS — the direction + the designation flip to the
  //    cascade's, the divergence recorded in the store (MACRO_DIVERGENCE) ──
  const euDivergence = euCoreChain && euCascaded
    ? computeChainDivergence(euCoreDays, dxyBrainDays)
    : null;
  const guDivergence = guCoreChain && guCascaded
    ? computeChainDivergence(guCoreDays, euCoreDays)
    : null;

  // THE MACRO-WINS FLIP (the C-5 second half — the spec §2.4): the store row
  // is recorded BEFORE the flip (the coreDirection context = the PRE-FLIP
  // state — what the macro overrode); the flip mutates the CORE chains the
  // mirrors consume (shapeChains = the pair brains' days). The GU lane first
  // (the D59 evidence — the GU Monday R:SHORT vs the kept EU LONG); the EU
  // lane mirrors the same law with the DXY-inverse cascade (symmetric — an EU
  // divergence > 0.35 would flip the EU core too). The fixture's EU
  // divergence is 0.00 (VALIDATED) — the EU lane's emissions are UNCHANGED.
  if (guDivergence !== null && guDivergence > CASCADE_DIVERGENCE_VALIDATED) {
    recordMacroDivergence('GBP/USD', guDivergence, guCoreChain, guCascaded);
  }
  if (euDivergence !== null && euDivergence > CASCADE_DIVERGENCE_VALIDATED) {
    recordMacroDivergence('EUR/USD', euDivergence, euCoreChain, euCascaded);
  }
  const guFlippedDays = applyDivergenceFlip(guCoreChain, guCascaded, guDivergence);
  const euFlippedDays = applyDivergenceFlip(euCoreChain, euCascaded, euDivergence);

  // ── the E2 log (the shapeChains wiring evidence) ──
  if (euCoreChain && guCoreChain) {
    console.log('[E2] DXY:', dxyShape?.shapeChain.currentShape, '| EU CORE:', euCoreChain.storylineBias, '| GU CORE:', guCoreChain.storylineBias);
    if (dxyChain) console.log('[E2-CORE] DXY days:', dxyChain.days.map(d => `${d.day}:${d.shape}:${d.direction}:${d.keyZoneId ?? 'none'}(S:${d.supplyZoneId ?? '-'}/D:${d.demandZoneId ?? '-'}/KT:${d.keyZoneType ?? '-'}/open:${d.dayOpenSpot !== undefined ? d.dayOpenSpot.toFixed(5) : '-'})`).join(', '));
    console.log('[E2-CORE] EU days:', euCoreChain.days.map(d => `${d.day}:${d.shape}:${d.direction}:${d.keyZoneId ?? 'none'}(S:${d.supplyZoneId ?? '-'}/D:${d.demandZoneId ?? '-'}/DD:${d.deepDemandZoneId ?? '-'}/KT:${d.keyZoneType ?? '-'}/open:${d.dayOpenSpot !== undefined ? d.dayOpenSpot.toFixed(5) : '-'})`).join(', '));
    console.log('[E2-CORE] GU days:', guCoreChain.days.map(d => `${d.day}:${d.shape}:${d.direction}:${d.keyZoneId ?? 'none'}(S:${d.supplyZoneId ?? '-'}/D:${d.demandZoneId ?? '-'}/DD:${d.deepDemandZoneId ?? '-'}/KT:${d.keyZoneType ?? '-'}/open:${d.dayOpenSpot !== undefined ? d.dayOpenSpot.toFixed(5) : '-'})`).join(', '));
  } else {
    console.log('[E2] ShapeBrain returned null for a pair — E2 CORE skipped (cascadeV45 runs with spot-price heuristics)');
  }
  if (euCascaded) {
    console.log(`[E2-cascade→EU] INVERSE translation: ${euCascaded.entries.length} entries | structural divergence=${euCascaded.divergence === null ? 'n/a' : euCascaded.divergence.toFixed(2)}`);
  }
  if (guCascaded) {
    console.log(`[E2-cascade→GU] KEPT translation: ${guCascaded.entries.length} entries | structural divergence=${guCascaded.divergence === null ? 'n/a' : guCascaded.divergence.toFixed(2)}`);
  }
  if (euDivergence !== null) {
    console.log(`[E2-divergence] EU core vs DXY-inverse cascade: ${euDivergence.toFixed(2)}${euDivergence > CASCADE_DIVERGENCE_VALIDATED ? ` (>${CASCADE_DIVERGENCE_VALIDATED.toFixed(2)} — MACRO WINS — ${euFlippedDays} day(s) flipped to the inverse cascade)` : ` (<=${CASCADE_DIVERGENCE_VALIDATED.toFixed(2)} — VALIDATED)`}`);
  }
  if (guDivergence !== null) {
    console.log(`[E2-divergence] GU core vs EU cascade: ${guDivergence.toFixed(2)}${guDivergence > CASCADE_DIVERGENCE_VALIDATED ? ` (>${CASCADE_DIVERGENCE_VALIDATED.toFixed(2)} — MACRO WINS — ${guFlippedDays} day(s) flipped to the kept cascade)` : ` (<=${CASCADE_DIVERGENCE_VALIDATED.toFixed(2)} — VALIDATED)`}`);
  }

  return {
    dxyChain, euCoreChain, guCoreChain,
    euCascaded, guCascaded,
    dxyBrainDays, euCoreDays, guCoreDays,
    euDivergence, guDivergence,
    storylines,
  };
}

/** runChainV452 — the full §9.1 chain, deterministic. Called twice by the
 *  harness (byte-identical determinism) and once by main (file write).
 *  Phase 6 P1 + Wave G2 (operator 2026-07-31) — THE INTERLEAVED PIPELINE:
 *    DXY E1→E2→E3 FULL first | EU E1 → DXY-inverse E2 CASCADE (TRANSLATION)
 *    → EU E2 CORE → divergence validation → DXY-inverse E3 cascade
 *    (zone-anchored) → E3 | GU E1 → EU E2 CASCADE → GU E2 CORE → divergence
 *    → EU E3 cascade (zone-anchored) → E3.
 *  The CASCADE TRANSLATES (structural equivalent — cascade-translation.ts);
 *  the PAIR BRAINS' E2 CORE DESIGNATES (strength-based, exactly like DXY —
 *  ShapeBrain's projectZoneForDay day decomposition over the pair's OWN
 *  zones); the cascade VALIDATES (computeChainDivergence ≤ 0.35 — the macro-
 *  wins law: beyond the threshold the MACRO AUTHORITY WINS the emission). The
 *  E3 cascade is cascadeV45's
 *  single deterministic pass: the EU lane mirrors the DXY setups (inverse),
 *  the GU lane mirrors the ACTIVE EU mirrors (the EU E3 cascade — mirror.ts
 *  :2463), both zone-anchored via shapeChains = the PAIR BRAINS' days
 *  (NOT the cascade's translated days). NO price conversion (§15 anti-goal). */
export async function runChainV452(): Promise<ChainResult> {
  const { models, simBars, sessionStartPrice, dayOpenPrice, pillarByPair, optionsWalls, barsByTf } = loadFixture();

  // ═══ Wave A1.3 — THE PRIOR-WEEK BACKWARDS-MAPPING PRE-FLIGHT (the
  //   operator's 2026-08-01 directive): the previous week's E1/E2 pipeline
  //   runs on the AVAILABLE HISTORICAL DATA (bars ≤ the prior anchor ONLY —
  //   the current week's bars are NEVER visible to it) and produces the
  //   macro storyline context the current week's E2 brain consumes. Runs
  //   BEFORE the current E2 (buildE2Core below). The golden truth for the
  //   DXY prior week (computed, NEVER hardcoded): the Jul 3 sweep origin
  //   100.603. ═══
  const priorStorylines: Record<string, PriorWeekStoryline> = {};
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const storyline = await runPriorWeekPreflight(pair, {
      barsByTf: barsByTf[pair],
      weekStartMs: WEEK_START_MS,
      anchorMs: ANCHOR_MS,
    });
    priorStorylines[pair] = storyline;
    // The concise pre-flight log (the wiring evidence):
    console.log(`[prior-week] ${pair} sweepOrigin=${storyline.sweepOrigin ? storyline.sweepOrigin.price.toFixed(5) : 'none'}@${storyline.sweepOrigin ? new Date(storyline.sweepOrigin.ms).toISOString() : '-'} range=${storyline.rangeBottom ? storyline.rangeBottom.price.toFixed(5) : '-'}..${storyline.rangeTop ? storyline.rangeTop.price.toFixed(5) : '-'} defended=${storyline.defendedZones.filter(z => z.status === 'DEFENDED').length} broken=${storyline.defendedZones.filter(z => z.status === 'BROKEN').length} untested=${storyline.defendedZones.filter(z => z.status === 'UNTESTED').length} roleReversals=${storyline.roleReversals.length} depleted=${storyline.depletedZones.length} chain=${storyline.priorShapeChain.map(c => c.shape).join('→') || '-'}`);
  }

  // ── E1: THE MODELS (buildChartModel per pair — own zones, bars ≤ the
  //    week anchor; loadFixture). The interleaved pipeline consumes these
  //    in order: DXY FULL first, then EU (DXY-inverse cascades), then GU
  //    (EU cascades). ──
  const dxyModel = models.DXY;
  const euModel = models['EUR/USD'];
  const guModel = models['GBP/USD'];

  // ═══ THE INTERLEAVED PIPELINE (operator 2026-07-31, Phase 6 P1 + Wave G2) ═══
  //   DXY E1/E2/E3 FULL FIRST | EU E1 → DXY-inverse E2 CASCADE (TRANSLATION)
  //   → EU E2 CORE → divergence → DXY-inverse E3 cascade (ZONE-ANCHORED) → E3
  //   | GU E1 → EU E2 CASCADE → GU E2 CORE → divergence → EU E3 cascade
  //   (ZONE-ANCHORED) → E3.
  //
  // THE THREE ROLES (Wave G2 — the operator's architecture, literal):
  //   CASCADE = STRUCTURAL EQUIVALENT — translateCascadeDayMap finds the
  //             receiving pair's structural twin of the source's designated
  //             zone (same element class, formation ±48h, on-side). It
  //             TRANSLATES — it does NOT designate.
  //   CORE    = E1 STRENGTH-BASED — the pair brain's OWN ShapeBrain run
  //             (projectZoneForDay's strength designation over the pair's
  //             OWN zones, exactly like DXY — the Phase-5 Δ0.4p machinery).
  //   CASCADE VALIDATES — computeChainDivergence ≤ 0.35 (the operator's 35%
  //             rule — the macro-wins law, the G3 contract + D59): when the
  //             cascade direction contradicts the pair's E2 core beyond the
  //             threshold, the MACRO AUTHORITY WINS the emission.
  // The mirrors consume the PAIR BRAINS' ShapeDayZone days (shapeChains =
  // { dxy: dxyBrain, eu: euCoreBrain, gu: guCoreBrain }) — the shapeDay
  // threading in cascadeV45 → reAnchorMirror → selectPairNativeZone makes
  // the designated zone AUTHORITATIVE. NO price conversion (§15 anti-goal —
  // never EU_price = f(DXY_price)).

  // ── 1. DXY — FULL (E1 → E2 → E3): COMPLETE FIRST ──
  // E1: buildChartModel('DXY') (loadFixture — the models object above).
  // E2: the DXY E2 CORE (buildE2Core runs the DXY brain FIRST — the cascade
  // source for the EU lane).
  // E3: the frozen source lane — COMPLETE FIRST. Every EU/GU mirror is
  // cascaded from THIS lane (the DXY-inverse / EU-cascade E3 sources).
  const dxySource = generateSourceSetupsV45(dxyModel);

  // ── 2+3. THE E2 CORE: EU (DXY-inverse cascade → EU E2 CORE → divergence)
  //    + GU (EU E2 cascade → GU E2 CORE → divergence). The pair brains'
  //    strength-based chains are the mirrors' shapeDay source (shapeChains =
  //    { dxy: dxyBrain, eu: euCoreBrain, gu: guCoreBrain }) — the CASCADE
  //    translates + validates (≤35% divergence — the macro-wins law: beyond
  //    the threshold the MACRO AUTHORITY WINS the emission), it never
  //    designates. GU's E3 cascade is cascadeV45's internal EU→GU lane — GU
  //    mirrors are sourced from the ACTIVE EU mirrors (mirror.ts:2463, §9.6
  //    Stage 3), NEVER the raw DXY setups. ──
  const e2 = await buildE2Core(models, priorStorylines, barsByTf);

  const shapeChains: { dxy?: CascadedShapeChain; eu: CascadedShapeChain; gu: CascadedShapeChain } | null =
    e2.euCoreChain && e2.guCoreChain
      ? { ...(e2.dxyChain ? { dxy: e2.dxyChain } : {}), eu: e2.euCoreChain, gu: e2.guCoreChain }
      : null;

  // ── the BEFORE lane (v4.5.x defaults — the pre-refinement geometry) ──
  const before = cascadeV45(dxySource, models, { sessionStartPrice });

  // ── the AFTER lane (v4.5.2: §5.2 wall TP + §5.3 golden SL + §4.4
  //    qualifier + §4.2 emission cap) — the INTERLEAVED E3 cascade: the
  //    EU lane mirrors the DXY setups (DXY-inverse E3, zone-anchored via
  //    shapeChains.eu — the EU CORE's days); the GU lane mirrors the ACTIVE
  //    EU mirrors (the EU E3 cascade, zone-anchored via shapeChains.gu —
  //    the GU CORE's days) ──
  const cascade = cascadeV45(dxySource, models, {
    sessionStartPrice,
    dayOpenPrice,
    v452: { goldenSlLmv: true, consumedPoolQualifier: true, guAnchorPoolV453: true },
    shapeChains,  // E2 CORE: the pair brains' strength-based designations (EU: EU CORE, GU: GU CORE)
    // WAVE I1 (the 3D refinement machine — FIX PLAN §3/§10): the CASCADE
    // TRANSLATION days (buildE2Core's euCascaded/guCascaded — the DXY-inverse
    // map for EU, the EU-KEPT map for GU) threaded through the mirror context
    // so the machine can audit Layer 2 (C1-C6) + run the RE_TRANSLATE loop.
    // Null-guarded inside reAnchorMirror (absent → the pre-Wave-I lane).
    translatedDays: { eu: e2.euCascaded, gu: e2.guCascaded },
    // WAVE ZR-2B — the per-pair storylines thread through the cascade ctx
    // for ZR-3+'s consumption (the E3 conditional anchors read the trade's
    // storyline — the TP's E2-projected zone + the refinement machine's
    // rejection contexts). Additive: the pre-ZR-3 lanes never read the
    // field (byte-identical behavior). The local type extension (the
    // ShapeDayFields precedent) keeps mirror.ts untouched — ZR-3 promotes
    // the field into MirrorReanchorContext when it consumes it.
    storylines: e2.storylines,
  } as Omit<MirrorReanchorContext, 'sourceFormationMs'> & { storylines?: Record<string, WeekStoryline> });

  const activeMirrors = [...cascade.eu, ...cascade.gu].filter((m) => m.status === 'ACTIVE');

  // ── WAVE ZR-4A: the Law-27 trade chaining (the TP of trade N = the
  //    entry of trade N+1). The chained reaction trades are FIRST-CLASS
  //    rows: minted per pair from the emitted primaries (the DXY source
  //    lane + the ACTIVE EU/GU mirror lane — "the TP of DXY trade N = the
  //    entry of DXY trade N+1; the EU/GU mirrors chain identically"),
  //    validated against the E1 zone map (the entry zone at the parent's
  //    TP + the ZR-1 ladder-steps SL + the ZR-3 strength-driven TP at the
  //    first structural wall) + the 3.0 RRR floor, then appended BEFORE
  //    the dedup so they dedup against the primaries, sim the outcomes,
  //    and count in the stats. The engine's in-engine §1.2 identity dedup
  //    (the same anchorBucket the frozen dedup consumes) guarantees the
  //    primaries stay byte-identical — a colliding chain is suppressed in
  //    the engine, never merged into a primary's stagger group. ──
  const CHAINED_SESSION_HOUR: Record<string, number> = { TOKYO: 0, LONDON: 7, NY: 13, OFF: 21 };
  const chainedRows: DedupSetup[] = [];
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD'] as const) {
    const primaries: ChainedTradeInput[] =
      pair === 'DXY'
        ? dxySource
            .filter((s) => s.direction === 'LONG' || s.direction === 'SHORT')
            .map((s) => {
              const dayM = /@ (\d{4}-\d{2}-\d{2}) (TOKYO|LONDON|NY|OFF)$/.exec(s.shapeTrigger);
              return {
                pair,
                direction: s.direction as 'LONG' | 'SHORT',
                entry: s.entry,
                sl: s.sl,
                tp: s.tp,
                day: dayM ? dayM[1]! : '',
                session: String(s.session),
                sourceSetupId: s.setupId,
              };
            })
        : (pair === 'EUR/USD' ? cascade.eu : cascade.gu)
            .filter((m) => m.status === 'ACTIVE')
            .map((m) => ({
              pair,
              direction: m.direction,
              entry: m.entry,
              sl: m.sl,
              tp: m.tp,
              day: m.tradeDay,
              session: m.session ?? '',
              anchorZoneId: m.anchorZoneId,
              sourceSetupId: `MIRV45-${m.pair}-${m.sourceSetupId}`,
            }));
    const chained = generateChainedTrades(pair, primaries, models[pair], {
      pipValue: PIP_VALUE[pair] ?? 0.0001,
      categoryFloor: 3.0,
      // ZR-6D: the chain extends to depth 3 — the operator's Wed triple
      // (EU #4→#5→#6) + the Thu→Fri (#7→#8) run 2-3 generations deep. The
      // honest gates (the RRR floor, the structural wall, the week's end, the
      // in-engine §1.2 dedup) bound every extension — the depth is a ceiling,
      // never a mandate.
      maxDepth: 3,
    });
    for (const c of chained) {
      const dayStartMs = Date.UTC(Number(c.day.slice(0, 4)), Number(c.day.slice(5, 7)) - 1, Number(c.day.slice(8, 10)));
      chainedRows.push({
        setupId: c.sourceSetupId, // CHAIN-<parent>-D<depth> — the report's provenance trace
        pair: c.pair,
        direction: c.direction,
        entry: c.entry,
        sl: c.sl,
        tp: c.tp,
        day: c.day,
        session: c.session,
        // the chained order activates at its OWN day/session bracket start
        // (the reaction window — the parent's TP fill is the trigger event;
        // the sim fills the moment price touches the entry = the parent's TP)
        triggerMs: dayStartMs + (CHAINED_SESSION_HOUR[c.session] ?? 7) * 3_600_000,
        entryZone: { defendedEdge: c.entry }, // the §1.2 identity anchor = the parent's TP edge
      });
    }
  }

  // ── §9.1: floor rows → dedup ──
  const rows = [...floorSetupsToDedupRows(dxySource, activeMirrors), ...chainedRows];
  const dedup = dedupTrades(rows);

  // ── outcome simulation per unique trade (§3.1 + §7.2) ──
  const sims = new Map<string, UniqueSimResult>();
  for (const t of dedup.uniqueTrades) {
    sims.set(t.trade_id, simulateUniqueTrade(t, simBars[t.pair] ?? []));
  }

  // ── the accurate-stats input (§6.3 mandatory fields) ──
  const trades: UniqueTradeInput[] = dedup.uniqueTrades.map((t) => {
    const sim = sims.get(t.trade_id)!;
    const legs = t.staggeredEntries.length > 0 ? t.staggeredEntries : [];
    return {
      trade_id: t.trade_id,
      pair: t.pair,
      direction: t.direction,
      day: t.day,
      intendedSession: legs[0]?.session ?? t.session ?? null,
      entry: t.entry,
      sl: t.sl,
      tp: t.tp,
      is_staggered: t.is_staggered,
      staggeredEntries: legs.map((l) => ({ leg: l.leg, entry: l.entry, weight: l.weight, session: l.session, triggerMs: l.triggerMs })),
      triggerMs: sim.triggerMs,
      exitMs: sim.exitMs,
      exitPrice: sim.exitPrice,
      outcome: sim.outcome,
      provenance: t.provenance.split(' + '),
    };
  });

  const report = computeAccurateStats(trades, EVAL_WEEK);

  // ── §6.4: the SL_vs_ENTRY votes on the unique resolved set ──
  const voteRows: SLvsEntryVoteRow[] = [];
  for (const t of dedup.uniqueTrades) {
    const sim = sims.get(t.trade_id)!;
    if (sim.outcome !== 'WIN' && sim.outcome !== 'LOSS') continue;
    if (sim.maePips === null) continue;
    const pip = PIP_VALUE[t.pair] ?? 0.0001;
    voteRows.push({
      pair: t.pair,
      direction: t.direction,
      anchorPrice: t.entryZone?.defendedEdge ?? t.entry,
      day: t.day,
      outcome: sim.outcome,
      maePips: Math.max(0, sim.maePips),
      slDistPips: Math.abs(t.entry - t.sl) / pip,
    });
  }
  const slVsEntry = dedupSLvsEntry(voteRows);

  // ── the wall-map before/after table (every constructed EU/GU mirror) ──
  const beforeByKey = new Map<string, MirrorOutcomeV45>();
  for (const m of [...before.eu, ...before.gu]) beforeByKey.set(`${m.pair}|${m.sourceSetupId}`, m);
  const wallMap: WallMapRow[] = [...cascade.eu, ...cascade.gu].map((m) => {
    const b = beforeByKey.get(`${m.pair}|${m.sourceSetupId}`) ?? null;
    return {
      pair: m.pair,
      sourceSetupId: m.sourceSetupId,
      direction: m.direction,
      before: b ? { entry: b.entry, sl: b.sl, tp: b.tp, status: b.status } : null,
      after: { entry: m.entry, sl: m.sl, tp: m.tp, status: m.status, slMethod: m.slMethod, flags: m.flags },
    };
  });

  const markdown = renderReport({ dxySource, before: { eu: before.eu, gu: before.gu }, cascade, dedup, sims, trades, report, slVsEntry, wallMap, pillarByPair, optionsWalls, priorStorylines, storylines: e2.storylines });
  return { dxySource, before: { eu: before.eu, gu: before.gu }, cascade, dedup, sims, trades, report, slVsEntry, wallMap, markdown, pillarByPair, optionsWalls, priorStorylines, storylines: e2.storylines };
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE REPORT RENDERER (deterministic — no wall-clock)
// ═══════════════════════════════════════════════════════════════════════════════

const f5 = (n: number): string => n.toFixed(5);
const f2 = (n: number): string => n.toFixed(2);
/**
 * Price precision for the trade table: FX pairs at 7dp (the LMV
 * defendedEdge reductions carry sub-0.1-pip fractions — 5dp rounding on a
 * ~14-pip-risk trade shifts its R by ~0.01, breaking the independent R
 * recomputation; 7dp keeps the printed fields exact to ~0.0001R). DXY at
 * 5dp (its pip is 0.01 — 5dp is exact).
 */
const fp = (n: number, pair: string): string => (pair === 'DXY' ? n.toFixed(5) : n.toFixed(7));
const iso = (ms: number | null): string => (ms === null ? '—' : new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + 'Z');

function statsLine(name: string, s: { n: number; total: number; wins: number; losses: number; winRate: number; totalR: number; avgRrr: number }): string {
  return `| ${name} | ${s.total} | ${s.wins}W/${s.losses}L | ${s.winRate}% (n=${s.n}) | ${s.totalR >= 0 ? '+' : ''}${f2(s.totalR)}R | ${f2(s.avgRrr)}x |`;
}

function tradeRow(t: ReportTrade): string {
  const legs = t.is_staggered
    ? t.staggeredEntries.map((l) => `${l.leg}@${fp(l.entry, t.pair)}(${l.session ?? '?'})`).join(',')
    : '—';
  return `| ${t.trade_id} | ${t.pair} | ${t.direction} | ${t.day} | ${fp(t.blendedEntry, t.pair)} | ${fp(t.sl, t.pair)} | ${fp(t.tp, t.pair)} | ${t.exitPrice !== null ? fp(t.exitPrice, t.pair) : '—'} | ${t.outcome} | ${t.realizedR !== null ? (t.realizedR >= 0 ? '+' : '') + f2(t.realizedR) : '—'} | ${f2(t.plannedRrr)} | ${t.is_staggered} | ${legs} | ${t.triggered_in_week} | ${t.resolved_in_week} | ${t.n} | ${t.sessionHonesty.honestLabel} | ${t.provenance.join(' + ')} |`;
}

const TRADE_TABLE_HEADER =
  '| trade_id | pair | dir | day | entry(blend) | sl | tp | exit | outcome | R | plannedRRR | is_staggered | staggeredEntries | triggered_in_week | resolved_in_week | n | session (honest) | provenance |\n' +
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';

function renderReport(c: Omit<ChainResult, 'markdown'>): string {
  const L: string[] = [];
  const { report, dedup, cascade, slVsEntry, wallMap, sims, pillarByPair, optionsWalls, storylines } = c;
  L.push('# PLUTUS v4.5.2 — THE ACCURATE REPORT (deduplicated, honest, n on everything)');
  L.push('');
  L.push(`**Eval week:** ${EVAL_WEEK.start} → ${EVAL_WEEK.end} (anchor 2026-07-10T17:00Z) | **Chain:** generateSourceSetupsV45 → cascadeV45 (v4.5.2 refinements: weekly-wall TP §5.2, golden SL §5.3, consumed-pool qualifier §4.4, emission cap §4.2) → dedupTrades (§1/§2) → outcome sim (§3.1 + §7.2 + ZR-6E bracket: the E2 session start on the trade day → the NEXT day's session start, the weekend-close rule) → computeAccurateStats (§6) `);
  L.push(`**Rows in → unique trades:** ${dedup.stats.inputRows} → ${dedup.stats.uniqueTrades} (dropped ${dedup.stats.droppedDuplicateRows} duplicate rows; staggered groups ${dedup.stats.staggeredGroups}; max merge ${dedup.stats.maxGroupSize})`);
  L.push('**Headline semantics (§7.2):** HEADLINE = triggered_in_week AND resolved_in_week. IN-WEEK-TRIGGERED (operator default) = triggered_in_week (may resolve post-week). STALE = either false — NEVER in the weekly headline.');
  L.push('');

  // ── HEADLINE STATS ──
  L.push('## 1. HEADLINE STATS (unique set only — every stat carries its n)');
  L.push('');
  L.push('| bucket | trades | W/L | win rate (n) | total R | avg planned RRR (wins) |');
  L.push('|---|---|---|---|---|---|');
  L.push(statsLine('HEADLINE (in-week trigger+resolve)', report.headline));
  L.push(statsLine('IN-WEEK-TRIGGERED (operator default)', report.inWeekTriggered));
  L.push(statsLine('OVERALL (full unique set)', report.overall));
  L.push('');
  L.push(`**STALE bucket:** ${report.staleCount} unique trades (post-week trigger or resolution — reported separately, NOT in the headline).`);
  L.push('');

  // ── PER-PAIR ──
  L.push('## 2. PER-PAIR BREAKDOWN (unique set)');
  L.push('');
  L.push('| pair | headline trades | headline W/L | headline WR (n) | headline R | overall trades | overall W/L | overall WR (n) | overall R |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const [pair, s] of Object.entries(report.perPair).sort()) {
    L.push(`| ${pair} | ${s.headline.total} | ${s.headline.wins}W/${s.headline.losses}L | ${s.headline.winRate}% (n=${s.headline.n}) | ${s.headline.totalR >= 0 ? '+' : ''}${f2(s.headline.totalR)}R | ${s.overall.total} | ${s.overall.wins}W/${s.overall.losses}L | ${s.overall.winRate}% (n=${s.overall.n}) | ${s.overall.totalR >= 0 ? '+' : ''}${f2(s.overall.totalR)}R |`);
  }
  L.push('');

  // ── THE TRADE TABLE ──
  L.push('## 3. THE DEDUPLICATED TRADE TABLE (every §6.3 mandatory field)');
  L.push('');
  L.push(TRADE_TABLE_HEADER);
  for (const t of report.trades) L.push(tradeRow(t));
  L.push('');

  // ── STALE BUCKET ──
  L.push('## 4. THE STALE BUCKET (post-week trigger/resolution — honest, separate)');
  L.push('');
  L.push(TRADE_TABLE_HEADER);
  for (const t of report.stale) L.push(tradeRow(t));
  L.push('');
  L.push('Stale-fill detail (§7.2/§7.3):');
  for (const t of report.stale) {
    const sim = sims.get(t.trade_id);
    L.push(`- ${t.trade_id}: outcome=${t.outcome} trigger=${iso(t.triggerMs)} exit=${iso(t.exitMs)} — ${sim?.detail ?? ''}${sim && sim.expiredLegs.length > 0 ? `; expired legs: ${sim.expiredLegs.join(', ')}` : ''}`);
  }
  L.push('');

  // ── SL_vs_ENTRY ──
  L.push('## 5. SL_vs_ENTRY ANALYSIS (§6.4 — votes on UNIQUE trades only)');
  L.push('');
  L.push(`Raw rows: ${slVsEntry.rawCount} → unique votes: ${slVsEntry.uniqueCount}. Raw tally would be: SL_TOO_WIDE=${slVsEntry.rawTally.SL_TOO_WIDE}, ENTRY_TOO_EARLY=${slVsEntry.rawTally.ENTRY_TOO_EARLY}, BALANCED=${slVsEntry.rawTally.BALANCED}. **Deduped tally: SL_TOO_WIDE=${slVsEntry.uniqueTally.SL_TOO_WIDE}, ENTRY_TOO_EARLY=${slVsEntry.uniqueTally.ENTRY_TOO_EARLY}, BALANCED=${slVsEntry.uniqueTally.BALANCED}** (the v4.5.1 "SL TOO WIDE=25" was ~11 unique wins with 10 votes from ONE GU trade).`);
  L.push('');
  L.push('| identity | pair | outcome | util (MAE/SL-dist) | classification | rows collapsed |');
  L.push('|---|---|---|---|---|---|');
  for (const v of slVsEntry.uniqueVotes) {
    L.push(`| ${v.identity} | ${v.pair} | ${v.outcome} | ${f2(v.util)} | ${v.classification} | ${v.rowsCollapsed} |`);
  }
  L.push('');

  // ── THE WALL MAP ──
  L.push('## 6. THE EU/GU WALL MAP (§5.2/§5.3 — every constructed mirror, before → after)');
  L.push('');
  L.push('| pair | dir | source | E before→after | SL before→after | TP before→after | status | SL method / justification |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const w of wallMap) {
    const src = w.sourceSetupId.replace(/^SRC-DXY-/, '').slice(0, 40);
    const just = w.after.flags.find((f) => f.startsWith('UTIL_GUARD_KEEP') || f.startsWith('PROBE_GUARD'));
    L.push(`| ${w.pair} | ${w.direction} | ${src} | ${w.before ? f5(w.before.entry) : '—'} → ${f5(w.after.entry)} | ${w.before ? f5(w.before.sl) : '—'} → ${f5(w.after.sl)} | ${w.before ? f5(w.before.tp) : '—'} → ${f5(w.after.tp)} | ${w.before?.status ?? '—'} → ${w.after.status} | ${w.after.slMethod}${just ? ` — ${just.split(':')[0]}` : ''} |`);
  }
  L.push('');

  // ── EMISSION CAP + CASUALTIES ──
  L.push('## 7. THE EMISSION CAP + DOCUMENTED CASUALTIES (§4.2/§11)');
  L.push('');
  const capped = cascade.discarded.filter((m) => m.status === 'EMISSION_CAPPED');
  L.push(`Emission-capped mirrors: ${capped.length} (MAX_MIRRORS_PER_ANCHOR_PER_DAY=1 — the GU ×10 is dead):`);
  for (const m of capped) L.push(`- ${m.pair} ${m.direction} @ ${f5(m.entry)} (${m.sourceSetupId}) — ${m.discardReason ?? ''}`);
  L.push('');
  const otherDiscards = cascade.discarded.filter((m) => m.status !== 'EMISSION_CAPPED');
  L.push(`Other documented casualties: ${otherDiscards.length}:`);
  for (const m of otherDiscards) L.push(`- [${m.status}] ${m.pair} ${m.direction} @ ${f5(m.entry)} — ${m.discardReason ?? ''}`);
  L.push('');

  // ── Wave A1.1: THE E1 REINTEGRATION — the 9-pillar IP zone map (per pair) ──
  L.push('## 8. E1 REINTEGRATION — THE 9-PILLAR IP ZONE MAP (Wave A1.1)');
  L.push('');
  L.push('The IP zones (pivots, MAs, options P3/P8, analyst P4, structural P5, Fib P6, regime P9) now enter the ONE zone map — ADDITIVELY (the S/D/L lane byte-identical). Their ZFP = the 6D-confluence pressure-degree step (Bible 4.0 §4.11), which conditions the E2 shape transitions.');
  L.push('');
  L.push('| pair | IP zones | 6D composite | IP ZFP | options dimension | Options walls |');
  L.push('|---|---|---|---|---|---|');
  for (const [pair, pr] of Object.entries(pillarByPair).sort()) {
    // The MAP count = the levels that actually merged (foreign OTC levels
    // filtered out — isForeignOtcLevel), not the raw pillar level count.
    const ipCount = pr.levels.filter((lvl) => !isForeignOtcLevel(lvl, pair)).length;
    const ipZfp = zfpFromConfluence6D(pr.compositeScore);
    const ownWalls = optionsWalls?.perPair[pair];
    L.push(`| ${pair} | ${ipCount} | ${pr.compositeScore} | ${ipZfp}% | ${pr.confluenceDimensions.options.toFixed(1)}/2 | ${ownWalls ? `${ownWalls.strikes.length} strikes ($${ownWalls.totalNotional.toFixed(2)}B)` : optionsWalls ? '[none on this pair]' : '[NO DATA]'} |`);
  }
  L.push('');
  if (!optionsWalls) {
    L.push(`**Options-Derived: [NO DATA]** — ${OPTIONS_WALLS_PATH} absent → P8's K-factor path scores 0 (never a fabricated spot rate) and P3 ran its histogram proxy. When the walls file is present, CRITICAL (≥$1.5B) walls enter with +2 and SIGNIFICANT ($850M–1.5B) with +1 on the Options dimension + their ZFP modifiers.`);
  } else {
    const ownCount = Object.values(optionsWalls.perPair).filter(Boolean).length;
    L.push(`**Options-Derived: WIRED** — ${optionsWalls.data.strikes.length} strikes (${optionsWalls.data.date}, ${optionsWalls.wallDays.join(', ')}) → the walls enter the zone map with the Options-Derived confluence (+2 CRITICAL ≥$1.5B / +1 SIGNIFICANT $850M–1.5B) + the ZFP modifiers. ${ownCount} of 3 pairs carry walls (the JUL-6 image is EUR/USD-only).`);
    L.push(`**ZFP temporal modifiers (Bible 4.0 §4.11/Appendix G):** pre-expiry NY-cut cage (Hard Wall ZFP stays low — pins price); the Spring Release at 10:01 AM NY on the wall's expiry day → +25% ZFP (mid-range, the cage vanishes). The weekly map carries the pre-release pinning state; the intraday cliff is a documented modifier.`);
    L.push(`**Component spots (P8's ICE K-factor):** ${optionsWalls.componentSpots ? `WIRED from the file — ${Object.keys(optionsWalls.componentSpots).length} pairs (${Object.entries(optionsWalls.componentSpots).map(([k, v]) => `${k} ${v}`).join(', ')})` : '[NO DATA]'} — never fabricated.`);
  }
  L.push('');
  L.push('DECISION-1 (canon): the IP zones are confluence/ZFP/context + SL/TP rungs — NEVER entries. The §8.1 structural gate (isValidEntryAnchor: source ∉ {ORDER_BLOCK, LQZ}) + the mirror anchor-search guard + the source lane\'s battle gate exclude them from every entry lane.');
  L.push('');

  // ═══ Wave ZR-2B — THE STORYLINE (the E2 narrative on the E1 pressure) ═══
  //   The operator's reasoning structure made visible: per pair — the macro
  //   arc, the bullish-vs-bearish strength comparison, the warframe phase,
  //   and the per-day reads (the contested zone's pressure state, the
  //   projected next shape, the break-of-structure validation, the
  //   narrative). ADDITIVE — no existing section modified. Every value
  //   traces to computeWeekStoryline (never a hardcoded level).
  L.push('## THE STORYLINE (the E2 narrative on the E1 pressure — Wave ZR-2)');
  L.push('');
  for (const pair of ['DXY', 'EUR/USD', 'GBP/USD']) {
    const w = storylines[pair];
    if (!w) {
      L.push(`### ${pair} — [NO STORYLINE] (the pair brain returned null — honest absence)`);
      L.push('');
      continue;
    }
    const s = w.strengthComparison;
    L.push(`### ${pair} — warframe: ${w.warframePhase} · strength: ${s.verdict} (${f2(s.bullishPips)}p vs ${f2(s.bearishPips)}p)`);
    L.push(w.macroArc.summary);
    L.push(s.reason);
    L.push('');
    L.push('| day | shape | contested zone | the projection | warframe |');
    L.push('|-----|-------|----------------|----------------|----------|');
    for (const d of w.days) {
      L.push(`| ${d.day.slice(0, 3)} | ${d.shape} | ${d.contestedZone?.summary ?? '—'} | ${d.projectedNext.trigger} | ${d.warframeArc} |`);
    }
    L.push('');
    for (const d of w.days) {
      L.push(d.narrative);
      if (d.breakValidation) L.push(d.breakValidation.reason);
    }
    L.push('');
  }

  return L.join('\n') + '\n';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

if (import.meta.main) {
  // ═══ THE TEMPORAL LOCK-FIRST (the operator's law — "TODAY IS WHATEVER DATE
  //   WE SET WHEN RUNNING THE PIPELINE"): the --day/--time anchor is locked
  //   as the FIRST executable action — before ANY bar read — and cannot be
  //   changed for the rest of the run. The no-arg legacy path returns null
  //   (no lock, no gate — the ANCHOR_MS fallback, byte-identical). ═══
  const anchorMs = parseRunAnchor(process.argv);
  if (anchorMs !== null) {
    lockRunAnchor(anchorMs);
    console.error(`[TEMPORAL] RUN ANCHOR LOCKED: ${new Date(anchorMs).toISOString()} (${anchorMs}) - every bar past this is DROPPED by the gate`);
  }
  const result = await runChainV452();
  writeFileSync(REPORT_PATH, result.markdown);
  console.log(`report_v452.md written (${result.markdown.length} chars, ${result.markdown.split('\n').length} lines)`);
  console.log('');
  console.log('═══ HEADLINE STATS ═══');
  console.log(`  HEADLINE (in-week)      : ${result.report.headline.total} trades | ${result.report.headline.wins}W/${result.report.headline.losses}L | ${result.report.headline.winRate}% (n=${result.report.headline.n}) | ${result.report.headline.totalR >= 0 ? '+' : ''}${f2(result.report.headline.totalR)}R | avgRRR ${f2(result.report.headline.avgRrr)}x`);
  console.log(`  IN-WEEK-TRIGGERED       : ${result.report.inWeekTriggered.total} trades | ${result.report.inWeekTriggered.wins}W/${result.report.inWeekTriggered.losses}L | ${result.report.inWeekTriggered.winRate}% (n=${result.report.inWeekTriggered.n}) | ${result.report.inWeekTriggered.totalR >= 0 ? '+' : ''}${f2(result.report.inWeekTriggered.totalR)}R | avgRRR ${f2(result.report.inWeekTriggered.avgRrr)}x`);
  console.log(`  OVERALL (unique set)    : ${result.report.overall.total} trades | ${result.report.overall.wins}W/${result.report.overall.losses}L | ${result.report.overall.winRate}% (n=${result.report.overall.n}) | ${result.report.overall.totalR >= 0 ? '+' : ''}${f2(result.report.overall.totalR)}R | avgRRR ${f2(result.report.overall.avgRrr)}x`);
  console.log(`  STALE                   : ${result.report.staleCount} trades`);
  console.log('');
  console.log('═══ PER-PAIR ═══');
  for (const [pair, s] of Object.entries(result.report.perPair).sort()) {
    console.log(`  ${pair.padEnd(8)} headline ${s.headline.wins}W/${s.headline.losses}L (n=${s.headline.n}) ${s.headline.totalR >= 0 ? '+' : ''}${f2(s.headline.totalR)}R | overall ${s.overall.wins}W/${s.overall.losses}L (n=${s.overall.n}) ${s.overall.totalR >= 0 ? '+' : ''}${f2(s.overall.totalR)}R`);
  }
  console.log('');
  console.log('═══ SL_vs_ENTRY (deduped) ═══');
  console.log(`  raw ${result.slVsEntry.rawCount} → unique ${result.slVsEntry.uniqueCount} | SL_TOO_WIDE=${result.slVsEntry.uniqueTally.SL_TOO_WIDE} ENTRY_TOO_EARLY=${result.slVsEntry.uniqueTally.ENTRY_TOO_EARLY} BALANCED=${result.slVsEntry.uniqueTally.BALANCED}`);
}
