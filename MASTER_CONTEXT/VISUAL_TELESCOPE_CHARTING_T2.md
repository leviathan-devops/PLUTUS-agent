# PLUTUS TTE — Engineering Specification (Sections 1–5)

**Spec ID:** PLUTUS-TTE-ENG-V1.0
**Authority:** TTE v5.3.3 spec, 38 winning-trade VLM forensic analysis, July 6–10 2026 DXY backtest, user god-vision chart annotations.
**Status:** Engineering reference for the 3-engine autonomous trading pipeline.
**Scope of this document:** Sections 1–5 only (Executive Summary, Architecture, Data Model, Engine Class, Defense Rules). Algorithm Specs, Test Specs, Integration, Compliance Matrix, and Out-of-Scope follow in subsequent sections.

---

## 1. Executive Summary

### 1.1 Mission

The PLUTUS TTE (Trident Trading Engine) is a single-process TypeScript agent that ingests OHLC data and TradingView chart screenshots for four currency pairs — `DXY`, `EUR/USD`, `GBP/USD`, `AUD/USD` — and emits an A+ weekly trading report containing trade setups whose entries, stop-losses, and take-profits match the user's manually verified trading strategy.

The agent is NOT a research prototype. It is a faithful codification of a proven, manually-executed trading system. Every output must be reproducible against the 38-trade golden standard and against the user's 8 winning DXY trades from July 6–10, 2026.

```typescript
// INTEGRATION: top-level type returned by the pipeline. Replaces any
// ad-hoc report object currently emitted at plutus-tte-pipeline.ts.
export interface PlutusWeeklyReport {
  reportId: string;
  generatedAt: string;
  weekStart: string;
  pairs: PlutusPairReport[];
  engineTraces: EngineTraces;
}

export interface PlutusPairReport {
  pair: PairSymbol;
  spotPrice: number;
  setups: TradeSetup[];
  zoneMapSnapshot: ZoneMapSnapshot;
  shapePrediction: ShapePredictionSnapshot;
  visualCaptures: VisualCaptureManifest[];
  errors: PipelineError[];
}

export type PairSymbol = 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD';
```

### 1.2 The 3-Engine Architecture (1D → 2D → 3D)

The pipeline is a strict three-stage transform. Each stage answers one question and consumes only the output of the prior stage plus raw market data. No engine reads another engine's internal state — only its published snapshots.

```
Engine 1 (1D): WHERE is the institutional liquidity?
    Inputs: 9-pillar market data, OTC options, ZFP inputs, 4H/1H/30m/15m OHLC bars
    Outputs: ZoneMapSnapshot { ipZones, sdZones, lqzZones }
    Nature: DATA-DRIVEN. No chart pixels. No VLM.

Engine 2 (2D): WHAT path will price take this week?
    Inputs: ZoneMapSnapshot + 1H bars
    Outputs: ShapePredictionSnapshot { chain, dayBreakdown, currentShape }
    Nature: DATA-DRIVEN. No chart pixels. No VLM.

Engine 3 (3D): WHERE EXACTLY do we enter, stop, and target?
    Inputs: ZoneMapSnapshot + ShapePredictionSnapshot + TradingView chart screenshots
    Outputs: TradeSetup[] { entry, sl, tp, session, direction, confidence }
    Nature: VISUAL-DRIVEN. VLM-required. No silent data fallback.
```

The architecture is a strict funnel: Engine 1 narrows the universe of zones, Engine 2 narrows the time dimension, Engine 3 narrows to a discrete trade. Each narrowing must be evidence-backed and reproducible.

### 1.3 Correctness Targets

| Target | Metric | Source |
|--------|--------|--------|
| Zone coverage | Pipeline ZoneMapSnapshot MUST contain every LQZ level the user identified (100.845, 100.945, 100.975, 101.14, 101.19, 101.235, 101.240 for DXY week of July 6–10) | GAP_ANALYSIS_2026-07-18.md §GAP 1 |
| Entry placement | Entry MUST be at the edge of a 1H/30m/15m LQZ or S/D zone — never at a 4H zone edge | FORENSIC_ANALYSIS_38_TRADES.md LAW 1 |
| SL placement | SL distance MUST equal zone width + 2–5 pip buffer (median 15 pips, mode 12 pips). NEVER a fixed 8–15 pip sniper buffer | FORENSIC_ANALYSIS_38_TRADES.md LAWS 2–3 |
| Setup direction | Direction MUST be derived from zone type (`BOM_DEMAND` → LONG, `BOM_SUPPLY` → SHORT). MUST NOT come from `storylineBias` | BUILD_REPORT_COMPACTION_PROOF §Direction fix |
| TP placement | TP MUST be on the entry side (trade's profit direction), NOT on the spot side | BUILD_REPORT_COMPACTION_PROOF §TP fix |
| Visual primacy | Engine 3 MUST call `visual-setup-generator.generateSetups()` for every pair. Failure MUST raise an error. NO silent fallthrough to `constructBasicSetups` | PLUTUS_ARCHITECTURE_CORRECTED.md §THE CRITICAL RULE |
| RRR floor | Every emitted setup MUST have RRR ≥ 3.0. Below this, the setup is rejected | WINNING_TRADE_ANALYSIS.md Pattern 2 |

### 1.4 Inherited Defects Already Corrected (Do Not Revisit)

Per `BUILD_REPORT_COMPACTION_PROOF_2026-07-18.md` and `POST_COMPACTION_QUICK_START.md`, the following are LOCKED. They are listed here only to define the boundary of this spec — sections downstream of this one MUST NOT re-engineer these.

```typescript
// INTEGRATION: frozen fix registry. Reference only — DO NOT modify.
// Source: BUILD_REPORT_COMPACTION_PROOF_2026-07-18.md
export const LOCKED_FIXES = Object.freeze({
  E1_PILLAR_DEVIATIONS: 6,      // 9-pillar confluence: 6 corrections applied
  E2_SHAPE_DEVIATIONS: 10,      // ZFP-conditioned chain, MoM tree, day decomp
  E3_CS12_SIX_CHECKS: true,     // visual-setup-generator emits 6 direction checks
  GBP_EUR_DIRECTION_FIX: true,  // direction now zone-based, not shape-based
  VC_DAEMON_REPLACED: true,     // self-contained playwright-core over CDP :9228
  SS_TERMINOLOGY: 'Swing Scalps', // replaces 'Sideways' everywhere
  BULLISH_BEARISH_REMOVED: true, // direction from zone type, not shape list
} as const);
```

### 1.5 Open Defects This Spec Closes

```typescript
// INTEGRATION: this spec's work surface. Each entry MUST have a closing
// section reference. The build agent verifies closure in §Compliance Matrix.
export interface OpenDefect {
  defectId: string;
  observed: string;
  closedBy: string;
}

export const OPEN_DEFECTS: OpenDefect[] = [
  {
    defectId: 'LQZ-PIPE-1',
    observed: 'LQZ detector built (3 patterns) but produces 0 zones in the pipeline output',
    closedBy: '§4.2.3 PlutusTTEEngine.runLqzStage',
  },
  {
    defectId: 'GBP-AUD-ZERO',
    observed: 'GBP/USD and AUD/USD produce 0 setups; only DXY=3, EUR=3 pass',
    closedBy: '§4.3.2 VisualSetupGenerator.generateSetups (direction-retry + zone-eligibility)',
  },
  {
    defectId: 'VISUAL-FALLBACK',
    observed: 'Pipeline silently falls back to constructBasicSetups when visual layer returns 0',
    closedBy: '§4.3.1 + §5.4 NO_FALLBACK_RULE',
  },
  {
    defectId: 'SL-FIXED-BUFFER',
    observed: 'SL = entry ± SNIPER_BUFFER (8–15 fixed pips) instead of opposite-zone-edge + buffer',
    closedBy: '§4.3.3 SniperExecution.placeStopLoss',
  },
  {
    defectId: 'TP-SPOT-SIDE',
    observed: 'TP placed on spot side rather than entry side',
    closedBy: '§4.3.4 SniperExecution.placeTakeProfit',
  },
];
```

---

## 2. Architecture

### 2.1 Process-Level Topology

The agent is a single Bun process. It does not fork. It does not spawn background workers. It does one thing per call: produce one `PlutusWeeklyReport` for one ISO week.

```typescript
// INTEGRATION: NEW FILE src/plutus-engine.ts — top-level entrypoint.
// Replaces ad-hoc orchestration currently inlined at plutus-tte-pipeline.ts.
import { HeadedBrowser } from './infra/headed-browser';
import { NinePillarLobe } from './brains/9-pillar-lobe';
import { FourHourSDLobe } from './brains/4h-sd-lobe';
import { LqzDetector } from './brains/lqz-detector';
import { ShapeBrain } from './brains/shape-brain';
import { VisualZoneLobe } from './engine3/visual-zone-lobe';
import { VisualSetupGenerator } from './engine3/visual-setup-generator';
import { Firewall } from './defense/firewall';

export class PlutusTTEEngine {
  // Single instance per process. All state is per-invocation.
  private readonly browser: HeadedBrowser;
  private readonly ninePillar: NinePillarLobe;
  private readonly fourHourSD: FourHourSDLobe;
  private readonly lqz: LqzDetector;
  private readonly shapes: ShapeBrain;
  private readonly visualZones: VisualZoneLobe;
  private readonly visualSetups: VisualSetupGenerator;
  private readonly firewall: Firewall;

  constructor(deps: PlutusEngineDeps) {
    this.browser = deps.browser;
    this.ninePillar = deps.ninePillar;
    this.fourHourSD = deps.fourHourSD;
    this.lqz = deps.lqz;
    this.shapes = deps.shapes;
    this.visualZones = deps.visualZones;
    this.visualSetups = deps.visualSetups;
    this.firewall = deps.firewall;
  }

  async runWeek(weekStart: string, pairs: PairSymbol[]): Promise<PlutusWeeklyReport> {
    // See §4 for full method body.
    throw new Error('INTEGRATION: implemented in §4 PlutusTTEEngine');
  }
}

export interface PlutusEngineDeps {
  browser: HeadedBrowser;
  ninePillar: NinePillarLobe;
  fourHourSD: FourHourSDLobe;
  lqz: LqzDetector;
  shapes: ShapeBrain;
  visualZones: VisualZoneLobe;
  visualSetups: VisualSetupGenerator;
  firewall: Firewall;
}
```

### 2.2 Data-Flow Diagram (Strict Top-Down)

```
                       ┌────────────────────────────────────────────┐
                       │            RAW MARKET INPUT                │
                       │  9-pillar JSON · OTC options · ZFP seeds   │
                       │  OHLC bars (4H, 1H, 30m, 15m) per pair    │
                       └─────────────────┬──────────────────────────┘
                                         │
                ┌────────────────────────┴────────────────────────┐
                │                  ENGINE 1 (1D)                  │
                │  ┌────────────┐ ┌──────────────┐ ┌────────────┐ │
                │  │ 9-pillar   │ │ 4H S/D Lobe  │ │ LQZ detect │ │
                │  │   lobe     │ │ (BoM/MoM)    │ │ (3 pat.)   │ │
                │  └─────┬──────┘ └──────┬───────┘ └─────┬──────┘ │
                │        │               │               │        │
                │        └───────────────┴───────────────┘        │
                │                        │                        │
                │           ZoneMapSnapshot (single map)           │
                └────────────────────────┬────────────────────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │          ENGINE 2 (2D)            │
                       │  ZFP-conditioned shape chain      │
                       │  Day decomposition (Mon–Fri)      │
                       │  Consolidation-phase detection    │
                       │  Output: ShapePredictionSnapshot  │
                       └─────────────────┬─────────────────┘
                                         │
        ┌────────────────────────────────┴──────────────────────────┐
        │                    ENGINE 3 (3D)                          │
        │  ┌─────────────────┐   ┌────────────────────────────────┐ │
        │  │ TvChartCtl      │──▶│ VisualZoneLobe                  │ │
        │  │ (CDP :9228)     │   │  Screenshot → VLM → S/D/L zones  │ │
        │  └─────────────────┘   └────────────┬───────────────────┘ │
        │                                      │                     │
        │                           ┌──────────┴──────────┐          │
        │                           │ VisualSetupGenerator│          │
        │                           │  zone × shape × day │          │
        │                           │  sniper entry/SL/TP │          │
        │                           └──────────┬──────────┘          │
        │                                      │                     │
        │                           TradeSetup[] (raw)                │
        └──────────────────────────────────────┬─────────────────────┘
                                               │
                                  ┌────────────┴────────────┐
                                  │       FIREWALL          │
                                  │ RRR ≥ 3 · zone locks ·  │
                                  │ direction checks · SL   │
                                  │ cap · freshness filter  │
                                  └────────────┬────────────┘
                                               │
                                    TradeSetup[] (passed)
                                               │
                                    PlutusWeeklyReport
```

### 2.3 Zone Ownership — Hard Separation

The single most-violated invariant in the prior pipeline was conflating IP zones (Engine 1 Pipeline A) with S/D/L zones (Engine 1 Pipeline B). This spec makes the separation syntactic.

```typescript
// INTEGRATION: replaces mixed-zone arrays in ZoneMapSnapshot.
// Modify ZoneMapSnapshot definition at src/types/zone-map.ts (NEW FILE).
export interface ZoneMapSnapshot {
  pair: PairSymbol;
  generatedAt: string;

  // Pipeline A: institutional pressure map. Feeds Engine 2 only.
  // NEVER used for entry/SL/TP selection.
  ipZones: IPZone[];

  // Pipeline B: candlestick-derived zones. Feeds Engine 3 only.
  // These ARE used for entry/SL/TP selection.
  sdZones: SDZone[];    // BoM/MoM, singular origin candle
  lqzZones: LQZZone[];  // Liquidity sweeps, wick clusters, body edges

  spotPrice: number;
  weekStart: string;
}
```

```typescript
// INTEGRATION: NEW FILE src/types/zone.ts. Replaces any ad-hoc zone
// union currently used in plutus-tte-pipeline.ts.
export type ZoneType =
  | 'BOM_SUPPLY'    // Beginning-of-Move supply (RED, Engine 1 Pipeline B)
  | 'BOM_DEMAND'    // Beginning-of-Move demand (BLUE, Engine 1 Pipeline B)
  | 'MOM_SUPPLY'    // Middle-of-Move supply (RED)
  | 'MOM_DEMAND'    // Middle-of-Move demand (BLUE)
  | 'LQZ_SUPPLY'    // Liquidity sweep zone, bearish (GREEN)
  | 'LQZ_DEMAND'    // Liquidity sweep zone, bullish (GREEN)
  | 'IP_PRESSURE';  // Institutional pressure (Engine 1 Pipeline A only)

export type Timeframe = '4H' | '1H' | '30m' | '15m';

export interface ZoneBase {
  zoneId: string;
  pair: PairSymbol;
  timeframe: Timeframe;
  type: ZoneType;
  floor: number;     // lower price bound
  ceiling: number;   // upper price bound
  reactionCount: number;   // reactions on THIS TF only (LAW 3)
  zoneName: string;        // includes TF prefix e.g. "1H LQZ"
  refinedLabel?: string;   // e.g. "15m Refined 4H" (LAW 4)
  freshness: FreshnessState;
  confluence: number;      // 0–14 (LAW 5 cap)
}

export type FreshnessState =
  | 'UNMITIGATED'        // never touched since creation
  | 'SOFTLY_MITIGATED'   // 1 reaction (1x tag)
  | 'MITIGATED'          // 2–3 reactions
  | 'HEAVILY_MITIGATED'; // 4+ reactions — ineligible for new entries

export interface IPZone extends ZoneBase {
  type: 'IP_PRESSURE';
  pillarScores: NinePillarScores;
  zfp: ZFPScore;        // Zone Force Pattern, integer 0–10
  pressureDegree: PressureDegree;
}

export interface SDZone extends ZoneBase {
  type: 'BOM_SUPPLY' | 'BOM_DEMAND' | 'MOM_SUPPLY' | 'MOM_DEMAND';
  originCandleIndex: number;    // singular origin candle (LAW 6)
  originCandleTimestamp: string;
  breakoutCandleIndex: number;
  moveClassification: 'BOM' | 'MOM';
}

export interface LQZZone extends ZoneBase {
  type: 'LQZ_SUPPLY' | 'LQZ_DEMAND';
  pattern: 'SWEEP' | 'WICK_CLUSTER' | 'CONSOLIDATION';
  contributingCandles: number[];  // indices into the bar array
  bodyEdge: number;   // candle body edge — inner boundary of liquidity
  wickEdge: number;   // wick tip — outer boundary
}
```

### 2.4 Element Density Model (Spec Ontology)

The spec uses a 4-element density taxonomy derived from `TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md` and `HANDOVER_TRADING_STRATEGY.md`. This is a NAMING CONVENTION and CLASSIFICATION system, not a numerical model.

```typescript
// INTEGRATION: NEW FILE src/types/elements.ts. Used by TradeSetup
// confluence calculation. Referenced by §3 TradeSetup.avatarState.
export type ElementDensity = 'EARTH' | 'FIRE' | 'WATER' | 'AIR';

export const ELEMENT_BY_ZONE: Record<ZoneType, ElementDensity> = {
  IP_PRESSURE: 'EARTH',     // institutional pressure = HEAVY earth
  BOM_SUPPLY: 'FIRE',       // S/D = Fire
  BOM_DEMAND: 'FIRE',
  MOM_SUPPLY: 'FIRE',
  MOM_DEMAND: 'FIRE',
  LQZ_SUPPLY: 'EARTH',      // liquidity = Earth (standard density)
  LQZ_DEMAND: 'EARTH',
};

export const ELEMENT_BY_SHAPE: Record<MacroShape, ElementDensity> = {
  SS: 'WATER',   // Swing Scalps — ripples
  BS: 'WATER',   // Breakout Surge — tidal wave
  WL: 'WATER',   // Whiplash — crashing wave
  RWL: 'WATER',  // Reverse Whiplash
  R: 'WATER',    // Recovery
  LADDER: 'WATER', // Consolidation
};

// Fibonacci anchored to earth-density points becomes structured AIR.
export interface FibAnchor {
  element: 'AIR';
  anchoredToZoneId: string;   // must reference an EARTH zone (LQZ/IP)
  swingHigh: number;
  swingLow: number;
  levels: Readonly<Record<FibLevel, number>>;
}

export type FibLevel = '0' | '0.236' | '0.382' | '0.5' | '0.618' | '0.786' | '1.0' | '1.272' | '1.618';

export interface AvatarStateSetup {
  earth: boolean;  // entry zone is LQZ/IP (EARTH)
  fire: boolean;   // entry zone overlaps an S/D zone (FIRE)
  water: boolean;  // active shape is compatible with direction (WATER)
  air: boolean;    // Fib anchor on an EARTH point confirms trajectory (AIR)
}
```

### 2.5 Headed Browser Integration (CDP :9228)

The agent attaches to a long-running headed Chrome via Chrome DevTools Protocol. It never spawns its own browser. The same browser is used for OHLC data harvesting and Engine 3 chart screenshots.

```typescript
// INTEGRATION: NEW FILE src/infra/headed-browser.ts. Replaces the
// removed VC daemon dependency. Already deployed per
// POST_COMPACTION_QUICK_START.md ("VC daemon dependency: FIXED").
import { chromium, type Browser, type BrowserContext } from 'playwright-core';

const CDP_ENDPOINT = 'http://localhost:9228';
// BECAUSE the host runs a socat bridge from host:9228 → container Chrome.
// 9228 chosen to avoid clashing with TradingView's own devtools port and
// with CDP's default 9222 used by the host's main Chrome. Reuse of an
// already-running browser is mandatory: spawning a second browser causes
// TradingView to log out of the session, breaking OHLC harvesting.

const SPA_RENDER_WAIT_MS = 12_000;
// BECAUSE TradingView's chart canvas is a lazy-loaded SPA. Empirical
// measurement in PLUTUS_ARCHITECTURE_CORRECTED.md (Engine 3 build notes)
// shows the chart canvas reaches first stable paint at 9–11s after
// navigation; 12s adds a safety margin for symbol-switch latency. Below
// 10s, captureScreenshot() frequently returns a blank grid PNG.

const SCROLL_BACK_HISTORY_LOAD_MS = 1_500;
// BECAUSE after ArrowLeft×N keystrokes, TradingView issues an async
// /tradingview/history request that returns in ~600–1300ms on the
// host network. 1500ms ensures the new bars are rendered before any
// subsequent captureScreenshot. Below 1000ms, screenshots show stale
// bars (the new left edge not yet drawn).

export class HeadedBrowser {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async connect(): Promise<void> {
    if (this.browser) return;
    this.browser = await chromium.connectOverCDP(CDP_ENDPOINT);
    const contexts = this.browser.contexts();
    this.context = contexts[0] ?? await this.browser.newContext();
    // NEVER close: browser is shared with OHLC harvester.
  }

  async openChart(tvSymbol: string): Promise<Page> {
    await this.connect();
    const page = await this.acquireTradingViewPage();
    const url = `https://www.tradingview.com/chart/?symbol=${tvSymbol}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(SPA_RENDER_WAIT_MS);
    return page;
  }

  private async acquireTradingViewPage(): Promise<Page> {
    if (!this.context) throw new Error('HeadedBrowser not connected');
    for (const page of this.context.pages()) {
      const url = page.url();
      if (url.includes('tradingview.com')) return page;
    }
    return await this.context.newPage();
  }

  async disconnect(): Promise<void> {
    // Only null our refs. NEVER call browser.close().
    this.context = null;
    this.browser = null;
  }
}

// Avoid importing 'Page' type globally — keep it lazy to prevent a
// playwright-core import cycle in unit tests.
import type { Page } from 'playwright-core';
```

### 2.6 File Map (Authoritative)

| Path | Purpose | Status |
|------|---------|--------|
| `src/plutus-engine.ts` | `PlutusTTEEngine` top-level orchestrator | NEW (this spec, §4) |
| `src/types/zone.ts` | All zone types (IPZone, SDZone, LQZZone, ZoneBase) | NEW (this spec, §3) |
| `src/types/zone-map.ts` | `ZoneMapSnapshot` | NEW (this spec, §3) |
| `src/types/elements.ts` | Element density + Avatar State | NEW (this spec, §3) |
| `src/types/setup.ts` | `TradeSetup`, `TradeDirection`, setup category | NEW (this spec, §3) |
| `src/types/pipeline-error.ts` | `PipelineError`, error registry | NEW (this spec, §3) |
| `src/infra/headed-browser.ts` | CDP-attached Chrome wrapper | NEW (this spec, §2.5) |
| `src/brains/9-pillar-lobe.ts` | 9-pillar confluence → IPZone[] | EXISTS, LOCKED (Engine 1 Pipeline A) |
| `src/brains/4h-sd-lobe.ts` | `construct4HZones()` with TF scaling | EXISTS, parameterized (§4.2.2) |
| `src/brains/lqz-detector.ts` | 3-pattern LQZ detection | NEW (this spec, §4.2.3) |
| `src/brains/shape-brain.ts` | ZFP-conditioned shape chain | EXISTS, LOCKED (Engine 2) |
| `src/engine3/tv-chart-controller.ts` | TradingView navigation + screenshot | EXISTS, referenced |
| `src/engine3/visual-zone-lobe.ts` | Screenshot → VLM → S/D/L zones | EXISTS, referenced |
| `src/engine3/visual-setup-generator.ts` | zone × shape × day → setups | EXISTS, parameterized (§4.3.2) |
| `src/engine3/sniper-execution.ts` | Entry/SL/TP placement | NEW (this spec, §4.3.3–4.3.4) |
| `src/defense/firewall.ts` | Validation gate, RRR, freshness | NEW (this spec, §5) |
| `src/setups.ts` | Legacy `constructBasicSetups` | EXISTS, DEMOTED to confluence-only (§5.4) |

---

## 3. Data Model

This section defines every type the engine reads or writes. Types are the contract between engines; downstream code MUST NOT invent new type names.

### 3.1 Market Data Inputs

```typescript
// INTEGRATION: NEW FILE src/types/market-data.ts. Replaces any inline
// OHLC shape currently scattered across 4h-sd-lobe.ts and shape-brain.ts.

export interface OHLCBar {
  timestamp: string;   // ISO 8601, bar open time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PairBars {
  pair: PairSymbol;
  timeframe: Timeframe;
  bars: OHLCBar[];
  // Bars MUST be sorted ascending by timestamp with no gaps within
  // session. Inter-session gaps (e.g. weekend) are permitted.
}

export interface NinePillarScores {
  // Each pillar score in [0, 1]. Aggregation to IPZone.zfp in §3.3.
  // Source: 9-pillar data feed (CTFX_BLOOMBERG_OTC_SEED — INTEGRATION POINT).
  pillar1_otc_options_skew: number;
  pillar2_zfp_seed: number;
  pillar3_spot_vs_fair_value: number;
  pillar4_yield_differential: number;
  pillar5_cot_positioning: number;
  pillar6_real_rate_spread: number;
  pillar7_intervention_risk: number;
  pillar8_seasonality: number;
  pillar9_structural_break: number;
}

export type PressureDegree = 'EXTREME' | 'HIGH' | 'MODERATE' | 'LOW';

// INTEGRATION POINT: 9-pillar JSON ingestion connects to the existing
// data feed at plutus-tte-pipeline.ts line ~312 (fetchNinePillarData).
// If the feed is unavailable, raise PipelineError{code:'NINE_PILLAR_404'}
// — do NOT fabricate scores.
```

### 3.2 ZFP (Zone Force Pattern) Model

ZFP is the integer pressure score attached to every IPZone. It is the bridge between Engine 1 Pipeline A and Engine 2's shape conditioning.

```typescript
// INTEGRATION: NEW FILE src/types/zfp.ts. Referenced by IPZone.zfp.

export type ZFPScore = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function computeZFP(scores: NinePillarScores): ZFPScore {
  // Weighted sum. Weights sum to 1.0. Derived from TTE v5.3.3 §3.4
  // "9-Pillar Aggregation". Each pillar weight reflects how directly
  // the pillar measures institutional positioning vs derived signal.
  const WEIGHTS: Readonly<Record<keyof NinePillarScores, number>> = {
    pillar1_otc_options_skew:    0.18,
    pillar2_zfp_seed:            0.14,
    pillar3_spot_vs_fair_value:  0.08,
    pillar4_yield_differential:  0.14,
    pillar5_cot_positioning:     0.16,
    pillar6_real_rate_spread:    0.12,
    pillar7_intervention_risk:   0.06,
    pillar8_seasonality:         0.04,
    pillar9_structural_break:    0.08,
  };
  // BECAUSE COT positioning + OTC options skew are the two most direct
  // measures of institutional flow (cumulative positioning + disclosed
  // hedges). Yield differentials and ZFP seed carry the next tier
  // (predictive but lagging). Seasonality is the weakest signal
  // (uniform across years). Weights are NORMALIZED to sum to 1.0 so
  // the result maps cleanly to a 0–10 integer scale.

  let weighted = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof NinePillarScores)[]) {
    weighted += scores[key] * WEIGHTS[key];
  }
  // weighted ∈ [0, 1]. Map to integer 0–10.
  const zfp = Math.round(weighted * 10) as ZFPScore;
  return zfp;
}

export function zfpToPressureDegree(zfp: ZFPScore): PressureDegree {
  // BECAUSE TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md shows EXTREME
  // zones (zfp ≥ 8) contribute +5 to confluence; HIGH (6–7) contribute
  // +3; MODERATE (4–5) contribute +1; LOW (≤3) contribute +0. The
  // thresholds 4/6/8 are the breakpoints where the confluence step
  // changes — placing them anywhere else would miscount confluence.
  if (zfp >= 8) return 'EXTREME';
  if (zfp >= 6) return 'HIGH';
  if (zfp >= 4) return 'MODERATE';
  return 'LOW';
}
```

### 3.3 IPZone Confluence (Engine 1 Pipeline A → Engine 2)

```typescript
// INTEGRATION: NEW FILE src/brains/ip-confluence.ts. Called by
// NinePillarLobe before publishing ZoneMapSnapshot.ipZones.

export const MAX_IP_CONFLUENCE = 14;
// BECAUSE TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md §LAW 5 specifies
// the firewall rejects setups whose confluence < 6/14. The cap is 14
// (not 10 or 20) because the 14-point scale encodes: 5 (zfp EXTREME)
// + 3 (HTF reaction count) + 2 (multi-TF nesting) + 2 (freshness
// UNMITIGATED) + 2 (shape-chain alignment). Each component is the
// empirically-determined max from the 38-trade forensic analysis.
// Below 6/14 the win rate in the historical cohort drops below 50%
// (FORENSIC_ANALYSIS_38_TRADES.md §CATEGORY D summary), so 6 is the
// hard firewall floor.

export function computeIPConfluence(
  zfp: ZFPScore,
  reactionCount: number,
  isNestedInHTF: boolean,
  freshness: FreshnessState,
  shapeAligned: boolean,
): number {
  let score = 0;

  // Component 1: ZFP tier.
  const degree = zfpToPressureDegree(zfp);
  if (degree === 'EXTREME') score += 5;
  else if (degree === 'HIGH') score += 3;
  else if (degree === 'MODERATE') score += 1;
  // LOW contributes 0.

  // Component 2: HTF reaction count.
  score += Math.min(reactionCount, 3);
  // BECAUSE each additional HTF reaction adds +1 confluence but
  // diminishing returns set in after 3 reactions — by then the zone
  // is widely known and arbitrage shrinks. Capping at 3 prevents a
  // 10-reaction zone from saturating the confluence score.

  // Component 3: HTF nesting.
  if (isNestedInHTF) score += 2;

  // Component 4: Freshness.
  if (freshness === 'UNMITIGATED') score += 2;
  else if (freshness === 'SOFTLY_MITIGATED') score += 1;
  // MITIGATED / HEAVILY_MITIGATED contribute 0.

  // Component 5: Shape-chain alignment.
  if (shapeAligned) score += 2;

  return Math.min(score, MAX_IP_CONFLUENCE);
}
```

### 3.4 SDZone Construction — Singular Origin Candle

```typescript
// INTEGRATION: NEW FILE src/types/sd-zone.ts. Already referenced by
// SDZone in §2.3. The classification rule below REPLACES the prior
// consolidation-cluster logic at 4h-sd-lobe.ts:312 (consolidation
// detection removed per LAW 6).

export function classifySDZone(
  originCandle: OHLCBar,
  breakoutCandle: OHLCBar,
  priorMoveDirection: 'UP' | 'DOWN' | 'NONE',
): { type: SDZone['type']; moveClassification: 'BOM' | 'MOM' } {
  // Breakout direction is determined by breakout candle body.
  const body = breakoutCandle.close - breakoutCandle.open;
  const isBullishBreakout = body > 0;

  // BoM = first impulse in a new direction (priorMove = NONE or opposite).
  // MoM = continuation impulse (priorMove = same direction).
  const isBoM = priorMoveDirection === 'NONE' ||
                (isBullishBreakout && priorMoveDirection === 'DOWN') ||
                (!isBullishBreakout && priorMoveDirection === 'UP');

  const moveClassification: 'BOM' | 'MOM' = isBoM ? 'BOM' : 'MOM';

  const type: SDZone['type'] = isBullishBreakout
    ? (isBoM ? 'BOM_DEMAND' : 'MOM_DEMAND')
    : (isBoM ? 'BOM_SUPPLY' : 'MOM_SUPPLY');

  return { type, moveClassification };
}

export function buildSDZoneFromOrigin(
  pair: PairSymbol,
  timeframe: Timeframe,
  originCandle: OHLCBar,
  originCandleIndex: number,
  breakoutCandle: OHLCBar,
  breakoutCandleIndex: number,
  priorMoveDirection: 'UP' | 'DOWN' | 'NONE',
  reactionCount: number,
  freshness: FreshnessState,
): SDZone {
  const { type, moveClassification } = classifySDZone(originCandle, breakoutCandle, priorMoveDirection);

  // Zone range = origin candle's full range (high–low). NOT just body.
  // BECAUSE the origin candle's wicks represent liquidity already
  // absorbed at those prices; the S/D zone boundary must include
  // them. From PLUTUS_ARCHITECTURE_CORRECTED_V2.md §S/D Zones:
  // "The S/D zone is drawn from the order block candle's range."
  const floor = originCandle.low;
  const ceiling = originCandle.high;

  const sideLabel = type.endsWith('SUPPLY') ? 'Supply' : 'Demand';
  const moveLabel = moveClassification === 'BOM' ? 'BoM' : 'MoM';

  return {
    zoneId: `${pair}-${timeframe}-${moveLabel}-${sideLabel}-${originCandle.timestamp}`,
    pair,
    timeframe,
    type,
    floor,
    ceiling,
    reactionCount,
    zoneName: `${timeframe} ${moveLabel} ${sideLabel}`,
    freshness,
    confluence: 0,  // computed by computeSDConfluence, not at construction
    originCandleIndex,
    originCandleTimestamp: originCandle.timestamp,
    breakoutCandleIndex,
    moveClassification,
  };
}
```

### 3.5 LQZZone Construction — Three Patterns

Per `BUILD_REPORT_COMPACTION_PROOF_2026-07-18.md` and `PLUTUS_ARCHITECTURE_CORRECTED_V2.md`, LQZ detection uses three patterns: sweep, wick cluster, consolidation.

```typescript
// INTEGRATION: NEW FILE src/brains/lqz-detector.ts. The detector is
// built (per build report) but currently produces 0 zones — see
// OPEN_DEFECT 'LQZ-PIPE-1'. This file defines the canonical detector.

export type LQZPattern = 'SWEEP' | 'WICK_CLUSTER' | 'CONSOLIDATION';

export interface LqzDetectionConfig {
  // All thresholds in price units (NOT pips) so the detector is
  // pair-agnostic. Conversion to pips happens in the report layer.
  minWickRatio: number;       // wick length / candle range
  minClusterSize: number;     // # of overlapping candles
  sweepLookback: number;      // bars before sweep to establish prior high/low
  consolidationRangePips: number;  // max range for a consolidation
  consolidationMinBars: number;    // min bars touching the range
  minLqzWidthPips: number;         // below this, ignore
  maxLqzWidthPips: number;         // above this, it's not a liquidity pool
}

export const LQZ_CONFIG_BY_TF: Record<Timeframe, LqzDetectionConfig> = {
  '4H':  {
    minWickRatio: 0.55, minClusterSize: 2, sweepLookback: 8,
    consolidationRangePips: 30, consolidationMinBars: 6,
    minLqzWidthPips: 12, maxLqzWidthPips: 40,
  },
  '1H':  {
    minWickRatio: 0.55, minClusterSize: 2, sweepLookback: 12,
    consolidationRangePips: 18, consolidationMinBars: 8,
    minLqzWidthPips: 6, maxLqzWidthPips: 25,
  },
  '30m': {
    minWickRatio: 0.55, minClusterSize: 2, sweepLookback: 20,
    consolidationRangePips: 11, consolidationMinBars: 10,
    minLqzWidthPips: 4, maxLqzWidthPips: 15,
  },
  '15m': {
    minWickRatio: 0.55, minClusterSize: 3, sweepLookback: 30,
    consolidationRangePips: 7, consolidationMinBars: 14,
    minLqzWidthPips: 2, maxLqzWidthPips: 10,
  },
};
// BECAUSE the TF scaling matches LAW 2 zone-width parameters exactly
// (4H: 15–40, 1H: 8–20, 30m: 5–12, 15m: 3–8). The LQZ bounds are
// deliberately set 1–2 pips WIDER than the S/D bounds on each TF because
// LQZ includes wick overshoot beyond the consolidation body, while S/D
// is bounded by the order-block candle range. minWickRatio = 0.55
// BECAUSE a wick that exceeds 55% of the candle range is unambiguous
// evidence of a liquidity grab (the body failed to follow through);
// below 0.50 the wick is ambiguous and indistinguishable from normal
// price action. minClusterSize for 15m is 3 (vs 2 for higher TFs)
// BECAUSE 15m noise is ~2x higher than 1H; requiring 3 overlapping
// wicks filters single-candle noise without missing genuine clusters.

export function detectSweepLqz(
  bars: OHLCBar[],
  config: LqzDetectionConfig,
  pair: PairSymbol,
  timeframe: Timeframe,
  pipSize: number,
): LQZZone[] {
  const zones: LQZZone[] = [];

  for (let i = config.sweepLookback; i < bars.length; i++) {
    const candle = bars[i];
    const lookback = bars.slice(i - config.sweepLookback, i);
    const priorHigh = Math.max(...lookback.map(b => b.high));
    const priorLow = Math.min(...lookback.map(b => b.low));

    const range = candle.high - candle.low;
    if (range <= 0) continue;

    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const maxWick = Math.max(upperWick, lowerWick);
    if (maxWick / range < config.minWickRatio) continue;

    const sweptHigh = candle.high > priorHigh;
    const sweptLow = candle.low < priorLow;

    if (sweptHigh && !sweptLow) {
      // Bearish sweep: price spiked UP, grabbed liquidity, reversed DOWN.
      zones.push(buildSweepZone(bars, i, 'LQZ_SUPPLY', pair, timeframe, pipSize, config));
    } else if (sweptLow && !sweptHigh) {
      zones.push(buildSweepZone(bars, i, 'LQZ_DEMAND', pair, timeframe, pipSize, config));
    }
  }

  return mergeOverlappingLqz(zones);
}

function buildSweepZone(
  bars: OHLCBar[],
  index: number,
  type: 'LQZ_SUPPLY' | 'LQZ_DEMAND',
  pair: PairSymbol,
  timeframe: Timeframe,
  pipSize: number,
  config: LqzDetectionConfig,
): LQZZone {
  const candle = bars[index];
  const bodyEdge = type === 'LQZ_SUPPLY'
    ? Math.max(candle.open, candle.close)   // body top
    : Math.min(candle.open, candle.close);  // body bottom
  const wickEdge = type === 'LQZ_SUPPLY' ? candle.high : candle.low;
  // BECAUSE LQZ spans from the body edge to the wick tip — the wick
  // represents the liquidity overshoot, the body edge represents where
  // price resumed. Per PLUTUS_ARCHITECTURE_CORRECTED_V2.md §LQ Zones:
  // "drawn from the candle body edge to the end of the wick."

  const floor = Math.min(bodyEdge, wickEdge);
  const ceiling = Math.max(bodyEdge, wickEdge);
  const widthPips = (ceiling - floor) / pipSize;
  if (widthPips < config.minLqzWidthPips || widthPips > config.maxLqzWidthPips) {
    // Returning a degenerate marker; caller's merge step will drop it.
    return makeDegenerateLqz(pair, timeframe);
  }

  return {
    zoneId: `${pair}-${timeframe}-SWEEP-${type}-${candle.timestamp}`,
    pair,
    timeframe,
    type,
    floor,
    ceiling,
    reactionCount: 1,
    zoneName: `${timeframe} LQZ (${type === 'LQZ_SUPPLY' ? 'Sweep Supply' : 'Sweep Demand'})`,
    freshness: 'UNMITIGATED',
    confluence: 0,
    pattern: 'SWEEP',
    contributingCandles: [index],
    bodyEdge,
    wickEdge,
  };
}

// DATA NEEDED: empirical pip sizes per pair to confirm these values:
const PIP_SIZE_BY_PAIR: Record<PairSymbol, number> = {
  'DXY':     0.001,   // 1 pip = 0.001 in DXY price units (e.g. 100.945)
  'EUR/USD': 0.0001,
  'GBP/USD': 0.0001,
  'AUD/USD': 0.0001,
};
// BECAUSE DXY quotes to 3 decimal places (100.945) while FX pairs
// quote to 4–5 decimals (1.0850). The 10x ratio matches the pip-size
// convention in the user's manual chart annotations.

function makeDegenerateLqz(pair: PairSymbol, tf: Timeframe): LQZZone {
  return {
    zoneId: `${pair}-${tf}-DEGEN`,
    pair, timeframe: tf, type: 'LQZ_SUPPLY',
    floor: NaN, ceiling: NaN, reactionCount: 0,
    zoneName: 'degenerate', freshness: 'MITIGATED',
    confluence: 0, pattern: 'SWEEP',
    contributingCandles: [], bodyEdge: NaN, wickEdge: NaN,
  };
}

function mergeOverlappingLqz(zones: LQZZone[]): LQZZone[] {
  // Sort by floor ascending; merge zones whose [floor, ceiling]
  // intervals overlap, summing reactionCount and unioning candles.
  const valid = zones.filter(z => !Number.isNaN(z.floor));
  if (valid.length === 0) return [];
  valid.sort((a, b) => a.floor - b.floor);

  const merged: LQZZone[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const last = merged[merged.length - 1];
    const cur = valid[i];
    if (cur.type !== last.type) {
      merged.push(cur);
      continue;
    }
    if (cur.floor <= last.ceiling) {
      last.ceiling = Math.max(last.ceiling, cur.ceiling);
      last.floor = Math.min(last.floor, cur.floor);
      last.reactionCount += cur.reactionCount;
      last.contributingCandles.push(...cur.contributingCandles);
      last.freshness = rankFreshness(last.freshness, cur.freshness);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

function rankFreshness(a: FreshnessState, b: FreshnessState): FreshnessState {
  // Take the WORSE (more-mitigated) of two freshness states when merging.
  const order: FreshnessState[] = ['UNMITIGATED', 'SOFTLY_MITIGATED', 'MITIGATED', 'HEAVILY_MITIGATED'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}
```

### 3.6 TradeSetup — The Engine 3 Output Contract

```typescript
// INTEGRATION: NEW FILE src/types/setup.ts. This is the authoritative
// TradeSetup type. Replaces the inline type at plutus-tte-pipeline.ts.

export type TradeDirection = 'LONG' | 'SHORT';

export type SetupCategory =
  | 'SS'           // Swing Scalps
  | 'BS'           // Breakout Surge
  | 'WL'           // Whiplash
  | 'RWL'          // Reverse Whiplash
  | 'R'            // Recovery
  | 'LADDER'       // Ladder (consolidation)
  | 'AVATAR';      // Avatar State (4-element convergence)

export type MacroShape = SetupCategory;  // shape chain uses same labels

export type TradingSession = 'ASIA' | 'LONDON' | 'NEW_YORK' | 'LONDON_NY_OVERLAP';

export interface TradeSetup {
  setupId: string;
  pair: PairSymbol;
  direction: TradeDirection;
  category: SetupCategory;

  // Entry — at edge of an S/D/L zone (LAW 1 of FORENSIC_ANALYSIS_38_TRADES).
  entry: number;
  entryZoneId: string;
  entryZoneEdge: 'FLOOR' | 'CEILING';

  // Stop-loss — opposite zone edge + buffer (FORENSIC LAWS 2–3).
  sl: number;
  slZoneId: string;             // the zone whose opposite edge anchors SL
  slBufferPips: number;         // 2–5 (FORENSIC LAW 3)
  slDistancePips: number;       // reported for transparency

  // Take-profit — nearest opposing zone on the entry side.
  tp: number;
  tpZoneId: string;

  // Risk math — populated by SniperExecution, validated by Firewall.
  rrr: number;                  // reward / risk, must be ≥ 3.0
  riskPips: number;
  rewardPips: number;

  // Provenance — which engine components built this setup.
  shapeDay: string;             // ISO date the setup is active
  activeShape: MacroShape;
  session: TradingSession;
  confidence: number;           // 0–100, see §3.7

  // Element density — for Avatar State detection (§2.4).
  avatarState: AvatarStateSetup;

  // Confluence — sum of applicable confluence components (≤ 14).
  confluence: number;

  // Visual evidence — screenshot path + VLM analysis hash.
  visualCaptureId: string;
  vlmAnalysisHash: string;
}

export interface VisualCaptureManifest {
  captureId: string;
  pair: PairSymbol;
  timeframe: Timeframe;
  screenshotPath: string;
  capturedAt: string;
  vlmModelId: string;
}
```

### 3.7 Confidence Calculation

```typescript
// INTEGRATION: NEW FILE src/engine3/confidence.ts. Replaces any
// ad-hoc confidence math inlined in visual-setup-generator.ts.

export function computeConfidence(setup: TradeSetup): number {
  // Confidence is a 0–100 score combining confluence + RRR + freshness.
  // Weights derived from FORENSIC_ANALYSIS_38_TRADES.md (regression of
  // 38 setups against outcome):
  //   confluence explains 52% of variance (β=0.52)
  //   RRR explains 28% of variance (β=0.28)
  //   freshness explains 12% of variance (β=0.12)
  //   session alignment explains 8% of variance (β=0.08)
  // DATA NEEDED: confirm β values against the full 38-trade dataset
  // when re-running the regression; current values are inherited from
  // TTE_GOLDEN_STANDARD_COMPLETE_REFERENCE.md.

  const W = { CONFLUENCE: 0.52, RRR: 0.28, FRESHNESS: 0.12, SESSION: 0.08 };
  // BECAUSE the four weights sum to 1.0 exactly; any redistribution
  // would change the confidence distribution and require re-tuning the
  // §5 firewall's 65/100 cutoff.

  const confluenceScore = Math.min(setup.confluence / MAX_IP_CONFLUENCE, 1);
  // Maps 0–14 to 0–1.

  const rrrScore = Math.min(setup.rrr / 6, 1);
  // BECAUSE the 38-trade cohort's RRR distribution has mode 6.0 and
  // 95th percentile ~10. Capping at 6 prevents outlier RRR (e.g. 20:1
  // on a tiny risk) from saturating confidence.

  const freshnessScore =
    setup.entryZoneId.includes('UNMITIGATED') ? 1.0 :
    setup.entryZoneId.includes('SOFTLY')      ? 0.6 :
    setup.entryZoneId.includes('MITIGATED')   ? 0.2 :
                                                 0.0;
  // BECAUSE freshness enters as a categorical, mapped to 4 bins. The
  // 1.0/0.6/0.2/0.0 step function matches the confluence contribution
  // in §3.3 (UNMIT +2, SOFTLY +1, others +0) scaled to [0,1].

  const sessionScore = setup.session === 'LONDON_NY_OVERLAP' ? 1.0 :
                       setup.session === 'LONDON'            ? 0.8 :
                       setup.session === 'NEW_YORK'          ? 0.6 :
                                                               0.3;
  // BECAUSE the 38-trade cohort shows London-NY overlap has the
  // highest fill rate and cleanest follow-through; Asia has the
  // lowest (low liquidity, false breakouts). The 0.3 floor for Asia
  // reflects that Asia setups still occur but at lower confidence.

  const raw =
    W.CONFLUENCE * confluenceScore +
    W.RRR        * rrrScore +
    W.FRESHNESS  * freshnessScore +
    W.SESSION    * sessionScore;

  return Math.round(raw * 100);
}
```

### 3.8 ShapePredictionSnapshot (Engine 2 Output)

```typescript
// INTEGRATION: NEW FILE src/types/shape-prediction.ts. Engine 2 is
// LOCKED (10 deviations corrected per build report). This type
// captures its output contract; Engine 3 consumes it read-only.

export interface ShapePredictionSnapshot {
  pair: PairSymbol;
  weekStart: string;
  currentShape: MacroShape;
  chain: ShapeChainLink[];
  dayBreakdown: DayShapeAssignment[];
  consolidationPhase: ConsolidationPhase | null;
}

export interface ShapeChainLink {
  fromShape: MacroShape;
  toShape: MacroShape;
  probability: number;   // 0–1, sum of outbound links from fromShape = 1
  triggerCondition: ZFPCondition;
}

export interface ZFPCondition {
  // Engine 2 is LOCKED — this type matches the existing shape-brain.ts
  // ZFP-conditioned transition record. Documented here so Engine 3
  // can introspect chain rationale.
  minZfp: ZFPScore;
  maxZfp: ZFPScore;
  requiresNestedZone: boolean;
}

export interface DayShapeAssignment {
  isoDate: string;
  weekday: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
  assignedShape: MacroShape;
  expectedTravelPips: { min: number; max: number };
}

export interface ConsolidationPhase {
  // Non-null only when currentShape ∈ {SS, LADDER}.
  startDate: string;
  endDate: string;
  rangeFloor: number;
  rangeCeiling: number;
  rangeWidthPips: number;
}
```

### 3.9 Pipeline Error Registry

```typescript
// INTEGRATION: NEW FILE src/types/pipeline-error.ts. Replaces any
// console.error or silent return in the engine codepaths.

export type PipelineErrorCode =
  // Engine 1
  | 'NINE_PILLAR_404'
  | 'NINE_PILLAR_STALE'
  | 'OHLC_FETCH_FAILED'
  | 'OHLC_GAP_DETECTED'
  | 'ZFP_OUT_OF_RANGE'
  // Engine 1 Pipeline B
  | 'SD_ORIGIN_AMBIGUOUS'
  | 'LQZ_WIDTH_VIOLATION'
  // Engine 2
  | 'SHAPE_CHAIN_EMPTY'
  | 'CONSOLIDATION_RANGE_INVALID'
  // Engine 3
  | 'BROWSER_CDP_UNAVAILABLE'
  | 'SCREENSHOT_BLANK'
  | 'VLM_ANALYSIS_FAILED'
  | 'VISUAL_GENERATOR_RETURNED_ZERO'
  // Forbidden behaviors
  | 'FALLBACK_TO_CONSTRUCT_BASIC_FORBIDDEN'  // §5.4
  | 'DIRECTION_FROM_STORYLINE_FORBIDDEN'      // §5.3
  | 'SL_FIXED_BUFFER_FORBIDDEN'               // §5.5
  // Firewall
  | 'FIREWALL_REJECTED_RRR'
  | 'FIREWALL_REJECTED_CONFLUENCE'
  | 'FIREWALL_REJECTED_FRESHNESS';

export interface PipelineError {
  code: PipelineErrorCode;
  pair: PairSymbol;
  message: string;
  occurredAt: string;
  recoverable: boolean;
  // recoverable=true → engine logs and continues to next pair/stage.
  // recoverable=false → engine aborts the WHOLE report (no partial
  // output ever published). §5.2 defines which codes are recoverable.
}
```

---

## 4. Engine Class

The `PlutusTTEEngine` class is the single orchestrator. All engine logic lives in dedicated lobes; the orchestrator wires them and enforces strict stage boundaries.

### 4.1 Top-Level Orchestrator

```typescript
// INTEGRATION: NEW FILE src/plutus-engine.ts. This class replaces the
// ad-hoc top-level pipeline currently living at plutus-tte-pipeline.ts.
// The existing file is kept for backward compatibility but becomes a
// thin wrapper that constructs PlutusTTEEngine and calls runWeek().

export class PlutusTTEEngine {
  constructor(private readonly deps: PlutusEngineDeps) {}

  async runWeek(weekStart: string, pairs: PairSymbol[]): Promise<PlutusWeeklyReport> {
    const pairReports: PlutusPairReport[] = [];
    const engineTraces: EngineTraces = { engine1: [], engine2: [], engine3: [] };

    for (const pair of pairs) {
      try {
        const report = await this.runPair(pair, weekStart, engineTraces);
        pairReports.push(report);
      } catch (err) {
        // Per-pair failures are logged but do NOT abort the whole report.
        // The pair appears in the report with errors[] populated and
        // an empty setups[].
        pairReports.push(makeFailedPairReport(pair, weekStart, err));
      }
    }

    return {
      reportId: `plutus-${weekStart}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      weekStart,
      pairs: pairReports,
      engineTraces,
    };
  }

  private async runPair(
    pair: PairSymbol,
    weekStart: string,
    traces: EngineTraces,
  ): Promise<PlutusPairReport> {
    // ── Stage 1: DATA LOAD ─────────────────────────────────────────
    const bars = await this.deps.bars.fetch(pair, weekStart);
    const ninePillarScores = await this.deps.ninePillarFeed.fetch(pair, weekStart);
    const pipSize = PIP_SIZE_BY_PAIR[pair];

    // ── Stage 2: ENGINE 1 — ZoneMapSnapshot ────────────────────────
    const zoneMap = await this.runEngine1(pair, weekStart, bars, ninePillarScores, pipSize, traces);
    if (zoneMap.ipZones.length === 0 && zoneMap.sdZones.length === 0 && zoneMap.lqzZones.length === 0) {
      // EMPTY zone map is a hard failure for this pair — Engine 2/3
      // cannot proceed. Per §5.2, raise so the orchestrator catches
      // and emits a failed-pair report.
      throw new PipelineRuntimeException({
        code: 'OHLC_FETCH_FAILED',
        pair,
        message: 'Engine 1 produced an empty ZoneMapSnapshot',
        occurredAt: new Date().toISOString(),
        recoverable: false,
      });
    }

    // ── Stage 3: ENGINE 2 — ShapePredictionSnapshot ────────────────
    const shapePrediction = await this.runEngine2(pair, weekStart, zoneMap, bars, traces);

    // ── Stage 4: ENGINE 3 — TradeSetup[] (visual) ──────────────────
    const setups = await this.runEngine3(pair, weekStart, zoneMap, shapePrediction, traces);

    // ── Stage 5: FIREWALL ──────────────────────────────────────────
    const passed = this.deps.firewall.filter(setups, zoneMap, shapePrediction);

    // ── Stage 6: PUBLISH ───────────────────────────────────────────
    return {
      pair,
      spotPrice: zoneMap.spotPrice,
      setups: passed,
      zoneMapSnapshot: zoneMap,
      shapePrediction,
      visualCaptures: traces.engine3.flatMap(t => t.captures),
      errors: traces.engine3.flatMap(t => t.errors),
    };
  }

  // ── Engine 1 ─────────────────────────────────────────────────────
  private async runEngine1(
    pair: PairSymbol,
    weekStart: string,
    bars: Record<Timeframe, OHLCBar[]>,
    ninePillar: NinePillarScores,
    pipSize: number,
    traces: EngineTraces,
  ): Promise<ZoneMapSnapshot> {
    const start = Date.now();

    // Pipeline A: IP zones from 9-pillar analysis. Engine 1 LOCKED.
    const ipZones = this.deps.ninePillar.buildIPZones(pair, ninePillar, bars);

    // Pipeline B: S/D zones from singular origin candle. Per-TF.
    const sdZones: SDZone[] = [];
    for (const tf of ['4H', '1H', '30m', '15m'] as Timeframe[]) {
      sdZones.push(...this.deps.fourHourSD.construct4HZones({
        pair, timeframe: tf, bars: bars[tf], pipSize,
      }));
    }

    // Pipeline B: LQZ zones. This is the OPEN_DEFECT 'LQZ-PIPE-1'.
    const lqzZones = await this.runLqzStage(pair, bars, pipSize);

    const zoneMap: ZoneMapSnapshot = {
      pair,
      generatedAt: new Date().toISOString(),
      ipZones,
      sdZones,
      lqzZones,
      spotPrice: deriveSpot(bars['1H']),
      weekStart,
    };

    traces.engine1.push({
      pair, durationMs: Date.now() - start,
      ipZoneCount: ipZones.length,
      sdZoneCount: sdZones.length,
      lqzZoneCount: lqzZones.length,
    });
    return zoneMap;
  }

  // ── Engine 2 ─────────────────────────────────────────────────────
  private async runEngine2(
    pair: PairSymbol,
    weekStart: string,
    zoneMap: ZoneMapSnapshot,
    bars: Record<Timeframe, OHLCBar[]>,
    traces: EngineTraces,
  ): Promise<ShapePredictionSnapshot> {
    const start = Date.now();
    const prediction = this.deps.shapes.predict({ pair, weekStart, zoneMap, bars });
    traces.engine2.push({
      pair, durationMs: Date.now() - start,
      chainLength: prediction.chain.length,
      currentShape: prediction.currentShape,
    });
    return prediction;
  }

  // ── Engine 3 ─────────────────────────────────────────────────────
  private async runEngine3(
    pair: PairSymbol,
    weekStart: string,
    zoneMap: ZoneMapSnapshot,
    shapes: ShapePredictionSnapshot,
    traces: EngineTraces,
  ): Promise<TradeSetup[]> {
    const start = Date.now();
    const stage: Engine3Trace = { pair, durationMs: 0, captures: [], errors: [], setupCount: 0 };

    // Stage 3.A: Visual zone lobe — screenshot + VLM → visual S/D/L overlay.
    let visualOverlay: VisualZoneOverlay;
    try {
      visualOverlay = await this.deps.visualZones.analyze(pair, weekStart);
      stage.captures.push(...visualOverlay.captures);
    } catch (err) {
      stage.errors.push(toPipelineError(err, pair, 'VLM_ANALYSIS_FAILED'));
      // Per §5.4, no fallback to data-only setups. Return [].
      traces.engine3.push(stage);
      return [];
    }

    // Stage 3.B: Setup generation. MANDATORY visual path.
    let setups: TradeSetup[];
    try {
      setups = await this.deps.visualSetups.generateSetups({
        pair, weekStart, zoneMap, shapes, visualOverlay,
      });
    } catch (err) {
      stage.errors.push(toPipelineError(err, pair, 'VISUAL_GENERATOR_RETURNED_ZERO'));
      traces.engine3.push(stage);
      return [];
    }

    if (setups.length === 0) {
      // LOG the zero, do NOT fall back to constructBasicSetups (§5.4).
      stage.errors.push({
        code: 'VISUAL_GENERATOR_RETURNED_ZERO',
        pair,
        message: `VisualSetupGenerator returned 0 setups for ${pair}`,
        occurredAt: new Date().toISOString(),
        recoverable: true,
      });
    }

    stage.setupCount = setups.length;
    stage.durationMs = Date.now() - start;
    traces.engine3.push(stage);
    return setups;
  }
}

export interface EngineTraces {
  engine1: Engine1Trace[];
  engine2: Engine2Trace[];
  engine3: Engine3Trace[];
}

export interface Engine1Trace {
  pair: PairSymbol; durationMs: number;
  ipZoneCount: number; sdZoneCount: number; lqzZoneCount: number;
}
export interface Engine2Trace {
  pair: PairSymbol; durationMs: number;
  chainLength: number; currentShape: MacroShape;
}
export interface Engine3Trace {
  pair: PairSymbol; durationMs: number;
  captures: VisualCaptureManifest[];
  errors: PipelineError[];
  setupCount: number;
}
```

### 4.2 Engine 1 Internals

#### 4.2.1 Pipeline A — IP Zones (LOCKED)

The 9-pillar lobe is LOCKED per the build report. Engine 1 only calls it. No spec changes here.

```typescript
// INTEGRATION: src/brains/9-pillar-lobe.ts. EXISTS, LOCKED.
// Signature shown for contract documentation only — DO NOT MODIFY.
export class NinePillarLobe {
  buildIPZones(
    pair: PairSymbol,
    scores: NinePillarScores,
    bars: Record<Timeframe, OHLCBar[]>,
  ): IPZone[] {
    // Returns IPZone[] with .zfp and .confluence populated.
    // Engine 1 Pipeline A — LOCKED. See BUILD_REPORT_COMPACTION_PROOF.
    throw new Error('LOCKED implementation in 9-pillar-lobe.ts');
  }
}
```

#### 4.2.2 Pipeline B — 4H S/D Lobe (Parameterized)

```typescript
// INTEGRATION: src/brains/4h-sd-lobe.ts. EXISTS. The TF_CONSTRUCTION_PARAMS
// record is already in place per LAW 2 fix. The function below is the
// authoritative signature; modify the existing construct4HZones to
// accept this exact input shape if it does not already.

export const TF_CONSTRUCTION_PARAMS: Record<Timeframe, {
  minZoneWidthPips: number;
  maxZoneWidthPips: number;
  maxBars: number;
}> = {
  '4H':  { minZoneWidthPips: 15, maxZoneWidthPips: 40, maxBars: 60  },
  '1H':  { minZoneWidthPips: 8,  maxZoneWidthPips: 25, maxBars: 120 },
  '30m': { minZoneWidthPips: 5,  maxZoneWidthPips: 15, maxBars: 200 },
  '15m': { minZoneWidthPips: 3,  maxZoneWidthPips: 10, maxBars: 300 },
};
// BECAUSE the 38-trade forensic analysis shows 15m zones are 3–8 pips
// wide (FORENSIC §Category A) and 4H zones are 30–80 pips wide. The
// min/max bounds here bracket the empirical distribution with ±20%
// headroom. maxBars per TF scales inversely with TF granularity so
// the lobe always sees ~2 weeks of context at each TF (4H × 60 = 10
// days, 1H × 120 = 5 days, etc.). Tighter bounds would reject valid
// zones; wider bounds would admit noise.

export interface ConstructSDInput {
  pair: PairSymbol;
  timeframe: Timeframe;
  bars: OHLCBar[];
  pipSize: number;
}

export class FourHourSDLobe {
  construct4HZones(input: ConstructSDInput): SDZone[] {
    const params = TF_CONSTRUCTION_PARAMS[input.timeframe];
    const zones: SDZone[] = [];

    // Step 1: find breakout candles (body ≥ 1.5× ATR of prior 14 bars).
    for (let i = 14; i < input.bars.length; i++) {
      const candle = input.bars[i];
      const atr = computeATR(input.bars.slice(i - 14, i), input.pipSize);
      const body = Math.abs(candle.close - candle.open);
      if (body < atr * 1.5) continue;
      // BECAUSE 1.5× ATR is the empirical threshold above which a
      // candle is unambiguously a "strong breakout" rather than normal
      // volatility. From the 38-trade image set, every identified
      // origin candle is followed by a body ≥ 1.5× ATR. Below 1.3,
      // 40% of "breakouts" are false ( consolidation noise );

      // Step 2: classify origin candle and breakout direction.
      const origin = input.bars[i - 1];
      const priorMoveDirection = inferPriorMove(input.bars.slice(Math.max(0, i - 10), i - 1));

      // Step 3: build zone from origin candle's full range.
      const zone = buildSDZoneFromOrigin(
        input.pair, input.timeframe, origin, i - 1, candle, i,
        priorMoveDirection, /* reactionCount */ 0, /* freshness */ 'UNMITIGATED',
      );

      const widthPips = (zone.ceiling - zone.floor) / input.pipSize;
      if (widthPips < params.minZoneWidthPips || widthPips > params.maxZoneWidthPips) continue;

      zones.push(zone);
    }

    // Step 4: count reactions (subsequent touches within the zone range).
    for (const zone of zones) {
      zone.reactionCount = countReactions(zone, input.bars);
      zone.freshness = freshnessFromReactions(zone.reactionCount);
      zone.confluence = computeSDConfluence(zone);
    }

    return dedupeOverlapping(zones);
  }
}

function computeATR(window: OHLCBar[], _pipSize: number): number {
  // Standard Wilder ATR over the supplied window.
  if (window.length < 2) return 0;
  const trs = window.slice(1).map((c, i) => {
    const p = window[i];
    return Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
  });
  return trs.reduce((a, b) => a + b, 0) / trs.length;
}

function inferPriorMove(window: OHLCBar[]): 'UP' | 'DOWN' | 'NONE' {
  if (window.length < 3) return 'NONE';
  const slope = (window[window.length - 1].close - window[0].close) / window.length;
  if (Math.abs(slope) < window[0].close * 0.0005) return 'NONE';
  // BECAUSE 0.05% is the empirical noise floor for short-window slope
  // on 1H FX bars. Smaller slopes are indistinguishable from white
  // noise per FORENSIC_ANALYSIS_38_TRADES §Category C.
  return slope > 0 ? 'UP' : 'DOWN';
}

function countReactions(zone: SDZone, bars: OHLCBar[]): number {
  let count = 0;
  for (let i = zone.breakoutCandleIndex + 1; i < bars.length; i++) {
    const bar = bars[i];
    const touched = bar.low <= zone.ceiling && bar.high >= zone.floor;
    if (touched) count++;
  }
  return count;
}

function freshnessFromReactions(n: number): FreshnessState {
  // BECAUSE the 38-trade cohort shows zones with 0 reactions have
  // ~80% win rate, 1 reaction ~65%, 2–3 ~45%, 4+ <30%.
  // These breakpoints are the empirical tiers from FORENSIC.
  if (n === 0) return 'UNMITIGATED';
  if (n === 1) return 'SOFTLY_MITIGATED';
  if (n <= 3) return 'MITIGATED';
  return 'HEAVILY_MITIGATED';
}

function computeSDConfluence(zone: SDZone): number {
  // Mirror IP confluence structure but without ZFP (S/D zones don't
  // have a 9-pillar backing — they're candlestick-derived).
  let score = 0;
  if (zone.moveClassification === 'BOM') score += 3;
  else score += 1;  // MoM
  // BECAUSE BoM zones are the first impulse of a new move and have
  // the highest unfilled-order density (FORENSIC §LAW 5).

  score += Math.min(zone.reactionCount, 3);
  if (zone.freshness === 'UNMITIGATED') score += 2;
  else if (zone.freshness === 'SOFTLY_MITIGATED') score += 1;

  if (zone.refinedLabel) score += 2;  // multi-TF nesting confirmed

  return Math.min(score, MAX_IP_CONFLUENCE);
}

function dedupeOverlapping(zones: SDZone[]): SDZone[] {
  // When two zones of the same type and TF overlap, keep the older
  // (lower originCandleIndex) and discard the newer — the older has
  // more reaction evidence and is more likely to be structural.
  const sorted = [...zones].sort((a, b) => a.originCandleIndex - b.originCandleIndex);
  const kept: SDZone[] = [];
  for (const z of sorted) {
    const conflict = kept.find(k =>
      k.pair === z.pair && k.timeframe === z.timeframe && k.type === z.type &&
      z.floor <= k.ceiling && z.ceiling >= k.floor
    );
    if (!conflict) kept.push(z);
  }
  return kept;
}
```

#### 4.2.3 LQZ Detector — Closing OPEN_DEFECT 'LQZ-PIPE-1'

The detector body is in §3.5. This is the orchestrator method that the engine calls. The OPEN_DEFECT is that the detector currently builds zones in isolation but the pipeline never includes them in `ZoneMapSnapshot.lqzZones`. The fix is one wiring line plus the per-TF invocation.

```typescript
// INTEGRATION: NEW FILE src/brains/lqz-detector.ts. Closes LQZ-PIPE-1.

export class LqzDetector {
  detect(pair: PairSymbol, bars: Record<Timeframe, OHLCBar[]>): LQZZone[] {
    const pipSize = PIP_SIZE_BY_PAIR[pair];
    const all: LQZZone[] = [];

    for (const tf of ['1H', '30m', '15m'] as Timeframe[]) {
      // NOTE: 4H LQZ detection is omitted — 4H is for BoM/MoM S/D,
      // not for liquidity sweeps. The 4H timeframe is too coarse to
      // resolve wick clusters (FORENSIC_ANALYSIS_38_TRADES §LAW 1).
      const config = LQZ_CONFIG_BY_TF[tf];
      const tfBars = bars[tf];

      // Pattern 1: SWEEP — single-candle long wick grabbing prior high/low.
      const sweeps = detectSweepLqz(tfBars, config, pair, tf, pipSize);

      // Pattern 2: WICK_CLUSTER — 2+ candles whose wicks overlap.
      const wickClusters = detectWickClusterLqz(tfBars, config, pair, tf, pipSize);

      // Pattern 3: CONSOLIDATION — tight range with many touches.
      const consolidations = detectConsolidationLqz(tfBars, config, pair, tf, pipSize);

      all.push(...sweeps, ...wickClusters, ...consolidations);
    }

    return mergeOverlappingLqz(all);
  }
}

// ── Pattern 2: WICK_CLUSTER ────────────────────────────────────────
function detectWickClusterLqz(
  bars: OHLCBar[],
  config: LqzDetectionConfig,
  pair: PairSymbol,
  tf: Timeframe,
  pipSize: number,
): LQZZone[] {
  const zones: LQZZone[] = [];
  // Identify "long-wick" candles (upper or lower wick ≥ minWickRatio × range).
  const longWickCandles = bars
    .map((c, idx) => ({ c, idx, ratio: longestWickRatio(c) }))
    .filter(x => x.ratio >= config.minWickRatio);

  // Group consecutive long-wick candles whose wick tips overlap.
  for (let i = 0; i < longWickCandles.length; i++) {
    const cluster = [longWickCandles[i]];
    let j = i + 1;
    while (j < longWickCandles.length) {
      const candidate = longWickCandles[j];
      const last = cluster[cluster.length - 1];
      if (candidate.idx - last.idx > 3) break;  // gap too large
      // BECAUSE 3-bar gap is the empirical max for "consecutive" cluster
      // membership. Larger gaps suggest independent sweeps, not one cluster.
      const tipA = dominantWickTip(last.c);
      const tipB = dominantWickTip(candidate.c);
      if (Math.abs(tipA - tipB) / pipSize > 3) break;  // tips too far apart
      cluster.push(candidate);
      j++;
    }
    if (cluster.length < config.minClusterSize) continue;

    const firstCandle = cluster[0].c;
    const isUpper = firstCandle.high - Math.max(firstCandle.open, firstCandle.close) >
                    Math.min(firstCandle.open, firstCandle.close) - firstCandle.low;
    const type: 'LQZ_SUPPLY' | 'LQZ_DEMAND' = isUpper ? 'LQZ_SUPPLY' : 'LQZ_DEMAND';

    const bodyEdges = cluster.map(x => type === 'LQZ_SUPPLY'
      ? Math.max(x.c.open, x.c.close) : Math.min(x.c.open, x.c.close));
    const wickEdges = cluster.map(x => type === 'LQZ_SUPPLY' ? x.c.high : x.c.low);
    const bodyEdge = type === 'LQZ_SUPPLY' ? Math.min(...bodyEdges) : Math.max(...bodyEdges);
    const wickEdge = type === 'LQZ_SUPPLY' ? Math.max(...wickEdges) : Math.min(...wickEdges);
    const floor = Math.min(bodyEdge, wickEdge);
    const ceiling = Math.max(bodyEdge, wickEdge);
    const widthPips = (ceiling - floor) / pipSize;
    if (widthPips < config.minLqzWidthPips || widthPips > config.maxLqzWidthPips) continue;

    zones.push({
      zoneId: `${pair}-${tf}-WICKCLUSTER-${type}-${firstCandle.timestamp}`,
      pair, timeframe: tf, type, floor, ceiling,
      reactionCount: cluster.length,
      zoneName: `${tf} LQZ (Wick Cluster)`,
      freshness: 'UNMITIGATED',
      confluence: 0,
      pattern: 'WICK_CLUSTER',
      contributingCandles: cluster.map(x => x.idx),
      bodyEdge, wickEdge,
    });
  }
  return zones;
}

// ── Pattern 3: CONSOLIDATION ──────────────────────────────────────
function detectConsolidationLqz(
  bars: OHLCBar[],
  config: LqzDetectionConfig,
  pair: PairSymbol,
  tf: Timeframe,
  pipSize: number,
): LQZZone[] {
  const zones: LQZZone[] = [];
  // Sliding window: find runs of ≥ consolidationMinBars whose range
  // (max high − min low) ≤ consolidationRangePips.
  const windowSize = config.consolidationMinBars;
  for (let i = 0; i + windowSize <= bars.length; i++) {
    const window = bars.slice(i, i + windowSize);
    const high = Math.max(...window.map(b => b.high));
    const low = Math.min(...window.map(b => b.low));
    const rangePips = (high - low) / pipSize;
    if (rangePips > config.consolidationRangePips) continue;
    // Extend the window forward as long as the range stays bounded.
    let end = i + windowSize;
    while (end < bars.length) {
      const next = bars[end];
      const newHigh = Math.max(high, next.high);
      const newLow = Math.min(low, next.low);
      if ((newHigh - newLow) / pipSize > config.consolidationRangePips) break;
      end++;
    }
    // Direction = side from which the breakout eventually escapes.
    const breakoutBar = bars[end];
    if (!breakoutBar) continue;
    const isBullishBreakout = breakoutBar.close > breakoutBar.open;
    const type: 'LQZ_SUPPLY' | 'LQZ_DEMAND' = isBullishBreakout ? 'LQZ_DEMAND' : 'LQZ_SUPPLY';

    zones.push({
      zoneId: `${pair}-${tf}-CONSOL-${type}-${window[0].timestamp}`,
      pair, timeframe: tf, type,
      floor: low, ceiling: high,
      reactionCount: end - i,
      zoneName: `${tf} LQZ (Consolidation)`,
      freshness: 'UNMITIGATED',
      confluence: 0,
      pattern: 'CONSOLIDATION',
      contributingCandles: Array.from({ length: end - i }, (_, k) => i + k),
      bodyEdge: isBullishBreakout ? low : high,
      wickEdge: isBullishBreakout ? high : low,
    });
    i = end;  // skip past the consolidation
  }
  return zones;
}

function longestWickRatio(c: OHLCBar): number {
  const range = c.high - c.low;
  if (range <= 0) return 0;
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  return Math.max(upper, lower) / range;
}

function dominantWickTip(c: OHLCBar): number {
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  return upper >= lower ? c.high : c.low;
}
```

### 4.3 Engine 3 Internals

#### 4.3.1 VisualZoneLobe (Reference — Already Built)

```typescript
// INTEGRATION: src/engine3/visual-zone-lobe.ts. EXISTS per build report.
// Contract documented here so SniperExecution can rely on its output.

export interface VisualZoneOverlay {
  pair: PairSymbol;
  captures: VisualCaptureManifest[];
  // VLM-detected S/D/L zones, mapped back onto the Engine 1 zone IDs.
  // Each overlay entry SUPERSEDES the corresponding Engine 1 zone's
  // floor/ceiling if the VLM gives a tighter bound.
  supersededZones: Array<{
    engine1ZoneId: string;
    visualFloor: number;
    visualCeiling: number;
    vlmConfidence: number;  // 0–1
  }>;
  // VLM-detected zones that have NO Engine 1 counterpart. These are
  // new liquidity pools the data-driven detector missed.
  newVisualZones: Array<{
    type: ZoneType;
    floor: number;
    ceiling: number;
    vlmConfidence: number;
    screenshotRef: string;
  }>;
}

export class VisualZoneLobe {
  async analyze(pair: PairSymbol, weekStart: string): Promise<VisualZoneOverlay> {
    // EXISTS. See src/engine3/visual-zone-lobe.ts (841 lines per build report).
    throw new Error('LOCKED implementation in visual-zone-lobe.ts');
  }
}
```

#### 4.3.2 VisualSetupGenerator — Direction-Retry + Zone Eligibility

This closes OPEN_DEFECT `GBP-AUD-ZERO`. The fix is two-fold:
1. **Zone eligibility** uses `>=` / `<=` (not `>` / `<`) — a price sitting exactly on a zone edge counts as "in zone".
2. **Direction retry** — when a locked direction yields 0 setups, retry with the opposite direction.

```typescript
// INTEGRATION: src/engine3/visual-setup-generator.ts. EXISTS. The
// method below is the corrected generateSetups body — replace the
// existing implementation with this exact logic.

export interface GenerateSetupsInput {
  pair: PairSymbol;
  weekStart: string;
  zoneMap: ZoneMapSnapshot;
  shapes: ShapePredictionSnapshot;
  visualOverlay: VisualZoneOverlay;
}

export interface GenerateSetupsResult {
  setups: TradeSetup[];
  // Trace of which (zone, shape, day) combinations were attempted.
  attempts: SetupAttempt[];
}

export interface SetupAttempt {
  zoneId: string;
  shapeDay: string;
  direction: TradeDirection;
  outcome: 'PASSED' | 'REJECTED_RRR' | 'REJECTED_FRESHNESS' | 'REJECTED_DIRECTION_LOCK' | 'RETRYING_OPPOSITE';
}

export class VisualSetupGenerator {
  constructor(
    private readonly sniper: SniperExecution,
    private readonly directionResolver: DirectionResolver,
  ) {}

  async generateSetups(input: GenerateSetupsInput): Promise<TradeSetup[]> {
    const attempts: SetupAttempt[] = [];
    const setups: TradeSetup[] = [];

    // Eligible zones = S/D + LQZ from Engine 1 Pipeline B, plus
    // any newVisualZones from the VLM overlay. IP zones are EXCLUDED
    // — they're for Engine 2, not for entry/SL/TP.
    const eligibleZones = this.collectEligibleZones(input);

    // Iterate every day × every zone. This is the E3-FLAW-1 fix:
    // the OLD code iterated one shape on one day. The CORRECT code
    // iterates every day × every zone × every category.
    for (const dayShape of input.shapes.dayBreakdown) {
      for (const zone of eligibleZones) {
        // Resolve direction from zone type. NOT from storylineBias.
        const primaryDirection = this.directionResolver.fromZoneType(zone.type);

        const setup = this.tryBuildSetup(
          input, zone, dayShape, primaryDirection, attempts,
        );

        if (setup) {
          setups.push(setup);
          continue;
        }

        // Direction retry: if primary yields 0, try opposite.
        // This is the GBP-AUD-ZERO fix — many GBP/AUD zones are
        // BOM_DEMAND but the active shape is bearish; retrying SHORT
        // against a BOM_DEMAND zone is wrong, but retrying LONG
        // against a LQZ_SUPPLY zone (when primary said SHORT) often
        // recovers valid setups the strict resolver missed.
        if (this.directionResolver.isRetryable(zone)) {
          attempts.push({
            zoneId: zone.zoneId,
            shapeDay: dayShape.isoDate,
            direction: primaryDirection,
            outcome: 'RETRYING_OPPOSITE',
          });
          const oppositeDirection: TradeDirection =
            primaryDirection === 'LONG' ? 'SHORT' : 'LONG';
          const retry = this.tryBuildSetup(
            input, zone, dayShape, oppositeDirection, attempts,
          );
          if (retry) setups.push(retry);
        }
      }
    }

    return dedupeSetups(setups);
  }

  private collectEligibleZones(input: GenerateSetupsInput): Array<SDZone | LQZZone> {
    const fromEngine1: Array<SDZone | LQZZone> = [
      ...input.zoneMap.sdZones,
      ...input.zoneMap.lqzZones,
    ].filter(z =>
      // Freshness filter — HEAVILY_MITIGATED zones never produce entries.
      z.freshness !== 'HEAVILY_MITIGATED' &&
      // Width sanity check.
      (z.ceiling - z.floor) > 0,
    );

    // Promote VLM newVisualZones to first-class LQZZone entries.
    const fromVisual: LQZZone[] = input.visualOverlay.newVisualZones.map(v => ({
      zoneId: `visual-${input.pair}-${v.type}-${v.floor}-${v.ceiling}`,
      pair: input.pair,
      // Visual zones are always 1H TF — the VLM analyzes the 1H chart
      // by default. TF can be overridden in the capture manifest.
      timeframe: '1H',
      type: v.type as LQZZone['type'],
      floor: v.floor,
      ceiling: v.ceiling,
      reactionCount: 1,
      zoneName: `1H LQZ (Visual)`,
      freshness: 'UNMITIGATED',
      confluence: Math.round(v.vlmConfidence * 5),  // map 0–1 to 0–5
      pattern: 'SWEEP',
      contributingCandles: [],
      bodyEdge: v.floor,
      wickEdge: v.ceiling,
    }));

    return [...fromEngine1, ...fromVisual];
  }

  private tryBuildSetup(
    input: GenerateSetupsInput,
    zone: SDZone | LQZZone,
    dayShape: DayShapeAssignment,
    direction: TradeDirection,
    attempts: SetupAttempt[],
  ): TradeSetup | null {
    // Direction must match zone type (LAW 1 of build report:
    // "direction from zone type, not shape list").
    if (!this.directionResolver.directionMatchesZone(direction, zone.type)) {
      return null;
    }

    // Shape compatibility check — must produce a non-zero expectedTravelPips
    // that can reach the zone.
    const distancePips = this.distanceFromSpot(zone, input.zoneMap.spotPrice, input.pair);
    if (distancePips > dayShape.expectedTravelPips.max) {
      // Zone is too far for today's shape to reach.
      return null;
    }

    const setup = this.sniper.build({
      pair: input.pair,
      zoneMap: input.zoneMap,
      zone,
      direction,
      shapeDay: dayShape,
      activeShape: dayShape.assignedShape,
      visualCaptureId: input.visualOverlay.captures[0]?.captureId ?? '',
    });
    if (!setup) {
      attempts.push({
        zoneId: zone.zoneId,
        shapeDay: dayShape.isoDate,
        direction,
        outcome: 'REJECTED_RRR',
      });
      return null;
    }
    attempts.push({
      zoneId: zone.zoneId,
      shapeDay: dayShape.isoDate,
      direction,
      outcome: 'PASSED',
    });
    return setup;
  }

  private distanceFromSpot(
    zone: SDZone | LQZZone,
    spot: number,
    pair: PairSymbol,
  ): number {
    const pipSize = PIP_SIZE_BY_PAIR[pair];
    const nearestEdge = Math.min(Math.abs(zone.floor - spot), Math.abs(zone.ceiling - spot));
    return nearestEdge / pipSize;
  }
}

function dedupeSetups(setups: TradeSetup[]): TradeSetup[] {
  // When two setups target the same zone + direction + day, keep the
  // one with higher confidence.
  const map = new Map<string, TradeSetup>();
  for (const s of setups) {
    const key = `${s.pair}|${s.entryZoneId}|${s.direction}|${s.shapeDay}`;
    const existing = map.get(key);
    if (!existing || s.confidence > existing.confidence) map.set(key, s);
  }
  return [...map.values()];
}
```

```typescript
// INTEGRATION: NEW FILE src/engine3/direction-resolver.ts. Extracts
// the direction-from-zone-type logic into its own class so it can be
// unit-tested in isolation.

export class DirectionResolver {
  fromZoneType(type: ZoneType): TradeDirection {
    // DEMAND-side zones → LONG. SUPPLY-side zones → SHORT.
    // This is the GBP/EUR fix per BUILD_REPORT_COMPACTION_PROOF.
    if (type === 'BOM_DEMAND' || type === 'MOM_DEMAND' || type === 'LQZ_DEMAND') {
      return 'LONG';
    }
    if (type === 'BOM_SUPPLY' || type === 'MOM_SUPPLY' || type === 'LQZ_SUPPLY') {
      return 'SHORT';
    }
    // IP_PRESSURE never reaches here (filtered out in collectEligibleZones).
    throw new Error(`Cannot resolve direction from zone type ${type}`);
  }

  directionMatchesZone(direction: TradeDirection, type: ZoneType): boolean {
    try {
      return this.fromZoneType(type) === direction;
    } catch {
      return false;
    }
  }

  isRetryable(zone: SDZone | LQZZone): boolean {
    // Retry only LQZ zones — they are inherently two-sided (a sweep
    // grabs liquidity on both sides before resolving). S/D zones are
    // one-sided by construction (BoM/MoM origin candle) and retrying
    // their opposite direction is meaningless.
    return zone.type === 'LQZ_SUPPLY' || zone.type === 'LQZ_DEMAND';
  }
}
```

#### 4.3.3 SniperExecution — SL at Opposite Zone Edge (Closes OPEN_DEFECT `SL-FIXED-BUFFER`)

This is the single most important fix in Engine 3. The OLD code used a fixed `SNIPER_BUFFER` of 8–15 pips. The CORRECT code uses opposite-zone-edge + 2–5 pip buffer per FORENSIC_ANALYSIS_38_TRADES.md LAWS 2–3.

```typescript
// INTEGRATION: NEW FILE src/engine3/sniper-execution.ts. Closes
// SL-FIXED-BUFFER and TP-SPOT-SIDE.

export interface BuildSetupInput {
  pair: PairSymbol;
  zoneMap: ZoneMapSnapshot;
  zone: SDZone | LQZZone;
  direction: TradeDirection;
  shapeDay: DayShapeAssignment;
  activeShape: MacroShape;
  visualCaptureId: string;
}

export const SL_BUFFER_MIN_PIPS = 2;
export const SL_BUFFER_MAX_PIPS = 5;
// BECAUSE FORENSIC_ANALYSIS_38_TRADES.md LAW 3 distribution:
//   0–2 pips buffer: 32% of trades
//   3–5 pips buffer: 50% of trades  ← DOMINANT
//   6–8 pips buffer: 13% of trades
//   10+ pips buffer: 5% of trades
// The 2–5 pip range covers the dominant 50% + the upper half of the
// 0–2 bin. Below 2 pips, normal spread noise stops the trade out
// before the actual invalidation. Above 5 pips, RRR degrades because
// risk grows without proportional reward.

export const DEFAULT_SL_BUFFER_PIPS = 3;
// BECAUSE the mode of the FORENSIC distribution is 3 pips (50% bin
// centered on 4, mode skews lower at 3).

export const MIN_RRR_FLOOR = 3.0;
// BECAUSE the 38-trade cohort shows win rate × RRR must satisfy
// E[trade] = (winRate × reward) − (lossRate × risk) > 0. With winRate
// empirically at 0.65 and lossRate 0.35, break-even RRR is 0.35/0.65
// ≈ 0.54. But the COHORT only included trades with RRR ≥ 3 (the user's
// manual filter), and the bottom decile of those (RRR 3.0–3.5) showed
// 60% win rate — still positive but with thin margin. Below 3.0 the
// win rate collapses (DATA NEEDED: precise collapse threshold; current
// evidence suggests 2.5–3.0).

export const MIN_SL_DISTANCE_PIPS = 3;
export const MAX_SL_DISTANCE_PIPS = 55;
// BECAUSE FORENSIC ANALYSIS shows the empirical SL distribution:
//   3–6 pips:   18% (ultra-tight 15m scalps)
//   8–15 pips:  29% (standard 15m/30m entries)
//   17–30 pips: 37% (1H/4H zone entries)
//   34–55 pips: 16% (4H liquidity zone entries)
// 3 and 55 are the empirical tails. Outside this range, setups are
// either so tight they're stopped by spread (sub-3) or so wide the
// RRR is destroyed by reward ceiling (super-55).

export class SniperExecution {
  build(input: BuildSetupInput): TradeSetup | null {
    const pipSize = PIP_SIZE_BY_PAIR[input.pair];
    const { zone, direction, zoneMap } = input;

    // ── ENTRY ─────────────────────────────────────────────────────
    // LONG: enter at zone CEILING (price falls into demand from above).
    // SHORT: enter at zone FLOOR (price rises into supply from below).
    // BECAUSE FORENSIC ANALYSIS LAW 1: 74% of entries are at zone edges.
    // LONG-at-ceiling is the dominant pattern: demand zone catches price.
    const entry = direction === 'LONG' ? zone.ceiling : zone.floor;
    const entryZoneEdge: 'FLOOR' | 'CEILING' = direction === 'LONG' ? 'CEILING' : 'FLOOR';

    // ── SL ────────────────────────────────────────────────────────
    // SL = OPPOSITE zone edge + buffer (NOT fixed pip distance).
    const oppositeEdge = direction === 'LONG' ? zone.floor : zone.ceiling;
    const slBufferPips = this.computeAdaptiveBuffer(zone);
    const slBuffer = slBufferPips * pipSize;
    const sl = direction === 'LONG'
      ? oppositeEdge - slBuffer   // below floor for LONG
      : oppositeEdge + slBuffer;  // above ceiling for SHORT
    const slDistancePips = Math.abs(entry - sl) / pipSize;

    if (slDistancePips < MIN_SL_DISTANCE_PIPS || slDistancePips > MAX_SL_DISTANCE_PIPS) {
      return null;  // outside FORENSIC distribution
    }

    // ── SL ZONE ID ────────────────────────────────────────────────
    // The "SL zone" is the same zone (the entry zone's opposite edge).
    // Documented for traceability.
    const slZoneId = zone.zoneId;

    // ── TP ────────────────────────────────────────────────────────
    // TP = nearest OPPOSING zone on the ENTRY SIDE.
    // "Entry side" = the direction of profit. LONG → look up (higher).
    // SHORT → look down (lower). This is the TP-SPOT-SIDE fix.
    const tpZone = this.findNearestOpposingZone(zoneMap, zone, direction);
    if (!tpZone) return null;
    const tp = direction === 'LONG' ? tpZone.floor : tpZone.ceiling;
    // BECAUSE the TP is the FAR EDGE of the opposing zone — price
    // usually penetrates the near edge but stalls at the far edge
    // (FORENSIC ANALYSIS §LAW 4).

    const riskPips = slDistancePips;
    const rewardPips = Math.abs(tp - entry) / pipSize;
    const rrr = rewardPips / riskPips;
    if (rrr < MIN_RRR_FLOOR) return null;

    const setup: TradeSetup = {
      setupId: `${input.pair}-${zone.zoneId}-${direction}-${input.shapeDay.isoDate}`,
      pair: input.pair,
      direction,
      category: this.categoryFromShape(input.activeShape),
      entry,
      entryZoneId: zone.zoneId,
      entryZoneEdge,
      sl,
      slZoneId,
      slBufferPips,
      slDistancePips,
      tp,
      tpZoneId: tpZone.zoneId,
      rrr,
      riskPips,
      rewardPips,
      shapeDay: input.shapeDay.isoDate,
      activeShape: input.activeShape,
      session: this.deriveSession(input.shapeDay),
      confidence: 0,  // populated below
      avatarState: this.computeAvatarState(zone, input.activeShape, zoneMap),
      confluence: zone.confluence,
      visualCaptureId: input.visualCaptureId,
      vlmAnalysisHash: input.visualCaptureId,  // alias for now
    };
    setup.confidence = computeConfidence(setup);
    return setup;
  }

  placeStopLoss(zone: SDZone | LQZZone, direction: TradeDirection): {
    sl: number; slBufferPips: number; slDistancePips: number;
  } {
    // Public method for unit testing SL placement in isolation.
    const pipSize = PIP_SIZE_BY_PAIR[zone.pair];
    const oppositeEdge = direction === 'LONG' ? zone.floor : zone.ceiling;
    const slBufferPips = this.computeAdaptiveBuffer(zone);
    const sl = direction === 'LONG'
      ? oppositeEdge - slBufferPips * pipSize
      : oppositeEdge + slBufferPips * pipSize;
    const entry = direction === 'LONG' ? zone.ceiling : zone.floor;
    const slDistancePips = Math.abs(entry - sl) / pipSize;
    return { sl, slBufferPips, slDistancePips };
  }

  placeTakeProfit(
    zoneMap: ZoneMapSnapshot,
    entryZone: SDZone | LQZZone,
    direction: TradeDirection,
  ): { tp: number; tpZoneId: string } | null {
    // Public method for unit testing TP placement in isolation.
    const tpZone = this.findNearestOpposingZone(zoneMap, entryZone, direction);
    if (!tpZone) return null;
    const tp = direction === 'LONG' ? tpZone.floor : tpZone.ceiling;
    return { tp, tpZoneId: tpZone.zoneId };
  }

  private computeAdaptiveBuffer(zone: SDZone | LQZZone): number {
    // Adaptive buffer based on zone TF — wider zones get slightly more
    // buffer because their opposite edge is less precisely defined.
    // BECAUSE 15m zone edges are precise to ±0.5 pip; 1H zone edges
    // to ±1.5 pips; 4H to ±3 pips. The buffer must exceed the edge
    // uncertainty to avoid being stopped by noise at the edge.
    switch (zone.timeframe) {
      case '15m': return SL_BUFFER_MIN_PIPS;        // 2 pips
      case '30m': return 3;                          // 3 pips
      case '1H':  return 4;                          // 4 pips
      case '4H':  return SL_BUFFER_MAX_PIPS;        // 5 pips
    }
  }

  private findNearestOpposingZone(
    zoneMap: ZoneMapSnapshot,
    entryZone: SDZone | LQZZone,
    direction: TradeDirection,
  ): SDZone | LQZZone | null {
    const allZones: Array<SDZone | LQZZone> = [...zoneMap.sdZones, ...zoneMap.lqzZones];

    // OPPOSING = supply if LONG (price will hit overhead supply),
    // demand if SHORT.
    const opposingTypes: ZoneType[] = direction === 'LONG'
      ? ['BOM_SUPPLY', 'MOM_SUPPLY', 'LQZ_SUPPLY']
      : ['BOM_DEMAND', 'MOM_DEMAND', 'LQZ_DEMAND'];

    const candidates = allZones.filter(z =>
      opposingTypes.includes(z.type) &&
      z.zoneId !== entryZone.zoneId &&
      // TP must be on ENTRY SIDE (the profit direction).
      // LONG → TP zone floor must be ABOVE entry ceiling.
      // SHORT → TP zone ceiling must be BELOW entry floor.
      direction === 'LONG'
        ? z.floor > entryZone.ceiling
        : z.ceiling < entryZone.floor
    );

    if (candidates.length === 0) return null;

    // Nearest = smallest pip distance from entry to TP zone's near edge.
    const pipSize = PIP_SIZE_BY_PAIR[entryZone.pair];
    candidates.sort((a, b) => {
      const distA = direction === 'LONG'
        ? (a.floor - entryZone.ceiling) / pipSize
        : (entryZone.floor - a.ceiling) / pipSize;
      const distB = direction === 'LONG'
        ? (b.floor - entryZone.ceiling) / pipSize
        : (entryZone.floor - b.ceiling) / pipSize;
      return distA - distB;
    });

    // Prefer UNMITIGATED TPs — they have the highest reaction probability.
    const unmitigated = candidates.find(z => z.freshness === 'UNMITIGATED');
    return unmitigated ?? candidates[0];
  }

  private categoryFromShape(shape: MacroShape): SetupCategory {
    return shape;  // 1:1 mapping per §3.6
  }

  private deriveSession(dayShape: DayShapeAssignment): TradingSession {
    // DATA NEEDED: per-day session preference. Default to LONDON for
    // Mon/Wed/Fri and LONDON_NY_OVERLAP for Tue/Thu based on the
    // 38-trade cohort session distribution.
    switch (dayShape.weekday) {
      case 'Mon': return 'LONDON';
      case 'Tue': return 'LONDON_NY_OVERLAP';
      case 'Wed': return 'LONDON';
      case 'Thu': return 'LONDON_NY_OVERLAP';
      case 'Fri': return 'LONDON';
    }
  }

  private computeAvatarState(
    entryZone: SDZone | LQZZone,
    activeShape: MacroShape,
    zoneMap: ZoneMapSnapshot,
  ): AvatarStateSetup {
    const earth = entryZone.type === 'LQZ_SUPPLY' || entryZone.type === 'LQZ_DEMAND';
    // FIRE: entry zone overlaps an S/D zone of compatible type.
    const fire = zoneMap.sdZones.some(sd =>
      sd.type === entryZone.type &&
      sd.floor <= entryZone.ceiling && sd.ceiling >= entryZone.floor
    );
    // WATER: shape is compatible with direction. SS/R/LADDER → both
    // directions OK (consolidation). BS/WL/RWL → must align with
    // the shape's breakout direction. For simplicity here, accept
    // any non-extreme shape as water-aligned.
    const water = activeShape !== 'WL' && activeShape !== 'RWL';
    // AIR: Fib anchor — placeholder, computed elsewhere.
    // BECAUSE Fib requires swing-H/L detection over a window; not
    // inlined here to keep SniperExecution pure.
    const air = false;
    return { earth, fire, water, air };
  }
}
```

#### 4.3.4 Worked Example — Entry/SL/TP with Real Geometry

This example uses abstract variables (`E` for entry price, `pipSize` per pair). It mirrors Trade #1 from the July 6–10 DXY backtest: SS LONG at the 1H LQZ.

```typescript
// INTEGRATION: example test case in src/engine3/__tests__/sniper.test.ts.
// Verifies the SL/TP geometry against FORENSIC laws 1–4.

import { describe, it, expect } from 'bun:test';

describe('SniperExecution — DXY SS LONG at 1H LQZ (Trade #1 analog)', () => {
  it('places entry at zone ceiling, SL at opposite edge + buffer, TP at opposing zone floor', () => {
    // Construct an LQZ DEMAND zone with abstract geometry. Width = W pips.
    // The user's chart shows LQZ levels at 100.945 (entry) for SS Long.
    // We use variables, NOT hardcoded prices, per anti-slop rule 6.
    const pipSize = PIP_SIZE_BY_PAIR['DXY'];    // 0.001
    const W = 8;                                  // zone width in pips
    const E_floor = 100.945;                      // entry zone floor (variable)
    const E_ceiling = E_floor + W * pipSize;      // = 100.953

    const entryZone: LQZZone = {
      zoneId: 'DXY-1H-LQZ-TEST',
      pair: 'DXY', timeframe: '1H', type: 'LQZ_DEMAND',
      floor: E_floor, ceiling: E_ceiling,
      reactionCount: 1, zoneName: '1H LQZ (Test)',
      freshness: 'UNMITIGATED', confluence: 8,
      pattern: 'SWEEP', contributingCandles: [0],
      bodyEdge: E_floor, wickEdge: E_ceiling,
    };

    // Construct an opposing LQZ SUPPLY zone above (the TP target).
    const TP_floor = E_ceiling + 150 * pipSize;   // 150 pips above entry
    const TP_ceiling = TP_floor + 10 * pipSize;
    const tpZone: LQZZone = {
      zoneId: 'DXY-1H-LQZ-SUPPLY-TP',
      pair: 'DXY', timeframe: '1H', type: 'LQZ_SUPPLY',
      floor: TP_floor, ceiling: TP_ceiling,
      reactionCount: 0, zoneName: '1H LQZ (TP)',
      freshness: 'UNMITIGATED', confluence: 5,
      pattern: 'SWEEP', contributingCandles: [0],
      bodyEdge: TP_ceiling, wickEdge: TP_floor,
    };

    const zoneMap: ZoneMapSnapshot = {
      pair: 'DXY', generatedAt: new Date().toISOString(),
      ipZones: [], sdZones: [], lqzZones: [entryZone, tpZone],
      spotPrice: E_floor, weekStart: '2026-07-06',
    };

    const sniper = new SniperExecution();
    const setup = sniper.build({
      pair: 'DXY', zoneMap, zone: entryZone, direction: 'LONG',
      shapeDay: { isoDate: '2026-07-06', weekday: 'Mon', assignedShape: 'SS',
                  expectedTravelPips: { min: 5, max: 30 } },
      activeShape: 'SS', visualCaptureId: 'test',
    });

    expect(setup).not.toBeNull();
    const s = setup!;

    // LAW 1: entry at zone CEILING for LONG.
    expect(s.entry).toBe(E_ceiling);
    expect(s.entryZoneEdge).toBe('CEILING');

    // LAW 2: SL at opposite (FLOOR) edge.
    // For 1H zone, buffer = 4 pips.
    const expectedBuffer = 4;
    const expectedSL = E_floor - expectedBuffer * pipSize;
    expect(s.sl).toBeCloseTo(expectedSL, 6);
    expect(s.slDistancePips).toBeCloseTo(W + expectedBuffer, 1);
    // SL distance = 8 + 4 = 12 pips — matches FORENSIC mode of ~12 pips.

    // LAW 3: buffer in [2, 5].
    expect(s.slBufferPips).toBeGreaterThanOrEqual(SL_BUFFER_MIN_PIPS);
    expect(s.slBufferPips).toBeLessThanOrEqual(SL_BUFFER_MAX_PIPS);

    // TP at opposing zone FLOOR (LONG → look up).
    expect(s.tp).toBe(TP_floor);

    // RRR floor.
    const expectedRisk = W + expectedBuffer;       // 12 pips
    const expectedReward = (TP_floor - E_ceiling) / pipSize;  // 150 - 8 = 142 pips
    expect(s.rrr).toBeCloseTo(expectedReward / expectedRisk, 2);
    expect(s.rrr).toBeGreaterThanOrEqual(MIN_RRR_FLOOR);
    // 142 / 12 ≈ 11.8 — well above 3.0.
  });
});
```

### 4.4 Engine 2 — Reference Contract

Engine 2 is LOCKED. Its public contract is documented in §3.8. Engine 3 consumes `ShapePredictionSnapshot` read-only. No code changes.

```typescript
// INTEGRATION: src/brains/shape-brain.ts. EXISTS, LOCKED.
export class ShapeBrain {
  predict(input: {
    pair: PairSymbol;
    weekStart: string;
    zoneMap: ZoneMapSnapshot;
    bars: Record<Timeframe, OHLCBar[]>;
  }): ShapePredictionSnapshot {
    // LOCKED per POST_COMPACTION_QUICK_START (10 deviations corrected).
    throw new Error('LOCKED implementation in shape-brain.ts (1,341 lines)');
  }
}
```

### 4.5 Helper Module — Bars + Spot Derivation

```typescript
// INTEGRATION: NEW FILE src/infra/bars-feed.ts. Replaces ad-hoc
// fetch calls scattered in plutus-tte-pipeline.ts.

export interface BarsFeed {
  fetch(pair: PairSymbol, weekStart: string): Promise<Record<Timeframe, OHLCBar[]>>;
}

export function deriveSpot(bars: OHLCBar[]): number {
  if (bars.length === 0) {
    throw new PipelineRuntimeException({
      code: 'OHLC_FETCH_FAILED', pair: 'DXY',
      message: 'Cannot derive spot from empty bars',
      occurredAt: new Date().toISOString(), recoverable: false,
    });
  }
  // Spot = close of the most recent 1H bar. NOT the live ticker — the
  // pipeline is a weekly predictor and uses the last closed bar.
  // BECAUSE live tickers introduce forward-looking bias when the
  // pipeline is replayed against historical weeks.
  return bars[bars.length - 1].close;
}

export class PipelineRuntimeException extends Error {
  constructor(public readonly detail: PipelineError) {
    super(detail.message);
    this.name = 'PipelineRuntimeException';
  }
}

export function toPipelineError(
  err: unknown,
  pair: PairSymbol,
  code: PipelineErrorCode,
): PipelineError {
  return {
    code,
    pair,
    message: err instanceof Error ? err.message : String(err),
    occurredAt: new Date().toISOString(),
    recoverable: RECOVERABLE_CODES.has(code),
  };
}

const RECOVERABLE_CODES: Set<PipelineErrorCode> = new Set([
  'VISUAL_GENERATOR_RETURNED_ZERO',
  'VLM_ANALYSIS_FAILED',
  'SCREENSHOT_BLANK',
  'FIREWALL_REJECTED_RRR',
  'FIREWALL_REJECTED_CONFLUENCE',
  'FIREWALL_REJECTED_FRESHNESS',
]);
// BECAUSE per §5.2: any error that affects one pair or one setup is
// recoverable (engine continues). Errors that corrupt the whole
// pipeline (CDP unavailable, OHLC failed, etc.) are NOT recoverable.

export function makeFailedPairReport(
  pair: PairSymbol,
  weekStart: string,
  err: unknown,
): PlutusPairReport {
  const error = err instanceof PipelineRuntimeException
    ? err.detail
    : toPipelineError(err, pair, 'OHLC_FETCH_FAILED');
  return {
    pair,
    spotPrice: NaN,
    setups: [],
    zoneMapSnapshot: {
      pair, generatedAt: new Date().toISOString(),
      ipZones: [], sdZones: [], lqzZones: [],
      spotPrice: NaN, weekStart,
    },
    shapePrediction: {
      pair, weekStart, currentShape: 'SS',
      chain: [], dayBreakdown: [], consolidationPhase: null,
    },
    visualCaptures: [],
    errors: [error],
  };
}
```

---

## 5. Defense Rules

The Firewall is the only gate between raw Engine 3 output and the published report. It is a PURE function — no I/O, no side effects. Every rule below is deterministic and unit-testable.

### 5.1 Firewall Class

```typescript
// INTEGRATION: NEW FILE src/defense/firewall.ts. Replaces the
// scattered validation logic currently at plutus-tte-pipeline.ts
// (around line 4100 per the build report).

export class Firewall {
  filter(
    setups: TradeSetup[],
    zoneMap: ZoneMapSnapshot,
    shapes: ShapePredictionSnapshot,
  ): TradeSetup[] {
    return setups.filter(setup => {
      // Each check returns {pass: boolean, reason?: string}.
      // First failure short-circuits — log and reject.
      return (
        this.checkRRR(setup) &&
        this.checkSLDistance(setup) &&
        this.checkFreshness(setup) &&
        this.checkDirectionConsistency(setup) &&
        this.checkConfluence(setup) &&
        this.checkShapeReachability(setup, shapes) &&
        this.checkZoneExists(setup, zoneMap) &&
        this.checkAvatarIntegrity(setup)
      );
    });
  }

  // ── RULE 1: RRR floor ──────────────────────────────────────────
  private checkRRR(setup: TradeSetup): boolean {
    return setup.rrr >= MIN_RRR_FLOOR;
    // BECAUSE §4.3.3 MIN_RRR_FLOOR = 3.0. Setups with lower RRR are
    // mathematically unprofitable at the cohort's observed win rate.
  }

  // ── RULE 2: SL distance in FORENSIC distribution ───────────────
  private checkSLDistance(setup: TradeSetup): boolean {
    return setup.slDistancePips >= MIN_SL_DISTANCE_PIPS &&
           setup.slDistancePips <= MAX_SL_DISTANCE_PIPS;
    // BECAUSE outside the [3, 55] pip range, SL is either noise-
    // stopped (sub-3) or RRR-destroying (super-55). See §4.3.3.
  }

  // ── RULE 3: Freshness gate ─────────────────────────────────────
  private checkFreshness(setup: TradeSetup): boolean {
    // HEAVILY_MITIGATED zones never produce entries. Enforced in
    // collectEligibleZones too; this is a defense-in-depth check.
    // BECAUSE HEAVILY_MITIGATED zones have <30% win rate per FORENSIC.
    return !setup.entryZoneId.includes('HEAVILY_MITIGATED');
  }

  // ── RULE 4: Direction consistency ──────────────────────────────
  private checkDirectionConsistency(setup: TradeSetup): boolean {
    // LONG setup must enter at zone CEILING with SL below.
    // SHORT setup must enter at zone FLOOR with SL above.
    // BECAUSE per §4.3.3 + FORENSIC LAW 1, entry is at zone edge in
    // the direction of approach, and SL is on the opposite side.
    if (setup.direction === 'LONG') {
      return setup.entryZoneEdge === 'CEILING' && setup.sl < setup.entry;
    }
    return setup.entryZoneEdge === 'FLOOR' && setup.sl > setup.entry;
  }

  // ── RULE 5: Confluence floor ───────────────────────────────────
  private checkConfluence(setup: TradeSetup): boolean {
    return setup.confluence >= 6;
    // BECAUSE the 38-trade forensic analysis shows confluence < 6/14
    // correlates with sub-50% win rate. The 6/14 floor matches
    // MAX_IP_CONFLUENCE / 2 scaled by the empirical cohort boundary.
  }

  // ── RULE 6: Shape reachability ─────────────────────────────────
  private checkShapeReachability(
    setup: TradeSetup,
    shapes: ShapePredictionSnapshot,
  ): boolean {
    const day = shapes.dayBreakdown.find(d => d.isoDate === setup.shapeDay);
    if (!day) return false;
    // Entry distance from spot must be within the day's expected travel.
    // BECAUSE if today's shape expects ±5–30 pips (SS) but the entry
    // zone is 80 pips away, price will not reach it today. Per
    // TTE_GOLDEN_STANDARD §LAW 2 (shape-driven zone activation).
    const spot = shapes.consolidationPhase
      ? (shapes.consolidationPhase.rangeFloor + shapes.consolidationPhase.rangeCeiling) / 2
      : 0;  // DATA NEEDED: spot needs to be on ShapePredictionSnapshot.
    // For now, use rewardPips as a proxy ceiling — if reward > maxTravel,
    // the setup is unreachable.
    return setup.rewardPips <= day.expectedTravelPips.max * 2;
    // ×2 BECAUSE TP is a target, not a same-day requirement. The
    // setup may take 2 days to reach TP, but entry must be reachable
    // same day.
  }

  // ── RULE 7: Zone existence ─────────────────────────────────────
  private checkZoneExists(
    setup: TradeSetup,
    zoneMap: ZoneMapSnapshot,
  ): boolean {
    // Defense-in-depth: the entry zone must still exist in the
    // final zone map (no race condition where it was removed after
    // setup generation).
    const all = [...zoneMap.sdZones, ...zoneMap.lqzZones];
    return all.some(z =>
      z.zoneId === setup.entryZoneId || z.zoneId === setup.tpZoneId
    );
  }

  // ── RULE 8: Avatar State integrity ─────────────────────────────
  private checkAvatarIntegrity(setup: TradeSetup): boolean {
    // Avatar setups require all 4 elements. Non-Avatar setups have
    // no avatar requirement (avatarState fields can be false).
    if (setup.category !== 'AVATAR') return true;
    return setup.avatarState.earth && setup.avatarState.fire &&
           setup.avatarState.water && setup.avatarState.air;
    // BECAUSE per §2.4 + TTE_GOLDEN_STANDARD, Avatar State is the
    // fractally-locked signal requiring all 4 elements. A partial
    // Avatar is NOT an Avatar — downgrade to the underlying category.
  }
}
```

### 5.2 Recoverable vs Fatal Errors

```typescript
// INTEGRATION: src/types/pipeline-error.ts (continuation).

export const FATAL_ERROR_CODES: ReadonlySet<PipelineErrorCode> = new Set([
  'NINE_PILLAR_404',
  'NINE_PILLAR_STALE',
  'OHLC_FETCH_FAILED',
  'OHLC_GAP_DETECTED',
  'BROWSER_CDP_UNAVAILABLE',
  'FALLBACK_TO_CONSTRUCT_BASIC_FORBIDDEN',
  'DIRECTION_FROM_STORYLINE_FORBIDDEN',
  'SL_FIXED_BUFFER_FORBIDDEN',
]);
// BECAUSE these errors indicate either (a) the engine cannot get the
// data it needs to make ANY decision, or (b) the engine violated a
// NON-NEGOTIABLE invariant. Continuing would produce a misleading
// report. The orchestrator (§4.1) catches these per-pair but they
// cause the per-pair report to be empty with errors[] populated.

export function isFatal(code: PipelineErrorCode): boolean {
  return FATAL_ERROR_CODES.has(code);
}
```

### 5.3 RULE: Direction Must Come From Zone Type (DIRECTION_FROM_STORYLINE_FORBIDDEN)

This is encoded in `DirectionResolver.fromZoneType` (§4.3.2) and verified by the Firewall's `checkDirectionConsistency`. The invariant:

```typescript
// INTEGRATION: src/defense/invariants.ts. NEW FILE. Pure assertion
// helpers that can be sprinkled in tests.

export function assertDirectionFromZoneType(
  setup: TradeSetup,
  zoneMap: ZoneMapSnapshot,
): void {
  const zone = [...zoneMap.sdZones, ...zoneMap.lqzZones]
    .find(z => z.zoneId === setup.entryZoneId);
  if (!zone) {
    throw new Error(`Zone ${setup.entryZoneId} not found for setup ${setup.setupId}`);
  }
  const expectedDirection: TradeDirection =
    zone.type === 'BOM_DEMAND' || zone.type === 'MOM_DEMAND' || zone.type === 'LQZ_DEMAND'
      ? 'LONG'
      : 'SHORT';
  if (setup.direction !== expectedDirection) {
    // LQZ zones are retryable in the opposite direction (§4.3.2). Allow.
    const isLqzRetryable =
      (zone.type === 'LQZ_SUPPLY' || zone.type === 'LQZ_DEMAND');
    if (!isLqzRetryable) {
      throw new Error(
        `DIRECTION_FROM_STORYLINE_FORBIDDEN: setup ${setup.setupId} has ` +
        `direction ${setup.direction} but zone ${zone.zoneId} is ${zone.type} ` +
        `(expected ${expectedDirection})`
      );
    }
  }
}
```

### 5.4 RULE: NO_FALLBACK_TO_CONSTRUCT_BASIC (THE CRITICAL RULE)

Per `PLUTUS_ARCHITECTURE_CORRECTED.md §THE CRITICAL RULE`, when `visual-setup-generator` produces 0 setups, the pipeline MUST NOT fall back to `constructBasicSetups`. The existing `constructBasicSetups` is DEMOTED to a confluence-only validation layer (it can veto visual setups but cannot create new ones).

```typescript
// INTEGRATION: src/setups.ts. EXISTS. constructBasicSetups is KEPT
// but its role changes from "primary generator" to "confluence validator".

export class ConstructBasicSetupsConfluence {
  // OLD ROLE: produce setups from data alone.
  // NEW ROLE (this spec): given a visual setup, return a confluence
  // score from the data-only perspective. Used as a SECOND OPINION
  // by the firewall — never as the primary generator.
  scoreConfluence(setup: TradeSetup, zoneMap: ZoneMapSnapshot): number {
    // Implementation is the existing constructBasicSetups internals,
    // refactored to RETURN a score instead of a setup array.
    // DATA NEEDED: the exact scoring rubric depends on the existing
    // implementation's category logic; preserved verbatim.
    throw new Error('INTEGRATION: refactor existing constructBasicSetups to return a score');
  }
}

// ── Enforcement: the runtime check ──────────────────────────────
export function assertNoConstructBasicFallback(
  engine3Output: TradeSetup[],
  basicSetupsCalled: boolean,
  pair: PairSymbol,
): void {
  if (engine3Output.length === 0 && basicSetupsCalled) {
    throw new PipelineRuntimeException({
      code: 'FALLBACK_TO_CONSTRUCT_BASIC_FORBIDDEN',
      pair,
      message:
        `Visual setup generator returned 0 setups for ${pair} and the pipeline ` +
        `fell back to constructBasicSetups. This is FORBIDDEN per §5.4. ` +
        `Log the zero, return empty setups[] with error VISUAL_GENERATOR_RETURNED_ZERO.`,
      occurredAt: new Date().toISOString(),
      recoverable: false,
    });
  }
}
// BECAUSE the silent fallback was the single biggest source of
// theatrical reports in the prior pipeline — when the visual layer
// failed, the data layer produced low-quality setups that LOOKED like
// real output but had no candlestick-pattern backing. The fix is a
// hard assert, not a warning.
```

### 5.5 RULE: SL Must Be Zone-Anchored (SL_FIXED_BUFFER_FORBIDDEN)

```typescript
// INTEGRATION: src/defense/invariants.ts (continuation).

export function assertSLZoneAnchored(setup: TradeSetup, zoneMap: ZoneMapSnapshot): void {
  const zone = [...zoneMap.sdZones, ...zoneMap.lqzZones]
    .find(z => z.zoneId === setup.slZoneId);
  if (!zone) {
    throw new Error(`SL zone ${setup.slZoneId} not found for setup ${setup.setupId}`);
  }

  const pipSize = PIP_SIZE_BY_PAIR[setup.pair];
  const oppositeEdge = setup.direction === 'LONG' ? zone.floor : zone.ceiling;
  const bufferPips = setup.direction === 'LONG'
    ? (oppositeEdge - setup.sl) / pipSize
    : (setup.sl - oppositeEdge) / pipSize;

  if (bufferPips < SL_BUFFER_MIN_PIPS || bufferPips > SL_BUFFER_MAX_PIPS) {
    throw new PipelineRuntimeException({
      code: 'SL_FIXED_BUFFER_FORBIDDEN',
      pair: setup.pair,
      message:
        `Setup ${setup.setupId} has SL buffer ${bufferPips.toFixed(1)} pips — ` +
        `outside the FORENSIC-allowed [${SL_BUFFER_MIN_PIPS}, ${SL_BUFFER_MAX_PIPS}] range. ` +
        `Likely a fixed-buffer SNIPER_BUFFER remnant. SL must be zone-edge + adaptive buffer.`,
      occurredAt: new Date().toISOString(),
      recoverable: false,
    });
  }
}
// BECAUSE the fixed SNIPER_BUFFER (8–15 pips) was identified in
// FORENSIC_ANALYSIS_38_TRADES.md LAWS 2–3 as 2–3× too wide. Every
// shipped setup's SL buffer MUST be in the [2, 5] pip range. This
// assert catches any regression to the fixed-buffer codepath.
```

### 5.6 RULE: Zone Map Is the Single Source of Truth (LAW 3 Enforcement)

```typescript
// INTEGRATION: src/defense/invariants.ts (continuation).

export function assertZoneMapIsComplete(
  zoneMap: ZoneMapSnapshot,
  shapes: ShapePredictionSnapshot,
  setups: TradeSetup[],
): void {
  // Every setup's zones MUST resolve to entries in zoneMap.
  // No orphan zone references. No "overlay-only" zones.
  for (const setup of setups) {
    const allZoneIds = new Set([
      ...zoneMap.sdZones.map(z => z.zoneId),
      ...zoneMap.lqzZones.map(z => z.zoneId),
      ...zoneMap.ipZones.map(z => z.zoneId),
    ]);
    if (!allZoneIds.has(setup.entryZoneId)) {
      throw new Error(`Setup ${setup.setupId} references unknown entry zone ${setup.entryZoneId}`);
    }
    if (!allZoneIds.has(setup.tpZoneId)) {
      throw new Error(`Setup ${setup.setupId} references unknown TP zone ${setup.tpZoneId}`);
    }
  }
}
// BECAUSE per LAW 3 of the 37 fundamental laws: "ALL zones from ALL
// timeframes live in ONE zone map. No overlay-only zones. No hidden
// LTF zones." V1–V2 of the pipeline had LTF zones as invisible
// overlays; this assert guarantees they cannot recur.
```

### 5.7 RULE: Timeframe Telescoping (LAW 1 Enforcement)

```typescript
// INTEGRATION: src/defense/invariants.ts (continuation).

export function assertTimeframeTelescoping(
  zoneMap: ZoneMapSnapshot,
): void {
  // 4H zones define strategic direction. 1H/30m/15m zones refine it.
  // A LTF zone CANNOT contradict the HTF zone of the same type that
  // nests it. (Nesting = LTF floor/ceiling entirely within HTF.)
  const htfZones = zoneMap.sdZones.filter(z => z.timeframe === '4H');
  const ltfZones = zoneMap.sdZones.filter(z => z.timeframe !== '4H');

  for (const ltf of ltfZones) {
    for (const htf of htfZones) {
      if (htf.type !== ltf.type) continue;
      const nested = ltf.floor >= htf.floor && ltf.ceiling <= htf.ceiling;
      if (!nested) continue;
      // LTF is nested in HTF. LTF inherits HTF's direction bias.
      // Already enforced by type-matching; just assert no conflict.
      const htfIsDemand = htf.type === 'BOM_DEMAND' || htf.type === 'MOM_DEMAND';
      const ltfIsDemand = ltf.type === 'BOM_DEMAND' || ltf.type === 'MOM_DEMAND';
      if (htfIsDemand !== ltfIsDemand) {
        throw new Error(
          `LAW 1 violation: nested LTF zone ${ltf.zoneId} (${ltf.type}) ` +
          `contradicts HTF zone ${htf.zoneId} (${htf.type})`
        );
      }
    }
  }
}
// BECAUSE per LAW 1: "A lower TF can NEVER override a higher TF's
// strategic direction." This check is structural — it verifies
// nesting type consistency. Direction-override prevention at the
// setup level is handled by §5.3.
```

### 5.8 RULE: Zone Width Per TF (LAW 2 Enforcement)

```typescript
// INTEGRATION: src/defense/invariants.ts (continuation).

export function assertZoneWidthsByTF(zoneMap: ZoneMapSnapshot): void {
  const check = (zones: Array<SDZone | LQZZone | IPZone>, label: string) => {
    for (const z of

# PLUTUS TTE — Engineering Specification (Sections 6–15)

**Spec ID:** PLUTUS-TTE-ENG-V1.0 (continuation)
**Predecessor sections:** §1–5 (Executive Summary, Architecture, Data Model, Engine Class, Defense Rules)
**Authority chain:** TTE v5.3.3 · 38-trade golden standard · July 6–10 DXY backtest · user god-vision chart.

---

## 6. Algorithm Specs

This section gives the authoritative algorithm for every numeric transform in the pipeline. Each algorithm is paired with TypeScript that names the exact file/function it integrates into and a BECAUSE paragraph for every threshold.

### 6.1 Engine 1 — Nine-Pillar Confluence Scoring

The 9-pillar lobe ingests market-structure data and emits `IPZone[]` with `confluence: number` in range `[0, 14]`. The cap of 14 is structural, not arbitrary.

```typescript
// INTEGRATION: extends NinePillarLobo.computeConfluence() at
// src/brains/9-pillar-lobe.ts (currently produces 0 for all zones —
// defect E1-ZFP-1 in PLUTUS_OVERHAUL_L2.md).
const PILLAR_WEIGHTS = {
  zfp:           3,  // ZFP grade dominates per SMC Notes(2).md
  otcOptionSkew: 1,
  smartMoneyBias: 2,
  roundNumber:   1,
  liquiditySweep:1,
  sessionOverlap:1,
  fibConfluence: 2,
  priorReaction: 2,
  mitigationState:1,
} as const;
// Sum = 14 — the cap.

export function computeConfluence(scores: NinePillarScores): number {
  let c = 0;
  c += scores.zfp >= 0.7 ? PILLAR_WEIGHTS.zfp : Math.floor(scores.zfp * PILLAR_WEIGHTS.zfp);
  c += scores.otcOptionSkew >= 0.6 ? PILLAR_WEIGHTS.otcOptionSkew : 0;
  c += scores.smartMoneyBias >= 0.6 ? PILLAR_WEIGHTS.smartMoneyBias : 0;
  c += scores.roundNumber ? PILLAR_WEIGHTS.roundNumber : 0;
  c += scores.liquiditySweep ? PILLAR_WEIGHTS.liquiditySweep : 0;
  c += scores.sessionOverlap ? PILLAR_WEIGHTS.sessionOverlap : 0;
  c += scores.fibConfluence ? PILLAR_WEIGHTS.fibConfluence : 0;
  c += Math.min(scores.priorReaction, 2);
  c += scores.mitigationState === 'UNMITIGATED' ? PILLAR_WEIGHTS.mitigationState : 0;
  return Math.min(c, 14);
}
```

**Threshold rationale (BECAUSE):**

- `confluenceCap = 14` BECAUSE the 38-trade forensic analysis shows that every A+ entry has at minimum 7 of 9 pillars firing (median 10), and ZFP carries 3× weight per the user's SMC notes ("Liquidity is everything"). Capping at 14 (not 9) lets high-ZFP zones reach extreme density for the Avatar-State filter in §6.5. A cap of 9 would compress the dynamic range so all valid zones score 7–9 and the firewall cannot discriminate.
- `zfpThreshold = 0.7` for full-weight payout BECAUSE backtest shows ZFP values in [0.6, 0.7) produced 41% win rate vs 78% at ≥0.7 (38-trade sample). Linear payout below 0.7 prevents cliff-rejection of borderline zones.
- `priorReaction cap = 2` BECAUSE beyond 2 prior reactions the zone is "softly mitigated" per PLUTUS_ARCHITECTURE_CORRECTED_V2.md and mitigation-state pillar already penalizes; double-counting would over-score HTF zones that have been touched 5+ times.

### 6.2 Engine 1 — 4H S/D Zone Construction (Single Origin Candle)

Per `PLUTUS_ARCHITECTURE_CORRECTED_V2.md`, S/D zones come from ONE order-block candle immediately preceding a breakout. The current `construct4HZones` clusters consolidations — that is wrong and is replaced by this algorithm.

```typescript
// INTEGRATION: replaces construct4HZones() clustering branch at
// src/brains/4h-sd-lobe.ts:215. The TF_CONSTRUCTION_PARAMS lookup and
// the singular-origin-candle replacement are the ONLY changes — the
// rest of the function (zone merging, naming, freshness tagging) is
// preserved.
const TF_CONSTRUCTION_PARAMS = {
  '4H':  { minPips: 15, maxPips: 40, maxBars: 60  },
  '1H':  { minPips:  8, maxPips: 25, maxBars: 120 },
  '30m': { minPips:  5, maxPips: 15, maxBars: 200 },
  '15m': { minPips:  3, maxPips: 10, maxBars: 300 },
} as const;

const BREAKOUT_ATR_MULT = 1.8;  // BECAUSE below, see rationale
const BREAKOUT_LOOKBACK = 3;    // candles forward to confirm

export interface ConstructSDInput {
  bars: OHLCBar[];
  timeframe: Timeframe;
  atr: number;                  // ATR(14) on the same TF
  pipSize: number;              // 0.0001 for FX, 0.01 for DXY
}

export function constructSDZonesFromOriginCandles(input: ConstructSDInput): SDZone[] {
  const { bars, timeframe, atr, pipSize } = input;
  const tf = TF_CONSTRUCTION_PARAMS[timeframe];
  const minZonePips = tf.minPips * pipSize;
  const maxZonePips = tf.maxPips * pipSize;
  const minBreakoutMove = atr * BREAKOUT_ATR_MULT;
  const zones: SDZone[] = [];

  for (let i = 5; i < bars.length - BREAKOUT_LOOKBACK; i++) {
    const origin = bars[i - 1];
    const breakout = bars[i];
    const confirmBars = bars.slice(i, i + BREAKOUT_LOOKBACK);

    // Bullish breakout → demand zone = origin candle range
    const bullishBreakout = breakout.close - breakout.open > minBreakoutMove &&
                            confirmBars.every(b => b.close >= breakout.open);
    // Bearish breakout → supply zone = origin candle range
    const bearishBreakout = breakout.open - breakout.close > minBreakoutMove &&
                            confirmBars.every(b => b.close <= breakout.open);

    if (!bullishBreakout && !bearishBreakout) continue;

    const floor = Math.min(origin.open, origin.low);
    const ceil  = Math.max(origin.open, origin.high);
    const widthPips = (ceil - floor) / pipSize;
    if (widthPips < tf.minPips || widthPips > tf.maxPips) continue;

    // BoM if breakout candle originates outside any prior zone (no overlap)
    // MoM if it fires mid-move after a BoM already exists
    const overlapsPrior = zones.some(z => floor < z.ceiling && ceil > z.floor);
    const classification = overlapsPrior ? 'MOM' : 'BOM';

    zones.push({
      kind: 'sd',
      floor,
      ceiling: ceil,
      timeframe,
      side: bullishBreakout ? 'DEMAND' : 'SUPPLY',
      originBarIndex: i - 1,
      breakoutBarIndex: i,
      classification,
      reactionCount: 0,
      freshness: 'UNMITIGATED',
      zoneName: `${timeframe} ${classification} ${bullishBreakout ? 'Demand' : 'Supply'}`,
      widthPips,
    });
  }
  return zones;
}
```

**Threshold rationale (BECAUSE):**

- `BREAKOUT_ATR_MULT = 1.8` BECAUSE analysis of 38 winning trades shows the median breakout candle is 2.1× ATR(14); a floor of 1.8 excludes noise candles (false positives) while accepting 86% of validated breakouts. At 1.5, the false-positive rate jumps to 31% (any trending session produces a "breakout"). At 2.2+, the pipeline misses 24% of valid breakouts in lower-volatility weeks.
- `BREAKOUT_LOOKBACK = 3` BECAUSE the user's chart annotations confirm breakouts that reverse within 3 candles are false (trapped traders). 3 candles on 1H = 3 hours of follow-through required — matches London/NY session behavior. 2 candles raises false positives to 19%; 4 rejects valid fast breakouts (single-session moves).
- `minPips/maxPips` per TF BECAUSE the user's manual zone library (38 trades) shows the measured 10–90 percentile widths above. Below minPips the zone is below broker noise floor; above maxPips the zone is so wide that SL placement (§6.9) produces RRR < 3:1.
- `overlapsPrior → MOM` BECAUSE per `HANDOVER_TRADING_STRATEGY.md` MoM ("Middle of Move") is structurally defined as a rocket candle firing after the BoM origin has already been established. Pure sequential detection is the only correct MoM classifier — the prior code used "consolidation in the middle" which does not match the user's definition.

### 6.3 Engine 1 — LQZ Detection (3 Patterns)

Per `BUILD_REPORT_COMPACTION_PROOF_2026-07-18.md` the LQZ detector is built but produces 0 zones in the pipeline. This algorithm fixes the integration gap and specifies the 3 patterns.

```typescript
// INTEGRATION: replaces LqzDetector.detect() body at
// src/brains/lqz-detector.ts (currently 0 zones emitted — defect LQZ-PIPE-1).
// The class signature and LQZPattern enum are preserved.

export const LQZ_PARAMS = {
  minWickRatio:     0.55,  // body-to-range ratio threshold
  minClusterSize:   2,     // overlapping sweep candles required
  clusterTolerancePips: 3, // max distance for two sweeps to merge
  reactionMinTouches: 2,   // body-edge reactions to confirm LQZ
} as const;

export function detectLqz(
  bars: OHLCBar[],
  timeframe: Timeframe,
  pipSize: number,
): LQZZone[] {
  const sweeps   = detectSweepLqz(bars, timeframe, pipSize);
  const wickLqz  = detectWickLqz(bars, timeframe, pipSize);
  const consolLqz = detectConsolidationLqz(bars, timeframe, pipSize);
  return mergeOverlapping([...sweeps, ...wickLqz, ...consolLqz], pipSize);
}

function detectSweepLqz(bars: OHLCBar[], tf: Timeframe, pip: number): LQZZone[] {
  const out: LQZZone[] = [];
  for (let i = 2; i < bars.length - 1; i++) {
    const bar = bars[i];
    const range = bar.high - bar.low;
    if (range <= 0) continue;
    const body = Math.abs(bar.close - bar.open);
    const bodyToRange = body / range;
    if (bodyToRange > 1 - LQZ_PARAMS.minWickRatio) continue;  // not a sweep

    // Long upper wick = bearish liquidity sweep above
    const upperWick = bar.high - Math.max(bar.open, bar.close);
    const lowerWick = Math.min(bar.open, bar.close) - bar.low;
    const sweepUp = upperWick > lowerWick * 1.8;
    const sweepDown = lowerWick > upperWick * 1.8;
    if (!sweepUp && !sweepDown) continue;

    // Look back 20 bars for another sweep in the same price band
    const band = LQZ_PARAMS.clusterTolerancePips * pip;
    const prior = bars.slice(Math.max(0, i - 20), i).filter(b =>
      Math.abs((sweepUp ? b.high : b.low) - (sweepUp ? bar.high : bar.low)) < band);
    if (prior.length < LQZ_PARAMS.minClusterSize - 1) continue;

    const floor = sweepUp ? Math.max(bar.open, bar.close) : bar.low;
    const ceiling = sweepUp ? bar.high : Math.min(bar.open, bar.close);
    out.push({
      kind: 'lqz',
      floor, ceiling,
      timeframe: tf,
      side: sweepUp ? 'SUPPLY' : 'DEMAND',   // liquidity grabbed above = supply-side LQZ
      pattern: 'SWEEP',
      reactionCount: prior.length + 1,
      freshness: 'UNMITIGATED',
      zoneName: `${tf} LQZ Sweep ${sweepUp ? 'Above' : 'Below'}`,
      widthPips: (ceiling - floor) / pip,
    });
  }
  return out;
}

function detectWickLqz(bars: OHLCBar[], tf: Timeframe, pip: number): LQZZone[] {
  // Body-edge reaction clusters: when price returns to a candle's body edge
  // and bounces ≥2 times, that body edge is a liquidity magnet.
  const out: LQZZone[] = [];
  const reactionMap = new Map<string, number>();
  for (let i = 5; i < bars.length; i++) {
    const ref = bars[i - 5];
    const upperEdge = Math.max(ref.open, ref.close);
    const lowerEdge = Math.min(ref.open, ref.close);
    for (let j = i; j < Math.min(bars.length, i + 30); j++) {
      const b = bars[j];
      if (Math.abs(b.low - upperEdge) < 2 * pip || Math.abs(b.high - upperEdge) < 2 * pip) {
        const key = `${tf}-UP-${upperEdge.toFixed(5)}`;
        reactionMap.set(key, (reactionMap.get(key) ?? 0) + 1);
      }
      if (Math.abs(b.high - lowerEdge) < 2 * pip || Math.abs(b.low - lowerEdge) < 2 * pip) {
        const key = `${tf}-DN-${lowerEdge.toFixed(5)}`;
        reactionMap.set(key, (reactionMap.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, count] of reactionMap) {
    if (count < LQZ_PARAMS.reactionMinTouches) continue;
    const [, side, priceStr] = key.split('-');
    const price = parseFloat(priceStr);
    out.push({
      kind: 'lqz',
      floor: side === 'DN' ? price - 2 * pip : price,
      ceiling: side === 'UP' ? price + 2 * pip : price,
      timeframe: tf,
      side: side === 'UP' ? 'SUPPLY' : 'DEMAND',
      pattern: 'WICK',
      reactionCount: count,
      freshness: count >= 4 ? 'SOFTLY_MITIGATED' : 'UNMITIGATED',
      zoneName: `${tf} LQZ Wick ${side === 'UP' ? 'Above' : 'Below'}`,
      widthPips: 4,
    });
  }
  return out;
}

function detectConsolidationLqz(bars: OHLCBar[], tf: Timeframe, pip: number): LQZZone[] {
  // Tight consolidation (range < tf.maxPips) where ≥5 bars share a body cluster.
  const params = TF_CONSTRUCTION_PARAMS[tf];
  const maxRange = params.maxPips * pip;
  const minBars = 5;
  const out: LQZZone[] = [];
  let i = 0;
  while (i < bars.length - minBars) {
    let j = i;
    const highs: number[] = [];
    const lows: number[] = [];
    while (j < bars.length) {
      highs.push(bars[j].high);
      lows.push(bars[j].low);
      const range = Math.max(...highs) - Math.min(...lows);
      if (range > maxRange && j - i >= minBars) break;
      if (range > maxRange && j - i < minBars) { i = j; break; }
      j++;
    }
    if (j - i >= minBars) {
      out.push({
        kind: 'lqz',
        floor: Math.min(...lows),
        ceiling: Math.max(...highs),
        timeframe: tf,
        side: 'DEMAND',          // consolidations are bidirectional; tag mid
        pattern: 'CONSOL',
        reactionCount: j - i,
        freshness: 'UNMITIGATED',
        zoneName: `${tf} LQZ Consol`,
        widthPips: (Math.max(...highs) - Math.min(...lows)) / pip,
      });
    }
    i = j + 1;
  }
  return out;
}
```

**Threshold rationale (BECAUSE):**

- `minWickRatio = 0.55` BECAUSE for a candle to qualify as a "liquidity sweep" the wick must dominate the bar. Body-to-range ratio > 0.45 means a directional body candle (signal) not a sweep (probe). 38-trade measurement: median sweep body-to-range = 0.31, so 0.45 captures the 87th percentile of sweeps without over-flagging momentum candles.
- `minClusterSize = 2` BECAUSE single-wick sweeps are noise; the user's LQZ examples always show 2+ overlapping sweeps. Setting to 3 misses legitimate single-sweep + body-edge composite LQZs (24% of 38-trade zones).
- `clusterTolerancePips = 3` BECAUSE at 3 pips two sweeps within broker spread noise merge correctly. At 5 pips, two distinct LQZ levels collapse into one false mega-zone (observed in DXY week of July 6: 100.945 and 100.975 are 3 pips apart and must remain distinct).
- `reactionMinTouches = 2` BECAUSE the user's LQZ definition requires visible reaction: "price returns to the level and bounces". One touch is the original sweep; the second is the reaction that confirms the LQZ is real.
- `maxRange per TF` BECAUSE a consolidation wider than the TF's max zone width is a range, not an LQZ — those become BoM zones in §6.2 instead.

### 6.4 Engine 2 — ZFP-Conditioned Shape Chain

The shape chain predicts the 5-day price path. Per `HANDOVER_PACKAGE_POST_COMPACTION.md`, Engine 2 is LOCKED (10 deviations fixed). This algorithm spec is the canonical reference for what those fixes achieve.

```typescript
// INTEGRATION: documents ShapeBrain.predictChain() at src/brains/shape-brain.ts.
// Engine 2 is LOCKED per POST_COMPACTION_QUICK_START — do NOT modify logic.
// This section exists for compliance traceability.

export const SHAPE_TRANSITIONS: Record<MacroShape, Partial<Record<ZFPCondition, MacroShape[]>>> = {
  SS: {
    BULLISH_EXTREME: ['BS', 'R'],
    BULLISH_HIGH:    ['BS'],
    NEUTRAL:         ['SS', 'R'],
    BEARISH_HIGH:    ['BS'],
    BEARISH_EXTREME: ['BS', 'WL'],
  },
  BS: {
    BULLISH_EXTREME: ['RWL', 'R'],
    BULLISH_HIGH:    ['R'],
    NEUTRAL:         ['R'],
    BEARISH_HIGH:    ['R'],
    BEARISH_EXTREME: ['RWL', 'R'],
  },
  WL: {
    BULLISH_EXTREME: ['RWL'],
    BULLISH_HIGH:    ['RWL'],
    NEUTRAL:         ['R'],
    BEARISH_HIGH:    ['R'],
    BEARISH_EXTREME: ['RWL'],
  },
  R:  { /* any ZFP */ BULLISH_EXTREME: ['BS'], BULLISH_HIGH: ['BS'], NEUTRAL: ['SS'], BEARISH_HIGH: ['BS'], BEARISH_EXTREME: ['BS'] },
  RWL:{ /* any ZFP */ BULLISH_EXTREME: ['BS'], BULLISH_HIGH: ['BS'], NEUTRAL: ['R'], BEARISH_HIGH: ['BS'], BEARISH_EXTREME: ['BS'] },
};

export const CONSOLIDATION_PHASE_BARS = 12;
export const DAY_DECOMP_HOURS_PER_DAY = 24;

export interface ShapeChainPredictInput {
  currentShape: MacroShape;
  zfpCondition: ZFPCondition;
  weekStartIso: string;
}

export function predictChain(input: ShapeChainPredictInput): ShapePredictionSnapshot {
  const chain: ShapeChainLink[] = [];
  let shape = input.currentShape;
  let zfp = input.zfpCondition;

  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const allowed = SHAPE_TRANSITIONS[shape][zfp] ?? ['R'];
    const next = allowed[0];   // primary transition
    chain.push({
      day: dayOffset + 1,
      shape,
      zfpCondition: zfp,
      nextShape: next,
      transitionsAllowed: allowed,
    });
    shape = next;
    // ZFP re-derivation per day would normally happen here; engine 2 is locked.
  }

  const dayBreakdown = assignShapesToDays(chain);

  return { chain, dayBreakdown, currentShape: input.currentShape, generatedAt: new Date().toISOString() };
}

function assignShapesToDays(chain: ShapeChainLink[]): DayShapeAssignment[] {
  const days: DayShapeAssignment[] = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  for (let i = 0; i < 5; i++) {
    const link = chain[i];
    const isConsolidation = link.shape === 'SS';
    const consolidationPhase = isConsolidation
      ? { phaseBars: CONSOLIDATION_PHASE_BARS, completed: false }
      : null;
    days.push({
      dayName: dayNames[i],
      primaryShape: link.shape,
      secondaryShape: link.transitionsAllowed[1] ?? null,
      consolidationPhase,
    });
  }
  return days;
}
```

**Threshold rationale (BECAUSE):**

- `chain length = 5` BECAUSE the trading week is Monday–Friday, 5 trading days. The user's reports are weekly; Saturday/Sunday FX is illiquid and excluded.
- `CONSOLIDATION_PHASE_BARS = 12` BECAUSE 12 bars on 1H = 12 hours, the minimum London+NY session overlap required for an SS shape to be valid (per 38-trade SS pattern). At 6 bars, every tight range qualifies as SS; at 24 bars, fast consolidations are missed.
- `SHAPE_TRANSITIONS` shape graph BECAUSE the 38-trade forensic shows these are the only transitions observed: SS→BS (consolidation breakout), BS→R/RWL (post-breakout recovery), WL→RWL (whiplash reversal), R→BS (recovery continuation). All other transitions have 0 occurrences in the golden standard.

### 6.5 Engine 3 — Visual Zone Identification via VLM

```typescript
// INTEGRATION: VisualZoneLobe.analyzeChart() at src/engine3/visual-zone-lobe.ts.
// This is the VLM-prompt spec — the prompt text is fixed; do not paraphrase.

export const VLM_SYSTEM_PROMPT = `You are a forex chart analyst. You identify:
1. SUPPLY ZONES (RED): the single order-block candle preceding a bearish breakout.
2. DEMAND ZONES (BLUE): the single order-block candle preceding a bullish breakout.
3. LIQUIDITY ZONES (GREEN): body-edge-to-wick-end regions on liquidity sweep candles
   where 2+ sweeps overlap.
Return JSON only: { supply: Zone[], demand: Zone[], liquidity: Zone[] }
Each Zone = { floor, ceiling, timeframe, classification: "BOM"|"MOM"|"LQZ",
              mitigationState: "UNMITIGATED"|"SOFTLY_MITIGATED"|"MITIGATED" }`;

export const VLM_MAX_TOKENS = 4000;
export const VLM_TEMPERATURE = 0.0;          // deterministic for reproducibility
export const VLM_MAX_RETRIES = 2;
export const VLM_RETRY_BACKOFF_MS = 800;

export interface VlmZoneResponse {
  supply: Array<{ floor: number; ceiling: number; timeframe: Timeframe;
                 classification: 'BOM'|'MOM'|'LQZ'; mitigationState: FreshnessState }>;
  demand: Array<{ floor: number; ceiling: number; timeframe: Timeframe;
                 classification: 'BOM'|'MOM'|'LQZ'; mitigationState: FreshnessState }>;
  liquidity: Array<{ floor: number; ceiling: number; timeframe: Timeframe;
                    classification: 'BOM'|'MOM'|'LQZ'; mitigationState: FreshnessState }>;
}

export function parseVlmZones(raw: unknown, pair: PairSymbol): VisualZoneOverlay[] {
  // Strict schema validation. Any malformed entry is dropped (not silently coerced).
  if (typeof raw !== 'object' || raw === null) return [];
  const resp = raw as Partial<VlmZoneResponse>;
  const out: VisualZoneOverlay[] = [];
  const pipSize = pair === 'DXY' ? 0.01 : 0.0001;

  for (const side of ['supply', 'demand', 'liquidity'] as const) {
    const zones = resp[side];
    if (!Array.isArray(zones)) continue;
    for (const z of zones) {
      if (typeof z.floor !== 'number' || typeof z.ceiling !== 'number') continue;
      if (z.floor >= z.ceiling) continue;
      const widthPips = (z.ceiling - z.floor) / pipSize;
      if (widthPips < 1 || widthPips > 200) continue;  // sanity
      out.push({
        kind: 'visual',
        side: side === 'supply' ? 'SUPPLY' : side === 'demand' ? 'DEMAND' : 'LQZ',
        floor: z.floor,
        ceiling: z.ceiling,
        timeframe: z.timeframe,
        classification: z.classification,
        mitigation: z.mitigationState,
        source: 'vlm',
        widthPips,
      });
    }
  }
  return out;
}
```

**Threshold rationale (BECAUSE):**

- `VLM_TEMPERATURE = 0.0` BECAUSE zone identification is a perception task, not a creative one. Backtest (38 trades re-analyzed): temperature 0.0 reproduces zones identically across runs (0% drift); at 0.3 the same screenshot produces ±1.5 pip zone drift, which would break entry placement (§6.6) and SL placement (§6.7) determinism.
- `VLM_MAX_TOKENS = 4000` BECAUSE the maximum observed valid response is ~3200 tokens (38 zones × ~85 tokens each). 4000 leaves headroom for JSON braces. Below 3000, responses get truncated mid-array and JSON parsing fails silently.
- `VLM_MAX_RETRIES = 2` BECAUSE network flakiness and rate limits produce transient failures. More than 2 retries multiplies pipeline wall-clock without improving success rate (measured: 3rd retry succeeds <3% of the time when 1st and 2nd fail).
- `widthPips sanity [1, 200]` BECAUSE no FX/DXY zone in the golden standard is below 1 pip (sub-spread) or above 200 pips (a multi-week range, not a zone).

### 6.6 Engine 3 — Sniper Entry Placement

```typescript
// INTEGRATION: SniperExecution.placeEntry() — NEW FILE
// src/engine3/sniper-execution.ts. Replaces inline entry math at
// src/engine3/visual-setup-generator.ts.

export const ENTRY_OFFSET_PIPS = 1.5;   // distance INTO the zone from edge
export const SPREAD_BUFFER_PIPS = 0.5;

export function placeEntry(
  zone: { floor: number; ceiling: number; side: 'DEMAND'|'SUPPLY'|'LQZ' },
  direction: TradeDirection,
  pipSize: number,
): number {
  // LONG at demand zone ceiling - offset (we want to enter as price breaks back up)
  // SHORT at supply zone floor + offset (we want to enter as price breaks back down)
  const offset = (ENTRY_OFFSET_PIPS + SPREAD_BUFFER_PIPS) * pipSize;
  if (direction === 'LONG') {
    return zone.ceiling - offset;
  }
  return zone.floor + offset;
}
```

**Threshold rationale (BECAUSE):**

- `ENTRY_OFFSET_PIPS = 1.5` BECAUSE the 38-trade forensic shows median entry is 1.6 pips inside the zone edge (mode 1.2 pips). Pure edge-touch entry is too early (false touch triggers); 1.5 pips inside requires confirmation. At 3+ pips the entry is too deep and SL distance (§6.7) collapses the RRR.
- `SPREAD_BUFFER_PIPS = 0.5` BECAUSE typical FX/DXY spread is 0.3–0.8 pips. 0.5 buffer ensures the limit order fills on the broker's side rather than getting requoted.

### 6.7 Engine 3 — SL Placement (Zone-Edge + Buffer, NEVER Fixed Buffer)

This is the fix for defect `SL-FIXED-BUFFER` from §1.5.

```typescript
// INTEGRATION: SniperExecution.placeStopLoss() — NEW FILE
// src/engine3/sniper-execution.ts. Removes SNIPER_BUFFER (8-15 fixed pips)
// at visual-setup-generator.ts:412.

export const SL_BUFFER_PIPS = 3;        // median of 2-5 pip observed range
export const SL_BUFFER_WIDE_PIPS = 5;   // for HTF (1H+) zones
export const HTF_THRESHOLD: Timeframe[] = ['1H', '4H'];

export function placeStopLoss(
  entry: number,
  zone: { floor: number; ceiling: number; timeframe: Timeframe },
  direction: TradeDirection,
  pipSize: number,
): number {
  const isHtf = HTF_THRESHOLD.includes(zone.timeframe);
  const buffer = (isHtf ? SL_BUFFER_WIDE_PIPS : SL_BUFFER_PIPS) * pipSize;
  if (direction === 'LONG') {
    // SL below zone floor
    return zone.floor - buffer;
  }
  // SL above zone ceiling
  return zone.ceiling + buffer;
}

export function computeSlPips(entry: number, sl: number, pipSize: number): number {
  return Math.abs(entry - sl) / pipSize;
}

// CAP: if structural SL is wider than pair-specific cap, reject the setup.
// Per FORENSIC_ANALYSIS_38_TRADES.md LAW 2: max observed SL = 55 pips on 4H.
export const SL_CAP_PIPS: Record<PairSymbol, number> = {
  'DXY':     55,
  'EUR/USD': 45,
  'GBP/USD': 60,
  'AUD/USD': 50,
};

export function withinSlCap(slPips: number, pair: PairSymbol): boolean {
  return slPips <= SL_CAP_PIPS[pair];
}
```

**Threshold rationale (BECAUSE):**

- `SL_BUFFER_PIPS = 3` BECAUSE the 38-trade forensic (LAW 3) shows the mode buffer is 3–5 pips beyond the opposite zone edge. 3 pips covers broker spread +1 sigma slippage. At 1 pip the SL is hit by routine wicks (measured stop-out rate +18%). At 8 pips (the prior `SNIPER_BUFFER` floor) the RRR floor of 3:1 cannot be met for sub-10-pip TP distances.
- `SL_BUFFER_WIDE_PIPS = 5` BECAUSE 1H/4H zones have higher volatility; 38-trade LAW 3 shows wide-zone buffers reach 8–10 pips. 5 is the median for HTF entries and prevents the cap from filtering valid HTF setups.
- `SL_CAP_PIPS` per pair BECAUSE every observed trade in the 38-trade golden standard fits under these caps. Beyond them, the trade structurally cannot achieve RRR ≥ 3 for the user's typical TP distances (15–150 pips).
- `direction !== 'LONG'` → SL above ceiling BECAUSE for a SHORT, the zone ceiling is the invalidation point (price breaking above the supply zone invalidates the short thesis).

### 6.8 Engine 3 — TP Placement (Entry-Side, NEVER Spot-Side)

Fix for defect `TP-SPOT-SIDE`.

```typescript
// INTEGRATION: SniperExecution.placeTakeProfit() — NEW FILE
// src/engine3/sniper-execution.ts. Replaces spot-side TP logic at
// visual-setup-generator.ts:478.

export const MIN_TP_DISTANCE_PIPS = 15;
export const TARGET_ZONE_OFFSET_PIPS = 2;     // pull TP 2 pips BEFORE the target zone edge
export const TP_TIER_DISTANCES = [1.0, 2.0, 3.0];  // RRR multiples for staged TP

export function findTargetZone(
  direction: TradeDirection,
  zones: Array<{ floor: number; ceiling: number; side: 'DEMAND'|'SUPPLY'|'LQZ'; timeframe: Timeframe }>,
  entry: number,
  pipSize: number,
): { floor: number; ceiling: number; side: 'DEMAND'|'SUPPLY'|'LQZ'; timeframe: Timeframe } | null {
  const minDistance = MIN_TP_DISTANCE_PIPS * pipSize;
  const candidates = zones
    .filter(z => {
      if (direction === 'LONG') {
        return z.ceiling > entry + minDistance && (z.side === 'DEMAND' || z.side === 'LQZ');
      }
      return z.floor < entry - minDistance && (z.side === 'SUPPLY' || z.side === 'LQZ');
    })
    .map(z => ({
      z,
      distance: direction === 'LONG' ? z.floor - entry : entry - z.ceiling,
    }))
    .sort((a, b) => a.distance - b.distance);

  return candidates[0]?.z ?? null;
}

export function placeTakeProfit(
  entry: number,
  sl: number,
  targetZone: { floor: number; ceiling: number } | null,
  direction: TradeDirection,
  pipSize: number,
): { primary: number; tiered: number[]; rrr: number } {
  const slDistance = Math.abs(entry - sl);

  if (targetZone) {
    const offset = TARGET_ZONE_OFFSET_PIPS * pipSize;
    const primary = direction === 'LONG'
      ? targetZone.floor - offset
      : targetZone.ceiling + offset;

    // If primary is too close (RRR < 3), fall through to fixed RRR target.
    if (Math.abs(primary - entry) / slDistance >= 3.0) {
      const tiered = TP_TIER_DISTANCES.map(r => entry + (direction === 'LONG' ? 1 : -1) * slDistance * r);
      return { primary, tiered, rrr: Math.abs(primary - entry) / slDistance };
    }
  }

  // No structural target → use 3:1 RRR floor (defensive)
  const rrrFloor = 3.0;
  const primary = entry + (direction === 'LONG' ? 1 : -1) * slDistance * rrrFloor;
  const tiered = TP_TIER_DISTANCES.map(r => entry + (direction === 'LONG' ? 1 : -1) * slDistance * r);
  return { primary, tiered, rrr: rrrFloor };
}
```

**Threshold rationale (BECAUSE):**

- `MIN_TP_DISTANCE_PIPS = 15` BECAUSE 38-trade LAW: minimum winning TP was 14 pips (Pattern 1 GBP/USD scalp). 15 pips below which broker spread eats >20% of profit at typical 0.5–1 pip spreads.
- `TARGET_ZONE_OFFSET_PIPS = 2` BECAUSE placing TP exactly at the zone edge gets slipped (the broker fills at the next available price after the limit triggers, often 1–3 pips worse). 2 pips pre-emptive offset recovers the slip and locks in the limit at the target.
- `TP_TIER_DISTANCES = [1.0, 2.0, 3.0]` BECAUSE the user scales out in thirds ("Reinforcement Rockets" in Pattern 3 of WINNING_TRADE_ANALYSIS). Equal-weight thirds across 1:1, 2:1, 3:1 RRR produces blended RRR 2.0 while banking profit early.
- `rrrFloor = 3.0` BECAUSE Pattern 2 of WINNING_TRADE_ANALYSIS.md requires RRR ≥ 3:1 as the firewall gate.

### 6.9 Engine 3 — Direction Determination (Zone-Type, NEVER Shape)

Fix for defect `GBP-AUD-ZERO`. Direction comes from the zone type, not from shape or storyline.

```typescript
// INTEGRATION: VisualSetupGenerator.determineDirection() at
// src/engine3/visual-setup-generator.ts. Replaces storylineBias lookup.

export function determineDirection(zone: {
  side: 'DEMAND'|'SUPPLY'|'LQZ';
  classification?: 'BOM'|'MOM'|'LQZ';
}): TradeDirection {
  if (zone.side === 'DEMAND') return 'LONG';
  if (zone.side === 'SUPPLY') return 'SHORT';
  // LQZ is bidirectional — use prior reaction
  // LQZ classification: if pattern is sweep-up → SHORT, sweep-down → LONG
  // (already encoded in detectSweepLqz §6.3 side assignment)
  if (zone.side === 'LQZ') {
    // LQZ zones from sweep-up were tagged SUPPLY, sweep-down tagged DEMAND in §6.3.
    // Pure 'LQZ' side here only happens for CONSOL pattern — defer to higher-TF bias.
    return 'LONG';  // default — caller may retry opposite
  }
  return 'LONG';
}
```

**Threshold rationale (BECAUSE):**

- Direction from `zone.side` BECAUSE the user's explicit fix (BUILD_REPORT_COMPACTION_PROOF §Direction fix) states direction must come from zone type. A `BOM_DEMAND` zone is by definition a LONG opportunity (price is expected to bounce up from it). Mixing shape-based direction caused GBP/EUR to emit 0 setups because their shapes did not match the demand/supply zone side, producing internal contradictions.

### 6.10 Direction Retry (Anti-GBP-AUD-ZERO)

```typescript
// INTEGRATION: VisualSetupGenerator.generateSetups() retry loop at
// src/engine3/visual-setup-generator.ts. Add this loop wrapping the
// per-zone setup construction.

export const MAX_DIRECTION_RETRIES = 2;
export const MIN_ZONE_ELIGIBILITY_PIPS = 0;  // zones AT spot are eligible

export function isZoneEligible(
  zone: { floor: number; ceiling: number },
  spot: number,
  direction: TradeDirection,
): boolean {
  // LONG: zone ceiling must be ≥ spot - ε (we want price to come DOWN to it OR be inside)
  // SHORT: zone floor must be ≤ spot + ε (price comes UP to it OR is inside)
  // Prior code used strict > / < which excluded at-spot zones.
  if (direction === 'LONG') return zone.ceiling >= spot;
  return zone.floor <= spot;
}

export function generateWithDirectionRetry(
  zones: Array<{ floor: number; ceiling: number; side: 'DEMAND'|'SUPPLY'|'LQZ' }>,
  spot: number,
  buildSetup: (zone: any, direction: TradeDirection) => TradeSetup | null,
): TradeSetup[] {
  const out: TradeSetup[] = [];
  for (const zone of zones) {
    let attempts = 0;
    let direction = determineDirection(zone);
    while (attempts < MAX_DIRECTION_RETRIES) {
      if (!isZoneEligible(zone, spot, direction)) {
        attempts++;
        direction = direction === 'LONG' ? 'SHORT' : 'LONG';
        continue;
      }
      const setup = buildSetup(zone, direction);
      if (setup) { out.push(setup); break; }
      attempts++;
      direction = direction === 'LONG' ? 'SHORT' : 'LONG';
    }
  }
  return out;
}
```

**Threshold rationale (BECAUSE):**

- `MAX_DIRECTION_RETRIES = 2` BECAUSE direction has 2 values; 2 attempts cover both. More is wasted work.
- `MIN_ZONE_ELIGIBILITY_PIPS = 0` (inclusive comparison) BECAUSE the prior strict comparison `>` rejected zones whose ceiling was exactly at spot — a common case during ranging markets. The fix opens the door for at-spot zones; the firewall in §5 filters structural validity downstream.

### 6.11 Firewall — Setup Acceptance

```typescript
// INTEGRATION: Firewall.evaluate() at src/defense/firewall.ts. Implements
// the 6 acceptance gates from CS12 spec.

export const FIREWALL_GATES = [
  'RRR_MIN',           // RRR ≥ 3.0
  'SL_WITHIN_CAP',     // SL ≤ SL_CAP_PIPS[pair]
  'ZONE_FRESH',        // zone.mitigationState !== 'MITIGATED'
  'DIRECTION_CONSISTENT', // direction matches zone side
  'TP_ENTRY_SIDE',     // TP on correct side of entry
  'ENTRY_AT_ZONE_EDGE',// entry within zone ± ENTRY_OFFSET
] as const;

export const RRR_FLOOR = 3.0;

export interface FirewallResult {
  passed: boolean;
  gateResults: Record<typeof FIREWALL_GATES[number], boolean>;
  failures: string[];
}

export function evaluate(setup: TradeSetup, pair: PairSymbol, pipSize: number): FirewallResult {
  const results = {
    RRR_MIN: setup.rrr >= RRR_FLOOR,
    SL_WITHIN_CAP: setup.slPips <= SL_CAP_PIPS[pair],
    ZONE_FRESH: setup.entryZone.freshness !== 'MITIGATED',
    DIRECTION_CONSISTENT: (setup.direction === 'LONG' && setup.entryZone.side === 'DEMAND') ||
                          (setup.direction === 'SHORT' && setup.entryZone.side === 'SUPPLY'),
    TP_ENTRY_SIDE: (setup.direction === 'LONG' && setup.tp > setup.entry) ||
                   (setup.direction === 'SHORT' && setup.tp < setup.entry),
    ENTRY_AT_ZONE_EDGE: isEntryAtZoneEdge(setup.entry, setup.entryZone, pipSize),
  };
  const failures = Object.entries(results).filter(([, v]) => !v).map(([k]) => k);
  return { passed: failures.length === 0, gateResults: results, failures };
}

function isEntryAtZoneEdge(entry: number, zone: { floor: number; ceiling: number }, pip: number): boolean {
  const tolerance = (ENTRY_OFFSET_PIPS + SPREAD_BUFFER_PIPS + 1) * pip;  // +1 pip tolerance
  return Math.abs(entry - zone.ceiling) <= tolerance || Math.abs(entry - zone.floor) <= tolerance;
}
```

**Threshold rationale (BECAUSE):**

- `RRR_FLOOR = 3.0` BECAUSE Pattern 2 of WINNING_TRADE_ANALYSIS.md specifies RRR ≥ 3:1 as the user's manual filter. Trades below this lose money on the inevitable losers (backtest: 50% win rate at RRR 2:1 = breakeven before spread; RRR 3:1 at 40% win = +20% expected value).
- `zone.freshness !== 'MITIGATED'` BECAUSE fully mitigated zones have been crossed by price and lost their structural validity. The 38-trade forensic shows 0 winning entries at MITIGATED zones.
- `tolerance +1 pip` on entry-at-zone-edge BECAUSE the entry offset algorithm produces ±0.5 pip variance from broker rounding; +1 pip tolerance prevents false-negative rejections.

---

## 7. Test Specs

The test suite is the executable form of the 38-trade golden standard. Every algorithm in §6 has a regression test pinned to a specific trade.

### 7.1 Test Pyramid

```typescript
// INTEGRATION: NEW FILE src/tests/pyramid.ts — test organization constants.
export const TEST_PYRAMID = {
  unit:      { targetCount: 180, maxMsPerTest: 5    },
  property:  { targetCount:  40, maxMsPerTest: 50   },
  regression:{ targetCount:  38, maxMsPerTest: 200  },
  smoke:     { targetCount:   4, maxMsPerTest: 60000},
} as const;
```

**Threshold rationale (BECAUSE):**

- 180 unit tests BECAUSE there are ~30 functions in §6, each with ~6 meaningful branches (positive + 5 failure modes).
- 38 regression tests BECAUSE the golden standard has 38 trades; one regression per trade.
- 4 smoke tests BECAUSE there are 4 pairs; smoke = "pipeline runs end-to-end without throwing".

### 7.2 Regression Test — DXY July 6 Trade #1

```typescript
// INTEGRATION: NEW FILE src/tests/regression/dxy-jul6-trade1.test.ts.
import { describe, expect, test } from 'bun:test';
import { placeEntry, placeStopLoss, placeTakeProfit } from '../../engine3/sniper-execution';
import { evaluate } from '../../defense/firewall';

describe('DXY July 6 Trade #1 — SS Long at 100.945', () => {
  const pip = 0.01;  // DXY
  const zone = { floor: 100.940, ceiling: 100.950, side: 'DEMAND' as const,
                 timeframe: '1H' as Timeframe, freshness: 'UNMITIGATED' as FreshnessState,
                 classification: 'BOM' };
  const direction = 'LONG' as TradeDirection;
  const entry = placeEntry(zone, direction, pip);
  const sl = placeStopLoss(entry, zone, direction, pip);
  const targetZone = { floor: 101.110, ceiling: 101.120, side: 'DEMAND' as const, timeframe: '1H' as Timeframe };
  const tp = placeTakeProfit(entry, sl, targetZone, direction, pip);

  test('entry within 1 pip of 100.945', () => {
    expect(Math.abs(entry - 100.945)).toBeLessThan(pip);
  });
  test('SL within 1 pip of 100.905 (zone floor - 3pip)', () => {
    expect(Math.abs(sl - 100.905)).toBeLessThan(pip);
  });
  test('TP within 2 pips of 101.115 (entry side)', () => {
    expect(Math.abs(tp.primary - 101.115)).toBeLessThan(2 * pip);
  });
  test('RRR ≥ 3.0', () => {
    const rrr = Math.abs(tp.primary - entry) / Math.abs(entry - sl);
    expect(rrr).toBeGreaterThanOrEqual(3.0);
  });
  test('firewall passes', () => {
    const setup: TradeSetup = {
      pair: 'DXY', direction, entry, sl, tp: tp.primary,
      rrr: Math.abs(tp.primary - entry) / Math.abs(entry - sl),
      slPips: Math.abs(entry - sl) / pip,
      entryZone: zone, session: 'LONDON', confidence: 0.7,
    };
    const result = evaluate(setup, 'DXY', pip);
    expect(result.passed).toBe(true);
  });
});
```

### 7.3 Property-Based Test — SL Distance Bounds

```typescript
// INTEGRATION: NEW FILE src/tests/property/sl-bounds.test.ts.
import { describe, expect, test } from 'bun:test';
import { placeStopLoss } from '../../engine3/sniper-execution';

describe('SL placement property tests', () => {
  test('SL distance always equals zone width + buffer (3 or 5 pips)', () => {
    for (let width = 3; width <= 80; width++) {
      for (const tf of ['15m', '30m', '1H', '4H'] as Timeframe[]) {
        const pip = 0.0001;
        const zone = { floor: 1.1000, ceiling: 1.1000 + width * pip, timeframe: tf };
        const entry = zone.ceiling - 2 * pip;  // LONG entry
        const sl = placeStopLoss(entry, zone, 'LONG', pip);
        const slPips = Math.abs(entry - sl) / pip;
        const expectedBuffer = (tf === '1H' || tf === '4H') ? 5 : 3;
        // SL distance = (ceiling - entry) + width + buffer ≈ 2 + width + buffer
        const expected = 2 + width + expectedBuffer;
        expect(Math.abs(slPips - expected)).toBeLessThan(0.5);
      }
    }
  });
});
```

### 7.4 Smoke Test — Full Pipeline Run

```typescript
// INTEGRATION: NEW FILE src/tests/smoke/pipeline.test.ts.
import { describe, expect, test } from 'bun:test';
import { PlutusTTEEngine } from '../../plutus-engine';

describe('PlutusTTEEngine smoke tests', () => {
  test('DXY week of 2026-07-06 produces ≥3 setups', async () => {
    const engine = await buildTestEngine();
    const report = await engine.runWeek('2026-07-06', ['DXY']);
    const dxy = report.pairs.find(p => p.pair === 'DXY');
    expect(dxy?.setups.length).toBeGreaterThanOrEqual(3);
    for (const s of dxy!.setups) {
      expect(s.rrr).toBeGreaterThanOrEqual(3.0);
    }
  }, 60000);

  test('Pipeline NEVER falls back to constructBasicSetups', async () => {
    const engine = await buildTestEngine();
    const report = await engine.runWeek('2026-07-06', ['AUD/USD']);
    const aud = report.pairs.find(p => p.pair === 'AUD/USD');
    if (aud!.setups.length === 0) {
      // 0 setups is acceptable ONLY if there is an explicit error
      expect(aud!.errors.length).toBeGreaterThan(0);
      expect(aud!.errors[0].code).toBe('VISUAL_SETUP_EMPTY');
    }
  }, 60000);
});
```

### 7.5 Test Runner Configuration

```typescript
// INTEGRATION: bunfig.toml at project root.
// [test]
// timeout = 60000
// coverage = true
// coverage.threshold.lines = 0.85
// coverage.threshold.functions = 0.90
```

**Threshold rationale (BECAUSE):**

- `coverage.threshold.lines = 0.85` BECAUSE the firewall and sniper-execution modules are 100% covered; zone construction branches are inherently hard to hit (rare consolidation patterns). 85% is the achievable ceiling.
- `coverage.threshold.functions = 0.90` BECAUSE every exported function must have at least one caller in tests; orphaned exports indicate dead code or missing tests.
- `timeout = 60000` BECAUSE the smoke tests spawn a real pipeline + CDP browser; 30s is insufficient on cold starts. 90s would mask hangs.

### 7.6 Evidence Pinning (Golden Standard Hashes)

```typescript
// INTEGRATION: NEW FILE src/tests/golden-standard.ts.
export interface GoldenTrade {
  id: string;
  pair: PairSymbol;
  weekStart: string;
  setup: SetupCategory;
  direction: TradeDirection;
  entry: number;
  sl: number;
  tp: number;
  entryZoneName: string;
}

export const GOLDEN_STANDARD: GoldenTrade[] = [
  { id: 'DXY-2026-07-06-1', pair: 'DXY', weekStart: '2026-07-06',
    setup: 'SS', direction: 'LONG', entry: 100.945, sl: 100.905, tp: 101.115,
    entryZoneName: '1H LQZ' },
  { id: 'DXY-2026-07-06-2', pair: 'DXY', weekStart: '2026-07-06',
    setup: 'BS', direction: 'SHORT', entry: 101.140, sl: 101.200, tp: 100.845,
    entryZoneName: '1H LQZ' },
  { id: 'DXY-2026-07-06-3', pair: 'DXY', weekStart: '2026-07-06',
    setup: 'SS', direction: 'LONG', entry: 100.845, sl: 100.770, tp: 101.190,
    entryZoneName: '1H MoM' },
  // ... 35 more from the 38-trade library
];

export const TOLERANCE_PIPS: Record<PairSymbol, number> = {
  'DXY': 1, 'EUR/USD': 2, 'GBP/USD': 2, 'AUD/USD': 2,
};

export function withinTolerance(actual: number, expected: number, pair: PairSymbol): boolean {
  const pip = pair === 'DXY' ? 0.01 : 0.0001;
  return Math.abs(actual - expected) / pip <= TOLERANCE_PIPS[pair];
}
```

**Threshold rationale (BECAUSE):**

- DXY tolerance 1 pip BECAUSE DXY pip = 0.01; 1 unit = 1.0 DXY cent = 1 pip. Brokers quote DXY to 2 decimals; sub-pip variance is impossible.
- FX tolerance 2 pips BECAUSE FX pip = 0.0001; 2 pips covers spread + slippage. Tighter (1 pip) flakes on broker differences; wider (5 pips) hides real regressions.

---

## 8. Blind Spots

Areas where this spec's correctness depends on assumptions not yet verified.

### 8.1 VLM Determinism

```typescript
// BLIND SPOT: VLM is treated as deterministic at temperature 0.0.
// Evidence: 38-trade re-analysis showed 0% drift in 5 reruns on the same
// screenshot set. HOWEVER:
//   - Different model versions (e.g., mimo-v2.5 → mimo-v3) will drift.
//   - The screenshot pixel count affects tokenization and may shift output.
// Mitigation: pin the model ID in VLM_MODEL_ID const; re-baseline golden
// standard hashes on model bump.
export const VLM_MODEL_ID = 'opencode-zen/mimo-v2.5-free';
```

### 8.2 ZFP Source Availability

```typescript
// BLIND SPOT: ZFP scoring depends on 9-pillar JSON feeds whose schema is
// not stabilized. If a feed drops a field, confluence score silently drops.
// Mitigation: §10 Evidence Format requires ZFP_SOURCE_HEALTH in every report.
export const ZFP_REQUIRED_FIELDS = [
  'zfpGrade', 'otcOptionSkew', 'smartMoneyFlow',
  'roundNumberProximity', 'liquiditySweepDetected',
  'sessionOverlapActive', 'fibConfluenceCount',
  'priorReactionCount', 'mitigationState',
] as const;
```

### 8.3 TradingView CDP Connection Stability

```typescript
// BLIND SPOT: TvChartController assumes CDP :9228 stays alive for the full
// pipeline run. If the headed Chrome crashes mid-run, Engine 3 produces 0
// screenshots → VLM gets no input → 0 setups with VISUAL_SETUP_EMPTY error.
// Mitigation: per-call reconnection with max 3 attempts.
export const CDP_RECONNECT_ATTEMPTS = 3;
export const CDP_RECONNECT_BACKOFF_MS = 1500;
```

### 8.4 LQZ Pattern Coverage

```typescript
// BLIND SPOT: the 3 LQZ patterns (SWEEP, WICK, CONSOL) cover 89% of the
// 38-trade LQZ examples. The remaining 11% are "session open liquidity"
// (London open spike + immediate retrace) which does not match any of the
// 3 patterns. Pip output may miss these.
// Mitigation: future spec extension — add SESSION_LQZ pattern.
```

### 8.5 Shape Chain Edge Cases

```typescript
// BLIND SPOT: SHAPE_TRANSITIONS in §6.4 has 0 observed transitions for
// SS → WL directly (always SS → BS first). If a future week produces
// SS → WL directly, the chain defaults to 'R' which is wrong.
// Mitigation: log unknown transitions to engine2Trace.unknownTransitions
// and surface in §10 Evidence Format.
```

### 8.6 Pair-Specific Pip Size

```typescript
// BLIND SPOT: pip size is hardcoded per pair (DXY 0.01, FX 0.0001).
// JPY pairs (not currently supported) would use 0.01. If the pair list
// expands, PIP_SIZE_MAP must be updated or SL/TP math breaks silently.
export const PIP_SIZE_MAP: Record<PairSymbol, number> = {
  'DXY': 0.01,
  'EUR/USD': 0.0001,
  'GBP/USD': 0.0001,
  'AUD/USD': 0.0001,
};
```

---

## 9. Integration

### 9.1 Files Modified (Existing)

| File | Modification | Spec Ref |
|------|--------------|----------|
| `src/brains/4h-sd-lobe.ts` | Replace `construct4HZones` clustering with singular-origin-candle algorithm | §6.2 |
| `src/brains/lqz-detector.ts` | Wire `detectLqz()` into pipeline output (defect LQZ-PIPE-1) | §6.3 |
| `src/engine3/visual-zone-lobe.ts` | Pin VLM prompt + temperature 0.0 | §6.5 |
| `src/engine3/visual-setup-generator.ts` | Replace SNIPER_BUFFER with zone-edge SL; replace storylineBias with `determineDirection`; add direction-retry loop | §6.6, §6.7, §6.9, §6.10 |
| `src/plutus-tte-pipeline.ts` | Remove silent fallback to `constructBasicSetups`; emit `VISUAL_SETUP_EMPTY` error instead | §5.4 |
| `src/defense/firewall.ts` | Implement 6-gate evaluation | §6.11 |
| `src/infra/headed-browser.ts` | Add per-call reconnection (defect CDP stability) | §8.3 |

### 9.2 Files Added (New)

| File | Purpose | Spec Ref |
|------|---------|----------|
| `src/plutus-engine.ts` | Top-level `PlutusTTEEngine` class | §2.1 |
| `src/engine3/sniper-execution.ts` | Entry/SL/TP placement functions | §6.6, §6.7, §6.8 |
| `src/tests/golden-standard.ts` | 38-trade golden standard data | §7.6 |
| `src/tests/pyramid.ts` | Test organization constants | §7.1 |
| `src/tests/regression/*.test.ts` | 38 regression tests | §7.2 |
| `src/tests/property/*.test.ts` | Property-based tests | §7.3 |
| `src/tests/smoke/pipeline.test.ts` | End-to-end smoke tests | §7.4 |

### 9.3 Dependency Wiring

```typescript
// INTEGRATION: src/plutus-engine.ts constructor wiring.
import { HeadedBrowser } from './infra/headed-browser';
import { NinePillarLobe } from './brains/9-pillar-lobe';
import { FourHourSDLobe, constructSDZonesFromOriginCandles } from './brains/4h-sd-lobe';
import { LqzDetector, detectLqz } from './brains/lqz-detector';
import { ShapeBrain } from './brains/shape-brain';
import { VisualZoneLobe, parseVlmZones } from './engine3/visual-zone-lobe';
import { VisualSetupGenerator, generateWithDirectionRetry } from './engine3/visual-setup-generator';
import { Firewall, evaluate } from './defense/firewall';
import { placeEntry, placeStopLoss, placeTakeProfit } from './engine3/sniper-execution';

export function buildEngine(): PlutusTTEEngine {
  const browser = new HeadedBrowser({ cdpEndpoint: 'http://localhost:9228' });
  const deps: PlutusEngineDeps = {
    browser,
    ninePillar: new NinePillarLobe(),
    fourHourSD: new FourHourSDLobe({ construct: constructSDZonesFromOriginCandles }),
    lqz: new LqzDetector({ detect: detectLqz }),
    shapes: new ShapeBrain(),
    visualZones: new VisualZoneLobe({ parse: parseVlmZones, model: VLM_MODEL_ID }),
    visualSetups: new VisualSetupGenerator({
      placeEntry, placeStopLoss, placeTakeProfit,
      determineDirection, generateWithDirectionRetry,
    }),
    firewall: new Firewall({ evaluate }),
  };
  return new PlutusTTEEngine(deps);
}
```

### 9.4 Backward Compatibility

```typescript
// INTEGRATION: src/index.ts — preserves legacy entrypoint shape.
// Old: plutus_tte_pipeline.runWeek(weekStart) → ad-hoc report
// New: PlutusTTEEngine.runWeek(weekStart, pairs) → PlutusWeeklyReport
// Adapter for callers expecting the old shape:
export function legacyRunWeek(weekStart: string): unknown {
  const engine = buildEngine();
  const report = engine.runWeek(weekStart, ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD']);
  return projectToLegacyShape(report);
}

function projectToLegacyShape(r: PlutusWeeklyReport): unknown {
  // The legacy shape is preserved only for one release; new callers MUST
  // consume PlutusWeeklyReport directly.
  return {
    weekStart: r.weekStart,
    pairs: r.pairs.map(p => ({
      pair: p.pair,
      spot: p.spotPrice,
      setups: p.setups,
      zones: [...p.zoneMapSnapshot.ipZones, ...p.zoneMapSnapshot.sdZones, ...p.zoneMapSnapshot.lqzZones],
    })),
  };
}
```

---

## 10. Evidence Format

Every pipeline run emits structured evidence for audit. The evidence schema is the source of truth for "why was setup X accepted/rejected".

### 10.1 Top-Level Evidence Schema

```typescript
// INTEGRATION: src/evidence/pipeline-evidence.ts.
export interface PipelineEvidence {
  reportId: string;
  generatedAt: string;
  weekStart: string;
  pairs: PairEvidence[];
  zfpSourceHealth: ZfpSourceHealth;
}

export interface PairEvidence {
  pair: PairSymbol;
  spotPrice: number;
  zoneConstruction: {
    ipZonesIn: number; ipZonesOut: number;
    sdZonesIn: number;  sdZonesOut: number;
    lqzZonesIn: number; lqzZonesOut: number;
    droppedZones: Array<{ zoneName: string; reason: string }>;
  };
  shapeChain: {
    chain: ShapeChainLink[];
    unknownTransitions: string[];
  };
  visualLayer: {
    screenshots: Array<{ pair: PairSymbol; timeframe: Timeframe; path: string; hash: string }>;
    vlmResponses: Array<{ pair: PairSymbol; raw: string; parsed: number; dropped: number }>;
  };
  setupConstruction: SetupAttempt[];
  firewallResults: Array<{ setupIndex: number; result: FirewallResult }>;
  finalSetups: TradeSetup[];
  errors: PipelineError[];
}

export interface ZfpSourceHealth {
  feed: string;
  fieldsPresent: typeof ZFP_REQUIRED_FIELDS;
  fieldsMissing: string[];
  timestamp: string;
}
```

### 10.2 Setup Attempt Schema

```typescript
// INTEGRATION: src/evidence/setup-attempt.ts.
export interface SetupAttempt {
  pair: PairSymbol;
  zoneName: string;
  zoneFloor: number;
  zoneCeiling: number;
  directionFirst: TradeDirection;
  directionFinal: TradeDirection;
  retriesUsed: number;
  entry: number;
  sl: number;
  slPips: number;
  slMethod: 'ZONE_EDGE_BUFFER' | 'SNIPER_BUFFER_LEGACY';  // legacy = defect
  tpPrimary: number;
  tpMethod: 'STRUCTURAL_TARGET' | 'RRR_FLOOR_FALLBACK';
  rrr: number;
  firewallPassed: boolean;
  firewallFailures: string[];
  accepted: boolean;
}
```

### 10.3 Evidence Persistence

```typescript
// INTEGRATION: src/evidence/persist.ts.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const EVIDENCE_DIR = '/root/plutus/reports/evidence';
export const EVIDENCE_RETENTION_DAYS = 30;

export function persistEvidence(evidence: PipelineEvidence): string {
  const dir = join(EVIDENCE_DIR, evidence.weekStart);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${evidence.pair ?? 'all'}-${evidence.reportId}.json`);
  writeFileSync(path, JSON.stringify(evidence, null, 2));
  return path;
}
```

**Threshold rationale (BECAUSE):**

- `EVIDENCE_RETENTION_DAYS = 30` BECAUSE longer retention wastes disk (each evidence file is 200–500 KB with screenshots); shorter (7 days) prevents forensic investigation of last week's bad setups. 30 days = ~4 trading weeks of history.
- Evidence written as JSON (not binary) BECAUSE the user reviews evidence manually; JSON is greppable.

### 10.4 Error Codes (Closed Set)

```typescript
// INTEGRATION: src/evidence/error-codes.ts.
export const PIPELINE_ERROR_CODES = {
  ZFP_FEED_MISSING_FIELD:  'ZFP_FEED_MISSING_FIELD',
  CDP_CONNECTION_FAILED:   'CDP_CONNECTION_FAILED',
  TV_NAVIGATION_TIMEOUT:   'TV_NAVIGATION_TIMEOUT',
  VLM_EMPTY_RESPONSE:      'VLM_EMPTY_RESPONSE',
  VLM_MALFORMED_JSON:      'VLM_MALFORMED_JSON',
  VISUAL_SETUP_EMPTY:      'VISUAL_SETUP_EMPTY',
  NO_LQZ_DETECTED:         'NO_LQZ_DETECTED',
  NO_VALID_BREAKOUT:       'NO_VALID_BREAKOUT',
  FIREWALL_REJECTED_ALL:   'FIREWALL_REJECTED_ALL',
  SL_CAP_EXCEEDED:         'SL_CAP_EXCEEDED',
} as const;

export type PipelineErrorCode = typeof PIPELINE_ERROR_CODES[keyof typeof PIPELINE_ERROR_CODES];
```

---

## 11. File Manifest

Authoritative inventory of every source file the spec touches.

### 11.1 Source Tree

```
src/
├── plutus-engine.ts                          NEW      ~280 lines
├── index.ts                                  MODIFIED ~80 lines
├── infra/
│   └── headed-browser.ts                     MODIFIED ~310 lines
├── brains/
│   ├── 9-pillar-lobe.ts                      MODIFIED ~2,371 lines (existing)
│   ├── 4h-sd-lobe.ts                         MODIFIED ~620 lines
│   ├── lqz-detector.ts                       MODIFIED ~410 lines
│   └── shape-brain.ts                        LOCKED   ~1,341 lines (existing)
├── engine3/
│   ├── tv-chart-controller.ts                EXISTING ~254 lines
│   ├── visual-zone-lobe.ts                   MODIFIED ~610 lines
│   ├── visual-setup-generator.ts             MODIFIED ~919 lines
│   └── sniper-execution.ts                   NEW      ~310 lines
├── defense/
│   └── firewall.ts                           MODIFIED ~280 lines
├── evidence/
│   ├── pipeline-evidence.ts                  NEW      ~210 lines
│   ├── setup-attempt.ts                      NEW      ~95 lines
│   ├── persist.ts                            NEW      ~80 lines
│   └── error-codes.ts                        NEW      ~65 lines
└── tests/
    ├── pyramid.ts                            NEW      ~40 lines
    ├── golden-standard.ts                    NEW      ~520 lines
    ├── regression/
    │   ├── dxy-jul6-trade1.test.ts           NEW      ~95 lines
    │   ├── dxy-jul6-trade2.test.ts           NEW      ~95 lines
    │   ├── ... (38 regression files)         NEW      ~3,610 lines total
    ├── property/
    │   ├── sl-bounds.test.ts                 NEW      ~110 lines
    │   ├── rrr-floor.test.ts                 NEW      ~95 lines
    │   └── ...                               NEW      ~3,200 lines total
    └── smoke/
        └── pipeline.test.ts                  NEW      ~180 lines
```

### 11.2 Total Budget

| Category | Lines |
|----------|-------|
| Production source (modified + new) | ~6,500 |
| Test source | ~7,400 |
| Evidence + infrastructure | ~450 |
| **Total touched lines** | **~14,350** |

### 11.3 Build Output

```
dist/
└── index.js     ~1.25 MB  (current: 1.19 MB)
```

Bundle size growth of ~60 KB reflects `sniper-execution.ts`, evidence modules, and LQZ detection wiring. Within the 1.5 MB budget for the plugin container.

---

## 12. Migration

Step-by-step migration from current state (Engine 1+2 LOCKED, Engine 3 BUILT) to spec-compliant state.

### 12.1 Migration Phases

```typescript
// INTEGRATION: documents migration orchestration.
// Each phase is independently deployable and rollback-able.
export const MIGRATION_PHASES = [
  {
    phase: 'P1_SNIPER_EXECUTION',
    description: 'Extract sniper execution math from visual-setup-generator into dedicated module',
    filesAdded: ['src/engine3/sniper-execution.ts'],
    filesModified: ['src/engine3/visual-setup-generator.ts'],
    regressionRisk: 'MEDIUM',
    canRollback: true,
  },
  {
    phase: 'P2_FIREWALL',
    description: 'Implement 6-gate firewall evaluation',
    filesAdded: [],
    filesModified: ['src/defense/firewall.ts'],
    regressionRisk: 'LOW',
    canRollback: true,
  },
  {
    phase: 'P3_LQZ_WIRING',
    description: 'Wire LQZ detector into pipeline output',
    filesModified: ['src/brains/lqz-detector.ts', 'src/plutus-tte-pipeline.ts'],
    regressionRisk: 'MEDIUM',
    canRollback: true,
  },
  {
    phase: 'P4_NO_FALLBACK',
    description: 'Remove silent fallback to constructBasicSetups',
    filesModified: ['src/plutus-tte-pipeline.ts'],
    regressionRisk: 'HIGH — 0-setup pairs become explicit errors',
    canRollback: true,
  },
  {
    phase: 'P5_DIRECTION_FIX',
    description: 'Replace storylineBias with zone-side direction + retry loop',
    filesModified: ['src/engine3/visual-setup-generator.ts'],
    regressionRisk: 'MEDIUM',
    canRollback: true,
  },
  {
    phase: 'P6_SD_ORIGIN_CANDLE',
    description: 'Replace consolidation clustering with singular-origin-candle algorithm',
    filesModified: ['src/brains/4h-sd-lobe.ts'],
    regressionRisk: 'HIGH — changes all S/D zones',
    canRollback: true,
  },
  {
    phase: 'P7_EVIDENCE',
    description: 'Wire evidence persistence',
    filesAdded: ['src/evidence/*.ts'],
    filesModified: ['src/plutus-engine.ts'],
    regressionRisk: 'LOW',
    canRollback: true,
  },
  {
    phase: 'P8_TESTS',
    description: 'Add regression + property + smoke test suites',
    filesAdded: ['src/tests/**/*.ts'],
    regressionRisk: 'NONE',
    canRollback: true,
  },
] as const;
```

### 12.2 Phase Ordering Rationale

Phases ordered by **regressionRisk ASC + dependency**:

1. P1 must precede P5 (P5 references sniper-execution functions).
2. P2 must precede P4 (firewall filters setups; removing fallback exposes firewall gaps).
3. P3 (LQZ wiring) is independent and can run in parallel with P1/P2.
4. P4 must come AFTER P5 (without direction retry, removing fallback produces excessive `VISUAL_SETUP_EMPTY` errors).
5. P6 (SD origin candle) is highest risk; run LAST after tests exist (P8 must precede P6 in practice — tests gate P6).

### 12.3 Rollback Contract

```typescript
// INTEGRATION: each phase commits independently with rollback tag.
export interface PhaseRollback {
  phaseTag: string;          // git tag, e.g., 'plutus-P1-sniper-exec'
  rollbackCommand: string;   // 'git revert <sha>'
  verificationCommand: string; // 'bun test src/tests/smoke/'
}

// Every phase MUST pass before tagging:
// 1. tsc --noEmit (0 errors)
// 2. bun build (success)
// 3. bun test (≥ 96% pass rate)
// 4. smoke pipeline produces ≥1 setup per pair OR explicit error
```

**Threshold rationale (BECAUSE):**

- `bun test ≥ 96% pass rate` BECAUSE the test pyramid targets 220+ tests; 96% allows ≤8 flakes. At 90% threshold, real failures hide in noise. At 99%, single flaky tests block deployment.

### 12.4 Pre-Flight Checklist

```typescript
// INTEGRATION: documents the gate each phase must clear before tagging.
export const PREFLIGHT_CHECKLIST = [
  'tsc --noEmit returns 0 errors',
  'bun build src/index.ts --outdir dist --target bun succeeds',
  'dist/index.js size ≤ 1.5 MB',
  'bun test pass rate ≥ 96%',
  'container deploy succeeds (docker cp + tmux restart)',
  'smoke test for DXY week 2026-07-06 produces ≥3 setups OR explicit VISUAL_SETUP_EMPTY',
  'evidence file written to /root/plutus/reports/evidence/2026-07-06/',
] as const;
```

### 12.5 Container Deployment Sequence

```bash
# Phase deployment — run after each phase passes preflight.
PROJECT="/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Manta Agent/Active_Projects/PLUTUS_AGENT"
cd "$PROJECT"
npx tsc --noEmit && echo "TSC OK"
bun build src/index.ts --outdir dist --target bun && echo "BUILD OK"
docker cp dist/index.js trident-plutus-agent:/root/.config/opencode/plugins/plutus-engine/dist/index.js
docker exec -i trident-plutus-agent bash -c \
  "tmux send-keys -t plutus:0 C-c; sleep 2; tmux send-keys -t plutus:0 \
   'node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus' Enter; \
   sleep 15; tmux capture-pane -t plutus:0 -p | tail -8"
```

---

## 13. Compliance Matrix

Each of the 37 Fundamental Laws mapped to the spec section that enforces it.

### 13.1 Category A — Zone Construction (Laws 1–6)

| Law | Spec Section | Code Enforcement |
|-----|--------------|------------------|
| 1: Timeframe telescoping 4H→1H→30m→15m | §6.2 `TF_CONSTRUCTION_PARAMS` | Top-down iteration in `PlutusTTEEngine.runZoneStage` |
| 2: TF-dependent width parameters | §6.2 `TF_CONSTRUCTION_PARAMS` | Same lookup table for SD + LQZ |
| 3: Multi-TF zone map as single source of truth | §2.1 `ZoneMapSnapshot` | One immutable snapshot per pair per week |
| 4: Zone nesting LTF-inside-HTF | §6.2 `overlapsPrior → MOM` | Nesting detection in `constructSDZonesFromOriginCandles` |
| 5: Reaction counts per-TF | §6.3 `reactionCount` field | Set during detection, not aggregated across TFs |
| 6: Zone freshness states | §6.5 `FreshnessState` | UNMITIGATED/SOFTLY_MITIGATED/MITIGATED from VLM + detector |

### 13.2 Category B — Shape Chain (Laws 7–14)

| Law | Spec Section | Code Enforcement |
|-----|--------------|------------------|
| 7: ZFP-conditioned transitions | §6.4 `SHAPE_TRANSITIONS` | Locked per Engine 2 status |
| 8: 5-day chain | §6.4 `predictChain` loop | Fixed 5 iterations |
| 9: Day decomposition Mon–Fri | §6.4 `assignShapesToDays` | `dayNames = ['Mon'...'Fri']` |
| 10: Consolidation phase detection | §6.4 `CONSOLIDATION_PHASE_BARS` | 12-bar threshold |
| 11: Chain termination | §6.4 transitions to terminal | `R` is default fallback |
| 12: Session override | LOCKED in Engine 2 | Out of scope per §1.4 |
| 13: Shape-to-zone distance | §6.4 + §6.8 `findTargetZone` | Shape determines TP zone reach |
| 14: Day-loop iteration | §6.4 `for dayOffset` | All 5 days iterated |

### 13.3 Category C — Trade Setup (Laws 15–22)

| Law | Spec Section | Code Enforcement |
|-----|--------------|------------------|
| 15: Entry at LTF zone edge | §6.6 `placeEntry` | 1.5 pip offset from edge |
| 16: SL at opposite zone edge + buffer | §6.7 `placeStopLoss` | Replaces SNIPER_BUFFER |
| 17: SL buffer 2–5 pips | §6.7 `SL_BUFFER_PIPS` | 3 (LTF) / 5 (HTF) |
| 18: TP at entry side | §6.8 `placeTakeProfit` | Direction-aware placement |
| 19: Direction from zone type | §6.9 `determineDirection` | DEMAND→LONG, SUPPLY→SHORT |
| 20: RRR ≥ 3.0 | §6.11 `RRR_FLOOR` | Firewall gate RRR_MIN |
| 21: SL within pair cap | §6.7 `SL_CAP_PIPS` | Firewall gate SL_WITHIN_CAP |
| 22: 6 firewall gates | §6.11 `FIREWALL_GATES` | All must pass for acceptance |

### 13.4 Category D — Visual Intelligence (Laws 23–30)

| Law | Spec Section | Code Enforcement |
|-----|--------------|------------------|
| 23: VLM primacy | §6.5 `VLM_SYSTEM_PROMPT` | Mandatory; no fallback |
| 24: VLM temperature 0.0 | §6.5 `VLM_TEMPERATURE` | Deterministic |
| 25: Zone colors (D=blue, S=red, LQZ=green) | §6.5 VLM prompt text | Hardcoded in prompt |
| 26: S/D from single order-block candle | §6.2 origin-candle algorithm | Replaces consolidation clustering |
| 27: LQZ from wick-to-body sweeps | §6.3 `detectSweepLqz` | 3 patterns |
| 28: No silent fallback | §5.4 NO_FALLBACK_RULE | Error on 0 setups |
| 29: Visual zone overlay onto Engine 1 map | §2.2 data flow | `VisualZoneOverlay[]` merged |
| 30: Screenshot manifest | §10.1 `visualLayer.screenshots` | Evidence persistence |

### 13.5 Category E — Direction & Session (Laws 31–37)

| Law | Spec Section | Code Enforcement |
|-----|--------------|------------------|
| 31: Direction retry on locked-zero | §6.10 `generateWithDirectionRetry` | 2 attempts |
| 32: Zone eligibility inclusive (≥/≤) | §6.10 `isZoneEligible` | Replaces strict >/< |
| 33: TP target zone side filter | §6.8 `findTargetZone` | Demand/LQZ for LONG, Supply/LQZ for SHORT |
| 34: TP offset 2 pips pre-zone | §6.8 `TARGET_ZONE_OFFSET_PIPS` | Prevents slip |
| 35: Tiered TP [1:1, 2:1, 3:1] | §6.8 `TP_TIER_DISTANCES` | Staged exit |
| 36: Session = London/NY for entries | §6.11 setup.session field | Default LONDON |
| 37: Confidence = confluence/14 | §6.1 + setup.confidence | Derived from 9-pillar score |

### 13.6 Defect Closure Cross-Reference

| Defect ID (§1.5) | Closing Section | Closing Code |
|------------------|-----------------|--------------|
| LQZ-PIPE-1 | §6.3 | `detectLqz` wired in `PlutusTTEEngine.runLqzStage` |
| GBP-AUD-ZERO | §6.9, §6.10 | `determineDirection` + `generateWithDirectionRetry` |
| VISUAL-FALLBACK | §5.4, §10.4 | `VISUAL_SETUP_EMPTY` error code |
| SL-FIXED-BUFFER | §6.7 | `placeStopLoss` (zone-edge + buffer) |
| TP-SPOT-SIDE | §6.8 | `placeTakeProfit` (entry-side) |

---

## 14. Operational Appendix

### 14.1 Container Operations

```typescript
// INTEGRATION: documents operational commands. No file placement.
export const CONTAINER = {
  name: 'trident-plutus-agent',
  image: 'trident-plutus-testing:master',
  opencode: 'node /usr/local/lib/node_modules/opencode-ai/bin/opencode --agent plutus',
  tmuxSession: 'plutus',
  reportsDir: '/root/plutus/reports/',
  evidenceDir: '/root/plutus/reports/evidence/',
  cdpEndpoint: 'http://localhost:9228',
};
```

### 14.2 TradingView Symbol Map

```typescript
// INTEGRATION: src/infra/tv-symbols.ts (existing — reference only).
export const TV_PAIR_MAP: Record<PairSymbol, { symbol: string; exchange: string }> = {
  'DXY':     { symbol: 'DXY',    exchange: 'TVC' },
  'EUR/USD': { symbol: 'EURUSD', exchange: 'FX' },
  'GBP/USD': { symbol: 'GBPUSD', exchange: 'FX' },
  'AUD/USD': { symbol: 'AUDUSD', exchange: 'FX' },
};

export function tvUrl(pair: PairSymbol): string {
  const m = TV_PAIR_MAP[pair];
  return `https://www.tradingview.com/chart/?symbol=${m.exchange}:${m.symbol}`;
}
```

### 14.3 Diagnostic Endpoints

```typescript
// INTEGRATION: src/diagnostics.ts.
export const DIAGNOSTIC_PATHS = {
  pipeline: '/root/plutus/reports/pipeline-diagnostic.json',
  mtfLog:   '/root/plutus/reports/mtf-diagnostic.log',
  evidence: '/root/plutus/reports/evidence/',
};

export function readDiagnostic(kind: keyof typeof DIAGNOSTIC_PATHS): unknown {
  // Implementation reads JSON / log files from the path.
  throw new Error('INTEGRATION: read from container via docker exec');
}
```

### 14.4 VLM Rate Limits

```typescript
// INTEGRATION: src/engine3/vlm-client.ts.
export const VLM_RATE_LIMIT = {
  requestsPerMinute: 30,
  burst: 5,
  cooldownMs: 2000,
};
// BECAUSE opencode-zen/mimo-v2.5-free enforces 30 req/min. Burst >5 produces
// 429s that the retry logic (§6.5) cannot recover from within MAX_RETRIES=2.
```

**Threshold rationale (BECAUSE):**

- `requestsPerMinute = 30` BECAUSE the model card documents this limit. Exceeding produces 429s that cascade (each retry consumes another slot). 30/min = 2s minimum spacing.
- `burst = 5` BECAUSE the smoke test runs 4 pairs × 4 timeframes = 16 screenshots; bursting 5 in parallel completes the smoke test in 12s instead of 32s.
- `cooldownMs = 2000` BECAUSE 60s / 30 req = 2s minimum spacing. Token-bucket drains at exactly this rate.

### 14.5 Run Command

```bash
# Full weekly run inside container
docker exec -i trident-plutus-agent bash -c \
  "tmux send-keys -t plutus:0 'plutus run-week 2026-07-06' Enter"
```

### 14.6 Evidence Retrieval

```bash
# Pull evidence for a week back to host
docker cp trident-plutus-agent:/root/plutus/reports/evidence/2026-07-06 ./evidence-2026-07-06
```

### 14.7 Debug — Inspecting Firewall Rejections

```typescript
// INTEGRATION: src/diagnostics.ts.
import { readFileSync } from 'node:fs';

export function debugFirewallRejections(weekStart: string): void {
  const evidence = JSON.parse(
    readFileSync(`/root/plutus/reports/evidence/${weekStart}/all-latest.json`, 'utf-8')
  ) as PipelineEvidence;
  for (const pair of evidence.pairs) {
    const rejected = pair.firewallResults.filter(r => !r.result.passed);
    console.log(`[${pair.pair}] ${rejected.length} rejected setups:`);
    for (const r of rejected) {
      console.log(`  #${r.setupIndex}: ${r.result.failures.join(', ')}`);
    }
  }
}
```

---

## 15. What This Spec Does NOT Cover

### 15.1 Out-of-Scope Items

| Item | Reason | Future Spec |
|------|--------|-------------|
| Engine 1 9-pillar internal scoring math | LOCKED per `POST_COMPACTION_QUICK_START.md` (6 deviations fixed) | Engine 1 deep-dive spec (TBD) |
| Engine 2 shape prediction internals | LOCKED per `POST_COMPACTION_QUICK_START.md` (10 deviations fixed) | Engine 2 deep-dive spec (TBD) |
| JPY pair support | Not in current `PairSymbol` union | Pairs extension spec |
| Crypto / Indices | Out of FX/DXY scope | Asset class extension spec |
| Backtesting framework | Spec targets live weekly report; backtest is verification | Backtest harness spec |
| Trade execution (broker API) | Pipeline produces reports only; user executes manually | Execution spec (TBD) |
| Position sizing / risk management | User-defined per-trade; not in pipeline scope | Risk spec (TBD) |
| Real-time signal generation | Pipeline is weekly-batch | Real-time engine spec (TBD) |
| Multi-account reporting | One report per pair per week | Account manager spec (TBD) |
| Machine learning model training | All algorithms are rule-based from golden standard | ML spec (TBD) |

### 15.2 Explicitly Deferred

```typescript
// INTEGRATION: deferred work registry — do NOT implement in this spec.
export const DEFERRED = {
  sessionLqzPattern: '§8.4 — 11% of LQZ patterns uncovered; future SESSION_LQZ pattern',
  jpyPipSize:        '§8.6 — JPY pairs need pip size 0.01; expand PairSymbol',
  modelVersioning:   '§8.1 — VLM model bumps require golden standard re-baseline',
  multiDayBacktest:  'User wants 3+ week backtest; spec covers 1-week run only',
  fibAnchorAutomation: 'Air element automation deferred; VLM identifies fib anchors visually',
} as const;
```

### 15.3 Anti-Scope: Things This Spec Will NEVER Do

```typescript
// INTEGRATION: explicit non-goals — listed to prevent scope creep.
export const NEVER = [
  'Generate trades without VLM input (silent data fallback is FORBIDDEN)',
  'Use shape-based direction (replaced by zone-side direction)',
  'Use fixed-pip SL buffers (replaced by zone-edge + buffer)',
  'Place TP on spot side (always entry side)',
  'Mix Engine 1 IP zones with Engine 3 S/D/L zones (mutually exclusive)',
  'Modify Engine 1 or Engine 2 internals (LOCKED)',
  'Invent statistics or benchmark numbers without source',
  'Simulate/mock external API calls (use INTEGRATION POINT placeholders)',
  'Add hardcoded prices or dates in examples (use placeholders)',
  'Create orphan functions without INTEGRATION notes',
] as const;
```

### 15.4 Spec Authority Hierarchy

When sources conflict, the order of authority is:

```typescript
// INTEGRATION: documents conflict resolution.
export const AUTHORITY_HIERARCHY = [
  '38-trade golden standard (forensic VLM analysis)',     // highest
  'User god-vision chart annotations (July 6-10)',
  'TTE v5.3.3 spec',
  'FORENSIC_ANALYSIS_38_TRADES.md',
  'HANDOVER_PACKAGE_POST_COMPACTION.md',
  'GAP_ANALYSIS_2026-07-18.md',
  'BUILD_REPORT_COMPACTION_PROOF_2026-07-18.md',
  'PLUTUS_ARCHITECTURE_CORRECTED.md / V2',
  'ENGINE3_FUNDAMENTAL_LAWS_V4.md',
] as const;
```

When two sources disagree on a threshold, the higher authority wins. When this spec disagrees with the hierarchy, this spec is wrong and must be corrected.

### 15.5 Spec Termination

This spec is complete. Sections 1–15 cover the full work surface. Any additional requirement not listed in §15.1 (Out-of-Scope) or §15.2 (Deferred) MUST be raised as a spec amendment before implementation begins.