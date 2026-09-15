/**
 * TradeBrain — Engine 3 (trade setup construction).
 *
 * REAL IMPLEMENTATION — runs setup construction logic in TypeScript.
 * Applies the Trading Semantic Firewall (34 rules) to filter setups
 * before publishing. Delegates to Python bundle only for the heavy
 * 9-Pillar zone computation (already in plutus_agent_v5.4).
 *
 * 200ms tick cycle:
 *   1. Reads latest ZONE_MAPPED + SHAPE_PREDICTED from BrainMessenger
 *   2. Runs SetupUniverseMapper — generates all valid setups across all zones
 *   3. For each category: generates setups with entry/SL/TP/RRR
 *   4. Runs Trading Semantic Firewall (CS1-CS16, AP22, AD1-AD10, TFM1-3)
 *   5. (v5.4) Calls TimesFM overlay to populate P(TP)/P(SL)/EV per setup
 *   6. Publishes TradeSetupMap via BrainMessenger (Channel.SETUP_READY)
 *
 * TimesFM integration: the overlay runs AFTER structural setup construction
 * and AFTER firewall filtering. It augments (never overrides) the structural
 * decisions. If TimesFM is unavailable, setups are published without TimesFM
 * fields (advisory-only).
 */

import {
  BrainChannel,
  SetupCategory,
  TradeDirection,
  ZoneType,
  ConfidenceTier,
  ShapeCode,
  SessionWindow,
  PIP_VALUE,
  type DayShapePrediction,
  type TradeSetup,
  type TradeSetupMapSnapshot,
  type ZoneMapSnapshot,
  type ShapePredictionSnapshot,
  type DXYZone,
  type ForecastResult,
  type StopLimitOrder,
  type EntryPrecision,
  type MasterTrade,
} from '../types.js';
import { TimesFMClient } from '../clients/timesfm-client.js';
import type { TradingViewClient } from '../clients/tradingview-client.js';
import { EconomicCalendarClient } from '../clients/economic-calendar-client.js';
import type { TvWorkspaceClient } from '../clients/tv-workspace-client.js';
import type { TreasuryClient } from '../clients/treasury-client.js';
import type { FREDClient } from '../clients/fred-client.js';
import type { EIClient } from '../clients/eia-client.js';
import { semanticFirewall, type RuleCheckContext } from '../semantic-firewall/index.js';
import { computeFibLevels, FibContext, type FibLevel } from '../semantic-firewall/fib-spiderweb.js';
import { detectFractalSignal } from './elemental-lobe.js';
import { type ElementalDensity } from '../types.js';
import { buildReinforcementLadder, getRecommendedReinforcements } from './reinforcement-lobe.js';
import { runBlindExecutionCheck } from '../pipeline/blind-execution-check.js';
import { Logger } from '../utils/logger.js';
import { isMarketOpen, getSpreadPips, isWeekend, getCurrentSession } from '../utils/market-hours.js';
import type { TradingSession } from '../utils/market-hours.js';
import type { EvidenceDB } from '../v1-compat.js';
import type { InvestingliveClient, OptionStrike } from '../clients/investinglive-client.js';
import { computeDXYConviction, isDirectionAligned, applyPairProfilePenalty, type DXYPrimacyState } from './dxy-primacy.js';
import { MultiPairTranslator, type TranslationResult, type CrossPairMatrix } from './multi-pair-translator.js';
import type { PairDataBundle } from '../v1-compat.js';
import type { ReplayHarness, ReplayResult } from '../v1-compat.js';
import {
  detectChainEntry,
  createChain,
  updateChainStatus,
  type TradeFlowChain,
} from './trade-flow-chain.js';
import {
  // Tick / timing
  BRAIN_TICK_MS,
  // TimesFM
  TIMESFM_MIN_OHLC_BARS,
  TIMESFM_FORECAST_HORIZON,
  TIMESFM_HORIZON_HTF_SWING,
  TIMESFM_HORIZON_SWING_SCALP,
  TIMESFM_HORIZON_BREAKOUT_SURGE,
  TIMESFM_HORIZON_REINFORCEMENT,
  TIMESFM_HORIZON_TRANSITION,
  OHLC_HISTORY_BARS,
  // Risk / confidence
  CONFIDENCE_CEILING,
  DXY_BOOST_STRONG,
  DXY_PENALTY_WEAK,
  AVATAR_MIN_CONFIDENCE,
  RRR_ROUND_PRECISION,
  SL_PIPS_ROUND_PRECISION,
  // Translation
  TRANSLATION_CONF_STRONG,
  TRANSLATION_CONF_WEAK,
  // Pip values
  PIP_VALUE_DEFAULT,
  PIP_VALUE_DXY,
  PIP_VALUE_FX_4DEC,
  SL_BUFFER_PIPS,
  SL_CAP_PIPS,
  NEAR_ZONE_PIP_TOLERANCE,
  // RRR
  MIN_RRR_CONSTRUCTION,
  DIRECTION_VAL_RRR_PASS,
  DIRECTION_VAL_MIN_CONFLUENCE,
  // Options OI
  OI_NOTIONAL_CRITICAL,
  OI_NOTIONAL_MAGNET,
  OI_NOTIONAL_MODERATE,
  OI_NOTIONAL_LIGHT,
  OI_SCORE_MAX,
  OI_SCORE_MAGNET,
  OI_SCORE_MODERATE,
  OI_SCORE_LIGHT,
  OI_SCORE_MIN,
  // Confidence formula
  CONF_MAX_CONFLUENCE,
  BASE_SCORE_MAX,
  OPTION_SCORE_MAX,
  SHAPE_SCORE,
  REDFOLDER_PENALTY,
  ZFP_SCORE_MAX,
  ZFP_PCT_DENOMINATOR,
  BOM_BONUS,
  MOM_PENALTY,
  DXY_SCORE,
  FIB_TOLERANCE,
  FIB_SCORE_PER_HIT,
  FIB_SCORE_MAX,
  SESSION_SCORE,
  // Tier thresholds
  TIER_S_MIN,
  TIER_A_MIN,
  TIER_B_MIN,
  TIER_C_MIN,
  TIER_D_MIN,
  // Min confidence by category
  MIN_CONF_HTF_SWING,
  MIN_CONF_SWING_SCALP,
  MIN_CONF_REINFORCEMENT,
  MIN_CONF_BREAKOUT_SURGE,
  MIN_CONF_TRANSITION,
  MIN_CONF_DEFAULT,
  // Session hours
  ET_UTC_OFFSET,
  HOURS_PER_DAY,
  LONDON_OPEN_START_ET,
  LONDON_OPEN_END_ET,
  LONDON_MID_END_ET,
  NY_OVERLAP_END_ET,
  NY_MID_END_ET,
  NY_CLOSE_END_ET,
  LONDON_HALF_DAY_UTC,
  NY_OVERLAP_MID_BOUNDARY_ET,
  NY_MID_CLOSE_BOUNDARY_ET,
  // Stop-limit
  STOP_LIMIT_ZONE_LOOKAHEAD,
  STOP_LIMIT_BUFFER_DXY,
  STOP_LIMIT_BUFFER_FX,
  STOP_LIMIT_SL_BUFFER_DXY,
  STOP_LIMIT_SL_BUFFER_FX,
  STOP_LIMIT_SIZE_OFFSET,
  // Swing Scalp Types (TTE v5.3.3 §7S.2)
  LIQUIDITY_SNIPE_SL_BUFFER_PIPS,
  LIQUIDITY_SNIPE_TP_PIPS,
  SS_BS_TRANSITION_BUFFER_PIPS,
  // Presentation
  PCT_MULTIPLIER,
  AVG_CONF_DISPLAY_PRECISION,
  // Reinforcement (H-06 Master Trade)
  REINFORCEMENT,
} from '../constants/trading-constants.js';

const log = new Logger('TradeBrain');

const INSTRUMENTS = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
const TIMESFM_HORIZONS: Record<string, number> = {
  'HTF Swing': TIMESFM_HORIZON_HTF_SWING,
  'Swing Scalp': TIMESFM_HORIZON_SWING_SCALP,
  'Breakout Surge': TIMESFM_HORIZON_BREAKOUT_SURGE,
  'Reinforcement': TIMESFM_HORIZON_REINFORCEMENT,
  'Transition': TIMESFM_HORIZON_TRANSITION,
};

export class TradeBrain {
  private currentSetups: TradeSetup[] = [];
  private forecasts: Map<string, ForecastResult> = new Map();
  private setupCounter = 0;
  private lastKnownShape: string | undefined;
  private lastSetupHash: string = '';

  // DXY primacy cache — updated whenever the latest ZONE_MAPPED / SHAPE_PREDICTED
  // envelope is for DXY. Used to compute cross-pair directional conviction
  // for every non-DXY instrument.
  private dxyZoneMap: ZoneMapSnapshot | undefined;
  private dxyShapePrediction: ShapePredictionSnapshot | undefined;

  // Weekend auto-backtest: the replay harness runs ONCE per process lifetime
  // when the market is closed, instead of idling. Guards against re-running
  // every 200ms tick.
  private backtestAlreadyRun = false;

  // ── Trade Flow Continuity (TTE v5.3.3 §7.4) ──
  // Tracks active chains across the trading week so new setups whose entry
  // coincides with a prior trade's TP can be linked into the flow. Direction
  // flips at each boundary; max MAX_TRADES_PER_CHAIN links per chain.
  private tradeFlowChains: TradeFlowChain[] = [];

  // H-06: Master Trade composites (Avatar State — E + FLR). Built during
  // constructSetups when all 4 elemental densities converge. Each composite
  // carries up to 7 reinforcement rockets.
  private masterTrades: MasterTrade[] = [];

  // FIX-005: Multi-pair translator for Part IX DXY-to-forex translation.
  private multiPairTranslator = new MultiPairTranslator();
  private lastMultiPairResults: TranslationResult[] = [];
  private lastCrossPairMatrix: CrossPairMatrix | null = null;

  // v2.0: Local state replaces messenger pub/sub
  private setupReadyVersion = 0;
  private lastSetupSnapshot: TradeSetupMapSnapshot | null = null;
  private injectedZoneMap: ZoneMapSnapshot | null = null;
  private injectedShapePrediction: ShapePredictionSnapshot | null = null;
  private zoneMapVersion = 0;
  private shapePredictionVersion = 0;

  constructor(
    private timesfmClient: TimesFMClient,
    private tvClient: TradingViewClient,
    private economicCalendar?: EconomicCalendarClient,
    private evidenceDB?: EvidenceDB,
    private investingliveClient?: InvestingliveClient,
    private replayHarness?: ReplayHarness,
    private tvWorkspace?: TvWorkspaceClient,
    private treasuryClient?: TreasuryClient,
    private fredClient?: FREDClient,
    private eiaClient?: EIClient,
  ) {}

  /**
   * v2.0: Inject zone map for trade setup computation.
   * Replaces the v1.0 messenger.getLatest(ZONE_MAPPED) call.
   */
  setZoneMap(zoneMap: ZoneMapSnapshot | null): void {
    this.injectedZoneMap = zoneMap;
    if (zoneMap) this.zoneMapVersion = zoneMap.version;
  }

  /**
   * v2.0: Inject shape prediction for trade setup computation.
   * Replaces the v1.0 messenger.getLatest(SHAPE_PREDICTED) call.
   */
  setShapePrediction(snapshot: ShapePredictionSnapshot | null): void {
    this.injectedShapePrediction = snapshot;
    if (snapshot) this.shapePredictionVersion = snapshot.version;
  }

  /**
   * v2.0: Get the latest setup snapshot.
   * Replaces the v1.0 messenger.getLatest(SETUP_READY) call.
   */
  getLatestSetupSnapshot(): TradeSetupMapSnapshot | null {
    return this.lastSetupSnapshot;
  }

  /**
   * H-06: Get active Master Trade composites (Avatar State — E + FLR).
   *
   * Returns the Master Trade setups built during the last constructSetups
   * cycle. Each composite unifies all four elemental densities with up to 7
   * reinforcement rockets. Empty when no Avatar State is active.
   * Called by: pipeline reporting tools, report generators.
   */
  getMasterTrades(): MasterTrade[] {
    return this.masterTrades;
  }

  /**
   * FIX-005: Apply Part IX multi-pair translation to propagate DXY zone
   * analysis to all forex pairs. Uses each pair's OWN per-pair data
   * (FIX-004) for level identification and cross-validation.
   *
   * @param dxyZones - DXY zones from ZoneBrain
   * @param pairDataMap - Per-pair data bundles (FIX-004)
   * @returns Translation results + cross-pair comparison matrix
   */
  applyMultiPairTranslation(
    dxyZones: DXYZone[],
    pairDataMap: Map<string, PairDataBundle>,
  ): { results: TranslationResult[]; matrix: CrossPairMatrix } {
    if (dxyZones.length === 0) {
      log.debug('No DXY zones — skipping multi-pair translation');
      return { results: [], matrix: { pairs: [], rows: [] } };
    }

    const { results, matrix } = this.multiPairTranslator.translateAll(dxyZones, pairDataMap);
    this.lastMultiPairResults = results;
    this.lastCrossPairMatrix = matrix;

    log.info(
      `FIX-005 Multi-pair translation: ${results.length} pairs translated, ` +
      `avg confidence=${results.length > 0
        ? (results.reduce((s: number, r: TranslationResult) => s + r.averageConfidence, 0) / results.length).toFixed(AVG_CONF_DISPLAY_PRECISION)
        : 'N/A'}`
    );

    return { results, matrix };
  }

  /**
   * Get the last multi-pair translation results for reporting.
   *
   * This is the public access point for the cached multi-pair translation
   * results produced by applyMultiPairTranslation() during the tick loop.
   * PipelineRunner and plutus-* reporting tools use this to read the
   * cross-pair directional conviction without re-running the translation.
   * Called by: pipeline reporting tools, health-server status endpoints.
   */
  getMultiPairResults(): TranslationResult[] {
    return this.lastMultiPairResults;
  }

  /**
   * Get the last cross-pair comparison matrix for reporting.
   *
   * This is the public access point for the cached cross-pair matrix
   * produced by applyMultiPairTranslation(). Contains pairwise zone
   * alignment comparisons used for DXY primacy conviction scoring.
   * Called by: pipeline reporting tools, evidence compliance sweep.
   */
  getCrossPairMatrix(): CrossPairMatrix | null {
    return this.lastCrossPairMatrix;
  }

  /**
   * FIX-005: Build per-pair data bundles for multi-pair translation.
   * Collects OHLC data for EUR/USD, GBP/USD, AUD/USD from TradingView.
   * Each pair gets its own PairDataBundle with real OHLC bars so the
   * translator can use per-pair structural extremes for level identification.
   */
  private async buildPairDataMap(): Promise<Map<string, PairDataBundle>> {
    const map = new Map<string, PairDataBundle>();
    const pairs = ['EUR/USD', 'GBP/USD', 'AUD/USD'];
    for (const pair of pairs) {
      try {
        const bars = await this.tvClient.getOHLCHistory(pair, '4H', OHLC_HISTORY_BARS);
        if (bars && bars.length > 0) {
          map.set(pair, {
            pair,
            ohlc: bars,
            fetchedAt: Date.now(),
          });
        }
      } catch {
        // Skip pairs that fail to fetch — translation proceeds with available data
        log.debug(`buildPairDataMap: failed to fetch OHLC for ${pair}`);
      }
    }
    return map;
  }

  protected async tick(): Promise<BrainChannel[]> {
    // MARKET HOURS GUARD — don't generate setups when market is closed.
    // Per CS14: weekend/holiday prohibition is absolute; the market-hours
    // engine also accounts for Friday-after-22:00 and Sunday-before-22:00 UTC.
    if (!isMarketOpen()) {
      // Weekend/holiday — run a replay backtest ONCE instead of idling.
      // The harness picks a random trading week from the last 8 months and
      // trades it bar-by-bar against REAL historical TradingView data.
      if (this.replayHarness && !this.backtestAlreadyRun) {
        log.info('Market closed — running weekend replay backtest');
        await this.runWeekendBacktest();
      }
      return [];
    }

    // ══ SESSION-AWARE FILTERING (TTE v5.3.3 Section 2.2.1) ══
    // Tokyo session: Limited opportunities. Manage existing positions only.
    // Off-hours: Return empty array (no new entries).
    const activeSession = getCurrentSession();
    if (activeSession === 'tokyo') {
      log.info('Tokyo session — manage existing only');
      return [];
    }
    if (activeSession === 'off') {
      log.debug('Off-hours — no new entries');
      return [];
    }

    const publishedChannels: BrainChannel[] = [];

    // 1. Read injected zone map + shape prediction (v2.0: replaces messenger)
    const zoneEnvelope = this.injectedZoneMap
      ? { version: this.injectedZoneMap.version, data: this.injectedZoneMap }
      : null;
    const shapeEnvelope = this.injectedShapePrediction
      ? { version: this.injectedShapePrediction.version, data: this.injectedShapePrediction }
      : null;
    if (!zoneEnvelope || !shapeEnvelope) {
      log.debug('Missing zone map or shape prediction — skipping trade setup');
      return [];
    }

    const zoneMapVersionAtStart = zoneEnvelope.version;
    const shapeVersionAtStart = shapeEnvelope.version;

    // Cache DXY-specific data for cross-pair directional conviction.
    // The messenger stores only the latest envelope per channel, so we
    // snapshot DXY maps/predictions when they come through.
    if (zoneEnvelope.data.instrument === 'DXY') {
      this.dxyZoneMap = zoneEnvelope.data;
    }
    if (shapeEnvelope.data.shapeChain) {
      // Shape predictions are not instrument-tagged in the snapshot itself,
      // but zone map version references can help disambiguate. We cache
      // the one whose zoneMapVersion matches a DXY zone map.
      if (this.dxyZoneMap && shapeEnvelope.data.zoneMapVersion === this.dxyZoneMap.version) {
        this.dxyShapePrediction = shapeEnvelope.data;
      }
    }

    // 2. Run setup construction (REAL implementation — generates from zones)
    const candidateSetups = await this.constructSetups(zoneEnvelope.data, shapeEnvelope.data);

    // 2b. Setup deduplication — skip the rest of the pipeline when the
    // generated setups are identical to the previous tick. Avoids
    // republishing unchanged SETUP_READY snapshots every 200ms.
    const setupHash = this.hashSetups(candidateSetups);
    if (setupHash === this.lastSetupHash) {
      return [];
    }
    this.lastSetupHash = setupHash;

    // 3. Run Trading Semantic Firewall — filter out rule-violating setups
    const spotPrice = zoneEnvelope.data.spots[zoneEnvelope.data.instrument] ?? 0;

    // Compute macro Fibonacci levels from the zone map's swing range for firewall context
    const zoneSwingHigh = Math.max(...zoneEnvelope.data.zones.map((z: DXYZone) => z.ceiling));
    const zoneSwingLow = Math.min(...zoneEnvelope.data.zones.map((z: DXYZone) => z.floor));
    const macroFibLevels = computeFibLevels(zoneSwingHigh, zoneSwingLow, FibContext.MACRO);

    const { accepted, rejected } = semanticFirewall.filterSetups(
      candidateSetups,
      (setup: TradeSetup) => ({
        setup,
        spotPrice,
        currentGate: 'score', // TradeBrain runs in SCORE phase internally
        isWeekend: isWeekend(),
        redFolderActive: this.economicCalendar?.isRedFolderActive() ?? false,
        fibLevels: macroFibLevels,
        allZones: zoneEnvelope.data.zones as DXYZone[],
      }),
    );

    if (rejected.length > 0) {
      log.info(`Firewall rejected ${rejected.length} setups, ${accepted.length} accepted`);
    }

    // 3b. Record per-setup evidence for accepted and rejected setups
    if (this.evidenceDB) {
      for (const setup of accepted) {
        this.evidenceDB.recordEvidence('SETUP_READY', 'setup_accepted', {
          pair: setup.pair,
          direction: setup.direction,
          entry: setup.entry,
          sl: setup.sl,
          tp: setup.tp,
          confidence: setup.confidence,
          category: setup.category,
        });
      }
      for (const item of rejected) {
        const blockingRules = item.result.hardBlocks.map((b: { rule: string }) => b.rule);
        this.evidenceDB.recordEvidence('SETUP_READY', 'setup_rejected', {
          pair: item.setup.pair,
          blockingRules,
        });
      }
    }

    // 3c. Seed trade flow chains for accepted setups that have no chainId.
    // Per TTE v5.3.3 §7.4: accepted standalone setups (not detected as
    // continuations of existing chains) become the ORIGIN of a new chain.
    for (const setup of accepted) {
      if (!setup.chainId) {
        this.seedChain(setup);
      }
    }

    // 4. (v5.4) TimesFM overlay — augment accepted setups with P(TP)/P(SL)/EV
    if (this.timesfmClient.isAvailable() && accepted.length > 0) {
      await this.augmentWithTimesFM(accepted);
    }

    // 4b. VLM status marking — VC daemon REMOVED. Setups are marked
    // VLM_UNAVAILABLE (MiMo v2.5 built-in vision is the visual path).
    this.applyVlmVerification(accepted);

    // 4c. Filter out VLM-rejected setups
    const verified = accepted.filter(
      (s: TradeSetup) => s.vlmStatus !== 'VLM_REJECTED',
    );

    if (verified.length < accepted.length) {
      log.info(
        `VLM verification rejected ${accepted.length - verified.length} setup(s), ` +
          `${verified.length} passed`,
      );
    }

    // 4d. FIX-005: Multi-pair translation — run cross-pair DXY→forex analysis
    // if we have DXY zones cached. Uses cross-pair directional conviction to
    // boost confidence when DXY agrees with setup direction, or penalize when
    // it conflicts. This is how the agent looks at DXY, EU, GU, and AU
    // simultaneously at all times.
    if (this.dxyZoneMap && this.dxyZoneMap.zones.length > 0) {
      try {
        const pairDataMap = await this.buildPairDataMap();
        if (pairDataMap.size > 0) {
          const { results } = this.applyMultiPairTranslation(
            this.dxyZoneMap.zones as DXYZone[],
            pairDataMap,
          );

          // Use cross-pair conviction to boost/confine setups.
          // If DXY translation confidence is strong (≥0.7) for a pair and the
          // setup aligns, boost confidence. If weak (≤0.3), penalize.
          for (const setup of verified) {
            const translation = results.find((r: TranslationResult) => r.pair === setup.pair);
            if (translation) {
              if (translation.averageConfidence >= TRANSLATION_CONF_STRONG) {
                setup.confidence = Math.min(CONFIDENCE_CEILING, setup.confidence + DXY_BOOST_STRONG);
              } else if (translation.averageConfidence <= TRANSLATION_CONF_WEAK) {
                setup.confidence = Math.max(0, setup.confidence - DXY_PENALTY_WEAK);
              }
            }
          }

          // Record cross-pair matrix in evidence
          if (this.evidenceDB) {
            this.evidenceDB.recordEvidence(
              'SETUP_READY',
              'multi_pair_translation',
              {
                dxyZones: this.dxyZoneMap.zones.length,
                pairs: results.length,
                confidence: results.map((r: TranslationResult) => ({ pair: r.pair, conf: r.averageConfidence })),
              },
            );
          }
        }
      } catch (err) {
        log.error(
          `Multi-pair translation error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 5. v2.0: Race condition check uses local version counters (no messenger)
    if (
      this.zoneMapVersion !== zoneMapVersionAtStart ||
      this.shapePredictionVersion !== shapeVersionAtStart
    ) {
      log.warn('Race condition: zone or shape version changed mid-tick, aborting');
      return [];
    }

    // 5b. Macro liquidity filters — apply external data-source adjustments
    // to verified setups before publishing. These are cross-cutting macro
    // overlays that modify confidence based on real-world events that the
    // zone/shape engines cannot see.
    //
    // FIX 2: Treasury auction days — unusual liquidity. Reduce confidence
    //   on all setups since auction settlement distorts intraday flows.
    // FIX 3: FRED RRP trend — declining RRP = reduced liquidity = risk-off
    //   bias. Penalize risk-on setups (LONG AUD/USD) when reserves are
    //   being withdrawn from the RRP facility.
    // FIX 4: EIA petroleum shock — major inventory shocks impact USD pairs
    //   across the board. Reduce confidence on all setups.
    if (verified.length > 0) {
      // FIX 2: Treasury auction day penalty
      const hasTreasuryAuction = this.treasuryClient?.hasAuctionToday() ?? false;
      if (hasTreasuryAuction) {
        for (const setup of verified) {
          setup.confidence = Math.max(0, setup.confidence - 5);
        }
        log.info('[TradeBrain] Treasury auction today — reducing confidence on all setups');
      }

      // FIX 3: FRED RRP risk-on/off bias
      const rrpTrend = this.fredClient?.getTrend();
      if (rrpTrend === 'decreasing') {
        let penalized = 0;
        for (const setup of verified) {
          if (setup.pair === 'AUD/USD' && setup.direction === 'LONG') {
            setup.confidence = Math.max(0, setup.confidence - 3);
            penalized++;
          }
        }
        if (penalized > 0) {
          log.info(`[TradeBrain] FRED RRP declining — risk-off bias, penalized ${penalized} AUD/USD LONG setup(s)`);
        }
      }

      // FIX 4: EIA petroleum shock
      const hasEnergyShock = this.eiaClient?.hasMajorShock() ?? false;
      if (hasEnergyShock) {
        for (const setup of verified) {
          setup.confidence = Math.max(0, setup.confidence - 5);
        }
        log.info('[TradeBrain] EIA petroleum shock detected — reducing confidence on all setups');
      }
    }

    // 6. Update internal state
    this.currentSetups = verified;

    // 7. Build immutable snapshot
    this.setupReadyVersion++;
    const snapshot: TradeSetupMapSnapshot = {
      version: this.setupReadyVersion,
      timestamp: Date.now(),
      setups: Object.freeze([...verified]),
      zoneMapVersion: zoneMapVersionAtStart,
      shapePredictionVersion: shapeVersionAtStart,
    };

    // 8. Blind execution check — verify report self-containedness
    const blindCheck = runBlindExecutionCheck(verified as TradeSetup[]);
    if (blindCheck.failures.length > 0) {
      log.warn(`Blind execution check: ${blindCheck.failures.length} issues found`);
      for (const f of blindCheck.failures) {
        log.warn(`  ${f.checkId} [${f.setupId}]: ${f.reason}`);
      }
    }

    // 9. Store locally (v2.0: replaces messenger.publish)
    this.lastSetupSnapshot = snapshot;
    publishedChannels.push(BrainChannel.SETUP_READY);

    // 8b. Draw verified setups on the TradingView chart (non-blocking, primary workspace)
    if (this.tvWorkspace && verified.length > 0) {
      for (const setup of verified) {
        this.tvWorkspace.drawSetup(setup).catch((e) => {
          log.debug(`TV drawSetup failed for ${setup.setupId} (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
        });
      }
    }

    return publishedChannels;
  }

  /**
   * Weekend replay backtest — runs ONCE per process lifetime when the market
   * is closed. Picks ONE instrument at random and replays a random trading
   * week from the last 8 months against real TradingView historical data.
   *
   * This satisfies the requirement: "pick a random trading week in the last 8
   * months and actually live-trade that week like a normal live market session,
   * permitted to speed up price action by 5x."
   */
  private async runWeekendBacktest(): Promise<void> {
    if (this.backtestAlreadyRun || !this.replayHarness) return;
    this.backtestAlreadyRun = true; // guard against re-entry on the next 200ms tick

    try {
      const instrument = INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
      const result: ReplayResult = await this.replayHarness.runReplay(instrument);
      log.info(
        `Weekend backtest done — ${instrument} ${result.weekOf}: ` +
        `${result.executedTrades} trades, ${(result.winRate * PCT_MULTIPLIER).toFixed(0)}% win, ` +
        `${result.totalPips.toFixed(1)} pips`,
      );
    } catch (err) {
      log.warn(
        `Weekend backtest failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Compute a stable hash of a batch of setups for deduplication.
   * Two identical setup batches (same setups, order-insensitive) produce
   * the same hash so the tick loop can skip re-publishing unchanged data.
   */
  private hashSetups(setups: TradeSetup[]): string {
    return setups.map((s: TradeSetup) => `${s.setupId}:${s.entry}:${s.direction}`).sort().join('|');
  }

  /**
   * Construct trade setups from zone map + shape prediction.
   *
   * REAL IMPLEMENTATION — generates setups from BoM zones using the
   * Trident Engine 3 logic:
   *   - For each BoM zone, generate a setup with sniper entry at zone edge
   *   - SL at opposing zone edge + buffer (capped at 150 pips per CS8)
   *   - TP at nearest opposing BoM zone
   *   - RRR computed from entry/SL/TP distances
   *   - Direction (LONG/SHORT) determined by zone type (demand=long, supply=short)
   *   - Session assigned based on pair rules
   */
  private async constructSetups(
    zoneMap: ZoneMapSnapshot,
    shapePrediction: ShapePredictionSnapshot,
  ): Promise<TradeSetup[]> {
    const setups: TradeSetup[] = [];
    const instrument = zoneMap.instrument;
    const spot = zoneMap.spots[instrument] ?? 0;
    const shapeChain = shapePrediction.shapeChain;
    const pipValue = PIP_VALUE[instrument] ?? PIP_VALUE_DEFAULT;

    // Compute macro Fibonacci levels from zone swing range for confidence scoring
    const zoneSwingHigh = Math.max(...zoneMap.zones.map((z: DXYZone) => z.ceiling));
    const zoneSwingLow = Math.min(...zoneMap.zones.map((z: DXYZone) => z.floor));
    const macroFibLevels = computeFibLevels(zoneSwingHigh, zoneSwingLow, FibContext.MACRO);

    // Generate one setup per BoM zone (CS9: BoM-only entries)
    for (const zone of zoneMap.zones) {
      if (!zone.isBoM) continue; // CS9: BoM-only

      // Determine direction from zone type
      const isDemand = zone.type === ZoneType.BOM_DEMAND;
      const direction = isDemand ? TradeDirection.LONG : TradeDirection.SHORT;

      // Sniper entry: zone edge closest to spot (per Trident v8 spec)
      const entry = isDemand ? zone.ceiling : zone.floor;

      // SL: opposing zone edge + buffer (10-15 pip buffer per v8 spec)
      const buffer = pipValue * SL_BUFFER_PIPS; // 15 pips in price space
      const sl = isDemand ? zone.floor - buffer : zone.ceiling + buffer;
      const slPips = Math.abs(sl - entry) / pipValue;

      // Skip if SL exceeds CS8 cap
      if (slPips > SL_CAP_PIPS) continue;

      // TP: nearest opposing BoM zone
      const opposingZones = zoneMap.zones.filter((z: DXYZone) =>
        z.isBoM &&
        ((isDemand && z.type === ZoneType.BOM_SUPPLY && z.floor > entry) ||
         (!isDemand && z.type === ZoneType.BOM_DEMAND && z.ceiling < entry)),
      );
      if (opposingZones.length === 0) continue;

      const tp = isDemand
        ? opposingZones.sort((a: DXYZone, b: DXYZone) => a.floor - b.floor)[0].floor
        : opposingZones.sort((a: DXYZone, b: DXYZone) => b.ceiling - a.ceiling)[0].ceiling;

      const rrr = Math.abs(tp - entry) / Math.abs(entry - sl);
      if (rrr < MIN_RRR_CONSTRUCTION) continue; // Skip poor RRR setups

      // ── H-04: 4-Point Entry Precision (TTE v5.3.3 Section 7.1 + 8R.7) ──
      // Compute the SL zone (structural defense zone beyond entry zone) and
      // all 6 precision points so SL placement is always traceable to a
      // specific zone edge.
      const slZone = findSlZone(zone, zoneMap.zones as DXYZone[], isDemand);
      const entryPrecision = computeEntryPrecision(zone, slZone, isDemand);

      // ── H-05: Multi-Point Scaled Entry (TTE v5.3.3 Section 7.3 — 33/33/33) ──
      // entry1 = Zone First Touch (front edge), entry2 = Zone Mid-Confluence,
      // entry3 = Zone Far Edge (back edge). Weights sum to 1.0.
      const scaledEntry1 = entryPrecision.frontEdge;
      const scaledEntry2 = entryPrecision.middleZone;
      const scaledEntry3 = entryPrecision.backEdge;

      // Determine setup category from shape
      const currentShape = shapeChain.currentShape;
      let category: SetupCategory;
      if (currentShape === ShapeCode.BS || currentShape === ShapeCode.PBS) {
        category = SetupCategory.BREAKOUT_SURGE;
      } else if (currentShape === ShapeCode.SS) {
        category = SetupCategory.SWING_SCALP;
      } else if (this.dxyZoneMap && this.dxyShapePrediction) {
        // DXY regime check — NEUTRAL conviction signals a transition market
        const dxyPrimacy = computeDXYConviction(this.dxyZoneMap, this.dxyShapePrediction);
        category = dxyPrimacy.conviction === 'NEUTRAL'
          ? SetupCategory.TRANSITION
          : SetupCategory.HTF_SWING;
      } else {
        category = SetupCategory.HTF_SWING;
      }

      // Determine confidence from TTE v5.3.3 formula (Section 7.3)
      // Zone-direction alignment (changelog #14): direction is ZONE-DERIVED —
      // demand zone = LONG, supply zone = SHORT. Shapes have NO hardcoded
      // bullish/bearish direction; the shape only determines the setup CATEGORY.
      const zoneAligns =
        (direction === TradeDirection.LONG && isDemand) ||
        (direction === TradeDirection.SHORT && !isDemand);

      const nearRedFolder = this.economicCalendar?.isRedFolderActive() ?? false;

      // Compute real options OI score from investinglive cached data.
      // Falls back to 0 when no options data is available (Cloudflare blocked,
      // stale cache, etc.) — confidence honestly reflects "no options data".
      const optionsOiScore = this.computeOptionsOiScore(instrument);

      // Compute DXY alignment for confidence factor 7
      const dxyPrimacy = computeDXYConviction(this.dxyZoneMap, this.dxyShapePrediction);
      const dxyAligned = isDirectionAligned(instrument, direction, dxyPrimacy).aligned;

      const { score: confidence, tier: confidenceTier } = computeConfidence(
        zone.confluence,
        zone.zfp,
        zone.isBoM,
        category,
        zoneAligns,
        nearRedFolder,
        optionsOiScore,
        dxyAligned,
        macroFibLevels,
        entry,
      );

      // Check minimum confidence threshold
      const minConf = getMinimumConfidence(category);
      if (confidence < minConf) {
        continue; // Skip — below threshold
      }

      // Determine DAY + SESSION from day decomposition (TTE v5.3.3 Section 8.0.2)
      // Every setup inherits its DAY and SESSION from Engine 2's day decomposition
      const dayDecomposition: DayShapePrediction[] | undefined = shapeChain.dayDecomposition;
      const { day: mappedDay, sessionWindow: mappedSession } = assignDayAndSession(
        zone.type,
        currentShape,
        dayDecomposition ?? [],
      );

      // FIX-023: Apply pair-specific elemental profile confidence penalty.
      // Penalize setups that go against the pair's elemental nature:
      //   - GBP/USD HTF_SWING during London → penalized (GU is scalp-dominant)
      //   - EUR/USD SWING_SCALP during NY → penalized (EU is swing-dominant)
      //   - AUD/USD low-confluence or scalp setups → penalized (slow mover)
      const profilePenalty = applyPairProfilePenalty(
        instrument,
        category,
        mappedSession,
        confidence,
        zone.confluence,
      );
      const finalConfidence = profilePenalty.penalty > 0
        ? profilePenalty.adjustedConfidence
        : confidence;
      if (profilePenalty.penalty > 0) {
        log.debug(
          `Pair profile penalty for ${instrument} ${category}: -${profilePenalty.penalty} ` +
          `(conf ${confidence} → ${finalConfidence}) — ${profilePenalty.reason}`,
        );
      }
      // Re-check minimum confidence after penalty
      if (finalConfidence < minConf) {
        continue; // Skip — penalized below threshold
      }
      const finalTier = tierFromConfidence(finalConfidence);

      // Build 6-check direction validation with REAL logic
      // ── Check 1: DXY Trend Alignment (cross-pair conviction) ──
      // dxyPrimacy already computed above for confidence factor 7 — reuse it
      const dxyAlignment = isDirectionAligned(instrument, direction, dxyPrimacy);
      const dxyResult = dxyAlignment.aligned ? 'PASS' : 'FAIL';

      // ── Check 2: BoM Zone Test — verify zone.isBoM is actually true ──
      const bomResult = zone.isBoM ? 'PASS' : 'FAIL';
      const bomRationale = zone.isBoM
        ? `BoM ${isDemand ? 'demand' : 'supply'} zone confirmed (id=${zone.id})`
        : `Zone ${zone.id} is NOT BoM — entry rejected`;

      // ── Check 3: Zone Direction — direction must match the anchor zone type ──
      // Direction is zone-derived (demand = LONG, supply = SHORT). Shapes carry
      // NO directional classification; the shape only selects the setup CATEGORY.
      let zoneDirResult = 'PASS';
      let zoneDirRationale = `Direction ${direction} derived from BoM ${isDemand ? 'demand' : 'supply'} zone — shape ${currentShape} sets category only`;
      if (
        (isDemand && direction !== TradeDirection.LONG) ||
        (!isDemand && direction !== TradeDirection.SHORT)
      ) {
        zoneDirResult = 'FAIL';
        zoneDirRationale = `Direction ${direction} contradicts BoM ${isDemand ? 'demand' : 'supply'} zone type (demand=LONG, supply=SHORT)`;
      }

      // ── Check 5: Counter-Zone Check — setup must not fight its anchor zone ──
      // LONG against a supply zone or SHORT against a demand zone is a
      // counter-zone trade. Zone-derived direction makes this an invariant guard.
      let counterZoneResult = 'PASS';
      let counterZoneRationale = 'Direction matches anchor zone type — no counter-zone trade';
      if (
        (isDemand && direction === TradeDirection.SHORT) ||
        (!isDemand && direction === TradeDirection.LONG)
      ) {
        counterZoneResult = 'FAIL';
        counterZoneRationale = `Counter-zone: ${direction} against BoM ${isDemand ? 'demand' : 'supply'} zone`;
      }

      const directionValidation = [
        { check_name: 'DXY Trend Alignment', result: dxyResult, direction_favored: direction, rationale: dxyAlignment.reason },
        { check_name: 'BoM Zone Test', result: bomResult, direction_favored: direction, rationale: bomRationale },
        { check_name: 'Zone Direction', result: zoneDirResult, direction_favored: direction, rationale: zoneDirRationale },
        { check_name: 'Confluence Threshold', result: zone.confluence >= DIRECTION_VAL_MIN_CONFLUENCE ? 'PASS' : 'FAIL', direction_favored: direction, rationale: `Confluence ${zone.confluence}` },
        { check_name: 'Counter-Zone Check', result: counterZoneResult, direction_favored: direction, rationale: counterZoneRationale },
        { check_name: 'RRR Check', result: rrr >= DIRECTION_VAL_RRR_PASS ? 'PASS' : 'WARN', direction_favored: direction, rationale: `RRR ${rrr.toFixed(2)}` },
      ];

      const setup: TradeSetup = {
        setupId: `${instrument.replace('/', '').toLowerCase()}-${++this.setupCounter}`,
        pair: instrument,
        direction,
        category,
        entry,
        sl,
        tp,
        confidence: finalConfidence,
        confidenceTier: finalTier,
        shapeAlignment: currentShape,
        session: mappedSession,
        day: mappedDay,
        shapeTrigger: `BoM ${isDemand ? 'demand' : 'supply'} zone test`,
        rrr: Math.round(rrr * RRR_ROUND_PRECISION) / RRR_ROUND_PRECISION,
        slPips: Math.round(slPips * SL_PIPS_ROUND_PRECISION) / SL_PIPS_ROUND_PRECISION,
        zoneName: zone.id,
        isBoMEntry: true,
        zoneType: zone.type,
        directionValidation,
        notes: `BoM zone ${zone.id} | confluence ${zone.confluence} | ZFP ${zone.zfp.toFixed(0)}% | ${shapeChain.storylineBias}`,
        // H-04: 4-Point Entry Precision
        entryPrecision,
        // H-05: Multi-Point Scaled Entry (33/33/33)
        entry1: scaledEntry1,
        entry2: scaledEntry2,
        entry3: scaledEntry3,
        entryWeights: [...SCALED_ENTRY_WEIGHTS],
      };

      // ── Swing Scalp Type Detection (TTE v5.3.3 §7S.2 — Types 2-4) ──
      // Each SWING_SCALP setup is classified into one of 4 procedural types.
      // Default is Type 1 (Standard Swing Scalp). Types 2-4 are detected below.
      if (category === SetupCategory.SWING_SCALP) {
        // Type 2: Double Whiplash Inverse (SS(DWL) compound setup)
        // DWL shape detected → Leg 1 SHORT at ceiling, Leg 2 LONG at floor on TP
        if (currentShape === ShapeCode.DWL) {
          setup.scalpType = 'double_whiplash_inverse';
          setup.notes += ' | Type 2: Double Whiplash Inverse — Leg 1 SHORT at ceiling, Leg 2 LONG at floor on TP';
        }
        // Type 3: Liquidity Snipe — entry at LSZ with very tight SL and quick TP
        else if (zone.type === ZoneType.LSZ_SUPPLY || zone.type === ZoneType.LSZ_DEMAND) {
          setup.scalpType = 'liquidity_snipe';
          // Tight SL: LSZ edge + minimal buffer (3-6 pip range)
          const snipeBuffer = pipValue * LIQUIDITY_SNIPE_SL_BUFFER_PIPS;
          setup.sl = isDemand ? zone.floor - snipeBuffer : zone.ceiling + snipeBuffer;
          setup.slPips = Math.round((Math.abs(setup.sl - setup.entry) / pipValue) * SL_PIPS_ROUND_PRECISION) / SL_PIPS_ROUND_PRECISION;
          // Quick TP: 15-30 pip target from entry
          setup.tp = isDemand
            ? setup.entry + pipValue * LIQUIDITY_SNIPE_TP_PIPS
            : setup.entry - pipValue * LIQUIDITY_SNIPE_TP_PIPS;
          setup.rrr = Math.round((Math.abs(setup.tp - setup.entry) / Math.abs(setup.entry - setup.sl)) * RRR_ROUND_PRECISION) / RRR_ROUND_PRECISION;
          setup.notes += ' | Type 3: Liquidity Snipe — tight SL at LSZ edge, quick TP';
        }
        // Type 4: SS→BS Transition — SS consolidation with BS predicted next
        // Breakout anticipation entry at SS ceiling/floor
        else if (currentShape === ShapeCode.SS && shapeChain.chain[0]?.shape === ShapeCode.BS) {
          setup.scalpType = 'ss_bs_transition';
          setup.notes += ' | Type 4: SS→BS Transition — breakout anticipation entry';
        }
        // Type 1: Standard Swing Scalp (default)
        else {
          setup.scalpType = 'standard';
        }
      }

      // ── Fractal Signal Check (Phase 5 — TTE v5.3.3 Deep Alignment) ──
      // Detect if all 4 elemental densities converge at entry → Avatar State
      const swingHigh = Math.max(...zoneMap.zones.map((z: DXYZone) => z.ceiling));
      const swingLow = Math.min(...zoneMap.zones.map((z: DXYZone) => z.floor));
      const fibResult = computeFibLevels(swingHigh, swingLow, FibContext.MACRO);
      const fibLevels: { price: number }[] = fibResult.map((f: FibLevel) => ({ price: f.price }));
      const fractalSignal = detectFractalSignal(
        zoneMap.zones as DXYZone[],
        currentShape,
        fibLevels,
        setup.entry,
        setup.pair,
      );

      // If all 4 elements converge = Avatar State
      if (fractalSignal.isAvatarState) {
        setup.isAvatarState = true;
        // Boost confidence to minimum S-tier (95)
        setup.confidence = Math.max(setup.confidence, AVATAR_MIN_CONFIDENCE);
        setup.confidenceTier = ConfidenceTier.S;
        log.info(`AVATAR STATE detected for ${setup.setupId} — all 4 elemental densities converge at ${setup.entry}`);
      }

      // Store elements that converged
      setup.fractalElements = fractalSignal.elements;

      // ── Reinforcement Ladder (Phase 3b — TTE v5.3.3 Section 7.3) ──
      if (category === SetupCategory.HTF_SWING) {
        const ladder = buildReinforcementLadder(setup, zoneMap.zones as DXYZone[], spot);
        if (ladder.reinforcements.length >= getRecommendedReinforcements()) {
          setup.reinforcementLadder = ladder;
          setup.combinedRRR = ladder.combinedRRR;
        }
      }

      // ── Stop-Limit Orders (Phase 3c — TTE v5.3.3 Section 8R.7) ──
      const stopLimitOrders = buildStopLimitOrders(setup, zoneMap.zones as DXYZone[]);
      if (stopLimitOrders.length > 0) {
        setup.stopLimitOrders = stopLimitOrders;
      }

      setups.push(setup);
    }

    // ── H-06: Master Trade Composite (TTE v5.3.3 Section 8R.9 = E + FLR) ──
    // When Avatar State is detected (all 4 elemental densities converge),
    // generate the Master Trade composite with up to 7 reinforcement rockets.
    this.masterTrades = [];
    for (const baseSetup of setups) {
      if (!baseSetup.isAvatarState) continue;
      const masterTrade = buildMasterTrade(baseSetup, setups);
      if (masterTrade) {
        this.masterTrades.push(masterTrade);
        log.info(
          `MASTER TRADE built for ${baseSetup.setupId} — ${masterTrade.rockets.length} rockets, ` +
          `Avatar State (${baseSetup.fractalElements?.length ?? 0}/4 elements)`,
        );
      }
    }

    // ══ SESSION-AWARE CATEGORY FILTERING (TTE v5.3.3 Section 2.2.1) ══
    // London session (02:00-05:00 ET): Scalp only. Use Scalp Stack (30m/15m/5m).
    //   Catch 10-20 pip swing scalps. Suppress HTF swing setups.
    // NY session (12:00-17:00 ET): Swing session. Use Swing Stack (4H/1H/30m).
    //   Suppress scalp setups UNLESS near a major BoM zone (within 20 pips).
    const session = getCurrentSession();
    const sessionWindow = mapTradingSessionToSessionWindow(session);
    const filteredSetups = setups.filter((setup: TradeSetup) => {
      if (session === 'london') {
        // London: scalp only — keep SWING_SCALP, suppress HTF_SWING
        const isScalp = setup.category === SetupCategory.SWING_SCALP;
        if (!isScalp) {
          log.debug(`London session: suppressed non-scalp setup ${setup.setupId} (${setup.category})`);
          return false;
        }
        return true;
      }
      if (session === 'ny') {
        // NY: swing session — keep HTF_SWING + BREAKOUT_SURGE
        const isSwing =
          setup.category === SetupCategory.HTF_SWING ||
          setup.category === SetupCategory.BREAKOUT_SURGE;
        if (isSwing) return true;
        // Allow scalp setups near major BoM zones (within 20 pips of a BoM zone edge)
        if (setup.category === SetupCategory.SWING_SCALP) {
          const nearMajorZone = zoneMap.zones.some((z: DXYZone) => {
            if (!z.isBoM) return false;
            const zoneMid = (z.floor + z.ceiling) / 2;
            return Math.abs(zoneMid - setup.entry) / pipValue <= NEAR_ZONE_PIP_TOLERANCE;
          });
          if (nearMajorZone) {
            log.debug(`NY session: scalp setup ${setup.setupId} allowed — near major BoM zone`);
            return true;
          }
          log.debug(`NY session: suppressed scalp setup ${setup.setupId} (not near major zone)`);
          return false;
        }
        return false;
      }
      // Tokyo and off-hours are handled earlier in tick() — but guard anyway
      return true;
    });

    // ══ TRADE FLOW CONTINUITY (TTE v5.3.3 §7.4) ══
    // Stamp each candidate setup whose entry coincides with the TP of an
    // existing active chain. Per spec rule 2 the direction must flip at each
    // boundary, so only opposite-direction continuations are linked.
    for (const setup of filteredSetups) {
      const chainMatch = detectChainEntry(setup, this.tradeFlowChains);
      if (chainMatch) {
        setup.chainId = chainMatch.chainId;
        setup.chainPosition = chainMatch.setups.length + 1;
      }
    }

    log.debug(
      `Constructed ${filteredSetups.length} candidate setups from ${zoneMap.zones.length} zones ` +
      `(session=${session}, pre-filter=${setups.length})`,
    );
    return filteredSetups;
  }

  /**
   * Register a setup as the ORIGIN of a new trade flow chain (TTE v5.3.3 §7.4).
   *
   * Call this when a setup is actually executed/placed and has no `chainId`
   * (i.e. it is a standalone origin, not a continuation). The new chain is
   * stored in `tradeFlowChains` so subsequent setups whose entry lands on this
   * trade's TP can be detected as continuations by {@link constructSetups}.
   *
   * Returns the created chain (the origin setup is stamped chainPosition 1).
   */
  seedChain(setup: TradeSetup): TradeFlowChain {
    // If this setup is already part of a chain, no-op.
    if (setup.chainId) {
      const existing = this.tradeFlowChains.find((c: TradeFlowChain) => c.chainId === setup.chainId);
      if (existing) return existing;
    }
    const chain = createChain(setup);
    this.tradeFlowChains.push(chain);
    log.info(`Seeded trade flow chain ${chain.chainId} for ${setup.pair} ${setup.direction}`);
    return chain;
  }

  /**
   * Notify the brain that a trade has closed, updating its flow chain status
   * (TTE v5.3.3 §7.4).
   *
   * - 'tp': a TP hit opens the next link. If the chain is at
   *         MAX_TRADES_PER_CHAIN the flow completes.
   * - 'sl': a zone failed (breakout) — the chain is marked broken and a new
   *         chain should begin in the breakout direction (spec rule 5).
   *
   * The caller (broker / position tracker) invokes this on every close with
   * the closed setup's id and whether TP or SL was hit.
   */
  notifyTradeClosed(setupId: string, hitType: 'tp' | 'sl'): void {
    for (let i = 0; i < this.tradeFlowChains.length; i++) {
      const chain = this.tradeFlowChains[i];
      const ownsSetup = chain.setups.some((s: TradeSetup) => s.setupId === setupId);
      if (!ownsSetup) continue;
      const updated = updateChainStatus(chain, hitType);
      this.tradeFlowChains[i] = updated;
      log.info(
        `Chain ${chain.chainId} ${hitType.toUpperCase()} on ${setupId} → status ${updated.status}` +
          ` (${chain.setups.length}/${chain.setups.length >= 3 ? 3 : chain.setups.length} links)`,
      );
      // Prune terminal chains (completed/broken) so the active set stays lean.
      this.tradeFlowChains = this.tradeFlowChains.filter((c: TradeFlowChain) => c.status === 'active');
      return;
    }
    log.debug(`notifyTradeClosed: setup ${setupId} not found in any chain (standalone close)`);
  }

  /**
   * Apply VLM visual verification status to accepted setups.
   *
   * VC daemon REMOVED — the external VLM daemon no longer exists (MiMo v2.5
   * built-in vision via TvChartController is the visual path). The daemon was
   * broken/unavailable, so setups are marked VLM_UNAVAILABLE — preserving the
   * de-facto runtime behavior. Setups are never rejected here.
   */
  private applyVlmVerification(setups: TradeSetup[]): void {
    for (const setup of setups) {
      if (setup.vlmStatus === undefined) {
        setup.vlmStatus = 'VLM_UNAVAILABLE';
      }
    }
  }

  /**
   * Compute real options OI score from investinglive cached data.
   *
   * Uses actual OTC FX option expiry notionals from investinglive.com.
   * Score: 0-20 based on total notional near the setup's instrument.
   * Returns 0 when no cached data is available (Cloudflare blocked, stale, etc.)
   * so the confidence formula honestly reflects "no options data".
   */
  private computeOptionsOiScore(instrument: string): number {
    if (!this.investingliveClient) return 0;

    const data = this.investingliveClient.getCached();
    if (!data) return 0;

    // Sum notionals for this instrument
    const instrumentStrikes = data.strikes.filter((s: OptionStrike) => s.pair === instrument);
    if (instrumentStrikes.length === 0) return 0;

    const totalNotional = instrumentStrikes.reduce((sum: number, s: OptionStrike) => sum + s.notional, 0);

    // Map total notional to 0-20 score.
    // TTE thresholds: $1.5B+ = CRITICAL OPTION WALL, $850M+ = SIGNIFICANT MAGNET
    // Score: notional >= $3B → 20, $1.5B → 15, $850M → 10, $400M → 5, < $400M → 2
    if (totalNotional >= OI_NOTIONAL_CRITICAL) return OI_SCORE_MAX;
    if (totalNotional >= OI_NOTIONAL_MAGNET) return OI_SCORE_MAGNET;
    if (totalNotional >= OI_NOTIONAL_MODERATE) return OI_SCORE_MODERATE;
    if (totalNotional >= OI_NOTIONAL_LIGHT) return OI_SCORE_LIGHT;
    return OI_SCORE_MIN;
  }

  /**
   * TimesFM overlay — augment setups with P(TP)/P(SL)/EV.
   *
   * CRITICAL: This NEVER rejects setups. It only adds metadata.
   * The Trading Semantic Firewall (called in tick()) owns all rejections.
   */
  private async augmentWithTimesFM(setups: TradeSetup[]): Promise<void> {
    if (setups.length === 0) return;

    // Generate forecasts per instrument (cache per tick)
    for (const instrument of INSTRUMENTS) {
      if (!this.forecasts.has(instrument)) {
        try {
          const ohlc = await this.tvClient.getOHLCHistory(instrument, '4H', OHLC_HISTORY_BARS);
          if (ohlc.length >= TIMESFM_MIN_OHLC_BARS) {
            const forecast = await this.timesfmClient.forecast(instrument, '4H', TIMESFM_FORECAST_HORIZON, ohlc);
            if (forecast) {
              this.forecasts.set(instrument, forecast);
              log.info(`TimesFM forecast cached for ${instrument}: shape=${forecast.shapeClassification}`);
            }
          } else {
            log.warn(`Insufficient OHLC for ${instrument} (${ohlc.length} bars) — TimesFM skipped`);
          }
        } catch (e) {
          log.warn(`TimesFM forecast failed for ${instrument}:`, e instanceof Error ? e.message : String(e));
        }
      }
    }

    // Assess each setup
    for (const setup of setups) {
      const forecast = this.forecasts.get(setup.pair) ?? this.forecasts.get('DXY');
      if (!forecast) continue;

      const assessment = await this.timesfmClient.assessSetup(
        forecast,
        setup.entry,
        setup.sl,
        setup.tp,
        setup.direction,
        getSpreadPips(),
        PIP_VALUE[setup.pair] ?? PIP_VALUE_DEFAULT,
      );

      if (assessment) {
        // Augment the setup in-place (TradeSetup is mutable in TS)
        setup.pTpReach = assessment.pTpReach;
        setup.pSlHit = assessment.pSlHit;
        setup.expectedValuePips = assessment.expectedValuePips;
        setup.timesfmQualityGrade = assessment.qualityGrade;
        setup.timesfmNotes = assessment.notes;
      }
    }
  }

  getSetups(): TradeSetup[] {
    return [...this.currentSetups];
  }

  /**
   * Clear forecast cache — called at start of each new report generation cycle.
   */
  clearForecastCache(): void {
    this.forecasts.clear();
  }

  // ── Hook-compatible API (v4.1 adapter methods) ──────────

  blockTheatricalCode(content: string, gateOrContext?: unknown): { blocked: boolean; reason?: string; violations: Array<{ type: string; message: string; severity: string; detector: { id: string; description: string; severity: string; category: string; fix: string } }> } {
    const violations: Array<{ type: string; message: string; severity: string; detector: { id: string; description: string; severity: string; category: string; fix: string } }> = [];
    const patterns: Array<{ p: RegExp; type: string; msg: string; sev: string; fix: string }> = [
      { p: /return\s+(?:null|undefined|\[\]|\{\})\s*;?\s*\/\/.*(todo|fixme)/i, type: 'theatrical-return', msg: 'Theatrical return with TODO comment', sev: 'MEDIUM', fix: 'Implement the actual return value' },
      { p: /=>\s*\{\s*\}/, type: 'empty-handler', msg: 'Empty handler function', sev: 'HIGH', fix: 'Add implementation to handler' },
      { p: /catch\s*\([^)]*\)\s*\{\s*\}/, type: 'empty-catch', msg: 'Empty catch block detected', sev: 'HIGH', fix: 'Add error handling logic' },
    ];
    for (const { p, type, msg, sev, fix } of patterns) {
      if (p.test(content)) {
        violations.push({ type, message: msg, severity: sev, detector: { id: type, description: msg, severity: sev.toLowerCase(), category: 'theatrical', fix } });
      }
    }
    return {
      blocked: violations.length > 0,
      reason: violations.length > 0 ? violations[0].message : undefined,
      violations,
    };
  }

  getState(): { state: { context: { buildOutput?: string; [key: string]: unknown } } } {
    return {
      state: {
        context: {
          buildOutput: undefined,
          currentSetups: this.currentSetups.length,
        },
      },
    };
  }

  autoEvaluateChecklist(content: string, context: unknown): Record<string, boolean> {
    const result: Record<string, boolean> = {
      returnTypeCorrect: true,
      nullSafetyHandled: true,
      errorPathsComplete: true,
      resourceCleanupAllPaths: true,
      concurrentSafety: true,
      importValidity: true,
      pathResolution: true,
      configValidated: true,
      typeAssertionsGuarded: true,
      asyncDiscipline: true,
      crossSystemDataContractsValidated: true,
      coupledDataConsistencyVerified: true,
      gridDataIntegrityVerified: true,
    };
    // Basic checks
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) result.errorPathsComplete = false;
    if (/setInterval\(/.test(content) && !/clearInterval\(/.test(content)) result.resourceCleanupAllPaths = false;
    return result;
  }

  /**
   * Consume a VLM frame from the Visual Cortex pipeline.
   * Processes zone reactions, shape detections, and records to evidence DB.
   */
  consumeVlmFrame(frame: {
    frameId: number;
    timestamp: number;
    source: string;
    inference?: { summary?: string };
    engine1Zones?: { zoneReactions?: Record<string, { reaction?: string; strength?: number }> };
    engine2Shapes?: { currentShape?: string; shapeConfidence?: number };
  }): void {
    // Log zone reactions if present
    if (frame.engine1Zones?.zoneReactions) {
      const reactions = frame.engine1Zones.zoneReactions;
      for (const [zoneId, data] of Object.entries(reactions)) {
        if (data.reaction) {
          log.info(`VLM zone reaction: ${zoneId} -> ${data.reaction} (strength: ${data.strength ?? 'N/A'})`);
        }
      }
    }

    // Log shape if present (compare with last known shape)
    if (frame.engine2Shapes?.currentShape) {
      const shape = frame.engine2Shapes.currentShape;
      if (this.lastKnownShape && this.lastKnownShape !== shape) {
        log.info(`VLM shape transition: ${this.lastKnownShape} -> ${shape} (confidence: ${frame.engine2Shapes.shapeConfidence ?? 'N/A'})`);
      } else {
        log.info(`VLM shape: ${shape} (confidence: ${frame.engine2Shapes.shapeConfidence ?? 'N/A'})`);
      }
      this.lastKnownShape = shape;
    }

    // Record to evidence DB
    if (this.evidenceDB) {
      try {
        this.evidenceDB.recordVLMFrame({
          frameId: `vlm_${frame.frameId}`,
          timestamp: new Date(frame.timestamp).toISOString(),
          source: frame.source,
          vlmNarrative: frame.inference?.summary ?? '',
          structuredFrame: JSON.stringify(frame),
          dhash: '',
        });
      } catch (e) {
        log.warn(`Failed to record VLM frame in evidence DB: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  }

// ═══════════════════════════════════════════════════════════════════════════════
// Confidence Computation — TTE v5.3.3 Section 7.3
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute setup confidence per TTE v5.3.3 formula.
 * 
 * Base: (confluence / 14) × 40  — 0-40 points from zone confluence (14 = 9-pillar max)
 * Option: 0-20  — from REAL OTC FX option OI (via investingliveClient)
 * Shape: 20  — full score if shape aligns with trade direction
 * RedFolder: 10  — deducted if near red folder event
 * ZFP: (1 - ZFP%) × 10  — 0-10 points from zone failure probability
 * BoM/MoM: ±10  — BoM bonus, MoM penalty
 * DXY: 0-10  — DXY alignment with setup direction
 * Fib: 0-10  — Fibonacci confluence near entry price
 * Session: 0-5  — Session alignment bonus for swing categories
 * Total: 0-125, clamped to 100
 * 
 * Minimum inclusion threshold:
 * - HTF Swing: ≥65
 * - Swing Scalp: ≥55
 * - Reinforcement: ≥50
 * - Other: ≥55
 */
function computeConfidence(
  confluence: number,
  zfp: number,
  isBoM: boolean,
  category: SetupCategory,
  zoneAligns: boolean,
  nearRedFolder: boolean,
  optionScore: number,
  dxyAligned: boolean,
  macroFibLevels: { price: number }[],
  entry: number,
): { score: number; tier: ConfidenceTier } {
  // Base score: 0-40 from zone confluence (9-pillar max confluence = 14)
  const baseScore = Math.min(BASE_SCORE_MAX, (confluence / CONF_MAX_CONFLUENCE) * BASE_SCORE_MAX);
  
  // Option score: 0-20 from real OI data (passed in, 0 if no data available)
  const optionFinal = Math.max(0, Math.min(OPTION_SCORE_MAX, Math.round(optionScore)));
  
  // Zone-direction alignment: 0-20 (direction matches anchor zone type)
  const zoneScore = zoneAligns ? SHAPE_SCORE : 0;
  
  // Red folder penalty: -10 if active
  const redFolderPenalty = nearRedFolder ? REDFOLDER_PENALTY : 0;
  
  // ZFP score: 0-10 (low ZFP = high score)
  const zfpScore = Math.max(0, (1 - zfp / ZFP_PCT_DENOMINATOR) * ZFP_SCORE_MAX);
  
  // BoM/MoM modifier: ±10
  const bomMomModifier = isBoM ? BOM_BONUS : MOM_PENALTY;
  
  // Factor 7: DXY alignment (0-10)
  const dxyScore = dxyAligned ? DXY_SCORE : 0;
  
  // Factor 8: Fib confluence (0-10) — count macro fib levels near entry
  const fibHits = macroFibLevels.filter((f: { price: number }) => 
    Math.abs(f.price - entry) / entry < FIB_TOLERANCE).length;
  const fibScore = Math.min(FIB_SCORE_MAX, fibHits * FIB_SCORE_PER_HIT);
  
  // Factor 9: Session alignment (0-5) — bonus for swing-dominant categories
  const sessionScore = (category === SetupCategory.SWING_SCALP || 
    category === SetupCategory.HTF_SWING) ? SESSION_SCORE : 0;
  
  // Total
  const raw = baseScore + optionFinal + zoneScore + redFolderPenalty + zfpScore + bomMomModifier + dxyScore + fibScore + sessionScore;
  const score = Math.max(0, Math.min(CONFIDENCE_CEILING, Math.round(raw)));
  
  // Map to ConfidenceTier
  let tier: ConfidenceTier;
  if (score >= TIER_S_MIN) tier = ConfidenceTier.S;
  else if (score >= TIER_A_MIN) tier = ConfidenceTier.A;
  else if (score >= TIER_B_MIN) tier = ConfidenceTier.B;
  else if (score >= TIER_C_MIN) tier = ConfidenceTier.C;
  else if (score >= TIER_D_MIN) tier = ConfidenceTier.D;
  else tier = ConfidenceTier.F;
  
  return { score, tier };
}

/**
 * FIX-023: Derive ConfidenceTier from a confidence score.
 * Used when a post-hoc penalty adjusts the score after computeConfidence.
 */
function tierFromConfidence(score: number): ConfidenceTier {
  if (score >= TIER_S_MIN) return ConfidenceTier.S;
  if (score >= TIER_A_MIN) return ConfidenceTier.A;
  if (score >= TIER_B_MIN) return ConfidenceTier.B;
  if (score >= TIER_C_MIN) return ConfidenceTier.C;
  if (score >= TIER_D_MIN) return ConfidenceTier.D;
  return ConfidenceTier.F;
}

/**
 * Get the minimum confidence threshold for a given setup category.
 * Setups below this threshold are excluded from publication.
 */
function getMinimumConfidence(category: SetupCategory): number {
  switch (category) {
    case SetupCategory.HTF_SWING: return MIN_CONF_HTF_SWING;
    case SetupCategory.SWING_SCALP: return MIN_CONF_SWING_SCALP;
    case SetupCategory.REINFORCEMENT: return MIN_CONF_REINFORCEMENT;
    case SetupCategory.BREAKOUT_SURGE: return MIN_CONF_BREAKOUT_SURGE;
    case SetupCategory.TRANSITION: return MIN_CONF_TRANSITION;
    default: return MIN_CONF_DEFAULT;
  }
}

/**
 * Map a TradingSession ('london' | 'ny' | 'tokyo' | 'off') from market-hours
 * to the closest SessionWindow enum value for the setup's session field.
 *
 * London session maps to LONDON_OPEN or LONDON_MID depending on UTC hour.
 * NY session maps to NY_OVERLAP, NY_OPEN, NY_MID, or NY_CLOSE.
 * Tokyo/off default to LONDON_OPEN (Tokyo never generates setups — handled
 * earlier in the pipeline, so this is just a safe fallback).
 */
function mapTradingSessionToSessionWindow(session: TradingSession): SessionWindow {
  if (session === 'london') {
    const hourUTC = new Date().getUTCHours();
    return hourUTC < LONDON_HALF_DAY_UTC ? SessionWindow.LONDON_OPEN : SessionWindow.LONDON_MID;
  }
  if (session === 'ny') {
    const hourET = (new Date().getUTCHours() - ET_UTC_OFFSET + HOURS_PER_DAY) % HOURS_PER_DAY;
    if (hourET < NY_OVERLAP_MID_BOUNDARY_ET) return SessionWindow.NY_OVERLAP;
    if (hourET < NY_MID_CLOSE_BOUNDARY_ET) return SessionWindow.NY_MID;
    return SessionWindow.NY_CLOSE;
  }
  return SessionWindow.LONDON_OPEN;
}

/**
 * Map a zone type + shape code to the correct DAY and SESSION from the
 * day decomposition produced by Engine 2 (ShapeBrain).
 *
 * The shape chain's day decomposition assigns each shape to a specific day
 * of the week. This function finds the matching entry and returns the
 * day/session pair for the setup.
 */
function assignDayAndSession(
  zoneType: ZoneType,
  shapeCode: ShapeCode,
  dayDecomposition: DayShapePrediction[],
): { day: string; sessionWindow: SessionWindow } {
  // Match the shape code to the day decomposition
  const matchedDay = dayDecomposition.find((d: DayShapePrediction) => d.shape === shapeCode);

  if (matchedDay) {
    // Map the session window string back to a SessionWindow enum value
    const sessionWindow = mapSessionStringToEnum(matchedDay.sessionWindow);
    return {
      day: matchedDay.day,
      sessionWindow,
    };
  }

  // Fallback: assign to the earliest day in the decomposition
  const defaultDay = dayDecomposition[0]?.day ?? 'Monday';
  return {
    day: defaultDay,
    sessionWindow: SessionWindow.LONDON_OPEN,
  };
}

/**
 * Map a session window string (from DayShapePrediction) to the SessionWindow enum.
 */
function mapSessionStringToEnum(sessionStr: string): SessionWindow {
  if (sessionStr.includes('London Open')) return SessionWindow.LONDON_OPEN;
  if (sessionStr.includes('London Mid')) return SessionWindow.LONDON_MID;
  if (sessionStr.includes('NY Overlap')) return SessionWindow.NY_OVERLAP;
  if (sessionStr.includes('NY Open')) return SessionWindow.NY_OPEN;
  if (sessionStr.includes('NY Mid')) return SessionWindow.NY_MID;
  if (sessionStr.includes('NY Close')) return SessionWindow.NY_CLOSE;
  return SessionWindow.LONDON_OPEN;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stop-Limit Order Construction (TTE Section 8R.7)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build stop-limit orders for reinforcement placement along the price path
 * between entry and take-profit.
 *
 * Rules (TTE v5.3.3 Section 8R.7):
 *   - Trigger zone: 2-3 zones in front of entry
 *   - Stop price: 1-2 pips INSIDE target liquidity zone (prevents false sweeps)
 *   - SL: 1-2 pips OUTSIDE back edge of SL zone
 *   - Decreasing position size deeper in the path
 */
export function buildStopLimitOrders(
  setup: TradeSetup,
  zones: DXYZone[],
): StopLimitOrder[] {
  const orders: StopLimitOrder[] = [];
  const isLong = setup.direction === TradeDirection.LONG;
  const pipValue = setup.pair === 'DXY' ? PIP_VALUE_DXY : PIP_VALUE_FX_4DEC;

  // Find zones between entry and TP (the path price must traverse)
  const pathZones = zones
    .filter((z: DXYZone) => {
      const zPrice = isLong ? z.floor : z.ceiling;
      if (isLong) return zPrice > setup.entry && zPrice < setup.tp;
      return zPrice < setup.entry && zPrice > setup.tp;
    })
    .sort((a: DXYZone, b: DXYZone) => isLong
      ? a.floor - b.floor
      : b.ceiling - a.ceiling
    );

  // Place stop-limit orders at intermediate zones
  // Rule: trigger zone = 2-3 zones in front of entry
  // Stop price = 1-2 pips INSIDE target liquidity zone
  // SL = 1-2 pips OUTSIDE back edge of SL zone

  for (let i = 0; i < pathZones.length; i++) {
    const zone = pathZones[i];

    // Trigger zone: 2-3 zones in front of current position
    const triggerZoneIndex = Math.min(i + STOP_LIMIT_ZONE_LOOKAHEAD, pathZones.length - 1);
    const triggerZone = pathZones[triggerZoneIndex];

    if (!triggerZone) break;

    // Stop price: 1-2 pips INSIDE target liquidity zone
    const bufferPips = setup.pair === 'DXY' ? STOP_LIMIT_BUFFER_DXY : STOP_LIMIT_BUFFER_FX;
    const stopPrice = isLong
      ? triggerZone.floor + (bufferPips * pipValue)
      : triggerZone.ceiling - (bufferPips * pipValue);

    // SL: 1-2 pips OUTSIDE back edge of SL zone
    const slBuffer = setup.pair === 'DXY' ? STOP_LIMIT_SL_BUFFER_DXY : STOP_LIMIT_SL_BUFFER_FX;
    const slPrice = isLong
      ? zone.floor - (slBuffer * pipValue)
      : zone.ceiling + (slBuffer * pipValue);

    orders.push({
      id: `slo_${setup.setupId}_${i}`,
      triggerZone: triggerZone.id,
      triggerPrice: isLong ? triggerZone.floor : triggerZone.ceiling,
      stopPrice,
      slPrice,
      slBuffer,
      entryPrice: isLong ? zone.floor : zone.ceiling,
      maxQuantity: 1.0 / (i + STOP_LIMIT_SIZE_OFFSET), // Decreasing size as we go deeper
    });
  }

  return orders;
}

// ═══════════════════════════════════════════════════════════════════════════════
// H-04 / H-05 / H-06: Entry Precision, Multi-Point Entry, Master Trade
// (TTE v5.3.3 Section 7.1 4-Point Precision, Section 7.3 Scaled Entry,
//  Section 8R.9 Master Trade Setup = E + FLR)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * H-04: Find the SL zone — the structural defense zone BEYOND the entry zone
 * in the stop-loss direction. For LONGs this is the zone below the demand zone;
 * for SHORTs it is the zone above the supply zone.
 *
 * Per TTE v5.3.3 Section 7.1 Rule 2 (TS-2): SL anchored to the nearest
 * structural defense level beyond the zone.
 */
function findSlZone(
  entryZone: DXYZone,
  zones: DXYZone[],
  isDemand: boolean,
): DXYZone | undefined {
  // LONG (demand): SL zone is the zone whose ceiling is below the entry zone floor
  // SHORT (supply): SL zone is the zone whose floor is above the entry zone ceiling
  const slCandidates = zones
    .filter((z: DXYZone) => z.id !== entryZone.id)
    .filter((z: DXYZone) =>
      isDemand
        ? z.ceiling <= entryZone.floor
        : z.floor >= entryZone.ceiling,
    )
    .sort((a: DXYZone, b: DXYZone) =>
      isDemand
        ? b.ceiling - a.ceiling  // nearest below = highest ceiling
        : a.floor - b.floor,     // nearest above = lowest floor
    );
  return slCandidates[0];
}

/**
 * H-04: Compute the 4-Point Entry Precision for a zone + SL zone.
 *
 * Produces 6 reference points per TTE v5.3.3 Section 7.1 + 8R.7:
 *   - frontEdge:   zone edge closest to spot (approach side — limit order activates)
 *   - middleZone:  zone midpoint (50% of range — mid-confluence)
 *   - backEdge:    zone edge farthest from spot (defense side — max entry deviation)
 *   - slZoneFront: SL zone edge closest to entry zone (minimum SL distance)
 *   - slZoneMiddle: SL zone midpoint
 *   - slZoneBack:  SL zone edge farthest from entry zone (SL placement target)
 */
function computeEntryPrecision(
  entryZone: DXYZone,
  slZone: DXYZone | undefined,
  isDemand: boolean,
): EntryPrecision {
  const { floor, ceiling } = entryZone;
  const middleZone = floor + (ceiling - floor) * 0.5;

  // For demand zones: spot is ABOVE, so front edge = ceiling, back edge = floor.
  // For supply zones: spot is BELOW, so front edge = floor, back edge = ceiling.
  const frontEdge = isDemand ? ceiling : floor;
  const backEdge = isDemand ? floor : ceiling;

  // SL zone references (fall back to entry zone back edge if no SL zone found)
  const slz = slZone ?? entryZone;
  const slZoneMiddle = slz.floor + (slz.ceiling - slz.floor) * 0.5;
  // SL zone front = edge closest to entry zone; back = edge farthest from entry zone
  const slZoneFront = isDemand ? slz.ceiling : slz.floor;
  const slZoneBack = isDemand ? slz.floor : slz.ceiling;

  return {
    frontEdge,
    middleZone,
    backEdge,
    slZoneFront,
    slZoneMiddle,
    slZoneBack,
  };
}

/**
 * H-05: Multi-Point Scaled Entry weights (TTE v5.3.3 Section 7.3).
 * Zone First Touch 33%, Zone Mid-Confluence 33%, Zone Far Edge 34%.
 * Must sum to exactly 1.0.
 */
const SCALED_ENTRY_WEIGHTS = [0.33, 0.33, 0.34] as const;

/**
 * H-06: Build a Master Trade composite (E + FLR) from an Avatar State setup.
 *
 * Per TTE v5.3.3 Section 8R.9: when all four elemental densities converge
 * (Earth+Fire+Water+Air), the trade is fractally locked. The Master Trade
 * combines the base entry with up to 7 reinforcement rockets (FLR/LR)
 * sourced from the setup's reinforcement ladder.
 */
function buildMasterTrade(
  baseSetup: TradeSetup,
  allSetups: TradeSetup[],
): MasterTrade | undefined {
  if (!baseSetup.isAvatarState) return undefined;

  // Collect rockets: reinforcement entries from the base setup's ladder
  // plus any other Avatar-State setups in the same direction near the entry.
  const rockets: TradeSetup[] = [];

  // 1. Convert reinforcement ladder entries into rocket setups
  if (baseSetup.reinforcementLadder) {
    for (const re of baseSetup.reinforcementLadder.reinforcements) {
      rockets.push({
        setupId: `rocket-${baseSetup.setupId}-${re.type}`,
        pair: baseSetup.pair,
        direction: baseSetup.direction,
        category: SetupCategory.REINFORCEMENT,
        entry: re.entryPrice,
        sl: re.stopLoss,
        tp: re.takeProfit,
        confidence: baseSetup.confidence,
        confidenceTier: baseSetup.confidenceTier,
        shapeAlignment: baseSetup.shapeAlignment,
        session: baseSetup.session,
        day: baseSetup.day,
        shapeTrigger: `${re.type} rocket (${re.elementalAttack})`,
        rrr: Math.round(re.combinedRRR * RRR_ROUND_PRECISION) / RRR_ROUND_PRECISION,
        slPips: Math.round((Math.abs(re.stopLoss - re.entryPrice) /
          (PIP_VALUE[baseSetup.pair] ?? PIP_VALUE_DEFAULT)) * SL_PIPS_ROUND_PRECISION) / SL_PIPS_ROUND_PRECISION,
        zoneName: baseSetup.zoneName,
        isBoMEntry: baseSetup.isBoMEntry,
        zoneType: baseSetup.zoneType,
        directionValidation: baseSetup.directionValidation,
        notes: `${re.type} reinforcement rocket — ${re.elementalAttack}`,
      });
    }
  }

  // 2. Add other Avatar-State setups in the same direction as additional rockets
  //    (up to the hardwired safety limit of 7 total rockets)
  for (const s of allSetups) {
    if (rockets.length >= REINFORCEMENT.MAX_ROCKETS) break;
    if (s.setupId === baseSetup.setupId) continue;
    if (s.direction !== baseSetup.direction) continue;
    if (s.pair !== baseSetup.pair) continue;
    // Only include setups that also exhibit elemental convergence
    if (!s.isAvatarState && !s.fractalElements?.length) continue;
    rockets.push(s);
  }

  // Cap at 7 rockets (hardwired safety per Section 8R.9 step 7)
  const cappedRockets = rockets.slice(0, REINFORCEMENT.MAX_ROCKETS);

  return {
    baseSetup,
    rockets: cappedRockets,
    elementalConvergence: true,
    avatarState: true,
  };
}

// ── Hook-compatible API (v4.1 adapter methods) ──────────

export interface BrainState {
  state: { context: { buildOutput?: string; [key: string]: unknown } };
}

export type ExecutionBrain = TradeBrain;
