/**
 * Plutus TS — Core Type Definitions
 *
 * All types are strongly-typed per Trident Engineering Bible P2 (Type Certainty).
 * Every type is exported individually so consumers can import only what they need.
 */

import {
  TV_MCD_CDP_PORT,
  BRAIN_TICK_MS,
  ZONE_BRAIN_TICK_MS,
  SHAPE_BRAIN_TICK_MS,
  TRADE_BRAIN_TICK_MS,
  SYSTEM_BRAIN_TICK_MS,
  GATE_TIMEOUT_ANALYZE_MS,
  GATE_TIMEOUT_VERIFY_ZONES_MS,
  GATE_TIMEOUT_PREDICT_MS,
  GATE_TIMEOUT_SCORE_MS,
  GATE_TIMEOUT_VALIDATE_MS,
  GATE_TIMEOUT_EXECUTE_MS,
  GATE_TIMEOUT_AUDIT_MS,
  GATE_TIMEOUT_TIMEOUT_MS,
  TIMESFM_MAX_CONTEXT,
  MAX_ACCOUNT_RISK_PCT,
  SL_CAP_PIPS,
  PIP_VALUE_DXY,
  PIP_VALUE_FX_4DEC,
} from './constants/trading-constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum ShapeCode {
  BS = 'BS',       // Breakout Surge
  WL = 'WL',       // Whiplash
  R = 'R',         // Reversal
  SS = 'SS',       // Swing Scalps (range trade from zone edge to opposing zone edge) — ONLY acceptable meaning (AP22)
  WLS = 'WLS',     // Wide Range Swing
  DWL = 'DWL',     // Dead Whales
  RWL = 'RWL',     // Reverse Whiplash
  PBS = 'PBS',     // Piercing Breakout Surge
  STORM = 'STORM', // SS + delayed whiplash
  // ── Shape Variants (TTE v5.3.3 §6.1.3-6.1.4) ──
  PWL = 'PWL',     // Piercing Whiplash — WL that pierces multiple zones before rejecting
  PRWL = 'PRWL',   // Piercing Reverse Whiplash — RWL with piercing characteristics
  RS = 'RS',       // Recovery Surge — sharp directional recovery from deep pullback
}

export enum DXYRegime {
  RISK_ON = 'risk_on',
  RISK_OFF = 'risk_off',
  TRANSITION = 'transition',
  CHOP = 'chop',
}

export enum TradeDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
  NEUTRAL = 'NEUTRAL',
}

export enum ZoneType {
  BOM_SUPPLY = 'BoM Supply',
  BOM_DEMAND = 'BoM Demand',
  MOM_SUPPLY = 'MoM Supply',
  MOM_DEMAND = 'MoM Demand',
  LSZ_SUPPLY = 'LSZ Supply',
  LSZ_DEMAND = 'LSZ Demand',
  IP_SUPPLY = 'IP Supply',
  IP_DEMAND = 'IP Demand',
}

export enum SetupCategory {
  HTF_SWING = 'HTF Swing',
  SWING_SCALP = 'Swing Scalp',
  BREAKOUT_SURGE = 'Breakout Surge',
  REINFORCEMENT = 'Reinforcement',
  TRANSITION = 'Transition',
  WHIPLASH = 'Whiplash',
  // NOTE (V4.3): 'REVERSAL' is a canonical string-key category (constants maps,
  // rrrForCategory) but deliberately NOT an enum member yet — adding it breaks
  // exhaustive Record<SetupCategory, …> records in rrr-rules.ts / setups-tool.ts
  // until RRR_BY_CATEGORY gains a REVERSAL entry (Phase 4 decision).
}

export enum ConfidenceTier {
  S = 'S',    // 90-100
  A = 'A',    // 80-89
  B = 'B',    // 70-79
  C = 'C',    // 60-69
  D = 'D',    // 50-59
  F = 'F',    // <50
}

/** Engine 3 v8 — setup quality classification after confidence scoring. */
export enum SetupQuality {
  GOD_TIER = 'GOD_TIER',
  HIGH = 'HIGH',
  STANDARD = 'STANDARD',
  CONDITIONAL = 'CONDITIONAL',
  REJECTED = 'REJECTED',
}

export enum SessionWindow {
  LONDON_OPEN = 'London Open 02:00-05:00 ET',
  LONDON_MID = 'London Mid 05:00-08:00 ET',
  NY_OVERLAP = 'NY Overlap 08:00-10:00 ET',
  NY_OPEN = 'NY Open 08:30-10:00 ET',
  NY_MID = 'NY Mid 10:00-14:00 ET',
  NY_CLOSE = 'NY Close 14:00-17:00 ET',
}

export enum GateState {
  ANALYZE = 'analyze',
  VERIFY_ZONES = 'verify_zones',
  PREDICT = 'predict',
  SCORE = 'score',
  VALIDATE = 'validate',
  EXECUTE = 'execute',
  AUDIT = 'audit',
  TIMEOUT = 'timeout',
}

export enum BrainChannel {
  ZONE_MAPPED = 'zone:mapped',
  SHAPE_PREDICTED = 'shape:predicted',
  SETUP_READY = 'setup:ready',
  VLM_FRAME_READY = 'vlm:frame_ready',
  TRADE_EXECUTED = 'trade:executed',
  AUDIT_COMPLETE = 'audit:complete',
  GATE_TRANSITION = 'gate:transition',
  SYSTEM_EVENT = 'system:event',
  ERROR = 'error',
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DATA STRUCTURES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OHLCBar {
  timestamp: number;  // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PriceLevel {
  price: number;
  source: string;
  confidence: number;
}

/**
 * Step 0.6: Intra-Zone Key Level — a micro-level structure within an IP zone.
 * These levels refine entry precision and SL placement inside zones.
 *
 * Type breakdown:
 *   - '1h_demand' / '1h_supply': 1H demand/supply zones within the 4H zone bounds
 *   - 'fib_382' / 'fib_500' / 'fib_618': Fibonacci retracements of the zone range
 *   - 'prior_close': Prior session closes (daily/weekly) inside the zone
 *   - 'round_number': Big figure / half figure / quarter figure inside the zone
 */
export interface IntraZoneLevel {
  price: number;
  type: '1h_demand' | '1h_supply' | 'fib_382' | 'fib_500' | 'fib_618' | 'prior_close' | 'round_number';
  strength: number; // 0-1 (Structural dimension score = 0.5 per spec Step 0.6d)
  /** Position within zone: bottom 40% = floor, top 40% = ceiling, middle 20% = mid-anchor */
  position?: 'precision_floor' | 'precision_ceiling' | 'mid_anchor';
  /** Human-readable data source for the level (e.g. "Fib 0.618", "Prior close [date]", "Round number") */
  source?: string;
}

export interface DXYZone {
  id: string;
  /** Timeframe this zone represents (e.g. '4H', '1H', '30m', '15m'). Defaults to 4H in current codebase. */
  timeframe?: string;
  floor: number;
  ceiling: number;
  type: ZoneType;
  isBoM: boolean;
  reactionCount: number;
  reactionStatus?: 'virgin' | 'active' | 'depleted';
  confluence: number;
  pillars: number[];      // 9-pillar scores
  zfp: number;            // Zone Failure Probability 0-100
  createdAt: number;
  lastTested: number | null;
  // 4H MoM one-and-done metadata (populated by BoM/MoM lobe)
  momStatus?: string;
  isOneAndDone?: boolean;
  // Elemental density classification (populated by elemental-lobe)
  elementalDensity?: ElementalDensity;
  // Step 0.6: Intra-zone key levels (populated by intra-zone-scanner)
  intraLevels?: IntraZoneLevel[];
  // Engine 3 v8 enrichment fields (populated by pipeline enrichment step)
  /** Zone display name (human-readable, e.g. 'R1', 'D1', 'EQ'). */
  zoneName?: string;
  /** Key levels within the zone (intra-zone + option strikes + pivots). */
  keyLevels?: number[];
  /** Structural role in institutional move: "BoM" (Beginning of Move) or "MoM" (Middle of Move). E1-2: NOT S/D execution classification — that is Engine 3's job. */
  sdType?: string;
  /** Refined multi-TF label, e.g. "15m Refined 1H" when zone validated on 2+ TFs. */
  refinedLabel?: string;
  /** Liquidity score 0-10 estimating resting orders behind the zone. */
  liquidityScore?: number;
  /** Defense status from prior week analysis. */
  defenseStatus?: 'UNTESTED' | 'DEFENDED' | 'BROKEN';
  /** Freshness tag: "0X" (unmitigated), "1S" (1 reaction), "2X" (2), "3X+" (3+). */
  sdFresh?: string;
  /** Overlap descriptor: "none", "partial", "full" — co-location with another S/D zone. */
  sdOverlap?: string;
  /** Whether the zone formed during a consolidation phase. */
  formedAfterConsolidation?: boolean;
  /** Engine 3 processing status: 'enriched', 'ENTRY-PRIMARY', 'ENTRY-CONDITIONAL', etc. */
  engine3Status?: string;
  /** Total options notional (billions) for strikes within this zone. */
  notionalB?: number;
  /** ZR-7C — THE E2ZONEINPUT CONTRACT (the ZR-7 OVERHAUL SPEC Part 8.1): the
   *  FULL E1 pressure state crosses the E2 boundary — "Engine 2 consumes the
   *  COMPLETE Engine 1 output. Every field matters" (Bible 4.0 §4.18). The
   *  toDxyZone boundary (report-v452.ts) maps the ZoneModel.pressure here;
   *  the E2's designation (projectZoneForDay's pressure-aware selection)
   *  reads it — the zfp is ONE input among many, never the sole sort key. */
  pressure?: {
    lifecycle: 'VIRGIN' | 'ACTIVE_1' | 'ACTIVE_2' | 'DEPLETED' | 'FORTRESS' | 'BROKEN' | 'CONFLUENCE';
    mitigationCount: number;
    pierced: boolean;
    absorption: 'INTACT' | 'ABSORBED';
    liquidity: Array<{ kind: 'NESTED' | 'SHIELD'; zoneId: string; eaten: boolean; eatenAtMs?: number; defendedAtMs?: number }>;
    operativeDefense?: { zoneId: string; kind: 'SHIELD_FUEL' | 'PRESSURE_STRUCTURE' };
  };
  /** The zone's formation timestamp (the day-local window check). */
  formationMs?: number;
  /** The zone's reaction events (the battle granularity — "battles, not bars"). */
  reactionEvents?: Array<{ lastTouchMs: number; dir: 'enter' | 're-act' | 'leave' }>;
}

export interface ShapePrediction {
  step: number;
  day: string;
  shape: ShapeCode;
  confidence: number;     // 0-1
  context: string;
  keyTransitionTime: string;
  zfpCeiling: number;
  zfpFloor: number;
  transitionProb: string; // e.g. "60%"
  // Elemental density classification (populated by elemental-lobe)
  elementalDensity?: ElementalDensity;
}

export interface DayShapePrediction {
  day: string;  // 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  shape: ShapeCode;
  confidence: number;
  zfpRange: { low: number; high: number };
  keyTransitionTime: string;
  sessionWindow: string;
  // FIX-012: Trading Speed Rule fields
  originalPredictedDay?: string;    // The day the shape was originally predicted for
  adjustedDay?: string;             // The +1 shifted day (Trading Speed Rule adjustment)
  timingAdjustment?: string;        // Human-readable timing shift explanation
  speedAdjustedConfidence?: number; // Confidence adjusted for timing uncertainty
  // ── Zone-anchored decomposition (Engine 2 rewrite) ──
  direction?: string;  // 'UP' | 'DOWN' | 'RANGE' | 'NEUTRAL' — expected move direction
  keyZone?: string;    // Zone anchor description (e.g. "Z5 MOM_SUPPLY (ZFP=72%)")
  rationale?: string;  // Human-readable explanation of why this shape on this day

  // ── Zone Projection (E2-CASCADE: structured zone IDs for E3 cascade consumption) ──
  // Populated by projectZoneForDay() in buildDayDecomposition.
  // These fields let shape-cascade and selectPairNativeZone match the E2-
  // designated zone instead of relying on spot-nearest heuristics.
  /** The primary key zone ID for this day (e.g. "Z5", "LMV-1.08500"). */
  keyZoneId?: string;
  /** Center price of the key zone. */
  keyZonePrice?: number;
  /** Floor of the key zone. */
  keyZoneFloor?: number;
  /** Ceiling of the key zone. */
  keyZoneCeiling?: number;
  /** ZoneType enum value of the key zone (e.g. "MoM Supply"). */
  keyZoneType?: string;
  /** Zone Failure Probability of the key zone (0-100). */
  keyZoneZfp?: number;
  /** Nearest supply zone ID above spot (for SHORT-bias zone matching). */
  supplyZoneId?: string;
  /** Center price of the nearest supply zone. */
  supplyZonePrice?: number;
  /** Nearest demand zone ID below spot (for LONG-bias zone matching). */
  demandZoneId?: string;
  /** Center price of the nearest demand zone. */
  demandZonePrice?: number;
  // Phase 5 E1 (2026-07-31): the DayBand forward-projected London-open spot + the
  // E2 session — the authoritative designation fields (selectPairNativeZone + the
  // cascade consume them; Friday spot is Monday-E2-only per the operator).
  dayOpenSpot?: number;
  session?: string;
}

export interface ShapeChain {
  storylineBias: string;
  currentShape: ShapeCode;
  currentContext: string;
  zfpTransitions: Array<Record<string, unknown>>;
  chain: ShapePrediction[];
  weeklyVisualization: string;
  consolidationPhase: string;
  breakoutWatch: string;
  tradingSpeedAdjustment: string;
  alternativeChains?: Array<Record<string, unknown>>;
  dayDecomposition?: DayShapePrediction[];
  /**
   * FIX-013: Day-level shape decomposition for Engine 3 consumption.
   * Maps each shape chain step to a specific weekday (Mon-Fri).
   * Example: [{day: 'Monday', shape: 'SS', confidence: 0.9}, ...]
   */
  dayByDay?: DayShapeEntry[];
}

/** FIX-013: Simple day-shape entry for Engine 3 day assignment. */
export interface DayShapeEntry {
  day: string;        // 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  shape: string;      // ShapeCode value as string
  confidence: number; // 0-1
  // Phase 5 E1 (2026-07-31): the E2 forward-map fields — the DayBand projected
  // London-open spot + the E2-designated zone's machine id (the authoritative
  // designation that E3's selectPairNativeZone consumes).
  dayOpenSpot?: number;
  keyZoneId?: string;
  session?: string;
}

export interface TradeSetup {
  setupId: string;
  pair: string;
  direction: TradeDirection;
  category: SetupCategory;
  entry: number;
  sl: number;
  tp: number;
  confidence: number;          // 0-100
  confidenceTier: ConfidenceTier;
  shapeAlignment: ShapeCode;
  session: SessionWindow;
  day: string;
  shapeTrigger: string;
  /**
   * The setup's battle timestamp (the reaction/transit candle's ms — when
   * the setup actually FORMED). Optional + additive (v4.5.5): the outcome
   * sim activates the order at max(labeled-session start, battleMs) — an
   * order cannot exist before its setup forms. Absent → the session-bucket
   * start (the v4.5.3 fill-model behavior, unchanged for legacy rows).
   */
  battleMs?: number;
  rrr: number;
  slPips: number;
  zoneName: string;
  isBoMEntry: boolean;
  zoneType: ZoneType;
  directionValidation: Array<Record<string, string>>;
  notes: string;
  // Fractal Signal / Avatar State fields (Phase 5 TTE v5.3.3)
  isAvatarState?: boolean;
  fractalElements?: ElementalDensity[];
  reinforcementLadder?: ReinforcementLadder;
  combinedRRR?: number;
  stopLimitOrders?: StopLimitOrder[];
  // H-04: 4-Point Entry Precision (TTE v5.3.3 Section 7.1 + 8R.7)
  // Every entry must specify 4 precision points + SL zone references.
  entryPrecision?: EntryPrecision;
  // H-04b: 4-Point Entry Precision flat fields (TTE v5.3.3 §7.1 Rule 9)
  // entryFront = front edge/middle of zone (reaction level — first touch)
  // entryBack  = back edge of zone (deepest penetration)
  // slFront    = front edge of SL zone (where SL zone begins)
  // slBack     = back edge of SL zone (full extent of SL zone)
  entryFront?: number;
  entryBack?: number;
  slFront?: number;
  slBack?: number;
  // H-05: Multi-Point Scaled Entry (TTE v5.3.3 Section 7.3 — 33/33/33)
  // entry1 = Zone First Touch (front edge), entry2 = Zone Mid-Confluence (middle),
  // entry3 = Zone Far Edge (back edge). Weights must sum to 1.0.
  entry1?: number;
  entry2?: number;
  entry3?: number;
  entryWeights?: number[];
  // TimesFM overlay fields (optional — populated by TimesFM brain)
  pTpReach?: number;           // 0-1
  pSlHit?: number;             // 0-1
  expectedValuePips?: number;
  shapeDelta?: number;         // -20 to +10
  shapeDeltaLevel?: 'AGREE' | 'ADJACENT' | 'DISAGREE' | 'STRONG_DISAGREE';
  timesfmQualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  timesfmNotes?: string;
  // Kronos overlay fields (populated by Step 7.6)
  kronosShape?: string;
  kronosShapeConfidence?: number;
  kronosPEntryTrigger?: number;
  kronosPSlSweepBeforeTp?: number;
  kronosPTpReach?: number;
  kronosPathPercentiles?: {
    p10: number[]; p25: number[]; p50: number[];
    p75: number[]; p90: number[];
  };
  // Dual-brain reconciliation fields (populated by Step 7.7)
  dualBrainAgreement?: 'TRIPLE_AGREE' | 'DUAL_AGREE_T' | 'DUAL_AGREE_K' |
                         'DUAL_AGREE_M' | 'SINGLE_AGREE_T' | 'SINGLE_AGREE_K' |
                         'DISAGREE' | 'NO_MODELS';
  dualBrainGrade?: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  dualBrainNotes?: string;
  // VLM visual verification status (populated by TradeBrain via VC daemon)
  vlmStatus?: 'VLM_VERIFIED' | 'VLM_REJECTED' | 'VLM_UNAVAILABLE';
  vlmNotes?: string;
  // Trade Flow Continuity (TTE v5.3.3 Section 7.4) — populated by TradeBrain
  // when a setup's entry zone coincides with the TP of a prior chain trade.
  // chainPosition is 1-indexed (1 = chain origin, 2 = first continuation, …).
  chainId?: string;
  chainPosition?: number;
  /** setupId of parent setup whose TP = this setup's entry (trade chaining). */
  chainedFrom?: string;
  /** Predicted shape at the TP zone that triggered this chain. */
  chainShape?: string;
  // Swing Scalp subtype (TTE v5.3.3 §7S.2 — Types 2-4)
  // 'standard' = Type 1 (default), 'double_whiplash_inverse' = Type 2,
  // 'liquidity_snipe' = Type 3, 'ss_bs_transition' = Type 4
  scalpType?: string;
  // Engine 3 v8 fields (Phase 4 rewrite — sniper entry/SL/single TP)
  /** Blended RRR across 3 staggered entries (33/33/34 weights). */
  blendedRrr?: number;
  /** Primary RRR using front entry (first to fill). */
  realizedRrr?: number;
  /** Quality classification: GOD_TIER, HIGH, STANDARD, CONDITIONAL, REJECTED. */
  quality?: string;
  /** SL distance in pips (computed via v8 algorithm). */
  slDistancePips?: number;
  /** Which zone edge the sniper entry targets: 'ceiling' (LONG) or 'floor' (SHORT). */
  entryEdge?: string;
  /** Distance from entry to spot in pips. */
  proximityPips?: number;
  /** Proximity status: CLOSE, ACCEPTABLE, FAR. */
  proximityStatus?: string;
  /** Consolidation phase at time of setup creation (from shape chain). */
  consolidationPhase?: string;
  /** Source of DXY cascade alignment if this setup was cascade-generated. */
  cascadeSource?: string;
  /**
   * MDVE §9.6 mirror provenance (v4.4): the chain-root setup id this setup
   * mirrors (the DXY source setup). Present ONLY on mirror-lane setups —
   * the report shows it as provenance; emergent setups leave it undefined.
   */
  mirrorOf?: string;
  // Fibonacci confluence fields (TTE Fib enhancement)
  /**
   * Fib levels computed from the entry zone (swing high/low = zone ceiling/floor).
   * Each entry: { price, level } where level is the Fib ratio (0.382, 0.618, etc).
   * Used for confluence detection and report annotation.
   */
  fibLevels?: { price: number; level: number }[];
  /**
   * Fib-based reinforcement entry points for HTF_SWING setups.
   * R1 at 1.382 extension, R2 at 1.618 extension (the 1.382-1.786 zone = 90% accuracy).
   * Each entry: { price, fibLevel }.
   */
  reinforcementLevels?: { price: number; fibLevel: number }[];
  // Multi-Timeframe Zone Confluence (A+ setup precision)
  // Populated when the entry price overlaps LTF (1H/15m/30m) zones that also
  // overlap the 4H zone — the hallmark of A+ setups per the winning trade library.
  multiTfConfluence?: {
    htfZone: string;       // 4H zone name (e.g. 'R1', 'D2')
    ltfZones: string[];    // 1H/15m/30m zone descriptors that overlap
    confluenceScore: number; // Number of TF zones agreeing (4H + each overlapping LTF)
  };
  // Wave 1: LTF micro-zone used to refine entry precision (if one overlaps the 4H zone).
  ltfEntryZone?: {
    timeframe: string;   // e.g. '15m', '30m', '1H'
    floor: number;       // LTF zone floor
    ceiling: number;     // LTF zone ceiling
    type: string;        // 'demand', 'supply', 'consolidation-demand', 'consolidation-supply'
    label: string;       // human-readable label (e.g. 'Demand @ 07-14')
    reactionCount?: number; // number of bars in consolidation sequence (if applicable)
  };
  // Wave 4: Zone of Conquest — high-confluence multi-TF battle position.
  isZoC?: boolean;
  zocScore?: number;
  // Wave 4: refined multi-TF label e.g. "15m Refined 30m"
  refinedLabel?: string;
}

/**
 * H-04: 4-Point Entry Precision (TTE v5.3.3 Section 7.1 + Section 8R.7).
 *
 * Every entry must specify 4 precision points so SL placement is always
 * traceable to a specific zone edge:
 *   1. Front edge/middle of zone — where the limit order activates
 *   2. Back edge of zone — maximum entry deviation
 *   3. Front edge of SL zone — minimum SL distance
 *   4. Middle/back edge of SL zone — SL placement for thin liquidity
 *
 * frontEdge   = zone edge closest to spot (approach side)
 * middleZone  = zone midpoint (50% of range)
 * backEdge    = zone edge farthest from spot (defense side)
 * slZoneFront = SL zone edge closest to entry zone
 * slZoneMiddle= SL zone midpoint
 * slZoneBack  = SL zone edge farthest from entry zone (SL placement target)
 */
export interface EntryPrecision {
  frontEdge: number;
  middleZone: number;
  backEdge: number;
  slZoneFront: number;
  slZoneMiddle: number;
  slZoneBack: number;
}

/**
 * H-06: Master Trade Setup = E + FLR (TTE v5.3.3 Section 8R.9).
 *
 * The ultimate trade architecture that unifies ALL FOUR elemental densities
 * into a single executable position. Earth (liquidity anchor) + Fire (S/D
 * firepower) + Water (macro shape) + Air (Fibonacci trajectory) all converge.
 *
 * When all four elements converge = Avatar State. The Master Trade carries
 * up to 7 active rockets (FLR + LR) with hardwired safety.
 */
export interface MasterTrade {
  baseSetup: TradeSetup;
  rockets: TradeSetup[];          // up to 7 reinforcement rockets (FLR/LR)
  elementalConvergence: boolean;  // true when all 4 elements align
  avatarState: boolean;           // true = fractally locked at every scale
}

export interface ForecastResult {
  instrument: string;
  timeframe: string;
  horizonBars: number;
  pointForecast: Float64Array;
  quantileForecast: Float64Array;  // shape (horizon * 10) flattened
  shapeClassification: string;
  shapeConfidence: number;
  consolidationProbability: number;
  trendDirectionProbability: number;
  contextMean: number;
  contextStd: number;
  lastClose: number;
  generatedAt: number;
}

export interface KronosForecastResult {
  instrument: string;
  timeframe: string;
  horizonBars: number;
  sampleCount: number;
  shapeClassification: string;
  shapeConfidence: number;
  shapeDistribution: Record<string, number>;
  consolidationProbability: number;
  trendDirectionProbability: number;
  pathPercentiles: {
    p10: number[]; p25: number[]; p50: number[];
    p75: number[]; p90: number[];
  } | null;
  lastClose: number;
  generatedAt: number;
}

export interface ProbabilityAssessment {
  setupId: string;
  pTpReach: number;
  pSlHit: number;
  pNeither: number;
  expectedValuePips: number;
  tpPips: number;
  slPips: number;
  forecastHorizonBars: number;
  forecastConfidence: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAIN SNAPSHOTS — immutable versions published via BrainMessenger
// ═══════════════════════════════════════════════════════════════════════════════

export interface ZoneMapSnapshot {
  version: number;
  timestamp: number;
  instrument: string;
  zones: readonly DXYZone[];
  spots: Readonly<Record<string, number>>;
}

export interface ShapePredictionSnapshot {
  version: number;
  timestamp: number;
  shapeChain: ShapeChain;
  zoneMapVersion: number;  // references the ZoneMapSnapshot version this was computed from
}

export interface TradeSetupMapSnapshot {
  version: number;
  timestamp: number;
  setups: readonly TradeSetup[];
  zoneMapVersion: number;
  shapePredictionVersion: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface EvidenceRecord {
  id: number;
  evidenceId: string;
  timestamp: string;
  gate: GateState;
  action: string;
  payload: string;        // JSON
  merkleHash: string;
  previousMerkleHash: string;
  verified: number;       // 0 or 1
}

export interface BrainTick {
  brainName: string;
  tickNumber: number;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  publishedChannels: BrainChannel[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlutusConfig {
  // Network endpoints
  tvMcdCdpPort: number;
  timesfmPythonPath: string;   // Path to plutus_agent_v5.4 Python bundle
  // Pipeline timing
  brainTickIntervalMs: number; // default 200
  zoneBrainTickMs: number;     // 200
  shapeBrainTickMs: number;    // 200
  tradeBrainTickMs: number;    // 200
  systemBrainTickMs: number;   // 500
  // Gate engine
  gateTimeoutMs: Record<GateState, number>;
  // Evidence engine
  evidenceDbPath: string;
  // TimesFM
  timesfmEnabled: boolean;
  timesfmModelId: string;
  timesfmMaxContext: number;
  // Trading
  maxAccountRiskPct: number;
  slCapPips: number;
  // Logging
  logLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  logFile: string;
}

export const DEFAULT_CONFIG: PlutusConfig = {
  tvMcdCdpPort: TV_MCD_CDP_PORT,
  timesfmPythonPath: process.env.PLUTUS_HOME ?? process.cwd(),
  brainTickIntervalMs: BRAIN_TICK_MS,
  zoneBrainTickMs: ZONE_BRAIN_TICK_MS,
  shapeBrainTickMs: SHAPE_BRAIN_TICK_MS,
  tradeBrainTickMs: TRADE_BRAIN_TICK_MS,
  systemBrainTickMs: SYSTEM_BRAIN_TICK_MS,
  gateTimeoutMs: {
    [GateState.ANALYZE]: GATE_TIMEOUT_ANALYZE_MS,
    [GateState.VERIFY_ZONES]: GATE_TIMEOUT_VERIFY_ZONES_MS,
    [GateState.PREDICT]: GATE_TIMEOUT_PREDICT_MS,
    [GateState.SCORE]: GATE_TIMEOUT_SCORE_MS,
    [GateState.VALIDATE]: GATE_TIMEOUT_VALIDATE_MS,
    [GateState.EXECUTE]: GATE_TIMEOUT_EXECUTE_MS,
    [GateState.AUDIT]: GATE_TIMEOUT_AUDIT_MS,
    [GateState.TIMEOUT]: GATE_TIMEOUT_TIMEOUT_MS,
  },
  evidenceDbPath: process.env.HOME + '/.plutus/evidence.db',
  timesfmEnabled: process.env.PLUTUS_TIMESFM_ENABLED !== '0',
  timesfmModelId: 'google/timesfm-2.5-200m-pytorch',
  timesfmMaxContext: TIMESFM_MAX_CONTEXT,
  maxAccountRiskPct: MAX_ACCOUNT_RISK_PCT,
  slCapPips: SL_CAP_PIPS,
  logLevel: 'INFO',
  logFile: process.env.HOME + '/.plutus/plutus.log',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL TYPES — for OpenCode plugin tool definitions
// ═══════════════════════════════════════════════════════════════════════════════

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  evidenceId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GUARDRAILS
// ═══════════════════════════════════════════════════════════════════════════════

export interface GuardrailResult {
  rule: string;
  passed: boolean;
  severity: 'HARD_BLOCK' | 'WARN' | 'INFO';
  message: string;
  /** Evidence field explaining WHY a check passed (R16:OUTPUT_CONTRACT). */
  evidence?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENTAL DENSITY SYSTEM (TTE v5.3.3 + Fractal v2.3)
// ═══════════════════════════════════════════════════════════════════════════════

export enum ElementalDensity {
  EARTH = 'earth',    // Liquidity & IP zones
  FIRE = 'fire',      // Supply & Demand zones
  WATER = 'water',    // Macro shapes
  AIR = 'air',        // Fibonacci
}

export enum AttackType {
  EARTH_HEAVY = 'earth_heavy',     // FLR — Earth + Air
  FIRE_PRECISION = 'fire_precision', // FR — Air targeting Fire
  WATER_PRECISION = 'water_precision', // LR — Water flowing through Earth
}

export interface ElementalProfile {
  pair: string;
  primary: ElementalDensity;
  secondary: ElementalDensity;
  description: string;
}

export const PAIR_ELEMENTAL_PROFILES: Record<string, ElementalProfile> = {
  'DXY': {
    pair: 'DXY',
    primary: ElementalDensity.AIR,
    secondary: ElementalDensity.FIRE,
    description: 'Directional conviction through Air (Fib) and Fire (S/D momentum)',
  },
  'EUR/USD': {
    pair: 'EUR/USD',
    primary: ElementalDensity.FIRE,
    secondary: ElementalDensity.EARTH,
    description: 'HTF+LTF moves, medium pace, primary swing pair',
  },
  'GBP/USD': {
    pair: 'GBP/USD',
    primary: ElementalDensity.EARTH,
    secondary: ElementalDensity.WATER,
    description: 'LTF moves, liquidity shields, primary scalp pair',
  },
  'AUD/USD': {
    pair: 'AUD/USD',
    primary: ElementalDensity.EARTH,
    secondary: ElementalDensity.EARTH,
    description: 'HTF moves, slow, secondary swing pair',
  },
};

export interface FractalSignal {
  isAvatarState: boolean;
  elements: ElementalDensity[];
  confluenceCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REINFORCEMENT LADDER PROTOCOL (TTE v5.3.3 Section 7.3)
// ═══════════════════════════════════════════════════════════════════════════════

export enum ReinforcementType {
  FLR = 'FLR',  // Fibonacci Liquidity Rocket — Earth Heavy Attack
  FR = 'FR',    // Fibonacci Rocket — Fire Precision Attack
  LR = 'LR',    // Liquidity Rocket — Water Precision Attack
}

export interface ReinforcementEntry {
  type: ReinforcementType;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;  // Shares TP with primary setup
  quantity: number;    // Position size relative to primary (e.g., 0.5 = half)
  combinedRRR: number;  // Combined risk/reward with all entries
  triggerPrice: number; // Price at which the stop-limit order triggers
  elementalAttack: AttackType;
  /**
   * FIX-022: Stop-limit order specification (TTE v5.3.3 Section 8R.7).
   * Complete procedural specification for reinforcement rocket placement.
   */
  stopLimitSpec?: StopLimitSpec;
}

/**
 * FIX-022: Stop-limit order mechanics specification for reinforcement rockets.
 * Per TTE v5.3.3 Section 8R.7:
 *   - Trigger zones 2-3 zones in front of entry zone (at least one FULL zone buffer)
 *   - Stop price 1-2 pips INSIDE target liquidity zone
 *   - Rocket #1 trigger at close edge of trigger zone
 *   - Rocket #2/3 at far edge
 *   - SL 1-2 pips OUTSIDE back edge of SL zone
 *   - Thin liquidity zones = NEVER entry or SL zones
 *   - NY session requires 2-3 pip SL buffer
 *   - London session 1-2 pip buffer
 */
export interface StopLimitSpec {
  /** Zone ID of the trigger zone (2-3 zones in front of entry). */
  triggerZoneId: string;
  /** Edge of trigger zone: Rocket #1 = close, #2/#3 = far. */
  triggerEdge: 'close' | 'far';
  /** Stop price 1-2 pips INSIDE target liquidity zone (prevents false sweeps). */
  stopPrice: number;
  /** SL buffer in pips: 1-2 (London) or 2-3 (NY session). */
  slBufferPips: number;
  /** Session context for buffer sizing. */
  session: 'london' | 'ny' | 'other';
  /**
   * True if the entry/SL zone is a thin liquidity zone.
   * Thin liquidity zones MUST NEVER be used as entry or SL zones.
   */
  isThinLiquidityZone: boolean;
  /** Human-readable rationale for the specification. */
  rationale: string;
}

export interface ReinforcementLadder {
  primarySetupId: string;
  reinforcements: ReinforcementEntry[];  // Min 2 for HTF swings
  totalRisk: number;
  combinedRRR: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOP-LIMIT ORDER MECHANICS (TTE v5.3.3 Section 8R.7)
// ═══════════════════════════════════════════════════════════════════════════════

export interface StopLimitOrder {
  id: string;
  triggerZone: string;       // Zone name/ID — 2-3 zones in front of entry
  triggerPrice: number;      // Close edge of trigger zone
  stopPrice: number;         // 1-2 pips INSIDE target liquidity zone (prevents false sweeps)
  slPrice: number;           // 1-2 pips OUTSIDE back edge of SL zone
  slBuffer: number;          // Buffer in pips: 1-2 (London) or 2-3 (NY)
  entryPrice: number;        // Price at which the limit order activates
  maxQuantity: number;       // Max position size for this order
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACTION SURVIVAL — 10 files
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompactionState {
  buildState: string;
  taskQueue: string;
  changelog: string;
  decisionChain: string;
  debugLog: string;
  compactionSurvival: string;
  evidenceState: string;
  postCompactionPrompt: string;
  socPreservation: string;
  thoughtStream: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC RESULT TYPE — discriminated union for all async operations
// ═══════════════════════════════════════════════════════════════════════════════

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ═══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED PIP VALUES — ONE source of truth
// ═══════════════════════════════════════════════════════════════════════════════

export const PIP_VALUE: Record<string, number> = {
  'DXY': PIP_VALUE_DXY,
  'EUR/USD': PIP_VALUE_FX_4DEC,
  'GBP/USD': PIP_VALUE_FX_4DEC,
  'AUD/USD': PIP_VALUE_FX_4DEC,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL CORTEX TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VLMVerdict = 'CONFIRMED' | 'REJECTED' | 'UNCERTAIN' | 'SKIPPED';

export interface VCHealthStatus {
  readonly status: 'ok' | 'degraded';
  readonly vlmAvailable: boolean;
  readonly queueDepth: number;
  readonly sessionId: string;
  readonly version: string;
  readonly cdp: {
    leviathan: { healthy: boolean };
    xvfbChrome: { healthy: boolean };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE 3 v8 — Zone Classification, Supply/Demand, and Consolidation Types
// (Ported from Python BUILD_SPEC.md for TypeScript engine)
// ═══════════════════════════════════════════════════════════════════════════════

/** Zone category: position relative to current spot price. */
export enum ZoneCategory {
  RESISTANCE = "RES",
  EQUILIBRIUM = "MID",
  SUPPORT = "SUP",
}

/** Pressure degree: intensity of supply/demand concentration at a zone. */
export enum PressureDegree {
  EXTREME = "EXTREME",
  HEAVY = "HEAVY",
  MODERATE_HEAVY = "MODERATE-HEAVY",
  MODERATE = "MODERATE",
  LIGHT = "LIGHT",
  MINIMAL = "MINIMAL",
}

/** Supply/Demand zone type: origin mechanism of the zone. */
export enum SDType {
  BOM = "BoM",
  MOM = "MoM",
  VIRGIN_MOM = "Virgin MoM",
}

/** Consolidation phase: lifecycle stage of a ranging market. */
export enum ConsolidationPhase {
  EARLY = "Early",
  MID = "Mid",
  LATE = "Late",
  DIRECTIONAL = "Directional",
  RESOLUTION = "Resolution",
}

/**
 * LSZ (Large Structural Zone) — a major supply/demand zone spanning a wide price range.
 * Typically derived from higher-timeframe consolidation structures.
 */
export interface LSZ {
  top: number;
  bottom: number;
  side: string;
  priority: string;
  source: string;
  thickness: string;
}

/** Option strike level from options-chain data. */
export interface OptionStrike {
  dxy_level: number;
  pair: string;
  pair_strike: number;
  notional_b: number;
  day: string;
  tier: string;
}

/**
 * IP Zone Reference — a consolidated view of an Institutional Pro zone.
 * Used by Engine 3 for cross-referencing zones across instruments and timeframes.
 */
export interface IPZoneRef {
  name: string;
  top: number;
  bottom: number;
  category: ZoneCategory;
  pressure: PressureDegree;
  confluence: number;
  zfp: number;
  key_levels: number[];
  sd_type: SDType;
  sd_fresh: string;
  reaction_count: number;
  sd_overlap: string;
  formed_after_consolidation: boolean;
  engine3_status: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE ERROR SYSTEM (Hard Fail — no fallbacks, no silent catches)
// ═══════════════════════════════════════════════════════════════════════════════

export type PipelineStage =
  | 'CDP_CONNECT' | 'CDP_NAVIGATE' | 'CDP_SET_TIMEFRAME' | 'CDP_RENDER_WAIT' | 'CDP_SCREENSHOT'
  | 'VLM_INVOKE' | 'VLM_PARSE' | 'VLM_ZONE_CONSTRUCT'
  | 'ZONE_VALIDATE' | 'ZONE_MERGE'
  | 'SETUP_GENERATE' | 'SETUP_DIRECTION' | 'SETUP_SL' | 'SETUP_TP' | 'SETUP_SESSION' | 'SETUP_CANDLE' | 'SETUP_LADDER'
  | 'OPTIONS_HARVEST'
  | 'ERROR_FLUSH';

export interface PipelineError {
  readonly stage: PipelineStage;
  readonly pair: string;
  readonly severity: 'FATAL';
  readonly message: string;
  readonly context: Record<string, unknown>;
  readonly timestamp: string;
}

export function createPipelineError(
  stage: PipelineStage,
  pair: string,
  message: string,
  context: Record<string, unknown> = {},
): PipelineError {
  return {
    stage,
    pair,
    severity: 'FATAL',
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}


