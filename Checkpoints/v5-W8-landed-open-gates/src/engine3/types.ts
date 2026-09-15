/**
 * Engine 3 (3D) — Visual Trade Setup Intelligence Types
 *
 * Per ENGINE_OVERHAUL_COMPLIANCE_L2.md §3.3-3.4:
 *   - VisualSDZone is the ONLY place S/D zones are constructed.
 *   - Engine 1 NEVER produces these.
 *   - VLMExtraction holds the parsed VLM markdown response.
 *   - TradingViewScreenshot holds screenshot metadata.
 *
 * E3-1/E3-2: Visual zone identification from TradingView screenshots.
 * E3-3: Zones mapped onto Engine 1 IP framework + Engine 2 shape timeline.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENSHOT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TradingView chart screenshot captured by the VC daemon.
 * Per spec §3.3.
 */
export interface TradingViewScreenshot {
  pair: string;
  timeframe: '4H' | '1H' | '30m' | '15m';
  capturedAt: number;
  imageBase64: string;
  source: 'CACHED';
}

// ═══════════════════════════════════════════════════════════════════════════════
// VLM EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VLM extraction result. Per SYNTHESIS/03, the VLM returns unstructured markdown.
 * We parse it into this structured type.
 *
 * Fields correspond to the 7-section markdown response format the VLM prompt requests:
 *   ### 1. Setup Type
 *   ### 2. Entry Points (primary, secondary, tertiary)
 *   ### 3. Stop Loss
 *   ### 4. Take Profit (single TP)
 *   ### 5. S/D Hierarchy (supply, demand)
 *   ### 6. Risk:Reward
 *   ### 7. Visual Zone Mapping
 */
export interface VLMExtraction {
  setupType: string;
  entryPoints: { primary: number; secondary?: number; tertiary?: number };
  stopLoss: number;
  takeProfit: number;
  supplyZone: { top: number; bottom: number };
  demandZone: { top: number; bottom: number };
  riskReward: string;
  rawMarkdown: string;
  /** Additional liquidity zones identified by VLM. */
  liquidityZones?: VLMZoneDetail[];
  /** Candlestick patterns at zone touches. */
  patterns?: VLMCandlePattern[];
}

/** A single zone detail returned by the VLM. */
export interface VLMZoneDetail {
  top: number;
  bottom: number;
  tested: number;
  label?: string;
}

/** A candlestick pattern at a specific price level. */
export interface VLMCandlePattern {
  level: number;
  pattern: 'engulfing' | 'pin_bar' | 'inside_bar' | 'doji' | 'hammer' | 'shooting_star' | string;
  direction?: 'bullish' | 'bearish' | 'neutral';
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL S/D ZONE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * The type of visual zone.
 * - SUPPLY: area where selling pressure dominates (above spot)
 * - DEMAND: area where buying pressure dominates (below spot)
 * - LIQUIDITY: LQZ — concentrated stop-loss zone (tight consolidation, wick cluster)
 */
export type VisualZoneType = 'SUPPLY' | 'DEMAND' | 'LIQUIDITY';

/**
 * Source of the visual zone identification.
 * - VLM_WICK: VLM identified a long-wick rejection level
 * - VLM_BODY_EDGE: VLM identified a consecutive body cluster edge
 * - VLM_REACTION_POINT: VLM identified a multi-touch reaction level
 * - VLM_LQZ_BOUNDARY: VLM identified a liquidity zone boundary
 * - VLM_NEW: VLM-identified zone with no Engine 1 counterpart (VLM found a
 *   zone the data layer missed)
 * - VLM_CONFIRMED: VLM-identified zone validated against an Engine 1 zone
 *   (within 8-pip overlap tolerance) — inherits Engine 1 name/reactions/liquidity
 * - FALLBACK_IP_EDGE: Legacy — Engine 1 IP zone edge (fallback path REMOVED;
 *   kept in the union for historical/cached zone compatibility)
 */
export type VisualZoneSource =
  | 'VLM_WICK'
  | 'VLM_BODY_EDGE'
  | 'VLM_REACTION_POINT'
  | 'VLM_LQZ_BOUNDARY'
  | 'VLM_NEW'
  | 'VLM_CONFIRMED'
  | 'FALLBACK_IP_EDGE';

/**
 * VisualSDZone — Engine 3's S/D/L zone, derived from VLM screenshot analysis.
 *
 * E3-1/E3-2: This is the ONLY place S/D zones are constructed. Engine 1 NEVER produces these.
 *
 * Each visual zone is matched to the nearest Engine 1 IP zone and inherits that zone's
 * pressure degree, ZFP, and structural classification. The visual zone adds ENTRY PRECISION
 * (exact wick level, exact body edge) that Engine 1 lacks.
 */
export interface VisualSDZone {
  pair: string;
  type: VisualZoneType;
  top: number;
  bottom: number;
  /** Multi-TF telescoping: timeframe this zone was identified on ('4H' | '1H' | '30m' | '15m'). */
  timeframe: string;
  source: VisualZoneSource;
  /** Structural classification from VLM analysis (BoM/MoM/BOSM/UNMITIGATED). */
  classification?: 'BoM' | 'MoM' | 'BOSM' | 'UNMITIGATED';
  /** E3-3: Which Engine 1 IP zone this overlays (zone name or 'UNMAPPED'). */
  mappedIPZoneName: string;
  /** E3-3: Which Engine 2 day this zone is active on. */
  mappedShapeDay: string;
  /** 0-100 confidence from VLM certainty (VLM_CONFIRMED zones get +20, cap 95). */
  confidence: number;
  /** Number of times price has tested this zone (from VLM or IP reaction count). */
  reactionCount: number;
  /** Liquidity score 0-10 (inherited from Engine 1 match, default 5). */
  liquidityScore?: number;
  /** Candlestick pattern at last zone touch (from VLM). */
  pattern?: string;
  /** Reference to the Engine 1 IP zone for context inheritance. */
  ipZoneRef?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VLM ANALYSIS RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Combined result of VLM screenshot analysis.
 */
export interface VLMAnalysisResult {
  visualZones: VisualSDZone[];
  vlmExtraction: VLMExtraction;
  confidence: number;
  vcSourced: boolean;
}
