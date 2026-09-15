/**
 * Data Harvesting Engine — Gathers ALL data needed for weekly report generation.
 *
 * This is a BATCH operation (run once), not a tick loop. It collects data from
 * 12 external sources and assembles a single HarvestedData object that the
 * TTE engine consumes.
 *
 * Sources:
 *   1.  TradingView        — OHLC bars for 4 pairs (prior week + target week)
 *   2.  Investinglive         — OTC FX option expiries
 *   3.  Economic Calendar     — Red-folder event detection
 *   4.  ForexResearch         — Analyst consensus (HWC/LWC)
 *   5.  Barchart              — MA cheat sheet
 *   6.  TradingView Technicals — EMA/SMA cross-validation
 *   7.  FRED                  — RRP balance + trend
 *   8.  Treasury              — Auction schedule
 *   9.  EIA                   — Petroleum status (energy shock)
 *  10.  Fed H.10              — DXY component exchange rates
 *  11.  WebSearch             — Institutional commentary
 *  12.  MarketData            — Real-time spot prices
 */

import type { OHLCBar, DXYZone } from '../types.js';
import type { TradingViewClient } from '../clients/tradingview-client.js';
import type { InvestingliveClient, OptionsExpiryData, OptionStrike } from '../clients/investinglive-client.js';
import type { EconomicCalendarClient, CalendarEvent } from '../clients/economic-calendar-client.js';
import type { ForexResearchClient, AnalystConsensus } from '../clients/forex-research-client.js';
import type { BarchartClient, BarchartMAData } from '../clients/barchart-client.js';
import type { TradingViewTechnicalsClient, TVTechnicalsData } from '../clients/tradingview-technicals-client.js';
import type { FREDClient, RRPBalance } from '../clients/fred-client.js';
import type { TreasuryClient, AuctionEvent } from '../clients/treasury-client.js';
import type { EIClient, PetroleumReport } from '../clients/eia-client.js';
import type { FedH10Client, ExchangeRate } from '../clients/fed-h10-client.js';
import type { WebSearchClient, WebSearchCommentary } from '../clients/web-search-client.js';
import type { MarketDataClient } from '../clients/market-data-client.js';
import type { PairDataBundle } from '../v1-compat.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('DataHarvester');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Pair = string;

/** DXY index component breakdown from Fed H.10 data. */
export interface DXYComponents {
  eur: number;
  jpy: number;
  gbp: number;
  cad: number;
  sek: number;
  chf: number;
  dxy: number;
}

/** Treasury auction event relevant to the target week. */
export interface TreasuryAuction {
  securityType: string;
  issueDate: string;
  maturityDate: string;
  totalPublic: number;
}

/** Option expiry for a specific pair. */
export interface OptionExpiry {
  pair: Pair;
  strikes: OptionStrike[];
  totalNotional: number;
  fetchedAt: number;
}

/** Analyst data aggregated for a pair. */
export interface AnalystData {
  consensus: AnalystConsensus | undefined;
  barchartMAs: BarchartMAData | undefined;
  tvTechnicals: TVTechnicalsData | undefined;
}

/** Institutional commentary entry from web search. */
export interface CommentaryEntry {
  pair: Pair;
  resistance: number[];
  support: number[];
  consensusBias: string;
  sources: string[];
  fetchedAt: number;
}

/** Provenance audit trail entry — tracks data source, timestamp, and status. */
export interface ProvenanceEntry {
  source: string;
  instrument: string;
  timestamp: number;
  status: 'ok' | 'error' | 'partial';
  detail: string;
}

/** Macro context aggregated from FRED, Treasury, EIA, and Fed H.10. */
export interface MacroContext {
  rrp?: number;
  rrpTrend?: 'increasing' | 'decreasing' | 'stable';
  dxyComponents?: DXYComponents;
  treasuryAuctions?: TreasuryAuction[];
  energyShock?: boolean;
}

/** The complete harvested dataset for one weekly report cycle. */
export interface HarvestedData {
  weekStart: Date;
  weekEnd: Date;
  ohlc: Map<Pair, OHLCBar[]>;
  pairData: Map<Pair, PairDataBundle>;
  options: OptionExpiry[];
  calendar: CalendarEvent[];
  analystConsensus: Map<Pair, AnalystData>;
  macroContext: MacroContext;
  commentary: Map<Pair, CommentaryEntry[]>;
  spots: Map<Pair, number>;
  provenance: ProvenanceEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PAIRS: Pair[] = ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
const TV__SYMBOLS: Record<Pair, string> = {
  'DXY': 'DX-Y.NYB',
  'EUR/USD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'AUD/USD': 'AUDUSD=X',
};
const OHLC_BARS = 512;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA HARVESTER
// ═══════════════════════════════════════════════════════════════════════════════

export class DataHarvester {
  constructor(
    private tvClient: TradingViewClient,
    private investinglive: InvestingliveClient,
    private calendar: EconomicCalendarClient,
    private forexResearch: ForexResearchClient,
    private barchart: BarchartClient,
    private tvTechnicals: TradingViewTechnicalsClient,
    private fred: FREDClient,
    private treasury: TreasuryClient,
    private eia: EIClient,
    private fedH10: FedH10Client,
    private webSearch: WebSearchClient,
    private marketData: MarketDataClient,
  ) {}

  /**
   * Harvest all data for the target week.
   * Runs all fetches in parallel batches, then assembles HarvestedData.
   */
  async harvest(weekStart: Date): Promise<HarvestedData> {
    const weekEnd = new Date(weekStart.getTime() + ONE_WEEK_MS);
    log.info(`Harvesting data for week ${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}`);

    const provenance: ProvenanceEntry[] = [];
    const now = Date.now();

    // ── Batch 1: OHLC + Analyst Consensus (per-pair, parallel) ──
    log.info('Batch 1/4: Fetching OHLC + analyst consensus for all pairs...');
    const ohlcMap = new Map<Pair, OHLCBar[]>();
    const pairDataMap = new Map<Pair, PairDataBundle>();
    const analystMap = new Map<Pair, AnalystData>();

    await Promise.all(PAIRS.map(async (pair) => {
      const symbol = TV__SYMBOLS[pair] ?? pair;

      // OHLC
      try {
        const ohlc = await this.tvClient.getOHLCHistory(symbol, '4H', OHLC_BARS);
        ohlcMap.set(pair, ohlc);
        provenance.push({ source: 'TradingViewFinance', instrument: pair, timestamp: now, status: 'ok', detail: `${ohlc.length} bars` });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`TradingViewFinance OHLC fetch failed for ${pair}: ${reason}`);
        ohlcMap.set(pair, []);
        provenance.push({ source: 'TradingViewFinance', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }

      // Barchart MAs
      let barchartMAs: BarchartMAData | undefined;
      try {
        const result = await this.barchart.fetchCheatSheet(pair);
        if (result.success) {
          barchartMAs = result.data;
          provenance.push({ source: 'Barchart', instrument: pair, timestamp: now, status: 'ok', detail: 'MA data fetched' });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`Barchart MA fetch failed for ${pair}: ${reason}`);
        provenance.push({ source: 'Barchart', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }

      // TradingView Technicals
      let tvTech: TVTechnicalsData | undefined;
      try {
        const result = await this.tvTechnicals.fetchTechnicals(pair);
        if (result.success) {
          tvTech = result.data;
          provenance.push({ source: 'TVTechnicals', instrument: pair, timestamp: now, status: 'ok', detail: 'Technicals fetched' });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`TradingView Technicals fetch failed for ${pair}: ${reason}`);
        provenance.push({ source: 'TVTechnicals', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }

      // Forex Research
      let consensus: AnalystConsensus | undefined;
      try {
        const result = await this.forexResearch.fetchResearch(pair);
        if (result.success) {
          consensus = result.data;
          provenance.push({ source: 'ForexResearch', instrument: pair, timestamp: now, status: 'ok', detail: 'Consensus fetched' });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`ForexResearch fetch failed for ${pair}: ${reason}`);
        provenance.push({ source: 'ForexResearch', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }

      analystMap.set(pair, { consensus, barchartMAs, tvTechnicals: tvTech });

      // Build PairDataBundle for zone brain consumption
      pairDataMap.set(pair, {
        pair,
        ohlc: ohlcMap.get(pair) ?? [],
        barchartMAs: barchartMAs ? {
          ema9: barchartMAs.ema9, ema20: barchartMAs.ema20, ema50: barchartMAs.ema50,
          ema100: barchartMAs.ema100, ema200: barchartMAs.ema200,
          sma9: barchartMAs.sma9, sma20: barchartMAs.sma20, sma50: barchartMAs.sma50,
          sma100: barchartMAs.sma100, sma200: barchartMAs.sma200,
        } : undefined,
        tvTechnicals: tvTech ? { ema: tvTech.ema, sma: tvTech.sma } : undefined,
        analystConsensus: consensus ? {
          hwc: consensus.hwc, lwc: consensus.lwc, bias: consensus.bias, sources: consensus.sources,
        } : undefined,
        fetchedAt: now,
      });
    }));

    // ── Batch 2: Options + Calendar (parallel) ──
    log.info('Batch 2/4: Fetching OTC options + economic calendar...');
    const [optionsResult, calendarResult] = await Promise.allSettled([
      this.investinglive.refreshAll().then(() => this.investinglive.getCached()),
      this.calendar.refreshCalendar(),
    ]);

    const options: OptionExpiry[] = [];
    if (optionsResult.status === 'fulfilled' && optionsResult.value) {
      const data: OptionsExpiryData = optionsResult.value;
      for (const pair of PAIRS) {
        if (pair === 'DXY') continue;
        const strikes = data.strikes.filter((s: OptionStrike) => s.pair === pair);
        if (strikes.length > 0) {
          const totalNotional = strikes.reduce((sum: number, s: OptionStrike) => sum + (s.notional ?? 0), 0);
          options.push({ pair, strikes, totalNotional, fetchedAt: now });
        }
      }
      provenance.push({ source: 'Investinglive', instrument: 'ALL', timestamp: now, status: 'ok', detail: `${options.length} option expiries` });
    } else {
      provenance.push({ source: 'Investinglive', instrument: 'ALL', timestamp: now, status: 'error', detail: 'Options fetch failed' });
    }

    const events: CalendarEvent[] = [];
    if (calendarResult.status === 'fulfilled' && calendarResult.value.success) {
      events.push(...calendarResult.value.data);
      provenance.push({ source: 'EconomicCalendar', instrument: 'ALL', timestamp: now, status: 'ok', detail: `${events.length} events` });
    } else {
      provenance.push({ source: 'EconomicCalendar', instrument: 'ALL', timestamp: now, status: 'error', detail: 'Calendar fetch failed' });
    }

    // ── Batch 3: Macro context (FRED + Treasury + EIA + FedH10, parallel) ──
    log.info('Batch 3/4: Fetching macro context...');
    const macroContext = await this.harvestMacroContext(provenance, now);

    // ── Batch 4: Commentary + Spots (parallel) ──
    log.info('Batch 4/4: Fetching commentary + spot prices...');
    const commentaryMap = new Map<Pair, CommentaryEntry[]>();
    const spotsMap = new Map<Pair, number>();

    await Promise.all(PAIRS.map(async (pair) => {
      // Commentary
      try {
        const commentary = await this.webSearch.searchCommentary(pair);
        if (commentary) {
          commentaryMap.set(pair, [{
            pair,
            resistance: commentary.resistance,
            support: commentary.support,
            consensusBias: commentary.consensusBias,
            sources: commentary.sources,
            fetchedAt: now,
          }]);
          provenance.push({ source: 'WebSearch', instrument: pair, timestamp: now, status: 'ok', detail: `${commentary.sources.length} sources` });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`WebSearch commentary fetch failed for ${pair}: ${reason}`);
        provenance.push({ source: 'WebSearch', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }

      // Spot price
      try {
        const spot = await this.marketData.fetchSpot(pair);
        if (spot !== null) {
          spotsMap.set(pair, spot);
          provenance.push({ source: 'MarketData', instrument: pair, timestamp: now, status: 'ok', detail: `spot=${spot}` });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        log.warn(`MarketData spot fetch failed for ${pair}: ${reason}`);
        provenance.push({ source: 'MarketData', instrument: pair, timestamp: now, status: 'error', detail: reason });
      }
    }));

    // FedH10 spot fallback for DXY
    if (!spotsMap.has('DXY')) {
      const dxy = this.fedH10.computeDXY();
      if (dxy !== null) {
        spotsMap.set('DXY', dxy);
      }
    }

    const okCount = provenance.filter(p => p.status === 'ok').length;
    const errCount = provenance.filter(p => p.status === 'error').length;
    log.info(`Harvest complete: ${okCount} ok, ${errCount} errors out of ${provenance.length} sources`);

    return {
      weekStart,
      weekEnd,
      ohlc: ohlcMap,
      pairData: pairDataMap,
      options,
      calendar: events,
      analystConsensus: analystMap,
      macroContext,
      commentary: commentaryMap,
      spots: spotsMap,
      provenance,
    };
  }

  /**
   * Harvest macro context from FRED, Treasury, EIA, and Fed H.10.
   */
  private async harvestMacroContext(provenance: ProvenanceEntry[], now: number): Promise<MacroContext> {
    const [fredResult, treasuryResult, eiaResult, fedH10Result] = await Promise.allSettled([
      this.fred.refreshRRP(),
      this.treasury.refreshAuctions(),
      this.eia.refreshPetroleum(),
      this.fedH10.refreshRates(),
    ]);

    const macro: MacroContext = {};

    // FRED RRP
    if (fredResult.status === 'fulfilled' && fredResult.value.success) {
      const rrp: RRPBalance = fredResult.value.data;
      macro.rrp = rrp.balance;
      macro.rrpTrend = rrp.trend;
      provenance.push({ source: 'FRED', instrument: 'ALL', timestamp: now, status: 'ok', detail: `RRP=${rrp.balance}B, trend=${rrp.trend}` });
    } else {
      provenance.push({ source: 'FRED', instrument: 'ALL', timestamp: now, status: 'error', detail: 'RRP fetch failed' });
    }

    // Treasury auctions
    if (treasuryResult.status === 'fulfilled' && treasuryResult.value.success) {
      const auctions: AuctionEvent[] = treasuryResult.value.data;
      macro.treasuryAuctions = auctions.map((a: AuctionEvent) => ({
        securityType: a.securityType,
        issueDate: a.issueDate,
        maturityDate: a.maturityDate,
        totalPublic: a.totalPublic,
      }));
      provenance.push({ source: 'Treasury', instrument: 'ALL', timestamp: now, status: 'ok', detail: `${auctions.length} auctions` });
    } else {
      provenance.push({ source: 'Treasury', instrument: 'ALL', timestamp: now, status: 'error', detail: 'Auction fetch failed' });
    }

    // EIA petroleum shock
    if (eiaResult.status === 'fulfilled' && eiaResult.value.success) {
      const report: PetroleumReport = eiaResult.value.data;
      macro.energyShock = report.isMajorShock;
      provenance.push({ source: 'EIA', instrument: 'ALL', timestamp: now, status: 'ok', detail: `crude=${report.crudeOilChange}M, shock=${report.isMajorShock}` });
    } else {
      provenance.push({ source: 'EIA', instrument: 'ALL', timestamp: now, status: 'error', detail: 'Petroleum fetch failed' });
    }

    // Fed H.10 DXY components
    if (fedH10Result.status === 'fulfilled' && fedH10Result.value.success) {
      const rates: ExchangeRate[] = fedH10Result.value.data;
      const find = (ccy: string): number | undefined => rates.find((r: ExchangeRate) => r.currency === ccy)?.rate;
      const dxy = this.fedH10.computeDXY();
      const eur = find('EUR');
      const jpy = find('JPY');
      const gbp = find('GBP');
      const cad = find('CAD');
      const sek = find('SEK');
      const chf = find('CHF');
      if (eur !== undefined && jpy !== undefined && gbp !== undefined &&
          cad !== undefined && sek !== undefined && chf !== undefined && dxy !== null) {
        macro.dxyComponents = { eur, jpy, gbp, cad, sek, chf, dxy };
      }
      provenance.push({ source: 'FedH10', instrument: 'DXY', timestamp: now, status: 'ok', detail: `DXY=${dxy ?? 'N/A'}` });
    } else {
      provenance.push({ source: 'FedH10', instrument: 'DXY', timestamp: now, status: 'error', detail: 'H.10 fetch failed' });
    }

    return macro;
  }
}
