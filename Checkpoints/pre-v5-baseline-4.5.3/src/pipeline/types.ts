/**
 * PLUTUS 4.0 Pipeline Types
 *
 * All Plutus 4.0 pipeline-only types. The trading-engine types
 * (DXYZone, TradeSetup, etc.) live in src/types.ts and are re-exported
 * here for the pipeline boundary.
 *
 * INTEGRATION: NEW FILE src/pipeline/types.ts
 * Source: L2 Spec Section 3 (Data Model)
 */

// ─── Re-exports from trading engine (compatible types only) ───
export type { DXYZone, ZoneType, OHLCBar, GuardrailResult } from '../types.js';

import type { DXYZone } from '../types.js';

// ─── Pipeline-specific enum-like types ───
// These use spec string values ('HTF_SWING', 'LONG', etc.), NOT the
// core types.ts enum string values ('HTF Swing', etc.).
export type SetupCategory =
  | 'HTF_SWING'
  | 'SWING_SCALP'
  | 'BREAKOUT_SURGE'
  | 'REINFORCEMENT'
  | 'TRANSITION'
  | 'WHIPLASH';

export type TradeDirection = 'LONG' | 'SHORT';

export type SessionWindow =
  | 'LONDON_OPEN'
  | 'LONDON_MID'
  | 'NY_OVERLAP'
  | 'NY_OPEN'
  | 'NY_MID'
  | 'NY_CLOSE';

export interface TradeSetup {
  id: string;
  pair: string;
  direction: TradeDirection;
  category: SetupCategory;
  day: string;
  entries: { front: number; mid: number; back: number };
  sl: number;
  tp: number;
  rrr: number;
  confidence: number;
  session: SessionWindow;
  candleConfirmation: string;
  shape: string;
  zoneRef: string;
  source: 'VISUAL' | 'DATA-FALLBACK';
  notes?: string;
  shapeTrigger?: string;
}

export interface MacroCalendarEntry {
  timestamp: number;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Pipeline stage identifier ───

/**
 * PipelineStage4 BECAUSE every stage name must be a known literal —
 * the pipeline-errors.json audit trail and defense rules reference
 * stages by these exact strings. A typo in a stage name would silently
 * create a new audit category.
 */
export type PipelineStage4 =
  | 'plutus-pipeline-harvest'
  | 'plutus-pipeline-zones'
  | 'plutus-pipeline-shapes'
  | 'plutus-pipeline-charts'
  | 'plutus-pipeline-setups'
  | 'plutus-browse-screenshot'
  | 'plutus-backtest-setups'
  | 'manual-step-A'
  | 'manual-step-B'
  | 'manual-step-C'
  | 'manual-step-D';

// ─── Pipeline error ───

/**
 * PipelineError BECAUSE a flat error type with stage + pair + severity
 * lets pipeline-errors.json be aggregated and audited without parsing
 * stack traces. Only severity='FATAL' aborts the pipeline — non-fatal
 * errors are recorded but execution continues.
 *
 * NOTE: This PipelineError supports 'FATAL' | 'ERROR' | 'WARN' severity
 * — more flexible than the existing PipelineError in src/types.ts which
 * only has 'FATAL'. The pipeline module uses THIS version exclusively.
 */
export interface PipelineError {
  stage: PipelineStage4;
  pair: string | 'ALL';
  severity: 'FATAL' | 'ERROR' | 'WARN';
  message: string;
  context: Record<string, unknown>;
  timestamp: number;
}

// ─── Phase result ───

/**
 * PhaseResult BECAUSE every tool returns (data, errors, metadata) —
 * this triple lets the orchestrator propagate errors without ever
 * throwing inside a tool body. Throws are reserved for hook failures
 * (ManualStepMissingError) and timeout/crash wrapping.
 */
export interface PhaseResult<T> {
  data: T;
  errors: PipelineError[];
  metadata: Record<string, unknown>;
}

// ─── Snapshot types (cross-phase contracts) ───

/**
 * ZoneMapSnapshot BECAUSE the zones phase must emit ONE versioned,
 * timestamped artifact that the shapes phase and the setups phase both
 * consume. Without a snapshot boundary, the zones phase could mutate
 * zones mid-pipeline (e.g. dedupe after shape chain read) and the
 * shapes phase would see inconsistent state.
 */
export interface ZoneMapSnapshot {
  version: '4.0.0';
  timestamp: number;
  instrument: 'DXY' | 'MULTI';
  zones: DXYZone[];
  spots: Record<string, number>;
}

/**
 * ShapePredictionSnapshot (pipeline-specific) BECAUSE the pipeline's
 * shape prediction has a different structure than the legacy shape
 * snapshot. This is the 4.0 version consumed by the setups phase.
 */
export interface ShapePredictionSnapshot {
  currentShape: string;
  chain: ShapePredictionDay[];
  dayDecomposition: DayShape[];
  storylineBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  consolidationPhase: boolean | 'OPEN' | 'CONSOLIDATING' | 'BREAKING';
}

export interface DayShape {
  day: string;
  shape: string;
  bias?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface ShapePredictionDay {
  day: string;
  shape: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  predictedShape?: string;
}

// ─── Visual zone types (VLM output) ───

/**
 * VisualSDZone BECAUSE the VLM (the agent itself) emits zones that
 * differ in source provenance from the Engine 1 (data-driven) zones.
 * source='VLM_CONFIRMED' means a data-driven zone was visually
 * validated. source='VLM_NEW' means the VLM found a zone Engine 1
 * missed. source='VLM_REJECTED' means the VLM rejected a data-driven
 * zone (these are NOT included in validatedZones — they go into
 * the rejection log only).
 */
export interface VisualSDZone {
  pair: 'DXY' | 'EUR/USD' | 'GBP/USD' | 'AUD/USD';
  type: 'SUPPLY' | 'DEMAND' | 'LIQUIDITY';
  top: number;
  bottom: number;
  timeframe: '4H' | '1H' | '30m' | '15m';
  classification: 'BoM' | 'MoM' | 'BOSM' | 'UNMITIGATED';
  source: 'VLM_CONFIRMED' | 'VLM_NEW' | 'VLM_REJECTED';
  confidence: number;  // 0-100
  mappedIPZoneName?: string;
  ipZoneRef?: string;
  reactionCount: number;
  liquidityScore: number;
  /**
   * Free-text VLM evidence — the SPECIFIC candlestick pattern observed.
   * Example: "order block at 1.0850-1.0862 confirmed by bullish
   * engulfing + 3-wick rejection".
   */
  visualEvidence: string;
}

// ─── Options types (Manual Step A output) ───

export interface OptionsStrike {
  pair: string;
  strike: number;
  notional: number;
  notionalBillions: number;
  bold: boolean;
  expiry: string;  // ISO date YYYY-MM-DD
}

// ─── Screenshot artifact ───

export interface ScreenshotArtifact {
  pair: string;
  timeframe: '4H' | '1H' | '30m' | '15m';
  path: string;
  capturedAt: number;
  barsVisible: number;
}

// ─── Pipeline context (needed by defense rules and hooks) ───

/**
 * PipelineContext BECAUSE the orchestrator needs a single mutable
 * state object that flows through all 5 tools and 4 manual steps.
 * Originally defined in tools.ts per the L2 spec — moved here so
 * defense-rules.ts and hooks.ts can import it without depending on
 * tools.ts (which contains runtime implementations).
 */
export interface PipelineContext {
  weekStart: string;          // ISO Monday
  temporalAnchor: number;     // unix ms — weekStart + 4 days (Friday close)
  pairList: readonly ['DXY', 'EUR/USD', 'GBP/USD', 'AUD/USD'];
  phaseResults: Partial<Record<string, PhaseResult<unknown>>>;
  manualStepOutputs: Partial<Record<'A' | 'B' | 'C' | 'D', unknown>>;
  manualStepMissCount: Record<'A' | 'B' | 'C' | 'D', number>;
  errors: PipelineError[];
  screenshots: ScreenshotArtifact[];
  validatedZones: VisualSDZone[];
  startedAt: number;
}

// ─── Hook descriptor (re-exported for tool authors) ───
export type { ManualStepDescriptor, ManualStepPush } from './hooks.js';
