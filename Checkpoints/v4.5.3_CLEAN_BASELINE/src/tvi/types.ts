// ═══════════════════════════════════════════════════════════════════
// TVI CORE TYPES — PLUTUS_TVI_DESIGN_SPEC §13.1 (verbatim) + V4.3 extensions
// ═══════════════════════════════════════════════════════════════════

import type { ZoneMapSnapshot, ShapePredictionSnapshot } from '../types.js';
import type { HarvestData } from '../report/md-report-generator.js';

/** Zone type — what kind of price level this is */
export type ZoneType = 'SUPPLY' | 'DEMAND' | 'LIQUIDITY';

/** Zone classification — structural role in the move */
export type ZoneClassification = 'BoM' | 'MoM' | 'UNMITIGATED';

/** Zone source — how the zone was identified */
export type ZoneSource = 'VLM_CONFIRMED' | 'VLM_NEW' | 'VLM_CONFIRMED_LQZ' | 'VLM_NEW_LQZ';

/** Zone verdict — the agent's freshness/evidence verdict on a deterministic scaffold rung (W7) */
export type ZoneVerdict = 'CONFIRMED' | 'REJECTED' | 'WEAK';

/** A validated zone that passed all TVI gates */
export interface ValidatedZone {
  /** Pair this zone belongs to (DXY, EUR/USD, GBP/USD, AUD/USD) */
  pair: string;
  /** Zone type — SUPPLY (rejected DOWN), DEMAND (rejected UP), LIQUIDITY (stop-hunt) */
  type: ZoneType;
  /** Upper price boundary (from chart's price axis) */
  top: number;
  /** Lower price boundary (from chart's price axis) */
  bottom: number;
  /** Timeframe of the chart this zone was identified on */
  timeframe: '4H' | '1H' | '30m' | '15m';
  /** Structural classification — BoM (beginning of move), MoM (middle of move), UNMITIGATED */
  classification: ZoneClassification;
  /** How the zone was identified — VLM_CONFIRMED (aligned with Engine 1) or VLM_NEW (agent found it) */
  source: ZoneSource;
  /** Agent's confidence in this zone (0-100) */
  confidence: number;
  // W7 scaffold: the agent's freshness/evidence verdict on a deterministic rung (undefined for legacy ZONE| lines)
  verdict?: ZoneVerdict;
  /** Specific candlestick pattern observed (≥20 chars, with price references) */
  visualEvidence: string;
  /** Path to the screenshot this zone was identified from */
  sourceScreenshot: string;
  /** Number of times price has retested this zone (0 = unmitigated) */
  reactionCount: number;
  /** Confluence score from Engine 1 (0-14) */
  confluence: number;
  /** Zone Failure Probability (0-100) */
  zfp: number;
  /** Liquidity score (0-10) — "wood for the fire" */
  liquidityScore: number;
  /** Name of the Engine 1 IP zone this maps to (if any) */
  mappedIPZoneName: string;
}

/** A VKG knowledge node */
export interface VKGNode {
  /** Unique node ID (e.g., "A-001", "B-003", "D-007") */
  id: string;
  /** Category (identification, validation, evidence, anti_pattern, confluence, shape) */
  category: VKGCategory;
  /** Task types this node applies to */
  taskTypes: string[];
  /** Pairs this node applies to (undefined = all pairs) */
  pairs?: string[];
  /** Timeframes this node applies to (undefined = all timeframes) */
  timeframes?: string[];
  /** Boolean condition for matching */
  condition: (state: AgentState) => boolean;
  /** T0 bullet guidance (<80 chars) */
  bullet: string;
  /** T1 warhead file path (for complex guidance) */
  warhead?: string;
  /** Priority: block (throw), warn (flag), guide (inform) */
  priority: 'block' | 'warn' | 'guide';
  /** Disclosure mode: always (every time), once-gate (once per gate), once-session (once per session) */
  disclosure: 'always' | 'once-gate' | 'once-session';
}

export type VKGCategory = 'identification' | 'validation' | 'evidence' | 'anti_pattern' | 'confluence' | 'shape';

/** Agent state for VCM matching (spec §13.1 verbatim + V4.3 extension fields) */
export interface AgentState {
  /** Current task type */
  task: 'zone_identification' | 'zone_verification' | 'setup_generation';
  /** Current pair */
  pair: string;
  /** Current timeframe */
  timeframe: string;
  /** Current spot price */
  spot: number;
  /** Number of zones drawn on chart */
  zonesDrawn: number;
  /** Screenshots the agent has read */
  screenshotsRead: string[];
  /** Whether the agent has read any screenshot */
  agentHasReadScreenshot: boolean;
  /** Current shape from Engine 2 */
  currentShape: string;
  /** Today's shape from Engine 2 */
  dayShape: string;

  // ── V4.3 EXTENSION FIELDS (optional — for per-zone evaluation) ──
  /** The zone currently under evaluation (zone_verification) */
  zone?: ValidatedZone;
  /** All validated zones for the current pair (both-sides / spread / dedup checks) */
  pairZones?: ValidatedZone[];
  /** Working side for identification guidance (overrides zone.type inference) */
  side?: 'supply' | 'demand';
  /** Working zone type for identification guidance (overrides zone.type) */
  type?: ZoneType;
  /** Working classification for identification guidance (overrides zone.classification) */
  classification?: ZoneClassification;
  /** Working pattern for identification guidance (LIQUIDITY_SWEEP | LONG_WICK | SHORT_WICK_CONSOL) */
  pattern?: string;
  /** Age of the most recent screenshot in ms (VAP-003) */
  screenshotAge?: number;
  /** Whether any liquidity zone was identified this session (VAP-014) */
  identifiedAnyLqz?: boolean;
  /** Agent computed zones from data instead of seeing them (VAP-002) */
  agentComputedInsteadOfSeeing?: boolean;
  /** Agent only confirmed drawn rectangles without reading structure (VAP-005) */
  agentOnlyConfirmedRectangles?: boolean;
  /** Zone boundaries not derived from the chart's price axis (VAP-006) */
  zoneBoundariesNotFromPriceAxis?: boolean;
  /** Agent tried to read base64 text as an image (VAP-007) */
  agentTriedToReadBase64?: boolean;
  /** Agent called omni-vision for a chart screenshot (VAP-008) */
  agentCalledOmniVision?: boolean;
  /** SL distance from entry in pips (V4.3 anchor doctrine B-026/B-027) */
  slDistancePips?: number;
  /** TP zone is a BoM (V4.3 anchor doctrine B-028) */
  tpIsBoM?: boolean;
  /** TP zone is an Earth+Fire overlap (V4.3 anchor doctrine B-028) */
  tpIsEarthFire?: boolean;
  /** TP zone MoM mitigation count (V4.3 anchor doctrine B-028 — valid if ≤1) */
  tpMomMitigationCount?: number;
}

/** TVI finding for orchestrator synthesis */
export interface TVIFinding {
  /** Finding priority */
  priority: 'block' | 'warn' | 'guide';
  /** Bullet text (<80 chars) */
  bullet: string;
  /** Gate that produced this finding */
  gate: string;
  /** Reason for the finding */
  reason: string;
}

/** Trajectory record for health scoring */
export interface TrajectoryRecord {
  run_id: string;
  week_start: string;
  zones_produced: number;
  zones_validated: number;
  setups_produced: number;
  gates_passed: number;
  gates_failed: number;
  health_score: number;
  created_at: number;
}

/** Screenshot metadata */
export interface ScreenshotMeta {
  path: string;
  pair: string;
  timeframe: string;
  sizeBytes: number;
  capturedAt: number;
}

/** Zone verification result */
export interface ZoneVerification {
  passed: boolean;
  reason: string;
  gate: string;
}

/** TVI context (shared across hooks) */
export interface TVIContext {
  /** Screenshots captured and read */
  screenshots: ScreenshotMeta[];
  /** Screenshots the agent has read via read() */
  screenshotsRead: string[];
  /** Zones the agent has drawn on charts */
  zonesDrawn: number;
  /** Validated zones from TVI */
  validatedZones: ValidatedZone[];
  /** Engine 1 zone map snapshot */
  zoneMapSnapshot: ZoneMapSnapshot | null;
  /** Engine 2 shape snapshot */
  shapeSnapshot: ShapePredictionSnapshot | null;
  /** Harvest data (OHLC, spots) */
  harvestData: HarvestData | null;
  /** Pipeline run ID */
  runId: string;
  /** Week start date */
  weekStart: string;
}

/**
 * GENERIC_EVIDENCE_PATTERNS — canon from spec §5.2 GATE V2 / §6.3 verifyZone.
 * Exact-match (lowercased) generic evidence strings that fail the firewall.
 */
export const GENERIC_EVIDENCE_PATTERNS: readonly string[] = [
  'zone confirmed',
  'looks good',
  'valid zone',
  'order block',
  'confirmed zone',
  'validated',
];
