/**
 * ZoneBrain — Engine 1 + 2 (9-Pillar IP zone mapping).
 *
 * REFACTORED — delegates all zone computation to 4 dedicated lobes:
 *   1. 9-pillar-lobe.ts  — Full P1-P9 pillar scoring + price level detection
 *   2. 4h-sd-lobe.ts     — 4H Supply/Demand zone construction from OHLC
 *   3. bom-mom-lobe.ts   — BoM/MoM classification for zones
 *   4. synthesis-lobe.ts — Confluence scoring, ZFP, clustering, final assembly
 *
 * 200ms tick cycle:
 *   1. Refreshes OHLC data every 60s (cached)
 *   2. For each instrument: runs full 9-pillar engine
 *   3. Constructs 4H supply/demand zones from OHLC
 *   4. Classifies zones as BoM/MoM
 *   5. Assembles final zone map (confluence, ZFP, clustering)
 *   6. Publishes ZoneMapSnapshot via BrainMessenger
 */

import {
  BrainChannel,
  PIP_VALUE,
  ShapeCode,
  DXYRegime,
  type DXYZone,
  type ZoneMapSnapshot,
  type OHLCBar,
  type ShapePredictionSnapshot,
} from '../types.js';
import type { TradingViewClient } from '../clients/tradingview-client.js';
import type { TvWorkspaceClient } from '../clients/tv-workspace-client.js';
import type { BarchartClient, BarchartMAData } from '../clients/barchart-client.js';
import type { TradingViewTechnicalsClient, TVTechnicalsData } from '../clients/tradingview-technicals-client.js';
import type { ForexResearchClient, AnalystConsensus } from '../clients/forex-research-client.js';
import type { InvestingliveClient, OptionsExpiryData } from '../clients/investinglive-client.js';
import type { WebSearchClient, WebSearchCommentary } from '../clients/web-search-client.js';
import type { FedH10Client } from '../clients/fed-h10-client.js';
import type { MarketDataClient } from '../clients/market-data-client.js';
import type { PairDataBundle } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';
import { pillarEngine } from './9-pillar-lobe.js';
import type { PillarResult, PillarInput } from './9-pillar-lobe.js';
import { construct4HZones } from './4h-sd-lobe.js';
import { classifyZones } from './bom-mom-lobe.js';
import { assembleZones } from './synthesis-lobe.js';
import { TIME, BRAIN, PAIR_PRIORITY } from '../constants/trading-constants.js';

const log = new Logger('ZoneBrain');

// Sort instruments by pair priority (H-03: AU > GU > EU per TTE v5.3.3 spec).
// Instruments not in PAIR_PRIORITY (e.g. DXY) are processed last.
const PAIR_PRIORITY_LIST: readonly string[] = PAIR_PRIORITY;
const INSTRUMENTS: string[] = [...BRAIN.INSTRUMENTS].sort((a: string, b: string) => {
  const aIdx = PAIR_PRIORITY_LIST.indexOf(a);
  const bIdx = PAIR_PRIORITY_LIST.indexOf(b);
  const aRank = aIdx === -1 ? PAIR_PRIORITY_LIST.length : aIdx;
  const bRank = bIdx === -1 ? PAIR_PRIORITY_LIST.length : bIdx;
  return aRank - bRank;
});

export class ZoneBrain {
  private zoneCache: Map<string, DXYZone[]> = new Map();
  private spotCache: Map<string, number> = new Map();
  private ohlcCache: Map<string, OHLCBar[]> = new Map();
  private lastDataFetch = 0;
  private readonly dataFetchIntervalMs = TIME.DATA_FETCH_MS; // 1 minute
  // Persist pillar results across ticks for diagnostic access
  private lastPillarResults: Map<string, PillarResult> = new Map();
  // Safe idle — data failure detection
  private lastSuccessfulDataFetch = Date.now();
  private idleLogged = false;

  // FIX-004: Per-pair data bundles for independent pair zone computation.
  private pairDataBundles: Map<string, PairDataBundle> = new Map();

  // FIX-019: Cached web search commentary for P4 institutional S/R levels.
  private webSearchCache: Map<string, WebSearchCommentary> = new Map();
  private lastWebSearchRefresh = 0;
  private readonly webSearchIntervalMs = TIME.TWO_HOURS_MS; // 2 hours

  // v2.0: Local state replaces messenger pub/sub
  private zoneMapVersion = 0;
  private lastZoneMapSnapshot: ZoneMapSnapshot | null = null;
  private injectedShapePrediction: ShapePredictionSnapshot | null = null;

  constructor(
    private tvClient: TradingViewClient,
    private barchartClient?: BarchartClient,
    private tvTechnicalsClient?: TradingViewTechnicalsClient,
    private forexResearchClient?: ForexResearchClient,
    private investingliveClient?: InvestingliveClient,
    private tvWorkspace?: TvWorkspaceClient,
    private webSearchClient?: WebSearchClient,
    private fedH10Client?: FedH10Client,
    private marketDataClient?: MarketDataClient,
  ) {}

  /**
   * v2.0: Inject shape prediction snapshot for zone computation.
   * Replaces the v1.0 messenger.getLatest(SHAPE_PREDICTED) call.
   */
  setShapePrediction(snapshot: ShapePredictionSnapshot | null): void {
    this.injectedShapePrediction = snapshot;
  }

  /**
   * v2.0: Get the latest zone map snapshot.
   * Replaces the v1.0 messenger.getLatest(ZONE_MAPPED) call.
   */
  getLatestZoneMap(): ZoneMapSnapshot | null {
    return this.lastZoneMapSnapshot;
  }

  /**
   * FIX-004: Inject a per-pair data bundle for independent pair zone computation.
   * Each pair's data is harvested independently from 4 sources (16 total fetches).
   * When set, this data takes priority over the client cache for that instrument.
   */
  setPairDataBundle(pair: string, bundle: PairDataBundle): void {
    this.pairDataBundles.set(pair, bundle);
    log.debug(`[${pair}] Per-pair data bundle injected (OHLC=${bundle.ohlc.length}, ` +
      `barchart=${bundle.barchartMAs ? 'Y' : 'N'}, tv=${bundle.tvTechnicals ? 'Y' : 'N'}, ` +
      `forex=${bundle.analystConsensus ? 'Y' : 'N'})`);
  }

  /** FIX-004: Inject per-pair data bundles for all pairs at once. */
  setAllPairData(bundles: Map<string, PairDataBundle>): void {
    for (const [pair, bundle] of bundles) {
      this.setPairDataBundle(pair, bundle);
    }
  }

  /** FIX-004: Get the stored per-pair data bundle for a specific pair. */
  getPairDataBundle(pair: string): PairDataBundle | undefined {
    return this.pairDataBundles.get(pair);
  }

  /**
   * Collect external data for an instrument from cached client data.
   * Non-blocking — uses pre-fetched cache populated by the background refresh cycle.
   * Returns undefined for each source if no cached data exists.
   *
   * FIX-004: Also checks the per-pair data bundle store (set via
   * setPairDataBundle) for independent per-pair data harvested by PairManager.
   * FIX-019: Also returns cached web search commentary for P4 institutional S/R.
   */
  private getExternalData(instrument: string): Pick<PillarInput, 'barchartData' | 'tradingviewTechnicals' | 'analystConsensus' | 'optionsData' | 'webSearchCommentary'> {
    const result: { barchartData?: BarchartMAData; tradingviewTechnicals?: TVTechnicalsData; analystConsensus?: AnalystConsensus; optionsData?: OptionsExpiryData; webSearchCommentary?: WebSearchCommentary } = {};

    // FIX-019: Web search institutional commentary (cached)
    const webCommentary = this.webSearchCache.get(instrument);
    if (webCommentary) {
      result.webSearchCommentary = webCommentary;
    }

    // FIX-004: Check per-pair data bundle first (independent pair data)
    const bundle = this.pairDataBundles.get(instrument);
    if (bundle) {
      if (bundle.barchartMAs) {
        result.barchartData = {
          instrument, timestamp: bundle.fetchedAt, pivotPoint: 0, r1: 0, s1: 0,
          ...bundle.barchartMAs,
        };
      }
      if (bundle.tvTechnicals) {
        result.tradingviewTechnicals = {
          instrument, timestamp: bundle.fetchedAt,
          ema: bundle.tvTechnicals.ema, sma: bundle.tvTechnicals.sma,
          summary: 'Neutral',
        };
      }
      if (bundle.analystConsensus) {
        result.analystConsensus = {
          instrument, timestamp: bundle.fetchedAt,
          hwc: bundle.analystConsensus.hwc, lwc: bundle.analystConsensus.lwc,
          bias: bundle.analystConsensus.bias, sources: bundle.analystConsensus.sources,
        };
      }
    }

    try {
      if (!result.barchartData) {
        const barchart = this.barchartClient?.getCached(instrument);
        if (barchart) result.barchartData = barchart;
      }
    } catch (e) {
      log.debug(`Barchart cache read failed for ${instrument}: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      if (!result.tradingviewTechnicals) {
        const tvTech = this.tvTechnicalsClient?.getCached(instrument);
        if (tvTech) result.tradingviewTechnicals = tvTech;
      }
    } catch (e) {
      log.debug(`TV technicals cache read failed for ${instrument}: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      if (!result.analystConsensus) {
        const forex = this.forexResearchClient?.getCached(instrument);
        if (forex) result.analystConsensus = forex;
      }
    } catch (e) {
      log.debug(`Forex research cache read failed for ${instrument}: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Options data comes from InvestingliveClient cache (populated by agent pipeline)
    try {
      const options = this.investingliveClient?.getCached();
      if (options) result.optionsData = options;
    } catch (e) {
      log.debug(`Options data cache read failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    return result;
  }

  protected async tick(): Promise<BrainChannel[]> {
    const publishedChannels: BrainChannel[] = [];

    // 1. Refresh OHLC data if stale (1 min interval)
    const now = Date.now();
    if (now - this.lastDataFetch > this.dataFetchIntervalMs) {
      await this.refreshOHLCData();
      this.lastDataFetch = now;
    }

    // FIX-019: Refresh web search commentary if stale (2 hour interval)
    if (this.webSearchClient && now - this.lastWebSearchRefresh > this.webSearchIntervalMs) {
      await this.refreshWebSearch();
      this.lastWebSearchRefresh = now;
    }

    // Safe idle check — if no instrument has OHLC data, slow down
    const allEmpty = INSTRUMENTS.every((instr: string) => {
      const bars = this.ohlcCache.get(instr);
      return !bars || bars.length === 0;
    });

    if (allEmpty) {
      const timeSinceLastData = Date.now() - this.lastSuccessfulDataFetch;

      if (timeSinceLastData > 60_000 && !this.idleLogged) {
        log.error(`⚠ PROTOCOL ZONE SOURCE INACCESSIBLE — No market data for 60s. ZoneBrain entering safe idle.`);
        log.warn(`ZoneBrain will retry every 5s. Once data arrives, normal 200ms cycle resumes.`);
        this.idleLogged = true;
      }

      // Slow down when no data — add extra delay so effective cycle is ~5s
      if (timeSinceLastData > 60_000) {
        await new Promise(resolve => setTimeout(resolve, 4800));
      }

      return publishedChannels; // No zones to publish
    } else {
      // Data arrived, reset
      this.lastSuccessfulDataFetch = Date.now();
      this.idleLogged = false;
    }

    // 2. For each instrument, compute zones via lobe pipeline
    for (const instrument of INSTRUMENTS) {
      const ohlc = this.ohlcCache.get(instrument) ?? [];
      // FIX 5: Prefer 5-second-live MarketData spot over 60-second-stale
      // OHLC last close. Falls back to the cached OHLC close when the
      // real-time feed is unavailable or the instrument is unmapped.
      const liveSpot = this.marketDataClient?.getSpot(instrument);
      const spot = liveSpot ?? this.spotCache.get(instrument) ?? 0;
      const pipValue = PIP_VALUE[instrument] ?? 0.0001;

      // FIX 1: Fed H.10 DXY cross-validation — cross-check the
      // TradingView-derived DXY spot against the Federal Reserve H.10
      // computed DXY value (ICE formula from 6 component currencies).
      // Warns when the discrepancy exceeds 0.1%.
      if (instrument === 'DXY' && this.fedH10Client && spot > 0) {
        const fedDxy = this.fedH10Client.computeDXY();
        if (fedDxy !== null) {
          const dxyDiscrepancy = Math.abs(fedDxy - spot) / spot;
          if (dxyDiscrepancy > 0.001) {
            log.warn(
              `DXY discrepancy: TradingView=${spot.toFixed(4)}, Fed H.10=${fedDxy.toFixed(4)} ` +
              `(Δ=${(dxyDiscrepancy * 100).toFixed(3)}%)`,
            );
          }
        }
      }

      if (ohlc.length < 30) {
        log.debug(`Insufficient OHLC for ${instrument} (${ohlc.length} bars) — no zones computed`);
        this.zoneCache.set(instrument, []);
        continue;
      }

      try {
        // 2a. Derive DXY regime from latest shape prediction (needed by P9 pillar)
        const shapeEnv = this.injectedShapePrediction;
        let dxyRegime: 'risk_on' | 'risk_off' | 'transition' | 'chop' = 'chop';
        const currentShape = shapeEnv?.shapeChain?.currentShape;
        const storylineBias = shapeEnv?.shapeChain?.storylineBias ?? '';
        if (currentShape === ShapeCode.BS || currentShape === ShapeCode.PBS) {
          dxyRegime = storylineBias.includes('Bullish') ? DXYRegime.RISK_ON : DXYRegime.RISK_OFF;
        } else if (currentShape === ShapeCode.SS) {
          dxyRegime = DXYRegime.CHOP;
        } else if (currentShape) {
          dxyRegime = DXYRegime.TRANSITION;
        }

        // 2b. Run 9-pillar engine (with external data cross-validation + regime)
        const externalData = this.getExternalData(instrument);
        const pillarResult = pillarEngine({
          instrument,
          bars: ohlc,
          currentPrice: spot,
          dxyRegime,
          ...externalData,
        });
        this.lastPillarResults.set(instrument, pillarResult);

        // 2b. Construct 4H supply/demand zones
        const raw4HZones = construct4HZones({
          bars: ohlc,
          instrument,
          spot,
          pipValue,
        });

        // 2c. Classify 4H zones as BoM/MoM
        const classifiedZones = classifyZones({
          zones: raw4HZones,
          spot,
          pipValue,
          pillarResult: { compositeScore: pillarResult.compositeScore },
        });

        // 2d. Assemble final zone map: merge pillar levels + 4H zones, cluster, finalize
        const finalZones = assembleZones({
          pillarResult,
          classifiedZones,
          spot,
          pipValue,
          instrument,
          bars4H: ohlc, // Step 0.6: pass 4H bars for intra-zone prior close extraction
        });

        // VC daemon VLM zone boosts REMOVED — zones are used as assembled.
        const boostedZones = finalZones;

        this.zoneCache.set(instrument, boostedZones);

        // 3. Build immutable snapshot
        // FIX 5: Merge live MarketData spots into the published snapshot so
        // downstream consumers (TradeBrain, tools, reports) see the freshest
        // prices rather than the 60-second-stale OHLC close.
        const spots: Record<string, number> = {};
        for (const [key, value] of this.spotCache.entries()) {
          spots[key] = this.marketDataClient?.getSpot(key) ?? value;
        }

        this.zoneMapVersion++;
        const snapshot: ZoneMapSnapshot = {
          version: this.zoneMapVersion,
          timestamp: now,
          instrument,
          zones: Object.freeze([...boostedZones]),
          spots: Object.freeze({ ...spots }),
        };

        // 4. Store locally (replaces messenger.publish)
        this.lastZoneMapSnapshot = snapshot;
        publishedChannels.push(BrainChannel.ZONE_MAPPED);

        // 4b. Draw zones on the TradingView chart (non-blocking, primary workspace)
        if (this.tvWorkspace && boostedZones.length > 0) {
          this.tvWorkspace.drawZoneMap(boostedZones).catch((e) => {
            log.debug(`TV drawZoneMap failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
          });
        }
      } catch (e) {
        log.warn(`Zone computation failed for ${instrument}:`, e instanceof Error ? e.message : String(e));
      }
    }

    return publishedChannels;
  }

  /**
   * Refresh OHLC data for all instruments via TradingView.
   * Populates ohlcCache and spotCache.
   */
  private async refreshOHLCData(): Promise<void> {
    log.debug('Refreshing OHLC data...');
    for (const instrument of INSTRUMENTS) {
      try {
        const bars = await this.tvClient.getOHLCHistory(instrument, '4H', 1024);
        if (bars.length > 0) {
          this.ohlcCache.set(instrument, bars);
          // FIX 5: Prefer live MarketData spot over OHLC last close
          const lastClose = bars[bars.length - 1].close;
          const liveSpot = this.marketDataClient?.getSpot(instrument);
          this.spotCache.set(instrument, liveSpot ?? lastClose);
          log.debug(`Got ${bars.length} bars for ${instrument}, spot=${liveSpot ?? lastClose}` +
            (liveSpot !== undefined && liveSpot !== null ? ' (live)' : ' (OHLC close)'));
        }
      } catch (e) {
        log.warn(`OHLC fetch failed for ${instrument}:`, e instanceof Error ? e.message : String(e));
      }
    }

    // After all instruments processed, check if ALL sources failed
    const anyData = INSTRUMENTS.some((instr: string) => (this.ohlcCache.get(instr) ?? []).length > 0);
    if (!anyData) {
      log.error(`⚠ PROTOCOL ZONE SOURCE INACCESSIBLE: ALL data sources failed for all instruments`);
      log.warn(`ZoneBrain will enter safe idle — no market data available`);
    }
  }

  /**
   * FIX-019: Refresh web search institutional commentary for all instruments.
   * Fetches DXY/dollar index analyst commentary from ING, FXStreet, VT Markets,
   * forex.com, Continuum Economics. Extracts explicit S/R levels.
   * Non-blocking — failures are logged and P4 falls back to HP filter proxy.
   */
  private async refreshWebSearch(): Promise<void> {
    if (!this.webSearchClient) return;
    log.debug('Refreshing web search commentary...');
    for (const instrument of INSTRUMENTS) {
      try {
        const commentary = await this.webSearchClient.searchCommentary(instrument);
        if (commentary) {
          this.webSearchCache.set(instrument, commentary);
          log.debug(`[${instrument}] Web search: ${commentary.sources.length} sources, ` +
            `${commentary.resistance.length}R/${commentary.support.length}S levels, bias=${commentary.consensusBias}`);
        }
      } catch (e) {
        log.warn(`Web search failed for ${instrument}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // VC daemon VLM integration REMOVED — MiMo v2.5 built-in vision via TvChartController is the visual path.

  /**
   * Inject zones from external source (Python bundle, manual input).
   * Used by plutus-zones tool to populate the brain with real data.
   */
  injectZones(instrument: string, zones: DXYZone[]): void {
    this.zoneCache.set(instrument, [...zones]);
    log.info(`Injected ${zones.length} zones for ${instrument}`);
  }

  getZones(instrument: string): DXYZone[] {
    return this.zoneCache.get(instrument) ?? [];
  }

  getSpot(instrument: string): number {
    // FIX 5: Prefer live MarketData spot when available
    return this.marketDataClient?.getSpot(instrument) ?? this.spotCache.get(instrument) ?? 0;
  }

  // ── Hook-compatible API (v4.1 adapter methods) ──────────

  semanticAnalyze(content: string, gateOrContext?: unknown): RuntimeViolation[] {
    const violations: RuntimeViolation[] = [];
    // Basic theatrical code detection
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
      violations.push({
        type: 'empty-catch',
        message: 'Empty catch block detected',
        timestamp: Date.now(),
        id: 'RV-001',
        category: 'code-quality',
        description: 'Empty catch block detected',
        severity: 'HIGH',
      });
    }
    if (/=>\s*\{\s*\}/.test(content) && !/=>\s*\{\s*\/\//.test(content)) {
      violations.push({
        type: 'empty-handler',
        message: 'Empty handler function',
        timestamp: Date.now(),
        id: 'RV-002',
        category: 'code-quality',
        description: 'Empty handler function',
        severity: 'HIGH',
      });
    }
    return violations;
  }

  /**
   * Get the last pillar results for an instrument (diagnostic).
   */
  getPillarResults(instrument: string): PillarResult | undefined {
    return this.lastPillarResults.get(instrument);
  }
}

export type SystemBrain = ZoneBrain;

export interface RuntimeViolation {
  type: string;
  message: string;
  timestamp: number;
  id: string;
  category: string;
  description: string;
  severity: string;
}
