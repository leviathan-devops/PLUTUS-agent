/**
 * Synthesis Lobe — confluence scoring, ZFP computation, zone assembly, and clustering.
 *
 * ═══════════════════════════════════════════════════════════════
 * ARCHITECTURAL REWRITE — Zone Assembly (Engine 1)
 * ═══════════════════════════════════════════════════════════════
 *
 * Key changes from legacy:
 *   - Clusters all levels from all pillars within 15 pips (not 10)
 *   - Scores each cluster on a 0-14 confluence scale (6-dimension scoring)
 *   - Returns ALL clustered zones sorted by confluence score (E1-BUG-2 FIX)
 *   - ZFP mapped from confluence score tiers (5-60%+)
 *   - engine3_status assigned per BoM/MoM + reaction rules
 *   - formed_after_consolidation flag propagated from 4H zones
 *   - Intra-zone key level scan still runs on the final zones
 *
 * This lobe is the final assembly step in the zone computation pipeline.
 */

import { DXYZone, OHLCBar, PriceLevel, ZoneType } from '../types.js';
import type { PillarResult } from './9-pillar-lobe.js';
import { classifyLevel } from './bom-mom-lobe.js';
import { classifyZoneDensity } from './elemental-lobe.js';
import { scanAllZonesIntraLevels } from './intra-zone-scanner.js';
import { ZONE_WIDTH, DXY, TIME, CONFLUENCE, ZFP, GENERAL } from '../constants/trading-constants.js';

// ── Zone Reaction Counter ──
// Tracks how many times price has reacted at each zone.
// 0 = virgin (strongest if BoM)
// 1-2 = active (still has juice)
// 3+ = depleted (likely to pierce — TP only, NOT entry)

export interface ReactionState {
  zoneId: string;
  floor: number;
  ceiling: number;
  reactionCount: number;
  lastTested: number | null;
}

// In-memory store of reaction states (persists between ticks)
const reactionStore = new Map<string, ReactionState>();

export function getReactionCount(zoneId: string, floor: number, ceiling: number, spotPrice: number): number {
  const existing = reactionStore.get(zoneId);

  if (!existing) {
    // New zone — check if price is currently AT this zone
    const currentTest = spotPrice >= floor && spotPrice <= ceiling;
    reactionStore.set(zoneId, {
      zoneId,
      floor,
      ceiling,
      reactionCount: currentTest ? 1 : 0,
      lastTested: currentTest ? Date.now() : null,
    });
    return currentTest ? 1 : 0;
  }

  // Zone exists — check if price was previously outside and is now inside (new reaction)
  const wasOutside = existing.lastTested === null ||
    (existing.lastTested < Date.now() - TIME.REACTION_COOLDOWN_MS);  // 1 minute cooldown

  const isNowAtZone = spotPrice >= floor && spotPrice <= ceiling;

  if (wasOutside && isNowAtZone) {
    // New reaction!
    existing.reactionCount += 1;
    existing.lastTested = Date.now();
  } else if (isNowAtZone) {
    // Still in the zone, update timestamp
    existing.lastTested = Date.now();
  }

  return existing.reactionCount;
}

export function getReactionStatus(count: number): 'virgin' | 'active' | 'depleted' {
  if (count === CONFLUENCE.VIRGIN_REACTION) return 'virgin';
  if (count <= CONFLUENCE.ACTIVE_MAX_REACTIONS) return 'active';
  return 'depleted';
}

export function clearReactionStore(): void {
  reactionStore.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS — Zone Assembly v2
// ═══════════════════════════════════════════════════════════════════════════════

/** Cluster threshold: levels within this many pips are merged. */
const CLUSTER_PIPS = 15;

/**
 * Maximum confluence score on the 0-14 scale.
 */
const MAX_CONFLUENCE_SCORE = 14;

// E1-BUG-2 FIX: Return ALL clustered zones sorted by confluence score.
// The previous TOP_ZONE_COUNT_PER_SIDE = 2 limited output to 4 zones total.
// Per spec, ALL clustered zones should be returned so Engine 3 has full
// zone coverage for setup generation.

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssembleInput {
  pillarResult: PillarResult;
  classifiedZones: DXYZone[];
  spot: number;
  pipValue: number;
  instrument: string;
  /** Step 0.6: 1H OHLC bars for intra-zone 1H demand/supply detection. Optional. */
  bars1H?: OHLCBar[];
  /** Step 0.6: 4H OHLC bars for intra-zone prior close extraction. Optional. */
  bars4H?: OHLCBar[];
}

/**
 * Assemble the final zone map from pillar results and classified 4H zones.
 *
 * ═══════════════════════════════════════════════════════════════
 * Pipeline:
 *   1. Collect all levels from pillars + 4H zone midpoints
 *   2. Cluster levels within 15 pips → zone clusters
 *   3. Score each cluster using 6-dimension confluence (0-14)
 *   4. Convert clusters to DXYZone objects
 *   5. Select ALL zones sorted by confluence score (E1-BUG-2 FIX)
 *   6. Assign ZFP from confluence score tiers
 *   7. Assign engine3_status from BoM/MoM + reaction rules
 *   8. Propagate formed_after_consolidation from 4H zones
 *   9. Run intra-zone key level scan on final zones
 * ═══════════════════════════════════════════════════════════════
 */
export function assembleZones(input: AssembleInput): DXYZone[] {
  const { pillarResult, classifiedZones, spot, pipValue, instrument, bars1H, bars4H } = input;

  // ── Step 1: Collect all levels from pillars + 4H zones ──
  const allLevels = collectAllLevels(pillarResult, classifiedZones, spot);

  if (allLevels.length === 0) return [];

  // ── Step 2: Cluster levels within 15 pips ──
  const clusters = clusterLevels(allLevels, pipValue * CLUSTER_PIPS);

  if (clusters.length === 0) return [];

  // ── Step 3: Score each cluster (0-14 confluence scale) ──
  const scoredClusters = clusters.map((cluster: LevelCluster) => ({
    ...cluster,
    confluenceScore: scoreCluster(cluster),
  }));

  // ── Step 4: Convert clusters to DXYZone objects ──
  const now = Date.now();
  const instrumentKey = instrument.replace('/', '').toLowerCase();
  const clusterZones: DXYZone[] = scoredClusters.map((sc, i: number) => {
    const midPrice = sc.midPrice;
    const isDemand = midPrice < spot;
    const halfWidth = pipValue * ZONE_WIDTH.HALF_WIDTH_PIPS;

    // Check if any 4H zone overlaps this cluster (for BoM/MoM classification)
    const overlapping4H = classifiedZones.find((z: DXYZone) => {
      const zMid = (z.floor + z.ceiling) / 2;
      return Math.abs(zMid - midPrice) <= pipValue * CLUSTER_PIPS;
    });

    const isBoM = overlapping4H?.isBoM ?? false;
    const formedAfterConsol = overlapping4H?.formedAfterConsolidation ?? false;
    const reactionCount = overlapping4H?.reactionCount ?? getReactionCount(
      `${instrumentKey}-cluster-${i}-${now}`,
      midPrice - halfWidth, midPrice + halfWidth, spot,
    );

    // Classify zone type
    const { type } = classifyLevel(midPrice, spot, pipValue, isDemand, sc.confluenceScore);

    return {
      id: `${instrumentKey}-cluster-${i}-${now}`,
      floor: midPrice - halfWidth,
      ceiling: midPrice + halfWidth,
      type,
      isBoM,
      reactionCount,
      reactionStatus: getReactionStatus(reactionCount),
      confluence: sc.confluenceScore,
      pillars: Object.values(pillarResult.scores),
      zfp: computeZFPFromScore(sc.confluenceScore),
      createdAt: now,
      lastTested: null,
      elementalDensity: classifyZoneDensity({
        floor: midPrice - halfWidth,
        ceiling: midPrice + halfWidth,
        type,
        isBoM,
      } as DXYZone),
      sdFresh: overlapping4H?.sdFresh,
      keyLevels: overlapping4H?.keyLevels,
      formedAfterConsolidation: formedAfterConsol,
      engine3Status: computeEngine3Status(isBoM, reactionCount),
      zoneName: isDemand ? 'D?' : 'R?',
    };
  });

  // ── Step 5: Select ALL zones sorted by confluence ──
  const selected = selectTopZones(clusterZones, spot, pipValue, instrumentKey, now, bars4H);

  // ── Step 6: Run intra-zone key level scan on final zones ──
  if (bars4H || bars1H) {
    scanAllZonesIntraLevels(selected, bars1H ?? [], bars4H ?? []);
  }

  return selected;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES — Zone Assembly v2
// ═══════════════════════════════════════════════════════════════════════════════

interface CollectedLevel {
  price: number;
  source: string;
  confidence: number;
  /** Reference to originating 4H zone (if from classifiedZones). */
  fromZone?: DXYZone;
}

interface LevelCluster {
  levels: CollectedLevel[];
  midPrice: number;
  sources: Set<string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLUSTERING & SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Collect all price levels from pillars and 4H classified zones.
 * Each 4H zone contributes its midpoint as a level.
 */
function collectAllLevels(
  pillarResult: PillarResult,
  classifiedZones: DXYZone[],
  _spot: number,
): CollectedLevel[] {
  const levels: CollectedLevel[] = [];

  // Pillar levels
  for (const level of pillarResult.levels) {
    levels.push({
      price: level.price,
      source: level.source,
      confidence: level.confidence,
    });
  }

  // 4H zone midpoints
  for (const zone of classifiedZones) {
    const mid = (zone.floor + zone.ceiling) / 2;
    levels.push({
      price: mid,
      source: '4H-SD',
      confidence: 0.8,
      fromZone: zone,
    });
  }

  return levels;
}

/**
 * Cluster levels that are within `threshold` price units of each other.
 * Uses greedy single-linkage clustering.
 */
function clusterLevels(levels: CollectedLevel[], threshold: number): LevelCluster[] {
  if (levels.length === 0) return [];

  // Sort by price
  const sorted = [...levels].sort((a: CollectedLevel, b: CollectedLevel) => a.price - b.price);
  const clusters: LevelCluster[] = [];
  let currentLevels: CollectedLevel[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const level = sorted[i];
    const lastLevel = currentLevels[currentLevels.length - 1];

    if (Math.abs(level.price - lastLevel.price) <= threshold) {
      currentLevels.push(level);
    } else {
      clusters.push(buildCluster(currentLevels));
      currentLevels = [level];
    }
  }
  // Push final cluster
  if (currentLevels.length > 0) {
    clusters.push(buildCluster(currentLevels));
  }

  return clusters;
}

/**
 * Build a LevelCluster from a list of collected levels.
 */
function buildCluster(levels: CollectedLevel[]): LevelCluster {
  const sources = new Set<string>();
  let priceSum = 0;

  for (const level of levels) {
    sources.add(level.source);
    priceSum += level.price;
  }

  return {
    levels,
    midPrice: priceSum / levels.length,
    sources,
  };
}

/**
 * Score a cluster on a 0-14 confluence scale using 6-dimension scoring.
 *
 * E1-BUG-3 FIX: Previously used cluster.sources.size (raw source count).
 * Now mirrors the 9-pillar-lobe's ConfluenceDimensions computation:
 *   - technical  (P1 + P2):  0-2 points
 *   - options    (P3 + P8):  0-2 points
 *   - analyst    (P4):       0-2 points
 *   - structural (P5 + 4H):  0-2 points
 *   - psychological (P6):    0-2 points
 *   - regime     (P7 + P9):  0-2 points
 *   Max base = 12, plus structuralExtreme bonus = max 14.
 */
function scoreCluster(cluster: LevelCluster): number {
  // Track which pillar IDs (P1-P9) and structural sources are present
  const pillarIds = new Set<string>();
  let has4HSD = false;
  let hasStructuralExtreme = false;

  for (const level of cluster.levels) {
    // Extract pillar prefix (e.g., 'P1' from 'P1-R3-daily-classic')
    const match = level.source.match(/^P(\d)/);
    if (match) {
      pillarIds.add(`P${match[1]}`);
    }
    if (level.source.startsWith('4H')) has4HSD = true;
    if (level.source.includes('EXTREME')) hasStructuralExtreme = true;
  }

  // 6-dimension confluence (mirrors 9-pillar-lobe ConfluenceDimensions)
  const technical =     Math.min(2, (pillarIds.has('P1') ? 1 : 0) + (pillarIds.has('P2') ? 1 : 0));
  const options =       Math.min(2, (pillarIds.has('P3') ? 1 : 0) + (pillarIds.has('P8') ? 1 : 0));
  const analyst =       Math.min(2, pillarIds.has('P4') ? 1 : 0);
  const structural =    Math.min(2, (pillarIds.has('P5') ? 1 : 0) + (has4HSD ? 1 : 0));
  const psychological = Math.min(2, pillarIds.has('P6') ? 1 : 0);
  const regime =        Math.min(2, (pillarIds.has('P7') ? 1 : 0) + (pillarIds.has('P9') ? 1 : 0));

  const baseConfluence =
    technical + options + analyst + structural + psychological + regime;

  // Structural extreme bonus (P5 extreme levels)
  const structuralExtreme = hasStructuralExtreme ? 1 : 0;

  return Math.min(baseConfluence + structuralExtreme, MAX_CONFLUENCE_SCORE);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZFP MAPPING — Confluence Score → Failure Probability
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute Zone Failure Probability from confluence score.
 *
 * Tiers (per TTE spec Pressure Degree table — AUTHORITATIVE):
 *   Score 12-14 → EXTREME       → ZFP <10%   (deterministic midpoint: 5)
 *   Score 10-11 → HEAVY         → ZFP 10-25% (deterministic midpoint: 17)
 *   Score 8-9   → MODERATE-HEAVY → ZFP 20-35% (deterministic midpoint: 27)
 *   Score 6-7   → MODERATE      → ZFP 30-45% (deterministic midpoint: 37)
 *   Score 4-5   → LIGHT         → ZFP 40-60% (deterministic midpoint: 50)
 *   Score 0-3   → MINIMAL       → ZFP >60%   (deterministic midpoint: 70)
 *
 * Uses deterministic midpoints — no interpolation, no randomness.
 */
function computeZFPFromScore(score: number): number {
  if (score >= 12) return 5;     // EXTREME: <10%
  if (score >= 10) return 17;    // HEAVY: 10-25%
  if (score >= 8)  return 27;    // MODERATE-HEAVY: 20-35%
  if (score >= 6)  return 37;    // MODERATE: 30-45%
  if (score >= 4)  return 50;    // LIGHT: 40-60%
  return 70;                     // MINIMAL: >60%
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGINE 3 STATUS ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assign engine3_status based on BoM/MoM classification and reaction count.
 *
 * Rules:
 *   BoM + reactions < 3   → "ENTRY-PRIMARY"
 *   BoM + reactions >= 3  → "TP-TARGET"
 *   MoM + 1-2 reactions   → "ENTRY-CONDITIONAL"
 *   MoM + 0 reactions     → "REJECT"
 *   MoM + reactions >= 3  → "TP-TARGET"
 */
function computeEngine3Status(isBoM: boolean, reactionCount: number): string {
  if (isBoM) {
    return reactionCount < 3 ? 'ENTRY-PRIMARY' : 'TP-TARGET';
  }
  // MoM
  if (reactionCount >= 3) return 'TP-TARGET';
  if (reactionCount >= 1) return 'ENTRY-CONDITIONAL';
  return 'REJECT';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP ZONE SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select ALL zones from the cluster pool, sorted by confluence score.
 *
 * E1-BUG-2 FIX: Previously limited to 4 zones (2 supply + 2 demand).
 * Per spec, ALL clustered zones should be returned so Engine 3 has full
 * zone coverage for setup generation.
 *
 * Selection:
 *   - ALL supply zones above spot: sorted by confluence (highest first),
 *     named R1, R2, R3, ...
 *   - ALL demand zones below spot: sorted by confluence (highest first),
 *     named D1, D2, D3, ...
 *   - Equilibrium zones (spot inside zone): named EQ
 *
 * GUARANTEE: If fewer than 1 supply or 1 demand zone is available from the
 * cluster pool, synthetic zones are created from recent swing highs/lows and
 * round numbers so that the pipeline can always produce BOTH LONG and SHORT
 * setups.
 */
function selectTopZones(
  zones: DXYZone[],
  spot: number,
  _pipValue: number,
  _instrumentKey: string,
  _now: number,
  bars4H?: OHLCBar[],
): DXYZone[] {
  const supply: DXYZone[] = [];
  const demand: DXYZone[] = [];
  const equilibrium: DXYZone[] = [];

  for (const zone of zones) {
    const mid = (zone.floor + zone.ceiling) / 2;
    if (spot >= zone.floor && spot <= zone.ceiling) {
      equilibrium.push(zone);
    } else if (mid > spot) {
      supply.push(zone);
    } else {
      demand.push(zone);
    }
  }

  const selected: DXYZone[] = [];

  // ── Supply: ALL zones sorted by confluence (highest first) ──
  const supplySorted = [...supply].sort(
    (a: DXYZone, b: DXYZone) => b.confluence - a.confluence,
  );
  for (let i = 0; i < supplySorted.length; i++) {
    selected.push({ ...supplySorted[i], zoneName: `R${i + 1}` });
  }

  // ── Demand: ALL zones sorted by confluence (highest first) ──
  const demandSorted = [...demand].sort(
    (a: DXYZone, b: DXYZone) => b.confluence - a.confluence,
  );
  for (let i = 0; i < demandSorted.length; i++) {
    selected.push({ ...demandSorted[i], zoneName: `D${i + 1}` });
  }

  // ── Equilibrium zones (spot is inside) ──
  for (const eq of equilibrium) {
    selected.push({ ...eq, zoneName: 'EQ' });
  }

  // ── Guarantee at least 1 supply above spot + 1 demand below spot ──
  // If the cluster pool didn't produce enough zones on either side, create
  // synthetic zones so that the pipeline can generate BOTH LONG and SHORT setups.
  const supplyPresent = selected.some((z: DXYZone) => z.zoneName?.startsWith('R'));
  const demandPresent = selected.some((z: DXYZone) => z.zoneName?.startsWith('D'));

  if (!supplyPresent) {
    const synthSupply = createSynthesisSupply(bars4H ?? [], spot, _pipValue, _instrumentKey, _now);
    if (synthSupply !== null) selected.push(synthSupply);
  }

  if (!demandPresent) {
    const synthDemand = createSynthesisDemand(bars4H ?? [], spot, _pipValue, _instrumentKey, _now);
    if (synthDemand !== null) selected.push(synthDemand);
  }

  return selected;
}

/**
 * Create a synthetic supply zone above spot for the synthesis lobe.
 *
 * Anchor: highest high of the last 60 4H bars (10 trading days), or the
 * nearest quarter-figure round number above spot as fallback.
 */
function createSynthesisSupply(
  bars: OHLCBar[],
  spot: number,
  pipValue: number,
  instrumentKey: string,
  now: number,
): DXYZone | null {
  let anchor: number | null = null;

  const recentBars = bars.slice(-60);
  if (recentBars.length > 0) {
    const recentHigh = Math.max(...recentBars.map((b: OHLCBar) => b.high));
    if (recentHigh > spot) anchor = recentHigh;
  }

  // Fallback: round number above spot (25-pip step)
  if (anchor === null) {
    const quarterStep = 25 * pipValue;
    anchor = Math.ceil(spot / quarterStep) * quarterStep;
    if (anchor <= spot) anchor = spot + quarterStep;
  }

  const halfWidth = pipValue * ZONE_WIDTH.HALF_WIDTH_PIPS;
  return {
    id: `${instrumentKey}-synth-supply-${now}`,
    floor: anchor - halfWidth,
    ceiling: anchor + halfWidth,
    type: ZoneType.MOM_SUPPLY,
    isBoM: false,
    reactionCount: 1,
    reactionStatus: 'active',
    confluence: 5,
    pillars: [5],
    zfp: computeZFPFromScore(5),
    createdAt: now,
    lastTested: null,
    sdFresh: '1S',
    sdType: 'MoM',
    sdOverlap: 'none',
    keyLevels: [anchor],
    formedAfterConsolidation: false,
    engine3Status: 'ENTRY-CONDITIONAL',
    zoneName: 'R1',
  };
}

/**
 * Create a synthetic demand zone below spot for the synthesis lobe.
 *
 * Anchor: lowest low of the last 60 4H bars (10 trading days), or the
 * nearest quarter-figure round number below spot as fallback.
 */
function createSynthesisDemand(
  bars: OHLCBar[],
  spot: number,
  pipValue: number,
  instrumentKey: string,
  now: number,
): DXYZone | null {
  let anchor: number | null = null;

  const recentBars = bars.slice(-60);
  if (recentBars.length > 0) {
    const recentLow = Math.min(...recentBars.map((b: OHLCBar) => b.low));
    if (recentLow < spot) anchor = recentLow;
  }

  // Fallback: round number below spot (25-pip step)
  if (anchor === null) {
    const quarterStep = 25 * pipValue;
    anchor = Math.floor(spot / quarterStep) * quarterStep;
    if (anchor >= spot) anchor = spot - quarterStep;
  }

  const halfWidth = pipValue * ZONE_WIDTH.HALF_WIDTH_PIPS;
  return {
    id: `${instrumentKey}-synth-demand-${now}`,
    floor: anchor - halfWidth,
    ceiling: anchor + halfWidth,
    type: ZoneType.MOM_DEMAND,
    isBoM: false,
    reactionCount: 1,
    reactionStatus: 'active',
    confluence: 5,
    pillars: [5],
    zfp: computeZFPFromScore(5),
    createdAt: now,
    lastTested: null,
    sdFresh: '1S',
    sdType: 'MoM',
    sdOverlap: 'none',
    keyLevels: [anchor],
    formedAfterConsolidation: false,
    engine3Status: 'ENTRY-CONDITIONAL',
    zoneName: 'D1',
  };
}
